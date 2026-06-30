// ---------------------------------------------------------------------------
// Orkestrator for annonse-optimalisering: henter data, bygger anbefalinger,
// (ukentlig) keyword research + AI-rapport, lagrer kjøringer, og kan auto-
// anvende innenfor vakter. Kalles av admin «Kjør nå» og av cron-endepunktet.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import {
  defaultCustomerId, runAdsWithMetrics, runSearchTerms, runKeywordMetrics,
  listCampaignsDetailed, generateKeywordIdeas,
  addCampaignNegativeKeywords, setAdGroupCriterionStatus, setAdStatus, updateCampaignBudget,
} from '@/lib/google-ads-native';
import { getCachedMetaAdsTable, setMetaAdStatus } from '@/lib/meta-ads';
import { buildRecommendations, DEFAULT_REC_CONFIG } from '@/lib/ads-recommendations';
import { weeklyReport } from '@/lib/ads-ai';

const CFG_KEY = 'config';

export async function getOptimizeConfig(db) {
  const doc = await db.collection('ads_optimization_config').findOne({ key: CFG_KEY }, { projection: { _id: 0 } });
  return { ...DEFAULT_REC_CONFIG, autoApply: false, autoApplyTypes: ['add_negative'], maxAutoActions: 10, lastRunAt: null, ...(doc || {}), key: CFG_KEY };
}
export async function setOptimizeConfig(db, patch = {}) {
  const cur = await getOptimizeConfig(db);
  const next = { ...cur, ...patch, key: CFG_KEY };
  delete next._id;
  await db.collection('ads_optimization_config').updateOne({ key: CFG_KEY }, { $set: next }, { upsert: true });
  return next;
}
export async function getLastRun(db) {
  return db.collection('ads_optimization_runs').find({}, { projection: { _id: 0 } }).sort({ at: -1 }).limit(1).next();
}
export async function listRuns(db, limit = 20) {
  return db.collection('ads_optimization_runs').find({}, { projection: { _id: 0, recommendations: 0, keywordIdeas: 0 } }).sort({ at: -1 }).limit(limit).toArray();
}

// Bruk én anbefaling (menneske-godkjent ELLER auto innenfor vakter).
export async function applyRecommendation(rec, { customerId } = {}) {
  const cid = customerId || defaultCustomerId();
  const a = (rec && rec.action) || {};
  const p = a.payload || {};
  switch (a.kind) {
    case 'add_negative':
      return addCampaignNegativeKeywords(cid, p.campaignId, [p.term], p.matchType || 'PHRASE');
    case 'pause_keyword':
      return setAdGroupCriterionStatus(cid, p.resourceName, 'PAUSED');
    case 'pause_ad':
      if (p.channel === 'meta') return setMetaAdStatus(p.adId, 'PAUSED');
      return setAdStatus(cid, p.resourceName, 'PAUSED');
    case 'scale_budget':
      return updateCampaignBudget(cid, p.budgetResourceName, p.newBudget);
    case 'ai_refresh':
      return { ok: false, error: 'ai_refresh håndteres via AI-generering, ikke direkte mutasjon' };
    default:
      return { ok: false, error: `Ukjent handling: ${a.kind}` };
  }
}

export async function runOptimization(db, { mode = 'weekly', dryRun = true, customerId } = {}) {
  const cid = customerId || defaultCustomerId();
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const until = new Date().toISOString();
  const cfg = await getOptimizeConfig(db);

  const [googleAds, searchTerms, keywords, campaigns, metaRes] = await Promise.all([
    runAdsWithMetrics({ since, until, customerId: cid }).then((r) => r.ads).catch(() => []),
    runSearchTerms({ since, until, customerId: cid }).catch(() => []),
    runKeywordMetrics({ since, until, customerId: cid }).catch(() => []),
    listCampaignsDetailed(cid).catch(() => []),
    getCachedMetaAdsTable(db, 'last_30d', {}).catch(() => ({ ads: [] })),
  ]);
  const metaAds = (metaRes && metaRes.ads) || [];

  const recommendations = buildRecommendations({ googleAds, searchTerms, keywords, metaAds, campaigns, config: cfg });

  let keywordIdeas = [];
  let report = null;
  if (mode === 'weekly') {
    const seeds = searchTerms.filter((t) => t.conversions > 0).slice(0, 10).map((t) => t.term);
    keywordIdeas = await generateKeywordIdeas({
      seeds: seeds.length ? seeds : ['leie ut bolig bergen', 'utleie bergen', 'eiendomsforvaltning bergen'],
      url: 'https://digihome.no/bli-utleier', customerId: cid,
    }).catch(() => []);
    report = await weeklyReport({
      recommendations,
      topAds: [...googleAds, ...metaAds].sort((a, b) => b.cost - a.cost),
      searchTerms,
    }).catch(() => null);
  }

  // Auto-apply innenfor vakter (kun hvis konfigurert + ikke dryRun).
  const autoApplied = [];
  if (!dryRun && cfg.autoApply) {
    const allowed = recommendations.filter((r) => (cfg.autoApplyTypes || []).includes(r.action.kind));
    for (const r of allowed.slice(0, cfg.maxAutoActions || 10)) {
      try {
        const res = await applyRecommendation(r, { customerId: cid });
        autoApplied.push({ id: r.id, type: r.type, ok: !!res.ok, error: res.error || null });
      } catch (e) {
        autoApplied.push({ id: r.id, type: r.type, ok: false, error: e.message });
      }
    }
  }

  const summary = {
    counts: recommendations.reduce((m, r) => { m[r.type] = (m[r.type] || 0) + 1; return m; }, {}),
    totalRecommendations: recommendations.length,
    estimatedSavings: Math.round(recommendations.reduce((s, r) => s + (r.estimatedSaving || 0), 0) * 100) / 100,
    googleAds: googleAds.length, metaAds: metaAds.length, searchTerms: searchTerms.length, keywordIdeas: keywordIdeas.length,
    autoApplied: autoApplied.length,
  };

  const runDoc = {
    id: uuidv4(), at: new Date().toISOString(), mode, dryRun: !!dryRun,
    recommendations, keywordIdeas: keywordIdeas.slice(0, 100), report, summary, autoApplied,
  };
  await db.collection('ads_optimization_runs').insertOne({ ...runDoc });
  const stale = await db.collection('ads_optimization_runs').find({}, { projection: { _id: 1, at: 1 } }).sort({ at: -1 }).skip(50).toArray();
  if (stale.length) await db.collection('ads_optimization_runs').deleteMany({ _id: { $in: stale.map((o) => o._id) } });
  await setOptimizeConfig(db, { lastRunAt: runDoc.at });

  return runDoc;
}
