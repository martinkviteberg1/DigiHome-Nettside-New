// Prøve: hent faktiske annonse-kreativer fra Meta + Google.
import fs from 'fs';
try {
  const env = fs.readFileSync('/app/.env', 'utf8');
  for (const line of env.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch (e) {}

const VER = process.env.META_API_VERSION || 'v21.0';
const ACC = process.env.META_AD_ACCOUNT_ID || '';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN || '';

async function metaProbe() {
  console.log('\n========== META ADS (kreativer) ==========');
  if (!ACC || !TOKEN) { console.log('Meta ikke konfigurert'); return; }
  const fields = [
    'id', 'name', 'status', 'effective_status',
    'campaign{name}', 'adset{name}',
    'creative{id,title,body,image_url,thumbnail_url,object_type,call_to_action_type,object_story_spec,instagram_permalink_url,effective_object_story_id}',
  ].join(',');
  const url = new URL(`https://graph.facebook.com/${VER}/${ACC}/ads`);
  url.searchParams.set('fields', fields);
  url.searchParams.set('limit', '5');
  url.searchParams.set('access_token', TOKEN);
  const res = await fetch(url.toString());
  const j = await res.json();
  if (!res.ok) { console.log('META FEIL:', JSON.stringify(j.error)); return; }
  const ads = j.data || [];
  console.log('antall annonser (maks 5 vist):', ads.length);
  for (const a of ads.slice(0, 3)) {
    const c = a.creative || {};
    const oss = c.object_story_spec || {};
    const ld = oss.link_data || oss.video_data || {};
    console.log('---');
    console.log('navn:', a.name, '| status:', a.effective_status);
    console.log('kampanje:', a.campaign && a.campaign.name, '| adset:', a.adset && a.adset.name);
    console.log('title:', c.title || ld.name);
    console.log('body:', (c.body || ld.message || '').slice(0, 120));
    console.log('image_url:', c.image_url || ld.picture || c.thumbnail_url);
    console.log('cta:', c.call_to_action_type || (ld.call_to_action && ld.call_to_action.type));
    console.log('link:', ld.link || c.instagram_permalink_url);
  }
}

async function googleProbe() {
  console.log('\n========== GOOGLE ADS (søkeannonser) ==========');
  const API_KEY = process.env.COMPOSIO_API_KEY || '';
  if (!API_KEY) { console.log('Composio ikke konfigurert'); return; }
  const USER_ID = process.env.COMPOSIO_USER_ID || 'digihome-admin';
  const CID = (process.env.GOOGLE_ADS_CUSTOMER_ID || '').replace(/[^0-9]/g, '');
  const mod = await import('@composio/core');
  const Composio = mod.Composio || (mod.default && mod.default.Composio) || mod.default;
  const co = new Composio({ apiKey: API_KEY });
  const list = await co.connectedAccounts.list({ userIds: [USER_ID], toolkitSlugs: ['googleads'] });
  const items = Array.isArray(list) ? list : (list.items || list.data || []);
  const active = items.find((c) => String(c.status || '').toUpperCase() === 'ACTIVE') || items[0];
  const query = "SELECT campaign.name, ad_group.name, ad_group_ad.status, ad_group_ad.policy_summary.approval_status, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED'";
  const res = await co.tools.execute('GOOGLEADS_SEARCH_STREAM_GAQL', {
    userId: USER_ID, connectedAccountId: active.id,
    arguments: CID ? { query, customer_id: CID } : { query },
    version: 'latest', dangerouslySkipVersionCheck: true,
  });
  if (res && res.successful === false) { console.log('GOOGLE FEIL:', JSON.stringify(res.error).slice(0, 800)); return; }
  const d = (res && (res.data ?? res)) || {};
  console.log('rå (klippet):', JSON.stringify(d).slice(0, 2500));
}

(async () => {
  try { await metaProbe(); } catch (e) { console.log('META UNCAUGHT:', e.message); }
  try { await googleProbe(); } catch (e) { console.log('GOOGLE UNCAUGHT:', e.message); }
})();
