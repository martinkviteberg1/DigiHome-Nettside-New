'use client';

import Link from 'next/link';
import React, { useRef } from 'react';
import AdresseFelt from './AdresseFelt';
import { Knapp, EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   AvslutningSeksjon — finalen. Lukker sirkelen fra heroen:
   «Utleie på autopilot. Start med adressen din.»

   Full-bleed: den skarpe Oslo-bygården (samme bolig som i produktseksjonen,
   nå uten demping) under en varm, mørk tone. Innholdet følger editorial-
   containeren. Adressefeltet er det samme som i heroen — uten onValgt går
   valget rett til onboardingen. Under feltet: de tre stegene som følger.
--------------------------------------------------------------------------- */

const STEG = [
  ['1', 'Skriv inn adressen', 'Vi finner boligen og setter den opp.'],
  ['2', 'Legg inn leietaker og kontrakt', 'Kontrakten signeres med BankID.'],
  ['3', 'Autopilot på', 'Husleie, purring og saker går automatisk — du godkjenner det som koster.'],
];

export default function AvslutningSeksjon({ tittel = 'Utleie på autopilot', under = 'Start med adressen din. Resten setter vi opp sammen — på ti minutter.', handling = null, steg = STEG }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.25);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 800ms ${EASE} ${i * 100}ms, transform 900ms ${EASE} ${i * 100}ms` });

  return (
    <section id="start" ref={ref} className="relative overflow-hidden" style={{ background: T.charcoal, color: T.offwhite }} data-testid="v4-avslutning">
      {/* Verden: skarp bygård, varm mørk tone. Sakte «settle» når seksjonen kommer i view. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ transform: synlig ? 'scale(1)' : 'scale(1.05)', transition: 'transform 14000ms cubic-bezier(0.2,0.6,0.2,1)', willChange: 'transform' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/v4/bolig-oslo-2000.webp"
          srcSet="/v4/bolig-oslo-1200.webp 1200w, /v4/bolig-oslo-2000.webp 2000w"
          sizes="100vw"
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="h-full w-full select-none object-cover"
          style={{ objectPosition: '50% 35%' }}
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.66) 0%, rgba(21,18,15,0.50) 45%, rgba(21,18,15,0.82) 100%)' }} />

      <div className="relative mx-auto w-full max-w-[1360px] px-5 pb-24 pt-24 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-32 lg:pt-36">
        <div className="max-w-[880px]">
          <h2 className="text-[clamp(52px,6.2vw,104px)]" style={{ ...display, color: T.offwhite, ...inn(0) }} data-testid="v4-avslutning-tittel">
            {tittel}<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[36ch] text-[18px] leading-[1.45] sm:text-[21px]" style={{ color: 'rgba(244,241,234,0.78)', ...inn(1) }}>
            {under}
          </p>
          {handling ? (
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={inn(2)}>
              <Knapp href={handling.knapp.href} variant="lilla" size="lg" data-testid="v4-avslutning-knapp">{handling.knapp.tekst}</Knapp>
              {handling.lenke ? (
                <Link href={handling.lenke.href} className="text-[15px] font-medium underline decoration-[#F4F1EA]/30 underline-offset-4 transition-colors hover:text-[#F4F1EA]/70" style={{ color: T.offwhite }} data-testid="v4-avslutning-lenke">{handling.lenke.tekst}</Link>
              ) : null}
            </div>
          ) : (
            <div className="relative z-20 mt-9 w-full sm:max-w-[520px]" style={inn(2)}>
              <AdresseFelt />
            </div>
          )}
        </div>

        {/* Stegene som følger — tre korte, på én hårlinje */}
        <ol className="mt-16 grid gap-8 border-t pt-8 sm:grid-cols-3 sm:gap-10 lg:mt-24 lg:pt-10" style={{ borderColor: 'rgba(244,241,234,0.16)', ...inn(3) }} data-testid="v4-avslutning-steg">
          {steg.map(([nr, t, d]) => (
            <li key={nr} className="grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
              <span className="pt-[3px] text-[13px] tabular-nums" style={{ color: 'rgba(244,241,234,0.5)' }}>{nr}</span>
              <span>
                <span className="block text-[16px] font-medium" style={{ color: T.offwhite }}>{t}</span>
                <span className="mt-1 block max-w-[34ch] text-[14.5px] leading-[1.45]" style={{ color: 'rgba(244,241,234,0.66)' }}>{d}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
