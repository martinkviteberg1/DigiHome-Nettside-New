'use client';

import React, { useMemo, useRef, useState } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   FunksjonerSeksjon — «Alt systemet gjør.» (#funksjoner)

   Spesifikasjonsarket. Samme elleve stopp som «Hele løpet», med korte
   brikker under hvert: stikkord, ikke setninger. Ett søkefelt øverst demper
   alt som ikke treffer, så megleren finner svaret på sitt ja/nei-spørsmål
   uten å lese alt.

   Innholdet er hentet fra produktrepoet (backend/routes, services), ikke fra
   markedstekst. Brikker merket `kommer` finnes ikke i produktet i dag og
   vises med stiplet kant. Alt annet kan vises i en demo.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* [stopp, [brikker]] — en brikke er en streng, eller { t, kommer: true } */
const STOPP = [
  ['Henvendelse', ['Salgspipeline med stadier', 'Kontaktskjema med e-postverifisering', 'Boligdata fra Kartverket', 'Eieroppslag fra Infotorg', 'Leieestimat', 'Befaring med Outlook-synk', 'Notater og oppfølging per lead']],
  ['Tilbud', ['Tilbud med versjoner', 'Lest-status', 'Aksept med BankID', 'Manuell aksept', 'Bytte av signeringsmetode', { t: 'Deres logo og farger', kommer: true }]],
  ['Oppdrag', ['Forvaltningsavtale med BankID', 'Tillegg per ny bolig', 'Onboarding av eier og bolig', 'Bilag ved bytte av modell', 'Selvforvaltning eller full forvaltning per bolig']],
  ['Annonse', ['Publisering på FINN', 'Import fra FINN', 'Annonsetekst skrevet av AI', 'Fotoforbedring', 'Egen landingsside per bolig', 'Chat i annonsen', 'Airbnb, Booking og VRBO via Channex', 'Guesty']],
  ['Visning', ['Visningsbooking, tre typer', 'Legitimering med BankID', 'Kredittsjekk med samtykke', 'Søknader samlet per bolig', 'Interessenter fra FINN og egen side']],
  ['Kontrakt', ['Kontraktbygger', 'BankID via Idura', 'Posten signering', 'SMS-signering', 'Depositumskonto hos Keyhole', 'Lea Bank eller Tryg garanti', 'KPI-regulering', 'Tillegg og endringer']],
  ['Innflytting', ['Overtakelsesprotokoll', 'Rom for rom med bilder', 'Nøkler', 'Strømmåler og leverandør', 'Radon', 'PDF signert av begge']],
  ['Husleie', ['Egen fakturamotor', 'Faktura til leietaker', 'Husleie inn på klientkonto', 'Honorar trukket per eier', 'Utbetaling til eier', 'Påminnelse på push og e-post', 'Purring', 'Bro til PowerOffice']],
  ['Saker', ['Sak fra melding', 'AI-kategorisering og SLA', 'Status fra åpen til løst', 'Leverandørregister med priser', 'Venter på leverandør eller godkjenning', 'Eiergodkjenning over grense', 'Bilder tolket av AI', 'Kvitteringer lest av AI']],
  ['Oppgjør', ['Oppgjørsrapport per eier', 'Honorar etter avtale', 'PowerOffice Go', 'Fiken', 'Bilag per eier og bolig', { t: 'Tripletex', kommer: true }]],
  ['Plattform', ['Eierportal', 'Leietakerportal', 'Roller og rettigheter', 'Full logg', 'Driftssenter og oversikt', 'Mobilapp med push', 'Microsoft 365', 'Assistent i chat med leietaker, eier og interessent', 'Kunnskap, feedback og analyse for assistenten', 'Nyhetsbrev']],
];

const normal = (s) => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const tekst = (b) => (typeof b === 'string' ? b : b.t);

function Brikke({ b, treff }) {
  const kommer = typeof b !== 'string' && b.kommer;
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] leading-[1.3] transition-opacity duration-300" style={{ background: kommer ? 'transparent' : PAPIR, color: kommer ? SVAK : T.ink, boxShadow: kommer ? 'none' : `inset 0 0 0 1px ${HAIR}`, border: kommer ? '1px dashed rgba(21,19,15,0.28)' : 'none', opacity: treff ? 1 : 0.22 }} data-treff={treff ? '1' : '0'}>
      {tekst(b)}{kommer ? <span className="text-[11px] uppercase tracking-[0.06em]" style={{ color: SVAK }}>kommer</span> : null}
    </li>
  );
}

export default function FunksjonerSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.1);
  const [q, setQ] = useState('');
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });

  const n = normal(q.trim());
  const alle = useMemo(() => STOPP.reduce((a, [, b]) => a + b.length, 0), []);
  const treffer = (b, stopp) => !n || normal(tekst(b)).includes(n) || normal(stopp).includes(n);
  const antall = n ? STOPP.reduce((a, [s, b]) => a + b.filter((x) => treffer(x, s)).length, 0) : alle;

  return (
    <section id="funksjoner" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-funksjoner">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-12">
          <div className="lg:col-span-7">
            <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Funksjoner</p>
            <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-funksjoner-tittel">
              Alt systemet gjør<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h2>
          </div>
          <p className="max-w-[46ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-5 lg:pb-2" style={{ color: DIM, ...inn(2) }}>
            Elleve stopp, {alle} funksjoner, ingen forklaringer. Søk etter det dere lurer på, eller bla.
          </p>
        </div>

        {/* Søk */}
        <div className="mt-10 flex flex-wrap items-center gap-4 lg:mt-14" style={inn(3)}>
          <label className="relative block w-full max-w-[520px]">
            <span className="sr-only">Søk i funksjoner</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2" style={{ color: SVAK }}>
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Søk i alt systemet gjør, for eksempel KPI, Keyhole eller purring"
              className="h-12 w-full rounded-full pl-11 pr-5 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(212,150,255,0.7)]"
              style={{ background: PAPIR, color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }}
              data-testid="v4m-funksjoner-sok"
            />
          </label>
          <p className="text-[13.5px] tabular-nums" style={{ color: SVAK }} data-testid="v4m-funksjoner-antall" aria-live="polite">
            {n ? `${antall} av ${alle} treffer` : `${alle} funksjoner`}
          </p>
        </div>

        {/* Arket */}
        <ol className="mt-10 border-t lg:mt-12" style={{ borderColor: HAIR, ...inn(4, 18) }} data-testid="v4m-funksjoner-ark">
          {STOPP.map(([stopp, brikker], i) => {
            const noen = brikker.some((b) => treffer(b, stopp));
            return (
              <li key={stopp} className="grid gap-3 border-b py-6 transition-opacity duration-300 lg:grid-cols-12 lg:gap-8 lg:py-7" style={{ borderColor: HAIR, opacity: noen ? 1 : 0.35 }} data-testid={`v4m-funksjoner-${i}`}>
                <div className="flex items-baseline gap-3 lg:col-span-3 lg:block">
                  <span className="text-[12.5px] tabular-nums" style={{ color: T.lilla }}>{String(i + 1).padStart(2, '0')}</span>
                  <h3 className="text-[22px] lg:mt-1 lg:text-[26px]" style={{ ...display, color: T.ink, lineHeight: 1.05 }}>{stopp}</h3>
                </div>
                <ul className="flex flex-wrap gap-2 lg:col-span-9">
                  {brikker.map((b) => <Brikke key={tekst(b)} b={b} treff={treffer(b, stopp)} />)}
                </ul>
              </li>
            );
          })}
        </ol>

        <p className="mt-8 max-w-[64ch] text-[14.5px] leading-[1.55]" style={{ color: SVAK }} data-testid="v4m-funksjoner-note">
          Alt uten «kommer» finnes i systemet i dag og kan vises i en demo. Stiplet betyr at det er på vei.
        </p>
      </div>
    </section>
  );
}
