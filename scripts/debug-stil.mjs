// Diagnostikk: kaller Emergent LLM-proxy (gemini-2.5-flash-image) sekvensielt
// med ekte FINN-bilder fra en eksisterende lead og logger KUN strukturen på
// svaret (aldri nøkler, aldri bildeinnhold). Formål: finne ut hvorfor 4/5
// auto-stylinger feiler med «AI-en returnerte ikke et bilde».
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
for (const line of readFileSync('/app/.env', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const PROMPT = 'Forbedre dette boligfotoet slik en profesjonell eiendomsfotograf og stylist ville gjort på stedet — til bruk i en FINN-annonse. GJØR (kun enkle, realistiske grep): re opp senger med glatte dyner, rette laken og pene puter; rydd flater og fjern rot, småting, ledninger, personlige eiendeler og toalettsaker; rett opp skjeve gjenstander, og legg gjerne på 1-2 pynteputer eller et pent brettet pledd; løft lyset med naturlig dagslys fra vinduene, jevn eksponering, korrekt hvitbalanse og klare men naturlige farger — som et profesjonelt HDR-boligfoto. IKKE RØR: møblene som står der (samme sofa, seng og bord — bare ryddet og rettet), arkitektur, kameravinkel, perspektiv, vinduer, dører, gulv, vegger, kjøkken og bad. Ingen nye møbler, ingen personer, tekst, logoer eller vannmerker. Rommet skal være umiddelbart gjenkjennbart for den som bor der. Fotorealistisk.';

function shape(v, depth = 0) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return `arr(${v.length})${v.length && depth < 4 ? `[${shape(v[0], depth + 1)}]` : ''}`;
  const t = typeof v;
  if (t === 'string') return `str(${v.length})"${v.slice(0, 40).replace(/\n/g, ' ')}"`;
  if (t === 'object' && depth < 4) return `{${Object.keys(v).map((k) => `${k}:${shape(v[k], depth + 1)}`).join(', ')}}`;
  return t;
}

async function main() {
  const key = process.env.EMERGENT_LLM_KEY;
  if (!key) { console.log('MANGLER KEY'); process.exit(1); }
  const client = new MongoClient(process.env.MONGO_URL);
  await client.connect();
  const db = client.db(process.env.DB_NAME);
  const lead = await db.collection('salgsradar_leads').findOne({ 'bilder.4': { $exists: true } }, { sort: { updatedAt: -1 } });
  if (!lead) { console.log('Ingen lead med 5+ bilder funnet'); process.exit(1); }
  console.log(`Lead: ${lead.id.slice(0, 8)}… bilder=${lead.bilder.length} adresse-len=${(lead.adresse || '').length}`);
  const bilder = lead.bilder.slice(0, 5);
  for (let i = 0; i < bilder.length; i++) {
    const t0 = Date.now();
    try {
      const ir = await fetch(bilder[i], { headers: { Accept: 'image/jpeg,image/png,image/webp' } });
      const type = (ir.headers.get('content-type') || 'image/jpeg').split(';')[0];
      const buf = Buffer.from(await ir.arrayBuffer());
      console.log(`\n[${i}] kilde: ${type} ${(buf.length / 1024).toFixed(0)}KB status=${ir.status}`);
      const r = await fetch('https://integrations.emergentagent.com/llm/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: 'gemini/gemini-2.5-flash-image',
          messages: [{ role: 'user', content: [
            { type: 'text', text: PROMPT },
            { type: 'image_url', image_url: { url: `data:${type};base64,${buf.toString('base64')}` } },
          ] }],
          modalities: ['image', 'text'],
        }),
      });
      const raw = await r.text();
      let body = {};
      try { body = JSON.parse(raw); } catch (e) { console.log(`[${i}] IKKE JSON (${raw.length} tegn): "${raw.slice(0, 120)}"`); }
      const msg = body?.choices?.[0]?.message;
      const fr = body?.choices?.[0]?.finish_reason;
      console.log(`[${i}] http=${r.status} tid=${((Date.now() - t0) / 1000).toFixed(1)}s finish=${fr}`);
      if (!r.ok) { console.log(`[${i}] FEIL-BODY: ${shape(body)}`); continue; }
      if (!msg) { console.log(`[${i}] INGEN message. body-shape: ${shape(body)}`); continue; }
      console.log(`[${i}] message-keys: ${Object.keys(msg).join(',')}`);
      if (msg.images) {
        console.log(`[${i}] images: ${shape(msg.images)}`);
        const u = msg.images?.[0]?.image_url?.url;
        console.log(`[${i}] images[0].image_url.url prefix: ${u ? u.slice(0, 30) : 'MANGLER'}`);
      } else {
        console.log(`[${i}] INGEN images-felt!`);
      }
      if (msg.content != null) {
        const c = msg.content;
        if (typeof c === 'string') console.log(`[${i}] content: str(${c.length}) "${c.slice(0, 80).replace(/\n/g, ' ')}"`);
        else console.log(`[${i}] content-shape: ${shape(c)}`);
      }
    } catch (e) {
      console.log(`[${i}] EXCEPTION etter ${((Date.now() - t0) / 1000).toFixed(1)}s: ${String(e.message || e).slice(0, 160)}`);
    }
  }
  await client.close();
  console.log('\nFERDIG');
}
main().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
