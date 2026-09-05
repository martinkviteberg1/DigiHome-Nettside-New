import ForsideV4 from '@/components/forside/v4/ForsideV4';

/* /v5 — eksperiment: forsiden med hero i Sana-struktur (sentrert setning + én scene i full bredde).
   Resten av siden er identisk med roten, så sammenligningen er ren.
   ?bilde=bygg viser boligen i scenen i stedet for stuen. */
export const metadata = {
  title: { absolute: 'DigiHome — Utleie på autopilot (v5)' },
  robots: { index: false, follow: false },
};

export default async function V5Page({ searchParams }) {
  const sp = (await searchParams) || {};
  const bilde = sp.bilde === 'bygg' ? 'bygg' : sp.bilde === 'stue' ? 'stue' : null;
  return (
    <>
      <link rel="preload" as="image" href={bilde === 'bygg' ? '/v4/bolig-hero.webp' : bilde === 'stue' ? '/v4/stue-2000.webp' : '/v4/video/eier-poster.webp'} media="(min-width: 640px)" fetchPriority="high" />
      <ForsideV4 hero="stage" bilde={bilde} />
    </>
  );
}
