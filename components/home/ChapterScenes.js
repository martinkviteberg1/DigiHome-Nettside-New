'use client';

/*
  ChapterScenes — fire kinematiske scener for «Autopiloten i praksis».
  Tidslinje-fortelling: Dag 1 → Uke 1 → Dag 14 → Hver måned.
  Hvert kapittel ender i samme rituale: en «stinger» med kvantifisert
  resultat + grønn kvittering — ekko av heroens utbetaling.
  Koordinatsystem: 100 x 76 enheter (--u = 1 % av scenens bredde).
*/

import {
  Eye, Sparkles, Droplets, CalendarRange, BellRing, MessageCircle, Wrench,
} from 'lucide-react';
import { seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack } from '@/components/video/filmUtils';

const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;

const fmt = (v) => {
  const s = String(Math.round(v));
  return s.length > 3 ? `${s.slice(0, -3)} ${s.slice(-3)}` : s;
};

function Tick({ size = 3 }) {
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

/* Felles rituale: hvert kapittel kvitterer med målbart resultat */
function Stinger({ t, at, label, value, sub, valueSize = 5.4 }) {
  const lineP = easeInOutCubic(seg(t, at, at + 0.45));
  if (lineP <= 0.004) return null;
  const labelP = easeOutCubic(seg(t, at + 0.15, at + 0.7));
  const valP = easeOutCubic(seg(t, at + 0.4, at + 1.0));
  const check = easeOutBack(seg(t, at + 1.0, at + 1.4));
  const subP = easeOutCubic(seg(t, at + 1.25, at + 1.75));
  const bloom = Math.sin(clamp01(seg(t, at + 0.8, at + 1.9)) * Math.PI);
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(56) }}>
      <span
        style={{
          width: u(26 * lineP), height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(235,232,245,0.35), transparent)',
        }}
      />
      {labelP > 0.01 && (
        <p
          className="font-body uppercase"
          style={{
            fontSize: u(1.7),
            letterSpacing: `${(0.6 - 0.22 * labelP).toFixed(3)}em`,
            color: 'rgba(253,252,251,0.4)',
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
              background: 'radial-gradient(ellipse 62% 62% at 50% 50%, rgba(150,232,186,0.085), rgba(240,237,248,0.05) 48%, transparent 72%)',
              opacity: bloom.toFixed(2),
            }}
          />
          <span
            className="relative font-heading font-bold"
            style={{
              fontSize: u(valueSize), color: '#FDFCFB', whiteSpace: 'nowrap',
              fontVariantNumeric: 'tabular-nums',
              opacity: valP.toFixed(2),
              transform: `translateY(${u((1 - valP) * 2)})`,
            }}
          >
            {value}
          </span>
          {check > 0.01 && (
            <span className="relative" style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
              <Tick size={3.4} />
            </span>
          )}
        </div>
      )}
      {subP > 0.01 && (
        <p className="font-body" style={{ fontSize: u(1.95), color: 'rgba(253,252,251,0.5)', marginTop: u(1.2), opacity: subP.toFixed(2) }}>
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
  const panelIn = easeOutCubic(seg(t, 0.15, 0.75));
  const aiIn = easeOutCubic(seg(t, 1.6, 2.0)) * (1 - easeInOutCubic(seg(t, 4.2, 4.6)));
  const chars = Math.floor(seg(t, 1.9, 3.4) * AD_TITLE.length);
  const caretOn = t > 1.8 && t < 3.7 && Math.sin(t * 9) > -0.2;
  const metaP = easeOutCubic(seg(t, 3.5, 3.95));
  const views = Math.round(38 * easeOutCubic(seg(t, 6.7, 7.8)));
  const viewsIn = easeOutBack(seg(t, 6.6, 7.0));

  return (
    <div className="absolute inset-0">
      {/* dokumentpanelet */}
      <div
        className="absolute"
        style={{
          left: u(8), top: u(8), width: u(52),
          borderRadius: u(2.4), padding: u(3),
          background: 'rgba(21,20,25,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: `0 ${u(2)} ${u(6)} rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
          opacity: panelIn.toFixed(2),
          transform: `translateY(${u((1 - panelIn) * 5)})`,
        }}
      >
        {/* fotostripe — bildene «deles ut» som kort */}
        <div className="flex" style={{ gap: u(1.4) }}>
          {AD_PHOTOS.map((src, i) => {
            const p = easeOutBack(seg(t, 0.6 + i * 0.35, 1.25 + i * 0.35));
            const rot = (1 - Math.min(p, 1)) * (i === 1 ? 5 : -4 - i * 2);
            return (
              <div
                key={src}
                className="relative overflow-hidden"
                style={{
                  width: u(14.4), height: u(10.5), borderRadius: u(1.2),
                  opacity: Math.min(p * 1.4, 1).toFixed(2),
                  transform: `translateY(${u((1 - Math.min(p, 1)) * -4)}) rotate(${rot.toFixed(1)}deg) scale(${Math.max(0.6, Math.min(p, 1.05)).toFixed(3)})`,
                  border: '1px solid rgba(255,255,255,0.10)',
                }}
              >
                {p > 0.02 && (
                  <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
                )}
              </div>
            );
          })}
        </div>

        {/* tittel — AI-en skriver */}
        <p
          className="font-heading font-bold"
          style={{ fontSize: u(3.1), color: '#FDFCFB', marginTop: u(2.4), minHeight: u(4), whiteSpace: 'nowrap' }}
        >
          {AD_TITLE.slice(0, chars)}
          <span style={{ opacity: caretOn ? 1 : 0, color: 'rgba(235,232,245,0.8)', fontWeight: 400 }}>|</span>
        </p>

        {/* meta-rad */}
        <p
          className="font-body"
          style={{
            fontSize: u(1.95), color: 'rgba(253,252,251,0.45)', marginTop: u(0.8),
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
                  background: 'linear-gradient(90deg, rgba(235,232,245,0.13), rgba(235,232,245,0.07))',
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
            background: 'rgba(28,26,36,0.95)',
            border: '1px solid rgba(207,151,252,0.3)',
            boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(0,0,0,0.5), 0 0 ${u(2.5)} rgba(207,151,252,0.10)`,
            opacity: aiIn.toFixed(2),
            transform: `translateY(${u((1 - aiIn) * 2)})`,
          }}
        >
          <Sparkles style={{ width: u(2), height: u(2), color: '#CF97FC' }} strokeWidth={2} />
          <span className="font-body" style={{ fontSize: u(1.85), color: 'rgba(253,252,251,0.8)', whiteSpace: 'nowrap' }}>
            DigiHome AI skriver
          </span>
          <span className="flex" style={{ gap: u(0.5) }}>
            {[0, 1, 2].map((d) => (
              <span
                key={d}
                className="rounded-full"
                style={{
                  width: u(0.7), height: u(0.7), background: 'rgba(207,151,252,0.9)',
                  opacity: (0.3 + 0.7 * Math.max(0, Math.sin(t * 5 - d * 0.9))).toFixed(2),
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
                stroke="rgba(235,232,245,0.16)" strokeWidth="0.22"
                strokeDasharray={len.toFixed(2)}
                strokeDashoffset={(len * (1 - lineP)).toFixed(2)}
              />
              {pp > 0.01 && pp < 0.99 && (
                <>
                  <circle cx={px.toFixed(2)} cy={py.toFixed(2)} r="1.1" fill={`rgba(235,232,245,${(Math.sin(pp * Math.PI) * 0.18).toFixed(2)})`} />
                  <circle cx={px.toFixed(2)} cy={py.toFixed(2)} r="0.5" fill={`rgba(250,249,253,${(Math.sin(pp * Math.PI) * 0.95).toFixed(2)})`} />
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* plattform-chips */}
      {AD_CHIPS.map((c, i) => {
        const at = chipAt(i);
        const pop = easeOutBack(seg(t, at + 0.45, at + 0.9));
        if (pop <= 0.004) return null;
        const ticked = t > at + 0.75;
        return (
          <div
            key={c.label}
            className="absolute flex items-center"
            style={{
              left: u(72.5), top: u(c.y), height: u(6),
              padding: `0 ${u(2)}`, gap: u(1.2),
              borderRadius: u(3),
              background: 'rgba(21,20,25,0.92)',
              border: `1px solid rgba(255,255,255,${ticked ? 0.2 : 0.12})`,
              boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(0,0,0,0.5)${ticked ? `, 0 0 ${u(2.4)} rgba(235,232,245,0.07)` : ''}`,
              opacity: Math.min(pop * 1.4, 1).toFixed(2),
              transform: `scale(${Math.max(0.6, Math.min(pop, 1.08)).toFixed(3)})`,
              transition: 'border 0.4s, box-shadow 0.4s',
            }}
          >
            <span className="font-body font-medium" style={{ fontSize: u(2.05), color: 'rgba(253,252,251,0.88)', whiteSpace: 'nowrap' }}>
              {c.label}
            </span>
            {ticked && <Tick size={2.5} />}
          </div>
        );
      })}

      {/* visnings-teller — annonsen virker umiddelbart */}
      {viewsIn > 0.01 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(72.5), top: u(52), gap: u(1.2),
            padding: `${u(0.9)} ${u(1.8)}`, borderRadius: u(2.8),
            background: 'rgba(21,20,25,0.92)', border: '1px solid rgba(255,255,255,0.12)',
            opacity: Math.min(viewsIn * 1.4, 1).toFixed(2),
            transform: `scale(${Math.max(0.6, Math.min(viewsIn, 1.08)).toFixed(3)})`,
          }}
        >
          <Eye style={{ width: u(2.1), height: u(2.1), color: 'rgba(253,252,251,0.55)' }} strokeWidth={1.8} />
          <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.75)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            <span style={{ color: '#FDFCFB', fontWeight: 600 }}>{views}</span> visninger i dag
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
  const lockPop = easeOutBack(seg(t, 4.5, 4.9));
  const tagP = easeOutCubic(seg(t, 2.8, 3.15)) * (1 - easeInOutCubic(seg(t, 5.1, 5.5)));
  const scanPrice = 24300 + 1200 * scanWin + Math.sin((t - 2.7) * 5.2) * 800 * decay;
  const kalibLabel = seg(t, 2.8, 3.1) * (1 - seg(t, 4.3, 4.6));

  const corner = (pos) => ({
    position: 'absolute',
    width: u(1.8), height: u(1.8),
    ...(pos.includes('t') ? { top: 0 } : { bottom: 0 }),
    ...(pos.includes('l') ? { left: 0 } : { right: 0 }),
    borderTop: pos.includes('t') ? '1.5px solid rgba(235,232,245,0.75)' : 'none',
    borderBottom: pos.includes('b') ? '1.5px solid rgba(235,232,245,0.75)' : 'none',
    borderLeft: pos.includes('l') ? '1.5px solid rgba(235,232,245,0.75)' : 'none',
    borderRight: pos.includes('r') ? '1.5px solid rgba(235,232,245,0.75)' : 'none',
  });

  return (
    <div className="absolute inset-0">
      {/* graf-caption */}
      {capP > 0.01 && (
        <p
          className="absolute font-body uppercase"
          style={{
            left: u(10), top: u(8.5), fontSize: u(1.6), letterSpacing: '0.32em',
            color: 'rgba(253,252,251,0.35)', opacity: capP.toFixed(2),
          }}
        >
          Bergen · leiemarked
        </p>
      )}

      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 76" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="dhAreaFill" x1="0" y1="20" x2="0" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#EBE8F5" stopOpacity="0.10" />
            <stop offset="1" stopColor="#EBE8F5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* rutenett */}
        {[24, 33, 42].map((y) => (
          <line key={y} x1="10" y1={y} x2="90" y2={y} stroke={`rgba(235,232,245,${(0.05 * gridP).toFixed(3)})`} strokeWidth="0.16" strokeDasharray="0.8 2" />
        ))}
        <line x1="10" y1="50" x2="90" y2="50" stroke={`rgba(235,232,245,${(0.14 * gridP).toFixed(3)})`} strokeWidth="0.2" />

        {/* areal under markedslinjen */}
        {areaP > 0.01 && <path d={M_AREA} fill="url(#dhAreaFill)" opacity={areaP.toFixed(2)} />}

        {/* markedslinjen tegnes */}
        {lineP > 0.004 && (
          <path
            d={M_PATH}
            stroke="rgba(235,232,245,0.55)" strokeWidth="0.35" strokeLinecap="round"
            strokeDasharray="95" strokeDashoffset={(95 * (1 - lineP)).toFixed(2)}
          />
        )}

        {/* sammenlignbare boliger */}
        {M_DOTS.map((d, i) => {
          const p = easeOutCubic(seg(t, 1.4 + i * 0.18, 1.8 + i * 0.18));
          if (p <= 0.01) return null;
          return <circle key={i} cx={d.x} cy={d.y} r={(0.75 * p).toFixed(2)} fill={`rgba(235,232,245,${(0.5 * p).toFixed(2)})`} />;
        })}

        {/* kalibrerings-skann / låst prislinje */}
        {(scanActive || locked) && (
          <line
            x1="10" y1={(locked ? LOCK.y : scanY).toFixed(2)} x2="90" y2={(locked ? LOCK.y : scanY).toFixed(2)}
            stroke={locked ? 'rgba(250,249,253,0.8)' : 'rgba(235,232,245,0.35)'}
            strokeWidth={locked ? 0.3 : 0.22}
            strokeDasharray={locked ? 'none' : '1.4 1.6'}
          />
        )}

        {/* glød i låsepunktet */}
        {locked && (
          <circle cx={LOCK.x} cy={LOCK.y} r={(1.1 * Math.min(lockPop, 1.1)).toFixed(2)} fill="rgba(250,249,253,0.9)" />
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
            background: 'rgba(21,20,25,0.95)',
            border: `1px solid ${locked ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.16)'}`,
            boxShadow: `0 ${u(1)} ${u(3)} rgba(0,0,0,0.5)`,
            opacity: tagP.toFixed(2),
            transition: 'border 0.3s',
          }}
        >
          <span className="font-body font-semibold" style={{ fontSize: u(1.9), color: locked ? 'rgba(126,226,168,0.95)' : 'rgba(253,252,251,0.85)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(locked ? 25500 : scanPrice)} kr
          </span>
        </div>
      )}

      {/* «Kalibrerer» -etikett */}
      {kalibLabel > 0.01 && (
        <div className="absolute flex items-center" style={{ right: u(10), top: u(8.2), gap: u(1.2), opacity: kalibLabel.toFixed(2) }}>
          <span
            className="inline-flex rounded-full"
            style={{ width: u(1.2), height: u(1.2), background: 'rgba(235,232,245,0.7)', opacity: (Math.sin(t * 6) > 0 ? 1 : 0.3) }}
          />
          <span className="font-body uppercase" style={{ fontSize: u(1.7), letterSpacing: '0.3em', color: 'rgba(253,252,251,0.45)' }}>
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
            transform: `translate(-50%, -50%) scale(${(1.9 - 0.9 * Math.min(lockPop, 1)).toFixed(3)})`,
            opacity: Math.min(lockPop * 1.4, 1).toFixed(2),
          }}
        >
          <span style={corner('tl')} />
          <span style={corner('tr')} />
          <span style={corner('bl')} />
          <span style={corner('br')} />
        </span>
      )}

      <Stinger t={t} at={5.5} label="Pris kalibrert" value="25 500 kr/mnd" valueSize={5.2} sub="Justeres løpende mot markedet" />
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

export function SceneLeietaker({ t }) {
  const beamP = easeInOutCubic(seg(t, 1.4, 3.0));
  const beamX = 4 + 92 * beamP;
  const beamOn = beamP > 0.001 && beamP < 0.999;
  const mvP = easeInOutCubic(seg(t, 3.4, 4.1));
  const sigP = easeInOutCubic(seg(t, 5.8, 6.8));

  return (
    <div className="absolute inset-0">
      {/* skannelys */}
      {beamOn && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: u(beamX - 5), top: 0, bottom: 0, width: u(10),
            background: 'linear-gradient(90deg, transparent, rgba(235,232,245,0.10) 45%, rgba(250,249,253,0.16) 50%, rgba(235,232,245,0.10) 55%, transparent)',
            mixBlendMode: 'screen',
            opacity: Math.sin(beamP * Math.PI).toFixed(2),
          }}
        />
      )}

      {/* søkerkort */}
      {APPLICANTS.map((a, i) => {
        const inP = easeOutBack(seg(t, 0.2 + i * 0.25, 0.85 + i * 0.25));
        if (inP <= 0.004) return null;
        const spin = Math.max(0, seg(t, a.verdictAt - 0.5, a.verdictAt)) * (t < a.verdictAt ? 1 : 0);
        const rej = a.chosen ? 0 : easeOutCubic(seg(t, a.verdictAt, a.verdictAt + 0.4));
        const glow = a.chosen ? easeOutCubic(seg(t, a.verdictAt, a.verdictAt + 0.4)) : 0;
        const ex = a.chosen ? 0 : easeInOutCubic(seg(t, 3.4, 4.0));
        const x = a.chosen ? 50 - 20 * mvP : a.x;
        const sc = (Math.max(0.6, Math.min(inP, 1.05)) * (a.chosen ? 1 + 0.1 * mvP : 1)).toFixed(3);
        return (
          <div
            key={a.name}
            className="absolute flex flex-col items-center"
            style={{
              left: u(x), top: u(26),
              width: u(22), padding: `${u(2.2)} ${u(2)}`,
              borderRadius: u(2.2),
              background: 'rgba(21,20,25,0.92)',
              border: `1px solid ${glow > 0.05 ? `rgba(52,211,153,${(0.45 * glow).toFixed(2)})` : 'rgba(255,255,255,0.12)'}`,
              boxShadow: `0 ${u(1.6)} ${u(4.5)} rgba(0,0,0,0.5)${glow > 0.05 ? `, 0 0 ${u(3.5)} rgba(52,211,153,${(0.18 * glow).toFixed(2)})` : ''}`,
              transform: `translate(-50%, -50%) translateY(${u((1 - Math.min(inP, 1)) * 6 + ex * 5)}) scale(${sc})`,
              opacity: (Math.min(inP * 1.4, 1) * (1 - 0.62 * rej) * (1 - ex)).toFixed(2),
              filter: rej > 0.02 ? `grayscale(${rej.toFixed(2)})` : 'none',
              transition: 'border 0.4s, box-shadow 0.4s',
            }}
          >
            <span className="relative inline-flex">
              <span
                className="inline-flex items-center justify-center rounded-full font-heading font-bold"
                style={{
                  width: u(6), height: u(6), fontSize: u(2.2),
                  background: 'rgba(235,232,245,0.10)', color: 'rgba(253,252,251,0.85)',
                  border: '1px solid rgba(255,255,255,0.12)',
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
                    border: '1.4px solid rgba(255,255,255,0.10)',
                    borderTopColor: 'rgba(255,255,255,0.75)',
                    transform: `rotate(${((t * 540) % 360).toFixed(0)}deg)`,
                    opacity: spin.toFixed(2),
                  }}
                />
              )}
            </span>
            <p className="font-body font-medium" style={{ fontSize: u(2.05), color: 'rgba(253,252,251,0.88)', marginTop: u(1.4), whiteSpace: 'nowrap' }}>
              {a.name}
            </p>
            <span style={{ display: 'block', width: '74%', height: u(0.9), borderRadius: u(0.5), background: 'rgba(235,232,245,0.10)', marginTop: u(1.4) }} />
            <span style={{ display: 'block', width: '52%', height: u(0.9), borderRadius: u(0.5), background: 'rgba(235,232,245,0.07)', marginTop: u(0.8) }} />
            {!a.chosen && rej > 0.3 && (
              <span
                className="absolute inline-flex items-center justify-center rounded-full"
                style={{
                  top: u(-1), right: u(-1), width: u(2.8), height: u(2.8),
                  background: 'rgba(14,13,17,0.95)', border: '1px solid rgba(255,255,255,0.18)',
                  color: 'rgba(253,252,251,0.5)', fontSize: u(1.6),
                }}
              >
                –
              </span>
            )}
            {a.chosen && glow > 0.3 && (
              <span className="absolute" style={{ top: u(-1), right: u(-1) }}>
                <Tick size={2.8} />
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
            left: u(30), top: u(26), width: u(34), height: u(30),
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(235,232,245,0.05), transparent 70%)',
            opacity: mvP.toFixed(2),
          }}
        />
      )}

      {/* sjekkliste */}
      {CHECKS.map((c, i) => {
        const at = 4.3 + i * 0.45;
        const p = easeOutCubic(seg(t, at, at + 0.45));
        if (p <= 0.004) return null;
        return (
          <div
            key={c}
            className="absolute flex items-center"
            style={{
              left: u(52), top: u(15 + i * 7), gap: u(1.6),
              opacity: p.toFixed(2),
              transform: `translateX(${u((1 - p) * 3)})`,
            }}
          >
            <Tick size={3} />
            <span className="font-body font-medium" style={{ fontSize: u(2.3), color: 'rgba(253,252,251,0.85)', whiteSpace: 'nowrap' }}>
              {c}
            </span>
          </div>
        );
      })}

      {/* signatur */}
      {sigP > 0.004 && (
        <div className="absolute" style={{ left: u(52), top: u(38) }}>
          <svg viewBox="0 0 56 24" fill="none" style={{ width: u(22), height: u(9.4) }} aria-hidden="true">
            <path
              d={SIG_PATH}
              stroke="rgba(250,249,253,0.85)" strokeWidth="1.1" strokeLinecap="round"
              strokeDasharray="92" strokeDashoffset={(92 * (1 - sigP)).toFixed(2)}
            />
          </svg>
          <div style={{ width: u(24), height: 1, background: 'linear-gradient(90deg, rgba(235,232,245,0.3), transparent)', marginTop: u(0.6) }} />
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
  { at: 1.0, from: [-14, 9], time: '23:42', text: 'Lekkasje på badet', icon: Droplets },
  { at: 1.95, from: [116, 13], time: '09:14', text: 'Visning booket', icon: CalendarRange },
  { at: 2.9, from: [-16, 44], time: '14:02', text: 'Purring sendt', icon: BellRing },
  { at: 3.8, from: [118, 48], time: '17:48', text: 'Spørsmål om depositum', icon: MessageCircle },
  { at: 4.7, from: [50, 84], time: '21:05', text: 'Håndverker bestilt', icon: Wrench },
];

export function SceneHverdag({ t }) {
  const ringIn = easeOutBack(seg(t, 0.2, 0.9));
  const calm = easeInOutCubic(seg(t, 6.1, 6.9));
  let pulse = 0;
  let count = 0;
  let lastAb = -1;
  NOTIFS.forEach((n) => {
    pulse = Math.max(pulse, Math.sin(clamp01(seg(t, n.at + 0.92, n.at + 1.25)) * Math.PI));
    if (t > n.at + 0.92) {
      count += 1;
      lastAb = Math.max(lastAb, n.at + 0.92);
    }
  });
  const countPop = lastAb > 0 ? easeOutBack(seg(t, lastAb, lastAb + 0.35)) : 0;

  const ringScale = (Math.max(0.5, Math.min(ringIn, 1.04)) * (1 + 0.05 * pulse)).toFixed(3);
  const ringOp = (Math.min(ringIn * 1.3, 1) * (1 - 0.5 * calm)).toFixed(2);

  return (
    <div className="absolute inset-0">
      {/* skjold-ringen */}
      <div
        className="absolute rounded-full"
        style={{
          left: u(C.x), top: u(C.y), width: u(RING_R * 2), height: u(RING_R * 2),
          transform: `translate(-50%, -50%) scale(${ringScale})`,
          border: `1px solid rgba(235,232,245,${(0.3 + 0.3 * pulse).toFixed(2)})`,
          boxShadow: `0 0 ${u(3 + 3 * pulse)} rgba(235,232,245,${(0.10 + 0.16 * pulse).toFixed(2)}), inset 0 0 ${u(3)} rgba(235,232,245,0.06)`,
          opacity: ringOp,
        }}
      />
      {/* roterende radar-segment */}
      <div
        className="absolute rounded-full"
        style={{
          left: u(C.x), top: u(C.y), width: u(RING_R * 2.8), height: u(RING_R * 2.8),
          transform: `translate(-50%, -50%) rotate(${((t * 24) % 360).toFixed(1)}deg)`,
          border: '1px dashed rgba(235,232,245,0.10)',
          borderTopColor: 'rgba(235,232,245,0.28)',
          opacity: (Math.min(ringIn, 1) * (1 - 0.55 * calm)).toFixed(2),
        }}
      />
      {/* hus i sentrum */}
      <svg className="absolute" viewBox="0 0 20 16" fill="none" style={{ left: u(C.x), top: u(C.y), width: u(10), height: u(8), transform: 'translate(-50%, -52%)', opacity: (Math.min(ringIn * 1.2, 1) * (1 - 0.35 * calm)).toFixed(2) }} aria-hidden="true">
        <path d="M4 14 L4 7.5 L10 3 L16 7.5 L16 14 Z" stroke={`rgba(250,249,253,${(0.75 + 0.25 * pulse).toFixed(2)})`} strokeWidth="0.7" strokeLinejoin="round" />
        <circle cx="10" cy="8.2" r="1.1" stroke="rgba(250,249,253,0.6)" strokeWidth="0.5" />
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
              border: `1px solid rgba(235,232,245,${(Math.sin(rp * Math.PI) * 0.35).toFixed(2)})`,
            }}
          />
        );
      })}

      {/* varsler som absorberes */}
      {NOTIFS.map((n) => {
        const p = seg(t, n.at, n.at + 1.05);
        if (p <= 0.001 || p >= 0.999) return null;
        const pe = p * p * (3 - 2 * p) * p;
        const dx = C.x - n.from[0], dy = C.y - n.from[1];
        const len = Math.hypot(dx, dy);
        const tx = C.x - (dx / len) * (RING_R + 2);
        const ty = C.y - (dy / len) * (RING_R + 2);
        const x = n.from[0] + (tx - n.from[0]) * pe;
        const y = n.from[1] + (ty - n.from[1]) * pe;
        const absorbed = clamp01((p - 0.86) / 0.14);
        const Icon = n.icon;
        return (
          <div
            key={n.text}
            className="absolute flex items-center"
            style={{
              left: u(x), top: u(y),
              transform: `translate(-50%, -50%) scale(${(1 - 0.6 * absorbed).toFixed(2)})`,
              gap: u(1.1), padding: `${u(0.9)} ${u(1.7)}`, borderRadius: u(2.8),
              background: 'rgba(21,20,25,0.95)',
              border: '1px solid rgba(255,255,255,0.13)',
              boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(0,0,0,0.55)`,
              opacity: (Math.min(seg(t, n.at, n.at + 0.2) * 1.5, 1) * (1 - absorbed)).toFixed(2),
              whiteSpace: 'nowrap',
            }}
          >
            <span
              className="inline-flex items-center justify-center rounded-full shrink-0"
              style={{ width: u(3), height: u(3), background: 'rgba(235,232,245,0.09)' }}
            >
              <Icon style={{ width: u(1.7), height: u(1.7), color: 'rgba(253,252,251,0.7)' }} strokeWidth={1.8} />
            </span>
            <span className="font-body" style={{ fontSize: u(1.65), color: 'rgba(253,252,251,0.4)' }}>{n.time}</span>
            <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.85)' }}>{n.text}</span>
          </div>
        );
      })}

      {/* håndtert-teller */}
      {count > 0 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(64), top: u(11), gap: u(1.2),
            padding: `${u(0.9)} ${u(1.9)}`, borderRadius: u(2.8),
            background: 'rgba(21,20,25,0.92)', border: '1px solid rgba(255,255,255,0.12)',
            transform: `scale(${(1 + 0.07 * Math.sin(clamp01(countPop) * Math.PI)).toFixed(3)})`,
            opacity: (1 - 0.45 * calm).toFixed(2),
          }}
        >
          <span className="inline-flex rounded-full" style={{ width: u(1.2), height: u(1.2), background: '#34d399', boxShadow: `0 0 ${u(1.4)} rgba(52,211,153,0.8)` }} />
          <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.7)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            Håndtert av autopiloten · <span style={{ color: '#FDFCFB', fontWeight: 600 }}>{count}</span>
          </span>
        </div>
      )}

      <Stinger t={t} at={6.9} label="Leie mottatt" value="25 000 kr" valueSize={6} sub="Du hørte ingenting. Slik skal det være." />
    </div>
  );
}
