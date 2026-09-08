import ForvaltningV4 from '@/components/forside/v4/forvaltning/ForvaltningV4';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, serviceLd } from '@/lib/seo';

const TITTEL = 'Full forvaltning i Bergen — Vi tar jobben. Du bestemmer';
const BESKRIVELSE = 'Overlat utleien til DigiHome. Vi finner leietaker, tar drift og oppfølging — du ser alt som skjer og har siste ord. Bergen og omegn, ingen bindingstid.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/forvaltning' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/forvaltning', images: [{ url: '/og/forvaltning.jpg', width: 1200, height: 630 }] },
  twitter: { images: ['/og/forvaltning.jpg'], card: 'summary_large_image', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
};

// Forvaltning — tjenesten. Første akt: hero (kun hero inntil videre).
// VIKTIG: aldri oppgi pris for full forvaltning — kun «uforpliktende tilbud».
export default function ForvaltningPage() {
  return (
    <>
      <ForvaltningV4 />
      <JsonLd data={breadcrumbLd([{ name: 'Forvaltning', path: '/forvaltning' }])} />
      <JsonLd data={serviceLd({
        name: 'Full eiendomsforvaltning',
        description: 'Komplett forvaltning av utleieboliger i Bergen: annonsering, visninger, screening, digitale kontrakter, husleie, renhold og vedlikehold.',
        path: '/forvaltning',
        serviceType: 'Eiendomsforvaltning',
      })} />
    </>
  );
}
