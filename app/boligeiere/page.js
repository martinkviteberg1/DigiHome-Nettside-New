import BoligeiereV4 from '@/components/forside/v4/boligeiere/BoligeiereV4';

const TITTEL = 'For boligeiere — Boligen på autopilot';
const BESKRIVELSE = 'Én bolig eller fem. Lei ut selv med DigiHome som motor (5 % av husleien, ingen bindingstid) — eller la oss ta full forvaltning. Kontrakt med BankID, husleie med oppfølging og saker der du bare godkjenner.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/boligeiere' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/boligeiere' },
  twitter: { card: 'summary_large_image', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
};

// Boligeiere — én bolig eller fem, hus eller leilighet. Selvforvaltning og full forvaltning på én side.
export default function BoligeierePage() {
  return <BoligeiereV4 />;
}
