import { MongoClient } from 'mongodb';

// LAT tilkobling — kobler først når getDb() kalles, IKKE ved import.
// Kritisk for produksjon (Atlas):
//  1) `client.connect()` på modulnivå uten .catch() ga «unhandled rejection»
//     hvis Atlas ikke svarte umiddelbart ved pod-oppstart → Node 18 avslutter
//     prosessen → CrashLoopBackOff → «deployment failed to become ready».
//  2) En avvist promise ble cachet permanent i global — appen forble død
//     selv etter at databasen ble tilgjengelig. Nå nullstilles cachen ved
//     feil slik at neste kall prøver på nytt.
function connect() {
  const client = new MongoClient(process.env.MONGO_URL, {
    serverSelectionTimeoutMS: 8000,
    connectTimeoutMS: 8000,
    maxPoolSize: 10,
  });
  return client.connect();
}

export async function getDb() {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = connect().catch((e) => {
      global._mongoClientPromise = null; // ikke cache feilen — retry ved neste kall
      throw e;
    });
  }
  const client = await global._mongoClientPromise;
  return client.db(process.env.DB_NAME);
}

export function clean(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return rest;
}
