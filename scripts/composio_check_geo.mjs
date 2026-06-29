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
  const q = "SELECT campaign.name, campaign_criterion.type, campaign_criterion.location.geo_target_constant, campaign_criterion.proximity.radius, campaign_criterion.proximity.radius_units, campaign_criterion.proximity.address.city_name, campaign_criterion.negative FROM campaign_criterion WHERE campaign.id = 23984331113 AND campaign_criterion.type IN ('LOCATION','PROXIMITY')";
  const r = await gaql(q);
  console.log('successful:', r.successful, '| error:', JSON.stringify(r.error));
  const d = (r && r.data) || {};
  let rows = d.results || d.rows || [];
  console.log('LOCATION CRITERIA:', rows.length);
  console.log(JSON.stringify(rows, null, 2));

  // resolve geo target constant names
  for (const row of rows) {
    const cc = row.campaignCriterion || {};
    const gtc = cc.location && cc.location.geoTargetConstant;
    if (gtc) {
      const r2 = await gaql(`SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.country_code, geo_target_constant.target_type FROM geo_target_constant WHERE geo_target_constant.resource_name = '${gtc}'`);
      const rows2 = (r2.data && (r2.data.results || r2.data.rows)) || [];
      console.log('  →', gtc, '=', JSON.stringify(rows2[0] && rows2[0].geoTargetConstant));
    }
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e.message); process.exit(1); });
