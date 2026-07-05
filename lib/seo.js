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
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
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
