// Sjekk om annonsen bruker Instant Form (lead_gen_form) eller nettside-destinasjon.
import { readFileSync } from 'fs';
const env = Object.fromEntries(readFileSync('/app/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]));
const VER = env.META_API_VERSION || 'v21.0';
const TOKEN = env.META_SYSTEM_USER_TOKEN;

const ADS = ['120240676668910688']; // Bilde | Gratis vurdering skjema | Inne | Lilla

for (const id of ADS) {
  const u = new URL(`https://graph.facebook.com/${VER}/${id}`);
  u.searchParams.set('fields', 'name,status,adset{name,destination_type,optimization_goal,promoted_object},creative{id,object_story_spec,asset_feed_spec,call_to_action_type,link_url,object_type}');
  u.searchParams.set('access_token', TOKEN);
  const j = await (await fetch(u)).json();
  console.log('=== ANNONSE:', j.name, '===');
  const as = j.adset || {};
  console.log('Annonsesett:', as.name);
  console.log('destination_type:', as.destination_type, '| optimization_goal:', as.optimization_goal);
  console.log('promoted_object:', JSON.stringify(as.promoted_object));
  const c = j.creative || {};
  console.log('creative.object_type:', c.object_type, '| call_to_action_type:', c.call_to_action_type, '| link_url:', c.link_url);
  const oss = c.object_story_spec || {};
  const ld = oss.link_data || {};
  console.log('object_story_spec.link_data.link:', ld.link);
  console.log('link_data.call_to_action:', JSON.stringify(ld.call_to_action));
  if (c.asset_feed_spec) {
    const afs = c.asset_feed_spec;
    console.log('asset_feed_spec.link_urls:', JSON.stringify(afs.link_urls || []));
    console.log('asset_feed_spec.call_to_action_types:', JSON.stringify(afs.call_to_action_types || []));
  }
  const str = JSON.stringify(j);
  console.log('>>> Inneholder lead_gen_form?', str.includes('lead_gen') ? 'JA — Instant Form' : 'NEI — ikke Instant Form');
}
