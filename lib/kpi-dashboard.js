// ---------------------------------------------------------------------------
// KPI-dashbord ("Nøkkeltall / Ledelse") — investorklare nøkkeltall.
//
// Kombinerer:
//  • Lead-hastighet & konvertering (leads/tenant_leads) — tid til kunde, responstid
//  • Annonseøkonomi (buildMarketingMetrics) — forbruk, CPL, CAC, ROAS
//  • Helhetsbilde (inkl. historisk imported_leads) — totalt antall kunder + snittverdi
//  • Konfigurerbar LTV-modell (engangs kontraktsverdi ELLER løpende honorar × levetid)
//
// PRINSIPP: Totaler & snittverdi = helhetsbilde (sporet + historisk).
//           Effektivitet (CPL/CAC/ROAS) = KUN sporet/betalt (vi har ikke forbruk for pre-sporing).
//           Ingen tall fabrikkeres — LTV-modellen krever eksplisitt input.
// ---------------------------------------------------------------------------
import { buildMarketingMetrics } from '@/lib/marketing-metrics';
import { IMPORTED_COLL } from '@/lib/imported-leads';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const round1 = (x) => Math.round((Number(x) || 0) * 10) / 10;

function pctChange(cur, prev) {
  cur = Number(cur) || 0; prev = Number(prev) || 0;
  if (prev > 0) return round1(((cur - prev) / prev) * 100);
  if (cur > 0) return 100;
  return null;
}

const SETTINGS_COLL = 'dashboard_settings';

export async function getKpiSettings(db) {
  let doc = null;
  try { doc = await db.collection(SETTINGS_COLL).findOne({ id: 'kpi' }); } catch (_) {}
  return {
    ltvMode: doc?.ltvMode === 'recurring' ? 'recurring' : 'contract',
    monthlyFee: doc?.monthlyFee != null ? Number(doc.monthlyFee) : null,
    lifetimeMonths: doc?.lifetimeMonths != null ? Number(doc.lifetimeMonths) : null,
    northStar: doc?.northStar || 'ltv_cac',
    updatedAt: doc?.updatedAt || null,
  };
}

export async function setKpiSettings(db, patch = {}) {
  const cur = await getKpiSettings(db);
  const next = {
    id: 'kpi',
    ltvMode: ['contract', 'recurring'].includes(patch.ltvMode) ? patch.ltvMode : cur.ltvMode,
    monthlyFee: patch.monthlyFee !== undefined ? (patch.monthlyFee === null || patch.monthlyFee === '' ? null : Math.max(0, Number(patch.monthlyFee) || 0)) : cur.monthlyFee,
    lifetimeMonths: patch.lifetimeMonths !== undefined ? (patch.lifetimeMonths === null || patch.lifetimeMonths === '' ? null : Math.max(0, Number(patch.lifetimeMonths) || 0)) : cur.lifetimeMonths,
    northStar: ['ltv_cac', 'new_customers', 'revenue', 'cac', 'avg_value'].includes(patch.northStar) ? patch.northStar : cur.northStar,
    updatedAt: new Date().toISOString(),
  };
  await db.collection(SETTINGS_COLL).updateOne({ id: 'kpi' }, { $set: next }, { upsert: true });
  return next;
}

// --- Lett in-memory cache for de dyre annonse-API-kallene (5 min per periode) ---
const _mmCache = new Map(); // key -> { at, data }
const MM_TTL = 5 * 60 * 1000;
async function cachedMarketingMetrics(db, opts) {
  const key = JSON.stringify(opts);
  const hit = _mmCache.get(key);
  if (hit && Date.now() - hit.at < MM_TTL) return hit.data;
  let data = null;
  try { data = await buildMarketingMetrics(db, opts); } catch (e) { data = { _error: e.message }; }
  _mmCache.set(key, { at: Date.now(), data });
  if (_mmCache.size > 40) { for (const [k, v] of _mmCache) if (Date.now() - v.at > MM_TTL) _mmCache.delete(k); }
  return data;
}

function resolveWindow({ days, from, to }) {
  let curTo, curFrom, label, nDays;
  if (from && to) {
    curFrom = new Date(`${from}T00:00:00.000Z`).getTime();
    curTo = new Date(`${to}T23:59:59.999Z`).getTime();
    if (!isFinite(curFrom) || !isFinite(curTo) || curTo <= curFrom) { curTo = Date.now(); curFrom = curTo - 30 * 86400000; }
    label = `${from} – ${to}`;
    nDays = Math.max(1, Math.round((curTo - curFrom) / 86400000));
  } else {
    nDays = Math.max(1, Math.min(3650, Number(days) || 30));
    curTo = Date.now();
    curFrom = curTo - nDays * 86400000;
    label = `Siste ${nDays} dager`;
  }
  const winLen = curTo - curFrom;
  return { curFrom, curTo, prevFrom: curFrom - winLen, prevTo: curFrom, label, nDays };
}

const wonDate = (l) => l.wonAt || (l.status === 'won' ? l.statusUpdatedAt : null) || l.won_at || null;

export async function computeKpiDashboard(db, { days = 30, from, to } = {}) {
  const win = resolveWindow({ days, from, to });
  const settings = await getKpiSettings(db);

  // Hent leads + tenants (begrens til nødvendige felt).
  const proj = { projection: { _id: 0, status: 1, createdAt: 1, wonAt: 1, statusUpdatedAt: 1, firstResponseAt: 1, forwarded_at: 1, wonValue: 1, wonValueActual: 1, wonValueEstimate: 1, wonCurrency: 1, 'attribution.channel': 1 } };
  const [leads, tenants] = await Promise.all([
    db.collection('leads').find({}, proj).limit(50000).toArray(),
    db.collection('tenant_leads').find({}, proj).limit(50000).toArray(),
  ]);
  const all = [...leads, ...tenants];

  const inWin = (ms, a, b) => ms >= a && ms <= b;
  const ts = (v) => (v ? new Date(v).getTime() : NaN);

  // --- Nye leads (periode + forrige) ---
  // VIKTIG: Kun UTLEIER-leads (`leads`) utgjør kunde-trakten. Leietaker-leads
  // (`tenant_leads`) er etterspørselssiden (IKKE betalende kunder) og telles
  // SEPARAT — de skal ikke fortynne CPL, konvertering, kundetall eller LTV/CAC.
  let newLeadsCur = 0, newLeadsPrev = 0;
  const leadsPerDay = new Map();
  for (const l of leads) {
    const c = ts(l.createdAt);
    if (isFinite(c)) {
      if (inWin(c, win.curFrom, win.curTo)) { newLeadsCur++; const d = new Date(c).toISOString().slice(0, 10); leadsPerDay.set(d, (leadsPerDay.get(d) || 0) + 1); }
      else if (inWin(c, win.prevFrom, win.prevTo)) newLeadsPrev++;
    }
  }
  // Leietaker-leads (etterspørsel) — separat metrikk, holdes UTENFOR kunde-trakten.
  let newTenantLeadsCur = 0, newTenantLeadsPrev = 0;
  for (const t of tenants) {
    const c = ts(t.createdAt);
    if (!isFinite(c)) continue;
    if (inWin(c, win.curFrom, win.curTo)) newTenantLeadsCur++;
    else if (inWin(c, win.prevFrom, win.prevTo)) newTenantLeadsPrev++;
  }

  // --- Nye kunder (won etter wonAt i periode) + omsetning + tid-til-kunde ---
  let newCustCur = 0, newCustPrev = 0, revenueCur = 0, revenuePrev = 0;
  let ttwSum = 0, ttwCount = 0;
  const revPerDay = new Map();
  const valueOf = (l) => (l.wonValueActual != null ? l.wonValueActual : (l.wonValue != null ? l.wonValue : (l.wonValueEstimate != null ? l.wonValueEstimate : 0)));
  for (const l of leads) {
    if (l.status !== 'won') continue;
    const w = ts(wonDate(l));
    if (!isFinite(w)) continue;
    const val = Number(valueOf(l)) || 0;
    if (inWin(w, win.curFrom, win.curTo)) {
      newCustCur++; revenueCur += val;
      const d = new Date(w).toISOString().slice(0, 10); revPerDay.set(d, (revPerDay.get(d) || 0) + val);
      const c = ts(l.createdAt);
      if (isFinite(c) && w >= c) { const days = (w - c) / 86400000; if (days <= 730) { ttwSum += days; ttwCount++; } }
    } else if (inWin(w, win.prevFrom, win.prevTo)) { newCustPrev++; revenuePrev += val; }
  }

  // --- Responstid (lead→første kontakt) i periode ---
  let respSum = 0, respCount = 0, slaHit = 0;
  for (const l of leads) {
    const c = ts(l.createdAt); if (!isFinite(c) || !inWin(c, win.curFrom, win.curTo)) continue;
    const respAt = l.firstResponseAt || l.forwarded_at || null;
    const r = ts(respAt);
    if (isFinite(r) && r >= c) { const hrs = (r - c) / 3600000; if (hrs < 24 * 90) { respSum += hrs; respCount++; if (hrs <= 24) slaHit++; } }
  }

  // --- Helhetsbilde (all-time): totalt antall kunder + snittverdi (sporet + historisk) ---
  let trackedWon = 0, trackedWonValue = 0;
  for (const l of leads) { if (l.status === 'won') { trackedWon++; trackedWonValue += Number(valueOf(l)) || 0; } }
  let importedWon = 0, importedWonValue = 0, importedTotal = 0;
  try {
    const impAgg = await db.collection(IMPORTED_COLL).aggregate([
      { $group: { _id: null, total: { $sum: 1 }, won: { $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] } }, wonValue: { $sum: { $ifNull: ['$won_value', 0] } } } },
    ]).toArray();
    if (impAgg[0]) { importedTotal = impAgg[0].total; importedWon = impAgg[0].won; importedWonValue = impAgg[0].wonValue; }
  } catch (_) {}
  const totalCustomers = trackedWon + importedWon;
  const totalRevenueAllTime = round2(trackedWonValue + importedWonValue);
  const avgCustomerValue = totalCustomers > 0 ? round2(totalRevenueAllTime / totalCustomers) : 0;

  // --- Annonseøkonomi (sporet/betalt) ---
  const mm = await cachedMarketingMetrics(db, from && to ? { from, to } : { days: win.nDays });
  const spend = mm?.spend || { total: 0, google: 0, meta: 0 };
  const eff = mm?.efficiency || {};
  const cpl = eff.cpl != null ? eff.cpl : (newLeadsCur > 0 && spend.total > 0 ? round2(spend.total / newLeadsCur) : null);
  const cac = eff.cac != null ? eff.cac : (newCustCur > 0 && spend.total > 0 ? round2(spend.total / newCustCur) : null);
  const roasTrue = eff.roasTrue != null ? eff.roasTrue : (spend.total > 0 ? round2(revenueCur / spend.total) : null);
  const roasAds = eff.roasAds != null ? eff.roasAds : null;

  // --- LTV-modell ---
  let ltv, ltvBasis, paybackMonths = null;
  if (settings.ltvMode === 'recurring' && settings.monthlyFee > 0 && settings.lifetimeMonths > 0) {
    ltv = round2(settings.monthlyFee * settings.lifetimeMonths);
    ltvBasis = 'recurring';
    if (cac != null && settings.monthlyFee > 0) paybackMonths = round1(cac / settings.monthlyFee);
  } else {
    ltv = avgCustomerValue;
    ltvBasis = 'contract';
    paybackMonths = eff.cacPaybackMonths != null ? eff.cacPaybackMonths : null;
  }
  const ltvCac = (cac != null && cac > 0 && ltv > 0) ? round1(ltv / cac) : null;

  const conversionRateCur = newLeadsCur > 0 ? round1((newCustCur / newLeadsCur) * 100) : (eff.leadToWonPct != null ? eff.leadToWonPct : 0);
  const conversionRatePrev = newLeadsPrev > 0 ? round1((newCustPrev / newLeadsPrev) * 100) : 0;
  const timeToWin = ttwCount > 0 ? round1(ttwSum / ttwCount) : null;

  // --- Sparkline-serier over perioden ---
  const series = { leads: [], revenue: [] };
  const start = new Date(win.curFrom);
  const dayCount = Math.min(win.nDays, 120); // maks 120 punkter for pen graf
  const stepMs = (win.curTo - win.curFrom) / dayCount;
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(win.curFrom + i * stepMs).toISOString().slice(0, 10);
    series.leads.push({ day: d, value: leadsPerDay.get(d) || 0 });
    series.revenue.push({ day: d, value: round2(revPerDay.get(d) || 0) });
  }
  // For korte perioder: daglig oppløsning
  if (win.nDays <= 120) {
    series.leads = []; series.revenue = [];
    for (let i = 0; i < win.nDays; i++) {
      const d = new Date(win.curFrom + i * 86400000).toISOString().slice(0, 10);
      series.leads.push({ day: d, value: leadsPerDay.get(d) || 0 });
      series.revenue.push({ day: d, value: round2(revPerDay.get(d) || 0) });
    }
  }

  // --- Pipeline (nåværende snapshot, sporede leads) ---
  const PIPE = [['new', 'Ny'], ['contacted', 'Kontaktet'], ['qualified', 'Kvalifisert'], ['won', 'Vunnet'], ['lost', 'Tapt']];
  const pipeCount = {}; for (const l of leads) pipeCount[l.status || 'new'] = (pipeCount[l.status || 'new'] || 0) + 1;
  const pipeline = PIPE.map(([k, label]) => ({ stage: k, label, count: pipeCount[k] || 0 }));

  // --- Konverteringstrakt (kumulativ, all-time sporede leads) med frafall pr. steg ---
  const sc = { new: 0, contacted: 0, qualified: 0, won: 0, lost: 0 };
  for (const l of leads) { const s = l.status || 'new'; if (sc[s] != null) sc[s]++; }
  const totalTracked = leads.length;
  const reachedContacted = sc.contacted + sc.qualified + sc.won;
  const reachedQualified = sc.qualified + sc.won;
  const reachedWon = sc.won;
  const funnelRaw = [
    { stage: 'leads', label: 'Leads', count: totalTracked },
    { stage: 'contacted', label: 'Kontaktet', count: reachedContacted },
    { stage: 'qualified', label: 'Kvalifisert', count: reachedQualified },
    { stage: 'won', label: 'Kunde', count: reachedWon },
  ];
  const funnel = funnelRaw.map((f, i) => {
    const prev = i > 0 ? funnelRaw[i - 1].count : f.count;
    const pctOfTop = totalTracked > 0 ? round1((f.count / totalTracked) * 100) : 0;
    const stepConv = i > 0 && prev > 0 ? round1((f.count / prev) * 100) : 100;
    return { ...f, pctOfTop, stepConv };
  });

  // --- Run-rate / ARR (kun meningsfullt ved løpende LTV-modell) ---
  let runRate = null;
  if (settings.ltvMode === 'recurring' && settings.monthlyFee > 0) {
    const mrr = round2(settings.monthlyFee * totalCustomers);
    runRate = { mrr, arr: round2(mrr * 12), activeCustomers: totalCustomers, monthlyFee: settings.monthlyFee, basis: 'recurring' };
  }

  // --- Månedlig veksthistorikk (siste 12 mnd, sporede leads/kunder) ---
  const mMap = new Map();
  const nowD = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - i, 1));
    const k = d.toISOString().slice(0, 7);
    mMap.set(k, { month: k, label: d.toLocaleDateString('nb-NO', { month: 'short', timeZone: 'UTC' }).replace('.', ''), leads: 0, customers: 0, revenue: 0 });
  }
  for (const l of leads) {
    const c = ts(l.createdAt);
    if (isFinite(c)) { const k = new Date(c).toISOString().slice(0, 7); if (mMap.has(k)) mMap.get(k).leads++; }
    if (l.status === 'won') {
      const w = ts(wonDate(l));
      if (isFinite(w)) { const k = new Date(w).toISOString().slice(0, 7); if (mMap.has(k)) { const o = mMap.get(k); o.customers++; o.revenue = round2(o.revenue + (Number(valueOf(l)) || 0)); } }
    }
  }
  const monthly = [...mMap.values()];

  // --- Kanal-splitt (leads skapt i perioden, gruppert på attribusjonskanal) ---
  const chanMap = new Map();
  for (const l of leads) {
    const c = ts(l.createdAt);
    if (!isFinite(c) || !inWin(c, win.curFrom, win.curTo)) continue;
    const ch = (l.attribution && l.attribution.channel) || 'Direkte';
    const o = chanMap.get(ch) || { channel: ch, leads: 0, customers: 0 };
    o.leads++;
    if (l.status === 'won') o.customers++;
    chanMap.set(ch, o);
  }
  const channels = [...chanMap.values()]
    .sort((a, b) => b.leads - a.leads)
    .map((o) => ({ ...o, share: newLeadsCur > 0 ? round1((o.leads / newLeadsCur) * 100) : 0 }));

  // --- Momentum (i dag / siste 7 dager) — «maskinen lever»-signal ---
  let momentum = null;
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const dayStartIso = `${todayStr}T00:00:00.000Z`;
    const weekDays = [...Array(7)].map((_, i) => new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    const [sToday, s7, lToday, l7] = await Promise.all([
      db.collection('events').aggregate([{ $match: { day: todayStr, sessionId: { $nin: [null, ''] } } }, { $group: { _id: '$sessionId' } }, { $count: 'n' }]).toArray(),
      db.collection('events').aggregate([{ $match: { day: { $in: weekDays }, sessionId: { $nin: [null, ''] } } }, { $group: { _id: '$sessionId' } }, { $count: 'n' }]).toArray(),
      db.collection('leads').countDocuments({ createdAt: { $gte: dayStartIso } }),
      db.collection('leads').countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 86400000).toISOString() } }),
    ]);
    momentum = { sessionsToday: sToday[0]?.n || 0, sessions7d: s7[0]?.n || 0, leadsToday: lToday, leads7d: l7 };
  } catch (_) {}

  // --- Live plattform-MRR (synk fra plattformen; fallback: honorar fra kontrakter) ---
  let platform = null;
  try {
    const agg = await db.collection('platform_customers').aggregate([
      { $match: { status: { $ne: 'churned' } } },
      { $group: { _id: null, mrr: { $sum: { $ifNull: ['$mrr', 0] } }, n: { $sum: 1 } } },
    ]).toArray();
    if (agg.length && agg[0].mrr > 0) platform = { mrr: Math.round(agg[0].mrr), arr: Math.round(agg[0].mrr * 12), customers: agg[0].n, source: 'platform' };
    if (!platform) {
      const fc = await db.collection('finance_contracts').aggregate([
        { $match: { active: { $ne: false } } },
        { $project: { fee: { $multiply: [{ $ifNull: ['$rent', 0] }, { $divide: [{ $ifNull: ['$fee_percent', 0] }, 100] }] } } },
        { $group: { _id: null, mrr: { $sum: '$fee' }, n: { $sum: 1 } } },
      ]).toArray();
      if (fc.length && fc[0].mrr > 0) platform = { mrr: Math.round(fc[0].mrr), arr: Math.round(fc[0].mrr * 12), customers: fc[0].n, source: 'contracts' };
    }
  } catch (_) {}

  // --- Pipeline-verdi (potensial i åpne leads, modellert ærlig) ---
  const openCount = (pipeCount['new'] || 0) + (pipeCount['contacted'] || 0) + (pipeCount['qualified'] || 0);
  const allTimeConv = totalTracked > 0 ? trackedWon / totalTracked : 0;
  const pipelineValue = {
    open: openCount,
    potential: round2(openCount * avgCustomerValue * allTimeConv),
    basis: 'åpne leads × snitt kundeverdi × historisk konvertering',
  };

  // --- Kumulativ omsetningsserie (for vekstgraf) ---
  let cum = 0;
  const cumulativeRevenue = series.revenue.map((p) => { cum = round2(cum + (p.value || 0)); return { day: p.day, value: cum }; });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    period: { label: win.label, days: win.nDays, from: new Date(win.curFrom).toISOString(), to: new Date(win.curTo).toISOString() },
    northStar: settings.northStar,
    hero: {
      ltvCac: { value: ltvCac, ltv, cac, ltvBasis, unit: ':1' },
      cpl: { value: cpl, delta: null, unit: 'kr', inverse: true },
      cac: { value: cac, delta: null, unit: 'kr', inverse: true },
      avgCustomerValue: { value: avgCustomerValue, unit: 'kr' },
      ltv: { value: ltv, basis: ltvBasis, unit: 'kr' },
      timeToWin: { value: timeToWin, unit: 'dager', inverse: true },
      conversionRate: { value: conversionRateCur, delta: pctChange(conversionRateCur, conversionRatePrev), unit: '%' },
    },
    metrics: {
      newLeads: { value: newLeadsCur, prev: newLeadsPrev, delta: pctChange(newLeadsCur, newLeadsPrev) },
      newTenantLeads: { value: newTenantLeadsCur, prev: newTenantLeadsPrev, delta: pctChange(newTenantLeadsCur, newTenantLeadsPrev), note: 'Etterspørselsside — ikke betalende kunder, holdt utenfor CAC/LTV/konvertering' },
      newCustomers: { value: newCustCur, prev: newCustPrev, delta: pctChange(newCustCur, newCustPrev) },
      totalCustomers: { value: totalCustomers, tracked: trackedWon, historical: importedWon },
      revenue: { value: round2(revenueCur), prev: round2(revenuePrev), delta: pctChange(revenueCur, revenuePrev), unit: 'kr' },
      totalRevenueAllTime: { value: totalRevenueAllTime, unit: 'kr' },
      spend: { total: round2(spend.total || 0), google: round2(spend.google || 0), meta: round2(spend.meta || 0), unit: 'kr' },
      roasTrue: { value: roasTrue, unit: 'x' },
      roasAds: { value: roasAds, unit: 'x' },
      responseHours: { value: respCount ? round1(respSum / respCount) : null, sla24hPct: respCount ? Math.round((slaHit / respCount) * 100) : null, unit: 't' },
      paybackMonths: { value: paybackMonths, unit: 'mnd' },
      pipeline,
    },
    funnel,
    runRate,
    platform,
    momentum,
    channels,
    pipelineValue,
    series: { ...series, cumulativeRevenue, monthly },
    cohort: { trackedWon, importedWon, importedTotal, includesHistorical: true },
    ltvModel: settings,
    configured: { ads: !(mm && mm._error) && !!(mm && mm.configured), adsError: mm?._error || null },
  };
}
