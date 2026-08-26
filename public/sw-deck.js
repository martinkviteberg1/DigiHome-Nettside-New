// ── Offline-sikring for /bergen-urban-decket ──
// Nettverk først, cache som fallback: presentasjonen er alltid fersk når
// nettet er oppe, og overlever nettbrudd/reload når det er nede.
// Scope er begrenset til /bergen-urban — resten av appen berøres ikke.

const CACHE = 'bu-deck-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((navn) => Promise.all(navn.filter((k) => k.startsWith('bu-deck-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const egenOrigin = url.origin === self.location.origin;
  const kjentBildeCdn = /(^|\.)((images\.unsplash\.com)|(images\.pexels\.com)|(fonts\.(googleapis|gstatic)\.com))$/.test(url.hostname);
  if (!egenOrigin && !kjentBildeCdn) return;
  // Ikke rør API-kall — kun statiske ressurser og selve siden
  if (egenOrigin && url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === 'opaque')) {
          const kopi = res.clone();
          caches.open(CACHE).then((c) => c.put(req, kopi)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((treff) => {
          if (treff) return treff;
          // Navigasjon uten nett: server sist kjente utgave av decket
          if (req.mode === 'navigate') return caches.match('/bergen-urban');
          return Response.error();
        })
      )
  );
});
