import fs from 'fs';
const env = fs.readFileSync('/app/.env','utf8'); const E={}; for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)E[m[1]]=m[2];}
const KEY=E.ADMIN_KEY; const B='http://localhost:3000/api';
(async()=>{
  // validateOnly (default true) — trygt
  let r=await fetch(`${B}/admin/ads/datamanager/test?key=${KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gclid:'TEST_FAKE_GCLID', value:5000, validateOnly:true})});
  let j=await r.json();
  console.log('datamanager/test (validateOnly):', r.status, 'ok=', j.ok, 'requestId=', j.requestId, j.error||'');
  // uten key -> 401
  r=await fetch(`${B}/admin/ads/datamanager/test`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
  console.log('datamanager/test (no key):', r.status);
})().catch(e=>console.log('ERR',e.message));
