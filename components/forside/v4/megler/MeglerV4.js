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
import StegSeksjon from '../StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import SammenligningSeksjon from '../SammenligningSeksjon';
import TrygghetSeksjon from './TrygghetSeksjon';
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

   Rekkefølge: hero (løftet + morgenen hos en forvalter) → logoene → Salg →
   produktfilmene (annonse · kontrakt · drift · økonomi) → Trygghet (andres
   penger: klientkonto, BankID, rapport, regnskap) → Én dag, tre stoler →
   Oppgjør → Eierportal → Merkevare (tilbudet i byråets drakt) → Kontroll →
   Regn på det (ROI på deres egne anslag) → Overgang (uker, ikke måneder) →
   Partnerprogram → steg → Demo (inline skjema, #demo) → spørsmål og svar →
   avslutning. Alle «Book en demo»-handlinger peker på #demo.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.10)';
const SVAK = 'rgba(21,19,15,0.5)';

const BEVIS = [
  { t: 'Klientkonto og oppgjør', d: 'Husleie inn, honorar ut, én utbetaling per eier.' },
  { t: 'Egen portal for hver eier', d: 'Eieren ser sine boliger og godkjenner selv.' },
  { t: 'Vi bruker det selv', d: 'DigiHome forvalter egne kunders boliger på samme system.' },
];

const STEG = [
  { nr: '1', t: 'Demo', d: '30 minutter med deres egne eiere og boliger som eksempel. Dere ser hvordan en vanlig morgen ser ut i systemet, og hvordan salget går fra henvendelse til signatur.' },
  { nr: '2', t: 'Oppsett', d: 'Vi legger inn selskapet, eierne, oppdragsavtalene og løpende leieforhold sammen med dere. Honorarsats settes per eier, og regnskapssystemet kobles til.' },
  { nr: '3', t: 'Roller og grenser', d: 'Dere bestemmer hvem som ser hva, hvem som godkjenner hva, og hva som skal til eieren. Alt som gjøres, lagres med navn og tidspunkt.' },
  { nr: '4', t: 'Første oppgjør', d: 'Husleien kreves inn, honoraret trekkes, og eierne får utbetaling og rapport. Nye henvendelser går rett inn i salgsoversikten.' },
];

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
  { q: 'Hvor lang tid tar overgangen?', a: 'Vanligvis tre uker. Første uke legger vi inn eiere, avtaler og leieforhold, andre uke kjører dere begge systemene parallelt, og tredje uke kjøres første oppgjør i DigiHome. Kontrakter og historikk følger med slik de er. Dere velger om vi tar eier for eier eller hele porteføljen på én gang.' },
  { q: 'Kan vi bruke vår egen merkevare?', a: 'Ja. Tilbudet til eieren sendes med deres logo og farger, og landingssidene dere publiserer fra systemet er deres. Eieren ser dere som avsender.' },
  { q: 'Hva er partnerprogrammet?', a: 'Vi tar inn fem byråer i 2025. Partnere får henvendelser fra digihome.no i sitt område, med boligdata, leieestimat og tilbudsutkast ferdig, og de er de første vi spør når vi prioriterer ny funksjonalitet. Kryss av for partnerprogrammet i skjemaet, så tar vi det opp i demoen.' },
  { q: 'Hvordan kommer henvendelsene inn?', a: 'Fra skjemaer og landingssider dere publiserer fra systemet, fra telefon og e-post dere registrerer selv, eller ved import. Hver henvendelse får boligdata, leieestimat og et tilbudsutkast med deres honorar.' },
  { q: 'Kan vi ta med eksisterende eiere og leieforhold?', a: 'Ja. Eiere, oppdragsavtaler og løpende leieforhold legges inn sammen med dere, med kontrakter og historikk slik de er.' },
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
                  Vi laget DigiHome for å forvalte boliger for egne kunder, og nå kan dere bruke det samme. Husleien kommer inn på klientkonto, honoraret trekkes, og hver eier får utbetaling og rapport hver måned. Ingen hos dere trenger å gjøre det for hånd.
                </p>
                <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
                  <Knapp href="#demo" data-testid="v4m-cta">Book en demo</Knapp>
                  <Lenke href="#salg" data-testid="v4m-cta-salg">Se hvordan salget fungerer</Lenke>
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

        {/* ── 5. Trygghet: andres penger — klientkonto, BankID, rapport, regnskap ── */}
        <TrygghetSeksjon />

        {/* ── 6. Én dag, tre stoler ── */}
        <SammenligningSeksjon
          tittel={['Én dag.', 'Tre stoler.']}
          under="Seks ting som skjer i løpet av en uke hos en forvalter, sett fra den stolen du sitter i."
          valg={ROLLER}
          hendelser={DAGEN}
          sum={DAGEN_SUM}
          kolonner={['Hendelse', 'Du', 'Systemet']}
          testid="v4m"
        />

        {/* ── 7. Oppgjør ── */}
        <OppgjorSeksjon />

        {/* ── 8. Eierportalen ── */}
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

        {/* ── 9. Merkevare: tilbudet i byråets drakt ── */}
        <MerkevareSeksjon />

        {/* ── 10. Kontroll: roller, grenser, historikk, BankID ── */}
        <KontrollSeksjon />

        {/* ── 11. Regn på det: ROI på deres egne anslag → #demo ── */}
        <RegnSeksjon />

        {/* ── 12. Overgang: uker, ikke måneder ── */}
        <OvergangSeksjon />

        {/* ── 13. Partnerprogram 2025 ── */}
        <PartnerSeksjon />

        {/* ── 14. Slik kommer dere i gang ── */}
        <StegSeksjon
          tittel={['Slik kommer', 'dere i gang.']}
          under="Fra demo til første oppgjør på noen uker, med deres egne eiere og boliger."
          steg={STEG}
          person={null}
          testid="v4m"
        />

        {/* ── 15. Demo: inline skjema (#demo) ── */}
        <DemoSkjema />

        {/* ── 16. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />

        {/* ── 17. Avslutning ── */}
        <AvslutningSeksjon
          tittel="Hundre eiere. Én rolig morgen"
          under="Book en demo på 30 minutter, med deres egne eiere og boliger som eksempel."
          handling={{ knapp: { tekst: 'Book en demo', href: '#demo' }, lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' } }}
          steg={[
            ['1', 'Demo med deres portefølje', 'Dere ser en vanlig morgen og hele salget i systemet.'],
            ['2', 'Eiere, avtaler og roller', 'Oppdragsavtaler, honorarsats per eier, og hvem som godkjenner hva.'],
            ['3', 'Første oppgjør', 'Husleien inn, honoraret trukket, eierne betalt og rapportert.'],
          ]}
        />
      </main>
      <Footer />
    </div>
  );
}
