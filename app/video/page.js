import AutopilotFilm from '@/components/video/AutopilotFilm';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Utleie på autopilot — Filmen',
  description:
    'Se hvordan DigiHome setter utleien på autopilot: annonsering, visninger, screening, kontrakt og husleie — helt automatisk. 72 sekunder.',
  alternates: { canonical: '/video' },
  openGraph: {
    title: 'Utleie på autopilot — Filmen | DigiHome',
    description: 'Annonsering, visninger, screening, kontrakt, husleie og leietakeroppfølging — helt automatisk. Se filmen.',
    images: [{ url: site.url + site.ogImage }],
  },
};

export default function VideoPage() {
  return (
    <>
      {/* Semantisk H1 for SEO/skjermlesere — filmens animerte titler er nå <div>. */}
      <h1 className="sr-only">Utleie på autopilot — se hvordan DigiHome automatiserer hele utleien</h1>
      <JsonLd data={breadcrumbLd([{ name: 'Filmen', path: '/video' }])} />
      <AutopilotFilm />
    </>
  );
}
