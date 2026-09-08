'use client';

import React, { useRef } from 'react';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   InnsynSeksjon — «Du ser det samme som vi ser.»

   Forvaltning uten innsyn er tillit på blind. Her: eierens egen oversikt slik
   den ser ut i DigiHome — boligen, husleien, oppgjøret, saken som ble løst,
   kontrakten og dokumentene. Bygget på det eierportalen faktisk viser
   (brutto → oppgjør, neste utbetaling, saker, dokumenter). Ingen honorar-tall
   (pris for full forvaltning oppgis aldri), ingen fiktiv avkastning.
   Bevegelse: kun opacity/transform, rad for rad når seksjonen kommer i bildet.
--------------------------------------------------------------------------- */

const DIM = 'rgba(21,19,15,0.64)';
const SVAK = 'rgba(21,19,15,0.5)';
const HAIR = 'rgba(21,19,15,0.10)';

const RADER = [
  { k: 'Husleie · mai', v: `${tall(14500)} kr`, d: 'Mottatt 1. mai · avstemt', tone: 'gronn' },
  { k: 'Oppgjør · mai', v: 'Utbetalt 3. mai', d: 'Oppgjørsrapport (PDF) sendt til deg og regnskapsføreren', tone: 'gronn' },
  { k: 'Sak · varmtvann', v: 'Løst 9. mai', d: `Rørlegger · ${tall(6200)} kr · godkjent av deg 7. mai`, tone: 'gronn' },
  { k: 'Leiekontrakt', v: 'Emma Sørensen', d: 'Signert med BankID · til 31. mai 2027 · depositum hos Keyhole', tone: 'ink' },
  { k: 'Dokumenter', v: '14 filer', d: 'Kontrakt · protokoll · månedsrapporter · bilag', tone: 'ink' },
];

function Hake({ color = T.gronn }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" className="shrink-0" style={{ color }}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function InnsynSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 16) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="innsyn" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4f-innsyn">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Innsyn</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4f-innsyn-tittel">
              Du ser det samme som vi ser<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }} data-testid="v4f-innsyn-ingress">
              Logg inn når du vil. Husleie, oppgjør, saker og dokumenter ligger der — oppdatert, ikke oppsummert. Og når noe krever deg, får du én melding med ett valg.
            </p>
            <ul className="mt-8 grid gap-3 text-[15px]" style={{ color: DIM, ...inn(3) }}>
              {['Månedsrapport og årsoppgave — klar til regnskapsføreren', 'Hver kostnad over grensen din, godkjent av deg først', 'Alt som er gjort, med hvem og når'].map((t) => (
                <li key={t} className="flex items-start gap-3"><span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />{t}</li>
              ))}
            </ul>
          </div>

          {/* Eierens oversikt — én rolig flate */}
          <div className="lg:col-span-7" style={inn(2, 20)}>
            <div className="overflow-hidden rounded-[22px]" style={{ background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.4)' }} data-testid="v4f-innsyn-flate">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7 sm:py-5" style={{ boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-medium" style={{ color: SVAK }}>Din oversikt · mai</p>
                  <p className="mt-0.5 truncate text-[20px] sm:text-[22px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>Nygårdsgaten 5A</p>
                </div>
                <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Alt i orden</p>
              </div>
              <ul className="px-5 sm:px-7">
                {RADER.map((r, i) => (
                  <li key={r.k} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:py-[18px]" style={{ boxShadow: i < RADER.length - 1 ? `inset 0 -1px 0 ${HAIR}` : 'none', ...inn(3 + i, 10) }} data-testid={`v4f-innsyn-rad-${i}`}>
                    <span className="text-[13px] font-medium sm:pt-[3px]" style={{ color: SVAK }}>{r.k}</span>
                    <span className="col-span-2 min-w-0 sm:col-span-1">
                      <span className="block text-[16px] font-medium sm:text-[16.5px]" style={{ color: T.ink }}>{r.v}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-[1.45]" style={{ color: DIM }}>{r.d}</span>
                    </span>
                    <span className="hidden pt-[5px] sm:block">{r.tone === 'gronn' ? <Hake /> : <span className="block h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(21,19,15,0.25)' }} />}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] sm:px-7" style={{ background: 'rgba(21,19,15,0.03)', color: SVAK }}>
                <span>Neste utbetaling · 3. juni</span>
                <span className="inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Ingenting venter på deg</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
