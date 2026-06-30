import fs from 'fs';
const env = fs.readFileSync('/app/.env','utf8'); const E={}; for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)E[m[1]]=m[2];}
const CUST=E.GOOGLE_ADS_CUSTOMER_ID.replace(/[^0-9]/g,''), MCC=E.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/[^0-9]/g,'');
async function tok(){const b=new URLSearchParams({client_id:E.GOOGLE_ADS_CLIENT_ID,client_secret:E.GOOGLE_ADS_CLIENT_SECRET,refresh_token:E.GOOGLE_ADS_REFRESH_TOKEN,grant_type:'refresh_token'});const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b});return (await r.json()).access_token;}
async function caId(t){
  const r=await fetch(`https://googleads.googleapis.com/v21/customers/${CUST}/googleAds:search`,{method:'POST',headers:{Authorization:`Bearer ${t}`,'developer-token':E.GOOGLE_ADS_DEVELOPER_TOKEN,'login-customer-id':MCC,'Content-Type':'application/json'},body:JSON.stringify({query:"SELECT conversion_action.id, conversion_action.name FROM conversion_action WHERE conversion_action.type = 'UPLOAD_CLICKS'"})});
  const j=await r.json(); const row=(j.results||[])[0]; return row && row.conversionAction && row.conversionAction.id;
}
(async()=>{
  const t=await tok();
  const cid=await caId(t);
  console.log('Conversion action ID:', cid, '| operating', CUST, '| login(MCC)', MCC);
  const body={
    validateOnly:true,
    destinations:[{ reference:'ga_offline', loginAccount:{accountType:'GOOGLE_ADS',accountId:MCC}, operatingAccount:{accountType:'GOOGLE_ADS',accountId:CUST}, productDestinationId:String(cid) }],
    events:[{ destinationReferences:['ga_offline'], transactionId:'probe-'+Date.now(), eventTimestamp:new Date().toISOString(), eventSource:'WEB', currency:'NOK', conversionValue:5000, adIdentifiers:{ gclid:'TEST_FAKE_GCLID' } }],
  };
  const r=await fetch('https://datamanager.googleapis.com/v1/events:ingest',{method:'POST',headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json();
  console.log('\nevents:ingest (validateOnly) status:', r.status);
  console.log(JSON.stringify(j).slice(0,700));
})().catch(e=>console.log('ERR',e.message));
