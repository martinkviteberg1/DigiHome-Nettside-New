import React from 'react';
import { ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Aapning — forsiden av omvisningen. Apple-nivå: kun ikonet, navnet og stillhet.
// Ingen knapper, ingen badges, ingen støy. Et diskret scroll-hint nederst.
// ---------------------------------------------------------------------------

export default function Aapning() {
  return (
    <section
      data-testid="tour-aapning"
      data-slide="Forside"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 lg:h-[100dvh] lg:snap-start"
    >
      <div
        className="dh-fade-up overflow-hidden rounded-[17px] shadow-[0_28px_70px_-24px_rgba(155,91,214,0.4)] sm:rounded-[19px]"
      >
        <img
          src="/digihome-mark.svg"
          alt="DigiHome-ikon"
          className="h-[68px] w-[68px] sm:h-[78px] sm:w-[78px]"
        />
      </div>

      <h1
        className="e-display dh-fade-up mt-9 text-[44px] sm:mt-10 sm:text-[58px]"
        style={{ animationDelay: '0.14s' }}
      >
        DigiHome
      </h1>

      <p
        className="dh-fade-up mt-4 text-[15px] tracking-[-0.005em] text-[#8a827a] sm:text-[16px]"
        style={{ animationDelay: '0.26s' }}
      >
        En omvisning i produktet
      </p>

      <div
        className="dh-fade-up absolute bottom-9 left-1/2 -translate-x-1/2"
        style={{ animationDelay: '0.6s' }}
      >
        <ChevronDown
          className="h-[18px] w-[18px] animate-bounce text-[#b3aca2] [animation-duration:2.4s]"
          strokeWidth={1.75}
        />
      </div>
    </section>
  );
}
