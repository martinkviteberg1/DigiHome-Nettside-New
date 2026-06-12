'use client';

/*
  HeroLoop — én kontinuerlig produktfortelling (15.2s loop), ingen scenekutt.
  Hvert fullført steg morpher til en kompakt chip som stabler seg øverst,
  mens neste steg spretter inn med fullt fokus — à la iOS Live Activities.

    1. Adressefeltet fylles ut → velges → krymper til chip
    2. Autopilot-kortet spretter inn → toggles på → statuser → krymper til chip
    3. Utbetalingsvarselet lander → beløpet teller opp → alt toner elegant ut

  Ren platina/glass-estetikk. Ingen indikatorer, partikler eller romstøv.
  Alle størrelser i --u (1u = 1 % av komponentbredden).
*/

import { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowRight, Home, CalendarCheck2, TrendingUp, Zap } from 'lucide-react';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack,
  fadeInOut, fmtNOK, typed,
} from '@/components/video/filmUtils';

const LOOP = 15.2;
const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;
const lerp = (a, b, p) => a + (b - a) * p;

function useLoopTime(playing) {
  const [t, setT] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (reduce) {
      setT(8.45); // statisk: chip + autopilot aktiv med statuser
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

/* ---------- bakteppe: mykt, pustende studiolys ---------- */
function Backdrop({ t }) {
  const breathe = 0.8 + 0.2 * Math.sin(t * 0.35);
  return (
    <>
      <div
        className="absolute"
        style={{
          left: '6%', top: '4%', width: '88%', height: '88%',
          background:
            'radial-gradient(ellipse 60% 52% at 50% 44%, rgba(235,232,245,0.055), transparent 70%)',
          opacity: breathe.toFixed(2),
        }}
      />
      <div
        className="absolute"
        style={{
          left: '16%', right: '16%', bottom: '0%', height: u(9),
          background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(190,182,215,0.12), transparent 72%)',
          filter: `blur(${u(2.4)})`,
        }}
      />
    </>
  );
}

/* ---------- statuspille: spinner → hake ---------- */
function LoopPill({ t, at, done, children }) {
  const inP = easeOutBack(seg(t, at, at + 0.5));
  const o = clamp01(seg(t, at, at + 0.25) * 2);
  if (o <= 0.003) return null;
  const dP = easeOutBack(seg(t, done, done + 0.4));
  const spin = ((t * 320) % 360).toFixed(0);
  return (
    <div
      className="flex items-center"
      style={{
        gap: u(1.3),
        background: 'rgba(19,18,22,0.85)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 999,
        padding: `${u(1.1)} ${u(2.2)}`,
        opacity: o,
        transform: `translateY(${u((1 - clamp01(inP)) * 2.5)}) scale(${Math.max(0.6, Math.min(inP, 1.05)).toFixed(3)})`,
        boxShadow: `0 ${u(1.2)} ${u(3.6)} rgba(0,0,0,0.5)`,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="relative inline-flex items-center justify-center" style={{ width: u(2.4), height: u(2.4) }}>
        {dP <= 0.001 ? (
          <span
            className="absolute inset-0 rounded-full"
            style={{ border: '1.5px solid rgba(255,255,255,0.18)', borderTopColor: 'rgba(255,255,255,0.85)', transform: `rotate(${spin}deg)` }}
          />
        ) : (
          <span style={{ fontSize: u(2), fontWeight: 700, color: '#7ee2a8', lineHeight: 1, transform: `scale(${Math.max(0.3, Math.min(dP, 1.15)).toFixed(2)})` }}>✓</span>
        )}
      </span>
      <span className="font-body" style={{ fontSize: u(2.3), color: dP > 0.5 ? 'rgba(253,252,251,0.6)' : 'rgba(253,252,251,0.92)' }}>
        {children}
      </span>
    </div>
  );
}

/* ---------- liten grønn hake (chips) ---------- */
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

/* ===================== STEG 1 — ADRESSE (felt → chip) ===================== */
const ADDR_SHORT = 'Møhlenprisbakken 14';
const ADDR_FULL = 'Møhlenprisbakken 14, Bergen';
const SUGGESTIONS = [
  'Møhlenprisbakken 14, Bergen',
  'Møhlenpris allé 2, Bergen',
  'Møhlenprisveien 8, Bergen',
];

function AddressBlock({ t }) {
  const aInRaw = easeOutBack(seg(t, 0.25, 0.95));
  if (aInRaw <= 0.003) return null;
  const aIn = Math.min(aInRaw, 1.04);
  const typeP = seg(t, 1.05, 2.45);
  const dd = easeOutCubic(seg(t, 1.65, 2.2));
  const hl = easeOutCubic(seg(t, 2.6, 2.9));
  const selRaw = seg(t, 3.1, 3.5);
  const sel = easeInOutCubic(selRaw);
  const checkP = easeOutBack(seg(t, 3.35, 3.75));
  const m = easeInOutCubic(seg(t, 4.2, 5.0));
  const panelO = dd * (1 - sel);

  const top = lerp(30, 14, m);
  const w = lerp(66, 48, m);
  const h = lerp(9.6, 6.4, m);
  const rad = lerp(4.8, 3.2, m);
  const fs = lerp(2.7, 2.2, m);
  const textA = 0.94 - 0.3 * m;

  const typingActive = t > 1.0 && selRaw <= 0;
  const caretOn = typingActive && Math.sin(t * 7.5) > -0.2;
  const text = selRaw > 0.4 ? ADDR_FULL : typed(ADDR_SHORT, typeP);

  return (
    <div
      className="absolute"
      style={{
        left: '50%', top: u(top), width: u(w), height: u(h),
        transform: `translateX(-50%) translateY(${u((1 - aIn) * 3)}) scale(${(0.94 + 0.06 * aIn).toFixed(3)})`,
        opacity: Math.min(aInRaw * 1.4, 1),
        background: `rgba(22,21,26,${(0.9 - 0.22 * m).toFixed(2)})`,
        border: `1px solid rgba(255,255,255,${(0.13 - 0.04 * m).toFixed(3)})`,
        borderRadius: u(rad),
        boxShadow: `0 ${u(lerp(2.4, 1, m))} ${u(lerp(7, 3, m))} rgba(0,0,0,${(0.5 - 0.15 * m).toFixed(2)}), inset 0 1px 0 rgba(255,255,255,${(0.06 * (1 - m)).toFixed(3)})`,
      }}
    >
      <div className="flex items-center h-full" style={{ gap: u(lerp(1.8, 1.3, m)), padding: `0 ${u(lerp(1.4, 2.2, m))} 0 ${u(lerp(2.6, 2.2, m))}`, overflow: 'hidden' }}>
        <MapPin style={{ width: u(lerp(2.9, 2.3, m)), height: u(lerp(2.9, 2.3, m)), color: `rgba(253,252,251,${(0.45 - 0.08 * m).toFixed(2)})`, flexShrink: 0 }} />
        <div className="flex-1 flex items-center" style={{ minWidth: 0 }}>
          {text ? (
            <span className="font-body" style={{ fontSize: u(fs), color: `rgba(253,252,251,${textA.toFixed(2)})`, whiteSpace: 'nowrap' }}>
              {text}
            </span>
          ) : (
            <span className="font-body" style={{ fontSize: u(fs), color: 'rgba(253,252,251,0.32)', whiteSpace: 'nowrap' }}>
              Skriv inn adressen din …
            </span>
          )}
          {caretOn && (
            <span style={{ width: 1.5, height: u(3.4), marginLeft: u(0.5), background: 'rgba(253,252,251,0.85)' }} />
          )}
          {checkP > 0.01 && (
            <span style={{ marginLeft: u(1.3), transform: `scale(${Math.max(0.4, Math.min(checkP, 1.12)).toFixed(2)})`, flexShrink: 0, display: 'inline-flex' }}>
              <ChipCheck size={lerp(3.2, 2.8, m)} />
            </span>
          )}
        </div>
        {/* send-knapp — kollapser bort i chip-modus */}
        <span
          className="inline-flex items-center justify-center shrink-0"
          style={{
            width: u(7 * (1 - m)), height: u(7), borderRadius: '50%',
            opacity: Math.max(0, 1 - m * 1.8).toFixed(2),
            transform: `scale(${(1 - m).toFixed(2)})`,
            background: selRaw > 0.4 ? 'linear-gradient(145deg, #FFFFFF, #E4E0EC)' : 'rgba(255,255,255,0.09)',
            border: selRaw > 0.4 ? 'none' : '1px solid rgba(255,255,255,0.12)',
            boxShadow: selRaw > 0.4 ? `0 ${u(1)} ${u(3.4)} rgba(0,0,0,0.45)` : 'none',
            transition: 'background 0.45s, border 0.45s',
            overflow: 'hidden',
          }}
        >
          <ArrowRight style={{ width: u(2.9), height: u(2.9), color: selRaw > 0.4 ? '#17161B' : 'rgba(253,252,251,0.7)', flexShrink: 0 }} />
        </span>
      </div>

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
                <span
                  className="font-body"
                  style={{ fontSize: u(2.4), color: i === 0 && hl > 0.4 ? 'rgba(253,252,251,0.95)' : 'rgba(253,252,251,0.55)', whiteSpace: 'nowrap' }}
                >
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ===================== STEG 2 — AUTOPILOT (kort → chip) ===================== */
function AutopilotBlock({ t }) {
  const bInRaw = easeOutBack(seg(t, 4.95, 5.65));
  if (bInRaw <= 0.003) return null;
  const bIn = Math.min(bInRaw, 1.04);
  const knob = easeOutBack(seg(t, 5.95, 6.5));
  const on = seg(t, 5.95, 6.5) > 0.4;
  const m = easeInOutCubic(seg(t, 8.7, 9.5));

  const top = lerp(26, 22.4, m);
  const w = lerp(60, 38, m);
  const h = lerp(15, 6.4, m);
  const rad = lerp(3, 3.2, m);
  const cardO = Math.max(0, 1 - m * 2.2);
  const chipO = clamp01((m - 0.45) * 2.2);

  const TW = 13.6, KW = 6, PAD = 0.8;
  const travel = TW - KW - PAD * 2;
  const kx = travel * (knob > 1 ? 1 + (knob - 1) * 0.35 : Math.max(0, knob));

  return (
    <div
      className="absolute"
      style={{
        left: '50%', top: u(top), width: u(w), height: u(h),
        transform: `translateX(-50%) translateY(${u((1 - bIn) * 4)}) scale(${(0.93 + 0.07 * bIn).toFixed(3)})`,
        opacity: Math.min(bInRaw * 1.4, 1),
        background: `rgba(21,20,25,${(0.9 - 0.22 * m).toFixed(2)})`,
        border: `1px solid rgba(255,255,255,${(0.12 - 0.03 * m).toFixed(3)})`,
        borderRadius: u(rad),
        boxShadow: `0 ${u(lerp(2.6, 1, m))} ${u(lerp(8, 3, m))} rgba(0,0,0,${(0.52 - 0.17 * m).toFixed(2)}), inset 0 1px 0 rgba(255,255,255,${(0.07 * (1 - m)).toFixed(3)})`,
        overflow: 'hidden',
      }}
    >
      {/* kortinnhold */}
      {cardO > 0.01 && (
        <div className="absolute inset-0 flex items-center" style={{ opacity: cardO.toFixed(2), padding: `0 ${u(2.6)}`, gap: u(2.2) }}>
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: u(7.4), height: u(7.4), borderRadius: u(2),
              background: on ? 'linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06))' : 'rgba(255,255,255,0.06)',
              border: `1px solid rgba(255,255,255,${on ? 0.2 : 0.12})`,
              transition: 'background 0.45s, border 0.45s',
            }}
          >
            <Zap style={{ width: u(3.4), height: u(3.4), color: on ? 'rgba(253,252,251,0.95)' : 'rgba(253,252,251,0.55)', transition: 'color 0.45s' }} />
          </span>
          <div className="flex-1 min-w-0" style={{ overflow: 'hidden' }}>
            <p className="font-body font-medium" style={{ fontSize: u(2.6), color: 'rgba(253,252,251,0.93)' }}>Autopilot</p>
            <p className="font-body" style={{ fontSize: u(2.05), color: on ? 'rgba(126,226,168,0.85)' : 'rgba(253,252,251,0.4)', marginTop: u(0.3), transition: 'color 0.45s', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {on ? 'Aktiv · alt håndteres for deg' : 'Av'}
            </p>
          </div>
          {/* toggle */}
          <span className="relative inline-flex shrink-0" style={{ width: u(TW), height: u(7.6) }}>
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: on ? 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08))' : 'rgba(255,255,255,0.07)',
                border: `1px solid ${on ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.14)'}`,
                boxShadow: on ? `0 0 ${u(3)} rgba(235,232,245,0.16)` : 'none',
                transition: 'background 0.4s, border 0.4s, box-shadow 0.4s',
              }}
            />
            <span
              className="absolute rounded-full"
              style={{
                top: '50%', left: u(PAD), width: u(KW), height: u(KW),
                transform: `translateY(-50%) translateX(${u(kx)})`,
                background: 'linear-gradient(145deg, #FFFFFF, #E4E0EC)',
                boxShadow: `0 ${u(0.5)} ${u(1.6)} rgba(0,0,0,0.5)`,
              }}
            />
          </span>
        </div>
      )}

      {/* chipinnhold */}
      {chipO > 0.01 && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: chipO.toFixed(2), gap: u(1.3) }}>
          <ChipCheck size={2.8} />
          <span className="font-body" style={{ fontSize: u(2.2), color: 'rgba(253,252,251,0.64)', whiteSpace: 'nowrap' }}>Autopilot på</span>
        </div>
      )}
    </div>
  );
}

/* ---------- statuspiller under autopilot-kortet ---------- */
function StatusPills({ t }) {
  if (t < 6.5) return null;
  const o = 1 - easeInOutCubic(seg(t, 8.6, 9.1));
  if (o <= 0.01) return null;
  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(43.6), gap: u(1.5), opacity: o.toFixed(2) }}>
      <LoopPill t={t} at={6.75} done={7.6}>Annonse publisert på Finn og Airbnb</LoopPill>
      <LoopPill t={t} at={7.45} done={8.35}>Pris optimalisert · 25 500 kr/mnd</LoopPill>
    </div>
  );
}

/* ===================== STEG 3 — UTBETALING ===================== */
function PayoutBlock({ t }) {
  const nInRaw = easeOutBack(seg(t, 9.95, 10.65));
  if (nInRaw <= 0.003) return null;
  const nIn = Math.min(nInRaw, 1.04);
  const amount = 25000 * easeOutCubic(seg(t, 10.3, 11.5));
  const check = easeOutBack(seg(t, 11.8, 12.2));
  const n2 = easeOutBack(seg(t, 12.3, 12.9));
  const cap = easeOutCubic(seg(t, 13.1, 13.6));

  return (
    <div className="absolute flex flex-col items-center" style={{ left: 0, right: 0, top: u(31.8) }}>
      {/* hovedvarsel */}
      <div
        style={{
          width: u(60),
          background: 'rgba(21,20,25,0.9)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.12)', borderRadius: u(3),
          padding: u(3),
          opacity: Math.min(nInRaw * 1.4, 1).toFixed(2),
          transform: `translateY(${u((1 - nIn) * -5)}) scale(${(0.9 + 0.1 * nIn).toFixed(3)})`,
          boxShadow: `0 ${u(3)} ${u(9)} rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.07)`,
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
          <span
            className="font-heading font-bold"
            style={{ fontSize: u(6.4), color: '#FDFCFB', letterSpacing: '-0.02em', lineHeight: 1 }}
          >
            {fmtNOK(amount)} kr
          </span>
          {check > 0.01 && (
            <span style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
              <ChipCheck size={4.6} />
            </span>
          )}
        </div>
      </div>

      {/* neste leietaker */}
      {n2 > 0.01 && (
        <div
          className="flex items-center"
          style={{
            width: u(54), gap: u(2.2), marginTop: u(2.4),
            background: 'rgba(21,20,25,0.82)', border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: u(2.6), padding: `${u(2.2)} ${u(2.6)}`,
            opacity: Math.min(n2 * 1.4, 1).toFixed(2),
            transform: `translateY(${u((1 - Math.min(n2, 1.06)) * 4)}) scale(${Math.max(0.88, Math.min(n2, 1.03)).toFixed(3)})`,
            boxShadow: `0 ${u(2)} ${u(6)} rgba(0,0,0,0.45)`,
          }}
        >
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: u(6.6), height: u(6.6), borderRadius: u(1.8),
              background: 'rgba(52,211,153,0.13)', border: '1px solid rgba(52,211,153,0.32)',
            }}
          >
            <CalendarCheck2 style={{ width: u(3.4), height: u(3.4), color: '#7ee2a8' }} />
          </span>
          <div>
            <p className="font-body font-medium" style={{ fontSize: u(2.4), color: 'rgba(253,252,251,0.9)' }}>Neste leietaker bekreftet</p>
            <p className="font-body" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.48)', marginTop: u(0.3) }}>
              Innflytting 1. juli · kontrakt signert
            </p>
          </div>
        </div>
      )}

      {/* bunnlinje */}
      {cap > 0.01 && (
        <div
          className="flex items-center"
          style={{ gap: u(1.2), marginTop: u(3), opacity: cap.toFixed(2), transform: `translateY(${u((1 - cap) * 2)})` }}
        >
          <TrendingUp style={{ width: u(2.6), height: u(2.6), color: '#7ee2a8' }} />
          <span className="font-body" style={{ fontSize: u(2.4), color: 'rgba(253,252,251,0.6)' }}>+30 % mot tradisjonell utleie</span>
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
  const ex = easeInOutCubic(seg(t, 13.9, 14.9)); // elegant slutt-uttoning

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
        <AddressBlock t={t} />
        <AutopilotBlock t={t} />
        <StatusPills t={t} />
        <PayoutBlock t={t} />
      </div>
    </div>
  );
}
