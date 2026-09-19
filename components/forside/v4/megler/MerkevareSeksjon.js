'use client';

import React, { useRef, useState } from 'react';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   MerkevareSeksjon — «Deres navn på det eieren ser.»

   Det salgsseksjonen sier i én bisetning («deres logo og farger»), vist:
   tilbudet som går til eieren, i byråets drakt. Tre eksempel-byråer som
   piller — bytt, og dokumentet skifter farge. Påstandene holdes til det
   siden allerede lover: tilbud med deres logo/farger, landingssider dere
   publiserer fra systemet. Honorar-tall er eksempel (avtale per eier).
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

const BYRA = [
  { id: 'vest', navn: 'Vest Utleie', farge: '#1F5A46', lys: '#E6EFEA' },
  { id: 'fjord', navn: 'Fjord Forvaltning', farge: '#1E2F4F', lys: '#E6EAF1' },
  { id: 'bryggen', navn: 'Bryggen Bolig', farge: '#A24A2C', lys: '#F4E8E2' },
];

const BRUTTO = 18500;
const HONORAR = 0.08;

export default function MerkevareSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const [valgt, setValgt] = useState(0);
  const b = BYRA[valgt];
  const netto = Math.round(BRUTTO * (1 - HONORAR));
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });
  const farge = `background-color 500ms ${EASE}, color 500ms ${EASE}`;
  const rader = [
    ['Brutto leie', `${tall(BRUTTO)} kr`, 'per måned · estimat'],
    ['Honorar', `${Math.round(HONORAR * 100)} %`, 'av innbetalt husleie'],
    ['Netto til deg', `${tall(netto)} kr`, 'utbetalt den 3. hver måned'],
  ];
  return (
    <section id="merkevare" ref={ref} className="relative" style={{ background: T.flate, color: T.ink }} data-testid="v4m-merkevare">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-14">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Merkevare</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-merkevare-tittel">
              Deres navn på det eieren ser<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
              Tilbudet skriver seg selv — og går ut med deres logo og farger. Landingssidene dere publiserer er deres. Eieren møter dere. Motoren er vår.
            </p>
            <div className="mt-8 flex flex-wrap gap-2" style={inn(3)} role="tablist" aria-label="Velg byrå">
              {BYRA.map((x, i) => (
                <button
                  key={x.id} type="button" role="tab" aria-selected={valgt === i} onClick={() => setValgt(i)}
                  className="inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[13.5px] transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/25"
                  style={valgt === i ? { background: T.ink, color: T.offwhite } : { color: 'rgba(21,19,15,0.7)', boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.14)' }}
                  data-testid={`v4m-byra-${x.id}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: x.farge }} />{x.navn}
                </button>
              ))}
            </div>
          </div>
          {/* Tilbudet — i byråets drakt */}
          <div className="lg:col-span-7" style={inn(4, 20)}>
            <div className="overflow-hidden rounded-[22px]" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.35)' }} data-testid="v4m-tilbud">
              <div className="flex items-center justify-between gap-4 px-6 py-4 sm:px-8" style={{ background: b.farge, color: '#FFFFFF', transition: farge }} data-testid="v4m-tilbud-topp">
                <p className="text-[17px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1 }}>{b.navn}</p>
                <p className="text-[12.5px]" style={{ opacity: 0.75 }}>Tilbud · Fjellveien 12</p>
              </div>
              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <p className="text-[12.5px] font-medium" style={{ color: SVAK }}>Til Kari Moen</p>
                <p className="mt-2 max-w-[46ch] text-[15.5px] leading-[1.5]" style={{ color: T.ink }}>
                  Takk for henvendelsen. Vi har sett på Fjellveien 12 og foreslår følgende — med samme rutine som for de {tall(86)} eierne vi allerede forvalter for.
                </p>
                <dl className="mt-6 grid gap-px overflow-hidden rounded-[14px] sm:grid-cols-3" style={{ background: HAIR }}>
                  {rader.map(([k, v, s], i) => (
                    <div key={k} className="px-5 py-4" style={{ background: i === 2 ? b.lys : PAPIR, transition: farge }}>
                      <dt className="text-[12px]" style={{ color: SVAK }}>{k}</dt>
                      <dd className="mt-1.5 text-[24px] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{v}</dd>
                      <dd className="mt-1 text-[12px]" style={{ color: SVAK }}>{s}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <p className="text-[13px]" style={{ color: SVAK }}>Oppdragsavtale · 3 år · signeres digitalt</p>
                  <span className="inline-flex h-10 items-center rounded-[10px] px-4 text-[14px] font-medium" style={{ background: b.farge, color: '#FFFFFF', transition: farge }}>Signer med BankID</span>
                </div>
              </div>
            </div>
            <p className="mt-4 text-[13px]" style={{ color: SVAK }}>Eksempel. Honorar og vilkår er deres avtale med hver eier.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
