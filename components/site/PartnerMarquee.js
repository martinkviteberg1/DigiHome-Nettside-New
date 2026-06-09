'use client';

import Image from 'next/image';
import { partners } from '@/lib/site';

export function PartnerMarquee() {
  const items = [...partners, ...partners];
  return (
    <div className="relative overflow-hidden marquee-paused">
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-r from-canvas to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-20 sm:w-32 bg-gradient-to-l from-canvas to-transparent z-10" />
      <div className="flex items-center gap-12 sm:gap-16 marquee-track w-max py-2">
        {items.map((p, i) =>
          p.logo ? (
            <Image
              key={`${p.name}-${i}`}
              src={p.logo}
              alt={p.name}
              width={120}
              height={32}
              className="h-7 w-auto object-contain opacity-50 hover:opacity-100 transition grayscale hover:grayscale-0 shrink-0"
            />
          ) : (
            <span
              key={`${p.name}-${i}`}
              className="text-xl font-bold text-ink/30 hover:text-ink/70 transition tracking-tight whitespace-nowrap shrink-0"
            >
              {p.name}
            </span>
          )
        )}
      </div>
    </div>
  );
}
