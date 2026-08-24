'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck ═══════════════════
   Keynote-minimalisme: varm off-white flate, monokrom typografi i verdens-
   klasse, ÉN aksentfarge brukt på ett ord i hele decket. Ingen pynt —
   typografien og luften gjør jobben.
   Navigasjon: → / mellomrom / PageDown (klikker) = neste steg,
   ← / PageUp = forrige, F = fullskjerm, Home/End = start/slutt.
   Slide 2 har «builds»: påstand 1 vises først — neste tastetrykk avslører
   påstand 2 i blyant-håndskrift. Musepekeren skjules etter 2,5 s ro. */

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

  // Klikk: høyre del = neste, venstre 30 % = forrige (klikker-vennlig)
  const klikk = (e) => {
    if (e.target.closest('button')) return;
    const x = e.clientX / window.innerWidth;
    if (x < 0.3) forrige(); else neste();
  };

  return (
    <main
      onClick={klikk}
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#fbfbfa] font-body text-[#1a1917] ${musSynlig ? '' : 'cursor-none'}`}
      data-testid="bu-deck"
    >
      {/* ── Bakgrunn: én ren, varm off-white flate — ingenting annet ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#fbfbfa]" />

      {/* ═══ SLIDE 1 — Forside ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${slide === 0 ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[1.015] opacity-0'}`}
        data-testid="bu-slide-1"
      >
        {/* Toppbar — nesten usynlig */}
        <header className="flex items-center justify-between px-12 pt-10 md:px-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-5 w-auto opacity-70" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#b3aea7]">Bergen Urban</p>
        </header>

        {/* Midtparti — sentrert, typografien er alt */}
        <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
          <p className="bu-inn text-[11px] font-semibold uppercase tracking-[0.34em] text-[#b3aea7]" style={{ animationDelay: '200ms' }}>
            Et foredrag om å bygge programvare med AI
          </p>
          <h1
            className="bu-inn mt-9 font-heading text-[clamp(60px,10vw,148px)] font-bold leading-[1.0] tracking-[-0.045em]"
            style={{ animationDelay: '420ms' }}
          >
            Vibe coding
            <br />
            <span className="text-[#c6c1b9]">i praksis.</span>
          </h1>
          <p className="bu-inn mt-10 text-[clamp(15px,1.5vw,19px)] leading-relaxed text-[#8a857d]" style={{ animationDelay: '680ms' }}>
            Historien om hvordan DigiHome ble til
          </p>
        </div>

        {/* Bunn — stille signatur */}
        <footer className="bu-inn relative px-12 pb-10 md:px-20" style={{ animationDelay: '920ms' }}>
          <p className="text-center text-[12.5px] tracking-tight text-[#8a857d]">
            <span className="font-semibold text-[#1a1917]">Martin Kviteberg</span>
            <span className="mx-2.5 text-[#d6d2cb]">·</span>
            DigiHome, Bergen
          </p>
          <p className={`absolute bottom-10 right-12 flex items-center gap-2 text-[11.5px] text-[#c0bbb3] transition-opacity duration-500 md:right-20 ${harNavigert ? 'opacity-0' : 'opacity-100'}`}>
            Piltast
            <span className="inline-flex h-[22px] w-[22px] items-center justify-center rounded-[6px] border border-black/[0.08] bg-white text-[#8a857d] shadow-[0_1px_1px_rgba(0,0,0,0.03)]">→</span>
          </p>
        </footer>
      </section>

      {/* ═══ SLIDE 2 — Paradoks-hook ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform] duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${slide === 1 ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.985] opacity-0'}`}
        data-testid="bu-slide-2"
      >
        {/* Toppbar for kontinuitet */}
        <header className="flex items-center justify-between px-12 pt-10 md:px-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-5 w-auto opacity-40" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[#c0bbb3]">Bergen Urban</p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-16">
          {/* Påstand 1 — trer stille tilbake når påstand 2 kommer */}
          <div className={`max-w-[1140px] text-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${bygg >= 1 ? 'scale-[0.97] opacity-30' : 'scale-100 opacity-100'}`}>
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#b3aea7]">Sann påstand № 1</p>
            <h2 className="mt-7 font-heading text-[clamp(34px,4.9vw,70px)] font-bold leading-[1.14] tracking-[-0.03em]" data-testid="bu-paastand-1">
              DigiHome er blant verdens mest avanserte{' '}
              <span className="whitespace-nowrap text-[#7c3aed]">vibe-kodede</span>{' '}
              applikasjoner.
            </h2>
          </div>

          {/* Påstand 2 — blyant-håndskrift */}
          <div
            className={`mt-14 max-w-[1000px] text-center transition-all duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:mt-16 ${bygg >= 1 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}`}
            data-testid="bu-paastand-2"
          >
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.32em] text-[#b3aea7]">Sann påstand № 2</p>
            <p className={`${caveat.className} mt-6 -rotate-[1.4deg] text-[clamp(40px,5.4vw,82px)] font-semibold leading-[1.1] text-[#3d3934]`}>
              «En 6-åring kunne ha <span className="whitespace-nowrap">vibe-kodet</span> DigiHome.»
            </p>
          </div>
        </div>

        <footer className="flex items-end justify-between px-12 pb-10 md:px-20">
          <p className="text-[11.5px] tabular-nums tracking-wide text-[#c0bbb3]">02 / 0{ANTALL_SLIDES}</p>
          <p className={`text-[11.5px] text-[#c0bbb3] transition-opacity duration-500 ${bygg >= 1 ? 'opacity-0' : 'opacity-100'}`}>→ én til</p>
        </footer>
      </section>

      {/* ── Progresjonslinje — hårfin ── */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[2px] w-full bg-black/[0.04]">
        <div
          className="h-full bg-[#1a1917]/60 transition-all duration-700 ease-out"
          style={{ width: `${((steg + 1) / TOTALT) * 100}%` }}
          data-testid="bu-progresjon"
        />
      </div>

      {/* ── Fullskjerm-knapp (synlig ved musbevegelse) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); fullskjerm(); }}
        title="Fullskjerm (F)"
        aria-label="Fullskjerm"
        className={`absolute bottom-7 right-1/2 flex h-9 w-9 translate-x-1/2 items-center justify-center rounded-full border border-black/[0.06] bg-white/70 text-[#c0bbb3] shadow-[0_1px_2px_rgba(0,0,0,0.04)] backdrop-blur transition-all duration-300 hover:text-[#1a1917] ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Lokale inntreden-animasjoner (forsiden) */}
      <style jsx global>{`
        @keyframes buInn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bu-inn { opacity: 0; animation: buInn 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </main>
  );
}
