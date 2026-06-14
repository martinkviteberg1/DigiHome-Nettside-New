'use client';

import { useEffect, useRef } from 'react';
import {
  seg, easeOutCubic, easeInOutCubic, easeOutExpo, easeOutBack, easeOutQuint,
  fadeInOut, rise, typed, fmtNOK, clamp01, Orb, Caret, Words, dRand,
  Starfield, Anamorphic,
} from './filmUtils';

/* Felles sceneskall — myk blur/skala-overgang + retningsdrift + kameradrift */
function Shell({ t, a, b, fIn = 0.7, fOut = 0.7, drift = 0.02, children }) {
  const enter = fIn === 0 ? 1 : easeOutCubic(seg(t, a, a + fIn));
  const exit = fOut === 0 ? 1 : 1 - easeInOutCubic(seg(t, b - fOut, b));
  const o = Math.min(enter, exit);
  const lp = seg(t, a, b);
  const scale = (0.975 + 0.025 * enter) * (1 + lp * drift) * (1 + (1 - exit) * 0.02);
  const blur = (1 - enter) * 9 + (1 - exit) * 7;
  const x = (1 - enter) * 2.2 - (1 - exit) * 2.2; /* inn fra h\u00f8yre, ut mot venstre */
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: o,
        transform: `scale(${scale.toFixed(4)}) translateX(calc(var(--su) * ${x.toFixed(3)}))`,
        filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none',
        willChange: 'transform, opacity, filter',
      }}
    >
      {children}
    </div>
  );
}

/* Venstre tekstkolonne med parallax */
function LeftCol({ lp, children, width = '34%' }) {
  return (
    <div
      style={{
        position: 'absolute', left: '7%', top: '50%', width,
        transform: `translateY(-50%) translateY(calc(var(--su) * ${(lp * 0.6).toFixed(2)}))`,
      }}
    >
      {children}
    </div>
  );
}

/* ============ verdensklasse kort-dybde ============ */

/** Gradient-kantlys — 1px lysende kant som gir kortet glass-følelse */
function CardEdge({ radius = 'calc(var(--su) * 1.8)' }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, borderRadius: radius, padding: 1,
        background: 'linear-gradient(155deg, rgba(255,255,255,0.28), rgba(255,255,255,0.03) 28%, rgba(207,151,252,0.18) 62%, rgba(255,255,255,0.06) 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  );
}

/** Glare-sveip — diagonal lysrefleks som glir over kortet ved landing */
function Glare({ t, at, dur = 1.15, radius = 'calc(var(--su) * 1.8)' }) {
  const p = seg(t, at, at + dur);
  if (p <= 0.001 || p >= 0.999) return null;
  const x = p * 170 - 35;
  const op = Math.sin(p * Math.PI);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, borderRadius: radius, overflow: 'hidden', pointerEvents: 'none', zIndex: 4 }}>
      <div
        style={{
          position: 'absolute', top: '-30%', bottom: '-30%',
          left: `${x.toFixed(2)}%`, width: '22%',
          transform: 'rotate(13deg)',
          background: `linear-gradient(90deg, transparent, rgba(255,255,255,${(0.13 * op).toFixed(3)}), transparent)`,
        }}
      />
    </div>
  );
}

/** Gulv-glød — myk lilla kontaktskygge under kortet som forankrer det i rommet */
function FloorGlow({ opacity = 1 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', top: '101%', left: '6%', right: '6%',
        height: 'calc(var(--su) * 4)',
        background: 'radial-gradient(ellipse 60% 100% at 50% 0%, rgba(155,91,214,0.22), rgba(0,0,0,0.35) 55%, transparent 80%)',
        filter: 'blur(calc(var(--su) * 1.2))',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
}

/** Kontinuerlig 3D-float — deterministisk svev fra filmtid */
const float3d = (t, seed = 0) => ({
  ry: Math.sin(t * 0.45 + seed) * 0.7,
  rx: Math.cos(t * 0.38 + seed * 1.7) * 0.4,
  y: Math.sin(t * 0.6 + seed * 2.3) * 0.35,
});

/** Gnistburst — partikler som flyr radielt ut (toggle-aktivering) */
function SparkBurst({ t, at, count = 9 }) {
  const sp = seg(t, at, at + 0.9);
  if (sp <= 0.001 || sp >= 0.999) return null;
  const fly = easeOutCubic(sp);
  const op = Math.sin(sp * Math.PI);
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const ang = (i / count) * Math.PI * 2 + dRand(i, 7) * 0.7;
        const dist = 6 + dRand(i, 8) * 5;
        const sz = 0.35 + dRand(i, 9) * 0.4;
        return (
          <span
            key={i}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: `calc(var(--su) * ${sz.toFixed(2)})`, height: `calc(var(--su) * ${sz.toFixed(2)})`,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#FDFCFB' : '#CF97FC',
              boxShadow: '0 0 calc(var(--su)*0.8) rgba(207,151,252,0.9)',
              opacity: (op * (0.5 + dRand(i, 10) * 0.5)).toFixed(3),
              transform: `translate(calc(var(--su) * ${(Math.cos(ang) * dist * fly).toFixed(2)}), calc(var(--su) * ${(Math.sin(ang) * dist * fly).toFixed(2)})) scale(${(1 - fly * 0.5).toFixed(2)})`,
            }}
          />
        );
      })}
    </div>
  );
}

/** AI-arbeidsstatus — glasspille med spinner som blir til hake (én plass, sekvensiell) */
function AIPill({ t, at, done, label, y }) {
  const inP = easeOutBack(seg(t, at, at + 0.55));
  const fadeOut = seg(t, done + 0.55, done + 1.0);
  const o = clamp01(seg(t, at, at + 0.3) * 2) * (1 - fadeOut);
  if (o <= 0.003) return null;
  const dP = easeOutBack(seg(t, done, done + 0.4));
  const spin = ((t * 340) % 360).toFixed(0);
  return (
    <div
      style={{
        position: 'absolute', left: 'calc(var(--su) * 1.5)', top: `calc(var(--su) * ${y})`,
        transform: `translateX(calc(var(--su) * ${((1 - clamp01(inP)) * -1.5).toFixed(2)})) scale(${Math.max(0.5, inP).toFixed(3)})`,
        transformOrigin: 'left center',
        opacity: o,
        display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.7)',
        background: 'rgba(16,16,19,0.92)', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 999, padding: 'calc(var(--su) * 0.6) calc(var(--su) * 1.3)',
        boxShadow: '0 calc(var(--su)*0.8) calc(var(--su)*2.6) rgba(0,0,0,0.55), 0 0 calc(var(--su)*2) rgba(155,91,214,0.10)',
        zIndex: 6,
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ position: 'relative', width: 'calc(var(--su) * 1.4)', height: 'calc(var(--su) * 1.4)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        {dP <= 0.001 ? (
          <span
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              border: '1.6px solid rgba(207,151,252,0.22)', borderTopColor: '#CF97FC',
              transform: `rotate(${spin}deg)`,
            }}
          />
        ) : (
          <span
            style={{
              fontSize: 'calc(var(--su) * 1.15)', fontWeight: 700, color: '#7ee2a8', lineHeight: 1,
              transform: `scale(${Math.max(0.3, dP).toFixed(3)})`,
            }}
          >
            ✓
          </span>
        )}
      </span>
      <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: dP > 0.5 ? 'rgba(253,252,251,0.6)' : 'rgba(253,252,251,0.88)' }}>
        {label}
      </span>
    </div>
  );
}

/** Kapittel-kicker — «01 · ANNONSE» med tegnende aksentlinje (editorial struktur) */
function Kicker({ t, at, num, label, center = false }) {
  const p = easeOutCubic(seg(t, at, at + 0.8));
  const lineW = easeOutCubic(seg(t, at + 0.15, at + 1.05));
  if (p <= 0.003) return null;
  return (
    <div
      data-dh-kicker="1"
      style={{
        display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)',
        justifyContent: center ? 'center' : 'flex-start',
        marginBottom: 'calc(var(--su) * 1.7)',
        opacity: p,
        transform: `translateY(calc(var(--su) * ${((1 - p) * 1.4).toFixed(2)}))`,
      }}
    >
      <span className="font-heading" style={{ fontSize: 'calc(var(--su) * 1.35)', fontWeight: 700, color: '#CF97FC', letterSpacing: '0.06em' }}>
        {num}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: `calc(var(--su) * ${(4.2 * lineW).toFixed(2)})`,
          height: 1,
          background: 'linear-gradient(90deg, rgba(207,151,252,0.85), rgba(207,151,252,0.08))',
        }}
      />
      <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.1)', letterSpacing: '0.32em', color: 'rgba(253,252,251,0.48)' }}>
        {label}
      </span>
    </div>
  );
}

/** Landingsglød — myk lilla bloom på akt-titler når ordene har landet */
const landGlow = (t, at) => {
  const p = Math.sin(clamp01(seg(t, at, at + 1.3)) * Math.PI);
  return p > 0.02
    ? `0 0 calc(var(--su) * ${(p * 2.4).toFixed(2)}) rgba(207,151,252,${(0.4 * p).toFixed(3)})`
    : 'none';
};

/* Stress-varsler i åpningen — fjernet etter tilbakemelding fra bruker */

/** Pennespiss som følger signaturbanen (eksakt via getPointAtLength) */
function SignaturePen({ d, sigP }) {
  const pathRef = useRef(null);
  const dotRef = useRef(null);
  useEffect(() => {
    const path = pathRef.current;
    const dot = dotRef.current;
    if (!path || !dot) return;
    try {
      const L = path.getTotalLength();
      const p = path.getPointAtLength(L * clamp01(sigP));
      dot.setAttribute('cx', p.x.toFixed(2));
      dot.setAttribute('cy', p.y.toFixed(2));
      dot.setAttribute('opacity', sigP > 0.005 && sigP < 0.995 ? '1' : '0');
    } catch (e) { /* ok */ }
  }, [sigP, d]);
  return (
    <>
      <path ref={pathRef} d={d} fill="none" stroke="none" />
      <circle
        ref={dotRef}
        r="2.4"
        fill="#2638c4"
        opacity="0"
        style={{ filter: 'drop-shadow(0 0 3.5px rgba(38,56,196,0.85))' }}
      />
    </>
  );
}

/* =====================================================================
   AKT 1 — ÅPNING (0–8.5s)
===================================================================== */
export function SceneOpening({ t }) {
  const iconIn = easeOutQuint(seg(t, 0.2, 1.6));
  const ringP = seg(t, 1.25, 2.3);
  const shift = easeInOutCubic(seg(t, 2.0, 3.05));
  const kicker = Math.min(easeOutCubic(seg(t, 0.45, 1.15)), 1 - seg(t, 1.75, 2.3));
  const wipe = easeInOutCubic(seg(t, 4.55, 6.35));
  const lightOut = 1 - seg(t, 5.15, 5.95);
  const driftP = seg(t, 6.35, 8.5);

  const word1 = 'Utleie.';
  const word2 = 'På autopilot.';

  return (
    <Shell t={t} a={0} b={8.5} fIn={0} drift={0}>
      <div className="absolute inset-0" style={{ background: '#FDFCFB' }} />
      <div className="absolute inset-0 dot-grid" style={{ opacity: 0.35 }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: lightOut }}>
        <div
          style={{
            position: 'relative',
            opacity: iconIn,
            transform: `translateY(calc(var(--su) * ${(-shift * 4).toFixed(2)})) scale(${(0.78 + 0.22 * iconIn - shift * 0.36).toFixed(3)})`,
            filter: `blur(${((1 - iconIn) * 16).toFixed(1)}px)`,
            marginBottom: 'calc(var(--su) * 2.2)',
          }}
        >
          <div
            style={{
              position: 'absolute', inset: 'calc(var(--su) * -1.6)', borderRadius: 'calc(var(--su) * 3)',
              border: '1.5px solid rgba(155,91,214,0.5)',
              opacity: ringP > 0 ? (1 - ringP) * 0.8 : 0,
              transform: `scale(${(1 + ringP * 0.55).toFixed(3)})`,
            }}
          />
          <img
            src="/brand/digihome-icon-purple.svg"
            alt=""
            style={{
              width: 'calc(var(--su) * 11)', height: 'calc(var(--su) * 11)',
              borderRadius: 'calc(var(--su) * 1.6)',
              boxShadow: '0 calc(var(--su)*2) calc(var(--su)*6) rgba(155,91,214,0.3)',
              display: 'block',
            }}
          />
        </div>
        <div
          className="font-body uppercase"
          style={{
            opacity: kicker,
            fontSize: 'calc(var(--su) * 1.4)',
            letterSpacing: '0.42em', textIndent: '0.42em',
            color: 'rgba(10,10,10,0.45)',
            height: 'calc(var(--su) * 2)',
          }}
        >
          DigiHome presenterer
        </div>
        <h1
          className="font-heading font-bold"
          style={{
            fontSize: 'calc(var(--su) * 10.5)', color: '#0A0A0A', lineHeight: 1.06, display: 'flex',
            marginTop: 'calc(var(--su) * 0.3)',
            height: 'calc(var(--su) * 11.5)',
          }}
        >
          {word1.split('').map((ch, i) => {
            const p = easeOutQuint(seg(t, 2.3 + i * 0.06, 3.35 + i * 0.06));
            return (
              <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, p * 1.6), transform: `translateY(calc(var(--su) * ${((1 - p) * 4.5).toFixed(3)}))` }}>
                {ch}
              </span>
            );
          })}
        </h1>
      </div>
      {/* glødende rim langs sveipekanten */}
      {wipe > 0.005 && wipe < 0.995 && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(circle at 84% 50%, rgba(207,151,252,0.95), rgba(155,91,214,0.85) 70%, rgba(155,91,214,0.8))',
            clipPath: `circle(${(wipe * 140 + 1.6).toFixed(2)}% at 84% 50%)`,
            filter: 'blur(calc(var(--su) * 0.45))',
            opacity: Math.sin(wipe * Math.PI) * 0.9,
          }}
        />
      )}
      <div
        className="absolute inset-0"
        style={{ background: '#0A0A0A', clipPath: `circle(${(wipe * 140).toFixed(2)}% at 84% 50%)` }}
      >
        {/* motoren aner sin ankomst — svak glød bak teksten */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: seg(t, 6.35, 8.5) * 0.5,
            background: 'radial-gradient(ellipse 42% 38% at 50% 52%, rgba(155,91,214,0.22), transparent 70%)',
            filter: 'blur(calc(var(--su) * 1.5))',
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <h1
            className="font-heading font-bold"
            style={{
              fontSize: 'calc(var(--su) * 11)', color: '#FDFCFB', lineHeight: 1.06, display: 'flex',
              transform: `scale(${(1 + driftP * 0.035).toFixed(4)})`,
            }}
          >
            {word2.split('').map((ch, i) => {
              const p = easeOutQuint(seg(t, 5.35 + i * 0.045, 6.4 + i * 0.045));
              return (
                <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: Math.min(1, p * 1.6), transform: `translateY(calc(var(--su) * ${((1 - p) * 4.5).toFixed(3)}))` }}>
                  {ch}
                </span>
              );
            })}
          </h1>
        </div>
      </div>
    </Shell>
  );
}

/* =====================================================================
   AKT 2 — TOGGLE (8–14.5s)
   Lading → klikk → energi. Raskt, presist og levende.
===================================================================== */
/* Hypermoderne tagline — blur-reveal per tegn + flytende gradient på nøkkelordene */
function ToggleTagline({ t }) {
  const plain = 'Fra nå skjer ';
  const grad = 'alt av seg selv.';
  const at = 11.25;
  const stagger = 0.05;
  const all = (plain + grad).split('');
  const scrim = easeOutCubic(seg(t, at, at + 0.9));
  const line = easeOutCubic(seg(t, 12.45, 13.35));
  return (
    <div style={{ position: 'relative', marginTop: 'calc(var(--su) * 4)' }}>
      {/* kontrast-skjerm bak teksten (mot orb-gløden) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 'calc(var(--su) * -3.5) calc(var(--su) * -7)',
          background: 'radial-gradient(ellipse 58% 64% at 50% 50%, rgba(4,4,7,0.68), transparent 78%)',
          opacity: scrim,
        }}
      />
      <div
        className="font-heading font-bold"
        style={{ position: 'relative', fontSize: 'calc(var(--su) * 4)', letterSpacing: '-0.025em', lineHeight: 1.15, whiteSpace: 'nowrap' }}
      >
        {all.map((ch, i) => {
          const p = easeOutCubic(seg(t, at + i * stagger, at + 0.55 + i * stagger));
          if (p <= 0) return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: 0 }}>{ch}</span>;
          const isGrad = i >= plain.length;
          const base = {
            display: 'inline-block', whiteSpace: 'pre',
            opacity: Math.min(1, p * 1.5),
            transform: `translateY(calc(var(--su) * ${((1 - p) * 2.4).toFixed(2)})) scale(${(0.92 + p * 0.08).toFixed(3)})`,
          };
          if (!isGrad) {
            return (
              <span key={i} style={{ ...base, color: '#FDFCFB', filter: `blur(${((1 - p) * 7).toFixed(1)}px)`, textShadow: '0 0 calc(var(--su)*1.8) rgba(5,5,8,0.9)' }}>
                {ch}
              </span>
            );
          }
          return (
            <span
              key={i}
              style={{
                ...base,
                background: 'linear-gradient(180deg, #FFFFFF 12%, #E9E9EF 55%, #A9ABB8 96%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                filter: `blur(${((1 - p) * 7).toFixed(1)}px)`,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>
      {/* shimmer-linje under */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', bottom: 'calc(var(--su) * -1.7)',
          transform: 'translateX(-50%)',
          width: `calc(var(--su) * ${(line * 30).toFixed(2)})`, height: '1.5px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
        }}
      />
    </div>
  );
}

/** Energi-innsug — partikler trekkes inn mot bryteren mens den lader */
function ChargeIn({ t, a, b, count = 9 }) {
  const w = seg(t, a, b);
  if (w <= 0.001 || w >= 0.999) return null;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const d = dRand(i, 21) * 0.4;
        const p = clamp01((w - d) / (1 - d));
        if (p <= 0.001 || p >= 0.999) return null;
        const e = easeInOutCubic(p);
        const ang = dRand(i, 22) * Math.PI * 2;
        const r0 = 9 + dRand(i, 23) * 7;
        const r = r0 * (1 - e);
        const sz = 0.22 + dRand(i, 24) * 0.3;
        return (
          <span
            key={i}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              width: `calc(var(--su) * ${sz.toFixed(2)})`, height: `calc(var(--su) * ${sz.toFixed(2)})`,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#CF97FC' : '#FDFCFB',
              boxShadow: '0 0 calc(var(--su)*0.6) rgba(255,255,255,0.55)',
              opacity: (Math.sin(p * Math.PI) * 0.65).toFixed(3),
              transform: `translate(calc(var(--su) * ${(Math.cos(ang) * r).toFixed(2)}), calc(var(--su) * ${(Math.sin(ang) * r * 0.7).toFixed(2)}))`,
            }}
          />
        );
      })}
    </div>
  );
}

/** Svevende støvkorn som stiger etter aktivering — rolig liv i rommet */
function RisingMotes({ t, a, b, count = 10 }) {
  const win = fadeInOut(t, a, b, 0.8, 1.2);
  if (win <= 0.003) return null;
  return (
    <div aria-hidden="true" className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }).map((_, i) => {
        const speed = 0.06 + dRand(i, 31) * 0.05;
        const ph = ((t - a) * speed + dRand(i, 32)) % 1;
        const x = 22 + dRand(i, 33) * 56;
        const y = 80 - ph * 56;
        const sway = Math.sin((t + i * 1.7) * 1.1) * 1.2;
        const sz = 0.16 + dRand(i, 34) * 0.22;
        return (
          <span
            key={i}
            style={{
              position: 'absolute', left: `calc(${x.toFixed(1)}% + calc(var(--su) * ${sway.toFixed(2)}))`, top: `${y.toFixed(1)}%`,
              width: `calc(var(--su) * ${sz.toFixed(2)})`, height: `calc(var(--su) * ${sz.toFixed(2)})`,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.85)',
              boxShadow: '0 0 calc(var(--su)*0.5) rgba(255,255,255,0.45)',
              opacity: (win * Math.sin(ph * Math.PI) * 0.38).toFixed(3),
            }}
          />
        );
      })}
    </div>
  );
}

export function SceneToggle({ t }) {
  const grpIn = easeOutQuint(seg(t, 8.45, 9.3));
  const press = Math.sin(clamp01(seg(t, 9.72, 10.02)) * Math.PI);     /* trykk-dipp */
  const lean = Math.sin(clamp01(seg(t, 9.78, 10.0)) * Math.PI);       /* anticipation — knotten lener seg bakover */
  const flipRaw = seg(t, 9.98, 10.42);
  const flip = easeInOutCubic(flipRaw);                               /* knott-glid AV → PÅ */
  const stretch = Math.sin(clamp01(flipRaw) * Math.PI);               /* strekk midt i glidet */
  const settleOv = Math.max(0, easeOutBack(flipRaw) - 1);             /* squash mot høyre kant */
  const act = easeOutCubic(seg(t, 10.06, 10.62));                     /* aktivering (farge/glød) */
  const arc = easeInOutCubic(seg(t, 9.35, 10.05));                    /* laderingen tegnes FØR klikket */
  const arcFade = 1 - seg(t, 10.15, 10.7);                            /* laderingen løses opp etter klikket */
  const ring = seg(t, 10.15, 11.35);                                  /* ekspanderende ring 1 */
  const ring2 = seg(t, 10.45, 11.85);                                 /* ekspanderende ring 2 */
  const wave = seg(t, 10.1, 11.6);                                    /* energibølge */
  const breathe = 0.5 + 0.5 * Math.sin(t * 1.7);
  const capScale = 1 - press * 0.05 + act * 0.025;
  const knobX = 6.5 * Math.min(flip, 1) - lean * 0.45;
  const sqX = 1 + stretch * 0.18 + settleOv * 1.4;
  const sqY = 1 - stretch * 0.12 - settleOv * 0.45;

  return (
    <Shell t={t} a={8} b={14.5}>
      {/* spotlys ovenfra — scenenærvær */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', top: 0, width: 'calc(var(--su) * 46)', height: '58%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.085), rgba(255,255,255,0.03) 55%, transparent)',
          clipPath: 'polygon(38% 0, 62% 0, 100% 100%, 0 100%)',
          filter: 'blur(calc(var(--su) * 1.2))',
          opacity: grpIn * (0.45 + act * 0.55),
          pointerEvents: 'none',
        }}
      />
      {/* ambient bloom i senter etter aktivering */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 46% 40% at 50% 46%, rgba(155,91,214,0.09), transparent 70%)',
          opacity: act * (0.7 + breathe * 0.3),
        }}
      />
      {/* energibølge — én ring som ekspanderer over hele bildet */}
      {wave > 0.001 && wave < 0.999 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
          <div
            style={{
              width: `calc(var(--su) * ${(easeOutCubic(wave) * 140).toFixed(2)})`,
              height: `calc(var(--su) * ${(easeOutCubic(wave) * 140).toFixed(2)})`,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.3)',
              boxShadow: '0 0 calc(var(--su)*1.4) rgba(255,255,255,0.16), inset 0 0 calc(var(--su)*1.4) rgba(255,255,255,0.08)',
              opacity: (Math.sin(wave * Math.PI) * 0.38).toFixed(3),
              flexShrink: 0,
            }}
          />
        </div>
      )}
      {/* anamorf lysstripe i klikkøyeblikket */}
      <Anamorphic t={t} at={10.0} x="50%" y="50%" maxW={60} dur={1.1} z={2} />
      {/* svevende støvkorn etter aktivering */}
      <RisingMotes t={t} a={10.4} b={13.8} />

      <div className="absolute inset-0 flex flex-col items-center justify-center" style={rise(grpIn, 3)}>
        {/* AUTOPILOT — ord-merke med tracking-innflyvning og blur-reveal */}
        <div
          className="font-body uppercase"
          style={{
            display: 'flex',
            fontSize: 'calc(var(--su) * 1.7)',
            letterSpacing: `${(0.5 + (1 - grpIn) * 0.3).toFixed(3)}em`,
            textIndent: '0.5em',
            color: 'rgba(253,252,251,0.85)',
            marginBottom: 'calc(var(--su) * 3)',
          }}
        >
          {'AUTOPILOT'.split('').map((ch, i) => {
            const p = easeOutCubic(seg(t, 8.6 + i * 0.05, 9.25 + i * 0.05));
            return (
              <span
                key={i}
                style={{
                  opacity: Math.min(1, p * 1.4),
                  filter: `blur(${((1 - p) * 5).toFixed(1)}px)`,
                  transform: `translateY(calc(var(--su) * ${((1 - p) * 1.2).toFixed(2)}))`,
                }}
              >
                {ch}
              </span>
            );
          })}
        </div>

        {/* fysisk bryter — lader, klikker og glir fra AV til PÅ */}
        <div style={{ position: 'relative', transform: `scale(${capScale.toFixed(3)})` }}>
          <ChargeIn t={t} a={9.3} b={10.0} />
          <SparkBurst t={t} at={10.05} count={12} />
          {/* ekspanderende ringer ved aktivering */}
          {[ring, ring2].map((r, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 'calc(var(--su) * -1)', borderRadius: 999,
                border: '1.5px solid rgba(255,255,255,0.55)',
                opacity: r > 0 ? (1 - r) * 0.7 : 0,
                transform: `scale(${(1 + r * (1.55 + i * 0.5)).toFixed(3)})`,
              }}
            />
          ))}
          {/* laderingen — lys som tegnes rundt bryteren før klikket, og løses opp etter */}
          {arc > 0.001 && arcFade > 0.001 && (
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 'calc(var(--su) * -0.55)', borderRadius: 999,
                padding: 'calc(var(--su) * 0.14)',
                background: arc < 0.999
                  ? `conic-gradient(from -90deg, #FFFFFF 0deg, #E3E1EC ${(arc * 320).toFixed(0)}deg, rgba(227,225,236,0) ${(arc * 360).toFixed(0)}deg)`
                  : 'conic-gradient(from -90deg, #FFFFFF, #E3E1EC, #FFFFFF)',
                WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                WebkitMaskComposite: 'xor',
                maskComposite: 'exclude',
                filter: `blur(${(0.5 + (1 - arcFade) * 3).toFixed(1)}px)`,
                opacity: arc < 0.999 ? 1 : arcFade * 0.9,
                transform: `scale(${(1 + (1 - arcFade) * 0.18).toFixed(3)})`,
              }}
            />
          )}
          {/* spor — glass med dybde */}
          <div
            style={{
              width: 'calc(var(--su) * 13.5)', height: 'calc(var(--su) * 7)', borderRadius: 999,
              position: 'relative', overflow: 'hidden',
              background: 'rgba(22,22,28,0.62)', border: '1px solid rgba(255,255,255,0.13)',
              backdropFilter: 'blur(8px)',
              boxShadow: act > 0.01
                ? `inset 0 calc(var(--su)*0.25) calc(var(--su)*0.8) rgba(0,0,0,0.45), 0 0 calc(var(--su) * ${(act * (2.2 + breathe * 1)).toFixed(2)}) rgba(155,91,214,${(act * 0.32).toFixed(2)})`
                : 'inset 0 calc(var(--su)*0.25) calc(var(--su)*0.8) rgba(0,0,0,0.45)',
            }}
          >
            {/* gradient-fyll når autopiloten våkner */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #7E49BE, #A678DE)', opacity: act }} />
            {/* levende sheen over fyllet */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(${(105 + Math.sin(t * 0.9) * 12).toFixed(1)}deg, transparent 30%, rgba(255,255,255,${(act * (0.1 + breathe * 0.07)).toFixed(3)}) 50%, transparent 70%)`,
                opacity: act,
              }}
            />
            {/* knott — lener seg, glir, strekker seg og setter seg med squash */}
            <div
              style={{
                position: 'absolute', top: 'calc(var(--su) * 0.6)', left: 'calc(var(--su) * 0.6)',
                width: 'calc(var(--su) * 5.8)', height: 'calc(var(--su) * 5.8)', borderRadius: '50%',
                background: 'radial-gradient(circle at 33% 30%, #FFFFFF, #F2EEF8 62%, #E2DCEE)',
                boxShadow: act > 0.01
                  ? `0 calc(var(--su)*0.25) calc(var(--su)*1.3) rgba(0,0,0,0.5), 0 0 calc(var(--su) * ${(act * 1.6).toFixed(2)}) rgba(255,255,255,${(act * 0.55).toFixed(2)})`
                  : '0 calc(var(--su)*0.25) calc(var(--su)*1.3) rgba(0,0,0,0.5)',
                transform: `translateX(calc(var(--su) * ${knobX.toFixed(3)})) scale(${sqX.toFixed(3)}, ${sqY.toFixed(3)})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {/* power-prikk i knotten */}
              <span
                aria-hidden="true"
                style={{
                  width: 'calc(var(--su) * 1.5)', height: 'calc(var(--su) * 1.5)', borderRadius: '50%',
                  background: 'radial-gradient(circle at 35% 35%, #B98AE8, #7E49BE)',
                  boxShadow: `0 0 calc(var(--su) * ${(0.6 + breathe * 0.5).toFixed(2)}) rgba(155,91,214,0.55)`,
                  opacity: act,
                  transform: `scale(${(0.4 + act * 0.6).toFixed(3)})`,
                }}
              />
            </div>
          </div>
        </div>
        <ToggleTagline t={t} />
      </div>
    </Shell>
  );
}

/* =====================================================================
   AKT 2a — ADRESSE (14–20.5s)
   Adressen skrives inn — systemet slår opp i eiendomsregisteret.
===================================================================== */
const ADDRESS_TEXT = 'Møhlenprisbakken 14, Bergen';
const ADDRESS_SUGGESTIONS = [
  'Møhlenprisbakken 14, 5006 Bergen',
  'Møhlenprisbakken 14B, 5006 Bergen',
  'Møhlenpris allé 2, 5006 Bergen',
];
const REGISTER_ROWS = [
  ['Hjemmelshaver', 'K. Nordmann'],
  ['Gnr / Bnr', '164 / 237 · Bergen'],
  ['Areal (BRA)', '74 m² · 3-roms'],
  ['Heftelser', 'Ingen'],
];

function PinIcon() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="#CF97FC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-5.5-7-11a7 7 0 1 1 14 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function SceneAdresse({ t }) {
  const fieldIn = easeOutQuint(seg(t, 14.55, 15.4));
  const typeP = seg(t, 14.95, 16.55);
  const dropIn = easeOutCubic(seg(t, 15.85, 16.3));
  const dropOut = seg(t, 17.0, 17.3);
  const hl = seg(t, 16.7, 16.95);
  const lockP = Math.sin(clamp01(seg(t, 17.05, 17.75)) * Math.PI);
  const searchP = Math.min(easeOutCubic(seg(t, 17.25, 17.6)), 1 - seg(t, 17.95, 18.2));
  const panelIn = easeOutCubic(seg(t, 18.0, 18.5));
  const capIn = easeOutCubic(seg(t, 19.55, 19.95));
  const typing = typeP > 0 && typeP < 1;
  const addr = typed(ADDRESS_TEXT, typeP);
  const dropO = Math.min(dropIn, 1 - dropOut);
  const spin = ((t * 340) % 360).toFixed(0);

  return (
    <Shell t={t} a={14} b={20.5}>
      <div style={{ position: 'absolute', top: '8%', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Kicker t={t} at={14.35} num="01" label="ADRESSE" center />
      </div>
      <h2
        className="font-heading font-bold"
        style={{
          position: 'absolute', top: '14%', left: 0, right: 0, textAlign: 'center',
          fontSize: 'calc(var(--su) * 3.7)', color: '#FDFCFB', lineHeight: 1.1,
          textShadow: landGlow(t, 15.1),
        }}
      >
        <Words t={t} at={14.55} text="Start med adressen." />
      </h2>

      {/* søkefelt */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '33.5%', width: 'calc(var(--su) * 46)',
          transform: `translateX(-50%) translateY(calc(var(--su) * ${((1 - fieldIn) * 3.5).toFixed(2)}))`,
          opacity: fieldIn,
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)',
            background: 'rgba(16,16,19,0.92)',
            border: `1px solid rgba(207,151,252,${(0.18 + lockP * 0.65).toFixed(2)})`,
            borderRadius: 999,
            padding: 'calc(var(--su) * 1.1) calc(var(--su) * 1.8)',
            boxShadow: `0 calc(var(--su)*1.2) calc(var(--su)*4) rgba(0,0,0,0.55), 0 0 calc(var(--su)*${(0.5 + lockP * 3).toFixed(2)}) rgba(155,91,214,${(0.1 + lockP * 0.35).toFixed(2)})`,
          }}
        >
          <span style={{ width: 'calc(var(--su) * 1.9)', height: 'calc(var(--su) * 1.9)', flexShrink: 0 }}>
            <PinIcon />
          </span>
          <span className="font-body" style={{ flex: 1, fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.94)', whiteSpace: 'nowrap', overflow: 'hidden', display: 'flex', alignItems: 'center', minHeight: 'calc(var(--su) * 2.3)' }}>
            {addr.length === 0 ? <span style={{ color: 'rgba(253,252,251,0.35)' }}>Hvor ligger boligen?</span> : addr}
            {typing && <Caret t={t} />}
          </span>
        </div>

        {/* autocomplete-dropdown */}
        {dropO > 0.003 && (
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: '100%',
              marginTop: 'calc(var(--su) * 0.7)',
              background: 'rgba(16,16,19,0.94)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 'calc(var(--su) * 1.3)',
              overflow: 'hidden',
              opacity: dropO,
              transform: `translateY(calc(var(--su) * ${((1 - dropIn) * -1.2).toFixed(2)}))`,
              boxShadow: '0 calc(var(--su)*1.5) calc(var(--su)*4.5) rgba(0,0,0,0.6)',
              zIndex: 5,
            }}
          >
            {ADDRESS_SUGGESTIONS.map((s, i) => (
              <div
                key={s}
                className="font-body"
                style={{
                  display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                  padding: 'calc(var(--su) * 0.95) calc(var(--su) * 1.7)',
                  fontSize: 'calc(var(--su) * 1.4)',
                  color: i === 0 ? '#FDFCFB' : 'rgba(253,252,251,0.55)',
                  background: i === 0 ? `rgba(155,91,214,${(0.14 + hl * 0.2).toFixed(2)})` : 'transparent',
                  borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                }}
              >
                <span style={{ width: 'calc(var(--su) * 1.3)', height: 'calc(var(--su) * 1.3)', opacity: 0.7, flexShrink: 0 }}>
                  <PinIcon />
                </span>
                {s}
              </div>
            ))}
          </div>
        )}

        {/* søker i eiendomsregisteret */}
        {searchP > 0.003 && (
          <div style={{ marginTop: 'calc(var(--su) * 1.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--su) * 0.9)', opacity: searchP }}>
            <span
              style={{
                width: 'calc(var(--su) * 1.3)', height: 'calc(var(--su) * 1.3)', borderRadius: '50%',
                border: '2px solid rgba(207,151,252,0.3)', borderTopColor: '#CF97FC',
                transform: `rotate(${spin}deg)`, flexShrink: 0,
              }}
            />
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.35)', color: 'rgba(253,252,251,0.6)', letterSpacing: '0.04em' }}>
              Søker i eiendomsregisteret …
            </span>
          </div>
        )}

        {/* registerutskrift */}
        {panelIn > 0.003 && (
          <div
            style={{
              marginTop: 'calc(var(--su) * 1.6)',
              background: 'rgba(14,14,18,0.88)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 'calc(var(--su) * 1.4)',
              padding: 'calc(var(--su) * 0.6) calc(var(--su) * 1.8)',
              opacity: panelIn,
              transform: `translateY(calc(var(--su) * ${((1 - panelIn) * 1.8).toFixed(2)}))`,
              boxShadow: '0 calc(var(--su)*1.4) calc(var(--su)*4.5) rgba(0,0,0,0.55)',
            }}
          >
            {REGISTER_ROWS.map(([label, value], i) => {
              const rp = easeOutCubic(seg(t, 18.15 + i * 0.33, 18.6 + i * 0.33));
              const ok = easeOutBack(seg(t, 18.5 + i * 0.33, 18.82 + i * 0.33));
              return (
                <div
                  key={label}
                  className="font-body"
                  style={{
                    display: 'flex', alignItems: 'center',
                    padding: 'calc(var(--su) * 0.78) 0',
                    borderBottom: i < REGISTER_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none',
                    opacity: rp,
                    transform: `translateX(calc(var(--su) * ${((1 - rp) * 1.6).toFixed(2)}))`,
                  }}
                >
                  <span style={{ width: 'calc(var(--su) * 14)', fontSize: 'calc(var(--su) * 1.3)', color: 'rgba(253,252,251,0.5)', letterSpacing: '0.04em' }}>{label}</span>
                  <span style={{ flex: 1, fontSize: 'calc(var(--su) * 1.45)', color: 'rgba(253,252,251,0.93)' }}>{value}</span>
                  {ok > 0.01 && (
                    <span
                      style={{
                        color: '#7ee2a8', fontSize: 'calc(var(--su) * 1.3)', fontWeight: 700,
                        transform: `scale(${Math.max(0.4, ok).toFixed(2)})`, opacity: clamp01(ok * 1.5),
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* kilde */}
        <div style={{ ...rise(capIn, 1.2), marginTop: 'calc(var(--su) * 1.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--su) * 0.8)', opacity: capIn }}>
          <span style={{ width: 'calc(var(--su) * 0.7)', height: 'calc(var(--su) * 0.7)', borderRadius: '50%', background: '#7ee2a8', display: 'inline-block', boxShadow: '0 0 calc(var(--su)*0.9) rgba(126,226,168,0.8)' }} />
          <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.3)', color: 'rgba(253,252,251,0.55)', letterSpacing: '0.05em' }}>
            Hentet fra eiendomsregisteret
          </span>
        </div>
      </div>
    </Shell>
  );
}

/* =====================================================================
   AKT 2b — BILDER (20–26.5s)
   Bildene slippes inn — systemet leser boligdetaljer og velger forsidebilde.
===================================================================== */
const UPLOAD_PHOTOS = [
  { src: '/film/upload/image002.jpg', label: 'stue' },
  { src: '/film/upload/image005.jpg', label: 'kjøkken' },
  { src: '/film/styling/room-before.jpg', label: 'soverom' }, /* beste — føres videre til styling */
  { src: '/film/upload/image007.jpg', label: 'spisestue' },
  { src: '/film/upload/image001.jpg', label: 'entré' },
];
const PHOTO_FACTS = ['2 soverom', 'Kjøkkenøy', 'Spisestue', 'Parkett'];

export function SceneBilder({ t }) {
  const zoneIn = easeOutQuint(seg(t, 20.45, 21.25));
  const hintO = Math.min(easeOutCubic(seg(t, 20.7, 21.15)), 1 - seg(t, 21.35, 21.6));
  const scanP = easeInOutCubic(seg(t, 23.35, 24.5));
  const scanCap = Math.min(easeOutCubic(seg(t, 23.3, 23.7)), 1 - seg(t, 24.45, 24.7));
  const pickCap = easeOutCubic(seg(t, 24.85, 25.25));
  const pick = easeOutBack(seg(t, 24.85, 25.4));
  const zoomOut = easeInOutCubic(seg(t, 25.7, 26.5));
  const outP = seg(t, 25.55, 26.05); /* alt annet enn hovedbildet trekker seg rolig tilbake */
  const spin = ((t * 340) % 360).toFixed(0);

  return (
    <Shell t={t} a={20} b={26.5} fOut={0} drift={0}>
      <div
        style={{
          position: 'absolute', top: '8%', left: 0, right: 0, display: 'flex', justifyContent: 'center',
          opacity: 1 - outP,
          transform: `translateY(calc(var(--su) * ${(-outP * 1.6).toFixed(2)}))`,
          filter: outP > 0.01 ? `blur(${(outP * 5).toFixed(1)}px)` : 'none',
        }}
      >
        <Kicker t={t} at={20.3} num="02" label="BILDER" center />
      </div>
      <h2
        className="font-heading font-bold"
        style={{
          position: 'absolute', top: '14%', left: 0, right: 0, textAlign: 'center',
          fontSize: 'calc(var(--su) * 3.7)', color: '#FDFCFB', lineHeight: 1.1,
          textShadow: landGlow(t, 21.0),
          opacity: 1 - outP,
          transform: `translateY(calc(var(--su) * ${(-outP * 1.9).toFixed(2)}))`,
          filter: outP > 0.01 ? `blur(${(outP * 5).toFixed(1)}px)` : 'none',
        }}
      >
        <Words t={t} at={20.5} text="Slipp inn bildene." />
      </h2>

      {/* slippsone */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '56%', width: 'calc(var(--su) * 62)',
          height: 'calc(var(--su) * 21)',
          transform: `translate(-50%, -50%) translateY(calc(var(--su) * ${((1 - zoneIn) * 4).toFixed(2)})) scale(${(0.96 + zoneIn * 0.04).toFixed(3)})`,
          opacity: zoneIn,
          border: `1.5px dashed rgba(255,255,255,${(0.2 * (1 - pickCap)).toFixed(2)})`,
          borderRadius: 'calc(var(--su) * 2)',
          background: `rgba(255,255,255,${(0.025 * (1 - outP)).toFixed(4)})`,
        }}
      >
        {/* hint før bildene lander */}
        {hintO > 0.003 && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--su) * 1)', opacity: hintO }}>
            <span
              style={{
                width: 'calc(var(--su) * 3.6)', height: 'calc(var(--su) * 3.6)', borderRadius: '50%',
                border: '1.5px solid rgba(207,151,252,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#CF97FC', fontSize: 'calc(var(--su) * 1.9)', fontWeight: 700,
              }}
            >
              {'\u2191'}
            </span>
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.4)', color: 'rgba(253,252,251,0.45)' }}>
              Dra og slipp — eller hent fra mobilen
            </span>
          </div>
        )}

        {/* fem bilder faller inn */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--su) * 1.4)' }}>
          {UPLOAD_PHOTOS.map((ph, i) => {
            const at = 21.45 + i * 0.22;
            const inP = easeOutCubic(seg(t, at, at + 0.75));
            if (inP <= 0.001) return null;
            const uplE = easeOutCubic(seg(t, at + 0.35, at + 1.2));   /* opplasting: blur → skarp */
            const done = easeOutCubic(seg(t, at + 1.25, at + 1.55));  /* hake */
            const gone = 1 - seg(t, 25.5, 25.95);                     /* rydd opp før morph */
            /* skannelys passerer kortet */
            const sx = scanP * 100;
            const cx = 10 + i * 20; /* kortets ca. midtpunkt i % av sonen */
            const lit = scanP > 0.001 && scanP < 0.999 && Math.abs(sx - cx) < 9 ? 1 - Math.abs(sx - cx) / 9 : 0;
            const isBest = i === 2;
            const dim = isBest ? 1 : 1 - pickCap * 0.5;
            /* sømløs morph: forsidebildet vokser til styling-kortets eksakte geometri (50su bred, 3:2) */
            const morphScale = isBest ? 1 + pick * 0.05 + zoomOut * 3.5796 : 1;
            const radius = isBest ? 1 - zoomOut * 0.61 : 1;
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  width: 'calc(var(--su) * 10.8)', height: 'calc(var(--su) * 7.2)',
                  borderRadius: `calc(var(--su) * ${radius.toFixed(3)})`,
                  overflow: 'hidden',
                  background: '#1b1b1f',
                  opacity: isBest ? clamp01(inP * 2) * (1 - seg(t, 26.4, 26.49)) : clamp01(inP * 2) * dim * (1 - seg(t, 25.55, 26.05)),
                  transform: `translate(calc(var(--su) * ${((1 - inP) * (i - 2) * 1.3).toFixed(2)}), calc(var(--su) * ${(((1 - inP) * 5.2) - (isBest ? zoomOut * 0.56 : 0)).toFixed(2)})) rotate(${((1 - inP) * (i - 2) * 2.4).toFixed(2)}deg) scale(${((0.9 + inP * 0.1) * morphScale * (isBest ? 1 : 1 - pickCap * 0.045)).toFixed(3)})`,
                  boxShadow: isBest && pick > 0.01
                    ? `0 calc(var(--su)*1) calc(var(--su)*3) rgba(0,0,0,0.55), 0 0 0 2px rgba(207,151,252,${(0.85 * pick * (1 - seg(t, 25.55, 25.95))).toFixed(2)}), 0 0 calc(var(--su)*2.4) rgba(155,91,214,${(0.5 * pick * (1 - zoomOut)).toFixed(2)})`
                    : `0 calc(var(--su)*1) calc(var(--su)*3) rgba(0,0,0,0.55)${lit > 0.02 ? `, 0 0 calc(var(--su)*1.6) rgba(207,151,252,${(lit * 0.55).toFixed(2)})` : ''}`,
                  zIndex: isBest ? 5 : 2,
                }}
              >
                <img
                  src={ph.src}
                  alt=""
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'cover',
                    transform: isBest ? `scale(${(1 + zoomOut * 0.173).toFixed(3)}) translate(0%, ${(zoomOut * 3).toFixed(1)}%)` : 'none',
                    filter: `blur(${(((1 - inP) * 4) + ((1 - uplE) * 7) + (isBest ? 0 : pickCap * 2.2)).toFixed(1)}px) saturate(${(0.82 + uplE * 0.18 - (isBest ? zoomOut * 0.12 : 0)).toFixed(2)}) brightness(${(0.94 + uplE * 0.06 + lit * 0.22 - (isBest ? zoomOut * 0.03 : 0)).toFixed(2)})`,
                  }}
                />
                {/* opplastingsbar — tynn lysende linje */}
                {uplE > 0.001 && uplE < 0.999 && (
                  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 'calc(var(--su) * 0.32)', background: 'rgba(0,0,0,0.45)' }}>
                    <div style={{ width: `${(uplE * 100).toFixed(1)}%`, height: '100%', background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)', boxShadow: '0 0 calc(var(--su)*0.7) rgba(207,151,252,0.8)' }} />
                  </div>
                )}
                {/* lastet opp ✓ */}
                {done > 0.01 && (
                  <span
                    style={{
                      position: 'absolute', top: 'calc(var(--su) * 0.55)', right: 'calc(var(--su) * 0.55)',
                      width: 'calc(var(--su) * 1.7)', height: 'calc(var(--su) * 1.7)', borderRadius: '50%',
                      background: 'rgba(8,8,12,0.75)', border: '1px solid rgba(126,226,168,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#7ee2a8', fontSize: 'calc(var(--su) * 0.95)', fontWeight: 700,
                      transform: `scale(${(0.6 + easeOutBack(done) * 0.4).toFixed(2)})`,
                      opacity: clamp01(done * 1.5) * gone,
                    }}
                  >
                    ✓
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* skannelinje over sonen */}
        {scanP > 0.001 && scanP < 0.999 && (
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 6, pointerEvents: 'none', borderRadius: 'calc(var(--su) * 2)', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${Math.max(0, scanP * 100 - 12).toFixed(2)}%`, width: '12%',
                background: 'linear-gradient(90deg, transparent, rgba(207,151,252,0.12))',
              }}
            />
            <div
              style={{
                position: 'absolute', top: 0, bottom: 0,
                left: `${(scanP * 100).toFixed(2)}%`, width: 'calc(var(--su) * 0.22)',
                background: '#FDFCFB',
                boxShadow: '0 0 calc(var(--su)*2) rgba(207,151,252,0.9), 0 0 calc(var(--su)*0.7) rgba(255,255,255,0.9)',
              }}
            />
          </div>
        )}

        {/* leste boligdetaljer */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(var(--su) * 1.1)', display: 'flex', justifyContent: 'center', gap: 'calc(var(--su) * 0.9)', zIndex: 7 }}>
          {PHOTO_FACTS.map((c, i) => {
            const p = easeOutBack(seg(t, 23.55 + i * 0.26, 24.05 + i * 0.26));
            if (p <= 0.001) return null;
            return (
              <span
                key={c}
                className="font-body"
                style={{
                  opacity: clamp01(p * 2) * (1 - seg(t, 25.45, 25.85)),
                  transform: `scale(${Math.max(0.6, p).toFixed(3)})`,
                  fontSize: 'calc(var(--su) * 1.2)', color: 'rgba(253,252,251,0.88)',
                  border: '1px solid rgba(207,151,252,0.3)', borderRadius: 999,
                  background: 'rgba(12,12,16,0.78)',
                  padding: 'calc(var(--su) * 0.4) calc(var(--su) * 1.1)',
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
      </div>

      {/* statuslinje under sonen */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: '78.5%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--su) * 0.9)' }}>
        {scanCap > 0.003 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)', opacity: scanCap }}>
            <span
              style={{
                width: 'calc(var(--su) * 1.3)', height: 'calc(var(--su) * 1.3)', borderRadius: '50%',
                border: '2px solid rgba(207,151,252,0.3)', borderTopColor: '#CF97FC',
                transform: `rotate(${spin}deg)`, flexShrink: 0,
              }}
            />
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.35)', color: 'rgba(253,252,251,0.6)', letterSpacing: '0.04em' }}>
              Leser boligdetaljer fra bildene …
            </span>
          </div>
        )}
        {pickCap > 0.003 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.8)', opacity: pickCap * (1 - seg(t, 25.45, 25.85)) }}>
            <span style={{ width: 'calc(var(--su) * 0.7)', height: 'calc(var(--su) * 0.7)', borderRadius: '50%', background: '#7ee2a8', display: 'inline-block', boxShadow: '0 0 calc(var(--su)*0.9) rgba(126,226,168,0.8)' }} />
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.35)', color: 'rgba(253,252,251,0.6)', letterSpacing: '0.04em' }}>
              Forsidebilde valgt
            </span>
          </div>
        )}
      </div>
    </Shell>
  );
}

/* =====================================================================
   AKT 2b — AI-STYLING (14–26.5s)
   To prompt-runder på ekte bilder: møblering, deretter kveldslys.
===================================================================== */
const STYLE_PROMPT_1 = 'Hotellseng, teppe på gulvet og moderne kunst';
const STYLE_PROMPT_2 = 'Koselig kveldslys';

/** AI-sveip — glødende linje med gradient-hale og partikler */
function StyleSweep({ t, a, b, color = '207,151,252' }) {
  const p = easeInOutCubic(seg(t, a, b));
  if (p <= 0.001 || p >= 0.999) return null;
  const x = p * 100;
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
      {/* gradient-hale bak linjen (på avslørt side) */}
      <div
        style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${Math.max(0, x - 15).toFixed(2)}%`, width: '15%',
          background: `linear-gradient(90deg, transparent, rgba(${color},0.15))`,
        }}
      />
      {/* selve skannelinjen */}
      <div
        style={{
          position: 'absolute', top: 0, bottom: 0,
          left: `${x.toFixed(2)}%`, width: 'calc(var(--su) * 0.28)',
          background: '#FDFCFB',
          boxShadow: `0 0 calc(var(--su)*2.6) rgba(${color},0.95), 0 0 calc(var(--su)*0.9) rgba(255,255,255,0.95)`,
        }}
      />
      {/* partikler langs linjen */}
      {Array.from({ length: 9 }).map((_, i) => {
        const ph = (t * (1.2 + dRand(i, 3) * 0.9) + dRand(i, 4) * 7) % 1;
        const y = dRand(i, 5) * 90 + 5;
        const dx = (dRand(i, 6) - 0.25) * 4.5 * ph;
        const sz = 0.2 + dRand(i, 7) * 0.32;
        return (
          <span
            key={i}
            style={{
              position: 'absolute', top: `${y.toFixed(1)}%`,
              left: `calc(${x.toFixed(2)}% + calc(var(--su) * ${dx.toFixed(2)}))`,
              width: `calc(var(--su) * ${sz.toFixed(2)})`, height: `calc(var(--su) * ${sz.toFixed(2)})`,
              borderRadius: '50%',
              background: i % 3 === 0 ? '#FDFCFB' : `rgb(${color})`,
              boxShadow: `0 0 calc(var(--su)*0.7) rgba(${color},0.9)`,
              opacity: (Math.sin(ph * Math.PI) * 0.9).toFixed(3),
            }}
          />
        );
      })}
    </div>
  );
}

/* Hypermoderne akt-tittel — blur-reveal per tegn + flytende gradient på «stilen.» */
function StyleHeadline({ t }) {
  const plain = 'Automatisk ';
  const grad = 'styling.';
  const at = 14.55;
  const stagger = 0.045;
  const all = (plain + grad).split('');
  const line = easeOutCubic(seg(t, 15.6, 16.5));
  const bloom = Math.sin(clamp01(seg(t, 15.1, 16.8)) * Math.PI);
  return (
    <span style={{ position: 'relative', display: 'inline-block', whiteSpace: 'nowrap' }}>
      {/* myk bloom bak tittelen idet den lander */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 'calc(var(--su) * -2.2) calc(var(--su) * -5)',
          background: 'radial-gradient(ellipse 60% 80% at 50% 55%, rgba(255,255,255,0.05), transparent 72%)',
          opacity: bloom,
          filter: 'blur(calc(var(--su) * 0.8))',
          pointerEvents: 'none',
        }}
      />
      {all.map((ch, i) => {
        const p = easeOutCubic(seg(t, at + i * stagger, at + 0.6 + i * stagger));
        if (p <= 0) return <span key={i} style={{ display: 'inline-block', whiteSpace: 'pre', opacity: 0 }}>{ch}</span>;
        const isGrad = i >= plain.length;
        const base = {
          display: 'inline-block', whiteSpace: 'pre', position: 'relative',
          opacity: Math.min(1, p * 1.5),
          transform: `translateY(calc(var(--su) * ${((1 - p) * 1.9).toFixed(2)})) scale(${(0.93 + p * 0.07).toFixed(3)})`,
        };
        if (!isGrad) {
          return (
            <span key={i} style={{ ...base, color: '#FDFCFB', filter: `blur(${((1 - p) * 6).toFixed(1)}px)` }}>
              {ch}
            </span>
          );
        }
        return (
          <span
            key={i}
            style={{
              ...base,
              background: 'linear-gradient(180deg, #FFFFFF 12%, #E9E9EF 55%, #A9ABB8 96%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              filter: `blur(${((1 - p) * 6).toFixed(1)}px)`,
            }}
          >
            {ch}
          </span>
        );
      })}
      {/* shimmer-linje som tegnes under */}
      <span
        aria-hidden="true"
        style={{
          position: 'absolute', left: '50%', bottom: 'calc(var(--su) * -1.05)',
          transform: 'translateX(-50%)',
          width: `calc(var(--su) * ${(line * 18).toFixed(2)})`, height: '1.5px',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
        }}
      />
    </span>
  );
}

export function SceneStyling({ t }) {
  const lp = seg(t, 14, 26.5);
  const photoIn = seg(t, 14.42, 14.47); /* match-cut: kortet tar over i det zoomen lander på eksakt geometri */
  const glowIn = easeOutCubic(seg(t, 14.5, 15.3)); /* gulv-glød og dybde toner rolig inn etter landingen */
  const fRamp = easeInOutCubic(seg(t, 14.7, 16.4)); /* 3D-svevet våkner først etter at morphen har landet */
  const promptIn = easeOutCubic(seg(t, 15.6, 16.2));
  const type1 = seg(t, 16.0, 18.6);
  const press1 = Math.sin(clamp01(seg(t, 18.85, 19.2)) * Math.PI);
  const s1 = easeInOutCubic(seg(t, 19.05, 21.0));
  const clear1 = seg(t, 21.15, 21.45);
  const type2 = seg(t, 21.7, 22.7);
  const press2 = Math.sin(clamp01(seg(t, 22.95, 23.3)) * Math.PI);
  const s2 = easeInOutCubic(seg(t, 23.15, 24.85));
  const badge = seg(t, 25.0, 25.6);
  const sweeping = (t >= 19.05 && t < 21.0) || (t >= 23.15 && t < 24.85);
  const typing = (type1 > 0 && type1 < 1) || (type2 > 0 && type2 < 1);
  const pulse = press1 + press2;
  const forP = Math.min(easeOutCubic(seg(t, 15.4, 15.9)), 1 - seg(t, 18.9, 19.3));
  const promptText = t >= 21.45 ? typed(STYLE_PROMPT_2, type2) : typed(STYLE_PROMPT_1, type1);
  const textOpacity = t >= 21.15 && t < 21.45 ? 1 - clear1 : 1;
  const zoom = 1.02 + lp * 0.05;
  const f3 = float3d(t, 2.2);
  const spin = ((t * 340) % 360).toFixed(0);
  /* kalibrert utsnitt for originalbildet (matcher de AI-stylede) */
  const beforeT = `scale(${(zoom * 1.15).toFixed(3)}) translate(0%, 3%)`;

  return (
    <Shell t={t} a={14} b={26.5} fIn={0}>
      {/* kicker + tittel, sentrert over bildet */}
      <div style={{ position: 'absolute', top: '6%', left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <Kicker t={t} at={14.35} num="03" label="STYLING" center />
      </div>
      <h2
        className="font-heading font-bold"
        style={{
          position: 'absolute', top: '11.5%', left: 0, right: 0, textAlign: 'center',
          fontSize: 'calc(var(--su) * 4)', color: '#FDFCFB', lineHeight: 1.1, letterSpacing: '-0.02em',
        }}
      >
        <StyleHeadline t={t} />
      </h2>

      {/* foto-kort, sentrert */}
      <div
        style={{
          position: 'absolute', left: '50%', top: '55%', width: 'calc(var(--su) * 50)',
          transform: `perspective(calc(var(--su) * 140)) translate(-50%, -50%) translateY(calc(var(--su) * ${(f3.y * fRamp).toFixed(2)})) rotateY(${(f3.ry * 0.6 * fRamp).toFixed(2)}deg) rotateX(${(f3.rx * 0.5 * fRamp).toFixed(2)}deg)`,
          opacity: photoIn,
          background: '#131316',
          borderRadius: 'calc(var(--su) * 1.8)',
          boxShadow: '0 calc(var(--su)*0.3) calc(var(--su)*1) rgba(0,0,0,0.45), 0 calc(var(--su)*2.6) calc(var(--su)*8) rgba(0,0,0,0.6), 0 0 calc(var(--su)*7) rgba(155,91,214,0.10)',
        }}
      >
        <CardEdge />
        <Glare t={t} at={15.95} />
        <FloorGlow opacity={glowIn} />
        <div style={{ position: 'relative', aspectRatio: '3 / 2', borderRadius: 'calc(var(--su) * 1.8)', overflow: 'hidden', background: '#1b1b1f' }}>
          {/* FØR — ekte originalbilde (kalibrert) */}
          {t < 21.6 && (
            <img
              src="/film/styling/room-before.jpg"
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: beforeT, filter: 'saturate(0.88) brightness(0.97)',
              }}
            />
          )}
          {/* AI-redraw-sone foran sveip 1 (maskerer perspektivavvik) */}
          {s1 > 0.001 && s1 < 0.999 && (
            <img
              src="/film/styling/room-before.jpg"
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: beforeT, filter: 'blur(9px) saturate(1.3) brightness(1.14)',
                clipPath: `inset(0 ${(100 - Math.min(100, s1 * 100 + 7)).toFixed(2)}% 0 ${(s1 * 100).toFixed(2)}%)`,
              }}
            />
          )}
          {/* ETTER 1 — stylet (dag) */}
          {t < 25.4 && (
            <img
              src="/film/styling/room-day.jpg"
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: `scale(${zoom.toFixed(3)})`,
                clipPath: `inset(0 ${((1 - s1) * 100).toFixed(2)}% 0 0)`,
              }}
            />
          )}
          {/* redraw-sone foran sveip 2 (tynn) */}
          {s2 > 0.001 && s2 < 0.999 && (
            <img
              src="/film/styling/room-day.jpg"
              alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                transform: `scale(${zoom.toFixed(3)})`, filter: 'blur(5px) brightness(1.12)',
                clipPath: `inset(0 ${(100 - Math.min(100, s2 * 100 + 3.5)).toFixed(2)}% 0 ${(s2 * 100).toFixed(2)}%)`,
              }}
            />
          )}
          {/* ETTER 2 — stylet (kveldslys) */}
          <img
            src="/film/styling/room-evening.jpg"
            alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
              transform: `scale(${zoom.toFixed(3)})`,
              clipPath: `inset(0 ${((1 - s2) * 100).toFixed(2)}% 0 0)`,
            }}
          />
          {/* varm bloom idet kveldslyset ruller inn */}
          {(() => {
            const w = Math.sin(clamp01(seg(t, 23.2, 25.4)) * Math.PI);
            if (w <= 0.02) return null;
            return (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none',
                  background: 'radial-gradient(ellipse 70% 60% at 42% 55%, rgba(255,170,90,0.20), transparent 70%)',
                  opacity: w,
                }}
              />
            );
          })()}
          <StyleSweep t={t} a={19.05} b={21.0} />
          <StyleSweep t={t} a={23.15} b={24.85} color="255,190,120" />
          {/* FØR-merke */}
          {forP > 0.003 && (
            <span
              className="font-body"
              style={{
                position: 'absolute', top: 'calc(var(--su) * 1.2)', left: 'calc(var(--su) * 1.2)',
                opacity: forP,
                fontSize: 'calc(var(--su) * 1.05)', letterSpacing: '0.24em', textIndent: '0.1em',
                color: 'rgba(253,252,251,0.85)', background: 'rgba(8,8,12,0.6)',
                border: '1px solid rgba(255,255,255,0.18)', backdropFilter: 'blur(6px)',
                borderRadius: 999, padding: 'calc(var(--su) * 0.45) calc(var(--su) * 1.1)', zIndex: 6,
              }}
            >
              FØR
            </span>
          )}
          {/* Stylet-badge */}
          {badge > 0.003 && (
            <span
              className="font-body"
              style={{
                position: 'absolute', top: 'calc(var(--su) * 1.2)', right: 'calc(var(--su) * 1.2)',
                opacity: clamp01(badge * 2),
                transform: `scale(${Math.max(0.5, easeOutBack(badge)).toFixed(3)})`,
                fontSize: 'calc(var(--su) * 1.25)', fontWeight: 500, letterSpacing: '0.05em',
                color: '#0A0A0A', background: 'rgba(253,252,251,0.94)',
                borderRadius: 999, padding: 'calc(var(--su) * 0.5) calc(var(--su) * 1.3)',
                display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--su) * 0.55)', zIndex: 6,
              }}
            >
              <span style={{ color: '#9B5BD6' }}>{'\u2726'}</span> Stylet automatisk
            </span>
          )}
          {/* promptfelt */}
          <div
            style={{
              position: 'absolute', left: '50%', bottom: 'calc(var(--su) * 1.5)',
              transform: `translateX(-50%) translateY(calc(var(--su) * ${((1 - promptIn) * 3.5).toFixed(2)}))`,
              opacity: promptIn,
              width: '82%',
              display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
              background: 'rgba(8,8,12,0.74)', border: '1px solid rgba(255,255,255,0.16)',
              backdropFilter: 'blur(10px)', borderRadius: 999,
              padding: 'calc(var(--su) * 0.55) calc(var(--su) * 0.55) calc(var(--su) * 0.55) calc(var(--su) * 1.5)',
              boxShadow: '0 calc(var(--su)*1) calc(var(--su)*3) rgba(0,0,0,0.5)',
              zIndex: 6,
            }}
          >
            <span aria-hidden="true" style={{ color: '#CF97FC', fontSize: 'calc(var(--su) * 1.5)', lineHeight: 1 }}>{'\u2726'}</span>
            <span
              className="font-body"
              style={{
                flex: 1, fontSize: 'calc(var(--su) * 1.35)', color: 'rgba(253,252,251,0.92)',
                whiteSpace: 'nowrap', overflow: 'hidden', opacity: textOpacity,
                lineHeight: 1.4, minHeight: 'calc(var(--su) * 2)', display: 'flex', alignItems: 'center',
              }}
            >
              {promptText.length === 0 && !typing
                ? <span style={{ color: 'rgba(253,252,251,0.35)' }}>Beskriv stilen …</span>
                : promptText}
              {typing && <Caret t={t} />}
            </span>
            <span
              aria-hidden="true"
              style={{
                width: 'calc(var(--su) * 3.1)', height: 'calc(var(--su) * 3.1)', borderRadius: '50%',
                background: 'linear-gradient(145deg, #9B5BD6, #CF97FC)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                transform: `scale(${(1 + pulse * 0.22).toFixed(3)})`,
                boxShadow: `0 0 calc(var(--su) * ${(1 + pulse * 2.4).toFixed(2)}) rgba(155,91,214,${(0.45 + pulse * 0.4).toFixed(2)})`,
                flexShrink: 0,
              }}
            >
              {sweeping ? (
                <span
                  style={{
                    width: 'calc(var(--su) * 1.4)', height: 'calc(var(--su) * 1.4)', borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff',
                    transform: `rotate(${spin}deg)`,
                  }}
                />
              ) : (
                <span style={{ color: '#fff', fontSize: 'calc(var(--su) * 1.7)', fontWeight: 700, lineHeight: 1 }}>{'\u2191'}</span>
              )}
            </span>
          </div>
        </div>
      </div>
    </Shell>
  );
}

/* =====================================================================
   AKT 3 — ANNONSERING (14–26.5s)
===================================================================== */
export function SceneAnnonse({ t }) {
  const lp = seg(t, 14, 26.5);
  const cardIn = easeOutQuint(seg(t, 15.0, 16.1));
  const photoP = easeInOutCubic(seg(t, 15.7, 16.8));
  const titleP = seg(t, 16.6, 18.3);
  const descP = seg(t, 20.2, 22.4);
  const priceIn = easeOutCubic(seg(t, 22.5, 23.1));
  const stampP = seg(t, 23.4, 24.1);
  const capIn = easeOutCubic(seg(t, 24.5, 25.3));

  const title = 'Lys 3-roms med utsikt — Møhlenpris';
  const desc = 'Velkommen til en gjennomgående lys 3-roms med stor balkong og panoramautsikt over Puddefjorden. Nyoppusset kjøkken, gangavstand til sentrum.';
  const chips = ['74 m²', '2 soverom', 'Balkong'];

  return (
    <Shell t={t} a={14} b={26.5}>
      <LeftCol lp={lp}>
        <Kicker t={t} at={14.55} num="04" label="ANNONSE" />
        <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08, textShadow: landGlow(t, 15.4) }}>
          <Words t={t} at={14.7} text="Annonsen?" />
        </h2>
        <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
          <Words t={t} at={15.3} stagger={0.1} text="Skrevet, priset og publisert — automatisk." />
        </p>
        <div className="font-body" style={{ ...rise(capIn, 2), marginTop: 'calc(var(--su) * 3)', display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)' }}>
          <span style={{ width: 'calc(var(--su) * 0.8)', height: 'calc(var(--su) * 0.8)', borderRadius: '50%', background: '#CF97FC', display: 'inline-block' }} />
          <span style={{ fontSize: 'calc(var(--su) * 1.6)', color: 'rgba(207,151,252,0.9)', letterSpacing: '0.08em' }}>
            Klar på minutter — ikke dager
          </span>
        </div>
      </LeftCol>
      {(() => {
        const f3 = float3d(t, 1.3);
        return (
      <div
        style={{
          position: 'absolute', right: '7%', top: '50%', width: '42%',
          transform: `perspective(calc(var(--su) * 130)) translateY(-50%) translateY(calc(var(--su) * ${((1 - cardIn) * 5 - lp * 1.2 + f3.y).toFixed(2)})) rotateY(${(-7 + 5.2 * cardIn + f3.ry * cardIn).toFixed(2)}deg) rotateX(${(1.5 - cardIn + f3.rx * cardIn).toFixed(2)}deg) scale(${(0.95 + cardIn * 0.05).toFixed(3)})`,
          opacity: cardIn,
          background: '#131316',
          borderRadius: 'calc(var(--su) * 1.8)',
          boxShadow: '0 calc(var(--su)*0.3) calc(var(--su)*1) rgba(0,0,0,0.45), 0 calc(var(--su)*2.6) calc(var(--su)*8) rgba(0,0,0,0.6), 0 0 calc(var(--su)*7) rgba(155,91,214,0.10)',
        }}
      >
        <CardEdge />
        <Glare t={t} at={16.35} />
        <FloorGlow opacity={cardIn} />
        {/* AI-motoren jobber — sekvensielle statuspiller over bildet */}
        <AIPill t={t} at={15.5} done={16.5} label="Analyserer boligen" y={1.4} />
        <AIPill t={t} at={18.0} done={19.3} label="Skriver annonsetekst" y={1.4} />
        <AIPill t={t} at={20.6} done={22.6} label="Optimaliserer pris" y={1.4} />
        <div style={{ borderRadius: 'calc(var(--su) * 1.8)', overflow: 'hidden' }}>
          <div style={{ height: 'calc(var(--su) * 17)', overflow: 'hidden', position: 'relative', background: '#1b1b1f' }}>
            {/* det AI-stylede bildet fra forrige akt — kontinuitet */}
            <img
              src="/film/styling/room-evening.jpg"
              alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                clipPath: `inset(0 ${((1 - photoP) * 100).toFixed(2)}% 0 0)`,
                transform: `scale(${(1.08 - photoP * 0.08).toFixed(3)})`,
              }}
            />
            <div style={{ position: 'absolute', left: 'calc(var(--su)*1.2)', bottom: 'calc(var(--su)*1.2)', opacity: photoP, display: 'flex', gap: 'calc(var(--su)*0.6)' }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 'calc(var(--su)*2.6)', height: 'calc(var(--su)*0.45)', borderRadius: 99, background: i === 0 ? '#FDFCFB' : 'rgba(253,252,251,0.35)' }} />
              ))}
            </div>
          </div>
          <div style={{ padding: 'calc(var(--su) * 2.2)' }}>
            <div className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 2.5)', color: '#FDFCFB', minHeight: 'calc(var(--su) * 3.2)', lineHeight: 1.15 }}>
              {typed(title, titleP)}
              {titleP > 0 && titleP < 1 ? <Caret t={t} /> : null}
            </div>
            <div style={{ display: 'flex', gap: 'calc(var(--su) * 1)', marginTop: 'calc(var(--su) * 1.3)' }}>
              {chips.map((c, i) => {
                const p = easeOutBack(seg(t, 19.6 + i * 0.3, 20.2 + i * 0.3));
                return (
                  <span
                    key={c}
                    className="font-body"
                    style={{
                      opacity: clamp01(p * 2), transform: `scale(${Math.max(0.6, p).toFixed(3)})`,
                      fontSize: 'calc(var(--su) * 1.45)', color: 'rgba(253,252,251,0.75)',
                      border: '1px solid rgba(255,255,255,0.14)', borderRadius: 999,
                      padding: 'calc(var(--su) * 0.45) calc(var(--su) * 1.2)',
                    }}
                  >
                    {c}
                  </span>
                );
              })}
            </div>
            <p className="font-body" style={{ marginTop: 'calc(var(--su) * 1.6)', fontSize: 'calc(var(--su) * 1.55)', color: 'rgba(253,252,251,0.55)', lineHeight: 1.55, minHeight: 'calc(var(--su) * 7)' }}>
              {typed(desc, descP)}
              {descP > 0 && descP < 1 ? <Caret t={t} /> : null}
            </p>
            <div style={{ ...rise(priceIn, 2), display: 'flex', alignItems: 'baseline', gap: 'calc(var(--su) * 0.8)', marginTop: 'calc(var(--su) * 1.4)' }}>
              <span className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 3)', color: '#FDFCFB' }}>{'24\u202F800 kr'}</span>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.5)', color: 'rgba(253,252,251,0.5)' }}>/mnd</span>
            </div>
          </div>
        </div>
        <div
          style={{
            position: 'absolute', top: 'calc(var(--su) * -2.4)', right: 'calc(var(--su) * -2.4)',
            opacity: clamp01(stampP * 3),
            transform: `rotate(-7deg) scale(${(1.9 - 0.9 * easeOutQuint(stampP)).toFixed(3)})`,
            background: '#FDFCFB', borderRadius: 999,
            padding: 'calc(var(--su) * 0.9) calc(var(--su) * 1.6)',
            display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)',
            boxShadow: '0 calc(var(--su)*1) calc(var(--su)*3.5) rgba(0,0,0,0.5)',
          }}
        >
          {/* landingsring */}
          {(() => {
            const ringP = seg(t, 23.95, 24.6);
            if (ringP <= 0 || ringP >= 1) return null;
            return (
              <span
                style={{
                  position: 'absolute', inset: 'calc(var(--su) * -0.5)', borderRadius: 999,
                  border: '1.5px solid rgba(207,151,252,0.7)',
                  opacity: (1 - ringP) * 0.8,
                  transform: `scale(${(1 + ringP * 0.45).toFixed(3)})`,
                }}
              />
            );
          })()}
          <img src="/finn-logo.png" alt="FINN" style={{ height: 'calc(var(--su) * 2.4)', width: 'auto', borderRadius: 'calc(var(--su)*0.4)' }} />
          <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.6)', fontWeight: 500, color: '#0A0A0A' }}>Publisert</span>
          <span style={{ color: '#16a34a', fontSize: 'calc(var(--su) * 1.8)', fontWeight: 700 }}>✓</span>
        </div>
      </div>
        );
      })()}
    </Shell>
  );
}

/* =====================================================================
   AKT 4 — VISNING + SCREENING (26–38.5s)
===================================================================== */
const RADAR_LABELS = ['Kreditt', 'Inntekt', 'Referanser', 'Historikk', 'Stabilitet'];
const RADAR_VALUES = [0.92, 0.84, 0.95, 0.78, 0.88];

function radarPoint(cx, cy, r, i, n = 5) {
  const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
  return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
}

export function SceneVisning({ t }) {
  const lp = seg(t, 26, 38.5);
  const partA = Math.min(1, 1 - seg(t, 31.7, 32.3));
  const partB = seg(t, 32.3, 32.9);
  const partBBlur = (1 - easeOutCubic(partB)) * 6;

  const calIn = easeOutQuint(seg(t, 27.2, 28.2));
  const bookings = [
    { d: 'Tir', tm: '17:00', n: 'Emma N.', at: 28.0 },
    { d: 'Ons', tm: '17:30', n: 'Jonas B.', at: 28.8 },
    { d: 'Tor', tm: '18:00', n: 'Sofie H.', at: 29.6 },
  ];
  const fullCap = easeOutCubic(seg(t, 30.5, 31.3));

  const ringsIn = easeOutCubic(seg(t, 32.7, 33.5));
  const badge = seg(t, 36.3, 37.0);
  const cx = 100, cy = 102, R = 74;

  return (
    <Shell t={t} a={26} b={38.5}>
      {partA > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: partA, filter: partA < 0.95 ? `blur(${((1 - partA) * 6).toFixed(1)}px)` : 'none' }}>
          <LeftCol lp={lp}>
            <Kicker t={t} at={26.45} num="05" label="VISNINGER" />
            <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08, textShadow: landGlow(t, 27.3) }}>
              <Words t={t} at={26.6} text="Visninger?" />
            </h2>
            <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)' }}>
              <Words t={t} at={27.2} stagger={0.1} text="Booker seg selv." />
            </p>
          </LeftCol>
          {(() => {
            const f3 = float3d(t, 2.6);
            return (
          <div
            style={{
              position: 'absolute', right: '8%', top: '50%', width: '40%',
              transform: `perspective(calc(var(--su) * 130)) translateY(-50%) translateY(calc(var(--su) * ${((1 - calIn) * 5 - lp * 1.2 + f3.y).toFixed(2)})) rotateY(${(-7 + 5.2 * calIn + f3.ry * calIn).toFixed(2)}deg) rotateX(${(1.5 - calIn + f3.rx * calIn).toFixed(2)}deg) scale(${(0.95 + calIn * 0.05).toFixed(3)})`,
              opacity: calIn,
              background: '#131316',
              borderRadius: 'calc(var(--su) * 1.8)', padding: 'calc(var(--su) * 2.4)',
              boxShadow: '0 calc(var(--su)*0.3) calc(var(--su)*1) rgba(0,0,0,0.45), 0 calc(var(--su)*2.6) calc(var(--su)*8) rgba(0,0,0,0.6), 0 0 calc(var(--su)*7) rgba(155,91,214,0.10)',
            }}
          >
            <CardEdge />
            <Glare t={t} at={28.45} />
            <FloorGlow opacity={calIn} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'calc(var(--su) * 1.8)' }}>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.85)', fontWeight: 500 }}>
                Visningskalender · Uke 47
              </span>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.15)', letterSpacing: '0.18em', color: '#CF97FC', border: '1px solid rgba(207,151,252,0.45)', borderRadius: 999, padding: 'calc(var(--su)*0.35) calc(var(--su)*1)' }}>
                AUTO
              </span>
            </div>
            {bookings.map((b) => {
              const p = easeOutQuint(seg(t, b.at, b.at + 0.8));
              const chk = easeOutBack(seg(t, b.at + 0.45, b.at + 0.95));
              return (
                <div
                  key={b.n}
                  style={{
                    ...rise(p, 2.5),
                    display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1.4)',
                    background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 'calc(var(--su) * 1.1)',
                    padding: 'calc(var(--su) * 1.2) calc(var(--su) * 1.5)',
                    marginBottom: 'calc(var(--su) * 1)',
                  }}
                >
                  <div style={{ textAlign: 'center', minWidth: 'calc(var(--su) * 5)' }}>
                    <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: 'rgba(253,252,251,0.5)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{b.d}</div>
                    <div className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 1.9)', color: '#FDFCFB' }}>{b.tm}</div>
                  </div>
                  <div style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,0.1)' }} />
                  {(() => {
                    const grads = [
                      'linear-gradient(135deg, #CF97FC, #9B5BD6)',
                      'linear-gradient(135deg, #7DE3D2, #4FB8A8)',
                      'linear-gradient(135deg, #F9A8D4, #E07CB8)',
                    ];
                    const idx = bookings.indexOf(b);
                    const initials = b.n.split(' ').map((w) => w[0]).join('').replace('.', '');
                    return (
                      <span
                        style={{
                          width: 'calc(var(--su) * 3)', height: 'calc(var(--su) * 3)', borderRadius: '50%',
                          background: grads[idx % 3], color: '#0A0A0A',
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'calc(var(--su) * 1.15)', fontWeight: 600, flexShrink: 0,
                        }}
                        className="font-body"
                      >
                        {initials}
                      </span>
                    );
                  })()}
                  <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.85)', flex: 1 }}>{b.n}</span>
                  <span
                    className="font-body"
                    style={{
                      opacity: clamp01(chk * 2), transform: `scale(${Math.max(0.4, chk).toFixed(3)})`,
                      fontSize: 'calc(var(--su) * 1.35)', color: '#7ee2a8',
                      background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)',
                      borderRadius: 999, padding: 'calc(var(--su)*0.4) calc(var(--su)*1.1)',
                    }}
                  >
                    Bekreftet ✓
                  </span>
                </div>
              );
            })}
            <div className="font-body" style={{ ...rise(fullCap, 1.5), fontSize: 'calc(var(--su) * 1.5)', color: 'rgba(207,151,252,0.9)', marginTop: 'calc(var(--su) * 1.4)', textAlign: 'center' }}>
              Fullbooket — uten at du løftet en finger.
            </div>
          </div>
            );
          })()}
        </div>
      )}
      {partB > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: partB, filter: partBBlur > 0.3 ? `blur(${partBBlur.toFixed(1)}px)` : 'none' }}>
          <LeftCol lp={lp}>
            <Kicker t={t} at={32.4} num="06" label="SCREENING" />
            <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08, textShadow: landGlow(t, 33.2) }}>
              <Words t={t} at={32.5} text="Leietakere?" />
            </h2>
            <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
              <Words t={t} at={33.0} stagger={0.08} text="Screenes automatisk — kreditt, inntekt og referanser." />
            </p>
          </LeftCol>
          <div style={{ position: 'absolute', right: '6%', top: '50%', transform: `translateY(-50%) translateY(calc(var(--su) * ${(-lp * 1.2).toFixed(2)}))`, width: '46%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <svg viewBox="0 0 200 200" style={{ width: 'calc(var(--su) * 41)', height: 'calc(var(--su) * 41)', overflow: 'visible' }}>
              {/* roterende stiplet ytre ring — skanner-følelse */}
              <circle
                cx={cx} cy={cy} r={R + 10}
                fill="none" stroke="rgba(207,151,252,0.30)" strokeWidth="0.6"
                strokeDasharray="2.5 7.5"
                style={{ opacity: ringsIn * 0.85, transformOrigin: `${cx}px ${cy}px`, transform: `rotate(${(t * 9).toFixed(1)}deg)` }}
              />
              {[0.33, 0.66, 1].map((s, ri) => (
                <polygon
                  key={ri}
                  points={RADAR_LABELS.map((_, i) => radarPoint(cx, cy, R * s, i).join(',')).join(' ')}
                  fill="none"
                  stroke="rgba(255,255,255,0.13)"
                  strokeWidth="0.7"
                  style={{ opacity: ringsIn }}
                />
              ))}
              {RADAR_LABELS.map((_, i) => {
                const [x, y] = radarPoint(cx, cy, R, i);
                return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.09)" strokeWidth="0.7" style={{ opacity: ringsIn }} />;
              })}
              {(() => {
                const pts = RADAR_LABELS.map((_, i) => {
                  const v = RADAR_VALUES[i] * easeOutCubic(seg(t, 33.9 + i * 0.16, 35.3 + i * 0.16));
                  return radarPoint(cx, cy, R * v, i);
                });
                const ptsStr = pts.map((p) => p.join(',')).join(' ');
                return (
                  <g>
                    <polygon points={ptsStr} fill="rgba(207,151,252,0.16)" stroke="#CF97FC" strokeWidth="1.6" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 6px rgba(207,151,252,0.65))' }} />
                    {pts.map((p, i) => (
                      <circle key={i} cx={p[0]} cy={p[1]} r="2.4" fill="#CF97FC" style={{ opacity: seg(t, 34.2 + i * 0.16, 34.8 + i * 0.16) }} />
                    ))}
                  </g>
                );
              })()}
              {/* radar-scan: roterende sveiplinje */}
              {(() => {
                const scanOp = Math.min(seg(t, 33.0, 33.5), 1 - seg(t, 35.3, 35.9)) * 0.45;
                if (scanOp <= 0.01) return null;
                const ang = -Math.PI / 2 + ((t - 33.0) * 2.1) % (Math.PI * 2);
                const sx = cx + R * Math.cos(ang);
                const sy = cy + R * Math.sin(ang);
                return (
                  <line
                    x1={cx} y1={cy} x2={sx} y2={sy}
                    stroke="#CF97FC" strokeWidth="1.1" opacity={scanOp}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(207,151,252,0.85))' }}
                  />
                );
              })()}
              {/* score-teller i sentrum */}
              {(() => {
                const scIn = easeOutCubic(seg(t, 35.5, 36.3));
                if (scIn <= 0.01) return null;
                const score = Math.round(92 * easeOutExpo(seg(t, 35.5, 36.8)));
                return (
                  <g style={{ opacity: scIn }}>
                    <circle cx={cx} cy={cy} r={17.5 * (0.8 + 0.2 * scIn)} fill="rgba(8,8,10,0.82)" stroke="rgba(207,151,252,0.35)" strokeWidth="0.8" />
                    <text
                      x={cx} y={cy + 2.5} textAnchor="middle"
                      style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-heading)', fill: '#FDFCFB' }}
                    >
                      {score}
                    </text>
                    <text
                      x={cx} y={cy + 10} textAnchor="middle"
                      style={{ fontSize: 4.2, letterSpacing: '0.28em', fontFamily: 'var(--font-body)', fill: 'rgba(207,151,252,0.85)' }}
                    >
                      SCORE
                    </text>
                  </g>
                );
              })()}
              {RADAR_LABELS.map((lb, i) => {
                const [x, y] = radarPoint(cx, cy, R + 16, i);
                const lit = seg(t, 35.4, 36.0);
                const op = easeOutCubic(seg(t, 33.3 + i * 0.18, 33.9 + i * 0.18));
                return (
                  <text
                    key={lb}
                    x={x}
                    y={y + 2.5}
                    textAnchor="middle"
                    style={{
                      fontSize: 7.5, letterSpacing: '0.12em',
                      fontFamily: 'var(--font-body)',
                      fill: lit > 0.5 ? '#CF97FC' : 'rgba(253,252,251,0.6)',
                      opacity: op,
                    }}
                  >
                    {lb.toUpperCase()}
                  </text>
                );
              })}
            </svg>
            <div
              className="font-body"
              style={{
                opacity: clamp01(badge * 2),
                transform: `scale(${Math.max(0.4, easeOutBack(badge)).toFixed(3)})`,
                marginTop: 'calc(var(--su) * 0.5)',
                fontSize: 'calc(var(--su) * 1.7)', letterSpacing: '0.22em', fontWeight: 500,
                color: '#0A0A0A', background: 'linear-gradient(120deg, #CF97FC, #a777e3)',
                borderRadius: 999, padding: 'calc(var(--su) * 1) calc(var(--su) * 2.6)',
                boxShadow: '0 0 calc(var(--su)*3.5) rgba(207,151,252,0.45)',
              }}
            >
              KANDIDAT GODKJENT ✓
            </div>
          </div>
          <Anamorphic t={t} at={36.4} x="71%" y="46%" maxW={46} dur={1.1} />
        </div>
      )}
    </Shell>
  );
}

/* =====================================================================
   AKT 5 — KONTRAKT + HUSLEIE (38–49s)
===================================================================== */
export function SceneKontrakt({ t }) {
  const lp = seg(t, 38, 49);
  const partA = Math.min(1, 1 - seg(t, 42.9, 43.5));
  const partB = seg(t, 43.5, 44.1);
  const partBBlur = (1 - easeOutCubic(partB)) * 6;

  const docIn = easeOutQuint(seg(t, 39.2, 40.2));
  const sigP = easeInOutCubic(seg(t, 40.3, 41.8));
  const bankP = seg(t, 41.9, 42.6);

  const countP = easeOutExpo(seg(t, 44.6, 47.0));
  const txnIn = easeOutCubic(seg(t, 46.9, 47.6));
  const amount = 24800 * countP;

  return (
    <Shell t={t} a={38} b={49}>
      {partA > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: partA, filter: partA < 0.95 ? `blur(${((1 - partA) * 6).toFixed(1)}px)` : 'none' }}>
          <LeftCol lp={lp}>
            <Kicker t={t} at={38.45} num="07" label="KONTRAKT" />
            <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08, textShadow: landGlow(t, 39.3) }}>
              <Words t={t} at={38.6} text="Kontrakten?" />
            </h2>
            <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)' }}>
              <Words t={t} at={39.1} stagger={0.1} text="Signeres digitalt — med BankID." />
            </p>
          </LeftCol>
          {(() => {
            const f3 = float3d(t, 3.4);
            return (
          <div
            style={{
              position: 'absolute', right: '10%', top: '50%', width: '34%',
              transform: `perspective(calc(var(--su) * 130)) translateY(-50%) translateY(calc(var(--su) * ${((1 - docIn) * 5 - lp * 1.2 + f3.y).toFixed(2)})) rotate(${((1 - docIn) * 2).toFixed(2)}deg) rotateY(${(-6 + 4.5 * docIn + f3.ry * docIn).toFixed(2)}deg) scale(${(0.95 + docIn * 0.05).toFixed(3)})`,
              opacity: docIn,
              background: 'linear-gradient(168deg, #FFFFFF 0%, #FBFAF7 42%, #F1EDE6 100%)',
              borderRadius: 'calc(var(--su) * 1.2)',
              padding: 'calc(var(--su) * 2.8)',
              boxShadow: '0 calc(var(--su)*0.3) calc(var(--su)*1) rgba(0,0,0,0.4), 0 calc(var(--su)*2.6) calc(var(--su)*8) rgba(0,0,0,0.65)',
            }}
          >
            <FloorGlow opacity={docIn} />
            <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.3)', letterSpacing: '0.3em', color: 'rgba(10,10,10,0.55)', marginBottom: 'calc(var(--su) * 1.8)' }}>
              LEIEKONTRAKT
            </div>
            {[100, 92, 97, 84, 90].map((w, i) => {
              const p = easeOutCubic(seg(t, 39.4 + i * 0.18, 40.0 + i * 0.18));
              return (
                <div
                  key={i}
                  style={{
                    height: 'calc(var(--su) * 0.7)', borderRadius: 99,
                    background: 'rgba(10,10,10,0.12)',
                    width: `${w * p}%`,
                    marginBottom: 'calc(var(--su) * 1.1)',
                  }}
                />
              );
            })}
            <div style={{ marginTop: 'calc(var(--su) * 2.4)', borderTop: '1px solid rgba(10,10,10,0.2)', paddingTop: 'calc(var(--su) * 1)', position: 'relative' }}>
              <svg viewBox="0 0 160 44" style={{ width: 'calc(var(--su) * 16)', height: 'calc(var(--su) * 4.6)', position: 'absolute', top: 'calc(var(--su) * -3.4)', left: 'calc(var(--su) * 1)', overflow: 'visible' }}>
                <path
                  d="M6,32 C10,12 18,6 20,16 C22,26 16,34 24,30 C30,27 30,14 36,16 C42,18 38,32 46,28 C52,25 52,16 58,17 C64,18 62,30 70,27 C80,23 84,10 92,14 C98,17 94,30 104,27 C114,24 118,14 128,18 C136,21 138,28 152,24"
                  fill="none"
                  stroke="#2638c4"
                  strokeWidth="2"
                  strokeLinecap="round"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset={1 - sigP}
                />
                <SignaturePen
                  d="M6,32 C10,12 18,6 20,16 C22,26 16,34 24,30 C30,27 30,14 36,16 C42,18 38,32 46,28 C52,25 52,16 58,17 C64,18 62,30 70,27 C80,23 84,10 92,14 C98,17 94,30 104,27 C114,24 118,14 128,18 C136,21 138,28 152,24"
                  sigP={sigP}
                />
              </svg>
              <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: 'rgba(10,10,10,0.5)' }}>Leietaker — Emma Nordvik</div>
            </div>
            <div
              style={{
                position: 'absolute', bottom: 'calc(var(--su) * -2)', right: 'calc(var(--su) * -2.4)',
                opacity: clamp01(bankP * 2),
                transform: `rotate(-4deg) scale(${Math.max(0.4, easeOutBack(bankP)).toFixed(3)})`,
                background: '#FDFCFB', border: '1px solid rgba(10,10,10,0.08)', borderRadius: 999,
                padding: 'calc(var(--su) * 0.8) calc(var(--su) * 1.5)',
                display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                boxShadow: '0 calc(var(--su)*1) calc(var(--su)*3.5) rgba(0,0,0,0.45)',
              }}
            >
              <img src="/bankid-logo.png" alt="BankID" style={{ height: 'calc(var(--su) * 2.2)', width: 'auto', borderRadius: 'calc(var(--su)*0.4)' }} />
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.5)', fontWeight: 500, color: '#0A0A0A' }}>Signert med BankID</span>
              <span style={{ color: '#16a34a', fontSize: 'calc(var(--su) * 1.7)', fontWeight: 700 }}>✓</span>
            </div>
          </div>
            );
          })()}
        </div>
      )}
      {partB > 0.01 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: partB, filter: partBBlur > 0.3 ? `blur(${partBBlur.toFixed(1)}px)` : 'none' }}>
          <Kicker t={t} at={43.6} num="08" label="HUSLEIE" center />
          <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 5.4)', color: '#FDFCFB', lineHeight: 1.1, textShadow: landGlow(t, 44.4) }}>
            <Words t={t} at={43.7} text="Og husleien?" />
          </h2>
          <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1)' }}>
            <Words t={t} at={44.2} stagger={0.12} text="Den bare kommer." />
          </p>
          <div style={{ marginTop: 'calc(var(--su) * 3.4)', textAlign: 'center', position: 'relative' }}>
            {/* glød bak beløpet som pulserer ved fullført innbetaling */}
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 'calc(var(--su) * -6) calc(var(--su) * -10)',
                background: 'radial-gradient(ellipse 60% 55% at 50% 60%, rgba(155,91,214,0.22), transparent 70%)',
                filter: 'blur(calc(var(--su) * 1.8))',
                opacity: (0.4 * countP + 0.6 * Math.sin(clamp01(seg(t, 46.85, 47.9)) * Math.PI)).toFixed(3),
                pointerEvents: 'none',
              }}
            />
            {/* stigende lyspartikler mens beløpet teller opp */}
            {(() => {
              const win = Math.min(seg(t, 44.9, 45.6), 1 - seg(t, 47.6, 48.4));
              if (win <= 0.01) return null;
              return (
                <div aria-hidden="true" style={{ position: 'absolute', inset: 'calc(var(--su) * -4) calc(var(--su) * -6)', pointerEvents: 'none', opacity: win }}>
                  {Array.from({ length: 9 }).map((_, i) => {
                    const cyc = 3.4 + dRand(i, 61) * 2.2;
                    const ph = ((t - 44.9) / cyc + dRand(i, 62)) % 1;
                    const x = 8 + dRand(i, 63) * 84;
                    const y = 100 - ph * 105;
                    const sz = 0.28 + dRand(i, 64) * 0.35;
                    return (
                      <span
                        key={i}
                        style={{
                          position: 'absolute', left: `${x.toFixed(1)}%`, top: `${y.toFixed(1)}%`,
                          width: `calc(var(--su) * ${sz.toFixed(2)})`, height: `calc(var(--su) * ${sz.toFixed(2)})`,
                          borderRadius: '50%', background: '#CF97FC',
                          boxShadow: '0 0 calc(var(--su)*0.7) rgba(207,151,252,0.85)',
                          opacity: (Math.sin(ph * Math.PI) * (0.3 + 0.5 * dRand(i, 65))).toFixed(3),
                        }}
                      />
                    );
                  })}
                </div>
              );
            })()}
            <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.3)', letterSpacing: '0.35em', color: 'rgba(207,151,252,0.85)', marginBottom: 'calc(var(--su) * 1)', position: 'relative' }}>
              HUSLEIE · NOVEMBER
            </div>
            <div className="font-heading font-bold" style={{ position: 'relative', fontSize: 'calc(var(--su) * 9.5)', color: '#FDFCFB', lineHeight: 1, fontVariantNumeric: 'tabular-nums', opacity: countP > 0 ? 1 : 0, transform: `scale(${(1 + Math.sin(clamp01(seg(t, 46.85, 47.5)) * Math.PI) * 0.045).toFixed(3)})`, textShadow: `0 0 calc(var(--su) * ${(Math.sin(clamp01(seg(t, 46.85, 47.9)) * Math.PI) * 3.2).toFixed(2)}) rgba(207,151,252,0.55)` }}>
              {fmtNOK(amount)} kr
            </div>
          </div>
          <div
            style={{
              ...rise(txnIn, 2),
              marginTop: 'calc(var(--su) * 3.2)',
              display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1.4)',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 999, padding: 'calc(var(--su) * 1.1) calc(var(--su) * 2.4)',
            }}
          >
            <img src="/brand/digihome-icon-purple.svg" alt="" style={{ height: 'calc(var(--su) * 2.2)', width: 'auto', borderRadius: 'calc(var(--su)*0.4)' }} />
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.8)' }}>DigiHome → Din konto</span>
            <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.4)', color: '#7ee2a8', background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', borderRadius: 999, padding: 'calc(var(--su)*0.4) calc(var(--su)*1.1)' }}>
              Utbetalt ✓
            </span>
          </div>
          <Anamorphic t={t} at={46.9} x="50%" y="60%" maxW={72} dur={1.25} />
        </div>
      )}
    </Shell>
  );
}

/* =====================================================================
   AKT 6 — DYNAMISK UTLEIE (48.5–57.5s)
   Kombinér langtid og korttid — f.eks. Airbnb om sommeren — for
   maksimal inntekt. Visualisert som en års-tidslinje.
===================================================================== */
const DYN_W = 39.2;                 /* indre kortbredde i su */
const DYN_M = DYN_W / 12;           /* månedsbredde */
const DYN_MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
/* langtidsblokker: [fraMnd, tilMnd, sveipStart, etikett] */
const DYN_LONG = [
  [0, 5, 50.4, 'Langtid'],
  [8, 12, 50.9, 'Langtid'],
];
const DYN_SUMMER_X0 = 5 * DYN_M + 0.15;
const DYN_SUMMER_X1 = 8 * DYN_M - 0.15;
/* korttidsbookinger i sommerhullet: [bredde-su, popStart] */
const DYN_SHORT = [
  [1.9, 52.6], [1.3, 52.85], [2.2, 53.1], [1.2, 53.35], [1.7, 53.6],
];
const DYN_SHORT_X = (() => {
  let x = DYN_SUMMER_X0 + 0.25;
  return DYN_SHORT.map(([w]) => {
    const cur = x;
    x += w + 0.28;
    return cur;
  });
})();

export function SceneDynamisk({ t }) {
  const lp = seg(t, 48.5, 57.5);
  const cardIn = easeOutQuint(seg(t, 49.3, 50.3));
  const dash = Math.min(seg(t, 51.7, 52.2), 1 - seg(t, 52.65, 53.05)); /* «Sommer?»-puls */
  const tagIn = easeOutBack(seg(t, 53.1, 53.7));
  const tagO = clamp01(seg(t, 53.1, 53.4) * 2);
  const cmpIn = clamp01(seg(t, 54.1, 54.65) * 1.5);
  const aA = Math.round(easeOutExpo(seg(t, 54.4, 55.5)) * 298000);
  const aB = Math.round(easeOutExpo(seg(t, 54.5, 55.7)) * 352000);
  const barA = easeOutCubic(seg(t, 54.35, 55.35));
  const barB = easeOutCubic(seg(t, 54.5, 55.6));
  const plussIn = easeOutBack(seg(t, 55.7, 56.2));
  const badgeIn = seg(t, 56.2, 56.7);
  const capIn = easeOutCubic(seg(t, 54.9, 55.7));
  const pillOn = clamp01(seg(t, 52.6, 53.1) * 1.5);
  const f3 = float3d(t, 3.3);
  const summerC = (DYN_SUMMER_X0 + DYN_SUMMER_X1) / 2;

  return (
    <Shell t={t} a={48.5} b={57.5}>
      <LeftCol lp={lp}>
        <Kicker t={t} at={48.95} num="09" label="DYNAMISK" />
        <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08, textShadow: landGlow(t, 49.9) }}>
          <Words t={t} at={49.1} text="Maksimal inntekt?" />
        </h2>
        <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
          <Words t={t} at={49.8} stagger={0.09} text="Kombinér langtid og korttid — du bestemmer." />
        </p>
        <div className="font-body" style={{ ...rise(capIn, 2), marginTop: 'calc(var(--su) * 3)', display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)' }}>
          <span style={{ width: 'calc(var(--su) * 0.8)', height: 'calc(var(--su) * 0.8)', borderRadius: '50%', background: '#CF97FC', display: 'inline-block' }} />
          <span style={{ fontSize: 'calc(var(--su) * 1.6)', color: 'rgba(207,151,252,0.9)', letterSpacing: '0.08em' }}>
            Vinter: langtid · Sommer: Airbnb
          </span>
        </div>
      </LeftCol>
      <div
        style={{
          position: 'absolute', right: '7%', top: '50%', width: '44%',
          transform: `perspective(calc(var(--su) * 130)) translateY(-50%) translateY(calc(var(--su) * ${((1 - cardIn) * 5 - lp * 1.2 + f3.y).toFixed(2)})) rotateY(${(-7 + 5.2 * cardIn + f3.ry * cardIn).toFixed(2)}deg) rotateX(${(1.5 - cardIn + f3.rx * cardIn).toFixed(2)}deg) scale(${(0.95 + cardIn * 0.05).toFixed(3)})`,
          opacity: cardIn,
          background: '#131316',
          borderRadius: 'calc(var(--su) * 1.8)', padding: 'calc(var(--su) * 2.2) calc(var(--su) * 2.4)',
          boxShadow: '0 calc(var(--su)*0.3) calc(var(--su)*1) rgba(0,0,0,0.45), 0 calc(var(--su)*2.6) calc(var(--su)*8) rgba(0,0,0,0.6), 0 0 calc(var(--su)*7) rgba(155,91,214,0.10)',
        }}
      >
        <CardEdge />
        <Glare t={t} at={50.55} />
        <FloorGlow opacity={cardIn} />
        {/* topplinje: tittel + legende + DYNAMISK-pille */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'calc(var(--su) * 1.6)' }}>
          <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.7)', color: 'rgba(253,252,251,0.85)', fontWeight: 500 }}>
            Året ditt
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1.5)' }}>
            <span className="font-body" style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.5)', fontSize: 'calc(var(--su) * 1.1)', color: 'rgba(253,252,251,0.55)' }}>
              <span style={{ width: 'calc(var(--su) * 0.85)', height: 'calc(var(--su) * 0.85)', borderRadius: 3, background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)' }} />
              Langtid
            </span>
            <span className="font-body" style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.5)', fontSize: 'calc(var(--su) * 1.1)', color: 'rgba(253,252,251,0.55)' }}>
              <span style={{ width: 'calc(var(--su) * 0.85)', height: 'calc(var(--su) * 0.85)', borderRadius: 3, background: 'rgba(207,151,252,0.16)', border: '1px solid rgba(207,151,252,0.65)' }} />
              Korttid
            </span>
            <span
              className="font-body"
              style={{
                fontSize: 'calc(var(--su) * 1.05)', letterSpacing: '0.18em', color: '#CF97FC',
                border: '1px solid rgba(207,151,252,0.5)', borderRadius: 999,
                padding: 'calc(var(--su)*0.35) calc(var(--su)*0.95)',
                background: `rgba(207,151,252,${(0.04 + pillOn * 0.07).toFixed(3)})`,
                boxShadow: `0 0 calc(var(--su) * ${(pillOn * (1.1 + 0.5 * Math.abs(Math.sin(t * 2.4)))).toFixed(2)}) rgba(207,151,252,0.6)`,
              }}
            >
              DYNAMISK
            </span>
          </span>
        </div>
        {/* månedsbokstaver */}
        <div style={{ position: 'relative', width: `calc(var(--su) * ${DYN_W})`, height: 'calc(var(--su) * 1.5)', margin: '0 auto calc(var(--su) * 0.4)' }}>
          {DYN_MONTHS.map((m, i) => (
            <span
              key={i}
              className="font-body"
              style={{
                position: 'absolute', left: `calc(var(--su) * ${(i * DYN_M).toFixed(2)})`,
                width: `calc(var(--su) * ${DYN_M.toFixed(2)})`,
                textAlign: 'center', fontSize: 'calc(var(--su) * 1)', letterSpacing: '0.1em',
                color: 'rgba(253,252,251,0.35)',
                opacity: clamp01(seg(t, 49.7 + i * 0.03, 50.0 + i * 0.03) * 1.5),
              }}
            >
              {m}
            </span>
          ))}
        </div>
        {/* års-tidslinje */}
        <div style={{ position: 'relative', width: `calc(var(--su) * ${DYN_W})`, height: 'calc(var(--su) * 6)', margin: '0 auto' }}>
          {/* spor */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: 'calc(var(--su) * 1)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }} />
          {/* månedsskiller */}
          {Array.from({ length: 11 }, (_, i) => (
            <span key={i} aria-hidden="true" style={{ position: 'absolute', left: `calc(var(--su) * ${((i + 1) * DYN_M).toFixed(2)})`, top: 'calc(var(--su) * 0.8)', bottom: 'calc(var(--su) * 0.8)', width: 1, background: 'rgba(255,255,255,0.05)' }} />
          ))}
          {/* langtidsblokker som sveiper inn */}
          {DYN_LONG.map(([m0, m1, at, label], i) => {
            const sw = easeInOutCubic(seg(t, at, at + 0.8));
            if (sw <= 0.003) return null;
            const x0 = m0 * DYN_M + 0.15;
            const x1 = m1 * DYN_M - 0.15;
            return (
              <div
                key={`l${i}`}
                style={{
                  position: 'absolute', left: `calc(var(--su) * ${x0.toFixed(2)})`, top: 'calc(var(--su) * 0.5)',
                  width: `calc(var(--su) * ${((x1 - x0) * sw).toFixed(2)})`, height: 'calc(var(--su) * 5)',
                  borderRadius: 'calc(var(--su) * 0.8)',
                  background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)',
                  boxShadow: '0 calc(var(--su)*0.25) calc(var(--su)*1.3) rgba(155,91,214,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                }}
              >
                <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.2)', color: '#0A0A0A', fontWeight: 600, whiteSpace: 'nowrap', opacity: clamp01(seg(t, at + 0.7, at + 1.05) * 1.6) }}>
                  {label}
                </span>
              </div>
            );
          })}
          {/* sommerhullet: «Sommer?» før autopiloten fyller det */}
          {dash > 0.02 && (
            <div
              style={{
                position: 'absolute', left: `calc(var(--su) * ${DYN_SUMMER_X0.toFixed(2)})`, top: 'calc(var(--su) * 0.5)',
                width: `calc(var(--su) * ${(DYN_SUMMER_X1 - DYN_SUMMER_X0).toFixed(2)})`, height: 'calc(var(--su) * 5)',
                borderRadius: 'calc(var(--su) * 0.8)',
                border: '1.5px dashed rgba(207,151,252,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: dash,
              }}
            >
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.15)', color: 'rgba(207,151,252,0.8)', letterSpacing: '0.08em' }}>
                Sommer?
              </span>
            </div>
          )}
          {/* korttidsbookinger som kaskaderer inn */}
          {DYN_SHORT.map(([w, at], i) => {
            const pop = easeOutBack(seg(t, at, at + 0.5));
            const o = clamp01(seg(t, at, at + 0.28) * 2);
            if (o <= 0.003) return null;
            const ringP = seg(t, at + 0.1, at + 0.7);
            return (
              <div
                key={`k${i}`}
                style={{
                  position: 'absolute', left: `calc(var(--su) * ${DYN_SHORT_X[i].toFixed(2)})`, top: 'calc(var(--su) * 0.95)',
                  width: `calc(var(--su) * ${w.toFixed(2)})`, height: 'calc(var(--su) * 4.1)',
                  opacity: o,
                  transform: `scale(${Math.max(0.5, pop).toFixed(3)})`,
                }}
              >
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    borderRadius: 'calc(var(--su) * 0.6)',
                    background: 'rgba(207,151,252,0.16)',
                    border: '1px solid rgba(207,151,252,0.65)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 'calc(var(--su) * 0.9)', color: '#EDDCFF' }}>✦</span>
                </div>
                {ringP > 0.003 && ringP < 0.997 && (
                  <div aria-hidden="true" style={{ position: 'absolute', inset: `calc(var(--su) * ${(-(easeOutCubic(ringP) * 1.2)).toFixed(2)})`, borderRadius: 'calc(var(--su) * 1.1)', border: '1px solid rgba(207,151,252,0.6)', opacity: (1 - ringP).toFixed(3) }} />
                )}
              </div>
            );
          })}
        </div>
        {/* Airbnb-tag under sommeren */}
        <div style={{ position: 'relative', width: `calc(var(--su) * ${DYN_W})`, height: 'calc(var(--su) * 3.6)', margin: '0 auto' }}>
          {tagO > 0.003 && (
            <>
              <span aria-hidden="true" style={{ position: 'absolute', left: `calc(var(--su) * ${summerC.toFixed(2)})`, top: 0, width: 1, height: 'calc(var(--su) * 0.8)', background: 'rgba(207,151,252,0.5)', opacity: tagO }} />
              <span
                className="font-body"
                style={{
                  position: 'absolute', left: `calc(var(--su) * ${summerC.toFixed(2)})`, top: 'calc(var(--su) * 0.9)',
                  transform: `translateX(-50%) scale(${Math.max(0.6, tagIn).toFixed(3)})`,
                  opacity: tagO,
                  fontSize: 'calc(var(--su) * 1.15)', color: '#EDDCFF', whiteSpace: 'nowrap',
                  border: '1px solid rgba(207,151,252,0.5)', borderRadius: 999,
                  padding: 'calc(var(--su) * 0.45) calc(var(--su) * 1.2)',
                  background: 'rgba(207,151,252,0.1)',
                  boxShadow: '0 0 calc(var(--su)*1.4) rgba(155,91,214,0.25)',
                }}
              >
                ✦ Airbnb om sommeren · opptil 2× nattpris
              </span>
            </>
          )}
        </div>
        {/* inntektssammenligning */}
        <div style={{ opacity: cmpIn, marginTop: 'calc(var(--su) * 0.4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)', marginBottom: 'calc(var(--su) * 1.1)' }}>
            <span className="font-body" style={{ width: 'calc(var(--su) * 12.5)', fontSize: 'calc(var(--su) * 1.25)', color: 'rgba(253,252,251,0.55)' }}>Kun langtid</span>
            <span style={{ position: 'relative', flex: 1, height: 'calc(var(--su) * 1.4)', borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(70 * barA).toFixed(1)}%`, borderRadius: 999, background: 'rgba(255,255,255,0.28)' }} />
            </span>
            <span className="font-heading font-bold" style={{ width: 'calc(var(--su) * 10.5)', textAlign: 'right', fontSize: 'calc(var(--su) * 1.55)', color: 'rgba(253,252,251,0.7)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {fmtNOK(aA)} kr
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)' }}>
            <span className="font-body" style={{ width: 'calc(var(--su) * 12.5)', fontSize: 'calc(var(--su) * 1.25)', color: 'rgba(253,252,251,0.85)' }}>Langtid + korttid</span>
            <span style={{ position: 'relative', flex: 1, height: 'calc(var(--su) * 1.4)', borderRadius: 999, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(82.5 * barB).toFixed(1)}%`, borderRadius: 999, background: 'linear-gradient(90deg, #9B5BD6, #CF97FC)', boxShadow: '0 0 calc(var(--su)*1) rgba(155,91,214,0.5)' }} />
            </span>
            <span className="font-heading font-bold" style={{ width: 'calc(var(--su) * 10.5)', textAlign: 'right', fontSize: 'calc(var(--su) * 1.55)', color: '#FDFCFB', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {fmtNOK(aB)} kr
            </span>
          </div>
        </div>
        {/* badge: +18 % og konklusjon */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'calc(var(--su) * 1)', marginTop: 'calc(var(--su) * 1.6)' }}>
          <span
            className="font-body"
            style={{
              opacity: clamp01(plussIn * 2),
              transform: `scale(${Math.max(0.6, plussIn).toFixed(3)})`,
              fontSize: 'calc(var(--su) * 1.3)', fontWeight: 600, color: '#7ee2a8',
              border: '1px solid rgba(126,226,168,0.45)', borderRadius: 999,
              padding: 'calc(var(--su) * 0.4) calc(var(--su) * 1.1)',
              background: 'rgba(126,226,168,0.08)',
              whiteSpace: 'nowrap',
            }}
          >
            ↑ +18 % i året
          </span>
          <span
            className="font-body"
            style={{
              opacity: clamp01(badgeIn * 2),
              transform: `scale(${Math.max(0.6, easeOutBack(badgeIn)).toFixed(3)})`,
              fontSize: 'calc(var(--su) * 1.3)', letterSpacing: '0.07em',
              color: 'rgba(207,151,252,0.95)',
              border: '1px solid rgba(207,151,252,0.4)', borderRadius: 999,
              padding: 'calc(var(--su) * 0.4) calc(var(--su) * 1.3)',
              background: 'rgba(207,151,252,0.07)',
              whiteSpace: 'nowrap',
            }}
          >
            Du bestemmer ✓
          </span>
        </div>
      </div>
      <Anamorphic t={t} at={55.7} x="71%" y="68%" maxW={42} dur={1.0} />
    </Shell>
  );
}



/* =====================================================================
   AKT 7 — CHAT MED LEIETAKER (57.5–68.5s)
===================================================================== */
function Bubble({ t, at, side, children, time, k = 1 }) {
  const p = easeOutBack(seg(t, at, at + 0.6));
  const o = clamp01(seg(t, at, at + 0.35) * 2);
  if (o <= 0.003) return null; /* ikke reserver plass før meldingen ankommer */
  const isRight = side === 'right';
  return (
    <div style={{ display: 'flex', justifyContent: isRight ? 'flex-end' : 'flex-start', marginBottom: `calc(var(--su) * ${(1.1 * k).toFixed(2)})` }}>
      <div
        style={{
          opacity: o,
          transform: `scale(${Math.max(0.5, p).toFixed(3)}) translateY(calc(var(--su) * ${((1 - clamp01(p)) * 1.5).toFixed(2)}))`,
          transformOrigin: isRight ? 'bottom right' : 'bottom left',
          maxWidth: '82%',
          background: isRight ? 'linear-gradient(120deg, #CF97FC, #b07ce0)' : 'rgba(255,255,255,0.08)',
          color: isRight ? '#0A0A0A' : 'rgba(253,252,251,0.92)',
          border: isRight ? 'none' : '1px solid rgba(255,255,255,0.08)',
          borderRadius: `calc(var(--su) * ${(1.6 * k).toFixed(2)})`,
          borderBottomRightRadius: isRight ? `calc(var(--su) * ${(0.4 * k).toFixed(2)})` : `calc(var(--su) * ${(1.6 * k).toFixed(2)})`,
          borderBottomLeftRadius: isRight ? `calc(var(--su) * ${(1.6 * k).toFixed(2)})` : `calc(var(--su) * ${(0.4 * k).toFixed(2)})`,
          padding: `calc(var(--su) * ${(1.1 * k).toFixed(2)}) calc(var(--su) * ${(1.6 * k).toFixed(2)})`,
          boxShadow: isRight ? '0 calc(var(--su)*0.5) calc(var(--su)*1.6) rgba(155,91,214,0.25)' : '0 calc(var(--su)*0.4) calc(var(--su)*1.2) rgba(0,0,0,0.3)',
        }}
      >
        <div className="font-body" style={{ fontSize: `calc(var(--su) * ${(1.65 * k).toFixed(2)})`, lineHeight: 1.45 }}>{children}</div>
        {time ? (
          <div className="font-body" style={{ fontSize: `calc(var(--su) * ${(1.05 * k).toFixed(2)})`, opacity: 0.55, marginTop: `calc(var(--su) * ${(0.4 * k).toFixed(2)})`, textAlign: 'right' }}>
            {time}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SceneChat({ t }) {
  const lp = seg(t, 57.5, 68.5);
  const cardIn = easeOutQuint(seg(t, 58.4, 59.4));
  const typingOn = t >= 60.4 && t < 61.5;
  const statusIn = seg(t, 65.2, 65.9);
  const capIn = easeOutCubic(seg(t, 65.6, 66.4));

  return (
    <Shell t={t} a={57.5} b={68.5}>
      <LeftCol lp={lp}>
        <Kicker t={t} at={57.95} num="10" label="SVAR 24/7" />
        <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 5.6)', color: '#FDFCFB', lineHeight: 1.1, textShadow: landGlow(t, 59.0) }}>
          <Words t={t} at={58.1} stagger={0.1} text="Leietaker lurer på noe?" />
        </h2>
        <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
          <Words t={t} at={58.7} stagger={0.1} text="Besvart på sekunder. Døgnet rundt." />
        </p>
        <div className="font-body" style={{ ...rise(capIn, 2), marginTop: 'calc(var(--su) * 3)', display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 1)' }}>
          <span style={{ width: 'calc(var(--su) * 0.8)', height: 'calc(var(--su) * 0.8)', borderRadius: '50%', background: '#CF97FC', display: 'inline-block' }} />
          <span style={{ fontSize: 'calc(var(--su) * 1.6)', color: 'rgba(207,151,252,0.9)', letterSpacing: '0.08em' }}>
            Håndtert for deg — hele leieforholdet
          </span>
        </div>
      </LeftCol>
      {(() => {
        const f3 = float3d(t, 4.1);
        return (
      <div
        style={{
          position: 'absolute', right: '10.5%', top: '50%', width: '24%',
          transform: `perspective(calc(var(--su) * 150)) translateY(-50%) translateY(calc(var(--su) * ${((1 - cardIn) * 6 - lp * 1.0 + f3.y).toFixed(2)})) rotateY(${(-11 + 6.5 * cardIn + f3.ry * cardIn * 1.5).toFixed(2)}deg) rotateX(${(2 - 1.4 * cardIn + f3.rx * cardIn).toFixed(2)}deg) scale(${(0.94 + cardIn * 0.06).toFixed(3)})`,
          opacity: cardIn,
        }}
      >
        {/* atmosfærisk glød bak telefonen */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: '-10% -28%',
            background: 'radial-gradient(ellipse at 50% 45%, rgba(155,91,214,0.22), transparent 65%)',
            filter: 'blur(calc(var(--su) * 2))',
            pointerEvents: 'none',
          }}
        />
        {/* telefonramme */}
        <div
          style={{
            position: 'relative', aspectRatio: '9 / 18.2',
            borderRadius: 'calc(var(--su) * 3.3)',
            background: 'linear-gradient(160deg, #3c3c44 0%, #18181c 28%, #101014 72%, #2a2a31 100%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.09), 0 calc(var(--su)*0.3) calc(var(--su)*1) rgba(0,0,0,0.5), 0 calc(var(--su)*3) calc(var(--su)*9) rgba(0,0,0,0.65), 0 0 calc(var(--su)*8) rgba(155,91,214,0.12)',
          }}
        >
          {/* sideknapper */}
          <div aria-hidden="true" style={{ position: 'absolute', left: 'calc(var(--su) * -0.22)', top: '22%', width: 'calc(var(--su) * 0.25)', height: '5%', borderRadius: 99, background: '#26262c' }} />
          <div aria-hidden="true" style={{ position: 'absolute', left: 'calc(var(--su) * -0.22)', top: '29%', width: 'calc(var(--su) * 0.25)', height: '8%', borderRadius: 99, background: '#26262c' }} />
          <div aria-hidden="true" style={{ position: 'absolute', right: 'calc(var(--su) * -0.22)', top: '26%', width: 'calc(var(--su) * 0.25)', height: '11%', borderRadius: 99, background: '#26262c' }} />
          {/* skjerm */}
          <div
            style={{
              position: 'absolute', inset: 'calc(var(--su) * 0.5)',
              borderRadius: 'calc(var(--su) * 2.8)',
              background: 'linear-gradient(180deg, #16161D 0%, #0E0E13 100%)',
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* skjerm-ambient */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(195deg, rgba(155,91,214,0.10), transparent 32%, transparent 68%, rgba(155,91,214,0.07))', pointerEvents: 'none' }} />
            {/* statuslinje */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'calc(var(--su) * 0.9) calc(var(--su) * 1.7) 0', position: 'relative' }}>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.05)', fontWeight: 500, color: 'rgba(253,252,251,0.92)', fontVariantNumeric: 'tabular-nums' }}>21:47</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.45)' }}>
                {/* signal */}
                <span style={{ display: 'flex', alignItems: 'flex-end', gap: 'calc(var(--su) * 0.14)' }}>
                  {[0.4, 0.6, 0.8, 1].map((h, i) => (
                    <span key={i} style={{ width: 'calc(var(--su) * 0.22)', height: `calc(var(--su) * ${(h * 0.95).toFixed(2)})`, borderRadius: 1, background: 'rgba(253,252,251,0.9)' }} />
                  ))}
                </span>
                {/* batteri */}
                <span style={{ width: 'calc(var(--su) * 1.7)', height: 'calc(var(--su) * 0.85)', borderRadius: 'calc(var(--su) * 0.22)', border: '1px solid rgba(253,252,251,0.5)', padding: 1, display: 'flex' }}>
                  <span style={{ width: '78%', borderRadius: 1, background: 'rgba(253,252,251,0.9)' }} />
                </span>
              </span>
            </div>
            {/* dynamic island */}
            <div aria-hidden="true" style={{ position: 'absolute', top: 'calc(var(--su) * 0.75)', left: '50%', transform: 'translateX(-50%)', width: 'calc(var(--su) * 4.4)', height: 'calc(var(--su) * 1.25)', borderRadius: 999, background: '#000', boxShadow: 'inset 0 0 calc(var(--su)*0.3) rgba(255,255,255,0.06)' }} />
            {/* chat-header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)', padding: 'calc(var(--su) * 1.1) calc(var(--su) * 1.5) calc(var(--su) * 0.95)', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'relative' }}>
              <img src="/brand/digihome-icon-purple.svg" alt="" style={{ width: 'calc(var(--su) * 2.5)', height: 'calc(var(--su) * 2.5)', borderRadius: 'calc(var(--su) * 0.65)' }} />
              <div style={{ flex: 1 }}>
                <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.35)', fontWeight: 500, color: '#FDFCFB' }}>DigiHome</div>
                <div className="font-body" style={{ fontSize: 'calc(var(--su) * 0.95)', color: '#7ee2a8', display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.4)' }}>
                  <span style={{ width: 'calc(var(--su) * 0.55)', height: 'calc(var(--su) * 0.55)', borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: `0 0 calc(var(--su) * ${(0.6 + 0.4 * Math.sin(t * 2.2)).toFixed(2)}) rgba(34,197,94,0.8)` }} />
                  Alltid på
                </div>
              </div>
              <span className="font-body" style={{ fontSize: 'calc(var(--su) * 0.9)', letterSpacing: '0.16em', color: '#CF97FC', border: '1px solid rgba(207,151,252,0.45)', borderRadius: 999, padding: 'calc(var(--su)*0.3) calc(var(--su)*0.8)' }}>
                24/7
              </span>
            </div>
            {/* meldinger — forankret nederst som i ekte chat */}
            <div style={{ padding: 'calc(var(--su) * 1.4) calc(var(--su) * 1.4) 0', flex: 1, minHeight: 0, overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div
                className="font-body"
                style={{
                  opacity: clamp01(seg(t, 59.15, 59.55) * 1.5),
                  textAlign: 'center',
                  fontSize: 'calc(var(--su) * 0.92)', letterSpacing: '0.04em',
                  color: 'rgba(253,252,251,0.38)',
                  marginBottom: 'calc(var(--su) * 1)',
                }}
              >
                I dag 21:47
              </div>
              <Bubble t={t} at={59.5} side="left" time="21:47" k={0.82}>Hei! Varmtvannet er plutselig borte 🥶</Bubble>
              {typingOn && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'calc(var(--su) * 0.9)' }}>
                  <div style={{ background: 'rgba(207,151,252,0.18)', borderRadius: 'calc(var(--su) * 1.3)', padding: 'calc(var(--su) * 0.8) calc(var(--su) * 1.2)', display: 'flex', gap: 'calc(var(--su) * 0.45)' }}>
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        style={{
                          width: 'calc(var(--su) * 0.65)', height: 'calc(var(--su) * 0.65)', borderRadius: '50%', background: '#CF97FC',
                          opacity: 0.35 + 0.65 * Math.abs(Math.sin((t * 4 + i * 0.9))),
                          display: 'inline-block',
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <Bubble t={t} at={61.6} side="right" time="21:47" k={0.82}>Det fikser vi! Rørlegger kommer i morgen kl. 09:00.</Bubble>
              <Bubble t={t} at={63.6} side="left" time="21:48" k={0.82}>Wow, så raskt! Tusen takk 🙌</Bubble>
              {statusIn > 0.003 && (
              <div
                className="font-body"
                style={{
                  opacity: clamp01(statusIn * 2),
                  transform: `scale(${Math.max(0.6, easeOutBack(statusIn)).toFixed(3)})`,
                  margin: 'calc(var(--su) * 1.2) auto 0',
                  width: 'fit-content',
                  fontSize: 'calc(var(--su) * 1.05)', letterSpacing: '0.07em',
                  color: 'rgba(207,151,252,0.95)',
                  border: '1px solid rgba(207,151,252,0.4)', borderRadius: 999,
                  padding: 'calc(var(--su) * 0.5) calc(var(--su) * 1.3)',
                  background: 'rgba(207,151,252,0.07)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                Besvart automatisk · 8 sek
              </div>
              )}
            </div>
            {/* meldingsfelt nederst */}
            <div style={{ padding: 'calc(var(--su) * 0.9) calc(var(--su) * 1.3) calc(var(--su) * 1.2)', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'calc(var(--su) * 0.8)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 999, padding: 'calc(var(--su) * 0.6) calc(var(--su) * 1.2)' }}>
                <span className="font-body" style={{ fontSize: 'calc(var(--su) * 1.15)', color: 'rgba(253,252,251,0.4)', flex: 1 }}>Melding…</span>
                <span style={{ width: 'calc(var(--su) * 1.8)', height: 'calc(var(--su) * 1.8)', borderRadius: '50%', background: 'linear-gradient(135deg, #CF97FC, #9B5BD6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg style={{ width: 'calc(var(--su) * 1)', height: 'calc(var(--su) * 1)' }} viewBox="0 0 24 24" fill="none" stroke="#0A0A0A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </span>
              </div>
            </div>
            {/* skjermglare */}
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 28%, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.015) 48%, transparent 58%)', pointerEvents: 'none' }} />
            {/* skjermpuls når melding kommer inn */}
            {(() => {
              const pp = Math.sin(clamp01(seg(t, 59.5, 60.05)) * Math.PI);
              if (pp <= 0.02) return null;
              return <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 35%, rgba(207,151,252,0.14), transparent 70%)', opacity: pp, pointerEvents: 'none' }} />;
            })()}
          </div>
        </div>
      </div>
        );
      })()}
    </Shell>
  );
}

/* =====================================================================
   AKT 8 — FINALE (68–84s)
===================================================================== */
const FINAL_CHIPS = [
  'Annonse publisert', 'Visninger booket', 'Leietaker screenet',
  'Kontrakt signert', 'Husleie utbetalt', 'Henvendelser besvart',
];
/* posisjoner (i su, relativt sentrum) for samle-animasjonen */
const CHIP_POS = [
  [-23.5, -5.6], [0, -5.6], [23.5, -5.6],
  [-23.5, 5.6], [-1.2, 5.6], [23.5, 5.6],
];

export function SceneFinale({ t }) {
  const txt = Math.min(easeOutCubic(seg(t, 75.45, 76.25)), 1 - seg(t, 78.7, 79.4));
  const morph = easeInOutCubic(seg(t, 77.4, 78.0));
  const glow = Math.sin(clamp01(seg(t, 77.4, 78.9)) * Math.PI);
  const logoIn = easeOutQuint(seg(t, 79.3, 80.5));
  const urlIn = easeOutCubic(seg(t, 80.9, 81.7));

  const charRise = (i) => {
    const p = easeOutQuint(seg(t, 75.55 + i * 0.045, 76.45 + i * 0.045));
    return { display: 'inline-block', whiteSpace: 'pre', opacity: Math.min(1, p * 1.6), transform: `translateY(calc(var(--su) * ${((1 - p) * 3.5).toFixed(3)}))` };
  };
  const prefix = 'Trygt. Automa';
  const suffix = 'isk.';

  return (
    <Shell t={t} a={68} b={84} fOut={0} drift={0}>
      {t < 76.8 && (
        <div className="absolute inset-0">
          {/* chips som samles til ett punkt */}
          {FINAL_CHIPS.map((c, i) => {
            const p = seg(t, 68.55 + i * 0.85, 69.35 + i * 0.85);
            if (p <= 0) return null;
            const g = easeInOutCubic(seg(t, 74.35 + i * 0.06, 75.1 + i * 0.06));
            const [px, py] = CHIP_POS[i];
            const x = px * (1 - g);
            const y = py * (1 - g) + (1 - easeOutCubic(p)) * 2;
            const sc = Math.max(0.5, easeOutBack(p)) * (1 - 0.8 * g);
            const op = clamp01(p * 2) * (1 - seg(t, 74.95 + i * 0.06, 75.14 + i * 0.06));
            if (op <= 0.003) return null;
            return (
              <span
                key={c}
                className="font-body"
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: `translate(-50%, -50%) translate(calc(var(--su) * ${x.toFixed(2)}), calc(var(--su) * ${y.toFixed(2)})) scale(${sc.toFixed(3)})`,
                  opacity: op.toFixed(3),
                  fontSize: 'calc(var(--su) * 1.8)', color: 'rgba(253,252,251,0.9)',
                  border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)',
                  borderRadius: 999, padding: 'calc(var(--su) * 0.95) calc(var(--su) * 1.9)',
                  display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--su) * 0.8)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: '#CF97FC', fontWeight: 700 }}>✓</span> {c}
              </span>
            );
          })}
          {/* samlingskjerne — lysende punkt som vokser */}
          {(() => {
            const core = Math.min(easeOutCubic(seg(t, 74.5, 75.12)), 1 - seg(t, 75.18, 75.5));
            if (core <= 0.01) return null;
            const sz = (1.2 + core * 3.6).toFixed(2);
            return (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  width: `calc(var(--su) * ${sz})`, height: `calc(var(--su) * ${sz})`,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #FDFCFB 0%, #CF97FC 38%, rgba(155,91,214,0) 70%)',
                  filter: 'blur(calc(var(--su) * 0.25))',
                  boxShadow: '0 0 calc(var(--su)*4.5) rgba(207,151,252,0.85)',
                  opacity: core,
                }}
              />
            );
          })()}
          {/* brist — ekspanderende ring + lysglimt */}
          {(() => {
            const ring = seg(t, 75.12, 76.15);
            const flash = Math.sin(clamp01(seg(t, 75.1, 75.7)) * Math.PI);
            return (
              <>
                {ring > 0.001 && ring < 0.999 && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', left: '50%', top: '50%',
                      width: `calc(var(--su) * ${(easeOutCubic(ring) * 66).toFixed(2)})`,
                      height: `calc(var(--su) * ${(easeOutCubic(ring) * 66).toFixed(2)})`,
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      border: '1.5px solid rgba(207,151,252,0.6)',
                      opacity: ((1 - ring) * 0.85).toFixed(3),
                    }}
                  />
                )}
                {flash > 0.02 && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'radial-gradient(ellipse 46% 42% at 50% 50%, rgba(207,151,252,0.30), transparent 72%)',
                      opacity: flash,
                    }}
                  />
                )}
              </>
            );
          })()}
        </div>
      )}
      {txt > 0 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: Math.min(1, txt * 1.4) }}>
          <Anamorphic t={t} at={77.4} x="50%" y="50%" maxW={58} dur={1.05} z={1} />
          <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 8)', color: '#FDFCFB', letterSpacing: '-0.03em', lineHeight: 1.1, display: 'flex' }}>
            {prefix.split('').map((ch, i) => (
              <span key={`p${i}`} style={charRise(i)}>{ch}</span>
            ))}
            {/* morph-bokstaven: t -> g (plassen vokser med morphen siden g er bredere enn t) */}
            <span style={{ ...charRise(prefix.length), position: 'relative', perspective: 'calc(var(--su) * 30)', paddingRight: `${(morph * 0.2).toFixed(3)}em` }}>
              <span
                style={{
                  display: 'inline-block',
                  transform: `rotateX(${(morph * 88).toFixed(1)}deg)`,
                  opacity: 1 - morph,
                  transformOrigin: '50% 100%',
                }}
              >
                t
              </span>
              <span
                style={{
                  position: 'absolute', left: 0, top: 0,
                  display: 'inline-block',
                  transform: `rotateX(${((1 - morph) * -88).toFixed(1)}deg)`,
                  opacity: morph,
                  transformOrigin: '50% 0%',
                  color: '#CF97FC',
                  textShadow: `0 0 calc(var(--su) * ${(glow * 2.4).toFixed(2)}) rgba(207,151,252,0.85)`,
                }}
              >
                g
              </span>
              {/* gnister rundt morphen */}
              {[[-1.6, -2.4, 0], [2.2, -1.8, 0.12], [-2.0, 1.6, 0.24], [1.8, 2.2, 0.3]].map(([dx, dy, dl], i) => {
                const sp = seg(t, 77.45 + dl, 78.15 + dl);
                if (sp <= 0 || sp >= 1) return null;
                const fly = easeOutCubic(sp);
                return (
                  <span
                    key={`s${i}`}
                    style={{
                      position: 'absolute', left: '50%', top: '40%',
                      fontSize: 'calc(var(--su) * 1.6)', color: '#CF97FC', fontWeight: 400,
                      opacity: Math.sin(sp * Math.PI),
                      transform: `translate(calc(var(--su) * ${(dx * fly).toFixed(2)}), calc(var(--su) * ${(dy * fly).toFixed(2)})) scale(${(0.5 + fly * 0.6).toFixed(2)})`,
                      pointerEvents: 'none',
                    }}
                  >
                    {'\u2726'}
                  </span>
                );
              })}
            </span>
            {suffix.split('').map((ch, i) => (
              <span key={`e${i}`} style={charRise(prefix.length + 1 + i)}>{ch}</span>
            ))}
          </h2>
        </div>
      )}
      {logoIn > 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: Math.min(1, logoIn * 1.3) }}>
          {/* ren, mørk flate som isolerer finalen */}
          <div className="absolute inset-0" style={{ background: '#060607' }} />
          {/* stjernehimmel — rolig dybde bak logoen */}
          <Starfield t={t} opacity={0.22 * logoIn} />
          {/* langsomt roterende lysstråler (god-rays) */}
          <div
            aria-hidden="true"
            className="absolute"
            style={{
              left: '50%', top: '46%',
              width: 'calc(var(--su) * 95)', height: 'calc(var(--su) * 95)',
              transform: `translate(-50%, -50%) rotate(${(t * 1.6).toFixed(2)}deg)`,
              background: 'repeating-conic-gradient(from 0deg, transparent 0deg 13deg, rgba(155,91,214,0.055) 17deg, transparent 21deg 30deg)',
              WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,0.9), transparent 62%)',
              maskImage: 'radial-gradient(circle, rgba(0,0,0,0.9), transparent 62%)',
              filter: 'blur(calc(var(--su) * 0.6))',
              opacity: (0.55 * logoIn * (1 - seg(t, 82.4, 84))).toFixed(3),
              pointerEvents: 'none',
            }}
          />
          {/* anamorf flare ved logo-avsløringen */}
          <Anamorphic t={t} at={79.4} x="50%" y="46%" maxW={84} dur={1.4} z={1} />
          {/* svært subtil glød bak logoen */}
          <div
            className="absolute"
            style={{
              width: '64%', height: '58%',
              background: 'radial-gradient(ellipse at center, rgba(155,91,214,0.09), transparent 62%)',
              filter: 'blur(calc(var(--su) * 2.5))',
            }}
          />
          {/* tynn horisontlinje under logoen */}
          <div
            className="absolute"
            style={{
              top: '67%', left: '50%',
              width: `calc(var(--su) * ${(26 * easeOutCubic(seg(t, 80.6, 81.8))).toFixed(2)})`,
              height: 1,
              transform: 'translateX(-50%)',
              background: 'linear-gradient(90deg, transparent, rgba(207,151,252,0.45), transparent)',
            }}
          />
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src="/brand/digihome-lockup-white.svg"
              alt="DigiHome"
              style={{ width: 'calc(var(--su) * 30)', height: 'auto', ...rise(logoIn, 2.5), opacity: logoIn, filter: `blur(${((1 - logoIn) * 8).toFixed(1)}px)` }}
            />
            <div className="font-body" style={{ fontSize: 'calc(var(--su) * 1.9)', color: 'rgba(253,252,251,0.55)', marginTop: 'calc(var(--su) * 3.2)', letterSpacing: '0.02em', lineHeight: 1.2 }}>
              <Words t={t} at={80.2} stagger={0.14} text="Utleie på autopilot." />
            </div>
            <div className="font-body" style={{ ...rise(urlIn, 1.2), fontSize: 'calc(var(--su) * 1.25)', letterSpacing: '0.45em', textIndent: '0.45em', color: 'rgba(253,252,251,0.28)', marginTop: 'calc(var(--su) * 3.4)' }}>
              DIGIHOME.NO
            </div>
          </div>
          {/* fade til sort helt på slutten */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: '#000', opacity: seg(t, 83.0, 84) }} />
        </div>
      )}
    </Shell>
  );
}
