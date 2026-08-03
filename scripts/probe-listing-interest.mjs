// Verifiserer at interesseskjemaet på en boligside faktisk lagrer boligen på
// leadet — og rydder opp etter seg. Oppretter ÉN QA-lead som slettes til slutt.
// Kjør: node --env-file=/app/.env scripts/probe-listing-interest.mjs
import { MongoClient } from 'mongodb';

const BASE = 'http://localhost:3000';
const KEY = 'dh_admin_b3Kx92Qz7Lm4';
const q = `key=${encodeURIComponent(KEY)}`;
const QA_EMAIL = 'qa-ledige-boliger@digihome.no';

const j = async (u, init) => { const r = await fetch(u, init); const t = await r.text(); try { return { s: r.status, b: JSON.parse(t) }; } catch (e) { return { s: r.status, b: t.slice(0, 300) }; } };

const props = (await j(`${BASE}/api/admin/properties?${q}`)).b.properties || [];
const cand = props.find((p) => /wernersholm/i.test(p.area || ''));
const blocked = props.find((p) => !(p.images || []).length);
console.log('publiserbar testbolig:', cand?.area, '| ikke-publiserbar:', blocked?.area);

await j(`${BASE}/api/admin/properties/visibility?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cand.id, visible: true }) });

// --- interesse på PUBLISERT bolig ------------------------------------------
const res = await j(`${BASE}/api/tenants`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'QA TEST — ikke en ekte henvendelse',
    email: QA_EMAIL, phone: '40000000',
    notes: 'Automatisk QA-test av interesseskjema på /ledige-boliger. Kan slettes.',
    property: cand.id, source: 'ledige-boliger',
  }),
});
console.log('POST /api/tenants →', res.s, JSON.stringify({ success: res.b.success, forwarded: res.b.forwarded, id: res.b.data?.id }));

const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
const db = client.db(process.env.DB_NAME);
const lead = await db.collection('tenant_leads').findOne({ email: QA_EMAIL }, { projection: { _id: 0 } });
console.log('\nLAGRET LEAD:');
console.log('  source:', lead?.source, '| lead_type:', lead?.lead_type);
console.log('  property_interests:', JSON.stringify(lead?.property_interests || null));
console.log('  admin_notify:', JSON.stringify(lead?.admin_notify || null));
console.log('  forwarded:', lead?.forwarded, '| platform_id:', lead?.platform_id || null);

// --- interesse på IKKE-publisert bolig skal ikke feste seg -----------------
if (blocked) {
  await j(`${BASE}/api/tenants`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'QA TEST 2 — ikke ekte', email: QA_EMAIL, phone: '40000000', property: blocked.id, source: 'ledige-boliger' }),
  });
  const l2 = await db.collection('tenant_leads').findOne({ email: QA_EMAIL }, { projection: { _id: 0 } });
  const n = (l2?.property_interests || []).length;
  console.log('\nskjult bolig gav', n, 'interesse(r) totalt —', n === 1 ? 'OK (ingen ny)' : 'FEIL: skjult bolig ble festet');
}

// --- opprydding -----------------------------------------------------------
const del = await db.collection('tenant_leads').deleteMany({ email: QA_EMAIL });
console.log('\nslettet QA-leads:', del.deletedCount);
await client.close();
await j(`${BASE}/api/admin/properties/visibility?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: cand.id, visible: false }) });
const after = await j(`${BASE}/api/public/listings`);
console.log('publiserte etter opprydding:', after.b.total, after.b.total === 0 ? '(OK — ingenting publisert)' : '(!! FORTSATT PUBLISERT)');
