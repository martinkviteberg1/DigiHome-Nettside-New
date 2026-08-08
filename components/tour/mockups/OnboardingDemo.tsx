'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Check, ShieldCheck, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// OnboardingDemo — selvspillende produktmockup som viser hele onboardingen i
// én sekvens: adressen skrives inn tegn for tegn, forslag dukker opp, boligdata
// hentes fra Kartverket — så glir skjermen over til kontoopprettelse der
// feltene fylles ut og identiteten bekreftes med BankID. Sekvensen starter
// når mockupen er synlig, nullstilles når den forlater viewporten, og går i
// rolig loop. Bygget i ren React — skarpt på alle skjermer.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LILLA = '#9B5BD6';

const SKRIVETEKST = 'Storgata 12';
const FULL_ADRESSE = 'Storgata 12, 0155 Oslo';
const TASTETAKT_MS = 92;

// Tidslinjen — navngitte trinn med varighet. Sekvensen looper.
const TRINN = [
  { navn: 'start', ms: 900 },
  { navn: 'skriv', ms: SKRIVETEKST.length * TASTETAKT_MS + 420 },
  { navn: 'forslag', ms: 1150 },
  { navn: 'valgt', ms: 900 },
  { navn: 'data', ms: 3300 },
  { navn: 'konto', ms: 900 },
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

// Nettleser-ramme — samme uttrykk som appens egen walkthrough.
function Ramme({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#e8e4df] bg-white shadow-[0_32px_80px_-28px_rgba(10,10,10,0.22)]">
      <div className="flex h-9 items-center gap-2 border-b border-[#eee9e2] bg-[#f7f4ef] px-3.5">
        <div className="flex gap-1.5">
          <span className="h-[10px] w-[10px] rounded-full bg-[#e3ddd4]" />
          <span className="h-[10px] w-[10px] rounded-full bg-[#e3ddd4]" />
          <span className="h-[10px] w-[10px] rounded-full bg-[#e3ddd4]" />
        </div>
        <div className="flex flex-1 justify-center">
          <span className="flex h-[22px] items-center rounded-md border border-[#e8e4df] bg-white px-4 text-[9.5px] text-[#7c7466]">
            app.digihome.no/onboarding
          </span>
        </div>
        <span className="w-[46px]" />
      </div>
      <div className="h-[440px] bg-white p-5 sm:h-[460px] sm:p-6">{children}</div>
    </div>
  );
}

export default function OnboardingDemo({ onKonto }: { onKonto?: (iKonto: boolean) => void }) {
  const rot = useRef<HTMLDivElement | null>(null);
  const [kjorer, setKjorer] = useState(false);
  const [fase, setFase] = useState(0);
  const [tegn, setTegn] = useState(0);

  // Start når mockupen er synlig — nullstill når den forlater viewporten.
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

  // Meld fra til forelderen (for synkronisert steg-markering i teksten).
  useEffect(() => {
    onKonto?.(iKonto);
  }, [iKonto, onKonto]);

  return (
    <div ref={rot} data-testid="tour-onboarding-demo">
      <Ramme>
        <div className="flex h-full flex-col">
          {/* Topp — logo, stegteller og fremdrift. */}
          <div>
            <div className="flex items-center justify-between">
              <img src="/digihome-wordmark-ink.svg" alt="" className="h-[15px] w-auto opacity-80" />
              <span className="text-[11.5px] font-medium" style={{ color: MUTED }}>
                Steg {iKonto ? 2 : 1} av 2
              </span>
            </div>
            <div className="mt-3.5 h-1 overflow-hidden rounded-full bg-[#f0ece5]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: iKonto ? '100%' : '50%', background: LILLA }}
              />
            </div>
          </div>

          {/* Skjermene — adresse og konto, kryssglidende. */}
          <div className="relative mt-1 flex-1">
            {/* --- Skjerm 1: Adressen ------------------------------------ */}
            <div
              className={`absolute inset-0 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                iKonto ? 'pointer-events-none -translate-x-5 opacity-0' : 'translate-x-0 opacity-100'
              }`}
            >
              <h4
                className="mt-5 text-[20px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[21px]"
                style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
              >
                Hvor ligger boligen?
              </h4>
              <p className="mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
                Boligdata hentes automatisk fra offentlige registre.
              </p>

              <div className="relative mt-4">
                <div className="flex h-12 items-center gap-3 rounded-xl border border-[#d9d2c7] bg-[#fdfcfa] px-4">
                  <MapPin className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: MUTED }} />
                  <span className="flex-1 truncate text-[14px] font-medium" style={{ color: INK }}>
                    {er('valgt') ? FULL_ADRESSE : SKRIVETEKST.slice(0, tegn)}
                    {!er('valgt') && (
                      <span className="ml-[2px] inline-block h-[15px] w-[1.5px] translate-y-[2px] animate-pulse bg-[#1a1612]" />
                    )}
                  </span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${
                      er('valgt') ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
                    }`}
                    style={{ background: 'rgba(155,91,214,0.12)' }}
                  >
                    <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
                  </span>
                </div>

                {/* Forslagslisten — synlig kun i forslag-trinnet. */}
                <div
                  className={`absolute inset-x-0 top-[calc(100%+6px)] z-10 overflow-hidden rounded-xl border border-[#eee9e2] bg-white shadow-[0_18px_44px_-16px_rgba(10,10,10,0.18)] transition-all duration-300 ${
                    TRINN[fase].navn === 'forslag'
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none -translate-y-1 opacity-0'
                  }`}
                >
                  {FORSLAG.map((f, i) => (
                    <div
                      key={f}
                      className={`flex items-center gap-2.5 px-4 py-[9px] text-[13px] ${
                        i === 0 ? 'bg-[#faf7f2] font-medium' : ''
                      }`}
                      style={{ color: i === 0 ? INK : MUTED }}
                    >
                      <MapPin className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} style={{ color: i === 0 ? LILLA : '#c9c2b6' }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hentede boligdata — rad for rad. */}
              <div
                className={`mt-4 divide-y divide-[#f0ece5] rounded-xl border border-[#eee9e2] transition-all duration-500 ${
                  er('data') ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                }`}
              >
                {ADRESSEDATA.map((d, i) => (
                  <div
                    key={d.k}
                    className={`flex items-center justify-between px-4 py-[9.5px] transition-opacity duration-500 ${
                      er('data') ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{ transitionDelay: er('data') ? `${i * 130}ms` : '0ms' }}
                  >
                    <span className="text-[12.5px]" style={{ color: MUTED }}>{d.k}</span>
                    <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: INK }}>{d.v}</span>
                  </div>
                ))}
              </div>

              <p
                className={`mt-auto flex items-center gap-1.5 text-[11.5px] transition-opacity duration-500 ${
                  er('data') ? 'opacity-100' : 'opacity-0'
                }`}
                style={{ color: MUTED, transitionDelay: er('data') ? '620ms' : '0ms' }}
              >
                <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
                Hentet fra Kartverket og Matrikkelen
              </p>
            </div>

            {/* --- Skjerm 2: Kontoen -------------------------------------- */}
            <div
              className={`absolute inset-0 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                iKonto ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-5 opacity-0'
              }`}
            >
              <h4
                className="mt-5 text-[20px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[21px]"
                style={{ color: INK, fontFamily: 'var(--font-heading), sans-serif' }}
              >
                Opprett kontoen din
              </h4>
              <p className="mt-1.5 text-[12.5px]" style={{ color: MUTED }}>
                Så du kan følge utleien fra ett sted.
              </p>

              <div className="mt-4 space-y-2.5">
                {[
                  { navn: 'navn', etikett: 'Navn', verdi: 'Anna Berg' },
                  { navn: 'epost', etikett: 'E-post', verdi: 'anna.berg@gmail.com' },
                  { navn: 'telefon', etikett: 'Telefon', verdi: '982 40 315' },
                ].map((felt) => (
                  <div
                    key={felt.navn}
                    className="flex h-11 items-center gap-3 rounded-xl border border-[#e0d9cf] bg-[#fdfcfa] px-3.5"
                  >
                    <span className="w-[58px] shrink-0 text-[11.5px] font-semibold" style={{ color: '#5a5145' }}>
                      {felt.etikett}
                    </span>
                    <span
                      className={`truncate text-[13px] font-medium transition-all duration-400 ${
                        er(felt.navn) ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'
                      }`}
                      style={{ color: INK }}
                    >
                      {felt.verdi}
                    </span>
                  </div>
                ))}
              </div>

              <div
                className={`mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#eee9e2] px-3.5 py-[10px] transition-all duration-500 ${
                  er('bankid') ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
                }`}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.75} style={{ color: LILLA }} />
                <span className="text-[12.5px]" style={{ color: INK }}>Identitet bekreftet med BankID</span>
                <Check className="ml-auto h-3.5 w-3.5" strokeWidth={2.5} style={{ color: LILLA }} />
              </div>

              <div
                className={`pointer-events-none mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-all duration-500 ${
                  er('ferdig') ? 'bg-[#1a1a1a] text-white' : 'bg-[#f0ece5] text-[#b3aca2]'
                }`}
              >
                Fullfør registrering <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </div>
            </div>
          </div>
        </div>
      </Ramme>
    </div>
  );
}
