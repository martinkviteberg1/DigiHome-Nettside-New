import Aapning from '@/components/tour/Aapning';
import HvaEr from '@/components/tour/HvaEr';
import KapittelOnboarding from '@/components/tour/KapittelOnboarding';

// ---------------------------------------------------------------------------
// /tour — interaktiv produktomvisning for investorer. Bygges kapittel for
// kapittel: åpning → hva er DigiHome → kapittel 01 (onboarding). Flere
// kapitler kommer etter godkjenning.
// ---------------------------------------------------------------------------

export const metadata = {
  title: 'DigiHome — Omvisning',
  description: 'En kort omvisning i DigiHome — en AI-drevet plattform for automatisert boligutleie.',
  robots: { index: false, follow: false },
};

export default function TourPage() {
  return (
    <main className="bg-[#fdfcfb] text-[#0a0a0a]">
      <Aapning />
      <HvaEr />
      <KapittelOnboarding />

      {/* Stille avslutning — flere kapitler kommer her. */}
      <footer className="flex flex-col items-center gap-4 pb-20 pt-[10vh]">
        <img src="/digihome-mark.svg" alt="" className="h-6 w-6 rounded-[5px] opacity-90" />
        <p className="text-[12.5px] tracking-[-0.005em] text-[#b3aca2]">digihome.no</p>
      </footer>
    </main>
  );
}
