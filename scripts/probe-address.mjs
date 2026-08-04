// Engangsprobe: hvilke adressefelt finnes i platform_properties (ikke-stale)?
// Kjør: node --env-file=/app/.env scripts/probe-address.mjs
import { MongoClient } from 'mongodb';

const c = new MongoClient(process.env.MONGO_URL);
await c.connect();
const d = process.env.DB_NAME ? c.db(process.env.DB_NAME) : c.db();
const coll = d.collection('platform_properties');
const rows = await coll.find({ stale: { $ne: true } }, { projection: { _id: 0 } }).toArray();
console.log('DB:', d.databaseName, '· ikke-stale:', rows.length, '· totalt:', await coll.countDocuments());
const keys = new Set();
rows.forEach((p) => Object.keys(p).forEach((k) => keys.add(k)));
console.log('\nFelter (union):', [...keys].sort().join(', '));
rows.slice(0, 6).forEach((p) => console.log('\n-', JSON.stringify({
  area: p.area, street: p.street, houseNumber: p.houseNumber, fullAddress: p.fullAddress,
  unit: p.unit ? Object.keys(p.unit) : null, district: p.district, status: p.status,
})));
await c.close();
