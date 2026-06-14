import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { HeroAutopilotLight } from '@/components/home/HeroAutopilotLight';
import { SeksjonFilm } from '@/components/home/SeksjonFilm';

export const metadata = {
  title: 'DigiHome | Utleie på autopilot (lys)',
  description:
    'Lys variant av DigiHome-heroen. Utleie på autopilot — annonsering, prising, visninger og leietakere, helt automatisk i Bergen.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/2' },
};

export default function HomeLightPage() {
  return (
    <>
      <Header />
      <main>
        <HeroAutopilotLight />
        <SeksjonFilm />
      </main>
      <Footer />
    </>
  );
}
