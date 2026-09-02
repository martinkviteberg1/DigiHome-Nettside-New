'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/* ---------------------------------------------------------------------------
   Bevegelsesverktøy for forside-V3.
   Én regel: produktet beveger seg, siden gjør det ikke.
   Kun opacity/transform. prefers-reduced-motion → stabilt sluttbilde.
--------------------------------------------------------------------------- */

export const heading = { fontFamily: 'var(--font-heading), sans-serif' };
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

/* Designtokens V3 — mørk, kinematisk (Linear-klasse). Én aksent: lilla. */
export const T = {
  bg: '#0A0A0B',
  flate: '#111113',
  flate2: '#16161A',
  lilla: '#CF97FC',
  lillaText: '#D9B4FF',
};

/* Etikett — 13 px, medium, setningsform. Aldri versaler. */
export function Etikett({ children, className = '', mork = true }) {
  return <p className={`text-[13px] font-medium ${mork ? 'text-white/45' : 'text-[#8A867F]'} ${className}`}>{children}</p>;
}

/* Display-typografi V3 — Diatype Medium (Inter Display-følelse), rolig tracking.
   Right Grotesk Bold brukes kun inne i produktmockene, slik appen selv gjør. */
export const display = { fontFamily: 'var(--font-body), sans-serif', fontWeight: 500, letterSpacing: '-0.025em', lineHeight: 1.06, textWrap: 'balance' };

/* Knapper V3 — små, rolige. 40 px, radius 10. */
const KNAPP = {
  primar: 'bg-white text-[#0A0A0B] hover:bg-[#E9E6E0]',
  sekundar: 'border border-white/15 bg-white/[0.03] text-white hover:border-white/40 hover:bg-white/[0.06]',
  lys: 'bg-[#0A0A0B] text-white hover:bg-[#232326]',
};
export function Knapp({ href, variant = 'primar', size = 'md', className = '', children, ...rest }) {
  const h = size === 'sm' ? 'h-8 px-3 text-[13px] rounded-[8px]' : 'h-10 px-4 text-[14px] rounded-[10px]';
  const cls = `inline-flex items-center justify-center gap-2 font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0B] ${h} ${KNAPP[variant]} ${className}`;
  if (href && href.startsWith('#')) return <a href={href} className={cls} {...rest}>{children}</a>;
  if (href) return <Link href={href} prefetch className={cls} {...rest}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

/* Tekstlenke med pil */
export function Lenke({ href, className = '', children, ...rest }) {
  const cls = `group inline-flex items-center gap-1.5 text-[14px] font-medium text-white transition-colors hover:text-white/70 ${className}`;
  const pil = <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.8} />;
  if (href.startsWith('#')) return <a href={href} className={cls} {...rest}>{children}{pil}</a>;
  return <Link href={href} className={cls} {...rest}>{children}{pil}</Link>;
}

export function useRedusert() {
  const [r, setR] = useState(false);
  useEffect(() => {
    try { setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* ok */ }
  }, []);
  return r;
}

/* Tidslinje-state-machine. Looper rolig når `kjorer` er sann. */
export function useKoreografi(trinn, kjorer) {
  const [fase, setFase] = useState(0);
  const redusert = useRedusert();
  useEffect(() => { if (!kjorer) setFase(0); }, [kjorer]);
  useEffect(() => {
    if (!kjorer) return undefined;
    if (redusert) { setFase(trinn.length - 1); return undefined; }
    const t = window.setTimeout(() => setFase((f) => (f + 1) % trinn.length), trinn[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase, redusert, trinn]);
  const idx = useMemo(() => {
    const m = {};
    trinn.forEach((t, i) => { m[t.navn] = i; });
    return m;
  }, [trinn]);
  return { fase, navn: trinn[fase].navn, er: (n) => fase >= idx[n] };
}

/* Synlighet i viewport — animasjoner spiller kun når seksjonen er synlig */
export function useSynlig(ref, threshold = 0.25) {
  const [synlig, setSynlig] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSynlig(true); return undefined; }
    const obs = new IntersectionObserver(([entry]) => setSynlig(entry.isIntersecting), { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return synlig;
}

/* Media query som React-state (SSR-trygg: false på server) */
export function useMedia(query) {
  const [m, setM] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia(query);
      const f = () => setM(mq.matches);
      f();
      mq.addEventListener('change', f);
      return () => mq.removeEventListener('change', f);
    } catch (e) { return undefined; }
  }, [query]);
  return m;
}

/* Talloppteller — rAF med ease-out */
export function useTell(aktiv, til, ms = 1100) {
  const [v, setV] = useState(0);
  const redusert = useRedusert();
  useEffect(() => {
    if (!aktiv) { setV(0); return undefined; }
    if (redusert) { setV(til); return undefined; }
    let raf;
    const t0 = performance.now();
    const stegFn = (t) => {
      const p = Math.min((t - t0) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setV(Math.round(til * e));
      if (p < 1) raf = requestAnimationFrame(stegFn);
    };
    raf = requestAnimationFrame(stegFn);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, til, ms, redusert]);
  return v;
}

/* Myk reveal — kun opacity/transform */
export function Inn({ vis, delay = 0, dy = 10, className = '', style = {}, children }) {
  return (
    <div
      className={className}
      style={{
        ...style,
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : `translateY(${dy}px)`,
        transition: `opacity 600ms ${EASE} ${delay}ms, transform 600ms ${EASE} ${delay}ms`,
      }}
      aria-hidden={!vis}
    >{children}</div>
  );
}

/* Krysstoning mellom to tilstander — sekvensiell, grid-stack så bredden er stabil */
export function Bytt({ vis, a, b, className = '' }) {
  const ut = `opacity 180ms ${EASE}, transform 180ms ${EASE}`;
  const inn = `opacity 320ms ${EASE} 200ms, transform 320ms ${EASE} 200ms`;
  return (
    <span className={`inline-grid ${className}`}>
      <span className="col-start-1 row-start-1" style={{ opacity: vis ? 0 : 1, transform: vis ? 'translateY(-3px)' : 'none', transition: vis ? ut : inn }}>{a}</span>
      <span className="col-start-1 row-start-1" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(3px)', transition: vis ? inn : ut }} aria-hidden={!vis}>{b}</span>
    </span>
  );
}

/* Krysstoning mellom flere tilstander (stack) — sekvensiell: ut først, så inn.
   Ingen overlappende tekst midt i overgangen. */
export function Stakk({ idx, className = '', children }) {
  const barn = React.Children.toArray(children);
  return (
    <div className={`grid grid-cols-[minmax(0,1fr)] ${className}`}>
      {barn.map((b, i) => {
        const aktiv = idx === i;
        return (
          <div
            key={i}
            className="col-start-1 row-start-1 min-w-0"
            style={{
              opacity: aktiv ? 1 : 0,
              transform: aktiv ? 'none' : 'translateY(4px)',
              transition: aktiv
                ? `opacity 320ms ${EASE} 200ms, transform 320ms ${EASE} 200ms`
                : `opacity 180ms ${EASE}, transform 180ms ${EASE}`,
              pointerEvents: aktiv ? 'auto' : 'none',
            }}
            aria-hidden={!aktiv}
          >{b}</div>
        );
      })}
    </div>
  );
}

/* Reveal ved scroll — kjører én gang */
export function Avsloer({ children, delay = 0, className = '', dy = 22 }) {
  const ref = useRef(null);
  const [inne, setInne] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let redusert = false;
    try { redusert = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ok */ }
    if (redusert || typeof IntersectionObserver === 'undefined') { setInne(true); return undefined; }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setInne(true); io.disconnect(); }
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className} style={{ opacity: inne ? 1 : 0, transform: inne ? 'none' : `translateY(${dy}px)`, transition: `opacity 900ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms` }}>
      {children}
    </div>
  );
}
