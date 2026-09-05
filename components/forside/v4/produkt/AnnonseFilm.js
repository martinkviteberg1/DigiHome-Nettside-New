'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EASE, T, tall } from '../motion';

/* ---------------------------------------------------------------------------
   AnnonseFilm — «Fra ledig til utleid. Du trykker to ganger.»

   Alt skjer INNENFOR produktflaten (sidebar, topplinje, to kolonner) — det er
   rammen brukeren kjenner fra Drift. Historien fortelles i annonsekortets
   fotografi og i høyrekolonnen. Konseptet: annonsen skrives fra boligen.

   Kapitler (faser):
     Bildene leses   0–3   Forsidebildet viser bildet som leses: stue → kjøkken →
                           soverom. Fra hvert setter det seg én fakta-linje i
                           høyrekolonnen. Miniatyren i boligkortet får en ring.
     Møbleres        4–5   Tilbake til den tomme stuen — ett dissolve til møblert.
                           «Illustrasjon · møblert med KI» i samme sekund.
     Skrives         6–9   Spesifikasjon, overskrift, tekst, pris — hele blokker.
     Publiseres      10–11 Beslutningskortet tar fakta-kolonnens plass. Du trykker.
     Utleid          12–17 Interessenter dag for dag. Dag 6: Send kontrakt → BankID.

   Layouten er stabil: innhold fyller plass som er reservert; nye blokker
   (interessenter) vokser inn. Ingen skannelinjer, bokser, spinnere eller
   skrivemaskin-cursor. Redusert bevegelse: ingen overganger, start på «klar».
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const STEIN = '#F3F1EC';
const HAIR = 'rgba(21,19,15,0.08)';
const DIM = 'rgba(21,19,15,0.55)';

const F = { START: 0, LES1: 1, LES2: 2, LES3: 3, TOMT: 4, MOBLERT: 5, RAMME: 6, TITTEL: 7, TEKST: 8, PRIS: 9, KLAR: 10, PUBLISERT: 11, LANDING: 12, DAG1: 13, DAG2: 14, DAG4: 15, DAG6: 16, SENDT: 17 };
const AUTO = { 0: 900, 1: 900, 2: 900, 3: 900, 4: 800, 5: 1600, 6: 700, 7: 500, 8: 700, 9: 800, 11: 700, 12: 900, 13: 900, 14: 900, 15: 900 };

const KAPITLER = [
  { navn: 'Bildene leses', fase: F.START },
  { navn: 'Møbleres', fase: F.TOMT },
  { navn: 'Skrives', fase: F.RAMME },
  { navn: 'Publiseres', fase: F.KLAR },
  { navn: 'Utleid', fase: F.DAG1 },
];

/* Fotografiene i historien + biblioteket i produktet */
const FOTO = {
  tom: { src: '/v4/annonse/stue-tom-1200.webp', alt: 'Stuen, tom' },
  moblert: { src: '/v4/annonse/stue-moblert-1200.webp', alt: 'Stuen, møblert med KI' },
  kjokken: { src: '/v4/annonse/kjokken-600.webp', alt: 'Kjøkkenet' },
  soverom: { src: '/v4/annonse/soverom-600.webp', alt: 'Soverommet' },
};
const BILDER = [
  { id: 'stue', src: '/v4/annonse/stue-tom-700.webp', alt: 'Stue', forside: true },
  { id: 'kjokken', src: '/v4/annonse/kjokken-600.webp', alt: 'Kjøkken' },
  { id: 'soverom', src: '/v4/annonse/soverom-600.webp', alt: 'Soverom' },
  { id: 'spisestue', src: '/v4/annonse/spisestue-600.webp', alt: 'Spisestue' },
  { id: 'bar', src: '/v4/annonse/kjokken-bar-600.webp', alt: 'Kjøkken, detalj' },
  { id: 'fasade', src: '/v4/bolig-oslo-1200.webp', alt: 'Fasade', pos: '20% 45%' },
];
const FAKTA = [
  { fase: F.LES1, tekst: 'Stue · parkett · store vinduer' },
  { fase: F.LES2, tekst: 'Kjøkken · integrert ovn · spiseplass' },
  { fase: F.LES3, tekst: 'Soverom · dobbeltseng · garderobe' },
];

const ANNONSE = {
  tittel: 'Lys 2-roms med åpen kjøkkenløsning i Nygårdsgaten',
  spes: '54 m² · 2. etasje · parkett · ledig 1. november',
  tekst: 'Lys og luftig 2-roms i klassisk bygård. Åpen kjøkkenløsning med integrert ovn og spiseplass, parkett og store vinduer mot rolig gate. Soverom med plass til dobbeltseng og garderobe. Ledig fra 1. november.',
};

const FOLK = [
  {
    n: 'Emma Sørensen', b: 'E', fra: F.DAG1,
    d: (f) => (f >= F.SENDT ? 'Kontrakt sendt · signeres med BankID' : f >= F.DAG6 ? 'Visning gjennomført · ønsker fra 1. nov' : f >= F.DAG2 ? 'Visning avtalt tirsdag 17:30 · ønsker fra 1. nov' : 'Meldte interesse · ønsker fra 1. nov'),
    chip: (f) => (f >= F.SENDT ? ['Kontrakt sendt', 'gronn'] : f >= F.DAG6 ? ['Anbefalt', 'lilla'] : f >= F.DAG2 ? ['Visning avtalt', 'noytral'] : ['Ny', 'lilla']),
  },
  {
    n: 'Martin Berg', b: 'M', fra: F.DAG2,
    d: (f) => (f >= F.SENDT ? 'Varslet · boligen er reservert' : f >= F.DAG6 ? 'Visning gjennomført' : 'Visning avtalt tirsdag 18:00'),
    chip: (f) => (f >= F.SENDT ? ['Varslet', 'noytral'] : f >= F.DAG6 ? ['Gjennomført', 'noytral'] : ['Visning avtalt', 'noytral']),
  },
  {
    n: 'Sara Haugen', b: 'S', fra: F.DAG4,
    d: (f) => (f >= F.SENDT ? 'Varslet · boligen er reservert' : 'Spørsmål om husdyr · besvart fra annonsen'),
    chip: (f) => (f >= F.SENDT ? ['Varslet', 'noytral'] : ['Besvart', 'noytral']),
  },
];

const TONE = {
  noytral: { background: 'rgba(21,19,15,0.06)', color: 'rgba(21,19,15,0.72)' },
  lilla: { background: 'rgba(212,150,255,0.22)', color: T.ink },
  gronn: { background: 'rgba(31,157,85,0.14)', color: '#166B3C' },
};

function status(f) {
  if (f < F.KLAR) return ['Oppsigelse mottatt · ledig 1. november', 'noytral'];
  if (f === F.KLAR) return ['Utkast klart · venter på deg', 'lilla'];
  if (f <= F.LANDING) return ['Publisert på FINN.no', 'gronn'];
  if (f < F.DAG6) return [`Annonse aktiv · dag ${[1, 2, 4][f - F.DAG1]}`, 'lilla'];
  if (f === F.DAG6) return ['Dag 6 · klar for kontrakt', 'lilla'];
  return ['Kontrakt sendt · BankID', 'gronn'];
}

function undertekst(f) {
  if (f < F.DAG1) return 'Jonas flytter ut 31. oktober · 54 m² · 2. etasje';
  if (f === F.DAG1) return '1 interessent · dag 1';
  if (f === F.DAG2) return '2 interessenter · 2 visninger avtalt';
  if (f === F.DAG4) return '3 interessenter · 2 visninger · 1 spørsmål besvart';
  return '3 interessenter · 2 visninger gjennomført · 1 spørsmål besvart';
}

function fotoNaa(f) {
  if (f === F.LES2) return 'kjokken';
  if (f === F.LES3) return 'soverom';
  if (f >= F.MOBLERT) return 'moblert';
  return 'tom';
}
function fotoNavn(f) {
  if (f === F.LES2) return 'Kjøkken';
  if (f === F.LES3) return 'Soverom';
  return 'Stue';
}

/* ── Små byggeklosser ── */

function Hake({ size = 14 }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Avatar({ src, alt, size = 24 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)' }} />
  );
}

function Initial({ bokstav, size = 30 }) {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 items-center justify-center rounded-full text-[11.5px] font-medium" style={{ width: size, height: size, background: 'rgba(21,19,15,0.07)', color: 'rgba(21,19,15,0.72)', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>{bokstav}</span>
  );
}

/* Kommer inn på plass (plassen er reservert) */
function Inn({ vis, delay = 0, y = 8, children, className = '', ov }) {
  const t = ov ? 'none' : `opacity 450ms ${EASE} ${delay}ms, transform 450ms ${EASE} ${delay}ms`;
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: t }} aria-hidden={!vis}>
      {children}
    </div>
  );
}

/* Vokser inn (ny blokk uten reservert plass) */
function Vokse({ vis, children, className = '', ov }) {
  return (
    <div className={`grid ${className}`} style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: ov ? 'none' : `grid-template-rows 600ms ${EASE}` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: ov ? 'none' : `opacity 500ms ${EASE} ${vis ? 150 : 0}ms, transform 500ms ${EASE} ${vis ? 150 : 0}ms` }}>{children}</div>
      </div>
    </div>
  );
}

/* Chip som bytter tekst sekvensielt */
function Chip({ tekst, tone = 'noytral', liten = false, className = '', testid }) {
  const hake = tone === 'gronn';
  return (
    <span key={tekst} className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 font-medium animate-in fade-in-0 duration-300 ${liten ? 'text-[11.5px]' : 'text-[12px]'} ${className}`} style={{ ...TONE[tone], height: liten ? 24 : 28 }} data-testid={testid}>
      {hake ? <Hake size={12} /> : <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone === 'lilla' ? T.lilla : 'rgba(21,19,15,0.35)' }} />}
      {tekst}
    </span>
  );
}

/* Frostet merkelapp på et bilde */
function Lapp({ vis, children, className = '', delay = 0, testid, ov }) {
  return (
    <span className={`absolute inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-medium ${className}`} style={{ background: 'rgba(251,250,248,0.92)', color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(4px)', transition: ov ? 'none' : `opacity 400ms ${EASE} ${delay}ms, transform 400ms ${EASE} ${delay}ms` }} aria-hidden={!vis} data-testid={testid}>
      {children}
    </span>
  );
}

/* ── Fakta-kolonnen (historie-modus): det systemet leste ut av bildene ── */
function Fakta({ fase, ov, kompakt = false }) {
  return (
    <div className={kompakt ? '' : 'pt-1'} data-testid="v4-fakta">
      <div className="flex items-center justify-between text-[12.5px]" style={{ color: DIM }}>
        <span className="font-medium">Fra bildene</span>
        <span>du kan rette</span>
      </div>
      <ul className="mt-2.5 flex flex-col gap-2">
        {FAKTA.map((f) => (
          <li key={f.fase} className="h-8">
            <Inn vis={fase >= f.fase} ov={ov}>
              <span className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[13px] font-medium" style={{ background: STEIN, color: T.ink, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.10)' }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />{f.tekst}
              </span>
            </Inn>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Boligen: kilden. Miniatyren som leses får en ring; forsiden merkes. ── */
const LESES = { stue: F.LES1, kjokken: F.LES2, soverom: F.LES3 };

function Miniatyr({ b, fase, ov }) {
  const les = LESES[b.id];
  const aktiv = les != null && (fase === les || (b.id === 'stue' && (fase === F.START || fase === F.TOMT || fase === F.MOBLERT)));
  const lest = les != null && fase > les;
  const forside = b.forside && fase >= F.MOBLERT;
  const t = (ms) => (ov ? 'none' : `${ms}ms ${EASE}`);
  return (
    <div className="relative overflow-hidden rounded-[8px]" style={{ aspectRatio: '4 / 3', background: 'rgba(21,19,15,0.05)', boxShadow: aktiv ? `0 0 0 2px ${T.lilla}` : lest ? '0 0 0 1px rgba(21,19,15,0.22)' : 'none', transform: aktiv ? 'scale(1.035)' : 'none', transition: `box-shadow ${t(300)}, transform ${t(300)}` }} data-testid={`v4-bilde-${b.id}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={b.src} alt={b.alt} className="h-full w-full object-cover" style={{ objectPosition: b.pos || '50% 50%' }} draggable={false} />
      <span className="absolute right-1.5 top-1.5 inline-flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ background: 'rgba(251,250,248,0.94)', color: T.ink, opacity: lest ? 1 : 0, transform: lest ? 'none' : 'scale(0.6)', transition: `opacity ${t(250)}, transform ${t(250)}` }} aria-hidden="true"><Hake size={11} /></span>
      <span className="absolute bottom-1.5 left-1.5 inline-flex h-[18px] items-center rounded-full px-1.5 text-[10.5px] font-medium" style={{ background: 'rgba(251,250,248,0.94)', color: T.ink, opacity: forside ? 1 : 0, transition: `opacity ${t(300)}` }} aria-hidden="true">Forside</span>
    </div>
  );
}

function BoligKort({ fase, ov, kompakt = false }) {
  const bilder = kompakt ? BILDER.slice(0, 3) : BILDER;
  const bildeTekst = fase >= F.MOBLERT ? '12 bilder · forside møblert' : '12 bilder';
  return (
    <div className="rounded-[14px] p-4 text-[13px]" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-boligkort">
      <div className="flex items-center justify-between">
        <span className="font-medium text-[#15130F]/45">Boligen</span>
        <span style={{ color: DIM }}>Leilighet 2 · 54 m²</span>
      </div>
      {!kompakt && (
        <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-y-2">
          <dt style={{ color: DIM }}>Etasje</dt><dd>2. etasje · bygård</dd>
          <dt style={{ color: DIM }}>Forrige leie</dt><dd>{tall(12000)} kr /mnd</dd>
          <dt style={{ color: DIM }}>Depositum</dt><dd>3 mnd</dd>
          <dt style={{ color: DIM }}>Ledig fra</dt><dd>1. november</dd>
        </dl>
      )}
      <div className="mt-4 flex items-center justify-between text-[12px]" style={{ color: DIM }}>
        <span>Bilder</span>
        <span key={bildeTekst} className="animate-in fade-in-0 duration-300">{bildeTekst}</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {bilder.map((b) => <Miniatyr key={b.id} b={b} fase={fase} ov={ov} />)}
      </div>
    </div>
  );
}

/* ── Annonsekortet. Fotografiet står fast; rammen og teksten toner inn rundt det. ── */
function AnnonseKort({ fase, ov, kompakt = false }) {
  const historie = fase < F.MOBLERT;   // bildene leses — navnelappen står på fotografiet
  const naa = fotoNaa(fase);
  const moblert = fase >= F.MOBLERT;
  const ute = fase >= F.PUBLISERT;
  const topp = ute ? 'FINN.no · aktiv' : fase >= F.TITTEL ? 'Utkast · skrevet fra boligen' : 'Utkast lages fra boligen';
  const bt = (ms, delay = 0) => (ov ? 'none' : `${ms}ms ${EASE} ${delay}ms`);
  /* Desktop reserverer plassen (stabil layout); i smal flate vokser tekstblokkene inn, så kortet ikke står halvtomt. */
  const Plass = kompakt ? Vokse : Inn;
  return (
    <div className="overflow-hidden rounded-[14px]" style={{ background: STEIN, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="v4-annonse-kort">
      <div className="relative">
        <div className="flex items-center justify-between px-4 pt-3 text-[12px]" style={{ color: DIM }}>
          <span className="font-medium text-[#15130F]/45">Annonse</span>
          <span key={topp} className="inline-flex items-center gap-1.5 animate-in fade-in-0 duration-300" data-testid="v4-annonse-topp">
            {ute && <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />}{topp}
          </span>
        </div>

        {/* Fotografiet — ankeret. Fire lag, ett synlig om gangen. */}
        <div className="relative mx-4 mt-3 overflow-hidden rounded-[10px]" style={{ aspectRatio: kompakt ? '16 / 10' : '2.2 / 1', background: 'rgba(21,19,15,0.045)' }} data-testid="v4-forside" data-foto={naa}>
          {Object.entries(FOTO).map(([id, b]) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={id} src={b.src} alt={b.alt} className="absolute inset-0 h-full w-full object-cover" style={{ objectPosition: '50% 68%', opacity: naa === id ? 1 : 0, transition: `opacity ${bt(id === 'moblert' ? 900 : 500)}` }} draggable={false} data-testid={`v4-foto-${id}`} />
          ))}
          <Lapp vis={historie} className="left-2 top-2" ov={ov}>
            <span key={fotoNavn(fase)} className="animate-in fade-in-0 duration-300">{fotoNavn(fase)}</span>
          </Lapp>
          <Lapp vis={moblert} className="bottom-2 left-2" delay={450} ov={ov} testid="v4-ki-merke">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Illustrasjon · møblert med KI
          </Lapp>
        </div>

        <div className="px-4 pb-4 pt-3.5">
          <Plass vis={fase >= F.TITTEL} ov={ov}>
            <p className={`${kompakt ? 'text-[15px]' : 'text-[16.5px]'} font-medium leading-[1.3] tracking-[-0.008em]`} data-testid="v4-annonse-tittel">{ANNONSE.tittel}</p>
          </Plass>
          <Plass vis={fase >= F.RAMME} ov={ov} className="mt-1.5">
            <p className="text-[13px]" style={{ color: DIM }} data-testid="v4-annonse-spes">{ANNONSE.spes}</p>
          </Plass>
          <Plass vis={fase >= F.TEKST} ov={ov} className="mt-3">
            <p className={`${kompakt ? 'text-[13px]' : 'text-[13.5px]'} leading-[1.5] text-[#15130F]/78`} data-testid="v4-annonse-tekst">{ANNONSE.tekst}</p>
          </Plass>
          <Plass vis={fase >= F.PRIS} ov={ov} className="mt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-3 text-[12.5px]" style={{ borderColor: HAIR, color: DIM }}>
              <span className="flex items-baseline gap-3">
                <span className="text-[16px] font-medium tracking-[-0.01em] text-[#15130F]"><span className="tabular-nums">{tall(12500)}</span> kr <span className="text-[12.5px] font-normal" style={{ color: DIM }}>/mnd</span></span>
                <span>Depositum 3 mnd</span>
              </span>
              <span>Forslag · forrige leie {tall(12000)} kr</span>
            </div>
          </Plass>
        </div>
      </div>
    </div>
  );
}

/* ── Beslutningskortet — det ene du gjør. To ganger. ── */
function BeslutningKort({ fase, trykketPub, trykketSend, onPubliser, onSend, ov, className = '' }) {
  const kontrakt = fase >= F.DAG6;
  const dimt = { color: 'rgba(244,241,234,0.62)' };
  const bt = (ms, delay = 0) => (ov ? 'none' : `opacity ${ms}ms ${EASE} ${delay}ms`);
  const knapp = (trykket, tekst, tekstEtter, onClick, testid) => (
    <button
      type="button"
      onClick={onClick}
      disabled={trykket}
      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-[10px] px-4 text-[14px] font-medium transition-[transform,background-color] duration-200 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-default"
      style={{ background: trykket ? 'rgba(212,150,255,0.55)' : T.lilla, color: T.ink }}
      data-testid={testid}
    >
      {trykket && <Hake />}{trykket ? tekstEtter : tekst}
    </button>
  );
  return (
    <div className={`rounded-[14px] p-5 ${className}`} style={{ background: T.charcoal, color: T.offwhite, boxShadow: '0 24px 60px -30px rgba(0,0,0,0.6)' }} data-testid="v4-beslutning">
      {!kontrakt ? (
        <div key="publiser" className="animate-in fade-in-0 duration-500">
          <div className="flex items-center justify-between text-[12px]" style={dimt}>
            <span className="inline-grid">
              <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ opacity: trykketPub ? 0 : 1, transition: bt(200) }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Klar til publisering</span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5" style={{ color: '#7DDBA1', opacity: trykketPub ? 1 : 0, transition: bt(300, 250) }}><Hake />Publisert · ute på FINN.no</span>
            </span>
            <span className="tabular-nums">18:01</span>
          </div>
          <p className="mt-3 text-[15px] font-medium">Leilighet 2 <span style={dimt}>· Nygårdsgaten 5</span></p>
          <p className="mt-1 text-[13px]" style={dimt}>FINN.no · tekst, 12 bilder og pris fra utkastet</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="whitespace-nowrap text-[18px] font-medium tracking-[-0.01em] lg:text-[20px]"><span className="tabular-nums">{tall(12500)}</span> kr<span className="text-[13px] font-normal" style={dimt}> /mnd</span></span>
            {knapp(trykketPub, 'Publiser', 'Publisert', onPubliser, 'v4-publiser')}
          </div>
        </div>
      ) : (
        <div key="kontrakt" className="animate-in fade-in-0 duration-500">
          <div className="flex items-center justify-between text-[12px]" style={dimt}>
            <span className="inline-grid">
              <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ opacity: trykketSend ? 0 : 1, transition: bt(200) }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Klar for kontrakt</span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5" style={{ color: '#7DDBA1', opacity: trykketSend ? 1 : 0, transition: bt(300, 250) }}><Hake />Sendt til signering</span>
            </span>
            <span>Dag 6</span>
          </div>
          <p className="mt-3 text-[15px] font-medium">Emma Sørensen <span style={dimt}>· fra 1. november</span></p>
          <p className="mt-1 text-[13px]" style={dimt}>Visning gjennomført · ønsker 3 års leie</p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="whitespace-nowrap text-[18px] font-medium tracking-[-0.01em] lg:text-[20px]"><span className="tabular-nums">{tall(12500)}</span> kr<span className="text-[13px] font-normal" style={dimt}> /mnd</span></span>
            {knapp(trykketSend, 'Send kontrakt', 'Sendt', onSend, 'v4-send-kontrakt')}
          </div>
        </div>
      )}
    </div>
  );
}

/* Høyrekolonnens historie-slot: fakta og beslutning deler samme celle — aldri to samtidig. */
function Slot({ fase, ov, kompakt, beslutning }) {
  const visFakta = fase < F.KLAR;
  const bt = (delay) => (ov ? 'none' : `opacity 400ms ${EASE} ${delay}ms, transform 400ms ${EASE} ${delay}ms`);
  return (
    <div className="grid" data-testid="v4-slot">
      <div className="col-start-1 row-start-1" style={{ opacity: visFakta ? 1 : 0, transform: visFakta ? 'none' : 'translateY(-6px)', transition: bt(0), pointerEvents: visFakta ? 'auto' : 'none' }} aria-hidden={!visFakta}>
        <Fakta fase={fase} ov={ov} kompakt={kompakt} />
      </div>
      <div className="col-start-1 row-start-1" style={{ opacity: visFakta ? 0 : 1, transform: visFakta ? 'translateY(10px)' : 'none', transition: bt(visFakta ? 0 : 250), pointerEvents: visFakta ? 'none' : 'auto' }} aria-hidden={visFakta}>
        {beslutning}
      </div>
    </div>
  );
}

/* ── Interessentene ── */
function Rad({ p, fase, kompakt }) {
  const [chipTekst, chipTone] = p.chip(fase);
  return (
    <div className={`grid items-center gap-3 border-t ${kompakt ? 'grid-cols-[26px_minmax(0,1fr)_auto] py-2.5' : 'grid-cols-[30px_minmax(0,1fr)_auto] py-3.5'}`} style={{ borderColor: HAIR }}>
      <Initial bokstav={p.b} size={kompakt ? 26 : 30} />
      <span className="min-w-0">
        <span className={`flex items-center gap-2 ${kompakt ? 'text-[13px]' : 'text-[14px]'} font-medium`}>{p.n}</span>
        <span key={p.d(fase)} className={`mt-0.5 block truncate ${kompakt ? 'text-[12px]' : 'text-[13px]'} text-[#15130F]/55 animate-in fade-in-0 duration-300`}>{p.d(fase)}</span>
      </span>
      <Chip tekst={chipTekst} tone={chipTone} liten />
    </div>
  );
}

function Interessenter({ fase, ov, kompakt = false }) {
  return (
    <div data-testid="v4-interessenter">
      <p className="text-[13px] font-medium text-[#15130F]/45">Interessenter</p>
      <ol className="mt-2">
        {FOLK.map((p) => (
          <li key={p.n}><Vokse vis={fase >= p.fra} ov={ov}><Rad p={p} fase={fase} kompakt={kompakt} /></Vokse></li>
        ))}
      </ol>
    </div>
  );
}

/* ── Desktop ── */
function Desktop({ fase, ov, trykketPub, trykketSend, onPubliser, onSend }) {
  const NAV = ['Oversikt', 'Eiendommer', 'Leietakere', 'Saker', 'Økonomi', 'Dokumenter'];
  const [st, stTone] = status(fase);
  const venter = fase === F.KLAR || fase === F.DAG6;
  const bt = (ms) => (ov ? 'none' : `${ms}ms ${EASE}`);
  return (
    <div className="grid min-h-[680px] grid-cols-[224px_minmax(0,1fr)] text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-desktop">
      <aside className="flex flex-col border-r px-4 py-5" style={{ background: STEIN, borderColor: HAIR }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-hero-logo.svg" alt="DigiHome" className="ml-1 h-[16px] w-auto" />
        <div className="mt-6 flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[13px]" style={{ background: PAPIR, boxShadow: `inset 0 0 0 1px ${HAIR}` }}>
          <span className="font-medium">Nygårdsgaten 5</span>
          <span className="text-[#15130F]/40">▾</span>
        </div>
        <nav className="mt-5 flex flex-col gap-0.5 text-[13.5px]">
          {NAV.map((n) => {
            const er = n === 'Eiendommer';
            return (
              <span key={n} className="flex items-center justify-between rounded-[8px] px-3 py-2" style={{ background: er ? 'rgba(21,19,15,0.06)' : 'transparent', color: er ? T.ink : 'rgba(21,19,15,0.62)', fontWeight: er ? 500 : 400 }}>
                {n}
                {er && <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-medium" style={{ background: T.lilla, color: T.ink, opacity: venter ? 1 : 0, transition: `opacity ${bt(300)}` }} aria-hidden={!venter}>1</span>}
              </span>
            );
          })}
        </nav>
        <div className="mt-auto flex items-center gap-2.5 px-2 pt-6 text-[13px]">
          <Avatar src="/v4/kari.webp" alt="Kari" size={26} />
          <span><span className="block font-medium">Kari Nilsen</span><span className="block text-[11.5px] text-[#15130F]/50">Eier</span></span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="flex h-12 items-center justify-between border-b px-7 text-[13px] text-[#15130F]/55" style={{ borderColor: HAIR }}>
          <span>Eiendommer <span className="mx-1.5 text-[#15130F]/30">/</span> Nygårdsgaten 5 <span className="mx-1.5 text-[#15130F]/30">/</span> <span className="text-[#15130F]">Leilighet 2 · Utleie</span></span>
          <span className="tabular-nums">I dag</span>
        </div>
        <div className="px-7 pb-7 pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[22px] font-medium tracking-[-0.01em]">Leilighet 2 · ledig fra 1. november</h3>
              <p key={undertekst(fase)} className="mt-1 text-[13px] text-[#15130F]/55 animate-in fade-in-0 duration-300" data-testid="v4-undertekst">{undertekst(fase)}</p>
            </div>
            <Chip tekst={st} tone={stTone} testid="v4-status" />
          </div>

          <div className="mt-6 grid grid-cols-[minmax(0,1fr)_340px] gap-6" data-testid="v4-grid">
            {/* Venstre: annonsen som skrives, så interessentene */}
            <div className="min-w-0">
              <AnnonseKort fase={fase} ov={ov} />
              <Vokse vis={fase >= F.DAG1} ov={ov}><div className="pt-6"><Interessenter fase={fase} ov={ov} /></div></Vokse>
            </div>
            {/* Høyre: det systemet leste ut av bildene → beslutningen. Kilden under. */}
            <div className="flex flex-col">
              <Slot fase={fase} ov={ov} beslutning={<BeslutningKort fase={fase} ov={ov} trykketPub={trykketPub} trykketSend={trykketSend} onPubliser={onPubliser} onSend={onSend} />} />
              <div className="pt-4"><BoligKort fase={fase} ov={ov} /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Under lg: samme historie i smal produktflate ── */
function Kompakt({ fase, ov, trykketPub, trykketSend, onPubliser, onSend }) {
  const [st, stTone] = status(fase);
  return (
    <div className="flex flex-col text-[#15130F]" style={{ background: PAPIR }} data-testid="v4-annonse-kompakt">
      <div className="flex h-11 items-center justify-between border-b px-4 text-[12.5px] text-[#15130F]/55" style={{ borderColor: HAIR }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-[14px] w-auto" />
        <span>Nygårdsgaten 5</span>
      </div>
      <div className="px-4 pt-4">
        <p className="text-[12.5px] text-[#15130F]/50">Eiendommer <span className="mx-1 text-[#15130F]/30">/</span> Leilighet 2 · Utleie</p>
        <h4 className="mt-0.5 text-[20px] font-medium tracking-[-0.01em]">Ledig fra 1. november</h4>
        <p key={undertekst(fase)} className="mt-1 text-[12.5px] text-[#15130F]/55 animate-in fade-in-0 duration-300">{undertekst(fase)}</p>
        <div className="mt-3"><Chip tekst={st} tone={stTone} /></div>
      </div>
      <div className="mx-4 mt-4"><AnnonseKort fase={fase} ov={ov} kompakt /></div>
      <div className="mx-4 mt-4">
        <Slot fase={fase} ov={ov} kompakt beslutning={<BeslutningKort fase={fase} ov={ov} trykketPub={trykketPub} trykketSend={trykketSend} onPubliser={onPubliser} onSend={onSend} />} />
      </div>
      <div className="mx-4 mt-4"><BoligKort fase={fase} ov={ov} kompakt /></div>
      <Vokse vis={fase >= F.DAG1} ov={ov} className="mx-4"><div className="pt-4"><Interessenter fase={fase} ov={ov} kompakt /></div></Vokse>
      <div className="h-5" />
    </div>
  );
}

/* ── Kapittel-linjen under scenen ── */
function Kapitler({ fase, onVelg, lys }) {
  let aktiv = 0;
  KAPITLER.forEach((k, i) => { if (fase >= k.fase) aktiv = i; });
  const farge = lys ? 'rgba(21,19,15,' : 'rgba(244,241,234,';
  return (
    <div className="mt-8 flex justify-center lg:mt-10" data-testid="v4-kapitler">
      <ol className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-full px-1 py-1" style={{ boxShadow: `inset 0 0 0 1px ${farge}0.10)` }}>
        {KAPITLER.map((k, i) => {
          const er = i === aktiv;
          const gjort = i < aktiv;
          return (
            <li key={k.navn} className="shrink-0">
              <button
                type="button"
                onClick={() => onVelg(i)}
                aria-current={er ? 'step' : undefined}
                className="inline-flex h-8 items-center gap-2 rounded-full px-3 text-[12.5px] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2"
                style={{ color: er ? `${farge}0.92)` : `${farge}${gjort ? '0.55' : '0.42'})`, background: er ? `${farge}0.07)` : 'transparent', fontWeight: er ? 500 : 400 }}
                data-testid={`v4-kapittel-${i}`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: er ? T.lilla : gjort ? `${farge}0.45)` : `${farge}0.18)` }} />
                {k.navn}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function AnnonseFilm({ synlig, tema = 'mork' }) {
  const [fase, setFase] = useState(F.START);
  const [startet, setStartet] = useState(false);
  const [trykketPub, setTrykketPub] = useState(false);
  const [trykketSend, setTrykketSend] = useState(false);
  const [ov, setOv] = useState(false);   // redusert bevegelse: ingen overganger

  useEffect(() => {
    const r = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (r) { setOv(true); setFase(F.KLAR); }
  }, []);

  useEffect(() => {
    if (synlig && !startet) setStartet(true);
  }, [synlig, startet]);

  useEffect(() => {
    if (!startet) return undefined;
    const ms = AUTO[fase];
    if (ms == null) return undefined;
    if (ov && fase >= F.PUBLISERT && fase < F.DAG6) { setFase(F.DAG6); return undefined; }
    const t = window.setTimeout(() => setFase((f) => f + 1), ms);
    return () => window.clearTimeout(t);
  }, [fase, startet, ov]);

  const publiser = useCallback(() => {
    if (trykketPub) return;
    setTrykketPub(true);
    window.setTimeout(() => setFase(F.PUBLISERT), 320);
  }, [trykketPub]);
  const send = useCallback(() => {
    if (trykketSend) return;
    setTrykketSend(true);
    window.setTimeout(() => setFase(F.SENDT), 320);
  }, [trykketSend]);

  /* Hopp til et kapittel — tilstanden som hører til kapittelets første fase */
  const velg = (i) => {
    const f = KAPITLER[i].fase;
    setTrykketPub(f >= F.DAG1);
    setTrykketSend(false);
    setStartet(true);
    setFase(f);
  };

  const inn = { opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(28px)', transition: ov ? 'none' : `opacity 800ms ${EASE}, transform 800ms ${EASE}` };
  const lys = tema === 'lys';
  const skygge = lys
    ? '0 0 0 1px rgba(21,19,15,0.08), 0 60px 120px -40px rgba(21,19,15,0.35)'
    : '0 0 0 1px rgba(244,241,234,0.12), 0 70px 120px -50px rgba(0,0,0,0.75)';
  const felles = { fase, ov, trykketPub, trykketSend, onPubliser: publiser, onSend: send };

  return (
    <div className="relative mx-auto w-full max-w-[min(1400px,86vw)]" data-testid="v4-annonse-scene" data-fase={fase}>
      <div className="hidden overflow-hidden rounded-[18px] lg:block" style={{ boxShadow: skygge, ...inn }}>
        <Desktop {...felles} />
      </div>
      <div className="mx-auto w-full max-w-[440px] overflow-hidden rounded-[18px] lg:hidden" style={{ boxShadow: skygge, ...inn }}>
        <Kompakt {...felles} />
      </div>
      <div style={{ opacity: synlig ? 1 : 0, transition: ov ? 'none' : `opacity 800ms ${EASE} 300ms` }}>
        <Kapitler fase={fase} onVelg={velg} lys={lys} />
      </div>
    </div>
  );
}
