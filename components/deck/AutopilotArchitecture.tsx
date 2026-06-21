'use client';
/**
 * AutopilotArchitecture — animert systemskisse for deck-slide (SArkitektur).
 * Fundament (datamodell) → strømmer konvergerer inn i Autopilot-kjernen → handlinger ut.
 * Selvstendig, CSS-drevet animasjon. pdfMode = ferdig-avslørt statisk bilde.
 */
import React, { useEffect, useState } from 'react';
import {
  Building2, FileText, Users, Wallet, FileSignature, Radio,
  Sparkles, Bell, ListChecks,
} from 'lucide-react';

const INK = '#1c1815';
const SOFT = '#f1efe9';
const HAIR = '#e7e2d9';
const MUTED = 'rgba(28,22,16,0.5)';
const ACCENT = '#7c3aed';
const BRAND = '#d298ff';
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif";

const W = 1300;
const H = 600;
const CORE_X = 832;
const CORE_Y = 300;
const CORE_R = 80;
const NODE_X = 64;
const NODE_W = 238;
const NODE_RIGHT = NODE_X + NODE_W; // 302

const NODES = [
  { label: 'Eiendommer', sub: 'Bygg · Enheter', Icon: Building2, y: 60 },
  { label: 'Leieforhold', sub: 'Aktive boforhold', Icon: FileText, y: 156 },
  { label: 'Personer', sub: 'Huseiere · Leietakere', Icon: Users, y: 252 },
  { label: 'Økonomi', sub: 'Leie · Depositum', Icon: Wallet, y: 348 },
  { label: 'Dokumenter', sub: 'Kontrakter · Vedlegg', Icon: FileSignature, y: 444 },
  { label: 'Kanaler', sub: 'FINN · Airbnb', Icon: Radio, y: 540 },
];

const CHIPS = [
  { label: 'Lag leiekontrakt', Icon: FileSignature, y: 138 },
  { label: 'Send påminnelse', Icon: Bell, y: 246 },
  { label: 'Krev inn depositum', Icon: Wallet, y: 354 },
  { label: 'Foreslå neste steg', Icon: ListChecks, y: 462 },
];
const CHIP_X = 1006;

const flowPath = (y: number) =>
  `M ${NODE_RIGHT},${y} C ${NODE_RIGHT + 190},${y} ${CORE_X - 210},${CORE_Y} ${CORE_X - CORE_R - 4},${CORE_Y}`;
const chipPath = (y: number) =>
  `M ${CORE_X + CORE_R + 2},${CORE_Y} C ${CORE_X + CORE_R + 60},${CORE_Y} ${CHIP_X - 64},${y} ${CHIP_X - 6},${y}`;

const ZoneLabel = ({ children, x, anim, delay }: any) => (
  <div className="absolute text-[10.5px] font-bold uppercase tracking-[0.26em]" style={{
    left: x, top: -2, color: MUTED, fontFamily: F,
    animation: anim ? `archFade 0.7s ease ${delay}s both` : undefined, opacity: anim ? undefined : 1,
  }}>{children}</div>
);

export default function AutopilotArchitecture({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const isPdf = !!pdfMode;
  const reveal = active || isPdf;
  const anim = !!active && !isPdf;

  const [scale, setScale] = useState(isPdf ? 0.9 : 0.74);
  useEffect(() => {
    if (isPdf) { setScale(0.92); return; }
    const upd = () => {
      const availH = window.innerHeight - 250;
      const availW = window.innerWidth - 120;
      setScale(Math.max(0.45, Math.min(availH / H, availW / W, 1)));
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [isPdf]);

  const DASH = 820;

  return (
    <div className="relative mx-auto" style={{ width: W * scale, height: H * scale, opacity: reveal ? 1 : 0 }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>

        {/* zone-etiketter */}
        <ZoneLabel x={NODE_X} anim={anim} delay={0.1}>Fundament</ZoneLabel>
        <ZoneLabel x={CHIP_X - 4} anim={anim} delay={3.5}>Handling</ZoneLabel>

        {/* ── SVG: strømmer ── */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e9c6ff" />
              <stop offset="55%" stopColor={BRAND} />
              <stop offset="100%" stopColor="#9a55e0" />
            </radialGradient>
          </defs>

          {/* fundament → kjerne */}
          {NODES.map((n, i) => (
            <g key={`f${i}`}>
              {/* base-linje (tegnes inn) */}
              <path d={flowPath(n.y)} fill="none" stroke="rgba(28,22,16,0.13)" strokeWidth={1.4} strokeLinecap="round"
                style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `archDraw 1s cubic-bezier(0.4,0,0.2,1) ${0.9 + i * 0.08}s forwards` : undefined }} />
              {/* partikler */}
              <path d={flowPath(n.y)} fill="none" stroke={ACCENT} strokeWidth={2.1} strokeLinecap="round"
                style={{ strokeDasharray: '2 15', opacity: reveal ? 0.55 : 0, animation: anim ? `archFlow 1.6s linear ${1.9 + i * 0.08}s infinite, archFade 0.6s ease ${1.9 + i * 0.08}s both` : (isPdf ? 'archFlow 1.6s linear infinite' : undefined) }} />
            </g>
          ))}

          {/* kjerne → handlinger */}
          {CHIPS.map((c, i) => (
            <path key={`c${i}`} d={chipPath(c.y)} fill="none" stroke="rgba(124,58,237,0.30)" strokeWidth={1.4} strokeLinecap="round"
              style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `archDraw 0.7s ease ${3.3 + i * 0.16}s forwards` : undefined }} />
          ))}
        </svg>

        {/* ── Fundament-noder ── */}
        {NODES.map((n, i) => (
          <div key={n.label} className="absolute flex items-center gap-3 rounded-2xl bg-white px-3.5"
            style={{
              left: NODE_X, top: n.y - 28, width: NODE_W, height: 56,
              border: `1px solid ${HAIR}`, boxShadow: '0 6px 18px -10px rgba(20,15,10,0.18)',
              animation: anim ? `archNodeIn 0.7s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.09}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0),
            }}>
            <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: SOFT }}>
              <n.Icon className="w-[18px] h-[18px]" strokeWidth={1.9} style={{ color: INK }} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-bold leading-none tracking-[-0.01em]" style={{ color: INK, fontFamily: FH }}>{n.label}</p>
              <p className="text-[11px] mt-1 truncate" style={{ color: MUTED }}>{n.sub}</p>
            </div>
          </div>
        ))}

        {/* ── Autopilot-kjerne ── */}
        <div className="absolute" style={{ left: CORE_X - CORE_R, top: CORE_Y - CORE_R, width: CORE_R * 2, height: CORE_R * 2,
          animation: anim ? 'archCoreIn 0.9s cubic-bezier(0.16,1,0.3,1) 2s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          {/* ytre glød-ringer */}
          <div className="absolute rounded-full" style={{ inset: -42, background: 'radial-gradient(circle, rgba(210,152,255,0.30), transparent 68%)', animation: reveal ? 'archHalo 3.2s ease-in-out infinite' : undefined }} />
          <div className="absolute rounded-full" style={{ inset: -16, border: '1px solid rgba(124,58,237,0.18)' }} />
          <div className="absolute rounded-full" style={{ inset: -2, border: '1px solid rgba(124,58,237,0.28)' }} />
          {/* kjerne */}
          <div className="absolute inset-0 rounded-full flex items-center justify-center"
            style={{ backgroundImage: 'radial-gradient(circle at 38% 32%, #efd6ff, #d298ff 52%, #9a55e0)', boxShadow: '0 18px 50px -10px rgba(154,85,224,0.6), inset 0 2px 10px rgba(255,255,255,0.5)' }}>
            <Sparkles className="w-9 h-9" strokeWidth={1.8} style={{ color: '#fff' }} />
          </div>
          {/* label */}
          <div className="absolute left-1/2 -translate-x-1/2 text-center" style={{ top: CORE_R * 2 + 16,
            animation: anim ? 'archFade 0.7s ease 2.5s both' : undefined, opacity: anim ? undefined : 1 }}>
            <p className="text-[17px] font-bold tracking-[-0.01em] whitespace-nowrap" style={{ color: INK, fontFamily: FH }}>Autopilot</p>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] mt-1" style={{ color: ACCENT, fontFamily: F }}>Motoren</p>
          </div>
        </div>

        {/* ── Handlinger ut ── */}
        {CHIPS.map((c, i) => (
          <div key={c.label} className="absolute flex items-center gap-2.5 rounded-full bg-white pl-3 pr-4"
            style={{
              left: CHIP_X, top: c.y - 21, height: 42,
              border: `1px solid ${HAIR}`, boxShadow: '0 8px 22px -12px rgba(124,58,237,0.4)',
              animation: anim ? `archChipIn 0.6s cubic-bezier(0.16,1,0.3,1) ${3.5 + i * 0.16}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0),
            }}>
            <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(210,152,255,0.16)' }}>
              <c.Icon className="w-[15px] h-[15px]" strokeWidth={2} style={{ color: ACCENT }} />
            </span>
            <span className="text-[13px] font-semibold whitespace-nowrap" style={{ color: INK, fontFamily: FH }}>{c.label}</span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes archFade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes archNodeIn { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes archChipIn { from { opacity: 0; transform: translateX(14px) scale(0.94); } to { opacity: 1; transform: translateX(0) scale(1); } }
        @keyframes archCoreIn { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
        @keyframes archDraw { to { stroke-dashoffset: 0; } }
        @keyframes archFlow { to { stroke-dashoffset: -170; } }
        @keyframes archHalo { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
      `}</style>
    </div>
  );
}
