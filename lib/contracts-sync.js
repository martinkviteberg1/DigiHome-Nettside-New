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
