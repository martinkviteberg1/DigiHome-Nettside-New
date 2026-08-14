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
import { summarizeExtUsage, getPlatformUsage, platformCostsNok } from '@/lib/ext-usage';
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
    includeExt: doc?.includeExt !== false,           // SendGrid/SerpAPI/Maps (egen telling)
    includePlatform: doc?.includePlatform !== false, // Plattform-CRM (Twilio, e-sign, deres LLM m.m.)
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
    includeExt: patch.includeExt !== undefined ? !!patch.includeExt : cur.includeExt,
    includePlatform: patch.includePlatform !== undefined ? !!patch.includePlatform : cur.includePlatform,
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
  // Én kostnadskilde: fordeling (enhetsmargin-nøkkel) + paused settes kun når
  // de sendes eksplisitt — eldre kall uten feltene bevarer eksisterende verdi.
  if (body.fordeling !== undefined) doc.fordeling = ['alle', 'utleide', 'honorar'].includes(body.fordeling) ? body.fordeling : 'alle';
  if (body.paused !== undefined) doc.paused = !!body.paused;
  if (body.id) { await db.collection(COSTS_COLL).updateOne({ id: String(body.id) }, { $set: doc }); return { id: String(body.id), ...doc }; }
  const id = uuidv4();
  await db.collection(COSTS_COLL).insertOne({ id, createdAt: now, ...doc });
  return { id, createdAt: now, ...doc };
}
export async function deleteCost(db, id) { await db.collection(COSTS_COLL).deleteOne({ id: String(id) }); return true; }

// Kun aktive kostnader (paused ekskluderes) — brukes av ALLE beregninger
// (resultat, likviditet, budsjett, datarom) slik at en pauset post teller 0.
export async function listActiveCosts(db) {
  return (await listCosts(db)).filter((c) => c.paused !== true);
}

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
export function monthlyCost(c) {
  const a = Number(c.amount) || 0;
  if (c.frequency === 'yearly') return a / 12;
  if (c.frequency === 'quarterly') return a / 3;
  return a;
}
// Honorar per måned + sikkerhet + fra-dato for en kontrakt.
//
// TRE NIVÅER (dette er kjernen i inntektskvaliteten):
//   'faktisk'    — leiekontrakt som er SIGNERT og har startet → honorar løper nå
//   'kontrahert' — leiekontrakt som er inngått/underveis, men ikke startet
//                  (eller ikke ferdig signert). Reell, men ikke inntekt ennå.
//   'forventet'  — forvaltningsavtale med ESTIMERT leie. Ingen leiekontrakt →
//                  ingen honorargrunnlag ennå.
// Honoraret vårt utløses av en FAKTISK inngått leiekontrakt, aldri av estimert
// leie på en forvaltningsavtale.
const LEASE_SIGNED_STATUSES = ['signed', 'active', 'aktiv', 'signert', 'løpende', 'lopende'];
export function contractMonthlyFee(c) {
  const pct = (Number(c.feePercent) || 0) / 100;
  const base = { propertyId: c.propertyId || null };
  const status = String(c.status || '').toLowerCase();
  if (c.type === 'leiekontrakt') {
    const rent = Number(c.monthlyRent) || 0;
    const amount = round2(rent * pct);
    const activeFrom = c.startDate || null;
    const started = activeFrom ? ts(activeFrom) <= Date.now() : true;
    const signed = LEASE_SIGNED_STATUSES.includes(status) || status === '';
    const confidence = (signed && started) ? 'faktisk' : 'kontrahert';
    return { ...base, amount, confidence, leaseStatus: status || 'signed', activeFrom, endDate: c.endDate || null };
  }
  const rent = (c.estimatedMonthlyRent != null ? Number(c.estimatedMonthlyRent) : Number(c.monthlyRent)) || 0;
  return { ...base, amount: round2(rent * pct), confidence: 'forventet', leaseStatus: null, activeFrom: c.expectedRentStart || c.startDate || null, endDate: c.endDate || null };
}
export function activeInMonth(fromDate, endDate, mStart, mEnd) {
  const s = fromDate ? ts(fromDate) : -Infinity;
  const e = endDate ? ts(endDate) : Infinity;
  return s <= mEnd && e >= mStart;
}

export async function autoCosts(db, settings) {
  let adSpendMonthly = 0, adConfigured = false, llmMonthly = 0, extMonthly = 0, platformMonthly = 0, platformOk = false;
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
  // Eksterne tjenester (egen telling): SendGrid, SerpAPI, Google Maps — estimat.
  if (settings.includeExt) {
    try { const x = await summarizeExtUsage(db, 30); extMonthly = round2(x.totalNok || 0); } catch (_) {}
  }
  // Plattform-CRM (Twilio, e-signering, kredittsjekk + deres LLM): hittil denne
  // måneden fra /api/usage/external (10 min cache), USD→NOK-omregnet.
  if (settings.includePlatform) {
    try {
      const p = await getPlatformUsage(db);
      platformOk = !!(p && p.status === 'ok');
      platformMonthly = round2(platformCostsNok(p));
    } catch (_) {}
  }
  return { adSpendMonthly, adConfigured, llmMonthly, extMonthly, platformMonthly, platformOk };
}

// ─────────────────────────── Resultat (P&L, per måned) ───────────────────────────
export async function computeResultat(db) {
  const settings = await getFinanceSettings(db);
  const [costs, contracts] = await Promise.all([listActiveCosts(db), listContractsDeduped(db)]);
  const { adSpendMonthly, adConfigured, llmMonthly, extMonthly, platformMonthly, platformOk } = await autoCosts(db, settings);
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
        // Dedupe: en forvaltningsavtale skal ikke telle estimert leie på en
        // enhet som allerede har leiekontrakt. MÅ være type-basert — ellers
        // droppes «kontraherte» leiekontrakter på samme enhet.
        if (c.type !== 'leiekontrakt' && c.propertyId && leasePropNow.has(c.propertyId)) continue;
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
  if (extMonthly) byCategory['API/LLM'] = round2((byCategory['API/LLM'] || 0) + extMonthly);
  if (platformMonthly) byCategory['Plattformdrift (CRM)'] = round2((byCategory['Plattformdrift (CRM)'] || 0) + platformMonthly);

  const opexTotal = round2(opexManual + adSpendMonthly + llmMonthly + extMonthly + platformMonthly);

  const resultatActual = round2(incomeActual - opexTotal);
  const resultatForventet = round2(incomeForventet - opexTotal);
  const marginActual = incomeActual > 0 ? Math.round((resultatActual / incomeActual) * 1000) / 10 : null;
  const marginForventet = incomeForventet > 0 ? Math.round((resultatForventet / incomeForventet) * 1000) / 10 : null;

  // Variable (akkvisisjon) vs faste → contribution margin + break-even
  const variableCosts = round2(adSpendMonthly);
  const fixedCosts = round2(opexManual + llmMonthly + extMonthly + platformMonthly);
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
      opexManual, adSpendMonthly, llmMonthly, extMonthly, platformMonthly, opexTotal,
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
    configured: { ads: adConfigured, adSpendMonthly, llmMonthly, extMonthly, platformMonthly, platform: platformOk, contracts: contracts.length, costs: costs.length },
  };
}

// ─────────────────────────── Likviditet (12-mnd prognose) ───────────────────────────
export async function computeLikviditet(db, { months = 12 } = {}) {
  const M = Math.max(1, Math.min(36, Number(months) || 12));
  const settings = await getFinanceSettings(db);
  const [costs, contracts, events] = await Promise.all([listActiveCosts(db), listContractsDeduped(db), listEvents(db)]);
  const { adSpendMonthly, adConfigured, llmMonthly, extMonthly, platformMonthly } = await autoCosts(db, settings);

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
    const costsMonth = round2(recurring + adSpendMonthly + llmMonthly + extMonthly + platformMonthly);

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
    autoCosts: { adSpendMonthly, adConfigured, llmMonthly, extMonthly, platformMonthly },
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
  const [contracts, costs] = await Promise.all([listContractsDeduped(db), listActiveCosts(db)]);
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


// ═══════════════════════════════════════════════════════════════════════════
// INVESTOR-METRIKKER — MRR-waterfall, NRR/GRR, CAC-payback, attribusjon
// ═══════════════════════════════════════════════════════════════════════════

// Plattformen kan eksportere SAMME leieforhold to ganger (f.eks. én rad
// `pending` og én `signed` for samme bolig/leietaker/startdato). Behold den mest
// framskredne statusen, ellers dobbeltelles honoraret.
const LEASE_RANK = { signed: 3, active: 3, aktiv: 3, signert: 3, pending: 2, draft: 1 };
export function dedupeContracts(contracts = []) {
  const best = new Map();
  const out = [];
  for (const c of contracts) {
    // Foreldreløse kontrakter (fjernet i plattformen ved siste fulle synk) skal
    // ALDRI telle i penger. De blir liggende i UI-listen for sporbarhet, men et
    // honorar vi ikke lenger har krav på kan ikke blåse opp MRR/LTV.
    if (c.orphaned === true) continue;
    if (c.type !== 'leiekontrakt') { out.push(c); continue; }
    const key = `${c.propertyId || c.propertyAddress || '?'}|${(c.tenantName || '').trim().toLowerCase()}|${(c.startDate || '').slice(0, 10)}`;
    const rank = LEASE_RANK[String(c.status || '').toLowerCase()] ?? 0;
    const prev = best.get(key);
    if (!prev || rank > prev.rank) best.set(key, { rank, c });
  }
  for (const { c } of best.values()) out.push(c);
  return out;
}

// Kontraktsliste med duplikat-leiekontrakter fjernet. Brukes av ALLE
// beregninger; UI-listen bruker `listContracts` (rå) så ingenting «forsvinner».
async function listContractsDeduped(db) { return dedupeContracts(await listContracts(db)); }

// Aktive honorar-linjer med enhetsnøkkel + attribusjon (for waterfall/retensjon).
function activeFees(contracts) {
  return dedupeContracts(contracts)
    .filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired')
    .map((c) => ({ ...contractMonthlyFee(c), type: c.type, id: c.id, attribution: c.attribution || null, source: c.source || null }))
    .filter((f) => f.amount > 0);
}

// Effektiv MRR per enhet for én måned (dedupe: leie dekker forvaltning på samme enhet).
function unitMrrMap(fees, mStart, mEnd) {
  const leaseProps = new Set();
  for (const f of fees) if (f.type === 'leiekontrakt' && f.propertyId && activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) leaseProps.add(f.propertyId);
  const map = new Map();
  for (const f of fees) {
    if (!activeInMonth(f.activeFrom, f.endDate, mStart, mEnd)) continue;
    if (f.type !== 'leiekontrakt' && f.propertyId && leaseProps.has(f.propertyId)) continue;
    const key = f.propertyId ? `p:${f.propertyId}` : `c:${f.id}`;
    map.set(key, round2((map.get(key) || 0) + f.amount));
  }
  return map;
}
const sumMap = (m) => round2([...m.values()].reduce((s, x) => s + x, 0));

// Waterfall (bridge) mellom to enhetskart: start → +ny +ekspansjon −reduksjon −churn → slutt.
function waterfallBetween(prev, cur) {
  let neu = 0, expansion = 0, contraction = 0, churn = 0;
  const keys = new Set([...prev.keys(), ...cur.keys()]);
  for (const k of keys) {
    const a = prev.get(k) || 0, b = cur.get(k) || 0;
    if (a === 0 && b > 0) neu += b;
    else if (a > 0 && b === 0) churn += a;
    else if (b > a) expansion += (b - a);
    else if (b < a) contraction += (a - b);
  }
  return { start: sumMap(prev), end: sumMap(cur), neu: round2(neu), expansion: round2(expansion), contraction: round2(contraction), churn: round2(churn) };
}

// Retensjon over en kohort (kun enheter som fantes ved start; ekskluderer ny MRR).
function retentionOf(prev, cur) {
  const start = sumMap(prev);
  if (start <= 0) return { nrr: null, grr: null, start: 0, expansion: 0, contraction: 0, churn: 0 };
  let expansion = 0, contraction = 0, churn = 0;
  for (const [k, a] of prev) {
    const b = cur.get(k) || 0;
    if (b === 0) churn += a;
    else if (b > a) expansion += (b - a);
    else if (b < a) contraction += (a - b);
  }
  const nrr = ((start + expansion - contraction - churn) / start) * 100;
  const grr = ((start - contraction - churn) / start) * 100;
  return { nrr: Math.round(nrr * 10) / 10, grr: Math.round(grr * 10) / 10, start, expansion: round2(expansion), contraction: round2(contraction), churn: round2(churn) };
}

function attributionBucket(f) {
  const a = f.attribution || {};
  const raw = (a.channel || a.source || a.medium || a.utm_source || f.source || '').toString().toLowerCase();
  if (!raw || raw === 'auto_platform' || raw === 'manual') return 'ukjent';
  if (/(google|meta|facebook|instagram|paid|cpc|ppc|ads|adwords|sem|betalt)/.test(raw)) return 'marketing';
  if (/(organic|organisk|seo|direct|direkte|referral|henvis|word|munn|anbefal)/.test(raw)) return 'organisk';
  return 'ukjent';
}

// Samlet investor-payload: NRR/GRR, MRR-waterfall, CAC-payback og attribusjon.
export async function computeInvestorMetrics(db, { horizon = 12 } = {}) {
  const [contracts, settings] = await Promise.all([listContractsDeduped(db), getFinanceSettings(db)]);
  const fees = activeFees(contracts);

  const base = new Date();
  const y = base.getUTCFullYear(), mo = base.getUTCMonth();
  const months = [];
  for (let i = horizon; i >= 0; i--) {
    const d0 = new Date(Date.UTC(y, mo - i, 1));
    const d1 = new Date(Date.UTC(y, mo - i + 1, 0, 23, 59, 59));
    const ym = `${d0.getUTCFullYear()}-${String(d0.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = d0.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' });
    months.push({ ym, label, map: unitMrrMap(fees, d0.getTime(), d1.getTime()) });
  }

  // Måned-for-måned bevegelse (til stolpediagram)
  const monthly = [];
  for (let i = 1; i < months.length; i++) {
    const w = waterfallBetween(months[i - 1].map, months[i].map);
    monthly.push({ ym: months[i].ym, label: months[i].label, ...w, netNew: round2(w.neu + w.expansion - w.contraction - w.churn) });
  }

  // Kohort-retensjon: bruk tidligste måned med MRR>0 som start
  const cur = months[months.length - 1];
  const startIdx = months.findIndex((m) => sumMap(m.map) > 0);
  let retention = { nrr: null, grr: null, start: 0, expansion: 0, contraction: 0, churn: 0 };
  let windowMonths = 0, startMonth = null, overall = null;
  if (startIdx >= 0 && startIdx < months.length - 1) {
    retention = retentionOf(months[startIdx].map, cur.map);
    overall = waterfallBetween(months[startIdx].map, cur.map);
    windowMonths = (months.length - 1) - startIdx;
    startMonth = months[startIdx].ym;
  } else if (startIdx === months.length - 1) {
    // Kun data i inneværende måned → ingen historikk å regne retensjon på
    overall = waterfallBetween(new Map(), cur.map);
    startMonth = cur.ym;
  }

  // CAC / LTV fra KPI-motoren
  let cac = null, ltv = null, ltvCac = null;
  try {
    const kpi = await computeKpiDashboard(db, { days: 90 });
    const h = kpi && kpi.hero;
    if (h) {
      cac = h.cac?.value ?? h.cac ?? null;
      ltv = h.ltv?.value ?? h.ltv ?? null;
      ltvCac = h.ltvCac?.value ?? h.ltvCac ?? null;
    }
  } catch (_) {}

  const grossMarginPct = settings.forecast?.grossMarginPct != null ? Number(settings.forecast.grossMarginPct) : 0.85;
  const curMrr = sumMap(cur.map);
  const activeUnits = cur.map.size;
  const arpa = activeUnits > 0 ? round2(curMrr / activeUnits) : 0;
  const monthlyGrossProfitPerUnit = round2(arpa * grossMarginPct);
  const paybackMonths = (cac != null && cac > 0 && monthlyGrossProfitPerUnit > 0) ? Math.round((cac / monthlyGrossProfitPerUnit) * 10) / 10 : null;

  // Attribusjon (aktive enheter nå)
  const attr = { marketing: { count: 0, mrr: 0 }, organisk: { count: 0, mrr: 0 }, ukjent: { count: 0, mrr: 0 } };
  const nowStart = new Date(Date.UTC(y, mo, 1)).getTime();
  const nowEnd = new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59)).getTime();
  const leaseProps = new Set();
  for (const f of fees) if (f.type === 'leiekontrakt' && f.propertyId && activeInMonth(f.activeFrom, f.endDate, nowStart, nowEnd)) leaseProps.add(f.propertyId);
  for (const f of fees) {
    if (!activeInMonth(f.activeFrom, f.endDate, nowStart, nowEnd)) continue;
    if (f.type !== 'leiekontrakt' && f.propertyId && leaseProps.has(f.propertyId)) continue;
    const b = attributionBucket(f);
    attr[b].count += 1; attr[b].mrr = round2(attr[b].mrr + f.amount);
  }
  const attrTotal = round2(attr.marketing.mrr + attr.organisk.mrr + attr.ukjent.mrr);
  const marketingSharePct = attrTotal > 0 ? Math.round((attr.marketing.mrr / attrTotal) * 1000) / 10 : null;

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK',
    horizon,
    mrrNow: curMrr,
    arrNow: round2(curMrr * 12),
    activeUnits,
    arpa,
    retention: { ...retention, windowMonths, startMonth },
    waterfall: overall,        // start-kohort → nå (inkl. ny)
    movement: monthly,         // måned-for-måned bevegelse
    payback: { cac, ltv, ltvCac, grossMarginPct, monthlyGrossProfitPerUnit, paybackMonths },
    attribution: { buckets: attr, total: attrTotal, marketingSharePct, hasData: attrTotal > 0 && (attr.marketing.mrr > 0 || attr.organisk.mrr > 0) },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DRIVER-BASERT PROGNOSE (forecasting) — vekst, churn, CAC, ramp
// ═══════════════════════════════════════════════════════════════════════════
export async function computeForecast(db, { months = 18, assumptions = {} } = {}) {
  const M = Math.max(1, Math.min(60, Number(months) || 18));
  const [contracts, settings, res] = await Promise.all([listContractsDeduped(db), getFinanceSettings(db), computeResultat(db)]);
  const { llmMonthly, extMonthly, platformMonthly } = await autoCosts(db, settings);

  // Avledede standardverdier fra faktiske data
  const activeC = contracts.filter((c) => (c.status || 'active') !== 'terminated' && (c.status || '') !== 'expired');
  const rents = activeC.map((c) => Number(c.monthlyRent != null ? c.monthlyRent : c.estimatedMonthlyRent) || 0).filter((x) => x > 0);
  const avgRent = rents.length ? Math.round(rents.reduce((s, x) => s + x, 0) / rents.length) : 15000;
  const feePcts = activeC.map((c) => Number(c.feePercent) || 0).filter((x) => x > 0);
  const avgFeePct = feePcts.length ? Math.round((feePcts.reduce((s, x) => s + x, 0) / feePcts.length) * 10) / 10 : 10;
  let cacDefault = 0;
  try { const kpi = await computeKpiDashboard(db, { days: 90 }); cacDefault = Number(kpi?.hero?.cac?.value ?? kpi?.hero?.cac ?? 0) || 0; } catch (_) {}

  const saved = settings.forecast || {};
  const pick = (k, fb) => { const a = num(assumptions[k]); if (a != null) return a; const s = num(saved[k]); if (s != null) return s; return fb; };
  const A = {
    newContractsPerMonth: Math.max(0, pick('newContractsPerMonth', 2)),
    avgRentPerNewContract: Math.max(0, pick('avgRentPerNewContract', avgRent)),
    avgFeePercent: Math.max(0, pick('avgFeePercent', avgFeePct)),
    monthlyChurnPct: Math.max(0, pick('monthlyChurnPct', 0)),
    opexGrowthPct: pick('opexGrowthPct', 0),
    cacPerContract: Math.max(0, pick('cacPerContract', Math.round(cacDefault))),
    rampMonths: Math.max(0, Math.round(pick('rampMonths', 0))),
    grossMarginPct: pick('grossMarginPct', 0.85),
  };

  const opening = settings.openingCashBalance != null ? Number(settings.openingCashBalance) : null;
  const startMrr = res.monthly.incomeForventet;
  const startCount = res.monthly.activeContracts || 0;
  const baseOpexExMarketing = round2((res.monthly.opexManual || 0) + (llmMonthly || 0) + (extMonthly || 0) + (platformMonthly || 0));

  const b0 = new Date();
  const sy = b0.getUTCFullYear(), sm = b0.getUTCMonth();

  const runScenario = (aa) => {
    const newFeePerContract = round2(aa.avgRentPerNewContract * (aa.avgFeePercent / 100));
    const addAt = {};
    let mrr = startMrr, cash = opening != null ? opening : 0, count = startCount;
    const series = [];
    let breakevenMonth = null, cashoutMonth = null;
    for (let i = 0; i < M; i++) {
      const d0 = new Date(Date.UTC(sy, sm + i, 1));
      const ym = `${d0.getUTCFullYear()}-${String(d0.getUTCMonth() + 1).padStart(2, '0')}`;
      const label = d0.toLocaleDateString('nb-NO', { month: 'short', year: '2-digit' });
      // planlegg nye kontrakter (realiseres etter ramp)
      const addedFee = round2(aa.newContractsPerMonth * newFeePerContract);
      addAt[i + aa.rampMonths] = round2((addAt[i + aa.rampMonths] || 0) + addedFee);
      const newMrr = round2(addAt[i] || 0);
      mrr = round2(mrr + newMrr);
      // churn
      const churnAmt = round2(mrr * (aa.monthlyChurnPct / 100));
      mrr = Math.max(0, round2(mrr - churnAmt));
      // antall avtaler
      count = Math.max(0, Math.round(count * (1 - aa.monthlyChurnPct / 100) + aa.newContractsPerMonth));
      // kostnader
      const opex = round2(baseOpexExMarketing * Math.pow(1 + (aa.opexGrowthPct / 100), i));
      const marketing = round2(aa.newContractsPerMonth * aa.cacPerContract);
      const cost = round2(opex + marketing);
      const net = round2(mrr - cost);
      cash = round2(cash + net);
      if (breakevenMonth === null && net >= 0) breakevenMonth = i;
      if (cashoutMonth === null && opening != null && cash < 0) cashoutMonth = i;
      series.push({ ym, label, mrr, arr: round2(mrr * 12), newMrr, churn: churnAmt, opex, marketing, cost, net, cash: opening != null ? cash : null, activeContracts: count });
    }
    const last = series[series.length - 1] || {};
    const summary = {
      startMrr, endMrr: last.mrr != null ? last.mrr : startMrr,
      endArr: round2((last.mrr != null ? last.mrr : startMrr) * 12),
      endCash: opening != null ? (last.cash != null ? last.cash : cash) : null,
      breakevenMonth, cashoutMonth,
      runwayMonths: cashoutMonth != null ? cashoutMonth : null,
      endActiveContracts: last.activeContracts != null ? last.activeContracts : startCount,
    };
    return { series, summary };
  };

  const base_ = runScenario(A);
  const konservativ = runScenario({ ...A, newContractsPerMonth: round2(A.newContractsPerMonth * 0.5), monthlyChurnPct: A.monthlyChurnPct + 1 });
  const aggressiv = runScenario({ ...A, newContractsPerMonth: round2(A.newContractsPerMonth * 2) });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK',
    months: M,
    opening, openingSet: opening != null,
    assumptions: A,
    defaults: { avgRent, avgFeePct, cacDefault: Math.round(cacDefault), startMrr, startCount, baseOpexExMarketing },
    scenarios: { konservativ, base: base_, aggressiv },
  };
}

// Samlet styrepakke (board-pack): alt investorer trenger i én payload.
export async function computeBoardPack(db) {
  const [res, liq, inv, fc, mrrHistory, settings] = await Promise.all([
    computeResultat(db),
    computeLikviditet(db, { months: 12 }),
    computeInvestorMetrics(db, { horizon: 12 }),
    computeForecast(db, { months: 18 }),
    computeMrrHistory(db, { months: 12 }),
    getFinanceSettings(db),
  ]);
  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK',
    company: { name: 'DigiHome', period: currentYm() },
    resultat: res,
    likviditet: { summary: liq.summary, opening: liq.opening, openingSet: liq.openingSet, scenarios: liq.scenarios, months: liq.months },
    investor: inv,
    forecast: fc,
    mrrHistory,
    settings: { openingCashBalance: settings.openingCashBalance, openingCashDate: settings.openingCashDate },
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// KUNDER — avledet fra synkede kontrakter (owner.id). Kunde = UTLEIER (betaler
// prosent av leie). Leietakere er IKKE kunder og inngår ikke her.
// ═══════════════════════════════════════════════════════════════════════════
const TERMINATED_STATUSES = ['terminated', 'expired', 'cancelled', 'canceled', 'ended', 'avsluttet', 'terminert'];

export async function computeCustomers(db) {
  const contracts = await listContractsDeduped(db);
  const now = new Date();
  const y = now.getUTCFullYear(), mo = now.getUTCMonth();
  const mStart = Date.UTC(y, mo, 1);
  const mEnd = Date.UTC(y, mo + 1, 0, 23, 59, 59);

  const keyOf = (c) => (c.ownerId ? `id:${c.ownerId}` : (c.ownerName && c.ownerName.trim() ? `nm:${c.ownerName.trim().toLowerCase()}` : `prop:${c.propertyId || c.id}`));
  const groups = new Map();
  for (const c of contracts) {
    const k = keyOf(c);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(c);
  }

  const customers = [];
  for (const [key, cs] of groups) {
    const fees = cs.map((c) => ({ ...contractMonthlyFee(c), type: c.type, status: (c.status || 'active'), pid: c.propertyId || null }));
    // dedupe: en enhet med aktiv leiekontrakt dekker forvaltningsavtalen
    const leaseProps = new Set();
    cs.forEach((c, i) => { if (c.type === 'leiekontrakt' && c.propertyId && activeInMonth(fees[i].activeFrom, fees[i].endDate, mStart, mEnd)) leaseProps.add(c.propertyId); });

    let mrr = 0, activeContracts = 0, pendingContracts = 0, anyActive = false;
    const propIds = new Set(); const types = new Set(); const statusBreakdown = {};
    let sinceTs = Infinity; const channelCounts = {};
    cs.forEach((c, i) => {
      const f = fees[i];
      if (c.propertyId) propIds.add(c.propertyId);
      types.add(c.type);
      const st = (c.status || 'active');
      statusBreakdown[st] = (statusBreakdown[st] || 0) + 1;
      const isTerm = TERMINATED_STATUSES.includes(st.toLowerCase());
      if (!isTerm) anyActive = true;
      const sd = ts(c.startDate || c.expectedRentStart);
      if (isFinite(sd) && sd < sinceTs) sinceTs = sd;
      const ch = c.attribution && (c.attribution.channel || c.attribution.source);
      if (ch) channelCounts[ch] = (channelCounts[ch] || 0) + 1;
      if (isTerm) return;
      const isActiveNow = activeInMonth(f.activeFrom, f.endDate, mStart, mEnd);
      if (isActiveNow) {
        activeContracts++;
        const deduped = c.type !== 'leiekontrakt' && c.propertyId && leaseProps.has(c.propertyId);
        if (!deduped) mrr = round2(mrr + f.amount);
      } else {
        pendingContracts++;
      }
    });
    const channel = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const name = (cs.find((c) => c.ownerName && c.ownerName.trim())?.ownerName || '').trim() || 'Ukjent eier';
    const email = cs.find((c) => c.ownerEmail)?.ownerEmail || null;
    const phone = cs.find((c) => c.ownerPhone)?.ownerPhone || null;
    customers.push({
      key,
      ownerId: cs.find((c) => c.ownerId)?.ownerId || null,
      name, email, phone,
      properties: propIds.size,
      contracts: cs.length,
      activeContracts, pendingContracts,
      types: [...types],
      status: anyActive ? (mrr > 0 ? 'aktiv' : 'venter') : 'inaktiv',
      mrr, arr: round2(mrr * 12),
      since: isFinite(sinceTs) ? new Date(sinceTs).toISOString().slice(0, 10) : null,
      channel,
      statusBreakdown,
    });
  }
  customers.sort((a, b) => (b.mrr - a.mrr) || (b.contracts - a.contracts));

  const payingCustomers = customers.filter((c) => c.mrr > 0);
  const totalMrr = round2(customers.reduce((s, c) => s + c.mrr, 0));
  const activeCustomers = customers.filter((c) => c.status === 'aktiv').length;
  const arpa = payingCustomers.length > 0 ? round2(totalMrr / payingCustomers.length) : 0;
  const totalProperties = customers.reduce((s, c) => s + c.properties, 0);

  const byChannel = {};
  for (const c of customers) {
    const ch = c.channel || 'ukjent';
    if (!byChannel[ch]) byChannel[ch] = { count: 0, mrr: 0 };
    byChannel[ch].count += 1; byChannel[ch].mrr = round2(byChannel[ch].mrr + c.mrr);
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK',
    dataSource: 'contracts',
    summary: {
      totalCustomers: customers.length,
      activeCustomers,
      payingCustomers: payingCustomers.length,
      totalMrr, arr: round2(totalMrr * 12), arpa, totalProperties,
    },
    byChannel,
    customers,
  };
}

// --- Kunder fra plattformens dedikerte eksport (GET /api/customers/export) ---
// Rikere enn kontrakts-avledning: kontaktinfo, livssyklus (aktiv/pauset/churnet),
// lifetime-honorar og attribusjon. Returnerer null hvis ingen synk er kjørt ennå
// (→ ruten faller tilbake til computeCustomers).
export async function computePlatformCustomers(db) {
  const rows = await db.collection('platform_customers')
    .find({}, { projection: { _id: 0 } })
    .sort({ mrr: -1 })
    .toArray();
  if (!rows.length) return null;

  const STATUS_NO = { active: 'aktiv', paused: 'pauset', churned: 'churnet' };
  const customers = rows.map((r) => ({
    key: r.customerId,
    customerId: r.customerId,
    name: r.name,
    type: r.type || 'privat',
    orgNo: r.orgNo || null,
    email: r.email || null,
    phone: r.phone || null,
    status: STATUS_NO[r.status] || 'aktiv',
    since: r.customerSince || null,
    churnedAt: r.churnedAt || null,
    properties: (r.properties || []).length,
    propertyList: r.properties || [],
    // Enhets-nivå (14/7): units_count fra eksporten er fasit — et bygg kan ha
    // flere utleieenheter (jf. Øvregaten 15 m/ 2 enheter). Fallback: bygg-antall.
    unitsCount: r.unitsCount || (r.properties || []).length,
    units: r.units || [],
    contracts: r.contractsCount || 0,
    activeContracts: r.activeContractsCount || 0,
    pendingContracts: Math.max(0, (r.contractsCount || 0) - (r.activeContractsCount || 0)),
    monthlyRent: r.totalMonthlyRent != null ? round2(r.totalMonthlyRent) : null,
    mrr: round2(r.mrr || 0),
    arr: round2((r.mrr || 0) * 12),
    lifetimeFee: round2(r.lifetimeFee || 0),
    channel: r.channel || null,
    firstLeadId: r.firstLeadId || null,
  }));

  const active = customers.filter((c) => c.status === 'aktiv');
  const paused = customers.filter((c) => c.status === 'pauset');
  const churned = customers.filter((c) => c.status === 'churnet');
  const paying = customers.filter((c) => c.status !== 'churnet' && c.mrr > 0);
  const totalMrr = round2(customers.filter((c) => c.status !== 'churnet').reduce((s, c) => s + c.mrr, 0));
  const arpa = paying.length ? round2(totalMrr / paying.length) : 0;
  const totalProperties = customers.filter((c) => c.status !== 'churnet').reduce((s, c) => s + c.properties, 0);
  const lifetimeFees = round2(customers.reduce((s, c) => s + c.lifetimeFee, 0));
  const churnRatePct = customers.length ? round2((churned.length / customers.length) * 100) : 0;

  const byChannel = {};
  for (const c of customers) {
    const ch = c.channel || 'ukjent';
    if (!byChannel[ch]) byChannel[ch] = { count: 0, mrr: 0 };
    byChannel[ch].count += 1;
    if (c.status !== 'churnet') byChannel[ch].mrr = round2(byChannel[ch].mrr + c.mrr);
  }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK',
    dataSource: 'platform',
    syncedAt: rows[0].syncedAt || null,
    summary: {
      totalCustomers: customers.length,
      activeCustomers: active.length,
      payingCustomers: paying.length,
      pausedCustomers: paused.length,
      churnedCustomers: churned.length,
      churnRatePct,
      totalMrr, arr: round2(totalMrr * 12), arpa, totalProperties,
      lifetimeFees,
    },
    byChannel,
    customers,
  };
}

