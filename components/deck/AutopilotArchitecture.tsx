'use client';
/**
 * AutopilotArchitecture — editorial systemskisse (deck-slide SArkitektur).
 * Datamodellen (fundament) strømmer inn i Autopilot-kjernen → handlinger ut.
 * Rent typografisk, ingen bokser. Kjernen er en ekte HTML-sirkel (garantert rund,
 * uavhengig av skalering). CSS-drevet reveal. pdfMode = statisk sluttbilde.
 */
import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';

const INK = '#1c1815';
const MUTED = 'rgba(28,22,16,0.40)';
const FAINT = 'rgba(28,22,16,0.78)';
const ACCENT = '#7c3aed';
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif";

/* ── geometri (skalert koordinatrom) ── */
const W = 1240;
const H = 524;
const CX = 620;     // kjerne senter x
const CY = 262;     // kjerne senter y
const R = 88;       // kjerne radius

const LDOT_X = 332; // venstre node-punkt (linjestart)
const RDOT_X = 908; // høyre node-punkt (linjestart)
const L_TEXT_R = 316;
const R_TEXT_L = 924;

const FOUND = [
  { label: 'Eiendommer', sub: 'Bygg · Enheter', y: 52 },
  { label: 'Leieforhold', sub: 'Aktive boforhold', y: 138 },
  { label: 'Personer', sub: 'Huseiere · Leietakere', y: 224 },
  { label: 'Økonomi', sub: 'Leie · Depositum', y: 310 },
  { label: 'Dokumenter', sub: 'Kontrakter · Vedlegg', y: 396 },
  { label: 'Kanaler', sub: 'FINN · Airbnb', y: 482 },
];

const ACTIONS = [
  { label: 'Lag leiekontrakt', y: 118 },
  { label: 'Send påminnelse', y: 214 },
  { label: 'Krev inn depositum', y: 310 },
  { label: 'Foreslå neste steg', y: 406 },
];

const flowPath = (y: number) =>
  `M ${LDOT_X},${y} C ${LDOT_X + 150},${y} ${CX - 220},${CY} ${CX - R - 4},${CY}`;
const actPath = (y: number) =>
  `M ${CX + R + 4},${CY} C ${CX + 170},${CY} ${RDOT_X - 110},${y} ${RDOT_X},${y}`;

export default function AutopilotArchitecture({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const isPdf = !!pdfMode;
  const reveal = active || isPdf;
  const anim = !!active && !isPdf;

  const [scale, setScale] = useState(isPdf ? 0.92 : 0.74);
  useEffect(() => {
    if (isPdf) { setScale(0.92); return; }
    const upd = () => {
      const availH = window.innerHeight - 248;
      const availW = window.innerWidth - 112;
      setScale(Math.max(0.46, Math.min(availH / H, availW / W, 1)));
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [isPdf]);

  const DASH = 760;

  return (
    <div className="relative mx-auto" style={{ width: W * scale, height: H * scale }}>
      <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>

        {/* zone-etiketter */}
        <div className="absolute text-[10px] font-bold uppercase tracking-[0.34em]"
          style={{ right: W - L_TEXT_R, top: 0, color: MUTED, fontFamily: F, textAlign: 'right',
            animation: anim ? 'arkFade 0.7s ease 0.15s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          Fundament
        </div>
        <div className="absolute text-[10px] font-bold uppercase tracking-[0.34em]"
          style={{ left: R_TEXT_L, top: 0, color: MUTED, fontFamily: F,
            animation: anim ? 'arkFade 0.7s ease 2.4s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          Handling
        </div>

        {/* ── SVG: kun strømlinjer (paths skaleres trygt) ── */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" style={{ overflow: 'visible' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="arkFlowBase" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(28,22,16,0.04)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.22)" />
            </linearGradient>
            <linearGradient id="arkOutBase" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(124,58,237,0.30)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.08)" />
            </linearGradient>
          </defs>

          {/* fundament → kjerne */}
          {FOUND.map((n, i) => (
            <g key={`f${i}`}>
              <path d={flowPath(n.y)} fill="none" stroke="url(#arkFlowBase)" strokeWidth={1.25} strokeLinecap="round"
                style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `arkDraw 0.95s cubic-bezier(0.4,0,0.2,1) ${0.85 + i * 0.07}s forwards` : undefined }} />
              <path d={flowPath(n.y)} fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round"
                style={{ strokeDasharray: '1.5 14', opacity: reveal ? 0.5 : 0,
                  animation: anim ? `arkFlow 1.7s linear ${1.7 + i * 0.07}s infinite, arkFade 0.6s ease ${1.7 + i * 0.07}s both` : (isPdf ? 'arkFlow 1.7s linear infinite' : undefined) }} />
            </g>
          ))}

          {/* kjerne → handling */}
          {ACTIONS.map((c, i) => (
            <path key={`a${i}`} d={actPath(c.y)} fill="none" stroke="url(#arkOutBase)" strokeWidth={1.4} strokeLinecap="round"
              style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `arkDraw 0.7s ease ${2.0 + i * 0.12}s forwards` : undefined }} />
          ))}
        </svg>

        {/* ── KJERNE (ekte HTML-sirkel) ── */}
        <div className="absolute" style={{ left: CX - 175, top: CY - 175, width: 350, height: 350,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: anim ? 'arkCoreIn 1s cubic-bezier(0.16,1,0.3,1) 0.95s both' : undefined,
          opacity: anim ? undefined : (reveal ? 1 : 0) }}>

          {/* halo (puster) */}
          <div className="absolute" style={{ width: 350, height: 350, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,120,255,0.34) 0%, rgba(180,120,255,0.10) 42%, transparent 70%)',
            animation: reveal ? 'arkHalo 4s ease-in-out infinite' : undefined }} />

          {/* statiske ringer */}
          <div className="absolute" style={{ width: 2 * R + 56, height: 2 * R + 56, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.12)' }} />
          <div className="absolute" style={{ width: 2 * R + 28, height: 2 * R + 28, borderRadius: '50%', border: '1px solid rgba(124,58,237,0.18)' }} />

          {/* roterende stiplet bane (kvadratisk SVG → alltid rund) */}
          <svg className="absolute" width={2 * R + 40} height={2 * R + 40} viewBox={`0 0 ${2 * R + 40} ${2 * R + 40}`}
            style={{ animation: reveal ? 'arkSpin 16s linear infinite' : undefined }}>
            <circle cx={R + 20} cy={R + 20} r={R + 18} fill="none" stroke="rgba(124,58,237,0.45)" strokeWidth={1.4} strokeLinecap="round" strokeDasharray="1.5 20" />
          </svg>

          {/* hovedkjerne */}
          <div className="absolute" style={{ width: 2 * R, height: 2 * R, borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 30%, #f3e2ff 0%, #dcb4ff 26%, #b079f0 60%, #8a44d6 100%)',
            boxShadow: '0 24px 60px -18px rgba(120,40,200,0.55), inset 0 2px 8px rgba(255,255,255,0.45), 0 0 0 1px rgba(255,255,255,0.5)' }}>
            {/* spekulær glans */}
            <div className="absolute" style={{ left: '22%', top: '16%', width: '40%', height: '26%', borderRadius: '50%',
              background: 'rgba(255,255,255,0.5)', filter: 'blur(9px)' }} />
            {/* sparkle */}
            <div className="absolute inset-0 flex items-center justify-center"
              style={{ animation: anim ? 'arkFade 0.6s ease 1.6s both' : undefined, opacity: anim ? undefined : 1 }}>
              <Sparkles className="w-11 h-11" strokeWidth={1.5} style={{ color: '#fff', filter: 'drop-shadow(0 2px 8px rgba(110,30,190,0.5))' }} />
            </div>
          </div>
        </div>

        {/* kjerne-label */}
        <div className="absolute text-center" style={{ left: CX - 120, top: CY + R + 30, width: 240,
          animation: anim ? 'arkFade 0.7s ease 1.8s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          <p className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Autopilot</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mt-1.5" style={{ color: ACCENT, fontFamily: F }}>Motoren</p>
        </div>

        {/* ── Fundament — typografiske rader, høyrejustert mot kjernen ── */}
        {FOUND.map((n, i) => (
          <React.Fragment key={n.label}>
            <div className="absolute" style={{ right: W - L_TEXT_R, top: n.y - 19, width: 280, textAlign: 'right',
              animation: anim ? `arkInL 0.8s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.08}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <p className="text-[16px] font-bold leading-none tracking-[-0.012em]" style={{ color: INK, fontFamily: FH }}>{n.label}</p>
              <p className="text-[11.5px] mt-1.5 leading-none" style={{ color: MUTED, fontFamily: F }}>{n.sub}</p>
            </div>
            {/* node-dot */}
            <span className="absolute rounded-full" style={{ left: LDOT_X - 4, top: n.y - 4, width: 8, height: 8,
              background: '#fff', border: `1.5px solid ${ACCENT}`,
              animation: anim ? `arkDot 0.4s ease ${0.55 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }} />
          </React.Fragment>
        ))}

        {/* ── Handling — typografiske rader, venstrejustert ── */}
        {ACTIONS.map((c, i) => (
          <React.Fragment key={c.label}>
            <span className="absolute rounded-full" style={{ left: RDOT_X - 4, top: c.y - 4, width: 8, height: 8,
              background: '#fff', border: `1.5px solid ${ACCENT}`,
              animation: anim ? `arkDot 0.4s ease ${2.2 + i * 0.12}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }} />
            <div className="absolute flex items-center" style={{ left: R_TEXT_L, top: c.y - 11, height: 22,
              animation: anim ? `arkInR 0.7s cubic-bezier(0.16,1,0.3,1) ${2.3 + i * 0.12}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <span className="text-[15.5px] font-semibold tracking-[-0.01em] whitespace-nowrap" style={{ color: FAINT, fontFamily: FH }}>{c.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <style>{`
        @keyframes arkFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes arkInL { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes arkInR { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes arkDot { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes arkCoreIn { from { opacity: 0; transform: scale(0.62); } to { opacity: 1; transform: scale(1); } }
        @keyframes arkDraw { to { stroke-dashoffset: 0; } }
        @keyframes arkFlow { to { stroke-dashoffset: -180; } }
        @keyframes arkHalo { 0%,100% { opacity: 0.72; transform: scale(1); } 50% { opacity: 1; transform: scale(1.06); } }
        @keyframes arkSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
