'use client';

/*
  HeroLoop — sømløs produktloop for heroen («Utleie. På autopilot.»).
  Tre mikroscener i en evig 15s-loop som forteller produkthistorien:
    1. Adresse — feltet fylles ut, forslag dukker opp, adressen velges
    2. Autopilot — toggelen slås på, statuser bekreftes
    3. Utbetaling — leien tikker inn, neste leietaker bekreftet
  Ren platina/glass-estetikk. Ingen partikler, ingen romstøv —
  bare presise easinger og mykt studiolys.
  Alle størrelser i --u (1u = 1 % av komponentbredden).
*/

import { useEffect, useRef, useState } from 'react';
import { MapPin, ArrowRight, Home, CalendarCheck2, TrendingUp } from 'lucide-react';
import {
  seg, clamp01, easeOutCubic, easeInOutCubic, easeOutBack, easeOutQuint,
  fadeInOut, fmtNOK, typed,
} from '@/components/video/filmUtils';

const LOOP = 15;
const u = (n) => `calc(var(--u) * ${typeof n === 'number' ? n.toFixed(3) : n})`;

function useLoopTime(playing) {
  const [t, setT] = useState(0);
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  useEffect(() => {
    if (reduce) {
      setT(8.6); // statisk: autopilot aktivert med statuser
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
          background: 'radial-gradient(ellipse 60% 100% at 50% 50%, rgba(190,182,215,0.13), transparent 72%)',
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

/* ---------- liten kicker over hver scene ---------- */
function SceneKicker({ children, enter }) {
  return (
    <p
      className="font-body uppercase"
      style={{
        fontSize: u(2),
        letterSpacing: '0.42em',
        color: 'rgba(253,252,251,0.42)',
        marginBottom: u(3.4),
        opacity: enter,
        transform: `translateY(${u((1 - enter) * 2.5)})`,
      }}
    >
      {children}
    </p>
  );
}

/* ===================== SCENE 1 — ADRESSE ===================== */
const ADDR_SHORT = 'Møhlenprisbakken 14';
const ADDR_FULL = 'Møhlenprisbakken 14, Bergen';
const SUGGESTIONS = [
  'Møhlenprisbakken 14, Bergen',
  'Møhlenpris allé 2, Bergen',
  'Møhlenprisveien 8, Bergen',
];

function SceneAdresse({ t }) {
  const o = fadeInOut(t, 0, 5.4, 0.5, 0.55);
  if (o <= 0.003) return null;
  const lt = t;
  const enter = easeOutQuint(seg(lt, 0.1, 0.9));
  const typeP = seg(lt, 1.0, 2.6);
  const dd = easeOutCubic(seg(lt, 1.7, 2.25));
  const hl = easeOutCubic(seg(lt, 2.9, 3.2));
  const selRaw = seg(lt, 3.4, 3.8);
  const sel = easeInOutCubic(selRaw);
  const panelO = dd * (1 - sel);
  const checkP = easeOutBack(seg(lt, 3.65, 4.05));
  const foundP = easeOutBack(seg(lt, 4.3, 4.75));
  const fieldPulse = Math.sin(clamp01(seg(lt, 3.55, 4.5)) * Math.PI);

  const typingActive = lt > 0.95 && selRaw <= 0;
  const caretOn = typingActive && Math.sin(lt * 7.5) > -0.2;
  const text = selRaw > 0.4 ? ADDR_FULL : typed(ADDR_SHORT, typeP);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: o }}>
      <SceneKicker enter={enter}>Adresse</SceneKicker>

      <div
        className="relative"
        style={{
          width: u(66),
          transform: `translateY(${u((1 - enter) * 4)}) scale(${(0.96 + 0.04 * enter).toFixed(3)})`,
          opacity: enter,
        }}
      >
        {/* felt */}
        <div
          className="relative flex items-center"
          style={{
            height: u(9.6),
            gap: u(1.8),
            padding: `0 ${u(1.4)} 0 ${u(2.6)}`,
            background: 'rgba(22,21,26,0.9)',
            border: `1px solid rgba(255,255,255,${(0.13 + fieldPulse * 0.14).toFixed(2)})`,
            borderRadius: u(4.8),
            boxShadow: `0 ${u(2.4)} ${u(7)} rgba(0,0,0,0.5), 0 0 ${u(5)} rgba(235,232,245,${(fieldPulse * 0.07).toFixed(3)}), inset 0 1px 0 rgba(255,255,255,0.06)`,
          }}
        >
          <MapPin style={{ width: u(2.9), height: u(2.9), color: 'rgba(253,252,251,0.45)', flexShrink: 0 }} />
          <div className="flex-1 flex items-center" style={{ minWidth: 0 }}>
            {text ? (
              <span className="font-body" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.94)', whiteSpace: 'nowrap' }}>
                {text}
              </span>
            ) : (
              <span className="font-body" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.32)', whiteSpace: 'nowrap' }}>
                Skriv inn adressen din …
              </span>
            )}
            {caretOn && (
              <span
                style={{
                  width: 1.5, height: u(3.4), marginLeft: u(0.5),
                  background: 'rgba(253,252,251,0.85)',
                }}
              />
            )}
            {checkP > 0.01 && (
              <span
                className="inline-flex items-center justify-center"
                style={{
                  marginLeft: u(1.4),
                  width: u(3.2), height: u(3.2), borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.45)',
                  transform: `scale(${Math.max(0.4, Math.min(checkP, 1.12)).toFixed(2)})`,
                  flexShrink: 0,
                }}
              >
                <span style={{ color: '#7ee2a8', fontWeight: 700, fontSize: u(1.9), lineHeight: 1 }}>✓</span>
              </span>
            )}
          </div>
          {/* knapp */}
          <span
            className="inline-flex items-center justify-center"
            style={{
              width: u(7), height: u(7), borderRadius: '50%', flexShrink: 0,
              background: selRaw > 0.4
                ? 'linear-gradient(145deg, #FFFFFF, #E4E0EC)'
                : 'rgba(255,255,255,0.09)',
              border: selRaw > 0.4 ? 'none' : '1px solid rgba(255,255,255,0.12)',
              boxShadow: selRaw > 0.4 ? `0 ${u(1)} ${u(3.4)} rgba(0,0,0,0.45)` : 'none',
              transition: 'background 0.45s, border 0.45s',
            }}
          >
            <ArrowRight style={{ width: u(2.9), height: u(2.9), color: selRaw > 0.4 ? '#17161B' : 'rgba(253,252,251,0.7)' }} />
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

        {/* funnet-pille */}
        {foundP > 0.01 && (
          <div className="absolute left-0 right-0 flex justify-center" style={{ top: `calc(100% + ${u(2.6)})` }}>
            <span
              className="font-body inline-flex items-center"
              style={{
                gap: u(1.2),
                fontSize: u(2.2), color: 'rgba(253,252,251,0.62)',
                opacity: Math.min(foundP, 1).toFixed(2),
                transform: `translateY(${u((1 - Math.min(foundP, 1)) * 2)})`,
              }}
            >
              <Home style={{ width: u(2.4), height: u(2.4), color: 'rgba(253,252,251,0.5)' }} />
              Eiendom verifisert · 68 m² · 3 soverom
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ===================== SCENE 2 — AUTOPILOT ===================== */
function SceneToggle({ t }) {
  const o = fadeInOut(t, 5.1, 10.0, 0.55, 0.55);
  if (o <= 0.003) return null;
  const lt = t - 5.1;
  const enter = easeOutCubic(seg(lt, 0.05, 0.85));
  const knob = easeOutBack(seg(lt, 1.1, 1.65));
  const charge = seg(lt, 0.5, 1.1);
  const on = seg(lt, 1.1, 1.65) > 0.4;
  const statusIn = easeOutCubic(seg(lt, 1.8, 2.4));
  const KW = 11.6, TW = 30, TH = 14.4, PAD = 1.4;
  const travel = TW - KW - PAD * 2;
  const kx = travel * (knob > 1 ? 1 + (knob - 1) * 0.35 : Math.max(0, knob));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: o }}>
      <SceneKicker enter={enter}>Autopilot</SceneKicker>

      <div
        className="relative"
        style={{
          width: u(TW), height: u(TH),
          transform: `translateY(${u((1 - enter) * 5)}) scale(${(0.94 + 0.06 * enter).toFixed(3)})`,
          opacity: enter,
        }}
      >
        {charge > 0.01 && charge < 0.999 && (
          <div
            className="absolute rounded-full"
            style={{
              inset: u(-2.2),
              border: `1px solid rgba(255,255,255,${(0.4 * Math.sin(charge * Math.PI)).toFixed(2)})`,
              transform: `scale(${(1.22 - 0.22 * charge).toFixed(3)})`,
            }}
          />
        )}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: on
              ? 'linear-gradient(135deg, rgba(255,255,255,0.20), rgba(255,255,255,0.07))'
              : 'rgba(255,255,255,0.06)',
            border: `1px solid ${on ? 'rgba(255,255,255,0.38)' : 'rgba(255,255,255,0.13)'}`,
            boxShadow: on
              ? `0 0 ${u(5)} rgba(235,232,245,0.16), inset 0 1px 0 rgba(255,255,255,0.18)`
              : 'inset 0 1px 0 rgba(255,255,255,0.06)',
            transition: 'background 0.45s, border 0.45s, box-shadow 0.45s',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            top: '50%', left: u(PAD), width: u(KW), height: u(KW),
            transform: `translateY(-50%) translateX(${u(kx)})`,
            background: 'linear-gradient(145deg, #FFFFFF, #E4E0EC)',
            boxShadow: `0 ${u(0.8)} ${u(2.6)} rgba(0,0,0,0.5)${on ? `, 0 0 ${u(2.6)} rgba(255,255,255,0.25)` : ''}`,
          }}
        />
      </div>

      <div
        className="flex items-center"
        style={{ gap: u(1.4), marginTop: u(3.4), opacity: statusIn, transform: `translateY(${u((1 - statusIn) * 2)})` }}
      >
        <span
          className="inline-flex rounded-full"
          style={{ width: u(1.5), height: u(1.5), background: '#34d399', boxShadow: `0 0 ${u(1.6)} rgba(52,211,153,0.8)` }}
        />
        <span className="font-body" style={{ fontSize: u(2.7), color: 'rgba(253,252,251,0.88)' }}>Autopilot aktivert</span>
      </div>

      <div className="flex flex-col items-center" style={{ gap: u(1.6), marginTop: u(3.2) }}>
        <LoopPill t={lt} at={2.5} done={3.4}>Annonse publisert på Finn og Airbnb</LoopPill>
        <LoopPill t={lt} at={3.25} done={4.2}>Pris optimalisert · 25 500 kr/mnd</LoopPill>
      </div>
    </div>
  );
}

/* ===================== SCENE 3 — UTBETALING ===================== */
function SceneVarsel({ t }) {
  const o = fadeInOut(t, 9.7, 14.6, 0.55, 0.6);
  if (o <= 0.003) return null;
  const lt = t - 9.7;
  const enter = easeOutCubic(seg(lt, 0.05, 0.7));
  const n1 = easeOutBack(seg(lt, 0.5, 1.15));
  const amount = 25000 * easeOutCubic(seg(lt, 1.1, 2.2));
  const check = easeOutBack(seg(lt, 2.3, 2.75));
  const n2 = easeOutBack(seg(lt, 3.0, 3.6));
  const cap = easeOutCubic(seg(lt, 3.7, 4.3));

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ opacity: o }}>
      <SceneKicker enter={enter}>Utbetaling</SceneKicker>

      {n1 > 0.01 && (
        <div
          className="relative"
          style={{
            width: u(60),
            background: 'rgba(21,20,25,0.9)', backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: u(3),
            padding: u(3),
            opacity: Math.min(n1 * 1.4, 1).toFixed(2),
            transform: `translateY(${u((1 - Math.min(n1, 1.07)) * -6)}) scale(${Math.max(0.85, Math.min(n1, 1.04)).toFixed(3)})`,
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
              <span
                className="inline-flex items-center justify-center"
                style={{
                  width: u(4.6), height: u(4.6), borderRadius: '50%',
                  background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.5)',
                  transform: `scale(${Math.max(0.4, Math.min(check, 1.12)).toFixed(2)})`,
                }}
              >
                <span style={{ color: '#7ee2a8', fontWeight: 700, fontSize: u(2.6) }}>✓</span>
              </span>
            )}
          </div>
        </div>
      )}

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

/* ---------- fremdriftsindikator (3 segmenter) ---------- */
function ProgressDots({ t }) {
  const ps = [seg(t, 0, 5.4), seg(t, 5.1, 10.0), seg(t, 9.7, 14.6)];
  return (
    <div className="absolute flex items-center justify-center" style={{ left: 0, right: 0, bottom: u(-1), gap: u(1.4) }}>
      {ps.map((p, i) => (
        <span
          key={i}
          className="relative overflow-hidden rounded-full"
          style={{ width: u(6.5), height: u(0.7), background: 'rgba(255,255,255,0.10)' }}
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${(p * 100).toFixed(1)}%`,
              background: p >= 1 ? 'rgba(255,255,255,0.16)' : 'rgba(253,252,251,0.6)',
            }}
          />
        </span>
      ))}
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
  const fy = Math.sin(t * 0.5) * 0.55;

  return (
    <div
      ref={wrapRef}
      className="relative w-full select-none"
      style={{ '--u': `${un}px`, aspectRatio: '100 / 94' }}
      aria-hidden="true"
    >
      <Backdrop t={t} />
      <div className="absolute inset-0" style={{ transform: `translateY(${u(fy)})` }}>
        <SceneAdresse t={t} />
        <SceneToggle t={t} />
        <SceneVarsel t={t} />
      </div>
      <ProgressDots t={t} />
    </div>
  );
}
