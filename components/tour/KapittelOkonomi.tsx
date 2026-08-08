'use client';

import React from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';
import OkonomiDemo from './mockups/OkonomiDemo';

// ---------------------------------------------------------------------------
// KapittelOkonomi — det rolige dashbord-øyeblikket: husleien kreves inn,
// purres og utbetales automatisk. Hver måned lander et ferdig eieroppgjør
// i portalen — brutto, honorar og netto, med PDF til regnskapet.
// ---------------------------------------------------------------------------

export default function KapittelOkonomi() {
  return (
    <section
      data-testid="tour-kap-okonomi"
      data-slide="Økonomien"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Økonomien</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Oppgjør på autopilot<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Husleien kreves inn, purres og utbetales automatisk. Hver måned
              lander et ferdig eieroppgjør i portalen — innbetalt leie, honorar
              og netto utbetalt, med PDF rett til regnskapet.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <Parallax faktor={0.12}>
            <OkonomiDemo />
          </Parallax>
        </Avslor>
      </div>
    </section>
  );
}
