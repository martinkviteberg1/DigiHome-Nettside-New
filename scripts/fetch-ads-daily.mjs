// Henter daglige kampanjedata (90d) fra Meta + Google direkte → /tmp/analyse/
import { readFileSync, writeFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('/app/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
for (const [k, v] of Object.entries(env)) if (process.env[k] == null) process.env[k] = v;
const VER = env.META_API_VERSION || 'v21.0';
const ACC = env.META_AD_ACCOUNT_ID;
const TOKEN = env.META_SYSTEM_USER_TOKEN;

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${VER}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', TOKEN);
  let j = await (await fetch(u)).json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  let rows = j.data || [];
  let guard = 0;
  while (j.paging && j.paging.next && guard++ < 80) { j = await (await fetch(j.paging.next)).json(); rows = rows.concat(j.data || []); }
  return rows;
}

// 1) Meta: kampanje-nivå daglig, 90d — m/ actions (lead-typer)
const metaDaily = await g(`${ACC}/insights`, {
  level: 'campaign', time_increment: '1', date_preset: 'last_90d', limit: '500',
  fields: 'campaign_name,campaign_id,spend,impressions,clicks,inline_link_clicks,actions,action_values',
});
writeFileSync('/tmp/analyse/meta_campaign_daily_90.json', JSON.stringify(metaDaily));
console.log('meta_campaign_daily_90:', metaDaily.length, 'rader');

// 2) Meta: annonse-nivå sum, 90d — m/ actions
const metaAds = await g(`${ACC}/insights`, {
  level: 'ad', date_preset: 'last_90d', limit: '500',
  fields: 'ad_name,ad_id,campaign_name,adset_name,spend,impressions,inline_link_clicks,actions,cpm,ctr',
});
writeFileSync('/tmp/analyse/meta_ads_90.json', JSON.stringify(metaAds));
console.log('meta_ads_90:', metaAds.length, 'rader');

// 3) Google: kampanje daglig 90d via GAQL (gjenbruker vår lib)
const { gaqlSearch } = await import('/app/lib/google-ads-native.js');
const to = new Date().toISOString().slice(0, 10);
const from = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
const gRows = await gaqlSearch(undefined, `SELECT segments.date, campaign.name, campaign.id, campaign.status, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN '${from}' AND '${to}'`);
writeFileSync('/tmp/analyse/google_campaign_daily_90.json', JSON.stringify(gRows));
console.log('google_campaign_daily_90:', gRows.length, 'rader');

// 4) Google: søketermer 30d (hva folk faktisk søkte)
const from30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
const terms = await gaqlSearch(undefined, `SELECT search_term_view.search_term, campaign.name, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM search_term_view WHERE segments.date BETWEEN '${from30}' AND '${to}' ORDER BY metrics.cost_micros DESC LIMIT 200`);
writeFileSync('/tmp/analyse/google_terms_30.json', JSON.stringify(terms));
console.log('google_terms_30:', terms.length, 'rader');
console.log('FERDIG');
