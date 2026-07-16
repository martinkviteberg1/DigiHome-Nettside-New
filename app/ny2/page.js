import Ny2Page from '@/components/ny2/Ny2Page';

// =============================================================================
// /ny2 — «DigiHome 2026 Concept B» (DESIGN-LAB, IKKE INDEKSERT)
// Premium editorial-konsept etter brukerens referanse-spec (Homiq-stil):
// flush fullskjerm-hero m/ nydelig eiendomsbilde, glass-kort, pill-nav,
// #ebebeb-base, sorte kvadrat-etiketter, mørk featured-container, karusell.
// Tilpasset DigiHome: norsk, lilla merkefarge, ekte innhold/sitater/tall.
// =============================================================================

export const metadata = {
  title: 'DigiHome 2026 — konsept B',
  description: 'Eksperimentell konseptside B (intern testing).',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function Page() {
  return <Ny2Page />;
}
