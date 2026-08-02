// ---------------------------------------------------------------------------
// INNTEKTSMODELL — tre lag, og en LTV som faktisk henger på virkeligheten.
//
// DigiHome tjener honorar på FAKTISK INNGÅTTE LEIEKONTRAKTER, ikke på signerte
// huseierkontrakter med estimert leie. Derfor skiller vi alltid:
//
//   🟢 FAKTISK     — leiekontrakt signert OG startet → honorar løper nå
//   🟡 KONTRAHERT  — leiekontrakt inngått/underveis, men ikke startet ennå
//   ⚪ POTENSIAL   — forvaltningsavtale UTEN leiekontrakt (estimert leie)
//
// LTV bygges kun på FAKTISK honorar. Estimert leie brukes til prognose, og da
// risikojustert med aktiveringsraten (hvor stor andel av forvaltningsavtalene
// som faktisk ender i en leiekontrakt).
// ---------------------------------------------------------------------------
import { listContracts, dedupeContracts } from '@/lib/finance';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const round1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const DAY = 86400000;

const LEASE_SIGNED = ['signed', 'active', 'aktiv', 'signert', 'løpende', 'lopende', ''];
const TERMINATED = ['terminated', 'expired', 'cancelled', 'canceled', 'kansellert', 'avsluttet', 'utløpt'];

export const REVENUE_RULES = ['signed_started', 'signed', 'pending'];
export const RULE_LABELS = {
  signed_started: 'Signert leiekontrakt som har startet',
  signed: 'Signert leiekontrakt (også fremtidig start)',
  pending: 'Alle leiekontrakter, også ikke ferdig signerte',
};

const ts = (v) => (v ? Date.parse(v) : NaN);
const feeOf = (c, rent) => {
  const pct = (Number(c.feePercent) || 0) / 100;
  return round2((Number(rent) || 0) * pct);
};
const ownerKey = (c) => c.ownerId || (c.ownerName || '').trim().toLowerCase() || c.externalContractId || c.id;

function median(arr) {
  const a = arr.filter((x) => isFinite(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

export async function computeRevenueModel(db, opts = {}) {
  let contracts = [];
  try { contracts = await listContracts(db); } catch (_) { contracts = []; }
  return computeRevenueFromContracts(contracts, opts);
}

// ---------------------------------------------------------------------------
// REN MOTOR. Samme kode brukes for (a) lokalt lagrede kontrakter og (b)
// kontrakter hentet direkte fra plattformen ved avstemming («prod-fasit»).
// Dedupe skjer HER, slik at begge sider garantert behandles identisk — ellers
// er en avstemming verdiløs.
// ---------------------------------------------------------------------------
export function computeRevenueFromContracts(input = [], {
  lifetimeMonths = 36,
  grossMarginPct = null,      // null = vis LTV som ren omsetning
  leaseActualRule = 'signed_started',
  fullBreakdown = false,      // true = ikke kutt breakdown-listene (brukes av drill-down)
} = {}) {
  const rawTotal = Array.isArray(input) ? input.length : 0;
  let contracts = [];
  try { contracts = dedupeContracts(Array.isArray(input) ? input : []); } catch (_) { contracts = []; }
  const rule = REVENUE_RULES.includes(leaseActualRule) ? leaseActualRule : 'signed_started';
  const months = Math.max(1, Math.min(240, Number(lifetimeMonths) || 36));
  const margin = grossMarginPct != null && grossMarginPct > 0 ? Math.min(100, Number(grossMarginPct)) / 100 : 1;
  const now = Date.now();

  const live = contracts.filter((c) => !TERMINATED.includes(String(c.status || '').toLowerCase()));
  const leases = live.filter((c) => c.type === 'leiekontrakt');
  const mgmt = live.filter((c) => c.type !== 'leiekontrakt');

  // --- Klassifiser leiekontrakter i faktisk / kontrahert / utløpt ----------
  const actual = [], contracted = [], expiring = [];
  const propsWithLiveLease = new Set();
  for (const c of leases) {
    const fee = feeOf(c, c.monthlyRent);
    const st = String(c.status || 'signed').toLowerCase();
    const signed = LEASE_SIGNED.includes(st);
    const start = ts(c.startDate);
    const end = ts(c.endDate);
    const started = !isFinite(start) || start <= now;
    const ongoing = !isFinite(end) || end >= now;
    if (c.propertyId && ongoing) propsWithLiveLease.add(c.propertyId);
    if (!fee || !ongoing) continue;
    const isActual = rule === 'pending' ? started : (rule === 'signed' ? signed : (signed && started));
    const row = {
      id: c.id, contractId: c.externalContractId || null,
      owner: c.ownerName || '', ownerId: c.ownerId || null,
      property: c.propertyAddress || '', propertyId: c.propertyId || null,
      tenant: c.tenantName || '',
      monthlyRent: Number(c.monthlyRent) || 0, feePercent: Number(c.feePercent) || 0,
      fee, status: st, startDate: c.startDate || null, endDate: c.endDate || null,
    };
    if (isActual && started) actual.push(row); else contracted.push(row);
    // MRR i faresonen: løpende honorar som utløper innen 90 dager
    if (isActual && started && isFinite(end) && end - now <= 90 * DAY) expiring.push(row);
  }

  // --- Potensial: forvaltningsavtaler uten noen levende leiekontrakt -------
  const potential = [];
  for (const c of mgmt) {
    if (c.propertyId && propsWithLiveLease.has(c.propertyId)) continue;
    const rent = c.estimatedMonthlyRent != null ? c.estimatedMonthlyRent : c.monthlyRent;
    const fee = feeOf(c, rent);
    potential.push({
      id: c.id, contractId: c.externalContractId || null,
      owner: c.ownerName || '', ownerId: c.ownerId || null,
      property: c.propertyAddress || '', propertyId: c.propertyId || null,
      estimatedMonthlyRent: Number(rent) || 0, feePercent: Number(c.feePercent) || 0,
      fee, status: String(c.status || '').toLowerCase(),
      expectedRentStart: c.expectedRentStart || null,
      hasEstimate: fee > 0,
    });
  }

  const sum = (rows) => round2(rows.reduce((s, r) => s + (r.fee || 0), 0));
  const mrrActual = sum(actual);
  const mrrContracted = sum(contracted);
  const mrrPotential = sum(potential);
  const mrrAtRisk = sum(expiring);

  // --- Kunder ------------------------------------------------------------
  const mgmtOwners = new Set(mgmt.map(ownerKey).filter(Boolean));
  const allOwners = new Set(live.map(ownerKey).filter(Boolean));
  const earningOwners = new Set(actual.map((r) => r.ownerId || (r.owner || '').trim().toLowerCase()).filter(Boolean));
  const contractedOwners = new Set(contracted.map((r) => r.ownerId || (r.owner || '').trim().toLowerCase()).filter(Boolean));
  for (const o of earningOwners) contractedOwners.delete(o);

  // Nevneren må være ALLE kunder med en levende kontrakt — ikke bare de som har
  // en forvaltningsavtale i eksporten. Ellers kan aktiveringsraten overstige
  // 100 % når en leiekontrakt finnes uten tilhørende forvaltningsavtale.
  const managementCustomers = Math.max(allOwners.size, mgmtOwners.size, earningOwners.size);
  const earningCustomers = earningOwners.size;
  const activationRate = managementCustomers > 0 ? round1(Math.min(100, (earningCustomers / managementCustomers) * 100)) : null;
  const feePerEarningCustomer = earningCustomers > 0 ? round2(mrrActual / earningCustomers) : null;

  // --- Tid fra forvaltningsavtale til første leieinntekt -------------------
  const mgmtStartByOwner = new Map();
  for (const c of mgmt) {
    const k = ownerKey(c); if (!k) continue;
    const t = ts(c.startDate);
    if (!isFinite(t)) continue;
    if (!mgmtStartByOwner.has(k) || t < mgmtStartByOwner.get(k)) mgmtStartByOwner.set(k, t);
  }
  const gaps = [];
  const firstLeaseByOwner = new Map();
  for (const r of [...actual, ...contracted]) {
    const k = r.ownerId || (r.owner || '').trim().toLowerCase(); if (!k) continue;
    const t = ts(r.startDate);
    if (!isFinite(t)) continue;
    if (!firstLeaseByOwner.has(k) || t < firstLeaseByOwner.get(k)) firstLeaseByOwner.set(k, t);
  }
  for (const [k, leaseT] of firstLeaseByOwner) {
    const mgmtT = mgmtStartByOwner.get(k);
    if (mgmtT != null && leaseT >= mgmtT) gaps.push((leaseT - mgmtT) / DAY);
  }
  const daysToFirstLease = gaps.length ? round1(median(gaps)) : null;

  // --- LTV ---------------------------------------------------------------
  // LTV = faktisk månedshonorar per kunde × forventet levetid × bruttomargin
  const ltv = feePerEarningCustomer != null ? round2(feePerEarningCustomer * months * margin) : null;
  const ltvSensitivity = feePerEarningCustomer != null
    ? [24, 36, 48].map((m) => ({ months: m, ltv: round2(feePerEarningCustomer * m * margin) }))
    : [];

  // Sekundær, framoverskuende LTV: inkluderer KONTRAHERTE leiekontrakter (de er
  // inngått, men har ikke startet ennå). Nyttig når utvalget av kunder med
  // løpende leieinntekt er lite — men den er IKKE realisert inntekt.
  const anyLeaseOwners = new Set([...actual, ...contracted].map((r) => r.ownerId || (r.owner || '').trim().toLowerCase()).filter(Boolean));
  const feePerCustomerWithLease = anyLeaseOwners.size > 0 ? round2((mrrActual + mrrContracted) / anyLeaseOwners.size) : null;
  const ltvContracted = feePerCustomerWithLease != null ? round2(feePerCustomerWithLease * months * margin) : null;

  // Forventet honorar på nye forvaltningsavtaler (estimat) — brukes til prognose.
  const potWithEstimate = potential.filter((p) => p.hasEstimate);
  const expectedMonthlyFeePerNew = potWithEstimate.length ? round2(mrrPotential / potWithEstimate.length) : null;
  // Risikojustert: bare en andel av forvaltningsavtalene blir faktisk utleid.
  const actRate = activationRate != null ? activationRate / 100 : null;
  const ltvRiskAdjusted = (expectedMonthlyFeePerNew != null && actRate != null)
    ? round2(expectedMonthlyFeePerNew * actRate * months * margin) : null;

  const mrrTotalPipeline = round2(mrrActual + mrrContracted + mrrPotential);
  const revenueQualityPct = mrrTotalPipeline > 0 ? round1((mrrActual / mrrTotalPipeline) * 100) : null;

  // --- Oppstartsplan: når begynner de kontraherte kontraktene å gi penger? --
  // Uten dette ser en portefølje med mange fremtidige leiestarter kunstig svak
  // ut («9 % inntektskvalitet»), selv om pengene er sikret og starter om uker.
  const ramp = [30, 60, 90].map((d) => {
    const cutoff = now + d * DAY;
    const starting = contracted.filter((r) => { const s = ts(r.startDate); return isFinite(s) && s <= cutoff; });
    const added = sum(starting);
    return { inDays: d, startingCount: starting.length, addedMrr: added, mrr: round2(mrrActual + added) };
  });
  const upcomingStarts = contracted
    .filter((r) => { const s = ts(r.startDate); return isFinite(s) && s > now; })
    .sort((a, b) => ts(a.startDate) - ts(b.startDate))
    .slice(0, 25);

  // Honorar per EIER — brukes til å koble faktisk honorar tilbake på leadet,
  // slik at estimatet ved signert huseierkontrakt kan sammenlignes med fasit.
  const ownerFees = {};
  const bump = (key, name, field, amount, countField) => {
    if (!key) return;
    const k = String(key);
    if (!ownerFees[k]) ownerFees[k] = { ownerId: k, name: name || '', monthlyFeeActual: 0, monthlyFeeContracted: 0, activeLeases: 0, contractedLeases: 0 };
    ownerFees[k][field] = round2(ownerFees[k][field] + amount);
    ownerFees[k][countField] += 1;
    if (!ownerFees[k].name && name) ownerFees[k].name = name;
  };
  for (const r of actual) bump(r.ownerId || (r.owner || '').trim().toLowerCase(), r.owner, 'monthlyFeeActual', r.fee, 'activeLeases');
  for (const r of contracted) bump(r.ownerId || (r.owner || '').trim().toLowerCase(), r.owner, 'monthlyFeeContracted', r.fee, 'contractedLeases');

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    currency: 'NOK',
    rule, ruleLabel: RULE_LABELS[rule], lifetimeMonths: months,
    grossMarginPct: grossMarginPct != null ? Number(grossMarginPct) : null,
    hasData: contracts.length > 0,
    contractsTotal: contracts.length,
    contractsRaw: rawTotal,
    duplicatesRemoved: Math.max(0, rawTotal - contracts.length),
    tiers: {
      actual: { mrr: mrrActual, arr: round2(mrrActual * 12), count: actual.length, customers: earningCustomers, label: 'Faktisk — signert og startet leiekontrakt' },
      contracted: { mrr: mrrContracted, arr: round2(mrrContracted * 12), count: contracted.length, customers: contractedOwners.size, label: 'Kontrahert — leiekontrakt inngått, ikke startet' },
      potential: { mrr: mrrPotential, arr: round2(mrrPotential * 12), count: potential.length, customers: new Set(potential.map((r) => r.ownerId || (r.owner || '').trim().toLowerCase()).filter(Boolean)).size, withEstimate: potential.filter((p) => p.hasEstimate).length, label: 'Potensial — forvaltningsavtale uten leiekontrakt (estimert leie)' },
    },
    mrr: { actual: mrrActual, contracted: mrrContracted, potential: mrrPotential, totalPipeline: mrrTotalPipeline, atRisk90d: mrrAtRisk },
    customers: {
      management: managementCustomers,
      earning: earningCustomers,
      contractedOnly: contractedOwners.size,
      awaitingLease: Math.max(0, managementCustomers - earningCustomers),
      activationRatePct: activationRate,
      feePerEarningCustomer,
    },
    ltv: {
      value: ltv,
      basis: 'faktisk månedshonorar per kunde × levetid × bruttomargin',
      monthlyFee: feePerEarningCustomer,
      lifetimeMonths: months,
      grossMarginPct: grossMarginPct != null ? Number(grossMarginPct) : 100,
      sensitivity: ltvSensitivity,
      riskAdjustedNewCustomer: ltvRiskAdjusted,
      expectedMonthlyFeePerNew,
      // Framoverskuende: inkluderer kontraherte (inngåtte, ikke startede) leiekontrakter
      contractedBasis: {
        value: ltvContracted,
        monthlyFee: feePerCustomerWithLease,
        customersWithLease: anyLeaseOwners.size,
      },
    },
    timing: { daysToFirstLease, sampleSize: gaps.length },
    revenueQualityPct,
    // Når slår kontrahert MRR inn? (faktisk MRR + kontrakter som starter innen X dager)
    ramp,
    upcomingStarts,
    ownerFees,
    expiring90d: fullBreakdown ? expiring : expiring.slice(0, 20),
    // Toppliste for gjennomsiktighet i UI
    breakdown: {
      actual: actual.sort((a, b) => b.fee - a.fee).slice(0, fullBreakdown ? 5000 : 30),
      contracted: contracted.sort((a, b) => b.fee - a.fee).slice(0, fullBreakdown ? 5000 : 30),
      potential: potential.sort((a, b) => b.fee - a.fee).slice(0, fullBreakdown ? 5000 : 30),
    },
  };
}

// ---------------------------------------------------------------------------
// KOBLE FAKTISK HONORAR TILBAKE PÅ LEADET.
//
// `wonValue` settes når HUSEIERKONTRAKTEN signeres og er derfor et ESTIMAT
// (estimert leie × honorar% × 12). Fasit kommer først når leiekontrakten er
// inngått. Her bygger vi et oppslag lead → faktisk honorar, slik at estimat og
// fasit kan vises side om side (og estimat-avvik kan følges opp).
//
// Koblingsnøkler, i prioritert rekkefølge:
//   1. plattformens attribution.first_lead_id  (eksakt)
//   2. e-post
//   3. normalisert navn
// ---------------------------------------------------------------------------
export async function buildLeadFeeIndex(db, settings = {}) {
  const model = await computeRevenueModel(db, settings);
  const fees = model.ownerFees || {};
  let customers = [];
  try {
    customers = await db.collection('platform_customers')
      .find({}, { projection: { _id: 0, customerId: 1, name: 1, email: 1, phone: 1, firstLeadId: 1, lifetimeFee: 1, customerSince: 1, activeContractsCount: 1, contractsCount: 1, mrr: 1, status: 1 } })
      .limit(5000).toArray();
  } catch (_) { customers = []; }

  const byLeadId = {}, byEmail = {}, byName = {};
  for (const c of customers) {
    const f = fees[c.customerId] || fees[String(c.name || '').trim().toLowerCase()] || null;
    const monthlyFeeActual = f?.monthlyFeeActual ?? 0;
    const monthlyFeeContracted = f?.monthlyFeeContracted ?? 0;
    const entry = {
      customerId: c.customerId || null,
      customerName: c.name || '',
      customerStatus: c.status || null,
      customerSince: c.customerSince || null,
      monthlyFeeActual: round2(monthlyFeeActual),
      monthlyFeeContracted: round2(monthlyFeeContracted),
      actualAnnualFee: round2(monthlyFeeActual * 12),
      contractedAnnualFee: round2((monthlyFeeActual + monthlyFeeContracted) * 12),
      activeLeases: f?.activeLeases ?? (c.activeContractsCount || 0),
      contractedLeases: f?.contractedLeases ?? 0,
      platformMonthlyFee: c.mrr != null ? round2(c.mrr) : null,
      lifetimeFee: c.lifetimeFee != null ? round2(c.lifetimeFee) : 0,
      hasLease: monthlyFeeActual > 0,
    };
    if (c.firstLeadId) byLeadId[String(c.firstLeadId)] = entry;
    if (c.email) byEmail[String(c.email).toLowerCase().trim()] = entry;
    if (c.name) byName[String(c.name).toLowerCase().trim()] = entry;
  }
  return { byLeadId, byEmail, byName, customers: customers.length, generatedAt: model.generatedAt };
}

export function matchLeadFee(index, lead) {
  if (!index || !lead) return null;
  for (const id of [lead.id, lead.platform_id, lead.external_ref]) {
    if (id && index.byLeadId[String(id)]) return index.byLeadId[String(id)];
  }
  const em = (lead.email || '').toString().toLowerCase().trim();
  if (em && index.byEmail[em]) return index.byEmail[em];
  const nm = (lead.name || '').toString().toLowerCase().trim();
  if (nm && nm.length > 3 && index.byName[nm]) return index.byName[nm];
  return null;
}

// Beriker et lead med estimat vs. fasit på årshonorar.
export function attachFeeTruth(lead, index) {
  const f = index ? matchLeadFee(index, lead) : null;
  if (!f) return lead;
  const estimate = Number(lead.wonValueActual ?? lead.wonValue ?? lead.wonValueEstimate ?? 0) || 0;
  const actual = f.actualAnnualFee || 0;
  return {
    ...lead,
    feeTruth: {
      ...f,
      estimateAnnual: estimate || null,
      // Positivt = faktisk honorar er høyere enn vi estimerte
      deltaPct: estimate > 0 && actual > 0 ? Math.round(((actual - estimate) / estimate) * 100) : null,
      basis: actual > 0 ? 'leiekontrakt' : (f.contractedAnnualFee > 0 ? 'kontrahert' : 'ingen leiekontrakt'),
    },
  };
}
