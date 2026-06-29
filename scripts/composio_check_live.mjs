import fs from 'fs';
import path from 'path';
function loadEnv() {
  const txt = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, k, v] = m; v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();
const { Composio } = await import('@composio/core');
const composio = new Composio({ apiKey: process.env.COMPOSIO_API_KEY });
const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';
const CID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, '');

async function gaql(query) {
  const list = await composio.connectedAccounts.list({ userIds: [USER_ID], toolkitSlugs: ['googleads'] });
  const items = list.items || list || [];
  const active = items.find((c) => String(c.status).toUpperCase() === 'ACTIVE') || items[0];
  const r = await composio.tools.execute('GOOGLEADS_SEARCH_STREAM_GAQL', {
    userId: USER_ID, connectedAccountId: active.id,
    arguments: { query, customer_id: CID }, version: 'latest', dangerouslySkipVersionCheck: true,
  });
  return r;
}

async function main() {
  // 1) Campaigns + status
  const r = await gaql("SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type FROM campaign ORDER BY campaign.id DESC");
  const d = (r && r.data) || {};
  let rows = d.results || d.rows || [];
  if (!rows.length && Array.isArray(d)) rows = d;
  console.log('successful:', r.successful, '| error:', JSON.stringify(r.error));
  console.log('CAMPAIGNS FOUND:', rows.length);
  console.log(JSON.stringify(rows, null, 2));

  // 2) Ad group ads status (om kampanje finnes)
  if (rows.length) {
    const r2 = await gaql("SELECT campaign.name, ad_group.name, ad_group_ad.status, ad_group_ad.policy_summary.approval_status FROM ad_group_ad");
    const d2 = (r2 && r2.data) || {};
    let rows2 = d2.results || d2.rows || [];
    console.log('\nADS:', rows2.length);
    console.log(JSON.stringify(rows2, null, 2).slice(0, 2000));
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e.message); process.exit(1); });
