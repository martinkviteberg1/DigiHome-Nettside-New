import React from 'react';
import AdresseFelt from './AdresseFelt';

// ---------------------------------------------------------------------------
// Avslutningen — samme handling som i heroen. Sirkelen sluttes.
// ---------------------------------------------------------------------------

export default function Slutt() {
  return (
    <section className="border-t border-[#eee9e0] bg-[#fdfcfb]" data-testid="nyest-slutt">
      <div className="e-shell flex flex-col items-center py-24 text-center sm:py-32">
        <h2 className="e-display max-w-[16ch] text-[36px] sm:text-[52px]">
          Klar? Start med adressen<span className="text-[#9B5BD6]">.</span>
        </h2>
        <div className="mt-10 w-full max-w-[520px]">
          <AdresseFelt source="nyest_slutt" testId="nyest-slutt-address" />
        </div>
      </div>
    </section>
  );
}
