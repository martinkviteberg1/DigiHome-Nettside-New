'use client';

/*
  HeroLoop — fire separate, sekvensielle kapitler (20.8s loop), som filmen.
  Ingen forklarende tekst — visuelle øyeblikk som taler for seg selv:

    01 · AUTOPILOT   stor, taktil bryter med ekte materialer flippes på,
                     glow blomstrer, gulvrefleksjonen våkner
    02 · ADRESSE     feltet fylles ut, forslag kaskaderer inn, valget bekreftes
    03 · AUTOMATIKK  statuskort i stafett — ett om gangen, inn og ut med blur
    04 · UTBETALING  25 000 kr teller opp, et mykt lysbloom når beløpet lander

  Kinematiske overganger: blur + skala + retningsdrift + anamorfisk lyssveip.
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

const LOOP = 20.8;
const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;

/* kapittelvinduer */
const A1 = [0.0, 4.6];
const A2 = [4.3, 9.8];
const A3 = [9.5, 15.6];
const A4 = [15.3, 20.4];
const SWEEPS = [4.45, 9.65, 15.45];

function useLoopTime(playing) {
  const [t, setT] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (reduce) {
      setT(8.95); // statisk: adressen valgt og bekreftet
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

/* ---------- kapittelskall — filmens myke blur/skala/drift-overgang ---------- */
function Act({ t, a, b, children }) {
  if (t <= a || t >= b) return null;
  const enter = easeOutCubic(seg(t, a, a + 0.7));
  const exit = 1 - easeInOutCubic(seg(t, b - 0.7, b));
  const o = Math.min(enter, exit);
  if (o <= 0.004) return null;
  const lp = seg(t, a, b);
  const scale = (0.97 + 0.03 * enter) * (1 + lp * 0.025) * (1 + (1 - exit) * 0.015);
  const blur = (1 - enter) * 8 + (1 - exit) * 6;
  const x = (1 - enter) * 2.4 - (1 - exit) * 2.4;
  return (
    <div
      className="absolute inset-0"
      style={{
        opacity: o.toFixed(3),
        transform: `scale(${scale.toFixed(4)}) translateX(${u(x)})`,
        filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none',
        willChange: 'transform, opacity, filter',
      }}
    >
      {children}
    </div>
  );
}

/* ---------- anamorfisk lyssveip i kapittelskjøtene ---------- */
function LightSweep({ t }) {
  return SWEEPS.map((tb) => {
    const p = seg(t, tb - 0.45, tb + 0.5);
    if (p <= 0.01 || p >= 0.99) return null;
    const x = -30 + p * 160;
    const op = Math.sin(p * Math.PI) * 0.05;
    return (
      <div
        key={tb}
        className="absolute pointer-events-none"
        style={{
          top: '-14%', bottom: '-14%', left: `${x.toFixed(1)}%`, width: '30%',
          transform: 'rotate(11deg)',
          background: `linear-gradient(90deg, transparent, rgba(245,243,250,${(op * 0.5).toFixed(3)}) 30%, rgba(245,243,250,${op.toFixed(3)}) 50%, rgba(245,243,250,${(op * 0.5).toFixed(3)}) 70%, transparent)`,
          filter: 'blur(6px)',
        }}
      />
    );
  });
}

/* ---------- kapittel-markør: «01 — AUTOPILOT» ---------- */
function Kicker({ t, at, num, label }) {
  const p = easeOutCubic(seg(t, at, at + 0.7));
  const lineW = easeOutCubic(seg(t, at + 0.12, at + 0.95));
  if (p <= 0.004) return null;
  return (
    <div
      className="flex items-center justify-center"
      style={{
        gap: u(1.6),
        opacity: p.toFixed(2),
        transform: `translateY(${u((1 - p) * 1.6)})`,
      }}
    >
      <span className="font-heading font-bold" style={{ fontSize: u(2), color: '#E8E4EF', letterSpacing: '0.05em' }}>{num}</span>
      <span
        aria-hidden="true"
        style={{
          width: u(4.6 * lineW), height: 1,
          background: 'linear-gradient(90deg, rgba(245,243,250,0.7), rgba(245,243,250,0.05))',
        }}
      />
      <span className="font-body uppercase" style={{ fontSize: u(1.75), letterSpacing: '0.34em', color: 'rgba(253,252,251,0.4)' }}>{label}</span>
    </div>
  );
}

/* ---------- bakteppe: rommet lysner når bryteren slås på ---------- */
function Backdrop({ t }) {
  const breathe = 0.8 + 0.2 * Math.sin(t * 0.35);
  const lit = (0.35 + 0.65 * easeOutCubic(seg(t, 2.05, 3.1))) * (1 - 0.7 * easeInOutCubic(seg(t, 19.7, 20.7)));
  return (
    <>
      <div
        className="absolute"
        style={{
          left: '6%', top: '4%', width: '88%', height: '88%',
          background:
            'radial-gradient(ellipse 60% 52% at 50% 44%, rgba(235,232,245,0.065), transparent 70%)',
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

/* ---------- små delte byggesteiner ---------- */
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

function RowStatus({ t, done, size = 3.4 }) {
  const dP = easeOutBack(seg(t, done, done + 0.4));
  const ring = seg(t, done, done + 0.7);
  const spin = ((t * 320) % 360).toFixed(0);
  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: u(size), height: u(size) }}>
      {dP <= 0.001 ? (
        <span
          className="absolute inset-0 rounded-full"
          style={{ border: '1.2px solid rgba(255,255,255,0.16)', borderTopColor: 'rgba(255,255,255,0.8)', transform: `rotate(${spin}deg)` }}
        />
      ) : (
        <>
          {ring > 0.01 && ring < 0.99 && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                border: '1px solid rgba(126,226,168,0.6)',
                opacity: (Math.sin(ring * Math.PI) * 0.6).toFixed(2),
                transform: `scale(${(1 + ring * 0.8).toFixed(2)})`,
              }}
            />
          )}
          <span style={{ transform: `scale(${Math.max(0.3, Math.min(dP, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
            <ChipCheck size={size} />
          </span>
        </>
      )}
    </span>
  );
}

/* ===================== 01 · AUTOPILOT ===================== */
function ActAutopilot({ t }) {
  const tgIn = easeOutBack(seg(t, 0.7, 1.4));
  const charge = seg(t, 1.55, 2.0);
  const pre = Math.sin(seg(t, 1.9, 2.05) * Math.PI);
  const knobRaw = easeOutBack(seg(t, 2.05, 2.6));
  const onP = easeOutCubic(seg(t, 2.05, 2.8));
  const on = seg(t, 2.05, 2.6) > 0.35;
  const ripple = seg(t, 2.15, 3.1);
  const statusIn = easeOutCubic(seg(t, 2.85, 3.45));

  const KW = 13.2, TW = 34, TH = 16.4, PAD = 1.6;
  const travel = TW - KW - PAD * 2;
  const kx = -pre * 0.8 + travel * (knobRaw > 1 ? 1 + (knobRaw - 1) * 0.35 : Math.max(0, knobRaw));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <Kicker t={t} at={0.4} num="01" label="Autopilot" />

      <div
        className="relative"
        style={{
          width: u(TW), height: u(TH), marginTop: u(7),
          transform: `translateY(${u((1 - Math.min(tgIn, 1.03)) * 5)}) scale(${(0.92 + 0.08 * Math.min(tgIn, 1.03)).toFixed(3)})`,
          opacity: Math.min(tgIn * 1.4, 1),
        }}
      >
        {/* glow-bloom bak bryteren */}
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: u(-11),
            background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(240,237,248,0.10), transparent 70%)',
            opacity: onP.toFixed(2),
            transform: `scale(${(0.75 + 0.3 * onP).toFixed(2)})`,
          }}
        />
        {/* ladering + flip-ekko */}
        {charge > 0.01 && charge < 0.999 && (
          <span
            className="absolute rounded-full"
            style={{
              inset: u(-2.6),
              border: `1px solid rgba(255,255,255,${(0.38 * Math.sin(charge * Math.PI)).toFixed(2)})`,
              transform: `scale(${(1.18 - 0.18 * charge).toFixed(3)})`,
            }}
          />
        )}
        {ripple > 0.01 && ripple < 0.999 && (
          <span
            className="absolute rounded-full"
            style={{
              inset: 0,
              border: '1px solid rgba(255,255,255,0.5)',
              opacity: (Math.sin(ripple * Math.PI) * 0.28).toFixed(2),
              transform: `scale(${(1 + ripple * 0.85).toFixed(3)})`,
            }}
          />
        )}
        {/* spor — dypt glass med innvendig skygge */}
        <span
          className="absolute inset-0 rounded-full"
          style={{
            background: on
              ? 'linear-gradient(135deg, rgba(255,255,255,0.26), rgba(255,255,255,0.10) 45%, rgba(213,206,226,0.18))'
              : 'rgba(255,255,255,0.055)',
            border: `1px solid ${on ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.13)'}`,
            boxShadow: on
              ? `0 0 ${u(6)} rgba(235,232,245,0.20), inset 0 ${u(0.5)} ${u(1)} rgba(255,255,255,0.22), inset 0 ${u(-1)} ${u(2)} rgba(0,0,0,0.25)`
              : `inset 0 ${u(0.5)} ${u(1)} rgba(255,255,255,0.07), inset 0 ${u(-1)} ${u(2.4)} rgba(0,0,0,0.45)`,
            transition: 'background 0.45s, border 0.45s, box-shadow 0.45s',
          }}
        />
        {/* knott — speilglans og dybde */}
        <span
          className="absolute rounded-full"
          style={{
            top: '50%', left: u(PAD), width: u(KW), height: u(KW),
            transform: `translateY(-50%) translateX(${u(kx)})`,
            background: 'linear-gradient(150deg, #FFFFFF 10%, #F1EEF6 55%, #DCD6E6)',
            boxShadow: `0 ${u(1)} ${u(3.2)} rgba(0,0,0,0.55), inset 0 ${u(0.5)} ${u(0.9)} rgba(255,255,255,0.95), inset 0 ${u(-0.7)} ${u(1.2)} rgba(0,0,0,0.14)${on ? `, 0 0 ${u(3.2)} rgba(255,255,255,0.28)` : ''}`,
          }}
        />
        {/* gulvrefleksjon */}
        <span
          className="absolute rounded-full pointer-events-none"
          style={{
            top: `calc(100% + ${u(2.2)})`, left: u(2), right: u(2), height: u(5.5),
            background: on
              ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(213,206,226,0.10))'
              : 'rgba(255,255,255,0.04)',
            filter: `blur(${u(1.6)})`,
            opacity: on ? 0.5 : 0.3,
            maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 80%)',
            WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.9), transparent 80%)',
            transition: 'background 0.5s, opacity 0.5s',
          }}
        />
      </div>

      <div
        className="flex items-center"
        style={{ gap: u(1.4), marginTop: u(8.5), opacity: statusIn, transform: `translateY(${u((1 - statusIn) * 2)})` }}
      >
        <span
          className="inline-flex rounded-full"
          style={{ width: u(1.5), height: u(1.5), background: '#34d399', boxShadow: `0 0 ${u(1.6)} rgba(52,211,153,0.8)` }}
        />
        <span className="font-body" style={{ fontSize: u(2.5), color: 'rgba(253,252,251,0.8)' }}>Autopilot aktivert</span>
      </div>
    </div>
  );
}

/* ===================== 02 · ADRESSE ===================== */
const ADDR_SHORT = 'Møhlenprisbakken 14';
const ADDR_FULL = 'Møhlenprisbakken 14, Bergen';
const SUGGESTIONS = [
  'Møhlenprisbakken 14, Bergen',
  'Møhlenpris allé 2, Bergen',
  'Møhlenprisveien 8, Bergen',
];

function ActAdresse({ t }) {
  const lt = t - A2[0];
  const fIn = easeOutBack(seg(lt, 0.9, 1.6));
  const focus = easeOutCubic(seg(lt, 1.55, 1.95));
  const typeP = seg(lt, 1.8, 3.1);
  const ddAt = 2.3;
  const dd = easeOutCubic(seg(lt, ddAt, ddAt + 0.5));
  const hl = easeOutCubic(seg(lt, 3.4, 3.7));
  const selRaw = seg(lt, 3.95, 4.35);
  const sel = easeInOutCubic(selRaw);
  const checkP = easeOutBack(seg(lt, 4.2, 4.6));
  const panelO = dd * (1 - sel);
  const pulse = Math.sin(clamp01(seg(lt, 4.15, 5.0)) * Math.PI);

  const typingActive = lt > 1.75 && selRaw <= 0;
  const caretOn = typingActive && Math.sin(t * 7.5) > -0.2;
  const text = selRaw > 0.4 ? ADDR_FULL : typed(ADDR_SHORT, typeP);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <Kicker t={lt} at={0.35} num="02" label="Adresse" />

      <div
        className="relative"
        style={{
          width: u(68), marginTop: u(7),
          transform: `translateY(${u((1 - Math.min(fIn, 1.04)) * 4)}) scale(${(0.95 + 0.05 * Math.min(fIn, 1.04)).toFixed(3)})`,
          opacity: Math.min(fIn * 1.4, 1),
        }}
      >
        <div
          className="relative flex items-center"
          style={{
            height: u(10),
            gap: u(1.8),
            padding: `0 ${u(1.5)} 0 ${u(2.8)}`,
            background: 'rgba(22,21,26,0.92)',
            border: `1px solid rgba(255,255,255,${(0.12 + focus * 0.06 + pulse * 0.12).toFixed(2)})`,
            borderRadius: 999,
            boxShadow: `0 ${u(2.6)} ${u(7.5)} rgba(0,0,0,0.5), 0 0 ${u(5)} rgba(235,232,245,${(focus * 0.03 + pulse * 0.06).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.07)`,
          }}
        >
          <MapPin style={{ width: u(3), height: u(3), color: `rgba(253,252,251,${(0.4 + focus * 0.15).toFixed(2)})`, flexShrink: 0 }} />
          <div className="flex-1 flex items-center" style={{ minWidth: 0 }}>
            {text ? (
              <span className="font-body" style={{ fontSize: u(2.75), color: 'rgba(253,252,251,0.95)', whiteSpace: 'nowrap' }}>{text}</span>
            ) : (
              <span className="font-body" style={{ fontSize: u(2.75), color: 'rgba(253,252,251,0.3)', whiteSpace: 'nowrap' }}>Skriv inn adressen din …</span>
            )}
            {caretOn && <span style={{ width: 1.5, height: u(3.5), marginLeft: u(0.5), background: 'rgba(253,252,251,0.85)' }} />}
            {checkP > 0.01 && (
              <span style={{ marginLeft: u(1.4), transform: `scale(${Math.max(0.4, Math.min(checkP, 1.12)).toFixed(2)})`, flexShrink: 0, display: 'inline-flex' }}>
                <ChipCheck size={3.3} />
              </span>
            )}
          </div>
          <span
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: u(7.2), height: u(7.2), borderRadius: '50%',
              background: selRaw > 0.4 ? 'linear-gradient(150deg, #FFFFFF 10%, #F1EEF6 55%, #DCD6E6)' : 'rgba(255,255,255,0.08)',
              border: selRaw > 0.4 ? 'none' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: selRaw > 0.4 ? `0 ${u(1)} ${u(3.4)} rgba(0,0,0,0.45), inset 0 ${u(0.4)} ${u(0.8)} rgba(255,255,255,0.9)` : 'none',
              transition: 'background 0.45s, border 0.45s, box-shadow 0.45s',
            }}
          >
            <ArrowRight style={{ width: u(3), height: u(3), color: selRaw > 0.4 ? '#17161B' : 'rgba(253,252,251,0.7)' }} />
          </span>
        </div>

        {/* forslag — kaskaderer inn rad for rad */}
        {panelO > 0.01 && (
          <div
            className="absolute left-0 right-0 overflow-hidden"
            style={{
              top: `calc(100% + ${u(1.6)})`,
              background: 'rgba(19,18,23,0.95)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: u(2.8),
              boxShadow: `0 ${u(2.8)} ${u(8.5)} rgba(0,0,0,0.55)`,
              opacity: panelO.toFixed(2),
              transform: `translateY(${u((1 - dd) * 2 + sel * 1.8)})`,
              filter: sel > 0.02 ? `blur(${(sel * 4).toFixed(1)}px)` : 'none',
              zIndex: 5,
            }}
          >
            {SUGGESTIONS.map((s, i) => {
              const rowIn = easeOutCubic(seg(lt, ddAt + 0.1 + i * 0.13, ddAt + 0.5 + i * 0.13));
              const rowHl = i === 0 ? hl : 0;
              return (
                <div
                  key={s}
                  className="flex items-center"
                  style={{
                    gap: u(1.8),
                    padding: `${u(2.1)} ${u(2.8)}`,
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    background: rowHl > 0 ? `rgba(255,255,255,${(0.08 * rowHl).toFixed(3)})` : 'transparent',
                    opacity: rowIn.toFixed(2),
                    transform: `translateY(${u((1 - rowIn) * 1.6)})`,
                  }}
                >
                  <MapPin style={{ width: u(2.4), height: u(2.4), color: i === 0 && hl > 0.4 ? 'rgba(253,252,251,0.85)' : 'rgba(253,252,251,0.3)', flexShrink: 0 }} />
                  <span className="font-body" style={{ fontSize: u(2.45), color: i === 0 && hl > 0.4 ? 'rgba(253,252,251,0.95)' : 'rgba(253,252,251,0.52)', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== 03 · AUTOMATIKK ===================== */
const RELAY = [
  { at: 1.0, icon: Megaphone, title: 'Annonse publisert', sub: 'Finn.no · Airbnb · Booking.com' },
  { at: 2.6, icon: TrendingUp, title: 'Pris optimalisert', sub: '25 500 kr/mnd · dynamisk' },
  { at: 4.2, icon: FileCheck, title: 'Kontrakt signert', sub: 'BankID · 12 måneder' },
];

function RelayCard({ t, at, icon: Icon, title, sub, last }) {
  const inRaw = easeOutBack(seg(t, at, at + 0.5));
  if (inRaw <= 0.003) return null;
  const oIn = clamp01(seg(t, at, at + 0.25) * 2);
  const exP = last ? 0 : easeInOutCubic(seg(t, at + 1.45, at + 1.95));
  const o = oIn * (1 - exP);
  if (o <= 0.004) return null;
  const inP = Math.min(inRaw, 1.04);
  const y = (1 - inP) * 6 - exP * 7;
  const blur = (1 - clamp01(seg(t, at, at + 0.4))) * 5 + exP * 5;
  return (
    <div
      className="absolute flex items-center"
      style={{
        left: '50%', top: '50%', width: u(58), height: u(12.6),
        transform: `translate(-50%, -50%) translateY(${u(y)}) scale(${((0.94 + 0.06 * inP) * (1 - exP * 0.05)).toFixed(3)})`,
        opacity: o.toFixed(2),
        filter: blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : 'none',
        background: 'rgba(21,20,25,0.92)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: u(3.2),
        padding: `0 ${u(2.8)}`,
        gap: u(2.4),
        boxShadow: `0 ${u(2.6)} ${u(7.5)} rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)`,
      }}
    >
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{
          width: u(7.2), height: u(7.2), borderRadius: u(2.1),
          background: 'linear-gradient(150deg, rgba(255,255,255,0.13), rgba(255,255,255,0.04))',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12)`,
        }}
      >
        <Icon style={{ width: u(3.5), height: u(3.5), color: 'rgba(253,252,251,0.88)' }} />
      </span>
      <div className="flex-1" style={{ minWidth: 0, overflow: 'hidden' }}>
        <p className="font-body font-medium" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.94)', whiteSpace: 'nowrap' }}>{title}</p>
        <p className="font-body" style={{ fontSize: u(2.1), color: 'rgba(253,252,251,0.46)', whiteSpace: 'nowrap', marginTop: u(0.4) }}>{sub}</p>
      </div>
      <RowStatus t={t} done={at + 0.75} size={3.6} />
    </div>
  );
}

function ActAutomatikk({ t }) {
  const lt = t - A3[0];
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <Kicker t={lt} at={0.35} num="03" label="Automatikk" />
      <div className="relative" style={{ width: u(66), height: u(20), marginTop: u(4) }}>
        {RELAY.map((r, i) => (
          <RelayCard key={r.title} t={lt} at={r.at} icon={r.icon} title={r.title} sub={r.sub} last={i === RELAY.length - 1} />
        ))}
      </div>
    </div>
  );
}

/* ===================== 04 · UTBETALING ===================== */
function ActUtbetaling({ t }) {
  const lt = t - A4[0];
  const inRaw = easeOutBack(seg(lt, 0.9, 1.6));
  const inP = Math.min(inRaw, 1.04);
  const amount = 25000 * easeOutCubic(seg(lt, 1.5, 2.6));
  const check = easeOutBack(seg(lt, 2.75, 3.15));
  const bloom = Math.sin(clamp01(seg(lt, 2.75, 3.7)) * Math.PI);
  const cap = easeOutCubic(seg(lt, 3.5, 4.0));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <Kicker t={lt} at={0.35} num="04" label="Utbetaling" />

      {inRaw > 0.003 && (
        <div className="relative" style={{ marginTop: u(6) }}>
          {/* lysbloom når beløpet lander */}
          <span
            className="absolute pointer-events-none"
            style={{
              inset: u(-10),
              background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(240,237,248,0.10), transparent 70%)',
              opacity: bloom.toFixed(2),
              transform: `scale(${(0.85 + bloom * 0.25).toFixed(2)})`,
            }}
          />
          <div
            className="relative"
            style={{
              width: u(60),
              background: 'rgba(21,20,25,0.93)', backdropFilter: 'blur(10px)',
              border: `1px solid rgba(255,255,255,${(0.13 + bloom * 0.08).toFixed(2)})`,
              borderRadius: u(3.2),
              padding: u(3),
              opacity: Math.min(inRaw * 1.4, 1).toFixed(2),
              transform: `translateY(${u((1 - inP) * -5)}) scale(${(0.9 + 0.1 * inP).toFixed(3)})`,
              boxShadow: `0 ${u(3)} ${u(9)} rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.09)`,
            }}
          >
            <div className="flex items-center" style={{ gap: u(2.4) }}>
              <span
                className="inline-flex items-center justify-center shrink-0"
                style={{
                  width: u(8.4), height: u(8.4), borderRadius: u(2.2),
                  background: 'linear-gradient(150deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                  border: '1px solid rgba(255,255,255,0.17)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.13)',
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
              <span className="font-heading font-bold" style={{ fontSize: u(6.8), color: '#FDFCFB', letterSpacing: '-0.02em', lineHeight: 1 }}>
                {fmtNOK(amount)} kr
              </span>
              {check > 0.01 && (
                <span style={{ transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`, display: 'inline-flex' }}>
                  <ChipCheck size={4.6} />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {cap > 0.01 && (
        <div className="flex items-center" style={{ gap: u(1.3), marginTop: u(3.4), opacity: cap.toFixed(2), transform: `translateY(${u((1 - cap) * 2)})` }}>
          <Repeat style={{ width: u(2.5), height: u(2.5), color: '#7ee2a8' }} />
          <span className="font-body" style={{ fontSize: u(2.4), color: 'rgba(253,252,251,0.6)' }}>Hver måned · helt automatisk</span>
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
  const fy = Math.sin(t * 0.5) * 0.45;

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ '--u': `${un}px`, aspectRatio: '100 / 94' }}
      aria-hidden="true"
    >
      <Backdrop t={t} />
      <div className="absolute inset-0" style={{ transform: `translateY(${u(fy)})` }}>
        <Act t={t} a={A1[0]} b={A1[1]}><ActAutopilot t={t} /></Act>
        <Act t={t} a={A2[0]} b={A2[1]}><ActAdresse t={t} /></Act>
        <Act t={t} a={A3[0]} b={A3[1]}><ActAutomatikk t={t} /></Act>
        <Act t={t} a={A4[0]} b={A4[1]}><ActUtbetaling t={t} /></Act>
      </div>
      <LightSweep t={t} />
    </div>
  );
}
