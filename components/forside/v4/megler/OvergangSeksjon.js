'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   OvergangSeksjon — «Uker, ikke måneder.»

   Innvending nr. 1 mot å bytte system er byttet. Tre korte uker som en
   linje: Import → Parallell drift → Første oppgjør. Løftene holdes til det
   siden allerede sier (oppsett sammen med dere, kontrakter og historikk som
   de er, «noen uker»). «Typisk plan» — tempoet tilpasses porteføljen.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

const FASER = [
  { uke: 'Uke 1', t: 'Import', d: 'Eiere, oppdragsavtaler, løpende leieforhold og depositum inn — med kontrakter og historikk som de er. Honorarsats per eier. Regnskapet kobles.' },
  { uke: 'Uke 2', t: 'Parallell drift', d: 'Dere ser begge systemene side om side. Ingenting stopper — ingen eier eller leietaker merker byttet.' },
  { uke: 'Uke 3', t: 'Første oppgjør', d: 'Husleien krevs inn, honoraret trekkes, eierne får utbetaling og rapport. Fra da av går rutinen.' },
];

const LOFTER = [
  ['Ingenting går tapt', 'Kontrakter, depositum og historikk følger med — ikke en mal.'],
  ['Dere velger tempo', 'Eier for eier, eller hele porteføljen på én gang.'],
  ['Vi sitter med dere', 'Oppsettet gjøres sammen — ikke overlatt til en import-knapp.'],
];

export default function OvergangSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="overgang" ref={ref} className="relative" style={{ background: T.flate, color: T.ink }} data-testid="v4m-overgang">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="max-w-[820px]">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Overgang</p>
          <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-overgang-tittel">
            Uker, ikke måneder<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
            Den største innvendingen mot å bytte system er byttet. Derfor er det planlagt som tre korte uker — og vi gjør det sammen med dere.
          </p>
        </div>
        <div className="relative mt-12 lg:mt-16" style={inn(3, 20)}>
          {/* Linjen gjennom ukene — tegnes når flaten er i bildet */}
          <div aria-hidden="true" className="absolute left-0 right-0 top-[13px] hidden h-px lg:block" style={{ background: HAIR }}>
            <span className="absolute inset-y-0 left-0 w-full" style={{ background: T.lilla, transformOrigin: '0 50%', transform: synlig ? 'scaleX(1)' : 'scaleX(0)', transition: 'transform 2000ms cubic-bezier(0.22, 1, 0.36, 1) 500ms' }} />
          </div>
          <ol className="grid gap-8 lg:grid-cols-3 lg:gap-10">
            {FASER.map((f, i) => (
              <li key={f.t} className="relative" style={inn(4 + i, 12)} data-testid={`v4m-overgang-${i}`}>
                <div className="flex items-center gap-3">
                  <span className="relative z-[1] grid h-[27px] w-[27px] shrink-0 place-items-center rounded-full text-[12.5px] font-medium tabular-nums" style={{ background: T.flate, color: T.ink, boxShadow: `0 0 0 1px rgba(21,19,15,0.16)` }}>{i + 1}</span>
                  <p className="relative z-[1] pr-3 text-[12.5px] font-medium" style={{ color: SVAK, background: T.flate }}>{f.uke}</p>
                </div>
                <p className="mt-4 text-[24px] sm:text-[26px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>{f.t}</p>
                <p className="mt-3 max-w-[38ch] text-[14.5px] leading-[1.55]" style={{ color: DIM }}>{f.d}</p>
              </li>
            ))}
          </ol>
        </div>
        <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3 lg:mt-14">
          {LOFTER.map(([t, d], i) => (
            <li key={t} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(7 + i, 12) }}>
              <p className="text-[16.5px] font-medium" style={{ color: T.ink }}>{t}</p>
              <p className="mt-2 max-w-[36ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[13px]" style={{ color: SVAK, ...inn(10) }}>Typisk plan. Tempoet tilpasses porteføljen — større porteføljer tas eier for eier.</p>
      </div>
    </section>
  );
}
