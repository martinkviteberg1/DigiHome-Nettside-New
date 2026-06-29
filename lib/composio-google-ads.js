// ---------------------------------------------------------------------------
// Composio → Google Ads (rapportering, read-only).
//
// Midlertidig bro: Composio bruker SIN EGEN godkjente Google Ads dev-token
// (managed OAuth), så vi kan lese live kampanjedata (kostnad/klikk/visninger/
// konverteringer) mens vår native Google Ads-token venter på Basic Access.
//
// Flyt:
//  1) ensureAuthConfig(db)  → opprett/gjenbruk en Composio-managed auth config (ac_...)
//  2) createConnectLink()   → connectedAccounts.link(userId, authConfigId) → redirectUrl
//  3) (bruker OAuth-er i nettleser) → connected account blir ACTIVE
//  4) runCampaignReport()   → tools.execute('GOOGLEADS_SEARCH_STREAM_GAQL', {query, customer_id})
//
// Lazy dynamic import av @composio/core for å unngå tunge bundling-problemer
// ved modul-evaluering i Next.js.
// ---------------------------------------------------------------------------

const API_KEY = process.env.COMPOSIO_API_KEY || '';
const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';
const TOOLKIT = 'googleads';
const GAQL_TOOL = 'GOOGLEADS_SEARCH_STREAM_GAQL';

let _client = null;

export function composioConfigured() {
  return !!API_KEY;
}
export function composioUserId() {
  return USER_ID;
}
export function defaultCustomerId() {
  return (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, '');
}

// Manuell tool-eksekvering krever en toolkit-versjon. Hvis COMPOSIO_TOOLKIT_VERSION
// er satt til en spesifikk versjon (f.eks. '20250909_00'), bruk den; ellers bruk
// 'latest' med dangerouslySkipVersionCheck (read-only rapportering — trygt nok).
function toolkitVersionParams() {
  const v = (process.env.COMPOSIO_TOOLKIT_VERSION || '').trim();
  if (v && v.toLowerCase() !== 'latest') return { version: v };
  return { version: 'latest', dangerouslySkipVersionCheck: true };
}

// Hvor lenge en live-rapport caches før vi henter på nytt (nær-sanntid).
export const REPORT_TTL_MS = 10 * 60 * 1000; // 10 min

export const GOOGLE_PERIODS = ['last_7d', 'last_30d', 'last_90d', 'this_year', 'all'];

// Oversett en periode-nøkkel til et {since, until}-datointervall (ISO).
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

async function client() {
  if (!API_KEY) throw new Error('Composio er ikke konfigurert (mangler COMPOSIO_API_KEY)');
  if (!_client) {
    const mod = await import('@composio/core');
    const Composio = mod.Composio || (mod.default && mod.default.Composio) || mod.default;
    _client = new Composio({ apiKey: API_KEY });
  }
  return _client;
}

function listItems(res) {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  return res.items || res.data || [];
}

// Opprett-eller-gjenbruk en managed auth config for Google Ads. Persistér i DB.
export async function ensureAuthConfig(db) {
  const co = await client();

  // 1) Eksplisitt env-override
  const envId = (process.env.COMPOSIO_GOOGLEADS_AUTH_CONFIG_ID || '').trim();
  if (envId) return envId;

  // 2) Tidligere persistert
  const st = await db.collection('composio_state').findOne({ key: 'googleads_auth_config' });
  if (st && st.authConfigId) {
    try {
      await co.authConfigs.get(st.authConfigId);
      return st.authConfigId;
    } catch (e) { /* finnes ikke lenger → opprett på nytt */ }
  }

  // 3) Gjenbruk en eksisterende auth config for toolkit
  try {
    const list = await co.authConfigs.list({ toolkit: TOOLKIT });
    const items = listItems(list);
    if (items.length) {
      const id = items[0].id;
      await persistAuthConfig(db, id);
      return id;
    }
  } catch (e) { /* ignorér, opprett ny under */ }

  // 4) Opprett ny managed auth config
  const ac = await co.authConfigs.create(TOOLKIT, {
    type: 'use_composio_managed_auth',
    name: 'DigiHome Google Ads',
  });
  await persistAuthConfig(db, ac.id);
  return ac.id;
}

async function persistAuthConfig(db, authConfigId) {
  await db.collection('composio_state').updateOne(
    { key: 'googleads_auth_config' },
    { $set: { key: 'googleads_auth_config', authConfigId, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
}

// Lag en OAuth-tilkoblingslenke (hosted Composio Connect Link).
export async function createConnectLink(db, { callbackUrl } = {}) {
  const co = await client();
  const authConfigId = await ensureAuthConfig(db);
  const opts = callbackUrl ? { callbackUrl } : undefined;
  const req = await co.connectedAccounts.link(USER_ID, authConfigId, opts);
  return { redirectUrl: req.redirectUrl, connectionId: req.id, authConfigId };
}

// Hent tilkoblingsstatus for Google Ads for vår bruker.
export async function getConnectionStatus() {
  const co = await client();
  let items = [];
  try {
    const list = await co.connectedAccounts.list({ userIds: [USER_ID], toolkitSlugs: [TOOLKIT] });
    items = listItems(list);
  } catch (e) {
    return { connected: false, status: 'ERROR', connectedAccountId: null, count: 0, error: e.message };
  }
  const isActive = (c) => String(c.status || '').toUpperCase() === 'ACTIVE';
  const active = items.find(isActive);
  const chosen = active || items[0] || null;
  return {
    connected: !!active,
    status: chosen ? String(chosen.status || '').toUpperCase() : 'NOT_CONNECTED',
    connectedAccountId: chosen ? chosen.id : null,
    count: items.length,
  };
}

// --- GAQL respons-parsing (robust mot ulike former: results/rows/batches) ---
function num(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function pick(obj, ...keys) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return undefined;
}

export function extractRows(res) {
  // tools.execute → { data, error, successful, logId }. Data-formen varierer.
  const d = (res && (res.data ?? res)) || {};
  const candidates = [];
  const tryPush = (x) => { if (Array.isArray(x)) candidates.push(x); };
  tryPush(d.results);
  tryPush(d.rows);
  tryPush(d.response);
  tryPush(d.data);
  if (Array.isArray(d)) candidates.push(d);
  // streamede batcher: [{ results: [...] }, ...]
  const batchSources = [d.batches, d.stream, d.results, d.data].filter(Array.isArray);
  for (const bs of batchSources) {
    const merged = [];
    for (const b of bs) {
      if (b && Array.isArray(b.results)) merged.push(...b.results);
      else if (b && Array.isArray(b.rows)) merged.push(...b.rows);
    }
    if (merged.length) candidates.push(merged);
  }
  // velg den lengste/mest meningsfulle kandidaten
  let best = [];
  for (const c of candidates) if (c.length >= best.length) best = c;
  return best;
}

export function aggregateCampaigns(rows) {
  const byKey = new Map();
  for (const r of rows || []) {
    const camp = r.campaign || r.Campaign || {};
    const metrics = r.metrics || r.Metrics || {};
    const id = String(pick(camp, 'id', 'resourceName', 'resource_name') || '');
    const name = String(pick(camp, 'name') || (id ? `Kampanje ${id}` : 'Ukjent kampanje'));
    const key = id || name.toLowerCase();
    const costMicros = num(pick(metrics, 'costMicros', 'cost_micros'));
    const clicks = num(pick(metrics, 'clicks'));
    const impressions = num(pick(metrics, 'impressions'));
    const conversions = num(pick(metrics, 'conversions'));
    if (!byKey.has(key)) byKey.set(key, { name, cost: 0, clicks: 0, impressions: 0, conversions: 0 });
    const o = byKey.get(key);
    o.cost += costMicros / 1e6;
    o.clicks += clicks;
    o.impressions += impressions;
    o.conversions += conversions;
  }
  return Array.from(byKey.values())
    .map((c) => ({ ...c, cost: Math.round(c.cost * 100) / 100, conversions: Math.round(c.conversions * 100) / 100 }))
    .sort((a, b) => b.cost - a.cost);
}

// Daglig tidsserie (krever segments.date i SELECT). → [{date, cost, clicks, impressions, conversions}]
export function aggregateDaily(rows) {
  const byDate = new Map();
  for (const r of rows || []) {
    const seg = r.segments || r.Segments || {};
    const metrics = r.metrics || r.Metrics || {};
    const date = String(pick(seg, 'date') || '');
    if (!date) continue;
    const cost = num(pick(metrics, 'costMicros', 'cost_micros')) / 1e6;
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

// Kjør kampanjerapport via GAQL. Returnerer { campaigns, totals, from, to, customerId }.
export async function runCampaignReport({ since, until, customerId } = {}) {
  const co = await client();
  const status = await getConnectionStatus();
  if (!status.connected) {
    throw new Error('Google Ads er ikke tilkoblet ennå. Klikk «Koble til Google Ads» og fullfør innloggingen først.');
  }
  const cid = (customerId || defaultCustomerId() || '').replace(/[^0-9]/g, '');
  const from = new Date(since || Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const to = new Date(until || Date.now()).toISOString().slice(0, 10);

  const query = `SELECT campaign.id, campaign.name, campaign.status, segments.date, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const args = { query };
  if (cid) args.customer_id = cid;

  const res = await co.tools.execute(GAQL_TOOL, {
    userId: USER_ID,
    connectedAccountId: status.connectedAccountId,
    arguments: args,
    ...toolkitVersionParams(),
  });

  // Composio markerer feil i res.error / res.successful=false
  if (res && res.successful === false) {
    const msg = (res.error && (res.error.message || res.error)) || 'Google Ads-spørringen feilet';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  const rows = extractRows(res);
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

// Maks tid vi blokkerer en forespørsel mens vi venter på Composio. Composio kan
// bruke 15–20 s på en kald henting → uten dette fryser Admin-dashbordet. Vi
// svarer alltid innen denne grensen (stale/tom data), mens hentingen fullføres
// i bakgrunnen og fyller cachen til neste forespørsel.
const FETCH_TIMEOUT_MS = 6000;

// Dedupliser samtidige hentinger for samme periode (in-memory, per prosess).
const _inflight = new Map();

function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(t)),
    timeout,
  ]);
}

function emptyReport(p) {
  const range = periodToRange(p);
  return {
    campaigns: [],
    series: [],
    totals: { cost: 0, clicks: 0, impressions: 0, conversions: 0 },
    from: range.since.slice(0, 10),
    to: range.until.slice(0, 10),
    customerId: defaultCustomerId(),
    rowCount: 0,
  };
}

// Hent ferske data fra Composio og persistér i cache. Deduplikeres pr periode,
// slik at flere samtidige (eller bakgrunns-)kall ikke trigger flere GAQL-kall.
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
  // Rydd opp uansett utfall (fang feil så vi ikke får unhandled rejection).
  task.catch(() => {}).finally(() => { _inflight.delete(p); });
  return task;
}

// Nær-sanntid med stale-while-revalidate:
//  • Fersk cache (< TTL)     → server umiddelbart.
//  • Utløpt cache            → server gammel data straks + oppdater i bakgrunnen.
//  • Kald cache (aldri hentet)→ vent på henting, men ALDRI lenger enn FETCH_TIMEOUT_MS;
//                               ved timeout returneres tomt «pending»-svar mens
//                               bakgrunnshentingen fyller cachen til neste kall.
// Kaster aldri — dashbordet henger derfor aldri.
export async function getCachedReport(db, period = 'last_30d', { force = false } = {}) {
  const p = GOOGLE_PERIODS.includes(period) ? period : 'last_30d';
  const coll = db.collection('google_report_cache');
  const existing = await coll.findOne({ key: `google_report:${p}` });
  const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;

  // 1) Fersk cache → ingen henting.
  if (!force && existing && ageMs < REPORT_TTL_MS) {
    return { report: existing.report, fetchedAt: existing.fetchedAt, cached: true, stale: false };
  }

  // 2) Trenger ferske data → start (eller gjenbruk pågående) bakgrunnshenting.
  const fetchTask = refreshReport(db, p);

  // 3) Stale-while-revalidate: har vi eldre data (og ikke eksplisitt force),
  //    server den straks. Bakgrunnshentingen oppdaterer cachen for neste kall.
  if (existing && !force) {
    return { report: existing.report, fetchedAt: existing.fetchedAt, cached: true, stale: true };
  }

  // 4) Kald cache eller eksplisitt force: vent, men aldri lenger enn timeout.
  try {
    const r = await withTimeout(fetchTask, FETCH_TIMEOUT_MS);
    return { report: r.report, fetchedAt: r.fetchedAt, cached: false, stale: false };
  } catch (e) {
    if (existing) {
      // Force-refresh som timet ut → behold forrige data, marker stale.
      return {
        report: existing.report, fetchedAt: existing.fetchedAt, cached: true, stale: true,
        error: 'Oppdatering tar lengre tid enn vanlig – viser forrige data.',
      };
    }
    const pending = e.message === 'timeout';
    return {
      report: emptyReport(p), fetchedAt: null, cached: false, stale: true, pending,
      error: pending ? 'Henter live Google Ads-data … (klar om noen sekunder)' : e.message,
    };
  }
}
