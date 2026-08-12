// ---------------------------------------------------------------------------
// Budsjett — årsbudsjett per kategori per måned, med automatisk
// budsjett-vs-faktisk fra Økonomi-modulen og «Foreslå fra porteføljen»
// (driver-basert seeding fra Leieforhold-oversikten).
//
// Dokument i `budgets` (ett per år):
//   { id, year, inntekter: {kategori: [12 tall]}, kostnader: {kategori: [12]},
//     notat, updatedAt, updatedBy }
//
// FAKTISK (beregnFaktisk) gjenbruker Økonomi-motorens logikk:
//   · Inntekt  = honorar-MRR per måned fra SIGNERTE leiekontrakter
//     (samme «faktisk»-definisjon som computeResultat/computeMrrHistory —
//     aldri estimert leie på forvaltningsavtaler).
//   · Kostnader = manuelle kostnader (finance_costs) per kategori, fordelt på
//     månedene de er aktive. Automatiske estimater (annonser/LLM/plattform)
//     inngår IKKE historisk — de finnes bare som nå-estimat i Økonomi.
// ---------------------------------------------------------------------------

import { v4 as uuidv4 } from 'uuid';
import {
  listCosts, listContracts, dedupeContracts,
  contractMonthlyFee, activeInMonth, monthlyCost,
  COST_CATEGORIES,
} from './finance';
import { beregnHonorar } from './leieforhold';

export const BUDSJETT_COLL = 'budgets';
export const INNTEKT_KATEGORIER = ['Honorar (forvaltning)', 'Oppstartshonorar', 'Annen inntekt'];
export const KOSTNAD_KATEGORIER = [...COST_CATEGORIES]; // Lønn, Husleie, Programvare/SaaS, Regnskap, API/LLM, Markedsføring, Annet

const r0 = (x) => Math.round(Number(x) || 0);
const tolv = () => Array(12).fill(0);

// Renser {kategori: [12 tall]} — kun kjente kategorier, alltid 12 heltall ≥ 0 i kr.
function rensSerier(obj, kategorier) {
  const ut = {};
  for (const k of kategorier) {
    const v = (obj && Array.isArray(obj[k])) ? obj[k] : [];
    ut[k] = Array.from({ length: 12 }, (_, i) => {
      const n = Number(v[i]);
      return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    });
  }
  return ut;
}

export function gyldigBudsjettAar(y) {
  const n = parseInt(y, 10);
  const naa = new Date().getFullYear();
  return Number.isFinite(n) && n >= naa - 3 && n <= naa + 4 ? n : null;
}

export async function hentBudsjett(db, year) {
  const doc = await db.collection(BUDSJETT_COLL).findOne({ year }, { projection: { _id: 0 } });
  return {
    year,
    inntekter: rensSerier(doc?.inntekter, INNTEKT_KATEGORIER),
    kostnader: rensSerier(doc?.kostnader, KOSTNAD_KATEGORIER),
    notat: String(doc?.notat || ''),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy || null,
    finnes: !!doc,
  };
}

export async function lagreBudsjett(db, { year, inntekter, kostnader, notat, updatedBy }) {
  const set = {
    year,
    inntekter: rensSerier(inntekter, INNTEKT_KATEGORIER),
    kostnader: rensSerier(kostnader, KOSTNAD_KATEGORIER),
    notat: String(notat || '').slice(0, 2000),
    updatedAt: new Date().toISOString(),
    updatedBy: String(updatedBy || '').slice(0, 120),
  };
  await db.collection(BUDSJETT_COLL).updateOne(
    { year },
    { $set: set, $setOnInsert: { id: uuidv4(), createdAt: new Date().toISOString() } },
    { upsert: true },
  );
  return set;
}

// ── FAKTISK per måned for et gitt år ────────────────────────────────────────
// Rekonstruert fra kontraktenes og kostnadenes datointervaller (samme metode
// som computeMrrHistory) — ingen fabrikerte tall. Fremtidige måneder = null.
export async function beregnFaktisk(db, year) {
  const [contractsRaa, costs] = await Promise.all([listContracts(db), listCosts(db)]);
  const contracts = dedupeContracts(contractsRaa);
  const fees = contracts
    .filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired')
    .map((c) => contractMonthlyFee(c))
    .filter((f) => f.amount > 0);

  const naa = new Date();
  const inneværendeYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();

  const honorar = Array(12).fill(null);
  const kostnaderPerKategori = {};
  for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k] = Array(12).fill(null);
  const kostnaderSum = Array(12).fill(null);

  for (let m = 0; m < 12; m++) {
    if (year * 12 + m > inneværendeYm) continue; // fremtid: ingen faktiske tall
    const d0 = new Date(Date.UTC(year, m, 1));
    const d1 = new Date(Date.UTC(year, m + 1, 0, 23, 59, 59));
    const mStart = d0.getTime(), mEnd = d1.getTime();

    // Honorar: kun signerte leiekontrakter («faktisk»-nivået) aktive i måneden.
    let inn = 0;
    for (const f of fees) {
      if (f.confidence !== 'faktisk') continue;
      if (!activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) continue;
      inn += f.amount;
    }
    honorar[m] = r0(inn);

    let sum = 0;
    for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k][m] = 0;
    for (const c of costs) {
      if (!activeInMonth(c.startDate, c.endDate, mStart, mEnd)) continue;
      const b = monthlyCost(c);
      const kat = KOSTNAD_KATEGORIER.includes(c.category) ? c.category : 'Annet';
      kostnaderPerKategori[kat][m] = r0(kostnaderPerKategori[kat][m] + b);
      sum += b;
    }
    kostnaderSum[m] = r0(sum);
  }

  return { honorar, kostnaderPerKategori, kostnaderSum };
}

// ── «Foreslå fra porteføljen» — driver-basert seeding ───────────────────────
// Inntektssiden bygges fra Leieforhold-radene (dagens portefølje):
//   · Utleide enheter    → honoraret ligger inne alle 12 måneder
//   · Under signering /
//     fremtidig          → honoraret fases inn fra innflyttingsmåneden
//   · Ledige enheter     → fylles med `fyllLedigPerMnd` per måned (kumulativt,
//                          aldri flere enn antall ledige), snitthonorar fra
//                          de ledige radene
//   · Vekst              → `nyeEnheterPerMnd` nye enheter per måned
//                          (kumulativt) à snittleie × honorar-% (eks. mva)
//   · Oppstartshonorar   → engangsbeløp per NY enhet (utfylt + vekst) den
//                          måneden den kommer inn
// Kostnadssiden seedes fra dagens løpende kostnader (finance_costs).
export function lagForslag({ rows = [], costs = [], year, drivere = {} }) {
  const naa = new Date();
  const startMnd = year > naa.getUTCFullYear() ? 0
    : year < naa.getUTCFullYear() ? 0
    : naa.getUTCMonth(); // inneværende år: vekstantakelser starter fra denne måneden

  const leased = rows.filter((r) => r.group === 'leased');
  const pipeline = rows.filter((r) => r.group === 'future' || r.group === 'signing');
  const vacant = rows.filter((r) => r.group === 'vacant');

  // Standarddrivere avledet fra porteføljen selv.
  const leierMedTall = rows.filter((r) => (r.monthly_rent || 0) > 0);
  const snittLeieStd = leierMedTall.length ? r0(leierMedTall.reduce((s, r) => s + r.monthly_rent, 0) / leierMedTall.length) : 15000;
  const pctMedTall = rows.filter((r) => (r.fee_percent || 0) > 0);
  const honorarPctStd = pctMedTall.length ? Math.round((pctMedTall.reduce((s, r) => s + r.fee_percent, 0) / pctMedTall.length) * 10) / 10 : 10;

  // Driverparsing: null/tom = standardverdi; støtter norsk komma-desimal.
  const driver = (v, std, { min = 0, kravPositiv = false } = {}) => {
    if (v === null || v === undefined || v === '') return std;
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) return std;
    if (kravPositiv && n <= 0) return std;
    return Math.max(min, n);
  };
  const d = {
    nyeEnheterPerMnd: driver(drivere.nyeEnheterPerMnd, 1),
    fyllLedigPerMnd: driver(drivere.fyllLedigPerMnd, 1),
    snittLeie: r0(driver(drivere.snittLeie, snittLeieStd, { kravPositiv: true })),
    honorarPct: driver(drivere.honorarPct, honorarPctStd, { kravPositiv: true }),
    oppstartPerEnhet: r0(driver(drivere.oppstartPerEnhet, 0)),
  };

  // Honorar (eks. mva) for en «gjennomsnittsenhet» — privatantakelse (inkl. mva-sats).
  const honorarNyEnhet = beregnHonorar({ monthly_rent: d.snittLeie, fee_percent: d.honorarPct, vat_inclusive: true }).fee_amount;

  // Snitthonorar for de ledige enhetene (bruker deres egne tall der de finnes).
  const vacantHonorar = vacant.map((r) => (r.monthly_rent > 0 && r.fee_percent > 0)
    ? beregnHonorar({ monthly_rent: r.monthly_rent, fee_percent: r.fee_percent, vat_inclusive: r.vat_inclusive !== false }).fee_amount
    : honorarNyEnhet);
  const snittHonorarLedig = vacantHonorar.length ? r0(vacantHonorar.reduce((s, x) => s + x, 0) / vacantHonorar.length) : honorarNyEnhet;

  const baseline = r0(leased.reduce((s, r) => s + (r.fee_amount || 0), 0));

  const honorarSerie = tolv();
  const oppstartSerie = tolv();
  for (let m = 0; m < 12; m++) {
    let sum = baseline;

    // Pipeline fases inn fra innflyttingsmåneden (kjente datoer fra plattformen).
    for (const r of pipeline) {
      const flytt = r.move_in_date ? new Date(`${r.move_in_date}T12:00:00Z`) : null;
      const fraYm = flytt && !isNaN(flytt) ? flytt.getUTCFullYear() * 12 + flytt.getUTCMonth() : year * 12 + startMnd;
      if (year * 12 + m >= fraYm) sum += (r.fee_amount || 0);
    }

    // Utfylling av ledige + vekst — kumulativt fra startMnd.
    const mndSiden = m - startMnd + 1; // 1 i første driver-måned
    if (mndSiden > 0) {
      const utfylt = Math.min(vacant.length, d.fyllLedigPerMnd * mndSiden);
      sum += utfylt * snittHonorarLedig;
      const nye = d.nyeEnheterPerMnd * mndSiden;
      sum += nye * honorarNyEnhet;

      // Oppstartshonorar: kun de enhetene som kom inn DENNE måneden.
      const utfyltForrige = Math.min(vacant.length, d.fyllLedigPerMnd * (mndSiden - 1));
      const nyeDenne = (utfylt - utfyltForrige) + d.nyeEnheterPerMnd;
      oppstartSerie[m] = r0(nyeDenne * d.oppstartPerEnhet);
    }
    honorarSerie[m] = r0(sum);
  }

  // Kostnader: dagens løpende kostnader fordelt på månedene de er aktive.
  const kostnader = {};
  for (const k of KOSTNAD_KATEGORIER) kostnader[k] = tolv();
  for (const c of costs) {
    const kat = KOSTNAD_KATEGORIER.includes(c.category) ? c.category : 'Annet';
    for (let m = 0; m < 12; m++) {
      const d0 = Date.UTC(year, m, 1);
      const d1 = Date.UTC(year, m + 1, 0, 23, 59, 59);
      if (activeInMonth(c.startDate, c.endDate, d0, d1)) kostnader[kat][m] = r0(kostnader[kat][m] + monthlyCost(c));
    }
  }

  return {
    inntekter: {
      'Honorar (forvaltning)': honorarSerie,
      'Oppstartshonorar': oppstartSerie,
      'Annen inntekt': tolv(),
    },
    kostnader,
    drivere: d,
    grunnlag: {
      utleide: leased.length, pipeline: pipeline.length, ledige: vacant.length,
      baselineHonorar: baseline, snittHonorarLedig, honorarNyEnhet,
    },
  };
}
