import { redirect } from 'next/navigation';

// Old link → the current outward-facing deck.
export const metadata = { robots: { index: false, follow: false } };

export default function InvestorDeckPage() {
  redirect('/pitch');
}
