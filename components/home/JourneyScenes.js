'use client';

/*
  JourneyScenes — fire fullskjerms filmscener for «De første 30 dagene».
  PREMIUM-SPRÅK (DigiHome-stil):
    - Kantløse flater: ingen synlige borders/outlines — kun tone + myk skygge
    - Rolige, smoothe bevegelser: kun cubic-easing, ingen overshoot/pop
    - Monokrom palett med presise aksenter (lavendel, dempet smaragd)
    - Ingen spinnere, stempler eller glød-effekter
  Hver scene er deterministisk fra:
    q     — kapittelets lokale fremdrift (0–1), drevet av scroll
    clock — kontinuerlig klokke (kun til diskret puls på LIVE-punkt)
  Koordinatsystem: --u = 1 % av sceneboksens bredde. Boksen er 100 × 70 enheter.
*/

import Image from 'next/image';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic,
} from '@/components/video/filmUtils';

const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;
const LAV = '#CF97FC';

const fmt = (v) => {
  const s = String(Math.round(v));
  return s.length > 3 ? `${s.slice(0, -3)}\u202F${s.slice(-3)}` : s;
};

/* kantløs primærflate */
const surf = (extra = {}) => ({
  background: 'linear-gradient(180deg, #17171D, #111116)',
  boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
  ...extra,
});
/* dempet underflate (rader o.l.) */
const sub = (extra = {}) => ({
  background: 'rgba(255,255,255,0.04)',
  ...extra,
});

const riseIn = (p, d = 2.5) => ({
  opacity: Math.min(1, p * 1.5),
  transform: `translateY(${u((1 - p) * d)})`,
});

/* tynn hake på myk flate — ingen kant */
function Check({ p = 1, size = 3 }) {
  if (p <= 0.01) return null;
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: u(size), height: u(size), borderRadius: '50%',
        background: 'rgba(52,211,153,0.13)',
        opacity: Math.min(1, p * 1.6),
        transform: `scale(${(0.85 + 0.15 * easeOutCubic(p)).toFixed(3)})`,
      }}
    >
      <svg viewBox="0 0 12 12" style={{ width: '58%', height: '58%' }} fill="none">
        <path d="M2.6 6.4 L5 8.7 L9.5 3.6" stroke="#6EE7A8" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

/* nøytralt vente-punkt (før hake) */
function Pending({ size = 3 }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: u(size), height: u(size) }}
    >
      <span style={{ width: u(0.9), height: u(0.9), borderRadius: '50%', background: 'rgba(255,255,255,0.18)' }} />
    </span>
  );
}

/* skjelett-linje som krysstoner til ekte tekst */
function WriteLine({ p, w, children }) {
  return (
    <div className="relative">
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: u(w), height: u(1.5),
          background: 'rgba(255,255,255,0.06)',
          opacity: Math.max(0, 1 - p * 1.9).toFixed(2),
        }}
      />
      <div style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${u((1 - p) * 1)})` }}>
        {children}
      </div>
    </div>
  );
}

/* ============================================================
   DAG 1 — Annonsen skriver seg selv
   ============================================================ */
const PLATFORMS = [
  { name: 'Finn.no', at: 0.5 },
  { name: 'Airbnb', at: 0.6 },
  { name: 'Hybel.no', at: 0.7 },
];

export function SceneAnnonse({ q, clock }) {
  const cardIn = easeOutCubic(seg(q, 0.02, 0.17));
  const rev = easeInOutCubic(seg(q, 0.05, 0.3));
  const l1 = easeOutCubic(seg(q, 0.26, 0.38));
  const l2 = easeOutCubic(seg(q, 0.32, 0.44));
  const l3 = easeOutCubic(seg(q, 0.38, 0.5));
  const panelIn = easeOutCubic(seg(q, 0.42, 0.56));
  const live = easeOutCubic(seg(q, 0.78, 0.88));
  const statP = easeOutCubic(seg(q, 0.86, 0.97));
  const pulse = 0.55 + 0.45 * Math.abs(Math.sin(clock * 2));

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* annonsekortet */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: 0, top: u(1), width: u(58), borderRadius: u(2.4),
          ...surf(),
          opacity: cardIn,
          transform: `translateY(${u((1 - cardIn) * 4)})`,
        }}
      >
        <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9.4' }}>
          <div
            className="absolute inset-0"
            style={{
              clipPath: `inset(0 ${((1 - rev) * 100).toFixed(2)}% 0 0)`,
              transform: `scale(${(1.06 - 0.06 * rev).toFixed(4)})`,
            }}
          >
            <Image src="/interior-living.webp" alt="" fill sizes="40vw" className="object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(200deg, transparent 60%, rgba(8,6,12,0.35))' }} />
          </div>
          {rev > 0.02 && rev < 0.985 && (
            <span
              className="absolute top-0 bottom-0"
              style={{
                left: `${(rev * 100).toFixed(2)}%`, width: 1,
                background: 'rgba(255,255,255,0.35)',
              }}
            />
          )}
          {live > 0.02 && (
            <span
              className="absolute inline-flex items-center"
              style={{
                left: u(2.2), top: u(2), gap: u(1.1),
                padding: `${u(0.9)} ${u(1.9)}`, borderRadius: 999,
                background: 'rgba(8,8,12,0.72)',
                backdropFilter: 'blur(6px)',
                opacity: live,
              }}
            >
              <span style={{ width: u(1), height: u(1), borderRadius: '50%', background: '#34D399', opacity: pulse }} />
              <span className="font-body font-semibold uppercase" style={{ fontSize: u(1.6), letterSpacing: '0.24em', color: 'rgba(255,255,255,0.92)' }}>Live</span>
            </span>
          )}
        </div>
        <div style={{ padding: `${u(2.8)} ${u(3.2)} ${u(3)}`, display: 'flex', flexDirection: 'column', gap: u(1.8) }}>
          <WriteLine p={l1} w={40}>
            <p className="font-heading font-bold" style={{ fontSize: u(3), color: 'rgba(253,252,251,0.94)', lineHeight: 1.15 }}>
              Lys 3-roms med utsikt mot Byfjorden
            </p>
          </WriteLine>
          <WriteLine p={l2} w={29}>
            <p className="font-body" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.45)' }}>
              Sandviken · 74 m² · 3. etasje · Møblert
            </p>
          </WriteLine>
          <WriteLine p={l3} w={23}>
            <div className="flex items-baseline" style={{ gap: u(1.4), marginTop: u(0.4) }}>
              <p className="font-heading font-bold" style={{ fontSize: u(3.2), color: 'rgba(253,252,251,0.94)' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{'24\u202F800'}</span> kr
              </p>
              <span className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.38)' }}>/ mnd · satt av autopiloten</span>
            </div>
          </WriteLine>
        </div>
      </div>

      {/* publiserings-panel */}
      <div
        className="absolute"
        style={{
          left: u(63), top: u(7), width: u(37), borderRadius: u(2.4),
          padding: `${u(2.6)} ${u(2.8)}`,
          ...surf(),
          opacity: panelIn,
          transform: `translateY(${u((1 - panelIn) * 4)})`,
        }}
      >
        <p className="font-body font-semibold uppercase" style={{ fontSize: u(1.6), letterSpacing: '0.3em', color: 'rgba(253,252,251,0.35)', marginBottom: u(2.2) }}>
          Publisering
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(1.4) }}>
          {PLATFORMS.map((pf) => {
            const okP = easeOutCubic(seg(q, pf.at, pf.at + 0.08));
            return (
              <div
                key={pf.name}
                className="flex items-center"
                style={{ gap: u(1.8), padding: `${u(1.5)} ${u(1.9)}`, borderRadius: u(1.6), ...sub() }}
              >
                <span className="flex-1 font-body font-medium" style={{ fontSize: u(2.2), color: 'rgba(253,252,251,0.82)' }}>{pf.name}</span>
                <span
                  className="font-body"
                  style={{ fontSize: u(1.8), color: 'rgba(253,252,251,0.4)', opacity: okP, transform: `translateX(${u((1 - okP) * 1.2)})` }}
                >
                  Publisert
                </span>
                {okP > 0.01 ? <Check p={okP} size={3} /> : <Pending size={3} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* resultatlinje — ren tekst, ingen boks */}
      {statP > 0.01 && (
        <div
          className="absolute flex items-center"
          style={{ left: u(1), top: u(62.5), gap: u(1.7), ...riseIn(statP, 2) }}
        >
          <Check p={statP} size={3.1} />
          <span className="font-body" style={{ fontSize: u(2.2), color: 'rgba(253,252,251,0.55)' }}>
            <span style={{ color: 'rgba(253,252,251,0.9)', fontWeight: 600 }}>12 henvendelser</span>
            {' '}og første visning booket — innen ett døgn
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DAG 4 — Prisen finner seg selv
   ============================================================ */
const PTS = [
  [3, 52], [11, 49], [19, 53], [27, 45], [35, 48], [43, 40],
  [51, 44], [59, 35], [67, 38.5], [75, 30], [83, 33], [91, 26.5], [97, 25.5],
];

const smoothPath = (pts) => {
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const xc = (pts[i][0] + pts[i + 1][0]) / 2;
    const yc = (pts[i][1] + pts[i + 1][1]) / 2;
    d += ` Q ${pts[i][0]} ${pts[i][1]} ${xc.toFixed(2)} ${yc.toFixed(2)}`;
  }
  const L = pts[pts.length - 1];
  d += ` L ${L[0]} ${L[1]}`;
  return d;
};
const LINE_D = smoothPath(PTS);
const AREA_D = `${LINE_D} L 97 66 L 3 66 Z`;

const lineAt = (f) => {
  const x = 3 + 94 * clamp01(f);
  for (let i = 0; i < PTS.length - 1; i++) {
    if (x <= PTS[i + 1][0]) {
      const lt = (x - PTS[i][0]) / (PTS[i + 1][0] - PTS[i][0]);
      return [x, PTS[i][1] + (PTS[i + 1][1] - PTS[i][1]) * lt];
    }
  }
  return PTS[PTS.length - 1];
};

export function ScenePris({ q }) {
  const gridP = easeOutCubic(seg(q, 0.03, 0.18));
  const drawP = easeInOutCubic(seg(q, 0.07, 0.54));
  const zoneP = easeOutCubic(seg(q, 0.5, 0.64));
  const lockP = easeOutCubic(seg(q, 0.58, 0.7));
  const lblP = easeOutCubic(seg(q, 0.68, 0.8));
  const srcP = easeOutCubic(seg(q, 0.82, 0.94));
  const [cx, cy] = lineAt(drawP);
  const price = 21400 + 3400 * drawP;
  const locked = lockP > 0.5;

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <svg viewBox="0 0 100 70" className="absolute inset-0 h-full w-full overflow-visible">
        {[18, 34, 50].map((y) => (
          <line
            key={y} x1="3" x2="97" y1={y} y2={y}
            stroke="rgba(255,255,255,0.06)" mask="url(#dh-areamask)"
            vectorEffect="non-scaling-stroke" style={{ opacity: gridP }}
          />
        ))}
        {/* optimal-nivå: myk sone uten kanter */}
        <rect
          x="66" y="19" width="31" height="14"
          fill="url(#dh-zonegrad)"
          style={{ opacity: zoneP }}
        />
        <g mask="url(#dh-areamask)">
          <path d={AREA_D} fill="url(#dh-areagrad)" mask="url(#dh-arearev)" style={{ opacity: 0.4 * Math.min(1, drawP * 1.4) }} />
        </g>
        <defs>
          <clipPath id="dh-lineclip">
            <rect x="0" y="0" width={(3 + 94.5 * drawP).toFixed(2)} height="70" />
          </clipPath>
          <linearGradient id="dh-headfade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.8" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id="dh-arearev">
            <rect x="0" y="0" width={(3 + 96 * drawP).toFixed(2)} height="70" fill="url(#dh-headfade)" />
          </mask>
          <linearGradient id="dh-areagrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(155,91,214,0.18)" />
            <stop offset="100%" stopColor="rgba(155,91,214,0)" />
          </linearGradient>
          <linearGradient id="dh-fadex" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#000" />
            <stop offset="0.16" stopColor="#fff" />
            <stop offset="0.84" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id="dh-areamask">
            <rect x="0" y="0" width="100" height="70" fill="url(#dh-fadex)" />
          </mask>
          <radialGradient id="dh-zonegrad" cx="0.5" cy="0.5" r="0.62">
            <stop offset="0%" stopColor="rgba(155,91,214,0.13)" />
            <stop offset="100%" stopColor="rgba(155,91,214,0)" />
          </radialGradient>
        </defs>
        <path
          d={LINE_D} fill="none" stroke="rgba(207,151,252,0.8)" strokeWidth="1.4"
          strokeLinecap="round" vectorEffect="non-scaling-stroke"
          clipPath="url(#dh-lineclip)"
          style={{ opacity: Math.min(1, drawP * 6) }}
        />
      </svg>

      {/* akse-etiketter */}
      {[[18, '26\u202F000'], [34, '24\u202F000'], [50, '22\u202F000']].map(([y, lbl]) => (
        <span
          key={lbl} className="absolute font-body"
          style={{
            left: 0, top: `calc(${(y / 70 * 100).toFixed(2)}% - ${u(3.2)})`,
            fontSize: u(1.7), color: 'rgba(253,252,251,0.32)', fontVariantNumeric: 'tabular-nums',
            opacity: gridP,
          }}
        >
          {lbl}
        </span>
      ))}

      {/* sone-etikett */}
      <span
        className="absolute font-body font-semibold uppercase"
        style={{
          left: '68%', top: `calc(${(19 / 70 * 100).toFixed(2)}% - ${u(3.2)})`,
          fontSize: u(1.5), letterSpacing: '0.26em', color: 'rgba(207,151,252,0.55)',
          opacity: zoneP,
        }}
      >
        Optimalt nivå
      </span>

      {/* pris-chip som rir på linjen */}
      {drawP > 0.02 && (
        <div
          className="absolute"
          style={{
            left: `${cx.toFixed(2)}%`, top: `${(cy / 70 * 100).toFixed(2)}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <span
            className="absolute left-1/2 top-full rounded-full"
            style={{
              width: u(1.6), height: u(1.6), transform: 'translate(-50%, -50%)',
              background: locked ? LAV : 'rgba(255,255,255,0.9)',
              transition: 'background 0.4s ease',
            }}
          />
          <div
            className="flex items-baseline whitespace-nowrap"
            style={{
              gap: u(1), marginBottom: u(2.4), padding: `${u(1.4)} ${u(2.3)}`,
              borderRadius: u(1.8),
              ...surf({ boxShadow: '0 18px 50px rgba(0,0,0,0.5)' }),
            }}
          >
            <span
              className="font-heading font-bold"
              style={{
                fontSize: u(3), fontVariantNumeric: 'tabular-nums',
                color: locked ? '#FDFCFB' : 'rgba(253,252,251,0.75)',
                transition: 'color 0.4s ease',
              }}
            >
              {fmt(price)}
            </span>
            <span className="font-body" style={{ fontSize: u(1.8), color: 'rgba(253,252,251,0.4)' }}>kr/mnd</span>
          </div>
        </div>
      )}

      {/* kalibrert-kvittering */}
      {lblP > 0.01 && (
        <div
          className="absolute flex items-center justify-end"
          style={{ right: u(1), top: '54%', gap: u(1.7), ...riseIn(lblP, 2) }}
        >
          <Check p={lblP} size={3.1} />
          <span className="font-body font-medium" style={{ fontSize: u(2.2), color: 'rgba(253,252,251,0.75)' }}>
            Kalibrert mot Bergen-markedet
          </span>
        </div>
      )}

      {/* kilde-stripe */}
      {srcP > 0.01 && (
        <p
          className="absolute font-body"
          style={{
            left: 0, right: 0, bottom: 0, textAlign: 'center',
            fontSize: u(1.9), color: 'rgba(253,252,251,0.35)', ...riseIn(srcP, 1.5),
          }}
        >
          Basert på 214 sammenlignbare boliger · oppdateres løpende
        </p>
      )}
    </div>
  );
}

/* ============================================================
   DAG 14 — Leietakeren kvalitetssikres
   ============================================================ */
const CHECKS = [
  { label: 'BankID verifisert', at: 0.36 },
  { label: 'Inntekt dokumentert', at: 0.46 },
  { label: 'Referanser sjekket', at: 0.56 },
];

export function SceneLeietaker({ q }) {
  const backL = easeOutCubic(seg(q, 0.04, 0.18));
  const backR = easeOutCubic(seg(q, 0.08, 0.22));
  const front = easeOutCubic(seg(q, 0.12, 0.27));
  const cull = easeInOutCubic(seg(q, 0.66, 0.79));
  const badge = easeOutCubic(seg(q, 0.78, 0.88));
  const score = easeOutCubic(seg(q, 0.87, 0.97));

  const backCard = (p, dirX, rot, name) => ({
    position: 'absolute', left: '50%', top: '47%', width: u(30),
    borderRadius: u(2.2), padding: u(2.6),
    background: 'linear-gradient(180deg, #131318, #0E0E13)',
    boxShadow: '0 22px 60px rgba(0,0,0,0.5)',
    opacity: (Math.min(1, p * 1.5) * (1 - cull * 0.8)).toFixed(2),
    transform: [
      'translate(-50%, -50%)',
      `translateX(${u(dirX * 26)})`,
      `translateY(${u((1 - p) * 5 + cull * 5)})`,
      `rotate(${rot}deg)`,
      `scale(${(0.93 - cull * 0.03).toFixed(3)})`,
    ].join(' '),
  });

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {[{ s: backCard(backL, -1, -5), n: 'Søker 2 av 9' }, { s: backCard(backR, 1, 5), n: 'Søker 3 av 9' }].map((c, i) => (
        <div key={i} style={c.s}>
          <div className="flex items-center" style={{ gap: u(1.7), marginBottom: u(2.2) }}>
            <span style={{ width: u(5), height: u(5), borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <span className="font-body" style={{ fontSize: u(2), color: 'rgba(253,252,251,0.4)' }}>{c.n}</span>
          </div>
          {[17, 12].map((w, j) => (
            <span key={j} className="block rounded-full" style={{ width: u(w), height: u(1.4), background: 'rgba(255,255,255,0.06)', marginBottom: u(1.6) }} />
          ))}
        </div>
      ))}

      {/* hovedkortet */}
      <div
        className="absolute"
        style={{
          left: '50%', top: '47%', width: u(44),
          borderRadius: u(2.6), padding: u(3.2),
          ...surf(),
          opacity: Math.min(1, front * 1.5),
          transform: [
            'translate(-50%, -50%)',
            `translateY(${u((1 - front) * 6)})`,
            `scale(${(0.985 + 0.035 * cull).toFixed(3)})`,
          ].join(' '),
        }}
      >
        {/* godkjent-status — rolig, presis, eget hjørne */}
        {badge > 0.01 && (
          <span
            className="absolute font-body font-semibold"
            style={{
              top: u(3), right: u(3),
              padding: `${u(1)} ${u(1.9)}`, borderRadius: 999,
              fontSize: u(1.8), letterSpacing: '0.04em',
              color: '#8BEFC0', background: 'rgba(52,211,153,0.12)',
              opacity: badge, transform: `translateY(${u((1 - badge) * 1.5)})`,
            }}
          >
            Godkjent
          </span>
        )}
        <div className="flex items-center" style={{ gap: u(2.2), marginBottom: u(2.6), paddingRight: u(12) }}>
          <span
            className="inline-flex items-center justify-center font-heading font-bold shrink-0"
            style={{
              width: u(6.6), height: u(6.6), borderRadius: '50%', fontSize: u(2.3),
              background: 'rgba(207,151,252,0.14)', color: 'rgba(237,221,255,0.9)',
            }}
          >
            MI
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold whitespace-nowrap" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.94)' }}>Martin &amp; Ida</p>
            <p className="font-body whitespace-nowrap" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.42)', marginTop: u(0.3) }}>Par · stabil inntekt</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: u(1.3) }}>
          {CHECKS.map((c) => {
            const rowP = easeOutCubic(seg(q, c.at - 0.06, c.at + 0.02));
            const tickP = easeOutCubic(seg(q, c.at + 0.04, c.at + 0.12));
            if (rowP <= 0.01) return null;
            return (
              <div
                key={c.label}
                className="flex items-center"
                style={{ gap: u(1.8), padding: `${u(1.5)} ${u(1.9)}`, borderRadius: u(1.6), ...sub(), ...riseIn(rowP, 1.6) }}
              >
                {tickP > 0.01 ? <Check p={tickP} size={3} /> : <Pending size={3} />}
                <span className="font-body font-medium" style={{ fontSize: u(2.15), color: 'rgba(253,252,251,0.78)' }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* score — ren tekstlinje under kortet */}
      {score > 0.02 && (
        <div
          className="absolute flex items-center justify-center"
          style={{ left: 0, right: 0, top: '78.5%', gap: u(1.6), ...riseIn(score, 2) }}
        >
          <span className="font-heading font-bold" style={{ fontSize: u(2.5), color: 'rgba(253,252,251,0.9)', fontVariantNumeric: 'tabular-nums' }}>
            98<span style={{ color: 'rgba(253,252,251,0.32)' }}> / 100</span>
          </span>
          <span className="font-body" style={{ fontSize: u(2), color: 'rgba(253,252,251,0.45)' }}>i leietakerscore — best av 9 søkere</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   DAG 30 — Leien er på konto
   ============================================================ */
const LEDGER = [
  { d: '1. august', at: 0.56 },
  { d: '1. september', at: 0.66 },
  { d: '1. oktober', at: 0.76 },
];

export function SceneUtbetaling({ q }) {
  const cardIn = easeOutCubic(seg(q, 0.02, 0.16));
  const cp = easeOutCubic(seg(q, 0.08, 0.42));
  const amount = 24800 * cp;
  const row = easeOutCubic(seg(q, 0.46, 0.56));
  const ledgerIn = easeOutCubic(seg(q, 0.52, 0.64));
  const footP = easeOutCubic(seg(q, 0.88, 0.98));

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* utbetalingskortet */}
      <div
        className="absolute"
        style={{
          left: '50%', top: u(2.5), width: u(56),
          borderRadius: u(2.8), padding: `${u(3.4)} ${u(4)}`,
          ...surf(),
          opacity: cardIn,
          transform: `translateX(-50%) translateY(${u((1 - cardIn) * 5)})`,
        }}
      >
        <div className="flex items-center justify-between">
          <p className="font-body font-semibold uppercase whitespace-nowrap" style={{ fontSize: u(1.7), letterSpacing: '0.26em', color: 'rgba(253,252,251,0.38)' }}>
            Første utbetaling
          </p>
          <span className="font-body font-semibold uppercase whitespace-nowrap" style={{ fontSize: u(1.6), letterSpacing: '0.22em', color: 'rgba(207,151,252,0.6)' }}>
            1. juli
          </span>
        </div>
        <p
          className="font-heading font-bold"
          style={{
            fontSize: u(8.6), lineHeight: 1.05, marginTop: u(1.4),
            color: 'rgba(253,252,251,0.96)', letterSpacing: '-0.02em',
          }}
        >
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(amount)}</span> kr
        </p>
        {row > 0.01 && (
          <div className="flex items-center" style={{ gap: u(1.7), marginTop: u(1.8), ...riseIn(row, 1.6) }}>
            <Check p={row} size={3} />
            <span className="font-body" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.55)' }}>
              Overført til din konto — leie minus honorar
            </span>
          </div>
        )}
      </div>

      {/* hovedbok — månedene fortsetter av seg selv */}
      <div
        className="absolute"
        style={{
          left: '50%', top: u(38), width: u(56),
          borderRadius: u(2.4), padding: `${u(1)} ${u(4)}`,
          ...surf({ background: 'linear-gradient(180deg, #131318, #0F0F14)' }),
          opacity: ledgerIn,
          transform: `translateX(-50%) translateY(${u((1 - ledgerIn) * 4)})`,
        }}
      >
        {LEDGER.map((r, i) => {
          const p = easeOutCubic(seg(q, r.at, r.at + 0.09));
          return (
            <div
              key={r.d}
              className="flex items-center"
              style={{
                gap: u(1.8), padding: `${u(1.9)} 0`,
                borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)',
                opacity: Math.min(1, p * 1.5),
                transform: `translateY(${u((1 - p) * 1.5)})`,
              }}
            >
              <span className="flex-1 font-body" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.6)' }}>{r.d}</span>
              <span className="font-body font-semibold" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.85)' }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{'24\u202F800'}</span> kr
              </span>
              <Check p={easeOutCubic(seg(q, r.at + 0.05, r.at + 0.13))} size={2.7} />
            </div>
          );
        })}
      </div>

      {/* fotnote */}
      {footP > 0.01 && (
        <p
          className="absolute font-body"
          style={{
            left: 0, right: 0, top: u(62), textAlign: 'center',
            fontSize: u(2), color: 'rgba(253,252,251,0.4)', ...riseIn(footP, 1.5),
          }}
        >
          Og slik fortsetter det — måned etter måned.
        </p>
      )}
    </div>
  );
}
