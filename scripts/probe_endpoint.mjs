import fs from 'fs';
const env = fs.readFileSync('/app/.env','utf8'); const E={}; for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m)E[m[1]]=m[2];}
const KEY = E.ADMIN_KEY || 'dh_admin_b3Kx92Qz7Lm4';
const VER='v21.0', ACC=E.META_AD_ACCOUNT_ID, TOK=E.META_SYSTEM_USER_TOKEN;
async function g(path, params={}){const u=new URL(`https://graph.facebook.com/${VER}/${path}`);for(const k in params)u.searchParams.set(k,params[k]);u.searchParams.set('access_token',TOK);const r=await fetch(u);return r.json();}
(async()=>{
  const ads=await g(`${ACC}/ads`,{fields:'id',limit:'1'}); const id=(ads.data||[])[0].id;
  console.log('Using ad id', id, '| ADMIN_KEY present?', !!E.ADMIN_KEY);
  // 1) no auth -> 401
  let r = await fetch(`http://localhost:3000/api/admin/ads/preview?id=${id}`, { redirect:'manual' });
  console.log('no-auth status:', r.status);
  // 2) bad id -> 400
  r = await fetch(`http://localhost:3000/api/admin/ads/preview?id=abc&key=${KEY}`, { redirect:'manual' });
  console.log('bad-id status:', r.status);
  // 3) valid -> 302 to business.facebook.com
  r = await fetch(`http://localhost:3000/api/admin/ads/preview?id=${id}&format=MOBILE_FEED_STANDARD&key=${KEY}`, { redirect:'manual' });
  console.log('valid status:', r.status, '| location host:', (()=>{try{return new URL(r.headers.get('location')).host}catch(e){return r.headers.get('location')}})());
  console.log('referrer-policy:', r.headers.get('referrer-policy'));
  // 4) invalid format falls back gracefully -> 302
  r = await fetch(`http://localhost:3000/api/admin/ads/preview?id=${id}&format=HACK&key=${KEY}`, { redirect:'manual' });
  console.log('bad-format status:', r.status);
})().catch(e=>console.log('ERR',e.message));
