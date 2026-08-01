// ---------------------------------------------------------------------------
// Read-only sonde: hva eksponerer plattformen (prod ELLER preview) av
// lead-/leietaker-eksport? Brukes til å diagnostisere hvorfor leietaker-leads
// ikke synkes til markedsføringsadmin.
//
// Kjør:  node scripts/probe-platform-export.mjs prod
//        node scripts/probe-platform-export.mjs test
// Kun GET-kall. Ingenting skrives.
// ---------------------------------------------------------------------------
import fs from 'fs';
import path from 'path';

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    else v = v.split(' #')[0].trim();
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv(path.join(process.cwd(), '.env'));

const ENV = (process.argv[2] || 'prod').toLowerCase();
const target = (ENV === 'prod'
  ? (process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no')
  : (process.env.DIGIHOME_API_URL_TEST || process.env.DIGIHOME_API_URL || '')
).replace(/\/+$/, '');
const secret = process.env.LEAD_SYNC_SECRET || (ENV === 'prod' ? (process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY) : (process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY)) || '';

const headers = secret ? { 'X-API-Key': secret, 'X-Webhook-Secret': secret, Authorization: `Bearer ${secret}` } : {};

const mapLeadType = (raw) => {
  const r = (raw || '').toString().toLowerCase().trim();
  if (/(leietaker|tenant|renter|boligsøker|boligsoker)/.test(r)) return 'leietaker';
  if (/(kontakt|contact|henvendelse|inquiry)/.test(r)) return 'kontakt';
  return 'huseier';
};

const extractRows = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  const rows = [];
  if (Array.isArray(payload.leads)) rows.push(...payload.leads);
  if (Array.isArray(payload.tenants)) rows.push(...payload.tenants);
  if (Array.isArray(payload.tenant_leads)) rows.push(...payload.tenant_leads);
  if (!rows.length && Array.isArray(payload.data)) rows.push(...payload.data);
  if (!rows.length && Array.isArray(payload.items)) rows.push(...payload.items);
  return rows;
};

const PATHS = [
  '/api/leads/export?limit=500',
  '/api/admin/leads/export?limit=500',
  '/api/leads?export=1&limit=500',
  '/api/tenants/export?limit=500',
  '/api/admin/tenants/export?limit=500',
  '/api/tenants?export=1&limit=500',
  '/api/leads/export?type=tenant&limit=500',
  '/api/leads/export?type=leietaker&limit=500',
  '/api/leads/export?lead_type=leietaker&limit=500',
  '/api/leads/export?lead_type=tenant&limit=500',
  '/api/leads/export?kind=tenant&limit=500',
  '/api/tenant-leads/export?limit=500',
  '/api/sales/leads/export?limit=500',
  '/api/crm/leads/export?limit=500',
];

console.log(`\n=== PLATTFORM-EKSPORT SONDE (${ENV}) → ${target} ===`);
console.log(`Nøkkel sendt: ${secret ? 'ja (' + secret.slice(0, 4) + '…)' : 'NEI'}\n`);

for (const p of PATHS) {
  const url = `${target}${p}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, { headers, signal: ctrl.signal }).finally(() => clearTimeout(t));
    const text = await res.text();
    let payload = null;
    try { payload = JSON.parse(text); } catch (_) {}
    if (!res.ok) { console.log(`HTTP ${res.status}  ${p}  ${text.slice(0, 120).replace(/\s+/g, ' ')}`); continue; }
    const rows = extractRows(payload);
    const byType = {};
    for (const r of rows) {
      const t2 = mapLeadType(r.lead_type || r.type || r.kundetype);
      byType[t2] = (byType[t2] || 0) + 1;
    }
    const topKeys = payload && !Array.isArray(payload) ? Object.keys(payload).slice(0, 12).join(',') : '(array)';
    console.log(`HTTP 200  ${p}`);
    console.log(`          rader: ${rows.length}  fordeling: ${JSON.stringify(byType)}  topp-nøkler: ${topKeys}`);
    if (payload && payload.total != null) console.log(`          payload.total: ${payload.total}  nextCursor: ${payload.nextCursor || payload.next_cursor || '-'}`);
    if (rows[0]) console.log(`          felt i første rad: ${Object.keys(rows[0]).slice(0, 30).join(', ')}`);
    if (rows[0]) console.log(`          eksempel type-felt: lead_type=${JSON.stringify(rows[0].lead_type)} type=${JSON.stringify(rows[0].type)} kundetype=${JSON.stringify(rows[0].kundetype)} role=${JSON.stringify(rows[0].role)}`);
  } catch (e) {
    console.log(`FEIL      ${p}  ${e.message}`);
  }
}
console.log('');
