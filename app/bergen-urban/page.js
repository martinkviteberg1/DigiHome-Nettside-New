'use client';

/* ═══════════════════ Bergen Urban — presentasjonsdeck (lys) ═══════════════════
   Moderne, redaksjonelt scenedeck i DigiHomes lyse designspråk: varmt papir,
   dot-grid, lavendel-glød, chip-badges og hairline-metarad.
   Navigasjon: → / mellomrom / PageDown (klikker) = neste steg,
   ← / PageUp = forrige, F = fullskjerm, Home/End = start/slutt.
   Slide 2 har «builds»: påstand 1 vises først — neste tastetrykk avslører
   påstand 2 i 6-årings-håndskrift. Musepekeren skjules etter 2,5 s ro. */

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
      className={`relative h-dvh w-full select-none overflow-hidden bg-[#f7f6f3] font-body text-[#0a0a0a] ${musSynlig ? '' : 'cursor-none'}`}
      data-testid="bu-deck"
    >
      {/* ── Bakgrunn: varmt papir + dot-grid + lavendel-glød ── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(28,25,23,0.06) 1px, transparent 1px)', backgroundSize: '26px 26px' }}
        />
        <div className="absolute -top-[28%] right-[-12%] h-[72vh] w-[56vw] rounded-full bg-[#d298ff] opacity-[0.17] blur-[130px]" />
        <div className="absolute bottom-[-32%] left-[-14%] h-[62vh] w-[50vw] rounded-full bg-[#7c3aed] opacity-[0.07] blur-[140px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/[0.07] to-transparent" />
      </div>

      {/* ═══ SLIDE 1 — Forside (redaksjonell, venstrestilt) ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-700 ease-out ${slide === 0 ? 'pointer-events-auto translate-y-0 opacity-100 blur-0' : 'pointer-events-none -translate-y-8 opacity-0 blur-[6px]'}`}
        data-testid="bu-slide-1"
      >
        {/* Toppbar */}
        <header className="flex items-center justify-between px-10 pt-9 md:px-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-6 w-auto md:h-7" />
          <span className="flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-1.5 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7c3aed] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
            </span>
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#57534e]">Bergen Urban</span>
          </span>
        </header>

        {/* Midtparti — venstrestilt display-typografi */}
        <div className="flex flex-1 flex-col justify-center px-10 md:px-20">
          <p className="bu-inn text-[11.5px] font-bold uppercase tracking-[0.3em] text-[#7c3aed] md:text-[13px]" style={{ animationDelay: '150ms' }}>
            Et foredrag om å bygge programvare med AI
          </p>
          <h1
            className="bu-inn mt-6 font-heading text-[clamp(58px,10.5vw,150px)] font-bold leading-[0.98] tracking-[-0.045em]"
            style={{ animationDelay: '330ms' }}
          >
            Vibe coding
            <br />
            <span className="bg-gradient-to-r from-[#7c3aed] via-[#9d5cf0] to-[#c084fc] bg-clip-text text-transparent">i praksis</span>
          </h1>
          <p className="bu-inn mt-8 max-w-[520px] text-[clamp(15px,1.6vw,20px)] leading-relaxed text-[#78716c]" style={{ animationDelay: '560ms' }}>
            Historien om hvordan DigiHome ble til
          </p>
        </div>

        {/* Metarad — hairlines og mikroetiketter */}
        <footer className="bu-inn px-10 pb-9 md:px-20" style={{ animationDelay: '780ms' }}>
          <div className="flex items-end justify-between gap-8 border-t border-black/[0.08] pt-6">
            <div className="grid grid-cols-2 gap-x-14 gap-y-4 md:grid-cols-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8a29a]">Foredragsholder</p>
                <p className="mt-1.5 text-[15px] font-semibold tracking-tight">Martin Kviteberg</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8a29a]">Selskap</p>
                <p className="mt-1.5 text-[15px] font-semibold tracking-tight">DigiHome · Bergen</p>
              </div>
              <div className="hidden md:block">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8a29a]">Arena</p>
                <p className="mt-1.5 text-[15px] font-semibold tracking-tight">Bergen Urban</p>
              </div>
            </div>
            <p className={`mb-0.5 flex shrink-0 items-center gap-2 text-[12px] text-[#a8a29a] transition-opacity duration-500 ${harNavigert ? 'opacity-0' : 'opacity-100'}`}>
              Bruk piltastene
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-black/10 bg-white text-[#57534e] shadow-sm">→</span>
            </p>
          </div>
        </footer>
      </section>

      {/* ═══ SLIDE 2 — Paradoks-hook ═══ */}
      <section
        className={`absolute inset-0 flex flex-col transition-[opacity,transform,filter] duration-700 ease-out ${slide === 1 ? 'pointer-events-auto translate-y-0 opacity-100 blur-0' : 'pointer-events-none translate-y-8 opacity-0 blur-[6px]'}`}
        data-testid="bu-slide-2"
      >
        {/* Diskret toppbar for kontinuitet */}
        <header className="flex items-center justify-between px-10 pt-9 md:px-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-5 w-auto opacity-40" />
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#a8a29a]">Bergen Urban</p>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-8 md:px-14">
          {/* Påstand 1 — dempes elegant når påstand 2 kommer */}
          <div className={`max-w-[1120px] text-center transition-all duration-700 ease-out ${bygg >= 1 ? '-translate-y-2 scale-[0.93] opacity-50' : 'translate-y-0 scale-100 opacity-100'}`}>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-white/80 py-1.5 pl-1.5 pr-4 shadow-sm backdrop-blur">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7c3aed] text-[10.5px] font-bold text-white">01</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#57534e]">Sann påstand</span>
            </span>
            <h2 className="mt-7 font-heading text-[clamp(32px,4.9vw,68px)] font-bold leading-[1.12] tracking-[-0.03em]" data-testid="bu-paastand-1">
              DigiHome er blant verdens mest avanserte{' '}
              <span className="whitespace-nowrap bg-gradient-to-r from-[#7c3aed] to-[#b16ef2] bg-clip-text text-transparent">vibe-kodede</span>{' '}
              applikasjoner.
            </h2>
          </div>

          {/* Påstand 2 — 6-åringens fargestift */}
          <div
            className={`mt-12 max-w-[960px] text-center transition-all duration-700 ease-out md:mt-14 ${bygg >= 1 ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-10 opacity-0'}`}
            data-testid="bu-paastand-2"
          >
            <span className="inline-flex items-center gap-2.5 rounded-full border border-[#d97706]/20 bg-[#fef7ea] py-1.5 pl-1.5 pr-4 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d97706] text-[10.5px] font-bold text-white">02</span>
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#b45309]">Sann påstand</span>
            </span>
            <p className={`${caveat.className} mt-6 -rotate-[1.8deg] text-[clamp(38px,5.6vw,84px)] font-semibold leading-[1.12] text-[#d97706]`}>
              «En 6-åring kunne ha <span className="whitespace-nowrap">vibe-kodet</span> DigiHome.»
            </p>
            {/* Håndtegnet strek under */}
            <svg viewBox="0 0 420 14" className="mx-auto mt-3 h-[11px] w-[min(440px,58%)] -rotate-[1.8deg] text-[#d97706]/60" fill="none" aria-hidden>
              <path d="M4 9 C 80 3, 150 12, 220 7 S 360 4, 416 8" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <footer className="flex items-end justify-between px-10 pb-9 md:px-20">
          <p className="text-[12px] tabular-nums text-[#a8a29a]">02 — {String(ANTALL_SLIDES).padStart(2, '0')}</p>
          <p className={`text-[12px] text-[#a8a29a] transition-opacity duration-500 ${bygg >= 1 ? 'opacity-0' : 'opacity-100'}`}>→ én til</p>
        </footer>
      </section>

      {/* ── Progresjonslinje ── */}
      <div className="pointer-events-none absolute bottom-0 left-0 h-[2.5px] w-full bg-black/[0.05]">
        <div
          className="h-full bg-gradient-to-r from-[#7c3aed] to-[#c084fc] transition-all duration-500 ease-out"
          style={{ width: `${((steg + 1) / TOTALT) * 100}%` }}
          data-testid="bu-progresjon"
        />
      </div>

      {/* ── Fullskjerm-knapp (synlig ved musbevegelse) ── */}
      <button
        onClick={(e) => { e.stopPropagation(); fullskjerm(); }}
        title="Fullskjerm (F)"
        aria-label="Fullskjerm"
        className={`absolute bottom-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] bg-white/80 text-[#a8a29a] shadow-sm backdrop-blur transition-all duration-300 hover:text-[#0a0a0a] ${musSynlig ? 'opacity-100' : 'opacity-0'}`}
        data-testid="bu-fullskjerm"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      </button>

      {/* Lokale inntreden-animasjoner (forsiden) */}
      <style jsx global>{`
        @keyframes buInn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .bu-inn { opacity: 0; animation: buInn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </main>
  );
}
