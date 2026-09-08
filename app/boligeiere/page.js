import BoligeiereV4 from '@/components/forside/v4/boligeiere/BoligeiereV4';

const TITTEL = 'For boligeiere — Boligen på autopilot';
const BESKRIVELSE = 'Én bolig eller fem. Lei ut selv, med et system som tar rutinen (5 % av husleien, ingen bindingstid) — eller la en fast forvalter hos oss ta full forvaltning. Kontrakt med BankID, husleie som følges opp automatisk, saker du godkjenner.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/boligeiere' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/boligeiere', images: [{ url: '/og/boligeiere.jpg', width: 1200, height: 630 }] },
  twitter: { images: ['/og/boligeiere.jpg'], card: 'summary_large_image', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
};

// Boligeiere — én bolig eller fem, hus eller leilighet. Selvforvaltning og full forvaltning på én side.
export default function BoligeierePage() {
  return <BoligeiereV4 />;
}
