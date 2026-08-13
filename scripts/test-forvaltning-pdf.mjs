// Tester plattformens kontrakt-PDF-endepunkt for forvaltningsavtale (komposit-id) og leiekontrakt.
import fs from 'fs';
for (const raw of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const l = raw.trim(); if (!l || l.startsWith('#')) continue;
  const i = l.indexOf('='); if (i < 0) continue;
  const k = l.slice(0, i).trim(); let v = l.slice(i + 1).trim();
  v = v.replace(/^["']|["']$/g, '').split(' #')[0].trim();
  if (!(k in process.env)) process.env[k] = v;
}
const BASE = process.env.DIGIHOME_API_URL_PROD || process.env.DIGIHOME_API_URL;
const KEY = process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY;
console.log('Mål:', BASE);

const tests = [
  { navn: 'Leiekontrakt (ren uuid)', id: '7f131aec-b33f-44d2-b5bb-b28034b7c0da' },
  { navn: 'Forvaltningsavtale Knøsesmauet (komposit)', id: '8a369e12-d2a9-49b0-bb16-c8ecf0549d4b:54fc012c-e9cb-4f66-9bda-7c0b2193d371' },
];

for (const t of tests) {
  const url = `${BASE}/api/contracts/${encodeURIComponent(t.id)}/pdf`;
  try {
    const r = await fetch(url, { headers: { 'X-API-Key': KEY } });
    const ct = r.headers.get('content-type') || '';
    let ekstra = '';
    if (!ct.includes('pdf')) {
      const txt = await r.text();
      ekstra = ` — ${txt.slice(0, 160)}`;
    } else {
      const buf = await r.arrayBuffer();
      ekstra = ` — ${buf.byteLength} bytes, starter med ${String.fromCharCode(...new Uint8Array(buf.slice(0, 5)))}`;
    }
    console.log(`${t.navn}: HTTP ${r.status} · ${ct}${ekstra}`);
  } catch (e) {
    console.log(`${t.navn}: FEIL — ${e.message}`);
  }
}
