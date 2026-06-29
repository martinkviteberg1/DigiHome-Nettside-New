// Konfigurasjon for Google Ads-kampanjesider (/lp/[slug]).
// Message-match mot annonsetekst. noindex. Leads merkes source: lp-{slug}.

const COMMON_FAQ = [
  {
    q: 'Hva koster det?',
    a: 'Ingenting å komme i gang. DigiHome har ingen oppstartskostnader og ingen bindingstid — du betaler kun en andel når boligen faktisk gir leieinntekt.',
  },
  {
    q: 'Hvor raskt hører jeg fra dere?',
    a: 'Vi tar kontakt innen 24 timer med en gratis, uforpliktende vurdering av hva boligen din kan tjene.',
  },
  {
    q: 'Hvilke områder dekker dere?',
    a: 'Vi forvalter boliger i hele Bergen — inkludert Nordnes, Sandviken, Møhlenpris, Sentrum, Åsane, Fana og Laksevåg.',
  },
  {
    q: 'Hvem tar seg av leietakerne?',
    a: 'Vi gjør alt: markedsføring, visninger, kredittsjekk, kontrakter, innkreving av husleie og all løpende oppfølging. Du slipper å forholde deg til leietakerne i det hele tatt.',
  },
  {
    q: 'Hva om noe blir ødelagt?',
    a: 'Vi kvalitetssikrer leietakere med kredittsjekk og depositum, og håndterer vedlikehold og eventuelle skader på dine vegne — med full dokumentasjon i appen.',
  },
];

// Felles innhold (deles av alle kampanjesider for et konsekvent verdensklasse-uttrykk).
export const COMMON_STEPS = [
  { n: '01', t: 'Gratis vurdering', d: 'Vi analyserer boligen og markedet, og forteller deg nøyaktig hva den kan tjene i Bergen — innen 24 timer.' },
  { n: '02', t: 'Vi klargjør og annonserer', d: 'Profesjonell styling, foto og annonsering der leietakerne leter. Vi finner og kvalitetssjekker de rette leietakerne.' },
  { n: '03', t: 'Du mottar inntekten', d: 'Vi håndterer husleie, kontrakter, vedlikehold og support. Du følger alt i sanntid — og får pengene rett på konto.' },
];

export const COMMON_TESTIMONIALS = [
  { quote: 'Jeg trodde utleie kom til å bli et mareritt. DigiHome tok over alt — nå får jeg mer i leie enn før, uten å løfte en finger.', name: 'Anette H.', area: 'Sandviken', avatar: '/chat-user.webp' },
  { quote: 'Forrige leietaker fant de på under en uke. Profesjonelt fra første kontakt, og jeg ser hver eneste krone i appen.', name: 'Stian M.', area: 'Åsane', avatar: '/chat-user.webp' },
  { quote: 'Endelig en aktør som faktisk svarer og leverer. Inntekten gikk merkbart opp etter at de la om prisingen.', name: 'Marianne L.', area: 'Møhlenpris', avatar: '/chat-user.webp' },
];

// Kanaler vi annonserer på (logoer i /public).
export const COMMON_CHANNELS = [
  { src: '/finn-logo-full.png', alt: 'FINN', h: 22 },
  { src: '/airbnb-logo.png', alt: 'Airbnb', h: 26 },
  { src: '/booking-logo.png', alt: 'Booking.com', h: 22 },
];

const accent = '/bergen-rooftops.webp';

export const LANDING = {
  forvaltning: {
    slug: 'forvaltning',
    source: 'lp-forvaltning',
    eyebrow: 'Eiendomsforvaltning i Bergen',
    h1: 'Full forvaltning av utleieboligen din',
    sub: 'Vi tar oss av alt — annonsering, leietakere, husleie og vedlikehold. Du mottar inntekten, vi gjør jobben.',
    bullets: [
      'Ingen oppstartskostnader eller bindingstid',
      'Dedikert forvalter som kjenner boligen din',
      'Full oversikt i sanntid — du ser alt som skjer',
    ],
    image: '/interior-openplan-hero.webp',
    accent,
    heroStat: { value: '0 kr', label: 'oppstart · ingen binding' },
    proofNote: 'Profesjonell forvaltning løfter typisk inntekten samtidig som du slipper alt arbeidet.',
    metaTitle: 'Full eiendomsforvaltning i Bergen — DigiHome',
    metaDesc: 'La DigiHome forvalte utleieboligen din i Bergen. Annonsering, leietakere, husleie og vedlikehold — uten oppstartskostnader. Få en gratis vurdering.',
    faq: COMMON_FAQ,
  },
  inntekt: {
    slug: 'inntekt',
    source: 'lp-inntekt',
    eyebrow: 'Høyere leieinntekt',
    h1: 'Opptil 30 % høyere leieinntekt',
    sub: 'Hybridmodellen vår kombinerer langtids- og korttidsutleie med dynamisk prising for maksimal avkastning — uten at du løfter en finger.',
    bullets: [
      'Dynamisk prising som følger markedet døgnet rundt',
      'Hybrid korttid + langtid (10+2-modellen)',
      'Snittinntekt i Bergen rundt 25 000 kr/mnd',
    ],
    image: '/interior-openplan.webp',
    accent,
    heroStat: { value: '+30%', label: 'høyere leieinntekt' },
    proofNote: 'Dynamisk prising og smart miks gir mer ut av den samme boligen — hver måned.',
    metaTitle: 'Opptil 30 % høyere leieinntekt — DigiHome Bergen',
    metaDesc: 'Tjen opptil 30 % mer på utleieboligen din i Bergen med DigiHomes hybridmodell og dynamiske prising. Få en gratis, uforpliktende vurdering.',
    faq: COMMON_FAQ,
  },
  '10pluss2': {
    slug: '10pluss2',
    source: 'lp-10pluss2',
    eyebrow: '10+2-modellen',
    h1: '10 måneder fast. 2 måneder sesong.',
    sub: 'Forutsigbar langtidsinntekt i 10 måneder, og lukrativ korttidsutleie i 2 høysesongmåneder. Det beste fra begge verdener.',
    bullets: [
      'Trygg, fast leietaker mesteparten av året',
      'Ekstra avkastning i høysesongen',
      'Opptil 30 % høyere total inntekt',
    ],
    image: '/interior-kitchen2.webp',
    accent,
    heroStat: { value: '10+2', label: 'måneder optimal miks' },
    proofNote: '10 trygge måneder + 2 høysesongmåneder = klart høyere årsinntekt.',
    metaTitle: '10+2-modellen: smartere utleie i Bergen — DigiHome',
    metaDesc: '10 måneder langtidsutleie og 2 måneder korttid i høysesong. DigiHomes 10+2-modell gir opptil 30 % høyere inntekt. Få en gratis vurdering.',
    faq: COMMON_FAQ,
  },
};

export function getLanding(slug) {
  return LANDING[slug] || null;
}

export function landingSlugs() {
  return Object.keys(LANDING);
}
