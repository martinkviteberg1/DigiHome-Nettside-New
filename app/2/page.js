import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { HeroAutopilotLight } from '@/components/home/HeroAutopilotLight';
import { SeksjonAutopilot } from '@/components/home/SeksjonAutopilot';
import { SeksjonFilm } from '@/components/home/SeksjonFilm';
import { SeksjonBoliger } from '@/components/home/SeksjonBoliger';

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
        <SeksjonAutopilot />
        <SeksjonFilm />
        <SeksjonBoliger />
      </main>
      <Footer />
    </>
  );
}
