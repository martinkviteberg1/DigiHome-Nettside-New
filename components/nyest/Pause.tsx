import React from 'react';

// ---------------------------------------------------------------------------
// Kapittelbruddet. Én setning i mørket — den oppsummerer de tre stegene
// og lar resten av siden puste. Ingen knapper, ingen pynt.
// ---------------------------------------------------------------------------

export default function Pause() {
  return (
    <section className="bg-[#0a0a0a]" data-testid="nyest-pause">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-28 text-center sm:px-10 sm:py-40 lg:px-16">
        <h2 className="e-reveal e-display mx-auto max-w-[22ch] text-[34px] leading-[1.16] sm:text-[50px] lg:text-[58px]" style={{ color: '#fdfcfb' }}>
          Annonsen ute. Kontrakten signert. Husleien inn.{' '}
          <span style={{ color: '#B78CE8' }}>Automatisk.</span>
        </h2>
      </div>
    </section>
  );
}
