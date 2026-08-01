// Read-only: hva returnerer plattformens /api/properties/export egentlig?
// Kjør: node scripts/probe-properties-export.mjs [prod|test]
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
const target = (ENV === 'prod' ? (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no') : (process.env.DIGIHOME_API_URL_TEST || '')).replace(/\/+$/, '');
const key = ENV === 'prod' ? (process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY) : (process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY);

const url = `${target}/api/properties/export?status=all&limit=200&offset=0`;
const res = await fetch(url, { headers: { 'X-API-Key': key } });
console.log(`GET ${url}\nHTTP ${res.status}`);
const j = await res.json().catch(() => null);
if (!j) { console.log('ikke JSON'); process.exit(0); }
const rows = j.properties || [];
console.log(`ok=${j.ok} count=${j.count} total=${j.total} nextOffset=${j.nextOffset} rader=${rows.length}\n`);
if (rows.length) {
  console.log('ALLE FELT I FØRSTE RAD:', JSON.stringify(rows[0], null, 2));
  const keys = new Set(); for (const r of rows) Object.keys(r).forEach((k) => keys.add(k));
  console.log('\nUNION AV FELT:', [...keys].sort().join(', '));
  const hasDistrict = rows.filter((r) => r.district).length;
  console.log(`\ndistrict satt på ${hasDistrict} av ${rows.length} boliger`);
  console.log('\nAREA / CITY / DISTRICT / POSTNR per bolig:');
  for (const r of rows) {
    console.log(`  status=${String(r.status).padEnd(7)} area=${String(r.area || '—').slice(0, 30).padEnd(30)} city=${String(r.city || '—').padEnd(14)} district=${String(r.district || '—').padEnd(14)} zip=${r.postalCode || r.zip || r.postal_code || '—'}  ${r.title || ''}`);
  }
}
