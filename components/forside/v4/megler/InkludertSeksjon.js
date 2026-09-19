'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   InkludertSeksjon — «Det som hører med.»

   Én kompakt flate for alt som ellers ville blitt egne seksjoner: eierportal,
   merkevare, roller og historikk, purring, regnskap og overgang. Én tittel,
   én setning per punkt. Ingen produktbilde her; Salg og Oppgjør har vist
   produktet allerede.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

const PUNKTER = [
  ['Eierportal', 'Hver eier ser sine boliger, godkjenner kostnader over grensen dere har satt, og finner oppgjøret selv.'],
  ['Deres merkevare', 'Tilbud, oppdragsavtale og landingssider går ut med deres logo og farger.'],
  ['Roller og historikk', 'Hver ansatt ser bare sine eiere. Alt som gjøres, lagres med navn og tidspunkt.'],
  ['Purring etter husleieloven', 'Påminnelse, purring og varsel sendes automatisk. Dere bestemmer hvor det stopper.'],
  ['Regnskap', 'Bilag per eier og bolig til PowerOffice, Tripletex eller Fiken.'],
  ['Overgang på tre uker', 'Oppsett, parallell drift og første oppgjør. Kontrakter og historikk følger med.'],
];

export default function InkludertSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });
  return (
    <section id="inkludert" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-inkludert">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-4">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Også i systemet</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-inkludert-tittel">
              Det som<br />hører med<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
          </div>
          <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:col-span-8" data-testid="v4m-inkludert-liste">
            {PUNKTER.map(([t, d], i) => (
              <li key={t} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(2 + i, 12) }}>
                <p className="text-[12px] tabular-nums" style={{ color: T.lilla }}>{String(i + 1).padStart(2, '0')}</p>
                <p className="mt-2 text-[17px] font-medium" style={{ color: T.ink }}>{t}</p>
                <p className="mt-2 max-w-[40ch] text-[15px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
