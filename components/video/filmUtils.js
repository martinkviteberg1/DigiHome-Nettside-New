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
export const easeOutQuint = (p) => 1 - Math.pow(1 - p, 5);
export const fadeInOut = (t, a, b, fIn = 0.5, fOut = 0.5) => {
  const fi = fIn === 0 ? 1 : seg(t, a, a + fIn);
  const fo = 1 - seg(t, b - fOut, b);
  return Math.min(fi, fo);
};
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

/* deterministisk pseudorandom (stabil per indeks) */
export const dRand = (i, salt = 0) => {
  const x = Math.sin(i * 127.1 + salt * 311.7 + 13.37) * 43758.5453;
  return x - Math.floor(x);
};

/* ============ shared props — 100% deterministiske fra filmtid t ============ */

/** Aurora-orb — levende gradient-sfære, drevet av filmtid */
export function Orb({ t = 0, size = 'calc(var(--su) * 30)', style = {}, speed = 14 }) {
  const rot = ((t * 360) / speed) % 360;
  const hue = 35 * Math.sin((t * 2 * Math.PI) / (speed * 1.7));
  const breathe = 1 + 0.05 * Math.sin((t * 2 * Math.PI) / speed);
  return (
    <div style={{ width: size, height: size, position: 'relative', ...style }} aria-hidden="true">
      <div
        style={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          background: 'conic-gradient(from 40deg, #CF97FC, #7DE3D2, #F9A8D4, #8B9CF8, #CF97FC)',
          filter: `blur(calc(var(--su) * 1.4)) hue-rotate(${hue.toFixed(1)}deg)`,
          transform: `rotate(${rot.toFixed(2)}deg) scale(${breathe.toFixed(4)})`,
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

/** Canvas-stjernehimmel — deterministisk fra filmtid */
export function Starfield({ t = 0, opacity = 0.5 }) {
  const ref = useRef(null);
  const dims = useRef({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dims.current = { w: r.width, h: r.height, dpr };
      canvas.width = Math.max(1, r.width * dpr);
      canvas.height = Math.max(1, r.height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { w, h, dpr } = dims.current;
    if (!w || !h) return;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < 110; i++) {
      const x = dRand(i, 1) * w;
      const spd = 2 + 6 * dRand(i, 3);
      let y = (dRand(i, 2) * h - spd * t) % h;
      if (y < 0) y += h;
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.7 + dRand(i, 4) * 6.283));
      ctx.globalAlpha = tw;
      ctx.fillStyle = '#d6cfff';
      ctx.beginPath();
      ctx.arc(x, y, 0.3 + 1.2 * dRand(i, 5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, [t]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full pointer-events-none"
      style={{ opacity }}
      aria-hidden="true"
    />
  );
}

/** Blinkende caret — deterministisk fra filmtid */
export function Caret({ t = 0 }) {
  const on = (t % 0.9) < 0.5;
  return (
    <span
      style={{
        display: 'inline-block',
        width: 'calc(var(--su) * 0.22)',
        height: '1em',
        background: '#CF97FC',
        marginLeft: 'calc(var(--su) * 0.3)',
        verticalAlign: 'text-bottom',
        opacity: on ? 1 : 0,
      }}
    />
  );
}

/** Kinematisk filmkorn — deterministisk offset fra filmtid */
const NOISE_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='240' height='240' filter='url(#n)' opacity='0.55'/></svg>"
  );

export function FilmGrain({ t = 0, opacity = 0.05 }) {
  const x = Math.floor((t * 91) % 240);
  const y = Math.floor((t * 53) % 240);
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundImage: `url("${NOISE_URI}")`,
        backgroundPosition: `${x}px ${y}px`,
        opacity,
        mixBlendMode: 'overlay',
      }}
    />
  );
}

/** Lys-sveip ved aktskifter */
export function LightSweep({ t, boundaries = [] }) {
  let p = -1;
  for (const b of boundaries) {
    const s = seg(t, b - 0.5, b + 0.55);
    if (s > 0 && s < 1) { p = s; break; }
  }
  if (p < 0) return null;
  const x = p * 140 - 20;
  const op = Math.sin(p * Math.PI) * 0.09;
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      aria-hidden="true"
      style={{
        background: `linear-gradient(105deg, transparent ${x - 12}%, rgba(255,255,255,${op.toFixed(3)}) ${x}%, transparent ${x + 12}%)`,
      }}
    />
  );
}

/** Maskert ord-for-ord-avsløring (ElevenLabs-stil) */
export function Words({ t, at, dur = 0.85, stagger = 0.085, text, lift = 112 }) {
  const words = String(text).split(' ');
  return (
    <>
      {words.map((w, i) => {
        const p = easeOutQuint(seg(t, at + i * stagger, at + i * stagger + dur));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom',
              paddingBottom: '0.1em', marginBottom: '-0.1em',
            }}
          >
            <span
              style={{
                display: 'inline-block', whiteSpace: 'pre',
                transform: `translateY(${((1 - p) * lift).toFixed(2)}%)`,
                opacity: Math.min(1, p * 1.6),
              }}
            >
              {w + (i < words.length - 1 ? ' ' : '')}
            </span>
          </span>
        );
      })}
    </>
  );
}

/** Moderne aurora-mesh-bakgrunn \u2014 dype, rolige gradientfelt (deterministisk) */
export function Aurora({ t = 0, opacity = 0.13 }) {
  const blobs = [
    { c: 'rgba(124,58,237,0.50)', w: 75, h: 60, x: 28 + 10 * Math.sin(t * 0.041), y: 20 + 8 * Math.cos(t * 0.033 + 1.2) },
    { c: 'rgba(64,96,170,0.42)', w: 68, h: 55, x: 76 + 9 * Math.sin(t * 0.037 + 2.4), y: 74 + 7 * Math.cos(t * 0.045 + 0.4) },
    { c: 'rgba(186,120,220,0.30)', w: 60, h: 50, x: 62 + 11 * Math.sin(t * 0.029 + 4.1), y: 26 + 9 * Math.cos(t * 0.035 + 2.8) },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ opacity }} aria-hidden="true">
      {blobs.map((b, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${(b.x - b.w / 2).toFixed(2)}%`,
            top: `${(b.y - b.h / 2).toFixed(2)}%`,
            width: `${b.w}%`,
            height: `${b.h}%`,
            borderRadius: '50%',
            background: `radial-gradient(ellipse at center, ${b.c}, transparent 65%)`,
            filter: 'blur(calc(var(--su) * 4))',
            mixBlendMode: 'screen',
          }}
        />
      ))}
    </div>
  );
}
