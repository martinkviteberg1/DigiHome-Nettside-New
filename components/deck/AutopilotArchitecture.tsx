'use client';
/**
 * AutopilotArchitecture — editorial systemskisse (deck-slide SArkitektur).
 * Fundament (datamodell) → samles i Autopilot-motoren → handlinger ut.
 *
 * EGG-FIX (endelig): motoren tegnes som en ren CSS-kule (HTML-div) med aspect-ratio:1 og
 * LIK width/height, posisjonert via calc() (INGEN transform, INGEN SVG-gradient).
 * Det unngår både transform-compositing og SVG-rasterisering — kulen KAN ikke bli elliptisk.
 * Linjer/noder ligger i én meet-SVG (vektorer). Tekst/ikoner = HTML-overlay (% + cqw).
 *
 * Stil: verdensklasse lilla motor (glossy kule + glød), rolig og profesjonell forøvrig.
 */
import React from 'react';
import {
  Building2, FileText, Users, Wallet, FileSignature, Radio,
  Bell, ListChecks, Sparkles,
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

/* kule-radius i cqw (1 viewBox-enhet = 100/W cqw) → linjene treffer kanten eksakt */
const U = 100 / W;                 // cqw per viewBox-enhet
const CORE_R_CQW = R * U;          // ≈ 7.10cqw
const CORE_D_CQW = 2 * R * U;      // ≈ 14.19cqw

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
/* sentrert boks (cqw diameter) via calc — uten transform */
const centeredBox = (xPct: string, yPct: string, dCqw: number): React.CSSProperties => ({
  position: 'absolute', left: `calc(${xPct} - ${dCqw / 2}cqw)`, top: `calc(${yPct} - ${dCqw / 2}cqw)`,
  width: `${dCqw}cqw`, height: `${dCqw}cqw`, aspectRatio: '1 / 1', borderRadius: '50%',
});

export default function AutopilotArchitecture({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const isPdf = !!pdfMode;
  const reveal = active || isPdf;
  const anim = !!active && !isPdf;
  const DASH = 760;
  const ov: React.CSSProperties = { position: 'absolute' };

  return (
    <div className="relative mx-auto"
      style={{ width: '100%', maxWidth: W, maxHeight: 'calc(100vh - 248px)', aspectRatio: `${W} / ${H}`, containerType: 'inline-size' } as React.CSSProperties}>

      {/* ── meet-SVG: linjer + dataflyt + node-prikker (kun vektorer) ── */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
        {FOUND.map((n, i) => (
          <g key={`f${i}`}>
            <path d={flowPath(n.y)} fill="none" stroke="rgba(28,22,16,0.14)" strokeWidth={1.15} strokeLinecap="round"
              style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `ahDraw 1.1s cubic-bezier(0.4,0,0.2,1) ${0.7 + i * 0.07}s forwards` : undefined }} />
            <path d={flowPath(n.y)} fill="none" stroke="rgba(124,58,237,0.34)" strokeWidth={1.4} strokeLinecap="round"
              style={{ strokeDasharray: '1.5 15', opacity: reveal ? 0.4 : 0,
                animation: anim ? `ahDrift 6s linear ${1.6 + i * 0.1}s infinite, ahSoft 0.9s ease ${1.6 + i * 0.1}s both` : undefined }} />
          </g>
        ))}
        {ACTIONS.map((c, i) => (
          <path key={`a${i}`} d={actPath(c.y)} fill="none" stroke="rgba(28,22,16,0.13)" strokeWidth={1.15} strokeLinecap="round"
            style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `ahDraw 0.9s ease ${1.5 + i * 0.1}s forwards` : undefined }} />
        ))}
        {FOUND.map((n, i) => (
          <circle key={`fd${i}`} cx={LDOT_X} cy={n.y} r={3.4} fill="#f7f5f2" stroke="rgba(28,22,16,0.32)" strokeWidth={1.3}
            style={{ opacity: reveal ? 1 : 0, animation: anim ? `ahSoft 0.4s ease ${0.85 + i * 0.07}s both` : undefined }} />
        ))}
        {ACTIONS.map((c, i) => (
          <circle key={`ad${i}`} cx={RDOT_X} cy={c.y} r={3.4} fill="#f7f5f2" stroke="rgba(124,58,237,0.55)" strokeWidth={1.3}
            style={{ opacity: reveal ? 1 : 0, animation: anim ? `ahSoft 0.4s ease ${1.9 + i * 0.1}s both` : undefined }} />
        ))}
      </svg>

      {/* ── MOTOR (ren CSS-kule, ingen transform/SVG → alltid rund) ── */}
      <div style={{ ...ov, inset: 0, opacity: reveal ? 1 : 0, animation: anim ? 'ahSoft 1.1s ease 0.8s both' : undefined }}>
        {/* glød / halo (puster via opacity) */}
        <div style={{ ...centeredBox(pX(CX), pY(CY), 33),
          background: 'radial-gradient(circle, rgba(150,90,240,0.30) 0%, rgba(150,90,240,0.10) 42%, rgba(150,90,240,0) 70%)',
          animation: anim ? 'ahHalo 5.5s ease-in-out infinite' : undefined }} />
        {/* ytre ringer (statiske) */}
        <div style={{ ...centeredBox(pX(CX), pY(CY), CORE_D_CQW + 5.6), border: '1px solid rgba(124,58,237,0.12)' }} />
        <div style={{ ...centeredBox(pX(CX), pY(CY), CORE_D_CQW + 2.8), border: '1px solid rgba(124,58,237,0.20)' }} />
        {/* kjernen */}
        <div style={{ ...centeredBox(pX(CX), pY(CY), CORE_D_CQW),
          background: 'radial-gradient(circle at 35% 27%, #f4e6ff 0%, #ddb6ff 22%, #b47cf0 56%, #8a44d6 100%)',
          boxShadow: '0 2.4cqw 5cqw -1.6cqw rgba(118,40,205,0.55), 0 0 4cqw rgba(168,104,244,0.30), inset 0 0.15cqw 0.8cqw rgba(255,255,255,0.5), 0 0 0 1px rgba(255,255,255,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* spekulær glans */}
          <div style={{ position: 'absolute', left: '20%', top: '14%', width: '42%', height: '28%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 70%)' }} />
          {/* sparkle */}
          <Sparkles style={{ width: '5.6cqw', height: '5.6cqw', color: '#fff', filter: 'drop-shadow(0 0.2cqw 0.6cqw rgba(108,28,188,0.5))' }} strokeWidth={1.5} />
        </div>
      </div>

      {/* ── HTML-overlay: tekst + ikoner (posisjon i %, skala i cqw) ── */}
      <div style={{ ...ov, left: 0, width: pX(L_TEXT_R), top: pY(8), textAlign: 'right', paddingRight: '1.1cqw',
        color: MUTED, fontFamily: F, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.34em', fontSize: '0.82cqw',
        animation: anim ? 'ahFade 0.7s ease 0.1s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>Fundament</div>
      <div style={{ ...ov, left: pX(R_TEXT_L - 18), top: pY(8),
        color: MUTED, fontFamily: F, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.34em', fontSize: '0.82cqw',
        animation: anim ? 'ahFade 0.7s ease 1.9s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>Handling</div>

      {FOUND.map((n, i) => (
        <React.Fragment key={n.label}>
          <div style={{ ...ov, left: 0, width: pX(L_TEXT_R), top: pY(n.y), transform: 'translateY(-50%)', textAlign: 'right', paddingRight: '1.15cqw',
            animation: anim ? `ahInL 0.85s cubic-bezier(0.16,1,0.3,1) ${0.15 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
            <div style={{ fontFamily: FH, fontWeight: 700, color: INK, fontSize: '1.32cqw', lineHeight: 1, letterSpacing: '-0.012em' }}>{n.label}</div>
            <div style={{ fontFamily: F, color: MUTED, fontSize: '0.92cqw', lineHeight: 1, marginTop: '0.5cqw' }}>{n.sub}</div>
          </div>
          <div style={{ ...ov, left: pX(L_ICON_X), top: pY(n.y), transform: 'translate(-50%,-50%)',
            animation: anim ? `ahSoft 0.5s ease ${0.45 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
            <n.Icon style={{ width: '1.55cqw', height: '1.55cqw', color: SOFT_INK }} strokeWidth={1.7} />
          </div>
        </React.Fragment>
      ))}

      <div style={{ ...ov, left: pX(CX), top: pY(CY + R + 28), transform: 'translateX(-50%)', textAlign: 'center', width: '20cqw',
        animation: anim ? 'ahSoft 0.8s ease 1.5s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
        <div style={{ fontFamily: FH, fontWeight: 700, color: INK, fontSize: '1.7cqw', letterSpacing: '-0.02em' }}>Autopilot</div>
        <div style={{ fontFamily: F, fontWeight: 700, color: ACCENT, fontSize: '0.8cqw', textTransform: 'uppercase', letterSpacing: '0.28em', marginTop: '0.55cqw' }}>Motoren</div>
      </div>

      {ACTIONS.map((c, i) => (
        <React.Fragment key={c.label}>
          <div style={{ ...ov, left: pX(R_ICON_X), top: pY(c.y), transform: 'translate(-50%,-50%)',
            animation: anim ? `ahInR 0.8s cubic-bezier(0.16,1,0.3,1) ${1.85 + i * 0.1}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
            <c.Icon style={{ width: '1.5cqw', height: '1.5cqw', color: SOFT_INK }} strokeWidth={1.8} />
          </div>
          <div style={{ ...ov, left: pX(R_TEXT_L), top: pY(c.y), transform: 'translateY(-50%)', whiteSpace: 'nowrap',
            fontFamily: FH, fontWeight: 600, color: 'rgba(28,22,16,0.74)', fontSize: '1.3cqw', letterSpacing: '-0.01em',
            animation: anim ? `ahInR 0.8s cubic-bezier(0.16,1,0.3,1) ${1.9 + i * 0.1}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>{c.label}</div>
        </React.Fragment>
      ))}

      <style>{`
        @keyframes ahFade { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ahInL { from { opacity: 0; transform: translate(-14px,-50%); } to { opacity: 1; transform: translate(0,-50%); } }
        @keyframes ahInR { from { opacity: 0; transform: translate(12px,-50%); } to { opacity: 1; transform: translate(0,-50%); } }
        @keyframes ahSoft { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ahHalo { 0%,100% { opacity: 0.72; } 50% { opacity: 1; } }
        @keyframes ahDraw { to { stroke-dashoffset: 0; } }
        @keyframes ahDrift { to { stroke-dashoffset: -160; } }
      `}</style>
    </div>
  );
}
