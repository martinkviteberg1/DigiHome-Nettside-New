'use client';
/**
 * AutopilotArchitecture — kinetisk systemskisse (deck-slide SArkitektur).
 * Fundament → glødende datapakker strømmer kontinuerlig inn i Autopilot-motoren.
 * Motoren pulserer av energi og «dispatcher» handlinger sekvensielt (JS-styrt loop):
 * aktiv handling lyser opp + en utgående lyspakke skytes langs linjen til den.
 *
 * Robusthet: motoren tegnes i EGEN kvadratisk SVG (preserveAspectRatio="xMidYMid meet")
 * → kjernen er matematisk garantert rund uansett container-/GPU-skalering.
 * Bevegelse: SMIL (kontinuerlig) + CSS offset-path (utgående) + CSS reveal.
 * pdfMode = ren statisk komposisjon.
 */
import React, { useEffect, useState } from 'react';
import {
  Building2, FileText, Users, Wallet, FileSignature, Radio,
  Bell, ListChecks,
} from 'lucide-react';

const INK = '#1c1815';
const MUTED = 'rgba(28,22,16,0.40)';
const SOFT_INK = 'rgba(28,22,16,0.48)';
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
const L_TEXT_R = 286;
const L_ICON_X = 300;
const R_ICON_X = 928;
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

/* motor-rom (kvadratisk, viewBox 300, sentrum 150) */
const ORB = 320;
const OC = 160;
const OR = 80;

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

  /* ── dispatch-loop: aktiv handling + puls ── */
  const [activeAct, setActiveAct] = useState(-1);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (!anim) { setActiveAct(-1); setPulseKey(0); return; }
    let idx = -1;
    let interval: ReturnType<typeof setInterval>;
    const fire = () => { idx = (idx + 1) % ACTIONS.length; setActiveAct(idx); setPulseKey((k) => k + 1); };
    const start = setTimeout(() => { fire(); interval = setInterval(fire, 1500); }, 2700);
    return () => { clearTimeout(start); clearInterval(interval); };
  }, [anim]);

  const lit = isPdf ? 0 : activeAct;
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
            animation: anim ? 'arkFade 0.7s ease 2.6s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          Handling
        </div>

        {/* ── linjer + datapakker ── */}
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0" style={{ overflow: 'visible' }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="arkFlowBase" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(28,22,16,0.05)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.28)" />
            </linearGradient>
            <linearGradient id="arkOutBase" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(124,58,237,0.36)" />
              <stop offset="100%" stopColor="rgba(124,58,237,0.07)" />
            </linearGradient>
            <radialGradient id="arkPkt" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="32%" stopColor="#d9b8ff" />
              <stop offset="100%" stopColor="rgba(124,58,237,0)" />
            </radialGradient>
            <filter id="arkGlow" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="2.4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* fundament → motor */}
          {FOUND.map((n, i) => (
            <g key={`f${i}`}>
              <path id={`fp${i}`} d={flowPath(n.y)} fill="none" stroke="url(#arkFlowBase)" strokeWidth={1.3} strokeLinecap="round"
                style={{ strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `arkDraw 0.95s cubic-bezier(0.4,0,0.2,1) ${0.8 + i * 0.06}s forwards` : undefined }} />
              {(anim || isPdf) && (
                <circle r={5.5} fill="url(#arkPkt)" filter="url(#arkGlow)" opacity={isPdf ? 0.9 : 0}>
                  {anim && <>
                    <animateMotion dur="2.8s" begin={`${1.7 + i * 0.16}s`} repeatCount="indefinite" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1">
                      <mpath href={`#fp${i}`} />
                    </animateMotion>
                    <animate attributeName="opacity" dur="2.8s" begin={`${1.7 + i * 0.16}s`} repeatCount="indefinite"
                      values="0;1;1;0.9;0" keyTimes="0;0.08;0.74;0.95;1" />
                  </>}
                </circle>
              )}
            </g>
          ))}

          {/* motor → handling (statiske baner; pakke kjøres via offset-path) */}
          {ACTIONS.map((c, i) => (
            <path key={`ap${i}`} id={`ap${i}`} d={actPath(c.y)} fill="none"
              stroke={lit === i ? 'rgba(124,58,237,0.6)' : 'url(#arkOutBase)'} strokeWidth={lit === i ? 1.9 : 1.4} strokeLinecap="round"
              style={{ transition: 'stroke 0.4s ease, stroke-width 0.4s ease', strokeDasharray: DASH, strokeDashoffset: anim ? DASH : 0, animation: anim ? `arkDraw 0.7s ease ${2.0 + i * 0.12}s forwards` : undefined }} />
          ))}
        </svg>

        {/* utgående lyspakke (CSS offset-path, remountes pr. dispatch) */}
        {anim && lit >= 0 && (
          <div key={`out${pulseKey}`} className="absolute" style={{
            top: 0, left: 0, width: 12, height: 12, marginLeft: -6, marginTop: -6, borderRadius: '50%',
            background: 'radial-gradient(circle, #ffffff 0%, #d9b8ff 38%, rgba(124,58,237,0) 72%)',
            offsetPath: `path('${actPath(ACTIONS[lit].y)}')`, offsetRotate: '0deg',
            animation: 'arkOut 0.78s cubic-bezier(0.4,0,0.2,1) forwards',
            filter: 'drop-shadow(0 0 4px rgba(180,120,255,0.9))',
          } as React.CSSProperties} />
        )}

        {/* ── MOTOR — kvadratisk meet-SVG: alltid rund ── */}
        <div className="absolute" style={{ left: CX - ORB / 2, top: CY - ORB / 2, width: ORB, height: ORB,
          animation: anim ? 'arkCoreIn 1.1s cubic-bezier(0.16,1,0.3,1) 0.85s both' : undefined,
          opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          <svg width={ORB} height={ORB} viewBox={`0 0 ${ORB} ${ORB}`} preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
            <defs>
              <radialGradient id="arkHaloG" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(178,116,255,0.36)" />
                <stop offset="45%" stopColor="rgba(178,116,255,0.13)" />
                <stop offset="100%" stopColor="rgba(178,116,255,0)" />
              </radialGradient>
              <radialGradient id="arkCoreG" cx="38%" cy="30%" r="80%">
                <stop offset="0%" stopColor="#f7ecff" />
                <stop offset="24%" stopColor="#e2c0ff" />
                <stop offset="58%" stopColor="#b079f0" />
                <stop offset="100%" stopColor="#7e39d2" />
              </radialGradient>
              <linearGradient id="arkSweepG" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                <stop offset="55%" stopColor="rgba(220,180,255,0.9)" />
                <stop offset="100%" stopColor="#ffffff" />
              </linearGradient>
              <radialGradient id="arkSpecG" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
              <radialGradient id="arkInnerG" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
                <stop offset="55%" stopColor="rgba(255,255,255,0)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>

            {/* pustende halo */}
            <circle cx={OC} cy={OC} r={OC} fill="url(#arkHaloG)">
              {reveal && <animate attributeName="r" dur="4.4s" repeatCount="indefinite" values={`${OC - 10};${OC};${OC - 10}`} calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
              {reveal && <animate attributeName="opacity" dur="4.4s" repeatCount="indefinite" values="0.7;1;0.7" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
            </circle>

            {/* ripple-pulser */}
            {reveal && [0, 1].map((k) => (
              <circle key={k} cx={OC} cy={OC} r={OR} fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth={1.5}>
                <animate attributeName="r" dur="3.6s" begin={`${k * 1.8}s`} repeatCount="indefinite" values={`${OR};${OR + 56}`} />
                <animate attributeName="opacity" dur="3.6s" begin={`${k * 1.8}s`} repeatCount="indefinite" values="0.55;0" />
                <animate attributeName="stroke-width" dur="3.6s" begin={`${k * 1.8}s`} repeatCount="indefinite" values="1.7;0.2" />
              </circle>
            ))}

            {/* statiske ringer */}
            <circle cx={OC} cy={OC} r={OR + 26} fill="none" stroke="rgba(124,58,237,0.12)" strokeWidth={1} />
            <circle cx={OC} cy={OC} r={OR + 14} fill="none" stroke="rgba(124,58,237,0.18)" strokeWidth={1} />

            {/* roterende energi-sveip */}
            <g>
              {reveal && <animateTransform attributeName="transform" type="rotate" from={`0 ${OC} ${OC}`} to={`360 ${OC} ${OC}`} dur="8s" repeatCount="indefinite" />}
              <circle cx={OC} cy={OC} r={OR + 19} fill="none" stroke="url(#arkSweepG)" strokeWidth={2.6} strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * (OR + 19) * 0.34} ${2 * Math.PI * (OR + 19)}`} />
            </g>
            {/* motroterende prikk-bane */}
            <g>
              {reveal && <animateTransform attributeName="transform" type="rotate" from={`360 ${OC} ${OC}`} to={`0 ${OC} ${OC}`} dur="20s" repeatCount="indefinite" />}
              <circle cx={OC} cy={OC} r={OR + 34} fill="none" stroke="rgba(124,58,237,0.5)" strokeWidth={1.3} strokeLinecap="round" strokeDasharray="1.5 18" />
            </g>

            {/* kjerne */}
            <circle cx={OC} cy={OC} r={OR} fill="url(#arkCoreG)" />
            {/* indre energi-puls */}
            <circle cx={OC} cy={OC} r={OR * 0.74} fill="url(#arkInnerG)">
              {reveal && <animate attributeName="opacity" dur="2.8s" repeatCount="indefinite" values="0.35;0.85;0.35" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
            </circle>
            <circle cx={OC} cy={OC} r={OR} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.3} />
            {/* spekulær glans */}
            <ellipse cx={OC - 24} cy={OC - 32} rx={32} ry={19} fill="url(#arkSpecG)" />

            {/* dispatch-flash (remountes pr. puls) */}
            {anim && (
              <circle key={`flash${pulseKey}`} cx={OC} cy={OC} r={OR} fill="rgba(255,255,255,0.5)"
                style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'arkFlash 0.85s ease-out forwards' }} />
            )}

            {/* sparkle */}
            <g fill="#ffffff" style={{ filter: 'drop-shadow(0 2px 8px rgba(108,28,188,0.55))' }}>
              <path transform={`translate(${OC} ${OC})`}
                d="M0,-23 C2.8,-7.4 7.4,-2.8 23,0 C7.4,2.8 2.8,7.4 0,23 C-2.8,7.4 -7.4,2.8 -23,0 C-7.4,-2.8 -2.8,-7.4 0,-23 Z">
                {reveal && <animateTransform attributeName="transform" type="scale" additive="sum" dur="3.4s" repeatCount="indefinite" values="1;1.09;1" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" />}
              </path>
              <path transform={`translate(${OC + 19} ${OC - 17})`} opacity={0.95}
                d="M0,-7 C0.85,-2.25 2.25,-0.85 7,0 C2.25,0.85 0.85,2.25 0,7 C-0.85,2.25 -2.25,0.85 -7,0 C-2.25,-0.85 -0.85,-2.25 0,-7 Z" />
            </g>
          </svg>
        </div>

        {/* motor-label */}
        <div className="absolute text-center" style={{ left: CX - 120, top: CY + R + 40, width: 240,
          animation: anim ? 'arkFade 0.7s ease 1.7s both' : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
          <p className="text-[20px] font-bold tracking-[-0.02em]" style={{ color: INK, fontFamily: FH }}>Autopilot</p>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] mt-1.5" style={{ color: ACCENT, fontFamily: F }}>Motoren</p>
        </div>

        {/* ── Fundament — tekst + ikon-port ── */}
        {FOUND.map((n, i) => (
          <React.Fragment key={n.label}>
            <div className="absolute" style={{ right: W - L_TEXT_R, top: n.y - 18, width: 246, textAlign: 'right',
              animation: anim ? `arkInL 0.8s cubic-bezier(0.16,1,0.3,1) ${0.2 + i * 0.08}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <p className="text-[15.5px] font-bold leading-none tracking-[-0.012em]" style={{ color: INK, fontFamily: FH }}>{n.label}</p>
              <p className="text-[11px] mt-1.5 leading-none" style={{ color: MUTED, fontFamily: F }}>{n.sub}</p>
            </div>
            <div className="absolute flex items-center justify-center" style={{ left: L_ICON_X - 13, top: n.y - 13, width: 26, height: 26,
              animation: anim ? `arkDot 0.5s ease ${0.45 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <n.Icon className="w-[19px] h-[19px]" strokeWidth={1.7} style={{ color: SOFT_INK }} />
            </div>
            <span className="absolute rounded-full" style={{ left: LDOT_X - 4, top: n.y - 4, width: 8, height: 8,
              background: '#fff', border: `1.5px solid ${ACCENT}`,
              animation: anim ? `arkDot 0.4s ease ${0.55 + i * 0.08}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }} />
          </React.Fragment>
        ))}

        {/* ── Handling — port + ikon + tekst (lyser opp ved dispatch) ── */}
        {ACTIONS.map((c, i) => {
          const on = lit === i;
          return (
          <React.Fragment key={c.label}>
            <span className="absolute rounded-full" style={{ left: RDOT_X - 5, top: c.y - 5, width: 10, height: 10,
              background: on ? ACCENT : '#fff', border: `1.5px solid ${ACCENT}`,
              boxShadow: on ? '0 0 0 4px rgba(124,58,237,0.16)' : 'none', transition: 'background 0.35s ease, box-shadow 0.35s ease',
              animation: anim ? `arkDot 0.4s ease ${2.3 + i * 0.12}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }} />
            <div className="absolute flex items-center justify-center" style={{ left: R_ICON_X - 13, top: c.y - 13, width: 26, height: 26,
              transform: on ? 'scale(1.12)' : 'scale(1)', transition: 'transform 0.35s cubic-bezier(0.16,1,0.3,1)',
              animation: anim ? `arkInR 0.7s cubic-bezier(0.16,1,0.3,1) ${2.4 + i * 0.12}s both` : undefined, opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <c.Icon className="w-[17px] h-[17px]" strokeWidth={1.9}
                style={{ color: ACCENT, filter: on ? 'drop-shadow(0 0 6px rgba(124,58,237,0.6))' : 'none', transition: 'filter 0.35s ease' }} />
            </div>
            <div className="absolute flex items-center" style={{ left: R_TEXT_L, top: c.y - 11, height: 22,
              transform: on ? 'translateX(3px)' : 'translateX(0)', transition: 'transform 0.4s cubic-bezier(0.16,1,0.3,1)',
              animation: anim ? `arkInR 0.7s cubic-bezier(0.16,1,0.3,1) ${2.45 + i * 0.12}s both` : undefined,
              opacity: anim ? undefined : (reveal ? 1 : 0) }}>
              <span className="text-[15.5px] font-semibold tracking-[-0.01em] whitespace-nowrap"
                style={{ color: on ? INK : 'rgba(28,22,16,0.62)', transition: 'color 0.4s ease', fontFamily: FH }}>{c.label}</span>
            </div>
          </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes arkFade { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes arkInL { from { opacity: 0; transform: translateX(-16px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes arkInR { from { opacity: 0; transform: translateX(14px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes arkDot { from { opacity: 0; transform: scale(0); } to { opacity: 1; transform: scale(1); } }
        @keyframes arkCoreIn { from { opacity: 0; transform: scale(0.58); } to { opacity: 1; transform: scale(1); } }
        @keyframes arkDraw { to { stroke-dashoffset: 0; } }
        @keyframes arkFlash { 0% { opacity: 0.5; transform: scale(0.92); } 100% { opacity: 0; transform: scale(1.14); } }
        @keyframes arkOut {
          0% { offset-distance: 0%; opacity: 0; }
          14% { opacity: 1; }
          80% { opacity: 1; }
          100% { offset-distance: 100%; opacity: 0.15; }
        }
      `}</style>
    </div>
  );
}
