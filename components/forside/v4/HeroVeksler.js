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
export default function HeroVeksler({ hero, produkt = 'ramme' }) {
  const router = useRouter();
  const bytt = (til) => {
    if (til === hero) return;
    try { document.cookie = `dh_hero=${til}; path=/; max-age=31536000; samesite=lax`; } catch (e) { /* ok */ }
    router.refresh();
  };
  /* Produktseksjonen: 'ramme' (kort) ↔ 'full' (full bleed) — egen cookie, egen prikkegruppe (lilla) */
  const byttProdukt = (til) => {
    if (til === produkt) return;
    try { document.cookie = `dh_produkt=${til}; path=/; max-age=31536000; samesite=lax`; } catch (e) { /* ok */ }
    router.refresh();
  };
  return (
    <div
      className="fixed bottom-3 left-3 z-[60] hidden items-center gap-1.5 lg:flex rounded-full px-2 py-1.5 opacity-25 transition-opacity hover:opacity-90 focus-within:opacity-90"
      style={{ transition: `opacity 300ms ${EASE}` }}
      role="group"
      aria-label="Bytt hero-variant"
      data-testid="hero-veksler"
    >
      {[['stage', 'Hero: én scene (standard)'], ['zoom', 'Hero: scenen vokser til fullskjerm ved scroll'], ['zoomfull', 'Hero: fullskjerm — navbaren blir gjennomsiktig over scenen'], ['side', 'Hero: to kolonner']].map(([v, tittel]) => (
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
      <span aria-hidden="true" className="mx-1 h-3 w-px" style={{ background: 'rgba(21,19,15,0.25)' }} />
      {[['ramme', 'Produkt: kort på bakgrunn (standard)'], ['full', 'Produkt: full bleed — bildet er scenen']].map(([v, tittel]) => (
        <button
          key={v}
          type="button"
          onClick={() => byttProdukt(v)}
          title={tittel}
          aria-label={tittel}
          aria-pressed={produkt === v}
          className="flex h-4 w-4 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
          data-testid={`produkt-veksler-${v}`}
        >
          <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full" style={{ background: T.lilla, opacity: produkt === v ? 1 : 0.3, transform: produkt === v ? 'scale(1.15)' : 'scale(1)', transition: `opacity 200ms, transform 200ms ${EASE}` }} />
        </button>
      ))}
    </div>
  );
}
