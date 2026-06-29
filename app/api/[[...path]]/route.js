import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';
import { getDb, clean } from '@/lib/mongodb';
import { getObject, PUBLIC_PREFIX } from '@/lib/objectStorage';
import { isBot, buildEvent, ensureAnalyticsIndexes, computeAnalytics, computeLeadIntel } from '@/lib/analytics-server';
import { deriveChannel, serializeForLLM, computeWebVitals, detectAnomalies, computeLive, computeAdsEconomics, computeMetaEconomics, combineAdsEconomics } from '@/lib/analytics-server';
import { parseGoogleAdsCsv } from '@/lib/adsImport';
import { sendMetaCapiEvent, metaCapiConfigured } from '@/lib/meta-capi';
import { fetchMetaInsights, fetchMetaAccount, metaAdsConfigured } from '@/lib/meta-ads';
import { fetchPages, fetchLeadForms, fetchFormLeads, mapLeadFields, metaLeadAdsConfigured, fetchSingleLead, fetchFormName, fetchPageToken } from '@/lib/meta-leadads';
import { composioConfigured, createConnectLink, getConnectionStatus, runCampaignReport, defaultCustomerId } from '@/lib/composio-google-ads';
import { chatLLM } from '@/lib/llm';
import { slugify } from '@/lib/site';
import { getRentReport, refreshRentReport, RENT_CITIES } from '@/lib/rentmarket';
import {
  infotorgConfigured,
  addressToMatrikkel,
  checkMatrikkelExists,
  getPropertyData,
  getOwnerInfo,
  getBorettslagAndeler,
  getAndelOwner,
  classifyBuildingType,
  matrikkelString,
} from '@/lib/infotorg';

// --- Enkel in-memory rate-limit (per IP) for offentlige eiendomsoppslag ---
const _rlBuckets = new Map(); // ip -> { count, resetAt }
function rateLimit(ip, max = 30, windowMs = 60000) {
  const now = Date.now();
  const b = _rlBuckets.get(ip);
  if (!b || now > b.resetAt) {
    _rlBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    if (_rlBuckets.size > 5000) {
      for (const [k, v] of _rlBuckets) if (now > v.resetAt) _rlBuckets.delete(k);
    }
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}
function clientIp(request) {
  const xff = request.headers.get('x-forwarded-for') || '';
  return (xff.split(',')[0] || '').trim() || request.headers.get('x-real-ip') || 'unknown';
}
// Begrenset parallellitet for batch-SOAP (unngå å hamre EDR).
async function mapLimit(items, limit, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

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

// In-memory cache for resized image-varianter (next/image custom loader).
// Holder de mest brukte responsive bredde-/kvalitetsvariantene varme slik at
// gjentatte forespørsler (og CDN-cache-misser) ikke re-encoder hver gang.
const MEDIA_RESIZE_CACHE = new Map();
const MEDIA_RESIZE_MAX = 160;

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

  // --- On-the-fly resize/re-encode for raster-bilder (next/image-loader) ---
  // next/image ber om varianter via ?w=<bredde>&q=<kvalitet>. Vi resizer med
  // sharp og leverer WebP (moderne format, godt stottet). SVG/video/etc rores ikke.
  const isRaster = /^image\/(jpeg|png|webp|avif)$/.test(contentType);
  let qs;
  try { qs = new URL(request.url).searchParams; } catch (e) { qs = null; }
  const wParam = qs ? parseInt(qs.get('w') || '0', 10) : 0;
  if (isRaster && wParam > 0) {
    try {
      const width = Math.min(3840, Math.max(16, wParam));
      const q = Math.min(100, Math.max(30, parseInt((qs.get('q') || '72'), 10)));
      const key = `${rel}|${width}|${q}`;
      let out = MEDIA_RESIZE_CACHE.get(key);
      if (!out) {
        out = await sharp(obj.buffer)
          .rotate()
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: q, effort: 4 })
          .toBuffer();
        if (MEDIA_RESIZE_CACHE.size >= MEDIA_RESIZE_MAX) {
          MEDIA_RESIZE_CACHE.delete(MEDIA_RESIZE_CACHE.keys().next().value);
        }
        MEDIA_RESIZE_CACHE.set(key, out);
      }
      return new NextResponse(out, {
        status: 200,
        headers: {
          'Content-Type': 'image/webp',
          'Cache-Control': 'public, max-age=31536000, immutable',
          'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
          'Content-Length': String(out.length),
        },
      });
    } catch (e) {
      // Sharp-feil → fall tilbake til originalen under.
    }
  }

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

  // Matrikkelinformasjon (Kommunenr / Gårdsnr / Bruksnr / Seksjonsnr) →
  // lar oss slå opp eiendommen direkte i Eiendomsregisteret uten adresse.
  // NB: Finn bruker HTML-kommentarer mellom label og verdi («Kommunenr<!-- -->: <!-- -->3420»),
  // som blir til mellomrom etter stripping → tillat \s*:?\s*.
  const mnum = (re) => { const m = re.exec(text); return m ? m[1] : ''; };
  const kommunenr = mnum(/Kommunenr\s*:?\s*(\d{3,4})\b/i);
  const gaardsnr = mnum(/G(?:å|a)rdsnr\s*:?\s*(\d+)\b/i);
  const bruksnr = mnum(/Bruksnr\s*:?\s*(\d+)\b/i);
  const seksjonsnr = mnum(/Seksjonsnr\s*:?\s*(\d+)\b/i);
  const festenr = mnum(/Festenr\s*:?\s*(\d+)\b/i);
  const andelsnr = mnum(/Andelsnr\s*:?\s*(\d+)\b/i) || mnum(/Andelsnummer\s*:?\s*(\d+)\b/i);
  const matrikkel = (kommunenr && gaardsnr && bruksnr)
    ? { kommunenr, gaardsnr, bruksnr, seksjonsnr: seksjonsnr || '', festenr: festenr || '', andelsnr: andelsnr || '' }
    : null;
  // Ekte gateadresse ligger i kartlenken (data-testid="map-link"); fall tilbake til og:title.
  let address = '';
  const am = /"([^"]{5,120}?,\s*\d{4}\s[^"]{1,60}?)"\s+data-testid="map-link"/i.exec(htmlStr)
          || /data-testid="map-link"[^>]*?(?:title|aria-label)="([^"]{5,120})"/i.exec(htmlStr);
  if (am) address = decodeEntities(am[1]).trim();
  // Strip evt. «Åpne kart for …»/«Vis kart …»-prefiks fra aria-label.
  if (address) address = address.replace(/^(åpne|vis|se)\s+(i\s+)?kart(et)?\s*(for\s+)?/i, '').trim();
  if (!address) address = (title || '').replace(/\s*[-–|]\s*FINN.*$/i, '').trim();
  let postalCode = '';
  const pm = /,\s*(\d{4})\s+\S/.exec(address);
  if (pm) postalCode = pm[1];

  const data = {
    ok: !!title,
    finnUrl: key, title, image, description, kind,
    propertyType, propertyTypeRaw: ptRaw,
    bedrooms: bedrooms || '', sqm: sqm || '', rent: rent || '',
    matrikkel, address, postalCode,
  };
  if (data.ok) {
    _finnCache.set(key, { at: Date.now(), data });
    if (_finnCache.size > 300) _finnCache.delete(_finnCache.keys().next().value);
  }
  return data;
}

// --- Admin-bruker-autentisering (e-post/passord + signert HMAC-sesjonstoken) ---
// Innlogging utsteder et token som klienten sender som ?key= / x-admin-key →
// adminAuthed godtar BÅDE legacy ADMIN_KEY OG et gyldig sesjonstoken, slik at
// alle eksisterende admin-endepunkter fungerer uendret.
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_KEY || 'dh-admin-fallback-secret';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 dager

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const dk = crypto.scryptSync(String(password), s, 64).toString('hex');
  return `scrypt$${s}$${dk}`;
}
function verifyPassword(password, stored) {
  try {
    const [scheme, salt, dk] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !salt || !dk) return false;
    const cand = crypto.scryptSync(String(password), salt, 64).toString('hex');
    const a = Buffer.from(cand, 'hex');
    const b = Buffer.from(dk, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch (e) { return false; }
}
function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlDecode(input) {
  const pad = input.length % 4 ? '='.repeat(4 - (input.length % 4)) : '';
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64').toString('utf8');
}
function signSession(payload) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('hex');
  return `${body}.${sig}`;
}
function verifySession(token) {
  try {
    const [body, sig] = String(token || '').split('.');
    if (!body || !sig) return null;
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('hex');
    const a = Buffer.from(sig); const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(b64urlDecode(body));
    if (!payload || !payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (e) { return null; }
}

// Idempotent seeding av admin-bruker(e) fra .env (kjøres ved første innlogging).
let _seededAdmin = false;
async function ensureAdminUsers(db) {
  if (_seededAdmin) return;
  try {
    const email = (process.env.ADMIN_SEED_EMAIL || '').trim().toLowerCase();
    const password = process.env.ADMIN_SEED_PASSWORD || '';
    if (email && password) {
      const existing = await db.collection('admin_users').findOne({ email });
      if (!existing) {
        await db.collection('admin_users').insertOne({
          id: uuidv4(),
          email,
          name: (process.env.ADMIN_SEED_NAME || 'Admin'),
          role: 'owner',
          passwordHash: hashPassword(password),
          createdAt: new Date().toISOString(),
        });
      }
    }
    _seededAdmin = true;
  } catch (e) { /* prøv igjen neste gang */ }
}

function adminAuthed(request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') || request.headers.get('x-admin-key') || '';
    if (!!ADMIN_KEY && key === ADMIN_KEY) return true;       // legacy nøkkel
    if (key && verifySession(key)) return true;              // sesjonstoken
    return false;
  } catch (e) { return false; }
}

// Re-forward alle leads/tenants som ikke er videresendt (forwarded !== true)
async function reforwardPending(db) {
  const results = { leads: { tried: 0, ok: 0 }, tenants: { tried: 0, ok: 0 } };
  const pendLeads = await db.collection('leads').find({ forwarded: { $ne: true } }).limit(200).toArray();
  for (const lead of pendLeads) {
    results.leads.tried++;
    const fwd = await forwardToDigiHome('/api/leads', {
      external_ref: lead.id, source_system: 'digihome-marketing',
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
      external_ref: t.id, source_system: 'digihome-marketing',
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
    // Rå klikk-ID-er (samtykke-gated på klienten) → for offline-konvertering til Google/Meta Ads.
    gclid: s(a.gclid, 200) || undefined,
    gbraid: s(a.gbraid, 200) || undefined,
    wbraid: s(a.wbraid, 200) || undefined,
    fbclid: s(a.fbclid, 200) || undefined,
    msclkid: s(a.msclkid, 200) || undefined,
    // Meta-matching (Conversions API): _fbp/_fbc-cookieverdier fra pixelen.
    fbp: s(a.fbp, 200) || undefined,
    fbc: s(a.fbc, 300) || undefined,
  };
}

// Importer ÉN Meta Lead Ads-lead (delt av manuell synk + webhook). Dedup på meta_leadgen_id.
// Returnerer 'imported' | 'skipped' | 'error'.
async function importMetaLeadDoc(db, ml, formName) {
  try {
    const isTenant = /leietaker|leie|tenant|bolig.?s.?ker/i.test(formName || '');
    const coll = isTenant ? 'tenant_leads' : 'leads';
    const exists = await db.collection(coll).findOne({ meta_leadgen_id: ml.id });
    if (exists) return 'skipped';
    const m = mapLeadFields(ml.field_data);
    const attribution = sanitizeAttribution({
      source: 'facebook', medium: 'paid-social', channel: 'Betalt',
      campaign: ml.campaign_name || formName, content: ml.ad_name,
    });
    const nowIso = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      name: m.name || '(uten navn)', email: m.email || '', phone: m.phone || '',
      address: m.address || '',
      lead_type: isTenant ? 'leietaker' : 'huseier',
      source: 'meta-leadads',
      status: 'new',
      createdAt: ml.created_time ? new Date(ml.created_time).toISOString() : nowIso,
      notes: m.notes || '',
      attribution,
      meta_leadgen_id: ml.id,
      meta_form_id: ml.form_id || null, meta_form_name: formName || null,
      meta_ad_id: ml.ad_id || null, meta_campaign_name: ml.campaign_name || null,
      meta_platform: ml.platform || null,
      forwarded: false,
    };
    await db.collection(coll).insertOne(doc);
    const fwd = await forwardToDigiHome(isTenant ? '/api/tenants' : '/api/leads', {
      external_ref: doc.id, source_system: 'digihome-marketing-leadads',
      name: doc.name, email: doc.email, phone: doc.phone, address: doc.address,
      lead_type: doc.lead_type, notes: doc.notes,
    });
    await db.collection(coll).updateOne({ id: doc.id }, { $set: {
      forwarded: fwd.ok, platform_id: fwd.id || null,
      forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
      forwarded_at: fwd.ok ? new Date().toISOString() : null,
    } });
    return 'imported';
  } catch (e) { return 'error'; }
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

// --- Google Ads offline-konvertering: hjelpere -----------------------------
// Formater ISO-tid til "yyyy-MM-dd HH:mm:ss" i Europe/Oslo (Google Ads-format).
function osloTime(iso) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const parts = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(d);
    const o = {};
    parts.forEach((p) => { o[p.type] = p.value; });
    return `${o.year}-${o.month}-${o.day} ${o.hour}:${o.minute}:${o.second}`;
  } catch (e) { return ''; }
}

// CSV-felt-escaping (siter ved komma/anførselstegn/linjeskift).
function csvEsc(v) {
  const s = (v === undefined || v === null) ? '' : String(v);
  if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
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

    // ──────────────────────────────────────────────────────────────────────
    // Admin-innlogging (e-post/passord → signert sesjonstoken)
    // ──────────────────────────────────────────────────────────────────────
    if (route === '/admin/auth/login' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) {}
      const email = (body.email || '').toString().trim().toLowerCase();
      const password = (body.password || '').toString();
      if (!email || !password) {
        return cors(NextResponse.json({ ok: false, error: 'Fyll inn e-post og passord' }, { status: 400 }));
      }
      await ensureAdminUsers(db);
      const user = await db.collection('admin_users').findOne({ email });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return cors(NextResponse.json({ ok: false, error: 'Feil e-post eller passord' }, { status: 401 }));
      }
      const exp = Date.now() + SESSION_TTL_MS;
      const token = signSession({ sub: user.id, email: user.email, exp });
      return cors(NextResponse.json({
        ok: true,
        token,
        exp,
        user: { email: user.email, name: user.name || '', role: user.role || 'admin' },
      }));
    }

    // Validér aktivt sesjonstoken (brukes ved oppstart for å gjenopprette innlogging).
    if (route === '/admin/auth/me' && method === 'GET') {
      const u = new URL(request.url);
      const token = u.searchParams.get('key') || request.headers.get('x-admin-key') || '';
      const payload = verifySession(token);
      if (!payload) return cors(NextResponse.json({ ok: false }, { status: 401 }));
      let user = null;
      try { user = await db.collection('admin_users').findOne({ id: payload.sub }); } catch (e) {}
      return cors(NextResponse.json({
        ok: true,
        user: { email: payload.email, name: (user && user.name) || '', role: (user && user.role) || 'admin' },
      }));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Eiendomsregisteret (Infotorg EDR): adresse → matrikkel → seksjon/andel
    // Offentlig (brukes av /bli-utleier). Rate-limitet + cachet i MongoDB.
    // ──────────────────────────────────────────────────────────────────────
    if (route === '/infotorg/lookup' && method === 'POST') {
      if (!infotorgConfigured()) {
        return cors(NextResponse.json({ status: 'disabled', message: 'Eiendomsregisteret er ikke konfigurert.' }, { status: 503 }));
      }
      if (!rateLimit(clientIp(request), 40)) {
        return cors(NextResponse.json({ status: 'rate_limited', message: 'For mange oppslag. Vent litt og prøv igjen.' }, { status: 429 }));
      }
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const address = (body.address || '').toString().trim();
      const mIn = body.matrikkel || null;

      // Matrikkel kan komme direkte (fra Finn-annonse) eller via adresse-oppslag.
      let matrikkel;
      if (mIn && mIn.kommunenr && mIn.gaardsnr && mIn.bruksnr) {
        matrikkel = { kommunenr: String(mIn.kommunenr), gaardsnr: String(mIn.gaardsnr), bruksnr: String(mIn.bruksnr) };
      } else if (address) {
        matrikkel = await addressToMatrikkel(address);
        if (!matrikkel) {
          return cors(NextResponse.json({ status: 'not_found', message: 'Fant ikke adressen i Kartverket' }, { status: 404 }));
        }
      } else {
        return cors(NextResponse.json({ status: 'error', message: 'Mangler adresse eller matrikkel' }, { status: 400 }));
      }
      const { kommunenr: knr, gaardsnr: gnr, bruksnr: bnr } = matrikkel;
      const cacheKey = `${knr}-${gnr}-${bnr}`;

      // Cache-hit?
      try {
        const cached = await db.collection('infotorg_cache').findOne({ cache_key: cacheKey }, { projection: { _id: 0 } });
        if (cached && cached.edr_data) {
          return cors(NextResponse.json({
            status: 'ok', source: 'cache', matrikkel,
            edr: cached.edr_data, building_type: cached.building_type, borettslag: cached.borettslag || null,
          }));
        }
      } catch (e) { /* cache er best-effort */ }

      // Finnes matrikkelen?
      let exists = true;
      try { exists = await checkMatrikkelExists(knr, gnr, bnr); } catch (e) { exists = true; }
      if (!exists) {
        return cors(NextResponse.json({ status: 'not_found', matrikkel, message: 'Matrikkelenheten finnes ikke i Eiendomsregisteret' }));
      }

      // Eiendomsdata
      let edr;
      try { edr = await getPropertyData(knr, gnr, bnr); }
      catch (e) { return cors(NextResponse.json({ status: 'error', message: 'Kunne ikke hente eiendomsdata. Prøv igjen senere.' }, { status: 502 })); }

      let buildingType = classifyBuildingType(edr);

      // Borettslag-deteksjon: useksjonert matrikkel eid av et borettslag (org)
      let borettslag = null;
      if (!edr.seksjonert && !(edr.seksjoner || []).length) {
        try {
          const holder = await getOwnerInfo(knr, gnr, bnr, '0');
          if (holder && holder.type === 'organisasjon' && /BORETTSLAG/i.test(holder.navn || '') && holder.orgnr) {
            const andeler = await getBorettslagAndeler(holder.orgnr);
            borettslag = { orgnr: holder.orgnr, navn: holder.navn, andeler };
            buildingType = 'borettslag';
          }
        } catch (e) { /* ikke-kritisk */ }
      }

      // Cache (hopp over tom borettslag-andelsliste pga. forbigående feil)
      const skipCache = borettslag && !(borettslag.andeler || []).length;
      if (!skipCache) {
        try {
          await db.collection('infotorg_cache').updateOne(
            { cache_key: cacheKey },
            { $set: { cache_key: cacheKey, matrikkel, edr_data: edr, building_type: buildingType, borettslag, updated_at: new Date().toISOString() } },
            { upsert: true },
          );
        } catch (e) { /* best-effort */ }
      }

      return cors(NextResponse.json({ status: 'ok', source: 'live', matrikkel, edr, building_type: buildingType, borettslag }));
    }

    // Hjemmelshaver for én seksjon (cachet per matrikkel+snr)
    if (route === '/infotorg/owner' && method === 'POST') {
      if (!infotorgConfigured()) return cors(NextResponse.json({ status: 'disabled' }, { status: 503 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const { kommunenr: knr, gaardsnr: gnr, bruksnr: bnr, seksjonsnr: snr } = body || {};
      if (!knr || !gnr || !bnr) return cors(NextResponse.json({ status: 'error', message: 'Mangler matrikkel' }, { status: 400 }));
      const ck = `${knr}-${gnr}-${bnr}-snr${snr || '0'}`;
      try {
        const cached = await db.collection('infotorg_owner_cache').findOne({ cache_key: ck }, { projection: { _id: 0 } });
        if (cached && cached.owner) return cors(NextResponse.json({ status: 'ok', owner: cached.owner, source: 'cache' }));
      } catch (e) {}
      let owner = null;
      try { owner = await getOwnerInfo(knr, gnr, bnr, snr || '0'); } catch (e) { return cors(NextResponse.json({ status: 'error' }, { status: 502 })); }
      try {
        await db.collection('infotorg_owner_cache').updateOne(
          { cache_key: ck },
          { $set: { cache_key: ck, owner, matrikkel: `${knr}-${gnr}/${bnr}`, seksjonsnr: snr || '0', updated_at: new Date().toISOString() } },
          { upsert: true },
        );
      } catch (e) {}
      if (!owner) return cors(NextResponse.json({ status: 'not_found', owner: null }));
      return cors(NextResponse.json({ status: 'ok', owner, source: 'live' }));
    }

    // Batch: hjemmelshavere for flere seksjoner (merker seksjonsvelgeren)
    if (route === '/infotorg/section-owners' && method === 'POST') {
      if (!infotorgConfigured()) return cors(NextResponse.json({ status: 'disabled', owners: {} }, { status: 503 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const { kommunenr: knr, gaardsnr: gnr, bruksnr: bnr } = body || {};
      const list = Array.from(new Set((body.seksjonsnr_list || []).map(String))).slice(0, 40);
      if (!knr || !gnr || !bnr) return cors(NextResponse.json({ status: 'error', owners: {} }, { status: 400 }));
      const owners = {};
      const toFetch = [];
      for (const snr of list) {
        const ck = `${knr}-${gnr}-${bnr}-snr${snr}`;
        try {
          const cached = await db.collection('infotorg_owner_cache').findOne({ cache_key: ck }, { projection: { _id: 0 } });
          if (cached && cached.owner) { owners[snr] = cached.owner; continue; }
        } catch (e) {}
        toFetch.push(snr);
      }
      await mapLimit(toFetch, 6, async (snr) => {
        let owner = null;
        try { owner = await getOwnerInfo(knr, gnr, bnr, snr); } catch (e) {}
        const ck = `${knr}-${gnr}-${bnr}-snr${snr}`;
        try {
          await db.collection('infotorg_owner_cache').updateOne(
            { cache_key: ck },
            { $set: { cache_key: ck, owner, matrikkel: `${knr}-${gnr}/${bnr}`, seksjonsnr: snr, updated_at: new Date().toISOString() } },
            { upsert: true },
          );
        } catch (e) {}
        if (owner) owners[snr] = owner;
        return snr;
      });
      return cors(NextResponse.json({ status: 'ok', owners }));
    }

    // Andelseier for én borettslag-andel (cachet per orgnr+andel)
    if (route === '/infotorg/andel-owner' && method === 'POST') {
      if (!infotorgConfigured()) return cors(NextResponse.json({ status: 'disabled' }, { status: 503 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const { orgnr, andelsnr } = body || {};
      if (!orgnr || !andelsnr) return cors(NextResponse.json({ status: 'error', message: 'Mangler orgnr/andelsnr' }, { status: 400 }));
      const ck = `brl-${orgnr}-andel${andelsnr}`;
      try {
        const cached = await db.collection('infotorg_owner_cache').findOne({ cache_key: ck }, { projection: { _id: 0 } });
        if (cached && cached.owner) return cors(NextResponse.json({ status: 'ok', owner: cached.owner, source: 'cache' }));
      } catch (e) {}
      let owner = null;
      try { owner = await getAndelOwner(orgnr, andelsnr); } catch (e) { return cors(NextResponse.json({ status: 'error' }, { status: 502 })); }
      try {
        await db.collection('infotorg_owner_cache').updateOne(
          { cache_key: ck },
          { $set: { cache_key: ck, owner, orgnr, andelsnr, updated_at: new Date().toISOString() } },
          { upsert: true },
        );
      } catch (e) {}
      if (!owner) return cors(NextResponse.json({ status: 'not_found', owner: null }));
      return cors(NextResponse.json({ status: 'ok', owner, source: 'live' }));
    }

    // Batch: andelseiere for flere andeler (merker andelsvelgeren)
    if (route === '/infotorg/andel-owners' && method === 'POST') {
      if (!infotorgConfigured()) return cors(NextResponse.json({ status: 'disabled', owners: {} }, { status: 503 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const { orgnr } = body || {};
      const list = Array.from(new Set((body.andelsnr_list || []).map(String))).slice(0, 40);
      if (!orgnr) return cors(NextResponse.json({ status: 'error', owners: {} }, { status: 400 }));
      const owners = {};
      const toFetch = [];
      for (const an of list) {
        const ck = `brl-${orgnr}-andel${an}`;
        try {
          const cached = await db.collection('infotorg_owner_cache').findOne({ cache_key: ck }, { projection: { _id: 0 } });
          if (cached && cached.owner) { owners[an] = cached.owner; continue; }
        } catch (e) {}
        toFetch.push(an);
      }
      await mapLimit(toFetch, 6, async (an) => {
        let owner = null;
        try { owner = await getAndelOwner(orgnr, an); } catch (e) {}
        const ck = `brl-${orgnr}-andel${an}`;
        try {
          await db.collection('infotorg_owner_cache').updateOne(
            { cache_key: ck },
            { $set: { cache_key: ck, owner, orgnr, andelsnr: an, updated_at: new Date().toISOString() } },
            { upsert: true },
          );
        } catch (e) {}
        if (owner) owners[an] = owner;
        return an;
      });
      return cors(NextResponse.json({ status: 'ok', owners }));
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
        // Eiendomsregisteret (Infotorg EDR) — primær eiendom
        matrikkel_number: (body.matrikkel_number || '').toString().slice(0, 60),
        seksjonsnr: (body.seksjonsnr || '').toString().slice(0, 12),
        andelsnr: (body.andelsnr || '').toString().slice(0, 12),
        bygningstype: (body.bygningstype || '').toString().slice(0, 80),
        registry_owner_name: (body.registry_owner_name || '').toString().slice(0, 200),
        registry_owner_type: (body.registry_owner_type || '').toString().slice(0, 40),
        registry_orgnr: (body.registry_orgnr || '').toString().slice(0, 20),
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
        external_ref: lead.id, source_system: 'digihome-marketing',
        name: lead.name, email: lead.email, phone: lead.phone,
        address: lead.address, postal_code: lead.postal_code,
        property_type: lead.property_type, rental_model: lead.rental_model,
        bedrooms: lead.bedrooms, sqm: lead.sqm,
        availability: lead.availability, lead_type: lead.lead_type,
        units: lead.units, num_properties: lead.num_properties,
        finn_url: lead.finn_url || undefined,
        matrikkel_number: lead.matrikkel_number || undefined,
        seksjonsnr: lead.seksjonsnr || undefined,
        andelsnr: lead.andelsnr || undefined,
        bygningstype: lead.bygningstype || undefined,
        registry_owner_name: lead.registry_owner_name || undefined,
        registry_owner_type: lead.registry_owner_type || undefined,
        registry_orgnr: lead.registry_orgnr || undefined,
        notes: fwdNotes,
      });
      await db.collection('leads').updateOne({ id: lead.id }, { $set: {
        forwarded: fwd.ok,
        platform_id: fwd.id || null,
        forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
        forwarded_at: fwd.ok ? new Date().toISOString() : null,
      } });
      lead.forwarded = fwd.ok; lead.platform_id = fwd.id || null;

      // Meta Conversions API (server-side Lead). event_id = lead.id → deduplikeres
      // mot nettleser-pixelens Lead-hendelse. Non-fatal: skal aldri velte lead-flyten.
      try {
        if (metaCapiConfigured()) {
          const att = lead.attribution || {};
          const capi = await sendMetaCapiEvent({
            eventName: 'Lead',
            eventId: lead.id,
            eventTime: lead.createdAt,
            actionSource: 'website',
            eventSourceUrl: request.headers.get('referer') || (att.landing_page ? `${process.env.NEXT_PUBLIC_BASE_URL || ''}${att.landing_page}` : undefined),
            email: lead.email, phone: lead.phone, fullName: lead.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            clientIp: clientIp(request), userAgent: request.headers.get('user-agent') || '',
            customData: { content_name: lead.lead_type || 'huseier' },
          });
          await db.collection('leads').updateOne({ id: lead.id }, { $set: { metaCapi: { event: 'Lead', ok: capi.ok, at: new Date().toISOString(), error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* CAPI er best-effort */ }

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
        external_ref: tenant.id, source_system: 'digihome-marketing',
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

      // Meta Conversions API (server-side Lead for leietaker). event_id = tenant.id.
      try {
        if (metaCapiConfigured()) {
          const att = tenant.attribution || {};
          const capi = await sendMetaCapiEvent({
            eventName: 'Lead',
            eventId: tenant.id,
            eventTime: tenant.createdAt,
            actionSource: 'website',
            eventSourceUrl: request.headers.get('referer') || undefined,
            email: tenant.email, phone: tenant.phone, fullName: tenant.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            clientIp: clientIp(request), userAgent: request.headers.get('user-agent') || '',
            customData: { content_name: 'leietaker' },
          });
          await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: { metaCapi: { event: 'Lead', ok: capi.ok, at: new Date().toISOString(), error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* best-effort */ }

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

    // --- Admin: Google Ads offline-konverteringsfeed (CSV) -----------------
    // Eksporterer vunne leads med gclid → "Conversions from clicks"-mal.
    // Lastes opp i Google Ads → Smart Bidding optimaliserer mot ekte kunder.
    if (route === '/admin/ads/offline-conversions' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const convName = (process.env.GOOGLE_ADS_OFFLINE_CONVERSION_NAME || 'DigiHome – Vunnet utleier');
      const defVal = Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE || '0') || 0;
      // Google avviser klikk eldre enn 90 dager. Vi bruker createdAt som klikk-tid-proxy.
      const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();
      const won = await db.collection('leads').find({
        status: 'won',
        'attribution.gclid': { $exists: true, $nin: [null, ''] },
        createdAt: { $gte: cutoff },
      }).sort({ wonAt: -1 }).limit(5000).toArray();

      const lines = [];
      lines.push('Parameters:TimeZone=Europe/Oslo');
      lines.push('Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Transaction ID');
      let included = 0;
      for (const l of won) {
        const gclid = (l.attribution && l.attribution.gclid) || '';
        if (!gclid) continue;
        const t = osloTime(l.wonAt || l.statusUpdatedAt || l.createdAt);
        if (!t) continue;
        const val = (Number(l.wonValue) > 0 ? Number(l.wonValue) : defVal);
        const cur = (l.wonCurrency || 'NOK');
        lines.push([
          csvEsc(gclid), csvEsc(convName), csvEsc(t),
          val > 0 ? val.toFixed(2) : '', val > 0 ? csvEsc(cur) : '', csvEsc(l.id),
        ].join(','));
        included++;
      }
      const csv = lines.join('\r\n') + '\r\n';
      const fname = `digihome-google-ads-konverteringer-${new Date().toISOString().slice(0, 10)}.csv`;
      const res = new NextResponse(csv, { status: 200 });
      res.headers.set('Content-Type', 'text/csv; charset=utf-8');
      res.headers.set('Content-Disposition', `attachment; filename="${fname}"`);
      res.headers.set('X-Conversions-Count', String(included));
      res.headers.set('Cache-Control', 'no-store');
      return cors(res);
    }

    // --- Admin: Annonser — importer Google Ads kostnadsrapport (CSV) -------
    if (route === '/admin/ads/import' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const csv = (body.csv || '').toString();
      if (!csv.trim()) return cors(NextResponse.json({ ok: false, error: 'Mangler CSV-innhold' }, { status: 400 }));
      const parsed = parseGoogleAdsCsv(csv);
      if (!parsed.ok) return cors(NextResponse.json({ ok: false, error: parsed.error }, { status: 400 }));

      const nowIso = new Date().toISOString();
      // Periode: bruk fra CSV-preamble, ellers manuell override fra body, ellers siste 30 dager.
      const periodFrom = parsed.periodFrom || (body.periodFrom ? new Date(body.periodFrom).toISOString() : new Date(Date.now() - 30 * 86400000).toISOString());
      const periodTo = parsed.periodTo || (body.periodTo ? new Date(body.periodTo).toISOString() : nowIso);
      const label = parsed.label || (body.label || '').toString().slice(0, 120) || `Import ${nowIso.slice(0, 10)}`;

      const imp = {
        id: uuidv4(),
        label,
        currency: (body.currency ? String(body.currency).toUpperCase().slice(0, 3) : parsed.currency) || 'NOK',
        periodFrom, periodTo,
        totals: parsed.totals,
        campaigns: parsed.campaigns.slice(0, 500),
        importedAt: nowIso,
        source: 'google_ads_csv',
      };
      await db.collection('ad_imports').insertOne(imp);
      const economics = await computeAdsEconomics(db, imp);
      return cors(NextResponse.json({ ok: true, economics, parsedCampaigns: parsed.campaigns.length }, { status: 201 }));
    }

    // --- Admin: Annonser — oversikt (Google CSV + Meta API + blandet CAC) --
    if (route === '/admin/ads/overview' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const importId = searchParams.get('importId');
      const query = importId ? { id: importId } : {};
      const imp = await db.collection('ad_imports').find(query, { projection: { _id: 0 } }).sort({ importedAt: -1 }).limit(1).next();
      const imports = await db.collection('ad_imports')
        .find({}, { projection: { _id: 0, id: 1, label: 1, periodFrom: 1, periodTo: 1, importedAt: 1, currency: 1, 'totals.cost': 1 } })
        .sort({ importedAt: -1 }).limit(50).toArray();
      const googleEco = imp ? await computeAdsEconomics(db, imp) : null;

      // Meta: bruk siste lagrede snapshot (synkes eksplisitt via /admin/ads/meta-sync) — raskt, ingen live-kall.
      let metaEco = null;
      const metaSnap = await db.collection('meta_imports').find({}, { projection: { _id: 0 } }).sort({ importedAt: -1 }).limit(1).next();
      if (metaSnap) metaEco = await computeMetaEconomics(db, metaSnap);

      const combined = (googleEco || metaEco) ? combineAdsEconomics(googleEco, metaEco) : null;
      const empty = !googleEco && !metaEco;
      return cors(NextResponse.json({
        ok: true, empty,
        economics: googleEco, meta: metaEco, combined,
        metaConfigured: metaAdsConfigured(),
        googleConfigured: composioConfigured(),
        googleSource: imp ? (imp.source || null) : null,
        imports,
      }));
    }

    // --- Admin: Annonser — Google Ads via Composio: start OAuth-tilkobling ---
    if (route === '/admin/ads/google-connect' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!composioConfigured()) return cors(NextResponse.json({ ok: false, error: 'Composio er ikke konfigurert (mangler COMPOSIO_API_KEY)' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const base = process.env.NEXT_PUBLIC_BASE_URL || '';
      const callbackUrl = (body.callbackUrl && String(body.callbackUrl)) || `${base}/admin?googleads=connected`;
      try {
        const { redirectUrl, connectionId, authConfigId } = await createConnectLink(db, { callbackUrl });
        return cors(NextResponse.json({ ok: true, redirectUrl, connectionId, authConfigId }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'Kunne ikke opprette tilkoblingslenke' }, { status: 502 }));
      }
    }

    // --- Admin: Annonser — Google Ads via Composio: tilkoblingsstatus -------
    if (route === '/admin/ads/google-status' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!composioConfigured()) return cors(NextResponse.json({ ok: true, configured: false, connected: false }));
      try {
        const st = await getConnectionStatus();
        return cors(NextResponse.json({ ok: true, configured: true, customerId: defaultCustomerId(), ...st }));
      } catch (e) {
        return cors(NextResponse.json({ ok: true, configured: true, connected: false, status: 'ERROR', error: e.message }));
      }
    }

    // --- Admin: Annonser — Google Ads via Composio: synk live kostnad ------
    if (route === '/admin/ads/google-sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!composioConfigured()) return cors(NextResponse.json({ ok: false, error: 'Composio er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const presetDays = { last_7d: 7, last_30d: 30, last_90d: 90 };
      const datePreset = ['last_7d', 'last_30d', 'last_90d'].includes(body.datePreset) ? body.datePreset : 'last_30d';
      const days = presetDays[datePreset];
      const nowIso = new Date().toISOString();
      const since = body.since ? new Date(body.since).toISOString() : new Date(Date.now() - days * 86400000).toISOString();
      const until = body.until ? new Date(body.until).toISOString() : nowIso;
      try {
        const report = await runCampaignReport({ since, until, customerId: body.customerId });
        const imp = {
          id: uuidv4(),
          label: `Google Ads (live) · ${report.from} – ${report.to}`,
          currency: 'NOK',
          periodFrom: new Date(report.from).toISOString(),
          periodTo: new Date(`${report.to}T23:59:59.999Z`).toISOString(),
          totals: report.totals,
          campaigns: report.campaigns.slice(0, 500),
          importedAt: nowIso,
          source: 'google_ads_composio',
          customerId: report.customerId,
        };
        await db.collection('ad_imports').insertOne(imp);
        // behold maks 20 ferskeste Composio-importer
        const stale = await db.collection('ad_imports').find({ source: 'google_ads_composio' }, { projection: { _id: 1, importedAt: 1 } }).sort({ importedAt: -1 }).skip(20).toArray();
        if (stale.length) await db.collection('ad_imports').deleteMany({ _id: { $in: stale.map((o) => o._id) } });
        const economics = await computeAdsEconomics(db, imp);
        return cors(NextResponse.json({ ok: true, economics, parsedCampaigns: report.campaigns.length, customerId: report.customerId }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'Google Ads-synk feilet' }, { status: 502 }));
      }
    }

    // --- Admin: Annonser — synk Meta-forbruk (Marketing API, read-only) ----
    if (route === '/admin/ads/meta-sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!metaAdsConfigured()) return cors(NextResponse.json({ ok: false, error: 'Meta er ikke konfigurert (mangler token/konto-ID)' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const presetDays = { last_7d: 7, last_30d: 30, last_90d: 90 };
      const datePreset = ['last_7d', 'last_30d', 'last_90d'].includes(body.datePreset) ? body.datePreset : 'last_30d';
      const days = presetDays[datePreset];
      const nowIso = new Date().toISOString();
      const periodFrom = body.since ? new Date(body.since).toISOString() : new Date(Date.now() - days * 86400000).toISOString();
      const periodTo = body.until ? new Date(body.until).toISOString() : nowIso;
      try {
        const useRange = body.since && body.until;
        const [campaigns, account] = await Promise.all([
          fetchMetaInsights(useRange ? { since: String(body.since).slice(0, 10), until: String(body.until).slice(0, 10) } : { datePreset }),
          fetchMetaAccount().catch(() => null),
        ]);
        const totals = campaigns.reduce((a, c) => ({
          cost: a.cost + (c.cost || 0), clicks: a.clicks + (c.clicks || 0), impressions: a.impressions + (c.impressions || 0),
        }), { cost: 0, clicks: 0, impressions: 0 });
        const snap = {
          id: uuidv4(), source: 'meta_api',
          label: (account && account.name) ? account.name : 'Meta',
          currency: (account && account.currency) || 'NOK',
          accountStatus: account ? account.status : null,
          periodFrom, periodTo, datePreset,
          totals, campaigns: campaigns.slice(0, 500),
          importedAt: nowIso,
        };
        await db.collection('meta_imports').insertOne(snap);
        const stale = await db.collection('meta_imports').find({}, { projection: { _id: 1, importedAt: 1 } }).sort({ importedAt: -1 }).skip(20).toArray();
        if (stale.length) await db.collection('meta_imports').deleteMany({ _id: { $in: stale.map((o) => o._id) } });
        const economics = await computeMetaEconomics(db, snap);
        return cors(NextResponse.json({ ok: true, economics, parsedCampaigns: campaigns.length, account }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'Meta-synk feilet' }, { status: 502 }));
      }
    }

    // --- Admin: hent Meta Lead Ads-leads inn i systemet (leads_retrieval) --
    if (route === '/admin/leads/meta-sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!metaLeadAdsConfigured()) return cors(NextResponse.json({ ok: false, error: 'Meta er ikke konfigurert' }, { status: 400 }));
      try {
        const pages = await fetchPages();
        const nowIso = new Date().toISOString();
        let imported = 0, skipped = 0;
        const formsOut = [];
        for (const page of pages) {
          let forms = [];
          try { forms = await fetchLeadForms(page.id, page.token); } catch (e) { continue; }
          for (const form of forms) {
            const isTenant = /leietaker|leie|tenant|bolig.?s.?ker/i.test(form.name || '');
            const coll = isTenant ? 'tenant_leads' : 'leads';
            const sync = await db.collection('meta_leadgen_sync').findOne({ formId: form.id });
            const since = sync && sync.lastCreatedUnix ? sync.lastCreatedUnix : undefined;
            let leads = [];
            if (form.leads_count > 0) {
              try { leads = await fetchFormLeads(form.id, page.token, { since }); } catch (e) { leads = []; }
            }
            let maxCreated = since || 0;
            let formImported = 0;
            for (const ml of leads) {
              const createdUnix = Math.floor(new Date(ml.created_time).getTime() / 1000);
              if (createdUnix > maxCreated) maxCreated = createdUnix;
              const r = await importMetaLeadDoc(db, { ...ml, form_id: form.id }, form.name);
              if (r === 'imported') { imported++; formImported++; }
              else if (r === 'skipped') skipped++;
            }
            await db.collection('meta_leadgen_sync').updateOne(
              { formId: form.id },
              { $set: { formId: form.id, formName: form.name, lastCreatedUnix: maxCreated, lastSyncedAt: nowIso, leadsCount: form.leads_count } },
              { upsert: true },
            );
            formsOut.push({ id: form.id, name: form.name, status: form.status, leads_count: form.leads_count, imported: formImported, type: isTenant ? 'leietaker' : 'huseier' });
          }
        }
        return cors(NextResponse.json({ ok: true, imported, skipped, pages: pages.map((p) => ({ id: p.id, name: p.name })), forms: formsOut, syncedAt: nowIso }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'Lead Ads-synk feilet' }, { status: 502 }));
      }
    }

    // --- Admin: Annonser — slett en import ---------------------------------
    if (route === '/admin/ads/import' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const r = await db.collection('ad_imports').deleteOne({ id });
      return cors(NextResponse.json({ ok: true, deleted: r.deletedCount }));
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
      // Vunnet kontrakt → registrer tidspunkt + verdi (for Google Ads offline-konvertering).
      if (status === 'won') {
        update.wonAt = nowIso;
        const v = Number(body.value);
        if (isFinite(v) && v > 0) { update.wonValue = Math.round(v * 100) / 100; update.wonCurrency = (body.currency || 'NOK').toString().slice(0, 3).toUpperCase(); }
      }
      await db.collection(coll).updateOne({ id }, { $set: update });

      // Meta CAPI: admin markerer vunnet → server-side Purchase (samme event_id som
      // webhook-veien → deduplikeres). Closed-loop også for manuelle utfall.
      try {
        if (status === 'won' && metaCapiConfigured()) {
          const att = existing.attribution || {};
          const wonVal = update.wonValue || Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || undefined;
          const capi = await sendMetaCapiEvent({
            eventName: 'Purchase',
            eventId: `won-${id}`,
            eventTime: update.wonAt || nowIso,
            actionSource: 'system_generated',
            email: existing.email, phone: existing.phone, fullName: existing.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            value: wonVal, currency: update.wonCurrency || 'NOK',
            customData: { content_name: existing.lead_type || 'lead', lead_event_id: id },
          });
          await db.collection(coll).updateOne({ id }, { $set: { metaCapiWon: { ok: capi.ok, at: nowIso, error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* best-effort */ }

      return cors(NextResponse.json({ ok: true, id, status }));
    }

    // --- Webhook: lead-status-sync FRA DigiHome-plattformen (to-veis closed-loop) ---
    // --- Meta Lead Ads webhook: verifikasjon (GET) -------------------------
    // Meta sender GET med hub.mode/hub.challenge/hub.verify_token ved oppsett.
    if (route === '/webhooks/meta-leadgen' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const mode = searchParams.get('hub.mode');
      const token = searchParams.get('hub.verify_token');
      const challenge = searchParams.get('hub.challenge');
      const verify = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
      if (mode === 'subscribe' && verify && token === verify) {
        return new NextResponse(challenge || '', { status: 200, headers: { 'Content-Type': 'text/plain' } });
      }
      return new NextResponse('Forbidden', { status: 403 });
    }

    // --- Meta Lead Ads webhook: mottak (POST) ------------------------------
    // Payload inneholder kun leadgen_id → vi henter selve leadet via Graph API.
    if (route === '/webhooks/meta-leadgen' && method === 'POST') {
      const raw = await request.text();
      // Signaturverifisering (X-Hub-Signature-256 = sha256=HMAC(appSecret, body)).
      const appSecret = process.env.META_APP_SECRET || '';
      if (appSecret) {
        const sigHeader = request.headers.get('x-hub-signature-256') || '';
        const expected = 'sha256=' + crypto.createHmac('sha256', appSecret).update(raw).digest('hex');
        const a = Buffer.from(sigHeader);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return new NextResponse('Invalid signature', { status: 401 });
        }
      }
      let payload = {};
      try { payload = JSON.parse(raw || '{}'); } catch (e) { payload = {}; }

      // Svar Meta RASKT (200) og prosesser i bakgrunnen — Meta retryer ved treghet/feil.
      (async () => {
        try {
          const db2 = await getDb();
          const entries = Array.isArray(payload.entry) ? payload.entry : [];
          for (const entry of entries) {
            const changes = Array.isArray(entry.changes) ? entry.changes : [];
            for (const ch of changes) {
              if (ch.field !== 'leadgen' || !ch.value) continue;
              const v = ch.value;
              const leadgenId = v.leadgen_id || v.leadgenId;
              const pageId = v.page_id || entry.id;
              const formId = v.form_id;
              if (!leadgenId) continue;
              try {
                const pageToken = await fetchPageToken(pageId);
                const [ml, formName] = await Promise.all([
                  fetchSingleLead(leadgenId, pageToken),
                  formId ? fetchFormName(formId, pageToken) : Promise.resolve(''),
                ]);
                await importMetaLeadDoc(db2, { ...ml, form_id: formId || (ml && ml.form_id) }, formName);
                // oppdater cursor for skjemaet
                if (formId) {
                  const createdUnix = ml && ml.created_time ? Math.floor(new Date(ml.created_time).getTime() / 1000) : Math.floor(Date.now() / 1000);
                  await db2.collection('meta_leadgen_sync').updateOne(
                    { formId },
                    { $set: { formId, formName, lastCreatedUnix: createdUnix, lastSyncedAt: new Date().toISOString(), via: 'webhook' } },
                    { upsert: true },
                  );
                }
              } catch (e) { /* enkelt-lead feilet — Meta retryer */ }
            }
          }
        } catch (e) { /* svelg — vi har allerede svart 200 */ }
      })();

      return new NextResponse('EVENT_RECEIVED', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // --- Admin: registrer leadgen-webhook programmatisk (app- + side-abonnement) ---
    if (route === '/admin/meta/setup-webhook' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const appId = process.env.META_APP_ID || '';
      const appSecret = process.env.META_APP_SECRET || '';
      const verify = process.env.META_WEBHOOK_VERIFY_TOKEN || '';
      if (!appId || !appSecret || !verify) return cors(NextResponse.json({ ok: false, error: 'Mangler META_APP_ID / META_APP_SECRET / META_WEBHOOK_VERIFY_TOKEN' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const base = String(body.callbackBase || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      const callbackUrl = `${base}/api/webhooks/meta-leadgen`;
      const VER = process.env.META_API_VERSION || 'v21.0';
      const appToken = `${appId}|${appSecret}`;
      const out = { callbackUrl };
      try {
        // 1) App-nivå abonnement (object=page, fields=leadgen). Meta verifiserer callback via GET.
        const subRes = await fetch(`https://graph.facebook.com/${VER}/${appId}/subscriptions`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ object: 'page', callback_url: callbackUrl, fields: 'leadgen', verify_token: verify, access_token: appToken }),
        });
        const subJ = await subRes.json().catch(() => ({}));
        out.appSubscription = { ok: subRes.ok && subJ.success !== false, response: subJ };
        // 2) Side-abonnement (subscribed_apps med leadgen) for hver tilgjengelig side.
        const pages = await fetchPages();
        out.pages = [];
        for (const p of pages) {
          try {
            const r = await fetch(`https://graph.facebook.com/${VER}/${p.id}/subscribed_apps`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscribed_fields: 'leadgen', access_token: p.token }),
            });
            const j = await r.json().catch(() => ({}));
            out.pages.push({ page: p.name, id: p.id, ok: r.ok && j.success !== false, response: j });
          } catch (e) { out.pages.push({ page: p.name, id: p.id, ok: false, error: e.message }); }
        }
        return cors(NextResponse.json({ ok: out.appSubscription.ok, ...out }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'Webhook-oppsett feilet', ...out }, { status: 502 }));
      }
    }

    // --- Admin: abonner Facebook-siden på leadgen-webhook (subscribed_apps) -
    if (route === '/admin/meta/subscribe-leadgen' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!metaLeadAdsConfigured()) return cors(NextResponse.json({ ok: false, error: 'Meta ikke konfigurert' }, { status: 400 }));
      try {
        const pages = await fetchPages();
        const VER = process.env.META_API_VERSION || 'v21.0';
        const results = [];
        for (const p of pages) {
          try {
            const url = `https://graph.facebook.com/${VER}/${p.id}/subscribed_apps`;
            const res = await fetch(url, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ subscribed_fields: 'leadgen', access_token: p.token }),
            });
            const j = await res.json().catch(() => ({}));
            results.push({ page: p.name, id: p.id, ok: res.ok && (j.success !== false), response: j });
          } catch (e) { results.push({ page: p.name, id: p.id, ok: false, error: e.message }); }
        }
        return cors(NextResponse.json({ ok: true, results }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'Abonnering feilet' }, { status: 502 }));
      }
    }

    if (route === '/webhooks/lead-status' && method === 'POST') {
      const secret = process.env.LEAD_SYNC_SECRET || '';
      const provided = request.headers.get('x-webhook-secret') || '';
      if (!secret || provided !== secret) {
        return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      }
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const VALID = ['new', 'contacted', 'qualified', 'won', 'lost'];
      const raw = (body.status || '').toString().toLowerCase().trim();
      const map = {
        ny: 'new', open: 'new', åpen: 'new', kontaktet: 'contacted', contacted: 'contacted',
        kvalifisert: 'qualified', qualified: 'qualified', vunnet: 'won', won: 'won', signed: 'won',
        signert: 'won', closed_won: 'won', tapt: 'lost', lost: 'lost', closed_lost: 'lost', avvist: 'lost',
      };
      const status = VALID.includes(raw) ? raw : (map[raw] || '');
      if (!status) return cors(NextResponse.json({ ok: false, error: 'Ugyldig status', got: raw }, { status: 400 }));

      const externalRef = (body.external_ref || body.externalRef || '').toString();
      const platformId = (body.platform_id || body.platformId || '').toString();
      const email = (body.email || '').toString().toLowerCase().trim();

      // Match: external_ref (vår id) → platform_id → e-post, på tvers av begge kolleksjoner.
      let coll = null, lead = null, matchedBy = '';
      for (const c of ['leads', 'tenant_leads']) {
        const or = [];
        if (externalRef) or.push({ id: externalRef });
        if (platformId) or.push({ platform_id: platformId });
        if (email) or.push({ email });
        if (!or.length) break;
        const found = await db.collection(c).findOne({ $or: or });
        if (found) {
          coll = c; lead = found;
          matchedBy = (externalRef && found.id === externalRef) ? 'external_ref' : (platformId && found.platform_id === platformId) ? 'platform_id' : 'email';
          break;
        }
      }
      if (!lead) return cors(NextResponse.json({ ok: false, error: 'Lead ikke funnet' }, { status: 404 }));

      const nowIso = new Date().toISOString();
      const changedAt = body.changed_at ? new Date(body.changed_at).toISOString() : nowIso;
      const tenant = (body.tenant || '').toString().slice(0, 60) || null;
      const update = {
        status,
        statusUpdatedAt: changedAt,
        statusHistory: [...(lead.statusHistory || []), { status, at: changedAt, via: 'platform', tenant: tenant || undefined }].slice(-30),
        syncedFromPlatform: true,
        platformTenant: tenant || lead.platformTenant || null,
        platformSyncAt: nowIso,
      };
      if (status !== 'new' && !lead.firstResponseAt) update.firstResponseAt = changedAt;
      if (status === 'won') {
        update.wonAt = changedAt;
        const v = Number(body.value);
        if (isFinite(v) && v > 0) { update.wonValue = Math.round(v * 100) / 100; update.wonCurrency = (body.currency || 'NOK').toString().slice(0, 3).toUpperCase(); }
      }
      await db.collection(coll).updateOne({ id: lead.id }, { $set: update });

      // Meta CAPI: når et lead vinnes → server-side konvertering med ekte kontraktsverdi.
      // Lar Meta optimalisere mot faktiske kunder (closed-loop). event_id = won-<id> for dedup.
      let metaCapi = null;
      try {
        if (status === 'won' && metaCapiConfigured()) {
          const att = lead.attribution || {};
          const wonVal = update.wonValue || Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || undefined;
          const capi = await sendMetaCapiEvent({
            eventName: 'Purchase',
            eventId: `won-${lead.id}`,
            eventTime: update.wonAt || nowIso,
            actionSource: 'system_generated',
            email: lead.email, phone: lead.phone, fullName: lead.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            value: wonVal, currency: update.wonCurrency || 'NOK',
            customData: { content_name: lead.lead_type || 'lead', lead_event_id: lead.id },
          });
          metaCapi = { ok: capi.ok, error: capi.ok ? undefined : capi.error };
          await db.collection(coll).updateOne({ id: lead.id }, { $set: { metaCapiWon: { ok: capi.ok, at: nowIso, error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* best-effort */ }

      return cors(NextResponse.json({ ok: true, id: lead.id, status, matched_by: matchedBy, meta_capi: metaCapi || undefined }));
    }

    // --- Admin: lead-detalj + kundereise-tidslinje ---
    if (route === '/admin/lead' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const id = (searchParams.get('id') || '').toString();
      const coll = searchParams.get('type') === 'tenant' ? 'tenant_leads' : 'leads';
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const lead = await db.collection(coll).findOne({ id });
      if (!lead) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const sid = lead.attribution && lead.attribution.sessionId;
      const vid = lead.attribution && lead.attribution.visitorId;
      let timeline = [];
      const or = [];
      if (sid) or.push({ sessionId: sid });
      if (vid) or.push({ visitorId: vid });
      if (or.length) {
        timeline = await db.collection('events')
          .find({ $or: or }, { projection: { _id: 0, type: 1, ts: 1, path: 1, channel: 1, device: 1, source: 1, medium: 1, campaign: 1, referrer: 1, meta: 1 } })
          .sort({ ts: 1 }).limit(300).toArray();
      }
      return cors(NextResponse.json({ ok: true, lead: clean(lead), timeline }));
    }

    // --- Admin: eksporter leads til CSV (BOM for æøå i Excel) ---
    if (route === '/admin/leads/export' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const isTenant = searchParams.get('type') === 'tenant';
      const coll = isTenant ? 'tenant_leads' : 'leads';
      const docs = await db.collection(coll).find({}).sort({ createdAt: -1 }).limit(10000).toArray();
      const cols = isTenant
        ? ['createdAt', 'name', 'email', 'phone', 'preferred_area', 'budget_min', 'budget_max', 'bedrooms', 'move_in_date', 'status', 'channel', 'source', 'campaign', 'forwarded', 'syncedFromPlatform']
        : ['createdAt', 'name', 'email', 'phone', 'address', 'postal_code', 'property_type', 'sqm', 'bedrooms', 'num_properties', 'matrikkel_number', 'seksjonsnr', 'registry_owner_name', 'status', 'wonValue', 'wonCurrency', 'channel', 'source', 'campaign', 'gclid', 'forwarded', 'syncedFromPlatform'];
      const lines = [cols.join(',')];
      for (const d of docs) {
        const att = d.attribution || {};
        const row = cols.map((c) => {
          let v;
          if (c === 'channel') v = att.channel;
          else if (c === 'source') v = att.source || d.source;
          else if (c === 'campaign') v = att.campaign;
          else if (c === 'gclid') v = att.gclid;
          else v = d[c];
          return csvEsc(v === null || v === undefined ? '' : v);
        });
        lines.push(row.join(','));
      }
      const csv = '\ufeff' + lines.join('\r\n') + '\r\n';
      const fname = `digihome-${isTenant ? 'leietakere' : 'utleiere'}-${new Date().toISOString().slice(0, 10)}.csv`;
      const res = new NextResponse(csv, { status: 200 });
      res.headers.set('Content-Type', 'text/csv; charset=utf-8');
      res.headers.set('Content-Disposition', `attachment; filename="${fname}"`);
      res.headers.set('Cache-Control', 'no-store');
      return cors(res);
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
