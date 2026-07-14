// ---------------------------------------------------------------------------
// Synk av kontrakter/avtaler fra DigiHome-plattformen inn i økonomimodulen.
// Kilde: GET {PLATFORM}/api/contracts/export (read-only, X-API-Key).
// fee_percent kommer som BRØK (0.12) → lagres som prosent (12). Idempotent på
// contract_id. En utleid enhet gir både leiekontrakt (Faktisk) og
// forvaltningsavtale (Forventet) — dedupe håndteres i motoren via propertyId.
// ---------------------------------------------------------------------------
import { upsertContractExternal } from '@/lib/finance';

const d10 = (v) => (v ? String(v).slice(0, 10) : null); // ISO/datetime → YYYY-MM-DD

function normalize(row) {
  const feePct = row.fee_percent != null ? Math.round(Number(row.fee_percent) * 100 * 100) / 100 : null; // brøk → prosent
  const attr = row.attribution && Object.keys(row.attribution || {}).length ? row.attribution : null;
  return {
    externalContractId: row.contract_id,
    type: row.type === 'forvaltningsavtale' ? 'forvaltningsavtale' : 'leiekontrakt',
    label: (row.property && row.property.address) || row.contract_id || '',
    propertyAddress: (row.property && row.property.address) || '',
    propertyId: (row.property && row.property.id) || null,
    ownerName: (row.owner && row.owner.name) || '',
    ownerId: (row.owner && row.owner.id) || null,
    ownerEmail: (row.owner && (row.owner.email || row.owner.contact_email)) || null,
    ownerPhone: (row.owner && (row.owner.phone || row.owner.contact_phone)) || null,
    tenantName: (row.tenant && row.tenant.name) || '',
    monthlyRent: row.monthly_rent != null ? Number(row.monthly_rent) : null,
    estimatedMonthlyRent: row.estimated_monthly_rent != null ? Number(row.estimated_monthly_rent) : null,
    feePercent: feePct,
    feeModel: row.fee_model || 'percent',
    status: (row.status || 'active').toString().slice(0, 40),
    startDate: d10(row.start_date),
    endDate: d10(row.end_date),
    expectedRentStart: d10(row.expected_rent_start),
    externalRef: row.external_ref || null,
    attribution: attr,
    source: 'auto_platform',
    rentalModel: (row.property && row.property.rental_model) || null,
    currency: row.currency || 'NOK',
  };
}

export async function syncContractsFromPlatform(db, { target, key, status = 'all', maxPages = 25, pageLimit = 200 } = {}) {
  if (!target) return { ok: false, error: 'Plattform-URL mangler' };
  const started = Date.now();
  const basePath = '/api/contracts/export';
  let cursor = null, page = 0, lastStatus = null, lastError = null;
  const rows = [];
  try {
    do {
      const u = new URL(target.replace(/\/$/, '') + basePath);
      u.searchParams.set('status', status);
      u.searchParams.set('limit', String(pageLimit));
      if (cursor) u.searchParams.set('cursor', cursor);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      let res;
      try { res = await fetch(u.toString(), { headers: key ? { 'X-API-Key': key } : {}, signal: ctrl.signal }); }
      finally { clearTimeout(t); }
      lastStatus = res.status;
      if (!res.ok) { lastError = `HTTP ${res.status}`; break; }
      const j = await res.json();
      const batch = Array.isArray(j.contracts) ? j.contracts : [];
      rows.push(...batch);
      cursor = j.nextCursor || null;
      page++;
    } while (cursor && page < maxPages);
  } catch (e) { lastError = e.message; }

  if (!rows.length) {
    return { ok: !lastError, fetched: 0, upserted: 0, pages: page, status: lastStatus, error: lastError || null, tookMs: Date.now() - started };
  }

  let upserted = 0, skipped = 0;
  for (const row of rows) {
    try {
      const doc = normalize(row);
      if (!doc.externalContractId) { skipped++; continue; }
      await upsertContractExternal(db, doc);
      upserted++;
    } catch (_) { skipped++; }
  }
  return { ok: true, fetched: rows.length, upserted, skipped, pages: page, status: lastStatus, tookMs: Date.now() - started };
}

// ---------------------------------------------------------------------------
// Synk av KUNDER fra plattformen (GET /api/customers/export, X-API-Key).
// Kunde = utleier gruppert på owner_id hos plattformen. Rikere enn kontrakts-
// avledning: kontaktinfo, livssyklus (active/paused/churned), lifetime-honorar
// og attribusjon (kanal + første lead). Idempotent på customer_id.
// ---------------------------------------------------------------------------
function normalizeCustomer(row) {
  const props = Array.isArray(row.properties) ? row.properties : [];
  return {
    customerId: (row.customer_id || '').toString().slice(0, 120),
    name: (row.name || '').toString().slice(0, 200) || 'Ukjent eier',
    type: row.type === 'bedrift' ? 'bedrift' : 'privat',
    orgNo: row.org_no ? String(row.org_no).slice(0, 40) : null,
    email: (row.contact && row.contact.email) || null,
    phone: (row.contact && row.contact.phone) || null,
    status: ['active', 'paused', 'churned'].includes(row.status) ? row.status : 'active',
    customerSince: d10(row.customer_since),
    churnedAt: d10(row.churned_at),
    properties: props.map((p) => ({
      id: p.id || null,
      address: (p.address || '').toString().slice(0, 300),
      rentalModel: p.rental_model || null,
      unitsCount: Number(p.units_count) || null, // additivt felt fra eksporten (14/7)
    })),
    // Enhets-nivå (14/7, additivt fra plattformens eksport): et bygg kan ha
    // flere utleieenheter — unitsCount er fasit for «hvor mange enheter».
    propertiesCount: Number(row.properties_count) || props.length,
    unitsCount: Number(row.units_count) || null,
    units: Array.isArray(row.units) ? row.units.slice(0, 100).map((u) => ({
      id: u.unit_id || u.id || null,
      propertyId: u.property_id || null,
      label: (u.label || '').toString().slice(0, 200),
      status: (u.status || '').toString().slice(0, 40) || null,
      monthlyRent: u.monthly_rent != null ? Number(u.monthly_rent) : null,
    })) : [],
    contractsCount: Number(row.contracts_count) || 0,
    activeContractsCount: Number(row.active_contracts_count) || 0,
    totalMonthlyRent: row.total_monthly_rent != null ? Number(row.total_monthly_rent) : null,
    mrr: row.total_monthly_fee != null ? Number(row.total_monthly_fee) : 0, // plattformens MRR = Σ leie×honorar%
    lifetimeFee: row.lifetime_fee_to_date != null ? Number(row.lifetime_fee_to_date) : 0,
    channel: (row.attribution && row.attribution.channel) || null,
    firstLeadId: (row.attribution && row.attribution.first_lead_id) || null,
    firstLeadCreatedAt: (row.attribution && row.attribution.first_lead_created_at) || null,
  };
}

export async function syncCustomersFromPlatform(db, { target, key, status = 'all', maxPages = 25, pageLimit = 200 } = {}) {
  if (!target) return { ok: false, error: 'Plattform-URL mangler' };
  const started = Date.now();
  const basePath = '/api/customers/export';
  let cursor = null, page = 0, lastStatus = null, lastError = null;
  const rows = [];
  try {
    do {
      const u = new URL(target.replace(/\/$/, '') + basePath);
      u.searchParams.set('status', status);
      u.searchParams.set('limit', String(pageLimit));
      if (cursor) u.searchParams.set('cursor', cursor);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      let res;
      try { res = await fetch(u.toString(), { headers: key ? { 'X-API-Key': key } : {}, signal: ctrl.signal }); }
      finally { clearTimeout(t); }
      lastStatus = res.status;
      if (!res.ok) { lastError = `HTTP ${res.status}`; break; }
      const j = await res.json();
      const batch = Array.isArray(j.customers) ? j.customers : (Array.isArray(j.items) ? j.items : (Array.isArray(j.data) ? j.data : []));
      rows.push(...batch);
      cursor = j.nextCursor || null;
      page++;
    } while (cursor && page < maxPages);
  } catch (e) { lastError = e.message; }

  if (!rows.length) {
    return { ok: !lastError, fetched: 0, upserted: 0, pages: page, status: lastStatus, error: lastError || null, tookMs: Date.now() - started };
  }

  const syncedAt = new Date().toISOString();
  let upserted = 0, skipped = 0;
  for (const row of rows) {
    try {
      const doc = normalizeCustomer(row);
      if (!doc.customerId) { skipped++; continue; }
      await db.collection('platform_customers').updateOne(
        { customerId: doc.customerId },
        { $set: { ...doc, syncedAt } },
        { upsert: true }
      );
      upserted++;
    } catch (_) { skipped++; }
  }
  // Fjern kunder som ikke lenger finnes i eksporten (full synk = autoritativ liste).
  let removed = 0;
  try {
    const r = await db.collection('platform_customers').deleteMany({ syncedAt: { $ne: syncedAt } });
    removed = r.deletedCount || 0;
  } catch (_) {}
  return { ok: true, fetched: rows.length, upserted, skipped, removed, pages: page, status: lastStatus, tookMs: Date.now() - started };
}
