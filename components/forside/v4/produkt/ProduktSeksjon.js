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
    tittel: ['Fra melding til løst.', 'Uten mellomarbeidet.'],
    ingress: 'Leietakeren melder. DigiHome oppretter saken, finner leverandør og henter pris. Du godkjenner — på mobilen.',
  },
};

const IVORY = '#F4F1EA';
const INK = '#15130F';

/* Bakgrunnsvarianter — sammenlignes live i preview, velgeren fjernes når valget er tatt.
   Regel for alle: bildet er skarpt (aldri blur). Vi styrer med tone, posisjon og hvor produktet ligger.
   skumring   — Bergen-fjell i skumring, tonet i plomme. Produktet står midt på himmelen.
   arkitektur — «sykt moderne» i skumring: utkraget bygg i plomme mot lavendel (speilet, så utkragingen peker mot høyre).
                Produktet ligger til venstre og dekker vindusgridet; utkragingen kommer ut bak produktet og svever
                over telefonen. Bildet er 128 % av seksjonshøyden og venstreforankret — mobil viser spissen + himmel.
   dagGlass   — Sana-varianten: supercrisp dagslys, nesten ingen overlay. Glassutkraging nede til høyre, gradient-himmel
                blå → lys. Lyst tema (ink-tekst). Produktet til venstre, bygget kommer ut bak det.
   dagVilla   — dagslys, dyp blå himmel, hvit moderne bolig. Produktet til høyre; boligens venstre fløy står fri.
   plomme     — ren farge, ingen verden.

   modus 'cover' = bakgrunnsbilde som dekker. modus 'scene' = <img> med egen høyde/forankring (bygget plasseres bevisst).
   posKlasse må være literale Tailwind-klasser (JIT). */
const BAKGRUNNER = {
  skumring: {
    tema: 'mork', bilde: '/v4/skumring.webp', modus: 'cover', pos: '50% 38%', komposisjon: 'senter',
    overlay: `linear-gradient(180deg, rgba(36,28,39,0.30) 0%, rgba(36,28,39,0.10) 30%, rgba(36,28,39,0.55) 70%, ${T.plomme} 100%)`,
  },
  arkitektur: {
    tema: 'mork', bilde: '/v4/arkitektur.webp', modus: 'scene', hoyde: '116%', forankring: 'bunn', posKlasse: 'object-[74%_100%] lg:object-[0%_100%]', komposisjon: 'venstre',
    overlay: `linear-gradient(180deg, rgba(36,28,39,0.62) 0%, rgba(36,28,39,0.36) 30%, rgba(36,28,39,0.34) 58%, rgba(36,28,39,0.80) 84%, ${T.plomme} 100%)`,
  },
  dagGlass: {
    tema: 'lys', bilde: '/v4/dag-glass.webp', modus: 'scene', hoyde: '128%', forankring: 'bunn', posKlasse: 'object-[75%_100%] lg:object-[0%_100%]', komposisjon: 'venstre',
    overlay: 'linear-gradient(180deg, rgba(244,241,234,0) 0%, rgba(244,241,234,0) 78%, rgba(244,241,234,0.35) 100%)',
  },
  dagVilla: {
    tema: 'mork', bilde: '/v4/dag-villa.webp', modus: 'scene', hoyde: '110%', forankring: 'topp', posKlasse: 'object-[15%_0%] lg:object-[0%_0%]', komposisjon: 'hoyre',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0.02) 45%, rgba(0,0,0,0.10) 100%)',
  },
  plomme: { tema: 'mork', bilde: null, modus: 'cover', pos: '50% 50%', komposisjon: 'senter', overlay: 'none' },
};

const VELGER = [['skumring', 'Skumring'], ['arkitektur', 'Arkitektur'], ['dagGlass', 'Dag · glass'], ['dagVilla', 'Dag · villa'], ['plomme', 'Plomme']];

/* Tema: farger for alt som ikke er produktflaten */
const TEMA = {
  mork: {
    seksjonBg: T.plomme, tekst: IVORY, ingress: 'rgba(244,241,234,0.68)',
    pillBg: 'rgba(36,28,39,0.55)', pillRing: 'inset 0 0 0 1px rgba(244,241,234,0.12)',
    tabAktivBg: IVORY, tabAktivTekst: INK, tabTekst: 'rgba(244,241,234,0.72)', tabDempet: 'rgba(244,241,234,0.38)', tabHover: 'hover:text-[#F4F1EA]', ring: 'focus-visible:ring-[#F4F1EA]/40',
  },
  lys: {
    seksjonBg: IVORY, tekst: INK, ingress: 'rgba(21,19,15,0.66)',
    pillBg: 'rgba(255,255,255,0.55)', pillRing: 'inset 0 0 0 1px rgba(21,19,15,0.10)',
    tabAktivBg: INK, tabAktivTekst: IVORY, tabTekst: 'rgba(21,19,15,0.72)', tabDempet: 'rgba(21,19,15,0.36)', tabHover: 'hover:text-[#15130F]', ring: 'focus-visible:ring-[#15130F]/30',
  },
};

export default function ProduktSeksjon() {
  const [aktiv, setAktiv] = useState('drift');
  const [bakgrunn, setBakgrunn] = useState('skumring');   // nøkkel i BAKGRUNNER — sammenlignes live i preview
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.12);
  const scene = SCENER[aktiv] || SCENER.drift;
  const bg = BAKGRUNNER[bakgrunn] || BAKGRUNNER.plomme;
  const tema = TEMA[bg.tema] || TEMA.mork;

  return (
    <section id="produkt" ref={ref} className="relative overflow-hidden" style={{ background: tema.seksjonBg, color: tema.tekst }} data-testid="v4-produkt">
      {/* Verden: bildet er en ramme rundt produktet — produktet står på den roligste delen. */}
      {bg.bilde && bg.modus === 'cover' && (
        <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: `url(${bg.bilde})`, backgroundSize: 'cover', backgroundPosition: bg.pos }} />
      )}
      {bg.bilde && bg.modus === 'scene' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={bg.bilde} aria-hidden="true" alt="" src={bg.bilde} draggable={false} className={`pointer-events-none absolute left-0 min-w-full max-w-none select-none object-cover ${bg.forankring === 'topp' ? 'top-0' : 'bottom-0'} ${bg.posKlasse}`} style={{ height: bg.hoyde }} />
      )}
      <div aria-hidden="true" className="absolute inset-0" style={{ background: bg.overlay }} />

      <div className="relative mx-auto max-w-[1760px] px-5 pb-24 pt-14 sm:px-8 lg:px-10 lg:pb-32 lg:pt-16">
        {/* Modus — sticky mens seksjonen er i view */}
        <div className="sticky top-[88px] z-20 flex justify-center lg:top-[80px]">
          <div role="tablist" aria-label="Produktområder" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full p-1 backdrop-blur-sm" style={{ background: tema.pillBg, boxShadow: tema.pillRing }} data-testid="v4-tabs">
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
                  className={`h-10 shrink-0 rounded-full px-4 text-[14.5px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 ${tema.ring} sm:px-5 ${er ? '' : t.klar ? tema.tabHover : 'cursor-default'}`}
                  style={{ background: er ? tema.tabAktivBg : 'transparent', color: er ? tema.tabAktivTekst : t.klar ? tema.tabTekst : tema.tabDempet }}
                  data-testid={`v4-tab-${t.id}`}
                >
                  {t.navn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Statement */}
        <div className="mx-auto mt-12 max-w-[820px] text-center lg:mt-16" style={{ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE}, transform 700ms ${EASE}` }}>
          <h2 className="text-[clamp(40px,4.8vw,78px)]" style={{ ...display, color: tema.tekst }} data-testid="v4-produkt-tittel">
            {scene.tittel[0]}<br />{scene.tittel[1]}
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[17px] leading-[1.5] sm:text-[19px]" style={{ color: tema.ingress }}>{scene.ingress}</p>
        </div>

        {/* Produktet */}
        <div className="mt-14 lg:mt-20">
          {aktiv === 'drift' && <DriftScene synlig={synlig} justering={bg.komposisjon} tema={bg.tema} />}
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
