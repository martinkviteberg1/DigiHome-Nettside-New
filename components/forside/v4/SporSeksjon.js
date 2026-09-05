'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   SporSeksjon — soft gate, ikke portvakt.

   Svarer på «ok — autopilot for hvem?» rett etter produktet (hero → tillit →
   produkt → SPOR → leietaker). Tre spor, formulert som det du prøver å få
   gjort — ikke som organisasjonskart.

   Form: ren editorial. Siden har nettopp hatt et stort foto (produkt) og får
   straks video (leietaker) — denne seksjonen er pusten mellom. Ingen bilder,
   ingen fyllflater, ingen kort: tre åpne kolonner på canvas, hver med én
   hårlinje øverst, et lite tall, stor display-tittel, én setning og én
   handling nederst. Hårlinjen blir lilla når du peker — det er alt.
   Tredje spor er en tjeneste, ikke programvare — handlingen er den ene
   mørke pillen (charcoal), ikke en tekstlenke.
--------------------------------------------------------------------------- */

const SPOR = [
  {
    id: 'selv',
    nr: '01',
    merke: 'Privat huseier',
    meta: '1–5 boliger',
    tittel: ['Lei ut', 'selv'],
    tekst: 'Du eier én eller noen få boliger og vil ha det ryddig uten å bruke kveldene på det.',
    punkter: ['Leiekontrakt signert med BankID', 'Husleie med oppfølging og purring', 'Saker: leverandør og pris — du godkjenner'],
    handling: 'Start med adressen din',
    href: '/privat',
  },
  {
    id: 'skaler',
    nr: '02',
    merke: 'Eiendomsselskap',
    meta: 'Portefølje · flere bygg',
    tittel: ['Skaler', 'forvaltningen'],
    tekst: 'Dere drifter mange enheter på tvers av bygg og trenger én oversikt — med roller og kontroll.',
    punkter: ['Alle bygg og enheter i én oversikt', 'Roller og godkjenning på tvers', 'Saker, økonomi og dokumenter samlet'],
    handling: 'Se løsningen for selskaper',
    href: '/bedrift',
  },
  {
    id: 'forvaltning',
    nr: '03',
    merke: 'Forvaltning',
    meta: 'Bergen og omegn',
    tittel: ['Overlat jobben', 'til oss'],
    tekst: 'Du vil slippe det praktiske helt. DigiHome forvalter boligen — du beholder oversikten og siste ord.',
    punkter: ['Vi finner og følger opp leietaker', 'Vi håndterer drift og leverandører', 'Du får oversikten — og siste ord'],
    handling: 'Se full forvaltning',
    href: '/forvaltning',
    tjeneste: true,
  },
];

const HAIR = 'rgba(21,19,15,0.14)';

function Pil({ className = '' }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Én kolonne. Hele kolonnen er lenken. Hårlinje → tall → tittel → setning → handling nederst. */
function Kolonne({ s, i, synlig }) {
  const delay = 160 + i * 120;
  return (
    <li className="min-w-0" data-testid={`v4-spor-${s.id}`}>
      <Link
        href={s.href}
        className="group relative flex h-full flex-col pt-5 focus-visible:outline-none lg:min-h-[470px] lg:pt-6"
        style={{ color: T.ink, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(22px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms` }}
        aria-label={`${s.tittel.join(' ')} — ${s.handling}`}
      >
        {/* Hårlinjen øverst — ink, blir lilla på hover/fokus */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: HAIR }} />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-700 group-hover:scale-x-100 group-focus-visible:scale-x-100" style={{ background: T.lilla, transitionTimingFunction: EASE }} />

        {/* Hvem: merke (pille) + meta, tallet ytterst — man skal se på ett blikk hvem sporet er for */}
        <span className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-medium" style={{ background: 'rgba(21,19,15,0.07)', color: T.ink }} data-testid={`v4-spor-merke-${s.id}`}>{s.merke}</span>
            <span className="hidden text-[13px] sm:inline" style={{ color: 'rgba(21,19,15,0.5)' }}>{s.meta}</span>
          </span>
          <span className="text-[13px] tabular-nums" style={{ color: 'rgba(21,19,15,0.4)' }}>{s.nr}</span>
        </span>

        <h3 className="mt-8 text-[clamp(40px,3.3vw,60px)] sm:mt-9" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.96, color: T.ink }}>
          {s.tittel[0]}<br />{s.tittel[1]}
        </h3>

        <p className="mt-5 max-w-[30ch] text-[16px] leading-[1.5] sm:text-[16.5px]" style={{ color: 'rgba(21,19,15,0.64)' }}>
          {s.tekst}
        </p>

        {/* Hva du får — tre linjer på hårlinjer. Kort, konkret, sant. */}
        <ul className="mt-7 sm:mt-8" data-testid={`v4-spor-punkter-${s.id}`}>
          {s.punkter.map((t) => (
            <li key={t} className="py-2.5 text-[15px] leading-[1.4]" style={{ borderTop: `1px solid rgba(21,19,15,0.09)`, color: 'rgba(21,19,15,0.78)' }}>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-9 lg:mt-auto lg:pt-10">
          {s.tjeneste ? (
            <span className="inline-flex h-11 w-fit items-center gap-2 rounded-[12px] px-5 text-[15px] font-medium transition-[background-color,transform] duration-300 group-hover:bg-[#2A2620] group-active:scale-[0.98]" style={{ background: T.charcoal, color: T.offwhite }}>
              {s.handling}
              <Pil className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:translate-x-1" />
            </span>
          ) : (
            <span className="inline-flex h-11 items-center gap-2 text-[15px] font-medium" style={{ color: T.ink }}>
              {s.handling}
              <Pil className="transition-transform duration-500 ease-out group-hover:translate-x-1.5" />
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

export default function SporSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.18);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });

  return (
    <section id="spor" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-spor">
      {/* Container: editorial (1360) — seksjonen skal ha ro, ikke bredde. */}
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-12 pt-24 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-16 lg:pt-32">
        {/* Tittel + én linje */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
          <h2 className="text-[clamp(40px,4.4vw,76px)] lg:col-span-8" style={{ ...display, color: T.ink }} data-testid="v4-spor-tittel">
            Autopilot, tilpasset<br />måten du leier ut på.
          </h2>
          <p className="max-w-[34ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-4 lg:pb-2" style={{ color: 'rgba(21,19,15,0.62)' }}>
            Privat huseier, eiendomsselskap — eller la oss ta jobben. Samme motor, tre måter å bruke den.
          </p>
        </div>

        {/* Tre åpne kolonner — hele kolonnen er lenken */}
        <ul className="mt-16 grid gap-y-12 lg:mt-24 lg:grid-cols-3 lg:gap-x-10 xl:gap-x-14" data-testid="v4-spor-liste">
          {SPOR.map((s, i) => <Kolonne key={s.id} s={s} i={i} synlig={synlig} />)}
        </ul>
      </div>
    </section>
  );
}
