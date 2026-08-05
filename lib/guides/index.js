// ---------------------------------------------------------------------------
// GUIDE-REGISTER
//
// Guidene er DigiHomes organiske motor. Search Console (2026-05-04 → 2026-08-02)
// viste at /guider/* sto for 4 616 av 6 317 visninger (73 %), men bare 37 av
// 105 klikk — CTR 0,8 % mot forsidens 17 %. Diagnosen var ikke manglende
// synlighet, men (a) titler som ikke matchet søket, og (b) at flere ulike
// søkeintensjoner måtte deles på samme side.
//
// Strukturen er derfor pilar + spokes, med én side per reell søkeintensjon.
// Innholdet ligger i tematiske filer for å holde dem lesbare og reviderbare.
//
// Rekkefølgen under styrer visningen på /guider og er sortert etter
// kommersiell nærhet, deretter målt søkevolum.
// ---------------------------------------------------------------------------

import { prisGuides } from './pris';
import { depositumGuides } from './depositum';
import { skattGuides } from './skatt';
import { utleieGuides } from './utleie';

const ALL = [...prisGuides, ...depositumGuides, ...skattGuides, ...utleieGuides];

// Ønsket visningsrekkefølge på hub-siden og i sitemap.
const ORDER = [
  'hva-koster-utleiemegler',
  'leie-ut-leilighet-bergen',
  'utleiemegler-vs-selvforvaltning',
  'depositum-regler',
  'depositumskonto',
  'leietaker-har-ikke-betalt-depositum',
  'depositum-tilbakebetaling',
  'skatt-pa-utleie',
  'fradrag-utleiebolig',
  'korttidsutleie-regler',
  'godkjent-utleiedel',
  'husleieokning',
];

export const guides = [
  ...ORDER.map((slug) => ALL.find((g) => g.slug === slug)).filter(Boolean),
  // Sikkerhetsnett: en guide som glemmes i ORDER skal fortsatt publiseres.
  ...ALL.filter((g) => !ORDER.includes(g.slug)),
];

// Hub-siden grupperer de 12 guidene i fire temablokker. Badge-kategorien på
// hvert kort er finere inndelt (8 verdier) — gruppene finnes for at
// oversikten skal bli lesbar, ikke for å speile taksonomien 1:1.
// Fire grupper à 2–4 guider gir fylte 3-kolonners rader i stedet for
// åtte rader med ett kort i hver.
export const GUIDE_GROUPS = [
  {
    key: 'start',
    label: 'Kom i gang og pris',
    intro: 'Hva koster utleiemegler i provisjon, hvilken modell passer deg, og hvordan du leier ut steg for steg.',
    categories: ['Pris', 'Kom i gang', 'Rådgivning'],
  },
  {
    key: 'depositum',
    label: 'Depositum',
    intro: 'Beløp og regler, depositumskonto, manglende innbetaling og tilbakebetaling ved utflytting.',
    categories: ['Depositum'],
  },
  {
    key: 'skatt',
    label: 'Skatt og fradrag',
    intro: 'Når er leieinntekten skattefri, når betaler du 22 %, og hva kan du trekke fra?',
    categories: ['Skatt'],
  },
  {
    key: 'regler',
    label: 'Regelverk og leiepris',
    intro: 'Korttidsutleie og døgngrenser, godkjent utleiedel, og lovlig husleieøkning.',
    categories: ['Korttidsutleie', 'Godkjenning', 'Leiepris'],
  },
];

export const getGuide = (slug) => guides.find((g) => g.slug === slug) || null;

export const relatedGuides = (guide) => (guide?.related || []).map(getGuide).filter(Boolean);

// Pilar/spoke-oppslag brukes til klyngenavigasjonen i artikkelmalen.
export function guideCluster(guide) {
  if (!guide) return null;
  const pillar = guide.pillar ? getGuide(guide.pillar) : guide;
  if (!pillar) return null;
  const spokeSlugs = pillar.spokes || [];
  const spokes = spokeSlugs.map(getGuide).filter(Boolean);
  if (!spokes.length) return null;
  return { pillar, spokes, isPillar: pillar.slug === guide.slug };
}

// Gruppert visning for hub-siden. Guider som ikke treffer en gruppe havner
// i «Andre guider» — da mister vi aldri en side fra oversikten.
export function guideGroups() {
  const used = new Set();
  const groups = GUIDE_GROUPS.map((group) => {
    const items = guides.filter((g) => group.categories.includes(g.category));
    items.forEach((g) => used.add(g.slug));
    return { ...group, items };
  }).filter((g) => g.items.length);

  const rest = guides.filter((g) => !used.has(g.slug));
  if (rest.length) groups.push({ key: 'annet', label: 'Andre guider', intro: '', items: rest });
  return groups;
}

// Slugs som er 301-redirigert bort (kannibaliserende nyhetsartikler).
// Brukes av sitemap.js så vi aldri ber Google indeksere en URL som redirigerer.
// Kilde: de fire artiklene dekket eksakt samme søkeintensjon som guidene,
// hadde 0 visninger i Search Console, og delte rangeringssignalene.
export const REDIRECTED_POST_SLUGS = {
  'skatt-pa-utleieinntekt-2026': '/guider/skatt-pa-utleie',
  'hva-koster-utleiemegler-i-bergen-2026': '/guider/hva-koster-utleiemegler',
  'leie-ut-bolig-i-bergen-komplett-guide-2026': '/guider/leie-ut-leilighet-bergen',
  'selvforvaltning-eller-full-forvaltning': '/guider/utleiemegler-vs-selvforvaltning',
};
