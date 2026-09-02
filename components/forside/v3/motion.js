'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Bevegelsesverktøy for forside-V3.
   Én regel: produktet beveger seg, siden gjør det ikke.
   Kun opacity/transform. prefers-reduced-motion → stabilt sluttbilde.
--------------------------------------------------------------------------- */

export const heading = { fontFamily: 'var(--font-heading), sans-serif' };
export const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

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

/* Krysstoning mellom to tilstander — grid-stack så bredden er stabil */
export function Bytt({ vis, a, b, className = '' }) {
  return (
    <span className={`inline-grid ${className}`}>
      <span className="col-start-1 row-start-1" style={{ opacity: vis ? 0 : 1, transform: vis ? 'translateY(-4px)' : 'none', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }}>{a}</span>
      <span className="col-start-1 row-start-1" style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', transition: `opacity 450ms ${EASE}, transform 450ms ${EASE}` }} aria-hidden={!vis}>{b}</span>
    </span>
  );
}

/* Krysstoning mellom flere tilstander (stack) */
export function Stakk({ idx, className = '', children }) {
  const barn = React.Children.toArray(children);
  return (
    <div className={`grid ${className}`}>
      {barn.map((b, i) => (
        <div key={i} className="col-start-1 row-start-1" style={{ opacity: idx === i ? 1 : 0, transform: idx === i ? 'none' : 'translateY(6px)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}`, pointerEvents: idx === i ? 'auto' : 'none' }} aria-hidden={idx !== i}>{b}</div>
      ))}
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
