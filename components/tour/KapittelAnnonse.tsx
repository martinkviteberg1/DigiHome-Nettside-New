'use client';

import React from 'react';
import Avslor from './Avslor';
import AnnonseDemo from './mockups/AnnonseDemo';

// ---------------------------------------------------------------------------
// KapittelAnnonse — fortsettelsen av veivalget: Anna valgte «Lag annonse».
// Venstre side forteller, høyre side viser den faktiske flyten fra systemet:
// bilder → AI-skanning → tittel/beskrivelse → markedspris → publisert på FINN.
// ---------------------------------------------------------------------------

export default function KapittelAnnonse() {
  return (
    <section
      data-testid="tour-kap3"
      data-slide="Annonsen"
      className="relative flex min-h-[100dvh] items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:snap-start lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Annonsen</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Annonsen skriver seg selv<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Bildene tas med mobilen. AI-en leser boligen ut av dem — skriver tittel
              og beskrivelse, og foreslår leiepris fra markedsdata. Ett klikk senere
              er annonsen live på FINN.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <AnnonseDemo />
        </Avslor>
      </div>
    </section>
  );
}
