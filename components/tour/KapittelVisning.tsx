'use client';

import React from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';
import VisningDemo from './mockups/VisningDemo';

// ---------------------------------------------------------------------------
// KapittelVisning — etter at annonsen er live: interessentene booker
// visningstid selv, kapasiteten styres automatisk, og bekreftelse +
// påminnelse går på SMS. Utleier trenger bare å møte opp.
// ---------------------------------------------------------------------------

export default function KapittelVisning() {
  return (
    <section
      data-testid="tour-kap-visning"
      data-slide="Visningen"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Visningen</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Visningen fyller seg selv<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Interessentene fra annonsen velger visningstid selv — med
              kapasitetsstyring og venteliste. Bekreftelse og påminnelse går
              automatisk på SMS. Anna trenger bare å møte opp.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <Parallax faktor={0.12}>
            <VisningDemo />
          </Parallax>
        </Avslor>
      </div>
    </section>
  );
}
