// ─────────────────────────────────────────────────────────────────────────
//  lib/pris.js — DigiHome Tech AS sin prisliste + faktureringsgrunnlag.
//
//  KONTEKST (avklart med eier):
//   • Tech er ren programvareleverandør og fakturerer KUN B2B: forvaltere og
//     eiendomsselskaper. DigiHome AS regnes som en forvalterkunde og er
//     første kunde på listen (armlengde: samme listepris som enhver ekstern).
//   • Sluttkundene (private) er DigiHome AS sine kunder — deres priser (5 %,
//     honorar) håndteres i appens egen fakturamotor og ligger IKKE her.
//
//  Denne modulen holder: én B2B-prisliste med volumtrinn + faktureringsregler,
//  og beregner faktureringsgrunnlaget for et selskap en gitt måned direkte fra
//  leieforhold-dataene. Ingen PowerOffice-skriving her — kun tall og regler.
// ─────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';
import { getDb } from './mongodb';

const KOLLEKSJON = 'pris_config';
const DOK_ID = 'konsern'; // én aktiv konfigurasjon

// Standard B2B-prisliste (redigerbar i admin). Volumtrinn = «flat» modell:
// hele porteføljen prises etter trinnet antallet enheter faller innenfor.
export const STANDARD_PRIS = {
  id: DOK_ID,
  valuta: 'NOK',
  produktnavn: 'Plattformlisens',
  produktkode: 'PLATTFORM',
  // Prismodell: 'blandet' (1a) = én forvaltersats for alle enheter.
  //             'per_type' (1b) = egen sats for selvbetjente enheter.
  prisModell: 'blandet',
  // Volumtrinn (kr per enhet per måned, eks. mva) for forvalter/eiendomsselskap.
  trinn: [
    { fraEnheter: 0, pris: 200 },
    { fraEnheter: 50, pris: 150 },
    { fraEnheter: 200, pris: 99 },
  ],
  // Kun brukt når prisModell = 'per_type':
  selvbetjentPris: 79,
  // Faktureringsgrunnlag — hvilke enheter som telles for en måned:
  //   'utleid_mnd' = enheter utleid i måneden · 'prorata' = utleide dager/dager
  //   i måneden · 'alle' = alle enheter under aktiv forvaltning.
  grunnlag: 'utleid_mnd',
  grunnlagSelvbetjent: 'utleid_mnd', // egen regel for selvbetjente (per_type)
  // Fakturainnstillinger:
  mvaSats: 25,
  betalingsfristDager: 14,
  fakturadag: 1, // dag i måneden fakturaen dateres/kjøres
  levering: 'EHF', // 'EHF' | 'PdfByEmail'
  oppdatert: null,
  historikk: [], // [{ tid, av, endring }]
};

const GRUNNLAG_VALG = ['utleid_mnd', 'prorata', 'alle'];

function num(v, fallback, { min = 0, maks = 1e9 } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(maks, Math.max(min, n));
}

// ── Config: hent (seeder standard ved første kall) ──────────────────────────
export async function hentPrisConfig(dbArg) {
  const db = dbArg || (await getDb());
  let dok = await db.collection(KOLLEKSJON).findOne({ id: DOK_ID });
  if (!dok) {
    dok = { ...STANDARD_PRIS, oppdatert: new Date().toISOString() };
    await db.collection(KOLLEKSJON).insertOne(dok);
  }
  const { _id, ...rest } = dok;
  // Slå sammen med standard slik at nye felter alltid finnes.
  return { ...STANDARD_PRIS, ...rest, historikk: rest.historikk || [] };
}

// ── Config: lagre (validerer + versjonerer) ─────────────────────────────────
export async function lagrePrisConfig(patch = {}, { db: dbArg, av = 'admin' } = {}) {
  const db = dbArg || (await getDb());
  const naa = await hentPrisConfig(db);

  const trinnInn = Array.isArray(patch.trinn) ? patch.trinn : naa.trinn;
  const trinn = trinnInn
    .map((t) => ({ fraEnheter: Math.round(num(t.fraEnheter, 0, { maks: 1e6 })), pris: Math.round(num(t.pris, 0, { maks: 1e6 })) }))
    .sort((a, b) => a.fraEnheter - b.fraEnheter);
  if (!trinn.length) trinn.push({ fraEnheter: 0, pris: 0 });
  if (trinn[0].fraEnheter !== 0) trinn[0].fraEnheter = 0; // første trinn starter alltid på 0

  const oppdatert = {
    ...naa,
    produktnavn: String(patch.produktnavn ?? naa.produktnavn).slice(0, 80),
    produktkode: String(patch.produktkode ?? naa.produktkode).slice(0, 40).toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
    prisModell: patch.prisModell === 'per_type' ? 'per_type' : 'blandet',
    trinn,
    selvbetjentPris: Math.round(num(patch.selvbetjentPris, naa.selvbetjentPris, { maks: 1e6 })),
    grunnlag: GRUNNLAG_VALG.includes(patch.grunnlag) ? patch.grunnlag : naa.grunnlag,
    grunnlagSelvbetjent: GRUNNLAG_VALG.includes(patch.grunnlagSelvbetjent) ? patch.grunnlagSelvbetjent : naa.grunnlagSelvbetjent,
    mvaSats: num(patch.mvaSats, naa.mvaSats, { min: 0, maks: 100 }),
    betalingsfristDager: Math.round(num(patch.betalingsfristDager, naa.betalingsfristDager, { min: 0, maks: 180 })),
    fakturadag: Math.round(num(patch.fakturadag, naa.fakturadag, { min: 1, maks: 28 })),
    levering: patch.levering === 'PdfByEmail' ? 'PdfByEmail' : 'EHF',
    oppdatert: new Date().toISOString(),
  };

  const historikk = [{ tid: oppdatert.oppdatert, av, endring: 'Prisliste oppdatert' }, ...(naa.historikk || [])].slice(0, 40);
  oppdatert.historikk = historikk;

  await db.collection(KOLLEKSJON).updateOne({ id: DOK_ID }, { $set: oppdatert }, { upsert: true });
  const { _id, ...rest } = oppdatert;
  return rest;
}

// ── Volumpris: flat modell (hele porteføljen etter trinnet antallet faller i) ─
export function prisForAntall(trinn, n) {
  const sortert = [...(trinn || [])].sort((a, b) => a.fraEnheter - b.fraEnheter);
  let pris = sortert[0]?.pris || 0;
  for (const t of sortert) if (n >= t.fraEnheter) pris = t.pris;
  return pris;
}

// ── Hjelpere for grunnlagsberegning ─────────────────────────────────────────
function mndSpenn(maaned) {
  const [y, m] = String(maaned).split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const slutt = new Date(Date.UTC(y, m, 0)); // siste dag i måneden
  return { start, slutt, dager: slutt.getUTCDate() };
}
const dato = (s) => (s ? new Date(`${String(s).slice(0, 10)}T00:00:00Z`) : null);
const erForvaltet = (row) => /forvalt/i.test(String(row.service_level || 'Full forvaltning'));

// Var enheten utleid i måneden? (ekte, signert leieforhold som overlapper)
function utleidIMnd(row, start, slutt) {
  if (row.income_type && row.income_type !== 'actual') return false;
  const inn = dato(row.move_in_date);
  if (!inn || inn > slutt) return false;
  const ut = dato(row.move_out_date);
  if (ut && ut < start) return false;
  return true;
}
function prorataVekt(row, start, slutt, dager) {
  const inn = dato(row.move_in_date);
  if (!inn) return 0;
  const ut = dato(row.move_out_date);
  const fra = inn > start ? inn : start;
  const til = ut && ut < slutt ? ut : slutt;
  if (til < fra) return 0;
  const d = Math.round((til - fra) / 86400000) + 1;
  return Math.max(0, Math.min(1, d / dager));
}
function underForvaltning(row, slutt) {
  const aktiv = !row.forvaltning_status || row.forvaltning_status === 'active';
  const start = dato(row.forvaltning_start);
  return aktiv && (!start || start <= slutt);
}

// Teller enheter for ett grunnlag → { antall (distinkt), vekt (sum, kan være desimal) }
function tell(rows, grunnlag, start, slutt, dager) {
  let antall = 0;
  let vekt = 0;
  const enheter = [];
  for (const r of rows) {
    let med = false;
    let v = 0;
    if (grunnlag === 'alle') { med = underForvaltning(r, slutt); v = med ? 1 : 0; }
    else if (grunnlag === 'prorata') { v = prorataVekt(r, start, slutt, dager); med = v > 0; }
    else { med = utleidIMnd(r, start, slutt); v = med ? 1 : 0; }
    if (med) {
      antall += 1;
      vekt += v;
      enheter.push({ enhet_id: r.enhet_id, address: r.address, type: erForvaltet(r) ? 'forvaltet' : 'selvbetjent', vekt: Math.round(v * 100) / 100, monthly_rent: r.monthly_rent || 0 });
    }
  }
  return { antall, vekt, enheter };
}

// ── Faktureringsgrunnlag for et selskap en måned ────────────────────────────
//  rows = leieforhold-rader (fra hentLeieforhold), config = prisliste.
export function beregnGrunnlag(rows, config, maaned) {
  const { start, slutt, dager } = mndSpenn(maaned);
  const alle = Array.isArray(rows) ? rows : [];
  const linjer = [];

  if (config.prisModell === 'per_type') {
    const forvaltet = alle.filter(erForvaltet);
    const selvbetjent = alle.filter((r) => !erForvaltet(r));
    const f = tell(forvaltet, config.grunnlag, start, slutt, dager);
    const s = tell(selvbetjent, config.grunnlagSelvbetjent, start, slutt, dager);
    if (f.antall) {
      const pris = prisForAntall(config.trinn, f.antall);
      linjer.push({ type: 'forvaltet', beskrivelse: `${config.produktnavn} – forvaltede enheter`, antall: f.antall, vekt: Math.round(f.vekt * 100) / 100, pris, belop: Math.round(f.vekt * pris), enheter: f.enheter });
    }
    if (s.antall) {
      const pris = config.selvbetjentPris;
      linjer.push({ type: 'selvbetjent', beskrivelse: `${config.produktnavn} – selvbetjente enheter`, antall: s.antall, vekt: Math.round(s.vekt * 100) / 100, pris, belop: Math.round(s.vekt * pris), enheter: s.enheter });
    }
  } else {
    // Blandet (1a): én forvaltersats for alle enheter, ett grunnlag.
    const t = tell(alle, config.grunnlag, start, slutt, dager);
    const pris = prisForAntall(config.trinn, t.antall);
    if (t.antall) linjer.push({ type: 'alle', beskrivelse: config.produktnavn, antall: t.antall, vekt: Math.round(t.vekt * 100) / 100, pris, belop: Math.round(t.vekt * pris), enheter: t.enheter });
  }

  const antallEnheter = linjer.reduce((s, l) => s + l.antall, 0);
  const sumEksMva = linjer.reduce((s, l) => s + l.belop, 0);
  const mva = Math.round(sumEksMva * (config.mvaSats / 100));
  return {
    maaned,
    grunnlag: config.grunnlag,
    prisModell: config.prisModell,
    linjer,
    antallEnheter,
    sumEksMva,
    mva,
    mvaSats: config.mvaSats,
    sumInkMva: sumEksMva + mva,
    valuta: config.valuta,
    beregnet: new Date().toISOString(),
  };
}

export function forrigeMaaned(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-basert; forrige måned = m (siden getUTCMonth er 0-basert for inneværende)
  const dd = new Date(Date.UTC(y, m - 1, 1));
  return `${dd.getUTCFullYear()}-${String(dd.getUTCMonth() + 1).padStart(2, '0')}`;
}
