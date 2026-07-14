// ---------------------------------------------------------------------------
// Google Search Console — server-til-server-klient (Service Account, RS256-JWT
// signert med Node crypto — INGEN googleapis-avhengighet).
//
// Gir DigiHome ekte Google-data (det SerpApi umulig kan se utenfra):
//  · Søkeanalyse: klikk/visninger/CTR/posisjon per dato, søkeord og side
//  · «Nesten der»-listen: søkeord på posisjon 11–20 = raskeste SEO-gevinster
//  · URL-inspeksjon: er en side indeksert, og hvorfor/hvorfor ikke
//
// KVOTE (rause, men respekteres): Search Analytics ~1200 QPM; URL Inspection
// 2000/dag + 600/min per eiendom. Overview caches 6 t i Mongo (gsc_cache),
// inspeksjoner 24 t per URL (gsc_inspections). GSC-data har ~2 døgns
// etterslep → sluttdato settes alltid til i dag − 2.
//
// Env (server-only): GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY (\n-escapet i .env).
// Eiendommen auto-detekteres via sites.list (sc-domain:digihome.no).
// ---------------------------------------------------------------------------
import crypto from 'crypto';

const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const TOKEN_URI = 'https://oauth2.googleapis.com/token';
const CACHE_COLL = 'gsc_cache';
const INSPECT_COLL = 'gsc_inspections';
const OVERVIEW_TTL_MS = 6 * 3600 * 1000;
const INSPECT_TTL_MS = 24 * 3600 * 1000;

export function gscConfigured() {
  return !!(process.env.GSC_CLIENT_EMAIL && process.env.GSC_PRIVATE_KEY);
}

function privateKey() {
  return (process.env.GSC_PRIVATE_KEY || '').replace(/\\n/g, '\n');
}

// --- Access token (in-memory cache, fornyes 5 min før utløp) ---------------
let _tok = null; // { token, exp }
async function getToken() {
  if (_tok && Date.now() < _tok.exp - 5 * 60 * 1000) return _tok.token;
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({
    iss: process.env.GSC_CLIENT_EMAIL, scope: SCOPE, aud: TOKEN_URI, iat: now, exp: now + 3600,
  })}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  const jwt = `${unsigned}.${signer.sign(privateKey()).toString('base64url')}`;
  const res = await fetch(TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
    signal: AbortSignal.timeout(10000),
  });
  const j = await res.json().catch(() => ({}));
  if (!j.access_token) throw new Error(`GSC-token feilet: ${JSON.stringify(j).slice(0, 200)}`);
  _tok = { token: j.access_token, exp: Date.now() + (Number(j.expires_in) || 3600) * 1000 };
  return _tok.token;
}

async function gscFetch(url, { method = 'GET', body } = {}) {
  const token = await getToken();
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (j.error && j.error.message) || `HTTP ${res.status}`;
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return j;
}

// --- Eiendom (auto-detekteres, foretrekker sc-domain:) ---------------------
let _prop = null; // { url, permission, at }
export async function getProperty() {
  if (_prop && Date.now() - _prop.at < 3600 * 1000) return _prop;
  const j = await gscFetch('https://www.googleapis.com/webmasters/v3/sites');
  const entries = Array.isArray(j.siteEntry) ? j.siteEntry : [];
  const pick = entries.find((e) => e.siteUrl === (process.env.GSC_PROPERTY_URL || '').trim())
    || entries.find((e) => e.siteUrl && e.siteUrl.startsWith('sc-domain:') && e.siteUrl.includes('digihome'))
    || entries.find((e) => (e.siteUrl || '').includes('digihome'))
    || entries[0];
  if (!pick) throw new Error('Ingen eiendommer tilgjengelig for servicekontoen — legg den til i Search Console');
  _prop = { url: pick.siteUrl, permission: pick.permissionLevel || null, at: Date.now() };
  return _prop;
}

// --- Search Analytics -------------------------------------------------------
export async function searchAnalytics(body) {
  const prop = await getProperty();
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(prop.url)}/searchAnalytics/query`;
  return gscFetch(url, { method: 'POST', body });
}

const dstr = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

// --- Samlet oversikt (3 API-kall, cachet 6 t) --------------------------------
export async function computeGscOverview(db, { days = 28, force = false } = {}) {
  const dd = [7, 28, 90].includes(Number(days)) ? Number(days) : 28;
  const cacheKey = `gsc_overview:${dd}`;
  if (!force) {
    try {
      const hit = await db.collection(CACHE_COLL).findOne({ key: cacheKey });
      if (hit && Date.now() - new Date(hit.at).getTime() < OVERVIEW_TTL_MS) return { ...hit.data, cached: true, cachedAt: hit.at };
    } catch (_) {}
  }

  const prop = await getProperty();
  // GSC-data henger ~2 døgn etter — sluttdato = i dag − 2.
  const end = addDays(new Date(), -2);
  const start = addDays(end, -(dd - 1));
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(dd - 1));

  // (1) Én dato-spørring som dekker BEGGE perioder → splittes lokalt.
  const dateRows = (await searchAnalytics({
    startDate: dstr(prevStart), endDate: dstr(end), dimensions: ['date'], rowLimit: 500,
  })).rows || [];
  const startStr = dstr(start);
  const series = [];
  const prevTotals = { clicks: 0, impressions: 0, posW: 0 };
  const curTotals = { clicks: 0, impressions: 0, posW: 0 };
  for (const r of dateRows) {
    const date = r.keys[0];
    const row = { date, clicks: r.clicks || 0, impressions: r.impressions || 0, ctr: r.ctr || 0, position: r.position || null };
    const t = date >= startStr ? curTotals : prevTotals;
    t.clicks += row.clicks; t.impressions += row.impressions; t.posW += (r.position || 0) * (r.impressions || 0);
    if (date >= startStr) series.push(row);
  }
  const mkTot = (t) => ({
    clicks: t.clicks,
    impressions: t.impressions,
    ctr: t.impressions ? +(100 * t.clicks / t.impressions).toFixed(2) : null,
    position: t.impressions ? +(t.posW / t.impressions).toFixed(1) : null,
  });
  const totals = mkTot(curTotals);
  const prev = mkTot(prevTotals);

  // (2) Toppsøkeord (inneværende periode).
  const queryRows = (await searchAnalytics({
    startDate: dstr(start), endDate: dstr(end), dimensions: ['query'], rowLimit: 250,
  })).rows || [];
  const queries = queryRows.map((r) => ({
    query: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0,
    ctr: +(100 * (r.ctr || 0)).toFixed(1), position: +(r.position || 0).toFixed(1),
  }));

  // «Nesten der»: posisjon 8–20 sortert på visninger — raskeste gevinster.
  const nearWins = queries
    .filter((q) => q.position >= 8 && q.position <= 20 && q.impressions >= 5)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 15);

  // (3) Toppsider (inneværende periode).
  const pageRows = (await searchAnalytics({
    startDate: dstr(start), endDate: dstr(end), dimensions: ['page'], rowLimit: 100,
  })).rows || [];
  const pages = pageRows.map((r) => ({
    page: r.keys[0], clicks: r.clicks || 0, impressions: r.impressions || 0,
    ctr: +(100 * (r.ctr || 0)).toFixed(1), position: +(r.position || 0).toFixed(1),
  }));

  const data = {
    ok: true,
    property: prop.url,
    permission: prop.permission,
    days: dd,
    range: { start: dstr(start), end: dstr(end) },
    prevRange: { start: dstr(prevStart), end: dstr(prevEnd) },
    totals, prev,
    delta: {
      clicks: totals.clicks - prev.clicks,
      impressions: totals.impressions - prev.impressions,
      ctr: totals.ctr != null && prev.ctr != null ? +(totals.ctr - prev.ctr).toFixed(2) : null,
      position: totals.position != null && prev.position != null ? +(prev.position - totals.position).toFixed(1) : null, // positiv = klatret
    },
    series,
    queries: queries.slice(0, 50),
    nearWins,
    pages: pages.slice(0, 50),
    fetchedAt: new Date().toISOString(),
  };

  try {
    await db.collection(CACHE_COLL).updateOne(
      { key: cacheKey },
      { $set: { key: cacheKey, at: new Date().toISOString(), data } },
      { upsert: true },
    );
  } catch (_) {}
  return data;
}

// --- URL-inspeksjon (indekseringsstatus, cachet 24 t per URL) ---------------
export async function inspectUrl(db, url, { force = false } = {}) {
  const clean = String(url || '').trim();
  if (!/^https:\/\/(www\.)?digihome\.no\//.test(clean) && clean !== 'https://digihome.no/' && clean !== 'https://www.digihome.no/') {
    throw new Error('URL må være under https://digihome.no/');
  }
  if (!force) {
    try {
      const hit = await db.collection(INSPECT_COLL).findOne({ url: clean }, { projection: { _id: 0 } });
      if (hit && Date.now() - new Date(hit.checkedAt).getTime() < INSPECT_TTL_MS) return { ...hit, cached: true };
    } catch (_) {}
  }
  const prop = await getProperty();
  const j = await gscFetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    body: { inspectionUrl: clean, siteUrl: prop.url, languageCode: 'nb-NO' },
  });
  const r = (j.inspectionResult && j.inspectionResult.indexStatusResult) || {};
  const doc = {
    url: clean,
    verdict: r.verdict || null,               // PASS / NEUTRAL / FAIL
    coverageState: r.coverageState || null,   // f.eks. «Sendt inn og indeksert»
    indexingState: r.indexingState || null,
    lastCrawlTime: r.lastCrawlTime || null,
    robotsTxtState: r.robotsTxtState || null,
    pageFetchState: r.pageFetchState || null,
    googleCanonical: r.googleCanonical || null,
    userCanonical: r.userCanonical || null,
    inspectionResultLink: (j.inspectionResult && j.inspectionResult.inspectionResultLink) || null,
    checkedAt: new Date().toISOString(),
  };
  try {
    await db.collection(INSPECT_COLL).updateOne({ url: clean }, { $set: doc }, { upsert: true });
  } catch (_) {}
  return doc;
}

// Status for UI-et: konfigurert? eiendom? tilgang?
export async function gscStatus() {
  if (!gscConfigured()) return { configured: false };
  try {
    const prop = await getProperty();
    return { configured: true, property: prop.url, permission: prop.permission };
  } catch (e) {
    return { configured: true, error: e.message };
  }
}
