'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Megaphone, FileSignature, ClipboardCheck, ArrowRight, Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// VeivalgDemo — selvspillende gjengivelse av StartHub-øyeblikket i portalen:
// «Hva vil du gjøre nå, Anna?» med de tre likestilte veiene inn. Fokus glir
// rolig fra kort til kort som en vurdering — før «Lag annonse» trykkes og
// velges. Samme rammeløse, minimale språk som onboarding-demoen.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LILLA = '#9B5BD6';

const TRINN = [
  { navn: 'start', ms: 1000 },
  { navn: 'fokus1', ms: 1300 },
  { navn: 'fokus2', ms: 1300 },
  { navn: 'fokus3', ms: 1300 },
  { navn: 'tilbake', ms: 950 },
  { navn: 'velg', ms: 420 },
  { navn: 'valgt', ms: 3800 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

// Hvilket kort som har fokus i hvert trinn (-1 = ingen).
const FOKUS: number[] = [-1, 0, 1, 2, 0, 0, 0];

const VALG = [
  {
    ikon: Megaphone,
    tittel: 'Lag annonse',
    tekst: 'Finn leietaker med en profesjonell annonse på FINN og DigiHome.',
  },
  {
    ikon: FileSignature,
    tittel: 'Lag leiekontrakt',
    tekst: 'Du har leietaker — lag og signer med BankID.',
  },
  {
    ikon: ClipboardCheck,
    tittel: 'Registrer eksisterende leieforhold',
    tekst: 'Leietakeren bor der allerede — legg inn detaljene.',
  },
];

export default function VeivalgDemo() {
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

  const fokus = FOKUS[fase];
  const valgt = fase >= IDX.valgt;
  const trykker = TRINN[fase].navn === 'velg';

  return (
    <div ref={rot} className="relative mx-auto w-full max-w-[520px]" data-testid="tour-veivalg-demo">
      <p
        className="mb-6 text-[17px] font-bold tracking-[-0.02em]"
        style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
      >
        Hva vil du gjøre nå, Anna?
      </p>

      <div className="space-y-3">
        {VALG.map((v, i) => {
          const Ikon = v.ikon;
          const harFokus = fokus === i;
          const erValgt = valgt && i === 0;
          const dempet = valgt && i !== 0;
          return (
            <div
              key={v.tittel}
              className={`flex items-center gap-4 rounded-[22px] border bg-white p-5 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                erValgt
                  ? 'border-[#c8ade5] shadow-[0_28px_70px_-28px_rgba(155,91,214,0.35)] ring-4 ring-[#9B5BD6]/[0.07]'
                  : harFokus
                    ? '-translate-y-[3px] border-[#c8ade5] shadow-[0_28px_70px_-28px_rgba(10,10,10,0.28)] ring-4 ring-[#9B5BD6]/[0.07]'
                    : 'border-[#e5ded3] shadow-[0_18px_50px_-30px_rgba(10,10,10,0.16)]'
              } ${trykker && i === 0 ? 'scale-[0.97]' : 'scale-100'} ${dempet ? 'opacity-45' : 'opacity-100'}`}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition-colors duration-500"
                style={{ background: harFokus || erValgt ? 'rgba(155,91,214,0.1)' : '#f5f1e9' }}
              >
                <Ikon
                  className="h-[19px] w-[19px] transition-colors duration-500"
                  strokeWidth={1.7}
                  style={{ color: harFokus || erValgt ? LILLA : INK }}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[15px] font-bold leading-[1.15] tracking-[-0.018em]"
                  style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
                >
                  {v.tittel}
                </span>
                <span className="mt-1 block text-[12.5px] leading-[1.5]" style={{ color: MUTED }}>
                  {v.tekst}
                </span>
              </span>
              <span className="relative flex h-6 w-6 shrink-0 items-center justify-center">
                <ArrowRight
                  className={`absolute h-4 w-4 transition-all duration-300 ${
                    erValgt ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
                  }`}
                  strokeWidth={2}
                  style={{ color: harFokus ? LILLA : '#cfc6b6' }}
                />
                <span
                  className={`absolute flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${
                    erValgt ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                  style={{ background: 'rgba(155,91,214,0.12)' }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LILLA }} />
                </span>
              </span>
            </div>
          );
        })}
      </div>

      {/* Hviskelinjen — resten av valgene i portalen. */}
      <p className="mt-6 text-center text-[12px]" style={{ color: '#b3aca2' }}>
        + depositum, forvalter og mer
      </p>
    </div>
  );
}
