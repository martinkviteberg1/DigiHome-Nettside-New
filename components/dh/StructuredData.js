import { site, services, faq, neighborhoods } from '@/lib/site';

// Sentral JSON-LD for forsiden. Bygger en @graph med:
//  - RealEstateAgent (Organization med adresse, geo, areaServed, sameAs)
//  - WebSite
//  - OfferCatalog over tjenestene
//  - FAQPage (siterbart innhold for AI-søk)
// Server-komponent: rendres i HTML og leses av Google + LLM-crawlere.
export default function StructuredData() {
  const orgId = `${site.url}/#organization`;
  const webId = `${site.url}/#website`;

  const organization = {
    '@type': ['RealEstateAgent', 'Organization', 'LocalBusiness'],
    '@id': orgId,
    name: site.name,
    legalName: site.legalName,
    url: site.url,
    logo: `${site.url}/digihome-mark.svg`,
    image: `${site.url}${site.ogImage}`,
    description: site.defaultDescription,
    email: site.email,
    telephone: site.phone,
    vatID: site.orgNr,
    foundingDate: site.foundingYear,
    priceRange: site.priceRange,
    address: {
      '@type': 'PostalAddress',
      streetAddress: site.address.street,
      postalCode: site.address.postal,
      addressLocality: site.address.city,
      addressRegion: site.address.region,
      addressCountry: site.address.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: site.geo.lat,
      longitude: site.geo.lng,
    },
    areaServed: [
      { '@type': 'City', name: 'Bergen' },
      ...neighborhoods.map((n) => ({ '@type': 'Place', name: `${n}, Bergen` })),
    ],
    founder: {
      '@type': 'Person',
      name: site.ceo,
      jobTitle: site.ceoTitle,
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: site.phone,
      email: site.email,
      contactType: 'customer service',
      areaServed: 'NO',
      availableLanguage: ['Norwegian', 'English'],
    },
    sameAs: [site.social.instagram, site.social.facebook, site.social.linkedin],
  };

  const website = {
    '@type': 'WebSite',
    '@id': webId,
    url: site.url,
    name: site.name,
    description: site.defaultDescription,
    inLanguage: 'nb-NO',
    publisher: { '@id': orgId },
  };

  const offerCatalog = {
    '@type': 'OfferCatalog',
    name: 'DigiHome eiendomsforvaltning',
    provider: { '@id': orgId },
    itemListElement: services.map((s) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: s.name,
        description: s.description,
        serviceType: s.tag,
        provider: { '@id': orgId },
        areaServed: { '@type': 'City', name: 'Bergen' },
      },
    })),
  };

  const faqPage = {
    '@type': 'FAQPage',
    '@id': `${site.url}/#faq`,
    mainEntity: faq.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [organization, website, offerCatalog, faqPage],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
