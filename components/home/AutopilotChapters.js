'use client';

/*
  AutopilotChapters — «Autopiloten i praksis».
  Tab-basert autoanimasjon: seksjonen kjører seg selv (på autopilot),
  men brukeren kan ta over ved å klikke på et kapittel.
  Story-progressbarer à la Instagram viser fremdriften.
*/

import { useEffect, useRef, useState } from 'react';
import { Reveal } from '@/components/site/Reveal';
import { SceneAnnonse, ScenePris, SceneLeietaker, SceneHverdag } from './ChapterScenes';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';

const CHAPTERS = [
  {
    id: 'annonse', no: '01', tag: 'Dag 1',
    title: 'Annonsen skriver seg selv',
    body: 'Profesjonelle bilder og tekst, publisert på Finn, Airbnb og Hybel. Live på timer — ikke uker.',
    dur: 8.5, Scene: SceneAnnonse,
  },
  {
    id: 'pris', no: '02', tag: 'Uke 1',
    title: 'Prisen kalibreres mot markedet',
    body: 'Autopiloten leser Bergen-markedet kontinuerlig og låser prisen som maksimerer inntekten din.',
    dur: 8.0, Scene: ScenePris,
  },
  {
    id: 'leietaker', no: '03', tag: 'Dag 14',
    title: 'Leietakeren verifiseres grundig',
    body: 'BankID, inntekt og referanser sjekkes på hver eneste søker. Du møter aldri en tilfeldig leietaker.',
    dur: 8.5, Scene: SceneLeietaker,
  },
  {
    id: 'hverdag', no: '04', tag: 'Hver måned',
    title: 'Hverdagen håndterer vi',
    body: 'Lekkasjer, visninger og purringer fanges lydløst. Det eneste du merker, er leien som kommer inn.',
    dur: 9.5, Scene: SceneHverdag,
  },
];

export function AutopilotChapters() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const tiltRef = useRef(null);
  const [un, setUn] = useState(5);
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  /* pointer-parallax: scenen lener seg umerkelig mot pekeren (dag-versjon av heroens tilt) */
  useEffect(() => {
    const zone = sectionRef.current;
    const inner = tiltRef.current;
    if (!zone || !inner) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const st = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, hover: false };
    const step = () => {
      st.cx += (st.tx - st.cx) * 0.055;
      st.cy += (st.ty - st.cy) * 0.055;
      inner.style.transform = `rotateX(${(-st.cy * 2.2).toFixed(3)}deg) rotateY(${(st.cx * 2.8).toFixed(3)}deg)`;
      if (st.hover || Math.abs(st.tx - st.cx) + Math.abs(st.ty - st.cy) > 0.001) {
        st.raf = requestAnimationFrame(step);
      } else {
        st.raf = 0;
      }
    };
    const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const r = zone.getBoundingClientRect();
      st.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      st.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      st.hover = true;
      kick();
    };
    const onLeave = () => { st.tx = 0; st.ty = 0; st.hover = false; kick(); };
    zone.addEventListener('pointermove', onMove, { passive: true });
    zone.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      if (st.raf) cancelAnimationFrame(st.raf);
    };
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.22 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setUn(el.clientWidth / 100));
    ro.observe(el);
    setUn(el.clientWidth / 100);
    return () => ro.disconnect();
  }, []);

  /* tidslinjen: kjører kapitlet, hopper videre når det er ferdig */
  useEffect(() => {
    if (reduce) {
      setT(CHAPTERS[idx].dur); // statisk sluttbilde
      return;
    }
    if (!inView) return;
    let raf;
    const t0 = performance.now();
    const dur = CHAPTERS[idx].dur;
    const tick = (now) => {
      const tt = (now - t0) / 1000;
      if (tt >= dur + 0.05) {
        setT(0);
        setIdx((i) => (i + 1) % CHAPTERS.length);
        return;
      }
      setT(Math.min(tt, dur));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [idx, inView, reduce]);

  const select = (i) => {
    if (i === idx) return;
    setT(0);
    setIdx(i);
  };

  const ch = CHAPTERS[idx];
  const Scene = ch.Scene;

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-24 sm:py-28 text-white" style={{ background: '#14121A' }}>
      {/* romskifte fra heroen: myk søm ned i grafitt */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-44"
        style={{ background: 'linear-gradient(180deg, rgba(5,5,7,0.65), transparent)' }}
      />
      {/* studiolys */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 52% 40% at 78% 0%, rgba(155,91,214,0.10), transparent 60%), radial-gradient(ellipse 46% 38% at 6% 100%, rgba(120,110,160,0.06), transparent 60%)',
        }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
        {/* seksjonshode */}
        <div className="max-w-2xl">
          <Reveal>
            <p className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-semibold text-[#CF97FC]">
              <span className="inline-block h-px w-7 bg-current opacity-50" />
              Autopiloten i praksis
            </p>
          </Reveal>
          <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold leading-[1.08] text-white">
            Fra adresse til leie på konto.
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg text-white/55 leading-relaxed max-w-xl">
              Følg de første ukene etter at du slår på autopiloten.
              Fire ting skjer — og du gjør ingen av dem.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 lg:mt-12 grid lg:grid-cols-[0.85fr_1.15fr] gap-8 lg:gap-12 items-center">
          {/* kapittel-tabs */}
          <div className="order-2 lg:order-1 flex flex-col gap-2.5" role="tablist" aria-label="Kapitler">
            {CHAPTERS.map((c, i) => {
              const active = i === idx;
              const pct = active ? (t / c.dur) * 100 : i < idx ? 100 : 0;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => select(i)}
                  className={`group w-full text-left rounded-2xl px-5 py-4 border transition-all duration-300 ${
                    active
                      ? 'bg-white/[0.05] border-white/[0.12] shadow-[0_18px_44px_rgba(0,0,0,0.35)]'
                      : 'border-transparent hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-baseline gap-4">
                    <span className={`font-heading text-[13px] font-bold tracking-[0.08em] transition-colors duration-300 ${active ? 'text-[#CF97FC]' : 'text-white/25'}`}>
                      {c.no}
                    </span>
                    <span className={`flex-1 font-heading text-[17px] sm:text-lg font-bold leading-snug transition-colors duration-300 ${active ? 'text-white' : 'text-white/40 group-hover:text-white/65'}`}>
                      {c.title}
                    </span>
                    {i < idx && (
                      <span className="inline-flex h-4 w-4 shrink-0 translate-y-0.5 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-[9px] leading-none text-emerald-300">
                        ✓
                      </span>
                    )}
                    <span className={`shrink-0 text-[10px] uppercase tracking-[0.18em] font-semibold transition-colors duration-300 ${active ? 'text-[#CF97FC]/90' : 'text-white/25'}`}>
                      {c.tag}
                    </span>
                  </div>
                  {active && (
                    <div className="mt-3.5 relative h-[2px] w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <span
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{
                          width: `${pct.toFixed(1)}%`,
                          background: 'linear-gradient(90deg, #CF97FC, rgba(253,252,251,0.7))',
                        }}
                      />
                    </div>
                  )}
                  <div
                    className="grid"
                    style={{
                      gridTemplateRows: active ? '1fr' : '0fr',
                      transition: `grid-template-rows 0.55s ${EASE}`,
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className={`pt-3 text-[15px] leading-relaxed transition-opacity duration-500 ${active ? 'opacity-100 text-white/55' : 'opacity-0'}`}>
                        {c.body}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* scenen — rett på lys bakgrunn, uten ramme (dag-modus) */}
          <div className="order-1 lg:order-2" style={{ perspective: '1300px' }}>
            <div ref={tiltRef} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
            <div
              ref={stageRef}
              className="relative w-full overflow-hidden"
              style={{
                '--u': `${un}px`,
                aspectRatio: '100 / 76',
              }}
            >
              {/* studiolys bak scenen */}
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 34%, rgba(155,91,214,0.08), transparent 66%)' }}
              />
              {/* gulvet — horisont + bakkeglød (scene-anatomi som består mellom kapitler) */}
              <div
                className="absolute pointer-events-none"
                style={{ left: '8%', right: '8%', top: '66.4%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(235,232,245,0.16), transparent)' }}
              />
              <div
                className="absolute pointer-events-none"
                style={{ left: '20%', right: '20%', top: '58%', height: '17%', background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(207,151,252,0.08), transparent 70%)' }}
              />
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(180deg, transparent 66.5%, rgba(0,0,0,0.16) 100%)' }}
              />
              {/* kinematisk kamera: rolig zoom gjennom kapitlet */}
              <div
                key={ch.id}
                className="absolute inset-0"
                style={{
                  opacity: Math.min(1, t * 2.8).toFixed(2),
                  transform: `scale(${(1.07 + 0.04 * (t / ch.dur)).toFixed(4)})`,
                  transformOrigin: '50% 46%',
                }}
              >
                <Scene t={t} />
              </div>
              {/* telemetri-stripe */}
              <div className="absolute left-2 right-2 top-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
                  <span className="text-[9px] uppercase tracking-[0.32em] font-semibold text-white/35">
                    DigiHome Autopilot
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.28em] font-semibold text-white/45">
                  {ch.tag}
                </span>
              </div>
              {/* kapittel-indikator */}
              <div className="absolute left-2 bottom-2 flex items-baseline gap-1.5 text-[10px] uppercase tracking-[0.3em] font-semibold">
                <span className="text-white/50">{ch.no}</span>
                <span className="text-white/20">/ 04</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
