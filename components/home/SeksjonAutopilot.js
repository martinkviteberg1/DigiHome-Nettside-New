'use client';

/*
  Seksjon 2 (/2) — «Systemet i drift».
  Ett fullbredde, lyst produktvindu med hårfin outline. Inne i vinduet kjører
  DigiHome-motoren seg selv: en hendelse kommer inn, modulen lyser opp, motoren
  analyserer, utfører og logger resultatet — i en rolig, uendelig loop. Ingen
  toggles, ingen knapper. Du ser bare et system som jobber.
*/

import { useEffect, useRef, useState } from 'react';
import {
  Megaphone, LineChart, CalendarRange, MessageSquare, Wallet,
  Sparkles, Check, ShieldCheck,
} from 'lucide-react';
import { seg, clamp01, easeOutCubic, typed } from '@/components/video/filmUtils';

const INK = (a = 1) => `rgba(22,18,31,${a})`;
const QUIET = (a = 1) => `rgba(124,116,102,${a})`;
const LAV = (a = 1) => `rgba(155,91,214,${a})`;
const EMER = (a = 1) => `rgba(24,121,78,${a})`;
const HAIR = 'rgba(22,18,31,0.07)';

const EVENT_DUR = 6.6; // sekunder per hendelse

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

/* ───────────────── aktiv hendelse ───────────────── */
function ActiveEvent({ ev, p, clock }) {
  const enterP = easeOutCubic(seg(p, 0, 0.1));
  const outP = seg(p, 0.94, 1);
  const opacity = enterP * (1 - outP);
  const y = (1 - enterP) * 14 + outP * -8;

  const analyzing = p >= 0.1 && p < 0.42;
  const actP = seg(p, 0.4, 0.7);
  const acting = p >= 0.4 && p < 0.74;
  const resolveP = easeOutCubic(seg(p, 0.74, 0.86));
  const resolved = p >= 0.74;

  const scanY = clamp01(seg(p, 0.1, 0.42));
  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;

  const phaseLabel = resolved ? 'Fullført' : acting ? 'Utfører' : 'Analyserer';
  const phaseColor = resolved ? EMER(0.9) : LAV(0.95);

  return (
    <div
      className="relative overflow-hidden rounded-[16px] bg-white"
      style={{ border: `1px solid ${HAIR}`, boxShadow: '0 1px 2px rgba(22,18,31,0.04), 0 18px 40px -28px rgba(22,18,31,0.22)', opacity, transform: `translateY(${y.toFixed(1)}px)`, padding: '20px 22px' }}
    >
      {/* scanline under analyse */}
      {analyzing && (
        <div className="pointer-events-none absolute inset-x-0" style={{ top: `${(scanY * 100).toFixed(1)}%`, height: 64, background: `linear-gradient(180deg, transparent, ${LAV(0.07)}, transparent)` }} />
      )}
      {/* venstre aksentstripe ved fullført */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: resolved ? EMER(0.8) : LAV(0.55), opacity: 0.25 + 0.75 * (resolved ? 1 : Math.abs(Math.sin(clock * 2.4))), transition: 'background 400ms' }} />

      <div className="flex items-start gap-3.5">
        <span className="h-10 w-10 shrink-0 rounded-[11px] inline-flex items-center justify-center" style={{ background: resolved ? EMER(0.1) : LAV(0.1) }}>
          <ModIcon className="h-5 w-5" style={{ color: resolved ? EMER(0.95) : LAV(0.95) }} strokeWidth={1.9} />
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <p className="font-body font-semibold text-[15.5px] sm:text-[16px] text-ink truncate">{ev.title}</p>
            <span className="hidden sm:inline-flex items-center gap-1.5 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ color: phaseColor, background: resolved ? EMER(0.08) : LAV(0.08) }}>
              {!resolved && <span className="h-1.5 w-1.5 rounded-full" style={{ background: phaseColor, opacity: 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) }} />}
              {resolved && <Check className="h-3 w-3" strokeWidth={3} />}
              {phaseLabel}
            </span>
          </div>
          <p className="mt-0.5 font-body text-[13px] text-quiet truncate">{ev.meta}</p>

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
              <span className="font-body font-medium text-[13.5px]" style={{ color: INK(0.55) }}>{ev.act}</span>
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
        </div>
      </div>
    </div>
  );
}

function Dots({ clock }) {
  const n = Math.floor((clock * 2.5) % 4);
  return <span style={{ opacity: 0.85 }}>{'.'.repeat(n)}</span>;
}

/* ───────────────── nylig håndtert (logg) ───────────────── */
function HistoryRow({ ev, depth }) {
  const Mod = MODULES[ev.m];
  const ModIcon = Mod.icon;
  const op = depth === 0 ? 0.62 : 0.34;
  return (
    <div className="flex items-center gap-3 px-1.5 py-2.5" style={{ opacity: op }}>
      <span className="h-7 w-7 shrink-0 rounded-[8px] inline-flex items-center justify-center" style={{ background: 'rgba(22,18,31,0.04)' }}>
        <ModIcon className="h-3.5 w-3.5" style={{ color: INK(0.5) }} strokeWidth={1.9} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-[13px] text-ink/70 truncate" style={{ textDecoration: 'none' }}>{ev.title}</p>
      </div>
      <span className="inline-flex items-center gap-1 shrink-0 font-body text-[12px]" style={{ color: EMER(0.75) }}>
        <Check className="h-3 w-3" strokeWidth={3} /> Løst
      </span>
    </div>
  );
}

/* ───────────────── modul-skinne ───────────────── */
function ModuleRail({ activeM, clock }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="px-3 mb-2 font-body font-semibold uppercase text-[10px] tracking-[0.2em]" style={{ color: QUIET(0.7) }}>Moduler</p>
      {MODULES.map((m, i) => {
        const on = i === activeM;
        const Icon = m.icon;
        return (
          <div key={m.key} className="relative flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition-colors duration-500" style={{ background: on ? LAV(0.07) : 'transparent' }}>
            {on && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full" style={{ background: LAV(0.85) }} />}
            <Icon className="h-4 w-4 shrink-0 transition-colors duration-500" style={{ color: on ? LAV(0.95) : INK(0.4) }} strokeWidth={1.9} />
            <span className="font-body text-[13.5px] transition-colors duration-500" style={{ color: on ? INK(0.92) : INK(0.55), fontWeight: on ? 600 : 500 }}>{m.label}</span>
            <span className="ml-auto h-1.5 w-1.5 rounded-full transition-all duration-500" style={{ background: on ? LAV(0.9) : INK(0.14), opacity: on ? 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) : 1, transform: `scale(${on ? 1 : 0.8})` }} />
          </div>
        );
      })}
    </div>
  );
}

/* ───────────────── hovedkomponent ───────────────── */
export function SeksjonAutopilot() {
  const sectionRef = useRef(null);
  const startRef = useRef(0);
  const lastIdxRef = useRef(-1);

  const [clock, setClock] = useState(0);
  const [idx, setIdx] = useState(0);
  const [p, setP] = useState(0);
  const [history, setHistory] = useState([EVENTS[4], EVENTS[3]]);
  const [solved, setSolved] = useState(23);
  const [inView, setInView] = useState(false);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !inView) return;
    let raf;
    let last = 0;
    startRef.current = performance.now();
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 33) return;
      last = now;
      const elapsed = (now - startRef.current) / 1000;
      const i = Math.floor(elapsed / EVENT_DUR) % EVENTS.length;
      const localP = (elapsed % EVENT_DUR) / EVENT_DUR;
      setClock(now / 1000);
      setIdx(i);
      setP(localP);
      if (i !== lastIdxRef.current) {
        if (lastIdxRef.current >= 0) {
          const done = EVENTS[lastIdxRef.current];
          setHistory((h) => [done, ...h].slice(0, 2));
          setSolved((s) => s + 1);
        }
        lastIdxRef.current = i;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView]);

  const ev = EVENTS[idx];
  const activeM = ev.m;
  // ved redusert bevegelse: vis en rolig, ferdig tilstand
  const pStatic = reduce ? 0.8 : p;

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 52% 40% at 50% -8%, rgba(155,91,214,0.05), transparent 72%)' }} />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        {/* enkel overskrift */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em]" style={{ color: QUIET(0.9) }}>DigiHome OS</p>
          <h2 className="mt-4 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(30px,4.4vw,54px)] text-ink">
            Alt skjer <span className="dh-ink-shine">av seg selv.</span>
          </h2>
          <p className="mt-5 text-[18px] leading-relaxed text-quiet max-w-lg mx-auto">
            Motoren finner hva som haster, gjør jobben og logger resultatet — døgnet rundt, uten at du løfter en finger.
          </p>
        </div>

        {/* SYSTEMVINDUET */}
        <div
          className="mt-14 lg:mt-16 rounded-[22px] overflow-hidden"
          style={{ background: '#FFFFFF', border: `1px solid ${HAIR}`, boxShadow: '0 2px 4px rgba(22,18,31,0.04), 0 48px 110px -52px rgba(22,18,31,0.34)' }}
        >
          {/* topplinje */}
          <div className="flex items-center justify-between px-4 sm:px-5 h-[54px]" style={{ borderBottom: `1px solid ${HAIR}` }}>
            <div className="flex items-center gap-2.5">
              <span className="h-7 w-7 rounded-[8px] inline-flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#9B5BD6,#CF97FC)' }}>
                <ShieldCheck className="h-4 w-4 text-white" strokeWidth={2.2} />
              </span>
              <span className="font-heading font-bold text-[14px] tracking-[-0.01em] text-ink">DigiHome OS</span>
              <span className="hidden sm:block font-body text-[12.5px]" style={{ color: QUIET(0.8) }}>· Drift</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold" style={{ color: EMER(0.9), background: EMER(0.08) }}>
                <span className="relative inline-flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full" style={{ background: EMER(0.9), opacity: 0.4 + 0.6 * Math.abs(Math.sin(clock * 2.2)) }} />
                </span>
                Autopilot aktiv
              </span>
            </div>
          </div>

          {/* kropp: skinne + feed */}
          <div className="grid md:grid-cols-[208px_1fr]">
            {/* venstre skinne (skjult på mobil) */}
            <div className="hidden md:block p-3.5" style={{ borderRight: `1px solid ${HAIR}`, background: 'rgba(22,18,31,0.012)' }}>
              <ModuleRail activeM={activeM} clock={clock} />
            </div>

            {/* hovedfeed */}
            <div className="p-4 sm:p-6 lg:p-7">
              {/* mobil: aktiv modul som chip */}
              <div className="md:hidden mb-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
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

              <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-3" style={{ color: QUIET(0.7) }}>Sanntid</p>

              {/* aktiv hendelse */}
              <ActiveEvent ev={ev} p={pStatic} clock={clock} />

              {/* nylig håndtert */}
              <div className="mt-5 pt-4" style={{ borderTop: `1px solid ${HAIR}` }}>
                <p className="font-body font-semibold uppercase text-[10px] tracking-[0.2em] mb-1" style={{ color: QUIET(0.7) }}>Nylig håndtert</p>
                {history.map((h, i) => (
                  <HistoryRow key={`${h.title}-${i}`} ev={h} depth={i} />
                ))}
              </div>
            </div>
          </div>

          {/* bunnlinje: rolige nøkkeltall */}
          <div className="flex items-center gap-5 sm:gap-8 px-4 sm:px-6 h-[52px] overflow-x-auto no-scrollbar" style={{ borderTop: `1px solid ${HAIR}`, background: 'rgba(22,18,31,0.012)' }}>
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
      </div>
    </section>
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
