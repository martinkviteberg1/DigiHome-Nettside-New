'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EASE, Knapp, Lenke, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   VeiskilleSeksjon — «To måter å eie på autopilot.»

   Det første DigiHome hjelper en boligeier med er valget: gjøre det selv med
   DigiHome som motor, eller la DigiHome ta alt. Samme plattform under —
   forskjellen er hvem som gjør hva. Derfor to store, rolige flater side om
   side, med samme oppbygning (merke · tittel · én setning · fire linjer ·
   pris · handling), så øyet kan sammenligne uten å lese en tabell.

   Fargekoden er sidens egen: lys flate = programvare du bruker selv,
   charcoal = tjeneste vi leverer (samme kode som i SporSeksjon).
   Prisene er de som faktisk gjelder: 5 % av husleien for selvforvaltning
   (avtalen), full forvaltning prises etter omfang — ingen tall vi ikke har.
--------------------------------------------------------------------------- */

const SPOR = [
  {
    id: 'selv',
    merke: 'Selvforvaltning',
    meta: 'Hele Norge',
    tittel: ['Du eier.', 'DigiHome driver.'],
    tekst: 'Du finner leietakeren og holder visningen. Alt etter det — kontrakt, husleie, oppfølging og saker — går av seg selv. Du godkjenner det som koster.',
    punkter: [
      'Leiekontrakt signert med BankID',
      'Husleie inn — varsler og purring ut',
      'Saker med leverandør og pris — du godkjenner',
      'Leietakerens meldinger, dokumenter og historikk samlet',
    ],
    pris: { stor: '5 %', etter: 'av husleien', under: 'Ingen oppstart. Ingen bindingstid. Ingen faste gebyrer.' },
    handling: { tekst: 'Start med adressen', href: '/bli-utleier/start?tier=selvforvaltning' },
    sekundaer: { tekst: 'Les avtalen', href: '/avtale/selvforvaltning' },
  },
  {
    id: 'full',
    merke: 'Full forvaltning',
    meta: 'Bergen og omegn',
    tittel: ['Vi tar alt.', 'Du får rapporten.'],
    tekst: 'Vi finner og velger leietaker, holder visning, signerer kontrakt og følger opp — drift, leverandører og leietaker. Du får oversikten, og siste ord når noe koster.',
    punkter: [
      'Annonse, visning og leietakervalg',
      'Kontrakt, depositum og innflytting',
      'Drift, leverandører og oppfølging av leietaker',
      'Fast forvalter og månedsrapport',
    ],
    pris: { stor: 'Etter omfang', etter: 'en andel av husleien', under: 'Tilpasset boligen og hva vi skal gjøre. Konkret tilbud etter en kort samtale.' },
    handling: { tekst: 'Book en samtale', href: '/book-mote' },
    sekundaer: { tekst: 'Se full forvaltning', href: '/forvaltning' },
    mork: true,
  },
];

function LenkeLys({ href, children, ...rest }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-1.5 text-[15px] font-medium transition-colors" style={{ color: T.offwhite }} {...rest}>
      <span className="transition-opacity group-hover:opacity-60">{children}</span>
      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.6} />
    </Link>
  );
}

function Kort({ s, i, synlig }) {
  const mork = !!s.mork;
  const fg = mork ? T.offwhite : T.ink;
  const dim = mork ? 'rgba(244,241,234,0.64)' : 'rgba(21,19,15,0.62)';
  const hair = mork ? 'rgba(244,241,234,0.12)' : 'rgba(21,19,15,0.10)';
  const delay = 140 + i * 140;
  return (
    <article
      className="relative flex min-w-0 flex-col rounded-[22px] p-7 sm:rounded-[26px] sm:p-10 lg:p-12"
      style={{
        background: mork ? T.charcoal : T.flate,
        color: fg,
        boxShadow: mork ? '0 40px 80px -50px rgba(21,19,15,0.6)' : 'inset 0 0 0 1px rgba(21,19,15,0.05)',
        opacity: synlig ? 1 : 0,
        transform: synlig ? 'none' : 'translateY(24px)',
        transition: `opacity 900ms ${EASE} ${delay}ms, transform 1000ms ${EASE} ${delay}ms`,
      }}
      data-testid={`v4b-kort-${s.id}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-medium" style={{ background: mork ? 'rgba(244,241,234,0.10)' : 'rgba(21,19,15,0.07)' }}>{s.merke}</span>
        <span className="text-[13px]" style={{ color: dim }}>{s.meta}</span>
      </div>

      <h3 className="mt-8 text-[clamp(34px,3vw,54px)] sm:mt-10" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.98 }}>
        {s.tittel[0]}<br />{s.tittel[1]}
      </h3>
      <p className="mt-5 max-w-[42ch] text-[16px] leading-[1.5] sm:text-[17px]" style={{ color: dim }}>{s.tekst}</p>

      <ul className="mt-8 sm:mt-9" data-testid={`v4b-punkter-${s.id}`}>
        {s.punkter.map((t) => (
          <li key={t} className="flex items-baseline gap-3 py-3 text-[15.5px] leading-[1.4]" style={{ borderTop: `1px solid ${hair}` }}>
            <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: T.lilla }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>

      {/* Prisen — stor, ærlig. */}
      <div className="mt-10 border-t pt-7 lg:mt-auto lg:pt-8" style={{ borderColor: hair }}>
        <p className="flex flex-wrap items-baseline gap-x-3">
          <span className={s.pris.stor.length > 6 ? 'text-[clamp(30px,2.4vw,40px)]' : 'text-[clamp(44px,3.6vw,60px)]'} style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.95 }} data-testid={`v4b-pris-${s.id}`}>{s.pris.stor}</span>
          <span className="text-[16px] sm:text-[17px]" style={{ color: dim }}>{s.pris.etter}</span>
        </p>
        <p className="mt-2.5 max-w-[40ch] text-[13.5px] leading-[1.45] sm:text-[14px]" style={{ color: dim }}>{s.pris.under}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
        <Knapp href={s.handling.href} variant={mork ? 'lys' : 'ink'} data-testid={`v4b-cta-${s.id}`}>{s.handling.tekst}</Knapp>
        {mork ? <LenkeLys href={s.sekundaer.href}>{s.sekundaer.tekst}</LenkeLys> : <Lenke href={s.sekundaer.href}>{s.sekundaer.tekst}</Lenke>}
      </div>
    </article>
  );
}

export default function VeiskilleSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });

  return (
    <section id="veiskille" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4b-veiskille">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-10 pt-24 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-14 lg:pt-32">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
          <h2 className="text-[clamp(40px,4.4vw,76px)] lg:col-span-8" style={{ ...display, color: T.ink }} data-testid="v4b-veiskille-tittel">
            To måter å eie<br />på autopilot.
          </h2>
          <p className="max-w-[34ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-4 lg:pb-2" style={{ color: 'rgba(21,19,15,0.62)' }}>
            Samme motor under. Forskjellen er hvem som gjør hva — og hvor mye du vil ha i egne hender.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-2 lg:gap-6" data-testid="v4b-veiskille-kort">
          {SPOR.map((s, i) => <Kort key={s.id} s={s} i={i} synlig={synlig} />)}
        </div>

        <p className="mt-8 text-[15px]" style={{ ...inn(3), color: 'rgba(21,19,15,0.55)' }}>
          Usikker?{' '}
          <a href="#sammenlign" className="font-medium underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F]" style={{ color: T.ink }} data-testid="v4b-til-sammenlign">Se hva som skjer i hver modell</a>
          <span aria-hidden="true"> ↓</span>
        </p>
      </div>
    </section>
  );
}
