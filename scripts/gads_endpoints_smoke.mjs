import fs from 'fs';
const env = fs.readFileSync('/app/.env','utf8'); const E={}; for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)E[m[1]]=m[2];}
const KEY = E.ADMIN_KEY; const B='http://localhost:3000/api';
async function gj(path){ const r=await fetch(`${B}${path}${path.includes('?')?'&':'?'}key=${KEY}`); let j; try{j=await r.json();}catch(e){j={_nonjson:(await r.text()).slice(0,120)};} return {s:r.status,j}; }
async function pj(path, body){ const r=await fetch(`${B}${path}?key=${KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); let j; try{j=await r.json();}catch(e){j={_nonjson:(await r.text()).slice(0,120)};} return {s:r.status,j}; }
(async()=>{
  let r;
  r = await gj('/admin/ads/google-status');
  console.log('google-status:', r.s, 'provider=', r.j.provider, 'connected=', r.j.connected, 'count=', r.j.count, r.j.error||'');

  r = await gj('/admin/ads/campaigns');
  console.log('\ncampaigns:', r.s, 'ok=', r.j.ok, 'antall=', (r.j.campaigns||[]).length);
  (r.j.campaigns||[]).slice(0,5).forEach(c=>console.log('  -', c.name, '|', c.status, '| budsjett', c.dailyBudget, 'kr/d | kost', c.cost, 'kr | budgetRN=', (c.budgetResourceName||'').slice(-30)));

  r = await gj('/admin/ads/conversion-actions');
  console.log('\nconversion-actions:', r.s, 'ok=', r.j.ok, 'antall=', (r.j.actions||[]).length, '| offlineAction=', r.j.offlineAction && r.j.offlineAction.resourceName ? ('FUNNET: '+r.j.offlineAction.name) : 'IKKE FUNNET', r.j.error||'');
  (r.j.actions||[]).filter(a=>a.type==='UPLOAD_CLICKS').slice(0,5).forEach(a=>console.log('  UPLOAD_CLICKS:', a.name, '|', a.status));

  r = await gj('/admin/ads/geo-suggest?q=Bergen');
  console.log('\ngeo-suggest Bergen:', r.s, 'ok=', r.j.ok, 'antall=', (r.j.suggestions||[]).length);
  (r.j.suggestions||[]).slice(0,4).forEach(g=>console.log('  -', g.id, g.name, g.targetType, 'reach', g.reach));

  // overview regresjon
  r = await gj('/admin/ads/overview');
  console.log('\noverview:', r.s, 'google.source=', r.j.google && r.j.google.source, '| google.live=', r.j.google && r.j.google.live, '| googleConfigured=', r.j.googleConfigured);

  // campaign create — validateOnly (trygt, oppretter INGENTING)
  r = await pj('/admin/ads/campaign/create', {
    validateOnly: true,
    name: 'TEST validate '+Date.now(),
    dailyBudget: 100, finalUrl: 'https://digihome.no/bli-utleier',
    headlines: ['Lei ut boligen din','Trygg utleie i Bergen','DigiHome forvaltning'],
    descriptions: ['Vi finner gode leietakere raskt.','Full forvaltning uten stress.'],
    keywords: ['utleie bergen','leie ut leilighet'],
    geoTargetConstantIds: ['2578'],
  });
  console.log('\ncampaign/create (validateOnly):', r.s, 'ok=', r.j.ok, '| opsCount=', r.j.operationCount, '| note=', r.j.note, r.j.error||'');
})().catch(e=>console.log('ERR', e.message));
