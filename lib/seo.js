import { site } from '@/lib/site';

// ---------------------------------------------------------------------------
// SEO/AEO-hjelpere: bygger schema.org JSON-LD konsistent på tvers av sider.
// Alle undersider bør ha BreadcrumbList; tjenestesider bør ha Service;
// FAQ-seksjoner får FAQPage via FaqSection-komponenten (kun der innholdet er synlig).
// ---------------------------------------------------------------------------

const orgId = `${site.url}/#organization`;

// items: [{ name, path }] — «Hjem» legges til automatisk som første nivå.
export function breadcrumbLd(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Hjem', item: `${site.url}/` },
      ...items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 2,
        name: it.name,
        item: `${site.url}${it.path}`,
      })),
    ],
  };
}

export function serviceLd({ name, description, path, serviceType }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: `${site.url}${path}`,
    serviceType: serviceType || name,
    provider: { '@id': orgId },
    areaServed: { '@type': 'City', name: 'Bergen' },
    availableLanguage: ['Norwegian'],
  };
}

export function faqLd(faqs = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      // Spørsmålet må være ren tekst. Svaret kan inneholde et begrenset sett
      // HTML-tagger (Google tillater bl.a. <a>, <strong>, <p>, <ul>), så vi
      // beholder interne lenker som absolutte <a>-elementer der de finnes.
      name: stripMarkup(f.q),
      acceptedAnswer: { '@type': 'Answer', text: richToSchemaHtml(f.a) },
    })),
  };
}

export function webPageLd({ name, description, path, type = 'WebPage' }) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    name,
    description,
    url: `${site.url}${path}`,
    inLanguage: 'nb-NO',
    isPartOf: { '@id': `${site.url}/#website` },
    about: { '@id': orgId },
  };
}

// ---------------------------------------------------------------------------
// AEO-hjelpere (2026)
//
// AI-svarmotorer og Googles AI-flater plukker opp korte, entydige svar og
// maskinlesbar struktur. Vi legger derfor til:
//   • speakable   → peker på «Kort svar»-boksen, det siterbare avsnittet
//   • wordCount   → signal om reelt innholdsdyp
//   • about/mentions → entitetskobling mot lovverk og myndigheter
//   • HowTo       → kun der stegene faktisk er synlige på siden
//   • anchorId    → id på hver H2, slik at passasjer kan lenkes direkte
// Vi legger IKKE til schema for innhold som ikke er synlig — det bryter
// Googles retningslinjer og gir null AEO-effekt.
// ---------------------------------------------------------------------------

// Stabil ankerid til H2-er (og innholdsfortegnelsen).
export function anchorId(text = '') {
  return String(text)
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60);
}

// Fjerner den lette inline-markupen ([tekst](/sti) og **fet**) før teksten
// brukes i JSON-LD, metadata eller ren tekst. JSON-LD skal aldri inneholde
// markup — det er en av de vanligste årsakene til at rike resultater faller ut.
export function stripMarkup(text = '') {
  return String(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

// Konverterer inline-markup til det begrensede HTML-settet Google tillater i
// FAQPage-svar (<a>, <strong>). Interne stier gjøres absolutte, siden JSON-LD
// leses utenfor sidens kontekst.
export function richToSchemaHtml(text = '') {
  return String(text)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label, href) => {
      const url = /^https?:\/\//i.test(href) ? href : `${site.url}${href}`;
      return `<a href="${url}">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .trim();
}

export const speakableSpec = (selectors = ['h1', '.dh-answer']) => ({
  '@type': 'SpeakableSpecification',
  cssSelector: selectors,
});

// Ordtelling fra guide-innholdet (answer + keyFacts + seksjoner).
export function guideWordCount(g) {
  const chunks = [
    g.answer || '',
    ...(g.keyFacts || []),
    ...(g.sections || []).flatMap((s) => [s.h2 || '', ...(s.paragraphs || []), ...(s.list || [])]),
    ...(g.faqs || []).flatMap((f) => [f.q, f.a]),
  ];
  return stripMarkup(chunks.join(' ')).split(/\s+/).filter(Boolean).length;
}

// Article-schema for en guide. Bygges her (ikke i siden) slik at det kan
// verifiseres av probe-skript uten å rendre React.
export function guideArticleLd(g) {
  const url = `${site.url}/guider/${g.slug}`;
  const author = g.author || { name: site.ceo, role: site.ceoTitle, url: '/om-oss' };
  const abs = (u) => (u?.startsWith('http') ? u : `${site.url}${u || ''}`);

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: g.title,
    description: stripMarkup(g.description),
    abstract: stripMarkup(g.answer || ''),
    image: site.url + g.image,
    datePublished: g.published || g.updated,
    dateModified: g.updated,
    inLanguage: 'nb-NO',
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    isPartOf: { '@type': 'CollectionPage', '@id': `${site.url}/guider`, name: 'Guider for utleiere' },
    articleSection: g.category,
    wordCount: guideWordCount(g),
    timeRequired: `PT${g.readMinutes || 6}M`,
    speakable: speakableSpec(),
    author: {
      '@type': 'Person',
      '@id': `${site.url}/#sarah-sleeman`,
      name: author.name,
      jobTitle: author.role,
      url: abs(author.url || '/om-oss'),
      worksFor: { '@id': orgId },
    },
    publisher: {
      '@type': 'Organization',
      '@id': orgId,
      name: site.name,
      url: site.url,
      logo: { '@type': 'ImageObject', url: `${site.url}/brand/digihome-icon-purple.svg` },
    },
    citation: (g.sources || []).map((s) => abs(s.url)),
  };

  if (g.keywords?.length) data.keywords = g.keywords.join(', ');

  if (g.entities?.length) {
    data.about = g.entities.map((e) => ({ '@type': 'Thing', name: e.name, sameAs: e.sameAs }));
    data.mentions = [{ '@type': 'Organization', '@id': orgId, name: site.name }];
  }

  if (g.reviewer) {
    data.reviewedBy = {
      '@type': g.reviewer.type || 'Person',
      name: g.reviewer.name,
      url: abs(g.reviewer.url || '/metode'),
      ...(g.reviewer.type === 'Organization' ? { description: g.reviewer.role } : { jobTitle: g.reviewer.role }),
    };
  }

  return data;
}

// HowTo — brukes kun når stegene faktisk vises på siden.
export function howToLd({ name, steps = [], path, totalTime, image, description }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description: stripMarkup(description || ''),
    ...(totalTime ? { totalTime } : {}),
    ...(image ? { image: image.startsWith('http') ? image : site.url + image } : {}),
    inLanguage: 'nb-NO',
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: stripMarkup(s.text),
      ...(path ? { url: `${site.url}${path}#${anchorId(s.name)}` } : {}),
    })),
  };
}

// ItemList for oversiktssider (guide-hub, artikkeloversikt).
export function itemListLd({ name, description, path, items = [] }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: `${site.url}${path}`,
    inLanguage: 'nb-NO',
    isPartOf: { '@id': `${site.url}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.name,
        url: `${site.url}${it.path}`,
      })),
    },
  };
}
