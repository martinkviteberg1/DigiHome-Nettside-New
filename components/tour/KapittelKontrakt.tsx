'use client';

import React from 'react';
import Avslor from './Avslor';
import Parallax from './Parallax';
import KontraktDemo from './mockups/KontraktDemo';

// ---------------------------------------------------------------------------
// KapittelKontrakt — etter at Emma er valgt: leiekontrakten genereres ferdig
// utfylt i tråd med husleieloven, leietaker velger sikkerhet, begge signerer
// med BankID — og depositumskontoen opprettes automatisk.
// ---------------------------------------------------------------------------

export default function KapittelKontrakt() {
  return (
    <section
      data-testid="tour-kap-kontrakt"
      data-slide="Kontrakten"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Kontrakten</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Signert på minutter<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Leiekontrakten genereres ferdig utfylt — i tråd med husleieloven.
              Emma velger sikkerhet, begge signerer med BankID, og
              depositumskontoen opprettes automatisk. Ingen papirer, ingen venting.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <Parallax faktor={0.12}>
            <KontraktDemo />
          </Parallax>
        </Avslor>
      </div>
    </section>
  );
}
