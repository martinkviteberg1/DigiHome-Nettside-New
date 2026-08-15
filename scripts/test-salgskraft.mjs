// Test: re-kjør AI-analysen på en eksisterende lead og verifiser at
// salgskraft-score og bilde-for-bilde-vurdering populeres korrekt.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { analyserAnnonse } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const lead = await db.collection('salgsradar_leads').findOne({ adresse: /Nyhavn/i });
  if (!lead) { console.log('Fant ingen Nyhavn-lead'); process.exit(1); }
  console.log(`Lead: ${lead.adresse} (${lead.id}) — ${(lead.bilder || []).length} bilder`);
  const t0 = Date.now();
  const res = await analyserAnnonse(db, lead.id);
  console.log(`Analyse tok ${Math.round((Date.now() - t0) / 1000)}s — ok: ${res.ok}${res.error ? ` feil: ${res.error}` : ''}`);
  if (res.ok) {
    const ai = res.lead.ai;
    console.log(JSON.stringify({
      annonseScore: ai.annonseScore,
      potensialScore: ai.potensialScore,
      salgskraft: ai.salgskraft,
      bildeVurdering: (ai.bildeVurdering || []).map((b) => ({ rom: b.rom, score: b.score, funn: b.funn, harUrl: !!b.url })),
    }, null, 2));
  }
  await c.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
