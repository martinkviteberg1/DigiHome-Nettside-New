import fs from 'fs';
const env = fs.readFileSync('/app/.env','utf8'); const E={}; for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)E[m[1]]=m[2];}
const NEW_RT='1//04-NEgB6MQOlMCgYIARAAGAQSNwF-L9Ir10uwiFagJyBKT-6D6tnjUPEsigJ_N30VgY1d_k3sgPzYKKXCHzOZvM-ANMeZNxOCtlE';
(async()=>{
  const b=new URLSearchParams({client_id:E.GOOGLE_ADS_CLIENT_ID,client_secret:E.GOOGLE_ADS_CLIENT_SECRET,refresh_token:NEW_RT,grant_type:'refresh_token'});
  const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:b});
  const j=await r.json();
  console.log('OAuth status:', r.status);
  if(!r.ok){ console.log('FEIL:', JSON.stringify(j)); return; }
  console.log('access_token len:', (j.access_token||'').length);
  console.log('GRANTED SCOPES:', j.scope);
  const hasAds = (j.scope||'').includes('adwords');
  const hasDM = (j.scope||'').includes('datamanager');
  console.log('  → adwords:', hasAds ? 'JA' : 'NEI', '| datamanager:', hasDM ? 'JA' : 'NEI');
  // test adwords scope
  const t=j.access_token;
  const la=await fetch(`https://googleads.googleapis.com/v21/customers:listAccessibleCustomers`,{headers:{Authorization:`Bearer ${t}`,'developer-token':E.GOOGLE_ADS_DEVELOPER_TOKEN}});
  const laj=await la.json();
  console.log('\nlistAccessibleCustomers:', la.status, JSON.stringify(laj).slice(0,150));
})().catch(e=>console.log('ERR',e.message));
