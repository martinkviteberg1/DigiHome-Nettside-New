'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   TrygghetSeksjon — «Bygget for andres penger.»

   Det en megler sjekker før pris: kan vi stole på dette med eiernes penger?
   Seks fakta som alle finnes i produktet (og står i FAQ/oppgjør): klientkonto,
   automatisk avstemming, BankID via Posten, oppgjørsrapport + årsoppgave,
   purring etter husleieloven, full logg. Nederst: regnskapet dere har.
   Ingen tall vi ikke kan stå for — «bevist i egen drift» er beviset.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

const PUNKTER = [
  { t: 'Klientkonto', d: 'Eiernes husleie står på klientmiddelkonto, adskilt fra deres egne penger.' },
  { t: 'Avstemt automatisk', d: 'Hvert leieforhold har egen KID. Innbetalingene avstemmes automatisk mot husleiekravene.' },
  { t: 'BankID på alt som signeres', d: 'Oppdragsavtaler og leiekontrakter signeres gjennom Posten signering og arkiveres på eier og bolig.' },
  { t: 'Rapport eieren forstår', d: 'Eieren får oppgjørsrapport per bolig hver måned, og en årsoppgave i januar som regnskapsføreren kan bruke direkte.' },
  { t: 'Purring etter husleieloven', d: 'Påminnelse, purring og varsel om utkastelse sendes automatisk, og dere bestemmer hvor prosessen skal stoppe.' },
  { t: 'Alt logget', d: 'Hver handling lagres med hvem og når. Roller og beløpsgrenser settes per eier og per person hos dere.' },
];

/* PowerOffice har vektorlogo i /v4/logo; Tripletex og Fiken settes typografisk i samme dempede ink. */
const REGNSKAP = [
  { id: 'poweroffice', navn: 'PowerOffice', src: '/v4/logo/poweroffice.svg', ratio: 6.456, h: 18 },
  { id: 'tripletex', navn: 'Tripletex' },
  { id: 'fiken', navn: 'Fiken' },
];

function Logo({ navn, src, ratio, h }) {
  if (!src) return <span className="text-[17px] font-medium" style={{ letterSpacing: '-0.01em' }}>{navn}</span>;
  const mask = `url(${src})`;
  return (
    <span role="img" aria-label={navn} className="block" style={{ height: h, width: Math.round(h * ratio), background: 'currentColor', WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: 'contain', maskSize: 'contain', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
  );
}

export default function TrygghetSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });
  return (
    <section id="trygghet" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-trygghet">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-5">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Trygghet</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-trygghet-tittel">
              Trygt for eiernes penger<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
            <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
              Den som forvalter for andre, har ansvar for andres penger. DigiHome er laget med det som utgangspunkt, og vi bruker det selv hver dag på egne kunders boliger i Bergen.
            </p>
            <p className="mt-8 inline-flex items-center gap-2.5 text-[14.5px] font-medium" style={{ color: T.ink, ...inn(3) }} data-testid="v4m-trygghet-bevis">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: T.gronn }} />Vi bruker det selv: DigiHome forvalter egne kunders boliger på samme system
            </p>
          </div>
          <ol className="grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:col-span-7 lg:gap-x-10">
            {PUNKTER.map((p, i) => (
              <li key={p.t} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(3 + i, 12) }} data-testid={`v4m-trygghet-${i}`}>
                <p className="flex items-center gap-2.5 text-[16.5px] font-medium" style={{ color: T.ink }}><span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: T.lilla }} />{p.t}</p>
                <p className="mt-2 max-w-[36ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{p.d}</p>
              </li>
            ))}
          </ol>
        </div>
        {/* Regnskapet dere har */}
        <div className="mt-14 flex flex-col gap-5 border-t pt-7 sm:flex-row sm:items-center sm:justify-between lg:mt-16" style={{ borderColor: HAIR, ...inn(10, 10) }} data-testid="v4m-trygghet-regnskap">
          <p className="text-[14.5px]" style={{ color: DIM }}>Bilag og utbetalinger går rett inn i regnskapssystemet dere allerede bruker.</p>
          <ul className="flex flex-wrap items-center gap-x-9 gap-y-3" style={{ color: 'rgba(21,19,15,0.74)' }}>
            {REGNSKAP.map((l) => <li key={l.id} className="flex items-center" data-testid={`v4m-regnskap-${l.id}`}><Logo {...l} /></li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
