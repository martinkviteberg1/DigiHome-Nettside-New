// Read-only: hva gir plattformens /api/public/listings? (adresse, postnr, etasje, public_url)
// Kjør: node scripts/probe-public-listings.mjs
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

for (const st of ['published', 'all']) {
  const url = `${target}/api/public/listings?limit=0&status=${st}`;
  const res = await fetch(url, { headers: { 'X-API-Key': key, Accept: 'application/json' } });
  const txt = await res.text();
  let j = null; try { j = JSON.parse(txt); } catch {}
  const list = j?.listings || [];
  console.log(`\n=== status=${st} → HTTP ${res.status} · ${list.length} annonser · tenant=${JSON.stringify(j?.tenant || null)}`);
  if (!j) { console.log(txt.slice(0, 300)); continue; }
  const keys = new Set(); for (const r of list) Object.keys(r || {}).forEach((k) => keys.add(k));
  console.log('felt:', [...keys].sort().join(', '));
  for (const r of list) {
    console.log(`  id=${String(r.id || r.unit_id || '—').slice(0, 8)} unit=${String(r.unit_id || '—').slice(0, 8)} "${String(r.title || '').slice(0, 30).padEnd(30)}" adr="${String(r.address || '—').slice(0, 34).padEnd(34)}" ${String(r.postal_code || '—').padEnd(6)} ${String(r.city || '—').padEnd(12)} etg=${r.floor ?? '—'} ${String(r.sqm ?? '—').padStart(4)}m² ${r.bedrooms ?? '—'}sov leie=${r.monthly_rent ?? '—'} modell=${r.rental_model || '—'} imgs=${(r.images || []).length} url=${String(r.public_url || '—').slice(-40)}`);
  }
  if (list[0]) console.log('\nFØRSTE RAD FULLT:', JSON.stringify({ ...list[0], images: `${(list[0].images || []).length} stk` }, null, 2).slice(0, 1800));
}
