import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';
import { Marked } from 'marked';
import {
  SAK_GRUPPER, SAK_OMRAADER, SAK_OMRAADE_LABEL,
  sakSynlig, sakSynligForMedlem, omraaderForViewer, viewerFraMedlem,
} from '@/lib/sak-tilgang';
import { promises as fsp } from 'fs';
import nodePath from 'path';
import { getDb, clean } from '@/lib/mongodb';
import { getObject, putObject, PUBLIC_PREFIX } from '@/lib/objectStorage';
import { isBot, buildEvent, ensureAnalyticsIndexes, computeAnalytics, computeLeadIntel, computeFunnels, computeLandingPages, buildPaidFunnel, computeVelocity, computeMarketingTrends } from '@/lib/analytics-server';
import { deriveChannel, serializeForLLM, computeWebVitals, detectAnomalies, computeLive, computeAdsEconomics, computeMetaEconomics, combineAdsEconomics, computeAdsLeadsSeries } from '@/lib/analytics-server';
import { parseGoogleAdsCsv } from '@/lib/adsImport';
import { sendMetaCapiEvent, metaCapiConfigured } from '@/lib/meta-capi';
import { fetchMetaInsights, fetchMetaAccount, metaAdsConfigured, getCachedMetaReport, META_PERIODS, metaPeriodToRange, getCachedMetaCreatives, fetchMetaPreviewSrc, isValidPreviewFormat, getCachedMetaAdsTable, fetchMetaDaily, fetchMetaDailyActions, fetchMetaAdsWithInsights, fetchMetaAdDaily, metaPeriodToPreset } from '@/lib/meta-ads';
import { fetchPages, fetchLeadForms, fetchFormLeads, mapLeadFields, metaLeadAdsConfigured, fetchSingleLead, fetchFormName, fetchPageToken } from '@/lib/meta-leadads';
import { composioConfigured, createConnectLink, getConnectionStatus, runCampaignReport, defaultCustomerId, getCachedReport, GOOGLE_PERIODS, getCachedCreatives, activeProvider } from '@/lib/google-ads-provider';
import { googleAdsNativeConfigured, listConversionActions, resolveOfflineConversionAction, uploadClickConversion, toConversionDateTime, listCampaignsDetailed, suggestGeoTargets, setCampaignStatus, updateCampaignBudget, createSearchCampaign, createCompetitorCampaign, getCampaignByName, runAdsWithMetrics, runSearchTerms, runKeywordMetrics, generateKeywordIdeas, gaqlSearch, setCampaignMaximizeClicks, listRsaAds, createRsaAd, setAdStatus, runAdDaily } from '@/lib/google-ads-native';
import { runAdsWithMetricsViaComposio } from '@/lib/composio-google-ads';
import { dataManagerConfigured, ingestOfflineConversion } from '@/lib/google-ads-datamanager';
import { recordWonConversions } from '@/lib/closed-loop';
import { runDueReminders } from '@/lib/reminders';
import { hentLeieforhold } from '@/lib/leieforhold';
import { lagLeieforholdExcel, lagLeieforholdCsv } from '@/lib/leieforhold-excel';
import {
  anvendScenario as lfScenario, filtrerRader as lfFiltrer, parseFilterParams as lfParseFilter,
  filterBeskrivelse as lfBeskrivelse, beregnTotals as lfTotals, harFilter as lfHarFilter,
} from '@/lib/leieforhold-filter';
import { hentBudsjett, lagreBudsjett, beregnFaktisk, lagForslag, gyldigBudsjettAar, fangFaktiskEtterslep, beregnInntektsmodell, beregnSikretSerie, listBudsjettAar, INNTEKT_KATEGORIER, KOSTNAD_KATEGORIER, listPlaner, hentPlan, lagrePlan, slettPlan, beregnFaktiskPeriode, lagForslagForPeriode, gyldigYm } from '@/lib/budsjett';
import { lagBudsjettExcel, lagBudsjettExcelRullerende } from '@/lib/budsjett-excel';
import {
  beregnOversikt as drBeregnOversikt, listEnheter as drListEnheter, lagreEnhet as drLagreEnhet,
  slettEnhet as drSlettEnhet, importerFraLeieforhold as drImporterFraLeieforhold,
  autoSyncFraLeieforhold as drAutoSync,
  listPnl as drListPnl, lagrePnlRad as drLagrePnlRad, slettPnlRad as drSlettPnlRad,
  hentSelskap as drHentSelskap, lagreSelskap as drLagreSelskap,
} from '@/lib/datarom';
import { hentEnhetsokonomi as eoHent, lagreEnhetsokonomiDrivere as eoLagre } from '@/lib/enhetsokonomi';
import { listMeldinger as chatList, nyMelding as chatNy, slettMelding as chatSlett, merkLest as chatLest, hentStatus as chatStatus, oppdaterTraad as chatTraadOppdater, listTraader as chatTraader, redigerMelding as chatRediger, reagerMelding as chatReager, festMelding as chatFest, hentFestede as chatFestede, settSkriver as chatSettSkriver, hentSkriver as chatHentSkriver, lagreFilChunk as chatFilChunk, hentFil as chatHentFil, slettUbundetFil as chatSlettFil } from '@/lib/chat';
import { byggInvestorpakke } from '@/lib/datarom-excel';
import { IMPORTED_COLL, importRecords, parseCsv, summarizeImported, syncFromPlatform, listImported, updateImportedOverride, getLeadSyncMeta, maybeAutoSyncLeads } from '@/lib/imported-leads';
import { queueLeadPushback, flushLeadPushbacks, pushbackStats } from '@/lib/lead-pushback';
import { renderFinnBanners, FINN_THEMES } from '@/lib/finn-banners';
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
import { buildKpiDrill, DRILL_METRICS } from '@/lib/kpi-drill';
import { computeRevenueModel, buildLeadFeeIndex, attachFeeTruth } from '@/lib/revenue-model';
import { reconcileRevenue } from '@/lib/revenue-reconcile';
import { computeLlmUsageDashboard, getModelOverrides, setModelOverride, logImageUsage, AVAILABLE_MODELS, PLATFORM_MODELS, DEFAULT_MODEL, USD_TO_NOK } from '@/lib/llm-usage';
import { logExtUsage, summarizeExtUsage, getPlatformUsage } from '@/lib/ext-usage';
import { getFinanceSettings, setFinanceSettings, listCosts, listActiveCosts, upsertCost, deleteCost, listContracts, upsertContract, deleteContract, listEvents, upsertEvent, deleteEvent, computeResultat, computeLikviditet, computeFinanceOverview, computeTrends, captureSnapshot, computeInvestorMetrics, computeForecast, computeBoardPack, computeCustomers, computePlatformCustomers } from '@/lib/finance';
import { listFellesKostnader, upsertFellesKostnad, slettFellesKostnad, migrerFellesKostnader } from '@/lib/kostnader';
import { finnKodeFraUrl, hentFinnHtml, parseFinnAnnonse, beregnAnalyse, opprettLead, validerIngestAnnonse, analyserAnnonse, kjorAutoPipeline, kjorAutoRetry, retryKandidater, filtrerLevendeBilder, slettLeads as radarSlettLeads, listLeads as radarListLeads, oppdaterLead as radarOppdaterLead, slettLead as radarSlettLead, stilBilde, lagreStyletBilde, hentStyletBilde, hentTilbud, registrerTilbudKontakt, tilbudsRegnestykke, STILER as RADAR_STILER, opprettStylingJobber, kjorStylingJobber, listStylingJobber, reviewStylingJobb, fjernStyletBilde } from '@/lib/salgsradar';
import { settArkiv, listArkiv, nyVersjon, listVersjoner, hentVersjon, gjenopprettVersjon, opprettDeling, trekkDeling, hentDelt, filDetaljer, filLogg, VERSJON_COLL, konverterDocxTilPdf } from '@/lib/dokumenter';
import { lagreOppsett as signLagreOppsett, hentOppsett as signHentOppsett, slettOppsett as signSlettOppsett, opprettSigneringsjobb, kansellerSignering, pollSignering, pollSnarest, listSigneringsjobber, hentSignerRedirect, hentSignerVisning, hentSignerDokument, SIGN_JOBB_COLL } from '@/lib/signering';
import { syncContractsFromPlatform, syncCustomersFromPlatform, maybeAutoSyncFinance, getFinanceSyncMeta } from '@/lib/contracts-sync';
import { enqueueInterest as deliverInterest, retryInterestWebhooks, webhookTarget as interestWebhookTarget, platformInboxUrl, platformThreadUrl, platformUnitUrl, deliveryView, OUTBOX_COLL as INTEREST_OUTBOX } from '@/lib/interest-webhook';
import { notifyStatus, removeSuppression } from '@/lib/notify-status';
import { searchBrreg, lookupOrgNo, isValidOrgNr, normalizeOrgNr, companyLine } from '@/lib/brreg';
import { buildSelfServicePayload, resolveOwnerKind, ownerOrgNo, SS_UNIT_TYPE, RENTAL_LABELS } from '@/lib/self-service';
import { WIZARD_CATALOG_DEFAULT, normalizeCatalog } from '@/lib/catalog';
import { ga4MpConfigured, sendGa4Purchase } from '@/lib/ga4-mp';
import { buildRecommendations } from '@/lib/ads-recommendations';
import { generateRsaCopy, generateMetaCopy } from '@/lib/ads-ai';
import { runOptimization, getOptimizeConfig, setOptimizeConfig, getLastRun, listRuns, applyRecommendation } from '@/lib/ads-optimize';
import { sendWeeklyReport, buildReportData, renderReportHtml } from '@/lib/ads-report';
import { buildMarketingMetrics } from '@/lib/marketing-metrics';
import { emailConfigured, reportRecipients, sendHtmlEmail, isUndeliverableTestAddress, byggChatEpost } from '@/lib/email';
import { byggMoteProtokoll, protokollFilnavn } from '@/lib/protokoll';
import { NEWSLETTER_COLL, OPTOUT_COLL, NL_EVENTS_COLL, renderNewsletterHtml, resolveAudience, audienceCounts, sanitizeBlocks, hasContent, buildUnsubUrl, verifyUnsubToken, verifyInterestToken, propertyInterestToken, verifyPropertyInterestToken, slugifyCampaign, normEmail as nlNormEmail, recipientId, TEMPLATES, templateBlocks, THEMES, TRACKING_GIF, applyMergeTags } from '@/lib/newsletter';
import { syncPropertiesFromPlatform, maybeAutoSyncProperties, listAdminProperties, listPublicProperties, setPropertyVisibility, getPropertiesSyncMeta, backfillPropertyDistricts, refreshPropertyQuality, applyEnrichment, setPropertyEnrichment, setPropertyFinnSnapshot, setPropertyEditorialTitle, setPropertyEditorialFields, PROPERTIES_COLL } from '@/lib/properties-sync';
import { EDITORIAL_FIELDS, stripHouseNumber } from '@/lib/property-editorial';
import { cleanFinnTitle, titleCandidates, rentInfo } from '@/lib/listing-title';
import { listingGate, listingSlug, toListingCard, toListingDetail, publishReadiness, GATE, toIsoDate, propertyMetaLine, propertyAddressLine, propertyFactsLine, propertyAvailableLine, scopeOf, scopeOptionsFor, normalizeInterestScope, interestScopeLabel, interestRecord, roomsLine, SCOPE_LABEL, exactRentAmount } from '@/lib/listings';
import { ALERTS_COLL, ALERT_CONSENT_TEXT, normalizeAlert, alertMatches, alertSummaryText, summarizeDemand, toAdminAlert, normEmail as haNormEmail } from '@/lib/housing-alerts';
import { postalToDistrict } from '@/lib/geo-bergen';
import { buildLeadReceipt, buildLeadAdminNotification, buildPropertyInterestNotification } from '@/lib/lead-emails';
import { fireLeadEmails, sendReEngagedNotification, sendPropertyInterestNotification, sendPropertyInterestReceipt, sendInterestReplyEmail } from '@/lib/lead-emails';
import { buildAlerts } from '@/lib/ads-monitor';
import { fetchCompetitorGallery, serpApiConfigured } from '@/lib/serpapi';
import { getSeoConfig, saveSeoConfig, runRankCheck, runAeoCheck, runTechAudit, getSeoOverview, RANK_COLL as SEO_RANK_COLL, AEO_COLL as SEO_AEO_COLL, TECH_COLL as SEO_TECH_COLL } from '@/lib/seo-monitor';
import { gscConfigured, gscStatus, computeGscOverview, inspectUrl as gscInspectUrl } from '@/lib/gsc';
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
      'https://saker-hub.preview.emergentagent.com'
    ),
    key: process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY || '',
    env: 'test',
  };
}

// Kontrakt-/kundesynk (økonomi) kan eksplisitt peke på prod-CRM via ?env=prod.
// I produksjon er dette allerede standard; i preview trengs det for å kunne
// verifisere inntektsmodellen og boligdata mot ekte plattformdata.
// Kun admin-autentisert. (Brukes også av boligsynk og avstemming.)
function financeSyncTarget(request) {
  let envOverride = '';
  try { envOverride = String(new URL(request.url).searchParams.get('env') || '').toLowerCase(); } catch (_) {}
  if (envOverride === 'prod') {
    return {
      url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no'),
      key: process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '',
      env: 'prod',
    };
  }
  if (envOverride === 'test') {
    return {
      url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_TEST || process.env.DIGIHOME_API_URL || ''),
      key: process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY || '',
      env: 'test',
    };
  }
  return digiHomeTarget();
}

// Leieforhold & inntekter (og alt som avledes av porteføljen: budsjettforslag,
// datarom-enhetsøkonomi) leser ALLTID fra produksjonsplattformen — dette er
// ekte forretningsdata, og testmiljøets dummy-data skal aldri blandes inn.
// Ingen ?env=-overstyring her (fjernet etter brukerbeslutning aug. 2026).
function leieforholdTarget() {
  return {
    url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no'),
    key: process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '',
    env: 'prod',
  };
}

// Kostnadskilde for budsjettforslag/-veiviser: ÉN KILDE — finance_costs
// (Økonomi → Kostnader). Gamle enhetsokonomi-felles-poster migreres inn
// idempotent før lesing, og pausede poster teller ikke.
async function hentBudsjettKostnader(db) {
  await migrerFellesKostnader(db).catch(() => {});
  return listActiveCosts(db).catch(() => []);
}

// Videresend lead til DigiHome-plattformen (offentlige endepunkter, X-API-Key som id-kort).
// Best-effort med 8s timeout: leadet er alltid lagret lokalt først.
// VIKTIG: «forwarded» betyr VERIFISERT hos riktig CRM — en 2xx uten kvitterings-ID
// er ikke nok. Dette hindrer falske grønne statuser som Odin/Mussie-tilfellet.
async function forwardToDigiHome(path, payload) {
  const target = digiHomeTarget();
  const receiptBase = { targetEnv: target.env, targetUrl: target.url };
  if (!target.url) return { ok: false, error: 'DIGIHOME_API_URL mangler', ...receiptBase };

  // Vern mot selv-loop i alle miljøer: markedsnettsiden må aldri forwarde
  // tilbake til sitt eget API. Det skjedde under domeneovergangen og kunne gi
  // 2xx fra dedupe-ruten uten at leadet noen gang nådde CRM-et.
  try {
    const marketingHost = new URL(process.env.NEXT_PUBLIC_BASE_URL || '').host;
    const crmHost = new URL(target.url).host;
    if (marketingHost && crmHost && marketingHost === crmHost) {
      return { ok: false, error: 'CRM-målet peker på markedsnettsiden (selv-loop blokkert)', ...receiptBase };
    }
  } catch (e) { /* ugyldig URL håndteres av fetch under */ }

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
      // Plattformversjoner har brukt noen ulike responsformer. Godta kjente
      // ID-felt, men ALDRI marker som levert uten en konkret CRM-kvittering.
      const id = data?.data?.id || data?.data?.lead_id || data?.data?.tenant_id ||
        data?.id || data?.lead_id || data?.tenant_id || data?.lead?.id || data?.tenant?.id || null;
      if (!id) {
        return {
          ok: false,
          accepted: true,
          error: 'CRM svarte suksess, men uten platform_id — levering er ikke verifisert',
          status: res.status,
          ...receiptBase,
        };
      }
      const account = (data.account || (data.data && data.data.account)) || null;
      return { ok: true, id: String(id), account, status: res.status, ...receiptBase };
    }
    return { ok: false, error: `HTTP ${res.status}`, status: res.status, ...receiptBase };
  } catch (e) {
    return { ok: false, error: (e && e.message) || String(e), ...receiptBase };
  }
}

// --- SELVBETJENT PROVISJONERING (14/7, bro-spec «self-service-provisioning») ---
// Pusher kunden til plattformens POST /api/bridge/self-service-customer i det
// 5 %-avtalen aksepteres. 200 → konto opprettet + engangs handoff_url (magic
// login, 15 min) som suksess-skjermen viser som «Gå til kontoen din». 202 →
// pending_manual (forvalter fullfører manuelt; fallback = dagens e-postløp).
// Idempotent på event_id (= lead.id) — trygt å retrye. MERK: plattformen
// speiler selv kunden som PASSIVT won-lead (uten closed-loop-ekko), så vanlig
// /api/leads-forward skal IKKE kjøres i tillegg (ville gitt duplikat hos dem).

// Ensartet, revisjonssikker kvittering på alle dual-write-forsøk. Ingen nøkler
// lagres — kun målmiljø/vert, HTTP-status og plattformens ID.
function forwardAuditFields(fwd, { previousPlatformId = null, previousForwardedAt = null, attempts } = {}) {
  const at = new Date().toISOString();
  const target = digiHomeTarget();
  const verified = fwd?.ok === true;
  return {
    forwarded: verified,
    forward_verified: verified,
    platform_id: verified ? (fwd.id || null) : (previousPlatformId || null),
    forward_error: verified ? null : (fwd?.error || 'ukjent'),
    forwarded_at: verified ? at : (previousForwardedAt || null),
    forward_last_attempt_at: at,
    forward_target_env: fwd?.targetEnv || target.env,
    forward_target_url: fwd?.targetUrl || target.url,
    forward_http_status: Number.isFinite(Number(fwd?.status)) ? Number(fwd.status) : null,
    ...(attempts !== undefined ? { forward_attempts: attempts } : {}),
  };
}

// Oppdater bolig-snapshots fra systemet og fjern boliger som ikke lenger er
// aktive. Brukes i preview/test/send — ingen utsending kan inneholde utleid bolig.
async function resolveDraftProperties(dbx, blocks) {
  const cleanBlocks = sanitizeBlocks(blocks);
  const ids = [...new Set(cleanBlocks.filter((b) => b.type === 'properties').flatMap((b) => (b.items || []).map((p) => p.pid)).filter(Boolean))];
  if (!ids.length) return { blocks: cleanBlocks, unavailable: [] };
  // Etterfyll bydel først — ellers hydrerer vi inn tomme district-felt og alt
  // havner under «Andre områder» i utsendelsen.
  try { await backfillPropertyDistricts(dbx); } catch (_) {}
  const liveRows = await dbx.collection('platform_properties').find(
    { stale: { $ne: true }, $or: [{ externalId: { $in: ids } }, { id: { $in: ids } }] },
    // NB: `unit` MÅ være med — full gateadresse (street/houseNumber) ligger i
    // det nestede unit-objektet fra plattformeksporten og flates ut av
    // applyEnrichment. Uten den ble metalinjen «Baglergaten» i stedet for
    // «Baglergaten 8». `editorial` MÅ også være med: uten den ignorerte
    // nyhetsbrevet redaktørens overstyringer (tittel, pris, utleieenhet) og
    // viste plattformens rådata — stikk i strid med kildehierarkiet ellers på
    // flaten. Feltene brukes bare til å bygge kortet; eier/leietaker følger
    // aldri med ut i blokken (items settes eksplisitt under).
    { projection: { _id: 0, id: 1, externalId: 1, title: 1, area: 1, unit: 1, city: 1, district: 1, districtSource: 1, type: 1, bedrooms: 1, sqm: 1, images: 1, status: 1, monthlyRentBand: 1, availableFrom: 1, incomplete: 1, duplicate: 1, enrich: 1, editorial: 1, finnSnap: 1, finnUrl: 1 } }
  ).toArray();
  const byId = new Map();
  // FINN-berikelse slår inn her også: en bolig der plattformen mangler bilder,
  // men som har en aktiv FINN-annonse, er fullverdig og skal kunne sendes.
  liveRows.map(applyEnrichment).forEach((p) => { byId.set(p.externalId, p); byId.set(p.id, p); });
  const unavailable = [];
  const hydrated = cleanBlocks.map((b) => {
    if (b.type !== 'properties') return b;
    const items = (b.items || []).map((snap) => {
      const live = byId.get(snap.pid);
      if (!live || live.status !== 'active') { unavailable.push({ pid: snap.pid, title: snap.title || live?.title || 'Bolig', status: live?.status || 'missing' }); return null; }
      // KVALITETSPORT: plattformen har «tomme skall» (ingen bilder, 0 m²,
      // 0 soverom) og rene duplikater. Slike kort ville gått ut som «Leilighet»
      // uten bilde og uten info — det skader mer enn det hjelper. Samme regel
      // som forsiden: uten bilder vises boligen ikke utad.
      if (live.incomplete || live.duplicate || !(live.images || []).length) {
        unavailable.push({ pid: snap.pid, title: snap.title || live.title || 'Bolig', status: live.duplicate ? 'duplikat' : 'mangler bilder/data' });
        return null;
      }
      return {
        ...snap,
        pid: live.externalId || snap.pid,
        localId: live.id,
        title: live.title || snap.title,
        image: (Array.isArray(live.images) && live.images[0]) || snap.image || '',
        // Full gateadresse, fakta og ledig-fra hver for seg — det moderne
        // boligkortet setter dem på egne linjer. `meta` beholdes for eldre
        // utkast og kompakte flater. Norsk datoformat, aldri rå ISO i e-post.
        meta: propertyMetaLine(live),
        address: propertyAddressLine(live),
        facts: propertyFactsLine(live),
        available: propertyAvailableLine(live),
        // Bare et eksakt beløp. Har plattformen bare et prisintervall, beholdes
        // det redaktøren eventuelt har skrevet selv — vi finner ikke opp en pris.
        band: exactRentAmount(live.monthlyRentBand) > 0 ? live.monthlyRentBand : (snap.band || ''),
        // Utleieenhet: «Rom i bofellesskap» endrer både pris og hverdag, og må
        // stå i nyhetsbrevet også — ellers klikker folk seg inn på noe annet
        // enn de trodde, og forvalteren bruker dagen på å rette misforståelser.
        scope: scopeOf(live),
        scopeLabel: SCOPE_LABEL[scopeOf(live)] || '',
        rooms: roomsLine(live),
        // Slug til VÅR boligside. Nyhetsbrevets CTA peker dit, ikke til en egen
        // bekreftelsesside: det er der boligen er presentert ordentlig, det er
        // der utleieenheten vises, og det er lenken folk videresender.
        slug: listingSlug(live),
        // Bydel, ALDRI gatenavn: «Sandslimarka» er ikke et byområde. Mangler
        // bydel helt, grupperes boligen under «Andre områder».
        district: live.district || snap.district || 'Andre områder',
        status: live.status,
      };
    }).filter(Boolean);
    return { ...b, items };
  });
  return { blocks: hydrated, unavailable, requested: ids.length, found: ids.filter((x) => byId.has(x)).length };
}

// AUTO-OPPFRISK AV BOLIGBLOKKER.
// Boligene i et nyhetsbrev er levende data: en bolig kan bli utleid mellom at
// redaktøren plukket den og at brevet sendes. Før stoppet vi med en rød feil
// («oppdater boligblokken før test») og lot redaktøren rydde manuelt — men det
// er noe systemet kan gjøre selv. Nå fjerner vi boliger som ikke lenger kan
// annonseres, oppfrisker tittel/bilde/pris/bydel på resten, og RAPPORTERER hva
// som ble endret. Ingenting fjernes stille, og ingen utleid bolig kan gå ut.
async function refreshCampaignProperties(dbx, blocks) {
  const before = sanitizeBlocks(Array.isArray(blocks) ? blocks : []);
  const hasProps = before.some((b) => b?.type === 'properties' && (b.items || []).length);
  if (!hasProps) return { blocks: before, removed: [], emptied: [], changed: false };
  const resolved = await resolveDraftProperties(dbx, before);
  // SIKRING MOT SYNKFEIL: hvis INGEN av boligene i utkastet finnes i den
  // synkede tabellen, er den sannsynlige årsaken en synk-/oppetidsfeil — ikke
  // at samtlige boliger ble utleid samtidig. Da rører vi ikke utkastet. Uten
  // denne sikringen kunne en tom boligtabell tømt alle boligblokker.
  if (resolved.requested > 0 && resolved.found === 0) {
    return { blocks: before, removed: [], emptied: [], changed: false, unverified: true };
  }
  // En blokk som mistet ALLE boligene må redaktøren se på: da står brevet med
  // et tomt boligavsnitt, og hvilke boliger som skal erstatte dem er en
  // redaksjonell vurdering vi ikke skal gjette på.
  const emptied = resolved.blocks
    .map((b, i) => (b?.type === 'properties' && !(b.items || []).length && (before[i]?.items || []).length ? (b.title || 'Boligblokk') : null))
    .filter(Boolean);
  return {
    blocks: resolved.blocks,
    removed: resolved.unavailable,
    emptied,
    changed: resolved.unavailable.length > 0 || JSON.stringify(resolved.blocks) !== JSON.stringify(before),
  };
}

// Oppfrisker bydel på boligkort i et lagret utkast. Utkast laget før bydels-
// utledningen har tom bydel på kortene, så ALT havnet under «Andre områder» —
// også i editoren. Vi fikser det på lesetidspunktet i stedet for å kreve at
// redaktøren plukker boligene på nytt. Endrer ikke det lagrede utkastet;
// neste lagring persisterer den korrekte bydelen.
async function hydrateBlockDistricts(dbx, blocks) {
  if (!Array.isArray(blocks) || !blocks.some((b) => b?.type === 'properties')) return blocks;
  try { await backfillPropertyDistricts(dbx); } catch (_) {}
  const ids = [...new Set(blocks.filter((b) => b.type === 'properties').flatMap((b) => (b.items || []).map((p) => p.pid)).filter(Boolean))];
  if (!ids.length) return blocks;
  try {
    const rows = await dbx.collection('platform_properties').find(
      { $or: [{ externalId: { $in: ids } }, { id: { $in: ids } }] },
      { projection: { _id: 0, id: 1, externalId: 1, district: 1 } },
    ).toArray();
    const byId = new Map();
    rows.forEach((p) => { byId.set(p.externalId, p); if (p.id) byId.set(p.id, p); });
    return blocks.map((b) => (b.type !== 'properties' ? b : {
      ...b,
      items: (b.items || []).map((it) => {
        const live = byId.get(it.pid);
        if (!live) return it;
        return { ...it, district: live.district || 'Andre områder' };
      }),
    }));
  } catch (_) { return blocks; }
}
async function provisionSelfService(lead, request) {
  const target = digiHomeTarget();
  if (!target.url) return { ok: false, error: 'Plattform-URL mangler' };
  const payload = buildSelfServicePayload(lead, {
    ip: clientIp(request) || '',
    termsUrl: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no'}/vilkar`,
  });
  try {
    const res = await fetch(`${target.url}/api/bridge/self-service-customer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Secret': (process.env.AGENT_BRIDGE_SECRET || '').trim(),
        'X-API-Key': target.key,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(8000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 200 && (data.success || data.status === 'provisioned') && data.handoff_url) {
      return { ok: true, id: null, account: {
        onboarding_url: data.handoff_url,
        portal_url: data.portal_url || null,
        owner_user_id: data.owner_user_id || null,
        property_id: data.property_id || null,
        unit_id: data.unit_id || null,
        agreement_id: data.agreement_id || null,
        status: 'provisioned',
        provisioned_at: new Date().toISOString(),
        ...(data.idempotent === true ? { idempotent: true } : {}),
      } };
    }
    // 202 pending_manual: IKKE feil — forvalter fullfører manuelt (avtalt kontrakt).
    if (res.status === 202) return { ok: true, id: null, account: null, pendingManual: true };
    return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 250)}` };
  } catch (e) {
    return { ok: false, error: e && e.name === 'TimeoutError' ? 'Tidsavbrudd (8s)' : ((e && e.message) || String(e)) };
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
  if (hit && Date.now() - hit.at < (hit.ttl || ADDR_TTL_MS)) return hit.suggestions;

  // treffPerSide=50: «Lien», «Skoglien» o.l. finnes over hele landet — med bare
  // 20 nasjonale treff kunne Bergen-adressen falle utenfor FØR geo-sorteringen.
  const url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}` +
    `&fuzzy=true&treffPerSide=50&side=0&asciiKompatibel=true` +
    `&filtrer=adresser.adressetekst,adresser.postnummer,adresser.poststed,adresser.kommunenummer`;

  let suggestions = [];
  let ok = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2500);
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

  // Cache vellykkede svar i full TTL. Feil/timeout negativ-caches KORT (60s):
  // vi prøver snart igjen, men hamrer ikke en nede-tjeneste for hvert tastetrykk.
  if (ok) {
    _addrCache.set(key, { at: Date.now(), suggestions });
    if (_addrCache.size > ADDR_CACHE_MAX) {
      const oldest = _addrCache.keys().next().value;
      _addrCache.delete(oldest);
    }
  } else {
    _addrCache.set(key, { at: Date.now(), suggestions: [], ttl: 60 * 1000 });
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
  if (hit && Date.now() - hit.at < (hit.ttl || ADDR_TTL_MS)) return hit.suggestions;

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
    // Tomt svar caches KORT (60s): et forbigående ZERO_RESULTS skal ikke gjøre
    // adressen «usøkbar» i 10 minutter for alle brukere.
    _addrCache.set(cacheKey, { at: Date.now(), suggestions, ttl: suggestions.length ? 0 : 60 * 1000 });
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

// ── Priskalkulator: standardkatalogen ligger nå i lib/catalog.js ─────────────
// Flyttet ut fordi de offentlige prissidene må vise SAMME tall som kalkulatoren.
// Overstyring via settings.wizard_catalog fungerer som før.

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

  const bedrooms = num(/Soverom\s*(\d+)/);
  const sqm = num(/Internt bruksareal\s*(\d{1,4})\s*m/i) || num(/Prim[æa]rrom\s*(\d{1,4})\s*m/i) || num(/Bruksareal\s*(\d{1,4})\s*m/i) || num(/Bruttoareal\s*(\d{1,4})\s*m/i);
  const rent = num(/M[åa]nedsleie\s*([\d\s]{2,9}?)\s*kr/i);
  // LEDIG FRA. FINN kaller det «Leieperiode» i nøkkelinfo og «Overtakelse:» i
  // annonseteksten, alltid på formatet dd.mm.åååå. Vi tar det første som treffer
  // — normaliseringen til ISO skjer i toIsoDate, ikke her.
  const availableFrom =
    (/Leieperiode\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/i.exec(text) || [])[1] ||
    (/Overtakelse\s*:?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/i.exec(text) || [])[1] ||
    (/Ledig\s+fra\s*:?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4})/i.exec(text) || [])[1] || '';
  const ptRaw = (/Boligtype\s*([A-Za-zÆØÅæøå]+)/i.exec(text) || [])[1] || '';
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
  // Ekte gateadresse ligger i kartlenken. Noen FINN-annonser skjuler gaten og
  // viser bare «Kart, 5254 Sandsli» — det er en lokasjon, aldri en adresse.
  let address = '';
  const am = /"([^"]{5,120}?,\s*\d{4}\s[^"]{1,60}?)"\s+data-testid="map-link"/i.exec(htmlStr)
          || /data-testid="map-link"[^>]*?(?:title|aria-label)="([^"]{5,120})"/i.exec(htmlStr);
  if (am) address = decodeEntities(am[1]).trim();
  if (address) address = address.replace(/^(åpne|vis|se)\s+(i\s+)?kart(et)?\s*(for\s+)?/i, '').trim();
  if (/^kart\s*,/i.test(address) || !/\d/.test((address.split(',')[0] || '').trim())) address = '';

  let postalCode = '';
  let city = '';
  const fullPm = /,\s*(\d{4})\s+([A-Za-zÆØÅæøåÉé .'-]{2,60})/.exec(address);
  if (fullPm) {
    postalCode = fullPm[1];
    city = fullPm[2].trim();
  } else {
    const loc = /Kart\s*,?\s*(\d{4})\s+([A-Za-zÆØÅæøåÉé .'-]{2,40}?)(?=\s+(?:M[åa]nedsleie|Nøkkelinfo|Internt|Prim[æa]rrom|Boligtype|Soverom))/i.exec(text);
    if (loc) { postalCode = loc[1]; city = loc[2].trim(); }
  }
  let finnCode = '';
  try {
    const parsed = new URL(key);
    finnCode = parsed.searchParams.get('finnkode') || (parsed.pathname.match(/\b(\d{8,10})\b/) || [])[1] || '';
  } catch (e) { /* URL er allerede validert av endepunktet */ }

  // BILDEGALLERI. og:image gir bare forsidebildet, men resten av annonsebildene
  // ligger som images.finncdn.no-URLer i markupen (carousel + srcSet).
  // Formatet er /dynamic/{bredde}w/item/{finnkode}/{uuid} — MERK: uten filtype,
  // så vi kan ikke filtrere på .jpg. Vi krever i stedet at URLen tilhører NETTOPP
  // denne annonsen (/item/{finnkode}/), dedupliserer på uuid (samme bilde finnes
  // i 142w/480w/1280w/1600w) og beholder største variant. Forsidebildet først.
  // Feiler mønsteret, står vi igjen med og:image alene — galleriet er en bonus.
  const gallery = [];
  try {
    const seen = new Map();
    const re = /https:\/\/images\.finncdn\.no\/[^\s"'\\<>)]+/g;
    let mm;
    while ((mm = re.exec(htmlStr)) && seen.size < 60) {
      const u = decodeEntities(mm[0]).replace(/[),.;]+$/, '');
      if (!/\/dynamic\//.test(u)) continue;
      if (finnCode && !u.includes(`/item/${finnCode}/`)) continue;
      const file = ((u.split('/').pop() || '').split('?')[0] || '').toLowerCase();
      if (!file || file.length < 8) continue;
      const width = Number((/\/(\d{2,4})w\//.exec(u) || [])[1] || 0);
      const prev = seen.get(file);
      if (!prev || width > prev.width) seen.set(file, { url: u, width });
    }
    const coverFile = ((String(image || '').split('/').pop() || '').split('?')[0] || '').toLowerCase();
    const ordered = [...seen.entries()].sort((a, b) => (b[0] === coverFile ? 1 : 0) - (a[0] === coverFile ? 1 : 0));
    for (const [, v] of ordered) { if (gallery.length < 12) gallery.push(v.url); }
    if (!gallery.length && image) gallery.push(image);
  } catch (_) { /* galleri er en bonus */ }

  const data = {
    ok: !!title,
    finnUrl: key, finnCode, title, image, gallery, description, kind,
    propertyType, propertyTypeRaw: ptRaw,
    bedrooms: bedrooms || '', sqm: sqm || '', rent: rent || '',
    availableFrom: availableFrom || '',
    matrikkel, address, postalCode, city,
    addressHidden: !address && !!(postalCode || city),
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
// Dedikert sesjonshemmelighet. Prioriter ADMIN_SESSION_SECRET (bør settes i
// prod-env); faller tilbake på ADMIN_KEY for bakoverkompatibilitet. Vi bruker
// ALDRI en hardkodet fallback — mangler begge, deaktiveres token-signering
// (fail closed) slik at ingen kan forfalske sesjoner med en kjent hemmelighet.
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || ADMIN_KEY || '';
if (!SESSION_SECRET) {
  // eslint-disable-next-line no-console
  console.error('SIKKERHET: ADMIN_SESSION_SECRET/ADMIN_KEY mangler — sesjonssignering er deaktivert.');
}
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
  if (!SESSION_SECRET) return '';
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest('hex');
  return `${body}.${sig}`;
}
function verifySession(token) {
  try {
    if (!SESSION_SECRET) return null;
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

// --- Engangs-tokens: invitasjon (7 d), glemt passord (1 t), magic link (15 min) ---
// Rå token finnes KUN i e-postlenken; databasen lagrer sha256-hashen. Alle
// tokens er engangs (usedAt), typespesifikke, og nye tokens invaliderer gamle
// av samme type. Når passordet endres, invalideres ALT utestående for brukeren.
const AUTH_TOKEN_TTL = { invite: 7 * 24 * 3600 * 1000, reset: 3600 * 1000, magic: 15 * 60 * 1000 };
function hashAuthToken(raw) { return crypto.createHash('sha256').update(String(raw)).digest('hex'); }

async function lagAuthToken(db, { userId, email, type }) {
  const raw = crypto.randomBytes(32).toString('hex');
  const naa = Date.now();
  await db.collection('auth_tokens').updateMany(
    { userId, type, usedAt: null },
    { $set: { usedAt: new Date(naa).toISOString(), invalidated: true } }
  );
  await db.collection('auth_tokens').insertOne({
    id: uuidv4(), tokenHash: hashAuthToken(raw), userId, email: email || '', type,
    createdAt: new Date(naa).toISOString(),
    expiresAt: new Date(naa + (AUTH_TOKEN_TTL[type] || 3600000)).toISOString(),
    usedAt: null,
  });
  return raw;
}

async function verifiserAuthToken(db, raw, type) {
  if (!raw || String(raw).length < 32) return null;
  const doc = await db.collection('auth_tokens').findOne({ tokenHash: hashAuthToken(raw), type });
  if (!doc || doc.usedAt || new Date(doc.expiresAt).getTime() < Date.now()) return null;
  const user = await db.collection('admin_users').findOne({ id: doc.userId });
  if (!user) return null;
  return { doc, user };
}

async function brukAuthToken(db, id) {
  await db.collection('auth_tokens').updateOne({ id }, { $set: { usedAt: new Date().toISOString() } });
}

async function invaliderBrukerTokens(db, userId) {
  await db.collection('auth_tokens').updateMany(
    { userId, usedAt: null },
    { $set: { usedAt: new Date().toISOString(), invalidated: true } }
  );
}

// --- E-postramme for konto-e-poster (invitasjon / reset / magic link) ---
// Verdensklasse, klientsikker HTML: inline-styles, skjult preheader, én tydelig
// CTA, fallback-lenke i klartekst og sikkerhetsnotis. Matcher admin-designet.
function authEpostHtml({ eyebrow, heading, intro, detaljerHtml = '', ctaLabel, ctaUrl, gyldighet, sikkerhet, mottakerEpost, preheader, headerLabel = 'Admin' }) {
  const esc = taskEsc;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const logoUrl = `${base}/api/media/email-logo.png`;
  return `
  <div style="background:#f4f3f1;padding:44px 16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${esc(preheader || intro)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</span>
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #eceae7;box-shadow:0 1px 3px rgba(20,15,35,0.04)">
      <div style="height:4px;background:linear-gradient(90deg,#8b5cf6 0%,#cf97fc 60%,#e9d5ff 100%)"></div>
      <div style="padding:24px 32px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="vertical-align:middle"><img src="${logoUrl}" alt="DigiHome" height="26" style="display:block;height:26px;width:auto;border:0" /></td>
          <td style="vertical-align:middle;text-align:right"><span style="display:inline-block;border:1px solid #e7e4ef;border-radius:99px;padding:4px 12px;color:#8b5cf6;font-size:10.5px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase">${esc(headerLabel)}</span></td>
        </tr></table>
      </div>
      <div style="padding:30px 32px 8px">
        <p style="margin:0 0 10px;color:#8b5cf6;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">${esc(eyebrow)}</p>
        <h1 style="margin:0 0 12px;color:#0f0f0f;font-size:25px;line-height:1.22;letter-spacing:-0.02em">${esc(heading)}</h1>
        <p style="margin:0;color:#565656;font-size:14.5px;line-height:1.68">${intro}</p>
        ${detaljerHtml}
      </div>
      <div style="padding:28px 32px 6px">
        <a href="${ctaUrl}" style="display:block;background:#0f0f0f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:16px 24px;border-radius:13px;text-align:center;letter-spacing:-0.01em">${esc(ctaLabel)} &rarr;</a>
        ${gyldighet ? `<p style="margin:14px 0 0;color:#9b9b9b;font-size:12px;line-height:1.6;text-align:center">${esc(gyldighet)}</p>` : ''}
      </div>
      <div style="padding:24px 32px 28px">
        <div style="border-top:1px solid #f0eeeb;padding-top:16px">
          <p style="margin:0 0 5px;color:#adadad;font-size:11.5px;line-height:1.6">Fungerer ikke knappen? Kopier lenken inn i nettleseren:</p>
          <p style="margin:0;word-break:break-all"><a href="${ctaUrl}" style="color:#8b5cf6;font-size:11px;text-decoration:underline">${esc(ctaUrl)}</a></p>
        </div>
      </div>
      ${sikkerhet ? `<div style="background:#faf9f7;border-top:1px solid #f0eeeb;padding:18px 32px">
        <p style="margin:0;color:#8a8a8a;font-size:12px;line-height:1.65">${esc(sikkerhet)}</p>
      </div>` : ''}
    </div>
    <p style="max-width:560px;margin:20px auto 0;text-align:center;color:#b5b2ad;font-size:11px;line-height:1.7">DigiHome Admin &middot; vårt interne arbeidsverktøy &middot; digihome.no${mottakerEpost ? `<br/>Sendt til ${esc(mottakerEpost)}` : ''}</p>
  </div>`;
}

// Velkomst-/invitasjons-e-post: personlig hilsen, hvem som inviterte, hva du
// får tilgang til (rollestyrt), og aktiveringslenke der brukeren VELGER EGET
// passord. Feiler stille (returnerer false) — kontoen finnes uansett.
async function sendVelkomstEpost({ member, rawToken, invitertAv }) {
  if (!member || !member.email || !emailConfigured()) return false;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const url = `${base}/admin?invite=${rawToken}`;
  const fornavn = String(member.name || '').trim().split(/\s+/)[0] || 'der';
  const rolleTekst = member.role === 'admin' || member.role === 'owner'
    ? 'Du får full tilgang til hele DigiHome Admin — innsikt, leads, økonomi, saker og møter.'
    : 'Du får tilgang til <strong style="color:#0f0f0f">Saker</strong> — teamets system for oppfølging, frister og ansvar.';
  const rad = (l, v) => `<tr><td style="padding:5px 16px 5px 0;color:#8a8a8a;font-size:13px;white-space:nowrap">${l}</td><td style="padding:5px 0;color:#111;font-size:13px;font-weight:600">${taskEsc(v)}</td></tr>`;
  const detaljer = `
        <div style="margin-top:20px;background:#faf9f7;border:1px solid #f0eeeb;border-radius:14px;padding:16px 20px">
          <table style="border-collapse:collapse">
            ${rad('E-post', member.email)}
            ${rad('Rolle', member.role === 'admin' ? 'Administrator' : member.role === 'owner' ? 'Eier' : 'Bruker')}
            ${invitertAv ? rad('Invitert av', invitertAv) : ''}
          </table>
        </div>`;
  const html = authEpostHtml({
    eyebrow: 'Velkommen til teamet',
    heading: `Hei ${fornavn} — kontoen din er klar`,
    intro: `${taskEsc(invitertAv || 'DigiHome')} har invitert deg til <strong style="color:#0f0f0f">DigiHome Admin</strong> — vårt interne arbeidsverktøy. ${rolleTekst} Trykk på knappen under for å aktivere kontoen og velge ditt eget passord.`,
    detaljerHtml: detaljer,
    ctaLabel: 'Aktiver konto og velg passord',
    ctaUrl: url,
    gyldighet: 'Lenken er personlig og gyldig i 7 dager.',
    sikkerhet: 'Var ikke dette deg? Da kan du trygt se bort fra denne e-posten — ingenting skjer uten at lenken brukes.',
    mottakerEpost: member.email,
    preheader: `Du er invitert til DigiHome Admin. Aktiver kontoen og velg ditt eget passord.`,
  });
  try {
    await sendHtmlEmail({ to: member.email, subject: `Velkommen til DigiHome Admin, ${fornavn}`, html, fromName: 'DigiHome Admin', individual: false, categories: ['konto-invitasjon'] });
    return true;
  } catch (e) { return false; }
}

async function sendResetEpost({ member, rawToken }) {
  if (!member || !member.email || !emailConfigured()) return false;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const url = `${base}/admin?reset=${rawToken}`;
  const fornavn = String(member.name || '').trim().split(/\s+/)[0] || 'der';
  const html = authEpostHtml({
    eyebrow: 'Passord',
    heading: 'Tilbakestill passordet ditt',
    intro: `Hei ${taskEsc(fornavn)} — vi mottok en forespørsel om å tilbakestille passordet for kontoen din. Trykk på knappen under for å velge et nytt.`,
    ctaLabel: 'Velg nytt passord',
    ctaUrl: url,
    gyldighet: 'Lenken er gyldig i 1 time og kan bare brukes én gang.',
    sikkerhet: 'Ba du ikke om dette? Da kan du se bort fra e-posten — passordet ditt er uendret og kontoen er trygg.',
    mottakerEpost: member.email,
    preheader: 'Velg et nytt passord for DigiHome-kontoen din.',
  });
  try {
    await sendHtmlEmail({ to: member.email, subject: 'Tilbakestill passordet ditt — DigiHome Admin', html, fromName: 'DigiHome Admin', individual: false, categories: ['konto-reset'] });
    return true;
  } catch (e) { return false; }
}

async function sendMagicEpost({ member, rawToken }) {
  if (!member || !member.email || !emailConfigured()) return false;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const url = `${base}/admin?magic=${rawToken}`;
  const fornavn = String(member.name || '').trim().split(/\s+/)[0] || 'der';
  const html = authEpostHtml({
    eyebrow: 'Innlogging',
    heading: 'Din innloggingslenke',
    intro: `Hei ${taskEsc(fornavn)} — trykk på knappen under, så logges du rett inn i DigiHome Admin. Helt uten passord.`,
    ctaLabel: 'Logg meg inn',
    ctaUrl: url,
    gyldighet: 'Lenken er gyldig i 15 minutter og kan bare brukes én gang.',
    sikkerhet: 'Ba du ikke om dette? Da kan du se bort fra e-posten. Ingen kommer inn på kontoen uten selve lenken.',
    mottakerEpost: member.email,
    preheader: 'Engangslenke som logger deg rett inn i DigiHome Admin.',
  });
  try {
    await sendHtmlEmail({ to: member.email, subject: 'Din innloggingslenke — DigiHome Admin', html, fromName: 'DigiHome Admin', individual: false, categories: ['konto-magic'] });
    return true;
  } catch (e) { return false; }
}

function adminAuthed(request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') || request.headers.get('x-admin-key') || '';
    if (!!ADMIN_KEY && key === ADMIN_KEY) return true;       // legacy nøkkel
    const payload = key ? verifySession(key) : null;
    if (payload) {
      // Kontoer med begrensede roller (bruker/partner/eier/investor) har ALDRI
      // admin-tilgang — de går via sakerAuthed/innloggetAuthed/innsynAuthed.
      // Tokens utstedt før roller fantes mangler role-feltet og var per
      // definisjon admin.
      if (['bruker', 'partner', 'eier', 'investor'].includes(payload.role)) return false;
      return true;
    }
    return false;
  } catch (e) { return false; }
}

// Sesjonsnyttelast fra request (eller null) — brukes der vi trenger å vite HVEM.
function sessionFra(request) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key') || request.headers.get('x-admin-key') || '';
    return key ? verifySession(key) : null;
  } catch (e) { return null; }
}

// Saker-tilgang: admin/owner ELLER kontoer med rollene 'bruker'/'partner'.
// Rollen 'eier' (investor) har IKKE tilgang til sakssystemet.
function sakerAuthed(request) {
  if (adminAuthed(request)) return true;
  const payload = sessionFra(request);
  return !!(payload && ['bruker', 'partner'].includes(payload.role));
}

// Viewer for tilgangsstyring av saker: master-nøkkel/admin-sesjon ser alt;
// bruker/partner slås opp i admin_users for gruppemedlemskap (Styret/Ledelsen/
// Utvikling). Se lib/sak-tilgang.js for selve reglene.
async function sakViewer(db, request) {
  const payload = sessionFra(request);
  if (adminAuthed(request)) return { admin: true, id: (payload && payload.sub) || null, groups: SAK_GRUPPER };
  if (!payload || !payload.sub) return { admin: false, id: null, groups: [] };
  const u = await db.collection('admin_users').findOne({ id: payload.sub }, { projection: { _id: 0, id: 1, role: 1, groups: 1 } });
  return viewerFraMedlem(u);
}

// ═══ Utviklingssaker: sakstyper + produkter/komponenter (kun Utvikling-området) ═══
const DEV_SAKSTYPER = ['feil', 'forbedring', 'funksjon', 'vedlikehold'];

// ═══ Prosjektstatuser (Linear-modell): kartlegging = «utforskes» + brief ═══
const PROSJEKT_STATUSER = ['utforskes', 'planlagt', 'pagar', 'ferdig', 'skrinlagt'];

// Idempotent seed av DigiHomes produktstruktur (Produkt → Komponenter).
// «Komponent» (ikke «modul») for å unngå kollisjon med brukermoduler.
async function seedDevProducts(db) {
  const antall = await db.collection('dev_products').countDocuments();
  if (antall > 0) return;
  const naa = new Date().toISOString();
  const k = (n) => ({ id: uuidv4(), name: n });
  await db.collection('dev_products').insertMany([
    { id: uuidv4(), name: 'Nettside (digihome.no)', color: '#0ea5e9', components: ['Forside/Landingssider', 'Artikler/SEO', 'Utleiekalkulator', 'Skjemaer/Leads', 'Ytelse/Bilder'].map(k), createdAt: naa },
    { id: uuidv4(), name: 'Admin-portalen', color: '#8b5cf6', components: ['Saker', 'Møter', 'Leads/Kunder', 'Økonomi/Nøkkeltall', 'Varsler/E-post', 'Tilgang/Personer'].map(k), createdAt: naa },
    { id: uuidv4(), name: 'Mobil app', color: '#10b981', components: [], createdAt: naa },
  ]);
}

// Hent en sak KUN hvis vieweren kan se den — skjulte saker svarer 404 slik at
// selve eksistensen aldri lekker (brukes av alle skrive-/underendepunkter).
async function hentSynligSak(db, request, taskId) {
  // Sentinel: frittstående dokumenter fra Dokumenter-hubben (uten sak).
  // Tilgjengelig for admin ELLER kontoer med modulen «dokumenter» tildelt
  // under Brukere — vanlige saksbrukere uten modulen når dem aldri.
  if (taskId === 'DOKUMENTER') {
    if (!(await modulAuthed(request, db, 'dokumenter'))) return { task: null, viewer: null };
    return { task: { id: 'DOKUMENTER', title: 'Dokumenter', frittstaende: true }, viewer: null };
  }
  const task = await db.collection('tasks').findOne({ id: taskId }, { projection: { _id: 0 } });
  if (!task) return { task: null, viewer: null };
  const viewer = await sakViewer(db, request);
  return { task: sakSynlig(viewer, task) ? task : null, viewer };
}

// Innlogget-tilgang: ALLE gyldige kontoer (bruker/partner/eier/investor) —
// brukes for møter, personliste, egen profil og passordbekreftelse. Innholdet
// filtreres videre per rolle (f.eks. møtelisten) der det trengs.
function innloggetAuthed(request) {
  if (adminAuthed(request)) return true;
  const payload = sessionFra(request);
  return !!(payload && ['bruker', 'partner', 'eier', 'investor'].includes(payload.role));
}

// Innsyn-tilgang: rollen 'eier' (investor/aksjonær) får LESE nøkkeltall og
// økonomi — aldri skrive. Admin/owner har naturligvis alt.
function innsynAuthed(request) {
  if (adminAuthed(request)) return true;
  const payload = sessionFra(request);
  return !!(payload && payload.role === 'eier');
}

// ═══ MODULTILGANG per bruker ═══
// Begrensede kontoer (bruker/partner/eier) kan gis eksplisitt tilgang til
// utvalgte moduler (settes per person under Personer). Nøklene matcher
// menypunktene i admin slik at navigasjon og API håndheves likt.
const MODUL_NOKLER = [
  'nokkeltall', 'okonomi', 'leieforhold', 'budsjett', 'kunder', 'i-leads', 'historikk', 'salgsradar',
  // Dokumenter-hubben (frittstående dokumenter, arkiv og BankID-signering)
  'dokumenter',
  // Datarom-sidene (investorrommet) — må speile MODUL_VALG i components/admin/Brukere.js
  'dr-oversikt', 'dr-resultat', 'dr-enheter', 'dr-pipeline', 'dr-selskap', 'dr-dokumenter',
];
async function modulAuthed(request, db, modul) {
  if (adminAuthed(request)) return true;
  const payload = sessionFra(request);
  if (!payload || !payload.sub) return false;
  try {
    const u = await db.collection('admin_users').findOne({ id: payload.sub }, { projection: { moduler: 1, role: 1 } });
    if (!u) return false;
    // Tilgangen er 1:1 med det som er huket av under Brukere — også for
    // investorer. (Tidligere fikk investorer alltid Leieforhold; nå styres
    // alt eksplisitt slik at tilgangsstyringen aldri lyver.)
    return !!(Array.isArray(u.moduler) && u.moduler.includes(modul));
  } catch (e) { return false; }
}

// BOLIGINTERESSE UT TIL PLATTFORMEN: kø (sikkerhetsnett) + webhook (sanntid).
// Hele leveringslogikken — HMAC-signering, backoff, deep-links til samtalen —
// bor i lib/interest-webhook.js slik at den kan testes uten å gå via HTTP.

// Auth for agent-bro: admin ELLER delt AGENT_BRIDGE_SECRET (header x-bridge-token / ?token=).
function bridgeAuthed(request) {
  if (adminAuthed(request)) return true;
  return bridgeTokenAuthed(request);
}

// BARE det delte bro-tokenet — altså plattformen, ikke vår egen admin. Brukes
// der de to sidene ikke må gjøre samme jobb: svar til en interessent skal komme
// fra ÉN avsender, ellers får hun to e-poster og to tråder.
function bridgeTokenAuthed(request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token') || request.headers.get('x-bridge-token') || '';
    const secret = (process.env.AGENT_BRIDGE_SECRET || '').trim();
    return !!(secret && token === secret);
  } catch (e) { return false; }
}

// Re-forward leads/tenants som mangler VERIFISERT CRM-kvittering
// (forwarded !== true ELLER platform_id mangler), med
// durabel eksponentiell backoff: hver feilede forward planlegges på nytt
// (next_retry_at) slik at vi ikke hamrer plattformen når den er nede.
function backoffIso(attempts) {
  const mins = Math.min(Math.pow(2, Math.max(0, attempts)), 720); // 1,2,4,…,cap 12t
  return new Date(Date.now() + mins * 60000).toISOString();
}
async function reforwardPending(db) {
  const results = { leads: { tried: 0, ok: 0 }, tenants: { tried: 0, ok: 0 } };
  const nowIso = new Date().toISOString();
  // self_service ekskluderes: de provisjoneres via /api/bridge/self-service-customer
  // (plattformen speiler selv) — re-forward via /api/leads ville gitt duplikat.
  const dueFilter = {
    self_service: { $ne: true },
    $and: [
      { $or: [{ forwarded: { $ne: true } }, { platform_id: { $in: [null, ''] } }, { platform_id: { $exists: false } }] },
      { $or: [{ next_retry_at: { $exists: false } }, { next_retry_at: null }, { next_retry_at: { $lte: nowIso } }] },
    ],
  };
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
      ...forwardAuditFields(fwd, {
        previousPlatformId: lead.platform_id,
        previousForwardedAt: lead.forwarded_at,
        attempts,
      }),
      next_retry_at: fwd.ok ? null : backoffIso(attempts),
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
      ...forwardAuditFields(fwd, {
        previousPlatformId: t.platform_id,
        previousForwardedAt: t.forwarded_at,
        attempts,
      }),
      next_retry_at: fwd.ok ? null : backoffIso(attempts),
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
      ...forwardAuditFields(fwd),
      next_retry_at: fwd.ok ? null : backoffIso(1),
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

// ═══════════════════════ SAKER — internt sakssystem (styre-/selskapsnivå) ═══════════════════════
// Kolleksjoner: tasks (saker med innebygde kommentarer + aktivitetslogg) og task_members
// (personer som kan stå som ansvarlig — administreres av teamet selv i admin-UI-et).
// Bevisst IKKE koblet til leads/kunder: dette er intern selskapsoppfølging (styre osv.).
const TASK_STATUSES = ['inbox', 'doing', 'waiting', 'done'];
const TASK_STATUS_LABEL = { inbox: 'Ny', doing: 'Pågår', waiting: 'Venter', done: 'Ferdig' };
const TASK_PRI_LABEL = { 1: 'P1 · Kritisk', 2: 'P2 · Normal', 3: 'P3 · Lav' };
const TASK_FARGER = ['#8B5CF6', '#0EA5E9', '#F59E0B', '#10B981', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];
const osloIDag = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
const taskEsc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ── Markdown i e-post ───────────────────────────────────────────────────────
// Saksbeskrivelser/kommentarer skrives i Markdown (rik tekst-editoren i admin).
// E-postklienter ignorerer stylesheets/klasser → alt må inline-styles.
// Speiler frontendens renderRik: rå HTML nøytraliseres FØR parsing (XSS-trygt),
// kun http/mailto-lenker slipper gjennom. Interne saksbilder krever innlogging
// og kan ikke vises i e-post → kompakt «Bilde»-merke i stedet.
const _mdEpost = new Marked({ gfm: true, breaks: true });
const EPOST_MD_STIL = {
  p: 'margin:0 0 10px;color:#444;font-size:13.5px;line-height:1.6',
  h1: 'margin:14px 0 6px;color:#0a0a0a;font-size:16px;line-height:1.35;font-weight:700',
  h2: 'margin:14px 0 6px;color:#0a0a0a;font-size:15px;line-height:1.35;font-weight:700',
  h3: 'margin:12px 0 4px;color:#0a0a0a;font-size:14px;line-height:1.35;font-weight:700',
  ul: 'margin:0 0 10px;padding:0 0 0 20px;color:#444;font-size:13.5px;line-height:1.6',
  ol: 'margin:0 0 10px;padding:0 0 0 20px;color:#444;font-size:13.5px;line-height:1.6',
  li: 'margin:3px 0',
  strong: 'font-weight:700;color:#111',
  em: 'font-style:italic',
  code: "background:#f3f2f0;border-radius:5px;padding:1px 6px;font-size:12.5px;font-family:ui-monospace,'SF Mono',Menlo,monospace;color:#6d28d9",
  pre: 'background:#f6f5f3;border-radius:10px;padding:12px 14px;overflow:auto;font-size:12.5px;line-height:1.5;margin:0 0 10px',
  hr: 'border:none;border-top:1px solid #eee;margin:14px 0',
  blockquote: 'margin:0 0 10px;padding:2px 0 2px 12px;border-left:3px solid #d9d4f5;color:#666',
};
function mdTilEpost(kilde, maks = 1200) {
  let src = String(kilde || '').trim();
  if (!src) return '';
  const kuttet = src.length > maks;
  if (kuttet) src = src.slice(0, maks);
  // Nøytraliser rå HTML før parsing — brukerinnhold skal aldri bli markup.
  src = src.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let html = '';
  try { html = _mdEpost.parse(src); } catch (e) {
    return `<p style="${EPOST_MD_STIL.p};white-space:pre-wrap">${taskEsc(kilde).slice(0, maks)}</p>`;
  }
  const okUrl = (h) => /^(https?:|mailto:)/i.test(String(h || '').trim());
  // Bilder: interne (/api/admin/…) krever innlogging → merke; eksterne https vises.
  html = html.replace(/<img[^>]*?src="([^"]*)"[^>]*>/gi, (m, s) => (
    /^https:\/\//i.test(s)
      ? `<img src="${s}" alt="" style="max-width:100%;border-radius:10px;margin:6px 0" />`
      : '<span style="display:inline-block;background:#f3f2f0;color:#777;font-size:12px;border-radius:8px;padding:3px 10px;margin:2px 0">🖼 Bilde — åpne saken i admin</span>'
  ));
  // Lenker: kun http/mailto, DigiHome-lilla og god klikkbarhet.
  html = html.replace(/<a href="([^"]*)"[^>]*>/gi, (m, href) => (
    okUrl(href) ? `<a href="${href}" target="_blank" style="color:#7c3aed;font-weight:600;text-decoration:underline">` : '<a>'
  ));
  // Inline-stiler per element (h4–h6 arver h3-stilen).
  html = html.replace(/<(h[1-6]|p|ul|ol|li|strong|em|code|pre|hr|blockquote)(\s[^>]*)?\/?>/gi, (m, tag) => {
    const t = tag.toLowerCase();
    if (m.startsWith('</')) return m;
    const stil = EPOST_MD_STIL[/^h[4-6]$/.test(t) ? 'h3' : t];
    if (!stil) return m;
    return t === 'hr' ? `<hr style="${stil}" />` : `<${t} style="${stil}">`;
  });
  return html + (kuttet ? '<p style="margin:0;color:#b0aca6;font-size:12px">… forkortet — se hele saken i admin</p>' : '');
}
// Markdown → ren tekst (for utdrag i løpende setninger, f.eks. kommentarvarsler).
function mdTilRen(kilde, maks = 180) {
  let s = String(kilde || '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '(bilde)')       // bilder
    .replace(/\[([^\]]*)\]\(([^)]*)\)/g, '$1')          // [tekst](url) → tekst
    .replace(/^#{1,6}\s+/gm, '')                          // overskrifter
    .replace(/(\*\*|__)(.*?)\1/g, '$2')                   // fet
    .replace(/(\*|_)(.*?)\1/g, '$2')                      // kursiv
    .replace(/`{1,3}([^`]*)`{1,3}/g, '$1')                // kode
    .replace(/^\s*[-*+]\s+/gm, '· ')                      // punktlister
    .replace(/^\s*\d+\.\s+/gm, '')                        // nummererte lister
    .replace(/^\s*>\s?/gm, '')                             // sitat
    .replace(/\n{2,}/g, ' — ').replace(/\n/g, ' ')        // linjeskift
    .replace(/\s{2,}/g, ' ').trim();
  if (s.length > maks) s = `${s.slice(0, maks).trim()} …`;
  return s;
}

// E-postvarsel for saker (tildeling + påminnelse). Feiler stille — en sak skal
// aldri gå tapt fordi SendGrid er nede. Returnerer true hvis sendt.
async function taskEpost({ member, task, heading, intro, kategori }) {
  if (!member || !member.email || !emailConfigured()) return false;
  if (notifEmailAv(member, kategori)) return false; // bruker har skrudd av e-post for denne typen
  // Sentral synlighetsvakt: aldri e-post om saker mottakeren ikke kan se
  // (område/gruppe + per-sak-begrensning). Krever role+groups på member.
  if (!sakSynligForMedlem(member, task)) return false;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const frist = task.dueDate
    ? new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;
  const rad = (l, v) => `<tr><td style="padding:4px 14px 4px 0;color:#8a8a8a;font-size:13px;white-space:nowrap">${l}</td><td style="padding:4px 0;color:#111;font-size:13px;font-weight:600">${v}</td></tr>`;
  const html = `
  <div style="background:#f6f5f3;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#0a0a0a;padding:18px 24px"><span style="color:#fff;font-size:15px;font-weight:700">DigiHome</span> <span style="color:rgba(255,255,255,0.45);font-size:12px;margin-left:6px">Saker · intern</span></div>
      <div style="padding:26px 24px">
        <p style="margin:0;color:#8b5cf6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">${taskEsc(heading)}</p>
        <h2 style="margin:8px 0 4px;color:#0a0a0a;font-size:19px;line-height:1.3">${taskEsc(task.title)}</h2>
        <p style="margin:0 0 16px;color:#666;font-size:13.5px;line-height:1.55">${taskEsc(intro)}</p>
        ${task.description ? `<div style="background:#fafaf8;border:1px solid #f0eeea;border-radius:12px;padding:14px 16px 5px;margin:0 0 16px">${mdTilEpost(task.description, 1200)}</div>` : ''}
        <table style="border-collapse:collapse">${rad('Prioritet', TASK_PRI_LABEL[task.priority] || 'P2 · Normal')}${frist ? rad('Frist', taskEsc(frist)) : ''}${rad('Status', TASK_STATUS_LABEL[task.status] || taskEsc(task.status))}</table>
        <a href="${base}/admin/saker/${encodeURIComponent(task.id)}" style="display:inline-block;margin-top:20px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13.5px;font-weight:600;padding:11px 20px;border-radius:99px">Åpne saken →</a>
      </div>
    </div>
  </div>`;
  try {
    await sendHtmlEmail({ to: member.email, subject: `${heading}: ${task.title}`, html, fromName: 'DigiHome Saker', individual: false, categories: ['intern-sak'] });
    return true;
  } catch (e) {
    return false;
  }
}

// E-postvarsel når noen får ansvar for deloppgaver — én e-post per person per
// lagring (alle nye deloppgaver samles), med frist per deloppgave. Feiler stille.
async function deloppgaveEpost({ member, task, deloppgaver, actor }) {
  if (!member || !member.email || !emailConfigured() || !Array.isArray(deloppgaver) || !deloppgaver.length) return false;
  if (notifEmailAv(member, 'deloppgave')) return false;
  if (!sakSynligForMedlem(member, task)) return false; // ser ikke saken → ingen e-post
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const fmtFrist = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : null);
  const idag = osloIDag();
  const rader = deloppgaver.map((s) => {
    const frist = fmtFrist(s.due);
    const forfalt = s.due && s.due < idag;
    return `<tr>
      <td style="padding:7px 10px 7px 0;vertical-align:top"><span style="display:inline-block;width:13px;height:13px;border:2px solid #d9d4f7;border-radius:99px"></span></td>
      <td style="padding:5px 0;color:#111;font-size:13.5px;font-weight:600;line-height:1.45">${taskEsc(s.text)}
        <div style="color:${forfalt ? '#e11d48' : (frist ? '#b45309' : '#999')};font-size:12px;font-weight:${frist ? 600 : 400};margin-top:2px">${frist ? `Frist: ${taskEsc(frist)}${forfalt ? ' (forfalt)' : ''}` : 'Ingen frist'}</div>
      </td></tr>`;
  }).join('');
  const flertall = deloppgaver.length > 1;
  const html = `
  <div style="background:#f6f5f3;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
      <div style="background:#0a0a0a;padding:18px 24px"><span style="color:#fff;font-size:15px;font-weight:700">DigiHome</span> <span style="color:rgba(255,255,255,0.45);font-size:12px;margin-left:6px">Saker · intern</span></div>
      <div style="padding:26px 24px">
        <p style="margin:0;color:#8b5cf6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">${flertall ? 'Sjekklistepunkter tildelt deg' : 'Sjekklistepunkt tildelt deg'}</p>
        <h2 style="margin:8px 0 4px;color:#0a0a0a;font-size:19px;line-height:1.3">${taskEsc(task.title)}</h2>
        <p style="margin:0 0 14px;color:#666;font-size:13.5px;line-height:1.55">${taskEsc(actor)} ga deg ansvar for ${flertall ? `${deloppgaver.length} sjekklistepunkter` : 'et sjekklistepunkt'} i denne saken.</p>
        <table style="border-collapse:collapse;width:100%">${rader}</table>
        <a href="${base}/admin/saker/${encodeURIComponent(task.id)}" style="display:inline-block;margin-top:20px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13.5px;font-weight:600;padding:11px 20px;border-radius:99px">Åpne saken →</a>
      </div>
    </div>
  </div>`;
  try {
    await sendHtmlEmail({ to: member.email, subject: `${flertall ? 'Sjekklistepunkter' : 'Sjekklistepunkt'} tildelt deg: ${task.title}`, html, fromName: 'DigiHome Saker', individual: false, categories: ['intern-sak'] });
    return true;
  } catch (e) {
    return false;
  }
}

// ═══════════════════════ VARSLER (in-app innboks + e-postpreferanser) ═══════════════════════
// Kategorier for varsler. Innboksen i appen får ALLTID alle hendelser (billig,
// og brukeren styrer lesing selv). E-post kan derimot skrus av per kategori i
// den enkeltes varselinnstillinger (admin_users.notifPrefs.email.<kategori> === false).
const VARSEL_KATEGORIER = ['tildelt', 'nevnt', 'kommentar', 'deloppgave', 'status', 'frist', 'folger', 'paaminnelse'];
const VARSEL_LABEL = {
  tildelt: 'Sak tildelt deg', nevnt: 'Du blir nevnt (@)', kommentar: 'Ny kommentar på dine saker',
  deloppgave: 'Sjekklistepunkt tildelt deg', status: 'Statusendring på dine saker', frist: 'Fristpåminnelser',
  folger: 'Lagt til som følger', paaminnelse: 'Manuelle påminnelser (purring)',
};

// Har brukeren eksplisitt skrudd AV e-post for kategorien? (fail-open: mangler
// prefs eller kategori → e-post sendes som før).
function notifEmailAv(member, kategori) {
  return !!(kategori && member && member.notifPrefs && member.notifPrefs.email && member.notifPrefs.email[kategori] === false);
}

// Opprett in-app-varsel. Hopper over hvis mottaker mangler eller er aktøren
// selv (du varsles aldri om dine egne handlinger). Feiler stille — et varsel
// skal aldri velte selve operasjonen.
async function varsle(db, userId, actorId, { type, taskId, taskTitle, actor, text }) {
  if (!userId || (actorId && userId === actorId)) return;
  try {
    await db.collection('notifications').insertOne({
      id: uuidv4(), userId, type: type || 'info', taskId: taskId || null,
      taskTitle: String(taskTitle || '').slice(0, 200), actor: String(actor || '').slice(0, 80),
      text: String(text || '').slice(0, 300), read: false, createdAt: new Date().toISOString(),
    });
  } catch (e) { /* stille */ }
}

// Finn deloppgaver som har fått NY ansvarlig sammenlignet med forrige versjon
// (ny rad m/ ansvarlig, eller endret ansvarlig). Gruppert per person-id, slik
// at done-toggles og uendrede lagringer ALDRI re-varsler.
function nyeDeloppgaveTildelinger(nyeSub, gamleSub) {
  const gamleById = new Map((Array.isArray(gamleSub) ? gamleSub : []).map((s) => [s.id, s]));
  const perPerson = new Map();
  for (const s of (Array.isArray(nyeSub) ? nyeSub : [])) {
    if (!s.assigneeId) continue;
    const gammel = gamleById.get(s.id);
    if (gammel && gammel.assigneeId === s.assigneeId) continue; // uendret tildeling
    if (!perPerson.has(s.assigneeId)) perPerson.set(s.assigneeId, []);
    perPerson.get(s.assigneeId).push(s);
  }
  return perPerson;
}

// Gjentakelse: neste frist regnet fra forrige frist (eller i dag om frist mangler).
const TASK_REC = ['weekly', 'monthly', 'quarterly'];
const TASK_REC_LABEL = { weekly: 'Ukentlig', monthly: 'Månedlig', quarterly: 'Kvartalsvis' };
function nesteFrist(fraDato, freq) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(String(fraDato || '')) ? fraDato : osloIDag();
  const [y, m, d] = base.split('-').map(Number);
  let dt;
  if (freq === 'weekly') {
    dt = new Date(Date.UTC(y, m - 1, d + 7));
  } else {
    const mnd = freq === 'quarterly' ? 3 : 1;
    const maal = new Date(Date.UTC(y, m - 1 + mnd, 1));
    const sisteDag = new Date(Date.UTC(maal.getUTCFullYear(), maal.getUTCMonth() + 1, 0)).getUTCDate();
    dt = new Date(Date.UTC(maal.getUTCFullYear(), maal.getUTCMonth(), Math.min(d, sisteDag)));
  }
  return dt.toISOString().slice(0, 10);
}

// Deloppgaver (Linear-nivå): egen ansvarlig og frist per deloppgave.
// due = 'YYYY-MM-DD' eller null; assigneeId = person-id eller null.
function normaliserSubtasks(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).map((s) => ({
    id: (s && s.id) ? String(s.id) : uuidv4(),
    text: String((s && s.text) || '').slice(0, 300),
    done: !!(s && s.done),
    assigneeId: (s && s.assigneeId) ? String(s.assigneeId) : null,
    due: (s && /^\d{4}-\d{2}-\d{2}$/.test(String(s.due || ''))) ? String(s.due) : null,
  })).filter((s) => s.text);
}

// ─── Møter: typer, normalisering og e-post ───
const MOTE_TYPER = ['styremote', 'ledermote', 'annet'];
const MOTE_TYPE_LABEL = { styremote: 'Styremøte', ledermote: 'Ledermøte', annet: 'Møte' };

function normaliserAgenda(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).map((p) => ({
    id: (p && p.id) ? String(p.id) : uuidv4(),
    text: String((p && p.text) || '').slice(0, 400),
    done: !!(p && p.done),
  })).filter((p) => p.text);
}

function normaliserVedtak(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 40).map((v) => ({
    id: (v && v.id) ? String(v.id) : uuidv4(),
    text: String((v && v.text) || '').slice(0, 600),
  })).filter((v) => v.text);
}

// Møte-e-post (innkalling + referat) — bruker samme premium-ramme som
// konto-e-postene (authEpostHtml) slik at ALT teamet mottar ser likt ut.
async function moteEpost({ member, meeting, heading, intro, ekstraHtml = '', skjulAgenda = false, attachments }) {
  if (!member || !member.email || !emailConfigured()) return false;
  const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
  const fornavn = String(member.name || '').trim().split(/\s+/)[0] || 'der';
  const naar = meeting.datetime
    ? new Date(meeting.datetime).toLocaleString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })
    : 'Ikke fastsatt';
  const rad = (l, v) => `<tr><td style="padding:5px 16px 5px 0;color:#8a8a8a;font-size:13px;white-space:nowrap">${l}</td><td style="padding:5px 0;color:#111;font-size:13px;font-weight:600">${v}</td></tr>`;
  const agendaHtml = !skjulAgenda && (meeting.agenda || []).length
    ? `<p style="margin:18px 0 6px;color:#8b5cf6;font-size:11.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em">Agenda</p><ol style="margin:0;padding-left:18px;color:#444;font-size:13.5px;line-height:1.7">${meeting.agenda.map((p) => `<li>${taskEsc(p.text)}</li>`).join('')}</ol>`
    : '';
  const detaljer = `
        <div style="margin-top:20px;background:#fafaf8;border:1px solid #f0efed;border-radius:14px;padding:16px 20px">
          <table style="border-collapse:collapse">
            ${rad('Når', taskEsc(naar))}
            ${rad('Type', MOTE_TYPE_LABEL[meeting.type] || 'Møte')}
          </table>
        </div>
        ${agendaHtml}
        ${ekstraHtml}`;
  const html = authEpostHtml({
    eyebrow: heading,
    heading: meeting.title,
    intro: `Hei ${taskEsc(fornavn)} — ${intro}`,
    detaljerHtml: detaljer,
    ctaLabel: 'Åpne Møter i admin',
    ctaUrl: `${base}/admin`,
    gyldighet: '',
    sikkerhet: 'Du mottar denne e-posten fordi du står som deltaker i møtet i DigiHome Admin.',
    mottakerEpost: member.email,
    preheader: `${heading}: ${meeting.title} — ${naar}`,
    headerLabel: 'Møter · intern',
  });
  try {
    await sendHtmlEmail({ to: member.email, subject: `${heading}: ${meeting.title}`, html, fromName: 'DigiHome Møter', individual: false, categories: ['intern-mote'], attachments });
    return true;
  } catch (e) {
    return false;
  }
}

// Samler alt en protokoll trenger: deltakere + aksjonspunkter (aktive OG
// arkiverte, med ansvarlig-navn) for et møte. Brukes av PDF-nedlasting og
// referat-utsendelsen slik at MOM-en alltid er komplett.
async function hentProtokollData(db, meeting) {
  const [deltakere, alleTasks] = await Promise.all([
    db.collection('admin_users').find({ id: { $in: meeting.attendees || [] } }).project({ _id: 0, id: 1, name: 1, email: 1, tittel: 1 }).toArray(),
    db.collection('tasks').find({ meetingId: meeting.id }).project({ _id: 0, id: 1, title: 1, status: 1, dueDate: 1, assigneeId: 1, assigneeIds: 1, archived: 1 }).toArray(),
  ]);
  const navnPaa = new Map((await db.collection('admin_users').find({}).project({ _id: 0, id: 1, name: 1 }).toArray()).map((p) => [p.id, p.name]));
  const aksjoner = alleTasks.map((t) => {
    const ids = Array.isArray(t.assigneeIds) && t.assigneeIds.length ? t.assigneeIds : (t.assigneeId ? [t.assigneeId] : []);
    return {
      ...t,
      archived: !!t.archived,
      ansvarligNavn: ids.map((id) => navnPaa.get(id)).filter(Boolean).join(', ') || '',
    };
  });
  return { deltakere, aksjoner };
}

// Følgere: personer som IKKE er hovedansvarlig, men vil holdes orientert.
// De varsles når de legges til og når noen purrer på saken.
function normaliserFolgere(input) {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.map((s) => String(s || '')).filter(Boolean))].slice(0, 10);
}

// Sak-relasjoner (Linear-nivå): blocks / blocked_by / related / duplicate.
const REL_TYPER = ['blocks', 'blocked_by', 'related', 'duplicate'];
const REL_INVERS = { blocks: 'blocked_by', blocked_by: 'blocks', related: 'related', duplicate: 'duplicate' };
function normaliserRelasjoner(input) {
  if (!Array.isArray(input)) return [];
  const ut = [];
  const sett = new Set();
  for (const r of input.slice(0, 40)) {
    if (!r || !REL_TYPER.includes(r.type) || !r.taskId) continue;
    const n = `${r.type}:${r.taskId}`;
    if (sett.has(n)) continue;
    sett.add(n);
    ut.push({ type: r.type, taskId: String(r.taskId) });
  }
  return ut;
}
// Speil relasjonene på motparten slik at «A blocks B» også vises som
// «B blocked_by A». Kalles ved endring av en saks relasjoner.
async function synkRelasjoner(db, taskId, gamle, nye) {
  const nokkel = (r) => `${r.type}:${r.taskId}`;
  const gS = new Set((gamle || []).map(nokkel));
  const nS = new Set((nye || []).map(nokkel));
  const lagtTil = (nye || []).filter((r) => !gS.has(nokkel(r)));
  const fjernet = (gamle || []).filter((r) => !nS.has(nokkel(r)));
  for (const r of lagtTil) {
    const inv = { type: REL_INVERS[r.type], taskId };
    await db.collection('tasks').updateOne({ id: r.taskId, 'relations.type': { $ne: inv.type }, 'relations.taskId': { $ne: taskId } }, { $push: { relations: inv } }).catch(() => {});
    // Robust variant (dekker mangel på $ne-kombinasjon): fjern evt. duplikat først.
    await db.collection('tasks').updateOne({ id: r.taskId }, { $pull: { relations: { type: inv.type, taskId } } }).catch(() => {});
    await db.collection('tasks').updateOne({ id: r.taskId }, { $push: { relations: inv } }).catch(() => {});
  }
  for (const r of fjernet) {
    const inv = { type: REL_INVERS[r.type], taskId };
    await db.collection('tasks').updateOne({ id: r.taskId }, { $pull: { relations: { type: inv.type, taskId } } }).catch(() => {});
  }
}

// Engangs-migrering: task_members → admin_users. Én kilde for personer OG
// kontoer: en person kan stå som ansvarlig, og kan (valgfritt) logge inn med
// rolle 'admin' eller 'bruker'. Matcher på e-post for å unngå duplikater.
let _migrertPersoner = false;
async function ensurePersonMigration(db) {
  if (_migrertPersoner) return;
  try {
    const meta = await db.collection('task_meta').findOne({ id: 'personer-migrert' });
    if (meta) { _migrertPersoner = true; return; }
    const gamle = await db.collection('task_members').find({}).toArray();
    for (const m of gamle) {
      const epost = String(m.email || '').trim().toLowerCase();
      const eksisterende = epost ? await db.collection('admin_users').findOne({ email: epost }) : null;
      if (eksisterende) {
        if (eksisterende.id !== m.id) {
          await db.collection('tasks').updateMany({ assigneeId: m.id }, { $set: { assigneeId: eksisterende.id } });
        }
        if (!eksisterende.color && m.color) {
          await db.collection('admin_users').updateOne({ id: eksisterende.id }, { $set: { color: m.color } });
        }
      } else {
        const finnesId = await db.collection('admin_users').findOne({ id: m.id });
        if (!finnesId) {
          await db.collection('admin_users').insertOne({
            id: m.id, email: epost, name: m.name, color: m.color || TASK_FARGER[0],
            role: 'bruker', createdAt: m.createdAt || new Date().toISOString(),
          });
        }
      }
    }
    await db.collection('task_meta').updateOne({ id: 'personer-migrert' }, { $set: { at: new Date().toISOString() } }, { upsert: true });
    _migrertPersoner = true;
  } catch (e) { /* prøver igjen ved neste kall */ }
}

// Personliste uten hemmeligheter + harPassord-flagg (om kontoen kan logge inn).
async function hentPersoner(db) {
  await ensurePersonMigration(db);
  const rader = await db.collection('admin_users').find({}).sort({ createdAt: 1 }).toArray();
  return rader.map((u, i) => ({
    id: u.id,
    name: u.name || u.email || 'Ukjent',
    email: u.email || '',
    color: u.color || TASK_FARGER[i % TASK_FARGER.length],
    role: u.role || 'admin',
    tittel: u.tittel || '',
    groups: Array.isArray(u.groups) ? u.groups.filter((g) => SAK_GRUPPER.includes(g)) : [],
    moteTilgang: Array.isArray(u.moteTilgang) ? u.moteTilgang : [],
    moduler: Array.isArray(u.moduler) ? u.moduler : [],
    harPassord: !!u.passwordHash,
    invitedAt: u.invitedAt || '',
    createdAt: u.createdAt || '',
  }));
}

// Daglig frist-digest (lazy-cron): første summary-kall etter kl. 07 Oslo
// claimer dagen ATOMISK (unik indeks + betinget upsert) og sender én
// samle-e-post per ansvarlig med forfalte + dagens saker. Ingen egen
// scheduler trengs — badge-pollingen (90 s) driver den så lenge noen
// har portalen åpen i løpet av dagen.
async function kanskjeSendFristDigest(db) {
  try {
    if (!emailConfigured()) return;
    const iDag = osloIDag();
    const time = Number(new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', hour: '2-digit', hour12: false }).format(new Date()));
    if (time < 7) return;
    try { await db.collection('task_meta').createIndex({ id: 1 }, { unique: true }); } catch (e) {}
    let claimet = false;
    try {
      const r = await db.collection('task_meta').updateOne(
        { id: 'frist-digest', sist: { $ne: iDag } },
        { $set: { sist: iDag } },
        { upsert: true },
      );
      claimet = r.modifiedCount > 0 || !!r.upsertedId;
    } catch (e) { claimet = false; /* duplikatnøkkel = en annen forespørsel vant */ }
    if (!claimet) return;
    const saker = await db.collection('tasks')
      .find({ status: { $ne: 'done' }, archived: { $ne: true }, dueDate: { $lte: iDag, $ne: null }, assigneeId: { $ne: null } })
      .project({ _id: 0 }).toArray();
    if (!saker.length) return;
    const perPerson = new Map();
    for (const t of saker) {
      if (!perPerson.has(t.assigneeId)) perPerson.set(t.assigneeId, []);
      perPerson.get(t.assigneeId).push(t);
    }
    const base = (process.env.NEXT_PUBLIC_BASE_URL || 'https://digihome.no').replace(/\/$/, '');
    for (const [pid, liste] of perPerson) {
      const member = await db.collection('admin_users').findOne({ id: pid });
      if (!member || !member.email) continue;
      const rader = liste.map((t) => {
        const forfalt = t.dueDate < iDag;
        return `<tr><td style="padding:7px 10px 7px 0;color:${forfalt ? '#e11d48' : '#b45309'};font-size:12px;font-weight:700;white-space:nowrap">${forfalt ? 'Forfalt' : 'I dag'}</td><td style="padding:7px 0;font-size:13.5px;font-weight:600"><a href="${base}/admin/saker/${encodeURIComponent(t.id)}" style="color:#111;text-decoration:none">${taskEsc(t.title)}</a></td><td style="padding:7px 0 7px 12px;color:#999;font-size:12px;white-space:nowrap">${taskEsc(t.dueDate)}</td></tr>`;
      }).join('');
      const html = `
      <div style="background:#f6f5f3;padding:32px 16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif">
        <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #eee">
          <div style="background:#0a0a0a;padding:18px 24px"><span style="color:#fff;font-size:15px;font-weight:700">DigiHome</span> <span style="color:rgba(255,255,255,0.45);font-size:12px;margin-left:6px">Saker · dagens frister</span></div>
          <div style="padding:26px 24px">
            <h2 style="margin:0 0 6px;color:#0a0a0a;font-size:18px">God morgen, ${taskEsc((member.name || '').split(' ')[0])}</h2>
            <p style="margin:0 0 14px;color:#666;font-size:13.5px">Du har ${liste.length} ${liste.length === 1 ? 'sak' : 'saker'} med frist i dag eller tidligere:</p>
            <table style="border-collapse:collapse;width:100%">${rader}</table>
            <a href="${base}/admin/saker" style="display:inline-block;margin-top:18px;background:#0a0a0a;color:#fff;text-decoration:none;font-size:13.5px;font-weight:600;padding:11px 20px;border-radius:99px">Åpne Saker →</a>
          </div>
        </div>
      </div>`;
      try {
        await sendHtmlEmail({ to: member.email, subject: `Dagens saker (${liste.length}) — frister å følge opp`, html, fromName: 'DigiHome Saker', individual: false, categories: ['intern-sak-digest'] });
      } catch (e) { /* neste person */ }
    }
  } catch (e) { /* digest skal aldri velte summary-kallet */ }
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
      if (!suggestions || suggestions.length === 0) {
        // Fallback OGSÅ ved tomt Google-svar: Geonorge/matrikkelen er det
        // autoritative registeret — nyregistrerte adresser finnes der først.
        const geo = await geonorgeSearch(q);
        if (!suggestions || (geo && geo.length)) { suggestions = geo || []; source = 'geonorge'; }
      }
      const res = cors(NextResponse.json({ suggestions, source }));
      // La nettleseren cache identiske søk kort (rask gjentatt skriving/sletting).
      // Tomme svar caches kortere — forbigående feil skal ikke bli «klistrende».
      res.headers.set('Cache-Control', suggestions.length ? 'private, max-age=120' : 'private, max-age=30');
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

    // --- Selskapsoppslag i Enhetsregisteret (navn ELLER organisasjonsnummer) ---
    // Brukes av huseier-registreringen når boligen eies av et selskap. Et fritt
    // skrevet selskapsnavn er en gjetning; et org.nr fra registeret er en
    // identitet — og det er den som skal stå på leiekontrakt, honoraravtale og
    // faktura. Vi går via server for å slippe CORS, kunne cache, og for å
    // slippe å belaste et fellesgode-register med halvferdige søk.
    if (route === '/brreg' && method === 'GET') {
      if (!rateLimit(clientIp(request), 40)) {
        return cors(NextResponse.json({ ok: false, error: 'For mange søk. Vent litt.' }, { status: 429 }));
      }
      const q = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 180);
      const res = await searchBrreg(q);
      // Alltid HTTP 200: «fant ingenting» og «ugyldig kontrollsiffer» er svar
      // skjemaet skal vise pent, ikke feil som skal velte autocomplete.
      return cors(NextResponse.json(res));
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
    // FRISTPÅMINNELSER — manuell/ekstern trigger. Kjøres normalt av den interne
    // dagsplanleggeren (lib/reminder-scheduler.js), men kan trigges eksternt
    // (f.eks. en cron-tjeneste) eller manuelt for testing. Idempotent per dag/sak.
    // Auth: masternøkkel (adminAuthed) ELLER header x-cron-secret === CRON_SECRET.
    // ?dryRun=1 → tell kandidater uten å sende eller låse noe.
    if (route === '/cron/reminders' && (method === 'POST' || method === 'GET')) {
      const cronSecret = (process.env.CRON_SECRET || '').trim();
      const gittSecret = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('cronSecret') || '';
      const secretOk = cronSecret && gittSecret && gittSecret === cronSecret;
      if (!secretOk && !adminAuthed(request)) {
        return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      }
      const dryRun = ['1', 'true'].includes((new URL(request.url).searchParams.get('dryRun') || '').toLowerCase());
      const daily = ['1', 'true'].includes((new URL(request.url).searchParams.get('daily') || '').toLowerCase());
      // daily=1 (brukt av den interne planleggeren): kjør maks ÉN gang per
      // kalenderdag via atomisk lås i cron_runs — trygt ved omstart/flere instanser.
      if (daily && !dryRun) {
        const idag = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo' }).format(new Date());
        const laasKey = `reminders:${idag}`;
        const laas = await db.collection('cron_runs').updateOne(
          { key: laasKey },
          { $setOnInsert: { key: laasKey, at: new Date().toISOString() } },
          { upsert: true },
        );
        if (laas.upsertedCount !== 1) {
          return cors(NextResponse.json({ ok: true, ran: false, reason: 'already-ran-today', dato: idag }));
        }
      }
      const summary = await runDueReminders(db, { dryRun });
      // Budsjett: frys forrige måneds faktiske tall (idempotent — fanger kun
      // avsluttede måneder som mangler snapshot, inkl. auto-kostnader for den
      // sist avsluttede). Feil her skal aldri velte påminnelses-kjøringen.
      let snapshots = null;
      if (!dryRun) {
        try { snapshots = await fangFaktiskEtterslep(db); } catch (e) { snapshots = { error: e.message }; }
      }
      return cors(NextResponse.json({ ok: true, ran: true, ...summary, budsjettSnapshots: snapshots }));
    }

    // ──────────────────────────────────────────────────────────────────────
    if (route === '/admin/auth/login' && method === 'POST') {
      // Rate-limit mot passord-brute-force: maks 10 forsøk/min per IP.
      if (!rateLimit(`login:${clientIp(request)}`, 10)) {
        return cors(NextResponse.json({ ok: false, error: 'For mange forsøk — vent litt og prøv igjen' }, { status: 429 }));
      }
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
      const token = signSession({ sub: user.id, email: user.email, role: user.role || 'admin', exp });
      return cors(NextResponse.json({
        ok: true,
        token,
        exp,
        user: { email: user.email, name: user.name || '', role: user.role || 'admin', moduler: Array.isArray(user.moduler) ? user.moduler : [] },
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
        user: {
          email: payload.email, name: (user && user.name) || '', role: (user && user.role) || 'admin',
          moduler: (user && Array.isArray(user.moduler)) ? user.moduler : [],
          moteTilgang: (user && Array.isArray(user.moteTilgang)) ? user.moteTilgang : [],
          // Omvisninger brukeren har sett (f.eks. 'leieforhold') — styrer auto-start.
          tourSett: (user && Array.isArray(user.tourSett)) ? user.tourSett : [],
          // «Se som»-økt: klienten viser banner + «Tilbake til admin» når satt.
          ...(payload.imp ? { impersonatedBy: { name: (payload.imp.name || 'Admin'), email: (payload.imp.email || '') } } : {}),
        },
      }));
    }

    // ── «Logg inn som bruker» (impersonering): admin/owner kan midlertidig se
    // portalen som en annen konto for å verifisere tilgang og innhold. Utsteder
    // en KORT sesjon (1 t) med MÅL-brukerens identitet + imp-metadata om hvem
    // som imiterer — all server-side tilgangsstyring følger dermed mål-brukeren
    // automatisk. Sikring: kun ekte admin (aldri fra en pågående «se som»-økt),
    // aldri seg selv, aldri owner-kontoen. Hver oppstart audit-logges.
    if (route === '/admin/impersonate' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sesjonImp = sessionFra(request);
      if (sesjonImp && sesjonImp.imp) {
        return cors(NextResponse.json({ ok: false, error: 'Du er allerede i en «se som»-økt — gå tilbake til admin først' }, { status: 400 }));
      }
      let bodyImp = {}; try { bodyImp = await request.json(); } catch (e) {}
      const targetImp = await db.collection('admin_users').findOne({ id: String(bodyImp.userId || '') });
      if (!targetImp) return cors(NextResponse.json({ ok: false, error: 'Fant ikke brukeren' }, { status: 404 }));
      if (sesjonImp && sesjonImp.sub === targetImp.id) {
        return cors(NextResponse.json({ ok: false, error: 'Du kan ikke se portalen som deg selv' }, { status: 400 }));
      }
      if (targetImp.role === 'owner') {
        return cors(NextResponse.json({ ok: false, error: 'Eier-kontoen kan ikke imiteres' }, { status: 403 }));
      }
      // Hvem imiterer? Masternøkkelen har ingen sesjon — logges som det.
      let impAv = { sub: null, name: 'Masternøkkel', email: '' };
      if (sesjonImp && sesjonImp.sub) {
        try {
          const megImp = await db.collection('admin_users').findOne({ id: sesjonImp.sub }, { projection: { _id: 0, name: 1, email: 1 } });
          impAv = { sub: sesjonImp.sub, name: (megImp && megImp.name) || sesjonImp.email || 'Admin', email: (megImp && megImp.email) || sesjonImp.email || '' };
        } catch (e) { impAv = { sub: sesjonImp.sub, name: sesjonImp.email || 'Admin', email: sesjonImp.email || '' }; }
      }
      const expImp = Date.now() + 60 * 60 * 1000; // 1 time — kort og trygt
      const tokenImp = signSession({ sub: targetImp.id, email: targetImp.email || '', role: targetImp.role || 'bruker', exp: expImp, imp: impAv });
      if (!tokenImp) return cors(NextResponse.json({ ok: false, error: 'Sesjonssignering er ikke konfigurert' }, { status: 500 }));
      try {
        await db.collection('impersonation_log').insertOne({
          id: uuidv4(), adminId: impAv.sub, adminEmail: impAv.email || 'masternøkkel', adminName: impAv.name,
          targetId: targetImp.id, targetEmail: targetImp.email || '', targetName: targetImp.name || '',
          targetRole: targetImp.role || 'bruker', at: new Date().toISOString(),
        });
      } catch (e) { /* stille — audit skal ikke velte selve handlingen */ }
      return cors(NextResponse.json({
        ok: true, token: tokenImp, exp: expImp,
        user: {
          email: targetImp.email || '', name: targetImp.name || '', role: targetImp.role || 'bruker',
          moduler: Array.isArray(targetImp.moduler) ? targetImp.moduler : [],
          impersonatedBy: { name: impAv.name, email: impAv.email },
        },
      }));
    }

    // Bekreft eget passord — brukes som ekstra sikring foran destruktive
    // handlinger (f.eks. sletting av saker). Masternøkkelen trenger ikke
    // passord (den ER legitimasjonen); innloggede kontoer må oppgi sitt eget.
    // Rate-limited slik at endepunktet ikke kan brukes til passordgjetting.
    if (route === '/admin/auth/bekreft' && method === 'POST') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`auth-bekreft:${clientIp(request)}`, 10)) {
        return cors(NextResponse.json({ ok: false, error: 'For mange forsøk — vent litt og prøv igjen' }, { status: 429 }));
      }
      const uB = new URL(request.url);
      const masterB = !!ADMIN_KEY && ((uB.searchParams.get('key') || request.headers.get('x-admin-key') || '') === ADMIN_KEY);
      if (masterB) return cors(NextResponse.json({ ok: true, master: true }));
      let bodyB = {}; try { bodyB = await request.json(); } catch (e) {}
      const sesjonB = sessionFra(request);
      const megB = sesjonB && sesjonB.sub ? await db.collection('admin_users').findOne({ id: sesjonB.sub }) : null;
      if (!megB || !megB.passwordHash) return cors(NextResponse.json({ ok: false, error: 'Kontoen mangler passord' }, { status: 403 }));
      if (!verifyPassword(String(bodyB.password || ''), megB.passwordHash)) {
        return cors(NextResponse.json({ ok: false, error: 'Feil passord' }, { status: 403 }));
      }
      return cors(NextResponse.json({ ok: true }));
    }

    // ──────────────────────────────────────────────────────────────────────
    // Konto-flyt: glemt passord, magic link og aktivering av invitasjon.
    // Alle endepunkter er offentlige men rate-limitede; e-postendepunktene
    // svarer ALLTID ok:true for å ikke lekke hvilke kontoer som finnes.
    // testToken returneres KUN for udeliverbare testadresser (QA) — de kan
    // aldri motta ekte e-post, og kallende er uansett den som ba om lenken.
    // ──────────────────────────────────────────────────────────────────────

    // Glemt passord → reset-lenke (1 t). Ikke-aktivert konto får i stedet ny
    // invitasjon (samme utfall for brukeren: velge passord).
    if (route === '/admin/auth/glemt' && method === 'POST') {
      if (!rateLimit(`auth-glemt:${clientIp(request)}`, 6)) {
        return cors(NextResponse.json({ ok: false, error: 'For mange forsøk — vent litt og prøv igjen' }, { status: 429 }));
      }
      let body = {}; try { body = await request.json(); } catch (e) {}
      const email = (body.email || '').toString().trim().toLowerCase();
      if (!email) return cors(NextResponse.json({ ok: false, error: 'Fyll inn e-post' }, { status: 400 }));
      await ensureAdminUsers(db);
      const user = await db.collection('admin_users').findOne({ email });
      let testToken = null;
      if (user) {
        if (user.passwordHash) {
          const raw = await lagAuthToken(db, { userId: user.id, email, type: 'reset' });
          await sendResetEpost({ member: user, rawToken: raw });
          if (isUndeliverableTestAddress(email)) testToken = { type: 'reset', token: raw };
        } else {
          const raw = await lagAuthToken(db, { userId: user.id, email, type: 'invite' });
          await db.collection('admin_users').updateOne({ id: user.id }, { $set: { invitedAt: new Date().toISOString() } });
          await sendVelkomstEpost({ member: user, rawToken: raw, invitertAv: 'DigiHome' });
          if (isUndeliverableTestAddress(email)) testToken = { type: 'invite', token: raw };
        }
      }
      return cors(NextResponse.json({ ok: true, ...(testToken ? { testToken } : {}) }));
    }

    // Magic link → engangs innloggingslenke (15 min). Kun aktiverte kontoer;
    // ikke-aktiverte med e-post får ny invitasjon i stedet.
    if (route === '/admin/auth/magic' && method === 'POST') {
      if (!rateLimit(`auth-magic:${clientIp(request)}`, 6)) {
        return cors(NextResponse.json({ ok: false, error: 'For mange forsøk — vent litt og prøv igjen' }, { status: 429 }));
      }
      let body = {}; try { body = await request.json(); } catch (e) {}
      const email = (body.email || '').toString().trim().toLowerCase();
      if (!email) return cors(NextResponse.json({ ok: false, error: 'Fyll inn e-post' }, { status: 400 }));
      await ensureAdminUsers(db);
      const user = await db.collection('admin_users').findOne({ email });
      let testToken = null;
      if (user) {
        if (user.passwordHash) {
          const raw = await lagAuthToken(db, { userId: user.id, email, type: 'magic' });
          await sendMagicEpost({ member: user, rawToken: raw });
          if (isUndeliverableTestAddress(email)) testToken = { type: 'magic', token: raw };
        } else {
          const raw = await lagAuthToken(db, { userId: user.id, email, type: 'invite' });
          await db.collection('admin_users').updateOne({ id: user.id }, { $set: { invitedAt: new Date().toISOString() } });
          await sendVelkomstEpost({ member: user, rawToken: raw, invitertAv: 'DigiHome' });
          if (isUndeliverableTestAddress(email)) testToken = { type: 'invite', token: raw };
        }
      }
      return cors(NextResponse.json({ ok: true, ...(testToken ? { testToken } : {}) }));
    }

    // Magic link → sesjon (engangs; markeres brukt FØR token utstedes).
    if (route === '/admin/auth/magic/verify' && method === 'POST') {
      let body = {}; try { body = await request.json(); } catch (e) {}
      const hit = await verifiserAuthToken(db, (body.token || '').toString(), 'magic');
      if (!hit) return cors(NextResponse.json({ ok: false, error: 'Lenken er utløpt eller allerede brukt' }, { status: 401 }));
      await brukAuthToken(db, hit.doc.id);
      const exp = Date.now() + SESSION_TTL_MS;
      const token = signSession({ sub: hit.user.id, email: hit.user.email, role: hit.user.role || 'admin', exp });
      return cors(NextResponse.json({
        ok: true, token, exp,
        user: { email: hit.user.email, name: hit.user.name || '', role: hit.user.role || 'admin', moduler: Array.isArray(hit.user.moduler) ? hit.user.moduler : [] },
      }));
    }

    // Token-info (invite/reset): valider UTEN å konsumere — brukes av
    // «Velg passord»-skjermen for å hilse med navn og fange utløpte lenker.
    if (route === '/admin/auth/token-info' && method === 'GET') {
      const u = new URL(request.url);
      const type = u.searchParams.get('type') === 'reset' ? 'reset' : 'invite';
      const hit = await verifiserAuthToken(db, (u.searchParams.get('token') || '').toString(), type);
      if (!hit) return cors(NextResponse.json({ ok: false, error: 'Lenken er ugyldig, utløpt eller allerede brukt' }, { status: 410 }));
      return cors(NextResponse.json({
        ok: true, type,
        name: hit.user.name || '', email: hit.user.email || '', role: hit.user.role || 'bruker',
      }));
    }

    // Aktiver invitasjon → brukeren VELGER EGET passord → logges rett inn.
    if (route === '/admin/auth/aktiver' && method === 'POST') {
      let body = {}; try { body = await request.json(); } catch (e) {}
      const pw = (body.password || '').toString();
      if (pw.length < 8) return cors(NextResponse.json({ ok: false, error: 'Passord må ha minst 8 tegn' }, { status: 400 }));
      const hit = await verifiserAuthToken(db, (body.token || '').toString(), 'invite');
      if (!hit) return cors(NextResponse.json({ ok: false, error: 'Lenken er ugyldig, utløpt eller allerede brukt' }, { status: 410 }));
      await brukAuthToken(db, hit.doc.id);
      await invaliderBrukerTokens(db, hit.user.id);
      await db.collection('admin_users').updateOne(
        { id: hit.user.id },
        { $set: { passwordHash: hashPassword(pw), activatedAt: new Date().toISOString() } }
      );
      const exp = Date.now() + SESSION_TTL_MS;
      const token = signSession({ sub: hit.user.id, email: hit.user.email, role: hit.user.role || 'bruker', exp });
      return cors(NextResponse.json({
        ok: true, token, exp,
        user: { email: hit.user.email, name: hit.user.name || '', role: hit.user.role || 'bruker' },
      }));
    }

    // Nytt passord via reset-lenke → logges rett inn.
    if (route === '/admin/auth/reset' && method === 'POST') {
      let body = {}; try { body = await request.json(); } catch (e) {}
      const pw = (body.password || '').toString();
      if (pw.length < 8) return cors(NextResponse.json({ ok: false, error: 'Passord må ha minst 8 tegn' }, { status: 400 }));
      const hit = await verifiserAuthToken(db, (body.token || '').toString(), 'reset');
      if (!hit) return cors(NextResponse.json({ ok: false, error: 'Lenken er ugyldig, utløpt eller allerede brukt' }, { status: 410 }));
      await brukAuthToken(db, hit.doc.id);
      await invaliderBrukerTokens(db, hit.user.id);
      await db.collection('admin_users').updateOne(
        { id: hit.user.id },
        { $set: { passwordHash: hashPassword(pw) } }
      );
      const exp = Date.now() + SESSION_TTL_MS;
      const token = signSession({ sub: hit.user.id, email: hit.user.email, role: hit.user.role || 'admin', exp });
      return cors(NextResponse.json({
        ok: true, token, exp,
        user: { email: hit.user.email, name: hit.user.name || '', role: hit.user.role || 'admin', moduler: Array.isArray(hit.user.moduler) ? hit.user.moduler : [] },
      }));
    }

    // Min profil: alle innloggede kontoer (admin OG bruker) kan endre eget
    // navn, egen farge og eget passord. Krever PERSONLIG sesjon (masternøkkel
    // har ingen identitet), og passordbytte krever gjeldende passord.
    // E-post og rolle endres kun av admin via /admin/users.
    if (route === '/admin/auth/profile' && method === 'PUT') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sesjon = sessionFra(request);
      if (!sesjon || !sesjon.sub) return cors(NextResponse.json({ ok: false, error: 'Krever personlig innlogging (ikke masternøkkel)' }, { status: 400 }));
      const meg = await db.collection('admin_users').findOne({ id: sesjon.sub });
      if (!meg) return cors(NextResponse.json({ ok: false, error: 'Kontoen finnes ikke lenger' }, { status: 404 }));
      let body = {}; try { body = await request.json(); } catch (e) {}
      const set = {};
      if (body.name !== undefined) {
        const n = String(body.name).trim().slice(0, 80);
        if (!n) return cors(NextResponse.json({ ok: false, error: 'Navn kan ikke være tomt' }, { status: 400 }));
        set.name = n;
      }
      // «Omvisning sett»-kvittering: ufarlig egen-preferanse — alle innloggede
      // roller (også lese-only investor) kan markere en tour som sett på SIN konto.
      if (body.tourSett !== undefined) {
        const tourKey = String(body.tourSett).trim().toLowerCase().slice(0, 40);
        if (/^[a-z0-9-]{2,40}$/.test(tourKey)) {
          await db.collection('admin_users').updateOne({ id: meg.id }, { $addToSet: { tourSett: tourKey } });
          if (body.name === undefined && body.password === undefined && body.color === undefined) {
            return cors(NextResponse.json({ ok: true }));
          }
        }
      }
      if (body.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.color))) set.color = body.color;
      if (body.password !== undefined && body.password) {
        const pw = String(body.password);
        if (pw.length < 8) return cors(NextResponse.json({ ok: false, error: 'Passord må ha minst 8 tegn' }, { status: 400 }));
        if (meg.passwordHash && !verifyPassword(String(body.currentPassword || ''), meg.passwordHash)) {
          return cors(NextResponse.json({ ok: false, error: 'Feil nåværende passord' }, { status: 401 }));
        }
        set.passwordHash = hashPassword(pw);
      }
      if (!Object.keys(set).length) return cors(NextResponse.json({ ok: false, error: 'Ingenting å endre' }, { status: 400 }));
      await db.collection('admin_users').updateOne({ id: meg.id }, { $set: set });
      if (set.passwordHash) {
        try { await invaliderBrukerTokens(db, meg.id); } catch (e) {}
      }
      const member = (await hentPersoner(db)).find((m) => m.id === meg.id) || null;
      return cors(NextResponse.json({
        ok: true, member,
        user: { email: meg.email || '', name: set.name || meg.name || '', role: meg.role || 'admin' },
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
        // Persistent adresse→matrikkel-cache: tidligere oppslåtte adresser
        // fungerer selv når Kartverket er nede (matrikkelnr endres ikke).
        const addrKey = address.toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
        let cachedAddr = null;
        try { cachedAddr = await db.collection('addr_matrikkel_cache').findOne({ key: addrKey }, { projection: { _id: 0 } }); } catch (e) {}
        if (cachedAddr && cachedAddr.matrikkel) {
          matrikkel = cachedAddr.matrikkel;
        } else {
          matrikkel = await addressToMatrikkel(address);
          if (matrikkel && matrikkel.unavailable) {
            // Kartverket svarer ikke — dette er IKKE «adressen finnes ikke».
            // 502 (ikke 503): frontenden viser da «prøv igjen»-melding i stedet
            // for å skjule registeret helt (503 = modulen er avslått).
            return cors(NextResponse.json({ status: 'error', message: 'Kartverket svarer ikke akkurat nå. Prøv igjen om litt.' }, { status: 502 }));
          }
          if (!matrikkel) {
            return cors(NextResponse.json({ status: 'not_found', message: 'Fant ikke adressen i Kartverket' }, { status: 404 }));
          }
          try {
            await db.collection('addr_matrikkel_cache').updateOne(
              { key: addrKey },
              { $set: { key: addrKey, matrikkel, updated_at: new Date().toISOString() } },
              { upsert: true },
            );
          } catch (e) { /* best-effort */ }
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

    // ═══════════════ SAKER: internt sakssystem — CRUD + personer + varsling ═══════════════

    // --- Personer & kontoer (/admin/users): navn, e-post, farge, ROLLE
    //     ('admin' | 'bruker') og valgfritt passord (gir innlogging på /admin;
    //     rollen 'bruker' har kun tilgang til Saker). Listen er åpen for alle
    //     med saker-tilgang; alle endringer er admin-only. Eier-kontoen kan
    //     bare endres av eieren selv (eller master-nøkkelen) og aldri slettes.
    if (route === '/admin/users' && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const members = await hentPersoner(db);
      return cors(NextResponse.json({ ok: true, members }));
    }

    if (route === '/admin/users' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const name = String(body.name || '').trim();
      if (!name) return cors(NextResponse.json({ ok: false, error: 'Navn er påkrevd' }, { status: 400 }));
      const email = String(body.email || '').trim().toLowerCase();
      const role = ['admin', 'bruker', 'partner', 'eier', 'investor'].includes(body.role) ? body.role : 'bruker';
      const password = String(body.password || '');
      const invite = !!body.invite;
      if (invite && !email) return cors(NextResponse.json({ ok: false, error: 'Invitasjon krever e-post' }, { status: 400 }));
      if (invite && password) return cors(NextResponse.json({ ok: false, error: 'Velg enten passord eller e-postinvitasjon — ikke begge' }, { status: 400 }));
      if (password && password.length < 8) return cors(NextResponse.json({ ok: false, error: 'Passord må ha minst 8 tegn' }, { status: 400 }));
      if (password && !email) return cors(NextResponse.json({ ok: false, error: 'Konto med passord krever e-post' }, { status: 400 }));
      if (email) {
        const finnes = await db.collection('admin_users').findOne({ email });
        if (finnes) return cors(NextResponse.json({ ok: false, error: 'E-posten er allerede registrert' }, { status: 400 }));
      }
      await ensurePersonMigration(db);
      const antall = await db.collection('admin_users').countDocuments();
      const member = {
        id: uuidv4(), name, email, role,
        tittel: String(body.tittel || '').trim().slice(0, 60),
        groups: Array.isArray(body.groups) ? body.groups.filter((g) => SAK_GRUPPER.includes(g)) : [],
        moteTilgang: Array.isArray(body.moteTilgang) ? body.moteTilgang.filter((t) => Object.keys(MOTE_TYPE_LABEL).includes(t)) : [],
        moduler: Array.isArray(body.moduler) ? body.moduler.filter((t) => MODUL_NOKLER.includes(t)) : [],
        color: /^#[0-9a-fA-F]{6}$/.test(String(body.color || '')) ? body.color : TASK_FARGER[antall % TASK_FARGER.length],
        createdAt: new Date().toISOString(),
      };
      const doc = { ...member };
      if (password) doc.passwordHash = hashPassword(password);
      if (invite) doc.invitedAt = new Date().toISOString();
      await db.collection('admin_users').insertOne(doc);
      // Invitasjon: engangs-token (7 d) + velkomst-e-post der brukeren velger
      // eget passord. Hvem som inviterte hentes fra sesjonen (personlig hilsen).
      let invitert = false;
      let testToken = null;
      if (invite) {
        const raw = await lagAuthToken(db, { userId: member.id, email, type: 'invite' });
        let invitertAv = 'DigiHome';
        const sesjon = sessionFra(request);
        if (sesjon && sesjon.sub) {
          try {
            const s = await db.collection('admin_users').findOne({ id: sesjon.sub });
            if (s && s.name) invitertAv = s.name;
          } catch (e) {}
        }
        invitert = await sendVelkomstEpost({ member: doc, rawToken: raw, invitertAv });
        if (isUndeliverableTestAddress(email)) testToken = raw;
      }
      return cors(NextResponse.json({
        ok: true,
        member: { ...member, harPassord: !!password, invitedAt: doc.invitedAt || '' },
        invitert,
        ...(testToken ? { testInviteToken: testToken } : {}),
      }));
    }

    // (Re)send invitasjon til eksisterende person med e-post men uten passord.
    if (path[0] === 'admin' && path[1] === 'users' && path[3] === 'invite' && path.length === 4 && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const target = await db.collection('admin_users').findOne({ id: path[2] });
      if (!target) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (!target.email) return cors(NextResponse.json({ ok: false, error: 'Personen mangler e-post' }, { status: 400 }));
      if (target.passwordHash) return cors(NextResponse.json({ ok: false, error: 'Kontoen er allerede aktivert — bruk «Glemt passord» ved behov' }, { status: 400 }));
      const raw = await lagAuthToken(db, { userId: target.id, email: target.email, type: 'invite' });
      await db.collection('admin_users').updateOne({ id: target.id }, { $set: { invitedAt: new Date().toISOString() } });
      let invitertAv = 'DigiHome';
      const sesjon = sessionFra(request);
      if (sesjon && sesjon.sub) {
        try {
          const s = await db.collection('admin_users').findOne({ id: sesjon.sub });
          if (s && s.name) invitertAv = s.name;
        } catch (e) {}
      }
      const invitert = await sendVelkomstEpost({ member: target, rawToken: raw, invitertAv });
      const member = (await hentPersoner(db)).find((m) => m.id === target.id) || null;
      return cors(NextResponse.json({
        ok: true, invitert, member,
        ...(isUndeliverableTestAddress(target.email) ? { testInviteToken: raw } : {}),
      }));
    }

    if (path[0] === 'admin' && path[1] === 'users' && path.length === 3 && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const target = await db.collection('admin_users').findOne({ id: path[2] });
      if (!target) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const sesjon = sessionFra(request);
      const u2 = new URL(request.url);
      const master = !!ADMIN_KEY && (u2.searchParams.get('key') || request.headers.get('x-admin-key') || '') === ADMIN_KEY;
      const erOwner = target.role === 'owner';
      if (erOwner && !master && (!sesjon || sesjon.sub !== target.id)) {
        return cors(NextResponse.json({ ok: false, error: 'Bare eieren kan endre eier-kontoen' }, { status: 403 }));
      }
      const set = {};
      if (body.name !== undefined) { const n = String(body.name).trim(); if (n) set.name = n; }
      if (body.email !== undefined) {
        const e = String(body.email).trim().toLowerCase();
        if (e && e !== (target.email || '')) {
          const opptatt = await db.collection('admin_users').findOne({ email: e, id: { $ne: target.id } });
          if (opptatt) return cors(NextResponse.json({ ok: false, error: 'E-posten er allerede registrert' }, { status: 400 }));
        }
        set.email = e;
      }
      if (body.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.color))) set.color = body.color;
      if (body.role !== undefined && !erOwner && ['admin', 'bruker', 'partner', 'eier', 'investor'].includes(body.role)) set.role = body.role;
      // Verv/tittel (Styreleder, Daglig leder …) og møtetilgang per møtetype
      if (body.tittel !== undefined) set.tittel = String(body.tittel || '').trim().slice(0, 60);
      // Grupper (Styret/Ledelsen/Utvikling) — styrer hvilke saksområder brukeren ser.
      if (body.groups !== undefined) {
        set.groups = Array.isArray(body.groups) ? body.groups.filter((g) => SAK_GRUPPER.includes(g)) : [];
      }
      if (body.moteTilgang !== undefined) {
        set.moteTilgang = Array.isArray(body.moteTilgang)
          ? body.moteTilgang.filter((t) => Object.keys(MOTE_TYPE_LABEL).includes(t))
          : [];
      }
      // Modultilgang: eksplisitte moduler for begrensede kontoer
      if (body.moduler !== undefined) {
        set.moduler = Array.isArray(body.moduler)
          ? body.moduler.filter((t) => MODUL_NOKLER.includes(t))
          : [];
      }
      if (body.password !== undefined) {
        const pw = String(body.password || '');
        if (pw) {
          if (pw.length < 8) return cors(NextResponse.json({ ok: false, error: 'Passord må ha minst 8 tegn' }, { status: 400 }));
          const epostNy = set.email !== undefined ? set.email : (target.email || '');
          if (!epostNy) return cors(NextResponse.json({ ok: false, error: 'Konto med passord krever e-post' }, { status: 400 }));
          set.passwordHash = hashPassword(pw);
        }
      }
      if (!Object.keys(set).length) return cors(NextResponse.json({ ok: false, error: 'Ingenting å endre' }, { status: 400 }));
      await db.collection('admin_users').updateOne({ id: path[2] }, { $set: set });
      // Passord satt manuelt eller e-post endret → utestående invitasjons-/
      // reset-/magic-lenker (sendt til gammel adresse) skal ikke lenger virke.
      if (set.passwordHash || set.email !== undefined) {
        try { await invaliderBrukerTokens(db, path[2]); } catch (e) {}
      }
      const member = (await hentPersoner(db)).find((m) => m.id === path[2]) || null;
      return cors(NextResponse.json({ ok: true, member }));
    }

    if (path[0] === 'admin' && path[1] === 'users' && path.length === 3 && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const target = await db.collection('admin_users').findOne({ id: path[2] });
      if (!target) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (target.role === 'owner') return cors(NextResponse.json({ ok: false, error: 'Eier-kontoen kan ikke slettes' }, { status: 403 }));
      const sesjon = sessionFra(request);
      if (sesjon && sesjon.sub === path[2]) return cors(NextResponse.json({ ok: false, error: 'Du kan ikke slette din egen konto' }, { status: 400 }));
      await db.collection('admin_users').deleteOne({ id: path[2] });
      try { await invaliderBrukerTokens(db, path[2]); } catch (e) {}
      return cors(NextResponse.json({ ok: true }));
    }

    // ══════════════════════ SANNTID: diff siden tidsstempel ══════════════════════
    // Klienten poller dette hvert ~10 s for å holde tavla live uten refresh.
    // Returnerer saker endret etter ts (ikke arkiverte), samt id-er som skal
    // FJERNES fra tavla (slettet ELLER arkivert etter ts).
    if (route === '/admin/tasks/since' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const ts = new URL(request.url).searchParams.get('ts') || '1970-01-01T00:00:00.000Z';
      const now = new Date().toISOString();
      const [endret, arkivert, tombstones, viewerDiff] = await Promise.all([
        db.collection('tasks').find({ updatedAt: { $gt: ts }, archived: { $ne: true } }, { projection: { _id: 0 } }).toArray(),
        db.collection('tasks').find({ updatedAt: { $gt: ts }, archived: true }, { projection: { _id: 0, id: 1 } }).toArray(),
        db.collection('task_tombstones').find({ deletedAt: { $gt: ts } }, { projection: { _id: 0, id: 1 } }).toArray(),
        sakViewer(db, request),
      ]);
      // Synlighet: skjulte endringer sendes aldri — og en sak som er FLYTTET
      // inn i et skjult område/begrenset, meldes som fjernet slik at klienten
      // rydder den bort umiddelbart.
      const skjulte = endret.filter((t) => !sakSynlig(viewerDiff, t)).map((t) => t.id);
      const changed = endret.filter((t) => sakSynlig(viewerDiff, t));
      const removedIds = [...new Set([...arkivert.map((t) => t.id), ...tombstones.map((t) => t.id), ...skjulte])];
      return cors(NextResponse.json({ ok: true, now, changed, removedIds }));
    }

    // ══════════════════════ RIK TEKST: innliming/opplasting av bilder ══════════════════════
    // Tar imot en data-URL (base64) fra lim-inn/slipp i beskrivelse/kommentar,
    // lagrer binært i task_images og gir tilbake en intern URL. Maks ~5 MB.
    if (route === '/admin/tasks/image' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) {}
      const dataUrl = String(body.dataUrl || '');
      const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m) return cors(NextResponse.json({ ok: false, error: 'Ugyldig bilde' }, { status: 400 }));
      const buf = Buffer.from(m[3], 'base64');
      if (buf.length > 5 * 1024 * 1024) return cors(NextResponse.json({ ok: false, error: 'Bildet er for stort (maks 5 MB)' }, { status: 413 }));
      const id = uuidv4();
      await db.collection('task_images').insertOne({ id, contentType: m[1], data: buf, size: buf.length, createdAt: new Date().toISOString() });
      return cors(NextResponse.json({ ok: true, url: `/api/admin/tasks/image/${id}`, id }));
    }
    if (path[0] === 'admin' && path[1] === 'tasks' && path[2] === 'image' && path.length === 4 && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const bilde = await db.collection('task_images').findOne({ id: path[3] });
      if (!bilde) return new NextResponse('Not found', { status: 404 });
      const buf = bilde.data && bilde.data.buffer ? Buffer.from(bilde.data.buffer) : Buffer.from(bilde.data);
      return new NextResponse(buf, { status: 200, headers: { 'Content-Type': bilde.contentType || 'image/png', 'Cache-Control': 'private, max-age=86400' } });
    }

    // ══════════════════════ PROSJEKTER / INITIATIVER ══════════════════════
    // Linear-modell: et prosjekt er en konkret leveranse med brief (kartleggings-
    // dokument i markdown), status (utforskes→planlagt→pagar→ferdig→skrinlagt),
    // lead, måldato og milepæler. Saker knyttes via projectId (+ milestoneId).
    if (route === '/admin/projects' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const projects = await db.collection('projects').find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
      // Fremdrift per prosjekt/milepæl — beregnes fra sakene i én lesing.
      const sakStat = await db.collection('tasks').find(
        { projectId: { $ne: null }, archived: { $ne: true } },
        { projection: { _id: 0, projectId: 1, status: 1, milestoneId: 1 } },
      ).toArray();
      for (const p of projects) {
        const mine = sakStat.filter((t) => t.projectId === p.id);
        p.progress = { total: mine.length, done: mine.filter((t) => t.status === 'done').length };
        for (const m of (p.milestones || [])) {
          const ms = mine.filter((t) => t.milestoneId === m.id);
          m.progress = { total: ms.length, done: ms.filter((t) => t.status === 'done').length };
        }
        if (!p.status) p.status = 'pagar'; // eldre prosjekter uten status er i arbeid
      }
      return cors(NextResponse.json({ ok: true, projects }));
    }
    if (route === '/admin/projects' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) {}
      const name = String(body.name || '').trim();
      if (!name) return cors(NextResponse.json({ ok: false, error: 'Navn er påkrevd' }, { status: 400 }));
      const project = {
        id: uuidv4(), name: name.slice(0, 120),
        color: /^#[0-9a-fA-F]{6}$/.test(String(body.color)) ? body.color : '#8b5cf6',
        description: String(body.description || '').slice(0, 20000),
        status: PROSJEKT_STATUSER.includes(body.status) ? body.status : 'utforskes',
        leadId: body.leadId ? String(body.leadId) : null,
        targetDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.targetDate)) ? body.targetDate : null,
        milestones: [],
        archived: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      await db.collection('projects').insertOne({ ...project });
      delete project._id;
      return cors(NextResponse.json({ ok: true, project }));
    }
    if (path[0] === 'admin' && path[1] === 'projects' && path.length === 3 && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) {}
      const set = { updatedAt: new Date().toISOString() };
      if (body.name !== undefined) { const n = String(body.name).trim(); if (n) set.name = n.slice(0, 120); }
      if (body.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.color))) set.color = body.color;
      if (body.description !== undefined) set.description = String(body.description).slice(0, 20000);
      if (body.archived !== undefined) set.archived = !!body.archived;
      if (body.status !== undefined) {
        if (!PROSJEKT_STATUSER.includes(body.status)) return cors(NextResponse.json({ ok: false, error: 'Ugyldig prosjektstatus' }, { status: 400 }));
        set.status = body.status;
      }
      if (body.leadId !== undefined) set.leadId = body.leadId ? String(body.leadId) : null;
      if (body.targetDate !== undefined) set.targetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.targetDate)) ? body.targetDate : null;
      if (body.milestones !== undefined && Array.isArray(body.milestones)) {
        // Milepæler: [{id?, name, due?, done?}] — nye rader får id, tomme
        // fjernes, maks 20. Saker som peker på slettede milepæler løsnes under.
        set.milestones = body.milestones
          .map((m) => ({
            id: m.id ? String(m.id) : uuidv4(),
            name: String(m.name || '').trim().slice(0, 120),
            due: /^\d{4}-\d{2}-\d{2}$/.test(String(m.due)) ? m.due : null,
            done: !!m.done,
          }))
          .filter((m) => m.name)
          .slice(0, 20);
      }
      if (Object.keys(set).length <= 1) return cors(NextResponse.json({ ok: false, error: 'Ingenting å endre' }, { status: 400 }));
      await db.collection('projects').updateOne({ id: path[2] }, { $set: set });
      const project = await db.collection('projects').findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!project) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (set.milestones) {
        const gyldige = set.milestones.map((m) => m.id);
        await db.collection('tasks').updateMany(
          { projectId: path[2], milestoneId: { $nin: [...gyldige, null] } },
          { $set: { milestoneId: null } },
        );
      }
      return cors(NextResponse.json({ ok: true, project }));
    }
    if (path[0] === 'admin' && path[1] === 'projects' && path.length === 3 && method === 'DELETE') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      await db.collection('projects').deleteOne({ id: path[2] });
      // Løsne sakene fra prosjektet (ikke slett sakene).
      await db.collection('tasks').updateMany({ projectId: path[2] }, { $set: { projectId: null, milestoneId: null } });
      return cors(NextResponse.json({ ok: true }));
    }

    // ══════════════════════ LAGREDE VISNINGER (per bruker) ══════════════════════
    if (route === '/admin/tasks/views' && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = (sessionFra(request) || {}).sub || null;
      const views = sub ? await db.collection('saved_views').find({ userId: sub }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray() : [];
      return cors(NextResponse.json({ ok: true, views }));
    }
    if (route === '/admin/tasks/views' && method === 'POST') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = (sessionFra(request) || {}).sub || null;
      if (!sub) return cors(NextResponse.json({ ok: false, error: 'Krever innlogget bruker' }, { status: 400 }));
      let body = {}; try { body = await request.json(); } catch (e) {}
      const name = String(body.name || '').trim();
      if (!name) return cors(NextResponse.json({ ok: false, error: 'Navn er påkrevd' }, { status: 400 }));
      const view = { id: uuidv4(), userId: sub, name: name.slice(0, 80), config: (body.config && typeof body.config === 'object') ? body.config : {}, createdAt: new Date().toISOString() };
      await db.collection('saved_views').insertOne({ ...view });
      return cors(NextResponse.json({ ok: true, view }));
    }
    if (path[0] === 'admin' && path[1] === 'tasks' && path[2] === 'views' && path.length === 4 && method === 'DELETE') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = (sessionFra(request) || {}).sub || null;
      await db.collection('saved_views').deleteOne({ id: path[3], userId: sub });
      return cors(NextResponse.json({ ok: true }));
    }

    // ══════════════════════ TEAMCHAT: intern chat m/ @-tagging ══════════════════════
    // Kun interne (owner/admin/bruker/partner via sakerAuthed) — investor/eier
    // ser aldri chatten. E-post sendes KUN til @taggede, aldri på alle meldinger.
    if (route === '/admin/chat/meldinger' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spCh = new URL(request.url).searchParams;
      const meldinger = await chatList(db, { kanal: spCh.get('kanal'), etter: spCh.get('etter') || null, threadId: spCh.get('traad') || null });
      return cors(NextResponse.json({ ok: true, meldinger }));
    }
    if (route === '/admin/chat/meldinger' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`chat:${clientIp(request)}`, 30)) return cors(NextResponse.json({ error: 'For mange meldinger — vent litt' }, { status: 429 }));
      let bCh = {}; try { bCh = await request.json(); } catch (e) {}
      const sesCh = sessionFra(request) || {};
      let avsenderId = sesCh.sub || 'master';
      let avsenderNavn = 'Admin';
      if (sesCh.sub) {
        const uCh = await db.collection('admin_users').findOne({ id: sesCh.sub }, { projection: { _id: 0, name: 1 } });
        avsenderNavn = String(uCh?.name || sesCh.email || 'Ukjent').slice(0, 80);
      }
      const resCh = await chatNy(db, { kanal: bCh.kanal, userId: avsenderId, userName: avsenderNavn, text: bCh.text, mentions: bCh.mentions, threadId: bCh.threadId || null, vedlegg: bCh.vedlegg || [] });
      if (!resCh.ok) return cors(NextResponse.json({ ok: false, error: resCh.error }, { status: resCh.status || 400 }));
      // Varsling til @taggede: in-app (klokken) + e-post. Eksplisitt @tagging av
      // seg selv varsles OGSÅ (bevisst handling — selvpåminnelse/testing).
      const kortCh = resCh.melding.text
        ? (resCh.melding.text.length > 140 ? `${resCh.melding.text.slice(0, 140)}…` : resCh.melding.text)
        : `📎 ${(resCh.melding.vedlegg || []).map((v) => v.name).join(', ').slice(0, 120) || 'vedlegg'}`;
      for (const mt of resCh.mottakere) {
        // actorId settes til null ved selv-tagging — varsle() har en generell
        // «aldri varsle deg selv»-vakt, men eksplisitt @deg-selv er et bevisst valg.
        await varsle(db, mt.id, mt.id === avsenderId ? null : avsenderId, { type: 'chat', actor: avsenderNavn, text: `${avsenderNavn} nevnte deg i teamchatten: «${kortCh}»` });
      }
      // TRÅDFØLGING: alle som har deltatt i tråden får in-app-varsel om nye svar
      // — aldri e-post (den er forbeholdt @tagging), aldri avsenderen selv, og
      // aldri dobbelt for de som allerede fikk mention-varsel over.
      if (resCh.traad && Array.isArray(resCh.traad.deltakerIds) && resCh.traad.deltakerIds.length) {
        const alleredeVarslet = new Set([avsenderId, ...resCh.mottakere.map((m) => m.id)]);
        const kandidater = resCh.traad.deltakerIds.filter((did) => !alleredeVarslet.has(did));
        if (kandidater.length) {
          const gyldigeDelt = await db.collection('admin_users')
            .find({ id: { $in: kandidater } }, { projection: { _id: 0, id: 1 } })
            .toArray();
          const tittelCh = resCh.traad.navn || (resCh.traad.rotTekst ? `${resCh.traad.rotTekst.slice(0, 40)}…` : 'tråden');
          for (const d of gyldigeDelt) {
            await varsle(db, d.id, avsenderId, { type: 'chat', actor: avsenderNavn, text: `${avsenderNavn} svarte i tråden «${tittelCh}»: «${kortCh}»` });
          }
        }
      }
      if (emailConfigured()) {
        const baseCh = process.env.NEXT_PUBLIC_BASE_URL || '';
        // Dyplenke som åpner portalen MED chatten åpen (ChatBoble leser ?chat=1)
        // — trådsvar lenker rett inn i tråden (?traad=<rotId>).
        const traadCh = resCh.melding.threadId ? `&traad=${resCh.melding.threadId}` : '';
        const chatUrl = baseCh ? `${baseCh}/admin?chat=1${traadCh}` : '';
        // Eksplisitt selv-tagging gir også e-post (bevisst handling fra avsenderen).
        const epost = resCh.mottakere.filter((mt) => mt.email && !isUndeliverableTestAddress(mt.email));
        const emneCh = resCh.melding.threadId
          ? `${avsenderNavn} nevnte deg i tråden${resCh.traad?.navn ? ` «${resCh.traad.navn}»` : ''}`
          : `${avsenderNavn} nevnte deg i teamchatten`;
        // BILDER I E-POSTEN: bildevedlegg skaleres ned (sharp, maks 960px, jpeg)
        // og bygges inn som CID-inline — vises direkte i Outlook/Gmail uten
        // offentlig URL og uten «last ned bilder»-sperre. Maks 3; resten + andre
        // filtyper vises som chips.
        const bilderCh = [];
        const epostVedleggCh = [];
        const chipsCh = [];
        for (const vCh of (resCh.melding.vedlegg || [])) {
          if (bilderCh.length < 3 && /^image\//i.test(vCh.type || '')) {
            try {
              const fdocCh = await chatHentFil(db, { id: vCh.id });
              if (!fdocCh?.data) throw new Error('mangler data');
              const sharpMod = (await import('sharp')).default;
              const bufCh2 = await sharpMod(Buffer.from(fdocCh.data, 'base64'))
                .rotate()
                .resize({ width: 960, withoutEnlargement: true })
                .jpeg({ quality: 78 })
                .toBuffer();
              const cidCh = `chatbilde${bilderCh.length}`;
              bilderCh.push({ cid: cidCh, name: vCh.name });
              epostVedleggCh.push({ content: bufCh2.toString('base64'), filename: `${String(vCh.name || 'bilde').replace(/\.[a-z0-9]+$/i, '')}.jpg`, type: 'image/jpeg', disposition: 'inline', contentId: cidCh });
            } catch (e) { chipsCh.push(vCh); }
          } else {
            chipsCh.push(vCh);
          }
        }
        const { html: htmlCh, text: textCh } = byggChatEpost({
          avsenderNavn,
          tekst: resCh.melding.text.slice(0, 1200),
          mentions: resCh.melding.mentions,
          vedlegg: chipsCh,
          bilder: bilderCh,
          erTraad: !!resCh.melding.threadId,
          traadNavn: resCh.traad?.navn || null,
          rotTekst: resCh.traad?.rotTekst || null,
          chatUrl,
          tidspunkt: resCh.melding.createdAt,
        });
        await Promise.allSettled(epost.map((mt) => sendHtmlEmail({
          to: mt.email,
          subject: emneCh,
          // Person-til-person-signaler (bedrer «Prioritert»-plassering i Outlook):
          // avsendernavn = personen som tagget, svar-til = personens e-post,
          // personlig=true skrur av sporing (ingen link-omskriving/piksel).
          fromName: `${avsenderNavn} (DigiHome)`,
          replyTo: sesCh.email || undefined,
          personlig: true,
          html: htmlCh,
          text: textCh,
          attachments: epostVedleggCh.length ? epostVedleggCh : undefined,
          categories: ['chat-mention'],
        }).catch(() => {})));
      }
      return cors(NextResponse.json({ ok: true, melding: resCh.melding }, { status: 201 }));
    }
    if (route === '/admin/chat/meldinger' && method === 'DELETE') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idCh = new URL(request.url).searchParams.get('id') || '';
      const sesChD = sessionFra(request) || {};
      const resChD = await chatSlett(db, { id: idCh, userId: sesChD.sub || 'master', erAdmin: adminAuthed(request) });
      if (!resChD.ok) return cors(NextResponse.json({ ok: false, error: resChD.error }, { status: resChD.status || 400 }));
      return cors(NextResponse.json({ ok: true }));
    }
    // Rediger egen melding (utløser aldri nye varsler)
    if (route === '/admin/chat/melding' && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bChR = {}; try { bChR = await request.json(); } catch (e) {}
      const sesChR = sessionFra(request) || {};
      const resChR = await chatRediger(db, { id: bChR.id, userId: sesChR.sub || 'master', text: bChR.text, mentions: bChR.mentions || [] });
      if (!resChR.ok) return cors(NextResponse.json({ ok: false, error: resChR.error }, { status: resChR.status || 400 }));
      return cors(NextResponse.json({ ok: true, text: resChR.text, mentions: resChR.mentions, redigertAt: resChR.redigertAt }));
    }
    // Emoji-reaksjon (toggle)
    if (route === '/admin/chat/reaksjon' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bChE = {}; try { bChE = await request.json(); } catch (e) {}
      const sesChE = sessionFra(request) || {};
      let navnChE = 'Admin';
      if (sesChE.sub) {
        const uChE = await db.collection('admin_users').findOne({ id: sesChE.sub }, { projection: { _id: 0, name: 1 } });
        navnChE = String(uChE?.name || sesChE.email || 'Ukjent').slice(0, 80);
      }
      const resChE = await chatReager(db, { id: bChE.id, userId: sesChE.sub || 'master', userName: navnChE, emoji: bChE.emoji });
      if (!resChE.ok) return cors(NextResponse.json({ ok: false, error: resChE.error }, { status: resChE.status || 400 }));
      return cors(NextResponse.json({ ok: true, reaksjoner: resChE.reaksjoner }));
    }
    // Fest/løsne melding
    if (route === '/admin/chat/fest' && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bChF = {}; try { bChF = await request.json(); } catch (e) {}
      const sesChF = sessionFra(request) || {};
      let navnChF = 'Admin';
      if (sesChF.sub) {
        const uChF = await db.collection('admin_users').findOne({ id: sesChF.sub }, { projection: { _id: 0, name: 1 } });
        navnChF = String(uChF?.name || sesChF.email || 'Ukjent').slice(0, 80);
      }
      const resChF = await chatFest(db, { id: bChF.id, festet: !!bChF.festet, userId: sesChF.sub || 'master', userName: navnChF });
      if (!resChF.ok) return cors(NextResponse.json({ ok: false, error: resChF.error }, { status: resChF.status || 400 }));
      return cors(NextResponse.json({ ok: true, festet: resChF.festet }));
    }
    if (route === '/admin/chat/festede' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spChF = new URL(request.url).searchParams;
      const festede = await chatFestede(db, { kanal: spChF.get('kanal') });
      return cors(NextResponse.json({ ok: true, festede }));
    }
    // «Skriver…»-indikator: POST = heartbeat mens man taster, GET = hvem skriver nå
    if (route === '/admin/chat/skriver' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bChS = {}; try { bChS = await request.json(); } catch (e) {}
      const sesChS = sessionFra(request) || {};
      let navnChS = 'Admin';
      if (sesChS.sub) {
        const uChS = await db.collection('admin_users').findOne({ id: sesChS.sub }, { projection: { _id: 0, name: 1 } });
        navnChS = String(uChS?.name || sesChS.email || 'Ukjent').slice(0, 80);
      }
      await chatSettSkriver(db, { kanal: bChS.kanal, userId: sesChS.sub || 'master', userName: navnChS });
      return cors(NextResponse.json({ ok: true }));
    }
    if (route === '/admin/chat/skriver' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spChS = new URL(request.url).searchParams;
      const sesChS2 = sessionFra(request) || {};
      const skriver = await chatHentSkriver(db, { kanal: spChS.get('kanal'), unntattUserId: sesChS2.sub || 'master' });
      return cors(NextResponse.json({ ok: true, skriver }));
    }
    // Chunket filopplasting til chat (bilder + vedlegg, maks 8 MB)
    if (route === '/admin/chat/fil-chunk' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`chatfil:${clientIp(request)}`, 120)) return cors(NextResponse.json({ error: 'For mange opplastinger — vent litt' }, { status: 429 }));
      let bChU = {}; try { bChU = await request.json(); } catch (e) {}
      const sesChU = sessionFra(request) || {};
      let navnChU = 'Admin';
      if (sesChU.sub) {
        const uChU = await db.collection('admin_users').findOne({ id: sesChU.sub }, { projection: { _id: 0, name: 1 } });
        navnChU = String(uChU?.name || sesChU.email || 'Ukjent').slice(0, 80);
      }
      const resChU = await chatFilChunk(db, {
        uploadId: bChU.uploadId, index: bChU.index, total: bChU.total, data: bChU.data,
        name: bChU.name, type: bChU.type, kanal: bChU.kanal,
        userId: sesChU.sub || 'master', userName: navnChU,
      });
      if (!resChU.ok) return cors(NextResponse.json({ ok: false, error: resChU.error }, { status: resChU.status || 400 }));
      return cors(NextResponse.json(resChU));
    }
    // Forhåndsvisning av Word-dokumenter i chat: konverteres til PDF på
    // serversiden (resultatet caches på fildokumentet for umiddelbar gjenåpning)
    if (path[0] === 'admin' && path[1] === 'chat' && path[2] === 'fil' && path.length === 5 && path[4] === 'forhandsvisning' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const filFv = await chatHentFil(db, { id: path[3] });
      if (!filFv) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const erDocxFv = /wordprocessingml/i.test(String(filFv.type || '')) || /\.docx$/i.test(String(filFv.name || ''));
      if (!erDocxFv) return cors(NextResponse.json({ ok: false, error: 'Kun Word-dokumenter (.docx) konverteres for forhåndsvisning' }, { status: 400 }));
      let pdfB64Fv = filFv.pdfData || null;
      if (!pdfB64Fv) {
        try {
          const pdfBufFv = await konverterDocxTilPdf(Buffer.from(filFv.data || '', 'base64'));
          if (!pdfBufFv || pdfBufFv.length < 100 || pdfBufFv.subarray(0, 5).toString('latin1') !== '%PDF-') {
            return cors(NextResponse.json({ ok: false, error: 'Kunne ikke lage forhåndsvisning — last ned filen i stedet' }, { status: 422 }));
          }
          pdfB64Fv = pdfBufFv.toString('base64');
          // Cache kun når samlet dokument holder seg trygt under Mongo-grensen (16 MB)
          if ((filFv.size || 0) + pdfBufFv.length < 10 * 1024 * 1024) {
            await db.collection('chat_files').updateOne({ id: filFv.id }, { $set: { pdfData: pdfB64Fv } }).catch(() => {});
          }
        } catch (e) {
          return cors(NextResponse.json({ ok: false, error: 'Kunne ikke lage forhåndsvisning — last ned filen i stedet' }, { status: 422 }));
        }
      }
      const bufFv = Buffer.from(pdfB64Fv, 'base64');
      return new NextResponse(bufFv, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': String(bufFv.length),
          'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(String(filFv.name || 'dokument').replace(/\.docx$/i, ''))}.pdf`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
    // Hent chatfil (bilde/vedlegg) — ?inline=1 viser trygge typer i nettleseren
    if (path[0] === 'admin' && path[1] === 'chat' && path[2] === 'fil' && path.length === 4 && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const filCh = await chatHentFil(db, { id: path[3] });
      if (!filCh) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const bufCh = Buffer.from(filCh.data || '', 'base64');
      // KUN trygge typer inline — HTML/SVG kan inneholde script (XSS) og skal
      // aldri serveres inline under vårt domene. Alt annet forblir nedlasting.
      const INLINE_TRYGG_CH = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif|heic|heif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav|ogg|aac|mp4|x-m4a|flac)|text\/plain)$/i;
      const uFilCh = new URL(request.url);
      const inlineCh = uFilCh.searchParams.get('inline') === '1' && INLINE_TRYGG_CH.test(String(filCh.type || ''));
      return new NextResponse(bufCh, {
        status: 200,
        headers: {
          'Content-Type': filCh.type || 'application/octet-stream',
          'Content-Length': String(bufCh.length),
          'Content-Disposition': `${inlineCh ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(filCh.name || 'fil')}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }
    // Angre en usendt opplasting (kun egne, ubundne filer)
    if (path[0] === 'admin' && path[1] === 'chat' && path[2] === 'fil' && path.length === 4 && method === 'DELETE') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sesChD = sessionFra(request) || {};
      const resChD = await chatSlettFil(db, { id: path[3], userId: sesChD.sub || 'master' });
      return cors(NextResponse.json({ ok: resChD.ok }));
    }
    if (route === '/admin/chat/traader' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spChT = new URL(request.url).searchParams;
      const sesChT = sessionFra(request) || {};
      const traader = await chatTraader(db, { kanal: spChT.get('kanal'), userId: sesChT.sub || 'master', sakId: spChT.get('sakId') || null });
      return cors(NextResponse.json({ ok: true, traader }));
    }
    if (route === '/admin/chat/traad' && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bChT = {}; try { bChT = await request.json(); } catch (e) {}
      const resChT = await chatTraadOppdater(db, { id: bChT.id, navn: bChT.navn, sakId: bChT.sakId });
      if (!resChT.ok) return cors(NextResponse.json({ ok: false, error: resChT.error }, { status: resChT.status || 400 }));
      return cors(NextResponse.json({ ok: true, traadNavn: resChT.traadNavn !== undefined ? resChT.traadNavn : null, sak: resChT.sak || null }));
    }
    if (route === '/admin/chat/status' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spChS = new URL(request.url).searchParams;
      const sesChS = sessionFra(request) || {};
      const st = await chatStatus(db, { kanal: spChS.get('kanal'), userId: sesChS.sub || 'master' });
      return cors(NextResponse.json(st));
    }
    if (route === '/admin/chat/lest' && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bChL = {}; try { bChL = await request.json(); } catch (e) {}
      const sesChL = sessionFra(request) || {};
      // forrigeLestAt = tidspunktet brukeren VAR à jour til — klienten bruker
      // dette til «Nytt siden sist»-linjen uten ekstra rundtur.
      const resChL = await chatLest(db, { kanal: bChL.kanal, userId: sesChL.sub || 'master' });
      return cors(NextResponse.json({ ok: true, forrigeLestAt: resChL.forrigeLestAt || null }));
    }

    // ══════════════════════ VARSLER: in-app innboks + preferanser ══════════════════════
    // Alle endepunkter er per innlogget bruker (sesjonstoken → sub). Masternøkkel
    // uten sesjon har ingen bruker → tom innboks (brukes av QA/automasjon).
    if (route === '/admin/notifications' && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = (sessionFra(request) || {}).sub || null;
      if (!sub) return cors(NextResponse.json({ ok: true, notifications: [], unread: 0 }));
      const notifications = await db.collection('notifications')
        .find({ userId: sub }, { projection: { _id: 0 } })
        .sort({ createdAt: -1 }).limit(50).toArray();
      const unread = await db.collection('notifications').countDocuments({ userId: sub, read: false });
      return cors(NextResponse.json({ ok: true, notifications, unread }));
    }

    if (route === '/admin/notifications/read' && method === 'POST') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = (sessionFra(request) || {}).sub || null;
      if (!sub) return cors(NextResponse.json({ ok: true, unread: 0 }));
      let body = {}; try { body = await request.json(); } catch (e) {}
      const filter = { userId: sub, read: false };
      if (!body.all) {
        const ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        if (!ids.length) return cors(NextResponse.json({ ok: false, error: 'Ingen varsler angitt' }, { status: 400 }));
        filter.id = { $in: ids };
      }
      await db.collection('notifications').updateMany(filter, { $set: { read: true } });
      const unread = await db.collection('notifications').countDocuments({ userId: sub, read: false });
      return cors(NextResponse.json({ ok: true, unread }));
    }

    if (route === '/admin/notifications/prefs' && (method === 'GET' || method === 'PUT')) {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sub = (sessionFra(request) || {}).sub || null;
      if (!sub) return cors(NextResponse.json({ ok: false, error: 'Krever innlogget bruker' }, { status: 400 }));
      const standard = () => VARSEL_KATEGORIER.reduce((o, k) => { o[k] = true; return o; }, {});
      if (method === 'PUT') {
        let body = {}; try { body = await request.json(); } catch (e) {}
        const inn = (body.email && typeof body.email === 'object') ? body.email : {};
        const email = {};
        for (const k of VARSEL_KATEGORIER) email[k] = inn[k] !== false; // default på
        await db.collection('admin_users').updateOne({ id: sub }, { $set: { notifPrefs: { email } } });
        return cors(NextResponse.json({ ok: true, prefs: { email }, katalog: VARSEL_LABEL }));
      }
      const u = await db.collection('admin_users').findOne({ id: sub }, { projection: { _id: 0, notifPrefs: 1 } });
      const email = (u && u.notifPrefs && u.notifPrefs.email) ? { ...standard(), ...u.notifPrefs.email } : standard();
      return cors(NextResponse.json({ ok: true, prefs: { email }, katalog: VARSEL_LABEL }));
    }

    // --- Saker: badge-sammendrag (åpne/forfalte/i dag) — brukes i sidemenyen.
    //     Trigget hyppig (90 s polling) og driver derfor også den daglige
    //     frist-digesten (lazy-cron, se kanskjeSendFristDigest). ---
    if (route === '/admin/tasks/summary' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const iDag = osloIDag();
      const alle = await db.collection('tasks').find({ archived: { $ne: true } }).project({ _id: 0, status: 1, dueDate: 1 }).toArray();
      const aapne = alle.filter((t) => t.status !== 'done');
      await kanskjeSendFristDigest(db);
      return cors(NextResponse.json({
        ok: true,
        open: aapne.length,
        overdue: aapne.filter((t) => t.dueDate && t.dueDate < iDag).length,
        dueToday: aapne.filter((t) => t.dueDate === iDag).length,
      }));
    }

    // ═══ Utviklingsprodukter: Produkt → Komponenter (krever Utvikling-tilgang) ═══
    if (route === '/admin/dev-products' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const viewerDp = await sakViewer(db, request);
      if (!omraaderForViewer(viewerDp).includes('utvikling')) return cors(NextResponse.json({ ok: true, products: [] }));
      await seedDevProducts(db);
      const products = await db.collection('dev_products').find({}, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
      return cors(NextResponse.json({ ok: true, products }));
    }
    if (route === '/admin/dev-products' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const viewerDp = await sakViewer(db, request);
      if (!omraaderForViewer(viewerDp).includes('utvikling')) return cors(NextResponse.json({ ok: false, error: 'Krever Utvikling-tilgang' }, { status: 403 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const navn = String(body.name || '').trim().slice(0, 80);
      if (!navn) return cors(NextResponse.json({ ok: false, error: 'Navn er påkrevd' }, { status: 400 }));
      const produkt = {
        id: uuidv4(), name: navn,
        color: /^#[0-9a-fA-F]{6}$/.test(String(body.color || '')) ? body.color : '#8b5cf6',
        components: [],
        createdAt: new Date().toISOString(),
      };
      await db.collection('dev_products').insertOne({ ...produkt });
      delete produkt._id;
      return cors(NextResponse.json({ ok: true, product: produkt }));
    }
    if (path[0] === 'admin' && path[1] === 'dev-products' && path.length === 3 && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const viewerDp = await sakViewer(db, request);
      if (!omraaderForViewer(viewerDp).includes('utvikling')) return cors(NextResponse.json({ ok: false, error: 'Krever Utvikling-tilgang' }, { status: 403 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const set = {};
      if (body.name !== undefined) {
        const navn = String(body.name || '').trim().slice(0, 80);
        if (!navn) return cors(NextResponse.json({ ok: false, error: 'Navn er påkrevd' }, { status: 400 }));
        set.name = navn;
      }
      if (body.color !== undefined && /^#[0-9a-fA-F]{6}$/.test(String(body.color || ''))) set.color = body.color;
      if (body.components !== undefined) {
        // Komponenter: [{id?, name}] — nye rader får id, tomme fjernes, maks 50.
        set.components = (Array.isArray(body.components) ? body.components : [])
          .map((c) => ({ id: (c && c.id) ? String(c.id) : uuidv4(), name: String((c && c.name) || '').trim().slice(0, 60) }))
          .filter((c) => c.name)
          .slice(0, 50);
      }
      if (!Object.keys(set).length) return cors(NextResponse.json({ ok: false, error: 'Ingen endringer' }, { status: 400 }));
      const r = await db.collection('dev_products').updateOne({ id: path[2] }, { $set: set });
      if (!r.matchedCount) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const produkt = await db.collection('dev_products').findOne({ id: path[2] }, { projection: { _id: 0 } });
      return cors(NextResponse.json({ ok: true, product: produkt }));
    }
    if (path[0] === 'admin' && path[1] === 'dev-products' && path.length === 3 && method === 'DELETE') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const viewerDp = await sakViewer(db, request);
      if (!omraaderForViewer(viewerDp).includes('utvikling')) return cors(NextResponse.json({ ok: false, error: 'Krever Utvikling-tilgang' }, { status: 403 }));
      const iBruk = await db.collection('tasks').countDocuments({ productId: path[2] });
      if (iBruk > 0) return cors(NextResponse.json({ ok: false, error: `Produktet brukes av ${iBruk} sak${iBruk === 1 ? '' : 'er'} — fjern koblingene først` }, { status: 409 }));
      const r = await db.collection('dev_products').deleteOne({ id: path[2] });
      if (!r.deletedCount) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      return cors(NextResponse.json({ ok: true }));
    }

    // ═══ Innmeldte utviklingssaker fra Forvalter-plattformen ═══════════════
    // ── Leieforhold & inntekter — 1:1-speil av plattformens visning. Kilde:
    // plattformens /api/lease-income/export når den er live, ellers FLETTET
    // units/export + contracts/export (rom, annonsert, estimat — se
    // lib/leieforhold.js). Leser ALLTID produksjonsplattformen
    // (leieforholdTarget) — miljøvelgeren er fjernet med vilje.
    if (route === '/admin/leieforhold' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'leieforhold'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const freshLf = (() => { try { return new URL(request.url).searchParams.get('fresh') === '1'; } catch (e) { return false; } })();
      const dataLf = await hentLeieforhold(leieforholdTarget(), { db, fresh: freshLf });
      return cors(NextResponse.json(dataLf));
    }

    // ═══ Kontrakt-PDF (proxy mot plattformen — nøkkelen forblir server-side) ═══
    // Åpner signert leiekontrakt/forvaltningsavtale i skuffens PDF-visning.
    // Plattform-endepunktet GET /api/contracts/{id}/pdf er BESTILT via broen
    // (tråd leieforhold-view) — til det er levert returneres en vennlig
    // HTML-side i stedet for rå JSON-feil (vises pent inne i iframen).
    if (route === '/admin/leieforhold/kontrakt-pdf' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'leieforhold'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idPdf = (() => { try { return new URL(request.url).searchParams.get('id') || ''; } catch (e) { return ''; } })();
      if (!/^[0-9a-f:-]{16,90}$/i.test(idPdf)) return cors(NextResponse.json({ ok: false, error: 'Ugyldig kontrakt-id' }, { status: 400 }));
      const mTarget = leieforholdTarget();
      const ventSide = (tittel, melding) => new NextResponse(
        `<!doctype html><html lang="nb"><head><meta charset="utf-8"><style>body{font-family:-apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:92vh;margin:0;background:#faf9f7;color:#555}div{max-width:420px;text-align:center;padding:24px}h2{font-size:17px;color:#111;margin:0 0 8px}p{font-size:13.5px;line-height:1.5;margin:0;color:#8a8278}</style></head><body><div><h2>${tittel}</h2><p>${melding}</p></div></body></html>`,
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
      );
      try {
        // Prøv id-en som den er; komposit-id (kontraktId:enhetId) fra
        // contracts/export prøves også med ren uuid-del som fallback, slik at
        // vi virker uansett hvilken variant plattformen implementerer.
        const kandidater = [idPdf];
        if (idPdf.includes(':')) kandidater.push(idPdf.split(':')[0]);
        let rPdf = null; let sisteDetalj = '';
        for (const kand of kandidater) {
          rPdf = await fetch(`${mTarget.url}/api/contracts/${encodeURIComponent(kand)}/pdf`, {
            headers: { 'X-API-Key': mTarget.key }, signal: AbortSignal.timeout(20000),
          });
          if (rPdf.ok) break;
          try { sisteDetalj = String((await rPdf.clone().json())?.detail || ''); } catch (e) { sisteDetalj = ''; }
          // «ikke tilgjengelig» betyr at kontrakten BLE funnet men mangler
          // lagret PDF — da er det meningsløst å prøve flere id-varianter
          // (som bare ville gitt «Kontrakt ikke funnet» og skjult detaljen).
          if (/ikke tilgjengelig/i.test(sisteDetalj)) break;
        }
        if (!rPdf || !rPdf.ok) {
          // Plattformens PDF-endepunkt er LEVERT for både leiekontrakt og
          // forvaltningsavtale (komposit-id). Forvaltningsavtale krever at en
          // signert PDF-fil er lagret på plattformen (signed_agreement_url) —
          // ellers svarer den 404 «Signert forvaltningsavtale-PDF ikke
          // tilgjengelig». Server-generert fallback er bestilt via broen.
          if (/ikke tilgjengelig/i.test(sisteDetalj)) {
            return ventSide(
              'Ingen signert PDF lagret ennå',
              'Plattformen har ikke en signert PDF-fil registrert for denne forvaltningsavtalen. Så snart den signerte filen er lagret på plattformen, åpnes den her automatisk.',
            );
          }
          return ventSide(
            'PDF-en er ikke tilgjengelig ennå',
            'Plattformen fant ikke PDF for denne kontrakten. Prøv igjen senere — den kobles på automatisk når den finnes.',
          );
        }
        const bufPdf = Buffer.from(await rPdf.arrayBuffer());
        return new NextResponse(bufPdf, {
          status: 200,
          headers: {
            'Content-Type': rPdf.headers.get('content-type') || 'application/pdf',
            'Content-Disposition': `inline; filename="digihome-kontrakt-${idPdf.slice(0, 8)}.pdf"`,
            'Cache-Control': 'private, max-age=300',
          },
        });
      } catch (e) {
        return ventSide('Fikk ikke kontakt med plattformen', 'Prøv å lukke og åpne PDF-en igjen om et øyeblikk.');
      }
    }

    // ═══ ENHETSØKONOMI (Økonomi-modus i Leieforhold) ════════════════════════
    // DigiHome er asset-light: huseier bærer alle boligkostnader. Våre kostnader:
    //   · felleskostnader (løpende/mnd, f.eks. lønn) — fordeles per enhet etter
    //     valgt nøkkel: 'alle' (likt per enhet), 'utleide' (kun utleide) eller
    //     'honorar' (prorata etter honorar)
    //   · CAC per enhet (engangs anskaffelseskostnad) → payback-metrikk
    // Lesing: alle med leieforhold-modul (investor read-only). Skriving: kun
    // admin/owner (adminAuthed avviser begrensede roller automatisk).
    if (route === '/admin/leieforhold/okonomi' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'leieforhold'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // ÉN KOSTNADSKILDE: felles leses fra finance_costs via fasaden (migrerer
      // ev. gamle enhetsokonomi-poster). CAC per enhet bor fortsatt i enhetsokonomi.
      const fellesEo = await listFellesKostnader(db);
      const dokEo = await db.collection('enhetsokonomi').find({ type: 'enhet' }, { projection: { _id: 0 } }).toArray();
      const enheterEo = {};
      for (const d of dokEo) { if (d.enhetId) enheterEo[d.enhetId] = { cac: d.cac || 0, notat: d.notat || '' }; }
      return cors(NextResponse.json({ ok: true, felles: fellesEo, enheter: enheterEo }));
    }
    if (route === '/admin/leieforhold/okonomi/felles' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const bEo = await request.json().catch(() => ({}));
      const rEo = await upsertFellesKostnad(db, bEo);
      if (!rEo.ok) return cors(NextResponse.json({ ok: false, error: rEo.error }, { status: rEo.status || 400 }));
      return cors(NextResponse.json({ ok: true, id: rEo.id }));
    }
    if (route === '/admin/leieforhold/okonomi/felles' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idEoD = (() => { try { return new URL(request.url).searchParams.get('id') || ''; } catch (e) { return ''; } })();
      const rEoD = await slettFellesKostnad(db, idEoD);
      if (!rEoD.ok) return cors(NextResponse.json({ ok: false, error: rEoD.error }, { status: rEoD.status || 404 }));
      return cors(NextResponse.json({ ok: true }));
    }
    if (route === '/admin/leieforhold/okonomi/enhet' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const bEn = await request.json().catch(() => ({}));
      const enhetIdEn = String(bEn.enhetId || '').trim().slice(0, 120);
      if (!enhetIdEn) return cors(NextResponse.json({ ok: false, error: 'enhetId kreves' }, { status: 400 }));
      const cacEn = Math.max(0, Math.round(Number(bEn.cac) || 0));
      const notatEn = String(bEn.notat || '').trim().slice(0, 300);
      if (!cacEn && !notatEn) {
        await db.collection('enhetsokonomi').deleteOne({ type: 'enhet', enhetId: enhetIdEn });
        return cors(NextResponse.json({ ok: true, slettet: true }));
      }
      await db.collection('enhetsokonomi').updateOne(
        { type: 'enhet', enhetId: enhetIdEn },
        { $set: { type: 'enhet', enhetId: enhetIdEn, cac: cacEn, notat: notatEn, updatedAt: new Date().toISOString() }, $setOnInsert: { id: uuidv4() } },
        { upsert: true },
      );
      return cors(NextResponse.json({ ok: true }));
    }

    if (route === '/admin/leieforhold/xlsx' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'leieforhold'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const dataLf = await hentLeieforhold(leieforholdTarget(), { db });
      if (!dataLf.ok) return cors(NextResponse.json({ error: dataLf.error || 'Kunne ikke hente data' }, { status: 502 }));
      // Filter + scenario fra query — NØYAKTIG samme logikk som skjermen
      // (lib/leieforhold-filter) slik at eksporten matcher visningen 1:1.
      const spLf = (() => { try { return new URL(request.url).searchParams; } catch (e) { return new URLSearchParams(); } })();
      const fpLf = lfParseFilter(spLf);
      const scenarioRaderLf = lfScenario(dataLf.rows || [], fpLf.scenario);
      const raderLf = lfFiltrer(scenarioRaderLf, fpLf.filtre, fpLf.sok);
      const filtrertLf = lfHarFilter(fpLf.filtre, fpLf.sok) || Boolean(fpLf.scenario);
      const eksportLf = { ...dataLf, rows: raderLf, totals: filtrertLf ? lfTotals(raderLf) : dataLf.totals };
      // Enhetsøkonomi (faste kostnader + CAC) → «Oversikt»- og «Økonomi»-arkene
      let okonomiLf = null;
      try {
        const fellesLf = await listFellesKostnader(db);
        const dokLf = await db.collection('enhetsokonomi').find({ type: 'enhet' }, { projection: { _id: 0 } }).toArray();
        const enhLf = {};
        for (const d of dokLf) { if (d.enhetId) enhLf[d.enhetId] = { cac: d.cac || 0, notat: d.notat || '' }; }
        okonomiLf = { felles: fellesLf, enheter: enhLf };
      } catch (e) { /* arket utelates uten data */ }
      const metaLf = {
        filterTekst: lfBeskrivelse(fpLf.filtre, fpLf.sok, ''),
        scenario: fpLf.scenario,
        totaltAntall: (dataLf.rows || []).length,
        alleRader: scenarioRaderLf, // fordelingsgrunnlag = hele porteføljen
      };
      const bufLf = await lagLeieforholdExcel(eksportLf, okonomiLf, metaLf);
      return new NextResponse(bufLf, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="digihome-leieforhold-inntekter${filtrertLf ? '-filtrert' : ''}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    if (route === '/admin/leieforhold/csv' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'leieforhold'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const dataLf = await hentLeieforhold(leieforholdTarget(), { db });
      if (!dataLf.ok) return cors(NextResponse.json({ error: dataLf.error || 'Kunne ikke hente data' }, { status: 502 }));
      const spLfC = (() => { try { return new URL(request.url).searchParams; } catch (e) { return new URLSearchParams(); } })();
      const fpLfC = lfParseFilter(spLfC);
      const raderLfC = lfFiltrer(lfScenario(dataLf.rows || [], fpLfC.scenario), fpLfC.filtre, fpLfC.sok);
      const filtrertLfC = lfHarFilter(fpLfC.filtre, fpLfC.sok) || Boolean(fpLfC.scenario);
      return new NextResponse(lagLeieforholdCsv({ rows: raderLfC }), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="digihome-leieforhold-inntekter${filtrertLfC ? '-filtrert' : ''}.csv"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── Budsjett — årsbudsjett per kategori/måned med budsjett-vs-faktisk.
    // Lesing: modulen 'budsjett' (admin alltid; investor/øvrige kun tildelt).
    // Skriving + forslag: kun admin. Faktiske tall rekonstrueres fra Økonomi-
    // motoren (signerte leiekontrakter + manuelle kostnader) — se lib/budsjett.js.
    if (route === '/admin/budsjett' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'budsjett'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uB = new URL(request.url);
      const yearB = gyldigBudsjettAar(uB.searchParams.get('year')) || new Date().getFullYear();
      const [bud, faktisk] = await Promise.all([hentBudsjett(db, yearB), beregnFaktisk(db, yearB)]);
      // «Sikret nå» — live kontraktsfestet honorar for året (referanselinje mot
      // budsjettets frosne sikret-lag). Best effort: null hvis plattformen feiler.
      // «modell24» (kun inneværende år) — 24-måneders inntektsmodell (sikret +
      // årets lagrede antakelser, kontinuerlig over årsskiftet). Brukes av
      // «Neste 12 mnd»-visningen til å fylle månedene etter nyttår når neste
      // års budsjett ikke er lagt: uten antakelser = ren kontraktsfestet serie.
      let sikretNaa = null;
      let modell24 = null;
      try {
        const lfS = await hentLeieforhold(leieforholdTarget(), { db });
        if (lfS.ok) {
          sikretNaa = beregnSikretSerie(lfS.rows, yearB);
          if (yearB === new Date().getFullYear()) {
            const m24 = beregnInntektsmodell({ rows: lfS.rows, year: yearB, antakelser: bud.antakelser || {}, antallMnd: 24 });
            modell24 = { sikret: m24.sikret, vekst: m24.vekst, oppstart: m24.oppstart, total: m24.total };
          }
        }
      } catch (e) { sikretNaa = null; modell24 = null; }
      return cors(NextResponse.json({
        ok: true, ...bud, faktisk, sikretNaa, modell24,
        kategorier: { inntekter: INNTEKT_KATEGORIER, kostnader: KOSTNAD_KATEGORIER },
      }));
    }
    // Excel-eksport av budsjettet (styremøteklar, levende formler) — lesing:
    // samme modul-tilgang som GET, slik at investorer kan laste ned fra datarommet.
    if (route === '/admin/budsjett/xlsx' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'budsjett'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uX = new URL(request.url);
      // Rullerende 12 mnd (?vindu=rullerende): investorvisning over årsgrensen.
      // ?modell=1: er neste års budsjett ikke lagt, fylles halen med inntekts-
      // modellen (kontraktsfestet + årets antakelser) og videreførte faste
      // kostnader — samme tall som «Neste 12 mnd»-skjermen viser investorer.
      if (uX.searchParams.get('vindu') === 'rullerende') {
        const naaX = new Date();
        const fraAarX = naaX.getUTCFullYear(), fraMndX = naaX.getUTCMonth();
        const [budA, budB0] = await Promise.all([hentBudsjett(db, fraAarX), hentBudsjett(db, fraAarX + 1)]);
        let budB = budB0;
        let merknadX = '';
        if (uX.searchParams.get('modell') === '1' && !budB0?.finnes) {
          try {
            const lfX = await hentLeieforhold(leieforholdTarget(), { db });
            if (lfX.ok) {
              const m24x = beregnInntektsmodell({ rows: lfX.rows, year: fraAarX, antakelser: budA?.antakelser || {}, antallMnd: 24 });
              budB = {
                ...budB0,
                inntekter: {
                  [INNTEKT_KATEGORIER[0]]: m24x.total.slice(12),
                  [INNTEKT_KATEGORIER[1]]: m24x.oppstart.slice(12),
                },
                kostnader: Object.fromEntries(KOSTNAD_KATEGORIER.map((k) => [k, Array(12).fill(Number(budA?.kostnader?.[k]?.[11]) || 0)])),
                egnePoster: [],
              };
              merknadX = `månedene i ${fraAarX + 1} er modell (kontraktsfestet inntekt + antakelser, videreførte faste kostnader) — budsjettet for ${fraAarX + 1} er ikke vedtatt ennå`;
            }
          } catch (e) { /* halen forblir 0 — ærlig fallback */ }
        }
        const bufR = await lagBudsjettExcelRullerende({ budsjettA: budA, budsjettB: budB, fraAar: fraAarX, fraMnd: fraMndX, merknad: merknadX });
        return new NextResponse(bufR, {
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="digihome-budsjett-neste-12-mnd.xlsx"',
            'Cache-Control': 'no-store',
          },
        });
      }
      const yearX = gyldigBudsjettAar(uX.searchParams.get('year')) || new Date().getFullYear();
      const [budX, faktiskX] = await Promise.all([hentBudsjett(db, yearX), beregnFaktisk(db, yearX)]);
      const bufX = await lagBudsjettExcel({ budsjett: budX, faktisk: faktiskX, year: yearX });
      return new NextResponse(bufX, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="digihome-budsjett-${yearX}.xlsx"`,
          'Cache-Control': 'no-store',
        },
      });
    }
    // Årsoversikt: alle budsjettår med status/nøkkelsummer (årsvelger + wizard).
    // Lesing med budsjett-modulen — investorer ser også listen.
    if (route === '/admin/budsjett/aar' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'budsjett'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      return cors(NextResponse.json({ ok: true, aar: await listBudsjettAar(db) }));
    }
    if (route === '/admin/budsjett' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyB = {}; try { bodyB = await request.json(); } catch (e) { bodyB = {}; }
      const yearB = gyldigBudsjettAar(bodyB.year);
      if (!yearB) return cors(NextResponse.json({ ok: false, error: 'Ugyldig år' }, { status: 400 }));
      let navnB = '';
      const sesjonB = sessionFra(request);
      if (sesjonB && sesjonB.sub) {
        try { const uDoc = await db.collection('admin_users').findOne({ id: sesjonB.sub }, { projection: { name: 1 } }); navnB = (uDoc && uDoc.name) || sesjonB.email || ''; } catch (e) {}
      }
      // Inntektsmodellen (modell B): «Lås inntektsbudsjett» beregner sikret +
      // vekst fra live portefølje + antakelser, fryser seriene i honorarLaas og
      // speiler totalene inn i de klassiske inntektsradene (avvik/Excel/KPI-er
      // fungerer uendret). «Lås opp» fjerner låsen — tallene blir stående.
      let inntekterB = bodyB.inntekter;
      let honorarLaasB; // undefined = ikke rør eksisterende lås
      if (bodyB.laasInntekt === true) {
        const lfL = await hentLeieforhold(leieforholdTarget(), { db });
        if (!lfL.ok) return cors(NextResponse.json({ ok: false, error: lfL.error || 'Kunne ikke hente porteføljen — låsing avbrutt' }, { status: 502 }));
        const modellL = beregnInntektsmodell({ rows: lfL.rows, year: yearB, antakelser: bodyB.antakelser || {} });
        honorarLaasB = { sikret: modellL.sikret, vekst: modellL.vekst, oppstart: modellL.oppstart, laastAt: new Date().toISOString(), laastAv: navnB };
        inntekterB = { ...(bodyB.inntekter || {}), 'Honorar (forvaltning)': modellL.total, 'Oppstartshonorar': modellL.oppstart };
      } else if (bodyB.laasOpp === true) {
        honorarLaasB = null;
      }
      const lagret = await lagreBudsjett(db, { year: yearB, inntekter: inntekterB, kostnader: bodyB.kostnader, egnePoster: bodyB.egnePoster, kommentarer: bodyB.kommentarer, notat: bodyB.notat, updatedBy: navnB, antakelser: bodyB.antakelser, honorarLaas: honorarLaasB });
      return cors(NextResponse.json({ ok: true, ...lagret }));
    }
    // ── Frittstående budsjetter («planer»): navn + fri periode + status ──────
    // Lesing krever budsjett-modulen; skriving/sletting krever admin.
    if (route === '/admin/budsjett/planer' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'budsjett'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // Ikke-admin (investor/bruker med modulen) ser KUN budsjetter som er delt med investorrommet
      return cors(NextResponse.json({ ok: true, planer: await listPlaner(db, { kunInvestorSynlige: !adminAuthed(request) }) }));
    }
    if (route === '/admin/budsjett/plan' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'budsjett'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idP = (() => { try { return new URL(request.url).searchParams.get('id') || ''; } catch (e) { return ''; } })();
      const planP = await hentPlan(db, idP);
      if (!planP) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (!adminAuthed(request) && !planP.investorSynlig) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const faktiskP = await beregnFaktiskPeriode(db, planP.startYm, planP.antallMnd);
      return cors(NextResponse.json({ ok: true, plan: planP, faktisk: faktiskP }));
    }
    if (route === '/admin/budsjett/plan' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyP = {}; try { bodyP = await request.json(); } catch (e) {}
      let navnP = '';
      const sesjonP = sessionFra(request);
      if (sesjonP && sesjonP.sub) {
        try { const uDocP = await db.collection('admin_users').findOne({ id: sesjonP.sub }, { projection: { name: 1 } }); navnP = (uDocP && uDocP.name) || sesjonP.email || ''; } catch (e) {}
      }
      const resP = await lagrePlan(db, { ...bodyP, updatedBy: navnP || 'Admin' });
      if (!resP.ok) return cors(NextResponse.json({ ok: false, error: resP.error }, { status: resP.status || 400 }));
      return cors(NextResponse.json({ ok: true, id: resP.id }));
    }
    if (route === '/admin/budsjett/plan' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idPd = (() => { try { return new URL(request.url).searchParams.get('id') || ''; } catch (e) { return ''; } })();
      const resPd = await slettPlan(db, idPd);
      if (!resPd.ok) return cors(NextResponse.json({ ok: false, error: resPd.error }, { status: resPd.status || 404 }));
      return cors(NextResponse.json({ ok: true }));
    }
    // Porteføljeforslag for en fri periode (?startYm=ÅÅÅÅ-MM&antallMnd=12
    // [+ nye/churn/fyll/snittleie/honorarpct/oppstart]) — modell B skåret til vinduet.
    if (route === '/admin/budsjett/plan/forslag' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uPf = new URL(request.url);
      const startYmPf = gyldigYm(uPf.searchParams.get('startYm'));
      const antallPf = Math.round(Number(uPf.searchParams.get('antallMnd'))) || 12;
      if (!startYmPf) return cors(NextResponse.json({ ok: false, error: 'startYm må være ÅÅÅÅ-MM' }, { status: 400 }));
      if (!(antallPf >= 1 && antallPf <= 36)) return cors(NextResponse.json({ ok: false, error: 'antallMnd må være 1–36' }, { status: 400 }));
      const lfPf = await hentLeieforhold(leieforholdTarget(), { db });
      if (!lfPf.ok) return cors(NextResponse.json({ ok: false, error: lfPf.error || 'Kunne ikke hente porteføljen' }, { status: 502 }));
      const costsPf = await hentBudsjettKostnader(db);
      const forslagPf = lagForslagForPeriode({
        rows: lfPf.rows, costs: costsPf, startYm: startYmPf, antallMnd: antallPf,
        antakelser: {
          nyeEnheterPerMnd: uPf.searchParams.get('nye'),
          churnPctAar: uPf.searchParams.get('churn'),
          fyllLedigPerMnd: uPf.searchParams.get('fyll'),
          snittLeie: uPf.searchParams.get('snittleie'),
          honorarPct: uPf.searchParams.get('honorarpct'),
          oppstartPerEnhet: uPf.searchParams.get('oppstart'),
        },
      });
      return cors(NextResponse.json({ ok: true, startYm: startYmPf, antallMnd: antallPf, ...forslagPf }));
    }
    // Inntektsmodell (modell B) — forhåndsvisning: sikret (live fra plattformen)
    // + antakelser (?nye=&churn=&fyll=&snittleie=&honorarpct=&oppstart=).
    // Returnerer dekomponert serie + kostnadsseed (til «fyll kostnader»-valget).
    if (route === '/admin/budsjett/inntektsmodell' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uM = new URL(request.url);
      const yearM = gyldigBudsjettAar(uM.searchParams.get('year')) || new Date().getFullYear();
      const lfM = await hentLeieforhold(leieforholdTarget(), { db });
      if (!lfM.ok) return cors(NextResponse.json({ ok: false, error: lfM.error || 'Kunne ikke hente porteføljen' }, { status: 502 }));
      const modellM = beregnInntektsmodell({
        rows: lfM.rows, year: yearM,
        antakelser: {
          nyeEnheterPerMnd: uM.searchParams.get('nye'),
          churnPctAar: uM.searchParams.get('churn'),
          fyllLedigPerMnd: uM.searchParams.get('fyll'),
          snittLeie: uM.searchParams.get('snittleie'),
          honorarPct: uM.searchParams.get('honorarpct'),
          oppstartPerEnhet: uM.searchParams.get('oppstart'),
        },
      });
      // Kostnadsseed + grunnlag gjenbrukes fra forslagsmotoren (kostnadssiden
      // er ikke kontraktsfestet i plattformen — seeding gir fortsatt mening der).
      const costsM = await hentBudsjettKostnader(db);
      const seedM = lagForslag({ rows: lfM.rows, costs: costsM, year: yearM, drivere: {} });
      return cors(NextResponse.json({
        ok: true, year: yearM, ...modellM,
        grunnlag: seedM.grunnlag, kostnader: seedM.kostnader,
        kilde: { source: lfM.source, env: lfM.env, antallRader: lfM.rows.length },
      }));
    }
    // Forslag fra porteføljen: leieforhold-radene (cache-vennlig) + dagens
    // løpende kostnader → driver-basert budsjettforslag. ?nye=&fyll=&snittleie=
    // &honorarpct=&oppstart= overstyrer driverne; ?env= velger plattformmiljø.
    if (route === '/admin/budsjett/forslag' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uF = new URL(request.url);
      const yearF = gyldigBudsjettAar(uF.searchParams.get('year')) || new Date().getFullYear();
      const lf = await hentLeieforhold(leieforholdTarget(), { db });
      if (!lf.ok) return cors(NextResponse.json({ ok: false, error: lf.error || 'Kunne ikke hente porteføljen' }, { status: 502 }));
      const costsF = await hentBudsjettKostnader(db);
      const forslag = lagForslag({
        rows: lf.rows, costs: costsF, year: yearF,
        antallMnd: uF.searchParams.get('horisont') === '24' ? 24 : 12,
        drivere: {
          nyeEnheterPerMnd: uF.searchParams.get('nye'),
          fyllLedigPerMnd: uF.searchParams.get('fyll'),
          snittLeie: uF.searchParams.get('snittleie'),
          honorarPct: uF.searchParams.get('honorarpct'),
          oppstartPerEnhet: uF.searchParams.get('oppstart'),
        },
      });
      return cors(NextResponse.json({ ok: true, year: yearF, kilde: { source: lf.source, env: lf.env, antallRader: lf.rows.length }, ...forslag }));
    }
    // Frys faktiske månedstall (snapshots) manuelt — kjøres ellers av dagscronen.
    // Idempotent: fanger kun avsluttede måneder som mangler snapshot.
    if (route === '/admin/budsjett/snapshot' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const resS = await fangFaktiskEtterslep(db);
      return cors(NextResponse.json({ ok: true, ...resS }));
    }

    // ═══ DATAROM — investorrommet (per-side modultilgang: dr-*) ═════════════
    // Lesing: modulAuthed per side (admin alltid; investor kun tildelte sider).
    // All skriving er admin-only. Se lib/datarom.js for datalogikken.
    if (route === '/admin/datarom/oversikt' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dr-oversikt'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      await drAutoSync(db, async () => (await hentLeieforhold(leieforholdTarget(), { db })).rows || []);
      return cors(NextResponse.json({ ok: true, oversikt: await drBeregnOversikt(db) }));
    }
    // ═══ SALGSRADAR — FINN-annonse → analyse → AI-styling → tilbudsside ═══
    if (route === '/admin/salgsradar/hent' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bSr = {}; try { bSr = await request.json(); } catch (e) {}
      const kodeSr = finnKodeFraUrl(bSr.url);
      if (!kodeSr) return cors(NextResponse.json({ ok: false, error: 'Lim inn en gyldig FINN-annonse-URL (www.finn.no, med finnkode)' }, { status: 400 }));
      let htmlSr;
      try { htmlSr = await hentFinnHtml(kodeSr); } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message || 'Kunne ikke hente annonsen' }, { status: 502 })); }
      const annonseSr = parseFinnAnnonse(htmlSr, kodeSr);
      if (!annonseSr.pris) return cors(NextResponse.json({ ok: false, error: 'Fant ikke månedsleie i annonsen — er dette en leieannonse?' }, { status: 422 }));
      let rowsSr = [];
      try { const lfSr = await hentLeieforhold(leieforholdTarget(), { db }); rowsSr = lfSr.rows || []; } catch (e) { /* analyse uten portefølje */ }
      const analyseSr = beregnAnalyse(annonseSr, rowsSr);
      const resSr = await opprettLead(db, annonseSr, analyseSr, `https://www.finn.no/realestate/lettings/ad.html?finnkode=${kodeSr}`);
      // Auto-pipeline i bakgrunnen for NYE leads: analyse + bildeforbedring (5 første)
      if (!resSr.fantesFraFor) kjorAutoPipeline(db, resSr.lead.id).catch(() => {});
      return cors(NextResponse.json({ ok: true, ...resSr }));
    }
    if (route === '/admin/salgsradar/leads' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'salgsradar'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      return cors(NextResponse.json({ ok: true, leads: await radarListLeads(db) }));
    }
    if (route === '/admin/salgsradar/lead' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bSrO = {}; try { bSrO = await request.json(); } catch (e) {}
      const rSrO = await radarOppdaterLead(db, bSrO);
      if (!rSrO.ok) return cors(NextResponse.json({ ok: false, error: rSrO.error }, { status: rSrO.status || 400 }));
      return cors(NextResponse.json(rSrO));
    }
    if (route === '/admin/salgsradar/lead' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idSrD = (() => { try { return new URL(request.url).searchParams.get('id') || ''; } catch (e) { return ''; } })();
      const rSrD = await radarSlettLead(db, idSrD);
      if (!rSrD.ok) return cors(NextResponse.json({ ok: false, error: rSrD.error }, { status: rSrD.status || 404 }));
      return cors(NextResponse.json({ ok: true }));
    }
    // Bulk-sletting: {ids: [...]} — multivalg i admin (maks 100)
    if (route === '/admin/salgsradar/slett-mange' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bSrM = {}; try { bSrM = await request.json(); } catch (e) {}
      const rSrM = await radarSlettLeads(db, bSrM.ids);
      if (!rSrM.ok) return cors(NextResponse.json({ ok: false, error: rSrM.error }, { status: rSrM.status || 400 }));
      return cors(NextResponse.json({ ok: true, slettet: rSrM.slettet }));
    }
    // Full AI-analyse av annonsen (Gemini, ett kall — caches på leaden).
    // Kan ta 15-40 sek: laster ned bilder, måler piksler og lar AI vurdere.
    if (route === '/admin/salgsradar/analyser' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`radar-analyse:${clientIp(request)}`, 10)) return cors(NextResponse.json({ error: 'For mange analyser — vent litt' }, { status: 429 }));
      let bAn = {}; try { bAn = await request.json(); } catch (e) {}
      const rAn = await analyserAnnonse(db, bAn.leadId);
      if (!rAn.ok) return cors(NextResponse.json({ ok: false, error: rAn.error }, { status: rAn.status || 502 }));
      return cors(NextResponse.json({ ok: true, lead: rAn.lead }));
    }
    // AI-styling av ett annonsebilde (Nano Banana) — kan ta 20–60 sek.
    if (route === '/admin/salgsradar/stil' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bSt = {}; try { bSt = await request.json(); } catch (e) {}
      const leadSt = await db.collection('salgsradar_leads').findOne({ id: String(bSt.leadId || '') });
      if (!leadSt) return cors(NextResponse.json({ ok: false, error: 'Lead ikke funnet' }, { status: 404 }));
      if (!(leadSt.bilder || []).includes(bSt.bildeUrl)) return cors(NextResponse.json({ ok: false, error: 'Bildet tilhører ikke denne annonsen' }, { status: 400 }));
      if ((leadSt.stylet || []).length >= 6) return cors(NextResponse.json({ ok: false, error: 'Maks 6 stylede bilder per lead' }, { status: 400 }));
      const stilSt = RADAR_STILER[bSt.stil] ? bSt.stil : 'optimal';
      try {
        const dataUrlSt = await stilBilde(bSt.bildeUrl, stilSt);
        const bildeIdSt = await lagreStyletBilde(db, leadSt.id, bSt.bildeUrl, stilSt, dataUrlSt);
        return cors(NextResponse.json({ ok: true, bildeId: bildeIdSt, stil: stilSt }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message || 'AI-styling feilet' }, { status: 502 }));
      }
    }
    // ── Manuell stylingflyt: jobber + review (kuratert, aldri automatisk) ──
    // Opprett stylingjobber for valgte bilder — kjøres i bakgrunnen, UI poller.
    if (route === '/admin/salgsradar/styling-jobber' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`radar-styling:${clientIp(request)}`, 20)) return cors(NextResponse.json({ error: 'For mange forespørsler — vent litt' }, { status: 429 }));
      let bJb = {}; try { bJb = await request.json(); } catch (e) {}
      const rJb = await opprettStylingJobber(db, bJb.leadId, bJb.bilder);
      if (!rJb.ok) return cors(NextResponse.json({ ok: false, error: rJb.error }, { status: rJb.status || 400 }));
      kjorStylingJobber(db, bJb.leadId).catch(() => {});
      return cors(NextResponse.json({ ok: true, jobber: rJb.jobber, hoppet: rJb.hoppet }));
    }
    if (route === '/admin/salgsradar/styling-jobber' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'salgsradar'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const lidJb = (() => { try { return new URL(request.url).searchParams.get('leadId') || ''; } catch (e) { return ''; } })();
      if (!lidJb) return cors(NextResponse.json({ ok: false, error: 'leadId mangler' }, { status: 400 }));
      return cors(NextResponse.json({ ok: true, jobber: await listStylingJobber(db, lidJb) }));
    }
    // Review: godkjenn / forkast / provIgjen (med ev. justerte parametere)
    if (route === '/admin/salgsradar/styling-review' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bRv = {}; try { bRv = await request.json(); } catch (e) {}
      const rRv = await reviewStylingJobb(db, bRv);
      if (!rRv.ok) return cors(NextResponse.json({ ok: false, error: rRv.error }, { status: rRv.status || 400 }));
      if (rRv.startKjorer && rRv.nyJobb) kjorStylingJobber(db, rRv.nyJobb.leadId).catch(() => {});
      return cors(NextResponse.json(rRv));
    }
    // Fjern et godkjent stylet bilde fra leadens galleri (kuratering)
    if (route === '/admin/salgsradar/stylet-bilde' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spFj = (() => { try { return new URL(request.url).searchParams; } catch (e) { return new URLSearchParams(); } })();
      const rFj = await fjernStyletBilde(db, spFj.get('leadId'), spFj.get('bildeId'));
      if (!rFj.ok) return cors(NextResponse.json({ ok: false, error: rFj.error }, { status: rFj.status || 400 }));
      return cors(NextResponse.json({ ok: true }));
    }
    // Manuell retry av bilder som feilet i auto-pipelinen. Kjører i bakgrunnen
    // (fire-and-forget) — UI-et følger fremdriften via polling på lead.auto.
    if (route === '/admin/salgsradar/auto-retry' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`radar-retry:${clientIp(request)}`, 10)) return cors(NextResponse.json({ error: 'For mange forsøk — vent litt' }, { status: 429 }));
      let bRt = {}; try { bRt = await request.json(); } catch (e) {}
      const leadRt = await db.collection('salgsradar_leads').findOne({ id: String(bRt.leadId || '') });
      if (!leadRt) return cors(NextResponse.json({ ok: false, error: 'Lead ikke funnet' }, { status: 404 }));
      if (['analyserer', 'styler'].includes(leadRt.auto?.status)) return cors(NextResponse.json({ ok: false, error: 'Automatikken kjører allerede' }, { status: 409 }));
      if (!retryKandidater(leadRt).length) return cors(NextResponse.json({ ok: false, error: 'Ingen feilede bilder å prøve på nytt' }, { status: 400 }));
      kjorAutoRetry(db, leadRt.id).catch(() => {});
      return cors(NextResponse.json({ ok: true, startet: true }));
    }

    // ── Maskin-ingest: ekstern overvåkningsagent mater inn nye FINN-annonser ──
    // Full payload (alternativ B): agenten scraper selv og sender ferdige
    // felter. Egen smal Bearer-nøkkel (SALGSRADAR_INGEST_KEY) — IKKE admin-
    // nøkkelen — så den kan roteres uavhengig og kun kan mate inn annonser.
    // Idempotent: kjent finnkode oppfrisker annonsedata uten å røre pipeline.
    if (route === '/salgsradar/ingest' && method === 'POST') {
      if (!rateLimit(`radar-ingest:${clientIp(request)}`, 30)) return cors(NextResponse.json({ error: 'For mange forespørsler' }, { status: 429 }));
      const ingestKey = process.env.SALGSRADAR_INGEST_KEY || '';
      if (!ingestKey) return cors(NextResponse.json({ ok: false, error: 'Ingest er ikke konfigurert' }, { status: 503 }));
      const authHode = request.headers.get('authorization') || '';
      const innsendt = authHode.startsWith('Bearer ') ? authHode.slice(7).trim() : '';
      const nokkelOk = (() => {
        try {
          const a = Buffer.from(innsendt); const b = Buffer.from(ingestKey);
          return a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch (e) { return false; }
      })();
      if (!nokkelOk) return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      let bIn = {}; try { bIn = await request.json(); } catch (e) {}
      // Enkelt objekt eller batch: { annonser: [...] } (maks 10 per kall)
      const erBatch = Array.isArray(bIn.annonser);
      const partier = erBatch ? bIn.annonser.slice(0, 10) : [bIn];
      if (!partier.length) return cors(NextResponse.json({ ok: false, error: 'Tom forsendelse' }, { status: 400 }));
      if (erBatch && bIn.annonser.length > 10) return cors(NextResponse.json({ ok: false, error: 'Maks 10 annonser per kall' }, { status: 400 }));
      // Porteføljedata hentes ÉN gang for hele forsendelsen
      let rowsIn = [];
      try { const lfIn = await hentLeieforhold(leieforholdTarget(), { db }); rowsIn = lfIn.rows || []; } catch (e) { /* analyse uten portefølje */ }
      const resultater = [];
      const nyeLeads = [];
      const prisEndringer = [];
      const deaktiverte = [];
      for (const p of partier) {
        const fkRaa = String(p?.finnkode || '').trim();
        // Tombstone: brukeren har bevisst slettet denne — ikke gjenoppliv
        if (/^\d{8,10}$/.test(fkRaa)) {
          const tomb = await db.collection('salgsradar_tombstones').findOne({ finnkode: fkRaa });
          if (tomb) { resultater.push({ ok: true, finnkode: fkRaa, hoppet: 'slettet-i-admin' }); continue; }
        }
        // Deaktivering: agenten melder at annonsen er tatt av FINN.
        // Payload: { finnkode, deaktivert: true } (også aktiv:false / status:'deaktivert')
        if (p && (p.deaktivert === true || p.aktiv === false || String(p.status || '').toLowerCase() === 'deaktivert')) {
          if (!/^\d{8,10}$/.test(fkRaa)) { resultater.push({ ok: false, finnkode: fkRaa, error: 'finnkode må være 8-10 siffer' }); continue; }
          const leadDe = await db.collection('salgsradar_leads').findOne({ finnkode: fkRaa });
          if (!leadDe) { resultater.push({ ok: true, finnkode: fkRaa, hoppet: 'ukjent-finnkode' }); continue; }
          if (leadDe.annonseAktiv !== false) {
            await db.collection('salgsradar_leads').updateOne(
              { id: leadDe.id },
              { $set: { annonseAktiv: false, deaktivertAt: new Date().toISOString(), updatedAt: new Date().toISOString() } },
            );
            deaktiverte.push(leadDe);
          }
          resultater.push({ ok: true, finnkode: fkRaa, leadId: leadDe.id, deaktivert: true });
          continue;
        }
        const val = validerIngestAnnonse(p);
        if (!val.ok) { resultater.push({ ok: false, finnkode: String(p?.finnkode || ''), error: val.error }); continue; }
        // Dropp døde finncdn-lenker (agenten sender av og til utdaterte URL-er → 404)
        if (Array.isArray(val.annonse.bilder) && val.annonse.bilder.length) {
          val.annonse.bilder = await filtrerLevendeBilder(val.annonse.bilder);
        }
        const analyseIn = beregnAnalyse(val.annonse, rowsIn);
        const resIn = await opprettLead(db, val.annonse, analyseIn, val.kildeUrl, { kilde: 'agent' });
        resultater.push({ ok: true, finnkode: val.annonse.finnkode, leadId: resIn.lead.id, tilbudSlug: resIn.lead.tilbudSlug, ny: !resIn.fantesFraFor, ...(resIn.prisEndring ? { prisEndring: resIn.prisEndring } : {}) });
        if (resIn.prisEndring) prisEndringer.push({ lead: resIn.lead, endring: resIn.prisEndring });
        if (!resIn.fantesFraFor) {
          nyeLeads.push(resIn.lead);
          // Auto-pipeline i bakgrunnen: analyse + bildeforbedring (5 første).
          // Kjøres KUN for nye leads — oppdateringer/prisendringer re-styler ikke.
          kjorAutoPipeline(db, resIn.lead.id).catch(() => {});
        }
      }
      // In-app varsler til owner/admin: nye leads, prisendringer og deaktiveringer
      try {
        const adminsIn = await db.collection('admin_users').find({ role: { $in: ['owner', 'admin'] } }, { projection: { id: 1 } }).toArray();
        const nb = (v) => new Intl.NumberFormat('nb-NO').format(v);
        for (const nl of nyeLeads) {
          const prisTekst = nl.pris ? ` (${nb(nl.pris)} kr/mnd)` : '';
          for (const aIn of adminsIn) await varsle(db, aIn.id, null, { type: 'salgsradar', text: `Salgsradar: agenten fanget ny annonse — ${nl.adresse}${prisTekst}` });
        }
        for (const pe of prisEndringer) {
          const pct = pe.endring.fra ? Math.round((Math.abs(pe.endring.til - pe.endring.fra) / pe.endring.fra) * 100) : 0;
          const retning = pe.endring.til < pe.endring.fra ? `Priskutt −${pct} %` : `Prisøkning +${pct} %`;
          for (const aIn of adminsIn) await varsle(db, aIn.id, null, { type: 'salgsradar', text: `Salgsradar: ${retning} på ${pe.lead.adresse} — ${nb(pe.endring.fra)} → ${nb(pe.endring.til)} kr/mnd` });
        }
        for (const de of deaktiverte) {
          for (const aIn of adminsIn) await varsle(db, aIn.id, null, { type: 'salgsradar', text: `Salgsradar: annonsen for ${de.adresse} er tatt av FINN — trolig utleid eller trukket` });
        }
      } catch (e) { /* varsling er best effort */ }
      const alleFeilet = resultater.every((x) => !x.ok);
      if (erBatch) return cors(NextResponse.json({ ok: !alleFeilet, resultater }, { status: alleFeilet ? 400 : 200 }));
      const ene = resultater[0];
      return cors(NextResponse.json(ene, { status: ene.ok ? (ene.ny ? 201 : 200) : 400 }));
    }

    // ── Offentlige tilbudsruter (uhindret av auth — slug er ugjettbar) ──
    if (route === '/tilbud' && method === 'GET') {
      if (!rateLimit(`tilbud:${clientIp(request)}`, 60)) return cors(NextResponse.json({ error: 'For mange forespørsler' }, { status: 429 }));
      const uTb = new URL(request.url);
      const tb = await hentTilbud(db, uTb.searchParams.get('slug'), { sporAapning: uTb.searchParams.get('spor') === '1' });
      if (!tb) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      return cors(NextResponse.json({ ok: true, tilbud: tb }));
    }
    if (route === '/tilbud/kontakt' && method === 'POST') {
      if (!rateLimit(`tilbud-kontakt:${clientIp(request)}`, 8)) return cors(NextResponse.json({ error: 'For mange forespørsler' }, { status: 429 }));
      let bTk = {}; try { bTk = await request.json(); } catch (e) {}
      const rTk = await registrerTilbudKontakt(db, bTk.slug, bTk);
      if (!rTk.ok) return cors(NextResponse.json({ ok: false, error: rTk.error }, { status: rTk.status || 400 }));
      // In-app varsel til alle owner/admin: huseier har svart på tilbudet
      try {
        const adminsTk = await db.collection('admin_users').find({ role: { $in: ['owner', 'admin'] } }, { projection: { id: 1 } }).toArray();
        for (const aTk of adminsTk) {
          await varsle(db, aTk.id, null, { type: 'salgsradar', text: `Salgsradar: huseier svarte på tilbudet for ${rTk.adresse}` });
        }
      } catch (e) { /* varsling er best effort */ }
      return cors(NextResponse.json({ ok: true }));
    }
    // Stylede bilder (binært) — brukes av både admin-skuffen og tilbudssiden
    if (route === '/tilbud/bilde' && method === 'GET') {
      if (!rateLimit(`tilbud-bilde:${clientIp(request)}`, 120)) return cors(NextResponse.json({ error: 'For mange forespørsler' }, { status: 429 }));
      const idTb = (() => { try { return new URL(request.url).searchParams.get('id') || ''; } catch (e) { return ''; } })();
      const bildeTb = await hentStyletBilde(db, idTb);
      if (!bildeTb || !bildeTb.dataUrl) return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
      const [hodeTb, b64Tb] = String(bildeTb.dataUrl).split(',');
      const mimeTb = (hodeTb.match(/^data:([^;]+);/) || [])[1] || 'image/png';
      return new NextResponse(Buffer.from(b64Tb, 'base64'), {
        headers: { 'Content-Type': mimeTb, 'Cache-Control': 'public, max-age=604800, immutable' },
      });
    }

    if (route === '/admin/datarom/enhetsokonomi' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dr-enheter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // Auto-synk: porteføljefakta speiler Leieforhold (maks hvert 10. min).
      await drAutoSync(db, async () => (await hentLeieforhold(leieforholdTarget(), { db })).rows || []);
      return cors(NextResponse.json({ ok: true, ...(await eoHent(db)) }));
    }
    if (route === '/admin/datarom/enhetsokonomi/antakelser' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyEoA = {}; try { bodyEoA = await request.json(); } catch (e) {}
      const resEoA = await eoLagre(db, bodyEoA);
      if (!resEoA.ok) return cors(NextResponse.json({ ok: false, error: resEoA.error }, { status: resEoA.status || 400 }));
      return cors(NextResponse.json(resEoA));
    }
    if (route === '/admin/datarom/enheter' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const modulDr = sp.get('fase') === 'pipeline' ? 'dr-pipeline' : 'dr-enheter';
      if (!(await modulAuthed(request, db, modulDr))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // Auto-synk: enhetsøkonomien speiler alltid Leieforhold-porteføljen
      // (maks hvert 10. min; manuelle felt som kostnader/notat røres aldri).
      const syncDr = await drAutoSync(db, async () => (await hentLeieforhold(leieforholdTarget(), { db })).rows || []);
      const beggeDr = await drListEnheter(db);
      return cors(NextResponse.json({ ok: true, ...beggeDr, autoSync: syncDr }));
    }
    if (route === '/admin/datarom/enheter' && (method === 'POST' || method === 'PUT')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyDr = {}; try { bodyDr = await request.json(); } catch (e) {}
      const resDr = await drLagreEnhet(db, bodyDr);
      return cors(NextResponse.json(resDr, { status: resDr.ok ? (method === 'POST' ? 201 : 200) : 400 }));
    }
    if (route === '/admin/datarom/enheter' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const idDr = new URL(request.url).searchParams.get('id') || '';
      const resDr = await drSlettEnhet(db, idDr);
      return cors(NextResponse.json(resDr, { status: resDr.ok ? 200 : 404 }));
    }
    // Import fra Leieforhold-porteføljen (idempotent på kildeId; manuelt
    // vedlikeholdte felt som direkte kostnader/notat overskrives ALDRI).
    if (route === '/admin/datarom/enheter/import' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const lfDr = await hentLeieforhold(leieforholdTarget(), { db });
      if (!lfDr.ok) return cors(NextResponse.json({ ok: false, error: lfDr.error || 'Kunne ikke hente porteføljen' }, { status: 502 }));
      const resDr = await drImporterFraLeieforhold(db, lfDr.rows || []);
      return cors(NextResponse.json({ ...resDr, kilde: { source: lfDr.source, env: lfDr.env, antallRader: (lfDr.rows || []).length } }));
    }
    if (route === '/admin/datarom/pnl' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dr-resultat'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      return cors(NextResponse.json({ ok: true, rader: await drListPnl(db) }));
    }
    if (route === '/admin/datarom/pnl' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyDr = {}; try { bodyDr = await request.json(); } catch (e) {}
      const resDr = await drLagrePnlRad(db, bodyDr);
      return cors(NextResponse.json(resDr, { status: resDr.ok ? 200 : 400 }));
    }
    if (route === '/admin/datarom/pnl' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const ymDr = new URL(request.url).searchParams.get('ym') || '';
      const resDr = await drSlettPnlRad(db, ymDr);
      return cors(NextResponse.json(resDr, { status: resDr.ok ? 200 : 404 }));
    }
    if (route === '/admin/datarom/selskap' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dr-selskap'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      return cors(NextResponse.json({ ok: true, selskap: await drHentSelskap(db) }));
    }
    if (route === '/admin/datarom/selskap' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyDr = {}; try { bodyDr = await request.json(); } catch (e) {}
      const resDr = await drLagreSelskap(db, bodyDr);
      return cors(NextResponse.json(resDr));
    }
    // Dokumenter: gjenbruker DD-hvelvet fra Investor-rommet (dd_documents) i
    // lesemodus — admin administrerer filene i Investor-rom-modulen.
    if (route === '/admin/datarom/dokumenter' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dr-dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const docsDr = await ddListDocuments(db, { includeArchived: false });
      return cors(NextResponse.json({ ok: true, documents: docsDr, categories: DD_CATEGORIES }));
    }
    if (route === '/admin/datarom/fil' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dr-dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const spDr = new URL(request.url).searchParams;
      const docDr = await ddGetDocument(db, (spDr.get('docId') || '').trim());
      if (!docDr || docDr.archived) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const verDr = (docDr.versions || []).find((v) => v.version === docDr.currentVersion) || (docDr.versions || [])[docDr.versions.length - 1];
      const objDr = verDr ? await getObject(verDr.objectPath) : null;
      if (!objDr) return cors(NextResponse.json({ ok: false, error: 'Filen finnes ikke i lagringen' }, { status: 404 }));
      const resFil = new NextResponse(objDr.buffer, { status: 200 });
      resFil.headers.set('Content-Type', verDr.mime || objDr.contentType || 'application/octet-stream');
      resFil.headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(verDr.filename)}`);
      resFil.headers.set('Cache-Control', 'no-store');
      return cors(resFil);
    }
    // Investorpakke (XLSX): inkluderer KUN seksjonene brukeren har tilgang til.
    if (route === '/admin/datarom/xlsx' && method === 'GET') {
      let tilgangDr = null; // null = admin (alle ark)
      let navnDr = '';
      if (!adminAuthed(request)) {
        const payloadDr = sessionFra(request);
        if (!payloadDr?.sub) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
        const uDr = await db.collection('admin_users').findOne({ id: payloadDr.sub }, { projection: { moduler: 1, name: 1, email: 1 } });
        tilgangDr = (uDr?.moduler || []).filter((k) => k.startsWith('dr-') || k === 'budsjett');
        if (!tilgangDr.length) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
        navnDr = uDr?.name || uDr?.email || '';
      }
      const bufDr = await byggInvestorpakke(db, { navn: navnDr, tilgang: tilgangDr });
      return new NextResponse(bufDr, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename="digihome-investorpakke.xlsx"',
          'Cache-Control': 'no-store',
        },
      });
    }

    // ── Saksmottak-innstillinger: hvem varsles (og følger saken automatisk)
    // når en ny sak meldes inn fra Forvalter-plattformen. Tom mottakerliste =
    // standard (in-app-varsel til alle admin + utviklingsgruppen, ingen e-post).
    if (route === '/admin/dev-issue-innstillinger' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sDs = await db.collection('settings').findOne({ key: 'dev_issue_intake' }, { projection: { _id: 0 } });
      return cors(NextResponse.json({
        ok: true,
        recipientIds: (sDs && Array.isArray(sDs.recipientIds)) ? sDs.recipientIds : [],
        notifyEmail: sDs ? sDs.notifyEmail !== false : true,
        addAsFollowers: sDs ? sDs.addAsFollowers !== false : true,
      }));
    }
    if (route === '/admin/dev-issue-innstillinger' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bodyDs = {}; try { bodyDs = await request.json(); } catch (e) {}
      // Kun eksisterende personer kan stå som mottakere (maks 30).
      const alleIdsDs = new Set((await db.collection('admin_users').find({}, { projection: { id: 1 } }).toArray()).map((u) => u.id));
      const recipientIdsDs = (Array.isArray(bodyDs.recipientIds) ? bodyDs.recipientIds : [])
        .filter((id) => typeof id === 'string' && alleIdsDs.has(id)).slice(0, 30);
      const docDs = {
        key: 'dev_issue_intake',
        recipientIds: recipientIdsDs,
        notifyEmail: bodyDs.notifyEmail !== false,
        addAsFollowers: bodyDs.addAsFollowers !== false,
        updatedAt: new Date().toISOString(),
      };
      await db.collection('settings').updateOne({ key: 'dev_issue_intake' }, { $set: docDs }, { upsert: true });
      return cors(NextResponse.json({ ok: true, recipientIds: docDs.recipientIds, notifyEmail: docDs.notifyEmail, addAsFollowers: docDs.addAsFollowers }));
    }

    // POST /api/bridge/dev-issue — plattform-appen (forvalter/Sara) melder inn
    // feil/endringsforslag/funksjonsønsker som blir en sak i Utvikling-området.
    // Auth: delt AGENT_BRIDGE_SECRET (x-bridge-secret | x-bridge-token |
    // Authorization: Bearer | ?token=). Idempotent på event_id. Skjermbilder
    // (dataUrl png/jpeg/webp, maks 3 à ~1,5 MB) lagres som vanlige sak-vedlegg.
    if ((route === '/bridge/dev-issue' || route === '/bridge/dev-issues') && method === 'POST') {
      const uDi = new URL(request.url);
      const tokenDi = (request.headers.get('x-bridge-secret') || request.headers.get('x-bridge-token')
        || String(request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
        || uDi.searchParams.get('token') || '').trim();
      const secretDi = (process.env.AGENT_BRIDGE_SECRET || '').trim();
      if (!secretDi || tokenDi !== secretDi) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }

      const eventId = String(body.event_id || body.eventId || '').trim().slice(0, 120);
      const tittelDi = String(body.title || '').trim().slice(0, 300);
      if (!tittelDi) return cors(NextResponse.json({ ok: false, error: 'title er påkrevd' }, { status: 400 }));

      // Idempotens: samme event_id → returner eksisterende sak, aldri duplikat.
      if (eventId) {
        const dupDi = await db.collection('tasks').findOne({ 'inbound.eventId': eventId }, { projection: { _id: 0, id: 1 } });
        if (dupDi) return cors(NextResponse.json({ ok: true, task_id: dupDi.id, duplicate: true }));
      }

      // Sakstype + prioritet — tolerante aliaser (norsk/engelsk).
      const typeMapDi = { feil: 'feil', bug: 'feil', error: 'feil', forbedring: 'forbedring', improvement: 'forbedring', endringsforslag: 'forbedring', change: 'forbedring', funksjon: 'funksjon', feature: 'funksjon', ide: 'funksjon', vedlikehold: 'vedlikehold', maintenance: 'vedlikehold' };
      const taskTypeDi = typeMapDi[String(body.type || '').toLowerCase().trim()] || 'feil';
      const sevMapDi = { kritisk: 1, critical: 1, hoy: 1, 'høy': 1, high: 1, blocker: 1, normal: 2, medium: 2, lav: 3, low: 3, minor: 3 };
      const priDi = sevMapDi[String(body.severity || '').toLowerCase().trim()] || 2;

      // Produkt «Forvalter-plattformen» — opprettes automatisk første gang,
      // ferdig seedet med plattformens KANONISKE modulliste (bro-avtalt 12.08)
      // slik at komponentene er stabile fra dag én også i prod.
      await seedDevProducts(db);
      let prodDi = await db.collection('dev_products').findOne({ name: /forvalter/i }, { projection: { _id: 0 } });
      if (!prodDi) {
        const kanoniskeModuler = [
          'Oversikt', 'Operasjonssentral', 'Innboks', 'Reservasjoner', 'Kalender', 'Kanaler',
          'Oppgaver', 'AI-assistent', 'Mine boliger', 'Inntekt', 'Eiendommer', 'Utleieprosesser',
          'Leads', 'Innflytting', 'Leiekontrakter', 'Dokumenter', 'Saker', 'Oppdrag', 'Brukere',
          'Leverandører', 'Driftshåndbok', 'Bildestudio', 'Analyse', 'Forvaltningsavtaler', 'Salg',
          'Økonomi', 'Organisasjon', 'Superadmin', 'Profil', 'Mine annonser', 'DigiHome Pro',
          'Forvalterportal',
        ];
        prodDi = { id: uuidv4(), name: 'Forvalter-plattformen', color: '#f59e0b', components: kanoniskeModuler.map((n) => ({ id: uuidv4(), name: n })), createdAt: new Date().toISOString() };
        await db.collection('dev_products').insertOne({ ...prodDi });
        delete prodDi._id;
      }
      // Komponent = modulen brukeren sto i. Ukjente moduler opprettes
      // automatisk (den kuraterte listen vokser med plattformens moduler).
      const ctxDi = (body.context && typeof body.context === 'object') ? body.context : {};
      const modulDi = String(ctxDi.module || '').trim().slice(0, 60);
      let kompIdDi = null;
      if (modulDi) {
        const eksKompDi = (prodDi.components || []).find((c) => String(c.name).toLowerCase() === modulDi.toLowerCase());
        if (eksKompDi) kompIdDi = eksKompDi.id;
        else if ((prodDi.components || []).length < 50) {
          const nyKompDi = { id: uuidv4(), name: modulDi };
          await db.collection('dev_products').updateOne({ id: prodDi.id }, { $push: { components: nyKompDi } });
          kompIdDi = nyKompDi.id;
        }
      }

      // Beskrivelse: innmelders tekst + strukturert kontekstblokk (markdown).
      const repDi = (body.reporter && typeof body.reporter === 'object') ? body.reporter : {};
      const repNavnDi = String(repDi.name || '').trim().slice(0, 80) || 'Forvalter';
      const linjerDi = [String(body.description || '').trim().slice(0, 6000)];
      linjerDi.push('', '---', '**Meldt inn fra Forvalter-plattformen**', '');
      linjerDi.push(`- **Av:** ${repNavnDi}${repDi.email ? ` (${String(repDi.email).slice(0, 120)})` : ''}${repDi.role ? ` · ${String(repDi.role).slice(0, 40)}` : ''}`);
      if (modulDi) linjerDi.push(`- **Modul:** ${modulDi}`);
      if (ctxDi.route) linjerDi.push(`- **Side:** ${String(ctxDi.route).slice(0, 300)}`);
      if (ctxDi.url) linjerDi.push(`- **URL:** ${String(ctxDi.url).slice(0, 500)}`);
      if (ctxDi.userAgent) linjerDi.push(`- **Nettleser:** ${String(ctxDi.userAgent).slice(0, 200)}`);
      if (ctxDi.viewport) linjerDi.push(`- **Skjerm:** ${String(ctxDi.viewport).slice(0, 40)}`);
      if (ctxDi.build) linjerDi.push(`- **Versjon:** ${String(ctxDi.build).slice(0, 80)}`);

      const naaDi = new Date().toISOString();
      const taskDi = {
        id: uuidv4(),
        title: tittelDi,
        description: linjerDi.join('\n').slice(0, 8000),
        status: 'inbox',
        priority: priDi,
        assigneeId: null,
        dueDate: null,
        labels: ['innmeldt'],
        subtasks: [], recurrence: null, followers: [],
        projectId: null, parentId: null, relations: [],
        space: 'utvikling',
        restrictedTo: null,
        taskType: taskTypeDi, productId: prodDi.id, componentId: kompIdDi,
        attachments: [], archived: false, comments: [],
        inbound: { source: 'forvalter-plattformen', eventId: eventId || null, reporter: { name: repNavnDi, email: repDi.email ? String(repDi.email).slice(0, 120) : null }, at: naaDi },
        activity: [{ at: naaDi, actor: repNavnDi, text: 'Meldte inn saken fra Forvalter-plattformen' }],
        createdAt: naaDi, updatedAt: naaDi, completedAt: null,
      };

      // Skjermbilder → task_files (samme lager som vanlige vedlegg).
      const bilderDi = (Array.isArray(body.screenshots) ? body.screenshots : []).slice(0, 3);
      let bildeNrDi = 0;
      for (const b of bilderDi) {
        const mDi = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String((b && b.dataUrl) || ''));
        if (!mDi) continue;
        if (mDi[2].length > 2 * 1024 * 1024) continue; // ~1,5 MB binært per bilde
        bildeNrDi += 1;
        const filDi = {
          id: uuidv4(), taskId: taskDi.id,
          name: String((b && b.name) || '').trim().slice(0, 200) || `skjermbilde-${bildeNrDi}.${mDi[1] === 'image/png' ? 'png' : (mDi[1] === 'image/webp' ? 'webp' : 'jpg')}`,
          type: mDi[1], size: Math.round(mDi[2].length * 3 / 4), data: mDi[2],
          uploadedBy: repNavnDi, at: naaDi,
        };
        await db.collection('task_files').insertOne({ ...filDi });
        taskDi.attachments.push({ id: filDi.id, name: filDi.name, type: filDi.type, size: filDi.size, at: filDi.at });
      }

      // Spesifiserte mottakere (admin-innstilling): de varsles in-app (+ ev.
      // e-post) og legges automatisk til som følgere — men ALDRI hvis de ikke
      // kan se utviklingssaker (admin/owner eller utviklingsgruppen).
      let intakeDi = null;
      try { intakeDi = await db.collection('settings').findOne({ key: 'dev_issue_intake' }, { projection: { _id: 0 } }); } catch (e) {}
      const mottakerIdsDi = (intakeDi && Array.isArray(intakeDi.recipientIds)) ? intakeDi.recipientIds : [];
      let mottakereDi = [];
      if (mottakerIdsDi.length) {
        try {
          const allePersDi = await hentPersoner(db);
          mottakereDi = allePersDi.filter((p) => mottakerIdsDi.includes(p.id) && sakSynligForMedlem(p, taskDi));
          if (intakeDi.addAsFollowers !== false) taskDi.followers = mottakereDi.map((p) => p.id);
        } catch (e) { mottakereDi = []; }
      }

      await db.collection('tasks').insertOne({ ...taskDi });

      // Varsling: spesifiserte mottakere (in-app + ev. e-post med direkte
      // saklenke) — ellers standard: in-app til admin + utviklingsgruppen.
      try {
        const varselTekstDi = `${repNavnDi} meldte inn en ${taskTypeDi === 'feil' ? 'feil' : 'sak'} fra Forvalter-plattformen`;
        if (mottakereDi.length) {
          for (const p of mottakereDi) {
            await varsle(db, p.id, null, { type: 'innmeldt', taskId: taskDi.id, taskTitle: taskDi.title, actor: repNavnDi, text: varselTekstDi });
            if (intakeDi.notifyEmail !== false) {
              await taskEpost({
                member: p, task: taskDi, heading: 'Ny innmeldt sak',
                intro: `${varselTekstDi}${modulDi ? ` (modul: ${modulDi})` : ''}. Du står som mottaker for innmeldte utviklingssaker.`,
                kategori: 'innmeldt',
              });
            }
          }
        } else {
          const varslesDi = await db.collection('admin_users').find(
            { $or: [{ role: { $in: ['owner', 'admin'] } }, { groups: 'utvikling' }] },
            { projection: { _id: 0, id: 1 } },
          ).toArray();
          for (const u of varslesDi) {
            await varsle(db, u.id, null, { type: 'innmeldt', taskId: taskDi.id, taskTitle: taskDi.title, actor: repNavnDi, text: varselTekstDi });
          }
        }
      } catch (e) { /* stille */ }

      return cors(NextResponse.json({
        ok: true,
        task_id: taskDi.id,
        type: taskTypeDi,
        priority: priDi,
        component: kompIdDi ? modulDi : null,
        attachments: taskDi.attachments.length,
        recipients: mottakereDi.length,
      }, { status: 201 }));
    }
    // Helse-/discovery-endepunkt for innmelding (åpent, ingen hemmeligheter).
    if ((route === '/bridge/dev-issue' || route === '/bridge/dev-issues') && method === 'GET') {
      return cors(NextResponse.json({
        ok: true,
        service: 'digihome-marketing dev-issue intake',
        method: 'POST /api/bridge/dev-issue',
        auth: 'x-bridge-secret | x-bridge-token | Authorization: Bearer | ?token= (AGENT_BRIDGE_SECRET)',
        idempotency: 'event_id',
        fields: {
          required: ['title'],
          optional: ['event_id', 'description (markdown)', 'type: feil|bug|forbedring|improvement|funksjon|feature|vedlikehold', 'severity: kritisk|normal|lav', 'reporter: {name,email,role}', 'context: {module,route,url,userAgent,viewport,build}', 'screenshots: [{dataUrl,name}] (maks 3 × ~1,5 MB, png/jpeg/webp)'],
        },
      }));
    }

    // --- E-post-forhåndsvisning av Markdown (verifisering uten å sende e-post) ---
    if (route === '/admin/tasks/email-preview' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uPrev = new URL(request.url);
      const md = uPrev.searchParams.get('md') || '';
      return cors(NextResponse.json({ ok: true, html: mdTilEpost(md, 1200), plain: mdTilRen(md, 180) }));
    }

    // --- Saksinnsikt: KPI-er, gjennomstrømning, arbeidsmengde, prosjekter ---
    // Rent lese-endepunkt. Regner på ALLE saker (inkl. arkiverte) for historikk
    // (gjennomstrømning/ledetid), men kun aktive for åpne/forfalt/arbeidsmengde.
    if (route === '/admin/tasks/insights' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const [alleSakerRaa, personer, prosjekter, viewerIns] = await Promise.all([
        db.collection('tasks').find({}).project({ _id: 0, id: 1, title: 1, status: 1, assigneeId: 1, dueDate: 1, createdAt: 1, completedAt: 1, priority: 1, projectId: 1, archived: 1, space: 1, restrictedTo: 1, taskType: 1, productId: 1 }).toArray(),
        hentPersoner(db),
        db.collection('projects').find({ archived: { $ne: true } }, { projection: { _id: 0, id: 1, name: 1, color: 1 } }).sort({ createdAt: 1 }).toArray(),
        sakViewer(db, request),
      ]);
      // Innsikten regner kun på saker vieweren faktisk kan se.
      const alleSaker = alleSakerRaa.filter((t) => sakSynlig(viewerIns, t));
      const iDag = osloIDag();
      const naaMs = Date.now();
      const osloDatoAv = (iso) => { try { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)); } catch (e) { return null; } };
      const innen = (iso, dager) => !!iso && (naaMs - new Date(iso).getTime()) <= dager * 86400000;

      const aktive = alleSaker.filter((t) => !t.archived);
      const aapne = aktive.filter((t) => t.status !== 'done');
      const forfalt = aapne.filter((t) => t.dueDate && t.dueDate < iDag);

      // Median ledetid (opprettet → fullført) for saker fullført siste 90 dager.
      const ledetider = alleSaker
        .filter((t) => t.completedAt && t.createdAt && innen(t.completedAt, 90))
        .map((t) => (new Date(t.completedAt) - new Date(t.createdAt)) / 86400000)
        .filter((d) => d >= 0)
        .sort((a, b) => a - b);
      const n = ledetider.length;
      const leadMedianDays = n ? Math.round((n % 2 ? ledetider[(n - 1) / 2] : (ledetider[n / 2 - 1] + ledetider[n / 2]) / 2) * 10) / 10 : null;

      // Gjennomstrømning: siste 8 ISO-uker (man–søn, Oslo-tid), eldst først.
      const iDagD = new Date(`${iDag}T00:00:00Z`);
      const mandag = new Date(iDagD);
      mandag.setUTCDate(mandag.getUTCDate() - ((mandag.getUTCDay() + 6) % 7));
      const throughput = [];
      for (let k = 7; k >= 0; k--) {
        const start = new Date(mandag); start.setUTCDate(start.getUTCDate() - k * 7);
        const slutt = new Date(start); slutt.setUTCDate(slutt.getUTCDate() + 6);
        const s = start.toISOString().slice(0, 10);
        const e = slutt.toISOString().slice(0, 10);
        throughput.push({
          label: `${String(start.getUTCDate()).padStart(2, '0')}.${String(start.getUTCMonth() + 1).padStart(2, '0')}`,
          created: alleSaker.filter((t) => { const d = t.createdAt && osloDatoAv(t.createdAt); return d && d >= s && d <= e; }).length,
          done: alleSaker.filter((t) => { const d = t.completedAt && osloDatoAv(t.completedAt); return d && d >= s && d <= e; }).length,
        });
      }

      // Arbeidsmengde per person (alle teammedlemmer + «Ikke tildelt» ved behov).
      const perPerson = [...personer.map((p) => ({ id: p.id, name: p.name, color: p.color || null })), { id: null, name: 'Ikke tildelt', color: null }]
        .map((p) => {
          const mine = aapne.filter((t) => (t.assigneeId || null) === p.id);
          return {
            ...p,
            open: mine.length,
            doing: mine.filter((t) => t.status === 'doing').length,
            waiting: mine.filter((t) => t.status === 'waiting').length,
            inbox: mine.filter((t) => t.status === 'inbox').length,
            overdue: mine.filter((t) => t.dueDate && t.dueDate < iDag).length,
            done30: alleSaker.filter((t) => (t.assigneeId || null) === p.id && innen(t.completedAt, 30)).length,
          };
        })
        .filter((p) => p.id !== null || p.open > 0 || p.done30 > 0)
        .sort((a, b) => b.open - a.open || b.done30 - a.done30);

      // Prosjektfordeling («Uten prosjekt» tas kun med hvis den har saker).
      const perProject = [...prosjekter.map((p) => ({ id: p.id, name: p.name, color: p.color || '#8b5cf6' })), { id: null, name: 'Uten prosjekt', color: '#b0aca6' }]
        .map((p) => {
          const i = aktive.filter((t) => (t.projectId || null) === p.id);
          const o = i.filter((t) => t.status !== 'done');
          return { ...p, total: i.length, open: o.length, overdue: o.filter((t) => t.dueDate && t.dueDate < iDag).length, done: i.length - o.length };
        })
        .filter((p) => p.id !== null || p.total > 0);

      // Eldste åpne saker (kandidater for opprydding/eskalering).
      const oldest = [...aapne]
        .filter((t) => t.createdAt)
        .sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
        .slice(0, 6)
        .map((t) => ({
          id: t.id, title: t.title, status: t.status,
          assigneeId: t.assigneeId || null, dueDate: t.dueDate || null,
          ageDays: Math.max(0, Math.round((naaMs - new Date(t.createdAt).getTime()) / 86400000)),
        }));

      // Utviklingsblokk: type- og produktfordeling for åpne utviklingssaker
      // (kun når vieweren ser Utvikling-området og det finnes saker der).
      let dev = null;
      const utvAapne = aapne.filter((t) => t.space === 'utvikling');
      if (utvAapne.length) {
        const typer = {};
        for (const kType of DEV_SAKSTYPER) typer[kType] = utvAapne.filter((t) => t.taskType === kType).length;
        typer.uten = utvAapne.filter((t) => !t.taskType).length;
        const devProds = await db.collection('dev_products').find({}, { projection: { _id: 0, id: 1, name: 1, color: 1 } }).sort({ createdAt: 1 }).toArray();
        const perProduct = [...devProds.map((p) => ({ id: p.id, name: p.name, color: p.color })), { id: null, name: 'Uten produkt', color: '#b0aca6' }]
          .map((p) => ({
            ...p,
            open: utvAapne.filter((t) => (t.productId || null) === p.id).length,
            feil: utvAapne.filter((t) => (t.productId || null) === p.id && t.taskType === 'feil').length,
          }))
          .filter((p) => p.open > 0);
        dev = { typer, perProduct };
      }

      return cors(NextResponse.json({
        ok: true,
        today: iDag,
        dev,
        kpi: {
          open: aapne.length,
          overdue: forfalt.length,
          overdueRatio: aapne.length ? Math.round((forfalt.length / aapne.length) * 100) : 0,
          done7: alleSaker.filter((t) => innen(t.completedAt, 7)).length,
          done30: alleSaker.filter((t) => innen(t.completedAt, 30)).length,
          created7: alleSaker.filter((t) => innen(t.createdAt, 7)).length,
          created30: alleSaker.filter((t) => innen(t.createdAt, 30)).length,
          leadMedianDays,
          leadCount: n,
        },
        status: {
          inbox: aapne.filter((t) => t.status === 'inbox').length,
          doing: aapne.filter((t) => t.status === 'doing').length,
          waiting: aapne.filter((t) => t.status === 'waiting').length,
        },
        priority: {
          p1: aapne.filter((t) => Number(t.priority) === 1).length,
          p2: aapne.filter((t) => Number(t.priority) === 2).length,
          p3: aapne.filter((t) => Number(t.priority) === 3).length,
        },
        throughput,
        perPerson,
        perProject,
        oldest,
      }));
    }

    if (route === '/admin/tasks' && method === 'GET') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const uTasks = new URL(request.url);
      const arkiv = uTasks.searchParams.get('arkiv') === '1';
      const [alleTasks, members, projects, viewer] = await Promise.all([
        db.collection('tasks').find(arkiv ? { archived: true } : { archived: { $ne: true } }).project({ _id: 0 }).sort({ updatedAt: -1 }).toArray(),
        hentPersoner(db),
        db.collection('projects').find({ archived: { $ne: true } }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray(),
        sakViewer(db, request),
      ]);
      // Serverhåndhevet synlighet: område (gruppe) + per-sak-begrensning.
      const tasks = alleTasks.filter((t) => sakSynlig(viewer, t));
      return cors(NextResponse.json({
        ok: true, tasks, members, projects, today: osloIDag(),
        spaces: omraaderForViewer(viewer),
        viewer: { id: viewer.id, admin: viewer.admin, groups: viewer.groups },
      }));
    }

    if (route === '/admin/tasks' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const title = String(body.title || '').trim();
      if (!title) return cors(NextResponse.json({ ok: false, error: 'Tittel er påkrevd' }, { status: 400 }));
      const naa = new Date().toISOString();
      const actor = String(body.actor || '').trim() || 'Admin';
      const actorId = (sessionFra(request) || {}).sub || null;
      // Område: valideres mot viewerens tilganger — man kan aldri opprette en
      // sak i et område man ikke selv ser (minste privilegium).
      const viewerNy = await sakViewer(db, request);
      const space = SAK_OMRAADER.includes(body.space) ? body.space : 'drift';
      if (!omraaderForViewer(viewerNy).includes(space)) {
        return cors(NextResponse.json({ ok: false, error: 'Du har ikke tilgang til dette området' }, { status: 403 }));
      }
      // Per-sak-begrensning: ansvarlig + oppretter inkluderes alltid, slik at
      // saken aldri blir usynlig for dem som jobber med den.
      let restrictedTo = null;
      if (Array.isArray(body.restrictedTo) && body.restrictedTo.length) {
        const s = new Set(body.restrictedTo.map((x) => String(x)).filter(Boolean).slice(0, 30));
        if (body.assigneeId) s.add(String(body.assigneeId));
        if (actorId) s.add(actorId);
        restrictedTo = [...s];
      }
      const task = {
        id: uuidv4(),
        title: title.slice(0, 300),
        description: String(body.description || '').slice(0, 8000),
        status: TASK_STATUSES.includes(body.status) ? body.status : 'inbox',
        priority: [1, 2, 3].includes(Number(body.priority)) ? Number(body.priority) : 2,
        assigneeId: body.assigneeId ? String(body.assigneeId) : null,
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || '')) ? body.dueDate : null,
        labels: Array.isArray(body.labels) ? body.labels.map((s) => String(s).trim()).filter(Boolean).slice(0, 8) : [],
        subtasks: normaliserSubtasks(body.subtasks),
        recurrence: TASK_REC.includes(body.recurrence) ? body.recurrence : null,
        followers: normaliserFolgere(body.followers),
        projectId: body.projectId ? String(body.projectId) : null,
        milestoneId: body.projectId && body.milestoneId ? String(body.milestoneId) : null,
        parentId: body.parentId ? String(body.parentId) : null,
        relations: normaliserRelasjoner(body.relations),
        space,
        restrictedTo,
        taskType: DEV_SAKSTYPER.includes(body.taskType) ? body.taskType : null,
        productId: body.productId ? String(body.productId) : null,
        componentId: body.componentId ? String(body.componentId) : null,
        attachments: [],
        archived: false,
        comments: [],
        activity: [{ at: naa, actor, text: 'Opprettet saken' }],
        createdAt: naa, updatedAt: naa, completedAt: null,
      };
      let emailed = false;
      if (task.assigneeId && body.notify !== false) {
        const member = await db.collection('admin_users').findOne({ id: task.assigneeId });
        emailed = await taskEpost({ member, task, heading: 'Ny sak tildelt deg', intro: `${actor} har tildelt deg en sak i det interne sakssystemet.`, kategori: 'tildelt' });
        if (emailed) task.activity.push({ at: naa, actor: 'System', text: `E-postvarsel sendt til ${member.name}` });
        await varsle(db, task.assigneeId, actorId, { type: 'tildelt', taskId: task.id, taskTitle: task.title, actor, text: `${actor} tildelte deg saken` });
      }
      if (task.followers.length && body.notify !== false) {
        const flg = await db.collection('admin_users').find({ id: { $in: task.followers } }).toArray();
        for (const f of flg) {
          if (f.id === task.assigneeId || !f.email) continue;
          const ok = await taskEpost({ member: f, task, heading: 'Du følger nå en sak', intro: `${actor} har lagt deg til som følger av saken.`, kategori: 'folger' });
          if (ok) task.activity.push({ at: naa, actor: 'System', text: `E-postvarsel sendt til følger ${f.name}` });
          await varsle(db, f.id, actorId, { type: 'folger', taskId: task.id, taskTitle: task.title, actor, text: `${actor} la deg til som følger` });
        }
      }
      // @mentions i beskrivelsen ved opprettelse: varsle nevnte personer
      // (hopp over ansvarlig/følgere som allerede er varslet, og aktøren selv).
      if (task.description && task.description.includes('@') && body.notify !== false) {
        const beskLav = task.description.toLowerCase();
        const allePers = await db.collection('admin_users').find({}, { projection: { _id: 0, id: 1, name: 1, email: 1, notifPrefs: 1, role: 1, groups: 1 } }).toArray();
        const nevnt = allePers.filter((m) => m.name && m.email
          && beskLav.includes(`@${String(m.name).toLowerCase()}`)
          && m.id !== task.assigneeId
          && !task.followers.includes(m.id)
          && String(m.name).toLowerCase() !== actor.toLowerCase());
        for (const m of nevnt) {
          const ok = await taskEpost({ member: m, task, heading: 'Du ble nevnt i en sak', intro: `${actor} nevnte deg i beskrivelsen av en ny sak.`, kategori: 'nevnt' });
          if (ok) task.activity.push({ at: naa, actor: 'System', text: `E-postvarsel sendt til ${m.name} (nevnt i beskrivelsen)` });
          await varsle(db, m.id, actorId, { type: 'nevnt', taskId: task.id, taskTitle: task.title, actor, text: `${actor} nevnte deg i beskrivelsen` });
        }
      }
      // Deloppgave-tildelinger ved opprettelse: hver person med deloppgaver
      // varsles med egen e-post (frist per deloppgave). Hopper over hoved-
      // ansvarlig (har alt fått tildelings-e-post) og aktøren selv.
      if (body.notify !== false && task.subtasks.some((s) => s.assigneeId)) {
        const perPerson = nyeDeloppgaveTildelinger(task.subtasks, []);
        if (task.assigneeId) perPerson.delete(task.assigneeId);
        if (perPerson.size) {
          const pers = await db.collection('admin_users').find({ id: { $in: [...perPerson.keys()] } }).toArray();
          for (const p of pers) {
            if (!p.email) continue;
            if (String(p.name || '').toLowerCase() === actor.toLowerCase()) continue;
            const ok = await deloppgaveEpost({ member: p, task, deloppgaver: perPerson.get(p.id), actor });
            if (ok) task.activity.push({ at: naa, actor: 'System', text: `E-postvarsel sendt til ${p.name} (deloppgave tildelt)` });
            await varsle(db, p.id, actorId, { type: 'deloppgave', taskId: task.id, taskTitle: task.title, actor, text: `${actor} ga deg ${perPerson.get(p.id).length > 1 ? `${perPerson.get(p.id).length} sjekklistepunkter` : 'et sjekklistepunkt'}` });
          }
        }
      }
      await db.collection('tasks').insertOne({ ...task });
      if (task.relations.length) await synkRelasjoner(db, task.id, [], task.relations);
      return cors(NextResponse.json({ ok: true, task, emailed }));
    }

    if (path[0] === 'admin' && path[1] === 'tasks' && path.length === 3 && method === 'PUT') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      // Synlighetsvakt: skjulte saker svarer 404 — eksistensen lekker aldri.
      const { task: eksisterende, viewer: viewerPut } = await hentSynligSak(db, request, path[2]);
      if (!eksisterende) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const naa = new Date().toISOString();
      const actor = String(body.actor || '').trim() || 'Admin';
      const actorId = (sessionFra(request) || {}).sub || null;
      const set = { updatedAt: naa };
      const logg = [];
      const varselKo = []; // in-app-varsler samles og sendes etter vellykket lagring
      if (body.title !== undefined) { const t = String(body.title).trim().slice(0, 300); if (t && t !== eksisterende.title) set.title = t; }
      if (body.description !== undefined) {
        set.description = String(body.description).slice(0, 8000);
        // @mentions i beskrivelsen: varsle personer som er NYE i teksten
        // (nevnt nå, men ikke i forrige versjon) — aldri aktøren selv.
        if (set.description && set.description.includes('@') && body.notify !== false) {
          const gammelLav = String(eksisterende.description || '').toLowerCase();
          const nyLav = set.description.toLowerCase();
          const allePers = await db.collection('admin_users').find({}, { projection: { _id: 0, id: 1, name: 1, email: 1, notifPrefs: 1, role: 1, groups: 1 } }).toArray();
          const nyNevnt = allePers.filter((m) => m.name
            && nyLav.includes(`@${String(m.name).toLowerCase()}`)
            && !gammelLav.includes(`@${String(m.name).toLowerCase()}`));
          for (const m of nyNevnt) {
            if (!m.email) continue;
            if (String(m.name).toLowerCase() === actor.toLowerCase()) continue;
            const ok = await taskEpost({ member: m, task: { ...eksisterende, ...set }, heading: 'Du ble nevnt i en sak', intro: `${actor} nevnte deg i beskrivelsen av saken.`, kategori: 'nevnt' });
            if (ok) logg.push(`E-postvarsel sendt til ${m.name} (nevnt i beskrivelsen)`);
            varselKo.push({ userId: m.id, type: 'nevnt', text: `${actor} nevnte deg i beskrivelsen` });
          }
        }
      }
      if (body.status !== undefined && TASK_STATUSES.includes(body.status) && body.status !== eksisterende.status) {
        set.status = body.status;
        set.completedAt = body.status === 'done' ? naa : null;
        logg.push(`Flyttet til ${TASK_STATUS_LABEL[body.status]}`);
        // Varsle ansvarlig + følgere om statusendringen (in-app).
        const berort = new Set([eksisterende.assigneeId, ...(eksisterende.followers || [])].filter(Boolean));
        for (const uid of berort) varselKo.push({ userId: uid, type: 'status', text: `${actor} flyttet saken til ${TASK_STATUS_LABEL[body.status]}` });
        // E-post til de samme (kategori 'status' — kan skrus av per bruker i
        // varselinnstillingene). Aldri til aktøren selv. notify:false skrur av.
        if (berort.size && body.notify !== false) {
          const persStatus = await db.collection('admin_users').find({ id: { $in: [...berort] } }, { projection: { _id: 0, id: 1, name: 1, email: 1, notifPrefs: 1, role: 1, groups: 1 } }).toArray();
          for (const m of persStatus) {
            if (!m.email) continue;
            if (actorId && m.id === actorId) continue;
            if (String(m.name || '').toLowerCase() === actor.toLowerCase()) continue;
            const ok = await taskEpost({
              member: m,
              task: { ...eksisterende, ...set },
              heading: 'Statusendring',
              intro: `${actor} flyttet saken fra ${TASK_STATUS_LABEL[eksisterende.status] || 'Ny'} til ${TASK_STATUS_LABEL[body.status]}.`,
              kategori: 'status',
            });
            if (ok) logg.push(`E-postvarsel sendt til ${m.name} (statusendring)`);
          }
        }
        // Innmeldte saker (fra Forvalter-plattformen): innmelderen får e-post
        // når saken FULLFØRES — bro-avtalt v1-tilbakemelding (12.08). Sendes
        // kun ved overgang til 'done', aldri ved gjenåpning/andre statuser.
        if (body.status === 'done' && eksisterende.inbound && eksisterende.inbound.reporter && eksisterende.inbound.reporter.email && body.notify !== false) {
          try {
            const repEp = eksisterende.inbound.reporter;
            const meldtDato = eksisterende.inbound.at ? new Date(eksisterende.inbound.at).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
            const okRep = await sendHtmlEmail({
              to: repEp.email,
              subject: `Saken din er løst: ${eksisterende.title}`,
              html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;">
                <p style="font-size:15px;">Hei ${repEp.name || ''},</p>
                <p style="font-size:15px;line-height:1.6;">Saken du meldte inn fra Forvalter-plattformen er nå <strong>løst</strong>:</p>
                <div style="background:#f8f7f5;border-radius:12px;padding:16px 20px;margin:16px 0;">
                  <p style="font-size:16px;font-weight:bold;margin:0;">${eksisterende.title}</p>
                  ${meldtDato ? `<p style="font-size:13px;color:#888;margin:6px 0 0;">Meldt inn ${meldtDato}</p>` : ''}
                </div>
                <p style="font-size:15px;line-height:1.6;">Takk for at du sa fra — det hjelper oss å gjøre plattformen bedre. Opplever du fortsatt problemet, er det bare å melde inn på nytt.</p>
                <p style="font-size:13px;color:#999;margin-top:24px;">Hilsen DigiHome-teamet</p>
              </div>`,
              text: `Hei ${repEp.name || ''}, saken du meldte inn («${eksisterende.title}») er nå løst. Takk for at du sa fra! Hilsen DigiHome-teamet`,
              categories: ['sak-innmeldt-lost'],
            });
            if (okRep && okRep.ok) logg.push(`Innmelder ${repEp.name || repEp.email} varslet på e-post om at saken er løst`);
          } catch (eRep) { /* e-postfeil skal aldri velte statusendringen */ }
        }
      }
      if (body.priority !== undefined && [1, 2, 3].includes(Number(body.priority)) && Number(body.priority) !== eksisterende.priority) {
        set.priority = Number(body.priority);
        logg.push(`Prioritet: ${TASK_PRI_LABEL[set.priority]}`);
      }
      if (body.dueDate !== undefined) {
        const d = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || '')) ? body.dueDate : null;
        if (d !== (eksisterende.dueDate || null)) { set.dueDate = d; logg.push(d ? `Frist satt til ${d}` : 'Frist fjernet'); }
      }
      if (body.labels !== undefined) set.labels = Array.isArray(body.labels) ? body.labels.map((s) => String(s).trim()).filter(Boolean).slice(0, 8) : [];
      if (body.projectId !== undefined) {
        set.projectId = body.projectId ? String(body.projectId) : null;
        logg.push(set.projectId ? 'Knyttet til prosjekt' : 'Fjernet fra prosjekt');
        // Milepælen hører til forrige prosjekt — løsnes ved prosjektbytte.
        if (set.projectId !== (eksisterende.projectId || null)) set.milestoneId = null;
      }
      if (body.milestoneId !== undefined) {
        const nyMs = body.milestoneId ? String(body.milestoneId) : null;
        if (nyMs) {
          const prosjektId = set.projectId !== undefined ? set.projectId : (eksisterende.projectId || null);
          const prosjektDok = prosjektId ? await db.collection('projects').findOne({ id: prosjektId }, { projection: { _id: 0, milestones: 1 } }) : null;
          const ms = prosjektDok ? (prosjektDok.milestones || []).find((m) => m.id === nyMs) : null;
          if (!ms) return cors(NextResponse.json({ ok: false, error: 'Milepælen finnes ikke på sakens prosjekt' }, { status: 400 }));
          set.milestoneId = nyMs;
          logg.push(`Milepæl: ${ms.name}`);
        } else if ((eksisterende.milestoneId || null) !== null && set.milestoneId === undefined) {
          set.milestoneId = null;
          logg.push('Milepæl fjernet');
        }
      }
      // Utviklingsfelter: sakstype + Produkt → Komponent. Valideres mot kjente
      // typer/produkter; komponent nullstilles ved produktbytte hvis ugyldig.
      if (body.taskType !== undefined) {
        const ny = DEV_SAKSTYPER.includes(body.taskType) ? body.taskType : null;
        if (ny !== (eksisterende.taskType || null)) {
          set.taskType = ny;
          logg.push(ny ? `Sakstype: ${ny}` : 'Sakstype fjernet');
        }
      }
      if (body.productId !== undefined) {
        const nyProd = body.productId ? String(body.productId) : null;
        if (nyProd !== (eksisterende.productId || null)) {
          if (nyProd) {
            const prodDok = await db.collection('dev_products').findOne({ id: nyProd }, { projection: { _id: 0, name: 1 } });
            if (!prodDok) return cors(NextResponse.json({ ok: false, error: 'Ukjent produkt' }, { status: 400 }));
            set.productId = nyProd;
            logg.push(`Produkt: ${prodDok.name}`);
          } else {
            set.productId = null;
            logg.push('Produkt fjernet');
          }
          // Produktbytte → komponenten hører til forrige produkt og nullstilles
          // (med mindre en ny komponent settes i samme kall, håndteres under).
          set.componentId = null;
        }
      }
      if (body.componentId !== undefined) {
        const nyKomp = body.componentId ? String(body.componentId) : null;
        if (nyKomp) {
          const prodId = set.productId !== undefined ? set.productId : (eksisterende.productId || null);
          const prodDok = prodId ? await db.collection('dev_products').findOne({ id: prodId }, { projection: { _id: 0, components: 1 } }) : null;
          const komp = prodDok ? (prodDok.components || []).find((c) => c.id === nyKomp) : null;
          if (!komp) return cors(NextResponse.json({ ok: false, error: 'Komponenten finnes ikke på valgt produkt' }, { status: 400 }));
          set.componentId = nyKomp;
          logg.push(`Komponent: ${komp.name}`);
        } else if ((eksisterende.componentId || null) !== null && set.componentId === undefined) {
          set.componentId = null;
          logg.push('Komponent fjernet');
        }
      }
      // Områdebytte: kun til områder vieweren selv har tilgang til.
      if (body.space !== undefined && SAK_OMRAADER.includes(body.space) && body.space !== (eksisterende.space || 'drift')) {
        if (!omraaderForViewer(viewerPut).includes(body.space)) {
          return cors(NextResponse.json({ ok: false, error: 'Du har ikke tilgang til dette området' }, { status: 403 }));
        }
        set.space = body.space;
        logg.push(`Flyttet til området ${SAK_OMRAADE_LABEL[body.space]}`);
      }
      // Per-sak-begrensning: null/tom = alle i området. Ansvarlig, følgere og
      // den som endrer inkluderes alltid (saken skal aldri bli usynlig for dem).
      if (body.restrictedTo !== undefined) {
        if (Array.isArray(body.restrictedTo) && body.restrictedTo.length) {
          set.restrictedTo = [...new Set(body.restrictedTo.map((x) => String(x)).filter(Boolean).slice(0, 30))];
          logg.push('Synlighet begrenset');
        } else {
          set.restrictedTo = null;
          logg.push('Synlighet: alle i området');
        }
      }
      if (body.parentId !== undefined) set.parentId = body.parentId ? String(body.parentId) : null;
      if (body.relations !== undefined) {
        const nyeRel = normaliserRelasjoner(body.relations);
        set.relations = nyeRel;
        await synkRelasjoner(db, path[2], eksisterende.relations || [], nyeRel);
        logg.push('Relasjoner oppdatert');
      }
      if (body.subtasks !== undefined) {
        set.subtasks = normaliserSubtasks(body.subtasks);
        // Varsle personer som har fått NY deloppgave-tildeling (diff mot forrige
        // versjon per deloppgave-id) — done-toggles/uendrede lagringer varsler aldri.
        if (body.notify !== false) {
          const perPerson = nyeDeloppgaveTildelinger(set.subtasks, eksisterende.subtasks || []);
          if (perPerson.size) {
            const pers = await db.collection('admin_users').find({ id: { $in: [...perPerson.keys()] } }).toArray();
            for (const p of pers) {
              if (!p.email) continue;
              if (String(p.name || '').toLowerCase() === actor.toLowerCase()) continue;
              const ok = await deloppgaveEpost({ member: p, task: { ...eksisterende, ...set }, deloppgaver: perPerson.get(p.id), actor });
              if (ok) logg.push(`E-postvarsel sendt til ${p.name} (deloppgave tildelt)`);
              varselKo.push({ userId: p.id, type: 'deloppgave', text: `${actor} ga deg ${perPerson.get(p.id).length > 1 ? `${perPerson.get(p.id).length} sjekklistepunkter` : 'et sjekklistepunkt'}` });
            }
          }
        }
      }
      if (body.followers !== undefined) {
        const nyeF = normaliserFolgere(body.followers);
        const gamleF = eksisterende.followers || [];
        if (JSON.stringify(nyeF) !== JSON.stringify(gamleF)) {
          set.followers = nyeF;
          const lagtTil = nyeF.filter((fid) => !gamleF.includes(fid));
          const fjernet = gamleF.filter((fid) => !nyeF.includes(fid));
          if (lagtTil.length) {
            const flg = await db.collection('admin_users').find({ id: { $in: lagtTil } }).toArray();
            if (flg.length) logg.push(`Følger lagt til: ${flg.map((f) => f.name).join(', ')}`);
            if (body.notify !== false) {
              for (const f of flg) {
                if (!f.email) continue;
                const ok = await taskEpost({ member: f, task: { ...eksisterende, ...set }, heading: 'Du følger nå en sak', intro: `${actor} har lagt deg til som følger av saken.`, kategori: 'folger' });
                if (ok) logg.push(`E-postvarsel sendt til følger ${f.name}`);
                varselKo.push({ userId: f.id, type: 'folger', text: `${actor} la deg til som følger` });
              }
            }
          }
          if (fjernet.length) logg.push(`${fjernet.length} følger${fjernet.length > 1 ? 'e' : ''} fjernet`);
        }
      }
      if (body.recurrence !== undefined) {
        const rec = TASK_REC.includes(body.recurrence) ? body.recurrence : null;
        if (rec !== (eksisterende.recurrence || null)) {
          set.recurrence = rec;
          logg.push(rec ? `Gjentakelse: ${TASK_REC_LABEL[rec]}` : 'Gjentakelse skrudd av');
        }
      }
      if (body.archived !== undefined) {
        const ark = !!body.archived;
        if (ark !== !!eksisterende.archived) {
          set.archived = ark;
          logg.push(ark ? 'Arkivert' : 'Gjenopprettet fra arkivet');
        }
      }
      let emailed = false;
      if (body.assigneeId !== undefined && (body.assigneeId || null) !== (eksisterende.assigneeId || null)) {
        set.assigneeId = body.assigneeId ? String(body.assigneeId) : null;
        if (set.assigneeId) {
          const member = await db.collection('admin_users').findOne({ id: set.assigneeId });
          logg.push(`Ansvarlig: ${member ? member.name : 'ukjent'}`);
          if (member && body.notify !== false) {
            emailed = await taskEpost({ member, task: { ...eksisterende, ...set }, heading: 'Sak tildelt deg', intro: `${actor} har satt deg som ansvarlig for saken.`, kategori: 'tildelt' });
            if (emailed) logg.push(`E-postvarsel sendt til ${member.name}`);
          }
          varselKo.push({ userId: set.assigneeId, type: 'tildelt', text: `${actor} satte deg som ansvarlig` });
        } else {
          logg.push('Ansvarlig fjernet');
        }
      }

      // Gjentakende sak fullføres → neste forekomst opprettes automatisk med
      // frist regnet fra forrige frist. Underoppgaver nullstilles.
      let nesteTask = null;
      const blirFerdig = set.status === 'done' && eksisterende.status !== 'done';
      const rec = set.recurrence !== undefined ? set.recurrence : (eksisterende.recurrence || null);
      if (blirFerdig && rec) {
        nesteTask = {
          id: uuidv4(),
          title: set.title || eksisterende.title,
          description: set.description !== undefined ? set.description : (eksisterende.description || ''),
          status: 'inbox',
          priority: set.priority || eksisterende.priority || 2,
          assigneeId: set.assigneeId !== undefined ? set.assigneeId : (eksisterende.assigneeId || null),
          dueDate: nesteFrist(set.dueDate !== undefined ? set.dueDate : eksisterende.dueDate, rec),
          labels: set.labels || eksisterende.labels || [],
          subtasks: (set.subtasks || eksisterende.subtasks || []).map((s) => ({ ...s, id: uuidv4(), done: false, due: null })),
          recurrence: rec,
          followers: set.followers !== undefined ? set.followers : (eksisterende.followers || []),
          projectId: set.projectId !== undefined ? set.projectId : (eksisterende.projectId || null),
          // Gjentakelser arver synligheten fra forrige forekomst.
          space: set.space !== undefined ? set.space : (SAK_OMRAADER.includes(eksisterende.space) ? eksisterende.space : 'drift'),
          restrictedTo: set.restrictedTo !== undefined ? set.restrictedTo : (eksisterende.restrictedTo || null),
          // …og utviklingsfeltene (sakstype/produkt/komponent).
          taskType: set.taskType !== undefined ? set.taskType : (eksisterende.taskType || null),
          productId: set.productId !== undefined ? set.productId : (eksisterende.productId || null),
          componentId: set.componentId !== undefined ? set.componentId : (eksisterende.componentId || null),
          attachments: [],
          archived: false,
          comments: [],
          activity: [{ at: naa, actor: 'System', text: `Opprettet automatisk (${TASK_REC_LABEL[rec].toLowerCase()} gjentakelse)` }],
          createdAt: naa, updatedAt: naa, completedAt: null,
        };
        await db.collection('tasks').insertOne({ ...nesteTask });
        logg.push(`Neste forekomst opprettet med frist ${nesteTask.dueDate}`);
      }

      // Begrenset sak: ansvarlig, følgere og aktøren har ALLTID tilgang — union
      // beregnes på sluttilstanden slik at ingen mister saken de jobber med.
      const endeligRestrict = set.restrictedTo !== undefined ? set.restrictedTo : (eksisterende.restrictedTo || null);
      if (Array.isArray(endeligRestrict) && endeligRestrict.length) {
        const union = new Set(endeligRestrict.map(String));
        const endeligAnsvarlig = set.assigneeId !== undefined ? set.assigneeId : eksisterende.assigneeId;
        if (endeligAnsvarlig) union.add(String(endeligAnsvarlig));
        const endeligFolgere = set.followers !== undefined ? set.followers : (eksisterende.followers || []);
        for (const f of endeligFolgere) if (f) union.add(String(f));
        if (viewerPut && viewerPut.id) union.add(viewerPut.id);
        set.restrictedTo = [...union];
      }

      const update = { $set: set };
      if (logg.length) update.$push = { activity: { $each: logg.map((text) => ({ at: naa, actor, text })) } };
      await db.collection('tasks').updateOne({ id: path[2] }, update);
      // Flush in-app-varsler (dedup per mottaker, hopp over aktøren selv).
      // Synlighet håndheves også her: kun de som kan SE saken etter endringen.
      const endeligTilstand = { ...eksisterende, ...set };
      const involverte = [...new Set(varselKo.map((v) => v.userId).filter(Boolean))];
      const involvertePers = involverte.length
        ? await db.collection('admin_users').find({ id: { $in: involverte } }, { projection: { _id: 0, id: 1, role: 1, groups: 1 } }).toArray()
        : [];
      const kanSeSaken = new Set(involvertePers.filter((p) => sakSynligForMedlem(p, endeligTilstand)).map((p) => p.id));
      const sett = new Set();
      for (const v of varselKo) {
        if (!v.userId || !kanSeSaken.has(v.userId) || sett.has(`${v.userId}:${v.type}`)) continue;
        sett.add(`${v.userId}:${v.type}`);
        await varsle(db, v.userId, actorId, { type: v.type, taskId: path[2], taskTitle: set.title || eksisterende.title, actor, text: v.text });
      }
      const task = await db.collection('tasks').findOne({ id: path[2] }, { projection: { _id: 0 } });
      return cors(NextResponse.json({ ok: true, task, emailed, nesteTask }));
    }

    if (path[0] === 'admin' && path[1] === 'tasks' && path.length === 3 && method === 'DELETE') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // Sletting krever passordbekreftelse fra innloggede kontoer — hindrer
      // at saker forsvinner ved uhell eller fra en gjenglemt åpen sesjon.
      // Masternøkkelen er unntatt (den er selv legitimasjonen, brukes av QA).
      const uSlett = new URL(request.url);
      const masterSlett = !!ADMIN_KEY && ((uSlett.searchParams.get('key') || request.headers.get('x-admin-key') || '') === ADMIN_KEY);
      if (!masterSlett) {
        if (!rateLimit(`task-delete:${clientIp(request)}`, 30)) {
          return cors(NextResponse.json({ ok: false, error: 'For mange forsøk — vent litt og prøv igjen' }, { status: 429 }));
        }
        let bodySlett = {}; try { bodySlett = await request.json(); } catch (e) {}
        const sesjonSlett = sessionFra(request);
        const megSlett = sesjonSlett && sesjonSlett.sub ? await db.collection('admin_users').findOne({ id: sesjonSlett.sub }) : null;
        if (!megSlett || !megSlett.passwordHash || !verifyPassword(String(bodySlett.password || ''), megSlett.passwordHash)) {
          return cors(NextResponse.json({ ok: false, error: 'Sletting krever passordbekreftelse' }, { status: 403 }));
        }
      }
      const synligSlett = await hentSynligSak(db, request, path[2]);
      if (!synligSlett.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const r = await db.collection('tasks').deleteOne({ id: path[2] });
      if (!r.deletedCount) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      await db.collection('task_files').deleteMany({ taskId: path[2] }).catch(() => {});
      await db.collection(VERSJON_COLL).deleteMany({ taskId: path[2] }).catch(() => {});
      // Gravsten for sanntids-diff (klienter fjerner saken ved neste /since-kall).
      await db.collection('task_tombstones').updateOne({ id: path[2] }, { $set: { id: path[2], deletedAt: new Date().toISOString() } }, { upsert: true }).catch(() => {});
      return cors(NextResponse.json({ ok: true }));
    }

    if (path[0] === 'admin' && path[1] === 'tasks' && path.length === 4 && path[3] === 'comments' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const text = String(body.text || '').trim();
      if (!text) return cors(NextResponse.json({ ok: false, error: 'Kommentar kan ikke være tom' }, { status: 400 }));
      const { task } = await hentSynligSak(db, request, path[2]);
      if (!task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const naa = new Date().toISOString();
      const author = String(body.author || 'Admin').slice(0, 80);
      const actorId = (sessionFra(request) || {}).sub || null;
      // @mentions: autocompleten setter inn «@Fullt Navn» — match mot personlisten.
      const allePersoner = await db.collection('admin_users').find({}, { projection: { _id: 0, id: 1, name: 1, email: 1, notifPrefs: 1, role: 1, groups: 1 } }).toArray();
      const lavtekst = text.toLowerCase();
      const nevnt = allePersoner.filter((m) => m.name && lavtekst.includes(`@${String(m.name).toLowerCase()}`));
      const comment = {
        id: uuidv4(), author, text: text.slice(0, 2000), at: naa,
        mentions: nevnt.map((m) => m.id),
      };
      const r = await db.collection('tasks').updateOne({ id: path[2] }, { $push: { comments: comment }, $set: { updatedAt: naa } });
      if (!r.matchedCount) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // E-postvarsel til nevnte med e-post (aldri forfatteren selv). notify:false skrur av.
      const varslet = [];
      const nevntIds = new Set(nevnt.map((m) => m.id));
      const komMottakere = new Set([task.assigneeId, ...(task.followers || [])].filter(Boolean));
      if (nevnt.length && body.notify !== false) {
        const utdrag = mdTilRen(text, 180);
        for (const m of nevnt) {
          if (!m.email) continue;
          if (String(m.name).toLowerCase() === author.toLowerCase()) continue;
          const ok = await taskEpost({ member: m, task, heading: 'Du ble nevnt i en sak', intro: `${author} nevnte deg i en kommentar: «${utdrag}»`, kategori: 'nevnt' });
          if (ok) varslet.push(m.name);
        }
      }
      // E-post til ansvarlig + følgere ved ny kommentar (kategori 'kommentar' —
      // kan skrus av per bruker i varselinnstillingene). Nevnte fikk allerede
      // «nevnt»-e-post; forfatteren varsles aldri om egne kommentarer.
      if (komMottakere.size && body.notify !== false) {
        const utdragKom = mdTilRen(text, 180);
        for (const m of allePersoner) {
          if (!komMottakere.has(m.id) || nevntIds.has(m.id) || !m.email) continue;
          if (actorId && m.id === actorId) continue;
          if (String(m.name || '').toLowerCase() === author.toLowerCase()) continue;
          const ok = await taskEpost({ member: m, task, heading: 'Ny kommentar', intro: `${author} kommenterte: «${utdragKom}»`, kategori: 'kommentar' });
          if (ok) varslet.push(m.name);
        }
      }
      if (varslet.length) {
        await db.collection('tasks').updateOne({ id: path[2] }, { $push: { activity: { at: naa, actor: 'System', text: `E-postvarsel sendt til ${varslet.join(', ')} (kommentar)` } } });
      }
      // In-app-varsler: nevnte får 'nevnt'; ansvarlig + følgere (som ikke alt er
      // nevnt, og ikke forfatteren) får 'kommentar'. Hopper alltid over aktøren.
      // Synlighet håndheves: kun mottakere som faktisk kan se saken.
      for (const m of nevnt) {
        if (!sakSynligForMedlem(m, task)) continue;
        await varsle(db, m.id, actorId, { type: 'nevnt', taskId: task.id, taskTitle: task.title, actor: author, text: `${author} nevnte deg i en kommentar` });
      }
      for (const uid of komMottakere) {
        if (nevntIds.has(uid)) continue; // fikk allerede 'nevnt'
        const pers = allePersoner.find((p) => p.id === uid);
        if (!pers || !sakSynligForMedlem(pers, task)) continue;
        await varsle(db, uid, actorId, { type: 'kommentar', taskId: task.id, taskTitle: task.title, actor: author, text: `${author} kommenterte saken` });
      }
      return cors(NextResponse.json({ ok: true, comment, mentioned: varslet }));
    }

    // --- Sjekklistepunkt → undersak (promotering) ---
    // Gjør et lett sjekklistepunkt om til en FULLVERDIG sak koblet til
    // forelderen (parentId): tekst → tittel, frist/ansvarlig/prosjekt følger
    // med, punktet fjernes fra sjekklisten. Stille (ingen e-post) — ansvarlig
    // får kun in-app-varsel.
    if (path[0] === 'admin' && path[1] === 'tasks' && path.length === 4 && path[3] === 'promote-subtask' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const { task: parent } = await hentSynligSak(db, request, path[2]);
      if (!parent) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const subs = Array.isArray(parent.subtasks) ? parent.subtasks : [];
      const tekst = String(body.text || '').trim();
      if (!tekst) return cors(NextResponse.json({ ok: false, error: 'Tekst er påkrevd' }, { status: 400 }));
      // Indeks valideres mot teksten (robust mot samtidige endringer); tekstsøk som fallback.
      let idx = Number.isInteger(body.index) ? body.index : -1;
      if (!(idx >= 0 && idx < subs.length && String(subs[idx].text || '').trim() === tekst)) {
        idx = subs.findIndex((s) => String(s.text || '').trim() === tekst);
      }
      if (idx < 0) return cors(NextResponse.json({ ok: false, error: 'Fant ikke sjekklistepunktet — last inn på nytt' }, { status: 409 }));
      const sub = subs[idx];
      const naa = new Date().toISOString();
      const actor = String(body.actor || '').trim() || 'Admin';
      const actorId = (sessionFra(request) || {}).sub || null;
      const nySak = {
        id: uuidv4(),
        title: tekst.slice(0, 300),
        description: '',
        status: sub.done ? 'done' : 'inbox',
        priority: [1, 2, 3].includes(Number(parent.priority)) ? Number(parent.priority) : 2,
        assigneeId: sub.assigneeId ? String(sub.assigneeId) : null,
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(sub.due || '')) ? sub.due : null,
        labels: [],
        subtasks: [],
        recurrence: null,
        followers: [],
        projectId: parent.projectId || null,
        parentId: parent.id,
        // Arver forelderens synlighet (område + ev. begrensning m/ ansvarlig inkludert).
        space: SAK_OMRAADER.includes(parent.space) ? parent.space : 'drift',
        restrictedTo: (Array.isArray(parent.restrictedTo) && parent.restrictedTo.length)
          ? [...new Set([...parent.restrictedTo.map(String), ...(sub.assigneeId ? [String(sub.assigneeId)] : []), ...(actorId ? [actorId] : [])])]
          : null,
        relations: [],
        attachments: [],
        archived: false,
        comments: [],
        activity: [{ at: naa, actor, text: `Opprettet fra sjekklistepunkt i «${String(parent.title || '').slice(0, 120)}»` }],
        createdAt: naa, updatedAt: naa, completedAt: sub.done ? naa : null,
      };
      await db.collection('tasks').insertOne({ ...nySak });
      await db.collection('tasks').updateOne(
        { id: parent.id },
        {
          $set: { subtasks: subs.filter((_, i) => i !== idx), updatedAt: naa },
          $push: { activity: { at: naa, actor, text: `Gjorde sjekklistepunktet «${tekst.slice(0, 80)}» om til undersak` } },
        },
      );
      if (nySak.assigneeId && nySak.assigneeId !== actorId) {
        await varsle(db, nySak.assigneeId, actorId, { type: 'tildelt', taskId: nySak.id, taskTitle: nySak.title, actor, text: `${actor} gjorde et sjekklistepunkt om til undersak med deg som ansvarlig` });
      }
      delete nySak._id;
      return cors(NextResponse.json({ ok: true, task: nySak }));
    }

    if (path[0] === 'admin' && path[1] === 'tasks' && path.length === 4 && path[3] === 'remind' && method === 'POST') {
      if (!sakerAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const { task } = await hentSynligSak(db, request, path[2]);
      if (!task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (!task.assigneeId) return cors(NextResponse.json({ ok: false, error: 'Saken har ingen ansvarlig' }, { status: 400 }));
      const member = await db.collection('admin_users').findOne({ id: task.assigneeId });
      if (!member || !member.email) return cors(NextResponse.json({ ok: false, error: 'Ansvarlig mangler e-postadresse' }, { status: 400 }));
      const actor = String(body.actor || '').trim() || 'En kollega';
      const sendt = await taskEpost({ member, task, heading: 'Påminnelse', intro: `${actor} minner om denne saken.` });
      if (!sendt) return cors(NextResponse.json({ ok: false, error: 'E-post kunne ikke sendes' }, { status: 502 }));
      // Følgere med e-post får samme påminnelse (uten å blokkere hvis noen feiler)
      let ekstraVarslet = 0;
      const folgereIds = (task.followers || []).filter((fid) => fid !== task.assigneeId);
      if (folgereIds.length) {
        const flg = await db.collection('admin_users').find({ id: { $in: folgereIds } }).toArray();
        for (const f of flg) {
          if (!f.email) continue;
          const okF = await taskEpost({ member: f, task, heading: 'Påminnelse', intro: `${actor} minner om denne saken (du følger den).` });
          if (okF) ekstraVarslet++;
        }
      }
      const naa = new Date().toISOString();
      await db.collection('tasks').updateOne({ id: path[2] }, { $push: { activity: { at: naa, actor, text: `Påminnelse sendt til ${member.name}${ekstraVarslet ? ` + ${ekstraVarslet} følger${ekstraVarslet > 1 ? 'e' : ''}` : ''}` } }, $set: { updatedAt: naa } });
      return cors(NextResponse.json({ ok: true }));
    }

    // --- Vedlegg på saker: CHUNKET opplasting (base64-biter à ~900 KB) for å
    //     omgå proxy-/ingress-grenser. Binærdata i task_files, metadata på
    //     saken (task.attachments). Maks 8 MB per fil. ---
    if (route === '/admin/task-files/chunk' && method === 'POST') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const uploadId = String(body.uploadId || '');
      const taskId = String(body.taskId || '');
      const index = Number(body.index);
      const total = Number(body.total);
      const data = String(body.data || '');
      if (!uploadId || !taskId || !Number.isInteger(index) || !Number.isInteger(total) || index < 0 || index >= total) {
        return cors(NextResponse.json({ ok: false, error: 'Ugyldig chunk' }, { status: 400 }));
      }
      if (total > 16 || data.length > 1200000) {
        return cors(NextResponse.json({ ok: false, error: 'Filen er for stor (maks 8 MB)' }, { status: 400 }));
      }
      const task = taskId === 'DOKUMENTER'
        // Sentinel: frittstående dokumenter i Dokumenter-hubben (admin eller Dokumenter-modul)
        ? ((await modulAuthed(request, db, 'dokumenter')) ? { id: 'DOKUMENTER', attachments: [] } : null)
        : await db.collection('tasks').findOne({ id: taskId }, { projection: { _id: 0, id: 1, attachments: 1, space: 1, restrictedTo: 1 } });
      if (!task) return cors(NextResponse.json({ ok: false, error: 'Saken finnes ikke' }, { status: 404 }));
      // Synlighetsvakt: kan ikke laste opp til saker man ikke ser. Modulbrukere
      // uten sakstilgang når KUN frittstående dokumenter (aldri saksfiler).
      if (taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Saken finnes ikke' }, { status: 404 }));
      if (taskId !== 'DOKUMENTER' && !sakSynlig(await sakViewer(db, request), task)) return cors(NextResponse.json({ ok: false, error: 'Saken finnes ikke' }, { status: 404 }));
      if (!body.versjonAv && (task.attachments || []).length >= 12) {
        return cors(NextResponse.json({ ok: false, error: 'Maks 12 vedlegg per sak' }, { status: 400 }));
      }
      await db.collection('task_file_chunks').updateOne(
        { uploadId, index },
        { $set: { uploadId, taskId, index, data, at: new Date().toISOString() } },
        { upsert: true },
      );
      const mottatt = await db.collection('task_file_chunks').countDocuments({ uploadId });
      if (mottatt < total) return cors(NextResponse.json({ ok: true, complete: false, mottatt }));

      // Alle biter mottatt → sett sammen, lagre og rydd opp
      const biter = await db.collection('task_file_chunks').find({ uploadId }).sort({ index: 1 }).toArray();
      const samlet = biter.map((b) => b.data).join('');
      await db.collection('task_file_chunks').deleteMany({ uploadId });
      const size = Math.round(samlet.length * 3 / 4);
      if (size > 8 * 1024 * 1024) return cors(NextResponse.json({ ok: false, error: 'Filen er for stor (maks 8 MB)' }, { status: 400 }));
      // Ny VERSJON av eksisterende dokument? (versjonAv = fil-id). Gjenbruker
      // chunk-mekanikken; gammel binær arkiveres i task_file_versjoner.
      if (body.versjonAv) {
        const eksFil = await db.collection('task_files').findOne({ id: String(body.versjonAv) }, { projection: { id: 1, taskId: 1, laast: 1 } });
        if (!eksFil || eksFil.taskId !== taskId) return cors(NextResponse.json({ ok: false, error: 'Dokumentet finnes ikke på denne saken' }, { status: 404 }));
        const rVer = await nyVersjon(db, eksFil.id, {
          name: String(body.name || 'fil').slice(0, 200),
          type: String(body.type || 'application/octet-stream').slice(0, 120),
          data: samlet,
        }, String(body.actor || '').slice(0, 80));
        if (!rVer.ok) return cors(NextResponse.json({ ok: false, error: rVer.error }, { status: rVer.status || 400 }));
        return cors(NextResponse.json({ ok: true, complete: true, versjon: rVer.versjon, filId: eksFil.id }));
      }
      const naaFil = new Date().toISOString();
      const fil = {
        id: uuidv4(), taskId,
        name: String(body.name || 'fil').slice(0, 200),
        type: String(body.type || 'application/octet-stream').slice(0, 120),
        size, data: samlet,
        uploadedBy: String(body.actor || '').slice(0, 80),
        at: naaFil,
      };
      await db.collection('task_files').insertOne({ ...fil });
      const meta = { id: fil.id, name: fil.name, type: fil.type, size: fil.size, at: fil.at };
      await db.collection('tasks').updateOne(
        { id: taskId },
        {
          $push: { attachments: meta, activity: { at: naaFil, actor: fil.uploadedBy || 'Admin', text: `La ved «${fil.name}»` } },
          $set: { updatedAt: naaFil },
        },
      );
      return cors(NextResponse.json({ ok: true, complete: true, attachment: meta }));
    }

    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 3 && method === 'GET') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const fil = await db.collection('task_files').findOne({ id: path[2] });
      if (!fil) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Modulbrukere uten sakstilgang når KUN frittstående dokumenter.
      if (fil.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Synlighetsvakt: filer arver sakens synlighet.
      const eierSakFil = await hentSynligSak(db, request, fil.taskId);
      if (!eierSakFil.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const buf = Buffer.from(fil.data || '', 'base64');
      // ?inline=1 → vis i nettleser (PDF-viser, bilder, video). KUN for trygge
      // typer — HTML/SVG kan inneholde script og skal aldri serveres inline
      // under vårt domene (XSS). Alt annet forblir nedlasting.
      const INLINE_TRYGG = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif|heic|heif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp3|wav|ogg|aac|mp4|x-m4a|flac)|text\/plain)$/i;
      const uFil = new URL(request.url);
      const inline = uFil.searchParams.get('inline') === '1' && INLINE_TRYGG.test(String(fil.type || ''));
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': fil.type || 'application/octet-stream',
          'Content-Length': String(buf.length),
          'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(fil.name || 'fil')}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=3600',
        },
      });
    }

    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 3 && method === 'DELETE') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const fil = await db.collection('task_files').findOne({ id: path[2] });
      if (!fil) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (fil.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const eierSakSlett = await hentSynligSak(db, request, fil.taskId);
      if (!eierSakSlett.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Signerte dokumenter er LÅST — kun admin kan slette, og da bevisst.
      if (fil.laast && !adminAuthed(request)) {
        return cors(NextResponse.json({ ok: false, error: 'Dokumentet er låst (signert) og kan kun slettes av admin' }, { status: 403 }));
      }
      await db.collection('task_files').deleteOne({ id: path[2] });
      await db.collection(VERSJON_COLL).deleteMany({ filId: path[2] }).catch(() => {});
      const naaSlett = new Date().toISOString();
      await db.collection('tasks').updateOne(
        { id: fil.taskId },
        { $pull: { attachments: { id: path[2] } }, $set: { updatedAt: naaSlett } },
      );
      return cors(NextResponse.json({ ok: true }));
    }

    // ═══════════════ DOKUMENTMOTOR — arkiv, versjoner, deling, signering ═══════
    // Samlet detaljvisning for dokumentpanelet (metadata, versjoner, delinger,
    // logg og signeringsjobber — aldri binærdata).
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 4 && path[3] === 'detaljer' && method === 'GET') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const filD = await db.collection('task_files').findOne({ id: path[2] }, { projection: { id: 1, taskId: 1 } });
      if (!filD) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (filD.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const sakD = await hentSynligSak(db, request, filD.taskId);
      if (!sakD.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      return cors(NextResponse.json({ ok: true, detaljer: await filDetaljer(db, path[2]) }));
    }
    // DOCX → PDF: lokal WASM-konvertering, lagres som NY VERSJON av samme
    // dokument (Word-originalen beholdes i versjonshistorikken). Admin — eller
    // Dokumenter-modul for frittstående dokumenter. Nektes på låste
    // dokumenter / aktive signeringsrunder.
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 4 && path[3] === 'konverter-pdf' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bK = {}; try { bK = await request.json(); } catch (e) {}
      const filK = await db.collection('task_files').findOne({ id: path[2] });
      if (!filK) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Saksfiler konverteres fortsatt kun av admin — modulen gjelder frittstående dokumenter.
      if (filK.taskId !== 'DOKUMENTER' && !adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sakK = await hentSynligSak(db, request, filK.taskId);
      if (!sakK.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (filK.laast) return cors(NextResponse.json({ ok: false, error: 'Dokumentet er signert og låst' }, { status: 400 }));
      if (filK.signering && filK.signering.status === 'I_GANG') return cors(NextResponse.json({ ok: false, error: 'En signeringsrunde pågår — kanseller den først' }, { status: 400 }));
      const erDocx = /wordprocessingml/i.test(String(filK.type || '')) || /\.docx$/i.test(String(filK.name || ''));
      if (!erDocx) return cors(NextResponse.json({ ok: false, error: 'Kun moderne Word-filer (.docx) kan konverteres automatisk' }, { status: 400 }));
      try {
        const pdfBuf = await konverterDocxTilPdf(Buffer.from(filK.data || '', 'base64'));
        if (!pdfBuf || pdfBuf.length < 100 || pdfBuf.subarray(0, 5).toString('latin1') !== '%PDF-') {
          return cors(NextResponse.json({ ok: false, error: 'Konverteringen ga ikke en gyldig PDF — bruk «Lagre som PDF» i Word i stedet' }, { status: 422 }));
        }
        const nyttNavn = String(filK.name || 'dokument').replace(/\.docx$/i, '') + '.pdf';
        const rKon = await nyVersjon(db, filK.id, {
          name: nyttNavn, type: 'application/pdf', data: pdfBuf.toString('base64'),
        }, String(bK.actor || '').slice(0, 80), { loggTekst: 'Konvertert fra Word til PDF (automatisk)' });
        if (!rKon.ok) return cors(NextResponse.json({ ok: false, error: rKon.error }, { status: rKon.status || 400 }));
        return cors(NextResponse.json({ ok: true, versjon: rKon.versjon, name: nyttNavn, size: pdfBuf.length }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Konverteringen feilet — bruk «Lagre som PDF» i Word i stedet' }, { status: 422 }));
      }
    }
    // Dokumentarkiv: marker/fjern + synlighet (styret/investorer/alle) + kategori
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 4 && path[3] === 'arkiv' && method === 'PUT') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const filA = await db.collection('task_files').findOne({ id: path[2] }, { projection: { id: 1, taskId: 1 } });
      if (!filA) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (filA.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const sakA = await hentSynligSak(db, request, filA.taskId);
      if (!sakA.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      let bA = {}; try { bA = await request.json(); } catch (e) {}
      const rA = await settArkiv(db, path[2], { aktiv: !!bA.aktiv, synlighet: bA.synlighet, kategori: bA.kategori }, String(bA.actor || '').slice(0, 80));
      if (!rA.ok) return cors(NextResponse.json({ ok: false, error: rA.error }, { status: rA.status || 400 }));
      return cors(NextResponse.json(rA));
    }
    // Last ned en tidligere versjon
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 5 && path[3] === 'versjon' && method === 'GET') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const vFil = await db.collection('task_files').findOne({ id: path[2] }, { projection: { id: 1, taskId: 1 } });
      if (!vFil) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (vFil.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const vSak = await hentSynligSak(db, request, vFil.taskId);
      if (!vSak.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const vDok = await hentVersjon(db, path[2], path[4]);
      if (!vDok) return cors(NextResponse.json({ ok: false, error: 'Versjonen finnes ikke' }, { status: 404 }));
      const vBuf = Buffer.from(vDok.data || '', 'base64');
      return new NextResponse(vBuf, {
        status: 200,
        headers: {
          'Content-Type': vDok.type || 'application/octet-stream',
          'Content-Length': String(vBuf.length),
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`v${vDok.versjon} ${vDok.name || 'fil'}`)}`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }
    // Gjenopprett en tidligere versjon som ny gjeldende versjon
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 4 && path[3] === 'gjenopprett' && method === 'POST') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const gFil = await db.collection('task_files').findOne({ id: path[2] }, { projection: { id: 1, taskId: 1 } });
      if (!gFil) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (gFil.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const gSak = await hentSynligSak(db, request, gFil.taskId);
      if (!gSak.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      let bG = {}; try { bG = await request.json(); } catch (e) {}
      const rG = await gjenopprettVersjon(db, path[2], bG.versjonId, String(bG.actor || '').slice(0, 80));
      if (!rG.ok) return cors(NextResponse.json({ ok: false, error: rG.error }, { status: rG.status || 400 }));
      return cors(NextResponse.json(rG));
    }
    // Delingslenker for eksterne: opprett + trekk tilbake
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 4 && path[3] === 'deling' && method === 'POST') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const dFil = await db.collection('task_files').findOne({ id: path[2] }, { projection: { id: 1, taskId: 1 } });
      if (!dFil) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (dFil.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const dSak = await hentSynligSak(db, request, dFil.taskId);
      if (!dSak.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      let bD = {}; try { bD = await request.json(); } catch (e) {}
      const rD = await opprettDeling(db, path[2], { dager: bD.dager }, String(bD.actor || '').slice(0, 80));
      if (!rD.ok) return cors(NextResponse.json({ ok: false, error: rD.error }, { status: rD.status || 400 }));
      return cors(NextResponse.json(rD));
    }
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 5 && path[3] === 'deling' && method === 'DELETE') {
      if (!sakerAuthed(request) && !(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const tFil = await db.collection('task_files').findOne({ id: path[2] }, { projection: { id: 1, taskId: 1 } });
      if (!tFil) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (tFil.taskId !== 'DOKUMENTER' && !sakerAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const tSak = await hentSynligSak(db, request, tFil.taskId);
      if (!tSak.task) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const rT = await trekkDeling(db, path[2], path[4], '');
      if (!rT.ok) return cors(NextResponse.json({ ok: false, error: rT.error }, { status: rT.status || 400 }));
      return cors(NextResponse.json(rT));
    }
    // Send dokument til BankID-signering via Posten signering (admin — eller
    // Dokumenter-modul for frittstående dokumenter)
    if (path[0] === 'admin' && path[1] === 'task-files' && path.length === 4 && path[3] === 'signering' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const filSigGate = await db.collection('task_files').findOne({ id: path[2] }, { projection: { taskId: 1 } });
      if (!filSigGate) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Saksdokumenter sendes fortsatt kun av admin — modulen gjelder frittstående dokumenter.
      if (filSigGate.taskId !== 'DOKUMENTER' && !adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`signering:${clientIp(request)}`, 10)) return cors(NextResponse.json({ error: 'For mange forespørsler — vent litt' }, { status: 429 }));
      let bS = {}; try { bS = await request.json(); } catch (e) {}
      try {
        const rS = await opprettSigneringsjobb(db, {
          filId: path[2], tittel: bS.tittel, melding: bS.melding,
          signatarer: bS.signatarer, dagerFrist: bS.dagerFrist, av: String(bS.actor || '').slice(0, 80),
          avId: (sessionFra(request) || {}).sub || null,
          autoArkiv: bS.autoArkiv && bS.autoArkiv.aktiv ? { aktiv: true, synlighet: String(bS.autoArkiv.synlighet || 'styret').slice(0, 30) } : null,
        });
        if (!rS.ok) return cors(NextResponse.json({ ok: false, error: rS.error }, { status: rS.status || 400 }));
        await filLogg(db, path[2], `Sendt til BankID-signering (${(bS.signatarer || []).length} signatar${(bS.signatarer || []).length === 1 ? '' : 'er'})`, String(bS.actor || '').slice(0, 80));
        await db.collection('task_files').updateOne({ id: path[2] }, { $set: { signering: { jobbId: rS.jobb.id, status: 'I_GANG', oppdatert: new Date().toISOString() } } });
        return cors(NextResponse.json({ ok: true, jobb: rS.jobb }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: String(e && e.message || 'Signering feilet') }, { status: 502 }));
      }
    }
    // Signering: oppsett (virksomhetssertifikat), kansellering, manuell poll
    if (route === '/admin/signering/oppsett' && method === 'GET') {
      // Status (konfigurert/utløpsdato — aldri hemmeligheter): også for Dokumenter-modul
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const cfgS = await signHentOppsett(db);
      return cors(NextResponse.json({ ok: true, oppsett: cfgS || { konfigurert: false } }));
    }
    if (route === '/admin/signering/oppsett' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let bO = {}; try { bO = await request.json(); } catch (e) {}
      const rO = await signLagreOppsett(db, { p12Base64: bO.p12Base64, passord: bO.passord });
      if (!rO.ok) return cors(NextResponse.json({ ok: false, error: rO.error }, { status: rO.status || 400 }));
      return cors(NextResponse.json(rO));
    }
    if (route === '/admin/signering/oppsett' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      return cors(NextResponse.json(await signSlettOppsett(db)));
    }
    if (path[0] === 'admin' && path[1] === 'signering' && path.length === 4 && path[3] === 'kanseller' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      // Signeringsrunder på SAKSdokumenter kanselleres fortsatt kun av admin.
      const jbGateK = await db.collection(SIGN_JOBB_COLL).findOne({ id: path[2] }, { projection: { taskId: 1 } });
      if (!jbGateK) return cors(NextResponse.json({ ok: false, error: 'Jobb ikke funnet' }, { status: 404 }));
      if (jbGateK.taskId !== 'DOKUMENTER' && !adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const rK = await kansellerSignering(db, path[2], '');
        if (!rK.ok) return cors(NextResponse.json({ ok: false, error: rK.error }, { status: rK.status || 400 }));
        const jK = await db.collection(SIGN_JOBB_COLL).findOne({ id: path[2] }, { projection: { filId: 1 } });
        if (jK) {
          await db.collection('task_files').updateOne({ id: jK.filId }, { $set: { 'signering.status': 'KANSELLERT', 'signering.oppdatert': new Date().toISOString() } });
          await filLogg(db, jK.filId, 'Signeringsrunden ble kansellert', '');
        }
        return cors(NextResponse.json(rK));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: String(e && e.message || 'Kansellering feilet') }, { status: 502 }));
      }
    }
    // Send påminnelse/ny e-post til signatarer som venter (purring / resend)
    if (path[0] === 'admin' && path[1] === 'signering' && path.length === 4 && path[3] === 'purring' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!rateLimit(`signpurr:${clientIp(request)}`, 10)) return cors(NextResponse.json({ error: 'Vent litt før neste purring' }, { status: 429 }));
      const jP = await db.collection(SIGN_JOBB_COLL).findOne({ id: path[2] });
      if (!jP) return cors(NextResponse.json({ ok: false, error: 'Jobb ikke funnet' }, { status: 404 }));
      // Purring på SAKSdokumenters runder er fortsatt kun for admin.
      if (jP.taskId !== 'DOKUMENTER' && !adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (jP.status !== 'I_GANG') return cors(NextResponse.json({ ok: false, error: 'Signeringsrunden er ikke aktiv' }, { status: 400 }));
      const { sendSignaturEpost, signatarerPaaTur } = await import('@/lib/signering');
      let sendtP = 0;
      for (const sP of signatarerPaaTur(jP)) {
        if (await sendSignaturEpost(jP, sP)) {
          sendtP += 1;
          await db.collection(SIGN_JOBB_COLL).updateOne(
            { id: jP.id, 'signatarer.sid': sP.sid },
            { $set: { 'signatarer.$.epostSendtAt': new Date().toISOString(), 'signatarer.$.purretAt': new Date().toISOString() } },
          );
        }
      }
      await filLogg(db, jP.filId, `Påminnelse sendt til ${sendtP} signatar${sendtP === 1 ? '' : 'er'}`, '');
      return cors(NextResponse.json({ ok: true, sendt: sendtP }));
    }
    // Oversikt: ALLE signeringsjobber (beriket med sak/fil-info) — for modulen
    if (route === '/admin/signering/jobber' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const alleJb = await db.collection(SIGN_JOBB_COLL)
        .find({}, { projection: { _id: 0 } })
        .sort({ opprettet: -1 })
        .limit(100)
        .toArray();
      const jbTaskIds = [...new Set(alleJb.map((j) => j.taskId).filter((t) => t && t !== 'DOKUMENTER'))];
      const jbTasks = await db.collection('tasks').find({ id: { $in: jbTaskIds } }, { projection: { _id: 0, id: 1, title: 1 } }).toArray();
      const jbTittel = Object.fromEntries(jbTasks.map((t) => [t.id, t.title]));
      const jbFilIds = [...new Set(alleJb.map((j) => j.filId))];
      const jbFiler = await db.collection('task_files').find({ id: { $in: jbFilIds } }, { projection: { _id: 0, id: 1, name: 1, type: 1, size: 1, versjon: 1, laast: 1 } }).toArray();
      const jbFil = Object.fromEntries(jbFiler.map((f) => [f.id, f]));
      return cors(NextResponse.json({
        ok: true,
        jobber: alleJb.map((j) => ({
          ...j,
          // aldri signer-URL-er/sid-hemmeligheter ut i lister
          signatarer: (j.signatarer || []).map(({ signerUrl, sid, ...rest }) => rest),
          sakTittel: j.taskId === 'DOKUMENTER' ? null : (jbTittel[j.taskId] || null),
          fil: jbFil[j.filId] || null,
        })),
      }));
    }
    // Adressebok: unike signatarer fra tidligere runder (for hurtigvalg)
    if (route === '/admin/signering/adressebok' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const abJobber = await db.collection(SIGN_JOBB_COLL)
        .find({}, { projection: { _id: 0, 'signatarer.navn': 1, 'signatarer.epost': 1, opprettet: 1 } })
        .sort({ opprettet: -1 })
        .limit(60)
        .toArray();
      const abSett = new Map(); // epost → {navn, epost} (nyeste navn vinner)
      for (const abJb of abJobber) {
        for (const abS of (abJb.signatarer || [])) {
          if (abS.epost && !abSett.has(abS.epost)) abSett.set(abS.epost, { navn: abS.navn || '', epost: abS.epost });
        }
      }
      return cors(NextResponse.json({ ok: true, kontakter: [...abSett.values()].slice(0, 30) }));
    }
    // Frittstående dokumenter (Dokumenter-hubben, uten sak)
    if (route === '/admin/dokumenter' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const friFiler = await db.collection('task_files')
        .find({ taskId: 'DOKUMENTER' }, { projection: { _id: 0, data: 0, logg: 0, delinger: 0 } })
        .sort({ at: -1 })
        .limit(100)
        .toArray();
      return cors(NextResponse.json({ ok: true, filer: friFiler }));
    }
    if (route === '/admin/signering/poll' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'dokumenter'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        // Manuell oppdatering: poll hvis Posten tillater det NÅ — ellers
        // planlegg en presis poll når vinduet åpner (aldri nullstill
        // ventetiden: Posten straffer for tidlig polling med lengre 429-vinduer).
        const rM = await pollSignering(db);
        if (rM.venter) {
          const rPlan = await pollSnarest(db);
          return cors(NextResponse.json({ ...rM, planlagt: !!rPlan.planlagt }));
        }
        return cors(NextResponse.json(rM));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: String(e && e.message || 'Polling feilet') }, { status: 502 }));
      }
    }
    // Dokumentarkiv: rollefiltrert liste (owner/admin alt · eier investorer+alle · ellers alle)
    if (route === '/admin/dokumentarkiv' && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let rolleArk = 'bruker';
      if (adminAuthed(request)) rolleArk = 'admin';
      else {
        const sesArk = sessionFra(request);
        const megArk = sesArk && sesArk.sub ? await db.collection('admin_users').findOne({ id: sesArk.sub }, { projection: { role: 1 } }) : null;
        rolleArk = (megArk && megArk.role) || 'bruker';
      }
      return cors(NextResponse.json({ ok: true, filer: await listArkiv(db, rolleArk), rolle: rolleArk }));
    }
    // Nedlasting fra dokumentarkivet: arkivering = bevisst publisering, så
    // tilgangen styres av arkiv-synligheten (ikke sakens synlighet).
    if (path[0] === 'admin' && path[1] === 'dokumentarkiv' && path.length === 3 && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const arkFil = await db.collection('task_files').findOne({ id: path[2], 'arkiv.aktiv': true });
      if (!arkFil) return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
      let rolleNed = 'bruker';
      if (adminAuthed(request)) rolleNed = 'admin';
      else {
        const sesNed = sessionFra(request);
        const megNed = sesNed && sesNed.sub ? await db.collection('admin_users').findOne({ id: sesNed.sub }, { projection: { role: 1 } }) : null;
        rolleNed = (megNed && megNed.role) || 'bruker';
      }
      const synNed = (arkFil.arkiv && arkFil.arkiv.synlighet) || 'styret';
      const lov = rolleNed === 'admin' || rolleNed === 'owner'
        || (rolleNed === 'eier' && ['investorer', 'alle'].includes(synNed))
        || synNed === 'alle';
      if (!lov) return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
      const arkBuf = Buffer.from(arkFil.data || '', 'base64');
      const ARK_INLINE = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif)|text\/plain)$/i;
      const arkInline = new URL(request.url).searchParams.get('inline') === '1' && ARK_INLINE.test(String(arkFil.type || ''));
      return new NextResponse(arkBuf, {
        status: 200,
        headers: {
          'Content-Type': arkFil.type || 'application/octet-stream',
          'Content-Length': String(arkBuf.length),
          'Content-Disposition': `${arkInline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(arkFil.name || 'dokument')}`,
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'private, max-age=600',
        },
      });
    }
    // Cron: signeringspolling (kalles av bakgrunnsplanleggeren)
    if (route === '/cron/signering' && method === 'POST') {
      const cronSecretSig = (process.env.CRON_SECRET || '').trim();
      const gittSig = request.headers.get('x-cron-secret') || '';
      if (!(cronSecretSig && gittSig === cronSecretSig) && !adminAuthed(request)) {
        return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      }
      try {
        const rCronSig = await pollSignering(db);
        // Automatisk purring når frist nærmer seg (én gang per runde)
        try {
          const { autoPurring } = await import('@/lib/signering');
          const rAp = await autoPurring(db);
          if (rAp.sendt) rCronSig.autoPurret = rAp.sendt;
        } catch (e) { /* stille */ }
        return cors(NextResponse.json(rCronSig));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: String(e && e.message || 'Polling feilet') }, { status: 500 }));
      }
    }
    // OFFENTLIG: visningsdata for signeringssiden (forhåndsvisning før BankID)
    if (path[0] === 'signer-info' && path.length === 3 && method === 'GET') {
      if (!rateLimit(`signerinfo:${clientIp(request)}`, 60)) return cors(NextResponse.json({ error: 'For mange forsøk' }, { status: 429 }));
      const rSi = await hentSignerVisning(db, path[1], path[2]);
      if (!rSi.ok) return cors(NextResponse.json({ ok: false, error: rSi.error }, { status: rSi.status || 404 }));
      return cors(NextResponse.json(rSi));
    }
    // OFFENTLIG: dokumentet som skal signeres (inline PDF for forhåndsvisning)
    if (path[0] === 'signer-dokument' && path.length === 3 && method === 'GET') {
      if (!rateLimit(`signerdok:${clientIp(request)}`, 30)) return cors(NextResponse.json({ error: 'For mange forsøk' }, { status: 429 }));
      const dokSi = await hentSignerDokument(db, path[1], path[2]);
      if (!dokSi) return cors(NextResponse.json({ error: 'Ikke funnet' }, { status: 404 }));
      const bufSi = Buffer.from(dokSi.data || '', 'base64');
      return new NextResponse(bufSi, {
        status: 200,
        headers: {
          'Content-Type': dokSi.type || 'application/pdf',
          'Content-Length': String(bufSi.length),
          'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(dokSi.name || 'dokument.pdf')}`,
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    // OFFENTLIG: signeringsknappen i DigiHome-e-posten → henter fersk
    // engangs-URL fra Posten og sender signataren rett inn i BankID-flyten.
    if (path[0] === 'signer' && path.length === 3 && method === 'GET') {
      if (!rateLimit(`signer:${clientIp(request)}`, 30)) return cors(NextResponse.json({ error: 'For mange forsøk — vent litt' }, { status: 429 }));
      const baseSg = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      try {
        const rSg = await hentSignerRedirect(db, path[1], path[2]);
        if (rSg.ok) return NextResponse.redirect(rSg.redirectUrl, 302);
        return NextResponse.redirect(`${baseSg}/signering/feil?grunn=${encodeURIComponent(rSg.error || 'Ukjent feil')}`, 302);
      } catch (e) {
        return NextResponse.redirect(`${baseSg}/signering/feil?grunn=${encodeURIComponent('Teknisk feil — prøv igjen om litt')}`, 302);
      }
    }
    // OFFENTLIG: puls fra exit-sidene — planlegger poll i det Postens vindu åpner
    if (route === '/signering-puls' && method === 'POST') {
      if (!rateLimit(`signpuls:${clientIp(request)}`, 10)) return cors(NextResponse.json({ ok: true }));
      // ALDRI nullstill nestePoll (Posten straffer for tidlig polling med
      // eskalerende 429-vinduer) — planlegg presist i stedet.
      const rPuls = await pollSnarest(db);
      return cors(NextResponse.json({ ok: true, planlagt: !!rPuls.planlagt }));
    }
    // OFFENTLIG: tidsbegrenset delingslenke — /api/delt/<token>
    if (path[0] === 'delt' && path.length === 2 && method === 'GET') {
      const deltFil = await hentDelt(db, path[1]);
      if (!deltFil) return cors(NextResponse.json({ error: 'Lenken er utløpt eller trukket tilbake' }, { status: 404 }));
      const deltBuf = Buffer.from(deltFil.data || '', 'base64');
      const DELT_INLINE = /^(application\/pdf|image\/(png|jpe?g|gif|webp|avif)|text\/plain)$/i;
      const deltInline = DELT_INLINE.test(String(deltFil.type || ''));
      return new NextResponse(deltBuf, {
        status: 200,
        headers: {
          'Content-Type': deltFil.type || 'application/octet-stream',
          'Content-Length': String(deltBuf.length),
          'Content-Disposition': `${deltInline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(deltFil.name || 'dokument')}`,
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    // ═══════════════ MØTER — styremøter/ledermøter med agenda, referat,
    // vedtak og aksjonspunkter som blir saker. Admin-only (bruker = kun saker).
    // Møteoversikt: admin ser alt; 'bruker' ser møter de deltar i ELLER
    // møtetyper de har fått tilgang til (moteTilgang per person, admin-styrt).
    // Håndheves her — ikke bare i menyen.
    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 2 && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let alleMoter = await db.collection('meetings').find({}, { projection: { _id: 0 } }).toArray();
      if (!adminAuthed(request)) {
        const sesjon = sessionFra(request);
        const meg = sesjon && sesjon.sub ? await db.collection('admin_users').findOne({ id: sesjon.sub }) : null;
        if (!meg) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
        const tilgang = Array.isArray(meg.moteTilgang) ? meg.moteTilgang : [];
        alleMoter = alleMoter.filter((m) => (m.attendees || []).includes(meg.id) || tilgang.includes(m.type));
      }
      // Planlagte først (nærmest frem i tid), deretter avholdte (nyeste øverst)
      const planlagt = alleMoter.filter((m) => m.status !== 'avholdt').sort((a, b) => String(a.datetime || '9999').localeCompare(String(b.datetime || '9999')));
      const avholdt = alleMoter.filter((m) => m.status === 'avholdt').sort((a, b) => String(b.datetime || '').localeCompare(String(a.datetime || '')));
      return cors(NextResponse.json({ ok: true, meetings: [...planlagt, ...avholdt], members: await hentPersoner(db) }));
    }

    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 2 && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const title = String(body.title || '').trim().slice(0, 200);
      if (!title) return cors(NextResponse.json({ ok: false, error: 'Tittel er påkrevd' }, { status: 400 }));
      const naa = new Date().toISOString();
      // Møter kan registreres i etterkant (fant allerede sted): klienten
      // sender status:'avholdt', og innkalling sendes naturligvis ikke.
      const erAvholdt = body.status === 'avholdt';
      const meeting = {
        id: uuidv4(),
        title,
        type: MOTE_TYPER.includes(body.type) ? body.type : 'annet',
        datetime: body.datetime ? String(body.datetime) : null,
        attendees: normaliserFolgere(body.attendees).slice(0, 20),
        agenda: normaliserAgenda(body.agenda),
        referat: '',
        vedtak: [],
        taskIds: [],
        recurrence: TASK_REC.includes(body.recurrence) ? body.recurrence : null,
        status: erAvholdt ? 'avholdt' : 'planlagt',
        createdAt: naa, updatedAt: naa,
      };
      await db.collection('meetings').insertOne({ ...meeting });
      // Innkalling på e-post til deltakere (notify:false skrur av; aldri for
      // møter som registreres som allerede avholdt)
      let innkalt = 0;
      if (meeting.attendees.length && body.notify !== false && !erAvholdt) {
        const folk = await db.collection('admin_users').find({ id: { $in: meeting.attendees } }).toArray();
        for (const p of folk) {
          const ok = await moteEpost({ member: p, meeting, heading: 'Møteinnkalling', intro: `Du er kalt inn til ${MOTE_TYPE_LABEL[meeting.type].toLowerCase()}. Agenda under.` });
          if (ok) innkalt++;
        }
      }
      return cors(NextResponse.json({ ok: true, meeting, innkalt }));
    }

    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 3 && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const eksisterende = await db.collection('meetings').findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!eksisterende) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      const naa = new Date().toISOString();
      const set = { updatedAt: naa };
      if (body.title !== undefined) {
        const t = String(body.title).trim().slice(0, 200);
        if (!t) return cors(NextResponse.json({ ok: false, error: 'Tittel kan ikke være tom' }, { status: 400 }));
        set.title = t;
      }
      if (body.type !== undefined && MOTE_TYPER.includes(body.type)) set.type = body.type;
      if (body.datetime !== undefined) set.datetime = body.datetime ? String(body.datetime) : null;
      if (body.attendees !== undefined) set.attendees = normaliserFolgere(body.attendees).slice(0, 20);
      if (body.agenda !== undefined) set.agenda = normaliserAgenda(body.agenda);
      if (body.referat !== undefined) set.referat = String(body.referat).slice(0, 20000);
      if (body.vedtak !== undefined) set.vedtak = normaliserVedtak(body.vedtak);
      if (body.recurrence !== undefined) set.recurrence = TASK_REC.includes(body.recurrence) ? body.recurrence : null;
      if (body.status !== undefined && ['planlagt', 'avholdt'].includes(body.status)) set.status = body.status;

      // Gjentakelse: når møtet markeres avholdt, opprettes neste forekomst
      let nesteMote = null;
      const rec = set.recurrence !== undefined ? set.recurrence : eksisterende.recurrence;
      if (set.status === 'avholdt' && eksisterende.status !== 'avholdt' && rec) {
        const dtStr = set.datetime !== undefined ? set.datetime : eksisterende.datetime;
        const datoDel = dtStr ? String(dtStr).slice(0, 10) : null;
        const tidDel = dtStr && String(dtStr).length > 10 ? String(dtStr).slice(10) : 'T10:00';
        const nyDato = nesteFrist(datoDel, rec);
        nesteMote = {
          id: uuidv4(),
          title: set.title !== undefined ? set.title : eksisterende.title,
          type: set.type !== undefined ? set.type : eksisterende.type,
          datetime: `${nyDato}${tidDel}`,
          attendees: set.attendees !== undefined ? set.attendees : (eksisterende.attendees || []),
          agenda: (set.agenda !== undefined ? set.agenda : (eksisterende.agenda || [])).map((p) => ({ ...p, id: uuidv4(), done: false })),
          referat: '', vedtak: [], taskIds: [],
          recurrence: rec, status: 'planlagt',
          createdAt: naa, updatedAt: naa,
        };
        await db.collection('meetings').insertOne({ ...nesteMote });
      }

      await db.collection('meetings').updateOne({ id: path[2] }, { $set: set });
      const meeting = { ...eksisterende, ...set };
      return cors(NextResponse.json({ ok: true, meeting, nesteMote }));
    }

    // Aksjonspunkt: oppretter en sak koblet til møtet (kilden til oppfølging)
    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 4 && path[3] === 'aksjonspunkt' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const meeting = await db.collection('meetings').findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!meeting) return cors(NextResponse.json({ ok: false, error: 'Møtet finnes ikke' }, { status: 404 }));
      const title = String(body.title || '').trim().slice(0, 200);
      if (!title) return cors(NextResponse.json({ ok: false, error: 'Tittel er påkrevd' }, { status: 400 }));
      const naa = new Date().toISOString();
      const actor = String(body.actor || 'Admin').slice(0, 80);
      const moteDato = meeting.datetime
        ? new Date(meeting.datetime).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Oslo' })
        : '';
      const task = {
        id: uuidv4(),
        title,
        description: `Aksjonspunkt fra ${MOTE_TYPE_LABEL[meeting.type]} «${meeting.title}»${moteDato ? ` (${moteDato})` : ''}.`,
        status: 'inbox',
        priority: [1, 2, 3].includes(body.priority) ? body.priority : 2,
        assigneeId: body.assigneeId ? String(body.assigneeId) : null,
        dueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate || '')) ? body.dueDate : null,
        labels: ['møte'],
        subtasks: [], followers: [], attachments: [], archived: false,
        recurrence: null,
        meetingId: meeting.id,
        comments: [],
        activity: [{ at: naa, actor, text: `Opprettet som aksjonspunkt fra møtet «${meeting.title}»` }],
        createdAt: naa, updatedAt: naa, completedAt: null,
      };
      let emailed = false;
      if (task.assigneeId && body.notify !== false) {
        const member = await db.collection('admin_users').findOne({ id: task.assigneeId });
        emailed = await taskEpost({ member, task, heading: 'Nytt aksjonspunkt fra møte', intro: `${actor} ga deg et aksjonspunkt fra møtet «${meeting.title}».` });
        if (emailed) task.activity.push({ at: naa, actor: 'System', text: `E-postvarsel sendt` });
      }
      await db.collection('tasks').insertOne({ ...task });
      await db.collection('meetings').updateOne({ id: meeting.id }, { $push: { taskIds: task.id }, $set: { updatedAt: naa } });
      return cors(NextResponse.json({ ok: true, task, emailed }));
    }

    // Send referat + vedtak til alle deltakere med e-post
    // Last ned møteprotokoll (MOM) som PDF — formell, arkiverbar protokoll
    // med agenda, referat, vedtak, aksjonspunkter og signaturfelt (styremøte).
    // Brukere med lesetilgang til møtet (deltaker/møtetype) kan også laste ned.
    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 4 && path[3] === 'protokoll' && method === 'GET') {
      if (!innloggetAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const meeting = await db.collection('meetings').findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!meeting) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (!adminAuthed(request)) {
        const sesjon = sessionFra(request);
        const meg = sesjon && sesjon.sub ? await db.collection('admin_users').findOne({ id: sesjon.sub }) : null;
        const tilgang = meg && (Array.isArray(meg.moteTilgang) ? meg.moteTilgang : []);
        const kanSe = meg && ((meeting.attendees || []).includes(meg.id) || tilgang.includes(meeting.type));
        if (!kanSe) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      }
      const { deltakere, aksjoner } = await hentProtokollData(db, meeting);
      const pdf = byggMoteProtokoll({ meeting, deltakere, aksjoner, typeLabel: MOTE_TYPE_LABEL[meeting.type] || 'Møte' });
      return new NextResponse(pdf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${protokollFilnavn(meeting)}"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Send referat (MOM) til deltakere + valgfrie eksterne mottakere.
    // E-posten inneholder referat, vedtak OG aksjonspunkter (m/ ansvarlig,
    // frist, status), og PDF-protokollen legges ved. Eksterne adresser
    // (f.eks. revisor) valideres, dedupliseres og lagres på møtet for gjenbruk.
    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 4 && path[3] === 'send-referat' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const meeting = await db.collection('meetings').findOne({ id: path[2] }, { projection: { _id: 0 } });
      if (!meeting) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (!String(meeting.referat || '').trim() && !(meeting.vedtak || []).length) {
        return cors(NextResponse.json({ ok: false, error: 'Skriv referat eller vedtak først' }, { status: 400 }));
      }
      let body = {}; try { body = await request.json(); } catch (e) {}
      const EPOST_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      const eksterne = Array.from(new Set(
        (Array.isArray(body.ekstraEpost) ? body.ekstraEpost : [])
          .map((e) => String(e || '').trim().toLowerCase())
          .filter((e) => EPOST_RE.test(e))
      )).slice(0, 10);
      const { deltakere, aksjoner } = await hentProtokollData(db, meeting);
      const interne = deltakere.filter((p) => p.email);
      const interneEposter = new Set(interne.map((p) => p.email.toLowerCase()));
      const eksterneMottakere = eksterne
        .filter((e) => !interneEposter.has(e))
        .map((e) => ({ name: e.split('@')[0], email: e }));
      const alleMottakere = [...interne, ...eksterneMottakere];
      if (!alleMottakere.length) return cors(NextResponse.json({ ok: false, error: 'Ingen mottakere — legg til deltakere med e-post eller eksterne adresser' }, { status: 400 }));
      // E-postinnhold: referat + vedtak + aksjonspunkter
      const vedtakHtml = (meeting.vedtak || []).length
        ? `<p style="margin:18px 0 6px;color:#8b5cf6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Vedtak</p><ol style="margin:0;padding-left:18px;color:#111;font-size:13.5px;line-height:1.7;font-weight:600">${meeting.vedtak.map((v) => `<li>${taskEsc(v.text)}</li>`).join('')}</ol>`
        : '';
      const referatHtml = String(meeting.referat || '').trim()
        ? `<p style="margin:18px 0 6px;color:#8b5cf6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Referat</p><p style="margin:0;color:#444;font-size:13.5px;line-height:1.6;white-space:pre-wrap">${taskEsc(String(meeting.referat).slice(0, 8000))}</p>`
        : '';
      const STATUS_L = { inbox: 'Ny', doing: 'Pågår', waiting: 'Venter', done: 'Ferdig' };
      const aksjonerHtml = aksjoner.length
        ? `<p style="margin:18px 0 6px;color:#8b5cf6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em">Aksjonspunkter</p><ol style="margin:0;padding-left:18px;color:#333;font-size:13.5px;line-height:1.55">${aksjoner.map((t) => {
            const detaljer = [
              `Ansvarlig: ${taskEsc(t.ansvarligNavn || 'Ikke satt')}`,
              `Frist: ${t.dueDate ? taskEsc(new Date(`${String(t.dueDate).slice(0, 10)}T12:00:00Z`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Oslo' })) : 'Ingen'}`,
              `Status: ${STATUS_L[t.status] || 'Ny'}`,
            ].join(' &middot; ');
            return `<li style="margin-bottom:7px"><span style="font-weight:600;${t.status === 'done' ? 'text-decoration:line-through;color:#999' : 'color:#111'}">${taskEsc(t.title)}</span><br/><span style="font-size:11.5px;color:#8a8a8a">${detaljer}</span></li>`;
          }).join('')}</ol>`
        : '';
      // PDF-protokoll som vedlegg
      let attachments;
      try {
        const pdf = byggMoteProtokoll({ meeting, deltakere, aksjoner, typeLabel: MOTE_TYPE_LABEL[meeting.type] || 'Møte' });
        attachments = [{ content: pdf.toString('base64'), filename: protokollFilnavn(meeting), type: 'application/pdf' }];
      } catch (e) { attachments = undefined; /* e-posten går ut uansett */ }
      let sendt = 0;
      for (const p of alleMottakere) {
        const ok = await moteEpost({ member: p, meeting, heading: 'Møtereferat', intro: `her er referatet fra ${(MOTE_TYPE_LABEL[meeting.type] || 'møtet').toLowerCase()}. Full protokoll ligger vedlagt som PDF.`, ekstraHtml: referatHtml + vedtakHtml + aksjonerHtml, skjulAgenda: true, attachments });
        if (ok) sendt++;
      }
      const naa = new Date().toISOString();
      await db.collection('meetings').updateOne({ id: meeting.id }, { $set: { updatedAt: naa, referatSendtAt: naa, eksterneEpost: eksterne } });
      return cors(NextResponse.json({ ok: true, sendt, eksterne: eksterneMottakere.length }));
    }

    if (path[0] === 'admin' && path[1] === 'meetings' && path.length === 3 && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const r = await db.collection('meetings').deleteOne({ id: path[2] });
      if (!r.deletedCount) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Koblede saker beholdes — de lever sitt eget liv på sakstavlen
      return cors(NextResponse.json({ ok: true }));
    }

    // ═══════════════ ÅRSHJUL — planlegg hele styreåret i én operasjon ═══════
    // Tar imot en liste møter (typisk fra årshjul-malen i UI-et: årsregnskap,
    // generalforsamling, strategi, halvårsstatus, budsjett …) og oppretter
    // alle som planlagte møter. Idempotent-vennlig: møter som allerede finnes
    // med samme tittel og dato hoppes over (kan trygt kjøres på nytt).
    // Innkalling sendes kun hvis notify:true (av som standard). Admin-only.
    if (path[0] === 'admin' && path[1] === 'meetings' && path[2] === 'aarshjul' && path.length === 3 && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const rader = Array.isArray(body.meetings) ? body.meetings.slice(0, 24) : [];
      if (!rader.length) return cors(NextResponse.json({ ok: false, error: 'Ingen møter å opprette' }, { status: 400 }));
      const naa = new Date().toISOString();
      const eksisterende = await db.collection('meetings')
        .find({}, { projection: { _id: 0, title: 1, datetime: 1 } }).toArray();
      const finnesAllerede = new Set(eksisterende.map((m) => `${String(m.title || '').trim().toLowerCase()}|${String(m.datetime || '').slice(0, 10)}`));
      const opprettede = [];
      let hoppetOver = 0;
      for (const rad of rader) {
        const title = String(rad.title || '').trim().slice(0, 200);
        const datetime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(rad.datetime || '')) ? String(rad.datetime) : null;
        if (!title || !datetime) { hoppetOver++; continue; }
        const nokkel = `${title.toLowerCase()}|${datetime.slice(0, 10)}`;
        if (finnesAllerede.has(nokkel)) { hoppetOver++; continue; }
        finnesAllerede.add(nokkel);
        const meeting = {
          id: uuidv4(),
          title,
          type: MOTE_TYPER.includes(rad.type) ? rad.type : 'annet',
          datetime,
          attendees: normaliserFolgere(rad.attendees).slice(0, 20),
          agenda: normaliserAgenda(rad.agenda),
          referat: '', vedtak: [], taskIds: [],
          recurrence: null, status: 'planlagt',
          aarshjul: true, // markerer at møtet stammer fra årshjulet
          createdAt: naa, updatedAt: naa,
        };
        await db.collection('meetings').insertOne({ ...meeting });
        opprettede.push(meeting);
      }
      // Innkalling (valgfritt): én e-post per deltaker per opprettet møte
      let innkalt = 0;
      if (body.notify === true && opprettede.length) {
        const alleIder = Array.from(new Set(opprettede.flatMap((m) => m.attendees)));
        if (alleIder.length) {
          const folk = await db.collection('admin_users').find({ id: { $in: alleIder } }).toArray();
          const perId = new Map(folk.map((p) => [p.id, p]));
          for (const m of opprettede) {
            for (const aid of m.attendees) {
              const p = perId.get(aid);
              if (!p) continue;
              const ok = await moteEpost({ member: p, meeting: m, heading: 'Møteinnkalling', intro: `Du er kalt inn til ${(MOTE_TYPE_LABEL[m.type] || 'møte').toLowerCase()} (planlagt i årshjulet). Agenda under.` });
              if (ok) innkalt++;
            }
          }
        }
      }
      return cors(NextResponse.json({ ok: true, opprettet: opprettede.length, hoppetOver, innkalt, meetings: opprettede }));
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
              html: `<p><b>Ny forespørsel om kontosletting</b></p><p>E-post: ${taskEsc(email)}</p><p>Melding: ${taskEsc(String(body.message || '').slice(0, 500)) || '(ingen)'}</p><p>Mottatt: ${new Date().toLocaleString('nb-NO', { timeZone: 'Europe/Oslo' })}</p><p>Frist: bekreftelse innen 72 t · sletting innen 30 dager.</p>`,
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
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const rows = await db.collection('partial_leads')
        .find({ status: 'partial' }, { projection: { _id: 0 } })
        .sort({ updatedAt: -1 }).limit(100).toArray();
      const converted = await db.collection('partial_leads').countDocuments({ status: 'converted' });
      return cors(NextResponse.json({ ok: true, partials: rows, convertedCount: converted }));
    }

    if (route === '/leads' && method === 'POST') {
      // Offentlig skjema — beskytt mot spam/mailbombing: per-IP-tak + per-mottaker-tak.
      if (!rateLimit(`leads:${clientIp(request)}`, 12, 60000)) {
        return cors(NextResponse.json({ success: false, error: 'For mange forsøk — prøv igjen om litt' }, { status: 429 }));
      }
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }

      const _epost = String(body.email || '').trim().toLowerCase();
      if (_epost && !rateLimit(`leads-to:${_epost}`, 3, 3600000)) {
        return cors(NextResponse.json({ success: false, error: 'For mange henvendelser fra denne e-postadressen' }, { status: 429 }));
      }

      const hasSomething = body.name || body.email || body.phone || body.address;
      if (!hasSomething) {
        return cors(NextResponse.json({ success: false, error: 'Mangler kontaktinformasjon' }, { status: 400 }));
      }

      const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
      const _attr = sanitizeAttribution(body.attribution);
      const _cls = classifyLeadSource(_attr, { manualHint: /manuell|manual|telefon|crm|admin/i.test((body.source || '')) });
      // Defensiv FINN-normalisering: en 8–10-sifret kode er aldri en gateadresse.
      // Eldre klienter kunne sende koden i address-feltet; bevar den som klikkbar
      // FINN-referanse og la adressen være tom dersom annonsen skjuler gaten.
      const rawAddress = (body.address || '').toString().trim();
      const bareFinnCode = (/^(\d{8,10})$/.exec(rawAddress) || [])[1] || '';
      const normalizedFinnUrl = (body.finn_url || (bareFinnCode ? `https://www.finn.no/${bareFinnCode}` : '')).toString().slice(0, 600);
      const normalizedAddress = bareFinnCode ? '' : rawAddress.slice(0, 300);
      const normalizedUnits = Array.isArray(body.units) ? body.units.slice(0, 25).map((u) => {
        const unit = u && typeof u === 'object' ? { ...u } : {};
        const unitAddress = String(unit.address || '').trim();
        const unitCode = (/^(\d{8,10})$/.exec(unitAddress) || [])[1] || '';
        if (unitCode) {
          unit.address = '';
          if (!unit.finn_url) unit.finn_url = `https://www.finn.no/${unitCode}`;
        }
        return unit;
      }) : [];

      const lead = {
        id: uuidv4(),
        name: (body.name || '').toString().slice(0, 200),
        email: (body.email || '').toString().slice(0, 200),
        phone: (body.phone || '').toString().slice(0, 60),
        address: normalizedAddress,
        postal_code: (body.postal_code || '').toString().slice(0, 20),
        city: (body.city || '').toString().slice(0, 60),
        property_type: (body.property_type || body.propertyType || '').toString().slice(0, 120),
        sqm: toNum(body.sqm),
        bedrooms: toNum(body.bedrooms),
        rental_model: (body.rental_model || '').toString().slice(0, 60),
        availability: (body.availability || '').toString().slice(0, 40),
        lead_type: (body.lead_type || 'huseier').toString().slice(0, 40),
        num_properties: toNum(body.num_properties) || 1,
        units: normalizedUnits,
        // Eiendomsregisteret (Infotorg EDR) — primær eiendom
        matrikkel_number: (body.matrikkel_number || '').toString().slice(0, 60),
        seksjonsnr: (body.seksjonsnr || '').toString().slice(0, 12),
        andelsnr: (body.andelsnr || '').toString().slice(0, 12),
        bygningstype: (body.bygningstype || '').toString().slice(0, 80),
        registry_owner_name: (body.registry_owner_name || '').toString().slice(0, 200),
        registry_owner_type: (body.registry_owner_type || '').toString().slice(0, 40),
        registry_orgnr: (body.registry_orgnr || '').toString().slice(0, 20),
        // HUSEIER SOM BEDRIFT (erklært i skjemaet). Holdes bevisst atskilt fra
        // registry_* som betyr «hentet fra matrikkelen/hjemmelshaver» — kilden
        // skal alltid være mulig å se. Org.nr valideres på nytt her; en klient
        // kan sende hva som helst, og et feil org.nr ender på leiekontrakten.
        owner_kind: /^(business|bedrift)/i.test((body.owner_kind || '').toString()) ? 'business' : 'private',
        org_no: isValidOrgNr(body.org_no) ? normalizeOrgNr(body.org_no) : '',
        company_name: (body.company_name || '').toString().slice(0, 200),
        company_form: (body.company_form || '').toString().slice(0, 120),
        company_address: (body.company_address || '').toString().slice(0, 240),
        notes: (body.notes || body.message || '').toString().slice(0, 4000),
        finn_url: normalizedFinnUrl,
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
      lead.last_activity_at = lead.createdAt; // oppdateres ved re-engasjement
      // Datakvalitet-backstopp: adresse uten husnummer/postnr flagges (synlig
      // for admin) — skal normalt ikke skje etter tvungen listevalg i skjemaene.
      if (lead.address && (!/\d/.test(lead.address) || !lead.postal_code)) lead.address_incomplete = true;
      // To-nivå-modellen: hvilket spor valgte kunden i skjemaet? + klikk-aksept
      // av selvforvaltningsavtalen (server-tidsstempel for integritet).
      lead.tier = ['selvforvaltning', 'full_forvaltning'].includes((body.tier || '').toString()) ? body.tier : null;
      // Ekspansjonssignal: Full forvaltning ønsket utenfor Bergensområdet.
      if (body.outside_area === true) lead.outside_area = true;
      lead.terms_accepted = body.terms && body.terms.version
        ? { version: String(body.terms.version).slice(0, 40), at: new Date().toISOString() }
        : null;
      // SELVBETJENT LØP (10/7-beslutning): selvforvaltning m/ klikk-akseptert
      // avtale = signert kunde — det finnes ingen salgsjobb. Lead-posten
      // beholdes for attribusjon (CAC/ROAS), men hopper rett til 'won' og
      // flagges self_service → rett i Kunde-kolonnen, utenfor velocity/SLA.
      // Faktisk verdi kommer senere via value_update (leie_aktiv) fra CRM-et.
      if (lead.tier === 'selvforvaltning' && lead.terms_accepted) {
        lead.status = 'won';
        lead.self_service = true;
        lead.wonAt = lead.createdAt;
        lead.statusHistory = [{ status: 'won', at: lead.createdAt, via: 'self_service', note: 'Avtale akseptert digitalt i skjemaet' }];
      }

      // BEDRIFT: bekreft org.nr mot Enhetsregisteret på serveren. Klienten har
      // alt gjort oppslaget, men vi stoler ikke på at navnet som kom inn hører
      // til nummeret som kom inn — det er selskapet som blir avtalepart, står på
      // leiekontrakten og mottar honorarfakturaen. Vi overskriver derfor navn og
      // form med registerets versjon. Feiler registeret, går leadet gjennom
      // likevel (ubekreftet): en huseier skal ikke miste registreringen sin
      // fordi et offentlig API er nede.
      if (lead.owner_kind === 'business' && lead.org_no) {
        try {
          const chk = await lookupOrgNo(lead.org_no);
          const c = chk.items && chk.items[0];
          if (c) {
            lead.company_name = c.name || lead.company_name;
            lead.company_form = c.formLabel || lead.company_form;
            lead.company_address = c.address
              ? [c.address.street, [c.address.postalCode, c.address.city].filter(Boolean).join(' ')].filter(Boolean).join(', ').slice(0, 240)
              : lead.company_address;
            lead.company_status = c.status;
            lead.company_verified = true;
            lead.company_verified_at = new Date().toISOString();
          } else {
            lead.company_verified = false;
            lead.company_verify_note = chk.message || 'Ikke funnet i Enhetsregisteret';
          }
        } catch (e) {
          lead.company_verified = false;
          lead.company_verify_note = 'Enhetsregisteret utilgjengelig';
        }
      } else if (lead.owner_kind === 'business') {
        // Bedrift valgt uten gyldig org.nr: registrer det, men ikke lat som om
        // det er bekreftet. Forvalter må følge opp identiteten manuelt.
        lead.company_verified = false;
        lead.company_verify_note = 'Mangler gyldig organisasjonsnummer';
      }

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

      // HYBRID RE-ENGASJEMENT: finnes en ÅPEN lead (new/contacted/qualified) på
      // samme e-post, stemples fornyet interesse på den eksisterende leaden i
      // stedet for å opprette duplikat (unngår dobbel oppfølging + skjeve
      // konverteringstall). NY lead opprettes likevel når: (a) forrige sak er
      // LUKKET (won/lost) — genuint ny salgsmulighet, eller (b) innsendingen
      // gjelder en ANNEN eiendom (vesentlig ulik adresse) — ny sak.
      try {
        if (lead.email) {
          const emailRx = { $regex: `^${lead.email.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
          const OPEN_STATUSES = ['new', 'contacted', 'qualified'];
          const found = await db.collection('leads')
            .find({ email: emailRx, lead_type: lead.lead_type, $or: [{ status: { $in: OPEN_STATUSES } }, { status: { $exists: false } }, { status: null }] })
            .sort({ createdAt: -1 }).limit(1).toArray();
          const ex = found[0];
          const normAddr = (a) => String(a || '').toLowerCase().replace(/[,.]/g, ' ').replace(/\s+/g, ' ').trim();
          const na = normAddr(lead.address);
          const ea = ex ? normAddr(ex.address) : '';
          const sameProperty = !na || !ea || na === ea || na.startsWith(ea) || ea.startsWith(na);
          if (ex && sameProperty) {
            const nowIso = new Date().toISOString();
            const entry = {
              at: nowIso,
              via: lead.source || 'nettside',
              campaignId: (body.nl_campaign || '').toString().slice(0, 64) || null,
              rid: (body.nl_rid || '').toString().slice(0, 32) || null,
              note: lead.notes ? lead.notes.slice(0, 500) : null,
            };
            if (entry.campaignId) {
              try {
                const camp = await db.collection(NEWSLETTER_COLL).findOne({ id: entry.campaignId }, { projection: { _id: 0, subject: 1, slug: 1 } });
                entry.campaign = camp?.slug || camp?.subject || entry.campaignId;
              } catch (e) { /* best-effort */ }
            }
            // Berik TOMME kontaktfelter fra innsendingen (overskriv aldri data).
            const enrich = {};
            for (const f of ['phone', 'address', 'postal_code', 'property_type', 'rental_model']) {
              if (!ex[f] && lead[f]) enrich[f] = lead[f];
            }
            await db.collection('leads').updateOne({ id: ex.id }, {
              $push: { re_engaged: entry },
              $set: { ...enrich, re_engaged_at: nowIso, last_activity_at: nowIso },
            });
            // Intern «varm lead»-varsling til teamet (martin@/sarah@ via
            // NL_INTEREST_NOTIFY eller LEAD_NOTIFY_RECIPIENTS). Best-effort.
            let notify = null;
            try { notify = await sendReEngagedNotification({ ...ex, ...enrich }, entry); } catch (e) { notify = { ok: false }; }
            try {
              await db.collection('leads').updateOne({ id: ex.id }, { $set: { reengage_notify: { ok: !!(notify && notify.ok), at: nowIso } } });
            } catch (e) { /* best-effort */ }
            const updated = { ...ex, ...enrich, re_engaged: [...(ex.re_engaged || []), entry], re_engaged_at: nowIso, last_activity_at: nowIso };
            return cors(NextResponse.json({
              success: true, ok: true, id: ex.id, reEngaged: true,
              data: { id: ex.id },
              forwarded: ex.forwarded === true, lead: clean(updated),
            }, { status: 200 }));
          }
        }
      } catch (e) { /* hybrid er best-effort — fall gjennom til normal insert */ }

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

      // Dual-write: videresend til DigiHome-plattformen (DigiHome AS).
      // SELVBETJENT (14/7): provisjoneres via plattformens bro-endepunkt i
      // stedet — de speiler selv kunden som passivt won-lead, så /api/leads-
      // forward ville gitt duplikat hos dem.
      const fwd = lead.self_service
        ? await provisionSelfService(lead, request)
        : await forwardToDigiHome('/api/leads', {
        external_ref: lead.id, source_system: 'digihome-marketing',
        marketing_visitor_id: lead.marketing_visitor_id || undefined,
        lead_source_type: lead.lead_source_type, is_paid: lead.is_paid,
        // Strukturert kilde + nyhetsbrev-attribusjon over broen: plattformen kan
        // da filtrere/rapportere «leads fra nyhetsbrev X» uten å parse notes.
        source: lead.source || undefined,
        newsletter_source: lead.newsletter_source || undefined,
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
        // Bedrift eller privatperson — plattformen trenger dette for å opprette
        // riktig kundetype og få org.nr på avtalen/fakturaen.
        owner_kind: lead.owner_kind || undefined,
        org_no: lead.org_no || undefined,
        company_name: lead.company_name || undefined,
        company_form: lead.company_form || undefined,
        company_verified: lead.owner_kind === 'business' ? !!lead.company_verified : undefined,
        attribution: lead.attribution || undefined,
        tier: lead.tier || undefined,
        terms_accepted: lead.terms_accepted || undefined,
        outside_area: lead.outside_area || undefined,
        city: lead.city || undefined,
        notes: fwdNotes,
      });
      await db.collection('leads').updateOne({ id: lead.id }, { $set: {
        ...forwardAuditFields(fwd),
        ...(fwd.account ? { platform_account: fwd.account } : {}),
        ...(lead.self_service ? { provisioning_status: fwd.account ? 'provisioned' : (fwd.pendingManual ? 'pending_manual' : 'failed') } : {}),
      } });
      lead.forwarded = fwd.ok; lead.platform_id = fwd.id || null;
      if (fwd.account) lead.platform_account = fwd.account;
      if (lead.self_service) lead.provisioning_status = fwd.account ? 'provisioned' : (fwd.pendingManual ? 'pending_manual' : 'failed');
      // Selvhelbredende: lyktes denne, er plattformen oppe → catch-up av feilede (throttlet).
      if (fwd.ok) maybeReforward(db);

      // Meta Conversions API (server-side Lead). event_id = lead.id → deduplikeres
      // mot nettleser-pixelens Lead-hendelse. Non-fatal: skal aldri velte lead-flyten.
      try {
        if (lead.lead_type === 'huseier' && metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
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

      return cors(NextResponse.json({ success: true, ok: true, data: { id: lead.id }, forwarded: fwd.ok, account: fwd.account || null, lead: clean(lead) }, { status: 201 }));
    }

    // --- Tenants (leietaker-skjema) ---
    if (route === '/tenants' && method === 'POST') {
      // Offentlig skjema — beskytt mot spam/mailbombing: per-IP-tak + per-mottaker-tak.
      if (!rateLimit(`tenants:${clientIp(request)}`, 12, 60000)) {
        return cors(NextResponse.json({ success: false, error: 'For mange forsøk — prøv igjen om litt' }, { status: 429 }));
      }
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }

      const _epost = String(body.email || '').trim().toLowerCase();
      if (_epost && !rateLimit(`tenants-to:${_epost}`, 3, 3600000)) {
        return cors(NextResponse.json({ success: false, error: 'For mange henvendelser fra denne e-postadressen' }, { status: 429 }));
      }

      const hasSomething = body.name || body.email || body.phone;
      if (!hasSomething) {
        return cors(NextResponse.json({ success: false, error: 'Mangler kontaktinformasjon' }, { status: 400 }));
      }

      const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

      // ── BOLIGINTERESSE: boligen slås opp FØRST ────────────────────────────
      // Rekkefølgen er ikke kosmetikk. Tidligere ble boligen slått opp ETTER at
      // leadet var videresendt til DigiHome-plattformen, og payloaden hadde
      // dermed ingen enhets-ID: henvendelsen kom fram som en løs
      // leietakerprofil, og forvalteren kunne ikke se hvilken bolig det gjaldt
      // eller svare på den. Nå bygges interessen før alt annet, slik at både
      // plattformen, varselet og kvitteringen har samme boligkontekst.
      //
      // Boligen valideres mot den PUBLISERTE lista: skjemaet kan aldri brukes
      // til å bekrefte at en skjult eller upublisert enhet finnes.
      const interestBase = (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
      let interestProp = null;
      let interest = null;
      try {
        const pid = String(body.property || '').slice(0, 80);
        if (pid) {
          const props = await listAdminProperties(db);
          const hit = props.find((p) => (p.id === pid || p.externalId === pid) && listingGate(p).publishable);
          if (hit) interestProp = hit;
        }
      } catch (e) { /* interessen er et tillegg — leadet skal lagres uansett */ }

      if (interestProp) {
        // Tilbyr boligen BÅDE hele enheten og rom i bofellesskap, MÅ
        // interessenten velge. Uten valget vet ikke forvalteren om hun svarer
        // på en hel leilighet til 18 000 eller ett rom til 7 000 — to helt
        // forskjellige samtaler. Valideringen ligger her, på serveren, fordi en
        // klientvalidering alene kan omgås.
        const choices = scopeOptionsFor(interestProp);
        const picked = normalizeInterestScope(body.interest_scope ?? body.scope, interestProp);
        if (choices.length > 1 && !picked.length) {
          return cors(NextResponse.json({
            success: false, ok: false, field: 'interest_scope',
            error: 'Velg om du er interessert i hele enheten eller rom i bofellesskap',
            options: choices.map((v) => ({ value: v, label: SCOPE_LABEL[v] })),
          }, { status: 400 }));
        }
        interest = interestRecord(interestProp, {
          scope: picked,
          message: body.notes,
          source: (body.source || 'ledige-boliger').toString().slice(0, 60),
          baseUrl: interestBase,
        });
      }

      const _tAttr = sanitizeAttribution(body.attribution);
      // Varsel til forvalter + kvittering til interessenten. Defineres én gang
      // og brukes fra begge grenene under (nytt lead OG sammenslått lead) —
      // en boliginteresse er like verdifull når personen alt ligger i basen.
      const fireInterestEmails = async (leadDoc) => {
        const out = { notify: null, receipt: null };
        if (!interestProp || !interest) return out;
        const stamp = () => new Date().toISOString();
        await Promise.allSettled([
          sendPropertyInterestNotification({ ...leadDoc, lead_type: 'leietaker' }, interestProp, { source: interest.source, interest })
            .then((r) => { out.notify = { ok: !!r.ok, kind: 'boliginteresse', at: stamp(), recipients: r.recipients ?? null, error: r.ok ? null : (r.error || r.skipped || null) }; })
            .catch((e) => { out.notify = { ok: false, kind: 'boliginteresse', at: stamp(), error: String(e.message || e).slice(0, 300) }; }),
          sendPropertyInterestReceipt({ ...leadDoc, lead_type: 'leietaker' }, interestProp, { interest })
            .then((r) => { out.receipt = { ok: !!r.ok, at: stamp(), skipped: r.skipped || null }; })
            .catch((e) => { out.receipt = { ok: false, at: stamp(), error: String(e.message || e).slice(0, 300) }; }),
        ]);
        return out;
      };
      // Utboks mot DigiHome-plattformen. Vi videresender leadet som før, men
      // selve boligmeldingen legges i tillegg i en kvitterbar kø
      // (platform_interest_outbox) som plattformen henter via
      // GET /api/property-interest/outbox. Grunnen: en ny interesse på et
      // EKSISTERENDE lead skal ikke føre til at vi sender personen inn på nytt
      // og lager duplikater i utleiemodulen — men meldingen må likevel fram,
      // knyttet til riktig enhet, med et spor vi kan se.
      // Køen skrives alltid, og webhooken forsøkes umiddelbart etterpå slik at
      // interessenten havner i forvalterens innboks i sanntid. Feiler pushen,
      // blir posten liggende «pending» og plattformens pull tar den.
      const enqueueInterest = (leadDoc, ev) => deliverInterest(db, leadDoc, ev);
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
            // SAMME PERSON, NY BOLIG. Tidligere returnerte dedupe-grenen her —
            // og interessen for bolig nummer to forsvant sporløst dersom hun
            // sendte inn to skjemaer innen samme halvtime. Nå kobles boligen på
            // det eksisterende leadet i stedet.
            let interestSaved = null;
            if (interest) {
              const prevList = Array.isArray(dup.property_interests) ? dup.property_interests : [];
              const existing = prevList.find((x) => String(x.propertyId) === String(interest.propertyId));
              const at = interest.at;
              if (existing) {
                // Kjent bolig: behold opprinnelig tidspunkt, men la nye
                // opplysninger (valgt utleieenhet, ny melding) fylle hullene.
                const mergedEv = {
                  ...existing,
                  ...interest,
                  at: existing.at || at,
                  status: existing.status || 'interested',
                  lastConfirmedAt: at,
                  scope: (interest.scope && interest.scope.length) ? interest.scope : existing.scope,
                  scopeLabel: interest.scopeLabel || existing.scopeLabel,
                  message: interest.message || existing.message || '',
                };
                await db.collection('tenant_leads').updateOne({ id: dup.id }, { $pull: { property_interests: { propertyId: interest.propertyId } } });
                await db.collection('tenant_leads').updateOne({ id: dup.id }, { $push: { property_interests: mergedEv }, $set: { last_property_interest_at: at, updatedAt: at } });
                merged = { ...merged, property_interests: [...prevList.filter((x) => String(x.propertyId) !== String(interest.propertyId)), mergedEv] };
                interestSaved = { ...mergedEv, isNew: false };
              } else {
                await db.collection('tenant_leads').updateOne({ id: dup.id }, { $push: { property_interests: interest }, $set: { last_property_interest_at: at, updatedAt: at } });
                merged = { ...merged, property_interests: [...prevList, interest] };
                interestSaved = { ...interest, isNew: true };
              }
              if (interestSaved.isNew) {
                await enqueueInterest(merged, interest);
                const mails = await fireInterestEmails(merged);
                const set = {};
                if (mails.notify) set.admin_notify = mails.notify;
                if (mails.receipt) set.interest_receipt = mails.receipt;
                if (Object.keys(set).length) await db.collection('tenant_leads').updateOne({ id: dup.id }, { $set: set });
              }
            }
            return cors(NextResponse.json({
              success: true, ok: true, id: dup.id, deduped: true, merged: Object.keys(enrich).length > 0,
              forwarded: dup.forwarded === true, interest: interestSaved || null, tenant: clean(merged),
            }, { status: 200 }));
          }
        }
      } catch (e) { /* best-effort */ }

      // Boliginteressen legges inn ved opprettelsen, ikke etterpå: da finnes
      // den aldri i basen som et lead «uten bolig», og admin kan ikke rekke å
      // lese en halvferdig post.
      if (interest) {
        tenant.property_interests = [interest];
        tenant.last_property_interest_at = interest.at;
      }
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
        address: interest ? interest.propertyAddress : tenant.preferred_area,
        budget: budgetStr,
        bedrooms: tenant.bedrooms,
        move_in_date: tenant.move_in_date,
        message: tenant.notes,
        lead_type: 'leietaker',
        source: 'nettside',
        // BOLIGEN henvendelsen gjelder. unit_id er plattformens egen enhets-ID
        // — den er nøkkelen som gjør at meldingen kan lagres PÅ boligen i
        // utleiemodulen, og at forvalteren kan svare på noe konkret. Feltene
        // sendes både flatt og som objekt, slik at mappingen på plattformsiden
        // kan bruke det som passer uten at vi må gjette på skjemaet deres.
        ...(interest ? {
          unit_id: interest.unitId,
          property_id: interest.propertyId,
          property_title: interest.propertyTitle,
          property_address: interest.propertyAddress,
          property_url: interest.propertyUrl,
          interest_scope: interest.scope.join(','),
          interest_scope_label: interest.scopeLabel,
          property_interest: {
            unit_id: interest.unitId,
            property_id: interest.propertyId,
            local_property_id: interest.localPropertyId,
            title: interest.propertyTitle,
            address: interest.propertyAddress,
            district: interest.propertyDistrict,
            slug: interest.propertySlug,
            url: interest.propertyUrl,
            rental_scope: interest.rentalScope,
            interest_scope: interest.scope,
            interest_scope_label: interest.scopeLabel,
            message: interest.message,
            source: interest.source,
            at: interest.at,
          },
          // Svarkanalen: forvalteren i plattformen kan POSTe et svar hit, og vi
          // sender det som e-post til interessenten (auth: delt bro-token).
          reply_endpoint: interestBase ? `${interestBase}/api/property-interest/reply` : undefined,
        } : {}),
      });
      await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: {
        ...forwardAuditFields(fwd),
        next_retry_at: fwd.ok ? null : backoffIso(1),
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

      // BOLIGINTERESSE: legg meldingen i den kvitterbare køen mot plattformen.
      // Videresendingen over tok med boligen i payloaden; køen gir i tillegg et
      // spor forvalteren kan hente og kvittere for, uavhengig av om
      // lead-endepunktet deres mapper feltene i dag.
      if (interest) {
        try { await enqueueInterest(tenant, interest); } catch (e) { /* køen er et tillegg */ }
      }

      // Admin-varsling for leietaker-lead (ingen auto-kvittering — de venter på boligtilbud).
      // Gjelder henvendelsen en konkret bolig, sendes boliginteresse-varselet
      // i stedet for det generiske — ett varsel, med boligen i emnefeltet — OG
      // en kvittering til interessenten. Uten kvitteringen vet hun ikke om
      // skjemaet gikk gjennom, og da ringer hun konkurrenten i stedet.
      try {
        if (interestProp) {
          const mails = await fireInterestEmails(tenant);
          const set = {};
          if (mails.notify) set.admin_notify = mails.notify;
          if (mails.receipt) set.interest_receipt = mails.receipt;
          if (Object.keys(set).length) {
            await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: set });
            Object.assign(tenant, set);
          }
        } else {
          const mail = await fireLeadEmails({ ...tenant, lead_type: 'leietaker' }, { kind: 'leietaker', receipt: false });
          if (mail.adminNotify) {
            await db.collection('tenant_leads').updateOne({ id: tenant.id }, { $set: { admin_notify: mail.adminNotify } });
            tenant.admin_notify = mail.adminNotify;
          }
        }
      } catch (e) { /* e-post er best-effort */ }

      return cors(NextResponse.json({ success: true, ok: true, data: { id: tenant.id }, forwarded: fwd.ok, interest: interest || null, tenant: clean(tenant) }, { status: 201 }));
    }

    // ── BOLIGINTERESSE ↔ DIGIHOME-PLATTFORMEN ─────────────────────────────
    // Interessen fanges hos oss (det er vårt førsteparts lead), men samtalen
    // hører hjemme der forvalteren jobber — på boligen i utleiemodulen. Tre
    // endepunkter, alle med samme auth som agent-broen: admin (?key=) ELLER
    // delt bro-token (x-bridge-token / ?token=AGENT_BRIDGE_SECRET).
    //
    //  GET  /api/property-interest/outbox      Hent boligmeldinger som skal
    //       lagres på enheten. Svaret er selvdokumenterende (contract), slik at
    //       plattform-agenten kan koble seg på uten en egen spesifikasjon.
    //  POST /api/property-interest/outbox/ack  Kvitter for mottak (idempotent).
    //  POST /api/property-interest/reply       Forvalterens svar: vi sender
    //       e-post til interessenten og logger svaret på leadet.
    //
    // Hvorfor en kø, og ikke bare et kall fra oss? Fordi en ny interesse fra en
    // person som ALT ligger i plattformen ikke skal føre til at vi sender
    // personen inn på nytt og lager duplikater i utleiemodulen.
    if (route === '/property-interest/outbox' && method === 'GET') {
      if (!bridgeAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const status = String(searchParams.get('status') || 'pending').toLowerCase();
      const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || 50) || 50));
      const q = (status === 'alle' || status === 'all') ? {} : { status };
      const items = await db.collection(INTEREST_OUTBOX).find(q, { projection: { _id: 0 } }).sort({ createdAt: 1 }).limit(limit).toArray();
      const pending = await db.collection(INTEREST_OUTBOX).countDocuments({ status: 'pending' });
      const wh = interestWebhookTarget();
      return cors(NextResponse.json({
        ok: true,
        count: items.length,
        pending,
        // SANNTID FØRST: vi pusher nå hvert item til
        // POST <deres base>/api/public/property-interest/incoming idet interessen
        // sendes inn, signert med HMAC-SHA256 over rå body
        // (x-digihome-signature: sha256=<hex>). Denne køen er sikkerhetsnettet —
        // den inneholder det pushen ikke fikk levert, og kan pulles som før.
        webhook: {
          enabled: wh.ok,
          host: wh.host || null,
          reason: wh.ok ? null : wh.reason,
          idempotencyKey: 'item.id',
          note: 'Items levert live står som status=delivered og dukker ikke opp i status=pending. Ack er fortsatt trygt og idempotent.',
        },
        contract: {
          purpose: 'Boliginteresse fra digihome.no som skal lagres på enheten i utleiemodulen',
          item: {
            id: 'uuid — bruk denne i ack',
            unitId: 'plattformens enhets-ID (samme som externalId i enhetseksporten)',
            propertyAddress: 'full gateadresse med husnummer',
            propertyUrl: 'offentlig boligside hos oss',
            rentalScope: 'hele | rom | begge — hva boligen tilbyr',
            scope: '["hele"] | ["rom"] — hva interessenten valgte (obligatorisk når rentalScope = begge)',
            scopeLabel: 'Hele enheten | Rom i bofellesskap',
            message: 'fritekst fra interessenten (kan være tom)',
            contact: '{ name, email, phone }',
            leadId: 'vår lead-ID · platformLeadId: deres, når videresendingen er kvittert',
          },
          ack: { method: 'POST', path: '/api/property-interest/outbox/ack', body: { ids: ['<id>'], platform_ref: 'valgfri referanse hos dere' } },
          reply: {
            method: 'POST',
            path: '/api/property-interest/reply',
            auth: 'BARE bro-token (x-bridge-token / ?token=). Vår egen admin får 409 — se «sender» under.',
            body: { lead_id: 'eller platform_id/email', unit_id: '<enhets-ID>', message: 'svaret til interessenten', from_name: 'forvalterens navn', from_email: 'forvalterens e-post (blir Reply-To)' },
            effect: 'Vi sender svaret som e-post til interessenten og logger det på leadet.',
            sender: 'Dere sender normalt svaret selv fra «Interessenter». Dette endepunktet er kun for det tilfellet at dere vil at VI skal sende e-posten. Bruk ett av alternativene, aldri begge — ellers får interessenten dobbel e-post.',
          },
        },
        items,
      }));
    }

    if (route === '/property-interest/outbox/ack' && method === 'POST') {
      if (!bridgeAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const ids = (Array.isArray(body.ids) ? body.ids : [body.id]).map((x) => String(x || '').trim()).filter(Boolean).slice(0, 200);
      if (!ids.length) return cors(NextResponse.json({ ok: false, error: 'Mangler ids' }, { status: 400 }));
      const at = new Date().toISOString();
      const ref = String(body.platform_ref || '').slice(0, 120) || null;
      // To tilfeller: (1) posten sto i kø og kvitteres nå av pullen, (2) den ble
      // alt levert live via webhook — da beholder vi «webhook» som kanal og
      // referansen derfra, men noterer kvitteringen. Ellers ville et ack fra
      // pullen slettet sporet av at sanntidskanalen faktisk virket.
      const queued = await db.collection(INTEREST_OUTBOX).updateMany(
        { id: { $in: ids }, status: { $ne: 'delivered' } },
        { $set: { status: 'delivered', deliveredAt: at, deliveredVia: 'pull', ackedAt: at, nextWebhookAt: null, ...(ref ? { platformRef: ref } : {}) } },
      );
      const already = await db.collection(INTEREST_OUTBOX).updateMany(
        { id: { $in: ids }, status: 'delivered' },
        { $set: { ackedAt: at, ...(ref ? { platformRef: ref } : {}) } },
      );
      const r = { modifiedCount: queued.modifiedCount + already.modifiedCount };
      return cors(NextResponse.json({ ok: true, acked: r.modifiedCount, fromQueue: queued.modifiedCount, alreadyLive: already.modifiedCount, requested: ids.length, at }));
    }

    if (route === '/property-interest/reply' && method === 'POST') {
      if (!bridgeAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      // ÉN AVSENDER PER SAMTALE. Plattformen eier dialogen med interessenten og
      // sender svaret selv fra forvalterens «Interessenter»-innboks, med
      // tokenlenke slik at hun kan svare uten innlogging. Sendte markedssiden
      // også, ville interessenten fått to e-poster og to tråder — og forvalteren
      // ville ikke sett sitt eget svar der samtalen faktisk bor.
      // Endepunktet står derfor åpent for plattformen (bro-token), men avviser
      // vår egen admin med en forklaring og en lenke til rett sted.
      if (!bridgeTokenAuthed(request)) {
        return cors(NextResponse.json({
          ok: false,
          error: 'Svar sendes fra DigiHome-appen, ikke herfra',
          why: 'Plattformen eier samtalen med interessenten og sender e-posten selv. To avsendere gir interessenten dobbel e-post og to tråder.',
          where: platformInboxUrl(),
        }, { status: 409 }));
      }
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const message = String(body.message || body.body || body.reply || '').replace(/\r\n/g, '\n').trim().slice(0, 6000);
      if (!message) return cors(NextResponse.json({ ok: false, field: 'message', error: 'Svaret er tomt' }, { status: 400 }));

      const leadId = String(body.lead_id || body.leadId || body.external_ref || '').trim().slice(0, 80);
      const platformId = String(body.platform_id || body.platform_lead_id || '').trim().slice(0, 80);
      const email = String(body.email || body.to || '').trim().toLowerCase().slice(0, 200);
      const unitId = String(body.unit_id || body.unitId || body.property_id || '').trim().slice(0, 80);

      const or = [];
      if (leadId) or.push({ id: leadId });
      if (platformId) or.push({ platform_id: platformId });
      if (email) or.push({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
      if (!or.length) return cors(NextResponse.json({ ok: false, error: 'Oppgi lead_id, platform_id eller email' }, { status: 400 }));

      const lead = await db.collection('tenant_leads').find({ $or: or, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(1).next();
      if (!lead) return cors(NextResponse.json({ ok: false, error: 'Fant ingen interessent som passer' }, { status: 404 }));
      if (!lead.email) return cors(NextResponse.json({ ok: false, error: 'Interessenten har ingen e-postadresse vi kan svare til' }, { status: 409 }));

      // Svaret skal handle om en KONKRET bolig. Oppgis unit_id, må interessen
      // finnes på leadet — ellers risikerer vi å sende svar om feil bolig.
      const list = Array.isArray(lead.property_interests) ? lead.property_interests : [];
      const hit = unitId
        ? list.find((x) => String(x.unitId || x.propertyId) === unitId || String(x.propertySlug) === unitId || String(x.localPropertyId) === unitId)
        : list[list.length - 1];
      if (unitId && !hit) {
        return cors(NextResponse.json({ ok: false, error: 'Interessenten har ingen registrert interesse for denne enheten', unit_id: unitId }, { status: 404 }));
      }

      const fromName = String(body.from_name || body.fromName || '').slice(0, 120);
      const fromEmail = String(body.from_email || body.fromEmail || '').slice(0, 200);
      let sent = { ok: false, skipped: 'ikke-forsokt' };
      try {
        sent = await sendInterestReplyEmail({ tenant: lead, interest: hit || {}, message, fromName, fromEmail });
      } catch (e) {
        sent = { ok: false, error: String(e.message || e).slice(0, 300) };
      }

      const at = new Date().toISOString();
      const rec = {
        id: uuidv4(),
        leadId: lead.id,
        platformLeadId: lead.platform_id || null,
        unitId: (hit && (hit.unitId || hit.propertyId)) || unitId || null,
        propertyTitle: (hit && hit.propertyTitle) || null,
        propertyAddress: (hit && hit.propertyAddress) || null,
        to: lead.email,
        from: { name: fromName || null, email: fromEmail || null },
        via: adminAuthed(request) ? 'admin' : 'plattform',
        message,
        sent: !!sent.ok,
        skipped: sent.skipped || null,
        error: sent.ok ? null : (sent.error || null),
        at,
      };
      try {
        await db.collection('property_interest_replies').insertOne({ ...rec });
        await db.collection('tenant_leads').updateOne({ id: lead.id }, {
          $push: { interest_replies: { id: rec.id, unitId: rec.unitId, message, sent: rec.sent, via: rec.via, from: rec.from, at } },
          $set: { last_interest_reply_at: at, updatedAt: at },
        });
      } catch (e) { /* loggen er sporing, svaret er allerede sendt */ }

      if (!sent.ok && !sent.skipped) {
        return cors(NextResponse.json({ ok: false, error: 'Svaret kunne ikke sendes', detail: rec.error, id: rec.id }, { status: 502 }));
      }
      return cors(NextResponse.json({
        ok: true, id: rec.id, sent: rec.sent, skipped: rec.skipped,
        to: lead.email, leadId: lead.id, unitId: rec.unitId, at,
      }));
    }

    // Legacy debug-endepunkter. Disse eksponerte tidligere navn, e-post og
    // telefon på ALLE leads uten autentisering (personvern/GDPR-brudd) og ble
    // dessuten plukket opp av CRM-synken som «export-endepunkt». Nå admin-gated.
    if (route === '/tenants' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const tenants = await db.collection('tenant_leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return cors(NextResponse.json(tenants.map(clean)));
    }

    if (route === '/leads' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const leads = await db.collection('leads').find({}).sort({ createdAt: -1 }).limit(500).toArray();
      return cors(NextResponse.json(leads.map(clean)));
    }

    // --- Admin: lead-oversikt + manuell re-forwarding (enkel nøkkel-gating) ---
    // Historiske leads (imported_leads) flettes inn i samme pipeline-visning med
    // pre_tracking:true — de vises/håndteres som vanlige leads i UI-et, men
    // holdes UTENFOR betalt ROAS/CAC (egen kolleksjon → aldri med i beregningene).
    if (route === '/admin/leads' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      maybeReforward(db); // selvhelbredende catch-up ved admin-last (throttlet)
      // Automatisk CRM-synk: henter nye plattform-leads (eiere, leietakere,
      // kontakter) uten at noen må trykke på en knapp. Throttlet til hvert
      // 10. minutt og aldri blokkerende lenger enn 25 s.
      const sp0 = new URL(request.url).searchParams;
      const forceSync = ['1', 'true'].includes(String(sp0.get('sync') || '').toLowerCase());
      let autoSync = null;
      try {
        autoSync = await maybeAutoSyncLeads(db, digiHomeTarget, { wait: true, force: forceSync, timeoutMs: forceSync ? 30000 : 9000 });
      } catch (e) { autoSync = null; }
      const leads = await db.collection('leads').find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(1000).toArray();
      const tenants = await db.collection('tenant_leads').find({ deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(1000).toArray();
      let importedMapped = [];
      try {
        const imported = await db.collection(IMPORTED_COLL).aggregate([
          { $match: { deleted: { $ne: true } } },
          { $addFields: {
            eff_channel: { $ifNull: ['$override.channel', '$channel'] },
            eff_status: { $ifNull: ['$override.status', '$status'] },
            eff_won_value: { $ifNull: ['$override.won_value', '$won_value'] },
          } },
          { $sort: { created_at: -1, imported_at: -1 } },
          { $limit: 1500 },
          { $project: { _id: 0 } },
        ]).toArray();
        importedMapped = imported.map((l) => ({
          id: l.id,
          name: l.name || '', email: l.email || '', phone: l.phone || '',
          address: l.address || '', postal_code: l.postal_code || '',
          preferred_area: l.preferred_area || l.address || '',
          budget_min: l.budget_min ?? null, budget_max: l.budget_max ?? null,
          bedrooms: l.bedrooms ?? null, move_in_date: l.move_in_date || '',
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
      const isContactLead = (x) => ['kontakt', 'contact', 'henvendelse', 'inquiry'].includes(String(x.lead_type || '').toLowerCase());
      const ownerLeads = leads.filter((x) => !isContactLead(x) && String(x.lead_type || 'huseier').toLowerCase() !== 'leietaker');
      const contacts = [...leads.filter(isContactLead).map(clean), ...importedMapped.filter((x) => x.lead_type === 'kontakt')].sort(byDate);
      const mergedLeads = [...ownerLeads.map(clean), ...importedMapped.filter((x) => x.lead_type === 'huseier')].sort(byDate);
      const mergedTenants = [...tenants.map(clean), ...importedMapped.filter((x) => x.lead_type === 'leietaker')].sort(byDate);
      // Estimat vs. fasit: koble faktisk årshonorar (fra inngåtte leiekontrakter)
      // på hvert huseier-lead, slik at `wonValue`-estimatet kan etterprøves.
      let leadsWithFee = mergedLeads;
      try {
        const feeIndex = await buildLeadFeeIndex(db, await getKpiSettings(db));
        leadsWithFee = mergedLeads.map((l) => attachFeeTruth(l, feeIndex));
      } catch (e) { leadsWithFee = mergedLeads; }
      let syncMeta = null;
      try {
        const m = await getLeadSyncMeta(db);
        syncMeta = m ? {
          lastSyncAt: m.lastSyncAt || null,
          lastAttemptAt: m.lastAttemptAt || null,
          lastError: m.lastError || null,
          lastTrigger: m.lastTrigger || null,
          counts: m.lastCounts || null,
          tenantAudit: m.tenantAudit || null,
        } : null;
      } catch (e) { syncMeta = null; }
      return cors(NextResponse.json({
        leads: leadsWithFee, tenants: mergedTenants, contacts,
        importedCount: importedMapped.length,
        syncMeta,
        autoSynced: autoSync ? { ok: !!autoSync.ok, inserted: autoSync.inserted || 0, fetchedTenants: autoSync.fetchedTenants || 0 } : null,
      }));
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
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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
        // Behold helst posten med verifisert CRM-ID; forwarded=true uten ID kan
        // være en gammel falsk kvittering (Odin/Mussie) og skal ikke vinne.
        const sorted = [...arr].sort((a, b) => {
          const fa = a.forwarded === true && a.platform_id ? 1 : 0;
          const fb = b.forwarded === true && b.platform_id ? 1 : 0;
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
        details.push({ key, kept: keep.id, keptForwarded: keep.forwarded === true && !!keep.platform_id, removed: others.map((o) => o.id), enriched: Object.keys(enrich) });
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
        lead_type: { $nin: ['kontakt', 'contact', 'henvendelse', 'inquiry', 'leietaker'] },
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
      // SSRF-vern: kun https + verten MÅ være (subdomene av) et av Metas CDN-domener.
      // Sjekker faktisk hostname med punktgrense, ikke bare delstreng (blokkerer
      // f.eks. evilfbcdn.net / fbcdn.net.attacker.com).
      let vertOk = false;
      try {
        const parsed = new URL(u);
        const host = parsed.hostname.toLowerCase();
        vertOk = parsed.protocol === 'https:'
          && /(^|\.)(fbcdn\.net|cdninstagram\.com|facebook\.com)$/.test(host);
      } catch (e) { vertOk = false; }
      if (!vertOk) {
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
          const liveAds = await fetchMetaAdsWithInsights({ datePreset: 'last_7d', lifetimeFallback: false }).catch(() => []);
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
      if (!(await modulAuthed(request, db, 'historikk'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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
      if (!(await modulAuthed(request, db, 'historikk'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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
      if (!(await modulAuthed(request, db, 'historikk'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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
      if (!(await modulAuthed(request, db, 'historikk'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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
      if (!(await modulAuthed(request, db, 'historikk'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const spSync = new URL(request.url).searchParams;
      const dryRun = ['1', 'true'].includes(String(spSync.get('dryRun') ?? body.dryRun ?? '').toLowerCase());
      // Miljø-override er KUN tillatt sammen med dryRun (diagnose fra preview
      // mot prod-CRM uten å skrive noe i preview-databasen).
      const envOverride = dryRun ? String(spSync.get('env') || body.env || '').toLowerCase() : '';
      let target = digiHomeTarget();
      if (envOverride === 'prod') {
        target = { url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_PROD || 'https://app.digihome.no'), key: process.env.DIGIHOME_API_KEY_PROD || process.env.DIGIHOME_API_KEY || '', env: 'prod' };
      } else if (envOverride === 'test') {
        target = { url: normalizeCrmUrl(process.env.DIGIHOME_API_URL_TEST || process.env.DIGIHOME_API_URL || ''), key: process.env.DIGIHOME_API_KEY_TEST || process.env.DIGIHOME_API_KEY || '', env: 'test' };
      }
      const result = await syncFromPlatform(db, {
        target: target.url,
        secret: process.env.LEAD_SYNC_SECRET || target.key || '',
        since: (body.since || '').toString().slice(0, 30) || undefined,
        until: (body.until || '').toString().slice(0, 30) || undefined,
        channelHint: (body.channelHint || '').toString().slice(0, 80) || undefined,
        trigger: dryRun ? 'dry-run' : 'manual',
        dryRun,
      });
      const summary = await summarizeImported(db);
      // Toveis-synk: prøv å levere ventende status/verdi-endringer til CRM-et
      // (fungerer som retry-loop til plattformens skrive-endepunkt er live).
      let pushback = null;
      if (dryRun) pushback = { skipped: 'dryRun' };
      else { try { pushback = await flushLeadPushbacks(db, { target: target.url, key: target.key }); } catch (e) { pushback = { ok: false, error: e.message }; } }
      return cors(NextResponse.json({ ...result, dryRun, platformEnv: target.env, platformUrl: target.url, summary, pushback }, { status: result.ok ? 201 : 200 }));
    }

    if (route === '/admin/imported-leads' && method === 'DELETE') {
      if (!(await modulAuthed(request, db, 'historikk'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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

    // ===================================================================
    // FINN-STUDIO — bannergenerator + manuell kampanjemåling for FINN.no
    // FINN har ikke annonse-API: bannere bookes via FINN-selger og leveres
    // på e-post (adops@finn.no). Vi genererer materiell i alle FINN-formater
    // server-side (SVG → sharp → PNG/JPEG) og måler effekt via UTM + manuelt
    // registrerte kampanjetall (finn_campaigns-collection).
    // ===================================================================

    // AI-tekstforslag tilpasset banner-format (svært korte tekster).
    // body: { brief, landing? } → { ok, variants:[{angle, headline, subtext, cta} x4] }
    if (route === '/admin/finnstudio/copy' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const brief = String(body.brief || '').slice(0, 600).trim();
      if (!brief) return cors(NextResponse.json({ ok: false, error: 'Skriv en kort brief først' }, { status: 400 }));
      try {
        const raw = await chatLLM({
          feature: 'finnstudio_tekst',
          maxTokens: 900,
          temperature: 0.8,
          messages: [
            { role: 'system', content: 'Du er en norsk tekstforfatter for display-bannere på FINN.no. Bannere har MINIMAL plass: overskrift maks 30 tegn, undertekst maks 45 tegn, CTA-knapp maks 14 tegn. Konteksten er unik: leseren blar i boligannonser på FINN eiendom akkurat nå — spill gjerne på det. Norsk bokmål, konkret, null superlativ-støy, ingen anførselstegn. Svar KUN med gyldig JSON.' },
            { role: 'user', content: `Selskap: DigiHome — profesjonell utleieforvaltning i Bergen. Tilbud: gratis leievurdering på 60 sekunder. Landingsside: ${String(body.landing || 'https://digihome.no/bli-utleier')}.

Brief: ${brief}

Lag 4 banner-varianter som JSON:
{ "variants": [ { "angle": "kort vinkelnavn", "headline": "maks 30 tegn", "subtext": "maks 45 tegn", "cta": "maks 14 tegn" } x4 — fire ULIKE vinkler, f.eks. «ikke selg – lei ut», markedsleie-nysgjerrighet, tidsbesparelse, trygghet ] }` },
          ],
        });
        const jsonStr = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
        const pkg = JSON.parse(jsonStr);
        const variants = (Array.isArray(pkg.variants) ? pkg.variants : []).slice(0, 4).map((v) => ({
          angle: String(v.angle || '').slice(0, 40),
          headline: String(v.headline || '').slice(0, 34),
          subtext: String(v.subtext || '').slice(0, 50),
          cta: String(v.cta || 'Les mer').slice(0, 16),
        }));
        if (!variants.length) return cors(NextResponse.json({ ok: false, error: 'AI ga ikke gyldige varianter — prøv igjen' }, { status: 502 }));
        return cors(NextResponse.json({ ok: true, variants }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'AI-teksten feilet: ' + (e.message || '') }, { status: 502 }));
      }
    }

    // Render bannere i alle valgte FINN-formater (WOW-motor i lib/finn-banners.js).
    // body: { headline, subtext?, cta?, eyebrow?, theme:'midnatt'|'nordlys'|'krem'|'plakat', imageB64?, formats?:[keys] }
    // → { ok, banners: [{key,label,w,h,bytes,maxKb,group,type,dataUrl}] }
    if (route === '/admin/finnstudio/render' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const headline = String(body.headline || '').slice(0, 60).trim();
      if (!headline) return cors(NextResponse.json({ ok: false, error: 'Overskrift mangler' }, { status: 400 }));
      try {
        let imgBuf = null;
        if (body.imageB64) {
          try { imgBuf = Buffer.from(String(body.imageB64).replace(/^data:[^;]+;base64,/, ''), 'base64'); } catch (e) { imgBuf = null; }
        }
        const banners = await renderFinnBanners({
          headline,
          subtext: String(body.subtext || '').slice(0, 90).trim(),
          cta: String(body.cta || 'Les mer').slice(0, 20).trim(),
          eyebrow: String(body.eyebrow ?? 'Utleieforvaltning i Bergen').slice(0, 40).trim(),
          theme: FINN_THEMES[body.theme] ? body.theme : 'midnatt',
          imgBuf,
          formats: Array.isArray(body.formats) && body.formats.length ? body.formats : null,
        });
        if (!banners.length) return cors(NextResponse.json({ ok: false, error: 'Ingen gyldige formater valgt' }, { status: 400 }));
        return cors(NextResponse.json({ ok: true, banners }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Rendering feilet: ' + (e.message || '') }, { status: 500 }));
      }
    }

    // AI-generert bakgrunnsfoto for bannere (Nano Banana Pro m/ fallback) → dataUrl.
    // Lagres ikke — frontend sender dataUrl videre til /render som imageB64.
    if (route === '/admin/finnstudio/genbg' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const userPrompt = String(body.prompt || '').slice(0, 400).trim()
        || 'Elegant Scandinavian apartment interior in Bergen, Norway — soft evening light through large windows, glimpse of colorful Bergen wooden houses outside';
      const fullPrompt = `${userPrompt}. Photorealistic, cinematic and premium, moody dark-toned edges and bottom (white text will be overlaid), shallow depth of field, visual focus in the upper center. No text, no watermarks, no logos, no people.`;
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
      try {
        let b64 = await genWithModel('gemini/gemini-3-pro-image-preview', 90000);
        let modelUsed = 'gemini-3-pro-image-preview';
        if (!b64) { b64 = await genWithModel('gemini/gemini-2.5-flash-image', 60000); modelUsed = 'gemini-2.5-flash-image'; }
        if (!b64) return cors(NextResponse.json({ ok: false, error: 'AI ga ikke noe bilde — prøv igjen' }, { status: 502 }));
        logImageUsage(db, { model: modelUsed, feature: 'finnstudio_bakgrunn' }).catch(() => {}); // kostnadstelling
        const out = await sharp(Buffer.from(b64, 'base64'))
          .resize({ width: 1600, withoutEnlargement: true })
          .jpeg({ quality: 84, mozjpeg: true })
          .toBuffer();
        return cors(NextResponse.json({ ok: true, dataUrl: `data:image/jpeg;base64,${out.toString('base64')}`, model: modelUsed }));
      } catch (e) {
        const msg = e.name === 'AbortError' ? 'AI-bildegenerering tok for lang tid — prøv igjen' : 'Bildegenerering feilet: ' + (e.message || 'ukjent');
        return cors(NextResponse.json({ ok: false, error: msg }, { status: 502 }));
      }
    }

    // Design-bibliotek: lagre og gjenbruk bannerdesign (finn_designs).
    if (route === '/admin/finnstudio/designs' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        if (id) {
          const d = await db.collection('finn_designs').findOne({ id: String(id) }, { projection: { _id: 0 } });
          if (!d) return cors(NextResponse.json({ ok: false, error: 'Fant ikke designet' }, { status: 404 }));
          return cors(NextResponse.json({ ok: true, design: d }));
        }
        const rows = await db.collection('finn_designs').find({}).project({ _id: 0, photo: 0 }).sort({ updatedAt: -1 }).limit(30).toArray();
        return cors(NextResponse.json({ ok: true, designs: rows }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }

    if (route === '/admin/finnstudio/designs' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const name = String(body.name || '').slice(0, 80).trim();
      if (!name) return cors(NextResponse.json({ ok: false, error: 'Designnavn mangler' }, { status: 400 }));
      const photo = typeof body.photo === 'string' && body.photo.startsWith('data:image/') ? body.photo.slice(0, 3_000_000) : null;
      const doc = {
        name,
        eyebrow: String(body.eyebrow || '').slice(0, 40),
        headline: String(body.headline || '').slice(0, 60),
        subtext: String(body.subtext || '').slice(0, 90),
        cta: String(body.cta || '').slice(0, 20),
        theme: String(body.theme || 'midnatt').slice(0, 20),
        landing: String(body.landing || '').slice(0, 300),
        utmCampaign: String(body.utmCampaign || '').slice(0, 80),
        photo, hasPhoto: !!photo,
        updatedAt: new Date().toISOString(),
      };
      try {
        if (body.id) {
          const r = await db.collection('finn_designs').updateOne({ id: String(body.id) }, { $set: doc });
          if (!r.matchedCount) return cors(NextResponse.json({ ok: false, error: 'Fant ikke designet' }, { status: 404 }));
          return cors(NextResponse.json({ ok: true, id: String(body.id) }));
        }
        doc.id = uuidv4();
        doc.createdAt = doc.updatedAt;
        await db.collection('finn_designs').insertOne({ ...doc });
        return cors(NextResponse.json({ ok: true, id: doc.id }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }

    if (route === '/admin/finnstudio/designs' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const id = String(searchParams.get('id') || '');
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      try {
        const r = await db.collection('finn_designs').deleteOne({ id });
        return cors(NextResponse.json({ ok: true, deleted: r.deletedCount }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }

    // Manuelle FINN-kampanjer: liste m/ målte resultater (UTM-join mot events + leads).
    if (route === '/admin/finnstudio/campaigns' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const rows = await db.collection('finn_campaigns').find({}).project({ _id: 0 }).sort({ startDate: -1, createdAt: -1 }).toArray();
        const FINN_RE = /finn/i;
        const round2 = (n) => Math.round((n || 0) * 100) / 100;
        // Hent alle finn-attribuerte leads én gang
        const allLeads = await db.collection('leads')
          .find({ 'attribution.source': { $regex: 'finn', $options: 'i' } })
          .project({ _id: 0, createdAt: 1, status: 1, wonValue: 1, value: 1, attribution: 1 })
          .limit(20000).toArray();
        const campaigns = [];
        for (const c of rows) {
          const fromIso = c.startDate ? `${c.startDate}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z';
          const toIso = c.endDate ? `${c.endDate}T23:59:59.999Z` : '9999-12-31T23:59:59.999Z';
          const utm = String(c.utmCampaign || '').trim().toLowerCase();
          const leads = allLeads.filter((l) => {
            if (l.createdAt < fromIso || l.createdAt > toIso) return false;
            if (utm) return String((l.attribution && l.attribution.campaign) || '').trim().toLowerCase() === utm;
            return true;
          });
          const won = leads.filter((l) => l.status === 'won');
          const wonValue = won.reduce((a, l) => a + (Number(l.wonValue) || Number(l.value) || 0), 0);
          // Økter fra events (unike sessionId med finn-kilde i perioden)
          let sessions = 0;
          try {
            const q = { ts: { $gte: fromIso, $lte: toIso }, source: { $regex: 'finn', $options: 'i' } };
            if (utm) q.campaign = { $regex: `^${utm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
            const ids = await db.collection('events').distinct('sessionId', q);
            sessions = ids.filter(Boolean).length;
          } catch (e) { /* best-effort */ }
          const spend = Number(c.spendNok) || 0;
          const clicks = Number(c.clicks) || 0;
          const imps = Number(c.impressions) || 0;
          campaigns.push({
            ...c,
            measured: {
              sessions, leads: leads.length, won: won.length, wonValue: round2(wonValue),
              cpl: leads.length && spend ? round2(spend / leads.length) : null,
              cpa: won.length && spend ? round2(spend / won.length) : null,
              roas: spend ? round2(wonValue / spend) : null,
              ctr: imps && clicks ? round2((clicks / imps) * 100) : null,
              cpc: clicks && spend ? round2(spend / clicks) : null,
              cpm: imps && spend ? round2((spend / imps) * 1000) : null,
              clickToSession: clicks ? round2((sessions / clicks) * 100) : null,
            },
          });
        }
        const tot = campaigns.reduce((a, c) => ({
          spend: a.spend + (Number(c.spendNok) || 0),
          impressions: a.impressions + (Number(c.impressions) || 0),
          clicks: a.clicks + (Number(c.clicks) || 0),
          sessions: a.sessions + (c.measured.sessions || 0),
          leads: a.leads + (c.measured.leads || 0),
          won: a.won + (c.measured.won || 0),
          wonValue: a.wonValue + (c.measured.wonValue || 0),
        }), { spend: 0, impressions: 0, clicks: 0, sessions: 0, leads: 0, won: 0, wonValue: 0 });
        tot.cpl = tot.leads && tot.spend ? round2(tot.spend / tot.leads) : null;
        tot.spend = round2(tot.spend); tot.wonValue = round2(tot.wonValue);
        return cors(NextResponse.json({ ok: true, campaigns, totals: tot }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }

    // Opprett/oppdater manuell FINN-kampanje. body: {id?, name, utmCampaign?, startDate?, endDate?, budgetNok?, spendNok?, impressions?, clicks?, status?, note?}
    if (route === '/admin/finnstudio/campaigns' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const name = String(body.name || '').slice(0, 120).trim();
      if (!name) return cors(NextResponse.json({ ok: false, error: 'Kampanjenavn mangler' }, { status: 400 }));
      const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : null);
      const num = (v) => (v === '' || v == null || isNaN(Number(v)) ? null : Math.max(0, Number(v)));
      const doc = {
        name,
        utmCampaign: String(body.utmCampaign || '').slice(0, 80).trim().toLowerCase().replace(/\s+/g, '-') || null,
        startDate: day(body.startDate), endDate: day(body.endDate),
        budgetNok: num(body.budgetNok), spendNok: num(body.spendNok) || 0,
        impressions: Math.round(num(body.impressions) || 0), clicks: Math.round(num(body.clicks) || 0),
        status: ['planlagt', 'aktiv', 'avsluttet'].includes(body.status) ? body.status : 'planlagt',
        note: String(body.note || '').slice(0, 500),
        updatedAt: new Date().toISOString(),
      };
      try {
        if (body.id) {
          const r = await db.collection('finn_campaigns').updateOne({ id: String(body.id) }, { $set: doc });
          if (!r.matchedCount) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
          const saved = await db.collection('finn_campaigns').findOne({ id: String(body.id) }, { projection: { _id: 0 } });
          return cors(NextResponse.json({ ok: true, campaign: saved }));
        }
        doc.id = uuidv4();
        doc.createdAt = doc.updatedAt;
        await db.collection('finn_campaigns').insertOne({ ...doc });
        return cors(NextResponse.json({ ok: true, campaign: doc }, { status: 201 }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
      }
    }

    if (route === '/admin/finnstudio/campaigns' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const id = String(searchParams.get('id') || '');
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      try {
        const r = await db.collection('finn_campaigns').deleteOne({ id });
        return cors(NextResponse.json({ ok: true, deleted: r.deletedCount }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 500 }));
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
            else if (b.type === 'offer' && (b.big || b.eyebrow)) parts.push(`${b.eyebrow || ''} ${b.big || ''}${b.was ? ` (før: ${b.was})` : ''} ${b.bigLabel || ''} ${(b.items || []).map((x) => `${x.title}: ${x.now}${x.was ? ` (før ${x.was})` : ''}`).join(' · ')}`.trim());
            else if (b.type === 'stat' && (b.title || b.text)) parts.push(`${b.title || ''} ${(b.stats || []).map((x) => `${x.value} ${x.label}`.trim()).join(' · ')} ${b.text || ''}`.trim());
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
      const sp = new URL(request.url).searchParams;
      const id = (sp.get('id') || '').toString().slice(0, 64);
      const doc = await db.collection('newsletter_assets').findOne({ id }, { projection: { _id: 0, data: 1, contentType: 1 } });
      if (!doc) return new NextResponse('Not found', { status: 404 });
      let buf = Buffer.from(doc.data, 'base64');
      let ctype = doc.contentType || 'image/jpeg';
      // Valgfri serverside-beskjæring (?w=&h=&fx=&fy=): e-postklienter som Outlook
      // mobil ignorerer CSS object-fit/height — utsnittet må derfor bakes inn i
      // selve bildefilen. fx/fy = fokuspunkt i prosent. Resultatet caches i Mongo.
      const w = Math.min(2400, Math.max(0, parseInt(sp.get('w') || '0', 10) || 0));
      const h = Math.min(2400, Math.max(0, parseInt(sp.get('h') || '0', 10) || 0));
      if (w && h && /^image\/(jpeg|png|webp)$/i.test(ctype)) {
        const fx = Math.min(100, Math.max(0, parseInt(sp.get('fx') || '50', 10) || 50));
        const fy = Math.min(100, Math.max(0, parseInt(sp.get('fy') || '50', 10) || 50));
        const key = `${id}:${w}x${h}:${fx},${fy}`;
        try {
          const cached = await db.collection('newsletter_assets_derived').findOne({ key }, { projection: { _id: 0, data: 1, contentType: 1 } });
          if (cached) {
            buf = Buffer.from(cached.data, 'base64');
            ctype = cached.contentType || ctype;
          } else {
            const sharp = (await import('sharp')).default;
            const img = sharp(buf, { failOn: 'none' });
            const meta = await img.metadata();
            const sw = meta.width || 0; const sh = meta.height || 0;
            if (sw && sh) {
              // Ikke oppskaler små kilder — behold sideforholdet på målboksen
              const f = Math.min(1, sw / w, sh / h);
              const tw = Math.max(1, Math.round(w * f)); const th2 = Math.max(1, Math.round(h * f));
              const scale = Math.max(tw / sw, th2 / sh);
              const rw = Math.max(tw, Math.round(sw * scale)); const rh = Math.max(th2, Math.round(sh * scale));
              const left = Math.round(Math.min(Math.max((rw * fx / 100) - tw / 2, 0), rw - tw));
              const top = Math.round(Math.min(Math.max((rh * fy / 100) - th2 / 2, 0), rh - th2));
              let out = img.resize(rw, rh).extract({ left, top, width: tw, height: th2 });
              out = /png/i.test(ctype) ? out.png() : /webp/i.test(ctype) ? out.webp({ quality: 82 }) : out.jpeg({ quality: 82, mozjpeg: true });
              buf = await out.toBuffer();
              await db.collection('newsletter_assets_derived').updateOne(
                { key },
                { $set: { key, assetId: id, data: buf.toString('base64'), contentType: ctype, createdAt: new Date().toISOString() } },
                { upsert: true }
              );
            }
          }
        } catch (e) { /* beskjæring feilet → server originalbildet */ }
      }
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': ctype,
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

    // Henter Open Graph-metadata (bilde/tittel/site) fra en ekstern artikkel-URL —
    // brukes av Markedsinnsikt-blokken for valgfritt forhåndsvisningsbilde fra kilden.
    if (route === '/admin/link-preview' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const raw = (searchParams.get('url') || '').trim();
      let target;
      try {
        target = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
        if (!/^https?:$/.test(target.protocol)) throw new Error('bad proto');
      } catch (e) { return cors(NextResponse.json({ ok: false, error: 'Ugyldig URL' }, { status: 400 })); }
      try {
        const r = await fetch(target.toString(), {
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        const htmlText = (await r.text()).slice(0, 400000);
        const pick = (patterns) => {
          for (const re of patterns) { const m = htmlText.match(re); if (m && m[1]) return m[1].trim(); }
          return '';
        };
        const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        let image = pick([
          /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
          /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
        ]);
        const title = decode(pick([
          /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
          /<title[^>]*>([^<]+)<\/title>/i,
        ])).slice(0, 200);
        const site = decode(pick([
          /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
          /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
        ])).slice(0, 100);
        if (image) {
          image = decode(image);
          try { image = new URL(image, r.url || target.toString()).toString(); } catch (e2) { image = ''; }
          if (!/^https:\/\//i.test(image)) image = ''; // e-postklienter krever https-bilder
        }
        if (!image) return cors(NextResponse.json({ ok: false, error: 'Fant ikke noe forhåndsvisningsbilde på siden' }, { status: 404 }));
        return cors(NextResponse.json({ ok: true, image, title, site }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Fikk ikke hentet siden (tidsavbrudd eller blokkert)' }, { status: 502 }));
      }
    }

    if (route === '/admin/newsletter/preview' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const resolved = await resolveDraftProperties(db, body.blocks);
      const blocks = resolved.blocks;
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
      return cors(NextResponse.json({ ok: true, html, unavailableProperties: resolved.unavailable }));
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
        else if (b.type === 'offer' && (b.big || b.eyebrow)) parts.push(`TILBUD: ${b.eyebrow || ''} ${b.big || ''}${b.was ? ` (normalt ${b.was})` : ''} ${b.bigLabel || ''} ${b.second || ''} ${(b.items || []).map((x) => `${x.title}: ${x.now}${x.was ? ` (normalt ${x.was})` : ''}`).join(' · ')} ${b.deadline || ''}`.trim());
        else if (b.type === 'stat' && (b.title || b.text)) parts.push(`MARKEDSINNSIKT: ${b.title || ''} ${(b.stats || []).map((x) => `${x.value} ${x.label}`.trim()).join(' · ')} ${b.text || ''} (${b.source || 'ekstern kilde'})`.trim());
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
      // AUTO-OPPFRISK: boliger som er utleid (eller mangler bilder/data) tas ut
      // av testen automatisk i stedet for å blokkere den. Endringen lagres i
      // utkastet når vi vet hvilken kampanje det gjelder, og rapporteres tilbake
      // slik at editoren kan si det høyt til redaktøren.
      const refreshed = await refreshCampaignProperties(db, body.blocks);
      const blocks = refreshed.blocks;
      const testCampaignId = String(body.campaignId || '').slice(0, 80);
      if (refreshed.changed && testCampaignId) {
        try {
          await db.collection(NEWSLETTER_COLL).updateOne(
            { id: testCampaignId, status: { $ne: 'sent' } },
            { $set: { blocks, updatedAt: new Date().toISOString() } },
          );
        } catch (_) {}
      }
      // Mistet blokken ALLE boligene, er det en redaksjonell beslutning å velge
      // nye — da stopper vi, men med en beskjed som sier hva som skal gjøres.
      if (refreshed.emptied.length) {
        return cors(NextResponse.json({
          ok: false,
          error: `Ingen av boligene i «${refreshed.emptied[0]}» er ledige lenger — velg nye boliger i boligblokken`,
          removedProperties: refreshed.removed, unavailableProperties: refreshed.removed, emptiedBlocks: refreshed.emptied,
        }, { status: 409 }));
      }
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
          recipient: { name: (body.sampleName || 'Martin Kviteberg').toString(), email: to },
          testNote,
        });
        try {
          await sendHtmlEmail({ to, subject: `[TEST] ${applyMergeTags(subject, { name: (body.sampleName || 'Martin Kviteberg').toString() })}`, html, fromName });
          sent.push(to);
        } catch (e) { failed.push({ to, error: e.message }); }
      }
      if (!sent.length) return cors(NextResponse.json({ ok: false, error: failed[0]?.error || 'Sending feilet' }, { status: 502 }));
      return cors(NextResponse.json({ ok: true, sentTo: sent, sentCount: sent.length, failed, removedProperties: refreshed.removed }));
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
        subject: tpl.key === 'boliger' ? '{{first_name}}, nye ledige boliger fra DigiHome' : '',
        preheader: tpl.key === 'boliger' ? 'Se boligene og meld interesse med noen få trykk.' : '',
        fromName: 'DigiHome',
        theme: 'lavendel',
        blocks: templateBlocks(tpl.key),
        segments: tpl.key === 'boliger' ? ['leietakere'] : [], excludedEmails: [], extraEmails: [],
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
      const existing = await db.collection(NEWSLETTER_COLL).findOne({ id }, { projection: { _id: 0, status: 1, scheduledFor: 1 } });
      if (!existing) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
      if (existing.status === 'sent') return cors(NextResponse.json({ ok: false, error: 'Sendte eller planlagte kampanjer kan ikke endres' }, { status: 400 }));
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
      if (body.scheduledFor !== undefined) {
        const iso = body.scheduledFor ? new Date(body.scheduledFor).toISOString() : null;
        set.scheduledFor = iso && Date.parse(iso) > Date.now() + 5 * 60 * 1000 ? iso : null;
      }
      await db.collection(NEWSLETTER_COLL).updateOne({ id }, { $set: set });
      return cors(NextResponse.json({ ok: true, updatedAt: set.updatedAt }));
    }

    // Hent én kampanje (med statistikk og klikk per lenke)
    if (route === '/admin/newsletter/campaign' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const id = (new URL(request.url).searchParams.get('id') || '').toString();
      const c = await db.collection(NEWSLETTER_COLL).findOne({ id }, { projection: { _id: 0 } });
      if (!c) return cors(NextResponse.json({ ok: false, error: 'Fant ikke kampanjen' }, { status: 404 }));
      // Oppfrisk bydel på boligkortene, slik at editoren grupperer riktig også
      // for utkast som ble laget før bydelsutledningen fantes.
      let propertyRefresh = null;
      if (c.status !== 'sent') {
        try { c.blocks = await hydrateBlockDistricts(db, c.blocks); } catch (_) {}
        // AUTO-OPPFRISK av boligblokken: utleide/ufullstendige boliger fjernes
        // og resten oppdateres MENS utkastet åpnes. Da ser redaktøren riktig
        // utvalg umiddelbart, og test/sending stopper ikke på noe systemet kan
        // fikse selv. Endringen lagres, og vi rapporterer hva som ble fjernet.
        try {
          const rp = await refreshCampaignProperties(db, c.blocks);
          if (rp.changed) {
            c.blocks = rp.blocks;
            await db.collection(NEWSLETTER_COLL).updateOne({ id }, { $set: { blocks: rp.blocks, updatedAt: new Date().toISOString() } });
          }
          if (rp.removed.length || rp.emptied.length) propertyRefresh = { removed: rp.removed, emptied: rp.emptied, at: new Date().toISOString() };
        } catch (_) {}
      }
      let clicksByUrl = [];
      let timeline = [];
      let hourly = [];
      let devices = [];
      let clients = [];
      let segments = [];
      let recipientDetails = [];
      let medianMinutesToOpen = null;
      let bestHour = null;
      let leadsGenerated = [];
      if (c.status === 'sent') {
        // KONVERTERINGER (10/7): leads stemplet med denne kampanjen via
        // newsletter_source (CTA-param på landingssiden ELLER e-post-match mot
        // mottakerloggen) — lukker løkken sendt → åpnet → klikket → lead.
        leadsGenerated = await db.collection('leads')
          .find({ 'newsletter_source.campaignId': id, deleted: { $ne: true } })
          .project({ _id: 0, id: 1, name: 1, email: 1, status: 1, createdAt: 1, wonValue: 1, self_service: 1, newsletter_source: 1 })
          .sort({ createdAt: -1 }).limit(200).toArray();
        leadsGenerated = leadsGenerated.map((l) => ({
          id: l.id, name: l.name || '', email: l.email || '', status: l.status || 'new',
          createdAt: l.createdAt, wonValue: l.wonValue || null, selfService: l.self_service === true,
          via: l.newsletter_source?.via || null,
        }));
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
        // Hva auto-oppfriskingen av boligblokken gjorde (null = ingenting).
        propertyRefresh,
        stats: {
          recipients: c.recipients || 0, sent: c.sent || 0, failedCount: c.failedCount || 0,
          opens: c.opens || 0, opensUnique, clicks: c.clicks || 0, clicksUnique, unsubs,
          openRate: c.sent ? Math.round((opensUnique / c.sent) * 1000) / 10 : null,
          clickRate: c.sent ? Math.round((clicksUnique / c.sent) * 1000) / 10 : null,
          ctor: opensUnique ? Math.round((clicksUnique / opensUnique) * 1000) / 10 : null,
          medianMinutesToOpen, bestHour,
          clicksByUrl, timeline, hourly, devices, clients, segments, recipientDetails,
          propertyInterests: c.propertyInterests || 0,
          leadsGenerated,
          leadsCount: leadsGenerated.length,
          leadsWon: leadsGenerated.filter((l) => l.status === 'won').length,
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

      // AUTO-OPPFRISK av boligblokken rett før utsending: en bolig kan ha blitt
      // utleid siden utkastet ble laget. Den tas ut automatisk — en utleid bolig
      // i et nyhetsbrev er verre enn et brev med én bolig mindre. Blir en
      // boligblokk helt tom, stopper vi og ber redaktøren velge nye.
      const propertyResolution = await refreshCampaignProperties(db, c.blocks || []);
      const sendBlocks = propertyResolution.blocks;
      if (propertyResolution.emptied.length) {
        return cors(NextResponse.json({
          ok: false,
          error: `Ingen av boligene i «${propertyResolution.emptied[0]}» er ledige lenger — åpne boligblokken og velg nye boliger`,
          removedProperties: propertyResolution.removed, unavailableProperties: propertyResolution.removed,
          emptiedBlocks: propertyResolution.emptied,
        }, { status: 409 }));
      }
      if (!hasContent(sendBlocks)) return cors(NextResponse.json({ ok: false, error: 'Nyhetsbrevet har ikke noe innhold ennå' }, { status: 400 }));
      if (propertyResolution.changed) {
        // Lagre det som faktisk sendes, slik at arkivet og statistikken viser
        // riktig innhold i ettertid.
        try { await db.collection(NEWSLETTER_COLL).updateOne({ id: campaignId }, { $set: { blocks: sendBlocks, updatedAt: new Date().toISOString() } }); } catch (_) {}
      }

      const { recipients, skipped } = await resolveAudience(db, c.segments, c.excludedEmails || [], c.extraEmails || []);
      if (!recipients.length) return cors(NextResponse.json({ ok: false, error: 'Ingen mottakere i valgt målgruppe (etter avmeldte/ekskluderte)' }, { status: 400 }));
      if (recipients.length > 2000) return cors(NextResponse.json({ ok: false, error: `For mange mottakere i én utsending (${recipients.length} > 2000)` }, { status: 400 }));

      const scheduledFor = c.scheduledFor ? Date.parse(c.scheduledFor) : null;
      if (scheduledFor && (scheduledFor < Date.now() + 5 * 60 * 1000 || scheduledFor > Date.now() + 72 * 60 * 60 * 1000)) {
        return cors(NextResponse.json({ ok: false, error: 'Planlagt tidspunkt må være mellom 5 minutter og 72 timer frem i tid' }, { status: 400 }));
      }
      const sendAt = scheduledFor ? Math.floor(scheduledFor / 1000) : undefined;
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
              subject, preheader: c.preheader || '', blocks: sendBlocks, theme: c.theme || 'lavendel',
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
              sendAt,
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
          tenantId: r.segment === 'leietakere' ? (r.id || '') : '',
          failed: failed.some((f) => f.email === r.email), sentAt: scheduledFor ? c.scheduledFor : now,
        }));
        if (recDocs.length) await db.collection('newsletter_recipients').insertMany(recDocs, { ordered: false });
      } catch (e) {}
      const upd = {
        status: 'sent', sentAt: scheduledFor ? c.scheduledFor : now, scheduledFor: c.scheduledFor || null, queuedAt: scheduledFor ? now : null, updatedAt: now, slug,
        recipients: recipients.length, sent, failedCount: failed.length,
        failed: failed.slice(0, 50), skipped, opens: 0, clicks: 0, openedR: [], clickedR: [],
      };
      await db.collection(NEWSLETTER_COLL).updateOne({ id: campaignId }, { $set: upd });
      return cors(NextResponse.json({ ok: true, campaign: { ...c, ...upd }, removedProperties: propertyResolution.removed }, { status: 201 }));
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

    // Kandidater til abonnentlisten fra CRM-et: alle leads/leietakere med gyldig
    // e-post, flagget med om de allerede er abonnent eller har meldt seg av.
    // Brukes av «Legg til fra leads»-modalen i abonnent-admin.
    if (route === '/admin/newsletter/subscriber-candidates' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const subRows = await db.collection('newsletter_subscribers').find({}, { projection: { _id: 0, email: 1 } }).limit(50000).toArray();
      const subSet = new Set(subRows.map((s) => nlNormEmail(s.email)));
      const optRows = await db.collection(OPTOUT_COLL).find({}, { projection: { _id: 0, email: 1 } }).toArray();
      const optSet = new Set(optRows.map((o) => nlNormEmail(o.email)));
      const seen = new Set();
      const candidates = [];
      const consider = (r, type) => {
        const em = nlNormEmail(r.email);
        if (!em || !/^\S+@\S+\.\S+$/.test(em) || seen.has(em)) return;
        seen.add(em);
        candidates.push({
          email: em,
          name: String(r.name || '').slice(0, 120),
          status: r.status || 'new',
          type, // 'lead' (utleier) | 'tenant' (leietaker)
          createdAt: r.createdAt || '',
          alreadySubscriber: subSet.has(em),
          unsubscribed: optSet.has(em),
        });
      };
      const proj = { projection: { _id: 0, name: 1, email: 1, status: 1, createdAt: 1 } };
      const owners = await db.collection('leads').find({ email: { $exists: true, $nin: [null, ''] }, deleted: { $ne: true } }, proj).sort({ createdAt: -1 }).limit(5000).toArray();
      for (const r of owners) consider(r, 'lead');
      const tenants = await db.collection('tenant_leads').find({ email: { $exists: true, $nin: [null, ''] }, deleted: { $ne: true } }, proj).sort({ createdAt: -1 }).limit(5000).toArray();
      for (const r of tenants) consider(r, 'tenant');
      return cors(NextResponse.json({ ok: true, candidates }));
    }

    // Bulk-import av abonnenter fra CRM-et (valgt i modalen). VIKTIG: avmeldte
    // (email_optouts) hoppes ALLTID over — bulk-import skal aldri overstyre et
    // eksplisitt avmeldingsønske (i motsetning til enkelt-tillegg over, som er
    // en bevisst manuell handling). source='import-leads' for sporbarhet.
    if (route === '/admin/newsletter/subscribers/import' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const items = Array.isArray(body.items) ? body.items.slice(0, 2000) : [];
      if (!items.length) return cors(NextResponse.json({ ok: false, error: 'Ingen mottakere valgt' }, { status: 400 }));
      const optRows = await db.collection(OPTOUT_COLL).find({}, { projection: { _id: 0, email: 1 } }).toArray();
      const optSet = new Set(optRows.map((o) => nlNormEmail(o.email)));
      const now = new Date().toISOString();
      let added = 0, already = 0, skippedOptout = 0, skippedInvalid = 0;
      const seenIm = new Set();
      for (const it of items) {
        const email = nlNormEmail(typeof it === 'string' ? it : it?.email);
        if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || seenIm.has(email)) { skippedInvalid++; continue; }
        seenIm.add(email);
        if (optSet.has(email)) { skippedOptout++; continue; }
        const name = String((typeof it === 'object' && it?.name) || '').slice(0, 120);
        const set = { updatedAt: now };
        if (name) set.name = name;
        const res = await db.collection('newsletter_subscribers').updateOne(
          { email },
          { $set: set, $setOnInsert: { email, subscribedAt: now, consent: true, source: 'import-leads' } },
          { upsert: true }
        );
        if (res.upsertedCount) added++; else already++;
      }
      return cors(NextResponse.json({ ok: true, added, already, skippedOptout, skippedInvalid }, { status: 201 }));
    }

    // Offentlig avmelding — HMAC-verifisert lenke fra e-posten. Ingen auth.
    // GET = klikk fra e-post (redirect til bekreftelsesside).
    // POST = One-Click avmelding (RFC 8058 — Gmail/Yahoo poster hit automatisk).
    // =====================================================================
    // ETTKLIKKS-INTERESSE fra nyhetsbrev («magic link»). CTA-lenker bærer
    // ?e=<base64url-epost>&t=<hmac>. GET /lookup identifiserer mottakeren
    // (kun visningsdata — aldri full telefon). POST /confirm oppretter lead
    // via det ordinære /leads-endepunktet (dedupe/klassifisering/videresending
    // gjenbrukes). Roboter/e-postskannere GET-er lenker men POST-er aldri.
    // =====================================================================
    async function findNlContact(dbx, email) {
      const em = String(email || '').trim().toLowerCase();
      if (!em) return null;
      const rx = { $regex: `^${em.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' };
      try {
        const lead = await dbx.collection('leads').find({ email: rx }).sort({ createdAt: -1 }).limit(1).toArray();
        if (lead[0]) return { name: lead[0].name || '', phone: lead[0].phone || '', address: lead[0].address || '' };
        const sub = await dbx.collection('newsletter_subscribers').findOne({ email: rx });
        if (sub) return { name: sub.name || '', phone: sub.phone || '', address: '' };
        const tn = await dbx.collection('tenant_leads').find({ email: rx }).sort({ createdAt: -1 }).limit(1).toArray();
        if (tn[0]) return { name: tn[0].name || '', phone: tn[0].phone || '', address: '' };
      } catch (e) { /* best-effort */ }
      return null;
    }
    const decodeMagicEmail = (v) => {
      try { return Buffer.from(String(v || ''), 'base64url').toString('utf8').trim().toLowerCase(); } catch (e) { return ''; }
    };

    const findNewsletterProperty = async (dbx, propertyId, opts = {}) => {
      const pid = String(propertyId || '').slice(0, 80);
      if (!pid) return null;
      const row = await dbx.collection('platform_properties').findOne(
        { stale: { $ne: true }, $or: [{ externalId: pid }, { id: pid }] },
        // `editorial` MÅ være med: uten den ignorerte nyhetsbrevflyten
        // redaktørens overstyringer — inkludert utleieenhet (hele enheten / rom
        // i bofellesskap), som avgjør om interessenten må velge.
        { projection: { _id: 0, id: 1, externalId: 1, title: 1, area: 1, district: 1, districtSource: 1, city: 1, type: 1, bedrooms: 1, sqm: 1, images: 1, status: 1, monthlyRentBand: 1, availableFrom: 1, enrich: 1, editorial: 1, unit: 1 } }
      );
      if (!row) return null;
      // Berik med FINN-data (bilder/areal/pris/bydel) der plattformen mangler
      // dem, og ta med annonselenken + plattformens boligside slik at leietakeren
      // kan se hele boligen. STRIPP alt admininternt: eier- og leietakernavn,
      // full adresse med husnummer, faktisk leiebeløp og etasje skal aldri ut
      // på en kunderettet flate.
      const e = applyEnrichment(row);
      // FINN-lenkens PROVENIENS avgjør om vi tør sende en leietaker dit:
      //  · 'manuell'   = vi har limt inn lenken selv og verifisert den live → trygg
      //  · 'plattform' = fra units-eksporten. Den returnerer i dag også FINN-koder
      //    som IKKE tilhører utleiemodulens gjeldende annonse (bekreftet på
      //    NEDRE GARTNERGATEN 4: finnkode i eksporten, men ingen annonse i
      //    utleieprosessen). Derfor krever vi eksplisitt finnStatus 'aktiv'.
      // Plattformteamet er varslet og skal levere finnSource + autoritativ
      // finnStatus. Inntil da er publicUrl vår videreføring.
      const finnTrusted = !!e.finnUrl && e.finnStatus !== 'utgatt'
        && (e.finnSource === 'manuell' || e.finnStatus === 'aktiv');
      const {
        missingFields, incomplete, enriched, enrichedFields, districtSource, finnCheckedAt, finnSource,
        fullAddress, street, houseNumber, floor, rooms, ownerName, tenantName, tenantActiveFrom,
        rentAmount, rentIsEstimate, buildingId, buildingLabel, unitStatus, hasUnitData, postalCode,
        ...safe
      } = e;
      if (!finnTrusted) { safe.finnUrl = null; safe.finnCode = ''; }
      // Interessen som lagres og sendes videre til plattformen trenger den FULLE
      // boligen (gateadresse med husnummer, utleieenhet). Den brukes bare
      // server-side; klientflater får alltid `safe`.
      if (opts.full) return e;
      return safe;
    };

    // Boligspesifikk interesse fra nyhetsbrev. GET er alltid read-only (beskytter
    // mot e-postskannere); først POST-bekreftelse skriver til leietakerkortet.
    if (route === '/newsletter/property-interest/lookup' && method === 'GET') {
      const sp = new URL(request.url).searchParams;
      const campaignId = String(sp.get('c') || '').slice(0, 80);
      const rid = String(sp.get('r') || '').slice(0, 32);
      const propertyKey = String(sp.get('property') || '').slice(0, 80);
      const property = await findNewsletterProperty(db, propertyKey);
      if (!property) return cors(NextResponse.json({ ok: false, error: 'Boligen finnes ikke lenger' }, { status: 404 }));
      const recipient = await db.collection('newsletter_recipients').findOne({ campaignId, rid }, { projection: { _id: 0, email: 1, tenantId: 1 } });
      const tokenOk = verifyPropertyInterestToken(campaignId, rid, propertyKey, sp.get('pt'));
      if (!recipient?.email || !tokenOk) {
        // Admin-/e-postpreview uten mottakeridentitet: boligen kan vises, men
        // bekreftelsesknappen er deaktivert og ingen leaddata eksponeres.
        return cors(NextResponse.json({ ok: true, preview: true, firstName: '', property, available: property.status === 'active', campaignId: '' }));
      }
      const email = nlNormEmail(recipient.email);
      const contact = await findNlContact(db, email);
      // Har hun alt meldt interesse for denne boligen, skal siden si det — i
      // stedet for å la henne trykke i tvil om det gikk gjennom forrige gang.
      const propertyId = property.externalId || property.id;
      const already = await db.collection('property_interest_events').countDocuments({ email, propertyId });
      return cors(NextResponse.json({
        ok: true,
        firstName: contact?.name ? String(contact.name).split(/\s+/)[0] : '',
        property,
        available: property.status === 'active',
        alreadyInterested: already > 0,
        campaignId,
      }));
    }

    if (route === '/newsletter/property-interest/confirm' && method === 'POST') {
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const campaignId = String(body.campaign || body.c || '').slice(0, 80);
      const rid = String(body.r || '').slice(0, 32);
      const propertyKey = String(body.property || '').slice(0, 80);
      const recipient = await db.collection('newsletter_recipients').findOne({ campaignId, rid }, { projection: { _id: 0, email: 1, tenantId: 1 } });
      if (!recipient?.email || !verifyPropertyInterestToken(campaignId, rid, propertyKey, body.pt)) {
        return cors(NextResponse.json({ ok: false, error: 'Ugyldig eller utløpt lenke' }, { status: 401 }));
      }
      const email = nlNormEmail(recipient.email);
      const property = await findNewsletterProperty(db, propertyKey, { full: true });
      if (!property) return cors(NextResponse.json({ ok: false, error: 'Boligen finnes ikke lenger' }, { status: 404 }));
      if (property.status !== 'active') return cors(NextResponse.json({ ok: false, error: 'Boligen er dessverre ikke ledig lenger' }, { status: 409 }));

      // UTLEIEENHET. Tilbyr boligen både hele enheten og rom i bofellesskap, må
      // valget følge med — ellers vet ikke forvalteren om hun svarer på en hel
      // leilighet eller ett rom. Samme regel som på boligsiden, samme
      // feilmelding, validert på serveren.
      const scopeChoices = scopeOptionsFor(property);
      const pickedScope = normalizeInterestScope(body.scope ?? body.interest_scope, property);
      if (scopeChoices.length > 1 && !pickedScope.length) {
        return cors(NextResponse.json({
          ok: false, field: 'interest_scope',
          error: 'Velg om du er interessert i hele enheten eller rom i bofellesskap',
          options: scopeChoices.map((v) => ({ value: v, label: SCOPE_LABEL[v] })),
        }, { status: 400 }));
      }

      const emailRe = new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
      let tenant = await db.collection('tenant_leads').find({ email: emailRe, deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(1).next();
      let coll = 'tenant_leads';
      let tenantCreated = false;
      if (!tenant) {
        tenant = await db.collection('imported_leads').find({ email: emailRe, lead_type: 'leietaker', deleted: { $ne: true } }).sort({ createdAt: -1 }).limit(1).next();
        coll = 'imported_leads';
      }
      if (!tenant?.id) {
        // BLINDVEI FIKSET: mottakere som står i nyhetsbrevlista uten å ha en
        // leietakerprofil (kontakt importert direkte, eller profil arkivert)
        // fikk «Fant ikke leietakerprofilen din» og interessen gikk tapt.
        // En bekreftet interesse er for verdifull til å kastes — vi oppretter
        // profilen fra nyhetsbrevkontakten i stedet. Lenken er HMAC-signert,
        // så e-posten er alt verifisert.
        const contact = await findNlContact(db, email);
        const now = new Date().toISOString();
        tenant = {
          id: uuidv4(),
          email,
          name: (contact?.name || '').slice(0, 120),
          phone: (contact?.phone || '').slice(0, 32),
          lead_type: 'leietaker',
          status: 'ny',
          source: 'nyhetsbrev-boliginteresse',
          createdAt: now,
          updatedAt: now,
          property_interests: [],
          attribution: { source: 'newsletter', medium: 'email', campaign: campaignId || 'ledige-boliger' },
        };
        await db.collection('tenant_leads').insertOne({ ...tenant });
        coll = 'tenant_leads';
        tenantCreated = true;
      }

      const at = new Date().toISOString();
      const propertyId = property.externalId || property.id;
      const previous = (Array.isArray(tenant.property_interests) ? tenant.property_interests : []).find((x) => String(x.propertyId) === String(propertyId));
      // Samme kanoniske form som boligsiden bruker: enhets-ID, full adresse,
      // slug og lenke. Da leser admin, e-posten og DigiHome-plattformen de
      // samme feltene uansett om interessen kom fra nyhetsbrevet eller nettet.
      const interest = {
        ...interestRecord(property, {
          source: 'nyhetsbrev-bolig',
          at: previous?.at || at,
          scope: pickedScope,
          message: body.message,
          baseUrl: (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, ''),
        }),
        status: previous?.status || 'interested',
        lastConfirmedAt: at,
        campaignId,
        rid,
      };
      await db.collection(coll).updateOne(
        { id: tenant.id },
        {
          $set: { updatedAt: at, last_property_interest_at: at },
          $pull: { property_interests: { propertyId } },
        }
      );
      await db.collection(coll).updateOne({ id: tenant.id }, { $push: { property_interests: interest } });
      const eventResult = await db.collection('property_interest_events').updateOne(
        { email, propertyId, campaignId },
        {
          $set: { email, tenantId: tenant.id, tenantCollection: coll, ...interest, lastConfirmedAt: at },
          $setOnInsert: { id: uuidv4(), createdAt: at },
        },
        { upsert: true }
      );
      if (campaignId && rid && eventResult.upsertedCount) {
        try {
          await db.collection(NL_EVENTS_COLL).insertOne({ id: uuidv4(), campaignId, rid, type: 'property_interest', propertyId, tenantId: tenant.id, at });
          await db.collection(NEWSLETTER_COLL).updateOne({ id: campaignId }, { $inc: { propertyInterests: 1 } });
        } catch (e) { /* interesse på kortet er allerede lagret */ }
      }

      // Boligmeldingen legges i den kvitterbare køen mot plattformen OG pushes i
      // sanntid, på samme måte som interesse meldt på boligsiden. Én kanal,
      // uansett kilde — ellers ville nyhetsbrev-interesser blitt en annenrangs vei.
      if (!previous) {
        try {
          await deliverInterest(db, tenant, interest, { campaignId: campaignId || null });
        } catch (e) { /* køen er et tillegg — interessen er alt lagret */ }
      }

      // INTERNT VARSEL. Fyres kun ved FØRSTE interesse for denne boligen fra
      // denne personen — gjentatte klikk skal ikke spamme teamet. Best-effort
      // og aldri blokkerende: leietakeren skal se «registrert» selv om
      // e-postleverandøren er nede.
      let notify = null;
      if (!previous) {
        try {
          let campaignTitle = '';
          if (campaignId) {
            const camp = await db.collection(NEWSLETTER_COLL).findOne({ id: campaignId }, { projection: { _id: 0, title: 1, subject: 1 } });
            campaignTitle = camp?.title || camp?.subject || '';
          }
          notify = await sendPropertyInterestNotification(
            { ...tenant, property_interests: [...(tenant.property_interests || []), interest] },
            property,
            { campaignId, campaignTitle, tenantCreated, interest },
          );
        } catch (e) { notify = { ok: false, error: String(e.message || e).slice(0, 200) }; }
        try {
          await db.collection('property_interest_events').updateOne(
            { email, propertyId, campaignId },
            { $set: { notify: { ok: !!(notify && notify.ok), at: new Date().toISOString(), skipped: notify?.skipped || null } } },
          );
        } catch (e) { /* varselstatus er sporing, ikke kritisk */ }
      }

      return cors(NextResponse.json({ ok: true, tenantId: tenant.id, property, interest, notified: !!(notify && notify.ok), isNew: !previous }));
    }



    if (route === '/interesse/lookup' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const email = decodeMagicEmail(searchParams.get('e'));
      if (!email || !verifyInterestToken(email, searchParams.get('t'))) {
        return cors(NextResponse.json({ ok: false, error: 'Ugyldig eller utløpt lenke' }, { status: 401 }));
      }
      const contact = await findNlContact(db, email);
      const name = (contact && contact.name) || '';
      const phone = ((contact && contact.phone) || '').replace(/\s+/g, '');
      return cors(NextResponse.json({
        ok: true,
        firstName: name ? name.split(/\s+/)[0] : '',
        name,
        hasPhone: phone.replace(/\D/g, '').length >= 8,
        maskedPhone: phone ? `··· ${phone.slice(-2)}` : '',
      }));
    }

    if (route === '/interesse/confirm' && method === 'POST') {
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const email = decodeMagicEmail(body.e);
      if (!email || !verifyInterestToken(email, body.t)) {
        return cors(NextResponse.json({ ok: false, error: 'Ugyldig eller utløpt lenke' }, { status: 401 }));
      }
      const contact = await findNlContact(db, email);
      const phoneIn = String(body.phone || '').trim();
      const phone = (phoneIn || (contact && contact.phone) || '').toString().slice(0, 60);
      if (phone.replace(/\D/g, '').length < 8) {
        return cors(NextResponse.json({ ok: false, needPhone: true, error: 'Vi mangler telefonnummer — fyll inn så ringer vi deg' }, { status: 400 }));
      }
      const name = ((contact && contact.name) || String(body.name || '')).toString().slice(0, 200).trim();
      const campaign = String(body.campaign || '').slice(0, 80);
      const leadBody = {
        name, email, phone,
        address: (contact && contact.address) || '',
        lead_type: 'huseier',
        rental_model: 'langtid',
        source: 'nyhetsbrev-ettklikk',
        notes: `Ettklikks-bekreftelse fra nyhetsbrev${campaign ? ` (kampanje: ${campaign})` : ''} — kontaktdata hentet automatisk fra mottakerregisteret.`,
        nl_campaign: body.nl_campaign || undefined,
        nl_rid: body.nl_rid || undefined,
        attribution: body.attribution || undefined,
      };
      try {
        // Gjenbruk hele lead-løypa (dedupe, klassifisering, CRM-videresending)
        const base = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const r = await fetch(`${base}/api/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
          body: JSON.stringify(leadBody),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false) {
          return cors(NextResponse.json({ ok: false, error: 'Kunne ikke registrere — prøv skjemaet' }, { status: 502 }));
        }
        return cors(NextResponse.json({ ok: true, firstName: name ? name.split(/\s+/)[0] : '', leadId: j?.data?.id || null, reEngaged: j?.reEngaged === true }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: 'Kunne ikke registrere — prøv skjemaet' }, { status: 502 }));
      }
    }

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
      // BRO-AVTALE (tråd newsletter, 9. juli): hver påmelding pushes til
      // plattformens CRM-mottak POST /api/newsletters/subscribe (X-API-Key).
      // Best-effort m/kort timeout — påmeldingen hos oss feiler ALDRI pga.
      // plattform-nedetid; synk-status lagres på abonnenten for re-push.
      try {
        const target = digiHomeTarget();
        if (target.url && target.key) {
          const pr = await fetch(`${target.url.replace(/\/$/, '')}/api/newsletters/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': target.key },
            signal: AbortSignal.timeout(5000),
            body: JSON.stringify({
              email,
              name: name || undefined,
              consent: true,
              consent_text: 'Jeg vil motta nyhetsbrev og markedsoppdateringer fra DigiHome (samtykke gitt via skjema på digihome.no)',
              source_system: 'digihome-marketing',
              lead_type: 'nyhetsbrev',
              source,
              subscribed_at: now,
            }),
          });
          await db.collection('newsletter_subscribers').updateOne({ email }, { $set: {
            platform_synced: pr.ok, platform_sync_at: new Date().toISOString(),
            platform_sync_error: pr.ok ? null : `HTTP ${pr.status}`,
          } });
        }
      } catch (e) {
        try { await db.collection('newsletter_subscribers').updateOne({ email }, { $set: { platform_synced: false, platform_sync_error: e.message } }); } catch (e2) {}
      }
      return cors(NextResponse.json({ ok: true }));
    }

    // ── Priskalkulator: produktkatalog ─────────────────────────────────────
    // Offentlig lesing (wizard på /priskalkulator) + admin-skriving.
    // Én kilde til sannhet i settings-collection — byttes til plattformens
    // katalog-API når de bygger fakturering (v2).
    if (route === '/wizard/catalog' && method === 'GET') {
      const doc = await db.collection('settings').findOne({ key: 'wizard_catalog' });
      // normalizeCatalog nuller minsteprisen på selvforvaltning, også når en
      // gammel overstyring i settings fortsatt har minMonthly: 500.
      const catalog = normalizeCatalog((doc && doc.value) || WIZARD_CATALOG_DEFAULT);
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
      // Etterfyll bydel før listing — grupperingen i nyhetsbrevet er avhengig av
      // den, og plattformen sender den ikke. Idempotent og rører ikke boliger
      // som alt har bydel fra plattformen.
      const districtFill = await backfillPropertyDistricts(db, { force: new URL(request.url).searchParams.get('refreshDistricts') === '1' });
      const quality = await refreshPropertyQuality(db);
      const [properties, meta] = await Promise.all([listAdminProperties(db), getPropertiesSyncMeta(db)]);
      const visibleCount = properties.filter((p) => p.visible).length;
      const districtCount = properties.filter((p) => p.district).length;
      const incompleteCount = properties.filter((p) => p.incomplete).length;
      const duplicateCount = properties.filter((p) => p.duplicate).length;
      return cors(NextResponse.json({ ok: true, properties, total: properties.length, visibleCount, districtCount, incompleteCount, duplicateCount, districtFill, quality, meta: meta ? { lastSyncAt: meta.lastSyncAt || null, lastError: meta.lastError || null, platformTotal: meta.platformTotal ?? null } : null }));
    }

    // Admin: manuell synk fra plattformen. ?env=prod henter ekte boliger (nødvendig
    // i preview, der plattform-URLen ellers peker på appen selv og gir 404).
    if (route === '/admin/properties/sync' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const target = financeSyncTarget(request);
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

    // Admin: koble en FINN-annonse til en bolig, og hent inn bilder, pris, areal
    // og postnummer derfra. Bakgrunn: plattformeksporten har images: [] på 14 av
    // 27 boliger — blant dem fire LEDIGE med prisintervall. Et boligkort uten
    // bilde kan ikke sendes i et nyhetsbrev, så disse boligene var utilgjengelige
    // for markedsføring. Utleieren har som regel en FINN-annonse; den bruker vi
    // som midlertidig kilde til plattformen sender bildene (bestilt i bro-tråd
    // homepage-properties, melding 2/2). Skriver ALDRI til plattformen.
    // Body: { id, url } — tom url fjerner koblingen og all berikelse.
    if (route === '/admin/properties/finn' && (method === 'POST' || method === 'PUT')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const pid = String(body.id || '').trim();
      const finnUrlIn = String(body.url || '').trim();
      if (!pid) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      if (!finnUrlIn) {
        const cleared = await setPropertyEnrichment(db, { id: pid, enrich: null });
        if (cleared.ok) await refreshPropertyQuality(db);
        return cors(NextResponse.json({ ...cleared, removed: true }, { status: cleared.ok ? 200 : 404 }));
      }
      if (!isFinnUrl(finnUrlIn)) return cors(NextResponse.json({ ok: false, error: 'Ikke en gyldig finn.no-lenke' }, { status: 400 }));
      const finn = await fetchFinnPreview(finnUrlIn);
      if (!finn || !finn.ok) {
        return cors(NextResponse.json({
          ok: false,
          finnStatus: 'utgatt',
          error: 'Fant ikke annonsen på FINN. Den kan være utgått, fjernet eller midlertidig utilgjengelig.',
          detail: (finn && finn.error) || null,
        }));
      }
      const finnImages = (Array.isArray(finn.gallery) ? finn.gallery : []).filter((u) => /^https:\/\//i.test(u)).slice(0, 12);
      const finnRent = Number(String(finn.rent || '').replace(/\D/g, '')) || 0;
      const enrich = {
        source: 'finn',
        finnUrl: finn.finnUrl,
        finnCode: finn.finnCode || '',
        finnStatus: 'aktiv',
        finnCheckedAt: new Date().toISOString(),
        finnTitle: String(finn.title || '').slice(0, 200),
        images: finnImages,
        sqm: finn.sqm ? Number(finn.sqm) : null,
        bedrooms: finn.bedrooms !== '' && finn.bedrooms != null ? Number(finn.bedrooms) : null,
        // Postnummer fra FINN gir en sikrere bydel enn gatenavn-oppslag.
        monthlyRentBand: finnRent ? `${finnRent.toLocaleString('nb-NO')} kr/mnd` : null,
        postalCode: finn.postalCode || null,
        district: finn.postalCode ? (postalToDistrict(finn.postalCode) || null) : null,
      };
      const saved = await setPropertyEnrichment(db, { id: pid, enrich });
      if (!saved.ok) return cors(NextResponse.json(saved, { status: 404 }));
      // Lagre også et snapshot av annonsen (tittel + annonsert leie). Tittelen
      // kan brukes i nyhetsbrevet; leien brukes KUN til avvikskontroll mot
      // utleiemodulen — den overstyrer aldri plattformens tall.
      try {
        await setPropertyFinnSnapshot(db, {
          id: pid,
          snap: {
            url: finn.finnUrl,
            title: cleanFinnTitle(finn.title),
            rentAmount: finnRent || null,
            imageCount: finnImages.length,
            status: 'aktiv',
          },
        });
      } catch (_) { /* snapshot er en bonus — berikelsen er alt lagret */ }
      await refreshPropertyQuality(db);
      return cors(NextResponse.json({
        ok: true,
        property: saved.property,
        imported: {
          images: finnImages.length,
          sqm: enrich.sqm,
          bedrooms: enrich.bedrooms,
          rent: enrich.monthlyRentBand,
          postalCode: enrich.postalCode,
          district: enrich.district,
          finnTitle: enrich.finnTitle,
          filled: saved.property.enrichedFields || [],
        },
      }));
    }


    // -----------------------------------------------------------------------
    // Admin: HENT ANNONSEDATA FRA FINN (tittel + annonsert leie) for boliger
    // som allerede har en FINN-lenke — enkeltvis {id} eller for alle {all:true}.
    //
    // Hvorfor: plattformens boligeksport er personvern-trygg og sender derfor en
    // GENERISK tittel («Møblert leilighet · 1 soverom · 52 m²»). Et nyhetsbrev
    // med ti slike kort er uleselig. FINN-annonsen har den ekte annonsetittelen.
    //
    // Grenser vi ikke bryter:
    //  · Kjøres KUN når admin trykker. Aldri automatisk i synken.
    //  · Prisen fra FINN lagres som kontrollsignal, og overstyrer ALDRI
    //    plattformens leie — utleiemodulen er eneste autoritative kilde.
    //  · Skriver aldri noe tilbake til plattformen.
    // -----------------------------------------------------------------------
    if (route === '/admin/properties/finn-snapshot' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const pid = String(body.id || '').trim();
      const all = body.all === true;
      if (!pid && !all) return cors(NextResponse.json({ ok: false, error: 'Mangler id (eller all:true)' }, { status: 400 }));
      const coll = db.collection(PROPERTIES_COLL);
      const raw = pid
        ? await coll.find({ $or: [{ id: pid }, { externalId: pid }] }, { projection: { _id: 0 } }).limit(1).toArray()
        : await coll.find({ stale: { $ne: true } }, { projection: { _id: 0 } }).limit(500).toArray();
      // Bare boliger som FAKTISK har en lenke å hente fra.
      const cap = Math.min(Math.max(Number(body.limit) || 12, 1), 24);
      const targets = raw
        .map((d) => ({ raw: d, p: applyEnrichment(d) }))
        .filter((x) => !!x.p.finnUrl)
        .filter((x) => (all && body.onlyMissing === true ? !x.p.finnTitle : true))
        .slice(0, pid ? 1 : cap);
      if (!targets.length) {
        return cors(NextResponse.json({ ok: false, error: pid ? 'Boligen har ingen FINN-lenke' : 'Ingen boliger med FINN-lenke å hente fra' }, { status: 400 }));
      }
      const results = [];
      // Tre om gangen: FINN svarer på ~1–2 s, og 12 i serie ville tatt for lang tid.
      for (let i = 0; i < targets.length; i += 3) {
        const chunk = targets.slice(i, i + 3);
        // eslint-disable-next-line no-await-in-loop
        await Promise.all(chunk.map(async ({ raw: d, p }) => {
          try {
            const finn = await fetchFinnPreview(p.finnUrl);
            const ok = !!(finn && finn.ok);
            const title = ok ? cleanFinnTitle(finn.title) : '';
            const rentAmount = ok ? (Number(String(finn.rent || '').replace(/\D/g, '')) || null) : null;
            await setPropertyFinnSnapshot(db, {
              id: d.externalId || d.id,
              snap: {
                url: p.finnUrl,
                title,
                rentAmount,
                imageCount: ok ? (finn.gallery || []).length : 0,
                status: ok ? 'aktiv' : 'utgatt',
              },
            });
            results.push({
              id: d.id, externalId: d.externalId, area: p.area || null,
              ok, status: ok ? 'aktiv' : 'utgatt', title: title || null, rentAmount,
              platformRent: p.rentAmount ?? null,
              error: ok ? null : ((finn && finn.error) || 'ikke_funnet'),
            });
          } catch (e) {
            results.push({ id: d.id, externalId: d.externalId, ok: false, status: 'feil', error: 'fetch_failed' });
          }
        }));
      }
      const fresh = await listAdminProperties(db);
      const byId = new Map(fresh.map((p) => [p.id, p]));
      const enriched = results.map((r) => {
        const p = byId.get(r.id);
        const info = p ? rentInfo(p) : null;
        return { ...r, deviationPct: info ? info.deviationPct : null, deviates: info ? info.deviates : false, listingTitle: p ? p.listingTitle : null, listingTitleSource: p ? p.listingTitleSource : null };
      });
      return cors(NextResponse.json({
        ok: true,
        fetched: enriched.length,
        withTitle: enriched.filter((r) => r.title).length,
        expired: enriched.filter((r) => !r.ok).length,
        deviations: enriched.filter((r) => r.deviates).length,
        results: enriched,
        properties: pid ? undefined : fresh,
        property: pid ? byId.get(results[0]?.id) || null : undefined,
      }));
    }

    // Admin: redaksjonell tittel på et boligkort. Tom tittel nullstiller, og
    // hierarkiet (FINN → plattform → avledet) bestemmer igjen.
    // ── REDIGER BOLIGDATA (redaksjonelle overstyringer) ────────────────────
    // Plattformen er autoritativ, men ufullstendig: bare 4 av 13 ledige
    // enheter har pris, og ingen har annonsetekst. Her kan forvalteren fylle
    // hullene selv, sporbart og reverserbart per felt.
    //
    // Tom verdi ('' / null / false) NULLSTILLER feltet, slik at plattformens
    // verdi slipper gjennom igjen. resetAll:true fjerner alle overstyringer.
    // -----------------------------------------------------------------------
    if (route === '/admin/properties/fields' && (method === 'PUT' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const pid = String(body.id || '').trim();
      if (!pid) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const saved = await setPropertyEditorialFields(db, {
        id: pid,
        fields: body.fields || {},
        resetAll: body.resetAll === true,
      });
      if (!saved.ok) {
        const code = saved.error === 'Fant ikke boligen' ? 404 : 400;
        return cors(NextResponse.json(saved, { status: code }));
      }
      const gate = listingGate(saved.property);
      return cors(NextResponse.json({
        ok: true,
        cleared: saved.cleared,
        changed: saved.changed,
        removed: saved.removed,
        property: saved.property,
        // Vi svarer med portstatus, så admin ser umiddelbart om boligen nå kan
        // publiseres — det er hele poenget med å redigere.
        gate,
        publishable: gate.publishable,
        contentReady: gate.contentReady,
      }));
    }

    // Forslag fra FINN UTEN å lagre noe. Admin ser verdiene, velger hva som
    // skal brukes, og lagrer selv. Da er alt vi publiserer DigiHomes egen
    // bekreftede opplysning — ikke et automatisk kopi av en annen parts data.
    if (route === '/admin/properties/finn-suggest' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      let url = String(body.url || '').trim();
      const pid = String(body.id || '').trim();
      let current = null;
      if (pid) {
        const rows = await listAdminProperties(db, { id: pid });
        current = (rows || []).find((p) => p.id === pid || p.externalId === pid) || null;
        if (!url && current) url = String(current.finnUrl || '');
      }
      if (!url) return cors(NextResponse.json({ ok: false, error: 'Mangler FINN-lenke' }, { status: 400 }));
      const prev = await fetchFinnPreview(url);
      if (!prev || !prev.ok) {
        return cors(NextResponse.json({ ok: false, error: prev?.error || 'Kunne ikke hente FINN-annonsen' }, { status: 502 }));
      }
      const suggest = {
        title: prev.title || null,
        description: prev.description || null,
        rentAmount: prev.rent || null,
        sqm: prev.sqm || null,
        bedrooms: prev.bedrooms || null,
        type: prev.propertyType || null,
        area: prev.address ? stripHouseNumber(prev.address) : null,
        district: prev.postalCode ? postalToDistrict(prev.postalCode) : null,
        // FINN skriver datoen som dd.mm.åååå — normaliseres til ISO her, slik
        // at forslaget kan settes rett inn i datofeltet.
        availableFrom: prev.availableFrom ? toIsoDate(prev.availableFrom) : null,
      };
      return cors(NextResponse.json({
        ok: true,
        url,
        finnCode: prev.finnCode || null,
        images: Array.isArray(prev.gallery) ? prev.gallery : [],
        suggest,
        // Hva boligen har i dag, slik at admin ser forskjellen før hun velger.
        current: current ? {
          title: current.listingTitle || null,
          description: current.description || null,
          rentAmount: current.editorialRentAmount || current.rentAmount || null,
          monthlyRentBand: current.monthlyRentBand || null,
          sqm: current.sqm || null,
          bedrooms: current.bedrooms || null,
          type: current.type || null,
          area: current.area || null,
          district: current.district || null,
          imageCount: (current.images || []).length,
          imageSource: current.imageSource || null,
        } : null,
      }));
    }

    if (route === '/admin/properties/title' && (method === 'PUT' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const pid = String(body.id || '').trim();
      if (!pid) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const saved = await setPropertyEditorialTitle(db, { id: pid, title: body.title });
      if (!saved.ok) return cors(NextResponse.json(saved, { status: 404 }));
      return cors(NextResponse.json({
        ok: true,
        cleared: saved.cleared,
        property: saved.property,
        candidates: titleCandidates(saved.property),
      }));
    }

    // -----------------------------------------------------------------------
    // OFFENTLIG BOLIGFLATE for /ledige-boliger.
    // Returnerer bare boliger som er publiseringsklare OG satt synlige.
    // Publiseringsporten er strengere enn den generelle boligfeeden:
    //  · bilder KUN fra utleiemodulen (FINN-bilder har vi ikke rettigheter til
    //    å publisere på egen kommersiell nettside),
    //  · pris KUN fra plattformen (en FINN-pris blir aldri vår).
    // ?preview=1 + adminnøkkel legger på upubliserte kandidater og en
    // klarhetsrapport — brukes av forhåndsvisningen i adminportalen.
    // -----------------------------------------------------------------------
    if (route === '/public/listings' && method === 'GET') {
      const url = new URL(request.url);
      const wantPreview = url.searchParams.get('preview') === '1';
      const isAdmin = wantPreview && adminAuthed(request);
      const all = await listAdminProperties(db);
      const listings = all.filter((p) => listingGate(p).publishable).map(toListingCard);
      const payload = { ok: true, listings, total: listings.length };
      if (wantPreview && !isAdmin) {
        return cors(NextResponse.json({ ok: false, error: 'Uautorisert — logg inn i adminportalen' }, { status: 401 }));
      }
      if (isAdmin) {
        const rd = publishReadiness(all);
        payload.candidates = rd.ready.map((r) => toListingDetail(all.find((p) => p.id === r.id)));
        payload.readiness = {
          total: rd.total,
          published: rd.published.length,
          ready: rd.ready.map((r) => ({ id: r.id, title: r.title, area: r.area })),
          almost: rd.almost.map((r) => ({ id: r.id, title: r.title, area: r.area, blocking: r.gate.blocking, platformBlockers: r.platformBlockers })),
        };
      }
      return cors(NextResponse.json(payload));
    }

    // ── BOLIGVARSEL (offentlig) ────────────────────────────────────────────
    // Publiseringsporten er streng, så /ledige-boliger er ofte tynn eller tom.
    // I stedet for å kaste bort trafikken fanger vi kriteriene til boligsøkeren.
    //
    // TO STEG: skjemaet sender først bare e-post (lav terskel), og deretter
    // kriteriene på samme e-post. Derfor er dette en UPSERT på e-post — samme
    // person skal aldri bli to varsler.
    //
    // Vi sender ALDRI e-post herfra. Et boligvarsel er ikke et hastelead, og
    // forvalteren ser etterspørselen i adminportalen. Det holder også flyten
    // fri for irreversible sideeffekter.
    // -----------------------------------------------------------------------
    if (route === '/housing-alerts' && method === 'POST') {
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const norm = normalizeAlert(body);
      if (norm.error) return cors(NextResponse.json({ ok: false, error: norm.error }, { status: 400 }));

      const now = new Date().toISOString();
      const { email, source, ...rest } = norm;
      const existing = await db.collection(ALERTS_COLL).findOne({ email }, { projection: { _id: 0, id: 1 } });
      await db.collection(ALERTS_COLL).updateOne(
        { email },
        {
          $setOnInsert: { id: uuidv4(), email, created_at: now, source },
          $set: { ...rest, updated_at: now, status: 'active', consent: true, consent_text: ALERT_CONSENT_TEXT },
        },
        { upsert: true },
      );

      // Varselet leveres via nyhetsbrevlisten — samme opt-in-kanal som
      // tom-tilstanden brukte før, så samtykkeomfanget er uendret.
      try {
        await db.collection('newsletter_subscribers').updateOne(
          { email },
          {
            $setOnInsert: { id: uuidv4(), email, created_at: now, source: `boligvarsel:${source}` },
            $set: { updated_at: now, consent: true, ...(rest.name ? { name: rest.name } : {}) },
          },
          { upsert: true },
        );
        await db.collection(OPTOUT_COLL).deleteOne({ email });
      } catch (e) {}

      // Vi lover aldri mer enn vi har: vi teller bare PUBLISERTE boliger.
      let matches = 0;
      try {
        const all = await listAdminProperties(db);
        matches = all.filter((p) => listingGate(p).publishable).map(toListingCard)
          .filter((c) => alertMatches(norm, c)).length;
      } catch (e) {}

      const hasCriteria = !!(norm.districts.length || norm.bedroomsMin || norm.maxRent || norm.moveIn);
      return cors(NextResponse.json({
        ok: true,
        isNew: !existing,
        matches,
        summary: hasCriteria ? alertSummaryText(norm) : null,
      }));
    }

    // ── ADMIN: etterspørsel ────────────────────────────────────────────────
    // Kobler boligvarslene mot de LEDIGE boligene, også de som ikke kan
    // publiseres. Svarer på «hvilken bolig skal jeg fikse først?» med et tall
    // i stedet for en magefølelse.
    // -----------------------------------------------------------------------
    if (route === '/admin/housing-alerts' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      const raw = await db.collection(ALERTS_COLL).find({}, { projection: { _id: 0 } }).sort({ created_at: -1 }).limit(1000).toArray();
      const all = await listAdminProperties(db);
      const rd = publishReadiness(all);
      const stateById = new Map();
      for (const r of rd.almost) stateById.set(r.id, { state: 'mangler', gate: r.gate });
      for (const r of rd.ready) stateById.set(r.id, { state: 'klar', gate: r.gate });
      for (const r of rd.published) stateById.set(r.id, { state: 'publisert', gate: r.gate });

      const vacant = all.filter((p) => stateById.has(p.id));
      const demand = summarizeDemand(raw, vacant);
      const countById = new Map((demand.perProperty || []).map((x) => [x.id, x.matches]));
      delete demand.perProperty;

      const properties = vacant.map((p) => {
        const st = stateById.get(p.id) || {};
        const codes = ((st.gate && st.gate.blocking) || []).filter((c) => c !== 'skjult' && c !== 'ikke_ledig');
        return {
          id: p.id,
          area: p.area || null,
          title: p.listingTitle || p.title || 'Bolig',
          district: p.district || null,
          bedrooms: p.bedrooms || null,
          rentBand: p.monthlyRentBand || null,
          state: st.state || 'mangler',
          missing: codes,
          missingLabels: codes.map((c) => (GATE[c] && GATE[c].label) || c),
          fix: codes.length ? ((GATE[codes[0]] && GATE[codes[0]].fix) || null) : null,
          matches: countById.get(p.id) || 0,
        };
      }).sort((a, b) => b.matches - a.matches || a.missing.length - b.missing.length);

      return cors(NextResponse.json({ ok: true, alerts: raw.map(toAdminAlert), demand, properties }));
    }

    // Admin: slett et boligvarsel (avmelding på forespørsel + QA-opprydding).
    if (route === '/admin/housing-alerts' && method === 'DELETE') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ ok: false, error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const id = (sp.get('id') || '').trim();
      const email = haNormEmail(sp.get('email'));
      if (!id && !email) return cors(NextResponse.json({ ok: false, error: 'Mangler id eller email' }, { status: 400 }));
      const query = id ? { id } : { email };
      const doc = await db.collection(ALERTS_COLL).findOne(query, { projection: { _id: 0, email: 1 } });
      const del = await db.collection(ALERTS_COLL).deleteOne(query);
      // Abonnenten fjernes BARE hvis den ble opprettet av boligvarselet — en
      // som meldte seg på nyhetsbrevet selv skal ikke miste det.
      let deletedSubscriber = 0;
      if (doc && doc.email) {
        try {
          const sub = await db.collection('newsletter_subscribers').findOne({ email: doc.email }, { projection: { _id: 0, source: 1 } });
          if (sub && String(sub.source || '').startsWith('boligvarsel')) {
            const r2 = await db.collection('newsletter_subscribers').deleteOne({ email: doc.email });
            deletedSubscriber = r2.deletedCount || 0;
          }
        } catch (e) {}
      }
      return cors(NextResponse.json({ ok: true, deleted: del.deletedCount || 0, deletedSubscriber }));
    }

    // Admin: forhåndsvis lead-e-poster i nettleser (uten å sende noe).
    // ?type=receipt|notify — valgfritt ?id=<lead-id> for ekte data, ellers eksempel.
    if (route === '/admin/leads/email-preview' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const type = (sp.get('type') || 'receipt').toLowerCase();
      // Forhåndsvis boliginteresse-varselet uten å sende noe. Bruker en ekte
      // ledig bolig når det finnes, ellers et eksempel.
      if (type === 'property_interest' || type === 'boliginteresse') {
        const p = await db.collection('platform_properties').findOne(
          { status: 'active', stale: { $ne: true }, incomplete: { $ne: true }, duplicate: { $ne: true } },
          { projection: { _id: 0, externalId: 1, id: 1, title: 1, district: 1, area: 1, city: 1, type: 1, bedrooms: 1, sqm: 1, monthlyRentBand: 1, availableFrom: 1 } },
        );
        const property = p || { externalId: 'demo', title: 'Møblert leilighet · 2 soverom · 65 m²', district: 'Bergen sentrum', type: 'leilighet', bedrooms: 2, sqm: 65, monthlyRentBand: '16 000 kr/mnd', availableFrom: '2026-09-01' };
        const tenant = { name: 'Kari Eksempel', email: 'kari@example.com', phone: '+47 912 34 567', property_interests: [{ propertyId: property.externalId }, { propertyId: 'annen-bolig' }] };
        const built = buildPropertyInterestNotification(tenant, property, { campaignTitle: 'Ledige boliger i Bergen', tenantCreated: true });
        return new NextResponse(built.html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Preview-Subject': encodeURIComponent(built.subject) } });
      }
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
      // Lesetilgang for rollen 'eier' og kontoer med modulen 'nokkeltall'
      if (!innsynAuthed(request) && !(await modulAuthed(request, db, 'nokkeltall'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const settings = await getKpiSettings(db);
      return cors(NextResponse.json({ ok: true, settings }));
    }
    if (route === '/admin/kpi/settings' && (method === 'PUT' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const settings = await setKpiSettings(db, body);
      return cors(NextResponse.json({ ok: true, settings }));
    }
    // Drill-down: hvilke KUNDER og ENHETER ligger bak et nøkkeltall.
    // Admin-only. Returnerer aldri mer enn det innlogget admin allerede ser.
    if (route === '/admin/kpi/drill' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const metric = (sp.get('metric') || '').trim();
      if (!metric) return cors(NextResponse.json({ error: 'metric mangler', metrics: DRILL_METRICS }, { status: 400 }));
      if (!DRILL_METRICS.includes(metric)) return cors(NextResponse.json({ error: `Ukjent nøkkeltall: ${metric}`, metrics: DRILL_METRICS }, { status: 400 }));
      const from = (sp.get('from') || '').trim();
      const to = (sp.get('to') || '').trim();
      const days = Number(sp.get('days')) || 90;
      try {
        const out = await buildKpiDrill(db, { metric, days, from: from || undefined, to: to || undefined });
        if (!out?.ok) return cors(NextResponse.json({ error: out?.error || 'Kunne ikke bygge drill-down' }, { status: 400 }));
        return cors(NextResponse.json(out));
      } catch (e) {
        console.error('[kpi/drill]', e);
        return cors(NextResponse.json({ error: 'Kunne ikke bygge drill-down', detail: String(e?.message || e) }, { status: 500 }));
      }
    }

    if (route === '/admin/kpi' && method === 'GET') {
      // Nøkkeltall: LESES av 'eier' (innsyn) og kontoer med modulen 'nokkeltall'
      if (!innsynAuthed(request) && !(await modulAuthed(request, db, 'nokkeltall'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      const from = (sp.get('from') || '').trim();
      const to = (sp.get('to') || '').trim();
      const days = Number(sp.get('days')) || 30;
      // Auto-synk kontrakter + kunder fra plattformen før beregning, så
      // inntektsmodellen (Faktisk/Kontrahert/Potensial MRR og LTV) alltid
      // bygger på ferske kontraktsdata. Throttlet til hvert 15. minutt.
      try {
        await maybeAutoSyncFinance(db, digiHomeTarget, {
          wait: true,
          force: ['1', 'true'].includes(String(sp.get('sync') || '').toLowerCase()),
        });
      } catch (e) { /* aldri blokker dashbordet */ }
      try {
        const data = await computeKpiDashboard(db, from && to ? { from, to } : { days });
        let financeSync = null;
        try {
          const fm = await getFinanceSyncMeta(db);
          financeSync = fm ? { lastSyncAt: fm.lastSyncAt || null, lastAttemptAt: fm.lastAttemptAt || null, lastError: fm.lastError || null, counts: fm.lastCounts || null } : null;
        } catch (e2) { financeSync = null; }
        return cors(NextResponse.json({ ...data, financeSync }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // Detaljert inntektsmodell: FAKTISK / KONTRAHERT / POTENSIAL honorar per
    // kontrakt, aktiveringsrate, tid til første leieinntekt og LTV-sensitivitet.
    if (route === '/admin/revenue-model' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      try {
        await maybeAutoSyncFinance(db, digiHomeTarget, { wait: true, force: ['1', 'true'].includes(String(sp.get('sync') || '').toLowerCase()) });
      } catch (e) {}
      try {
        const settings = await getKpiSettings(db);
        const lifetimeMonths = sp.get('lifetimeMonths') ? Number(sp.get('lifetimeMonths')) : (settings.lifetimeMonths || 36);
        const grossMarginPct = sp.get('grossMarginPct') ? Number(sp.get('grossMarginPct')) : settings.grossMarginPct;
        const leaseActualRule = sp.get('rule') || settings.leaseActualRule;
        const model = await computeRevenueModel(db, { lifetimeMonths, grossMarginPct, leaseActualRule });
        const fm = await getFinanceSyncMeta(db);
        return cors(NextResponse.json({ ...model, settings, financeSync: fm ? { lastSyncAt: fm.lastSyncAt || null, lastError: fm.lastError || null, counts: fm.lastCounts || null } : null }));
      } catch (e) {
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
    }

    // ── PROD-FASIT: avstem Nøkkeltall mot plattformens kontrakter ──────────
    // 100 % READ-ONLY. Henter kontraktene rett fra plattformen og kjører dem
    // gjennom SAMME motor som dashbordet, så et avvik alltid er et datagap —
    // aldri en forskjell i beregningsmåte. ?env=prod avstemmer mot produksjon
    // (trygt fra preview: ingenting skrives).
    if (route === '/admin/revenue-reconcile' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const sp = new URL(request.url).searchParams;
      try {
        const settings = await getKpiSettings(db);
        const target = financeSyncTarget(request);
        const result = await reconcileRevenue(db, {
          target: target.url,
          key: target.key,
          env: target.env,
          lifetimeMonths: sp.get('lifetimeMonths') ? Number(sp.get('lifetimeMonths')) : (settings.lifetimeMonths || 36),
          grossMarginPct: sp.get('grossMarginPct') ? Number(sp.get('grossMarginPct')) : settings.grossMarginPct,
          leaseActualRule: sp.get('rule') || settings.leaseActualRule,
          withSpend: !['0', 'false'].includes(String(sp.get('spend') || '').toLowerCase()),
          days: Number(sp.get('days')) || 30,
        });
        const fm = await getFinanceSyncMeta(db);
        return cors(NextResponse.json({
          ...result,
          kpiSettings: settings,
          financeSync: fm ? { lastSyncAt: fm.lastSyncAt || null, lastAttemptAt: fm.lastAttemptAt || null, lastError: fm.lastError || null, counts: fm.lastCounts || null } : null,
        }));
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
      // Økonomi: rollen 'eier' (investor) og modulene 'okonomi'/'kunder' har
      // LESEtilgang (GET); alle skriveoperasjoner (POST/DELETE, inkl. synk)
      // krever admin. Kunder-fanen leser samme datakilde (finance).
      if (!innsynAuthed(request)
        && !(await modulAuthed(request, db, 'okonomi'))
        && !(await modulAuthed(request, db, 'kunder'))) {
        return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      }
      if (method !== 'GET' && !adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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
          const target = financeSyncTarget(request);
          const result = await syncContractsFromPlatform(db, { target: target.url, key: target.key });
          return cors(NextResponse.json({ ...result, platformEnv: target.env, platformUrl: target.url }));
        }
        // Synk KUNDER fra plattformens /api/customers/export (LIVE hos plattformteamet).
        if (sub === '/sync-customers' && method === 'POST') {
          const target = financeSyncTarget(request);
          const result = await syncCustomersFromPlatform(db, { target: target.url, key: target.key });
          return cors(NextResponse.json({ ...result, platformEnv: target.env, platformUrl: target.url }));
        }

        if (sub === '/settings' && method === 'GET') return cors(NextResponse.json({ ok: true, settings: await getFinanceSettings(db) }));
        if (sub === '/settings' && method === 'POST') return cors(NextResponse.json({ ok: true, settings: await setFinanceSettings(db, fbody) }));

        if (sub === '/costs' && method === 'GET') { await migrerFellesKostnader(db).catch(() => {}); return cors(NextResponse.json({ ok: true, costs: await listCosts(db) })); }
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
    // Detalj for ÉN annonse: daglig tidsserie (kostnad/visn/klikk/CTR/CPC/konv.)
    // GET /admin/ads/detail?channel=meta|google&id=<adId>&period=<p>[&refresh=1]
    // Cachet 10 min pr. (kanal, id, periode) i meta_report_cache.
    // ===================================================================
    if (route === '/admin/ads/detail' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const channel = searchParams.get('channel') === 'google' ? 'google' : 'meta';
      const id = String(searchParams.get('id') || '').replace(/\D/g, '');
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler annonse-id' }, { status: 400 }));
      const period = META_PERIODS.includes(searchParams.get('period')) ? searchParams.get('period') : 'last_30d';
      const refresh = ['1', 'true'].includes(String(searchParams.get('refresh')));
      const cacheKey = `ad_daily:${channel}:${id}:${period}`;
      const coll = db.collection('meta_report_cache');
      const existing = await coll.findOne({ key: cacheKey });
      const ageMs = existing ? (Date.now() - new Date(existing.fetchedAt).getTime()) : Infinity;
      if (!refresh && existing && ageMs < 10 * 60 * 1000) {
        return cors(NextResponse.json({ ok: true, channel, id, period, series: existing.series, totals: existing.totals, fetchedAt: existing.fetchedAt, cached: true }));
      }
      try {
        let series;
        if (channel === 'google') {
          if (!googleAdsNativeConfigured()) return cors(NextResponse.json({ ok: false, error: 'Google Ads er ikke konfigurert' }, { status: 400 }));
          const range = metaPeriodToRange(period);
          series = await runAdDaily({ adId: id, since: range.periodFrom, until: range.periodTo });
        } else {
          if (!metaAdsConfigured()) return cors(NextResponse.json({ ok: false, error: 'Meta er ikke konfigurert' }, { status: 400 }));
          series = await fetchMetaAdDaily(id, { datePreset: metaPeriodToPreset(period) });
        }
        const totals = series.reduce((t, d) => ({
          cost: t.cost + (d.cost || 0), impressions: t.impressions + (d.impressions || 0),
          clicks: t.clicks + (d.clicks || 0), conversions: t.conversions + (d.conversions || 0),
          convValue: t.convValue + (d.convValue || 0),
        }), { cost: 0, impressions: 0, clicks: 0, conversions: 0, convValue: 0 });
        totals.cost = Math.round(totals.cost * 100) / 100;
        totals.conversions = Math.round(totals.conversions * 100) / 100;
        totals.convValue = Math.round(totals.convValue * 100) / 100;
        totals.ctr = totals.impressions > 0 ? Math.round((totals.clicks / totals.impressions) * 10000) / 100 : 0;
        totals.cpc = totals.clicks > 0 ? Math.round((totals.cost / totals.clicks) * 100) / 100 : 0;
        const fetchedAt = new Date().toISOString();
        await coll.updateOne({ key: cacheKey }, { $set: { key: cacheKey, series, totals, fetchedAt } }, { upsert: true });
        return cors(NextResponse.json({ ok: true, channel, id, period, series, totals, fetchedAt, cached: false }));
      } catch (e) {
        if (existing) return cors(NextResponse.json({ ok: true, channel, id, period, series: existing.series, totals: existing.totals, fetchedAt: existing.fetchedAt, cached: true, stale: true, error: e.message }));
        return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 }));
      }
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

    // --- Admin: hvem får varslene — og har SendGrid sperret noen? -----------
    // Bygget fordi «bare én person får varslene» ikke kan besvares ved å lese
    // koden: mottakerne kommer fra env (ulik i preview og produksjon), og en
    // adresse på SendGrids bounce-/blokkeringsliste får aldri e-post igjen
    // uansett hva koden gjør. Denne ruten viser begge lag i det miljøet den
    // kjører i.
    if (route === '/admin/notify-status' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try { return cors(NextResponse.json(await notifyStatus())); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 200 })); }
    }

    // Fjern en sperre — bare for adresser som står i våre egne varsellister.
    if (route === '/admin/notify-status/unblock' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const r = await removeSuppression(body.email);
        return cors(NextResponse.json(r, { status: r.ok ? 200 : (r.status || 400) }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: String(e.message || e) }, { status: 200 })); }
    }

    // --- Cron: nye forsøk på boliginteresser sanntidspushen bommet på ---------
    // Sikkerhetsnettet er allerede plattformens 15-minutters pull. Denne sveipen
    // gjør at et kort avbrudd hos dem ikke koster interessenten en kvarter i kø:
    // vi prøver på nytt med økende pause, og gir opp SANNTIDSkanalen — aldri køen.
    if (route === '/cron/interest-webhook-retry' && (method === 'GET' || method === 'POST')) {
      const sp = new URL(request.url).searchParams;
      const token = sp.get('token') || request.headers.get('x-cron-token') || '';
      const cronSecret = (process.env.ADS_CRON_SECRET || '').trim();
      const okAuth = (cronSecret && token === cronSecret) || (ADMIN_KEY && token === ADMIN_KEY) || adminAuthed(request);
      if (!okAuth) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const limit = Number(sp.get('limit') || 25) || 25;
        const results = await retryInterestWebhooks(db, { limit });
        return cors(NextResponse.json(results));
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

    // ===================================================================
    // SEO & AEO — posisjonstracker (SerpApi), AI-synlighet (OpenAI) og
    // teknisk sitemap-revisjon. Kvote-bevisst: SerpApi ~100 søk/mnd deles
    // med konkurrentgalleriet → rank-kjøring viser alltid estimert kost.
    // ===================================================================
    if (route === '/admin/seo/overview' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try { return cors(NextResponse.json(await getSeoOverview(db))); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    if (route === '/admin/seo/config' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try { return cors(NextResponse.json({ ok: true, config: await getSeoConfig(db) })); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    if (route === '/admin/seo/config' && method === 'PUT') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try { return cors(NextResponse.json({ ok: true, config: await saveSeoConfig(db, body) })); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    // --- Google Search Console (ekte Google-data via service-konto) --------
    if (route === '/admin/seo/gsc/status' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try { return cors(NextResponse.json({ ok: true, ...(await gscStatus()) })); }
      catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    if (route === '/admin/seo/gsc/overview' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!gscConfigured()) return cors(NextResponse.json({ ok: false, configured: false, error: 'GSC ikke konfigurert' }, { status: 200 }));
      try {
        const sp = new URL(request.url).searchParams;
        const data = await computeGscOverview(db, { days: sp.get('days') || 28, force: sp.get('force') === '1' });
        return cors(NextResponse.json(data));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    if (route === '/admin/seo/gsc/inspect' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      if (!gscConfigured()) return cors(NextResponse.json({ ok: false, error: 'GSC ikke konfigurert' }, { status: 200 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      try {
        const result = await gscInspectUrl(db, body.url, { force: !!body.force });
        return cors(NextResponse.json({ ok: true, result }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }

    if (route === '/admin/seo/run' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const type = (body.type || '').toString();
      try {
        if (type === 'rank') {
          // dry=true → kun kvote-estimat, INGEN SerpApi-kall (brukes av UI/tester).
          if (body.dry) {
            const cfg = await getSeoConfig(db);
            return cors(NextResponse.json({ ok: true, dry: true, wouldUseSearches: cfg.keywords.length }));
          }
          const result = await runRankCheck(db, { keywords: body.keywords });
          return cors(NextResponse.json(result, { status: result.ok ? 200 : 502 }));
        }
        if (type === 'aeo') {
          const result = await runAeoCheck(db, { questions: body.questions });
          return cors(NextResponse.json(result, { status: result.ok ? 200 : 502 }));
        }
        if (type === 'tech') {
          const result = await runTechAudit(db, { limit: body.limit });
          return cors(NextResponse.json(result, { status: result.ok ? 200 : 502 }));
        }
        return cors(NextResponse.json({ ok: false, error: 'Ukjent type (rank|aeo|tech)' }, { status: 400 }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
    }
    // Ukentlig SEO-cron: kjører alle tre løpene, men self-throttler til maks
    // én gang per 6 døgn (en daglig planlegger kan trygt treffe endepunktet).
    if (route === '/cron/seo-weekly' && (method === 'GET' || method === 'POST')) {
      const sp = new URL(request.url).searchParams;
      const token = sp.get('token') || request.headers.get('x-cron-token') || '';
      const cronSecret = (process.env.ADS_CRON_SECRET || '').trim();
      const okAuth = (cronSecret && token === cronSecret) || (ADMIN_KEY && token === ADMIN_KEY);
      if (!okAuth) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      try {
        const force = sp.get('force') === '1';
        const lastRank = await db.collection(SEO_RANK_COLL).findOne({}, { sort: { checkedAt: -1 }, projection: { checkedAt: 1 } });
        const lastAeo = await db.collection(SEO_AEO_COLL).findOne({}, { sort: { checkedAt: -1 }, projection: { checkedAt: 1 } });
        const lastTech = await db.collection(SEO_TECH_COLL).findOne({}, { sort: { runAt: -1 }, projection: { runAt: 1 } });
        const due = (iso, days) => !iso || Date.now() - new Date(iso).getTime() >= days * 86400000;
        const runRankNow = force || due(lastRank?.checkedAt, 6);
        const runAeoNow = force || due(lastAeo?.checkedAt, 13);
        const runTechNow = force || due(lastTech?.runAt, 6);
        if (!runRankNow && !runAeoNow && !runTechNow) {
          return cors(NextResponse.json({ ok: true, skipped: true, reason: 'Ingen SEO/AEO-løp er forfalt', lastRankAt: lastRank?.checkedAt, lastAeoAt: lastAeo?.checkedAt, lastTechAt: lastTech?.runAt }));
        }
        const rank = runRankNow ? await runRankCheck(db, {}) : { ok: true, skipped: true };
        const aeo = runAeoNow ? await runAeoCheck(db, {}) : { ok: true, skipped: true };
        const tech = runTechNow ? await runTechAudit(db, {}) : { ok: true, skipped: true };
        return cors(NextResponse.json({
          ok: true,
          rank: { ok: rank.ok, skipped: !!rank.skipped, searchesUsed: rank.searchesUsed, error: rank.error || null },
          aeo: { ok: aeo.ok, skipped: !!aeo.skipped, summary: aeo.summary || null, error: aeo.error || null },
          tech: { ok: tech.ok, skipped: !!tech.skipped, avgScore: tech.avgScore ?? null, pageCount: tech.pageCount ?? null, error: tech.error || null },
        }));
      } catch (e) { return cors(NextResponse.json({ ok: false, error: e.message }, { status: 200 })); }
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
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
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

    // --- Admin: pipeline-hastighet (tid i steg, tid til salg, flaskehalser) ---
    if (route === '/admin/analytics/velocity' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '90', 10) || 90));
      const v = await computeVelocity(db, days);
      return cors(NextResponse.json(v));
    }

    // --- Admin: utvikling over tid (CPL/CAC/forbruk/ROAS per uke per kanal).
    // Henter daglige forbruksserier fra annonse-API-ene (cachet, best-effort)
    // og persisterer dem i daily_metrics → varig historikk. ---
    if (route === '/admin/analytics/trends' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const days = Math.min(365, Math.max(14, parseInt(searchParams.get('days') || '84', 10) || 84));
      const adSeries = {};
      try {
        if (composioConfigured()) {
          const r = await getCachedReport(db, 'last_90d', {});
          adSeries.google = (r.report && r.report.series) || [];
        }
      } catch (e) { /* best-effort */ }
      try {
        if (metaAdsConfigured()) {
          const r = await getCachedMetaReport(db, 'last_90d', {});
          adSeries.meta = (r.snap && r.snap.series) || [];
        }
      } catch (e) { /* best-effort */ }
      const t = await computeMarketingTrends(db, { days, adSeries });
      return cors(NextResponse.json(t));
    }

    if (route === '/admin/analytics' && method === 'GET') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      const days = parseInt(searchParams.get('days') || '30', 10) || 30;
      // Betalt trakt: hent klikk/forbruk fra Ads-API-ene (cachet) — best-effort.
      const adStatsTask = (async () => {
        const preset = days <= 7 ? 'last_7d' : days <= 30 ? 'last_30d' : days <= 90 ? 'last_90d' : 'this_year';
        const out = {};
        try {
          if (composioConfigured()) {
            const r = await getCachedReport(db, preset, {});
            const t = (r.report && r.report.totals) || {};
            out.google = { clicks: Number(t.clicks) || 0, spend: Number(t.cost ?? t.spend) || 0 };
          }
        } catch (e) { /* best-effort */ }
        try {
          if (metaAdsConfigured()) {
            const r = await getCachedMetaReport(db, preset, {});
            const t = (r.snap && r.snap.totals) || {};
            out.meta = { clicks: Number(t.linkClicks) || Number(t.clicks) || 0, spend: Number(t.cost ?? t.spend) || 0 };
          }
        } catch (e) { /* best-effort */ }
        try {
          // FINN.no: manuelt registrerte kampanjer (finn_campaigns) — summer forbruk/klikk
          // for kampanjer som overlapper perioden.
          const fromDay = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
          const rows = await db.collection('finn_campaigns').find({}).project({ _id: 0 }).toArray();
          let spend = 0, clicks = 0, any = false;
          for (const c of rows) {
            const end = String(c.endDate || '9999-12-31');
            if (end >= fromDay) { spend += Number(c.spendNok) || 0; clicks += Number(c.clicks) || 0; any = true; }
          }
          if (any) out.finn = { clicks, spend };
        } catch (e) { /* best-effort */ }
        return out;
      })();
      const [traffic, leadsIntel, webVitals, funnels, paid] = await Promise.all([
        computeAnalytics(db, days),
        computeLeadIntel(db, days),
        computeWebVitals(db, days),
        computeFunnels(db, days),
        adStatsTask.then((adStats) => buildPaidFunnel(db, { days, adStats })).catch(() => null),
      ]);
      const anomalies = [
        ...detectAnomalies(traffic.timeseries, 'sessions', 'Økter'),
        ...detectAnomalies(traffic.timeseries, 'leads', 'Leads'),
      ].sort((a, b) => (a.day < b.day ? 1 : -1)).slice(0, 8);
      return cors(NextResponse.json({ traffic, leads: leadsIntel, webVitals, anomalies, funnels, paid }));
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
    // ── DEDUPE-OPPRYDDING (bro-avtale 9. juli, tråd leads-dedupe) ────────────
    // Full-reconcile fra plattformen skapte speil-tvillinger for historiske
    // CRM-leads (external_ref ukjent + formatavvik i telefon/e-post). Senere
    // reconciles BERIKET tvillingene med navn — så kriteriet er ikke «uten navn»,
    // men: speilet lead som deler e-post/telefon med en ELDRE eksisterende lead.
    // Merge: behold originalen (kilde/attribusjon), ta plattformens status +
    // platform_id fra tvillingen (CRM = source of truth), slett tvillingen.
    // dryRun=true (standard) viser kun planen. purgeTest=true sletter foreldre-
    // løse tvillinger med åpenbare test-e-poster (example.com/test-mønstre).
    if (route === '/admin/leads/dedupe-crm' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const apply = body.dryRun === false;
      const purgeTest = body.purgeTest === true;
      const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // KUN utvetydige testdomener — aldri mønstre som kan treffe ekte personer.
      const TEST_RX = /@example\.(com|no)$/i;
      // Kandidater: alle speilede leads (uansett navn — kan være beriket i ettertid).
      const twins = await db.collection('leads').find({ mirrored: true, deleted: { $ne: true } }).limit(1000).toArray();
      const report = [];
      let merged = 0, unmatched = 0, purged = 0;
      for (const twin of twins) {
        const or = [];
        const em = (twin.email || '').toLowerCase().trim();
        const digits = (twin.phone || '').replace(/\D/g, '').slice(-8);
        if (em) or.push({ email: { $regex: `^${escRe(em)}$`, $options: 'i' } });
        if (digits.length === 8) or.push({ phone: { $regex: `${digits.split('').map(escRe).join('\\D*')}\\D*$` } });
        if (!or.length) { unmatched++; report.push({ twin: twin.id, name: twin.name || '', action: 'ingen e-post/telefon å matche på' }); continue; }
        // Original: en ANNEN, ELDRE lead med samme identitet — foretrekk ikke-speilet.
        const cands = (await db.collection('leads').find({ id: { $ne: twin.id }, $or: or }).limit(5).toArray())
          .filter((l) => String(l.createdAt || '') < String(twin.createdAt || '') || (!l.mirrored && twin.mirrored));
        cands.sort((a, b) => ((a.mirrored ? 1 : 0) - (b.mirrored ? 1 : 0)) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
        const orig = cands[0];
        if (!orig) {
          // V2 (fix 10. juli): originalen kan ligge blant HISTORISKE leads
          // (imported_leads fra Historikk-synken) — det var her prod-tvillingene
          // hørte hjemme. Sterkeste nøkkel: platform_id (= plattformens lead_id).
          const pidT = twin.platform_id || twin.id;
          const orImp = [];
          if (pidT) orImp.push({ platform_id: pidT });
          if (em) orImp.push({ email: { $regex: `^${escRe(em)}$`, $options: 'i' } });
          if (digits.length === 8) orImp.push({ phone: { $regex: `${digits.split('').map(escRe).join('\\D*')}\\D*$` } });
          let imp = null;
          if (orImp.length) {
            const impCands = await db.collection('imported_leads').find({ $or: orImp }).limit(5).toArray();
            impCands.sort((a, b) => ((b.platform_id === pidT ? 1 : 0) - (a.platform_id === pidT ? 1 : 0)));
            imp = impCands[0] || null;
          }
          if (imp) {
            if (apply) {
              const setImp = { updated_at: new Date().toISOString() };
              if (!imp.platform_id && pidT) setImp.platform_id = pidT;
              // Plattformen er fasit for status: ta tvillingens (nyeste fra CRM).
              if (twin.status && twin.status !== 'new') setImp.status = twin.status;
              if (twin.wonAt && !imp.won_at) setImp.won_at = twin.wonAt;
              if (twin.wonValue != null && imp.won_value == null) setImp.won_value = twin.wonValue;
              if (twin.disqualifyReason && !imp.disqualify_reason) setImp.disqualify_reason = twin.disqualifyReason;
              if (twin.lostReason && !imp.lost_reason) setImp.lost_reason = twin.lostReason;
              for (const f of ['name', 'email', 'phone', 'address', 'postal_code']) {
                if (twin[f] && !imp[f]) setImp[f] = twin[f];
              }
              const updImp = { $set: setImp };
              // Avvikende manuell status-override ryddes (CRM = fasit); kanal-/
              // verdi-overrides (attribusjon) beholdes urørt.
              if (setImp.status && imp.override && imp.override.status && imp.override.status !== setImp.status) updImp.$unset = { 'override.status': '' };
              await db.collection('imported_leads').updateOne({ id: imp.id }, updImp);
              await db.collection('leads').deleteOne({ id: twin.id });
            }
            merged++;
            report.push({
              twin: twin.id, email: em, mergedInto: imp.id, origName: imp.name || '',
              matchedBy: imp.platform_id === pidT ? 'platform_id' : (em && (imp.email || '').toLowerCase() === em ? 'email' : 'phone'),
              historic: true,
              statusApplied: (twin.status && twin.status !== 'new') ? twin.status : null,
              applied: apply,
            });
            continue;
          }
          // Foreldreløs tvilling: legit organisk CRM-lead (FINN/telefon) — beholdes.
          // Unntak: åpenbar test-data kan slettes med purgeTest=true.
          if (purgeTest && TEST_RX.test(em)) {
            if (apply) await db.collection('leads').deleteOne({ id: twin.id });
            purged++;
            report.push({ twin: twin.id, email: em, action: 'test-data — slettet' + (apply ? '' : ' (plan)'), applied: apply });
          } else {
            unmatched++;
            report.push({ twin: twin.id, email: em, name: twin.name || '', action: 'foreldreløs — beholdes (legit organisk CRM-lead eller ukjent)' });
          }
          continue;
        }
        const matchedBy = em && (orig.email || '').toLowerCase() === em ? 'email' : 'phone';
        if (apply) {
          const set = {
            // Tvillingens platform_id er den plattformen bruker NÅ → overskriv.
            platform_id: twin.platform_id || twin.id,
            syncedFromPlatform: true,
            platformSyncAt: new Date().toISOString(),
          };
          // Plattformen er source of truth for status: ta tvillingens (nyeste).
          if (twin.status && twin.status !== 'new') {
            set.status = twin.status;
            set.statusUpdatedAt = twin.statusUpdatedAt || new Date().toISOString();
          }
          const hist = [...(orig.statusHistory || []), ...(twin.statusHistory || [])]
            .sort((a, b) => String(a.at || '').localeCompare(String(b.at || ''))).slice(-30);
          if (hist.length) set.statusHistory = hist;
          // Status-relaterte felter fra tvillingen har forrang (nyest fra CRM);
          // øvrige felter fylles kun der originalen mangler.
          for (const f of ['lostReason', 'lostAt', 'disqualifyReason', 'disqualifiedAt', 'funnelStage', 'platformTenant', 'platformCustomerId', 'activationStage']) {
            if (twin[f] != null) set[f] = twin[f];
          }
          for (const f of ['wonAt', 'wonValue', 'wonValueActual', 'wonValueEstimate', 'wonCurrency', 'name', 'email', 'phone', 'address', 'postal_code']) {
            if (twin[f] != null && twin[f] !== '' && (orig[f] == null || orig[f] === '')) set[f] = twin[f];
          }
          await db.collection('leads').updateOne({ id: orig.id }, { $set: set });
          await db.collection('leads').deleteOne({ id: twin.id });
        }
        merged++;
        report.push({ twin: twin.id, email: em, mergedInto: orig.id, origName: orig.name || '', matchedBy, statusApplied: (twin.status && twin.status !== 'new') ? twin.status : null, applied: apply });
      }
      return cors(NextResponse.json({ ok: true, dryRun: !apply, twinsFound: twins.length, merged, unmatched, purged, report }));
    }

    if (route === '/admin/lead-status' && method === 'POST') {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {};
      try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      const status = (body.status || '').toString();
      const coll = body.type === 'tenant' ? 'tenant_leads' : 'leads';
      // Full CRM-pipeline — speiler stegene i plattformen (befaring/tilbud inngår
      // i toveis-synken begge veier). 'disqualified' = ikke relevant (egen bøtte,
      // holdes utenfor vinnrate/tapt-KPI-er — bro-avtale 9. juli).
      const VALID = ['new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost', 'disqualified'];
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

      // TOVEIS SYNK: manuell statusendring i VÅR admin → skriv tilbake til
      // CRM-et via utboksen (samme robuste mekanisme som Historikk-fanen:
      // retry ved nedetid, idempotens, siste-vinner-merge per lead).
      // Løkke-sikkert: statusendringer som kommer FRA plattformen (webhook)
      // rører aldri utboksen — kun denne manuelle admin-ruten gjør det.
      let crmSync = null;
      try {
        const pid = existing.platform_id || (existing.mirrored ? existing.id : null);
        if (pid) {
          await queueLeadPushback(db, {
            platform_id: pid,
            // Utgående vokabular-oversettelse: vår «offer»-kolonne heter
            // «proposal» hos plattformen (bro-avtale 9. juli).
            status: ({ offer: 'proposal' })[status] || status,
            won_value: update.wonValue !== undefined ? update.wonValue : undefined,
            origin: 'lead-status',
          });
          const target = digiHomeTarget();
          if (target.url) crmSync = await flushLeadPushbacks(db, { target: target.url, key: target.key });
          else crmSync = { ok: false, skipped: 'plattform-URL ikke konfigurert' };
        } else {
          crmSync = { ok: false, skipped: 'ingen platform_id — leaden er ikke videresendt til CRM ennå (synces automatisk når forward lykkes)' };
        }
      } catch (e) { crmSync = { ok: false, error: e.message }; }

      // Lukket sløyfe: Meta CAPI Purchase + Google Ads offline-konvertering + GA4.
      // Én felles modul (lib/closed-loop.js) brukes både her og fra
      // plattform-webhooken, slik at de to veiene ikke kan komme i utakt.
      // Idempotent (event_id/transaction_id = lead-id) og logger alltid årsak
      // når et signal hoppes over.
      let conversions = null;
      if (status === 'won') {
        conversions = await recordWonConversions({
          db, coll, lead: { ...existing, id }, update, nowIso, allowAdConversions: true,
        });
      }

      return cors(NextResponse.json({ ok: true, id, status, crmSync, conversions }));
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
      const VALID = ['new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost', 'disqualified'];
      // To-nivå-modellen: plattformen kan sende `event` i stedet for `status`.
      // avtale_signert (selvbetjent klikk-aksept) / tilbud_akseptert → won,
      // tilbud_avslatt → lost. eiendom_onboardet / leie_aktiv er aktiverings-
      // milepæler UTEN statusendring (leaden er allerede vunnet).
      const evt = (body.event || '').toString().toLowerCase().trim();
      const EVT_TO_STATUS = { avtale_signert: 'won', tilbud_akseptert: 'won', tilbud_avslatt: 'lost' };
      const ACTIVATION_EVENTS = ['eiendom_onboardet', 'leie_aktiv'];
      const isActivationOnly = ACTIVATION_EVENTS.includes(evt) && !body.status;
      // SLETTE-SYNK (10/7): lead_deleted fra plattformen → vi soft-sletter vårt
      // speil (deleted:true, spor beholdes, ut av pipeline/KPI-er). Idempotent.
      const isDeleteEvent = ['lead_deleted', 'lead_archived', 'deleted', 'slettet'].includes(evt) && !body.status;
      const raw = (body.status || EVT_TO_STATUS[evt] || '').toString().toLowerCase().trim();
      // Mid-trakt-granularitet (bro-avtale 9. juli): viewing (befaring) og
      // proposal (tilbud sendt) er nå FULLVERDIGE statuser hos oss — mappes til
      // våre interne kolonner 'viewing'/'offer' i stedet for å kollapses til
      // qualified. Gamle aliaser (viewing_booked/contract_sent) oppgraderes likt.
      const midFunnelStage = ['viewing_booked', 'contract_sent'].includes(raw) ? raw : null;
      const map = {
        ny: 'new', open: 'new', åpen: 'new', kontaktet: 'contacted', contacted: 'contacted',
        kvalifisert: 'qualified', qualified: 'qualified', vunnet: 'won', won: 'won', signed: 'won',
        signert: 'won', closed_won: 'won', tapt: 'lost', lost: 'lost', closed_lost: 'lost', avvist: 'lost',
        viewing: 'viewing', befaring: 'viewing', viewing_booked: 'viewing',
        proposal: 'offer', offer: 'offer', tilbud_sendt: 'offer', contract_sent: 'offer',
        disqualified: 'disqualified', not_relevant: 'disqualified', irrelevant: 'disqualified', ikke_relevant: 'disqualified', diskvalifisert: 'disqualified',
      };
      const status = VALID.includes(raw) ? raw : (map[raw] || '');
      if (!status && !isActivationOnly && !isDeleteEvent) return cors(NextResponse.json({ ok: false, error: 'Ugyldig status', got: raw || evt }, { status: 400 }));

      const externalRef = (body.external_ref || body.externalRef || '').toString();
      const platformId = (body.platform_id || body.platformId || '').toString();
      const email = (body.email || '').toString().toLowerCase().trim();
      const phoneDigits = (body.phone || '').toString().replace(/\D/g, '');
      const last8 = phoneDigits.slice(-8);
      // NYE FELTER (bro-avtale 9. juli): plattformen sender nå ALLE leads
      // (også organiske). is_paid styrer om annonse-konverteringer skal fyres.
      const bodyIsPaid = body.is_paid === true ? true : (body.is_paid === false ? false : null);
      const bodySourceType = (body.lead_source_type || '').toString().toLowerCase().trim() || null;

      // Match: external_ref (vår id) → platform_id → e-post → telefon (siste 8 siffer),
      // på tvers av begge kolleksjoner. Dedupe-herding (bro-avtale 9. juli):
      // e-post matches case-UavhengIG og telefon tolererer mellomrom/+47/bindestrek
      // i det LAGREDE feltet («926 04 070» ≡ «92604070») — det var formatavvik her
      // som gjorde at full-reconcile bommet på historiske leads og skapte tvillinger.
      const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const phoneTolerantRe = last8.length === 8 ? `${last8.split('').map(escRe).join('\\D*')}\\D*$` : null;
      let coll = null, lead = null, matchedBy = '';
      for (const c of ['leads', 'tenant_leads']) {
        const or = [];
        if (externalRef) or.push({ id: externalRef });
        if (platformId) or.push({ platform_id: platformId });
        if (externalRef) or.push({ platform_id: externalRef });
        if (email) or.push({ email: { $regex: `^${escRe(email)}$`, $options: 'i' } });
        if (phoneTolerantRe) or.push({ phone: { $regex: phoneTolerantRe } });
        if (!or.length) break;
        // Foretrekk rike poster (med navn) over bare speil-tvillinger ved flere treff.
        const candidates = await db.collection(c).find({ $or: or }).limit(5).toArray();
        if (candidates.length) {
          const score = (l) =>
            (externalRef && l.id === externalRef ? 8 : 0) +
            ((platformId && l.platform_id === platformId) || (externalRef && l.platform_id === externalRef) ? 4 : 0) +
            (l.name ? 2 : 0) + (l.mirrored ? 0 : 1);
          candidates.sort((a, b) => score(b) - score(a));
          const found = candidates[0];
          coll = c; lead = found;
          matchedBy = (externalRef && found.id === externalRef) ? 'external_ref'
            : (found.platform_id && (found.platform_id === platformId || found.platform_id === externalRef)) ? 'platform_id'
            : (email && (found.email || '').toLowerCase() === email) ? 'email' : 'phone';
          break;
        }
      }
      // HISTORISKE LEADS (fix 10. juli): originalene fra Historikk-synken ligger
      // i imported_leads — match der FØR vi oppretter speil-tvilling. Dette var
      // rotårsaken til at full-reconcile skapte duplikater av historiske leads
      // på prod (webhooken så bare i leads/tenant_leads). Sterkeste nøkkel
      // først: platform_id (= plattformens lead_id), så e-post/telefon.
      if (!lead) {
        const orImp = [];
        if (externalRef) orImp.push({ platform_id: externalRef });
        if (platformId) orImp.push({ platform_id: platformId });
        if (externalRef) orImp.push({ id: externalRef });
        if (email) orImp.push({ email: { $regex: `^${escRe(email)}$`, $options: 'i' } });
        if (phoneTolerantRe) orImp.push({ phone: { $regex: phoneTolerantRe } });
        if (orImp.length) {
          const impCands = await db.collection('imported_leads').find({ $or: orImp }).limit(5).toArray();
          if (impCands.length) {
            const pidWanted = platformId || externalRef;
            impCands.sort((a, b) =>
              (((b.platform_id && b.platform_id === pidWanted) || b.id === externalRef ? 1 : 0) -
               ((a.platform_id && a.platform_id === pidWanted) || a.id === externalRef ? 1 : 0)));
            const imp = impCands[0];
            const nowIsoImp = new Date().toISOString();
            const changedAtImp = body.changed_at ? new Date(body.changed_at).toISOString() : nowIsoImp;
            if (isActivationOnly) {
              await db.collection('imported_leads').updateOne({ id: imp.id }, { $set: { activation_stage: evt, updated_at: nowIsoImp, platform_sync_at: nowIsoImp } });
              return cors(NextResponse.json({ ok: true, id: imp.id, matchedBy: 'imported', historic: true, event: evt }));
            }
            // Slette-synk: plattformen slettet en historisk lead → soft delete her.
            if (isDeleteEvent) {
              await db.collection('imported_leads').updateOne({ id: imp.id }, { $set: {
                deleted: true, deletedAt: body.deleted_at ? new Date(body.deleted_at).toISOString() : nowIsoImp,
                deleteReason: `crm: ${(body.reason || 'slettet i CRM-et').toString()}`.slice(0, 200),
                deletedBy: 'platform', platform_sync_at: nowIsoImp,
              } });
              return cors(NextResponse.json({ ok: true, id: imp.id, matchedBy: 'imported', historic: true, deleted: true }));
            }
            const setImp = { status, updated_at: nowIsoImp, platform_sync_at: nowIsoImp };
            if (!imp.platform_id && pidWanted) setImp.platform_id = pidWanted;
            if (status === 'won') {
              if (!imp.won_at) setImp.won_at = changedAtImp;
              const vImp = Number(body.value);
              if (isFinite(vImp) && vImp > 0 && imp.won_value == null) setImp.won_value = Math.round(vImp * 100) / 100;
            }
            const rznImp = (body.lost_reason || body.lostReason || body.reason || '').toString().toLowerCase().trim();
            if (status === 'disqualified' && rznImp) setImp.disqualify_reason = rznImp.slice(0, 40);
            if (status === 'lost' && rznImp) setImp.lost_reason = rznImp.slice(0, 40);
            // Berik tomme identitetsfelter — overskriver aldri.
            if (!imp.name && body.name) setImp.name = body.name.toString().slice(0, 120);
            if (!imp.email && email) setImp.email = email;
            if (!imp.phone && body.phone) setImp.phone = body.phone.toString().slice(0, 40);
            if (!imp.address && body.address) setImp.address = body.address.toString().slice(0, 200);
            if (!imp.postal_code && body.postal_code) setImp.postal_code = body.postal_code.toString().slice(0, 10);
            // Plattformen er fasit: manuell status-override som avviker ryddes,
            // slik at effektiv status (override ?? status) speiler CRM-et 1:1.
            // Kanal-/verdi-overrides (attribusjon) beholdes.
            const updImp = { $set: setImp };
            if (imp.override && imp.override.status && imp.override.status !== status) updImp.$unset = { 'override.status': '' };
            await db.collection('imported_leads').updateOne({ id: imp.id }, updImp);
            // Historiske leads er pre-tracking → fyrer ALDRI annonse-konverteringer.
            return cors(NextResponse.json({ ok: true, id: imp.id, matchedBy: 'imported', historic: true, status, mirrored: false }));
          }
        }
      }
      // CRM-SPEILING (bro-avtale): ukjent external_ref = organisk plattform-lead
      // (FINN/telefon/CRM-manuell). Opprett speil-lead i stedet for 404, slik at
      // admin-lista viser HELE pipelinen. id = plattformens lead_id (idempotent:
      // neste event matcher på external_ref).
      let mirrored = false;
      if (!lead && externalRef && !isDeleteEvent) {
        const nowIso0 = new Date().toISOString();
        const mirrorLead = {
          id: externalRef,
          name: (body.name || '').toString().slice(0, 120),
          email: email || '',
          phone: (body.phone || '').toString().slice(0, 40),
          address: (body.address || '').toString().slice(0, 200),
          postal_code: (body.postal_code || '').toString().slice(0, 10),
          lead_type: ['huseier', 'leietaker'].includes((body.lead_type || '').toString()) ? body.lead_type : 'huseier',
          source: (body.source || 'crm-plattform').toString().slice(0, 60),
          lead_source_type: bodySourceType || 'organic',
          is_paid: bodyIsPaid === true,
          mirrored: true,               // speilet fra plattformen — IKKE vår akkvisisjon
          origin: 'platform',
          platform_id: platformId || externalRef,
          forwarded: true,              // plattformen ER kilden; aldri re-forward
          status: 'new',
          statusHistory: [],
          createdAt: nowIso0,
          last_activity_at: nowIso0,
        };
        await db.collection('leads').insertOne(mirrorLead);
        coll = 'leads'; lead = mirrorLead; matchedBy = 'mirrored'; mirrored = true;
      }
      if (!lead) {
        // Slette-event for en lead vi ikke har: idempotent OK (ingenting å slette)
        // — 200 så plattformen ikke retryer. Aldri opprett speil av slettede.
        if (isDeleteEvent) return cors(NextResponse.json({ ok: true, skipped: 'ikke-funnet (ingenting å slette)' }));
        return cors(NextResponse.json({ ok: false, error: 'Lead ikke funnet' }, { status: 404 }));
      }

      // Annonse-konverteringsgate (bro-avtale punkt b): Meta/Google fyres KUN for
      // betalte leads. Eldre payloads uten is_paid → vår egen klassifisering
      // (uendret oppførsel). Speilede organiske leads fyrer ALDRI.
      const allowAdConversions = lead.lead_type === 'huseier' && (bodyIsPaid === true || (bodyIsPaid === null && !mirrored && lead.mirrored !== true));

      const nowIso = new Date().toISOString();
      const changedAt = body.changed_at ? new Date(body.changed_at).toISOString() : nowIso;
      const tenant = (body.tenant || '').toString().slice(0, 60) || null;

      // Slette-synk: plattformen slettet leaden → soft delete her (spor beholdes,
      // ut av pipeline/KPI-er). Loop-sikkert: webhook-veien rører aldri utboksen.
      if (isDeleteEvent) {
        await db.collection(coll).updateOne({ id: lead.id }, { $set: {
          deleted: true,
          deletedAt: body.deleted_at ? new Date(body.deleted_at).toISOString() : changedAt,
          deleteReason: `crm: ${(body.reason || 'slettet i CRM-et').toString()}`.slice(0, 200),
          deletedBy: 'platform', platformSyncAt: nowIso,
        } });
        return cors(NextResponse.json({ ok: true, id: lead.id, matchedBy, deleted: true }));
      }

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
          if (evt === 'leie_aktiv' && !alreadyActive && allowAdConversions && metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
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
      // Dedupe-herding (bro-avtale 9. juli): ved match på e-post/telefon lagres
      // plattformens id på leaden slik at NESTE event treffer direkte på
      // external_ref/platform_id (backfill — hindrer fremtidige tvillinger).
      if (!lead.platform_id && (platformId || externalRef)) update.platform_id = platformId || externalRef;
      // Berik leaden med identitetsfelter plattformen sender (reconcile-payloaden
      // har nå name+address+postal_code) — fyller hull, overskriver aldri.
      if (!lead.name && body.name) update.name = body.name.toString().slice(0, 120);
      if (!lead.email && email) update.email = email;
      if (!lead.phone && body.phone) update.phone = body.phone.toString().slice(0, 40);
      if (!lead.address && body.address) update.address = body.address.toString().slice(0, 200);
      if (!lead.postal_code && body.postal_code) update.postal_code = body.postal_code.toString().slice(0, 10);
      // Diskvalifisert (ikke relevant): EGEN bøtte, atskilt fra tapt — telles ikke
      // som tapt salg og holdes utenfor vinnrate/ROAS (analytics teller på won/lost).
      if (status === 'disqualified') {
        const DQ = ['spam', 'out_of_area', 'not_serious', 'no_response', 'duplicate', 'wrong_segment', 'other'];
        const dr = (body.lost_reason || body.lostReason || body.reason || '').toString().toLowerCase().trim();
        update.disqualifyReason = DQ.includes(dr) ? dr : (dr ? 'other' : null);
        update.disqualifiedAt = lead.disqualifiedAt || changedAt;
      }
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

      // Lukket sløyfe: Meta CAPI Purchase + Google Ads offline-konvertering + GA4.
      // Samme felles modul som admin-ruten (lib/closed-loop.js) — de to veiene
      // kan ikke lenger komme i utakt. Idempotent, og logger alltid årsak når et
      // signal hoppes over (mangler_gclid vs ikke_konfigurert krever ulike tiltak).
      let conversions = null;
      if (status === 'won') {
        conversions = await recordWonConversions({
          db, coll, lead, update, nowIso, allowAdConversions,
        });
      }
      const metaCapi = conversions ? conversions.meta : null;
      const googleConv = conversions ? conversions.google : null;
      const ga4Conv = conversions ? conversions.ga4 : null;

      // Mid-funnel livssyklus-events til Meta (custom/standard) → bedre budoptimalisering
      // oppover i trakten. Idempotent pr. stadium, samtykke-gated. event_id = <stadium>-<id>.
      try {
        const LIFECYCLE = { contacted: 'Contact', qualified: 'QualifiedLead' };
        const evName = LIFECYCLE[status];
        const firedKey = `metaCapi_${status}`;
        if (evName && !(lead[firedKey] && lead[firedKey].ok) && allowAdConversions && metaCapiConfigured() && marketingAllowed(lead.marketingConsent)) {
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
        mirrored,
        status,
        matched_by: matchedBy,
        match_warning: (matchedBy && matchedBy !== 'external_ref' && matchedBy !== 'mirrored')
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

      // HVOR LIGGER SAMTALEN? Vi pusher boliginteressen til plattformen i sanntid
      // og lar køen være sikkerhetsnettet de puller. Plattformen eier deretter
      // dialogen: den oppretter samtalen på enheten og svarer interessenten selv.
      // Forvalteren må derfor kunne se om en interesse er LEVERT (og hvor tråden
      // ligger) eller fortsatt står i KØ — ellers gjetter hun, og to svar til
      // samme person er verre enn ingen svar.
      const out = clean(lead);
      if (Array.isArray(out.property_interests) && out.property_interests.length) {
        const queued = await db.collection(INTEREST_OUTBOX)
          .find({ leadId: lead.id }, { projection: { _id: 0, unitId: 1, status: 1, deliveredAt: 1, deliveredVia: 1, platformRef: 1, platformStatus: 1, createdAt: 1, webhookAttempts: 1, webhookGaveUp: 1, lastWebhookError: 1 } })
          .toArray();
        // Én person kan melde interesse for samme enhet flere ganger. Nyeste
        // køoppføring beskriver den gjeldende tilstanden.
        const byUnit = new Map();
        for (const it of queued) {
          const k = String(it.unitId || '');
          const prev = byUnit.get(k);
          if (!prev || String(it.createdAt || '') > String(prev.createdAt || '')) byUnit.set(k, it);
        }
        out.property_interests = out.property_interests.map((x) => {
          const unitId = x.unitId || x.propertyId || '';
          const q = byUnit.get(String(unitId)) || null;
          return { ...x, delivery: deliveryView(q, unitId) };
        });
      }
      return cors(NextResponse.json({ ok: true, lead: out, timeline }));
    }

    // --- Admin: eksporter leads til CSV (BOM for æøå i Excel) ---
    // --- Admin: liste arkiverte leads + gjenopprettingsgrunnlag ---
    if (route === '/admin/leads/archived' && method === 'GET') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const projection = { _id: 0, id: 1, name: 1, email: 1, phone: 1, deletedAt: 1, deleteReason: 1, platform_id: 1, lead_type: 1 };
      const [leadRows, tenantRows, importedRows] = await Promise.all([
        db.collection('leads').find({ deleted: true }, { projection }).sort({ deletedAt: -1 }).limit(500).toArray(),
        db.collection('tenant_leads').find({ deleted: true }, { projection }).sort({ deletedAt: -1 }).limit(500).toArray(),
        db.collection('imported_leads').find({ deleted: true }, { projection }).sort({ deletedAt: -1 }).limit(500).toArray(),
      ]);
      const archived = [
        ...leadRows.map((x) => ({ ...x, type: 'lead' })),
        ...tenantRows.map((x) => ({ ...x, type: 'tenant' })),
        ...importedRows.map((x) => ({ ...x, type: 'imported' })),
      ].sort((a, b) => String(b.deletedAt || '').localeCompare(String(a.deletedAt || '')));
      return cors(NextResponse.json({ ok: true, archived, count: archived.length }));
    }


    // --- Admin: oppdater status på boliginteresse fra leietakerkortet ---
    if (route === '/admin/tenant-interest' && (method === 'PUT' || method === 'POST')) {
      if (!adminAuthed(request)) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const id = String(body.id || '').slice(0, 80);
      const propertyId = String(body.propertyId || '').slice(0, 80);
      const status = String(body.status || '').slice(0, 30);
      const allowed = ['interested', 'contacted', 'viewing', 'matched', 'declined'];
      if (!id || !propertyId || !allowed.includes(status)) return cors(NextResponse.json({ ok: false, error: 'Ugyldig id, bolig eller status' }, { status: 400 }));
      const coll = body.type === 'imported' ? 'imported_leads' : 'tenant_leads';
      const doc = await db.collection(coll).findOne({ id }, { projection: { _id: 0, property_interests: 1 } });
      if (!doc) return cors(NextResponse.json({ ok: false, error: 'Fant ikke leietakeren' }, { status: 404 }));
      const at = new Date().toISOString();
      let found = false;
      const interests = (Array.isArray(doc.property_interests) ? doc.property_interests : []).map((x) => {
        if (String(x.propertyId) !== propertyId) return x;
        found = true;
        return { ...x, status, statusUpdatedAt: at };
      });
      if (!found) return cors(NextResponse.json({ ok: false, error: 'Fant ikke boliginteressen' }, { status: 404 }));
      await db.collection(coll).updateOne({ id }, { $set: { property_interests: interests, updatedAt: at } });
      await db.collection('property_interest_events').updateMany({ tenantId: id, propertyId }, { $set: { status, statusUpdatedAt: at } });
      return cors(NextResponse.json({ ok: true, interests }));
    }

    // --- Admin: arkiver lead (soft delete m/tombstone) + gjenopprett ---
    // Best practice: raden består med deleted-flagg (spor/attribusjon beholdes),
    // skjules fra pipeline, eksport, analytics og abonnent-kandidater.
    if (route === '/admin/leads/archive' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      const collName = body.type === 'tenant' ? 'tenant_leads' : (body.type === 'imported' ? 'imported_leads' : 'leads');
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const doc = await db.collection(collName).findOne({ id });
      if (!doc) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // TOVEIS SLETTE-SYNK (10/7): meld arkivering/gjenoppretting til CRM-et via
      // den robuste utboksen (retry ved nedetid) — ellers blir leaden liggende
      // som aktiv der (drift). Kontrakt spesifisert i closed-loop-tråden.
      const syncArchiveToCrm = async (archived) => {
        try {
          const pid = doc.platform_id || (doc.mirrored ? doc.id : null);
          if (!pid) return { ok: false, skipped: 'ingen platform_id — leaden finnes ikke i CRM-et' };
          await queueLeadPushback(db, { platform_id: pid, archived, origin: 'lead-archive' });
          const target = digiHomeTarget();
          if (!target.url) return { ok: false, skipped: 'plattform-URL ikke konfigurert' };
          return await flushLeadPushbacks(db, { target: target.url, key: target.key });
        } catch (e) { return { ok: false, error: e.message }; }
      };
      if (body.undo === true) {
        await db.collection(collName).updateOne({ id }, { $unset: { deleted: '', deletedAt: '', deleteReason: '' } });
        const crmSync = await syncArchiveToCrm(false);
        return cors(NextResponse.json({ ok: true, id, deleted: false, crmSync }));
      }
      await db.collection(collName).updateOne({ id }, { $set: {
        deleted: true,
        deletedAt: new Date().toISOString(),
        deleteReason: (body.reason || '').toString().slice(0, 200) || null,
      } });
      const crmSync = await syncArchiveToCrm(true);
      return cors(NextResponse.json({ ok: true, id, deleted: true, crmSync }));
    }

    // --- Admin: slett lead PERMANENT (kun testdata/GDPR — krever confirm:'SLETT') ---
    if (route === '/admin/leads/delete' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      const collName = body.type === 'tenant' ? 'tenant_leads' : (body.type === 'imported' ? 'imported_leads' : 'leads');
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      if (body.confirm !== 'SLETT') return cors(NextResponse.json({ ok: false, error: "Bekreft med confirm:'SLETT'" }, { status: 400 }));
      const docDel = await db.collection(collName).findOne({ id });
      if (!docDel) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      // Toveis slette-synk: meld også permanent sletting til CRM-et (de soft-
      // sletter sin — GDPR-fysisk sletting hos dem er deres egen prosess).
      let crmSync = null;
      try {
        const pid = docDel.platform_id || (docDel.mirrored ? docDel.id : null);
        if (pid) {
          await queueLeadPushback(db, { platform_id: pid, archived: true, origin: 'lead-delete' });
          const target = digiHomeTarget();
          if (target.url) crmSync = await flushLeadPushbacks(db, { target: target.url, key: target.key });
        } else crmSync = { ok: false, skipped: 'ingen platform_id' };
      } catch (e) { crmSync = { ok: false, error: e.message }; }
      const res = await db.collection(collName).deleteOne({ id });
      if (!res.deletedCount) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      return cors(NextResponse.json({ ok: true, id, purged: true, crmSync }));
    }

    // --- Admin: re-send lead til CRM-plattformen (Tone Krogh-tilfellet: levert
    // men mistet hos motparten). Nullstiller forward-felter og trigger den
    // durable re-forward-mekanismen synkront — svarer med faktisk utfall. ---
    if (route === '/admin/leads/resend' && method === 'POST') {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      let body = {}; try { body = await request.json(); } catch (e) { body = {}; }
      const id = (body.id || '').toString();
      const collName = body.type === 'tenant' ? 'tenant_leads' : 'leads';
      if (!id) return cors(NextResponse.json({ ok: false, error: 'Mangler id' }, { status: 400 }));
      const doc = await db.collection(collName).findOne({ id });
      if (!doc) return cors(NextResponse.json({ ok: false, error: 'Ikke funnet' }, { status: 404 }));
      if (doc.mirrored === true) return cors(NextResponse.json({ ok: false, error: 'Leaden kommer FRA CRM-et (speil) — re-send gir ikke mening' }, { status: 400 }));
      await db.collection(collName).updateOne({ id }, { $set: {
        forwarded: false, forward_verified: false, next_retry_at: null, forward_attempts: 0,
        forward_error: 'Manuell re-send er forespurt — venter på verifisert CRM-kvittering',
        resend_requested_at: new Date().toISOString(),
      } });
      try { await reforwardPending(db); } catch (e) { /* utfall leses under */ }
      const after = await db.collection(collName).findOne({ id }, { projection: {
        _id: 0, forwarded: 1, forward_verified: 1, platform_id: 1, forward_error: 1,
        forwarded_at: 1, forward_target_env: 1, forward_target_url: 1, forward_http_status: 1,
      } });
      return cors(NextResponse.json({
        ok: true, id,
        forwarded: after?.forwarded === true,
        verified: after?.forward_verified === true,
        platform_id: after?.platform_id || null,
        target_env: after?.forward_target_env || null,
        target_url: after?.forward_target_url || null,
        http_status: after?.forward_http_status || null,
        error: after?.forwarded === true ? null : (after?.forward_error || 'Plattformen svarte ikke — prøves automatisk igjen'),
      }));
    }

    // GET = alle leads av typen. POST = kun oppgitte ids (pipeline-eksport som
    // respekterer aktive filtre — frontend sender de synlige kortenes ids).
    if (route === '/admin/leads/export' && (method === 'GET' || method === 'POST')) {
      if (!(await modulAuthed(request, db, 'i-leads'))) return cors(NextResponse.json({ error: 'Uautorisert' }, { status: 401 }));
      const { searchParams } = new URL(request.url);
      let exportType = searchParams.get('type') || 'lead';
      let isTenant = exportType === 'tenant';
      let isContact = exportType === 'contact';
      let ids = null;
      if (method === 'POST') {
        let body = {};
        try { body = await request.json(); } catch (e) { body = {}; }
        if (body.type) exportType = body.type;
        isTenant = exportType === 'tenant';
        isContact = exportType === 'contact';
        if (Array.isArray(body.ids)) {
          ids = body.ids.map((x) => String(x)).filter(Boolean).slice(0, 10000);
        }
      }
      const coll = isTenant ? 'tenant_leads' : 'leads';
      const leadTypeFilter = isTenant ? {} : isContact
        ? { lead_type: { $in: ['kontakt', 'contact', 'henvendelse', 'inquiry'] } }
        : { lead_type: { $nin: ['kontakt', 'contact', 'henvendelse', 'inquiry', 'leietaker'] } };
      const query = { ...leadTypeFilter, ...(ids && ids.length > 0 ? { id: { $in: ids } } : {}), deleted: { $ne: true } };
      const docs = await db.collection(coll).find(query).sort({ createdAt: -1 }).limit(10000).toArray();
      // HISTORISKE leads (imported_leads fra Historikk-synken) vises i samme
      // pipeline — de skal derfor MED i eksporten (fix 10. juli: eksporten
      // dekket bare halve tavlen). Mappes til samme kolonner + historisk-flagg.
      let impDocs = [];
      try {
        const impQuery = {
          ...(ids && ids.length > 0 ? { id: { $in: ids } } : {}),
          lead_type: isTenant ? 'leietaker' : isContact
            ? { $in: ['kontakt', 'contact', 'henvendelse', 'inquiry'] }
            : { $nin: ['leietaker', 'kontakt', 'contact', 'henvendelse', 'inquiry'] },
          deleted: { $ne: true },
        };
        impDocs = await db.collection('imported_leads').find(impQuery).sort({ created_at: -1 }).limit(10000).toArray();
      } catch (e) { impDocs = []; }
      const impMapped = impDocs.map((l) => ({
        createdAt: l.created_at || l.imported_at || '',
        name: l.name || '', email: l.email || '', phone: l.phone || '',
        address: l.address || '', postal_code: l.postal_code || '',
        status: (l.override && l.override.status) || l.status || 'new',
        wonValue: (l.override && l.override.won_value != null) ? l.override.won_value : (l.won_value != null ? l.won_value : ''),
        wonCurrency: l.currency || 'NOK',
        attribution: { channel: (l.override && l.override.channel) || l.channel || 'unknown' },
        source: (l.override && l.override.channel) || l.channel || 'unknown',
        forwarded: true,
        forward_verified: !!l.platform_id,
        platform_id: l.platform_id || null,
        forward_target_env: 'platform',
        syncedFromPlatform: !!l.platform_id,
        historisk: true,
      }));
      const all = [...docs, ...impMapped].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
      const cols = isTenant
        ? ['createdAt', 'lead_type', 'name', 'email', 'phone', 'preferred_area', 'budget_min', 'budget_max', 'bedrooms', 'move_in_date', 'status', 'channel', 'source', 'campaign', 'forwarded', 'forward_verified', 'platform_id', 'forward_target_env', 'forward_target_url', 'forward_http_status', 'forward_attempts', 'forwarded_at', 'forward_last_attempt_at', 'forward_error', 'syncedFromPlatform', 'historisk']
        : ['createdAt', 'lead_type', 'name', 'email', 'phone', 'address', 'postal_code', 'property_type', 'sqm', 'bedrooms', 'num_properties', 'matrikkel_number', 'seksjonsnr', 'registry_owner_name', 'status', 'wonValue', 'wonCurrency', 'channel', 'source', 'campaign', 'gclid', 'forwarded', 'forward_verified', 'platform_id', 'forward_target_env', 'forward_target_url', 'forward_http_status', 'forward_attempts', 'forwarded_at', 'forward_last_attempt_at', 'forward_error', 'syncedFromPlatform', 'historisk'];
      const lines = [cols.join(',')];
      for (const d of all) {
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
      const fname = `digihome-${isTenant ? 'leietakere' : isContact ? 'kontakter' : 'utleiere'}-${new Date().toISOString().slice(0, 10)}.csv`;
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
