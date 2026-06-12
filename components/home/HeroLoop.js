'use client';

/*
  HeroLoop — «DigiHome OS»: hele systemet som ett levende kontrollsenter
  (20s loop), à la Teslas autopilot-visualisering.

    1. BOOT       bryteren flippes — systemet våkner, hub + ringer kalibreres,
                  radarsveipet begynner å gå
    2. LOCK       adressen låses på med konvergerende sikte-braketter
    3. ORKESTRER  fire noder kobles på én etter én: linje tegnes fra huben,
                  en lyspuls reiser ut, noden kvitterer med hake
                  (Annonse · Pris · Leietaker · Kontrakt)
    4. RETUR      grønne pulser strømmer tilbake til huben — energien høstes —
                  og utbetalingen telles opp som telemetri nederst
    5. IDLE       systemet går og puster, før en rolig reboot

  Monokrom platina + grønn telemetri. Ingen forklaringer — bare systemet.
  Alle størrelser i --u (1 % av bredden). SVG-laget deler samme koordinater
  (viewBox 0 0 100 94), så linjer og HTML-noder er perfekt synkronisert.
*/

import { useEffect, useRef, useState } from 'react';
import { Home, Megaphone, TrendingUp, FileCheck, UserCheck, MapPin } from 'lucide-react';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack,
  fmtNOK,
} from '@/components/video/filmUtils';

const LOOP = 20.4;
const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;

const HUB = { x: 50, y: 46 };
const RINGS = [
  { r: 12, at: 2.9, op: 0.10 },
  { r: 18, at: 3.15, op: 0.07 },
  { r: 24, at: 3.4, op: 0.09, dashed: true },
];
const NODES = [
  { at: 5.6, x: 18, y: 26, icon: Megaphone, label: 'Annonse', sub: 'Finn · Airbnb' },
  { at: 7.3, x: 82, y: 26, icon: TrendingUp, label: 'Pris', sub: '25 500 kr/mnd' },
  { at: 9.0, x: 14, y: 62, icon: UserCheck, label: 'Leietaker', sub: 'Verifisert' },
  { at: 10.7, x: 86, y: 62, icon: FileCheck, label: 'Kontrakt', sub: 'BankID · 12 mnd' },
];
/* grønne returpulser: hovedhøsting + idle-liv */
const RETURNS = [
  { n: 0, at: 12.5 }, { n: 1, at: 12.7 }, { n: 2, at: 12.9 }, { n: 3, at: 13.1 },
  { n: 1, at: 16.9 }, { n: 2, at: 17.7 },
];

const lineFor = (n) => {
  const dx = n.x - HUB.x, dy = n.y - HUB.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len, uy = dy / len;
  return {
    x1: HUB.x + ux * 8.4, y1: HUB.y + uy * 8.4,
    x2: n.x - ux * 5.4, y2: n.y - uy * 5.4,
  };
};
const LINES = NODES.map(lineFor);

function useLoopTime(playing) {
  const [t, setT] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (reduce) {
      setT(15.6); // statisk: hele systemet aktivt + utbetaling
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

/* ---------- bakteppe: rommet lysner når systemet booter ---------- */
function Backdrop({ t, ex }) {
  const breathe = 0.8 + 0.2 * Math.sin(t * 0.35);
  const lit = (0.35 + 0.65 * easeOutCubic(seg(t, 1.4, 2.6))) * (1 - 0.7 * ex);
  return (
    <>
      <div
        className="absolute"
        style={{
          left: '6%', top: '4%', width: '88%', height: '88%',
          background: 'radial-gradient(ellipse 60% 55% at 50% 47%, rgba(235,232,245,0.06), transparent 70%)',
          opacity: (breathe * lit).toFixed(2),
        }}
      />
      <div
        className="absolute"
        style={{
          left: '18%', right: '18%', bottom: '1%', height: u(8),
          background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(190,182,215,0.11), transparent 72%)',
          filter: `blur(${u(2.4)})`,
          opacity: lit.toFixed(2),
        }}
      />
    </>
  );
}

/* ---------- liten grønn hake ---------- */
function ChipCheck({ size = 3 }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: u(size), height: u(size), borderRadius: '50%',
        background: 'rgba(12,20,16,0.9)', border: '1px solid rgba(52,211,153,0.55)',
        boxShadow: `0 0 ${u(1.2)} rgba(52,211,153,0.35)`,
      }}
    >
      <span style={{ color: '#7ee2a8', fontWeight: 700, fontSize: u(size * 0.56), lineHeight: 1 }}>✓</span>
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
            background: 'rgba(14,13,17,0.95)',
            border: '1.2px solid rgba(255,255,255,0.16)', borderTopColor: 'rgba(255,255,255,0.8)',
            transform: `rotate(${spin}deg)`,
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

/* ---------- SVG-lag: ringer, sveip-senter, linjer og pulser ---------- */
function SystemSVG({ t }) {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 94" fill="none" aria-hidden="true">
      {/* kalibrerende ringer */}
      {RINGS.map((ring, i) => {
        const p = easeOutCubic(seg(t, ring.at, ring.at + 0.7));
        if (p <= 0.004) return null;
        return (
          <circle
            key={i}
            cx={HUB.x} cy={HUB.y} r={(ring.r * p).toFixed(2)}
            stroke={`rgba(235,232,245,${(ring.op * p).toFixed(3)})`}
            strokeWidth="0.22"
            strokeDasharray={ring.dashed ? '1.1 2.3' : 'none'}
            style={ring.dashed ? { transformOrigin: '50px 46px', transform: `rotate(${(t * 2.4).toFixed(2)}deg)` } : undefined}
          />
        );
      })}

      {/* sonar-puls fra huben — systemet lever */}
      {t > 6.2 && (() => {
        const rp = ((t - 6.2) % 3.2) / 3.2;
        return (
          <circle
            cx={HUB.x} cy={HUB.y} r={(7.6 + rp * 7.5).toFixed(2)}
            stroke={`rgba(235,232,245,${((1 - rp) * 0.10).toFixed(3)})`}
            strokeWidth="0.25"
          />
        );
      })()}

      {/* ankomst-rippel når pulsen treffer noden */}
      {NODES.map((n) => {
        const ar = seg(t, n.at + 0.5, n.at + 1.05);
        if (ar <= 0.01 || ar >= 0.99) return null;
        return (
          <circle
            key={`rip-${n.label}`}
            cx={n.x} cy={n.y} r={(3.4 + easeOutCubic(ar) * 4).toFixed(2)}
            stroke={`rgba(235,232,245,${(Math.sin(ar * Math.PI) * 0.22).toFixed(3)})`}
            strokeWidth="0.22"
          />
        );
      })}

      {/* forbindelseslinjer */}
      {NODES.map((n, i) => {
        const p = easeInOutCubic(seg(t, n.at, n.at + 0.5));
        if (p <= 0.004) return null;
        const L = LINES[i];
        const len = Math.hypot(L.x2 - L.x1, L.y2 - L.y1);
        const active = t > n.at + 1.05;
        return (
          <line
            key={n.label}
            x1={L.x1} y1={L.y1} x2={L.x2} y2={L.y2}
            stroke={`rgba(235,232,245,${active ? 0.13 : 0.26})`}
            strokeWidth="0.22"
            strokeDasharray={len.toFixed(2)}
            strokeDashoffset={(len * (1 - p)).toFixed(2)}
          />
        );
      })}

      {/* pulser ut (platina) */}
      {NODES.map((n, i) => {
        const p = easeInOutCubic(seg(t, n.at + 0.12, n.at + 0.58));
        if (p <= 0.01 || p >= 0.99) return null;
        const L = LINES[i];
        const x = L.x1 + (L.x2 - L.x1) * p;
        const y = L.y1 + (L.y2 - L.y1) * p;
        const op = Math.sin(p * Math.PI);
        return (
          <g key={`out-${n.label}`}>
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.3" fill={`rgba(235,232,245,${(op * 0.18).toFixed(2)})`} />
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="0.55" fill={`rgba(250,249,253,${(op * 0.95).toFixed(2)})`} />
          </g>
        );
      })}

      {/* returpulser (grønn telemetri, node → hub) */}
      {RETURNS.map((r, i) => {
        const p = easeInOutCubic(seg(t, r.at, r.at + 0.55));
        if (p <= 0.01 || p >= 0.99) return null;
        const L = LINES[r.n];
        const x = L.x2 + (L.x1 - L.x2) * p;
        const y = L.y2 + (L.y1 - L.y2) * p;
        const op = Math.sin(p * Math.PI);
        return (
          <g key={`ret-${i}`}>
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="1.3" fill={`rgba(52,211,153,${(op * 0.2).toFixed(2)})`} />
            <circle cx={x.toFixed(2)} cy={y.toFixed(2)} r="0.55" fill={`rgba(126,226,168,${(op * 0.95).toFixed(2)})`} />
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- radarsveip rundt huben ---------- */
function Sweep({ t }) {
  const o = easeOutCubic(seg(t, 3.3, 4.1));
  if (o <= 0.01) return null;
  const rot = (t * 42) % 360;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${HUB.x}%`, top: `${(HUB.y / 94) * 100}%`,
        width: u(50), height: u(50),
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%',
        background: `conic-gradient(from ${rot.toFixed(1)}deg, rgba(235,232,245,${(0.065 * o).toFixed(3)}), transparent 48deg)`,
        maskImage: 'radial-gradient(circle, transparent 26%, rgba(0,0,0,0.9) 42%, rgba(0,0,0,0.9) 60%, transparent 72%)',
        WebkitMaskImage: 'radial-gradient(circle, transparent 26%, rgba(0,0,0,0.9) 42%, rgba(0,0,0,0.9) 60%, transparent 72%)',
      }}
    />
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
        left: `${HUB.x}%`, top: `${(HUB.y / 94) * 100}%`,
        width: u(TW), height: u(TH),
        transform: `translate(-50%, -50%) translateY(${u((1 - Math.min(inRaw, 1.03)) * 4)}) scale(${((0.92 + 0.08 * Math.min(inRaw, 1.03)) * (1 - out * 0.25)).toFixed(3)})`,
        opacity: o.toFixed(2),
        filter: out > 0.02 ? `blur(${(out * 6).toFixed(1)}px)` : 'none',
      }}
    >
      {/* etikett — glir opp mot systemlinjen når den fases ut */}
      <p
        className="font-body uppercase absolute left-1/2 text-center"
        style={{
          bottom: `calc(100% + ${u(3.2)})`,
          fontSize: u(2.1), letterSpacing: '0.42em',
          color: 'rgba(253,252,251,0.62)',
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
            ? 'linear-gradient(135deg, rgba(255,255,255,0.26), rgba(255,255,255,0.10) 45%, rgba(213,206,226,0.18))'
            : 'rgba(255,255,255,0.085)',
          border: `1px solid ${on ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.18)'}`,
          boxShadow: on
            ? `0 0 ${u(5)} rgba(235,232,245,0.20), inset 0 ${u(0.4)} ${u(0.8)} rgba(255,255,255,0.22), inset 0 ${u(-0.8)} ${u(1.6)} rgba(0,0,0,0.25)`
            : `inset 0 ${u(0.4)} ${u(0.8)} rgba(255,255,255,0.09), inset 0 ${u(-0.8)} ${u(1.8)} rgba(0,0,0,0.45)`,
          transition: 'background 0.4s, border 0.4s, box-shadow 0.4s',
        }}
      />
      <span
        className="absolute rounded-full"
        style={{
          top: '50%', left: u(PAD), width: u(KW), height: u(KW),
          transform: `translateY(-50%) translateX(${u(kx)})`,
          background: 'linear-gradient(150deg, #FFFFFF 10%, #F1EEF6 55%, #DCD6E6)',
          boxShadow: `0 ${u(0.8)} ${u(2.4)} rgba(0,0,0,0.55), inset 0 ${u(0.4)} ${u(0.7)} rgba(255,255,255,0.95), inset 0 ${u(-0.5)} ${u(0.9)} rgba(0,0,0,0.14)${on ? `, 0 0 ${u(2.6)} rgba(255,255,255,0.28)` : ''}`,
        }}
      />
      {/* status — skifter til grønt når den aktiveres */}
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
              style={{ width: u(1.4), height: u(1.4), background: '#34d399', boxShadow: `0 0 ${u(1.6)} rgba(52,211,153,0.8)`, opacity: statusIn.toFixed(2) }}
            />
            <span className="font-body" style={{ fontSize: u(2.3), color: 'rgba(126,226,168,0.92)', opacity: statusIn.toFixed(2) }}>
              Autopilot aktivert
            </span>
          </>
        ) : (
          <span className="font-body" style={{ fontSize: u(2.3), color: 'rgba(253,252,251,0.38)' }}>Av</span>
        )}
      </div>
    </div>
  );
}

/* ---------- huben: boligen i sentrum ---------- */
function Hub({ t }) {
  const inP = easeOutBack(seg(t, 2.85, 3.55));
  if (inP <= 0.004) return null;
  const active = NODES.filter((n) => t > n.at + 1.05).length;
  const flash = Math.sin(clamp01(seg(t, 13.0, 13.9)) * Math.PI);
  const energy = 0.12 + active * 0.05 + flash * 0.3;
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{
        left: `${HUB.x}%`, top: `${(HUB.y / 94) * 100}%`,
        width: u(14), height: u(14),
        transform: `translate(-50%, -50%) scale(${(0.6 + 0.4 * Math.min(inP, 1.05) + flash * 0.03).toFixed(3)})`,
        opacity: Math.min(inP * 1.4, 1).toFixed(2),
        borderRadius: '50%',
        background: 'rgba(21,20,25,0.94)',
        border: `1px solid rgba(255,255,255,${(0.16 + flash * 0.2).toFixed(2)})`,
        boxShadow: `0 ${u(2)} ${u(6)} rgba(0,0,0,0.5), 0 0 ${u(6)} rgba(235,232,245,${energy.toFixed(2)}), inset 0 1px 0 rgba(255,255,255,0.12)`,
      }}
    >
      <Home style={{ width: u(5.2), height: u(5.2), color: 'rgba(253,252,251,0.92)' }} strokeWidth={1.6} />
    </div>
  );
}

/* ---------- systemlinje øverst ---------- */
function SystemLabel({ t }) {
  const p = easeOutCubic(seg(t, 3.3, 3.9));
  if (p <= 0.004) return null;
  const aktiv = easeOutCubic(seg(t, 3.7, 4.2));
  return (
    <div
      className="absolute flex items-center justify-center"
      style={{ left: 0, right: 0, top: u(4.5), gap: u(1.6), opacity: p.toFixed(2), transform: `translateY(${u((1 - p) * 1.5)})` }}
    >
      <span className="font-body uppercase" style={{ fontSize: u(1.75), letterSpacing: '0.42em', color: 'rgba(253,252,251,0.38)' }}>
        DigiHome Autopilot
      </span>
      {aktiv > 0.01 && (
        <span className="flex items-center" style={{ gap: u(1), opacity: aktiv.toFixed(2) }}>
          <span className="inline-flex rounded-full" style={{ width: u(1.2), height: u(1.2), background: '#34d399', boxShadow: `0 0 ${u(1.4)} rgba(52,211,153,0.8)` }} />
          <span className="font-body uppercase" style={{ fontSize: u(1.75), letterSpacing: '0.3em', color: 'rgba(126,226,168,0.85)' }}>Aktiv</span>
        </span>
      )}
    </div>
  );
}

/* ---------- adresse-lock med sikte-braketter ---------- */
function AddressLock({ t }) {
  const p = easeOutCubic(seg(t, 4.1, 4.8));
  if (p <= 0.004) return null;
  const lockP = easeInOutCubic(seg(t, 4.2, 4.95));
  const tick = easeOutBack(seg(t, 5.05, 5.45));
  const settled = t > 5.8;
  const br = (1.9 - 0.9 * lockP);
  const brO = Math.min(p, settled ? 0.25 : 0.8);
  const corner = (pos) => ({
    position: 'absolute',
    width: u(2), height: u(2),
    ...(pos.includes('t') ? { top: 0 } : { bottom: 0 }),
    ...(pos.includes('l') ? { left: 0 } : { right: 0 }),
    borderTop: pos.includes('t') ? '1.5px solid rgba(235,232,245,0.7)' : 'none',
    borderBottom: pos.includes('b') ? '1.5px solid rgba(235,232,245,0.7)' : 'none',
    borderLeft: pos.includes('l') ? '1.5px solid rgba(235,232,245,0.7)' : 'none',
    borderRight: pos.includes('r') ? '1.5px solid rgba(235,232,245,0.7)' : 'none',
  });
  return (
    <div className="absolute flex justify-center" style={{ left: 0, right: 0, top: u(10.5) }}>
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
        <MapPin style={{ width: u(2.3), height: u(2.3), color: 'rgba(253,252,251,0.5)', flexShrink: 0 }} />
        <span className="font-body" style={{ fontSize: u(2.35), color: `rgba(253,252,251,${settled ? 0.6 : 0.92})`, whiteSpace: 'nowrap', transition: 'color 0.5s' }}>
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
function Node({ t, node }) {
  const inRaw = easeOutBack(seg(t, node.at + 0.4, node.at + 0.95));
  if (inRaw <= 0.004) return null;
  const inP = Math.min(inRaw, 1.05);
  const active = t > node.at + 1.05;
  const Icon = node.icon;
  return (
    <div
      className="absolute flex flex-col items-center"
      style={{
        left: `${node.x}%`, top: `${(node.y / 94) * 100}%`,
        transform: `translate(-50%, -50%) scale(${(0.8 + 0.2 * inP).toFixed(3)})`,
        opacity: (Math.min(inRaw * 1.4, 1) * (active ? 0.92 : 1)).toFixed(2),
      }}
    >
      <span
        className="relative inline-flex items-center justify-center"
        style={{
          width: u(6.4), height: u(6.4), borderRadius: u(1.9),
          background: 'rgba(21,20,25,0.92)',
          border: `1px solid rgba(255,255,255,${active ? 0.2 : 0.13})`,
          boxShadow: `0 ${u(1.4)} ${u(4)} rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)${active ? `, 0 0 ${u(2.6)} rgba(235,232,245,0.08)` : ''}`,
          transition: 'border 0.4s, box-shadow 0.4s',
        }}
      >
        <Icon style={{ width: u(3), height: u(3), color: 'rgba(253,252,251,0.88)' }} strokeWidth={1.7} />
        <NodeStatus t={t} done={node.at + 1.05} />
      </span>
      <p className="font-body font-medium" style={{ fontSize: u(2.05), color: 'rgba(253,252,251,0.88)', marginTop: u(1.3), whiteSpace: 'nowrap' }}>{node.label}</p>
      <p className="font-body" style={{ fontSize: u(1.75), color: 'rgba(253,252,251,0.4)', marginTop: u(0.25), whiteSpace: 'nowrap' }}>{node.sub}</p>
    </div>
  );
}

/* ---------- utbetalings-telemetri nederst ---------- */
function PayoutReadout({ t }) {
  const lineP = easeInOutCubic(seg(t, 13.5, 14.0));
  if (lineP <= 0.004) return null;
  const labelP = easeOutCubic(seg(t, 13.7, 14.2));
  const amount = 25000 * easeOutCubic(seg(t, 14.0, 15.2));
  const check = easeOutBack(seg(t, 15.3, 15.7));
  const subP = easeOutCubic(seg(t, 15.9, 16.4));
  const bloom = Math.sin(clamp01(seg(t, 15.3, 16.3)) * Math.PI);
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(73.5) }}>
      <span
        style={{
          width: u(30 * lineP), height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(235,232,245,0.35), transparent)',
        }}
      />
      {labelP > 0.01 && (
        <p
          className="font-body uppercase"
          style={{
            fontSize: u(1.75), letterSpacing: '0.4em', color: 'rgba(253,252,251,0.4)',
            marginTop: u(2.2), opacity: labelP.toFixed(2), transform: `translateY(${u((1 - labelP) * 1.5)})`,
          }}
        >
          Leie mottatt
        </p>
      )}
      {amount > 1 && (
        <div className="relative flex items-center" style={{ gap: u(2), marginTop: u(1.2) }}>
          <span
            className="absolute pointer-events-none"
            style={{
              inset: u(-7),
              background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(240,237,248,0.09), transparent 70%)',
              opacity: bloom.toFixed(2),
            }}
          />
          <span className="relative font-heading font-bold" style={{ fontSize: u(6.6), color: '#FDFCFB', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {fmtNOK(amount)} kr
          </span>
          {check > 0.01 && (
            <span className="relative" style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
              <ChipCheck size={4} />
            </span>
          )}
        </div>
      )}
      {subP > 0.01 && (
        <p className="font-body" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.5)', marginTop: u(1.6), opacity: subP.toFixed(2) }}>
          Hver måned · helt automatisk
        </p>
      )}
    </div>
  );
}

/* ===================== HOVEDKOMPONENT ===================== */
export function HeroLoop({ playing = true }) {
  const wrapRef = useRef(null);
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

  const t = useLoopTime(playing && inView);
  const fy = Math.sin(t * 0.5) * 0.4;
  const ex = easeInOutCubic(seg(t, 18.9, 20.0));

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ '--u': `${un}px`, aspectRatio: '100 / 94' }}
      aria-hidden="true"
    >
      <Backdrop t={t} ex={ex} />
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${u(fy - ex * 2.5)})`,
          opacity: (1 - ex).toFixed(2),
          filter: ex > 0.02 ? `blur(${(ex * 6).toFixed(1)}px)` : 'none',
        }}
      >
        <Sweep t={t} />
        <SystemSVG t={t} />
        <SystemLabel t={t} />
        <AddressLock t={t} />
        <BootToggle t={t} />
        <Hub t={t} />
        {NODES.map((n) => (
          <Node key={n.label} t={t} node={n} />
        ))}
        <PayoutReadout t={t} />
      </div>
    </div>
  );
}
