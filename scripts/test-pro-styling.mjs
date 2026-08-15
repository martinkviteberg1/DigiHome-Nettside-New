// Kvalitetstest Nano Banana Pro + e2e-verifisering av ny stilBilde-kjede.
// 1) Kjør kjorAutoRetry på leaden (styler manglende bilde med Pro + vannmerke)
// 2) Rapporter resultat + lagre nyeste stylede bilde til /tmp for inspeksjon
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync } from 'fs';
import { kjorAutoRetry } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const lead = await db.collection('salgsradar_leads').findOne({}, { sort: { updatedAt: -1 } });
  console.log('Lead:', lead.adresse, '| auto før:', JSON.stringify(lead.auto || null).slice(0, 120), '| stylet:', (lead.stylet || []).length);
  const t0 = Date.now();
  const res = await kjorAutoRetry(db, lead.id);
  console.log('Retry-resultat:', JSON.stringify(res), '| tid:', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  const nyeste = await db.collection('salgsradar_bilder').findOne({ leadId: lead.id }, { sort: { createdAt: -1 } });
  if (nyeste) {
    const m = nyeste.dataUrl.match(/^data:image\/[a-z]+;base64,(.+)$/);
    writeFileSync('/tmp/pro-stylet.jpg', Buffer.from(m[1], 'base64'));
    console.log('Nyeste bilde:', nyeste.stil, '| vannmerket:', nyeste.vannmerket, '| lagret /tmp/pro-stylet.jpg | kilde:', (nyeste.kildeUrl || '').slice(-45));
  }
  await c.close();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
