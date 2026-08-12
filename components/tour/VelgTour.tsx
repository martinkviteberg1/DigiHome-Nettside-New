'use client';

import React, { useRef } from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';

// ---------------------------------------------------------------------------
// VelgTour — veivalget rett etter definisjonen: DigiHome har to ansikter, og
// her velger man hvilken omvisning man vil se. Huseier-kortet fortsetter
// reisen (alt videre i omvisningen er huseier-opplevelsen); forvalter-kortet
// er varslet som «kommer snart». Kortet navigerer via samme motor som
// piltastene (syntetisk ArrowDown til SlideKontroll) så bevegelsen er identisk.
// ---------------------------------------------------------------------------

const HUS_IKON = ['M3 10.5L12 3l9 7.5', 'M5.5 9.5V20h13V9.5', 'M10 20v-5.5h4V20'];
const BYGG_IKON = ['M3 21h18', 'M5 21V5.5h9V21', 'M14 10h5v11', 'M8 9h3M8 12.5h3M8 16h3'];

function Ikon({ paths, farge }: { paths: string[]; farge: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden="true">
      {paths.map((d) => (
        <path key={d} d={d} stroke={farge} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

function Punkt({ tekst, farge }: { tekst: string; farge: string }) {
  return (
    <span className="flex items-center gap-2.5 text-[13.5px] leading-snug text-[#5b554b]">
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" aria-hidden="true">
        <path d="M20 6L9 17l-5-5" stroke={farge} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {tekst}
    </span>
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
      {/* Dotgrid + varmt lys — samme rolige raster som resten av omvisningen. */}
      <Parallax faktor={0.18} className="pointer-events-none absolute inset-0">
        <div
          aria-hidden="true"
          className="h-full w-full opacity-[0.26]"
          style={{
            backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(80% 70% at 50% 50%, black 22%, transparent 78%)',
            WebkitMaskImage: 'radial-gradient(80% 70% at 50% 50%, black 22%, transparent 78%)',
          }}
        />
      </Parallax>

      <div className="relative mx-auto w-full max-w-[1060px]">
        <div className="text-center">
          <Avslor>
            <p className="e-label">Én plattform — to opplevelser</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mx-auto mt-5 max-w-[22ch] text-[30px] leading-[1.1] sm:text-[40px] lg:text-[46px]">
              Velg din omvisning<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="mx-auto mt-4 max-w-[52ch] text-[14.5px] leading-[1.6] text-[#8a827a] sm:text-[16px]">
              Forvalterens operativsystem — og huseierens autopilot. Samme motor, to helt ulike hverdager.
            </p>
          </Avslor>
        </div>

        <div className="mt-10 grid gap-4 sm:mt-12 sm:gap-5 lg:grid-cols-2">
          {/* For huseiere — fortsetter omvisningen */}
          <Avslor delay={260}>
            <button
              type="button"
              onClick={startHuseier}
              data-testid="tour-velg-huseier"
              className="group relative block h-full w-full overflow-hidden rounded-[26px] border border-[#e8ddf5] bg-white p-7 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[#d3bcf0] hover:shadow-[0_44px_90px_-42px_rgba(155,91,214,0.45)] sm:p-9"
            >
              <span
                aria-hidden="true"
                className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-[#9B5BD6] opacity-[0.09] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.16]"
              />
              <span className="relative flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#f6f1fb]">
                <Ikon paths={HUS_IKON} farge="#9B5BD6" />
              </span>
              <span className="relative mt-6 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9B5BD6]">
                For huseiere
              </span>
              <span className="e-display relative mt-2.5 block text-[24px] leading-[1.08] sm:text-[28px]">
                Én bolig. Null styr.
              </span>
              <span className="relative mt-3 block max-w-[40ch] text-[14px] leading-[1.6] text-[#8a827a]">
                Du eier boligen — DigiHome drifter den. Annonse, kontrakt, husleie og meldinger går av seg selv.
              </span>
              <span className="relative mt-5 grid gap-2">
                <Punkt farge="#9B5BD6" tekst="Annonse, visning og kontrakt — automatisk" />
                <Punkt farge="#9B5BD6" tekst="Husleien rett på konto, purring uten deg" />
                <Punkt farge="#9B5BD6" tekst="Hele leieforholdet i én app" />
              </span>
              <span className="relative mt-7 flex items-center gap-2 text-[14.5px] font-semibold text-[#0a0a0a]">
                Start omvisningen
                <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" aria-hidden="true">
                  <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
          </Avslor>

          {/* For forvaltere — kommer snart */}
          <Avslor delay={340}>
            <div className="relative h-full overflow-hidden rounded-[26px] border border-[#eee9e0] bg-white/70 p-7 text-left sm:p-9">
              <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#f3f0ea]">
                <Ikon paths={BYGG_IKON} farge="#8a827a" />
              </span>
              <span className="mt-6 block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a827a]">
                For forvaltere
              </span>
              <span className="e-display mt-2.5 block text-[24px] leading-[1.08] sm:text-[28px]">
                Hele porteføljen. Ett system.
              </span>
              <span className="mt-3 block max-w-[40ch] text-[14px] leading-[1.6] text-[#8a827a]">
                Alle boliger, leietakere, oppgjør og saker i ett operativsystem — med AI-agenter på laget.
              </span>
              <span className="mt-5 grid gap-2">
                <Punkt farge="#b3aa9e" tekst="Boliger, eiere og leietakere — samlet" />
                <Punkt farge="#b3aa9e" tekst="Automatiserte oppgjør og rapporter" />
                <Punkt farge="#b3aa9e" tekst="AI-agenter som jobber for teamet" />
              </span>
              <span className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#e5dfd4] bg-white px-3.5 py-1.5 text-[12px] font-semibold text-[#8a827a]">
                <span className="h-[6px] w-[6px] rounded-full bg-[#d8b45a]" />
                Omvisning kommer snart
              </span>
            </div>
          </Avslor>
        </div>

        <Avslor delay={420}>
          <p className="mt-8 hidden text-center text-[12.5px] text-[#b3aca2] lg:block">
            Resten av omvisningen følger huseieren — velg kortet, eller bare trykk ↓
          </p>
        </Avslor>
      </div>
    </section>
  );
}
