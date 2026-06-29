import fs from 'fs';
try { const env = fs.readFileSync('/app/.env','utf8'); for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2];} } catch(e){}
const VER='v21.0', ACC=process.env.META_AD_ACCOUNT_ID, TOK=process.env.META_SYSTEM_USER_TOKEN;
async function g(path, params={}){const u=new URL(`https://graph.facebook.com/${VER}/${path}`);for(const k in params)u.searchParams.set(k,params[k]);u.searchParams.set('access_token',TOK);const r=await fetch(u);return r.json();}
(async()=>{
  const ads=await g(`${ACC}/ads`,{fields:'id',limit:'1'});
  const id=(ads.data||[])[0].id;
  const pv=await g(`${id}/previews`,{ad_format:'MOBILE_FEED_STANDARD'});
  const body=(pv.data&&pv.data[0]&&pv.data[0].body)||'';
  const src=(body.match(/src=\"([^\"]+)\"/)||[])[1].replace(/&amp;/g,'&');
  const r = await fetch(src, { redirect:'manual', headers:{'User-Agent':'Mozilla/5.0'} });
  console.log('status', r.status);
  console.log('x-frame-options:', r.headers.get('x-frame-options'));
  console.log('content-security-policy:', (r.headers.get('content-security-policy')||'').slice(0,300));
})().catch(e=>console.log('ERR',e.message));
