'use client';

import React from 'react';
import Avslor from './Avslor';
import ChatDemo from './mockups/ChatDemo';

// ---------------------------------------------------------------------------
// KapittelChat — hverdagen etter innflytting: leietakeren chatter med
// DigiHome AI døgnet rundt. Assistenten svarer, oppretter saker og kobler
// på forvalteren når det trengs — utleier ser alt, uten å løfte en finger.
// ---------------------------------------------------------------------------

export default function KapittelChat() {
  return (
    <section
      data-testid="tour-kap-chat"
      data-slide="Hverdagen"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten */}
        <div>
          <Avslor>
            <p className="e-label">Hverdagen</p>
          </Avslor>
          <Avslor delay={90}>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              AI-en svarer først<span className="text-[#9B5BD6]">.</span>
            </h2>
          </Avslor>
          <Avslor delay={180}>
            <p className="e-lead mt-5 max-w-[46ch]">
              Leietakeren chatter med DigiHome AI — døgnet rundt. Assistenten
              svarer, oppretter saker og kobler på forvalteren når det trengs.
              Anna ser hele tråden, uten å løfte en finger.
            </p>
          </Avslor>
        </div>

        {/* Høyre — den selvspillende demoen */}
        <Avslor delay={200}>
          <ChatDemo />
        </Avslor>
      </div>
    </section>
  );
}
