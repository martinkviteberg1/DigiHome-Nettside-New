// ANALYSE 2: hva optimaliserer Meta EGENTLIG mot, og hva er ekte leads?
// «Leads» i rapporten er verdiløst hvis hendelsen bak er et sidevisning.
//   node scripts/analyse-ads-meta-events.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const V = process.env.META_API_VERSION || 'v21.0';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const RAW = String(process.env.META_AD_ACCOUNT_ID || '').trim();
const ACT = RAW.startsWith('act_') ? RAW : `act_${RAW}`;
const nok = (v) => `${Math.round(Number(v || 0)).toLocaleString('nb-NO')} kr`;

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(45000) });
  const j = await r.json().catch(() => ({}));
  if (j.error) return { error: `${j.error.code}: ${j.error.message}` };
  return j;
}

console.log('══════════ HVA OPTIMALISERES DET MOT? ══════════');
const sets = await g(`${ACT}/adsets`, {
  fields: 'name,effective_status,optimization_goal,promoted_object,attribution_spec,destination_type,daily_budget,targeting{geo_locations,targeting_automation,age_min,age_max}',
  limit: 50,
});
for (const s of sets.data || []) {
  if (s.effective_status !== 'ACTIVE') continue;
  console.log(`\n· ${s.name} [${s.effective_status}] ${s.daily_budget ? nok(Number(s.daily_budget) / 100) + '/dag' : ''}`);
  console.log(`  optimization_goal: ${s.optimization_goal}`);
  console.log(`  promoted_object:   ${JSON.stringify(s.promoted_object || {})}`);
  console.log(`  attribution_spec:  ${JSON.stringify(s.attribution_spec || [])}`);
  console.log(`  destination_type:  ${s.destination_type || '-'}`);
  console.log(`  targeting:         ${JSON.stringify(s.targeting || {}).slice(0, 300)}`);
}

console.log('\n══════════ EGENDEFINERTE KONVERTERINGER ══════════');
const cc = await g(`${ACT}/customconversions`, {
  fields: 'name,id,custom_event_type,description,rule,default_conversion_value,is_archived,creation_time,last_fired_time,aggregation_rule',
  limit: 60,
});
for (const c of cc.data || []) {
  console.log(`\n· ${c.name} (${c.id})${c.is_archived ? ' [ARKIVERT]' : ''}`);
  console.log(`  event-type: ${c.custom_event_type} · verdi: ${c.default_conversion_value ?? '-'} · sist utløst: ${c.last_fired_time || 'ALDRI'}`);
  console.log(`  regel: ${String(c.rule || '').slice(0, 260)}`);
}
if (!(cc.data || []).length) console.log('Ingen egendefinerte konverteringer.');

console.log('\n══════════ EKTE LEADS PR. DAG (siste 21 dager) ══════════');
const daily = await g(`${ACT}/insights`, {
  time_increment: 1, date_preset: 'last_28d',
  fields: 'date_start,spend,impressions,clicks,actions',
  limit: 60,
});
// Vi skiller strengt: pixel_lead/onsite_web_lead er et skjema som er sendt inn.
// Alt som heter content_view er en som SÅ noe — ikke en interessent.
const real = (row) => (row.actions || [])
  .filter((a) => ['lead', 'offsite_conversion.fb_pixel_lead', 'onsite_web_lead'].includes(a.action_type))
  .reduce((max, a) => Math.max(max, Number(a.value || 0)), 0);
const viewy = (row) => (row.actions || [])
  .filter((a) => String(a.action_type).includes('content_view'))
  .reduce((max, a) => Math.max(max, Number(a.value || 0)), 0);
let sumSpend = 0; let sumReal = 0; let sumView = 0;
for (const r of (daily.data || []).slice(-21)) {
  const rl = real(r); const vw = viewy(r);
  sumSpend += Number(r.spend || 0); sumReal += rl; sumView += vw;
  console.log(`${r.date_start} · ${nok(r.spend).padStart(9)} · ${String(r.clicks).padStart(3)} klikk · EKTE leads ${String(rl).padStart(2)} · content_view ${String(vw).padStart(3)}`);
}
console.log(`\nSum 21 dager: ${nok(sumSpend)} · ekte leads ${sumReal} · content_view ${sumView}`);
console.log(`EKTE CPL: ${sumReal ? nok(sumSpend / sumReal) : 'ingen leads å regne på'}`);
console.log(`«CPL» hvis man tror på content_view: ${sumView ? nok(sumSpend / sumView) : '-'}`);

console.log('\n══════════ HVOR SENDES TRAFIKKEN? ══════════');
const ads = await g(`${ACT}/ads`, {
  fields: 'name,effective_status,creative{object_story_spec,asset_feed_spec,url_tags,effective_object_story_id,title,body,link_url}',
  limit: 40,
});
for (const a of ads.data || []) {
  if (a.effective_status !== 'ACTIVE') continue;
  const cr = a.creative || {};
  const link = cr.object_story_spec?.link_data?.link
    || cr.object_story_spec?.video_data?.call_to_action?.value?.link
    || (cr.asset_feed_spec?.link_urls || [])[0]?.website_url
    || cr.link_url || '';
  const cta = cr.object_story_spec?.link_data?.call_to_action?.type
    || cr.object_story_spec?.video_data?.call_to_action?.type || '';
  console.log(`\n· ${a.name}`);
  console.log(`  lenke: ${link || '(fant ikke lenke i creative)'}`);
  console.log(`  CTA: ${cta || '-'} · url_tags: ${cr.url_tags || '(ingen UTM-er)'}`);
}
