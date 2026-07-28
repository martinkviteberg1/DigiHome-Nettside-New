// Konfigurasjon for Google Ads-kampanjesider (/lp/[slug]).
// Message-match mot annonsetekst. noindex. Leads merkes source: lp-{slug}.

const COMMON_FAQ = [
  {
    q: 'Hva skjer etter at jeg har sendt inn skjemaet?',
    a: 'Vi kontakter deg innen 24 timer, og gir deg en konkret vurdering av hva boligen kan tjene. Helt uforpliktende — du bestemmer selv om du vil gå videre.',
  },
  {
    q: 'Hva koster det?',
    a: 'Ingenting å komme i gang. DigiHome har ingen oppstartskostnader og ingen bindingstid — du betaler kun en andel når boligen faktisk gir leieinntekt.',
  },
  {
    q: 'Hvor raskt hører jeg fra dere?',
    a: 'Innen 24 timer. Du hører fra oss med en gratis, uforpliktende vurdering av hva boligen din kan tjene — innen 24 timer.',
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

const COMMON_URGENCY = 'Personlig vurdering fra vårt lokale team i Bergen.';

// Felles innhold (deles av alle kampanjesider for et konsekvent verdensklasse-uttrykk).
export const COMMON_STEPS = [
  { n: '01', t: 'Gratis vurdering', d: 'Vi analyserer boligen og markedet, og forteller deg nøyaktig hva den kan tjene i Bergen — du får svar innen 24 timer.' },
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
    h1B: 'Vi gjør jobben. Du mottar leien.',
    sub: 'Annonsering, leietakere, husleie og vedlikehold — vi gjør alt, du mottar inntekten. Få en gratis vurdering — svar innen 24 timer.',
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
    cta: 'Få gratis vurdering',
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
    h1B: 'Hva kan boligen din tjene? Få svar innen 24 timer',
    sub: 'Hybridmodellen vår kombinerer langtids- og korttidsutleie med dynamisk prising — uten at du løfter en finger. Se hva din bolig kan tjene — svar innen 24 timer.',
    bullets: [
      'Dynamisk prising døgnet rundt',
      'Hybrid korttid + langtid (10+2)',
      'Snitt i Bergen: 25 000 kr/mnd',
    ],
    image: '/interior-openplan.webp',
    accent,
    heroStat: { value: '+30%', label: 'høyere leieinntekt' },
    proofNote: 'Dynamisk prising og smart miks gir mer ut av den samme boligen — hver måned. Prøv kalkulatoren og se nivået for ditt område.',
    formTitle: 'Få en gratis vurdering av boligen',
    cta: 'Få gratis vurdering',
    urgency: COMMON_URGENCY,
    metaTitle: 'Opptil 30 % høyere leieinntekt — DigiHome Bergen',
    metaDesc: 'Tjen opptil 30 % mer på utleieboligen din i Bergen med DigiHomes hybridmodell og dynamiske prising. Få en gratis, uforpliktende vurdering.',
    faq: COMMON_FAQ,
  },
  '10pluss2': {
    slug: '10pluss2',
    source: 'lp-10pluss2',
    eyebrow: '10+2-modellen',
    h1: '10 måneder fast. 2 måneder sesong — for boligeiere.',
    sub: 'For deg som eier utleiebolig i Bergen: forutsigbar langtidsinntekt i 10 måneder og mulighet for korttidsutleie i 2 høysesongmåneder. Få en personlig vurdering innen 24 timer.',
    bullets: [
      'Trygg, fast leietaker mesteparten av året',
      'Ekstra avkastning i høysesongen',
      'Opptil 30 % høyere total inntekt',
    ],
    image: '/interior-kitchen2.webp',
    accent,
    heroStat: { value: '10+2', label: 'måneder optimal miks' },
    proofNote: '10 trygge måneder + 2 høysesongmåneder = klart høyere årsinntekt. Prøv kalkulatoren og se hva det betyr for din bolig.',
    formTitle: 'Få en gratis 10+2-vurdering',
    cta: 'Få gratis vurdering',
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
    cta: 'Få gratis vurdering',
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
    formTitle: 'Få en gratis vurdering — uten Airbnb-maset',
    cta: 'Få gratis vurdering',
    urgency: COMMON_URGENCY,
    metaTitle: 'Fra Airbnb til trygg utleie i Bergen — DigiHome',
    metaDesc: 'Trøtt av Airbnb-maset i Bergen? DigiHomes hybridmodell gir høy avkastning uten rengjøring, gjestechat og svingende belegg. Få en gratis vurdering.',
    faq: COMMON_FAQ,
  },
};

// FAQ spisset mot sammenligning (konkurrent-/conquest-trafikk).
const SAMMENLIGN_FAQ = [
  {
    q: 'Hvordan kan DigiHome ta 0 kr i oppstart?',
    a: 'Fordi vi tjener penger på samme måte som deg: en andel av faktisk leieinntekt. Tradisjonelle utleiemeglere tar ofte 15 000–25 000 kr i etableringsgebyr og provisjon før boligen har tjent en krone. Hos oss betaler du først når boligen faktisk gir inntekt.',
  },
  {
    q: 'Hva er forskjellen på DigiHome og en tradisjonell utleiemegler?',
    a: 'Vi gjør den samme jobben — annonsering, visninger, kontrakter, husleie og vedlikehold — men med moderne teknologi: dynamisk prising, hybrid korttid + langtid (10+2) og full sanntidsoversikt i egen app. Og uten oppstartskostnader eller bindingstid.',
  },
  {
    q: 'Kan jeg bytte til DigiHome hvis jeg allerede har forvalter?',
    a: 'Ja. Vi hjelper deg gjennom hele byttet — inkludert overgang av leieforhold og kontrakter. Send inn skjemaet, så ser vi på situasjonen din innen 24 timer, helt uforpliktende.',
  },
  ...COMMON_FAQ.slice(0, 4),
];

LANDING['sammenlign'] = {
  slug: 'sammenlign',
  source: 'lp-sammenlign',
  eyebrow: 'Sammenlign før du velger',
  h1: 'Vurderer du utleiemegler? Se hva du sparer',
  h1B: 'Samme jobb utført. 0 kr oppstart.',
  sub: 'Tradisjonelle utleiemeglere tar ofte 15 000–25 000 kr bare for å komme i gang. DigiHome gjør hele jobben — annonsering, leietakere, husleie og vedlikehold — uten oppstartskostnader og uten bindingstid.',
  bullets: [
    '0 kr oppstart — spar 20 000+ kr fra dag én',
    'Ingen bindingstid — avslutt når du vil',
    'Opptil 30 % høyere inntekt med hybridmodellen',
  ],
  image: '/interior-living.webp',
  accent,
  heroStat: { value: '20 000+ kr', label: 'typisk spart i oppstart' },
  proofNote: 'Du betaler kun en andel når boligen faktisk gir leieinntekt — aldri forskudd. Prøv kalkulatoren og se hva boligen din kan ligge på.',
  formTitle: 'Få en gratis sammenligning for din bolig',
  cta: 'Få gratis sammenligning',
  urgency: COMMON_URGENCY,
  metaTitle: 'DigiHome vs. tradisjonell utleiemegler — 0 kr oppstart',
  metaDesc: 'Sammenlign DigiHome med tradisjonelle utleiemeglere i Bergen: 0 kr oppstart, ingen bindingstid og opptil 30 % høyere leieinntekt. Få en gratis vurdering.',
  faq: SAMMENLIGN_FAQ,
  comparison: {
    eyebrow: 'Se forskjellen',
    title: 'DigiHome vs. tradisjonell utleiemegler',
    intro: 'Samme fulle forvaltning av boligen din — men en helt annen prismodell.',
    us: 'DigiHome',
    them: 'Tradisjonell megler',
    rows: [
      { label: 'Oppstartskostnad', us: '0 kr', them: 'Ofte 15 000–25 000 kr' },
      { label: 'Bindingstid', us: 'Ingen', them: 'Ofte 6–12 måneder' },
      { label: 'Prismodell', us: 'Andel av faktisk leieinntekt', them: 'Provisjon + faste gebyrer' },
      { label: 'Dynamisk prising døgnet rundt', us: true, them: false },
      { label: 'Hybrid korttid + langtid (10+2)', us: true, them: false },
      { label: 'Sanntidsinnsyn i egen app', us: true, them: false },
      { label: 'Svartid på henvendelser', us: 'Innen 24 timer', them: 'Ofte 1–3 virkedager' },
      { label: 'Lokalt team i Bergen', us: true, them: 'Varierer' },
    ],
    footnote: 'Sammenligningen bygger på typiske, offentlig tilgjengelige prismodeller hos tradisjonelle utleiemeglere i Norge (2026). Priser og vilkår varierer mellom aktører.',
  },
};

export function getLanding(slug) {
  return LANDING[slug] || null;
}

export function landingSlugs() {
  return Object.keys(LANDING);
}

// --- AI-genererte kampanjesider (Annonsestudio Fase 2) ---------------------
// Dokumenter i studio_lps normaliseres til samme cfg-form som de statiske
// sidene over, slik at CampaignLanding rendrer dem 1:1 (message match).
export function normalizeStudioLp(doc) {
  if (!doc || !doc.slug || !doc.h1) return null;
  const bullets = Array.isArray(doc.bullets) ? doc.bullets.filter(Boolean).slice(0, 4) : [];
  return {
    slug: doc.slug,
    source: `lp-${doc.slug}`,
    eyebrow: doc.eyebrow || 'Kampanje',
    h1: doc.h1,
    h1B: doc.h1B || undefined,
    sub: doc.sub || '',
    bullets: bullets.length ? bullets : [
      '0 kr oppstart — ingen bindingstid',
      'Dedikert forvalter som kjenner Bergen',
      'Full oversikt i sanntid',
    ],
    image: doc.image || '/interior-openplan-hero.webp',
    accent,
    heroStat: doc.heroStat && doc.heroStat.value ? { value: String(doc.heroStat.value).slice(0, 20), label: String(doc.heroStat.label || '').slice(0, 40) } : { value: '0 kr', label: 'oppstart · ingen binding' },
    proofNote: doc.proofNote || 'Profesjonell forvaltning løfter typisk inntekten samtidig som du slipper alt arbeidet. Prøv kalkulatoren og se hva boligen din kan ligge på.',
    formTitle: doc.formTitle || 'Få gratis vurdering av boligen din',
    cta: doc.cta || 'Få gratis vurdering',
    urgency: COMMON_URGENCY,
    metaTitle: doc.metaTitle || `${doc.h1} — DigiHome`,
    metaDesc: doc.metaDesc || String(doc.sub || '').slice(0, 160),
    faq: COMMON_FAQ,
    studio: true,
  };
}
