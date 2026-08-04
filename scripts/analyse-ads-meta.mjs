// ANALYSE: Meta-annonsering, rådata direkte fra Marketing API.
// Vi går ikke via våre egne cacher — en analyse skal se plattformens tall, ikke
// våre avledede. Annonsedata er identisk for preview og prod: kontoen er den samme.
//   node scripts/analyse-ads-meta.mjs
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
const num = (v) => Number(v || 0).toLocaleString('nb-NO');
const pct = (v) => `${(Number(v || 0)).toFixed(2)} %`;

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(45000) });
  const j = await r.json().catch(() => ({}));
  if (j.error) return { error: `${j.error.code}/${j.error.error_subcode || '-'}: ${j.error.message}` };
  return j;
}

// KUN Metas kanoniske lead-total: action_type === 'lead'. Den aggregerer allerede
// pixel-lead, onsite-lead og leadgen-skjema. Undertypene MÅ ikke summeres i tillegg
// (trippeltelling), og et /lead/-regex tar med 'offsite_content_view_add_meta_leads'
// — en egendefinert konvertering bygget på ViewContent. Da blir 11 leads til 383.
// Samme regel som lib/meta-ads.js. Aldri gjeninnfør regex her.
const LEADY = ['lead'];
function leadsOf(row) {
  const out = {};
  for (const a of row.actions || []) if (LEADY.includes(String(a.action_type))) out[a.action_type] = Number(a.value || 0);
  return out;
}
const leadSum = (row) => Object.values(leadsOf(row)).reduce((a, b) => a + b, 0);
// Alt som LIKNER lead, men ikke er det — vises separat så forskjellen er synlig.
const lookalike = (row) => (row.actions || [])
  .filter((a) => /lead/i.test(String(a.action_type)) && String(a.action_type) !== 'lead')
  .map((a) => `${a.action_type}=${a.value}`);

console.log('══════════ META: KONTO ══════════');
const acct = await g(ACT, { fields: 'name,account_status,disable_reason,currency,timezone_name,amount_spent,spend_cap,balance,business_country_code,created_time' });
if (acct.error) { console.log('FEIL:', acct.error); process.exit(1); }
const STATUS = { 1: 'AKTIV', 2: 'STENGT (disabled)', 3: 'UNSETTLED', 7: 'PENDING_RISK_REVIEW', 8: 'PENDING_SETTLEMENT', 9: 'IN_GRACE_PERIOD', 100: 'PENDING_CLOSURE', 101: 'STENGT', 201: 'ANY_ACTIVE', 202: 'ANY_CLOSED' };
console.log(`${acct.name} · ${acct.currency} · ${acct.timezone_name}`);
console.log(`Status: ${STATUS[acct.account_status] || acct.account_status}${acct.disable_reason ? ` (årsak ${acct.disable_reason})` : ''}`);
console.log(`Totalt brukt (lifetime): ${nok(Number(acct.amount_spent) / 100)} · saldo: ${nok(Number(acct.balance || 0) / 100)}${acct.spend_cap && Number(acct.spend_cap) ? ` · spend cap: ${nok(Number(acct.spend_cap) / 100)}` : ' · ingen spend cap'}`);
console.log(`Opprettet: ${String(acct.created_time || '').slice(0, 10)}`);

for (const preset of ['last_7d', 'last_30d']) {
  console.log(`\n══════════ META: KONTO TOTALT · ${preset} ══════════`);
  const ins = await g(`${ACT}/insights`, {
    date_preset: preset,
    fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type',
    limit: 1,
  });
  const row = (ins.data || [])[0];
  if (!row) { console.log('Ingen leveranse i perioden.'); continue; }
  const l = leadsOf(row);
  const ls = leadSum(row);
  console.log(`Forbruk ${nok(row.spend)} · visninger ${num(row.impressions)} · klikk ${num(row.clicks)} · CTR ${pct(row.ctr)} · CPC ${nok(row.cpc)} · CPM ${nok(row.cpm)}`);
  console.log(`Rekkevidde ${num(row.reach)} · frekvens ${Number(row.frequency || 0).toFixed(2)}`);
  console.log(`Leads (kanonisk 'lead'): ${ls || 0}`);
  const la = lookalike(row);
  if (la.length) console.log(`⚠ Ser ut som leads, men er IKKE innsendte skjema: ${la.join(', ')}`);
  if (ls > 0) console.log(`CPL (Metas egne tall): ${nok(Number(row.spend) / ls)}`);
  const other = (row.actions || []).filter((a) => !LEADY.some((k) => String(a.action_type).includes(k))).slice(0, 8);
  if (other.length) console.log(`Andre hendelser: ${other.map((a) => `${a.action_type}=${a.value}`).join(', ')}`);
}

console.log('\n══════════ META: KAMPANJER ══════════');
const camps = await g(`${ACT}/campaigns`, {
  fields: 'name,status,effective_status,objective,daily_budget,lifetime_budget,bid_strategy,start_time,stop_time,issues_info,created_time',
  limit: 100,
});
const byId = new Map();
for (const c of camps.data || []) byId.set(c.id, c);
console.log(`Antall kampanjer: ${(camps.data || []).length}`);
for (const c of camps.data || []) {
  const budget = c.daily_budget ? `${nok(Number(c.daily_budget) / 100)}/dag` : c.lifetime_budget ? `${nok(Number(c.lifetime_budget) / 100)} totalt` : 'budsjett på annonsesett';
  console.log(`\n· ${c.name}`);
  console.log(`  ${c.effective_status} · mål ${c.objective} · ${budget} · bud ${c.bid_strategy || '-'} · start ${String(c.start_time || '').slice(0, 10)}`);
  if (c.issues_info?.length) for (const i of c.issues_info) console.log(`  ⚠ ${i.level || ''} ${i.error_summary || i.error_message || JSON.stringify(i).slice(0, 120)}`);
}

for (const preset of ['last_30d', 'last_7d']) {
  console.log(`\n══════════ META: KAMPANJEYTELSE · ${preset} ══════════`);
  const ins = await g(`${ACT}/insights`, {
    level: 'campaign', date_preset: preset,
    fields: 'campaign_id,campaign_name,spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,cost_per_action_type',
    limit: 100,
  });
  const rows = (ins.data || []).sort((a, b) => Number(b.spend) - Number(a.spend));
  if (!rows.length) { console.log('Ingen leveranse.'); continue; }
  for (const r of rows) {
    const ls = leadSum(r);
    const c = byId.get(r.campaign_id) || {};
    console.log(`\n· ${r.campaign_name} [${c.effective_status || '?'}]`);
    console.log(`  ${nok(r.spend)} · ${num(r.impressions)} visn · ${num(r.clicks)} klikk · CTR ${pct(r.ctr)} · CPC ${nok(r.cpc)} · CPM ${nok(r.cpm)} · frek ${Number(r.frequency || 0).toFixed(2)}`);
    console.log(`  leads ${ls || 0}${ls ? ` · CPL ${nok(Number(r.spend) / ls)}` : ' · INGEN LEADS'}`);
  }
}

console.log('\n══════════ META: ANNONSESETT (levering og læring) ══════════');
const sets = await g(`${ACT}/adsets`, {
  fields: 'name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_amount,learning_stage_info,issues_info,targeting{age_min,age_max,genders,geo_locations,flexible_spec,publisher_platforms}',
  limit: 100,
});
for (const s of sets.data || []) {
  const t = s.targeting || {};
  const geo = t.geo_locations ? [...(t.geo_locations.cities || []).map((x) => x.name), ...(t.geo_locations.regions || []).map((x) => x.name), ...(t.geo_locations.countries || [])].slice(0, 6).join(', ') : '';
  console.log(`\n· ${s.name} [${s.effective_status}]`);
  console.log(`  mål ${s.optimization_goal || '-'} · fakturering ${s.billing_event || '-'} · ${s.daily_budget ? `${nok(Number(s.daily_budget) / 100)}/dag` : s.lifetime_budget ? `${nok(Number(s.lifetime_budget) / 100)} totalt` : 'CBO'}`);
  console.log(`  alder ${t.age_min || '?'}-${t.age_max || '?'} · kjønn ${(t.genders || []).join('/') || 'alle'} · geo ${geo || '?'} · plattform ${(t.publisher_platforms || []).join(', ') || 'auto'}`);
  if (s.learning_stage_info) console.log(`  læring: ${s.learning_stage_info.status}${s.learning_stage_info.exit_reason ? ` (${s.learning_stage_info.exit_reason})` : ''}`);
  if (s.issues_info?.length) for (const i of s.issues_info) console.log(`  ⚠ ${i.error_summary || i.error_message || ''}`);
}

console.log('\n══════════ META: ANNONSER · last_30d (sortert på forbruk) ══════════');
const adIns = await g(`${ACT}/insights`, {
  level: 'ad', date_preset: 'last_30d',
  fields: 'ad_id,ad_name,adset_name,campaign_name,spend,impressions,clicks,ctr,cpc,frequency,actions',
  limit: 200,
});
const adRows = (adIns.data || []).sort((a, b) => Number(b.spend) - Number(a.spend));
console.log(`Annonser med leveranse: ${adRows.length}`);
for (const r of adRows.slice(0, 20)) {
  const ls = leadSum(r);
  console.log(`· ${nok(r.spend).padStart(11)} | ${String(ls).padStart(3)} leads | CTR ${pct(r.ctr).padStart(7)} | CPC ${nok(r.cpc).padStart(8)} | ${r.campaign_name} / ${r.ad_name}`.slice(0, 200));
}
const zero = adRows.filter((r) => leadSum(r) === 0 && Number(r.spend) > 0);
const wasted = zero.reduce((a, r) => a + Number(r.spend), 0);
console.log(`\nAnnonser med forbruk og NULL leads: ${zero.length} · samlet ${nok(wasted)}`);

console.log('\n══════════ META: AVSLÅTTE / BEGRENSEDE ANNONSER ══════════');
const ads = await g(`${ACT}/ads`, { fields: 'name,effective_status,issues_info,creative{id}', limit: 200 });
const bad = (ads.data || []).filter((a) => !['ACTIVE', 'PAUSED', 'ARCHIVED', 'DELETED', 'CAMPAIGN_PAUSED', 'ADSET_PAUSED'].includes(a.effective_status) || (a.issues_info || []).length);
console.log(`Annonser totalt: ${(ads.data || []).length} · med problem: ${bad.length}`);
for (const a of bad.slice(0, 15)) {
  console.log(`· ${a.name} [${a.effective_status}] ${(a.issues_info || []).map((i) => i.error_summary || i.error_message || '').join(' | ').slice(0, 120)}`);
}

console.log('\n══════════ META: PIXEL / CAPI-HELSE ══════════');
const px = await g(`${ACT}/adspixels`, { fields: 'name,id,last_fired_time,is_created_by_business,data_use_setting,enable_automatic_matching' });
for (const p of px.data || []) {
  console.log(`· ${p.name} (${p.id}) · sist mottatt hendelse: ${p.last_fired_time || 'ALDRI'}`);
}
if (!(px.data || []).length) console.log('Ingen pixel funnet på kontoen.');
