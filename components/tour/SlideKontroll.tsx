'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// SlideKontroll — kontrollert slide-navigasjon for omvisningen (kun desktop).
// Én scrollgest = én slide. Hjulet kapres og låses mens overgangen pågår, så
// det er umulig å fly forbi innhold. Treghet fra trackpad-sveip filtreres
// bort ved å kreve en tydelig pause før neste gest aksepteres. Piltaster,
// PageUp/Down og mellomrom fungerer som i en presentasjon. CSS-snappen i
// globals.css beholdes som sikkerhetsnett for scrollbar-dragging.
// Mobil (<1024px) beholder fri, naturlig scroll.
// ---------------------------------------------------------------------------

const LAAS_MS = 900; // hvor lenge hjulet er låst etter et slide-bytte
const NY_GEST_PAUSE_MS = 200; // en tydelig pause regnes alltid som ny gest

export default function SlideKontroll() {
  const laast = useRef(false);
  const sistHjul = useRef(0);
  const forrigeFart = useRef(0);

  useEffect(() => {
    document.documentElement.classList.add('dh-tour-snap');

    const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-slide]'));
    const erDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

    // Sliden nærmest viewport-toppen — alltid ferskt beregnet, så kontrolleren
    // holder seg i synk selv om brukeren har dratt i scrollbaren eller klikket
    // på en prikk. Bruker getBoundingClientRect (viewport-relativ) fordi
    // offsetTop måles mot nærmeste posisjonerte forelder og gir feil verdier
    // for slides som ligger nede i kapittel-gridene.
    const naermeste = () => {
      let best = 0;
      let minst = Infinity;
      slides.forEach((el, i) => {
        const avstand = Math.abs(el.getBoundingClientRect().top);
        if (avstand < minst) {
          minst = avstand;
          best = i;
        }
      });
      return best;
    };

    const gaaTil = (indeks: number) => {
      const maal = Math.max(0, Math.min(slides.length - 1, indeks));
      if (maal === naermeste()) return; // ved første/siste slide: ingen lås, ingen dødtid
      laast.current = true;
      slides[maal].scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => {
        laast.current = false;
      }, LAAS_MS);
    };

    const paaHjul = (e: WheelEvent) => {
      if (!erDesktop()) return;
      e.preventDefault();

      const naa = performance.now();
      const pause = naa - sistHjul.current;
      sistHjul.current = naa;

      const fart = Math.abs(e.deltaY);
      const forrige = forrigeFart.current;
      forrigeFart.current = fart;

      if (laast.current) return;
      if (fart < 4) return; // mikrobevegelser — ignorer

      // Ny bevisst gest: enten en tydelig pause siden sist, eller at farten
      // holder seg / øker. Treghet etter et sveip har alltid fallende fart,
      // så etterslep utløser ikke nye hopp — mens jevn, aktiv scrolling med
      // mus eller trackpad alltid slipper gjennom.
      const nyGest = pause > NY_GEST_PAUSE_MS || fart >= forrige;
      if (!nyGest) return;

      gaaTil(naermeste() + (e.deltaY > 0 ? 1 : -1));
    };

    const paaTast = (e: KeyboardEvent) => {
      if (!erDesktop()) return;
      const ned = ['ArrowDown', 'PageDown', ' '];
      const opp = ['ArrowUp', 'PageUp'];
      if (!ned.includes(e.key) && !opp.includes(e.key)) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(t.tagName)) return;
      e.preventDefault();
      if (laast.current) return;
      gaaTil(naermeste() + (ned.includes(e.key) ? 1 : -1));
    };

    window.addEventListener('wheel', paaHjul, { passive: false });
    window.addEventListener('keydown', paaTast);
    return () => {
      document.documentElement.classList.remove('dh-tour-snap');
      window.removeEventListener('wheel', paaHjul);
      window.removeEventListener('keydown', paaTast);
    };
  }, []);

  return null;
}
