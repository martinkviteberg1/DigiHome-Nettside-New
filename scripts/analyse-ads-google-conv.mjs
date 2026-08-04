// ANALYSE 2 (Google): hva TELLES som konvertering, og hva er den verdt?
// Forrige forsøk feilet fordi segments.conversion_action_name ikke kan hentes
// sammen med kostnadsmetrikker. Løsningen er å splitte i to spørringer:
// kostnad pr. kampanje (uten segment) og konverteringer pr. handling (uten kostnad).
//   node scripts/analyse-ads-google-conv.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const { gaqlSearch, defaultCustomerId } = await import('/app/lib/google-ads-native.js');
const CID = defaultCustomerId();
const nok = (micros) => `${Math.round(Number(micros || 0) / 1e6).toLocaleString('nb-NO')} kr`;

const q = async (label, gaql) => {
  try { return (await gaqlSearch(CID, gaql)) || []; } catch (e) {
    console.log(`  (${label} feilet: ${String(e.message || e).slice(0, 260)})`);
    return [];
  }
};

console.log('══════════ KONVERTERINGSHANDLINGER: INNSTILLINGER ══════════');
// Vi prøver det rike feltsettet først; faller tilbake til et minimum hvis API-versjonen
// ikke kjenner et felt. Bedre med delvis svar enn ingen svar.
let actions = await q('handlinger (rikt)', `
  SELECT conversion_action.id, conversion_action.name, conversion_action.status,
         conversion_action.type, conversion_action.category,
         conversion_action.primary_for_goal, conversion_action.counting_type,
         conversion_action.include_in_conversions_metric,
         conversion_action.click_through_lookback_window_days,
         conversion_action.view_through_lookback_window_days,
         conversion_action.value_settings.default_value,
         conversion_action.value_settings.always_use_default_value,
         conversion_action.attribution_model_settings.attribution_model
  FROM conversion_action`);
if (!actions.length) {
  actions = await q('handlinger (minimum)', `
    SELECT conversion_action.id, conversion_action.name, conversion_action.status,
           conversion_action.type, conversion_action.category,
           conversion_action.primary_for_goal, conversion_action.counting_type,
           conversion_action.value_settings.default_value
    FROM conversion_action`);
}
for (const r of actions) {
  const a = r.conversionAction || {};
  const vs = a.valueSettings || {};
  const am = a.attributionModelSettings || {};
  console.log(`\n· ${a.name} (${a.id})`);
  console.log(`  status ${a.status} · type ${a.type} · kategori ${a.category}`);
  console.log(`  primær for mål: ${a.primaryForGoal === undefined ? '(ikke oppgitt)' : a.primaryForGoal} · telling: ${a.countingType || '-'} · med i "konverteringer": ${a.includeInConversionsMetric === undefined ? '(ikke oppgitt)' : a.includeInConversionsMetric}`);
  console.log(`  standardverdi: ${vs.defaultValue ?? '-'} · alltid bruk standardverdi: ${vs.alwaysUseDefaultValue ?? '-'}`);
  console.log(`  attribusjon: ${am.attributionModel || '-'} · klikkvindu ${a.clickThroughLookbackWindowDays ?? '-'} d · visningsvindu ${a.viewThroughLookbackWindowDays ?? '-'} d`);
}

for (const range of ['LAST_30_DAYS', 'LAST_7_DAYS']) {
  console.log(`\n══════════ KONVERTERINGER PR. HANDLING · ${range} ══════════`);
  const rows = await q('konv pr handling', `
    SELECT campaign.name, segments.conversion_action_name, segments.conversion_action_category,
           metrics.conversions, metrics.all_conversions, metrics.conversions_value
    FROM campaign
    WHERE segments.date DURING ${range}
    ORDER BY metrics.conversions DESC`);
  if (!rows.length) { console.log('Ingen konverteringsrader.'); continue; }
  const agg = new Map();
  for (const r of rows) {
    const key = `${r.segments?.conversionActionName} | ${r.segments?.conversionActionCategory} | ${r.campaign?.name}`;
    const cur = agg.get(key) || { conv: 0, all: 0, val: 0 };
    cur.conv += Number(r.metrics?.conversions || 0);
    cur.all += Number(r.metrics?.allConversions || 0);
    cur.val += Number(r.metrics?.conversionsValue || 0);
    agg.set(key, cur);
  }
  let sum = 0;
  for (const [k, v] of [...agg.entries()].sort((a, b) => b[1].conv - a[1].conv)) {
    sum += v.conv;
    console.log(`· ${v.conv.toFixed(1).padStart(6)} konv (alle ${v.all.toFixed(1)}) · verdi ${v.val.toFixed(0)} · ${k}`);
  }
  console.log(`SUM konverteringer som teller i budgivning: ${sum.toFixed(1)}`);
}

console.log('\n══════════ KAMPANJEMÅL (hvilke handlinger styrer budgivningen?) ══════════');
const goals = await q('kampanjemål', `
  SELECT campaign.name, campaign_conversion_goal.category, campaign_conversion_goal.origin, campaign_conversion_goal.biddable
  FROM campaign_conversion_goal`);
for (const r of goals) {
  const g = r.campaignConversionGoal || {};
  if (g.biddable === false) continue;
  console.log(`· ${r.campaign?.name} → ${g.category} (${g.origin}) · brukes i budgivning: ${g.biddable}`);
}
if (!goals.length) console.log('(ingen kampanjemål returnert)');

console.log('\n══════════ KONVERTERINGSFORSINKELSE / DATOFORDELING · LAST_30_DAYS ══════════');
const daily = await q('daglig', `
  SELECT segments.date, metrics.cost_micros, metrics.clicks, metrics.conversions
  FROM customer
  WHERE segments.date DURING LAST_30_DAYS
  ORDER BY segments.date`);
let c = 0; let k = 0; let n = 0;
for (const r of daily) {
  const m = r.metrics || {};
  c += Number(m.costMicros || 0); k += Number(m.clicks || 0); n += Number(m.conversions || 0);
  console.log(`${r.segments?.date} · ${nok(m.costMicros).padStart(9)} · ${String(m.clicks || 0).padStart(3)} klikk · ${Number(m.conversions || 0).toFixed(1)} konv`);
}
console.log(`\nSUM 30 dager: ${nok(c)} · ${k} klikk · ${n.toFixed(1)} konv · CPA ${n ? nok(c / n) : '-'}`);

console.log('\n══════════ NEGATIVE SØKEORD (kampanjenivå) ══════════');
const negs = await q('negative', `
  SELECT campaign.name, campaign_criterion.keyword.text, campaign_criterion.keyword.match_type
  FROM campaign_criterion
  WHERE campaign_criterion.negative = true AND campaign_criterion.type = 'KEYWORD'`);
if (!negs.length) console.log('INGEN negative søkeord på kampanjenivå.');
for (const r of negs) console.log(`· ${r.campaign?.name} :: ${r.campaignCriterion?.keyword?.matchType} "${r.campaignCriterion?.keyword?.text}"`);

console.log('\n══════════ NEGATIVE SØKEORDSLISTER ══════════');
const lists = await q('lister', 'SELECT shared_set.id, shared_set.name, shared_set.type, shared_set.status FROM shared_set');
if (!lists.length) console.log('Ingen delte lister.');
for (const r of lists) console.log(`· ${r.sharedSet?.name} (${r.sharedSet?.type}) ${r.sharedSet?.status}`);
