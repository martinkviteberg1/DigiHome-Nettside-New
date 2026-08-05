import React from 'react';
import { partners } from '@/lib/site';

// ---------------------------------------------------------------------------
// Lånt autoritet på én linje.
//
// To småkapitel-labeler og fem navn i pille-merker var to seksjoner for mye.
// Nå: logoene til venstre i full farge, og fagfolkene som én rolig setning til
// høyre. Ingen etiketter, ingen rammer — bare det som er sant.
// ---------------------------------------------------------------------------

const KANALER = ['Finn.no', 'Airbnb', 'Booking.com'];

export default function ProofBand() {
  const kanaler = partners.filter((p: any) => KANALER.includes(p.name) && p.logo);
  const fagfolk = partners.filter((p: any) => !KANALER.includes(p.name));

  return (
    <section className="border-y border-[#eee9e0] bg-[#fdfcfb]" data-testid="partners-bar">
      <div className="e-shell flex flex-col gap-8 py-10 sm:py-12 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
          {kanaler.map((p: any) => (
            <img
              key={p.name}
              src={p.logo}
              alt={p.name}
              loading="lazy"
              className="h-[21px] w-auto object-contain sm:h-[23px]"
            />
          ))}
        </div>

        <p className="e-meta max-w-[54ch] lg:text-right">
          Renhold, vedlikehold, jus og forsikring er satt ut til {fagfolk.map((p: any) => p.name).join(', ')}.
        </p>
      </div>
    </section>
  );
}
