#!/usr/bin/env node
/**
 * Bildeoptimalisering for hovedsiden (sharp).
 * Konverterer tunge raster-bilder til komprimert WebP (+ valgfri resize).
 * Deck/film-assets røres IKKE (sensitive for render-scriptene).
 *
 * Kjør:  node scripts/optimize-images.mjs
 */
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const PUBLIC = path.resolve(process.cwd(), 'public');

// [kilde, ut, maxBredde, kvalitet]
const JOBS = [
  ['showcase-apartment.jpg', 'showcase-apartment.webp', 1400, 80],
];

async function main() {
  for (const [src, out, maxW, q] of JOBS) {
    const srcPath = path.join(PUBLIC, src);
    const outPath = path.join(PUBLIC, out);
    if (!fs.existsSync(srcPath)) { console.log(`  ⚠ mangler ${src}`); continue; }
    const before = fs.statSync(srcPath).size;
    const meta = await sharp(srcPath).metadata();
    let pipe = sharp(srcPath);
    if (meta.width > maxW) pipe = pipe.resize({ width: maxW, withoutEnlargement: true });
    await pipe.webp({ quality: q, effort: 5 }).toFile(outPath);
    const after = fs.statSync(outPath).size;
    console.log(`  ✓ ${src} (${(before/1024).toFixed(0)}KB ${meta.width}px) → ${out} (${(after/1024).toFixed(0)}KB, q${q})  −${(100*(1-after/before)).toFixed(0)}%`);
  }
}
main();
