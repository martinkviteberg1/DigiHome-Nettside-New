import Aapning from '@/components/tour/Aapning';
import HvaEr from '@/components/tour/HvaEr';
import KapittelOnboarding from '@/components/tour/KapittelOnboarding';
import KapittelVeivalg from '@/components/tour/KapittelVeivalg';
import KapittelLeietaker from '@/components/tour/KapittelLeietaker';
import KapittelKontrakt from '@/components/tour/KapittelKontrakt';
import KapittelChat from '@/components/tour/KapittelChat';
import KapittelOkonomi from '@/components/tour/KapittelOkonomi';
import KapittelIntegrasjoner from '@/components/tour/KapittelIntegrasjoner';
import SlideKontroll from '@/components/tour/SlideKontroll';
import Prikker from '@/components/tour/Prikker';

// ---------------------------------------------------------------------------
// /tour — interaktiv produktomvisning for investorer. Fullskjerm-slides med
// scroll-snap på alle flater og punktindikator i høyre kant på desktop.
// Reisen: åpning → hva er DigiHome → onboarding → huseierportalen (veivalg
// som glir over i annonseflyten) → avslutning.
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
      <KapittelLeietaker />
      <KapittelKontrakt />
      <KapittelChat />
      <KapittelOkonomi />
      <KapittelIntegrasjoner />

      {/* Stille avslutning — speiler åpningen. Nye kapitler legges inn før denne. */}
      <section
        data-slide="Avslutning"
        className="relative flex min-h-[100dvh] snap-start flex-col items-center justify-center gap-4 overflow-hidden px-6 py-20 lg:h-[100dvh] lg:py-0"
      >
        {/* Dotgrid + varmt lys — samme rolige raster som forsiden. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.28]"
          style={{
            backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(85% 75% at 50% 50%, black 25%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(85% 75% at 50% 50%, black 25%, transparent 80%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[380px]"
          style={{ background: 'radial-gradient(60% 70% at 50% 100%, #f6f2ea 0%, rgba(246,242,234,0) 65%)' }}
        />
        <img src="/digihome-mark.svg" alt="" className="relative h-9 w-9 rounded-[8px] shadow-[0_16px_44px_-14px_rgba(155,91,214,0.4)]" />
        <p className="relative text-[13px] tracking-[-0.005em] text-[#b3aca2]">digihome.no</p>
      </section>
    </main>
  );
}
