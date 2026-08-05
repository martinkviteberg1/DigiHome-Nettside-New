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
import { runAdsWithMetrics, listCampaignsDetailed, defaultCustomerId, googleAdsNativeConfigured, googleSpendTotals } from '@/lib/google-ads-native';
import { fetchMetaAdsWithInsights, metaAdsConfigured } from '@/lib/meta-ads';
import { aggregate } from '@/lib/ads-monitor';

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const pct = (cur, prev) => (prev > 0 ? round2(((cur - prev) / prev) * 100) : null);
const DAY = 86400000;
// Kun huseier-leads skal telles i CPL/CAC. Kontaktskjema og leietaker-leads
// ligger i samme kolleksjon og fortynnet tidligere nevneren kraftig.
const OWNER_LEAD_QUERY = {
  lead_type: { $nin: ['kontakt', 'contact', 'henvendelse', 'inquiry', 'leietaker', 'tenant'] },
  deleted: { $ne: true },
  mirrored: { $ne: true },
};

// Bygger en kompakt, stabil JSON-kontrakt for ett tidsvindu.
// Enten { days } (rullende N KALENDERDAGER t.o.m. i dag) ELLER { from, to }.
//
// VIKTIG om vinduet: Google/Meta rapporterer per kalenderdag. Tidligere sendte
// vi `nå − N×24t` som startdato, som ga N+1 kalenderdager forbruk mot N døgn
// leads → forbruk/CPL/CAC ble systematisk ~14 % for høyt på 7 dager. Nå er
// begge sider låst til samme kalenderdager (UTC).
export async function buildMarketingMetrics(db, { days = 7, from, to, customerId } = {}) {
  const cid = customerId || defaultCustomerId();
  let dFrom, dTo; // YYYY-MM-DD (inklusive)
  if (from && to) {
    dFrom = String(from).slice(0, 10);
    dTo = String(to).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(dTo) || dTo < dFrom) {
      dTo = ymd(Date.now()); dFrom = ymd(Date.now() - 6 * DAY);
    }
  } else {
    const d = Math.max(1, Math.min(730, Number(days) || 7));
    dTo = ymd(Date.now());
    dFrom = ymd(Date.now() - (d - 1) * DAY);
  }
  const curFrom = new Date(`${dFrom}T00:00:00.000Z`).getTime();
  const curTo = new Date(`${dTo}T23:59:59.999Z`).getTime();
  const nDays = Math.round((curTo - curFrom + 1) / DAY);
  const pFrom = ymd(curFrom - nDays * DAY);
  const pTo = ymd(curFrom - DAY);
  const prevFrom = new Date(`${pFrom}T00:00:00.000Z`).getTime();
  const prevTo = new Date(`${pTo}T23:59:59.999Z`).getTime();
  const gOn = googleAdsNativeConfigured();
  const mOn = metaAdsConfigured();

  const [gCur, gPrev, mCur, mPrev, campaigns, gSpendCur, gSpendPrev] = await Promise.all([
    gOn ? runAdsWithMetrics({ since: `${dFrom}T00:00:00.000Z`, until: `${dTo}T00:00:00.000Z`, customerId: cid }).then((r) => r.ads).catch(() => []) : [],
    gOn ? runAdsWithMetrics({ since: `${pFrom}T00:00:00.000Z`, until: `${pTo}T00:00:00.000Z`, customerId: cid }).then((r) => r.ads).catch(() => []) : [],
    // lifetimeFallback:false → pausede annonser skal IKKE bidra med sitt
    // livstidsforbruk i en periodetotal. Uten dette ble forbruket massivt
    // oppblåst (målt +25 000 kr i alle perioder på DigiHome-kontoen).
    mOn ? fetchMetaAdsWithInsights({ since: dFrom, until: dTo, lifetimeFallback: false }).catch(() => []) : [],
    mOn ? fetchMetaAdsWithInsights({ since: pFrom, until: pTo, lifetimeFallback: false }).catch(() => []) : [],
    gOn ? listCampaignsDetailed(cid).catch(() => []) : [],
    gOn ? googleSpendTotals({ since: `${dFrom}T00:00:00.000Z`, until: `${dTo}T00:00:00.000Z`, customerId: cid }).catch(() => null) : null,
    gOn ? googleSpendTotals({ since: `${pFrom}T00:00:00.000Z`, until: `${pTo}T00:00:00.000Z`, customerId: cid }).catch(() => null) : null,
  ]);

  const allCur = [...gCur, ...mCur];
  const gAdLevel = aggregate(gCur), mAgg = aggregate(mCur);
  const gPrevAdLevel = aggregate(gPrev);

  // Google: bruk kampanjenivå når det er tilgjengelig (autoritativt), ellers
  // fall tilbake til annonsenivå. Meta: annonsenivå = kampanjenivå (verifisert).
  const gTot = gSpendCur?.totals || null;
  const gCost = gTot ? gTot.cost : gAdLevel.cost;
  const gPrevCost = gSpendPrev?.totals ? gSpendPrev.totals.cost : gPrevAdLevel.cost;
  const cur = {
    cost: round2(gCost + mAgg.cost),
    clicks: (gTot ? gTot.clicks : gAdLevel.clicks) + mAgg.clicks,
    impressions: (gTot ? gTot.impressions : gAdLevel.impressions) + mAgg.impressions,
    conversions: round2((gTot ? gTot.conversions : gAdLevel.conversions) + mAgg.conversions),
    convValue: round2((gTot ? gTot.convValue : gAdLevel.convValue) + mAgg.convValue),
  };
  const prevG = gSpendPrev?.totals || null;
  const mPrevAgg = aggregate(mPrev);
  const prev = {
    cost: round2(gPrevCost + mPrevAgg.cost),
    clicks: (prevG ? prevG.clicks : gPrevAdLevel.clicks) + mPrevAgg.clicks,
    impressions: (prevG ? prevG.impressions : gPrevAdLevel.impressions) + mPrevAgg.impressions,
    conversions: round2((prevG ? prevG.conversions : gPrevAdLevel.conversions) + mPrevAgg.conversions),
    convValue: round2((prevG ? prevG.convValue : gPrevAdLevel.convValue) + mPrevAgg.convValue),
  };

  // Leads fra DB (utleier = leads, leietaker = tenant_leads) i perioden.
  const sinceIso = new Date(curFrom).toISOString();
  const untilIso = new Date(curTo).toISOString();
  let utleierLeads = 0, leietakerLeads = 0, wonCount = 0, wonValue = 0, wonWithValue = 0;
  let paidLeads = 0, paidGoogleLeads = 0, paidMetaLeads = 0;
  try {
    const dateRange = { $gte: sinceIso, $lte: untilIso };
    const [uDocs, tDocs] = await Promise.all([
      db.collection('leads').find({ ...OWNER_LEAD_QUERY, $or: [{ createdAt: dateRange }, { created_at: dateRange }] }, { projection: { _id: 0, status: 1, source: 1, attribution: 1 } }).toArray(),
      db.collection('tenant_leads').find({ deleted: { $ne: true }, $or: [{ createdAt: dateRange }, { created_at: dateRange }] }, { projection: { _id: 0 } }).toArray(),
    ]);
    utleierLeads = uDocs.length;
    leietakerLeads = tDocs.length;

    // Hvilke leads kom faktisk fra ANNONSER? Uten dette deler vi annonseforbruk
    // på organiske leads også, og CPL ser bedre ut enn den er (835 kr i stedet
    // for 987 kr i juli 2026). Vi klassifiserer på samme grunnlag som
    // paidChannelOf i analytics-server: kilde/medium + klikk-ID.
    for (const d of uDocs) {
      const a = d.attribution || {};
      const s = `${a.source || d.source || ''} ${a.medium || ''} ${a.campaign || ''}`.toLowerCase();
      const isGoogle = !!a.gclid || !!a.gbraid || !!a.wbraid || /google|adwords|\bgads\b/.test(s);
      const isMeta = !!a.fbclid || /\bmeta\b|facebook|instagram|\bfb\b|\big\b/.test(s);
      if (isGoogle) { paidGoogleLeads += 1; paidLeads += 1; } else if (isMeta) { paidMetaLeads += 1; paidLeads += 1; }
    }

    // Marketing-attribuerte vunne (closed-loop status=won) signert i vinduet.
    const wonDocs = await db.collection('leads').find({ ...OWNER_LEAD_QUERY, status: 'won' }, { projection: { _id: 0, wonValue: 1, wonValueActual: 1, wonValueEstimate: 1, won_at: 1, wonAt: 1, updated_at: 1, updatedAt: 1, created_at: 1, createdAt: 1 } }).toArray();
    const wonWin = wonDocs.filter((x) => { const t = new Date(x.wonAt || x.won_at || x.updatedAt || x.updated_at || x.createdAt || x.created_at || 0).getTime(); return t >= curFrom && t <= curTo; });
    const valOf = (x) => Number(x.wonValueActual ?? x.wonValue ?? x.wonValueEstimate ?? 0) || 0;
    wonCount = wonWin.length;
    wonValue = wonWin.reduce((s, x) => s + valOf(x), 0);
    wonWithValue = wonWin.filter((x) => valOf(x) > 0).length;
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

  const winDays = nDays;
  return {
    period: { label: from && to ? `${dFrom} – ${dTo}` : `siste ${winDays} dager`, days: winDays, from: new Date(curFrom).toISOString(), to: new Date(curTo).toISOString(), fromDate: dFrom, toDate: dTo },
    currency: 'NOK',
    spend: { total: round2(cur.cost), google: round2(gCost), meta: round2(mAgg.cost) },
    // Avstemming: hvor forbrukstallet kommer fra, og hva annonsenivået sier.
    // Gjør avvik (PMax/Demand Gen, fjernede annonser) synlige i stedet for
    // at de forsvinner i en total.
    spendSources: {
      googleBasis: gTot ? 'campaign' : 'ad',
      googleCampaignLevel: gTot ? round2(gTot.cost) : null,
      googleAdLevel: round2(gAdLevel.cost),
      googleDelta: gTot ? round2(gAdLevel.cost - gTot.cost) : null,
      metaAdLevel: round2(mAgg.cost),
      metaLifetimeFallback: false,
    },
    performance: {
      impressions: cur.impressions, clicks: cur.clicks,
      ctr: cur.impressions > 0 ? round2((cur.clicks / cur.impressions) * 100) : null,
      conversions: round2(cur.conversions), convValue: round2(cur.convValue),
    },
    leads: { new: newLeads, utleier: utleierLeads, leietaker: leietakerLeads, paid: paidLeads, paidGoogle: paidGoogleLeads, paidMeta: paidMetaLeads, organic: Math.max(0, utleierLeads - paidLeads) },
    // Det MARKEDSSIDEN vet om vunne (kun annonse-attribuerte). Plattformen eier
    // den autoritative totalen for nye kunder + signerte kontrakter.
    marketingAttributedWon: { count: wonCount, value: round2(wonValue), withValue: wonWithValue, missingValue: Math.max(0, wonCount - wonWithValue) },
    efficiency: {
      // CPL og lead→kunde baseres på UTLEIER-leads (betalende-kunde-trakten).
      // Leietaker-leads (etterspørsel) holdes utenfor så tallene ikke fortynnes.
      //
      // cpl        = annonseforbruk / ALLE huseierleads (også organiske).
      //              Nyttig som «blandet» effektivitet, men FLATTERENDE.
      // cplPaid    = annonseforbruk / huseierleads som faktisk kom fra annonser.
      //              Dette er det ærlige tallet på hva et betalt lead koster.
      // Juli 2026: cpl 835 kr vs cplPaid 987 kr — 18 % forskjell.
      cpl: utleierLeads > 0 ? round2(cur.cost / utleierLeads) : null,
      cplPaid: paidLeads > 0 ? round2(cur.cost / paidLeads) : null,
      cplBlended: newLeads > 0 ? round2(cur.cost / newLeads) : null,
      paidLeadSharePct: utleierLeads > 0 ? round2((paidLeads / utleierLeads) * 100) : null,
      cac: wonCount > 0 ? round2(cur.cost / wonCount) : null,
      valuePerWon: wonWithValue > 0 ? round2(wonValue / wonWithValue) : null,
      roasAds: cur.cost > 0 ? round2(cur.convValue / cur.cost) : null,
      roasTrue: cur.cost > 0 && wonValue > 0 ? round2(wonValue / cur.cost) : null,
      // Tilbakebetalingstid (mnd) for CAC gitt at wonValue = årshonorar → 12 * forbruk / verdi.
      cacPaybackMonths: wonValue > 0 ? round2((12 * cur.cost) / wonValue) : null,
      // Lead→kunde-konvertering (kun utleier-leads, markedsattribuert).
      leadToWonPct: utleierLeads > 0 ? round2((wonCount / utleierLeads) * 100) : null,
    },
    channelSplit: {
      googlePct: cur.cost > 0 ? round2((gCost / cur.cost) * 100) : null,
      metaPct: cur.cost > 0 ? round2((mAgg.cost / cur.cost) * 100) : null,
    },
    topCampaigns,
    wow: { cost: pct(cur.cost, prev.cost), conversions: pct(cur.conversions, prev.conversions), clicks: pct(cur.clicks, prev.clicks) },
    configured: { google: gOn, meta: mOn },
    generatedAt: new Date().toISOString(),
  };
}
