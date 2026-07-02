// ---------------------------------------------------------------------------
// SerpApi — Google Ads Transparency Center (konkurrentens faktiske annonser).
// VIKTIG LÆRDOM (testet live): `text` MÅ være DOMENET (utleiemegleren.no),
// ikke merkenavnet — navnesøk gir 0 treff. Annonsene inkluderer `image`
// (tpc.googlesyndication.com-arkiv) direkte, så details-kall trengs sjelden.
// Tidsstempler er UNIX-epoch (sekunder).
// KVOTE-BEVISST: gratisplanen har ~100 søk/mnd → 7-dagers cache i Mongo.
// ---------------------------------------------------------------------------

const ENDPOINT = 'https://serpapi.com/search.json';
const REGION_NO = '2578';
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const NO_RESULTS_RE = /hasn't returned any results/i;

export function serpApiConfigured() {
  return !!process.env.SERPAPI_KEY;
}

async function serpFetch(params) {
  const u = new URL(ENDPOINT);
  const all = { api_key: process.env.SERPAPI_KEY, ...params };
  for (const [k, v] of Object.entries(all)) {
    if (v != null && v !== '') u.searchParams.set(k, String(v));
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(u.toString(), { signal: ctrl.signal });
    const j = await res.json().catch(() => ({}));
    if (j.error && NO_RESULTS_RE.test(j.error)) return { __empty: true }; // tomt ≠ feil
    if (!res.ok || j.error) throw new Error(j.error || `SerpApi HTTP ${res.status}`);
    return j;
  } finally { clearTimeout(t); }
}

const s = (v, n = 400) => (v == null ? null : String(v).slice(0, n));
const epochToIso = (v) => {
  const n = Number(v);
  if (!isFinite(n) || n <= 0) return null;
  try { return new Date(n * 1000).toISOString().slice(0, 10); } catch (e) { return null; }
};

function normalizeAd(ad) {
  return {
    id: s(ad.ad_creative_id || ad.creative_id || ad.id, 120),
    advertiserId: s(ad.advertiser_id, 120),
    advertiser: s(ad.advertiser, 200),
    format: s((ad.format || 'ukjent').toString().toLowerCase(), 20), // text | image | video
    text: s(ad.text || ad.ad_text || ad.title, 500),
    image: s(ad.image || ad.image_url || ad.thumbnail, 1000),
    video: s(ad.video || ad.video_url, 1000),
    width: ad.width != null ? Number(ad.width) : null,
    height: ad.height != null ? Number(ad.height) : null,
    link: s(ad.link, 1200),
    detailsLink: s(ad.details_link, 1200), // adstransparency.google.com
    targetDomain: s(ad.target_domain || ad.domain, 200),
    firstShown: epochToIso(ad.first_shown) || s(ad.first_shown, 40),
    lastShown: epochToIso(ad.last_shown) || s(ad.last_shown, 40),
    totalDaysShown: ad.total_days_shown != null ? Number(ad.total_days_shown) : null,
  };
}

// Gjett domene fra konkurrentnavn: «Utleiemegleren» → «utleiemegleren.no».
function domainCandidates(name) {
  const raw = (name || '').trim().toLowerCase();
  if (/\.[a-z]{2,}$/.test(raw)) return [raw]; // allerede et domene
  const slug = raw.replace(/\s*(as|asa)$/i, '').replace(/[^a-z0-9]/g, '');
  return [`${slug}.no`, raw];
}

export async function fetchCompetitorGallery(db, { competitor, region = REGION_NO, force = false, detailsBudget = 4 } = {}) {
  if (!serpApiConfigured()) return { ok: false, configured: false, error: 'SERPAPI_KEY mangler' };
  const name = (competitor || '').trim();
  if (!name) return { ok: false, error: 'Konkurrentnavn mangler' };

  const coll = db.collection('serpapi_gallery_cache');
  const cacheKey = { competitor: name.toLowerCase(), region: String(region) };

  if (!force) {
    const hit = await coll.findOne(cacheKey);
    if (hit && Date.now() - new Date(hit.fetchedAt).getTime() < CACHE_TTL_MS) {
      return {
        ok: true, configured: true, source: 'cache', competitor: name,
        advertiser: hit.advertiser || null, ads: hit.ads || [],
        fetchedAt: hit.fetchedAt, searchesUsed: 0,
      };
    }
  }

  let searchesUsed = 0;
  let ads = [];

  // Prøv domene-kandidater (domenesøk er det som faktisk gir treff).
  for (const cand of domainCandidates(name)) {
    const j = await serpFetch({ engine: 'google_ads_transparency_center', text: cand, region, num: 100 });
    searchesUsed++;
    if (j.__empty) continue;
    ads = (j.ad_creatives || j.ads || []).map(normalizeAd);
    if (ads.length) break;
  }

  // Regionfilteret kan være for smalt — fall tilbake til globalt søk.
  if (!ads.length && region) {
    for (const cand of domainCandidates(name)) {
      const j = await serpFetch({ engine: 'google_ads_transparency_center', text: cand, num: 100 });
      searchesUsed++;
      if (j.__empty) continue;
      ads = (j.ad_creatives || j.ads || []).map(normalizeAd);
      if (ads.length) break;
    }
  }

  // Dedup + sorter: lengst kjørte først (= konkurrentens bevist beste annonser).
  const seen = new Set();
  ads = ads.filter((a) => {
    const k = a.id || a.link || JSON.stringify([a.text, a.firstShown]);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  ads.sort((a, b) => (b.totalDaysShown || 0) - (a.totalDaysShown || 0));

  const advertiser = ads.length ? {
    id: ads[0].advertiserId || null,
    name: ads[0].advertiser || name,
    adsCount: ads.length,
  } : null;

  // Direkte media for et fåtall annonser uten bilde (1 søk per annonse — sjelden nødvendig).
  const needMedia = ads.filter((a) => !a.image && !a.video && a.link).slice(0, detailsBudget);
  for (const a of needMedia) {
    try {
      const det = await serpFetch({ engine: 'google_ads_transparency_center_ad_details', link: a.link, region });
      searchesUsed++;
      if (det.__empty) continue;
      const media = det.media || det.ad_details || {};
      const url = media.url || media.src || det.image || det.video || null;
      if (url && /youtube|\.mp4|video/i.test(String(url))) a.video = s(url, 1000);
      else if (url) a.image = s(url, 1000);
    } catch (e) { /* galleriet virker uten */ }
  }

  const fetchedAt = new Date().toISOString();
  if (ads.length) {
    await coll.updateOne(cacheKey, { $set: { ...cacheKey, advertiser, ads, fetchedAt, searchesUsed } }, { upsert: true });
  }

  return {
    ok: true, configured: true, source: 'serpapi', competitor: name,
    advertiser, ads, fetchedAt, searchesUsed,
    ...(ads.length ? {} : { note: 'Ingen annonser funnet — prøv å søke med konkurrentens domene (f.eks. utleiemegleren.no).' }),
  };
}
