// ─────────────────────────────────────────────────────────────────────────────
// SELSKAPSØKONOMI — én økonomi, to juridiske enheter, ett konsern.
//
// Ren logikk (ingen DB): brukes av både server (finance.js, route.js) og
// klient (FinanceDashboard, budsjett). Prinsippet er «én sannhet»:
//
//   · Hver kostnad tilhører ETT selskap (feltet `selskap` på finance_costs).
//   · Automatiske kostnader (annonser, LLM, eksterne API, plattform-CRM)
//     fordeles etter faste REGLER — ikke per post.
//   · Digihome Tech AS har en PRISLISTE. Prisen Digihome AS betaler for
//     plattformen er bare én av produktene («plattformlisens»), og regnes
//     automatisk fra enheter under forvaltning. Den er inntekt i Tech, kostnad
//     i Digihome AS og ELIMINERES i konsernet.
//   · Konsern = Digihome AS + Digihome Tech AS − interne strømmer.
// ─────────────────────────────────────────────────────────────────────────────

const r0 = (x) => Math.round(Number(x) || 0);
const num = (v, std, { min = 0, maks = Infinity } = {}) => {
  if (v === null || v === undefined || v === '') return std;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(n)) return std;
  return Math.min(maks, Math.max(min, n));
};

// ── Selskapene ───────────────────────────────────────────────────────────────
export const SELSKAPER = [
  { id: 'digihome', navn: 'Digihome AS', kort: 'DH', orgnr: '835595242', rolle: 'Forvaltning · Bergen og omegn', farge: '#15130F' },
  { id: 'tech', navn: 'Digihome Tech AS', kort: 'DT', orgnr: '835674622', rolle: 'Plattform · programvare · hele Norge', farge: '#7A3FA8' },
];
export const KONSERN = { id: 'konsern', navn: 'Konsern', kort: 'SHD', orgnr: '935431646', rolle: 'SHD Gruppen AS · konsolidert, interne strømmer eliminert' };
export const VISNINGER = [...SELSKAPER, KONSERN];

export const erSelskap = (v) => v === 'digihome' || v === 'tech';
export const normSelskap = (v, std = 'digihome') => (erSelskap(v) ? v : std);
export const normVisning = (v) => (v === 'tech' || v === 'konsern' ? v : 'digihome');
export const selskapInfo = (id) => VISNINGER.find((s) => s.id === id) || SELSKAPER[0];

// ── Automatiske kostnader → selskap (regler) ────────────────────────────────
export const AUTOKILDER = [
  { id: 'annonser', navn: 'Annonseforbruk (Google/Meta)', felt: 'adSpendMonthly', kategori: 'Markedsføring' },
  { id: 'llm', navn: 'LLM-kostnad (egen måling)', felt: 'llmMonthly', kategori: 'API/LLM' },
  { id: 'ext', navn: 'Eksterne API-tjenester (SendGrid, SerpAPI, Maps)', felt: 'extMonthly', kategori: 'API/LLM' },
  { id: 'plattform', navn: 'Plattform-CRM (Twilio, e-signering, AI)', felt: 'platformMonthly', kategori: 'Plattformdrift (CRM)' },
];
export const STANDARD_AUTOREGLER = { annonser: 'digihome', llm: 'tech', ext: 'tech', plattform: 'tech' };
export function rensAutoregler(r = {}) {
  const ut = {};
  for (const k of AUTOKILDER) ut[k.id] = normSelskap(r?.[k.id], STANDARD_AUTOREGLER[k.id]);
  return ut;
}
// auto = { adSpendMonthly, llmMonthly, extMonthly, platformMonthly } (kr/mnd)
// → { digihome: { poster: [{id, navn, kategori, belop}], sum }, tech: {...} }
export function fordelAuto(auto = {}, regler = STANDARD_AUTOREGLER) {
  const re = rensAutoregler(regler);
  const ut = { digihome: { poster: [], sum: 0 }, tech: { poster: [], sum: 0 } };
  for (const k of AUTOKILDER) {
    const belop = r0(auto?.[k.felt] || 0);
    if (!belop) continue;
    const sel = re[k.id];
    ut[sel].poster.push({ id: k.id, navn: k.navn, kategori: k.kategori, belop });
    ut[sel].sum += belop;
  }
  return ut;
}

// ── Prisliste (Digihome Tech AS) ─────────────────────────────────────────────
// modell 'pct'  = prosent av månedsleie (inkl. mva; eks. mva = ÷ 1,25)
// modell 'fast' = kr per enhet per måned (eks. mva)
export const PRISLISTE_PRODUKTER = [
  { id: 'huseier', navn: 'Huseiere · selvbetjent', kunde: 'Privat huseier som leier ut selv', modeller: ['pct', 'fast'], std: { modell: 'pct', pris: 5 } },
  { id: 'forvaltning', navn: 'Plattformlisens · Digihome AS', kunde: 'Internt — Digihome AS betaler per enhet under forvaltning', modeller: ['fast'], std: { modell: 'fast', pris: 200 } },
  { id: 'bedrift', navn: 'Bedrift · eiendomsselskap', kunde: 'Profesjonelle utleiere og eiendomsselskaper', modeller: ['fast'], std: { modell: 'fast', pris: 79 } },
];
export function rensPrisliste(p = {}) {
  const ut = {};
  for (const prod of PRISLISTE_PRODUKTER) {
    const inn = p?.[prod.id] || {};
    const modell = prod.modeller.includes(inn.modell) ? inn.modell : prod.std.modell;
    const pris = modell === 'pct' ? num(inn.pris, prod.std.pris, { maks: 100 }) : r0(num(inn.pris, prod.std.pris, { maks: 1e6 }));
    ut[prod.id] = { modell, pris };
  }
  return ut;
}
// kr per enhet per måned, eks. mva
export function prisPerEnhet(produkt = {}, snittleie = 15000) {
  if (produkt.modell === 'pct') return r0((snittleie * (Number(produkt.pris) || 0)) / 100 / 1.25);
  return r0(produkt.pris);
}
// Plattformlisensen Digihome AS betaler: enheter under forvaltning × pris.
export const beregnLisens = (enheter, prisliste) => r0((Number(enheter) || 0) * prisPerEnhet(rensPrisliste(prisliste).forvaltning));

// ── Sortering av eksisterende kostnader (engangs-assistent) ─────────────────
// Kategorier som erfaringsmessig hører til plattformselskapet. Assistenten
// foreslår — brukeren bekrefter. Bekreftede poster foreslås aldri igjen.
export const TECH_KATEGORI_FORSLAG = ['API/LLM', 'Programvare/SaaS'];
export function foreslaaFlytt(costs = []) {
  return costs.filter((c) => normSelskap(c.selskap) === 'digihome' && !c.selskapBekreftet && TECH_KATEGORI_FORSLAG.includes(c.category));
}

// ── Konsolidering ────────────────────────────────────────────────────────────
// Slår sammen to selskapsresultater {inntekt, kost} og eliminerer interne
// strømmer (lisens). Returnerer også hva som ble eliminert — synlig i UI.
export function konsolider({ digihome, tech, lisens = 0 }) {
  const inn = r0((digihome?.inntekt || 0) + (tech?.inntekt || 0) - lisens);
  const kost = r0((digihome?.kost || 0) + (tech?.kost || 0) - lisens);
  return { inntekt: inn, kost, resultat: r0(inn - kost), eliminert: r0(lisens) };
}
