import React from 'react';
import { partners } from '@/lib/site';

// Lånt autoritet, satt som kolofon: én linje med hårfine kanter over og under.
// Den gamle utgaven var en marquee som beveget seg av seg selv — bevegelse
// uten hensikt trekker blikket fra innholdet og leser som dekor.
export default function ProofBand() {
  const medLogo = partners.filter((p: any) => p.logo);
  const utenLogo = partners.filter((p: any) => !p.logo);

  return (
    <section className="border-y border-[#e6e1d9] bg-[#f6f3ee]" data-testid="partners-bar">
      <div className="e-shell py-7 sm:py-8">
        <div className="grid lg:grid-cols-12 gap-y-5 gap-x-10 items-center">
          <p className="e-label lg:col-span-2">Vi jobber med</p>
          <div className="lg:col-span-10 flex flex-wrap items-center gap-x-7 gap-y-4">
            {medLogo.map((p: any) => (
              <img
                key={p.name}
                src={p.logo}
                alt={p.name}
                loading="lazy"
                className="h-[18px] sm:h-5 w-auto object-contain opacity-65 mix-blend-multiply"
              />
            ))}
            {utenLogo.map((p: any, i: number) => (
              <span key={p.name} className="flex items-center gap-7">
                {i === 0 ? <span className="hidden sm:block w-px h-4 bg-[#d6cfc4]" aria-hidden="true" /> : null}
                <span className="text-[13.5px] font-medium text-[#6f6a60] whitespace-nowrap">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
