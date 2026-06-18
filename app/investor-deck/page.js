import Presentasjon from '@/components/deck/Presentasjon';

export const metadata = {
  title: 'DigiHome — Investor Deck',
  description: 'DigiHome investor-presentasjon — AI-native PMS for dynamisk utleie.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/investor-deck' },
};

export default function InvestorDeckPage() {
  return <Presentasjon />;
}
