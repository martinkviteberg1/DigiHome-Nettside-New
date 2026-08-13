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
  COST_CATEGORIES, getFinanceSettings, autoCosts,
} from './finance';
import { beregnHonorar } from './leieforhold';

export const BUDSJETT_COLL = 'budgets';
export const SNAPSHOT_COLL = 'budsjett_faktisk'; // fryste månedstall (én per år-måned)
export const INNTEKT_KATEGORIER = ['Honorar (forvaltning)', 'Oppstartshonorar', 'Annen inntekt'];
export const KOSTNAD_KATEGORIER = [...COST_CATEGORIES]; // Lønn, Husleie, Programvare/SaaS, Regnskap, API/LLM, Markedsføring, Annet
export const FREKVENSER = ['engangs', 'manedlig', 'kvartalsvis', 'arlig'];

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

// Egne poster: brukerdefinerte budsjettlinjer ([]-felt i årsdokumentet).
//   { id, type: 'inn'|'kost', navn, frekvens (metadata for visning),
//     mapTil: Økonomi-kategori eller null (avviket telles da mot den raden),
//     verdier: [12 heltall ≥ 0] }
// Maks 30 per år; ukjente mapTil-verdier og tomme navn forkastes trygt.
function rensEgnePoster(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, 30).map((p) => {
    const type = p?.type === 'inn' ? 'inn' : 'kost';
    const gyldigMap = type === 'inn' ? INNTEKT_KATEGORIER : KOSTNAD_KATEGORIER;
    return {
      id: (p && typeof p.id === 'string' && p.id) ? String(p.id).slice(0, 40) : uuidv4(),
      type,
      navn: String(p?.navn || '').trim().slice(0, 60),
      frekvens: FREKVENSER.includes(p?.frekvens) ? p.frekvens : 'manedlig',
      mapTil: gyldigMap.includes(p?.mapTil) ? p.mapTil : null,
      verdier: Array.from({ length: 12 }, (_, i) => {
        const n = Number(p?.verdier?.[i]);
        return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
      }),
    };
  }).filter((p) => p.navn);
}

// Månedskommentarer: {'0'..'11': tekst} — forklarer avvik («Doblet annonse-
// budsjett pga. Q1-kampanje»). Vises i rutenettet og som notes i Excel.
function rensKommentarer(obj) {
  const ut = {};
  if (obj && typeof obj === 'object') {
    for (let m = 0; m < 12; m++) {
      const t = String(obj[m] ?? obj[String(m)] ?? '').trim().slice(0, 500);
      if (t) ut[String(m)] = t;
    }
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
    egnePoster: rensEgnePoster(doc?.egnePoster),
    kommentarer: rensKommentarer(doc?.kommentarer),
    notat: String(doc?.notat || ''),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy || null,
    finnes: !!doc,
  };
}

export async function lagreBudsjett(db, { year, inntekter, kostnader, egnePoster, kommentarer, notat, updatedBy }) {
  const set = {
    year,
    inntekter: rensSerier(inntekter, INNTEKT_KATEGORIER),
    kostnader: rensSerier(kostnader, KOSTNAD_KATEGORIER),
    egnePoster: rensEgnePoster(egnePoster),
    kommentarer: rensKommentarer(kommentarer),
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
// AVSLUTTEDE måneder leses fra fryste snapshots (budsjett_faktisk) når de
// finnes — de inkluderer også automatiske kostnader (annonser/LLM/plattform)
// fanget ved månedsslutt. Måneder uten snapshot rekonstrueres live fra
// kontraktenes/kostnadenes datointervaller (samme metode som computeMrrHistory).
// Fremtidige måneder = null. snapshotMnd[m] = true der tallet er fryst.

async function hentFeesOgKostnader(db) {
  const [contractsRaa, costs] = await Promise.all([listContracts(db), listCosts(db)]);
  const contracts = dedupeContracts(contractsRaa);
  const fees = contracts
    .filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired')
    .map((c) => contractMonthlyFee(c))
    .filter((f) => f.amount > 0);
  return { fees, costs };
}

// Live-beregning for ÉN måned: honorar (kun signerte leiekontrakter) +
// manuelle kostnader per kategori.
function faktiskForMnd(fees, costs, year, m) {
  const mStart = Date.UTC(year, m, 1);
  const mEnd = Date.UTC(year, m + 1, 0, 23, 59, 59);
  let honorar = 0;
  for (const f of fees) {
    if (f.confidence !== 'faktisk') continue;
    if (!activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) continue;
    honorar += f.amount;
  }
  const kostnaderPerKategori = {};
  for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k] = 0;
  let sum = 0;
  for (const c of costs) {
    if (!activeInMonth(c.startDate, c.endDate, mStart, mEnd)) continue;
    const b = monthlyCost(c);
    const kat = KOSTNAD_KATEGORIER.includes(c.category) ? c.category : 'Annet';
    kostnaderPerKategori[kat] = r0(kostnaderPerKategori[kat] + b);
    sum += b;
  }
  return { honorar: r0(honorar), kostnaderPerKategori, kostnaderSum: r0(sum) };
}

export async function beregnFaktisk(db, year) {
  const { fees, costs } = await hentFeesOgKostnader(db);
  let snapshots = [];
  try { snapshots = await db.collection(SNAPSHOT_COLL).find({ year }, { projection: { _id: 0 } }).toArray(); } catch (e) {}
  const snapMap = new Map(snapshots.map((s) => [s.month, s]));

  const naa = new Date();
  const inneværendeYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();

  const honorar = Array(12).fill(null);
  const kostnaderPerKategori = {};
  for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k] = Array(12).fill(null);
  const kostnaderSum = Array(12).fill(null);
  const snapshotMnd = Array(12).fill(false);

  for (let m = 0; m < 12; m++) {
    if (year * 12 + m > inneværendeYm) continue; // fremtid: ingen faktiske tall
    const snap = snapMap.get(m);
    if (snap && snap.honorar != null) {
      honorar[m] = r0(snap.honorar);
      for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k][m] = r0(snap.kostnaderPerKategori?.[k] || 0);
      kostnaderSum[m] = r0(snap.kostnaderSum || 0);
      snapshotMnd[m] = true;
    } else {
      const f = faktiskForMnd(fees, costs, year, m);
      honorar[m] = f.honorar;
      for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k][m] = f.kostnaderPerKategori[k];
      kostnaderSum[m] = f.kostnaderSum;
    }
  }

  return { honorar, kostnaderPerKategori, kostnaderSum, snapshotMnd };
}

// ── Snapshots: frys faktiske tall ved månedsslutt ───────────────────────────
// Kjøres via dagscronen (idempotent — fanger kun måneder som mangler).
// Den SIST avsluttede måneden får i tillegg automatiske kostnader (annonse-
// forbruk, LLM/eksterne tjenester, plattform-CRM) fra Økonomi-motorens
// 30-dagers måling — eldre måneder kan ikke måles i etterkant og fryses
// med manuelle kostnader alene (dokumentert i doc.auto).
export async function fangFaktiskEtterslep(db) {
  const naa = new Date();
  const inneværendeYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();
  const sistAvsluttet = inneværendeYm - 1;
  const fraYm = (naa.getUTCFullYear() - 1) * 12; // fanger inntil 12–23 mnd bakover
  const { fees, costs } = await hentFeesOgKostnader(db);

  let auto = null;
  try {
    const settings = await getFinanceSettings(db);
    auto = await autoCosts(db, settings);
  } catch (e) { auto = null; }

  const fanget = [];
  for (let ym = fraYm; ym <= sistAvsluttet; ym++) {
    const year = Math.floor(ym / 12), month = ym % 12;
    const finnes = await db.collection(SNAPSHOT_COLL).findOne({ year, month }, { projection: { _id: 1 } });
    if (finnes) continue;
    const f = faktiskForMnd(fees, costs, year, month);
    let autoBrukt = null;
    if (ym === sistAvsluttet && auto) {
      // Auto-kostnader mappes til budsjettkategoriene (plattform → Programvare/SaaS).
      const leggTil = (kat, belop) => { if (belop > 0) { f.kostnaderPerKategori[kat] = r0((f.kostnaderPerKategori[kat] || 0) + belop); f.kostnaderSum = r0(f.kostnaderSum + belop); } };
      leggTil('Markedsføring', auto.adSpendMonthly || 0);
      leggTil('API/LLM', (auto.llmMonthly || 0) + (auto.extMonthly || 0));
      leggTil('Programvare/SaaS', auto.platformMonthly || 0);
      autoBrukt = { adSpendMonthly: auto.adSpendMonthly || 0, llmMonthly: auto.llmMonthly || 0, extMonthly: auto.extMonthly || 0, platformMonthly: auto.platformMonthly || 0 };
    }
    await db.collection(SNAPSHOT_COLL).updateOne(
      { year, month },
      { $set: { year, month, ...f, auto: autoBrukt, capturedAt: new Date().toISOString() }, $setOnInsert: { id: uuidv4() } },
      { upsert: true },
    );
    fanget.push(`${year}-${String(month + 1).padStart(2, '0')}`);
  }
  return { fanget, antall: fanget.length };
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
export function lagForslag({ rows = [], costs = [], year, drivere = {}, antallMnd = 12 }) {
  const N = antallMnd === 24 ? 24 : 12;
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

  const honorarSerie = Array(N).fill(0);
  const oppstartSerie = Array(N).fill(0);
  for (let m = 0; m < N; m++) {
    const gjeldendeYm = (year + Math.floor(m / 12)) * 12 + (m % 12);
    let sum = baseline;

    // Pipeline fases inn fra innflyttingsmåneden (kjente datoer fra plattformen).
    for (const r of pipeline) {
      const flytt = r.move_in_date ? new Date(`${r.move_in_date}T12:00:00Z`) : null;
      const fraYm = flytt && !isNaN(flytt) ? flytt.getUTCFullYear() * 12 + flytt.getUTCMonth() : year * 12 + startMnd;
      if (gjeldendeYm >= fraYm) sum += (r.fee_amount || 0);
    }

    // Utfylling av ledige + vekst — kumulativt fra startMnd (fortsetter over årsgrensen).
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
  const kostnaderNeste = {};
  for (const k of KOSTNAD_KATEGORIER) { kostnader[k] = tolv(); kostnaderNeste[k] = tolv(); }
  for (const c of costs) {
    const kat = KOSTNAD_KATEGORIER.includes(c.category) ? c.category : 'Annet';
    for (let m = 0; m < N; m++) {
      const y = year + Math.floor(m / 12), mm = m % 12;
      const d0 = Date.UTC(y, mm, 1);
      const d1 = Date.UTC(y, mm + 1, 0, 23, 59, 59);
      if (!activeInMonth(c.startDate, c.endDate, d0, d1)) continue;
      const mål = m < 12 ? kostnader : kostnaderNeste;
      mål[kat][mm] = r0(mål[kat][mm] + monthlyCost(c));
    }
  }

  const ut = {
    inntekter: {
      'Honorar (forvaltning)': honorarSerie.slice(0, 12),
      'Oppstartshonorar': oppstartSerie.slice(0, 12),
      'Annen inntekt': tolv(),
    },
    kostnader,
    drivere: d,
    grunnlag: {
      utleide: leased.length, pipeline: pipeline.length, ledige: vacant.length,
      baselineHonorar: baseline, snittHonorarLedig, honorarNyEnhet,
    },
  };
  if (N === 24) {
    ut.neste = {
      year: year + 1,
      inntekter: {
        'Honorar (forvaltning)': honorarSerie.slice(12),
        'Oppstartshonorar': oppstartSerie.slice(12),
        'Annen inntekt': tolv(),
      },
      kostnader: kostnaderNeste,
    };
  }
  return ut;
}
