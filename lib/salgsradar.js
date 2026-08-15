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
// Slettede finnkoder huskes slik at agent-ingest ikke gjenoppliver leads
// brukeren bevisst har fjernet (agenten re-sender ved hver prisendring).
// Manuell innliming i admin fjerner tombstonen igjen.
export const TOMBSTONE_COLL = 'salgsradar_tombstones';
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
  // Navn på utleier/kontaktperson: prøv eksplisitte nøkler, ellers "name" i
  // nærheten av mobile-feltet i sidens serialiserte kontaktdata.
  const kontaktNavn = grip(/\\?"contactName\\?",\s*\\?"([^"\\]{2,60})/)
    || grip(/\\?"contactPerson\\?",\s*\\?"([^"\\]{2,60})/)
    || (() => {
      const i = html.search(/\\?"mobile\\?"/);
      if (i < 0) return null;
      const vindu = html.slice(Math.max(0, i - 800), i + 800);
      const t = vindu.match(/\\?"name\\?",\s*\\?"([^"\\]{2,60})/);
      return t ? t[1] : null;
    })();
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
    kontaktNavn: (kontaktNavn || '').replace(/\s+/g, ' ').trim().slice(0, 60),
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
  // Agentens payload-format kan drifte — godta vanlige aliaser for fulltekst
  // og møblering, og logg feltNAVNENE som kom inn (aldri verdier) slik at vi
  // ser skjemaendringer på neste annonse.
  const forsteTekst = (...kandidater) => {
    for (const k of kandidater) {
      const v = String(k ?? '').replace(/\s+/g, ' ').trim();
      if (v) return v;
    }
    return '';
  };
  const beskrivelse = forsteTekst(
    body.beskrivelse, body.annonsetekst, body.annonseTekst, body.tekst,
    body.description, body.fullTekst, body.full_tekst, body.adText, body.ad_text, body.innhold,
  ).slice(0, 8000);
  const mobler = forsteTekst(body.mobler, body.moblering, body['møblering'], body.furnished).slice(0, 40);
  // Telefon til utleier: agenten kan sende feltet under flere navn — godta aliaser
  const tlfRaa = forsteTekst(
    body.kontaktTlf, body.telefon, body.tlf, body.mobil, body.mobile,
    body.phone, body.kontakttelefon, body.kontaktTelefon, body.utleierTlf, body.utleierTelefon, body.contactPhone,
  );
  const kontaktTlf = tlfRaa.replace(/\s/g, '').replace(/[^\d+]/g, '').slice(0, 15);
  // Navn på utleier: samme alias-toleranse som telefon
  const kontaktNavn = forsteTekst(
    body.kontaktNavn, body.utleier, body.utleierNavn, body.navn,
    body.kontaktperson, body.kontaktPerson, body.contactName, body.annonsor, body.name,
  ).slice(0, 60);
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
      mobler,
      kontaktTlf,
      kontaktNavn,
      bilder: Array.from(new Set(bilder)),
      beskrivelse,
      mottatteFelter: Object.keys(body || {}).slice(0, 40).map((k) => String(k).slice(0, 40)),
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

function potensialFra(annonseScore, lead, now = Date.now(), salgskraft = null) {
  // Effektiv kvalitet: når salgskraft (hvor selgende annonsen er) finnes,
  // blandes den inn — en teknisk OK, men lite selgende annonse er fortsatt vinnbar.
  const kvalitet = Number.isFinite(salgskraft)
    ? Math.round(annonseScore * 0.55 + salgskraft * 0.45)
    : annonseScore;
  const pris = Number(lead.pris) || 0;
  const anbefalt = Number(lead.analyse?.anbefaltLeie) || 0;
  const gap = pris > 0 && anbefalt > pris ? Math.min(1, ((anbefalt - pris) / pris) / 0.25) * 100 : 0;
  const dager = (now - new Date(lead.createdAt || now).getTime()) / 86400000;
  const fersk = dager <= 2 ? 100 : dager <= 7 ? 70 : dager <= 14 ? 40 : 15;
  const g = lead.analyse?.grunnlag || {};
  const sone = (g.antallISone || 0) >= 2 ? 100 : (g.antallILeide || 0) > 0 ? 50 : 0;
  let score = (100 - kvalitet) * 0.45 + gap * 0.25 + fersk * 0.15 + sone * 0.15;
  // Ferskt priskutt (< 14 dager) = motivert utleier som sliter — sterkt
  // vinnbarhetssignal. Deterministisk bonus etter kuttets størrelse.
  const kutt = (lead.prisHistorikk || []).filter((h) => Number(h.til) < Number(h.fra)).slice(-1)[0];
  if (kutt && (now - new Date(kutt.at).getTime()) < 14 * 86400000) {
    const pct = (Number(kutt.fra) - Number(kutt.til)) / Number(kutt.fra);
    score += pct >= 0.08 ? 8 : pct >= 0.03 ? 5 : 2;
  }
  // Annonse tatt av FINN — trolig utleid/trukket, potensialet faller kraftig
  if (lead.annonseAktiv === false) score = Math.min(score, 20);
  return Math.min(100, Math.max(0, Math.round(score)));
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
    try { nedlastet.push({ ...(await lastNedFinnBilde(bu)), url: bu }); } catch (e) { /* hopp over døde bilder */ }
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
    `Beskrivelse: ${lead.beskrivelse ? `«${lead.beskrivelse.slice(0, 2400)}»` : 'ikke tilgjengelig'}`,
    `Antall bilder i annonsen: ${(lead.bilder || []).length}`,
    (g.antallISone || 0) > 0 ? `DigiHome har ${g.antallISone} utleide boliger i samme postsone (${g.sone}).` : '',
  ].filter(Boolean).join('\n');
  const prompt = `Du er kvalitetsanalytiker for boligannonser hos DigiHome, en profesjonell utleieforvalter i Bergen. Vurder denne FINN-leieannonsen som SALGSVERKTØY. Du får annonsedata og opptil 5 av annonsens egne bilder.

ANNONSEDATA:
${fakta}

Returner KUN gyldig JSON uten markdown-gjerder, nøyaktig denne strukturen:
{"bilder":{"lys":0-10,"skarphet":0-10,"ryddighet":0-10,"styling":0-10},"bilderUmoblert":true|false,"tekst":0-10 eller null,"salgskraft":{"forsteinntrykk":0-10,"appell":0-10,"dekning":0-10,"tekstSalg":0-10},"bildeVurdering":[{"nr":1,"rom":"stue","score":0-10,"funn":"…"}],"annonseUtkast":{"tittel":"…","beskrivelse":"…","hoydepunkter":["…"],"fasiliteter":["…"]},"funn":["…"],"stylingPotensial":"lav"|"middels"|"høy","salgsvinkel":"…","finnMelding":"…","heroIntro":"…","potensialTekst":"…"}

Regler:
- bilder: 10 = proff boligfotograf (godt lys, skarpt, ryddig, stylet/innbydende), 0 = svært dårlig. Vurder helheten av bildene.
- bilderUmoblert: true hvis rommene på bildene i hovedsak er tomme/umøblerte.
- tekst: hvor selgende og komplett beskrivelsen er. null hvis beskrivelse ikke tilgjengelig.
- salgskraft — hvor SELGENDE er annonsen som helhet, sett med leietakers øyne:
  - forsteinntrykk: hvor sterkt selger HOVEDBILDET (bilde 1) i et FINN-søkeresultat? 10 = stopper scrollingen, 0 = man blar forbi.
  - appell: gir presentasjonen som helhet lyst til å bo her? (varme, lys, atmosfære, inntrykk av standard)
  - dekning: dekker bildene de viktigste rommene (stue, kjøkken, bad, soverom) og gir et komplett bilde av boligen?
  - tekstSalg: selger tittel + beskrivelse fordelene (beliggenhet, lys, standard, nabolag) — eller er det bare tørre fakta?
- bildeVurdering: ETT objekt per vedlagt bilde, i samme rekkefølge som bildene (nr 1 = første vedlagte). rom: ett av "stue","kjøkken","bad","soverom","gang","eksteriør","utsikt","plantegning","annet". score: hvor godt akkurat dette bildet selger rommet (0-10). funn: maks 12 ord, konkret og direkte (f.eks. «mørkt, useng rotete, gardiner trukket for»).
- annonseUtkast — skriv annonsen slik en toppmegler ville publisert den. Bruk KUN fakta som finnes i grunnlaget eller er synlig i bildene — aldri dikt opp fasiliteter, mål eller egenskaper:
  - tittel: selgende annonsetittel, maks 60 tegn. Led med det sterkeste salgspunktet (beliggenhet, lys, utsikt, standard) — ikke bare adresse/boligtype.
  - beskrivelse: 2-4 korte avsnitt selgende annonsetekst på norsk (skill avsnitt med \n\n). Første avsnitt selger følelsen og beliggenheten, deretter boligens innhold rom for rom, avslutt med praktisk info. Konkret, varm og profesjonell — ikke svulstig.
  - hoydepunkter: 3-5 korte punkter à maks 8 ord (f.eks. «Solrikt vestvendt med kveldssol»).
  - fasiliteter: 4-10 stikkord utledet av tekst/bilder (f.eks. «Balkong», «Heis», «Parkering», «Møblert», «Oppvaskmaskin», «Fiber/internett») — kun det som har dekning i grunnlaget.
- funn: maks 8 KORTE punkter på norsk om annonsens konkrete svakheter/styrker (internt bruk, kan være direkte).
- salgsvinkel: 1-2 setninger til selgeren vår — hvilken vinkel vinner denne leaden.
- finnMelding: kort, høflig melding (maks 500 tegn) til annonsøren via FINN. Presenter DigiHome i én setning, nevn noe konkret og positivt fra annonsen, og vis til lenken {LENKE} der de ser vårt konkrete tilbud. ALDRI tall, priser, prosenter eller garantier.
- heroIntro: 1-2 nøkterne setninger til tilbudssiden om akkurat denne boligen/beliggenheten. ALDRI tall, priser, arealer eller antall rom — de vises allerede på siden. Fokuser på beliggenhet og boligens kvaliteter, kun basert på annonsedataene.
- potensialTekst: 2-3 setninger til tilbudssiden, positivt innrammet: hvilket potensial vi ser i presentasjonen og utleien. ALDRI kritikk av eier/bilder, ALDRI tall.
- Norsk bokmål, nøktern tone, ingen superlativer eller utropstegn.`;

  const innhold = [{ type: 'text', text: prompt }];
  for (const n of nedlastet) innhold.push({ type: 'image_url', image_url: { url: `data:${n.mimeType};base64,${n.base64}` } });

  // Modellen svarer av og til med prosa rundt JSON-en eller trunkert JSON —
  // samme flakiness-klasse som bildegenereringen. Robust uttrekk + retry.
  const tekstFraMelding = (msg) => {
    const c = msg?.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) return c.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('\n');
    return '';
  };
  const trekkUtJson = (tekst) => {
    const t = String(tekst || '').replace(/```(?:json)?/gi, '').trim();
    const kandidater = [t];
    const forste = t.indexOf('{'); const siste = t.lastIndexOf('}');
    if (forste >= 0 && siste > forste) kandidater.push(t.slice(forste, siste + 1));
    for (const k of kandidater) {
      if (!k || !k.includes('{')) continue;
      try { const o = JSON.parse(k); if (o && typeof o === 'object') return o; } catch (e) { /* prøv neste */ }
    }
    return null;
  };

  let ai = null;
  let sisteFeil = 'AI-en returnerte ikke gyldig JSON';
  for (let forsok = 1; forsok <= 3 && !ai; forsok += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    // Forsøk 1: be eksplisitt om JSON-modus. Faller tilbake til fritekst-svar
    // med robust uttrekk hvis proxyen/modellen avviser parameteren.
    const brukJsonModus = forsok === 1;
    try {
      const r = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gemini/gemini-2.5-flash',
          messages: [{ role: 'user', content: innhold }],
          temperature: 0.4,
          ...(brukJsonModus ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        sisteFeil = body?.error?.message ? String(body.error.message).slice(0, 200) : `AI-analyse feilet (${r.status})`;
        // Permanente 4xx (utenom 429) uten JSON-modus i spill → gi opp med en gang
        if (r.status < 500 && r.status !== 429 && !brukJsonModus) {
          clearTimeout(timer);
          return { ok: false, error: sisteFeil, status: 502 };
        }
      } else {
        const kandidat = trekkUtJson(tekstFraMelding(body?.choices?.[0]?.message));
        if (kandidat && typeof kandidat.bilder === 'object') { ai = kandidat; } else { sisteFeil = 'AI-en returnerte ikke gyldig JSON'; }
      }
    } catch (e) {
      sisteFeil = e.name === 'AbortError' ? 'AI-analysen brukte for lang tid' : (e.message || 'AI-analyse feilet');
    } finally { clearTimeout(timer); }
    if (!ai && forsok < 3) await new Promise((res) => { setTimeout(res, 1200 * forsok); });
  }
  if (!ai) return { ok: false, error: `${sisteFeil} — prøvde 3 ganger`, status: 502 };

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
  // Salgskraft (0-100): hvor selgende er annonsen som helhet — hovedbildet
  // teller mest (det er dét leietaker ser i FINN-søket).
  const sk = ai.salgskraft || {};
  const skDeler = {
    forsteinntrykk: klem10(sk.forsteinntrykk),
    appell: klem10(sk.appell),
    dekning: klem10(sk.dekning),
    tekstSalg: klem10(sk.tekstSalg),
  };
  const salgskraftScore = Math.min(100, Math.max(0, Math.round(
    skDeler.forsteinntrykk * 3.5 + skDeler.appell * 2.5 + skDeler.dekning * 2.0 + skDeler.tekstSalg * 2.0,
  )));
  const potensialScore = potensialFra(annonseScore, lead, Date.now(), salgskraftScore);
  const rens = (s, maks) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, maks);
  // Per-bilde-vurdering: match mot nedlastede bilder via nr (1-basert), ellers posisjon
  const ROMTYPER = ['stue', 'kjøkken', 'bad', 'soverom', 'gang', 'eksteriør', 'utsikt', 'plantegning', 'annet'];
  const bildeVurdering = (Array.isArray(ai.bildeVurdering) ? ai.bildeVurdering : [])
    .slice(0, nedlastet.length)
    .map((bv, i) => {
      const nr = Number(bv?.nr);
      const idx = Number.isInteger(nr) && nr >= 1 && nr <= nedlastet.length ? nr - 1 : i;
      const romRaa = rens(bv?.rom, 20).toLowerCase();
      return {
        url: nedlastet[idx]?.url || null,
        rom: ROMTYPER.includes(romRaa) ? romRaa : 'annet',
        score: klem10(bv?.score),
        funn: rens(bv?.funn, 90),
      };
    })
    .filter((bv) => bv.url);
  // Annonseutkast — den ferdigskrevne annonsen (vises som preview på tilbudssiden).
  // Egen rens som bevarer avsnittsskiller (\n\n) i beskrivelsen.
  const rensAvsnitt = (s, maks) => String(s || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maks);
  const auRaa = ai.annonseUtkast || {};
  const annonseUtkast = {
    tittel: rens(auRaa.tittel, 80),
    beskrivelse: rensAvsnitt(auRaa.beskrivelse, 2400),
    hoydepunkter: (Array.isArray(auRaa.hoydepunkter) ? auRaa.hoydepunkter : []).map((h) => rens(h, 60)).filter(Boolean).slice(0, 5),
    fasiliteter: (Array.isArray(auRaa.fasiliteter) ? auRaa.fasiliteter : []).map((f) => rens(f, 30)).filter(Boolean).slice(0, 12),
  };
  const aiDoc = {
    at: new Date().toISOString(),
    modell: 'gemini/gemini-2.5-flash',
    annonseScore,
    potensialScore,
    deler,
    salgskraft: { score: salgskraftScore, deler: skDeler },
    bildeVurdering,
    annonseUtkast,
    teknisk,
    funn: (Array.isArray(ai.funn) ? ai.funn : []).slice(0, 8).map((f) => rens(f, 140)).filter(Boolean),
    bilderUmoblert: ai.bilderUmoblert === true,
    stylingPotensial: ['lav', 'middels', 'høy'].includes(ai.stylingPotensial) ? ai.stylingPotensial : 'middels',
    salgsvinkel: rens(ai.salgsvinkel, 400),
    finnMelding: rens(ai.finnMelding, 700),
    tilbudTekst: { heroIntro: rens(ai.heroIntro, 300), potensialTekst: rens(ai.potensialTekst, 500), redigert: false },
  };
  await db.collection(LEADS_COLL).updateOne({ id: lead.id }, { $set: { ai: aiDoc, updatedAt: new Date().toISOString() } });
  // Rydd bort gammel «Automatikken stoppet»-status når manuell analyse lykkes
  if (lead.auto?.status === 'feilet') {
    await db.collection(LEADS_COLL).updateOne({ id: lead.id }, { $set: { 'auto.status': 'ferdig', 'auto.feil': null, 'auto.oppdatert': new Date().toISOString() } });
  }
  return { ok: true, lead: leadUt({ ...lead, ai: aiDoc }) };
}

// ═══════════════════════ AUTO-PIPELINE ═══════════════════════
// Kjøres i bakgrunnen når en NY annonse kommer inn (API-ingest eller manuell
// innliming): 1) AI-analyse  2) riktig bildemodus velges ut fra møblerings-
// feltet + hva bildene viser  3) de 5 første bildene forbedres.
// Progresstatus lagres på lead.auto slik at UI-et kan vise fremdrift live.
// Kill-switch: RADAR_AUTO=0 i miljøet. Dagstak mot løpske kostnader.
const AUTO_ANALYSE_TAK = () => Number(process.env.RADAR_AUTO_ANALYSE_TAK) || 50;   // leads/dag
const AUTO_BILDE_TAK = () => Number(process.env.RADAR_AUTO_BILDE_TAK) || 75;       // bilder/dag

// Beslutningsmatrise fra møbleringsfelt (utleieform) + bildeinnhold:
//   umøblert utleie + tomme bilder  → lysloft (ALDRI møbler — ærlighet)
//   møblert utleie  + tomme bilder  → nordisk staging (møbleringsforslag)
//   ellers / ukjent                 → optimal (alltid trygt)
export function velgAutoStil(lead) {
  // Møblering hentes fra eget felt OG fulltekst-beskrivelsen (agent-payload) —
  // «umøblert» sjekkes først siden «møblert» er delstreng av den.
  const t = `${lead.mobler || ''} ${lead.beskrivelse || ''}`.toLowerCase();
  const umoblertUtleie = t.includes('umøblert') || t.includes('umoblert') || t.includes('unfurnished');
  const moblertUtleie = t.replace(/umøblert|umoblert|unfurnished/g, '').includes('møblert') || t.includes('furnished');
  const tommeBilder = lead.ai?.bilderUmoblert === true;
  if (tommeBilder && umoblertUtleie) return 'lysloft';
  if (tommeBilder && moblertUtleie) return 'nordisk';
  return 'optimal';
}

async function autoTelleverk(db, felt, antall = 1) {
  const dato = new Date().toISOString().slice(0, 10);
  const r = await db.collection('radar_auto_stat').findOneAndUpdate(
    { dato },
    { $inc: { [felt]: antall }, $setOnInsert: { dato } },
    { upsert: true, returnDocument: 'after' },
  );
  return r?.value?.[felt] ?? r?.[felt] ?? antall;
}

export async function kjorAutoPipeline(db, leadId) {
  if (process.env.RADAR_AUTO === '0') return { ok: true, hoppet: 'av' };
  const id = String(leadId || '');
  const settAuto = (patch) => db.collection(LEADS_COLL).updateOne(
    { id },
    { $set: { ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [`auto.${k}`, v])), updatedAt: new Date().toISOString() } },
  );
  try {
    const lead0 = await db.collection(LEADS_COLL).findOne({ id });
    if (!lead0) return { ok: false, error: 'Lead ikke funnet' };
    // Dagstak for analyser
    const brukt = await autoTelleverk(db, 'analyser');
    if (brukt > AUTO_ANALYSE_TAK()) {
      await settAuto({ status: 'hoppet', feil: `Dagstak nådd (${AUTO_ANALYSE_TAK()} analyser/dag)`, oppdatert: new Date().toISOString() });
      return { ok: true, hoppet: 'dagstak' };
    }
    const bilderTotalt = Math.min(5, (lead0.bilder || []).length);
    await db.collection(LEADS_COLL).updateOne({ id }, { $set: { auto: { status: 'analyserer', startet: new Date().toISOString(), bilderFerdig: 0, bilderTotalt, oppdatert: new Date().toISOString() } } });

    // Steg 1: AI-analyse
    const an = await analyserAnnonse(db, id);
    if (!an.ok) {
      await settAuto({ status: 'feilet', feil: `Analyse: ${an.error}`, oppdatert: new Date().toISOString() });
      return { ok: false, error: an.error };
    }

    // Steg 2: velg bildemodus og forbedre de 5 første bildene
    const lead = await db.collection(LEADS_COLL).findOne({ id });
    const modus = velgAutoStil(lead);
    await settAuto({ status: 'styler', modus, oppdatert: new Date().toISOString() });
    let ferdig = 0; let feilet = 0; const feiletBilder = [];
    for (const bu of (lead.bilder || []).slice(0, 5)) {
      const bBrukt = await autoTelleverk(db, 'bilder');
      if (bBrukt > AUTO_BILDE_TAK()) {
        await settAuto({ feil: `Bilde-dagstak nådd (${AUTO_BILDE_TAK()}/dag) — ${ferdig} av ${bilderTotalt} forbedret`, oppdatert: new Date().toISOString() });
        break;
      }
      try {
        const dataUrl = await stilBilde(bu, modus);
        await lagreStyletBilde(db, id, bu, modus, dataUrl);
        ferdig += 1;
      } catch (e) { feilet += 1; feiletBilder.push(bu); }
      await settAuto({ bilderFerdig: ferdig, bilderFeilet: feilet, oppdatert: new Date().toISOString() });
    }
    // «ferdig_med_feil» når noe feilet — UI-et viser da en retry-knapp som
    // kjører kun de feilede bildene på nytt (kjorAutoRetry).
    await settAuto({ status: feilet > 0 ? 'ferdig_med_feil' : 'ferdig', bilderFerdig: ferdig, bilderFeilet: feilet, feiletBilder, ferdigAt: new Date().toISOString(), oppdatert: new Date().toISOString() });
    return { ok: true, ferdig, feilet, modus };
  } catch (e) {
    try { await settAuto({ status: 'feilet', feil: String(e.message || e).slice(0, 200), oppdatert: new Date().toISOString() }); } catch (e2) { /* ignore */ }
    return { ok: false, error: e.message };
  }
}

// Manuell «prøv feilede på nytt»: kjører KUN kildebildene som feilet i auto-
// pipelinen (samme modus), fortsetter telleverket og ender i ferdig /
// ferdig_med_feil. Kalles fire-and-forget fra API-ruten — UI følger via polling.
export function retryKandidater(lead) {
  const styletKilder = new Set((lead?.stylet || []).map((s) => s.kildeUrl));
  // Kun bilder som fortsatt finnes på leaden er gyldige (døde 404-lenker
  // fjernes fra lead.bilder ved ingest-oppfriskning/healing)
  const gyldige = new Set(lead?.bilder || []);
  const eksplisitt = (Array.isArray(lead?.auto?.feiletBilder) ? lead.auto.feiletBilder : []).filter((b) => b && !styletKilder.has(b) && gyldige.has(b));
  if (eksplisitt.length) return eksplisitt.slice(0, 5);
  // Eldre leads mangler feiletBilder — fall tilbake til de av de 5 første uten stylet versjon
  return (lead?.bilder || []).slice(0, 5).filter((b) => !styletKilder.has(b));
}

export async function kjorAutoRetry(db, leadId) {
  const id = String(leadId || '');
  const settAuto = (patch) => db.collection(LEADS_COLL).updateOne(
    { id },
    { $set: { ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [`auto.${k}`, v])), updatedAt: new Date().toISOString() } },
  );
  try {
    const lead = await db.collection(LEADS_COLL).findOne({ id });
    if (!lead) return { ok: false, error: 'Lead ikke funnet', status: 404 };
    if (['analyserer', 'styler'].includes(lead.auto?.status)) return { ok: false, error: 'Automatikken kjører allerede', status: 409 };
    const maal = retryKandidater(lead);
    if (!maal.length) return { ok: false, error: 'Ingen feilede bilder å prøve på nytt', status: 400 };
    const modus = lead.auto?.modus || velgAutoStil(lead);
    const bilderTotalt = lead.auto?.bilderTotalt || Math.min(5, (lead.bilder || []).length);
    let ferdig = lead.auto?.bilderFerdig || 0;
    let feilet = maal.length;
    const gjenstaar = [...maal];
    await settAuto({ status: 'styler', modus, bilderTotalt, bilderFerdig: ferdig, bilderFeilet: feilet, feil: null, oppdatert: new Date().toISOString() });
    for (const bu of maal) {
      const bBrukt = await autoTelleverk(db, 'bilder');
      if (bBrukt > AUTO_BILDE_TAK()) {
        await settAuto({ feil: `Bilde-dagstak nådd (${AUTO_BILDE_TAK()}/dag)`, oppdatert: new Date().toISOString() });
        break;
      }
      try {
        const dataUrl = await stilBilde(bu, modus);
        await lagreStyletBilde(db, id, bu, modus, dataUrl);
        ferdig += 1; feilet -= 1;
        const idx = gjenstaar.indexOf(bu);
        if (idx >= 0) gjenstaar.splice(idx, 1);
      } catch (e) { /* forblir i gjenstaar */ }
      await settAuto({ bilderFerdig: ferdig, bilderFeilet: feilet, feiletBilder: [...gjenstaar], oppdatert: new Date().toISOString() });
    }
    await settAuto({ status: feilet > 0 ? 'ferdig_med_feil' : 'ferdig', bilderFerdig: ferdig, bilderFeilet: feilet, feiletBilder: gjenstaar, ferdigAt: new Date().toISOString(), oppdatert: new Date().toISOString() });
    return { ok: true, ferdig, feilet, modus };
  } catch (e) {
    try { await settAuto({ status: 'ferdig_med_feil', feil: String(e.message || e).slice(0, 200), oppdatert: new Date().toISOString() }); } catch (e2) { /* ignore */ }
    return { ok: false, error: e.message };
  }
}

// ── CRUD ─────────────────────────────────────────────────────────────────────
const leadUt = (d) => { const { _id, ...rest } = d || {}; return rest; };

// Agenten sender av og til utdaterte finncdn-lenker som gir 404 → ødelagte
// thumbnails og bortkastede stylingkall. Sjekk at bildene faktisk svarer.
// Konservativ: nettverksfeil/timeout beholder bildet — kun eksplisitt !ok dropper.
export async function filtrerLevendeBilder(urls = [], { maks = 24, timeoutMs = 4000 } = {}) {
  const unike = Array.from(new Set((urls || []).filter(Boolean))).slice(0, maks);
  const sjekk = async (u) => {
    let p;
    try { p = new URL(String(u)); } catch (e) { return null; }
    if (p.protocol !== 'https:' || p.hostname !== 'images.finncdn.no') return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      let r = await fetch(u, { method: 'HEAD', signal: controller.signal, cache: 'no-store' });
      if (r.status === 405 || r.status === 501) r = await fetch(u, { signal: controller.signal, cache: 'no-store', headers: { Range: 'bytes=0-0' } });
      return r.ok ? u : null;
    } catch (e) {
      return u; // nettverksglipp ≠ død lenke
    } finally { clearTimeout(timer); }
  };
  const res = await Promise.all(unike.map(sjekk));
  return res.filter(Boolean);
}

export async function opprettLead(db, annonse, analyse, kildeUrl, { kilde = 'manuell' } = {}) {
  // Dedupe: samme finnkode gjenbrukes (oppfrisker annonsedata, beholder pipeline)
  const eksisterende = await db.collection(LEADS_COLL).findOne({ finnkode: annonse.finnkode });
  const now = new Date().toISOString();
  if (kilde === 'manuell') {
    // Manuell innliming = eksplisitt ønske — fjern ev. tombstone så agenten
    // kan oppdatere leaden igjen fremover
    await db.collection(TOMBSTONE_COLL).deleteMany({ finnkode: annonse.finnkode }).catch(() => {});
  }
  if (eksisterende) {
    // Oppfrisk annonsedata — men rør aldri pipeline-felter eller opprinnelig kilde.
    // Agenten re-sender ved prisendring: ta vare på hoppet i prisHistorikk.
    const gammelPris = Number(eksisterende.pris) || 0;
    const nyPris = Number(annonse.pris) || 0;
    let prisEndring = null;
    const oppdatering = { $set: { ...annonse, kildeUrl, updatedAt: now, annonseAktiv: true, deaktivertAt: null } };
    // Ikke visk ut et telefonnummer vi allerede har, hvis agenten dropper feltet i denne kjøringen
    if (!annonse.kontaktTlf && eksisterende.kontaktTlf) delete oppdatering.$set.kontaktTlf;
    // Samme for kontaktNavn — behold eksisterende hvis agenten ikke sender nytt
    if (!annonse.kontaktNavn && eksisterende.kontaktNavn) delete oppdatering.$set.kontaktNavn;
    if (gammelPris && nyPris && gammelPris !== nyPris) {
      prisEndring = { fra: gammelPris, til: nyPris, at: now };
      oppdatering.$push = { prisHistorikk: { $each: [prisEndring], $slice: -20 } };
    }
    await db.collection(LEADS_COLL).updateOne({ id: eksisterende.id }, oppdatering);
    const historikk = [...(eksisterende.prisHistorikk || []), ...(prisEndring ? [prisEndring] : [])].slice(-20);
    return { lead: leadUt({ ...eksisterende, ...annonse, kildeUrl, updatedAt: now, annonseAktiv: true, deaktivertAt: null, prisHistorikk: historikk }), fantesFraFor: true, prisEndring };
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
    prisHistorikk: [],
    annonseAktiv: true,
    deaktivertAt: null,
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
  await lagTombstones(db, rene);
  const r = await db.collection(LEADS_COLL).deleteMany({ id: { $in: rene } });
  await db.collection(BILDER_COLL).deleteMany({ leadId: { $in: rene } });
  return { ok: true, slettet: r.deletedCount };
}

// Husk finnkodene til slettede leads slik at ingest ikke gjenoppliver dem
async function lagTombstones(db, ids) {
  try {
    const docs = await db.collection(LEADS_COLL).find({ id: { $in: ids } }, { projection: { finnkode: 1, adresse: 1 } }).toArray();
    const now = new Date().toISOString();
    for (const d of docs) {
      if (!d.finnkode) continue;
      await db.collection(TOMBSTONE_COLL).updateOne(
        { finnkode: d.finnkode },
        { $set: { finnkode: d.finnkode, adresse: d.adresse || '', at: now } },
        { upsert: true },
      );
    }
  } catch (e) { /* tombstones er best effort */ }
}

export async function slettLead(db, id) {
  await lagTombstones(db, [String(id || '')]);
  const r = await db.collection(LEADS_COLL).deleteOne({ id: String(id || '') });
  if (!r.deletedCount) return { ok: false, error: 'Ikke funnet', status: 404 };
  await db.collection(BILDER_COLL).deleteMany({ leadId: String(id) });
  return { ok: true };
}

// ── AI-styling (Nano Banana via Emergent litellm-proxy) ─────────────────────
// VERIFISERT 14.02.2026: POST /llm/v1/chat/completions, modell
// gemini/gemini-2.5-flash-image, image_url som data-URL, modalities
// ["image","text"] → choices[0].message.images[0].image_url.url (data-URL).
// ── Bildeforbedring: tre moduser med hver sin fulle prompt ───────────────────
// «optimal» (standard): gjør det en fotograf/stylist ville gjort PÅ STEDET med
//   stylingbagen sin — nytt sengetøy, pynteputer, pledd, duk, friske håndklær,
//   proft lys. Møblene som står der beholdes (ærlighetsregelen: alt vi viser
//   kan DigiHome fysisk gjøre med tekstiler og rekvisitter før fotografering).
// «lysloft»: kun fototeknisk løft av tomme rom — ALDRI møbler (ærlig for
//   umøblert utleie).
// «nordisk/moderne/varm»: virtuell staging (møbleringsforslag) — kun riktig
//   når utleien ER møblert men bildene viser tomme rom. Merkes illustrasjon.
const stagingKontrakt = (t) => `Virtuell staging av dette eksisterende boligfotoet for en boligannonse. ${t} Behold rommets arkitektur, kameravinkel, vinduer, dører, gulv, vegger og perspektiv nøyaktig. Endre kun møblering, dekor, farger og belysning. Fotorealistisk resultat. Ingen personer, tekst, logoer eller vannmerker.`;
export const STILER = {
  // Rombevisst stylist-optimalisering: modellen er scene-bevisst og bruker
  // grenen som matcher rommet. Myke rekvisitter (tekstiler, duk, planter,
  // enkel borddekor) kan BYTTES og TILFØRES — møbler og faste flater er hellige.
  optimal: `Du er profesjonell eiendomsfotograf og boligstylist som klargjør et boligfoto for en eksklusiv leieannonse. Se for deg at stylisten har vært innom med stylingbagen sin: nytt sengetøy, pynteputer, pledd, duk, friske håndklær og et par grønne planter. Samme rom, samme møbler — men presentert som i et påkostet boligmagasin.
FOTOLØFT (alltid): naturlig dagslys fra vinduene, jevn og lys eksponering uten utbrente vinduer, korrekt hvitbalanse, klare men naturlige farger, skarpt — som et profesjonelt HDR-boligfoto.
STYLING — bruk grepene som passer romtypen du ser i bildet:
- Soverom: style sengen som på et boutiquehotell — BYTT gjerne ut gammelt/slitt sengetøy med ny, glatt, strøken hvit eller dus dyne og stramme laken, oppristede hodeputer, et pent brettet sengeteppe eller løper ved fotenden og 2-3 pynteputer i rolige, moderne toner. Rydd nattbordene (la stå en lampe, ev. en liten plante eller bok).
- Stue: klapp og rett opp sofaputene, style sofaen med 2-4 smakfulle pynteputer i matchende moderne toner og et pent drapert pledd over armlenet. Rydd stuebordet og style det enkelt: en vase med friske snittblomster eller en grønn plante, ev. et par pene bøker eller en lysestake — maks 2-3 objekter. Rett opp teppe og gardiner.
- Spisestue/spiseplass: rydd bordet helt og dekk det pent — ren duk eller løper der det kler bordet, en enkel vase med friske blomster eller en grønn plante i midten. Skyv stolene ordentlig inntil.
- Kjøkken: helt ryddig benkeplate (fjern oppvask, kluter, flasker og småting), skinnende rene flater. Gjerne én smakfull detalj: en skål med frukt, en grønn urtepotte eller et pent brettet kjøkkenhåndkle.
- Bad: fjern alle toalettsaker, flasker og tannbørster; BYTT gjerne til friske, ensfargede håndklær hengt eller rullet pent som på hotell; rene speil og blanke flater; ev. en liten grønn plante.
- Alle rom: fjern rot, ledninger, poser, sko, klær, leker og personlige eiendeler; rett opp skjeve bilder, lamper og gjenstander; gardiner åpne og pent hengt. En liten grønn plante kan tilføres der den løfter rommet naturlig.
ABSOLUTTE REGLER: ikke bytt ut, legg til eller fjern MØBLER (senger, sofaer, bord, stoler, hyller, skap) — kun myke tekstiler, duk, håndklær, planter, blomster og småpynt kan byttes eller tilføres. Ikke endre arkitektur, kameravinkel, perspektiv, vinduer, dører, gulv, vegger, kjøkkeninnredning eller baderomsinnredning. Ingen personer, tekst, logoer eller vannmerker. Rommet må være umiddelbart gjenkjennbart for den som bor der. Resultatet skal se ut som et ekte fotografi tatt av en boligfotograf, ikke en illustrasjon.`,
  lysloft: 'Forbedre fotoet av dette tomme rommet slik en profesjonell eiendomsfotograf ville gjort: naturlig dagslys fra vinduene, jevn eksponering, korrekt hvitbalanse, rene gulv og vegger, fjern rusk og rot. IKKE legg til møbler, gjenstander eller dekor — rommet skal forbli tomt. Behold arkitektur, kameravinkel og perspektiv nøyaktig. Rommet skal være umiddelbart gjenkjennbart. Fotorealistisk. Ingen personer, tekst, logoer eller vannmerker.',
  nordisk: stagingKontrakt('Style rommet lyst og nordisk: lyse tekstiler, eik, grønne planter, moderne pendellampe og ryddige flater.'),
  moderne: stagingKontrakt('Style rommet moderne og eksklusivt: rene linjer, mørke aksenter, designmøbler, stemningsbelysning og ryddige flater.'),
  varm: stagingKontrakt('Style rommet varmt og innbydende: naturmaterialer, myke tekstiler, varme jordtoner, levende lys-stemning og ryddige flater.'),
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

// Trekker bildet ut av proxy-svaret uansett hvilken feltvariant LiteLLM
// bruker: message.images[].image_url.url (vanligst), .url direkte, string-
// items, eller image_url-parts i content-arrayen. Kun data-URL-er godtas.
function trekkUtBilde(body) {
  const msg = body?.choices?.[0]?.message;
  const kandidater = [];
  for (const it of (Array.isArray(msg?.images) ? msg.images : [])) {
    if (typeof it === 'string') kandidater.push(it);
    else if (it?.image_url?.url) kandidater.push(it.image_url.url);
    else if (it?.url) kandidater.push(it.url);
  }
  if (Array.isArray(msg?.content)) {
    for (const p of msg.content) {
      if (p?.type === 'image_url' && p?.image_url?.url) kandidater.push(p.image_url.url);
    }
  }
  return kandidater.find((u) => typeof u === 'string' && u.startsWith('data:image/')) || null;
}

export async function stilBilde(kildeUrl, stil = 'optimal') {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key || !key.startsWith('sk-emergent-')) throw new Error('EMERGENT_LLM_KEY mangler i miljøet');
  const stilTekst = STILER[stil] || STILER.optimal;
  const { base64, mimeType } = await lastNedFinnBilde(kildeUrl);
  // Modellvalg: Nano Banana Pro (gemini-3-pro-image-preview) er primær —
  // bekreftet tilgjengelig på Emergent-proxyen 15.02.2026 (200 + image, samme
  // responsformat). Siste forsøk faller tilbake til 2.5-flash-image som er
  // battle-testet, slik at styling aldri dør selv om Pro-modellen ryker.
  const primaerModell = process.env.RADAR_BILDE_MODELL || 'gemini/gemini-3-pro-image-preview';
  const modeller = [primaerModell, primaerModell, 'gemini/gemini-2.5-flash-image'];
  // VIKTIG (strukturlogget 15.02.2026): modellen svarer av og til 200 OK med
  // KUN tekst («Her er det forbedrede bildet…») og tom images-array — svartid
  // ~1s mot ~6s for ekte bilder. Det er modell-flakiness, ikke parsingfeil.
  // Retry (opptil 3 forsøk) løser det nesten alltid; feilede forsøk er raske.
  let sisteFeil = 'AI-en returnerte ikke et bilde';
  for (let forsok = 1; forsok <= 3; forsok += 1) {
    const modell = modeller[forsok - 1];
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 110000);
    try {
      const r = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: modell,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: stilTekst },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            ],
          }],
          modalities: ['image', 'text'],
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (r.ok) {
        const bilde = trekkUtBilde(body);
        if (bilde) return bilde; // data-URL
        sisteFeil = 'AI-en returnerte ikke et bilde';
      } else {
        sisteFeil = body?.error?.message ? String(body.error.message).slice(0, 200) : `AI-styling feilet (${r.status})`;
        // Permanente 4xx: ikke kast — neste forsøk kan bruke fallback-modellen
      }
    } catch (e) {
      sisteFeil = e?.name === 'AbortError' ? 'AI-styling tidsavbrutt (110 sek)' : String(e?.message || e).slice(0, 160);
    } finally { clearTimeout(timer); }
    if (forsok < 3) await new Promise((res) => { setTimeout(res, 1500 * forsok); });
  }
  throw new Error(`${sisteFeil} — ga opp etter 3 forsøk`);
}

// DigiHome-vannmerke på AI-stylede bilder: hvit wordmark + lilla brikke nede
// til høyre (~17 % av bredden, 92 % opasitet). Feiler ALDRI stylingen — ved
// enhver feil returneres bildet uendret.
let vannmerkeSvgCache = null;
export async function leggPaaVannmerke(dataUrl) {
  try {
    const sharp = (await import('sharp')).default;
    const m = String(dataUrl || '').match(/^data:(image\/[a-z+.-]+);base64,(.+)$/i);
    if (!m) return dataUrl;
    const buf = Buffer.from(m[2], 'base64');
    const meta = await sharp(buf).metadata();
    if (!meta.width || !meta.height || meta.width < 240) return dataUrl;
    if (!vannmerkeSvgCache) {
      const fs = await import('fs');
      const path = await import('path');
      let svg = fs.readFileSync(path.join(process.cwd(), 'public', 'digihome-wordmark-white.svg'), 'utf8');
      svg = svg.replace(/#1f1f1f/gi, '#ffffff')
        .replace(/(<svg[^>]*>)/, '$1<g opacity="0.92">')
        .replace('</svg>', '</g></svg>');
      vannmerkeSvgCache = svg;
    }
    const mBredde = Math.max(140, Math.round(meta.width * 0.17));
    const merke = await sharp(Buffer.from(vannmerkeSvgCache)).resize({ width: mBredde }).png().toBuffer();
    const mMeta = await sharp(merke).metadata();
    const marg = Math.round(meta.width * 0.022);
    const ut = await sharp(buf)
      .composite([{ input: merke, left: Math.max(0, meta.width - mBredde - marg), top: Math.max(0, meta.height - (mMeta.height || 0) - marg) }])
      .jpeg({ quality: 90 })
      .toBuffer();
    return `data:image/jpeg;base64,${ut.toString('base64')}`;
  } catch (e) { return dataUrl; }
}

export async function lagreStyletBilde(db, leadId, kildeUrl, stil, dataUrl) {
  const id = uuidv4();
  const medMerke = await leggPaaVannmerke(dataUrl);
  await db.collection(BILDER_COLL).insertOne({
    id, leadId: String(leadId), kildeUrl, stil, dataUrl: medMerke, vannmerket: medMerke !== dataUrl, createdAt: new Date().toISOString(),
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
    // Annonse-preview: den ferdigskrevne annonsen slik DigiHome vil publisere
    // den — kun når AI-utkastet finnes (tittel + beskrivelse er minimum).
    annonse: lead.ai?.annonseUtkast?.tittel && lead.ai?.annonseUtkast?.beskrivelse
      ? {
        tittel: lead.ai.annonseUtkast.tittel,
        beskrivelse: lead.ai.annonseUtkast.beskrivelse,
        hoydepunkter: lead.ai.annonseUtkast.hoydepunkter || [],
        fasiliteter: lead.ai.annonseUtkast.fasiliteter || [],
        etasje: lead.etasje || '',
        mobler: lead.mobler || '',
      }
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
