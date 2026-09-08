'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   StegSeksjon — «Slik kommer du i gang.»

   Fire steg på én hårlinje. Samme vei for begge modeller — bare steg tre
   skiller: avtalen du signerer selv, eller samtalen der vi avtaler omfang.
   Til høyre: den faste forvalteren — for dem som velger full forvaltning
   er det én person som kjenner boligen.
--------------------------------------------------------------------------- */

const STEG = [
  { nr: '1', t: 'Adressen', d: 'Skriv inn adressen. Vi finner boligen og setter den opp.' },
  { nr: '2', t: 'Boligen', d: 'Bilder, leietaker og kontrakt — legg inn det du har, resten kommer.' },
  { nr: '3', t: 'Avtalen', d: 'Selvforvaltning: signer avtalen med BankID på to minutter. Full forvaltning: vi avtaler omfang og pris i en kort samtale.' },
  { nr: '4', t: 'Autopilot på', d: 'Husleie, purring og saker går automatisk. Leier du ut selv, er du fortsatt utleieren og godkjenner det som koster — med full forvaltning tar forvalteren over.' },
];

/* Ingen navngitt forvalter som standard — DigiHome har flere forvaltere; hvem du får, avtales ved start. */
const PERSON = null;

export default function StegSeksjon({ tittel = ['Slik kommer', 'du i gang.'], under = 'Ti minutter fra adresse til autopilot. Selv — eller med oss.', steg = STEG, person = PERSON, testid = 'v4b' }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });

  return (
    <section id="steg" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid={`${testid}-steg`}>
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-8 pt-16 sm:px-8 sm:pt-24 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-12 lg:pt-32">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4" style={inn(0)}>
            <h2 className="text-[clamp(38px,3.6vw,64px)]" style={{ ...display, color: T.ink }} data-testid={`${testid}-steg-tittel`}>
              {tittel[0]}<br />{tittel[1]}
            </h2>
            <p className="mt-6 max-w-[30ch] text-[17px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.64)' }}>
              {under}
            </p>

            {/* Den faste forvalteren */}
            {person ? (
              <div className="mt-10 flex items-center gap-4 rounded-[16px] p-4" style={{ background: T.flate, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.05)', ...inn(2) }} data-testid={`${testid}-forvalter`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={person.bilde} alt="" width={52} height={52} className="shrink-0 rounded-full object-cover" style={{ width: 52, height: 52, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
                <div className="min-w-0">
                  <p className="text-[15px] font-medium">{person.navn}</p>
                  <p className="text-[13.5px] leading-[1.4]" style={{ color: 'rgba(21,19,15,0.6)' }}>{person.tekst}</p>
                </div>
              </div>
            ) : null}
          </div>

          <ol className="grid gap-8 border-t pt-8 sm:grid-cols-2 lg:col-span-8 lg:grid-cols-4 lg:gap-8 lg:pt-10" style={{ borderColor: 'rgba(21,19,15,0.14)', ...inn(1) }} data-testid={`${testid}-steg-liste`}>
            {steg.map((s) => (
              <li key={s.nr} className="min-w-0">
                <span className="text-[13px] tabular-nums" style={{ color: 'rgba(21,19,15,0.45)' }}>{s.nr}</span>
                <p className="mt-3 text-[22px] sm:text-[24px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05 }}>{s.t}</p>
                <p className="mt-3 text-[15px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.64)' }}>{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
