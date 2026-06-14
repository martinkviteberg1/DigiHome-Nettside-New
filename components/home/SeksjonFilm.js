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

  /* prefers-reduced-motion + in-view */
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.3 });
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

  /* aktiv scene + fremdrift (for navigasjon) */
  let activeIdx = 0;
  for (let i = 0; i < REEL.length; i++) {
    if (T >= REEL[i].a - 0.001) activeIdx = i;
  }
  const activeFrac = clamp01((T - REEL[activeIdx].a) / (REEL[activeIdx].b - REEL[activeIdx].a));

  /* loop-seam: Annonse pre-fade for sMømløs runde (krysser Chats fade-ut) */
  const seamP = END - T < SEAM ? clamp01(1 - (END - T) / SEAM) : 0;

  /* hopp til kapittel */
  const seek = (i) => {
    const targetT = REEL[i].a + 0.02;
    if (targetT >= LOOP_START) setElapsed(FIRST_SPAN + (targetT - LOOP_START));
    else setElapsed(targetT - START);
  };

  return (
    <section ref={sectionRef} className="relative bg-[#060607] overflow-hidden" style={{ minHeight: '100svh' }}>
      {/* eyebrow */}
      <div className="absolute top-0 left-0 right-0 z-20 pointer-events-none">
        <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16 pt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/40">
            Slik fungerer DigiHome
          </p>
        </div>
      </div>

      {/* sentrert kino-scene */}
      <div className="flex flex-col items-center justify-center px-4 sm:px-8 py-20" style={{ minHeight: '100svh' }}>
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

        {/* kapittel-navigasjon */}
        <div className="mt-8 w-full" style={{ maxWidth: STAGE_W }}>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {REEL.map((s, i) => {
              const active = i === activeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => seek(i)}
                  className="group flex items-center gap-2 outline-none"
                  aria-label={`Gå til ${s.label}`}
                >
                  <span
                    className="relative h-1 overflow-hidden rounded-full transition-all duration-300"
                    style={{ width: active ? 40 : 20, background: 'rgba(255,255,255,0.16)' }}
                  >
                    {active && (
                      <span
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{ width: `${(activeFrac * 100).toFixed(0)}%`, background: 'linear-gradient(90deg,#9B5BD6,#CF97FC)' }}
                      />
                    )}
                  </span>
                  <span
                    className={`hidden sm:inline text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors ${active ? 'text-white/85' : 'text-white/35 group-hover:text-white/60'}`}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
