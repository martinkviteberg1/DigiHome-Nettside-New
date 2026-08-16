// Kjør den EKTE pollSignering-koden (samme som cron) én gang og vis resultatet.
import fs from 'node:fs';
for (const linje of fs.readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = linje.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { MongoClient } = await import('mongodb');
const { pollSignering } = await import('../lib/signering.js');
const c = await MongoClient.connect(process.env.MONGO_URL);
const db = c.db(process.env.DB_NAME || 'your_database_name');

// Nullstill ventetiden slik den manuelle Oppdater-knappen gjør
await db.collection('signering_config').updateOne({ id: 'posten' }, { $set: { nestePoll: new Date().toISOString() } });
const r = await pollSignering(db);
console.log('pollSignering:', JSON.stringify(r));

const jobber = await db.collection('signering_jobber').find({}).project({ id: 1, tittel: 1, status: 1, signertVersjon: 1, 'signatarer.status': 1, 'signatarer.signertAt': 1 }).sort({ opprettet: -1 }).limit(3).toArray();
console.log(JSON.stringify(jobber, null, 1));
await c.close();
