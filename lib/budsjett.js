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
import { rensModellDrivere, rensModellFakta, rensScenarioer, beregnInvestorModell } from './budsjett-modell';
import {
  listCosts, listActiveCosts, listContracts, dedupeContracts,
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

// Årsoversikt: alle budsjettår med status og nøkkelsummer (inkl. egne poster)
// — driver den intuitive årsvelgeren i modulen og wizardens «finnes»-varsel.
export async function listBudsjettAar(db) {
  const docs = await db.collection(BUDSJETT_COLL)
    .find({}, { projection: { _id: 0, year: 1, inntekter: 1, kostnader: 1, egnePoster: 1, honorarLaas: 1, updatedAt: 1, updatedBy: 1 } })
    .sort({ year: 1 })
    .toArray();
  const sumObj = (obj) => Object.values(obj || {}).reduce(
    (s, arr) => s + (Array.isArray(arr) ? arr.reduce((a, x) => a + (Number(x) || 0), 0) : 0), 0,
  );
  return docs.filter((d) => Number.isFinite(d.year)).map((d) => {
    let inn = sumObj(d.inntekter);
    let kost = sumObj(d.kostnader);
    for (const p of (Array.isArray(d.egnePoster) ? d.egnePoster : [])) {
      const s = (p?.verdier || []).reduce((a, x) => a + (Number(x) || 0), 0);
      if (p?.type === 'inn') inn += s; else kost += s;
    }
    return {
      year: d.year,
      inntekter: Math.round(inn),
      kostnader: Math.round(kost),
      resultat: Math.round(inn - kost),
      laast: !!(d.honorarLaas && d.honorarLaas.laastAt),
      laastAt: (d.honorarLaas && d.honorarLaas.laastAt) || null,
      updatedAt: d.updatedAt || null,
      updatedBy: d.updatedBy || null,
    };
  });
}

export async function hentBudsjett(db, year) {
  const doc = await db.collection(BUDSJETT_COLL).findOne({ year }, { projection: { _id: 0 } });
  return {
    year,
    inntekter: rensSerier(doc?.inntekter, INNTEKT_KATEGORIER),
    kostnader: rensSerier(doc?.kostnader, KOSTNAD_KATEGORIER),
    egnePoster: rensEgnePoster(doc?.egnePoster),
    kommentarer: rensKommentarer(doc?.kommentarer),
    antakelser: rensAntakelser(doc?.antakelser),
    honorarLaas: rensLaas(doc?.honorarLaas),
    notat: String(doc?.notat || ''),
    updatedAt: doc?.updatedAt || null,
    updatedBy: doc?.updatedBy || null,
    finnes: !!doc,
  };
}

export async function lagreBudsjett(db, { year, inntekter, kostnader, egnePoster, kommentarer, notat, updatedBy, antakelser, honorarLaas }) {
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
  // Inntektsmodellen (modell B): antakelser + låst sikret/vekst-serie lagres
  // kun når de sendes eksplisitt — vanlige lagringer rører dem ikke.
  if (antakelser !== undefined) set.antakelser = rensAntakelser(antakelser);
  if (honorarLaas !== undefined) set.honorarLaas = rensLaas(honorarLaas);
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
  const [contractsRaa, costs] = await Promise.all([listContracts(db), listActiveCosts(db)]);
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

// ═══ INNTEKTSMODELL (modell B): Sikret (auto fra plattformen) + Antakelser ═══
//
// Erstatter «Foreslå fra porteføljen» på inntektssiden. Budsjettets honorar-
// rad = SIKRET (kontraktsfestet: utleide + signerte, faset inn/ut på faktiske
// datoer) + VEKST (antakelser: nye enheter, utfylling av ledige, churn).
//
// Ved «Lås inntektsbudsjett» fryses seriene inn i årsdokumentet
// (`honorarLaas`) og speiles inn i de klassiske inntektsradene — dermed
// fungerer avvik, KPI-er og Excel uendret. «Sikret nå» beregnes alltid live
// som referanse, slik at drift mot antakelsene er synlig.

export function rensAntakelser(a) {
  const num = (v, maks) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(String(v).replace(',', '.'));
    if (!Number.isFinite(n)) return null;
    return Math.min(maks, Math.max(0, n));
  };
  return {
    nyeEnheterPerMnd: num(a?.nyeEnheterPerMnd, 100) ?? 0,
    churnPctAar: num(a?.churnPctAar, 100) ?? 0, // ukjent frafall — % av porteføljen per år
    fyllLedigPerMnd: num(a?.fyllLedigPerMnd, 100) ?? 0,
    snittLeie: num(a?.snittLeie, 1e6), // null → avledes av porteføljen
    honorarPct: num(a?.honorarPct, 100), // null → avledes (inkl. mva-sats, privat)
    oppstartPerEnhet: num(a?.oppstartPerEnhet, 1e6) ?? 0,
  };
}

export function rensLaas(l) {
  if (!l || !Array.isArray(l.sikret)) return null;
  const pos = (arr) => Array.from({ length: 12 }, (_, i) => r0(arr?.[i]));
  const hel = (arr) => Array.from({ length: 12 }, (_, i) => Math.round(Number(arr?.[i]) || 0)); // vekst kan være negativ (churn > vekst)
  return {
    sikret: pos(l.sikret),
    vekst: hel(l.vekst),
    oppstart: pos(l.oppstart),
    laastAt: l.laastAt || null,
    laastAv: String(l.laastAv || '').slice(0, 120),
  };
}

// Kontraktsfestet honorar per måned: utleide (alltid inne), signerte/frem-
// tidige fra innflyttingsmåneden, og kjente utflyttinger telles t.o.m.
// utflyttingsmåneden. Pipeline uten dato regnes fra inneværende måned.
// Enheter med signert leiekontrakt men uten registrert forvaltningsavtale
// estimeres med porteføljens snittsats (konsistent med honorar-trappen).
export function beregnSikretSerie(rows = [], year, antallMnd = 12) {
  const naa = new Date();
  const naaYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();
  // Snittsats fra utleide enheter som faktisk bærer honorar
  const medFee = rows.filter((r) => r.group === 'leased' && r.fee_amount > 0 && r.monthly_rent > 0);
  const leieMedFee = medFee.reduce((s, r) => s + r.monthly_rent, 0);
  const snittSats = leieMedFee > 0 ? medFee.reduce((s, r) => s + r.fee_amount, 0) / leieMedFee : 0;
  const serie = Array(antallMnd).fill(0);
  for (const r of rows) {
    if (!['leased', 'future', 'signing'].includes(r.group)) continue;
    const honorar = r.fee_amount > 0 ? r.fee_amount
      : r.pending_fee_fixed > 0 ? Math.round(r.pending_fee_fixed)
      : r.pending_fee_percent > 0 ? Math.round((r.monthly_rent || 0) * (r.pending_fee_percent / 100))
      : Math.round((r.monthly_rent || 0) * snittSats);
    if (!(honorar > 0)) continue;
    const inn = r.move_in_date ? new Date(`${r.move_in_date}T12:00:00Z`) : null;
    const ut = r.move_out_date ? new Date(`${r.move_out_date}T12:00:00Z`) : null;
    const fraYm = inn && !isNaN(inn)
      ? inn.getUTCFullYear() * 12 + inn.getUTCMonth()
      : (r.group === 'leased' ? -Infinity : naaYm);
    const tilYm = ut && !isNaN(ut) ? ut.getUTCFullYear() * 12 + ut.getUTCMonth() : Infinity;
    for (let m = 0; m < antallMnd; m++) {
      const ym = (year + Math.floor(m / 12)) * 12 + (m % 12);
      if (ym >= fraYm && ym <= tilYm) serie[m] += honorar;
    }
  }
  return serie.map(r0);
}

// BORTFALL per måned: honorar fra kontrakter med KJENT utflyttingsdato, lagt
// i måneden ETTER siste kontraktsmåned (sikret-serien teller t.o.m. utflytt-
// ingsmåneden). Serien er punktvis (hendelser) og brukes av investormodellens
// re-utleie-lag: boligen forvaltes videre etter kontraktslutt, så honoraret
// antas gjenopptatt etter et justerbart ledighetsgap — kun huseier-frafall er
// reell churn (dekkes av churn-driveren).
export function beregnBortfallSerie(rows = [], year, antallMnd = 12) {
  const medFee = rows.filter((r) => r.group === 'leased' && r.fee_amount > 0 && r.monthly_rent > 0);
  const leieMedFee = medFee.reduce((s, r) => s + r.monthly_rent, 0);
  const snittSats = leieMedFee > 0 ? medFee.reduce((s, r) => s + r.fee_amount, 0) / leieMedFee : 0;
  const serie = Array(antallMnd).fill(0);
  for (const r of rows) {
    if (!['leased', 'future', 'signing'].includes(r.group)) continue;
    const ut = r.move_out_date ? new Date(`${r.move_out_date}T12:00:00Z`) : null;
    if (!ut || isNaN(ut)) continue;
    const honorar = r.fee_amount > 0 ? r.fee_amount
      : r.pending_fee_fixed > 0 ? Math.round(r.pending_fee_fixed)
      : r.pending_fee_percent > 0 ? Math.round((r.monthly_rent || 0) * (r.pending_fee_percent / 100))
      : Math.round((r.monthly_rent || 0) * snittSats);
    if (!(honorar > 0)) continue;
    // Bortfallet skjer måneden ETTER utflyttingsmåneden
    const bortYm = ut.getUTCFullYear() * 12 + ut.getUTCMonth() + 1;
    const idx = bortYm - year * 12;
    if (idx >= 0 && idx < antallMnd) serie[idx] += honorar;
  }
  return serie.map(r0);
}

// Enheter UNDER FORVALTNING per måned: utleide og ledige teller hele veien
// (ledige enheter forvaltes selv om de står tomme), signerte/fremtidige fra
// innflyttingsmåneden, kjente utflyttinger t.o.m. utflyttingsmåneden.
// NB: leiekontraktens slutt churner IKKE forvaltningskunden.
export function beregnEnhetsSerie(rows = [], year, antallMnd = 12) {
  const naa = new Date();
  const naaYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();
  const serie = Array(antallMnd).fill(0);
  for (const r of rows) {
    if (!['leased', 'future', 'signing', 'vacant'].includes(r.group)) continue;
    const inn = r.move_in_date ? new Date(`${r.move_in_date}T12:00:00Z`) : null;
    const ut = r.move_out_date ? new Date(`${r.move_out_date}T12:00:00Z`) : null;
    const fraYm = (r.group === 'leased' || r.group === 'vacant') ? -Infinity
      : inn && !isNaN(inn) ? inn.getUTCFullYear() * 12 + inn.getUTCMonth() : naaYm;
    const tilYm = ut && !isNaN(ut) ? ut.getUTCFullYear() * 12 + ut.getUTCMonth() : Infinity;
    for (let m = 0; m < antallMnd; m++) {
      const ym = (year + Math.floor(m / 12)) * 12 + (m % 12);
      if (ym >= fraYm && ym <= tilYm) serie[m] += 1;
    }
  }
  return serie;
}

// Budsjettert inntekt = sikret + vekst − churn. Vekstantakelsene starter fra
// inneværende måned (inneværende år) eller januar (fremtidig år); fortid får
// ingen vekstantakelser. Churn er lineær: etter k måneder er ~årsPct·k/12 av
// det løpende honoraret (sikret + vekst) borte — dekker UKJENT frafall
// (kjente utflyttinger ligger allerede i sikret-laget).
export function beregnInntektsmodell({ rows = [], year, antakelser = {}, antallMnd = 12 }) {
  const a = rensAntakelser(antakelser);
  const naa = new Date();
  const iAar = naa.getUTCFullYear();
  const startMnd = year > iAar ? 0 : year < iAar ? 12 : naa.getUTCMonth();
  const sikret = beregnSikretSerie(rows, year, antallMnd);

  const leierMedTall = rows.filter((r) => (r.monthly_rent || 0) > 0);
  const snittLeieStd = leierMedTall.length ? r0(leierMedTall.reduce((s, r) => s + r.monthly_rent, 0) / leierMedTall.length) : 15000;
  const pctMedTall = rows.filter((r) => (r.fee_percent || 0) > 0);
  const honorarPctStd = pctMedTall.length ? Math.round((pctMedTall.reduce((s, r) => s + r.fee_percent, 0) / pctMedTall.length) * 10) / 10 : 10;
  const snittLeie = r0(a.snittLeie ?? snittLeieStd);
  const honorarPct = a.honorarPct ?? honorarPctStd;
  const honorarNyEnhet = beregnHonorar({ monthly_rent: snittLeie, fee_percent: honorarPct, vat_inclusive: true }).fee_amount;

  const vacant = rows.filter((r) => r.group === 'vacant');
  const vacantHonorar = vacant.map((r) => (r.monthly_rent > 0 && r.fee_percent > 0)
    ? beregnHonorar({ monthly_rent: r.monthly_rent, fee_percent: r.fee_percent, vat_inclusive: r.vat_inclusive !== false }).fee_amount
    : honorarNyEnhet);
  const snittHonorarLedig = vacantHonorar.length ? r0(vacantHonorar.reduce((s, x) => s + x, 0) / vacantHonorar.length) : honorarNyEnhet;

  const vekst = Array(antallMnd).fill(0);
  const oppstart = Array(antallMnd).fill(0);
  const total = Array(antallMnd).fill(0);
  for (let m = 0; m < antallMnd; m++) {
    const mndSiden = m - startMnd + 1;
    let v = 0;
    if (mndSiden > 0) {
      const utfylt = Math.min(vacant.length, a.fyllLedigPerMnd * mndSiden);
      v += utfylt * snittHonorarLedig;
      v += a.nyeEnheterPerMnd * mndSiden * honorarNyEnhet;
      const utfyltForrige = Math.min(vacant.length, a.fyllLedigPerMnd * (mndSiden - 1));
      const nyeDenne = (utfylt - utfyltForrige) + a.nyeEnheterPerMnd;
      oppstart[m] = r0(nyeDenne * a.oppstartPerEnhet);
      v -= (sikret[m] + v) * (a.churnPctAar / 100) * (mndSiden / 12);
    }
    vekst[m] = Math.round(v);
    total[m] = Math.max(0, r0(sikret[m] + vekst[m]));
  }
  return {
    sikret, vekst, oppstart, total,
    drivereBrukt: { ...a, snittLeie, honorarPct, honorarNyEnhet, snittHonorarLedig },
  };
}

// ═══ FRITTSTÅENDE BUDSJETTER («planer») ═════════════════════════════════════
//
// Et budsjett trenger ikke følge kalenderåret: en PLAN har navn, fri periode
// (startYm 'YYYY-MM' + antallMnd 3–24) og status ('utkast'|'vedtatt'). Flere
// planer kan dekke samme periode (konservativt/moderat/aggressivt) — kun én
// kan være vedtatt per identiske periode.
//
// Planene bor i SAMME samling (budgets) med plan: true — ÉN kilde, ingen nye
// registre. Kalenderårsdokumentene (year-feltet) er fortsatt ryggraden for
// avvik per år, investor-NTM og Excel; listBudsjettAar filtrerer planene bort
// (Number.isFinite(d.year)-sjekken), så all eksisterende flyt er urørt.
//
//   { id, plan: true, navn, startYm, antallMnd, status, inntekter: {kat:[N]},
//     kostnader: {kat:[N]}, notat, createdAt, updatedAt, updatedBy }

export const PLAN_STATUSER = ['utkast', 'vedtatt'];
export const gyldigYm = (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(String(v || '')) ? String(v) : null);
const ymDeler = (ym) => { const [y, m] = String(ym).split('-').map(Number); return { y, m0: m - 1 }; };
export const ymPluss = (ym, i) => {
  const { y, m0 } = ymDeler(ym);
  const t = y * 12 + m0 + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

function rensSerierN(obj, kategorier, N) {
  const ut = {};
  for (const k of kategorier) {
    const v = (obj && Array.isArray(obj[k])) ? obj[k] : [];
    ut[k] = Array.from({ length: N }, (_, i) => {
      const n = Number(v[i]);
      return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
    });
  }
  return ut;
}

const planSum = (obj) => Object.values(obj || {}).reduce(
  (s, arr) => s + (Array.isArray(arr) ? arr.reduce((a, x) => a + (Number(x) || 0), 0) : 0), 0,
);

export async function listPlaner(db, { kunInvestorSynlige = false } = {}) {
  const filter = kunInvestorSynlige ? { plan: true, investorSynlig: true } : { plan: true };
  const docs = await db.collection(BUDSJETT_COLL)
    .find(filter, { projection: { _id: 0, id: 1, navn: 1, startYm: 1, antallMnd: 1, status: 1, type: 1, modellSammendrag: 1, inntekter: 1, kostnader: 1, investorSynlig: 1, updatedAt: 1, updatedBy: 1 } })
    .sort({ startYm: -1, navn: 1 })
    .toArray();
  return docs.map((d) => ({
    id: d.id,
    navn: d.navn,
    startYm: d.startYm,
    antallMnd: d.antallMnd,
    sluttYm: ymPluss(d.startYm, (d.antallMnd || 12) - 1),
    status: PLAN_STATUSER.includes(d.status) ? d.status : 'utkast',
    investorSynlig: Boolean(d.investorSynlig),
    type: d.type === 'modell' ? 'modell' : 'enkel',
    inntekter: d.type === 'modell' ? r0(d.modellSammendrag?.sumInntekt) : r0(planSum(d.inntekter)),
    kostnader: d.type === 'modell' ? r0(d.modellSammendrag?.sumKost) : r0(planSum(d.kostnader)),
    resultat: d.type === 'modell' ? r0(d.modellSammendrag?.resultat) : r0(planSum(d.inntekter) - planSum(d.kostnader)),
    updatedAt: d.updatedAt || null,
    updatedBy: d.updatedBy || null,
  }));
}

export async function hentPlan(db, id) {
  const doc = await db.collection(BUDSJETT_COLL).findOne({ plan: true, id: String(id || '') }, { projection: { _id: 0 } });
  if (!doc) return null;
  const N = Math.min(36, Math.max(1, Math.round(doc.antallMnd) || 12));
  return {
    id: doc.id,
    navn: String(doc.navn || 'Budsjett'),
    startYm: doc.startYm,
    antallMnd: N,
    sluttYm: ymPluss(doc.startYm, N - 1),
    status: PLAN_STATUSER.includes(doc.status) ? doc.status : 'utkast',
    investorSynlig: Boolean(doc.investorSynlig),
    type: doc.type === 'modell' ? 'modell' : 'enkel',
    ...(doc.type === 'modell' ? {
      drivere: rensModellDrivere(doc.drivere),
      fakta: rensModellFakta(doc.fakta, N),
      scenarioer: rensScenarioer(doc.scenarioer),
    } : {}),
    inntekter: rensSerierN(doc.inntekter, INNTEKT_KATEGORIER, N),
    kostnader: rensSerierN(doc.kostnader, KOSTNAD_KATEGORIER, N),
    notat: String(doc.notat || ''),
    createdAt: doc.createdAt || null,
    updatedAt: doc.updatedAt || null,
    updatedBy: doc.updatedBy || null,
  };
}

export async function lagrePlan(db, body = {}) {
  const navn = String(body.navn || '').trim().slice(0, 80);
  const startYm = gyldigYm(body.startYm);
  const antallMnd = Math.round(Number(body.antallMnd));
  if (!navn) return { ok: false, error: 'Planen trenger et navn', status: 400 };
  if (!startYm) return { ok: false, error: 'Startmåned må være på formen ÅÅÅÅ-MM', status: 400 };
  if (!(antallMnd >= 1 && antallMnd <= 36)) return { ok: false, error: 'Lengden må være 1–36 måneder', status: 400 };
  const status = PLAN_STATUSER.includes(body.status) ? body.status : 'utkast';
  const id = String(body.id || '').trim() || uuidv4();
  const now = new Date().toISOString();
  const type = body.type === 'modell' ? 'modell' : 'enkel';
  const set = {
    plan: true,
    navn,
    startYm,
    antallMnd,
    status,
    type,
    investorSynlig: Boolean(body.investorSynlig),
    inntekter: rensSerierN(body.inntekter, INNTEKT_KATEGORIER, antallMnd),
    kostnader: rensSerierN(body.kostnader, KOSTNAD_KATEGORIER, antallMnd),
    notat: String(body.notat || '').slice(0, 2000),
    updatedAt: now,
    updatedBy: String(body.updatedBy || '').slice(0, 120),
  };
  if (type === 'modell') {
    // Fakta-snapshot: bruk innsendt hvis gitt, ellers behold eksisterende
    const eks = await db.collection(BUDSJETT_COLL).findOne({ plan: true, id }, { projection: { _id: 0, id: 1, fakta: 1 } });
    let fakta = body.fakta;
    if (!fakta) fakta = eks?.fakta || null;
    // NY modell arver den økonomiske motoren fra Enhetsøkonomi-siden (én
    // kilde til sannhet for CAC/system/lønn m.m.) — innsendte drivere vinner.
    let drivereInn = body.drivere;
    if (!eks) {
      try {
        const { hentEnhetsokonomi, eoTilModellDrivere } = await import('./enhetsokonomi');
        const eo = await hentEnhetsokonomi(db);
        drivereInn = { ...eoTilModellDrivere(eo.drivere), ...(body.drivere || {}) };
      } catch (e) { /* arv er best effort — standarddrivere gjelder ellers */ }
    }
    set.drivere = rensModellDrivere(drivereInn);
    // Navngitte scenariosett — sendes bare når klienten faktisk endrer dem;
    // utelatt felt betyr «behold det som ligger lagret».
    if (Array.isArray(body.scenarioer)) set.scenarioer = rensScenarioer(body.scenarioer);
    set.fakta = { ...rensModellFakta(fakta || {}, antallMnd), oppdatertAt: fakta?.oppdatertAt || now };
    const m = beregnInvestorModell({ antallMnd, fakta: set.fakta, drivere: set.drivere, startYm });
    set.modellSammendrag = {
      sumInntekt: m.sammendrag.sumInntekt,
      sumKost: m.sammendrag.sumKost,
      resultat: m.sammendrag.resultat,
      breakEvenIdx: m.sammendrag.breakEvenIdx,
      andelEksisterendePct: m.sammendrag.andelEksisterendePct,
    };
  }
  await db.collection(BUDSJETT_COLL).updateOne(
    { plan: true, id },
    { $set: set, $setOnInsert: { id, createdAt: now } },
    { upsert: true },
  );
  // Styringsregel: kun ÉN vedtatt plan per identiske periode — andre demoteres.
  if (status === 'vedtatt') {
    await db.collection(BUDSJETT_COLL).updateMany(
      { plan: true, startYm, antallMnd, id: { $ne: id }, status: 'vedtatt' },
      { $set: { status: 'utkast', updatedAt: now } },
    );
  }
  return { ok: true, id, ...set };
}

export async function slettPlan(db, id) {
  const r = await db.collection(BUDSJETT_COLL).deleteOne({ plan: true, id: String(id || '') });
  if (!r.deletedCount) return { ok: false, error: 'Ikke funnet', status: 404 };
  return { ok: true };
}

// ── FAKTISK for en fri periode ───────────────────────────────────────────────
// Samme metode som beregnFaktisk, men for vilkårlig [startYm, +antallMnd):
// fryste snapshots der de finnes, ellers live fra kontrakter/kostnader.
// Fremtidige måneder = null.
export async function beregnFaktiskPeriode(db, startYm, antallMnd) {
  const { fees, costs } = await hentFeesOgKostnader(db);
  const { y, m0 } = ymDeler(startYm);
  const aarene = Array.from(new Set(Array.from({ length: antallMnd }, (_, i) => Math.floor((y * 12 + m0 + i) / 12))));
  let snapshots = [];
  try { snapshots = await db.collection(SNAPSHOT_COLL).find({ year: { $in: aarene } }, { projection: { _id: 0 } }).toArray(); } catch (e) {}
  const snapMap = new Map(snapshots.map((s) => [`${s.year}-${s.month}`, s]));
  const naa = new Date();
  const inneværendeYm = naa.getUTCFullYear() * 12 + naa.getUTCMonth();

  const honorar = Array(antallMnd).fill(null);
  const kostnaderPerKategori = {};
  for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k] = Array(antallMnd).fill(null);
  const kostnaderSum = Array(antallMnd).fill(null);
  const snapshotMnd = Array(antallMnd).fill(false);

  for (let i = 0; i < antallMnd; i++) {
    const t = y * 12 + m0 + i;
    if (t > inneværendeYm) continue;
    const yy = Math.floor(t / 12), mm = t % 12;
    const snap = snapMap.get(`${yy}-${mm}`);
    if (snap && snap.honorar != null) {
      honorar[i] = r0(snap.honorar);
      for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k][i] = r0(snap.kostnaderPerKategori?.[k] || 0);
      kostnaderSum[i] = r0(snap.kostnaderSum || 0);
      snapshotMnd[i] = true;
    } else {
      const f = faktiskForMnd(fees, costs, yy, mm);
      honorar[i] = f.honorar;
      for (const k of KOSTNAD_KATEGORIER) kostnaderPerKategori[k][i] = f.kostnaderPerKategori[k];
      kostnaderSum[i] = f.kostnaderSum;
    }
  }
  return { honorar, kostnaderPerKategori, kostnaderSum, snapshotMnd };
}

// ── Porteføljeforslag for en fri periode ─────────────────────────────────────
// Inntektssiden bruker inntektsmodellen (modell B: sikret + antakelser) regnet
// fra januar i startåret og SKÅRET til vinduet — dermed fases kontraktsfestet
// honorar inn/ut på faktiske datoer også midt i perioden. Kostnadssiden
// fordeles direkte fra kostnadsregisteret på månedene de er aktive.
export function lagForslagForPeriode({ rows = [], costs = [], startYm, antallMnd, antakelser = {} }) {
  const { y, m0 } = ymDeler(startYm);
  const N = antallMnd;
  const modell = beregnInntektsmodell({ rows, year: y, antakelser, antallMnd: m0 + N });
  const enhetsSerie = beregnEnhetsSerie(rows, y, m0 + N);
  const skjaer = (arr) => arr.slice(m0, m0 + N);
  const inntekter = {
    'Honorar (forvaltning)': skjaer(modell.total),
    'Oppstartshonorar': skjaer(modell.oppstart),
    'Annen inntekt': Array(N).fill(0),
  };
  const kostnader = {};
  for (const k of KOSTNAD_KATEGORIER) kostnader[k] = Array(N).fill(0);
  for (const c of costs) {
    const kat = KOSTNAD_KATEGORIER.includes(c.category) ? c.category : 'Annet';
    for (let i = 0; i < N; i++) {
      const t = y * 12 + m0 + i;
      const yy = Math.floor(t / 12), mm = t % 12;
      const d0 = Date.UTC(yy, mm, 1);
      const d1 = Date.UTC(yy, mm + 1, 0, 23, 59, 59);
      if (!activeInMonth(c.startDate, c.endDate, d0, d1)) continue;
      kostnader[kat][i] = r0(kostnader[kat][i] + monthlyCost(c));
    }
  }
  return {
    inntekter,
    kostnader,
    sikret: skjaer(modell.sikret),
    vekst: skjaer(modell.vekst),
    enheterSerie: skjaer(enhetsSerie),
    bortfall: skjaer(beregnBortfallSerie(rows, y, m0 + N)),
    drivereBrukt: modell.drivereBrukt,
  };
}
