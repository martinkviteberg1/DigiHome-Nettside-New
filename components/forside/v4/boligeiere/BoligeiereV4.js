'use client';

import React, { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import AdresseFelt from '../AdresseFelt';
import { T, display } from '../motion';
import BoligScene from './BoligScene';
import VeiskilleSeksjon from './VeiskilleSeksjon';
import SammenligningSeksjon from './SammenligningSeksjon';
import LeietakerSeksjon from '../LeietakerSeksjon';
import StegSeksjon from './StegSeksjon';
import FaqSeksjon from '../FaqSeksjon';
import AvslutningSeksjon from '../AvslutningSeksjon';

/* ---------------------------------------------------------------------------
   BoligeiereV4 — siden for boligeiere (én bolig eller fem, hus eller leilighet).

   Dramaturgi:
   1. Hero — nøytral: «Boligen på autopilot.» Gjenkjennelse, ikke valg. Adressen
      er handlingen; scenen viser ett leieår og hvor lite av det som var ditt.
   2. Veiskillet — to måter: selvforvaltning (5 %) eller full forvaltning.
   3. Sammenligningen — samme leieår, hvem gjør hva, med bryter.
   4. Leietakeren — slik oppleves det i andre enden.
   5. Slik kommer du i gang — fire steg, én fast forvalter.
   6. Spørsmål og svar — boligeierens spørsmål.
   7. Avslutning — adressen igjen.
--------------------------------------------------------------------------- */

const LINK = 'underline underline-offset-4 decoration-[#15130F]/30 hover:decoration-[#15130F]';

const SPORSMAL = [
  {
    q: 'Selvforvaltning eller full forvaltning — hvordan velger jeg?',
    a: 'Vil du finne leietakeren selv og ha kontroll på detaljene, velger du selvforvaltning: DigiHome tar kontrakt, husleie, oppfølging og saker — du godkjenner det som koster. Vil du slippe alt det praktiske, tar vi full forvaltning. Begge kjører på samme plattform, så du kan bytte senere.',
  },
  { q: 'Hva koster det?', a: null },
  {
    q: 'Kan jeg gå fra selvforvaltning til full forvaltning senere?',
    a: 'Ja. Boligen, kontrakten og historikken ligger allerede i DigiHome, så vi tar over der du er. Full forvaltning tilbys foreløpig i Bergen og omegn.',
  },
  {
    q: 'Hva skjer hvis leietakeren ikke betaler?',
    a: 'DigiHome registrerer betalinger, varsler leietakeren og purrer automatisk — og du ser status hele veien. Går det lenger, får du beskjed og forslag til neste steg. Beslutningen er alltid din.',
  },
  {
    q: 'Er DigiHome for meg når jeg bare har én bolig?',
    a: 'Ja — det er de fleste. Selvforvaltning koster 5 % av husleien, uten bindingstid og uten faste gebyrer. Du bruker det du trenger.',
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

export default function BoligeiereV4() {
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
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="boligeiere-v4">
      <NavV4 />
      <main>
        {/* ── 1. Hero — nøytral. Gjenkjennelse før valg. ── */}
        <section className="relative lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" data-testid="v4b-hero">
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="min-w-0 max-w-[600px]">
              <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4b-label">For boligeiere</p>
              <h1
                className="dh-cover-inn mt-4 max-w-[10ch] text-[52px] sm:text-[68px] lg:text-[clamp(64px,5vw,96px)]"
                style={{ ...display, color: T.ink, animationDelay: '.04s' }}
                data-testid="v4b-h1"
              >
                Boligen på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-7 max-w-[38ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[20px]" style={{ animationDelay: '.08s' }} data-testid="v4b-ingress">
                <span className="sm:hidden">Én bolig eller fem. Lei ut selv med DigiHome som motor — eller la oss ta alt.</span>
                <span className="hidden sm:inline">Én bolig eller fem. Lei ut selv med DigiHome som motor — eller la oss ta alt. Du beholder oversikten og siste ord.</span>
              </p>

              {/* Handlingen er feltet. relative z-20: forslagslisten skal ligge over scenen. */}
              <div className="dh-cover-inn relative z-20 mt-9 w-full sm:max-w-[460px]" style={{ animationDelay: '.16s' }}>
                <AdresseFelt onValgt={valgt} />
              </div>
              <p className="dh-cover-inn mt-4 text-[14px]" style={{ color: 'rgba(21,19,15,0.5)', animationDelay: '.22s' }} data-testid="v4b-under">
                Hele Norge · ingen bindingstid · fra 5 % av husleien
              </p>
            </div>

            <div ref={sceneRef} className="dh-cover-inn min-w-0" style={{ animationDelay: '.12s' }}>
              <BoligScene eiendom={eiendom} />
            </div>
          </div>
        </section>

        {/* ── 2. Veiskillet ── */}
        <VeiskilleSeksjon />
        {/* ── 3. Samme leieår, hvem gjør hva ── */}
        <SammenligningSeksjon />
        {/* ── 4. Leietakeren ── */}
        <LeietakerSeksjon />
        {/* ── 5. Slik kommer du i gang ── */}
        <StegSeksjon />
        {/* ── 6. Spørsmål og svar ── */}
        <FaqSeksjon sporsmal={SPORSMAL} prisSvar={PRIS_SVAR} />
        {/* ── 7. Avslutning ── */}
        <AvslutningSeksjon tittel="Boligen på autopilot" under="Start med adressen din. Selv eller med oss — resten setter vi opp sammen." />
      </main>
      <Footer />
    </div>
  );
}
