// ---------------------------------------------------------------------------
// Nyhetsbrev-motor — komponering, målgrupper og avmelding.
//
// Prinsipper:
//  • Samtykke-lagdeling: kunder (kundeforhold) er trygge; åpne leads er
//    "aktiv dialog" (grå sone for generelt nyhetsbrev) — merkes i UI.
//  • Avmelding: HMAC-signert lenke per mottaker → `email_optouts`
//    (suppresjonsliste som ALLTID respekteres ved utsending).
//  • Ingen rå HTML fra bruker — blokkbasert innhold escapes → trygg e-post.
//  • UTM: alle lenker tagges utm_source=nyhetsbrev automatisk.
// ---------------------------------------------------------------------------
import crypto from 'crypto';

export const NEWSLETTER_COLL = 'newsletters';
export const OPTOUT_COLL = 'email_optouts';

const SECRET = () =>
  (process.env.NEWSLETTER_SECRET || process.env.AGENT_BRIDGE_SECRET || process.env.SENDGRID_API_KEY || 'dh-nl').toString();

export const normEmail = (e) => (e || '').toString().trim().toLowerCase();
const EMAIL_RE = /^\S+@\S+\.\S+$/;

// --- Avmeldings-token (HMAC over normalisert e-post) -----------------------
export function unsubToken(email) {
  return crypto.createHmac('sha256', SECRET()).update(normEmail(email)).digest('hex').slice(0, 32);
}
export function verifyUnsubToken(email, token) {
  const want = unsubToken(email);
  try { return crypto.timingSafeEqual(Buffer.from(want), Buffer.from(String(token || ''))); } catch (e) { return false; }
}
export function buildUnsubUrl(baseUrl, email) {
  const e = Buffer.from(normEmail(email), 'utf8').toString('base64url');
  return `${(baseUrl || '').replace(/\/$/, '')}/api/newsletter/unsubscribe?e=${e}&t=${unsubToken(email)}`;
}

// --- Hjelpere ---------------------------------------------------------------
const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function withUtm(url, campaignSlug) {
  try {
    const u = new URL(url);
    if (!u.searchParams.get('utm_source')) {
      u.searchParams.set('utm_source', 'nyhetsbrev');
      u.searchParams.set('utm_medium', 'email');
      if (campaignSlug) u.searchParams.set('utm_campaign', campaignSlug);
    }
    return u.toString();
  } catch (e) { return url; }
}

// --- E-post-mal (600px, tabellbasert, inline CSS — bredest mulig støtte) ----
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

function renderBlock(b, campaignSlug) {
  const t = b?.type;
  if (t === 'heading') {
    return `<tr><td style="padding:8px 40px 4px;"><h2 style="margin:12px 0 4px;font-family:${FONT};font-size:22px;line-height:1.25;font-weight:700;color:#0a0a0a;letter-spacing:-0.02em;">${esc(b.text)}</h2></td></tr>`;
  }
  if (t === 'text') {
    const paras = String(b.text || '').split(/\n{2,}/).map((p) =>
      `<p style="margin:10px 0;font-family:${FONT};font-size:15px;line-height:1.75;color:#555555;">${esc(p).replace(/\n/g, '<br/>')}</p>`
    ).join('');
    return `<tr><td style="padding:0 40px;">${paras}</td></tr>`;
  }
  if (t === 'button') {
    const url = withUtm(b.url || '#', campaignSlug);
    return `<tr><td align="center" style="padding:18px 40px;">
      <a href="${esc(url)}" target="_blank" style="display:inline-block;background:#0a0a0a;color:#ffffff;font-family:${FONT};font-size:14px;font-weight:600;text-decoration:none;padding:14px 34px;border-radius:999px;">${esc(b.label || 'Les mer')}&nbsp;&nbsp;&rarr;</a>
    </td></tr>`;
  }
  if (t === 'image') {
    return `<tr><td style="padding:14px 40px;">
      <img src="${esc(b.url || '')}" alt="${esc(b.alt || '')}" width="520" style="display:block;width:100%;max-width:520px;border-radius:12px;" />
    </td></tr>`;
  }
  if (t === 'divider') {
    return `<tr><td style="padding:14px 40px;"><div style="height:1px;background:#eeeeee;line-height:1px;">&nbsp;</div></td></tr>`;
  }
  return '';
}

export function renderNewsletterHtml({ subject, preheader, blocks = [], unsubUrl = '#', campaignSlug = '' } = {}) {
  const inner = blocks.map((b) => renderBlock(b, campaignSlug)).join('\n');
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="nb">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(subject || 'DigiHome')}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3f0;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#f5f3f0;">${esc(preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3f0;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">
        <!-- Header -->
        <tr><td style="padding:6px 8px 18px;">
          <span style="font-family:${FONT};font-size:19px;font-weight:800;color:#0a0a0a;letter-spacing:-0.02em;">DigiHome</span><span style="font-family:${FONT};font-size:19px;font-weight:800;color:#a463e8;">.</span>
        </td></tr>
        <!-- Kort -->
        <tr><td style="background:#ffffff;border-radius:20px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="height:5px;background:#d298ff;line-height:5px;font-size:1px;">&nbsp;</td></tr>
            <tr><td style="height:26px;line-height:26px;font-size:1px;">&nbsp;</td></tr>
            ${inner}
            <tr><td style="height:34px;line-height:34px;font-size:1px;">&nbsp;</td></tr>
          </table>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:22px 12px 8px;" align="center">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.7;color:#999999;">
            DigiHome AS &middot; Bergen &middot; <a href="https://digihome.no" style="color:#999999;">digihome.no</a>
          </p>
          <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:#999999;">
            Du mottar denne e-posten fordi du har vært i kontakt med DigiHome.
            <a href="${esc(unsubUrl)}" style="color:#a463e8;text-decoration:underline;">Meld deg av her</a>.
          </p>
          <p style="margin:8px 0 0;font-family:${FONT};font-size:11px;color:#bbbbbb;">&copy; ${year} DigiHome AS</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// --- Målgrupper --------------------------------------------------------------
// Samtykke-lagdeling (markedsføringsloven §15):
//  • kunder      → eksisterende kundeforhold: lov å sende om tilsvarende tjenester
//  • leads       → aktiv dialog (henvendelse): oppfølging OK, generelt nyhetsbrev = grå sone
//  • leietakere  → samme som leads (etterspørselssiden)
export const SEGMENTS = [
  { key: 'kunder', label: 'Kunder (vunnede utleiere)', consent: 'safe', note: 'Kundeforhold — trygt å sende (mfl. §15)' },
  { key: 'leads', label: 'Åpne utleier-leads', consent: 'gray', note: 'Aktiv dialog — oppfølging OK, generelt nyhetsbrev er grå sone' },
  { key: 'leietakere', label: 'Leietaker-leads', consent: 'gray', note: 'Aktiv dialog — samme vurdering som leads' },
];

async function optoutSet(db) {
  const rows = await db.collection(OPTOUT_COLL).find({}, { projection: { _id: 0, email: 1 } }).limit(100000).toArray();
  return new Set(rows.map((r) => normEmail(r.email)).filter(Boolean));
}

async function fetchSegment(db, key) {
  const proj = { projection: { _id: 0, name: 1, email: 1, status: 1 } };
  if (key === 'kunder') {
    return db.collection('leads').find({ status: 'won', email: { $exists: true, $nin: [null, ''] } }, proj).limit(20000).toArray();
  }
  if (key === 'leads') {
    return db.collection('leads').find({ status: { $in: ['new', 'contacted', 'qualified'] }, email: { $exists: true, $nin: [null, ''] } }, proj).limit(20000).toArray();
  }
  if (key === 'leietakere') {
    return db.collection('tenant_leads').find({ status: { $ne: 'lost' }, email: { $exists: true, $nin: [null, ''] } }, proj).limit(20000).toArray();
  }
  return [];
}

// Netto mottakerliste for valgte segmenter: dedupe på e-post (prioritet kunder >
// leads > leietakere), minus avmeldte og ugyldige adresser.
export async function resolveAudience(db, segments = []) {
  const chosen = SEGMENTS.filter((s) => segments.includes(s.key)).map((s) => s.key);
  const optouts = await optoutSet(db);
  const seen = new Set();
  const recipients = [];
  let skippedOptout = 0, skippedDup = 0, skippedInvalid = 0;
  for (const key of ['kunder', 'leads', 'leietakere']) {
    if (!chosen.includes(key)) continue;
    const rows = await fetchSegment(db, key);
    for (const r of rows) {
      const email = normEmail(r.email);
      if (!EMAIL_RE.test(email)) { skippedInvalid++; continue; }
      if (optouts.has(email)) { skippedOptout++; continue; }
      if (seen.has(email)) { skippedDup++; continue; }
      seen.add(email);
      recipients.push({ email, name: (r.name || '').toString().slice(0, 120), segment: key });
    }
  }
  return { recipients, skipped: { optout: skippedOptout, duplicate: skippedDup, invalid: skippedInvalid } };
}

// Antall per segment (netto for avmeldte — overlapp håndteres ved utsending).
export async function audienceCounts(db) {
  const optouts = await optoutSet(db);
  const out = [];
  for (const seg of SEGMENTS) {
    const rows = await fetchSegment(db, seg.key);
    const emails = new Set();
    for (const r of rows) {
      const e = normEmail(r.email);
      if (EMAIL_RE.test(e) && !optouts.has(e)) emails.add(e);
    }
    out.push({ ...seg, count: emails.size });
  }
  return { segments: out, optouts: optouts.size };
}

// --- Validering av utkast ----------------------------------------------------
export function sanitizeBlocks(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const b of raw.slice(0, 40)) {
    const t = b?.type;
    if (t === 'heading' && b.text) out.push({ type: 'heading', text: String(b.text).slice(0, 300) });
    else if (t === 'text' && b.text) out.push({ type: 'text', text: String(b.text).slice(0, 8000) });
    else if (t === 'button' && b.url) out.push({ type: 'button', label: String(b.label || 'Les mer').slice(0, 120), url: String(b.url).slice(0, 600) });
    else if (t === 'image' && b.url) out.push({ type: 'image', url: String(b.url).slice(0, 600), alt: String(b.alt || '').slice(0, 200) });
    else if (t === 'divider') out.push({ type: 'divider' });
  }
  return out;
}

export function slugifyCampaign(subject) {
  return String(subject || 'nyhetsbrev').toLowerCase()
    .replace(/[æå]/g, 'a').replace(/ø/g, 'o')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'nyhetsbrev';
}
