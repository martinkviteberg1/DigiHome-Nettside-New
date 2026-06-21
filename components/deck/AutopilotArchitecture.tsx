'use client';
/**
 * AutopilotArchitecture — kinetisk systemskisse (deck-slide SArkitektur).
 * Datamodellen (fundament) → glødende datapakker strømmer inn i Autopilot-motoren → handlinger ut.
 *
 * Robusthet: motoren tegnes i en EGEN kvadratisk SVG med preserveAspectRatio="xMidYMid meet".
 * Da er kjernen matematisk garantert rund — uavhengig av container-/GPU-skalering.
 * Bevegelse via SMIL (animateMotion + animateTransform) → spilles også i skjermbilder.
 * pdfMode = ren statisk komposisjon (ingen SMIL).
 */
import React, { useEffect, useState } from 'react';
import {
  Building2, FileText, Users, Wallet, FileSignature, Radio,
  Sparkles, Bell, ListChecks,
} from 'lucide-react';

const INK = '#1c1815';
const MUTED = 'rgba(28,22,16,0.40)';
const SOFT_INK = 'rgba(28,22,16,0.50)';
const ACT = 'rgba(28,22,16,0.82)';
const ACCENT = '#7c3aed';
const FH = "var(--font-heading), 'PP Right Grotesk', -apple-system, BlinkMacSystemFont, sans-serif";
const F = "var(--font-body), 'ABC Diatype', -apple-system, BlinkMacSystemFont, sans-serif";

/* ── geometri (uniformt skalert koordinatrom) ── */
const W = 1240;
const H = 552;
const CX = 620;
const CY = 276;
const R = 92;

const LDOT_X = 332;
const RDOT_X = 908;
const L_TEXT_R = 286;   // høyre kant tekst (fundament)
const L_ICON_X = 300;   // ikon-senter (fundament)
const R_ICON_X = 928;   // ikon-senter (handling)
const R_TEXT_L = 948;

const FOUND = [
  { label: 'Eiendommer', sub: 'Bygg · Enheter', Icon: Building2, y: 56 },
  { label: 'Leieforhold', sub: 'Aktive boforhold', Icon: FileText, y: 144 },
  { label: 'Personer', sub: 'Huseiere · Leietakere', Icon: Users, y: 232 },
  { label: 'Økonomi', sub: 'Leie · Depositum', Icon: Wallet, y: 320 },
  { label: 'Dokumenter', sub: 'Kontrakter · Vedlegg', Icon: FileSignature, y: 408 },
  { label: 'Kanaler', sub: 'FINN · Airbnb', Icon: Radio, y: 496 },
];

const ACTIONS = [
  { label: 'Lag leiekontrakt', Icon: FileSignature, y: 138 },
  { label: 'Send påminnelse', Icon: Bell, y: 230 },
  { label: 'Krev inn depositum', Icon: Wallet, y: 322 },
  { label: 'Foreslå neste steg', Icon: ListChecks, y: 414 },
];

const flowPath = (y: number) =>
  `M ${LDOT_X},${y} C ${LDOT_X + 158},${y} ${CX - 214},${CY} ${CX - R - 2},${CY}`;
const actPath = (y: number) =>
  `M ${CX + R + 2},${CY} C ${CX + 168},${CY} ${RDOT_X - 112},${y} ${RDOT_X},${y}`;

/* ── motor: egen kvadratisk SVG, viewBox 0 0 300 300, sentrum 150,150 ── */
const ORB = 300;
const OC = 150;
const OR = 78;          // kjerne-radius i orb-rommet

export default function AutopilotArchitecture({ active, pdfMode }: { active?: boolean; pdfMode?: boolean }) {
  const isPdf = !!pdfMode;
  const reveal = active || isPdf;
  const anim = !!active && !isPdf;

  const [scale, setScale] = useState(isPdf ? 0.92 : 0.74);
  useEffect(() => {
    if (isPdf) { setScale(0.92); return; }
    const upd = () => {
      const availH = window.innerHeight - 246;
      const availW = window.innerWidth - 112;
      setScale(Math.max(0.46, Math.min(availH / H, availW / W, 1)));
    };
    upd();
    window.addEventListener('resize', upd);
    return () => window.removeEventListener('resize', upd);
  }, [isPdf]);

  const DASH = 780;

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
          style={{ left: R_TEXT_L - 20, top: 0, color: MUTED, fontFamily: F,
            animation: anim ? 'arkFade 0.7s ease 2.5s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          Handling
        </div>

        {/* ── linjer + datapakker (paths tåler rommet) ── */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" style={{ overflow: 'visible' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="arkFlowBase" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(28,22,16,0.05)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.26)" />
            </linearGradient>
            <linearGradient id="arkOutBase" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(124,58,237,0.34)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.08)" />
            </linearGradient>
            <radialGradient id="arkPkt" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="35%" stopColor="#c9a4ff" />
              <stop offset="100%" stopColor="rgba(124,58,237,0)" />
            </radialGradient>
          </defs>

          {/* fundament → motor */}
          {FOUND.map((n, i) => (
            <g key={`f${i}`}>
              <path id={`fp${i}`} d={flowPath(n.y)} fill="none" stroke="url(#arkFlowBase)" strokeWidth={1.3} strokeLinecap="round"
                style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `arkDraw 0.95s cubic-bezier(0.4,0,0.2,1) ${0.8 + i * 0.06}s forwards` : undefined }} />
              {(anim || isPdf) && (
                <circle r={7} fill="url(#arkPkt)" opacity={isPdf ? 0.9 : 0}>
                  {anim && <>
                    <animateMotion dur="2.6s" begin={`${1.7 + i * 0.18}s`} repeatCount="indefinite" calcMode="linear">
                      <mpath href={`#fp${i}`} />
                    </animateMotion>
                    <animate attributeName="opacity" dur="2.6s" begin={`${1.7 + i * 0.18}s`} repeatCount="indefinite"
                      values="0;1;1;0.85;0" keyTimes="0;0.08;0.72;0.94;1" />
                  </>}
                </circle>
              )}
            </g>
          ))}

          {/* motor → handling */}
          {ACTIONS.map((c, i) => (
            <g key={`a${i}`}>
              <path id={`ap${i}`} d={actPath(c.y)} fill="none" stroke="url(#arkOutBase)" strokeWidth={1.5} strokeLinecap="round"
                style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `arkDraw 0.7s ease ${2.0 + i * 0.12}s forwards` : undefined }} />
              {anim && (
                <circle r={6} fill="url(#arkPkt)" opacity={0}>
                  <animateMotion dur="3.2s" begin={`${3.0 + i * 0.8}s`} repeatCount="indefinite" calcMode="linear">
                    <mpath href={`#ap${i}`} />
                  </animateMotion>
                  <animate attributeName="opacity" dur="3.2s" begin={`${3.0 + i * 0.8}s`} repeatCount="indefinite"
                    values="0;1;1;0;0;0;0;0;0;0" keyTimes="0;0.04;0.22;0.3;0.4;0.5;0.6;0.7;0.85;1" />
                </circle>
              )}
            </g>
          ))}
        </svg>

        {/* ── MOTOR — kvadratisk meet-SVG: alltid rund ── */}
        <div className="absolute" style={{ left: CX - ORB / 2, top: CY - ORB / 2, width: ORB, height: ORB,
          animation: anim ? 'arkCoreIn 1s cubic-bezier(0.16,1,0.3,1) 0.9s both' : undefined,
          opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          <svg width={ORB} height={ORB} viewBox={`0 0 ${ORB} ${ORB}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
            <defs>
              <radialGradient id="arkHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(178,116,255,0.34)" />
                <stop offset="45%" stopColor="rgba(178,116,255,0.12)" />
                <stop offset="100%" stopColor="rgba(178,116,255,0)" />
              </radialGradient>
              <radialGradient id="arkCore" cx="38%" cy="30%" r="78%">
                <stop offset="0%" stopColor="#f6e9ff" />
                <stop offset="26%" stopColor="#e0bcff" />
                <stop offset="60%" stopColor="#b079f0" />
                <stop offset="100%" stopColor="#8540d6" />
              </radialGradient>
              <linearGradient id="arkSweep" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="55%" stopColor="rgba(214,170,255,0.85)" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <radialGradient id="arkSpec" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.75)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            {/* pustende halo */}
            <circle cx={OC} cy={OC} r={OC} fill="url(#arkHalo)">
              {reveal && <animate attributeName="r" dur="4.2s" repeatCount="indefinite" values={`${OC - 8};${OC};${OC - 8}`} calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
              {reveal && <animate attributeName="opacity" dur="4.2s" repeatCount="indefinite" values="0.7;1;0.7" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
            </circle>

            {/* ripple-pulser */}
            {reveal && [0, 1].map((k) => (
              <circle key={k} cx={OC} cy={OC} r={OR} fill="none" stroke="rgba(124,58,237,0.45)" strokeWidth={1.4}>
                <animate attributeName="r" dur="3.4s" begin={`${k * 1.7}s`} repeatCount="indefinite" values={`${OR};${OR + 52}`} />
                <animate attributeName="opacity" dur="3.4s" begin={`${k * 1.7}s`} repeatCount="indefinite" values="0.5;0" />
                <animate attributeName="stroke-width" dur="3.4s" begin={`${k * 1.7}s`} repeatCount="indefinite" values="1.6;0.2" />
              </circle>
            ))}

            {/* statiske ringer */}
            <circle cx={OC} cy={OC} r={OR + 26} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth={1} />
            <circle cx={OC} cy={OC} r={OR + 14} fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth={1} />

            {/* roterende energi-sveip (gradient-bue) */}
            <g>
              {reveal && <animateTransform attributeName="transform" type="rotate" from={`0 ${OC} ${OC}`} to={`360 ${OC} ${OC}`} dur="9s" repeatCount="indefinite" />}
              <circle cx={OC} cy={OC} r={OR + 19} fill="none" stroke="url(#arkSweep)" strokeWidth={2.4} strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * (OR + 19) * 0.32} ${2 * Math.PI * (OR + 19)}`} />
            </g>
            {/* roterende prikk-bane motsatt vei */}
            <g>
              {reveal && <animateTransform attributeName="transform" type="rotate" from={`360 ${OC} ${OC}`} to={`0 ${OC} ${OC}`} dur="22s" repeatCount="indefinite" />}
              <circle cx={OC} cy={OC} r={OR + 33} fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth={1.3} strokeLinecap="round" strokeDasharray="1.5 17" />
            </g>

            {/* kjerne */}
            <circle cx={OC} cy={OC} r={OR} fill="url(#arkCore)" />
            <circle cx={OC} cy={OC} r={OR} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.3} />
            {/* spekulær glans */}
            <ellipse cx={OC - 22} cy={OC - 30} rx={30} ry={18} fill="url(#arkSpec)" />

            {/* sparkle (tegnet i SVG → del av motoren) */}
            <g transform={`translate(${OC} ${OC}) scale(1.05)`} stroke="#ffffff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none"
              style={{ filter: 'drop-shadow(0 2px 7px rgba(110,30,190,0.5))' }}>
              <path d="M0,-22 C2,-7 7,-2 22,0 C7,2 2,7 0,22 C-2,7 -7,2 -22,0 C-7,-2 -2,-7 0,-22 Z" fill="#ffffff" stroke="none">
                {reveal && <animateTransform attributeName="transform" type="scale" dur="3.6s" repeatCount="indefinite" values="1;1.08;1" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" additive="sum" />}
              </path>
              <path d="M15,-15 l1.4,4.2 l4.2,1.4 l-4.2,1.4 l-1.4,4.2 l-1.4,-4.2 l-4.2,-1.4 l4.2,-1.4 Z" fill="#ffffff" stroke="none" opacity={0.95} transform="translate(7 -6) scale(0.7)" />
            </g>
          </svg>
        </div>

        {/* motor-label */}
        <div className="absolute text-center" style={{ left: CX - 120, top: CY + R + 36, width: 240,
          animation: anim ? 'arkFade 0.7s ease 1.7s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          <p className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Autopilot</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mt-1.5" style={{ color: ACCENT, fontFamily: F }}>Motoren</p>
        </div>

        {/* ── Fundament — tekst + ikon-port, høyrejustert ── */}
        {FOUND.map((n, i) => (
          <React.Fragment key={n.label}>
            <div className="absolute" style={{ right: W - L_TEXT_R, top: n.y - 18, width: 246, textAlign: 'right',
              animation: anim ? `arkInL 0.8s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.08}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <p className="text-[15.5px] font-bold leading-none tracking-[-0.012em]" style={{ color: INK, fontFamily: FH }}>{n.label}</p>
              <p className="text-[11px] mt-1.5 leading-none" style={{ color: MUTED, fontFamily: F }}>{n.sub}</p>
            </div>
            {/* ikon-port */}
            <div className="absolute flex items-center justify-center" style={{ left: L_ICON_X - 13, top: n.y - 13, width: 26, height: 26,
              animation: anim ? `arkDot 0.5s ease ${0.45 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <n.Icon className="w-[19px] h-[19px]" strokeWidth={1.7} style={{ color: SOFT_INK }} />
            </div>
            <span className="absolute rounded-full" style={{ left: LDOT_X - 4, top: n.y - 4, width: 8, height: 8,
              background: '#fff', border: `1.5px solid ${ACCENT}`,
              animation: anim ? `arkDot 0.4s ease ${0.55 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }} />
          </React.Fragment>
        ))}

        {/* ── Handling — port + ikon + tekst, venstrejustert ── */}
        {ACTIONS.map((c, i) => (
          <React.Fragment key={c.label}>
            <span className="absolute rounded-full" style={{ left: RDOT_X - 4, top: c.y - 4, width: 8, height: 8,
              background: '#fff', border: `1.5px solid ${ACCENT}`,
              animation: anim ? `arkDot 0.4s ease ${2.3 + i * 0.12}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }} />
            <div className="absolute flex items-center justify-center" style={{ left: R_ICON_X - 13, top: c.y - 13, width: 26, height: 26,
              animation: anim ? `arkInR 0.7s cubic-bezier(0.16,1,0.3,1) ${2.4 + i * 0.12}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <c.Icon className="w-[17px] h-[17px]" strokeWidth={1.9} style={{ color: ACCENT }} />
            </div>
            <div className="absolute flex items-center" style={{ left: R_TEXT_L, top: c.y - 11, height: 22,
              animation: anim ? `arkInR 0.7s cubic-bezier(0.16,1,0.3,1) ${2.45 + i * 0.12}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <span className="text-[15.5px] font-semibold tracking-[-0.01em] whitespace-nowrap" style={{ color: ACT, fontFamily: FH }}>{c.label}</span>
            </div>
          </React.Fragment>
        ))}
      </div>

      <style>{`
        @keyframes arkFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes arkInL { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes arkInR { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes arkDot { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes arkCoreIn { from { opacity: 0; transform: scale(0.6); } to { opacity: 1; transform: scale(1); } }
        @keyframes arkDraw { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}
