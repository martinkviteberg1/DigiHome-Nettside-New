'use client';

/*
  ChapterScenes — fire kinematiske scener for «Autopiloten i praksis».
  Samme designspråk som HeroLoop: platina på mørkt teppe + grønn telemetri.
  Koordinatsystem: 100 x 76 enheter (--u = 1 % av scenens bredde).
*/

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

/* ============================================================
   KAPITTEL 1 — ANNONSEN SKRIVER SEG SELV
   ============================================================ */
const AD_TITLE = 'Lys 3-roms ved Møhlenpris';
const AD_PHOTOS = ['/interior-living.webp', '/interior-kitchen.webp', '/interior-bedroom.webp'];
const AD_CHIPS = [
  { label: 'Finn.no', y: 19 },
  { label: 'Airbnb', y: 33 },
  { label: 'Hybel.no', y: 47 },
];
const chipAt = (i) => 4.9 + i * 0.8;

export function SceneAnnonse({ t }) {
  const panelIn = easeOutCubic(seg(t, 0.15, 0.8));
  const chars = Math.floor(seg(t, 0.8, 2.4) * AD_TITLE.length);
  const caretOn = t > 0.7 && t < 2.7 && Math.sin(t * 9) > -0.2;
  const metaP = easeOutCubic(seg(t, 2.5, 3.0));
  const statusP = easeOutCubic(seg(t, 7.3, 7.9));

  return (
    <div className="absolute inset-0">
      {/* dokumentpanelet */}
      <div
        className="absolute"
        style={{
          left: u(8), top: u(7), width: u(52),
          borderRadius: u(2.4), padding: u(3),
          background: 'rgba(21,20,25,0.92)',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: `0 ${u(2)} ${u(6)} rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
          opacity: panelIn.toFixed(2),
          transform: `translateY(${u((1 - panelIn) * 5)})`,
        }}
      >
        {/* fotostripe */}
        <div className="flex" style={{ gap: u(1.4) }}>
          {AD_PHOTOS.map((src, i) => {
            const p = easeOutBack(seg(t, 3.6 + i * 0.35, 4.25 + i * 0.35));
            return (
              <div
                key={src}
                className="relative overflow-hidden"
                style={{
                  width: u(14.4), height: u(10.5), borderRadius: u(1.2),
                  opacity: Math.min(p * 1.4, 1).toFixed(2),
                  transform: `scale(${Math.max(0.6, Math.min(p, 1.06)).toFixed(3)})`,
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

        {/* tittel — typewriter */}
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
            const p = easeInOutCubic(seg(t, 2.9 + i * 0.3, 3.55 + i * 0.3));
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

      {/* publiserings-linjer + puls (SVG) */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 76" fill="none" aria-hidden="true">
        {AD_CHIPS.map((c, i) => {
          const at = chipAt(i);
          const lineP = easeInOutCubic(seg(t, at, at + 0.4));
          if (lineP <= 0.004) return null;
          const x1 = 61, y1 = 33, x2 = 72, y2 = c.y + 3;
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

      {/* status */}
      {statusP > 0.01 && (
        <div
          className="absolute flex items-center justify-center"
          style={{ left: 0, right: 0, top: u(68), gap: u(1.3), opacity: statusP.toFixed(2), transform: `translateY(${u((1 - statusP) * 1.5)})` }}
        >
          <span className="inline-flex rounded-full" style={{ width: u(1.3), height: u(1.3), background: '#34d399', boxShadow: `0 0 ${u(1.5)} rgba(52,211,153,0.8)` }} />
          <span className="font-body uppercase" style={{ fontSize: u(1.8), letterSpacing: '0.32em', color: 'rgba(253,252,251,0.5)' }}>
            Publisert · 3 plattformer
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   KAPITTEL 2 — PRISEN KALIBRERES MOT MARKEDET
   ============================================================ */
const M_PATH = 'M10 46 C 22 44, 30 41, 42 38 C 54 35, 64 32, 74 29 C 80 27.5, 85 26.8, 90 26';
const M_AREA = `${M_PATH} L 90 56 L 10 56 Z`;
const M_DOTS = [
  { x: 18, y: 43.6 }, { x: 30, y: 41 }, { x: 42, y: 38 },
  { x: 55, y: 34.7 }, { x: 68, y: 30.9 }, { x: 80, y: 27.7 },
];
const LOCK = { x: 74, y: 29 };

export function ScenePris({ t }) {
  const gridP = easeOutCubic(seg(t, 0.2, 0.9));
  const lineP = easeInOutCubic(seg(t, 0.7, 2.4));
  const areaP = easeOutCubic(seg(t, 2.0, 2.9));
  const scanWin = seg(t, 3.0, 4.6);
  const scanActive = scanWin > 0.001 && scanWin < 0.999;
  const decay = 1 - easeInOutCubic(scanWin);
  const scanY = LOCK.y + 8.5 * Math.sin((t - 3.0) * 5.2) * decay;
  const locked = t >= 4.6;
  const lockPop = easeOutBack(seg(t, 4.6, 5.0));
  const priceP = easeOutCubic(seg(t, 4.9, 6.0));
  const price = 23000 + 2500 * priceP;
  const showPrice = t > 4.75;
  const subP = easeOutCubic(seg(t, 6.1, 6.6));
  const chipP = easeOutBack(seg(t, 6.6, 7.0));
  const kalibLabel = seg(t, 3.0, 3.3) * (1 - seg(t, 4.4, 4.7));

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
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 76" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="dhAreaFill" x1="0" y1="20" x2="0" y2="56" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#EBE8F5" stopOpacity="0.10" />
            <stop offset="1" stopColor="#EBE8F5" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* rutenett */}
        {[24, 35, 46].map((y) => (
          <line key={y} x1="10" y1={y} x2="90" y2={y} stroke={`rgba(235,232,245,${(0.05 * gridP).toFixed(3)})`} strokeWidth="0.16" strokeDasharray="0.8 2" />
        ))}
        <line x1="10" y1="56" x2="90" y2="56" stroke={`rgba(235,232,245,${(0.14 * gridP).toFixed(3)})`} strokeWidth="0.2" />

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
          const p = easeOutCubic(seg(t, 1.6 + i * 0.18, 2.0 + i * 0.18));
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

      {/* «Kalibrerer» -etikett */}
      {kalibLabel > 0.01 && (
        <div className="absolute flex items-center" style={{ right: u(10), top: u(10), gap: u(1.2), opacity: kalibLabel.toFixed(2) }}>
          <span
            className="inline-flex rounded-full"
            style={{ width: u(1.2), height: u(1.2), background: 'rgba(235,232,245,0.7)', opacity: (Math.sin(t * 6) > 0 ? 1 : 0.3) }}
          />
          <span className="font-body uppercase" style={{ fontSize: u(1.75), letterSpacing: '0.32em', color: 'rgba(253,252,251,0.45)' }}>
            Kalibrerer mot markedet
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

      {/* prisavlesning */}
      {showPrice && (
        <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(58) }}>
          <span className="font-heading font-bold inline-flex items-baseline" style={{ fontSize: u(5.8), color: '#FDFCFB', fontVariantNumeric: 'tabular-nums', opacity: Math.min(seg(t, 4.75, 5.1) * 1.4, 1).toFixed(2) }}>
            {fmt(price)}
            <span style={{ fontSize: u(3.2), marginLeft: '0.2em', color: 'rgba(253,252,251,0.75)' }}>kr/mnd</span>
          </span>
          {subP > 0.01 && (
            <p className="font-body" style={{ fontSize: u(1.95), color: 'rgba(253,252,251,0.45)', marginTop: u(1), opacity: subP.toFixed(2) }}>
              Kalibrert mot sammenlignbare boliger i Bergen
            </p>
          )}
        </div>
      )}

      {/* låst-chip */}
      {chipP > 0.01 && (
        <div
          className="absolute flex items-center"
          style={{
            left: '50%', top: u(71.5),
            transform: `translateX(-50%) scale(${Math.max(0.6, Math.min(chipP, 1.08)).toFixed(3)})`,
            gap: u(1.2), padding: `${u(0.9)} ${u(2.2)}`, borderRadius: u(3),
            background: 'rgba(16,28,22,0.9)', border: '1px solid rgba(52,211,153,0.35)',
            opacity: Math.min(chipP * 1.4, 1).toFixed(2),
          }}
        >
          <Tick size={2.4} />
          <span className="font-body font-medium" style={{ fontSize: u(1.95), color: 'rgba(126,226,168,0.92)', whiteSpace: 'nowrap' }}>
            Optimal pris låst
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   KAPITTEL 3 — LEIETAKEREN VERIFISERES GRUNDIG
   ============================================================ */
const APPLICANTS = [
  { x: 26, init: 'AH', name: 'A. Hansen', verdictAt: 2.05 },
  { x: 50, init: 'MB', name: 'M. Berg', verdictAt: 2.5, chosen: true },
  { x: 74, init: 'KS', name: 'K. Solheim', verdictAt: 2.95 },
];
const CHECKS = ['BankID-verifisert', 'Inntekt dokumentert', 'Referanser sjekket'];
const SIG_PATH = 'M2 18 C8 2, 14 26, 20 10 S30 4, 34 14 S44 22, 52 8';

export function SceneLeietaker({ t }) {
  const beamP = easeInOutCubic(seg(t, 1.5, 3.1));
  const beamX = 4 + 92 * beamP;
  const beamOn = beamP > 0.001 && beamP < 0.999;
  const mvP = easeInOutCubic(seg(t, 3.5, 4.2));
  const sigP = easeInOutCubic(seg(t, 6.4, 7.4));
  const capP = easeOutCubic(seg(t, 7.5, 8.0));

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
        const rej = a.chosen ? 0 : easeOutCubic(seg(t, a.verdictAt, a.verdictAt + 0.4));
        const glow = a.chosen ? easeOutCubic(seg(t, a.verdictAt, a.verdictAt + 0.4)) : 0;
        const ex = a.chosen ? 0 : easeInOutCubic(seg(t, 3.5, 4.1));
        const x = a.chosen ? 50 - 20 * mvP : a.x;
        const sc = (Math.max(0.6, Math.min(inP, 1.05)) * (a.chosen ? 1 + 0.1 * mvP : 1)).toFixed(3);
        return (
          <div
            key={a.name}
            className="absolute flex flex-col items-center"
            style={{
              left: u(x), top: u(28),
              width: u(22), padding: `${u(2.2)} ${u(2)}`,
              borderRadius: u(2.2),
              background: 'rgba(21,20,25,0.92)',
              border: `1px solid ${glow > 0.05 ? `rgba(52,211,153,${(0.45 * glow).toFixed(2)})` : 'rgba(255,255,255,0.12)'}`,
              boxShadow: `0 ${u(1.6)} ${u(4.5)} rgba(0,0,0,0.5)${glow > 0.05 ? `, 0 0 ${u(3)} rgba(52,211,153,${(0.16 * glow).toFixed(2)})` : ''}`,
              transform: `translate(-50%, -50%) translateY(${u((1 - Math.min(inP, 1)) * 6 + ex * 5)}) scale(${sc})`,
              opacity: (Math.min(inP * 1.4, 1) * (1 - 0.62 * rej) * (1 - ex)).toFixed(2),
              filter: rej > 0.02 ? `grayscale(${rej.toFixed(2)})` : 'none',
              transition: 'border 0.4s, box-shadow 0.4s',
            }}
          >
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
            <p className="font-body font-medium" style={{ fontSize: u(2.05), color: 'rgba(253,252,251,0.88)', marginTop: u(1.4), whiteSpace: 'nowrap' }}>
              {a.name}
            </p>
            <span style={{ display: 'block', width: '74%', height: u(0.9), borderRadius: u(0.5), background: 'rgba(235,232,245,0.10)', marginTop: u(1.4) }} />
            <span style={{ display: 'block', width: '52%', height: u(0.9), borderRadius: u(0.5), background: 'rgba(235,232,245,0.07)', marginTop: u(0.8) }} />
            {/* verdikt-merke */}
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

      {/* sjekkliste */}
      {CHECKS.map((c, i) => {
        const at = 4.5 + i * 0.5;
        const p = easeOutCubic(seg(t, at, at + 0.45));
        if (p <= 0.004) return null;
        return (
          <div
            key={c}
            className="absolute flex items-center"
            style={{
              left: u(52), top: u(17 + i * 7.4), gap: u(1.6),
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

      {/* signatur + kontrakt */}
      {sigP > 0.004 && (
        <div className="absolute" style={{ left: u(52), top: u(43) }}>
          <svg width="100%" height="100%" viewBox="0 0 56 24" fill="none" style={{ width: u(22), height: u(9.4) }} aria-hidden="true">
            <path
              d={SIG_PATH}
              stroke="rgba(250,249,253,0.85)" strokeWidth="1.1" strokeLinecap="round"
              strokeDasharray="92" strokeDashoffset={(92 * (1 - sigP)).toFixed(2)}
            />
          </svg>
          <div style={{ width: u(24), height: 1, background: 'linear-gradient(90deg, rgba(235,232,245,0.3), transparent)', marginTop: u(0.6) }} />
          {capP > 0.01 && (
            <p className="font-body" style={{ fontSize: u(1.95), color: 'rgba(253,252,251,0.5)', marginTop: u(1.2), opacity: capP.toFixed(2), whiteSpace: 'nowrap' }}>
              Kontrakt signert · 12 mnd · BankID
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   KAPITTEL 4 — HVERDAGEN HÅNDTERER VI
   ============================================================ */
const C = { x: 50, y: 28 };
const RING_R = 10;
const NOTIFS = [
  { at: 1.0, from: [-14, 10], time: '23:42', text: 'Lekkasje på badet' },
  { at: 2.0, from: [116, 14], time: '09:14', text: 'Visning booket' },
  { at: 3.0, from: [-16, 46], time: '14:02', text: 'Purring sendt' },
  { at: 3.9, from: [118, 50], time: '17:48', text: 'Spørsmål om depositum' },
  { at: 4.8, from: [50, 84], time: '21:05', text: 'Håndverker bestilt' },
];

export function SceneHverdag({ t }) {
  const ringIn = easeOutBack(seg(t, 0.2, 0.9));
  const calm = easeInOutCubic(seg(t, 6.2, 7.0));
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

  const lineP = easeInOutCubic(seg(t, 6.8, 7.3));
  const labelP = easeOutCubic(seg(t, 7.0, 7.6));
  const amtP = easeOutCubic(seg(t, 7.3, 8.0));
  const check = easeOutBack(seg(t, 8.05, 8.45));
  const subP = easeOutCubic(seg(t, 8.4, 8.9));
  const bloom = Math.sin(clamp01(seg(t, 7.9, 8.9)) * Math.PI);

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
      <div
        className="absolute rounded-full"
        style={{
          left: u(C.x), top: u(C.y), width: u(RING_R * 2.8), height: u(RING_R * 2.8),
          transform: 'translate(-50%, -50%)',
          border: '1px dashed rgba(235,232,245,0.10)',
          opacity: (Math.min(ringIn, 1) * (1 - 0.5 * calm)).toFixed(2),
        }}
      />
      {/* hus i sentrum */}
      <svg className="absolute" viewBox="0 0 20 16" fill="none" style={{ left: u(C.x), top: u(C.y), width: u(10), height: u(8), transform: 'translate(-50%, -52%)', opacity: (Math.min(ringIn * 1.2, 1) * (1 - 0.35 * calm)).toFixed(2) }} aria-hidden="true">
        <path d="M4 14 L4 7.5 L10 3 L16 7.5 L16 14 Z" stroke={`rgba(250,249,253,${(0.75 + 0.25 * pulse).toFixed(2)})`} strokeWidth="0.7" strokeLinejoin="round" />
        <circle cx="10" cy="8.2" r="1.1" stroke="rgba(250,249,253,0.6)" strokeWidth="0.5" />
      </svg>

      {/* varsler som absorberes */}
      {NOTIFS.map((n) => {
        const p = seg(t, n.at, n.at + 1.0);
        if (p <= 0.001 || p >= 0.999) return null;
        const pe = p * p * (3 - 2 * p) * p; // akselererer inn mot skjoldet
        const dx = C.x - n.from[0], dy = C.y - n.from[1];
        const len = Math.hypot(dx, dy);
        const tx = C.x - (dx / len) * (RING_R + 2);
        const ty = C.y - (dy / len) * (RING_R + 2);
        const x = n.from[0] + (tx - n.from[0]) * pe;
        const y = n.from[1] + (ty - n.from[1]) * pe;
        const absorbed = clamp01((p - 0.86) / 0.14);
        return (
          <div
            key={n.text}
            className="absolute flex items-center"
            style={{
              left: u(x), top: u(y),
              transform: `translate(-50%, -50%) scale(${(1 - 0.6 * absorbed).toFixed(2)})`,
              gap: u(1.2), padding: `${u(1)} ${u(1.9)}`, borderRadius: u(2.8),
              background: 'rgba(21,20,25,0.95)',
              border: '1px solid rgba(255,255,255,0.13)',
              boxShadow: `0 ${u(1.2)} ${u(3.5)} rgba(0,0,0,0.55)`,
              opacity: (Math.min(seg(t, n.at, n.at + 0.2) * 1.5, 1) * (1 - absorbed)).toFixed(2),
              whiteSpace: 'nowrap',
            }}
          >
            <span className="font-body" style={{ fontSize: u(1.7), color: 'rgba(253,252,251,0.4)' }}>{n.time}</span>
            <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.85)' }}>{n.text}</span>
          </div>
        );
      })}

      {/* håndtert-teller */}
      {count > 0 && (
        <div
          className="absolute flex items-center"
          style={{
            left: u(64), top: u(12), gap: u(1.2),
            padding: `${u(0.9)} ${u(1.9)}`, borderRadius: u(2.8),
            background: 'rgba(21,20,25,0.92)', border: '1px solid rgba(255,255,255,0.12)',
            transform: `scale(${(1 + 0.07 * Math.sin(clamp01(countPop) * Math.PI)).toFixed(3)})`,
            opacity: (1 - 0.45 * calm).toFixed(2),
          }}
        >
          <span className="inline-flex rounded-full" style={{ width: u(1.2), height: u(1.2), background: '#34d399', boxShadow: `0 0 ${u(1.4)} rgba(52,211,153,0.8)` }} />
          <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.7)', whiteSpace: 'nowrap' }}>
            Håndtert av autopiloten · <span style={{ color: '#FDFCFB', fontWeight: 600 }}>{count}</span>
          </span>
        </div>
      )}

      {/* utbetalingen — ekko av heroen */}
      {lineP > 0.004 && (
        <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(52) }}>
          <span style={{ width: u(28 * lineP), height: 1, background: 'linear-gradient(90deg, transparent, rgba(235,232,245,0.35), transparent)' }} />
          {labelP > 0.01 && (
            <p
              className="font-body uppercase"
              style={{
                fontSize: u(1.75),
                letterSpacing: `${(0.62 - 0.22 * labelP).toFixed(3)}em`,
                color: 'rgba(253,252,251,0.4)',
                marginTop: u(2), opacity: labelP.toFixed(2), transform: `translateY(${u((1 - labelP) * 1.5)})`,
              }}
            >
              Leie mottatt
            </p>
          )}
          {amtP > 0.01 && (
            <div className="relative flex items-center" style={{ gap: u(1.8), marginTop: u(1) }}>
              <span
                className="absolute pointer-events-none"
                style={{
                  inset: u(-6),
                  background: 'radial-gradient(ellipse 62% 62% at 50% 50%, rgba(150,232,186,0.085), rgba(240,237,248,0.05) 48%, transparent 72%)',
                  opacity: bloom.toFixed(2),
                }}
              />
              <span
                className="relative font-heading font-bold inline-flex items-baseline"
                style={{
                  fontSize: u(6), color: '#FDFCFB',
                  opacity: amtP.toFixed(2),
                  transform: `translateY(${u((1 - amtP) * 2)})`,
                }}
              >
                25 000
                <span style={{ fontSize: u(4), marginLeft: '0.18em', color: 'rgba(253,252,251,0.85)' }}>kr</span>
              </span>
              {check > 0.01 && (
                <span className="relative" style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
                  <Tick size={3.6} />
                </span>
              )}
            </div>
          )}
          {subP > 0.01 && (
            <p className="font-body" style={{ fontSize: u(2), color: 'rgba(253,252,251,0.5)', marginTop: u(1.4), opacity: subP.toFixed(2) }}>
              Du hørte ingenting. Slik skal det være.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
