import { MongoClient } from 'mongodb';

// Reuse a single MongoClient across hot-reloads and route invocations.
let clientPromise;

if (!global._mongoClientPromise) {
  const client = new MongoClient(process.env.MONGO_URL);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;

export async function getDb() {
  const client = await clientPromise;
  return client.db(process.env.DB_NAME);
}

export function clean(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}
