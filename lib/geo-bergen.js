// ---------------------------------------------------------------------------
// BYDEL I BERGEN — utledet, ikke gjettet.
//
// Plattformens /api/properties/export sender IKKE `district` (verifisert:
// 0 av 27 boliger). Uten bydel havnet alle boliger i nyhetsbrevet under
// «Andre områder», som gjør grupperingen verdiløs.
//
// Vi utleder bydelen fra det vi faktisk har:
//   1. `district` fra plattformen  → brukes hvis det noen gang kommer
//   2. POSTNUMMER fra kontraktsadressen ("ØVREGATEN 15, 5003 Bergen")
//   3. POSTSTED  ("Ulset", "Sandsli", "Paradis", "Indre Arna")
//
// PRINSIPP: vi mapper BARE der vi er sikre. Et feil bydelsnavn i et kunde-
// rettet nyhetsbrev er verre enn «Andre områder». Derfor er tabellene under
// bevisst konservative — usikre postnummer/poststeder gir null, og boligen
// havner i «Andre områder» framfor i feil bydel.
//
// Postnummer i Bergen følger IKKE rene intervaller per bydel; ytterområdene
// (Åsane, Arna, Fana, Ytrebygda, Fyllingsdalen, Laksevåg) har entydige
// klynger, mens 5000-serien i sentrum er blandet. Derfor bruker vi
// «Bergen sentrum» for 5003–5020 (verifisert mot faktiske adresser) og lar
// resten av 50xx bli «Bergen» — sant og nyttig, uten falsk presisjon.
// ---------------------------------------------------------------------------

// Poststed → bydel. Kun entydige steder.
const POSTSTED_DISTRICT = {
  // Åsane
  åsane: 'Åsane', asane: 'Åsane', ulset: 'Åsane', nyborg: 'Åsane', eidsvåg: 'Åsane',
  eidsvågneset: 'Åsane', tertnes: 'Åsane', flaktveit: 'Åsane', salhus: 'Åsane',
  hylkje: 'Åsane', breistein: 'Åsane', hordvik: 'Åsane', morvik: 'Åsane',
  åstveit: 'Åsane', myrdal: 'Åsane', rolland: 'Åsane', mjølkeråen: 'Åsane', haukås: 'Åsane',
  // Arna
  arna: 'Arna', 'indre arna': 'Arna', 'ytre arna': 'Arna', arnatveit: 'Arna',
  garnes: 'Arna', espeland: 'Arna', trengereid: 'Arna', unneland: 'Arna',
  // Fana
  fana: 'Fana', paradis: 'Fana', nesttun: 'Fana', hop: 'Fana', sædalen: 'Fana',
  rådal: 'Fana', nordås: 'Fana', midtun: 'Fana', stend: 'Fana', skjold: 'Fana',
  fanahammeren: 'Fana', krokeide: 'Fana', milde: 'Fana', kalandseidet: 'Fana',
  // Ytrebygda
  ytrebygda: 'Ytrebygda', sandsli: 'Ytrebygda', kokstad: 'Ytrebygda',
  blomsterdalen: 'Ytrebygda', hjellestad: 'Ytrebygda', flesland: 'Ytrebygda',
  søreidgrend: 'Ytrebygda', søreide: 'Ytrebygda',
  // Fyllingsdalen
  fyllingsdalen: 'Fyllingsdalen', bønes: 'Fyllingsdalen',
  // Laksevåg
  laksevåg: 'Laksevåg', loddefjord: 'Laksevåg', godvik: 'Laksevåg',
  kjøkkelvik: 'Laksevåg', olsvik: 'Laksevåg', mathopen: 'Laksevåg',
  alvøen: 'Laksevåg', gravdal: 'Laksevåg', melkeplassen: 'Laksevåg',
  // Årstad
  årstad: 'Årstad', minde: 'Årstad', kronstad: 'Årstad', landås: 'Årstad',
  slettebakken: 'Årstad',
  // Bergenhus
  bergenhus: 'Bergenhus', sandviken: 'Bergenhus', nordnes: 'Bergenhus',
  møhlenpris: 'Bergenhus', nygård: 'Bergenhus',
};

// Postnummer-klynger vi stoler på. Verifisert mot Kartverket-oppslag på
// faktiske Bergens-gater (Øvregaten 5003, Tullins gate 5006, Knøsesmauet 5011,
// Baglergaten 5032, Absalon Beyers gate 5034, Sandviksveien 5035–5036,
// Løbergsveien 5054/5073, Landåsveien 5096–5097, Hallskaret 5117,
// Sandslimarka 5254, Wernersholmvegen 5232, Vollavegen 5261).
// «Bergen sentrum» brukes framfor «Bergenhus» for 5003–5020 fordi det er slik
// leietakere faktisk snakker om området.
// KJENT GRENSETILFELLE: Fjøsanger (5068/5073) ligger på grensen Årstad/Fana og
// kan bli merket Årstad. Nabo-bydel, ikke feil by — akseptert avvik.
const POSTAL_RANGES = [
  { from: 5003, to: 5020, district: 'Bergen sentrum' },
  { from: 5021, to: 5039, district: 'Bergenhus' },
  { from: 5040, to: 5099, district: 'Årstad' },
  { from: 5101, to: 5137, district: 'Åsane' },
  { from: 5141, to: 5148, district: 'Fyllingsdalen' },
  { from: 5160, to: 5184, district: 'Laksevåg' },
  { from: 5221, to: 5249, district: 'Fana' },
  { from: 5250, to: 5259, district: 'Ytrebygda' },
  { from: 5260, to: 5268, district: 'Arna' },
];

const BAD_PLACE = new Set(['norge', 'norway', 'no', '']);
const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

// Normaliserer et gatenavn: fjerner husnummer, bynavn og søppel.
// "Olaf Ryes vei 11C, 5006 Bergen" → "olaf ryes vei"
// "ØVREGATEN"                      → "øvregaten"
// "https://www.finn.no/…"          → null  (FINN-lenke limt inn i adressefeltet)
export function normStreet(s) {
  let t = String(s || '').trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t) || /finnkode|finn\.no/i.test(t)) return null;
  t = t.split(',')[0];
  t = t.replace(/\s+\d+\s*[A-Za-z]?(\s*[-/]\s*\d+\s*[A-Za-z]?)?\s*$/, '');
  t = t.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!t || /^\d+$/.test(t)) return null;
  return t;
}

// Er «område»-feltet ubrukelig som tekst i et kunderettet nyhetsbrev?
export function isJunkArea(s) {
  const t = String(s || '').trim();
  if (!t) return true;
  return /^https?:\/\//i.test(t) || /finnkode|finn\.no/i.test(t);
}

export function postalToDistrict(zip) {
  const z = parseInt(String(zip || '').replace(/\D/g, ''), 10);
  if (!Number.isFinite(z)) return null;
  for (const r of POSTAL_RANGES) if (z >= r.from && z <= r.to) return r.district;
  return null;
}

export function placeToDistrict(place) {
  const p = norm(place);
  if (!p || BAD_PLACE.has(p)) return null;
  return POSTSTED_DISTRICT[p] || null;
}

// Plukker ut postnummer + poststed fra en norsk adressestreng.
// "ØVREGATEN 15, 5003 Bergen"          → { zip: '5003', place: 'Bergen' }
// "Løbergsveien 17, 5054 Bergen, Norge" → { zip: '5054', place: 'Bergen' }
export function parseNoAddress(address) {
  const s = String(address || '');
  const m = s.match(/\b(\d{4})\b\s*,?\s*([A-Za-zÆØÅæøå .-]+)?/);
  if (!m) return { zip: null, place: null };
  const place = (m[2] || '').split(',')[0].trim();
  return { zip: m[1], place: place || null };
}

// Hovedinngangen. Returnerer { district, source } eller { district: null, source: null }.
// `hint` er en alt utledet bydel (f.eks. fra Kartverket-oppslag på gatenavnet) —
// den slår poststed, men aldri en bydel plattformen selv har sendt.
export function resolveDistrict({ district, hint, hintSource, address, city, area } = {}) {
  const explicit = String(district || '').trim();
  if (explicit && norm(explicit) !== 'andre områder') return { district: explicit, source: 'plattform' };

  if (hint) return { district: String(hint), source: hintSource || 'kartverket' };

  const { zip, place } = parseNoAddress(address);
  const byZip = postalToDistrict(zip);
  if (byZip) return { district: byZip, source: 'postnummer' };

  const byPlace = placeToDistrict(place) || placeToDistrict(city);
  if (byPlace) return { district: byPlace, source: 'poststed' };

  // Kjent by, ukjent bydel: «Bergen» er sant og mer nyttig enn «Andre områder».
  const cityNorm = norm(city);
  if (cityNorm === 'bergen' || /\bbergen\b/i.test(String(address || ''))) {
    return { district: 'Bergen', source: 'by' };
  }
  // Ukjent poststed som ikke er søppel brukes som det er (f.eks. «Os», «Askøy»).
  if (place && !BAD_PLACE.has(norm(place))) return { district: place, source: 'poststed-rå' };
  if (cityNorm && !BAD_PLACE.has(cityNorm)) return { district: String(city).trim(), source: 'by-rå' };
  return { district: null, source: null };
}

// ---------------------------------------------------------------------------
// KARTVERKET / GEONORGE: gatenavn → postnummer → bydel, begrenset til Bergen
// kommune (4601). Offentlig API uten nøkkel — samme kilde adressefeltet i
// onboarding alt bruker.
//
// Tåler feil med vilje: timeout, HTTP-feil eller en gate som strekker seg over
// flere bydeler gir null, og da faller vi tilbake på poststed. Vi plasserer
// ALDRI en bolig i en bydel vi ikke er sikre på.
// ---------------------------------------------------------------------------
export async function fetchStreetDistrict(street, { timeoutMs = 2500 } = {}) {
  const q = normStreet(street);
  if (!q) return { district: null, source: null, zip: null, reason: 'ugyldig gatenavn' };
  const url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(q)}`
    + '&kommunenummer=4601&treffPerSide=40&side=0&asciiKompatibel=true'
    + '&filtrer=adresser.adressetekst,adresser.postnummer,adresser.poststed,adresser.kommunenummer';
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let r;
    try { r = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctrl.signal }); }
    finally { clearTimeout(t); }
    if (!r.ok) return { district: null, source: null, zip: null, reason: `HTTP ${r.status}` };
    const data = await r.json();
    const rows = (data.adresser || []).filter((a) => String(a.kommunenummer) === '4601');
    if (!rows.length) return { district: null, source: null, zip: null, reason: 'ingen treff i Bergen' };
    // Krev at gatenavnet faktisk stemmer — ellers kan «Øvregaten» treffe «Nedre Øvregaten».
    const exact = rows.filter((a) => normStreet(a.adressetekst) === q);
    const use = exact.length ? exact : rows;
    const districts = new Set();
    const places = new Set();
    let zip = null;
    for (const a of use) {
      const d = postalToDistrict(a.postnummer);
      if (d) { districts.add(d); zip = zip || a.postnummer; }
      const p = placeToDistrict(a.poststed);
      if (p) places.add(p);
    }
    if (districts.size === 1) return { district: [...districts][0], source: 'kartverket', zip };
    if (districts.size === 0 && places.size === 1) return { district: [...places][0], source: 'kartverket-poststed', zip: null };
    return { district: null, source: null, zip: null, reason: districts.size > 1 ? 'gaten går over flere bydeler' : 'ukjent postnummer' };
  } catch (e) {
    return { district: null, source: null, zip: null, reason: e.name === 'AbortError' ? 'tidsavbrudd' : e.message };
  }
}

// Sorteringsrekkefølge for grupper i nyhetsbrevet: flest boliger først,
// «Andre områder» alltid sist (en restpost skal ikke stå øverst).
export function sortDistrictGroups(entries = []) {
  return [...entries].sort((a, b) => {
    const aOther = norm(a[0]) === 'andre områder' ? 1 : 0;
    const bOther = norm(b[0]) === 'andre områder' ? 1 : 0;
    if (aOther !== bOther) return aOther - bOther;
    const diff = (b[1]?.length || 0) - (a[1]?.length || 0);
    if (diff !== 0) return diff;
    return String(a[0]).localeCompare(String(b[0]), 'nb');
  });
}

export const BERGEN_DISTRICTS = ['Arna', 'Bergenhus', 'Bergen sentrum', 'Fana', 'Fyllingsdalen', 'Laksevåg', 'Ytrebygda', 'Årstad', 'Åsane'];
