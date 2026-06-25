import Presentasjon from '@/components/deck/Presentasjon';
import DeckGate from '@/components/deck/DeckGate';

export const metadata = {
  title: 'DigiHome — Investorpresentasjon',
  description:
    'DigiHome investorpresentasjon — det AI-native operativsystemet for boligutleie. Dynamisk utleie, autopilot-drift og skalerbar forvaltning. Konfidensielt.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/pitch-deck' },
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: '/pitch-deck',
    siteName: 'DigiHome',
    title: 'DigiHome — Investorpresentasjon',
    description:
      'Det AI-native operativsystemet for boligutleie. Investorpresentasjon — konfidensielt.',
    images: [{ url: '/pitch-deck-og.png', width: 1200, height: 630, alt: 'DigiHome — Investorpresentasjon' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DigiHome — Investorpresentasjon',
    description:
      'Det AI-native operativsystemet for boligutleie. Investorpresentasjon — konfidensielt.',
    images: ['/pitch-deck-og.png'],
  },
};

export default function PitchDeckPage() {
  return (
    <DeckGate>
      <Presentasjon />
    </DeckGate>
  );
}
