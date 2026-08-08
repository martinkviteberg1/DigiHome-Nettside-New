'use client';

import React, { useState } from 'react';
import Avslor from './Avslor';
import OnboardingDemo from './mockups/OnboardingDemo';

// ---------------------------------------------------------------------------
// KapittelOnboarding — hele onboardingen på én fullskjerm-slide. Venstre side
// forteller, høyre side viser: en selvspillende mockup der adressen fylles ut
// og kontoen opprettes. Delstegene i teksten markeres i takt med demoen.
// ---------------------------------------------------------------------------

const DELSTEG = [
  {
    nr: '01',
    tittel: 'Adressen',
    tekst: 'Boligdata hentes automatisk fra Kartverket og Matrikkelen — ingenting fylles ut to ganger.',
  },
  {
    nr: '02',
    tittel: 'Kontoen',
    tekst: 'Kontaktinfo på plass, identitet bekreftet med BankID — og boligen er klar for utleie.',
  },
];

export default function KapittelOnboarding() {
  const [iKonto, setIKonto] = useState(false);

  return (
    <section
      data-testid="tour-kap1"
      data-slide="Onboarding"
      className="relative flex min-h-[100dvh] items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:snap-start lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Kapittel 01 · Onboarding</p>
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

          {/* Delsteg — markeres i takt med demoen til høyre. */}
          <Avslor delay={260}>
            <div className="mt-9 space-y-6">
              {DELSTEG.map((s, i) => {
                const aktivDel = (i === 1) === iKonto;
                return (
                  <div
                    key={s.nr}
                    className={`flex gap-4 transition-opacity duration-500 ${
                      aktivDel ? 'opacity-100' : 'opacity-40'
                    }`}
                  >
                    <span className="e-index mt-[5px]">{s.nr}</span>
                    <div>
                      <p
                        className="text-[17px] font-bold tracking-[-0.02em] text-[#0a0a0a]"
                        style={{ fontFamily: 'var(--font-heading), sans-serif' }}
                      >
                        {s.tittel}
                      </p>
                      <p className="mt-1 max-w-[40ch] text-[14px] leading-[1.6] text-[#6F6A60]">
                        {s.tekst}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <OnboardingDemo onKonto={setIKonto} />
        </Avslor>
      </div>
    </section>
  );
}
