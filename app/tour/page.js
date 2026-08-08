import Aapning from '@/components/tour/Aapning';
import HvaEr from '@/components/tour/HvaEr';
import KapittelOnboarding from '@/components/tour/KapittelOnboarding';
import KapittelVeivalg from '@/components/tour/KapittelVeivalg';
import KapittelAnnonse from '@/components/tour/KapittelAnnonse';
import SlideKontroll from '@/components/tour/SlideKontroll';
import Prikker from '@/components/tour/Prikker';

// ---------------------------------------------------------------------------
// /tour — interaktiv produktomvisning for investorer. Fullskjerm-slides med
// scroll-snap på desktop (fri scroll på mobil) og punktindikator i høyre kant.
// Bygges kapittel for kapittel: åpning → hva er DigiHome → kapittel 01
// (onboarding). Flere kapitler kommer etter godkjenning.
// ---------------------------------------------------------------------------

export const metadata = {
  title: 'DigiHome — Omvisning',
  description: 'En kort omvisning i DigiHome — en AI-drevet plattform for automatisert boligutleie.',
  robots: { index: false, follow: false },
};

export default function TourPage() {
  return (
    <main className="bg-[#fdfcfb] text-[#0a0a0a]">
      <SlideKontroll />
      <Prikker />
      <Aapning />
      <HvaEr />
      <KapittelOnboarding />
      <KapittelVeivalg />
      <KapittelAnnonse />

      {/* Stille avslutning — speiler åpningen. Nye kapitler legges inn før denne. */}
      <section
        data-slide="Avslutning"
        className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 py-20 lg:h-[100dvh] lg:snap-start lg:py-0"
      >
        <img src="/digihome-mark.svg" alt="" className="h-8 w-8 rounded-[7px]" />
        <p className="text-[13px] tracking-[-0.005em] text-[#b3aca2]">digihome.no</p>
      </section>
    </main>
  );
}
