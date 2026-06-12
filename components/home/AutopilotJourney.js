'use client';

/*
  AutopilotJourney — «De første 30 dagene».
  Et scroll-drevet kinoformat: seksjonen er én sammenhengende filmsekvens
  hvor scrollen er tidslinjen. Sticky 100svh-scene inne i en 620vh-container.

  Struktur (master-fremdrift p 0–1):
    0.000–0.085  Åpning   — «Du sier ja. Autopiloten gjør resten.»
    0.085–0.295  DAG 1    — Annonsen skriver seg selv
    0.295–0.500  DAG 4    — Prisen finner seg selv
    0.500–0.705  DAG 14   — Leietakeren kvalitetssikres
    0.705–0.880  DAG 30   — Leien er på konto
    0.880–1.000  Finale   — «Din innsats: 0 minutter.» + CTA

  Sømløs hero-overgang: bakgrunnen er identisk med heroens (#050507), og
  åpningsteksten toner inn allerede mens scenen glir opp over heroen (pre-fase).
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Play } from 'lucide-react';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic, easeOutQuint,
} from '@/components/video/filmUtils';
import {
  SceneAnnonse, ScenePris, SceneLeietaker, SceneUtbetaling,
} from './JourneyScenes';

const A0 = 0.085;
const B1 = 0.88;

const CHAPTERS = [
  {
    id: 'annonse', day: '1', kicker: 'Annonsen',
    title: 'Annonsen skriver seg selv.',
    body: 'Profesjonelle bilder, ferdig tekst og publisering på Finn, Airbnb og Hybel. Live på timer — ikke uker.',
    a: 0.085, b: 0.295, align: 'left', lx: 72, ly: 30, Scene: SceneAnnonse,
  },
  {
    id: 'pris', day: '4', kicker: 'Prisen',
    title: 'Prisen finner seg selv.',
    body: 'Autopiloten leser Bergen-markedet i sanntid og låser leien som maksimerer inntekten din.',
    a: 0.295, b: 0.5, align: 'right', lx: 27, ly: 32, Scene: ScenePris,
  },
  {
    id: 'leietaker', day: '14', kicker: 'Leietakeren',
    title: 'Leietakeren kvalitetssikres.',
    body: 'BankID, inntekt og referanser verifiseres på hver eneste søker. Bare de beste slipper gjennom.',
    a: 0.5, b: 0.705, align: 'left', lx: 72, ly: 38, Scene: SceneLeietaker,
  },
  {
    id: 'leie', day: '30', kicker: 'Leien',
    title: 'Leien er på konto.',
    body: 'Første utbetaling er inne. Og slik fortsetter det — måned etter måned, helt av seg selv.',
    a: 0.705, b: 0.88, align: 'right', lx: 28, ly: 30, Scene: SceneUtbetaling,
  },
];

/* ============ typografi: ord-for-ord-avsløring ============ */
function TitleWords({ q, text }) {
  const words = text.split(' ');
  return words.map((w, i) => {
    const p = easeOutQuint(seg(q, 0.045 + i * 0.02, 0.17 + i * 0.02));
    return (
      <span
        key={i}
        className="inline-block overflow-hidden align-bottom"
        style={{ paddingBottom: '0.12em', marginBottom: '-0.12em' }}
      >
        <span
          className="inline-block whitespace-pre"
          style={{ transform: `translateY(${((1 - p) * 110).toFixed(1)}%)`, opacity: Math.min(1, p * 1.6) }}
        >
          {w + (i < words.length - 1 ? ' ' : '')}
        </span>
      </span>
    );
  });
}

function Headline({ q, ch }) {
  const kickP = easeOutCubic(seg(q, 0.03, 0.12));
  const bodyP = easeOutCubic(seg(q, 0.15, 0.27));
  return (
    <div>
      <p
        className="flex items-center gap-3 text-[11px] sm:text-xs uppercase tracking-[0.24em] font-semibold text-[#CF97FC]"
        style={{ opacity: kickP, transform: `translateX(${((1 - kickP) * -18).toFixed(1)}px)` }}
      >
        <span className="inline-block h-px w-7 bg-current opacity-60" />
        Dag {ch.day} · {ch.kicker}
      </p>
      <h3 className="mt-4 sm:mt-5 font-heading font-bold tracking-[-0.03em] leading-[1.05] text-[clamp(30px,4.4vw,62px)] text-[#FDFCFB]">
        <TitleWords q={q} text={ch.title} />
      </h3>
      <p
        className="mt-4 sm:mt-6 text-[15px] sm:text-lg leading-relaxed text-white/50 max-w-md"
        style={{ opacity: bodyP, transform: `translateY(${((1 - bodyP) * 16).toFixed(1)}px)` }}
      >
        {ch.body}
      </p>
    </div>
  );
}

/* ============ gigantisk dag-tall (rullende teller) ============ */
function GhostDay({ q, day, right }) {
  const gIn = easeOutCubic(seg(q, 0.02, 0.2));
  const gOut = easeInOutCubic(seg(q, 0.85, 1));
  return (
    <div
      className={`absolute z-0 pointer-events-none select-none top-[31svh] lg:top-[6svh] right-[4%] ${right ? 'lg:right-[3%] text-right' : 'lg:right-auto lg:left-[3%] lg:text-left'}`}
      style={{
        opacity: (Math.min(1, gIn * 1.3) * (1 - gOut)).toFixed(3),
        transform: `translateY(${((1 - gIn) * 15 - gOut * 15 - q * 3).toFixed(2)}svh)`,
      }}
      aria-hidden="true"
    >
      <span className="block font-body text-[10px] sm:text-xs font-semibold uppercase tracking-[0.5em] text-white/25 mb-1 sm:mb-2">
        Dag
      </span>
      <span
        className="block font-heading font-bold"
        style={{
          fontSize: 'clamp(140px, 22vw, 360px)', lineHeight: 0.78, letterSpacing: '-0.05em',
          WebkitTextStroke: '1.5px rgba(235,232,245,0.07)', color: 'rgba(255,255,255,0.015)',
        }}
      >
        {day}
      </span>
    </div>
  );
}

/* ============ scenens lerret (måler --u) ============ */
function SceneBox({ right, children }) {
  const ref = useRef(null);
  const [un, setUn] = useState(5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setUn(el.clientWidth / 100));
    ro.observe(el);
    setUn(el.clientWidth / 100);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      className={`absolute z-[5] left-1/2 -translate-x-1/2 top-[13.5svh] w-[min(92vw,60svh)] lg:top-1/2 lg:-translate-y-1/2 lg:translate-x-0 lg:w-[min(46vw,98svh)] ${
        right ? 'lg:left-[5%]' : 'lg:left-auto lg:right-[4%]'
      }`}
      style={{ aspectRatio: '10/7' }}
    >
      <div ref={ref} className="absolute inset-0" style={{ '--u': `${un.toFixed(3)}px` }}>
        {children}
      </div>
    </div>
  );
}

/* ============ ett kapittel ============ */
function Chapter({ ch, p, clock }) {
  const q = seg(p, ch.a, ch.b);
  const enter = easeOutCubic(seg(q, 0, 0.09));
  const exit = easeInOutCubic(seg(q, 0.9, 1));
  const Scene = ch.Scene;
  const right = ch.align === 'right';
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: (Math.min(1, enter * 1.6) * (1 - exit)).toFixed(3),
        transform: `translateY(${((1 - enter) * 5 - exit * 5).toFixed(2)}svh)`,
      }}
    >
      {/* kapittelets eget studiolys — krysstoner automatisk mellom kapitler */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 46% 42% at ${ch.lx}% ${ch.ly}%, rgba(155,91,214,0.08), transparent 65%)` }}
      />
      <GhostDay q={q} day={ch.day} right={right} />
      <div
        className={`absolute z-10 left-0 right-0 px-6 sm:px-10 bottom-[12.5svh] lg:px-0 lg:bottom-auto lg:top-1/2 lg:-translate-y-1/2 lg:w-[38%] lg:max-w-[560px] ${
          right ? 'lg:left-auto lg:right-[6%]' : 'lg:left-[6%] lg:right-auto'
        }`}
      >
        <Headline q={q} ch={ch} />
      </div>
      <SceneBox right={right}>
        <Scene q={q} clock={clock} />
      </SceneBox>
    </div>
  );
}

/* ============ åpning — broen fra heroen ============ */
function Opener({ pre, p }) {
  const out = easeInOutCubic(seg(p, 0.045, 0.082));
  if (out >= 0.999) return null;
  const l1 = easeOutQuint(seg(pre, 0.42, 0.8));
  const l2 = easeOutQuint(seg(pre, 0.58, 0.97));
  const sub = easeOutCubic(seg(p, 0.012, 0.042));
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6"
      style={{ opacity: (1 - out).toFixed(3), transform: `translateY(${(-out * 9).toFixed(2)}svh)` }}
    >
      <p className="font-heading font-bold tracking-[-0.035em] leading-[1.05] text-[clamp(38px,5.6vw,76px)]">
        <span className="block overflow-hidden">
          <span
            className="block text-[#FDFCFB]"
            style={{ transform: `translateY(${((1 - l1) * 110).toFixed(1)}%)`, opacity: Math.min(1, l1 * 1.5) }}
          >
            Du sier ja.
          </span>
        </span>
        <span className="block overflow-hidden">
          <span
            className="block dh-platinum"
            style={{ transform: `translateY(${((1 - l2) * 110).toFixed(1)}%)`, opacity: Math.min(1, l2 * 1.5) }}
          >
            Autopiloten gjør resten.
          </span>
        </span>
      </p>
      <p
        className="mt-7 text-[11px] sm:text-sm uppercase tracking-[0.34em] font-semibold text-white/35"
        style={{ opacity: sub, transform: `translateY(${((1 - sub) * 14).toFixed(1)}px)` }}
      >
        Dette er de første 30 dagene
      </p>
    </div>
  );
}

/* ============ finale — kvitteringen ============ */
function Finale({ p }) {
  if (p < 0.86) return null;
  const k = easeOutQuint(seg(p, 0.89, 0.93));
  const big = easeOutQuint(seg(p, 0.905, 0.952));
  const sub = easeOutCubic(seg(p, 0.93, 0.965));
  const cta = easeOutCubic(seg(p, 0.945, 0.982));
  const toFilm = (e) => {
    e.preventDefault();
    const el = document.getElementById('film');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center px-6">
      <p
        className="text-[11px] sm:text-sm uppercase tracking-[0.34em] font-semibold text-white/40"
        style={{ opacity: k, transform: `translateY(${((1 - k) * 16).toFixed(1)}px)` }}
      >
        Din samlede innsats etter 30 dager
      </p>
      <p className="mt-4 font-heading font-bold tracking-[-0.035em] leading-[1.02] text-[clamp(54px,8vw,116px)]">
        <span className="block overflow-hidden" style={{ paddingBottom: '0.1em', marginBottom: '-0.1em' }}>
          <span
            className="block dh-platinum"
            style={{ transform: `translateY(${((1 - big) * 110).toFixed(1)}%)`, opacity: Math.min(1, big * 1.5) }}
          >
            0 minutter.
          </span>
        </span>
      </p>
      <p
        className="mt-6 text-base sm:text-lg text-white/50 max-w-md leading-relaxed"
        style={{ opacity: sub, transform: `translateY(${((1 - sub) * 16).toFixed(1)}px)` }}
      >
        Eiendommen din jobber. Du lever livet ditt.
      </p>
      <div
        className="mt-9 flex flex-col sm:flex-row gap-3 pointer-events-auto"
        style={{ opacity: cta, transform: `translateY(${((1 - cta) * 18).toFixed(1)}px)` }}
      >
        <Link
          href="/bli-utleier"
          className="rounded-full bg-white text-ink h-[52px] px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition"
        >
          Få gratis vurdering <ArrowUpRight className="h-4 w-4" />
        </Link>
        <a
          href="#film"
          onClick={toFilm}
          className="rounded-full text-white h-[52px] px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold border border-white/20 hover:bg-white/10 transition"
        >
          <Play className="h-4 w-4" /> Se hele filmen
        </a>
      </div>
    </div>
  );
}

/* ============ topp-telemetri ============ */
function TopChrome({ p, clock }) {
  const vis = Math.min(easeOutCubic(seg(p, 0.06, 0.095)), 1 - seg(p, 0.875, 0.91));
  if (vis <= 0.01) return null;
  let idx = 0;
  for (let i = 0; i < CHAPTERS.length; i++) if (p >= CHAPTERS[i].a) idx = i;
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(clock * 1.9));
  return (
    <div
      className="absolute left-6 right-6 sm:left-10 sm:right-10 lg:left-16 lg:right-16 top-[88px] z-20 flex items-center justify-between pointer-events-none"
      style={{ opacity: vis }}
    >
      <span className="inline-flex items-center gap-2.5">
        <span
          className="h-1.5 w-1.5 rounded-full bg-emerald-400"
          style={{ boxShadow: '0 0 8px rgba(52,211,153,0.9)', opacity: pulse }}
        />
        <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.32em] font-semibold text-white/40">
          DigiHome Autopilot — live
        </span>
      </span>
      <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.3em] font-semibold text-white/40 tabular-nums">
        Kap. {idx + 1} / 4
      </span>
    </div>
  );
}

/* ============ filmtidslinjen nederst ============ */
function Timeline({ p, onSeek }) {
  const vis = Math.min(easeOutCubic(seg(p, 0.055, 0.09)), 1 - seg(p, 0.875, 0.91));
  if (vis <= 0.01) return null;
  const fill = clamp01((p - A0) / (B1 - A0));
  return (
    <div
      className="absolute left-8 right-8 sm:left-12 sm:right-12 lg:left-16 lg:right-16 bottom-[5svh] z-20"
      style={{ opacity: vis, pointerEvents: vis > 0.5 ? 'auto' : 'none' }}
    >
      <div className="relative h-px bg-white/10">
        <span
          className="absolute left-0 top-0 h-full"
          style={{
            width: `${(fill * 100).toFixed(2)}%`,
            background: 'linear-gradient(90deg, rgba(207,151,252,0.35), #CF97FC)',
          }}
        />
        {/* spillehode */}
        <span
          className="absolute top-1/2"
          style={{ left: `${(fill * 100).toFixed(2)}%`, transform: 'translate(-50%, -50%)' }}
        >
          <span className="block h-[7px] w-[7px] rounded-full bg-white shadow-[0_0_12px_rgba(207,151,252,0.9)]" />
        </span>
        {CHAPTERS.map((c) => {
          const x = (c.a - A0) / (B1 - A0);
          const active = p >= c.a && p < c.b;
          const passed = p >= c.b;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSeek(c.a + 0.075)}
              className="absolute -top-3 h-10 w-14 -translate-x-1/2 group"
              style={{ left: `${(x * 100).toFixed(2)}%` }}
              aria-label={`Hopp til dag ${c.day}`}
            >
              <span
                className={`absolute left-1/2 top-3 -translate-x-1/2 -translate-y-1/2 h-[5px] w-[5px] rounded-full transition-colors duration-300 ${
                  active ? 'bg-[#CF97FC]' : passed ? 'bg-white/60' : 'bg-white/25'
                }`}
                style={active ? { boxShadow: '0 0 10px rgba(207,151,252,0.9)' } : undefined}
              />
              <span
                className={`absolute left-1/2 top-[22px] -translate-x-1/2 whitespace-nowrap text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-semibold transition-colors duration-300 ${
                  active ? 'text-white' : 'text-white/30 group-hover:text-white/60'
                }`}
              >
                Dag {c.day}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============ statisk variant (prefers-reduced-motion) ============ */
function StaticBox({ children }) {
  const ref = useRef(null);
  const [un, setUn] = useState(5);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setUn(el.clientWidth / 100));
    ro.observe(el);
    setUn(el.clientWidth / 100);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="relative w-full" style={{ aspectRatio: '10/7' }}>
      <div ref={ref} className="absolute inset-0" style={{ '--u': `${un.toFixed(3)}px` }}>
        {children}
      </div>
    </div>
  );
}

function JourneyStatic() {
  return (
    <section className="relative bg-[#050507] text-white py-24 sm:py-32" aria-label="Autopiloten i praksis — de første 30 dagene">
      <div className="max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
        <h2 className="font-heading font-bold tracking-[-0.035em] leading-[1.05] text-[clamp(34px,5vw,64px)]">
          <span className="block text-[#FDFCFB]">Du sier ja.</span>
          <span className="block dh-platinum">Autopiloten gjør resten.</span>
        </h2>
        <p className="mt-5 text-[11px] sm:text-sm uppercase tracking-[0.34em] font-semibold text-white/35">
          Dette er de første 30 dagene
        </p>
        <div className="mt-20 space-y-24">
          {CHAPTERS.map((ch) => {
            const Scene = ch.Scene;
            return (
              <div key={ch.id} className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                <Headline q={1} ch={ch} />
                <StaticBox><Scene q={1} clock={0} /></StaticBox>
              </div>
            );
          })}
        </div>
        <div className="mt-24 text-center">
          <p className="text-[11px] sm:text-sm uppercase tracking-[0.34em] font-semibold text-white/40">
            Din samlede innsats etter 30 dager
          </p>
          <p className="mt-4 font-heading font-bold tracking-[-0.035em] text-[clamp(48px,7vw,100px)] dh-platinum">0 minutter.</p>
          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/bli-utleier" className="rounded-full bg-white text-ink h-[52px] px-8 inline-flex items-center justify-center gap-2 text-sm font-semibold">
              Få gratis vurdering <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ hovedkomponenten ============ */
export function AutopilotJourney() {
  const wrapRef = useRef(null);
  const [reduce, setReduce] = useState(false);
  const [f, setF] = useState({ p: 0, pre: 0, clock: 0 });

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  /* motoren: rAF-loop med lerp-glatting — kjører kun når seksjonen er i nærheten */
  useEffect(() => {
    if (reduce) return;
    const el = wrapRef.current;
    if (!el) return;
    let raf = 0;
    let running = false;
    const st = { p: 0, pre: 0, clock: 0, last: 0 };
    const loop = (now) => {
      if (!running) return;
      const dt = Math.min(0.05, Math.max(0.001, (now - st.last) / 1000));
      st.last = now;
      st.clock += dt;
      const vh = window.innerHeight || 1;
      const r = el.getBoundingClientRect();
      const target = clamp01(-r.top / Math.max(1, r.height - vh));
      const preT = 1 - clamp01(r.top / vh);
      const k = Math.min(1, dt * 8.5);
      st.p += (target - st.p) * k;
      st.pre += (preT - st.pre) * k;
      if (Math.abs(target - st.p) < 0.0004) st.p = target;
      if (Math.abs(preT - st.pre) < 0.001) st.pre = preT;
      setF({ p: st.p, pre: st.pre, clock: st.clock });
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !running) {
          running = true;
          st.last = performance.now();
          raf = requestAnimationFrame(loop);
        } else if (!e.isIntersecting && running) {
          running = false;
          cancelAnimationFrame(raf);
        }
      },
      { rootMargin: '25% 0px 25% 0px' }
    );
    io.observe(el);
    return () => {
      running = false;
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  const seek = useCallback((target) => {
    const el = wrapRef.current;
    if (!el) return;
    const vh = window.innerHeight || 1;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: Math.round(top + target * (el.offsetHeight - vh)), behavior: 'smooth' });
  }, []);

  if (reduce) return <JourneyStatic />;

  return (
    <section
      ref={wrapRef}
      className="relative"
      style={{ height: '620vh', background: '#050507' }}
      aria-label="Autopiloten i praksis — de første 30 dagene"
    >
      <h2 className="sr-only">De første 30 dagene på autopilot</h2>
      <div className="sticky top-0 h-[100svh] overflow-hidden text-white">
        {/* rolig studiolys i taket — toner inn når scenen er festet (sømløs overgang) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 60% 44% at 50% 0%, rgba(150,140,185,0.05), transparent 60%)',
            opacity: easeOutCubic(seg(f.p, 0.01, 0.07)).toFixed(3),
          }}
        />

        <Opener pre={f.pre} p={f.p} />

        {CHAPTERS.map((ch) =>
          f.p > ch.a - 0.02 && f.p < ch.b + 0.02 ? (
            <Chapter key={ch.id} ch={ch} p={f.p} clock={f.clock} />
          ) : null
        )}

        <Finale p={f.p} />
        <TopChrome p={f.p} clock={f.clock} />
        <Timeline p={f.p} onSeek={seek} />

        {/* kino-vignett — toner først inn når scenen er festet (sømløs hero-overgang) */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 120% 92% at 50% 44%, transparent 60%, rgba(0,0,0,0.34) 100%)',
            opacity: easeOutCubic(seg(f.p, 0.005, 0.06)).toFixed(3),
          }}
        />
        {/* bunn-feather for tidslinjens lesbarhet */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[15svh]"
          style={{
            background: 'linear-gradient(0deg, rgba(3,3,5,0.5), transparent)',
            opacity: easeOutCubic(seg(f.p, 0.005, 0.06)).toFixed(3),
          }}
        />
      </div>
    </section>
  );
}
