'use client';

import React, { useEffect, useRef, useState } from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';

// ---------------------------------------------------------------------------
// KapittelIntegrasjoner — det rolige oversiktsøyeblikket: DigiHome i midten,
// integrasjonene i ring rundt. Hver integrasjon lyser opp i reisens
// rekkefølge (Kartverket → FINN → Creditsafe → BankID → Keyhole → Vipps →
// Regnskap → Airbnb → Booking) med én forklarende linje — før alt glir
// sammen: ett system, alt koblet.
// ---------------------------------------------------------------------------

const LILLA = '#9B5BD6';

const CHIPS: {
  navn: string;
  vinkel: number;
  tekst: string;
  logoer: { src: string; h: number }[];
}[] = [
  { navn: 'Kartverket', vinkel: -90, tekst: 'Boligdata hentes fra Kartverket', logoer: [{ src: '/kartverket-logo.png', h: 18 }] },
  { navn: 'FINN.no', vinkel: -50, tekst: 'Annonsen publiseres rett på FINN', logoer: [{ src: '/finn-logo-full.png', h: 15 }] },
  { navn: 'Creditsafe', vinkel: -10, tekst: 'Kredittsjekk av kandidatene', logoer: [{ src: '/creditsafe-logo.png', h: 13 }] },
  { navn: 'BankID', vinkel: 30, tekst: 'Signering og identitet med BankID', logoer: [{ src: '/bankid-logo.png', h: 13 }] },
  { navn: 'Keyhole', vinkel: 70, tekst: 'Depositum opprettes og sikres med Keyhole', logoer: [{ src: '/keyhole-logo.png', h: 14 }] },
  { navn: 'Vipps', vinkel: 110, tekst: 'Betaling med Vipps', logoer: [{ src: '/vipps-logo.png', h: 16 }] },
  {
    navn: 'Regnskap',
    vinkel: 150,
    tekst: 'Oppgjøret rett i regnskapet — Fiken, PowerOffice eller Tripletex',
    logoer: [
      { src: '/fiken-logo.png', h: 13 },
      { src: '/poweroffice-logo.png', h: 12 },
      { src: '/tripletex-logo.png', h: 11 },
    ],
  },
  { navn: 'Airbnb', vinkel: -170, tekst: 'Korttid synkroniseres med Airbnb', logoer: [{ src: '/airbnb-logo.png', h: 17 }] },
  { navn: 'Booking.com', vinkel: -130, tekst: '— og med Booking.com', logoer: [{ src: '/booking-logo.png', h: 13 }] },
];

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 1000 },
  ...CHIPS.map((_, i) => ({ navn: `i${i}`, ms: 1500 })),
  { navn: 'alle', ms: 5500 },
];

// Posisjon på ellipsen (prosent av hub-flaten).
const pos = (vinkel: number) => {
  const r = (vinkel * Math.PI) / 180;
  return { x: 50 + 43 * Math.cos(r), y: 50 + 41 * Math.sin(r) };
};

export default function KapittelIntegrasjoner() {
  const rot = useRef<HTMLDivElement | null>(null);
  const [kjorer, setKjorer] = useState(false);
  const [fase, setFase] = useState(0);

  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setKjorer(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setKjorer(entry.isIntersecting);
        if (!entry.isIntersecting) setFase(0);
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!kjorer) return;
    const t = window.setTimeout(() => {
      setFase((f) => (f + 1) % TRINN.length);
    }, TRINN[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase]);

  const aktiv = fase >= 1 && fase <= CHIPS.length ? fase - 1 : -1;
  const alle = TRINN[fase].navn === 'alle';

  return (
    <section
      data-testid="tour-kap-integrasjoner"
      data-slide="Integrasjonene"
      className="relative flex min-h-[100dvh] snap-start items-center justify-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto w-full max-w-[760px] text-center">
        <Avslor>
          <p className="e-label">Integrasjonene</p>
        </Avslor>
        <Avslor delay={90}>
          <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
            Alt henger sammen<span className="text-[#9B5BD6]">.</span>
          </h2>
        </Avslor>

        <Avslor delay={200}>
          {/* Huben — DigiHome i midten, integrasjonene i ring. */}
          <Parallax faktor={0.1}>
          <div ref={rot} className="relative mx-auto mt-6 aspect-square w-full max-w-[320px] sm:mt-8 sm:max-w-[430px]" data-testid="tour-integrasjon-hub">
            {/* Forbindelseslinjene */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100">
              {CHIPS.map((c, i) => {
                const p = pos(c.vinkel);
                const lyser = i === aktiv || alle;
                return (
                  <line
                    key={c.navn}
                    x1="50"
                    y1="50"
                    x2={p.x}
                    y2={p.y}
                    stroke={lyser ? LILLA : '#e8e2d8'}
                    strokeOpacity={lyser ? (alle ? 0.35 : 0.6) : 1}
                    strokeWidth="1"
                    vectorEffect="non-scaling-stroke"
                    style={{ transition: 'stroke 500ms, stroke-opacity 500ms' }}
                  />
                );
              })}
            </svg>

            {/* DigiHome-kjernen */}
            <div
              className="absolute left-1/2 top-1/2 flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[20px] bg-white transition-shadow duration-700 sm:h-[72px] sm:w-[72px]"
              style={{
                boxShadow:
                  aktiv >= 0 || alle
                    ? '0 24px 60px -20px rgba(155,91,214,0.4), 0 0 0 1px rgba(0,0,0,0.04)'
                    : '0 18px 50px -22px rgba(10,10,10,0.25), 0 0 0 1px rgba(0,0,0,0.04)',
              }}
            >
              <img src="/digihome-mark.svg" alt="DigiHome" className="h-9 w-9 rounded-[9px] sm:h-10 sm:w-10" />
            </div>

            {/* Integrasjonene */}
            {CHIPS.map((c, i) => {
              const p = pos(c.vinkel);
              const lyser = i === aktiv || alle;
              return (
                <div
                  key={c.navn}
                  className="absolute flex items-center justify-center rounded-2xl bg-white px-3 py-2 transition-all duration-500 sm:px-3.5 sm:py-2.5"
                  style={{
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    transform: `translate(-50%, -50%) scale(${i === aktiv ? 1.12 : 1})`,
                    opacity: lyser ? 1 : 0.55,
                    filter: lyser ? 'grayscale(0)' : 'grayscale(1)',
                    boxShadow:
                      i === aktiv
                        ? '0 20px 45px -16px rgba(155,91,214,0.35), 0 0 0 1.5px rgba(155,91,214,0.25)'
                        : '0 10px 30px -14px rgba(10,10,10,0.14), 0 0 0 1px rgba(0,0,0,0.04)',
                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  <span className="flex items-center gap-2">
                    {c.logoer.map((l) => (
                      <img key={l.src} src={l.src} alt={c.navn} style={{ height: l.h }} className="w-auto max-w-[70px] object-contain" />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          </Parallax>

          {/* Fortellerlinjen — én integrasjon om gangen. */}
          <div className="mx-auto mt-7 grid h-6 max-w-[420px]">
            {CHIPS.map((c, i) => (
              <p
                key={c.navn}
                className={`[grid-area:1/1] text-[13px] font-medium text-[#1a1612] transition-opacity duration-500 ${
                  i === aktiv ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {c.tekst}
              </p>
            ))}
            <p
              className={`[grid-area:1/1] text-[13px] font-medium text-[#1a1612] transition-opacity duration-500 ${
                alle ? 'opacity-100' : 'opacity-0'
              }`}
            >
              Ett system<span style={{ color: LILLA }}>.</span> Alt koblet sammen<span style={{ color: LILLA }}>.</span>
            </p>
          </div>
        </Avslor>
      </div>
    </section>
  );
}
