'use client';

import React, { useCallback, useRef, useState } from 'react';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import AdresseFelt from '../AdresseFelt';
import { T, display } from '../motion';
import BoligScene from './BoligScene';

/* ---------------------------------------------------------------------------
   PrivatV4 — undersiden for private huseiere. Første akt: hero.

   Søsteren til forsiden, én bolig nærmere: «Utleie på autopilot» →
   «Boligen på autopilot». Du leier ut selv — uten å gjøre alt selv.

   Handlingen er adressefeltet (samme som forsiden): din adresse → din
   bolig i scenen, og første steg i onboardingen. Scenen er det som skiller
   siden fra forsiden: ikke én dag, men ett helt leieår — og hvor lite av
   det som var ditt.
--------------------------------------------------------------------------- */

export default function PrivatV4() {
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
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="privat-v4">
      <NavV4 />
      <main>
        <section className="relative lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" data-testid="v4p-hero">
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="min-w-0 max-w-[600px]">
              <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4p-label">For private huseiere</p>
              <h1
                className="dh-cover-inn mt-4 max-w-[10ch] text-[52px] sm:text-[68px] lg:text-[clamp(64px,5vw,96px)]"
                style={{ ...display, color: T.ink, animationDelay: '.04s' }}
                data-testid="v4p-h1"
              >
                Boligen på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-7 max-w-[38ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[20px]" style={{ animationDelay: '.08s' }} data-testid="v4p-ingress">
                <span className="sm:hidden">Lei ut selv — uten å gjøre alt selv. Kontrakt, husleie og oppfølging går av seg selv.</span>
                <span className="hidden sm:inline">Lei ut selv — uten å gjøre alt selv. Kontrakt, husleie og oppfølging går av seg selv. Du godkjenner det som koster.</span>
              </p>

              {/* Handlingen er feltet. relative z-20: forslagslisten skal ligge over scenen. */}
              <div className="dh-cover-inn relative z-20 mt-9 w-full sm:max-w-[460px]" style={{ animationDelay: '.16s' }}>
                <AdresseFelt onValgt={valgt} />
              </div>
              <p className="dh-cover-inn mt-4 text-[14px]" style={{ color: 'rgba(21,19,15,0.5)', animationDelay: '.22s' }} data-testid="v4p-under">
                Hele Norge · ingen bindingstid · klar på ti minutter
              </p>
            </div>

            <div ref={sceneRef} className="dh-cover-inn min-w-0" style={{ animationDelay: '.12s' }}>
              <BoligScene eiendom={eiendom} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
