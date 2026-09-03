'use client';

import React from 'react';
import NavV4 from './NavV4';
import HeroScene from './HeroScene';
import { T, display, Knapp, Lenke } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV4 — fra scratch. Første akt: hero.

   Eiendom × autonom software. Ikke «AI-laboratorium».
   · PP Right Grotesk som display, ABC Diatype i alt annet (appens fonter).
   · DigiHome-lilla er primærhandling — en brand asset, ikke bare et punktum.
   · Heroen følger navens kanter (full-bleed grid), én levende flate til høyre.
   · Én idé: bolig → DigiHome driver boligen → se hvor lite du måtte gjøre.
--------------------------------------------------------------------------- */

export default function ForsideV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="forside-v4">
      <NavV4 />
      <main>
        <section className="relative" data-testid="v4-hero">
          <div className="grid w-full gap-12 px-5 pb-16 pt-8 sm:px-8 sm:pt-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-10 lg:pb-24 lg:pt-8 2xl:gap-20">
            <div className="max-w-[620px] lg:pl-2">
              <h1
                className="dh-cover-inn max-w-[9ch] text-[54px] sm:text-[72px] lg:text-[clamp(72px,5.6vw,108px)]"
                style={{ ...display, color: T.ink }}
                data-testid="v4-h1"
              >
                Utleie på autopilot<span style={{ color: T.lilla }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-8 max-w-[36ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:text-[21px]" style={{ animationDelay: '.08s' }} data-testid="v4-hero-ingress">
                Leietakere, kontrakter, husleie og drift — samlet på ett sted, og gjort underveis.
              </p>
              <div className="dh-cover-inn mt-9 flex flex-wrap items-center gap-x-7 gap-y-4" style={{ animationDelay: '.16s' }}>
                <Knapp href="/omvisning" data-testid="v4-hero-cta">Se DigiHome</Knapp>
                <Lenke href="/forvaltning" data-testid="v4-hero-sekundaer">Eller la oss forvalte for deg</Lenke>
              </div>
            </div>
            <div className="dh-cover-inn" style={{ animationDelay: '.12s' }}>
              <HeroScene />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
