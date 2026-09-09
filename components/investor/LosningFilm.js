'use client';

/* ─────────────────────────────────────────────────────────────────────────────────────
   LosningFilm — Løsningen-sliden (verdensklasse-utgave).

   Sliden FORTELLER løsningen og lar forsidens ekte produktanimasjon være beviset.
   Editorial overskrift (svaret på forrige slide: fragmentert, manuell drift),
   en raffinert stegindeks, og filmen — uten hvit ramme (`naken`), rett på slidens
   bakgrunn. De lyse kapitlene gjøres gjennomsiktige (ingen lyst panel), så
   produktet flyter på lerretet; en hvisken av lilla lys gir rammeløst innhold dybde.

   Deck-styrt: `aktiv` = sliden er fremme. Filmene spiller kun da og pauser ellers.
   Når et kapittel er ferdig tar vi over (onFerdig → true) og bytter til neste.
   ───────────────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { T, display, DIM, SVAK } from '@/components/forside/v4/tokens';

const AnnonseFilm = dynamic(() => import('@/components/forside/v4/produkt/AnnonseFilm'));
const KontraktFilm = dynamic(() => import('@/components/forside/v4/produkt/KontraktFilm'));
const DriftFilm = dynamic(() => import('@/components/forside/v4/produkt/DriftFilm'));
const OkonomiFilm = dynamic(() => import('@/components/forside/v4/produkt/OkonomiFilm'));

const LILLA = '#7A3FA8';
const KAP = [
  { id: 'annonse', navn: 'Annonse', linje: 'Fra adressen til utleid — annonsen skriver seg selv og legges ut på FINN.' },
  { id: 'kontrakt', navn: 'Kontrakt', linje: 'Kontrakt og depositum, signert med BankID og dokumentert i protokoll.' },
  { id: 'drift', navn: 'Drift', linje: 'Leietaker melder — håndverker foreslår tid og pris, du godkjenner med ett trykk.' },
  { id: 'okonomi', navn: 'Økonomi', linje: 'Husleie inn, purringer på Vipps, regnskapet fører seg selv.' },
];
const REKKE = KAP.map((k) => k.id);

export default function LosningFilm({ aktiv = false, nr = 3 }) {
  const [kap, setKap] = useState('annonse');
  const [bytter, setBytter] = useState(false);
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });
  const byttRef = useRef(0);

  useEffect(() => { if (!aktiv) { setKap('annonse'); setFrem({ andel: 0, ms: 0 }); } }, [aktiv]);
  useEffect(() => { setFrem({ andel: 0, ms: 0 }); }, [kap]);

  const idx = REKKE.indexOf(kap);
  const neste = REKKE[(idx + 1) % REKKE.length];
  const aktivKap = KAP[idx] || KAP[0];

  const videre = useCallback(() => {
    setBytter(true);
    const tok = byttRef.current + 1; byttRef.current = tok;
    window.setTimeout(() => { if (byttRef.current === tok) { setKap(neste); setBytter(false); } }, 360);
    return true;
  }, [neste]);

  const onFremdrift = useCallback((f) => setFrem(f), []);

  const velg = (id) => {
    if (id === kap) return;
    setBytter(true);
    const tok = byttRef.current + 1; byttRef.current = tok;
    window.setTimeout(() => { if (byttRef.current === tok) { setKap(id); setBytter(false); } }, 260);
  };

  const felles = { synlig: aktiv, spiller: aktiv, tema: 'lys', naken: true, neste: null, onFerdig: videre, onFremdrift };

  return (
    <div className="relative w-full" data-testid="deck-losning-film" data-kapittel={kap}>
      {/* De lyse kapitlene (Annonse/Kontrakt) gjøres gjennomsiktige — ingen lyst panel, innholdet flyter på lerretet.
          De mørke (Drift/Økonomi) er fulle kino-scener og beholder sitt eget foto. */}
      <style>{`
        [data-testid="deck-losning-film"] [data-testid="v4-annonse-desktop"],
        [data-testid="deck-losning-film"] [data-testid="v4-annonse-kompakt"],
        [data-testid="deck-losning-film"] [data-testid="v4-start-kompakt"],
        [data-testid="deck-losning-film"] [data-testid="v4-kontrakt-desktop"],
        [data-testid="deck-losning-film"] [data-testid="v4-kontrakt-kompakt"] { background: transparent !important; }
      `}</style>

      {/* FORTELLINGEN — svaret på problem-sliden, satt med redaksjonell ro */}
      <div className="relative mx-auto max-w-[760px] text-center">
        <div className="deck-inn inline-flex items-center gap-2.5" style={{ '--i': 0 }}>
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: LILLA }} />
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em]" style={{ color: LILLA }}>Løsningen</span>
        </div>
        <h2 className="deck-inn mt-5 text-[36px] leading-[0.98] sm:text-[50px] lg:text-[60px]" style={{ ...display, color: T.ink, letterSpacing: '-0.035em', '--i': 1 }}>
          <span className="block">
            <span className="deck-ord mr-[0.2em]" style={{ '--o': 0 }}>Ett</span>
            <span className="deck-ord" style={{ '--o': 1 }}>system.</span>
          </span>
          <span className="block" style={{ color: LILLA }}>
            <span className="deck-ord mr-[0.2em]" style={{ '--o': 2 }}>Hele</span>
            <span className="deck-ord" style={{ '--o': 3 }}>driften.</span>
          </span>
        </h2>
        <p className="deck-inn mx-auto mt-5 max-w-[50ch] text-[15px] leading-[1.55] sm:text-[16.5px]" style={{ color: DIM, '--i': 2 }}>
          Der dagens verktøy stopper, tar DigiHome over. Fra adressen til ferdig regnskap går leieforholdet av seg selv — eieren godkjenner bare det som betyr noe.
        </p>
      </div>

      {/* STEGINDEKS — leieforholdets fire steg. Felles hårlinje-baseline; aktivt steg lyser med lilla fremdrift. */}
      <div className="deck-inn mx-auto mt-9 max-w-[760px] lg:mt-11" style={{ '--i': 3 }}>
        <div role="tablist" aria-label="Kapitler i løsningen" className="relative flex items-stretch justify-center gap-8 sm:gap-14">
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px" style={{ background: 'rgba(21,19,15,0.10)' }} />
          {KAP.map((k, i) => {
            const er = k.id === kap;
            return (
              <button
                key={k.id}
                type="button"
                role="tab"
                aria-selected={er}
                onClick={() => velg(k.id)}
                className="group relative flex items-baseline gap-2 pb-3 focus-visible:outline-none"
                style={{ color: T.ink, opacity: er ? 1 : 0.4, transition: 'opacity 300ms ease' }}
                data-testid={`deck-losning-tab-${k.id}`}
                data-aktiv={er ? '1' : '0'}
              >
                <span className="text-[10.5px] font-semibold tabular-nums tracking-[0.08em]" style={{ color: er ? LILLA : 'currentColor', opacity: er ? 1 : 0.7 }}>0{i + 1}</span>
                <span className="text-[14px] tracking-[-0.01em] sm:text-[16px]" style={{ fontWeight: er ? 600 : 450 }}>{k.navn}</span>
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 z-[1] h-[2px] overflow-hidden rounded-full" style={{ background: 'transparent' }}>
                  <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: LILLA, width: er ? `${Math.max(4, Math.round(frem.andel * 1000) / 10)}%` : '0%', transition: er && frem.ms ? `width ${frem.ms}ms linear` : 'width 300ms ease' }} data-testid={er ? 'deck-losning-fremdrift' : undefined} />
                </span>
              </button>
            );
          })}
        </div>
        <p key={`linje-${kap}`} className="mx-auto mt-4 max-w-[52ch] text-center text-[13.5px] leading-[1.5] duration-500 animate-in fade-in-0" style={{ color: SVAK }} data-testid="deck-losning-steglinje">{aktivKap.linje}</p>
      </div>

      {/* BEVISET — forsidens animasjon, uten ramme. En hvisken av lilla lys bak gir det rammeløse innholdet dybde. */}
      <div className="relative mt-6 lg:mt-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[160%] w-[130%] -translate-x-1/2 -translate-y-1/2" style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.10), rgba(139,92,246,0.03) 55%, rgba(139,92,246,0) 78%)' }} />
        </div>
        <div key={kap} className="relative" style={{ opacity: bytter ? 0 : 1, transition: 'opacity 340ms ease' }} data-testid="deck-losning-scene">
          {kap === 'annonse' && <AnnonseFilm {...felles} />}
          {kap === 'kontrakt' && <KontraktFilm {...felles} />}
          {kap === 'drift' && <DriftFilm {...felles} />}
          {kap === 'okonomi' && <OkonomiFilm {...felles} />}
        </div>
      </div>
    </div>
  );
}
