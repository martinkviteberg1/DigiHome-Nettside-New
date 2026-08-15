// Re-kjør auto-pipeline for leads som ble hoppet over pga. dagstak.
// Sekvensielt for å ikke overbelaste LLM-proxyen. Logger fremdrift.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { kjorAutoPipeline } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const hoppet = await db.collection('salgsradar_leads')
    .find({ 'auto.status': 'hoppet' }, { projection: { id: 1, adresse: 1 } }).toArray();
  console.log(`${new Date().toISOString()} — ${hoppet.length} hoppede leads å kjøre`);
  for (const l of hoppet) {
    const t0 = Date.now();
    try {
      const r = await kjorAutoPipeline(db, l.id);
      console.log(`${l.adresse}: ${r.ok ? 'OK' : `FEIL ${r.error}`}${r.hoppet ? ` (hoppet: ${r.hoppet})` : ''} — ${Math.round((Date.now() - t0) / 1000)}s`);
    } catch (e) {
      console.log(`${l.adresse}: EXCEPTION ${e.message}`);
    }
  }
  console.log('Ferdig.');
  await c.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
