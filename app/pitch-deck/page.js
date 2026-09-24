import { redirect } from 'next/navigation';

// The old Norwegian pitch deck (franchise model, 2025) is retired. The current outward-facing deck lives at /pitch.
export const metadata = { robots: { index: false, follow: false } };

export default function PitchDeckPage() {
  redirect('/pitch');
}
