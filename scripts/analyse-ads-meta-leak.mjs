// ANALYSE 4 (Meta): tre spørsmål som avgjør tiltakene.
// 1) Hvilken egendefinert konvertering blåser opp «leads»? (finn navnet)
// 2) Hvilke annonser gir EKTE leads (action_type 'lead')?
// 3) Hvor forsvinner klikkene mellom lenkeklikk og sidevisning?
//   node scripts/analyse-ads-meta-leak.mjs [since] [until]
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const V = process.env.META_API_VERSION || 'v21.0';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const RAW = String(process.env.META_AD_ACCOUNT_ID || '').trim();
const ACT = RAW.startsWith('act_') ? RAW : `act_${RAW}`;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const SINCE = process.argv[2] || '2026-07-06';
const UNTIL = process.argv[3] || '2026-08-04';
const TIME = JSON.stringify({ since: SINCE, until: UNTIL });

const nok = (v) => `${Math.round(Number(v || 0)).toLocaleString('nb-NO')} kr`;
const num = (v) => Number(v || 0).toLocaleString('nb-NO');
const pct = (v) => `${Number(v || 0).toFixed(1)} %`;
const val = (row, type) => Number((row.actions || []).find((a) => a.action_type === type)?.value || 0);

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (j.error) return { error: `${j.error.code}/${j.error.error_subcode || '-'}: ${j.error.message}` };
  return j;
}

console.log('══════════ 1) EGENDEFINERTE KONVERTERINGER (jakten på navnet) ══════════');
const acct = await g(ACT, { fields: 'business,name' });
console.log(`Konto: ${acct.name} · business: ${acct.business?.name || '-'} (${acct.business?.id || '-'})`);
for (const edge of [`${ACT}/customconversions`, acct.business?.id ? `${acct.business.id}/customconversions` : null, PIXEL ? `${PIXEL}/... ` : null].filter(Boolean)) {
  if (edge.includes('...')) continue;
  const cc = await g(edge, { fields: 'name,id,custom_event_type,rule,is_archived,last_fired_time,offline_conversion_data_set,pixel{id,name}', limit: 100 });
  console.log(`\n[${edge}] ${cc.error ? `feilet: ${cc.error}` : `${(cc.data || []).length} treff`}`);
  for (const c of cc.data || []) {
    console.log(`· ${c.name} (${c.id})${c.is_archived ? ' [ARKIVERT]' : ''} · event ${c.custom_event_type} · sist utløst ${c.last_fired_time || '-'}`);
    console.log(`  regel: ${String(JSON.stringify(c.rule || '')).slice(0, 300)}`);
  }
}

console.log('\n══════════ 2) EKTE LEADS PR. ANNONSE (kanonisk \'lead\') ══════════');
const ads = await g(`${ACT}/insights`, {
  time_range: TIME, level: 'ad',
  fields: 'ad_name,campaign_name,spend,impressions,clicks,inline_link_clicks,ctr,cpc,actions',
  limit: 100,
});
for (const r of (ads.data || []).sort((a, b) => Number(b.spend) - Number(a.spend))) {
  const lead = val(r, 'lead');
  const lpv = val(r, 'landing_page_view');
  const vc = val(r, 'view_content');
  const ic = val(r, 'initiate_checkout');
  const lc = Number(r.inline_link_clicks || 0);
  console.log(`\n· ${r.ad_name}`);
  console.log(`  ${nok(r.spend)} · ${num(r.impressions)} visn · ${lc} lenkeklikk · CTR ${Number(r.ctr || 0).toFixed(2)} % · CPC(lenke) ${lc ? nok(Number(r.spend) / lc) : '-'}`);
  console.log(`  lenkeklikk ${lc} → sidevisning ${lpv} (${lc ? pct((lpv / lc) * 100) : '-'}) → ViewContent ${vc} → skjema startet ${ic} → LEAD ${lead}`);
  console.log(`  EKTE CPL: ${lead ? nok(Number(r.spend) / lead) : 'INGEN LEADS'}`);
}

console.log('\n══════════ 3) KLIKKLEKKASJEN PR. PLATTFORM ══════════');
const byPlat = await g(`${ACT}/insights`, {
  time_range: TIME, breakdowns: 'publisher_platform',
  fields: 'spend,clicks,inline_link_clicks,actions',
  limit: 20,
});
for (const r of (byPlat.data || []).sort((a, b) => Number(b.spend) - Number(a.spend))) {
  const lc = Number(r.inline_link_clicks || 0);
  const lpv = val(r, 'landing_page_view');
  if (!lc) continue;
  console.log(`· ${String(r.publisher_platform).padEnd(18)} ${nok(r.spend).padStart(9)} · ${String(lc).padStart(4)} lenkeklikk → ${String(lpv).padStart(4)} sidevisning (${pct((lpv / lc) * 100)}) · leads ${val(r, 'lead')}`);
}

console.log('\n══════════ 4) PIXEL: HVILKE HENDELSER MOTTAS, OG HVORDAN? ══════════');
if (PIXEL) {
  const st = await g(`${PIXEL}/stats`, { aggregation: 'event', start_time: SINCE, end_time: UNTIL });
  if (st.error) console.log(`(pixel/stats feilet: ${st.error})`);
  else for (const d of (st.data || []).slice(0, 3)) console.log(JSON.stringify(d).slice(0, 900));
  const px = await g(PIXEL, { fields: 'name,last_fired_time,automatic_matching_fields,enable_automatic_matching,first_party_cookie_status,data_use_setting' });
  if (!px.error) {
    console.log(`\nPixel ${px.name}: sist hendelse ${px.last_fired_time} · auto-matching ${px.enable_automatic_matching} · felter ${(px.automatic_matching_fields || []).join(',') || '-'} · 1st-party-cookie ${px.first_party_cookie_status || '-'}`);
  }
}
