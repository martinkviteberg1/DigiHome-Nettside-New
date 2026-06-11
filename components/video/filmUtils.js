'use client';

import { useEffect, useRef } from 'react';

/* ============ timeline math ============ */
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const seg = (t, a, b) => clamp01((t - a) / (b - a));
export const easeOutCubic = (p) => 1 - Math.pow(1 - p, 3);
export const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
export const easeOutExpo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
export const easeOutBack = (p) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};
/** fade in over fIn sec after a, fade out over fOut sec before b */
export const fadeInOut = (t, a, b, fIn = 0.5, fOut = 0.5) => {
  const fi = fIn === 0 ? 1 : seg(t, a, a + fIn);
  const fo = 1 - seg(t, b - fOut, b);
  return Math.min(fi, fo);
};
/** rise-and-fade-in style for a progress value */
export const rise = (p, dist = 3) => ({
  opacity: p,
  transform: `translateY(calc(var(--su) * ${((1 - p) * dist).toFixed(3)}))`,
});
export const pop = (p) => ({
  opacity: clamp01(p * 2),
  transform: `scale(${(0.5 + 0.5 * easeOutBack(p)).toFixed(4)})`,
});
export const typed = (text, p) => text.slice(0, Math.round(text.length * clamp01(p)));
export const fmtNOK = (v) => new Intl.NumberFormat('nb-NO').format(Math.round(v)).replace(/\s/g, '\u202F');

/* ============ shared props ============ */

/** Aurora orb — CSS-only living gradient sphere */
export function Orb({ size = 'calc(var(--su) * 30)', style = {}, speed = 14 }) {
  return (
    <div style={{ width: size, height: size, position: 'relative', ...style }} aria-hidden="true">
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 40deg, #CF97FC, #7DE3D2, #F9A8D4, #8B9CF8, #CF97FC)',
          filter: 'blur(calc(var(--su) * 1.4))',
          animation: `dh-orb-swirl ${speed}s linear infinite`,
        }}
      />
      <div
        style={{
          position: 'absolute', inset: '10%', borderRadius: '50%',
          background: 'radial-gradient(circle at 36% 30%, rgba(255,255,255,0.95), rgba(207,151,252,0.5) 38%, rgba(10,10,10,0) 72%)',
          filter: 'blur(calc(var(--su) * 0.5))',
          mixBlendMode: 'screen',
        }}
      />
      <div
        style={{
          position: 'absolute', inset: '26%', borderRadius: '50%',
          background: 'radial-gradient(circle at 62% 66%, rgba(10,10,12,0.55), rgba(10,10,12,0) 70%)',
          filter: 'blur(calc(var(--su) * 0.8))',
        }}
      />
    </div>
  );
}

/** Canvas starfield, pauses with the film */
export function Starfield({ playing, opacity = 0.55 }) {
  const ref = useRef(null);
  const playRef = useRef(playing);
  playRef.current = playing;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf, w = 0, h = 0;
    const stars = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!stars.length && w > 0) {
        for (let i = 0; i < 110; i++) {
          stars.push({
            x: Math.random() * w, y: Math.random() * h,
            r: Math.random() * 1.3 + 0.3,
            s: Math.random() * 0.1 + 0.02,
            p: Math.random() * Math.PI * 2,
          });
        }
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      if (!playRef.current) return;
      t += 0.016;
      ctx.clearRect(0, 0, w, h);
      for (const st of stars) {
        st.y -= st.s;
        if (st.y < -2) { st.y = h + 2; st.x = Math.random() * w; }
        ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + st.p));
        ctx.fillStyle = '#d6cfff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    draw();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ opacity, transition: 'opacity 1.2s ease' }}
      aria-hidden="true"
    />
  );
}

/** Blinking caret for typed text */
export function Caret({ visible = true }) {
  if (!visible) return null;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 'calc(var(--su) * 0.22)',
        height: '1em',
        background: '#CF97FC',
        marginLeft: 'calc(var(--su) * 0.3)',
        verticalAlign: 'text-bottom',
        animation: 'dh-caret 0.9s steps(1) infinite',
      }}
    />
  );
}
