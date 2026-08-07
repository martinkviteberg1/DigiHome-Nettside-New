import React from 'react';

// ---------------------------------------------------------------------------
// Partnere — strengt minimalistisk. Én eyebrow, én rad logoer, generøs luft.
// Ingen kategorier, ingen H2, ingen dot-grid, ingen bevegelse. Logoene får
// hvile på flaten som partnerbevis, ikke som markedsføring.
// ---------------------------------------------------------------------------

const LOGOS = [
  { name: 'Finn.no', src: '/finn-logo-full.png', h: 24 },
  { name: 'Airbnb', src: '/airbnb-logo.png', h: 28 },
  { name: 'Booking.com', src: '/booking-logo.png', h: 22 },
  { name: 'BankID', src: '/bankid-logo.png', h: 24 },
  { name: 'Vipps', src: '/vipps-logo.png', h: 26 },
  { name: 'Kartverket', src: '/kartverket-logo.png', h: 28 },
  { name: 'Fiken', src: '/fiken-logo.png', h: 26 },
  { name: 'Tripletex', src: '/tripletex-logo.png', h: 22 },
];

export default function Partnere() {
  return (
    <section className="bg-[#fdfcfb] py-20 sm:py-24 lg:py-28" data-testid="nyest-partners">
      <div className="mx-auto w-full max-w-[1280px] px-6 sm:px-10 lg:px-16">
        <p className="mb-14 text-center text-[11.5px] font-semibold uppercase tracking-[0.24em] text-[#8a827a] sm:mb-16">
          Integrert med
        </p>
        <div className="mx-auto grid max-w-[1100px] grid-cols-2 items-center gap-x-8 gap-y-10 sm:grid-cols-3 sm:gap-x-12 sm:gap-y-12 lg:grid-cols-4 lg:gap-x-16 lg:gap-y-14">
          {LOGOS.map((l) => (
            <div key={l.name} className="flex items-center justify-center">
              <img
                src={l.src}
                alt={l.name}
                loading="lazy"
                style={{ height: l.h }}
                className="w-auto object-contain opacity-80 transition-opacity duration-300 hover:opacity-100"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
