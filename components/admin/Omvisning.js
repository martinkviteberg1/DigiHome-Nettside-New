'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   Omvisning — lett, egenbygd spotlight-tour (ingen tredjepartsbibliotek).

   · Scrim med utklippet «lommelykt» (box-shadow-trikset) som GLIR mellom mål,
     med en rolig pulserende merkevare-ring rundt målet
   · Glass-kort (blur) med steg-chip, klikkbar segmentert fremdriftslinje,
     per-steg entrance-animasjon og tastaturhint
   · Tastatur: ← / → / Enter / Esc · respekterer prefers-reduced-motion
   · Mål re-måles ved resize/scroll — spotlighten følger elementet
   · Små skjermer (<640px): kortet legger seg som bunn-ark med håndtak

   Steg-kontrakt (uendret):
     { id, tittel, tekst, maal: () => Element|null, foer?: async () => void }
   — `foer` kjøres FØR målingen (kan åpne menyer / aktivere scenario), og
     motoren venter tålmodig (opptil ~1,5 s) på at målet dukker opp i DOM.
     Steg hvis mål aldri dukker opp hoppes stille over.

   Avslutning: onFerdig(fullfort:boolean) — kalles både ved «Ferdig», «Hopp
   over» og Esc, slik at eieren kan rydde og persistere «sett»-status.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';

const PAD = 8;           // luft rundt målet i spotlighten
const KORT_BREDDE = 364; // px — kortets maksbredde på desktop

function maalRect(el) {
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(4, r.top - PAD),
    left: Math.max(4, r.left - PAD),
    width: Math.min(window.innerWidth - 8, r.width + PAD * 2),
    height: r.height + PAD * 2,
  };
}

// Vent på at målet finnes og har utstrekning (menyer trenger et par frames).
async function ventPaaMaal(finn, maksMs = 1500) {
  const start = Date.now();
  for (;;) {
    const el = typeof finn === 'function' ? finn() : null;
    if (el && el.getBoundingClientRect().width > 0) return el;
    if (Date.now() - start > maksMs) return null;
    await new Promise((r) => setTimeout(r, 80));
  }
}

export default function Omvisning({ steg = [], aktiv = false, onFerdig }) {
  const [idx, setIdx] = useState(0);
  const [boks, setBoks] = useState(null);      // spotlight-rekt (viewport-koordinater)
  const [synlig, setSynlig] = useState(false); // fade-in etter første måling
  const elRef = useRef(null);                  // aktivt mål-element (for re-måling)
  const bytterRef = useRef(false);             // hindrer dobbeltklikk under stegbytte
  const redusert = typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  const ferdig = useCallback((fullfort) => {
    setSynlig(false);
    setBoks(null);
    setIdx(0);
    elRef.current = null;
    onFerdig?.(fullfort);
  }, [onFerdig]);

  // Gå til steg i (hopper stille over steg uten mål — begge retninger).
  const gaaTil = useCallback(async (i, retning) => {
    if (bytterRef.current) return;
    bytterRef.current = true;
    try {
      let j = i;
      while (j >= 0 && j < steg.length) {
        const s = steg[j];
        try { await s.foer?.(); } catch (e) { /* foer er best effort */ }
        const el = await ventPaaMaal(s.maal);
        if (el) {
          el.scrollIntoView({ block: 'center', behavior: redusert ? 'auto' : 'smooth' });
          await new Promise((r) => setTimeout(r, redusert ? 60 : 320));
          elRef.current = el;
          setIdx(j);
          setBoks(maalRect(el));
          setSynlig(true);
          return;
        }
        j += retning; // målet finnes ikke → prøv neste i samme retning
      }
      ferdig(retning > 0); // gikk forbi siste steg = fullført; forbi første = avbrutt
    } finally {
      bytterRef.current = false;
    }
  }, [steg, ferdig, redusert]);

  // Start/stopp
  useEffect(() => {
    if (aktiv) gaaTil(0, 1);
    else { setSynlig(false); setBoks(null); setIdx(0); elRef.current = null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktiv]);

  // Følg målet ved resize/scroll (rAF-throttlet)
  useEffect(() => {
    if (!aktiv) return undefined;
    let raf = 0;
    const oppdater = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = elRef.current;
        if (el && document.contains(el)) setBoks(maalRect(el));
      });
    };
    window.addEventListener('resize', oppdater);
    window.addEventListener('scroll', oppdater, true);
    return () => {
      window.removeEventListener('resize', oppdater);
      window.removeEventListener('scroll', oppdater, true);
      cancelAnimationFrame(raf);
    };
  }, [aktiv]);

  // Tastatur: ← → Enter Esc
  useEffect(() => {
    if (!aktiv) return undefined;
    const paaTast = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); ferdig(false); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); gaaTil(idx + 1, 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); gaaTil(idx - 1, -1); }
    };
    window.addEventListener('keydown', paaTast, true);
    return () => window.removeEventListener('keydown', paaTast, true);
  }, [aktiv, idx, gaaTil, ferdig]);

  if (!aktiv || !boks) return null;

  const s = steg[idx] || {};
  const siste = idx === steg.length - 1;
  const smal = typeof window !== 'undefined' && window.innerWidth < 640;

  // Kortplassering: under målet om det er plass, ellers over — klemt inn i viewport.
  let kortStil;
  if (smal) {
    kortStil = { left: 10, right: 10, bottom: 10, position: 'fixed' };
  } else {
    const plassUnder = window.innerHeight - (boks.top + boks.height) > 240;
    const top = plassUnder ? boks.top + boks.height + 14 : undefined;
    const bottom = plassUnder ? undefined : window.innerHeight - boks.top + 14;
    const left = Math.max(12, Math.min(boks.left, window.innerWidth - KORT_BREDDE - 12));
    kortStil = { top, bottom, left, width: KORT_BREDDE, position: 'fixed' };
  }

  const fart = 'cubic-bezier(.22,1,.36,1)';
  const anim = redusert ? 'none' : `top 380ms ${fart}, left 380ms ${fart}, width 380ms ${fart}, height 380ms ${fart}`;

  return (
    <div
      className="fixed inset-0 z-[80]"
      data-testid="omvisning"
      role="dialog"
      aria-modal="true"
      aria-label="Omvisning"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <style>{`
        @keyframes omvInn { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes omvPuls {
          0%, 100% { box-shadow: 0 0 0 4px rgba(139,92,246,0.32), 0 0 24px 2px rgba(139,92,246,0.18); }
          50%      { box-shadow: 0 0 0 8px rgba(139,92,246,0.14), 0 0 32px 6px rgba(139,92,246,0.10); }
        }
      `}</style>

      {/* Spotlight: gjennomsiktig vindu + massiv skygge = dimmet resten av siden */}
      <div
        className="absolute rounded-[14px]"
        style={{
          top: boks.top, left: boks.left, width: boks.width, height: boks.height,
          boxShadow: '0 0 0 9999px rgba(16,12,22,0.55), inset 0 0 0 1.5px rgba(255,255,255,0.9)',
          transition: anim,
          opacity: synlig ? 1 : 0,
        }}
      />
      {/* Pulserende merkevare-ring — egen node så scrim-skyggen ikke repaintes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-[14px]"
        style={{
          top: boks.top, left: boks.left, width: boks.width, height: boks.height,
          transition: anim,
          opacity: synlig ? 1 : 0,
          animation: redusert ? 'none' : 'omvPuls 2.4s ease-in-out infinite',
        }}
      />

      {/* Kortet — glass, myk skygge, glir mellom posisjoner */}
      <div
        className={`bg-white/95 shadow-[0_24px_80px_-16px_rgba(20,17,14,0.42)] ring-1 ring-black/[0.05] backdrop-blur-xl ${smal ? 'rounded-[22px] p-4 pb-3' : 'rounded-[20px] p-5 pb-4'}`}
        style={{ ...kortStil, transition: redusert ? 'none' : `top 380ms ${fart}, bottom 380ms ${fart}, left 380ms ${fart}`, opacity: synlig ? 1 : 0 }}
        data-testid="omvisning-kort"
      >
        {smal && <span aria-hidden="true" className="mx-auto mb-3 block h-1 w-10 rounded-full bg-black/[0.12]" />}

        {/* Innholdet re-animeres per steg */}
        <div key={idx} style={{ animation: redusert ? 'none' : `omvInn 340ms ${fart}` }}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0eafc] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.09em] text-[#6d28d9]">
              Omvisning · {idx + 1} av {steg.length}
            </span>
            <button
              onClick={() => ferdig(false)}
              data-testid="omvisning-lukk"
              aria-label="Lukk omvisningen"
              className="-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <h3 className="mt-2.5 text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-[#1c1917]" data-testid="omvisning-tittel">{s.tittel}</h3>
          <p className="mt-1.5 text-[13px] leading-[1.65] text-[#6f6a63]">{s.tekst}</p>
        </div>

        {/* Klikkbar segmentert fremdrift */}
        <div className="mt-4 flex items-center gap-1" role="tablist" aria-label="Steg i omvisningen">
          {steg.map((x, i) => (
            <button
              key={x.id || i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              aria-label={`Gå til steg ${i + 1}`}
              onClick={() => { if (i !== idx) gaaTil(i, i > idx ? 1 : -1); }}
              className="group flex-1 py-1.5"
            >
              <span className={`block h-[4px] rounded-full transition-all duration-300 ${i <= idx ? 'bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9]' : 'bg-black/[0.08] group-hover:bg-black/[0.18]'}`} />
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            onClick={() => ferdig(false)}
            data-testid="omvisning-hopp-over"
            className="h-9 rounded-full px-3 text-[12px] font-medium text-[#a8a29a] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"
          >
            Hopp over
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            {idx > 0 && (
              <button
                onClick={() => gaaTil(idx - 1, -1)}
                data-testid="omvisning-tilbake"
                aria-label="Forrige steg"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.08] text-[#57534e] transition-colors hover:border-black/20 hover:bg-[#f7f6f3]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => (siste ? ferdig(true) : gaaTil(idx + 1, 1))}
              data-testid="omvisning-neste"
              className={`flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-semibold text-white transition-all active:scale-[0.97] ${siste ? 'bg-[#6d28d9] shadow-[0_6px_20px_rgba(109,40,217,0.35)] hover:bg-[#5b21b6]' : 'bg-[#141311] hover:bg-black'}`}
            >
              {siste ? 'Ferdig' : 'Neste'}
              {siste ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {!smal && (
          <p className="mt-3 border-t border-black/[0.05] pt-2.5 text-center text-[10.5px] tracking-wide text-[#c2bcb2]">
            ← → for å navigere · Esc for å lukke
          </p>
        )}
      </div>
    </div>
  );
}
