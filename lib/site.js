// Central site configuration + real content (norsk bokmål) from INNHOLD.md.

export const site = {
  name: 'DigiHome',
  legalName: 'SHD Forvaltning AS',
  orgNr: '835 595 242',
  url: 'https://digihome.no',
  loginUrl: 'https://app.digihome.no/forvalter/login',
  email: 'sarah@digihome.no',
  phone: '+47 909 58 313',
  phoneHref: '+4790958313',
  address: {
    street: 'Kokstadvegen 46',
    postal: '5257',
    city: 'Kokstad',
    region: 'Bergen',
    country: 'NO',
  },
  ceo: 'Sarah Sleeman',
  ceoTitle: 'Daglig leder & eiendomsmegler',
  social: {
    instagram: 'https://instagram.com/digihome',
    facebook: 'https://facebook.com/digihome',
    linkedin: 'https://linkedin.com/company/digihome',
  },
  defaultDescription:
    'Bergens smarteste eiendomsforvaltning. AI-drevet teknologi for trygg og profesjonell utleie.',
  ogImage: '/bergen-harbor.webp',
  avgIncome: '25 000 kr/mnd',
};

export const nav = [
  { label: 'For utleiere', href: '/bli-utleier' },
  { label: 'Forvaltning', href: '/forvaltning' },
  { label: 'Blogg', href: '/blogg' },
  { label: 'Om oss', href: '/om-oss' },
  { label: 'Kontakt', href: '/kontakt' },
];

export const stats = [
  { value: '30+', label: 'Eiendommer' },
  { value: '98%', label: 'Tilfredshet' },
  { value: '+30%', label: 'Høyere inntekt' },
];

export const statStrip = [
  { value: '+30%', label: 'Høyere inntekt', sub: 'sammenlignet med tradisjonell utleie' },
  { value: '30+', label: 'Eiendommer', sub: 'under aktiv forvaltning i Bergen' },
  { value: '98%', label: 'Tilfredshet', sub: 'blant våre eiendomseiere' },
];

export const services = [
  {
    name: 'Dynamisk utleie',
    tag: '10+2-modellen',
    badge: 'Mest populær',
    featured: true,
    description:
      'Kombiner langtids- og korttidsutleie for maksimal avkastning. 10 måneder fast leietaker, 2 måneder sesongutleie.',
    highlight: 'Opptil 30% høyere inntekt',
    icon: 'Sparkles',
  },
  {
    name: 'Langtidsutleie',
    tag: 'Trygg og forutsigbar',
    description:
      'Full forvaltning av langtidsutleie. Vi håndterer alt fra annonsering til vedlikehold og leietakeroppfølging.',
    highlight: 'Fast månedlig inntekt',
    icon: 'ShieldCheck',
  },
  {
    name: 'Korttidsutleie',
    tag: 'Airbnb & Booking.com',
    description:
      'Profesjonell korttidsutleie med styling, fotografering, dynamisk prising og gjesteservice.',
    highlight: 'Høy avkastning i sesong',
    icon: 'CalendarRange',
  },
];

export const steps = [
  { no: '01', icon: 'Repeat', title: 'Dynamisk utleie', body: 'Korttids- og langtidsutleie i én hybridmodell. Tilpasses automatisk etter sesong og etterspørsel.' },
  { no: '02', icon: 'LineChart', title: 'Intelligent prising', body: 'Prisalgoritmer overvåker markedet døgnet rundt og justerer for optimal avkastning.' },
  { no: '03', icon: 'Settings2', title: 'Helhetlig drift', body: 'Nøkler, rengjøring, gjestekommunikasjon og vedlikehold — alt håndtert av vårt team.' },
  { no: '04', icon: 'Smartphone', title: 'Leietakerportal', body: 'Betaling, kommunikasjon og henvendelser samlet på én plattform.' },
];

export const qualities = [
  'Profesjonelt innredet og fotografert',
  'Nøye vedlikeholdt mellom hver leietaker',
  'Strategisk beliggenhet i Bergen',
];

export const qualityGallery = [
  '/interior-openplan.webp',
  '/interior-kitchen.webp',
  '/interior-dining.webp',
  '/interior-living.webp',
];

export const showcase = [
  { area: 'Nordnes, Bergen', beds: '3 sov', size: '68 m²', price: '22 500 kr/mnd', type: 'Hybridutleie', image: '/interior-openplan.webp' },
  { area: 'Sandviken, Bergen', beds: '2 sov', size: '52 m²', price: '18 000 kr/mnd', type: 'Korttidsutleie', image: '/interior-kitchen2.webp' },
  { area: 'Sentrum, Bergen', beds: '3 sov', size: '95 m²', price: '26 500 kr/mnd', type: 'Hybridutleie', image: '/interior-living.webp' },
];

export const network = [
  { name: 'Renhold', body: 'Profesjonelt renhold mellom leietakere og løpende vedlikehold', icon: 'Sparkles' },
  { name: 'Vaktmester', body: 'Tilgjengelig for akutte og planlagte vedlikeholdsoppdrag', icon: 'Wrench' },
  { name: 'Elektriker', body: 'Sertifiserte elektrikere for installasjon og feilsøking', icon: 'Plug' },
  { name: 'Rørlegger', body: 'Rask responstid ved lekkasjer og rørproblemer', icon: 'Droplets' },
  { name: 'Juridisk', body: 'Husleiekontrakter, tvistehåndtering og rådgivning via Hoffmann Thinn', icon: 'Scale' },
  { name: 'Forsikring', body: 'Optimale forsikringsløsninger for utleieboliger', icon: 'Umbrella' },
];

export const reasons = [
  { title: 'Ingen oppstartskostnader', body: 'Ingen binding, ingen risiko. Du betaler kun når du faktisk tjener penger på eiendommen din.', icon: 'BadgeCheck' },
  { title: 'Høyere inntekt', body: 'Vår hybridmodell gir opptil 30% høyere avkastning enn tradisjonell langtidsutleie.', icon: 'TrendingUp' },
  { title: 'Full transparens', body: 'Sanntidsrapporter og inntektsoversikt. Du har alltid full innsikt i eiendommen din.', icon: 'Eye' },
  { title: 'Dedikert forvaltning', body: 'Et personlig team som kjenner eiendommen din og behandler den som sin egen.', icon: 'Users' },
];

export const testimonials = [
  { name: 'Maria S.', role: 'Eiendomseier, Nordnes, Bergen', quote: 'DigiHome har økt inntekten vår med over 35% sammenlignet med vår forrige langtidsleie. Profesjonelt, enkelt og lønnsomt.' },
  { name: 'Thomas K.', role: 'Eiendomseier, Sandviken, Bergen', quote: 'Jeg merker knapt at jeg eier en utleieeiendom lenger. Alt går på autopilot, og inntekten tikker inn hver måned.' },
  { name: 'Ingrid L.', role: 'Eiendomseier, Møhlenpris, Bergen', quote: 'Transparensen er det som imponerer mest. Jeg ser nøyaktig hva som skjer, og teamet er alltid tilgjengelige når jeg trenger dem.' },
];

export const partners = [
  { name: 'Finn.no', logo: '/finn-logo-full.png' },
  { name: 'Airbnb', logo: '/airbnb-logo.png' },
  { name: 'Booking.com', logo: '/booking-logo.png' },
  { name: 'Ability' },
  { name: 'HG Eiendomservice' },
  { name: 'Hoffmann Thinn' },
  { name: 'Söderberg & Partners' },
  { name: 'IKEA' },
];

export const neighborhoods = [
  'Nordnes', 'Sandviken', 'Møhlenpris', 'Årstad', 'Bergenhus', 'Sentrum',
  'Laksevåg', 'Fana', 'Åsane', 'Fyllingsdalen', 'Landås', 'Minde',
  'Solheimsviken', 'Damsgård',
];

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
