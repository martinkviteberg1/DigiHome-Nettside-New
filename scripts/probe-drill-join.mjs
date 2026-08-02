// Sjekk om kontraktenes propertyId kan kobles mot platform_properties (unitId),
// og hvilke felt vi kan bruke til fallback-matching på adresse.
import { MongoClient } from 'mongodb';

const url = process.env.MONGO_URL;
const client = new MongoClient(url);
await client.connect();
const db = client.db(process.env.DB_NAME || undefined);
console.log('DB:', db.databaseName);

const props = await db.collection('platform_properties').find({}, { projection: { _id: 0, id: 1, externalId: 1, title: 1, area: 1, unit: 1, stale: 1 } }).toArray();
console.log('properties:', props.length);
console.log(props.slice(0, 4).map((p) => ({ id: p.id, externalId: p.externalId, area: p.area, unitId: p.unit?.unitId, full: p.unit?.fullAddress, owner: p.unit?.ownerName, tenant: p.unit?.tenantName, rent: p.unit?.rentAmount, rooms: p.unit?.rooms, floor: p.unit?.floor })));

const cons = await db.collection('finance_contracts').find({}, { projection: { _id: 0, id: 1, type: 1, propertyId: 1, propertyAddress: 1, ownerId: 1, ownerName: 1, tenantName: 1, monthlyRent: 1, feePercent: 1, status: 1, startDate: 1, externalContractId: 1 } }).toArray();
console.log('contracts:', cons.length);
console.log(cons.map((c) => ({ type: c.type, pid: c.propertyId, addr: c.propertyAddress, owner: c.ownerName, ownerId: c.ownerId })));

const pById = new Set(props.map((p) => p.id));
const pByExt = new Set(props.map((p) => p.externalId));
const pByUnit = new Set(props.map((p) => p.unit?.unitId).filter(Boolean));
let hitId = 0, hitExt = 0, hitUnit = 0, addrHit = 0;
const norm = (s) => String(s || '').toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
const addrIndex = new Map();
for (const p of props) {
  for (const a of [p.unit?.fullAddress, p.title, p.area, p.unit?.street && `${p.unit.street} ${p.unit.houseNumber || ''}`]) {
    if (a) addrIndex.set(norm(a), p.id);
  }
}
for (const c of cons) {
  if (c.propertyId && pById.has(c.propertyId)) hitId++;
  if (c.propertyId && pByExt.has(c.propertyId)) hitExt++;
  if (c.propertyId && pByUnit.has(c.propertyId)) hitUnit++;
  const a = norm(c.propertyAddress);
  if (a && (addrIndex.has(a) || [...addrIndex.keys()].some((k) => k.startsWith(a) || a.startsWith(k)))) addrHit++;
}
console.log({ contracts: cons.length, hitId, hitExt, hitUnit, addrHit });

const cust = await db.collection('platform_customers').find({}, { projection: { _id: 0, customerId: 1, name: 1, email: 1, mrr: 1, status: 1, activeContractsCount: 1, firstLeadId: 1, customerSince: 1, lifetimeFee: 1 } }).toArray();
console.log('platform_customers:', cust.length);
console.log(cust.slice(0, 8));

await client.close();
