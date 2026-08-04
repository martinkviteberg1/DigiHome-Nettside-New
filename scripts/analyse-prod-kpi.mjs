// ANALYSE: produksjonens EGNE KPI-tall (det tallet DigiHome styrer etter),
// inkludert kanalfordeling og datakvalitet. Forrige script hoppet over arrays,
// og det er nettopp arrayene (channels, funnel) som forteller historien.
//   node scripts/analyse-prod-kpi.mjs
import fs from 'fs';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const KEY = process.env.ADMIN_KEY;
const PROD = 'https://digihome.no';

const get = async (path) => {
  const r = await fetch(`${PROD}${path}`, { signal: AbortSignal.timeout(60000) });
  let body = null; try { body = await r.json(); } catch (e) { body = null; }
  return { status: r.status, body };
};

const kpi = await get(`/api/admin/kpi?key=${KEY}`);
if (kpi.status !== 200) { console.log('KPI status', kpi.status); process.exit(1); }
const k = kpi.body || {};
console.log(`Periode: ${k.period?.label} (${k.period?.from?.slice(0, 10)} → ${k.period?.to?.slice(0, 10)})`);

const j = (v) => JSON.stringify(v, null, 2);
for (const key of ['northStar', 'hero', 'metrics', 'funnel', 'channels', 'runRate', 'momentum', 'pipelineValue', 'revenueModel', 'ltvModel', 'dataQuality', 'platform', 'financeSync']) {
  if (k[key] === undefined) continue;
  console.log(`\n══════════ ${key.toUpperCase()} ══════════`);
  console.log(j(k[key]).slice(0, 4000));
}
