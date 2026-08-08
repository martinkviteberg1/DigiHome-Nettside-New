'use client';

import React from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';
import OnboardingDemo from './mockups/OnboardingDemo';

// ---------------------------------------------------------------------------
// KapittelOnboarding — hele onboardingen på én fullskjerm-slide. Venstre side
// forteller kort, høyre side viser: en selvspillende, rammeløs demo der
// adressefeltet fylles ut og morpher til et kontaktskjema.
// ---------------------------------------------------------------------------

export default function KapittelOnboarding() {
  return (
    <section
      data-testid="tour-kap1"
      data-slide="Onboarding"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Onboarding</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Alt starter med én adresse<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Utleier registrerer boligen én gang. Plattformen henter offentlige data,
              og kontoen opprettes på minutter — resten skjer automatisk.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <Parallax faktor={0.12}>
            <OnboardingDemo />
          </Parallax>
        </Avslor>
      </div>
    </section>
  );
}
