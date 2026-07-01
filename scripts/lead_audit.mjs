// Read-only audit of leads in THIS marketing system's DB.
import { MongoClient } from 'mongodb';
import fs from 'fs';

// Load .env manually (avoid extra deps)
const env = {};
for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^"(.*)"$/, '$1');
}
const url = env.MONGO_URL;
const dbName = env.DB_NAME;

const client = new MongoClient(url);
await client.connect();
const db = client.db(dbName);

async function auditColl(name) {
  const c = db.collection(name);
  const total = await c.countDocuments({});
  const hasAttr = await c.countDocuments({ attribution: { $ne: null, $exists: true } });
  const hasVisitor = await c.countDocuments({ marketing_visitor_id: { $ne: null, $exists: true } });
  const hasGclid = await c.countDocuments({ 'attribution.gclid': { $exists: true, $ne: null } });
  const hasFbclid = await c.countDocuments({ 'attribution.fbclid': { $exists: true, $ne: null } });
  const won = await c.countDocuments({ status: 'won' });
  const wonNoAttr = await c.countDocuments({ status: 'won', $or: [{ attribution: null }, { attribution: { $exists: false } }] });
  const consentTrue = await c.countDocuments({ marketingConsent: true });
  const consentFalse = await c.countDocuments({ marketingConsent: false });
  const consentNull = await c.countDocuments({ $or: [{ marketingConsent: null }, { marketingConsent: { $exists: false } }] });
  const forwarded = await c.countDocuments({ forwarded: true });
  const notForwarded = await c.countDocuments({ forwarded: { $ne: true } });
  // Date range
  const oldest = await c.find({}).sort({ createdAt: 1 }).limit(1).toArray();
  const newest = await c.find({}).sort({ createdAt: -1 }).limit(1).toArray();
  console.log(`\n=== ${name} ===`);
  console.log({ total, hasAttr, hasVisitor, hasGclid, hasFbclid, won, wonNoAttr, consentTrue, consentFalse, consentNull, forwarded, notForwarded });
  console.log('oldest:', oldest[0]?.createdAt, '| newest:', newest[0]?.createdAt);
  // by lead_source_type / is_paid
  const bySource = await c.aggregate([{ $group: { _id: '$lead_source_type', n: { $sum: 1 } } }]).toArray();
  console.log('by lead_source_type:', bySource);
}

for (const name of ['leads', 'tenant_leads']) {
  try { await auditColl(name); } catch (e) { console.log(name, 'ERR', e.message); }
}

// List all collections
const colls = (await db.listCollections().toArray()).map(c => c.name);
console.log('\ncollections:', colls.join(', '));

await client.close();
