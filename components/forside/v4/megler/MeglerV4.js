'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { Knapp, Lenke, T, Utsatt, display } from '../motion';
import TillitStripe from '../TillitStripe';
import HvemSeksjon from './HvemSeksjon';
import MeglerKartScene, { STORRELSER } from './MeglerKartScene';
import SalgSeksjon from './SalgSeksjon';
import LopetSeksjon from './LopetSeksjon';
import AgentSeksjon from './AgentSeksjon';
import OppgjorSeksjon from './OppgjorSeksjon';
import FunksjonerSeksjon from './FunksjonerSeksjon';
import RegnSeksjon from './RegnSeksjon';
import DemoSkjema from './DemoSkjema';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';

const ProduktSeksjon = dynamic(() => import('../produkt/ProduktSeksjon'), { ssr: false, loading: () => <div id="produkt" style={{ minHeight: 'var(--dh-h-produkt)', background: '#DCE1EB' }} aria-hidden="true" /> });

/* ---------------------------------------------------------------------------
   MeglerV4 — /utleiemeglere. For utleiemeglere og forvaltere som drifter
   boliger for andre.

   Kort side, lite tekst. Hver seksjon: én tittel, én til tre setninger, og
   der det passer ett produktbilde. Ingenting forklares to ganger.

   Rekkefølge: hero → logoene → Hele løpet (linjen + tre inn/ut-kort) →
   Salg (produktbilde) → produktfilmene (annonse, kontrakt, drift, økonomi)
   → Oppgjør (produktbilde) → Funksjoner (spesifikasjonsark, søkbart) → Regn på det
   → Demo (#demo) → spørsmål og svar (fem) → avslutning.
--------------------------------------------------------------------------- */

const SVAK = 'rgba(21,19,15,0.5)';
const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

/* Produktfilmene med megler-tekst: «dere» og eieren, ikke «du». Kortversjonen vises på mobil. */
const FILM = {
  annonse: {
    tittel: ['Fra adressen', 'til valgt leietaker.'],
    ingress: 'Skriv inn adressen, så finner systemet boligen, skriver annonsen og legger den ut på FINN. Interessentene legitimerer seg og booker visning selv. Dere velger leietaker, og eieren godkjenner i appen.',
    kort: 'Systemet finner boligen, skriver annonsen og legger den ut på FINN. Interessentene booker visning selv. Dere velger leietaker.',
  },
  kontrakt: {
    tittel: ['Fra valgt leietaker', 'til nøklene i hånden.'],
    ingress: 'Kontrakten fylles ut fra annonsen og signeres med BankID. Depositumet står på egen konto hos Keyhole, og overtakelsen dokumenteres i en protokoll som signeres på stedet.',
    kort: 'Kontrakt fra annonsen, signert med BankID. Depositum hos Keyhole, protokoll signert på stedet.',
  },
  drift: {
    tittel: ['Fra melding til løst.', 'Ett trykk fra dere.'],
    ingress: 'Leietakeren melder at varmtvannet er borte. Systemet oppretter saken og finner rørlegger, som svarer med tid og pris. Beløp over eierens grense går til eieren for godkjenning, og fakturaen bokføres på riktig eier.',
    kort: 'Leietakeren melder fra. Rørleggeren svarer med tid og pris, eieren godkjenner i appen. Fakturaen bokføres på riktig eier.',
  },
  okonomi: {
    tittel: ['Fra husleie', 'til oppgjør per eier.'],
    ingress: 'Den første i måneden går husleien inn på klientkonto, leilighet for leilighet. Mangler én, sendes påminnelse automatisk. Så trekkes honoraret, hver eier får sin utbetaling, og bilagene går til regnskapet.',
    kort: 'Husleien går inn på klientkonto. Mangler én, purres den automatisk. Honoraret trekkes, og hver eier får sin utbetaling.',
  },
};

const SPORSMAL = [
  { q: 'Hva koster det?', a: null },
  { q: 'Konkurrerer DigiHome med oss?', a: 'Vi forvalter boliger for egne kunder i Bergen sentrum. Henvendelser utenfor sentrum sender vi videre til partnere som bruker systemet. Vi deler ikke eiere, henvendelser eller priser, og vi kontakter ikke eiere dere har avtale med. Det står i avtalen.' },
  { q: 'Hvordan håndteres eiernes penger?', a: 'Husleien går inn på klientkonto, adskilt fra deres egne midler. Honoraret trekkes etter avtalen med hver eier, resten utbetales, og eieren får oppgjørsrapport per bolig og årsoppgave.' },
  { q: 'Hvor lang tid tar overgangen?', a: 'Vanligvis tre uker: oppsett, parallell drift og første oppgjør. Dere velger om vi flytter over eier for eier eller hele porteføljen på én gang.' },
  { q: 'Hva er partnerprogrammet?', a: 'Fem byråer får i 2025 henvendelsene fra digihome.no i sitt område. Kryss av i skjemaet, så tar vi det opp i demoen.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Prisen avhenger av <strong style={{ color: '#15130F', fontWeight: 500 }}>antall leieforhold under forvaltning</strong> og hvilke moduler dere bruker.{' '}
    <a href="#regn" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-regn">Regn på det</a> og{' '}
    <a href="#demo" className={LINK} style={{ color: '#15130F' }} data-testid="v4m-faq-demo">book en demo</a>, så får dere et konkret tilbud i løpet av uken.
  </p>
);

export default function MeglerV4() {
  const [storrelse, setStorrelse] = useState('mellom');
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
                  Systemet tar henvendelsen, skriver annonsen, oppretter saken og gjør oppgjøret med eieren. Dere velger leietaker og håndverker – og godkjenner det som koster penger.
                </p>
                <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.14s' }}>
                  <Knapp href="#demo" data-testid="v4m-cta">Book en demo</Knapp>
                  <Lenke href="#lopet" data-testid="v4m-cta-salg">Se hele løpet</Lenke>
                </div>
                <p className="dh-cover-inn mt-8 inline-flex items-center gap-2.5 text-[13.5px] sm:text-[14px]" style={{ color: SVAK, animationDelay: '.2s' }} data-testid="v4m-bevis">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />
                  Samme system som vi selv forvalter boliger med i Bergen – hver dag.
                </p>
                {/* Størrelsen: velg, og scenen spiller dagen for en portefølje på deres størrelse */}
                <div className="dh-cover-inn mt-6 flex flex-wrap items-baseline gap-x-2 text-[14px]" style={{ animationDelay: '.24s', color: 'rgba(21,19,15,0.5)' }}>
                  <span id="v4m-storrelse-label">Se en dag med</span>
                  <span role="radiogroup" aria-labelledby="v4m-storrelse-label" className="inline-flex items-baseline gap-x-1" data-testid="v4m-storrelse">
                    {Object.entries(STORRELSER).map(([id, s], i) => {
                      const er = id === storrelse;
                      return (
                        <React.Fragment key={id}>
                          {i > 0 && <span aria-hidden="true" style={{ color: 'rgba(21,19,15,0.25)' }}>·</span>}
                          <button type="button" role="radio" aria-checked={er} onClick={() => setStorrelse(id)} className="rounded-[6px] px-1 py-0.5 tabular-nums underline-offset-4 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ color: er ? T.ink : 'rgba(21,19,15,0.5)', fontWeight: er ? 500 : 400, textDecoration: er ? 'underline' : 'none', textDecorationColor: er ? T.lilla : 'transparent', textDecorationThickness: 2 }} data-testid={`v4m-storrelse-${id}`}>
                            {s.navn}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </span>
                  <span>boliger</span>
                </div>
              </div>
              <div className="dh-cover-inn min-w-0 lg:col-span-7" style={{ animationDelay: '.12s' }} data-testid="v4m-hero-scene">
                <MeglerKartScene storrelse={storrelse} />
              </div>
            </div>
          </div>
        </section>

        {/* ── 2. Logoene ── */}
        <TillitStripe tekst="Koblet til tjenestene dere allerede bruker." />

        {/* ── 2b. Hva DigiHome er: tre påstander + sitat fra produktsjefen ── */}
        <HvemSeksjon />

        {/* ── 3. Hele løpet: elleve stopp + tre inn/ut-kort (#lopet) ── */}
        <LopetSeksjon />

        {/* ── 3b. Assistenten: teammedlemmet, og den ekte chatten (#assistent) ── */}
        <AgentSeksjon />

        {/* ── 4. Salg: fra henvendelse til signert oppdrag (produktbilde) ── */}
        <SalgSeksjon />

        {/* ── 5. Produktfilmene: annonse, kontrakt, drift, økonomi ── */}
        <Utsatt id="produkt" minHeight="var(--dh-h-produkt)" className="bg-[#DCE1EB]">
          <ProduktSeksjon kapitler={['annonse', 'kontrakt', 'drift', 'okonomi']} tekster={FILM} />
        </Utsatt>

        {/* ── 5. Oppgjør: klientkonto → honorar → eier (produktbilde) ── */}
        <OppgjorSeksjon />

        {/* ── 6. Funksjoner: spesifikasjonsarket, samme elleve stopp, søkbart (#funksjoner) ── */}
        <FunksjonerSeksjon />

        {/* ── 7. Regn på det: deres egne anslag → #demo ── */}
        <RegnSeksjon />

        {/* ── 8. Demo: inline skjema (#demo) ── */}
        <DemoSkjema />

        {/* ── 9. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} intro="Korte svar på det meglere spør om først." />

        {/* ── 10. Avslutning ── */}
        <AvslutningSeksjon
          tittel="Vi viser dere det på 30 minutter"
          under="Book en demo med deres egne eiere og boliger."
          handling={{ knapp: { tekst: 'Book en demo', href: '#demo' }, lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' } }}
          steg={null}
          bilde={{ src: '/v4/drift/fasade-morgen-1920.webp', srcSet: '/v4/drift/fasade-morgen-1200.webp 1200w, /v4/drift/fasade-morgen-1920.webp 1920w, /v4/drift/fasade-morgen-3840.webp 3840w', pos: '50% 40%' }}
        />
      </main>
      <Footer />
    </div>
  );
}
