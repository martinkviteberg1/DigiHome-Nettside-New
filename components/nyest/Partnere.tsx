import React from 'react';

// ---------------------------------------------------------------------------
// Samarbeidspartnere — én rolig, langsom strøm i full farge. Myke kanter,
// ingen rammer. Settet speiler partnersiden i presentasjonen.
// ---------------------------------------------------------------------------

const LOGOS = [
  { name: 'Finn.no', src: '/finn-logo-full.png', h: 22 },
  { name: 'Keyhole', src: '/keyhole-logo.png', h: 24 },
  { name: 'Airbnb', src: '/airbnb-logo.png', h: 26 },
  { name: 'Booking.com', src: '/booking-logo.png', h: 19 },
  { name: 'BankID', src: '/bankid-logo.png', h: 21 },
  { name: 'Vipps', src: '/vipps-logo.png', h: 23 },
  { name: 'Creditsafe', src: '/creditsafe-logo.png', h: 19 },
  { name: 'Lea Bank', src: '/leabank-logo.webp', h: 19 },
  { name: 'Kartverket', src: '/kartverket-logo.png', h: 24 },
  { name: 'Tripletex', src: '/tripletex-logo.png', h: 19 },
  { name: 'Fiken', src: '/fiken-logo.png', h: 22 },
  { name: 'PowerOffice', src: '/poweroffice-logo.png', h: 19 },
];

function Rekke({ skjult = false }: { skjult?: boolean }) {
  return (
    <div aria-hidden={skjult || undefined} className="flex w-max shrink-0 items-center gap-x-14 pr-14">
      {LOGOS.map((p) => (
        <img
          key={p.name}
          src={p.src}
          alt={skjult ? '' : p.name}
          loading="lazy"
          style={{ height: p.h }}
          className="w-auto object-contain"
        />
      ))}
    </div>
  );
}

export default function Partnere() {
  return (
    <section className="border-y border-[#eee9e0] bg-[#fdfcfb]" data-testid="nyest-partners">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-7 px-6 py-10 sm:px-10 sm:py-12 lg:flex-row lg:items-center lg:gap-12 lg:px-16">
        <p className="e-meta shrink-0">I samarbeid med</p>
        <div
          className="min-w-0 flex-1 overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 7%, black 93%, transparent)',
          }}
        >
          <div className="marquee-track flex w-max items-center">
            <Rekke />
            <Rekke skjult />
          </div>
        </div>
      </div>
    </section>
  );
}
