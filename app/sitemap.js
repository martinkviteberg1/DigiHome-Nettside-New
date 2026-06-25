import { site } from '@/lib/site';

// Dynamisk sitemap.xml (Next.js App Router).
// Inneholder kun offentlige, indekserbare sider. Film-/deck-/admin-ruter
// (noindex) er bevisst utelatt. Utvides med lokasjonssider i Fase 2.
export default function sitemap() {
  const base = site.url;
  const now = new Date();

  return [
    {
      url: `${base}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${base}/bli-utleier`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${base}/bli-leietaker`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${base}/video`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
  ];
}
