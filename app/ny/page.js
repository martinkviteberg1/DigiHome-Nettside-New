import Header from '@/components/dh/Header';
import Footer from '@/components/dh/Footer';
import StatsSection from '@/components/dh/StatsSection';
import PartnersBar from '@/components/dh/PartnersBar';
import TestimonialsSection from '@/components/dh/TestimonialsSection';
import FaqSection from '@/components/dh/FaqSection';
import CTASection from '@/components/dh/CTASection';
import KineticHero from '@/components/ny/KineticHero';
import ScrollyTenTwo from '@/components/ny/ScrollyTenTwo';
import OrganicDivider from '@/components/ny/OrganicDivider';

// =============================================================================
// /ny — «DigiHome 2026 Concept» (DESIGN-LAB, IKKE INDEKSERT)
// Eksperimentell alternativ forside for å teste 2026-trender mot roten:
// kinetisk typografi, scrollytelling (10+2), regelbasert personalisering
// (?v=kort|lang for demo), organiske skiller og neumorfisme-detaljer.
// REGLER: noindex (aldri i sitemap), samme innholdskilder/tall som roten
// (30 %-påstanden), tracking-events (ny_concept_view) for sammenligning.
// Vinnere porteres til / — denne siden er et laboratorium, ikke en kopi.
// =============================================================================

export const metadata = {
  title: 'DigiHome 2026 — konsept',
  description: 'Eksperimentell konseptside (intern testing).',
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function NyConceptPage() {
  return (
    <div className="min-h-screen bg-[#fdfcfb]" data-testid="ny-page">
      <Header />
      <main>
        <KineticHero />
        <OrganicDivider from="#fdfcfb" to="#ffffff" />
        <StatsSection />
        <PartnersBar />
        <OrganicDivider from="#ffffff" to="#fdfcfb" flip />
        <ScrollyTenTwo />
        <OrganicDivider from="#fdfcfb" to="#faf7fe" />
        <TestimonialsSection />
        <FaqSection />
        <CTASection />
      </main>
      <Footer />
      {/* Konsept-merke: gjør det tydelig at dette er design-laben */}
      <div className="fixed bottom-4 left-4 z-50 px-3.5 py-2 rounded-full bg-[#0a0a0a]/85 backdrop-blur text-white text-[11px] font-semibold tracking-[0.06em] shadow-lg pointer-events-none">
        2026-KONSEPT · intern test
      </div>
    </div>
  );
}
