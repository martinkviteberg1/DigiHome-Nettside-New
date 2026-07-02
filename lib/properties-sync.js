// ---------------------------------------------------------------------------
// Synk av FORVALTEDE BOLIGER fra DigiHome-plattformen → vises på forsiden.
// Kilde: GET {PLATFORM}/api/properties/export (read-only, X-API-Key).
// Kontrakt (agent-bro, tråd homepage-properties, 2026-07-02):
//   ?status=active|rented|paused|all  ?updatedSince=ISO  ?limit=1-500  ?offset=
//   → { ok, properties[], count, total, offset, nextOffset }  (poll til nextOffset=null)
//   Felt: id, title (personvern-trygg, uten adresse), area (gatenavn u/husnr),
//         city, type, bedrooms, sqm, images[], status, model, monthlyRentBand,
//         availableFrom, updatedAt. INGEN PII — publicConsent droppet: VI styrer
//         synlighet selv i adminportalen (default AV / skjult).
// Idempotent på externalId. `visible`-flagget bevares på tvers av synk-runder.
// Boliger som forsvinner fra eksporten markeres stale (vises aldri offentlig).
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';

export const PROPERTIES_COLL = 'platform_properties';
const META_KEY = 'properties_sync_meta';
const SETTINGS_COLL = 'dashboard_settings';
export const SYNC_STALE_MS = 60 * 60 * 1000; // auto-resynk hvis eldre enn 1 time

function normalize(row, baseUrl) {
  // Godta baade absolutte http(s)-URLer og relative stier fra plattformen —
  // relative stier prefikses med plattform-basen (f.eks. https://app.digihome.no).
  const base = (baseUrl || '').replace(/\/+$/, '');
  const images = Array.isArray(row.images)
    ? row.images
        .map((u) => {
          if (typeof u !== 'string') return null;
          const s = u.trim();
          if (!s) return null;
          if (/^https?:\/\//i.test(s)) return s;
          if (base && s.startsWith('/')) return base + s;
          return null;
        })
        .filter(Boolean)
        .slice(0, 12)
    : [];
  return {
    externalId: String(row.id || '').slice(0, 80),
    title: (row.title || '').toString().slice(0, 160),
    area: row.area ? String(row.area).slice(0, 80) : null,
    city: row.city ? String(row.city).slice(0, 80) : null,
    type: (row.type || 'leilighet').toString().slice(0, 30),
    bedrooms: row.bedrooms != null ? Number(row.bedrooms) : null,
    sqm: row.sqm != null ? Number(row.sqm) : null,
    images,
    status: (row.status || 'active').toString().slice(0, 20), // active|rented|paused
    model: row.model ? String(row.model).slice(0, 20) : null, // langtid|korttid|hybrid
    monthlyRentBand: row.monthlyRentBand ? String(row.monthlyRentBand).slice(0, 60) : null,
    availableFrom: row.availableFrom ? String(row.availableFrom).slice(0, 30) : null,
    platformUpdatedAt: row.updatedAt ? String(row.updatedAt).slice(0, 40) : null,
  };
}

export async function getPropertiesSyncMeta(db) {
  try { return (await db.collection(SETTINGS_COLL).findOne({ key: META_KEY })) || null; } catch (e) { return null; }
}

// Full synk (offset-paginering). Bevarer visible-flagg; markerer forsvunne stale.
export async function syncPropertiesFromPlatform(db, { target, key, maxPages = 10, pageLimit = 200 } = {}) {
  if (!target) return { ok: false, error: 'Plattform-URL mangler (DIGIHOME_API_URL)' };
  const startedIso = new Date().toISOString();
  let offset = 0, page = 0, lastStatus = null, lastError = null, total = null;
  const rows = [];
  try {
    while (page < maxPages) {
      const u = new URL(target.replace(/\/$/, '') + '/api/properties/export');
      u.searchParams.set('status', 'all');
      u.searchParams.set('limit', String(pageLimit));
      u.searchParams.set('offset', String(offset));
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 12000);
      let res;
      try { res = await fetch(u.toString(), { headers: key ? { 'X-API-Key': key } : {}, signal: ctrl.signal }); }
      finally { clearTimeout(t); }
      lastStatus = res.status;
      if (!res.ok) { lastError = `HTTP ${res.status}`; break; }
      const j = await res.json();
      if (!j || j.ok !== true || !Array.isArray(j.properties)) { lastError = 'Uventet responsformat'; break; }
      rows.push(...j.properties);
      total = j.total != null ? Number(j.total) : total;
      page++;
      if (j.nextOffset == null) break;
      offset = Number(j.nextOffset);
    }
  } catch (e) {
    lastError = e.name === 'AbortError' ? 'Tidsavbrudd mot plattformen' : e.message;
  }

  if (lastError && rows.length === 0) {
    try {
      await db.collection(SETTINGS_COLL).updateOne({ key: META_KEY }, { $set: { key: META_KEY, lastAttemptAt: startedIso, lastError, lastStatus } }, { upsert: true });
    } catch (e) {}
    return { ok: false, error: lastError, httpStatus: lastStatus };
  }

  const coll = db.collection(PROPERTIES_COLL);
  let upserted = 0, updated = 0;
  for (const raw of rows) {
    const p = normalize(raw, target);
    if (!p.externalId) continue;
    const r = await coll.updateOne(
      { externalId: p.externalId },
      {
        $set: { ...p, stale: false, lastSeenAt: startedIso },
        $setOnInsert: { id: uuidv4(), visible: false, createdAt: startedIso },
      },
      { upsert: true }
    );
    if (r.upsertedCount) upserted++; else if (r.modifiedCount) updated++;
  }
  // Boliger som IKKE var med i denne runden → stale (skjules overalt offentlig)
  const staleRes = await coll.updateMany({ lastSeenAt: { $ne: startedIso } }, { $set: { stale: true } });

  const meta = {
    key: META_KEY,
    lastSyncAt: startedIso,
    lastAttemptAt: startedIso,
    lastError: lastError || null,
    lastStatus,
    total: rows.length,
    platformTotal: total,
    upserted,
    updated,
    staleMarked: staleRes.modifiedCount || 0,
  };
  try { await db.collection(SETTINGS_COLL).updateOne({ key: META_KEY }, { $set: meta }, { upsert: true }); } catch (e) {}
  return { ok: true, synced: rows.length, upserted, updated, staleMarked: staleRes.modifiedCount || 0, partialError: lastError || null };
}

// Ikke-blokkerende auto-synk hvis data er eldre enn SYNC_STALE_MS (kalles fra offentlig endepunkt).
export function maybeAutoSyncProperties(db, targetResolver) {
  (async () => {
    try {
      const meta = await getPropertiesSyncMeta(db);
      const last = meta && (meta.lastAttemptAt || meta.lastSyncAt);
      if (last && Date.now() - Date.parse(last) < SYNC_STALE_MS) return;
      const target = targetResolver();
      if (!target || !target.url) return;
      await syncPropertiesFromPlatform(db, { target: target.url, key: target.key });
    } catch (e) { /* stille — offentlig endepunkt skal aldri feile pga synk */ }
  })();
}

// Admin-liste: alle ikke-stale boliger (synlige først, deretter nyest oppdatert)
export async function listAdminProperties(db) {
  const props = await db.collection(PROPERTIES_COLL)
    .find({ stale: { $ne: true } }, { projection: { _id: 0 } })
    .sort({ visible: -1, platformUpdatedAt: -1 })
    .limit(500)
    .toArray();
  return props;
}

// Offentlig liste: KUN synlige + ikke-stale, personvern-trygge felt.
export async function listPublicProperties(db, { limit = 12 } = {}) {
  const lim = Math.min(Math.max(Number(limit) || 12, 1), 24);
  const props = await db.collection(PROPERTIES_COLL)
    .find(
      { visible: true, stale: { $ne: true } },
      { projection: { _id: 0, id: 1, title: 1, area: 1, city: 1, type: 1, bedrooms: 1, sqm: 1, images: 1, status: 1, model: 1, monthlyRentBand: 1, availableFrom: 1 } }
    )
    .sort({ status: 1, platformUpdatedAt: -1 }) // 'active' før 'rented'
    .limit(lim)
    .toArray();
  return props;
}

// Sett synlighet — enkelt-id eller bulk. Returnerer antall endret.
export async function setPropertyVisibility(db, { id, ids, visible }) {
  const v = visible === true;
  const list = Array.isArray(ids) && ids.length ? ids : (id ? [id] : []);
  if (!list.length) return { ok: false, error: 'Mangler id/ids' };
  const clean = list.map((x) => String(x).slice(0, 80)).slice(0, 500);
  const r = await db.collection(PROPERTIES_COLL).updateMany({ id: { $in: clean } }, { $set: { visible: v, visibilityChangedAt: new Date().toISOString() } });
  return { ok: true, changed: r.modifiedCount || 0, visible: v };
}
