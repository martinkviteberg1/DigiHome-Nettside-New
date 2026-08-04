// ---------------------------------------------------------------------------
// LEDIGE BOLIGER — offentlig boligflate på digihome.no
//
// Hvorfor egen side når boligene også ligger på FINN og i plattformen?
//  1. SEO/AEO: vi eier langhalen («leilighet til leie Sandviken»). I dag høster
//     FINN de søkene mens vi betaler for annonsene.
//  2. FØRSTEPARTS LEAD: på FINN eier FINN samtalen. Her fanger vi boliginteressen
//     selv og kan koble den mot nyhetsbrevet.
//  3. NYHETSBREVET trenger et mål per bolig — ikke én felles landingsside.
//  4. SALGSMATERIELL mot huseiere: «se boligene vi leier ut i Bergen».
//
// TO ABSOLUTTE REGLER (avklart med eier):
//  · BILDER: kun bilder fra utleiemodulen. FINN-bilder brukes som nødløsning i
//    admin/nyhetsbrev, men publiseres ALDRI på egen kommersiell nettside —
//    rettighetene der ligger hos utleier/fotograf.
//  · PRIS: utleiemodulen i plattformen er eneste autoritative kilde. En
//    FINN-pris publiseres aldri som vår.
//
// PERSONVERN: full gateadresse (som i alle andre utleieannonser) + bydel, areal,
// soverom og annonsert månedsleie. Aldri eier, aldri leietaker, aldri
// kontraktsleie på en utleid bolig — bare ledige boliger publiseres, og en ledig
// bolig har verken leietaker eller kontrakt å knytte beløpet til.
// ---------------------------------------------------------------------------

export const LISTINGS_PATH = '/ledige-boliger';

export const MODEL_LABEL = {
  langtid: 'Langtidsutleie',
  korttid: 'Korttidsutleie',
  hybrid: 'Fleksibel utleie',
};

export const TYPE_LABEL = {
  leilighet: 'Leilighet',
  hybel: 'Hybel',
  hus: 'Hus',
  enebolig: 'Enebolig',
  rekkehus: 'Rekkehus',
  tomannsbolig: 'Tomannsbolig',
  rom: 'Rom',
  studio: 'Studioleilighet',
};

// Hva stopper publisering — med en konkret instruks om HVOR det fikses.
// Kodene følger plattformens eget språk (pris_mangler/bilder_mangler/
// areal_mangler) der de finnes, slik at admin og utleiemodulen sier det samme.
export const GATE = {
  skjult: { label: 'Ikke publisert', fix: 'Slå på «Vis på nettsiden» på boligkortet når du er klar.', where: 'admin' },
  ikke_ledig: { label: 'Ikke ledig', fix: 'Bare ledige boliger vises på Ledige boliger.', where: 'plattform' },
  mangler_pris: { label: 'Mangler pris', fix: 'Legg inn leiepris i utleiemodulen — eller sett månedsleien under «Rediger boligdata».', where: 'begge' },
  // Plattformens boligeksport sender på noen boliger BARE et prisintervall
  // («22 000–24 000 kr/mnd»), uten selve beløpet. Vi publiserer ikke en annonse
  // uten pris — og vi gjetter ikke på et beløp inne i et intervall.
  pris_uten_belop: { label: 'Bare prisintervall', fix: 'Plattformen sender bare et prisintervall for denne boligen. Skriv inn månedsleien under «Rediger boligdata», eller legg beløpet inn på enheten i utleiemodulen.', where: 'begge' },
  pris_fra_finn: { label: 'Pris kun fra FINN', fix: 'Bekreft prisen under «Rediger boligdata», eller legg den inn i utleiemodulen.', where: 'begge' },
  mangler_bilder: { label: 'Mangler bilder', fix: 'Last opp bilder på enheten i utleiemodulen, eller hent dem fra FINN-annonsen.', where: 'begge' },
  bilderettigheter: { label: 'Bilder kun fra FINN', fix: 'Bekreft at vi har rett til å publisere FINN-bildene under «Rediger boligdata», eller last opp egne bilder.', where: 'admin' },
  mangler_areal: { label: 'Mangler areal', fix: 'Fyll inn kvadratmeter i utleiemodulen — eller under «Rediger boligdata».', where: 'begge' },
  mangler_gate: { label: 'Mangler gateadresse', fix: 'Registrer gaten i utleiemodulen — eller under «Rediger boligdata».', where: 'begge' },
};

const num = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
const txt = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();

export function slugify(s) {
  return txt(s)
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

// Slug = lesbar del + de 8 første tegnene av bolig-ID-en. ID-halen gjør at
// lenker vi har sendt ut i nyhetsbrev fortsatt virker selv om tittelen endres.
export function listingSlug(p) {
  const parts = [
    TYPE_LABEL[p?.type] || p?.type || 'bolig',
    num(p?.bedrooms) ? `${num(p.bedrooms)}-soverom` : null,
    num(p?.sqm) ? `${num(p.sqm)}-kvm` : null,
    p?.area,
    p?.district,
  ].filter(Boolean);
  const base = slugify(parts.join(' ')) || 'bolig';
  const id = String(p?.id || '').replace(/-/g, '').slice(0, 8);
  return id ? `${base}-${id}` : base;
}

export function slugIdPart(slug) {
  const m = /([0-9a-f]{8})$/i.exec(String(slug || '').trim());
  return m ? m[1].toLowerCase() : '';
}

// «16 000–18 000 kr/mnd» → { min: 16000, max: 18000 } (for Offer-schema)
export function parseBand(band) {
  const nums = String(band || '').match(/\d[\d\s  ]*/g);
  if (!nums || !nums.length) return null;
  const vals = nums.map((n) => Number(n.replace(/[^\d]/g, ''))).filter((n) => n > 0);
  if (!vals.length) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

// Bilder: absolutte plattform-URL-er brukes rett, relative stier går via
// /api/media (objektlagring).
export function imgSrc(u) {
  const s = txt(u);
  if (!s) return '';
  if (/^(https?:|data:)/i.test(s) || s.startsWith('/api/')) return s;
  const p = s.startsWith('/') ? s : `/${s}`;
  return `/api/media${p}`;
}

// FINN-lenke utad: KUN når kilden er verifisert. Plattformen sendte tidligere
// lenker fra en gammel registrering, og én av dem pekte på feil bolig. Nå
// merkes godkjente annonser med finnSource='manual_ad' (→ finnVerified).
export function publicFinnUrl(p) {
  if (!p || !p.finnUrl) return null;
  const verified = p.finnVerified === true || p.finnSource === 'manuell';
  if (!verified) return null;
  if (p.finnStatus === 'utgatt') return null;
  return p.finnUrl;
}

// ── MÅNEDSLEIE ────────────────────────────────────────────────────────────
// `monthlyRentBand` er feltet som holder den PUBLISERTE prisen. Navnet er
// historisk — feltet inneholdt et prisintervall — men innholdet er nå eksakt
// annonsert månedsleie: «23 000 kr/mnd». Kilden er, i prioritert rekkefølge:
//   1. redaksjonell månedsleie satt under «Rediger boligdata» (rentBandSource
//      'redaksjonell')
//   2. rent.amount fra plattformens enhetseksport = utleiemodulen
//      ('plattform-belop' / 'plattform-estimat')
//   3. FINN — sperret for publisering, se GATE.pris_fra_finn
//
// Plattformens BOLIGeksport sender fortsatt bare et intervall på noen boliger
// («22 000–24 000 kr/mnd»). Da har vi ingen pris å annonsere: vi gjetter ikke på
// et tall inne i et intervall, og en annonse med «ca. 22–24 000» er ikke en
// annonse. Boligen sperres for publisering med koden `pris_uten_belop`, og
// forvalteren fikser det med ett felt.
const nbSpaced = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const formatRent = (n) => (num(n) ? `${nbSpaced(n)} kr/mnd` : null);

// Alle tallgrupper i en pristekst. «23 000 kr/mnd» → [23000].
// «22 000–24 000 kr/mnd» → [22000, 24000].
function rentNumbers(v) {
  const m = String(v == null ? '' : v).match(/\d[\d\s\u00a0\u202f]*/g);
  if (!m) return [];
  return m.map((x) => Number(x.replace(/[^\d]/g, ''))).filter((n) => n > 0);
}

// Ett tall = et beløp vi kan annonsere. Flere tall = intervall, altså ikke et
// beløp.
export function exactRentAmount(v) {
  const ns = rentNumbers(v);
  return ns.length === 1 ? ns[0] : 0;
}

// Én sannhet for «hva er prisen på denne boligen utad».
export function publicRent(p) {
  const text = txt(p?.monthlyRentBand) || null;
  const amount = exactRentAmount(text);
  return {
    amount: amount || null,
    text: amount ? formatRent(amount) : null,
    source: p?.rentBandSource || null,
    rangeOnly: !amount && !!text,   // vi har en pristekst, men ikke et beløp
    missing: !text,
  };
}

export function listingGate(p) {
  const blocking = [];
  const imgs = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  if (!imgs.length) blocking.push('mangler_bilder');
  // FINN-bilder er som regel utleierens eller fotografens, ikke våre. Vi
  // publiserer dem derfor ikke automatisk — men forvalteren kan bekrefte at
  // rettighetene er i orden (typisk når FINN-annonsen er vår egen), og da
  // slipper de gjennom. Bekreftelsen er sporbar per bolig.
  else if (p.imageSource === 'finn' && p.imageRights !== true) blocking.push('bilderettigheter');
  if (!p?.monthlyRentBand) blocking.push('mangler_pris');
  // Pris hentet direkte fra FINN er fortsatt sperret. En månedsleie satt av en
  // DigiHome-forvalter ('redaksjonell') er derimot DigiHomes egen opplysning og
  // slipper gjennom.
  else if (exactRentAmount(p.monthlyRentBand) <= 0) blocking.push('pris_uten_belop');
  else if (p.rentBandSource === 'finn') blocking.push('pris_fra_finn');
  if (!num(p?.sqm)) blocking.push('mangler_areal');
  if (!txt(p?.area)) blocking.push('mangler_gate');

  const contentReady = blocking.length === 0;
  const vacant = p?.status === 'active';
  const hidden = p?.visible !== true;
  if (!vacant) blocking.push('ikke_ledig');
  if (hidden) blocking.push('skjult');

  return {
    contentReady,
    vacant,
    hidden,
    publishable: contentReady && vacant && !hidden,
    blocking,
    // Hvor nær er boligen? Brukes til å sortere admin-lista slik at de som
    // mangler minst kommer først — da vet eieren hva som gir raskest effekt.
    missing: blocking.filter((c) => c !== 'skjult' && c !== 'ikke_ledig').length,
  };
}

// Offentlig kortobjekt. Hvitelisting, ikke stripping — da kan et nytt internt
// felt aldri lekke ved et uhell.
// ── ANNONSETEKST ──────────────────────────────────────────────────────────
// Annonsetekster kommer fra tre steder: redaktøren, utleiemodulen og (manuelt)
// FINN. Blir HTML fjernet uten å sette inn mellomrom, smelter ord sammen —
// «3D Visning</a>https://realsee.ai/…» blir «Visninghttps://realsee.ai/…», og
// slik står det i en av tekstene i dag. Vi rydder derfor ved visning, ikke bare
// ved import: da blir tekster som ALLEREDE ligger i basen lesbare med én gang,
// uten at noen må redigere dem manuelt.
export function cleanRichText(v) {
  let s = String(v == null ? '' : v);
  if (!s.trim()) return '';
  s = s
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, '\n\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(?:quot|#34);/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&(?:lt|#60);/gi, '<')
    .replace(/&(?:gt|#62);/gi, '>')
    // Ord som har smeltet sammen med en URL, og overskrifter som har smeltet
    // sammen med avsnittet under. Bare disse to mønstrene — «DigiHome» og
    // «BankID» skal ikke deles opp av en overivrig regel.
    .replace(/([a-zæøå0-9,.!?])(https?:\/\/)/gi, '$1 $2')
    .replace(/([.!?:])([A-ZÆØÅ][a-zæøå])/g, '$1 $2')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s;
}

export function toListingCard(p) {
  const imgs = (Array.isArray(p?.images) ? p.images : []).filter(Boolean).slice(0, 12).map(imgSrc);
  const scope = scopeOf(p);
  // Prisregel ved romutleie: plattformens beløp er leien for HELE enheten. Å
  // vise det som prisen på ett rom ville vært direkte misvisende, så når bare
  // rom leies ut viser vi ingen pris før forvalteren har satt en månedsleie
  // redaksjonelt (som per definisjon gjelder det som annonseres).
  const editorialPrice = p?.rentBandSource === 'redaksjonell';
  const rent = publicRent(p);
  const rentAmount = scope === 'rom' && !editorialPrice ? null : rent.amount;
  return {
    id: String(p?.id || ''),
    slug: listingSlug(p),
    title: txt(p?.listingTitle) || txt(p?.title) || 'Bolig',
    titleSource: p?.listingTitleSource || null,
    area: txt(p?.area) || null,
    streetAddress: streetWithNumber(p) || null,
    postalCode: postalFromAddress(p),
    district: txt(p?.district) || null,
    city: txt(p?.city) || 'Bergen',
    type: p?.type || null,
    typeLabel: TYPE_LABEL[p?.type] || 'Bolig',
    bedrooms: num(p?.bedrooms) || null,
    sqm: num(p?.sqm) || null,
    model: p?.model || null,
    modelLabel: MODEL_LABEL[p?.model] || 'Utleie',
    // Utleieenhet: hele enheten, rom i bofellesskap, eller begge.
    scope,
    scopeLabel: SCOPE_LABEL[scope],
    scopeShort: SCOPE_SHORT[scope],
    roomsVacant: scope === 'hele' ? null : (num(p?.roomsVacant) || null),
    roomsTotal: scope === 'hele' ? null : (num(p?.roomsTotal) || null),
    roomsLabel: roomsLine(p) || null,
    rentBand: rentAmount ? formatRent(rentAmount) : null,
    // Eksakt annonsert månedsleie. Tallet brukes til filtre, JSON-LD og
    // nyhetsbrev, slik at ingen flate trenger å tolke en tekst.
    rentAmount: rentAmount || null,
    rentText: rentAmount ? formatRent(rentAmount) : null,
    rentSource: rent.source,
    // Hva prisen gjelder — «per rom» eller «for hele enheten» når begge er mulig.
    rentScopeNote: scope === 'rom' ? 'per rom' : (scope === 'begge' ? 'for hele enheten' : null),
    // ISO når datoen kan tolkes (uansett om den kom som «2026-10-01» eller
    // «01.10.2026»), ellers teksten som den står — «Ledig nå» er også et svar.
    availableFrom: toIsoDate(p?.availableFrom) || txt(p?.availableFrom) || null,
    status: p?.status || 'active',
    images: imgs,
    imageCount: imgs.length,
    updatedAt: p?.platformUpdatedAt || p?.updatedAt || null,
  };
}

// ── DATOER ────────────────────────────────────────────────────────────────
// Datoer kommer i to formater: plattformen sender ISO («2026-10-01»), mens
// FINN og norske mennesker skriver «01.10.2026». Det er ikke en kosmetisk
// forskjell: new Date('01.10.2026') tolkes som 10. JANUAR i JavaScript, så en
// bolig som er ledig 1. oktober ble vist som «10. januar» utad. Vi normaliserer
// derfor alt til ISO ved kilden, og godtar begge formater inn.
function isoParts(y, mo, d) {
  const Y = Number(y), M = Number(mo), D = Number(d);
  if (!Number.isFinite(Y) || Y < 1900 || Y > 2200) return null;
  if (!(M >= 1 && M <= 12) || !(D >= 1 && D <= 31)) return null;
  const dt = new Date(Date.UTC(Y, M - 1, D));
  // Fanger 31.02 og liknende: Date ruller over til neste måned.
  if (dt.getUTCMonth() !== M - 1 || dt.getUTCDate() !== D) return null;
  return `${Y}-${String(M).padStart(2, '0')}-${String(D).padStart(2, '0')}`;
}

export function toIsoDate(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) return isoParts(m[1], m[2], m[3]);
  m = /^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/.exec(s);
  if (m) return isoParts(m[3], m[2], m[1]);
  return null;
}

// «2026-10-01» → «1. oktober 2026». UTC hele veien, slik at en dato ikke
// hopper en dag bakover for lesere øst for Greenwich.
export function formatNoDate(v) {
  const iso = toIsoDate(v);
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  try {
    return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('nb-NO', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
    });
  } catch (e) { return iso; }
}

// «Ledig nå» er en gyldig verdi som ikke er en dato. Den lagres som tekst.
export const AVAILABLE_NOW = 'Ledig nå';
export const AVAILABLE_TEXTS = ['Ledig nå', 'Etter avtale', 'Omgående'];

// ── UTLEIEENHET ───────────────────────────────────────────────────────────
// Kan boligen leies som HELE ENHETEN, som ett ROM i et bofellesskap, eller
// BEGGE? Plattformen har ikke feltet, så det settes redaksjonelt i
// marketing-admin. Feltet styrer visning, filtrering og hva interessenten kan
// krysse av for — det påvirker ALDRI økonomi: MRR, LTV og realisert honorar
// kommer fortsatt bare fra faktiske kontrakter i plattformen.
export const RENTAL_SCOPES = ['hele', 'rom', 'begge'];
// Eieren var tydelig: det skal stå «Hele enheten» — ikke «hele boligen» eller
// en forkortelse. Ordlyden er den samme i admin, på boligsiden, i nyhetsbrevet
// og i e-posten til forvalteren.
export const SCOPE_LABEL = {
  hele: 'Hele enheten',
  rom: 'Rom i bofellesskap',
  begge: 'Hele enheten eller rom i bofellesskap',
};
// Kortversjon til trange flater (boligkort, nyhetsbrev, filterpiller).
export const SCOPE_SHORT = {
  hele: 'Hele enheten',
  rom: 'Rom i bofellesskap',
  begge: 'Hele enheten eller rom',
};
// Valgene en interessent krysser av for når begge deler er mulig.
export const SCOPE_CHOICES = [
  { value: 'hele', label: 'Hele enheten', hint: 'Du leier hele boligen — alene eller med dem du velger selv.' },
  { value: 'rom', label: 'Rom i bofellesskap', hint: 'Du leier ett rom og deler fellesarealene med de andre.' },
];
export function scopeOf(p) {
  const v = txt(p?.rentalScope).toLowerCase();
  return RENTAL_SCOPES.includes(v) ? v : 'hele';
}
// Hvilke valg interessenten kan gjøre på denne boligen. Ved «begge» må hun
// velge minst ett — ellers vet ikke forvalteren hva henvendelsen gjelder.
export function scopeOptionsFor(p) {
  const s = scopeOf(p);
  return s === 'begge' ? ['hele', 'rom'] : [s];
}
// Rens og valider det interessenten krysset av for.
export function normalizeInterestScope(v, p) {
  const allowed = scopeOptionsFor(p);
  const list = (Array.isArray(v) ? v : [v])
    .map((x) => txt(x).toLowerCase())
    .filter((x) => allowed.includes(x));
  const uniq = [...new Set(list)];
  // Er bare én ting mulig, er valget implisitt gitt.
  return uniq.length ? uniq : (allowed.length === 1 ? allowed : []);
}
export function interestScopeLabel(list) {
  const arr = (Array.isArray(list) ? list : []).filter((x) => RENTAL_SCOPES.includes(x));
  if (!arr.length) return '';
  if (arr.includes('hele') && arr.includes('rom')) return 'Hele enheten eller rom';
  return SCOPE_LABEL[arr[0]] || '';
}
// «2 av 4 rom ledige» — bare relevant når rom leies ut enkeltvis.
export function roomsLine(p) {
  if (scopeOf(p) === 'hele') return '';
  const v = num(p?.roomsVacant);
  const t = num(p?.roomsTotal);
  if (!v) return '';
  if (t && t >= v) return `${v} av ${t} rom ledige`;
  return `${v} ${v === 1 ? 'rom ledig' : 'rom ledige'}`;
}
// Forklaringen boligsøkeren trenger. «Rom i bofellesskap» betyr noe helt annet
// for prisen og hverdagen enn en hel leilighet, og et misforstått utgangspunkt
// er den dyreste feilen i en visningsrunde — for begge parter.
export function scopeNote(p) {
  const s = scopeOf(p);
  const rooms = roomsLine(p);
  if (s === 'rom') {
    return `Her leier du ditt eget rom i et bofellesskap${rooms ? ` — ${rooms.toLowerCase()}` : ''}. Kjøkken, bad og fellesarealer deles med de andre som bor her.`;
  }
  if (s === 'begge') {
    return `Denne boligen kan leies som hele enheten, eller som ett rom i bofellesskap${rooms ? ` (${rooms.toLowerCase()})` : ''}. Velg hva du er interessert i når du melder interesse — da vet forvalteren hva henvendelsen gjelder.`;
  }
  return '';
}

// ── FRITEKSTSØK ───────────────────────────────────────────────────────────
// Filtre er raske når du vet hva du vil ha, men boligsøkere skriver «sandviken
// 2 soverom» eller husker bare gatenavnet. Søket går på alt vi viser på kortet,
// og alle ordene må treffe (AND) — det er mer presist enn ELLER når utvalget er
// lite. Æ/Ø/Å normaliseres, så «nostet» finner «Nøstet».
const foldNo = (s) => String(s == null ? '' : s).toLowerCase()
  .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  .replace(/\s+/g, ' ').trim();

export function listingHaystack(c) {
  return foldNo([
    c?.title, c?.streetAddress, c?.area, c?.district, c?.city, c?.postalCode,
    c?.typeLabel, c?.modelLabel, c?.scopeLabel, c?.roomsLabel, c?.description,
    c?.bedrooms ? `${c.bedrooms} soverom` : '', c?.sqm ? `${c.sqm} m2 kvm` : '',
  ].filter(Boolean).join(' '));
}

export function matchesQuery(c, q) {
  const needle = foldNo(q);
  if (!needle) return true;
  const hay = listingHaystack(c);
  return needle.split(' ').filter(Boolean).every((w) => hay.includes(w));
}

// ── INTERESSE-POST ────────────────────────────────────────────────────────
// Én kanonisk form uansett om interessen kom fra boligsiden eller fra
// nyhetsbrevet. Poenget er `unitId`: det er plattformens egen enhets-ID, og
// uten den kan ikke den andre plattformen lagre meldingen PÅ boligen — da
// havner henvendelsen som en løs leietakerprofil uten kontekst, og forvalteren
// vet ikke hva hun svarer på.
export function interestRecord(p, opts = {}) {
  const scope = normalizeInterestScope(opts.scope, p);
  const unitId = String(p?.externalId || p?.id || '');
  const slug = listingSlug(p);
  const base = String(opts.baseUrl || '').replace(/\/$/, '');
  const at = opts.at || new Date().toISOString();
  return {
    propertyId: unitId,
    unitId,
    localPropertyId: p?.id || null,
    propertyTitle: txt(p?.listingTitle) || txt(p?.title) || 'Bolig',
    propertyArea: txt(p?.area) || txt(p?.city) || '',
    propertyAddress: streetWithNumber(p) || txt(p?.area) || '',
    propertyDistrict: txt(p?.district) || '',
    propertySlug: slug,
    propertyUrl: `${base}${LISTINGS_PATH}/${slug}`,
    // Hva boligen tilbyr — og hva interessenten faktisk krysset av for.
    rentalScope: scopeOf(p),
    scope,
    scopeLabel: interestScopeLabel(scope) || SCOPE_LABEL[scopeOf(p)],
    // Fritekst fra interessenten. Følger interessen hele veien: admin,
    // varselet til forvalteren og payloaden til plattformen.
    message: txt(opts.message).slice(0, 2000),
    status: opts.status || 'interested',
    at,
    lastConfirmedAt: at,
    source: opts.source || 'ledige-boliger',
  };
}

// Plattformen henter noen adresser fra offentlig register og sender dem i
// BLOKKBOKSTAVER («ST. HANSSTREDET 5»). Det ser amatørmessig ut i en annonse.
// Vi setter dem i normal norsk kasus — men bare når kilden faktisk er ren
// caps. «Olaf Ryes vei 11C» røres ikke (ellers ville «vei» blitt «Vei»), og
// husnummer med bokstavsuffiks beholder stor bokstav.
export function prettyStreet(v) {
  const s = txt(v);
  if (!s) return '';
  const letters = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (!letters || letters !== letters.toUpperCase()) return s;
  return s.toLowerCase().split(' ').map((w) => (
    /\d/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
  )).join(' ');
}

// Full gateadresse MED husnummer. Kilden er street («Baglergaten 8») eller
// fullAddress («Baglergaten 8, 5003 Bergen») — area er alltid uten nummer,
// fordi den brukes til filtrering og slug.
//
// Merk: vi viser bevisst full adresse på ledige boliger (som FINN og alle andre
// utleieannonser gjør), men fortsatt ALDRI eksakt leie — bare prisintervall.
// Da kan et beløp ikke knyttes til en identifiserbar leieavtale, som var hele
// poenget med personvernregelen. Eier og leietaker nevnes fortsatt aldri.
function streetWithNumber(p) {
  const s = txt(p?.street);
  if (s) return prettyStreet(s);
  const full = txt(p?.fullAddress);
  if (full) return prettyStreet(full.split(',')[0].trim());
  const a = txt(p?.area);
  const n = txt(p?.houseNumber);
  if (!a) return '';
  return prettyStreet(n && !a.includes(n) ? `${a} ${n}` : a);
}

// Adresse-, fakta- og ledig-linje for boligkort i nyhetsbrev og admin.
// Delt opp fordi et moderne boligkort setter dem på hver sin linje — men
// `propertyMetaLine` setter dem sammen igjen for eldre utkast og kompakte flater.
// Alt kommer fra samme kilde som den offentlige boligsiden, slik at nyhetsbrevet
// aldri sier noe annet enn nettsiden (og «Ledig 2026-09-01» ikke går ut i e-post).
export function propertyAddressLine(p) {
  return streetWithNumber(p) || txt(p?.area) || txt(p?.city);
}
export function propertyFactsLine(p) {
  return [
    num(p?.bedrooms) ? `${num(p.bedrooms)} soverom` : null,
    num(p?.sqm) ? `${num(p.sqm)} m²` : null,
  ].filter(Boolean).join(' · ');
}
export function propertyAvailableLine(p) {
  if (!p?.availableFrom) return '';
  const f = formatNoDate(p.availableFrom) || txt(p.availableFrom);
  return f ? `Ledig ${f}` : '';
}
export function propertyMetaLine(p) {
  return [propertyAddressLine(p), propertyFactsLine(p), propertyAvailableLine(p)]
    .filter(Boolean).join(' · ');
}

// Fakta som allerede står i annonsetittelen skal ikke gjentas rett under den.
// Avledede titler er f.eks. «Møblert leilighet · 2 soverom · 55 m²» — da blir
// «2 soverom · 55 m²» på neste linje bare støy.
export function dedupeFacts(title, facts) {
  const t = String(title || '').toLowerCase().replace(/\s+/g, ' ');
  return String(facts || '').split('·').map((s) => s.trim()).filter(Boolean)
    .filter((f) => !t.includes(f.toLowerCase().replace(/\s+/g, ' ')))
    .join(' · ');
}

// Postnummer for PostalAddress i JSON-LD. Plattformen sender feltet tomt, men
// fullAddress inneholder det («…, 5032 Bergen»). Kun 4 sifre etter komma —
// aldri husnummeret.
function postalFromAddress(p) {
  const direct = txt(p?.postalCode);
  if (/^\d{4}$/.test(direct)) return direct;
  const m = /,\s*(\d{4})(?:\s|,|$)/.exec(txt(p?.fullAddress));
  return m ? m[1] : null;
}

export function toListingDetail(p) {
  return {
    ...toListingCard(p),
    // Forklaringen av utleieenhet hører hjemme på detaljsiden: den er for lang
    // for et kort, men avgjørende før noen melder interesse.
    scopeNote: scopeNote(p) || null,
    // Annonsetekst kommer ikke fra plattformen (0 av 22 enheter har den), så
    // dette er redaksjonelt innhold skrevet i marketing-admin. Det er samtidig
    // det viktigste enkeltfeltet for søk på en boligside.
    description: cleanRichText(p?.description) || null,
    finnUrl: publicFinnUrl(p),
    platformUrl: txt(p?.publicUrl) || null,
  };
}

export function buildFacets(cards) {
  const count = (key) => cards.reduce((a, c) => {
    const v = c[key];
    if (!v) return a;
    a[v] = (a[v] || 0) + 1;
    return a;
  }, {});
  const districts = Object.entries(count('district')).map(([k, n]) => ({ key: k, label: k, count: n })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'nb'));
  const models = Object.entries(count('model')).map(([k, n]) => ({ key: k, label: MODEL_LABEL[k] || k, count: n }));
  const bedrooms = [...new Set(cards.map((c) => c.bedrooms).filter(Boolean))].sort((a, b) => a - b)
    .map((n) => ({ key: String(n), label: n >= 4 ? '4+ soverom' : `${n} soverom`, count: cards.filter((c) => (n >= 4 ? c.bedrooms >= 4 : c.bedrooms === n)).length }));
  const amounts = cards.map((c) => num(c.rentAmount)).filter(Boolean);
  const priceMin = amounts.length ? Math.min(...amounts) : null;
  const priceMax = amounts.length ? Math.max(...amounts) : null;
  return { districts, models, bedrooms: bedrooms.filter((b) => Number(b.key) < 4).concat(bedrooms.some((b) => Number(b.key) >= 4) ? [{ key: '4', label: '4+ soverom', count: cards.filter((c) => c.bedrooms >= 4).length }] : []), priceMin, priceMax };
}

// Admin-oversikt: hva mangler før hver bolig kan publiseres. Sorteres slik at
// de som mangler minst kommer først.
export function publishReadiness(properties) {
  const rows = (Array.isArray(properties) ? properties : []).map((p) => ({
    id: p.id,
    area: p.area || null,
    title: p.listingTitle || p.title || 'Bolig',
    status: p.status,
    gate: listingGate(p),
    platformBlockers: p.platformBlockers || [],
  }));
  const published = rows.filter((r) => r.gate.publishable);
  const ready = rows.filter((r) => r.gate.contentReady && r.gate.vacant && r.gate.hidden);
  const almost = rows.filter((r) => !r.gate.contentReady && r.gate.vacant).sort((a, b) => a.gate.missing - b.gate.missing);
  return { rows, published, ready, almost, total: rows.length };
}

export default { listingSlug, listingGate, toListingCard, publishReadiness };
