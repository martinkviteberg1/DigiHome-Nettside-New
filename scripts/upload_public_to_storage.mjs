#!/usr/bin/env node
/**
 * Engangs-/idempotent opplasting av hele /public til Emergent objektlagring.
 * Filene legges under `digihome/public/<relativ-sti>` med riktig Content-Type,
 * slik at backend (`/api/media/...`) kan servere dem i produksjon der Next.js
 * standalone ikke inkluderer /public-mappen.
 *
 * Kjør:  node scripts/upload_public_to_storage.mjs
 *        node scripts/upload_public_to_storage.mjs --only film,brand   (delmengde)
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(ROOT, 'public');
const STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage';
const PUBLIC_PREFIX = 'digihome/public';

// --- last EMERGENT_LLM_KEY fra .env ---
function loadEnvKey() {
  if (process.env.EMERGENT_LLM_KEY) return process.env.EMERGENT_LLM_KEY;
  try {
    const env = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of env.split('\n')) {
      const m = line.match(/^\s*EMERGENT_LLM_KEY\s*=\s*"?([^"\n]+)"?/);
      if (m) return m[1].trim();
    }
  } catch (e) {}
  return null;
}

const CONTENT_TYPES = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.aac': 'audio/aac',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml',
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
};

function ctFor(file) {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

function walk(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

let _key = null;
async function storageKey(emergentKey) {
  if (_key) return _key;
  const r = await fetch(`${STORAGE_URL}/init`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emergent_key: emergentKey }),
  });
  if (!r.ok) throw new Error(`init feilet: ${r.status} ${await r.text()}`);
  _key = (await r.json()).storage_key;
  return _key;
}

async function main() {
  const emergentKey = loadEnvKey();
  if (!emergentKey) { console.error('EMERGENT_LLM_KEY mangler i miljø/.env'); process.exit(1); }

  const onlyArg = process.argv.find((a) => a.startsWith('--only'));
  const only = onlyArg ? (process.argv[process.argv.indexOf(onlyArg) + 1] || '').split(',').filter(Boolean) : null;

  let files = walk(PUBLIC_DIR);
  if (only && only.length) {
    files = files.filter((f) => only.some((o) => path.relative(PUBLIC_DIR, f).startsWith(o)));
  }

  console.log(`Laster opp ${files.length} filer til ${PUBLIC_PREFIX}/ ...`);
  let ok = 0, fail = 0;
  for (const file of files) {
    const rel = path.relative(PUBLIC_DIR, file).split(path.sep).join('/');
    const objPath = `${PUBLIC_PREFIX}/${rel}`;
    const body = fs.readFileSync(file);
    const ct = ctFor(file);
    try {
      const key = await storageKey(emergentKey);
      const r = await fetch(`${STORAGE_URL}/objects/${objPath}`, {
        method: 'PUT', headers: { 'X-Storage-Key': key, 'Content-Type': ct }, body,
      });
      if (r.status === 403) { _key = null; const k2 = await storageKey(emergentKey);
        const r2 = await fetch(`${STORAGE_URL}/objects/${objPath}`, { method: 'PUT', headers: { 'X-Storage-Key': k2, 'Content-Type': ct }, body });
        if (!r2.ok) throw new Error(`${r2.status}`);
      } else if (!r.ok) { throw new Error(`${r.status} ${await r.text()}`); }
      ok++;
      console.log(`  ✓ ${rel}  (${ct}, ${(body.length / 1024).toFixed(0)}KB)`);
    } catch (e) {
      fail++;
      console.error(`  ✗ ${rel} — ${e.message}`);
    }
  }
  console.log(`\nFerdig: ${ok} opplastet, ${fail} feilet.`);
  process.exit(fail ? 1 : 0);
}

main();
