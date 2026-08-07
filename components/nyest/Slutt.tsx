import React from 'react';
import AdresseFelt from './AdresseFelt';

// ---------------------------------------------------------------------------
// Avslutningen — samme handling som i heroen. Sirkelen sluttes.
// ---------------------------------------------------------------------------

export default function Slutt() {
  return (
    <section className="relative overflow-hidden border-t border-[#eee9e0] bg-[#fdfcfb]" data-testid="nyest-slutt">
      {/* Speiler heroens lys — nederst, som en rolig avslutning. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[420px]"
        style={{ background: 'radial-gradient(60% 80% at 50% 100%, #f6f2ea 0%, rgba(246,242,234,0) 65%)' }}
      />
      <div className="e-shell relative flex flex-col items-center py-24 text-center sm:py-32">
        <h2 className="e-reveal e-display max-w-[16ch] text-[36px] sm:text-[52px]">
          Klar? Start med adressen<span className="text-[#9B5BD6]">.</span>
        </h2>
        <div className="e-reveal mt-10 w-full max-w-[520px]">
          <AdresseFelt source="nyest_slutt" testId="nyest-slutt-address" />
        </div>
      </div>
    </section>
  );
}
