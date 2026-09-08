import KomIGang from '@/components/forside/v4/start/KomIGang';

const TITTEL = 'Kom i gang — Huseier eller eiendomsselskap?';
const BESKRIVELSE = 'Velg om du leier ut som huseier eller eiendomsselskap, så tar vi deg rett til riktig start. Ingen bindingstid.';

// Veiskillet før onboardingen: Huseier → /bli-utleier/start, Eiendomsselskap →
// /bli-utleier/start?kind=business. Del av konverteringsflyten — ikke SEO-side.
export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  alternates: { canonical: '/kom-i-gang' },
  robots: { index: false, follow: true },
  openGraph: { type: 'website', locale: 'nb_NO', siteName: 'DigiHome', title: `${TITTEL} | DigiHome`, description: BESKRIVELSE, url: '/kom-i-gang', images: [{ url: '/og/kom-i-gang.jpg', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', images: ['/og/kom-i-gang.jpg'] },
};

export default function KomIGangPage() {
  return <KomIGang />;
}
