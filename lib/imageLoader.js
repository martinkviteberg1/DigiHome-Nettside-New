// Egendefinert next/image-loader for DigiHome.
//
// HVORFOR: Appen kjorer som Next.js `output: 'standalone'`, som IKKE inkluderer
// /public paa disk i produksjon. Standard-optimalisereren (/_next/image) leser
// kildebildet fra filsystemet og ville derfor 404-e i prod. Vaare statiske
// bilder serveres i stedet fra Emergent-objektlagring via /api/media, som naa
// ogsaa stotter on-the-fly resizing/re-encoding med sharp (?w=&q=).
//
// Denne loaderen lar derfor next/image generere ekte responsive srcset-er som
// peker paa /api/media — fungerer identisk lokalt og i standalone-prod.
// Eksterne bilder (unsplash/pexels), data:- og blob:-URL-er og allerede
// ferdige /api-URL-er sendes uendret videre.
export default function dhImageLoader({ src, width, quality }) {
  if (!src) return src;
  if (/^(https?:|data:|blob:)/i.test(src) || src.startsWith('/api/')) return src;
  const path = src.replace(/^\/+/, '');
  const q = quality || 72;
  return `/api/media/${path}?w=${width}&q=${q}`;
}
