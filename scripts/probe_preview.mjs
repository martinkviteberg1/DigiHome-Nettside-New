import fs from 'fs';
try { const env = fs.readFileSync('/app/.env','utf8'); for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2];} } catch(e){}
const VER='v21.0', ACC=process.env.META_AD_ACCOUNT_ID, TOK=process.env.META_SYSTEM_USER_TOKEN;
async function g(path, params={}){const u=new URL(`https://graph.facebook.com/${VER}/${path}`);for(const k in params)u.searchParams.set(k,params[k]);u.searchParams.set('access_token',TOK);const r=await fetch(u);return r.json();}
(async()=>{
  const ads=await g(`${ACC}/ads`,{fields:'id,name,creative{object_type}',limit:'1'});
  const a=(ads.data||[])[0];
  console.log('AD:', a.name, a.id);
  // field expansion form on ads edge
  const exp = await g(`${ACC}/ads`, { fields: 'id,name,previews.ad_format(MOBILE_FEED_STANDARD){body}', limit:'1' });
  const eb = exp.data && exp.data[0] && exp.data[0].previews && exp.data[0].previews.data && exp.data[0].previews.data[0] && exp.data[0].previews.data[0].body;
  console.log('\nFIELD EXPANSION body present?', !!eb, exp.error?('ERR:'+exp.error.message):'');
  if(eb) console.log('  body snippet:', eb.slice(0,160));
  // fetch the iframe src server side and see what HTML comes back
  const pv=await g(`${a.id}/previews`,{ad_format:'MOBILE_FEED_STANDARD'});
  const body=(pv.data&&pv.data[0]&&pv.data[0].body)||'';
  const src=(body.match(/src=\"([^\"]+)\"/)||[])[1]||'';
  const realSrc = src.replace(/&amp;/g,'&');
  console.log('\nIFRAME src host:', new URL(realSrc).host);
  const r = await fetch(realSrc, { headers: { 'User-Agent':'Mozilla/5.0' } });
  const html = await r.text();
  console.log('proxied status:', r.status, 'len:', html.length, 'ctype:', r.headers.get('content-type'));
  console.log('html head:', html.slice(0,300).replace(/\n/g,' '));
})().catch(e=>console.log('UNCAUGHT',e.message));
