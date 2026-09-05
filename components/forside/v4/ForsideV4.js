'use client';

import React, { useCallback, useRef, useState } from 'react';
import NavV4 from './NavV4';
import HeroScene from './HeroScene';
import HeroStage from './HeroStage';
import ProduktSeksjon from './produkt/ProduktSeksjon';
import TillitStripe from './TillitStripe';
import LeietakerSeksjon from './LeietakerSeksjon';
import SporSeksjon from './SporSeksjon';
import AltSamletSeksjon from './AltSamletSeksjon';
import FaqSeksjon from './FaqSeksjon';
import AvslutningSeksjon from './AvslutningSeksjon';
import Footer from '@/components/dh/Footer';
import AdresseFelt from './AdresseFelt';
import { T, display } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV4 — fra scratch. Første akt: hero.

   Eiendom × autonom software. Ikke «AI-laboratorium».
   · PP Right Grotesk som display, ABC Diatype i alt annet (appens fonter).
   · DigiHome-lilla er primærhandling — en brand asset, ikke bare et punktum.
   · Heroen følger navens kanter (full-bleed grid), én levende flate til høyre.
   · Én idé: bolig → DigiHome driver boligen → se hvor lite du måtte gjøre.
   · Siste akt er brukerens: adressefeltet i heroen ER første steg i onboardingen.
--------------------------------------------------------------------------- */

/* hero: 'side' (to kolonner, dagens) eller 'stage' (sentrert setning + én scene i full bredde — Sana-strukturen).
   bilde: midlertidig scenebilde for 'stage' ('stue' | 'bygg') til footagen finnes. */
export default function ForsideV4({ hero = 'side', bilde = 'stue' }) {
  /* Din adresse → din bolig. Valgt adresse personaliserer heroscenen før du går videre. */
  const [eiendom, setEiendom] = useState(null);
  const sceneRef = useRef(null);
  const valgt = useCallback((v) => {
    if (!v || !v.address) return;
    setEiendom({ adresse: v.address, by: v.city || '', lat: Number(v.lat), lng: Number(v.lng) });
    /* Mobil: scenen ligger under feltet — vis den. */
    try {
      if (window.matchMedia('(max-width: 1023px)').matches && sceneRef.current) {
        const y = sceneRef.current.getBoundingClientRect().top + window.scrollY - 200;   // feltet forblir synlig under headeren
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    } catch (e) { /* ok */ }
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="forside-v4">
      <NavV4 />
      <main>
        {hero === 'stage' ? (
          <section className="relative flex flex-col lg:min-h-[calc(100svh-64px)]" data-testid="v4-hero">
            {/* Én setning. Én linje. Én handling — sentrert, ingenting konkurrerer. */}
            <div className="mx-auto w-full max-w-[1100px] px-5 pb-9 pt-10 text-center sm:px-8 sm:pt-14 lg:pb-11 lg:pt-16">
              <h1
                className="dh-cover-inn mx-auto text-[54px] sm:text-[80px] lg:text-[clamp(76px,6.6vw,120px)]"
                style={{ ...display, color: T.ink }}
                data-testid="v4-h1"
              >
                Utleie på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mx-auto mt-5 max-w-[44ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-6 sm:text-[21px]" style={{ animationDelay: '.08s' }} data-testid="v4-hero-ingress">
                <span className="sm:hidden">Hele utleien samlet. Mye av arbeidet gjort for deg.</span>
                <span className="hidden sm:inline">Leietakere, kontrakter, husleie og drift — samlet på ett sted, og gjort underveis.</span>
              </p>
              {/* Handlingen er feltet. Ink-knapp: lilla er reservert for det ene du gjør i scenen — «Godkjenn». */}
              <div className="dh-cover-inn relative z-20 mx-auto mt-8 w-full max-w-[520px] sm:mt-9" style={{ animationDelay: '.14s' }}>
                <AdresseFelt onValgt={valgt} variant="ink" />
              </div>
            </div>
            {/* Scenen: én flate i full bredde. Fyller resten av skjermen. */}
            <div ref={sceneRef} className="dh-cover-inn mx-auto flex w-[calc(100%-32px)] min-w-0 flex-1 flex-col pb-5 sm:w-[calc(100%-64px)] sm:pb-6 lg:w-[calc(100%-80px)] lg:max-w-[1600px] lg:pb-8" style={{ animationDelay: '.12s' }}>
              <HeroStage eiendom={eiendom} bilde={bilde} />
            </div>
          </section>
        ) : (
        <section className="relative lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" data-testid="v4-hero">
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="max-w-[620px]">
              <h1
                className="dh-cover-inn max-w-[9ch] text-[56px] sm:text-[72px] lg:text-[clamp(72px,5.6vw,108px)]"
                style={{ ...display, color: T.ink }}
                data-testid="v4-h1"
              >
                Utleie på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              {/* Mobil: kortere. Ett statement, én setning. */}
              <p className="dh-cover-inn mt-7 max-w-[36ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[21px]" style={{ animationDelay: '.08s' }} data-testid="v4-hero-ingress">
                <span className="sm:hidden">Hele utleien samlet. Mye av arbeidet gjort for deg.</span>
                <span className="hidden sm:inline">Leietakere, kontrakter, husleie og drift — samlet på ett sted, og gjort underveis.</span>
              </p>
              {/* Handlingen er feltet. Forvaltning vs. selvforvaltning velges i steg 2 etter adressen. */}
              {/* relative z-20: forslagslisten skal ligge over scenen (som selv er en stacking context). */}
              <div className="dh-cover-inn relative z-20 mt-9 w-full sm:max-w-[460px]" style={{ animationDelay: '.16s' }}>
                <AdresseFelt onValgt={valgt} />
              </div>
            </div>
            <div ref={sceneRef} className="dh-cover-inn" style={{ animationDelay: '.12s' }}>
              <HeroScene eiendom={eiendom} />
            </div>
          </div>
        </section>
        )}
        {/* Tillit: heroens fot — før produktet. */}
        <TillitStripe />
        <ProduktSeksjon />
        {/* Spor: soft gate rett etter produktet — «autopilot for hvem?» */}
        <SporSeksjon />
        {/* Leietakerens vinkel — AI som forstår boligen. */}
        <LeietakerSeksjon />
        {/* Resten av livssyklusen — fem områder, én linje hver. */}
        <AltSamletSeksjon />
        {/* Spørsmål og svar (inkl. pris — uten upubliserte tall). */}
        <FaqSeksjon />
        {/* Finale: lukker sirkelen — «Utleie på autopilot. Start med adressen din.» */}
        <AvslutningSeksjon />
      </main>
      <Footer />
    </div>
  );
}
