'use client';

import React, { useEffect, useRef } from 'react';

/* ---------------------------------------------------------------------------
   HeroZoom — scenen vokser til fullskjerm når du scroller.

   Ikke «kamera zoomer inn på mannen», men «kortet blir hele scenen». Scenen
   rendres hele tiden i fullskjermstørrelse (bredden på siden × 100svh − nav)
   og beskjæres med clip-path til kortstørrelsen du kjenner (maks 1600 bred,
   1.92:1, 24 px radius). Når seksjonen pinner seg under navbaren, åpnes
   beskjæringen rolig mot kantene — marginene forsvinner, radiusen går mot 0 —
   og rommet avdekkes i stedet for å forstørres. Utvidelsen skjer mens kortet
   stiger, og er fullført nøyaktig når rammen pinner seg under navbaren (aldri
   tom canvas under kortet). Så står scenen stille et stykke (historien på
   veggen og telefonen spiller på tid), før den slipper og neste seksjon kommer.

   Én hovedbevegelse. Ingen parallax, ingen bildeskala. clip-path er komposi-
   tert — ingen layout per frame. Verdiene skrives rett til CSS-variabler
   (--dh-ix, --dh-iy, --dh-r) på rammen; HeroStage leser dem i zoom-modus.
   Navbaren står (sticky top = 64 px).
--------------------------------------------------------------------------- */

const NAV = 64;            // høyden på navbaren (lg)
const HOLD = 0.6;          // hvor lenge scenen står i fullskjerm før den slipper (andel av viewport-høyden)
const KORT_MAKS_B = 1600;  // som dagens kort
const KORT_MARG = 32;      // sidemarg ved p = 0 (lg: calc(100% − 64px))
const ASPEKT = 1.92;
const RADIUS = 24;

const glatt = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const klem = (v, a, b) => Math.min(b, Math.max(a, v));

export default function HeroZoom({ children }) {
  const wrap = useRef(null);
  const ramme = useRef(null);

  useEffect(() => {
    const w = wrap.current; const r = ramme.current;
    if (!w || !r) return undefined;
    let raf = 0;
    const mal = () => {
      raf = 0;
      const vh = window.innerHeight; const bw = w.clientWidth; const bh = vh - NAV;
      /* Utvidelsen skjer mens kortet stiger: p = 0 øverst på siden, p = 1 nøyaktig når rammen låser seg under
         navbaren. Da fyller scenen alltid det som ellers ville vært tom canvas under kortet — og følger fingeren. */
      const rect = w.getBoundingClientRect();
      const dokTopp = rect.top + window.scrollY;            // rammens plass i dokumentet
      const D = Math.max(240, dokTopp - NAV);               // scroll-lengden fram til pinning (= høyden på tekstblokken over)
      const p = glatt(klem(window.scrollY / D, 0, 1));
      /* Kortet ved p = 0 — samme geometri som dagens scene */
      const cw0 = Math.min(KORT_MAKS_B, bw - 2 * KORT_MARG);
      const ch0 = Math.min(cw0 / ASPEKT, 880, bh - 48);
      const ix0 = (bw - cw0) / 2; const iy0 = (bh - ch0) / 2;
      r.style.setProperty('--dh-ix', `${(ix0 * (1 - p)).toFixed(1)}px`);
      r.style.setProperty('--dh-iy', `${(iy0 * (1 - p)).toFixed(1)}px`);
      r.style.setProperty('--dh-r', `${(RADIUS * (1 - p)).toFixed(1)}px`);
      r.style.setProperty('--dh-p', p.toFixed(3));
      r.dataset.p = p >= 0.999 ? 'full' : p <= 0.001 ? 'kort' : 'mellom';
    };
    const be = () => { if (!raf) raf = window.requestAnimationFrame(mal); };
    mal();
    window.addEventListener('scroll', be, { passive: true });
    window.addEventListener('resize', be);
    return () => { window.removeEventListener('scroll', be); window.removeEventListener('resize', be); if (raf) window.cancelAnimationFrame(raf); };
  }, []);

  /* Under lg: vanlig kort i flyten (samme klasser som stage). Fra lg: høy seksjon → sticky ramme → scenen. */
  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[1600px] px-4 pb-6 sm:px-8 lg:h-[var(--dh-zoom-h)] lg:max-w-none lg:px-0 lg:pb-0" style={{ '--dh-zoom-h': `calc(${100 + Math.round(HOLD * 100)}svh - ${NAV}px)` }} data-testid="v4-herozoom">
      <div className="lg:sticky lg:top-[64px] lg:h-[calc(100svh-64px)]">
        <div ref={ramme} className="relative lg:absolute lg:inset-0" style={{ '--dh-ix': '0px', '--dh-iy': '0px', '--dh-r': '0px', '--dh-p': 0 }} data-testid="v4-herozoom-ramme">
          {children}
        </div>
      </div>
    </div>
  );
}
