import { site } from '@/lib/site';
import { locations } from '@/lib/locations';
import { getAllPublishedSlugs } from '@/lib/posts';
import { rentCitySlugs } from '@/lib/rentmarket';
import { guides, REDIRECTED_POST_SLUGS } from '@/lib/guides';
import { getPublishedListingSlugs } from '@/lib/listings-server';

// Dynamisk sitemap.xml (Next.js App Router).
// Inneholder kun offentlige, indekserbare sider. Film-/deck-/admin-ruter
// (noindex) er bevisst utelatt. Lokasjonssider + publiserte artikler inkluderes dynamisk.
export default async function sitemap() {
  const base = site.url;
  const staticDate = new Date('2026-07-28T00:00:00.000Z');

  const core = [
    { url: `${base}/`, lastModified: staticDate, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/bli-utleier`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/bli-leietaker`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/tjenester`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/forvaltning`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/utleiemegler-bergen`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/airbnb-forvaltning-bergen`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/radgivning`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/om-oss`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/kontakt`, lastModified: staticDate, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/utleie`, lastModified: staticDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/leiemarkedet`, lastModified: staticDate, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/nyheter`, lastModified: staticDate, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/guider`, lastModified: staticDate, changeFrequency: 'weekly', priority: 0.8 },
    ...guides.map((g) => ({ url: `${base}/guider/${g.slug}`, lastModified: g.updated, changeFrequency: 'monthly', priority: 0.7 })),
    { url: `${base}/metode`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/priskalkulator`, lastModified: staticDate, changeFrequency: 'monthly', priority: 0.7 },
    // Selvforvaltning er det eneste produktet vi selger i hele landet, og
    // prisen er offentlig — den skal derfor være indekserbar med høy prioritet.
    { url: `${base}/selvforvaltning`, lastModified: new Date('2026-08-05T00:00:00.000Z'), changeFrequency: 'monthly', priority: 0.9 },
  ];

  const locationUrls = locations.map((l) => ({
    url: `${base}/utleie/${l.slug}`,
    lastModified: staticDate,
    changeFrequency: 'monthly',
    priority: l.type === 'by' ? 0.8 : 0.7,
  }));

  const rentMarketUrls = rentCitySlugs().map((slug) => ({
    url: `${base}/leiemarkedet/${slug}`,
    lastModified: staticDate,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  let postUrls = [];
  try {
    const posts = await getAllPublishedSlugs();
    postUrls = posts
      // Artikler som er 301-redirigert til en guide skal aldri ligge i sitemap.
      // (Konsolidering av kannibaliserende duplikater — se next.config.js.)
      .filter((p) => !REDIRECTED_POST_SLUGS[p.slug])
      .map((p) => ({
        url: `${base}/nyheter/${p.slug}`,
        lastModified: p.updatedAt || p.publishedAt ? new Date(p.updatedAt || p.publishedAt) : staticDate,
        changeFrequency: 'monthly',
        priority: 0.6,
      }));
  } catch (e) { postUrls = []; }

  // LEDIGE BOLIGER. Kun boliger som faktisk er publisert (klar for nettsiden
  // OG satt synlige) — vi ber aldri Google indeksere en side som ikke finnes.
  // Boligsider har høy prioritet og endres ofte: de er ferskvare.
  let listingUrls = [];
  try {
    const slugs = await getPublishedListingSlugs();
    listingUrls = [
      { url: `${base}/ledige-boliger`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
      ...slugs.map((l) => ({
        url: `${base}/ledige-boliger/${l.slug}`,
        lastModified: l.updatedAt ? new Date(l.updatedAt) : new Date(),
        changeFrequency: 'daily',
        priority: 0.75,
      })),
    ];
  } catch (e) {
    listingUrls = [{ url: `${base}/ledige-boliger`, lastModified: staticDate, changeFrequency: 'daily', priority: 0.9 }];
  }

  return [...core, ...locationUrls, ...rentMarketUrls, ...postUrls, ...listingUrls];
}
