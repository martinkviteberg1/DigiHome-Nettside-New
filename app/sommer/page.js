import SommerKampanjePage from '@/components/dh/SommerKampanjePage';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';
import { site } from '@/lib/site';

export const metadata = {
  title: 'Sommerkampanje: 10 % honorar + 0 kr oppstart',
  description:
    'Sommerkampanje fra DigiHome: 10 % forvaltningshonorar og 0 kr i oppstart på full utleieforvaltning i Bergen. Uforpliktende — vi tar kontakt.',
  alternates: { canonical: '/sommer' },
  robots: { index: false, follow: true },
  openGraph: {
    title: 'Sommerkampanje: 10 % forvaltningshonorar + 0 kr i oppstart',
    description: 'Full utleieforvaltning i Bergen — kampanjepris til 10. juli. Uforpliktende registrering.',
    images: [{ url: site.url + site.ogImage }],
  },
};

export default function Page() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Sommerkampanje', path: '/sommer' }])} />
      <SommerKampanjePage />
    </>
  );
}
