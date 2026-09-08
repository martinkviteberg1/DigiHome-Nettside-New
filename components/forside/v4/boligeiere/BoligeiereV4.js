'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import AdresseFelt from '../AdresseFelt';
import { T, display } from '../motion';
import AarScene from './AarScene';
import VeiskilleSeksjon from '../VeiskilleSeksjon';
import SammenligningSeksjon from '../SammenligningSeksjon';
import LeietakerSeksjon from '../LeietakerSeksjon';
import StegSeksjon from '../StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';
import TillitStripe from '../TillitStripe';
import EierSitater from '../forvaltning/EierSitater';

/* ---------------------------------------------------------------------------
   BoligeiereV4 — siden for boligeiere (én bolig eller fem, hus eller leilighet).

   Dramaturgi:
   1. Hero — nøytral: «Boligen på autopilot.» Gjenkjennelse, ikke valg. Adressen
      er handlingen; scenen viser ett leieår og de få beslutningene som var dine.
   2. Veiskillet — hvem driver: du selv, med systemet som tar rutinen (5 %),
      eller en fast forvalter hos oss (full forvaltning).
   3. Sammenligningen — samme leieår, hvem gjør hva, med bryter.
   4. Leietakeren — slik oppleves det i andre enden.
   5. Slik kommer du i gang — fire steg, én fast forvalter (ved full forvaltning).
   6. Spørsmål og svar — boligeierens spørsmål.
   7. Avslutning — adressen igjen.

   Språkregel for hele siden: selvforvaltning er AUTOMATISERT, ikke outsourcet.
   Boligeieren er utleier og driver boligen selv; DigiHome er systemet. Det som
   «går av seg selv», gjør systemet — aldri «DigiHome gjør resten».
--------------------------------------------------------------------------- */

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  {
    q: 'Selvforvaltning eller full forvaltning — hvordan velger jeg?',
    a: 'Vil du leie ut selv og ha kontrollen, velger du selvforvaltning: du er utleier og driver boligen, mens systemet tar rutinen — kontrakt med BankID, oppfølging og purring av husleie, saker med forslag til leverandør og pris som du godkjenner. Vil du slippe driften helt, tar en fast forvalter hos oss full forvaltning. Begge kjører på samme plattform, så du kan bytte senere.',
  },
  { q: 'Hva koster det?', a: null },
  {
    q: 'Kan jeg gå fra selvforvaltning til full forvaltning senere?',
    a: 'Ja. Boligen, kontrakten og historikken ligger allerede i DigiHome, så forvalteren tar over der du er. Full forvaltning tilbys foreløpig i Bergen og omegn.',
  },
  {
    q: 'Hva skjer hvis leietakeren ikke betaler?',
    a: 'Betalingen registreres, og leietakeren varsles og purres automatisk — du ser status hele veien. Går det lenger, får du beskjed og forslag til neste steg; i full forvaltning tar forvalteren det. Beslutningen er alltid din.',
  },
  {
    q: 'Er DigiHome for meg når jeg bare har én bolig?',
    a: 'Ja — det er de fleste. Selvforvaltning koster 5 % av husleien, uten bindingstid og uten faste gebyrer. Du leier ut som før — bare med et system som tar rutinen.',
  },
  {
    q: 'Hvor er DigiHome tilgjengelig?',
    a: 'Selvforvaltning fungerer i hele Norge. Full forvaltning tilbyr vi i Bergen og omegn, og utvider gradvis.',
  },
];

const PRIS_SVAR = (
  <p className="max-w-[60ch]" style={{ color: 'rgba(21,19,15,0.66)' }}>
    Selvforvaltning koster <strong style={{ color: '#15130F', fontWeight: 500 }}>5 % av husleien</strong> — ingen oppstart, ingen bindingstid, ingen faste gebyrer. Full forvaltning prises etter omfang som en andel av husleien; du får et konkret tilbud etter en{' '}
    <Link href="/book-mote" className={LINK} style={{ color: '#15130F' }} data-testid="v4b-faq-samtale">kort samtale</Link>. Vil du regne selv, bruk{' '}
    <Link href="/priskalkulator" className={LINK} style={{ color: '#15130F' }} data-testid="v4b-faq-kalkulator">priskalkulatoren</Link>.
  </p>
);

/* Samme side, annen inngang: /bli-utleier (SEO «utleiemegler i Bergen», annonser) bruker
   egen tekst og FAQ, og får tillit (logoer + eiernes stemmer) rett etter heroen. */
export default function BoligeiereV4({ label = 'For boligeiere', tittel = 'Boligen på autopilot', ingressKort, ingressLang, under, sporsmal = SPORSMAL, prisSvar = PRIS_SVAR, avslutning, tillit = false, testid = 'boligeiere-v4' } = {}) {
  const [eiendom, setEiendom] = useState(null);
  const sceneRef = useRef(null);
  const valgt = useCallback((v) => {
    if (!v || !v.address) return;
    setEiendom({ adresse: v.address, by: v.city || '' });
    try {
      if (window.matchMedia('(max-width: 1023px)').matches && sceneRef.current) {
        const y = sceneRef.current.getBoundingClientRect().top + window.scrollY - 200;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } catch (e) { /* ok */ }
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid={testid}>
      <NavV4 />
      <main>
        {/* ── 1. Hero — én setning, én handling, én scene i full bredde (samme struktur som forsiden). Scenen er ett
               leieår med boligen: tolv måneder går, husleien kommer inn — tre beslutninger var dine. ── */}
        <section className="relative flex flex-col" data-testid="v4b-hero">
          <div className="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-7 text-center sm:px-8 sm:pb-9 sm:pt-12 lg:pb-11 lg:pt-14">
            <p className="dh-cover-inn text-[14.5px] font-medium sm:text-[15px]" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4b-label">{label}</p>
            <h1
              className="dh-cover-inn mx-auto mt-4 text-[52px] sm:text-[76px] lg:text-[clamp(72px,6.2vw,112px)]"
              style={{ ...display, color: T.ink, animationDelay: '.04s' }}
              data-testid="v4b-h1"
            >
              {tittel}<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
            </h1>
            <p className="dh-cover-inn mx-auto mt-5 max-w-[44ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-6 sm:text-[21px]" style={{ animationDelay: '.08s' }} data-testid="v4b-ingress">
              <span className="sm:hidden">{ingressKort || 'Én bolig eller fem. Lei ut selv, med et system som tar rutinen — eller la oss ta alt.'}</span>
              <span className="hidden sm:inline">{ingressLang || 'Én bolig eller fem. Lei ut selv, med et system som tar rutinen — eller la en fast forvalter hos oss ta alt. Du har oversikten og siste ord uansett.'}</span>
            </p>
            {/* Handlingen er feltet. relative z-20: forslagslisten skal ligge over scenen. */}
            <div className="dh-cover-inn relative z-20 mx-auto mt-7 w-full max-w-[520px] sm:mt-9" style={{ animationDelay: '.14s' }}>
              <AdresseFelt onValgt={valgt} variant="ink" />
            </div>
            <p className="dh-cover-inn mt-4 text-[13.5px] sm:text-[14px]" style={{ color: 'rgba(21,19,15,0.5)', animationDelay: '.2s' }} data-testid="v4b-under">
              {under || 'Hele Norge · ingen bindingstid · fra 5 % av husleien'}
            </p>
          </div>
          {/* Scenen: én flate, litt bredere enn seksjonene under — boligen, og året som går. */}
          <div ref={sceneRef} className="mx-auto w-full max-w-[1600px] min-w-0 px-4 pb-6 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:pb-8">
            <AarScene eiendom={eiendom} />
          </div>
        </section>

        {/* Tillit: heroens fot — koblet til tjenestene boligeieren kjenner (FINN, BankID, Vipps …). */}
        <TillitStripe />
        {/* ── 2. Veiskillet ── */}
        <VeiskilleSeksjon />
        {/* ── 3. Samme leieår, hvem gjør hva ── */}
        <SammenligningSeksjon />
        {/* ── 4. Leietakeren ── */}
        <LeietakerSeksjon />
        {tillit ? <EierSitater /> : null}
        {/* ── 5. Slik kommer du i gang ── */}
        <StegSeksjon />
        {/* ── 6. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={sporsmal} prisSvar={prisSvar} />
        {/* ── 7. Avslutning ── */}
        <AvslutningSeksjon tittel={avslutning?.tittel || 'Boligen på autopilot'} under={avslutning?.under || 'Start med adressen din. Selv eller med oss — resten setter vi opp sammen.'} />
      </main>
      <Footer />
    </div>
  );
}
