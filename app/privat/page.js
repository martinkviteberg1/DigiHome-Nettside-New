import PrivatV4 from '@/components/forside/v4/privat/PrivatV4';

const TITTEL = 'For private huseiere — Boligen på autopilot';
const BESKRIVELSE = 'Lei ut selv — uten å gjøre alt selv. Kontrakt med BankID, husleie med oppfølging og saker der du bare godkjenner. Hele Norge, ingen bindingstid.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/privat' },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/privat' },
  twitter: { card: 'summary_large_image', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE },
};

// Privat — huseiere med én eller noen få boliger. Første akt: hero (kun hero inntil videre).
export default function PrivatPage() {
  return <PrivatV4 />;
}
