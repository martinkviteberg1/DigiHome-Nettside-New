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

  const query = `SELECT campaign.id, campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`;
  const args = { query };
  if (cid) args.customer_id = cid;

  const res = await co.tools.execute(GAQL_TOOL, {
    userId: USER_ID,
    connectedAccountId: status.connectedAccountId,
    arguments: args,
  });

  // Composio markerer feil i res.error / res.successful=false
  if (res && res.successful === false) {
    const msg = (res.error && (res.error.message || res.error)) || 'Google Ads-spørringen feilet';
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }

  const rows = extractRows(res);
  const campaigns = aggregateCampaigns(rows);
  const totals = campaigns.reduce(
    (a, c) => ({ cost: a.cost + c.cost, clicks: a.clicks + c.clicks, impressions: a.impressions + c.impressions, conversions: a.conversions + c.conversions }),
    { cost: 0, clicks: 0, impressions: 0, conversions: 0 },
  );
  totals.cost = Math.round(totals.cost * 100) / 100;
  totals.conversions = Math.round(totals.conversions * 100) / 100;
  return { campaigns, totals, from, to, customerId: cid, rowCount: rows.length };
}
