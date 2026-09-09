'use client';

/* ─────────────────────────────────────────────────────────────────────────────────────
   LosningFilm — Løsningen-sliden (verdensklasse, innenfor viewport, ingen scroll).

   Sliden FORTELLER løsningen og lar forsidens ekte produktanimasjon være beviset.
   Filmene rendres uten hvit ramme (`naken`), rett på slidens bakgrunn; de lyse
   kapitlene gjøres gjennomsiktige. En hvisken av lilla lys gir dybde.

   Passform: på desktop er hele sliden en flex-kolonne med fast høyde (viewport
   minus deckets marger). Overskrift + stegindeks ligger øverst; filmen får resten
   av høyden og SKALERES presist for å fylle den (samme skarpe skala-teknikk som
   forsidens full-stage) — så alt får plass på én skjerm uten scroll. På mobil
   flyter den naturlig (Kompakt-varianten).

   Deck-styrt: `aktiv` = sliden er fremme. Filmene spiller kun da og pauser ellers.
   ───────────────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { T, display } from '@/components/forside/v4/tokens';

const AnnonseFilm = dynamic(() => import('@/components/forside/v4/produkt/AnnonseFilm'));
const KontraktFilm = dynamic(() => import('@/components/forside/v4/produkt/KontraktFilm'));
const DriftFilm = dynamic(() => import('@/components/forside/v4/produkt/DriftFilm'));
const OkonomiFilm = dynamic(() => import('@/components/forside/v4/produkt/OkonomiFilm'));

const H_FILM = 660;   // filmenes designhøyde (desktop)
const LILLA = '#7A3FA8';
const KAP = [
  { id: 'annonse', navn: 'Annonse', linje: 'Fra adressen til utleid — annonsen skriver seg selv og legges ut på FINN.' },
  { id: 'kontrakt', navn: 'Kontrakt', linje: 'Kontrakt og depositum, signert med BankID og dokumentert i protokoll.' },
  { id: 'drift', navn: 'Drift', linje: 'Leietaker melder — håndverker foreslår tid og pris, du godkjenner med ett trykk.' },
  { id: 'okonomi', navn: 'Økonomi', linje: 'Husleie inn, purringer på Vipps, regnskapet fører seg selv.' },
];
const REKKE = KAP.map((k) => k.id);

/* Skalerer filmen (designet W × 660) presist ned til å fylle en gitt høyde uten å miste skarphet:
   rendrer bredere (w/k) og skalerer med k = tilgjengelig høyde / 660. Kun på desktop (skaler=true). */
function FilmSkala({ skaler, children }) {
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    if (!skaler) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    const m = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    m();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(m) : null;
    ro?.observe(el);
    window.addEventListener('resize', m);
    return () => { ro?.disconnect(); window.removeEventListener('resize', m); };
  }, [skaler]);
  if (!skaler) return <div className="relative mt-6 w-full">{children}</div>;
  // La filmen puste: trekk fra ~104px så det alltid er tydelig luft mellom tidslinjen og filmen (ikke «klistret»).
  const k = box.h ? Math.min(1, Math.max(0.2, (box.h - 104) / H_FILM)) : 1;
  const w = box.w && k ? box.w / k : null;
  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[1200px] grow" data-testid="deck-losning-skala" data-k={k.toFixed(3)}>
      <div className="absolute left-1/2 top-1/2" style={{ width: w ? `${w}px` : '100%', height: H_FILM, transform: `translate(-50%, -50%) scale(${k})`, transformOrigin: 'center center' }}>
        {children}
      </div>
    </div>
  );
}

export default function LosningFilm({ aktiv = false, nr = 3 }) {
  const [kap, setKap] = useState('annonse');
  const [bytter, setBytter] = useState(false);
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });
  const [bred, setBred] = useState(true);   // desktop: fast høyde + skalering
  const byttRef = useRef(0);

  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia('(min-width: 1024px)') : null;
    if (!mq) return undefined;
    const s = () => setBred(mq.matches);
    s();
    mq.addEventListener?.('change', s);
    return () => mq.removeEventListener?.('change', s);
  }, []);

  useEffect(() => { if (!aktiv) { setKap('annonse'); setFrem({ andel: 0, ms: 0 }); } }, [aktiv]);
  useEffect(() => { setFrem({ andel: 0, ms: 0 }); }, [kap]);

  const idx = REKKE.indexOf(kap);
  const neste = REKKE[(idx + 1) % REKKE.length];

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

  const scene = (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[160%] w-[130%] -translate-x-1/2 -translate-y-1/2" style={{ background: 'radial-gradient(closest-side, rgba(139,92,246,0.10), rgba(139,92,246,0.03) 55%, rgba(139,92,246,0) 78%)' }} />
      </div>
      <div key={kap} className="relative h-full overflow-hidden rounded-[24px]" style={{ opacity: bytter ? 0 : 1, transition: 'opacity 340ms ease', boxShadow: '0 44px 96px -48px rgba(21,19,15,0.34), 0 14px 34px -22px rgba(21,19,15,0.16)' }} data-testid="deck-losning-scene">
        {kap === 'annonse' && <AnnonseFilm {...felles} />}
        {kap === 'kontrakt' && <KontraktFilm {...felles} />}
        {kap === 'drift' && <DriftFilm {...felles} />}
        {kap === 'okonomi' && <OkonomiFilm {...felles} />}
      </div>
    </>
  );

  return (
    <div
      className={`relative w-full ${bred ? 'h-[calc(100svh-184px)]' : ''}`}
      data-testid="deck-losning-film"
      data-kapittel={kap}
    >
      {/* Filmen står som en rammeløs, «svevende» flate med myke hjørner og en myk skygge — skarp som på forsiden,
          tydelig adskilt fra tidslinjen (ikke «klistret»), uten hvit kant/ramme. */}

      {/* LIT-STAGE — en varm lysning bak fortellingen: det rammeløse innholdet står i et bevisst, opplyst rom. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-[1%] h-[56%] w-[72%] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(closest-side, rgba(255,255,255,0.58), rgba(255,255,255,0) 72%)' }} />
      </div>

      <div className={`relative ${bred ? 'flex h-full flex-col' : ''}`}>
        {/* FORTELLINGEN — én rolig, redaksjonell linje som rammer filmen som «Løsningen». */}
        <div className="deck-inn mx-auto flex w-full max-w-[860px] shrink-0 flex-col items-center pt-1 text-center" style={{ '--i': 0 }}>
          <div className="inline-flex items-center gap-2.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: LILLA }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.28em]" style={{ color: LILLA }}>Løsningen</span>
          </div>
          <h2 className="mt-3.5 text-[22px] leading-[1.1] tracking-[-0.02em] sm:text-[28px] lg:text-[32px]" style={{ ...display, color: T.ink }}>
            Ett system tar over <span style={{ color: LILLA }}>hele driften</span>.
          </h2>
        </div>

        {/* TIDSLINJE — leieforholdets fire steg på én linje: ett system. Lilla fyll rykker frem mens filmen spiller. */}
        <div className="deck-inn mx-auto mt-7 w-full max-w-[620px] shrink-0 lg:mt-9" style={{ '--i': 1 }}>
          <div role="tablist" aria-label="Kapitler i løsningen" className="relative grid grid-cols-4">
            <span aria-hidden="true" className="absolute bottom-[4px] left-[12.5%] right-[12.5%] h-px" style={{ background: 'rgba(21,19,15,0.14)' }} />
            <span
              aria-hidden="true"
              className="absolute bottom-[3px] left-[12.5%] h-[2px] rounded-full"
              style={{ width: `${Math.min(1, (idx + (frem.andel || 0)) / (KAP.length - 1)) * 75}%`, background: LILLA, transition: frem.ms ? `width ${frem.ms}ms linear` : 'width 420ms ease' }}
              data-testid="deck-losning-fremdrift"
            />
            {KAP.map((k, i) => {
              const er = k.id === kap;
              const forbi = i < idx;
              return (
                <button
                  key={k.id}
                  type="button"
                  role="tab"
                  aria-selected={er}
                  onClick={() => velg(k.id)}
                  className="relative flex flex-col items-center gap-2.5 pb-0 focus-visible:outline-none"
                  data-testid={`deck-losning-tab-${k.id}`}
                  data-aktiv={er ? '1' : '0'}
                >
                  <span className="flex items-baseline gap-1.5" style={{ opacity: er ? 1 : forbi ? 0.72 : 0.42, transition: 'opacity 300ms ease' }}>
                    <span className="text-[10px] font-semibold tabular-nums tracking-[0.08em]" style={{ color: er || forbi ? LILLA : T.ink }}>0{i + 1}</span>
                    <span className="text-[13px] tracking-[-0.01em] sm:text-[15px]" style={{ color: T.ink, fontWeight: er ? 600 : 450 }}>{k.navn}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className="relative z-[1] block h-[10px] w-[10px] rounded-full"
                    style={er
                      ? { background: LILLA, boxShadow: '0 0 0 4px rgba(122,63,168,0.16)', transition: 'box-shadow 300ms ease, background-color 300ms ease' }
                      : forbi
                        ? { background: LILLA, transition: 'background-color 300ms ease' }
                        : { background: T.canvas, boxShadow: 'inset 0 0 0 1.5px rgba(21,19,15,0.22)', transition: 'background-color 300ms ease' }}
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* BEVISET — forsidens film er helten: full størrelse, sentrert, rammeløs med myke hjørner (skaleres kun på lave skjermer). */}
        <FilmSkala skaler={bred}>{scene}</FilmSkala>
      </div>
    </div>
  );
}
