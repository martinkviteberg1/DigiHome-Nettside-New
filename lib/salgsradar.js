// ---------------------------------------------------------------------------
// SALGSRADAR — fra FINN-annonse til ferdig tilbudspakke.
//
// Flyt (Fase 1, semi-automatisk og lovlig):
//   1. Selger limer inn en FINN-leieannonse-URL («bolig til leie», Bergen).
//   2. Systemet henter og parser annonsen (tittel, adresse, leiepris, m²,
//      soverom, bilder, ev. kontakttelefon fra annonsen).
//   3. Prisanalyse mot DigiHomes portefølje (faktisk oppnådd leie) — selger
//      justerer anbefalt leie og honorarsats.
//   4. AI-styling av annonsebilder (Nano Banana via Emergent-proxy) — «slik
//      kan annonsen din se ut hos DigiHome».
//   5. Generert offentlig tilbudsside (/tilbud/<slug>) med før/etter,
//      regnestykke og kontaktskjema. Åpninger spores.
//   6. Pipeline: ny → analysert → kontaktet → dialog → vunnet/tapt.
//
// Utsendelse skjer MANUELT (FINN-melding/telefon) — markedsføringsloven §15
// tillater ikke uanmodet e-post/SMS til privatpersoner uten samtykke.
//
// Samlinger:
//   salgsradar_leads:  hoveddokument per annonse/lead
//   salgsradar_bilder: AI-stylede bilder (én per dokument — base64 data-URL,
//                      holdes utenfor lead-dokumentet pga. 16 MB-grensen)
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const LEADS_COLL = 'salgsradar_leads';
export const BILDER_COLL = 'salgsradar_bilder';
export const RADAR_STATUSER = ['ny', 'analysert', 'kontaktet', 'dialog', 'vunnet', 'tapt'];

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

// ── FINN-henting: kun www.finn.no-annonser, aldri vilkårlige URL-er (SSRF) ──
export function finnKodeFraUrl(rawUrl) {
  let u;
  try { u = new URL(String(rawUrl || '').trim()); } catch (e) { return null; }
  if (u.protocol !== 'https:' || u.hostname !== 'www.finn.no') return null;
  const kode = u.searchParams.get('finnkode') || (u.pathname.match(/\/(\d{8,10})(?:$|\/)/) || [])[1];
  return /^\d{8,10}$/.test(String(kode || '')) ? String(kode) : null;
}

export async function hentFinnHtml(finnkode) {
  const url = `https://www.finn.no/realestate/lettings/ad.html?finnkode=${finnkode}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const r = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
    });
    if (!r.ok) throw new Error(`FINN svarte ${r.status} — er annonsen fortsatt aktiv?`);
    return await r.text();
  } finally { clearTimeout(timer); }
}

const tallFra = (s) => {
  const n = Number(String(s || '').replace(/[^\d]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Parser: synlige <dt>/<dd>-par (stabile, norske etiketter) + adresse/kontakt
// fra sidens serialiserte data (escapede nøkler). Bilder fra finncdn for
// akkurat denne annonsen.
export function parseFinnAnnonse(html, finnkode) {
  const felt = {};
  const parRe = /<dt[^>]*>([^<]{2,40})<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g;
  let m;
  while ((m = parRe.exec(html)) !== null) {
    const k = m[1].trim();
    const v = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (k && v && felt[k] === undefined) felt[k] = v;
  }
  const grip = (re) => { const t = html.match(re); return t ? t[1] : null; };
  const tittel = (grip(/<title>([^|<]{3,140})\|/) || '').trim() || 'FINN-annonse';
  const adresse = grip(/\\?"streetAddress\\?",\s*\\?"([^"\\]{3,80})/);
  const postnr = grip(/\\?"postalCode\\?",\s*\\?"(\d{4})/);
  const kontaktTlf = grip(/\\?"mobile\\?",\s*\\?"([\d ]{8,12})/);
  const bilder = Array.from(new Set(
    (html.match(new RegExp(`https://images\\.finncdn\\.no/dynamic/default/item/${finnkode}/[a-f0-9-]+`, 'g')) || []),
  )).slice(0, 20);
  const m2 = tallFra(felt['Primærrom'] || felt['Internt bruksareal'] || felt['Bruksareal'] || felt['Bruttoareal']);
  const beskrivelse = (grip(/<meta (?:name|property)="(?:og:)?description" content="([^"]{20,600})"/) || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 1000);
  return {
    finnkode,
    tittel: tittel.slice(0, 140),
    adresse: (adresse || '').slice(0, 90),
    postnr: postnr || '',
    pris: tallFra(felt['Månedsleie']),
    depositum: tallFra(felt['Depositum'] || felt['Innskudd']),
    inkluderer: (felt['Inkluderer'] || felt['Inkludert i husleie'] || '').slice(0, 120),
    m2,
    soverom: tallFra(felt['Soverom']),
    boligtype: (felt['Boligtype'] || '').slice(0, 40),
    etasje: (felt['Etasje'] || '').slice(0, 10),
    mobler: (felt['Møblering'] || '').slice(0, 40),
    kontaktTlf: (kontaktTlf || '').replace(/\s/g, ''),
    bilder,
    beskrivelse,
  };
}

// ── Prisanalyse: DigiHomes egen portefølje er referansen ─────────────────────
// rows = leieforhold-rader fra plattformen (fasit for oppnådd leie).
export function beregnAnalyse(annonse, rows = [], honorarPct = 8) {
  // Radene fra plattformen bruker group ('leased'/…) og monthly_rent.
  const leide = (rows || []).filter((r) => (r.group || r.status || '') === 'leased' && Number(r.monthly_rent ?? r.rent) > 0);
  const leier = leide.map((r) => Number(r.monthly_rent ?? r.rent));
  const snittLeie = leier.length ? Math.round(leier.reduce((a, b) => a + b, 0) / leier.length) : null;
  // Sammenlignbare i samme postsone (to første siffer) når vi har adresser
  const sone = String(annonse.postnr || '').slice(0, 2);
  const iSonen = sone
    ? leide.filter((r) => String(r.postal_code || r.postnr || r.zip || '').slice(0, 2) === sone).map((r) => Number(r.monthly_rent ?? r.rent))
    : [];
  const snittSone = iSonen.length >= 2 ? Math.round(iSonen.reduce((a, b) => a + b, 0) / iSonen.length) : null;
  // Anbefalt leie: start på annonsert pris — selgeren hever den basert på
  // sammenligningsgrunnlaget (vi gjetter aldri automatisk oppover).
  const anbefaltLeie = annonse.pris || snittSone || snittLeie || 0;
  const pct = Math.min(15, Math.max(4, Number(honorarPct) || 8));
  return {
    anbefaltLeie,
    honorarPct: pct,
    grunnlag: {
      snittLeie,
      snittSone,
      antallILeide: leier.length,
      antallISone: iSonen.length,
      sone: sone ? `${sone}xx` : null,
    },
  };
}

// Avledede tall til tilbudssiden — regnes alltid ferskt fra lagrede felter.
export function tilbudsRegnestykke(lead) {
  const anbefalt = Number(lead.analyse?.anbefaltLeie) || 0;
  const pct = Number(lead.analyse?.honorarPct) || 8;
  const honorar = Math.round((anbefalt * pct) / 100);
  const netto = anbefalt - honorar;
  const dagens = Number(lead.pris) || 0;
  return {
    anbefaltLeie: anbefalt,
    honorarPct: pct,
    honorarMnd: honorar,
    nettoTilEier: netto,
    dagensPris: dagens,
    gevinstMnd: dagens ? netto - dagens : null, // netto hos oss vs. alt selv til dagens pris
    gevinstAar: dagens ? (netto - dagens) * 12 : null,
  };
}

// ── Ingest-validering: full payload fra ekstern overvåkningsagent ────────────
// Agenten scraper selv og sender ferdige felter — vi validerer STRENGT og
// bygger kanonisk kildeUrl fra finnkoden (stoler aldri på innsendt URL).
// Bilder må ligge på images.finncdn.no (samme krav som AI-stylingen stiller).
export function validerIngestAnnonse(body = {}) {
  const finnkode = String(body.finnkode || '').trim();
  if (!/^\d{8,10}$/.test(finnkode)) return { ok: false, error: 'finnkode må være 8-10 siffer', status: 400 };
  const pris = Number(body.pris);
  if (!Number.isFinite(pris) || pris < 1000 || pris > 500000) {
    return { ok: false, error: 'pris (månedsleie) må være et tall mellom 1 000 og 500 000', status: 422 };
  }
  const adresse = String(body.adresse || '').trim().slice(0, 90);
  if (adresse.length < 3) return { ok: false, error: 'adresse kreves (min 3 tegn)', status: 400 };
  const postnr = /^\d{4}$/.test(String(body.postnr || '').trim()) ? String(body.postnr).trim() : '';
  const heltall = (v, maks) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 && n <= maks ? Math.round(n) : null;
  };
  const bilderInn = Array.isArray(body.bilder) ? body.bilder : [];
  const bilder = [];
  for (const b of bilderInn.slice(0, 20)) {
    let u;
    try { u = new URL(String(b || '')); } catch (e) { continue; }
    if (u.protocol === 'https:' && u.hostname === 'images.finncdn.no') bilder.push(u.toString().slice(0, 300));
  }
  return {
    ok: true,
    annonse: {
      finnkode,
      tittel: (String(body.tittel || '').trim() || 'FINN-annonse').slice(0, 140),
      adresse,
      postnr,
      pris: Math.round(pris),
      depositum: heltall(body.depositum, 2000000),
      inkluderer: String(body.inkluderer || '').trim().slice(0, 120),
      m2: heltall(body.m2, 2000),
      soverom: heltall(body.soverom, 30),
      boligtype: String(body.boligtype || '').trim().slice(0, 40),
      etasje: String(body.etasje || '').trim().slice(0, 10),
      mobler: String(body.mobler || '').trim().slice(0, 40),
      kontaktTlf: String(body.kontaktTlf || '').replace(/\s/g, '').replace(/[^\d+]/g, '').slice(0, 15),
      bilder: Array.from(new Set(bilder)),
      beskrivelse: String(body.beskrivelse || '').replace(/\s+/g, ' ').trim().slice(0, 4000),
    },
    kildeUrl: `https://www.finn.no/realestate/lettings/ad.html?finnkode=${finnkode}`,
  };
}

// ═══════════════════════ SCORING — hybridmodell ═══════════════════════
// AI-en vurderer KUN det som krever øyne (lys, skarphet, ryddighet, styling,
// tekstkvalitet). Alt annet måles deterministisk i kode: piksler, orientering
// (alle portrett = mobilbilder), bildeantall og datahygiene. Vektene ligger i
// koden — samme annonse gir samme score, alltid. To tall med hver sin jobb:
//   annonseScore  (0-100): hvor god er annonsen i dag?
//   potensialScore(0-100): hvor vinnbar er leaden? (lav annonsekvalitet = høyt
//                          potensial, + prisgap + ferskhet + sonedekning)

// Minimal dimensjonsparser (JPEG/PNG/WebP) — ingen ekstra avhengighet.
export function bildeDim(buf) {
  try {
    if (!buf || buf.length < 30) return null;
    if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; // PNG
    if (buf[0] === 0xff && buf[1] === 0xd8) { // JPEG: finn SOF-markør
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) { i += 1; continue; }
        const mk = buf[i + 1];
        if (mk >= 0xc0 && mk <= 0xcf && mk !== 0xc4 && mk !== 0xc8 && mk !== 0xcc) {
          return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
        }
        const len = buf.readUInt16BE(i + 2);
        if (len < 2) return null;
        i += 2 + len;
      }
      return null;
    }
    if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
      const fmt = buf.toString('ascii', 12, 16);
      if (fmt === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
      if (fmt === 'VP8 ') return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
      if (fmt === 'VP8L') { const b32 = buf.readUInt32LE(21); return { w: (b32 & 0x3fff) + 1, h: ((b32 >> 14) & 0x3fff) + 1 }; }
    }
  } catch (e) { /* korrupt bilde → ukjent */ }
  return null;
}

const klem10 = (v, fallback = 5) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(10, Math.max(0, Math.round(n * 10) / 10)) : fallback;
};

// Delscorer 0-10 for de deterministiske komponentene
const antallScore10 = (n) => (n >= 8 ? 10 : n >= 5 ? 7 : n >= 3 ? 4 : n >= 1 ? 2 : 0);
const opplosningScore10 = (snittMp) => (snittMp == null ? 5 : snittMp >= 2 ? 10 : snittMp >= 1 ? 7 : snittMp >= 0.5 ? 4 : 1);
const orienteringScore10 = (andelPortrett) => (andelPortrett == null ? 5 : andelPortrett >= 0.8 ? 2 : andelPortrett >= 0.5 ? 5 : 9);
const hygieneScore10 = (lead) => (lead.m2 ? 2.5 : 0) + (lead.soverom ? 2.5 : 0) + (lead.boligtype ? 2.5 : 0)
  + (lead.tittel && lead.tittel !== 'FINN-annonse' && lead.tittel.length >= 15 ? 2.5 : 0);
const tekstFallback10 = (lead) => {
  const len = String(lead.beskrivelse || '').length;
  if (!len) return 5; // ukjent → nøytral
  return len >= 400 ? 8 : len >= 150 ? 6 : len >= 40 ? 4 : 2;
};

// Vekter (delscore 0-10 → sum 0-100): visuell 20, oppløsning 10, orientering 10,
// antall 15, tekst 25, hygiene 20.
function veidAnnonseScore(d) {
  return Math.min(100, Math.max(0, Math.round(
    d.visuell * 2.0 + d.opplosning * 1.0 + d.orientering * 1.0 + d.antall * 1.5 + d.tekst * 2.5 + d.hygiene * 2.0,
  )));
}

function potensialFra(annonseScore, lead, now = Date.now()) {
  const pris = Number(lead.pris) || 0;
  const anbefalt = Number(lead.analyse?.anbefaltLeie) || 0;
  const gap = pris > 0 && anbefalt > pris ? Math.min(1, ((anbefalt - pris) / pris) / 0.25) * 100 : 0;
  const dager = (now - new Date(lead.createdAt || now).getTime()) / 86400000;
  const fersk = dager <= 2 ? 100 : dager <= 7 ? 70 : dager <= 14 ? 40 : 15;
  const g = lead.analyse?.grunnlag || {};
  const sone = (g.antallISone || 0) >= 2 ? 100 : (g.antallILeide || 0) > 0 ? 50 : 0;
  return Math.min(100, Math.max(0, Math.round((100 - annonseScore) * 0.45 + gap * 0.25 + fersk * 0.15 + sone * 0.15)));
}

// Foreløpig score (gratis, uten AI/nedlasting) — beregnes for ALLE leads i
// lista. AI-analysen forfiner med visuell vurdering + faktiske piksler.
export function grunnPotensial(lead, now = Date.now()) {
  const deler = {
    visuell: 5, // ukjent uten AI → nøytral
    opplosning: 5,
    orientering: 5,
    antall: antallScore10((lead.bilder || []).length),
    tekst: tekstFallback10(lead),
    hygiene: hygieneScore10(lead),
  };
  const annonseScore = veidAnnonseScore(deler);
  return { score: potensialFra(annonseScore, lead, now), annonseScore, forelopig: true };
}

// ── Full AI-analyse: ett Gemini-kall per lead (tekst + opptil 5 bilder) ─────
// Resultatet caches på leaden (lead.ai) — kjøres aldri automatisk to ganger.
export async function analyserAnnonse(db, leadId) {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key || !key.startsWith('sk-emergent-')) return { ok: false, error: 'EMERGENT_LLM_KEY mangler i miljøet', status: 503 };
  const lead = await db.collection(LEADS_COLL).findOne({ id: String(leadId || '') });
  if (!lead) return { ok: false, error: 'Lead ikke funnet', status: 404 };

  // 1) Last ned opptil 5 bilder (kun finncdn) — måler piksler/orientering eksakt
  const kandidater = (lead.bilder || []).slice(0, 5);
  const nedlastet = [];
  for (const bu of kandidater) {
    try { nedlastet.push(await lastNedFinnBilde(bu)); } catch (e) { /* hopp over døde bilder */ }
  }
  const dims = nedlastet.map((n) => bildeDim(n.buf)).filter(Boolean);
  const snittMp = dims.length ? Math.round((dims.reduce((a, d) => a + (d.w * d.h), 0) / dims.length / 1e6) * 100) / 100 : null;
  const andelPortrett = dims.length ? Math.round((dims.filter((d) => d.h > d.w * 1.05).length / dims.length) * 100) / 100 : null;
  const teknisk = { antallBilder: (lead.bilder || []).length, maltBilder: dims.length, snittMp, andelPortrett };

  // 2) Ett Gemini-kall: visuell vurdering + tekster (strengt JSON, ingen tall)
  const g = lead.analyse?.grunnlag || {};
  const fakta = [
    `Tittel: ${lead.tittel || '—'}`,
    `Adresse: ${lead.adresse || '—'}${lead.postnr ? `, ${lead.postnr} Bergen` : ''}`,
    `Månedsleie annonsert: ${lead.pris ? `${lead.pris} kr` : 'ukjent'}`,
    `Areal: ${lead.m2 ? `${lead.m2} m²` : 'ukjent'} · Soverom: ${lead.soverom ?? 'ukjent'} · Boligtype: ${lead.boligtype || 'ukjent'}`,
    `Møblering: ${lead.mobler || 'ukjent'} · Inkluderer: ${lead.inkluderer || 'ukjent'}`,
    `Beskrivelse: ${lead.beskrivelse ? `«${lead.beskrivelse.slice(0, 1200)}»` : 'ikke tilgjengelig'}`,
    `Antall bilder i annonsen: ${(lead.bilder || []).length}`,
    (g.antallISone || 0) > 0 ? `DigiHome har ${g.antallISone} utleide boliger i samme postsone (${g.sone}).` : '',
  ].filter(Boolean).join('\n');
  const prompt = `Du er kvalitetsanalytiker for boligannonser hos DigiHome, en profesjonell utleieforvalter i Bergen. Vurder denne FINN-leieannonsen som SALGSVERKTØY. Du får annonsedata og opptil 5 av annonsens egne bilder.

ANNONSEDATA:
${fakta}

Returner KUN gyldig JSON uten markdown-gjerder, nøyaktig denne strukturen:
{"bilder":{"lys":0-10,"skarphet":0-10,"ryddighet":0-10,"styling":0-10},"tekst":0-10 eller null,"funn":["…"],"stylingPotensial":"lav"|"middels"|"høy","salgsvinkel":"…","finnMelding":"…","heroIntro":"…","potensialTekst":"…"}

Regler:
- bilder: 10 = proff boligfotograf (godt lys, skarpt, ryddig, stylet/innbydende), 0 = svært dårlig. Vurder helheten av bildene.
- tekst: hvor selgende og komplett beskrivelsen er. null hvis beskrivelse ikke tilgjengelig.
- funn: maks 8 KORTE punkter på norsk om annonsens konkrete svakheter/styrker (internt bruk, kan være direkte).
- salgsvinkel: 1-2 setninger til selgeren vår — hvilken vinkel vinner denne leaden.
- finnMelding: kort, høflig melding (maks 500 tegn) til annonsøren via FINN. Presenter DigiHome i én setning, nevn noe konkret og positivt fra annonsen, og vis til lenken {LENKE} der de ser vårt konkrete tilbud. ALDRI tall, priser, prosenter eller garantier.
- heroIntro: 1-2 nøkterne setninger til tilbudssiden om akkurat denne boligen/beliggenheten. ALDRI tall, priser, arealer eller antall rom — de vises allerede på siden. Fokuser på beliggenhet og boligens kvaliteter, kun basert på annonsedataene.
- potensialTekst: 2-3 setninger til tilbudssiden, positivt innrammet: hvilket potensial vi ser i presentasjonen og utleien. ALDRI kritikk av eier/bilder, ALDRI tall.
- Norsk bokmål, nøktern tone, ingen superlativer eller utropstegn.`;

  const innhold = [{ type: 'text', text: prompt }];
  for (const n of nedlastet) innhold.push({ type: 'image_url', image_url: { url: `data:${n.mimeType};base64,${n.base64}` } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let svar;
  try {
    const r = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gemini/gemini-2.5-flash',
        messages: [{ role: 'user', content: innhold }],
        temperature: 0.4,
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: body?.error?.message ? String(body.error.message).slice(0, 200) : `AI-analyse feilet (${r.status})`, status: 502 };
    svar = body?.choices?.[0]?.message?.content || '';
  } catch (e) {
    return { ok: false, error: e.name === 'AbortError' ? 'AI-analysen brukte for lang tid' : (e.message || 'AI-analyse feilet'), status: 502 };
  } finally { clearTimeout(timer); }

  let ai;
  try {
    ai = JSON.parse(String(svar).replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim());
  } catch (e) { return { ok: false, error: 'AI-en returnerte ikke gyldig JSON — prøv igjen', status: 502 }; }

  // 3) Vei sammen — AI-delscorer klemmes, deterministiske deler regnes i kode
  const b = ai.bilder || {};
  const deler = {
    visuell: klem10((klem10(b.lys) + klem10(b.skarphet) + klem10(b.ryddighet) + klem10(b.styling)) / 4),
    opplosning: opplosningScore10(snittMp),
    orientering: orienteringScore10(andelPortrett),
    antall: antallScore10((lead.bilder || []).length),
    tekst: ai.tekst == null ? tekstFallback10(lead) : klem10(ai.tekst),
    hygiene: hygieneScore10(lead),
  };
  const annonseScore = veidAnnonseScore(deler);
  const potensialScore = potensialFra(annonseScore, lead);
  const rens = (s, maks) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, maks);
  const aiDoc = {
    at: new Date().toISOString(),
    modell: 'gemini/gemini-2.5-flash',
    annonseScore,
    potensialScore,
    deler,
    teknisk,
    funn: (Array.isArray(ai.funn) ? ai.funn : []).slice(0, 8).map((f) => rens(f, 140)).filter(Boolean),
    stylingPotensial: ['lav', 'middels', 'høy'].includes(ai.stylingPotensial) ? ai.stylingPotensial : 'middels',
    salgsvinkel: rens(ai.salgsvinkel, 400),
    finnMelding: rens(ai.finnMelding, 700),
    tilbudTekst: { heroIntro: rens(ai.heroIntro, 300), potensialTekst: rens(ai.potensialTekst, 500), redigert: false },
  };
  await db.collection(LEADS_COLL).updateOne({ id: lead.id }, { $set: { ai: aiDoc, updatedAt: new Date().toISOString() } });
  return { ok: true, lead: leadUt({ ...lead, ai: aiDoc }) };
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
const leadUt = (d) => { const { _id, ...rest } = d || {}; return rest; };

export async function opprettLead(db, annonse, analyse, kildeUrl, { kilde = 'manuell' } = {}) {
  // Dedupe: samme finnkode gjenbrukes (oppfrisker annonsedata, beholder pipeline)
  const eksisterende = await db.collection(LEADS_COLL).findOne({ finnkode: annonse.finnkode });
  const now = new Date().toISOString();
  if (eksisterende) {
    // Oppfrisk annonsedata — men rør aldri pipeline-felter eller opprinnelig kilde
    await db.collection(LEADS_COLL).updateOne(
      { id: eksisterende.id },
      { $set: { ...annonse, kildeUrl, updatedAt: now } },
    );
    return { lead: leadUt({ ...eksisterende, ...annonse, kildeUrl, updatedAt: now }), fantesFraFor: true };
  }
  const lead = {
    id: uuidv4(),
    ...annonse,
    kildeUrl,
    kilde, // 'manuell' (lagt inn i admin) eller 'agent' (matet via ingest-API)
    status: 'analysert',
    analyse,
    stylet: [], // [{id, kildeUrl, stil}] — selve bildene bor i BILDER_COLL
    tilbudSlug: crypto.randomBytes(8).toString('base64url'),
    aapninger: 0,
    sistAapnet: null,
    notat: '',
    kontaktLogg: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.collection(LEADS_COLL).insertOne({ ...lead });
  return { lead, fantesFraFor: false };
}

export async function listLeads(db) {
  const docs = await db.collection(LEADS_COLL)
    .find({}, { projection: { _id: 0 } })
    .sort({ updatedAt: -1 })
    .toArray();
  // Potensial-score på alle: full AI-score der den finnes, ellers foreløpig
  const now = Date.now();
  return docs.map((d) => ({
    ...d,
    potensial: d.ai?.potensialScore != null
      ? { score: d.ai.potensialScore, annonseScore: d.ai.annonseScore, forelopig: false }
      : grunnPotensial(d, now),
  }));
}

export async function oppdaterLead(db, body = {}) {
  const id = String(body.id || '');
  const cur = await db.collection(LEADS_COLL).findOne({ id });
  if (!cur) return { ok: false, error: 'Ikke funnet', status: 404 };
  const set = { updatedAt: new Date().toISOString() };
  if (body.status !== undefined) {
    if (!RADAR_STATUSER.includes(body.status)) return { ok: false, error: 'Ugyldig status', status: 400 };
    set.status = body.status;
  }
  if (body.notat !== undefined) set.notat = String(body.notat).slice(0, 4000);
  // Redigering av AI-genererte tekster (krever at analyse er kjørt)
  if (body.finnMelding !== undefined || (body.tilbudTekst && typeof body.tilbudTekst === 'object')) {
    if (!cur.ai) return { ok: false, error: 'Kjør AI-analyse først', status: 400 };
    if (body.finnMelding !== undefined) set['ai.finnMelding'] = String(body.finnMelding).replace(/\s+$/g, '').slice(0, 700);
    if (body.tilbudTekst && typeof body.tilbudTekst === 'object') {
      if (body.tilbudTekst.heroIntro !== undefined) set['ai.tilbudTekst.heroIntro'] = String(body.tilbudTekst.heroIntro).replace(/\s+$/g, '').slice(0, 300);
      if (body.tilbudTekst.potensialTekst !== undefined) set['ai.tilbudTekst.potensialTekst'] = String(body.tilbudTekst.potensialTekst).replace(/\s+$/g, '').slice(0, 500);
      set['ai.tilbudTekst.redigert'] = true;
    }
  }
  if (body.analyse && typeof body.analyse === 'object') {
    set.analyse = {
      ...cur.analyse,
      anbefaltLeie: Math.max(0, Math.round(Number(body.analyse.anbefaltLeie ?? cur.analyse?.anbefaltLeie) || 0)),
      honorarPct: Math.min(15, Math.max(4, Number(body.analyse.honorarPct ?? cur.analyse?.honorarPct) || 8)),
    };
  }
  await db.collection(LEADS_COLL).updateOne({ id }, { $set: set });
  const oppdatert = await db.collection(LEADS_COLL).findOne({ id }, { projection: { _id: 0 } });
  return { ok: true, lead: oppdatert };
}

// Bulk-sletting: flere leads i én operasjon (multivalg i admin)
export async function slettLeads(db, ids = []) {
  const rene = Array.from(new Set((Array.isArray(ids) ? ids : []).map((x) => String(x || '')).filter(Boolean))).slice(0, 100);
  if (!rene.length) return { ok: false, error: 'Ingen leads valgt', status: 400 };
  const r = await db.collection(LEADS_COLL).deleteMany({ id: { $in: rene } });
  await db.collection(BILDER_COLL).deleteMany({ leadId: { $in: rene } });
  return { ok: true, slettet: r.deletedCount };
}

export async function slettLead(db, id) {
  const r = await db.collection(LEADS_COLL).deleteOne({ id: String(id || '') });
  if (!r.deletedCount) return { ok: false, error: 'Ikke funnet', status: 404 };
  await db.collection(BILDER_COLL).deleteMany({ leadId: String(id) });
  return { ok: true };
}

// ── AI-styling (Nano Banana via Emergent litellm-proxy) ─────────────────────
// VERIFISERT 14.02.2026: POST /llm/v1/chat/completions, modell
// gemini/gemini-2.5-flash-image, image_url som data-URL, modalities
// ["image","text"] → choices[0].message.images[0].image_url.url (data-URL).
export const STILER = {
  nordisk: 'Style rommet lyst og nordisk: lyse tekstiler, eik, grønne planter, moderne pendellampe og ryddige flater.',
  moderne: 'Style rommet moderne og eksklusivt: rene linjer, mørke aksenter, designmøbler, stemningsbelysning og ryddige flater.',
  varm: 'Style rommet varmt og innbydende: naturmaterialer, myke tekstiler, varme jordtoner, levende lys-stemning og ryddige flater.',
};

async function lastNedFinnBilde(kildeUrl) {
  let u;
  try { u = new URL(String(kildeUrl || '')); } catch (e) { throw new Error('Ugyldig bilde-URL'); }
  if (u.protocol !== 'https:' || u.hostname !== 'images.finncdn.no') throw new Error('Kun bilder fra images.finncdn.no kan styles');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(u, { signal: controller.signal, cache: 'no-store', redirect: 'error', headers: { Accept: 'image/jpeg,image/png,image/webp' } });
    if (!r.ok) throw new Error(`Bildehenting feilet (${r.status})`);
    const type = (r.headers.get('content-type') || 'image/jpeg').split(';')[0];
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 12 * 1024 * 1024) throw new Error('Bildet er for stort');
    return { base64: buf.toString('base64'), mimeType: type, buf };
  } finally { clearTimeout(timer); }
}

export async function stilBilde(kildeUrl, stil = 'nordisk') {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key || !key.startsWith('sk-emergent-')) throw new Error('EMERGENT_LLM_KEY mangler i miljøet');
  const stilTekst = STILER[stil] || STILER.nordisk;
  const { base64, mimeType } = await lastNedFinnBilde(kildeUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 110000);
  try {
    const r = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: 'gemini/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: `Virtuell staging av dette eksisterende boligfotoet for en boligannonse. ${stilTekst} Behold rommets arkitektur, kameravinkel, vinduer, dører, gulv, vegger og perspektiv nøyaktig. Endre kun møblering, dekor, farger og belysning. Fotorealistisk resultat. Ingen personer, tekst, logoer eller vannmerker.` },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          ],
        }],
        modalities: ['image', 'text'],
      }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body?.error?.message ? String(body.error.message).slice(0, 200) : `AI-styling feilet (${r.status})`);
    const bilde = body?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!bilde || !bilde.startsWith('data:image/')) throw new Error('AI-en returnerte ikke et bilde — prøv igjen');
    return bilde; // data-URL
  } finally { clearTimeout(timer); }
}

export async function lagreStyletBilde(db, leadId, kildeUrl, stil, dataUrl) {
  const id = uuidv4();
  await db.collection(BILDER_COLL).insertOne({
    id, leadId: String(leadId), kildeUrl, stil, dataUrl, createdAt: new Date().toISOString(),
  });
  await db.collection(LEADS_COLL).updateOne(
    { id: String(leadId) },
    { $push: { stylet: { id, kildeUrl, stil } }, $set: { updatedAt: new Date().toISOString() } },
  );
  return id;
}

export async function hentStyletBilde(db, bildeId) {
  return db.collection(BILDER_COLL).findOne({ id: String(bildeId || '') }, { projection: { _id: 0 } });
}

// ── Offentlig tilbudsside ────────────────────────────────────────────────────
export async function hentTilbud(db, slug, { sporAapning = false } = {}) {
  const lead = await db.collection(LEADS_COLL).findOne({ tilbudSlug: String(slug || '') });
  if (!lead) return null;
  if (sporAapning) {
    await db.collection(LEADS_COLL).updateOne(
      { id: lead.id },
      { $inc: { aapninger: 1 }, $set: { sistAapnet: new Date().toISOString() } },
    );
  }
  // Kun feltene tilbudssiden trenger — aldri notat/kontaktlogg/intern analyse-grunnlag
  return {
    tittel: lead.tittel,
    adresse: lead.adresse,
    postnr: lead.postnr,
    boligtype: lead.boligtype,
    m2: lead.m2,
    soverom: lead.soverom,
    bilder: (lead.bilder || []).slice(0, 6),
    stylet: (lead.stylet || []).map((s) => ({ id: s.id, kildeUrl: s.kildeUrl, stil: s.stil })),
    regnestykke: tilbudsRegnestykke(lead),
    // Personlig AI-tekst (redigerbar i admin) — siden faller tilbake til
    // standardtekst når den mangler. Aldri funn/scorer/intern analyse ut.
    tekst: lead.ai?.tilbudTekst?.heroIntro || lead.ai?.tilbudTekst?.potensialTekst
      ? { heroIntro: lead.ai.tilbudTekst.heroIntro || '', potensialTekst: lead.ai.tilbudTekst.potensialTekst || '' }
      : null,
  };
}

export async function registrerTilbudKontakt(db, slug, body = {}) {
  const lead = await db.collection(LEADS_COLL).findOne({ tilbudSlug: String(slug || '') });
  if (!lead) return { ok: false, error: 'Ikke funnet', status: 404 };
  const navn = String(body.navn || '').trim().slice(0, 80);
  const tlf = String(body.telefon || '').trim().slice(0, 20);
  const melding = String(body.melding || '').trim().slice(0, 1000);
  if (!navn || (!tlf && !melding)) return { ok: false, error: 'Navn og telefon/melding kreves', status: 400 };
  await db.collection(LEADS_COLL).updateOne(
    { id: lead.id },
    {
      $push: { kontaktLogg: { navn, telefon: tlf, melding, at: new Date().toISOString() } },
      $set: { status: lead.status === 'vunnet' || lead.status === 'tapt' ? lead.status : 'dialog', updatedAt: new Date().toISOString() },
    },
  );
  return { ok: true, leadId: lead.id, adresse: lead.adresse || lead.tittel };
}
