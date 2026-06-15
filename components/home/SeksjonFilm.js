'use client';

/*
  Seksjon 2 — «Slik fungerer DigiHome» (LYS variant for /2).
  Et autospillende kapittel-galleri: en vertikal stegliste til venstre med
  fremdriftsindikator, og en stor produkt-scene til høyre som krysstoner mellom
  fem skreddersydde, lyse UI-scener. Fortellingen er «fra annonse til leie på
  konto»: Annonse → Visninger → Leietaker → Kontrakt → Utbetaling.

  Designprinsipper (anti-slop / DigiHome-stil):
    - Varmt papir (#FEFBFA), blekk-typografi, én lavendel-aksent, smaragd på «ferdig».
    - Kantløse flater: hvite kort med ÉN myk skygge — ingen harde borders/outlines.
    - Rolig, presis bevegelse: kun cubic-easing, ingen overshoot/pop/spinnere.
    - Ekte tall og ekte tekst — ingen plassholdere.
  Scene-koordinatene bruker --su = 1 % av scenens bredde. Scenen er kvadratisk
  (100 × 100 enheter). Rører IKKE /video-pipelinen.
*/

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { seg, clamp01, easeOutCubic, easeInOutCubic } from '@/components/video/filmUtils';

/* ---------- enheter & palett ---------- */
const u = (n) => `calc(var(--su) * ${typeof n === 'number' ? n.toFixed(3) : n})`;
const INK = (a = 1) => `rgba(22,18,31,${a})`;
const QUIET = (a = 1) => `rgba(124,116,102,${a})`;
const LAV = (a = 1) => `rgba(155,91,214,${a})`;
const LAVS = (a = 1) => `rgba(207,151,252,${a})`;
const EMER = (a = 1) => `rgba(24,121,78,${a})`;

const REVEAL_DUR = 1.7; // s — scenens oppbygging
const STEP_DUR = 6.8;   // s — autospill per steg

const nbsp = (v) => {
  const s = String(Math.round(v));
  return s.length > 3 ? `${s.slice(0, -3)}\u202F${s.slice(-3)}` : s;
};

/* kantløs hvit flate — én myk skygge, ørliten hairline for definisjon */
const card = (extra = {}) => ({
  background: '#FFFFFF',
  boxShadow: '0 1px 2px rgba(22,18,31,0.04), 0 32px 64px -28px rgba(22,18,31,0.28)',
  ...extra,
});

const riseIn = (p, d = 2.4) => ({
  opacity: Math.min(1, p * 1.5),
  transform: `translateY(${u((1 - p) * d)})`,
});

/* ---------- delte byggesteiner ---------- */
function Check({ p = 1, size = 3 }) {
  if (p <= 0.01) return null;
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: u(size), height: u(size), borderRadius: '50%',
        background: EMER(0.1),
        opacity: Math.min(1, p * 1.6),
        transform: `scale(${(0.82 + 0.18 * easeOutCubic(p)).toFixed(3)})`,
      }}
    >
      <svg viewBox="0 0 12 12" style={{ width: '56%', height: '56%' }} fill="none">
        <path d="M2.6 6.4 L5 8.7 L9.5 3.6" stroke={EMER(0.95)} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function Pending({ size = 3 }) {
  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: u(size), height: u(size) }}>
      <span style={{ width: u(0.95), height: u(0.95), borderRadius: '50%', background: INK(0.16) }} />
    </span>
  );
}

/* skjelett-linje som krysstoner til ekte tekst */
function WriteLine({ p, w, children }) {
  return (
    <div className="relative">
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
        style={{ width: u(w), height: u(1.6), background: INK(0.06), opacity: Math.max(0, 1 - p * 1.9).toFixed(2) }}
      />
      <div style={{ opacity: Math.min(1, p * 1.4), transform: `translateY(${u((1 - p) * 1)})` }}>{children}</div>
    </div>
  );
}

/* ============================================================
   01 — ANNONSE · «Annonsen skriver seg selv»
   ============================================================ */
const PUB = [
  { name: 'Finn.no', at: 0.72 },
  { name: 'Airbnb', at: 0.79 },
  { name: 'Hybel', at: 0.86 },
];

function SceneAnnonse({ q, clock }) {
  const cardIn = easeOutCubic(seg(q, 0.0, 0.16));
  const rev = easeInOutCubic(seg(q, 0.08, 0.5));
  const l1 = easeOutCubic(seg(q, 0.42, 0.56));
  const l2 = easeOutCubic(seg(q, 0.5, 0.64));
  const l3 = easeOutCubic(seg(q, 0.58, 0.72));
  const live = easeOutCubic(seg(q, 0.6, 0.72));
  const statP = easeOutCubic(seg(q, 0.9, 1));
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(clock * 2));

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute overflow-hidden"
        style={{ left: u(6), right: u(6), top: u(4), borderRadius: u(3), ...card(), opacity: cardIn, transform: `translateY(${u((1 - cardIn) * 4)})` }}
      >
        <div className="relative w-full overflow-hidden" style={{ height: u(34) }}>
          <div className="absolute inset-0" style={{ clipPath: `inset(0 ${((1 - rev) * 100).toFixed(2)}% 0 0)`, transform: `scale(${(1.05 - 0.05 * rev).toFixed(4)})` }}>
            <Image src="/interior-living.webp" alt="" fill sizes="40vw" className="object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(200deg, transparent 58%, rgba(22,18,31,0.28))' }} />
          </div>
          {rev > 0.02 && rev < 0.985 && (
            <span className="absolute top-0 bottom-0" style={{ left: `${(rev * 100).toFixed(2)}%`, width: 1.5, background: LAVS(0.9) }} />
          )}
          {live > 0.02 && (
            <span
              className="absolute inline-flex items-center"
              style={{ left: u(2.4), top: u(2.2), gap: u(1.1), padding: `${u(0.9)} ${u(1.9)}`, borderRadius: 999, background: 'rgba(255,255,255,0.92)', boxShadow: '0 6px 18px rgba(22,18,31,0.12)', backdropFilter: 'blur(6px)', opacity: live }}
            >
              <span style={{ width: u(1), height: u(1), borderRadius: '50%', background: EMER(1), opacity: pulse }} />
              <span className="font-body font-semibold uppercase" style={{ fontSize: u(1.55), letterSpacing: '0.22em', color: INK(0.82) }}>Live</span>
            </span>
          )}
        </div>
        <div style={{ padding: `${u(2.8)} ${u(3.4)} ${u(3)}`, display: 'flex', flexDirection: 'column', gap: u(1.7) }}>
          <WriteLine p={l1} w={44}>
            <p className="font-heading font-bold" style={{ fontSize: u(3.1), color: INK(0.95), lineHeight: 1.12 }}>Lys 3-roms med utsikt mot Byfjorden</p>
          </WriteLine>
          <WriteLine p={l2} w={30}>
            <p className="font-body" style={{ fontSize: u(2.1), color: QUIET(0.95) }}>Sandviken · 74 m² · 3. etasje · Møblert</p>
          </WriteLine>
          <WriteLine p={l3} w={24}>
            <div className="flex items-baseline" style={{ gap: u(1.3), marginTop: u(0.3) }}>
              <p className="font-heading font-bold" style={{ fontSize: u(3.3), color: INK(0.95) }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{'24\u202F800'}</span> kr
              </p>
              <span className="font-body" style={{ fontSize: u(1.85), color: QUIET(0.8) }}>/ mnd · satt av autopiloten</span>
            </div>
          </WriteLine>
        </div>
      </div>

      {/* publiseringspiller */}
      <div className="absolute flex items-center" style={{ left: u(6), top: u(68), gap: u(1.6) }}>
        {PUB.map((pf) => {
          const okP = easeOutCubic(seg(q, pf.at, pf.at + 0.06));
          return (
            <span
              key={pf.name}
              className="inline-flex items-center"
              style={{ gap: u(1), padding: `${u(1.2)} ${u(2)}`, borderRadius: 999, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(22,18,31,0.04), 0 12px 28px -16px rgba(22,18,31,0.3)', opacity: easeOutCubic(seg(q, pf.at - 0.08, pf.at)), transform: `translateY(${u((1 - easeOutCubic(seg(q, pf.at - 0.08, pf.at))) * 2)})` }}
            >
              {okP > 0.01 ? <Check p={okP} size={2.4} /> : <Pending size={2.4} />}
              <span className="font-body font-medium" style={{ fontSize: u(2), color: INK(0.82) }}>{pf.name}</span>
            </span>
          );
        })}
      </div>

      {statP > 0.01 && (
        <div className="absolute flex items-center" style={{ left: u(6), right: u(6), top: u(81), gap: u(1.6), ...riseIn(statP, 2) }}>
          <Check p={statP} size={3} />
          <span className="font-body" style={{ fontSize: u(2.15), color: QUIET(1) }}>
            <span style={{ color: INK(0.92), fontWeight: 600 }}>12 henvendelser</span> — første visning booket innen ett døgn
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   02 — VISNINGER · «Visningene booker seg selv»
   ============================================================ */
const SLOTS = [
  { day: 'I dag', time: '18:00', who: 'Sofie H.', at: 0.42 },
  { day: 'Onsdag', time: '17:30', who: 'Jonas B.', at: 0.56 },
  { day: 'Lørdag', time: '12:00', who: 'Amir K.', at: 0.7 },
];

function SceneVisninger({ q, clock }) {
  const headIn = easeOutCubic(seg(q, 0.0, 0.16));
  const count = Math.round(12 * easeOutCubic(seg(q, 0.08, 0.46)));
  const cardIn = easeOutCubic(seg(q, 0.24, 0.4));
  const footP = easeOutCubic(seg(q, 0.9, 1));
  const pulse = 0.5 + 0.5 * Math.abs(Math.sin(clock * 2));

  return (
    <div className="absolute inset-0" aria-hidden="true">
      {/* teller-blokk */}
      <div className="absolute" style={{ left: u(6), right: u(6), top: u(5), ...riseIn(headIn, 3) }}>
        <p className="font-body font-semibold uppercase" style={{ fontSize: u(1.7), letterSpacing: '0.28em', color: QUIET(0.85) }}>Interesse</p>
        <div className="flex items-baseline" style={{ gap: u(1.6), marginTop: u(1.2) }}>
          <span className="font-heading font-bold" style={{ fontSize: u(9.5), lineHeight: 1, color: INK(0.96), fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.02em' }}>{count}</span>
          <span className="font-body" style={{ fontSize: u(2.4), color: QUIET(1) }}>henvendelser</span>
          <span className="inline-flex items-center" style={{ gap: u(0.9), marginLeft: 'auto' }}>
            <span style={{ width: u(1.1), height: u(1.1), borderRadius: '50%', background: EMER(1), opacity: pulse }} />
            <span className="font-body" style={{ fontSize: u(1.85), color: EMER(0.95) }}>svarer · døgnet rundt</span>
          </span>
        </div>
      </div>

      {/* visnings-kort */}
      <div
        className="absolute"
        style={{ left: u(6), right: u(6), top: u(30), borderRadius: u(3), padding: `${u(3)} ${u(3.2)}`, ...card(), opacity: cardIn, transform: `translateY(${u((1 - cardIn) * 4)})` }}
      >
        <p className="font-body font-semibold uppercase" style={{ fontSize: u(1.6), letterSpacing: '0.28em', color: QUIET(0.8), marginBottom: u(2.4) }}>Bookede visninger</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(1.4) }}>
          {SLOTS.map((s) => {
            const rowP = easeOutCubic(seg(q, s.at - 0.08, s.at));
            const tickP = easeOutCubic(seg(q, s.at + 0.03, s.at + 0.11));
            if (rowP <= 0.01) return null;
            return (
              <div key={s.who} className="flex items-center" style={{ gap: u(2), padding: `${u(1.9)} ${u(2)}`, borderRadius: u(2), background: INK(0.025), ...riseIn(rowP, 1.6) }}>
                <span className="inline-flex items-center justify-center font-heading font-bold shrink-0" style={{ width: u(5.4), height: u(5.4), borderRadius: '50%', background: LAV(0.12), color: LAV(0.95), fontSize: u(2) }}>
                  {s.who.split(' ').map((w) => w[0]).join('')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-body font-semibold whitespace-nowrap" style={{ fontSize: u(2.3), color: INK(0.9) }}>{s.day} · {s.time}</p>
                  <p className="font-body whitespace-nowrap" style={{ fontSize: u(1.85), color: QUIET(0.95), marginTop: u(0.2) }}>{s.who}</p>
                </div>
                <span className="font-body" style={{ fontSize: u(1.85), color: EMER(0.95), marginRight: u(1) }}>Bekreftet</span>
                {tickP > 0.01 ? <Check p={tickP} size={3} /> : <Pending size={3} />}
              </div>
            );
          })}
        </div>
      </div>

      {footP > 0.01 && (
        <p className="absolute font-body" style={{ left: u(6), right: u(6), top: u(92), textAlign: 'center', fontSize: u(2.05), color: QUIET(1), ...riseIn(footP, 1.5) }}>
          Kalenderen fyller seg selv — du velger bare hvem som får nøkkelen.
        </p>
      )}
    </div>
  );
}

/* ============================================================
   03 — LEIETAKER · «Leietakeren kvalitetssikres»
   ============================================================ */
const CHECKS = [
  { label: 'BankID verifisert', at: 0.4 },
  { label: 'Inntekt dokumentert', at: 0.52 },
  { label: 'Referanser sjekket', at: 0.64 },
];

function SceneLeietaker({ q }) {
  const cardIn = easeOutCubic(seg(q, 0.04, 0.2));
  const badge = easeOutCubic(seg(q, 0.72, 0.84));
  const score = easeOutCubic(seg(q, 0.86, 1));

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute"
        style={{ left: u(8), right: u(8), top: u(11), borderRadius: u(3.2), padding: u(3.6), ...card(), opacity: cardIn, transform: `translateY(${u((1 - cardIn) * 5)})` }}
      >
        {badge > 0.01 && (
          <span
            className="absolute font-body font-semibold"
            style={{ top: u(3.4), right: u(3.4), padding: `${u(1)} ${u(2)}`, borderRadius: 999, fontSize: u(1.85), color: EMER(1), background: EMER(0.1), opacity: badge, transform: `translateY(${u((1 - badge) * 1.5)})` }}
          >
            Godkjent
          </span>
        )}
        <div className="flex items-center" style={{ gap: u(2.4), marginBottom: u(3), paddingRight: u(14) }}>
          <span className="inline-flex items-center justify-center font-heading font-bold shrink-0" style={{ width: u(8), height: u(8), borderRadius: '50%', fontSize: u(2.8), background: LAV(0.12), color: LAV(0.98) }}>MI</span>
          <div className="flex-1 min-w-0">
            <p className="font-heading font-bold whitespace-nowrap" style={{ fontSize: u(3), color: INK(0.95) }}>Martin &amp; Ida</p>
            <p className="font-body whitespace-nowrap" style={{ fontSize: u(2), color: QUIET(0.95), marginTop: u(0.4) }}>Par · stabil inntekt</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: u(1.4) }}>
          {CHECKS.map((c) => {
            const rowP = easeOutCubic(seg(q, c.at - 0.08, c.at));
            const tickP = easeOutCubic(seg(q, c.at + 0.03, c.at + 0.11));
            if (rowP <= 0.01) return null;
            return (
              <div key={c.label} className="flex items-center" style={{ gap: u(2), padding: `${u(1.8)} ${u(2)}`, borderRadius: u(2), background: INK(0.025), ...riseIn(rowP, 1.6) }}>
                {tickP > 0.01 ? <Check p={tickP} size={3.2} /> : <Pending size={3.2} />}
                <span className="font-body font-medium" style={{ fontSize: u(2.25), color: INK(0.85) }}>{c.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {score > 0.02 && (
        <div className="absolute flex items-center justify-center" style={{ left: 0, right: 0, top: u(82), gap: u(1.6), ...riseIn(score, 2) }}>
          <span className="font-heading font-bold" style={{ fontSize: u(3.4), color: INK(0.95), fontVariantNumeric: 'tabular-nums' }}>
            98<span style={{ color: INK(0.32) }}> / 100</span>
          </span>
          <span className="font-body" style={{ fontSize: u(2.1), color: QUIET(1) }}>i leietakerscore — best av 9 søkere</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   04 — KONTRAKT · «Kontrakten signeres digitalt»
   ============================================================ */
const SIG_D = 'M3 26 C 9 8, 15 8, 17 23 C 18 31, 23 33, 27 21 C 30 11, 36 11, 38 25 C 39 33, 45 33, 50 19 C 54 9, 61 10, 64 25 C 66 33, 73 32, 79 18 C 82 11, 89 13, 96 24';

function SceneKontrakt({ q }) {
  const cardIn = easeOutCubic(seg(q, 0.02, 0.18));
  const lineW = (i) => easeOutCubic(seg(q, 0.24 + i * 0.06, 0.36 + i * 0.06));
  const sigLabel = easeOutCubic(seg(q, 0.46, 0.56));
  const sigDraw = easeInOutCubic(seg(q, 0.5, 0.78));
  const stamp = easeOutCubic(seg(q, 0.8, 0.92));

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute overflow-hidden"
        style={{ left: u(15), right: u(15), top: u(4), borderRadius: u(2.6), padding: `${u(4)} ${u(4)} ${u(3.4)}`, ...card(), opacity: cardIn, transform: `translateY(${u((1 - cardIn) * 5)})` }}
      >
        {/* topp-stripe i lavendel */}
        <span className="absolute left-0 right-0 top-0" style={{ height: u(1), background: `linear-gradient(90deg, ${LAV(0.7)}, ${LAVS(0.6)})`, opacity: cardIn }} />

        <p className="font-body font-semibold uppercase" style={{ fontSize: u(1.6), letterSpacing: '0.28em', color: QUIET(0.8) }}>Leiekontrakt</p>
        <p className="font-heading font-bold" style={{ fontSize: u(3), color: INK(0.95), marginTop: u(1), lineHeight: 1.15 }}>Møhlenprisbakken 14, Bergen</p>
        <p className="font-body" style={{ fontSize: u(2), color: QUIET(0.95), marginTop: u(0.6) }}>12 måneder · depositum sikret</p>

        {/* skjelett-klausuler */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: u(1.6), marginTop: u(3.6) }}>
          {[40, 34, 38].map((w, i) => (
            <span key={i} className="block rounded-full" style={{ height: u(1.5), width: `${(w * lineW(i)).toFixed(1)}%`, background: INK(0.08) }} />
          ))}
        </div>

        {/* signaturlinje */}
        <div style={{ marginTop: u(5) }}>
          <div className="relative" style={{ height: u(11) }}>
            <svg viewBox="0 0 100 40" className="absolute" style={{ left: 0, bottom: u(2), width: '64%', height: u(9), overflow: 'visible' }} fill="none">
              <path d={SIG_D} pathLength="100" stroke={INK(0.78)} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="100" strokeDashoffset={(100 * (1 - sigDraw)).toFixed(2)} vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="absolute left-0 right-0 bottom-0" style={{ height: 1.5, background: INK(0.14) }} />
          </div>
          <p className="font-body" style={{ fontSize: u(1.8), color: QUIET(0.9), marginTop: u(1.2), opacity: sigLabel, transform: `translateY(${u((1 - sigLabel) * 1)})` }}>Signatur · leietaker</p>
        </div>
      </div>

      {/* BankID-kvittering */}
      {stamp > 0.01 && (
        <div className="absolute flex items-center justify-center" style={{ left: 0, right: 0, top: u(86), gap: u(1.6), ...riseIn(stamp, 2) }}>
          <span className="inline-flex items-center" style={{ gap: u(1.4), padding: `${u(1.3)} ${u(2.4)}`, borderRadius: 999, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(22,18,31,0.04), 0 14px 30px -16px rgba(22,18,31,0.32)' }}>
            <span className="relative inline-block" style={{ width: u(7), height: u(3) }}>
              <Image src="/bankid-logo.png" alt="BankID" fill sizes="80px" className="object-contain" />
            </span>
            <span className="font-body font-medium" style={{ fontSize: u(2.05), color: INK(0.85) }}>Signert med BankID</span>
            <Check p={easeOutCubic(seg(q, 0.86, 0.96))} size={2.8} />
          </span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   05 — UTBETALING · «Leien lander på konto»
   ============================================================ */
const LEDGER = [
  { d: '1. august', at: 0.6 },
  { d: '1. september', at: 0.7 },
  { d: '1. oktober', at: 0.8 },
];

function SceneUtbetaling({ q }) {
  const cardIn = easeOutCubic(seg(q, 0.02, 0.16));
  const cp = easeOutCubic(seg(q, 0.08, 0.42));
  const amount = 24800 * cp;
  const row = easeOutCubic(seg(q, 0.44, 0.54));
  const ledgerIn = easeOutCubic(seg(q, 0.52, 0.62));
  const footP = easeOutCubic(seg(q, 0.9, 1));
  const bloom = Math.sin(clamp01(seg(q, 0.34, 0.5)) * Math.PI);

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <div
        className="absolute"
        style={{ left: u(6), right: u(6), top: u(4), borderRadius: u(3.2), padding: `${u(3.6)} ${u(4)}`, ...card(), opacity: cardIn, transform: `translateY(${u((1 - cardIn) * 5)})` }}
      >
        <div className="flex items-center justify-between">
          <p className="font-body font-semibold uppercase whitespace-nowrap" style={{ fontSize: u(1.7), letterSpacing: '0.26em', color: QUIET(0.85) }}>Første utbetaling</p>
          <span className="font-body font-semibold uppercase whitespace-nowrap" style={{ fontSize: u(1.6), letterSpacing: '0.2em', color: LAV(0.85) }}>1. juli</span>
        </div>
        <div className="relative" style={{ marginTop: u(1.4) }}>
          <span className="absolute pointer-events-none" style={{ inset: u(-6), background: `radial-gradient(ellipse 60% 70% at 30% 50%, ${EMER(0.1)}, ${LAV(0.05)} 50%, transparent 72%)`, opacity: bloom.toFixed(2) }} />
          <p className="relative font-heading font-bold" style={{ fontSize: u(9.2), lineHeight: 1.02, color: INK(0.96), letterSpacing: '-0.02em' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{nbsp(amount)}</span> kr
          </p>
        </div>
        {row > 0.01 && (
          <div className="flex items-center" style={{ gap: u(1.6), marginTop: u(2), ...riseIn(row, 1.6) }}>
            <Check p={row} size={3} />
            <span className="font-body" style={{ fontSize: u(2.1), color: QUIET(1) }}>Overført til din konto — leie minus honorar</span>
          </div>
        )}
      </div>

      {/* hovedbok — månedene fortsetter av seg selv */}
      <div
        className="absolute"
        style={{ left: u(6), right: u(6), top: u(56), borderRadius: u(3), padding: `${u(0.5)} ${u(4)}`, ...card({ background: 'linear-gradient(180deg,#FFFFFF,#FCFAFE)' }), opacity: ledgerIn, transform: `translateY(${u((1 - ledgerIn) * 4)})` }}
      >
        {LEDGER.map((r, i) => {
          const p = easeOutCubic(seg(q, r.at, r.at + 0.08));
          const tickP = easeOutCubic(seg(q, r.at + 0.05, r.at + 0.13));
          return (
            <div key={r.d} className="flex items-center" style={{ gap: u(1.8), padding: `${u(2)} 0`, borderTop: i === 0 ? 'none' : `1px solid ${INK(0.05)}`, opacity: Math.min(1, p * 1.5), transform: `translateY(${u((1 - p) * 1.5)})` }}>
              <span className="flex-1 font-body" style={{ fontSize: u(2.1), color: QUIET(1) }}>{r.d}</span>
              <span className="font-body font-semibold" style={{ fontSize: u(2.1), color: INK(0.9) }}>
                <span style={{ fontVariantNumeric: 'tabular-nums' }}>{'24\u202F800'}</span> kr
              </span>
              <Check p={tickP} size={2.6} />
            </div>
          );
        })}
      </div>

      {footP > 0.01 && (
        <p className="absolute font-body" style={{ left: u(6), right: u(6), top: u(91), textAlign: 'center', fontSize: u(2.05), color: QUIET(1), ...riseIn(footP, 1.5) }}>
          Og slik fortsetter det — måned etter måned, helt automatisk.
        </p>
      )}
    </div>
  );
}

/* ---------- steg-data ---------- */
const STEPS = [
  { tag: 'Annonse', title: 'Annonsen skriver seg selv', body: 'Boligen styles, teksten skrives og prisen kalibreres mot Bergen-markedet. Publisert på Finn, Airbnb og Hybel — automatisk.', Scene: SceneAnnonse },
  { tag: 'Visninger', title: 'Visningene booker seg selv', body: 'Interessenter får svar på sekunder, og visninger legges rett inn i kalenderen. Du trenger ikke løfte en finger.', Scene: SceneVisninger },
  { tag: 'Leietaker', title: 'Leietakeren kvalitetssikres', body: 'Hver søker screenes med BankID, inntekt og referanser. Du møter kun de aller best kvalifiserte.', Scene: SceneLeietaker },
  { tag: 'Kontrakt', title: 'Kontrakten signeres digitalt', body: 'Leiekontrakten genereres og signeres trygt med BankID — depositum og det hele, ferdig på minutter.', Scene: SceneKontrakt },
  { tag: 'Utbetaling', title: 'Leien lander på konto', body: 'Husleien kommer hver måned, helt automatisk. Du ser bare beløpet tikke inn.', Scene: SceneUtbetaling },
];

/* ---------- kino-atmosfære (lys variant av filmens språk) ---------- */
const NOISE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>";

/* levende lavendel-aurora som puster og driver sakte */
function AuroraLight({ clock }) {
  const b1 = 0.82 + 0.18 * Math.sin(clock * 0.4);
  const b2 = 0.82 + 0.18 * Math.sin(clock * 0.32 + 2.1);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute"
        style={{
          left: '4%', top: '0%', width: '72%', height: '66%',
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${LAV(0.11)}, transparent 70%)`,
          opacity: b1.toFixed(3),
          transform: `translate3d(${(Math.sin(clock * 0.25) * 3).toFixed(2)}%, ${(Math.cos(clock * 0.2) * 2).toFixed(2)}%, 0)`,
        }}
      />
      <div
        className="absolute"
        style={{
          right: '2%', bottom: '4%', width: '64%', height: '58%',
          background: `radial-gradient(ellipse 60% 60% at 50% 50%, ${LAVS(0.1)}, transparent 70%)`,
          opacity: b2.toFixed(3),
          transform: `translate3d(${(Math.cos(clock * 0.22) * -3).toFixed(2)}%, ${(Math.sin(clock * 0.18) * 2).toFixed(2)}%, 0)`,
        }}
      />
    </div>
  );
}

/* myk gulvglød — forankrer scenen i et plan (som filmens GroundGlow) */
function FloorGlow({ clock }) {
  const b = 0.78 + 0.22 * Math.sin(clock * 0.5);
  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: '14%', right: '14%', bottom: '3%', height: '16%',
        background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${INK(0.07)}, transparent 72%)`,
        filter: 'blur(10px)', opacity: b.toFixed(3),
      }}
    />
  );
}

/* fint filmkorn */
function GrainLight() {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ backgroundImage: `url("${NOISE}")`, backgroundSize: '170px 170px', opacity: 0.028, mixBlendMode: 'multiply' }}
    />
  );
}

/* lys-sveip ved scenebytte — drevet av reveal (rev) */
function SweepLight({ rev }) {
  const p = seg(rev, 0.0, 0.52);
  if (p <= 0.001 || p >= 0.999) return null;
  const x = -45 + 150 * easeInOutCubic(p);
  const o = Math.sin(p * Math.PI) * 0.1;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute"
        style={{
          top: '-15%', bottom: '-15%', left: `${x.toFixed(1)}%`, width: '40%',
          transform: 'rotate(9deg)', mixBlendMode: 'multiply',
          background: `linear-gradient(100deg, transparent, ${LAV(o * 0.5)} 46%, ${LAVS(o)} 50%, ${LAV(o * 0.5)} 54%, transparent)`,
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, #000 18%, #000 82%, transparent)',
        }}
      />
    </div>
  );
}


/* ===================== HOVEDKOMPONENT ===================== */
export function SeksjonFilm() {
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
  const tiltRef = useRef(null);
  const stepStartRef = useRef(0); // når aktivt steg startet (for reveal — fryses ALDRI)
  const autoElapsedRef = useRef(0); // akkumulert autospill-tid (fryses ved hover)
  const prevRef = useRef(0);
  const pausedRef = useRef(false);

  const [active, setActive] = useState(0);
  const [prog, setProg] = useState({ rev: 0, auto: 0 });
  const [clock, setClock] = useState(0);
  const [reduce, setReduce] = useState(false);
  const [inView, setInView] = useState(false);

  /* --su = 1 % av scenens bredde (kvadratisk scene) */
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty('--su', `${entry.contentRect.width / 100}px`);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* reduced motion + synlighet */
  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* autospill-klokke — ~30fps, kun aktiv i view.
     Reveal (oppbygging) styres av stepStartRef og fryses ALDRI.
     Autospill-fremdriften (auto) akkumuleres kun når ikke pauset (hover). */
  useEffect(() => {
    if (reduce) {
      setProg({ rev: 1, auto: 0 });
      return;
    }
    if (!inView) return;
    let raf;
    let lastSample = 0;
    const now0 = performance.now();
    stepStartRef.current = now0;
    autoElapsedRef.current = 0;
    prevRef.current = now0;
    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const frameDt = now - prevRef.current;
      prevRef.current = now;
      if (!pausedRef.current) autoElapsedRef.current += frameDt;
      if (now - lastSample >= 33) {
        lastSample = now;
        const rev = clamp01((now - stepStartRef.current) / (REVEAL_DUR * 1000));
        const auto = clamp01(autoElapsedRef.current / (STEP_DUR * 1000));
        setClock(now / 1000);
        setProg({ rev, auto });
      }
      if (!pausedRef.current && autoElapsedRef.current >= STEP_DUR * 1000) {
        stepStartRef.current = now;
        autoElapsedRef.current = 0;
        setActive((a) => (a + 1) % STEPS.length);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, inView]);

  const selectStep = (i) => {
    setActive(i);
    const now = performance.now();
    stepStartRef.current = now;
    autoElapsedRef.current = 0;
    prevRef.current = now;
    setProg({ rev: 0, auto: 0 });
  };

  /* interaktiv dybde — lerretet lener seg umerkelig mot pekeren (parallax) */
  useEffect(() => {
    const stage = stageRef.current;
    const inner = tiltRef.current;
    if (!stage || !inner) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const st = { tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, hover: false };
    const step = () => {
      st.cx += (st.tx - st.cx) * 0.06;
      st.cy += (st.ty - st.cy) * 0.06;
      inner.style.transform = `rotateX(${(-st.cy * 2.2).toFixed(3)}deg) rotateY(${(st.cx * 2.8).toFixed(3)}deg)`;
      if (st.hover || Math.abs(st.tx - st.cx) + Math.abs(st.ty - st.cy) > 0.001) {
        st.raf = requestAnimationFrame(step);
      } else {
        st.raf = 0;
      }
    };
    const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(step); };
    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      st.tx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      st.ty = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
      st.hover = true;
      kick();
    };
    const onLeave = () => { st.tx = 0; st.ty = 0; st.hover = false; kick(); };
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerleave', onLeave, { passive: true });
    return () => {
      stage.removeEventListener('pointermove', onMove);
      stage.removeEventListener('pointerleave', onLeave);
      if (st.raf) cancelAnimationFrame(st.raf);
    };
  }, []);

  const hoverOn = () => { pausedRef.current = true; };
  const hoverOff = () => { pausedRef.current = false; };

  /* sakte kamera-drift — gir scenen en levende, filmatisk ro */
  const camDrift = `translateY(${u(Math.sin(clock * 0.4) * 0.5)}) scale(${(1 + 0.012 * Math.sin(clock * 0.32 + 1)).toFixed(4)})`;

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      {/* rolig lavendel-ambient — knytter seksjonen til heroen */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 54% 46% at 88% 4%, rgba(155,91,214,0.045), transparent 72%), radial-gradient(ellipse 50% 44% at 6% 98%, rgba(207,151,252,0.04), transparent 72%)' }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-36">
        <div
          className="grid lg:grid-cols-[minmax(300px,380px)_1fr] gap-14 lg:gap-20 items-center"
          onPointerEnter={hoverOn}
          onPointerLeave={hoverOff}
        >
          {/* venstre: overskrift + stegliste */}
          <div className="lg:py-4">
            <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">De første 30 dagene</p>
            <h2 className="mt-4 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(30px,3.4vw,46px)] text-ink">
              Fra annonse til <span className="dh-ink-shine">leie på konto.</span>
            </h2>
            <p className="mt-5 text-[17px] text-quiet leading-relaxed max-w-md">
              Du sier ja én gang. DigiHome tar resten — annonsering, visninger, leietakere, kontrakt og utbetaling. Helt automatisk, mens du ser på.
            </p>

            <div role="tablist" aria-label="Slik fungerer DigiHome" className="mt-11">
              {STEPS.map((s, i) => {
                const isActive = i === active;
                return (
                  <button
                    key={s.tag}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => selectStep(i)}
                    className="group relative block w-full text-left pl-7 py-[18px] outline-none"
                  >
                    {/* skinne */}
                    <span className="absolute left-0 top-0 bottom-0 w-px" style={{ background: '#EBE6DF' }} />
                    {isActive && (
                      <span
                        className="absolute left-0 top-0 w-px"
                        style={{ height: `${(prog.auto * 100).toFixed(1)}%`, background: 'linear-gradient(180deg,#9B5BD6,#CF97FC)' }}
                      />
                    )}
                    {/* node */}
                    <span
                      className="absolute rounded-full transition-all duration-500"
                      style={{
                        left: -3.5, top: 0, marginTop: '24px',
                        width: isActive ? 8 : 6, height: isActive ? 8 : 6,
                        background: isActive ? '#9B5BD6' : '#D8D1C7',
                        boxShadow: isActive ? '0 0 0 5px rgba(155,91,214,0.12)' : 'none',
                      }}
                    />

                    <div className="flex items-baseline gap-3">
                      <span className="font-body font-semibold tabular-nums text-[12px] tracking-[0.1em] transition-colors duration-500" style={{ color: isActive ? '#9B5BD6' : '#9B9080' }}>
                        0{i + 1}
                      </span>
                      <span className={`font-heading font-bold tracking-[-0.02em] transition-colors duration-500 text-[19px] ${isActive ? 'text-ink' : 'text-ink/40 group-hover:text-ink/65'}`}>
                        {s.title}
                      </span>
                    </div>

                    {/* beskrivelse — utvider kun aktiv */}
                    <div
                      className="overflow-hidden transition-all"
                      style={{
                        maxHeight: isActive ? 140 : 0,
                        opacity: isActive ? 1 : 0,
                        transitionDuration: '600ms',
                        transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                      }}
                    >
                      <p className="mt-2.5 text-[14.5px] leading-relaxed text-quiet">{s.body}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* høyre: åpent kino-lerret (ingen ramme — elementene flyter rett på papiret) */}
          <div className="relative">
            <div
              ref={stageRef}
              className="relative w-full"
              style={{ aspectRatio: '1 / 1', perspective: '1500px', '--su': '7px' }}
            >
              {/* levende atmosfære (ikke tiltet → parallax-dybde mot innholdet) */}
              <AuroraLight clock={clock} />
              <FloorGlow clock={clock} />

              {/* tilt-lag */}
              <div ref={tiltRef} className="absolute inset-0" style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}>
                {/* kamera-drift */}
                <div className="absolute inset-0" style={{ transform: camDrift, transformOrigin: '50% 46%' }}>
                  {STEPS.map((s, i) => {
                    const isActive = i === active;
                    const Scene = s.Scene;
                    return (
                      <div
                        key={s.tag}
                        role="tabpanel"
                        aria-hidden={!isActive}
                        className="absolute inset-0 transition-all"
                        style={{
                          opacity: isActive ? 1 : 0,
                          transform: isActive ? 'scale(1) translateY(0)' : 'scale(0.94) translateY(8px)',
                          transitionDuration: '820ms',
                          transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
                          pointerEvents: 'none',
                        }}
                      >
                        <Scene q={isActive ? prog.rev : 1} clock={isActive ? clock : 0} />
                      </div>
                    );
                  })}
                  <SweepLight rev={prog.rev} />
                </div>
              </div>

              <GrainLight />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
