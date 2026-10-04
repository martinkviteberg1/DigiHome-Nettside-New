'use client';
/* ---------------------------------------------------------------------------
   Tidsstyrte scener. ÉN klokke per seksjon – alt i scenen er avledet av tiden `t`
   (sekunder siden seksjonen kom i bildet). `animate=false` (PDF/miniatyr) gir
   t = ∞: sluttilstand uten bevegelse.
--------------------------------------------------------------------------- */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { ease, FLOW_BELOW } from './theme';

const viewport = { amount: 0.4 };
const flowViewport = { amount: 0.05, once: true };

/* «Spill igjen»: Deck øker telleren (tast R); alle klokker i bildet starter på nytt. */
export const ReplayContext = createContext(0);

/* Tempo: hele decket puster litt roligere enn sekundene i T-tabellene sier (1.0 = som skrevet). */
export const PACE = 1.08;

export const useClock = (animate, ref, end) => {
  const inView = useInView(ref, typeof window !== 'undefined' && window.innerWidth < FLOW_BELOW ? flowViewport : viewport);
  const replay = useContext(ReplayContext);
  const [t, setT] = useState(animate ? 0 : Infinity);
  useEffect(() => {
    if (!animate || !inView) return undefined;
    setT(0);
    let raf = 0; let last = 0;
    const t0 = performance.now();
    const tick = (now) => {
      const s = (now - t0) / 1000 / PACE;
      if (s >= end) { setT(Infinity); return; }
      if (now - last >= 40) { last = now; setT(Math.max(s, 0.001)); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, inView, end, replay]);
  return t;
};

export const between = (t, a, b) => t >= a && t < b;

/* Monteres når `show` og glir inn; forsvinner mykt. `grow` animerer også høyden. `spring` gir fjærfysikk på posisjon/skala. */
export const Enter = ({ show, animate, children, y = 8, x = 0, duration = 0.45, delay = 0, grow = false, spring = false, scale, origin, className, style, testid }) => {
  const from = { opacity: 0, y, x, ...(grow ? { height: 0 } : {}), ...(scale != null ? { scale } : {}) };
  const to = { opacity: 1, y: 0, x: 0, ...(grow ? { height: 'auto' } : {}), ...(scale != null ? { scale: 1 } : {}) };
  const tr = spring
    ? { height: { duration, delay, ease }, opacity: { duration: duration * 0.7, delay, ease }, y: { type: 'spring', stiffness: 420, damping: 34, mass: 0.9, delay }, x: { type: 'spring', stiffness: 420, damping: 34, delay }, scale: { type: 'spring', stiffness: 380, damping: 28, delay } }
    : { duration, delay, ease };
  return (
    <AnimatePresence initial={animate}>
      {show && (
        <motion.div className={className} style={{ ...(grow ? { overflow: 'hidden' } : {}), ...(origin ? { transformOrigin: origin } : {}), ...style }} data-testid={testid}
          initial={animate ? from : false} animate={to}
          exit={grow ? { opacity: 0, height: 0, transition: { duration: 0.25, ease } } : { opacity: 0, transition: { duration: 0.2 } }}
          transition={tr}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* Bytter innhold med kryssfading (nøkkel `k`). */
export const Swap = ({ k, animate, children, className, style }) => (
  <AnimatePresence mode="wait" initial={false}>
    <motion.div key={k} className={className} style={style} initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.18 } }} transition={{ duration: 0.3, ease }}>
      {children}
    </motion.div>
  </AnimatePresence>
);

/* Ord som strømmer inn – uten at layouten flytter seg: hele teksten er satt fra start, ordene tones inn ett og ett. */
export const Words = ({ text, start, t, wps = 16, caret = true, caretColor = '#15130F', testid }) => {
  const w = text.split(' ');
  const n = t === Infinity ? w.length : Math.max(0, Math.min(w.length, Math.floor((t - start) * wps)));
  const done = n >= w.length;
  return (
    <span data-testid={testid} data-done={done ? 'true' : 'false'}>
      {w.map((word, i) => (
        <span key={i} style={{ opacity: i < n ? 1 : 0, transition: 'opacity 240ms ease-out' }}>
          {word}{i < w.length - 1 ? ' ' : ''}
          {caret && i === n - 1 && !done && <span aria-hidden className="deck-caret" style={{ display: 'inline-block', width: 6, height: 12, marginLeft: 3, verticalAlign: -1, borderRadius: 1, background: caretColor }} />}
        </span>
      ))}
    </span>
  );
};

/* Vindu: tre prikker og tittel, innholdet tegnes i `base` px bredde og skaleres til containeren. */
export const Window = ({ show, animate, width, base, baseHeight, title, children, testid = 'deck-window', delay = 0 }) => {
  const ref = useRef(null);
  const [s, setS] = useState(width / base);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const ro = new ResizeObserver(() => { if (el.clientWidth) setS(el.clientWidth / base); });
    ro.observe(el); return () => ro.disconnect();
  }, [base, show]);
  const BAR = 38;
  return (
    <Enter show={show} animate={animate} y={28} duration={1.1} delay={delay} className="deck-window" testid={testid} style={{ width, maxWidth: '100%' }}>
      <div ref={ref} style={{ width: '100%', height: (baseHeight + BAR) * s, borderRadius: 14, overflow: 'hidden', background: '#fff', boxShadow: '0 50px 100px -40px rgba(21,19,15,0.4), 0 0 0 1px rgba(21,19,15,0.08)', position: 'relative' }}>
        <div style={{ width: base, height: baseHeight + BAR, transform: `scale(${s})`, transformOrigin: 'top left', color: '#15130F', display: 'flex', flexDirection: 'column' }}>
          <div aria-hidden style={{ height: BAR, flex: 'none', display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px', borderBottom: '1px solid rgba(21,19,15,0.06)', background: 'rgba(255,255,255,0.7)', position: 'relative' }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(21,19,15,0.09)' }} />)}
            {title && <span style={{ fontSize: 11.5, color: '#9c9c9c', letterSpacing: '-0.005em', position: 'absolute', left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap', maxWidth: '68%', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>{children}</div>
        </div>
      </div>
    </Enter>
  );
};
