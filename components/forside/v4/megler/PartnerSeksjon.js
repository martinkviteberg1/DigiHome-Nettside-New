'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig, Knapp, Lenke } from '../motion';
import { sendTilDemo } from './RegnSeksjon';

/* ---------------------------------------------------------------------------
   PartnerSeksjon — «Fem byråer. Oppdrag i deres område.»

   Det strategiske svaret på «konkurrerer dere med oss?»: en klar holdning.
   Vi forvalter selv i Bergen sentrum; henvendelser vi ikke tar selv går til
   partnere på systemet. Fem plasser i 2025 (knapphet, ærlig tidlig fase).
   NB — dette er et forretningsløfte som eier/ledelse må stå for. Tallet
   PLASSER og formuleringene er samlet her, så de er enkle å justere.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

const PLASSER = 5;

const FORDELER = [
  ['Oppdrag fra digihome.no', 'Eiere som tar kontakt via digihome.no i deres område, sendes til dere med boligdata, leieestimat og tilbudsutkast ferdig.'],
  ['Dere påvirker hva vi bygger', 'Partnerne er de første vi spør når vi prioriterer. Det dere trenger i drift, bygger vi, og dere får det først.'],
  ['Deres data er deres', 'Vi deler ikke eiere, henvendelser eller priser med andre, og vi selger ikke til eiere dere har avtale med. Det står i avtalen.'],
];

export default function PartnerSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="partner" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-partner">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <p className="inline-flex flex-wrap items-center gap-x-3 gap-y-2 text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>
              Partnerprogram 2025
              <span className="inline-flex items-center gap-[5px]" aria-label={`${PLASSER} plasser`} data-testid="v4m-partner-plasser">
                {Array.from({ length: PLASSER }).map((_, i) => (
                  <span key={i} className="h-[7px] w-[7px] rounded-full" style={{ boxShadow: `inset 0 0 0 1.5px ${T.lilla}`, opacity: synlig ? 1 : 0, transition: `opacity 400ms ${EASE} ${300 + i * 90}ms` }} />
                ))}
              </span>
            </p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-partner-tittel">
              Vi sender oppdrag<br />til fem byråer<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
              DigiHome forvalter selv i Bergen sentrum. Henvendelser vi ikke kan ta, fordi de ligger utenfor sentrum eller vi ikke har kapasitet, sender vi videre til partnere som bruker systemet. Dere får oppdraget, og eieren får samme opplegg som hos oss.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={inn(3)}>
              <Knapp href="#demo" variant="ink" onClick={() => sendTilDemo({ partner: true })} data-testid="v4m-partner-cta">Søk om partnerplass</Knapp>
              <Lenke href="#demo" onClick={() => sendTilDemo({})} data-testid="v4m-partner-demo">Eller book en vanlig demo</Lenke>
            </div>
          </div>
          <ol className="grid gap-y-7 lg:col-span-6 lg:pt-3">
            {FORDELER.map(([t, d], i) => (
              <li key={t} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(4 + i, 12) }} data-testid={`v4m-partner-${i}`}>
                <div className="grid gap-x-6 gap-y-1 sm:grid-cols-[32px_1fr]">
                  <p className="text-[13px] tabular-nums" style={{ color: T.lilla }}>0{i + 1}</p>
                  <div>
                    <p className="text-[17px] font-medium" style={{ color: T.ink }}>{t}</p>
                    <p className="mt-2 max-w-[46ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
