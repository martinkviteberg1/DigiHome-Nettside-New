import React from 'react';

// ---------------------------------------------------------------------------
// Produktbeviset. «Autopilot» er en påstand — dashbordet er dokumentasjonen.
// Én stor flate i en minimal nettleserramme, merket som illustrasjon.
// ---------------------------------------------------------------------------

export default function Plattform() {
  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-plattform">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-24 sm:px-10 sm:pb-32 lg:px-16">
        <h2 className="e-reveal e-h2 max-w-[20ch]">Én plattform for hele utleien<span className="text-[#9B5BD6]">.</span></h2>
        <p className="e-reveal e-lead mt-5 max-w-[54ch]">
          Betalinger, kontrakter, saker og meldinger — samlet i ett rolig dashbord.
        </p>

        <div className="e-reveal mt-12 sm:mt-14">
          <div className="overflow-hidden rounded-[16px] border border-[#e5dfd4] bg-white shadow-[0_40px_90px_-50px_rgba(28,22,14,0.35)]">
            <div className="relative flex items-center border-b border-[#eee9e0] bg-[#faf8f5] px-4 py-2.5">
              <span className="flex items-center gap-1.5" aria-hidden="true">
                <span className="h-[9px] w-[9px] rounded-full bg-[#e5dfd4]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#e5dfd4]" />
                <span className="h-[9px] w-[9px] rounded-full bg-[#e5dfd4]" />
              </span>
              <span className="absolute left-1/2 -translate-x-1/2 rounded-full bg-white px-4 py-1 text-[11.5px] text-[#8d877d]">
                app.digihome.no
              </span>
            </div>
            <img
              src="/deck-desktop.webp"
              alt="Utleiedashbordet i DigiHome-plattformen"
              loading="lazy"
              className="w-full"
            />
          </div>
          <p className="e-meta mt-4">Illustrasjon av utleiedashbordet.</p>
        </div>
      </div>
    </section>
  );
}
