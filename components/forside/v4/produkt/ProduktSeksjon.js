'use client';

import React, { useRef, useState } from 'react';
import { EASE, T, display, useSynlig } from '../motion';
import DriftScene from './DriftScene';

/* ---------------------------------------------------------------------------
   ProduktSeksjon — «Se hele DigiHome i arbeid.» En scene, ikke et skjermbilde.

   Tre lag: modus (tabs) · statement · produktet som dominerende objekt.
   Egen verden: dyp, varm plomme. Valgfritt Bergen-skumring tonet i plommen —
   produktet står på den rolige himmelen, fjellene lever i kantene (Sana-regelen).

   Tabs i livssyklus-rekkefølge: Annonse · Kontrakt · Økonomi · Leietaker · Drift.
   Default er Drift — heroen fortalte nettopp den historien; her er produktet bak den.
   Kun Drift har innhold i denne runden. De andre er synlige, dempet og ikke klikkbare.
--------------------------------------------------------------------------- */

const TABS = [
  { id: 'annonse', navn: 'Annonse', klar: false },
  { id: 'kontrakt', navn: 'Kontrakt', klar: false },
  { id: 'okonomi', navn: 'Økonomi', klar: false },
  { id: 'leietaker', navn: 'Leietaker', klar: false },
  { id: 'drift', navn: 'Drift', klar: true },
];

const SCENER = {
  drift: {
    tittel: ['Fra melding til løst.', 'DigiHome gjør resten.'],
    ingress: 'Leietakeren melder. DigiHome oppretter saken, finner leverandør og henter pris. Du godkjenner med ett trykk.',
  },
};

const IVORY = '#F4F1EA';
const INK = '#15130F';

/* Bakgrunnsvarianter — sammenlignes live i preview, velgeren fjernes når valget er tatt.
   Regel for alle: bildet er skarpt (aldri blur). Vi styrer med tone, posisjon og hvor produktet ligger.
   oslo       — brukerens bilde: hvit Oslo-bygård med balkong til venstre, lønnetre øverst til høyre, stor rolig
                himmel i midten. Produktet står sentrert på himmelen; bygården reiser seg opp bak/ved siden av det,
                treet rammer inn øverst. Lyst tema, nesten ingen overlay. Venstreforankret på desktop (bygården
                skal aldri kuttes), litt innover på mobil (bygårdens kant + himmel over den smale produktflaten).
   skumring   — Bergen-fjell i skumring, tonet i plomme. Produktet står midt på himmelen.
   arkitektur — «sykt moderne» i skumring: utkraget bygg i plomme mot lavendel (speilet, så utkragingen peker mot høyre).
   dagGlass   — Sana-varianten: supercrisp dagslys, nesten ingen overlay. Lyst tema (ink-tekst).
   dagBolig   — norsk moderne bolig (Oslo, balkonger og treverk) mot dyp blå himmel. 6000 px-kilde, srcset 2000/4000.
   plomme     — ren farge, ingen verden.

   modus 'cover' = bakgrunnsbilde som dekker. modus 'scene' = <img> med egen høyde/forankring (bygget plasseres bevisst).
   srcSet = valgfri responsiv kildeliste (ellers bygges 2000/4000 fra bilde/bilde2x). posKlasse må være literale Tailwind-klasser (JIT).
   layout 'senter' | 'venstre' — hvor tabs/statement står. seksjonBg = valgfri overstyring av flaten bak bildet.
   Produktet er alltid sentrert (DriftScene). */
const BAKGRUNNER = {
  oslo: {
    /* Dempet utgave av brukerens bilde (bakt inn i asset: svak dybdeuskarphet, −14 % kontrast, kald ivory-veil 16 %)
       + en rolig radial lysning i midten der produktet står. Skarp original: /v4/bolig-oslo-{1200,2000}.webp. */
    tema: 'lys', seksjonBg: '#DCE1EB', bilde: '/v4/bolig-oslo-dempet-2000.webp', srcSet: '/v4/bolig-oslo-dempet-1200.webp 1200w, /v4/bolig-oslo-dempet-2000.webp 2000w', modus: 'scene', hoyde: '100%', forankring: 'topp', posKlasse: 'object-[36%_0%] lg:object-[0%_0%]', layout: 'senter',
    overlay: 'radial-gradient(ellipse 62% 58% at 50% 60%, rgba(223,228,236,0.42) 0%, rgba(223,228,236,0.18) 55%, rgba(223,228,236,0) 100%), linear-gradient(180deg, rgba(223,228,236,0) 0%, rgba(223,228,236,0) 80%, rgba(220,225,235,0.35) 100%)',
  },
  skumring: {
    tema: 'mork', bilde: '/v4/skumring.webp', modus: 'cover', pos: '50% 38%', layout: 'senter',
    overlay: `linear-gradient(180deg, rgba(36,28,39,0.30) 0%, rgba(36,28,39,0.10) 30%, rgba(36,28,39,0.55) 70%, ${T.plomme} 100%)`,
  },
  arkitektur: {
    tema: 'mork', bilde: '/v4/arkitektur.webp', modus: 'scene', hoyde: '116%', forankring: 'bunn', posKlasse: 'object-[74%_100%] lg:object-[0%_100%]', layout: 'senter',
    overlay: `linear-gradient(180deg, rgba(36,28,39,0.62) 0%, rgba(36,28,39,0.36) 30%, rgba(36,28,39,0.34) 58%, rgba(36,28,39,0.80) 84%, ${T.plomme} 100%)`,
  },
  dagGlass: {
    tema: 'lys', bilde: '/v4/dag-glass-2000.webp', bilde2x: '/v4/dag-glass-4000.webp', modus: 'scene', hoyde: '128%', forankring: 'bunn', posKlasse: 'object-[75%_100%] lg:object-[0%_100%]', layout: 'senter',
    overlay: 'linear-gradient(180deg, rgba(244,241,234,0) 0%, rgba(244,241,234,0) 78%, rgba(244,241,234,0.35) 100%)',
  },
  dagBolig: {
    tema: 'mork', bilde: '/v4/dag-bolig-2000.webp', bilde2x: '/v4/dag-bolig-4000.webp', modus: 'scene', hoyde: '100%', forankring: 'bunn', posKlasse: 'object-[0%_50%] lg:object-[0%_100%]', layout: 'venstre',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.22) 100%)',
  },
  plomme: { tema: 'mork', bilde: null, modus: 'cover', pos: '50% 50%', layout: 'senter', overlay: 'none' },
};

const VELGER = [['oslo', 'Oslo · bolig'], ['skumring', 'Skumring'], ['arkitektur', 'Arkitektur'], ['dagGlass', 'Dag · glass'], ['dagBolig', 'Dag · bolig'], ['plomme', 'Plomme']];

/* Tema: farger for alt som ikke er produktflaten.
   Tabs (retning A, «minimal editorial»): ren tekstrekke. Inaktiv 60 % ink, aktiv 100 % ink + medium vekt + 2 px strek.
   Ikke-klare tabs ser like ut som inaktive (de markerer produktbredden), men er ikke klikkbare. */
const TEMA = {
  mork: {
    seksjonBg: T.plomme, tekst: IVORY, ingress: 'rgba(244,241,234,0.68)',
    tabAktiv: IVORY, tabTekst: 'rgba(244,241,234,0.62)', tabHover: 'hover:text-[#F4F1EA]', tabLinje: 'rgba(244,241,234,0.14)', ring: 'focus-visible:ring-[#F4F1EA]/40',
  },
  lys: {
    seksjonBg: IVORY, tekst: INK, ingress: 'rgba(21,19,15,0.66)',
    tabAktiv: INK, tabTekst: 'rgba(21,19,15,0.60)', tabHover: 'hover:text-[#15130F]', tabLinje: 'rgba(21,19,15,0.10)', ring: 'focus-visible:ring-[#15130F]/30',
  },
};

export default function ProduktSeksjon() {
  const [aktiv, setAktiv] = useState('drift');
  const [bakgrunn, setBakgrunn] = useState('oslo');   // nøkkel i BAKGRUNNER — brukerens bilde er valgt retning
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.12);
  const scene = SCENER[aktiv] || SCENER.drift;
  const bg = BAKGRUNNER[bakgrunn] || BAKGRUNNER.plomme;
  const tema = TEMA[bg.tema] || TEMA.mork;
  const venstre = bg.layout === 'venstre';
  const srcSet = bg.srcSet || (bg.bilde2x ? `${bg.bilde} 2000w, ${bg.bilde2x} 4000w` : undefined);

  return (
    <section id="produkt" ref={ref} className="relative overflow-hidden" style={{ background: bg.seksjonBg || tema.seksjonBg, color: tema.tekst }} data-testid="v4-produkt">
      {/* Verden: bildet er en ramme rundt produktet — produktet står på den roligste delen. */}
      {bg.bilde && bg.modus === 'cover' && (
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `url(${bg.bilde})`, backgroundSize: 'cover', backgroundPosition: bg.pos }} />
      )}
      {bg.bilde && bg.modus === 'scene' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={bg.bilde}
          aria-hidden="true"
          alt=""
          src={bg.bilde}
          srcSet={srcSet}
          sizes={srcSet ? '100vw' : undefined}
          draggable={false}
          className={`pointer-events-none absolute left-0 w-full select-none object-cover ${bg.forankring === 'topp' ? 'top-0' : 'bottom-0'} ${bg.posKlasse}`}
          style={{ height: bg.hoyde }}
        />
      )}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: bg.overlay }} />

      <div className="relative mx-auto max-w-[1760px] px-5 pb-24 pt-12 sm:px-8 lg:px-10 lg:pb-28 lg:pt-14">
        {/* Modus — lett mode-switch: tekst + hårlinje under den aktive. Ingen pill-container. */}
        <div className={`flex ${venstre ? 'justify-start' : 'justify-center'}`}>
          {/* Retning A — minimal editorial: tekstrekke på én hårlinje, aktiv = full ink + medium + 2 px strek. */}
          <div role="tablist" aria-label="Produktområder" className="inline-flex max-w-full gap-[18px] overflow-x-auto sm:gap-9 lg:gap-10" style={{ boxShadow: `inset 0 -1px 0 ${tema.tabLinje}` }} data-testid="v4-tabs">
            {TABS.map((t) => {
              const er = t.id === aktiv;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={er}
                  aria-disabled={!t.klar}
                  onClick={() => { if (t.klar) setAktiv(t.id); }}
                  className={`relative shrink-0 pb-3 pt-1 text-[14px] tracking-[-0.005em] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 sm:text-[15.5px] ${tema.ring} ${er ? 'font-medium' : t.klar ? tema.tabHover : 'cursor-default'}`}
                  style={{ color: er ? tema.tabAktiv : tema.tabTekst }}
                  data-testid={`v4-tab-${t.id}`}
                >
                  {t.navn}
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: tema.tabAktiv, opacity: er ? 1 : 0, transition: `opacity 200ms ${EASE}` }} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Statement */}
        <div className={`mt-10 max-w-[820px] lg:mt-14 ${venstre ? 'text-left' : 'mx-auto text-center'}`} style={{ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE}, transform 700ms ${EASE}` }}>
          <h2 className="text-[clamp(40px,4.8vw,78px)]" style={{ ...display, color: tema.tekst }} data-testid="v4-produkt-tittel">
            {scene.tittel[0]}<br />{scene.tittel[1]}
          </h2>
          <p className={`mt-6 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[19px] ${venstre ? '' : 'mx-auto'}`} style={{ color: tema.ingress }}>{scene.ingress}</p>
        </div>

        {/* Produktet — alltid sentrert */}
        <div className="mt-12 lg:mt-16">
          {aktiv === 'drift' && <DriftScene synlig={synlig} tema={bg.tema} />}
        </div>
      </div>

      {/* Preview-velger for bakgrunn — fjernes når valget er tatt */}
      <div className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1 rounded-full p-1 text-[12px]" style={{ background: 'rgba(36,28,39,0.7)', boxShadow: 'inset 0 0 0 1px rgba(244,241,234,0.14)' }} data-testid="v4-bg-velger">
        {VELGER.map(([id, navn]) => (
          <button key={id} type="button" onClick={() => setBakgrunn(id)} className="h-7 rounded-full px-3" style={{ background: bakgrunn === id ? IVORY : 'transparent', color: bakgrunn === id ? T.ink : 'rgba(244,241,234,0.7)' }} data-testid={`v4-bg-${id}`}>{navn}</button>
        ))}
      </div>
    </section>
  );
}
