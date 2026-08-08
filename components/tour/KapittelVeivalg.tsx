'use client';

import React from 'react';
import Avslor from './Avslor';
import VeivalgDemo from './mockups/VeivalgDemo';

// ---------------------------------------------------------------------------
// KapittelVeivalg — øyeblikket etter onboarding: huseierportalens «Hva vil du
// gjøre nå?». Tre likestilte veier inn — annonse, kontrakt eller eksisterende
// leieforhold. Demoen vurderer valgene og lander på «Lag annonse», som setter
// opp neste kapittel.
// ---------------------------------------------------------------------------

export default function KapittelVeivalg() {
  return (
    <section
      data-testid="tour-kap2"
      data-slide="Veivalget"
      className="relative flex min-h-[100dvh] items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:snap-start lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Huseierportalen</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Tre veier inn<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Boligen er tom, leietakeren er funnet — eller noen bor der allerede.
              Alle veier er likestilte: utleier velger situasjonen sin, og
              plattformen tar det derfra.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <VeivalgDemo />
        </Avslor>
      </div>
    </section>
  );
}
