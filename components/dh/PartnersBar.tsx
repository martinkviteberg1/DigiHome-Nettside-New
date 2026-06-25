'use client';

import React from 'react';
import { motion } from 'framer-motion';

const partners = [
  {
    name: 'Finn.no',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Finn.no
      </span>
    ),
  },
  {
    name: 'Airbnb',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Airbnb
      </span>
    ),
  },
  {
    name: 'Booking.com',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Booking.com
      </span>
    ),
  },
  {
    name: 'Ability',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Ability
      </span>
    ),
  },
  {
    name: 'HG Eiendomservice',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        HG Eiendomservice
      </span>
    ),
  },
  {
    name: 'Hoffmann Thinn',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Hoffmann Thinn
      </span>
    ),
  },
  {
    name: 'Söderberg & Partners',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        Söderberg & Partners
      </span>
    ),
  },
  {
    name: 'IKEA',
    logo: (
      <span className="text-[18px] sm:text-[20px] font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
        IKEA
      </span>
    ),
  },
];

export default function PartnersSection() {
  return (
    <section className="py-16 sm:py-20 bg-white border-t border-[#f0f0f0]" data-testid="partners-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center text-[12px] font-semibold text-[#737373] uppercase tracking-[0.1em] mb-10"
        >
          Samarbeidspartnere
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex flex-wrap items-center justify-center gap-x-10 sm:gap-x-14 lg:gap-x-20 gap-y-6"
        >
          {partners.map((p: any) => (
            <div
              key={p.name}
              className="text-[#c0c0c0] hover:text-[#888] transition-colors duration-300"
              title={p.name}
            >
              {p.logo}
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
