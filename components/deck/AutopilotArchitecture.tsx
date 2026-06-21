'use client';
/**
 * AutopilotArchitecture — rolig, editorial systemskisse (deck-slide SArkitektur).
 * Fundament (datamodell) → samles i Autopilot-motoren → handlinger ut.
 *
 * Robusthet mot «egg»: HELE skissen tegnes i ÉN SVG med preserveAspectRatio="xMidYMid meet",
 * og ytre boks er låst med aspect-ratio. INGEN CSS transform:scale → kjernen kan ikke bli elliptisk.
 * Tekst/ikoner ligger som HTML-overlay posisjonert i % (samme koordinatrom), skalert med cqw.
 *
 * Stil: dempet, profesjonell, lite lilla. Grafitt-kjerne, nøytrale linjer, lilla kun som aksent.
 * Bevegelse: stille — mykt pust i motoren + en svak, langsom dataflyt inn. pdfMode = statisk.
 */
import React from 'react';
import {
  Building2, FileText, Users, Wallet, FileSignature, Radio,
  Bell, ListChecks,
} from 'lucide-react';

const INK = '#1c1815';
const MUTED = 'rgba(28,22,16,0.42)';
const SOFT_INK = 'rgba(28,22,16,0.50)';
const ACCENT = '#7c3aed';
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif";

/* ── geometri (viewBox-koordinater) ── */
const W = 1240;
const H = 540;
const CX = 620;
const CY = 270;
const R = 88;

const LDOT_X = 332;
const RDOT_X = 908;
const L_TEXT_R = 286;
const L_ICON_X = 300;
const R_ICON_X = 928;
const R_TEXT_L = 948;

const FOUND = [
  { label: 'Eiendommer', sub: 'Bygg · Enheter', Icon: Building2, y: 50 },
  { label: 'Leieforhold', sub: 'Aktive boforhold', Icon: FileText, y: 138 },
  { label: 'Personer', sub: 'Huseiere · Leietakere', Icon: Users, y: 226 },
  { label: 'Økonomi', sub: 'Leie · Depositum', Icon: Wallet, y: 314 },
  { label: 'Dokumenter', sub: 'Kontrakter · Vedlegg', Icon: FileSignature, y: 402 },
  { label: 'Kanaler', sub: 'FINN · Airbnb', Icon: Radio, y: 490 },
];
const ACTIONS = [
  { label: 'Lag leiekontrakt', Icon: FileSignature, y: 126 },
  { label: 'Send påminnelse', Icon: Bell, y: 222 },
  { label: 'Krev inn depositum', Icon: Wallet, y: 318 },
  { label: 'Foreslå neste steg', Icon: ListChecks, y: 414 },
];

const flowPath = (y: number) =>
  `M ${LDOT_X},${y} C ${LDOT_X + 156},${y} ${CX - 210},${CY} ${CX - R - 2},${CY}`;
const actPath = (y: number) =>
  `M ${CX + R + 2},${CY} C ${CX + 166},${CY} ${RDOT_X - 110},${y} ${RDOT_X},${y}`;

const pX = (x: number) => `${(x / W) * 100}%`;
const pY = (y: number) => `${(y / H) * 100}%`;

export default function AutopilotArchitecture({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const isPdf = !!pdfMode;
  const reveal = active || isPdf;
  const anim = !!active && !isPdf;
  const DASH = 760;

  const ovStyle: React.CSSProperties = { position: 'absolute' };

  return (
    <div className="relative mx-auto"
      style={{ width: '100%', maxWidth: W, maxHeight: 'calc(100vh - 248px)', aspectRatio: `${W} / ${H}`, containerType: 'inline-size' } as React.CSSProperties}>

      {/* ── ÉN meet-SVG: linjer + dataflyt + motor (alltid rund) ── */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        <defs>
          <radialGradient id="ahHalo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(124,58,237,0.16)" />
            <stop offset="48%" stopColor="rgba(124,58,237,0.05)" />
            <stop offset="100%" stopColor="rgba(124,58,237,0)" />
          </radialGradient>
          <radialGradient id="ahCore" cx="36%" cy="28%" r="82%">
            <stop offset="0%" stopColor="#6a635b" />
            <stop offset="32%" stopColor="#3a352f" />
            <stop offset="72%" stopColor="#211d19" />
            <stop offset="100%" stopColor="#100e0c" />
          </radialGradient>
          <radialGradient id="ahSpec" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.42)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* fundament → motor */}
        {FOUND.map((n, i) => (
          <g key={`f${i}`}>
            <path d={flowPath(n.y)} fill="none" stroke="rgba(28,22,16,0.14)" strokeWidth={1.15} strokeLinecap="round"
              style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `ahDraw 1.1s cubic-bezier(0.4,0,0.2,1) ${0.7 + i * 0.07}s forwards` : undefined }} />
            {/* svak, langsom flyt inn */}
            <path d={flowPath(n.y)} fill="none" stroke="rgba(28,22,16,0.30)" strokeWidth={1.4} strokeLinecap="round"
              style={{ strokeDasharray: '1.5 15', opacity: reveal ? 0.32 : 0,
                animation: anim ? `ahDrift 6s linear ${1.6 + i * 0.1}s infinite, ahSoft 0.9s ease ${1.6 + i * 0.1}s both` : undefined }} />
          </g>
        ))}

        {/* motor → handling (rolige, statiske baner) */}
        {ACTIONS.map((c, i) => (
          <path key={`a${i}`} d={actPath(c.y)} fill="none" stroke="rgba(28,22,16,0.13)" strokeWidth={1.15} strokeLinecap="round"
            style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `ahDraw 0.9s ease ${1.5 + i * 0.1}s forwards` : undefined }} />
        ))}

        {/* node-prikker — fundament */}
        {FOUND.map((n, i) => (
          <circle key={`fd${i}`} cx={LDOT_X} cy={n.y} r={3.4} fill="#f7f5f2" stroke="rgba(28,22,16,0.32)" strokeWidth={1.3}
            style={{ opacity: reveal ? 1 : 0, animation: anim ? `ahSoft 0.4s ease ${0.85 + i * 0.07}s both` : undefined }} />
        ))}
        {/* node-prikker — handling */}
        {ACTIONS.map((c, i) => (
          <circle key={`ad${i}`} cx={RDOT_X} cy={c.y} r={3.4} fill="#f7f5f2" stroke="rgba(124,58,237,0.5)" strokeWidth={1.3}
            style={{ opacity: reveal ? 1 : 0, animation: anim ? `ahSoft 0.4s ease ${1.9 + i * 0.1}s both` : undefined }} />
        ))}

        {/* ── MOTOR ── */}
        <g style={{ opacity: reveal ? 1 : 0, animation: anim ? 'ahSoft 1.1s ease 0.8s both' : undefined }}>
          {/* dempet halo som puster (kun opacity → ingen transform) */}
          <circle cx={CX} cy={CY} r={150} fill="url(#ahHalo)">
            {anim && <animate attributeName="opacity" dur="6s" repeatCount="indefinite" values="0.6;1;0.6" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
          </circle>
          {/* tynn, rolig ring */}
          <circle cx={CX} cy={CY} r={R + 18} fill="none" stroke="rgba(28,22,16,0.10)" strokeWidth={1} />
          {/* grafitt-kjerne */}
          <circle cx={CX} cy={CY} r={R} fill="url(#ahCore)" />
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
          {/* mykt topplys */}
          <ellipse cx={CX - 22} cy={CY - 30} rx={34} ry={20} fill="url(#ahSpec)" />
          {/* sparkle */}
          <g fill="#ffffff" style={{ filter: 'drop-shadow(0 1px 5px rgba(0,0,0,0.4))' }}>
            <path transform={`translate(${CX} ${CY})`}
              d="M0,-21 C2.5,-6.7 6.7,-2.5 21,0 C6.7,2.5 2.5,6.7 0,21 C-2.5,6.7 -6.7,2.5 -21,0 C-6.7,-2.5 -2.5,-6.7 0,-21 Z">
              {anim && <animate attributeName="opacity" dur="5s" repeatCount="indefinite" values="0.82;1;0.82" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
            </path>
            <path transform={`translate(${CX + 18} ${CY - 16})`} opacity={0.9}
              d="M0,-6.5 C0.8,-2.1 2.1,-0.8 6.5,0 C2.1,0.8 0.8,2.1 0,6.5 C-0.8,2.1 -2.1,0.8 -6.5,0 C-2.1,-0.8 -0.8,-2.1 0,-6.5 Z" />
          </g>
        </g>
      </svg>

      {/* ── HTML-overlay: tekst + ikoner (posisjon i %, skala i cqw) ── */}
      {/* zone-etiketter */}
      <div style={{ ...ovStyle, left: 0, width: pX(L_TEXT_R), top: pY(8), textAlign: 'right', paddingRight: '1.1cqw',
        color: MUTED, fontFamily: F, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.34em', fontSize: '0.82cqw',
        animation: anim ? 'ahFade 0.7s ease 0.1s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>Fundament</div>
      <div style={{ ...ovStyle, left: pX(R_TEXT_L - 18), top: pY(8),
        color: MUTED, fontFamily: F, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.34em', fontSize: '0.82cqw',
        animation: anim ? 'ahFade 0.7s ease 1.9s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>Handling</div>

      {/* fundament-rader */}
      {FOUND.map((n, i) => (
        <React.Fragment key={n.label}>
          <div style={{ ...ovStyle, left: 0, width: pX(L_TEXT_R), top: pY(n.y), transform: 'translateY(-50%)', textAlign: 'right', paddingRight: '1.15cqw',
            animation: anim ? `ahInL 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
            <div style={{ fontFamily: FH, fontWeight: 700, color: INK, fontSize: '1.32cqw', lineHeight: 1, letterSpacing: '-0.012em' }}>{n.label}</div>
            <div style={{ fontFamily: F, color: MUTED, fontSize: '0.92cqw', lineHeight: 1, marginTop: '0.5cqw' }}>{n.sub}</div>
          </div>
          <div style={{ ...ovStyle, left: pX(L_ICON_X), top: pY(n.y), transform: 'translate(-50%,-50%)',
            animation: anim ? `ahSoft 0.5s ease ${0.45 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
            <n.Icon style={{ width: '1.55cqw', height: '1.55cqw', color: SOFT_INK }} strokeWidth={1.7} />
          </div>
        </React.Fragment>
      ))}

      {/* motor-label (ahSoft = kun opacity → beholder translateX(-50%)) */}
      <div style={{ ...ovStyle, left: pX(CX), top: pY(CY + R + 28), transform: 'translateX(-50%)', textAlign: 'center', width: '20cqw',
        animation: anim ? 'ahSoft 0.8s ease 1.5s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
        <div style={{ fontFamily: FH, fontWeight: 700, color: INK, fontSize: '1.7cqw', letterSpacing: '-0.02em' }}>Autopilot</div>
        <div style={{ fontFamily: F, fontWeight: 700, color: ACCENT, fontSize: '0.8cqw', textTransform: 'uppercase', letterSpacing: '0.28em', marginTop: '0.55cqw' }}>Motoren</div>
      </div>

      {/* handling-rader */}
      {ACTIONS.map((c, i) => (
        <React.Fragment key={c.label}>
          <div style={{ ...ovStyle, left: pX(R_ICON_X), top: pY(c.y), transform: 'translate(-50%,-50%)',
            animation: anim ? `ahInR 0.8s cubic-bezier(0.16,1,0.3,1) ${1.85 + i * 0.1}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
            <c.Icon style={{ width: '1.5cqw', height: '1.5cqw', color: SOFT_INK }} strokeWidth={1.8} />
          </div>
          <div style={{ ...ovStyle, left: pX(R_TEXT_L), top: pY(c.y), transform: 'translateY(-50%)', whiteSpace: 'nowrap',
            fontFamily: FH, fontWeight: 600, color: 'rgba(28,22,16,0.74)', fontSize: '1.3cqw', letterSpacing: '-0.01em',
            animation: anim ? `ahInR 0.8s cubic-bezier(0.16,1,0.3,1) ${1.9 + i * 0.1}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>{c.label}</div>
        </React.Fragment>
      ))}

      <style>{`
        @keyframes ahFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ahInL { from { opacity: 0; transform: translate(-14px,-50%); } to { opacity: 1; transform: translate(0,-50%); } }
        @keyframes ahInR { from { opacity: 0; transform: translate(12px,-50%); } to { opacity: 1; transform: translate(0,-50%); } }
        @keyframes ahSoft { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ahDraw { to { stroke-dashoffset: 0; } }
        @keyframes ahDrift { to { stroke-dashoffset: -160; } }
      `}</style>
    </div>
  );
}
