import fs from 'fs';
try { const env = fs.readFileSync('/app/.env','utf8'); for (const l of env.split('\n')){const m=l.match(/^([A-Z0-9_]+)=(.*)$/); if(m&&!process.env[m[1]])process.env[m[1]]=m[2];} } catch(e){}
const VER='v21.0', ACC=process.env.META_AD_ACCOUNT_ID, TOK=process.env.META_SYSTEM_USER_TOKEN;
async function g(path, params={}){const u=new URL(`https://graph.facebook.com/${VER}/${path}`);for(const k in params)u.searchParams.set(k,params[k]);u.searchParams.set('access_token',TOK);const r=await fetch(u);return r.json();}
(async()=>{
  // hent 2 annonser med effective_object_story_id + creative.id
  const ads=await g(`${ACC}/ads`,{fields:'id,name,creative{id,effective_object_story_id,image_hash,object_type}',limit:'4'});
  for(const a of (ads.data||[])){
    const c=a.creative||{};
    console.log('\n=== AD',a.name,'| objType',c.object_type,'| storyId',c.effective_object_story_id,'| hash',c.image_hash);
    if(c.effective_object_story_id){
      const post=await g(c.effective_object_story_id,{fields:'full_picture,picture'});
      console.log('  full_picture:', (post.full_picture||'').slice(0,90));
      console.log('  err:', post.error&&post.error.message);
    }
    if(c.image_hash){
      const im=await g(`${ACC}/adimages`,{fields:'url,width,height',hashes:JSON.stringify([c.image_hash])});
      const d=(im.data||im.images||[])[0]||(im.data&&Object.values(im.data)[0]);
      console.log('  adimage:', JSON.stringify(im).slice(0,200));
    }
    // preview iframe
    const pv=await g(`${a.id}/previews`,{ad_format:'MOBILE_FEED_STANDARD'});
    const body=(pv.data&&pv.data[0]&&pv.data[0].body)||'';
    const src=(body.match(/src=\"([^\"]+)\"/)||[])[1]||'';
    console.log('  preview iframe src:', src ? src.replace(/&amp;/g,'&').slice(0,120)+'...' : '(none)', pv.error?('ERR:'+pv.error.message):'');
  }
})().catch(e=>console.log('UNCAUGHT',e.message));
