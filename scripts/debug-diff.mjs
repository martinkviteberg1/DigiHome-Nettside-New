// Diagnose: hvorfor ser før/etter identisk ut på Stormyrvegen 2?
// 1) Hvilken stil ble brukt? 2) Hva er møbleringsfeltet? 3) Be Gemini beskrive
// konkrete forskjeller mellom original og AI-versjon.
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

async function main() {
  const c = new MongoClient(process.env.MONGO_URL); await c.connect();
  const db = c.db(process.env.DB_NAME);
  const lead = await db.collection('salgsradar_leads').findOne({ adresse: /Stormyr/i });
  if (!lead) { console.log('Fant ikke lead'); process.exit(1); }
  console.log('LEAD:', lead.adresse, '| mobler-felt:', JSON.stringify(lead.mobler || null), '| ai:', lead.ai ? 'ja' : 'nei', '| auto:', JSON.stringify(lead.auto || null).slice(0, 120));
  const bilder = await db.collection('salgsradar_bilder').find({ leadId: lead.id }).toArray();
  console.log('STYLEDE BILDER:', bilder.length);
  for (const b of bilder) console.log(' -', b.stil, '| kilde:', (b.kildeUrl || '').slice(-40), '| dataUrl-lengde:', (b.dataUrl || b.data || '').length);
  const b0 = bilder[0];
  if (!b0) { console.log('Ingen stylede bilder å sammenligne'); await c.close(); return; }
  const aiUrl = b0.dataUrl || b0.data;
  // Hent original
  const orig = await fetch(b0.kildeUrl);
  const type = (orig.headers.get('content-type') || 'image/jpeg').split(';')[0];
  const buf = Buffer.from(await orig.arrayBuffer());
  console.log('Original:', type, (buf.length / 1024).toFixed(0) + 'KB', '| AI-versjon:', (aiUrl.length * 0.75 / 1024).toFixed(0) + 'KB (ca)');
  // Be Gemini om konkret differanse
  const r = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.EMERGENT_LLM_KEY}` },
    body: JSON.stringify({
      model: 'gemini/gemini-2.5-flash',
      messages: [{ role: 'user', content: [
        { type: 'text', text: 'Bilde 1 er original, bilde 2 er en AI-behandlet versjon. List KONKRETE visuelle forskjeller (lys, hvitbalanse, eksponering, fjernede/lagt til gjenstander, skarphet). Hvis de er tilnærmet identiske, si det rett ut. Maks 6 korte punkter på norsk.' },
        { type: 'image_url', image_url: { url: `data:${type};base64,${buf.toString('base64')}` } },
        { type: 'image_url', image_url: { url: aiUrl } },
      ] }],
      temperature: 0.2,
    }),
  });
  const body = await r.json().catch(() => ({}));
  console.log('\nGEMINI-DIFF (http ' + r.status + '):\n' + (body?.choices?.[0]?.message?.content || JSON.stringify(body).slice(0, 300)));
  await c.close();
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
