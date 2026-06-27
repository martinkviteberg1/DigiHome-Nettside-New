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
];

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
    image: '/interior-living.webp',
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
