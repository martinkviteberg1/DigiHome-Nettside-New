import BedriftV4 from '@/components/forside/v4/bedrift/BedriftV4';

const TITTEL = 'DigiHome for eiendomsselskap — Porteføljen på autopilot';
const BESKRIVELSE = 'Saker, husleie og leietakere på tvers av alle bygg. Systemet drifter — teamet godkjenner, med roller og full historikk.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  robots: { index: false, follow: false },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: TITTEL, description: BESKRIVELSE, url: '/v4/bedrift' },
  twitter: { card: 'summary_large_image', title: TITTEL, description: BESKRIVELSE },
};

export default function Page() {
  return <BedriftV4 />;
}
