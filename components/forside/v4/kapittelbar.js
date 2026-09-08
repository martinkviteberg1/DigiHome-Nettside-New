'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { EASE, T } from './tokens';

/* ---------------------------------------------------------------------------
   Kapittelbaren i hovednavbaren.

   Når produktseksjonens kapittelbar ellers ville festet seg under navbaren
   («meny på meny»), publiserer ProduktSeksjon kapitlene hit — og NavV4 bytter
   ut menylenkene sine med dem: én linje, lokal navigasjon når det er relevant.
   Utenfor seksjonen: null → vanlig nav. Liten ekstern kilde (ingen context,
   ingen re-render av treet i mellom).
--------------------------------------------------------------------------- */

let tilstand = null;
const lyttere = new Set();

export function settKapittelbar(neste) {
  tilstand = neste;
  lyttere.forEach((f) => f());
}

function abonner(f) { lyttere.add(f); return () => lyttere.delete(f); }
const les = () => tilstand;
const lesServer = () => null;

export function useKapittelbar() {
  return useSyncExternalStore(abonner, les, lesServer);
}

/* ---------------------------------------------------------------------------
   Kapittelpille — kapitlene som en segmentert kontroll (én pille per kapittel i en rolig skinne).
   Det aktive kapittelet har en hvit pille som fylles med en svak lilla tone i takt med filmen — fremdriften er
   i selve knappen, ikke en strek under. Kapitlene som er ferdige står i full farge, de som kommer litt dempet.
   Brukes både i navbaren (tema 'nav') og i seksjonens egen bar (tema 'lys' / 'mork', over foto).
--------------------------------------------------------------------------- */
const TEMAER = {
  nav:  { skinne: 'rgba(21,19,15,0.06)',    pille: '#FFFFFF',                 pilleSkygge: '0 1px 2px rgba(21,19,15,0.08), 0 6px 18px -12px rgba(21,19,15,0.35)', aktivTekst: T.ink, tekst: 'rgba(21,19,15,0.62)', ferdig: 'rgba(21,19,15,0.86)', dempet: 'rgba(21,19,15,0.30)', hover: 'rgba(21,19,15,0.05)', fyll: 'rgba(155,109,255,0.20)', indeks: 'rgba(21,19,15,0.40)' },
  lys:  { skinne: 'rgba(21,19,15,0.07)',    pille: '#FFFFFF',                 pilleSkygge: '0 1px 2px rgba(21,19,15,0.08), 0 8px 22px -14px rgba(21,19,15,0.45)', aktivTekst: T.ink, tekst: 'rgba(21,19,15,0.66)', ferdig: 'rgba(21,19,15,0.88)', dempet: 'rgba(21,19,15,0.32)', hover: 'rgba(21,19,15,0.05)', fyll: 'rgba(155,109,255,0.20)', indeks: 'rgba(21,19,15,0.40)' },
  mork: { skinne: 'rgba(244,241,234,0.12)', pille: 'rgba(244,241,234,0.97)', pilleSkygge: '0 8px 24px -14px rgba(0,0,0,0.55)', aktivTekst: T.ink, tekst: 'rgba(244,241,234,0.72)', ferdig: 'rgba(244,241,234,0.92)', dempet: 'rgba(244,241,234,0.34)', hover: 'rgba(244,241,234,0.08)', fyll: 'rgba(155,109,255,0.26)', indeks: 'rgba(244,241,234,0.5)' },
};

export function Kapittelpille({ tabs, aktiv, frem, kapitler, velg, tema = 'lys', kompakt = false, className = '', testid = 'v4-kapittelpille' }) {
  const f = TEMAER[tema] || TEMAER.lys;
  const aktivIdx = kapitler.indexOf(aktiv);
  /* Den hvite pillen er ETT element som glir mellom kapitlene (left/width), ikke en bakgrunn som hopper fra knapp til
     knapp. Måles fra den aktive knappen; måles på nytt når skinnen endrer størrelse (fonter, vindu). */
  const skinneRef = useRef(null);
  const knappRef = useRef({});
  const [m, setM] = useState(null);
  useEffect(() => {
    const maal = () => {
      const b = knappRef.current[aktiv];
      if (!b) return;
      setM({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight });
    };
    maal();
    const el = skinneRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && el ? new ResizeObserver(maal) : null;
    if (ro && el) ro.observe(el);
    return () => ro?.disconnect();
  }, [aktiv, tabs.length, kompakt]);
  const andel = Math.round((frem?.andel || 0) * 1000) / 10;
  return (
    <div ref={skinneRef} role="tablist" aria-label="Kapitler" className={`relative inline-flex max-w-full items-center rounded-full ${kompakt ? 'gap-0.5 p-[3px]' : 'gap-1 p-1'} ${className}`} style={{ background: f.skinne }} data-testid={testid} data-aktiv={aktiv}>
      {m && (
        <span aria-hidden="true" className="absolute overflow-hidden rounded-full" style={{ left: m.x, top: m.y, width: m.w, height: m.h, background: f.pille, boxShadow: f.pilleSkygge, transition: `left 480ms ${EASE}, width 480ms ${EASE}`, willChange: 'left, width' }} data-testid={`${testid}-markor`}>
          {/* Fremdriften: pillen fylles fra venstre i takt med filmen */}
          <span className="absolute inset-y-0 left-0" style={{ width: `${andel}%`, background: f.fyll, transition: frem?.ms ? `width ${frem.ms}ms linear` : `width 320ms ${EASE}` }} data-testid={`${testid}-fremdrift`} />
        </span>
      )}
      {tabs.map((t, i) => {
        const er = t.id === aktiv;
        const idx = kapitler.indexOf(t.id);
        const ferdig = t.klar && idx > -1 && idx < aktivIdx;
        return (
          <button
            key={t.id}
            ref={(el) => { knappRef.current[t.id] = el; }}
            type="button"
            role="tab"
            aria-selected={er}
            aria-disabled={!t.klar}
            onClick={() => { if (t.klar) velg(t.id); }}
            className={`group relative z-[1] flex min-w-0 shrink items-center justify-center overflow-hidden rounded-full font-medium tracking-[-0.005em] transition-[background-color,color] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 ${kompakt ? 'h-8 px-2.5 text-[12.5px]' : 'h-9 px-3.5 text-[14px] lg:px-4'} ${t.klar ? '' : 'cursor-default'}`}
            style={{ background: er && !m ? f.pille : 'transparent', color: er ? f.aktivTekst : ferdig ? f.ferdig : t.klar ? f.tekst : f.dempet }}
            onMouseEnter={(e) => { if (!er && t.klar) e.currentTarget.style.background = f.hover; }}
            onMouseLeave={(e) => { if (!er) e.currentTarget.style.background = 'transparent'; }}
            data-testid={`${testid}-${t.id}`}
          >
            <span className="relative flex items-baseline gap-1.5 whitespace-nowrap">
              {!kompakt && <span className="hidden text-[10.5px] tabular-nums lg:inline" style={{ color: er ? T.lilla : f.indeks, transition: `color 300ms ${EASE}` }}>0{i + 1}</span>}
              <span className="truncate">{t.navn}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
