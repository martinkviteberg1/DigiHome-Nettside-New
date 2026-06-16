'use client';

/*
  Seksjon 2 (/2) — «Systemet i drift», verdensklasse-utgave.
  Kinematisk manifest → grensesnittet vokser fram → motoren går live.
  Dashboardet er nå en egen, ren produktflate (kjølig hvit) som så vidt løfter
  seg fra det varme papiret: mykt topplys, flerlags skygge, ultrafin grain,
  ekte DigiHome-merke, Right Grotesk på tallene, og et levende innsikts-panel.
*/

import { useEffect, useRef, useState } from 'react';
import {
  Megaphone, LineChart, CalendarRange, MessageSquare, Wallet,
  Sparkles, Check, TrendingUp,
} from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, typed } from '@/components/video/filmUtils';

const INK = (a = 1) => `rgba(22,18,31,${a})`;
const QUIET = (a = 1) => `rgba(124,116,102,${a})`;
const LAV = (a = 1) => `rgba(155,91,214,${a})`;
const EMER = (a = 1) => `rgba(24,121,78,${a})`;
const HAIR = 'rgba(22,18,31,0.05)';
const HAIR_OUT = 'rgba(22,18,31,0.07)';

const SURFACE = '#FFFFFF';                 // kjølig, ren produktflate
const PANEL = 'rgba(28,30,54,0.022)';      // hvisken av kjølig tint på sidepaneler
const ACTIVE_BG = 'rgba(155,91,214,0.045)';
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const SECTION_BG =
  'radial-gradient(ellipse 64% 42% at 50% 58%, rgba(155,91,214,0.038), transparent 72%)';

const EVENT_DUR = 6.2;

/* manifest — avkreft den gamle måten, avslør den nye */
const NEG = ['Ingen dashboards.', 'Ingen klikk.', 'Ingen funksjoner.'];
const FINAL = 'Bare autopilot.';
const SUBLINE = 'Et helt nytt system for utleie. Du slår det på — så driver det seg selv.';

const NEG_START = 0.6;
const NEG_CYCLE = 1.25;
const NEG_TYPE = 0.55;
const NEG_HOLD = 0.4;
const NEG_ERASE = 0.3;
const FINAL_START = NEG_START + NEG.length * NEG_CYCLE;
const FINAL_DUR = 1.0;

const T = {
  manOut: [FINAL_START + 3.0, FINAL_START + 3.8],
  topbar: [FINAL_START + 3.3, FINAL_START + 3.95],
  railBase: FINAL_START + 3.6,
  railStagger: 0.09,
  feed: [FINAL_START + 3.95, FINAL_START + 4.7],
  insight: [FINAL_START + 4.3, FINAL_START + 5.0],
  metrics: [FINAL_START + 4.7, FINAL_START + 5.35],
  liveStart: FINAL_START + 4.0,
};

const MODULES = [
  { key: 'annonse', label: 'Annonse', icon: Megaphone },
  { key: 'prising', label: 'Prising', icon: LineChart },
  { key: 'visninger', label: 'Visninger', icon: CalendarRange },
  { key: 'leietaker', label: 'Leietaker', icon: MessageSquare },
  { key: 'okonomi', label: 'Økonomi', icon: Wallet },
];

const EVENTS = [
  { m: 3, title: 'Ny melding fra leietaker', meta: 'Olaf Ryes vei 11C · Martin', analyze: 'Leser melding · sjekker kontrakt', act: 'Foreslår visning torsdag 17:30', result: 'Svart automatisk · 41 sek' },
  { m: 1, title: 'Etterspørselen økte i Nordnes', meta: '3 sov · 68 m² · langtid', analyze: 'Sammenligner 38 aktive annonser', act: 'Justerer leie 14 900 → 15 500 kr', result: 'Pris oppdatert på Finn.no' },
  { m: 2, title: '3 nye interessenter', meta: 'Sofiegaten 4 · ledig 1. sep', analyze: 'Matcher mot kalenderen', act: 'Booker fellesvisning lørdag 12:00', result: 'Invitasjoner sendt · 3 stk' },
  { m: 4, title: 'Depositum forfaller', meta: 'Olaf Ryes vei 11C · 55 500 kr', analyze: 'Verifiserer mottaker og konto', act: 'Sender påminnelse + betalingslenke', result: 'Påminnelse levert' },
  { m: 0, title: 'Bolig klar for publisering', meta: 'Møhlenpris · 2 sov · 54 m²', analyze: 'Skriver annonsetekst · velger foto', act: 'Publiserer på Finn.no & Hybel', result: 'Live på 2 kanaler' },
];

function Dots({ clock }) {
  const n = Math.floor((clock * 2.5) % 4);
  return <span style={{ opacity: 0.85 }}>{'.'.repeat(n)}</span>;
}

/* ─────────── levende graf (sparkline) ─────────── */
function Sparkline({ drawP = 1 }) {
  const W = 250, H = 60, pad = 5;
  const data = [10, 15, 12, 19, 16, 25, 22, 31, 28, 39, 36, 47];
  const n = data.length;
  const max = Math.max(...data), min = Math.min(...data);
  const xs = (i) => pad + (i / (n - 1)) * (W - pad * 2);
  const ys = (v) => H - pad - ((v - min) / (max - min)) * (H - pad * 2);
  let dLine = '';
  data.forEach((v, i) => { dLine += `${i === 0 ? 'M' : 'L'} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)} `; });
  const dArea = `${dLine} L ${xs(n - 1).toFixed(1)} ${H} L ${xs(0).toFixed(1)} ${H} Z`;
  const lastX = xs(n - 1), lastY = ys(data[n - 1]);
  const dotOn = drawP > 0.9;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
      <defs>
        <linearGradient id="dh-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(155,91,214,0.20)" />
          <stop offset="100%" stopColor="rgba(155,91,214,0)" />
        </linearGradient>
      </defs>
      <path d={dArea} fill="url(#dh-spark)" style={{ opacity: drawP }} />
      <path d={dLine} fill="none" stroke="#9B5BD6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" style={{ strokeDasharray: 1, strokeDashoffset: 1 - drawP }} />
      {dotOn && <circle cx={lastX} cy={lastY} r="3" fill="#9B5BD6" />}
    </svg>
  );
}

/* ─────────── aktiv hendelse (fokusert kort) ─────────── */
function ActiveEvent({ ev, p, clock }) {
  const acting = p >= 0.4 && p < 0.74;
  const actP = seg(p, 0.4, 0.7);
  const analyzing = p >= 0.1 && p < 0.42;
  const resolveP = easeOutCubic(seg(p, 0.74, 0.86));
  const resolved = p >= 0.74;

  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;
  const phaseLabel = resolved ? 'Fullført' : acting ? 'Utfører' : 'Analyserer';
  const phaseColor = resolved ? EMER(0.9) : LAV(0.95);
  const underP = clamp01(seg(p, 0.1, 0.42));

  return (
    <div className="relative rounded-[16px] px-5 py-4" style={{ background: resolved ? EMER(0.045) : ACTIVE_BG, border: `1px solid ${resolved ? EMER(0.14) : LAV(0.13)}`, transition: 'background 500ms, border-color 500ms' }}>
      <div className="flex items-start gap-3.5">
        <span className="h-10 w-10 shrink-0 rounded-[12px] inline-flex items-center justify-center" style={{ background: resolved ? EMER(0.12) : LAV(0.13) }}>
          <ModIcon style={{ width: 20, height: 20, color: resolved ? EMER(0.95) : LAV(0.98) }} strokeWidth={1.9} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-heading font-bold text-[16px] tracking-[-0.012em] text-ink truncate">{ev.title}</p>
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ color: phaseColor, background: SURFACE }}>
              {!resolved && <span className="h-1.5 w-1.5 rounded-full" style={{ background: phaseColor, opacity: 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) }} />}
              {resolved && <Check className="h-3 w-3" strokeWidth={3} />}
              {phaseLabel}
            </span>
          </div>
          <p className="mt-0.5 font-body text-[12.5px] text-quiet truncate">{ev.meta}</p>

          <div style={{ height: 22, marginTop: 11 }}>
            {analyzing && (
              <span className="inline-flex items-center gap-2" style={{ opacity: easeOutCubic(seg(p, 0.1, 0.2)) }}>
                <span className="relative inline-flex" style={{ width: 13, height: 13 }}>
                  <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: LAV(0.25), borderTopColor: LAV(0.95), transform: `rotate(${(clock * 320) % 360}deg)` }} />
                </span>
                <span className="font-body text-[13px]" style={{ color: LAV(0.95) }}>{ev.analyze}<Dots clock={clock} /></span>
              </span>
            )}
            {acting && (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" style={{ color: LAV(0.95) }} strokeWidth={2} />
                <span className="font-body font-medium text-[13px]" style={{ color: LAV(0.98) }}>
                  {typed(ev.act, actP)}
                  {actP < 1 && <span className="dh-caret-bar" style={{ background: LAV(0.9) }} />}
                </span>
              </span>
            )}
            {resolved && !acting && (
              <span className="font-body font-medium text-[13px]" style={{ color: INK(0.5) }}>{ev.act}</span>
            )}
          </div>

          <div style={{ height: 18, marginTop: 3 }}>
            {resolved && (
              <span className="inline-flex items-center gap-1.5" style={{ opacity: resolveP, transform: `translateY(${((1 - resolveP) * 4).toFixed(1)}px)` }}>
                <span className="inline-flex items-center justify-center rounded-full" style={{ width: 15, height: 15, background: EMER(0.95) }}>
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.4} />
                </span>
                <span className="font-body font-semibold text-[12.5px]" style={{ color: EMER(0.9) }}>{ev.result}</span>
              </span>
            )}
          </div>

          <div className="mt-3 h-px w-full rounded-full" style={{ background: 'rgba(22,18,31,0.08)' }}>
            <div className="h-px rounded-full" style={{ width: `${(resolved ? 1 : underP) * 100}%`, background: resolved ? EMER(0.55) : LAV(0.65), transition: 'background 400ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function QueueRow({ ev, depth }) {
  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;
  const op = depth === 0 ? 0.82 : 0.55;
  return (
    <div className="flex items-center gap-3 py-2.5 px-1" style={{ opacity: op }}>
      <span className="h-8 w-8 shrink-0 rounded-[10px] inline-flex items-center justify-center" style={{ background: 'rgba(155,91,214,0.08)' }}>
        <ModIcon className="h-4 w-4" style={{ color: LAV(0.7) }} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13px] text-ink/75 truncate">{ev.title}</p>
        <p className="font-body text-[11px] truncate" style={{ color: QUIET(0.85) }}>{ev.meta}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 shrink-0 font-body text-[11.5px]" style={{ color: QUIET(0.85) }}>
        <span className="h-2 w-2 rounded-full" style={{ border: `1.5px solid ${QUIET(0.45)}` }} /> I kø
      </span>
    </div>
  );
}

function HistoryRow({ ev, depth }) {
  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;
  const op = depth === 0 ? 0.6 : 0.35;
  return (
    <div className="flex items-center gap-3 py-2.5 px-1" style={{ opacity: op }}>
      <span className="h-8 w-8 shrink-0 rounded-[10px] inline-flex items-center justify-center" style={{ background: 'rgba(22,18,31,0.04)' }}>
        <ModIcon className="h-4 w-4" style={{ color: INK(0.5) }} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13px] text-ink/70 truncate">{ev.title}</p>
      </div>
      <span className="inline-flex items-center gap-1 shrink-0 font-body text-[11.5px]" style={{ color: EMER(0.7) }}>
        <Check className="h-3 w-3" strokeWidth={3} /> Løst
      </span>
    </div>
  );
}

function ModuleRail({ activeM, clock, t }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="mb-2.5 px-1 font-body font-semibold uppercase text-[10px] tracking-[0.2em]" style={{ color: QUIET(0.7), opacity: easeOutCubic(seg(t, T.railBase - 0.2, T.railBase + 0.3)) }}>Moduler</p>
      {MODULES.map((m, i) => {
        const rp = easeOutCubic(seg(t, T.railBase + i * T.railStagger, T.railBase + 0.6 + i * T.railStagger));
        const on = i === activeM;
        const Icon = m.icon;
        return (
          <div key={m.key} className="relative flex items-center gap-2.5 py-2.5 pl-3 pr-2 rounded-[10px]" style={{ opacity: rp, transform: `translateX(${((1 - rp) * -8).toFixed(1)}px)`, background: on ? LAV(0.07) : 'transparent', transition: 'background 500ms' }}>
            {on && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: LAV(0.85) }} />}
            <Icon className="h-4 w-4 shrink-0 transition-colors duration-500" style={{ color: on ? LAV(0.98) : INK(0.4) }} strokeWidth={1.9} />
            <span className="font-body text-[13px] transition-colors duration-500" style={{ color: on ? INK(0.92) : INK(0.5), fontWeight: on ? 600 : 500 }}>{m.label}</span>
            <span className="ml-auto h-1.5 w-1.5 rounded-full transition-all duration-500" style={{ background: on ? LAV(0.9) : INK(0.12), opacity: on ? 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) : 1 }} />
          </div>
        );
      })}
    </div>
  );
}

function MiniRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="font-body text-[12.5px]" style={{ color: QUIET(0.9) }}>{label}</span>
      <span className="font-heading font-bold text-[13.5px] tabular-nums tracking-[-0.01em] text-ink">{value}</span>
    </div>
  );
}

function InsightPanel({ reveal, drawP }) {
  const income = Math.round(84200 * drawP);
  return (
    <div style={{ opacity: reveal, transform: `translateX(${((1 - reveal) * 12).toFixed(1)}px)` }}>
      <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em]" style={{ color: QUIET(0.7) }}>Inntekt · 30 dager</p>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <span className="font-heading font-bold text-[26px] leading-none tabular-nums tracking-[-0.02em] text-ink">{income.toLocaleString('nb-NO')} kr</span>
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold mb-0.5" style={{ color: EMER(0.9), background: EMER(0.08) }}>
          <TrendingUp className="h-3 w-3" strokeWidth={2.4} />+12 %
        </span>
      </div>
      <div className="mt-4">
        <Sparkline drawP={drawP} />
      </div>
      <div className="mt-4 pt-1" style={{ borderTop: `1px solid ${HAIR}` }}>
        <MiniRow label="Belegg" value="97 %" />
        <MiniRow label="Snittrespons" value="2 min" />
        <MiniRow label="Neste utbetaling" value="1. sep" />
      </div>
    </div>
  );
}

/* ═════════════════════ HOVEDKOMPONENT ═════════════════════ */
export function SeksjonAutopilot() {
  const sectionRef = useRef(null);
  const startRef = useRef(0);
  const startedRef = useRef(false);
  const lastIdxRef = useRef(-1);

  const [t, setT] = useState(0);
  const [clock, setClock] = useState(0);
  const [idx, setIdx] = useState(0);
  const [p, setP] = useState(0);
  const [history, setHistory] = useState([EVENTS[4], EVENTS[3], EVENTS[2]]);
  const [solved, setSolved] = useState(23);
  const [reduce, setReduce] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !inView || startedRef.current) return;
    startedRef.current = true;
    let raf;
    let last = 0;
    startRef.current = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33) return;
      last = now;
      const elapsed = (now - startRef.current) / 1000;
      setT(elapsed);
      setClock(now / 1000);
      const liveT = Math.max(0, elapsed - T.liveStart);
      const i = Math.floor(liveT / EVENT_DUR) % EVENTS.length;
      const localP = (liveT % EVENT_DUR) / EVENT_DUR;
      setIdx(i);
      setP(localP);
      if (i !== lastIdxRef.current) {
        if (lastIdxRef.current >= 0) {
          const done = EVENTS[lastIdxRef.current];
          setHistory((h) => [done, ...h].slice(0, 3));
          setSolved((s) => s + 1);
        }
        lastIdxRef.current = i;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView]);

  const tt = reduce ? 99 : t;
  const manOut = easeInOutCubic(seg(tt, T.manOut[0], T.manOut[1]));
  const manOpacity = reduce ? 0 : 1 - manOut;
  const topbarP = easeOutCubic(seg(tt, T.topbar[0], T.topbar[1]));
  const feedP = easeOutCubic(seg(tt, T.feed[0], T.feed[1]));
  const insightReveal = easeOutCubic(seg(tt, T.insight[0], T.insight[1]));
  const insightDraw = easeOutCubic(seg(tt, T.insight[0] + 0.2, T.insight[0] + 1.6));
  const metricsP = easeOutCubic(seg(tt, T.metrics[0], T.metrics[1]));

  // manifest
  let negText = '';
  let negCaret = false;
  if (tt < FINAL_START) {
    const k = Math.min(NEG.length - 1, Math.max(0, Math.floor((tt - NEG_START) / NEG_CYCLE)));
    const local = (tt - NEG_START) - k * NEG_CYCLE;
    const phrase = NEG[k];
    if (tt < NEG_START) negText = '';
    else if (local < NEG_TYPE) negText = phrase.slice(0, Math.round(phrase.length * clamp01(local / NEG_TYPE)));
    else if (local < NEG_TYPE + NEG_HOLD) negText = phrase;
    else negText = phrase.slice(0, Math.round(phrase.length * (1 - clamp01((local - NEG_TYPE - NEG_HOLD) / NEG_ERASE))));
    negCaret = true;
  }
  const finalP = easeOutCubic(seg(tt, FINAL_START, FINAL_START + FINAL_DUR));
  const showFinal = tt >= FINAL_START;
  const sublineP = easeOutCubic(seg(tt, FINAL_START + 0.8, FINAL_START + 1.6));

  const ev = EVENTS[idx];
  const activeM = ev.m;
  const queue = [EVENTS[(idx + 1) % EVENTS.length], EVENTS[(idx + 2) % EVENTS.length]];
  const pStatic = reduce ? 0.8 : p;

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="pointer-events-none absolute inset-0" style={{ background: SECTION_BG }} />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 pt-0 pb-20 sm:pb-24 lg:pb-28">
        {/* DASHBOARDET — egen, ren produktflate */}
        <div
          className="relative rounded-[26px] overflow-hidden min-h-[580px] sm:min-h-[600px]"
          style={{ background: SURFACE, border: `1px solid ${HAIR_OUT}`, boxShadow: '0 1px 2px rgba(22,18,31,0.04), 0 12px 32px -18px rgba(22,18,31,0.14), 0 60px 120px -55px rgba(22,18,31,0.30), inset 0 1px 0 rgba(255,255,255,0.8)' }}
        >
          {/* ultrafin grain */}
          <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: GRAIN, backgroundSize: '180px 180px', opacity: 0.028, mixBlendMode: 'multiply' }} />

          {/* ── grensesnittet (vokser fram) ── */}
          <div className="absolute inset-0 flex flex-col">
            {/* topplinje med ekte merke */}
            <div className="flex items-center justify-between px-5 sm:px-6 h-[58px]" style={{ borderBottom: `1px solid ${HAIR}`, opacity: topbarP, transform: `translateY(${((1 - topbarP) * -6).toFixed(1)}px)` }}>
              <div className="flex items-center gap-2.5">
                <img src="/digihome-icon.svg" alt="DigiHome" width={26} height={26} className="rounded-[7px]" style={{ boxShadow: '0 1px 3px rgba(22,18,31,0.16)' }} />
                <span className="font-heading font-bold text-[15px] tracking-[-0.015em] text-ink">digihome</span>
                <span className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9.5px] font-bold tracking-[0.08em]" style={{ background: LAV(0.1), color: LAV(0.95) }}>OS</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: EMER(0.9), background: EMER(0.08) }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER(0.9), opacity: 0.4 + 0.6 * Math.abs(Math.sin(clock * 2.2)) }} />
                Autopilot aktiv
              </span>
            </div>

            {/* kropp: skinne + feed + innsikt */}
            <div className="flex-1 min-h-0 overflow-hidden grid md:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr_272px]">
              {/* skinne */}
              <div className="hidden md:block px-4 py-6" style={{ borderRight: `1px solid ${HAIR}`, background: PANEL }}>
                <ModuleRail activeM={activeM} clock={clock} t={tt} />
              </div>

              {/* feed */}
              <div className="px-5 sm:px-7 py-6" style={{ opacity: feedP, transform: `translateY(${((1 - feedP) * 10).toFixed(1)}px)` }}>
                <div className="md:hidden mb-5 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {MODULES.map((m, i) => {
                    const on = i === activeM;
                    const Icon = m.icon;
                    return (
                      <span key={m.key} className="inline-flex items-center gap-1.5 shrink-0 rounded-full px-3 py-1.5 transition-colors duration-500" style={{ background: on ? LAV(0.1) : 'rgba(22,18,31,0.04)' }}>
                        <Icon className="h-3.5 w-3.5" style={{ color: on ? LAV(0.95) : INK(0.5) }} strokeWidth={1.9} />
                        <span className="font-body text-[12.5px]" style={{ color: on ? INK(0.9) : INK(0.55), fontWeight: on ? 600 : 500 }}>{m.label}</span>
                      </span>
                    );
                  })}
                </div>

                <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-3.5" style={{ color: QUIET(0.7) }}>Sanntid</p>
                <ActiveEvent ev={ev} p={pStatic} clock={clock} />

                <div className="mt-6">
                  <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-1 px-1" style={{ color: QUIET(0.7) }}>Neste i kø</p>
                  {queue.map((q, i) => (
                    <QueueRow key={`${q.title}-${i}`} ev={q} depth={i} />
                  ))}
                </div>

                <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${HAIR}` }}>
                  <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-1 px-1" style={{ color: QUIET(0.7) }}>Nylig håndtert</p>
                  {history.slice(0, 2).map((h, i) => (
                    <HistoryRow key={`${h.title}-${i}`} ev={h} depth={i} />
                  ))}
                </div>
              </div>

              {/* innsikt */}
              <div className="hidden lg:block px-6 py-6" style={{ borderLeft: `1px solid ${HAIR}`, background: PANEL }}>
                <InsightPanel reveal={insightReveal} drawP={insightDraw} />
              </div>
            </div>

            {/* bunnlinje */}
            <div className="flex items-center gap-5 sm:gap-7 px-5 sm:px-6 h-[54px] overflow-x-auto no-scrollbar" style={{ borderTop: `1px solid ${HAIR}`, opacity: metricsP, background: PANEL }}>
              <div className="shrink-0 leading-none">
                <span className="font-heading font-bold tabular-nums text-[14px] text-ink tracking-[-0.01em]">{solved}</span>
                <span className="ml-2 font-body text-[12px]" style={{ color: QUIET(0.85) }}>oppgaver løst i dag</span>
              </div>
              <span className="shrink-0 h-3.5 w-px" style={{ background: HAIR }} />
              <div className="shrink-0 leading-none">
                <span className="font-heading font-bold tabular-nums text-[14px] text-ink tracking-[-0.01em]">30</span>
                <span className="ml-2 font-body text-[12px]" style={{ color: QUIET(0.85) }}>aktive boliger</span>
              </div>
              <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 font-body text-[12px] shrink-0" style={{ color: QUIET(0.9) }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER(0.8) }} />
                Alt under kontroll
              </span>
            </div>
          </div>

          {/* ── manifest (kinematisk) ── */}
          {manOpacity > 0.01 && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none"
              style={{ background: SURFACE, opacity: manOpacity, transform: `translateY(${(manOut * -10).toFixed(1)}px) scale(${(1 - manOut * 0.02).toFixed(3)})` }}
            >
              <p className="font-body font-semibold uppercase text-[11px] tracking-[0.32em]" style={{ color: QUIET(0.7), opacity: seg(tt, 0.15, 0.55) }}>En ny måte å leie ut på</p>

              <div className="relative mt-6 flex items-center justify-center w-full" style={{ height: 'clamp(56px,9vw,110px)' }}>
                {!showFinal && (
                  <span className="font-heading font-bold tracking-[-0.03em] text-[clamp(32px,5.2vw,68px)] whitespace-nowrap" style={{ color: INK(0.45) }}>
                    {negText}
                    {negCaret && <span className="dh-caret-bar" style={{ background: INK(0.5), height: '0.8em' }} />}
                  </span>
                )}
                {showFinal && (
                  <span
                    className="dh-ink-shine font-heading font-bold tracking-[-0.04em] text-[clamp(40px,6.8vw,88px)] whitespace-nowrap"
                    style={{ opacity: finalP, filter: `blur(${((1 - finalP) * 16).toFixed(1)}px)`, transform: `scale(${(0.92 + finalP * 0.08).toFixed(3)})` }}
                  >
                    {FINAL}
                  </span>
                )}
              </div>

              <p
                className="mt-7 font-body text-[16px] sm:text-[18px] leading-relaxed text-quiet max-w-md mx-auto"
                style={{ opacity: sublineP, transform: `translateY(${((1 - sublineP) * 8).toFixed(1)}px)` }}
              >
                {SUBLINE}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
