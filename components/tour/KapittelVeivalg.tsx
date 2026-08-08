'use client';

import React, { useEffect, useRef, useState } from 'react';
import Avslor from './Avslor';
import VeivalgDemo from './mockups/VeivalgDemo';
import AnnonseDemo from './mockups/AnnonseDemo';

// ---------------------------------------------------------------------------
// KapittelVeivalg — huseierportalens «Hva vil du gjøre nå?» som glir rett
// over i annonseflyten på samme slide: demoen vurderer de tre veiene inn,
// velger «Lag annonse» — og både kapittelteksten og demoen krysstoner til
// annonsen som bygger seg selv (bilder → AI → pris → publisert på DigiHome
// og FINN). Etter publisering starter reisen stille på nytt.
// ---------------------------------------------------------------------------

export default function KapittelVeivalg() {
  const rot = useRef<HTMLElement | null>(null);
  const [synlig, setSynlig] = useState(false);
  const [del, setDel] = useState<'veivalg' | 'annonse'>('veivalg');
  const [runde, setRunde] = useState(0);

  useEffect(() => {
    const el = rot.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSynlig(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        setSynlig(entry.isIntersecting);
        if (!entry.isIntersecting) {
          // Ute av syne: nullstill hele reisen til neste besøk.
          setDel('veivalg');
          setRunde((r) => r + 1);
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const iAnnonse = del === 'annonse';
  const skift = 'transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]';

  return (
    <section
      ref={rot}
      data-testid="tour-kap2"
      data-slide="Huseierportalen"
      className="relative flex min-h-[100dvh] snap-start items-center px-5 py-20 sm:px-8 lg:h-[100dvh] lg:py-0"
    >
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-16 xl:gap-24">
        {/* Venstre — kapittelteksten morpher i takt med demoen */}
        <div className="grid">
          <div
            className={`[grid-area:1/1] ${skift} ${
              !iAnnonse ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
            }`}
            aria-hidden={iAnnonse}
          >
            <Avslor>
              <p className="e-label">Huseierportalen</p>
            </Avslor>
            <Avslor delay={90}>
              <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
                Tre veier inn<span className="text-[#9B5BD6]">.</span>
              </h2>
            </Avslor>
            <Avslor delay={180}>
              <p className="e-lead mt-5 max-w-[46ch]">
                Boligen er tom, leietakeren er funnet — eller noen bor der allerede.
                Alle veier er likestilte: utleier velger situasjonen sin, og
                plattformen tar det derfra.
              </p>
            </Avslor>
          </div>

          <div
            className={`[grid-area:1/1] ${skift} ${
              iAnnonse ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'
            }`}
            aria-hidden={!iAnnonse}
          >
            <p className="e-label">Annonsen</p>
            <h2 className="e-display mt-5 text-[34px] sm:text-[42px] lg:text-[46px]">
              Annonsen skriver seg selv<span className="text-[#9B5BD6]">.</span>
            </h2>
            <p className="e-lead mt-5 max-w-[46ch]">
              Anna velger «Lag annonse». Bildene tas med mobilen, AI-en leser boligen
              ut av dem — og foreslår leiepris fra markedsdata. Ett klikk senere er
              annonsen live på DigiHome, og på FINN gjennom integrasjonen.
            </p>
          </div>
        </div>

        {/* Høyre — veivalget glir over i annonseflyten */}
        <Avslor delay={200}>
          <div className="grid items-center">
            <div
              className={`[grid-area:1/1] ${skift} ${
                !iAnnonse ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.985] opacity-0'
              }`}
            >
              <VeivalgDemo key={`v-${runde}`} kjorer={synlig} onFerdig={() => setDel('annonse')} />
            </div>
            <div
              className={`[grid-area:1/1] ${skift} ${
                iAnnonse ? 'scale-100 opacity-100' : 'pointer-events-none scale-[0.985] opacity-0'
              }`}
            >
              <AnnonseDemo
                key={`a-${runde}`}
                kjorer={synlig && iAnnonse}
                onFerdig={() => {
                  // Tilbake til veivalget — remounter demoene først etter at
                  // krysstoningen er ferdig, så ingen nullstilling synes.
                  setDel('veivalg');
                  window.setTimeout(() => setRunde((r) => r + 1), 750);
                }}
              />
            </div>
          </div>
        </Avslor>
      </div>
    </section>
  );
}
