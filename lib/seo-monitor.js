// ---------------------------------------------------------------------------
// SEO & AEO-motor — måler DigiHomes synlighet i Google OG i AI-svarmotorer.
//
// Tre måleløp (alle lagres med runId + historikk for trend):
//  1) RANK  (SerpApi google-søk fra Bergen): posisjon per nøkkelord, topp-10-
//     konkurrenter og AI Overview-tilstedeværelse/-sitering.
//     KVOTE-BEVISST: SerpApi-gratisplan ~100 søk/mnd (deles med konkurrent-
//     galleriet) → maks 15 nøkkelord/kjøring, forbruk telles i ext_usage.
//  2) AEO   (OpenAI): stiller ekte kundespørsmål («beste utleiemegler i
//     Bergen?») både mot modellkunnskap (gpt-4o-mini) og web-søk
//     (gpt-4o-search-preview m/ siteringer) — måler om DigiHome nevnes/siteres.
//  3) TECH  (egen crawler): henter sitemap.xml fra prod-domenet og reviderer
//     hver side (tittel, meta, canonical, H1, schema, alt-tekster, noindex …)
//     med score 0–100 og konkrete funn per side.
// ---------------------------------------------------------------------------
import { v4 as uuidv4 } from 'uuid';
import { logExtUsage } from '@/lib/ext-usage';
import { logLlmUsage } from '@/lib/llm-usage';
import { chatLLM } from '@/lib/llm';
import { site } from '@/lib/site';

export const RANK_COLL = 'seo_rank_checks';
export const AEO_COLL = 'seo_aeo_checks';
export const TECH_COLL = 'seo_tech_audits';

const OUR_DOMAIN = 'digihome.no';
const MAX_KEYWORDS = 15;
const MAX_QUESTIONS = 30;
const MAX_AUDIT_PAGES = 45;

// Standardoppsett — kommersielle Bergen-søk der kunder faktisk leter,
// + AEO-spørsmål formulert slik ekte boligeiere spør en AI-assistent.
export const DEFAULT_SEO_CONFIG = {
  keywords: [
    'utleiemegler bergen',
    'eiendomsforvaltning bergen',
    'utleieforvaltning bergen',
    'airbnb forvaltning bergen',
    'leie ut bolig bergen',
    'leie ut leilighet bergen',
    'utleie av bolig bergen',
    'korttidsutleie bergen',
    'hva koster utleiemegler',
    'airbnb utleie bergen',
  ],
  aeoQuestions: [
    'Hva er DigiHome, og hvem står bak selskapet?',
    'Er DigiHome i Bergen et seriøst selskap for utleieforvaltning?',
    'Hvem er den beste utleiemegleren i Bergen?',
    'Hvilke selskaper tilbyr full utleieforvaltning i Bergen?',
    'Hva koster det å bruke utleiemegler i Bergen?',
    'Hva er forskjellen på utleiemegler og selvforvaltning?',
    'Hvordan kan jeg leie ut leiligheten min i Bergen uten å gjøre jobben selv?',
    'Hvem tilbyr Airbnb-forvaltning i Bergen?',
    'Hvor mange dager kan jeg leie ut hele leiligheten på Airbnb i et sameie?',
    'Hvor mange dager kan jeg korttidsutleie en bolig i borettslag?',
    'Hvordan beskattes utleieinntekt fra egen bolig?',
    'Hvordan beskattes utleie av sekundærbolig?',
    'Hva er reglene for depositumskonto ved utleie?',
    'Hva gjør jeg hvis leietaker ikke har betalt depositum?',
    'Kan depositum stå på utleiers private konto?',
    'Hva er vanlig leiepris for en 2-roms i Bergen?',
    'Hvilke bydeler i Bergen har høy etterspørsel etter leieboliger?',
    'Hvem kan hjelpe meg med å leie ut bolig i Åsane?',
    'Hvem kan hjelpe meg med å leie ut bolig i Fana?',
    'Hva er 10+2-modellen for utleie, og når er den lovlig?',
  ],
  competitors: [
    'utleiemegleren', 'cityhost', 'roomsly', 'smidle', 'rentola',
    'hybel.no', 'husleie.no', 'heimstaden', 'leieboligbergen', 'utleiehjelpen',
  ],
};

const s = (v, n = 300) => (v == null ? '' : String(v).slice(0, n));
const cleanList = (arr, max, itemLen = 120) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => s(x, itemLen).trim())
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .slice(0, max);

// --- Konfig (settings-collection, key 'seo_config') -----------------------
export async function getSeoConfig(db) {
  let doc = null;
  try { doc = await db.collection('settings').findOne({ key: 'seo_config' }); } catch (_) { /* standardkonfig brukes hvis DB er utilgjengelig */ }
  const v = (doc && doc.value) || {};
  const savedQuestions = cleanList(v.aeoQuestions, MAX_QUESTIONS, 200);
  return {
    keywords: cleanList(v.keywords, MAX_KEYWORDS).length ? cleanList(v.keywords, MAX_KEYWORDS) : DEFAULT_SEO_CONFIG.keywords,
    // Nye overvåkingsspørsmål legges automatisk til eldre lagret konfig, uten
    // å overskrive eller duplisere brukerens egne spørsmål.
    aeoQuestions: cleanList([...savedQuestions, ...DEFAULT_SEO_CONFIG.aeoQuestions], MAX_QUESTIONS, 200),
    competitors: cleanList(v.competitors, 20).length ? cleanList(v.competitors, 20) : DEFAULT_SEO_CONFIG.competitors,
  };
}

export async function saveSeoConfig(db, patch) {
  const cur = await getSeoConfig(db);
  const next = {
    keywords: patch.keywords !== undefined ? cleanList(patch.keywords, MAX_KEYWORDS) : cur.keywords,
    aeoQuestions: patch.aeoQuestions !== undefined ? cleanList(patch.aeoQuestions, MAX_QUESTIONS, 200) : cur.aeoQuestions,
    competitors: patch.competitors !== undefined ? cleanList(patch.competitors, 20) : cur.competitors,
  };
  if (!next.keywords.length) next.keywords = DEFAULT_SEO_CONFIG.keywords;
  if (!next.aeoQuestions.length) next.aeoQuestions = DEFAULT_SEO_CONFIG.aeoQuestions;
  await db.collection('settings').updateOne(
    { key: 'seo_config' },
    { $set: { key: 'seo_config', value: next, updatedAt: new Date().toISOString() } },
    { upsert: true },
  );
  return next;
}

// --- 1) RANK: SerpApi-posisjonssjekk ---------------------------------------
async function serpGoogleSearch(db, keyword) {
  const u = new URL('https://serpapi.com/search.json');
  u.searchParams.set('api_key', process.env.SERPAPI_KEY);
  u.searchParams.set('engine', 'google');
  u.searchParams.set('q', keyword);
  u.searchParams.set('location', 'Bergen, Hordaland, Norway');
  u.searchParams.set('google_domain', 'google.no');
  u.searchParams.set('hl', 'no');
  u.searchParams.set('gl', 'no');
  u.searchParams.set('num', '30');
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 25000);
  try {
    const res = await fetch(u.toString(), { signal: ctrl.signal });
    logExtUsage(db, 'serpapi', 1); // fire-and-forget kvotetelling
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) throw new Error(j.error || `SerpApi HTTP ${res.status}`);
    return j;
  } finally { clearTimeout(t); }
}

const hostOf = (link) => { try { return new URL(link).hostname.replace(/^www\./, ''); } catch (_) { return ''; } };

export async function runRankCheck(db, { keywords } = {}) {
  if (!process.env.SERPAPI_KEY) return { ok: false, error: 'SERPAPI_KEY mangler' };
  const cfg = await getSeoConfig(db);
  const list = cleanList(keywords && keywords.length ? keywords : cfg.keywords, MAX_KEYWORDS);
  const runId = uuidv4();
  const checkedAt = new Date().toISOString();
  const results = [];
  let used = 0;

  for (const keyword of list) {
    let doc = { id: uuidv4(), runId, keyword, checkedAt };
    try {
      const j = await serpGoogleSearch(db, keyword);
      used++;
      const organic = Array.isArray(j.organic_results) ? j.organic_results : [];
      const ours = organic.find((r) => (r.link || '').includes(OUR_DOMAIN));
      const ai = j.ai_overview || null;
      doc = {
        ...doc,
        position: ours ? Number(ours.position) || null : null,
        url: ours ? s(ours.link, 300) : null,
        totalShown: organic.length,
        top: organic.slice(0, 10).map((r) => ({ position: Number(r.position) || null, domain: hostOf(r.link), title: s(r.title, 120) })),
        aiPresent: !!ai,
        aiCited: !!ai && JSON.stringify(ai).toLowerCase().includes(OUR_DOMAIN),
      };
    } catch (e) {
      doc.error = s(e.message, 200);
    }
    await db.collection(RANK_COLL).insertOne({ ...doc });
    const { _id, ...rest } = doc;
    results.push(rest);
  }
  return { ok: true, runId, checkedAt, searchesUsed: used, results };
}

// --- 2) AEO: AI-synlighet (modellkunnskap + web-søk med siteringer) --------
function mentionsUs(text) { return /digihome/i.test(text || ''); }
function competitorsIn(text, competitors) {
  const t = (text || '').toLowerCase();
  return competitors.filter((c) => t.includes(c.toLowerCase().replace(/\.no$/, '')));
}

// gpt-4o-search-preview via chat/completions: ekte web-søk + url_citation-
// annotasjoner — nærmest mulig det ChatGPT-med-søk faktisk viser brukere.
async function webSearchAnswer(db, question) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { available: false, error: 'OPENAI_API_KEY mangler' };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-search-preview',
        web_search_options: { user_location: { type: 'approximate', approximate: { country: 'NO', city: 'Bergen' } } },
        messages: [{ role: 'user', content: question }],
        max_tokens: 600,
      }),
      signal: ctrl.signal,
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) return { available: false, error: s((j.error && j.error.message) || `HTTP ${res.status}`, 200) };
    const msg = (j.choices && j.choices[0] && j.choices[0].message) || {};
    const content = msg.content || '';
    const citations = (Array.isArray(msg.annotations) ? msg.annotations : [])
      .filter((a) => a.type === 'url_citation' && a.url_citation)
      .map((a) => ({ url: s(a.url_citation.url, 300), title: s(a.url_citation.title, 140) }));
    if (j.usage) logLlmUsage(db, { model: 'gpt-4o-search-preview', feature: 'seo-aeo', usage: j.usage, provider: 'openai' });
    return { available: true, content, citations };
  } catch (e) {
    return { available: false, error: s(e.message, 200) };
  } finally { clearTimeout(t); }
}

export async function runAeoCheck(db, { questions } = {}) {
  const cfg = await getSeoConfig(db);
  const list = cleanList(questions && questions.length ? questions : cfg.aeoQuestions, MAX_QUESTIONS, 200);
  const runId = uuidv4();
  const checkedAt = new Date().toISOString();
  const results = [];

  for (const question of list) {
    const doc = { id: uuidv4(), runId, question, checkedAt, model: null, web: null };

    // (a) Modellkunnskap — hva «vet» modellen uten å søke (treningsdata-synlighet).
    try {
      const answer = await chatLLM({
        messages: [
          { role: 'system', content: 'Du er en hjelpsom assistent. Svar kort på norsk. Nevn konkrete selskaper/tjenester ved navn der det er relevant for spørsmålet.' },
          { role: 'user', content: question },
        ],
        model: 'gpt-4o-mini', maxTokens: 400, feature: 'seo-aeo',
      });
      doc.model = { mentions: mentionsUs(answer), competitors: competitorsIn(answer, cfg.competitors), snippet: s(answer, 700) };
    } catch (e) {
      doc.model = { error: s(e.message, 200) };
    }

    // (b) Web-søk — hva svarer en søkende AI-motor i dag, og hvem siteres?
    const web = await webSearchAnswer(db, question);
    if (web.available) {
      const mentionedUs = mentionsUs(web.content);
      const citedUs = (web.citations || []).some((c) => (c.url || '').includes(OUR_DOMAIN));
      doc.web = {
        available: true,
        mentions: mentionedUs,
        cited: citedUs,
        citations: (web.citations || []).slice(0, 8),
        competitors: competitorsIn(web.content, cfg.competitors),
        snippet: s(web.content, 700),
      };
    } else {
      doc.web = { available: false, error: web.error };
    }

    await db.collection(AEO_COLL).insertOne({ ...doc });
    const { _id, ...rest } = doc;
    results.push(rest);
  }

  const withWeb = results.filter((r) => r.web && r.web.available);
  const summary = {
    questions: results.length,
    modelMentionRate: results.length ? Math.round((results.filter((r) => r.model && r.model.mentions).length / results.length) * 100) : 0,
    webMentionRate: withWeb.length ? Math.round((withWeb.filter((r) => r.web && r.web.mentions).length / withWeb.length) * 100) : null,
    webCitationRate: withWeb.length ? Math.round((withWeb.filter((r) => r.web && r.web.cited).length / withWeb.length) * 100) : null,
    modelMentions: results.filter((r) => r.model && r.model.mentions).length,
    webMentions: withWeb.filter((r) => r.web && r.web.mentions).length,
    webCitations: withWeb.filter((r) => r.web && r.web.cited).length,
  };
  return { ok: true, runId, checkedAt, summary, results };
}

// --- 3) TECH: revisjon av egne sider (sitemap-crawl) ------------------------
async function fetchText(url, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'DigiHomeSEOAudit/1.0 (+https://digihome.no)' }, redirect: 'follow' });
    const text = await res.text();
    return { status: res.status, text };
  } finally { clearTimeout(t); }
}

const pick = (html, re) => { const m = html.match(re); return m ? m[1] : null; };

function auditPage(url, status, html) {
  const issues = [];
  const add = (sev, msg) => issues.push({ sev, msg });
  if (status !== 200) { add('error', `HTTP ${status}`); return { score: 0, issues, metrics: { status } }; }

  const head = html.slice(0, 200000);
  const title = pick(head, /<title[^>]*>([^<]*)<\/title>/i) || '';
  const metaDesc = pick(head, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i) || pick(head, /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) || '';
  const canonical = pick(head, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i) || pick(head, /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i) || '';
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(head);
  const ogImage = /<meta[^>]+property=["']og:image["']/i.test(head);
  const langOk = /<html[^>]+lang=["'](nb|no|nb-NO)/i.test(head);
  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  const jsonLdTypes = Array.from(new Set((html.match(/"@type"\s*:\s*"([^"]+)"/g) || []).map((x) => x.replace(/.*"@type"\s*:\s*"([^"]+)".*/, '$1')))).slice(0, 12);
  const imgs = (html.match(/<img\s[^>]*>/gi) || []);
  const imgsNoAlt = imgs.filter((tag) => !/\salt=["'][^"']+["']/i.test(tag)).length;
  const textOnly = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ');
  const wordCount = (textOnly.match(/[a-zA-ZæøåÆØÅ]{3,}/g) || []).length;
  const internalLinks = (html.match(/href=["']\/(?!\/)[^"']*/g) || []).length;

  if (!title) add('error', 'Mangler <title>');
  else if (title.length > 65) add('warn', `Tittel for lang (${title.length} tegn, mål ≤ 60)`);
  else if (title.length < 15) add('warn', `Tittel for kort (${title.length} tegn)`);
  if (!metaDesc) add('error', 'Mangler meta description');
  else if (metaDesc.length > 165) add('warn', `Meta description for lang (${metaDesc.length} tegn, mål ≤ 160)`);
  else if (metaDesc.length < 50) add('warn', `Meta description for kort (${metaDesc.length} tegn)`);
  if (!canonical) add('warn', 'Mangler canonical-lenke');
  if (noindex) add('error', 'Siden har noindex — utestengt fra Google');
  if (h1s === 0) add('error', 'Mangler H1');
  else if (h1s > 1) add('warn', `${h1s} H1-elementer (bør være 1)`);
  if (!jsonLdTypes.length) add('warn', 'Ingen strukturerte data (JSON-LD)');
  if (!ogImage) add('info', 'Mangler og:image (delbilde i sosiale medier)');
  if (!langOk) add('info', 'html lang er ikke nb/no');
  if (imgsNoAlt > 0) add('warn', `${imgsNoAlt} av ${imgs.length} bilder mangler alt-tekst`);
  if (wordCount < 150) add('warn', `Tynt innhold (~${wordCount} ord)`);
  if (internalLinks < 3) add('info', 'Få interne lenker (< 3)');

  let score = 100;
  for (const i of issues) score -= i.sev === 'error' ? 25 : i.sev === 'warn' ? 10 : 3;
  score = Math.max(0, score);

  return {
    score,
    issues,
    metrics: {
      status, titleLength: title.length, title: s(title, 120), metaDescLength: metaDesc.length,
      canonical: s(canonical, 200), h1Count: h1s, jsonLdTypes, imgCount: imgs.length, imgsNoAlt,
      wordCount, internalLinks, ogImage, noindex,
    },
  };
}

export async function runTechAudit(db, { limit } = {}) {
  const base = site.url; // reviderer PROD — det er den Google faktisk ser
  const runId = uuidv4();
  const runAt = new Date().toISOString();

  let urls = [];
  try {
    const { status, text } = await fetchText(`${base}/sitemap.xml`);
    if (status !== 200) throw new Error(`sitemap.xml HTTP ${status}`);
    urls = Array.from(text.matchAll(/<loc>([^<]+)<\/loc>/g)).map((m) => m[1].trim()).filter(Boolean);
  } catch (e) {
    return { ok: false, error: `Klarte ikke hente sitemap: ${e.message}` };
  }
  const cap = Math.min(Number(limit) > 0 ? Number(limit) : MAX_AUDIT_PAGES, MAX_AUDIT_PAGES);
  urls = urls.slice(0, cap);

  const pages = [];
  const batch = 5; // skånsom parallellitet mot egen prod
  for (let i = 0; i < urls.length; i += batch) {
    const chunk = urls.slice(i, i + batch);
    const settled = await Promise.allSettled(chunk.map(async (url) => {
      const { status, text } = await fetchText(url);
      return { url, ...auditPage(url, status, text) };
    }));
    for (let k = 0; k < settled.length; k++) {
      const st = settled[k];
      if (st.status === 'fulfilled') pages.push(st.value);
      else pages.push({ url: chunk[k], score: 0, issues: [{ sev: 'error', msg: s(st.reason && st.reason.message, 160) || 'Uthenting feilet' }], metrics: {} });
    }
  }

  const avgScore = pages.length ? Math.round(pages.reduce((a, p) => a + p.score, 0) / pages.length) : 0;
  const totals = { error: 0, warn: 0, info: 0 };
  for (const p of pages) for (const i of p.issues) totals[i.sev] = (totals[i.sev] || 0) + 1;

  const doc = { id: runId, runAt, base, pageCount: pages.length, avgScore, totals, pages };
  await db.collection(TECH_COLL).insertOne({ ...doc });
  return { ok: true, ...doc };
}

// --- Samlet oversikt (dashboard-data) ---------------------------------------
export async function getSeoOverview(db) {
  const cfg = await getSeoConfig(db);

  // Rank: siste + forrige kjøring (delta) + posisjonshistorikk per nøkkelord.
  const rankDocs = await db.collection(RANK_COLL).find({}, { projection: { _id: 0 } }).sort({ checkedAt: -1 }).limit(400).toArray();
  const runIds = [];
  for (const d of rankDocs) if (!runIds.includes(d.runId)) runIds.push(d.runId);
  const latestRun = runIds[0] || null;
  const prevRun = runIds[1] || null;
  const latest = rankDocs.filter((d) => d.runId === latestRun);
  const prevMap = new Map(rankDocs.filter((d) => d.runId === prevRun).map((d) => [d.keyword, d.position]));
  const rank = {
    checkedAt: latest[0] ? latest[0].checkedAt : null,
    runCount: runIds.length,
    keywords: latest.map((d) => ({
      keyword: d.keyword, position: d.position ?? null, url: d.url || null,
      delta: d.position != null && prevMap.get(d.keyword) != null ? prevMap.get(d.keyword) - d.position : null,
      top: d.top || [], aiPresent: !!d.aiPresent, aiCited: !!d.aiCited, totalShown: d.totalShown || 0, error: d.error || null,
    })),
    history: {},
  };
  // Historikk: siste 12 kjøringer per nøkkelord, eldst → nyest. null = utenfor topp 30.
  const hist = {};
  for (const d of rankDocs) {
    if (!hist[d.keyword]) hist[d.keyword] = [];
    if (hist[d.keyword].length < 12) hist[d.keyword].push({ at: d.checkedAt, position: d.position ?? null });
  }
  for (const k of Object.keys(hist)) rank.history[k] = hist[k].reverse();

  // AEO: siste kjøring + nevn-rate-historikk.
  const aeoDocs = await db.collection(AEO_COLL).find({}, { projection: { _id: 0 } }).sort({ checkedAt: -1 }).limit(200).toArray();
  const aeoRunIds = [];
  for (const d of aeoDocs) if (!aeoRunIds.includes(d.runId)) aeoRunIds.push(d.runId);
  const aeoLatest = aeoDocs.filter((d) => d.runId === aeoRunIds[0]);
  const aeoHistory = aeoRunIds.slice(0, 12).map((rid) => {
    const docs = aeoDocs.filter((d) => d.runId === rid);
    const withWeb = docs.filter((d) => d.web && d.web.available);
    return {
      at: docs[0] ? docs[0].checkedAt : null,
      modelRate: docs.length ? Math.round((docs.filter((d) => d.model && d.model.mentions).length / docs.length) * 100) : 0,
      webRate: withWeb.length ? Math.round((withWeb.filter((d) => d.web && d.web.mentions).length / withWeb.length) * 100) : null,
      citationRate: withWeb.length ? Math.round((withWeb.filter((d) => d.web && d.web.cited).length / withWeb.length) * 100) : null,
    };
  }).reverse();

  // Tech: siste revisjon + score-historikk.
  const tech = await db.collection(TECH_COLL).findOne({}, { projection: { _id: 0 }, sort: { runAt: -1 } });
  const techHistory = await db.collection(TECH_COLL)
    .find({}, { projection: { _id: 0, runAt: 1, avgScore: 1, pageCount: 1, totals: 1 } })
    .sort({ runAt: -1 }).limit(12).toArray();

  // SerpApi-kvote: forbruk siste 30 dager (deles med konkurrentgalleriet).
  let serpUsed30d = 0;
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const agg = await db.collection('ext_usage').aggregate([
      { $match: { service: 'serpapi', at: { $gte: since } } },
      { $group: { _id: null, units: { $sum: '$units' } } },
    ]).toArray();
    serpUsed30d = (agg[0] && agg[0].units) || 0;
  } catch (_) { /* kvotevisning er best-effort */ }

  return {
    ok: true,
    config: cfg,
    rank,
    aeo: { checkedAt: aeoLatest[0] ? aeoLatest[0].checkedAt : null, results: aeoLatest, history: aeoHistory },
    tech: tech || null,
    techHistory: techHistory.reverse(),
    quota: { serpUsed30d, serpMonthlyLimit: 100, nextRankCost: cfg.keywords.length },
  };
}
