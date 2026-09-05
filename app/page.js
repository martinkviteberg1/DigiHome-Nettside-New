import ForsideV4 from '@/components/forside/v4/ForsideV4';

const TITTEL = 'DigiHome — Utleie på autopilot';
const BESKRIVELSE = 'Kontrakt, husleie og saker går av seg selv. Du godkjenner det som koster. For private, eiendomsselskap og full forvaltning.';

export const metadata = {
  title: { absolute: TITTEL },
  description: BESKRIVELSE,
  alternates: { canonical: '/' },
  /* Layoutens openGraph/twitter setter egen tittel/beskrivelse — overstyres her.
     Bildet leveres av app/opengraph-image.js + twitter-image.js (1200×630, merkefonter). */
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    siteName: 'DigiHome',
    title: TITTEL,
    description: BESKRIVELSE,
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITTEL,
    description: BESKRIVELSE,
  },
};

// ---------------------------------------------------------------------------
// Roten — «Utleie på autopilot.» (tidligere /v4).
//
// hero (bolig → DigiHome drifter → én godkjenning) → tillit → produkt →
// spor (privat / eiendomsselskap / forvaltning) → leietaker → alt samlet →
// FAQ → finale. Dybden per målgruppe bor på /privat, /bedrift, /forvaltning.
// ---------------------------------------------------------------------------
export default function ForsidePage() {
  return (
    <>
      {/* Boligfotoet er LCP. Preload riktig utsnitt per flate; fontene preloades av next/font. */}
      <link rel="preload" as="image" href="/v4/bolig-hero.webp" media="(min-width: 640px)" fetchPriority="high" />
      <link rel="preload" as="image" href="/v4/bolig-hero-mobil.webp" media="(max-width: 639px)" fetchPriority="high" />
      <ForsideV4 />
    </>
  );
}
