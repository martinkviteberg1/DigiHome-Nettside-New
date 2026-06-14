'use client';

/*
  Seksjon 2 — «Slik fungerer DigiHome» (scroll-drevet zoom-til-fullskjerm kino).
  VERDENSKLASSE-SØMLØSHET: zoom-transformasjonen er FRAKOBLET React og skrives
  direkte til DOM-en på 60fps (imperativt), mens film-scenene animerer på sin egen
  ~30fps-klokke. Dermed påvirkes aldri den smue zoom-bevegelsen av scene-rendering.
  Hvilemodus: 16:9-ramme i hero-container-bredde (max-w-shell), løftet nær heroen.
  Når du scroller vokser den jevnt (easeInOutCubic) ut til full-bleed fullskjerm
  (sticky pin), spiller de FAKTISKE film-scenene fra /video i loop, og slippes ut.
  Rører IKKE FilmScenes.js / render-pipelinen.
*/

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  SceneAnnonse, SceneVisning, SceneKontrakt, SceneDynamisk, SceneChat,
} from '@/components/video/FilmScenes';
import { Aurora, Bokeh, FilmGrain, LightSweep, Orb, clamp01, easeInOutCubic } from '@/components/video/filmUtils';

/* reel: scenenes interne tidsvinduer (sammenhengende, som i filmen) */
const REEL = [
  { C: SceneAnnonse,  a: 14,   b: 26.5 },
  { C: SceneVisning,  a: 26,   b: 38.5 },
  { C: SceneKontrakt, a: 38,   b: 49 },
  { C: SceneDynamisk, a: 48.5, b: 57.5 },
  { C: SceneChat,     a: 57.5, b: 68.5 },
];
const START = REEL[0].a;
const END = REEL[REEL.length - 1].b;
const SEAM = 1.0;
const FIRST_SPAN = END - START;
const LOOP_START = START + SEAM;
const LOOP_SPAN = END - LOOP_START;
const BOUNDARIES = [26, 38, 48.5, 57.5];

/* zoom: skjer gjennom hele inn-scrollen og er FERDIG nøyaktig ved pin
   (rammen vokser container-bredde -> fullskjerm idet seksjonen sentreres) */
const ZOOM_OFFSET = 1.0;    // p=0 når seksjonen så vidt entrer (secTop = vh)
const ZOOM_RANGE = 1.0;     // p=1 ved pin (secTop = 0) — tidligst mulig fullskjerm
const LIFT_VH = 0;          // ramme sentrert i hvile (rent, ingen hero-overlapp)

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function mixBg(p) {
  const t = clamp01(p);
  return `rgb(${Math.round(lerp(254, 6, t))},${Math.round(lerp(251, 6, t))},${Math.round(lerp(250, 7, t))})`;
}

function containerWidth(vw) {
  const pad = vw >= 1024 ? 128 : vw >= 640 ? 80 : 48;
  return Math.min(1400, Math.max(280, vw - pad));
}

export function SeksjonFilm() {
  const trackRef = useRef(null);
  const stickyRef = useRef(null);
  const zoomRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(false);
  const [reduce, setReduce] = useState(false);

  /* --su = 1% av layout-bredde (uavhengig av transform — ResizeObserver gir layout) */
  useEffect(() => {
    const el = zoomRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty('--su', `${entry.contentRect.width / 100}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* prefers-reduced-motion + aktiv (bredt margin slik at zoom-løkka er klar tidlig) */
  useEffect(() => {
    const r = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduce(r);
    const el = trackRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), {
      rootMargin: '40% 0px 40% 0px',
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* SETT initial transform før første paint (unngå fullskjerm-glimt) */
  useLayoutEffect(() => {
    const zoom = zoomRef.current;
    if (!zoom) return;
    const vw = window.innerWidth;
    const fullW = zoom.offsetWidth || vw;
    const s0 = clamp(containerWidth(vw) / fullW, 0.4, 0.96);
    const vh = window.innerHeight || 1;
    zoom.style.transform = `translateY(${(-LIFT_VH * vh / 100).toFixed(1)}px) scale(${s0.toFixed(4)})`;
    zoom.style.borderRadius = '22px';
    if (stickyRef.current) stickyRef.current.style.background = mixBg(0);
  }, []);

  /* ZOOM-LØKKE — imperativ, 60fps, FRAKOBLET React (smue, uavhengig av scener) */
  useEffect(() => {
    if (reduce) {
      const zoom = zoomRef.current;
      if (zoom) { zoom.style.transform = 'none'; zoom.style.borderRadius = '0px'; zoom.style.boxShadow = 'none'; }
      if (stickyRef.current) stickyRef.current.style.background = '#060607';
      return;
    }
    if (!active) return;
    let raf;
    const apply = () => {
      raf = requestAnimationFrame(apply);
      const track = trackRef.current, zoom = zoomRef.current, sticky = stickyRef.current;
      if (!track || !zoom) return;
      const vh = window.innerHeight || 1;
      const vw = window.innerWidth || 1;
      const top = track.getBoundingClientRect().top;
      const p = clamp01((ZOOM_OFFSET * vh - top) / (ZOOM_RANGE * vh));
      const e = easeInOutCubic(p);
      const fullW = zoom.offsetWidth || vw;
      const s0 = clamp(containerWidth(vw) / fullW, 0.4, 0.96);
      const scale = s0 + (1 - s0) * e;
      const ty = (-LIFT_VH * (1 - e) * vh) / 100;
      zoom.style.transform = `translateY(${ty.toFixed(1)}px) scale(${scale.toFixed(4)})`;
      zoom.style.borderRadius = `${((1 - e) * 22).toFixed(1)}px`;
      const sh = 1 - e;
      zoom.style.boxShadow = sh > 0.01
        ? `0 ${(44 * sh).toFixed(0)}px ${(120 * sh).toFixed(0)}px rgba(20,16,40,${(0.3 * sh).toFixed(3)})`
        : 'none';
      if (sticky) {
        // mørkne TIDLIG: ferdig kinosvart før rammen blir stor, så letterbox-striper
        // alltid er svarte (aldri grå). Den korte overgangen skjer mens seksjonen
        // så vidt entrer nedenfra (rammen er under viewporten) — usynlig.
        const bgT = clamp01((p - 0.06) / 0.30);
        sticky.style.background = mixBg(bgT);
      }
    };
    raf = requestAnimationFrame(apply);
    return () => cancelAnimationFrame(raf);
  }, [active, reduce]);

  /* FILMKLOKKE — ~30fps, kun når aktiv (scene-rendering, frakoblet zoom) */
  useEffect(() => {
    if (reduce || !active) return;
    let raf, last = performance.now(), acc = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last; last = now; acc += dt;
      if (acc < 33) return;
      const step = Math.min(acc, 100) / 1000; acc = 0;
      setElapsed((eP) => eP + step);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, reduce]);

  /* elapsed -> filmtid T (sømløs loop) */
  let T;
  if (reduce) T = 22;
  else if (elapsed < FIRST_SPAN) T = START + elapsed;
  else T = LOOP_START + ((elapsed - FIRST_SPAN) % LOOP_SPAN);
  const seamP = END - T < SEAM ? clamp01(1 - (END - T) / SEAM) : 0;

  return (
    <section ref={trackRef} className="dh-reel relative" style={{ height: reduce ? '100svh' : '175vh' }}>
      {/* skjul scenenes kapittel-kicker («04 ANNONSE») kun her — /video uberørt; tuck under heroens tomme bunn på store skjermer */}
      <style>{`.dh-reel [data-dh-kicker]{display:none!important;}`}</style>

      <div
        ref={stickyRef}
        className="sticky top-0 overflow-hidden flex items-center justify-center"
        style={{ height: '100svh', background: '#FEFBFA' }}
      >
        <div
          ref={zoomRef}
          className="relative overflow-hidden"
          style={{
            width: 'min(100vw, calc(100svh * 1.7778))',
            height: 'min(100svh, calc(100vw * 0.5625))',
            background: '#060607',
            willChange: 'transform',
            '--su': '9px',
          }}
        >
          {/* bakteppe — aurora-mesh + bokeh-dybde + vignett (som i filmen) */}
          <Aurora t={T} opacity={0.14} />
          <Bokeh t={T} opacity={1} />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at 50% 42%, transparent 52%, rgba(0,0,0,0.5) 100%)' }}
          />

          {/* scener — originale film-scener, crossfadet via Shell */}
          {REEL.map(({ C, a, b }, i) =>
            T >= a - 0.06 && T <= b + 0.06 ? <C key={i} t={T} /> : null
          )}
          {seamP > 0 && <SceneAnnonse t={START + seamP * SEAM} />}

          {/* lys-sveip ved aktskifter */}
          <LightSweep t={T} boundaries={BOUNDARIES} />
          {/* diskret motor-orb i hjørnet */}
          <div className="absolute pointer-events-none" style={{ top: 'calc(var(--su) * 2.3)', right: 'calc(var(--su) * 2.1)', opacity: 0.55 }}>
            <Orb t={T} size="calc(var(--su) * 4)" speed={8} />
          </div>
          {/* filmkorn */}
          <FilmGrain t={T} opacity={0.05} />
        </div>
      </div>
    </section>
  );
}
