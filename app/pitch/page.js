import EksternDeckSide from '@/components/deck/EksternDeckSide';

export const metadata = {
  title: 'DigiHome — Investor & partner deck',
  description: 'Rental management, run by software. Built by property managers in Bergen. Confidential.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/pitch' },
  openGraph: { type: 'website', locale: 'en_GB', url: '/pitch', siteName: 'DigiHome', title: 'DigiHome — Investor & partner deck', description: 'Rental management, run by software. Built by property managers in Bergen.' },
};

export default function PitchPage() {
  return <EksternDeckSide />;
}
