// Tester PDF for ALLE forvaltningsavtaler i prod med korrekt komposit-id (contract_id).
import fs from 'fs';
for (const raw of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const l = raw.trim(); if (!l || l.startsWith('#')) continue;
  const i = l.indexOf('='); if (i < 0) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  v = v.replace(/^["']|["']$/g, '').split(' #')[0].trim();
  if (!(k in process.env)) process.env[k] = v;
}
const BASE = 'https://app.digihome.no';
const KEY = process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY;

const r = await fetch(`${BASE}/api/contracts/export`, { headers: { 'X-API-Key': KEY } });
const j = await r.json();
const alle = j.contracts || j.rows || [];
const forvaltning = alle.filter((c) => String(c.type || '').toLowerCase().includes('forvalt'));
console.log(`${forvaltning.length} forvaltningsavtaler i prod:\n`);

let ok = 0; let mangler = 0; let annet = 0;
for (const c of forvaltning) {
  const id = c.contract_id;
  const adr = (c.property?.address || '?').split(',')[0];
  try {
    const rp = await fetch(`${BASE}/api/contracts/${encodeURIComponent(id)}/pdf`, { headers: { 'X-API-Key': KEY } });
    const ct = rp.headers.get('content-type') || '';
    if (ct.includes('pdf')) { const b = await rp.arrayBuffer(); ok += 1; console.log(`✅ PDF ${String(b.byteLength).padStart(7)} b · ${adr} (${c.status})`); }
    else { const t = await rp.text(); const d = (JSON.parse(t).detail || t).slice(0, 60); if (d.includes('ikke tilgjengelig')) mangler += 1; else annet += 1; console.log(`❌ ${rp.status} ${d} · ${adr} (${c.status})`); }
  } catch (e) { annet += 1; console.log(`💥 ${e.message} · ${adr}`); }
}
console.log(`\nOppsummert: ${ok} med PDF · ${mangler} uten signert PDF · ${annet} andre feil`);
