// Diagnose: sammenlign plattformens rå eksport for utvalgte enheter (ingen nøkler skrives ut).
import fs from 'node:fs';
const env = Object.fromEntries(fs.readFileSync('/app/.env', 'utf8').split('\n').filter((l) => l.includes('=') && !l.startsWith('#')).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')]; }));
const base = (env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no').replace(/\/+$/, '');
const key = env.DIGIHOME_API_KEY_PROD || env.DIGIHOME_API_KEY;
const get = async (p) => { const r = await fetch(`${base}${p}`, { headers: { 'X-API-Key': key }, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`${p} → ${r.status}`); return r.json(); };

const SOK = ['Øvregaten 15', 'Tullins gate 6', 'Olaf Ryes vei 11C', 'Lien 7', 'Nygårdsvegen 27', 'Tverrgaten 15', 'Knøsesmauet'];
const treff = (s) => SOK.some((x) => String(s || '').toLowerCase().includes(x.toLowerCase()));

const [li, un, co] = await Promise.all([get('/api/lease-income/export?limit=500'), get('/api/units/export?limit=500'), get('/api/contracts/export?status=all&limit=500')]);
const rows = li.rows || li.data || [];
console.log('lease-income rader:', rows.length, '| felter:', Object.keys(rows[0] || {}).join(', '));
console.log('\n=== LEASE-INCOME (utvalg) ===');
for (const r of rows) if (treff(r.address) || treff(r.unit_room)) console.log(JSON.stringify({ address: r.address, unit_room: r.unit_room, tenant: r.tenant_name, status: r.status_label || r.group, move_in: r.move_in_date, move_out: r.move_out_date, end_date: r.end_date, rent: r.monthly_rent ?? r.amount, fee_percent: r.fee_percent, fee_amount: r.fee_amount, net: r.net_to_owner, vat: r.vat_inclusive, service_level: r.service_level, service_tier: r.service_tier, income_type: r.income_type }));

const units = un.units || [];
console.log('\n=== UNITS (utvalg) === felter:', Object.keys(units[0] || {}).join(', '));
for (const u of units) if (treff(u?.address?.full) || treff(u.unitLabel)) console.log(JSON.stringify({ unitId: u.unitId, buildingId: u.buildingId, label: u.unitLabel, address: u?.address?.full, status: u.status, tenant: u?.tenant?.name || u.tenant, rent: u?.rent?.amount, service_tier: u.service_tier || u.serviceTier || u.service_level, fee: u.fee_percent ?? u.feePercent ?? u.commission, rentalScope: u.rentalScope, owner: u?.owner?.name }));

const contracts = co.contracts || [];
console.log('\n=== CONTRACTS (utvalg) === felter:', Object.keys(contracts[0] || {}).join(', '));
for (const c of contracts) if (treff(c?.property?.address)) console.log(JSON.stringify({ id: c.contract_id, type: c.type, status: c.status, signed_at: c.signed_at, property: c?.property?.address, tenant: c?.tenant?.name, owner: c?.owner?.name, start: c.start_date, end: c.end_date, expected_rent_start: c.expected_rent_start, terminated_at: c.terminated_at, term: c.term_type || c.duration_type || c.contract_type, rent: c.monthly_rent, fee_model: c.fee_model, fee_percent: c.fee_percent, fee_fixed: c.fee_fixed, created_at: c.created_at }));
