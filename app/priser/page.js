import PriserV4 from '@/components/forside/v4/sider/PriserV4';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';

const TITTEL = 'Priser — 5 % selvforvaltning, forvaltning på tilbud';
const BESKRIVELSE = 'Selvforvaltning koster 5 % av husleien — ingen oppstart, ingen bindingstid. Full forvaltning prises etter omfang med tilbud innen 24 timer. Eiendomsselskaper får avtale tilpasset porteføljen.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/priser' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/priser', images: [{ url: '/og/priser.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/priser.jpg'] },
};

export default function PriserPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Priser', path: '/priser' }])} />
      <JsonLd data={webPageLd({ name: TITTEL, description: BESKRIVELSE, path: '/priser' })} />
      <PriserV4 />
    </>
  );
}
