// ---------------------------------------------------------------------------
// LLM-kostnadssporing (self-metering) + modelloverstyring per funksjon.
//
// Hvert vellykkede LLM-kall logges i `llm_usage` med tokens, leverandør,
// funksjon (feature) og estimert pris (USD/NOK). Bildegenerering logges som
// kind:'image' med flat pris per bilde. Beløpene er ESTIMATER av underliggende
// modellkostnad (Emergent fakturerer i kreditter som kan avvike), men er
// presise nok for trend/attribusjon i økonomimodulen.
//
// Modelloverstyring: admin kan velge tekstmodell PER funksjon fra UI.
// Lagres i `llm_settings` (doc key='model_overrides') og slås opp av chatLLM
// via resolveModelForFeature() med 60s in-memory cache.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';

export const LLM_USAGE_COLL = 'llm_usage';
export const LLM_SETTINGS_COLL = 'llm_settings';

export const DEFAULT_MODEL = 'gpt-4o-mini';

// Tekstmodeller som kan velges per funksjon fra UI (OpenAI-priser per 1M tokens, USD).
export const AVAILABLE_MODELS = [
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', in: 0.15, out: 0.60, note: 'Standard — rask og billig' },
  { id: 'gpt-4.1-nano', label: 'GPT-4.1 nano', in: 0.10, out: 0.40, note: 'Billigst i 4.1-serien' },
  { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini', in: 0.40, out: 1.60, note: 'God balanse pris/kvalitet' },
  { id: 'gpt-4.1', label: 'GPT-4.1', in: 2.00, out: 8.00, note: 'Produksjonsmodell — høy kvalitet' },
  { id: 'gpt-5-nano', label: 'GPT-5 nano', in: 0.05, out: 0.40, note: 'Nyeste generasjon — ultrabillig' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', in: 0.25, out: 2.00, note: 'Nyeste generasjon — sterk til prisen' },
  { id: 'gpt-5', label: 'GPT-5', in: 1.25, out: 10.00, note: 'Flaggskip — beste kvalitet' },
  { id: 'o4-mini', label: 'o4-mini', in: 0.55, out: 2.20, note: 'Resonneringsmodell' },
];

// Modeller vi kan FORESPØRRE for plattform-CRM-ets funksjoner (via Agent-broen).
// Plattformen bruker Emergent-universalnøkkelen (OpenAI + Anthropic + Gemini) og
// validerer selv — ukjente modeller besvares med model_override_rejected.
export const PLATFORM_MODELS = [
  { id: 'gpt-5.4', label: 'GPT-5.4', note: 'OpenAI — flaggskip' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', note: 'OpenAI — sterk til prisen' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini', note: 'OpenAI — ultrabillig' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', note: 'Anthropic — sterk tekst' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', note: 'Anthropic — rask/billig' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', note: 'Google — høy kvalitet' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', note: 'Google — rask/billig' },
];

// Pris per 1M tokens (USD) — bygget fra AVAILABLE_MODELS + legacy-modeller.
const PRICING = Object.fromEntries(AVAILABLE_MODELS.map((m) => [m.id, { in: m.in, out: m.out }]));
PRICING['gpt-4o'] = { in: 2.5, out: 10 };
PRICING.default = { in: 0.15, out: 0.60 };

// Flat pris per generert bilde (USD) — Gemini/Nano Banana via Emergent-gatewayen.
const IMAGE_PRICING = {
  'gemini-3-pro-image-preview': 0.134,
  'gemini-2.5-flash-image': 0.039,
  default: 0.04,
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
      kind: 'text',
      model: (model || 'unknown').toString().slice(0, 60),
      feature: (feature || 'general').toString().slice(0, 60),
      provider: (provider || 'emergent').toString().slice(0, 30),
      promptTokens: pt,
      completionTokens: ct,
      totalTokens: tt,
      images: 0,
      costUsd: price.usd,
      costNok: price.nok,
    });
  } catch (_) { /* stille */ }
}

// Logg bildegenerering (flat pris per bilde). Fire-and-forget.
export async function logImageUsage(db, { model, feature, provider = 'emergent', count = 1 } = {}) {
  try {
    if (!db) return;
    const n = Math.max(1, Number(count) || 1);
    const usd = r((IMAGE_PRICING[model] != null ? IMAGE_PRICING[model] : IMAGE_PRICING.default) * n, 6);
    await db.collection(LLM_USAGE_COLL).insertOne({
      id: uuidv4(),
      at: new Date().toISOString(),
      kind: 'image',
      model: (model || 'unknown').toString().slice(0, 60),
      feature: (feature || 'general').toString().slice(0, 60),
      provider: (provider || 'emergent').toString().slice(0, 30),
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      images: n,
      costUsd: usd,
      costNok: r(usd * USD_TO_NOK, 4),
    });
  } catch (_) { /* stille */ }
}

// --- Modelloverstyring per funksjon --------------------------------------
let _ovCache = { at: 0, map: {} };

export async function getModelOverrides(db) {
  try {
    const doc = await db.collection(LLM_SETTINGS_COLL).findOne({ key: 'model_overrides' }, { projection: { _id: 0 } });
    return (doc && doc.overrides) || {};
  } catch (_) { return {}; }
}

export async function setModelOverride(db, feature, model) {
  const f = String(feature || '').trim().slice(0, 60);
  if (!f) throw new Error('Mangler feature');
  if (model) {
    await db.collection(LLM_SETTINGS_COLL).updateOne(
      { key: 'model_overrides' },
      { $set: { [`overrides.${f}`]: String(model).slice(0, 60), updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  } else {
    await db.collection(LLM_SETTINGS_COLL).updateOne(
      { key: 'model_overrides' },
      { $unset: { [`overrides.${f}`]: '' }, $set: { updatedAt: new Date().toISOString() } },
      { upsert: true }
    );
  }
  invalidateOverrideCache();
}

export function invalidateOverrideCache() { _ovCache = { at: 0, map: {} }; }

// Slås opp av chatLLM før hvert kall (60s cache → én DB-lesing per minutt).
export async function resolveModelForFeature(db, feature, fallback) {
  const now = Date.now();
  if (now - _ovCache.at > 60000) {
    try {
      const doc = await db.collection(LLM_SETTINGS_COLL).findOne({ key: 'model_overrides' }, { projection: { _id: 0, overrides: 1 } });
      _ovCache = { at: now, map: (doc && doc.overrides) || {} };
    } catch (_) { _ovCache.at = now; }
  }
  return _ovCache.map[feature] || fallback;
}

// --- Aggregeringer ---------------------------------------------------------

// Aggregert LLM-kostnad siste N dager (NOK) + per funksjon (brukes av økonomimodulen).
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

// Fullt dashbord: totaler, per leverandør, per modell, per funksjon (m/ modellfordeling
// og daglig serie for sparkline) + daglig totalserie. Brukes av API-forbruk-panelet.
export async function computeLlmUsageDashboard(db, days = 30) {
  const sinceMs = Date.now() - days * 86400000;
  const since = new Date(sinceMs).toISOString();
  let rows = [];
  try {
    rows = await db.collection(LLM_USAGE_COLL)
      .find({ at: { $gte: since } }, { projection: { _id: 0, at: 1, model: 1, feature: 1, provider: 1, totalTokens: 1, images: 1, costNok: 1, costUsd: 1, kind: 1 } })
      .limit(50000).toArray();
  } catch (_) { rows = []; }

  const totals = { calls: 0, tokens: 0, images: 0, costNok: 0, costUsd: 0 };
  const provMap = new Map(); const modelMap = new Map(); const featMap = new Map(); const dayMap = new Map();

  for (const row of rows) {
    const nok = Number(row.costNok) || 0;
    const usd = Number(row.costUsd) || 0;
    const tokens = Number(row.totalTokens) || 0;
    const images = Number(row.images) || 0;
    const kind = row.kind === 'image' ? 'image' : 'text';
    const day = String(row.at || '').slice(0, 10);
    const provider = row.provider || 'emergent';
    const model = row.model || 'unknown';
    const feature = row.feature || 'general';

    totals.calls += 1; totals.tokens += tokens; totals.images += images; totals.costNok += nok; totals.costUsd += usd;
    dayMap.set(day, (dayMap.get(day) || 0) + nok);

    const p = provMap.get(provider) || { provider, calls: 0, tokens: 0, images: 0, costNok: 0 };
    p.calls += 1; p.tokens += tokens; p.images += images; p.costNok += nok; provMap.set(provider, p);

    const mKey = model;
    const m = modelMap.get(mKey) || { model, kind, calls: 0, tokens: 0, images: 0, costNok: 0 };
    m.calls += 1; m.tokens += tokens; m.images += images; m.costNok += nok; modelMap.set(mKey, m);

    const f = featMap.get(feature) || { feature, kind, calls: 0, tokens: 0, images: 0, costNok: 0, _models: new Map(), _days: new Map() };
    f.calls += 1; f.tokens += tokens; f.images += images; f.costNok += nok;
    if (kind === 'image') f.kind = 'image';
    const fm = f._models.get(mKey) || { model, calls: 0, tokens: 0, images: 0, costNok: 0 };
    fm.calls += 1; fm.tokens += tokens; fm.images += images; fm.costNok += nok; f._models.set(mKey, fm);
    f._days.set(day, (f._days.get(day) || 0) + nok);
    featMap.set(feature, f);
  }

  // Kontinuerlig dagsakse (maks 60 punkter for sparkline)
  const windowDays = Math.min(days, 60);
  const dayKeys = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    dayKeys.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
  }

  const r2 = (x) => Math.round((Number(x) || 0) * 10000) / 10000;
  const byFeature = [...featMap.values()].map((f) => ({
    feature: f.feature,
    kind: f.kind,
    calls: f.calls,
    tokens: f.tokens,
    images: f.images,
    costNok: r2(f.costNok),
    models: [...f._models.values()].map((m) => ({ ...m, costNok: r2(m.costNok) })).sort((a, b) => b.costNok - a.costNok),
    series: dayKeys.map((d) => ({ day: d, value: r2(f._days.get(d) || 0) })),
  })).sort((a, b) => b.costNok - a.costNok);

  return {
    days,
    totals: { calls: totals.calls, tokens: totals.tokens, images: totals.images, costNok: r2(totals.costNok), costUsd: r2(totals.costUsd) },
    byProvider: [...provMap.values()].map((p) => ({ ...p, costNok: r2(p.costNok) })).sort((a, b) => b.costNok - a.costNok),
    byModel: [...modelMap.values()].map((m) => ({ ...m, costNok: r2(m.costNok) })).sort((a, b) => b.costNok - a.costNok),
    byFeature,
    series: dayKeys.map((d) => ({ day: d, value: r2(dayMap.get(d) || 0) })),
  };
}
