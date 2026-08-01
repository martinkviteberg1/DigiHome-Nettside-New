// ---------------------------------------------------------------------------
// PROD-FASIT — avstemming av inntektsmodellen mot plattformen.
//
// Hvorfor: Nøkkeltall (LTV, MRR, CAC) regnes på kontrakter som er SYNKET inn i
// `finance_contracts`. Hvis synken henger, en kontrakt er slettet i plattformen,
// eller leie/honorar er endret der uten at vi har hentet det, viser dashbordet
// et tall som ser riktig ut, men ikke er det. Da er tallet farlig — ikke bare
// feil.
//
// Denne modulen henter kontraktene RETT fra plattformen (read-only) og kjører
// dem gjennom EXAKT samme motor (`computeRevenueFromContracts`) som dashbordet
// bruker på de lokale dataene. Alt som avviker er da et reelt datagap — ikke en
// forskjell i beregningsmåte.
//
// Skriver INGENTING. Trygg å kjøre mot prod fra preview.
// ---------------------------------------------------------------------------
import { listContracts } from '@/lib/finance';
import { computeRevenueFromContracts } from '@/lib/revenue-model';
import { fetchPlatformContractRows, normalizePlatformContract } from '@/lib/contracts-sync';
import { buildMarketingMetrics } from '@/lib/marketing-metrics';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const round1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const nok = (x) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(x) || 0));
const num = (x) => (x == null || x === '' ? null : Number(x));
const d10 = (v) => (v ? String(v).slice(0, 10) : null);

const get = (obj, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);

// Hvilke tall som skal stemme, og hvor stort slingringsmonn vi godtar.
// Kroner: 1 kr (avrunding). Antall: 0. Prosent: 0,2 p.p.
const METRICS = [
  { key: 'mrr.actual', label: 'Faktisk MRR', hint: 'honorar fra løpende leiekontrakter', unit: 'kr', tol: 1, critical: true },
  { key: 'mrr.contracted', label: 'Kontrahert MRR', hint: 'leiekontrakt inngått, ikke startet', unit: 'kr', tol: 1 },
  { key: 'mrr.potential', label: 'Potensial MRR', hint: 'forvaltningsavtale uten leiekontrakt', unit: 'kr', tol: 1 },
  { key: 'mrr.totalPipeline', label: 'Sum pipeline', hint: 'faktisk + kontrahert + potensial', unit: 'kr', tol: 1 },
  { key: 'ltv.value', label: 'Faktisk LTV per kunde', hint: 'honorar/mnd × levetid × margin', unit: 'kr', tol: 1, critical: true },
  { key: 'ltv.monthlyFee', label: 'Honorar per kunde med leieinntekt', unit: 'kr/mnd', tol: 1, critical: true },
  { key: 'customers.earning', label: 'Kunder med faktisk leieinntekt', unit: 'stk', tol: 0, critical: true },
  { key: 'customers.management', label: 'Kunder med levende kontrakt', unit: 'stk', tol: 0 },
  { key: 'customers.activationRatePct', label: 'Aktiveringsrate', hint: 'andel kunder som faktisk er utleid', unit: '%', tol: 0.2 },
  { key: 'revenueQualityPct', label: 'Inntektskvalitet', hint: 'andel av pipeline som er faktisk', unit: '%', tol: 0.2 },
  { key: 'contractsTotal', label: 'Kontrakter etter dedupe', unit: 'stk', tol: 0 },
];

// Feltene som må være like per kontrakt for at pengene skal bli like.
const FIELDS = [
  ['type', 'type'],
  ['status', 'status'],
  ['monthlyRent', 'månedsleie'],
  ['estimatedMonthlyRent', 'estimert leie'],
  ['feePercent', 'honorar %'],
  ['startDate', 'startdato'],
  ['endDate', 'sluttdato'],
];

const feeOf = (c) => {
  const rent = c.type === 'leiekontrakt'
    ? num(c.monthlyRent)
    : (c.estimatedMonthlyRent != null ? num(c.estimatedMonthlyRent) : num(c.monthlyRent));
  return round2((rent || 0) * ((num(c.feePercent) || 0) / 100));
};

const compact = (m) => ({
  mrr: m.mrr,
  ltv: { value: m.ltv?.value ?? null, monthlyFee: m.ltv?.monthlyFee ?? null, lifetimeMonths: m.ltv?.lifetimeMonths ?? null },
  ltvForward: m.ltv?.contractedBasis || null,
  customers: m.customers,
  revenueQualityPct: m.revenueQualityPct ?? null,
  timing: m.timing || null,
  ramp: m.ramp || [],
  upcomingStarts: (m.upcomingStarts || []).slice(0, 15),
  contractsTotal: m.contractsTotal ?? 0,
  contractsRaw: m.contractsRaw ?? 0,
  duplicatesRemoved: m.duplicatesRemoved ?? 0,
  tiers: {
    actual: { count: m.tiers?.actual?.count ?? 0 },
    contracted: { count: m.tiers?.contracted?.count ?? 0 },
    potential: { count: m.tiers?.potential?.count ?? 0 },
  },
});

const same = (a, b) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === 'number' || typeof b === 'number') return Math.abs(Number(a) - Number(b)) < 0.005;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
};

export async function reconcileRevenue(db, {
  target,
  key,
  env = 'ukjent',
  lifetimeMonths = 36,
  grossMarginPct = null,
  leaseActualRule = 'signed_started',
  withSpend = true,
  days = 30,
} = {}) {
  const startedAt = Date.now();
  const opts = { lifetimeMonths, grossMarginPct, leaseActualRule };
  let host = '';
  try { host = new URL(target).host; } catch (_) { host = String(target || '').replace(/^https?:\/\//, ''); }

  // --- 1. Lokalt grunnlag (nøyaktig det Nøkkeltall regner på) --------------
  let localRows = [];
  try { localRows = await listContracts(db); } catch (_) { localRows = []; }
  const localModel = computeRevenueFromContracts(localRows, opts);

  // --- 2. Plattformen som fasit (read-only) --------------------------------
  if (!target) {
    return { ok: false, error: 'Plattform-URL mangler', platform: { env, host, reachable: false }, local: compact(localModel) };
  }
  const fetched = await fetchPlatformContractRows({ target, key, status: 'all', pageLimit: 200, maxPages: 25, timeoutMs: 15000 });
  if (fetched.error || !fetched.rows.length) {
    return {
      ok: false,
      error: fetched.error ? `Plattformen svarte ikke som forventet: ${fetched.error}` : 'Plattformen returnerte 0 kontrakter',
      generatedAt: new Date().toISOString(),
      settings: opts,
      platform: { env, host, reachable: !fetched.error, rows: fetched.rows.length, pages: fetched.pages, httpStatus: fetched.status, error: fetched.error || null },
      local: compact(localModel),
    };
  }

  const truthRows = fetched.rows
    .map((r) => { try { return normalizePlatformContract(r); } catch (_) { return null; } })
    .filter((r) => r && r.externalContractId)
    .map((r) => ({ id: r.externalContractId, ...r }));
  const truthModel = computeRevenueFromContracts(truthRows, opts);

  // --- 3. Tall mot tall ----------------------------------------------------
  const metrics = METRICS.map((m) => {
    const a = get(localModel, m.key);
    const b = get(truthModel, m.key);
    const an = a == null ? null : Number(a);
    const bn = b == null ? null : Number(b);
    const delta = an != null && bn != null ? round2(an - bn) : null;
    const match = (an == null && bn == null) ? true : (delta != null && Math.abs(delta) <= m.tol);
    return {
      key: m.key, label: m.label, hint: m.hint || null, unit: m.unit,
      local: an, platform: bn, delta,
      deltaPct: delta != null && bn ? round1((delta / bn) * 100) : null,
      match, critical: !!m.critical,
    };
  });

  // --- 4. Kontrakt mot kontrakt (rot-årsaken til ethvert avvik) -----------
  const localByExt = new Map();
  let localManual = 0;
  for (const c of localRows) {
    if (c.externalContractId) localByExt.set(String(c.externalContractId), c);
    else localManual++;
  }
  const truthByExt = new Map(truthRows.map((c) => [String(c.externalContractId), c]));

  const onlyInPlatform = [], onlyLocal = [], mismatched = [];
  for (const [id, t] of truthByExt) {
    if (localByExt.has(id)) continue;
    onlyInPlatform.push({
      contractId: id, type: t.type, status: t.status, owner: t.ownerName || '', property: t.propertyAddress || '',
      monthlyRent: num(t.monthlyRent), feePercent: num(t.feePercent), fee: feeOf(t),
      startDate: t.startDate, endDate: t.endDate,
    });
  }
  for (const [id, l] of localByExt) {
    if (truthByExt.has(id)) continue;
    onlyLocal.push({
      contractId: id, type: l.type, status: l.status, owner: l.ownerName || '', property: l.propertyAddress || '',
      monthlyRent: num(l.monthlyRent), feePercent: num(l.feePercent), fee: feeOf(l),
      startDate: d10(l.startDate), endDate: d10(l.endDate),
      // Foreldreløs = fjernet i plattformen ved siste fulle synk. Teller ikke i penger.
      orphaned: l.orphaned === true,
    });
  }
  for (const [id, t] of truthByExt) {
    const l = localByExt.get(id);
    if (!l) continue;
    const diffs = [];
    for (const [f, label] of FIELDS) {
      const lv = f === 'startDate' || f === 'endDate' ? d10(l[f]) : l[f];
      const tv = t[f];
      if (!same(lv, tv)) diffs.push({ field: f, label, local: lv ?? null, platform: tv ?? null });
    }
    if (diffs.length) {
      mismatched.push({
        contractId: id, type: t.type, owner: t.ownerName || '', property: t.propertyAddress || '',
        feeLocal: feeOf(l), feePlatform: feeOf(t), feeDelta: round2(feeOf(l) - feeOf(t)), diffs,
      });
    }
  }

  const missingFee = round2(onlyInPlatform.reduce((s, r) => s + (r.fee || 0), 0));
  const countedStale = onlyLocal.filter((r) => !r.orphaned);
  const staleFee = round2(countedStale.reduce((s, r) => s + (r.fee || 0), 0));
  const orphanedFee = round2(onlyLocal.filter((r) => r.orphaned).reduce((s, r) => s + (r.fee || 0), 0));
  const mismatchFee = round2(mismatched.reduce((s, r) => s + (r.feeDelta || 0), 0));

  // --- 5. Annonseforbruk / CPL / CAC for samme vindu ----------------------
  let spend = null;
  if (withSpend) {
    try {
      const mm = await buildMarketingMetrics(db, { days: Math.max(1, Math.min(730, Number(days) || 30)) });
      spend = {
        period: mm.period,
        total: mm.spend?.total ?? null,
        google: mm.spend?.google ?? null,
        meta: mm.spend?.meta ?? null,
        sources: mm.spendSources || null,
        cpl: mm.efficiency?.cpl ?? null,
        cplBlended: mm.efficiency?.cplBlended ?? null,
        cac: mm.efficiency?.cac ?? null,
        leads: mm.leads || null,
        won: mm.marketingAttributedWon || null,
        configured: mm.configured || null,
        checks: [
          {
            label: 'Google-forbruk hentes på kampanjenivå',
            ok: mm.spendSources?.googleBasis === 'campaign',
            detail: mm.spendSources?.googleBasis === 'campaign'
              ? `kampanjenivå ${mm.spendSources.googleCampaignLevel} kr (annonsenivå ${mm.spendSources.googleAdLevel} kr)`
              : 'faller tilbake på annonsenivå — Performance Max/Demand Gen kan mangle',
          },
          {
            label: 'Meta bruker periodeforbruk (ingen livstids-fallback)',
            ok: mm.spendSources?.metaLifetimeFallback === false,
            detail: `Meta periodeforbruk ${mm.spendSources?.metaAdLevel ?? '—'} kr`,
          },
          {
            label: 'Forbruk og leads dekker samme kalenderdager',
            ok: mm.period?.days === Math.max(1, Math.min(730, Number(days) || 30)),
            detail: `${mm.period?.fromDate} – ${mm.period?.toDate} (${mm.period?.days} dager)`,
          },
        ],
      };
    } catch (e) { spend = { error: e.message }; }
  }

  const moneyMismatch = metrics.filter((m) => !m.match && m.unit !== 'stk' && m.unit !== '%');
  const criticalMismatch = metrics.filter((m) => !m.match && m.critical);
  const mismatches = metrics.filter((m) => !m.match);
  const dataGap = onlyInPlatform.length + onlyLocal.length + mismatched.length;
  const spendIssues = (spend?.checks || []).filter((c) => !c.ok);
  const match = mismatches.length === 0 && dataGap === 0;

  let headline;
  if (match) headline = 'Nøkkeltall stemmer med plattformen — alle kontrakter og alle beløp er identiske.';
  else if (criticalMismatch.length) headline = `${criticalMismatch.length} kritisk${criticalMismatch.length === 1 ? 't' : 'e'} tall avviker fra plattformen.`;
  else if (dataGap) headline = `Tallene stemmer, men ${dataGap} kontrakt${dataGap === 1 ? '' : 'er'} avviker i datagrunnlaget.`;
  else headline = `${mismatches.length} tall avviker fra plattformen.`;

  // Ærlig diagnose: er «Lokalt» i det hele tatt et gyldig sammenligningsgrunnlag?
  // I preview peker plattform-URLen på appen selv, så kontraktsynken får aldri
  // data — da er lokalkolonnen testdata, ikke et avvik som skal «fikses».
  const unsyncedShare = truthByExt.size > 0 ? onlyInPlatform.length / truthByExt.size : 0;
  const diagnosis = unsyncedShare >= 0.8
    ? 'Lokale kontraktsdata er ikke synket mot dette miljøet — nesten ingen av plattformens kontrakter finnes lokalt. Kolonnen «Lokalt» er derfor ikke representativ her; «Plattform (fasit)» er de riktige tallene.'
    : (unsyncedShare > 0.2
      ? 'Kontraktsynken henger etter plattformen. Kjør full kontraktsynk, så skal kolonnene bli like.'
      : null);

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    tookMs: Date.now() - startedAt,
    currency: 'NOK',
    settings: { ...opts, ruleLabel: truthModel.ruleLabel },
    platform: {
      env, host, reachable: true,
      rows: fetched.rows.length, pages: fetched.pages, httpStatus: fetched.status,
      endpoint: '/api/contracts/export',
    },
    local: compact(localModel),
    truth: compact(truthModel),
    metrics,
    contracts: {
      localTotal: localRows.length,
      localFromPlatform: localByExt.size,
      localManual,
      platformTotal: truthByExt.size,
      onlyInPlatform: onlyInPlatform.sort((a, b) => (b.fee || 0) - (a.fee || 0)).slice(0, 50),
      onlyLocal: onlyLocal.sort((a, b) => (b.fee || 0) - (a.fee || 0)).slice(0, 50),
      mismatched: mismatched.sort((a, b) => Math.abs(b.feeDelta || 0) - Math.abs(a.feeDelta || 0)).slice(0, 50),
      counts: {
        onlyInPlatform: onlyInPlatform.length,
        onlyLocal: onlyLocal.length,
        onlyLocalCounted: countedStale.length,
        onlyLocalOrphaned: onlyLocal.length - countedStale.length,
        mismatched: mismatched.length,
      },
      feeImpact: {
        missingFromLocal: missingFee,   // honorar/mnd vi IKKE ser fordi synken mangler kontrakten
        staleInLocal: staleFee,         // honorar/mnd vi teller, men plattformen ikke har
        orphanedExcluded: orphanedFee,  // honorar/mnd som alt er nøytralisert (foreldreløs)
        fieldMismatch: mismatchFee,     // honorar/mnd-differanse på felles kontrakter
        netLocalMinusPlatform: round2(staleFee - missingFee + mismatchFee),
      },
    },
    spend,
    verdict: {
      match,
      headline,
      diagnosis,
      mismatchCount: mismatches.length,
      criticalCount: criticalMismatch.length,
      moneyMismatchCount: moneyMismatch.length,
      dataGapCount: dataGap,
      spendIssueCount: spendIssues.length,
      // Hva som faktisk må gjøres — ikke bare at noe er galt.
      actions: [
        onlyInPlatform.length ? `Kjør kontraktsynk: ${onlyInPlatform.length} kontrakt${onlyInPlatform.length === 1 ? '' : 'er'} finnes i plattformen men ikke lokalt (${nok(missingFee)} kr/mnd honorar usynlig).` : null,
        countedStale.length ? `Rydd lokalt: ${countedStale.length} kontrakt${countedStale.length === 1 ? '' : 'er'} finnes lokalt men ikke i plattformen og telles fortsatt (${nok(staleFee)} kr/mnd). En full kontraktsynk merker dem som foreldreløse.` : null,
        mismatched.length ? `Oppdater felt: ${mismatched.length} kontrakt${mismatched.length === 1 ? '' : 'er'} har ulik leie/honorar/status (netto ${nok(mismatchFee)} kr/mnd).` : null,
        ...spendIssues.map((c) => `Annonseforbruk: ${c.label} — ${c.detail}`),
      ].filter(Boolean),
    },
  };
}
