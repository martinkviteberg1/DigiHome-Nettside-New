// ---------------------------------------------------------------------------
// REDAKSJONELLE OVERSTYRINGER PÅ BOLIG
//
// HVORFOR: plattformens utleiemodul er den autoritative kilden, men den er
// ufullstendig. Fersk eksport: bare 4 av 13 LEDIGE enheter har pris, 9 mangler
// bilder, 6 mangler areal, og ingen har annonsetekst. Resultatet var at
// /ledige-boliger kunne publisere ÉN bolig, selv om 7 var innholdsmessig klare.
//
// Løsningen er ikke å gjette på plattformens vegne, men å la forvalteren skrive
// inn det hun vet — og gjøre det sporbart. Et tall en DigiHome-forvalter taster
// inn er DigiHomes egen opplysning, uansett hvor hun leste det. Det er noe helt
// annet enn å republisere en annen parts data.
//
// TRE REGLER SOM IKKE BRYTES:
//  1. KPI-TRYGGHET: en redaksjonell pris blir ALDRI plattformens rentAmount.
//     Den lager bare et prisintervall for visning, merket 'redaksjonell', og
//     vises som «prisantydning». MRR, LTV og realisert honorar er urørt —
//     bare en faktisk startet leiekontrakt gir realisert inntekt.
//  2. PLATTFORMEN VINNER TILBAKE: overstyringen er en utfylling, ikke en sannhet.
//     Admin ser alltid plattformens verdi ved siden av, og kan nullstille per
//     felt med ett klikk. Kommer plattformen med tallet, er overstyringen
//     overflødig og skal fjernes.
//  3. PERSONVERN: gatefeltet strippes for husnummer, akkurat som alt annet vi
//     publiserer. En redaktør skal ikke kunne lekke en full adresse ved uhell.
//
// REN LOGIKK — ingen DB, ingen import fra properties-sync (det ville gitt en
// sirkulær import). Kallende kode sender inn bandFromAmount.
// ---------------------------------------------------------------------------
import { BERGEN_DISTRICTS } from './geo-bergen';
import { toIsoDate, AVAILABLE_TEXTS } from './listings';

export const RENT_SOURCE_EDITORIAL = 'redaksjonell';

export const TYPE_OPTIONS = ['leilighet', 'hybel', 'hus', 'enebolig', 'rekkehus', 'tomannsbolig', 'rom', 'studio'];
export const MODEL_OPTIONS = ['langtid', 'korttid', 'hybrid'];

export const EDITORIAL_FIELDS = [
  { key: 'title', label: 'Annonsetittel', kind: 'text', max: 160, target: 'title', hint: 'Vises som overskrift i nyhetsbrev og som H1/<title> på boligsiden.' },
  { key: 'description', label: 'Annonsetekst', kind: 'longtext', max: 2000, target: 'description', hint: 'Publiseres på boligsiden. Viktigst enkeltfelt for søk — plattformen sender ingen.' },
  { key: 'rentAmount', label: 'Månedsleie', kind: 'int', min: 1000, max: 200000, unit: 'kr/mnd', target: 'monthlyRentBand', hint: 'Publiseres som intervall og merkes «prisantydning». Teller aldri i nøkkeltall.' },
  { key: 'sqm', label: 'Areal', kind: 'int', min: 5, max: 2000, unit: 'm²', target: 'sqm' },
  { key: 'bedrooms', label: 'Soverom', kind: 'int', min: 0, max: 20, target: 'bedrooms' },
  { key: 'rooms', label: 'Rom', kind: 'int', min: 0, max: 30, target: 'rooms' },
  { key: 'type', label: 'Boligtype', kind: 'enum', options: TYPE_OPTIONS, target: 'type' },
  { key: 'model', label: 'Utleieform', kind: 'enum', options: MODEL_OPTIONS, target: 'model' },
  { key: 'availableFrom', label: 'Ledig fra', kind: 'date', max: 40, target: 'availableFrom', hint: 'Velg dato i kalenderen, eller «Ledig nå». Lagres alltid som ISO-dato, så den vises riktig utad.' },
  { key: 'district', label: 'Bydel', kind: 'enum', options: BERGEN_DISTRICTS, target: 'district' },
  { key: 'area', label: 'Gate', kind: 'street', max: 80, target: 'area', hint: 'Husnummer fjernes automatisk — aldri full adresse utad.' },
  { key: 'imageRights', label: 'Vi har rett til å publisere FINN-bildene', kind: 'bool', target: null, hint: 'Kreves for å publisere bilder hentet fra en FINN-annonse på digihome.no.' },
];

const FIELD_BY_KEY = EDITORIAL_FIELDS.reduce((a, f) => { a[f.key] = f; return a; }, {});

// Husnummer ut: «Baglergaten 8» → «Baglergaten», «Olaf Ryes vei 11C» → «Olaf Ryes vei».
export function stripHouseNumber(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/[,;].*$/, '')
    .replace(/\s+\d+\s*[A-Za-zÆØÅæøå]?\s*$/, '')
    .trim();
}

function coerce(f, raw) {
  switch (f.kind) {
    case 'date': {
      // Godtar både «01.10.2026» og «2026-10-01», og lagrer alltid ISO. En
      // dato skrevet av et menneske skal aldri kunne bli feil måned utad.
      const iso = toIsoDate(raw);
      if (iso) return iso;
      // «Ledig nå» / «Etter avtale» er gyldige svar som ikke er datoer.
      const t = String(raw).replace(/\s+/g, ' ').trim();
      const hit = AVAILABLE_TEXTS.find((x) => x.toLowerCase() === t.toLowerCase());
      if (hit) return hit;
      if (/^(n[åa]|omg[åa]ende|straks|ledig)$/i.test(t)) return AVAILABLE_TEXTS[0];
      return null;
    }
    case 'bool':
      return raw === true || raw === 'true' || raw === 1 || raw === '1' ? true : null;
    case 'int': {
      const n = Math.round(Number(raw));
      if (!Number.isFinite(n)) return null;
      if (n < f.min || n > f.max) return null;
      return n;
    }
    case 'enum': {
      const v = String(raw).trim().toLowerCase();
      const hit = f.options.find((o) => String(o).toLowerCase() === v);
      return hit || null;
    }
    case 'longtext': {
      const v = String(raw).replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, f.max);
      return v || null;
    }
    case 'street': {
      const v = stripHouseNumber(raw).slice(0, f.max);
      return v || null;
    }
    default: {
      const v = String(raw).replace(/\s+/g, ' ').trim().slice(0, f.max);
      return v || null;
    }
  }
}

// Slår en innsendt patch sammen med det som ligger lagret.
// Tom streng / null / false betyr NULLSTILL feltet — det er slik admin fjerner
// en overstyring og slipper plattformens verdi gjennom igjen.
export function normalizeEditorial(patch = {}, existing = {}) {
  const out = {};
  for (const [k, v] of Object.entries(existing || {})) {
    if (FIELD_BY_KEY[k] && v !== null && v !== undefined) out[k] = v;
  }
  const changed = [];
  const cleared = [];
  for (const f of EDITORIAL_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(patch, f.key)) continue;
    const raw = patch[f.key];
    const isClear = raw === null || raw === undefined || raw === ''
      || (f.kind === 'bool' && (raw === false || raw === 'false' || raw === 0 || raw === '0'));
    if (isClear) {
      if (out[f.key] !== undefined) { delete out[f.key]; cleared.push(f.key); }
      continue;
    }
    const v = coerce(f, raw);
    if (v === null) {
      return { error: `Ugyldig verdi for «${f.label}»`, field: f.key };
    }
    if (out[f.key] !== v) changed.push(f.key);
    out[f.key] = v;
  }
  return { editorial: out, changed, cleared };
}

// Legger overstyringene på den ferdig berikede boligen. Kalles SIST, slik at
// redaktøren vinner over både plattform og FINN.
//
// out muteres bevisst — applyEnrichment jobber allerede på en kopi.
export function applyEditorial(out, ed, { bandFromAmount } = {}) {
  const applied = [];
  const values = {};
  if (!out) return { applied, values };

  // Plattformens egne verdier tas vare på, slik at admin kan se hva som faktisk
  // ligger i utleiemodulen ved siden av det redaktøren har skrevet.
  out.platformValues = {
    sqm: out.sqm ?? null,
    bedrooms: out.bedrooms ?? null,
    rooms: out.rooms ?? null,
    type: out.type ?? null,
    model: out.model ?? null,
    district: out.district ?? null,
    area: out.area ?? null,
    availableFrom: out.availableFrom ?? null,
    monthlyRentBand: out.monthlyRentBand ?? null,
    rentAmount: out.rentAmount ?? null,
  };

  if (!ed || typeof ed !== 'object') {
    out.editorialFields = [];
    out.editorialValues = {};
    out.imageRights = false;
    return { applied, values };
  }

  for (const f of EDITORIAL_FIELDS) {
    let v = ed[f.key];
    if (v === null || v === undefined) continue;
    // Verdier som alt ligger lagret kan ha norsk datoformat (skrevet inn før
    // feltet ble et ekte datofelt). Vi normaliserer ved LESING, slik at
    // eksisterende data blir riktig med én gang — uten en migrering mot
    // produksjonsbasen, som vi ikke har tilgang til.
    if (f.kind === 'date') v = coerce(f, v) || v;
    values[f.key] = v;

    if (f.key === 'rentAmount') {
      const band = typeof bandFromAmount === 'function' ? bandFromAmount(v) : null;
      if (band) {
        out.monthlyRentBand = band;
        out.rentBandSource = RENT_SOURCE_EDITORIAL;
        // Redaksjonell pris er per definisjon en prisantydning, ikke en
        // kontraktsleie. Merkingen følger boligen helt ut på kortet.
        out.rentIndicativeEditorial = true;
      }
      // VIKTIG: rentAmount (plattformens beløp) røres ALDRI. Nøkkeltallene
      // leser det feltet, og en redaksjonell antydning skal aldri kunne
      // forveksles med realisert inntekt.
      out.editorialRentAmount = v;
      applied.push(f.key);
      continue;
    }

    if (f.key === 'imageRights') {
      out.imageRights = true;
      applied.push(f.key);
      continue;
    }

    if (f.target) {
      out[f.target] = v;
      out[`${f.target}Source`] = RENT_SOURCE_EDITORIAL;
      applied.push(f.key);
    }
  }

  if (out.imageRights !== true) out.imageRights = false;
  out.editorialFields = applied;
  out.editorialValues = values;
  return { applied, values };
}

// Kort tekst til admin: «Redigert: pris, areal, annonsetekst».
export function editorialSummary(keys = []) {
  const labels = keys.map((k) => (FIELD_BY_KEY[k] ? FIELD_BY_KEY[k].label.toLowerCase() : k));
  return labels.length ? `Redigert: ${labels.join(', ')}` : '';
}

export default { EDITORIAL_FIELDS, normalizeEditorial, applyEditorial, editorialSummary, stripHouseNumber, RENT_SOURCE_EDITORIAL };
