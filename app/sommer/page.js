import SommerKampanjePage from '@/components/dh/SommerKampanjePage';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd } from '@/lib/seo';

export const metadata = {
  title: 'Sommerkampanje: 10 % forvaltningshonorar + 0 kr i oppstart',
  description:
    'Sommerkampanje fra DigiHome: 10 % forvaltningshonorar og ingen oppstartskostnad på full utleieforvaltning i Bergen. Gjelder til 10. juli. Uforpliktende — vi tar kontakt.',
  alternates: { canonical: '/sommer' },
  openGraph: {
    title: 'Sommerkampanje: 10 % forvaltningshonorar + 0 kr i oppstart',
    description: 'Full utleieforvaltning i Bergen — kampanjepris til 10. juli. Uforpliktende registrering.',
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
