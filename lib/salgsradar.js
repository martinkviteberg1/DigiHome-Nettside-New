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
    },
    kildeUrl: `https://www.finn.no/realestate/lettings/ad.html?finnkode=${finnkode}`,
  };
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
  return docs;
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
  if (body.analyse && typeof body.analyse === 'object') {
    set.analyse = {
      ...cur.analyse,
      anbefaltLeie: Math.max(0, Math.round(Number(body.analyse.anbefaltLeie ?? cur.analyse?.anbefaltLeie) || 0)),
      honorarPct: Math.min(15, Math.max(4, Number(body.analyse.honorarPct ?? cur.analyse?.honorarPct) || 8)),
    };
  }
  await db.collection(LEADS_COLL).updateOne({ id }, { $set: set });
  return { ok: true, lead: leadUt({ ...cur, ...set }) };
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
    return { base64: buf.toString('base64'), mimeType: type };
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
