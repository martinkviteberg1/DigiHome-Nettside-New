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
  const [un, setUn] = useState(5);
  const [idx, setIdx] = useState(0);
  const [t, setT] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
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
    <section ref={sectionRef} className="relative overflow-hidden py-20 sm:py-24">
      {/* svakt lavendel-lys oppe til høyre */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 46% 38% at 84% 0%, rgba(207,151,252,0.10), transparent 60%)',
        }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
        {/* seksjonshode */}
        <div className="max-w-2xl">
          <Reveal>
            <p className="flex items-center gap-3 text-xs uppercase tracking-[0.2em] font-semibold text-lavender">
              <span className="inline-block h-px w-7 bg-current opacity-50" />
              Autopiloten i praksis
            </p>
          </Reveal>
          <Reveal as="h2" delay={0.05} className="mt-4 text-[34px] sm:text-[48px] font-bold text-ink leading-[1.08]">
            Fra adresse til leie på konto.
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-5 text-lg text-quiet leading-relaxed max-w-xl">
              Følg de første ukene etter at du slår på autopiloten.
              Fire ting skjer — og du gjør ingen av dem.
            </p>
          </Reveal>
        </div>

        <div className="mt-10 lg:mt-12 grid lg:grid-cols-[0.92fr_1.08fr] gap-8 lg:gap-14 items-center">
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
                      ? 'bg-surface border-hairline shadow-[0_16px_44px_rgba(22,19,28,0.08)]'
                      : 'border-transparent hover:bg-fill/60'
                  }`}
                >
                  <div className="flex items-baseline gap-4">
                    <span className={`font-heading text-[13px] font-bold tracking-[0.08em] transition-colors duration-300 ${active ? 'text-lavender' : 'text-ink/25'}`}>
                      {c.no}
                    </span>
                    <span className={`flex-1 font-heading text-[17px] sm:text-lg font-bold leading-snug transition-colors duration-300 ${active ? 'text-ink' : 'text-ink/40 group-hover:text-ink/65'}`}>
                      {c.title}
                    </span>
                    <span className={`shrink-0 text-[10px] uppercase tracking-[0.18em] font-semibold transition-colors duration-300 ${active ? 'text-lavender' : 'text-ink/25'}`}>
                      {c.tag}
                    </span>
                  </div>
                  <div className="mt-3.5 relative h-[2px] w-full rounded-full bg-ink/[0.08] overflow-hidden">
                    <span
                      className="absolute left-0 top-0 h-full rounded-full"
                      style={{
                        width: `${pct.toFixed(1)}%`,
                        background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)',
                      }}
                    />
                  </div>
                  <div
                    className="grid"
                    style={{
                      gridTemplateRows: active ? '1fr' : '0fr',
                      transition: `grid-template-rows 0.55s ${EASE}`,
                    }}
                  >
                    <div className="overflow-hidden">
                      <p className={`pt-3 text-[15px] leading-relaxed transition-opacity duration-500 ${active ? 'opacity-100 text-quiet' : 'opacity-0'}`}>
                        {c.body}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* scenen — rett på lys bakgrunn, uten ramme (dag-modus) */}
          <div className="order-1 lg:order-2">
            <div
              ref={stageRef}
              className="relative w-full overflow-hidden"
              style={{
                '--u': `${un}px`,
                aspectRatio: '100 / 76',
              }}
            >
              {/* mykt scenelys bak elementene */}
              <div
                className="absolute inset-0"
                style={{ background: 'radial-gradient(ellipse 64% 52% at 50% 38%, rgba(155,91,214,0.05), transparent 68%)' }}
              />
              {/* kinematisk kamera: rolig zoom gjennom kapitlet */}
              <div
                key={ch.id}
                className="absolute inset-0"
                style={{
                  opacity: Math.min(1, t * 2.8).toFixed(2),
                  transform: `scale(${(1 + 0.04 * (t / ch.dur)).toFixed(4)})`,
                  transformOrigin: '50% 46%',
                }}
              >
                <Scene t={t} />
              </div>
              {/* telemetri-stripe */}
              <div className="absolute left-2 right-2 top-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_5px_rgba(24,121,78,0.5)]" />
                  <span className="text-[9px] uppercase tracking-[0.32em] font-semibold text-ink/35">
                    DigiHome Autopilot
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-[0.28em] font-semibold text-ink/45">
                  {ch.tag}
                </span>
              </div>
              {/* kapittel-indikator */}
              <div className="absolute left-2 bottom-2 flex items-baseline gap-1.5 text-[10px] uppercase tracking-[0.3em] font-semibold">
                <span className="text-ink/50">{ch.no}</span>
                <span className="text-ink/20">/ 04</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
