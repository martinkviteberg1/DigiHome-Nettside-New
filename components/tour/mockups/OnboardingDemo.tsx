'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Check, ShieldCheck, ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// OnboardingDemo — super-minimalistisk, selvspillende demo uten ramme.
// Sekvens: adressefeltet (vertikalt sentrert) fylles ut tegn for tegn →
// boligdata toner inn og feltet glir opp → morpher til kontaktskjema der
// hvert felt skrives med ekte typewriter og fokus-ring → BankID bekreftes →
// knappen trykkes → suksess-skjerm med animert hake → og til slutt et nydelig
// enhetskort av eiendommen, som et annonsekort med bilde. Looper rolig.
// ---------------------------------------------------------------------------

const INK = '#1a1612';
const MUTED = '#7c7466';
const LILLA = '#9B5BD6';

const FULL_ADRESSE = 'Storgata 12, 0155 Oslo';

// Trinn med `tekst` kjører typewriter i sitt eget tempo (`takt` ms per tegn).
const TRINN: { navn: string; ms: number; tekst?: string; takt?: number }[] = [
  { navn: 'start', ms: 900 },
  { navn: 'skriv', ms: 1480, tekst: 'Storgata 12', takt: 92 },
  { navn: 'forslag', ms: 1150 },
  { navn: 'valgt', ms: 900 },
  { navn: 'data', ms: 3300 },
  { navn: 'konto', ms: 850 },
  { navn: 'navn', ms: 1180, tekst: 'Anna Berg', takt: 82 },
  { navn: 'epost', ms: 1440, tekst: 'anna.berg@gmail.com', takt: 52 },
  { navn: 'telefon', ms: 1230, tekst: '982 40 315', takt: 78 },
  { navn: 'bankid', ms: 1250 },
  { navn: 'ferdig', ms: 1400 },
  { navn: 'trykk', ms: 420 },
  { navn: 'suksess', ms: 2500 },
  { navn: 'kort', ms: 5200 },
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
  { navn: 'navn', etikett: 'Navn' },
  { navn: 'epost', etikett: 'E-post' },
  { navn: 'telefon', etikett: 'Telefon' },
];

function Markoer() {
  return <span className="ml-[2px] inline-block h-[15px] w-[1.5px] translate-y-[2.5px] animate-pulse bg-[#1a1612]" />;
}

export default function OnboardingDemo() {
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

  // Typewriter — kjører i alle trinn som har tekst, i sitt eget tempo.
  useEffect(() => {
    if (!kjorer) return;
    const trinn = TRINN[fase];
    if (!trinn.tekst) return;
    setTegn(0);
    const iv = window.setInterval(() => {
      setTegn((n) => Math.min(n + 1, trinn.tekst!.length));
    }, trinn.takt || 80);
    return () => window.clearInterval(iv);
  }, [kjorer, fase]);

  const er = (navn: string) => fase >= IDX[navn];
  const iKonto = er('konto') && !er('suksess');
  const iSuksess = er('suksess') && !er('kort');
  const iKort = er('kort');
  const skriver = !er('valgt');

  // Hva som vises i et kontaktfelt: ferdig skrevet, under skriving, eller tomt.
  const feltVerdi = (navn: string) => {
    const i = IDX[navn];
    const full = TRINN[i].tekst || '';
    if (fase > i) return full;
    if (fase === i) return full.slice(0, tegn);
    return '';
  };
  const feltAktivt = (navn: string) => fase === IDX[navn];

  const fade = 'transition-all duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)]';
  const tittelStil = {
    color: INK,
    fontFamily: 'var(--font-heading), sans-serif',
  } as React.CSSProperties;

  return (
    <div ref={rot} className="relative w-full max-w-[520px] lg:mx-auto" data-testid="tour-onboarding-demo">
      {/* Fast høyde så sliden står i ro gjennom hele sekvensen. */}
      <div className="relative h-[420px]">
        {/* --- Fase A: Adressen ------------------------------------------- */}
        <div
          className={`absolute inset-x-0 top-0 ${fade} ${
            iKonto || iSuksess || iKort ? 'pointer-events-none scale-[0.985] opacity-0' : 'scale-100 opacity-100'
          }`}
        >
          <div
            className={`transition-transform duration-[800ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
              er('data') ? 'translate-y-0' : 'lg:translate-y-[130px]'
            }`}
          >
            <p className="mb-6 text-[17px] font-bold tracking-[-0.02em]" style={tittelStil}>
              Hvor ligger boligen?
            </p>

            <div className="relative">
              <div
                className={`flex h-[58px] items-center gap-3.5 rounded-full border bg-white px-6 shadow-[0_24px_60px_-24px_rgba(10,10,10,0.18)] transition-all duration-500 ${
                  skriver ? 'border-[#c8ade5] ring-4 ring-[#9B5BD6]/[0.07]' : 'border-[#e5ded3] ring-0'
                }`}
              >
                <MapPin className="h-[17px] w-[17px] shrink-0" strokeWidth={1.75} style={{ color: skriver ? LILLA : MUTED }} />
                <span className="flex-1 truncate text-[15px] font-medium" style={{ color: INK }}>
                  {er('valgt') ? FULL_ADRESSE : fase === IDX.skriv ? (TRINN[IDX.skriv].tekst || '').slice(0, tegn) : ''}
                  {skriver && <Markoer />}
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
                className={`flex h-[58px] items-center gap-3.5 rounded-full border bg-white px-6 shadow-[0_24px_60px_-30px_rgba(10,10,10,0.14)] transition-all duration-400 ${
                  feltAktivt(felt.navn) ? 'border-[#c8ade5] ring-4 ring-[#9B5BD6]/[0.07]' : 'border-[#e5ded3] ring-0'
                }`}
              >
                <span className="w-[64px] shrink-0 text-[12.5px] font-semibold" style={{ color: MUTED }}>
                  {felt.etikett}
                </span>
                <span className="flex-1 truncate text-[15px] font-medium" style={{ color: INK }}>
                  {feltVerdi(felt.navn)}
                  {feltAktivt(felt.navn) && <Markoer />}
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

          {/* Knappen — våkner, og «trykkes» før suksess. */}
          <div
            className={`pointer-events-none mt-6 flex h-[58px] w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-all duration-300 ${
              er('ferdig')
                ? 'bg-[#1a1a1a] text-white shadow-[0_24px_60px_-24px_rgba(10,10,10,0.45)]'
                : 'bg-[#f0ece5] text-[#b3aca2]'
            } ${TRINN[fase].navn === 'trykk' ? 'scale-[0.96]' : 'scale-100'}`}
          >
            Fullfør registrering <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </div>
        </div>

        {/* --- Fase C: Suksess --------------------------------------------- */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center text-center ${fade} ${
            iSuksess ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.97] opacity-0'
          }`}
        >
          <span
            className={`flex h-[68px] w-[68px] items-center justify-center rounded-full transition-all delay-150 duration-[600ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
              iSuksess ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
            style={{ background: 'rgba(155,91,214,0.12)' }}
          >
            <Check className="h-8 w-8" strokeWidth={2.25} style={{ color: LILLA }} />
          </span>
          <p className="mt-6 text-[22px] font-bold tracking-[-0.025em]" style={tittelStil}>
            Kontoen er opprettet
          </p>
          <p className="mt-2 text-[14px]" style={{ color: MUTED }}>
            Boligen er registrert — klar for utleie.
          </p>
        </div>

        {/* --- Fase D: Enhetskortet ---------------------------------------- */}
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center ${fade} ${
            iKort ? 'scale-100 opacity-100' : 'pointer-events-none translate-y-3 scale-[0.97] opacity-0'
          }`}
        >
          <div className="w-full max-w-[380px] overflow-hidden rounded-[26px] border border-[#eee9e2] bg-white shadow-[0_44px_100px_-32px_rgba(10,10,10,0.3)]">
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src="/nyest-hero-portrett.webp"
                alt=""
                className={`h-full w-full object-cover transition-transform duration-[5200ms] ease-linear ${
                  iKort ? 'scale-[1.06]' : 'scale-100'
                }`}
              />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-[5px] text-[11px] font-semibold backdrop-blur-sm" style={{ color: INK }}>
                <span className="h-[6px] w-[6px] rounded-full" style={{ background: LILLA }} />
                Klar for utleie
              </span>
            </div>
            <div className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="truncate text-[16.5px] font-bold tracking-[-0.02em]" style={tittelStil}>
                  Storgata 12
                </p>
                <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>
                  0155 Oslo · 2-roms · 64 m² · 3. etasje
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[15.5px] font-bold tabular-nums tracking-[-0.02em]" style={tittelStil}>
                  18 500 kr
                </p>
                <p className="mt-[2px] text-[11px]" style={{ color: MUTED }}>
                  per måned
                </p>
              </div>
            </div>
          </div>
          <p
            className={`mt-5 flex items-center gap-1.5 text-[12px] transition-opacity delay-500 duration-700 ${
              iKort ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ color: MUTED }}
          >
            <Check className="h-3 w-3" strokeWidth={2.5} style={{ color: LILLA }} />
            Leiepris foreslått av AI
          </p>
        </div>
      </div>
    </div>
  );
}
