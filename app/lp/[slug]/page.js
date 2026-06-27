import { notFound } from 'next/navigation';
import { getLanding, landingSlugs } from '@/lib/landing';
import CampaignLanding from '@/components/lp/CampaignLanding';

// Google Ads-kampanjesider. noindex (skal ikke konkurrere med organiske sider),
// men crawlbare nok til at annonse-roboter kan lese dem.
// Kun de definerte slug-ene er gyldige → ekte 404 for alt annet.
export const dynamicParams = false;

export function generateStaticParams() {
  return landingSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const cfg = getLanding(params.slug);
  if (!cfg) return { title: 'Ikke funnet', robots: { index: false, follow: false } };
  return {
    title: cfg.metaTitle,
    description: cfg.metaDesc,
    robots: { index: false, follow: false },
    alternates: { canonical: undefined },
  };
}

export default function Page({ params }) {
  const cfg = getLanding(params.slug);
  if (!cfg) notFound();
  return <CampaignLanding cfg={cfg} />;
}
