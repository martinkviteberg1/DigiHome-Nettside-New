// ANALYSE 3 (Meta): samme datovindu som prod-KPI + hvor pengene faktisk leveres.
// Vi låser tidsvinduet til 2026-07-06 → 2026-08-04 slik at Meta, Google og CRM
// snakker om NØYAKTIG samme dager. Ellers blir CPL/CAC-sammenligning tull.
//   node scripts/analyse-ads-meta-window.mjs [since] [until]
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const V = process.env.META_API_VERSION || 'v21.0';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const RAW = String(process.env.META_AD_ACCOUNT_ID || '').trim();
const ACT = RAW.startsWith('act_') ? RAW : `act_${RAW}`;
const SINCE = process.argv[2] || '2026-07-06';
const UNTIL = process.argv[3] || '2026-08-04';

const nok = (v) => `${Math.round(Number(v || 0)).toLocaleString('nb-NO')} kr`;
const num = (v) => Number(v || 0).toLocaleString('nb-NO');
const pct = (v) => `${Number(v || 0).toFixed(2)} %`;

async function g(path, params = {}) {
  const u = new URL(`https://graph.facebook.com/${V}/${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(60000) });
  const j = await r.json().catch(() => ({}));
  if (j.error) return { error: `${j.error.code}/${j.error.error_subcode || '-'}: ${j.error.message}` };
  return j;
}

// Metas kanoniske lead-total er action_type 'lead'. Den aggregerer pixel-lead,
// onsite-lead og leadgen. Alt annet som inneholder ordet "lead" i navnet kan være
// en EGENDEFINERT konvertering bygget på en visning — aldri summer på regex.
const val = (row, type) => Number((row.actions || []).find((a) => a.action_type === type)?.value || 0);
const TIME = JSON.stringify({ since: SINCE, until: UNTIL });

console.log(`══════════ META · LÅST VINDU ${SINCE} → ${UNTIL} ══════════`);
const ins = await g(`${ACT}/insights`, {
  time_range: TIME,
  fields: 'spend,impressions,clicks,ctr,cpc,cpm,reach,frequency,actions,inline_link_clicks,cost_per_action_type',
  limit: 1,
});
if (ins.error) { console.log('FEIL:', ins.error); process.exit(1); }
const row = (ins.data || [])[0] || {};
const leads = val(row, 'lead');
console.log(`Forbruk ${nok(row.spend)} · visninger ${num(row.impressions)} · klikk ${num(row.clicks)} (lenkeklikk ${num(row.inline_link_clicks)})`);
console.log(`CTR ${pct(row.ctr)} · CPC ${nok(row.cpc)} · CPM ${nok(row.cpm)} · rekkevidde ${num(row.reach)} · frekvens ${Number(row.frequency || 0).toFixed(2)}`);
console.log(`Metas kanoniske leads ('lead'): ${leads} → CPL ${leads ? nok(Number(row.spend) / leads) : '–'}`);
console.log('\nAlle hendelser i vinduet:');
for (const a of (row.actions || []).sort((x, y) => Number(y.value) - Number(x.value))) {
  console.log(`  ${String(a.action_type).padEnd(48)} ${a.value}`);
}

for (const brk of ['publisher_platform', 'platform_position', 'impression_device', 'age', 'gender']) {
  console.log(`\n══════════ META · FORDELING: ${brk} ══════════`);
  const b = await g(`${ACT}/insights`, {
    time_range: TIME, breakdowns: brk,
    fields: 'spend,impressions,clicks,ctr,cpc,actions',
    limit: 50,
  });
  if (b.error) { console.log(`  (feilet: ${b.error})`); continue; }
  const rows = (b.data || []).sort((x, y) => Number(y.spend) - Number(x.spend));
  for (const r of rows) {
    const key = r[brk] || r.publisher_platform || '?';
    const l = val(r, 'lead');
    console.log(`· ${String(key).padEnd(22)} ${nok(r.spend).padStart(9)} · ${String(r.clicks).padStart(4)} klikk · CTR ${pct(r.ctr).padStart(7)} · CPC ${nok(r.cpc).padStart(8)} · leads ${l}`);
  }
}

console.log('\n══════════ META · MÅLGRUPPESTØRRELSE (er publikummet for lite?) ══════════');
const sets = await g(`${ACT}/adsets`, { fields: 'id,name,effective_status', limit: 50 });
for (const s of (sets.data || [])) {
  if (s.effective_status !== 'ACTIVE') continue;
  const est = await g(`${s.id}/delivery_estimate`, { fields: 'estimate_dau,estimate_mau_lower_bound,estimate_mau_upper_bound,estimate_ready' });
  if (est.error) { console.log(`· ${s.name}: (estimat utilgjengelig: ${est.error})`); continue; }
  const e = (est.data || [])[0] || {};
  console.log(`· ${s.name}: månedlig rekkevidde ${num(e.estimate_mau_lower_bound)}–${num(e.estimate_mau_upper_bound)} · daglig ${num(e.estimate_dau)} · klart ${e.estimate_ready}`);
}

console.log('\n══════════ META · LÆRINGSFASE OG FREKVENS PR. UKE ══════════');
const weekly = await g(`${ACT}/insights`, {
  time_range: TIME, time_increment: 7,
  fields: 'date_start,date_stop,spend,reach,frequency,impressions,clicks,actions',
  limit: 20,
});
for (const r of weekly.data || []) {
  console.log(`${r.date_start} → ${r.date_stop} · ${nok(r.spend).padStart(9)} · rekkevidde ${num(r.reach).padStart(7)} · frekvens ${Number(r.frequency || 0).toFixed(2)} · leads ${val(r, 'lead')}`);
}
console.log('\nMeta trenger ~50 optimaliseringshendelser pr. annonsesett pr. uke for å forlate læringsfasen.');
