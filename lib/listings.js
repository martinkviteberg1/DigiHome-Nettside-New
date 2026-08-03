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
// PERSONVERN: aldri husnummer, eier, leietaker, full adresse eller eksakt
// leiebeløp. Gatenavn, bydel, areal, soverom og prisintervall — punktum.
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
  mangler_pris: { label: 'Mangler pris', fix: 'Legg inn leiepris på enheten i utleiemodulen.', where: 'plattform' },
  pris_fra_finn: { label: 'Pris kun fra FINN', fix: 'Prisen må bekreftes i utleiemodulen før den kan publiseres.', where: 'plattform' },
  mangler_bilder: { label: 'Mangler bilder', fix: 'Last opp bilder på enheten i utleiemodulen.', where: 'plattform' },
  bilderettigheter: { label: 'Bilder kun fra FINN', fix: 'FINN-bilder publiseres ikke på egen nettside. Last opp bilder i utleiemodulen.', where: 'plattform' },
  mangler_areal: { label: 'Mangler areal', fix: 'Fyll inn kvadratmeter på enheten i utleiemodulen.', where: 'plattform' },
  mangler_gate: { label: 'Mangler gateadresse', fix: 'Registrer adressen på enheten i utleiemodulen.', where: 'plattform' },
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

export function listingGate(p) {
  const blocking = [];
  const imgs = Array.isArray(p?.images) ? p.images.filter(Boolean) : [];
  if (!imgs.length) blocking.push('mangler_bilder');
  else if (p.imageSource === 'finn') blocking.push('bilderettigheter');
  if (!p?.monthlyRentBand) blocking.push('mangler_pris');
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
export function toListingCard(p) {
  const imgs = (Array.isArray(p?.images) ? p.images : []).filter(Boolean).slice(0, 12).map(imgSrc);
  return {
    id: String(p?.id || ''),
    slug: listingSlug(p),
    title: txt(p?.listingTitle) || txt(p?.title) || 'Bolig',
    titleSource: p?.listingTitleSource || null,
    area: txt(p?.area) || null,
    district: txt(p?.district) || null,
    city: txt(p?.city) || 'Bergen',
    type: p?.type || null,
    typeLabel: TYPE_LABEL[p?.type] || 'Bolig',
    bedrooms: num(p?.bedrooms) || null,
    sqm: num(p?.sqm) || null,
    model: p?.model || null,
    modelLabel: MODEL_LABEL[p?.model] || 'Utleie',
    rentBand: txt(p?.monthlyRentBand) || null,
    // Prisantydning: enten fordi intervallet er bygget av plattformens
    // estimatbeløp, eller fordi plattformen selv har flagget leien som estimat
    // (ledige boliger har prisantydning — utleide har faktisk kontraktsleie).
    rentIndicative: p?.rentBandSource === 'plattform-estimat' || p?.rentIsEstimate === true,
    availableFrom: txt(p?.availableFrom) || null,
    status: p?.status || 'active',
    images: imgs,
    imageCount: imgs.length,
    updatedAt: p?.platformUpdatedAt || p?.updatedAt || null,
  };
}

export function toListingDetail(p) {
  return {
    ...toListingCard(p),
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
  const bands = cards.map((c) => parseBand(c.rentBand)).filter(Boolean);
  const priceMin = bands.length ? Math.min(...bands.map((b) => b.min)) : null;
  const priceMax = bands.length ? Math.max(...bands.map((b) => b.max)) : null;
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
