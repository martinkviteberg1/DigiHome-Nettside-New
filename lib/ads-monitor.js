// Overvåknings-/anomali-motor (ren logikk). Produserer varsler fra øyeblikks-
// bilde (per annonse) + uke-mot-uke-totaler. Ingen API-kall her.
const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;

export const DEFAULT_MONITOR_CONFIG = {
  freqFatigue: 3.0,       // Meta-frekvens over dette (m/ forbruk) = annonsetretthet
  freqMinCost: 150,       // NOK – ignorer lav-forbruks-annonser
  cpaSpikePct: 40,        // CPA opp mer enn dette uke-mot-uke = varsel
  ctrDropPct: 30,         // CTR ned mer enn dette uke-mot-uke = varsel
  minCostForTrend: 300,   // ignorer trend-støy under dette forbruket
};

export function aggregate(ads = []) {
  return ads.reduce((t, a) => ({
    cost: t.cost + (a.cost || 0), clicks: t.clicks + (a.clicks || 0),
    impressions: t.impressions + (a.impressions || 0),
    conversions: t.conversions + (a.conversions || 0),
    convValue: t.convValue + (a.convValue || 0),
  }), { cost: 0, clicks: 0, impressions: 0, conversions: 0, convValue: 0 });
}

export function buildAlerts({ googleAds = [], metaAds = [], current = null, previous = null, config = {} } = {}) {
  const c = { ...DEFAULT_MONITOR_CONFIG, ...config };
  const alerts = [];
  const sevVal = (s) => ({ high: 3, medium: 2, low: 1 }[s] || 1);

  // 1) Annonsetretthet (Meta-frekvens høy m/ forbruk)
  for (const a of metaAds) {
    if (String(a.status).toUpperCase() !== 'ACTIVE') continue;
    if ((a.frequency || 0) >= c.freqFatigue && (a.cost || 0) >= c.freqMinCost) {
      alerts.push({
        id: `fatigue-${a.id}`, channel: 'meta', type: 'ad_fatigue',
        severity: a.frequency >= c.freqFatigue * 1.5 ? 'high' : 'medium',
        title: `Annonsetretthet: «${(a.name || '').slice(0, 50)}» (frekvens ${a.frequency})`,
        detail: `Samme personer ser annonsen ${a.frequency}× (reach ${a.reach}). Høy frekvens gir fallende effekt — forny kreativ eller utvid målgruppe.`,
        metrics: { frequency: a.frequency, reach: a.reach, cost: a.cost },
      });
    }
  }

  // 2) Uke-mot-uke (CPA-spike, CTR-fall) på kontonivå
  if (current && previous && current.cost >= c.minCostForTrend && previous.cost >= c.minCostForTrend) {
    const curCpa = current.conversions > 0 ? current.cost / current.conversions : null;
    const prevCpa = previous.conversions > 0 ? previous.cost / previous.conversions : null;
    if (curCpa && prevCpa) {
      const dp = ((curCpa - prevCpa) / prevCpa) * 100;
      if (dp >= c.cpaSpikePct) alerts.push({
        id: 'cpa-spike', channel: 'all', type: 'cpa_spike', severity: dp >= c.cpaSpikePct * 2 ? 'high' : 'medium',
        title: `CPA opp ${Math.round(dp)} % uke-mot-uke`,
        detail: `Kostnad per konvertering steg fra ${round2(prevCpa)} til ${round2(curCpa)} kr.`,
        metrics: { curCpa: round2(curCpa), prevCpa: round2(prevCpa) },
      });
    }
    const curCtr = current.impressions > 0 ? (current.clicks / current.impressions) * 100 : null;
    const prevCtr = previous.impressions > 0 ? (previous.clicks / previous.impressions) * 100 : null;
    if (curCtr && prevCtr) {
      const dp = ((prevCtr - curCtr) / prevCtr) * 100;
      if (dp >= c.ctrDropPct) alerts.push({
        id: 'ctr-drop', channel: 'all', type: 'ctr_drop', severity: 'medium',
        title: `CTR ned ${Math.round(dp)} % uke-mot-uke`,
        detail: `Klikkrate falt fra ${round2(prevCtr)} % til ${round2(curCtr)} %. Vurder nye annonsetekster.`,
        metrics: { curCtr: round2(curCtr), prevCtr: round2(prevCtr) },
      });
    }
  }

  alerts.sort((a, b) => sevVal(b.severity) - sevVal(a.severity));
  return alerts;
}
