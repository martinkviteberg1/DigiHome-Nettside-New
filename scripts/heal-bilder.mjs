// Heal: fjern døde finncdn-lenker fra alle leads, rens auto.feiletBilder,
// og kjør retry-styling der bilder mangler av de 5 første.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { filtrerLevendeBilder, kjorAutoRetry, retryKandidater } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const leads = await db.collection('salgsradar_leads').find({}).toArray();
  for (const l of leads) {
    const foer = (l.bilder || []).length;
    const levende = await filtrerLevendeBilder(l.bilder || []);
    const levendeSet = new Set(levende);
    const feiletRen = (l.auto?.feiletBilder || []).filter((b) => levendeSet.has(b));
    const patch = { bilder: levende, updatedAt: new Date().toISOString() };
    if (l.auto) patch['auto.feiletBilder'] = feiletRen;
    await db.collection('salgsradar_leads').updateOne({ id: l.id }, { $set: patch });
    console.log(`${l.adresse}: bilder ${foer} → ${levende.length} (fjernet ${foer - levende.length} døde), feiletBilder ${l.auto?.feiletBilder?.length || 0} → ${feiletRen.length}`);
    const oppdatert = await db.collection('salgsradar_leads').findOne({ id: l.id });
    const kand = retryKandidater(oppdatert);
    if (kand.length && !['analyserer', 'styler'].includes(oppdatert.auto?.status)) {
      console.log(`  → styler ${kand.length} manglende bilder (Pro + vannmerke)…`);
      const t0 = Date.now();
      const res = await kjorAutoRetry(db, l.id);
      console.log(`  → resultat: ${JSON.stringify(res)} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
    }
  }
  await c.close();
  console.log('FERDIG');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
