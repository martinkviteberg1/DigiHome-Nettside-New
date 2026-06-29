import fs from 'fs';
import path from 'path';
function loadEnv() {
  const txt = fs.readFileSync(path.resolve('.env'), 'utf8');
  for (const line of txt.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let [, k, v] = m; v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}
loadEnv();
const { MongoClient } = await import('mongodb');
const meta = await import('../lib/meta-ads.js');

async function main() {
  console.log('metaAdsConfigured:', meta.metaAdsConfigured());
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME || undefined);
  for (const p of ['last_30d', 'all']) {
    try {
      const r = await meta.getCachedMetaReport(db, p, { force: true });
      console.log(`[${p}] fetchedAt=${r.fetchedAt} cached=${r.cached} stale=${r.stale} | campaigns=${r.snap.campaigns.length} cost=${r.snap.totals.cost} currency=${r.snap.currency} from=${r.snap.periodFrom.slice(0,10)} to=${r.snap.periodTo.slice(0,10)}`);
    } catch (e) { console.log(`[${p}] ERROR:`, e.message); }
  }
  await client.close();
}
main().then(() => process.exit(0)).catch((e) => { console.error('FATAL', e.message); process.exit(1); });
