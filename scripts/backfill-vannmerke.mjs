// Engangs: legg DigiHome-vannmerke på eksisterende AI-stylede bilder som
// mangler det. Bruker samme leggPaaVannmerke som produksjonskoden.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { leggPaaVannmerke } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const docs = await db.collection('salgsradar_bilder').find({ vannmerket: { $ne: true } }).toArray();
  console.log('Bilder uten vannmerke:', docs.length);
  let ok = 0; let hoppet = 0;
  for (const d of docs) {
    const nyt = await leggPaaVannmerke(d.dataUrl);
    if (nyt && nyt !== d.dataUrl) {
      await db.collection('salgsradar_bilder').updateOne({ id: d.id }, { $set: { dataUrl: nyt, vannmerket: true } });
      ok += 1;
    } else { hoppet += 1; }
  }
  console.log(`Vannmerket: ${ok}, hoppet over: ${hoppet}`);
  await c.close();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
