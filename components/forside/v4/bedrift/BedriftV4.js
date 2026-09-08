'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { EASE, Knapp, T, Utsatt, display } from '../motion';
import PortefoljeScene, { STORRELSER } from './PortefoljeScene';
import SammenligningSeksjon from '../SammenligningSeksjon';
import TillitStripe from '../TillitStripe';
import StrukturSeksjon from './StrukturSeksjon';
import ModulSeksjon from './ModulSeksjon';
import KontrollSeksjon from './KontrollSeksjon';
import StegSeksjon from '../StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';

/* Produktfilmene (drift · økonomi · kontrakt) er den tyngste delen — egen chunk, montert når den nærmer seg. */
const ProduktSeksjon = dynamic(() => import('../produkt/ProduktSeksjon'), { ssr: false, loading: () => <div id="produkt" style={{ minHeight: 'var(--dh-h-produkt)', background: '#DCE1EB' }} aria-hidden="true" /> });

/* ── Innholdet for eiendomsselskaper. Plattformen — ikke forvaltning: selskapet drifter selv, med eget team,
      på DigiHome. Påstandene holder seg til det systemet gjør (roller/godkjenning, husleie per bygg, saker med
      leverandør og pris, BankID-kontrakter, rapport per bygg og selskap) — og prisen slik prissiden sier den:
      etter enheter og moduler. Ingen «vi drifter for dere» her — det tilbys ikke for porteføljer p.t. ── */

const ROLLER = [['drift', 'Driftssjef'], ['okonomi', 'Økonomi'], ['vaktmester', 'Vaktmester']];

const HUSLEIE = 'Registrerer alle innbetalinger, purrer de som mangler';
const LEKKASJE = 'Oppretter sak, finner rørlegger, henter pris, følger opp til det er løst';
const KONTRAKT = 'Kontrakt fra malen, signering med BankID, arkiv på enheten';
const SVAR = 'Svarer fra kontrakten — løfter det som trenger noen';
const UTFLYTT = 'Depositum, dokumenter og historikk samlet på leieforholdet';
const RAPPORT = 'Rapport per bygg og selskap — husleie, saker, kostnader';

const DAGEN = [
  { t: 'Husleie, den 1.', drift: ['Ser status per bygg', HUSLEIE], okonomi: ['Ser avvik og tallene per bygg', HUSLEIE], vaktmester: [null, HUSLEIE] },
  { t: 'Lekkasje i Strandgaten 12', drift: ['Godkjenner rørlegger og pris — saken er adressert til deg', LEKKASJE], okonomi: ['Ser kostnaden når den er godkjent', LEKKASJE], vaktmester: ['Slipper inn rørleggeren, kvitterer når det er ordnet', LEKKASJE] },
  { t: 'Ny leietaker i 5A', drift: ['Godkjenner kontrakten', KONTRAKT], okonomi: ['Ser depositum og første husleie', KONTRAKT], vaktmester: ['Nøkler ved innflytting', KONTRAKT] },
  { t: 'Leietaker spør om oppsigelsestid', drift: [null, SVAR], okonomi: [null, SVAR], vaktmester: [null, SVAR] },
  { t: 'Utflytting i 3B', drift: ['Godkjenner depositumsoppgjøret', UTFLYTT], okonomi: ['Ser oppgjøret', UTFLYTT], vaktmester: ['Befaring og nøkler', UTFLYTT] },
  { t: 'Månedsslutt', drift: ['Leser rapporten per bygg', RAPPORT], okonomi: ['Avstemmer tallene', RAPPORT], vaktmester: [null, RAPPORT] },
];

const DAGEN_SUM = {
  drift: 'Du godkjenner det som koster og det som binder. Rutinen — innkreving, kontrakter, saker — går automatisk, og alt ligger i historikken.',
  okonomi: 'Du ser tallene per bygg, avvik og oppgjør. Innkrevingen går automatisk.',
  vaktmester: 'Du tar det fysiske — slipper inn, ser til, kvitterer. Saken og papirene ligger allerede der.',
};

const STEG = [
  { nr: '1', t: 'Demo', d: '30 minutter med deres portefølje som eksempel. Dere ser dagen deres i systemet.' },
  { nr: '2', t: 'Oppsett', d: 'Selskaper, bygg, enheter og leieforhold settes opp sammen med dere — det dere har, som det er.' },
  { nr: '3', t: 'Roller og grenser', d: 'Hvem ser hva, hvem godkjenner hva — og fra hvilket beløp. Hver handling logges med hvem og når.' },
  { nr: '4', t: 'Autopilot på', d: 'Husleie, kontrakter og saker går automatisk. Teamet tar de få beslutningene som betyr noe.' },
];

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  { q: 'Hva koster det?', a: null },
  { q: 'Kan vi ta med eksisterende leieforhold?', a: 'Ja. Bygg, enheter og løpende leieforhold settes opp sammen med dere i oppsettet — med kontrakter og historikk som de er.' },
  { q: 'Hvordan fungerer roller?', a: 'Dere bestemmer hvem som ser hva og hvem som godkjenner. Saker og godkjenninger adresseres til riktig rolle, og hver handling logges med hvem og når.' },
  { q: 'Hvordan signeres kontrakter?', a: 'Med BankID gjennom Posten signering. Kontrakten arkiveres på enheten, med full historikk.' },
  { q: 'Fungerer det for flere selskaper og bygg?', a: 'Ja. Porteføljen organiseres per selskap og per bygg, med oversikt og rapport på hvert nivå.' },
  { q: 'Hva med regnskapet?', a: 'Husleie, kostnader og oppgjør ligger per bygg og selskap, og eksporteres til regnskapssystemet dere bruker — PowerOffice, Tripletex og Fiken.' },
  { q: 'Hva med sikkerhet og tilganger?', a: 'Hver bruker har en rolle som styrer hva som kan ses og gjøres. Kostnader over grensene dere setter krever godkjenning fra riktig rolle, kontrakter og oppgjør signeres med BankID, og hver handling logges med hvem og når.' },
  { q: 'Kan vi starte med ett selskap eller noen bygg?', a: 'Ja. Dere kan starte med ett selskap eller noen bygg og ta resten inn etter hvert. Strukturen — konsern, selskap, bygg, enhet — ligger der fra dag én.' },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Plattformen prises etter <strong style={{ color: '#15130F', fontWeight: 500 }}>antall enheter og moduler</strong>.{' '}
    <Link href="/book-mote" className={LINK} style={{ color: '#15130F' }} data-testid="v4e-faq-demo">Book en demo</Link>, så får dere et konkret forslag samme uke — med deres portefølje som eksempel.
  </p>
);

/* ---------------------------------------------------------------------------
   BedriftV4 — undersiden for eiendomsselskap, fra scratch. Første akt: hero.

   Søsteren til forsiden: samme løfte, én størrelse større.
   «Utleie på autopilot» → «Porteføljen på autopilot».

   Adressefeltets tvilling er størrelsesvalget: «Hvor mange enheter drifter
   dere?» Valget skalerer scenen (bygg, enheter, husleie, saker) og spiller
   dagen fra frame 1 — du ser deg selv i produktet før du har lest noe.

   Hero-argumentet som skiller B2B fra forsiden: ikke «én godkjenning», men
   «de få som betyr noe — og hvem som har lov til å ta dem». Roller.
   Scenen får mer bredde (5/8) enn forsiden: porteføljen trenger det.
--------------------------------------------------------------------------- */

export default function BedriftV4() {
  const [storrelse, setStorrelse] = useState('mellom');

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="bedrift-v4">
      <NavV4 />
      <main>
        <section className="relative overflow-hidden lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" data-testid="v4b-hero">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(ellipse 50% 60% at 72% 50%, rgba(212,150,255,0.12) 0%, rgba(212,150,255,0.04) 45%, rgba(212,150,255,0) 72%)' }} />
          <div className="relative mx-auto grid w-full max-w-[1440px] gap-10 px-5 pb-12 pt-7 sm:gap-14 sm:px-8 sm:pb-16 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:items-center lg:gap-12 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="max-w-[560px]">
              <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4b-label">For eiendomsselskaper</p>
              <h1
                className="dh-cover-inn mt-3 max-w-[10ch] text-[48px] sm:mt-4 sm:text-[68px] lg:text-[clamp(64px,5vw,96px)]"
                style={{ ...display, color: T.ink, animationDelay: '.04s' }}
                data-testid="v4b-h1"
              >
                Porteføljen på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-6 max-w-[38ch] text-[17px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[20px]" style={{ animationDelay: '.08s' }} data-testid="v4b-ingress">
                Alle selskaper, bygg og leieforhold i ett system. Rutinen — husleie, kontrakter og saker — går automatisk. Beslutningene tar dere, etter roller og grenser dere setter. Alt logges.
              </p>

              <div className="dh-cover-inn mt-9 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ animationDelay: '.14s' }}>
                <Knapp href="/book-mote" data-testid="v4b-cta">Book en demo</Knapp>
                <Link href="/bli-utleier/start?kind=business" className="text-[15px] font-medium underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F]/60" style={{ color: T.ink }} data-testid="v4b-registrer">Registrer selskapet</Link>
              </div>

              {/* Størrelsen — som en stille tekstlinje, ikke et skjemaelement: velg, og scenen spiller dagen deres. */}
              <div className="dh-cover-inn mt-10 flex flex-wrap items-baseline gap-x-2 text-[14px]" style={{ animationDelay: '.2s', color: 'rgba(21,19,15,0.5)' }}>
                <span id="v4b-storrelse-label">Se dagen for en portefølje på</span>
                <span role="radiogroup" aria-labelledby="v4b-storrelse-label" className="inline-flex items-baseline gap-x-1" data-testid="v4b-storrelse">
                  {Object.entries(STORRELSER).map(([id, s], i) => {
                    const er = id === storrelse;
                    return (
                      <React.Fragment key={id}>
                        {i > 0 && <span aria-hidden="true" style={{ color: 'rgba(21,19,15,0.25)' }}>·</span>}
                        <button
                          type="button"
                          role="radio"
                          aria-checked={er}
                          onClick={() => setStorrelse(id)}
                          className="rounded-[6px] px-1 py-0.5 tabular-nums underline-offset-4 transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
                          style={{ color: er ? T.ink : 'rgba(21,19,15,0.5)', fontWeight: er ? 500 : 400, textDecoration: er ? 'underline' : 'none', textDecorationColor: er ? T.lilla : 'transparent', textDecorationThickness: 2, transitionTimingFunction: EASE }}
                          data-testid={`v4b-storrelse-${id}`}
                        >
                          {s.navn}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </span>
                <span>enheter</span>
              </div>
            </div>

            <div className="dh-cover-inn" style={{ animationDelay: '.12s' }}>
              <PortefoljeScene storrelse={storrelse} />
            </div>
          </div>
        </section>
        <TillitStripe />

        {/* ── 2. Strukturen — konsern, selskaper, bygg, enheter: passer systemet oss? ── */}
        <StrukturSeksjon />
        {/* ── 3. Produktet i drift — filmene teamet kjenner seg igjen i: saken, økonomien, kontrakten ── */}
        <Utsatt id="produkt" minHeight="var(--dh-h-produkt)" className="bg-[#DCE1EB]"><ProduktSeksjon kapitler={['drift', 'okonomi', 'kontrakt']} /></Utsatt>
        {/* ── 4. Én dag, tre roller ── */}
        <SammenligningSeksjon
          tittel={['Én dag.', 'Tre roller.']}
          under="Seks ting som skjer i en portefølje — sett fra stolen du sitter i."
          valg={ROLLER}
          hendelser={DAGEN}
          sum={DAGEN_SUM}
          kolonner={['Hendelse', 'Du', 'Systemet']}
          testid="v4e"
        />
        {/* ── 5. Plattformen — bygget for team med portefølje ── */}
        <ModulSeksjon />
        {/* ── 6. Kontroll — roller, grenser, historikk, BankID ── */}
        <KontrollSeksjon />
        {/* ── 7. Slik kommer dere i gang ── */}
        <StegSeksjon
          tittel={['Slik kommer', 'dere i gang.']}
          under="Fra demo til drift på noen uker — med deres portefølje, ikke en mal."
          steg={STEG}
          person={null}
          testid="v4e"
        />
        {/* ── 8. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />
        {/* ── 9. Avslutning ── */}
        <AvslutningSeksjon
          tittel="Porteføljen på autopilot"
          under="Book en demo — 30 minutter, med deres portefølje som eksempel."
          handling={{ knapp: { tekst: 'Book en demo', href: '/book-mote' }, lenke: { tekst: 'Registrer selskapet', href: '/bli-utleier/start?kind=business' } }}
          steg={[
            ['1', 'Demo med deres portefølje', 'Dere ser dagen deres i systemet.'],
            ['2', 'Oppsett og roller', 'Bygg, enheter og leieforhold — og hvem som godkjenner hva.'],
            ['3', 'Autopilot på', 'Husleie, kontrakter og saker går automatisk. Teamet tar de få beslutningene.'],
          ]}
        />
      </main>
      <Footer />
    </div>
  );
}
