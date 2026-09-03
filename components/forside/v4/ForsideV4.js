'use client';

import React, { useState } from 'react';
import NavV4 from './NavV4';
import HeroScene from './HeroScene';
import { T, displayFor, Knapp, Lenke } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV4 — fra scratch. Første akt: hero.

   Split: løftet til venstre, én levende, frameless flate til høyre.
   Varm nøytral canvas. Display-stemme velges live (serif / grotesk) —
   velgeren er et midlertidig beslutningsverktøy for preview.
   Én idé: hvor mye av utleien vil du at DigiHome skal ta seg av?
--------------------------------------------------------------------------- */

export default function ForsideV4() {
  const [font, setFont] = useState('serif');
  const display = displayFor(font);

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="forside-v4" data-font={font}>
      <NavV4 />
      <main>
        <section className="relative" data-testid="v4-hero">
          <div className="mx-auto grid w-full max-w-[1280px] gap-12 px-6 pb-20 pt-10 sm:px-8 sm:pt-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16 lg:pb-28 lg:pt-12">
            <div className="max-w-[560px]">
              <h1
                className={`dh-cover-inn max-w-[9ch] ${font === 'serif' ? 'text-[60px] sm:text-[80px] lg:text-[104px]' : 'text-[52px] sm:text-[68px] lg:text-[84px]'}`}
                style={{ ...display, color: T.ink }}
                data-testid="v4-h1"
              >
                Utleie på autopilot<span style={{ color: T.lilla }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-8 max-w-[38ch] text-[18px] leading-[1.5] text-[#15130F]/70 sm:text-[20px]" style={{ animationDelay: '.08s' }}>
                Fra leietaker og kontrakt til husleie, drift og leverandører — DigiHome samler hele utleien og gjør arbeidet underveis.
              </p>
              <p className="dh-cover-inn mt-4 max-w-[38ch] text-[16px] leading-[1.5] text-[#15130F]/50" style={{ animationDelay: '.12s' }} data-testid="v4-hero-micro">
                Bruk plattformen selv, eller la oss forvalte for deg.
              </p>
              <div className="dh-cover-inn mt-9 flex flex-wrap items-center gap-6" style={{ animationDelay: '.16s' }}>
                <Knapp href="/omvisning" data-testid="v4-hero-cta">Se DigiHome</Knapp>
                <Lenke href="/forvaltning" data-testid="v4-hero-sekundaer">Få hjelp med utleien</Lenke>
              </div>
            </div>
            <div className="dh-cover-inn" style={{ animationDelay: '.12s' }}>
              <HeroScene font={font} />
            </div>
          </div>
        </section>
      </main>

      {/* Midlertidig: fontvelger for beslutning i preview. Fjernes når valget er tatt. */}
      <div className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-0.5 rounded-full bg-white/90 p-1 text-[12.5px] shadow-[0_8px_24px_-12px_rgba(21,19,15,0.35),0_0_0_1px_rgba(21,19,15,0.08)] backdrop-blur-sm" role="group" aria-label="Velg displayfont" data-testid="v4-font-toggle">
        <span className="px-2 text-[#15130F]/50">Aa</span>
        {[['serif', 'Serif'], ['grotesk', 'Grotesk']].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFont(v)} aria-pressed={font === v} data-testid={`v4-font-${v}`}
            className={`h-7 rounded-full px-3 font-medium transition-colors ${font === v ? 'bg-[#15130F] text-white' : 'text-[#15130F]/70 hover:bg-[#15130F]/[0.06]'}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}
