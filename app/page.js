import { cookies } from 'next/headers';
import ForsideV4 from '@/components/forside/v4/ForsideV4';
import { ogUrl } from '@/lib/og-url';

const TITTEL = 'DigiHome — Utleie på autopilot';
const BESKRIVELSE = 'Plattformen for automatisert boligutleie. Kontrakt, husleie og saker går automatisk — du godkjenner det som koster. For boligeiere, eiendomsselskap og full forvaltning.';
/* Statisk og:image. Absolutt URL fordi Next i dev løser relative sosiale bilder mot localhost (→ preview mistet bildet
   og iMessage falt tilbake til varmtvannsberederen fra Drift). ?v= bumper cachen hos iMessage/Slack når bildet byttes. */
const OG_BILDE = ogUrl('/og/forside.jpg?v=2');

export const metadata = {
  title: { absolute: TITTEL },
  description: BESKRIVELSE,
  alternates: { canonical: '/' },
  /* Layoutens openGraph/twitter setter egen tittel/beskrivelse — overstyres her.
     Bildet er statisk: /public/og/forside.jpg (1200×630), rendret én gang med lib/og-v4.js → renderOgForside.
     Statisk fil = ingen kaldstart, ingen fallback til tilfeldige bilder på siden. */
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    siteName: 'DigiHome',
    title: TITTEL,
    description: BESKRIVELSE,
    url: '/',
    images: [{ url: OG_BILDE, width: 1200, height: 630, alt: 'DigiHome — Utleie på autopilot. Én godkjenning, resten gjorde DigiHome.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITTEL,
    description: BESKRIVELSE,
    images: [OG_BILDE],
  },
};

// ---------------------------------------------------------------------------
// Roten — «Utleie på autopilot.» (tidligere /v4).
//
// hero (bolig → DigiHome drifter → én godkjenning) → tillit → produkt →
// spor (privat / eiendomsselskap / forvaltning) → leietaker → alt samlet →
// FAQ → finale. Dybden per målgruppe bor på /privat, /bedrift, /forvaltning.
//
// Hero-variant: 'stage' (sentrert setning + én scene med film) er standard.
// 'side' (to kolonner) er alternativ 2 — cookie dh_hero settes av den diskrete
// veksleren nederst til venstre. ?bilde=bygg|stue bytter scenebilde i 'stage'.
// ---------------------------------------------------------------------------
export default function ForsidePage({ searchParams }) {
  const valg = cookies().get('dh_hero')?.value;
  const hero = valg === 'side' ? 'side' : valg === 'zoom' ? 'zoom' : valg === 'zoomfull' ? 'zoomfull' : 'stage';
  const bilde = searchParams?.bilde === 'bygg' ? 'bygg' : searchParams?.bilde === 'stue' ? 'stue' : null;
  const stageBilde = bilde === 'bygg' ? '/v4/bolig-hero.webp' : bilde === 'stue' ? '/v4/stue-2000.webp' : '/v4/video/eier-poster.webp';
  return (
    <>
      {/* Scenebildet er LCP. Preload riktig utsnitt per flate; fontene preloades av next/font. */}
      {hero !== 'side' ? (
        <link rel="preload" as="image" href={stageBilde} media="(min-width: 640px)" fetchPriority="high" />
      ) : (
        <>
          <link rel="preload" as="image" href="/v4/bolig-hero.webp" media="(min-width: 640px)" fetchPriority="high" />
          <link rel="preload" as="image" href="/v4/bolig-hero-mobil.webp" media="(max-width: 639px)" fetchPriority="high" />
        </>
      )}
      <ForsideV4 hero={hero} bilde={bilde} veksler />
    </>
  );
}
