// ---------------------------------------------------------------------------
// TOVEIS LEAD-SYNK — vår side (skriveretning: marketing-admin → CRM).
// Når admin endrer status/verdi/kilde i Historikk-fanen legges endringen i en
// UTBOKS (lead_pushback_outbox) og sendes til plattformens
// PATCH /api/leads/status (spesifisert i agent-broen, tråd `leads-writeback`).
// Robusthet: endepunktet finnes ikke ennå / CRM nede → endringen blir liggende
// som pending og re-forsøkes ved hver synk og hver ny endring. Idempotens via
// event_id = `${platform_id}:${status}:${updated_at}`.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';

export const PUSHBACK_COLL = 'lead_pushback_outbox';
const MAX_BATCH = 100;

// Legg en endring i utboksen. Én pending-rad per platform_id (siste vinner):
// gjentatte redigeringer på samme lead slås sammen før sending.
export async function queueLeadPushback(db, { platform_id, status, won_value, source, archived, origin = 'historikk' }) {
  if (!platform_id) return { ok: false, error: 'Mangler platform_id' };
  const now = new Date().toISOString();
  const fields = {};
  if (status !== undefined) fields.status = status;
  if (won_value !== undefined) fields.won_value = won_value;
  if (source !== undefined) fields.source = source;
  // Toveis slette-synk (10/7): archived true/false → plattformen soft-sletter/
  // gjenoppretter sin lead (kontrakt spesifisert i closed-loop-tråden).
  if (archived !== undefined) fields.archived = archived;
  if (!Object.keys(fields).length) return { ok: false, error: 'Ingen felt å sende' };
  const existing = await db.collection(PUSHBACK_COLL).findOne({ platform_id, state: 'pending' });
  const merged = { ...(existing?.fields || {}), ...fields };
  await db.collection(PUSHBACK_COLL).updateOne(
    { platform_id, state: 'pending' },
    {
      $set: {
        platform_id,
        fields: merged,
        updated_at: now,
        event_id: `${platform_id}:${merged.status || 'nostatus'}:${now}`,
        origin,
        state: 'pending',
      },
      $setOnInsert: { id: uuidv4(), created_at: now, attempts: 0 },
    },
    { upsert: true }
  );
  return { ok: true };
}

// Send alle pending-endringer til CRM-et. Kalles etter hver override-endring og
// etter hver synk (fungerer som retry-loop). Tåler at endepunktet mangler (404).
export async function flushLeadPushbacks(db, { target, key } = {}) {
  if (!target) return { ok: false, error: 'Plattform-URL mangler' };
  const pending = await db.collection(PUSHBACK_COLL)
    .find({ state: 'pending' }).sort({ updated_at: 1 }).limit(MAX_BATCH).toArray();
  if (!pending.length) return { ok: true, sent: 0, pending: 0 };

  const updates = pending.map((p) => ({
    id: p.platform_id,
    ...p.fields,
    event_id: p.event_id,
    updated_at: p.updated_at,
    updated_by: 'marketing-admin',
  }));

  const now = new Date().toISOString();
  let res;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      res = await fetch(`${target.replace(/\/$/, '')}/api/leads/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(key ? { 'X-API-Key': key } : {}) },
        body: JSON.stringify({ updates }),
        signal: ctrl.signal,
      });
    } finally { clearTimeout(t); }
  } catch (e) {
    const err = e.name === 'AbortError' ? 'Tidsavbrudd mot CRM' : e.message;
    await db.collection(PUSHBACK_COLL).updateMany(
      { id: { $in: pending.map((p) => p.id) } },
      { $set: { last_error: err, last_attempt_at: now }, $inc: { attempts: 1 } }
    );
    return { ok: false, error: err, pending: pending.length };
  }

  if (res.status === 404) {
    // Endepunktet er ikke utplassert hos plattformen ennå — behold køen.
    await db.collection(PUSHBACK_COLL).updateMany(
      { id: { $in: pending.map((p) => p.id) } },
      { $set: { last_error: 'CRM-endepunkt ikke live ennå (404)', last_attempt_at: now }, $inc: { attempts: 1 } }
    );
    return { ok: false, error: 'CRM-endepunkt ikke live ennå (404)', pending: pending.length };
  }
  if (!res.ok) {
    await db.collection(PUSHBACK_COLL).updateMany(
      { id: { $in: pending.map((p) => p.id) } },
      { $set: { last_error: `HTTP ${res.status}`, last_attempt_at: now }, $inc: { attempts: 1 } }
    );
    return { ok: false, error: `HTTP ${res.status}`, pending: pending.length };
  }

  // 2xx: marker per element ut fra results (ok/applied/skipped → done, error → failed)
  let j = null; try { j = await res.json(); } catch (e) { j = null; }
  const results = Array.isArray(j?.results) ? j.results : null;
  let done = 0, failed = 0;
  for (const p of pending) {
    const r = results ? results.find((x) => x.id === p.platform_id) : { ok: true };
    if (r && r.ok !== false) {
      await db.collection(PUSHBACK_COLL).updateOne({ id: p.id }, { $set: { state: 'done', result: r?.skipped ? `skipped:${r.skipped}` : 'applied', done_at: now, last_error: null } });
      done++;
    } else {
      await db.collection(PUSHBACK_COLL).updateOne({ id: p.id }, { $set: { state: 'failed', last_error: r?.error || 'ukjent feil', last_attempt_at: now }, $inc: { attempts: 1 } });
      failed++;
    }
  }
  return { ok: true, sent: pending.length, done, failed };
}

// Status for utboksen (til UI/verifisering).
export async function pushbackStats(db) {
  const rows = await db.collection(PUSHBACK_COLL).aggregate([
    { $group: { _id: '$state', n: { $sum: 1 } } },
  ]).toArray();
  const byState = Object.fromEntries(rows.map((r) => [r._id, r.n]));
  const lastPending = await db.collection(PUSHBACK_COLL)
    .find({ state: 'pending' }).sort({ updated_at: -1 }).limit(1)
    .project({ _id: 0, last_error: 1, attempts: 1, updated_at: 1 }).toArray();
  return { byState, pending: byState.pending || 0, done: byState.done || 0, failed: byState.failed || 0, lastPendingInfo: lastPending[0] || null };
}
