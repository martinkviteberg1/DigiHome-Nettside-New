'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Check, ShieldCheck, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// OnboardingDemo — super-minimalistisk, selvspillende demo uten ramme.
// Adressefeltet starter vertikalt sentrert; når boligdataene toner inn glir
// feltet rolig opp for å gi plass. Deretter morpher det til et kontaktskjema
// (første kontaktfelt ligger nøyaktig der adressefeltet sto). Starter når
// demoen er synlig, nullstilles utenfor viewport, og looper rolig.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LILLA = '#9B5BD6';

const SKRIVETEKST = 'Storgata 12';
const FULL_ADRESSE = 'Storgata 12, 0155 Oslo';
const TASTETAKT_MS = 92;

const TRINN = [
  { navn: 'start', ms: 900 },
  { navn: 'skriv', ms: SKRIVETEKST.length * TASTETAKT_MS + 420 },
  { navn: 'forslag', ms: 1150 },
  { navn: 'valgt', ms: 900 },
  { navn: 'data', ms: 3300 },
  { navn: 'konto', ms: 850 },
  { navn: 'navn', ms: 620 },
  { navn: 'epost', ms: 620 },
  { navn: 'telefon', ms: 820 },
  { navn: 'bankid', ms: 1250 },
  { navn: 'ferdig', ms: 3800 },
];

const IDX: Record<string, number> = {};
TRINN.forEach((t, i) => {
  IDX[t.navn] = i;
});

const ADRESSEDATA = [
  { k: 'Bruksareal', v: '64 m²' },
  { k: 'Byggeår', v: '1962' },
  { k: 'Eierform', v: 'Selveier' },
  { k: 'Etasje', v: '3 av 4' },
];

const FORSLAG = ['Storgata 12, 0155 Oslo', 'Storgata 12B, 0155 Oslo', 'Storgata 121, 0277 Oslo'];

const KONTAKTFELT = [
  { navn: 'navn', etikett: 'Navn', verdi: 'Anna Berg' },
  { navn: 'epost', etikett: 'E-post', verdi: 'anna.berg@gmail.com' },
  { navn: 'telefon', etikett: 'Telefon', verdi: '982 40 315' },
];

export default function OnboardingDemo({ onKonto }: { onKonto?: (iKonto: boolean) => void }) {
  const rot = useRef<HTMLDivElement | null>(null);
  const [kjorer, setKjorer] = useState(false);
  const [fase, setFase] = useState(0);
  const [tegn, setTegn] = useState(0);

  // Start når demoen er synlig — nullstill når den forlater viewporten.
  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setKjorer(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setKjorer(entry.isIntersecting);
        if (!entry.isIntersecting) {
          setFase(0);
          setTegn(0);
        }
      },
      { threshold: 0.35 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Tidslinjen — ett timeout per trinn, looper tilbake til start.
  useEffect(() => {
    if (!kjorer) return;
    const t = window.setTimeout(() => {
      const neste = (fase + 1) % TRINN.length;
      if (neste === 0) setTegn(0);
      setFase(neste);
    }, TRINN[fase].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, fase]);

  // Skrivemaskinen — kjører kun i skriv-trinnet.
  useEffect(() => {
    if (!kjorer || TRINN[fase].navn !== 'skriv') return;
    const iv = window.setInterval(() => {
      setTegn((n) => (n < SKRIVETEKST.length ? n + 1 : n));
    }, TASTETAKT_MS);
    return () => window.clearInterval(iv);
  }, [kjorer, fase]);

  const er = (navn: string) => fase >= IDX[navn];
  const iKonto = er('konto');
  const skriver = !er('valgt');

  useEffect(() => {
    onKonto?.(iKonto);
  }, [iKonto, onKonto]);

  const fade = 'transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]';
  const tittelStil = {
    color: INK,
    fontFamily: 'var(--font-heading), sans-serif',
  } as React.CSSProperties;

  return (
    <div ref={rot} className="relative mx-auto w-full max-w-[520px]" data-testid="tour-onboarding-demo">
      {/* Fast høyde så sliden står i ro. Feltet starter vertikalt sentrert og
          glir opp når dataene kommer inn. */}
      <div className="relative h-[420px]">
        {/* --- Fase A: Adressen ------------------------------------------- */}
        <div
          className={`absolute inset-x-0 top-0 ${fade} ${
            iKonto ? 'pointer-events-none scale-[0.985] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <div
            className="transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ transform: `translateY(${er('data') ? 0 : 130}px)` }}
          >
            <p className="mb-6 text-[17px] font-bold tracking-[-0.02em]" style={tittelStil}>
              Hvor ligger boligen?
            </p>

            {/* Adressefeltet — nydelig avrundet, myk skygge, fokus-ring mens det skrives. */}
            <div className="relative">
              <div
                className={`flex h-[58px] items-center gap-3.5 rounded-full border bg-white px-6 shadow-[0_24px_60px_-24px_rgba(10,10,10,0.18)] transition-all duration-500 ${
                  skriver ? 'border-[#c8ade5] ring-4 ring-[#9B5BD6]/[0.07]' : 'border-[#e5ded3] ring-0'
                }`}
              >
                <MapPin className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} style={{ color: skriver ? LILLA : MUTED }} />
                <span className="flex-1 truncate text-[15px] font-medium" style={{ color: INK }}>
                  {er('valgt') ? FULL_ADRESSE : SKRIVETEKST.slice(0, tegn)}
                  {skriver && (
                    <span className="ml-[2px] inline-block h-[16px] w-[1.5px] translate-y-[2.5px] animate-pulse bg-[#1a1612]" />
                  )}
                </span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                    er('valgt') ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                  }`}
                  style={{ background: 'rgba(155,91,214,0.12)' }}
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LILLA }} />
                </span>
              </div>

              {/* Forslagene — glir opp under feltet. */}
              <div
                className={`absolute inset-x-2 top-[calc(100%+10px)] z-10 overflow-hidden rounded-[24px] border border-[#eee9e2] bg-white py-1.5 shadow-[0_28px_70px_-24px_rgba(10,10,10,0.22)] transition-all duration-300 ${
                  TRINN[fase].navn === 'forslag' ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-1.5 opacity-0'
                }`}
              >
                {FORSLAG.map((f, i) => (
                  <div
                    key={f}
                    className={`mx-1.5 flex items-center gap-3 rounded-full py-[9px] pl-4 pr-4 text-[13.5px] ${
                      i === 0 ? 'bg-[#f6f1ea] font-medium' : ''
                    }`}
                    style={{ color: i === 0 ? INK : MUTED }}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} style={{ color: i === 0 ? LILLA : '#c9c2b6' }} />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            {/* Boligdata — rene rader, ingen boks. */}
            <div
              className={`mt-8 px-6 transition-all duration-500 ${
                er('data') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
              }`}
            >
              <div className="divide-y divide-[#ede8e0]">
                {ADRESSEDATA.map((d, i) => (
                  <div
                    key={d.k}
                    className={`flex items-center justify-between py-[11px] transition-opacity duration-500 ${
                      er('data') ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ transitionDelay: er('data') ? `${i * 130}ms` : '0ms' }}
                  >
                    <span className="text-[13.5px]" style={{ color: MUTED }}>{d.k}</span>
                    <span className="text-[13.5px] font-semibold tabular-nums" style={{ color: INK }}>{d.v}</span>
                  </div>
                ))}
              </div>
              <p
                className={`mt-4 flex items-center gap-1.5 text-[12px] transition-opacity duration-500 ${
                  er('data') ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ color: MUTED, transitionDelay: er('data') ? '620ms' : '0ms' }}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
                Hentet fra Kartverket og Matrikkelen
              </p>
            </div>
          </div>
        </div>

        {/* --- Fase B: Kontaktskjemaet ------------------------------------ */}
        {/* Første felt ligger nøyaktig der adressefeltet sto — morph. */}
        <div
          className={`absolute inset-x-0 top-0 ${fade} ${
            iKonto ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.985] opacity-0'
          }`}
        >
          <p className="mb-6 text-[17px] font-bold tracking-[-0.02em]" style={tittelStil}>
            Opprett kontoen din
          </p>

          <div className="space-y-3">
            {KONTAKTFELT.map((felt) => (
              <div
                key={felt.navn}
                className="flex h-[58px] items-center gap-3.5 rounded-full border border-[#e5ded3] bg-white px-6 shadow-[0_24px_60px_-30px_rgba(10,10,10,0.14)]"
              >
                <span className="w-[64px] shrink-0 text-[12.5px] font-semibold" style={{ color: MUTED }}>
                  {felt.etikett}
                </span>
                <span
                  className={`truncate text-[15px] font-medium transition-all duration-500 ${
                    er(felt.navn) ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                  }`}
                  style={{ color: INK }}
                >
                  {felt.verdi}
                </span>
              </div>
            ))}
          </div>

          <p
            className={`mt-6 flex items-center justify-center gap-2 text-[13px] transition-all duration-500 ${
              er('bankid') ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
            }`}
            style={{ color: INK }}
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} style={{ color: LILLA }} />
            Identitet bekreftet med BankID
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LILLA }} />
          </p>

          <div
            className={`pointer-events-none mt-6 flex h-[58px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all duration-500 ${
              er('ferdig')
                ? 'bg-[#1a1a1a] text-white shadow-[0_24px_60px_-24px_rgba(10,10,10,0.45)]'
                : 'bg-[#f0ece5] text-[#b3aca2]'
            }`}
          >
            Fullfør registrering <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
