import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('/app/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const base = (env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no').replace(/\/+$/, '');
const key = env.DIGIHOME_API_KEY_PROD || env.DIGIHOME_API_KEY;
const get = async (p) => { const r = await fetch(`${base}${p}`, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`${p} → ${r.status}`); return r.json(); };
const SOK = ['Lien 7', 'Nygårdsvegen 27', 'Loddefjordveien 34', 'Asperudveien'];
const treff = (s) => SOK.some((x) => String(s || '').toLowerCase().includes(x.toLowerCase()));
const strip = (o) => { const c = { ...o }; delete c.images; delete c.coverImage; delete c.ad; delete c.channels; delete c.readiness; return c; };
const [li, un, co] = await Promise.all([get('/api/lease-income/export?limit=500'), get('/api/units/export?limit=500'), get('/api/contracts/export?status=all&limit=500')]);
console.log('=== LEASE-INCOME full ===');
for (const r of (li.rows || [])) if (treff(r.address)) console.log(JSON.stringify(r));
console.log('\n=== UNITS full (uten bilder) ===');
for (const u of (un.units || [])) if (treff(u?.address?.full) || treff(u.unitLabel)) console.log(JSON.stringify(strip(u)));
console.log('\n=== CONTRACTS full ===');
for (const c of (co.contracts || [])) if (treff(c?.property?.address)) console.log(JSON.stringify(c));
// Fordeling av avtalt sats på tvers av alle forvaltningsavtaler
const f = (co.contracts || []).filter((c) => String(c.type || '').includes('forvaltning') && !c.terminated_at);
const per = {}; for (const c of f) { const k = `${c.fee_model}:${c.fee_percent ?? c.fee_fixed}`; per[k] = (per[k] || 0) + 1; }
console.log('\n=== Satsfordeling forvaltningsavtaler (ikke terminerte) ===', per);
// service_tier fordeling i lease-income
const st = {}; for (const r of (li.rows || [])) { const k = `${r.service_tier}|fee${r.fee_percent}`; st[k] = (st[k] || 0) + 1; }
console.log('=== service_tier|fee i lease-income ===', st);
