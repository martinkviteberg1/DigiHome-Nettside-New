// ---------------------------------------------------------------------------
// LLM-kostnadssporing (self-metering).
//
// Emergent LLM-gatewayen er OpenAI-kompatibel og returnerer `usage` (tokens)
// i hvert svar. Vi logger tokens per kall og priser dem mot en liten prisliste
// per modell → per-funksjon LLM-kostnad i sanntid. Beløpet er et ESTIMAT av
// underliggende modellkostnad (Emergent fakturerer i kreditter som kan avvike),
// men er presist nok for trend/attribusjon i økonomimodulen.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';

export const LLM_USAGE_COLL = 'llm_usage';

// Pris per 1M tokens (USD) — leverandørenes listepriser (estimat, oppdater ved behov).
const PRICING = {
  'gpt-4o-mini': { in: 0.15, out: 0.60 },
  'gpt-4o': { in: 2.5, out: 10 },
  'gpt-4.1': { in: 2.0, out: 8 },
  'gpt-4.1-mini': { in: 0.4, out: 1.6 },
  'gpt-4.1-nano': { in: 0.1, out: 0.4 },
  'o4-mini': { in: 1.1, out: 4.4 },
  default: { in: 0.15, out: 0.60 },
};

// Fast USD→NOK-kurs (estimat). Kan justeres sentralt.
export const USD_TO_NOK = 11;

const r = (x, d = 6) => { const m = Math.pow(10, d); return Math.round((Number(x) || 0) * m) / m; };

export function priceUsage(model, promptTokens, completionTokens) {
  const p = PRICING[model] || PRICING.default;
  const usd = (Number(promptTokens) || 0) / 1e6 * p.in + (Number(completionTokens) || 0) / 1e6 * p.out;
  return { usd: r(usd, 6), nok: r(usd * USD_TO_NOK, 4) };
}

// Fire-and-forget logging (kalles fra chatLLM). Feiler stille.
export async function logLlmUsage(db, { model, feature, usage, provider } = {}) {
  try {
    if (!db || !usage) return;
    const pt = Number(usage.prompt_tokens) || 0;
    const ct = Number(usage.completion_tokens) || 0;
    const tt = Number(usage.total_tokens) || (pt + ct);
    const price = priceUsage(model, pt, ct);
    await db.collection(LLM_USAGE_COLL).insertOne({
      id: uuidv4(),
      at: new Date().toISOString(),
      model: (model || 'unknown').toString().slice(0, 60),
      feature: (feature || 'general').toString().slice(0, 60),
      provider: (provider || 'emergent').toString().slice(0, 30),
      promptTokens: pt,
      completionTokens: ct,
      totalTokens: tt,
      costUsd: price.usd,
      costNok: price.nok,
    });
  } catch (_) { /* stille */ }
}

// Aggregert LLM-kostnad siste N dager (NOK) + per funksjon + per modell.
export async function summarizeLlmUsage(db, days = 30) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  try {
    const agg = await db.collection(LLM_USAGE_COLL).aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: null, calls: { $sum: 1 }, tokens: { $sum: '$totalTokens' }, costNok: { $sum: '$costNok' }, costUsd: { $sum: '$costUsd' } } },
    ]).toArray();
    const byFeature = await db.collection(LLM_USAGE_COLL).aggregate([
      { $match: { at: { $gte: since } } },
      { $group: { _id: '$feature', calls: { $sum: 1 }, tokens: { $sum: '$totalTokens' }, costNok: { $sum: '$costNok' } } },
      { $sort: { costNok: -1 } },
    ]).toArray();
    const a = agg[0] || { calls: 0, tokens: 0, costNok: 0, costUsd: 0 };
    return {
      days,
      calls: a.calls || 0,
      tokens: a.tokens || 0,
      costNok: Math.round((a.costNok || 0) * 100) / 100,
      costUsd: Math.round((a.costUsd || 0) * 10000) / 10000,
      byFeature: byFeature.map((f) => ({ feature: f._id || 'general', calls: f.calls, tokens: f.tokens, costNok: Math.round((f.costNok || 0) * 100) / 100 })),
    };
  } catch (_) {
    return { days, calls: 0, tokens: 0, costNok: 0, costUsd: 0, byFeature: [] };
  }
}
