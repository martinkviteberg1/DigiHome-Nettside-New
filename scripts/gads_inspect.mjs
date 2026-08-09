import fs from 'fs';
const env = fs.readFileSync('/app/.env','utf8'); const E={}; for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)E[m[1]]=m[2];}
const CUST=E.GOOGLE_ADS_CUSTOMER_ID.replace(/[^0-9]/g,''), MCC=E.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/[^0-9]/g,'');
async function tok(){const b=new URLSearchParams({client_id:E.GOOGLE_ADS_CLIENT_ID,client_secret:E.GOOGLE_ADS_CLIENT_SECRET,refresh_token:E.GOOGLE_ADS_REFRESH_TOKEN,grant_type:'refresh_token'});const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b});return (await r.json()).access_token;}
const VER = E.GOOGLE_ADS_API_VERSION || 'v22';
async function q(t,query){const r=await fetch(`https://googleads.googleapis.com/${VER}/customers/${CUST}/googleAds:search`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'developer-token':E.GOOGLE_ADS_DEVELOPER_TOKEN,'login-customer-id':MCC,'Content-Type':'application/json'},body:JSON.stringify({query})});return r.json();}
(async()=>{
  const t=await tok();
  console.log('=== KAMPANJER ===');
  const camps=await q(t,'SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.bidding_strategy_type FROM campaign WHERE campaign.status != "REMOVED"');
  for(const r of (camps.results||[])){const c=r.campaign; console.log(`  ${c.id} | ${c.name} | ${c.status} | ${c.advertisingChannelType} | bid=${c.biddingStrategyType}`);}
  console.log('\n=== ANNONSEGRUPPER ===');
  const ags=await q(t,'SELECT campaign.name, ad_group.id, ad_group.name, ad_group.status, ad_group.cpc_bid_micros FROM ad_group WHERE ad_group.status != "REMOVED"');
  for(const r of (ags.results||[])){console.log(`  [${r.campaign.name}] ${r.adGroup.id} | ${r.adGroup.name} | ${r.adGroup.status} | cpc=${r.adGroup.cpcBidMicros?(r.adGroup.cpcBidMicros/1e6+'kr'):'-'}`);}
  console.log('\n=== ANNONSER (RSA) ===');
  const ads=await q(t,"SELECT ad_group.name, ad_group_ad.ad.id, ad_group_ad.ad.type, ad_group_ad.status FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED'");
  for(const r of (ads.results||[])){console.log(`  [${r.adGroup.name}] ad ${r.adGroupAd.ad.id} | ${r.adGroupAd.ad.type} | ${r.adGroupAd.status}`);}
  console.log('\n=== SØKEORD (antall pr gruppe) ===');
  const kws=await q(t,"SELECT ad_group.name, ad_group_criterion.keyword.text, ad_group_criterion.keyword.match_type FROM ad_group_criterion WHERE ad_group_criterion.type = 'KEYWORD' AND ad_group_criterion.status != 'REMOVED'");
  const byAg={}; for(const r of (kws.results||[])){const a=r.adGroup.name; byAg[a]=(byAg[a]||0)+1;}
  Object.entries(byAg).forEach(([a,n])=>console.log(`  [${a}] ${n} søkeord`));
  if(!(kws.results||[]).length) console.log('  (ingen søkeord)');
  console.log('\n=== NEGATIVE (kampanje + delte lister) ===');
  const negs=await q(t,"SELECT campaign.name, campaign_criterion.keyword.text FROM campaign_criterion WHERE campaign_criterion.type='KEYWORD' AND campaign_criterion.negative=true");
  console.log('  kampanje-negative:', (negs.results||[]).length);
  const lists=await q(t,'SELECT shared_set.id, shared_set.name, shared_set.type, shared_set.member_count FROM shared_set');
  for(const r of (lists.results||[])){console.log(`  delt liste: ${r.sharedSet.name} | ${r.sharedSet.type} | ${r.sharedSet.memberCount} medlemmer`);}
})().catch(e=>console.log('ERR',e.message));
