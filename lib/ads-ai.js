// ---------------------------------------------------------------------------
// AI-lag for annonser: genererer RSA-/Meta-tekster og ukentlig norsk rapport.
// Bruker den eksisterende Emergent LLM-gatewayen via lib/llm.js (chatLLM).
// Alle funksjoner kaster ikke videre enn nødvendig — robust JSON-parsing.
// ---------------------------------------------------------------------------
import { chatLLM } from '@/lib/llm';

export const DIGIHOME_BRAND = `DigiHome er et boligforvaltningsselskap i Bergen som hjelper boligeiere å leie ut trygt og lønnsomt – uten jobb for dem. Nøkkelbudskap: opptil 30 % høyere leieinntekt via hybridmodell (langtid + korttid) og dynamisk prising; ingen oppstartskostnad; ingen bindingstid; gratis inntektsvurdering innen 24 timer; lokalt team i Bergen; full forvaltning (annonsering, leietakere, husleieinnkreving, vedlikehold). Tone: profesjonell, trygg, konkret. Språk: norsk bokmål. Unngå overdrivelser og garantier.`;

export function parseJsonLoose(s) {
  if (!s) return null;
  let t = String(s).trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
  try { return JSON.parse(t); } catch (_) {}
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch (_) {} }
  return null;
}

// Generer responsive search ad-tekster (15 titler ≤30 tegn, 4 beskrivelser ≤90 tegn).
export async function generateRsaCopy({ theme = 'Utleie i Bergen', examples = [] } = {}) {
  const sys = 'Du er en ekspert på Google Ads-tekst (responsive search ads) for det norske markedet. Svar KUN med gyldig JSON.';
  const user = `${DIGIHOME_BRAND}\n\nLag responsive search ad-tekster for temaet: "${theme}".\nKrav: nøyaktig 15 titler (maks 30 tegn hver) og 4 beskrivelser (maks 90 tegn hver). Variér vinkling (inntekt, trygghet, gratis vurdering, ingen binding, lokal). Norsk bokmål.${examples.length ? `\nEksisterende toppannonser (kun inspirasjon, ikke kopier): ${examples.slice(0, 5).join(' | ')}` : ''}\n\nSvar KUN med JSON: {"headlines":["..."],"descriptions":["..."]}`;
  const content = await chatLLM({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.7, maxTokens: 900 });
  const j = parseJsonLoose(content) || {};
  return {
    headlines: (j.headlines || []).map((x) => String(x).slice(0, 30)).filter(Boolean).slice(0, 15),
    descriptions: (j.descriptions || []).map((x) => String(x).slice(0, 90)).filter(Boolean).slice(0, 4),
    raw: content,
  };
}

// Generer Meta-annonsetekster (3 primærtekster, 5 korte overskrifter ≤40 tegn).
export async function generateMetaCopy({ theme = 'Utleie i Bergen' } = {}) {
  const sys = 'Du er en ekspert på Meta-annonsetekst for det norske markedet. Svar KUN med gyldig JSON.';
  const user = `${DIGIHOME_BRAND}\n\nLag Meta-annonsetekster for temaet: "${theme}".\nKrav: 3 primærtekster (1-3 setninger, engasjerende) og 5 korte overskrifter (maks 40 tegn). Norsk bokmål.\n\nSvar KUN med JSON: {"primaryTexts":["..."],"headlines":["..."]}`;
  const content = await chatLLM({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.75, maxTokens: 800 });
  const j = parseJsonLoose(content) || {};
  return {
    primaryTexts: (j.primaryTexts || []).map((x) => String(x)).filter(Boolean).slice(0, 3),
    headlines: (j.headlines || []).map((x) => String(x).slice(0, 40)).filter(Boolean).slice(0, 5),
    raw: content,
  };
}

// Ukentlig norsk rapport (markdown) basert på ytelse + anbefalinger.
export async function weeklyReport({ economics, combined, recommendations = [], topAds = [], searchTerms = [], campaigns = [], period = 'siste 30 dager' } = {}) {
  const sys = 'Du er en senior performance marketing-analytiker. Skriv en kort, presis ukerapport på norsk bokmål i markdown. Ingen overflødig prat.';
  const learning = campaigns.filter((c) => c.maturity && c.maturity.phase === 'LÆRING').map((c) => ({ navn: c.name, dager_live: c.maturity.daysLive }));
  const data = {
    periode: period,
    kampanjer_i_laeringsfase: learning,
    total: (combined && combined.totals) ? combined.totals : ((economics && economics.totals) || {}),
    topp_annonser: topAds.slice(0, 5).map((a) => ({ kanal: a.channel, navn: a.name, kost: a.cost, konv: a.conversions, ctr: a.ctr, roas: a.roas })),
    dyreste_soketermer_uten_konv: searchTerms.filter((t) => t.conversions === 0).slice(0, 5).map((t) => ({ term: t.term, kost: t.cost, klikk: t.clicks })),
    anbefalinger: recommendations.slice(0, 8).map((r) => ({ type: r.type, tittel: r.title, alvor: r.severity, besparelse: r.estimatedSaving })),
  };
  const maturityRule = learning.length
    ? `\n\nVIKTIG KONTEKST: Følgende kampanjer er i læringsfase (under 14 dager live): ${learning.map((l) => `«${l.navn}» (${l.dager_live} dager)`).join(', ')}. IKKE konkluder negativt om CTR/CPA/konverteringer for disse — si eksplisitt at tallene er umodne og at evaluering kommer senere.`
    : '';
  const user = `Data (JSON):\n${JSON.stringify(data)}\n\nSkriv en ukerapport med disse seksjonene: 1) kort oppsummering (2-3 setninger), 2) "Hva gikk bra", 3) "Hva sløser penger", 4) "Anbefalte handlinger denne uka" (prioritert punktliste). Maks ~250 ord.${maturityRule}`;
  return chatLLM({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], temperature: 0.4, maxTokens: 900 });
}
