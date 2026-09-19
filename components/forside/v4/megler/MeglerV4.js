'use client';

import React from 'react';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { Knapp, Lenke, T, display } from '../motion';
import TillitStripe from '../TillitStripe';
import MeglerScene from './MeglerScene';
import SalgSeksjon from './SalgSeksjon';
import OppgjorSeksjon from './OppgjorSeksjon';
import InkludertSeksjon from './InkludertSeksjon';
import RegnSeksjon from './RegnSeksjon';
import DemoSkjema from './DemoSkjema';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';

/* ---------------------------------------------------------------------------
   MeglerV4 — /utleiemeglere. For utleiemeglere og forvaltere som drifter
   boliger for andre.

   Kort side, lite tekst. Hver seksjon: én tittel, én til tre setninger, og
   der det passer ett produktbilde. Ingenting forklares to ganger.

   Rekkefølge: hero → logoene → Salg (produktbilde) → Oppgjør (produktbilde)
   → Det som hører med (seks punkter) → Regn på det → Demo (#demo) →
   spørsmål og svar (fem) → avslutning.
--------------------------------------------------------------------------- */

const SVAK = 'rgba(21,19,15,0.5)';
const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  { q: 'Hva koster det?', a: null },
  { q: 'Konkurrerer DigiHome med oss?', a: 'Vi forvalter egne kunders boliger i Bergen sentrum. Henvendelser utenfor sentrum sender vi til partnere som bruker systemet. Vi deler ikke eiere, henvendelser eller priser, og vi selger ikke til eiere dere har avtale med. Det står i avtalen.' },
  { q: 'Hvordan håndteres eiernes penger?', a: 'Husleien går inn på klientkonto, adskilt fra deres egne midler. Honoraret trekkes etter avtalen med hver eier, resten utbetales, og eieren får oppgjørsrapport per bolig og årsoppgave.' },
  { q: 'Hvor lang tid tar overgangen?', a: 'Vanligvis tre uker: oppsett, parallell drift og første oppgjør. Dere velger om vi tar eier for eier eller hele porteføljen på én gang.' },
  { q: 'Hva er partnerprogrammet?', a: 'Fem byråer i 2025 får henvendelser fra digihome.no i sitt område. Kryss av i skjemaet, så tar vi det opp i demoen.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Prisen avhenger av <strong style={{ color: '#15130F', fontWeight: 500 }}>antall leieforhold under forvaltning</strong> og hvilke moduler dere bruker.{' '}
    <a href="#regn" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-regn">Regn på det</a> og{' '}
    <a href="#demo" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-demo">book en demo</a>, så får dere et konkret tilbud i løpet av uken.
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
                  Ta flere oppdrag<br />uten å ansette<span style={{ color: T.lilla, marginLeft: '0.03em' }}>.</span>
                </h1>
                <p className="dh-cover-inn mt-6 max-w-[38ch] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: 'rgba(21,19,15,0.7)', animationDelay: '.08s' }} data-testid="v4m-ingress">
                  Salg, kontrakter, husleie, oppgjør og eierportal i ett system, med klientkonto innebygd. Det samme vi bruker på egne kunders boliger i Bergen.
                </p>
                <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
                  <Knapp href="#demo" data-testid="v4m-cta">Book en demo</Knapp>
                  <Lenke href="#salg" data-testid="v4m-cta-salg">Se hvordan det virker</Lenke>
                </div>
              </div>
              <div className="dh-cover-inn min-w-0 lg:col-span-7" style={{ animationDelay: '.12s' }} data-testid="v4m-hero-scene">
                <MeglerScene />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Logoene ── */}
        <TillitStripe tekst="Koblet til tjenestene dere allerede bruker." />

        {/* ── 3. Salg: fra henvendelse til signert oppdrag (produktbilde) ── */}
        <SalgSeksjon />

        {/* ── 4. Oppgjør: klientkonto → honorar → eier (produktbilde) ── */}
        <OppgjorSeksjon />

        {/* ── 5. Det som hører med: seks punkter, én setning hver ── */}
        <InkludertSeksjon />

        {/* ── 6. Regn på det: deres egne anslag → #demo ── */}
        <RegnSeksjon />

        {/* ── 7. Demo: inline skjema (#demo) ── */}
        <DemoSkjema />

        {/* ── 8. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} intro="Korte svar på det meglere spør om først." />

        {/* ── 9. Avslutning ── */}
        <AvslutningSeksjon
          tittel="Vi viser dere det på 30 minutter"
          under="Book en demo med deres egne eiere og boliger."
          handling={{ knapp: { tekst: 'Book en demo', href: '#demo' }, lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' } }}
          steg={null}
        />
      </main>
      <Footer />
    </div>
  );
}
