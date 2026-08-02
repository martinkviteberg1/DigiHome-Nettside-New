// Read-only: /api/units/export ga HTTP 401 (finnes, men avvist). Hvilken auth trengs?
// Kjør: node scripts/probe-units-auth.mjs
import fs from 'fs';
function loadEnv(f) {
  if (!fs.existsSync(f)) return;
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
const target = (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no').replace(/\/+$/, '');
const key = process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY;
const bridge = process.env.AGENT_BRIDGE_SECRET || '';

const variants = [
  ['X-API-Key', { 'X-API-Key': key }],
  ['Authorization Bearer', { Authorization: `Bearer ${key}` }],
  ['x-api-key + bridge', { 'X-API-Key': key, 'X-Agent-Secret': bridge }],
  ['ingen auth', {}],
];
for (const [label, headers] of variants) {
  const url = `${target}/api/units/export?limit=3`;
  const res = await fetch(url, { headers });
  const txt = await res.text();
  console.log(`\n[${label}] HTTP ${res.status} :: ${txt.slice(0, 300)}`);
}

console.log('\n\n=== Andre kandidater (rute finnes = 401/403/200, finnes ikke = 404) ===');
const paths = [
  '/api/units?limit=3',
  '/api/units/list?limit=3',
  '/api/properties/export?status=all&limit=1',
  '/api/buildings/export?limit=3',
  '/api/listings/export?limit=3',
  '/api/contracts/export?limit=1',
  '/api/tenants/export?limit=1',
  '/api/crm/customers/export?limit=1',
  '/api/agent/inbox',
  '/api/agent/messages',
];
for (const p of paths) {
  try {
    const res = await fetch(`${target}${p}`, { headers: { 'X-API-Key': key, 'X-Agent-Secret': bridge } });
    const txt = await res.text();
    let j = null; try { j = JSON.parse(txt); } catch {}
    const arr = j?.units || j?.properties || j?.data || j?.contracts || j?.tenants || j?.customers || j?.messages || [];
    console.log(`${String(res.status).padEnd(4)} ${p.padEnd(46)} rader=${Array.isArray(arr) ? arr.length : '—'} total=${j?.total ?? '—'} ${j ? '' : txt.slice(0, 90)}`);
  } catch (e) {
    console.log(`ERR  ${p} :: ${e.message}`);
  }
}
