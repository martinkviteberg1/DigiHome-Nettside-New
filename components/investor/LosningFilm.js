'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   LosningFilm — produktet i den nydelige hvite rammen, tilpasset Løsningen-sliden.

   Gjenbruker forsidens produktfilmer (Annonse · Kontrakt · Drift · Økonomi) i den
   hvite rammen, men uten forsidens bakgrunn — rammen står rett på decket, i HØYRE
   kolonne ved siden av teksten. Styrt av DECKET (ikke skroll):

   · `aktiv` (slide 03 fremme) er avspillingsporten. Klokken går bare når sliden er
     aktiv og PAUSER ellers — ingen film dekoder/animerer i bakgrunnen (ytelse).
   · Filmene lastes (dynamic) og monteres først når sliden er besøkt («tent»).
   · Kapitlene spiller videre av seg selv og looper. Kompakt kapittelpille over
     rammen. Reduced-motion → rolig (filmene håndterer det selv).
   ───────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { EASE } from '@/components/forside/v4/motion';
import { Kapittelpille } from '@/components/forside/v4/kapittelbar';

const AnnonseFilm = dynamic(() => import('@/components/forside/v4/produkt/AnnonseFilm'), { ssr: false });
const KontraktFilm = dynamic(() => import('@/components/forside/v4/produkt/KontraktFilm'), { ssr: false });
const DriftFilm = dynamic(() => import('@/components/forside/v4/produkt/DriftFilm'), { ssr: false });
const OkonomiFilm = dynamic(() => import('@/components/forside/v4/produkt/OkonomiFilm'), { ssr: false });

const LAST = {
  annonse: () => import('@/components/forside/v4/produkt/AnnonseFilm'),
  kontrakt: () => import('@/components/forside/v4/produkt/KontraktFilm'),
  drift: () => import('@/components/forside/v4/produkt/DriftFilm'),
  okonomi: () => import('@/components/forside/v4/produkt/OkonomiFilm'),
};

const TABS = [
  { id: 'annonse', navn: 'Annonse', klar: true },
  { id: 'kontrakt', navn: 'Kontrakt', klar: true },
  { id: 'drift', navn: 'Drift', klar: true },
  { id: 'okonomi', navn: 'Økonomi', klar: true },
];
const REKKE = TABS.map((t) => t.id);

export default function LosningFilm({ aktiv = false }) {
  const [tent, setTent] = useState(false);          // filmene monteres først når sliden er besøkt
  const [valgt, setValgt] = useState('annonse');
  const [bytter, setBytter] = useState(false);      // kapittelbytte: gammelt tones ut før nytt monteres
  const [holdH, setHoldH] = useState(null);         // hold rammens høyde under byttet (ingen hopp)
  const [frem, setFrem] = useState({ andel: 0, ms: 0 });
  const byttRef = useRef(0);
  const sceneRef = useRef(null);

  /* Tenn ved første besøk og la den stå tent (ingen re-mount senere) */
  useEffect(() => { if (aktiv) setTent(true); }, [aktiv]);

  /* Forhåndslast de øvrige kapitlene når sliden tennes — byttet skal ikke vente på nettet */
  useEffect(() => {
    if (!tent) return undefined;
    const t = window.setTimeout(() => { REKKE.forEach((id) => LAST[id]?.().catch(() => {})); }, 600);
    return () => window.clearTimeout(t);
  }, [tent]);

  const idx = REKKE.indexOf(valgt);
  const nesteId = REKKE[(idx + 1) % REKKE.length];
  const nesteNavn = TABS.find((t) => t.id === nesteId)?.navn || null;

  const onFremdrift = useCallback((f) => setFrem(f), []);
  useEffect(() => { setFrem({ andel: 0, ms: 0 }); }, [valgt]);

  /* Slipp høyden mykt fra gammel til ny film etter byttet */
  const slippH = (tok) => {
    const el = sceneRef.current;
    const barn = el?.firstElementChild;
    if (!el || !barn) { setHoldH(null); return; }
    setHoldH(barn.offsetHeight);
    window.setTimeout(() => { if (byttRef.current === tok) setHoldH(null); }, 450);
  };

  /* Filmen er ferdig → gli til neste kapittel (loop). Returner true så filmen ikke selv looper. */
  const videre = useCallback(() => {
    const el = sceneRef.current;
    if (el) setHoldH(el.offsetHeight);
    setBytter(true);
    const tok = byttRef.current + 1; byttRef.current = tok;
    window.setTimeout(() => {
      if (byttRef.current !== tok) return;
      setValgt(nesteId); setBytter(false);
      window.setTimeout(() => { if (byttRef.current === tok) slippH(tok); }, 700);
    }, 300);
    return true;
  }, [nesteId]);

  /* Manuelt valg fra kapittelpillen */
  const bytt = (id) => {
    if (id === valgt) return;
    const el = sceneRef.current;
    if (el) setHoldH(el.offsetHeight);
    setBytter(true);
    const tok = byttRef.current + 1; byttRef.current = tok;
    window.setTimeout(() => {
      if (byttRef.current !== tok) return;
      setValgt(id); setBytter(false);
      window.setTimeout(() => { if (byttRef.current === tok) slippH(tok); }, 700);
    }, 260);
  };

  const filmProps = { synlig: aktiv, spiller: aktiv, tema: 'lys', onFerdig: videre, onFremdrift, neste: nesteNavn };

  return (
    <div className="w-full" data-testid="deck-losning-film" data-tent={tent ? '1' : '0'} data-kapittel={valgt}>
      {/* Kompakt kapittelpille over rammen — samme kontroll som forsiden */}
      <div className="flex justify-center lg:justify-start">
        <Kapittelpille
          tabs={TABS.map((t) => ({ id: t.id, navn: t.navn, klar: t.klar }))}
          aktiv={valgt}
          frem={frem}
          kapitler={REKKE}
          velg={bytt}
          tema="lys"
          kompakt
          testid="deck-losning-pille"
        />
      </div>

      {/* Rammen — én film om gangen, kryss­toner ved bytte (key → ny montering). Høyden holdes under byttet. */}
      <div ref={sceneRef} className="mt-5 w-full sm:mt-6" style={{ minHeight: holdH || undefined, transition: `min-height 400ms ${EASE}` }}>
        {tent ? (
          <div key={valgt} className="w-full" style={{ opacity: bytter ? 0 : 1, transform: bytter ? 'translateY(-8px)' : 'none', transition: `opacity 300ms ${EASE}, transform 300ms ${EASE}` }}>
            {valgt === 'annonse' && <AnnonseFilm {...filmProps} />}
            {valgt === 'kontrakt' && <KontraktFilm {...filmProps} />}
            {valgt === 'drift' && <DriftFilm {...filmProps} />}
            {valgt === 'okonomi' && <OkonomiFilm {...filmProps} />}
          </div>
        ) : (
          <div aria-hidden="true" className="w-full rounded-[18px]" style={{ height: 440, background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)' }} />
        )}
      </div>
    </div>
  );
}
