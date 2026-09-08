'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { Knapp, Lenke, T, Utsatt, display } from '../motion';
import TillitStripe from '../TillitStripe';
import MeglerScene from './MeglerScene';
import SalgSeksjon from './SalgSeksjon';
import OppgjorSeksjon from './OppgjorSeksjon';
import InnsynSeksjon from '../forvaltning/InnsynSeksjon';
import KontrollSeksjon from '../bedrift/KontrollSeksjon';
import StegSeksjon from '../StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import SammenligningSeksjon from '../SammenligningSeksjon';

const ProduktSeksjon = dynamic(() => import('../produkt/ProduktSeksjon'), { ssr: false, loading: () => <div id="produkt" style={{ minHeight: 'var(--dh-h-produkt)', background: '#DCE1EB' }} aria-hidden="true" /> });

/* ---------------------------------------------------------------------------
   MeglerV4 — /utleiemeglere. For utleiemeglere og forvaltere som drifter
   boliger for andre.

   Historien: «Vi bygde dette for å forvalte selv. Nå er det deres.» Samme
   motor som eiendomsselskapene får — pluss laget som bare forvaltere
   trenger: salg (henvendelse → signert oppdrag), oppgjør (klientkonto →
   honorar → eier) og eierportal. Alt på siden finnes i produktet.

   Rekkefølge: hero (løftet + morgenen hos en forvalter) → logoene → Salg →
   produktfilmene (annonse · kontrakt · drift · økonomi) → Oppgjør →
   Eierportal → Kontroll (roller, grenser, historikk, BankID) → steg →
   spørsmål og svar (inkl. «konkurrerer dere med oss?») → avslutning.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.10)';
const SVAK = 'rgba(21,19,15,0.5)';

const BEVIS = [
  { t: 'Klientkonto og oppgjør innebygd', d: 'Husleie inn, honorar, utbetaling — per eier.' },
  { t: 'Eierportal til hver eier', d: 'Hver eier ser sitt. Godkjenner sitt.' },
  { t: 'Bevist i egen drift', d: 'DigiHome forvalter selv på samme system.' },
];

const STEG = [
  { nr: '1', t: 'Demo', d: '30 minutter med deres eiere og boliger som eksempel. Dere ser morgenen deres i systemet — og salget fra henvendelse til signatur.' },
  { nr: '2', t: 'Oppsett', d: 'Selskapet, eierne, oppdragsavtalene og løpende leieforhold settes opp sammen med dere. Honorarsats per eier. Regnskapssystemet kobles.' },
  { nr: '3', t: 'Roller og grenser', d: 'Hvem ser hva, hvem godkjenner hva, hva går til eier. Hver handling logges med hvem og når.' },
  { nr: '4', t: 'Første oppgjør', d: 'Husleien krevs inn, honoraret trekkes, eierne får utbetaling og rapport. Fra da av går rutinen — og nye henvendelser lander i CRM.' },
];

/* Én dag, tre stoler: forvalteren, den som gjør oppgjøret, og eieren. Hva hver av dem gjør — og hva systemet gjør. */
const ROLLER = [['forvalter', 'Forvalter'], ['okonomi', 'Oppgjør'], ['eier', 'Eier']];
const HENV = 'Lager lead med boligdata og leieestimat, legger tilbudsutkast klart';
const HUSLEIE = 'Krever inn på klientkonto, avstemmer, purrer de som mangler';
const SAK = 'Oppretter sak, henter pris, sender godkjenning til eier, følger opp håndverker';
const KONTRAKT = 'Kontrakt fra malen, BankID, depositum, arkiv på enheten';
const OPPGJOR = 'Trekker honorar, utbetaler hver eier, lager oppgjørsrapport per bolig';
const RAPPORT = 'Bilag til regnskapet, oppgjør til eier, alt logget';
const DAGEN = [
  { t: 'Ny henvendelse fra Fjellveien 12', forvalter: ['Leser utkastet, justerer, trykker send', HENV], okonomi: [null, HENV], eier: ['Åpner tilbudet, signerer med BankID', HENV] },
  { t: 'Husleie, den 1.', forvalter: ['Ser status — 3 av 214 mangler', HUSLEIE], okonomi: ['Ser klientkontoen avstemt', HUSLEIE], eier: ['Ser at husleien er kommet', HUSLEIE] },
  { t: 'Varmtvann borte i Strandgaten 12', forvalter: ['Velger rørlegger — saken er adressert til deg', SAK], okonomi: ['Ser kostnaden når eier har godkjent', SAK], eier: ['Godkjenner 6 200 kr i appen', SAK] },
  { t: 'Ny leietaker i Løkkeveien 14', forvalter: ['Godkjenner anbefalingen', KONTRAKT], okonomi: ['Ser depositum og første husleie', KONTRAKT], eier: ['Sier ja til leietakeren', KONTRAKT] },
  { t: 'Oppgjør, den 3.', forvalter: [null, OPPGJOR], okonomi: ['Godkjenner utbetalingskjøringen', OPPGJOR], eier: ['Får utbetaling og rapport', OPPGJOR] },
  { t: 'Månedsslutt', forvalter: ['Leser ukesrapporten', RAPPORT], okonomi: ['Sender bilag til regnskapsfører', RAPPORT], eier: [null, RAPPORT] },
];
const DAGEN_SUM = {
  forvalter: 'Du tar valgene som krever et menneske — hvem som flytter inn, hvilken håndverker, når noe må eskaleres. Rutinen går.',
  okonomi: 'Du godkjenner utbetalingskjøringen og sender bilag. Innkreving, avstemming, honorar og rapporter går automatisk.',
  eier: 'Eieren ser sitt, godkjenner sitt — og slipper å ringe.',
};

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  { q: 'Hva koster det?', a: null },
  { q: 'Konkurrerer DigiHome med oss?', a: 'DigiHome forvalter egne kunders boliger i Bergen på dette systemet — det er derfor det fungerer. Deres data er deres: ingen deling av eiere, henvendelser eller priser, og vi selger ikke til eierne dere har avtale med. Det står i avtalen.' },
  { q: 'Hvordan kommer henvendelsene inn?', a: 'Fra skjema og landingssider dere publiserer fra systemet, fra telefon og e-post dere registrerer, eller ved import. Hvert lead får boligdata, leieestimat og et tilbudsutkast med deres honorar.' },
  { q: 'Kan vi ta med eksisterende eiere og leieforhold?', a: 'Ja. Eiere, oppdragsavtaler og løpende leieforhold settes opp sammen med dere i oppsettet — med kontrakter og historikk som de er.' },
  { q: 'Hvordan håndteres eiernes penger?', a: 'Husleien går inn på klientkonto, adskilt fra deres egne midler. Honoraret trekkes etter avtalen med hver eier, resten utbetales, og eieren får oppgjørsrapport per bolig og årsoppgave.' },
  { q: 'Hva ser eierne våre?', a: 'Sine egne boliger: husleie, oppgjør, saker, kontrakter og dokumenter — ikke porteføljen. Kostnader over grensen dere setter per eier går til eieren for godkjenning.' },
  { q: 'Hvordan signeres oppdragsavtaler og kontrakter?', a: 'Med BankID gjennom Posten signering (SMS-signering som alternativ). Dokumentene arkiveres på eieren og enheten, med full historikk.' },
  { q: 'Hva med regnskapet?', a: 'Husleie, kostnader, honorar og utbetalinger ligger per eier og bolig, og går til PowerOffice, Tripletex eller Fiken.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Plattformen prises etter <strong style={{ color: '#15130F', fontWeight: 500 }}>antall leieforhold under forvaltning</strong> og modulene dere bruker.{' '}
    <Link href="/book-mote" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-demo">Book en demo</Link>, så får dere et konkret forslag samme uke — med deres portefølje som eksempel.
  </p>
);

export default function MeglerV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="megler-v4">
      <NavV4 />
      <main>
        {/* ── 1. Hero ── */}
        <section className="relative overflow-hidden" style={{ background: T.canvas }} data-testid="v4m-hero">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 72% 50%, rgba(212,150,255,0.12) 0%, rgba(212,150,255,0.04) 45%, rgba(212,150,255,0) 72%)' }} />
          <div className="relative mx-auto w-full max-w-[1440px] px-5 pb-14 pt-8 sm:px-8 sm:pt-10 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-20 lg:pt-12">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-10 xl:gap-14">
              <div className="min-w-0 lg:col-span-5">
                <p className="dh-cover-inn text-[14px] font-medium sm:text-[14.5px]" style={{ color: SVAK }} data-testid="v4m-label">For utleiemeglere og forvaltere</p>
                <h1 className="dh-cover-inn mt-4 text-[50px] sm:text-[68px] lg:text-[clamp(56px,4.5vw,82px)]" style={{ ...display, color: T.ink, animationDelay: '.04s' }} data-testid="v4m-h1">
                  Hundre eiere.<br />Én rolig morgen<span style={{ color: T.lilla, marginLeft: '0.03em' }}>.</span>
                </h1>
                <p className="dh-cover-inn mt-6 max-w-[38ch] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.7)', animationDelay: '.08s' }} data-testid="v4m-ingress">
                  Vi bygde systemet for å forvalte egne kunders boliger. Nå er det deres: fra første henvendelse til oppgjøret står på eiers konto — med klientkonto, honorar og eierportal innebygd.
                </p>
                <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
                  <Knapp href="/book-mote" data-testid="v4m-cta">Book en demo</Knapp>
                  <Lenke href="#salg" data-testid="v4m-cta-salg">Se salget fra henvendelse til signatur</Lenke>
                </div>
                <ul className="dh-cover-inn mt-10 grid grid-cols-3 gap-x-5 border-t pt-5 sm:gap-x-8" style={{ borderColor: HAIR, animationDelay: '.2s' }} data-testid="v4m-bevis">
                  {BEVIS.map((b) => (
                    <li key={b.t} className="min-w-0">
                      <p className="text-[13.5px] font-medium leading-[1.35] sm:text-[14.5px]" style={{ color: T.ink }}>{b.t}</p>
                      <p className="mt-1 hidden text-[13px] leading-[1.45] sm:block" style={{ color: SVAK }}>{b.d}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="dh-cover-inn min-w-0 lg:col-span-7" style={{ animationDelay: '.12s' }} data-testid="v4m-hero-scene">
                <MeglerScene />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Logoene ── */}
        <TillitStripe />

        {/* ── 3. Salg ── */}
        <SalgSeksjon />

        {/* ── 4. Produktfilmene: dagen i drift, kapittel for kapittel ── */}
        <Utsatt id="produkt" minHeight="var(--dh-h-produkt)" className="bg-[#DCE1EB]">
          <ProduktSeksjon kapitler={['annonse', 'kontrakt', 'drift', 'okonomi']} />
        </Utsatt>

        {/* ── 5. Én dag, tre stoler ── */}
        <SammenligningSeksjon
          tittel={['Én dag.', 'Tre stoler.']}
          under="Seks ting som skjer i en forvalters uke — sett fra stolen du sitter i."
          valg={ROLLER}
          hendelser={DAGEN}
          sum={DAGEN_SUM}
          kolonner={['Hendelse', 'Du', 'Systemet']}
          testid="v4m"
        />

        {/* ── 6. Oppgjør ── */}
        <OppgjorSeksjon />

        {/* ── 6. Eierportalen ── */}
        <InnsynSeksjon
          id="eierportal"
          label="Eierportal"
          tittel="Eierne deres ser det de skal se"
          ingress="Hver eier har sin egen innlogging: husleie, oppgjør, saker og dokumenter for sine boliger — ikke porteføljen. Kostnader over eierens grense går til eieren for godkjenning, ikke til innboksen deres."
          punkter={['Oppgjørsrapport per bolig og årsoppgave — klar til eierens regnskapsfører', 'Godkjenning hos eier med én melding og ett valg', 'Færre telefoner: eieren finner svaret selv']}
          flateLabel="Eierens oversikt · Kari Moen · mai"
          bunn="Ingenting venter på eieren"
          testid="v4m-eierportal"
        />

        {/* ── 7. Kontroll: roller, grenser, historikk, BankID ── */}
        <KontrollSeksjon />

        {/* ── 8. Slik kommer dere i gang ── */}
        <StegSeksjon
          tittel={['Slik kommer', 'dere i gang.']}
          under="Fra demo til første oppgjør på noen uker — med deres eiere, ikke en mal."
          steg={STEG}
          person={null}
          testid="v4m"
        />

        {/* ── 9. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />

        {/* ── 10. Avslutning ── */}
        <AvslutningSeksjon
          tittel="Hundre eiere. Én rolig morgen"
          under="Book en demo — 30 minutter, med deres eiere og boliger som eksempel."
          handling={{ knapp: { tekst: 'Book en demo', href: '/book-mote' }, lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' } }}
          steg={[
            ['1', 'Demo med deres portefølje', 'Dere ser morgenen deres — og salget — i systemet.'],
            ['2', 'Eiere, avtaler og roller', 'Oppdragsavtaler, honorarsats per eier, hvem godkjenner hva.'],
            ['3', 'Første oppgjør', 'Husleie inn, honorar trukket, eierne betalt og rapportert. Rutinen går.'],
          ]}
        />
      </main>
      <Footer />
    </div>
  );
}
