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

const API_VER = process.env.GOOGLE_ADS_API_VERSION || 'v21';
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
export async function listCampaignsDetailed(customerId) {
  const cid = cleanCid(customerId);
  const query = 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign_budget.amount_micros, campaign_budget.resource_name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC';
  let rows = [];
  try { rows = await gaqlSearch(cid, query); } catch (e) { /* faller tilbake under */ }
  // Kampanjer uten visninger siste 30 d kan mangle i metrikk-spørringen → hent også basis.
  const baseQ = 'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type, campaign_budget.amount_micros, campaign_budget.resource_name FROM campaign WHERE campaign.status != \'REMOVED\'';
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
