'use client';

import { useEffect, useRef } from 'react';
import {
  seg, easeOutCubic, easeInOutCubic, easeOutExpo, easeOutBack, easeOutQuint,
  fadeInOut, rise, typed, fmtNOK, clamp01, Orb, Caret, Words, dRand,
} from './filmUtils';

/* Felles sceneskall — myk blur/skala-overgang + retningsdrift + kameradrift */
function Shell({ t, a, b, fIn = 0.7, fOut = 0.7, drift = 0.02, children }) {
  const enter = fIn === 0 ? 1 : easeOutCubic(seg(t, a, a + fIn));
  const exit = 1 - easeInOutCubic(seg(t, b - fOut, b));
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
  const iconIn = easeOutQuint(seg(t, 0.25, 1.9));
  const ringP = seg(t, 1.5, 2.6);
  const shift = easeInOutCubic(seg(t, 2.2, 3.3));
  const kicker = Math.min(easeOutCubic(seg(t, 0.5, 1.3)), 1 - seg(t, 1.9, 2.5));
  const wipe = easeInOutCubic(seg(t, 4.9, 6.7));
  const lightOut = 1 - seg(t, 5.5, 6.3);
  const driftP = seg(t, 6.7, 8.5);

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
            const p = easeOutQuint(seg(t, 2.5 + i * 0.06, 3.55 + i * 0.06));
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
            opacity: seg(t, 6.7, 8.5) * 0.5,
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
              const p = easeOutQuint(seg(t, 5.7 + i * 0.045, 6.75 + i * 0.045));
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
===================================================================== */
export function SceneToggle({ t }) {
  const grpIn = easeOutQuint(seg(t, 8.8, 9.8));
  const flip = easeInOutCubic(seg(t, 10.2, 10.8));
  const ring = seg(t, 10.75, 12.1);
  const ring2 = seg(t, 11.1, 12.6);
  const orbIn = easeOutCubic(seg(t, 10.8, 12.8));
  const bloom = Math.sin(clamp01(seg(t, 10.55, 11.45)) * Math.PI);

  return (
    <Shell t={t} a={8} b={14.5}>
      <div className="absolute inset-0 flex items-center justify-center">
        <Orb t={t} size="calc(var(--su) * 52)" style={{ opacity: orbIn * 0.8, transform: `scale(${(0.65 + 0.35 * orbIn).toFixed(3)})` }} />
      </div>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(5,5,6,0) 30%, rgba(5,5,6,0.78) 72%)' }} />
      {/* bloom-glimt ved aktivering */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 50% 50%, rgba(207,151,252,0.3), transparent 55%)', opacity: bloom * 0.55 }} />
      {/* energibølge — fin ring som ekspanderer over hele bildet */}
      {(() => {
        const wp = seg(t, 10.62, 12.1);
        if (wp <= 0.001 || wp >= 0.999) return null;
        const e = easeOutCubic(wp);
        const sz = (e * 135).toFixed(2);
        return (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <div
              style={{
                width: `calc(var(--su) * ${sz})`, height: `calc(var(--su) * ${sz})`,
                borderRadius: '50%',
                border: '1.5px solid rgba(207,151,252,0.55)',
                boxShadow: '0 0 calc(var(--su)*1.4) rgba(207,151,252,0.35), inset 0 0 calc(var(--su)*1.4) rgba(207,151,252,0.18)',
                opacity: (Math.sin(wp * Math.PI) * 0.75).toFixed(3),
                flexShrink: 0,
              }}
            />
          </div>
        );
      })()}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={rise(grpIn, 3)}>
        <div
          className="font-body uppercase"
          style={{ fontSize: 'calc(var(--su) * 1.7)', letterSpacing: '0.5em', textIndent: '0.5em', color: 'rgba(253,252,251,0.85)', marginBottom: 'calc(var(--su) * 2.6)' }}
        >
          Autopilot
        </div>
        <div style={{ position: 'relative' }}>
          <SparkBurst t={t} at={10.62} count={10} />
          {[ring, ring2].map((r, i) => (
            <div
              key={i}
              style={{
                position: 'absolute', inset: 'calc(var(--su) * -1)', borderRadius: '999px',
                border: '1.5px solid rgba(207,151,252,0.8)',
                opacity: r > 0 ? (1 - r) * 0.9 : 0,
                transform: `scale(${(1 + r * (1.6 + i * 0.5)).toFixed(3)})`,
              }}
            />
          ))}
          <div
            style={{
              width: 'calc(var(--su) * 13.5)', height: 'calc(var(--su) * 7)', borderRadius: '999px',
              position: 'relative', overflow: 'hidden',
              background: '#222226', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: flip > 0.5 ? `0 0 calc(var(--su) * ${(flip * 4).toFixed(2)}) rgba(207,151,252,0.5)` : 'none',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(120deg, #9B5BD6, #CF97FC)', opacity: flip }} />
            <div
              style={{
                position: 'absolute', top: 'calc(var(--su) * 0.6)', left: 'calc(var(--su) * 0.6)',
                width: 'calc(var(--su) * 5.8)', height: 'calc(var(--su) * 5.8)', borderRadius: '50%',
                background: '#FDFCFB', boxShadow: '0 2px 14px rgba(0,0,0,0.45)',
                transform: `translateX(calc(var(--su) * ${(flip * 6.5).toFixed(3)}))`,
              }}
            />
          </div>
        </div>
        <div
          className="font-heading"
          style={{
            fontSize: 'calc(var(--su) * 3.1)', color: 'rgba(253,252,251,0.92)',
            marginTop: 'calc(var(--su) * 4)', letterSpacing: '-0.02em', lineHeight: 1.2,
          }}
        >
          <Words t={t} at={11.9} stagger={0.12} text="Fra nå skjer alt av seg selv." />
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
  const styleP = easeInOutCubic(seg(t, 17.6, 19.1));
  const styleBadge = seg(t, 19.2, 19.8);
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
        <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08 }}>
          <Words t={t} at={14.7} text="Annonsen?" />
        </h2>
        <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
          <Words t={t} at={15.3} stagger={0.1} text="Stylet, skrevet og publisert — automatisk." />
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
            {/* f\u00f8r: ustylet (matt og flatt) */}
            <img
              src="/interior-living.webp"
              alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'saturate(0.25) brightness(0.68) contrast(0.88)',
                clipPath: `inset(0 ${((1 - photoP) * 100).toFixed(2)}% 0 0)`,
                transform: `scale(${(1.08 - photoP * 0.08).toFixed(3)})`,
              }}
            />
            {/* etter: stylet */}
            <img
              src="/interior-living.webp"
              alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%', objectFit: 'cover',
                filter: 'saturate(1.12) brightness(1.06) contrast(1.05)',
                clipPath: `inset(0 ${((1 - styleP) * 100).toFixed(2)}% 0 0)`,
                transform: `scale(${(1.08 - photoP * 0.08).toFixed(3)})`,
              }}
            />
            {/* styling-sveiplinje */}
            {styleP > 0.001 && styleP < 0.999 && (
              <div
                style={{
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${(styleP * 100).toFixed(2)}%`,
                  width: 'calc(var(--su) * 0.25)',
                  background: '#FDFCFB',
                  boxShadow: '0 0 calc(var(--su)*2.2) rgba(207,151,252,0.95), 0 0 calc(var(--su)*0.8) rgba(255,255,255,0.9)',
                }}
              />
            )}
            {/* stylet-badge */}
            <span
              className="font-body"
              style={{
                position: 'absolute', top: 'calc(var(--su) * 1.1)', right: 'calc(var(--su) * 1.1)',
                opacity: clamp01(styleBadge * 2),
                transform: `scale(${Math.max(0.5, easeOutBack(styleBadge)).toFixed(3)})`,
                fontSize: 'calc(var(--su) * 1.2)', fontWeight: 500, letterSpacing: '0.06em',
                color: '#0A0A0A', background: 'rgba(253,252,251,0.92)',
                backdropFilter: 'blur(4px)',
                borderRadius: 999, padding: 'calc(var(--su) * 0.45) calc(var(--su) * 1.2)',
                display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--su) * 0.5)',
              }}
            >
              <span style={{ color: '#9B5BD6' }}>{'\u2726'}</span> Stylet automatisk
            </span>
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
            <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08 }}>
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
            <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08 }}>
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
            <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 6.2)', color: '#FDFCFB', lineHeight: 1.08 }}>
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
          <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 5.4)', color: '#FDFCFB', lineHeight: 1.1 }}>
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
        </div>
      )}
    </Shell>
  );
}

/* =====================================================================
   AKT 6 — CHAT MED LEIETAKER (48.5–59.5s)
===================================================================== */
function Bubble({ t, at, side, children, time, k = 1 }) {
  const p = easeOutBack(seg(t, at, at + 0.6));
  const o = clamp01(seg(t, at, at + 0.35) * 2);
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
  const lp = seg(t, 48.5, 59.5);
  const cardIn = easeOutQuint(seg(t, 49.4, 50.4));
  const typingOn = t >= 51.4 && t < 52.5;
  const statusIn = seg(t, 56.2, 56.9);
  const capIn = easeOutCubic(seg(t, 56.6, 57.4));

  return (
    <Shell t={t} a={48.5} b={59.5}>
      <LeftCol lp={lp}>
        <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 5.6)', color: '#FDFCFB', lineHeight: 1.1 }}>
          <Words t={t} at={49.1} stagger={0.1} text="Leietaker lurer på noe?" />
        </h2>
        <p className="font-body" style={{ fontSize: 'calc(var(--su) * 2.3)', color: 'rgba(253,252,251,0.6)', marginTop: 'calc(var(--su) * 1.8)', lineHeight: 1.4 }}>
          <Words t={t} at={49.7} stagger={0.1} text="Besvart på sekunder. Døgnet rundt." />
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
          position: 'absolute', right: '11.5%', top: '50%', width: '22%',
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
            position: 'relative', aspectRatio: '9 / 19.6',
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
                  opacity: clamp01(seg(t, 50.15, 50.55) * 1.5),
                  textAlign: 'center',
                  fontSize: 'calc(var(--su) * 0.92)', letterSpacing: '0.04em',
                  color: 'rgba(253,252,251,0.38)',
                  marginBottom: 'calc(var(--su) * 1)',
                }}
              >
                I dag 21:47
              </div>
              <Bubble t={t} at={50.5} side="left" time="21:47" k={0.82}>Hei! Varmtvannet er plutselig borte 🥶</Bubble>
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
              <Bubble t={t} at={52.6} side="right" time="21:47" k={0.82}>Det fikser vi! Rørlegger kommer i morgen kl. 09:00.</Bubble>
              <Bubble t={t} at={54.6} side="left" time="21:48" k={0.82}>Wow, så raskt! Tusen takk 🙌</Bubble>
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
              const pp = Math.sin(clamp01(seg(t, 50.5, 51.05)) * Math.PI);
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
   AKT 7 — FINALE (59–72s)
===================================================================== */
const FINAL_CHIPS = [
  'Annonse publisert', 'Visninger booket', 'Leietaker screenet',
  'Kontrakt signert', 'Husleie utbetalt', 'Henvendelser besvart',
];
/* posisjoner (i su, relativt sentrum) for samle-animasjonen */
const CHIP_POS = [
  [-23, -5.6], [0, -5.6], [23, -5.6],
  [-22, 5.6], [0.8, 5.6], [22, 5.6],
];

export function SceneFinale({ t }) {
  const txt = Math.min(easeOutCubic(seg(t, 64.15, 64.95)), 1 - seg(t, 67.2, 67.9));
  const morph = easeInOutCubic(seg(t, 65.5, 66.1));
  const glow = Math.sin(clamp01(seg(t, 65.5, 67.0)) * Math.PI);
  const logoIn = easeOutQuint(seg(t, 68.0, 69.2));
  const urlIn = easeOutCubic(seg(t, 69.5, 70.3));

  const charRise = (i) => {
    const p = easeOutQuint(seg(t, 64.25 + i * 0.045, 65.15 + i * 0.045));
    return { display: 'inline-block', whiteSpace: 'pre', opacity: Math.min(1, p * 1.6), transform: `translateY(calc(var(--su) * ${((1 - p) * 3.5).toFixed(3)}))` };
  };
  const prefix = 'Trygt. Automa';
  const suffix = 'isk.';

  return (
    <Shell t={t} a={59} b={72} fOut={0} drift={0}>
      {t < 65.8 && (
        <div className="absolute inset-0">
          {/* chips som samles til ett punkt */}
          {FINAL_CHIPS.map((c, i) => {
            const p = seg(t, 59.6 + i * 0.45, 60.4 + i * 0.45);
            if (p <= 0) return null;
            const g = easeInOutCubic(seg(t, 63.35 + i * 0.06, 64.1 + i * 0.06));
            const [px, py] = CHIP_POS[i];
            const x = px * (1 - g);
            const y = py * (1 - g) + (1 - easeOutCubic(p)) * 2;
            const sc = Math.max(0.5, easeOutBack(p)) * (1 - 0.8 * g);
            const op = clamp01(p * 2) * (1 - seg(t, 63.95 + i * 0.06, 64.14 + i * 0.06));
            if (op <= 0.003) return null;
            return (
              <span
                key={c}
                className="font-body"
                style={{
                  position: 'absolute', left: '50%', top: '50%',
                  transform: `translate(-50%, -50%) translate(calc(var(--su) * ${x.toFixed(2)}), calc(var(--su) * ${y.toFixed(2)})) scale(${sc.toFixed(3)})`,
                  opacity: op.toFixed(3),
                  fontSize: 'calc(var(--su) * 2)', color: 'rgba(253,252,251,0.9)',
                  border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.05)',
                  borderRadius: 999, padding: 'calc(var(--su) * 1.1) calc(var(--su) * 2.2)',
                  display: 'inline-flex', alignItems: 'center', gap: 'calc(var(--su) * 0.9)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ color: '#CF97FC', fontWeight: 700 }}>✓</span> {c}
              </span>
            );
          })}
          {/* samlingskjerne — lysende punkt som vokser */}
          {(() => {
            const core = Math.min(easeOutCubic(seg(t, 63.5, 64.12)), 1 - seg(t, 64.18, 64.5));
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
            const ring = seg(t, 64.12, 65.15);
            const flash = Math.sin(clamp01(seg(t, 64.1, 64.7)) * Math.PI);
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
          <h2 className="font-heading font-bold" style={{ fontSize: 'calc(var(--su) * 8)', color: '#FDFCFB', letterSpacing: '-0.03em', lineHeight: 1.1, display: 'flex' }}>
            {prefix.split('').map((ch, i) => (
              <span key={`p${i}`} style={charRise(i)}>{ch}</span>
            ))}
            {/* morph-bokstaven: t -> g */}
            <span style={{ ...charRise(prefix.length), position: 'relative', perspective: 'calc(var(--su) * 30)' }}>
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
                const sp = seg(t, 65.55 + dl, 66.25 + dl);
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
              width: `calc(var(--su) * ${(26 * easeOutCubic(seg(t, 69.2, 70.4))).toFixed(2)})`,
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
              <Words t={t} at={68.9} stagger={0.14} text="Utleie på autopilot." />
            </div>
            <div className="font-body" style={{ ...rise(urlIn, 1.2), fontSize: 'calc(var(--su) * 1.25)', letterSpacing: '0.45em', textIndent: '0.45em', color: 'rgba(253,252,251,0.28)', marginTop: 'calc(var(--su) * 3.4)' }}>
              DIGIHOME.NO
            </div>
          </div>
          {/* fade til sort helt på slutten */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: '#000', opacity: seg(t, 71.0, 72) }} />
        </div>
      )}
    </Shell>
  );
}
