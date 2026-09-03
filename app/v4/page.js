import ForsideV4 from '@/components/forside/v4/ForsideV4';

export const metadata = {
  title: 'DigiHome — Utleie på autopilot (v4)',
  description: 'Fra leietaker og kontrakt til husleie, drift og leverandører. DigiHome samler hele utleien — og gjør arbeidet underveis.',
  robots: { index: false, follow: false },
};

export default function V4Page() {
  return (
    <>
      {/* Boligfotoet er LCP. Preload riktig utsnitt per flate; fontene preloades av next/font. */}
      <link rel="preload" as="image" href="/v4/bolig-hero.webp" media="(min-width: 640px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/v4/bolig-hero-mobil.webp" media="(max-width: 639px)" fetchPriority="high" />
      <ForsideV4 />
    </>
  );
}
