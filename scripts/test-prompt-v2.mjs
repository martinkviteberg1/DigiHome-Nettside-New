// Prompt v2-test: generer stylede versjoner av ekte FINN-bilder med den nye
// rombevisste optimal-prompten (Nano Banana Pro) — lagres KUN til /tmp.
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync } from 'fs';
import { stilBilde } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const lead = await db.collection('salgsradar_leads').findOne({ adresse: /Nyhavn/ });
  const kandidater = (lead.bilder || []).slice(0, 4);
  console.log('Tester på', kandidater.length, 'bilder fra', lead.adresse);
  for (let i = 0; i < Math.min(2, kandidater.length); i += 1) {
    const u = kandidater[i];
    const t0 = Date.now();
    try {
      const dataUrl = await stilBilde(u, 'optimal');
      const m = dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
      writeFileSync(`/tmp/promptv2-${i}.jpg`, Buffer.from(m[1], 'base64'));
      const orig = await fetch(u);
      writeFileSync(`/tmp/promptv2-${i}-orig.jpg`, Buffer.from(await orig.arrayBuffer()));
      console.log(`[${i}] OK ${((Date.now() - t0) / 1000).toFixed(0)}s → /tmp/promptv2-${i}.jpg (+ orig)`);
    } catch (e) { console.log(`[${i}] FEIL: ${e.message}`); }
  }
  await c.close();
  console.log('FERDIG');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
