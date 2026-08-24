'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Superminimalistisk keynote: én varm off-white flate, ren monokrom
   typografi, null chrome. Cinematiske overganger: blur-dissolve med subtil
   skalering (rack focus) — Apple-nivå ro.
   Navigasjon: → / mellomrom / PageDown (klikker) = neste steg,
   ← / PageUp = forrige, F = fullskjerm, Home/End = start/slutt.
   Slide 2 har «builds»: påstand 1 alene → neste tastetrykk avslører
   påstand 2 i blyant-håndskrift mens påstand 1 glir ut av fokus. */

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

  // Cinematisk slide-overgang: blur-dissolve + subtil skalering (rack focus)
  const slideKlasse = (aktiv, retning) => (aktiv
    ? 'pointer-events-auto opacity-100 blur-0 scale-100'
    : `pointer-events-none opacity-0 blur-[14px] ${retning === 'inn' ? 'scale-[1.035]' : 'scale-[0.975]'}`);

  return (
    <main
      onClick={klikk}
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#fafafa] font-body text-[#141414] ${musSynlig ? '' : 'cursor-none'}`}
      data-testid="bu-deck"
    >
      {/* ═══ SLIDE 1 — Forside ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${slideKlasse(slide === 0, 'ut')}`}
        data-testid="bu-slide-1"
      >
        {/* Eneste merke: ørlite monokromt wordmark */}
        <header className="px-14 pt-12 md:px-24">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[17px] w-auto opacity-50 grayscale" />
        </header>

        {/* Typografien er alt */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <h1
            className="bu-inn font-heading text-[clamp(64px,10.5vw,158px)] font-bold leading-[0.98] tracking-[-0.045em]"
            style={{ animationDelay: '300ms' }}
          >
            Vibe coding
            <br />
            <span className="text-[#98989d]">i praksis.</span>
          </h1>
          <p className="bu-inn mt-12 text-[clamp(15px,1.5vw,19px)] text-[#86868b]" style={{ animationDelay: '900ms' }}>
            Historien om hvordan DigiHome ble til
          </p>
        </div>

        {/* Stille signatur */}
        <footer className="bu-inn pb-12 text-center" style={{ animationDelay: '1400ms' }}>
          <p className="text-[12.5px] tracking-tight text-[#a1a1a6]">
            Martin Kviteberg&ensp;·&ensp;Bergen Urban
          </p>
        </footer>
      </section>

      {/* ═══ SLIDE 2 — Paradoks-hook ═══ */}
      <section
        className={`absolute inset-0 flex flex-col items-center justify-center px-8 transition-[opacity,transform,filter] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:px-16 ${slideKlasse(slide === 1, 'inn')}`}
        data-testid="bu-slide-2"
      >
        {/* Kamera-glid: påstand 1 står optisk sentrert alene — hele
            komposisjonen glir mykt opp idet påstand 2 toner inn */}
        <div className={`flex w-full flex-col items-center transition-transform duration-[1100ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${bygg >= 1 ? 'translate-y-0' : 'translate-y-[13vh]'}`}>
          {/* Påstand 1 — glir ut av fokus når påstand 2 kommer (rack focus) */}
          <div
            className={`max-w-[1180px] text-center transition-[opacity,transform,filter] duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${bygg >= 1 ? 'scale-[0.965] opacity-25 blur-[3px]' : 'scale-100 opacity-100 blur-0'}`}
          >
            <p className="text-[13px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">01</p>
            <h2 className="mt-8 font-heading text-[clamp(36px,5vw,72px)] font-bold leading-[1.12] tracking-[-0.03em]" data-testid="bu-paastand-1">
              DigiHome er blant verdens mest avanserte <span className="whitespace-nowrap">vibe-kodede</span> applikasjoner.
            </h2>
          </div>

          {/* Påstand 2 — blyant-håndskrift, blur-dissolve inn */}
          <div
            className={`mt-16 max-w-[1020px] text-center transition-[opacity,transform,filter] duration-[1000ms] ease-[cubic-bezier(0.22,1,0.36,1)] md:mt-20 ${bygg >= 1 ? 'translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-7 opacity-0 blur-[10px]'}`}
            data-testid="bu-paastand-2"
          >
            <p className="text-[13px] font-semibold tabular-nums tracking-[0.25em] text-[#c7c7cc]">02</p>
            <p className={`${caveat.className} mt-7 -rotate-[1.3deg] text-[clamp(42px,5.5vw,84px)] font-semibold leading-[1.1] text-[#2d2d2f]`}>
              «En 6-åring kunne ha <span className="whitespace-nowrap">vibe-kodet</span> DigiHome.»
            </p>
          </div>
        </div>
      </section>

      {/* ── Fullskjerm (kun synlig ved musbevegelse — usynlig på scenen) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); fullskjerm(); }}
        title="Fullskjerm (F)"
        aria-label="Fullskjerm"
        className={`absolute bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full text-[#c7c7cc] transition-opacity duration-300 hover:text-[#141414] ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Cinematisk inntreden (forsiden): blur-dissolve nedenfra */}
      <style jsx global>{`
        @keyframes buInn {
          from { opacity: 0; transform: translateY(16px); filter: blur(10px); }
          to { opacity: 1; transform: translateY(0); filter: blur(0); }
        }
        .bu-inn { opacity: 0; animation: buInn 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      `}</style>
    </main>
  );
}
