'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// SlideKontroll — kontrollert slide-navigasjon for omvisningen (kun desktop).
// Én scrollgest = én slide. Selve overgangen kjøres som en egen rAF-animasjon
// med ease-out; CSS-snappen kobles ut mens den flyr (html.dh-tour-flyt), slik
// at nettleserens snap aldri kjemper mot programmatisk scroll — det var
// kilden til hakkingen med native scrollIntoView. Piltaster i alle retninger
// (opp/ned/venstre/høyre), PageUp/Down og mellomrom er alltid bevisste: de
// teller ved hvert trykk, også midt i en overgang, og animasjonen fortsetter
// da sømløst fra nåværende posisjon mot det nye målet.
// Treghet etter sveip filtreres bort via akselerasjonsdeteksjon (etterslep
// har alltid fallende fart). Mobil (<1024px) beholder fri, naturlig scroll.
// ---------------------------------------------------------------------------

const ANIM_MS = 680; // varigheten på slide-overgangen
const ETTERLAAS_MS = 220; // hjulet holdes låst en anelse etter landing
const NY_GEST_PAUSE_MS = 200; // en tydelig pause regnes alltid som ny gest

export default function SlideKontroll() {
  const laastHjul = useRef(false);
  const sistHjul = useRef(0);
  const forrigeFart = useRef(0);
  const aktiv = useRef(0); // intendert slide — sannheten, også midt i en overgang
  const flyr = useRef(false);
  const rafId = useRef(0);
  const opplaasTimer = useRef(0);

  useEffect(() => {
    document.documentElement.classList.add('dh-tour-snap');

    const slides = Array.from(document.querySelectorAll<HTMLElement>('[data-slide]'));
    const erDesktop = () => window.matchMedia('(min-width: 1024px)').matches;
    const rolig = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    // prikk-klikk osv.) — men aldri mens vår egen animasjon flyr, da ville vi
    // lest en halvveis-posisjon og havnet én slide feil.
    const synk = () => {
      if (!flyr.current) aktiv.current = naermeste();
    };

    aktiv.current = naermeste();

    const landet = () => {
      flyr.current = false;
      document.documentElement.classList.remove('dh-tour-flyt');
      window.clearTimeout(opplaasTimer.current);
      opplaasTimer.current = window.setTimeout(() => {
        laastHjul.current = false;
      }, ETTERLAAS_MS);
    };

    const gaaTil = (indeks: number) => {
      const maal = Math.max(0, Math.min(slides.length - 1, indeks));
      if (maal === aktiv.current) return; // ved kantene: ingen lås, ingen dødtid
      aktiv.current = maal;
      laastHjul.current = true;
      flyr.current = true;
      window.cancelAnimationFrame(rafId.current);
      window.clearTimeout(opplaasTimer.current);
      document.documentElement.classList.add('dh-tour-flyt'); // snap av under flyturen

      const fra = window.scrollY;
      const til = slides[maal].getBoundingClientRect().top + window.scrollY;
      if (rolig()) {
        window.scrollTo(0, til);
        landet();
        return;
      }
      const t0 = performance.now();
      const steg = (naa: number) => {
        const p = Math.min(1, (naa - t0) / ANIM_MS);
        const e = 1 - Math.pow(1 - p, 4); // ease-out — responsiv start, myk landing
        window.scrollTo(0, fra + (til - fra) * e);
        if (p < 1) rafId.current = window.requestAnimationFrame(steg);
        else landet();
      };
      rafId.current = window.requestAnimationFrame(steg);
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
      const ned = ['ArrowDown', 'ArrowRight', 'PageDown', ' '];
      const opp = ['ArrowUp', 'ArrowLeft', 'PageUp'];
      if (!ned.includes(e.key) && !opp.includes(e.key)) return;
      const t = e.target as HTMLElement | null;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === ' ' && t && t.tagName === 'BUTTON') return; // mellomrom skal fortsatt klikke knapper
      e.preventDefault();
      if (e.repeat) return; // holdt tast skal ikke maskingevære gjennom omvisningen

      // Taster omgår hjullåsen: hvert trykk teller umiddelbart — også midt i
      // en overgang, der animasjonen glir videre mot neste slide derfra.
      synk();
      gaaTil(aktiv.current + (ned.includes(e.key) ? 1 : -1));
    };

    window.addEventListener('wheel', paaHjul, { passive: false });
    window.addEventListener('keydown', paaTast);
    return () => {
      document.documentElement.classList.remove('dh-tour-snap');
      document.documentElement.classList.remove('dh-tour-flyt');
      window.removeEventListener('wheel', paaHjul);
      window.removeEventListener('keydown', paaTast);
      window.cancelAnimationFrame(rafId.current);
      window.clearTimeout(opplaasTimer.current);
    };
  }, []);

  return null;
}
