'use client';

/*
  HeroLoopLight — lys variant av «DigiHome OS»-loopen for forsiden /2.
  Samme koreografi/tidslinje som HeroLoop, men hele lys- og fargemodellen er
  re-autorert for varmt papir (#FEFBFA): grafitt-streker i stedet for hvite,
  myke ambient-skygger i stedet for additiv glød, lavendel som energi-aksent
  og grønn på «leie mottatt». Tenk premium arkitekttegning / lys Apple-keynote.
*/

import { useEffect, useRef, useState } from 'react';
import { Megaphone, TrendingUp, FileCheck, UserCheck, MapPin } from 'lucide-react';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack,
} from '@/components/video/filmUtils';

const LOOP = 20.4;
const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;

/* ---------- lys palett ---------- */
const INK = (a) => `rgba(26,23,38,${a})`;    // varm grafitt — streker
const INKD = (a) => `rgba(12,10,20,${a})`;   // dyp blekk — skarpe kjerner/tekst
const LAV = (a) => `rgba(155,91,214,${a})`;  // lavendel — energi/signal
const LAVS = (a) => `rgba(207,151,252,${a})`;// myk lavendel
const EMER = (a) => `rgba(16,185,129,${a})`; // emerald-telemetri
const EMERD = (a) => `rgba(24,121,78,${a})`; // dyp suksess-grønn
const AMBER = (a) => `rgba(244,168,76,${a})`;// tent vindu (varmt)

const CX = 50;          // husets senter-x
const GY = 50.5;        // gulvplanets senterlinje
const ANCHOR = { x: 50, y: 45 };

const RINGS = [
  { r: 13, at: 3.4, op: 0.12, },
  { r: 19, at: 3.65, op: 0.09 },
  { r: 25, at: 3.9, op: 0.10, dashed: true },
];
const NODES = [
  { at: 5.6, x: 18, y: 24, depth: 0.94, icon: Megaphone, label: 'Annonse', sub: 'Finn · Airbnb' },
  { at: 7.3, x: 82, y: 24, depth: 0.94, icon: TrendingUp, label: 'Pris', sub: '25 500 kr/mnd' },
  { at: 9.0, x: 14, y: 60, depth: 1.05, icon: UserCheck, label: 'Leietaker', sub: 'Verifisert' },
  { at: 10.7, x: 86, y: 60, depth: 1.05, icon: FileCheck, label: 'Kontrakt', sub: 'BankID · 12 mnd' },
];
const RETURNS = [
  { n: 0, at: 12.5 }, { n: 1, at: 12.7 }, { n: 2, at: 12.9 }, { n: 3, at: 13.1 },
  { n: 1, at: 16.9 }, { n: 2, at: 17.7 },
];

/* huset — strektegnes segment for segment (lengder forhåndsberegnet) */
const HOUSE = [
  { d: 'M42 50 L42 42.6', len: 7.4 },
  { d: 'M58 50 L58 42.6', len: 7.4 },
  { d: 'M42 50 L58 50', len: 16 },
  { d: 'M41 43 L50 36.4', len: 11.2 },
  { d: 'M50 36.4 L59 43', len: 11.2 },
  { d: 'M47.7 50 L47.7 45.9 L52.3 45.9 L52.3 50', len: 12.9 },
];
const HOUSE_AT = 3.05;

const lineFor = (n) => {
  const dx = n.x - ANCHOR.x, dy = n.y - ANCHOR.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  return {
    x1: ANCHOR.x + ux * 10.5, y1: ANCHOR.y + uy * 10.5,
    x2: n.x - ux * 5.6, y2: n.y - uy * 5.6,
  };
};
const LINES = NODES.map(lineFor);

const activeCount = (t) => NODES.filter((n) => t > n.at + 1.05).length;

function useLoopTime(playing) {
  const [t, setT] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (reduce) {
      setT(15.6); // statisk: hele systemet + utbetaling
      return;
    }
    if (!playing) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      setT(((now - t0) / 1000) % LOOP);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduce]);
  return t;
}

/* ---------- kinematisk kamera ---------- */
function cam(t) {
  const e = easeInOutCubic;
  let s = 1.07, y = 0;
  if (t < 3) {
    s = 1.07;
  } else if (t < 5) {
    const p = e(seg(t, 3, 5));
    s = 1.07 - 0.07 * p;
  } else if (t < 13.3) {
    s = 1.0 + 0.02 * seg(t, 5, 13.3);
  } else if (t < 14.3) {
    const p = e(seg(t, 13.3, 14.3));
    s = 1.02 + 0.03 * p;
    y = -1.8 * p;
  } else if (t < 16.8) {
    s = 1.05;
    y = -1.8;
  } else {
    const p = e(seg(t, 16.8, 18.2));
    s = 1.05 - 0.05 * p;
    y = -1.8 * (1 - p);
  }
  return { s, y };
}

/* ---------- bakteppe: lavendel-ambient + myk gulvskygge ---------- */
function Backdrop({ t, ex }) {
  const breathe = 0.8 + 0.2 * Math.sin(t * 0.35);
  const lit = (0.4 + 0.6 * easeOutCubic(seg(t, 1.4, 2.6))) * (1 - 0.7 * ex);
  return (
    <>
      <div
        className="absolute"
        style={{
          left: '4%', top: '2%', width: '92%', height: '68%',
          background: 'radial-gradient(ellipse 58% 52% at 50% 30%, rgba(155,91,214,0.05), transparent 70%)',
          opacity: (breathe * lit).toFixed(2),
        }}
      />
      <div
        className="absolute"
        style={{
          left: '18%', right: '18%', bottom: '1%', height: u(9),
          background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(26,23,38,0.10), transparent 72%)',
          filter: `blur(${u(2.6)})`,
          opacity: lit.toFixed(2),
        }}
      />
    </>
  );
}

/* ---------- delte byggesteiner ---------- */
function ChipCheck({ size = 3 }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: u(size), height: u(size), borderRadius: '50%',
        background: '#E8F4EE', border: '1px solid rgba(24,121,78,0.45)',
        boxShadow: `0 0 ${u(1.0)} rgba(24,121,78,0.18)`,
      }}
    >
      <span style={{ color: '#18794E', fontWeight: 700, fontSize: u(size * 0.56), lineHeight: 1 }}>✓</span>
    </span>
  );
}

function NodeStatus({ t, done, size = 2.7 }) {
  const dP = easeOutBack(seg(t, done, done + 0.4));
  const spin = ((t * 320) % 360).toFixed(0);
  return (
    <span className="absolute inline-flex items-center justify-center" style={{ top: u(-0.9), right: u(-0.9), width: u(size), height: u(size) }}>
      {dP <= 0.001 ? (
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: '#FFFFFF',
            border: '1.2px solid rgba(26,23,38,0.14)', borderTopColor: 'rgba(155,91,214,0.85)',
            transform: `rotate(${spin}deg)`,
            boxShadow: '0 1px 3px rgba(26,23,38,0.12)',
          }}
        />
      ) : (
        <span style={{ transform: `scale(${Math.max(0.3, Math.min(dP, 1.15)).toFixed(2)})`, display: 'inline-flex' }}>
          <ChipCheck size={size} />
        </span>
      )}
    </span>
  );
}

/* ---------- SVG: hus, gulvplan, linjer, pulser, energi ---------- */
function SystemSVG({ t }) {
  const active = activeCount(t);
  const flash = Math.sin(clamp01(seg(t, 13.0, 13.9)) * Math.PI);
  const houseInk = 0.06 + active * 0.018 + flash * 0.16;
  const windowOn = easeOutCubic(seg(t, 6.6, 7.4));
  const windowPulse = windowOn * (0.65 + 0.35 * Math.sin(t * 1.7));

  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 94" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="dhReflFadeL" gradientUnits="userSpaceOnUse" x1="0" y1="50.8" x2="0" y2="61.5">
          <stop offset="0" stopColor="#fff" stopOpacity="0.5" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="dhHorizonL" gradientUnits="userSpaceOnUse" x1="2" y1="0" x2="98" y2="0">
          <stop offset="0" stopColor="#1A1726" stopOpacity="0" />
          <stop offset="0.5" stopColor="#1A1726" stopOpacity="0.15" />
          <stop offset="1" stopColor="#1A1726" stopOpacity="0" />
        </linearGradient>
        <mask id="dhReflMaskL" maskUnits="userSpaceOnUse" x="0" y="50" width="100" height="16">
          <rect x="20" y="50.5" width="60" height="15.5" fill="url(#dhReflFadeL)" />
        </mask>
      </defs>
      {/* horisontlinje — forankrer scenen i gulvplanet */}
      {(() => {
        const p = easeInOutCubic(seg(t, 3.15, 4.25));
        if (p <= 0.004) return null;
        return (
          <line
            x1={(50 - 47 * p).toFixed(2)} y1={GY} x2={(50 + 47 * p).toFixed(2)} y2={GY}
            stroke="url(#dhHorizonL)" strokeWidth="0.16"
          />
        );
      })()}
      {/* elliptiske instrumentringer på gulvplanet */}
      {RINGS.map((ring, i) => {
        const p = easeOutCubic(seg(t, ring.at, ring.at + 0.7));
        if (p <= 0.004) return null;
        return (
          <ellipse
            key={i}
            cx={CX} cy={GY} rx={(ring.r * p).toFixed(2)} ry={(ring.r * 0.32 * p).toFixed(2)}
            stroke={INK((ring.op * p).toFixed(3))}
            strokeWidth="0.22"
            strokeDasharray={ring.dashed ? '1.1 2.3' : 'none'}
            strokeDashoffset={ring.dashed ? (t * 1.4).toFixed(2) : 0}
          />
        );
      })}

      {/* sonar-puls som ruller over planet */}
      {t > 6.2 && (() => {
        const rp = ((t - 6.2) % 3.2) / 3.2;
        const rr = 9 + rp * 17;
        return (
          <ellipse
            cx={CX} cy={GY} rx={rr.toFixed(2)} ry={(rr * 0.32).toFixed(2)}
            stroke={INK(((1 - rp) * 0.085).toFixed(3))}
            strokeWidth="0.25"
          />
        );
      })()}

      {/* huset — grafitt-glødeunderlag + skarp strektegning (+ lavendel ved høsting) */}
      {HOUSE.map((segm, i) => {
        const p = easeInOutCubic(seg(t, HOUSE_AT + i * 0.11, HOUSE_AT + i * 0.11 + 0.55));
        if (p <= 0.004) return null;
        return (
          <g key={i}>
            <path
              d={segm.d}
              stroke={INK(houseInk.toFixed(3))}
              strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={segm.len} strokeDashoffset={(segm.len * (1 - p)).toFixed(2)}
            />
            <path
              d={segm.d}
              stroke={INKD((0.82 + flash * 0.14).toFixed(2))}
              strokeWidth="0.3" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={segm.len} strokeDashoffset={(segm.len * (1 - p)).toFixed(2)}
            />
            {flash > 0.03 && (
              <path
                d={segm.d}
                stroke={LAV((flash * 0.45).toFixed(3))}
                strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={segm.len} strokeDashoffset={(segm.len * (1 - p)).toFixed(2)}
              />
            )}
          </g>
        );
      })}
      {/* speilrefleksjon i gulvplanet — polert lyst gulv */}
      <g mask="url(#dhReflMaskL)" transform="translate(0,101) scale(1,-1)">
        {HOUSE.map((segm, i) => {
          const p = easeInOutCubic(seg(t, HOUSE_AT + i * 0.11, HOUSE_AT + i * 0.11 + 0.55));
          if (p <= 0.004) return null;
          return (
            <path
              key={`refl-${i}`}
              d={segm.d}
              stroke={INK((0.16 + flash * 0.10).toFixed(3))}
              strokeWidth="0.32" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={segm.len} strokeDashoffset={(segm.len * (1 - p)).toFixed(2)}
            />
          );
        })}
        {windowOn > 0.01 && (
          <circle cx={CX} cy={40.6} r="1.1" fill={AMBER((0.18 * windowPulse).toFixed(3))} />
        )}
      </g>

      {/* gavlvindu — tennes når systemet jobber */}
      {(() => {
        const p = seg(t, HOUSE_AT + 0.7, HOUSE_AT + 1.15);
        if (p <= 0.004) return null;
        const circ = 8.5;
        return (
          <>
            <circle
              cx={CX} cy={40.6} r="1.35"
              stroke={INKD(0.82)} strokeWidth="0.28"
              strokeDasharray={circ} strokeDashoffset={(circ * (1 - easeInOutCubic(p))).toFixed(2)}
              transform={`rotate(-90 ${CX} 40.6)`}
            />
            {windowOn > 0.01 && (
              <>
                <circle cx={CX} cy={40.6} r="1.9" fill={AMBER((0.18 * windowPulse).toFixed(3))} />
                <circle cx={CX} cy={40.6} r="1.05" fill={AMBER((0.6 * windowPulse).toFixed(3))} />
              </>
            )}
          </>
        );
      })()}

      {/* forbindelseslinjer */}
      {NODES.map((n, i) => {
        const p = easeInOutCubic(seg(t, n.at, n.at + 0.5));
        if (p <= 0.004) return null;
        const L = LINES[i];
        const len = Math.hypot(L.x2 - L.x1, L.y2 - L.y1);
        const isActive = t > n.at + 1.05;
        return (
          <line
            key={n.label}
            x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2}
            stroke={INK(isActive ? 0.17 : 0.32)}
            strokeWidth="0.22"
            strokeDasharray={len.toFixed(2)}
            strokeDashoffset={(len * (1 - p)).toFixed(2)}
          />
        );
      })}

      {/* konstant energistrøm langs aktive linjer */}
      {NODES.map((n, i) => {
        if (t < n.at + 1.3) return null;
        const L = LINES[i];
        return (
          <line
            key={`flow-${n.label}`}
            x1={L.x2} y1={L.y2} x2={L.x1} y2={L.y1}
            stroke={EMER(0.32)}
            strokeWidth="0.3"
            strokeDasharray="0.7 2.7"
            strokeDashoffset={(-(t * 4.6) % 3.4).toFixed(2)}
          />
        );
      })}

      {/* ankomst-rippel ved noden */}
      {NODES.map((n) => {
        const ar = seg(t, n.at + 0.5, n.at + 1.05);
        if (ar <= 0.01 || ar >= 0.99) return null;
        return (
          <circle
            key={`rip-${n.label}`}
            cx={n.x} cy={n.y} r={(3.4 + easeOutCubic(ar) * 4).toFixed(2)}
            stroke={LAV((Math.sin(ar * Math.PI) * 0.28).toFixed(3))}
            strokeWidth="0.22"
          />
        );
      })}

      {/* pulser ut (lavendel signal) */}
      {NODES.map((n, i) => {
        const p = easeInOutCubic(seg(t, n.at + 0.12, n.at + 0.58));
        if (p <= 0.01 || p >= 0.99) return null;
        const L = LINES[i];
        const x = L.x1 + (L.x2 - L.x1) * p;
        const y = L.y1 + (L.y2 - L.y1) * p;
        const op = Math.sin(p * Math.PI);
        return (
          <g key={`out-${n.label}`}>
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.4" fill={LAV((op * 0.20).toFixed(2))} />
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="0.6" fill={LAV((op * 0.95).toFixed(2))} />
          </g>
        );
      })}

      {/* returpulser (grønn telemetri) */}
      {RETURNS.map((r, i) => {
        const p = easeInOutCubic(seg(t, r.at, r.at + 0.55));
        if (p <= 0.01 || p >= 0.99) return null;
        const L = LINES[r.n];
        const x = L.x2 + (L.x1 - L.x2) * p;
        const y = L.y2 + (L.y1 - L.y2) * p;
        const op = Math.sin(p * Math.PI);
        return (
          <g key={`ret-${i}`}>
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.4" fill={EMER((op * 0.22).toFixed(2))} />
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="0.6" fill={EMERD((op * 0.95).toFixed(2))} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- skygge i gulvet under huset (ambient occlusion) ---------- */
function GroundGlow({ t }) {
  const p = easeOutCubic(seg(t, HOUSE_AT + 0.4, HOUSE_AT + 1.2));
  if (p <= 0.01) return null;
  const flash = Math.sin(clamp01(seg(t, 13.0, 13.9)) * Math.PI);
  const o = (0.10 + activeCount(t) * 0.02 + flash * 0.14) * p;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: '50%', top: `${(52.2 / 94) * 100}%`,
        width: u(26), height: u(6.5),
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(26,23,38,${o.toFixed(3)}), transparent 70%)`,
        filter: `blur(${u(1.2)})`,
      }}
    />
  );
}

/* ---------- elliptisk radarsveip ---------- */
function Sweep({ t }) {
  const o = easeOutCubic(seg(t, 3.6, 4.4));
  if (o <= 0.01) return null;
  const rot = (t * 42) % 360;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${CX}%`, top: `${(GY / 94) * 100}%`,
        width: u(52), height: u(52),
        transform: 'translate(-50%, -50%) scaleY(0.34)',
        borderRadius: '50%',
        background: `conic-gradient(from ${rot.toFixed(1)}deg, rgba(26,23,38,${(0.05 * o).toFixed(3)}), transparent 50deg)`,
        maskImage: 'radial-gradient(circle, transparent 22%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.9) 62%, transparent 74%)',
        WebkitMaskImage: 'radial-gradient(circle, transparent 22%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.9) 62%, transparent 74%)',
      }}
    />
  );
}

/* ---------- mykt lavendel-sveip over scenen (multiply, sf\u00e6re-feather) ---------- */
function LightSweep({ t, from, dur, strength = 0.06 }) {
  const p = seg(t, from, from + dur);
  if (p <= 0.001 || p >= 0.999) return null;
  const x = -45 + 130 * easeInOutCubic(p);
  const o = Math.sin(p * Math.PI) * strength;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute"
        style={{
          top: '-12%', bottom: '-12%', left: `${x.toFixed(1)}%`, width: '46%',
          background: `linear-gradient(100deg, transparent, rgba(155,91,214,${(o * 0.5).toFixed(3)}) 46%, rgba(207,151,252,${o.toFixed(3)}) 50%, rgba(155,91,214,${(o * 0.5).toFixed(3)}) 54%, transparent)`,
          transform: 'rotate(8deg)',
          mixBlendMode: 'multiply',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, #000 20%, #000 80%, transparent)',
        }}
      />
    </div>
  );
}

/* ---------- bryteren som booter systemet ---------- */
function BootToggle({ t }) {
  const inRaw = easeOutBack(seg(t, 0.35, 1.0));
  const out = easeInOutCubic(seg(t, 2.7, 3.3));
  const o = Math.min(inRaw * 1.4, 1) * (1 - out);
  if (o <= 0.004) return null;
  const labelIn = easeOutCubic(seg(t, 0.55, 1.1));
  const pre = Math.sin(seg(t, 1.18, 1.32) * Math.PI);
  const knobRaw = easeOutBack(seg(t, 1.32, 1.8));
  const on = seg(t, 1.32, 1.8) > 0.35;
  const statusIn = easeOutCubic(seg(t, 1.9, 2.4));

  const KW = 9, TW = 24, TH = 11.4, PAD = 1.2;
  const travel = TW - KW - PAD * 2;
  const kx = -pre * 0.7 + travel * (knobRaw > 1 ? 1 + (knobRaw - 1) * 0.35 : Math.max(0, knobRaw));

  return (
    <div
      className="absolute"
      style={{
        left: '50%', top: `${(45 / 94) * 100}%`,
        width: u(TW), height: u(TH),
        transform: `translate(-50%, -50%) translateY(${u((1 - Math.min(inRaw, 1.03)) * 4)}) scale(${((0.92 + 0.08 * Math.min(inRaw, 1.03)) * (1 - out * 0.25)).toFixed(3)})`,
        opacity: o.toFixed(2),
        filter: out > 0.02 ? `blur(${(out * 6).toFixed(1)}px)` : 'none',
      }}
    >
      <p
        className="font-body uppercase absolute left-1/2 text-center"
        style={{
          bottom: `calc(100% + ${u(3.2)})`,
          fontSize: u(2.1), letterSpacing: '0.42em',
          color: 'rgba(124,116,102,0.9)',
          whiteSpace: 'nowrap',
          opacity: (labelIn * (1 - out)).toFixed(2),
          transform: `translateX(-50%) translateY(${u((1 - labelIn) * 1.6 - out * 6)})`,
        }}
      >
        Autopilot
      </p>
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: on
            ? 'linear-gradient(135deg, rgba(155,91,214,0.92), rgba(207,151,252,0.85) 48%, rgba(155,91,214,0.96))'
            : '#F0EAE2',
          border: `1px solid ${on ? 'rgba(155,91,214,0.5)' : 'rgba(26,23,38,0.12)'}`,
          boxShadow: on
            ? `0 0 ${u(5)} rgba(155,91,214,0.30), inset 0 ${u(0.4)} ${u(0.8)} rgba(255,255,255,0.35), inset 0 ${u(-0.8)} ${u(1.6)} rgba(96,40,150,0.28)`
            : `inset 0 ${u(0.5)} ${u(1.0)} rgba(26,23,38,0.10), inset 0 ${u(-0.5)} ${u(0.9)} rgba(255,255,255,0.6)`,
          transition: 'background 0.4s, border 0.4s, box-shadow 0.4s',
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          top: '50%', left: u(PAD), width: u(KW), height: u(KW),
          transform: `translateY(-50%) translateX(${u(kx)})`,
          background: 'linear-gradient(150deg, #FFFFFF 12%, #F6F3FA 55%, #E8E2F0)',
          boxShadow: `0 ${u(0.8)} ${u(2.4)} rgba(26,23,38,0.28), inset 0 ${u(0.4)} ${u(0.7)} rgba(255,255,255,0.95), 0 0 0 1px rgba(26,23,38,0.05)${on ? `, 0 0 ${u(2.6)} rgba(155,91,214,0.35)` : ''}`,
        }}
      />
      <div
        className="absolute left-1/2 flex items-center"
        style={{
          top: `calc(100% + ${u(3)})`,
          gap: u(1.2),
          whiteSpace: 'nowrap',
          opacity: (labelIn * (1 - out)).toFixed(2),
          transform: `translateX(-50%) translateY(${u(out * 3)})`,
        }}
      >
        {statusIn > 0.01 ? (
          <>
            <span
              className="inline-flex rounded-full"
              style={{ width: u(1.4), height: u(1.4), background: '#10b981', boxShadow: `0 0 ${u(1.6)} rgba(16,185,129,0.7)`, opacity: statusIn.toFixed(2) }}
            />
            <span className="font-body" style={{ fontSize: u(2.3), color: 'rgba(24,121,78,0.95)', opacity: statusIn.toFixed(2) }}>
              Autopilot aktivert
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ---------- systemlinje øverst ---------- */
function SystemLabel({ t, dof = 0 }) {
  const p = easeOutCubic(seg(t, 3.3, 3.9));
  if (p <= 0.004) return null;
  const aktiv = easeOutCubic(seg(t, 3.7, 4.2));
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: 0, right: 0, top: u(4.5), gap: u(1.6),
        opacity: (p * (1 - dof * 0.38)).toFixed(2),
        transform: `translateY(${u((1 - p) * 1.5)})`,
        filter: dof > 0.02 ? `blur(${(dof * 1.3).toFixed(2)}px)` : 'none',
      }}
    >
      <span className="font-body uppercase" style={{ fontSize: u(1.75), letterSpacing: '0.42em', color: 'rgba(10,10,10,0.42)' }}>
        DigiHome Autopilot
      </span>
      {aktiv > 0.01 && (
        <span className="flex items-center" style={{ gap: u(1), opacity: aktiv.toFixed(2) }}>
          <span className="inline-flex rounded-full" style={{ width: u(1.2), height: u(1.2), background: '#10b981', boxShadow: `0 0 ${u(1.4)} rgba(16,185,129,0.7)` }} />
          <span className="font-body uppercase" style={{ fontSize: u(1.75), letterSpacing: '0.3em', color: 'rgba(24,121,78,0.9)' }}>Aktiv</span>
        </span>
      )}
    </div>
  );
}

/* ---------- adresse-lock med sikte-braketter ---------- */
function AddressLock({ t, dof = 0 }) {
  const p = easeOutCubic(seg(t, 4.1, 4.8));
  if (p <= 0.004) return null;
  const lockP = easeInOutCubic(seg(t, 4.2, 4.95));
  const tick = easeOutBack(seg(t, 5.05, 5.45));
  const settled = t > 5.8;
  const br = (1.9 - 0.9 * lockP);
  const brO = Math.min(p, settled ? 0.3 : 0.85);
  const corner = (pos) => ({
    position: 'absolute',
    width: u(2), height: u(2),
    ...(pos.includes('t') ? { top: 0 } : { bottom: 0 }),
    ...(pos.includes('l') ? { left: 0 } : { right: 0 }),
    borderTop: pos.includes('t') ? '1.5px solid rgba(26,23,38,0.55)' : 'none',
    borderBottom: pos.includes('b') ? '1.5px solid rgba(26,23,38,0.55)' : 'none',
    borderLeft: pos.includes('l') ? '1.5px solid rgba(26,23,38,0.55)' : 'none',
    borderRight: pos.includes('r') ? '1.5px solid rgba(26,23,38,0.55)' : 'none',
  });
  return (
    <div
      className="absolute flex justify-center"
      style={{
        left: 0, right: 0, top: u(10.5),
        filter: dof > 0.02 ? `blur(${(dof * 1.5).toFixed(2)}px)` : 'none',
        opacity: (1 - dof * 0.42).toFixed(2),
      }}
    >
      <div
        className="relative flex items-center"
        style={{
          gap: u(1.3),
          padding: `${u(1.4)} ${u(2.6)}`,
          opacity: p.toFixed(2),
          transform: `scale(${(0.96 + 0.04 * p).toFixed(3)})`,
        }}
      >
        <span className="absolute inset-0 pointer-events-none" style={{ opacity: brO.toFixed(2), transform: `scale(${br.toFixed(3)})`, transition: 'opacity 0.4s' }}>
          <span style={corner('tl')} />
          <span style={corner('tr')} />
          <span style={corner('bl')} />
          <span style={corner('br')} />
        </span>
        <MapPin style={{ width: u(2.3), height: u(2.3), color: 'rgba(155,91,214,0.8)', flexShrink: 0 }} />
        <span className="font-body" style={{ fontSize: u(2.35), color: `rgba(10,10,10,${settled ? 0.55 : 0.92})`, whiteSpace: 'nowrap', transition: 'color 0.5s' }}>
          Møhlenprisbakken 14, Bergen
        </span>
        {tick > 0.01 && (
          <span style={{ transform: `scale(${Math.max(0.4, Math.min(tick, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
            <ChipCheck size={2.6} />
          </span>
        )}
      </div>
    </div>
  );
}

/* ---------- node: subsystem som kobles på ---------- */
function Node({ t, node, dof = 0 }) {
  const inRaw = easeOutBack(seg(t, node.at + 0.4, node.at + 0.95));
  if (inRaw <= 0.004) return null;
  const inP = Math.min(inRaw, 1.05);
  const isActive = t > node.at + 1.05;
  const Icon = node.icon;
  const typed = node.sub.slice(0, Math.ceil(seg(t, node.at + 0.95, node.at + 1.6) * node.sub.length));
  const shine = seg(t, node.at + 1.05, node.at + 1.55);
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${node.x}%`, top: `${(node.y / 94) * 100}%`,
        transform: `translate(-50%, -50%) scale(${((0.8 + 0.2 * inP) * node.depth).toFixed(3)})`,
        opacity: (Math.min(inRaw * 1.4, 1) * (isActive ? 0.96 : 1) * (1 - dof * 0.5)).toFixed(2),
        filter: dof > 0.02 ? `blur(${(dof * 1.8).toFixed(2)}px)` : 'none',
      }}
    >
      <span
        className="relative inline-flex items-center justify-center"
        style={{
          width: u(7.8), height: u(7.8), borderRadius: u(2.3),
          background: '#FFFFFF',
          border: `1px solid ${isActive ? 'rgba(155,91,214,0.34)' : 'rgba(26,23,38,0.10)'}`,
          boxShadow: `0 ${u(1.7)} ${u(4.8)} rgba(26,23,38,0.13), inset 0 1px 0 rgba(255,255,255,0.9)${isActive ? `, 0 0 ${u(3.2)} rgba(155,91,214,0.18)` : ''}`,
          transition: 'border 0.4s, box-shadow 0.4s',
        }}
      >
        <Icon style={{ width: u(3.7), height: u(3.7), color: isActive ? 'rgba(155,91,214,0.98)' : 'rgba(26,23,38,0.85)' }} strokeWidth={1.8} />
        {shine > 0.001 && shine < 0.999 && (
          <span className="absolute inset-0 overflow-hidden pointer-events-none" style={{ borderRadius: u(2.3) }}>
            <span
              className="absolute"
              style={{
                top: '-45%', bottom: '-45%', width: '46%',
                left: `${(-55 + 170 * easeInOutCubic(shine)).toFixed(1)}%`,
                transform: 'rotate(18deg)',
                background: 'linear-gradient(100deg, transparent, rgba(155,91,214,0.16), transparent)',
                opacity: Math.sin(shine * Math.PI).toFixed(2),
              }}
            />
          </span>
        )}
        <NodeStatus t={t} done={node.at + 1.05} size={2.9} />
      </span>
      <p className="font-body font-medium" style={{ fontSize: u(2.25), color: 'rgba(26,23,38,0.9)', marginTop: u(1.55), whiteSpace: 'nowrap' }}>{node.label}</p>
      <p className="font-body" style={{ fontSize: u(1.85), color: 'rgba(124,116,102,0.85)', marginTop: u(0.3), whiteSpace: 'nowrap', minHeight: '1.2em' }}>{typed || '\u00A0'}</p>
    </div>
  );
}

/* ---------- ekte odometer ---------- */
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
const PAYOUT_AT = 14.0;
const ODO_COLS = [
  { d: 2, spins: 1, st: 0.0,  dur: 1.05 },
  { d: 5, spins: 2, st: 0.07, dur: 1.15 },
  { d: 0, spins: 3, st: 0.14, dur: 1.25 },
  { d: 0, spins: 4, st: 0.21, dur: 1.32 },
  { d: 0, spins: 5, st: 0.28, dur: 1.38 },
];
const ODO_DONE = PAYOUT_AT + 0.28 + 1.38; // 15.66

function Odometer({ t }) {
  return (
    <span className="inline-flex items-baseline" style={{ lineHeight: 1 }}>
      {ODO_COLS.map((c, i) => {
        const p = easeInOutCubic(seg(t, PAYOUT_AT + c.st, PAYOUT_AT + c.st + c.dur));
        const pos = ((c.spins * 10 + c.d) * p) % 10;
        return (
          <span
            key={i}
            className="relative inline-block overflow-hidden text-center"
            style={{
              height: '1em', width: '0.62em', marginLeft: i === 2 ? '0.16em' : 0,
              maskImage: 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 14%, #000 86%, transparent 100%)',
            }}
          >
            <span
              className="absolute left-0 right-0 top-0"
              style={{ transform: `translateY(${(-pos).toFixed(3)}em)` }}
            >
              {DIGITS.map((d, j) => (
                <span key={j} className="block" style={{ height: '1em', lineHeight: 1 }}>
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

/* ---------- utbetalings-telemetri nederst ---------- */
function PayoutReadout({ t }) {
  const lineP = easeInOutCubic(seg(t, 13.5, 14.0));
  if (lineP <= 0.004) return null;
  const labelP = easeOutCubic(seg(t, 13.7, 14.3));
  const check = easeOutBack(seg(t, ODO_DONE + 0.1, ODO_DONE + 0.5));
  const subP = easeOutCubic(seg(t, ODO_DONE + 0.6, ODO_DONE + 1.1));
  const bloom = Math.sin(clamp01(seg(t, ODO_DONE - 0.1, ODO_DONE + 0.9)) * Math.PI);
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(73.5) }}>
      <span
        style={{
          width: u(30 * lineP), height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(26,23,38,0.22), transparent)',
        }}
      />
      {labelP > 0.01 && (
        <p
          className="font-body uppercase"
          style={{
            fontSize: u(1.75),
            letterSpacing: `${(0.62 - 0.22 * labelP).toFixed(3)}em`,
            color: 'rgba(124,116,102,0.9)',
            marginTop: u(2.2), opacity: labelP.toFixed(2), transform: `translateY(${u((1 - labelP) * 1.5)})`,
          }}
        >
          Leie mottatt
        </p>
      )}
      {t > PAYOUT_AT && (
        <div className="relative flex items-center" style={{ gap: u(2), marginTop: u(1.2) }}>
          <span
            className="absolute pointer-events-none"
            style={{
              inset: u(-7),
              background: 'radial-gradient(ellipse 62% 62% at 50% 50%, rgba(16,185,129,0.10), rgba(155,91,214,0.06) 48%, transparent 72%)',
              opacity: bloom.toFixed(2),
            }}
          />
          <span className="relative font-heading font-bold inline-flex items-baseline" style={{ fontSize: u(6.6), color: '#0A0A0A', letterSpacing: '0.01em' }}>
            <Odometer t={t} />
            <span style={{ fontSize: u(4.4), marginLeft: '0.18em', color: 'rgba(10,10,10,0.82)' }}>kr</span>
          </span>
          {check > 0.01 && (
            <span className="relative" style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
              <ChipCheck size={4} />
            </span>
          )}
        </div>
      )}
      {subP > 0.01 && (
        <p className="font-body" style={{ fontSize: u(2.1), color: 'rgba(124,116,102,0.92)', marginTop: u(1.6), opacity: subP.toFixed(2) }}>
          Hver måned · helt automatisk
        </p>
      )}
    </div>
  );
}

/* ===================== HOVEDKOMPONENT ===================== */
export function HeroLoopLight({ playing = true }) {
  const wrapRef = useRef(null);
  const tiltRef = useRef(null);
  const [un, setUn] = useState(5.2);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setUn(el.clientWidth / 100));
    ro.observe(el);
    setUn(el.clientWidth / 100);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  /* interaktiv 3D-tilt — scenen lener seg umerkelig mot pekeren */
  useEffect(() => {
    const el = wrapRef.current;
    const inner = tiltRef.current;
    if (!el || !inner) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const zone = el.closest('section') || el;
    const st = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, hover: false };
    const step = () => {
      st.cx += (st.tx - st.cx) * 0.055;
      st.cy += (st.ty - st.cy) * 0.055;
      inner.style.transform = `rotateX(${(-st.cy * 3.4).toFixed(3)}deg) rotateY(${(st.cx * 4.6).toFixed(3)}deg)`;
      if (st.hover || Math.abs(st.tx - st.cx) + Math.abs(st.ty - st.cy) > 0.001) {
        st.raf = requestAnimationFrame(step);
      } else {
        st.raf = 0;
      }
    };
    const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const r = zone.getBoundingClientRect();
      st.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      st.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      st.hover = true;
      kick();
    };
    const onLeave = () => { st.tx = 0; st.ty = 0; st.hover = false; kick(); };
    zone.addEventListener('pointermove', onMove, { passive: true });
    zone.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      zone.removeEventListener('pointermove', onMove);
      zone.removeEventListener('pointerleave', onLeave);
      if (st.raf) cancelAnimationFrame(st.raf);
    };
  }, []);

  const t = useLoopTime(playing && inView);
  const fy = Math.sin(t * 0.5) * 0.4;
  const ex = easeInOutCubic(seg(t, 18.9, 20.0));
  const { s, y } = cam(t);
  const dof = easeInOutCubic(seg(t, 13.5, 14.5)) * (1 - easeInOutCubic(seg(t, 16.8, 17.9)));

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ '--u': `${un}px`, aspectRatio: '100 / 94', perspective: '1100px' }}
      aria-hidden="true"
    >
      <Backdrop t={t} ex={ex} />
      <div ref={tiltRef} className="absolute inset-0" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
        <div
          className="absolute inset-0"
          style={{
            transform: `translateY(${u(fy + y - ex * 2.5)}) scale(${s.toFixed(4)})`,
            transformOrigin: '50% 45%',
            opacity: (1 - ex).toFixed(2),
            filter: ex > 0.02 ? `blur(${(ex * 6).toFixed(1)}px)` : 'none',
          }}
        >
          <Sweep t={t} />
          <GroundGlow t={t} />
          <SystemSVG t={t} />
          <SystemLabel t={t} dof={dof} />
          <AddressLock t={t} dof={dof} />
          <BootToggle t={t} />
          {NODES.map((n) => (
            <Node key={n.label} t={t} node={n} dof={dof} />
          ))}
          <PayoutReadout t={t} />
          <LightSweep t={t} from={4.55} dur={1.2} strength={0.04} />
          <LightSweep t={t} from={15.25} dur={1.25} strength={0.07} />
        </div>
      </div>
    </div>
  );
}
