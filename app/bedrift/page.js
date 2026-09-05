import BedriftV4 from '@/components/forside/v4/bedrift/BedriftV4';

const TITTEL = 'For eiendomsselskap — Porteføljen på autopilot';
const BESKRIVELSE = 'Saker, husleie og leietakere på tvers av alle bygg. Teamet driver — systemet tar rutinen, med roller, godkjenning og full historikk.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/bedrift' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/bedrift' },
  twitter: { card: 'summary_large_image', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
};

// Bedrift — eiendomsselskap med portefølje. Første akt: hero (kun hero inntil videre).
export default function BedriftPage() {
  return <BedriftV4 />;
}
