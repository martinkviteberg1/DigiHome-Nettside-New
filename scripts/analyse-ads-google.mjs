// ANALYSE: Google Ads, rådata via GAQL (samme konto som produksjon bruker).
//   node --import ./scripts/_alias-loader.mjs scripts/analyse-ads-google.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { gaqlSearch, defaultCustomerId, googleAdsNativeConfigured, listConversionActions } = await import('/app/lib/google-ads-native.js');

const CID = defaultCustomerId();
const nok = (micros) => `${Math.round(Number(micros || 0) / 1e6).toLocaleString('nb-NO')} kr`;
const num = (v) => Number(v || 0).toLocaleString('nb-NO');
const pct = (v) => `${(Number(v || 0) * 100).toFixed(2)} %`;

console.log('konfigurert:', googleAdsNativeConfigured(), '· kunde:', CID);

const q = async (label, gaql) => {
  try {
    const rows = await gaqlSearch(CID, gaql);
    return rows || [];
  } catch (e) {
    console.log(`  (${label} feilet: ${String(e.message || e).slice(0, 220)})`);
    return [];
  }
};

console.log('\n══════════ KONTO ══════════');
for (const r of await q('kunde', 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone, customer.auto_tagging_enabled, customer.status FROM customer')) {
  const c = r.customer || {};
  console.log(`${c.descriptiveName} (${c.id}) · ${c.currencyCode} · ${c.timeZone} · status ${c.status} · auto-tagging ${c.autoTaggingEnabled}`);
}

for (const range of ['LAST_30_DAYS', 'LAST_7_DAYS']) {
  console.log(`\n══════════ KAMPANJER · ${range} ══════════`);
  const rows = await q('kampanjer', `
    SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
           campaign.bidding_strategy_type, campaign_budget.amount_micros,
           campaign.maximize_conversions.target_cpa_micros, campaign.target_cpa.target_cpa_micros,
           metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.ctr,
           metrics.average_cpc, metrics.conversions, metrics.all_conversions,
           metrics.conversions_value, metrics.search_impression_share,
           metrics.search_budget_lost_impression_share, metrics.search_rank_lost_impression_share
    FROM campaign
    WHERE segments.date DURING ${range} AND campaign.status != 'REMOVED'
    ORDER BY metrics.cost_micros DESC`);
  if (!rows.length) console.log('Ingen leveranse i perioden.');
  let totalCost = 0; let totalConv = 0; let totalClicks = 0;
  for (const r of rows) {
    const c = r.campaign || {}; const m = r.metrics || {}; const b = r.campaignBudget || {};
    totalCost += Number(m.costMicros || 0); totalConv += Number(m.conversions || 0); totalClicks += Number(m.clicks || 0);
    console.log(`\n· ${c.name} [${c.status}] ${c.advertisingChannelType} · bud ${c.biddingStrategyType}`);
    console.log(`  budsjett ${nok(b.amountMicros)}/dag · brukt ${nok(m.costMicros)}`);
    console.log(`  ${num(m.impressions)} visn · ${num(m.clicks)} klikk · CTR ${pct(m.ctr)} · CPC ${nok(m.averageCpc)}`);
    console.log(`  konverteringer ${Number(m.conversions || 0).toFixed(1)} (alle: ${Number(m.allConversions || 0).toFixed(1)}) · verdi ${Number(m.conversionsValue || 0).toFixed(0)}`);
    if (Number(m.conversions) > 0) console.log(`  CPA ${nok(Number(m.costMicros) / Number(m.conversions))}`);
    else if (Number(m.costMicros) > 0) console.log('  CPA: INGEN KONVERTERINGER');
    if (m.searchImpressionShare !== undefined) {
      console.log(`  søkeandel ${pct(m.searchImpressionShare)} · tapt pga budsjett ${pct(m.searchBudgetLostImpressionShare)} · tapt pga rangering ${pct(m.searchRankLostImpressionShare)}`);
    }
  }
  if (rows.length) {
    console.log(`\nSUM ${range}: ${nok(totalCost)} · ${num(totalClicks)} klikk · ${totalConv.toFixed(1)} konv · CPA ${totalConv ? nok(totalCost / totalConv) : '—'}`);
  }
}

console.log('\n══════════ ANNONSEGRUPPER · LAST_30_DAYS ══════════');
for (const r of await q('grupper', `
  SELECT campaign.name, ad_group.name, ad_group.status, ad_group.cpc_bid_micros,
         metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.ctr, metrics.conversions
  FROM ad_group
  WHERE segments.date DURING LAST_30_DAYS AND ad_group.status != 'REMOVED'
  ORDER BY metrics.cost_micros DESC LIMIT 25`)) {
  const m = r.metrics || {};
  console.log(`· ${nok(m.costMicros).padStart(10)} | ${String(Number(m.conversions || 0).toFixed(1)).padStart(5)} konv | CTR ${pct(m.ctr).padStart(7)} | ${r.campaign?.name} / ${r.adGroup?.name} [${r.adGroup?.status}]`);
}

console.log('\n══════════ SØKEORD SOM KOSTER MEST · LAST_30_DAYS ══════════');
for (const r of await q('søkeord', `
  SELECT ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type,
         ad_group_criterion.quality_info.quality_score, ad_group.name,
         metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.average_cpc, metrics.ctr
  FROM keyword_view
  WHERE segments.date DURING LAST_30_DAYS AND metrics.cost_micros > 0
  ORDER BY metrics.cost_micros DESC LIMIT 25`)) {
  const k = r.adGroupCriterion?.keyword || {}; const m = r.metrics || {};
  const qs = r.adGroupCriterion?.qualityInfo?.qualityScore;
  console.log(`· ${nok(m.costMicros).padStart(9)} | ${String(m.clicks || 0).padStart(3)} klikk | ${String(Number(m.conversions || 0).toFixed(1)).padStart(4)} konv | KS ${qs ?? '-'} | ${k.matchType} "${k.text}"`);
}

console.log('\n══════════ SØKETERMER (hva folk faktisk søkte) · LAST_30_DAYS ══════════');
for (const r of await q('søketermer', `
  SELECT search_term_view.search_term, search_term_view.status,
         metrics.cost_micros, metrics.clicks, metrics.conversions, metrics.impressions
  FROM search_term_view
  WHERE segments.date DURING LAST_30_DAYS AND metrics.cost_micros > 0
  ORDER BY metrics.cost_micros DESC LIMIT 30`)) {
  const m = r.metrics || {};
  console.log(`· ${nok(m.costMicros).padStart(9)} | ${String(m.clicks || 0).padStart(3)} kl | ${String(Number(m.conversions || 0).toFixed(1)).padStart(4)} konv | ${r.searchTermView?.status || ''} | "${r.searchTermView?.searchTerm}"`);
}

console.log('\n══════════ LANDINGSSIDER · LAST_30_DAYS ══════════');
for (const r of await q('landingssider', `
  SELECT landing_page_view.unexpanded_final_url, metrics.cost_micros, metrics.clicks, metrics.conversions
  FROM landing_page_view
  WHERE segments.date DURING LAST_30_DAYS AND metrics.clicks > 0
  ORDER BY metrics.cost_micros DESC LIMIT 15`)) {
  const m = r.metrics || {};
  console.log(`· ${nok(m.costMicros).padStart(9)} | ${String(m.clicks || 0).padStart(3)} kl | ${String(Number(m.conversions || 0).toFixed(1)).padStart(4)} konv | ${r.landingPageView?.unexpandedFinalUrl}`);
}

console.log('\n══════════ KONVERTERINGSHANDLINGER ══════════');
try {
  const actions = await listConversionActions(CID);
  for (const a of actions || []) {
    console.log(`· ${a.name} · ${a.status} · type ${a.type} · kategori ${a.category || '-'} · primær: ${a.primaryForGoal ?? '-'} · teller ${a.countingType || '-'} · verdi ${a.defaultValue ?? '-'}`);
  }
  if (!actions?.length) console.log('Ingen konverteringshandlinger funnet.');
} catch (e) {
  console.log('feil:', String(e.message || e).slice(0, 200));
}

console.log('\n══════════ KONVERTERINGER PR. HANDLING · LAST_30_DAYS ══════════');
for (const r of await q('konv pr handling', `
  SELECT segments.conversion_action_name, metrics.all_conversions, metrics.all_conversions_value, metrics.cost_micros
  FROM campaign
  WHERE segments.date DURING LAST_30_DAYS
  ORDER BY metrics.all_conversions DESC LIMIT 20`)) {
  console.log(`· ${r.segments?.conversionActionName || '(uten navn)'}: ${Number(r.metrics?.allConversions || 0).toFixed(1)}`);
}

console.log('\n══════════ ANNONSER: styrke og policy ══════════');
for (const r of await q('annonser', `
  SELECT ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status, ad_group_ad.ad_strength,
         ad_group_ad.policy_summary.approval_status, ad_group.name, campaign.name,
         metrics.cost_micros, metrics.conversions, metrics.ctr
  FROM ad_group_ad
  WHERE segments.date DURING LAST_30_DAYS
  ORDER BY metrics.cost_micros DESC LIMIT 20`)) {
  const m = r.metrics || {}; const a = r.adGroupAd || {};
  console.log(`· ${nok(m.costMicros).padStart(9)} | ${String(Number(m.conversions || 0).toFixed(1)).padStart(4)} konv | styrke ${a.adStrength || '-'} | ${a.policySummary?.approvalStatus || '-'} | ${r.campaign?.name} / ${r.adGroup?.name} (${a.ad?.type})`);
}

console.log('\n══════════ ENHET OG GEOGRAFI · LAST_30_DAYS ══════════');
for (const r of await q('enhet', `
  SELECT segments.device, metrics.cost_micros, metrics.clicks, metrics.conversions
  FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC`)) {
  const m = r.metrics || {};
  console.log(`· ${String(r.segments?.device).padEnd(10)} ${nok(m.costMicros).padStart(9)} | ${String(m.clicks || 0).padStart(3)} kl | ${Number(m.conversions || 0).toFixed(1)} konv`);
}
