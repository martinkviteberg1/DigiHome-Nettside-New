'use client';

/*
  Seksjon 2 (/2) — «Operasjonssentralen» som ET MØRKT KONTROLLROM.
  Selve seksjonen ER cockpiten: en bred, ekte operasjonssentral der autopilot-bryteren
  bor i toppen. Når du skrur den opp (Manuell → Assistert → Autopilot) reagerer hele
  sentralen — prioritetskøen forberedes og deretter tømmer seg selv.

  Mørkt motorrom på lyst papir = dramatisk «dette er motoren», men sømløst i flyten.
  Responsiv og lesbar (ikke su-skalert) — stabler pent på mobil.
*/

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Wallet, Wrench, KeyRound, ChevronRight, Gauge, Clock } from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, typed } from '@/components/video/filmUtils';

const REVEAL_DUR = 1.6;
const STEP_DUR = 7.0;

/* mørk palett */
const AC = {
  lav: { fg: '#C9A2FF', bg: 'rgba(155,91,214,0.16)' },
  amber: { fg: '#F2B45E', bg: 'rgba(242,180,94,0.14)' },
  emer: { fg: '#46D6A0', bg: 'rgba(70,214,160,0.14)' },
};

const LEVELS = [
  { tag: 'Manuell', short: 'Manuell' },
  { tag: 'Assistert', short: 'Assistert' },
  { tag: 'Autopilot', short: 'Autopilot' },
];

const KPIS = [
  { v: '12 %', l: 'Utleiegrad' },
  { v: '2', l: 'Leieforhold' },
  { v: '14', l: 'Ledige' },
  { v: '1', l: 'Innflytting' },
  { v: '0', l: 'Haster' },
];

const TASKS = [
  { Icon: Wallet, accent: 'lav', title: 'Depositum ikke startet', meta: 'Olaf Ryes vei 11C · 55 500 kr', ai: 'Starter depositumsprosess' },
  { Icon: Wallet, accent: 'lav', title: 'Depositum venter på betaling', meta: 'Sofiegaten 4 · 54 000 kr', ai: 'Sender påminnelse til leietaker' },
  { Icon: Wrench, accent: 'amber', title: 'Sak: støy fra nabo', meta: 'Olaf Ryes vei 11C · åpen sak', ai: 'Utkast til svar er klart' },
  { Icon: Wrench, accent: 'amber', title: 'Ødelagt komfyr meldt', meta: 'Olaf Ryes vei 11C · leietaker', ai: 'Bestiller håndverker' },
];

const PIPELINE = [
  { l: 'Utkast', n: 1 },
  { l: 'Annonsert', n: 0 },
  { l: 'Leads', n: 0 },
  { l: 'Visning', n: 0 },
  { l: 'Søkere', n: 0 },
  { l: 'Kontrakt', n: 0 },
];

/* ---------- små byggesteiner ---------- */
function Check({ p = 1, size = 18 }) {
  if (p <= 0.01) return null;
  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: size, height: size, borderRadius: '50%', background: AC.emer.bg, opacity: Math.min(1, p * 1.6), transform: `scale(${(0.8 + 0.2 * easeOutCubic(p)).toFixed(3)})` }}>
      <svg viewBox="0 0 12 12" style={{ width: '56%', height: '56%' }} fill="none">
        <path d="M2.6 6.4 L5 8.7 L9.5 3.6" stroke={AC.emer.fg} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Panel({ label, children }) {
  return (
    <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <p className="font-body font-semibold uppercase text-[10px] tracking-[0.22em] text-white/40 mb-3.5">{label}</p>
      {children}
    </div>
  );
}

/* ---------- autopilot-bryter ---------- */
function AutopilotSwitch({ level, auto, onSelect }) {
  return (
    <div className="flex items-center gap-3 shrink-0">
      <span className="font-body font-semibold uppercase text-[10px] tracking-[0.24em] text-white/35 hidden sm:inline">Autopilot</span>
      <div className="relative flex items-center p-1 rounded-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}>
        {LEVELS.map((lv, i) => {
          const on = i === level;
          return (
            <button
              key={lv.short}
              onClick={() => onSelect(i)}
              className="relative rounded-full transition-colors duration-300"
              style={{ padding: '7px 14px', color: on ? '#fff' : 'rgba(255,255,255,0.5)' }}
            >
              {on && (
                <span className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(180deg,#A063E0,#7C3FB0)', boxShadow: '0 6px 18px rgba(155,91,214,0.55), inset 0 1px 0 rgba(255,255,255,0.25)' }}>
                  <span className="absolute left-2.5 right-2.5 bottom-[3px] h-[2px] rounded-full" style={{ background: 'rgba(255,255,255,0.5)', transform: `scaleX(${auto.toFixed(3)})`, transformOrigin: 'left' }} />
                </span>
              )}
              <span className="relative font-body font-semibold text-[12.5px] whitespace-nowrap">{lv.short}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- en oppgaverad ---------- */
function TaskRow({ task, level, q, i, clock }) {
  const a = AC[task.accent];
  const rowIn = easeOutCubic(seg(q, 0.12 + i * 0.05, 0.3 + i * 0.05));
  const aiP = easeOutCubic(seg(q, 0.3 + i * 0.1, 0.5 + i * 0.1));
  const doneAt = 0.3 + i * 0.16;
  const doneP = easeOutCubic(seg(q, doneAt, doneAt + 0.14));
  const dim = level === 2 ? 1 - 0.42 * doneP : 1;

  return (
    <div
      className="flex items-center gap-3 rounded-xl px-3.5 py-3"
      style={{ background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)', opacity: rowIn * dim, transform: `translateY(${((1 - rowIn) * 8).toFixed(1)}px)`, transition: 'opacity 450ms ease, background 450ms ease' }}
    >
      <span className="inline-flex items-center justify-center shrink-0" style={{ width: 34, height: 34, borderRadius: 10, background: a.bg }}>
        <task.Icon style={{ width: 16, height: 16, color: a.fg }} strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body font-semibold text-white/90 text-[14px] truncate">{task.title}</p>
        <p className="font-body text-white/45 text-[12px] truncate mt-0.5">{task.meta}</p>
        <div style={{ height: 16, marginTop: 3 }}>
          {level === 1 && aiP > 0.01 && (
            <span className="inline-flex items-center gap-1.5" style={{ opacity: Math.min(1, aiP * 1.5) }}>
              <Sparkles style={{ width: 12, height: 12, color: AC.lav.fg }} strokeWidth={2} />
              <span className="font-body font-medium text-[12px]" style={{ color: AC.lav.fg }}>
                AI foreslår: {i === 0 ? typed(task.ai, seg(q, 0.34, 0.62)) : task.ai}
              </span>
            </span>
          )}
          {level === 2 && doneP > 0.01 && (
            <span className="font-body font-medium text-[12px]" style={{ color: AC.emer.fg, opacity: doneP }}>{task.ai} · ferdig</span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end shrink-0" style={{ minWidth: 92 }}>
        {level === 0 && (
          <span className="inline-flex items-center gap-1 text-white/45 font-body text-[12.5px]">Gjør selv <ChevronRight style={{ width: 15, height: 15 }} strokeWidth={2} /></span>
        )}
        {level === 1 && (
          <span className="inline-flex items-center rounded-full font-body font-semibold text-[12.5px] text-white" style={{ padding: '6px 14px', background: 'linear-gradient(180deg,#A063E0,#7C3FB0)', boxShadow: '0 4px 12px rgba(155,91,214,0.45)', opacity: Math.min(1, aiP * 1.5), transform: `translateY(${((1 - Math.min(1, aiP * 1.5)) * 4).toFixed(1)}px)` }}>Godkjenn</span>
        )}
        {level === 2 && (
          doneP < 0.55 ? (
            <span className="inline-flex items-center gap-1.5">
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: AC.lav.fg, opacity: 0.4 + 0.6 * Math.abs(Math.sin(clock * 3)) }} />
              <span className="font-body text-[12.5px]" style={{ color: AC.lav.fg }}>Utfører…</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Check p={doneP} size={18} />
              <span className="font-body font-medium text-[12.5px]" style={{ color: AC.emer.fg }}>Utført</span>
            </span>
          )
        )}
      </div>
    </div>
  );
}

/* ===================== HOVEDKOMPONENT ===================== */
export function SeksjonAutopilot() {
  const sectionRef = useRef(null);
  const tiltRef = useRef(null);
  const frameRef = useRef(null);
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
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.15 });
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

  /* subtil dybde mot peker */
  useEffect(() => {
    const zone = frameRef.current;
    const inner = tiltRef.current;
    if (!zone || !inner) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const st = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, hover: false };
    const step = () => {
      st.cx += (st.tx - st.cx) * 0.06;
      st.cy += (st.ty - st.cy) * 0.06;
      inner.style.transform = `rotateX(${(-st.cy * 1.1).toFixed(3)}deg) rotateY(${(st.cx * 1.4).toFixed(3)}deg)`;
      if (st.hover || Math.abs(st.tx - st.cx) + Math.abs(st.ty - st.cy) > 0.001) st.raf = requestAnimationFrame(step);
      else st.raf = 0;
    };
    const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const r = zone.getBoundingClientRect();
      st.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      st.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      st.hover = true; kick();
    };
    const onLeave = () => { st.tx = 0; st.ty = 0; st.hover = false; kick(); };
    zone.addEventListener('pointermove', onMove, { passive: true });
    zone.addEventListener('pointerleave', onLeave, { passive: true });
    return () => { zone.removeEventListener('pointermove', onMove); zone.removeEventListener('pointerleave', onLeave); if (st.raf) cancelAnimationFrame(st.raf); };
  }, []);

  const hoverOn = () => { pausedRef.current = true; };
  const hoverOff = () => { pausedRef.current = false; };

  const q = prog.rev;
  const resolved = easeInOutCubic(seg(q, 0.2, 0.95));
  const count = level < 2 ? 5 : Math.round(5 * (1 - resolved));
  const statusLine = level === 0
    ? 'Du har 5 handlinger som venter — og gjør hvert steg selv.'
    : level === 1
      ? 'AI har forberedt 5 forslag — godkjenn med ett klikk.'
      : count > 0 ? `Motoren utfører automatisk … ${count} igjen i kø.` : 'Alt er håndtert — 0 handlinger i kø.';
  const dot = 0.4 + 0.6 * Math.abs(Math.sin(clock * 2));
  const auroraShift = `translate3d(${(Math.sin(clock * 0.25) * 2).toFixed(2)}%, ${(Math.cos(clock * 0.2) * 2).toFixed(2)}%, 0)`;

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 44% at 90% 2%, rgba(155,91,214,0.05), transparent 70%)' }} />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        {/* MANIFEST */}
        <div className="max-w-3xl">
          <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">En ny måte å drive utleie på</p>
          <h2 className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.03] text-[clamp(34px,5vw,62px)] text-ink">
            Ikke et verktøy du betjener.<br />
            <span className="dh-ink-shine">En motor som driver.</span>
          </h2>
          <p className="mt-7 text-[19px] leading-relaxed text-quiet max-w-2xl">
            DigiHome er ikke et system med hundre funksjoner du må lære deg. Det er én motor — en operasjonssentral som finner selv hva som haster, foreslår neste steg, og utfører når du lar den. Skru opp autopiloten og se den jobbe.
          </p>
        </div>

        {/* KONTROLLROMMET */}
        <div className="mt-14 lg:mt-20" style={{ perspective: '2000px' }} onPointerEnter={hoverOn} onPointerLeave={hoverOff}>
          <div ref={tiltRef} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
            <div
              ref={frameRef}
              className="relative overflow-hidden rounded-[22px] sm:rounded-[30px]"
              style={{ background: 'radial-gradient(130% 120% at 82% -12%, #271E3B 0%, #16121F 46%, #0E0B16 100%)', boxShadow: '0 2px 6px rgba(22,18,31,0.12), 0 70px 130px -46px rgba(40,30,70,0.55)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {/* aurora + korn */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute" style={{ left: '0%', top: '-20%', width: '60%', height: '90%', background: `radial-gradient(ellipse 55% 55% at 50% 50%, rgba(155,91,214,${(0.12 + 0.05 * clamp01(level / 2)).toFixed(3)}), transparent 70%)`, transform: auroraShift }} />
                <div className="absolute" style={{ right: '-6%', bottom: '-25%', width: '58%', height: '90%', background: `radial-gradient(ellipse 55% 55% at 50% 50%, rgba(70,214,160,${(0.05 + 0.07 * clamp01(level / 2)).toFixed(3)}), transparent 70%)` }} />
              </div>

              <div className="relative p-5 sm:p-7 lg:p-9">
                {/* header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <Gauge style={{ width: 19, height: 19, color: AC.lav.fg }} strokeWidth={2} />
                      <span className="font-heading font-bold text-white/92 text-[16px] tracking-[-0.01em]">Operasjonssentral</span>
                      <span className="inline-flex items-center gap-1.5 ml-1">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: level === 2 ? AC.emer.fg : AC.lav.fg, opacity: dot }} />
                      </span>
                    </div>
                    <p className="mt-1.5 font-body text-white/55 text-[13.5px]">{statusLine}</p>
                  </div>
                  <AutopilotSwitch level={level} auto={prog.auto} onSelect={selectLevel} />
                </div>

                {/* KPI */}
                <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-2.5 sm:gap-3">
                  {KPIS.map((k) => (
                    <div key={k.l} className="rounded-xl px-3.5 py-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <p className="font-heading font-bold text-white/92 text-[20px] leading-none tabular-nums">{k.v}</p>
                      <p className="mt-1.5 font-body uppercase text-[9.5px] tracking-[0.14em] text-white/40">{k.l}</p>
                    </div>
                  ))}
                </div>

                {/* body */}
                <div className="mt-5 grid lg:grid-cols-[1.55fr_1fr] gap-5">
                  {/* prioritetskø */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-body font-semibold uppercase text-[10px] tracking-[0.22em] text-white/40">Prioritetskø</span>
                      <div className="hidden sm:flex items-center gap-1.5">
                        {['Alle', 'Depositum', 'Drift'].map((f, i) => (
                          <span key={f} className="font-body text-[11px] rounded-full px-2.5 py-1" style={{ background: i === 0 ? 'rgba(155,91,214,0.18)' : 'rgba(255,255,255,0.05)', color: i === 0 ? AC.lav.fg : 'rgba(255,255,255,0.5)' }}>{f}</span>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      {TASKS.map((t, i) => (
                        <TaskRow key={i} task={t} level={level} q={q} i={i} clock={clock} />
                      ))}
                    </div>
                    {/* footer-status */}
                    <div className="mt-4 flex items-center gap-2">
                      <Sparkles style={{ width: 15, height: 15, color: level === 2 ? AC.emer.fg : AC.lav.fg }} strokeWidth={2} />
                      <span className="font-body text-[13px] text-white/55">
                        {level === 0 ? 'Du gjør hvert steg selv.' : level === 1 ? 'Motoren forbereder hvert steg. Du godkjenner.' : 'Motoren driver alt selv — du trenger ikke gjøre noe.'}
                      </span>
                    </div>
                  </div>

                  {/* høyre skinne */}
                  <div className="space-y-4">
                    <Panel label="Kommende frister">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex flex-col items-center justify-center shrink-0" style={{ width: 42, height: 42, borderRadius: 12, background: AC.emer.bg }}>
                          <span className="font-heading font-bold text-[15px] leading-none" style={{ color: AC.emer.fg }}>16</span>
                          <span className="font-body text-[8px] uppercase tracking-wider mt-0.5" style={{ color: AC.emer.fg }}>dager</span>
                        </span>
                        <div className="min-w-0">
                          <p className="font-body font-semibold text-white/90 text-[13.5px] truncate">Innflytting</p>
                          <p className="font-body text-white/45 text-[12px] truncate mt-0.5">Martin Test · Olaf Ryes vei 11C</p>
                        </div>
                        <Clock style={{ width: 15, height: 15, color: 'rgba(255,255,255,0.3)', marginLeft: 'auto' }} strokeWidth={2} />
                      </div>
                    </Panel>

                    <Panel label="Pipeline">
                      <div className="grid grid-cols-3 gap-x-3 gap-y-4">
                        {PIPELINE.map((s, idx) => {
                          const active = s.n > 0;
                          return (
                            <div key={s.l}>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-heading font-bold text-[16px] tabular-nums" style={{ color: active ? '#fff' : 'rgba(255,255,255,0.35)' }}>{s.n}</span>
                              </div>
                              <p className="font-body text-[10.5px] text-white/40 mt-1">{s.l}</p>
                              <div className="mt-1.5 h-[3px] rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                                <span className="block h-full rounded-full" style={{ width: active ? '70%' : '0%', background: `linear-gradient(90deg, ${AC.lav.fg}, #7C3FB0)` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
