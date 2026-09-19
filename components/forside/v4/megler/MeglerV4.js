'use client';

import React from 'react';
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
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import SammenligningSeksjon from '../SammenligningSeksjon';
import MerkevareSeksjon from './MerkevareSeksjon';
import RegnSeksjon from './RegnSeksjon';
import OvergangSeksjon from './OvergangSeksjon';
import PartnerSeksjon from './PartnerSeksjon';
import DemoSkjema from './DemoSkjema';

const ProduktSeksjon = dynamic(() => import('../produkt/ProduktSeksjon'), { ssr: false, loading: () => <div id="produkt" style={{ minHeight: 'var(--dh-h-produkt)', background: '#DCE1EB' }} aria-hidden="true" /> });

/* ---------------------------------------------------------------------------
   MeglerV4 — /utleiemeglere. For utleiemeglere og forvaltere som drifter
   boliger for andre.

   Historien: «Vi bygde dette for å forvalte selv. Nå er det deres.» Samme
   motor som eiendomsselskapene får — pluss laget som bare forvaltere
   trenger: salg (henvendelse → signert oppdrag), oppgjør (klientkonto →
   honorar → eier) og eierportal. Alt på siden finnes i produktet.

   Prinsipp for teksten: hver ting sies ÉN gang, der den hører hjemme.
   Oppgjøret forklares i Oppgjør (ikke i hero, steg og avslutning også).
   Én «kom i gang»-plan (Overgang), ikke fire. Kontroll har egne
   megler-tekster (roller per eier, ikke «driftssjef»).

   Rekkefølge: hero → logoene → Salg → produktfilmene → Én dag, tre stoler →
   Oppgjør → Eierportal → Merkevare → Kontroll → Regn på det → Kom i gang
   (tre uker) → Partnerprogram → Demo (#demo) → spørsmål og svar → avslutning.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.10)';
const SVAK = 'rgba(21,19,15,0.5)';

const BEVIS = [
  { t: 'Klientkonto og honorar innebygd', d: 'Husleie inn, honorar ut, én utbetaling per eier.' },
  { t: 'Egen portal for hver eier', d: 'Eieren ser sine boliger og godkjenner selv.' },
  { t: 'I daglig bruk hos oss', d: 'Vi forvalter egne kunders boliger på samme system.' },
];

/* Kontroll — megler-tekster (komponenten er delt med bedriftssiden) */
const KONTROLL = {
  tittel: ['Dere setter reglene'],
  ingress: 'Hvem hos dere som kan godkjenne hva, hvilke beløp som skal til eieren, og hvem som ser hvilke eiere. Alt som gjøres, lagres med navn og tidspunkt.',
  punkter: [
    { t: 'Roller og rettigheter', d: 'Hver person hos dere ser og gjør bare det rollen tillater, og bare for de eierne de har ansvar for.', eks: ['Forvalter', 'godkjenner tilbud og kontrakt'] },
    { t: 'Grenser per eier', d: 'Kostnader over grensen dere har satt for en eier, sendes til eieren for godkjenning. Under grensen går det av seg selv.', eks: ['6 200 kr', 'over grensen → eieren godkjenner i appen'] },
    { t: 'Full historikk', d: 'Hver handling lagres med hvem og når, på hver bolig, hver sak og hver kontrakt. Revisjon og overlevering blir enkelt.', eks: ['09:40', 'Jonas Haugland godkjente · Strandgaten 12'] },
    { t: 'BankID gjennom Posten', d: 'Oppdragsavtaler og leiekontrakter signeres av identifiserte parter og arkiveres på eier og bolig.', eks: ['Signert 21:05', 'Kari Moen · oppdragsavtale Fjellveien 12'] },
  ],
  bunn: 'Rapport per eier og bolig går til regnskapssystemet dere bruker.',
};

/* Én dag, tre stoler: forvalteren, den som gjør oppgjøret, og eieren. Hva hver av dem gjør, og hva systemet gjør. */
const ROLLER = [['forvalter', 'Forvalter'], ['okonomi', 'Oppgjør'], ['eier', 'Eier']];
const HENV = 'Lager henvendelse med boligdata og leieestimat, legger tilbudsutkast klart';
const HUSLEIE = 'Krever inn på klientkonto, avstemmer, purrer de som mangler';
const SAK = 'Oppretter sak, henter pris, sender godkjenning til eier, følger opp håndverker';
const KONTRAKT = 'Kontrakt fra malen, BankID, depositum, arkiv på boligen';
const OPPGJOR = 'Trekker honorar, utbetaler hver eier, lager oppgjørsrapport per bolig';
const RAPPORT = 'Bilag til regnskapet, oppgjør til eier, alt logget';
const DAGEN = [
  { t: 'Ny henvendelse fra Fjellveien 12', forvalter: ['Leser utkastet, justerer, trykker send', HENV], okonomi: [null, HENV], eier: ['Åpner tilbudet, signerer med BankID', HENV] },
  { t: 'Husleie, den 1.', forvalter: ['Ser at 3 av 214 mangler', HUSLEIE], okonomi: ['Ser at klientkontoen er avstemt', HUSLEIE], eier: ['Ser at husleien er kommet', HUSLEIE] },
  { t: 'Varmtvann borte i Strandgaten 12', forvalter: ['Velger rørlegger, saken er sendt til deg', SAK], okonomi: ['Ser kostnaden når eier har godkjent', SAK], eier: ['Godkjenner 6 200 kr i appen', SAK] },
  { t: 'Ny leietaker i Løkkeveien 14', forvalter: ['Godkjenner anbefalingen', KONTRAKT], okonomi: ['Ser depositum og første husleie', KONTRAKT], eier: ['Sier ja til leietakeren', KONTRAKT] },
  { t: 'Oppgjør, den 3.', forvalter: [null, OPPGJOR], okonomi: ['Godkjenner utbetalingene', OPPGJOR], eier: ['Får utbetaling og rapport', OPPGJOR] },
  { t: 'Månedsslutt', forvalter: ['Leser ukesrapporten', RAPPORT], okonomi: ['Sender bilag til regnskapsfører', RAPPORT], eier: [null, RAPPORT] },
];
const DAGEN_SUM = {
  forvalter: 'Du tar de valgene som krever et menneske: hvem som skal flytte inn, hvilken håndverker som skal brukes, og når noe må løftes videre. Resten går av seg selv.',
  okonomi: 'Du godkjenner utbetalingene og sender bilag. Innkreving, avstemming, honorar og rapporter skjer automatisk.',
  eier: 'Eieren ser sine boliger, godkjenner det som trenger godkjenning, og slipper å ringe.',
};

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  { q: 'Hva koster det?', a: null },
  { q: 'Konkurrerer DigiHome med oss?', a: 'DigiHome forvalter egne kunders boliger i Bergen sentrum. Henvendelser utenfor sentrum, eller som vi ikke har kapasitet til, sender vi til partnere som bruker systemet. Vi deler ikke eiere, henvendelser eller priser med andre, og vi selger ikke til eiere dere har avtale med. Det står i avtalen.' },
  { q: 'Hvor lang tid tar overgangen?', a: 'Vanligvis tre uker: oppsett, parallell drift og første oppgjør. Kontrakter og historikk følger med slik de er, og dere velger om vi tar eier for eier eller hele porteføljen på én gang.' },
  { q: 'Kan vi bruke vår egen merkevare?', a: 'Ja. Tilbudet til eieren sendes med deres logo og farger, og landingssidene dere publiserer fra systemet er deres.' },
  { q: 'Hva er partnerprogrammet?', a: 'Fem byråer i 2025 får henvendelser fra digihome.no i sitt område. Kryss av i skjemaet, så tar vi det opp i demoen.' },
  { q: 'Hvordan kommer henvendelsene inn?', a: 'Fra skjemaer og landingssider dere publiserer fra systemet, fra telefon og e-post dere registrerer selv, eller ved import. Hver henvendelse får boligdata, leieestimat og et tilbudsutkast med deres honorar.' },
  { q: 'Hvordan håndteres eiernes penger?', a: 'Husleien går inn på klientkonto, adskilt fra deres egne midler. Honoraret trekkes etter avtalen med hver eier, resten utbetales, og eieren får oppgjørsrapport per bolig og årsoppgave.' },
  { q: 'Hva ser eierne våre?', a: 'Bare sine egne boliger: husleie, oppgjør, saker, kontrakter og dokumenter. Kostnader over grensen dere har satt for eieren, sendes til eieren for godkjenning.' },
  { q: 'Hvordan signeres oppdragsavtaler og kontrakter?', a: 'Med BankID gjennom Posten signering, eller med SMS-signering. Dokumentene arkiveres på eieren og boligen, med full historikk.' },
  { q: 'Hva med regnskapet?', a: 'Husleie, kostnader, honorar og utbetalinger ligger per eier og bolig, og går til PowerOffice, Tripletex eller Fiken.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Prisen avhenger av <strong style={{ color: '#15130F', fontWeight: 500 }}>antall leieforhold under forvaltning</strong> og hvilke moduler dere bruker.{' '}
    <a href="#regn" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-regn">Regn på hva det manuelle arbeidet koster dere i dag</a>, og{' '}
    <a href="#demo" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-demo">book en demo</a>. Da får dere et konkret pristilbud i løpet av uken, regnet på deres egen portefølje.
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
                  DigiHome er systemet vi bruker når vi forvalter boliger for egne kunder i Bergen. Nå kan utleiemeglere og forvaltere bruke det samme: salg, kontrakter, husleie, oppgjør og eierportal i ett system, med klientkonto og honorar innebygd.
                </p>
                <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
                  <Knapp href="#demo" data-testid="v4m-cta">Book en demo</Knapp>
                  <Lenke href="#salg" data-testid="v4m-cta-salg">Se hvordan et oppdrag kommer inn</Lenke>
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
        <TillitStripe tekst="Koblet til tjenestene dere allerede bruker." />

        {/* ── 3. Salg ── */}
        <SalgSeksjon />

        {/* ── 4. Produktfilmene: dagen i drift, kapittel for kapittel ── */}
        <Utsatt id="produkt" minHeight="var(--dh-h-produkt)" className="bg-[#DCE1EB]">
          <ProduktSeksjon kapitler={['annonse', 'kontrakt', 'drift', 'okonomi']} />
        </Utsatt>

        {/* ── 5. Én dag, tre stoler ── */}
        <SammenligningSeksjon
          tittel={['Én dag.', 'Tre stoler.']}
          under="Seks ting som skjer i løpet av en uke hos en forvalter, sett fra den stolen du sitter i."
          valg={ROLLER}
          hendelser={DAGEN}
          sum={DAGEN_SUM}
          kolonner={['Hendelse', 'Du', 'Systemet']}
          testid="v4m"
        />

        {/* ── 6. Oppgjør ── */}
        <OppgjorSeksjon />

        {/* ── 7. Eierportalen ── */}
        <InnsynSeksjon
          id="eierportal"
          label="Eierportal"
          tittel="Eierne ser sine egne boliger"
          ingress="Hver eier logger inn og ser husleie, oppgjør, saker og dokumenter for sine egne boliger, og bare dem. Kostnader over grensen dere har satt, sendes til eieren for godkjenning i stedet for til innboksen deres."
          punkter={['Oppgjørsrapport per bolig og årsoppgave som regnskapsføreren kan bruke direkte', 'Eieren godkjenner med én melding og ett trykk', 'Færre telefoner, fordi eieren finner svaret selv']}
          flateLabel="Eierens oversikt · Kari Moen · mai"
          bunn="Ingenting venter på eieren"
          testid="v4m-eierportal"
        />

        {/* ── 8. Merkevare: tilbudet i byråets drakt ── */}
        <MerkevareSeksjon />

        {/* ── 9. Kontroll: roller per eier, grenser, historikk, BankID (megler-tekster) ── */}
        <KontrollSeksjon {...KONTROLL} />

        {/* ── 10. Regn på det: ROI på deres egne anslag → #demo ── */}
        <RegnSeksjon />

        {/* ── 11. Kom i gang: tre uker fra demo til første oppgjør ── */}
        <OvergangSeksjon />

        {/* ── 12. Partnerprogram 2025 ── */}
        <PartnerSeksjon />

        {/* ── 13. Demo: inline skjema (#demo) ── */}
        <DemoSkjema />

        {/* ── 14. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} intro="Korte svar på det meglere spør oss om først. Finner dere ikke svaret, ta en prat med oss." />

        {/* ── 15. Avslutning ── */}
        <AvslutningSeksjon
          tittel="Hundre eiere. Én rolig morgen"
          under="Book en demo på 30 minutter, eller registrer selskapet og kom i gang på egen hånd."
          handling={{ knapp: { tekst: 'Book en demo', href: '#demo' }, lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' } }}
          steg={null}
        />
      </main>
      <Footer />
    </div>
  );
}
