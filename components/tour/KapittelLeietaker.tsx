'use client';

import React from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';
import LeietakerDemo from './mockups/LeietakerDemo';

// ---------------------------------------------------------------------------
// KapittelLeietaker — fortsettelsen av annonsen: søknadene lander i portalen,
// AI-en scorer og rangerer kandidatene, kredittsjekk kjøres via Creditsafe —
// og den tryggeste kandidaten anbefales. Utleier tar den endelige avgjørelsen.
// ---------------------------------------------------------------------------

export default function KapittelLeietaker() {
  return (
    <section
      data-testid="tour-kap-leietaker"
      data-slide="Leietakeren"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Leietakeren</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Søknadene sorterer seg selv<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Hver søker kommer med yrke, inntekt og husstand. AI-en scorer
              kandidatene og kjører kredittsjekk gjennom Creditsafe — så ligger
              den tryggeste øverst. Anna tar den endelige avgjørelsen.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <Parallax faktor={0.12}>
            <LeietakerDemo />
          </Parallax>
        </Avslor>
      </div>
    </section>
  );
}
