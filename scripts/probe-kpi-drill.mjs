// Prøv drill-down-endepunktet for alle støttede nøkkeltall.
const KEY = process.env.ADMIN_KEY || 'dh_admin_b3Kx92Qz7Lm4';
const BASE = process.env.BASE || 'http://localhost:3000';

const METRICS = [
  'mrr_actual', 'mrr_contracted', 'mrr_potential', 'at_risk', 'ltv', 'ltv_cac', 'payback',
  'total_customers', 'activation', 'time_to_rent',
  'cac', 'new_customers', 'revenue', 'ttw', 'avg_value',
  'conv', 'cpl', 'new_leads', 'pipeline_value', 'tenant_demand',
];

for (const m of METRICS) {
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/admin/kpi/drill?key=${KEY}&metric=${m}&days=90`);
  const j = await res.json().catch(() => ({}));
  const g = j.groups || [];
  const rows = g.reduce((s, x) => s + (x.rows || []).length, 0);
  console.log(
    String(m).padEnd(18),
    res.status,
    'kind=' + (j.kind || '-').padEnd(20),
    'grupper=' + String(g.length).padStart(3),
    'rader=' + String(rows).padStart(3),
    'sum=' + (j.totals?.amount ?? '-'),
    (j.unitCoverage ? `enhetstreff=${j.unitCoverage.matched}/${j.unitCoverage.rows} tvetydig=${j.unitCoverage.ambiguous} portefølje=${j.unitCoverage.portfolioUnits}` : ''),
    (j.unmatchedUnitsTotal != null ? `ukoblede=${j.unmatchedUnitsTotal}` : ''),
    `${Date.now() - t0}ms`,
    j.error ? 'FEIL: ' + j.error : ''
  );
  if (m === 'mrr_actual' || m === 'cac') {
    console.log('   TITTEL:', j.title);
    console.log('   FØRSTE GRUPPE:', JSON.stringify(g[0], null, 1)?.slice(0, 1800));
  }
}

// Feilhåndtering
const bad = await fetch(`${BASE}/api/admin/kpi/drill?key=${KEY}&metric=finnes_ikke`);
console.log('ukjent metric →', bad.status, JSON.stringify(await bad.json()).slice(0, 120));
const noauth = await fetch(`${BASE}/api/admin/kpi/drill?metric=mrr_actual`);
console.log('uten nøkkel →', noauth.status);
