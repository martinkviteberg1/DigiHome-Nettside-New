// OVERVÅKING — hva gjorde endringene 05.08.2026?
//   node scripts/monitor-ads-effect.mjs
//
// Sammenligner samme antall dager FØR og ETTER endringsdatoen, for begge
// plattformer, mot CRM-fasit. Kjør denne én gang i uken.
//
// LES DETTE FØRST: både Googles budstrategi-bytte og Metas geo-utvidelse
// nullstiller læringsfasen. De første 7–14 dagene er ustabile med vilje.
// Ikke konkluder — og ikke gjør nye endringer — før vinduet er minst 14 dager.
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CHANGE_DATE = '2026-08-05';
const KEY = process.env.ADMIN_KEY;
const V = process.env.META_API_VERSION || 'v21.0';
const TOKEN = process.env.META_SYSTEM_USER_TOKEN;
const RAW = String(process.env.META_AD_ACCOUNT_ID || '').trim();
const ACT = RAW.startsWith('act_') ? RAW : `act_${RAW}`;

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(`${s}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return iso(d); };

const today = iso(new Date());
const daysSince = Math.round((new Date(`${today}T12:00:00Z`) - new Date(`${CHANGE_DATE}T12:00:00Z`)) / 86400000);

// Etter: fra dagen ETTER endringen (endringsdagen selv er en halv dag med to
// ulike innstillinger — den hører ikke hjemme i noen av vinduene) til i går
// (i dag er ufullstendig, og Googles kostnadstall henger opptil 3 timer).
const afterFrom = addDays(CHANGE_DATE, 1);
const afterTo = addDays(today, -1);
const dA = Math.round((new Date(`${afterTo}T12:00:00Z`) - new Date(`${afterFrom}T12:00:00Z`)) / 86400000) + 1;

// Er det ikke gått en hel dag ennå, finnes det ingenting å sammenligne. Da skal
// vi si det — ikke regne på et omvendt datointervall og rapportere «-100 %».
if (dA < 1) {
  console.log('═'.repeat(64));
  console.log(`Endringene ble gjort ${CHANGE_DATE}. Det finnes ennå ingen hel dag etter dem.`);
  console.log(`Kom tilbake ${addDays(CHANGE_DATE, 2)} for første sammenligning,`);
  console.log(`og ${addDays(CHANGE_DATE, 15)} for en konklusjon (læringsfasen er 7–14 dager).`);
  console.log('═'.repeat(64));
  process.exit(0);
}

// Før: fast 14-dagers grunnlinje rett før endringen. Fast lengde gjør at
// grunnlinjen ikke flytter seg hver gang vi kjører skriptet. Alt normaliseres
// pr. dag, så ulik vinduslengde er uproblematisk.
const dB = 14;
const beforeTo = addDays(CHANGE_DATE, -1);
const beforeFrom = addDays(beforeTo, -(dB - 1));

console.log('═'.repeat(64));
console.log(`EFFEKT AV ENDRINGENE ${CHANGE_DATE}`);
console.log(`  FØR:   ${beforeFrom} → ${beforeTo}`);
console.log(`  ETTER: ${afterFrom} → ${afterTo}  (${dA} hele ${dA === 1 ? 'dag' : 'dager'})`);
if (dA < 14) {
  console.log(`\n  ⚠ Bare ${dA} ${dA === 1 ? 'dag' : 'dager'} etter endringen. Læringsfasen er 7–14 dager.`);
  console.log('    Tallene under er retningsgivende, IKKE en konklusjon.');
  console.log('    Ved ~10 klikk/dag svinger daglige tall kraftig av seg selv.');
}
console.log('═'.repeat(64));

const nok = (v) => `${Math.round(Number(v || 0)).toLocaleString('nb-NO')} kr`;
const delta = (a, b) => {
  if (!b) return '–';
  const p = ((a - b) / b) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(0)} %`;
};

// ── GOOGLE ────────────────────────────────────────────────────────────────
const g = await import('/app/lib/google-ads-native.js');
const CID = g.defaultCustomerId();
const gStats = async (from, to) => {
  const rows = await g.gaqlSearch(CID, `SELECT metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions FROM customer WHERE segments.date BETWEEN '${from}' AND '${to}'`);
  const o = { cost: 0, clicks: 0, impr: 0, conv: 0 };
  for (const r of rows) {
    const m = r.metrics || {};
    o.cost += Number(m.costMicros || 0) / 1e6; o.clicks += Number(m.clicks || 0);
    o.impr += Number(m.impressions || 0); o.conv += Number(m.conversions || 0);
  }
  return o;
};
const gB = await gStats(beforeFrom, beforeTo);
const gA = await gStats(afterFrom, afterTo);
const perDay = (v, d) => v / Math.max(1, d);

console.log('\n── GOOGLE ADS (pr. dag, for å tåle ulike vinduslengder) ──');
console.log(`  Forbruk:      ${nok(perDay(gB.cost, dB))}/dag → ${nok(perDay(gA.cost, dA))}/dag  ${delta(perDay(gA.cost, dA), perDay(gB.cost, dB))}`);
console.log(`  Klikk:        ${perDay(gB.clicks, dB).toFixed(1)}/dag → ${perDay(gA.clicks, dA).toFixed(1)}/dag  ${delta(perDay(gA.clicks, dA), perDay(gB.clicks, dB))}`);
console.log(`  CPC:          ${nok(gB.clicks ? gB.cost / gB.clicks : 0)} → ${nok(gA.clicks ? gA.cost / gA.clicks : 0)}`);
console.log(`  Konv:         ${perDay(gB.conv, dB).toFixed(2)}/dag → ${perDay(gA.conv, dA).toFixed(2)}/dag  ${delta(perDay(gA.conv, dA), perDay(gB.conv, dB))}`);
console.log(`  CPA:          ${gB.conv ? nok(gB.cost / gB.conv) : '–'} → ${gA.conv ? nok(gA.cost / gA.conv) : '–'}`);
console.log('  ↑ Budstrategi: Maksimer klikk → Maksimer konverteringer (portefølje).');
console.log('    Forvent HØYERE CPC og FÆRRE klikk. Det er meningen — vi kjøper');
console.log('    ikke klikk lenger. Se på CPA, ikke CPC.');

// ── META ──────────────────────────────────────────────────────────────────
const mStats = async (from, to) => {
  const u = new URL(`https://graph.facebook.com/${V}/${ACT}/insights`);
  u.searchParams.set('time_range', JSON.stringify({ since: from, until: to }));
  u.searchParams.set('fields', 'spend,impressions,clicks,inline_link_clicks,reach,frequency,cpm,actions');
  u.searchParams.set('access_token', TOKEN);
  const r = await fetch(u, { signal: AbortSignal.timeout(45000) });
  const j = await r.json().catch(() => ({}));
  const row = (j.data || [])[0] || {};
  const lead = Number((row.actions || []).find((a) => a.action_type === 'lead')?.value || 0);
  return {
    spend: Number(row.spend || 0), clicks: Number(row.inline_link_clicks || 0),
    impr: Number(row.impressions || 0), reach: Number(row.reach || 0),
    freq: Number(row.frequency || 0), cpm: Number(row.cpm || 0), leads: lead,
  };
};
const mB = await mStats(beforeFrom, beforeTo);
const mA = await mStats(afterFrom, afterTo);

console.log('\n── META (pr. dag) ──');
console.log(`  Forbruk:      ${nok(perDay(mB.spend, dB))}/dag → ${nok(perDay(mA.spend, dA))}/dag`);
console.log(`  Lenkeklikk:   ${perDay(mB.clicks, dB).toFixed(1)}/dag → ${perDay(mA.clicks, dA).toFixed(1)}/dag  ${delta(perDay(mA.clicks, dA), perDay(mB.clicks, dB))}`);
console.log(`  CPM:          ${nok(mB.cpm)} → ${nok(mA.cpm)}  ${delta(mA.cpm, mB.cpm)}`);
console.log(`  Frekvens:     ${mB.freq.toFixed(2)} → ${mA.freq.toFixed(2)}  ${delta(mA.freq, mB.freq)}`);
console.log(`  Leads ('lead'): ${mB.leads} → ${mA.leads}`);
console.log(`  CPL:          ${mB.leads ? nok(mB.spend / mB.leads) : '–'} → ${mA.leads ? nok(mA.spend / mA.leads) : '–'}`);
console.log('  ↑ Geo utvidet fra nabolaget Bergenhus til Bergen + 25 km (7,3× publikum).');
console.log('    LAVERE CPM og LAVERE frekvens er beviset på at det virket.');

// ── CRM-FASIT ─────────────────────────────────────────────────────────────
console.log('\n── CRM (fasit — det eneste som betyr noe til slutt) ──');
try {
  const r = await fetch(`https://digihome.no/api/admin/leads?key=${KEY}&limit=1000`, { signal: AbortSignal.timeout(60000) });
  const all = (await r.json())?.leads || [];
  const chan = (l) => {
    const a = l.attribution || {};
    const s = `${a.source || l.source || ''} ${a.medium || ''}`.toLowerCase();
    if (a.gclid || /google|adwords/.test(s)) return 'google';
    if (a.fbclid || /meta|facebook|instagram/.test(s)) return 'meta';
    if (/phone|telefon/.test(s)) return 'telefon';
    return 'annet';
  };
  const inWin = (l, from, to) => {
    const d = String(l.createdAt || '').slice(0, 10);
    return d >= from && d <= to && l.lead_type === 'huseier';
  };
  for (const [label, from, to, days] of [['FØR ', beforeFrom, beforeTo, dB], ['ETTER', afterFrom, afterTo, dA]]) {
    const rows = all.filter((l) => inWin(l, from, to));
    const byChan = {};
    for (const l of rows) { const c = chan(l); byChan[c] = (byChan[c] || 0) + 1; }
    const won = rows.filter((l) => l.status === 'won').length;
    const calls = byChan.telefon || 0;
    console.log(`  ${label}: ${rows.length} huseierleads (${(rows.length / days).toFixed(2)}/dag) · google ${byChan.google || 0} · meta ${byChan.meta || 0} · telefon ${calls} · vunnet ${won}`);
  }
} catch (e) {
  console.log(`  (kunne ikke hente CRM: ${String(e.message).slice(0, 90)})`);
}

console.log('\n── RINGEKLIKK (virker først etter deploy) ──');
try {
  const r = await fetch(`https://digihome.no/api/admin/analytics?days=${Math.max(7, dA)}&key=${KEY}`, { signal: AbortSignal.timeout(90000) });
  const a = await r.json();
  const rows = a?.paid?.channels || a?.paid?.rows || [];
  const arr = Array.isArray(rows) ? rows : Object.values(rows || {});
  let any = false;
  for (const c of arr) {
    if (!c || !c.sessions) continue;
    any = true;
    console.log(`  ${String(c.label || c.key).padEnd(10)} økter ${String(c.sessions).padStart(4)} · ringeklikk ${String(c.calls ?? '–').padStart(3)} · leads ${String(c.leads).padStart(3)} · henvendelser ${c.contacts ?? '–'} · kost/henv ${c.costPerContact != null ? nok(c.costPerContact) : '–'} · samtykke ${c.consentRate != null ? c.consentRate + ' %' : '–'}`);
  }
  if (!any) console.log('  (ingen data ennå)');
  console.log('\n  Er «ringeklikk» tomt og «samtykke» viser «–», er koden ikke deployet ennå.');
} catch (e) {
  console.log(`  (kunne ikke hente: ${String(e.message).slice(0, 90)})`);
}

console.log(`\n${'═'.repeat(64)}`);
console.log('RULLEBAKK om noe ser galt ut:');
console.log('  Google budstrategi → Maksimer klikk i grensesnittet, eller');
console.log('    node scripts/apply-google-optim.mjs (les rullebakk-avsnittet)');
console.log('  Meta geo → sett neighborhoods tilbake til Bergenhus på annonsesettet');
console.log('  Konverteringsverdi → node scripts/after-deploy-google-value.mjs --rollback');
