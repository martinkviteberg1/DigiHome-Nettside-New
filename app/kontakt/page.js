import KontaktV4 from '@/components/forside/v4/sider/KontaktV4';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';

const TITTEL = 'Kontakt DigiHome — utleie og forvaltning i Bergen';
const BESKRIVELSE = 'Ta kontakt med DigiHome for en uforpliktende prat om utleie i Bergen. Ring, send e-post eller fyll ut skjemaet — vi svarer innen én virkedag.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/kontakt' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/kontakt', images: [{ url: '/og/kontakt.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/kontakt.jpg'] },
};

export default function KontaktPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Kontakt', path: '/kontakt' }])} />
      <JsonLd data={webPageLd({ name: TITTEL, description: 'Kontakt DigiHome for en uforpliktende prat om utleie i Bergen — telefon, e-post eller skjema.', path: '/kontakt', type: 'ContactPage' })} />
      <KontaktV4 />
    </>
  );
}
