// Test av ny «optimal»-prompt: kjør styling på utvalgte bilder og lagre
// før/etter til /tmp for visuell inspeksjon. Laster også ned alle originaler.
import { MongoClient } from 'mongodb';
import { readFileSync, writeFileSync } from 'fs';
import { stilBilde } from '../lib/salgsradar.js';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const lagre = (dataUrl, sti) => {
  const [hode, b64] = String(dataUrl).split(',');
  const ext = (hode.match(/^data:image\/(\w+)/) || [])[1] || 'png';
  const fil = `${sti}.${ext === 'jpeg' ? 'jpg' : ext}`;
  writeFileSync(fil, Buffer.from(b64, 'base64'));
  return fil;
};

async function main() {
  const hvilke = (process.argv[2] || '2,4').split(',').map(Number); // 1-basert indeks
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const lead = await db.collection('salgsradar_leads').findOne({ adresse: /Nyhavn/i });
  if (!lead) { console.log('Fant ingen Nyhavn-lead'); process.exit(1); }
  const bilder = lead.bilder || [];
  console.log(`Lead: ${lead.adresse} — ${bilder.length} bilder`);
  // Last ned alle originaler for inspeksjon
  for (let i = 0; i < bilder.length; i += 1) {
    try {
      const r = await fetch(bilder[i]);
      if (r.ok) writeFileSync(`/tmp/orig_${i + 1}.jpg`, Buffer.from(await r.arrayBuffer()));
    } catch (e) { console.log(`orig ${i + 1} feilet: ${e.message}`); }
  }
  console.log(`Originaler lagret: /tmp/orig_1..${bilder.length}.jpg`);
  // Kjør styling på valgte
  for (const nr of hvilke) {
    const url = bilder[nr - 1];
    if (!url) { console.log(`Bilde ${nr} finnes ikke`); continue; }
    const t0 = Date.now();
    try {
      const res = await stilBilde(url, 'optimal');
      const fil = lagre(res.dataUrl || res, `/tmp/stylet_${nr}`);
      console.log(`Bilde ${nr}: stylet på ${Math.round((Date.now() - t0) / 1000)}s → ${fil}`);
    } catch (e) {
      console.log(`Bilde ${nr}: FEILET etter ${Math.round((Date.now() - t0) / 1000)}s — ${e.message}`);
    }
  }
  await c.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
