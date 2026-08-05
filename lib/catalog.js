// ── TJENESTEKATALOG: ÉN SANNHET FOR PRIS OG INNHOLD ─────────────────────────
// Denne katalogen definerer hva de to nivåene KOSTER og HVA de inneholder.
// Den lå tidligere som en konstant inne i API-ruten, som betydde at
// priskalkulatoren og resten av nettsiden ikke kunne dele tall: skulle vi
// markedsføre selvforvaltning måtte prosenten og innholdslistene skrives inn
// på nytt i hver flate — og da drifter de fra hverandre uten at noen ser det.
//
// Ren datamodul UTEN databasetilgang, så den kan importeres hvor som helst
// (server, klient, API). Databaseoverstyringen ligger i lib/catalog-server.js.

export const SELF_LEVEL_KEY = 'selvbetjent';
export const FULL_LEVEL_KEY = 'fullforvaltning';

// Offentlig produktnavn. Katalognøkkelen er 'selvbetjent' (intern, og lagret i
// eksisterende kundedata), men avtalen kunden signerer heter
// «selvforvaltning-2025-06» og guiden som rangerer heter
// /guider/utleiemegler-vs-selvforvaltning. Vi bruker derfor ETT offentlig navn
// overalt: Selvforvaltning.
export const SELF_PUBLIC_NAME = 'Selvforvaltning';
export const SELF_PATH = '/selvforvaltning';
export const SELF_START_PATH = '/bli-utleier/start?tier=selvforvaltning';

export const WIZARD_CATALOG_DEFAULT = {
  serviceLevels: [
    {
      key: 'selvbetjent', name: 'Selvbetjent', pct: 5, minMonthly: 500, badge: 'Nyhet',
      tagline: 'Du gjør jobben — vi leverer systemet',
      included: ['Annonsering på FINN.no', 'Digital kontrakt med BankID-signering', 'Husleieinnkreving og purring', 'Depositumskonto', 'Chat med leietaker', 'Utleiedashboard med full oversikt'],
      notIncluded: ['Visninger og leietakervalg', 'Inn- og utflyttingsbefaring', 'Vedlikeholdskoordinering'],
      models: ['langtid'],
    },
    {
      key: 'fullforvaltning', name: 'Fullforvaltning', pct: 10, minMonthly: 0, badge: 'Mest valgt',
      tagline: 'Vi gjør alt — du får utbetalingen',
      included: ['Alt i Selvbetjent', 'Visninger og leietakervalg', 'Inn- og utflyttingsbefaring', 'Vedlikeholdskoordinering døgnet rundt', 'Dynamisk prisoptimalisering', 'Dedikert forvalter'],
      notIncluded: [],
      models: ['langtid', 'hybrid'],
    },
  ],
  models: [
    { key: 'langtid', name: 'Langtidsutleie', desc: 'Stabil leietaker og forutsigbar månedlig leie' },
    { key: 'hybrid', name: 'Dynamisk utleie (10+2)', desc: 'Langtid + korttid i høysesong — typisk 20–30 % høyere inntekt', upliftPct: 25 },
  ],
  addons: [
    { key: 'markedspakke', name: 'Markedspakke', price: 4900, once: true, popular: true, desc: 'Profesjonell boligfoto, plantegning og premium FINN-annonse' },
    { key: 'foto', name: 'Profesjonell boligfoto', price: 2900, once: true, desc: 'Fotograf og redigering — 15–25 leveringsklare bilder' },
    { key: 'kredittsjekk', name: 'Kreditt- og referansesjekk', price: 490, once: true, desc: 'Grundig sjekk av leietaker før kontrakt (per kandidat)' },
    { key: 'innflytting', name: 'Innflyttingsklar', price: 3900, once: true, desc: 'Nedvask, nøkkelbokser og komplett klargjøring' },
    { key: 'visningshjelp', name: 'Visningshjelp', price: 1490, once: true, for: 'selvbetjent', desc: 'Vi holder visningen for deg (pris per visning)' },
    { key: 'juridisk', name: 'Juridisk trygghetspakke', price: 1990, once: true, desc: 'Kvalitetssikret kontrakt og rådgivning via Hoffmann Thinn' },
  ],
};

export function serviceLevel(catalog, key) {
  const levels = (catalog && catalog.serviceLevels) || WIZARD_CATALOG_DEFAULT.serviceLevels;
  return levels.find((l) => l.key === key) || null;
}

export function catalogAddon(catalog, key) {
  const addons = (catalog && catalog.addons) || WIZARD_CATALOG_DEFAULT.addons;
  return addons.find((a) => a.key === key) || null;
}

export function catalogModel(catalog, key) {
  const models = (catalog && catalog.models) || WIZARD_CATALOG_DEFAULT.models;
  return models.find((m) => m.key === key) || null;
}

// Samme formel som priskalkulatoren bruker (PriceWizard: fee = max(leie·pct, minstepris)).
// Ligger her slik at en offentlig prisside ikke kan regne annerledes enn kalkulatoren.
export function monthlyFee(rent, level) {
  if (!level) return 0;
  const pct = Number(level.pct) || 0;
  const min = Number(level.minMonthly) || 0;
  return Math.max((Number(rent) || 0) * pct / 100, min);
}

// Leienivået der minsteprisen slutter å gjelde: 500 kr / 5 % = 10 000 kr.
// Regnes ut i stedet for å skrives inn, slik at teksten følger katalogen.
export function minFeeThreshold(level) {
  if (!level || !level.minMonthly || !level.pct) return 0;
  return Math.round((Number(level.minMonthly) * 100) / Number(level.pct));
}

export function fmtNok(n) {
  return Math.round(Number(n) || 0).toLocaleString('nb-NO');
}
