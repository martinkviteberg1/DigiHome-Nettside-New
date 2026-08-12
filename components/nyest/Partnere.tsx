import React from 'react';

// ---------------------------------------------------------------------------
// Partnere — «Integrert med» i verdensklasse. Én rolig, uendelig marquee av
// integrasjonskort: logo + hva integrasjonen gjør. Gråskala som får farge på
// hover, myke fade-kanter, pauser ved hover. Reduced motion = statisk grid
// håndteres av global CSS (.marquee-track slås av).
// ---------------------------------------------------------------------------

const LOGOS = [
  { name: 'Finn.no', src: '/finn-logo-full.png', h: 22, rolle: 'Annonsering' },
  { name: 'BankID', src: '/bankid-logo.png', h: 22, rolle: 'Signering' },
  { name: 'Vipps', src: '/vipps-logo.png', h: 24, rolle: 'Betalinger' },
  { name: 'Airbnb', src: '/airbnb-logo.png', h: 26, rolle: 'Korttidsutleie' },
  { name: 'Booking.com', src: '/booking-logo.png', h: 20, rolle: 'Korttidsutleie' },
  { name: 'Kartverket', src: '/kartverket-logo.png', h: 26, rolle: 'Eiendomsdata' },
  { name: 'Fiken', src: '/fiken-logo.png', h: 24, rolle: 'Regnskap' },
  { name: 'Tripletex', src: '/tripletex-logo.png', h: 20, rolle: 'Regnskap' },
];

function Kort({ l }: { l: (typeof LOGOS)[number] }) {
  return (
    <div className="group mx-2 flex h-[104px] w-[196px] shrink-0 flex-col items-center justify-center gap-3 rounded-[18px] border border-[#eee9e0] bg-white transition-colors duration-300 hover:border-[#e0d8ca]">
      <img
        src={l.src}
        alt={l.name}
        loading="lazy"
        style={{ height: l.h }}
        className="w-auto object-contain opacity-60 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:grayscale-0"
      />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#b3aa9e] transition-colors duration-300 group-hover:text-[#8a827a]">
        {l.rolle}
      </span>
    </div>
  );
}

export default function Partnere() {
  return (
    <section className="bg-[#fdfcfb] py-20 sm:py-24 lg:py-28" data-testid="nyest-partners">
      <div className="mx-auto w-full max-w-[1400px]">
        <p className="e-reveal mb-4 text-center text-[11.5px] font-semibold uppercase tracking-[0.24em] text-[#8a827a]">
          Integrert med
        </p>
        <p className="e-reveal mx-auto mb-12 max-w-[44ch] px-6 text-center text-[15px] leading-[1.6] text-[#8d877d] sm:mb-14">
          Fra annonse til regnskap — DigiHome snakker med systemene utleien allerede lever i.
        </p>

        <div
          className="marquee-paused relative overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          }}
        >
          <div className="marquee-track flex w-max py-1">
            {[...LOGOS, ...LOGOS].map((l, i) => (
              <Kort key={`${l.name}-${i}`} l={l} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
