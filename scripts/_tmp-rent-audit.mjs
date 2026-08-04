// Midlertidig: hvor kommer prisintervallet/«prisantydning» fra?
import fs from 'node:fs';
import { MongoClient } from 'mongodb';

for (const line of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const c = new MongoClient(process.env.MONGO_URL);
await c.connect();
const db = c.db(process.env.DB_NAME || undefined);
const coll = db.collection('platform_properties');

const total = await coll.countDocuments({});
const withAmount = await coll.countDocuments({ rentAmount: { $gt: 0 } });
const withBand = await coll.countDocuments({ monthlyRentBand: { $nin: [null, ''] } });
console.log('DB:', db.databaseName, { total, withAmount, withBand });

const rows = await coll.find({}, {
  projection: {
    _id: 0, id: 1, area: 1, street: 1, unit: 1, status: 1, visible: 1,
    rentAmount: 1, rentIsEstimate: 1, monthlyRentBand: 1, rentBandSource: 1,
    editorial: 1, finnSnap: 1, enrich: 1,
  },
}).limit(8).toArray();

for (const r of rows) {
  console.log('---', r.id?.slice(0, 8), '|', r.street || r.area, '|', r.unit || '');
  console.log('   platform rentAmount =', r.rentAmount, '| rentIsEstimate =', r.rentIsEstimate);
  console.log('   monthlyRentBand    =', JSON.stringify(r.monthlyRentBand), '| rentBandSource =', r.rentBandSource);
  console.log('   editorial.rentAmount =', r.editorial?.rentAmount ?? null);
  console.log('   finnSnap.rentAmount  =', r.finnSnap?.rentAmount ?? null, '| enrich.band =', r.enrich?.monthlyRentBand ?? null);
}
await c.close();
