'use client';

/*
  ChapterScenes — fire kinematiske scener for «Autopiloten i praksis».
  DAG-MODUS med Apple-nivå bevegelsesspråk:
  - Fjær-fysikk (spring) på alle entréer, med overshoot og settle
  - Levende idle: alt bobber og puster subtilt, ingenting er dødt
  - Kontinuitet og dybde: elementer trekker bakover, lysende ledepunkter
  - Fysisk respons: skjoldet dyttes av treff, kortene «legges på bordet»
  Koordinatsystem: 100 x 76 enheter (--u = 1 % av scenens bredde).
*/

import {
  Eye, Sparkles, Droplets, CalendarRange, BellRing, MessageCircle, Wrench,
} from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack } from '@/components/video/filmUtils';

const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;

const INK = '#0A0A0A';

/* fjær: rask inn, ~8 % overshoot, myk settle */
const spring = (p) => (p <= 0 ? 0 : p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(7.5 * p));
const sp = (t, a, b) => spring(seg(t, a, b));
/* idle-flyt: kontinuerlig, subtil pust */
const fl = (t, seed, amp = 0.25) => Math.sin(t * 1.15 + seed) * amp;

/* lagdelt skygge: kontakt + ambient — elementene «svever» */
const CARD_SHADOW = '0 1px 2px rgba(22,19,28,0.06), 0 12px 32px rgba(22,19,28,0.10), 0 30px 64px rgba(22,19,28,0.05)';
const cardStyle = () => ({
  background: '#FFFFFF',
  border: '1px solid rgba(10,10,10,0.08)',
  boxShadow: CARD_SHADOW,
});

/* kubisk bezier-sampling — for lysende ledepunkter */
const bez = (segs, p) => {
  const gp = clamp01(p) * segs.length * 0.99999;
  const i = Math.min(Math.floor(gp), segs.length - 1);
  const lt = gp - i;
  const [x0, y0, x1, y1, x2, y2, x3, y3] = segs[i];
  const mt = 1 - lt;
  return [
    mt * mt * mt * x0 + 3 * mt * mt * lt * x1 + 3 * mt * lt * lt * x2 + lt * lt * lt * x3,
    mt * mt * mt * y0 + 3 * mt * mt * lt * y1 + 3 * mt * lt * lt * y2 + lt * lt * lt * y3,
  ];
};

const fmt = (v) => {
  const s = String(Math.round(v));
  return s.length > 3 ? `${s.slice(0, -3)} ${s.slice(-3)}` : s;
};

function Tick({ size = 3, pop = 1 }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: u(size), height: u(size), borderRadius: '50%',
        background: '#E8F4EE', border: '1px solid rgba(24,121,78,0.35)',
        boxShadow: `0 ${u(0.4)} ${u(1.2)} rgba(24,121,78,0.16)`,
        transform: `scale(${Math.max(0.3, Math.min(pop, 1.1)).toFixed(2)})`,
      }}
    >
      <span style={{ color: '#18794E', fontWeight: 700, fontSize: u(size * 0.56), lineHeight: 1 }}>✓</span>
    </span>
  );
}

/* Felles rituale: hvert kapittel kvitterer med målbart resultat.
   Tall teller seg opp — tabulære sifre, ingen hopping. */
function Stinger({ t, at, label, value, countTo, suffix = '', sub, valueSize = 5.4 }) {
  const lineP = easeInOutCubic(seg(t, at, at + 0.45));
  if (lineP <= 0.004) return null;
  const labelP = easeOutCubic(seg(t, at + 0.15, at + 0.7));
  const valP = easeOutCubic(seg(t, at + 0.4, at + 1.0));
  const countP = easeOutCubic(seg(t, at + 0.4, at + 1.2));
  const check = sp(t, at + 1.15, at + 1.6);
  const subP = easeOutCubic(seg(t, at + 1.35, at + 1.85));
  const bloom = Math.sin(clamp01(seg(t, at + 0.9, at + 2.0)) * Math.PI);
  const shown = countTo != null ? `${fmt(countTo * countP)}${suffix}` : value;
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(56) }}>
      <span
        style={{
          width: u(26 * lineP), height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(10,10,10,0.25), transparent)',
        }}
      />
      {labelP > 0.01 && (
        <p
          className="font-body uppercase"
          style={{
            fontSize: u(1.7),
            letterSpacing: `${(0.6 - 0.22 * labelP).toFixed(3)}em`,
            color: 'rgba(10,10,10,0.40)',
            marginTop: u(1.8), opacity: labelP.toFixed(2), transform: `translateY(${u((1 - labelP) * 1.4)})`,
          }}
        >
          {label}
        </p>
      )}
      {valP > 0.01 && (
        <div className="relative flex items-center" style={{ gap: u(1.7), marginTop: u(0.9) }}>
          <span
            className="absolute pointer-events-none"
            style={{
              inset: u(-6),
              background: 'radial-gradient(ellipse 62% 62% at 50% 50%, rgba(24,121,78,0.07), rgba(155,91,214,0.03) 48%, transparent 72%)',
              opacity: bloom.toFixed(2),
            }}
          />
          <span
            className="relative font-heading font-bold"
            style={{
              fontSize: u(valueSize), color: INK, whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.01em',
              opacity: valP.toFixed(2),
              transform: `translateY(${u((1 - valP) * 2)})`,
            }}
          >
            {shown}
          </span>
          {check > 0.01 && <Tick size={3.4} pop={check} />}
        </div>
      )}
      {subP > 0.01 && (
        <p className="font-body" style={{ fontSize: u(1.95), color: 'rgba(10,10,10,0.48)', marginTop: u(1.2), opacity: subP.toFixed(2) }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ============================================================
   KAPITTEL 1 — DAG 1 · ANNONSEN SKRIVER SEG SELV
   ============================================================ */
const AD_TITLE = 'Lys 3-roms ved Møhlenpris';
const AD_PHOTOS = ['/interior-living.webp', '/interior-kitchen.webp', '/interior-bedroom.webp'];
const AD_CHIPS = [
  { label: 'Finn.no', y: 17 },
  { label: 'Airbnb', y: 29 },
  { label: 'Hybel.no', y: 41 },
];
const chipAt = (i) => 4.9 + i * 0.7;

export function SceneAnnonse({ t }) {
  const panelIn = sp(t, 0.15, 0.95);
  const aiIn = easeOutCubic(seg(t, 1.6, 2.0)) * (1 - easeInOutCubic(seg(t, 4.2, 4.6)));
  const chars = Math.floor(seg(t, 1.9, 3.4) * AD_TITLE.length);
  const caretOn = t > 1.8 && t < 3.7 && Math.sin(t * 9) > -0.2;
  const metaP = easeOutCubic(seg(t, 3.5, 3.95));
  const views = Math.round(38 * easeOutCubic(seg(t, 6.7, 7.8)));
  const viewsIn = sp(t, 6.6, 7.15);
  /* panelet gjør et lite «send»-puls når hver chip publiseres */
  let sendPulse = 0;
  AD_CHIPS.forEach((c, i) => {
    sendPulse = Math.max(sendPulse, Math.sin(clamp01(seg(t, chipAt(i) + 0.35, chipAt(i) + 0.75)) * Math.PI));
  });

  return (
    <div className="absolute inset-0">
      {/* dokumentpanelet */}
      <div
        className="absolute"
        style={{
          left: u(8), top: u(8), width: u(52),
          borderRadius: u(2.4), padding: u(3),
          ...cardStyle(),
          opacity: Math.min(panelIn * 1.6, 1).toFixed(2),
          transform: `translateY(${u((1 - panelIn) * 6 + fl(t, 0, 0.18))}) scale(${(0.96 + 0.04 * panelIn + 0.012 * sendPulse).toFixed(4)})`,
        }}
      >
        {/* fotostripe — bildene «legges på bordet» med fjær og sheen */}
        <div className="flex" style={{ gap: u(1.4) }}>
          {AD_PHOTOS.map((src, i) => {
            const p = sp(t, 0.6 + i * 0.32, 1.5 + i * 0.32);
            const rot = (1 - Math.min(p, 1)) * (i === 1 ? 6 : -5 - i * 2);
            const sheen = seg(t, 1.75 + i * 0.32, 2.45 + i * 0.32);
            return (
              <div
                key={src}
                className="relative overflow-hidden"
                style={{
                  width: u(14.4), height: u(10.5), borderRadius: u(1.2),
                  opacity: Math.min(p * 1.6, 1).toFixed(2),
                  transform: `translateY(${u((1 - Math.min(p, 1.04)) * -5)}) rotate(${rot.toFixed(1)}deg) scale(${(0.85 + 0.15 * Math.min(p, 1.05)).toFixed(3)})`,
                  border: '1px solid rgba(10,10,10,0.08)',
                  boxShadow: `0 ${u(1)} ${u(2.6)} rgba(22,19,28,0.10)`,
                }}
              >
                {p > 0.02 && (
                  <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {/* spekulært sveip over bildet ved landing */}
                {sheen > 0.001 && sheen < 0.999 && (
                  <span
                    className="absolute pointer-events-none"
                    style={{
                      top: '-30%', bottom: '-30%', width: '45%',
                      left: `${(-50 + 165 * easeInOutCubic(sheen)).toFixed(1)}%`,
                      transform: 'rotate(16deg)',
                      background: `linear-gradient(100deg, transparent, rgba(255,255,255,${(Math.sin(sheen * Math.PI) * 0.45).toFixed(2)}), transparent)`,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* tittel — AI-en skriver */}
        <p
          className="font-heading font-bold"
          style={{ fontSize: u(3.1), color: INK, marginTop: u(2.4), minHeight: u(4), whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}
        >
          {AD_TITLE.slice(0, chars)}
          <span style={{ opacity: caretOn ? 1 : 0, color: 'rgba(10,10,10,0.55)', fontWeight: 400 }}>|</span>
        </p>

        {/* meta-rad */}
        <p
          className="font-body"
          style={{
            fontSize: u(1.95), color: 'rgba(10,10,10,0.45)', marginTop: u(0.8),
            opacity: metaP.toFixed(2), transform: `translateY(${u((1 - metaP) * 1.2)})`,
          }}
        >
          68 m² · 3 soverom · 4. etasje
        </p>

        {/* tekstlinjer (skjelett) */}
        <div style={{ marginTop: u(2.2), display: 'flex', flexDirection: 'column', gap: u(1.2) }}>
          {[100, 88, 62].map((w, i) => {
            const p = easeInOutCubic(seg(t, 3.8 + i * 0.3, 4.45 + i * 0.3));
            return (
              <span
                key={i}
                style={{
                  display: 'block', height: u(1.1), borderRadius: u(0.6),
                  width: `${(w * p).toFixed(1)}%`,
                  background: 'linear-gradient(90deg, rgba(10,10,10,0.11), rgba(10,10,10,0.06))',
                }}
              />
            );
          })}
        </div>
      </div>

      {/* AI-pille — svever over panelet mens den skriver */}
      {aiIn > 0.01 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(36), top: u(5), gap: u(1.1),
            padding: `${u(0.85)} ${u(1.8)}`, borderRadius: u(2.6),
            background: '#FFFFFF',
            border: '1px solid rgba(155,91,214,0.35)',
            boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(22,19,28,0.10), 0 0 ${u(2.5)} rgba(155,91,214,0.12)`,
            opacity: aiIn.toFixed(2),
            transform: `translateY(${u((1 - aiIn) * 2 + fl(t, 2, 0.3))})`,
          }}
        >
          <Sparkles style={{ width: u(2), height: u(2), color: '#9B5BD6' }} strokeWidth={2} />
          <span className="font-body" style={{ fontSize: u(1.85), color: 'rgba(10,10,10,0.72)', whiteSpace: 'nowrap' }}>
            DigiHome AI skriver
          </span>
          <span className="flex" style={{ gap: u(0.5) }}>
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="rounded-full"
                style={{
                  width: u(0.7), height: u(0.7), background: '#9B5BD6',
                  opacity: (0.25 + 0.75 * Math.max(0, Math.sin(t * 5 - d * 0.9))).toFixed(2),
                }}
              />
            ))}
          </span>
        </div>
      )}

      {/* publiserings-linjer + puls (SVG) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 76" fill="none" aria-hidden="true">
        {AD_CHIPS.map((c, i) => {
          const at = chipAt(i);
          const lineP = easeInOutCubic(seg(t, at, at + 0.4));
          if (lineP <= 0.004) return null;
          const x1 = 61, y1 = 30, x2 = 72, y2 = c.y + 3;
          const len = Math.hypot(x2 - x1, y2 - y1);
          const pp = easeInOutCubic(seg(t, at + 0.28, at + 0.62));
          const px = x1 + (x2 - x1) * pp;
          const py = y1 + (y2 - y1) * pp;
          return (
            <g key={c.label}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke="rgba(10,10,10,0.16)" strokeWidth="0.22"
                strokeDasharray={len.toFixed(2)}
                strokeDashoffset={(len * (1 - lineP)).toFixed(2)}
              />
              {pp > 0.01 && pp < 0.99 && (
                <>
                  <circle cx={px.toFixed(2)} cy={py.toFixed(2)} r="1.1" fill={`rgba(155,91,214,${(Math.sin(pp * Math.PI) * 0.18).toFixed(2)})`} />
                  <circle cx={px.toFixed(2)} cy={py.toFixed(2)} r="0.5" fill={`rgba(155,91,214,${(Math.sin(pp * Math.PI) * 0.9).toFixed(2)})`} />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* plattform-chips */}
      {AD_CHIPS.map((c, i) => {
        const at = chipAt(i);
        const pop = sp(t, at + 0.45, at + 1.0);
        if (pop <= 0.004) return null;
        const ticked = t > at + 0.8;
        return (
          <div
            key={c.label}
            className="absolute flex items-center"
            style={{
              left: u(72.5), top: u(c.y + fl(t, 3 + i * 1.7, 0.3)), height: u(6),
              padding: `0 ${u(2)}`, gap: u(1.2),
              borderRadius: u(3),
              background: '#FFFFFF',
              border: `1px solid rgba(10,10,10,${ticked ? 0.14 : 0.08})`,
              boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(22,19,28,0.09)`,
              opacity: Math.min(pop * 1.6, 1).toFixed(2),
              transform: `scale(${(0.7 + 0.3 * Math.min(pop, 1.06)).toFixed(3)})`,
              transition: 'border 0.4s',
            }}
          >
            <span className="font-body font-medium" style={{ fontSize: u(2.05), color: 'rgba(10,10,10,0.85)', whiteSpace: 'nowrap' }}>
              {c.label}
            </span>
            {ticked && <Tick size={2.5} pop={sp(t, at + 0.8, at + 1.15)} />}
          </div>
        );
      })}

      {/* visnings-teller — annonsen virker umiddelbart */}
      {viewsIn > 0.01 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(72.5), top: u(52 + fl(t, 8, 0.3)), gap: u(1.2),
            padding: `${u(0.9)} ${u(1.8)}`, borderRadius: u(2.8),
            background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.08)',
            boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(22,19,28,0.09)`,
            opacity: Math.min(viewsIn * 1.6, 1).toFixed(2),
            transform: `scale(${(0.7 + 0.3 * Math.min(viewsIn, 1.06)).toFixed(3)})`,
          }}
        >
          <Eye style={{ width: u(2.1), height: u(2.1), color: 'rgba(10,10,10,0.5)' }} strokeWidth={1.8} />
          <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(10,10,10,0.65)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: INK, fontWeight: 600 }}>{views}</span> visninger i dag
          </span>
        </div>
      )}

      <Stinger t={t} at={6.7} label="Annonse publisert" value="3 plattformer" valueSize={4.6} sub="Finn · Airbnb · Hybel" />
    </div>
  );
}

/* ============================================================
   KAPITTEL 2 — UKE 1 · PRISEN KALIBRERES MOT MARKEDET
   ============================================================ */
const M_PATH = 'M10 42 C 22 40.5, 30 38, 42 35.5 C 54 33, 64 30.5, 74 28 C 80 26.6, 85 26, 90 25.4';
const M_AREA = `${M_PATH} L 90 50 L 10 50 Z`;
const M_LEN = 84;
const M_BEZ = [
  [10, 42, 22, 40.5, 30, 38, 42, 35.5],
  [42, 35.5, 54, 33, 64, 30.5, 74, 28],
  [74, 28, 80, 26.6, 85, 26, 90, 25.4],
];
const M_DOTS = [
  { x: 18, y: 40.4 }, { x: 30, y: 38 }, { x: 42, y: 35.5 },
  { x: 55, y: 32.7 }, { x: 68, y: 29.4 }, { x: 80, y: 26.7 },
];
const LOCK = { x: 74, y: 28 };

export function ScenePris({ t }) {
  const gridP = easeOutCubic(seg(t, 0.2, 0.8));
  const capP = easeOutCubic(seg(t, 0.4, 0.9));
  const lineP = easeInOutCubic(seg(t, 0.6, 2.2));
  const areaP = easeOutCubic(seg(t, 1.8, 2.6));
  const scanWin = seg(t, 2.7, 4.5);
  const scanActive = scanWin > 0.001 && scanWin < 0.999;
  const decay = 1 - easeInOutCubic(scanWin);
  const scanY = LOCK.y + 8 * Math.sin((t - 2.7) * 5.2) * decay;
  const locked = t >= 4.5;
  const lockPop = sp(t, 4.5, 5.0);
  const burst = seg(t, 4.5, 5.1);
  const tagP = easeOutCubic(seg(t, 2.8, 3.15)) * (1 - easeInOutCubic(seg(t, 5.1, 5.5)));
  const scanPrice = 24300 + 1200 * scanWin + Math.sin((t - 2.7) * 5.2) * 800 * decay;
  const kalibLabel = seg(t, 2.8, 3.1) * (1 - seg(t, 4.3, 4.6));
  const [tipX, tipY] = bez(M_BEZ, lineP);
  const areaGlow = Math.sin(clamp01(burst) * Math.PI) * 0.5;

  const corner = (pos) => ({
    position: 'absolute',
    width: u(1.8), height: u(1.8),
    ...(pos.includes('t') ? { top: 0 } : { bottom: 0 }),
    ...(pos.includes('l') ? { left: 0 } : { right: 0 }),
    borderTop: pos.includes('t') ? '1.5px solid rgba(155,91,214,0.85)' : 'none',
    borderBottom: pos.includes('b') ? '1.5px solid rgba(155,91,214,0.85)' : 'none',
    borderLeft: pos.includes('l') ? '1.5px solid rgba(155,91,214,0.85)' : 'none',
    borderRight: pos.includes('r') ? '1.5px solid rgba(155,91,214,0.85)' : 'none',
  });

  return (
    <div className="absolute inset-0">
      {/* graf-caption */}
      {capP > 0.01 && (
        <p
          className="absolute font-body uppercase"
          style={{
            left: u(10), top: u(8.5), fontSize: u(1.6), letterSpacing: '0.32em',
            color: 'rgba(10,10,10,0.35)', opacity: capP.toFixed(2),
          }}
        >
          Bergen · leiemarked
        </p>
      )}

      {/* y-akse-verdier */}
      {[['26 500', 24], ['23 000', 42]].map(([v, y]) => (
        <span
          key={v}
          className="absolute font-body"
          style={{
            left: u(1.5), top: u(y), transform: 'translateY(-50%)',
            fontSize: u(1.5), color: 'rgba(10,10,10,0.30)', fontVariantNumeric: 'tabular-nums',
            opacity: (0.9 * gridP).toFixed(2),
          }}
        >
          {v}
        </span>
      ))}

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 76" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="dhAreaFillLys" x1="0" y1="20" x2="0" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#0A0A0A" stopOpacity="0.06" />
            <stop offset="1" stopColor="#0A0A0A" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* rutenett */}
        {[24, 33, 42].map((y) => (
          <line key={y} x1="10" y1={y} x2="90" y2={y} stroke={`rgba(10,10,10,${(0.06 * gridP).toFixed(3)})`} strokeWidth="0.16" strokeDasharray="0.8 2" />
        ))}
        <line x1="10" y1="50" x2="90" y2="50" stroke={`rgba(10,10,10,${(0.16 * gridP).toFixed(3)})`} strokeWidth="0.2" />

        {/* areal under markedslinjen — blusser opp ved lås */}
        {areaP > 0.01 && <path d={M_AREA} fill="url(#dhAreaFillLys)" opacity={(areaP * (1 + areaGlow)).toFixed(2)} />}

        {/* markedslinjen tegnes med lysende ledepunkt */}
        {lineP > 0.004 && (
          <path
            d={M_PATH}
            stroke="rgba(10,10,10,0.5)" strokeWidth="0.35" strokeLinecap="round"
            strokeDasharray={M_LEN} strokeDashoffset={(M_LEN * (1 - lineP)).toFixed(2)}
          />
        )}
        {lineP > 0.01 && lineP < 0.995 && (
          <>
            <circle cx={tipX.toFixed(2)} cy={tipY.toFixed(2)} r="1.4" fill="rgba(155,91,214,0.18)" />
            <circle cx={tipX.toFixed(2)} cy={tipY.toFixed(2)} r="0.6" fill="#9B5BD6" />
          </>
        )}

        {/* sammenlignbare boliger — pop med ekko-ring */}
        {M_DOTS.map((d, i) => {
          const at = 1.4 + i * 0.18;
          const p = easeOutCubic(seg(t, at, at + 0.4));
          if (p <= 0.01) return null;
          const echo = seg(t, at, at + 0.55);
          return (
            <g key={i}>
              {echo > 0.01 && echo < 0.99 && (
                <circle cx={d.x} cy={d.y} r={(0.7 + echo * 1.8).toFixed(2)} stroke={`rgba(10,10,10,${(Math.sin(echo * Math.PI) * 0.22).toFixed(2)})`} strokeWidth="0.15" fill="none" />
              )}
              <circle cx={d.x} cy={d.y} r={(0.75 * p).toFixed(2)} fill={`rgba(10,10,10,${(0.45 * p).toFixed(2)})`} />
            </g>
          );
        })}

        {/* kalibrerings-skann / låst prislinje */}
        {(scanActive || locked) && (
          <line
            x1="10" y1={(locked ? LOCK.y : scanY).toFixed(2)} x2="90" y2={(locked ? LOCK.y : scanY).toFixed(2)}
            stroke={locked ? 'rgba(10,10,10,0.8)' : 'rgba(155,91,214,0.5)'}
            strokeWidth={locked ? 0.3 : 0.22}
            strokeDasharray={locked ? 'none' : '1.4 1.6'}
          />
        )}

        {/* lås-punkt + burst-ring */}
        {locked && (
          <>
            {burst > 0.01 && burst < 0.99 && (
              <circle
                cx={LOCK.x} cy={LOCK.y} r={(1 + easeOutCubic(burst) * 5).toFixed(2)}
                stroke={`rgba(155,91,214,${(Math.sin(burst * Math.PI) * 0.5).toFixed(2)})`} strokeWidth="0.25" fill="none"
              />
            )}
            <circle cx={LOCK.x} cy={LOCK.y} r={(1.1 * Math.min(lockPop, 1.1)).toFixed(2)} fill="#9B5BD6" />
          </>
        )}
      </svg>

      {/* pristag som rir på skannelinjen */}
      {tagP > 0.01 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(91), top: u(locked ? LOCK.y : scanY),
            transform: 'translate(-100%, -50%)',
            padding: `${u(0.7)} ${u(1.5)}`, borderRadius: u(1.4),
            background: '#FFFFFF',
            border: `1px solid ${locked ? 'rgba(24,121,78,0.45)' : 'rgba(10,10,10,0.12)'}`,
            boxShadow: `0 ${u(1)} ${u(3)} rgba(22,19,28,0.10)`,
            opacity: tagP.toFixed(2),
            transition: 'border 0.3s',
          }}
        >
          <span className="font-body font-semibold" style={{ fontSize: u(1.9), color: locked ? '#18794E' : 'rgba(10,10,10,0.8)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(locked ? 25500 : scanPrice)} kr
          </span>
        </div>
      )}

      {/* «Kalibrerer» -etikett */}
      {kalibLabel > 0.01 && (
        <div className="absolute flex items-center" style={{ right: u(10), top: u(8.2), gap: u(1.2), opacity: kalibLabel.toFixed(2) }}>
          <span
            className="inline-flex rounded-full"
            style={{ width: u(1.2), height: u(1.2), background: '#9B5BD6', opacity: (Math.sin(t * 6) > 0 ? 1 : 0.3) }}
          />
          <span className="font-body uppercase" style={{ fontSize: u(1.7), letterSpacing: '0.3em', color: 'rgba(10,10,10,0.45)' }}>
            Kalibrerer
          </span>
        </div>
      )}

      {/* sikte-braketter på låsepunktet */}
      {lockPop > 0.01 && (
        <span
          className="absolute"
          style={{
            left: u(LOCK.x), top: u(LOCK.y), width: u(7), height: u(7),
            transform: `translate(-50%, -50%) scale(${(1.9 - 0.9 * Math.min(lockPop, 1.05)).toFixed(3)})`,
            opacity: Math.min(lockPop * 1.6, 1).toFixed(2),
          }}
        >
          <span style={corner('tl')} />
          <span style={corner('tr')} />
          <span style={corner('bl')} />
          <span style={corner('br')} />
        </span>
      )}

      <Stinger t={t} at={5.5} label="Pris kalibrert" countTo={25500} suffix=" kr/mnd" valueSize={5.2} sub="Justeres løpende mot markedet" />
    </div>
  );
}

/* ============================================================
   KAPITTEL 3 — DAG 14 · LEIETAKEREN VERIFISERES GRUNDIG
   ============================================================ */
const APPLICANTS = [
  { x: 26, init: 'AH', name: 'A. Hansen', verdictAt: 2.0 },
  { x: 50, init: 'MB', name: 'M. Berg', verdictAt: 2.45, chosen: true },
  { x: 74, init: 'KS', name: 'K. Solheim', verdictAt: 2.9 },
];
const CHECKS = ['BankID-verifisert', 'Inntekt dokumentert', 'Referanser sjekket'];
const SIG_PATH = 'M2 18 C8 2, 14 26, 20 10 S30 4, 34 14 S44 22, 52 8';
const SIG_BEZ = [
  [2, 18, 8, 2, 14, 26, 20, 10],
  [20, 10, 26, -6, 30, 4, 34, 14],
  [34, 14, 38, 24, 44, 22, 52, 8],
];

export function SceneLeietaker({ t }) {
  const beamP = easeInOutCubic(seg(t, 1.4, 3.0));
  const beamX = 4 + 92 * beamP;
  const beamOn = beamP > 0.001 && beamP < 0.999;
  const mvP = easeInOutCubic(seg(t, 3.4, 4.1));
  const sigP = easeInOutCubic(seg(t, 5.8, 6.8));
  const [penX, penY] = bez(SIG_BEZ, sigP);

  return (
    <div className="absolute inset-0">
      {/* skannelys — lavendel på lyst */}
      {beamOn && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: u(beamX - 5), top: 0, bottom: 0, width: u(10),
            background: 'linear-gradient(90deg, transparent, rgba(155,91,214,0.05) 45%, rgba(155,91,214,0.09) 50%, rgba(155,91,214,0.05) 55%, transparent)',
            opacity: Math.sin(beamP * Math.PI).toFixed(2),
          }}
        />
      )}

      {/* søkerkort */}
      {APPLICANTS.map((a, i) => {
        const inP = sp(t, 0.2 + i * 0.25, 1.05 + i * 0.25);
        if (inP <= 0.004) return null;
        const spin = Math.max(0, seg(t, a.verdictAt - 0.5, a.verdictAt)) * (t < a.verdictAt ? 1 : 0);
        const rej = a.chosen ? 0 : easeOutCubic(seg(t, a.verdictAt, a.verdictAt + 0.4));
        const glow = a.chosen ? easeOutCubic(seg(t, a.verdictAt, a.verdictAt + 0.4)) : 0;
        /* avviste kort trekker BAKOVER i dybden før de forsvinner */
        const ex = a.chosen ? 0 : easeInOutCubic(seg(t, 3.4, 4.05));
        const x = a.chosen ? 50 - 20 * mvP : a.x;
        const rot = (1 - Math.min(inP, 1)) * (i - 1) * 3;
        const sc = ((0.88 + 0.12 * Math.min(inP, 1.04)) * (a.chosen ? 1 + 0.1 * mvP : 1 - 0.1 * ex)).toFixed(3);
        const statusTxt = t >= a.verdictAt ? (a.chosen ? 'Verifisert' : 'Ikke kvalifisert') : spin > 0.01 ? 'Sjekker…' : '';
        return (
          <div
            key={a.name}
            className="absolute flex flex-col items-center"
            style={{
              left: u(x), top: u(25 + fl(t, i * 2.2, a.chosen ? 0.22 : 0.15)),
              width: u(22), padding: `${u(2.2)} ${u(2)}`,
              borderRadius: u(2.2),
              background: '#FFFFFF',
              border: `1px solid ${glow > 0.05 ? `rgba(24,121,78,${(0.5 * glow).toFixed(2)})` : 'rgba(10,10,10,0.08)'}`,
              boxShadow: `${CARD_SHADOW}${glow > 0.05 ? `, 0 0 ${u(3.5)} rgba(24,121,78,${(0.12 * glow).toFixed(2)})` : ''}`,
              transform: `translate(-50%, -50%) translateY(${u((1 - Math.min(inP, 1.04)) * 7)}) rotate(${rot.toFixed(1)}deg) scale(${sc})`,
              opacity: (Math.min(inP * 1.6, 1) * (1 - 0.5 * rej) * (1 - ex)).toFixed(2),
              filter: `${rej > 0.02 ? `grayscale(${rej.toFixed(2)})` : ''} ${ex > 0.02 ? `blur(${(ex * 1.6).toFixed(1)}px)` : ''}`.trim() || 'none',
              transition: 'border 0.4s, box-shadow 0.4s',
            }}
          >
            <span className="relative inline-flex">
              <span
                className="inline-flex items-center justify-center rounded-full font-heading font-bold"
                style={{
                  width: u(6), height: u(6), fontSize: u(2.2),
                  background: 'rgba(10,10,10,0.05)', color: 'rgba(10,10,10,0.8)',
                  border: '1px solid rgba(10,10,10,0.10)',
                }}
              >
                {a.init}
              </span>
              {/* verifiserings-spinner rundt avataren */}
              {spin > 0.01 && (
                <span
                  className="absolute rounded-full"
                  style={{
                    inset: u(-0.8),
                    border: '1.4px solid rgba(10,10,10,0.10)',
                    borderTopColor: 'rgba(155,91,214,0.8)',
                    transform: `rotate(${((t * 540) % 360).toFixed(0)}deg)`,
                    opacity: spin.toFixed(2),
                  }}
                />
              )}
            </span>
            <p className="font-body font-medium" style={{ fontSize: u(2.05), color: 'rgba(10,10,10,0.85)', marginTop: u(1.4), whiteSpace: 'nowrap' }}>
              {a.name}
            </p>
            <span style={{ display: 'block', width: '74%', height: u(0.9), borderRadius: u(0.5), background: 'rgba(10,10,10,0.09)', marginTop: u(1.4) }} />
            <span style={{ display: 'block', width: '52%', height: u(0.9), borderRadius: u(0.5), background: 'rgba(10,10,10,0.06)', marginTop: u(0.8) }} />
            {/* status-linje */}
            <p
              className="font-body"
              style={{
                fontSize: u(1.6), marginTop: u(1.3), minHeight: u(2), whiteSpace: 'nowrap',
                color: t >= a.verdictAt ? (a.chosen ? '#18794E' : 'rgba(10,10,10,0.35)') : 'rgba(10,10,10,0.4)',
                fontWeight: a.chosen && t >= a.verdictAt ? 600 : 400,
              }}
            >
              {statusTxt || '\u00A0'}
            </p>
            {!a.chosen && rej > 0.3 && (
              <span
                className="absolute inline-flex items-center justify-center rounded-full"
                style={{
                  top: u(-1), right: u(-1), width: u(2.8), height: u(2.8),
                  background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.14)',
                  color: 'rgba(10,10,10,0.45)', fontSize: u(1.6),
                  boxShadow: `0 ${u(0.5)} ${u(1.4)} rgba(22,19,28,0.08)`,
                }}
              >
                –
              </span>
            )}
            {a.chosen && glow > 0.3 && (
              <span className="absolute" style={{ top: u(-1), right: u(-1) }}>
                <Tick size={2.8} pop={sp(t, a.verdictAt + 0.1, a.verdictAt + 0.5)} />
              </span>
            )}
          </div>
        );
      })}

      {/* spotlight bak det valgte kortet */}
      {mvP > 0.05 && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: u(30), top: u(25), width: u(34), height: u(30),
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(155,91,214,0.06), transparent 70%)',
            opacity: mvP.toFixed(2),
          }}
        />
      )}

      {/* sjekkliste — rad glir inn, tick popper etterpå */}
      {CHECKS.map((c, i) => {
        const at = 4.3 + i * 0.45;
        const p = sp(t, at, at + 0.55);
        if (p <= 0.004) return null;
        return (
          <div
            key={c}
            className="absolute flex items-center"
            style={{
              left: u(52), top: u(14 + i * 7), gap: u(1.6),
              opacity: Math.min(p * 1.6, 1).toFixed(2),
              transform: `translateX(${u((1 - Math.min(p, 1.04)) * 4)})`,
            }}
          >
            <Tick size={3} pop={sp(t, at + 0.18, at + 0.55)} />
            <span className="font-body font-medium" style={{ fontSize: u(2.3), color: 'rgba(10,10,10,0.82)', whiteSpace: 'nowrap' }}>
              {c}
            </span>
          </div>
        );
      })}

      {/* signatur — pennen tegner */}
      {sigP > 0.004 && (
        <div className="absolute" style={{ left: u(52), top: u(37) }}>
          <svg viewBox="0 0 56 24" fill="none" style={{ width: u(22), height: u(9.4), overflow: 'visible' }} aria-hidden="true">
            <path
              d={SIG_PATH}
              stroke="rgba(10,10,10,0.8)" strokeWidth="1.1" strokeLinecap="round"
              strokeDasharray="80" strokeDashoffset={(80 * (1 - sigP)).toFixed(2)}
            />
            {sigP > 0.01 && sigP < 0.99 && (
              <>
                <circle cx={penX.toFixed(2)} cy={penY.toFixed(2)} r="2.6" fill="rgba(155,91,214,0.15)" />
                <circle cx={penX.toFixed(2)} cy={penY.toFixed(2)} r="1.1" fill="#0A0A0A" />
              </>
            )}
          </svg>
          <div style={{ width: u(24), height: 1, background: 'linear-gradient(90deg, rgba(10,10,10,0.25), transparent)', marginTop: u(0.6) }} />
        </div>
      )}

      <Stinger t={t} at={6.8} label="Kontrakt signert" value="12 mnd leieavtale" valueSize={4.6} sub="BankID · depositum sikret" />
    </div>
  );
}

/* ============================================================
   KAPITTEL 4 — HVER MÅNED · HVERDAGEN HÅNDTERER VI
   ============================================================ */
const C = { x: 50, y: 27 };
const RING_R = 10;
const NOTIFS = [
  { at: 1.0, from: [-14, 9], time: '23:42', text: 'Lekkasje på badet', icon: Droplets, arc: 7 },
  { at: 1.95, from: [116, 13], time: '09:14', text: 'Visning booket', icon: CalendarRange, arc: -7 },
  { at: 2.9, from: [-16, 44], time: '14:02', text: 'Purring sendt', icon: BellRing, arc: -6 },
  { at: 3.8, from: [118, 48], time: '17:48', text: 'Spørsmål om depositum', icon: MessageCircle, arc: 6 },
  { at: 4.7, from: [50, 84], time: '21:05', text: 'Håndverker bestilt', icon: Wrench, arc: 8 },
];

export function SceneHverdag({ t }) {
  const ringIn = sp(t, 0.2, 1.0);
  const calm = easeInOutCubic(seg(t, 6.1, 6.9));
  let pulse = 0;
  let count = 0;
  let lastAb = -1;
  let nudgeX = 0;
  let nudgeY = 0;
  NOTIFS.forEach((n) => {
    const w = Math.sin(clamp01(seg(t, n.at + 0.92, n.at + 1.25)) * Math.PI);
    pulse = Math.max(pulse, w);
    if (w > 0.01) {
      /* skjoldet dyttes fysisk i treff-retningen */
      const dx = C.x - n.from[0], dy = C.y - n.from[1];
      const len = Math.hypot(dx, dy);
      nudgeX += (dx / len) * w * 0.7;
      nudgeY += (dy / len) * w * 0.7;
    }
    if (t > n.at + 0.92) {
      count += 1;
      lastAb = Math.max(lastAb, n.at + 0.92);
    }
  });
  const countPop = lastAb > 0 ? sp(t, lastAb, lastAb + 0.4) : 0;
  const breathe = 1 + 0.008 * Math.sin(t * 1.4);

  const ringScale = (Math.max(0.5, Math.min(ringIn, 1.05)) * (1 + 0.05 * pulse) * breathe).toFixed(3);
  const ringOp = (Math.min(ringIn * 1.4, 1) * (1 - 0.5 * calm)).toFixed(2);

  return (
    <div className="absolute inset-0">
      {/* skjold-ringen */}
      <div
        className="absolute rounded-full"
        style={{
          left: u(C.x + nudgeX), top: u(C.y + nudgeY), width: u(RING_R * 2), height: u(RING_R * 2),
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          border: `1.5px solid rgba(10,10,10,${(0.3 + 0.3 * pulse).toFixed(2)})`,
          boxShadow: `0 ${u(1.5)} ${u(4 + 2 * pulse)} rgba(155,91,214,${(0.08 + 0.14 * pulse).toFixed(2)}), 0 ${u(3)} ${u(8)} rgba(22,19,28,0.06)`,
          background: '#FFFFFF',
          opacity: ringOp,
        }}
      />
      {/* roterende radar-segment */}
      <div
        className="absolute rounded-full"
        style={{
          left: u(C.x + nudgeX * 0.5), top: u(C.y + nudgeY * 0.5), width: u(RING_R * 2.8), height: u(RING_R * 2.8),
          transform: `translate(-50%, -50%) rotate(${((t * 24) % 360).toFixed(1)}deg)`,
          border: '1px dashed rgba(10,10,10,0.10)',
          borderTopColor: 'rgba(155,91,214,0.45)',
          opacity: (Math.min(ringIn, 1) * (1 - 0.55 * calm)).toFixed(2),
        }}
      />
      {/* hus i sentrum — pulserer ved hvert treff */}
      <svg
        className="absolute" viewBox="0 0 20 16" fill="none"
        style={{
          left: u(C.x + nudgeX), top: u(C.y + nudgeY), width: u(10), height: u(8),
          transform: `translate(-50%, -52%) scale(${(1 + 0.06 * pulse).toFixed(3)})`,
          opacity: (Math.min(ringIn * 1.3, 1) * (1 - 0.3 * calm)).toFixed(2),
        }}
        aria-hidden="true"
      >
        <path d="M4 14 L4 7.5 L10 3 L16 7.5 L16 14 Z" stroke={`rgba(10,10,10,${(0.7 + 0.3 * pulse).toFixed(2)})`} strokeWidth="0.7" strokeLinejoin="round" />
        <circle cx="10" cy="8.2" r="1.1" stroke="rgba(10,10,10,0.55)" strokeWidth="0.5" />
      </svg>

      {/* absorpsjons-rippler */}
      {NOTIFS.map((n) => {
        const rp = seg(t, n.at + 0.92, n.at + 1.4);
        if (rp <= 0.01 || rp >= 0.99) return null;
        const dx = C.x - n.from[0], dy = C.y - n.from[1];
        const len = Math.hypot(dx, dy);
        const tx = C.x - (dx / len) * (RING_R + 1);
        const ty = C.y - (dy / len) * (RING_R + 1);
        const r = 1 + easeOutCubic(rp) * 5;
        return (
          <span
            key={`rip-${n.text}`}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: u(tx), top: u(ty), width: u(r * 2), height: u(r * 2),
              transform: 'translate(-50%, -50%)',
              border: `1px solid rgba(155,91,214,${(Math.sin(rp * Math.PI) * 0.4).toFixed(2)})`,
            }}
          />
        );
      })}

      {/* varsler — buede baner, akselererer inn mot skjoldet */}
      {NOTIFS.map((n) => {
        const p = seg(t, n.at, n.at + 1.05);
        if (p <= 0.001 || p >= 0.999) return null;
        const pe = p * p * (3 - 2 * p) * p;
        const dx = C.x - n.from[0], dy = C.y - n.from[1];
        const len = Math.hypot(dx, dy);
        const tx = C.x - (dx / len) * (RING_R + 2);
        const ty = C.y - (dy / len) * (RING_R + 2);
        /* buet bane: forskyvning vinkelrett på retningen */
        const px = -dy / len, py = dx / len;
        const curve = Math.sin(Math.PI * pe) * n.arc;
        const x = n.from[0] + (tx - n.from[0]) * pe + px * curve;
        const y = n.from[1] + (ty - n.from[1]) * pe + py * curve;
        const absorbed = clamp01((p - 0.86) / 0.14);
        const Icon = n.icon;
        return (
          <div
            key={n.text}
            className="absolute flex items-center"
            style={{
              left: u(x), top: u(y),
              transform: `translate(-50%, -50%) scale(${(1 - 0.6 * absorbed).toFixed(2)}) rotate(${(curve * 0.6).toFixed(1)}deg)`,
              gap: u(1.1), padding: `${u(0.9)} ${u(1.7)}`, borderRadius: u(2.8),
              background: '#FFFFFF',
              border: '1px solid rgba(10,10,10,0.09)',
              boxShadow: `0 ${u(1.4)} ${u(4)} rgba(22,19,28,0.12)`,
              opacity: (Math.min(seg(t, n.at, n.at + 0.2) * 1.5, 1) * (1 - absorbed)).toFixed(2),
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full shrink-0"
              style={{ width: u(3), height: u(3), background: 'rgba(10,10,10,0.05)' }}
            >
              <Icon style={{ width: u(1.7), height: u(1.7), color: 'rgba(10,10,10,0.6)' }} strokeWidth={1.8} />
            </span>
            <span className="font-body" style={{ fontSize: u(1.65), color: 'rgba(10,10,10,0.38)' }}>{n.time}</span>
            <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(10,10,10,0.82)' }}>{n.text}</span>
          </div>
        );
      })}

      {/* håndtert-teller */}
      {count > 0 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(64), top: u(11 + fl(t, 5, 0.2)), gap: u(1.2),
            padding: `${u(0.9)} ${u(1.9)}`, borderRadius: u(2.8),
            background: '#FFFFFF', border: '1px solid rgba(10,10,10,0.08)',
            boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(22,19,28,0.09)`,
            transform: `scale(${(1 + 0.07 * Math.sin(clamp01(countPop) * Math.PI)).toFixed(3)})`,
            opacity: (1 - 0.45 * calm).toFixed(2),
          }}
        >
          <span className="inline-flex rounded-full" style={{ width: u(1.2), height: u(1.2), background: '#18794E', boxShadow: `0 0 ${u(1.2)} rgba(24,121,78,0.5)` }} />
          <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(10,10,10,0.62)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            Håndtert av autopiloten · <span style={{ color: INK, fontWeight: 600 }}>{count}</span>
          </span>
        </div>
      )}

      <Stinger t={t} at={6.9} label="Leie mottatt" countTo={25000} suffix=" kr" valueSize={6} sub="Du hørte ingenting. Slik skal det være." />
    </div>
  );
}
