import { notFound } from 'next/navigation';
import { getLanding, landingSlugs, normalizeStudioLp } from '@/lib/landing';
import CampaignLanding from '@/components/lp/CampaignLanding';

// Kampanjesider: statiske (lib/landing.js) + AI-genererte fra Annonsestudio
// (studio_lps i MongoDB). noindex (skal ikke konkurrere med organiske sider),
// men crawlbare nok til at annonse-roboter kan lese dem.
// ISR (revalidate 60s) i stedet for force-dynamic: blocking render gir EKTE
// HTTP 404 for ukjente slugs (streaming m/ rot-loading.js ville gitt 200),
// og nye studio-sider er live senest 60 sek etter opprettelse (i praksis
// umiddelbart — nye slugs har ingen cache).
export const dynamicParams = true;
export const revalidate = 60;

export function generateStaticParams() {
  return landingSlugs().map((slug) => ({ slug }));
}

async function getStudioCfg(slug) {
  if (!/^[a-z0-9-]{3,60}$/.test(String(slug || ''))) return null;
  try {
    const { getDb } = await import('@/lib/mongodb');
    const db = await getDb();
    const doc = await db.collection('studio_lps').findOne({ slug: String(slug), status: 'live' });
    return normalizeStudioLp(doc);
  } catch (e) {
    return null;
  }
}

async function resolveCfg(slug) {
  return getLanding(slug) || (await getStudioCfg(slug));
}

export async function generateMetadata({ params }) {
  const cfg = await resolveCfg(params.slug);
  if (!cfg) notFound(); // kastes her (før streaming) → ekte HTTP 404
  return {
    title: cfg.metaTitle,
    description: cfg.metaDesc,
    robots: { index: false, follow: false },
    alternates: { canonical: undefined },
  };
}

export default async function Page({ params }) {
  const cfg = await resolveCfg(params.slug);
  if (!cfg) notFound();
  return <CampaignLanding cfg={cfg} />;
}
