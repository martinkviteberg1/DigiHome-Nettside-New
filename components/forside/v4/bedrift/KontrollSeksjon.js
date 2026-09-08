'use client';

import React, { useRef } from 'react';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   KontrollSeksjon — «Beslutningene er deres. Sporet er komplett.»

   Det et selskap spør om før det spør om pris: hvem kan gjøre hva, hva krever
   godkjenning, og kan vi se det etterpå? Én rolig steinflate, et utsagn i
   display, og fire punkter — hvert med ett konkret eksempel fra produktet
   (ikke en påstand). Kun det systemet faktisk gjør: roller og rettigheter,
   godkjenningsgrenser, full historikk, BankID gjennom Posten.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.10)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.45)';
const SPRETT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const inn = (vis, i, y = 10) => ({ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: `opacity 600ms ${EASE} ${i}ms, transform 700ms ${SPRETT} ${i}ms` });

const PUNKTER = [
  { t: 'Roller og rettigheter', d: 'Hver bruker ser og gjør bare det rollen tillater. Saker adresseres til rollen, ikke til en innboks.', eks: ['Driftssjef', 'godkjenner pris og kontrakt'] },
  { t: 'Godkjenningsgrenser', d: 'Kostnader over grensen dere setter stopper og venter på riktig rolle. Under grensen går rutinen.', eks: [`${tall(6200)} kr`, 'over grensen → venter på driftssjef'] },
  { t: 'Full historikk', d: 'Hver handling logget med hvem og når — på hver enhet, hver sak og hver kontrakt. Revisjon og overlevering blir enkle.', eks: ['09:40', 'Kari Nilsen godkjente · Strandgaten 12'] },
  { t: 'BankID gjennom Posten', d: 'Kontrakter og oppgjør signeres av identifiserte parter. Dokumentet arkiveres på enheten.', eks: ['Signert 14:02', 'Strandgaten Eiendom AS · v/ driftssjef'] },
];

export default function KontrollSeksjon() {
  const ref = useRef(null);
  const vis = useSynlig(ref, 0.2);
  return (
    <section id="kontroll" ref={ref} className="relative" style={{ background: T.flate, color: T.ink }} data-testid="v4e-kontroll">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-24 lg:pt-28">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(vis, 0) }}>Kontroll</p>
            <h2 className="mt-4 max-w-[13ch] text-[clamp(38px,4.2vw,72px)]" style={{ ...display, color: T.ink, ...inn(vis, 80) }} data-testid="v4e-kontroll-tittel">
              Beslutningene er deres<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span> Sporet er komplett<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(vis, 160) }}>
              Autopilot betyr ikke mindre kontroll — det betyr at kontrollen ligger i reglene dere setter, ikke i innboksen. Det som koster og det som binder, stopper hos riktig rolle. Alt annet går, og alt logges.
            </p>
          </div>
          <ul className="lg:col-span-7" data-testid="v4e-kontroll-punkter">
            {PUNKTER.map((p, i) => (
              <li key={p.t} className="grid gap-3 border-t py-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-8 lg:py-7" style={{ borderColor: 'rgba(21,19,15,0.14)', ...inn(vis, 120 + i * 120) }}>
                <div>
                  <p className="text-[18px] font-medium tracking-[-0.01em]" style={{ color: T.ink }}>{p.t}</p>
                  <p className="mt-1.5 max-w-[42ch] text-[15px] leading-[1.5]" style={{ color: DIM }}>{p.d}</p>
                </div>
                {/* Eksempelet — en linje fra produktet */}
                <div className="flex items-start gap-3 sm:justify-end">
                  <span aria-hidden="true" className="mt-[7px] block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />
                  <p className="min-w-0 text-[14px] leading-[1.5] sm:text-right" style={{ color: 'rgba(21,19,15,0.7)' }}>
                    <span className="font-medium" style={{ color: T.ink }}>{p.eks[0]}</span>
                    <span className="block" style={{ color: DIM }}>{p.eks[1]}</span>
                  </p>
                </div>
              </li>
            ))}
            <li className="border-t pt-4 text-[13.5px]" style={{ borderColor: 'rgba(21,19,15,0.14)', color: SVAK, ...inn(vis, 620) }}>
              Rapport per bygg og selskap eksporteres til regnskapssystemet dere bruker.
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
