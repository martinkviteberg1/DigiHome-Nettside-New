'use client';

import React, { useState } from 'react';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { EASE, Knapp, T, display } from '../motion';
import PortefoljeScene, { STORRELSER } from './PortefoljeScene';

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
        <section className="relative lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" data-testid="v4b-hero">
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:items-center lg:gap-12 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="max-w-[560px]">
              <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4b-label">For eiendomsselskap</p>
              <h1
                className="dh-cover-inn mt-4 max-w-[10ch] text-[52px] sm:text-[68px] lg:text-[clamp(64px,5vw,96px)]"
                style={{ ...display, color: T.ink, animationDelay: '.04s' }}
                data-testid="v4b-h1"
              >
                Porteføljen på autopilot<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-7 max-w-[38ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[20px]" style={{ animationDelay: '.08s' }} data-testid="v4b-ingress">
                Saker, husleie og leietakere på tvers av alle bygg. Systemet drifter — teamet godkjenner, med roller og full historikk.
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

              <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-4" style={{ animationDelay: '.2s' }}>
                <Knapp href="/book-mote" data-testid="v4b-cta">Book en demo</Knapp>
                <span className="text-[14px]" style={{ color: 'rgba(21,19,15,0.5)' }}>30 minutter — med deres portefølje som eksempel.</span>
              </div>
            </div>

            <div className="dh-cover-inn" style={{ animationDelay: '.12s' }}>
              <PortefoljeScene storrelse={storrelse} />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
