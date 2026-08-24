'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Kinematisk, mørkt scenedeck i DigiHome-designspråket.
   Navigasjon: → / mellomrom / PageDown (klikker) = neste steg,
   ← / PageUp = forrige, F = fullskjerm, Home/End = start/slutt.
   Slide 2 har «builds»: påstand 1 vises først — neste tastetrykk
   avslører påstand 2 i håndskrift (6-åringen). Musepeker skjules
   automatisk etter 2,5 s ro. */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Caveat } from 'next/font/google';

const caveat = Caveat({ subsets: ['latin', 'latin-ext'], weight: ['500', '600', '700'], display: 'swap' });

// Steg 0 = forside · Steg 1 = påstand 1 · Steg 2 = påstand 1 + 2
const TOTALT = 3;
const ANTALL_SLIDES = 2;

export default function BergenUrbanDeck() {
  const [steg, setSteg] = useState(0);
  const [musSynlig, setMusSynlig] = useState(true);
  const [harNavigert, setHarNavigert] = useState(false);
  const musTimer = useRef(null);

  const slide = steg === 0 ? 0 : 1;
  const bygg = Math.max(0, steg - 1); // på slide 1: 0 (påstand 1) eller 1 (+ påstand 2)

  const neste = useCallback(() => { setSteg((s) => Math.min(TOTALT - 1, s + 1)); setHarNavigert(true); }, []);
  const forrige = useCallback(() => { setSteg((s) => Math.max(0, s - 1)); setHarNavigert(true); }, []);

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

  // Klikk: høyre 2/3 = neste, venstre 1/3 = forrige (klikker-vennlig)
  const klikk = (e) => {
    if (e.target.closest('button')) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) forrige(); else neste();
  };

  return (
    <main
      onClick={klikk}
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#0a0a09] font-body text-white ${musSynlig ? '' : 'cursor-none'}`}
      data-testid="bu-deck"
    >
      {/* ── Kinematisk bakgrunn: rolige lysninger + vignett ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-[30%] left-1/2 h-[80vh] w-[90vw] -translate-x-1/2 rounded-full bg-[#7c3aed] opacity-[0.10] blur-[140px]" />
        <div className="absolute -bottom-[35%] -left-[15%] h-[70vh] w-[60vw] rounded-full bg-[#d298ff] opacity-[0.05] blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
      </div>

      {/* ═══ SLIDE 1 — Forside ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-all duration-700 ease-out ${slide === 0 ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none -translate-y-6 opacity-0'}`}
        data-testid="bu-slide-1"
      >
        {/* Toppbar */}
        <header className="flex items-center justify-between px-10 pt-9 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-white.svg" alt="DigiHome" className="h-6 w-auto opacity-95 md:h-7" />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/40 md:text-[12px]">Bergen Urban</p>
        </header>

        {/* Midtparti */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="bu-inn text-[11.5px] font-bold uppercase tracking-[0.34em] text-[#c4a5f7] md:text-[13px]" style={{ animationDelay: '150ms' }}>
            Et foredrag om å bygge programvare med AI
          </p>
          <h1
            className="bu-inn mt-7 font-heading text-[clamp(52px,9vw,124px)] font-bold leading-[1.02] tracking-[-0.035em]"
            style={{ animationDelay: '350ms' }}
          >
            Vibe coding<br />
            <span className="bg-gradient-to-r from-[#d8c2fb] via-[#b28af5] to-[#d298ff] bg-clip-text text-transparent">i praksis</span>
          </h1>
          <p className="bu-inn mt-8 max-w-[560px] text-[clamp(15px,1.6vw,20px)] leading-relaxed text-white/55" style={{ animationDelay: '600ms' }}>
            Historien om hvordan DigiHome ble til
          </p>
        </div>

        {/* Bunnlinje */}
        <footer className="bu-inn flex items-end justify-between px-10 pb-9 md:px-16" style={{ animationDelay: '850ms' }}>
          <div>
            <p className="text-[15px] font-semibold tracking-tight text-white/90">Martin Kviteberg</p>
            <p className="mt-1 text-[12px] text-white/40">DigiHome · Bergen</p>
          </div>
          <p className={`flex items-center gap-2 text-[12px] text-white/35 transition-opacity duration-500 ${harNavigert ? 'opacity-0' : 'opacity-100'}`}>
            Bruk piltastene
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 text-white/60">→</span>
          </p>
        </footer>
      </section>

      {/* ═══ SLIDE 2 — Paradoks-hook ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-all duration-700 ease-out ${slide === 1 ? 'pointer-events-auto translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
        data-testid="bu-slide-2"
      >
        {/* Diskret wordmark for kontinuitet */}
        <header className="flex items-center justify-between px-10 pt-9 md:px-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-white.svg" alt="DigiHome" className="h-5 w-auto opacity-30" />
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-white/20">Bergen Urban</p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-12">
          {/* Påstand 1 — glir litt opp når påstand 2 kommer */}
          <div className={`max-w-[1080px] text-center transition-all duration-700 ease-out ${bygg >= 1 ? '-translate-y-3 scale-[0.94]' : 'translate-y-0 scale-100'}`}>
            <p className={`text-[11px] font-bold uppercase tracking-[0.3em] text-[#c4a5f7] transition-opacity duration-500 md:text-[12.5px] ${slide === 1 ? 'opacity-100' : 'opacity-0'}`}>
              Sann påstand № 1
            </p>
            <h2 className="mt-6 font-heading text-[clamp(30px,4.6vw,62px)] font-bold leading-[1.16] tracking-[-0.025em] text-white" data-testid="bu-paastand-1">
              DigiHome er blant verdens mest avanserte{' '}
              <span className="whitespace-nowrap bg-gradient-to-r from-[#d8c2fb] to-[#d298ff] bg-clip-text text-transparent">vibe-kodede</span>{' '}
              applikasjoner.
            </h2>
          </div>

          {/* Påstand 2 — 6-åringens håndskrift */}
          <div
            className={`mt-12 max-w-[900px] text-center transition-all duration-700 ease-out md:mt-16 ${bygg >= 1 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-8 opacity-0'}`}
            data-testid="bu-paastand-2"
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#e8c96a]/80 md:text-[12.5px]">Sann påstand № 2</p>
            <p
              className={`${caveat.className} mt-5 -rotate-[1.6deg] text-[clamp(34px,5.2vw,72px)] font-semibold leading-[1.15] text-[#f3d982]`}
            >
              «En 6-åring kunne ha vibe-kodet DigiHome.»
            </p>
            {/* Håndtegnet strek under */}
            <svg viewBox="0 0 420 14" className="mx-auto mt-3 h-[10px] w-[min(420px,60%)] -rotate-[1.6deg] text-[#e8c96a]/70" fill="none" aria-hidden>
              <path d="M4 9 C 80 3, 150 12, 220 7 S 360 4, 416 8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <footer className="flex items-end justify-between px-10 pb-9 md:px-16">
          <p className="text-[12px] tabular-nums text-white/30">02 / {String(ANTALL_SLIDES).padStart(2, '0')}</p>
          <p className={`text-[12px] text-white/25 transition-opacity duration-500 ${bygg >= 1 ? 'opacity-0' : 'opacity-100'}`}>→ én til</p>
        </footer>
      </section>

      {/* ── Progresjonslinje ── */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full bg-white/[0.06]">
        <div
          className="h-full bg-gradient-to-r from-[#7c3aed] to-[#d298ff] transition-all duration-500 ease-out"
          style={{ width: `${((steg + 1) / TOTALT) * 100}%` }}
          data-testid="bu-progresjon"
        />
      </div>

      {/* ── Fullskjerm-knapp (synlig ved musbevegelse) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); fullskjerm(); }}
        title="Fullskjerm (F)"
        aria-label="Fullskjerm"
        className={`absolute right-6 top-6 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all duration-300 hover:border-white/25 hover:text-white/80 ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Lokale inntreden-animasjoner (kun forsiden) */}
      <style jsx global>{`
        @keyframes buInn {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bu-inn { opacity: 0; animation: buInn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </main>
  );
}
