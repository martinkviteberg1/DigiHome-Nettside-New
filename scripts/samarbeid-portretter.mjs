#!/usr/bin/env node
/**
 * Lager 600 px brede WebP-varianter av portrettene som brukes i den private invitasjonen (/samarbeid),
 * slik at laget og hero-stripen kan bruke srcset (600w for kort/mobil, originalen for store skjermer).
 * Idempotent: skriver bare når varianten mangler eller originalen er nyere.
 *
 * Kjør:  node scripts/samarbeid-portretter.mjs
 * Deretter (prod serverer /public via objektlagring/standalone-trace):
 *        node scripts/upload_public_to_storage.mjs --only team/,v4/martin-600.webp,brand/sarah-sleeman-600.webp
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const ROOT = process.cwd();
const PUB = path.join(ROOT, 'public');
const WIDTH = 600;
const QUALITY = 82;

const KILDER = [
  'team/martin-vikesland.webp',
  'team/oyvind-storli-hoel.webp',
  'team/jens-petter-glittenberg.webp',
  'team/kevin-ai-v2.webp',
  'v4/martin.webp',
  'brand/sarah-sleeman-1000.webp',
];

const variantNavn = (rel) => rel.replace(/-1000\.webp$/, '.webp').replace(/\.webp$/, `-${WIDTH}.webp`);

for (const rel of KILDER) {
  const src = path.join(PUB, rel);
  const out = path.join(PUB, variantNavn(rel));
  if (!fs.existsSync(src)) { console.error(`  ✗ mangler: ${rel}`); continue; }
  const fersk = fs.existsSync(out) && fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs;
  if (fersk) { console.log(`  = ${path.relative(PUB, out)} (uendret)`); continue; }
  const meta = await sharp(src).metadata();
  const buf = await sharp(src).rotate().resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY, effort: 6 }).toBuffer();
  fs.writeFileSync(out, buf);
  console.log(`  ✓ ${path.relative(PUB, out)}  ${meta.width}x${meta.height} → ${WIDTH}w, ${(buf.length / 1024).toFixed(0)} KB (original ${(fs.statSync(src).size / 1024).toFixed(0)} KB)`);
}
