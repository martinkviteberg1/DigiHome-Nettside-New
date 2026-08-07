import React from 'react';

// ---------------------------------------------------------------------------
// Samarbeidspartnere — én rolig linje. Gråtonede logoer, ingen rammer.
// ---------------------------------------------------------------------------

const LOGOS = [
  { name: 'Finn.no', src: '/finn-logo-full.png' },
  { name: 'Keyhole', src: '/keyhole-logo.png' },
  { name: 'Airbnb', src: '/airbnb-logo.png' },
  { name: 'Booking.com', src: '/booking-logo.png' },
  { name: 'BankID', src: '/bankid-logo.png' },
  { name: 'Vipps', src: '/vipps-logo.png' },
];

export default function Partnere() {
  return (
    <section className="border-y border-[#eee9e0] bg-[#fdfcfb]" data-testid="nyest-partners">
      <div className="e-shell flex flex-col gap-7 py-10 sm:py-12 lg:flex-row lg:items-center lg:gap-14">
        <p className="e-meta shrink-0">I samarbeid med</p>
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          {LOGOS.map((p) => (
            <img
              key={p.name}
              src={p.src}
              alt={p.name}
              loading="lazy"
              className="h-[20px] w-auto object-contain opacity-60 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0 sm:h-[22px]"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
