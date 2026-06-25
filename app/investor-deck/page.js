import { redirect } from 'next/navigation';

// Decken er flyttet til den passordbeskyttede ruten /pitch-deck.
// Vi omdirigerer den gamle /investor-deck-lenken dit så passordet ikke kan omgås.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function InvestorDeckPage() {
  redirect('/pitch-deck');
}
