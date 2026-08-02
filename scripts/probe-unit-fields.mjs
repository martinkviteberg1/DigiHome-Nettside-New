import { MongoClient } from 'mongodb';
const client = new MongoClient(process.env.MONGO_URL);
await client.connect();
const db = client.db(process.env.DB_NAME);
const withUnit = await db.collection('platform_properties').find({ unit: { $exists: true } }, { projection: { _id: 0 } }).toArray();
console.log('docs with unit:', withUnit.length);
console.log(withUnit.slice(0, 3).map((p) => ({
  id: p.id, externalId: p.externalId, stale: p.stale, visible: p.visible, area: p.area, title: p.title,
  district: p.district, sqm: p.sqm, bedrooms: p.bedrooms, images: (p.images || []).length,
  unit: p.unit,
})));
const stale = await db.collection('platform_properties').countDocuments({ stale: true });
console.log('stale:', stale, 'total:', await db.collection('platform_properties').countDocuments({}));
await client.close();
