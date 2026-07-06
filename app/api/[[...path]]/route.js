import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';
import { promises as fsp } from 'fs';
import nodePath from 'path';
import { getDb, clean } from '@/lib/mongodb';
import { getObject, putObject, PUBLIC_PREFIX } from '@/lib/objectStorage';
import { isBot, buildEvent, ensureAnalyticsIndexes, computeAnalytics, computeLeadIntel, computeFunnels, computeLandingPages } from '@/lib/analytics-server';
import { deriveChannel, serializeForLLM, computeWebVitals, detectAnomalies, computeLive, computeAdsEconomics, computeMetaEconomics, combineAdsEconomics, computeAdsLeadsSeries } from '@/lib/analytics-server';
import { parseGoogleAdsCsv } from '@/lib/adsImport';
import { sendMetaCapiEvent, metaCapiConfigured } from '@/lib/meta-capi';
import { fetchMetaInsights, fetchMetaAccount, metaAdsConfigured, getCachedMetaReport, META_PERIODS, metaPeriodToRange, getCachedMetaCreatives, fetchMetaPreviewSrc, isValidPreviewFormat, getCachedMetaAdsTable, fetchMetaDaily, fetchMetaDailyActions, fetchMetaAdsWithInsights } from '@/lib/meta-ads';
import { fetchPages, fetchLeadForms, fetchFormLeads, mapLeadFields, metaLeadAdsConfigured, fetchSingleLead, fetchFormName, fetchPageToken } from '@/lib/meta-leadads';
import { composioConfigured, createConnectLink, getConnectionStatus, runCampaignReport, defaultCustomerId, getCachedReport, GOOGLE_PERIODS, getCachedCreatives, activeProvider } from '@/lib/google-ads-provider';
import { googleAdsNativeConfigured, listConversionActions, resolveOfflineConversionAction, uploadClickConversion, toConversionDateTime, listCampaignsDetailed, suggestGeoTargets, setCampaignStatus, updateCampaignBudget, createSearchCampaign, createCompetitorCampaign, getCampaignByName, runAdsWithMetrics, runSearchTerms, runKeywordMetrics, generateKeywordIdeas, gaqlSearch, setCampaignMaximizeClicks, listRsaAds, createRsaAd, setAdStatus } from '@/lib/google-ads-native';
import { runAdsWithMetricsViaComposio } from '@/lib/composio-google-ads';
import { dataManagerConfigured, ingestOfflineConversion } from '@/lib/google-ads-datamanager';
import { IMPORTED_COLL, importRecords, parseCsv, summarizeImported, syncFromPlatform, listImported, updateImportedOverride } from '@/lib/imported-leads';
import { queueLeadPushback, flushLeadPushbacks, pushbackStats } from '@/lib/lead-pushback';
import {
  DD_SECTIONS, DD_CATEGORIES,
  createLink as ddCreateLink, listLinks as ddListLinks, updateLink as ddUpdateLink, deleteLink as ddDeleteLink,
  validateToken as ddValidateToken, recordView as ddRecordView, logAudit as ddLogAudit, listAudit as ddListAudit,
  validateFileMeta as ddValidateFileMeta, createDocument as ddCreateDocument, addVersion as ddAddVersion,
  listDocuments as ddListDocuments, updateDocument as ddUpdateDocument, getDocument as ddGetDocument,
  deleteDocument as ddDeleteDocument, publicDocumentView as ddPublicDocView,
  saveChunk as ddSaveChunk, assembleChunks as ddAssembleChunks, cleanupChunks as ddCleanupChunks,
  askQuestion as ddAskQuestion, listQuestionsForLink as ddListQuestionsForLink,
  listAllQuestions as ddListAllQuestions, answerQuestion as ddAnswerQuestion, deleteQuestion as ddDeleteQuestion,
} from '@/lib/investor-room';
import { computeKpiDashboard, getKpiSettings, setKpiSettings } from '@/lib/kpi-dashboard';
import { computeLlmUsageDashboard, getModelOverrides, setModelOverride, logImageUsage, AVAILABLE_MODELS, PLATFORM_MODELS, DEFAULT_MODEL, USD_TO_NOK } from '@/lib/llm-usage';
import { logExtUsage, summarizeExtUsage, getPlatformUsage } from '@/lib/ext-usage';
import { getFinanceSettings, setFinanceSettings, listCosts, upsertCost, deleteCost, listContracts, upsertContract, deleteContract, listEvents, upsertEvent, deleteEvent, computeResultat, computeLikviditet, computeFinanceOverview, computeTrends, captureSnapshot, computeInvestorMetrics, computeForecast, computeBoardPack, computeCustomers, computePlatformCustomers } from '@/lib/finance';
import { syncContractsFromPlatform, syncCustomersFromPlatform } from '@/lib/contracts-sync';
import { ga4MpConfigured, sendGa4Purchase } from '@/lib/ga4-mp';
import { buildRecommendations } from '@/lib/ads-recommendations';
import { generateRsaCopy, generateMetaCopy } from '@/lib/ads-ai';
import { runOptimization, getOptimizeConfig, setOptimizeConfig, getLastRun, listRuns, applyRecommendation } from '@/lib/ads-optimize';
import { sendWeeklyReport, buildReportData, renderReportHtml } from '@/lib/ads-report';
import { buildMarketingMetrics } from '@/lib/marketing-metrics';
import { emailConfigured, reportRecipients, sendHtmlEmail } from '@/lib/email';
import { NEWSLETTER_COLL, OPTOUT_COLL, NL_EVENTS_COLL, renderNewsletterHtml, resolveAudience, audienceCounts, sanitizeBlocks, hasContent, buildUnsubUrl, verifyUnsubToken, slugifyCampaign, normEmail as nlNormEmail, recipientId, TEMPLATES, templateBlocks, THEMES, TRACKING_GIF, applyMergeTags } from '@/lib/newsletter';
import { syncPropertiesFromPlatform, maybeAutoSyncProperties, listAdminProperties, listPublicProperties, setPropertyVisibility, getPropertiesSyncMeta } from '@/lib/properties-sync';
import { buildLeadReceipt, buildLeadAdminNotification } from '@/lib/lead-emails';
import { fireLeadEmails } from '@/lib/lead-emails';
import { buildAlerts } from '@/lib/ads-monitor';
import { fetchCompetitorGallery, serpApiConfigured } from '@/lib/serpapi';
import { chatLLM } from '@/lib/llm';
import { adstudioConfigured, fetchAdStudioContext, uploadAdImage, buildCreativeSpec, buildAssetFeedSpec, generatePreviews, createStudioAd, setAdStatus as adstudioSetAdStatus, fetchAdsLive, searchGeoLocations, createCampaign, createAdSet } from '@/lib/adstudio';
import { slugify } from '@/lib/site';
import { LANDING } from '@/lib/landing';
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

// --- Annonse-varsler: WoW-totaler (kost/klikk/leads) + Meta-frekvens → buildAlerts ---
// Brukes både av GET /admin/ads/alerts (UI) og cron ads-optimize (e-postvarsling).
async function computeAdsAlertsData(db) {
  const day = (off) => new Date(Date.now() - off * 86400000).toISOString().slice(0, 10);
  const curFrom = day(7), curTo = day(1), prevFrom = day(14), prevTo = day(8);
  let gSeries = [], mSeries = [], metaAds = [];
  if (composioConfigured()) {
    try { const r = await getCachedReport(db, 'last_30d'); gSeries = (r.report && r.report.series) || []; } catch (e) {}
  }
  if (metaAdsConfigured()) {
    try { const r = await getCachedMetaReport(db, 'last_30d'); mSeries = (r.snap && r.snap.series) || []; } catch (e) {}
    try { const t = await getCachedMetaAdsTable(db, 'last_30d'); metaAds = t.ads || []; } catch (e) {}
  }
  let leadsSeries = [];
  try { leadsSeries = await computeAdsLeadsSeries(db, `${prevFrom}T00:00:00.000Z`, `${curTo}T23:59:59.999Z`); } catch (e) {}
  const sum = (from, to) => {
    const acc = { cost: 0, clicks: 0, impressions: 0, conversions: 0 };
    for (const d of [...gSeries, ...mSeries]) {
      if (!d || !d.date || d.date < from || d.date > to) continue;
      acc.cost += Number(d.cost) || 0;
      acc.clicks += Number(d.clicks) || 0;
      acc.impressions += Number(d.impressions) || 0;
    }
    for (const d of leadsSeries) {
      if (!d || !d.date || d.date < from || d.date > to) continue;
      acc.conversions += Number(d.leads) || 0;
    }
    return acc;
  };
  const current = sum(curFrom, curTo);
  const previous = sum(prevFrom, prevTo);
  const alerts = buildAlerts({ metaAds, googleAds: [], current, previous });
  return {
    alerts,
    window: { current: { from: curFrom, to: curTo }, previous: { from: prevFrom, to: prevTo } },
    totals: { current, previous },
    generatedAt: new Date().toISOString(),
  };
}

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
// Klassifiser user-agent for nyhetsbrev-sporing (enhet + e-postklient).
// NB: Gmail/Apple proxyer bildeåpninger — 'proxy' = reell enhet ukjent.
function nlClassifyUa(ua = '') {
  const s = String(ua);
  let client = 'annet';
  if (/GoogleImageProxy/i.test(s)) client = 'gmail';
  else if (/Outlook|Microsoft Office|MSOffice/i.test(s)) client = 'outlook';
  else if (/Thunderbird/i.test(s)) client = 'thunderbird';
  else if (/iPhone|iPad|Macintosh/.test(s) && /AppleWebKit/.test(s) && !/Chrome|CriOS/.test(s)) client = 'apple';
  else if (/Chrome|CriOS/i.test(s)) client = 'nettleser';
  let device = 'ukjent';
  if (/GoogleImageProxy/i.test(s)) device = 'proxy';
  else if (/iPad|Tablet/i.test(s)) device = 'nettbrett';
  else if (/Mobile|iPhone|Android/i.test(s)) device = 'mobil';
  else if (/Macintosh|Windows|X11|Linux/i.test(s)) device = 'desktop';
  return { device, client };
}
// Markedsføringssamtykke fra lett cookie (dh_consent_mkt=1|0) satt av samtykke-banneret.
// Returnerer true (godtatt), false (eksplisitt avslått) eller null (ukjent/ikke satt).
function marketingConsentFromRequest(request) {
  try {
    const cookie = request.headers.get('cookie') || '';
    const m = cookie.match(/(?:^|;\s*)dh_consent_mkt=([01])/);
    if (!m) return null;
    return m[1] === '1';
  } catch (e) { return null; }
}
// CAPI/offline-konv. skal fyre MED MINDRE bruker eksplisitt avslo markedsføring (=== false).
// Eldre leads uten lagret samtykke (undefined/null) bevarer dagens oppførsel (fyrer).
function marketingAllowed(consent) {
  return consent !== false;
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
    // VIKTIG: no-store — ellers kan CDN-en cache 404-en i timevis og «forgifte»
    // URL-en selv etter at filen er lastet opp (skjedde med nyhetsbrev-hero).
    return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404, headers: { 'Cache-Control': 'no-store' } }));
  }
  if (!obj) {
    return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404, headers: { 'Cache-Control': 'no-store' } }));
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
//   • preview/test  → plattformens preview (tenant-hub-210 ...)  — kun *.preview.emergentagent.com / localhost
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
  // Produksjon ligger på app.digihome.no (eget subdomene for plattformen).
  // Vi gjør ingen vert-omskriving lenger — kun trimmer trailing slashes.
  return u.replace(/\/+$/, '');
}
function digiHomeTarget() {
  if (isProdEnv()) {
    return {
      url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no'),
      key: process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '',
      env: 'prod',
    };
  }
  return {
    url: normalizeCrmUrl(
      process.env.DIGIHOME_API_URL_TEST ||
      process.env.DIGIHOME_API_URL ||
      'https://tenant-hub-210.preview.emergentagent.com'
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
    `&fuzzy=true&treffPerSide=20&side=0&asciiKompatibel=true` +
    `&filtrer=adresser.adressetekst,adresser.postnummer,adresser.poststed,adresser.kommunenummer`;

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
          const knr = String(a.kommunenummer || '');
          // Geo-prioritering: Bergen (4601) først, deretter Vestland (46xx),
          // så resten — vi er et Bergen-selskap og trafikken er lokal.
          const rank = knr === '4601' ? 0 : knr.startsWith('46') ? 1 : 2;
          return { text, sub, label: sub ? `${text}, ${sub}` : text, rank };
        })
        .filter((s) => {
          if (!s.text || seen.has(s.label)) return false;
          seen.add(s.label);
          return true;
        })
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 7)
        .map(({ rank, ...s }) => s);
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

// ── Google Places (Autocomplete + Details) — primær adressekilde ─────────────
// Geonorge foreslo adresser i hele landet (Nord-Norge før Bergen) og ga 56 %
// drop-off på adressesteget. Google gir relevans-rangering med Bergen-bias.
// Geonorge beholdes som fallback (gratis, ingen nøkkel) hvis Google feiler.
const BERGEN_LAT = 60.3913;
const BERGEN_LNG = 5.3221;

async function googlePlacesSearch(q) {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key) return null; // ikke konfigurert → fallback til Geonorge
  const cacheKey = 'g:' + q.toLowerCase();
  const hit = _addrCache.get(cacheKey);
  if (hit && Date.now() - hit.at < ADDR_TTL_MS) return hit.suggestions;

  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(q)}` +
    `&types=address&components=country:no&language=no` +
    `&location=${BERGEN_LAT},${BERGEN_LNG}&radius=30000&key=${key}`; // Bergen-bias, ikke strict
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    getDb().then((db) => logExtUsage(db, 'google_maps_autocomplete', 1)).catch(() => {}); // forbrukstelling (kun ekte kall, ikke cache)
    if (!r.ok) return null;
    const data = await r.json();
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return null; // kvote/nøkkelfeil → fallback
    const suggestions = (data.predictions || []).slice(0, 7).map((p) => ({
      text: (p.structured_formatting && p.structured_formatting.main_text) || p.description || '',
      sub: (p.structured_formatting && p.structured_formatting.secondary_text || '').replace(/,\s*(Norge|Norway)$/i, ''),
      label: (p.description || '').replace(/,\s*(Norge|Norway)$/i, ''),
      place_id: p.place_id || undefined,
    })).filter((s) => s.text);
    _addrCache.set(cacheKey, { at: Date.now(), suggestions });
    if (_addrCache.size > ADDR_CACHE_MAX) _addrCache.delete(_addrCache.keys().next().value);
    return suggestions;
  } catch (e) { return null; }
}

// Place Details → postnummer/poststed (Autocomplete-forslag mangler postnummer).
// Kalles av frontend ved valg av forslag. Cache: place_id er stabil.
async function googlePlaceDetails(placeId) {
  const key = (process.env.GOOGLE_MAPS_API_KEY || '').trim();
  if (!key || !placeId) return null;
  const cacheKey = 'gd:' + placeId;
  const hit = _addrCache.get(cacheKey);
  if (hit && Date.now() - hit.at < ADDR_TTL_MS) return hit.suggestions;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
    `&fields=address_component,formatted_address&language=no&key=${key}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    getDb().then((db) => logExtUsage(db, 'google_maps_details', 1)).catch(() => {}); // forbrukstelling (kun ekte kall, ikke cache)
    if (!r.ok) return null;
    const data = await r.json();
    if (data.status !== 'OK') return null;
    const comps = (data.result && data.result.address_components) || [];
    const get = (type) => ((comps.find((c) => (c.types || []).includes(type)) || {}).long_name || '');
    const street = [get('route'), get('street_number')].filter(Boolean).join(' ');
    const postalCode = get('postal_code');
    const city = get('postal_town') || get('locality') || get('sublocality') || '';
    const address = street || String((data.result && data.result.formatted_address) || '').replace(/,\s*(Norge|Norway)$/i, '');
    const out = {
      address,
      postalCode,
      city,
      label: [address, [postalCode, city].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    };
    _addrCache.set(cacheKey, { at: Date.now(), suggestions: out });
    if (_addrCache.size > ADDR_CACHE_MAX) _addrCache.delete(_addrCache.keys().next().value);
    return out;
  } catch (e) { return null; }
}

// ── Priskalkulator: standardkatalog (overstyres via settings.wizard_catalog) ──
const WIZARD_CATALOG_DEFAULT = {
  serviceLevels: [
    {
      key: 'selvbetjent', name: 'Selvbetjent', pct: 5, minMonthly: 500, badge: 'Nyhet',
      tagline: 'Du gjør jobben — vi leverer systemet',
      included: ['Annonsering på FINN.no', 'Digital kontrakt med BankID-signering', 'Husleieinnkreving og purring', 'Depositumskonto', 'Chat med leietaker', 'Utleiedashboard med full oversikt'],
      notIncluded: ['Visninger og leietakervalg', 'Inn- og utflyttingsbefaring', 'Vedlikeholdskoordinering'],
      models: ['langtid'],
    },
    {
      key: 'fullforvaltning', name: 'Fullforvaltning', pct: 10, minMonthly: 0, badge: 'Mest valgt',
      tagline: 'Vi gjør alt — du får utbetalingen',
      included: ['Alt i Selvbetjent', 'Visninger og leietakervalg', 'Inn- og utflyttingsbefaring', 'Vedlikeholdskoordinering døgnet rundt', 'Dynamisk prisoptimalisering', 'Dedikert forvalter'],
      notIncluded: [],
      models: ['langtid', 'hybrid'],
    },
  ],
  models: [
    { key: 'langtid', name: 'Langtidsutleie', desc: 'Stabil leietaker og forutsigbar månedlig leie' },
    { key: 'hybrid', name: 'Dynamisk utleie (10+2)', desc: 'Langtid + korttid i høysesong — typisk 20–30 % høyere inntekt', upliftPct: 25 },
  ],
  addons: [
    { key: 'markedspakke', name: 'Markedspakke', price: 4900, once: true, popular: true, desc: 'Profesjonell boligfoto, plantegning og premium FINN-annonse' },
    { key: 'foto', name: 'Profesjonell boligfoto', price: 2900, once: true, desc: 'Fotograf og redigering — 15–25 leveringsklare bilder' },
    { key: 'kredittsjekk', name: 'Kreditt- og referansesjekk', price: 490, once: true, desc: 'Grundig sjekk av leietaker før kontrakt (per kandidat)' },
    { key: 'innflytting', name: 'Innflyttingsklar', price: 3900, once: true, desc: 'Nedvask, nøkkelbokser og komplett klargjøring' },
    { key: 'visningshjelp', name: 'Visningshjelp', price: 1490, once: true, for: 'selvbetjent', desc: 'Vi holder visningen for deg (pris per visning)' },
    { key: 'juridisk', name: 'Juridisk trygghetspakke', price: 1990, once: true, desc: 'Kvalitetssikret kontrakt og rådgivning via Hoffmann Thinn' },
  ],
};

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

// Auth for agent-bro: admin ELLER delt AGENT_BRIDGE_SECRET (header x-bridge-token / ?token=).
function bridgeAuthed(request) {
  if (adminAuthed(request)) return true;
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || request.headers.get('x-bridge-token') || '';
    const secret = (process.env.AGENT_BRIDGE_SECRET || '').trim();
    return !!(secret && token === secret);
  } catch (e) { return false; }
}

// Re-forward leads/tenants som ikke er videresendt (forwarded !== true), med
// durabel eksponentiell backoff: hver feilede forward planlegges på nytt
// (next_retry_at) slik at vi ikke hamrer plattformen når den er nede.
function backoffIso(attempts) {
  const mins = Math.min(Math.pow(2, Math.max(0, attempts)), 720); // 1,2,4,…,cap 12t
  return new Date(Date.now() + mins * 60000).toISOString();
}
async function reforwardPending(db) {
  const results = { leads: { tried: 0, ok: 0 }, tenants: { tried: 0, ok: 0 } };
  const nowIso = new Date().toISOString();
  const dueFilter = { forwarded: { $ne: true }, $or: [{ next_retry_at: { $exists: false } }, { next_retry_at: null }, { next_retry_at: { $lte: nowIso } }] };
  const pendLeads = await db.collection('leads').find(dueFilter).limit(200).toArray();
  for (const lead of pendLeads) {
    results.leads.tried++;
    const fwd = await forwardToDigiHome('/api/leads', {
      external_ref: lead.id, source_system: 'digihome-marketing',
      marketing_visitor_id: lead.marketing_visitor_id || undefined,
      lead_source_type: lead.lead_source_type || undefined, is_paid: lead.is_paid,
      name: lead.name, email: lead.email, phone: lead.phone, address: lead.address,
      postal_code: lead.postal_code, property_type: lead.property_type, rental_model: lead.rental_model,
      bedrooms: lead.bedrooms, sqm: lead.sqm, availability: lead.availability, lead_type: lead.lead_type,
      units: lead.units, num_properties: lead.num_properties, notes: lead.notes,
      attribution: lead.attribution || undefined,
    });
    if (fwd.ok) results.leads.ok++;
    const attempts = (Number(lead.forward_attempts) || 0) + 1;
    await db.collection('leads').updateOne({ id: lead.id }, { $set: {
      forwarded: fwd.ok, platform_id: fwd.id || null, forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
      forwarded_at: fwd.ok ? new Date().toISOString() : (lead.forwarded_at || null),
      forward_attempts: attempts, next_retry_at: fwd.ok ? null : backoffIso(attempts),
    } });
  }
  const pendTenants = await db.collection('tenant_leads').find(dueFilter).limit(200).toArray();
  for (const t of pendTenants) {
    results.tenants.tried++;
    const budgetStr = (t.budget_min || t.budget_max)
      ? `${t.budget_min || ''}${t.budget_min && t.budget_max ? '–' : ''}${t.budget_max || ''} kr`.trim() : '';
    const fwd = await forwardToDigiHome('/api/tenants', {
      external_ref: t.id, source_system: 'digihome-marketing',
      marketing_visitor_id: t.marketing_visitor_id || undefined,
      lead_source_type: t.lead_source_type || undefined, is_paid: t.is_paid,
      name: t.name, email: t.email, phone: t.phone, desired_area: t.preferred_area, address: t.preferred_area,
      budget: budgetStr, bedrooms: t.bedrooms, move_in_date: t.move_in_date, message: t.notes,
      lead_type: 'leietaker', source: t.source || 'nettside',
    });
    if (fwd.ok) results.tenants.ok++;
    const attempts = (Number(t.forward_attempts) || 0) + 1;
    await db.collection('tenant_leads').updateOne({ id: t.id }, { $set: {
      forwarded: fwd.ok, platform_id: fwd.id || null, forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
      forwarded_at: fwd.ok ? new Date().toISOString() : (t.forwarded_at || null),
      forward_attempts: attempts, next_retry_at: fwd.ok ? null : backoffIso(attempts),
    } });
  }
  return results;
}

// Selvhelbredende re-forward: trigges opportunistisk når vi VET plattformen er
// naabar (en fersk forward lyktes nettopp), eller ved admin-last. Throttlet, og
// fire-and-forget så responsen ikke forsinkes. Billig når ingenting venter.
let _lastReforward = 0;
function maybeReforward(db, { force = false } = {}) {
  const now = Date.now();
  if (!force && now - _lastReforward < 120000) return; // maks hvert 2. min
  _lastReforward = now;
  Promise.resolve().then(() => reforwardPending(db)).catch(() => {});
}

const RENTAL_LABELS = { dynamisk: 'Dynamisk', korttid: 'Korttid', kortid: 'Korttid', langtid: 'Langtid' };

function streetFromAddress(addr) {
  return (addr || '').split(',')[0].trim();
}

// Sanitér attribusjonsdata fra klienten (closed-loop: kobler lead → kilde/økt).
function sanitizeAttribution(a) {
  if (!a || typeof a !== 'object') return null;
  const s = (v, n = 160) => (v === undefined || v === null ? '' : String(v).slice(0, n));
  const medium = s(a.medium, 120), source = s(a.source, 120), referrer = s(a.referrer, 400);
  const channel = s(a.channel, 40) || deriveChannel({ medium, source, referrer });
  const gclid = s(a.gclid, 200) || undefined;
  const gbraid = s(a.gbraid, 200) || undefined;
  const wbraid = s(a.wbraid, 200) || undefined;
  const msclkid = s(a.msclkid, 200) || undefined;
  // Betalt-signal: paid-kanal ELLER en sterk betalt-klikk-ID (gclid/gbraid/wbraid/msclkid).
  // fbclid utelates bevisst (finnes på ALLE Facebook-klikk, også organiske).
  const isPaid = channel === 'Betalt' || !!(gclid || gbraid || wbraid || msclkid);
  const CHANNEL_TO_TYPE = { 'Betalt': 'paid', 'Sosialt': 'social', 'E-post': 'email', 'Henvisning': 'referral', 'Organisk': 'organic', 'Direkte': 'direct' };
  return {
    source, medium,
    campaign: s(a.campaign),
    term: s(a.term),
    content: s(a.content),
    channel,
    lead_source_type: isPaid ? 'paid' : (CHANNEL_TO_TYPE[channel] || 'direct'),
    is_paid: isPaid,
    referrer,
    landing_page: s(a.landing_page || a.landing, 300),
    device: s(a.device, 20),
    country: s(a.country, 60),
    visitorId: s(a.visitorId, 60),
    sessionId: s(a.sessionId, 60),
    // GA4 client-id (fra _ga-cookien) → server-side stitching i GA4 Measurement Protocol.
    ga_client_id: s(a.ga_client_id, 80) || undefined,
    // Rå klikk-ID-er (samtykke-gated på klienten) → for offline-konvertering til Google/Meta Ads.
    gclid, gbraid, wbraid,
    fbclid: s(a.fbclid, 200) || undefined,
    msclkid,
    // Meta-matching (Conversions API): _fbp/_fbc-cookieverdier fra pixelen.
    fbp: s(a.fbp, 200) || undefined,
    fbc: s(a.fbc, 300) || undefined,
    // A/B-tildelinger (eks. lp-h1-inntekt: 'B') → variant-nedbryting av leads i admin.
    ab: (a.ab && typeof a.ab === 'object' && !Array.isArray(a.ab))
      ? Object.fromEntries(Object.entries(a.ab).slice(0, 10).map(([k, v]) => [String(k).slice(0, 60), String(v).slice(0, 60)]))
      : undefined,
  };
}

// Klassifiser lead-kilde til toppnivå-felt (lead_source_type + is_paid) for
// plattform-forward og rapportering. manualHint tvinger 'manual' (admin/telefon).
function classifyLeadSource(attribution, { manualHint = false, paidSocial = false } = {}) {
  if (paidSocial) return { lead_source_type: 'paid_social', is_paid: true };
  if (manualHint && (!attribution || (!attribution.is_paid && attribution.channel !== 'Betalt'))) {
    return { lead_source_type: 'manual', is_paid: false };
  }
  if (attribution && attribution.lead_source_type) {
    return { lead_source_type: attribution.lead_source_type, is_paid: !!attribution.is_paid };
  }
  return { lead_source_type: 'direct', is_paid: false };
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
      attribution: {
        channel: 'Betalt sosialt', source: 'meta', medium: 'paid_social',
        campaign: doc.meta_campaign_name || '',
      },
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
  let route = `/${path.join('/')}`;
  const method = request.method;

  // Bro-alias: plattform-agenten prober flere endepunkt-navn. Vi normaliserer dem
  // til vår kanoniske /agent-bridge slik at agent-til-agent-tilkoblingen blir sømløs.
  const BRIDGE_ALIASES = ['/bridge/messages', '/bridge', '/agent/messages', '/agent/inbox', '/connector/messages', '/agent-bridge/messages'];
  if (BRIDGE_ALIASES.includes(route)) route = '/agent-bridge';

  try {
    // --- Bro-discovery/health (ÅPEN — så agenter kan oppdage kanalen) ---
    if ((route === '/bridge/health' || route === '/agent-bridge/health') && method === 'GET') {
      return cors(NextResponse.json({
        ok: true,
        service: 'digihome-marketing agent-bridge',
        canonical: '/api/agent-bridge',
        aliases: BRIDGE_ALIASES,
        auth: 'token: ?token=<AGENT_BRIDGE_SECRET> eller header x-bridge-token',
        methods: { list: 'GET /api/agent-bridge?token=…[&thread=…][&since=ISO]', post: 'POST /api/agent-bridge (envelope: threadId,from,type,subject,body,data)' },
        threads: ['closed-loop', 'world-class', 'integration-contract', 'weekly-report'],
        contract: '/docs/INTEGRATION_CONTRACT.md',
      }));
    }

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

    // --- Adresse-autofullføring (Google Places m/Bergen-bias, Geonorge-fallback) ---
    if (route === '/address' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      // Detalj-oppslag ved valg av forslag: postnummer/poststed fra Place Details.
      const placeId = (searchParams.get('place_id') || '').trim();
      if (placeId) {
        const d = await googlePlaceDetails(placeId);
        if (!d) return cors(NextResponse.json({ ok: false }, { status: 502 }));
        const res = cors(NextResponse.json({ ok: true, ...d }));
        res.headers.set('Cache-Control', 'private, max-age=600');
        return res;
      }
      const q = (searchParams.get('q') || '').trim();
      if (q.length < 3) return cors(NextResponse.json({ suggestions: [] }));
      // Google først (relevans + Bergen-bias); null = ikke konfigurert/feil → Geonorge.
      let suggestions = await googlePlacesSearch(q);
      let source = 'google';
      if (!suggestions) { suggestions = await geonorgeSearch(q); source = 'geonorge'; }
      const res = cors(NextResponse.json({ suggestions, source }));
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

    // Health — MÅ svare uten DB-tilkobling (readiness-proben i produksjon
    // skal ikke avhenge av at Atlas svarer i det sekundet poden starter).
    if ((route === '/' || route === '/root') && method === 'GET') {
      return cors(NextResponse.json({ message: 'DigiHome API', ok: true }));
    }

    const db = await getDb();

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
    // --- Kontosletting (Apple 5.1.1(v)): offentlig forespørsel fra /slett-konto ---
    if (route === '/account-deletion' && method === 'POST') {
      const body = await request.json().catch(() => ({}));
      if (body.website) return cors(NextResponse.json({ ok: true })); // honeypot: lat som alt er OK
      const email = String(body.email || '').trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return cors(NextResponse.json({ ok: false, error: 'Ugyldig e-postadresse' }, { status: 400 }));
      const reqDoc = {
        id: uuidv4(),
        email,
        message: String(body.message || '').slice(0, 2000),
        status: 'new',
        source: 'web',
        createdAt: new Date().toISOString(),
      };
      await db.collection('deletion_requests').insertOne(reqDoc);
      // Varsle admin umiddelbart (best-effort)
      try {
        if (emailConfigured()) {
          const to = (process.env.LEAD_NOTIFY_RECIPIENTS || process.env.ADS_REPORT_RECIPIENTS || process.env.ADMIN_SEED_EMAIL || '').split(',').map((s) => s.trim()).filter(Boolean);
          if (to.length) {
            await sendHtmlEmail({
              to,
              subject: `Sletteforespørsel (GDPR): ${email}`,
              html: `<p><b>Ny forespørsel om kontosletting</b></p><p>E-post: ${email}</p><p>Melding: ${String(body.message || '').slice(0, 500) || '(ingen)'}</p><p>Mottatt: ${new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}</p><p>Frist: bekreftelse innen 72 t · sletting innen 30 dager.</p>`,
              fromName: 'DigiHome Personvern',
              replyTo: email,
            });
          }
        }
      } catch (e) { /* varsling er best-effort */ }
      return cors(NextResponse.json({ ok: true, id: reqDoc.id }, { status: 201 }));
    }

    // Leieestimat (offentlig) — driver verdi-teaseren i Bli utleier-skjemaet.
    // Basert på SSB-leiepriser (rent_reports-cache) + DigiHome-modellens løft.
    if (route === '/rent-estimate' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const bedrooms = Math.max(0, Math.min(6, parseInt(sp.get('bedrooms') || '0', 10) || 0));
      const citySlug = RENT_CITIES[(sp.get('city') || '').toLowerCase()] ? (sp.get('city') || '').toLowerCase() : 'bergen';
      try {
        const report = await getRentReport(citySlug, { db });
        const byRoom = (report && report.byRoom) || [];
        if (!byRoom.length) return cors(NextResponse.json({ ok: false, error: 'Ingen markedsdata' }, { status: 404 }));
        // Norsk «X-roms» = soverom + stue. Clamp til datagrunnlaget (1–4-roms).
        const rooms = Math.max(1, Math.min(byRoom.length, bedrooms + 1));
        const row = byRoom.find((r) => String(r.roomKey) === String(rooms)) || byRoom[byRoom.length - 1];
        const base = Number(row.current) || 0;
        if (!base) return cors(NextResponse.json({ ok: false, error: 'Ingen markedsdata' }, { status: 404 }));
        const round100 = (n) => Math.round(n / 100) * 100;
        return cors(NextResponse.json({
          ok: true,
          low: round100(base),
          high: round100(base * 1.28), // DigiHome dynamisk modell: opptil ~30 % løft
          label: row.label || `${rooms}-roms`,
          year: row.currentYear || '',
          city: (RENT_CITIES[citySlug] && RENT_CITIES[citySlug].label) || 'Bergen',
        }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Estimat utilgjengelig' }, { status: 502 }));
      }
    }

    // Delvis lead (offentlig) — fanges når kontaktfelt er utfylt men skjemaet
    // ikke er sendt. Gir salgsteamet mulighet til å følge opp «nesten-leads».
    // Upsertes per e-post/telefon; markeres 'converted' når ekte lead sendes.
    if (route === '/lead/partial' && method === 'POST') {
      if (!rateLimit(clientIp(request), 30)) return cors(NextResponse.json({ ok: false }, { status: 429 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const email = (body.email || '').toString().toLowerCase().trim().slice(0, 200);
      const phone = (body.phone || '').toString().replace(/\s/g, '').slice(0, 30);
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      const phoneOk = phone.replace(/\D/g, '').length >= 8;
      if (!emailOk && !phoneOk) return cors(NextResponse.json({ ok: false, error: 'Trenger gyldig e-post eller telefon' }, { status: 400 }));
      // Har personen allerede sendt inn ekte lead nylig? Da er delvis uinteressant.
      const ors = [];
      if (emailOk) ors.push({ email: { $regex: `^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
      if (phoneOk) ors.push({ phone: { $regex: phone.replace(/\D/g, '').slice(-8) + '$' } });
      const existing = await db.collection('leads').findOne({ $or: ors }, { projection: { _id: 0, id: 1 } });
      if (existing) return cors(NextResponse.json({ ok: true, skipped: 'lead-exists' }));
      const key = emailOk ? { email } : { phone };
      const now = new Date().toISOString();
      await db.collection('partial_leads').updateOne(
        { ...key, status: 'partial' },
        {
          $set: {
            name: (body.name || '').toString().slice(0, 200),
            email: emailOk ? email : (body.email || '').toString().slice(0, 200),
            phone,
            address: (body.address || '').toString().slice(0, 300),
            postal_code: (body.postal_code || '').toString().slice(0, 20),
            property_type: (body.property_type || '').toString().slice(0, 60),
            sqm: body.sqm ? Number(body.sqm) || null : null,
            bedrooms: body.bedrooms ? Number(body.bedrooms) || null : null,
            rental_model: (body.rental_model || '').toString().slice(0, 60),
            tier: (body.tier || '').toString().slice(0, 40),
            form: (body.form || 'utleier').toString().slice(0, 40),
            updatedAt: now,
          },
          $setOnInsert: { id: uuidv4(), status: 'partial', createdAt: now },
        },
        { upsert: true }
      );
      return cors(NextResponse.json({ ok: true }));
    }

    // Admin: delvise leads (ikke konverterte) — for manuell oppfølging.
    if (route === '/admin/leads/partial' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const rows = await db.collection('partial_leads')
        .find({ status: 'partial' }, { projection: { _id: 0 } })
        .sort({ updatedAt: -1 }).limit(100).toArray();
      const converted = await db.collection('partial_leads').countDocuments({ status: 'converted' });
      return cors(NextResponse.json({ ok: true, partials: rows, convertedCount: converted }));
    }

    if (route === '/leads' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }

      const hasSomething = body.name || body.email || body.phone || body.address;
      if (!hasSomething) {
        return cors(NextResponse.json({ success: false, error: 'Mangler kontaktinformasjon' }, { status: 400 }));
      }

      const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
      const _attr = sanitizeAttribution(body.attribution);
      const _cls = classifyLeadSource(_attr, { manualHint: /manuell|manual|telefon|crm|admin/i.test((body.source || '')) });
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
        attribution: _attr,
        lead_source_type: _cls.lead_source_type,
        is_paid: _cls.is_paid,
        marketing_visitor_id: _attr ? _attr.visitorId : undefined,
        marketingConsent: marketingConsentFromRequest(request),
        status: 'new',
        forwarded: false,
        forward_attempts: 0,
        createdAt: new Date().toISOString(),
      };
      // To-nivå-modellen: hvilket spor valgte kunden i skjemaet? + klikk-aksept
      // av selvforvaltningsavtalen (server-tidsstempel for integritet).
      lead.tier = ['selvforvaltning', 'full_forvaltning'].includes((body.tier || '').toString()) ? body.tier : null;
      lead.terms_accepted = body.terms && body.terms.version
        ? { version: String(body.terms.version).slice(0, 40), at: new Date().toISOString() }
        : null;

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

      // Delvis lead → konvertert: hvis samme e-post/telefon lå i partial_leads
      // (fanget mens skjemaet ble fylt ut), marker som fullført (best-effort).
      try {
        const ors = [];
        if (lead.email) ors.push({ email: lead.email.toLowerCase().trim() });
        if (lead.phone) ors.push({ phone: lead.phone.replace(/\s/g, '') });
        if (ors.length) {
          await db.collection('partial_leads').updateMany(
            { $or: ors, status: 'partial' },
            { $set: { status: 'converted', convertedAt: new Date().toISOString(), leadId: lead.id } }
          );
        }
      } catch (e) { /* best-effort */ }

      // Nyhetsbrev-stempel på NYE leads: var denne e-posten en engasjert
      // nyhetsbrevmottaker før konvertering? (klikk-stempelet over treffer bare
      // leads som allerede eksisterte). → synlig multi-touch på leaden.
      try {
        if (lead.email) {
          const sub = await db.collection('newsletter_subscribers').findOne(
            { email: lead.email.toLowerCase().trim() },
            { projection: { _id: 0, last_click_at: 1, last_campaign: 1, clicks: 1 } }
          );
          if (sub && (sub.clicks || sub.last_click_at)) {
            await db.collection('leads').updateOne(
              { id: lead.id },
              { $set: { newsletter_engaged: { clicks: sub.clicks || 0, last_click_at: sub.last_click_at || null, last_campaign: sub.last_campaign || null } } }
            );
          }
        }
      } catch (e) { /* best-effort */ }

      // Nyhetsbrev-attribusjon: kom leaden fra en kampanje-CTA (?c=&r= på
      // landingssiden) eller finnes e-posten i mottaker-kartet? Stemple leaden.
      try {
        let nlStamp = null;
        const bodyCamp = (body.nl_campaign || '').toString().slice(0, 64);
        const bodyRid = (body.nl_rid || '').toString().slice(0, 32);
        if (bodyCamp) {
          nlStamp = { campaignId: bodyCamp, rid: bodyRid || null, via: 'landing' };
        } else if (lead.email) {
          const rec = await db.collection('newsletter_recipients')
            .findOne({ email: lead.email.toLowerCase() }, { sort: { sentAt: -1 }, projection: { _id: 0, campaignId: 1, rid: 1 } });
          if (rec) nlStamp = { campaignId: rec.campaignId, rid: rec.rid, via: 'email-match' };
        }
        if (nlStamp) {
          const camp = await db.collection(NEWSLETTER_COLL).findOne({ id: nlStamp.campaignId }, { projection: { _id: 0, subject: 1, slug: 1 } });
          const full = { ...nlStamp, campaign: camp?.slug || camp?.subject || nlStamp.campaignId, at: new Date().toISOString() };
          await db.collection('leads').updateOne({ id: lead.id }, { $set: { newsletter_source: full } });
          lead.newsletter_source = full;
        }
      } catch (e) { /* attribusjon er best-effort */ }

      // Inkluder Finn-lenken i notatet som videresendes, så CRM-teamet ser annonsen.
      const fwdNotes = lead.finn_url
        ? `${lead.notes ? lead.notes + '. ' : ''}Finn-annonse: ${lead.finn_url}`.slice(0, 4000)
        : lead.notes;

      // Dual-write: videresend til DigiHome-plattformen (DigiHome AS)
      const fwd = await forwardToDigiHome('/api/leads', {
        external_ref: lead.id, source_system: 'digihome-marketing',
        marketing_visitor_id: lead.marketing_visitor_id || undefined,
        lead_source_type: lead.lead_source_type, is_paid: lead.is_paid,
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
        attribution: lead.attribution || undefined,
        tier: lead.tier || undefined,
        terms_accepted: lead.terms_accepted || undefined,
        notes: fwdNotes,
      });
      await db.collection('leads').updateOne({ id: lead.id }, { $set: {
        forwarded: fwd.ok,
        platform_id: fwd.id || null,
        forward_error: fwd.ok ? null : (fwd.error || 'ukjent'),
        forwarded_at: fwd.ok ? new Date().toISOString() : null,
      } });
      lead.forwarded = fwd.ok; lead.platform_id = fwd.id || null;
      // Selvhelbredende: lyktes denne, er plattformen oppe → catch-up av feilede (throttlet).
      if (fwd.ok) maybeReforward(db);

      // Meta Conversions API (server-side Lead). event_id = lead.id → deduplikeres
      // mot nettleser-pixelens Lead-hendelse. Non-fatal: skal aldri velte lead-flyten.
      try {
        if (metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
          const att = lead.attribution || {};
          const capi = await sendMetaCapiEvent({
            eventName: 'Lead',
            eventId: lead.id,
            eventTime: lead.createdAt,
            actionSource: 'website',
            eventSourceUrl: request.headers.get('referer') || (att.landing_page ? `${process.env.NEXT_PUBLIC_BASE_URL || ''}${att.landing_page}` : undefined),
            email: lead.email, phone: lead.phone, fullName: lead.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            externalId: att.visitorId, zip: lead.postal_code, country: 'no',
            clientIp: clientIp(request), userAgent: request.headers.get('user-agent') || '',
            customData: { content_name: lead.lead_type || 'huseier' },
          });
          await db.collection('leads').updateOne({ id: lead.id }, { $set: { metaCapi: { event: 'Lead', ok: capi.ok, at: new Date().toISOString(), error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* CAPI er best-effort */ }

      // Auto-kvittering til lead + umiddelbar admin-varsling (SendGrid).
      // Innfrir «Svar umiddelbart»-løftet. Best-effort — velter aldri lead-flyten.
      try {
        const mail = await fireLeadEmails(lead, { kind: 'huseier' });
        if (mail.receipt || mail.adminNotify) {
          await db.collection('leads').updateOne({ id: lead.id }, { $set: {
            receipt_email: mail.receipt || null,
            admin_notify: mail.adminNotify || null,
          } });
          lead.receipt_email = mail.receipt || null;
          lead.admin_notify = mail.adminNotify || null;
        }
      } catch (e) { /* e-post er best-effort */ }

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
      const _tAttr = sanitizeAttribution(body.attribution);
      const _tCls = classifyLeadSource(_tAttr, { manualHint: /manuell|manual|telefon|crm|admin/i.test((body.source || '')) });
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
        source: (body.source || 'nettside').toString().slice(0, 60),
        attribution: _tAttr,
        lead_source_type: _tCls.lead_source_type,
        is_paid: _tCls.is_paid,
        marketing_visitor_id: _tAttr ? _tAttr.visitorId : undefined,
        marketingConsent: marketingConsentFromRequest(request),
        status: 'new',
        forwarded: false,
        forward_attempts: 0,
        createdAt: new Date().toISOString(),
      };

      // Idempotens + sammenslåing: unngå duplikater fra gjentatte klikk,
      // fler-stegs skjema eller innsending på flere sider. Match på e-post ELLER
      // telefon innen 30 min (uavhengig av preferred_area), og flett inn den
      // rikeste informasjonen i den eksisterende posten i stedet for å lage ny.
      try {
        const sinceIso = new Date(Date.now() - 30 * 60 * 1000).toISOString();
        const or = [];
        if (tenant.email) or.push({ email: tenant.email });
        if (tenant.phone) or.push({ phone: tenant.phone });
        if (or.length) {
          const dup = await db.collection('tenant_leads').findOne({ $or: or, createdAt: { $gte: sinceIso } }, { sort: { createdAt: -1 } });
          if (dup) {
            const enrich = {};
            const richer = (nv, ov) => nv != null && String(nv).trim() !== '' && (ov == null || String(ov).trim() === '');
            if (richer(tenant.preferred_area, dup.preferred_area)) enrich.preferred_area = tenant.preferred_area;
            if (tenant.budget_max != null && dup.budget_max == null) enrich.budget_max = tenant.budget_max;
            if (tenant.budget_min != null && dup.budget_min == null) enrich.budget_min = tenant.budget_min;
            if (richer(tenant.move_in_date, dup.move_in_date)) enrich.move_in_date = tenant.move_in_date;
            if (tenant.bedrooms != null && (dup.bedrooms == null || dup.bedrooms < tenant.bedrooms)) enrich.bedrooms = tenant.bedrooms;
            if (richer(tenant.notes, dup.notes)) enrich.notes = tenant.notes;
            if (tenant.attribution && (!dup.attribution || !dup.attribution.channel)) enrich.attribution = tenant.attribution;
            let merged = dup;
            if (Object.keys(enrich).length) {
              enrich.updatedAt = new Date().toISOString();
              await db.collection('tenant_leads').updateOne({ id: dup.id }, { $set: enrich });
              merged = { ...dup, ...enrich };
            }
            return cors(NextResponse.json({
              success: true, ok: true, id: dup.id, deduped: true, merged: Object.keys(enrich).length > 0,
              forwarded: dup.forwarded === true, tenant: clean(merged),
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
        marketing_visitor_id: tenant.marketing_visitor_id || undefined,
        lead_source_type: tenant.lead_source_type, is_paid: tenant.is_paid,
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
      if (fwd.ok) maybeReforward(db);

      // Meta Conversions API (server-side Lead for leietaker). event_id = tenant.id.
      try {
        if (metaCapiConfigured() && marketingAllowed(tenant.marketingConsent)) {
          const att = tenant.attribution || {};
          const capi = await sendMetaCapiEvent({
            eventName: 'Lead',
            eventId: tenant.id,
            eventTime: tenant.createdAt,
            actionSource: 'website',
            eventSourceUrl: request.headers.get('referer') || undefined,
            email: tenant.email, phone: tenant.phone, fullName: tenant.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            externalId: att.visitorId, zip: tenant.postal_code, country: 'no',
            clientIp: clientIp(request), userAgent: request.headers.get('user-agent') || '',
            customData: { content_name: 'leietaker' },
          });
          await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: { metaCapi: { event: 'Lead', ok: capi.ok, at: new Date().toISOString(), error: capi.ok ? null : (capi.error || null) } } });
          tenant.metaCapi = { event: 'Lead', ok: capi.ok };
        }
      } catch (e) { /* best-effort */ }

      // Admin-varsling for leietaker-lead (ingen auto-kvittering — de venter på boligtilbud).
      try {
        const mail = await fireLeadEmails({ ...tenant, lead_type: 'leietaker' }, { kind: 'leietaker', receipt: false });
        if (mail.adminNotify) {
          await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: { admin_notify: mail.adminNotify } });
          tenant.admin_notify = mail.adminNotify;
        }
      } catch (e) { /* e-post er best-effort */ }

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
    // Historiske leads (imported_leads) flettes inn i samme pipeline-visning med
    // pre_tracking:true — de vises/håndteres som vanlige leads i UI-et, men
    // holdes UTENFOR betalt ROAS/CAC (egen kolleksjon → aldri med i beregningene).
    if (route === '/admin/leads' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      maybeReforward(db); // selvhelbredende catch-up ved admin-last (throttlet)
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      const tenants = await db.collection('tenant_leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      let importedMapped = [];
      try {
        const imported = await db.collection(IMPORTED_COLL).aggregate([
          { $addFields: {
            eff_channel: { $ifNull: ['$override.channel', '$channel'] },
            eff_status: { $ifNull: ['$override.status', '$status'] },
            eff_won_value: { $ifNull: ['$override.won_value', '$won_value'] },
          } },
          { $sort: { created_at: -1, imported_at: -1 } },
          { $limit: 500 },
          { $project: { _id: 0 } },
        ]).toArray();
        importedMapped = imported.map((l) => ({
          id: l.id,
          name: l.name || '', email: l.email || '', phone: l.phone || '',
          address: l.address || '', postal_code: l.postal_code || '',
          createdAt: l.created_at || l.imported_at || null,
          status: l.eff_status || 'new',
          wonValue: l.eff_won_value != null ? l.eff_won_value : null,
          wonCurrency: l.currency || 'NOK',
          channel: l.eff_channel || 'unknown',
          source: l.eff_channel || 'unknown',
          lead_type: l.lead_type || 'huseier',
          platform_id: l.platform_id || null,
          note: (l.override && l.override.note) || null,
          pre_tracking: true,
          imported: true,
          forwarded: true, // kom FRA CRM-et → skal aldri i «venter»-køen
          syncedFromPlatform: !!l.platform_id,
        }));
      } catch (e) { importedMapped = []; }
      const byDate = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      const mergedLeads = [...leads.map(clean), ...importedMapped.filter((x) => x.lead_type !== 'leietaker')].sort(byDate);
      const mergedTenants = [...tenants.map(clean), ...importedMapped.filter((x) => x.lead_type === 'leietaker')].sort(byDate);
      return cors(NextResponse.json({ leads: mergedLeads, tenants: mergedTenants, importedCount: importedMapped.length }));
    }

    if (route === '/admin/forward' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const results = await reforwardPending(db);
      return cors(NextResponse.json({ success: true, results }));
    }

    // --- Admin: rydd dupliserte leietaker-leads -----------------------------
    // Slår sammen tenant_leads med samme e-post/telefon: beholder den synkede
    // (forwarded=true, bevarer platform_id), fletter inn rikeste info fra
    // duplikatene og sletter resten. Støtter ?dryRun for trygg forhåndsvisning.
    if (route === '/admin/leads/dedup-tenants' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const body = await request.json().catch(() => ({}));
      const dryRun = body.dryRun === true || new URL(request.url).searchParams.get('dryRun') === 'true';
      const tms = (x) => { const t = new Date(x || 0).getTime(); return isFinite(t) ? t : 0; };
      const norm = (s) => (s || '').toString().trim().toLowerCase();
      const tenants = await db.collection('tenant_leads').find({}).toArray();
      const groups = new Map();
      for (const t of tenants) {
        const key = norm(t.email) || norm(t.phone) || `id:${t.id}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(t);
      }
      const richer = (nv, ov) => nv != null && String(nv).trim() !== '' && (ov == null || String(ov).trim() === '');
      let merged = 0, deleted = 0, groupsWithDups = 0;
      const details = [];
      for (const [key, arr] of groups) {
        if (arr.length < 2 || key.startsWith('id:')) continue;
        groupsWithDups++;
        // Behold helst den synkede posten (bevar platform_id); ellers eldste.
        const sorted = [...arr].sort((a, b) => {
          const fa = a.forwarded === true ? 1 : 0, fb = b.forwarded === true ? 1 : 0;
          if (fb !== fa) return fb - fa;
          return tms(a.createdAt) - tms(b.createdAt);
        });
        const keep = sorted[0];
        const others = sorted.slice(1);
        const enrich = {};
        for (const o of others) {
          if (richer(o.preferred_area, enrich.preferred_area ?? keep.preferred_area)) enrich.preferred_area = o.preferred_area;
          if ((enrich.budget_max ?? keep.budget_max) == null && o.budget_max != null) enrich.budget_max = o.budget_max;
          if ((enrich.budget_min ?? keep.budget_min) == null && o.budget_min != null) enrich.budget_min = o.budget_min;
          if (richer(o.move_in_date, enrich.move_in_date ?? keep.move_in_date)) enrich.move_in_date = o.move_in_date;
          if (richer(o.notes, enrich.notes ?? keep.notes)) enrich.notes = o.notes;
          const curBed = enrich.bedrooms ?? keep.bedrooms;
          if (o.bedrooms != null && (curBed == null || Number(curBed) < Number(o.bedrooms))) enrich.bedrooms = o.bedrooms;
          const curChan = (enrich.attribution ?? keep.attribution) && (enrich.attribution ?? keep.attribution).channel;
          if (!curChan && o.attribution && o.attribution.channel) enrich.attribution = o.attribution;
          if (richer(o.email, enrich.email ?? keep.email)) enrich.email = o.email;
          if (richer(o.phone, enrich.phone ?? keep.phone)) enrich.phone = o.phone;
        }
        details.push({ key, kept: keep.id, keptForwarded: keep.forwarded === true, removed: others.map((o) => o.id), enriched: Object.keys(enrich) });
        if (!dryRun) {
          if (Object.keys(enrich).length) { enrich.updatedAt = new Date().toISOString(); enrich.dedupMergedAt = enrich.updatedAt; await db.collection('tenant_leads').updateOne({ id: keep.id }, { $set: enrich }); merged++; }
          const rmIds = others.map((o) => o.id).filter(Boolean);
          if (rmIds.length) { const r = await db.collection('tenant_leads').deleteMany({ id: { $in: rmIds } }); deleted += r.deletedCount; }
        } else {
          if (Object.keys(enrich).length) merged++;
          deleted += others.length;
        }
      }
      return cors(NextResponse.json({ ok: true, dryRun, totalTenants: tenants.length, groupsWithDups, merged, deleted, details: details.slice(0, 100) }));
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
      const googlePeriod = GOOGLE_PERIODS.includes(searchParams.get('googlePeriod')) ? searchParams.get('googlePeriod') : 'last_30d';
      const googleRefresh = ['1', 'true'].includes(String(searchParams.get('googleRefresh')));
      const metaPeriod = META_PERIODS.includes(searchParams.get('metaPeriod')) ? searchParams.get('metaPeriod') : 'last_30d';
      const metaRefresh = ['1', 'true'].includes(String(searchParams.get('metaRefresh')));

      // imports-liste = kun manuelle CSV-opplastinger (skjul live Composio-snapshots).
      const importsP = db.collection('ad_imports')
        .find({ source: { $ne: 'google_ads_composio' } }, { projection: { _id: 0, id: 1, label: 1, periodFrom: 1, periodTo: 1, importedAt: 1, currency: 1, 'totals.cost': 1 } })
        .sort({ importedAt: -1 }).limit(50).toArray();

      // --- Google: foretrekk LIVE (nær-sanntid, cachet) når Composio er tilkoblet ---
      const googleTask = (async () => {
        let eco = null, live = false, connected = false, fetchedAt = null, stale = false, error = null, source = null, series = [];
        if (composioConfigured()) {
          try {
            const r = await getCachedReport(db, googlePeriod, { force: googleRefresh });
            connected = true; live = true; fetchedAt = r.fetchedAt; stale = !!r.stale; error = r.error || null;
            const rep = r.report;
            series = rep.series || [];
            const liveSource = `google_ads_${activeProvider()}_live`;
            const transImp = {
              id: 'google-live', label: `Google Ads (live) · ${rep.from} – ${rep.to}`, currency: 'NOK',
              periodFrom: new Date(rep.from).toISOString(), periodTo: new Date(`${rep.to}T23:59:59.999Z`).toISOString(),
              totals: rep.totals, campaigns: rep.campaigns, importedAt: r.fetchedAt, source: liveSource,
            };
            eco = await computeAdsEconomics(db, transImp); source = liveSource;
          } catch (e) { connected = false; live = false; }
        }
        if (!eco) {
          const query = importId ? { id: importId } : { source: { $ne: 'google_ads_composio' } };
          const imp = await db.collection('ad_imports').find(query, { projection: { _id: 0 } }).sort({ importedAt: -1 }).limit(1).next();
          if (imp) { eco = await computeAdsEconomics(db, imp); source = imp.source || 'csv'; }
        }
        return { eco, live, connected, fetchedAt, stale, error, source, series };
      })();

      // --- Meta: LIVE (nær-sanntid, cachet) via Marketing API; fall tilbake til lagret snapshot ---
      const metaTask = (async () => {
        let eco = null, live = false, fetchedAt = null, stale = false, error = null, series = [];
        if (metaAdsConfigured()) {
          try {
            const r = await getCachedMetaReport(db, metaPeriod, { force: metaRefresh });
            live = true; fetchedAt = r.fetchedAt; stale = !!r.stale; error = r.error || null;
            series = (r.snap && r.snap.series) || [];
            eco = await computeMetaEconomics(db, r.snap);
          } catch (e) { live = false; }
        }
        if (!eco) {
          const metaSnap = await db.collection('meta_imports').find({}, { projection: { _id: 0 } }).sort({ importedAt: -1 }).limit(1).next();
          if (metaSnap) { eco = await computeMetaEconomics(db, metaSnap); series = metaSnap.series || []; }
        }
        return { eco, live, fetchedAt, stale, error, series };
      })();

      const leadsRange = metaPeriodToRange(googlePeriod);
      const leadsTask = computeAdsLeadsSeries(db, leadsRange.periodFrom, leadsRange.periodTo).catch(() => []);
      const [imports, g, m, leadsSeries] = await Promise.all([importsP, googleTask, metaTask, leadsTask]);
      const googleEco = g.eco, metaEco = m.eco;
      // Data-modenhet: berik kampanjerader med alder/fase (cachet 6t — startdato endres sjelden).
      try {
        if (googleEco && Array.isArray(googleEco.campaigns) && googleAdsNativeConfigured()) {
          const now = Date.now();
          if (!globalThis.__dhMaturity || (now - globalThis.__dhMaturity.at) > 6 * 3600 * 1000) {
            const list = await listCampaignsDetailed().catch(() => []);
            globalThis.__dhMaturity = { at: now, map: new Map(list.map((c) => [c.name, { startDate: c.startDate, ...c.maturity }])) };
          }
          const mmap = globalThis.__dhMaturity.map;
          for (const row of googleEco.campaigns) {
            const mt = mmap.get(row.name);
            if (mt) row.maturity = mt;
          }
        }
      } catch (e) { /* modenhet er berikelse — aldri kritisk */ }
      // Slå sammen daglige serier (Google + Meta forbruk/klikk + leads) til én tidslinje for grafer.
      const adsSeries = (() => {
        const map = new Map();
        const ensure = (date) => {
          if (!map.has(date)) map.set(date, { date, googleCost: 0, metaCost: 0, googleClicks: 0, metaClicks: 0, googleLeads: 0, metaLeads: 0, leads: 0 });
          return map.get(date);
        };
        const addSpend = (arr, key) => {
          for (const d of arr || []) {
            if (!d || !d.date) continue;
            const e = ensure(d.date);
            e[`${key}Cost`] += Number(d.cost) || 0;
            e[`${key}Clicks`] += Number(d.clicks) || 0;
          }
        };
        addSpend(g.series, 'google');
        addSpend(m.series, 'meta');
        for (const d of leadsSeries || []) {
          if (!d || !d.date) continue;
          const e = ensure(d.date);
          e.googleLeads += d.googleLeads || 0;
          e.metaLeads += d.metaLeads || 0;
          e.leads += d.leads || 0;
        }
        return Array.from(map.values())
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((e) => ({
            date: e.date,
            googleCost: Math.round(e.googleCost * 100) / 100,
            metaCost: Math.round(e.metaCost * 100) / 100,
            cost: Math.round((e.googleCost + e.metaCost) * 100) / 100,
            googleClicks: e.googleClicks,
            metaClicks: e.metaClicks,
            clicks: e.googleClicks + e.metaClicks,
            googleLeads: e.googleLeads,
            metaLeads: e.metaLeads,
            leads: e.leads,
          }));
      })();
      const combined = (googleEco || metaEco) ? combineAdsEconomics(googleEco, metaEco) : null;
      const empty = !googleEco && !metaEco;
      return cors(NextResponse.json({
        ok: true, empty,
        economics: googleEco, meta: metaEco, combined,
        series: adsSeries,
        metaConfigured: metaAdsConfigured(),
        metaLive: m.live, metaPeriod, metaFetchedAt: m.fetchedAt, metaStale: m.stale, metaError: m.error,
        googleConfigured: composioConfigured(),
        googleConnected: g.connected, googleLive: g.live, googlePeriod, googleFetchedAt: g.fetchedAt, googleStale: g.stale, googleError: g.error,
        googleSource: g.source,
        imports,
      }));
    }

    // --- Admin: Annonser — faktiske annonser/kreativer (Google RSA + Meta-kreativer) ---
    if (route === '/admin/ads/creatives' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const force = ['1', 'true'].includes(String(searchParams.get('refresh')));
      const out = {
        google: { configured: composioConfigured(), live: false, ads: [], fetchedAt: null, stale: false, error: null },
        meta: { configured: metaAdsConfigured(), live: false, ads: [], fetchedAt: null, stale: false, error: null },
      };
      await Promise.all([
        (async () => {
          if (!composioConfigured()) return;
          try {
            const r = await getCachedCreatives(db, { force });
            out.google.live = true; out.google.ads = r.ads || []; out.google.fetchedAt = r.fetchedAt;
            out.google.stale = !!r.stale; out.google.error = r.error || null;
          } catch (e) { out.google.error = e.message; }
        })(),
        (async () => {
          if (!metaAdsConfigured()) return;
          try {
            const r = await getCachedMetaCreatives(db, { force });
            out.meta.live = true; out.meta.ads = r.ads || []; out.meta.fetchedAt = r.fetchedAt;
            out.meta.stale = !!r.stale; out.meta.error = r.error || null;
          } catch (e) { out.meta.error = e.message; }
        })(),
      ]);
      return cors(NextResponse.json({ ok: true, ...out }));
    }

    // --- Annonse-bilde-proxy (Meta/Instagram CDN). Domene-whitelistet (anti-SSRF). ---
    if (route === '/admin/ads/img' && method === 'GET') {
      const u = new URL(request.url).searchParams.get('u') || '';
      if (!/^https:\/\/[a-z0-9.\-]*(fbcdn\.net|cdninstagram\.com|facebook\.com)\//i.test(u)) {
        return new NextResponse('Forbidden', { status: 403 });
      }
      try {
        const r = await fetch(u);
        if (!r.ok) return new NextResponse('Not found', { status: 404 });
        const buf = await r.arrayBuffer();
        return new NextResponse(Buffer.from(buf), {
          status: 200,
          headers: {
            'Content-Type': r.headers.get('content-type') || 'image/jpeg',
            'Cache-Control': 'public, max-age=900',
          },
        });
      } catch (e) {
        return new NextResponse('Error', { status: 502 });
      }
    }
    // --- Meta annonse-forhåndsvisning (pixel-perfekt). Redirecter til Metas
    //     preview-iframe slik at System User-tokenet ALDRI eksponeres i klienten.
    //     no-referrer hindrer at admin-nøkkelen lekker til Meta via Referer. ---
    if (route === '/admin/ads/preview' && method === 'GET') {
      if (!adminAuthed(request)) return new NextResponse('Uautorisert', { status: 401 });
      if (!metaAdsConfigured()) return new NextResponse('Meta ikke konfigurert', { status: 400 });
      const sp = new URL(request.url).searchParams;
      const id = String(sp.get('id') || '');
      const format = isValidPreviewFormat(sp.get('format')) ? sp.get('format') : 'MOBILE_FEED_STANDARD';
      if (!/^\d{3,}$/.test(id)) return new NextResponse('Ugyldig id', { status: 400 });
      try {
        const src = await fetchMetaPreviewSrc(id, format);
        if (!src) return new NextResponse('Ingen forhåndsvisning', { status: 404 });
        return new NextResponse(null, {
          status: 302,
          headers: { Location: src, 'Referrer-Policy': 'no-referrer', 'Cache-Control': 'private, max-age=300' },
        });
      } catch (e) {
        return new NextResponse('Feil ved forhåndsvisning', { status: 502 });
      }
    }

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
        return cors(NextResponse.json({ ok: false, error: e.message || 'Kunne ikke opprette tilkoblingslenke' }, { status: 200 }));
      }
    }

    // --- Admin: Annonser — Google Ads via Composio: tilkoblingsstatus -------
    if (route === '/admin/ads/google-status' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!composioConfigured()) return cors(NextResponse.json({ ok: true, configured: false, connected: false }));
      try {
        const st = await getConnectionStatus();
        return cors(NextResponse.json({ ok: true, configured: true, provider: activeProvider(), customerId: defaultCustomerId(), ...st }));
      } catch (e) {
        return cors(NextResponse.json({ ok: true, configured: true, connected: false, status: 'ERROR', error: e.message }));
      }
    }

    // =====================================================================
    // NATIVE Google Ads API — Fase 2 (konverteringer) + Fase 3 (kampanjer)
    // =====================================================================

    // Fase 2: list konverteringshandlinger (for å finne UPLOAD_CLICKS-handling).
    if (route === '/admin/ads/conversion-actions' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      try {
        const actions = await listConversionActions();
        const resolved = await resolveOfflineConversionAction(defaultCustomerId(), { create: false });
        return cors(NextResponse.json({ ok: true, actions, offlineAction: resolved }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 2: sørg for at en UPLOAD_CLICKS-handling finnes (opprett ved behov).
    if (route === '/admin/ads/conversion-actions/ensure' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      try {
        const resolved = await resolveOfflineConversionAction(defaultCustomerId(), { create: true });
        return cors(NextResponse.json({ ok: !!resolved.resourceName, ...resolved }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 2: manuell test-opplasting av en klikk-konvertering (for verifisering).
    if (route === '/admin/ads/upload-conversion' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const up = await uploadClickConversion(defaultCustomerId(), {
          gclid: body.gclid, gbraid: body.gbraid, wbraid: body.wbraid,
          value: body.value, currency: body.currency || 'NOK',
          conversionDateTime: body.conversionDateTime || toConversionDateTime(body.at),
          orderId: body.orderId,
        });
        return cors(NextResponse.json({ ok: up.ok, result: up }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 2 (Data Manager API): test-ingest av en offline-konvertering (validateOnly mulig).
    if (route === '/admin/ads/datamanager/test' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!dataManagerConfigured()) return cors(NextResponse.json({ ok: false, error: 'Data Manager API er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const r = await ingestOfflineConversion({
          gclid: body.gclid || 'TEST_FAKE_GCLID', gbraid: body.gbraid, wbraid: body.wbraid,
          value: body.value || 1000, currency: body.currency || 'NOK',
          at: body.at, transactionId: body.transactionId,
          validateOnly: body.validateOnly !== false, // default true (trygt)
        });
        return cors(NextResponse.json({ ok: r.ok, ...r }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: detaljert kampanjeliste (m/ budsjett + 30-dagers metrikk).
    if (route === '/admin/ads/campaigns' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      try {
        const campaigns = await listCampaignsDetailed();
        return cors(NextResponse.json({ ok: true, campaigns, customerId: defaultCustomerId() }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: geo-forslag (stedsnavn → geoTargetConstant).
    if (route === '/admin/ads/geo-suggest' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get('q') || '').toString().trim();
      if (!q) return cors(NextResponse.json({ ok: true, suggestions: [] }));
      try {
        const suggestions = await suggestGeoTargets(q.split(',').map((s) => s.trim()).filter(Boolean));
        return cors(NextResponse.json({ ok: true, suggestions: suggestions.slice(0, 20) }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: endre kampanjestatus (PAUSED/ENABLED/REMOVED).
    if (route === '/admin/ads/campaign/status' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      if (!body.campaignId || !body.status) return cors(NextResponse.json({ ok: false, error: 'Mangler campaignId/status' }, { status: 400 }));
      try {
        const r = await setCampaignStatus(defaultCustomerId(), body.campaignId, body.status);
        return cors(NextResponse.json({ ok: true, ...r }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: oppdater dagsbudsjett (NOK).
    if (route === '/admin/ads/campaign/budget' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      if (!body.budgetResourceName || !(Number(body.dailyBudget) > 0)) return cors(NextResponse.json({ ok: false, error: 'Mangler budgetResourceName/dailyBudget' }, { status: 400 }));
      try {
        const r = await updateCampaignBudget(defaultCustomerId(), body.budgetResourceName, Number(body.dailyBudget));
        return cors(NextResponse.json({ ok: true, ...r }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: opprett SEARCH-kampanje (opprettes PAUSED).
    if (route === '/admin/ads/campaign/create' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const r = await createSearchCampaign(defaultCustomerId(), {
          name: body.name, dailyBudget: body.dailyBudget, finalUrl: body.finalUrl,
          headlines: body.headlines || [], descriptions: body.descriptions || [], keywords: body.keywords || [],
          geoTargetConstantIds: body.geoTargetConstantIds || ['2578'],
          biddingStrategy: body.biddingStrategy || 'MAXIMIZE_CONVERSIONS',
          path1: body.path1, path2: body.path2,
          validateOnly: !!body.validateOnly,
        });
        return cors(NextResponse.json({ ok: true, ...r }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: KONKURRENT-kampanje (competitor conquesting) — mal + oppretting.
    if (route === '/admin/ads/competitor-campaign/template' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // Annonse-destinasjoner skal ALLTID peke på det verifiserte produksjonsdomenet,
      // aldri delt preview-host (Google-policy «Compromised Site»).
      const base = (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      const template = {
        competitor: 'Utleiemegleren',
        name: 'DigiHome – Konkurrent · Utleiemegleren',
        dailyBudget: 150,
        finalUrl: `${base}/lp/forvaltning`,
        geoTargetConstantIds: ['2578'],
        geoLabel: 'Norge',
        path1: 'forvaltning', path2: 'bergen',
        keywords: ['utleiemegleren', 'utleiemegleren bergen', 'utleiemegleren pris', 'utleiemegleren erfaring', 'utleiemegleren alternativ'],
        negatives: ['jobb', 'ledig stilling', 'logg inn', 'klage', 'oppsigelse', 'svindel'],
        headlines: ['Utleie på autopilot', 'Proff boligforvaltning', 'Bergens lokale forvalter', 'Full forvaltning i Bergen', '0 kr oppstart, ingen binding', 'Høyere leieinntekt', 'Vi tar oss av alt'],
        descriptions: [
          'Annonsering, leietakere, husleie og vedlikehold — vi håndterer alt. Du får inntekten.',
          'Gratis, uforpliktende vurdering innen 24 timer. Lokalt team midt i Bergen.',
          'Bytt til en enklere hverdag som utleier. Ingen oppstartskostnad og ingen binding.',
        ],
      };
      let existing = null;
      if (googleAdsNativeConfigured()) { try { existing = await getCampaignByName(defaultCustomerId(), template.name); } catch (e) { existing = null; } }
      return cors(NextResponse.json({ ok: true, configured: googleAdsNativeConfigured(), customerId: defaultCustomerId(), template, existing }));
    }

    if (route === '/admin/ads/competitor-campaign' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const r = await createCompetitorCampaign(defaultCustomerId(), {
          name: body.name, dailyBudget: body.dailyBudget, finalUrl: body.finalUrl,
          headlines: body.headlines || [], descriptions: body.descriptions || [],
          keywords: body.keywords || [], negatives: body.negatives || [],
          geoTargetConstantIds: body.geoTargetConstantIds || ['2578'],
          path1: body.path1, path2: body.path2,
          validateOnly: !!body.validateOnly,
          activate: !!body.activate,
        });
        const status = (r && r.ok === false) ? 200 : (body.validateOnly ? 200 : 201);
        return cors(NextResponse.json(r, { status }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase 3: KONKURRENTANALYSE — søkevolum/budestimat (Keyword Planner) +
    // dyplenke til Google Ads Transparency Center (offentlige live-annonser).
    if (route === '/admin/ads/competitor-analysis' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const competitor = (searchParams.get('competitor') || 'Utleiemegleren').toString().trim().slice(0, 60);
      const cLower = competitor.toLowerCase();
      const brandBase = competitor.toLowerCase().replace(/\s+/g, '');
      const brandSeeds = [competitor, `${competitor} bergen`, `${competitor} pris`, `${competitor} erfaring`, `${competitor} anmeldelser`, `${competitor} alternativ`];
      const categorySeeds = ['utleiemegler bergen', 'boligforvaltning bergen', 'leie ut bolig bergen', 'forvaltning utleiebolig', 'utleiemegler', 'utleieforvaltning'];

      // Transparency Center-dyplenke fungerer uansett (krever ikke vår API).
      const transparency = {
        searchUrl: `https://adstransparency.google.com/?region=NO&query=${encodeURIComponent(competitor)}`,
        region: 'NO',
        note: 'Googles offisielle, offentlige annonseregister. Viser hvilke annonser konkurrenten faktisk kjører nå (tekst/bilde/video) — ikke søkeord eller budsjett.',
      };

      if (!googleAdsNativeConfigured()) {
        return cors(NextResponse.json({ ok: true, configured: false, competitor, transparency, keywords: { brand: [], category: [] }, aggregates: null, note: 'Google Ads-API er ikke konfigurert — søkevolum utilgjengelig, men Transparency Center-lenken virker.' }));
      }

      try {
        const ideas = await generateKeywordIdeas({ seeds: [...brandSeeds, ...categorySeeds], geoTargetConstantIds: ['2578'], languageCode: 'no', pageSize: 300 });
        const seen = new Set();
        const brand = []; const category = [];
        for (const k of ideas) {
          const key = k.text.toLowerCase();
          if (seen.has(key)) continue; seen.add(key);
          const isBrand = key.includes(cLower) || key.includes(brandBase);
          (isBrand ? brand : category).push(k);
        }
        const top = (arr, n) => arr.slice(0, n);
        const sum = (arr, f) => arr.reduce((a, x) => a + (f(x) || 0), 0);
        const bidVals = ideas.filter((k) => k.highBid != null);
        const avgLow = bidVals.length ? +(sum(ideas, (x) => x.lowBid || 0) / bidVals.length).toFixed(1) : null;
        const avgHigh = bidVals.length ? +(sum(bidVals, (x) => x.highBid || 0) / bidVals.length).toFixed(1) : null;
        const compCount = { LOW: 0, MEDIUM: 0, HIGH: 0 };
        for (const k of ideas) { if (compCount[k.competition] != null) compCount[k.competition]++; }
        const aggregates = {
          brandVolume: sum(brand, (x) => x.avgMonthlySearches),
          categoryVolume: sum(category, (x) => x.avgMonthlySearches),
          totalKeywords: ideas.length,
          brandKeywordCount: brand.length,
          categoryKeywordCount: category.length,
          avgLowBid: avgLow, avgHighBid: avgHigh,
          competition: compCount,
        };
        return cors(NextResponse.json({
          ok: true, configured: true, competitor, generatedAt: new Date().toISOString(),
          aggregates, keywords: { brand: top(brand, 40), category: top(category, 40) }, transparency,
        }));
      } catch (e) {
        return cors(NextResponse.json({ ok: true, configured: true, competitor, transparency, keywords: { brand: [], category: [] }, aggregates: null, error: e.message }, { status: 200 }));
      }
    }



    // ===================================================================
    // INTELLIGENS-LAGET (Fase A–D): samlet tabell, anbefalinger, keyword
    // research, AI-tekster, optimaliserings-kjøring + sikret cron.
    // ===================================================================

    // Fase A: Samlet per-annonse-tabell (Google + Meta) m/ alle nøkkeltall.

    // Annonse-diagnostikk: NÅR startet levering (Google) og NÅR begynte
    // konverteringssporing å registrere (Meta) — daglig tidsserie + startdatoer.
    if (route === '/admin/ads/diagnostics' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const gOn = googleAdsNativeConfigured(), mOn = metaAdsConfigured();
      const out = { ok: true, google: { configured: gOn }, meta: { configured: mOn } };

      if (gOn) {
        try {
          const cid = defaultCustomerId();
          const campQ = "SELECT campaign.id, campaign.name, campaign.status, campaign.serving_status, campaign.start_date, campaign.end_date, campaign.advertising_channel_type FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.start_date DESC";
          const dailyQ = "SELECT segments.date, metrics.impressions, metrics.clicks, metrics.cost_micros, metrics.conversions FROM campaign WHERE segments.date DURING LAST_90_DAYS ORDER BY segments.date";
          const [camps, daily] = await Promise.all([gaqlSearch(cid, campQ), gaqlSearch(cid, dailyQ).catch(() => [])]);
          out.google.campaigns = camps.map((r) => ({
            id: String(r.campaign?.id || ''), name: r.campaign?.name || '',
            status: r.campaign?.status || '', servingStatus: r.campaign?.servingStatus || '',
            channel: r.campaign?.advertisingChannelType || '',
            startDate: r.campaign?.startDate || null, endDate: r.campaign?.endDate || null,
          }));
          // Aggreger daglig på tvers av kampanjer.
          const byDay = new Map();
          for (const r of daily) {
            const d = r.segments?.date; if (!d) continue;
            const m = r.metrics || {};
            const cur = byDay.get(d) || { date: d, impressions: 0, clicks: 0, cost: 0, conversions: 0 };
            cur.impressions += Number(m.impressions) || 0; cur.clicks += Number(m.clicks) || 0;
            cur.cost += (Number(m.costMicros) || 0) / 1e6; cur.conversions += Number(m.conversions) || 0;
            byDay.set(d, cur);
          }
          const days = Array.from(byDay.values()).map((x) => ({ ...x, cost: Math.round(x.cost * 100) / 100 })).sort((a, b) => a.date.localeCompare(b.date));
          const active = days.filter((d) => d.impressions > 0);
          out.google.daily = days;
          out.google.summary = {
            firstServingDate: active.length ? active[0].date : null,
            lastServingDate: active.length ? active[active.length - 1].date : null,
            activeDays: active.length,
            totalImpressions: days.reduce((s, d) => s + d.impressions, 0),
            totalClicks: days.reduce((s, d) => s + d.clicks, 0),
            totalCost: Math.round(days.reduce((s, d) => s + d.cost, 0) * 100) / 100,
            totalConversions: Math.round(days.reduce((s, d) => s + d.conversions, 0) * 100) / 100,
            firstConversionDate: (days.find((d) => d.conversions > 0) || {}).date || null,
          };
        } catch (e) { out.google.error = e.message; }
      }

      if (mOn) {
        try {
          const daily = await fetchMetaDailyActions({ datePreset: 'last_90d' });
          const recent = await fetchMetaDailyActions({ datePreset: 'last_7d' }).catch(() => []);
          const liveAds = await fetchMetaAdsWithInsights({ datePreset: 'last_7d' }).catch(() => []);
          const active = daily.filter((d) => d.cost > 0);
          const conv = daily.filter((d) => d.conversions > 0);
          out.meta.daily = daily.map((d) => ({ ...d, cost: Math.round(d.cost * 100) / 100 }));
          out.meta.recent7 = recent.map((d) => ({ ...d, cost: Math.round(d.cost * 100) / 100 }));
          out.meta.liveAds = (liveAds || []).map((a) => ({ name: a.name, status: a.effectiveStatus || a.status, cost: Math.round((a.cost || a.spend || 0) * 100) / 100, impressions: a.impressions || 0, conversions: a.conversions || 0 }));
          out.meta.recent7Spend = Math.round(recent.reduce((s, d) => s + d.cost, 0) * 100) / 100;
          out.meta.summary = {
            firstSpendDate: active.length ? active[0].date : null,
            lastSpendDate: active.length ? active[active.length - 1].date : null,
            activeSpendDays: active.length,
            totalCost: Math.round(daily.reduce((s, d) => s + d.cost, 0) * 100) / 100,
            totalConversions: daily.reduce((s, d) => s + d.conversions, 0),
            firstConversionDate: conv.length ? conv[0].date : null,
            conversionDays: conv.length,
          };
        } catch (e) { out.meta.error = e.message; }
      }

      return cors(NextResponse.json(out));
    }

    // --- Ende-til-ende-verifisering av lead-sporing (Meta CAPI + Google offline + GA4) ---
    // TRYGG: Meta-hendelser sendes KUN når ?testEventCode=... oppgis (vises kun i «Test events»,
    // påvirker IKKE algoritmen). Google offline-konvertering kjøres som validateOnly (dry-run,
    // ingenting registreres). GA4 rapporteres kun som konfigstatus. Ingen ekte leads opprettes.
    if (route === '/admin/tracking/verify' && (method === 'GET' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      let bodyTec = '';
      if (method === 'POST') { try { const b = await request.json(); bodyTec = (b.testEventCode || b.test_event_code || '').toString(); } catch (_) {} }
      const testEventCode = (searchParams.get('testEventCode') || searchParams.get('test_event_code') || bodyTec || '').trim();

      const out = {
        ok: true,
        generatedAt: new Date().toISOString(),
        dedup: {
          leadEventId: 'lead.id (matcher nettleser-pixelens Lead-hendelse)',
          purchaseEventId: 'won-<lead.id>',
          note: 'Server-side CAPI og nettleser-pixel deler event_id → Meta dedupliserer automatisk.',
        },
        meta: { configured: metaCapiConfigured(), pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || null },
        google: { configured: dataManagerConfigured() },
        ga4: {
          configured: ga4MpConfigured(),
          measurementId: process.env.NEXT_PUBLIC_GA4_ID || null,
          apiSecret: !!process.env.GA4_API_SECRET,
        },
      };

      // 1) Meta CAPI: send test-Lead + test-Purchase med testEventCode (kun «Test events»-fanen).
      if (metaCapiConfigured() && testEventCode) {
        const testId = `verify-${uuidv4()}`;
        try {
          const leadRes = await sendMetaCapiEvent({
            eventName: 'Lead',
            eventId: testId,
            actionSource: 'website',
            eventSourceUrl: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/bli-utleier`,
            email: 'e2e-verify@digihome.test', phone: '+47 90000000', fullName: 'E2E Verifisering',
            externalId: 'e2e-verify-visitor', zip: '5003', city: 'Bergen', country: 'no',
            clientIp: clientIp(request), userAgent: request.headers.get('user-agent') || '',
            customData: { content_name: 'e2e-verify' },
            testEventCode,
          });
          const purchaseRes = await sendMetaCapiEvent({
            eventName: 'Purchase',
            eventId: `won-${testId}`,
            actionSource: 'system_generated',
            email: 'e2e-verify@digihome.test', phone: '+47 90000000', fullName: 'E2E Verifisering',
            externalId: 'e2e-verify-visitor', zip: '5003', country: 'no',
            value: 24000, currency: 'NOK',
            customData: { content_name: 'e2e-verify', lead_event_id: testId },
            testEventCode,
          });
          out.meta.testEventCode = testEventCode;
          out.meta.testEventId = testId;
          out.meta.lead = leadRes;
          out.meta.purchase = purchaseRes;
          out.meta.verified = !!(leadRes.ok && purchaseRes.ok);
        } catch (e) { out.meta.error = e.message; out.meta.verified = false; }
      } else if (metaCapiConfigured()) {
        out.meta.note = 'Oppgi ?testEventCode=TESTxxxx (Meta Events Manager → Test events) for å sende en trygg test-hendelse som kun vises i «Test events»-fanen.';
      }

      // 2) Google offline-konvertering: validateOnly (dry-run) — validerer OAuth + konverteringshandling + format uten å registrere noe.
      if (dataManagerConfigured()) {
        try {
          const dry = await ingestOfflineConversion({
            gclid: 'E2E_VERIFY_DRYRUN_GCLID',
            value: 24000, currency: 'NOK', at: new Date().toISOString(),
            transactionId: `verify-${Date.now()}`,
            validateOnly: true,
          });
          out.google.dryRun = dry;
          out.google.verified = !!dry.ok;
        } catch (e) { out.google.error = e.message; out.google.verified = false; }
      }

      // 3) GA4 Measurement Protocol: kun konfigstatus (unngår støy i GA4-rapporten).
      out.ga4.verified = ga4MpConfigured();
      if (!ga4MpConfigured()) out.ga4.note = 'Mangler GA4_API_SECRET. Opprett i GA4 Admin → Datastrømmer → Measurement Protocol API secrets.';

      out.summary = {
        metaReady: out.meta.configured,
        metaVerified: !!out.meta.verified,
        googleReady: out.google.configured,
        googleVerified: !!out.google.verified,
        ga4Ready: out.ga4.configured,
        allGreen: !!(out.meta.verified && out.google.verified),
      };

      return cors(NextResponse.json(out));
    }

    // ===================================================================
    // Historiske / plattform-native leads (pre-sporing) — import + synk + oversikt.
    // Egen kolleksjon `imported_leads`. Flagget pre_tracking → talt i totalbildet,
    // men holdt UTENFOR betalt ROAS/CAC. Ingen retroaktive konverteringer sendes.
    // ===================================================================
    if (route === '/admin/imported-leads' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const summary = await summarizeImported(db);
      let pushback = null; try { pushback = await pushbackStats(db); } catch (e) { pushback = null; }
      // Historisk annonseforbruk (før sporing) — seedes med kjente tall første gang,
      // kan justeres i UI. Brukes til blandet CPL/CAC i «Historisk analyse».
      let historicalSpend = null;
      try {
        await db.collection('marketing_settings').updateOne(
          { id: 'historical_spend' },
          { $setOnInsert: {
            id: 'historical_spend', meta: 34400, google: 41, other: 0, currency: 'NOK',
            note: 'Annonseforbruk før sporing ble aktivert (est.)', updated_at: new Date().toISOString(),
          } },
          { upsert: true }
        );
        historicalSpend = await db.collection('marketing_settings').findOne({ id: 'historical_spend' }, { projection: { _id: 0 } });
      } catch (e) { historicalSpend = null; }
      if (['1', 'true'].includes(String(sp.get('list')))) {
        const limit = Math.min(Math.max(Number(sp.get('limit')) || 100, 1), 500);
        const skip = Math.max(Number(sp.get('skip')) || 0, 0);
        const { items, total } = await listImported(db, {
          status: (sp.get('status') || '').trim() || undefined,
          channel: (sp.get('channel') || '').trim() || undefined,
          q: (sp.get('q') || '').trim() || undefined,
          limit, skip,
        });
        return cors(NextResponse.json({ ...summary, pushback, historicalSpend, list: items, listTotal: total, limit, skip }));
      }
      return cors(NextResponse.json({ ...summary, pushback, historicalSpend }));
    }

    // Oppdater historisk annonseforbruk (Meta/Google/annet) — grunnlag for
    // blandet CPL/CAC i «Historisk analyse». Kun tall ≥ 0 godtas.
    if (route === '/admin/imported-leads/spend' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const set = {};
      for (const k of ['meta', 'google', 'other']) {
        if (body[k] !== undefined) {
          const v = Number(body[k]);
          if (!isFinite(v) || v < 0) return cors(NextResponse.json({ ok: false, error: `Ugyldig beløp for ${k}` }, { status: 400 }));
          set[k] = Math.round(v * 100) / 100;
        }
      }
      if (body.note !== undefined) set.note = String(body.note || '').slice(0, 300);
      if (!Object.keys(set).length) return cors(NextResponse.json({ ok: false, error: 'Ingen felt å oppdatere' }, { status: 400 }));
      set.updated_at = new Date().toISOString();
      await db.collection('marketing_settings').updateOne(
        { id: 'historical_spend' },
        { $set: set, $setOnInsert: { id: 'historical_spend', currency: 'NOK' } },
        { upsert: true }
      );
      const historicalSpend = await db.collection('marketing_settings').findOne({ id: 'historical_spend' }, { projection: { _id: 0 } });
      return cors(NextResponse.json({ ok: true, historicalSpend }));
    }

    // Manuell redigering (enkelt {id} eller bulk {ids}): kilde, status, verdi,
    // notat, markedsførings-OK. Lagres som override → overlever ny synk.
    // TOVEIS: status/verdi/kilde legges i utboks og skrives tilbake til CRM-et.
    if (route === '/admin/imported-leads' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const patch = body.patch || {};
      const result = await updateImportedOverride(db, { id: body.id, ids: body.ids, patch });
      if (!result.ok) return cors(NextResponse.json(result, { status: 400 }));
      // Kø endringer som CRM-et skal ha (status/verdi/kilde) — per platform_id.
      let pushback = null;
      if (patch.status !== undefined || patch.won_value !== undefined || patch.channel !== undefined) {
        try {
          const idList = (Array.isArray(body.ids) && body.ids.length ? body.ids : [body.id]).filter(Boolean);
          const docs = await db.collection(IMPORTED_COLL)
            .find({ id: { $in: idList } }, { projection: { _id: 0, id: 1, platform_id: 1, override: 1, status: 1, won_value: 1 } }).toArray();
          for (const d of docs) {
            if (!d.platform_id) continue;
            await queueLeadPushback(db, {
              platform_id: d.platform_id,
              ...(patch.status !== undefined ? { status: d.override?.status ?? d.status } : {}),
              ...(patch.won_value !== undefined ? { won_value: d.override?.won_value ?? d.won_value } : {}),
              ...(patch.channel !== undefined ? { source: d.override?.channel } : {}),
            });
          }
          const target = digiHomeTarget();
          pushback = await flushLeadPushbacks(db, { target: target.url, key: target.key });
        } catch (e) { pushback = { ok: false, error: e.message }; }
      }
      return cors(NextResponse.json({ ...result, pushback }));
    }

    if (route === '/admin/imported-leads/import' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      let rows = [];
      if (typeof body.csv === 'string' && body.csv.trim()) {
        const parsed = parseCsv(body.csv);
        rows = parsed.rows;
        if (!rows.length) return cors(NextResponse.json({ ok: false, error: 'Fant ingen datarader i CSV-en (sjekk at første linje er kolonneoverskrifter).' }, { status: 400 }));
      } else if (Array.isArray(body.rows) && body.rows.length) {
        rows = body.rows;
      } else {
        return cors(NextResponse.json({ ok: false, error: 'Mangler data: send enten {csv:"..."} eller {rows:[...]}' }, { status: 400 }));
      }
      const result = await importRecords(db, rows, {
        batchLabel: (body.batchLabel || '').toString().slice(0, 120) || undefined,
        source: 'csv',
        channelHint: (body.channelHint || '').toString().slice(0, 80) || undefined,
      });
      const summary = await summarizeImported(db);
      return cors(NextResponse.json({ ...result, summary }, { status: 201 }));
    }

    if (route === '/admin/imported-leads/sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const target = digiHomeTarget();
      const result = await syncFromPlatform(db, {
        target: target.url,
        secret: process.env.LEAD_SYNC_SECRET || target.key || '',
        since: (body.since || '').toString().slice(0, 30) || undefined,
        until: (body.until || '').toString().slice(0, 30) || undefined,
        channelHint: (body.channelHint || '').toString().slice(0, 80) || undefined,
      });
      const summary = await summarizeImported(db);
      // Toveis-synk: prøv å levere ventende status/verdi-endringer til CRM-et
      // (fungerer som retry-loop til plattformens skrive-endepunkt er live).
      let pushback = null;
      try { pushback = await flushLeadPushbacks(db, { target: target.url, key: target.key }); } catch (e) { pushback = { ok: false, error: e.message }; }
      return cors(NextResponse.json({ ...result, platformEnv: target.env, platformUrl: target.url, summary, pushback }, { status: result.ok ? 201 : 200 }));
    }

    if (route === '/admin/imported-leads' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const batch = (sp.get('batch') || '').trim();
      const all = ['1', 'true'].includes(String(sp.get('all')));
      if (!batch && !all) return cors(NextResponse.json({ ok: false, error: 'Oppgi ?batch=<id> eller ?all=1' }, { status: 400 }));
      const q = all ? {} : { import_batch_id: batch };
      const res = await db.collection(IMPORTED_COLL).deleteMany(q);
      const summary = await summarizeImported(db);
      return cors(NextResponse.json({ ok: true, deleted: res.deletedCount, summary }));
    }

    // ===================================================================
    // INVESTOR-ROM (levende DD-rom) — magic links, dokumenthvelv, audit, Q&A.
    // Admin-siden er nøkkel-gatet; investor-siden gates av revokerbare tokens.
    // Tall gjenbrukes fra finance-motoren (computeBoardPack) — NULL PII.
    // ===================================================================
    if (route === '/admin/investor-room' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const [links, documents, questions, audit] = await Promise.all([
        ddListLinks(db), ddListDocuments(db, { includeArchived: true }), ddListAllQuestions(db), ddListAudit(db, { limit: 60 }),
      ]);
      return cors(NextResponse.json({
        ok: true, links, documents, questions, audit,
        categories: DD_CATEGORIES, sections: DD_SECTIONS,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL || '',
      }));
    }

    if (route === '/admin/investor-room/links' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await ddCreateLink(db, body);
      if (!result.ok) return cors(NextResponse.json(result, { status: 400 }));
      const url = `${process.env.NEXT_PUBLIC_BASE_URL || ''}/investor?t=${result.link.token}`;
      return cors(NextResponse.json({ ...result, url }, { status: 201 }));
    }

    if (route === '/admin/investor-room/links' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await ddUpdateLink(db, { id: body.id, patch: body.patch || {} });
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    if (route === '/admin/investor-room/links' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const id = (new URL(request.url).searchParams.get('id') || '').trim();
      const result = await ddDeleteLink(db, id);
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    // Chunked opplasting til dokumenthvelvet (omgår proxy-grenser, maks 15MB).
    if (route === '/admin/investor-room/upload-chunk' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await ddSaveChunk(db, body);
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    if (route === '/admin/investor-room/upload-complete' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const metaCheck = ddValidateFileMeta({ filename: body.filename, size: body.size });
      if (!metaCheck.ok) return cors(NextResponse.json(metaCheck, { status: 400 }));
      const asm = await ddAssembleChunks(db, { uploadId: body.uploadId, total: body.total });
      if (!asm.ok) return cors(NextResponse.json(asm, { status: 400 }));
      const fileId = uuidv4();
      const safeName = (body.filename || 'dokument').toString().replace(/[^\w.\-æøåÆØÅ ]/g, '_').slice(0, 150);
      const objectPath = `digihome/dd/${fileId}/${encodeURIComponent(safeName)}`;
      try {
        await putObject(objectPath, asm.buffer, body.mime || 'application/octet-stream');
      } catch (e) {
        await ddCleanupChunks(db, body.uploadId);
        return cors(NextResponse.json({ ok: false, error: `Objektlagring feilet: ${e.message}` }, { status: 502 }));
      }
      await ddCleanupChunks(db, body.uploadId);
      const file = { objectPath, filename: safeName, size: asm.buffer.length, mime: (body.mime || 'application/octet-stream').slice(0, 100) };
      let result;
      if (body.docId) {
        result = await ddAddVersion(db, { docId: body.docId, file });
        if (result.ok) result.docId = body.docId;
      } else {
        result = await ddCreateDocument(db, { title: body.title, category: body.category, description: body.description, file });
      }
      return cors(NextResponse.json(result, { status: result.ok ? 201 : 400 }));
    }

    if (route === '/admin/investor-room/docs' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await ddUpdateDocument(db, { id: body.id, patch: body.patch || {} });
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    if (route === '/admin/investor-room/docs' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const id = (new URL(request.url).searchParams.get('id') || '').trim();
      const result = await ddDeleteDocument(db, id);
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    if (route === '/admin/investor-room/file' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const doc = await ddGetDocument(db, (sp.get('docId') || '').trim());
      if (!doc) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const vNum = Number(sp.get('version')) || doc.currentVersion;
      const ver = (doc.versions || []).find((v) => v.version === vNum) || doc.versions[doc.versions.length - 1];
      const obj = await getObject(ver.objectPath);
      if (!obj) return cors(NextResponse.json({ ok: false, error: 'Filen finnes ikke i lagringen' }, { status: 404 }));
      const res = new NextResponse(obj.buffer, { status: 200 });
      res.headers.set('Content-Type', ver.mime || obj.contentType || 'application/octet-stream');
      res.headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(ver.filename)}`);
      res.headers.set('Cache-Control', 'no-store');
      return cors(res);
    }

    if (route === '/admin/investor-room/qa' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await ddAnswerQuestion(db, { id: body.id, answer: body.answer, isPublic: body.isPublic });
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    if (route === '/admin/investor-room/qa' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const id = (new URL(request.url).searchParams.get('id') || '').trim();
      const result = await ddDeleteQuestion(db, id);
      return cors(NextResponse.json(result, { status: result.ok ? 200 : 400 }));
    }

    // --- Investor-rom: offentlige token-gatede endepunkter ------------------
    // GET /investor/room?t=<token> → levende datapakke scopet til lenkens seksjoner.
    if (route === '/investor/room' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const link = await ddValidateToken(db, sp.get('t'));
      if (!link) return cors(NextResponse.json({ ok: false, error: 'Ugyldig lenke' }, { status: 401 }));
      if (link.invalid) {
        return cors(NextResponse.json({
          ok: false,
          error: link.invalid === 'revoked' ? 'Tilgangen er trukket tilbake' : 'Lenken er utløpt',
          reason: link.invalid,
        }, { status: 403 }));
      }
      await ddRecordView(db, link.id);
      ddLogAudit(db, { linkId: link.id, label: link.label, event: 'view_room', ua: request.headers.get('user-agent') });

      // Board-pack er tung (KPI + live ads-kall) → 5 min prosess-cache.
      const CACHE_MS = 5 * 60 * 1000;
      const g = globalThis;
      let pack = null;
      if (g.__ddBoardPack && (Date.now() - g.__ddBoardPack.at) < CACHE_MS) {
        pack = g.__ddBoardPack.data;
      } else {
        try {
          pack = await computeBoardPack(db);
          g.__ddBoardPack = { at: Date.now(), data: pack };
        } catch (e) { pack = null; }
      }

      const has = (s) => (link.sections || []).includes(s);
      const out = {
        ok: true,
        company: { name: 'DigiHome', tagline: 'AI-drevet eiendomsforvaltning · Bergen' },
        viewer: { label: link.label, sections: link.sections },
        generatedAt: pack?.generatedAt || new Date().toISOString(),
        currency: 'NOK',
      };
      if (pack) {
        if (has('metrics')) {
          out.metrics = {
            investor: pack.investor || null,
            mrrHistory: pack.mrrHistory || null,
          };
        }
        if (has('economy')) {
          out.economy = {
            resultat: pack.resultat || null,
            likviditet: pack.likviditet ? { summary: pack.likviditet.summary, opening: pack.likviditet.opening, months: pack.likviditet.months, scenarios: pack.likviditet.scenarios } : null,
          };
        }
        if (has('forecast')) out.forecast = pack.forecast || null;
      }
      if (has('docs')) {
        const docs = await ddListDocuments(db, { includeArchived: false });
        out.documents = docs.map(ddPublicDocView);
        out.categories = DD_CATEGORIES.map(({ key, label }) => ({ key, label }));
      }
      if (has('qa')) {
        out.questions = await ddListQuestionsForLink(db, link.id);
      }
      const res = cors(NextResponse.json(out));
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // GET /investor/file?t=<token>&docId=<id> → nedlasting m/ audit-logg.
    if (route === '/investor/file' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const link = await ddValidateToken(db, sp.get('t'));
      if (!link || link.invalid) return cors(NextResponse.json({ ok: false, error: 'Ugyldig lenke' }, { status: link ? 403 : 401 }));
      if (!(link.sections || []).includes('docs')) return cors(NextResponse.json({ ok: false, error: 'Ingen dokumenttilgang' }, { status: 403 }));
      const doc = await ddGetDocument(db, (sp.get('docId') || '').trim());
      if (!doc || doc.archived) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const ver = (doc.versions || [])[doc.versions.length - 1];
      const obj = await getObject(ver.objectPath);
      if (!obj) return cors(NextResponse.json({ ok: false, error: 'Filen finnes ikke i lagringen' }, { status: 404 }));
      ddLogAudit(db, { linkId: link.id, label: link.label, event: 'download_doc', meta: { docId: doc.id, title: doc.title, version: ver.version }, ua: request.headers.get('user-agent') });
      const res = new NextResponse(obj.buffer, { status: 200 });
      res.headers.set('Content-Type', ver.mime || obj.contentType || 'application/octet-stream');
      res.headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(ver.filename)}`);
      res.headers.set('Cache-Control', 'no-store');
      return cors(res);
    }

    // POST /investor/qa?t=<token> {question} → still spørsmål (logges).
    if (route === '/investor/qa' && method === 'POST') {
      const sp = new URL(request.url).searchParams;
      const link = await ddValidateToken(db, sp.get('t'));
      if (!link || link.invalid) return cors(NextResponse.json({ ok: false, error: 'Ugyldig lenke' }, { status: link ? 403 : 401 }));
      if (!(link.sections || []).includes('qa')) return cors(NextResponse.json({ ok: false, error: 'Q&A er ikke aktivert for din tilgang' }, { status: 403 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await ddAskQuestion(db, { linkId: link.id, label: link.label, question: body.question });
      if (result.ok) ddLogAudit(db, { linkId: link.id, label: link.label, event: 'ask_question', meta: { preview: (body.question || '').slice(0, 80) } });
      return cors(NextResponse.json(result, { status: result.ok ? 201 : 400 }));
    }


    // ===================================================================
    // Nyhetsbrev — komponering, målgrupper, test-/masseutsending og avmelding.
    // Samtykke: kunder = kundeforhold (trygt); åpne leads = grå sone (merkes).
    // Suppresjonsliste `email_optouts` respekteres ALLTID.
    // ===================================================================
    // ── Bildeopplasting for nyhetsbrev (drag & drop i editoren) ────────────
    // Lagres i MongoDB (overlever deploys) og serveres via /api/newsletter/asset
    // → absolutte URL-er som fungerer i e-postklienter.
    if (route === '/admin/newsletter/upload' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        let form;
        try { form = await request.formData(); } catch (e) {
          return cors(NextResponse.json({ ok: false, error: 'Ugyldig opplasting — multipart/form-data kreves' }, { status: 400 }));
        }
        const file = form.get('file');
        if (!file || typeof file.arrayBuffer !== 'function') {
          return cors(NextResponse.json({ ok: false, error: 'Mangler fil' }, { status: 400 }));
        }
        const raw = Buffer.from(await file.arrayBuffer());
        if (raw.length > 12 * 1024 * 1024) {
          return cors(NextResponse.json({ ok: false, error: 'Bildet er for stort (maks 12 MB)' }, { status: 400 }));
        }
        const sharp = (await import('sharp')).default;
        let meta;
        try { meta = await sharp(raw).metadata(); } catch (e) {
          return cors(NextResponse.json({ ok: false, error: 'Ugyldig bildeformat' }, { status: 400 }));
        }
        if (!meta.format || !['jpeg', 'png', 'webp', 'gif', 'heif', 'avif', 'svg', 'tiff'].includes(meta.format)) {
          return cors(NextResponse.json({ ok: false, error: 'Ugyldig bildeformat' }, { status: 400 }));
        }
        // E-POSTSIKKERT format: Outlook for Windows (Word-motoren) viser IKKE
        // WebP — nyhetsbrevbilder må være JPEG/PNG. Vi optimaliserer hardt i
        // stedet: maks 1200px + mozjpeg q80 (≈ samme størrelse som WebP q80).
        // PNG kun ved transparens. (WebP-forsøk 05.07 ga knekte bilder i Outlook.)
        const hasAlpha = !!meta.hasAlpha;
        let contentType = 'image/jpeg';
        let out;
        const pipe = sharp(raw).rotate().resize({ width: 1200, withoutEnlargement: true });
        if (hasAlpha) { out = await pipe.png({ compressionLevel: 9, palette: true }).toBuffer(); contentType = 'image/png'; }
        else { out = await pipe.jpeg({ quality: 80, mozjpeg: true }).toBuffer(); }
        const outMeta = await sharp(out).metadata();
        const id = uuidv4();
        await db.collection('newsletter_assets').insertOne({
          id, contentType, data: out.toString('base64'),
          width: outMeta.width || null, height: outMeta.height || null,
          bytes: out.length, filename: (file.name || 'bilde').toString().slice(0, 200),
          createdAt: new Date().toISOString(),
        });
        return cors(NextResponse.json({ ok: true, id, url: `/api/newsletter/asset?id=${id}`, width: outMeta.width, height: outMeta.height }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Opplasting feilet: ' + (e.message || 'ukjent') }, { status: 500 }));
      }
    }

    // ======================= ANNONSESTUDIO (Meta) ==========================
    // Kontekst for veiviseren: konto, side, kampanjer + annonsesett (10 min cache).
    if (route === '/admin/adstudio/context' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!adstudioConfigured()) return cors(NextResponse.json({ ok: false, error: 'Meta-nøkler mangler' }, { status: 503 }));
      try {
        const force = new URL(request.url).searchParams.get('refresh') === '1';
        const now = Date.now();
        if (!force && global._adstudioCtx && (now - global._adstudioCtx.ts) < 10 * 60 * 1000) {
          return cors(NextResponse.json({ ok: true, cached: true, ...global._adstudioCtx.data }));
        }
        const data = await fetchAdStudioContext();
        global._adstudioCtx = { ts: now, data };
        return cors(NextResponse.json({ ok: true, cached: false, ...data }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // Geo-søk for kampanjeopprettelse: finn Metas by-/regionnøkler.
    if (route === '/admin/adstudio/geosearch' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const qq = new URL(request.url).searchParams.get('q') || '';
        if (qq.trim().length < 2) return cors(NextResponse.json({ ok: true, results: [] }));
        const results = await searchGeoLocations(qq.trim());
        return cors(NextResponse.json({ ok: true, results }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // Opprett NY kampanje + annonsesett — ALLTID PAUSED. validateOnly støttes.
    // body: { name, objective: 'leads'|'traffic', dailyBudget (NOK), adsetName?,
    //         geo?: { type:'country' } | { type:'city', key, name, radius? },
    //         ageMin?, ageMax?, validateOnly? }
    if (route === '/admin/adstudio/campaign' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const name = String(body.name || '').trim().slice(0, 150);
      if (!name) return cors(NextResponse.json({ ok: false, error: 'Kampanjen trenger et navn' }, { status: 400 }));
      const objective = body.objective === 'traffic' ? 'OUTCOME_TRAFFIC' : 'OUTCOME_LEADS';
      const dailyBudget = Math.min(Math.max(Number(body.dailyBudget) || 150, 50), 10000);
      try {
        if (body.validateOnly) {
          await createCampaign({ name, objective, validateOnly: true });
          return cors(NextResponse.json({ ok: true, validated: true }));
        }
        const camp = await createCampaign({ name, objective });
        const geo = body.geo && body.geo.type === 'city' && body.geo.key
          ? { type: 'city', key: String(body.geo.key), radius: Number(body.geo.radius) || 25 }
          : { type: 'country' };
        const adsetName = String(body.adsetName || '').trim().slice(0, 150)
          || `${name} — ${geo.type === 'city' ? (body.geo?.name || 'by') : 'Norge'}`;
        let adset;
        try {
          adset = await createAdSet({
            campaignId: camp.campaignId, name: adsetName, dailyBudgetNok: dailyBudget,
            optimization: body.objective === 'traffic' ? 'traffic' : 'leads',
            geo, ageMin: body.ageMin, ageMax: body.ageMax,
            pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID || '',
          });
        } catch (e) {
          // Kampanjen finnes (pauset) men annonsesettet feilet — meld tydelig fra.
          global._adstudioCtx = null;
          return cors(NextResponse.json({ ok: false, campaignId: camp.campaignId, error: `Kampanjen ble opprettet (pauset), men annonsesettet feilet: ${e.message}` }, { status: 502 }));
        }
        await db.collection('studio_campaigns').insertOne({
          id: uuidv4(), metaCampaignId: camp.campaignId, metaAdsetId: adset.adsetId,
          name, adsetName, objective, dailyBudget,
          geo: geo.type === 'city' ? `${body.geo?.name || geo.key} (+${geo.radius} km)` : 'Norge',
          ageMin: Number(body.ageMin) || 25, ageMax: Number(body.ageMax) || 65,
          status: 'PAUSED', createdAt: new Date().toISOString(),
        });
        global._adstudioCtx = null; // tving fersk kontekst neste gang
        return cors(NextResponse.json({ ok: true, campaignId: camp.campaignId, adsetId: adset.adsetId, adsetName }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // AI-brief: skriv et ferdig annonsebrief basert på sesong + ferske tall.
    // body: { landing?, goal? }
    if (route === '/admin/adstudio/aibrief' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const now = new Date();
        const monthName = now.toLocaleDateString('nb-NO', { month: 'long' });
        const since = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
        const [leads30, topAd] = await Promise.all([
          db.collection('leads').countDocuments({ createdAt: { $gte: since } }).catch(() => 0),
          db.collection('studio_ads').find({}, { projection: { _id: 0, adName: 1, headline: 1 } }).sort({ createdAt: -1 }).limit(3).toArray().catch(() => []),
        ]);
        const raw = await chatLLM({
          feature: 'annonsestudio_brief',
          maxTokens: 500,
          temperature: 0.9,
          messages: [
            { role: 'system', content: 'Du er markedssjef for DigiHome — profesjonell utleieforvaltning i Bergen. Du skriver korte, konkrete annonse-briefer på norsk bokmål for Meta-annonser. En brief sier: hvem vi skal nå, hvilket budskap/vinkel, og hvilken sesongkrok som gjør den aktuell AKKURAT nå. Svar KUN med gyldig JSON.' },
            { role: 'user', content: `Dato: ${now.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })} (${monthName}).
Tilbud: gratis leievurdering på 60 sekunder. To modeller: Selvforvaltning (5%) og Full forvaltning (10+2).
Landingsside: ${String(body.landing || 'https://digihome.no/bli-utleier')}.
Leads siste 30 dager: ${leads30}.
${topAd.length ? `Nylige annonser (unngå å gjenta vinkelen): ${topAd.map((a) => a.headline || a.adName).filter(Boolean).join(' · ')}` : ''}
${body.goal ? `Ønsket fokus fra markedsfører: ${String(body.goal).slice(0, 200)}` : ''}

Tenk på norske sesongkroker (${monthName}): studiestart/semesterstart, jobbflytting, skattemelding og leieinntekt, sommerutleie, vinterklargjøring av bolig, nyttårsforsetter om passiv inntekt, osv. Velg den mest relevante NÅ.

Svar som JSON:
{ "briefs": [ { "label": "kort navn på vinkelen", "text": "selve briefen, 2-3 setninger: målgruppe + budskap + sesongkrok. Skrives slik at den kan limes rett inn." } x3 — tre ULIKE vinkler ] }` },
          ],
        });
        const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        const parsed = JSON.parse(jsonStr);
        const briefs = (parsed.briefs || []).slice(0, 3).map((b) => ({ label: String(b.label || '').slice(0, 60), text: String(b.text || '').slice(0, 600) })).filter((b) => b.text);
        if (!briefs.length) throw new Error('tomt svar');
        return cors(NextResponse.json({ ok: true, briefs }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'AI-briefen feilet — prøv igjen' }, { status: 502 }));
      }
    }

    // AI-generert kampanjeside (message match): skriv LP-innhold fra annonsen.
    // body: { brief?, message, headline, description?, cta? } → { ok, lp } (IKKE lagret)
    if (route === '/admin/adstudio/lp/generate' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      if (!String(body.message || '').trim() || !String(body.headline || '').trim()) {
        return cors(NextResponse.json({ ok: false, error: 'Annonsetekst og overskrift må være på plass først' }, { status: 400 }));
      }
      try {
        const raw = await chatLLM({
          feature: 'annonsestudio_lp',
          maxTokens: 900,
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'Du skriver konverteringsoptimaliserte landingssider på norsk bokmål for DigiHome — profesjonell utleieforvaltning i Bergen (gratis leievurdering på 60 sek, 0 kr oppstart, ingen bindingstid, to modeller: Selvforvaltning 5% og Full forvaltning 10+2, opptil 30% høyere leieinntekt m/ dynamisk prising). VIKTIGSTE REGEL: message match — sidens språk skal speile annonsens budskap og vinkel 1:1, slik at den som klikker kjenner seg igjen umiddelbart. Ingen superlativ-spam. Svar KUN med gyldig JSON.' },
            { role: 'user', content: `Annonsen som sender trafikk til siden:
${body.brief ? `Brief: ${String(body.brief).slice(0, 400)}` : ''}
Primærtekst: ${String(body.message).slice(0, 800)}
Overskrift: ${String(body.headline).slice(0, 120)}
${body.description ? `Beskrivelse: ${String(body.description).slice(0, 120)}` : ''}
CTA: ${String(body.cta || 'LEARN_MORE')}

Skriv landingssiden som JSON:
{
  "slug": "kort-url-slug (a-z, 0-9, bindestrek, 3-40 tegn, beskriver vinkelen)",
  "eyebrow": "kategori-linje over overskriften, maks 40 tegn",
  "h1": "hovedoverskrift som speiler annonsens budskap, maks 60 tegn",
  "h1B": "linje 2 av overskriften (valgfri tvist/utdyping), maks 60 tegn",
  "sub": "underoverskrift 1-2 setninger som utdyper løftet + 'svar umiddelbart', maks 220 tegn",
  "bullets": ["3 konkrete punkter som matcher annonsen", "…", "…"],
  "heroStat": { "value": "kort talløfte f.eks '+30%' eller '0 kr'", "label": "maks 35 tegn" },
  "proofNote": "1-2 setninger sosial bevis/logikk + peker til kalkulatoren, maks 200 tegn",
  "formTitle": "tittel på lead-skjemaet, maks 50 tegn",
  "cta": "knappetekst, maks 30 tegn",
  "metaTitle": "SEO-tittel maks 60 tegn — DigiHome",
  "metaDesc": "meta-beskrivelse maks 155 tegn"
}` },
          ],
        });
        const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
        const clean = (v, n) => String(v || '').replace(/\s+/g, ' ').trim().slice(0, n);
        const lp = {
          slug: clean(parsed.slug, 40).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'kampanje',
          eyebrow: clean(parsed.eyebrow, 40), h1: clean(parsed.h1, 70), h1B: clean(parsed.h1B, 70) || undefined,
          sub: clean(parsed.sub, 240),
          bullets: (Array.isArray(parsed.bullets) ? parsed.bullets : []).map((b) => clean(b, 70)).filter(Boolean).slice(0, 3),
          heroStat: { value: clean(parsed.heroStat?.value, 20) || '0 kr', label: clean(parsed.heroStat?.label, 40) || 'oppstart · ingen binding' },
          proofNote: clean(parsed.proofNote, 220), formTitle: clean(parsed.formTitle, 60),
          cta: clean(parsed.cta, 34) || 'Start gratis vurdering',
          metaTitle: clean(parsed.metaTitle, 65), metaDesc: clean(parsed.metaDesc, 160),
        };
        if (!lp.h1 || lp.bullets.length < 2) throw new Error('ufullstendig svar');
        return cors(NextResponse.json({ ok: true, lp }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Kunne ikke generere siden — prøv igjen' }, { status: 502 }));
      }
    }

    // Publiser AI-generert kampanjeside → live på /lp/<slug> umiddelbart.
    // body: { lp: {...fra /lp/generate, evt. redigert}, imageUrl?, adName? }
    if (route === '/admin/adstudio/lp' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const lp = body.lp || {};
      if (!String(lp.h1 || '').trim()) return cors(NextResponse.json({ ok: false, error: 'Siden mangler overskrift' }, { status: 400 }));
      try {
        let slug = String(lp.slug || 'kampanje').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
        if (slug.length < 3) slug = `kampanje-${slug}`.slice(0, 40);
        // Unik: kollider ikke med statiske sider eller andre studio-sider.
        const staticSlugs = new Set(Object.keys(LANDING));
        let candidate = slug; let i = 2;
        while (staticSlugs.has(candidate) || await db.collection('studio_lps').findOne({ slug: candidate }, { projection: { _id: 1 } })) {
          candidate = `${slug}-${i++}`.slice(0, 44);
          if (i > 20) { candidate = `${slug}-${Date.now() % 10000}`; break; }
        }
        const doc = {
          id: uuidv4(), slug: candidate, status: 'live',
          eyebrow: String(lp.eyebrow || '').slice(0, 40), h1: String(lp.h1).slice(0, 70),
          h1B: lp.h1B ? String(lp.h1B).slice(0, 70) : null, sub: String(lp.sub || '').slice(0, 240),
          bullets: (Array.isArray(lp.bullets) ? lp.bullets : []).map((b) => String(b).slice(0, 70)).filter(Boolean).slice(0, 4),
          heroStat: { value: String(lp.heroStat?.value || '0 kr').slice(0, 20), label: String(lp.heroStat?.label || '').slice(0, 40) },
          proofNote: String(lp.proofNote || '').slice(0, 220), formTitle: String(lp.formTitle || '').slice(0, 60),
          cta: String(lp.cta || 'Start gratis vurdering').slice(0, 34),
          metaTitle: String(lp.metaTitle || '').slice(0, 65), metaDesc: String(lp.metaDesc || '').slice(0, 160),
          image: body.imageUrl ? String(body.imageUrl).slice(0, 500) : null,
          adName: body.adName ? String(body.adName).slice(0, 150) : null,
          createdAt: new Date().toISOString(),
        };
        await db.collection('studio_lps').insertOne(doc);
        const base = (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
        return cors(NextResponse.json({ ok: true, slug: candidate, path: `/lp/${candidate}`, url: `${base}/lp/${candidate}` }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // Liste over publiserte studio-kampanjesider (til destinasjonsvelgeren).
    if (route === '/admin/adstudio/lps' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const docs = await db.collection('studio_lps').find({ status: 'live' }, { projection: { _id: 0, slug: 1, h1: 1, createdAt: 1 } }).sort({ createdAt: -1 }).limit(30).toArray();
      const base = (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      return cors(NextResponse.json({ ok: true, lps: docs.map((d) => ({ slug: d.slug, h1: d.h1, url: `${base}/lp/${d.slug}`, path: `/lp/${d.slug}`, createdAt: d.createdAt })) }));
    }

    // AI-tekstpakke: primærtekster, overskrifter, beskrivelser + CTA-forslag.
    // body: { brief, angle?, audience?, imageNote?, landing? }
    if (route === '/admin/adstudio/copy' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const brief = String(body.brief || '').slice(0, 800).trim();
      if (!brief) return cors(NextResponse.json({ ok: false, error: 'Skriv en kort brief først' }, { status: 400 }));
      try {
        const raw = await chatLLM({
          feature: 'annonsestudio_tekst',
          maxTokens: 1400,
          temperature: 0.8,
          messages: [
            { role: 'system', content: 'Du er en prisbelønt norsk performance-tekstforfatter for Meta-annonser (Facebook/Instagram). Du skriver på norsk bokmål, konkret og uten superlativ-støy. Du kan reglene: primærtekst bør fungere selv om den kuttes etter ~125 tegn (frontlast budskapet), overskrift maks 40 tegn, beskrivelse maks 30 tegn. Aldri lov garantert avkastning eller bruk påstander som ikke står i briefen. Svar KUN med gyldig JSON.' },
            { role: 'user', content: `Selskap: DigiHome — profesjonell utleieforvaltning i Bergen. Tilbud: gratis leievurdering på 60 sekunder, valget mellom Selvforvaltning (5%) og Full forvaltning. Landingsside: ${String(body.landing || 'https://digihome.no/bli-utleier')}.

Brief fra markedsfører: ${brief}
${body.audience ? `Målgruppe: ${String(body.audience).slice(0, 200)}` : ''}
${body.imageNote ? `Bildet i annonsen viser: ${String(body.imageNote).slice(0, 300)}` : ''}

Lag en komplett tekstpakke som JSON:
{
 "primaryTexts": [ { "angle": "kort vinkel-navn", "text": "primærtekst 2-4 setninger, gjerne med linjeskift \\n\\n og maks 1-2 relevante emojis" } x4 — fire ULIKE vinkler (f.eks. smertepunkt, sosial proof, tilbud, spørsmål) ],
 "headlines": [ 5 overskrifter, maks 40 tegn hver ],
 "descriptions": [ 3 beskrivelser, maks 30 tegn hver ],
 "cta": "en av: LEARN_MORE|GET_QUOTE|SIGN_UP|CONTACT_US|APPLY_NOW — best egnet"
}` },
          ],
        });
        const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        const pkg = JSON.parse(jsonStr);
        return cors(NextResponse.json({ ok: true, package: pkg }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'AI-teksten feilet — prøv igjen: ' + (e.message || '') }, { status: 502 }));
      }
    }

    // Media: last opp bilde (base64) ELLER generer med AI (Nano Banana Pro).
    // body: { imageB64?, filename? } | { aiPrompt, style? }
    // Bildet optimaliseres (1080-bredde JPEG) og lastes opp til Metas bildebibliotek.
    if (route === '/admin/adstudio/media' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        let buf = null;
        let filename = String(body.filename || 'annonse.jpg').slice(0, 120);
        if (body.imageB64) {
          buf = Buffer.from(String(body.imageB64).replace(/^data:[^;]+;base64,/, ''), 'base64');
        } else if (body.aiPrompt) {
          const style = ['foto', 'illustrasjon', 'minimal'].includes(body.style) ? body.style : 'foto';
          const STYLES = {
            foto: 'photorealistic, natural Scandinavian light, editorial quality',
            illustrasjon: 'modern flat illustration, warm palette, clean shapes',
            minimal: 'minimalist composition, generous negative space, soft neutral tones',
          };
          const fullPrompt = `${String(body.aiPrompt).slice(0, 800)}. Style: ${STYLES[style]}. Square 1:1 composition optimized as a Facebook/Instagram feed ad image. No text, no watermarks, no logos.`;
          const genWithModel = async (model, timeoutMs) => {
            const ctrl = new AbortController();
            const timer = setTimeout(() => ctrl.abort(), timeoutMs);
            try {
              const res = await fetch('https://integrations.emergentagent.com/llm/v1/images/generations', {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.EMERGENT_LLM_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: fullPrompt, n: 1 }),
                signal: ctrl.signal,
              });
              if (!res.ok) return null;
              const json = await res.json();
              return json?.data?.[0]?.b64_json || null;
            } catch (err) { return null; } finally { clearTimeout(timer); }
          };
          let b64 = await genWithModel('gemini/gemini-3-pro-image-preview', 90000);
          let aiImgModel = 'gemini-3-pro-image-preview';
          if (!b64) { b64 = await genWithModel('gemini/gemini-2.5-flash-image', 60000); aiImgModel = 'gemini-2.5-flash-image'; }
          if (!b64) return cors(NextResponse.json({ ok: false, error: 'AI-bildet feilet — prøv igjen' }, { status: 502 }));
          logImageUsage(db, { model: aiImgModel, feature: 'annonsestudio_bilde' }).catch(() => {}); // kostnadstelling
          buf = Buffer.from(b64, 'base64');
          filename = 'ai-annonse.jpg';
        }
        if (!buf || buf.length < 100) return cors(NextResponse.json({ ok: false, error: 'Mangler bilde' }, { status: 400 }));
        // Meta anbefaler ≥1080px. Behold 1:1-følelse: begrens bredde, ikke beskjær.
        const out = await sharp(buf).rotate().resize({ width: 1440, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        const meta = await sharp(out).metadata();
        const up = await uploadAdImage(out, filename);
        // Speil i asset-biblioteket slik at bildet også kan gjenbrukes senere.
        const assetId = uuidv4();
        await db.collection('newsletter_assets').insertOne({
          id: assetId, contentType: 'image/jpeg', data: out.toString('base64'),
          width: meta.width || null, height: meta.height || null, bytes: out.length,
          filename, adstudio: true, metaImageHash: up.hash, createdAt: new Date().toISOString(),
        });
        return cors(NextResponse.json({ ok: true, hash: up.hash, url: `/api/newsletter/asset?id=${assetId}`, metaUrl: up.url, width: meta.width, height: meta.height }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Medieopplasting feilet: ' + (e.message || '') }, { status: 502 }));
      }
    }

    // Plasseringsformater: generer 9:16 (Story/Reels) + 1.91:1 (bred) fra
    // 1:1-bildet. Primært via Nano Banana Pro (bilde-til-bilde outpainting) —
    // faller tilbake til smart uskarp utvidelse (sharp) hvis AI feiler.
    // body: { assetId }
    if (route === '/admin/adstudio/formats' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const asset = await db.collection('newsletter_assets').findOne({ id: String(body.assetId || '') }, { projection: { data: 1 } });
        if (!asset || !asset.data) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kildebildet' }, { status: 404 }));
        const src = Buffer.from(asset.data, 'base64');

        // AI-outpainting via Emergent /images/edits (verifisert: Nano Banana Pro
        // respekterer format-instruks i prompt; n-parameter støttes IKKE).
        const editWithNano = async (promptText, timeoutMs = 95000) => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), timeoutMs);
          try {
            const form = new FormData();
            form.append('model', 'gemini/gemini-3-pro-image-preview');
            form.append('prompt', promptText);
            form.append('image', new Blob([src], { type: 'image/jpeg' }), 'source.jpg');
            const res = await fetch('https://integrations.emergentagent.com/llm/v1/images/edits', {
              method: 'POST', headers: { Authorization: `Bearer ${process.env.EMERGENT_LLM_KEY}` },
              body: form, signal: ctrl.signal,
            });
            if (!res.ok) return null;
            const json = await res.json();
            const b64 = json?.data?.[0]?.b64_json;
            return b64 ? Buffer.from(b64, 'base64') : null;
          } catch (err) { return null; } finally { clearTimeout(timer); }
        };

        // Fallback: uskarp bakgrunn (cover) + originalen sentrert (contain).
        const blurExtend = async (W, H) => {
          const bg = await sharp(src).resize(W, H, { fit: 'cover' }).blur(38).modulate({ brightness: 0.88, saturation: 1.05 }).toBuffer();
          const m = await sharp(src).metadata();
          const scale = Math.min(W / m.width, H / m.height);
          const fw = Math.round(m.width * scale), fh = Math.round(m.height * scale);
          const fg = await sharp(src).resize(fw, fh).toBuffer();
          return sharp(bg).composite([{ input: fg, left: Math.round((W - fw) / 2), top: Math.round((H - fh) / 2) }]).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
        };

        const TARGETS = {
          story: {
            W: 1080, H: 1920, arMin: 0.48, arMax: 0.68,
            prompt: 'Reframe this square ad photo into a vertical 9:16 (1080x1920) composition. Keep the main subject and all existing content EXACTLY as-is, perfectly intact. Seamlessly extend the scene upward and downward (outpainting) matching light, colors and style. Photorealistic continuation, no text, no logos, no borders.',
          },
          landscape: {
            W: 1200, H: 628, arMin: 1.6, arMax: 2.25,
            prompt: 'Reframe this square ad photo into a wide 1.91:1 landscape (1200x628) composition. Keep the main subject and all existing content EXACTLY as-is, perfectly intact. Seamlessly extend the scene to the left and right (outpainting) matching light, colors and style. Photorealistic continuation, no text, no logos, no borders.',
          },
        };

        const makeFormat = async (kind) => {
          const t = TARGETS[kind];
          let out = null; let method = 'ai';
          const ai = await editWithNano(t.prompt);
          if (ai) {
            try {
              const m = await sharp(ai).metadata();
              const ar = (m.width || 1) / (m.height || 1);
              if (ar >= t.arMin && ar <= t.arMax) {
                // Riktig retning — normaliser til eksakt målformat.
                out = await sharp(ai).resize(t.W, t.H, { fit: 'cover' }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
              }
            } catch (err) { out = null; }
          }
          if (!out) { out = await blurExtend(t.W, t.H); method = 'smart'; }
          else { logImageUsage(db, { model: 'gemini-3-pro-image-preview', feature: 'annonsestudio_format' }).catch(() => {}); }
          const up = await uploadAdImage(out, `annonse-${kind}.jpg`);
          const outMeta = await sharp(out).metadata();
          const newId = uuidv4();
          await db.collection('newsletter_assets').insertOne({
            id: newId, contentType: 'image/jpeg', data: out.toString('base64'),
            width: outMeta.width || null, height: outMeta.height || null, bytes: out.length,
            filename: `annonse-${kind}.jpg`, adstudio: true, formatKind: kind,
            sourceAssetId: String(body.assetId), metaImageHash: up.hash, createdAt: new Date().toISOString(),
          });
          return { hash: up.hash, url: `/api/newsletter/asset?id=${newId}`, width: outMeta.width, height: outMeta.height, method };
        };

        const [story, landscape] = await Promise.all([makeFormat('story'), makeFormat('landscape')]);
        return cors(NextResponse.json({ ok: true, story, landscape }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Formatgenerering feilet: ' + (e.message || '') }, { status: 502 }));
      }
    }

    // Ekte Meta-forhåndsvisninger (iframe-HTML) — oppretter ingenting.
    // body: { pageId, link, message, headline, description, imageHash, cta }
    if (route === '/admin/adstudio/preview' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const hasFormats = !!(body.storyHash || body.landscapeHash);
        const spec = hasFormats
          ? buildAssetFeedSpec({ pageId: body.pageId, link: body.link, message: body.message, headline: body.headline, description: body.description, cta: body.cta, images: { square: body.imageHash, story: body.storyHash || null, landscape: body.landscapeHash || null } })
          : buildCreativeSpec(body);
        const formats = hasFormats
          ? ['DESKTOP_FEED_STANDARD', 'MOBILE_FEED_STANDARD', 'INSTAGRAM_STANDARD', 'INSTAGRAM_STORY']
          : ['DESKTOP_FEED_STANDARD', 'MOBILE_FEED_STANDARD', 'INSTAGRAM_STANDARD'];
        const previews = await generatePreviews(spec, formats);
        return cors(NextResponse.json({ ok: true, previews }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // AI: foreslå bildeprompt fra briefen (brukes i Media-steget).
    // body: { brief, landing? }
    if (route === '/admin/adstudio/imageprompt' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const brief = String(body.brief || '').slice(0, 600).trim();
      if (!brief) return cors(NextResponse.json({ ok: false, error: 'Skriv en brief først' }, { status: 400 }));
      try {
        const prompt = (await chatLLM({
          feature: 'annonsestudio_bildeprompt',
          maxTokens: 140,
          temperature: 0.7,
          messages: [
            { role: 'system', content: 'You write ONE concise English image-generation prompt (max 40 words) for a Facebook ad photo. Concrete subject, setting, mood, light. Scandinavian/Bergen context when relevant. No text overlays, no logos. Reply with the prompt only.' },
            { role: 'user', content: `Ad brief (Norwegian): ${brief}\nCompany: DigiHome — professional rental property management in Bergen, Norway. Target: homeowners/landlords.` },
          ],
        })).trim().replace(/^["']|["']$/g, '').slice(0, 500);
        return cors(NextResponse.json({ ok: true, prompt }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'AI-forslaget feilet — prøv igjen' }, { status: 502 }));
      }
    }

    // AI-syn: analyser annonsebildet (gpt-4o-mini vision) → kort norsk
    // beskrivelse som gjør tekstpakken bildebevisst.
    // body: { assetId }
    if (route === '/admin/adstudio/imagenote' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const asset = await db.collection('newsletter_assets').findOne({ id: String(body.assetId || '') }, { projection: { data: 1, contentType: 1 } });
        if (!asset || !asset.data) return cors(NextResponse.json({ ok: false, error: 'Fant ikke bildet' }, { status: 404 }));
        const note = (await chatLLM({
          feature: 'annonsestudio_bildesyn',
          maxTokens: 80,
          temperature: 0.3,
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: 'Beskriv dette annonsebildet i ÉN kort norsk setning (maks 18 ord): motiv, setting og stemning. Kun setningen.' },
              { type: 'image_url', image_url: { url: `data:${asset.contentType || 'image/jpeg'};base64,${asset.data}` } },
            ],
          }],
        })).trim().replace(/^["']|["']$/g, '').slice(0, 240);
        return cors(NextResponse.json({ ok: true, note }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Bildeanalysen feilet' }, { status: 502 }));
      }
    }

    // Opprett annonsen — ALLTID pauset. validateOnly=true → kun Metas validering.
    // body: { adsetId, adName, pageId, link, message, headline, description, imageHash, cta, validateOnly }
    if (route === '/admin/adstudio/create' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const required = ['adsetId', 'adName', 'pageId', 'link', 'message', 'headline', 'imageHash'];
      const missing = required.filter((k) => !String(body[k] || '').trim());
      if (missing.length) return cors(NextResponse.json({ ok: false, error: `Mangler: ${missing.join(', ')}` }, { status: 400 }));
      try {
        // Plasseringstilpasning: når 9:16/1.91:1-varianter finnes, bygges
        // asset_feed_spec slik at Meta viser riktig bilde per plassering.
        const hasFormats = !!(body.storyHash || body.landscapeHash);
        const makeSpec = (msg, head, desc) => hasFormats
          ? buildAssetFeedSpec({ pageId: body.pageId, link: body.link, message: msg, headline: head, description: desc, cta: body.cta, images: { square: body.imageHash, story: body.storyHash || null, landscape: body.landscapeHash || null } })
          : buildCreativeSpec({ ...body, message: msg, headline: head, description: desc });
        // A/B: body.variants = [{ message, headline?, description?, angle? }] →
        // oppretter flere annonser med samme bilde/lenke i samme annonsesett.
        const variants = Array.isArray(body.variants) && body.variants.length
          ? body.variants.slice(0, 3)
          : [{ message: body.message, headline: body.headline, description: body.description, angle: null }];
        if (body.validateOnly) {
          const spec = makeSpec(variants[0].message, variants[0].headline || body.headline, variants[0].description != null ? variants[0].description : body.description);
          await createStudioAd({ adsetId: body.adsetId, adName: String(body.adName).slice(0, 150), creativeSpec: spec, validateOnly: true });
          return cors(NextResponse.json({ ok: true, validated: true }));
        }
        const abGroup = variants.length > 1 ? uuidv4() : null;
        const createdAds = [];
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          const adName = variants.length > 1
            ? `${String(body.adName).slice(0, 130)} · ${v.angle || `variant ${i + 1}`}`
            : String(body.adName).slice(0, 150);
          const spec = makeSpec(v.message, v.headline || body.headline, v.description != null ? v.description : body.description);
          const result = await createStudioAd({ adsetId: body.adsetId, adName, creativeSpec: spec, validateOnly: false });
          await db.collection('studio_ads').insertOne({
            id: uuidv4(), metaAdId: result.adId, metaCreativeId: result.creativeId,
            adsetId: body.adsetId, adName, abGroup, abIndex: variants.length > 1 ? i + 1 : null, abTotal: variants.length > 1 ? variants.length : null,
            link: String(body.link).slice(0, 500), message: String(v.message).slice(0, 2000),
            headline: String(v.headline || body.headline).slice(0, 120), description: String(v.description != null ? v.description : body.description || '').slice(0, 120),
            cta: String(body.cta || 'LEARN_MORE'), imageHash: String(body.imageHash),
            imageUrl: String(body.imageUrl || ''),
            storyHash: body.storyHash ? String(body.storyHash) : null,
            landscapeHash: body.landscapeHash ? String(body.landscapeHash) : null,
            placementCustomized: hasFormats,
            status: 'PAUSED', createdAt: new Date().toISOString(),
          });
          createdAds.push({ adId: result.adId, adName });
        }
        return cors(NextResponse.json({ ok: true, ads: createdAds, adId: createdAds[0].adId, abGroup }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // Pause/aktiver en studio-annonse.
    if (route === '/admin/adstudio/adstate' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        await adstudioSetAdStatus(String(body.adId || ''), String(body.status || ''));
        await db.collection('studio_ads').updateOne({ metaAdId: String(body.adId) }, { $set: { status: String(body.status), updatedAt: new Date().toISOString() } });
        return cors(NextResponse.json({ ok: true }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // Liste over annonser laget i studioet + live status/tall fra Meta.
    if (route === '/admin/adstudio/ads' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const rows = await db.collection('studio_ads').find({}, { projection: { _id: 0, message: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
        const live = await fetchAdsLive(rows.map((r) => r.metaAdId).filter(Boolean));
        return cors(NextResponse.json({ ok: true, ads: rows.map((r) => ({ ...r, live: live[r.metaAdId] || null })) }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 502 }));
      }
    }

    // AI-bildegenerering for nyhetsbrev (Gemini Nano Banana via Emergent-nøkkelen).
    // body: { prompt?, auto?, blocks?, style: 'foto'|'illustrasjon'|'minimal' }
    // auto=true → LLM skriver bildeprompt fra nyhetsbrevets innhold først.
    // Resultatet optimaliseres til e-postsikker JPEG og lagres som vanlig asset.
    if (route === '/admin/newsletter/genimage' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const style = ['foto', 'illustrasjon', 'minimal'].includes(body.style) ? body.style : 'foto';
      let userPrompt = String(body.prompt || '').slice(0, 1000).trim();
      try {
        if (!userPrompt && body.auto) {
          // Trekk ut innholdet og la tekst-LLM-en formulere et presist bildeprompt
          const blocks = sanitizeBlocks(body.blocks);
          const parts = [];
          for (const b of blocks) {
            if (b.type === 'heading' && b.text) parts.push(b.text);
            else if (b.type === 'text' && b.text) parts.push(b.text);
            else if (b.type === 'offer' && (b.big || b.eyebrow)) parts.push(`${b.eyebrow || ''} ${b.big || ''} ${b.bigLabel || ''}`.trim());
          }
          const content = parts.join('\n').slice(0, 3000);
          if (!content.trim()) return cors(NextResponse.json({ ok: false, error: 'Nyhetsbrevet har ikke nok tekst til å foreslå et bilde — skriv et prompt selv' }, { status: 400 }));
          userPrompt = (await chatLLM({
            messages: [
              { role: 'system', content: 'You write ONE concise English image-generation prompt (max 50 words) for a marketing email hero image for DigiHome, a Bergen (Norway) rental-management company. Describe a concrete visual scene matching the newsletter content. Never include text, logos or people\'s faces in the image description. Reply with the prompt only.' },
              { role: 'user', content: `Newsletter content:\n${content}` },
            ],
            maxTokens: 120, temperature: 0.7, feature: 'nyhetsbrev_bildeprompt',
          })).trim().replace(/^["']|["']$/g, '').slice(0, 600);
        }
        if (!userPrompt) return cors(NextResponse.json({ ok: false, error: 'Skriv hva bildet skal vise' }, { status: 400 }));
        // suggestOnly=true → returner bare det foreslåtte promptet (brukeren kan justere før generering)
        if (body.suggestOnly) return cors(NextResponse.json({ ok: true, prompt: userPrompt }));
        const STYLES = {
          foto: 'Professional photorealistic photograph, natural Scandinavian light, warm and inviting, high detail',
          illustrasjon: 'Flat modern vector illustration, soft lavender (#cf97fc) and warm neutral palette, clean geometric shapes',
          minimal: 'Minimalist composition, generous negative space, soft neutral tones with a subtle lavender accent',
        };
        const fullPrompt = `${userPrompt}. Style: ${STYLES[style]}. Wide 3:2 landscape composition suitable as an email header image. No text, no watermarks, no logos.`;
        // Nano Banana Pro (gemini-3-pro-image-preview) er beste tilgjengelige bildemodell.
        // Faller tilbake til Nano Banana (2.5-flash-image) hvis Pro feiler.
        const genWithModel = async (model, timeoutMs) => {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), timeoutMs);
          try {
            const res = await fetch('https://integrations.emergentagent.com/llm/v1/images/generations', {
              method: 'POST',
              headers: { Authorization: `Bearer ${process.env.EMERGENT_LLM_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model, prompt: fullPrompt, n: 1 }),
              signal: ctrl.signal,
            });
            if (!res.ok) return null;
            const json = await res.json();
            return json?.data?.[0]?.b64_json || null;
          } catch (err) {
            return null;
          } finally { clearTimeout(timer); }
        };
        let b64 = await genWithModel('gemini/gemini-3-pro-image-preview', 90000);
        let modelUsed = 'gemini-3-pro-image-preview';
        if (!b64) {
          b64 = await genWithModel('gemini/gemini-2.5-flash-image', 60000);
          modelUsed = 'gemini-2.5-flash-image';
        }
        if (!b64) return cors(NextResponse.json({ ok: false, error: 'AI ga ikke noe bilde — prøv et annet prompt' }, { status: 502 }));
        logImageUsage(db, { model: modelUsed, feature: 'nyhetsbrev_bilde' }).catch(() => {}); // kostnadstelling
        // E-postsikker JPEG (Outlook støtter ikke WebP) + hard optimalisering
        const sharp = (await import('sharp')).default;
        const out = await sharp(Buffer.from(b64, 'base64'))
          .resize({ width: 1200, withoutEnlargement: true })
          .jpeg({ quality: 80, mozjpeg: true })
          .toBuffer();
        const outMeta = await sharp(out).metadata();
        const id = uuidv4();
        await db.collection('newsletter_assets').insertOne({
          id, contentType: 'image/jpeg', data: out.toString('base64'),
          width: outMeta.width || null, height: outMeta.height || null,
          bytes: out.length, filename: 'ai-generert.jpg',
          ai: true, prompt: userPrompt.slice(0, 400), style, model: modelUsed,
          createdAt: new Date().toISOString(),
        });
        return cors(NextResponse.json({ ok: true, id, url: `/api/newsletter/asset?id=${id}`, width: outMeta.width, height: outMeta.height, promptUsed: userPrompt }, { status: 201 }));
      } catch (e) {
        const msg = e.name === 'AbortError' ? 'AI-bildegenerering tok for lang tid — prøv igjen' : 'Bildegenerering feilet: ' + (e.message || 'ukjent');
        return cors(NextResponse.json({ ok: false, error: msg }, { status: 502 }));
      }
    }

    // Offentlig asset-visning (bilder i e-post må være åpne URL-er)
    if (route === '/newsletter/asset' && method === 'GET') {
      const id = (new URL(request.url).searchParams.get('id') || '').toString().slice(0, 64);
      const doc = await db.collection('newsletter_assets').findOne({ id }, { projection: { _id: 0, data: 1, contentType: 1 } });
      if (!doc) return new NextResponse('Not found', { status: 404 });
      const buf = Buffer.from(doc.data, 'base64');
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': doc.contentType || 'image/jpeg',
          'Content-Length': String(buf.length),
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    if (route === '/admin/newsletter/audiences' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const data = await audienceCounts(db);
      return cors(NextResponse.json({ ok: true, ...data, emailConfigured: emailConfigured() }));
    }

    if (route === '/admin/newsletter/preview' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const blocks = sanitizeBlocks(body.blocks);
      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      const html = renderNewsletterHtml({
        subject: (body.subject || '').toString().slice(0, 200),
        preheader: (body.preheader || '').toString().slice(0, 200),
        blocks,
        theme: (body.theme || 'lavendel').toString(),
        unsubUrl: `${base}/nyhetsbrev/avmeldt?demo=1`,
        campaignSlug: slugifyCampaign(body.subject),
        recipient: { name: 'Martin Kviteberg' }, // eksempel for merge-tags i forhåndsvisning
      });
      return cors(NextResponse.json({ ok: true, html }));
    }

    // AI-forslag til emnefelt + forhåndstekst (Emergent LLM). body: {blocks,
    // title, currentSubject, currentPreheader, mode:'ny'|'forbedre'}.
    // Returnerer 3 forslag — det første autofylles i UI, resten vises som valg.
    if (route === '/admin/newsletter/suggest' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const blocks = sanitizeBlocks(body.blocks);
      // Trekk ut tekstinnholdet fra brevet som kontekst for modellen
      const parts = [];
      for (const b of blocks) {
        if (b.type === 'heading' && b.text) parts.push(`OVERSKRIFT: ${b.text}`);
        else if (b.type === 'text' && b.text) parts.push(b.text);
        else if (b.type === 'bullets' && (b.items || []).length) parts.push('PUNKTER: ' + b.items.filter(Boolean).join(' · '));
        else if (b.type === 'offer' && (b.big || b.eyebrow)) parts.push(`TILBUD: ${b.eyebrow || ''} ${b.big || ''} ${b.bigLabel || ''} ${b.second || ''} ${b.deadline || ''}`.trim());
        else if (b.type === 'cta-card' && b.title) parts.push(`CTA: ${b.title} ${b.text || ''}`.trim());
        else if (b.type === 'quote' && b.text) parts.push(`SITAT: «${b.text}»`);
        else if (b.type === 'properties' && (b.items || []).length) parts.push(`BOLIGER SOM VISES: ${b.items.map((p) => p.title).join(', ')}`);
      }
      const content = parts.join('\n').slice(0, 4000);
      if (!content.trim()) return cors(NextResponse.json({ ok: false, error: 'Nyhetsbrevet har ikke nok innhold ennå — legg til tekst først' }, { status: 400 }));
      const mode = body.mode === 'forbedre' ? 'forbedre' : 'ny';
      const cur = mode === 'forbedre' && (body.currentSubject || body.currentPreheader)
        ? `\n\nNÅVÆRENDE (forbedre disse, behold intensjonen):\nEmne: ${String(body.currentSubject || '').slice(0, 200)}\nForhåndstekst: ${String(body.currentPreheader || '').slice(0, 200)}`
        : '';
      const SYS = `Du er Norges beste e-postmarkedsfører og skriver for DigiHome — et utleieforvaltnings-selskap i Bergen (varme, ærlige, konkrete — aldri clickbait eller SPAM-ord som «GRATIS!!!»).
Lag 3 forslag til emnefelt + forhåndstekst for nyhetsbrevet under, på norsk bokmål.
Regler:
- Emnefelt: maks 55 tegn, konkret verdi/nysgjerrighet, gjerne personlig. Flettekoden {{first_name}} kan brukes (teller som ~6 tegn).
- Forhåndstekst: 40–90 tegn, utfyller emnet (ikke gjentar det), skaper lyst til å åpne.
- Varier de 3: ett trygt/klassisk, ett personlig, ett med urgency (hvis innholdet har frist/tilbud).
Svar KUN med gyldig JSON: {"forslag":[{"emne":"...","forhandstekst":"..."},{...},{...}]}`;
      try {
        const raw = await chatLLM({
          messages: [
            { role: 'system', content: SYS },
            { role: 'user', content: `NYHETSBREVETS INNHOLD:\n${content}${cur}` },
          ],
          maxTokens: 500, temperature: mode === 'forbedre' ? 0.5 : 0.8, feature: 'nyhetsbrev_emne',
        });
        const jsonStr = String(raw).replace(/```json|```/g, '').trim();
        let parsed = null;
        try { parsed = JSON.parse(jsonStr); } catch (e) {
          const m = jsonStr.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch (e2) {} }
        }
        const suggestions = (parsed?.forslag || [])
          .map((f) => ({ subject: String(f?.emne || '').slice(0, 120).trim(), preheader: String(f?.forhandstekst || '').slice(0, 160).trim() }))
          .filter((f) => f.subject).slice(0, 3);
        if (!suggestions.length) return cors(NextResponse.json({ ok: false, error: 'AI ga ikke brukbare forslag — prøv igjen' }, { status: 502 }));
        return cors(NextResponse.json({ ok: true, suggestions }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'AI-tjenesten er utilgjengelig akkurat nå — prøv igjen om litt' }, { status: 502 }));
      }
    }

    if (route === '/admin/newsletter/test' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!emailConfigured()) return cors(NextResponse.json({ ok: false, error: 'SendGrid er ikke konfigurert (SENDGRID_API_KEY)' }, { status: 400 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      // Flere mottakere: array eller kommaseparert streng (maks 10 per test)
      const rawTo = Array.isArray(body.to) ? body.to : String(body.to || '').split(/[,;\n]+/);
      const emails = [...new Set(rawTo.map((e) => nlNormEmail(e)).filter((e) => /^\S+@\S+\.\S+$/.test(e)))].slice(0, 10);
      if (!emails.length) return cors(NextResponse.json({ ok: false, error: 'Ingen gyldige test-adresser' }, { status: 400 }));
      const blocks = sanitizeBlocks(body.blocks);
      if (!blocks.length) return cors(NextResponse.json({ ok: false, error: 'Nyhetsbrevet har ikke noe innhold ennå' }, { status: 400 }));
      const subject = (body.subject || 'DigiHome — nyhetsbrev').toString().slice(0, 200);
      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      // Valgfri melding fra avsender — vises i gult banner øverst (kun i test)
      const testNote = String(body.message || '').slice(0, 1000).trim();
      const fromName = (body.fromName || 'DigiHome').toString().slice(0, 80);
      const sent = []; const failed = [];
      for (const to of emails) {
        const html = renderNewsletterHtml({
          subject, preheader: (body.preheader || '').toString().slice(0, 200), blocks,
          theme: (body.theme || 'lavendel').toString(),
          unsubUrl: buildUnsubUrl(base, to), campaignSlug: slugifyCampaign(subject),
          recipient: { name: (body.sampleName || 'Martin Kviteberg').toString() },
          testNote,
        });
        try {
          await sendHtmlEmail({ to, subject: `[TEST] ${subject}`, html, fromName });
          sent.push(to);
        } catch (e) { failed.push({ to, error: e.message }); }
      }
      if (!sent.length) return cors(NextResponse.json({ ok: false, error: failed[0]?.error || 'Sending feilet' }, { status: 502 }));
      return cors(NextResponse.json({ ok: true, sentTo: sent, sentCount: sent.length, failed }));
    }

    // Opprett utkast fra mal ("Velg et startpunkt")
    if (route === '/admin/newsletter/draft' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const tpl = TEMPLATES.find((t) => t.key === body.template) || TEMPLATES[0];
      const now = new Date().toISOString();
      const doc = {
        id: uuidv4(),
        title: (body.title || tpl.label).toString().slice(0, 160),
        subject: '', preheader: '', fromName: 'DigiHome',
        theme: 'lavendel',
        blocks: templateBlocks(tpl.key),
        segments: [], excludedEmails: [], extraEmails: [],
        status: 'draft', template: tpl.key,
        createdAt: now, updatedAt: now,
        recipients: 0, sent: 0, failedCount: 0, opens: 0, clicks: 0, openedR: [], clickedR: [],
      };
      await db.collection(NEWSLETTER_COLL).insertOne({ ...doc });
      return cors(NextResponse.json({ ok: true, campaign: doc }, { status: 201 }));
    }

    // Autolagring av utkast (body: {id, ...felter})
    if (route === '/admin/newsletter/draft' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const existing = await db.collection(NEWSLETTER_COLL).findOne({ id }, { projection: { _id: 0, status: 1 } });
      if (!existing) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
      if (existing.status === 'sent') return cors(NextResponse.json({ ok: false, error: 'Sendte kampanjer kan ikke endres' }, { status: 400 }));
      const set = { updatedAt: new Date().toISOString() };
      if (body.title !== undefined) set.title = String(body.title).slice(0, 160);
      if (body.subject !== undefined) set.subject = String(body.subject).slice(0, 200);
      if (body.preheader !== undefined) set.preheader = String(body.preheader).slice(0, 200);
      if (body.fromName !== undefined) set.fromName = String(body.fromName).slice(0, 80);
      if (body.theme !== undefined) set.theme = THEMES[body.theme] ? String(body.theme) : 'lavendel';
      if (body.blocks !== undefined) set.blocks = sanitizeBlocks(body.blocks);
      if (body.segments !== undefined) set.segments = (Array.isArray(body.segments) ? body.segments : []).filter((s) => ['kunder', 'abonnenter', 'leads', 'leietakere'].includes(s));
      if (body.excludedEmails !== undefined) set.excludedEmails = (Array.isArray(body.excludedEmails) ? body.excludedEmails : []).slice(0, 5000).map((e) => nlNormEmail(e)).filter(Boolean);
      if (body.extraEmails !== undefined) set.extraEmails = (Array.isArray(body.extraEmails) ? body.extraEmails : []).slice(0, 500)
        .map((x) => (typeof x === 'string' ? { email: nlNormEmail(x), name: '' } : { email: nlNormEmail(x?.email), name: String(x?.name || '').slice(0, 120) }))
        .filter((x) => /^\S+@\S+\.\S+$/.test(x.email));
      await db.collection(NEWSLETTER_COLL).updateOne({ id }, { $set: set });
      return cors(NextResponse.json({ ok: true, updatedAt: set.updatedAt }));
    }

    // Hent én kampanje (med statistikk og klikk per lenke)
    if (route === '/admin/newsletter/campaign' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const id = (new URL(request.url).searchParams.get('id') || '').toString();
      const c = await db.collection(NEWSLETTER_COLL).findOne({ id }, { projection: { _id: 0 } });
      if (!c) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
      let clicksByUrl = [];
      let timeline = [];
      let hourly = [];
      let devices = [];
      let clients = [];
      let segments = [];
      let recipientDetails = [];
      let medianMinutesToOpen = null;
      let bestHour = null;
      if (c.status === 'sent') {
        clicksByUrl = await db.collection(NL_EVENTS_COLL).aggregate([
          { $match: { campaignId: id, type: 'click' } },
          { $group: { _id: '$url', total: { $sum: 1 }, unique: { $addToSet: '$rid' } } },
          { $project: { _id: 0, url: '$_id', total: 1, unique: { $size: '$unique' } } },
          { $sort: { total: -1 } }, { $limit: 30 },
        ]).toArray();
        // Aktivitet per dag (åpninger/klikk) — for tidslinje i UI
        timeline = await db.collection(NL_EVENTS_COLL).aggregate([
          { $match: { campaignId: id } },
          { $group: { _id: { day: { $substr: ['$at', 0, 10] }, type: '$type' }, n: { $sum: 1 } } },
          { $group: { _id: '$_id.day', opens: { $sum: { $cond: [{ $eq: ['$_id.type', 'open'] }, '$n', 0] } }, clicks: { $sum: { $cond: [{ $eq: ['$_id.type', 'click'] }, '$n', 0] } } } },
          { $project: { _id: 0, day: '$_id', opens: 1, clicks: 1 } },
          { $sort: { day: 1 } }, { $limit: 60 },
        ]).toArray();
        // Aktivitet per time (første 72 t) — finmasket engasjementskurve
        hourly = await db.collection(NL_EVENTS_COLL).aggregate([
          { $match: { campaignId: id, type: { $in: ['open', 'click'] } } },
          { $group: { _id: { h: { $substr: ['$at', 0, 13] }, type: '$type' }, n: { $sum: 1 } } },
          { $group: { _id: '$_id.h', opens: { $sum: { $cond: [{ $eq: ['$_id.type', 'open'] }, '$n', 0] } }, clicks: { $sum: { $cond: [{ $eq: ['$_id.type', 'click'] }, '$n', 0] } } } },
          { $project: { _id: 0, hour: '$_id', opens: 1, clicks: 1 } },
          { $sort: { hour: 1 } }, { $limit: 96 },
        ]).toArray();
        // Enheter/klienter (unike åpnere) — proxy = Gmail/Apple skjuler enheten
        const devAgg = await db.collection(NL_EVENTS_COLL).aggregate([
          { $match: { campaignId: id, type: 'open' } },
          { $group: { _id: { device: { $ifNull: ['$device', 'ukjent'] }, client: { $ifNull: ['$client', 'annet'] } }, rids: { $addToSet: '$rid' } } },
          { $project: { _id: 0, device: '$_id.device', client: '$_id.client', n: { $size: '$rids' } } },
        ]).toArray();
        const devMap = new Map(); const cliMap = new Map();
        for (const d of devAgg) {
          devMap.set(d.device, (devMap.get(d.device) || 0) + d.n);
          cliMap.set(d.client, (cliMap.get(d.client) || 0) + d.n);
        }
        devices = [...devMap.entries()].map(([k, n]) => ({ key: k, n })).sort((a, b) => b.n - a.n);
        clients = [...cliMap.entries()].map(([k, n]) => ({ key: k, n })).sort((a, b) => b.n - a.n);
        // Per-mottaker-hendelser: første åpning, antall klikk, siste aktivitet
        const perRid = await db.collection(NL_EVENTS_COLL).aggregate([
          { $match: { campaignId: id, type: { $in: ['open', 'click'] } } },
          { $group: { _id: '$rid',
            firstOpenAt: { $min: { $cond: [{ $eq: ['$type', 'open'] }, '$at', null] } },
            clicksN: { $sum: { $cond: [{ $eq: ['$type', 'click'] }, 1, 0] } },
            lastAt: { $max: '$at' } } },
        ]).toArray();
        const ridInfo = new Map(perRid.map((p) => [p._id, p]));
        // Median tid til første åpning + beste time (flest åpninger)
        if (c.sentAt) {
          const sentMs = Date.parse(c.sentAt);
          const mins = perRid.map((p) => p.firstOpenAt ? Math.round((Date.parse(p.firstOpenAt) - sentMs) / 60000) : null)
            .filter((m) => m != null && m >= 0).sort((a, b) => a - b);
          if (mins.length) medianMinutesToOpen = mins[Math.floor(mins.length / 2)];
        }
        if (hourly.length) {
          const top = [...hourly].sort((a, b) => b.opens - a.opens)[0];
          if (top && top.opens > 0) bestHour = top.hour; // 'YYYY-MM-DDTHH'
        }
        // Mottaker-nivå: hvem åpnet og klikket (e-post fra mottaker-kartet)
        const openedSet = new Set(c.openedR || []);
        const clickedSet = new Set(c.clickedR || []);
        const recRows = await db.collection('newsletter_recipients')
          .find({ campaignId: id }, { projection: { _id: 0, rid: 1, email: 1, name: 1, segment: 1, failed: 1 } })
          .limit(2000).toArray();
        recipientDetails = recRows.map((r) => {
          const info = ridInfo.get(r.rid);
          return {
            email: r.email, name: r.name || '', segment: r.segment || '',
            opened: openedSet.has(r.rid), clicked: clickedSet.has(r.rid), failed: !!r.failed,
            openedAt: info?.firstOpenAt || null, clicksN: info?.clicksN || 0, lastAt: info?.lastAt || null,
          };
        }).sort((a, b) => (b.clicksN - a.clicksN) || (b.clicked - a.clicked) || (b.opened - a.opened) || a.email.localeCompare(b.email));
        // Engasjement per segment
        const segMap = new Map();
        for (const r of recRows) {
          const key = r.segment || 'ukjent';
          const s = segMap.get(key) || { segment: key, sent: 0, opened: 0, clicked: 0 };
          s.sent++;
          if (openedSet.has(r.rid)) s.opened++;
          if (clickedSet.has(r.rid)) s.clicked++;
          segMap.set(key, s);
        }
        segments = [...segMap.values()].sort((a, b) => b.sent - a.sent);
      }
      const opensUnique = (c.openedR || []).length;
      const clicksUnique = (c.clickedR || []).length;
      const unsubs = c.unsubs || 0;
      return cors(NextResponse.json({
        ok: true,
        campaign: { ...c, openedR: undefined, clickedR: undefined },
        stats: {
          recipients: c.recipients || 0, sent: c.sent || 0, failedCount: c.failedCount || 0,
          opens: c.opens || 0, opensUnique, clicks: c.clicks || 0, clicksUnique, unsubs,
          openRate: c.sent ? Math.round((opensUnique / c.sent) * 1000) / 10 : null,
          clickRate: c.sent ? Math.round((clicksUnique / c.sent) * 1000) / 10 : null,
          ctor: opensUnique ? Math.round((clicksUnique / opensUnique) * 1000) / 10 : null,
          medianMinutesToOpen, bestHour,
          clicksByUrl, timeline, hourly, devices, clients, segments, recipientDetails,
        },
      }));
    }

    if (route === '/admin/newsletter/campaign' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const id = (new URL(request.url).searchParams.get('id') || '').toString();
      const res = await db.collection(NEWSLETTER_COLL).deleteOne({ id });
      await db.collection(NL_EVENTS_COLL).deleteMany({ campaignId: id });
      await db.collection('newsletter_recipients').deleteMany({ campaignId: id });
      return cors(NextResponse.json({ ok: true, deleted: res.deletedCount }));
    }

    if (route === '/admin/newsletter/duplicate' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const src = await db.collection(NEWSLETTER_COLL).findOne({ id: (body.id || '').toString() }, { projection: { _id: 0 } });
      if (!src) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
      const now = new Date().toISOString();
      const doc = {
        ...src, id: uuidv4(), title: `Kopi av ${src.title || 'kampanje'}`.slice(0, 160),
        status: 'draft', createdAt: now, updatedAt: now, sentAt: undefined,
        recipients: 0, sent: 0, failedCount: 0, failed: undefined, skipped: undefined,
        opens: 0, clicks: 0, openedR: [], clickedR: [],
      };
      await db.collection(NEWSLETTER_COLL).insertOne({ ...doc });
      return cors(NextResponse.json({ ok: true, campaign: doc }, { status: 201 }));
    }

    // Mottakerliste for målgruppe-redigering (se nøyaktige e-poster)
    if (route === '/admin/newsletter/recipients' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const segments = (sp.get('segments') || '').split(',').map((s) => s.trim()).filter((s) => ['kunder', 'abonnenter', 'leads', 'leietakere'].includes(s));
      const { recipients, skipped } = await resolveAudience(db, segments, []);
      return cors(NextResponse.json({ ok: true, recipients: recipients.slice(0, 2000), total: recipients.length, skipped }));
    }

    // Send kampanje (body: {campaignId}) — bruker lagrede segmenter + ekskluderinger
    if (route === '/admin/newsletter/send' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!emailConfigured()) return cors(NextResponse.json({ ok: false, error: 'SendGrid er ikke konfigurert (SENDGRID_API_KEY)' }, { status: 400 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const campaignId = (body.campaignId || '').toString();
      if (!campaignId) return cors(NextResponse.json({ ok: false, error: 'Mangler campaignId' }, { status: 400 }));
      const c = await db.collection(NEWSLETTER_COLL).findOne({ id: campaignId }, { projection: { _id: 0 } });
      if (!c) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
      if (c.status === 'sent') return cors(NextResponse.json({ ok: false, error: 'Kampanjen er allerede sendt' }, { status: 400 }));
      const subject = (c.subject || '').trim();
      if (!subject) return cors(NextResponse.json({ ok: false, error: 'Emnefelt mangler — fyll inn under Oppsett' }, { status: 400 }));
      if (!hasContent(c.blocks)) return cors(NextResponse.json({ ok: false, error: 'Nyhetsbrevet har ikke noe innhold ennå' }, { status: 400 }));
      if (!(c.segments || []).length && !(c.extraEmails || []).length) return cors(NextResponse.json({ ok: false, error: 'Velg minst én målgruppe eller legg til mottakere manuelt' }, { status: 400 }));

      const { recipients, skipped } = await resolveAudience(db, c.segments, c.excludedEmails || [], c.extraEmails || []);
      if (!recipients.length) return cors(NextResponse.json({ ok: false, error: 'Ingen mottakere i valgt målgruppe (etter avmeldte/ekskluderte)' }, { status: 400 }));
      if (recipients.length > 2000) return cors(NextResponse.json({ ok: false, error: `For mange mottakere i én utsending (${recipients.length} > 2000)` }, { status: 400 }));

      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      const slug = slugifyCampaign(subject);
      const fromEmail = (process.env.SENDGRID_FROM_EMAIL || 'hei@digihome.no').trim();
      let sent = 0; const failed = [];
      const CHUNK = 8;
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const chunk = recipients.slice(i, i + CHUNK);
        await Promise.all(chunk.map(async (r) => {
          try {
            const unsubUrl = buildUnsubUrl(base, r.email, campaignId);
            const html = renderNewsletterHtml({
              subject, preheader: c.preheader || '', blocks: c.blocks || [], theme: c.theme || 'lavendel',
              unsubUrl, campaignSlug: slug,
              recipient: r,
              tracking: { trackBase: base, campaignId, rid: recipientId(r.email) },
            });
            await sendHtmlEmail({
              to: r.email, subject: applyMergeTags(subject, r), html, fromName: c.fromName || 'DigiHome',
              replyTo: fromEmail,
              // One-click avmelding (RFC 8058) — kreves av Gmail/Yahoo for bulk
              // og bedrer fane-plassering/leveringsevne betydelig.
              headers: {
                'List-Unsubscribe': `<mailto:${fromEmail}?subject=avmelding>, <${unsubUrl}>`,
                'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
              },
              categories: ['nyhetsbrev', slug.slice(0, 50)],
            });
            sent++;
          } catch (e) {
            failed.push({ email: r.email, error: (e.message || 'ukjent').slice(0, 200) });
          }
        }));
      }

      const now = new Date().toISOString();
      // Lagre mottaker-kart (rid → e-post) for klikk→lead-attribusjon og analyse
      try {
        const recDocs = recipients.map((r) => ({
          id: uuidv4(), campaignId, rid: recipientId(r.email),
          email: r.email, name: r.name || '', segment: r.segment || '',
          failed: failed.some((f) => f.email === r.email), sentAt: now,
        }));
        if (recDocs.length) await db.collection('newsletter_recipients').insertMany(recDocs, { ordered: false });
      } catch (e) {}
      const upd = {
        status: 'sent', sentAt: now, updatedAt: now, slug,
        recipients: recipients.length, sent, failedCount: failed.length,
        failed: failed.slice(0, 50), skipped, opens: 0, clicks: 0, openedR: [], clickedR: [],
      };
      await db.collection(NEWSLETTER_COLL).updateOne({ id: campaignId }, { $set: upd });
      return cors(NextResponse.json({ ok: true, campaign: { ...c, ...upd } }, { status: 201 }));
    }

    if (route === '/admin/newsletter' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const items = await db.collection(NEWSLETTER_COLL)
        .find({}, { projection: { _id: 0, blocks: 0, failed: 0 } })
        .sort({ updatedAt: -1, sentAt: -1 }).limit(100).toArray();
      const campaigns = items.map((c) => {
        const opensUnique = (c.openedR || []).length;
        const clicksUnique = (c.clickedR || []).length;
        return {
          ...c, openedR: undefined, clickedR: undefined, excludedEmails: undefined,
          opensUnique, clicksUnique,
          openRate: c.sent ? Math.round((opensUnique / c.sent) * 1000) / 10 : null,
          clickRate: c.sent ? Math.round((clicksUnique / c.sent) * 1000) / 10 : null,
        };
      });
      const optouts = await db.collection(OPTOUT_COLL).countDocuments();
      return cors(NextResponse.json({
        ok: true, campaigns, optouts,
        templates: TEMPLATES.map((t) => ({ key: t.key, label: t.label, desc: t.desc })),
        themes: Object.keys(THEMES).map((k) => ({ key: k, accent: THEMES[k].accent })),
      }));
    }

    // ── Abonnent-administrasjon ────────────────────────────────────────────
    // GET: full oversikt (abonnenter + kryss-sjekk mot leads), POST: legg til,
    // DELETE: fjern abonnent (?email=). Avmeldte vises med status.
    if (route === '/admin/newsletter/subscribers' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const subs = await db.collection('newsletter_subscribers')
        .find({}, { projection: { _id: 0 } }).sort({ subscribedAt: -1 }).limit(5000).toArray();
      const optoutRows = await db.collection(OPTOUT_COLL).find({}, { projection: { _id: 0, email: 1 } }).toArray();
      const optouts = new Set(optoutRows.map((o) => nlNormEmail(o.email)));
      // Kryss-sjekk: hvilke abonnenter er også leads/kunder?
      const leadEmails = new Set();
      for (const coll of ['leads', 'tenant_leads', 'imported_leads']) {
        const rows = await db.collection(coll).find({ email: { $exists: true, $ne: '' } }, { projection: { _id: 0, email: 1 } }).limit(20000).toArray();
        for (const r of rows) leadEmails.add(nlNormEmail(r.email));
      }
      const items = subs.map((s) => {
        const em = nlNormEmail(s.email);
        return { ...s, email: em, unsubscribed: optouts.has(em), isLead: leadEmails.has(em) };
      });
      return cors(NextResponse.json({
        ok: true, subscribers: items,
        counts: {
          total: items.length,
          active: items.filter((s) => !s.unsubscribed).length,
          unsubscribed: items.filter((s) => s.unsubscribed).length,
          pureSubscribers: items.filter((s) => !s.isLead && !s.unsubscribed).length,
        },
      }));
    }

    if (route === '/admin/newsletter/subscribers' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const email = nlNormEmail(body.email);
      if (!/^\S+@\S+\.\S+$/.test(email)) return cors(NextResponse.json({ ok: false, error: 'Ugyldig e-postadresse' }, { status: 400 }));
      const now = new Date().toISOString();
      await db.collection('newsletter_subscribers').updateOne(
        { email },
        { $set: { name: String(body.name || '').slice(0, 120), source: 'admin', updatedAt: now }, $setOnInsert: { email, subscribedAt: now, consent: true } },
        { upsert: true }
      );
      // Admin-tillegg opphever ev. tidligere avmelding (eksplisitt handling)
      await db.collection(OPTOUT_COLL).deleteOne({ email });
      return cors(NextResponse.json({ ok: true }, { status: 201 }));
    }

    if (route === '/admin/newsletter/subscribers' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const email = nlNormEmail(new URL(request.url).searchParams.get('email') || '');
      if (!email) return cors(NextResponse.json({ ok: false, error: 'Mangler email' }, { status: 400 }));
      const res = await db.collection('newsletter_subscribers').deleteOne({ email });
      return cors(NextResponse.json({ ok: true, deleted: res.deletedCount }));
    }

    // Offentlig avmelding — HMAC-verifisert lenke fra e-posten. Ingen auth.
    // GET = klikk fra e-post (redirect til bekreftelsesside).
    // POST = One-Click avmelding (RFC 8058 — Gmail/Yahoo poster hit automatisk).
    if (route === '/newsletter/unsubscribe' && (method === 'GET' || method === 'POST')) {
      const sp = new URL(request.url).searchParams;
      let email = '';
      try { email = Buffer.from((sp.get('e') || '').toString(), 'base64url').toString('utf8'); } catch (e) { email = ''; }
      const token = (sp.get('t') || '').toString();
      const campId = (sp.get('c') || '').toString().slice(0, 64);
      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      if (!email || !verifyUnsubToken(email, token)) {
        if (method === 'POST') return cors(NextResponse.json({ ok: false }, { status: 400 }));
        return NextResponse.redirect(`${base}/nyhetsbrev/avmeldt?feil=1`, 302);
      }
      const norm = nlNormEmail(email);
      const res = await db.collection(OPTOUT_COLL).updateOne(
        { email: norm },
        { $setOnInsert: { email: norm, at: new Date().toISOString(), source: method === 'POST' ? 'one-click' : 'link' } },
        { upsert: true }
      );
      // Kampanjekoblet avmeldingsstatistikk (kun første gang for denne e-posten)
      if (campId && res.upsertedCount) {
        try {
          await db.collection(NEWSLETTER_COLL).updateOne({ id: campId, status: 'sent' }, { $inc: { unsubs: 1 } });
          await db.collection(NL_EVENTS_COLL).insertOne({ id: uuidv4(), campaignId: campId, rid: recipientId(norm), type: 'unsub', at: new Date().toISOString() });
        } catch (e) {}
      }
      if (method === 'POST') return cors(NextResponse.json({ ok: true }));
      return NextResponse.redirect(`${base}/nyhetsbrev/avmeldt`, 302);
    }

    // Åpningssporing — 1x1 GIF (offentlig, ingen auth)
    if (route === '/newsletter/open' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const c = (sp.get('c') || '').toString().slice(0, 64);
      const r = (sp.get('r') || '').toString().slice(0, 32);
      if (c && r) {
        try {
          const ua = (request.headers.get('user-agent') || '').slice(0, 300);
          await db.collection(NEWSLETTER_COLL).updateOne({ id: c, status: 'sent' }, { $inc: { opens: 1 }, $addToSet: { openedR: r } });
          await db.collection(NL_EVENTS_COLL).insertOne({ id: uuidv4(), campaignId: c, rid: r, type: 'open', at: new Date().toISOString(), ...nlClassifyUa(ua) });
        } catch (e) {}
      }
      return new NextResponse(TRACKING_GIF, { status: 200, headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate', 'Content-Length': String(TRACKING_GIF.length) } });
    }

    // Klikksporing — logg + redirect til mål-URL (offentlig, ingen auth)
    if (route === '/newsletter/click' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const c = (sp.get('c') || '').toString().slice(0, 64);
      const r = (sp.get('r') || '').toString().slice(0, 32);
      let target = (sp.get('u') || '').toString().slice(0, 1000);
      const base = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
      if (!/^https?:\/\//i.test(target)) target = base; // kun http(s)-mål
      // Beste praksis-attribusjon: klikk til egne sider auto-tagges med UTM,
      // slik at first/last-touch-sporingen på nettsiden krediterer nyhetsbrevet
      // (f.eks. lead fra Meta som konverterer via nyhetsbrev → first: meta,
      // last: nyhetsbrev — begge bevares i marketing-metrikkene på leaden).
      try {
        const tu = new URL(target);
        const own = tu.hostname.endsWith('digihome.no') || tu.hostname === new URL(base).hostname;
        if (own && !tu.searchParams.get('utm_source')) {
          tu.searchParams.set('utm_source', 'nyhetsbrev');
          tu.searchParams.set('utm_medium', 'email');
          if (c) tu.searchParams.set('utm_campaign', c.slice(0, 40));
          target = tu.toString();
        }
      } catch (e) { /* behold target som den er */ }
      if (c && r) {
        try {
          const ua = (request.headers.get('user-agent') || '').slice(0, 300);
          await db.collection(NEWSLETTER_COLL).updateOne({ id: c, status: 'sent' }, { $inc: { clicks: 1 }, $addToSet: { clickedR: r } });
          await db.collection(NL_EVENTS_COLL).insertOne({ id: uuidv4(), campaignId: c, rid: r, type: 'click', url: target.slice(0, 500), at: new Date().toISOString(), ...nlClassifyUa(ua) });
          // Klikk → lead-attribusjon: finn mottakerens e-post via rid og stemple leaden
          const rec = await db.collection('newsletter_recipients').findOne({ campaignId: c, rid: r }, { projection: { _id: 0, email: 1 } });
          if (rec?.email) {
            const camp = await db.collection(NEWSLETTER_COLL).findOne({ id: c }, { projection: { _id: 0, subject: 1, slug: 1 } });
            const stamp = {
              campaignId: c, campaign: camp?.slug || camp?.subject || c,
              url: target.slice(0, 300), at: new Date().toISOString(),
            };
            const emailRe = new RegExp(`^${rec.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
            for (const coll of ['leads', 'tenant_leads', 'imported_leads']) {
              await db.collection(coll).updateMany(
                { email: emailRe },
                { $set: { newsletter_last_click: stamp }, $inc: { newsletter_clicks: 1 } }
              );
            }
            await db.collection('newsletter_subscribers').updateOne(
              { email: rec.email },
              { $set: { last_click_at: stamp.at, last_campaign: stamp.campaign }, $inc: { clicks: 1 } }
            );
          }
        } catch (e) {}
      }
      return NextResponse.redirect(target, 302);
    }

    // Offentlig påmelding til nyhetsbrev (footer på nettsiden). Eksplisitt
    // samtykke → eget segment 'abonnenter' i nyhetsbrev-motoren.
    // Re-påmelding fjerner ev. tidligere avmelding (eksplisitt ny vilje).
    if (route === '/newsletter/subscribe' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const email = nlNormEmail(body.email);
      if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) {
        return cors(NextResponse.json({ ok: false, error: 'Ugyldig e-postadresse' }, { status: 400 }));
      }
      const name = (body.name || '').toString().trim().slice(0, 120);
      const source = (body.source || 'footer').toString().slice(0, 40);
      const now = new Date().toISOString();
      const setDoc = { updated_at: now, consent: true };
      if (name) setDoc.name = name;
      await db.collection('newsletter_subscribers').updateOne(
        { email },
        { $setOnInsert: { id: uuidv4(), email, created_at: now, source }, $set: setDoc },
        { upsert: true }
      );
      try { await db.collection(OPTOUT_COLL).deleteOne({ email }); } catch (e) {}
      return cors(NextResponse.json({ ok: true }));
    }

    // ── Priskalkulator: produktkatalog ─────────────────────────────────────
    // Offentlig lesing (wizard på /priskalkulator) + admin-skriving.
    // Én kilde til sannhet i settings-collection — byttes til plattformens
    // katalog-API når de bygger fakturering (v2).
    if (route === '/wizard/catalog' && method === 'GET') {
      const doc = await db.collection('settings').findOne({ key: 'wizard_catalog' });
      const catalog = (doc && doc.value) || WIZARD_CATALOG_DEFAULT;
      return cors(NextResponse.json({ ok: true, catalog, source: doc ? 'db' : 'default' }));
    }
    if (route === '/admin/wizard/catalog' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      if (!body.catalog || typeof body.catalog !== 'object') {
        return cors(NextResponse.json({ ok: false, error: 'Mangler catalog-objekt' }, { status: 400 }));
      }
      await db.collection('settings').updateOne(
        { key: 'wizard_catalog' },
        { $set: { value: { ...body.catalog, updated_at: new Date().toISOString() } } },
        { upsert: true }
      );
      return cors(NextResponse.json({ ok: true }));
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORVALTEDE BOLIGER — synk fra plattformen + synlighetsstyring + offentlig
    // visning på forsiden. Kilde: GET {PLATFORM}/api/properties/export.
    // Personvern: plattformen leverer allerede PII-frie felt; VI styrer
    // synlighet per bolig (default skjult).
    // ═══════════════════════════════════════════════════════════════════

    // Offentlig: kun synlige boliger (brukes av forsiden). Auto-resynk i
    // bakgrunnen hvis data er >1t gamle — svarer alltid umiddelbart fra cache.
    if (route === '/public/properties' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const limit = Number(sp.get('limit')) || 12;
      let properties = [];
      try { properties = await listPublicProperties(db, { limit }); } catch (e) { properties = []; }
      try { maybeAutoSyncProperties(db, digiHomeTarget); } catch (e) {}
      return cors(NextResponse.json({ ok: true, properties, count: properties.length }, { headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=600' } }));
    }

    // Admin: liste over alle synkede boliger + synk-metadata
    if (route === '/admin/properties' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const [properties, meta] = await Promise.all([listAdminProperties(db), getPropertiesSyncMeta(db)]);
      const visibleCount = properties.filter((p) => p.visible).length;
      return cors(NextResponse.json({ ok: true, properties, total: properties.length, visibleCount, meta: meta ? { lastSyncAt: meta.lastSyncAt || null, lastError: meta.lastError || null, platformTotal: meta.platformTotal ?? null } : null }));
    }

    // Admin: manuell synk fra plattformen
    if (route === '/admin/properties/sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const target = digiHomeTarget();
      const result = await syncPropertiesFromPlatform(db, { target: target.url, key: target.key });
      return cors(NextResponse.json({ ...result, platformEnv: target.env, platformUrl: target.url }, { status: result.ok ? 200 : 502 }));
    }

    // Admin: sett synlighet (enkelt {id, visible} eller bulk {ids:[], visible})
    if (route === '/admin/properties/visibility' && (method === 'PUT' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const result = await setPropertyVisibility(db, { id: body.id, ids: body.ids, visible: body.visible });
      if (!result.ok) return cors(NextResponse.json(result, { status: 400 }));
      return cors(NextResponse.json(result));
    }

    // Admin: forhåndsvis lead-e-poster i nettleser (uten å sende noe).
    // ?type=receipt|notify — valgfritt ?id=<lead-id> for ekte data, ellers eksempel.
    if (route === '/admin/leads/email-preview' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const type = (sp.get('type') || 'receipt').toLowerCase();
      const leadId = (sp.get('id') || '').slice(0, 64);
      let lead = null;
      if (leadId) lead = await db.collection('leads').findOne({ id: leadId }, { projection: { _id: 0 } });
      if (!lead) {
        lead = {
          name: 'Kari Eksempel', email: 'kari@example.com', phone: '+47 912 34 567',
          address: 'Olaf Ryes vei 11C', postal_code: '5007', property_type: 'leilighet',
          bedrooms: 2, sqm: 65, lead_type: 'huseier', source: 'nettside',
          lead_source_type: 'paid', createdAt: new Date().toISOString(),
          matrikkel_number: '4601-164/445', bygningstype: 'sameie',
          registry_owner_name: 'Eksempel Eiendom AS', registry_orgnr: '999 888 777',
          units: [{ rental_model: 'langtid' }],
          notes: 'Ønsket modell: langtid. Matrikkel: 4601-164/445, Type: sameie, Hjemmelshaver: Eksempel Eiendom AS. Delvis møblert — hvitevarer følger med',
          attribution: {
            source: 'google', medium: 'cpc', campaign: 'DigiHome Søk — Utleie Bergen',
            content: 'RSA Forvaltning v2', term: 'utleiemegler bergen', channel: 'Betalt',
            gclid: 'EksempelGclid1234567890', landing_page: '/lp/forvaltning', referrer: 'https://www.google.com/',
          },
        };
      }
      const built = type === 'notify' ? buildLeadAdminNotification(lead) : buildLeadReceipt(lead);
      return new NextResponse(built.html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
    }

    // ===================================================================
    // KPI-dashbord ("Nøkkeltall / Ledelse") — investorklare nøkkeltall.
    // ===================================================================
    if (route === '/admin/kpi/settings' && (method === 'GET')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const settings = await getKpiSettings(db);
      return cors(NextResponse.json({ ok: true, settings }));
    }
    if (route === '/admin/kpi/settings' && (method === 'PUT' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const settings = await setKpiSettings(db, body);
      return cors(NextResponse.json({ ok: true, settings }));
    }
    if (route === '/admin/kpi' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const from = (sp.get('from') || '').trim();
      const to = (sp.get('to') || '').trim();
      const days = Number(sp.get('days')) || 30;
      try {
        const data = await computeKpiDashboard(db, from && to ? { from, to } : { days });
        return cors(NextResponse.json(data));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    // API-FORBRUK — samlet kostnadspanel: LLM (self-metering, per modell/
    // funksjon m/ drilldown), eksterne tjenester (egen telling) og
    // plattform-prosjektets /api/usage/external (polles m/ 10 min cache).
    // Modellbytte per funksjon: PUT /admin/usage/llm/model {feature, model}.
    // ═══════════════════════════════════════════════════════════════════
    if (route === '/admin/usage/api' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const days = Math.max(1, Math.min(365, Number(sp.get('days')) || 30));

      try {
        const [llm, ext, overrides, platform] = await Promise.all([
          computeLlmUsageDashboard(db, days),
          summarizeExtUsage(db, days),
          getModelOverrides(db),
          getPlatformUsage(db, { fresh: !!sp.get('fresh') }), // 10 min DB-cache i lib
        ]);
        // Plattform-modellstyring: status per funksjon utledes kronologisk fra
        // broens 'model-control'-tråd (request → pending, applied/rejected → svar).
        const platformControl = {};
        try {
          const ctrlMsgs = await db.collection('agent_bridge')
            .find({ threadId: 'model-control' }, { projection: { _id: 0, type: 1, data: 1, createdAt: 1 } })
            .sort({ createdAt: 1 }).limit(500).toArray();
          for (const m of ctrlMsgs) {
            const kind = (m.type === 'model_override_request' || m.data?.kind === 'model_override_request') ? 'request'
              : (m.type === 'model_override_applied' || m.data?.kind === 'model_override_applied') ? 'applied'
              : (m.type === 'model_override_rejected' || m.data?.kind === 'model_override_rejected') ? 'rejected' : null;
            const f = m.data?.feature;
            if (!kind || !f) continue;
            if (kind === 'request') platformControl[f] = { model: m.data.model || '', status: 'pending', requestedAt: m.createdAt };
            else if (kind === 'applied') platformControl[f] = { ...(platformControl[f] || {}), model: m.data.model || platformControl[f]?.model || '', status: 'applied', appliedAt: m.createdAt };
            else platformControl[f] = { ...(platformControl[f] || {}), status: 'rejected', reason: String(m.data?.reason || '').slice(0, 200), rejectedAt: m.createdAt };
          }
        } catch (_) { /* broen er valgfri — tåler feil stille */ }
        return cors(NextResponse.json({
          ok: true, days, llm, ext, platform, overrides,
          models: AVAILABLE_MODELS, defaultModel: DEFAULT_MODEL, usdToNok: USD_TO_NOK,
          platformControl, platformModels: PLATFORM_MODELS,
          generatedAt: new Date().toISOString(),
        }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }
    if (route === '/admin/usage/llm/model' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const feature = String(body.feature || '').trim().slice(0, 60);
      const model = String(body.model || '').trim().slice(0, 60);
      if (!feature) return cors(NextResponse.json({ ok: false, error: 'Mangler feature' }, { status: 400 }));

      // ---- Plattform-scope: send styringsforespørsel over Agent-broen ------
      // Plattform-CRM-et eier sine egne modellvalg; vi legger en
      // model_override_request i broen (thread 'model-control') som
      // plattform-agenten plukker opp, anvender og kvitterer på.
      if (body.scope === 'platform') {
        if (!model || !/^[a-z0-9.\-]{2,60}$/i.test(model)) {
          return cors(NextResponse.json({ ok: false, error: 'Ugyldig modellnavn' }, { status: 400 }));
        }
        const msg = {
          id: uuidv4(),
          threadId: 'model-control',
          from: 'marketing',
          type: 'model_override_request',
          subject: `Modellbytte: ${feature} → ${model}`,
          body: `Landingsside-admin ber plattformen bytte LLM-modell for funksjonen «${feature}» til «${model}». Når endringen er aktiv: POST tilbake på broen med threadId 'model-control', type 'model_override_applied' og data { "feature": "${feature}", "model": "${model}" }. Hvis modellen ikke støttes: svar med type 'model_override_rejected' og data { "feature": "${feature}", "model": "${model}", "reason": "…" }. Full protokoll: thread 'integration-contract'.`,
          data: { kind: 'model_override_request', feature, model, requestedBy: 'landingsside-admin' },
          author: 'landingsside-admin',
          createdAt: new Date().toISOString(),
        };
        await db.collection('agent_bridge').insertOne({ ...msg });
        return cors(NextResponse.json({ ok: true, scope: 'platform', request: { feature, model, status: 'pending', requestedAt: msg.createdAt } }, { status: 201 }));
      }

      if (model && !AVAILABLE_MODELS.some((m) => m.id === model)) {
        return cors(NextResponse.json({ ok: false, error: `Ukjent modell: ${model}` }, { status: 400 }));
      }
      await setModelOverride(db, feature, model || null);
      const overrides = await getModelOverrides(db);
      return cors(NextResponse.json({ ok: true, feature, model: model || null, defaultModel: DEFAULT_MODEL, overrides }));
    }

    // ═══════════════════════════════════════════════════════════════════
    // ØKONOMI — Resultat (P&L) + Likviditet + kostnader/kontrakter/engangsposter
    // Auth: admin (?key=). Alle beløp NOK eks. mva.
    // ═══════════════════════════════════════════════════════════════════
    if (route.startsWith('/admin/finance')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = route.slice('/admin/finance'.length); // '' | '/resultat' | '/likviditet' | ...
      let fbody = {};
      if (method === 'POST' || method === 'DELETE') { try { fbody = await request.json(); } catch (_) { fbody = {}; } }
      try {
        if (sub === '/resultat' && method === 'GET') return cors(NextResponse.json(await computeResultat(db)));
        if (sub === '/likviditet' && method === 'GET') {
          const months = Number(new URL(request.url).searchParams.get('months')) || 12;
          return cors(NextResponse.json(await computeLikviditet(db, { months })));
        }
        if (sub === '/overview' && method === 'GET') return cors(NextResponse.json(await computeFinanceOverview(db)));
        if (sub === '/trends' && method === 'GET') {
          const months = Number(new URL(request.url).searchParams.get('months')) || 12;
          return cors(NextResponse.json(await computeTrends(db, { months })));
        }
        if (sub === '/investor' && method === 'GET') {
          const horizon = Number(new URL(request.url).searchParams.get('horizon')) || 12;
          return cors(NextResponse.json(await computeInvestorMetrics(db, { horizon })));
        }
        if (sub === '/forecast' && method === 'GET') {
          const sp = new URL(request.url).searchParams;
          const months = Number(sp.get('months')) || 18;
          const assumptions = {};
          for (const k of ['newContractsPerMonth', 'avgRentPerNewContract', 'avgFeePercent', 'monthlyChurnPct', 'opexGrowthPct', 'cacPerContract', 'rampMonths', 'grossMarginPct']) {
            const v = sp.get(k);
            if (v != null && v !== '') assumptions[k] = Number(v);
          }
          return cors(NextResponse.json(await computeForecast(db, { months, assumptions })));
        }
        if (sub === '/board-pack' && method === 'GET') return cors(NextResponse.json(await computeBoardPack(db)));
        if (sub === '/customers' && method === 'GET') {
          // Foretrekk plattformens dedikerte kunde-eksport (rikere data);
          // fall tilbake til kontrakts-avledning hvis ingen synk er kjørt.
          const forceSrc = new URL(request.url).searchParams.get('source');
          if (forceSrc !== 'contracts') {
            try {
              const plat = await computePlatformCustomers(db);
              if (plat) return cors(NextResponse.json(plat));
            } catch (e) { /* fall gjennom til kontrakts-avledning */ }
          }
          return cors(NextResponse.json(await computeCustomers(db)));
        }
        if (sub === '/sync-contracts' && method === 'POST') {
          const target = digiHomeTarget();
          const result = await syncContractsFromPlatform(db, { target: target.url, key: target.key });
          return cors(NextResponse.json({ ...result, platformEnv: target.env, platformUrl: target.url }));
        }
        // Synk KUNDER fra plattformens /api/customers/export (LIVE hos plattformteamet).
        if (sub === '/sync-customers' && method === 'POST') {
          const target = digiHomeTarget();
          const result = await syncCustomersFromPlatform(db, { target: target.url, key: target.key });
          return cors(NextResponse.json({ ...result, platformEnv: target.env, platformUrl: target.url }));
        }

        if (sub === '/settings' && method === 'GET') return cors(NextResponse.json({ ok: true, settings: await getFinanceSettings(db) }));
        if (sub === '/settings' && method === 'POST') return cors(NextResponse.json({ ok: true, settings: await setFinanceSettings(db, fbody) }));

        if (sub === '/costs' && method === 'GET') return cors(NextResponse.json({ ok: true, costs: await listCosts(db) }));
        if (sub === '/costs' && method === 'POST') return cors(NextResponse.json({ ok: true, cost: await upsertCost(db, fbody) }));
        if (sub === '/costs' && method === 'DELETE') { await deleteCost(db, fbody.id); return cors(NextResponse.json({ ok: true })); }

        if (sub === '/contracts' && method === 'GET') return cors(NextResponse.json({ ok: true, contracts: await listContracts(db) }));
        if (sub === '/contracts' && method === 'POST') return cors(NextResponse.json({ ok: true, contract: await upsertContract(db, fbody) }));
        if (sub === '/contracts' && method === 'DELETE') { await deleteContract(db, fbody.id); return cors(NextResponse.json({ ok: true })); }

        if (sub === '/events' && method === 'GET') return cors(NextResponse.json({ ok: true, events: await listEvents(db) }));
        if (sub === '/events' && method === 'POST') return cors(NextResponse.json({ ok: true, event: await upsertEvent(db, fbody) }));
        if (sub === '/events' && method === 'DELETE') { await deleteEvent(db, fbody.id); return cors(NextResponse.json({ ok: true })); }
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
      return cors(NextResponse.json({ ok: false, error: 'Ukjent økonomi-endepunkt' }, { status: 404 }));
    }

    // --- Budstrategi: Maximize Clicks med CPC-tak (bytter fra Manual CPC / Max Conv) ---
    if (route === '/admin/ads/campaign/bidding' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const { campaignId, cpcCeiling, validateOnly } = body;
      if (!campaignId || !(Number(cpcCeiling) > 0)) return cors(NextResponse.json({ ok: false, error: 'campaignId og cpcCeiling (NOK) kreves' }, { status: 400 }));
      try {
        const out = await setCampaignMaximizeClicks(undefined, campaignId, Number(cpcCeiling), { validateOnly: validateOnly === true });
        return cors(NextResponse.json(out));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // --- RSA meldings-oppdatering: «24 timer» → «umiddelbart» + prisforankring ---
    // RSA-er er immutable: vi oppretter ny annonse med oppdatert tekst og pauser den gamle.
    if (route === '/admin/ads/update-messaging' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const dryRun = body.dryRun !== false; // default: dry-run (trygt)
      const transform = (t) => t
        .replace(/svar innen 24 ?t(?:imer)?\b/gi, 'Svar umiddelbart')
        .replace(/\binnen 24 ?t(?:imer)?\b/gi, 'umiddelbart')
        .replace(/\bpå 24 ?t(?:imer)?\b/gi, 'umiddelbart')
        .replace(/\b24 ?timer\b/gi, 'umiddelbart')
        .replace(/\b24 ?t\b/gi, 'umiddelbart');
      try {
        const rsas = await listRsaAds(undefined, { campaignId: body.campaignId });
        const results = [];
        for (const ad of rsas) {
          if (ad.status !== 'ENABLED') continue;
          let changed = false;
          // Titler: transformér (maks 30 tegn — fall tilbake til kort variant), dedupe
          const seenH = new Set();
          const headlines = [];
          for (const h of ad.headlines) {
            let txt = transform(h.text);
            if (txt !== h.text) { changed = true; if (txt.length > 30) txt = 'Svar umiddelbart'; }
            const key = txt.toLowerCase();
            if (seenH.has(key)) { changed = true; continue; }
            seenH.add(key);
            headlines.push({ ...h, text: txt });
          }
          // Prisforankring + umiddelbarhet hvis plass (RSA maks 15 titler)
          const joined = headlines.map((h) => h.text.toLowerCase()).join(' | ');
          if (!joined.includes('0 kr oppstart') && headlines.length < 15) { headlines.push({ text: '0 kr oppstart – ingen binding' }); changed = true; }
          if (!joined.includes('umiddelbart') && headlines.length < 15) { headlines.push({ text: 'Svar umiddelbart' }); changed = true; }
          // Beskrivelser: transformér (maks 90 tegn — behold original hvis for lang), dedupe
          const seenD = new Set();
          const descriptions = [];
          for (const d of ad.descriptions) {
            let txt = transform(d.text);
            if (txt !== d.text) { if (txt.length > 90) txt = d.text; else changed = true; }
            const key = txt.toLowerCase();
            if (seenD.has(key)) { changed = true; continue; }
            seenD.add(key);
            descriptions.push({ ...d, text: txt });
          }
          if (!changed) { results.push({ adGroup: ad.adGroupName, campaign: ad.campaignName, changed: false }); continue; }
          const entry = {
            adGroup: ad.adGroupName, campaign: ad.campaignName, changed: true,
            newHeadlines: headlines.map((h) => h.text), newDescriptions: descriptions.map((d) => d.text),
          };
          if (!dryRun) {
            try {
              const created = await createRsaAd(undefined, {
                adGroupId: ad.adGroupId, headlines, descriptions,
                finalUrls: ad.finalUrls, path1: ad.path1, path2: ad.path2,
              });
              entry.createdAd = created.resourceName;
              const paused = await setAdStatus(undefined, ad.adResourceName, 'PAUSED');
              entry.pausedOldAd = paused.resourceName;
            } catch (e) { entry.error = e.message; }
          }
          results.push(entry);
        }
        return cors(NextResponse.json({ ok: true, dryRun, totalAds: rsas.length, results }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // --- Konkurrentens faktiske annonser (SerpApi → Google Ads Transparency Center) ---
    // Kvote-bevisst: 7 dagers server-cache; force=1 tvinger ny henting (bruker 1–3 søk).
    if (route === '/admin/ads/competitor-gallery' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const gsp = new URL(request.url).searchParams;
      const competitor = (gsp.get('competitor') || 'Utleiemegleren').trim();
      const force = gsp.get('force') === '1';
      if (!serpApiConfigured()) {
        return cors(NextResponse.json({ ok: false, configured: false, error: 'SERPAPI_KEY mangler i miljøvariablene.' }, { status: 200 }));
      }
      try {
        const out = await fetchCompetitorGallery(db, { competitor, force });
        return cors(NextResponse.json(out));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, configured: true, error: e.message }, { status: 200 }));
      }
    }

    // --- Budsjett-pacing: forbruk måned-til-dato vs. månedsbudsjett per kanal ---
    if (route === '/admin/ads/pacing' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const r2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
        const cfgDoc = (await db.collection('ads_optimization_config').findOne({ key: 'pacing' })) || {};
        const budgets = { google: Number(cfgDoc.monthlyBudgetGoogle) || 0, meta: Number(cfgDoc.monthlyBudgetMeta) || 0 };
        const now = new Date();
        const y = now.getUTCFullYear(), mo = now.getUTCMonth();
        const monthStart = `${y}-${String(mo + 1).padStart(2, '0')}-01`;
        const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
        const dayOfMonth = now.getUTCDate();
        const daysRemaining = Math.max(0, daysInMonth - dayOfMonth);
        let gSeries = [], mSeries = [];
        if (composioConfigured()) { try { const r = await getCachedReport(db, 'last_90d'); gSeries = (r.report && r.report.series) || []; } catch (e) {} }
        if (metaAdsConfigured()) { try { const r = await getCachedMetaReport(db, 'last_90d'); mSeries = (r.snap && r.snap.series) || []; } catch (e) {} }
        const today = now.toISOString().slice(0, 10);
        const calc = (series, budget) => {
          const mtd = series.filter((d) => d && d.date >= monthStart && d.date <= today)
            .reduce((s, d) => s + (Number(d.cost) || 0), 0);
          const last7 = series.filter((d) => d && d.date).slice(-7);
          const avg7 = last7.length ? last7.reduce((s, d) => s + (Number(d.cost) || 0), 0) / last7.length : 0;
          const projected = mtd + avg7 * daysRemaining;
          return {
            mtd: r2(mtd), avg7: r2(avg7), projected: r2(projected), budget: r2(budget),
            spentPct: budget > 0 ? Math.round((mtd / budget) * 100) : null,
            pacePct: budget > 0 ? Math.round((projected / budget) * 100) : null,
          };
        };
        const google = calc(gSeries, budgets.google);
        const meta = calc(mSeries, budgets.meta);
        const totalBudget = budgets.google + budgets.meta;
        const total = {
          mtd: r2(google.mtd + meta.mtd), avg7: r2(google.avg7 + meta.avg7),
          projected: r2(google.projected + meta.projected), budget: r2(totalBudget),
          spentPct: totalBudget > 0 ? Math.round(((google.mtd + meta.mtd) / totalBudget) * 100) : null,
          pacePct: totalBudget > 0 ? Math.round(((google.projected + meta.projected) / totalBudget) * 100) : null,
        };
        return cors(NextResponse.json({
          ok: true, month: monthStart.slice(0, 7), dayOfMonth, daysInMonth, daysRemaining,
          channels: { google, meta, total },
          googleConfigured: composioConfigured(), metaConfigured: metaAdsConfigured(),
        }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    if (route === '/admin/ads/pacing' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const patch = { key: 'pacing' };
      if (body.monthlyBudgetGoogle !== undefined) patch.monthlyBudgetGoogle = Math.max(0, Number(body.monthlyBudgetGoogle) || 0);
      if (body.monthlyBudgetMeta !== undefined) patch.monthlyBudgetMeta = Math.max(0, Number(body.monthlyBudgetMeta) || 0);
      await db.collection('ads_optimization_config').updateOne({ key: 'pacing' }, { $set: patch }, { upsert: true });
      return cors(NextResponse.json({ ok: true, budgets: { google: patch.monthlyBudgetGoogle, meta: patch.monthlyBudgetMeta } }));
    }

    // --- Annonse-varsler (anomali-motoren i ads-monitor.js) for admin-UI ---
    if (route === '/admin/ads/alerts' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const out = await computeAdsAlertsData(db);
        return cors(NextResponse.json({ ok: true, ...out }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    if (route === '/admin/ads/table' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const googlePeriod = GOOGLE_PERIODS.includes(searchParams.get('googlePeriod')) ? searchParams.get('googlePeriod') : 'last_30d';
      const metaPeriod = META_PERIODS.includes(searchParams.get('metaPeriod')) ? searchParams.get('metaPeriod') : 'last_30d';
      const refresh = ['1', 'true'].includes(String(searchParams.get('refresh')));
      const googleTask = (async () => {
        if (!googleAdsNativeConfigured()) return { ads: [], configured: false };
        try { const range = metaPeriodToRange(googlePeriod); const r = await runAdsWithMetrics({ since: range.periodFrom, until: range.periodTo }); return { ads: r.ads, configured: true, from: r.from, to: r.to }; }
        catch (e) { return { ads: [], configured: true, error: e.message }; }
      })();
      const metaTask = (async () => {
        if (!metaAdsConfigured()) return { ads: [], configured: false };
        try { const r = await getCachedMetaAdsTable(db, metaPeriod, { force: refresh }); return { ads: r.ads, configured: true, fetchedAt: r.fetchedAt, stale: !!r.stale }; }
        catch (e) { return { ads: [], configured: true, error: e.message }; }
      })();
      const [g, m] = await Promise.all([googleTask, metaTask]);
      const ads = [...(g.ads || []), ...(m.ads || [])];
      return cors(NextResponse.json({
        ok: true, ads,
        google: { configured: g.configured, error: g.error || null, from: g.from || null, to: g.to || null },
        meta: { configured: m.configured, error: m.error || null, fetchedAt: m.fetchedAt || null, stale: !!m.stale },
        googlePeriod, metaPeriod,
      }));
    }

    // ===================================================================
    // MARKEDSDATA for plattformens ukentlige management-rapport.
    // Plattformen eier rapporten (CRM-sannhet) og HENTER annonse-/lead-data
    // herfra. Auth: admin (?key=) ELLER delt bro-token (x-bridge-token / ?token=).
    // Param: ?days=7 (1–90). Returnerer stabil, maskinlesbar JSON.
    // ===================================================================
    if (route === '/admin/marketing-metrics' && method === 'GET') {
      if (!bridgeAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      let days = parseInt(sp.get('days') || '', 10);
      if (!Number.isFinite(days)) {
        const p = sp.get('period') || '';
        days = p === 'last_30d' ? 30 : p === 'last_90d' ? 90 : 7;
      }
      const from = (sp.get('from') || '').match(/^\d{4}-\d{2}-\d{2}$/) ? sp.get('from') : undefined;
      const to = (sp.get('to') || '').match(/^\d{4}-\d{2}-\d{2}$/) ? sp.get('to') : undefined;
      try {
        const metrics = await buildMarketingMetrics(db, { days, from, to });
        return cors(NextResponse.json({ ok: true, source: 'digihome-marketing', ...metrics }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase B: Anbefalinger (regelmotor over fersk data).
    if (route === '/admin/ads/recommendations' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const period = GOOGLE_PERIODS.includes(searchParams.get('period')) ? searchParams.get('period') : 'last_30d';
      try {
        const range = metaPeriodToRange(period);
        const gOn = googleAdsNativeConfigured(), mOn = metaAdsConfigured();
        const [googleAds, searchTerms, keywords, campaigns, metaAds] = await Promise.all([
          gOn ? runAdsWithMetrics({ since: range.periodFrom, until: range.periodTo }).then((r) => r.ads).catch(() => []) : [],
          gOn ? runSearchTerms({ since: range.periodFrom, until: range.periodTo }).catch(() => []) : [],
          gOn ? runKeywordMetrics({ since: range.periodFrom, until: range.periodTo }).catch(() => []) : [],
          gOn ? listCampaignsDetailed().catch(() => []) : [],
          mOn ? getCachedMetaAdsTable(db, period, {}).then((r) => r.ads).catch(() => []) : [],
        ]);
        const cfg = await getOptimizeConfig(db);
        const recommendations = buildRecommendations({ googleAds, searchTerms, keywords, metaAds, campaigns, config: cfg });
        const counts = recommendations.reduce((mm, r) => { mm[r.type] = (mm[r.type] || 0) + 1; return mm; }, {});
        const estimatedSavings = Math.round(recommendations.reduce((s, r) => s + (r.estimatedSaving || 0), 0) * 100) / 100;
        return cors(NextResponse.json({ ok: true, recommendations, counts, estimatedSavings, period, searchTermsCount: searchTerms.length }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase B: Bruk én anbefaling (menneske-godkjent).
    if (route === '/admin/ads/recommendations/apply' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const rec = body.recommendation || body.rec || (body.action ? body : null);
      if (!rec || !rec.action || !rec.action.kind) return cors(NextResponse.json({ ok: false, error: 'Mangler recommendation/action' }, { status: 400 }));
      try {
        const res = await applyRecommendation(rec, {});
        await db.collection('ads_applied_actions').insertOne({ id: uuidv4(), at: new Date().toISOString(), recId: rec.id || null, type: rec.type || null, action: rec.action, result: { ok: !!res.ok, error: res.error || null }, by: 'admin' });
        return cors(NextResponse.json({ ok: !!res.ok, result: res, error: res.ok ? null : (res.error || 'Handling feilet') }, { status: 200 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase C: Keyword research (nye søkeordideer m/ volum/konkurranse).
    if (route === '/admin/ads/keyword-research' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Native Google Ads API er ikke konfigurert' }, { status: 400 }));
      const { searchParams } = new URL(request.url);
      const seeds = (searchParams.get('seeds') || '').split(',').map((s) => s.trim()).filter(Boolean);
      const url = (searchParams.get('url') || '').trim();
      try {
        const ideas = await generateKeywordIdeas({ seeds: seeds.length ? seeds : ['leie ut bolig bergen', 'utleie bergen', 'eiendomsforvaltning bergen'], url: url || undefined });
        return cors(NextResponse.json({ ok: true, ideas, count: ideas.length }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase C: AI-genererte annonsetekster (RSA eller Meta).
    if (route === '/admin/ads/ai/generate' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const kind = body.kind === 'meta' ? 'meta' : 'rsa';
      const theme = (body.theme || 'Utleie i Bergen').toString().slice(0, 120);
      try {
        if (kind === 'meta') { const r = await generateMetaCopy({ theme }); return cors(NextResponse.json({ ok: true, kind: 'meta', ...r })); }
        const r = await generateRsaCopy({ theme, examples: Array.isArray(body.examples) ? body.examples : [] });
        return cors(NextResponse.json({ ok: true, kind: 'rsa', ...r }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Fase B/C/D: Kjør optimalisering nå (dryRun=true som standard → ingen mutasjon).
    if (route === '/admin/ads/optimize/run' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const mode = body.mode === 'daily' ? 'daily' : 'weekly';
      const dryRun = body.dryRun !== false; // default: trygg (ingen auto-apply)
      try { const run = await runOptimization(db, { mode, dryRun }); return cors(NextResponse.json({ ok: true, run })); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // Fase B/C: Siste kjøring + historikk + konfig.
    if (route === '/admin/ads/optimize/last' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const [run, runs, config] = await Promise.all([getLastRun(db), listRuns(db, 10), getOptimizeConfig(db)]);
      return cors(NextResponse.json({ ok: true, run: run || null, runs, config }));
    }

    // Fase D: Oppdater optimaliserings-konfig (terskler + auto-apply-vakter).
    if (route === '/admin/ads/optimize/config' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const patch = body.config || body || {};
      delete patch.key; delete patch._id;
      try { const config = await setOptimizeConfig(db, patch); return cors(NextResponse.json({ ok: true, config })); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // Ukentlig management-rapport: send nå (test/manuell) til mottakere.
    if (route === '/admin/ads/report/send' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!emailConfigured()) return cors(NextResponse.json({ ok: false, error: 'SendGrid er ikke konfigurert (SENDGRID_API_KEY mangler)' }, { status: 400 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const recipients = Array.isArray(body.recipients) && body.recipients.length ? body.recipients : reportRecipients();
      try { const r = await sendWeeklyReport(db, { recipients }); return cors(NextResponse.json(r, { status: r.ok ? 200 : 400 })); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // Forhåndsvisning av rapport-HTML (vises i admin).
    if (route === '/admin/ads/report/preview' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const data = await buildReportData(db, {});
        return cors(new NextResponse(renderReportHtml(data), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // Fase D: Sikret cron-endepunkt (ekstern planlegger, ukentlig/daglig).
    if (route === '/cron/ads-optimize' && (method === 'GET' || method === 'POST')) {
      const sp = new URL(request.url).searchParams;
      const token = sp.get('token') || request.headers.get('x-cron-token') || '';
      const cronSecret = (process.env.ADS_CRON_SECRET || '').trim();
      const okAuth = (cronSecret && token === cronSecret) || (ADMIN_KEY && token === ADMIN_KEY);
      if (!okAuth) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const mode = sp.get('mode') === 'daily' ? 'daily' : 'weekly';
      try {
        const run = await runOptimization(db, { mode, dryRun: false });
        let report = null;
        if (mode === 'weekly' && emailConfigured() && sp.get('email') !== '0') {
          try { report = await sendWeeklyReport(db, {}); } catch (e) { report = { ok: false, error: e.message }; }
        }
        // Kritiske annonse-varsler → e-post (throttlet: maks 1 e-post per varsel-id per 24t).
        let alertsInfo = null;
        try {
          const ad = await computeAdsAlertsData(db);
          const high = (ad.alerts || []).filter((a) => a.severity === 'high');
          alertsInfo = { total: (ad.alerts || []).length, high: high.length, emailed: false };
          const recipients = reportRecipients();
          if (high.length && emailConfigured() && recipients.length && sp.get('email') !== '0') {
            const stateColl = db.collection('ads_optimization_config');
            const state = (await stateColl.findOne({ key: 'alerts_email_state' })) || {};
            const sent = state.sent || {};
            const nowMs = Date.now();
            const fresh = high.filter((a) => !sent[a.id] || (nowMs - new Date(sent[a.id]).getTime()) > 24 * 3600 * 1000);
            if (fresh.length) {
              const rows = fresh.map((a) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #eee;"><strong style="color:#b91c1c;">${a.title}</strong><br/><span style="color:#555;font-size:13px;">${a.detail || ''}</span></td></tr>`).join('');
              const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;"><h2 style="color:#0a0a0a;">⚠️ Kritiske annonse-varsler</h2><p style="color:#555;">Anomali-motoren fant ${fresh.length} kritiske varsler (${ad.window.current.from} – ${ad.window.current.to}):</p><table style="width:100%;border-collapse:collapse;background:#fafafa;border-radius:8px;">${rows}</table><p style="color:#999;font-size:12px;margin-top:16px;">Se detaljer i adminpanelet → Annonser. Denne e-posten sendes maks én gang per varsel per døgn.</p></div>`;
              try {
                await sendHtmlEmail({ to: recipients, subject: `⚠️ DigiHome annonse-varsel: ${fresh[0].title}`, html });
                for (const a of fresh) sent[a.id] = new Date().toISOString();
                await stateColl.updateOne({ key: 'alerts_email_state' }, { $set: { key: 'alerts_email_state', sent } }, { upsert: true });
                alertsInfo.emailed = true;
                alertsInfo.emailedCount = fresh.length;
              } catch (e) { alertsInfo.emailError = e.message; }
            }
          }
        } catch (e) { alertsInfo = { error: e.message }; }
        return cors(NextResponse.json({ ok: true, mode, summary: run.summary, autoApplied: run.autoApplied, report, alerts: alertsInfo }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    // Durabel re-forward-kø: kjør ventende (ikke-videresendte) leads/tenants som
    // er «due» iht. backoff. Ekstern planlegger kaller denne f.eks. hvert 5.–15. min.
    if (route === '/cron/reforward-leads' && (method === 'GET' || method === 'POST')) {
      const sp = new URL(request.url).searchParams;
      const token = sp.get('token') || request.headers.get('x-cron-token') || '';
      const cronSecret = (process.env.ADS_CRON_SECRET || '').trim();
      const okAuth = (cronSecret && token === cronSecret) || (ADMIN_KEY && token === ADMIN_KEY);
      if (!okAuth) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const results = await reforwardPending(db);
        return cors(NextResponse.json({ ok: true, ...results }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    // plattform-prosjektet. Auth: admin (?key=) ELLER ?token=AGENT_BRIDGE_SECRET
    // (header x-bridge-token). Lagres i collection agent_bridge.
    // ===================================================================
    if (route === '/agent-bridge' && method === 'GET') {
      if (!bridgeAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const q = {};
      const thread = (sp.get('thread') || '').trim();
      if (thread) q.threadId = thread;
      const since = (sp.get('since') || '').trim();
      if (since) q.createdAt = { $gt: since };
      const messages = await db.collection('agent_bridge').find(q, { projection: { _id: 0 } }).sort({ createdAt: 1 }).limit(500).toArray();
      const threads = await db.collection('agent_bridge').distinct('threadId');
      return cors(NextResponse.json({ ok: true, messages, threads, count: messages.length }));
    }
    if (route === '/agent-bridge' && method === 'POST') {
      if (!bridgeAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const fromRaw = (body.from || body.sender || '').toString();
      const from = ['marketing', 'platform'].includes(fromRaw) ? fromRaw : 'platform';
      const type = ['brief', 'status', 'question', 'answer', 'note', 'proposal', 'spec', 'ack', 'test', 'model_override_request', 'model_override_applied', 'model_override_rejected'].includes(body.type) ? body.type : 'note';
      const subject = (body.subject || body.title || '').toString().slice(0, 200);
      const text = (body.body || body.message || body.text || body.content || '').toString().slice(0, 20000);
      if (!subject && !text) return cors(NextResponse.json({ ok: false, error: 'Mangler subject/body' }, { status: 400 }));
      const doc = {
        id: uuidv4(),
        threadId: (body.threadId || body.thread || body.thread_id || 'closed-loop').toString().slice(0, 80),
        from, type, subject, body: text,
        data: (body.data && typeof body.data === 'object') ? body.data : null,
        author: (body.author || '').toString().slice(0, 80) || null,
        createdAt: new Date().toISOString(),
      };
      await db.collection('agent_bridge').insertOne({ ...doc });
      return cors(NextResponse.json({ ok: true, message: doc }, { status: 201 }));
    }

    // --- Audiences: suppression + lookalike/customer-match seed (won-kunder) ---
    // SHA-256-hashede (normaliserte) kontakter, klare for Meta Custom Audience
    // (eksklusjon + Lookalike) og Google Customer Match. KUN samtykkede kontakter.
    // Formål: slutt å annonsere til allerede signerte kunder → kutt bortkastet forbruk.
    if (route === '/admin/audiences/suppression' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const format = (sp.get('format') || 'json').toLowerCase();
      const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
      const normEmail = (e) => (e || '').toString().trim().toLowerCase();
      const normPhone = (p) => { let d = (p || '').toString().replace(/\D/g, ''); if (d.length === 8) d = '47' + d; return d; };
      const rows = [];
      let considered = 0, skippedConsent = 0;
      for (const c of ['leads', 'tenant_leads']) {
        const wons = await db.collection(c).find({ status: 'won' }, { projection: { _id: 0, email: 1, phone: 1, marketingConsent: 1, wonValue: 1 } }).limit(50000).toArray();
        for (const w of wons) {
          considered++;
          if (!marketingAllowed(w.marketingConsent)) { skippedConsent++; continue; }
          const email = normEmail(w.email);
          const phone = normPhone(w.phone);
          if (!email && !phone) continue;
          rows.push({
            email_sha256: email ? sha256(email) : null,
            phone_sha256: phone ? sha256(phone) : null,
            value: w.wonValue || null,
          });
        }
      }
      if (format === 'csv') {
        const header = 'email_sha256,phone_sha256';
        const lines = rows.map((r) => `${r.email_sha256 || ''},${r.phone_sha256 || ''}`);
        return new NextResponse([header, ...lines].join('\n'), {
          status: 200,
          headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="digihome-won-audience.csv"', 'Access-Control-Allow-Origin': '*' },
        });
      }
      return cors(NextResponse.json({
        ok: true,
        generatedAt: new Date().toISOString(),
        purpose: 'Meta Custom Audience (eksklusjon + Lookalike-seed) & Google Customer Match. Hash = SHA-256 av normalisert e-post (lowercase/trim) og telefon (E.164 uten +, NO=47+8 siffer).',
        count: rows.length,
        considered, skippedConsent,
        audience: rows,
      }));
    }

    // --- Admin: Annonser — Google Ads via Composio: synk live kostnad ------
    if (route === '/admin/ads/google-sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!composioConfigured()) return cors(NextResponse.json({ ok: false, error: 'Google Ads er ikke konfigurert' }, { status: 400 }));
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
        return cors(NextResponse.json({ ok: false, error: e.message || 'Google Ads-synk feilet' }, { status: 200 }));
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
    // --- Puls: lette sanntidstall til admin-toppbaren (alltid synlig) ---
    if (route === '/admin/playbook' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        // Fil er kilden i dev; DB er fallback i produksjon (standalone-build sporer ikke docs/).
        let markdown = null, updatedAt = null, source = 'db';
        try {
          const p = nodePath.join(process.cwd(), 'docs', 'MARKETING_PLAYBOOK.md');
          markdown = await fsp.readFile(p, 'utf8');
          const st = await fsp.stat(p);
          updatedAt = st.mtime.toISOString();
          source = 'fil';
          await db.collection('documents').updateOne({ id: 'marketing-playbook' }, { $set: { id: 'marketing-playbook', markdown, updatedAt } }, { upsert: true });
        } catch (_) {
          const doc = await db.collection('documents').findOne({ id: 'marketing-playbook' });
          if (doc) { markdown = doc.markdown; updatedAt = doc.updatedAt; }
        }
        if (!markdown) return cors(NextResponse.json({ ok: false, error: 'Playbook ikke funnet' }, { status: 404 }));
        return cors(NextResponse.json({ ok: true, markdown, updatedAt, source }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }

    if (route === '/admin/pulse' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const today = new Date().toISOString().slice(0, 10);
        const dayStartIso = `${today}T00:00:00.000Z`;
        const [sessionsAgg, leadsToday, tenantsToday, pendingLeads, pendingTenants, platMrr] = await Promise.all([
          db.collection('events').aggregate([
            { $match: { day: today, sessionId: { $nin: [null, ''] } } },
            { $group: { _id: '$sessionId' } },
            { $count: 'n' },
          ]).toArray(),
          db.collection('leads').countDocuments({ createdAt: { $gte: dayStartIso } }),
          db.collection('tenant_leads').countDocuments({ createdAt: { $gte: dayStartIso } }),
          db.collection('leads').countDocuments({ forwarded: { $ne: true } }),
          db.collection('tenant_leads').countDocuments({ forwarded: { $ne: true } }),
          db.collection('platform_customers').aggregate([
            { $match: { status: { $ne: 'churned' } } },
            { $group: { _id: null, mrr: { $sum: '$mrr' } } },
          ]).toArray(),
        ]);
        let mrr = platMrr.length ? Math.round(platMrr[0].mrr) : null;
        if (mrr == null) {
          // Fallback: honorar-MRR fra synkede kontrakter (leie × honorar%)
          try {
            const agg = await db.collection('finance_contracts').aggregate([
              { $match: { active: { $ne: false } } },
              { $project: { fee: { $multiply: [{ $ifNull: ['$rent', 0] }, { $divide: [{ $ifNull: ['$fee_percent', 0] }, 100] }] } } },
              { $group: { _id: null, mrr: { $sum: '$fee' } } },
            ]).toArray();
            mrr = agg.length ? Math.round(agg[0].mrr) : 0;
          } catch (e) { mrr = 0; }
        }
        return cors(NextResponse.json({
          ok: true,
          day: today,
          sessionsToday: sessionsAgg.length ? sessionsAgg[0].n : 0,
          leadsToday, tenantsToday,
          pending: pendingLeads + pendingTenants,
          mrr,
        }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    if (route === '/admin/analytics' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30', 10) || 30;
      const [traffic, leadsIntel, webVitals, funnels] = await Promise.all([
        computeAnalytics(db, days),
        computeLeadIntel(db, days),
        computeWebVitals(db, days),
        computeFunnels(db, days),
      ]);
      const anomalies = [
        ...detectAnomalies(traffic.timeseries, 'sessions', 'Økter'),
        ...detectAnomalies(traffic.timeseries, 'leads', 'Leads'),
      ].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 8);
      return cors(NextResponse.json({ traffic, leads: leadsIntel, webVitals, anomalies, funnels }));
    }

    // --- Admin: ytelse per landingsside (/lp/{slug}) ---
    if (route === '/admin/landing-pages' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30', 10) || 30;
      // Katalog: annonse-LP-er fra LANDING-konfig + kampanjesider + hovedsider.
      const catalog = Object.values(LANDING).map((c) => ({
        slug: c.slug, source: c.source, path: `/lp/${c.slug}`, audience: 'huseier', group: 'annonse',
        eyebrow: c.eyebrow, h1: c.h1, image: c.image, metaTitle: c.metaTitle,
      }));
      catalog.push({
        slug: 'leietaker', source: 'lp-leietaker', path: '/lp/leietaker', audience: 'leietaker', group: 'annonse',
        eyebrow: 'Finn ditt neste hjem', h1: 'Finn ditt neste hjem i Bergen',
        image: '/interior-living.webp', metaTitle: 'Finn ditt neste hjem i Bergen — DigiHome',
      });
      // Kampanjesider (nyhetsbrev/sesong)
      catalog.push({
        slug: 'sommer', source: 'sommerkampanje-2026', path: '/sommer', audience: 'huseier', group: 'kampanje',
        eyebrow: 'Nyhetsbrev & annonser · frist 10. juli', h1: 'Sommerkampanje — 10 % honorar + 0 kr i oppstart',
        image: '/bergen-rooftops.webp', metaTitle: 'Sommerkampanje | DigiHome',
      });
      // Hovedsider (permanente konverteringssider)
      catalog.push(
        { slug: 'bli-utleier', source: 'nettside', path: '/bli-utleier', audience: 'huseier', group: 'hoved', eyebrow: 'Hovedskjema · utleiere', h1: 'Bli utleier', metaTitle: 'Bli utleier — DigiHome' },
        { slug: 'bli-leietaker', source: 'nettside', path: '/bli-leietaker', audience: 'leietaker', group: 'hoved', eyebrow: 'Hovedskjema · leietakere', h1: 'Bli leietaker', metaTitle: 'Bli leietaker — DigiHome' },
        { slug: 'priskalkulator', source: 'priskalkulator', path: '/priskalkulator', audience: 'huseier', group: 'hoved', eyebrow: 'Selvbetjent prisestimat', h1: 'Priskalkulator', metaTitle: 'Priskalkulator — DigiHome' },
      );
      const perf = await computeLandingPages(db, days, catalog.map((c) => ({ slug: c.slug, source: c.source, path: c.path, audience: c.audience })));
      const meta = Object.fromEntries(catalog.map((c) => [c.slug, c]));
      const pages = perf.pages.map((p) => ({ ...(meta[p.slug] || {}), ...p }));
      return cors(NextResponse.json({ ok: true, pages, totals: perf.totals, range: perf.range }));
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
        if (status === 'won' && metaCapiConfigured() && marketingAllowed(existing.marketingConsent)) {
          const att = existing.attribution || {};
          const wonVal = update.wonValue || Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || undefined;
          const capi = await sendMetaCapiEvent({
            eventName: 'Purchase',
            eventId: `won-${id}`,
            eventTime: update.wonAt || nowIso,
            actionSource: 'system_generated',
            email: existing.email, phone: existing.phone, fullName: existing.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            externalId: att.visitorId, zip: existing.postal_code, country: 'no',
            value: wonVal, currency: update.wonCurrency || 'NOK',
            customData: { content_name: existing.lead_type || 'lead', lead_event_id: id },
          });
          await db.collection(coll).updateOne({ id }, { $set: { metaCapiWon: { ok: capi.ok, at: nowIso, error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* best-effort */ }

      // Google Ads offline-konvertering (Data Manager API, lukket sløyfe): vunnet lead m/ gclid.
      try {
        const att = existing.attribution || {};
        if (status === 'won' && dataManagerConfigured() && marketingAllowed(existing.marketingConsent) && (att.gclid || att.gbraid || att.wbraid)) {
          const wonVal = update.wonValue || Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || 0;
          const up = await ingestOfflineConversion({
            gclid: att.gclid, gbraid: att.gbraid, wbraid: att.wbraid,
            value: wonVal, currency: update.wonCurrency || 'NOK', at: update.wonAt || nowIso, transactionId: id,
          });
          await db.collection(coll).updateOne({ id }, { $set: { googleAdsWon: { ok: up.ok, at: nowIso, requestId: up.requestId || null, error: null } } });
        }
      } catch (e) {
        try { await db.collection(coll).updateOne({ id }, { $set: { googleAdsWon: { ok: false, at: nowIso, error: e.message } } }); } catch (_) {}
      }

      // GA4 Measurement Protocol (server-side purchase): lukket sløyfe i GA4-rapportering.
      try {
        const att = existing.attribution || {};
        if (status === 'won' && ga4MpConfigured() && marketingAllowed(existing.marketingConsent)) {
          const g = await sendGa4Purchase({
            clientId: att.ga_client_id || att.visitorId || existing.marketing_visitor_id,
            userId: existing.marketing_visitor_id || undefined,
            value: update.wonValue || 0, currency: update.wonCurrency || 'NOK', transactionId: id,
            params: { lead_source_type: existing.lead_source_type || undefined, campaign: att.campaign || undefined },
          });
          await db.collection(coll).updateOne({ id }, { $set: { ga4Won: { ok: g.ok, at: nowIso, status: g.status || null } } });
        }
      } catch (e) {
        try { await db.collection(coll).updateOne({ id }, { $set: { ga4Won: { ok: false, at: nowIso, error: e.message } } }); } catch (_) {}
      }

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

    // Konverterings-/status-webhook fra plattformen. `/webhooks/conversion` er
    // alias for samme handler (navnet plattform-agenten fikk i Agent Bridge-avtalen).
    if ((route === '/webhooks/lead-status' || route === '/webhooks/conversion') && method === 'POST') {
      const secret = process.env.LEAD_SYNC_SECRET || '';
      // Aksepter hemmeligheten via flere konvensjoner (robust mot header-navn-mismatch
      // fra plattformsiden): X-Webhook-Secret, Authorization: Bearer <secret>, ?secret=.
      const { searchParams: webhookParams } = new URL(request.url);
      const authHeader = (request.headers.get('authorization') || '').trim();
      const bearer = /^bearer\s+/i.test(authHeader) ? authHeader.replace(/^bearer\s+/i, '').trim() : '';
      const provided =
        (request.headers.get('x-webhook-secret') || '').trim() ||
        (request.headers.get('x-lead-sync-secret') || '').trim() ||
        bearer ||
        (webhookParams.get('secret') || '').trim();
      if (!secret || provided !== secret) {
        return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      }
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const VALID = ['new', 'contacted', 'qualified', 'won', 'lost'];
      // To-nivå-modellen: plattformen kan sende `event` i stedet for `status`.
      // avtale_signert (selvbetjent klikk-aksept) / tilbud_akseptert → won,
      // tilbud_avslatt → lost. eiendom_onboardet / leie_aktiv er aktiverings-
      // milepæler UTEN statusendring (leaden er allerede vunnet).
      const evt = (body.event || '').toString().toLowerCase().trim();
      const EVT_TO_STATUS = { avtale_signert: 'won', tilbud_akseptert: 'won', tilbud_avslatt: 'lost' };
      const ACTIVATION_EVENTS = ['eiendom_onboardet', 'leie_aktiv'];
      const isActivationOnly = ACTIVATION_EVENTS.includes(evt) && !body.status;
      const raw = (body.status || EVT_TO_STATUS[evt] || '').toString().toLowerCase().trim();
      // Mid-funnel-statuser fra plattformen (visning booket / tilbud sendt):
      // pipelinen vår holder seg til de 5 kjernestatusene, så disse mappes til
      // 'qualified' MEN den granulære fasen bevares i funnelStage + historikk.
      const MID_FUNNEL = { viewing_booked: 'qualified', contract_sent: 'qualified' };
      const midFunnelStage = MID_FUNNEL[raw] ? raw : null;
      const map = {
        ny: 'new', open: 'new', åpen: 'new', kontaktet: 'contacted', contacted: 'contacted',
        kvalifisert: 'qualified', qualified: 'qualified', vunnet: 'won', won: 'won', signed: 'won',
        signert: 'won', closed_won: 'won', tapt: 'lost', lost: 'lost', closed_lost: 'lost', avvist: 'lost',
        ...MID_FUNNEL,
      };
      const status = VALID.includes(raw) ? raw : (map[raw] || '');
      if (!status && !isActivationOnly) return cors(NextResponse.json({ ok: false, error: 'Ugyldig status', got: raw || evt }, { status: 400 }));

      const externalRef = (body.external_ref || body.externalRef || '').toString();
      const platformId = (body.platform_id || body.platformId || '').toString();
      const email = (body.email || '').toString().toLowerCase().trim();
      const phoneDigits = (body.phone || '').toString().replace(/\D/g, '');
      const last8 = phoneDigits.slice(-8);

      // Match: external_ref (vår id) → platform_id → e-post → telefon (siste 8 siffer),
      // på tvers av begge kolleksjoner.
      let coll = null, lead = null, matchedBy = '';
      for (const c of ['leads', 'tenant_leads']) {
        const or = [];
        if (externalRef) or.push({ id: externalRef });
        if (platformId) or.push({ platform_id: platformId });
        if (email) or.push({ email });
        if (last8.length === 8) or.push({ phone: { $regex: `${last8}$` } });
        if (!or.length) break;
        const found = await db.collection(c).findOne({ $or: or });
        if (found) {
          coll = c; lead = found;
          matchedBy = (externalRef && found.id === externalRef) ? 'external_ref'
            : (platformId && found.platform_id === platformId) ? 'platform_id'
            : (email && (found.email || '').toLowerCase() === email) ? 'email' : 'phone';
          break;
        }
      }
      if (!lead) return cors(NextResponse.json({ ok: false, error: 'Lead ikke funnet' }, { status: 404 }));

      const nowIso = new Date().toISOString();
      const changedAt = body.changed_at ? new Date(body.changed_at).toISOString() : nowIso;
      const tenant = (body.tenant || '').toString().slice(0, 60) || null;

      // Aktiverings-milepæl (eiendom_onboardet / leie_aktiv): logg på leaden,
      // ingen statusendring. leie_aktiv → Meta 'Subscribe' (recurring startet).
      if (isActivationOnly) {
        const activation = [...(lead.activation || []), { event: evt, at: changedAt, via: 'platform' }].slice(-30);
        await db.collection(coll).updateOne({ id: lead.id }, { $set: {
          activation, activationStage: evt, platformSyncAt: nowIso,
          syncedFromPlatform: true, platformTenant: tenant || lead.platformTenant || null,
        } });
        let metaSub = null;
        try {
          const alreadyActive = !!(lead.metaCapiActive && lead.metaCapiActive.ok);
          if (evt === 'leie_aktiv' && !alreadyActive && metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
            const att = lead.attribution || {};
            const capi = await sendMetaCapiEvent({
              eventName: 'Subscribe',
              eventId: `active-${lead.id}`,
              eventTime: changedAt,
              actionSource: 'system_generated',
              email: lead.email, phone: lead.phone, fullName: lead.name,
              fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
              externalId: att.visitorId, zip: lead.postal_code, country: 'no',
              customData: { content_name: lead.tier || 'forvaltning', lead_event_id: lead.id },
            });
            metaSub = { ok: capi.ok };
            await db.collection(coll).updateOne({ id: lead.id }, { $set: { metaCapiActive: { ok: capi.ok, at: nowIso, error: capi.ok ? null : (capi.error || null) } } });
          }
        } catch (e) { /* best-effort */ }
        return cors(NextResponse.json({ ok: true, id: lead.id, matchedBy, event: evt, activationStage: evt, metaCapi: metaSub }));
      }
      const update = {
        status,
        statusUpdatedAt: changedAt,
        statusHistory: [...(lead.statusHistory || []), { status, stage: midFunnelStage || undefined, at: changedAt, via: 'platform', tenant: tenant || undefined }].slice(-30),
        syncedFromPlatform: true,
        platformTenant: tenant || lead.platformTenant || null,
        platformSyncAt: nowIso,
      };
      // Granulær mid-funnel-fase (viewing_booked / contract_sent) bevares separat.
      if (midFunnelStage) update.funnelStage = midFunnelStage;
      // Hendelses-spor: logg også status-endrende hendelser (avtale_signert m.fl.)
      if (evt) {
        update.activation = [...(lead.activation || []), { event: evt, at: changedAt, via: 'platform' }].slice(-30);
        update.activationStage = evt;
      }
      // Cross-system stitching + ack: lagre plattformens kunde-/konverterings-id.
      const platformCustomerId = (body.platform_customer_id || body.platformCustomerId || '').toString().slice(0, 120);
      if (platformCustomerId) update.platformCustomerId = platformCustomerId;
      const platformConversionId = (body.platform_conversion_id || body.platformConversionId || '').toString().slice(0, 160);
      if (platformConversionId) update.platformConversionId = platformConversionId;
      // Lost MED årsak → kvalitetsstyring / negativ-målretting.
      if (status === 'lost') {
        const LOST = ['spam', 'out_of_area', 'not_serious', 'no_response', 'duplicate', 'wrong_segment', 'other'];
        const lr = (body.lost_reason || body.lostReason || body.reason || '').toString().toLowerCase().trim();
        update.lostReason = LOST.includes(lr) ? lr : (lr ? 'other' : null);
        update.lostAt = lead.lostAt || changedAt;
      }
      if (status !== 'new' && !lead.firstResponseAt) update.firstResponseAt = changedAt;
      const isValueUpdate = body.value_update === true || body.valueUpdate === true;
      if (status === 'won') {
        update.wonAt = lead.wonAt || changedAt;
        const v = Number(body.value);
        if (isFinite(v) && v > 0) {
          update.wonValue = Math.round(v * 100) / 100;
          update.wonCurrency = (body.currency || 'NOK').toString().slice(0, 3).toUpperCase();
          if (isValueUpdate) {
            // Faktisk kontraktsverdi (leiekontrakt signert) → intern sann ROAS.
            update.wonValueActual = update.wonValue;
            update.valueUpdatedAt = changedAt;
          } else if (lead.wonValueEstimate == null) {
            // Akkvisisjonsestimat ved signering → fryses som verdien sendt til ads.
            update.wonValueEstimate = update.wonValue;
          }
        }
      }
      await db.collection(coll).updateOne({ id: lead.id }, { $set: update });

      // Meta CAPI: når et lead vinnes → server-side konvertering med ekte kontraktsverdi.
      // Lar Meta optimalisere mot faktiske kunder (closed-loop). event_id = won-<id> for dedup.
      let metaCapi = null;
      let googleConv = null;
      let ga4Conv = null;
      const alreadyMetaWon = !!(lead.metaCapiWon && lead.metaCapiWon.ok);
      try {
        if (status === 'won' && !alreadyMetaWon && metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
          const att = lead.attribution || {};
          const wonVal = update.wonValue || Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || undefined;
          const capi = await sendMetaCapiEvent({
            eventName: 'Purchase',
            eventId: `won-${lead.id}`,
            eventTime: update.wonAt || nowIso,
            actionSource: 'system_generated',
            email: lead.email, phone: lead.phone, fullName: lead.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            externalId: att.visitorId, zip: lead.postal_code, country: 'no',
            value: wonVal, currency: update.wonCurrency || 'NOK',
            customData: { content_name: lead.lead_type || 'lead', lead_event_id: lead.id },
          });
          metaCapi = { ok: capi.ok, error: capi.ok ? undefined : capi.error };
          await db.collection(coll).updateOne({ id: lead.id }, { $set: { metaCapiWon: { ok: capi.ok, at: nowIso, error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* best-effort */ }

      // Google Ads offline-konvertering (Data Manager API, lukket sløyfe): vunnet lead m/ gclid.
      const alreadyGoogleWon = !!(lead.googleAdsWon && lead.googleAdsWon.ok);
      try {
        const att = lead.attribution || {};
        if (status === 'won' && !alreadyGoogleWon && dataManagerConfigured() && marketingAllowed(lead.marketingConsent) && (att.gclid || att.gbraid || att.wbraid)) {
          const wonVal = update.wonValue || Number(process.env.GOOGLE_ADS_DEFAULT_LEAD_VALUE) || 0;
          const up = await ingestOfflineConversion({
            gclid: att.gclid, gbraid: att.gbraid, wbraid: att.wbraid,
            value: wonVal, currency: update.wonCurrency || 'NOK', at: update.wonAt || nowIso, transactionId: lead.id,
          });
          await db.collection(coll).updateOne({ id: lead.id }, { $set: { googleAdsWon: { ok: up.ok, at: nowIso, requestId: up.requestId || null, error: null } } });
          googleConv = { ok: up.ok, requestId: up.requestId || null };
        }
      } catch (e) {
        googleConv = { ok: false, error: e.message };
        try { await db.collection(coll).updateOne({ id: lead.id }, { $set: { googleAdsWon: { ok: false, at: nowIso, error: e.message } } }); } catch (_) {}
      }

      // GA4 Measurement Protocol (server-side purchase) ved won — lukket sløyfe i GA4.
      try {
        const att = lead.attribution || {};
        const alreadyGa4Won = lead.ga4Won && lead.ga4Won.ok;
        if (status === 'won' && !alreadyGa4Won && ga4MpConfigured() && marketingAllowed(lead.marketingConsent)) {
          const g = await sendGa4Purchase({
            clientId: att.ga_client_id || att.visitorId || lead.marketing_visitor_id,
            userId: lead.marketing_visitor_id || undefined,
            value: update.wonValue || 0, currency: update.wonCurrency || 'NOK', transactionId: lead.id,
            params: { lead_source_type: lead.lead_source_type || undefined, campaign: att.campaign || undefined },
          });
          await db.collection(coll).updateOne({ id: lead.id }, { $set: { ga4Won: { ok: g.ok, at: nowIso, status: g.status || null } } });
          ga4Conv = { ok: g.ok, status: g.status || null, skipped: !!g.skipped };
        } else if (status === 'won' && !ga4MpConfigured()) {
          ga4Conv = { ok: false, skipped: true, reason: 'ga4_api_secret_mangler' };
        }
      } catch (e) {
        ga4Conv = { ok: false, error: e.message };
        try { await db.collection(coll).updateOne({ id: lead.id }, { $set: { ga4Won: { ok: false, at: nowIso, error: e.message } } }); } catch (_) {}
      }

      // Mid-funnel livssyklus-events til Meta (custom/standard) → bedre budoptimalisering
      // oppover i trakten. Idempotent pr. stadium, samtykke-gated. event_id = <stadium>-<id>.
      try {
        const LIFECYCLE = { contacted: 'Contact', qualified: 'QualifiedLead' };
        const evName = LIFECYCLE[status];
        const firedKey = `metaCapi_${status}`;
        if (evName && !(lead[firedKey] && lead[firedKey].ok) && metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
          const att = lead.attribution || {};
          const capi = await sendMetaCapiEvent({
            eventName: evName,
            eventId: `${status}-${lead.id}`,
            eventTime: changedAt,
            actionSource: 'system_generated',
            email: lead.email, phone: lead.phone, fullName: lead.name,
            fbp: att.fbp, fbc: att.fbc, fbclid: att.fbclid,
            externalId: att.visitorId, zip: lead.postal_code, country: 'no',
            customData: { content_name: lead.lead_type || 'lead', lead_event_id: lead.id, lifecycle_stage: status },
          });
          await db.collection(coll).updateOne({ id: lead.id }, { $set: { [firedKey]: { event: evName, ok: capi.ok, at: nowIso, error: capi.ok ? null : (capi.error || null) } } });
        }
      } catch (e) { /* best-effort */ }

      return cors(NextResponse.json({
        ok: true,
        id: lead.id,
        matched_ref: lead.id,
        status,
        matched_by: matchedBy,
        match_warning: (matchedBy && matchedBy !== 'external_ref')
          ? `Matchet via ${matchedBy} (fallback). For robust closed-loop: bruk external_ref = vår lead.id (returnert ved videresending).`
          : undefined,
        conversions: (status === 'won')
          ? { meta: metaCapi || undefined, google: googleConv || undefined, ga4: ga4Conv || undefined }
          : undefined,
        meta_capi: metaCapi || undefined,
      }));
    }

    // --- Admin: lead-detalj + kundereise-tidslinje ---
    if (route === '/admin/lead' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const id = (searchParams.get('id') || '').toString();
      const coll = searchParams.get('type') === 'tenant' ? 'tenant_leads' : 'leads';
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      let lead = await db.collection(coll).findOne({ id });
      if (!lead) {
        // Historisk lead (imported_leads) — returner effektive felter, ingen tidslinje
        // (kom inn før sporing → ingen hendelser å vise).
        const imp = await db.collection(IMPORTED_COLL).findOne({ id }, { projection: { _id: 0 } });
        if (imp) {
          const effLead = {
            ...imp,
            createdAt: imp.created_at || imp.imported_at || null,
            status: (imp.override && imp.override.status) || imp.status || 'new',
            wonValue: (imp.override && imp.override.won_value != null) ? imp.override.won_value : (imp.won_value != null ? imp.won_value : null),
            wonCurrency: imp.currency || 'NOK',
            channel: (imp.override && imp.override.channel) || imp.channel || 'unknown',
            pre_tracking: true,
            forwarded: true,
            syncedFromPlatform: !!imp.platform_id,
          };
          return cors(NextResponse.json({ ok: true, lead: effLead, timeline: [] }));
        }
        return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      }
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
        const answer = await chatLLM({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: `LEAD-DATA:\n${JSON.stringify(ctx)}` }], maxTokens: 300, temperature: 0.2, feature: 'lead_svar' });
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
        const answer = await chatLLM({ messages, maxTokens: mode === 'ask' ? 500 : 700, temperature: 0.3, feature: 'ai_assistent' });
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
        const raw = await chatLLM({ messages: [{ role: 'system', content: SYS }, { role: 'user', content: `Tema: ${topic}` }], maxTokens: 1800, temperature: 0.6, feature: 'artikkel' });
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
