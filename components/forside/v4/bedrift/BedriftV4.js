'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { EASE, Knapp, T, display } from '../motion';
import PortefoljeScene, { STORRELSER } from './PortefoljeScene';
import SammenligningSeksjon from '../SammenligningSeksjon';
import ProduktSeksjon from '../produkt/ProduktSeksjon';
import TillitStripe from '../TillitStripe';
import ModulSeksjon from './ModulSeksjon';
import StegSeksjon from '../StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';

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
  { nr: '2', t: 'Oppsett', d: 'Bygg, enheter og leieforhold settes opp sammen med dere — det dere har, som det er.' },
  { nr: '3', t: 'Roller', d: 'Hvem ser hva, hvem godkjenner hva. Hver handling logges med hvem og når.' },
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
          <div className="relative mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:items-center lg:gap-12 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="max-w-[560px]">
              <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4b-label">For eiendomsselskaper</p>
              <h1
                className="dh-cover-inn mt-4 max-w-[10ch] text-[52px] sm:text-[68px] lg:text-[clamp(64px,5vw,96px)]"
                style={{ ...display, color: T.ink, animationDelay: '.04s' }}
                data-testid="v4b-h1"
              >
                Porteføljen på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-7 max-w-[38ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[20px]" style={{ animationDelay: '.08s' }} data-testid="v4b-ingress">
                Alle bygg, enheter og leieforhold i én oversikt. Teamet deres driver — systemet tar rutinen: husleie, kontrakter og saker går automatisk, med roller, godkjenning og full historikk.
              </p>

              {/* Adressefeltets tvilling: størrelsen. Skalerer scenen og spiller dagen på nytt. */}
              <div className="dh-cover-inn mt-9" style={{ animationDelay: '.14s' }}>
                <p className="text-[13.5px]" style={{ color: 'rgba(21,19,15,0.55)' }} id="v4b-storrelse-label">Hvor mange enheter drifter dere?</p>
                <div role="radiogroup" aria-labelledby="v4b-storrelse-label" className="mt-2.5 inline-flex rounded-[12px] p-1" style={{ background: 'rgba(21,19,15,0.06)' }} data-testid="v4b-storrelse">
                  {Object.entries(STORRELSER).map(([id, s]) => {
                    const er = id === storrelse;
                    return (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={er}
                        onClick={() => setStorrelse(id)}
                        className="h-9 rounded-[9px] px-4 text-[14px] transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
                        style={{ background: er ? '#FBFAF8' : 'transparent', color: er ? T.ink : 'rgba(21,19,15,0.6)', fontWeight: er ? 500 : 400, boxShadow: er ? '0 1px 2px rgba(21,19,15,0.08), 0 0 0 1px rgba(21,19,15,0.05)' : 'none', transitionTimingFunction: EASE }}
                        data-testid={`v4b-storrelse-${id}`}
                      >
                        {s.navn}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-x-6 gap-y-3" style={{ animationDelay: '.2s' }}>
                <Knapp href="/book-mote" data-testid="v4b-cta">Book en demo</Knapp>
                <Link href="/bli-utleier/start?kind=business" className="text-[15px] font-medium underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F]/60" style={{ color: T.ink }} data-testid="v4b-registrer">Registrer selskapet</Link>
              </div>
              <p className="dh-cover-inn mt-4 text-[14px]" style={{ color: 'rgba(21,19,15,0.5)', animationDelay: '.24s' }}>30 minutter — med deres portefølje som eksempel.</p>
            </div>

            <div className="dh-cover-inn" style={{ animationDelay: '.12s' }}>
              <PortefoljeScene storrelse={storrelse} />
            </div>
          </div>
        </section>
        <TillitStripe />

        {/* ── 2. Produktet i drift — filmene teamet kjenner seg igjen i: saken, økonomien, kontrakten ── */}
        <ProduktSeksjon kapitler={['drift', 'okonomi', 'kontrakt']} />
        {/* ── 3. Én dag, tre roller ── */}
        <SammenligningSeksjon
          tittel={['Én dag.', 'Tre roller.']}
          under="Seks ting som skjer i en portefølje — sett fra stolen du sitter i."
          valg={ROLLER}
          hendelser={DAGEN}
          sum={DAGEN_SUM}
          kolonner={['Hendelse', 'Du', 'Systemet']}
          testid="v4e"
        />
        {/* ── 4. Plattformen — bygget for team med portefølje ── */}
        <ModulSeksjon />
        {/* ── 5. Slik kommer dere i gang ── */}
        <StegSeksjon
          tittel={['Slik kommer', 'dere i gang.']}
          under="Fra demo til drift på noen uker — med deres portefølje, ikke en mal."
          steg={STEG}
          person={null}
          testid="v4e"
        />
        {/* ── 6. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />
        {/* ── 7. Avslutning ── */}
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
