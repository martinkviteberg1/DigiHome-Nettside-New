import React from 'react';
import Avslor from './Avslor';

// ---------------------------------------------------------------------------
// HvaEr — side to. Forklarer kort og presist hva DigiHome er. Skrevet for
// investorer: rolig, faktisk, uten salgsspråk. Ren typografi, ingen bokser.
// ---------------------------------------------------------------------------

export default function HvaEr() {
  return (
    <section
      data-testid="tour-hvaer"
      data-slide="Hva er DigiHome"
      className="flex min-h-[100dvh] items-center justify-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:snap-start lg:py-0"
    >
      <div className="mx-auto max-w-[880px] text-center">
        <Avslor>
          <p className="e-label">Hva er DigiHome</p>
        </Avslor>

        <Avslor delay={90}>
          <h2 className="e-display mt-6 text-[34px] sm:mt-7 sm:text-[48px] lg:text-[56px]">
            En AI-drevet plattform for automatisert boligutleie<span className="text-[#9B5BD6]">.</span>
          </h2>
        </Avslor>

        <Avslor delay={190}>
          <p className="e-lead mx-auto mt-8 max-w-[56ch] sm:mt-10">
            Plattformen håndterer hele leieforholdet — annonsering, visninger, kontrakt,
            depositum og løpende husleie. Oppgaver som tidligere krevde en forvalter,
            utføres nå av programvare.
          </p>
        </Avslor>

        <Avslor delay={280}>
          <p className="e-lead mx-auto mt-5 max-w-[56ch]">
            Utleier administrerer boligen selv, til en brøkdel av kostnaden ved tradisjonell
            forvaltning. Samme plattform skalerer fra én leilighet til hele porteføljer.
          </p>
        </Avslor>
      </div>
    </section>
  );
}
