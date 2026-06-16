'use client';

/*
  Seksjon 2 (/2) — «Listen som tømmer seg selv».
  Lyst, radikalt minimalistisk: manifest øverst, så ett sentrert, fokusert spor —
  en autopilot-kontroll (Manuell → Assistert → Autopilot) og en ren oppgaveliste
  rett på papiret (ingen bokser, kun hårfine linjer og luft).

  Når autopiloten skrus opp: oppgavene går fra «Gjør selv» → «AI foreslår + Godkjenn»
  → hukes av og forsvinner. Telleren faller 5 → 0, og en rolig tom-tilstand toner inn:
  «Alt er gjort.» Roen er beviset på at DigiHome er en motor, ikke en funksjonshaug.
*/

import { useEffect, useRef, useState } from 'react';
import { Sparkles, ChevronRight } from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, typed } from '@/components/video/filmUtils';

const INK = (a = 1) => `rgba(22,18,31,${a})`;
const QUIET = (a = 1) => `rgba(124,116,102,${a})`;
const LAV = (a = 1) => `rgba(155,91,214,${a})`;
const EMER = (a = 1) => `rgba(24,121,78,${a})`;
const HAIR = 'rgba(22,18,31,0.08)';

const REVEAL_DUR = 1.7;
const STEP_DUR = 7.5;
const ROWH = 96;

const LEVELS = [{ tag: 'Manuell' }, { tag: 'Assistert' }, { tag: 'Autopilot' }];

const TASKS = [
  { kind: 'Depositum', title: 'Depositum ikke startet', meta: 'Olaf Ryes vei 11C · 55 500 kr', ai: 'Starter depositumsprosess' },
  { kind: 'Depositum', title: 'Depositum venter på betaling', meta: 'Sofiegaten 4 · 54 000 kr', ai: 'Sender påminnelse til leietaker' },
  { kind: 'Sak', title: 'Sak: støy fra nabo', meta: 'Olaf Ryes vei 11C · åpen sak', ai: 'Utkast til svar er klart' },
  { kind: 'Sak', title: 'Ødelagt komfyr meldt', meta: 'Olaf Ryes vei 11C · leietaker', ai: 'Bestiller håndverker' },
  { kind: 'Innflytting', title: 'Innflytting om 16 dager', meta: 'Martin Test · Olaf Ryes vei 11C', ai: 'Klargjør innflyttingsprotokoll' },
];

/* leading-indikator (tom ring → fylt smaragd-hake) */
function Indicator({ level, doneP }) {
  const done = level === 2 ? doneP : 0;
  const ring = level === 1 ? LAV(0.55) : INK(0.18);
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: 24, height: 24 }}>
      <span className="absolute inset-0 rounded-full" style={{ border: `1.5px solid ${ring}`, opacity: 1 - done, transition: 'border-color 400ms' }} />
      <span className="absolute inset-0 rounded-full" style={{ background: EMER(0.95), opacity: done, transform: `scale(${(0.6 + 0.4 * done).toFixed(3)})` }} />
      {done > 0.2 && (
        <svg viewBox="0 0 12 12" className="relative" style={{ width: 12, height: 12, opacity: done }} fill="none">
          <path d="M2.6 6.4 L5 8.7 L9.5 3.6" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

function TaskRow({ task, level, q, i, clock }) {
  const rowIn = easeOutCubic(seg(q, 0.08 + i * 0.05, 0.24 + i * 0.05));
  const aiP = easeOutCubic(seg(q, 0.28 + i * 0.1, 0.46 + i * 0.1));
  const doneAt = 0.18 + i * 0.12;
  const doneP = easeOutCubic(seg(q, doneAt, doneAt + 0.1));
  const collapseP = level === 2 ? easeInOutCubic(seg(q, doneAt + 0.12, doneAt + 0.3)) : 0;

  return (
    <div style={{ maxHeight: level === 2 ? `${((1 - collapseP) * ROWH).toFixed(1)}px` : 'none', overflow: level === 2 ? 'hidden' : 'visible', opacity: rowIn * (1 - collapseP) }}>
      <div className="flex items-center gap-4" style={{ padding: '17px 2px', borderTop: i === 0 ? 'none' : `1px solid ${HAIR}`, transform: `translateY(${((1 - rowIn) * 8).toFixed(1)}px)` }}>
        <Indicator level={level} doneP={doneP} />
        <div className="flex-1 min-w-0">
          <p className="font-body font-semibold text-[16px] sm:text-[17px] truncate" style={{ color: level === 2 && doneP > 0.5 ? INK(0.5) : INK(0.92), textDecoration: level === 2 && doneP > 0.6 ? 'line-through' : 'none', textDecorationColor: INK(0.25) }}>{task.title}</p>
          <p className="font-body text-[13px] sm:text-[13.5px] truncate mt-0.5" style={{ color: QUIET(0.95) }}>
            <span style={{ color: QUIET(0.7) }}>{task.kind}</span> · {task.meta}
          </p>
          <div style={{ height: 18, marginTop: 3 }}>
            {level === 1 && aiP > 0.01 && (
              <span className="inline-flex items-center gap-1.5" style={{ opacity: Math.min(1, aiP * 1.5) }}>
                <Sparkles style={{ width: 13, height: 13, color: LAV(0.95) }} strokeWidth={2} />
                <span className="font-body font-medium text-[13px]" style={{ color: LAV(0.95) }}>{i === 0 ? typed(task.ai, seg(q, 0.32, 0.6)) : task.ai}</span>
              </span>
            )}
            {level === 2 && doneP > 0.01 && (
              <span className="font-body font-medium text-[13px]" style={{ color: EMER(0.9), opacity: doneP }}>{task.ai} · utført</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end shrink-0" style={{ minWidth: 96 }}>
          {level === 0 && (
            <span className="inline-flex items-center gap-1 font-body text-[13.5px]" style={{ color: QUIET(0.9) }}>Gjør selv <ChevronRight style={{ width: 15, height: 15 }} strokeWidth={2} /></span>
          )}
          {level === 1 && (
            <span className="inline-flex items-center font-body font-semibold text-[13px]" style={{ padding: '6px 15px', borderRadius: 999, color: LAV(0.95), background: LAV(0.1), opacity: Math.min(1, aiP * 1.5), transform: `translateY(${((1 - Math.min(1, aiP * 1.5)) * 4).toFixed(1)}px)` }}>Godkjenn</span>
          )}
          {level === 2 && doneP < 0.55 && (
            <span className="inline-flex items-center gap-1.5">
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: LAV(0.9), opacity: 0.4 + 0.6 * Math.abs(Math.sin(clock * 3)) }} />
              <span className="font-body text-[13px]" style={{ color: LAV(0.9) }}>Utfører…</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ===================== HOVEDKOMPONENT ===================== */
export function SeksjonAutopilot() {
  const sectionRef = useRef(null);
  const stepStartRef = useRef(0);
  const autoElapsedRef = useRef(0);
  const prevRef = useRef(0);
  const pausedRef = useRef(false);

  const [level, setLevel] = useState(0);
  const [prog, setProg] = useState({ rev: 0, auto: 0 });
  const [clock, setClock] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce) { setProg({ rev: 1, auto: 0 }); return; }
    if (!inView) return;
    let raf;
    let lastSample = 0;
    const now0 = performance.now();
    stepStartRef.current = now0;
    autoElapsedRef.current = 0;
    prevRef.current = now0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const frameDt = now - prevRef.current;
      prevRef.current = now;
      if (!pausedRef.current) autoElapsedRef.current += frameDt;
      if (now - lastSample >= 33) {
        lastSample = now;
        setClock(now / 1000);
        setProg({ rev: clamp01((now - stepStartRef.current) / (REVEAL_DUR * 1000)), auto: clamp01(autoElapsedRef.current / (STEP_DUR * 1000)) });
      }
      if (!pausedRef.current && autoElapsedRef.current >= STEP_DUR * 1000) {
        stepStartRef.current = now;
        autoElapsedRef.current = 0;
        setLevel((a) => (a + 1) % LEVELS.length);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView]);

  const selectLevel = (i) => {
    setLevel(i);
    const now = performance.now();
    stepStartRef.current = now;
    autoElapsedRef.current = 0;
    prevRef.current = now;
    setProg({ rev: 0, auto: 0 });
  };

  const hoverOn = () => { pausedRef.current = true; };
  const hoverOff = () => { pausedRef.current = false; };

  const q = prog.rev;
  let count = TASKS.length;
  if (level === 2) {
    count = TASKS.reduce((acc, _, i) => {
      const doneAt = 0.18 + i * 0.12;
      return acc - (easeOutCubic(seg(q, doneAt, doneAt + 0.1)) > 0.5 ? 1 : 0);
    }, TASKS.length);
  }
  const emptyP = level === 2 ? easeOutCubic(seg(q, 0.9, 1.0)) : 0;
  const statusLine = level === 0
    ? 'Du gjør hvert steg selv.'
    : level === 1
      ? 'Motoren forbereder hvert steg. Du godkjenner.'
      : count > 0 ? 'Motoren utfører — uten at du løfter en finger.' : 'Alt er håndtert.';

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 46% 40% at 50% -6%, rgba(155,91,214,0.05), transparent 70%)' }} />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-36">
        {/* MANIFEST */}
        <div className="max-w-2xl mx-auto text-center">
          <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">En ny måte å drive utleie på</p>
          <h2 className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(32px,4.6vw,58px)] text-ink">
            Ikke et verktøy du betjener.<br />
            <span className="dh-ink-shine">En motor som driver.</span>
          </h2>
          <p className="mt-6 text-[18px] leading-relaxed text-quiet max-w-xl mx-auto">
            Ikke hundre funksjoner — én motor. Den finner selv hva som haster, foreslår neste steg, og utfører når du lar den. Skru opp autopiloten og se listen tømme seg selv.
          </p>
        </div>

        {/* FOKUSERT SPOR */}
        <div className="mt-14 lg:mt-16 max-w-2xl mx-auto" onPointerEnter={hoverOn} onPointerLeave={hoverOff}>
          {/* autopilot-kontroll */}
          <div className="flex flex-col items-center">
            <div className="inline-flex items-center p-1 rounded-full" style={{ background: 'rgba(22,18,31,0.05)' }}>
              {LEVELS.map((lv, i) => {
                const on = i === level;
                return (
                  <button key={lv.tag} onClick={() => selectLevel(i)} className="relative rounded-full transition-colors duration-300" style={{ padding: '8px 18px', color: on ? INK(0.95) : QUIET(0.9) }}>
                    {on && (
                      <span className="absolute inset-0 rounded-full" style={{ background: '#fff', boxShadow: '0 1px 3px rgba(22,18,31,0.12), 0 4px 12px rgba(22,18,31,0.06)' }}>
                        <span className="absolute left-3.5 right-3.5 bottom-[3px] h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,#9B5BD6,#CF97FC)', transform: `scaleX(${prog.auto.toFixed(3)})`, transformOrigin: 'left' }} />
                      </span>
                    )}
                    <span className="relative font-body font-semibold text-[13.5px] whitespace-nowrap">{lv.tag}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 font-body text-[14px] text-quiet">{statusLine}</p>
          </div>

          {/* listen */}
          <div className="relative mt-10" style={{ minHeight: ROWH * TASKS.length }}>
            <div aria-hidden={emptyP > 0.5}>
              {TASKS.map((t, i) => (
                <TaskRow key={i} task={t} level={level} q={q} i={i} clock={clock} />
              ))}
            </div>

            {/* rolig tom-tilstand */}
            {emptyP > 0.01 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none" style={{ opacity: emptyP, transform: `translateY(${((1 - emptyP) * 10).toFixed(1)}px)` }}>
                <span className="relative inline-flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: '50%', background: EMER(0.1) }}>
                  <span className="absolute pointer-events-none" style={{ inset: -10, borderRadius: '50%', background: `radial-gradient(circle, ${EMER(0.16)}, transparent 70%)`, opacity: 0.5 + 0.5 * Math.abs(Math.sin(clock * 1.5)) }} />
                  <svg viewBox="0 0 24 24" className="relative" style={{ width: 26, height: 26 }} fill="none">
                    <path d="M5 12.5 L10 17.5 L19 7" stroke={EMER(0.95)} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="mt-5 font-heading font-bold text-[24px] tracking-[-0.02em] text-ink">Alt er gjort.</p>
                <p className="mt-2 font-body text-[15px] text-quiet max-w-xs">Ingenting krever deg akkurat nå. Motoren tar resten — døgnet rundt.</p>
              </div>
            )}
          </div>

          {/* diskret teller */}
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="font-heading font-bold tabular-nums text-[20px] tracking-[-0.02em] transition-colors duration-300" style={{ color: count === 0 ? EMER(0.9) : INK(0.9) }}>{count}</span>
            <span className="font-body text-[14px] text-quiet">{count === 1 ? 'oppgave igjen i køen' : 'oppgaver igjen i køen'}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
