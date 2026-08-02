// Read-only: finnes det et ENHETS-nivå (units) eksportendepunkt på plattformen?
// Sammenligner også dagens /api/properties/export-rader mot brukerens "Enheter"-visning (22 enheter).
// Kjør: node scripts/probe-units-export.mjs
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

const candidates = [
  '/api/units/export?limit=200',
  '/api/properties/units/export?limit=200',
  '/api/crm/units/export?limit=200',
  '/api/integrations/units/export?limit=200',
  '/api/properties/export?status=all&limit=200&view=enheter',
  '/api/properties/export?status=all&limit=200&level=unit',
  '/api/properties/export?status=all&limit=200&include=units',
  '/api/properties/export?status=all&limit=200&verbose=1',
  '/api/properties/export?status=all&limit=200&fields=all',
];

for (const path of candidates) {
  const url = `${target}${path}`;
  try {
    const res = await fetch(url, { headers: { 'X-API-Key': key } });
    const txt = await res.text();
    let j = null; try { j = JSON.parse(txt); } catch {}
    const rows = j?.properties || j?.units || j?.data || [];
    const keys = new Set();
    for (const r of rows) Object.keys(r || {}).forEach((k) => keys.add(k));
    console.log(`\n=== ${path}\nHTTP ${res.status}  rader=${Array.isArray(rows) ? rows.length : 'n/a'} total=${j?.total ?? '—'}`);
    if (keys.size) console.log(`   felt: ${[...keys].sort().join(', ')}`);
    if (!j) console.log(`   body: ${txt.slice(0, 200)}`);
  } catch (e) {
    console.log(`\n=== ${path}\nFEIL: ${e.message}`);
  }
}

// Full dump av dagens eksport for sammenligning
const url = `${target}/api/properties/export?status=all&limit=200&offset=0`;
const res = await fetch(url, { headers: { 'X-API-Key': key } });
const j = await res.json().catch(() => null);
const rows = j?.properties || [];
console.log(`\n\n########## DAGENS EKSPORT: ${rows.length} rader (total=${j?.total}) ##########`);
rows.forEach((r, i) => {
  console.log(
    `${String(i + 1).padStart(2)} id=${String(r.id).slice(0, 8)} ` +
    `title="${String(r.title || '').slice(0, 34).padEnd(34)}" ` +
    `type=${String(r.type || '—').padEnd(10)} model=${String(r.model || '—').padEnd(9)} ` +
    `status=${String(r.status || '—').padEnd(8)} sqm=${String(r.sqm ?? 0).padStart(4)} ` +
    `beds=${String(r.bedrooms ?? 0)} imgs=${String((r.images || []).length)} ` +
    `band=${String(r.monthlyRentBand || '—').padEnd(12)} area="${String(r.area || '—')}" city=${r.city || '—'} upd=${String(r.updatedAt || '').slice(0, 10)}`
  );
});
const byStatus = {};
for (const r of rows) byStatus[r.status || '—'] = (byStatus[r.status || '—'] || 0) + 1;
console.log('\nstatus-fordeling:', JSON.stringify(byStatus));
const byModel = {};
for (const r of rows) byModel[r.model || '—'] = (byModel[r.model || '—'] || 0) + 1;
console.log('modell-fordeling:', JSON.stringify(byModel));
const shells = rows.filter((r) => !(r.sqm > 0) && !(r.bedrooms > 0) && !(r.images || []).length);
console.log(`tomme skall (0 sqm, 0 soverom, 0 bilder): ${shells.length}`);
