/* ─────────────────────────────────────────────────────────────────────────────
   KLIENT-CACHE — stale-while-revalidate for investorportalen.

   Problemet: hver fanebytting remonterer komponentene → skeleton + nytt
   API-kall, selv om dataene ble hentet for tre sekunder siden. Det føles tregt.

   Løsningen: en enkel modul-cache (lever så lenge fanen er åpen).
     · cacheLes(key)          → siste kjente data, umiddelbart (eller undefined)
     · cacheHent(key, url)    → dedupet fetch; innen TTL returneres cachen
                                uten nettverkskall, ellers hentes ferskt og
                                cachen oppdateres. Kun 2xx-svar caches.
     · force: true            → hopp over TTL (brukes etter skriveoperasjoner)

   Mønster i komponentene:
     const [data, setData] = useState(() => cacheLes('nøkkel') || null);
     const [laster, setLaster] = useState(() => !cacheLes('nøkkel'));
     useEffect(() => { cacheHent('nøkkel', url).then(setData).finally(...) }, []);

   → Første besøk viser skeleton som før; alle senere besøk rendres momentant
     fra cache og oppdateres stille i bakgrunnen.
   ──────────────────────────────────────────────────────────────────────────── */

const cache = new Map(); // key -> { data, ts }
const pending = new Map(); // key -> Promise (dedupe parallelle kall)

/* sessionStorage-lag: minnecachen dør ved refresh/direktelenke (typisk
   investoradferd fra e-post) — persister derfor per fane, slik at også en
   full sideinnlasting rendres momentant fra sist kjente data og revaliderer
   stille. Try/catch overalt: privat modus/kvote skal aldri knekke noe. */
const SS_PREFIX = 'dh-cache:';
const harSS = () => typeof window !== 'undefined' && !!window.sessionStorage;

function ssLes(key) {
  if (!harSS()) return undefined;
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + key);
    if (!raw) return undefined;
    const hit = JSON.parse(raw);
    return (hit && typeof hit === 'object' && 'data' in hit) ? hit : undefined;
  } catch (e) { return undefined; }
}

function ssSkriv(key, hit) {
  if (!harSS()) return;
  try { sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(hit)); } catch (e) { /* kvote/privat modus */ }
}

function settBegge(key, hit) {
  cache.set(key, hit);
  ssSkriv(key, hit);
}

export function cacheLes(key) {
  const hit = cache.get(key);
  if (hit) return hit.data;
  const ss = ssLes(key);
  if (ss) { cache.set(key, ss); return ss.data; } // hydrer minnecachen
  return undefined;
}

export function cacheSkriv(key, data) {
  settBegge(key, { data, ts: Date.now() });
}

export function cacheSlett(prefix = '') {
  for (const k of Array.from(cache.keys())) if (k.startsWith(prefix)) cache.delete(k);
  if (!harSS()) return;
  try {
    for (const k of Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i))) {
      if (k && k.startsWith(SS_PREFIX + prefix)) sessionStorage.removeItem(k);
    }
  } catch (e) { /* best effort */ }
}

export async function cacheHent(key, kilde, { ttl = 15000, force = false } = {}) {
  const hit = cache.get(key) || ssLes(key);
  if (!force && hit && Date.now() - hit.ts < ttl) { cache.set(key, hit); return hit.data; }
  if (pending.has(key)) return pending.get(key);
  const p = (typeof kilde === 'function'
    ? Promise.resolve().then(kilde)
    : fetch(kilde).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        return j;
      }))
    .then((j) => { settBegge(key, { data: j, ts: Date.now() }); pending.delete(key); return j; })
    .catch((e) => { pending.delete(key); throw e; });
  pending.set(key, p);
  return p;
}
