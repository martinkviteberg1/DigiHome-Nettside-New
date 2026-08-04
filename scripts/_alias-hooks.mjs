import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

const ROOT = '/app/';

// '@/lib/email' → /app/lib/email.js. Vi prøver de samme endelsene Next gjør,
// i samme rekkefølge, slik at en probe laster NØYAKTIG samme fil som appen.
export async function resolve(specifier, context, next) {
  if (specifier.startsWith('@/')) {
    const base = ROOT + specifier.slice(2);
    for (const cand of [base, `${base}.js`, `${base}.mjs`, `${base}.jsx`, `${base}/index.js`]) {
      try {
        if (fs.statSync(cand).isFile()) return next(pathToFileURL(cand).href, context);
      } catch (e) { /* prøv neste endelse */ }
    }
  }
  return next(specifier, context);
}
