import React from 'react';

// ---------------------------------------------------------------------------
// Partnere — moderne, rolig grid. Ingen marquee som beveger seg og distraherer.
// Selvsikker overskrift, generøs luft, store logoer med subtil hover-effekt.
// Grupperes visuelt i kategorier (annonsering, signering, betaling, regnskap)
// via en enkel eyebrow-linje over hver rad.
// ---------------------------------------------------------------------------

type Logo = { name: string; src: string; h: number };

const RADER: { label: string; logoer: Logo[] }[] = [
  {
    label: 'Annonsering',
    logoer: [
      { name: 'Finn.no', src: '/finn-logo-full.png', h: 30 },
      { name: 'Airbnb', src: '/airbnb-logo.png', h: 34 },
      { name: 'Booking.com', src: '/booking-logo.png', h: 26 },
    ],
  },
  {
    label: 'Signering og kredittsjekk',
    logoer: [
      { name: 'BankID', src: '/bankid-logo.png', h: 28 },
      { name: 'Creditsafe', src: '/creditsafe-logo.png', h: 26 },
      { name: 'Kartverket', src: '/kartverket-logo.png', h: 32 },
    ],
  },
  {
    label: 'Betaling og depositum',
    logoer: [
      { name: 'Vipps', src: '/vipps-logo.png', h: 30 },
      { name: 'Lea Bank', src: '/leabank-logo.webp', h: 26 },
      { name: 'Keyhole', src: '/keyhole-logo.png', h: 32 },
    ],
  },
  {
    label: 'Regnskap',
    logoer: [
      { name: 'Tripletex', src: '/tripletex-logo.png', h: 26 },
      { name: 'Fiken', src: '/fiken-logo.png', h: 30 },
      { name: 'PowerOffice', src: '/poweroffice-logo.png', h: 26 },
    ],
  },
];

export default function Partnere() {
  return (
    <section className="relative bg-[#fdfcfb]" data-testid="nyest-partners">
      {/* Subtil dot-grid som holder språket fra heroen konsistent. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(120% 60% at 50% 50%, black 40%, transparent 90%)',
          WebkitMaskImage: 'radial-gradient(120% 60% at 50% 50%, black 40%, transparent 90%)',
        }}
      />

      <div className="relative mx-auto w-full max-w-[1400px] px-6 py-24 sm:px-10 sm:py-32 lg:px-16 lg:py-40">
        {/* Overskrift — selvsikker, poetisk, ikke defensive. */}
        <div className="mx-auto max-w-[760px] text-center">
          <p className="e-meta">Integrasjoner</p>
          <h2 className="mt-5 e-display text-[34px] leading-[1.06] tracking-[-0.03em] sm:text-[46px] lg:text-[56px]">
            Norges viktigste tjenester
            <br />
            <span className="text-[#8a827a]">— i bakgrunnen.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-[52ch] text-[15.5px] leading-[1.6] text-[#5b544a] sm:text-[16.5px]">
            Annonsering, signering, betaling og regnskap. Alt er ferdig koblet på,
            så du slipper å tenke på det.
          </p>
        </div>

        {/* Grid — én rad per kategori. Store logoer, generøs luft, subtile
            skiller. Ingen bokser, ingen bakgrunn — logoene får hvile på flaten. */}
        <div className="mt-20 flex flex-col gap-14 sm:mt-24 sm:gap-16 lg:mt-28 lg:gap-20">
          {RADER.map((rad, i) => (
            <div
              key={rad.label}
              className={`relative pt-10 sm:pt-12 ${i > 0 ? 'border-t border-[#0a0a0a]/[0.06]' : ''}`}
            >
              <p className="mb-8 text-center text-[11.5px] font-semibold uppercase tracking-[0.22em] text-[#8a827a] sm:mb-10">
                {rad.label}
              </p>
              <div className="mx-auto flex max-w-[900px] flex-wrap items-center justify-center gap-x-10 gap-y-8 sm:gap-x-16 sm:gap-y-10 lg:gap-x-24">
                {rad.logoer.map((l) => (
                  <img
                    key={l.name}
                    src={l.src}
                    alt={l.name}
                    loading="lazy"
                    style={{ height: l.h }}
                    className="w-auto object-contain opacity-90 transition-all duration-300 hover:scale-[1.04] hover:opacity-100"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
