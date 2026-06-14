'use client';

/*
  Seksjon 2 — «Slik fungerer DigiHome» (kino-reel).
  En verdensklasse, auto-spillende kinoblokk som GJENBRUKER de faktiske
  film-scenene fra /video (SceneAnnonse → Visning → Kontrakt → Dynamisk → Chat).
  Scenene er sammenhengende i tid (akkurat som i filmen), så én kontinuerlig
  klokke spiller dem sømløst med originale crossfades. Looper med en seam-ghost
  for helt sømløs runde. Spiller kun når seksjonen er i view (IntersectionObserver)
  og pauser ute av view. Rører IKKE FilmScenes.js eller render-pipelinen i /video.
*/

import { useEffect, useRef, useState } from 'react';
import {
  SceneAnnonse, SceneVisning, SceneKontrakt, SceneDynamisk, SceneChat,
} from '@/components/video/FilmScenes';
import { Aurora, Bokeh, FilmGrain, LightSweep, Orb, clamp01 } from '@/components/video/filmUtils';

/* reel: scenenes interne tidsvinduer (sammenhengende, som i filmen) */
const REEL = [
  { C: SceneAnnonse,  a: 14,   b: 26.5, label: 'Annonse' },
  { C: SceneVisning,  a: 26,   b: 38.5, label: 'Visninger' },
  { C: SceneKontrakt, a: 38,   b: 49,   label: 'Kontrakt' },
  { C: SceneDynamisk, a: 48.5, b: 57.5, label: 'Inntekt' },
  { C: SceneChat,     a: 57.5, b: 68.5, label: 'Svar 24/7' },
];
const START = REEL[0].a;                  // 14
const END = REEL[REEL.length - 1].b;      // 68.5
const SEAM = 1.0;                         // loop-crossfade (s)
const FIRST_SPAN = END - START;           // 54.5 — første runde (ren fade-inn)
const LOOP_START = START + SEAM;          // 15 — etterfølgende runder starter her
const LOOP_SPAN = END - LOOP_START;       // 53.5
const BOUNDARIES = [26, 38, 48.5, 57.5];  // aktskifter — lys-sveip
const STAGE_W = 'min(94vw, calc((100svh - 150px) * 1.7778))';

export function SeksjonFilm() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);

  /* stage-enhet --su = 1% av scenebredde (nøyaktig som i filmen) */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty('--su', `${entry.contentRect.width / 100}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* prefers-reduced-motion + in-view (observerer selve scenen for best timing) */
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* hovedklokke — ~30fps, kun når i view (sparer hovedtråden) */
  useEffect(() => {
    if (reduce || !inView) return;
    let raf, last = performance.now(), acc = 0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = now - last; last = now; acc += dt;
      if (acc < 32) return; // ~30 fps
      const step = Math.min(acc, 100) / 1000; acc = 0; // tak p\u00e5 0.1s \u2014 unng\u00e5 hopp ved frame-drops
      setElapsed((p) => p + step);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce]);

  /* elapsed -> filmtid T (sømløs loop) */
  let T;
  if (reduce) T = 22;                                   // statisk, pent komponert bilde
  else if (elapsed < FIRST_SPAN) T = START + elapsed;   // første runde: ren fade-inn fra sort
  else T = LOOP_START + ((elapsed - FIRST_SPAN) % LOOP_SPAN);

  /* loop-seam: Annonse pre-fade for sømløs runde (krysser Chats fade-ut) */
  const seamP = END - T < SEAM ? clamp01(1 - (END - T) / SEAM) : 0;

  return (
    <section ref={sectionRef} className="dh-reel relative bg-[#060607] overflow-hidden">
      {/* skjul scenenes kapittel-kicker («04 ANNONSE») kun her — /video er uberørt */}
      <style>{`.dh-reel [data-dh-kicker]{display:none!important;}`}</style>

      {/* overgang inn — «dim til kino»: varmt papir → lavendel-skumring → kinosvart */}
      <div
        aria-hidden="true"
        className="relative w-full"
        style={{
          height: 'clamp(170px, 26vh, 320px)',
          background:
            'linear-gradient(180deg,#FEFBFA 0%,#F4EDF6 15%,#C9B6E0 35%,#5A4A7C 56%,#1C1530 79%,#060607 100%)',
        }}
      >
        {/* skjerm-glød som siver oppover fra kinoen */}
        <div
          className="absolute inset-x-0 bottom-0 pointer-events-none"
          style={{
            height: '78%',
            background:
              'radial-gradient(ellipse 58% 100% at 50% 132%, rgba(155,91,214,0.26), rgba(207,151,252,0.10) 42%, transparent 72%)',
          }}
        />
      </div>

      {/* sentrert kino-scene */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-8 pb-16 pt-2" style={{ minHeight: '100svh' }}>
        <div
          ref={stageRef}
          className="relative overflow-hidden"
          style={{
            width: STAGE_W,
            aspectRatio: '16 / 9',
            background: '#060607',
            borderRadius: 'clamp(14px, 1.4vw, 24px)',
            boxShadow: '0 60px 140px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
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
          {/* loop-seam: Annonse pre-fade */}
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
