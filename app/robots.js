import { site } from '@/lib/site';

// Dynamisk robots.txt (Next.js App Router).
// - Blokkerer admin + API for alle (sensitivt, ingen SEO-verdi).
// - Film-/deck-ruter blokkeres IKKE her, fordi de allerede har <meta noindex>;
//   crawlere må kunne lese siden for å se noindex-direktivet.
// - Slipper eksplisitt inn AI-crawlere (GPTBot, PerplexityBot, ClaudeBot osv.)
//   slik at DigiHome kan bli sitert i AI-søk (GEO/AEO).
export default function robots() {
  const base = site.url;
  const blockedPaths = ['/admin', '/api/'];

  // AI-/LLM-crawlere vi eksplisitt ønsker velkommen.
  const aiAgents = [
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'PerplexityBot',
    'Perplexity-User',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'Google-Extended',
    'Applebot-Extended',
    'Amazonbot',
    'cohere-ai',
    'Meta-ExternalAgent',
    'CCBot',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: blockedPaths,
      },
      {
        userAgent: aiAgents,
        allow: '/',
        disallow: blockedPaths,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
