// Konfigurasjon for Google Ads-kampanjesider (/lp/[slug]).
// Message-match mot annonsetekst. noindex. Leads merkes source: lp-{slug}.

const COMMON_FAQ = [
  {
    q: 'Hva skjer etter at jeg har sendt inn skjemaet?',
    a: 'Vi analyserer boligen og leiemarkedet i området ditt, og kontakter deg innen 24 timer med en konkret vurdering av hva boligen kan tjene. Helt uforpliktende — du bestemmer selv om du vil gå videre.',
  },
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

const COMMON_URGENCY = 'Vi tar inn et begrenset antall nye boliger i Bergen hver måned.';

// Felles innhold (deles av alle kampanjesider for et konsekvent verdensklasse-uttrykk).
export const COMMON_STEPS = [
  { n: '01', t: 'Gratis vurdering', d: 'Vi analyserer boligen og markedet, og forteller deg nøyaktig hva den kan tjene i Bergen — innen 24 timer.' },
  { n: '02', t: 'Vi klargjør og annonserer', d: 'Profesjonell styling, foto og annonsering der leietakerne leter. Vi finner og kvalitetssjekker de rette leietakerne.' },
  { n: '03', t: 'Du mottar inntekten', d: 'Vi håndterer husleie, kontrakter, vedlikehold og support. Du følger alt i sanntid — og får pengene rett på konto.' },
];

export const COMMON_TESTIMONIALS = [
  { quote: 'Jeg trodde utleie kom til å bli et mareritt. DigiHome tok over alt — nå får jeg mer i leie enn før, uten å løfte en finger.', name: 'Anette H.', area: 'Sandviken' },
  { quote: 'Forrige leietaker fant de på under en uke. Profesjonelt fra første kontakt, og jeg ser hver eneste krone i appen.', name: 'Stian M.', area: 'Åsane' },
  { quote: 'Endelig en aktør som faktisk svarer og leverer. Inntekten gikk merkbart opp etter at de la om prisingen.', name: 'Marianne L.', area: 'Møhlenpris' },
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
    sub: 'Annonsering, leietakere, husleie og vedlikehold — vi gjør alt, du mottar inntekten. Få en gratis vurdering innen 24 timer.',
    bullets: [
      '0 kr oppstart — ingen bindingstid',
      'Dedikert forvalter som kjenner boligen din',
      'Full oversikt i sanntid',
    ],
    image: '/interior-openplan-hero.webp',
    accent,
    heroStat: { value: '0 kr', label: 'oppstart · ingen binding' },
    proofNote: 'Profesjonell forvaltning løfter typisk inntekten samtidig som du slipper alt arbeidet. Prøv kalkulatoren og se hva boligen din kan ligge på.',
    formTitle: 'Få gratis vurdering av boligen din',
    cta: 'Start gratis vurdering',
    urgency: COMMON_URGENCY,
    metaTitle: 'Full eiendomsforvaltning i Bergen — DigiHome',
    metaDesc: 'La DigiHome forvalte utleieboligen din i Bergen. Annonsering, leietakere, husleie og vedlikehold — uten oppstartskostnader. Få en gratis vurdering.',
    faq: COMMON_FAQ,
  },
  inntekt: {
    slug: 'inntekt',
    source: 'lp-inntekt',
    eyebrow: 'Høyere leieinntekt',
    h1: 'Opptil 30 % høyere leieinntekt',
    sub: 'Hybridmodellen vår kombinerer langtids- og korttidsutleie med dynamisk prising — uten at du løfter en finger. Se hva din bolig kan tjene, innen 24 timer.',
    bullets: [
      'Dynamisk prising døgnet rundt',
      'Hybrid korttid + langtid (10+2)',
      'Snitt i Bergen: 25 000 kr/mnd',
    ],
    image: '/interior-openplan.webp',
    accent,
    heroStat: { value: '+30%', label: 'høyere leieinntekt' },
    proofNote: 'Dynamisk prising og smart miks gir mer ut av den samme boligen — hver måned. Prøv kalkulatoren og se nivået for ditt område.',
    formTitle: 'Se hva boligen din kan tjene',
    cta: 'Se hva boligen kan tjene',
    urgency: COMMON_URGENCY,
    metaTitle: 'Opptil 30 % høyere leieinntekt — DigiHome Bergen',
    metaDesc: 'Tjen opptil 30 % mer på utleieboligen din i Bergen med DigiHomes hybridmodell og dynamiske prising. Få en gratis, uforpliktende vurdering.',
    faq: COMMON_FAQ,
  },
  '10pluss2': {
    slug: '10pluss2',
    source: 'lp-10pluss2',
    eyebrow: '10+2-modellen',
    h1: '10 måneder fast. 2 måneder sesong.',
    sub: 'Forutsigbar langtidsinntekt i 10 måneder, og lukrativ korttidsutleie i 2 høysesongmåneder. Det beste fra begge verdener — vurdert gratis innen 24 timer.',
    bullets: [
      'Trygg, fast leietaker mesteparten av året',
      'Ekstra avkastning i høysesongen',
      'Opptil 30 % høyere total inntekt',
    ],
    image: '/interior-kitchen2.webp',
    accent,
    heroStat: { value: '10+2', label: 'måneder optimal miks' },
    proofNote: '10 trygge måneder + 2 høysesongmåneder = klart høyere årsinntekt. Prøv kalkulatoren og se hva det betyr for din bolig.',
    formTitle: 'Se hva 10+2 gir for din bolig',
    cta: 'Se hva 10+2 gir deg',
    urgency: COMMON_URGENCY,
    metaTitle: '10+2-modellen: smartere utleie i Bergen — DigiHome',
    metaDesc: '10 måneder langtidsutleie og 2 måneder korttid i høysesong. DigiHomes 10+2-modell gir opptil 30 % høyere inntekt. Få en gratis vurdering.',
    faq: COMMON_FAQ,
  },
  'arvet-bolig': {
    slug: 'arvet-bolig',
    source: 'lp-arvet-bolig',
    eyebrow: 'Arvet eller tom bolig',
    h1: 'Arvet en bolig? La den tjene penger — uten stress',
    sub: 'Vi gjør boligen utleieklar og forvalter alt for deg. Ingen oppussingsmareritt, ingen leietaker-styr — og du trenger ikke bo i Bergen.',
    bullets: [
      'Vi klargjør, styler og annonserer',
      'Full forvaltning — uansett hvor du bor',
      '0 kr oppstart — ingen bindingstid',
    ],
    image: '/interior-living.webp',
    accent,
    heroStat: { value: '0 kr', label: 'oppstart · vi gjør alt' },
    proofNote: 'En tom bolig koster deg penger hver måned. Utleid gjennom oss gir den trygg inntekt — helt passivt. Se nivået i kalkulatoren.',
    formTitle: 'Få boligen vurdert — helt gratis',
    cta: 'Start gratis vurdering',
    urgency: COMMON_URGENCY,
    metaTitle: 'Arvet bolig i Bergen? Trygg utleie uten stress — DigiHome',
    metaDesc: 'Arvet eller tom bolig i Bergen? DigiHome gjør den utleieklar og forvalter alt — uten oppstartskostnader. Perfekt om du ikke bor i byen. Gratis vurdering.',
    faq: COMMON_FAQ,
  },
  'airbnb-langtid': {
    slug: 'airbnb-langtid',
    source: 'lp-airbnb-langtid',
    eyebrow: 'Fra Airbnb til trygg inntekt',
    h1: 'Lei av Airbnb-maset? Få forutsigbar inntekt',
    sub: 'Slipp rengjøring, nøkkeloverlevering og svingende belegg. Hybridmodellen vår gir høy avkastning — uten det daglige styret Airbnb krever.',
    bullets: [
      'Ingen rengjøring eller gjestechat',
      'Hybrid korttid + langtid for maks avkastning',
      'Forutsigbar inntekt rett på konto',
    ],
    image: '/interior-openplan.webp',
    accent,
    heroStat: { value: '+30%', label: 'avkastning · null mas' },
    proofNote: 'Du beholder korttidsoppsiden i høysesong, men slipper alt det daglige arbeidet Airbnb krever. Prøv kalkulatoren under.',
    formTitle: 'Se hva du kan tjene — uten maset',
    cta: 'Start gratis vurdering',
    urgency: COMMON_URGENCY,
    metaTitle: 'Fra Airbnb til trygg utleie i Bergen — DigiHome',
    metaDesc: 'Trøtt av Airbnb-maset i Bergen? DigiHomes hybridmodell gir høy avkastning uten rengjøring, gjestechat og svingende belegg. Få en gratis vurdering.',
    faq: COMMON_FAQ,
  },
};

export function getLanding(slug) {
  return LANDING[slug] || null;
}

export function landingSlugs() {
  return Object.keys(LANDING);
}
