import MeglerV4 from '@/components/forside/v4/megler/MeglerV4';

const TITTEL = 'For utleiemeglere – Ta flere oppdrag uten å ansette';
const BESKRIVELSE = 'Ett system fra henvendelse til årsoppgave: salg, annonse, kontrakt, saker, husleie, klientkonto og oppgjør per eier. Systemet gjør arbeidet, dere tar valgene. For utleiemeglere og forvaltere.';

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
