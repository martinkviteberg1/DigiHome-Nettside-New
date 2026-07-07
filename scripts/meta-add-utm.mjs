// Legg UTM (url_tags) på aktive manuelle Meta-annonser.
// Metode: url_tags er IKKE redigerbart på eksisterende kreativ → vi lager en ny
// kreativ som gjenbruker samme post (object_story_id) + url_tags, og peker
// annonsen på den nye. Gamle kreativ-IDer logges for evt. rollback.
// Kjøring:  node scripts/meta-add-utm.mjs           (dry-run)
//           node scripts/meta-add-utm.mjs --apply    (utfør)
//           node scripts/meta-add-utm.mjs --apply --only=<adId>
import { readFileSync, appendFileSync } from 'fs';

const env = Object.fromEntries(readFileSync('/app/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const VER = env.META_API_VERSION || 'v21.0';
const ACC = env.META_AD_ACCOUNT_ID; // act_...
const TOKEN = env.META_SYSTEM_USER_TOKEN;

const URL_TAGS = 'utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}';
const ADS = ['120240676668910688', '120243664732370688', '120243576004360688'];

const APPLY = process.argv.includes('--apply');
const only = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${VER}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('access_token', TOKEN);
  const j = await (await fetch(u)).json();
  if (j.error) throw new Error(`${path}: ${j.error.message}`);
  return j;
}
async function post(path, body) {
  const u = new URL(`https://graph.facebook.com/${VER}/${path}`);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) form.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  form.set('access_token', TOKEN);
  const j = await (await fetch(u, { method: 'POST', body: form })).json();
  if (j.error) throw new Error(`POST ${path}: ${j.error.message} ${JSON.stringify(j.error.error_user_msg || '')}`);
  return j;
}

// Fjern id-felter fra adlabels (read-only) før gjenbruk av asset_feed_spec.
function cleanAssetFeedSpec(afs) {
  const clone = JSON.parse(JSON.stringify(afs));
  const stripIds = (arr) => Array.isArray(arr) ? arr.map((x) => ({ name: x.name })) : arr;
  for (const img of clone.images || []) if (img.adlabels) img.adlabels = stripIds(img.adlabels);
  for (const v of clone.videos || []) if (v.adlabels) v.adlabels = stripIds(v.adlabels);
  for (const lu of clone.link_urls || []) delete lu.adlabels; // regler refererer bilder, ikke lenker
  // Behold asset_customization_rules som de er (refererer label-NAVN).
  return clone;
}

for (const adId of ADS) {
  if (only && adId !== only) continue;
  try {
    const ad = await g(adId, { fields: 'name,status,creative{id,url_tags,object_story_id,effective_object_story_id,object_story_spec,asset_feed_spec},adset_id' });
    const c = ad.creative || {};
    console.log(`\n=== ${ad.name} (${adId}) — status ${ad.status} ===`);
    console.log(`Gammel kreativ: ${c.id} | url_tags i dag: ${c.url_tags || '(ingen)'}`);
    if (c.url_tags && c.url_tags.includes('utm_source')) { console.log('→ Har allerede UTM, hopper over.'); continue; }

    let payload = null;
    let strategy = '';
    if (c.asset_feed_spec) {
      strategy = 'asset_feed_spec-kopi';
      payload = {
        name: `${ad.name} | UTM`,
        object_story_spec: { page_id: (c.object_story_spec && c.object_story_spec.page_id) || '' },
        asset_feed_spec: cleanAssetFeedSpec(c.asset_feed_spec),
        url_tags: URL_TAGS,
      };
    } else if (c.effective_object_story_id || c.object_story_id) {
      strategy = 'gjenbruk av post (object_story_id) — beholder likes/kommentarer';
      payload = {
        name: `${ad.name} | UTM`,
        object_story_id: c.effective_object_story_id || c.object_story_id,
        url_tags: URL_TAGS,
      };
    } else {
      console.log('→ FANT INGEN strategi (verken asset_feed_spec eller story_id) — hopper over.');
      continue;
    }
    console.log(`Strategi: ${strategy}`);
    if (!APPLY) { console.log('DRY-RUN → ingen endring. Payload-nøkler:', Object.keys(payload).join(', ')); continue; }

    const created = await post(`${ACC}/adcreatives`, payload);
    console.log(`Ny kreativ opprettet: ${created.id}`);
    await post(adId, { creative: { creative_id: created.id } });
    console.log(`Annonse ompekt til ny kreativ ✔`);
    appendFileSync('/app/scripts/meta-utm-rollback.log', `${new Date().toISOString()} ad=${adId} old_creative=${c.id} new_creative=${created.id}\n`);

    const check = await g(adId, { fields: 'creative{id,url_tags}' });
    console.log(`Verifisert: kreativ=${check.creative.id} url_tags=${check.creative.url_tags}`);
  } catch (e) {
    console.log(`FEIL for ${adId}: ${e.message}`);
  }
}
