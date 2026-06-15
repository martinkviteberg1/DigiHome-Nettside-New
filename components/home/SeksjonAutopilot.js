'use client';

/*
  Seksjon 2 (/2) — «Operasjonssentralen» / autopilot-motoren.
  Manifest øverst (motor, ikke funksjoner), og under: en levende, lys cockpit-skjerm
  som DRIVER seg selv. Venstre kolonne er en autopilot-nivåvelger
  (Manuell → Assistert → Autopilot). Når nivået skrus opp, forbereder og deretter
  utfører motoren oppgavene selv — prioritetskøen tømmer seg.

  Samme visuelle språk som filmseksjonen: varmt papir, kantløse flater, lavendel-aksent,
  kino-atmosfære inne i skjermen, dybde/tilt, autospill med pause på hover.
  --su = 1 % av skjermens bredde.
*/

import { useEffect, useRef, useState } from 'react';
import { Sparkles, Wallet, Wrench, KeyRound, ChevronRight, Gauge } from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, typed } from '@/components/video/filmUtils';

/* ---------- enheter & palett ---------- */
const u = (n) => `calc(var(--su) * ${typeof n === 'number' ? n.toFixed(3) : n})`;
const INK = (a = 1) => `rgba(22,18,31,${a})`;
const QUIET = (a = 1) => `rgba(124,116,102,${a})`;
const LAV = (a = 1) => `rgba(155,91,214,${a})`;
const LAVS = (a = 1) => `rgba(207,151,252,${a})`;
const EMER = (a = 1) => `rgba(24,121,78,${a})`;
const AMBER = (a = 1) => `rgba(176,98,10,${a})`;
const HAIR = INK(0.08);

const REVEAL_DUR = 1.6;
const STEP_DUR = 6.2;

const riseIn = (p, d = 2.4) => ({ opacity: Math.min(1, p * 1.5), transform: `translateY(${u((1 - p) * d)})` });

/* ---------- delte byggesteiner ---------- */
function Check({ p = 1, size = 3 }) {
  if (p <= 0.01) return null;
  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: u(size), height: u(size), borderRadius: '50%', background: EMER(0.1), opacity: Math.min(1, p * 1.6), transform: `scale(${(0.8 + 0.2 * easeOutCubic(p)).toFixed(3)})` }}>
      <svg viewBox="0 0 12 12" style={{ width: '56%', height: '56%' }} fill="none">
        <path d="M2.6 6.4 L5 8.7 L9.5 3.6" stroke={EMER(0.95)} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function AiBadge({ p, clock, label }) {
  if (p <= 0.01) return null;
  const dots = '.'.repeat(1 + (Math.floor(clock * 2) % 3));
  const spin = (clock * 90) % 360;
  return (
    <div className="inline-flex items-center" style={{ gap: u(1), opacity: Math.min(1, p * 1.6) }}>
      <Sparkles style={{ width: u(2.1), height: u(2.1), color: LAV(0.95), transform: `rotate(${spin.toFixed(0)}deg)` }} strokeWidth={2} />
      <span className="font-body font-semibold" style={{ fontSize: u(1.7), color: LAV(0.95) }}>{label}{dots}</span>
    </div>
  );
}

/* ---------- kino-atmosfære (inne i skjermen) ---------- */
const NOISE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

function AuroraLight({ clock, lvl }) {
  const b1 = 0.8 + 0.2 * Math.sin(clock * 0.4);
  const warm = clamp01(lvl / 2); // mer lavendel-energi jo høyere autopilot
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute" style={{ left: '2%', top: '-6%', width: '74%', height: '58%', background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${LAV(0.08 + 0.05 * warm)}, transparent 70%)`, opacity: b1.toFixed(3), transform: `translate3d(${(Math.sin(clock * 0.25) * 3).toFixed(2)}%, ${(Math.cos(clock * 0.2) * 2).toFixed(2)}%, 0)` }} />
      <div className="absolute" style={{ right: '0%', bottom: '-2%', width: '66%', height: '54%', background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${EMER(0.04 + 0.06 * warm)}, transparent 70%)`, opacity: 0.9, transform: `translate3d(${(Math.cos(clock * 0.22) * -3).toFixed(2)}%, ${(Math.sin(clock * 0.18) * 2).toFixed(2)}%, 0)` }} />
    </div>
  );
}

function GrainLight() {
  return <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: '170px 170px', opacity: 0.025, mixBlendMode: 'multiply' }} />;
}

/* ---------- cockpit-data (ekte innhold) ---------- */
const STATS = [
  { v: '12 %', l: 'Utleiegrad' },
  { v: '2', l: 'Leieforhold' },
  { v: '14', l: 'Ledige' },
  { v: '16 d', l: 'Innflytting' },
];

const TASKS = [
  { type: 'Depositum', Icon: Wallet, accent: LAV, title: 'Depositum ikke startet', meta: 'Olaf Ryes vei 11C · 55 500 kr', ai: 'Starter depositumsprosess' },
  { type: 'Sak', Icon: Wrench, accent: AMBER, title: 'Sak: støy fra nabo', meta: 'Olaf Ryes vei 11C · åpen sak', ai: 'Utkast til svar klart' },
  { type: 'Sak', Icon: Wrench, accent: AMBER, title: 'Ødelagt komfyr meldt', meta: 'Olaf Ryes vei 11C · leietaker', ai: 'Bestiller håndverker' },
  { type: 'Innflytting', Icon: KeyRound, accent: EMER, title: 'Innflytting om 16 dager', meta: 'Martin Test · Olaf Ryes vei 11C', ai: 'Klargjør protokoll' },
];

/* ---------- selve cockpiten ---------- */
function Cockpit({ level, q, clock }) {
  const head = easeOutCubic(seg(q, 0.0, 0.16));
  const statsIn = easeOutCubic(seg(q, 0.1, 0.28));
  const resolved = easeInOutCubic(seg(q, 0.24, 0.96));
  const count = level < 2 ? 5 : Math.round(5 * (1 - resolved));

  const statusText = level === 0 ? 'handlinger venter' : level === 1 ? 'forslag klare' : count > 0 ? 'utfører automatisk' : '— alt kjører';
  const levelName = ['Manuell', 'Assistert', 'Autopilot'][level];

  return (
    <div className="absolute inset-0 flex flex-col justify-center" style={{ padding: `${u(5)} ${u(5.5)}` }}>
      {/* header */}
      <div style={riseIn(head, 2)}>
        <div className="flex items-center" style={{ gap: u(1.2) }}>
          <Gauge style={{ width: u(2.2), height: u(2.2), color: LAV(0.9) }} strokeWidth={2} />
          <span className="font-body font-semibold uppercase" style={{ fontSize: u(1.55), letterSpacing: '0.26em', color: QUIET(0.85) }}>Operasjonssentral</span>
          <span className="inline-flex items-center" style={{ marginLeft: 'auto', gap: u(0.8) }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: i <= level ? u(2.6) : u(1.4), height: u(0.8), borderRadius: 999, background: i <= level ? LAV(0.9) : INK(0.12), transition: 'all 500ms' }} />
            ))}
            <span className="font-body font-semibold uppercase" style={{ fontSize: u(1.4), letterSpacing: '0.18em', color: LAV(0.9), marginLeft: u(0.6) }}>{levelName}</span>
          </span>
        </div>
        <div className="flex items-baseline" style={{ gap: u(1.4), marginTop: u(1.4) }}>
          <span className="font-heading font-bold" style={{ fontSize: u(7), lineHeight: 1, color: count > 0 ? INK(0.96) : EMER(0.9), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{count}</span>
          <span className="font-body" style={{ fontSize: u(2.2), color: QUIET(1) }}>{statusText}</span>
        </div>
      </div>

      {/* stat-stripe */}
      <div className="flex items-stretch" style={{ marginTop: u(3), opacity: statsIn }}>
        {STATS.map((s, i) => (
          <div key={s.l} className="flex-1" style={{ borderLeft: i ? `1px solid ${HAIR}` : 'none', paddingLeft: i ? u(2) : 0 }}>
            <p className="font-heading font-bold" style={{ fontSize: u(2.8), color: INK(0.92), fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{s.v}</p>
            <p className="font-body uppercase" style={{ fontSize: u(1.35), letterSpacing: '0.12em', color: QUIET(0.8), marginTop: u(0.7) }}>{s.l}</p>
          </div>
        ))}
      </div>

      <div style={{ height: 1, background: HAIR, marginTop: u(3), marginBottom: u(2) }} />

      {/* prioritetskø */}
      <div className="flex items-center" style={{ marginBottom: u(0.5) }}>
        <span className="font-body font-semibold uppercase" style={{ fontSize: u(1.5), letterSpacing: '0.24em', color: QUIET(0.8) }}>Prioritetskø</span>
        <span className="font-body" style={{ marginLeft: 'auto', fontSize: u(1.6), color: QUIET(0.8) }}>{TASKS.length} oppgaver</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
        {TASKS.map((t, i) => {
          const rowIn = easeOutCubic(seg(q, 0.16 + i * 0.05, 0.32 + i * 0.05));
          const aiP = easeOutCubic(seg(q, 0.32 + i * 0.1, 0.5 + i * 0.1));
          const doneAt = 0.3 + i * 0.15;
          const doneP = easeOutCubic(seg(q, doneAt, doneAt + 0.14));
          const dim = level === 2 ? 1 - 0.4 * doneP : 1;
          return (
            <div key={i} className="flex items-center" style={{ height: u(12.5), gap: u(2), padding: `0 ${u(0.5)}`, borderTop: i ? `1px solid ${HAIR}` : 'none', opacity: rowIn * dim, transform: `translateY(${u((1 - rowIn) * 1.5)})`, transition: 'opacity 450ms' }}>
              <span className="inline-flex items-center justify-center shrink-0" style={{ width: u(6), height: u(6), borderRadius: u(1.8), background: t.accent(0.1) }}>
                <t.Icon style={{ width: u(3), height: u(3), color: t.accent(0.95) }} strokeWidth={2} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-body font-semibold truncate" style={{ fontSize: u(2.15), color: INK(0.9) }}>{t.title}</p>
                <p className="font-body truncate" style={{ fontSize: u(1.7), color: QUIET(0.9), marginTop: u(0.2) }}>{t.meta}</p>
                <div style={{ height: u(2.6), marginTop: u(0.4) }}>
                  {level === 1 && aiP > 0.01 && (
                    <span className="inline-flex items-center" style={{ gap: u(0.8), opacity: Math.min(1, aiP * 1.5) }}>
                      <Sparkles style={{ width: u(1.7), height: u(1.7), color: LAV(0.9) }} strokeWidth={2} />
                      <span className="font-body font-medium" style={{ fontSize: u(1.7), color: LAV(0.9) }}>
                        AI foreslår: {i === 0 ? typed(t.ai, seg(q, 0.34, 0.6)) : t.ai}
                      </span>
                    </span>
                  )}
                  {level === 2 && doneP > 0.01 && (
                    <span className="font-body font-medium" style={{ fontSize: u(1.7), color: EMER(0.9), opacity: doneP }}>{t.ai} · ferdig</span>
                  )}
                </div>
              </div>

              {/* høyre handling */}
              <div className="flex items-center justify-end shrink-0" style={{ minWidth: u(20) }}>
                {level === 0 && (
                  <span className="inline-flex items-center" style={{ gap: u(0.6), color: QUIET(0.9) }}>
                    <span className="font-body" style={{ fontSize: u(1.85) }}>Gjør selv</span>
                    <ChevronRight style={{ width: u(2.2), height: u(2.2) }} strokeWidth={2} />
                  </span>
                )}
                {level === 1 && (
                  <span className="inline-flex items-center" style={{ gap: u(1), padding: `${u(1.1)} ${u(2.2)}`, borderRadius: 999, background: LAV(0.95), opacity: Math.min(1, aiP * 1.5), transform: `translateY(${u((1 - Math.min(1, aiP * 1.5)) * 1)})` }}>
                    <span className="font-body font-semibold" style={{ fontSize: u(1.8), color: '#fff' }}>Godkjenn</span>
                  </span>
                )}
                {level === 2 && (
                  doneP < 0.55 ? (
                    <span className="inline-flex items-center" style={{ gap: u(0.9) }}>
                      <span style={{ width: u(1.4), height: u(1.4), borderRadius: '50%', background: LAV(0.9), opacity: 0.5 + 0.5 * Math.abs(Math.sin(clock * 3)) }} />
                      <span className="font-body" style={{ fontSize: u(1.8), color: LAV(0.9) }}>Utfører…</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center" style={{ gap: u(0.9) }}>
                      <Check p={doneP} size={3} />
                      <span className="font-body font-medium" style={{ fontSize: u(1.8), color: EMER(0.9) }}>Utført</span>
                    </span>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* footer-status */}
      <div className="flex items-center" style={{ gap: u(1.2), marginTop: u(2), paddingTop: u(2), borderTop: `1px solid ${HAIR}` }}>
        <Sparkles style={{ width: u(2), height: u(2), color: level === 2 ? EMER(0.9) : LAV(0.9) }} strokeWidth={2} />
        <span className="font-body" style={{ fontSize: u(1.85), color: QUIET(1) }}>
          {level === 0 ? 'Du gjør hvert steg selv.' : level === 1 ? 'Motoren forbereder hvert steg. Du godkjenner.' : 'Motoren driver alt selv — du trenger ikke gjøre noe.'}
        </span>
      </div>
    </div>
  );
}

/* ---------- nivå-data ---------- */
const LEVELS = [
  { tag: 'Manuell', sub: 'Du gjør hvert steg selv', desc: 'Alt samlet på ett sted — utleiegrad, frister, saker og pipeline. Full oversikt og full kontroll. Men hvert steg gjør du selv.' },
  { tag: 'Assistert', sub: 'AI forbereder, du godkjenner', desc: 'Motoren finner neste steg, skriver utkastet og legger oppgavene i riktig rekkefølge. Du trenger bare å trykke godkjenn.' },
  { tag: 'Autopilot', sub: 'Motoren driver alt selv', desc: 'Depositum, oppfølging, frister og svar håndteres automatisk, døgnet rundt. Køen tømmer seg selv — mens du gjør andre ting.' },
];

/* ===================== HOVEDKOMPONENT ===================== */
export function SeksjonAutopilot() {
  const sectionRef = useRef(null);
  const tiltRef = useRef(null);
  const stageRef = useRef(null);
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
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => { el.style.setProperty('--su', `${entry.contentRect.width / 100}px`); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  useEffect(() => {
    const zone = stageRef.current;
    const inner = tiltRef.current;
    if (!zone || !inner) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const st = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, hover: false };
    const step = () => {
      st.cx += (st.tx - st.cx) * 0.06;
      st.cy += (st.ty - st.cy) * 0.06;
      inner.style.transform = `rotateX(${(-st.cy * 1.7).toFixed(3)}deg) rotateY(${(st.cx * 2.2).toFixed(3)}deg)`;
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
  const camDrift = `translateY(${u(Math.sin(clock * 0.4) * 0.4)}) scale(${(1 + 0.008 * Math.sin(clock * 0.32 + 1)).toFixed(4)})`;

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 44% at 92% 0%, rgba(155,91,214,0.05), transparent 70%), radial-gradient(ellipse 48% 40% at 4% 100%, rgba(24,121,78,0.04), transparent 72%)' }} />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-36">
        {/* MANIFEST */}
        <div className="max-w-3xl">
          <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">En ny måte å drive utleie på</p>
          <h2 className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.03] text-[clamp(34px,5vw,64px)] text-ink">
            Ikke et verktøy du betjener.<br />
            <span className="dh-ink-shine">En motor som driver.</span>
          </h2>
          <p className="mt-7 text-[19px] leading-relaxed text-quiet max-w-2xl">
            DigiHome er ikke et system med hundre funksjoner du må lære deg. Det er én motor som driver utleien din — den finner selv hva som haster, foreslår neste steg, og utfører når du lar den. Du eier. Motoren driver.
          </p>
        </div>

        {/* DEMO */}
        <div className="mt-16 lg:mt-24 grid lg:grid-cols-2 gap-12 lg:gap-16 items-start" onPointerEnter={hoverOn} onPointerLeave={hoverOff}>
          {/* venstre: autopilot-nivåvelger */}
          <div className="lg:pt-6">
            <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">Skru opp autopiloten</p>
            <p className="mt-3 text-[15px] text-quiet leading-relaxed max-w-sm">Tre nivåer. Du bestemmer hvor mye av driften motoren skal gjøre — fra full kontroll til full autopilot.</p>
            <div role="tablist" aria-label="Autopilot-nivå" className="mt-8">
              {LEVELS.map((lv, i) => {
                const isActive = i === level;
                return (
                  <button
                    key={lv.tag}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectLevel(i)}
                    className="group relative block w-full text-left pl-7 py-[18px] outline-none"
                  >
                    <span className="absolute left-0 top-0 bottom-0 w-px" style={{ background: '#EBE6DF' }} />
                    {isActive && <span className="absolute left-0 top-0 w-px" style={{ height: `${(prog.auto * 100).toFixed(1)}%`, background: 'linear-gradient(180deg,#9B5BD6,#CF97FC)' }} />}
                    <span className="absolute rounded-full transition-all duration-500" style={{ left: -3.5, top: 0, marginTop: '24px', width: isActive ? 8 : 6, height: isActive ? 8 : 6, background: isActive ? '#9B5BD6' : '#D8D1C7', boxShadow: isActive ? '0 0 0 5px rgba(155,91,214,0.12)' : 'none' }} />
                    <div className="flex items-baseline gap-3">
                      <span className="font-body font-semibold tabular-nums text-[12px] tracking-[0.1em] transition-colors duration-500" style={{ color: isActive ? '#9B5BD6' : '#9B9080' }}>0{i + 1}</span>
                      <span className={`font-heading font-bold tracking-[-0.02em] transition-colors duration-500 text-[20px] ${isActive ? 'text-ink' : 'text-ink/40 group-hover:text-ink/65'}`}>{lv.tag}</span>
                      <span className={`font-body text-[13px] transition-colors duration-500 ${isActive ? 'text-quiet' : 'text-ink/25'}`}>· {lv.sub}</span>
                    </div>
                    <div className="overflow-hidden transition-all" style={{ maxHeight: isActive ? 130 : 0, opacity: isActive ? 1 : 0, transitionDuration: '600ms', transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}>
                      <p className="mt-2.5 text-[15px] leading-relaxed text-quiet max-w-md">{lv.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* payoff */}
            <div className="mt-10 pl-7 flex items-center gap-4">
              <span className="font-heading font-bold tracking-[-0.03em] text-[clamp(34px,4vw,52px)] leading-none" style={{ color: '#9B5BD6' }}>0</span>
              <span className="text-[15px] leading-snug text-quiet max-w-[220px]">oppgaver igjen i køen når motoren står på full autopilot</span>
            </div>

          </div>

          {/* høyre: levende cockpit */}
          <div className="relative" style={{ perspective: '1700px' }}>
            <div ref={tiltRef} style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
              <div
                ref={stageRef}
                className="relative w-full overflow-hidden rounded-[24px]"
                style={{ aspectRatio: '1 / 1.04', background: 'linear-gradient(180deg,#FFFFFF,#FCFAFE)', boxShadow: '0 2px 4px rgba(22,18,31,0.04), 0 44px 96px -38px rgba(22,18,31,0.36)', border: '1px solid rgba(22,18,31,0.05)', '--su': '6px' }}
              >
                <AuroraLight clock={clock} lvl={level} />
                <div className="absolute inset-0" style={{ transform: camDrift, transformOrigin: '50% 46%' }}>
                  <Cockpit level={level} q={prog.rev} clock={clock} />
                </div>
                <GrainLight />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
