// Hvorfor er Baglergaten ikke valgbar, og hvor kommer FINN-lenken på
// Nedre Gartnergaten fra? Skriver ut alt vi har lagret på begge enhetene.
import { MongoClient } from 'mongodb';
const c = new MongoClient(process.env.MONGO_URL);
await c.connect();
const db = c.db(process.env.DB_NAME);

const q = { $or: [
  { area: /bagler/i }, { title: /bagler/i }, { 'unit.fullAddress': /bagler/i }, { 'unit.street': /bagler/i },
  { area: /gartnergat/i }, { title: /gartnergat/i }, { 'unit.fullAddress': /gartnergat/i }, { 'unit.street': /gartnergat/i },
] };
const docs = await db.collection('platform_properties').find(q).toArray();
console.log('treff:', docs.length);
for (const d of docs) {
  console.log('\n==============================');
  console.log('id:', d.id, '| externalId:', d.externalId, '| stale:', d.stale);
  const { _id, images, unit, enrich, ...rest } = d;
  console.log('TOPP-NIVÅ:', JSON.stringify(rest, null, 1));
  console.log('images:', (images || []).length);
  console.log('unit:', JSON.stringify(unit ? { ...unit, images: (unit.images || []).length } : null, null, 1));
  console.log('enrich:', JSON.stringify(enrich || null, null, 1));
}
await c.close();
