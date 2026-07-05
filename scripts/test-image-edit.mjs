// Funksjonstest: støtter Emergent-endepunktet bilde-til-bilde (edits) for Nano Banana?
import fs from 'fs';
import sharp from 'sharp';

const KEY = process.env.EMERGENT_LLM_KEY;
const run = async () => {
  // Lag et lite 1:1 testbilde (512px, gradient med sirkel i midten)
  const svg = `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="#e8f4f8"/>
    <circle cx="256" cy="256" r="120" fill="#2c5f7c"/>
    <rect y="400" width="512" height="112" fill="#94c9a9"/>
  </svg>`;
  const buf = await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toBuffer();
  console.log('Testbilde:', buf.length, 'bytes');

  for (const model of ['gemini/gemini-3-pro-image-preview', 'gemini/gemini-2.5-flash-image']) {
    try {
      const form = new FormData();
      form.append('model', model);
      form.append('prompt', 'Extend this square image into a vertical 9:16 composition. Keep the dark blue circle exactly as-is in the center, extend the light blue sky upward and the green ground downward seamlessly.');
      form.append('image', new Blob([buf], { type: 'image/jpeg' }), 'source.jpg');
      // n ikke støttet for gemini
      const t0 = Date.now();
      const res = await fetch('https://integrations.emergentagent.com/llm/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}` },
        body: form,
      });
      const ms = Date.now() - t0;
      const text = await res.text();
      let j = null; try { j = JSON.parse(text); } catch (e) {}
      const b64 = j?.data?.[0]?.b64_json;
      console.log(`\n=== ${model} → HTTP ${res.status} (${ms}ms)`);
      if (b64) {
        const out = Buffer.from(b64, 'base64');
        const meta = await sharp(out).metadata();
        fs.writeFileSync(`/tmp/edit-test-${model.split('/')[1]}.jpg`, out);
        console.log(`STØTTET! Resultat: ${meta.width}x${meta.height} (${(meta.width / meta.height).toFixed(2)}), ${out.length} bytes`);
      } else {
        console.log('IKKE STØTTET / feil:', text.slice(0, 400));
      }
    } catch (e) {
      console.log(`\n=== ${model} → EXCEPTION:`, e.message);
    }
  }
};
run();
