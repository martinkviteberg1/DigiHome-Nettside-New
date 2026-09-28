import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export async function resolve(specifier, context, nextResolve) {
  // '@/lib/x' → /app/lib/x
  let spec = specifier;
  if (spec.startsWith('@/')) spec = new URL(`../${spec.slice(2)}`, import.meta.url).href;
  try {
    return await nextResolve(spec, context);
  } catch (e) {
    if (e.code !== 'ERR_MODULE_NOT_FOUND') throw e;
    const base = spec.startsWith('.') || spec.startsWith('file:') ? new URL(spec, context.parentURL) : null;
    if (base) {
      for (const ext of ['.js', '.mjs', '/index.js']) {
        const kandidat = new URL(`${base.href}${ext}`);
        if (existsSync(fileURLToPath(kandidat))) return nextResolve(kandidat.href, context);
      }
    }
    throw e;
  }
}
