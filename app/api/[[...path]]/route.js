import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { getDb, clean } from '@/lib/mongodb';
import { getObject, PUBLIC_PREFIX } from '@/lib/objectStorage';
import { isBot, buildEvent, ensureAnalyticsIndexes, computeAnalytics, computeLeadIntel } from '@/lib/analytics-server';
import { deriveChannel, serializeForLLM, computeWebVitals, detectAnomalies, computeLive } from '@/lib/analytics-server';
import { chatLLM } from '@/lib/llm';
import { slugify } from '@/lib/site';
import { getRentReport, refreshRentReport, RENT_CITIES } from '@/lib/rentmarket';

// --- Media-servering fra objektlagring (deploy-safe /public) ---
// Next.js standalone inkluderer ikke /public, så vi serverer bilder/video/lyd
// fra Emergent objektlagring via /api/media/<relativ-public-sti>.
const MEDIA_CONTENT_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', svg: 'image/svg+xml', avif: 'image/avif', ico: 'image/x-icon',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf',
  json: 'application/json', txt: 'text/plain', xml: 'application/xml',
  html: 'text/html', css: 'text/css', js: 'application/javascript',
};

function mediaContentType(rel, fallback) {
  const ext = (rel.split('.').pop() || '').toLowerCase();
  return MEDIA_CONTENT_TYPES[ext] || fallback || 'application/octet-stream';
}

// Serverer en fil fra objektlagring. Støtter HTTP Range (206) for video-seeking.
async function serveMedia(request, segments) {
  const rel = segments.join('/');
  if (!rel || rel.includes('..')) {
    return cors(NextResponse.json({ error: 'Ugyldig sti' }, { status: 400 }));
  }
  let obj;
  try {
    obj = await getObject(`${PUBLIC_PREFIX}/${rel}`);
  } catch (e) {
    // Lageret returnerer 500 for ikke-eksisterende objekter (ikke 404). For
    // mediaservering behandler vi enhver henting-feil som «ikke funnet» — det
    // er forventet nettleseroppførsel for en manglende statisk fil.
    return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
  }
  if (!obj) {
    return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
  }
  const contentType = mediaContentType(rel, obj.contentType);
  const total = obj.buffer.length;
  const baseHeaders = {
    'Content-Type': contentType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
    'Accept-Ranges': 'bytes',
  };

  const range = request.headers.get('range');
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    if (m) {
      let start = m[1] ? parseInt(m[1], 10) : 0;
      let end = m[2] ? parseInt(m[2], 10) : total - 1;
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end) || end >= total) end = total - 1;
      if (start > end || start >= total) {
        return new NextResponse(null, {
          status: 416,
          headers: { ...baseHeaders, 'Content-Range': `bytes */${total}` },
        });
      }
      const chunk = obj.buffer.subarray(start, end + 1);
      return new NextResponse(chunk, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${total}`,
          'Content-Length': String(chunk.length),
        },
      });
    }
  }

  return new NextResponse(obj.buffer, {
    status: 200,
    headers: { ...baseHeaders, 'Content-Length': String(total) },
  });
}

// Pitch-deck passord (sjekkes server-side). Cookie lagrer en sha256-token, ikke selve passordet.
const DECK_PASSWORD = process.env.DECK_PASSWORD || '';
function deckToken() {
  return crypto.createHash('sha256').update(`dh-deck::${DECK_PASSWORD}`).digest('hex');
}

// --- Miljøbasert ruting av lead-videresending ---
// Samme kodebase kjører i BÅDE test/preview og produksjon. Vi skiller miljøene
// DYNAMISK på NEXT_PUBLIC_BASE_URL (bakes inn per miljø ved bygg):
//   • preview/test  → test-CRM  (proposal-engine-37 ...)  — kun *.preview.emergentagent.com / localhost
//   • produksjon    → prod-CRM  (https://app.digihome.no)  — ALT annet (emergent.host-deploy OG custom domene digihome.no)
// Dette gjør at både Emergent-domenet (hero-premiere-4.emergent.host) og det
// kommende custom-domenet (digihome.no) automatisk regnes som produksjon.
const TEST_HOSTS = ['preview.emergentagent.com', 'localhost', '127.0.0.1'];

function isProdEnv() {
  const base = (process.env.NEXT_PUBLIC_BASE_URL || '').toLowerCase();
  if (!base) return false;                                  // ukjent base → trygg default = test
  return !TEST_HOSTS.some((h) => base.includes(h));         // ikke preview/lokalt ⇒ produksjon
}

// Returnerer { url, key, env } for riktig DigiHome-CRM basert på gjeldende miljø.
function normalizeCrmUrl(url) {
  let u = (url || '').trim();
  // app.digihome.no finnes ikke (DNS resolver kun digihome.no). Korriger en
  // eventuell utdatert/stale konfig automatisk, så vi aldri POSTer til en død vert.
  u = u.replace(/^https?:\/\/app\.digihome\.no/i, 'https://digihome.no');
  return u.replace(/\/+$/, '');
}
function digiHomeTarget() {
  if (isProdEnv()) {
    return {
      url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_PROD || 'https://digihome.no'),
      key: process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '',
      env: 'prod',
    };
  }
  return {
    url: normalizeCrmUrl(
      process.env.DIGIHOME_API_URL_TEST ||
      process.env.DIGIHOME_API_URL ||
      'https://proposal-engine-37.preview.emergentagent.com'
    ),
    key: process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY || '',
    env: 'test',
  };
}

// Videresend lead til DigiHome-plattformen (offentlige endepunkter, X-API-Key som id-kort).
// Best-effort med 8s timeout: feiler stille slik at brukeren alltid får kvittering (lagret lokalt).
// Plattformen auto-tilordner til standard/eneste tenant = «DigiHome AS».
async function forwardToDigiHome(path, payload) {
  const target = digiHomeTarget();
  if (!target.url) return { ok: false, error: 'DIGIHOME_API_URL mangler' };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${target.url}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(target.key ? { 'X-API-Key': target.key } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.ok && (data.success || data.ok)) {
      return { ok: true, id: (data.data && data.data.id) || null };
    }
    return { ok: false, error: `HTTP ${res.status}`, status: res.status };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e) };
  }
}

// --- Adressesøk (Geonorge) med in-memory cache + retry + timeout ---
// Gjør autofullføringen rask og robust: Geonorge svarer tidvis 500 (overbelastet),
// og uten cache blir hvert tastetrykk et fullt rundturskall. Vi cacher vellykkede
// svar (også legitime tom-treff), retry-er én gang ved feil, og aborterer trege kall.
const _addrCache = new Map(); // qLower -> { at, suggestions }
const ADDR_TTL_MS = 10 * 60 * 1000;
const ADDR_CACHE_MAX = 600;

async function geonorgeSearch(q) {
  const key = q.toLowerCase();
  const hit = _addrCache.get(key);
  if (hit && Date.now() - hit.at < ADDR_TTL_MS) return hit.suggestions;

  const url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}` +
    `&fuzzy=true&treffPerSide=6&side=0&asciiKompatibel=true` +
    `&filtrer=adresser.adressetekst,adresser.postnummer,adresser.poststed`;

  let suggestions = [];
  let ok = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 4000);
      const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) { if (attempt === 0) continue; break; }      // 500 → ett raskt retry
      const data = await r.json();
      const seen = new Set();
      suggestions = (data.adresser || [])
        .map((a) => {
          const text = a.adressetekst || '';
          const sub = `${a.postnummer || ''} ${a.poststed || ''}`.trim();
          return { text, sub, label: sub ? `${text}, ${sub}` : text };
        })
        .filter((s) => {
          if (!s.text || seen.has(s.label)) return false;
          seen.add(s.label);
          return true;
        });
      ok = true;
      break;
    } catch (e) {
      if (attempt === 0) continue;                            // timeout/nettfeil → ett retry
    }
  }

  // Cache KUN vellykkede svar (ikke feil/timeout — da vil vi prøve igjen neste tastetrykk).
  if (ok) {
    _addrCache.set(key, { at: Date.now(), suggestions });
    if (_addrCache.size > ADDR_CACHE_MAX) {
      const oldest = _addrCache.keys().next().value;
      _addrCache.delete(oldest);
    }
  }
  return suggestions;
}

const ADMIN_KEY = process.env.ADMIN_KEY || '';

// --- Finn-annonse forhåndsvisning (server-side scrape: og:-tags + nøkkelinfo) ---
const _finnCache = new Map();
const FINN_TTL_MS = 30 * 60 * 1000;
const FINN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isFinnUrl(u) {
  try { const x = new URL(u); return /(^|\.)finn\.no$/i.test(x.hostname); } catch (e) { return false; }
}

function decodeEntities(s) {
  return (s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function mapFinnPropertyType(raw) {
  const t = (raw || '').toLowerCase();
  if (!t) return '';
  if (t.includes('leilighet')) return 'leilighet';
  if (t.includes('hybel')) return 'hybel';
  if (t.includes('rekkehus') || t.includes('tomannsbolig') || t.includes('flermannsbolig')) return 'rekkehus';
  if (t.includes('enebolig') || t.includes('villa') || t.includes('hus') || t.includes('gård') || t.includes('gard')) return 'hus';
  return 'annet';
}

async function fetchFinnPreview(rawUrl) {
  const key = rawUrl.split('#')[0];
  const hit = _finnCache.get(key);
  if (hit && Date.now() - hit.at < FINN_TTL_MS) return hit.data;

  let htmlStr = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(key, {
        headers: { 'User-Agent': FINN_UA, 'Accept-Language': 'nb-NO,nb;q=0.9,en;q=0.8' },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!r.ok) { if (attempt === 0) continue; return { ok: false, error: `HTTP ${r.status}` }; }
      htmlStr = await r.text();
      break;
    } catch (e) { if (attempt === 0) continue; return { ok: false, error: 'fetch_failed' }; }
  }
  if (!htmlStr) return { ok: false, error: 'empty' };

  const meta = (prop) => {
    const m = new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']*)["']`, 'i').exec(htmlStr)
           || new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:${prop}["']`, 'i').exec(htmlStr);
    return m ? decodeEntities(m[1]).trim() : '';
  };
  const title = meta('title');
  const image = meta('image');
  const description = meta('description').slice(0, 240);

  // Strip HTML → tekst for nøkkelinfo (Boligtype/Soverom/Areal/Månedsleie)
  const text = decodeEntities(htmlStr.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  const num = (re) => { const m = re.exec(text); return m ? m[1].replace(/\s/g, '') : ''; };

  const bedrooms = num(/Soverom\s+(\d+)/);
  const sqm = num(/Prim[æa]rrom\s+(\d{1,4})\s*m/) || num(/Bruksareal\s+(\d{1,4})\s*m/) || num(/Bruttoareal\s+(\d{1,4})\s*m/);
  const rent = num(/M[åa]nedsleie\s+([\d\s]{2,9}?)\s*kr/);
  const ptRaw = (/Boligtype\s+([A-Za-zÆØÅæøå]+)/.exec(text) || [])[1] || '';
  const propertyType = mapFinnPropertyType(ptRaw);
  const kind = /\/lettings\//.test(key) || rent ? 'leie' : (/\/homes\//.test(key) ? 'salg' : '');

  const data = {
    ok: !!title,
    finnUrl: key, title, image, description, kind,
    propertyType, propertyTypeRaw: ptRaw,
    bedrooms: bedrooms || '', sqm: sqm || '', rent: rent || '',
  };
  if (data.ok) {
    _finnCache.set(key, { at: Date.now(), data });
    if (_finnCache.size > 300) _finnCache.delete(_finnCache.keys().next().value);
  }
  return data;
}

function adminAuthed(request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') || request.headers.get('x-admin-key') || '';
    return !!ADMIN_KEY && key === ADMIN_KEY;
  } catch (e) { return false; }
}

// Re-forward alle leads/tenants som ikke er videresendt (forwarded !== true)
async function reforwardPending(db) {
  const results = { leads: { tried: 0, ok: 0 }, tenants: { tried: 0, ok: 0 } };
  const pendLeads = await db.collection('leads').find({ forwarded: { $ne: true } }).limit(200).toArray();
  for (const lead of pendLeads) {
    results.leads.tried++;
    const fwd = await forwardToDigiHome('/api/leads', {
      name: lead.name, email: lead.email, phone: lead.phone, address: lead.address,
      postal_code: lead.postal_code, property_type: lead.property_type, rental_model: lead.rental_model,
      bedrooms: lead.bedrooms, sqm: lead.sqm, availability: lead.availability, lead_type: lead.lead_type,
      units: lead.units, num_properties: lead.num_properties, notes: lead.notes,
    });
    if (fwd.ok) results.leads.ok++;
    await db.collection('leads').updateOne({ id: lead.id }, { $set: {
      forwarded: fwd.ok, platform_id: fwd.id || null, forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
      forwarded_at: fwd.ok ? new Date().toISOString() : null,
    } });
  }
  const pendTenants = await db.collection('tenant_leads').find({ forwarded: { $ne: true } }).limit(200).toArray();
  for (const t of pendTenants) {
    results.tenants.tried++;
    const budgetStr = (t.budget_min || t.budget_max)
      ? `${t.budget_min || ''}${t.budget_min && t.budget_max ? '–' : ''}${t.budget_max || ''} kr`.trim() : '';
    const fwd = await forwardToDigiHome('/api/tenants', {
      name: t.name, email: t.email, phone: t.phone, desired_area: t.preferred_area, address: t.preferred_area,
      budget: budgetStr, bedrooms: t.bedrooms, move_in_date: t.move_in_date, message: t.notes,
      lead_type: 'leietaker', source: 'nettside',
    });
    if (fwd.ok) results.tenants.ok++;
    await db.collection('tenant_leads').updateOne({ id: t.id }, { $set: {
      forwarded: fwd.ok, platform_id: fwd.id || null, forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
      forwarded_at: fwd.ok ? new Date().toISOString() : null,
    } });
  }
  return results;
}

const RENTAL_LABELS = { dynamisk: 'Dynamisk', korttid: 'Korttid', kortid: 'Korttid', langtid: 'Langtid' };

function streetFromAddress(addr) {
  return (addr || '').split(',')[0].trim();
}

// Sanitér attribusjonsdata fra klienten (closed-loop: kobler lead → kilde/økt).
function sanitizeAttribution(a) {
  if (!a || typeof a !== 'object') return null;
  const s = (v, n = 160) => (v === undefined || v === null ? '' : String(v).slice(0, n));
  return {
    source: s(a.source, 120),
    medium: s(a.medium, 120),
    campaign: s(a.campaign),
    term: s(a.term),
    content: s(a.content),
    channel: s(a.channel, 40) || deriveChannel({ medium: s(a.medium, 120), source: s(a.source, 120), referrer: s(a.referrer, 400) }),
    referrer: s(a.referrer, 400),
    landing_page: s(a.landing_page || a.landing, 300),
    device: s(a.device, 20),
    country: s(a.country, 60),
    visitorId: s(a.visitorId, 60),
    sessionId: s(a.sessionId, 60),
  };
}

function normalizeListing(l) {
  const street = streetFromAddress(l.address);
  const title = (l.title && l.title.trim()) ? l.title.trim() : (street || `Bolig i ${l.city || 'Norge'}`);
  const rent = Number(l.monthly_rent) || 0;
  const images = Array.isArray(l.images) ? l.images.filter(Boolean) : [];
  return {
    id: l.id,
    url: l.public_url || '',
    title,
    city: l.city || '',
    street,
    sqm: Number(l.sqm) || null,
    bedrooms: Number(l.bedrooms) || null,
    bathrooms: Number(l.bathrooms) || null,
    rentalModel: (l.rental_model || '').toLowerCase(),
    rentalLabel: RENTAL_LABELS[(l.rental_model || '').toLowerCase()] || '',
    status: l.status || '',
    monthlyRent: rent,
    currency: l.currency || 'NOK',
    cover: l.cover_image || images[0] || null,
    images: images.slice(0, 8),
    imageCount: Number(l.image_count) || images.length,
  };
}

function cors(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  return response;
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }));
}

async function handleRoute(request, { params }) {
  const { path = [] } = params;
  const route = `/${path.join('/')}`;
  const method = request.method;

  try {
    // --- Media-servering fra objektlagring (/api/media/<sti>) ---
    if (path[0] === 'media' && method === 'GET') {
      return serveMedia(request, path.slice(1));
    }

    // --- Pitch-deck passord-gate (server-side; httpOnly cookie) ---
    if (route === '/deck/auth' && method === 'GET') {
      const token = request.cookies.get('dh_deck')?.value || '';
      const authed = !!DECK_PASSWORD && token === deckToken();
      return cors(NextResponse.json({ authed }));
    }
    if (route === '/deck/auth' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const pw = (body.password || '').toString();
      if (!DECK_PASSWORD || pw !== DECK_PASSWORD) {
        return cors(NextResponse.json({ ok: false, error: 'Feil passord' }, { status: 401 }));
      }
      const res = NextResponse.json({ ok: true });
      res.cookies.set('dh_deck', deckToken(), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 dager
        secure: true,
      });
      return cors(res);
    }

    // --- Miljø/ruting-info (verifisering: hvilket CRM får leads herfra?) ---
    if (route === '/lead-target' && method === 'GET') {
      const t = digiHomeTarget();
      return cors(NextResponse.json({
        env: t.env,
        url: t.url,
        keyConfigured: !!t.key,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || null,
      }));
    }

    // --- Adresse-autofullføring (Geonorge, gratis offentlig API, ingen nøkkel) ---
    if (route === '/address' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get('q') || '').trim();
      if (q.length < 3) return cors(NextResponse.json({ suggestions: [] }));
      const suggestions = await geonorgeSearch(q);
      const res = cors(NextResponse.json({ suggestions }));
      // La nettleseren cache identiske søk kort (rask gjentatt skriving/sletting).
      res.headers.set('Cache-Control', 'private, max-age=120');
      return res;
    }

    // --- Finn-annonse forhåndsvisning (valgfritt: huseier limer inn lenke) ---
    if (route === '/finn-preview' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const url = (searchParams.get('url') || '').trim();
      if (!url || !isFinnUrl(url)) {
        return cors(NextResponse.json({ ok: false, error: 'Lim inn en gyldig finn.no-lenke' }, { status: 400 }));
      }
      const data = await fetchFinnPreview(url);
      return cors(NextResponse.json(data));
    }

    // --- Boliger (proxy til DigiHome-plattformens public listings API) ---
    if (route === '/listings' && method === 'GET') {
      const { url: apiBase, key: apiKey } = digiHomeTarget();
      if (!apiBase || !apiKey) {
        return cors(NextResponse.json({ tenant: null, count: 0, listings: [], error: 'not_configured' }));
      }
      const { searchParams } = new URL(request.url);
      const limit = searchParams.get('limit') ?? '0';
      const status = searchParams.get('status') ?? 'published';
      try {
        const upstream = `${apiBase}/api/public/listings?limit=${encodeURIComponent(limit)}&status=${encodeURIComponent(status)}`;
        const r = await fetch(upstream, {
          headers: { 'X-API-Key': apiKey, Accept: 'application/json' },
          next: { revalidate: 600 },
        });
        if (!r.ok) {
          return cors(NextResponse.json({ tenant: null, count: 0, listings: [], error: `upstream_${r.status}` }));
        }
        const data = await r.json();
        const listings = Array.isArray(data.listings)
          ? data.listings.map(normalizeListing).filter((l) => l.cover)
          : [];
        return cors(NextResponse.json({ tenant: data.tenant || null, count: listings.length, listings }));
      } catch (e) {
        return cors(NextResponse.json({ tenant: null, count: 0, listings: [], error: 'fetch_failed' }));
      }
    }

    const db = await getDb();

    // Health
    if ((route === '/' || route === '/root') && method === 'GET') {
      return cors(NextResponse.json({ message: 'DigiHome API', ok: true }));
    }

    // --- Leiemarkedsrapport (offentlig): SSB + DigiHome etterspørselsindeks ---
    if (route === '/rentmarket' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const city = (searchParams.get('city') || 'bergen').toLowerCase();
      if (!RENT_CITIES[city]) {
        return cors(NextResponse.json({ error: 'Ukjent by' }, { status: 404 }));
      }
      try {
        const report = await getRentReport(city, { db });
        const res = cors(NextResponse.json({ report }));
        res.headers.set('Cache-Control', 'public, max-age=1800, stale-while-revalidate=86400');
        return res;
      } catch (e) {
        return cors(NextResponse.json({ error: 'Kunne ikke hente leiemarkedsdata' }, { status: 502 }));
      }
    }

    // --- Admin: leiemarkedsrapport (full) + metadata ---
    if (route === '/admin/rentmarket' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const city = (searchParams.get('city') || 'bergen').toLowerCase();
      if (!RENT_CITIES[city]) return cors(NextResponse.json({ error: 'Ukjent by' }, { status: 404 }));
      try {
        const report = await getRentReport(city, { db });
        const cities = Object.values(RENT_CITIES).map((c) => ({ slug: c.slug, label: c.label }));
        return cors(NextResponse.json({ report, cities }));
      } catch (e) {
        return cors(NextResponse.json({ error: (e && e.message) || 'Feil' }, { status: 502 }));
      }
    }

    // --- Admin: tving oppdatering fra SSB (inkl. AI-sammendrag) ---
    if (route === '/admin/rentmarket/refresh' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const city = (body.city || 'bergen').toString().toLowerCase();
      if (!RENT_CITIES[city]) return cors(NextResponse.json({ ok: false, error: 'Ukjent by' }, { status: 400 }));
      try {
        const report = await refreshRentReport(db, city);
        return cors(NextResponse.json({ ok: true, report }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: (e && e.message) || 'SSB utilgjengelig' }, { status: 502 }));
      }
    }

    // --- Analytics: førsteparts hendelses-inntak (offentlig, cookieless) ---
    // Bot-filtreres på user-agent. Feiler aldri hardt mot klienten.
    if (route === '/track' && method === 'POST') {
      try {
        const ua = request.headers.get('user-agent') || '';
        if (isBot(ua)) return cors(new NextResponse(null, { status: 204 }));
        let body = {};
        try { body = await request.json(); } catch (e) { body = {}; }
        const evt = buildEvent(body, ua);
        await db.collection('events').insertOne(evt);
        ensureAnalyticsIndexes(db); // fire-and-forget
        return cors(new NextResponse(null, { status: 204 }));
      } catch (e) {
        return cors(new NextResponse(null, { status: 204 }));
      }
    }

    // --- Leads (huseier/utleier-skjema) ---
    if (route === '/leads' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }

      const hasSomething = body.name || body.email || body.phone || body.address;
      if (!hasSomething) {
        return cors(NextResponse.json({ success: false, error: 'Mangler kontaktinformasjon' }, { status: 400 }));
      }

      const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
      const lead = {
        id: uuidv4(),
        name: (body.name || '').toString().slice(0, 200),
        email: (body.email || '').toString().slice(0, 200),
        phone: (body.phone || '').toString().slice(0, 60),
        address: (body.address || '').toString().slice(0, 300),
        postal_code: (body.postal_code || '').toString().slice(0, 20),
        property_type: (body.property_type || body.propertyType || '').toString().slice(0, 120),
        sqm: toNum(body.sqm),
        bedrooms: toNum(body.bedrooms),
        rental_model: (body.rental_model || '').toString().slice(0, 60),
        availability: (body.availability || '').toString().slice(0, 40),
        lead_type: (body.lead_type || 'huseier').toString().slice(0, 40),
        num_properties: toNum(body.num_properties) || 1,
        units: Array.isArray(body.units) ? body.units.slice(0, 25) : [],
        notes: (body.notes || body.message || '').toString().slice(0, 4000),
        finn_url: (body.finn_url || '').toString().slice(0, 600),
        source: (body.source || 'nettside').toString().slice(0, 60),
        attribution: sanitizeAttribution(body.attribution),
        status: 'new',
        forwarded: false,
        createdAt: new Date().toISOString(),
      };

      // Idempotens: stopp duplikater fra gjentatte klikk / nettverks-retry.
      // Identisk henvendelse (samme e-post/telefon + adresse + type) innen 5 min
      // regnes som duplikat → returner eksisterende uten ny insert/videresending.
      try {
        const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const idMatch = lead.email
          ? { email: lead.email }
          : (lead.phone ? { phone: lead.phone } : null);
        if (idMatch) {
          const dup = await db.collection('leads').findOne({
            ...idMatch,
            address: lead.address,
            lead_type: lead.lead_type,
            createdAt: { $gte: sinceIso },
          });
          if (dup) {
            return cors(NextResponse.json({
              success: true, ok: true, id: dup.id, deduped: true,
              forwarded: dup.forwarded === true, lead: clean(dup),
            }, { status: 200 }));
          }
        }
      } catch (e) { /* dedupe er best-effort; fall gjennom til normal insert */ }

      await db.collection('leads').insertOne(lead);

      // Inkluder Finn-lenken i notatet som videresendes, så CRM-teamet ser annonsen.
      const fwdNotes = lead.finn_url
        ? `${lead.notes ? lead.notes + '. ' : ''}Finn-annonse: ${lead.finn_url}`.slice(0, 4000)
        : lead.notes;

      // Dual-write: videresend til DigiHome-plattformen (DigiHome AS)
      const fwd = await forwardToDigiHome('/api/leads', {
        name: lead.name, email: lead.email, phone: lead.phone,
        address: lead.address, postal_code: lead.postal_code,
        property_type: lead.property_type, rental_model: lead.rental_model,
        bedrooms: lead.bedrooms, sqm: lead.sqm,
        availability: lead.availability, lead_type: lead.lead_type,
        units: lead.units, num_properties: lead.num_properties,
        finn_url: lead.finn_url || undefined,
        notes: fwdNotes,
      });
      await db.collection('leads').updateOne({ id: lead.id }, { $set: {
        forwarded: fwd.ok,
        platform_id: fwd.id || null,
        forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
        forwarded_at: fwd.ok ? new Date().toISOString() : null,
      } });
      lead.forwarded = fwd.ok; lead.platform_id = fwd.id || null;

      return cors(NextResponse.json({ success: true, ok: true, data: { id: lead.id }, forwarded: fwd.ok, lead: clean(lead) }, { status: 201 }));
    }

    // --- Tenants (leietaker-skjema) ---
    if (route === '/tenants' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }

      const hasSomething = body.name || body.email || body.phone;
      if (!hasSomething) {
        return cors(NextResponse.json({ success: false, error: 'Mangler kontaktinformasjon' }, { status: 400 }));
      }

      const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
      const tenant = {
        id: uuidv4(),
        name: (body.name || '').toString().slice(0, 200),
        email: (body.email || '').toString().slice(0, 200),
        phone: (body.phone || '').toString().slice(0, 60),
        preferred_area: (body.preferred_area || '').toString().slice(0, 400),
        budget_min: toNum(body.budget_min),
        budget_max: toNum(body.budget_max),
        bedrooms: toNum(body.bedrooms),
        move_in_date: (body.move_in_date || '').toString().slice(0, 40),
        notes: (body.notes || '').toString().slice(0, 4000),
        lead_type: 'leietaker',
        source: 'nettside',
        attribution: sanitizeAttribution(body.attribution),
        status: 'new',
        forwarded: false,
        createdAt: new Date().toISOString(),
      };

      // Idempotens: stopp duplikater fra gjentatte klikk / nettverks-retry.
      try {
        const sinceIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const idMatch = tenant.email
          ? { email: tenant.email }
          : (tenant.phone ? { phone: tenant.phone } : null);
        if (idMatch) {
          const dup = await db.collection('tenant_leads').findOne({
            ...idMatch,
            preferred_area: tenant.preferred_area,
            createdAt: { $gte: sinceIso },
          });
          if (dup) {
            return cors(NextResponse.json({
              success: true, ok: true, id: dup.id, deduped: true,
              forwarded: dup.forwarded === true, tenant: clean(dup),
            }, { status: 200 }));
          }
        }
      } catch (e) { /* best-effort */ }

      await db.collection('tenant_leads').insertOne(tenant);

      // Dual-write: videresend til DigiHome-plattformen (felt-mapping til /api/tenants)
      const budgetStr = (tenant.budget_min || tenant.budget_max)
        ? `${tenant.budget_min || ''}${tenant.budget_min && tenant.budget_max ? '–' : ''}${tenant.budget_max || ''} kr`.trim()
        : '';
      const fwd = await forwardToDigiHome('/api/tenants', {
        name: tenant.name, email: tenant.email, phone: tenant.phone,
        desired_area: tenant.preferred_area,
        address: tenant.preferred_area,
        budget: budgetStr,
        bedrooms: tenant.bedrooms,
        move_in_date: tenant.move_in_date,
        message: tenant.notes,
        lead_type: 'leietaker',
        source: 'nettside',
      });
      await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: {
        forwarded: fwd.ok,
        platform_id: fwd.id || null,
        forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
        forwarded_at: fwd.ok ? new Date().toISOString() : null,
      } });
      tenant.forwarded = fwd.ok; tenant.platform_id = fwd.id || null;

      return cors(NextResponse.json({ success: true, ok: true, data: { id: tenant.id }, forwarded: fwd.ok, tenant: clean(tenant) }, { status: 201 }));
    }

    if (route === '/tenants' && method === 'GET') {
      const tenants = await db.collection('tenant_leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return cors(NextResponse.json(tenants.map(clean)));
    }

    if (route === '/leads' && method === 'GET') {
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return cors(NextResponse.json(leads.map(clean)));
    }

    // --- Admin: lead-oversikt + manuell re-forwarding (enkel nøkkel-gating) ---
    if (route === '/admin/leads' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      const tenants = await db.collection('tenant_leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return cors(NextResponse.json({ leads: leads.map(clean), tenants: tenants.map(clean) }));
    }

    if (route === '/admin/forward' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const results = await reforwardPending(db);
      return cors(NextResponse.json({ success: true, results }));
    }

    // --- Admin: Analytics + Lead Intelligence (samlet) ---
    if (route === '/admin/analytics' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30', 10) || 30;
      const [traffic, leadsIntel, webVitals] = await Promise.all([
        computeAnalytics(db, days),
        computeLeadIntel(db, days),
        computeWebVitals(db, days),
      ]);
      const anomalies = [
        ...detectAnomalies(traffic.timeseries, 'sessions', 'Økter'),
        ...detectAnomalies(traffic.timeseries, 'leads', 'Leads'),
      ].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 8);
      return cors(NextResponse.json({ traffic, leads: leadsIntel, webVitals, anomalies }));
    }

    // --- Admin: live besøkende akkurat nå ---
    if (route === '/admin/live' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const live = await computeLive(db);
      const res = cors(NextResponse.json(live));
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // --- Admin: oppdater lead-status (pipeline) ---
    if (route === '/admin/lead-status' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      const status = (body.status || '').toString();
      const coll = body.type === 'tenant' ? 'tenant_leads' : 'leads';
      const VALID = ['new', 'contacted', 'qualified', 'won', 'lost'];
      if (!id || !VALID.includes(status)) {
        return cors(NextResponse.json({ ok: false, error: 'Ugyldig forespørsel' }, { status: 400 }));
      }
      const nowIso = new Date().toISOString();
      const existing = await db.collection(coll).findOne({ id });
      if (!existing) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const update = {
        status,
        statusUpdatedAt: nowIso,
        statusHistory: [...(existing.statusHistory || []), { status, at: nowIso }].slice(-30),
      };
      // Sett første respons-tidspunkt når man flytter ut av 'new'
      if (status !== 'new' && !existing.firstResponseAt) update.firstResponseAt = nowIso;
      await db.collection(coll).updateOne({ id }, { $set: update });
      return cors(NextResponse.json({ ok: true, id, status }));
    }

    // --- Admin: AI lead-scoring (forklarende, per lead) ---
    if (route === '/admin/lead-score' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      const coll = body.type === 'tenant' ? 'tenant_leads' : 'leads';
      const lead = await db.collection(coll).findOne({ id });
      if (!lead) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const ctx = {
        type: lead.lead_type, navn: lead.name, har_epost: !!lead.email, har_telefon: !!lead.phone,
        adresse: lead.address || lead.preferred_area || null, boligtype: lead.property_type || null,
        kvm: lead.sqm || null, soverom: lead.bedrooms || null, modell: lead.rental_model || null,
        finn_lenke: !!lead.finn_url, antall_enheter: lead.num_properties || 1,
        budsjett: lead.budget_max || null, kanal: (lead.attribution && lead.attribution.channel) || lead.source,
        notat: (lead.notes || '').slice(0, 600),
      };
      const SYS = 'Du er en erfaren salgsanalytiker for DigiHome (eiendomsforvaltning i Bergen). Vurder et innkommende lead og returner KUN gyldig JSON (ingen markdown) med feltene: {"score": <0-100 heltall, sannsynlighet for å bli kunde>, "label": "<Varm|Lunken|Kald>", "reasoning": "<1-2 setninger på norsk bokmål>", "nextAction": "<konkret neste steg på norsk bokmål>"}. Vekt: komplett kontaktinfo, eiendom med detaljer, Finn-lenke, flere enheter og kjøpsklar modell høyt. Ikke finn på fakta.';
      try {
        const answer = await chatLLM({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: `LEAD-DATA:\n${JSON.stringify(ctx)}` }], maxTokens: 300, temperature: 0.2 });
        let parsed = null;
        try { parsed = JSON.parse((answer || '').replace(/```json|```/g, '').trim()); } catch (e) { parsed = null; }
        if (!parsed || typeof parsed.score === 'undefined') {
          return cors(NextResponse.json({ ok: false, error: 'Kunne ikke tolke AI-svar' }, { status: 502 }));
        }
        const aiScore = {
          score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
          label: (parsed.label || '').toString().slice(0, 20),
          reasoning: (parsed.reasoning || '').toString().slice(0, 500),
          nextAction: (parsed.nextAction || '').toString().slice(0, 300),
          at: new Date().toISOString(),
        };
        await db.collection(coll).updateOne({ id }, { $set: { aiScore } });
        return cors(NextResponse.json({ ok: true, id, aiScore }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: (e && e.message) || 'AI utilgjengelig' }, { status: 502 }));
      }
    }

    // --- Admin: AI-innsiktslag (sammendrag + naturlig språk-spørring) ---
    if (route === '/admin/ai-insight' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const days = parseInt(body.days || '30', 10) || 30;
      const mode = body.mode === 'ask' ? 'ask' : 'summary';
      const question = (body.question || '').toString().slice(0, 500);
      if (mode === 'ask' && question.trim().length < 3) {
        return cors(NextResponse.json({ ok: false, error: 'Skriv et spørsmål' }, { status: 400 }));
      }
      const [traffic, leadsIntel, webVitals] = await Promise.all([
        computeAnalytics(db, days),
        computeLeadIntel(db, days),
        computeWebVitals(db, days),
      ]);
      const anomalies = [
        ...detectAnomalies(traffic.timeseries, 'sessions', 'Økter'),
        ...detectAnomalies(traffic.timeseries, 'leads', 'Leads'),
      ];
      const context = serializeForLLM(traffic, leadsIntel, { webVitals, anomalies });
      const SYS_SUMMARY = 'Du er en erfaren vekst- og markedsanalytiker for DigiHome, en AI-drevet eiendomsforvalter i Bergen. Du får aggregerte analysedata fra markedsnettstedet digihome.no. Skriv et kort, skarpt sammendrag på norsk bokmål (3-5 setninger) som fremhever de viktigste innsiktene om trafikk, kanaler, konvertering og leads. Avslutt med 2-3 konkrete, handlingsrettede anbefalinger som en kort punktliste (bruk «-»). Bruk faktiske tall fra dataene. Ikke finn på tall. Vær presis og forretningsorientert.';
      const SYS_ASK = 'Du er en analyseassistent for DigiHome. Svar kort og presist på norsk bokmål, KUN basert på de oppgitte analysedataene. Hvis svaret ikke finnes i dataene, si det ærlig. Ikke finn på tall.';
      const messages = mode === 'ask'
        ? [{ role: 'system', content: SYS_ASK }, { role: 'user', content: `ANALYSEDATA:\n${context}\n\nSPØRSMÅL: ${question}` }]
        : [{ role: 'system', content: SYS_SUMMARY }, { role: 'user', content: `ANALYSEDATA (siste ${days} dager):\n${context}` }];
      try {
        const answer = await chatLLM({ messages, maxTokens: mode === 'ask' ? 500 : 700, temperature: 0.3 });
        return cors(NextResponse.json({ ok: true, answer, mode }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: (e && e.message) || 'AI utilgjengelig' }, { status: 502 }));
      }
    }

    // --- Blogg/nyheter (posts) ---
    // GET /posts — offentlig liste over publiserte (admin med ?all=1&key= ser alle).
    if (route === '/posts' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const slug = searchParams.get('slug');
      const tag = searchParams.get('tag');
      const isAdmin = adminAuthed(request);
      if (slug) {
        const post = await db.collection('posts').findOne({ slug });
        if (!post || (post.status !== 'published' && !isAdmin)) {
          return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
        }
        return cors(NextResponse.json({ post: clean(post) }));
      }
      const q = (isAdmin && searchParams.get('all') === '1') ? {} : { status: 'published' };
      if (tag) q.tags = tag;
      const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 200);
      const posts = await db.collection('posts')
        .find(q).project({ content: 0 }).sort({ publishedAt: -1, createdAt: -1 }).limit(limit).toArray();
      return cors(NextResponse.json({ posts: posts.map(clean) }));
    }

    // POST /admin/posts — opprett eller oppdater artikkel.
    if (route === '/admin/posts' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const title = (body.title || '').toString().trim();
      if (!title) return cors(NextResponse.json({ success: false, error: 'Tittel mangler' }, { status: 400 }));
      const status = body.status === 'published' ? 'published' : 'draft';
      const now = new Date().toISOString();
      const tags = Array.isArray(body.tags)
        ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 8)
        : (body.tags ? String(body.tags).split(',').map((t) => t.trim()).filter(Boolean).slice(0, 8) : []);
      const fields = {
        title: title.slice(0, 200),
        excerpt: (body.excerpt || '').toString().slice(0, 400),
        content: (body.content || '').toString().slice(0, 40000),
        coverImage: (body.coverImage || '').toString().slice(0, 600),
        tags,
        author: (body.author || 'DigiHome').toString().slice(0, 80),
        seoTitle: (body.seoTitle || '').toString().slice(0, 70),
        seoDescription: (body.seoDescription || '').toString().slice(0, 170),
        status,
        updatedAt: now,
      };

      if (body.id) {
        const existing = await db.collection('posts').findOne({ id: String(body.id) });
        if (!existing) return cors(NextResponse.json({ success: false, error: 'Finnes ikke' }, { status: 404 }));
        let slug = slugify((body.slug || existing.slug || title).toString()) || existing.slug;
        if (slug !== existing.slug) {
          const dup = await db.collection('posts').findOne({ slug, id: { $ne: existing.id } });
          if (dup) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
        }
        fields.slug = slug;
        if (status === 'published' && !existing.publishedAt) fields.publishedAt = now;
        else fields.publishedAt = existing.publishedAt || (status === 'published' ? now : null);
        await db.collection('posts').updateOne({ id: existing.id }, { $set: fields });
        const updated = await db.collection('posts').findOne({ id: existing.id });
        return cors(NextResponse.json({ success: true, post: clean(updated) }));
      }

      // opprett
      let slug = slugify(body.slug || title) || `artikkel-${Date.now()}`;
      const dup = await db.collection('posts').findOne({ slug });
      if (dup) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
      const doc = {
        id: uuidv4(),
        slug,
        ...fields,
        publishedAt: status === 'published' ? now : null,
        createdAt: now,
      };
      await db.collection('posts').insertOne(doc);
      return cors(NextResponse.json({ success: true, post: clean(doc) }, { status: 201 }));
    }

    // DELETE /admin/posts — slett artikkel.
    if (route === '/admin/posts' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      if (!body.id) return cors(NextResponse.json({ success: false, error: 'Mangler id' }, { status: 400 }));
      const res = await db.collection('posts').deleteOne({ id: String(body.id) });
      return cors(NextResponse.json({ success: true, deleted: res.deletedCount || 0 }));
    }

    // POST /admin/generate-article — AI-generert artikkelutkast (Emergent LLM).
    if (route === '/admin/generate-article' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const topic = (body.topic || '').toString().slice(0, 300);
      if (topic.trim().length < 4) return cors(NextResponse.json({ ok: false, error: 'Skriv et tema (minst 4 tegn)' }, { status: 400 }));
      const SYS = 'Du er innholdsredaktør for DigiHome, en AI-drevet eiendomsforvalter i Bergen. Skriv en hjelpsom, faktabasert og engasjerende artikkel på norsk bokmål for selskapets blogg/nyheter, rettet mot boligeiere og leietakere. Følg E-E-A-T: vær presis og nyttig, og IKKE finn på konkrete tall, priser eller lovparagrafer du ikke er sikker på. Returner KUN gyldig JSON (UTEN markdown-kodeblokk rundt) med nøyaktig disse feltene: {"title": string (maks 70 tegn), "excerpt": string (1-2 setninger), "content": string (markdown, 500-800 ord, bruk ## underoverskrifter og en kort ingress øverst, IKKE bruk H1/#), "tags": string[] (2-4 relevante norske tagger), "seoTitle": string (maks 60 tegn), "seoDescription": string (maks 155 tegn)}.';
      try {
        const raw = await chatLLM({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: `Tema: ${topic}` }], maxTokens: 1800, temperature: 0.6 });
        let txt = (raw || '').trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim();
        const first = txt.indexOf('{'); const last = txt.lastIndexOf('}');
        if (first >= 0 && last > first) txt = txt.slice(first, last + 1);
        let draft;
        try { draft = JSON.parse(txt); } catch (e) {
          return cors(NextResponse.json({ ok: false, error: 'Kunne ikke tolke AI-svaret. Prøv igjen.' }, { status: 502 }));
        }
        return cors(NextResponse.json({ ok: true, draft }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: (e && e.message) || 'AI utilgjengelig' }, { status: 502 }));
      }
    }


    // Slett leads (admin): enkelt id, flere ids, etter e-post, kun ventende, eller alle.
    if (route === '/admin/delete' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const colName = body.type === 'tenant' ? 'tenant_leads' : (body.type === 'events' ? 'events' : 'leads');
      const col = db.collection(colName);
      let filter = null;
      if (body.id) filter = { id: String(body.id) };
      else if (Array.isArray(body.ids) && body.ids.length) filter = { id: { $in: body.ids.map(String) } };
      else if (body.email) filter = { email: String(body.email) };
      else if (body.scope === 'pending') filter = { forwarded: { $ne: true } };
      else if (body.scope === 'demo') filter = { 'meta.demo': true };
      else if (body.all === true) filter = {};
      if (!filter) return cors(NextResponse.json({ success: false, error: 'Ingen sletteutvalg angitt' }, { status: 400 }));
      const res = await col.deleteMany(filter);
      return cors(NextResponse.json({ success: true, deleted: res.deletedCount || 0 }));
    }

    // --- Investor-interesse (deck «The Ask»-slide) ---
    if (route === '/investor/interest' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const name = (body.name || '').toString().trim();
      const email = (body.email || '').toString().trim();
      if (name.length < 2 || !email) {
        return cors(NextResponse.json({ detail: 'Navn og e-post er påkrevd' }, { status: 400 }));
      }
      const lead = {
        id: uuidv4(),
        name: name.slice(0, 120),
        email: email.slice(0, 200),
        phone: (body.phone || '').toString().slice(0, 40),
        company: (body.company || '').toString().slice(0, 160),
        ticket_size: (body.ticket_size || '').toString().slice(0, 60),
        message: (body.message || '').toString().slice(0, 2000),
        source: 'presentasjon_deck',
        status: 'new',
        created_at: new Date().toISOString(),
      };
      await db.collection('investor_leads').insertOne(lead);
      return cors(NextResponse.json({ ok: true, id: lead.id }));
    }

    if (route === '/investor/leads' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10) || 100, 500);
      const leads = await db.collection('investor_leads').find({}).sort({ created_at: -1 }).limit(limit).toArray();
      return cors(NextResponse.json({ leads: leads.map(clean) }));
    }

    // --- Investor-deck PDF-cache (instant nedlasting) ---
    if (route === '/investor-deck/pdf/info' && method === 'GET') {
      const doc = await db.collection('investor_deck_pdfs').findOne({ id: 'current' }, { projection: { pdf_data: 0, _id: 0 } });
      if (!doc) return cors(NextResponse.json({ exists: false }));
      return cors(NextResponse.json({ exists: true, size: doc.size || null, updated_at: doc.updated_at || null, slide_count: doc.slide_count || null }));
    }

    if (route === '/investor-deck/pdf' && method === 'GET') {
      const doc = await db.collection('investor_deck_pdfs').findOne({ id: 'current' });
      if (!doc || !doc.pdf_data) {
        return cors(NextResponse.json({ detail: "PDF har ikke blitt generert ennå. Trykk 'Generer PDF' i investor-deck-siden først." }, { status: 404 }));
      }
      const buf = doc.pdf_data.buffer ? Buffer.from(doc.pdf_data.buffer) : Buffer.from(doc.pdf_data);
      const res = new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="DigiHome-Investor-Deck.pdf"',
          'Cache-Control': 'public, max-age=3600',
        },
      });
      return cors(res);
    }

    if (route === '/investor-deck/pdf' && method === 'POST') {
      let form;
      try { form = await request.formData(); } catch (e) { return cors(NextResponse.json({ detail: 'Ugyldig opplasting' }, { status: 400 })); }
      const file = form.get('file');
      const slideCount = parseInt((form.get('slide_count') || '0').toString(), 10) || 0;
      if (!file || typeof file.arrayBuffer !== 'function') {
        return cors(NextResponse.json({ detail: 'Tom fil' }, { status: 400 }));
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const MAX = 14 * 1024 * 1024;
      if (buf.length === 0) return cors(NextResponse.json({ detail: 'Tom fil' }, { status: 400 }));
      if (buf.length > MAX) {
        return cors(NextResponse.json({ detail: `PDF for stor (${(buf.length / 1024 / 1024).toFixed(1)} MB). Maks 14 MB.` }, { status: 413 }));
      }
      if (buf.subarray(0, 4).toString('latin1') !== '%PDF') {
        return cors(NextResponse.json({ detail: 'Fil er ikke en gyldig PDF' }, { status: 400 }));
      }
      await db.collection('investor_deck_pdfs').updateOne(
        { id: 'current' },
        { $set: { id: 'current', pdf_data: buf, size: buf.length, slide_count: slideCount || null, updated_at: new Date().toISOString() } },
        { upsert: true }
      );
      return cors(NextResponse.json({ ok: true, size: buf.length, slide_count: slideCount || null }));
    }

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }));
  } catch (error) {
    console.error('API Error:', error);
    return cors(NextResponse.json({ error: 'Internal server error' }, { status: 500 }));
  }
}

export const GET = handleRoute;
export const POST = handleRoute;
export const PUT = handleRoute;
export const DELETE = handleRoute;
export const PATCH = handleRoute;
