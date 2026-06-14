'use client';

/*
  Seksjon 2 — «Slik fungerer DigiHome» (scroll-drevet zoom-til-fullskjerm kino).
  ARKITEKTUR: en SVART boks (full-viewport, 100vw × 100svh) som skaleres fra
  hero-container-bredde til å dekke HELE skjermen. 16:9-film-scenen ligger sentrert
  INNI den svarte boksen (svart letterbox internt). Bakgrunnen rundt boksen er
  konstant lyst papir — så det ser ut som den svarte containeren bare EKSPANDERER
  til fullskjerm. Aldri grått, aldri lyse striper ved fullskjerm.

  Zoom-transformasjonen er FRAKOBLET React (imperativ 60fps DOM-skriving), mens
  film-scenene animerer på sin egen ~30fps-klokke — smue og uavhengig.
  Rører IKKE FilmScenes.js / render-pipelinen i /video.
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

/* zoom: skjer gjennom inn-scrollen, FERDIG fullskjerm nøyaktig ved pin */
const ZOOM_OFFSET = 1.0;    // p=0 når seksjonen så vidt entrer (secTop = vh)
const ZOOM_RANGE = 1.0;     // p=1 ved pin (secTop = 0)

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
function containerWidth(vw) {
  const pad = vw >= 1024 ? 128 : vw >= 640 ? 80 : 48;
  return Math.min(1400, Math.max(280, vw - pad));
}
/* startskala = container-bredde / viewport-bredde (boksen er 100vw bred) */
function startScale(vw) {
  return clamp(containerWidth(vw) / vw, 0.45, 0.97);
}

export function SeksjonFilm() {
  const trackRef = useRef(null);
  const boxRef = useRef(null);    // svart full-viewport boks (skaleres)
  const stageRef = useRef(null);  // 16:9 scene-flate inni boksen (--su)
  const [elapsed, setElapsed] = useState(0);
  const [active, setActive] = useState(false);
  const [reduce, setReduce] = useState(false);

  /* --su = 1% av 16:9-scenens layout-bredde (uavhengig av transform) */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty('--su', `${entry.contentRect.width / 100}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* prefers-reduced-motion + aktiv (bredt margin) */
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
    const box = boxRef.current;
    if (!box) return;
    const s0 = startScale(window.innerWidth);
    box.style.transform = `scale(${s0.toFixed(4)})`;
    box.style.borderRadius = '20px';
  }, []);

  /* ZOOM-LØKKE — imperativ, 60fps, FRAKOBLET React (kun den svarte boksen skaleres) */
  useEffect(() => {
    if (reduce) {
      const box = boxRef.current;
      if (box) { box.style.transform = 'none'; box.style.borderRadius = '0px'; box.style.boxShadow = 'none'; }
      return;
    }
    if (!active) return;
    let raf;
    const apply = () => {
      raf = requestAnimationFrame(apply);
      const track = trackRef.current, box = boxRef.current;
      if (!track || !box) return;
      const vh = window.innerHeight || 1;
      const vw = window.innerWidth || 1;
      const top = track.getBoundingClientRect().top;
      const p = clamp01((ZOOM_OFFSET * vh - top) / (ZOOM_RANGE * vh));
      const e = easeInOutCubic(p);
      const s0 = startScale(vw);
      const scale = s0 + (1 - s0) * e;
      box.style.transform = `scale(${scale.toFixed(4)})`;
      box.style.borderRadius = `${((1 - e) * 20).toFixed(1)}px`;
      const sh = 1 - e;
      box.style.boxShadow = sh > 0.01
        ? `0 ${(44 * sh).toFixed(0)}px ${(120 * sh).toFixed(0)}px rgba(20,16,40,${(0.32 * sh).toFixed(3)})`
        : 'none';
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
      {/* skjul scenenes kapittel-kicker («04 ANNONSE») kun her — /video uberørt */}
      <style>{`.dh-reel [data-dh-kicker]{display:none!important;}`}</style>

      {/* sticky-lag: konstant lyst papir bak den svarte boksen (matcher hero) */}
      <div
        className="sticky top-0 overflow-hidden flex items-center justify-center"
        style={{ height: '100svh', background: '#FEFBFA' }}
      >
        {/* SVART boks — full viewport, skaleres fra container-bredde til fullskjerm */}
        <div
          ref={boxRef}
          className="relative overflow-hidden flex items-center justify-center"
          style={{
            width: '100vw',
            height: '100svh',
            background: '#060607',
            willChange: 'transform',
            transformOrigin: 'center center',
          }}
        >
          {/* 16:9 scene-flate sentrert i den svarte boksen (svart letterbox internt) */}
          <div
            ref={stageRef}
            className="relative overflow-hidden"
            style={{
              width: 'min(100vw, calc(100svh * 1.7778))',
              height: 'min(100svh, calc(100vw * 0.5625))',
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
      </div>
    </section>
  );
}
