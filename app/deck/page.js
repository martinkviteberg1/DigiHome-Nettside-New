import KortDeck from '@/components/deck/KortDeck';
import DeckGate from '@/components/deck/DeckGate';

// /deck — det korte «send-decket» (10 slides). Samme passordgate som
// /pitch-deck (delt httpOnly-cookie via /api/deck/auth). Dypdykket bor i
// /pitch-deck, produktbeviset i /tour — begge lenket fra kortdekket.
export const metadata = {
  title: 'DigiHome — Investor',
  description: 'DigiHome — AI-drevet boligforvaltning. Kort investorpresentasjon. Konfidensielt.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/deck' },
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    url: '/deck',
    siteName: 'DigiHome',
    title: 'DigiHome — Investor',
    description: 'AI-drevet boligforvaltning. Kort investorpresentasjon — konfidensielt.',
    images: [{ url: '/pitch-deck-og.png', width: 1200, height: 630, alt: 'DigiHome — Investor' }],
  },
};

export default function DeckPage() {
  return (
    <DeckGate>
      <KortDeck />
    </DeckGate>
  );
}
