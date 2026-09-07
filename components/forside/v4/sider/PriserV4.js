'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import NavV4 from '../NavV4';
import FooterV4 from '../FooterV4';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import { Knapp, Lenke, T, display, tall } from '../motion';
import { Avsloring, DIM, HAIR, Innledning, Punkt, SVAK } from './deler';

/* ---------------------------------------------------------------------------
   PriserV4 — /priser.

   Tre nivåer på hårlinjer, ikke prisbokser: Selvforvaltning (5 % av husleien —
   det eneste tallet vi publiserer), Full forvaltning (tilbud innen 24 timer —
   aldri et tall), Eiendomsselskap (tilpasset porteføljen — demo).
   Under: «Regn ut» — én glidebryter som viser hva 5 % faktisk blir.
--------------------------------------------------------------------------- */

const NIVAER = [
  {
    nr: '01', navn: 'Selvforvaltning', stor: '5\u00a0%', liten: 'av husleien', en: 'Du leier ut selv. Systemet tar rutinen.',
    liste: ['Annonse på FINN', 'Leiekontrakt signert med BankID', 'Husleie som følges opp — med purring', 'Depositumskonto', 'Saker og chat med leietaker', 'Årsoppgave klar til skatten'],
    notat: 'Ingen oppstart · ingen bindingstid · ingen minstepris',
    knapp: { tekst: 'Start med adressen', href: '/bli-utleier/start?tier=selvforvaltning' },
    lenke: { tekst: 'Slik fungerer selvforvaltning', href: '/boligeiere' },
  },
  {
    nr: '02', navn: 'Full forvaltning', stor: 'Tilbud', liten: 'innen 24 timer', en: 'Vi tar jobben. Du bestemmer.',
    liste: ['Alt i selvforvaltning', 'Visning og anbefalt leietaker', 'Én fast forvalter — ett nummer', 'Drift: vaktmester, renhold, håndverkere', 'Månedsrapport og årsoppgave'],
    notat: 'Andel av husleien etter omfang · Bergen og omegn · ingen bindingstid',
    knapp: { tekst: 'Få et uforpliktende tilbud', href: '/bli-utleier/start?tier=full_forvaltning' },
    lenke: { tekst: 'Slik fungerer forvaltning', href: '/forvaltning' },
    lilla: true,
  },
  {
    nr: '03', navn: 'Eiendomsselskap', stor: 'Tilpasset', liten: 'porteføljen', en: 'Alle bygg. Ett system. Teamet driver.',
    liste: ['Roller og godkjenning', 'Saker på tvers av alle bygg', 'Husleie, purring og regnskap', 'Full historikk per enhet', 'Onboarding av teamet'],
    notat: 'Pris etter antall enheter · demo først',
    knapp: { tekst: 'Book en demo', href: '/book-mote' },
    lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' },
  },
];

const SPORSMAL = [
  { q: 'Er det bindingstid?', a: 'Nei. Du kan si opp når du vil. Boligen, kontrakten og historikken ligger i DigiHome og blir med deg videre.' },
  { q: 'Hva koster full forvaltning?', a: null },
  { q: 'Når betaler jeg?', a: 'Når husleien kommer inn. Står boligen tom, koster den ingenting. Selvforvaltning er fem prosent av det som faktisk betales.' },
  { q: 'Finnes det skjulte kostnader?', a: 'Nei. Prosenten dekker systemet: annonse, kontrakt, husleie, depositum, saker og årsoppgave. Tjenester utover det — som profesjonell boligfoto eller hjelp til visning — avtales alltid på forhånd, med fast pris.' },
  { q: 'Kan jeg bytte fra selvforvaltning til full forvaltning?', a: 'Ja. Det er samme system under. Bytter du, tar vi over der du er — boligen, kontrakten og historikken blir med.' },
  { q: 'Hva med depositum?', a: 'Depositumskonto er inkludert. Kontrakten og depositumet settes opp sammen, og begge parter signerer med BankID.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Full forvaltning prises etter omfang, som en andel av husleien. Du får et konkret tilbud innen 24 timer etter en{' '}
    <Link href="/book-mote" className="underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]" style={{ color: '#15130F' }}>kort samtale</Link>
    {' '}— ingen oppstartskostnad, ingen bindingstid.
  </p>
);

function Niva({ n, inn, i }) {
  return (
    <li className="flex flex-col border-t pt-7 lg:pt-8" style={{ borderColor: HAIR, ...inn(1 + i, 20) }} data-testid={`v4p-niva-${n.nr}`}>
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] tabular-nums" style={{ color: n.lilla ? T.lilla : SVAK }}>{n.nr}</p>
        <p className="text-[14.5px] font-medium" style={{ color: T.ink }}>{n.navn}</p>
      </div>
      <p className="mt-8 text-[56px] sm:text-[64px] lg:text-[clamp(56px,4.6vw,76px)]" style={{ ...display, color: T.ink }}>
        {n.stor}{n.lilla ? <Punkt /> : null}
      </p>
      <p className="mt-1 text-[15px]" style={{ color: DIM }}>{n.liten}</p>
      <p className="mt-6 text-[17px] font-medium leading-[1.4]" style={{ color: T.ink }}>{n.en}</p>
      <ul className="mt-5 flex flex-col gap-2.5">
        {n.liste.map((l) => (
          <li key={l} className="flex items-start gap-2.5 text-[15px] leading-[1.45]" style={{ color: DIM }}>
            <span aria-hidden="true" className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: n.lilla ? T.lilla : 'rgba(21,19,15,0.35)' }} />
            {l}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-[13px] leading-[1.5]" style={{ color: SVAK }}>{n.notat}</p>
      <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3 pt-1 lg:mt-auto lg:pt-8">
        <Knapp href={n.knapp.href} variant={n.lilla ? 'lilla' : 'ink'} data-testid={`v4p-cta-${n.nr}`}>{n.knapp.tekst}</Knapp>
        <Lenke href={n.lenke.href}>{n.lenke.tekst}</Lenke>
      </div>
    </li>
  );
}

/* Én glidebryter: husleie → hva 5 % blir. Ingen boks — tallet er hovedpersonen. */
/* Display-fonten har bred hard mellomrom — bruk vanlig mellomrom + nowrap i store tall */
const pen = (n) => String(tall(n)).replace(/\u00a0/g, ' ');

function RegnUt({ inn }) {
  const [leie, setLeie] = useState(14500);
  const mnd = Math.round(leie * 0.05);
  const pct = ((leie - 5000) / (40000 - 5000)) * 100;
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12" data-testid="v4p-regn">
      <div className="lg:col-span-5">
        <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Regn ut</p>
        <h2 className="mt-4 text-[clamp(34px,3.6vw,60px)]" style={{ ...display, color: T.ink, ...inn(1) }}>Hva blir fem prosent for din bolig<Punkt /></h2>
        <p className="mt-5 max-w-[42ch] text-[16.5px] leading-[1.5]" style={{ color: DIM, ...inn(2) }}>Dra i husleien. Det du ser, er alt du betaler for selvforvaltning — kontrakt, husleie, saker og årsoppgave.</p>
      </div>
      <div className="lg:col-span-6 lg:col-start-7" style={inn(2)}>
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-[14px]" style={{ color: SVAK }}>Månedsleie</p>
          <p className="text-[22px] tabular-nums" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }} data-testid="v4p-leie"><span className="whitespace-nowrap">{pen(leie)} kr</span></p>
        </div>
        <div className="relative mt-4 h-8">
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgba(21,19,15,0.16)' }} />
          <div className="absolute left-0 top-1/2 h-px -translate-y-1/2" style={{ width: `${pct}%`, background: T.ink }} />
          <input
            type="range" min={5000} max={40000} step={500} value={leie} onChange={(e) => setLeie(Number(e.target.value))}
            aria-label="Månedsleie" className="v4-glider absolute inset-0 h-8 w-full cursor-pointer appearance-none bg-transparent" data-testid="v4p-glider"
          />
        </div>
        <div className="mt-8 flex flex-wrap items-end justify-between gap-6 border-t pt-6" style={{ borderColor: HAIR }}>
          <div>
            <p className="text-[14px]" style={{ color: SVAK }}>Selvforvaltning</p>
            <p className="mt-1 text-[clamp(44px,4vw,64px)] tabular-nums" style={{ ...display, color: T.ink }} data-testid="v4p-mnd"><span className="whitespace-nowrap">{pen(mnd)} kr</span><span className="ml-1 text-[18px]" style={{ color: SVAK }}>/mnd</span></p>
          </div>
          <p className="max-w-[26ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{tall(mnd * 12)} kr i året. Du sitter igjen med <span style={{ color: T.ink }}>{tall(leie - mnd)} kr</span> hver måned.</p>
        </div>
        <p className="mt-5 text-[13px]" style={{ color: SVAK }}>Vil du se full forvaltning og tillegg? <Link href="/priskalkulator" className="underline underline-offset-4 decoration-[#15130F]/25 hover:decoration-[#15130F]" style={{ color: T.ink }}>Prøv priskalkulatoren</Link></p>
      </div>
    </div>
  );
}

export default function PriserV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="priser-v4">
      <NavV4 />
      <main>
        <Avsloring threshold={0.05} testid="v4p-hero">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-20">
              <Innledning label="Priser" tittel={<>Betal for det du bruker. Ikke mer<Punkt /></>} ingress="Selvforvaltning koster fem prosent av husleien — ingen oppstart, ingen bindingstid. Full forvaltning prises etter omfang, og eiendomsselskaper får en avtale tilpasset porteføljen." maks="16ch" testid="v4p" />
              <ol className="mt-16 grid gap-12 lg:mt-24 lg:grid-cols-3 lg:gap-10" data-testid="v4p-nivaer">
                {NIVAER.map((n, i) => <Niva key={n.nr} n={n} inn={inn} i={i} />)}
              </ol>
            </div>
          )}
        </Avsloring>

        <Avsloring className="border-t" style={{ borderColor: HAIR, background: T.flate }} testid="v4p-regn-seksjon">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <RegnUt inn={inn} />
            </div>
          )}
        </Avsloring>

        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />
        <AvslutningSeksjon
          tittel="Start der du er"
          under="Selv eller med oss — samme system, ingen bindingstid."
          handling={{ knapp: { href: '/kom-i-gang', tekst: 'Kom i gang' }, lenke: { href: '/book-mote', tekst: 'Book en samtale' } }}
        />
      </main>
      <FooterV4 />
    </div>
  );
}
