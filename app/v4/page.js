import ForsideV4 from '@/components/forside/v4/ForsideV4';

const TITTEL = 'DigiHome — Utleie på autopilot';
const BESKRIVELSE = 'Kontrakt, husleie og saker går av seg selv. Du godkjenner det som koster. For private, eiendomsselskap og full forvaltning.';

export const metadata = {
  title: TITTEL,
  description: BESKRIVELSE,
  robots: { index: false, follow: false },
  /* Layoutens openGraph/twitter setter egen tittel/beskrivelse — må overstyres her, ellers arver /v4 dem.
     Bildet leveres av app/v4/opengraph-image.js + twitter-image.js (1200×630, merkefonter). */
  openGraph: {
    type: 'website',
    locale: 'nb_NO',
    siteName: 'DigiHome',
    title: TITTEL,
    description: BESKRIVELSE,
    url: '/v4',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITTEL,
    description: BESKRIVELSE,
  },
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
