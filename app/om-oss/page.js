import OmOssV4 from '@/components/forside/v4/sider/OmOssV4';
import { JsonLd } from '@/components/site/JsonLd';
import { breadcrumbLd, webPageLd } from '@/lib/seo';

const TITTEL = 'Om DigiHome — utleie på autopilot, forvaltning i Bergen';
const BESKRIVELSE = 'DigiHome ble startet i Bergen for å fjerne styret med utleie. Ett system for annonse, kontrakt med BankID, husleie og saker — og full forvaltning med én fast forvalter. Møt teamet.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/om-oss' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/om-oss' },
};

export default function OmOssPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd([{ name: 'Om oss', path: '/om-oss' }])} />
      <JsonLd data={webPageLd({ name: TITTEL, description: 'Historien og teamet bak DigiHome: utleiesystem og full forvaltning med lokal forankring i Bergen.', path: '/om-oss', type: 'AboutPage' })} />
      <OmOssV4 />
    </>
  );
}
