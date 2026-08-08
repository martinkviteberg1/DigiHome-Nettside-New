'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Check, Loader2, ShieldCheck } from 'lucide-react';

// ---------------------------------------------------------------------------
// LeietakerDemo — selvspillende gjengivelse av kandidatflyten i portalen:
// søknadene tikker inn én etter én → AI-en scorer inntekt, husstand og
// historikk → listen sorterer seg selv → kredittsjekk via Creditsafe
// verifiserer → beste kandidat anbefales. Rammeløst, minimalistisk, looper.
// Basert på kandidatoversikten i det faktiske produktet.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LILLA = '#9B5BD6';

const TRINN: { navn: string; ms: number }[] = [
  { navn: 'start', ms: 1100 },
  { navn: 'sok1', ms: 560 },
  { navn: 'sok2', ms: 560 },
  { navn: 'sok3', ms: 560 },
  { navn: 'sok4', ms: 1000 },
  { navn: 'analyse', ms: 1500 },
  { navn: 'rangert', ms: 1300 },
  { navn: 'kreditt', ms: 1800 },
  { navn: 'anbefalt', ms: 1100 },
  { navn: 'ai', ms: 4600 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

// Kandidatene i endelig (rangert) rekkefølge. `ankomst` er rekkefølgen
// søknadene tikker inn i — listen sorterer seg selv ved «rangert».
const KANDIDATER = [
  { navn: 'Emma Strand', initialer: 'ES', farge: '#9a8fb8', score: 94, detaljer: '72 000 kr · 5,9× · 1 pers', ankomst: 1, kreditt: true },
  { navn: 'Sara Olsen', initialer: 'SO', farge: '#b8a98f', score: 87, detaljer: '65 000 kr · 5,3× · 2 pers', ankomst: 3, kreditt: true },
  { navn: 'Kristian Dahl', initialer: 'KD', farge: '#8f9fb8', score: 76, detaljer: '55 000 kr · 4,5× · 2 pers', ankomst: 0, kreditt: false },
  { navn: 'Mia Larsen', initialer: 'ML', farge: '#b88f9f', score: 68, detaljer: '48 000 kr · 3,9× · 3 pers', ankomst: 2, kreditt: false },
];

const RAD = 78; // slot-høyde per kandidatrad, inkl. luft

const scoreStil = (s: number): React.CSSProperties =>
  s >= 90
    ? { background: '#059669', color: '#fff' }
    : s >= 80
      ? { background: '#e7f6ef', color: '#059669' }
      : s >= 70
        ? { background: '#fdf3e4', color: '#b45309' }
        : { background: '#f0ece5', color: '#8d8578' };

export default function LeietakerDemo() {
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
      { threshold: 0.35 }
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

  const er = (navn: string) => fase >= IDX[navn];
  const antall = [1, 2, 3, 4].filter((i) => er(`sok${i}`)).length;
  const rangert = er('rangert');

  const tittelStil = {
    color: INK,
    fontFamily: 'var(--font-heading), sans-serif',
  } as React.CSSProperties;

  return (
    <div ref={rot} className="relative w-full max-w-[520px] lg:mx-auto" data-testid="tour-leietaker-demo">
      {/* Header — speiler språket i annonse-demoen. */}
      <p className="text-[17px] font-bold tracking-[-0.02em]" style={tittelStil}>
        {er('anbefalt') ? 'Kandidatene er klare' : er('analyse') ? 'AI-en vurderer kandidatene' : 'Søknadene kommer inn'}
      </p>
      <p className="mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
        {antall === 0
          ? 'Storgata 12, Oslo · annonsen er live'
          : er('analyse')
            ? 'Storgata 12, Oslo · 4 kandidater'
            : `Storgata 12, Oslo · ${antall} ${antall === 1 ? 'ny søknad' : 'nye søknader'}`}
      </p>

      {/* Kandidatlisten — radene tikker inn og sorterer seg selv. */}
      <div className="relative mt-5" style={{ height: KANDIDATER.length * RAD - 10 }}>
        {KANDIDATER.map((k, i) => {
          const synlig = er(`sok${k.ankomst + 1}`);
          const slot = rangert ? i : k.ankomst;
          const anbefalt = i === 0 && er('anbefalt');
          return (
            <div
              key={k.navn}
              className="absolute inset-x-0 top-0 transition-all duration-[750ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translateY(${slot * RAD + (synlig ? 0 : 16)}px)`, opacity: synlig ? 1 : 0 }}
            >
              <div
                className={`flex items-center gap-3.5 rounded-[20px] border bg-white px-4 py-3 transition-all duration-500 ${
                  anbefalt
                    ? 'border-[#c8ade5] shadow-[0_28px_70px_-28px_rgba(155,91,214,0.35)] ring-4 ring-[#9B5BD6]/[0.07]'
                    : 'border-[#e5ded3] shadow-[0_18px_50px_-30px_rgba(10,10,10,0.14)]'
                }`}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                  style={{ background: k.farge }}
                >
                  {k.initialer}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[13.5px] font-bold leading-[1.2] tracking-[-0.015em]" style={tittelStil}>
                      {k.navn}
                    </span>
                    {/* Kredittsjekk-hake — toner inn mens Creditsafe kjører. */}
                    {k.kreditt && (
                      <ShieldCheck
                        className={`h-[15px] w-[15px] shrink-0 transition-all delay-500 duration-500 ${
                          er('kreditt') ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                        }`}
                        strokeWidth={2}
                        style={{ color: '#059669' }}
                      />
                    )}
                    {anbefalt && (
                      <span
                        className="shrink-0 rounded-full px-2 py-[3px] text-[10px] font-semibold"
                        style={{ background: 'rgba(155,91,214,0.1)', color: LILLA }}
                      >
                        Anbefalt
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] tabular-nums" style={{ color: MUTED }}>
                    {k.detaljer}
                  </span>
                </span>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] text-[14px] font-bold tabular-nums transition-all duration-500 ${
                    rangert ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                  style={{ ...scoreStil(k.score), fontFamily: 'var(--font-heading), sans-serif' }}
                >
                  {k.score}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Statuslinjen — samme stille puls som i annonse-demoen. */}
      <p className="mt-5 flex items-center justify-center gap-2 text-[12px]" style={{ color: er('anbefalt') ? INK : MUTED }}>
        {er('anbefalt') ? (
          <>
            <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2} style={{ color: LILLA }} />
            <span className="font-medium">Emma Strand anbefales — høyest score, godkjent kredittsjekk</span>
          </>
        ) : er('kreditt') ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} style={{ color: LILLA }} />
            Kjører kredittsjekk via Creditsafe …
          </>
        ) : er('rangert') ? (
          <>
            <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
            Rangert etter match
          </>
        ) : er('analyse') ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} style={{ color: LILLA }} />
            Scorer inntekt, husstand og leiehistorikk …
          </>
        ) : (
          <>
            <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.25} />
            Tar imot søknader …
          </>
        )}
      </p>
    </div>
  );
}
