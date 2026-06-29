// Henter Meta Pixel / Dataset-ID via tokenet.
// node --env-file=/app/.env /app/scripts/meta_pixel.mjs
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const VER = process.env.META_API_VERSION || 'v21.0';
const ACC = process.env.META_AD_ACCOUNT_ID;
const BASE = `https://graph.facebook.com/${VER}`;

async function gget(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('access_token', TOKEN);
  const res = await fetch(url.toString());
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

(async () => {
  // 1) Pixler knyttet til annonsekontoen
  console.log(`=== ${ACC}/adspixels ===`);
  const px = await gget(`/${ACC}/adspixels`, { fields: 'id,name,last_fired_time,is_unavailable,code' });
  console.log(px.status);
  const pixels = (px.json && px.json.data) || [];
  if (!pixels.length) console.log(JSON.stringify(px.json));
  pixels.forEach((p) => console.log(`  PIXEL/DATASET-ID: ${p.id} | navn: ${p.name} | sist fyrt: ${p.last_fired_time || 'aldri'} | utilgjengelig: ${p.is_unavailable}`));

  // 2) Business → owned/shared pixels (i tilfelle pixelen ikke er direkte koblet til kontoen)
  console.log(`\n=== /me/businesses ===`);
  const biz = await gget('/me/businesses', { fields: 'id,name' });
  const businesses = (biz.json && biz.json.data) || [];
  if (!businesses.length) console.log(JSON.stringify(biz.json));
  for (const b of businesses) {
    console.log(`  Business: ${b.id} | ${b.name}`);
    for (const edge of ['owned_pixels', 'client_pixels']) {
      const r = await gget(`/${b.id}/${edge}`, { fields: 'id,name,last_fired_time' });
      const arr = (r.json && r.json.data) || [];
      arr.forEach((p) => console.log(`    [${edge}] PIXEL/DATASET-ID: ${p.id} | ${p.name} | sist fyrt: ${p.last_fired_time || 'aldri'}`));
      if (!arr.length && r.json && r.json.error) console.log(`    [${edge}] ${r.json.error.message}`);
    }
  }
})();
