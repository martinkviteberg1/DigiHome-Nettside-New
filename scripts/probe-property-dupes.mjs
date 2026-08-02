// Read-only: er de 5 "ekstra" radene dubletter med IDENTISK bildesett?
// Kjør: node scripts/probe-property-dupes.mjs
import fs from 'fs';
import crypto from 'crypto';
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
const res = await fetch(`${target}/api/properties/export?status=all&limit=200&offset=0`, { headers: { 'X-API-Key': key } });
const j = await res.json();
const rows = j.properties || [];

const h = (arr) => crypto.createHash('sha1').update(JSON.stringify(arr || [])).digest('hex').slice(0, 10);
const first = (arr) => (arr && arr[0] ? String(arr[0]).split('/').slice(-1)[0].slice(0, 40) : '—');

console.log(`${rows.length} rader\n`);
const byImgHash = new Map();
for (const r of rows) {
  const imgs = r.images || [];
  const key2 = imgs.length ? h(imgs) : `EMPTY-${r.id}`;
  if (!byImgHash.has(key2)) byImgHash.set(key2, []);
  byImgHash.get(key2).push(r);
}
console.log('=== GRUPPER MED IDENTISK BILDESETT (>1 rad) ===');
let dupGroups = 0;
for (const [hash, list] of byImgHash) {
  if (list.length < 2 || hash.startsWith('EMPTY-')) continue;
  dupGroups++;
  console.log(`\nbildesett ${hash} (${list[0].images.length} bilder, første=${first(list[0].images)}):`);
  for (const r of list) console.log(`   id=${r.id} model=${String(r.model).padEnd(8)} status=${String(r.status).padEnd(7)} sqm=${String(r.sqm).padStart(4)} beds=${r.bedrooms} area="${r.area}" title="${r.title}"`);
}
if (!dupGroups) console.log('(ingen)');

console.log('\n\n=== FULLE ID-ER FOR DE 5 EKSTRA-KANDIDATENE ===');
const suspects = ['966c2185', 'c3a4f965', 'b9d347ea', 'de9d0941', '80ef46e7'];
for (const s of suspects) {
  const r = rows.find((x) => String(x.id).startsWith(s));
  if (!r) { console.log(`${s}: IKKE FUNNET`); continue; }
  console.log(`\n${r.id}`);
  console.log(`   ${JSON.stringify({ ...r, images: (r.images || []).length ? `${r.images.length} stk: ${first(r.images)} …` : [] }, null, 2).replace(/\n/g, '\n   ')}`);
}

console.log('\n=== DELVIS BILDEOVERLAPP (samme gate, felles bilde-URL) ===');
for (let a = 0; a < rows.length; a++) {
  for (let b = a + 1; b < rows.length; b++) {
    const A = rows[a].images || [], B = rows[b].images || [];
    if (!A.length || !B.length) continue;
    const setB = new Set(B);
    const shared = A.filter((u) => setB.has(u)).length;
    if (shared && shared !== A.length) {
      console.log(`  ${String(rows[a].id).slice(0, 8)} (${A.length}) ∩ ${String(rows[b].id).slice(0, 8)} (${B.length}) = ${shared} felles  | "${rows[a].area}" vs "${rows[b].area}"`);
    }
  }
}
