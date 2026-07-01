// ---------------------------------------------------------------------------
// Økonomimotor — Resultat (P&L) + Likviditet (12-mnd prognose).
//
// Inntekt = honorar (prosent av leie):
//   • leiekontrakt   → FAKTISK honorar = monthlyRent × feePercent, fra startDate
//   • forvaltningsavtale → FORVENTET honorar = estimatedMonthlyRent × feePercent, fra expectedRentStart
// Kostnad = faste OPEX (manuelt) + annonseforbruk (auto fra marketing-metrics) + LLM (auto self-metered).
// Alle beløp: NOK, eks. mva. Ingen tall fabrikkeres — tomt gir 0/ null.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import { buildMarketingMetrics } from '@/lib/marketing-metrics';
import { summarizeLlmUsage } from '@/lib/llm-usage';
import { computeKpiDashboard } from '@/lib/kpi-dashboard';

export const COSTS_COLL = 'finance_costs';
export const CONTRACTS_COLL = 'finance_contracts';
export const EVENTS_COLL = 'finance_events';
export const FSETTINGS_COLL = 'finance_settings';
export const FSNAP_COLL = 'finance_snapshots';

export const COST_CATEGORIES = ['Lønn', 'Husleie', 'Programvare/SaaS', 'Regnskap', 'API/LLM', 'Markedsføring', 'Annet'];
export const COST_FREQUENCIES = ['monthly', 'quarterly', 'yearly'];
export const CONTRACT_TYPES = ['leiekontrakt', 'forvaltningsavtale'];

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const strip = (d) => { if (!d) return d; const { _id, ...rest } = d; return rest; };
const num = (v) => (v != null && v !== '' && isFinite(Number(v)) ? Number(v) : null);
const ts = (v) => (v ? new Date(v).getTime() : NaN);

// ─────────────────────────── Innstillinger ───────────────────────────
export async function getFinanceSettings(db) {
  let doc = null;
  try { doc = await db.collection(FSETTINGS_COLL).findOne({ id: 'main' }); } catch (_) {}
  return {
    openingCashBalance: doc?.openingCashBalance != null ? Number(doc.openingCashBalance) : null,
    openingCashDate: doc?.openingCashDate || null,
    currency: 'NOK',
    vatMode: 'excl',
    includeAdSpend: doc?.includeAdSpend !== false,
    includeLlm: doc?.includeLlm !== false,
    forecast: doc?.forecast || null,
    updatedAt: doc?.updatedAt || null,
  };
}
export async function setFinanceSettings(db, patch = {}) {
  const cur = await getFinanceSettings(db);
  const next = {
    id: 'main',
    openingCashBalance: patch.openingCashBalance !== undefined
      ? (patch.openingCashBalance === '' || patch.openingCashBalance === null ? null : Math.max(0, Number(patch.openingCashBalance) || 0))
      : cur.openingCashBalance,
    openingCashDate: patch.openingCashDate !== undefined ? (patch.openingCashDate || null) : cur.openingCashDate,
    currency: 'NOK',
    vatMode: 'excl',
    includeAdSpend: patch.includeAdSpend !== undefined ? !!patch.includeAdSpend : cur.includeAdSpend,
    includeLlm: patch.includeLlm !== undefined ? !!patch.includeLlm : cur.includeLlm,
    forecast: patch.forecast !== undefined ? { ...(cur.forecast || {}), ...patch.forecast } : (cur.forecast || null),
    updatedAt: new Date().toISOString(),
  };
  await db.collection(FSETTINGS_COLL).updateOne({ id: 'main' }, { $set: next }, { upsert: true });
  return next;
}

// ─────────────────────────── Kostnader (OPEX) ───────────────────────────
export async function listCosts(db) {
  try { return (await db.collection(COSTS_COLL).find({}).sort({ createdAt: -1 }).toArray()).map(strip); } catch (_) { return []; }
}
export async function upsertCost(db, body = {}) {
  const now = new Date().toISOString();
  const doc = {
    name: (body.name || '').toString().slice(0, 120),
    category: COST_CATEGORIES.includes(body.category) ? body.category : 'Annet',
    amount: Math.max(0, Number(body.amount) || 0),
    frequency: COST_FREQUENCIES.includes(body.frequency) ? body.frequency : 'monthly',
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    vendor: (body.vendor || '').toString().slice(0, 120),
    source: (body.source || 'manual').toString().slice(0, 40),
    note: (body.note || '').toString().slice(0, 500),
    updatedAt: now,
  };
  if (body.id) { await db.collection(COSTS_COLL).updateOne({ id: String(body.id) }, { $set: doc }); return { id: String(body.id), ...doc }; }
  const id = uuidv4();
  await db.collection(COSTS_COLL).insertOne({ id, createdAt: now, ...doc });
  return { id, createdAt: now, ...doc };
}
export async function deleteCost(db, id) { await db.collection(COSTS_COLL).deleteOne({ id: String(id) }); return true; }

// ─────────────────────────── Kontrakter/avtaler ───────────────────────────
export async function listContracts(db) {
  try { return (await db.collection(CONTRACTS_COLL).find({}).sort({ createdAt: -1 }).toArray()).map(strip); } catch (_) { return []; }
}
export async function upsertContract(db, body = {}) {
  const now = new Date().toISOString();
  const type = CONTRACT_TYPES.includes(body.type) ? body.type : 'leiekontrakt';
  const doc = {
    type,
    label: (body.label || body.propertyAddress || '').toString().slice(0, 160),
    propertyAddress: (body.propertyAddress || '').toString().slice(0, 200),
    ownerName: (body.ownerName || '').toString().slice(0, 120),
    tenantName: (body.tenantName || '').toString().slice(0, 120),
    monthlyRent: num(body.monthlyRent),
    estimatedMonthlyRent: num(body.estimatedMonthlyRent),
    feePercent: num(body.feePercent),      // lagres som prosent-tall (12 = 12 %)
    status: (body.status || 'active').toString().slice(0, 40),
    startDate: body.startDate || null,
    endDate: body.endDate || null,
    expectedRentStart: body.expectedRentStart || null,
    note: (body.note || '').toString().slice(0, 500),
    updatedAt: now,
  };
  // Synk-/dedupe-felt: settes hvis oppgitt, ellers BEVARES ved redigering (så UI-redigering
  // av en synket kontrakt ikke nullstiller propertyId/source/externalRef).
  if (body.propertyId !== undefined) doc.propertyId = (body.propertyId || '').toString().slice(0, 120) || null;
  if (body.source !== undefined) doc.source = (body.source || 'manual').toString().slice(0, 40);
  if (body.externalRef !== undefined) doc.externalRef = (body.externalRef || '').toString().slice(0, 120) || null;

  if (body.id) {
    await db.collection(CONTRACTS_COLL).updateOne({ id: String(body.id) }, { $set: doc });
    return { id: String(body.id), ...doc };
  }
  // Ny manuell kontrakt — sett standardverdier for synk-feltene
  if (doc.propertyId === undefined) doc.propertyId = null;
  if (doc.source === undefined) doc.source = 'manual';
  if (doc.externalRef === undefined) doc.externalRef = null;
  const id = uuidv4();
  await db.collection(CONTRACTS_COLL).insertOne({ id, createdAt: now, ...doc });
  return { id, createdAt: now, ...doc };
}
export async function deleteContract(db, id) { await db.collection(CONTRACTS_COLL).deleteOne({ id: String(id) }); return true; }

// Upsert fra plattform-synk — idempotent på externalContractId (bevarer vår interne id).
export async function upsertContractExternal(db, doc) {
  const now = new Date().toISOString();
  const existing = await db.collection(CONTRACTS_COLL).findOne({ externalContractId: doc.externalContractId });
  const base = { ...doc, updatedAt: now };
  if (existing) { await db.collection(CONTRACTS_COLL).updateOne({ id: existing.id }, { $set: base }); return { id: existing.id, ...base }; }
  const id = uuidv4();
  await db.collection(CONTRACTS_COLL).insertOne({ id, createdAt: now, ...base });
  return { id, ...base };
}

// ─────────────────────────── Engangsposter / utlegg ───────────────────────────
export async function listEvents(db) {
  try { return (await db.collection(EVENTS_COLL).find({}).sort({ date: 1 }).toArray()).map(strip); } catch (_) { return []; }
}
export async function upsertEvent(db, body = {}) {
  const now = new Date().toISOString();
  const doc = {
    date: body.date || null,
    direction: body.direction === 'in' ? 'in' : 'out',
    amount: Math.max(0, Number(body.amount) || 0),
    category: (body.category || '').toString().slice(0, 80),
    label: (body.label || '').toString().slice(0, 160),
    confidence: body.confidence === 'faktisk' ? 'faktisk' : 'forventet',
    linkedContractId: (body.linkedContractId || '').toString().slice(0, 120) || null,
    source: (body.source || 'manual').toString().slice(0, 40),
    note: (body.note || '').toString().slice(0, 500),
    updatedAt: now,
  };
  if (body.id) { await db.collection(EVENTS_COLL).updateOne({ id: String(body.id) }, { $set: doc }); return { id: String(body.id), ...doc }; }
  const id = uuidv4();
  await db.collection(EVENTS_COLL).insertOne({ id, createdAt: now, ...doc });
  return { id, createdAt: now, ...doc };
}
export async function deleteEvent(db, id) { await db.collection(EVENTS_COLL).deleteOne({ id: String(id) }); return true; }

// ─────────────────────────── Beregnings-hjelpere ───────────────────────────
function monthlyCost(c) {
  const a = Number(c.amount) || 0;
  if (c.frequency === 'yearly') return a / 12;
  if (c.frequency === 'quarterly') return a / 3;
  return a;
}
// Honorar per måned + sikkerhet + fra-dato for en kontrakt.
function contractMonthlyFee(c) {
  const pct = (Number(c.feePercent) || 0) / 100;
  const base = { propertyId: c.propertyId || null };
  if (c.type === 'leiekontrakt') {
    const rent = Number(c.monthlyRent) || 0;
    return { ...base, amount: round2(rent * pct), confidence: 'faktisk', activeFrom: c.startDate || null, endDate: c.endDate || null };
  }
  const rent = (c.estimatedMonthlyRent != null ? Number(c.estimatedMonthlyRent) : Number(c.monthlyRent)) || 0;
  return { ...base, amount: round2(rent * pct), confidence: 'forventet', activeFrom: c.expectedRentStart || c.startDate || null, endDate: c.endDate || null };
}
function activeInMonth(fromDate, endDate, mStart, mEnd) {
  const s = fromDate ? ts(fromDate) : -Infinity;
  const e = endDate ? ts(endDate) : Infinity;
  return s <= mEnd && e >= mStart;
}

async function autoCosts(db, settings) {
  let adSpendMonthly = 0, adConfigured = false, llmMonthly = 0;
  if (settings.includeAdSpend) {
    try {
      const mm = await buildMarketingMetrics(db, { days: 30 });
      adSpendMonthly = round2((mm && mm.spend && mm.spend.total) || 0);
      adConfigured = !!(mm && mm.configured);
    } catch (_) {}
  }
  if (settings.includeLlm) {
    try { const l = await summarizeLlmUsage(db, 30); llmMonthly = round2(l.costNok || 0); } catch (_) {}
  }
  return { adSpendMonthly, adConfigured, llmMonthly };
}

// ─────────────────────────── Resultat (P&L, per måned) ───────────────────────────
export async function computeResultat(db) {
  const settings = await getFinanceSettings(db);
  const [costs, contracts] = await Promise.all([listCosts(db), listContracts(db)]);
  const { adSpendMonthly, adConfigured, llmMonthly } = await autoCosts(db, settings);
  const now = Date.now();

  const activeList = contracts.filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired');
  // Enheter med aktiv leiekontrakt NÅ (for dedupe mot forvaltningsavtale i forventet)
  const leasePropNow = new Set();
  for (const c of activeList) {
    if (c.type !== 'leiekontrakt' || !c.propertyId) continue;
    const s = c.startDate ? ts(c.startDate) : -Infinity, e = c.endDate ? ts(c.endDate) : Infinity;
    if (s <= now && e >= now) leasePropNow.add(c.propertyId);
  }
  let incomeActual = 0, incomeExpected = 0, activeContracts = 0;
  for (const c of activeList) {
    const f = contractMonthlyFee(c);
    if (!f.amount) continue;
    const from = f.activeFrom ? ts(f.activeFrom) : -Infinity;
    const end = f.endDate ? ts(f.endDate) : Infinity;
    if (from <= now && end >= now) {
      if (f.confidence === 'faktisk') { incomeActual += f.amount; activeContracts++; }
      else {
        if (c.propertyId && leasePropNow.has(c.propertyId)) continue; // dedupe: leie dekker allerede enheten
        incomeExpected += f.amount; activeContracts++;
      }
    }
  }
  incomeActual = round2(incomeActual);
  incomeExpected = round2(incomeExpected);
  const incomeForventet = round2(incomeActual + incomeExpected);

  // OPEX (manuelle/regnskap-kostnader aktive nå) gruppert per kategori
  const byCategory = {};
  let opexManual = 0;
  for (const c of costs) {
    if (!activeInMonth(c.startDate, c.endDate, now, now)) continue;
    const m = monthlyCost(c);
    opexManual += m;
    byCategory[c.category] = round2((byCategory[c.category] || 0) + m);
  }
  opexManual = round2(opexManual);
  if (adSpendMonthly) byCategory['Markedsføring'] = round2((byCategory['Markedsføring'] || 0) + adSpendMonthly);
  if (llmMonthly) byCategory['API/LLM'] = round2((byCategory['API/LLM'] || 0) + llmMonthly);

  const opexTotal = round2(opexManual + adSpendMonthly + llmMonthly);

  const resultatActual = round2(incomeActual - opexTotal);
  const resultatForventet = round2(incomeForventet - opexTotal);
  const marginActual = incomeActual > 0 ? Math.round((resultatActual / incomeActual) * 1000) / 10 : null;
  const marginForventet = incomeForventet > 0 ? Math.round((resultatForventet / incomeForventet) * 1000) / 10 : null;

  // Variable (akkvisisjon) vs faste → contribution margin + break-even
  const variableCosts = round2(adSpendMonthly);
  const fixedCosts = round2(opexManual + llmMonthly);
  const contributionMargin = round2(incomeActual - variableCosts);
  const avgFeePerContract = activeContracts > 0 ? round2(incomeActual / activeContracts) : 0;
  const breakEvenContracts = avgFeePerContract > 0 ? Math.ceil(opexTotal / avgFeePerContract) : null;

  const costBreakdown = Object.entries(byCategory)
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK', vatMode: 'excl',
    monthly: {
      incomeActual, incomeExpected, incomeForventet,
      opexManual, adSpendMonthly, llmMonthly, opexTotal,
      resultatActual, resultatForventet,
      marginActual, marginForventet,
      contributionMargin, variableCosts, fixedCosts,
      avgFeePerContract, breakEvenContracts, activeContracts,
    },
    annual: {
      incomeActual: round2(incomeActual * 12),
      incomeForventet: round2(incomeForventet * 12),
      opexTotal: round2(opexTotal * 12),
      resultatActual: round2(resultatActual * 12),
      resultatForventet: round2(resultatForventet * 12),
    },
    costBreakdown,
    configured: { ads: adConfigured, adSpendMonthly, llmMonthly, contracts: contracts.length, costs: costs.length },
  };
}

// ─────────────────────────── Likviditet (12-mnd prognose) ───────────────────────────
export async function computeLikviditet(db, { months = 12 } = {}) {
  const M = Math.max(1, Math.min(36, Number(months) || 12));
  const settings = await getFinanceSettings(db);
  const [costs, contracts, events] = await Promise.all([listCosts(db), listContracts(db), listEvents(db)]);
  const { adSpendMonthly, adConfigured, llmMonthly } = await autoCosts(db, settings);

  const opening = settings.openingCashBalance != null ? Number(settings.openingCashBalance) : null;

  // Forbered kontraktshonorar
  const fees = contracts
    .filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired')
    .map((c) => ({ ...contractMonthlyFee(c), type: c.type }))
    .filter((f) => f.amount > 0);

  // Måned-iterasjon fra inneværende måned
  const base = new Date();
  const startYear = base.getUTCFullYear();
  const startMonth = base.getUTCMonth();

  const scenarios = { faktisk: [], forventet: [] };
  const runningCash = { faktisk: opening != null ? opening : 0, forventet: opening != null ? opening : 0 };

  for (let i = 0; i < M; i++) {
    const d0 = new Date(Date.UTC(startYear, startMonth + i, 1));
    const d1 = new Date(Date.UTC(startYear, startMonth + i + 1, 0, 23, 59, 59));
    const mStart = d0.getTime(), mEnd = d1.getTime();
    const ym = `${d0.getUTCFullYear()}-${String(d0.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d0.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' });

    // Inntekt per scenario (med dedupe: forvaltning teller ikke hvis enheten har aktiv leie)
    const leaseProps = new Set();
    for (const f of fees) { if (f.type === 'leiekontrakt' && f.propertyId && activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) leaseProps.add(f.propertyId); }
    let incFaktisk = 0, incForventet = 0;
    for (const f of fees) {
      if (!activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) continue;
      if (f.confidence === 'faktisk') { incFaktisk += f.amount; incForventet += f.amount; }
      else { if (f.propertyId && leaseProps.has(f.propertyId)) continue; incForventet += f.amount; }
    }

    // Kostnader (like i begge scenarier)
    let recurring = 0;
    for (const c of costs) { if (activeInMonth(c.startDate, c.endDate, mStart, mEnd)) recurring += monthlyCost(c); }
    const costsMonth = round2(recurring + adSpendMonthly + llmMonthly);

    // Engangsposter i måneden
    let evFaktisk = 0, evForventet = 0;
    for (const e of events) {
      const t = ts(e.date); if (!isFinite(t) || t < mStart || t > mEnd) continue;
      const signed = (e.direction === 'in' ? 1 : -1) * (Number(e.amount) || 0);
      evForventet += signed;
      if (e.confidence === 'faktisk') evFaktisk += signed;
    }

    const netF = round2(incFaktisk - costsMonth + evFaktisk);
    const netE = round2(incForventet - costsMonth + evForventet);
    runningCash.faktisk = round2(runningCash.faktisk + netF);
    runningCash.forventet = round2(runningCash.forventet + netE);

    scenarios.faktisk.push({ ym, label, income: round2(incFaktisk), costs: costsMonth, events: round2(evFaktisk), net: netF, cash: opening != null ? runningCash.faktisk : null });
    scenarios.forventet.push({ ym, label, income: round2(incForventet), costs: costsMonth, events: round2(evForventet), net: netE, cash: opening != null ? runningCash.forventet : null });
  }

  const summarize = (series) => {
    const avgNet = round2(series.reduce((s, p) => s + p.net, 0) / series.length);
    const month0Net = series[0] ? series[0].net : 0;
    const burnRate = avgNet < 0 ? round2(-avgNet) : 0;
    let runwayMonths = null;
    if (opening != null) {
      const idx = series.findIndex((p) => p.cash != null && p.cash < 0);
      if (idx >= 0) runwayMonths = idx; // antall hele måneder før tom
      else if (burnRate > 0) runwayMonths = Math.floor(opening / burnRate);
      else runwayMonths = null; // positiv/nøytral → ingen tom kasse i horisonten
    }
    return { avgNet, month0Net, burnRate, runwayMonths, endCash: series.length && opening != null ? series[series.length - 1].cash : null };
  };

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    months: M,
    currency: 'NOK', vatMode: 'excl',
    opening,
    openingSet: opening != null,
    scenarios,
    summary: { faktisk: summarize(scenarios.faktisk), forventet: summarize(scenarios.forventet) },
    autoCosts: { adSpendMonthly, adConfigured, llmMonthly },
    counts: { contracts: contracts.length, costs: costs.length, events: events.length },
  };
}

// Kompakt oversikt til KPI-dashbordet.
export async function computeFinanceOverview(db) {
  const [res, liq] = await Promise.all([computeResultat(db), computeLikviditet(db, { months: 12 })]);
  return {
    ok: true,
    monthly: res.monthly,
    burnRate: liq.summary.forventet.burnRate,
    burnRateActual: liq.summary.faktisk.burnRate,
    runwayMonths: liq.summary.forventet.runwayMonths,
    openingSet: liq.openingSet,
    opening: liq.opening,
  };
}


// ─────────────────────────── Historikk & trender ───────────────────────────
function currentYm() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Rekonstruerer månedlig MRR (honorarinntekt) BAKOVER fra kontraktenes datoer.
// Dette gir en ekte historisk trend uten å fabrikere tall (bygger kun på start/slutt-datoer).
export async function computeMrrHistory(db, { months = 12 } = {}) {
  const M = Math.max(2, Math.min(36, Number(months) || 12));
  const [contracts, costs] = await Promise.all([listContracts(db), listCosts(db)]);
  const fees = contracts
    .filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired')
    .map((c) => ({ ...contractMonthlyFee(c), type: c.type }))
    .filter((f) => f.amount > 0);

  const base = new Date();
  const y = base.getUTCFullYear(), mo = base.getUTCMonth();
  const series = [];
  for (let i = M - 1; i >= 0; i--) {
    const d0 = new Date(Date.UTC(y, mo - i, 1));
    const d1 = new Date(Date.UTC(y, mo - i + 1, 0, 23, 59, 59));
    const mStart = d0.getTime(), mEnd = d1.getTime();
    const ym = `${d0.getUTCFullYear()}-${String(d0.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d0.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' });

    const leaseProps = new Set();
    for (const f of fees) { if (f.type === 'leiekontrakt' && f.propertyId && activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) leaseProps.add(f.propertyId); }
    let mrrActual = 0, mrrForventet = 0, active = 0;
    for (const f of fees) {
      if (!activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) continue;
      if (f.confidence === 'faktisk') { mrrActual += f.amount; mrrForventet += f.amount; active++; }
      else { if (f.propertyId && leaseProps.has(f.propertyId)) continue; mrrForventet += f.amount; active++; }
    }
    let opexManual = 0;
    for (const c of costs) { if (activeInMonth(c.startDate, c.endDate, mStart, mEnd)) opexManual += monthlyCost(c); }
    series.push({ ym, label, mrrActual: round2(mrrActual), mrrForventet: round2(mrrForventet), opexManual: round2(opexManual), activeContracts: active });
  }
  return series;
}

// Fryser et månedlig øyeblikksbilde av avledede nøkkeltall (idempotent per måned).
export async function captureSnapshot(db) {
  const ym = currentYm();
  const [res, liq] = await Promise.all([computeResultat(db), computeLikviditet(db, { months: 12 })]);
  let ltvCac = null, cac = null, ltv = null;
  try {
    const kpi = await computeKpiDashboard(db, { days: 90 });
    const h = kpi && kpi.hero;
    if (h) {
      ltvCac = h.ltvCac?.value ?? h.ltvCac ?? null;
      cac = h.cac?.value ?? h.cac ?? null;
      ltv = h.ltv?.value ?? h.ltv ?? null;
    }
  } catch (_) {}
  const snap = {
    ym, at: new Date().toISOString(),
    mrrActual: res.monthly.incomeActual, mrrForventet: res.monthly.incomeForventet,
    opexTotal: res.monthly.opexTotal, resultatForventet: res.monthly.resultatForventet,
    margin: res.monthly.marginForventet, burnRate: liq.summary.forventet.burnRate,
    runwayMonths: liq.summary.forventet.runwayMonths,
    ltvCac: ltvCac != null ? Number(ltvCac) : null, cac: cac != null ? Number(cac) : null, ltv: ltv != null ? Number(ltv) : null,
    activeContracts: res.monthly.activeContracts,
  };
  try { await db.collection(FSNAP_COLL).updateOne({ ym }, { $set: snap }, { upsert: true }); } catch (_) {}
  return snap;
}

export async function getSnapshots(db, { months = 12 } = {}) {
  try {
    const all = await db.collection(FSNAP_COLL).find({}).sort({ ym: 1 }).toArray();
    return all.slice(-Math.max(1, months)).map(strip);
  } catch (_) { return []; }
}

// Samlet trend-payload: fanger dagens snapshot + returnerer MRR-historikk (backfill) + snapshot-serie.
export async function computeTrends(db, { months = 12 } = {}) {
  await captureSnapshot(db);
  const [mrrHistory, snapshots] = await Promise.all([computeMrrHistory(db, { months }), getSnapshots(db, { months })]);
  return { ok: true, generatedAt: new Date().toISOString(), currency: 'NOK', months, mrrHistory, snapshots };
}
