import React from 'react';

// ---------------------------------------------------------------------------
// Partnere — «Integrert med». To rolige, motgående marquee-rader med
// integrasjonskort i FULL FARGE: logo + hva integrasjonen gjør. Myke
// fade-kanter, pause ved hover, subtil løft på hover. Reduced motion slår av
// animasjonen globalt (.marquee-track).
// ---------------------------------------------------------------------------

const RAD_A = [
  { name: 'Finn.no', src: '/finn-logo-full.png', h: 24, rolle: 'Annonsering' },
  { name: 'BankID', src: '/bankid-logo.png', h: 24, rolle: 'Signering' },
  { name: 'Vipps', src: '/vipps-logo.png', h: 26, rolle: 'Betalinger' },
  { name: 'Airbnb', src: '/airbnb-logo.png', h: 28, rolle: 'Korttidsutleie' },
];
const RAD_B = [
  { name: 'Booking.com', src: '/booking-logo.png', h: 22, rolle: 'Korttidsutleie' },
  { name: 'Kartverket', src: '/kartverket-logo.png', h: 28, rolle: 'Eiendomsdata' },
  { name: 'Fiken', src: '/fiken-logo.png', h: 26, rolle: 'Regnskap' },
  { name: 'Tripletex', src: '/tripletex-logo.png', h: 22, rolle: 'Regnskap' },
];

function Kort({ l }: { l: (typeof RAD_A)[number] }) {
  return (
    <div className="group mx-2 flex h-[96px] w-[200px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-[20px] border border-[#eee9e0] bg-white shadow-[0_1px_2px_rgba(28,22,14,0.03)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#e0d8ca] hover:shadow-[0_18px_40px_-24px_rgba(28,22,14,0.25)]">
      <img
        src={l.src}
        alt={l.name}
        loading="lazy"
        style={{ height: l.h }}
        className="w-auto object-contain"
      />
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#b3aa9e] transition-colors duration-300 group-hover:text-[#8a827a]">
        {l.rolle}
      </span>
    </div>
  );
}

function Rad({ logos, revers = false }: { logos: typeof RAD_A; revers?: boolean }) {
  const innhold = [...logos, ...logos, ...logos]; // 3× for sømløs -50 %-loop
  return (
    <div
      className="marquee-paused relative overflow-hidden"
      style={{
        maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
      }}
    >
      <div
        className="marquee-track flex w-max py-2"
        style={revers ? { animationDirection: 'reverse', animationDuration: '44s' } : { animationDuration: '38s' }}
      >
        {[...innhold, ...innhold].map((l, i) => (
          <Kort key={`${l.name}-${i}`} l={l} />
        ))}
      </div>
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
        <p className="e-reveal mx-auto mb-10 max-w-[44ch] px-6 text-center text-[15px] leading-[1.6] text-[#8d877d] sm:mb-12">
          Fra annonse til regnskap — DigiHome snakker med systemene utleien allerede lever i.
        </p>

        <div className="e-reveal space-y-3">
          <Rad logos={RAD_A} />
          <Rad logos={RAD_B} revers />
        </div>
      </div>
    </section>
  );
}
