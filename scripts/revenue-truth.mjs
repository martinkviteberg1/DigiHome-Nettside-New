// ---------------------------------------------------------------------------
// Read-only: hva er DigiHomes FAKTISKE honorar-MRR akkurat nå?
// Speiler logikken i lib/revenue-model.js, men kjører direkte mot
// plattformens /api/contracts/export (prod eller test). Skriver INGENTING.
//
// Kjør:  node scripts/revenue-truth.mjs [prod|test] [signed_started|signed|pending] [levetidMnd]
// ---------------------------------------------------------------------------
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
const RULE = process.argv[3] || 'signed_started';
const MONTHS = Number(process.argv[4]) || 36;
const target = (ENV === 'prod' ? (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no') : (process.env.DIGIHOME_API_URL_TEST || '')).replace(/\/+$/, '');
const key = ENV === 'prod' ? (process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY) : (process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY);

const res = await fetch(`${target}/api/contracts/export?status=all&limit=500`, { headers: { 'X-API-Key': key } });
const payload = await res.json();
const rows = payload.contracts || [];

const n = (x) => Number(x) || 0;
const r2 = (x) => Math.round(n(x) * 100) / 100;
const nok = (x) => Math.round(n(x)).toLocaleString('nb-NO');
const now = Date.now();
const ts = (v) => (v ? Date.parse(v) : NaN);
const SIGNED = ['signed', 'active', 'aktiv', 'signert', 'løpende', ''];
const TERM = ['terminated', 'expired', 'cancelled', 'kansellert', 'avsluttet'];

// normaliser som lib/contracts-sync.js
const norm = rows.map((row) => ({
  id: row.contract_id,
  type: row.type === 'forvaltningsavtale' ? 'forvaltningsavtale' : 'leiekontrakt',
  propertyId: row.property?.id || null,
  propertyAddress: row.property?.address || '',
  ownerId: row.owner?.id || null,
  ownerName: row.owner?.name || '',
  tenantName: row.tenant?.name || '',
  monthlyRent: row.monthly_rent != null ? Number(row.monthly_rent) : null,
  estimatedMonthlyRent: row.estimated_monthly_rent != null ? Number(row.estimated_monthly_rent) : null,
  feePercent: row.fee_percent != null ? Math.round(Number(row.fee_percent) * 100 * 100) / 100 : null,
  status: (row.status || 'active').toString(),
  startDate: (row.start_date || '').slice(0, 10) || null,
  endDate: (row.end_date || '').slice(0, 10) || null,
}));

// dedupe duplikate leiekontrakter (samme bolig+leietaker+start)
const RANK = { signed: 3, active: 3, pending: 2, draft: 1 };
const best = new Map(); const deduped = [];
let dupes = 0;
for (const c of norm) {
  if (c.type !== 'leiekontrakt') { deduped.push(c); continue; }
  const k = `${c.propertyId || c.propertyAddress}|${c.tenantName.toLowerCase()}|${c.startDate}`;
  const rank = RANK[c.status.toLowerCase()] ?? 0;
  if (best.has(k)) dupes++;
  const prev = best.get(k);
  if (!prev || rank > prev.rank) best.set(k, { rank, c });
}
for (const { c } of best.values()) deduped.push(c);

const live = deduped.filter((c) => !TERM.includes(c.status.toLowerCase()));
const fee = (c, rent) => r2(n(rent) * (n(c.feePercent) / 100));

const actual = [], contracted = [], expiring = [];
const propsWithLease = new Set();
for (const c of live.filter((x) => x.type === 'leiekontrakt')) {
  const f = fee(c, c.monthlyRent);
  const st = c.status.toLowerCase();
  const signed = SIGNED.includes(st);
  const start = ts(c.startDate), end = ts(c.endDate);
  const started = !isFinite(start) || start <= now;
  const ongoing = !isFinite(end) || end >= now;
  if (c.propertyId && ongoing) propsWithLease.add(c.propertyId);
  if (!f || !ongoing) continue;
  const isActual = RULE === 'pending' ? started : (RULE === 'signed' ? signed : (signed && started));
  const row = { ...c, fee: f };
  if (isActual && started) { actual.push(row); if (isFinite(end) && end - now <= 90 * 86400000) expiring.push(row); }
  else contracted.push(row);
}
const potential = [];
for (const c of live.filter((x) => x.type !== 'leiekontrakt')) {
  if (c.propertyId && propsWithLease.has(c.propertyId)) continue;
  const f = fee(c, c.estimatedMonthlyRent != null ? c.estimatedMonthlyRent : c.monthlyRent);
  potential.push({ ...c, fee: f });
}
const sum = (a) => r2(a.reduce((s, x) => s + x.fee, 0));
const oKey = (c) => c.ownerId || c.ownerName.toLowerCase();
const earning = new Set(actual.map(oKey).filter(Boolean));
const mgmtOwners = new Set(live.filter((c) => c.type !== 'leiekontrakt').map(oKey).filter(Boolean));

console.log(`\n=== INNTEKTSKVALITET (${ENV}) · regel: ${RULE} · levetid ${MONTHS} mnd · ${new Date().toISOString().slice(0, 10)} ===`);
console.log(`Kontrakter: ${rows.length} rå · ${deduped.length} etter dedupe (${dupes} duplikat${dupes === 1 ? '' : 'er'} fjernet)\n`);
const show = (t, arr) => {
  console.log(`--- ${t}: ${nok(sum(arr))} kr/mnd (${arr.length}) ---`);
  for (const x of arr.sort((a, b) => b.fee - a.fee)) console.log(`    ${nok(x.fee).padStart(6)} kr  ${x.status.padEnd(8)} start=${x.startDate} slutt=${x.endDate || 'løpende'}  ${(x.ownerName || '?').slice(0, 26).padEnd(26)} ${x.propertyAddress.slice(0, 34)}`);
};
show('FAKTISK (signert + startet)', actual);
show('KONTRAHERT (inngått, ikke startet / ikke ferdig signert)', contracted);
show('POTENSIAL (forvaltningsavtale uten leiekontrakt)', potential);

const mrrA = sum(actual), mrrC = sum(contracted), mrrP = sum(potential);
const totalPipe = r2(mrrA + mrrC + mrrP);
const feePer = earning.size ? r2(mrrA / earning.size) : null;
console.log(`\n=== OPPSUMMERING ===`);
console.log(`  FAKTISK MRR:        ${nok(mrrA).padStart(9)} kr/mnd   (ARR ${nok(mrrA * 12)} kr)`);
console.log(`  KONTRAHERT MRR:     ${nok(mrrC).padStart(9)} kr/mnd`);
console.log(`  POTENSIAL MRR:      ${nok(mrrP).padStart(9)} kr/mnd`);
console.log(`  Sum pipeline:       ${nok(totalPipe).padStart(9)} kr/mnd`);
console.log(`  Inntektskvalitet:   ${totalPipe > 0 ? Math.round((mrrA / totalPipe) * 100) : 0} % faktisk`);
console.log(`  MRR i faresonen 90d:${nok(sum(expiring)).padStart(9)} kr/mnd`);
console.log(`  Kunder med leieinntekt: ${earning.size} av ${mgmtOwners.size} forvaltningskunder → aktiveringsrate ${mgmtOwners.size ? Math.round((earning.size / mgmtOwners.size) * 100) : 0} %`);
console.log(`  Honorar per inntektsgivende kunde: ${feePer != null ? nok(feePer) + ' kr/mnd' : '—'}`);
console.log(`  LTV (${MONTHS} mnd, omsetning): ${feePer != null ? nok(feePer * MONTHS) + ' kr' : '—'}`);
for (const m of [24, 36, 48]) console.log(`    ${m} mnd → ${feePer != null ? nok(feePer * m) + ' kr' : '—'}`);
console.log('');

// Framoverskuende: inkluderer kontraherte leiekontrakter
const anyLease = new Set([...actual, ...contracted].map(oKey).filter(Boolean));
const feeFwd = anyLease.size ? r2((mrrA + mrrC) / anyLease.size) : null;
console.log(`  [framoverskuende] kunder med leiekontrakt (faktisk+kontrahert): ${anyLease.size}`);
console.log(`  [framoverskuende] honorar per kunde: ${feeFwd != null ? nok(feeFwd) + ' kr/mnd' : '—'}  → LTV ${MONTHS} mnd = ${feeFwd != null ? nok(feeFwd * MONTHS) + ' kr' : '—'}`);
