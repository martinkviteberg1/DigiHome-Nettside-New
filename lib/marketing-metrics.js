// Maskinlesbar markedsdata for plattformens ukentlige management-rapport.
// Plattformen eier rapporten (CRM-sannhet: nye kunder + signerte kontrakter) og
// HENTER annonse-/lead-data herfra via GET /api/admin/marketing-metrics.
//
// Vi leverer det MARKEDSSIDEN eier komplett:
//   • Annonseforbruk (Google + Meta), klikk, visninger, konverteringer, konv.verdi
//   • Nye leads i perioden (utleier vs leietaker)
//   • Maredsførings-attribuerte vunne (closed-loop: status=won) + verdi
//   • Effektivitet: CPL, CAC, ROAS (annonse-rapportert) og ROAS (lukket sløyfe)
//   • Topp-kampanjer og uke-mot-uke-endring
import { runAdsWithMetrics, listCampaignsDetailed, defaultCustomerId, googleAdsNativeConfigured } from '@/lib/google-ads-native';
import { fetchMetaAdsWithInsights, metaAdsConfigured } from '@/lib/meta-ads';
import { aggregate } from '@/lib/ads-monitor';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const pct = (cur, prev) => (prev > 0 ? round2(((cur - prev) / prev) * 100) : null);

// Bygger en kompakt, stabil JSON-kontrakt for ett tidsvindu.
// Enten { days } (rullende N dager) ELLER { from, to } (YYYY-MM-DD, inkl. til-dato).
// from/to brukes for eksakt ISO-uke-justering på tvers av begge prosjekter.
export async function buildMarketingMetrics(db, { days = 7, from, to, customerId } = {}) {
  const cid = customerId || defaultCustomerId();
  let curTo, curFrom;
  if (from && to) {
    curFrom = new Date(`${from}T00:00:00.000Z`).getTime();
    curTo = new Date(`${to}T23:59:59.999Z`).getTime();
    if (!isFinite(curFrom) || !isFinite(curTo) || curTo <= curFrom) { curTo = Date.now(); curFrom = curTo - 7 * 86400000; }
  } else {
    const d = Math.max(1, Math.min(90, Number(days) || 7));
    curTo = Date.now();
    curFrom = curTo - d * 86400000;
  }
  const winLen = curTo - curFrom;
  const prevFrom = curFrom - winLen;
  const prevTo = curFrom;
  const gOn = googleAdsNativeConfigured();
  const mOn = metaAdsConfigured();

  const [gCur, gPrev, mCur, mPrev, campaigns] = await Promise.all([
    gOn ? runAdsWithMetrics({ since: new Date(curFrom).toISOString(), until: new Date(curTo).toISOString(), customerId: cid }).then((r) => r.ads).catch(() => []) : [],
    gOn ? runAdsWithMetrics({ since: new Date(prevFrom).toISOString(), until: new Date(prevTo).toISOString(), customerId: cid }).then((r) => r.ads).catch(() => []) : [],
    mOn ? fetchMetaAdsWithInsights({ since: ymd(curFrom), until: ymd(curTo) }).catch(() => []) : [],
    mOn ? fetchMetaAdsWithInsights({ since: ymd(prevFrom), until: ymd(prevTo) }).catch(() => []) : [],
    gOn ? listCampaignsDetailed(cid).catch(() => []) : [],
  ]);

  const allCur = [...gCur, ...mCur], allPrev = [...gPrev, ...mPrev];
  const cur = aggregate(allCur), prev = aggregate(allPrev);
  const gAgg = aggregate(gCur), mAgg = aggregate(mCur);

  // Leads fra DB (utleier = leads, leietaker = tenant_leads) i perioden.
  const sinceIso = new Date(curFrom).toISOString();
  const untilIso = new Date(curTo).toISOString();
  let utleierLeads = 0, leietakerLeads = 0, wonCount = 0, wonValue = 0;
  try {
    const dateRange = { $gte: sinceIso, $lte: untilIso };
    const [uDocs, tDocs] = await Promise.all([
      db.collection('leads').find({ $or: [{ createdAt: dateRange }, { created_at: dateRange }] }, { projection: { _id: 0, status: 1 } }).toArray(),
      db.collection('tenant_leads').find({ $or: [{ createdAt: dateRange }, { created_at: dateRange }] }, { projection: { _id: 0 } }).toArray(),
    ]);
    utleierLeads = uDocs.length;
    leietakerLeads = tDocs.length;
    // Marketing-attribuerte vunne (closed-loop status=won) signert i vinduet.
    const wonDocs = await db.collection('leads').find({ status: 'won' }, { projection: { _id: 0, wonValue: 1, won_at: 1, wonAt: 1, updated_at: 1, updatedAt: 1, created_at: 1, createdAt: 1 } }).toArray();
    const wonWin = wonDocs.filter((x) => { const t = new Date(x.wonAt || x.won_at || x.updatedAt || x.updated_at || x.createdAt || x.created_at || 0).getTime(); return t >= curFrom && t <= curTo; });
    wonCount = wonWin.length;
    wonValue = wonWin.reduce((s, x) => s + (Number(x.wonValue) || 0), 0);
  } catch (e) { /* tom DB ok */ }

  const newLeads = utleierLeads + leietakerLeads;
  const topCampaigns = [...allCur]
    .sort((a, b) => (b.cost || 0) - (a.cost || 0))
    .slice(0, 8)
    .map((a) => ({
      channel: a.channel === 'meta' ? 'meta' : 'google',
      name: (a.name || '').slice(0, 80),
      cost: round2(a.cost), clicks: a.clicks || 0,
      conversions: round2(a.conversions || 0),
    }));

  const winDays = Math.round((curTo - curFrom) / 86400000);
  return {
    period: { label: from && to ? `${from} – ${to}` : `siste ${winDays} dager`, days: winDays, from: new Date(curFrom).toISOString(), to: new Date(curTo).toISOString() },
    currency: 'NOK',
    spend: { total: round2(cur.cost), google: round2(gAgg.cost), meta: round2(mAgg.cost) },
    performance: {
      impressions: cur.impressions, clicks: cur.clicks,
      ctr: cur.impressions > 0 ? round2((cur.clicks / cur.impressions) * 100) : null,
      conversions: round2(cur.conversions), convValue: round2(cur.convValue),
    },
    leads: { new: newLeads, utleier: utleierLeads, leietaker: leietakerLeads },
    // Det MARKEDSSIDEN vet om vunne (kun annonse-attribuerte). Plattformen eier
    // den autoritative totalen for nye kunder + signerte kontrakter.
    marketingAttributedWon: { count: wonCount, value: round2(wonValue) },
    efficiency: {
      // CPL og lead→kunde baseres på UTLEIER-leads (betalende-kunde-trakten).
      // Leietaker-leads (etterspørsel) holdes utenfor så tallene ikke fortynnes.
      cpl: utleierLeads > 0 ? round2(cur.cost / utleierLeads) : null,
      cplBlended: newLeads > 0 ? round2(cur.cost / newLeads) : null,
      cac: wonCount > 0 ? round2(cur.cost / wonCount) : null,
      valuePerWon: wonCount > 0 ? round2(wonValue / wonCount) : null,
      roasAds: cur.cost > 0 ? round2(cur.convValue / cur.cost) : null,
      roasTrue: cur.cost > 0 && wonValue > 0 ? round2(wonValue / cur.cost) : null,
      // Tilbakebetalingstid (mnd) for CAC gitt at wonValue = årshonorar → 12 * forbruk / verdi.
      cacPaybackMonths: wonValue > 0 ? round2((12 * cur.cost) / wonValue) : null,
      // Lead→kunde-konvertering (kun utleier-leads, markedsattribuert).
      leadToWonPct: utleierLeads > 0 ? round2((wonCount / utleierLeads) * 100) : null,
    },
    channelSplit: {
      googlePct: cur.cost > 0 ? round2((gAgg.cost / cur.cost) * 100) : null,
      metaPct: cur.cost > 0 ? round2((mAgg.cost / cur.cost) * 100) : null,
    },
    topCampaigns,
    wow: { cost: pct(cur.cost, prev.cost), conversions: pct(cur.conversions, prev.conversions), clicks: pct(cur.clicks, prev.clicks) },
    configured: { google: gOn, meta: mOn },
    generatedAt: new Date().toISOString(),
  };
}
