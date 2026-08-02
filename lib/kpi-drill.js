// ---------------------------------------------------------------------------
// KPI DRILL-DOWN — «hvilke kunder og enheter ligger bak dette tallet?»
//
// Hvert nøkkeltall kan brytes ned til KUNDE → ENHET. Vi bruker tre kilder:
//
//   1. finance_contracts   — autoritativ for HONORAR (leie × sats). Bestemmer
//                            realisert / kontrahert / potensial.
//   2. platform_customers  — kundenavn, e-post, kunde siden, plattform-MRR.
//                            Løser opp tomme ownerName i kontraktene.
//   3. platform_properties — kanonisk ENHETSDATA fra plattformens units-eksport
//                            (full adresse, etasje, type, leietaker, leie, bilder).
//
// VIKTIG OM KOBLING: plattformens kontrakt-eksport og enhets-eksport bruker to
// ulike ID-rom, så `contract.propertyId` treffer IKKE `property.id`. Vi kobler
// derfor på NORMALISERT ADRESSE med husnummer, og bare når treffet er entydig.
// Ved flere kandidater markeres det som tvetydig i stedet for å gjette.
// Kontraktens egne tall brukes ALLTID til honorar — enhetsdata er kun berikelse.
// ---------------------------------------------------------------------------

import { listContracts } from '@/lib/finance';
import { computeRevenueFromContracts } from '@/lib/revenue-model';
import { getKpiSettings } from '@/lib/kpi-dashboard';
import { PROPERTIES_COLL } from '@/lib/properties-sync';
import { IMPORTED_COLL } from '@/lib/imported-leads';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const round1 = (x) => Math.round((Number(x) || 0) * 10) / 10;
const DAY = 86400000;

// Hvilke nøkkeltall kan drilles, og mot hvilket datagrunnlag.
export const DRILL_KIND = {
  ltv: 'leases_actual',
  ltv_cac: 'leases_actual',
  payback: 'leases_actual',
  mrr_actual: 'leases_actual',
  activation: 'customers_all',
  ltv_cac_contracted: 'leases_contracted',
  mrr_contracted: 'leases_contracted',
  mrr_potential: 'leases_potential',
  at_risk: 'leases_expiring',
  time_to_rent: 'customers_all',
  total_customers: 'leads_won_alltime',
  cac: 'leads_won',
  new_customers: 'leads_won',
  revenue: 'leads_won',
  ttw: 'leads_won',
  avg_value: 'leads_won_alltime',
  conv: 'leads_period',
  cpl: 'leads_period',
  new_leads: 'leads_period',
  pipeline_value: 'leads_open',
  tenant_demand: 'tenant_leads',
};

export const DRILL_METRICS = Object.keys(DRILL_KIND);

// --- Adressenormalisering ---------------------------------------------------
// «Olaf Ryes vei 11C, 5007 Bergen» → «olaf ryes vei 11c»
function normAddr(s) {
  let t = String(s || '').toLowerCase().trim();
  if (!t) return '';
  t = t.split(',')[0];                        // dropp postnr/poststed
  t = t.replace(/\s*\(.*?\)\s*/g, ' ');       // dropp «(Seksjon 5)»
  t = t.replace(/[.]/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
const hasHouseNumber = (s) => /\d/.test(String(s || ''));

function buildUnitIndex(units = []) {
  const idx = new Map();
  for (const u of units) {
    for (const cand of [u.fullAddress, u.street, u.unitLabel, u.buildingLabel]) {
      const k = normAddr(cand);
      if (!k || !hasHouseNumber(k)) continue;
      if (!idx.has(k)) idx.set(k, []);
      const list = idx.get(k);
      if (!list.some((x) => x.unitId === u.unitId)) list.push(u);
    }
  }
  return idx;
}

// --- Kanoniske enheter fra plattformens units-eksport ----------------------
async function loadUnits(db) {
  let docs = [];
  try {
    docs = await db.collection(PROPERTIES_COLL)
      .find({ stale: { $ne: true }, unit: { $exists: true } }, { projection: { _id: 0, id: 1, externalId: 1, district: 1, districtSource: 1, sqm: 1, bedrooms: 1, type: 1, status: 1, model: 1, images: 1, unit: 1 } })
      .limit(2000).toArray();
  } catch (_) { docs = []; }
  return docs.map((d) => {
    const u = d.unit || {};
    return {
      propertyId: d.id,
      unitId: u.unitId || d.externalId || null,
      buildingId: u.buildingId || null,
      buildingLabel: u.buildingLabel || null,
      unitLabel: u.unitLabel || null,
      fullAddress: u.fullAddress || null,
      street: u.street || null,
      houseNumber: u.houseNumber || null,
      postalCode: u.postalCode || null,
      district: d.district || u.platformDistrict || null,
      districtSource: d.districtSource || null,
      floor: u.floor ?? null,
      rooms: u.rooms ?? null,
      sqm: d.sqm || null,
      bedrooms: d.bedrooms ?? null,
      unitType: u.unitType || d.type || null,
      rentalModel: u.rentalModel || d.model || null,
      unitStatus: u.unitStatus || d.status || null,
      ownerName: u.ownerName || null,
      tenantName: u.tenantName || null,
      tenantActiveFrom: u.tenantActiveFrom || null,
      rentAmount: u.rentAmount ?? null,
      rentIsEstimate: u.rentIsEstimate === true,
      imageCount: u.imageCount != null ? u.imageCount : (d.images || []).length,
      publicUrl: u.publicUrl || null,
      finnUrl: u.finnUrl || null,
      archived: u.archived === true,
    };
  });
}

async function loadCustomers(db) {
  let rows = [];
  try {
    rows = await db.collection('platform_customers')
      .find({}, { projection: { _id: 0, customerId: 1, name: 1, email: 1, phone: 1, status: 1, customerSince: 1, mrr: 1, lifetimeFee: 1, activeContractsCount: 1, contractsCount: 1, totalMonthlyRent: 1, firstLeadId: 1 } })
      .limit(5000).toArray();
  } catch (_) { rows = []; }
  const byId = new Map(), byEmail = new Map(), byName = new Map(), byLead = new Map();
  for (const c of rows) {
    if (c.customerId) byId.set(String(c.customerId), c);
    if (c.email) byEmail.set(String(c.email).toLowerCase().trim(), c);
    if (c.name) byName.set(String(c.name).toLowerCase().trim(), c);
    if (c.firstLeadId) byLead.set(String(c.firstLeadId), c);
  }
  return { rows, byId, byEmail, byName, byLead };
}

// --- Enhets-/kontraktsrad --------------------------------------------------
const nbDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toISOString().slice(0, 10);
};

function periodText(startDate, endDate) {
  const s = nbDate(startDate), e = nbDate(endDate);
  if (s && e) return `${s} → ${e}`;
  if (s) return `fra ${s}`;
  if (e) return `til ${e}`;
  return 'løpende';
}

function unitInfoText(u, contract) {
  const bits = [];
  if (u) {
    if (u.floor != null) bits.push(`${u.floor}. etasje`);
    if (u.unitType) bits.push(u.unitType);
    if (u.sqm) bits.push(`${u.sqm} m²`);
    if (u.rooms != null) bits.push(`${u.rooms} rom`);
    else if (u.bedrooms) bits.push(`${u.bedrooms} sov`);
    if (u.district) bits.push(u.district);
    if (u.rentalModel) bits.push(u.rentalModel);
  }
  if (!bits.length) bits.push(contract?.type === 'leiekontrakt' ? 'leiekontrakt' : 'forvaltningsavtale');
  return bits.join(' · ');
}

const TIER_LABEL = { actual: 'Realisert', contracted: 'Kontrahert', potential: 'Potensial' };

function rowFromLease(r, tier, unitIdx) {
  const key = normAddr(r.property);
  const cands = (key && hasHouseNumber(key)) ? (unitIdx.get(key) || []) : [];
  const u = cands.length === 1 ? cands[0] : null;
  const match = cands.length === 1 ? 'adresse' : (cands.length > 1 ? 'tvetydig' : 'ingen');
  const rent = tier === 'potential' ? r.estimatedMonthlyRent : r.monthlyRent;
  return {
    id: r.id,
    address: u?.fullAddress || r.property || '(ukjent enhet)',
    unitInfo: unitInfoText(u, null),
    tenant: r.tenant || u?.tenantName || (tier === 'potential' ? '— ikke utleid' : '—'),
    monthlyRent: Number(rent) || 0,
    rentIsEstimate: tier === 'potential' ? true : (u?.rentIsEstimate === true),
    feePercent: Number(r.feePercent) || 0,
    fee: Number(r.fee) || 0,
    period: periodText(r.startDate, r.endDate),
    tier, tierLabel: TIER_LABEL[tier] || tier,
    status: r.status || null,
    contractId: r.contractId || null,
    unitMatch: match,
    unitId: u?.unitId || null,
    imageCount: u?.imageCount ?? null,
    publicUrl: u?.publicUrl || null,
    district: u?.district || null,
  };
}

// Grupper kontraktsrader per kunde.
function groupByCustomer(rows, { customers, ownerNameOf }) {
  const map = new Map();
  for (const r of rows) {
    const key = r.__ownerKey || 'ukjent';
    if (!map.has(key)) map.set(key, { key, rows: [] });
    map.get(key).rows.push(r);
  }
  const groups = [];
  for (const [key, g] of map) {
    const cust = customers.byId.get(String(key)) || null;
    const amount = round2(g.rows.reduce((s, x) => s + (x.fee || 0), 0));
    const rent = round2(g.rows.reduce((s, x) => s + (x.monthlyRent || 0), 0));
    groups.push({
      key,
      name: cust?.name || ownerNameOf(key) || '(kunde uten navn i eksporten)',
      amount, amountUnit: 'kr/mnd',
      subtitle: `${g.rows.length} enhet${g.rows.length === 1 ? '' : 'er'} · ${rent ? `${rent} kr leie/mnd` : 'ingen leie registrert'}`,
      meta: [
        cust?.email ? { l: 'E-post', v: cust.email, f: 'text' } : null,
        cust?.customerSince ? { l: 'Kunde siden', v: nbDate(cust.customerSince), f: 'text' } : null,
        cust?.status ? { l: 'Status', v: cust.status, f: 'text' } : null,
        cust?.mrr != null ? { l: 'Plattform-MRR', v: cust.mrr, f: 'kr' } : null,
        cust?.activeContractsCount != null ? { l: 'Aktive kontrakter (plattform)', v: cust.activeContractsCount, f: 'num' } : null,
      ].filter(Boolean),
      rows: g.rows.sort((a, b) => (b.fee || 0) - (a.fee || 0)),
    });
  }
  return groups.sort((a, b) => b.amount - a.amount);
}

const LEASE_COLUMNS = [
  { key: 'address', label: 'Enhet', format: 'text', wide: true },
  { key: 'unitInfo', label: 'Detaljer', format: 'text' },
  { key: 'tenant', label: 'Leietaker', format: 'text' },
  { key: 'monthlyRent', label: 'Leie/mnd', format: 'kr', align: 'right' },
  { key: 'feePercent', label: '%', format: 'pct', align: 'right' },
  { key: 'fee', label: 'Honorar/mnd', format: 'kr', align: 'right', strong: true },
  { key: 'period', label: 'Periode', format: 'text' },
];

const LEAD_COLUMNS = [
  { key: 'address', label: 'Enhet', format: 'text', wide: true },
  { key: 'unitInfo', label: 'Detaljer', format: 'text' },
  { key: 'tenant', label: 'Leietaker', format: 'text' },
  { key: 'monthlyRent', label: 'Leie/mnd', format: 'kr', align: 'right' },
  { key: 'fee', label: 'Honorar/mnd', format: 'kr', align: 'right', strong: true },
  { key: 'tierLabel', label: 'Kvalitet', format: 'text' },
];

// ---------------------------------------------------------------------------
export async function buildKpiDrill(db, { metric, days = 90, from, to } = {}) {
  const kind = DRILL_KIND[metric];
  if (!kind) return { ok: false, error: `Ukjent nøkkeltall: ${metric}` };

  // Vindu (samme kalenderdager som KPI-dashbordet)
  const ymd = (ms) => new Date(ms).toISOString().slice(0, 10);
  let dFrom, dTo, label;
  if (from && to && /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to)) {
    dFrom = from; dTo = to; label = `${from} – ${to}`;
  } else {
    const n = Math.max(1, Math.min(3650, Number(days) || 90));
    dTo = ymd(Date.now()); dFrom = ymd(Date.now() - (n - 1) * DAY);
    label = `Siste ${n} dager`;
  }
  const winFrom = new Date(`${dFrom}T00:00:00.000Z`).getTime();
  const winTo = new Date(`${dTo}T23:59:59.999Z`).getTime();
  const win = { label, from: dFrom, to: dTo };

  const settings = await getKpiSettings(db);
  const [units, customers] = await Promise.all([loadUnits(db), loadCustomers(db)]);
  const unitIdx = buildUnitIndex(units);

  // ---------------- KONTRAKTSBASERTE NØKKELTALL --------------------------
  if (kind.startsWith('leases_') || kind === 'customers_all') {
    let contracts = [];
    try { contracts = await listContracts(db); } catch (_) { contracts = []; }
    const rm = computeRevenueFromContracts(contracts, {
      lifetimeMonths: settings.lifetimeMonths || 36,
      grossMarginPct: settings.grossMarginPct,
      leaseActualRule: settings.leaseActualRule,
      fullBreakdown: true,
    });
    const ownerNames = new Map();
    for (const c of contracts) {
      const k = c.ownerId || (c.ownerName || '').trim().toLowerCase();
      if (k && c.ownerName && !ownerNames.has(String(k))) ownerNames.set(String(k), c.ownerName);
    }
    const ownerNameOf = (k) => ownerNames.get(String(k)) || null;
    const keyOf = (r) => String(r.ownerId || (r.owner || '').trim().toLowerCase() || 'ukjent');

    const pick = {
      leases_actual: [['actual', rm.breakdown.actual]],
      leases_contracted: [['contracted', rm.breakdown.contracted]],
      leases_potential: [['potential', rm.breakdown.potential]],
      leases_expiring: [['actual', rm.expiring90d]],
      customers_all: [['actual', rm.breakdown.actual], ['contracted', rm.breakdown.contracted], ['potential', rm.breakdown.potential]],
    }[kind];

    const rows = [];
    for (const [tier, list] of pick) {
      for (const r of list) {
        const row = rowFromLease(r, tier, unitIdx);
        row.__ownerKey = keyOf(r);
        rows.push(row);
      }
    }
    const groups = groupByCustomer(rows, { customers, ownerNameOf });
    const matched = rows.filter((r) => r.unitMatch === 'adresse').length;
    const ambiguous = rows.filter((r) => r.unitMatch === 'tvetydig').length;

    // Enheter i porteføljen som IKKE er koblet til noen kontraktsrad — ofte
    // enheter uten forvaltningsavtale i kontraktseksporten, eller tomme enheter.
    const usedUnitIds = new Set(rows.map((r) => r.unitId).filter(Boolean));
    const unmatchedUnits = units
      .filter((u) => !usedUnitIds.has(u.unitId))
      .map((u) => ({
        address: u.fullAddress || u.street || '(uten adresse)',
        unitInfo: unitInfoText(u, null),
        owner: u.ownerName || '—',
        tenant: u.tenantName || '— ledig',
        rentAmount: u.rentAmount ?? null,
        rentIsEstimate: u.rentIsEstimate,
        unitStatus: u.unitStatus || '—',
        imageCount: u.imageCount ?? 0,
        publicUrl: u.publicUrl || null,
      }))
      .sort((a, b) => (b.rentAmount || 0) - (a.rentAmount || 0));

    const TITLES = {
      leases_actual: 'Realisert honorar — kunder og enheter',
      leases_contracted: 'Kontrahert honorar — kunder og enheter',
      leases_potential: 'Potensial — kunder og enheter uten leiekontrakt',
      leases_expiring: 'Leiekontrakter som utløper innen 90 dager',
      customers_all: 'Alle kunder — enheter og honorar',
    };

    return {
      ok: true, metric, kind, title: TITLES[kind] || 'Detaljer',
      window: kind === 'leases_expiring' ? { label: 'Neste 90 dager' } : { label: 'Nåsituasjon' },
      columns: LEASE_COLUMNS,
      totals: {
        groups: groups.length,
        rows: rows.length,
        amount: round2(rows.reduce((s, r) => s + (r.fee || 0), 0)),
        amountUnit: 'kr/mnd',
        rent: round2(rows.reduce((s, r) => s + (r.monthlyRent || 0), 0)),
      },
      unitCoverage: { rows: rows.length, matched, ambiguous, unmatched: rows.length - matched - ambiguous, portfolioUnits: units.length },
      groups,
      unmatchedUnits: unmatchedUnits.slice(0, 120),
      unmatchedUnitsTotal: unmatchedUnits.length,
      note: 'Honorar kommer fra plattformens kontrakter. Enhetsdetaljer (etasje, areal, leietaker, bilder) hentes fra plattformens enhets-eksport og kobles på adresse — kun ved entydig treff.',
    };
  }

  // ---------------- LEAD-/KUNDEBASERTE NØKKELTALL ------------------------
  const proj = { projection: { _id: 0, id: 1, name: 1, email: 1, phone: 1, createdAt: 1, status: 1, wonAt: 1, won_at: 1, statusUpdatedAt: 1, wonValue: 1, wonValueActual: 1, wonValueEstimate: 1, source: 1, attribution: 1, platform_id: 1, firstResponseAt: 1, forwarded_at: 1, lead_type: 1, address: 1, postal_code: 1, sqm: 1, bedrooms: 1, rental_model: 1, num_properties: 1 } };
  const OWNER_Q = {
    lead_type: { $nin: ['kontakt', 'contact', 'henvendelse', 'inquiry', 'leietaker', 'tenant'] },
    deleted: { $ne: true }, mirrored: { $ne: true },
  };

  if (kind === 'tenant_leads') {
    let rows = [];
    try {
      rows = await db.collection('tenant_leads')
        .find({ deleted: { $ne: true } }, { projection: { _id: 0, id: 1, name: 1, email: 1, createdAt: 1, status: 1, source: 1, preferred_area: 1, budget_min: 1, budget_max: 1, bedrooms: 1, move_in_date: 1, attribution: 1 } })
        .limit(20000).toArray();
    } catch (_) { rows = []; }
    const inWin = rows.filter((t) => { const c = Date.parse(t.createdAt); return isFinite(c) && c >= winFrom && c <= winTo; });
    return {
      ok: true, metric, kind, title: 'Leietakere som meldte seg i perioden', window: win,
      columns: [
        { key: 'name', label: 'Leietaker', format: 'text', wide: true },
        { key: 'preferred_area', label: 'Ønsket område', format: 'text' },
        { key: 'budget', label: 'Budsjett', format: 'text' },
        { key: 'bedrooms', label: 'Soverom', format: 'num', align: 'right' },
        { key: 'move_in_date', label: 'Innflytting', format: 'text' },
        { key: 'createdAt', label: 'Registrert', format: 'date' },
      ],
      totals: { groups: 0, rows: inWin.length, amount: null },
      groups: [{
        key: 'tenants', name: 'Leietaker-registreringer', amount: inWin.length, amountUnit: 'stk',
        subtitle: `${inWin.length} i perioden`, meta: [],
        rows: inWin
          .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
          .map((t) => ({
            name: t.name || 'Uten navn',
            preferred_area: t.preferred_area || '—',
            budget: t.budget_min || t.budget_max ? `${t.budget_min || 0}–${t.budget_max || 0} kr` : '—',
            bedrooms: t.bedrooms ?? null,
            move_in_date: nbDate(t.move_in_date) || '—',
            createdAt: t.createdAt,
          })),
      }],
      note: 'Leietakere er etterspørselssiden og holdes utenfor CAC, LTV og konvertering.',
    };
  }

  let leads = [];
  try { leads = await db.collection('leads').find(OWNER_Q, proj).limit(50000).toArray(); } catch (_) { leads = []; }
  const wonAtOf = (l) => l.wonAt || l.won_at || (l.status === 'won' ? l.statusUpdatedAt : null) || null;
  const valueOf = (l) => Number(l.wonValueActual ?? l.wonValue ?? l.wonValueEstimate ?? 0) || 0;

  let selected = [];
  let title = 'Detaljer';
  let windowOut = win;
  if (kind === 'leads_won') {
    title = 'Nye kunder i perioden — og enhetene deres';
    selected = leads.filter((l) => { const w = Date.parse(wonAtOf(l)); return l.status === 'won' && isFinite(w) && w >= winFrom && w <= winTo; });
  } else if (kind === 'leads_won_alltime') {
    title = 'Alle kunder med registrert verdi';
    windowOut = { label: 'Alle tider' };
    selected = leads.filter((l) => l.status === 'won');
  } else if (kind === 'leads_period') {
    title = 'Nye huseier-leads i perioden';
    selected = leads.filter((l) => { const c = Date.parse(l.createdAt); return isFinite(c) && c >= winFrom && c <= winTo; });
  } else if (kind === 'leads_open') {
    title = 'Åpne leads i pipeline';
    windowOut = { label: 'Nåsituasjon' };
    selected = leads.filter((l) => ['new', 'contacted', 'qualified'].includes(l.status || 'new'));
  }

  // Kontrakter per kunde, slik at hvert lead kan vise sine faktiske enheter.
  let contracts = [];
  try { contracts = await listContracts(db); } catch (_) { contracts = []; }
  const rm2 = computeRevenueFromContracts(contracts, {
    lifetimeMonths: settings.lifetimeMonths || 36,
    grossMarginPct: settings.grossMarginPct,
    leaseActualRule: settings.leaseActualRule,
    fullBreakdown: true,
  });
  const byOwner = new Map();
  const addRow = (r, tier) => {
    const k = String(r.ownerId || (r.owner || '').trim().toLowerCase() || 'ukjent');
    if (!byOwner.has(k)) byOwner.set(k, []);
    byOwner.get(k).push(rowFromLease(r, tier, unitIdx));
  };
  rm2.breakdown.actual.forEach((r) => addRow(r, 'actual'));
  rm2.breakdown.contracted.forEach((r) => addRow(r, 'contracted'));
  rm2.breakdown.potential.forEach((r) => addRow(r, 'potential'));

  const groups = selected.map((l) => {
    const cust = (l.id && customers.byLead.get(String(l.id)))
      || (l.platform_id && customers.byLead.get(String(l.platform_id)))
      || (l.email && customers.byEmail.get(String(l.email).toLowerCase().trim()))
      || (l.name && customers.byName.get(String(l.name).toLowerCase().trim()))
      || null;
    const rows = (cust?.customerId && byOwner.get(String(cust.customerId)))
      || (l.name && byOwner.get(String(l.name).toLowerCase().trim()))
      || [];
    const feeActual = round2(rows.filter((r) => r.tier === 'actual').reduce((s, r) => s + (r.fee || 0), 0));
    const est = valueOf(l);
    const w = wonAtOf(l);
    const c = Date.parse(l.createdAt);
    const wt = Date.parse(w);
    return {
      key: l.id,
      name: l.name || 'Uten navn',
      amount: kind === 'leads_won' || kind === 'leads_won_alltime' ? est : null,
      amountUnit: 'kr',
      subtitle: rows.length
        ? `${rows.length} enhet${rows.length === 1 ? '' : 'er'} · ${feeActual ? `${feeActual} kr/mnd realisert honorar` : 'ingen realisert honorar ennå'}`
        : 'ingen kontrakt registrert ennå',
      meta: [
        l.email ? { l: 'E-post', v: l.email, f: 'text' } : null,
        l.phone ? { l: 'Telefon', v: l.phone, f: 'text' } : null,
        { l: 'Status', v: l.status || 'new', f: 'text' },
        { l: 'Lead opprettet', v: nbDate(l.createdAt), f: 'text' },
        w ? { l: 'Vunnet', v: nbDate(w), f: 'text' } : null,
        (isFinite(c) && isFinite(wt) && wt >= c) ? { l: 'Dager til kunde', v: round1((wt - c) / DAY), f: 'num1' } : null,
        { l: 'Kanal', v: l.attribution?.channel || 'Direkte', f: 'text' },
        l.attribution?.campaign ? { l: 'Kampanje', v: l.attribution.campaign, f: 'text' } : null,
        l.source ? { l: 'Kilde', v: l.source, f: 'text' } : null,
        est > 0 ? { l: 'Registrert verdi (estimat)', v: est, f: 'kr' } : { l: 'Registrert verdi', v: 'mangler', f: 'text' },
        feeActual > 0 ? { l: 'Faktisk honorar', v: feeActual * 12, f: 'kr', note: 'per år' } : null,
        (est > 0 && feeActual > 0) ? { l: 'Avvik estimat → fasit', v: `${Math.round(((feeActual * 12 - est) / est) * 100)} %`, f: 'text' } : null,
        cust?.customerId ? { l: 'Koblet plattformkunde', v: cust.name || cust.customerId, f: 'text' } : { l: 'Plattformkunde', v: 'ikke koblet', f: 'text' },
      ].filter(Boolean),
      rows,
    };
  }).sort((a, b) => (b.amount || 0) - (a.amount || 0) || String(a.name).localeCompare(String(b.name)));

  let importedNote = null;
  if (kind === 'leads_won_alltime') {
    try {
      const n = await db.collection(IMPORTED_COLL).countDocuments({ deleted: { $ne: true }, status: 'won', lead_type: { $nin: ['leietaker', 'tenant', 'kontakt', 'contact'] } });
      if (n > 0) importedNote = `I tillegg finnes ${n} historisk importerte kunder som ikke har sporet lead-historikk. De teller i «Total kunder» og «Snitt kundeverdi», men kan ikke drilles her.`;
    } catch (_) {}
  }

  return {
    ok: true, metric, kind, title, window: windowOut,
    columns: LEAD_COLUMNS,
    totals: {
      groups: groups.length,
      rows: groups.reduce((s, g) => s + g.rows.length, 0),
      amount: round2(groups.reduce((s, g) => s + (g.amount || 0), 0)),
      amountUnit: 'kr',
    },
    groups,
    note: [
      'Hver kunde kan åpnes for å se enhetene og honoraret bak.',
      'Registrert verdi er et estimat satt ved signering. «Faktisk honorar» er fasit fra leiekontrakten.',
      importedNote,
    ].filter(Boolean).join(' '),
  };
}
