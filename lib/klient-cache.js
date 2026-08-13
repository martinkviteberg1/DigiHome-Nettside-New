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

export function cacheLes(key) {
  const hit = cache.get(key);
  return hit ? hit.data : undefined;
}

export function cacheSkriv(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

export function cacheSlett(prefix = '') {
  for (const k of Array.from(cache.keys())) if (k.startsWith(prefix)) cache.delete(k);
}

export async function cacheHent(key, kilde, { ttl = 15000, force = false } = {}) {
  const hit = cache.get(key);
  if (!force && hit && Date.now() - hit.ts < ttl) return hit.data;
  if (pending.has(key)) return pending.get(key);
  const p = (typeof kilde === 'function'
    ? Promise.resolve().then(kilde)
    : fetch(kilde).then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        return j;
      }))
    .then((j) => { cache.set(key, { data: j, ts: Date.now() }); pending.delete(key); return j; })
    .catch((e) => { pending.delete(key); throw e; });
  pending.set(key, p);
  return p;
}
