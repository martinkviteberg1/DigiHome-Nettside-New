import KeyholeFilm from '@/components/keyhole/KeyholeFilm';

export const metadata = {
  title: 'DigiHome × Keyhole — integrasjon',
  description: 'Hvordan DigiHome og Keyhole jobber sammen: fra annonse på FINN til kredittsjekk og sikret depositum.',
  robots: { index: false, follow: false },
};

export default function KeyholePage() {
  return <KeyholeFilm />;
}
