// ---------------------------------------------------------------------------
// KANONISK BOLIGTITTEL OG LEIEKILDE
//
// Bakgrunn: plattformens boligeksport er personvern-trygg og sender derfor en
// GENERISK tittel («Møblert leilighet · 1 soverom · 52 m²»). Den er ubrukelig
// som overskrift på et boligkort i nyhetsbrevet — alle kortene ser like ut.
//
// Kildehierarki for TITTEL (streng, og alltid synlig i admin):
//   1. redigert   — redaktørens egen tittel. Overstyrer alt.
//   2. finn       — annonsetittelen fra den koblede FINN-annonsen (hentet).
//   3. plattform  — utleiemodulens tittel, men KUN når den ikke er generisk.
//   4. avledet    — bygget av rom/boligtype/gate/bydel. Aldri husnummer.
//
// Kildehierarki for LEIE (annet prinsipp!): plattformen er ENESTE autoritative
// kilde til publisert leie. FINN brukes som kontrollsignal — vi viser avvik i
// admin, men lar aldri en FINN-pris overstyre plattformens tall. Mangler leien
// i plattformen, skal den fylles inn i utleiemodulen — ikke gjettes her.
// ---------------------------------------------------------------------------

export const TITLE_SOURCE = {
  redigert: { label: 'Redigert', short: 'Redigert', help: 'Tittel du har skrevet selv. Overstyrer alle andre kilder.' },
  finn: { label: 'FINN-annonse', short: 'FINN', help: 'Annonsetittelen fra den koblede FINN-annonsen, forkortet til e-postbredde.' },
  finn_full: { label: 'FINN — hele tittelen', short: 'FINN (lang)', help: 'Hele annonsetittelen fra FINN, uendret. Kan bli lang i e-post.' },
  annonse: { label: 'Annonse i utleiemodulen', short: 'Annonse', help: 'Annonsetittelen forvalteren har skrevet i DigiHome-appen. Laget for markedsføring — bedre enn det interne enhetsnavnet.' },
  plattform: { label: 'Plattform', short: 'Plattform', help: 'Tittelen fra utleiemodulen i DigiHome-appen.' },
  avledet: { label: 'Avledet', short: 'Avledet', help: 'Bygget av rom, boligtype, gate og bydel. Brukes når ingen annen tittel finnes.' },
};

const TYPE_WORD = {
  leilighet: 'leilighet',
  hybel: 'hybel',
  hus: 'hus',
  enebolig: 'enebolig',
  rekkehus: 'rekkehus',
  tomannsbolig: 'tomannsbolig',
  rom: 'rom',
  studio: 'studioleilighet',
  annet: 'bolig',
};

const GENERIC_HEAD = /^(m[øo]blert|um[øo]blert|delvis\s+m[øo]blert|nyoppusset)?\s*(leilighet|hybel|hus|enebolig|rekkehus|tomannsbolig|bolig|rom|studio|studioleilighet|annet)$/i;

const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const squash = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// Er tittelen bare boligtype + tall? Da bærer den ingen informasjon en leietaker
// ikke allerede ser i metalinja under kortet.
export function isGenericPlatformTitle(raw) {
  const s = squash(raw);
  if (!s) return true;
  const parts = s.split(/\s*[·|]\s*/).filter(Boolean);
  if (!parts.length) return true;
  return parts.every((part) => (
    GENERIC_HEAD.test(part)
    || /^\d+\s*soverom$/i.test(part)
    || /^\d+\s*rom$/i.test(part)
    || /^\d+([.,]\d+)?\s*(m2|m²)$/i.test(part)
    || /^(langtid|korttid|hybrid)(sutleie)?$/i.test(part)
  ));
}

// FINN setter «| FINN.no»-hale og av og til «Til leie:»-prefiks på og:title.
export function cleanFinnTitle(raw) {
  let s = squash(raw);
  if (!s) return '';
  s = s.replace(/\s*[|–—-]\s*FINN(\.no)?\b.*$/i, '');
  s = s.replace(/\s*[|–—]\s*(Til leie|Bolig til leie|Leiebolig)\s*$/i, '');
  s = s.replace(/^(til leie|bolig til leie)\s*[:\-–]\s*/i, '');
  s = squash(s);
  // «5 000 kr» eller ren adresse med husnummer er ikke en annonsetittel.
  if (/^\d[\d\s]*(kr|,-)?$/i.test(s)) return '';
  return s.slice(0, 120);
}

// FINN-titler er ofte «Bydel / Sted | Beskrivelse - Fasilitet - Fasilitet» og
// blir 100+ tegn. I en e-post brekker det til tre linjer og drukner kortet.
// Vi beholder den mest beskrivende delen og kapper fasilitetslista bakfra.
export const TITLE_MAX = 70;
export function shortFinnTitle(raw) {
  const full = cleanFinnTitle(raw);
  if (!full || full.length <= TITLE_MAX) return full;
  const segs = full.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean);
  let best = [...segs].sort((a, b) => b.length - a.length)[0] || full;
  while (best.length > TITLE_MAX && /\s[-–]\s/.test(best)) {
    best = best.replace(/\s*[-–]\s*[^-–]*$/, '').trim();
  }
  if (best.length > TITLE_MAX) best = `${best.slice(0, TITLE_MAX - 1).replace(/[\s,.;:–-]+\S*$/, '')}…`;
  return best;
}

// Gatenavn kommer fra plattformen slik de er registrert — av og til i CAPS
// («ST. HANSSTREDET»). I en annonsetittel må de se ut som norsk tekst.
export function prettyPlace(raw) {
  const s = squash(raw);
  if (!s) return '';
  // Bare rør ved den hvis den er skrikende (ingen små bokstaver i det hele tatt)
  if (/[a-zæøå]/.test(s)) return s;
  return s.toLowerCase().split(' ').map((w) => {
    if (!w) return w;
    // «st.» → «St.», og små ord midt i navnet holdes små («gate», «veien»)
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(' ');
}

// Avledet tittel — leselig, men aldri husnummer (gatenavn er offentlig, adressen
// til en enhet er det ikke).
export function derivedTitle(p) {
  if (!p) return '';
  const typeKey = String(p.type || p.unitType || '').toLowerCase();
  const type = TYPE_WORD[typeKey] || 'bolig';
  const rooms = toNum(p.rooms);
  const beds = toNum(p.bedrooms);
  const size = rooms > 0 ? `${rooms}-roms ` : (beds > 0 ? `${beds}-soveroms ` : '');
  const furn = /(delvis\s+m[øo]blert|um[øo]blert|m[øo]blert)/i.exec(squash(p.title));
  const prefix = furn ? `${furn[1].toLowerCase()} ` : '';
  const place = prettyPlace([p.area, p.district, p.city].map(squash).find(Boolean) || '');
  const body = `${prefix}${size}${type}${place ? ` i ${place}` : ''}`;
  return cap(squash(body));
}

// Nevner FINN-annonsen stedet boligen faktisk ligger? Plattformens FINN-koder
// har vist seg å kunne peke på feil bolig, så et treff på gate/bydel/poststed
// i annonsetittelen er et konkret holdepunkt for at lenken er riktig.
export function finnMatchHint(p) {
  const title = String(p?.finnTitle || '').toLowerCase();
  if (!title) return null;
  const place = String(p?.fullAddress || '').split(',').pop();
  const words = [p?.area, p?.district, p?.city, place]
    .map((v) => squash(v))
    .filter(Boolean)
    .join(' ')
    .split(/[\s,/]+/)
    .map((w) => w.replace(/[^A-Za-zÆØÅæøå-]/g, ''))
    .filter((w) => w.length >= 4 && !/^(gate|gaten|veien|vegen|stredet|smauet|bergen|plass|allé|alle)$/i.test(w));
  const hit = words.find((w) => title.includes(w.toLowerCase()));
  return hit ? { word: hit } : null;
}

// Alle titler redaktøren kan velge mellom — i prioritert rekkefølge, uten
// duplikater. Brukes som ett-klikks-forslag i nyhetsbrev-editoren.
export function titleCandidates(p) {
  if (!p) return [];
  const out = [];
  const push = (source, title, extra = {}) => {
    const t = squash(title);
    if (!t) return;
    if (out.some((x) => x.title.toLowerCase() === t.toLowerCase())) return;
    out.push({ source, label: TITLE_SOURCE[source]?.label || source, title: t.slice(0, 160), ...extra });
  };
  push('redigert', p.editorialTitle);
  push('finn', shortFinnTitle(p.finnTitle));
  push('finn_full', cleanFinnTitle(p.finnTitle));
  const plat = squash(p.title);
  push('plattform', plat, { generic: isGenericPlatformTitle(plat) });
  push('avledet', derivedTitle(p));
  return out;
}

export function resolveListingTitle(p) {
  if (!p) return { title: 'Bolig', source: 'avledet' };
  const ed = squash(p.editorialTitle);
  if (ed) return { title: ed.slice(0, 160), source: 'redigert' };
  const finn = shortFinnTitle(p.finnTitle);
  if (finn) return { title: finn, source: 'finn' };
  const plat = squash(p.title);
  if (plat && !isGenericPlatformTitle(plat)) return { title: plat.slice(0, 160), source: 'plattform' };
  const der = derivedTitle(p);
  if (der) return { title: der.slice(0, 160), source: 'avledet' };
  if (plat) return { title: plat.slice(0, 160), source: 'plattform' };
  return { title: 'Bolig', source: 'avledet' };
}

// Leie: plattform er sannhet, FINN er kontrollsignal. `bandSource` settes i
// applyEnrichment (den vet om FINN fylte hullet), her regner vi bare avviket.
export function rentInfo(p) {
  const plat = toNum(p?.rentAmount);
  const finn = toNum(p?.finnRentAmount);
  const deviationPct = plat > 0 && finn > 0 ? Math.round(((finn - plat) / plat) * 100) : null;
  return {
    platformAmount: plat || null,
    platformIsEstimate: p?.rentIsEstimate === true,
    finnAmount: finn || null,
    band: p?.monthlyRentBand || null,
    bandSource: p?.rentBandSource || null,
    deviationPct,
    // 3 % slingringsmonn: avrunding og «inkl. strøm» gir små forskjeller uten
    // at noen har gjort feil.
    deviates: deviationPct != null && Math.abs(deviationPct) >= 3,
    missingPlatformRent: !plat && !p?.monthlyRentBand,
  };
}

export default { TITLE_SOURCE, isGenericPlatformTitle, cleanFinnTitle, derivedTitle, titleCandidates, resolveListingTitle, rentInfo };
