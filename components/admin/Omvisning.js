'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   Omvisning — lett, egenbygd spotlight-tour (ingen tredjepartsbibliotek).

   · Scrim med utklippet «lommelykt» (box-shadow-trikset) som GLIR mellom mål
   · Rolig kort med tittel, én–to setninger, fremdriftsprikker og navigasjon
   · Tastatur: ← / → / Esc · respekterer prefers-reduced-motion
   · Mål re-måles ved resize/scroll — spotlighten følger elementet
   · Små skjermer (<640px): kortet legger seg som bunn-ark i stedet

   Steg-kontrakt:
     { id, tittel, tekst, maal: () => Element|null, foer?: async () => void }
   — `foer` kjøres FØR målingen (kan åpne menyer / aktivere scenario), og
     motoren venter tålmodig (opptil ~1,5 s) på at målet dukker opp i DOM.
     Steg hvis mål aldri dukker opp hoppes stille over.

   Avslutning: onFerdig(fullfort:boolean) — kalles både ved «Ferdig», «Hopp
   over» og Esc, slik at eieren kan rydde (nullstille scenario, lukke menyer)
   og persistere «sett»-status.
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

const PAD = 8;          // luft rundt målet i spotlighten
const KORT_BREDDE = 336; // px — kortets maksbredde på desktop

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

  // Tastatur: ← → Esc
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
    kortStil = { left: 12, right: 12, bottom: 12, position: 'fixed' };
  } else {
    const plassUnder = window.innerHeight - (boks.top + boks.height) > 220;
    const top = plassUnder ? boks.top + boks.height + 12 : undefined;
    const bottom = plassUnder ? undefined : window.innerHeight - boks.top + 12;
    const left = Math.max(12, Math.min(boks.left, window.innerWidth - KORT_BREDDE - 12));
    kortStil = { top, bottom, left, width: KORT_BREDDE, position: 'fixed' };
  }

  const anim = redusert ? 'none' : 'top 380ms cubic-bezier(.22,1,.36,1), left 380ms cubic-bezier(.22,1,.36,1), width 380ms cubic-bezier(.22,1,.36,1), height 380ms cubic-bezier(.22,1,.36,1)';

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
      {/* Spotlight: gjennomsiktig vindu + massiv skygge = dimmet resten av siden */}
      <div
        className="absolute rounded-[12px]"
        style={{
          top: boks.top, left: boks.left, width: boks.width, height: boks.height,
          boxShadow: '0 0 0 9999px rgba(20,17,14,0.52), inset 0 0 0 1.5px rgba(255,255,255,0.85), 0 0 0 4px rgba(139,92,246,0.28)',
          transition: anim,
          opacity: synlig ? 1 : 0,
        }}
      />

      {/* Kortet */}
      <div
        className="rounded-2xl bg-white p-4 shadow-[0_16px_60px_rgba(20,17,14,0.28)]"
        style={{ ...kortStil, transition: redusert ? 'none' : 'top 380ms cubic-bezier(.22,1,.36,1), bottom 380ms cubic-bezier(.22,1,.36,1), left 380ms cubic-bezier(.22,1,.36,1)', opacity: synlig ? 1 : 0 }}
        data-testid="omvisning-kort"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a8a29a]">
            {idx + 1} av {steg.length}
          </p>
          <button
            onClick={() => ferdig(false)}
            data-testid="omvisning-lukk"
            aria-label="Lukk omvisningen"
            className="-mr-1 -mt-1 flex h-6 w-6 items-center justify-center rounded-md text-[#b3ada3] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <h3 className="mt-1 text-[14.5px] font-semibold leading-snug text-[#1c1917]" data-testid="omvisning-tittel">{s.tittel}</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-[#78716c]">{s.tekst}</p>

        <div className="mt-3.5 flex items-center gap-1.5">
          {steg.map((x, i) => (
            <span key={x.id || i} className={`h-[5px] rounded-full transition-all duration-300 ${i === idx ? 'w-4 bg-[#8b5cf6]' : 'w-[5px] bg-black/[0.12]'}`} />
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => ferdig(false)}
              data-testid="omvisning-hopp-over"
              className="h-8 rounded-[8px] px-2.5 text-[12px] font-medium text-[#a8a29a] transition-colors hover:bg-[#f7f6f3] hover:text-[#57534e]"
            >
              Hopp over
            </button>
            {idx > 0 && (
              <button
                onClick={() => gaaTil(idx - 1, -1)}
                data-testid="omvisning-tilbake"
                aria-label="Forrige steg"
                className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-black/[0.08] text-[#57534e] transition-colors hover:bg-[#f7f6f3]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => (siste ? ferdig(true) : gaaTil(idx + 1, 1))}
              data-testid="omvisning-neste"
              className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[#141311] px-3.5 text-[12px] font-semibold text-white transition-all hover:bg-black active:scale-[0.98]"
            >
              {siste ? 'Ferdig' : 'Neste'}
              {!siste && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
