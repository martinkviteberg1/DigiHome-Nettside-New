'use client';

/*
  Seksjon 2 (/2) — «Grensesnittet som bygger seg selv».
  Ingen overskrift. Samme bakgrunn som heroen. Kun én hårfin ramme rundt et
  dashboard — innholdet lever rett på papiret (ingen bokser, kun luft og linjer).

  Koreografi (spilles av når seksjonen kommer i syne):
    1) En nydelig typewriter skriver et kort manifest inni rammen.
    2) Manifestet toner ut og grensesnittet vokser fram — topplinje, moduler,
       sanntidsfeed og nøkkeltall stiger inn i tur.
    3) Motoren går live: hendelser kommer inn, analyseres, utføres og logges,
       i en rolig, uendelig loop.
*/

import { useEffect, useRef, useState } from 'react';
import {
  Megaphone, LineChart, CalendarRange, MessageSquare, Wallet,
  Sparkles, Check, ShieldCheck,
} from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, typed } from '@/components/video/filmUtils';

const INK = (a = 1) => `rgba(22,18,31,${a})`;
const QUIET = (a = 1) => `rgba(124,116,102,${a})`;
const LAV = (a = 1) => `rgba(155,91,214,${a})`;
const EMER = (a = 1) => `rgba(24,121,78,${a})`;
const HAIR = 'rgba(22,18,31,0.05)';

const SECTION_BG =
  'radial-gradient(ellipse 64% 42% at 50% 58%, rgba(155,91,214,0.038), transparent 72%)';

const EVENT_DUR = 6.2; // sekunder per hendelse i live-loopen

/* manifest — avkreft den gamle måten, avslør den nye */
const NEG = ['Ingen dashboards.', 'Ingen klikk.', 'Ingen funksjoner.'];
const FINAL = 'Bare autopilot.';
const SUBLINE = 'Et helt nytt system for utleie. Du slår det på — så driver det seg selv.';

/* manifest-koreografi (sekunder) */
const NEG_START = 0.6;
const NEG_CYCLE = 1.25;     // type + hold + erase per negasjon
const NEG_TYPE = 0.55;
const NEG_HOLD = 0.4;
const NEG_ERASE = 0.3;
const FINAL_START = NEG_START + NEG.length * NEG_CYCLE;  // ≈ 4.35
const FINAL_DUR = 1.0;

/* reveal-tidslinje (sekunder) */
const T = {
  manOut: [FINAL_START + 3.0, FINAL_START + 3.8],
  topbar: [FINAL_START + 3.3, FINAL_START + 3.95],
  railBase: FINAL_START + 3.6,
  railStagger: 0.09,
  feed: [FINAL_START + 3.95, FINAL_START + 4.7],
  metrics: [FINAL_START + 4.5, FINAL_START + 5.15],
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

/* ─────────── aktiv hendelse (flat, rett på papiret) ─────────── */
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
    <div className="relative">
      <div className="flex items-start gap-4">
        <span className="h-11 w-11 shrink-0 rounded-[13px] inline-flex items-center justify-center transition-colors duration-500" style={{ background: resolved ? EMER(0.1) : LAV(0.1) }}>
          <ModIcon style={{ width: 21, height: 21, color: resolved ? EMER(0.95) : LAV(0.95) }} strokeWidth={1.8} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-body font-semibold text-[16px] sm:text-[17px] text-ink truncate">{ev.title}</p>
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors duration-300" style={{ color: phaseColor, background: resolved ? EMER(0.08) : LAV(0.08) }}>
              {!resolved && <span className="h-1.5 w-1.5 rounded-full" style={{ background: phaseColor, opacity: 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) }} />}
              {resolved && <Check className="h-3 w-3" strokeWidth={3} />}
              {phaseLabel}
            </span>
          </div>
          <p className="mt-1 font-body text-[13px] text-quiet truncate">{ev.meta}</p>

          {/* prosesslinje (fast høyde) */}
          <div style={{ height: 22, marginTop: 12 }}>
            {analyzing && (
              <span className="inline-flex items-center gap-2" style={{ opacity: easeOutCubic(seg(p, 0.1, 0.2)) }}>
                <span className="relative inline-flex" style={{ width: 13, height: 13 }}>
                  <span className="absolute inset-0 rounded-full border-2" style={{ borderColor: LAV(0.25), borderTopColor: LAV(0.95), transform: `rotate(${(clock * 320) % 360}deg)` }} />
                </span>
                <span className="font-body text-[13.5px]" style={{ color: LAV(0.95) }}>{ev.analyze}<Dots clock={clock} /></span>
              </span>
            )}
            {acting && (
              <span className="inline-flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" style={{ color: LAV(0.95) }} strokeWidth={2} />
                <span className="font-body font-medium text-[13.5px]" style={{ color: LAV(0.98) }}>
                  {typed(ev.act, actP)}
                  {actP < 1 && <span className="dh-caret-bar" style={{ background: LAV(0.9) }} />}
                </span>
              </span>
            )}
            {resolved && !acting && (
              <span className="font-body font-medium text-[13.5px]" style={{ color: INK(0.5) }}>{ev.act}</span>
            )}
          </div>

          {/* resultatlinje (fast høyde) */}
          <div style={{ height: 20, marginTop: 4 }}>
            {resolved && (
              <span className="inline-flex items-center gap-1.5" style={{ opacity: resolveP, transform: `translateY(${((1 - resolveP) * 4).toFixed(1)}px)` }}>
                <span className="inline-flex items-center justify-center rounded-full" style={{ width: 15, height: 15, background: EMER(0.95) }}>
                  <Check className="h-2.5 w-2.5 text-white" strokeWidth={3.4} />
                </span>
                <span className="font-body font-semibold text-[13px]" style={{ color: EMER(0.9) }}>{ev.result}</span>
              </span>
            )}
          </div>

          {/* hårfin fremdriftslinje under analyse */}
          <div className="mt-3.5 h-px w-full" style={{ background: HAIR }}>
            <div className="h-px" style={{ width: `${(resolved ? 1 : underP) * 100}%`, background: resolved ? EMER(0.5) : LAV(0.6), transition: 'background 400ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────── neste i kø ─────────── */
function QueueRow({ ev, depth }) {
  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;
  const op = depth === 0 ? 0.78 : 0.5;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ opacity: op }}>
      <span className="h-8 w-8 shrink-0 rounded-[10px] inline-flex items-center justify-center" style={{ background: 'rgba(155,91,214,0.07)' }}>
        <ModIcon className="h-4 w-4" style={{ color: LAV(0.7) }} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13.5px] text-ink/75 truncate">{ev.title}</p>
        <p className="font-body text-[11.5px] truncate" style={{ color: QUIET(0.85) }}>{ev.meta}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 shrink-0 font-body text-[12px]" style={{ color: QUIET(0.85) }}>
        <span className="h-2 w-2 rounded-full" style={{ border: `1.5px solid ${QUIET(0.45)}` }} /> I kø
      </span>
    </div>
  );
}

/* ─────────── nylig håndtert ─────────── */
function HistoryRow({ ev, depth }) {
  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;
  const op = depth === 0 ? 0.6 : depth === 1 ? 0.4 : 0.24;
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ opacity: op }}>
      <span className="h-8 w-8 shrink-0 rounded-[10px] inline-flex items-center justify-center" style={{ background: 'rgba(22,18,31,0.04)' }}>
        <ModIcon className="h-4 w-4" style={{ color: INK(0.5) }} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13.5px] text-ink/70 truncate">{ev.title}</p>
      </div>
      <span className="inline-flex items-center gap-1 shrink-0 font-body text-[12px]" style={{ color: EMER(0.7) }}>
        <Check className="h-3 w-3" strokeWidth={3} /> Løst
      </span>
    </div>
  );
}

/* ─────────── modul-skinne (flat) ─────────── */
function ModuleRail({ activeM, clock, t }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="mb-2.5 font-body font-semibold uppercase text-[10px] tracking-[0.2em]" style={{ color: QUIET(0.7), opacity: easeOutCubic(seg(t, T.railBase - 0.2, T.railBase + 0.3)) }}>Moduler</p>
      {MODULES.map((m, i) => {
        const rp = easeOutCubic(seg(t, T.railBase + i * T.railStagger, T.railBase + 0.6 + i * T.railStagger));
        const on = i === activeM;
        const Icon = m.icon;
        return (
          <div key={m.key} className="relative flex items-center gap-2.5 py-2.5 pl-2.5" style={{ opacity: rp, transform: `translateX(${((1 - rp) * -8).toFixed(1)}px)` }}>
            {on && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full transition-all duration-500" style={{ background: LAV(0.85) }} />}
            <Icon className="h-4 w-4 shrink-0 transition-colors duration-500" style={{ color: on ? LAV(0.95) : INK(0.4) }} strokeWidth={1.9} />
            <span className="font-body text-[13.5px] transition-colors duration-500" style={{ color: on ? INK(0.92) : INK(0.5), fontWeight: on ? 600 : 500 }}>{m.label}</span>
            <span className="ml-auto h-1.5 w-1.5 rounded-full transition-all duration-500" style={{ background: on ? LAV(0.9) : INK(0.12), opacity: on ? 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) : 1 }} />
          </div>
        );
      })}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="shrink-0 leading-none">
      <span className="font-heading font-bold tabular-nums text-[15px] text-ink tracking-[-0.01em]">{value}</span>
      <span className="ml-2 font-body text-[12px]" style={{ color: QUIET(0.85) }}>{label}</span>
    </div>
  );
}
function Sep() {
  return <span className="shrink-0 h-3.5 w-px" style={{ background: HAIR }} />;
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

  // reveal-verdier
  const tt = reduce ? 99 : t;
  const manOut = easeInOutCubic(seg(tt, T.manOut[0], T.manOut[1]));
  const manOpacity = reduce ? 0 : 1 - manOut;
  const topbarP = easeOutCubic(seg(tt, T.topbar[0], T.topbar[1]));
  const feedP = easeOutCubic(seg(tt, T.feed[0], T.feed[1]));
  const metricsP = easeOutCubic(seg(tt, T.metrics[0], T.metrics[1]));

  // manifest: negasjoner (type → hold → slett), så avsløres FINAL
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
        {/* RAMMEN — kun en hårfin outline, innholdet lever rett på papiret */}
        <div
          className="relative rounded-[26px] overflow-hidden min-h-[600px] sm:min-h-[620px]"
          style={{ border: `1px solid ${HAIR}`, boxShadow: '0 30px 90px -60px rgba(22,18,31,0.22)' }}
        >
          {/* ── grensesnittet (vokser fram) ── */}
          <div className="absolute inset-0 flex flex-col">
            {/* topplinje */}
            <div className="flex items-center justify-between px-5 sm:px-6 h-[58px]" style={{ borderBottom: `1px solid ${HAIR}`, opacity: topbarP, transform: `translateY(${((1 - topbarP) * -6).toFixed(1)}px)` }}>
              <div className="flex items-center gap-2.5">
                <span className="h-7 w-7 rounded-[8px] inline-flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9B5BD6,#CF97FC)' }}>
                  <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.2} />
                </span>
                <span className="font-heading font-bold text-[14px] tracking-[-0.01em] text-ink">DigiHome OS</span>
                <span className="hidden sm:block font-body text-[12.5px]" style={{ color: QUIET(0.8) }}>· Drift</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: EMER(0.9), background: EMER(0.08) }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER(0.9), opacity: 0.4 + 0.6 * Math.abs(Math.sin(clock * 2.2)) }} />
                Autopilot aktiv
              </span>
            </div>

            {/* kropp */}
            <div className="flex-1 min-h-0 overflow-hidden grid md:grid-cols-[224px_1fr]">
              {/* skinne */}
              <div className="hidden md:block px-5 py-6" style={{ borderRight: `1px solid ${HAIR}` }}>
                <ModuleRail activeM={activeM} clock={clock} t={tt} />
              </div>

              {/* feed */}
              <div className="px-5 sm:px-7 lg:px-9 py-6" style={{ opacity: feedP, transform: `translateY(${((1 - feedP) * 10).toFixed(1)}px)` }}>
                {/* mobil: moduler som chips */}
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

                <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-4" style={{ color: QUIET(0.7) }}>Sanntid</p>
                <ActiveEvent ev={ev} p={pStatic} clock={clock} />

                <div className="mt-7">
                  <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-1" style={{ color: QUIET(0.7) }}>Neste i kø</p>
                  {queue.map((q, i) => (
                    <QueueRow key={`${q.title}-${i}`} ev={q} depth={i} />
                  ))}
                </div>

                <div className="mt-6 pt-5" style={{ borderTop: `1px solid ${HAIR}` }}>
                  <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-1" style={{ color: QUIET(0.7) }}>Nylig håndtert</p>
                  {history.map((h, i) => (
                    <HistoryRow key={`${h.title}-${i}`} ev={h} depth={i} />
                  ))}
                </div>
              </div>
            </div>

            {/* bunnlinje */}
            <div className="flex items-center gap-5 sm:gap-8 px-5 sm:px-6 h-[56px] overflow-x-auto no-scrollbar" style={{ borderTop: `1px solid ${HAIR}`, opacity: metricsP }}>
              <Metric label="Løst i dag" value={String(solved)} />
              <Sep />
              <Metric label="Snittrespons" value="2 min" />
              <Sep />
              <Metric label="Aktive boliger" value="30" />
              <Sep />
              <Metric label="Belegg" value="97 %" />
              <span className="ml-auto hidden sm:inline-flex items-center gap-1.5 font-body text-[12px] shrink-0" style={{ color: QUIET(0.85) }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER(0.8) }} />
                Alt under kontroll
              </span>
            </div>
          </div>

          {/* ── manifest (kinematisk) — avkrefter den gamle måten, avslører autopiloten ── */}
          {manOpacity > 0.01 && (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none"
              style={{ background: '#FEFBFA', opacity: manOpacity, transform: `translateY(${(manOut * -10).toFixed(1)}px) scale(${(1 - manOut * 0.02).toFixed(3)})` }}
            >
              <p className="font-body font-semibold uppercase text-[11px] tracking-[0.32em]" style={{ color: QUIET(0.7), opacity: seg(tt, 0.15, 0.55) }}>En ny måte å leie ut på</p>

              {/* stor linje — fast høyde for å unngå hopp */}
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

              {/* subline */}
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
