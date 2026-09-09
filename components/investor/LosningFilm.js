'use client';

/* ─────────────────────────────────────────────────────────────────────────────────────
   LosningFilm — Løsningen-sliden.

   Sliden FORTELLER løsningen: en editorial overskrift (svaret på forrige slide —
   fragmentert, manuell drift) rammer inn forsidens ekte produktanimasjon som
   BEVIS. Samme filmer som forsiden (Annonse → Kontrakt → Drift → Økonomi), men
   uten den hvite rammen (`naken`) — animasjonen skjer rett på slidens bakgrunn.

   Deck-styrt: `aktiv` = sliden er fremme. Filmene spiller kun da (synlig+spiller)
   og pauser ellers — ytelse. Når et kapittel er ferdig tar vi over (onFerdig → true)
   og bytter til neste; livssyklusen er en sirkel. Kapittelindeksen viser hvor vi
   er (klikkbar) med lilla fremdriftslinje.
   ───────────────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { T, display, DIM, SVAK } from '@/components/forside/v4/tokens';

/* Filmene hentes som egne chunks — samme komponenter som forsiden bruker. */
const AnnonseFilm = dynamic(() => import('@/components/forside/v4/produkt/AnnonseFilm'));
const KontraktFilm = dynamic(() => import('@/components/forside/v4/produkt/KontraktFilm'));
const DriftFilm = dynamic(() => import('@/components/forside/v4/produkt/DriftFilm'));
const OkonomiFilm = dynamic(() => import('@/components/forside/v4/produkt/OkonomiFilm'));

const LILLA = '#7A3FA8';
const KAP = [
  { id: 'annonse', navn: 'Annonse', linje: 'Fra adressen til utleid — annonsen skriver seg selv.' },
  { id: 'kontrakt', navn: 'Kontrakt', linje: 'Kontrakt og depositum, signert med BankID.' },
  { id: 'drift', navn: 'Drift', linje: 'Leietaker melder — håndverker bookes med ett trykk.' },
  { id: 'okonomi', navn: 'Økonomi', linje: 'Husleie inn, purringer ut, regnskapet fører seg selv.' },
];
const REKKE = KAP.map((k) => k.id);

export default function LosningFilm({ aktiv = false, nr = 3 }) {
  const [kap, setKap] = useState('annonse');
  const [bytter, setBytter] = useState(false);              // gammelt kapittel tones ut før nytt monteres
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });    // fremdrift i aktivt kapittel (den lilla linja)
  const byttRef = useRef(0);

  /* Sliden ikke fremme → tilbake til start (adressen), så den alltid åpner på adresse-steget som forsiden. */
  useEffect(() => { if (!aktiv) { setKap('annonse'); setFrem({ andel: 0, ms: 0 }); } }, [aktiv]);
  useEffect(() => { setFrem({ andel: 0, ms: 0 }); }, [kap]);

  const idx = REKKE.indexOf(kap);
  const neste = REKKE[(idx + 1) % REKKE.length];
  const aktivKap = KAP[idx] || KAP[0];

  /* Filmen kaller denne når den er ferdig. Returnerer true → filmen looper ikke, vi bytter til neste kapittel. */
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

  /* Samme props som forsiden gir filmene — men naken (ingen hvit ramme) og tema 'lys' (forsidens standard). */
  const felles = { synlig: aktiv, spiller: aktiv, tema: 'lys', naken: true, neste: null, onFerdig: videre, onFremdrift };

  return (
    <div className="w-full" data-testid="deck-losning-film" data-kapittel={kap}>
      {/* FORTELLINGEN — svaret på forrige slide: étt system tar over hele driften */}
      <div className="mx-auto max-w-[760px] text-center">
        <div className="deck-inn flex items-center justify-center gap-3" style={{ '--i': 0 }}>
          <span className="text-[11px] font-semibold tabular-nums tracking-[0.12em]" style={{ color: LILLA }}>{String(nr).padStart(2, '0')}</span>
          <span aria-hidden="true" className="h-px w-7" style={{ background: 'linear-gradient(90deg, rgba(122,63,168,0.5), rgba(122,63,168,0))' }} />
          <span className="text-[12.5px] font-medium tracking-[0.01em]" style={{ color: SVAK }}>Løsningen<span style={{ color: 'rgba(21,19,15,0.35)' }}> · med autopilot</span></span>
        </div>
        <h2 className="deck-inn mt-4 text-[30px] sm:text-[40px] lg:text-[48px]" style={{ ...display, color: T.ink, letterSpacing: '-0.025em', lineHeight: 1.03, '--i': 1 }}>
          <span className="deck-ord mr-[0.24em]" style={{ '--o': 0 }}>Étt</span>
          <span className="deck-ord" style={{ '--o': 1 }}>system.</span>{' '}
          <span className="deck-ord mr-[0.24em]" style={{ '--o': 2, color: LILLA }}>Hele</span>
          <span className="deck-ord" style={{ '--o': 3, color: LILLA }}>driften.</span>
        </h2>
        <p className="deck-inn mx-auto mt-4 max-w-[54ch] text-[14.5px] leading-[1.55] sm:text-[15.5px]" style={{ color: DIM, '--i': 2 }}>
          Der dagens verktøy stopper, tar DigiHome over. Leieforholdet går autonomt — fra adressen til ferdig regnskap. Eieren godkjenner bare det som betyr noe.
        </p>
      </div>

      {/* Kapittelindeksen — de fire stegene i leieforholdet. Aktivt steg lyser; lilla linje = fremdrift. */}
      <div role="tablist" aria-label="Kapitler i løsningen" className="deck-inn mt-9 flex items-center justify-center gap-6 sm:gap-10 lg:mt-10" style={{ '--i': 3 }}>
        {KAP.map((k, i) => {
          const er = k.id === kap;
          return (
            <button
              key={k.id}
              type="button"
              role="tab"
              aria-selected={er}
              onClick={() => velg(k.id)}
              className="relative flex items-baseline gap-2 pb-2.5 text-[13px] tracking-[-0.005em] transition-opacity duration-300 focus-visible:outline-none sm:text-[14.5px]"
              style={{ color: T.ink, opacity: er ? 1 : 0.42, fontWeight: er ? 500 : 400 }}
              data-testid={`deck-losning-tab-${k.id}`}
              data-aktiv={er ? '1' : '0'}
            >
              <span className="text-[10.5px] font-medium tabular-nums sm:text-[11px]" style={{ opacity: 0.7 }}>0{i + 1}</span>
              <span>{k.navn}</span>
              <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px] overflow-hidden rounded-full" style={{ background: er ? 'rgba(21,19,15,0.12)' : 'transparent', transition: 'background-color 300ms ease' }}>
                <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: LILLA, width: er ? `${Math.max(3, Math.round(frem.andel * 1000) / 10)}%` : '0%', transition: er && frem.ms ? `width ${frem.ms}ms linear` : 'width 300ms ease' }} data-testid={er ? 'deck-losning-fremdrift' : undefined} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Én linje som knytter det aktive steget til fortellingen */}
      <p key={`linje-${kap}`} className="mx-auto mt-4 max-w-[46ch] text-center text-[13.5px] leading-[1.5] duration-500 animate-in fade-in-0" style={{ color: SVAK }} data-testid="deck-losning-steglinje">{aktivKap.linje}</p>

      {/* BEVISET — forsidens animasjon, uten ramme, rett på bakgrunnen. Mykt kryssbytte mellom kapitlene. */}
      <div key={kap} className="mt-5 lg:mt-6" style={{ opacity: bytter ? 0 : 1, transition: 'opacity 340ms ease' }} data-testid="deck-losning-scene">
        {kap === 'annonse' && <AnnonseFilm {...felles} />}
        {kap === 'kontrakt' && <KontraktFilm {...felles} />}
        {kap === 'drift' && <DriftFilm {...felles} />}
        {kap === 'okonomi' && <OkonomiFilm {...felles} />}
      </div>
    </div>
  );
}
