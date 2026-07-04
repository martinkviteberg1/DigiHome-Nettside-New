
import React from 'react';
import Reveal from '@/components/dh/Reveal';

const partners = [
  'Finn.no',
  'Airbnb',
  'Booking.com',
  'Ability',
  'HG Eiendomservice',
  'Hoffmann Thinn',
  'Söderberg & Partners',
  'IKEA',
];

export default function PartnersSection() {
  return (
    <section className="py-16 sm:py-20 bg-white border-t border-[#f0f0f0]" data-testid="partners-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal as="p"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-[11px] font-semibold text-[#8f8a80] uppercase tracking-[0.22em] mb-10"
        >
          Samarbeidspartnere
        </Reveal>
      </div>

      {/* Uendelig marquee med kant-fade */}
      <Reveal as="div"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="relative overflow-hidden marquee-paused"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 14%, black 86%, transparent)',
        }}
      >
        <div className="marquee-track flex items-center gap-x-16 sm:gap-x-24 w-max pr-16 sm:pr-24">
          {[...partners, ...partners].map((name: string, i: number) => (
            <span
              key={`${name}-${i}`}
              className="text-[18px] sm:text-[21px] font-bold tracking-tight text-[#c6c2bc] hover:text-[#8a8a8a] transition-colors duration-300 whitespace-nowrap"
              style={{ fontFamily: 'var(--font-heading)' }}
              title={name}
            >
              {name}
            </span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
