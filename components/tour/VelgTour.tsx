'use client';

import React, { useRef } from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';

// ---------------------------------------------------------------------------
// VelgTour — enkelt veivalg etter definisjonen: hvilken omvisning vil du se?
// Bevisst avskallet: ingen salgspunkter, bare to rene valg. Huseier-kortet
// fortsetter reisen via samme motor som piltastene (syntetisk ArrowDown til
// SlideKontroll); forvalter-omvisningen er varslet som «kommer snart».
// ---------------------------------------------------------------------------

const HUS_IKON = ['M3 10.5L12 3l9 7.5', 'M5.5 9.5V20h13V9.5', 'M10 20v-5.5h4V20'];
const BYGG_IKON = ['M3 21h18', 'M5 21V5.5h9V21', 'M14 10h5v11', 'M8 9h3M8 12.5h3M8 16h3'];

function Ikon({ paths, farge }: { paths: string[]; farge: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-[26px] w-[26px]" fill="none" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} stroke={farge} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

export default function VelgTour() {
  const rot = useRef<HTMLElement | null>(null);

  // Fortsett til neste slide — via SlideKontroll-motoren på desktop (samme
  // animasjon som piltastene), naturlig smooth-scroll på mobil.
  const startHuseier = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      return;
    }
    const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-slide]'));
    const i = slides.indexOf(rot.current as HTMLElement);
    slides[i + 1]?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={rot}
      data-testid="tour-velg"
      data-slide="Velg omvisning"
      className="relative flex min-h-[100dvh] snap-start flex-col items-center justify-center overflow-hidden px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      {/* Dotgrid — samme rolige raster som resten av omvisningen. */}
      <Parallax faktor={0.18} className="pointer-events-none absolute inset-0">
        <div
          aria-hidden="true"
          className="h-full w-full opacity-[0.24]"
          style={{
            backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(75% 65% at 50% 50%, black 20%, transparent 76%)',
            WebkitMaskImage: 'radial-gradient(75% 65% at 50% 50%, black 20%, transparent 76%)',
          }}
        />
      </Parallax>

      <div className="relative mx-auto w-full max-w-[760px] text-center">
        <Avslor>
          <h2 className="e-display mx-auto text-[30px] leading-[1.1] sm:text-[40px] lg:text-[44px]">
            Velg din omvisning<span className="text-[#9B5BD6]">.</span>
          </h2>
        </Avslor>
        <Avslor delay={90}>
          <p className="mx-auto mt-4 max-w-[54ch] text-[14.5px] leading-[1.65] text-[#8a827a] sm:text-[16px]">
            DigiHome er laget for både deg som eier én bolig — og for forvaltere
            som drifter mange. Velg reisen som ligner mest på din.
          </p>
        </Avslor>

        <div className="mt-10 grid gap-3.5 sm:mt-12 sm:grid-cols-2 sm:gap-4">
          <Avslor delay={180}>
            <button
              type="button"
              onClick={startHuseier}
              data-testid="tour-velg-huseier"
              className="group flex h-full w-full flex-col items-center rounded-[24px] border border-[#e9e3d9] bg-white px-8 py-10 transition-all duration-300 hover:-translate-y-1 hover:border-[#d3bcf0] hover:shadow-[0_36px_80px_-42px_rgba(155,91,214,0.4)] sm:py-12"
            >
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#f6f1fb] transition-colors duration-300 group-hover:bg-[#efe7fa]">
                <Ikon paths={HUS_IKON} farge="#9B5BD6" />
              </span>
              <span className="mt-5 text-[19px] font-semibold tracking-[-0.02em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>
                For huseiere
              </span>
              <span className="mt-1.5 text-[13.5px] text-[#8a827a]">Én bolig — på autopilot</span>
              <span className="mt-7 flex items-center gap-1.5 text-[14px] font-semibold text-[#9B5BD6]">
                Start omvisningen
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </Avslor>

          <Avslor delay={260}>
            <div className="flex h-full w-full flex-col items-center rounded-[24px] border border-[#eee9e0] bg-white/60 px-8 py-10 sm:py-12">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#f3f0ea]">
                <Ikon paths={BYGG_IKON} farge="#a89f93" />
              </span>
              <span className="mt-5 text-[19px] font-semibold tracking-[-0.02em] text-[#3d382f]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>
                For forvaltere
              </span>
              <span className="mt-1.5 text-[13.5px] text-[#8a827a]">Hele porteføljen — ett system</span>
              <span className="mt-7 text-[14px] font-medium text-[#b3aa9e]">Kommer snart</span>
            </div>
          </Avslor>
        </div>
      </div>
    </section>
  );
}
