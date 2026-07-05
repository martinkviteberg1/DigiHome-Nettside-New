// ---------------------------------------------------------------------------
// Ekstern API-forbrukstelling (egen telling = estimat).
//
// Vi teller hvert fakturerbare kall mot eksterne tjenester der DET SKJER
// (SendGrid-utsending, SerpAPI-søk, Google Maps autocomplete/details) og
// priser dem mot en liten prisliste → estimert kostnad i sanntid.
// Leverandørens faktura er fasit; dette er attribusjon/trend.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import { USD_TO_NOK } from '@/lib/llm-usage';

export const EXT_USAGE_COLL = 'ext_usage';

// Enhetspriser (USD) — listepriser per 2026, oppdater ved behov.
export const EXT_SERVICES = {
  sendgrid: { label: 'SendGrid', detail: 'E-postutsending (nyhetsbrev, kvitteringer, varsler)', unit: 'e-poster', usdPerUnit: 0.0006 },
  serpapi: { label: 'SerpAPI', detail: 'Konkurrentannonser (Google Ads Transparency)', unit: 'søk', usdPerUnit: 0.015 },
  google_maps_autocomplete: { label: 'Google Maps · Autocomplete', detail: 'Adressefelt i skjemaer', unit: 'kall', usdPerUnit: 0.00283 },
  google_maps_details: { label: 'Google Maps · Place Details', detail: 'Postnummer/poststed ved adressevalg', unit: 'kall', usdPerUnit: 0.017 },
};

const r = (x, d = 6) => { const m = Math.pow(10, d); return Math.round((Number(x) || 0) * m) / m; };

// Fire-and-forget: logg én forbruks-hendelse. Feiler stille.
export async function logExtUsage(db, service, units = 1) {
  try {
    if (!db || !service) return;
    const meta = EXT_SERVICES[service] || { usdPerUnit: 0 };
    const n = Math.max(1, Number(units) || 1);
    const usd = r(meta.usdPerUnit * n, 6);
    await db.collection(EXT_USAGE_COLL).insertOne({
      id: uuidv4(),
      at: new Date().toISOString(),
      service: String(service).slice(0, 60),
      units: n,
      costUsd: usd,
      costNok: r(usd * USD_TO_NOK, 4),
    });
  } catch (_) { /* stille */ }
}

// Aggregert forbruk per tjeneste siste N dager. Kjente tjenester vises alltid
// (med 0 hvis ingen bruk) slik at panelet er komplett.
export async function summarizeExtUsage(db, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let rows = [];
  try {
    rows = await db.collection(EXT_USAGE_COLL).aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: '$service', units: { $sum: '$units' }, costNok: { $sum: '$costNok' }, costUsd: { $sum: '$costUsd' }, calls: { $sum: 1 } } },
    ]).toArray();
  } catch (_) { rows = []; }
  const byService = new Map(rows.map((x) => [x._id, x]));
  const r2 = (x) => Math.round((Number(x) || 0) * 10000) / 10000;
  const services = Object.entries(EXT_SERVICES).map(([id, meta]) => {
    const hit = byService.get(id) || { units: 0, costNok: 0, costUsd: 0 };
    return {
      service: id,
      label: meta.label,
      detail: meta.detail,
      unit: meta.unit,
      units: hit.units || 0,
      costNok: r2(hit.costNok),
      costUsd: r2(hit.costUsd),
      source: 'estimate',
    };
  });
  // Ukjente tjenester (fremtidige) tas også med.
  for (const row of rows) {
    if (!EXT_SERVICES[row._id]) {
      services.push({ service: row._id, label: row._id, detail: '', unit: 'kall', units: row.units || 0, costNok: r2(row.costNok), costUsd: r2(row.costUsd), source: 'estimate' });
    }
  }
  return {
    days,
    totalNok: r2(services.reduce((s, x) => s + x.costNok, 0)),
    services: services.sort((a, b) => b.costNok - a.costNok),
  };
}

// ── Plattform-prosjektets kostnader (CRM) ───────────────────────────────────
// Hentes fra deres GET /api/usage/external (X-Bridge-Token) med 10 min
// DB-cache (kv_cache). Gjenbrukes av både API-forbruk-panelet og økonomimodulen.
const TEST_HOSTS = ['preview.emergentagent.com', 'localhost', '127.0.0.1'];
function isProdEnv() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').toLowerCase();
  if (!base) return false;
  return !TEST_HOSTS.some((h) => base.includes(h));
}
function crmTarget() {
  const trim = (u) => (u || '').trim().replace(/\/+$/, '');
  if (isProdEnv()) {
    return { url: trim(process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no'), key: process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '', env: 'prod' };
  }
  return { url: trim(process.env.DIGIHOME_API_URL_TEST || process.env.DIGIHOME_API_URL || ''), key: process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY || '', env: 'test' };
}

export async function getPlatformUsage(db, { fresh = false } = {}) {
  const CACHE_KEY = 'platform_usage_external';
  if (!fresh) {
    try {
      const hit = await db.collection('kv_cache').findOne({ key: CACHE_KEY });
      if (hit && hit.at && Date.now() - new Date(hit.at).getTime() < 10 * 60000) return hit.value;
    } catch (_) {}
  }
  const target = crmTarget();
  let value = { status: 'waiting', services: null, llm: null, env: target.env, checkedAt: new Date().toISOString() };
  if (target.url) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(`${target.url}/api/usage/external`, {
        headers: {
          'X-Bridge-Token': process.env.AGENT_BRIDGE_SECRET || '',
          ...(target.key ? { 'X-API-Key': target.key } : {}),
        },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) {
        const j = await res.json().catch(() => null);
        if (j && j.ok) value = { status: 'ok', month: j.month || null, generatedAt: j.generatedAt || null, services: j.services || [], llm: j.llm || null, env: target.env, checkedAt: new Date().toISOString() };
        else value.status = 'invalid';
      } else {
        value.status = res.status === 404 ? 'waiting' : 'error';
        value.httpStatus = res.status;
      }
    } catch (_) { value.status = 'error'; }
  }
  try { await db.collection('kv_cache').updateOne({ key: CACHE_KEY }, { $set: { at: new Date().toISOString(), value } }, { upsert: true }); } catch (_) {}
  return value;
}

// Summerer plattformens tjenester + deres LLM til NOK (USD × kurs, NOK 1:1).
// Merk: tallene er hittil-denne-måneden fra plattformens endepunkt.
export function platformCostsNok(platform) {
  if (!platform || platform.status !== 'ok') return 0;
  let usd = 0, nok = 0;
  const add = (cost, currency) => {
    const c = Number(cost) || 0;
    if ((currency || 'USD').toUpperCase() === 'NOK') nok += c; else usd += c;
  };
  for (const s of platform.services || []) add(s.cost, s.currency);
  for (const m of (platform.llm && platform.llm.byModel) || []) add(m.cost, m.currency);
  return Math.round((nok + usd * USD_TO_NOK) * 100) / 100;
}
