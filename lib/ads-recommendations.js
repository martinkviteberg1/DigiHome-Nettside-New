// ---------------------------------------------------------------------------
// Anbefalingsmotor (ren logikk, deterministisk). Tar inn annonse-/søkeord-/
// søketerm-data og produserer prioriterte, handlingsbare anbefalinger.
// Ingen API-kall her — kun regler. Apply skjer via lib/ads-optimize.js.
// ---------------------------------------------------------------------------

export const DEFAULT_REC_CONFIG = {
  wasteAdCost: 200,          // NOK: annonse m/ >= dette og 0 konv. → pause-forslag
  wasteKeywordCost: 150,     // NOK: søkeord m/ >= dette og 0 konv. → pause-forslag
  negativeTermCost: 80,      // NOK: søketerm m/ >= dette, 0 konv. → negativ-forslag
  negativeTermMinClicks: 3,
  scaleRoas: 3,              // ROAS >= dette på kampanje → skaler budsjett
  lowCtr: 1.5,               // % CTR under dette (m/ nok visninger) → kreativ-forslag
  lowCtrMinImpr: 500,
};

const round2 = (x) => Math.round((Number(x) || 0) * 100) / 100;
function recId(type, target) {
  return `${type}:${String(target || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 64)}`;
}

export function buildRecommendations({ googleAds = [], searchTerms = [], keywords = [], metaAds = [], campaigns = [], config = {} } = {}) {
  const c = { ...DEFAULT_REC_CONFIG, ...config };
  const recs = [];

  // 1) Negative søketermer (Google) — sløsing uten konvertering, ikke allerede håndtert.
  for (const t of searchTerms) {
    if (t.conversions > 0) continue;
    const status = String(t.status || 'NONE').toUpperCase();
    if (status.includes('ADDED') || status.includes('EXCLUDED')) continue;
    if (t.cost >= c.negativeTermCost && t.clicks >= c.negativeTermMinClicks) {
      recs.push({
        id: recId('add_negative', t.term),
        channel: 'google', type: 'add_negative',
        severity: t.cost >= c.negativeTermCost * 2 ? 'high' : 'medium',
        title: `Legg til negativt søkeord: «${t.term}»`,
        rationale: `Søketermen «${t.term}» har brukt ${round2(t.cost)} kr på ${t.clicks} klikk uten en eneste konvertering (kampanje: ${t.campaign}). Ekskluder den for å stoppe sløsing.`,
        metrics: { cost: t.cost, clicks: t.clicks, conversions: 0 },
        estimatedSaving: round2(t.cost),
        action: { kind: 'add_negative', payload: { campaignId: t.campaignId, term: t.term, matchType: 'PHRASE' } },
      });
    }
  }

  // 2) Pause søkeord (Google) — høyt forbruk, 0 konvertering.
  for (const k of keywords) {
    if (k.conversions > 0) continue;
    if (String(k.status).toUpperCase() !== 'ENABLED') continue;
    if (k.cost >= c.wasteKeywordCost && k.resourceName) {
      recs.push({
        id: recId('pause_keyword', k.resourceName || k.text),
        channel: 'google', type: 'pause_keyword',
        severity: k.cost >= c.wasteKeywordCost * 2 ? 'high' : 'medium',
        title: `Vurder å pause søkeord: «${k.text}»`,
        rationale: `Søkeordet «${k.text}» (${k.matchType}) i «${k.adGroup}» har brukt ${round2(k.cost)} kr på ${k.clicks} klikk uten konvertering.`,
        metrics: { cost: k.cost, clicks: k.clicks, conversions: 0 },
        estimatedSaving: round2(k.cost),
        action: { kind: 'pause_keyword', payload: { resourceName: k.resourceName } },
      });
    }
  }

  // 3) Pause annonse (Google + Meta) — sløsing uten konvertering.
  for (const a of [...googleAds, ...metaAds]) {
    if (a.conversions > 0) continue;
    const st = String(a.status).toUpperCase();
    const active = a.channel === 'meta' ? st === 'ACTIVE' : st === 'ENABLED';
    if (!active) continue;
    if (a.cost >= c.wasteAdCost) {
      recs.push({
        id: recId('pause_ad', `${a.channel}-${a.id}`),
        channel: a.channel, type: 'pause_ad',
        severity: a.cost >= c.wasteAdCost * 2 ? 'high' : 'medium',
        title: `Vurder å pause annonse: «${(a.name || '').slice(0, 60)}»`,
        rationale: `Annonsen i «${a.campaign}» har brukt ${round2(a.cost)} kr på ${a.clicks} klikk uten konvertering.`,
        metrics: { cost: a.cost, clicks: a.clicks, conversions: 0, ctr: a.ctr },
        estimatedSaving: round2(a.cost),
        action: a.channel === 'meta'
          ? { kind: 'pause_ad', payload: { channel: 'meta', adId: a.id } }
          : { kind: 'pause_ad', payload: { channel: 'google', resourceName: a.resourceName } },
      });
    }
  }

  // 4) Lav CTR → AI-kreativforslag (Google).
  for (const a of googleAds) {
    if (String(a.status).toUpperCase() !== 'ENABLED') continue;
    if (a.impressions >= c.lowCtrMinImpr && a.ctr > 0 && a.ctr < c.lowCtr) {
      recs.push({
        id: recId('ai_refresh', `google-${a.id}`),
        channel: 'google', type: 'ai_refresh',
        severity: 'low',
        title: `Lav CTR (${a.ctr}%) — forny annonseteksten`,
        rationale: `Annonsen i «${a.adGroup}» har ${a.impressions} visninger men kun ${a.ctr}% CTR. Test nye AI-genererte titler/beskrivelser.`,
        metrics: { impressions: a.impressions, ctr: a.ctr, clicks: a.clicks },
        action: { kind: 'ai_refresh', payload: { adGroup: a.adGroup, campaign: a.campaign, theme: a.adGroup } },
      });
    }
  }

  // 5) Skaler budsjett på vinnere (Google kampanjer m/ høy ROAS).
  const byCamp = new Map();
  for (const a of googleAds) {
    if (!a.campaign) continue;
    const o = byCamp.get(a.campaign) || { cost: 0, conversions: 0, convValue: 0 };
    o.cost += a.cost; o.conversions += a.conversions; o.convValue += a.convValue;
    byCamp.set(a.campaign, o);
  }
  for (const camp of campaigns) {
    const roll = byCamp.get(camp.name);
    if (!roll || roll.conversions < 1) continue;
    const roas = roll.cost > 0 ? roll.convValue / roll.cost : 0;
    if (roas >= c.scaleRoas && camp.dailyBudget > 0 && camp.budgetResourceName) {
      const newBudget = round2(camp.dailyBudget * 1.2);
      recs.push({
        id: recId('scale_budget', camp.id || camp.name),
        channel: 'google', type: 'scale_budget',
        severity: 'medium',
        title: `Skaler budsjett +20%: «${camp.name}»`,
        rationale: `Kampanjen har ROAS ${round2(roas)}× (${round2(roll.convValue)} kr verdi / ${round2(roll.cost)} kr forbruk). Øk dagsbudsjett fra ${camp.dailyBudget} til ${newBudget} kr for mer volum.`,
        metrics: { roas: round2(roas), cost: round2(roll.cost), conversions: round2(roll.conversions), dailyBudget: camp.dailyBudget },
        action: { kind: 'scale_budget', payload: { budgetResourceName: camp.budgetResourceName, currentBudget: camp.dailyBudget, newBudget } },
      });
    }
  }

  const sev = { high: 3, medium: 2, low: 1 };
  recs.sort((a, b) => (sev[b.severity] - sev[a.severity]) || ((b.estimatedSaving || 0) - (a.estimatedSaving || 0)));
  return recs;
}
