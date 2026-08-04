// QA-hjelper for visuell kontroll av nyhetsbrev-landingen.
//   node scripts/qa-nl-setup.mjs setup   → klargjør bolig + mottaker, skriver URL
//   node scripts/qa-nl-setup.mjs clean   → fjerner ALT som ble laget
// Mottakeren er @example.com, så ingen e-post kan gå ut.
import fs from 'fs';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';

const env = Object.fromEntries(
  fs.readFileSync('/app/.env', 'utf8').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#') && l.includes('='))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const BASE = 'http://localhost:3000';
const KEY = env.ADMIN_KEY;
const MONGO = env.MONGO_URL;
const DB = env.DB_NAME || 'digihome';
const SECRET = env.NEWSLETTER_SECRET || env.AGENT_BRIDGE_SECRET || env.SENDGRID_API_KEY || 'dh-nl';
const STATE = '/tmp/qa-nl.json';

const ptFor = (c, r, p) => crypto.createHmac('sha256', `${SECRET}:property-interest`).update(`${c}:${r}:${p}`).digest('hex').slice(0, 40);
const put = async (path, obj) => {
  const r = await fetch(`${BASE}${path}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
  return r.status;
};

async function setup() {
  const props = (await (await fetch(`${BASE}/api/admin/properties?key=${KEY}`)).json()).properties || [];
  const p = props.filter((x) => x.status === 'active').find((x) => (x.images || []).length && x.sqm && x.area);
  if (!p) throw new Error('ingen egnet bolig');
  const stamp = Date.now();
  const campaignId = `qa-visuell-${stamp}`;
  const rid = `qa${stamp}`.slice(0, 24);
  const email = `qa.visuell.${stamp}@example.com`;

  await put(`/api/admin/properties/fields?key=${KEY}`, { id: p.id, resetAll: true });
  await put(`/api/admin/properties/fields?key=${KEY}`, { id: p.id, fields: { rentalScope: 'begge', roomsVacant: 2, roomsTotal: 4, rentAmount: 12000, imageRights: true } });
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: p.id, visible: true });
  const pub = await (await fetch(`${BASE}/api/public/listings`)).json();
  const card = (pub.listings || []).find((c) => c.id === p.id || c.id === p.externalId);
  // Boligen holdes SKJULT: da beviser skjermbildet også at token-tilgang virker.
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: p.id, visible: false });

  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB);
  await db.collection('newsletter_recipients').insertOne({ id: `qa-${stamp}`, campaignId, rid, email, status: 'sent', qaProbe: true, createdAt: new Date().toISOString() });
  await db.collection('newsletter_subscribers').updateOne({ email }, { $set: { email, name: 'Kari Nordmann', status: 'active', qaProbe: true, createdAt: new Date().toISOString() } }, { upsert: true });
  await client.close();

  const pid = p.externalId || p.id;
  const state = { propertyId: p.id, wasVisible: p.visible === true, campaignId, rid, email, slug: card?.slug || '' };
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  console.log(`URL=${BASE}/ledige-boliger/${state.slug}?c=${campaignId}&r=${rid}&pt=${ptFor(campaignId, rid, pid)}`);
  console.log(`LEGACY=${BASE}/boliginteresse?property=${pid}&c=${campaignId}&r=${rid}&pt=${ptFor(campaignId, rid, pid)}`);
}

async function clean() {
  const st = JSON.parse(fs.readFileSync(STATE, 'utf8'));
  await put(`/api/admin/properties/fields?key=${KEY}`, { id: st.propertyId, resetAll: true });
  await put(`/api/admin/properties/visibility?key=${KEY}`, { id: st.propertyId, visible: st.wasVisible });
  const client = new MongoClient(MONGO);
  await client.connect();
  const db = client.db(DB);
  const leads = await db.collection('tenant_leads').find({ email: st.email }, { projection: { id: 1 } }).toArray();
  const ids = leads.map((l) => l.id);
  await db.collection('tenant_leads').deleteMany({ email: st.email });
  await db.collection('platform_interest_outbox').deleteMany({ leadId: { $in: ids } });
  await db.collection('property_interest_events').deleteMany({ email: st.email });
  await db.collection('newsletter_recipients').deleteMany({ campaignId: st.campaignId });
  await db.collection('newsletter_subscribers').deleteMany({ email: st.email });
  await db.collection('newsletter_events').deleteMany({ campaignId: st.campaignId });
  const rest = {
    leads: await db.collection('tenant_leads').countDocuments({ email: st.email }),
    recipients: await db.collection('newsletter_recipients').countDocuments({ campaignId: st.campaignId }),
    outbox: await db.collection('platform_interest_outbox').countDocuments({ status: 'pending' }),
  };
  await client.close();
  const pub = await (await fetch(`${BASE}/api/public/listings`)).json();
  fs.rmSync(STATE, { force: true });
  console.log(`RYDDET ${JSON.stringify(rest)} publiserte=${(pub.listings || []).length}`);
}

const cmd = process.argv[2];
(cmd === 'clean' ? clean() : setup()).catch((e) => { console.log('FEIL', e.message); process.exit(1); });
