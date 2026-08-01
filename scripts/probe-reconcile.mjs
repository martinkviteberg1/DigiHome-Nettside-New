// Read-only sanity-probe for /api/admin/revenue-reconcile.
// Kjør: node scripts/probe-reconcile.mjs [prod|test] [days]
import fs from 'fs';
function loadEnv(f) {
  for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
    const l = raw.trim(); if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('='); if (i < 0) continue;
    const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.split(' #')[0].trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv('/app/.env');
const ENV = (process.argv[2] || 'prod').toLowerCase();
const DAYS = Number(process.argv[3]) || 30;
const key = process.env.ADMIN_KEY || process.env.NEXT_PUBLIC_ADMIN_KEY || 'dh_admin_b3Kx92Qz7Lm4';
const url = `http://localhost:3000/api/admin/revenue-reconcile?key=${key}&env=${ENV}&days=${DAYS}`;
const t0 = Date.now();
const res = await fetch(url);
const j = await res.json();
console.log(`HTTP ${res.status} · ${Date.now() - t0} ms`);
if (!j.ok) { console.log('ok=false →', j.error, JSON.stringify(j.platform || {})); process.exit(0); }
console.log(`plattform: ${j.platform.host} (${j.platform.env}) · ${j.platform.rows} rader · ${j.platform.pages} sider · HTTP ${j.platform.httpStatus}`);
console.log(`regel: ${j.settings.ruleLabel} · levetid ${j.settings.lifetimeMonths} mnd\n`);
console.log('DOM:', j.verdict.headline);
console.log(`avvik: ${j.verdict.mismatchCount} tall · ${j.verdict.criticalCount} kritiske · datagap ${j.verdict.dataGapCount}\n`);
const pad = (s, n) => String(s ?? '—').padStart(n);
console.log('METRIKK'.padEnd(38) + pad('LOKALT', 14) + pad('PLATTFORM', 14) + pad('AVVIK', 12) + '  ');
for (const m of j.metrics) {
  console.log(`${(m.match ? 'OK  ' : 'AVVIK ')}${m.label.slice(0, 32).padEnd(32)}${pad(m.local, 14)}${pad(m.platform, 14)}${pad(m.delta, 12)} ${m.unit}`);
}
console.log('\nKONTRAKTER:', JSON.stringify(j.contracts.counts), JSON.stringify(j.contracts.feeImpact));
console.log(`lokalt ${j.contracts.localTotal} (fra plattform ${j.contracts.localFromPlatform}, manuelle ${j.contracts.localManual}) · plattform ${j.contracts.platformTotal}`);
for (const r of j.contracts.onlyInPlatform.slice(0, 10)) console.log(`  MANGLER LOKALT  ${r.contractId} ${r.type} ${r.status} ${r.fee} kr/mnd  ${r.owner} ${r.property}`);
for (const r of j.contracts.onlyLocal.slice(0, 10)) console.log(`  BARE LOKALT     ${r.contractId} ${r.type} ${r.status} ${r.fee} kr/mnd  ${r.owner} ${r.property}`);
for (const r of j.contracts.mismatched.slice(0, 10)) console.log(`  ULIKE FELT      ${r.contractId} Δ${r.feeDelta} kr/mnd  ${r.diffs.map((d) => `${d.label}: ${d.local} vs ${d.platform}`).join(' · ')}`);
if (j.spend) {
  console.log('\nANNONSER:', JSON.stringify({ total: j.spend.total, google: j.spend.google, meta: j.spend.meta, cpl: j.spend.cpl, cac: j.spend.cac, period: j.spend.period?.label }));
  for (const c of j.spend.checks || []) console.log(`  ${c.ok ? 'OK   ' : 'AVVIK'} ${c.label} — ${c.detail}`);
}
console.log('\nHANDLINGER:');
for (const a of j.verdict.actions) console.log('  •', a);
if (!j.verdict.actions.length) console.log('  (ingen)');
console.log('\nfinanceSync:', JSON.stringify(j.financeSync));
