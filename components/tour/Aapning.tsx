import React from 'react';
import { ChevronDown } from 'lucide-react';
import Parallax from './Parallax';

// ---------------------------------------------------------------------------
// Aapning — forsiden av omvisningen. Apple-nivå: stort ikon, stor tittel og
// én rolig tagline. Dotgriden fra /nyest3 ligger maskert bak midten og gir
// flaten liv uten å lage støy. Diskret scroll-hint nederst.
// ---------------------------------------------------------------------------

export default function Aapning() {
  return (
    <section
      data-testid="tour-aapning"
      data-slide="Forside"
      className="relative flex min-h-[100dvh] snap-start flex-col items-center justify-center overflow-hidden px-6 lg:h-[100dvh]"
    >
      {/* Dotgrid — samme rolige raster som /nyest3, maskert mot midten. Dypest lag. */}
      <Parallax faktor={0.22} className="pointer-events-none absolute inset-0">
        <div
          aria-hidden="true"
          className="h-full w-full opacity-[0.32]"
          style={{
            backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(85% 75% at 50% 42%, black 28%, transparent 82%)',
            WebkitMaskImage: 'radial-gradient(85% 75% at 50% 42%, black 28%, transparent 82%)',
          }}
        />
      </Parallax>
      {/* Varmt lys øverst — også hentet fra /nyest3. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[460px]"
        style={{ background: 'radial-gradient(60% 70% at 50% 0%, #f6f2ea 0%, rgba(246,242,234,0) 65%)' }}
      />

      <Parallax faktor={0.06} className="relative">
        <div className="flex flex-col items-center">
        <div className="dh-fade-up overflow-hidden rounded-[22px] shadow-[0_40px_100px_-30px_rgba(155,91,214,0.5)] sm:rounded-[26px]">
          <img
            src="/digihome-mark.svg"
            alt="DigiHome-ikon"
            className="h-[92px] w-[92px] sm:h-[110px] sm:w-[110px]"
          />
        </div>

        <h1
          className="e-display dh-fade-up mt-10 text-[clamp(56px,9.5vw,110px)] sm:mt-12"
          style={{ animationDelay: '0.14s' }}
        >
          DigiHome
        </h1>

        <p
          className="dh-fade-up mt-4 text-[20px] font-medium leading-[1.15] tracking-[-0.022em] text-[#8a827a] sm:mt-5 sm:text-[26px]"
          style={{ animationDelay: '0.28s', fontFamily: 'var(--font-heading), sans-serif' }}
        >
          Utleie på autopilot<span className="text-[#9B5BD6]">.</span>
        </p>
        </div>
      </Parallax>

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
