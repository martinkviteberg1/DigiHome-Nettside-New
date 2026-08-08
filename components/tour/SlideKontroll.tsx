'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// SlideKontroll — kontrollert slide-navigasjon for omvisningen (kun desktop).
// Én scrollgest = én slide. Hjulet låses mens overgangen pågår, og treghet
// etter sveip filtreres bort via akselerasjonsdeteksjon (etterslep har alltid
// fallende fart). Piltaster/PageUp/Down/mellomrom er alltid bevisste — de
// omgår hjullåsen helt og teller ved hvert trykk, også midt i en overgang.
// CSS-snappen i globals.css står som sikkerhetsnett for scrollbar-dragging.
// Mobil (<1024px) beholder fri, naturlig scroll.
// ---------------------------------------------------------------------------

const LAAS_MS = 900; // hvor lenge hjulet er låst etter et slide-bytte
const NY_GEST_PAUSE_MS = 200; // en tydelig pause regnes alltid som ny gest
const FLYTID_MS = 500; // så lenge regnes en programmatisk scroll som underveis

export default function SlideKontroll() {
  const laastHjul = useRef(false);
  const sistHjul = useRef(0);
  const forrigeFart = useRef(0);
  const aktiv = useRef(0); // intendert slide — sannheten, også midt i en overgang
  const sisteNav = useRef(0);

  useEffect(() => {
    document.documentElement.classList.add('dh-tour-snap');

    const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-slide]'));
    const erDesktop = () => window.matchMedia('(min-width: 1024px)').matches;

    // Sliden nærmest viewport-toppen. Bruker getBoundingClientRect (viewport-
    // relativ) fordi offsetTop måles mot nærmeste posisjonerte forelder og gir
    // feil verdier for slides nede i kapittel-gridene.
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

    // Synkroniser intendert slide med faktisk posisjon (etter scrollbar-drag,
    // prikk-klikk osv.) — men aldri midt i en pågående programmatisk scroll,
    // da ville vi lest en halvveis-posisjon og havnet én slide feil.
    const synk = () => {
      if (performance.now() - sisteNav.current > FLYTID_MS) {
        aktiv.current = naermeste();
      }
    };

    aktiv.current = naermeste();

    const gaaTil = (indeks: number) => {
      const maal = Math.max(0, Math.min(slides.length - 1, indeks));
      if (maal === aktiv.current) return; // ved kantene: ingen lås, ingen dødtid
      aktiv.current = maal;
      sisteNav.current = performance.now();
      laastHjul.current = true;
      slides[maal].scrollIntoView({ behavior: 'smooth' });
      window.setTimeout(() => {
        laastHjul.current = false;
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

      if (laastHjul.current) return;
      if (fart < 4) return; // mikrobevegelser — ignorer

      // Ny bevisst gest: tydelig pause siden sist, eller fart som holder seg /
      // øker. Treghet etter et sveip har alltid fallende fart.
      const nyGest = pause > NY_GEST_PAUSE_MS || fart >= forrige;
      if (!nyGest) return;

      synk();
      gaaTil(aktiv.current + (e.deltaY > 0 ? 1 : -1));
    };

    const paaTast = (e: KeyboardEvent) => {
      if (!erDesktop()) return;
      const ned = ['ArrowDown', 'PageDown', ' '];
      const opp = ['ArrowUp', 'PageUp'];
      if (!ned.includes(e.key) && !opp.includes(e.key)) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === ' ' && t && t.tagName === 'BUTTON') return; // mellomrom skal fortsatt klikke knapper
      e.preventDefault();
      if (e.repeat) return; // holdt tast skal ikke maskingevære gjennom omvisningen

      // Taster omgår hjullåsen: hvert trykk teller umiddelbart — også midt i
      // en overgang, der trykket retter seg mot neste slide derfra.
      synk();
      gaaTil(aktiv.current + (ned.includes(e.key) ? 1 : -1));
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
