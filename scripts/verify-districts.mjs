// Verifiserer bydelsutledningen mot EKTE prod-data (read-only).
// Joiner plattformens boligeksport med kontraktseksportens adresser og viser
// hvilken bydel hver bolig ville fått — så vi kan se etter feilplasseringer.
// Kjør: node scripts/verify-districts.mjs
import fs from 'fs';
import { resolveDistrict, sortDistrictGroups } from '../lib/geo-bergen.js';

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
const target = (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no').replace(/\/+$/, '');
const key = process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY;
const H = { 'X-API-Key': key };

const pRes = await fetch(`${target}/api/properties/export?status=all&limit=200&offset=0`, { headers: H });
const pJson = await pRes.json();
const props = pJson.properties || [];

const cRes = await fetch(`${target}/api/contracts/export?status=all&limit=200`, { headers: H });
const cJson = await cRes.json();
const contracts = cJson.contracts || [];

const addr = new Map();
for (const c of contracts) {
  const pid = c.property?.id; const a = String(c.property?.address || '').trim();
  if (!pid || !a) continue;
  const prev = addr.get(pid);
  if (!prev || (!/\b\d{4}\b/.test(prev) && /\b\d{4}\b/.test(a))) addr.set(pid, a);
}

console.log(`boliger: ${props.length} · kontrakter: ${contracts.length} · adresser i indeks: ${addr.size}\n`);
const groups = {};
let resolved = 0, viaZip = 0, viaPlace = 0, viaCity = 0, none = 0;
for (const p of props) {
  const address = addr.get(p.id) || null;
  const g = resolveDistrict({ district: p.district, address, city: p.city, area: p.area });
  if (g.district) { resolved++; (groups[g.district] ||= []).push(p); } else { none++; (groups['Andre områder'] ||= []).push(p); }
  if (g.source === 'postnummer') viaZip++; else if (g.source === 'poststed') viaPlace++; else if (g.source && g.source.startsWith('by')) viaCity++;
  const flag = p.status === 'active' ? 'LEDIG ' : '      ';
  console.log(`${flag}${String(g.district || 'Andre områder').padEnd(16)} <- ${String(g.source || '—').padEnd(12)} ${String(p.area || '').slice(0, 26).padEnd(26)} city=${String(p.city || '—').padEnd(13)} adr=${address || '—'}`);
}
console.log(`\nUTLEDET: ${resolved}/${props.length}  (postnummer ${viaZip} · poststed ${viaPlace} · by ${viaCity} · ingen ${none})`);
console.log('\nGRUPPER (slik nyhetsbrevet vil vise dem, ledige boliger):');
const activeGroups = {};
for (const [d, list] of Object.entries(groups)) {
  const act = list.filter((p) => p.status === 'active');
  if (act.length) activeGroups[d] = act;
}
for (const [d, list] of sortDistrictGroups(Object.entries(activeGroups))) {
  console.log(`  ${d.toUpperCase()} — ${list.length} ${list.length === 1 ? 'bolig' : 'boliger'}`);
  for (const p of list) console.log(`      · ${p.title} · ${p.area || p.city || ''}`);
}
