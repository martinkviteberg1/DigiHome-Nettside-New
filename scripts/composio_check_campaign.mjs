// Sjekk kampanjestatus, annonsegodkjenning og nylige visninger.
import fs from 'fs';
try {
  const env = fs.readFileSync('/app/.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch (e) {}
const API_KEY = process.env.COMPOSIO_API_KEY || '';
const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';
const CID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, '');
const GAQL_TOOL = 'GOOGLEADS_SEARCH_STREAM_GAQL';
function vparams() {
  const v = (process.env.COMPOSIO_TOOLKIT_VERSION || '').trim();
  if (v && v.toLowerCase() !== 'latest') return { version: v };
  return { version: 'latest', dangerouslySkipVersionCheck: true };
}
async function main() {
  const mod = await import('@composio/core');
  const Composio = mod.Composio || (mod.default && mod.default.Composio) || mod.default;
  const co = new Composio({ apiKey: API_KEY });
  const list = await co.connectedAccounts.list({ userIds: [USER_ID], toolkitSlugs: ['googleads'] });
  const items = Array.isArray(list) ? list : (list.items || list.data || []);
  const active = items.find((c) => String(c.status || '').toUpperCase() === 'ACTIVE') || items[0];
  async function gaql(query, label) {
    const res = await co.tools.execute(GAQL_TOOL, {
      userId: USER_ID, connectedAccountId: active.id,
      arguments: CID ? { query, customer_id: CID } : { query }, ...vparams(),
    });
    console.log('\n===== ' + label + ' =====');
    if (res && res.successful === false) { console.log('FEIL:', JSON.stringify(res.error).slice(0,1500)); return; }
    const d = (res && (res.data ?? res)) || {};
    console.log(JSON.stringify(d.results || d).slice(0, 3500));
  }
  await gaql("SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status, campaign.primary_status, campaign.advertising_channel_type FROM campaign", 'KAMPANJER (status/serving)');
  await gaql("SELECT campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros FROM campaign WHERE segments.date DURING LAST_30_DAYS", 'KAMPANJE-METRIKK 30D');
  await gaql("SELECT ad_group_ad.ad.id, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.policy_summary.review_status FROM ad_group_ad", 'ANNONSER (godkjenning)');
  await gaql("SELECT customer.id, customer.test_account, customer.status, customer.pay_per_conversion_eligibility_failure_reasons FROM customer", 'KONTO-INFO');
}
main().catch((e) => console.error('UNCAUGHT:', e.message));
