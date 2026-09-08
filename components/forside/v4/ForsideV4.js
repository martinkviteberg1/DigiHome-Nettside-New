'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import NavV4 from './NavV4';
import HeroStage, { FILM } from './HeroStage';
import TillitStripe from './TillitStripe';
import SporSeksjon from './SporSeksjon';
import AltSamletSeksjon from './AltSamletSeksjon';
import FaqSeksjon from './FaqSeksjon';
import AvslutningSeksjon from './AvslutningSeksjon';
import Footer from '@/components/dh/Footer';
import AdresseFelt from './AdresseFelt';
import { T, Utsatt, display } from './motion';

/* Ytelse (mobil først): bare det som er over folden — nav, hero, adressefelt — ligger i forsidens startbundle.
   De tunge, animerte seksjonene (portal-mockup, produktfilmene, galleriet, leietaker-scenen) er egne chunks som
   hentes idet brukeren nærmer seg dem (Utsatt + dynamic/ssr:false). Tekstseksjonene (tillit, spor, alt samlet,
   FAQ, finale, footer) er små og server-rendres som før. Hero-variantene 'side'/'zoom' (kun via cookie) og
   veksleren er også egne chunks. */
const HeroScene = dynamic(() => import('./HeroScene'));
const HeroZoom = dynamic(() => import('./HeroZoom'));
const HeroVeksler = dynamic(() => import('./HeroVeksler'), { ssr: false });
const SystemSeksjon = dynamic(() => import('./SystemSeksjon'), { ssr: false, loading: () => <div style={{ minHeight: 'var(--dh-h-system)' }} aria-hidden="true" /> });
const ProduktSeksjon = dynamic(() => import('./produkt/ProduktSeksjon'), { ssr: false, loading: () => <div id="produkt" style={{ minHeight: 'var(--dh-h-produkt)', background: '#DCE1EB' }} aria-hidden="true" /> });
const BoligerSeksjon = dynamic(() => import('./BoligerSeksjon'), { ssr: false, loading: () => <div style={{ minHeight: 'var(--dh-h-boliger)' }} aria-hidden="true" /> });
const LeietakerSeksjon = dynamic(() => import('./LeietakerSeksjon'), { ssr: false, loading: () => <div style={{ minHeight: 'var(--dh-h-leietaker)' }} aria-hidden="true" /> });

/* Varm opp chunkene i ledig tid etter at siden er lastet (i rekkefølgen de kommer på siden) — så monteringen
   ved scroll ikke venter på nettet. Skjer aldri før load, og aldri på tregt nett / datasparing. */
function useForvarm() {
  useEffect(() => {
    let avbrutt = false;
    let idle = 0; let t = 0;
    const con = typeof navigator !== 'undefined' ? navigator.connection : null;
    if (con && (con.saveData || /(^|-)2g$/.test(con.effectiveType || ''))) return undefined;
    const kjor = async () => {
      const deler = [() => import('./SystemSeksjon'), () => import('./produkt/ProduktSeksjon'), () => import('./BoligerSeksjon'), () => import('./LeietakerSeksjon')];
      for (const d of deler) { if (avbrutt) return; try { await d(); } catch (e) { /* ok */ } }
    };
    const start = () => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(() => { kjor(); }, { timeout: 4000 });
      else t = window.setTimeout(kjor, 1500);
    };
    if (document.readyState === 'complete') t = window.setTimeout(start, 800);
    else window.addEventListener('load', () => { t = window.setTimeout(start, 800); }, { once: true });
    return () => { avbrutt = true; if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle); window.clearTimeout(t); };
  }, []);
}

/* ---------------------------------------------------------------------------
   ForsideV4 — fra scratch. Første akt: hero.

   Eiendom × autonom software. Ikke «AI-laboratorium».
   · PP Right Grotesk som display, ABC Diatype i alt annet (appens fonter).
   · DigiHome-lilla er primærhandling — en brand asset, ikke bare et punktum.
   · Heroen følger navens kanter (full-bleed grid), én levende flate til høyre.
   · Én idé: bolig → DigiHome driver boligen → se hvor lite du måtte gjøre.
   · Siste akt er brukerens: adressefeltet i heroen ER første steg i onboardingen.
--------------------------------------------------------------------------- */

/* hero: 'side' (to kolonner), 'stage' (sentrert setning + én scene i full bredde — Sana-strukturen) eller
   'zoom' (som stage, men scenen vokser til fullskjerm når du scroller — HeroZoom).
   bilde: midlertidig scenebilde for 'stage' ('stue' | 'bygg') til footagen finnes. */
export default function ForsideV4({ hero = 'side', bilde = null, veksler = false, produkt = 'ramme' }) {
  /* Adressefeltet: valg → knappen blir «Fortsett» → onboardingen. Scenen (mannen og filmen)
     forblir som den er — boligen vises først i onboardingen (kart → Street View). */
  const sceneRef = useRef(null);
  const valgt = useCallback(() => {}, []);
  const eiendom = null;
  useForvarm();

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="forside-v4">
      <NavV4 />
      <main>
        {hero === 'stage' || hero === 'zoom' || hero === 'zoomfull' ? (
          <section className="relative flex flex-col" data-testid="v4-hero">
            {/* Én setning. Én linje. Én handling — sentrert, ingenting konkurrerer. */}
            <div className="mx-auto w-full max-w-[1100px] px-5 pb-7 pt-7 text-center sm:px-8 sm:pb-9 sm:pt-14 lg:pb-11 lg:pt-16">
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
              <div className="dh-cover-inn relative z-20 mx-auto mt-7 w-full max-w-[520px] sm:mt-9" style={{ animationDelay: '.14s' }}>
                <AdresseFelt onValgt={valgt} variant="ink" />
              </div>
            </div>
            {/* Scenen: én flate, litt bredere enn seksjonene under, 16:9 (filmens eget format — ingen beskjæring). */}
            {hero === 'zoom' || hero === 'zoomfull' ? (
              /* lg+: scenen pinnes og vokser til fullskjerm ved scroll (HeroZoom). zoomfull: helt opp under navbaren,
                 som slipper bakgrunnen mens scenen er hel. Under lg: vanlig kort (ren CSS). */
              <div ref={sceneRef} className="dh-cover-inn w-full" style={{ animationDelay: '.12s' }}>
                <HeroZoom fullskjerm={hero === 'zoomfull'}><HeroStage eiendom={eiendom} bilde={bilde || 'stue'} film={bilde ? null : FILM} zoom /></HeroZoom>
              </div>
            ) : (
              /* Scenen (LCP) står der fra første bilde — ingen opacity-inngang: et bilde som først tegnes med opacity 0
                 telles ikke som LCP av Chrome, og brukeren ser den tidligere. Teksten over har fortsatt inngangen. */
              <div ref={sceneRef} className="mx-auto w-full max-w-[1600px] min-w-0 px-4 pb-6 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:pb-8">
                <HeroStage eiendom={eiendom} bilde={bilde || 'stue'} film={bilde ? null : FILM} />
              </div>
            )}
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
        {/* Systemet i ro: portalen (eier) + appen (leietaker) — før filmene viser det i arbeid. Egen chunk, monteres når den nærmer seg. */}
        <Utsatt id="system" minHeight="var(--dh-h-system)"><SystemSeksjon /></Utsatt>
        <Utsatt id="produkt" minHeight="var(--dh-h-produkt)" className="bg-[#DCE1EB]"><ProduktSeksjon key={produkt} variant={produkt} /></Utsatt>
        {/* Bevis: boligene som driftes gjennom DigiHome — kort i bevegelse. */}
        <Utsatt id="boliger" minHeight="var(--dh-h-boliger)"><BoligerSeksjon /></Utsatt>
        {/* Spor: soft gate rett etter produktet — «autopilot for hvem?» */}
        <SporSeksjon />
        {/* Leietakerens vinkel — AI som forstår boligen. */}
        <Utsatt id="leietaker" minHeight="var(--dh-h-leietaker)"><LeietakerSeksjon /></Utsatt>
        {/* Resten av livssyklusen — fem områder, én linje hver. */}
        <AltSamletSeksjon />
        {/* Spørsmål og svar (inkl. pris — uten upubliserte tall). */}
        <FaqSeksjon />
        {/* Finale: lukker sirkelen — «Utleie på autopilot. Start med adressen din.» */}
        <AvslutningSeksjon />
      </main>
      <Footer />
      {veksler && <HeroVeksler hero={hero} produkt={produkt} />}
    </div>
  );
}
