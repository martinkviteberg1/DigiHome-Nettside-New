'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { EASE, T } from './motion';

/* ---------------------------------------------------------------------------
   HeroVeksler — superdiskret bryter nederst til venstre for å sammenligne
   heroene på roten: 'side' (to kolonner) ↔ 'stage' (sentrert + én scene).
   Valget lagres i en cookie (dh_hero) så serveren rendrer riktig hero uten
   blink. Kun et designverktøy under arbeidet — fjernes når formen er valgt.
--------------------------------------------------------------------------- */
export default function HeroVeksler({ hero }) {
  const router = useRouter();
  const bytt = (til) => {
    if (til === hero) return;
    try { document.cookie = `dh_hero=${til}; path=/; max-age=31536000; samesite=lax`; } catch (e) { /* ok */ }
    router.refresh();
  };
  return (
    <div
      className="fixed bottom-3 left-3 z-[60] flex items-center gap-1.5 rounded-full px-2 py-1.5 opacity-25 transition-opacity hover:opacity-90 focus-within:opacity-90"
      style={{ transition: `opacity 300ms ${EASE}` }}
      role="group"
      aria-label="Bytt hero-variant"
      data-testid="hero-veksler"
    >
      {[['side', 'Hero: to kolonner'], ['stage', 'Hero: én scene']].map(([v, tittel]) => (
        <button
          key={v}
          type="button"
          onClick={() => bytt(v)}
          title={tittel}
          aria-label={tittel}
          aria-pressed={hero === v}
          className="flex h-4 w-4 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
          data-testid={`hero-veksler-${v}`}
        >
          <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full" style={{ background: T.ink, opacity: hero === v ? 1 : 0.28, transform: hero === v ? 'scale(1.15)' : 'scale(1)', transition: `opacity 200ms, transform 200ms ${EASE}` }} />
        </button>
      ))}
    </div>
  );
}
