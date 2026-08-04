// ANALYSE: fasit fra PRODUKSJON — hva ble annonsekronene faktisk til?
// Plattformtall (Meta/Google) er selvrapportering. Leadene i prod-basen er fasit.
//   node --import ./scripts/_alias-loader.mjs scripts/analyse-prod-funnel.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.ADMIN_KEY;
const PROD = 'https://digihome.no';

const get = async (path) => {
  const r = await fetch(`${PROD}${path}`, { signal: AbortSignal.timeout(40000) });
  let body = null; try { body = await r.json(); } catch (e) { body = null; }
  return { status: r.status, body };
};

console.log('══════════ PRODUKSJON: KPI-ENDEPUNKTET ══════════');
const kpi = await get(`/api/admin/kpi?key=${KEY}`);
if (kpi.status !== 200) console.log('status', kpi.status);
else {
  const k = kpi.body || {};
  console.log(`Periode: ${k.period?.label} (${k.period?.from?.slice(0, 10)} → ${k.period?.to?.slice(0, 10)})`);
  const show = (obj, prefix = '') => {
    for (const [key, v] of Object.entries(obj || {})) {
      if (v === null || v === undefined) continue;
      if (typeof v === 'object' && !Array.isArray(v)) show(v, `${prefix}${key}.`);
      else if (!Array.isArray(v)) console.log(`  ${prefix}${key}: ${v}`);
    }
  };
  for (const section of ['spend', 'leads', 'kunder', 'kpi', 'totals', 'summary', 'cards']) {
    if (k[section]) { console.log(`\n[${section}]`); show(k[section]); }
  }
  const rest = Object.keys(k).filter((x) => !['spend', 'leads', 'kunder', 'kpi', 'totals', 'summary', 'cards', 'period', 'ok', 'generatedAt'].includes(x));
  if (rest.length) console.log(`\nAndre nøkler i svaret: ${rest.join(', ')}`);
}

console.log('\n══════════ PRODUKSJON: LEADS SISTE 30/7 DAGER ══════════');
const leads = await get(`/api/admin/leads?key=${KEY}&limit=1000`);
if (leads.status !== 200) { console.log('status', leads.status); }
else {
  const all = leads.body?.leads || [];
  const now = Date.now();
  const days = (d) => (now - new Date(d).getTime()) / 86400000;
  const in30 = all.filter((l) => days(l.createdAt) <= 30);
  const in7 = all.filter((l) => days(l.createdAt) <= 7);
  console.log(`Totalt i basen: ${all.length} · siste 30 dager: ${in30.length} · siste 7 dager: ${in7.length}`);

  const group = (rows, fn) => {
    const m = new Map();
    for (const r of rows) { const k = fn(r) || '(ukjent)'; m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const src = (l) => {
    const a = l.attribution || {};
    const s = (a.source || l.source || '').toLowerCase();
    if (/google|adwords/.test(s)) return 'google';
    if (/meta|facebook|fb|instagram|ig/.test(s)) return 'meta';
    if (/direct|direkte|(^$)/.test(s)) return 'direkte/ukjent';
    return s;
  };

  console.log('\nKilde (siste 30 dager):');
  for (const [k, n] of group(in30, src)) console.log(`  ${String(k).padEnd(22)} ${n}`);
  console.log('\nType (siste 30 dager):');
  for (const [k, n] of group(in30, (l) => l.lead_type)) console.log(`  ${String(k).padEnd(22)} ${n}`);
  console.log('\nTjeneste/tier (siste 30 dager):');
  for (const [k, n] of group(in30, (l) => l.tier)) console.log(`  ${String(k).padEnd(22)} ${n}`);
  console.log('\nStatus (siste 30 dager):');
  for (const [k, n] of group(in30, (l) => l.status)) console.log(`  ${String(k).padEnd(22)} ${n}`);
  console.log('\nKampanje i attribusjon (siste 30 dager):');
  for (const [k, n] of group(in30, (l) => (l.attribution || {}).campaign)) console.log(`  ${String(k).slice(0, 40).padEnd(42)} ${n}`);
  console.log('\nLandingsside (siste 30 dager):');
  for (const [k, n] of group(in30, (l) => (l.attribution || {}).landing_page)) console.log(`  ${String(k).slice(0, 60).padEnd(62)} ${n}`);
  console.log('\nBetalt vs organisk (siste 30 dager):');
  for (const [k, n] of group(in30, (l) => (l.is_paid ? 'betalt' : 'ikke merket betalt'))) console.log(`  ${String(k).padEnd(22)} ${n}`);

  const perDay = new Map();
  for (const l of in30) { const d = String(l.createdAt).slice(0, 10); perDay.set(d, (perDay.get(d) || 0) + 1); }
  console.log('\nLeads pr. dag (siste 30 dager):');
  for (const d of [...perDay.keys()].sort()) console.log(`  ${d}  ${'█'.repeat(perDay.get(d))} ${perDay.get(d)}`);

  const selfService = in30.filter((l) => l.self_service);
  const won = in30.filter((l) => l.status === 'won');
  console.log(`\nSelvbetjente registreringer siste 30 dager: ${selfService.length}`);
  console.log(`Vunnet siste 30 dager: ${won.length}`);
  const biz = in30.filter((l) => l.owner_kind === 'business' || l.org_no);
  console.log(`Registrert som bedrift siste 30 dager: ${biz.length} (feltet er nytt — kun leads etter neste deploy vil ha det)`);
}
