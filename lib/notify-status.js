// ── HVEM FÅR EGENTLIG VARSLENE? ─────────────────────────────────────────────
// Et varsel som ikke kommer fram er verre enn ingen varsling: teamet tror de
// blir varslet. Denne modulen svarer på to spørsmål vi ellers bare kan gjette:
//   1. HVILKEN miljøvariabel styrer mottakerne HER, og hvem står der?
//      (Preview og produksjon har ulike env-verdier — det er den vanligste
//      årsaken til «bare én person får varselet».)
//   2. Har SendGrid sperret noen av dem? En adresse på bounce-/blokkeringslista
//      får aldri e-post igjen før sperren fjernes, uansett hva koden gjør.
import { notifyRecipientSources } from '@/lib/lead-emails';
import { emailConfigured } from '@/lib/email';

const SG = 'https://api.sendgrid.com';
const KINDS = [
  ['bounce', '/v3/suppression/bounces/'],
  ['blokkert', '/v3/suppression/blocks/'],
  ['ugyldig', '/v3/suppression/invalid_emails/'],
  ['spamrapport', '/v3/suppression/spam_reports/'],
];

const key = () => (process.env.SENDGRID_API_KEY || '').trim();
const auth = () => ({ Authorization: `Bearer ${key()}` });
const iso = (unix) => (unix ? new Date(Number(unix) * 1000).toISOString() : null);

async function sgJson(path, init = {}) {
  const r = await fetch(`${SG}${path}`, { ...init, headers: { ...auth(), ...(init.headers || {}) } });
  const text = await r.text().catch(() => '');
  let json = null; try { json = text ? JSON.parse(text) : null; } catch (e) { json = null; }
  return { status: r.status, ok: r.ok, json, text };
}

// Én adresse kan ligge på flere lister samtidig (bounce OG blokkert).
export async function suppressionsFor(email) {
  const results = await Promise.all(KINDS.map(async ([kind, path]) => {
    const { status, json } = await sgJson(`${path}${encodeURIComponent(email)}`);
    if (status !== 200 || !json) return [];
    const arr = Array.isArray(json) ? json : (json.email ? [json] : []);
    return arr.map((x) => ({ kind, reason: String(x.reason || x.status || '').slice(0, 240), at: iso(x.created) }));
  }));
  return results.flat();
}

// Er avsenderdomenet autentisert (DKIM + return-path)? Uten det havner e-post i
// søppel hos Outlook og Gmail selv når SendGrid rapporterer «levert».
async function senderDomainStatus() {
  const from = (process.env.SENDGRID_FROM_EMAIL || '').trim();
  const domain = from.split('@')[1] || '';
  if (!domain) return { from, domain: null, authenticated: null, note: 'avsender ikke konfigurert' };
  const { status, json } = await sgJson('/v3/whitelabel/domains?limit=50');
  if (status !== 200 || !Array.isArray(json)) {
    return { from, domain, authenticated: null, note: `kunne ikke sjekke (HTTP ${status})` };
  }
  const mine = json.filter((d) => String(d.domain || '').toLowerCase() === domain.toLowerCase());
  if (!mine.length) return { from, domain, authenticated: false, note: 'domenet er ikke satt opp som autentisert avsender i SendGrid' };
  // Samme domene kan ligge flere ganger (f.eks. et gammelt, ufullført oppsett).
  // Det gyldige oppsettet er det som gjelder for utsending.
  const d = mine.find((x) => x.valid) || mine[0];
  const dns = d.dns || {};
  return {
    from, domain,
    authenticated: !!d.valid,
    dkim: !!(dns.dkim1?.valid ?? dns.dkim?.valid),
    // Automated security bruker CNAME (mail_cname); manuelt oppsett bruker mail_server.
    returnPath: !!(dns.mail_cname?.valid ?? dns.mail_server?.valid),
    duplicateEntries: mine.length > 1 ? mine.length : undefined,
    note: d.valid ? null : 'domenet er registrert, men DNS-oppsettet validerer ikke',
  };
}

export async function notifyStatus() {
  const src = notifyRecipientSources();
  const configured = emailConfigured();
  const all = [...new Set([...src.boliginteresse.recipients, ...src.leads.recipients])];

  const recipients = {};
  const senderPromise = configured ? senderDomainStatus() : Promise.resolve({ from: null, domain: null, authenticated: null, note: 'SendGrid ikke konfigurert' });
  if (configured) {
    // Parallelt: 4 lister × N adresser blir tregt sekvensielt, og dette skal
    // kunne stå i et adminpanel uten å føles som en rapport.
    const pairs = await Promise.all(all.map(async (a) => [a, await suppressionsFor(a)]));
    for (const [a, hits] of pairs) recipients[a] = hits;
  }

  const sender = await senderPromise;

  // Problemer skrives ut som noe et menneske kan handle på, ikke som statuskoder.
  const problems = [];
  if (!configured) problems.push({ level: 'kritisk', text: 'SENDGRID_API_KEY mangler i dette miljøet — ingen varsler sendes i det hele tatt.' });
  if (!src.boliginteresse.recipients.length) {
    problems.push({ level: 'kritisk', text: 'Ingen mottakere er satt opp for boliginteresse. Sett NL_INTEREST_NOTIFY (kommaseparert).' });
  } else if (src.boliginteresse.source !== 'NL_INTEREST_NOTIFY') {
    problems.push({
      level: 'viktig',
      text: `NL_INTEREST_NOTIFY er ikke satt i dette miljøet — boliginteresse-varsler går derfor til ${src.boliginteresse.source} (${src.boliginteresse.recipients.length} mottaker${src.boliginteresse.recipients.length === 1 ? '' : 'e'}). Sett NL_INTEREST_NOTIFY her også, ellers varsles ikke de samme personene som i preview.`,
    });
  }
  for (const [email, hits] of Object.entries(recipients)) {
    for (const h of hits) {
      problems.push({
        level: 'kritisk',
        email,
        text: `${email} er sperret i SendGrid (${h.kind}${h.at ? ` ${h.at.slice(0, 10)}` : ''}) og får ingen e-post før sperren fjernes. Årsak: ${h.reason}`,
        canUnblock: true,
      });
    }
  }
  if (sender.authenticated === false) {
    problems.push({ level: 'viktig', text: `Avsenderdomenet ${sender.domain} er ikke autentisert i SendGrid — e-posten kan havne i søppelpost. ${sender.note || ''}`.trim() });
  }

  return {
    ok: true,
    sendgridConfigured: configured,
    sender,
    boliginteresse: { source: src.boliginteresse.source, recipients: src.boliginteresse.recipients },
    leads: { source: src.leads.source, recipients: src.leads.recipients },
    // Per adresse: tom liste = ingen sperre = SendGrid forsøker levering.
    suppressions: recipients,
    problems,
    checkedAt: new Date().toISOString(),
  };
}

// Fjern en sperre. BARE for adresser som faktisk står i våre varsellister —
// dette endepunktet skal ikke kunne brukes til å rydde vekk andres bounces.
export async function removeSuppression(email) {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return { ok: false, error: 'Mangler e-postadresse' };
  const src = notifyRecipientSources();
  const known = [...src.boliginteresse.recipients, ...src.leads.recipients].map((s) => s.toLowerCase());
  if (!known.includes(clean)) return { ok: false, error: 'Adressen står ikke i varsellistene', status: 400 };
  if (!key()) return { ok: false, error: 'SENDGRID_API_KEY mangler' };

  const removed = [];
  for (const [kind, path] of KINDS) {
    const before = await sgJson(`${path}${encodeURIComponent(clean)}`);
    const arr = Array.isArray(before.json) ? before.json : (before.json?.email ? [before.json] : []);
    if (before.status !== 200 || !arr.length) continue;
    const del = await sgJson(`${path}${encodeURIComponent(clean)}`, { method: 'DELETE' });
    removed.push({ kind, http: del.status, ok: del.status === 204 || del.ok });
  }
  const rest = await suppressionsFor(clean);
  return { ok: true, email: clean, removed, remaining: rest };
}
