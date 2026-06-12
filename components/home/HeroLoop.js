'use client';

/*
  HeroLoop — DigiHome-konseptet som én sammenhengende fortelling (18s loop).

  Akt 1 — BRYTEREN:  En stor autopilot-toggle alene i mørket flippes på.
                     Lyset i rommet skrus opp. Toggelen morpher til en
                     levende statuskapsel «Autopilot · Aktiv» festet øverst.
  Akt 2 — ADRESSEN:  Det eneste eieren gjør. Feltet fylles ut, adressen
                     velges og dokker som første rad i strømmen.
  Akt 3 — KASKADEN:  Hendelser tikker inn automatisk under kapselen —
                     annonse, pris, kontrakt. Kapselens grønne punkt
                     pulserer for hver hendelse: bryteren gjør jobben.
  Akt 4 — GEVINSTEN: Strømmen dimmes, utbetalingen lander stort.
                     «Hver måned · helt automatisk.» Elegant uttoning,
                     rommet mørkner — og bryteren tenner det igjen.

  Ren platina/glass-estetikk. Alle størrelser i --u (1 % av bredden).
*/

import { useEffect, useRef, useState } from 'react';
import {
  MapPin, ArrowRight, Home, TrendingUp, Megaphone, FileCheck, Repeat,
} from 'lucide-react';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack,
  fmtNOK, typed,
} from '@/components/video/filmUtils';

const LOOP = 18;
const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;
const lerp = (a, b, p) => a + (b - a) * p;

/* hendelses-tidspunkter — driver både rader og kapsel-puls */
const EV = [
  { at: 8.5, done: 9.35, y: 26.4, icon: Megaphone, title: 'Annonse publisert', sub: 'Finn.no · Airbnb · Booking.com' },
  { at: 9.75, done: 10.6, y: 34.8, icon: TrendingUp, title: 'Pris optimalisert', sub: '25 500 kr/mnd · dynamisk' },
  { at: 11.0, done: 11.9, y: 43.2, icon: FileCheck, title: 'Kontrakt signert', sub: 'BankID · 12 måneder' },
];
const PULSES = [8.5, 9.75, 11.0, 12.7];

function useLoopTime(playing) {
  const [t, setT] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (reduce) {
      setT(12.1); // statisk: kapsel + adresse + tre fullførte hendelser
      return;
    }
    if (!playing) return;
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      setT(((now - t0) / 1000) % LOOP);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, reduce]);
  return t;
}

/* ---------- bakteppe: rommet lysner når bryteren slås på ---------- */
function Backdrop({ t }) {
  const breathe = 0.8 + 0.2 * Math.sin(t * 0.35);
  const lit = 0.4 + 0.6 * easeOutCubic(seg(t, 1.5, 2.5)); // bryteren tenner rommet
  return (
    <>
      <div
        className="absolute"
        style={{
          left: '6%', top: '4%', width: '88%', height: '88%',
          background:
            'radial-gradient(ellipse 60% 52% at 50% 44%, rgba(235,232,245,0.06), transparent 70%)',
          opacity: (breathe * lit).toFixed(2),
        }}
      />
      <div
        className="absolute"
        style={{
          left: '16%', right: '16%', bottom: '0%', height: u(9),
          background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(190,182,215,0.13), transparent 72%)',
          filter: `blur(${u(2.4)})`,
          opacity: lit.toFixed(2),
        }}
      />
    </>
  );
}

/* ---------- liten grønn hake ---------- */
function ChipCheck({ size = 3 }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: u(size), height: u(size), borderRadius: '50%',
        background: 'rgba(52,211,153,0.14)', border: '1px solid rgba(52,211,153,0.42)',
      }}
    >
      <span style={{ color: '#7ee2a8', fontWeight: 700, fontSize: u(size * 0.58), lineHeight: 1 }}>✓</span>
    </span>
  );
}

/* ---------- spinner → hake (status i rader) ---------- */
function RowStatus({ t, done }) {
  const dP = easeOutBack(seg(t, done, done + 0.4));
  const spin = ((t * 320) % 360).toFixed(0);
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: u(2.8), height: u(2.8) }}>
      {dP <= 0.001 ? (
        <span
          className="absolute inset-0 rounded-full"
          style={{ border: '1.5px solid rgba(255,255,255,0.18)', borderTopColor: 'rgba(255,255,255,0.85)', transform: `rotate(${spin}deg)` }}
        />
      ) : (
        <span style={{ transform: `scale(${Math.max(0.3, Math.min(dP, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
          <ChipCheck size={2.8} />
        </span>
      )}
    </span>
  );
}

/* ===================== AKT 1 — BRYTEREN → KAPSEL ===================== */
function ToggleCapsule({ t }) {
  const inRaw = easeOutBack(seg(t, 0.35, 1.05));
  if (inRaw <= 0.003) return null;
  const inP = Math.min(inRaw, 1.03);
  const charge = seg(t, 0.95, 1.45);
  const pre = Math.sin(seg(t, 1.28, 1.45) * Math.PI); // anticipation før flippen
  const knobRaw = easeOutBack(seg(t, 1.45, 2.0));
  const on = seg(t, 1.45, 2.0) > 0.35;
  const ripple = seg(t, 1.55, 2.45);
  const m = easeInOutCubic(seg(t, 2.7, 3.6));

  const y = lerp(30, 8, m);
  const w = lerp(30, 34, m);
  const h = lerp(14.4, 6.8, m);
  const bgA = 0.88 * clamp01((m - 0.25) * 1.6);
  const bigO = Math.max(0, 1 - m * 2.2);
  const capO = clamp01((m - 0.45) * 2.2);

  const pulse = Math.max(0, ...PULSES.map((p) => Math.sin(clamp01(seg(t, p, p + 0.7)) * Math.PI)));

  const KW = 11.6, TW = 30, PAD = 1.4;
  const travel = TW - KW - PAD * 2;
  const kx = -pre * 0.7 + travel * (knobRaw > 1 ? 1 + (knobRaw - 1) * 0.35 : Math.max(0, knobRaw));

  return (
    <div
      className="absolute"
      style={{
        left: '50%', top: u(y), width: u(w), height: u(h),
        transform: `translateX(-50%) translateY(${u((1 - inP) * 4)}) scale(${(0.92 + 0.08 * inP).toFixed(3)})`,
        opacity: Math.min(inRaw * 1.4, 1),
        background: `rgba(21,20,25,${bgA.toFixed(2)})`,
        border: `1px solid rgba(255,255,255,${(0.12 * clamp01((m - 0.25) * 1.6)).toFixed(3)})`,
        borderRadius: 999,
        boxShadow: m > 0.4
          ? `0 ${u(1.2)} ${u(4)} rgba(0,0,0,0.45), 0 0 ${u(2.5 + pulse * 3)} rgba(126,226,168,${(0.05 + pulse * 0.12).toFixed(3)})`
          : 'none',
      }}
    >
      {/* — stort toggle-lag — */}
      {bigO > 0.01 && (
        <div className="absolute inset-0" style={{ opacity: bigO.toFixed(2) }}>
          {/* ladering + flip-ekko */}
          {charge > 0.01 && charge < 0.999 && (
            <span
              className="absolute rounded-full"
              style={{
                inset: u(-2.4),
                border: `1px solid rgba(255,255,255,${(0.38 * Math.sin(charge * Math.PI)).toFixed(2)})`,
                transform: `scale(${(1.2 - 0.2 * charge).toFixed(3)})`,
              }}
            />
          )}
          {ripple > 0.01 && ripple < 0.999 && (
            <span
              className="absolute rounded-full"
              style={{
                inset: 0,
                border: '1px solid rgba(255,255,255,0.5)',
                opacity: (Math.sin(ripple * Math.PI) * 0.3).toFixed(2),
                transform: `scale(${(1 + ripple * 0.9).toFixed(3)})`,
              }}
            />
          )}
          {/* spor */}
          <span
            className="absolute inset-0 rounded-full"
            style={{
              background: on
                ? 'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.07))'
                : 'rgba(255,255,255,0.06)',
              border: `1px solid ${on ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.13)'}`,
              boxShadow: on
                ? `0 0 ${u(5)} rgba(235,232,245,0.18), inset 0 1px 0 rgba(255,255,255,0.18)`
                : 'inset 0 1px 0 rgba(255,255,255,0.06)',
              transition: 'background 0.45s, border 0.45s, box-shadow 0.45s',
            }}
          />
          {/* knott */}
          <span
            className="absolute rounded-full"
            style={{
              top: '50%', left: u(PAD), width: u(KW), height: u(KW),
              transform: `translateY(-50%) translateX(${u(kx)})`,
              background: 'linear-gradient(145deg, #FFFFFF, #E4E0EC)',
              boxShadow: `0 ${u(0.8)} ${u(2.6)} rgba(0,0,0,0.5)${on ? `, 0 0 ${u(2.6)} rgba(255,255,255,0.25)` : ''}`,
            }}
          />
          {/* etikett under */}
          <p
            className="font-heading font-bold absolute left-0 right-0 text-center"
            style={{
              top: `calc(100% + ${u(3)})`,
              fontSize: u(3.4),
              letterSpacing: '-0.01em',
              color: 'rgba(253,252,251,0.92)',
              opacity: Math.max(0, 1 - seg(t, 2.55, 3.0) * 1.2).toFixed(2),
            }}
          >
            Autopilot
          </p>
        </div>
      )}

      {/* — kapsel-lag — */}
      {capO > 0.01 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: capO.toFixed(2), gap: u(1.5) }}>
          {/* mini-toggle (på) */}
          <span className="relative inline-flex shrink-0" style={{ width: u(7.2), height: u(4) }}>
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))',
                border: '1px solid rgba(255,255,255,0.32)',
              }}
            />
            <span
              className="absolute rounded-full"
              style={{
                top: '50%', right: u(0.5), width: u(3), height: u(3),
                transform: 'translateY(-50%)',
                background: 'linear-gradient(145deg, #FFFFFF, #E4E0EC)',
                boxShadow: `0 ${u(0.3)} ${u(1)} rgba(0,0,0,0.45)`,
              }}
            />
          </span>
          <span className="font-body font-medium" style={{ fontSize: u(2.35), color: 'rgba(253,252,251,0.92)' }}>Autopilot</span>
          <span style={{ color: 'rgba(253,252,251,0.25)', fontSize: u(2.2) }}>·</span>
          <span
            className="inline-flex rounded-full shrink-0"
            style={{
              width: u(1.5), height: u(1.5),
              background: '#34d399',
              boxShadow: `0 0 ${u(1.4 + pulse * 2.2)} rgba(52,211,153,${(0.7 + pulse * 0.3).toFixed(2)})`,
              transform: `scale(${(1 + pulse * 0.45).toFixed(2)})`,
            }}
          />
          <span className="font-body" style={{ fontSize: u(2.2), color: 'rgba(126,226,168,0.9)' }}>Aktiv</span>
        </div>
      )}
    </div>
  );
}

/* ===================== AKT 2 — ADRESSEN (felt → rad) ===================== */
const ADDR_SHORT = 'Møhlenprisbakken 14';
const ADDR_FULL = 'Møhlenprisbakken 14, Bergen';
const SUGGESTIONS = [
  'Møhlenprisbakken 14, Bergen',
  'Møhlenpris allé 2, Bergen',
  'Møhlenprisveien 8, Bergen',
];

function AddressUnit({ t, dimP }) {
  const inRaw = easeOutBack(seg(t, 4.0, 4.7));
  if (inRaw <= 0.003) return null;
  const inP = Math.min(inRaw, 1.04);
  const typeP = seg(t, 4.75, 6.0);
  const dd = easeOutCubic(seg(t, 5.25, 5.8));
  const hl = easeOutCubic(seg(t, 6.15, 6.45));
  const selRaw = seg(t, 6.55, 6.95);
  const sel = easeInOutCubic(selRaw);
  const checkP = easeOutBack(seg(t, 6.8, 7.2));
  const m = easeInOutCubic(seg(t, 7.4, 8.2));
  const panelO = dd * (1 - sel);

  const y = lerp(24, 18, m);
  const w = lerp(66, 58, m);
  const h = lerp(9.6, 7.2, m);
  const rad = lerp(4.8, 2.4, m);
  const fieldO = Math.max(0, 1 - m * 2.2);
  const rowO = clamp01((m - 0.45) * 2.2);

  const typingActive = t > 4.7 && selRaw <= 0;
  const caretOn = typingActive && Math.sin(t * 7.5) > -0.2;
  const text = selRaw > 0.4 ? ADDR_FULL : typed(ADDR_SHORT, typeP);

  return (
    <div
      className="absolute"
      style={{
        left: '50%', top: u(y), width: u(w), height: u(h),
        transform: `translateX(-50%) translateY(${u((1 - inP) * 3)}) scale(${(0.94 + 0.06 * inP).toFixed(3)})`,
        opacity: (Math.min(inRaw * 1.4, 1) * (1 - 0.55 * dimP)).toFixed(2),
        background: `rgba(21,20,25,${(0.9 - 0.05 * m).toFixed(2)})`,
        border: `1px solid rgba(255,255,255,${(0.13 - 0.03 * m).toFixed(3)})`,
        borderRadius: u(rad),
        boxShadow: `0 ${u(lerp(2.4, 1.6, m))} ${u(lerp(7, 5, m))} rgba(0,0,0,${(0.5 - 0.05 * m).toFixed(2)}), inset 0 1px 0 rgba(255,255,255,${(0.06 * (1 - m)).toFixed(3)})`,
      }}
    >
      {/* — feltlag — */}
      {fieldO > 0.01 && (
        <div className="absolute inset-0 flex items-center" style={{ opacity: fieldO.toFixed(2), gap: u(1.8), padding: `0 ${u(1.4)} 0 ${u(2.6)}`, overflow: 'hidden' }}>
          <MapPin style={{ width: u(2.9), height: u(2.9), color: 'rgba(253,252,251,0.45)', flexShrink: 0 }} />
          <div className="flex-1 flex items-center" style={{ minWidth: 0 }}>
            {text ? (
              <span className="font-body" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.94)', whiteSpace: 'nowrap' }}>{text}</span>
            ) : (
              <span className="font-body" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.32)', whiteSpace: 'nowrap' }}>Skriv inn adressen din …</span>
            )}
            {caretOn && <span style={{ width: 1.5, height: u(3.4), marginLeft: u(0.5), background: 'rgba(253,252,251,0.85)' }} />}
            {checkP > 0.01 && (
              <span style={{ marginLeft: u(1.3), transform: `scale(${Math.max(0.4, Math.min(checkP, 1.12)).toFixed(2)})`, flexShrink: 0, display: 'inline-flex' }}>
                <ChipCheck size={3.2} />
              </span>
            )}
          </div>
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: u(7), height: u(7), borderRadius: '50%',
              background: selRaw > 0.4 ? 'linear-gradient(145deg, #FFFFFF, #E4E0EC)' : 'rgba(255,255,255,0.09)',
              border: selRaw > 0.4 ? 'none' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: selRaw > 0.4 ? `0 ${u(1)} ${u(3.4)} rgba(0,0,0,0.45)` : 'none',
              transition: 'background 0.45s, border 0.45s',
            }}
          >
            <ArrowRight style={{ width: u(2.9), height: u(2.9), color: selRaw > 0.4 ? '#17161B' : 'rgba(253,252,251,0.7)' }} />
          </span>
        </div>
      )}

      {/* — radlag (del av strømmen) — */}
      {rowO > 0.01 && (
        <div className="absolute inset-0 flex items-center" style={{ opacity: rowO.toFixed(2), gap: u(1.9), padding: `0 ${u(2.2)}` }}>
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: u(4.6), height: u(4.6), borderRadius: u(1.4),
              background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            <MapPin style={{ width: u(2.4), height: u(2.4), color: 'rgba(253,252,251,0.75)' }} />
          </span>
          <div className="flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
            <p className="font-body font-medium" style={{ fontSize: u(2.25), color: 'rgba(253,252,251,0.92)', whiteSpace: 'nowrap' }}>{ADDR_FULL}</p>
            <p className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.45)', whiteSpace: 'nowrap', marginTop: u(0.2) }}>68 m² · 3 soverom</p>
          </div>
          <ChipCheck size={2.8} />
        </div>
      )}

      {/* forslag */}
      {panelO > 0.01 && (
        <div
          className="absolute left-0 right-0 overflow-hidden"
          style={{
            top: `calc(100% + ${u(1.4)})`,
            background: 'rgba(19,18,23,0.94)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: u(2.6),
            boxShadow: `0 ${u(2.6)} ${u(8)} rgba(0,0,0,0.55)`,
            opacity: panelO.toFixed(2),
            transform: `translateY(${u((1 - dd) * 2 + sel * 1.5)})`,
          }}
        >
          {SUGGESTIONS.map((s, i) => {
            const rowHl = i === 0 ? hl : 0;
            return (
              <div
                key={s}
                className="flex items-center"
                style={{
                  gap: u(1.7),
                  padding: `${u(2)} ${u(2.6)}`,
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                  background: rowHl > 0 ? `rgba(255,255,255,${(0.075 * rowHl).toFixed(3)})` : 'transparent',
                }}
              >
                <MapPin style={{ width: u(2.3), height: u(2.3), color: i === 0 && hl > 0.4 ? 'rgba(253,252,251,0.85)' : 'rgba(253,252,251,0.32)', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: u(2.4), color: i === 0 && hl > 0.4 ? 'rgba(253,252,251,0.95)' : 'rgba(253,252,251,0.55)', whiteSpace: 'nowrap' }}>{s}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== AKT 3 — KASKADEN ===================== */
function FeedRow({ t, at, done, y, icon: Icon, title, sub, dimP }) {
  const inRaw = easeOutBack(seg(t, at, at + 0.55));
  if (inRaw <= 0.003) return null;
  const inP = Math.min(inRaw, 1.04);
  const o = clamp01(seg(t, at, at + 0.28) * 2) * (1 - 0.55 * dimP);
  return (
    <div
      className="absolute flex items-center"
      style={{
        left: '50%', top: u(y), width: u(58), height: u(7.2),
        transform: `translateX(-50%) translateY(${u((1 - inP) * 2.5)}) scale(${(0.94 + 0.06 * inP).toFixed(3)})`,
        opacity: o.toFixed(2),
        background: 'rgba(21,20,25,0.85)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: u(2.4),
        padding: `0 ${u(2.2)}`,
        gap: u(1.9),
        boxShadow: `0 ${u(1.6)} ${u(5)} rgba(0,0,0,0.45)`,
      }}
    >
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{
          width: u(4.6), height: u(4.6), borderRadius: u(1.4),
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
        }}
      >
        <Icon style={{ width: u(2.4), height: u(2.4), color: 'rgba(253,252,251,0.75)' }} />
      </span>
      <div className="flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
        <p className="font-body font-medium" style={{ fontSize: u(2.25), color: 'rgba(253,252,251,0.92)', whiteSpace: 'nowrap' }}>{title}</p>
        <p className="font-body" style={{ fontSize: u(1.9), color: 'rgba(253,252,251,0.45)', whiteSpace: 'nowrap', marginTop: u(0.2) }}>{sub}</p>
      </div>
      <RowStatus t={t} done={done} />
    </div>
  );
}

/* ===================== AKT 4 — GEVINSTEN ===================== */
function PayoutBlock({ t }) {
  const inRaw = easeOutBack(seg(t, 12.7, 13.4));
  if (inRaw <= 0.003) return null;
  const inP = Math.min(inRaw, 1.04);
  const amount = 25000 * easeOutCubic(seg(t, 13.0, 14.0));
  const check = easeOutBack(seg(t, 14.1, 14.5));
  const cap = easeOutCubic(seg(t, 14.9, 15.4));

  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(54) }}>
      <div
        style={{
          width: u(60),
          background: 'rgba(21,20,25,0.92)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.13)', borderRadius: u(3),
          padding: u(3),
          opacity: Math.min(inRaw * 1.4, 1).toFixed(2),
          transform: `translateY(${u((1 - inP) * -5)}) scale(${(0.9 + 0.1 * inP).toFixed(3)})`,
          boxShadow: `0 ${u(3)} ${u(9)} rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        <div className="flex items-center" style={{ gap: u(2.4) }}>
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: u(8.4), height: u(8.4), borderRadius: u(2.2),
              background: 'linear-gradient(145deg, rgba(255,255,255,0.14), rgba(255,255,255,0.05))',
              border: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <Home style={{ width: u(4), height: u(4), color: 'rgba(253,252,251,0.9)' }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between">
              <span className="font-body font-medium" style={{ fontSize: u(2.5), color: 'rgba(253,252,251,0.92)' }}>DigiHome</span>
              <span className="font-body" style={{ fontSize: u(2), color: 'rgba(253,252,251,0.38)' }}>nå</span>
            </div>
            <p className="font-body" style={{ fontSize: u(2.3), color: 'rgba(253,252,251,0.55)', marginTop: u(0.4) }}>
              Leie mottatt · Møhlenprisbakken 14
            </p>
          </div>
        </div>
        <div className="flex items-end justify-between" style={{ marginTop: u(2.6) }}>
          <span className="font-heading font-bold" style={{ fontSize: u(6.4), color: '#FDFCFB', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {fmtNOK(amount)} kr
          </span>
          {check > 0.01 && (
            <span style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
              <ChipCheck size={4.6} />
            </span>
          )}
        </div>
      </div>

      {cap > 0.01 && (
        <div className="flex items-center" style={{ gap: u(1.3), marginTop: u(3), opacity: cap.toFixed(2), transform: `translateY(${u((1 - cap) * 2)})` }}>
          <Repeat style={{ width: u(2.5), height: u(2.5), color: '#7ee2a8' }} />
          <span className="font-body" style={{ fontSize: u(2.4), color: 'rgba(253,252,251,0.62)' }}>Hver måned · helt automatisk</span>
        </div>
      )}
    </div>
  );
}

/* ===================== HOVEDKOMPONENT ===================== */
export function HeroLoop({ playing = true }) {
  const wrapRef = useRef(null);
  const [un, setUn] = useState(5.2);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setUn(el.clientWidth / 100));
    ro.observe(el);
    setUn(el.clientWidth / 100);
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  const t = useLoopTime(playing && inView);
  const fy = Math.sin(t * 0.5) * 0.5;
  const dimP = easeInOutCubic(seg(t, 12.4, 13.0)); // strømmen dimmes når gevinsten lander
  const ex = easeInOutCubic(seg(t, 16.4, 17.5));   // elegant slutt-uttoning

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ '--u': `${un}px`, aspectRatio: '100 / 94' }}
      aria-hidden="true"
    >
      <Backdrop t={t} />
      <div
        className="absolute inset-0"
        style={{
          transform: `translateY(${u(fy - ex * 3)})`,
          opacity: (1 - ex).toFixed(2),
          filter: ex > 0.02 ? `blur(${(ex * 6).toFixed(1)}px)` : 'none',
        }}
      >
        <ToggleCapsule t={t} />
        <AddressUnit t={t} dimP={dimP} />
        {EV.map((e) => (
          <FeedRow key={e.title} t={t} at={e.at} done={e.done} y={e.y} icon={e.icon} title={e.title} sub={e.sub} dimP={dimP} />
        ))}
        <PayoutBlock t={t} />
      </div>
    </div>
  );
}
