'use client';

import React, { useEffect, useRef } from 'react';

/* ---------------------------------------------------------------------------
   HeroZoom — scenen vokser til fullskjerm når du scroller.

   Ikke «kamera zoomer inn på mannen», men «kortet blir hele scenen». Scenen
   rendres hele tiden i fullskjermstørrelse (bredden på siden × 100svh − nav)
   og beskjæres med clip-path til kortstørrelsen du kjenner (maks 1600 bred,
   1.92:1, 24 px radius). Utvidelsen skjer mens kortet stiger, og er fullført
   nøyaktig når rammen pinner seg under navbaren — aldri tom canvas under
   kortet. Så står scenen stille et stykke (historien på veggen og telefonen
   spiller på tid), før den slipper og neste seksjon kommer.

   Silkemykt: scroll-hendelser kommer i hakk (mus, touchpad). Den viste
   fremdriften glir mot målet hver frame (kritisk dempet lerp) — bevegelsen
   er kontinuerlig uansett hvordan det scrolles, og stopper mykt. Rommet får
   én mikroskala (1.04 → 1.00) mens beskjæringen åpnes: det «setter seg»,
   ikke zoomer. Én hovedbevegelse. clip-path/transform er kompositert — ingen
   layout per frame. Verdiene skrives rett til CSS-variabler på rammen
   (--dh-ix, --dh-iy, --dh-r, --dh-s, --dh-p); HeroStage leser dem i zoom-modus.
   Navbaren står (sticky top = 64 px).
--------------------------------------------------------------------------- */

const NAV = 64;            // høyden på navbaren (lg)
const HOLD = 0.5;          // hvor lenge scenen står i fullskjerm før den slipper (andel av viewport-høyden)
const KORT_MAKS_B = 1600;  // som dagens kort
const KORT_MARG = 32;      // sidemarg ved p = 0 (lg: calc(100% − 64px))
const ASPEKT = 1.92;
const RADIUS = 24;
const SKALA0 = 1.04;       // rommet står så vidt inne i kortet, og setter seg når scenen blir hel
const GLATTING = 0.14;     // andel av avstanden til målet per frame (~60 fps → ~0,3 s settling)

const klem = (v, a, b) => Math.min(b, Math.max(a, v));
/* Mykt inn, mykt ut — men nær lineært i midten, så bevegelsen følger fingeren */
const kurve = (t) => t * t * (3 - 2 * t);

/* fullskjerm: scenen går helt opp under navbaren (sticky top 0, 100svh). Når den er hel og pinnet, får <html>
   klassen dh-nav-klar — navbaren slipper bakgrunnen (globals.css) og rommet fyller virkelig hele skjermen. Når scenen
   slipper og siden går videre, kommer navbaren tilbake. */
export default function HeroZoom({ children, fullskjerm = false }) {
  const wrap = useRef(null);
  const ramme = useRef(null);

  useEffect(() => {
    const w = wrap.current; const r = ramme.current;
    if (!w || !r) return undefined;
    const redusert = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0; let vist = -1; let maal = 0; let sist = 0;

    const topp = fullskjerm ? 0 : NAV;
    const skriv = (p) => {
      const vh = window.innerHeight; const bw = w.clientWidth; const bh = vh - topp;
      const cw0 = Math.min(KORT_MAKS_B, bw - 2 * KORT_MARG);
      const ch0 = Math.min(cw0 / ASPEKT, 880, bh - 48);
      const ix0 = (bw - cw0) / 2; const iy0 = (bh - ch0) / 2;
      const e = kurve(p);
      r.style.setProperty('--dh-ix', `${(ix0 * (1 - e)).toFixed(2)}px`);
      r.style.setProperty('--dh-iy', `${(iy0 * (1 - e)).toFixed(2)}px`);
      r.style.setProperty('--dh-r', `${(RADIUS * (1 - e)).toFixed(2)}px`);
      r.style.setProperty('--dh-s', (SKALA0 - (SKALA0 - 1) * e).toFixed(4));
      r.style.setProperty('--dh-p', e.toFixed(3));
      r.dataset.p = e >= 0.999 ? 'full' : e <= 0.001 ? 'kort' : 'mellom';
      if (fullskjerm) {
        /* Hel og fortsatt pinnet (rammens bunn står i bunnen av skjermen) → navbaren slipper bakgrunnen */
        const rect = w.getBoundingClientRect();
        const klar = e >= 0.96 && rect.bottom >= vh - 2;
        document.documentElement.classList.toggle('dh-nav-klar', klar);
      }
    };
    const maalNaa = () => {
      const rect = w.getBoundingClientRect();
      const dokTopp = rect.top + window.scrollY;            // rammens plass i dokumentet
      const D = Math.max(240, dokTopp - topp);              // scroll-lengden fram til pinning (= tekstblokken over)
      return klem(window.scrollY / D, 0, 1);
    };
    /* Én løkke: glir mot målet, stopper når vi er der. Startes av scroll/resize, ikke kontinuerlig. */
    const steg = (t) => {
      raf = 0;
      const dt = sist ? Math.min(48, t - sist) : 16.7; sist = t;
      const k = 1 - Math.pow(1 - GLATTING, dt / 16.7);   // tidsnøytral glatting
      maal = maalNaa();
      const diff = maal - vist;
      if (redusert || Math.abs(diff) < 0.0006) { vist = maal; skriv(vist); sist = 0; return; }
      vist += diff * k;
      skriv(vist);
      raf = window.requestAnimationFrame(steg);
    };
    const be = () => { if (!raf) raf = window.requestAnimationFrame(steg); };
    vist = maalNaa(); skriv(vist);                          // første bilde uten glid (ingen «hopp» ved lasting)
    window.addEventListener('scroll', be, { passive: true });
    window.addEventListener('resize', be);
    return () => { window.removeEventListener('scroll', be); window.removeEventListener('resize', be); if (raf) window.cancelAnimationFrame(raf); document.documentElement.classList.remove('dh-nav-klar'); };
  }, [fullskjerm]);

  /* Under lg: vanlig kort i flyten (samme klasser som stage). Fra lg: høy seksjon → sticky ramme → scenen.
     lg:mb-28 = luft før neste seksjon når scenen slipper. */
  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[1600px] px-4 pb-6 sm:px-8 lg:mb-28 lg:h-[var(--dh-zoom-h)] lg:max-w-none lg:px-0 lg:pb-0" style={{ '--dh-zoom-h': `calc(${100 + Math.round(HOLD * 100)}svh - ${fullskjerm ? 0 : NAV}px)` }} data-testid="v4-herozoom" data-fullskjerm={fullskjerm ? '1' : '0'}>
      <div className={fullskjerm ? 'lg:sticky lg:top-0 lg:h-[100svh]' : 'lg:sticky lg:top-[64px] lg:h-[calc(100svh-64px)]'}>
        {/* Standardverdiene = kortet ved p = 0, regnet i ren CSS — så første bilde (SSR, før effekten) er identisk med
            det scriptet skriver. Ingen blink fra fullskjerm til kort ved lasting. */}
        <div ref={ramme} className="relative lg:absolute lg:inset-0" style={{ '--dh-ix': 'max(32px, calc((100vw - 1600px) / 2))', '--dh-iy': fullskjerm ? 'calc((100svh - min(calc(min(1600px, 100vw - 64px) / 1.92), 880px, calc(100svh - 48px))) / 2)' : 'calc((100svh - 64px - min(calc(min(1600px, 100vw - 64px) / 1.92), 880px, calc(100svh - 112px))) / 2)', '--dh-r': '24px', '--dh-s': 1.04, '--dh-p': 0 }} data-testid="v4-herozoom-ramme">
          {children}
        </div>
      </div>
    </div>
  );
}
