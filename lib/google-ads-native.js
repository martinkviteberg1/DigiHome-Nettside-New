// ---------------------------------------------------------------------------
// Native Google Ads API via REST (egne credentials, Basic Access).
//
// Erstatter Composio-broen. Bruker vår egen developer-token + OAuth2
// (client_id/secret + refresh_token) til å lese OG skrive direkte mot
// Google Ads API. Ren REST (ingen uoffisielt npm-bibliotek) → mer stabilt.
//
// Fase 1: rapportering (GAQL) + kreativ-henting.
// Fase 2: offline klikk-konvertering (lukket sløyfe).
// Fase 3: kampanjestyring (opprett/pause/aktiver/budsjett).
// ---------------------------------------------------------------------------

const API_VER = process.env.GOOGLE_ADS_API_VERSION || 'v22';
const OAUTH_URL = 'https://oauth2.googleapis.com/token';
const BASE = `https://googleads.googleapis.com/${API_VER}`;

const DEV = () => (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim();
const CLIENT_ID = () => (process.env.GOOGLE_ADS_CLIENT_ID || '').trim();
const CLIENT_SECRET = () => (process.env.GOOGLE_ADS_CLIENT_SECRET || '').trim();
const REFRESH_TOKEN = () => (process.env.GOOGLE_ADS_REFRESH_TOKEN || '').trim();
const LOGIN_CID = () => (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/[^0-9]/g, '');

export function googleAdsNativeConfigured() {
  return !!(DEV() && CLIENT_ID() && CLIENT_SECRET() && REFRESH_TOKEN() && defaultCustomerId());
}
export function defaultCustomerId() {
  return (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, '');
}
export function loginCustomerId() { return LOGIN_CID(); }

// Eksporteres slik at Data Manager-modulen kan gjenbruke samme OAuth-token
// (det nye dual-scope refresh-tokenet dekker både adwords og datamanager).
export async function getAccessToken() { return accessToken(); }
export function conversionActionIdFromResourceName(rn) {
  const m = String(rn || '').match(/conversionActions\/(\d+)/);
  return m ? m[1] : null;
}

export const REPORT_TTL_MS = 10 * 60 * 1000; // 10 min
export const GOOGLE_PERIODS = ['last_7d', 'last_30d', 'last_90d', 'this_year', 'all'];

export function periodToRange(period) {
  const now = new Date();
  const until = now.toISOString();
  const dayMs = 86400000;
  switch (period) {
    case 'last_7d': return { since: new Date(now - 7 * dayMs).toISOString(), until };
    case 'last_90d': return { since: new Date(now - 90 * dayMs).toISOString(), until };
    case 'this_year': return { since: new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).toISOString(), until };
    case 'all': return { since: '2015-01-01T00:00:00.000Z', until };
    case 'last_30d':
    default: return { since: new Date(now - 30 * dayMs).toISOString(), until };
  }
}

// --- OAuth: refresh-token → access-token (cachet i minne pr. prosess) -------
let _tok = { value: null, exp: 0 };
async function accessToken() {
  if (_tok.value && Date.now() < _tok.exp - 60000) return _tok.value;
  const body = new URLSearchParams({
    client_id: CLIENT_ID(), client_secret: CLIENT_SECRET(),
    refresh_token: REFRESH_TOKEN(), grant_type: 'refresh_token',
  });
  const r = await fetch(OAUTH_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Google OAuth feilet: ' + (j.error_description || j.error || ('HTTP ' + r.status)));
  _tok = { value: j.access_token, exp: Date.now() + ((j.expires_in || 3600) * 1000) };
  return _tok.value;
}

function authHeaders(token, withLogin = true) {
  const h = { Authorization: `Bearer ${token}`, 'developer-token': DEV() };
  if (withLogin && LOGIN_CID()) h['login-customer-id'] = LOGIN_CID();
  return h;
}

function gErr(j) {
  try {
    const e = (j && j.error) || {};
    const det = e.details && e.details[0];
    const inner = det && det.errors && det.errors[0];
    return (inner && inner.message) || e.message || (typeof j === 'string' ? j : JSON.stringify(j)).slice(0, 240);
  } catch (_) { return 'Google Ads API-feil'; }
}

const cleanCid = (cid) => String(cid || defaultCustomerId()).replace(/[^0-9]/g, '');

// --- GAQL search (paginert) -------------------------------------------------
export async function gaqlSearch(customerId, query) {
  const token = await accessToken();
  const cid = cleanCid(customerId);
  const all = [];
  let pageToken;
  do {
    const r = await fetch(`${BASE}/customers/${cid}/googleAds:search`, {
      method: 'POST',
      headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify(pageToken ? { query, pageToken } : { query }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(gErr(j));
    if (Array.isArray(j.results)) all.push(...j.results);
    pageToken = j.nextPageToken;
  } while (pageToken);
  return all;
}

// Generisk mutate mot en tjeneste (campaigns, campaignBudgets, ...).
async function mutate(customerId, service, operations, extra = {}) {
  const token = await accessToken();
  const cid = cleanCid(customerId);
  const r = await fetch(`${BASE}/customers/${cid}/${service}:mutate`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ operations, ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(gErr(j));
  return j;
}

// Atomisk multi-operasjon (GoogleAdsService.mutate) med temp-ressursnavn.
async function googleAdsMutate(customerId, mutateOperations, extra = {}) {
  const token = await accessToken();
  const cid = cleanCid(customerId);
  const r = await fetch(`${BASE}/customers/${cid}/googleAds:mutate`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ mutateOperations, ...extra }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(gErr(j));
  return j;
}

// --- Parsing-hjelpere -------------------------------------------------------
function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function pick(obj, ...keys) { for (const k of keys) if (obj && obj[k] != null) return obj[k]; return undefined; }

export function aggregateCampaigns(rows) {
  const byKey = new Map();
  for (const r of rows || []) {
    const camp = r.campaign || {};
    const metrics = r.metrics || {};
    const id = String(pick(camp, 'id', 'resourceName') || '');
    const name = String(pick(camp, 'name') || (id ? `Kampanje ${id}` : 'Ukjent kampanje'));
    const key = id || name.toLowerCase();
    const costMicros = num(pick(metrics, 'costMicros'));
    const clicks = num(pick(metrics, 'clicks'));
    const impressions = num(pick(metrics, 'impressions'));
    const conversions = num(pick(metrics, 'conversions'));
    if (!byKey.has(key)) byKey.set(key, { name, cost: 0, clicks: 0, impressions: 0, conversions: 0 });
    const o = byKey.get(key);
    o.cost += costMicros / 1e6; o.clicks += clicks; o.impressions += impressions; o.conversions += conversions;
  }
  return Array.from(byKey.values())
    .map((c) => ({ ...c, cost: Math.round(c.cost * 100) / 100, conversions: Math.round(c.conversions * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);
}

export function aggregateDaily(rows) {
  const byDate = new Map();
  for (const r of rows || []) {
    const seg = r.segments || {};
    const metrics = r.metrics || {};
    const date = String(pick(seg, 'date') || '');
    if (!date) continue;
    const cost = num(pick(metrics, 'costMicros')) / 1e6;
    const clicks = num(pick(metrics, 'clicks'));
    const impressions = num(pick(metrics, 'impressions'));
    const conversions = num(pick(metrics, 'conversions'));
    if (!byDate.has(date)) byDate.set(date, { date, cost: 0, clicks: 0, impressions: 0, conversions: 0 });
    const o = byDate.get(date);
    o.cost += cost; o.clicks += clicks; o.impressions += impressions; o.conversions += conversions;
  }
  return Array.from(byDate.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({ ...d, cost: Math.round(d.cost * 100) / 100, conversions: Math.round(d.conversions * 100) / 100 }));
}

// --- Autoritativt annonseforbruk (kampanjenivå) -----------------------------
// VIKTIG: `runAdsWithMetrics` leser på ANNONSENIVÅ (ad_group_ad). Det fanger
// IKKE Performance Max / Demand Gen / Video-kampanjer (som ikke har
// ad_group_ad-rader) og heller ikke fjernede annonser som hadde forbruk i
// perioden. Kampanjenivå er fasit for «hva har vi faktisk brukt».
export async function googleSpendTotals({ since, until, customerId } = {}) {
  const cid = cleanCid(customerId);
  const from = new Date(since || Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);
  const query = `SELECT campaign.id, campaign.name, campaign.advertising_channel_type, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const rows = await gaqlSearch(cid, query);
  const byCamp = new Map();
  const totals = { cost: 0, clicks: 0, impressions: 0, conversions: 0, convValue: 0 };
  for (const r of rows || []) {
    const m = r.metrics || {};
    const cost = num(pick(m, 'costMicros')) / 1e6;
    const clicks = num(pick(m, 'clicks'));
    const impressions = num(pick(m, 'impressions'));
    const conversions = num(pick(m, 'conversions'));
    const convValue = num(pick(m, 'conversionsValue'));
    totals.cost += cost; totals.clicks += clicks; totals.impressions += impressions;
    totals.conversions += conversions; totals.convValue += convValue;
    const camp = r.campaign || {};
    const key = String(pick(camp, 'id') || pick(camp, 'name') || '?');
    if (!byCamp.has(key)) byCamp.set(key, { id: key, name: String(pick(camp, 'name') || key), channelType: String(pick(camp, 'advertisingChannelType') || ''), cost: 0, clicks: 0, impressions: 0, conversions: 0, convValue: 0 });
    const o = byCamp.get(key);
    o.cost += cost; o.clicks += clicks; o.impressions += impressions; o.conversions += conversions; o.convValue += convValue;
  }
  const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
  return {
    from, to,
    totals: { cost: r2(totals.cost), clicks: totals.clicks, impressions: totals.impressions, conversions: r2(totals.conversions), convValue: r2(totals.convValue) },
    campaigns: Array.from(byCamp.values()).map((c) => ({ ...c, cost: r2(c.cost), conversions: r2(c.conversions), convValue: r2(c.convValue) })).sort((a, b) => b.cost - a.cost),
  };
}

// --- Fase 1: kampanjerapport + kreativer ------------------------------------
export async function runCampaignReport({ since, until, customerId } = {}) {
  const cid = cleanCid(customerId);
  const from = new Date(since || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);
  const query = `SELECT campaign.id, campaign.name, campaign.status, segments.date, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const rows = await gaqlSearch(cid, query);
  const campaigns = aggregateCampaigns(rows);
  const series = aggregateDaily(rows);
  const totals = campaigns.reduce(
    (a, c) => ({ cost: a.cost + c.cost, clicks: a.clicks + c.clicks, impressions: a.impressions + c.impressions, conversions: a.conversions + c.conversions }),
    { cost: 0, clicks: 0, impressions: 0, conversions: 0 },
  );
  totals.cost = Math.round(totals.cost * 100) / 100;
  totals.conversions = Math.round(totals.conversions * 100) / 100;
  return { campaigns, series, totals, from, to, customerId: cid, rowCount: rows.length };
}

export async function runAdsCreatives({ customerId } = {}) {
  const cid = cleanCid(customerId);
  const query = "SELECT campaign.name, campaign.status, ad_group.name, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED'";
  const rows = await gaqlSearch(cid, query);
  const txt = (arr) => (Array.isArray(arr) ? arr.map((x) => (x && x.text) || '').filter(Boolean) : []);
  const ads = rows.map((r) => {
    const camp = r.campaign || {};
    const ag = r.adGroup || {};
    const aga = r.adGroupAd || {};
    const ad = aga.ad || {};
    const rsa = ad.responsiveSearchAd || {};
    const ps = aga.policySummary || {};
    return {
      id: String(ad.id || ''),
      type: ad.type || 'RESPONSIVE_SEARCH_AD',
      campaign: camp.name || '',
      campaignStatus: camp.status || '',
      adGroup: ag.name || '',
      status: aga.status || '',
      approval: ps.approvalStatus || '',
      finalUrl: (ad.finalUrls && ad.finalUrls[0]) || '',
      headlines: txt(rsa.headlines),
      descriptions: txt(rsa.descriptions),
    };
  }).filter((a) => a.id);
  return { ads, customerId: cid, rowCount: rows.length };
}

// --- Tilkoblingsstatus + connect-link (native trenger ingen OAuth-flyt) -----
export async function getConnectionStatus() {
  try {
    const token = await accessToken();
    const r = await fetch(`${BASE}/customers:listAccessibleCustomers`, { headers: authHeaders(token, false) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { connected: false, status: 'ERROR', connectedAccountId: null, count: 0, error: gErr(j), provider: 'native' };
    const names = j.resourceNames || [];
    return { connected: true, status: 'ACTIVE', connectedAccountId: defaultCustomerId(), count: names.length, provider: 'native' };
  } catch (e) {
    return { connected: false, status: 'ERROR', connectedAccountId: null, count: 0, error: e.message, provider: 'native' };
  }
}

export async function createConnectLink() {
  // Native bruker API-nøkler fra .env → ingen hosted OAuth-lenke nødvendig.
  return { redirectUrl: null, connectionId: null, authConfigId: null, alreadyConnected: true,
    message: 'Google Ads er koblet til via native API-nøkler. Ingen innloggingslenke nødvendig.' };
}

// ---------------------------------------------------------------------------
// Caching (stale-while-revalidate). Native er rask (~0,3–1 s), men vi bruker
// samme robuste mønster for å aldri henge dashbordet.
// ---------------------------------------------------------------------------
const FETCH_TIMEOUT_MS = 12000;
const _inflight = new Map();

function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, reject) => { t = setTimeout(() => reject(new Error('timeout')), ms); });
  return Promise.race([Promise.resolve(promise).finally(() => clearTimeout(t)), timeout]);
}

function emptyReport(p) {
  const range = periodToRange(p);
  return { campaigns: [], series: [], totals: { cost: 0, clicks: 0, impressions: 0, conversions: 0 },
    from: range.since.slice(0, 10), to: range.until.slice(0, 10), customerId: defaultCustomerId(), rowCount: 0 };
}

function refreshReport(db, p) {
  if (_inflight.has(p)) return _inflight.get(p);
  const task = (async () => {
    const range = periodToRange(p);
    const report = await runCampaignReport(range);
    const fetchedAt = new Date().toISOString();
    await db.collection('google_report_cache').updateOne(
      { key: `google_report:${p}` },
      { $set: { key: `google_report:${p}`, period: p, report, fetchedAt } },
      { upsert: true },
    );
    return { report, fetchedAt };
  })();
  _inflight.set(p, task);
  task.catch(() => {}).finally(() => { _inflight.delete(p); });
  return task;
}

export async function getCachedReport(db, period = 'last_30d', { force = false } = {}) {
  const p = GOOGLE_PERIODS.includes(period) ? period : 'last_30d';
  const coll = db.collection('google_report_cache');
  const existing = await coll.findOne({ key: `google_report:${p}` });
  const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;
  if (!force && existing && ageMs < REPORT_TTL_MS) {
    return { report: existing.report, fetchedAt: existing.fetchedAt, cached: true, stale: false };
  }
  const fetchTask = refreshReport(db, p);
  if (existing && !force) {
    return { report: existing.report, fetchedAt: existing.fetchedAt, cached: true, stale: true };
  }
  try {
    const r = await withTimeout(fetchTask, FETCH_TIMEOUT_MS);
    return { report: r.report, fetchedAt: r.fetchedAt, cached: false, stale: false };
  } catch (e) {
    if (existing) return { report: existing.report, fetchedAt: existing.fetchedAt, cached: true, stale: true, error: 'Oppdatering tar lengre tid enn vanlig – viser forrige data.' };
    const pending = e.message === 'timeout';
    return { report: emptyReport(p), fetchedAt: null, cached: false, stale: true, pending,
      error: pending ? 'Henter live Google Ads-data …' : e.message };
  }
}

export async function getCachedCreatives(db, { force = false } = {}) {
  const coll = db.collection('google_creatives_cache');
  const existing = await coll.findOne({ key: 'google_creatives' });
  const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;
  if (!force && existing && ageMs < REPORT_TTL_MS) {
    return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: false };
  }
  const task = (async () => {
    const r = await runAdsCreatives();
    const fetchedAt = new Date().toISOString();
    await coll.updateOne({ key: 'google_creatives' }, { $set: { key: 'google_creatives', ads: r.ads, fetchedAt } }, { upsert: true });
    return { ads: r.ads, fetchedAt };
  })();
  task.catch(() => {});
  if (existing && !force) return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: true };
  try {
    const r = await withTimeout(task, FETCH_TIMEOUT_MS);
    return { ads: r.ads, fetchedAt: r.fetchedAt, cached: false, stale: false };
  } catch (e) {
    if (existing) return { ads: existing.ads, fetchedAt: existing.fetchedAt, cached: true, stale: true, error: e.message };
    return { ads: [], fetchedAt: null, cached: false, stale: true, pending: e.message === 'timeout', error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Fase 2: offline klikk-konvertering (lukket sløyfe)
// ---------------------------------------------------------------------------

// List konverteringshandlinger (for å finne riktig UPLOAD_CLICKS-ressursnavn).
export async function listConversionActions(customerId) {
  const cid = cleanCid(customerId);
  const query = 'SELECT conversion_action.id, conversion_action.name, conversion_action.type, conversion_action.status, conversion_action.category, conversion_action.resource_name FROM conversion_action ORDER BY conversion_action.name';
  const rows = await gaqlSearch(cid, query);
  return rows.map((r) => {
    const c = r.conversionAction || {};
    return { id: String(c.id || ''), name: c.name || '', type: c.type || '', status: c.status || '', category: c.category || '', resourceName: c.resourceName || '' };
  });
}

// Finn (eller opprett) en UPLOAD_CLICKS-konverteringshandling som matcher
// GOOGLE_ADS_OFFLINE_CONVERSION_NAME. Returnerer resourceName.
export async function resolveOfflineConversionAction(customerId, { create = false } = {}) {
  const cid = cleanCid(customerId);
  const wanted = (process.env.GOOGLE_ADS_OFFLINE_CONVERSION_NAME || 'DigiHome – Vunnet utleier').trim();
  const all = await listConversionActions(cid);
  const uploadClicks = all.filter((a) => a.type === 'UPLOAD_CLICKS');
  // 1) eksakt navnematch (UPLOAD_CLICKS)
  let found = uploadClicks.find((a) => a.name.trim().toLowerCase() === wanted.toLowerCase());
  // 2) fallback: hvilken som helst aktiv UPLOAD_CLICKS
  if (!found) found = uploadClicks.find((a) => a.status === 'ENABLED') || uploadClicks[0];
  if (found) return { resourceName: found.resourceName, name: found.name, created: false };
  if (!create) return { resourceName: null, name: null, created: false };
  // 3) opprett ny UPLOAD_CLICKS-handling
  const res = await mutate(cid, 'conversionActions', [{
    create: {
      name: wanted,
      type: 'UPLOAD_CLICKS',
      category: 'DEFAULT',
      status: 'ENABLED',
      primaryForGoal: true,
      valueSettings: { defaultValue: Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE || '0') || 0, defaultCurrencyCode: 'NOK', alwaysUseDefaultValue: false },
      countingType: 'ONE_PER_CLICK',
    },
  }]);
  const rn = (res.results && res.results[0] && res.results[0].resourceName) || null;
  return { resourceName: rn, name: wanted, created: true };
}

// Format: 'yyyy-mm-dd hh:mm:ss+00:00' (UTC). Google konverterer selv til kontoens tz.
export function toConversionDateTime(iso) {
  const d = iso ? new Date(iso) : new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}+00:00`;
}

// Last opp én klikk-konvertering (gclid/gbraid/wbraid).
export async function uploadClickConversion(customerId, { gclid, gbraid, wbraid, value, currency, conversionDateTime, conversionActionResourceName, orderId } = {}) {
  const cid = cleanCid(customerId);
  const ids = [gclid, gbraid, wbraid].filter(Boolean);
  if (ids.length !== 1) throw new Error('Nøyaktig én av gclid/gbraid/wbraid må oppgis');
  let actionRn = conversionActionResourceName;
  if (!actionRn) {
    const resolved = await resolveOfflineConversionAction(cid, { create: false });
    actionRn = resolved.resourceName;
  }
  if (!actionRn) throw new Error('Fant ingen UPLOAD_CLICKS-konverteringshandling. Opprett den først.');
  const conversion = {
    conversionAction: actionRn,
    conversionDateTime: conversionDateTime || toConversionDateTime(),
    conversionValue: Number(value) > 0 ? Number(value) : (Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE || '0') || 0),
    currencyCode: (currency || 'NOK').toUpperCase(),
  };
  if (gclid) conversion.gclid = gclid;
  if (gbraid) conversion.gbraid = gbraid;
  if (wbraid) conversion.wbraid = wbraid;
  if (orderId) conversion.orderId = orderId;

  const token = await accessToken();
  const r = await fetch(`${BASE}/customers/${cid}:uploadClickConversions`, {
    method: 'POST',
    headers: { ...authHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversions: [conversion], partialFailure: true, validateOnly: false }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(gErr(j));
  // partialFailureError fanger per-konvertering-feil
  if (j.partialFailureError && j.partialFailureError.message) {
    return { ok: false, error: j.partialFailureError.message, raw: j };
  }
  const res0 = (j.results && j.results[0]) || {};
  return { ok: true, gclid: res0.gclid || gclid, conversionAction: res0.conversionAction || actionRn, conversionDateTime: res0.conversionDateTime || conversion.conversionDateTime };
}

// ---------------------------------------------------------------------------
// Fase 3: kampanjestyring
// ---------------------------------------------------------------------------

// Detaljert kampanjeliste (m/ budsjett + 30-dagers metrikk) for styringspanel.
// Data-modenhet: hvor lenge har kampanjen kjørt, og hvor mye kan vi stole på tallene?
// Hindrer feilkonklusjoner à la «0 konverteringer!» når kampanjen bare har kjørt 2 dager.
export function campaignMaturity(startDate) {
  if (!startDate) return { phase: 'UKJENT', daysLive: null, label: 'Ukjent alder', note: 'Fant ikke startdato for kampanjen.' };
  const start = new Date(String(startDate).replace(/-/g, '/') + ' 00:00');
  const daysLive = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  if (daysLive < 14) return {
    phase: 'LÆRING', daysLive, label: `Læringsfase (dag ${daysLive + 1})`,
    note: 'Kampanjen er i Googles læringsfase. Tallene er IKKE representative ennå — ikke trekk konklusjoner om CTR/CPA, og unngå store endringer som nullstiller læringen.',
  };
  if (daysLive < 42) return {
    phase: 'KALIBRERING', daysLive, label: `Kalibrering (${daysLive} dager)`,
    note: 'Tidlig fase: retningen kan leses, men vent med bastante konklusjoner til ~6 uker / ~30+ konverteringer.',
  };
  return { phase: 'MODEN', daysLive, label: `Moden (${daysLive} dager)`, note: 'Nok historikk til å evaluere og optimalisere på data.' };
}

export async function listCampaignsDetailed(customerId) {
  const cid = cleanCid(customerId);
  const query = 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign_budget.amount_micros, campaign_budget.resource_name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC';
  let rows = [];
  try { rows = await gaqlSearch(cid, query); } catch (e) { /* faller tilbake under */ }
  // Kampanjer uten visninger siste 30 d kan mangle i metrikk-spørringen → hent også basis.
  const baseQ = 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign.start_date, campaign_budget.amount_micros, campaign_budget.resource_name FROM campaign WHERE campaign.status != \'REMOVED\'';
  const baseRows = await gaqlSearch(cid, baseQ);
  const metricsById = new Map();
  for (const r of rows) {
    const c = r.campaign || {}; const m = r.metrics || {};
    metricsById.set(String(c.id), { cost: num(m.costMicros) / 1e6, clicks: num(m.clicks), impressions: num(m.impressions), conversions: num(m.conversions) });
  }
  return baseRows.map((r) => {
    const c = r.campaign || {}; const b = r.campaignBudget || {};
    const id = String(c.id || '');
    const mm = metricsById.get(id) || { cost: 0, clicks: 0, impressions: 0, conversions: 0 };
    return {
      id, name: c.name || '', status: c.status || '',
      channelType: c.advertisingChannelType || '', biddingStrategyType: c.biddingStrategyType || '',
      budgetResourceName: b.resourceName || '',
      dailyBudget: b.amountMicros ? Math.round((num(b.amountMicros) / 1e6) * 100) / 100 : 0,
      cost: Math.round(mm.cost * 100) / 100, clicks: mm.clicks, impressions: mm.impressions,
      conversions: Math.round(mm.conversions * 100) / 100,
      startDate: c.startDate || null,
      maturity: campaignMaturity(c.startDate),
    };
  }).sort((a, b) => b.cost - a.cost);
}

// Foreslå geo-target-konstanter ut fra stedsnavn (f.eks. "Bergen").
export async function suggestGeoTargets(names, { locale = 'no', countryCode = 'NO' } = {}) {
  const token = await accessToken();
  const arr = Array.isArray(names) ? names : [names];
  const r = await fetch(`${BASE}/geoTargetConstants:suggest`, {
    method: 'POST',
    headers: { ...authHeaders(token, false), 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale, countryCode, locationNames: { names: arr } }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(gErr(j));
  return (j.geoTargetConstantSuggestions || []).map((s) => {
    const g = s.geoTargetConstant || {};
    return { resourceName: g.resourceName || '', id: String(g.id || ''), name: g.name || '', countryCode: g.countryCode || '', targetType: g.targetType || '', reach: s.reach || 0 };
  });
}

// Endre kampanjestatus (PAUSED/ENABLED/REMOVED).
export async function setCampaignStatus(customerId, campaignId, status) {
  const cid = cleanCid(customerId);
  const VALID = ['ENABLED', 'PAUSED', 'REMOVED'];
  const st = String(status || '').toUpperCase();
  if (!VALID.includes(st)) throw new Error('Ugyldig status');
  const res = await mutate(cid, 'campaigns', [{
    update: { resourceName: `customers/${cid}/campaigns/${String(campaignId).replace(/[^0-9]/g, '')}`, status: st },
    updateMask: 'status',
  }]);
  return { ok: true, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null, status: st };
}

// Endre dagsbudsjett (NOK → micros) for en budsjettressurs.
export async function updateCampaignBudget(customerId, budgetResourceName, dailyBudgetNok) {
  const cid = cleanCid(customerId);
  if (!budgetResourceName) throw new Error('Mangler budgetResourceName');
  const amountMicros = Math.round(Number(dailyBudgetNok) * 1e6);
  if (!(amountMicros > 0)) throw new Error('Ugyldig budsjett');
  const res = await mutate(cid, 'campaignBudgets', [{
    update: { resourceName: budgetResourceName, amountMicros: String(amountMicros) },
    updateMask: 'amount_micros',
  }]);
  return { ok: true, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null, dailyBudget: dailyBudgetNok };
}

// Opprett en SEARCH-kampanje (budsjett + kampanje + annonsegruppe + RSA +
// geo-targeting + søkeord) i ÉN atomisk operasjon. Oppretter som PAUSED
// (ingen pengebruk før du aktiverer den manuelt).
export async function createSearchCampaign(customerId, opts = {}) {
  const cid = cleanCid(customerId);
  const {
    name, dailyBudget, finalUrl,
    headlines = [], descriptions = [], keywords = [],
    geoTargetConstantIds = ['2578'], // 2578 = Norge
    biddingStrategy = 'MAXIMIZE_CONVERSIONS',
    path1, path2,
    cpcBidMicros, // kun for MANUAL_CPC
    validateOnly = false,
  } = opts;

  if (!name) throw new Error('Mangler kampanjenavn');
  if (!(Number(dailyBudget) > 0)) throw new Error('Mangler/ugyldig dagsbudsjett');
  if (!finalUrl) throw new Error('Mangler landingsside-URL (finalUrl)');
  if (headlines.filter(Boolean).length < 3) throw new Error('RSA krever minst 3 titler');
  if (descriptions.filter(Boolean).length < 2) throw new Error('RSA krever minst 2 beskrivelser');

  const budgetRn = `customers/${cid}/campaignBudgets/-1`;
  const campaignRn = `customers/${cid}/campaigns/-2`;
  const adGroupRn = `customers/${cid}/adGroups/-3`;

  const biddingObj = String(biddingStrategy).toUpperCase() === 'MANUAL_CPC'
    ? { manualCpc: { enhancedCpcEnabled: false } }
    : { maximizeConversions: {} };

  const ops = [];
  ops.push({ campaignBudgetOperation: { create: {
    resourceName: budgetRn,
    name: `${name} – budsjett ${Date.now()}`,
    amountMicros: String(Math.round(Number(dailyBudget) * 1e6)),
    deliveryMethod: 'STANDARD',
    explicitlyShared: false,
  } } });

  ops.push({ campaignOperation: { create: {
    resourceName: campaignRn,
    name,
    status: 'PAUSED',
    advertisingChannelType: 'SEARCH',
    campaignBudget: budgetRn,
    containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING',
    ...biddingObj,
    networkSettings: { targetGoogleSearch: true, targetSearchNetwork: true, targetContentNetwork: false, targetPartnerSearchNetwork: false },
  } } });

  for (const gid of (geoTargetConstantIds || [])) {
    const cleanGid = String(gid).replace(/[^0-9]/g, '');
    if (!cleanGid) continue;
    ops.push({ campaignCriterionOperation: { create: { campaign: campaignRn, location: { geoTargetConstant: `geoTargetConstants/${cleanGid}` } } } });
  }

  const adGroupCreate = { resourceName: adGroupRn, name: `${name} – annonsegruppe`, campaign: campaignRn, status: 'ENABLED', type: 'SEARCH_STANDARD' };
  if (String(biddingStrategy).toUpperCase() === 'MANUAL_CPC') adGroupCreate.cpcBidMicros = String(cpcBidMicros || 2000000);
  ops.push({ adGroupOperation: { create: adGroupCreate } });

  const rsa = {
    headlines: headlines.filter(Boolean).slice(0, 15).map((t) => ({ text: String(t).slice(0, 30) })),
    descriptions: descriptions.filter(Boolean).slice(0, 4).map((t) => ({ text: String(t).slice(0, 90) })),
  };
  if (path1) rsa.path1 = String(path1).slice(0, 15);
  if (path2) rsa.path2 = String(path2).slice(0, 15);
  ops.push({ adGroupAdOperation: { create: { adGroup: adGroupRn, status: 'ENABLED', ad: { finalUrls: [finalUrl], responsiveSearchAd: rsa } } } });

  for (const kw of (keywords || [])) {
    const text = String(kw || '').trim();
    if (!text) continue;
    ops.push({ adGroupCriterionOperation: { create: { adGroup: adGroupRn, status: 'ENABLED', keyword: { text: text.slice(0, 80), matchType: 'PHRASE' } } } });
  }

  const res = await googleAdsMutate(cid, ops, validateOnly ? { validateOnly: true, partialFailure: false } : {});
  const results = res.mutateOperationResponses || [];
  const campResult = results.find((r) => r.campaignResult);
  return {
    ok: true,
    validateOnly: !!validateOnly,
    campaignResourceName: campResult ? campResult.campaignResult.resourceName : null,
    operationCount: ops.length,
    note: validateOnly ? 'Validering OK (ingenting opprettet).' : 'Kampanjen er opprettet som PAUSED. Aktiver den når du er klar.',
  };
}


// --- Runde 2: utvidelser (assets) + final URL-suffiks ----------------------

// Sett final URL-suffiks (UTM-sporing) på kampanjenivå.
export async function setCampaignFinalUrlSuffix(customerId, campaignId, suffix, { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  await mutate(cid, 'campaigns', [{ update: { resourceName: `customers/${cid}/campaigns/${campId}`, finalUrlSuffix: suffix }, updateMask: 'final_url_suffix' }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly };
}

// Les nåværende final URL-suffiks (for idempotens).
export async function getCampaignFinalUrlSuffix(customerId, campaignId) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  const rows = await gaqlSearch(cid, `SELECT campaign.final_url_suffix FROM campaign WHERE campaign.id = ${campId}`);
  return (rows[0] && rows[0].campaign && rows[0].campaign.finalUrlSuffix) || '';
}

// Hvilke asset-felttyper er allerede festet på kampanjen (for idempotens).
export async function listCampaignAssetFieldTypes(customerId, campaignId) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  const rows = await gaqlSearch(cid, `SELECT campaign.id, campaign_asset.field_type FROM campaign_asset WHERE campaign.id = ${campId} AND campaign_asset.status != 'REMOVED'`);
  return new Set(rows.map((r) => r.campaignAsset && r.campaignAsset.fieldType).filter(Boolean));
}

// Opprett + fest utvidelser på kampanjen (sitelinks, callouts, snippets) atomisk.
export async function addCampaignAssets(customerId, campaignId, { sitelinks = [], callouts = [], structuredSnippet = null, validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  const campRn = `customers/${cid}/campaigns/${campId}`;
  const ops = [];
  let t = -1;
  const created = { sitelinks: 0, callouts: 0, structuredSnippet: 0 };

  for (const s of sitelinks) {
    const aRn = `customers/${cid}/assets/${t--}`;
    const sl = { linkText: String(s.text || '').slice(0, 25) };
    if (s.desc1) sl.description1 = String(s.desc1).slice(0, 35);
    if (s.desc2) sl.description2 = String(s.desc2).slice(0, 35);
    ops.push({ assetOperation: { create: { resourceName: aRn, finalUrls: [s.url], sitelinkAsset: sl } } });
    ops.push({ campaignAssetOperation: { create: { campaign: campRn, asset: aRn, fieldType: 'SITELINK' } } });
    created.sitelinks++;
  }
  for (const c of callouts) {
    const text = String(c || '').trim();
    if (!text) continue;
    const aRn = `customers/${cid}/assets/${t--}`;
    ops.push({ assetOperation: { create: { resourceName: aRn, calloutAsset: { calloutText: text.slice(0, 25) } } } });
    ops.push({ campaignAssetOperation: { create: { campaign: campRn, asset: aRn, fieldType: 'CALLOUT' } } });
    created.callouts++;
  }
  if (structuredSnippet && structuredSnippet.header && (structuredSnippet.values || []).length >= 3) {
    const aRn = `customers/${cid}/assets/${t--}`;
    ops.push({ assetOperation: { create: { resourceName: aRn, structuredSnippetAsset: { header: structuredSnippet.header, values: structuredSnippet.values.map((v) => String(v).slice(0, 25)) } } } });
    ops.push({ campaignAssetOperation: { create: { campaign: campRn, asset: aRn, fieldType: 'STRUCTURED_SNIPPET' } } });
    created.structuredSnippet = 1;
  }
  if (!ops.length) return { ok: true, created, operationCount: 0, note: 'Ingenting å legge til' };
  const res = await googleAdsMutate(cid, ops, validateOnly ? { validateOnly: true } : {});
  return { ok: true, created, operationCount: ops.length, validateOnly, responses: (res.mutateOperationResponses || []).length };
}


// --- Blueprint-byggeklosser (legg til i EKSISTERENDE kampanje) --------------

// Tolker blueprint-søkeordssyntaks: [..]=EXACT, ".."=PHRASE, ellers PHRASE.
function parseKeyword(kw) {
  if (kw && typeof kw === 'object') return { text: String(kw.text || '').trim(), matchType: kw.matchType || 'PHRASE', cpcBidMicros: kw.cpcBidMicros };
  let s = String(kw || '').trim();
  let matchType = 'PHRASE';
  if (s.startsWith('[') && s.endsWith(']')) { matchType = 'EXACT'; s = s.slice(1, -1); }
  else if (s.startsWith('"') && s.endsWith('"')) { matchType = 'PHRASE'; s = s.slice(1, -1); }
  return { text: s.trim(), matchType };
}

// Legg til én annonsegruppe (m/ RSA + søkeord) i en EKSISTERENDE kampanje.
export async function addAdGroupWithAd(customerId, { campaignId, name, status = 'ENABLED', finalUrl, headlines = [], descriptions = [], keywords = [], defaultCpcBidMicros, path1, path2 } = {}) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId || '').replace(/[^0-9]/g, '');
  if (!campId) throw new Error('Mangler campaignId');
  if (!finalUrl) throw new Error('Mangler finalUrl');
  if (headlines.filter(Boolean).length < 3) throw new Error('RSA krever minst 3 titler');
  if (descriptions.filter(Boolean).length < 2) throw new Error('RSA krever minst 2 beskrivelser');
  const agRn = `customers/${cid}/adGroups/-1`;
  const ops = [];
  const agCreate = { resourceName: agRn, name, campaign: `customers/${cid}/campaigns/${campId}`, status, type: 'SEARCH_STANDARD' };
  if (defaultCpcBidMicros) agCreate.cpcBidMicros = String(defaultCpcBidMicros);
  ops.push({ adGroupOperation: { create: agCreate } });
  const rsa = {
    headlines: headlines.filter(Boolean).slice(0, 15).map((t) => ({ text: String(t).slice(0, 30) })),
    descriptions: descriptions.filter(Boolean).slice(0, 4).map((t) => ({ text: String(t).slice(0, 90) })),
  };
  if (path1) rsa.path1 = String(path1).slice(0, 15);
  if (path2) rsa.path2 = String(path2).slice(0, 15);
  ops.push({ adGroupAdOperation: { create: { adGroup: agRn, status: 'ENABLED', ad: { finalUrls: [finalUrl], responsiveSearchAd: rsa } } } });
  for (const kw of keywords) {
    const p = parseKeyword(kw);
    if (!p.text) continue;
    const crit = { adGroup: agRn, status: 'ENABLED', keyword: { text: p.text.slice(0, 80), matchType: p.matchType } };
    if (p.cpcBidMicros) crit.cpcBidMicros = String(p.cpcBidMicros);
    ops.push({ adGroupCriterionOperation: { create: crit } });
  }
  const res = await googleAdsMutate(cid, ops);
  const results = res.mutateOperationResponses || [];
  const agRes = results.find((r) => r.adGroupResult);
  return { ok: true, adGroupResourceName: agRes ? agRes.adGroupResult.resourceName : null, operationCount: ops.length };
}

// Opprett delt negativ søkeordsliste + fest på kampanjen (atomisk).
export async function createSharedNegativeList(customerId, { name, negatives = [], campaignId } = {}) {
  const cid = cleanCid(customerId);
  const setRn = `customers/${cid}/sharedSets/-1`;
  const ops = [];
  ops.push({ sharedSetOperation: { create: { resourceName: setRn, name, type: 'NEGATIVE_KEYWORDS' } } });
  for (const kw of negatives) {
    const p = parseKeyword(kw);
    if (!p.text) continue;
    ops.push({ sharedCriterionOperation: { create: { sharedSet: setRn, keyword: { text: p.text.slice(0, 80), matchType: p.matchType } } } });
  }
  if (campaignId) {
    const campId = String(campaignId).replace(/[^0-9]/g, '');
    ops.push({ campaignSharedSetOperation: { create: { campaign: `customers/${cid}/campaigns/${campId}`, sharedSet: setRn } } });
  }
  const res = await googleAdsMutate(cid, ops);
  const results = res.mutateOperationResponses || [];
  const setRes = results.find((r) => r.sharedSetResult);
  return { ok: true, sharedSetResourceName: setRes ? setRes.sharedSetResult.resourceName : null, operationCount: ops.length };
}

// Bytt kampanje til Manuell CPC. (manual_cpc har subfelt → masken må peke på subfeltet.)
export async function setCampaignManualCpc(customerId, campaignId) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  await mutate(cid, 'campaigns', [{ update: { resourceName: `customers/${cid}/campaigns/${campId}`, manualCpc: { enhancedCpcEnabled: false } }, updateMask: 'manual_cpc.enhanced_cpc_enabled' }]);
  return { ok: true };
}

// Sett maks-CPC (micros) på en annonsegruppe.
export async function setAdGroupCpcBid(customerId, adGroupId, cpcBidMicros) {
  const cid = cleanCid(customerId);
  const agId = String(adGroupId).replace(/[^0-9]/g, '');
  await mutate(cid, 'adGroups', [{ update: { resourceName: `customers/${cid}/adGroups/${agId}`, cpcBidMicros: String(cpcBidMicros) }, updateMask: 'cpc_bid_micros' }]);
  return { ok: true };
}

// Finn kampanje-ID + annonsegruppe-navn (for idempotent blueprint-apply).
export async function getCampaignByName(customerId, name) {
  const cid = cleanCid(customerId);
  const rows = await gaqlSearch(cid, `SELECT campaign.id, campaign.name, campaign.bidding_strategy_type FROM campaign WHERE campaign.name = '${String(name).replace(/'/g, "")}' AND campaign.status != 'REMOVED'`);
  const c = rows[0] && rows[0].campaign;
  return c ? { id: String(c.id), name: c.name, biddingStrategyType: c.biddingStrategyType } : null;
}
export async function listAdGroups(customerId, campaignId) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  const rows = await gaqlSearch(cid, `SELECT ad_group.id, ad_group.name, ad_group.status FROM ad_group WHERE campaign.id = ${campId} AND ad_group.status != 'REMOVED'`);
  return rows.map((r) => ({ id: String(r.adGroup.id), name: r.adGroup.name, status: r.adGroup.status }));
}

// ===========================================================================
// INTELLIGENS-LAGET: per-annonse-metrikk, søkeord-mining, keyword research,
// og apply-handlinger (pause/negativ) for anbefalingsmotoren.
// ===========================================================================
const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

// Alle annonser m/ metrikk for perioden (også annonser uten visninger).
export async function runAdsWithMetrics({ since, until, customerId } = {}) {
  const cid = cleanCid(customerId);
  const from = new Date(since || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);
  const baseQ = "SELECT campaign.id, campaign.name, campaign.status, ad_group.id, ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.resource_name, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED'";
  const metricsQ = `SELECT ad_group_ad.ad.id, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr, metrics.average_cpc, metrics.conversions, metrics.conversions_value FROM ad_group_ad WHERE segments.date BETWEEN '${from}' AND '${to}' AND ad_group_ad.status != 'REMOVED'`;
  const [baseRows, metricRows] = await Promise.all([gaqlSearch(cid, baseQ), gaqlSearch(cid, metricsQ).catch(() => [])]);
  const mById = new Map();
  for (const r of metricRows) {
    const id = String(r.adGroupAd && r.adGroupAd.ad && r.adGroupAd.ad.id || '');
    const m = r.metrics || {};
    const cur = mById.get(id) || { cost: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 };
    cur.cost += num(m.costMicros) / 1e6; cur.impressions += num(m.impressions); cur.clicks += num(m.clicks);
    cur.conversions += num(m.conversions); cur.convValue += num(m.conversionsValue);
    mById.set(id, cur);
  }
  const txt = (arr) => (Array.isArray(arr) ? arr.map((x) => (x && x.text) || '').filter(Boolean) : []);
  const ads = baseRows.map((r) => {
    const camp = r.campaign || {}, ag = r.adGroup || {}, aga = r.adGroupAd || {}, ad = aga.ad || {}, rsa = ad.responsiveSearchAd || {}, ps = aga.policySummary || {};
    const id = String(ad.id || '');
    const hl = txt(rsa.headlines);
    const mm = mById.get(id) || { cost: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 };
    return {
      channel: 'google', id, type: ad.type || 'RESPONSIVE_SEARCH_AD',
      name: hl.slice(0, 2).join(' · ') || `Annonse ${id}`,
      campaign: camp.name || '', campaignStatus: camp.status || '',
      campaignId: String(camp.id || ''), adGroupId: String(ag.id || ''),
      adGroup: ag.name || '', status: aga.status || '', approval: ps.approvalStatus || '',
      resourceName: aga.resourceName || '',
      finalUrl: (ad.finalUrls && ad.finalUrls[0]) || '',
      headlines: hl, descriptions: txt(rsa.descriptions),
      cost: round2(mm.cost), impressions: mm.impressions, clicks: mm.clicks,
      ctr: mm.impressions > 0 ? round2((mm.clicks / mm.impressions) * 100) : 0,
      cpc: mm.clicks > 0 ? round2(mm.cost / mm.clicks) : 0,
      conversions: round2(mm.conversions), convValue: round2(mm.convValue),
      cpa: mm.conversions > 0 ? round2(mm.cost / mm.conversions) : null,
      roas: mm.cost > 0 ? round2(mm.convValue / mm.cost) : null,
    };
  }).filter((a) => a.id);
  ads.sort((a, b) => b.cost - a.cost);
  return { ads, customerId: cid, from, to };
}

// Daglig tidsserie for ÉN annonse (segments.date). Brukes av detalj-modalen.
// → [{date, cost, impressions, clicks, ctr, cpc, conversions, convValue}]
export async function runAdDaily({ adId, since, until, customerId } = {}) {
  const cid = cleanCid(customerId);
  const id = String(adId || '').replace(/\D/g, '');
  if (!id) throw new Error('Ugyldig annonse-id');
  const from = new Date(since || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);
  const q = `SELECT segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM ad_group_ad WHERE ad_group_ad.ad.id = ${id} AND segments.date BETWEEN '${from}' AND '${to}' ORDER BY segments.date`;
  const rows = await gaqlSearch(cid, q);
  const byDate = new Map();
  for (const r of rows) {
    const date = (r.segments && r.segments.date) || '';
    if (!date) continue;
    const m = r.metrics || {};
    const cur = byDate.get(date) || { date, cost: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 };
    cur.cost += num(m.costMicros) / 1e6;
    cur.impressions += num(m.impressions);
    cur.clicks += num(m.clicks);
    cur.conversions += num(m.conversions);
    cur.convValue += num(m.conversionsValue);
    byDate.set(date, cur);
  }
  return [...byDate.values()]
    .map((d) => ({
      ...d,
      cost: round2(d.cost),
      conversions: round2(d.conversions), convValue: round2(d.convValue),
      ctr: d.impressions > 0 ? round2((d.clicks / d.impressions) * 100) : 0,
      cpc: d.clicks > 0 ? round2(d.cost / d.clicks) : 0,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Søketermer (hva folk FAKTISK søkte) m/ metrikk + status (NONE/ADDED/EXCLUDED).
export async function runSearchTerms({ since, until, customerId } = {}) {  const cid = cleanCid(customerId);
  const from = new Date(since || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);
  const q = `SELECT search_term_view.search_term, search_term_view.status, campaign.id, campaign.name, ad_group.id, ad_group.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM search_term_view WHERE segments.date BETWEEN '${from}' AND '${to}' ORDER BY metrics.cost_micros DESC`;
  const rows = await gaqlSearch(cid, q).catch(() => []);
  const agg = new Map();
  for (const r of rows) {
    const stv = r.searchTermView || {}, camp = r.campaign || {}, ag = r.adGroup || {}, m = r.metrics || {};
    const term = String(stv.searchTerm || '').trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (!agg.has(key)) agg.set(key, { term, status: stv.status || 'NONE', campaign: camp.name || '', campaignId: String(camp.id || ''), adGroup: ag.name || '', adGroupId: String(ag.id || ''), cost: 0, clicks: 0, impressions: 0, conversions: 0 });
    const o = agg.get(key);
    o.cost += num(m.costMicros) / 1e6; o.clicks += num(m.clicks); o.impressions += num(m.impressions); o.conversions += num(m.conversions);
  }
  return Array.from(agg.values()).map((o) => ({ ...o, cost: round2(o.cost), conversions: round2(o.conversions) })).sort((a, b) => b.cost - a.cost);
}

// Søkeord (keyword_view) m/ metrikk + resourceName (for pause-handlinger).
export async function runKeywordMetrics({ since, until, customerId } = {}) {
  const cid = cleanCid(customerId);
  const from = new Date(since || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);
  const q = `SELECT campaign.id, campaign.name, ad_group.id, ad_group.name, ad_group_criterion.criterion_id, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type, ad_group_criterion.status, ad_group_criterion.resource_name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM keyword_view WHERE segments.date BETWEEN '${from}' AND '${to}' AND ad_group_criterion.status != 'REMOVED' ORDER BY metrics.cost_micros DESC`;
  const rows = await gaqlSearch(cid, q).catch(() => []);
  return rows.map((r) => {
    const camp = r.campaign || {}, ag = r.adGroup || {}, c = r.adGroupCriterion || {}, kw = c.keyword || {}, m = r.metrics || {};
    return {
      text: kw.text || '', matchType: kw.matchType || '', status: c.status || '',
      resourceName: c.resourceName || '', campaign: camp.name || '', campaignId: String(camp.id || ''),
      adGroup: ag.name || '', adGroupId: String(ag.id || ''),
      cost: round2(num(m.costMicros) / 1e6), clicks: num(m.clicks), impressions: num(m.impressions), conversions: round2(num(m.conversions)),
    };
  });
}

// Finn languageConstant-ID for en språkkode (no → languageConstants/1047 e.l.).
export async function getLanguageConstantId(code = 'no') {
  const token = await accessToken();
  // languageConstant er en konto-uavhengig ressurs → bruk default customer for søk.
  const cid = defaultCustomerId();
  const rows = await gaqlSearch(cid, `SELECT language_constant.id, language_constant.code, language_constant.name FROM language_constant WHERE language_constant.code = '${String(code).replace(/'/g, '')}'`).catch(() => []);
  const lc = rows[0] && rows[0].languageConstant;
  return lc ? `languageConstants/${lc.id}` : 'languageConstants/1047';
}

// Keyword research: nye søkeordideer m/ volum, konkurranse, budestimat.
export async function generateKeywordIdeas({ seeds = [], url, geoTargetConstantIds = ['2578'], languageCode = 'no', customerId, pageSize = 200 } = {}) {
  const cid = cleanCid(customerId);
  const token = await accessToken();
  const language = await getLanguageConstantId(languageCode);
  const body = {
    language,
    geoTargetConstants: (geoTargetConstantIds || []).map((g) => `geoTargetConstants/${String(g).replace(/[^0-9]/g, '')}`),
    keywordPlanNetwork: 'GOOGLE_SEARCH',
    pageSize,
  };
  const cleanSeeds = (seeds || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 20);
  if (url && cleanSeeds.length) body.keywordAndUrlSeed = { url, keywords: cleanSeeds };
  else if (url) body.urlSeed = { url };
  else body.keywordSeed = { keywords: cleanSeeds };

  const r = await fetch(`${BASE}/customers/${cid}:generateKeywordIdeas`, {
    method: 'POST', headers: { ...authHeaders(token), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(gErr(j));
  const COMP = { UNSPECIFIED: 0, UNKNOWN: 0, LOW: 1, MEDIUM: 2, HIGH: 3 };
  return (j.results || []).map((it) => {
    const km = it.keywordIdeaMetrics || {};
    return {
      text: it.text || '',
      avgMonthlySearches: Number(km.avgMonthlySearches || 0),
      competition: km.competition || 'UNKNOWN',
      competitionIndex: Number(km.competitionIndex || COMP[km.competition] || 0),
      lowBid: km.lowTopOfPageBidMicros ? round2(num(km.lowTopOfPageBidMicros) / 1e6) : null,
      highBid: km.highTopOfPageBidMicros ? round2(num(km.highTopOfPageBidMicros) / 1e6) : null,
    };
  }).filter((x) => x.text).sort((a, b) => b.avgMonthlySearches - a.avgMonthlySearches);
}

// --- APPLY-handlinger (kalles av anbefalingsmotor, menneske-godkjent) -------

// Legg til kampanje-negative søkeord (umiddelbar effekt, kun denne kampanjen).
export async function addCampaignNegativeKeywords(customerId, campaignId, terms = [], matchType = 'PHRASE') {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  if (!campId) throw new Error('Mangler campaignId');
  const ops = [];
  for (const t of terms) {
    const p = parseKeyword(t);
    if (!p.text) continue;
    ops.push({ create: { campaign: `customers/${cid}/campaigns/${campId}`, negative: true, keyword: { text: p.text.slice(0, 80), matchType: p.matchType || matchType } } });
  }
  if (!ops.length) return { ok: true, added: 0 };
  const res = await mutate(cid, 'campaignCriteria', ops);
  return { ok: true, added: ops.length, results: (res.results || []).length };
}

// Oppdater CPC-tak (target_spend.cpc_bid_ceiling_micros) på en Maximize
// clicks-kampanje (TARGET_SPEND). NOK inn → micros.
export async function updateCampaignCpcCeiling(customerId, campaignId, cpcNok) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  if (!campId) throw new Error('Mangler campaignId');
  const micros = Math.round(Number(cpcNok) * 1e6);
  if (!(micros > 0)) throw new Error('Ugyldig CPC-tak');
  await mutate(cid, 'campaigns', [{
    update: { resourceName: `customers/${cid}/campaigns/${campId}`, targetSpend: { cpcBidCeilingMicros: String(micros) } },
    updateMask: 'target_spend.cpc_bid_ceiling_micros',
  }]);
  return { ok: true, campaignId: campId, cpcCeiling: Number(cpcNok) };
}

// Pause/aktiver et søkeord (ad_group_criterion) via resourceName.
export async function setAdGroupCriterionStatus(customerId, resourceName, status = 'PAUSED') {
  const cid = cleanCid(customerId);
  if (!resourceName) throw new Error('Mangler resourceName');
  const st = String(status).toUpperCase();
  if (!['ENABLED', 'PAUSED'].includes(st)) throw new Error('Ugyldig status');
  await mutate(cid, 'adGroupCriteria', [{ update: { resourceName, status: st }, updateMask: 'status' }]);
  return { ok: true, resourceName, status: st };
}

// Pause/aktiver/fjern en annonse (ad_group_ad) via resourceName.
export async function setAdStatus(customerId, resourceName, status = 'PAUSED') {
  const cid = cleanCid(customerId);
  if (!resourceName) throw new Error('Mangler resourceName');
  const st = String(status).toUpperCase();
  if (!['ENABLED', 'PAUSED', 'REMOVED'].includes(st)) throw new Error('Ugyldig status');
  const res = await mutate(cid, 'adGroupAds', [{ update: { resourceName, status: st }, updateMask: 'status' }]);
  return { ok: true, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || resourceName, status: st };
}

// Oppdater final_urls på en eksisterende annonse (f.eks. RSA). final_urls er
// mutbar uten å opprette ny annonse. Ved lagring resubmittes annonsen automatisk
// for ny policy-vurdering. Brukes til å fikse destinasjonsfeil (f.eks. bytte fra
// delt preview-domene til det verifiserte produksjonsdomenet).
export async function updateAdFinalUrls(customerId, adId, finalUrls, { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const id = String(adId).replace(/[^0-9]/g, '');
  if (!id) throw new Error('Mangler adId');
  const urls = (Array.isArray(finalUrls) ? finalUrls : [finalUrls]).filter(Boolean);
  if (!urls.length) throw new Error('Mangler finalUrls');
  const res = await mutate(cid, 'ads', [{
    update: { resourceName: `customers/${cid}/ads/${id}`, finalUrls: urls },
    updateMask: 'final_urls',
  }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null, finalUrls: urls, validateOnly };
}

// Finn annonser i en kampanje med deres final_urls + policy-status.
export async function getCampaignAdsPolicy(customerId, campaignId) {
  const cid = cleanCid(customerId);
  const id = String(campaignId).replace(/[^0-9]/g, '');
  const q = `SELECT campaign.id, campaign.name, ad_group.id, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.policy_summary.review_status FROM ad_group_ad WHERE campaign.id = ${id} AND ad_group_ad.status != 'REMOVED'`;
  const rows = await gaqlSearch(cid, q);
  return rows.map((r) => ({
    campaignId: r.campaign?.id, campaignName: r.campaign?.name,
    adGroupId: r.adGroup?.id, adId: r.adGroupAd?.ad?.id, type: r.adGroupAd?.ad?.type,
    finalUrls: r.adGroupAd?.ad?.finalUrls || [],
    adStatus: r.adGroupAd?.status,
    approval: r.adGroupAd?.policySummary?.approvalStatus,
    review: r.adGroupAd?.policySummary?.reviewStatus,
  }));
}


// --- Konkurrent-kampanje (competitor conquesting) --------------------------
// Oppretter en Search-kampanje (PAUSED) som byr på konkurrentens merkeord
// (f.eks. «Utleiemegleren»). Bruker createSearchCampaign (atomisk) og legger
// til negative søkeord etterpå. validateOnly => tørrkjøring (ingenting opprettes).
export async function createCompetitorCampaign(customerId, opts = {}) {
  const cid = cleanCid(customerId);
  const {
    name, dailyBudget, finalUrl,
    headlines = [], descriptions = [],
    keywords = [], negatives = [],
    geoTargetConstantIds = ['2578'], // 2578 = Norge
    path1, path2,
    validateOnly = false,
    activate = false,
    skipDuplicateCheck = false,
  } = opts;

  // Duplikat-sjekk (ikke ved tørrkjøring) — unngå å opprette samme kampanje to ganger.
  if (!validateOnly && !skipDuplicateCheck && name) {
    const existing = await getCampaignByName(cid, name).catch(() => null);
    if (existing) {
      return { ok: false, duplicate: true, campaignId: existing.id, message: `Kampanjen «${name}» finnes allerede (ID ${existing.id}). Endre navnet, eller styr den eksisterende kampanjen.` };
    }
  }

  const created = await createSearchCampaign(cid, {
    name, dailyBudget, finalUrl, headlines, descriptions, keywords,
    geoTargetConstantIds, biddingStrategy: 'MAXIMIZE_CONVERSIONS', path1, path2, validateOnly,
  });

  const campId = created.campaignResourceName ? ((created.campaignResourceName.match(/campaigns\/(\d+)/) || [])[1] || null) : null;
  let negativesAdded = 0;
  if (!validateOnly && campId && (negatives || []).filter(Boolean).length) {
    try {
      const negRes = await addCampaignNegativeKeywords(cid, campId, negatives, 'PHRASE');
      negativesAdded = negRes.added || 0;
    } catch (e) { /* negativer er «nice to have» — velt ikke hele opprettelsen */ }
  }

  // Aktiver kampanjen umiddelbart hvis bedt om det (ellers forblir den PAUSED).
  let status = 'PAUSED';
  if (!validateOnly && campId && activate) {
    try { await setCampaignStatus(cid, campId, 'ENABLED'); status = 'ENABLED'; }
    catch (e) { status = 'PAUSED'; }
  }

  return {
    ...created,
    campaignId: campId,
    status,
    negativesAdded,
    keywordsAdded: (keywords || []).filter(Boolean).length,
  };
}
// ---------------------------------------------------------------------------
// Budstrategi: bytt kampanje til Maximize Clicks (TargetSpend) med CPC-tak.
// updateMask 'target_spend' bytter oneof-feltet (fjerner manual_cpc /
// maximize_conversions automatisk).
// ---------------------------------------------------------------------------
export async function setCampaignMaximizeClicks(customerId, campaignId, cpcCeilingNok, { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const ceilingMicros = Math.round(Number(cpcCeilingNok) * 1e6);
  if (!(ceilingMicros > 0)) throw new Error('Ugyldig CPC-tak');
  const res = await mutate(cid, 'campaigns', [{
    update: {
      resourceName: `customers/${cid}/campaigns/${String(campaignId).replace(/[^0-9]/g, '')}`,
      targetSpend: { cpcBidCeilingMicros: String(ceilingMicros) },
    },
    updateMask: 'target_spend.cpc_bid_ceiling_micros',
  }], validateOnly ? { validateOnly: true } : {});
  return {
    ok: true,
    validateOnly: !!validateOnly,
    resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null,
    strategy: 'MAXIMIZE_CLICKS',
    cpcCeiling: Math.round(ceilingMicros / 1e6 * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// RSA-verktøy: list innhold, opprett ny RSA, endre annonsestatus.
// (RSA-er er immutable i Google Ads — tekstendring = ny annonse + pause gammel.)
// ---------------------------------------------------------------------------
export async function listRsaAds(customerId, { campaignId } = {}) {
  const cid = cleanCid(customerId);
  const where = campaignId ? ` AND campaign.id = ${String(campaignId).replace(/[^0-9]/g, '')}` : '';
  const rows = await gaqlSearch(cid, `
    SELECT campaign.id, campaign.name, ad_group.id, ad_group.name,
           ad_group_ad.resource_name, ad_group_ad.status, ad_group_ad.ad.id,
           ad_group_ad.ad.final_urls,
           ad_group_ad.ad.responsive_search_ad.headlines,
           ad_group_ad.ad.responsive_search_ad.descriptions,
           ad_group_ad.ad.responsive_search_ad.path1,
           ad_group_ad.ad.responsive_search_ad.path2
    FROM ad_group_ad
    WHERE ad_group_ad.ad.type = 'RESPONSIVE_SEARCH_AD'
      AND ad_group_ad.status != 'REMOVED'
      AND campaign.status != 'REMOVED'${where}`);
  return rows.map((r) => {
    const rsa = (r.adGroupAd && r.adGroupAd.ad && r.adGroupAd.ad.responsiveSearchAd) || {};
    return {
      campaignId: String((r.campaign || {}).id || ''),
      campaignName: (r.campaign || {}).name || '',
      adGroupId: String((r.adGroup || {}).id || ''),
      adGroupName: (r.adGroup || {}).name || '',
      adResourceName: (r.adGroupAd || {}).resourceName || '',
      status: (r.adGroupAd || {}).status || '',
      adId: String(((r.adGroupAd || {}).ad || {}).id || ''),
      finalUrls: ((r.adGroupAd || {}).ad || {}).finalUrls || [],
      headlines: (rsa.headlines || []).map((h) => ({ text: h.text || '', ...(h.pinnedField ? { pinnedField: h.pinnedField } : {}) })),
      descriptions: (rsa.descriptions || []).map((d) => ({ text: d.text || '', ...(d.pinnedField ? { pinnedField: d.pinnedField } : {}) })),
      path1: rsa.path1 || null,
      path2: rsa.path2 || null,
    };
  });
}

export async function createRsaAd(customerId, { adGroupId, headlines, descriptions, finalUrls, path1, path2, status = 'ENABLED' }) {
  const cid = cleanCid(customerId);
  if (!adGroupId) throw new Error('Mangler adGroupId');
  if (!Array.isArray(headlines) || headlines.filter((h) => h && h.text).length < 3) throw new Error('RSA krever minst 3 titler');
  if (!Array.isArray(descriptions) || descriptions.filter((d) => d && d.text).length < 2) throw new Error('RSA krever minst 2 beskrivelser');
  const ad = {
    finalUrls: (finalUrls || []).filter(Boolean),
    responsiveSearchAd: {
      headlines: headlines.filter((h) => h && h.text),
      descriptions: descriptions.filter((d) => d && d.text),
      ...(path1 ? { path1 } : {}),
      ...(path2 ? { path2 } : {}),
    },
  };
  const res = await mutate(cid, 'adGroupAds', [{
    create: { adGroup: `customers/${cid}/adGroups/${String(adGroupId).replace(/[^0-9]/g, '')}`, status, ad },
  }]);
  return { ok: true, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// (setAdStatus er definert lenger opp i filen — støtter ENABLED/PAUSED/REMOVED.)

// ---------------------------------------------------------------------------
// Optimaliseringsverktøy (august 2026): budstrategi, søkeordstyring,
// negativlister og konverteringsinnstillinger. Alt støtter validateOnly slik at
// vi kan tørrkjøre mot en LIVE konto før vi faktisk endrer noe.
// ---------------------------------------------------------------------------

// Opprett en PORTEFØLJE-budstrategi. Ved lavt konverteringsvolum (< ~30/mnd)
// er dette bedre enn én strategi pr. kampanje: kampanjene deler
// konverteringsdata, og Google lærer på summen i stedet for på biter.
export async function createPortfolioBiddingStrategy(customerId, { name, type = 'MAXIMIZE_CONVERSIONS', targetCpaMicros = null, validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  if (!name) throw new Error('Mangler navn på budstrategi');
  const strategy = { name };
  if (type === 'MAXIMIZE_CONVERSIONS') {
    strategy.maximizeConversions = targetCpaMicros ? { targetCpaMicros: String(Math.round(targetCpaMicros)) } : {};
  } else if (type === 'TARGET_CPA') {
    if (!targetCpaMicros) throw new Error('TARGET_CPA krever targetCpaMicros');
    strategy.targetCpa = { targetCpaMicros: String(Math.round(targetCpaMicros)) };
  } else {
    throw new Error(`Ustøttet budstrategitype: ${type}`);
  }
  const res = await mutate(cid, 'biddingStrategies', [{ create: strategy }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Finn en eksisterende portefølje-budstrategi på navn (idempotens).
export async function findBiddingStrategy(customerId, name) {
  const cid = cleanCid(customerId);
  const esc = String(name).replace(/'/g, "\\'");
  const rows = await gaqlSearch(cid, `SELECT bidding_strategy.id, bidding_strategy.name, bidding_strategy.type, bidding_strategy.resource_name, bidding_strategy.status FROM bidding_strategy WHERE bidding_strategy.name = '${esc}'`);
  const b = rows[0] && rows[0].biddingStrategy;
  return b ? { id: String(b.id), name: b.name, type: b.type, resourceName: b.resourceName, status: b.status } : null;
}

// Fest en kampanje til en portefølje-strategi. Dette erstatter kampanjens
// egen strategi (TARGET_SPEND osv.) — bidding_strategy_type er output-only,
// så vi setter pekeren og lar Google avgjøre typen.
export async function setCampaignBiddingStrategy(customerId, campaignId, biddingStrategyResourceName, { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  if (!biddingStrategyResourceName) throw new Error('Mangler biddingStrategyResourceName');
  const res = await mutate(cid, 'campaigns', [{
    update: { resourceName: `customers/${cid}/campaigns/${campId}`, biddingStrategy: biddingStrategyResourceName },
    updateMask: 'bidding_strategy',
  }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Sett kampanjens EGEN (standard) budstrategi til Maksimer konverteringer.
// Brukes hvis vi ikke vil bruke portefølje. targetCpaMicros = valgfritt mål-CPA.
export async function setCampaignMaximizeConversions(customerId, campaignId, { targetCpaMicros = null, validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  const update = {
    resourceName: `customers/${cid}/campaigns/${campId}`,
    maximizeConversions: targetCpaMicros ? { targetCpaMicros: String(Math.round(targetCpaMicros)) } : {},
  };
  const res = await mutate(cid, 'campaigns', [{ update, updateMask: 'maximize_conversions' }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Endre status på ett søkeord (ad_group_criterion) — pause pengesluk uten å
// fjerne historikken.
export async function setKeywordStatus(customerId, criterionResourceName, status, { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const st = String(status || '').toUpperCase();
  if (!['ENABLED', 'PAUSED', 'REMOVED'].includes(st)) throw new Error('Ugyldig status');
  if (!/adGroupCriteria\//.test(String(criterionResourceName))) throw new Error('Ugyldig criterionResourceName');
  const res = await mutate(cid, 'adGroupCriteria', [{
    update: { resourceName: criterionResourceName, status: st },
    updateMask: 'status',
  }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, status: st, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Legg nye søkeord i en annonsegruppe.
export async function addKeywords(customerId, adGroupId, keywords = [], { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const agId = String(adGroupId).replace(/[^0-9]/g, '');
  const ops = keywords
    .map((k) => (typeof k === 'string' ? { text: k, matchType: 'PHRASE' } : k))
    .filter((k) => k && k.text)
    .map((k) => ({
      create: {
        adGroup: `customers/${cid}/adGroups/${agId}`,
        status: 'ENABLED',
        keyword: { text: String(k.text).slice(0, 80), matchType: String(k.matchType || 'PHRASE').toUpperCase() },
      },
    }));
  if (!ops.length) return { ok: true, added: 0, note: 'Ingenting å legge til' };
  const res = await mutate(cid, 'adGroupCriteria', ops, validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, added: ops.length, results: (res.results || []).map((r) => r.resourceName) };
}

// Legg negative søkeord i en DELT liste (gjelder alle koblede kampanjer).
export async function addSharedNegativeKeywords(customerId, sharedSetResourceName, keywords = [], { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  if (!/sharedSets\//.test(String(sharedSetResourceName))) throw new Error('Ugyldig sharedSetResourceName');
  const ops = keywords
    .map((k) => (typeof k === 'string' ? { text: k, matchType: 'PHRASE' } : k))
    .filter((k) => k && k.text)
    .map((k) => ({
      create: {
        sharedSet: sharedSetResourceName,
        keyword: { text: String(k.text).slice(0, 80), matchType: String(k.matchType || 'PHRASE').toUpperCase() },
      },
    }));
  if (!ops.length) return { ok: true, added: 0, note: 'Ingenting å legge til' };
  const res = await mutate(cid, 'sharedCriteria', ops, validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, added: ops.length };
}

// Koble en delt negativliste til en kampanje.
export async function linkSharedSetToCampaign(customerId, campaignId, sharedSetResourceName, { validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const campId = String(campaignId).replace(/[^0-9]/g, '');
  const res = await mutate(cid, 'campaignSharedSets', [{
    create: { campaign: `customers/${cid}/campaigns/${campId}`, sharedSet: sharedSetResourceName },
  }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Endre verdiinnstillinger på en konverteringshandling.
// alwaysUseDefaultValue=false gjør at verdien VI sender fra nettstedet gjelder.
export async function updateConversionActionValue(customerId, conversionActionId, { defaultValue = null, alwaysUseDefaultValue = null, primaryForGoal = null, validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  const id = String(conversionActionId).replace(/[^0-9]/g, '');
  const update = { resourceName: `customers/${cid}/conversionActions/${id}` };
  const mask = [];
  const vs = {};
  if (defaultValue !== null) { vs.defaultValue = Number(defaultValue); mask.push('value_settings.default_value'); }
  if (alwaysUseDefaultValue !== null) { vs.alwaysUseDefaultValue = !!alwaysUseDefaultValue; mask.push('value_settings.always_use_default_value'); }
  if (Object.keys(vs).length) update.valueSettings = vs;
  if (primaryForGoal !== null) { update.primaryForGoal = !!primaryForGoal; mask.push('primary_for_goal'); }
  if (!mask.length) throw new Error('Ingenting å oppdatere');
  const res = await mutate(cid, 'conversionActions', [{ update, updateMask: mask.join(',') }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Opprett en nettsted-konverteringshandling (WEBPAGE) som fyres med gtag.
// Brukes til ringeklikk: kategori PHONE_CALL_LEAD.
export async function createWebConversionAction(customerId, { name, category = 'PHONE_CALL_LEAD', countingType = 'ONE_PER_CLICK', defaultValue = null, alwaysUseDefaultValue = false, primaryForGoal = true, validateOnly = false } = {}) {
  const cid = cleanCid(customerId);
  if (!name) throw new Error('Mangler navn');
  const create = {
    name, type: 'WEBPAGE', category, status: 'ENABLED',
    countingType, primaryForGoal,
    valueSettings: {
      ...(defaultValue !== null ? { defaultValue: Number(defaultValue) } : {}),
      alwaysUseDefaultValue: !!alwaysUseDefaultValue,
    },
  };
  const res = await mutate(cid, 'conversionActions', [{ create }], validateOnly ? { validateOnly: true } : {});
  return { ok: true, validateOnly, resourceName: (res.results && res.results[0] && res.results[0].resourceName) || null };
}

// Hent gtag-etiketten (send_to: AW-xxx/LABEL) for en konverteringshandling.
// Etiketten ligger i tag_snippets, ikke i et eget felt.
export async function getConversionActionLabel(customerId, conversionActionId) {
  const cid = cleanCid(customerId);
  const id = String(conversionActionId).replace(/[^0-9]/g, '');
  const rows = await gaqlSearch(cid, `SELECT conversion_action.id, conversion_action.name, conversion_action.tag_snippets FROM conversion_action WHERE conversion_action.id = ${id}`);
  const snippets = (rows[0] && rows[0].conversionAction && rows[0].conversionAction.tagSnippets) || [];
  for (const s of snippets) {
    const blob = `${s.eventSnippet || ''}\n${s.globalSiteTag || ''}`;
    const m = blob.match(/AW-(\d+)\/([A-Za-z0-9_-]+)/);
    if (m) return { adsId: `AW-${m[1]}`, label: m[2], sendTo: `AW-${m[1]}/${m[2]}` };
  }
  return null;
}
