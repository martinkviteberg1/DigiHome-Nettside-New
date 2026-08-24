'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Apple-keynote-minimalisme med ekte kinematografi:
   – Film-tittel «mask reveal»: tittellinjene glir opp fra en usynlig kant
   – Umerkelig Ken Burns-drift på tittelen (lever, uten å mase)
   – Myk luminans-vignett (ingen farger — kun lys)
   – Lange blur-dissolve-overganger med rack focus på hooken
   Navigasjon: → / mellomrom / PageDown (klikker) = neste steg,
   ← / PageUp = forrige, F = fullskjerm, Home/End = start/slutt. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Caveat } from 'next/font/google';

const caveat = Caveat({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], display: 'swap' });

// Steg 0 = forside · Steg 1 = påstand 1 · Steg 2 = påstand 1 + 2
const TOTALT = 3;

export default function BergenUrbanDeck() {
  const [steg, setSteg] = useState(0);
  const [musSynlig, setMusSynlig] = useState(true);
  const musTimer = useRef(null);

  const slide = steg === 0 ? 0 : 1;
  const bygg = Math.max(0, steg - 1); // på slide 1: 0 (påstand 1) eller 1 (+ påstand 2)

  const neste = useCallback(() => setSteg((s) => Math.min(TOTALT - 1, s + 1)), []);
  const forrige = useCallback(() => setSteg((s) => Math.max(0, s - 1)), []);

  const fullskjerm = useCallback(() => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen();
    } catch (e) { /* stille */ }
  }, []);

  useEffect(() => {
    const tast = (e) => {
      if (['ArrowRight', ' ', 'PageDown', 'Enter', 'ArrowDown'].includes(e.key)) { e.preventDefault(); neste(); }
      else if (['ArrowLeft', 'PageUp', 'ArrowUp', 'Backspace'].includes(e.key)) { e.preventDefault(); forrige(); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); fullskjerm(); }
      else if (e.key === 'Home') { e.preventDefault(); setSteg(0); }
      else if (e.key === 'End') { e.preventDefault(); setSteg(TOTALT - 1); }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [neste, forrige, fullskjerm]);

  // Skjul musepekeren når den ligger i ro (scene-modus)
  useEffect(() => {
    const beveg = () => {
      setMusSynlig(true);
      if (musTimer.current) clearTimeout(musTimer.current);
      musTimer.current = setTimeout(() => setMusSynlig(false), 2500);
    };
    window.addEventListener('mousemove', beveg);
    beveg();
    return () => { window.removeEventListener('mousemove', beveg); if (musTimer.current) clearTimeout(musTimer.current); };
  }, []);

  // Klikk: høyre del = neste, venstre 30 % = forrige (klikker-vennlig)
  const klikk = (e) => {
    if (e.target.closest('button')) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) forrige(); else neste();
  };

  // Cinematisk slide-overgang: lang blur-dissolve + subtil skalering
  const slideKlasse = (aktiv, retning) => (aktiv
    ? 'pointer-events-auto opacity-100 blur-0 scale-100'
    : `pointer-events-none opacity-0 blur-[16px] ${retning === 'inn' ? 'scale-[1.03]' : 'scale-[0.98]'}`);

  return (
    <main
      onClick={klikk}
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#fcfcfc] font-body text-[#0f0f0f] ${musSynlig ? '' : 'cursor-none'}`}
      data-testid="bu-deck"
    >
      {/* ── Luminans-vignett: kun lys, ingen farge — gir scenen dybde ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 50% 42%, #ffffff 0%, #fbfbfb 55%, #f2f2f2 100%)' }}
      />

      {/* ═══ SLIDE 1 — Forside ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${slideKlasse(slide === 0, 'ut')}`}
        data-testid="bu-slide-1"
      >
        {/* Wordmark — rent tekstmerke, sentrert som på en keynote-scene */}
        <header className="bu-inn flex justify-center pt-14" style={{ animationDelay: '120ms' }}>
          <p className="font-heading text-[17px] font-bold tracking-[-0.02em] text-[#0f0f0f]/80">digihome</p>
        </header>

        {/* Tittel — film-tittel mask reveal + umerkelig drift */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <h1 className="bu-drift font-heading text-[clamp(44px,7vw,110px)] font-bold leading-[1.06] tracking-[-0.04em]">
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
              <span className="bu-linje block" style={{ animationDelay: '480ms' }}>Vibe coding</span>
            </span>
            <span className="block overflow-hidden pb-[0.14em] -mb-[0.14em]">
              <span className="bu-linje block" style={{ animationDelay: '680ms' }}>i praksis.</span>
            </span>
          </h1>
          <p className="bu-inn mt-11 text-[clamp(14px,1.2vw,17px)] text-[#86868b]" style={{ animationDelay: '1650ms' }}>
            Historien om hvordan DigiHome ble til
          </p>
        </div>

        {/* Stille signatur */}
        <footer className="bu-inn pb-12 text-center" style={{ animationDelay: '2300ms' }}>
          <p className="text-[12px] tracking-tight text-[#b0b0b5]">
            Martin Kviteberg&ensp;·&ensp;Bergen Urban
          </p>
        </footer>
      </section>

      {/* ═══ SLIDE 2 — Paradoks-hook ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${slideKlasse(slide === 1, 'inn')}`}
        data-testid="bu-slide-2"
      >
        <header className="flex justify-center pt-14">
          <p className="font-heading text-[15px] font-bold tracking-[-0.02em] text-[#0f0f0f]/25">digihome</p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-16">
          {/* Kamera-glid: påstand 1 står optisk sentrert alene — hele
              komposisjonen glir mykt opp idet påstand 2 toner inn */}
          <div className={`flex w-full flex-col items-center transition-transform duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${bygg >= 1 ? 'translate-y-0' : 'translate-y-[12vh]'}`}>
            {/* Påstand 1 — glir ut av fokus når påstand 2 kommer (rack focus) */}
            <div
              className={`max-w-[980px] text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${bygg >= 1 ? 'scale-[0.96] opacity-20 blur-[4px]' : 'scale-100 opacity-100 blur-0'}`}
            >
              <p className="text-[12px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">01</p>
              <h2 className="mt-7 font-heading text-[clamp(30px,4vw,58px)] font-bold leading-[1.15] tracking-[-0.03em]" data-testid="bu-paastand-1">
                DigiHome er blant verdens mest avanserte <span className="whitespace-nowrap">vibe-kodede</span> applikasjoner.
              </h2>
            </div>

            {/* Påstand 2 — blyant-håndskrift, blur-dissolve inn */}
            <div
              className={`mt-14 max-w-[900px] text-center transition-[opacity,transform,filter] duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:mt-[4.5rem] ${bygg >= 1 ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-8 opacity-0 blur-[12px]'}`}
              data-testid="bu-paastand-2"
            >
              <p className="text-[12px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">02</p>
              <p className={`${caveat.className} mt-6 -rotate-[1.3deg] text-[clamp(34px,4.6vw,68px)] font-semibold leading-[1.12] text-[#2d2d2f]`}>
                «En 6-åring kunne ha <span className="whitespace-nowrap">vibe-kodet</span> DigiHome.»
              </p>
            </div>
          </div>
        </div>

        <footer className="pb-12" />
      </section>

      {/* ── Fullskjerm (kun synlig ved musbevegelse — usynlig på scenen) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); fullskjerm(); }}
        title="Fullskjerm (F)"
        aria-label="Fullskjerm"
        className={`absolute bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full text-[#c7c7cc] transition-opacity duration-300 hover:text-[#0f0f0f] ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Kinematografi: mask reveal, blur-dissolve og umerkelig drift */}
      <style jsx global>{`
        @keyframes buLinje {
          from { transform: translateY(112%); }
          to { transform: translateY(0); }
        }
        .bu-linje {
          transform: translateY(112%);
          animation: buLinje 1.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes buInn {
          from { opacity: 0; transform: translateY(14px); filter: blur(8px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .bu-inn { opacity: 0; animation: buInn 1.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        @keyframes buDrift {
          from { transform: scale(1); }
          to { transform: scale(1.016); }
        }
        .bu-drift { animation: buDrift 26s ease-in-out 2.2s infinite alternate; }
      `}</style>
    </main>
  );
}
