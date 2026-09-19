import MeglerV4 from '@/components/forside/v4/megler/MeglerV4';

const TITTEL = 'For utleiemeglere – Ta flere oppdrag uten å ansette';
const BESKRIVELSE = 'Systemet DigiHome selv forvalter med: salg fra henvendelse til signert oppdrag, klientkonto og oppgjør per eier, eierportal og full historikk. For utleiemeglere og forvaltere.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/utleiemeglere' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/utleiemeglere', images: [{ url: '/og/utleiemeglere.jpg', width: 1200, height: 630 }] },
  twitter: { images: ['/og/utleiemeglere.jpg'], card: 'summary_large_image', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
};

export default function Page() {
  return <MeglerV4 />;
}
