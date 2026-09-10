'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
export default function ForsideV4({ bilde = null, produkt = 'ramme' }) {
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
        {/* Hero: sentrert setning + én levende scene (HeroStage med FILM.direkte). */}
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
                <p className="mt-3.5 text-[14.5px]" style={{ color: 'rgba(21,19,15,0.6)' }}>
                  Skal du bare lage en leiekontrakt? <Link href="/utleier/husleiekontrakt" className="font-medium underline underline-offset-4 transition-colors hover:decoration-current" style={{ color: T.ink, textDecorationColor: 'rgba(21,19,15,0.28)' }}>Lag en gratis husleiekontrakt</Link> med BankID.
                </p>
              </div>
            </div>
            {/* Scenen (LCP): én flate, litt bredere enn seksjonene under. Står der fra første bilde — ingen
                opacity-inngang (et bilde som først tegnes med opacity 0 telles ikke som LCP av Chrome). */}
            <div ref={sceneRef} className="mx-auto w-full max-w-[1600px] min-w-0 px-4 pb-6 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:pb-8">
              <HeroStage eiendom={eiendom} bilde={bilde || 'stue'} film={bilde ? null : FILM} />
            </div>
          </section>
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
    </div>
  );
}
