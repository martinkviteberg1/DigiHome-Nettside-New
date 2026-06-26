import { site } from '@/lib/site';
import { locations } from '@/lib/locations';
import { getAllPublishedSlugs } from '@/lib/posts';
import { rentCitySlugs } from '@/lib/rentmarket';

// Dynamisk sitemap.xml (Next.js App Router).
// Inneholder kun offentlige, indekserbare sider. Film-/deck-/admin-ruter
// (noindex) er bevisst utelatt. Lokasjonssider + publiserte artikler inkluderes dynamisk.
export default async function sitemap() {
  const base = site.url;
  const now = new Date();

  const core = [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: `${base}/bli-utleier`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/bli-leietaker`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/tjenester`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/forvaltning`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/radgivning`, lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/om-oss`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/kontakt`, lastModified: now, changeFrequency: 'yearly', priority: 0.6 },
    { url: `${base}/utleie`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/leiemarkedet`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/nyheter`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/video`, lastModified: now, changeFrequency: 'yearly', priority: 0.4 },
  ];

  const locationUrls = locations.map((l) => ({
    url: `${base}/utleie/${l.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: l.type === 'by' ? 0.8 : 0.7,
  }));

  const rentMarketUrls = rentCitySlugs().map((slug) => ({
    url: `${base}/leiemarkedet/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.85,
  }));

  let postUrls = [];
  try {
    const posts = await getAllPublishedSlugs();
    postUrls = posts.map((p) => ({
      url: `${base}/nyheter/${p.slug}`,
      lastModified: p.updatedAt || p.publishedAt ? new Date(p.updatedAt || p.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }));
  } catch (e) { postUrls = []; }

  return [...core, ...locationUrls, ...rentMarketUrls, ...postUrls];
}
