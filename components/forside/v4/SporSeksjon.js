'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   SporSeksjon — «Samme motor, tre måter å bruke den.»

   Svarer på «ok — autopilot for hvem?» rett etter produktet (hero → tillit →
   produkt → SPOR → leietaker). Tre spor, formulert som det du prøver å få
   gjort — ikke som organisasjonskart.

   Form: editorial + tre små levende scener. Tre åpne kolonner på canvas, hver
   med én hårlinje øverst, merke og tall, stor display-tittel, én setning — og
   så DEN samme motoren i tre utsnitt: en liten flate med hendelser, som i
   heroens telefonstrøm. Det som skiller sporene er skala og hvem som gjør
   jobben, og det er akkurat det scenene viser:
     01 Én bolig — du godkjenner det ene som koster (knappen trykkes, blir hake).
     02 42 enheter i tre bygg — rutenettet fylles etter hvert som husleien kommer,
        og godkjenningen ligger hos en rolle, ikke en person.
     03 Én bolig — DigiHome gjør jobben; din rad er den siste: du leste rapporten.
   Scenene beveger seg i rolig takt (én ting om gangen, ~3,6 s), bare mens
   seksjonen er i bildet. Kun transform/opacity. Ingen bilder, ingen kort-i-kort.
   Tredje spor er en tjeneste, ikke programvare — handlingen er den ene mørke
   pillen (charcoal), ikke en tekstlenke.

   To former, valgt av radens bredde (ikke viewport):
     · Stage (≥ 1100 px): tre paneler i én rad, ett åpent om gangen. Det åpne
       får plassen — tittel, setning, scenen stort, det du får, handlingen. De
       to andre står som smale rygger (tall, merke, tittel). Bytter av seg
       selv hvert 8. sekund med en lilla fremdriftslinje; pek på en rygg, så
       åpner den, og ingenting skifter mens pekeren hviler på stagen.
     · Kolonner (< 1100 px): tre stablede kolonner, hver med sin scene.
--------------------------------------------------------------------------- */

const SPOR = [
  {
    id: 'selv',
    nr: '01',
    merke: 'Boligeier',
    meta: '1–5 boliger',
    tittel: ['Lei ut', 'selv.'],
    tekst: 'Du eier én eller noen få boliger og vil ha det ryddig uten å bruke kveldene på det.',
    punkter: ['Leiekontrakt signert med BankID', 'Husleie med oppfølging og purring', 'Saker: leverandør og pris — du godkjenner'],
    handling: 'Start med adressen din',
    href: '/boligeiere',
  },
  {
    id: 'skaler',
    nr: '02',
    merke: 'Eiendomsselskap',
    meta: 'Portefølje · flere bygg',
    tittel: ['Skaler', 'forvaltningen.'],
    tekst: 'Dere drifter mange enheter på tvers av bygg og trenger én oversikt — med roller og kontroll.',
    punkter: ['Alle bygg og enheter i én oversikt', 'Roller og godkjenning på tvers', 'Saker, økonomi og dokumenter samlet'],
    handling: 'Se løsningen for selskaper',
    href: '/bedrift',
  },
  {
    id: 'forvaltning',
    nr: '03',
    merke: 'Forvaltning',
    meta: 'Bergen og omegn',
    tittel: ['Overlat jobben', 'til oss.'],
    tekst: 'Du vil slippe det praktiske helt. DigiHome forvalter boligen — du beholder oversikten og siste ord.',
    punkter: ['Vi finner og følger opp leietaker', 'Vi håndterer drift og leverandører', 'Du får oversikten — og siste ord'],
    handling: 'Se full forvaltning',
    href: '/forvaltning',
    tjeneste: true,
  },
];

const HAIR = 'rgba(21,19,15,0.14)';
const PAPIR = '#FBFAF8';
const DIM = 'rgba(21,19,15,0.55)';
const SVAK = 'rgba(21,19,15,0.42)';
const GRONN = '#1F9D55';
const TAKT = 3600;   // ms mellom slagene i scenene

function Pil({ className = '' }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Hake({ size = 12, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.2 5 8.6l4.5-5.2" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Slaget: teller som går mens seksjonen er i bildet. Scenene leser sin tilstand av det — én kilde, tre utsnitt. */
function useTakt(aktiv, ms = TAKT) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!aktiv) return undefined;
    const id = window.setInterval(() => setN((k) => k + 1), ms);
    return () => window.clearInterval(id);
  }, [aktiv, ms]);
  return n;
}

/* ── Scenens byggeklosser ── */

/* Flaten — papir på canvas, én hårlinje-ring, ingen skygge å snakke om. Løfter seg 2 px når kolonnen pekes på. */
function Flate({ children, testid }) {
  return (
    <div className="relative h-[208px] overflow-hidden rounded-[16px] transition-transform duration-500 group-hover:-translate-y-0.5" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 30px 60px -44px rgba(21,19,15,0.35)', transitionTimingFunction: EASE }} aria-hidden="true" data-testid={testid}>
      {children}
    </div>
  );
}

/* Topplinjen i scenen — hva vi ser på, og status ytterst */
function Topp({ venstre, hoyre }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 pt-3.5 text-[12px]" style={{ color: SVAK }}>
      <span className="truncate font-medium" style={{ color: 'rgba(21,19,15,0.7)' }}>{venstre}</span>
      <span className="shrink-0">{hoyre}</span>
    </div>
  );
}

/* Én hendelse — ikon, tittel/undertekst, og noe til høyre. Glir inn nedenfra når den kommer. */
function Rad({ ikon, tittel, sub, hoyre, vis = true, delay = 0, siste = false }) {
  return (
    <div className="flex items-center gap-3 px-4" style={{ height: 54, boxShadow: siste ? 'none' : 'inset 0 -1px 0 rgba(21,19,15,0.07)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(8px)', transition: `opacity 520ms ${EASE} ${delay}ms, transform 640ms ${EASE} ${delay}ms` }}>
      <span className="shrink-0">{ikon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13.5px] font-medium leading-[1.25]" style={{ color: T.ink }}>{tittel}</span>
        <span className="mt-0.5 block truncate text-[12px] leading-[1.25]" style={{ color: DIM }}>{sub}</span>
      </span>
      <span className="shrink-0 text-[12px]" style={{ color: SVAK }}>{hoyre}</span>
    </div>
  );
}

function IkonHake() {
  return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C' }}><Hake /></span>;
}
function IkonLilla() {
  return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(212,150,255,0.28)' }}><span className="h-2 w-2 rounded-full" style={{ background: T.lilla }} /></span>;
}
function IkonDigiHome() {
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: 'rgba(21,19,15,0.06)' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/digihome-icon-purple.svg" alt="" width={12} height={12} loading="lazy" decoding="async" className="h-3 w-3" draggable={false} />
    </span>
  );
}
function IkonDu() {
  return <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[10.5px] font-medium" style={{ background: T.ink, color: T.offwhite }}>Du</span>;
}

/* ── 01 Én bolig — det ene som koster, godkjenner du. Knappen trykkes (slaget), blir hake. ── */
const SAKER = [
  { t: 'Rørlegger · 1 850 kr', kl: '20:41' },
  { t: 'Vaskemaskin · 4 200 kr', kl: '08:12' },
];
function SceneSelv({ synlig, takt }) {
  /* Fire slag: sak 1 kommer → godkjent → sak 2 kommer → godkjent. Det ene du gjør, og hvor lite det er. */
  const godkjent = synlig && takt % 2 === 1;
  const sak = SAKER[Math.floor((synlig ? takt : 0) / 2) % SAKER.length];
  return (
    <Flate testid="v4-spor-scene-selv">
      <Topp venstre="Nygårdsgaten 5 · Leilighet 2" hoyre={<span className="inline-flex items-center gap-1.5"><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: GRONN }} />Alt i orden</span>} />
      <div className="mt-2">
        <Rad ikon={<IkonHake />} tittel="Husleie 12 500 kr" sub="Emma · inn 1. november" hoyre="i dag" vis={synlig} delay={200} />
        <Rad ikon={<IkonHake />} tittel="Leiekontrakt" sub="Signert med BankID · 3 år" hoyre="uke 40" vis={synlig} delay={320} />
        <div className="flex items-center gap-3 px-4" style={{ height: 54, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(8px)', transition: `opacity 520ms ${EASE} 440ms, transform 640ms ${EASE} 440ms` }}>
          <span className="shrink-0"><IkonLilla /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium leading-[1.25]" style={{ color: T.ink }}>{sak.t}</span>
            <span className="relative mt-0.5 block h-[15px] overflow-hidden text-[12px] leading-[1.25]" style={{ color: DIM }}>
              <span className="absolute inset-x-0 top-0 block truncate" style={{ opacity: godkjent ? 0 : 1, transform: godkjent ? 'translateY(-8px)' : 'none', transition: `opacity 300ms ${EASE}, transform 400ms ${EASE}` }}>Tilbud klart — godkjenner du?</span>
              <span className="absolute inset-x-0 top-0 block truncate" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(8px)', transition: `opacity 300ms ${EASE} 120ms, transform 400ms ${EASE} 120ms` }}>Godkjent av deg · {sak.kl}</span>
            </span>
          </span>
          {/* Knappen: én lilla pille — det eneste du gjør. Blir til en hake når slaget faller. */}
          <span className="relative h-8 w-[92px] shrink-0">
            <span className="absolute inset-y-0 right-0 inline-flex items-center rounded-full px-3 text-[12.5px] font-medium" style={{ background: T.lilla, color: T.ink, opacity: godkjent ? 0 : 1, transform: godkjent ? 'scale(0.92)' : 'none', transition: `opacity 260ms ${EASE}, transform 320ms ${EASE}` }}>Godkjenn</span>
            <span className="absolute inset-y-0 right-0 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: '#166B3C', opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateX(6px)', transition: `opacity 300ms ${EASE} 160ms, transform 420ms ${EASE} 160ms` }}><Hake />Godkjent</span>
          </span>
        </div>
      </div>
    </Flate>
  );
}

/* ── 02 42 enheter i tre bygg — rutenettet fylles etter hvert som husleien kommer. Godkjenning hos en rolle. ── */
const ENHETER = 42;
const KOL = 14;
/* Rekkefølgen husleien kommer i — fast, men ikke fra venstre mot høyre (det ser generert ut). */
const REKKE = Array.from({ length: ENHETER }, (_, i) => (i * 17 + 5) % ENHETER);
function SceneSkaler({ synlig, takt }) {
  /* Fyllingen går i fire slag (12 → 24 → 34 → 40), så hviler den med 40 av 42 før den begynner på nytt */
  const steg = synlig ? takt % 5 : 0;
  const betalt = [12, 24, 34, 40, 40][steg];
  const maaned = ['oktober', 'november', 'desember'][Math.floor((synlig ? takt : 0) / 5) % 3];
  const paaminnet = steg >= 3 ? 1 : 0;   // én får en vennlig Vipps-påminnelse
  const tilstand = (i) => {
    const plass = REKKE.indexOf(i);
    if (plass < betalt) return 'betalt';
    if (paaminnet && plass === betalt) return 'paaminnet';
    return 'venter';
  };
  return (
    <Flate testid="v4-spor-scene-skaler">
      <Topp venstre="3 bygg · 42 enheter" hoyre={`${maaned} · husleie`} />
      <div className="px-4 pb-1 pt-3">
        <div className="grid gap-[5px]" style={{ gridTemplateColumns: `repeat(${KOL}, minmax(0, 1fr))` }} data-testid="v4-spor-rutenett" data-betalt={betalt}>
          {Array.from({ length: ENHETER }, (_, i) => {
            const t = tilstand(i);
            return (
              <span key={i} className="block aspect-square rounded-[3px]" style={{ background: t === 'betalt' ? T.ink : t === 'paaminnet' ? T.lilla : 'rgba(21,19,15,0.08)', opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'scale(0.6)', transition: `background-color 500ms ${EASE} ${t === 'betalt' ? (REKKE.indexOf(i) % 12) * 45 : 0}ms, opacity 500ms ${EASE} ${120 + i * 12}ms, transform 600ms ${EASE} ${120 + i * 12}ms` }} />
            );
          })}
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[12px]" style={{ color: DIM }}>
          <span><span className="font-medium" style={{ color: T.ink }}>{betalt} av 42</span> betalt{paaminnet ? ' · 1 påminnet med Vipps' : ''}</span>
          <span>{Math.round((betalt / ENHETER) * 100)} %</span>
        </div>
      </div>
      <div className="mt-1">
        <Rad ikon={<IkonLilla />} tittel="Sak · Nygårdsgaten 5 · 1 850 kr" sub="Godkjent av økonomiansvarlig — ikke av deg" hoyre="rolle" vis={synlig} delay={600} siste />
      </div>
    </Flate>
  );
}

/* ── 03 Én bolig — DigiHome gjør jobben. Hendelsene strømmer gjennom to rader (den nye kommer opp nedenfra, den
      eldste glir ut over toppen); din rad ligger fast nederst: du leste oppsummeringen. ── */
const GJORT = [
  { t: 'Leietaker funnet', s: 'Emma · BankID-verifisert · kontrakt signert', h: 'uke 41' },
  { t: 'Rørlegger booket', s: 'Torsdag 09:00 · 1 850 kr · innenfor rammen', h: 'uke 42' },
  { t: 'Husleie inn', s: '12 500 kr · ingen purring nødvendig', h: '1. nov' },
  { t: 'Regnskapet ført', s: 'Oktober · fakturaen på riktig leilighet', h: '31. okt' },
  { t: 'Visning holdt', s: 'Lørdag 12:00 · 2 påmeldte · én søker', h: 'uke 41' },
];
const RAD_H = 54;
function SceneForvaltning({ synlig, takt }) {
  const t = synlig ? takt : 0;
  return (
    <Flate testid="v4-spor-scene-forvaltning">
      <Topp venstre="Forvaltet av DigiHome" hoyre={<span>din tid: <span className="font-medium" style={{ color: T.ink }}>2 min</span></span>} />
      <div className="relative mt-2 overflow-hidden" style={{ height: RAD_H * 3 }}>
        {GJORT.map((g, idx) => {
          /* rel 0–1 = de to synlige radene; 4 = raden som nettopp gikk ut (glir opp og ut); 2–3 = venter under, usynlig */
          const rel = (((idx - t) % GJORT.length) + GJORT.length) % GJORT.length;
          const pos = rel === GJORT.length - 1 ? -1 : rel;
          const vis = synlig && (pos === 0 || pos === 1);
          const beveger = pos >= -1 && pos <= 1;
          return (
            <div key={g.t} className="absolute inset-x-0 top-0" style={{ transform: `translateY(${pos * RAD_H}px)`, opacity: vis ? 1 : 0, transition: beveger ? `transform 700ms ${EASE}, opacity 500ms ${EASE} ${pos === 1 ? 120 : 0}ms` : 'none', willChange: 'transform, opacity' }} aria-hidden={!vis}>
              <Rad ikon={<IkonDigiHome />} tittel={g.t} sub={g.s} hoyre={g.h} />
            </div>
          );
        })}
        <div className="absolute inset-x-0" style={{ top: RAD_H * 2 }}>
          <Rad ikon={<IkonDu />} tittel="Du leste oppsummeringen" sub="Oktober · alt i orden · 12 500 kr utbetalt" hoyre="1 min" vis={synlig} delay={440} siste />
        </div>
      </div>
    </Flate>
  );
}

const SCENER = { selv: SceneSelv, skaler: SceneSkaler, forvaltning: SceneForvaltning };

/* Én kolonne. Hele kolonnen er lenken. Hårlinje → merke → tittel → setning → scenen → hva du får → handling nederst. */
function Kolonne({ s, i, synlig, takt }) {
  const delay = 160 + i * 120;
  const Scene = SCENER[s.id];
  return (
    <li className="min-w-0" data-testid={`v4-spor-${s.id}`}>
      <Link
        href={s.href}
        className="group relative flex h-full flex-col pt-5 focus-visible:outline-none lg:pt-6"
        style={{ color: T.ink, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(22px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms` }}
        aria-label={`${s.tittel.join(' ')} — ${s.handling}`}
      >
        {/* Hårlinjen øverst — ink, blir lilla på hover/fokus */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: HAIR }} />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-700 group-hover:scale-x-100 group-focus-visible:scale-x-100" style={{ background: T.lilla, transitionTimingFunction: EASE }} />

        {/* Hvem: merke (pille) + meta, tallet ytterst — man skal se på ett blikk hvem sporet er for */}
        <span className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-medium" style={{ background: 'rgba(21,19,15,0.07)', color: T.ink }} data-testid={`v4-spor-merke-${s.id}`}>{s.merke}</span>
            <span className="hidden text-[13px] sm:inline" style={{ color: 'rgba(21,19,15,0.5)' }}>{s.meta}</span>
          </span>
          <span className="text-[13px] tabular-nums" style={{ color: 'rgba(21,19,15,0.4)' }}>{s.nr}</span>
        </span>

        <h3 className="mt-7 text-[clamp(38px,3.1vw,56px)] sm:mt-8" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.96, color: T.ink }}>
          {s.tittel[0]}<br />{s.tittel[1]}
        </h3>

        {/* Fast høyde for tre linjer på lg — så scenene står på samme linje i alle tre kolonnene */}
        <p className="mt-4 max-w-[32ch] text-[16px] leading-[1.5] sm:text-[16.5px] lg:min-h-[4.5em]" style={{ color: 'rgba(21,19,15,0.64)' }}>
          {s.tekst}
        </p>

        {/* Scenen — samme motor, dette sporets utsnitt */}
        <div className="mt-7">
          <Scene synlig={synlig} takt={takt} />
        </div>

        {/* Hva du får — tre linjer på hårlinjer. Kort, konkret, sant. */}
        <ul className="mt-7" data-testid={`v4-spor-punkter-${s.id}`}>
          {s.punkter.map((t) => (
            <li key={t} className="py-2.5 text-[14.5px] leading-[1.4]" style={{ borderTop: '1px solid rgba(21,19,15,0.09)', color: 'rgba(21,19,15,0.78)' }}>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-8 lg:mt-auto lg:pt-9">
          {s.tjeneste ? (
            <span className="inline-flex h-11 w-fit items-center gap-2 rounded-[12px] px-5 text-[15px] font-medium transition-[background-color,transform] duration-300 group-hover:bg-[#2A2620] group-active:scale-[0.98]" style={{ background: T.charcoal, color: T.offwhite }}>
              {s.handling}
              <Pil className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover:translate-x-1" />
            </span>
          ) : (
            <span className="inline-flex h-11 items-center gap-2 text-[15px] font-medium" style={{ color: T.ink }}>
              {s.handling}
              <Pil className="transition-transform duration-500 ease-out group-hover:translate-x-1.5" />
            </span>
          )}
        </div>
      </Link>
    </li>
  );
}

/* ── Stagen (bred skjerm, ≥ 1100 px container): tre paneler i én rad, ett åpent om gangen. Det åpne panelet får plassen
   (scenen stort, det du får, handlingen); de to andre står som smale «rygger» med tall og tittel. Panelene bytter av seg
   selv (AUTO_MS) mens seksjonen er i bildet — pek eller trykk på en rygg, så åpner den og autoskiftet hviler i 14 s.
   Bredden animeres som flex-basis i px; innholdet ligger på faste bredder inni, så ingen tekst reflower underveis —
   bare boksen beveger seg, og innholdet krysstoner. Kun transform/opacity/flex-basis. ── */
const AUTO_MS = 8000;
const KOLLAPS = 272;
const GAP = 12;
const PANEL_H = 520;
const MORF = 'cubic-bezier(0.65, 0, 0.35, 1)';

/* Den lilla linjen øverst i det åpne panelet: fylles fra 0 til 100 % over AUTO_MS — starter på nytt hver gang panelet
   åpner (key), og bare når stagen går av seg selv. */
function Fremdrift({ aktiv }) {
  const [gaar, setGaar] = useState(false);
  useEffect(() => {
    if (!aktiv) { setGaar(false); return undefined; }
    const id = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setGaar(true)));
    return () => window.cancelAnimationFrame(id);
  }, [aktiv]);
  return (
    <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] overflow-hidden" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>
      <span className="absolute inset-y-0 left-0 block" style={{ background: T.lilla, width: gaar ? '100%' : '0%', transition: gaar ? `width ${AUTO_MS}ms linear` : 'none' }} />
    </span>
  );
}

function Panel({ s, er, aktivW, onVelg, synlig, takt, auto }) {
  const Scene = SCENER[s.id];
  return (
    <li
      className="relative overflow-hidden rounded-[20px]"
      style={{ flex: `0 0 ${er ? aktivW : KOLLAPS}px`, height: PANEL_H, background: er ? PAPIR : 'rgba(21,19,15,0)', boxShadow: `0 0 0 1px ${er ? 'rgba(21,19,15,0.10)' : 'rgba(21,19,15,0.13)'}`, transition: `flex-basis 820ms ${MORF}, background-color 520ms ${EASE}, box-shadow 520ms ${EASE}`, cursor: er ? 'default' : 'pointer', willChange: 'flex-basis' }}
      onMouseEnter={() => { if (!er) onVelg(s.id); }}
      onClick={() => { if (!er) onVelg(s.id); }}
      data-testid={`v4-spor-${s.id}`}
      data-aktiv={er ? '1' : '0'}
    >
      {/* Fremdriften — den lilla linjen øverst fylles i takt med autoskiftet (bare når stagen går av seg selv) */}
      <Fremdrift aktiv={er && auto} />

      {/* Ryggen — det panelet viser når det er lukket: tall øverst, tittel nederst, pil */}
      <div className="absolute inset-y-0 left-0 flex flex-col p-7" style={{ width: KOLLAPS, opacity: er ? 0 : 1, transition: `opacity 320ms ${EASE} ${er ? 0 : 320}ms`, pointerEvents: 'none' }} aria-hidden={er}>
        <div className="flex items-center justify-between">
          <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-medium" style={{ background: 'rgba(21,19,15,0.07)', color: T.ink }}>{s.merke}</span>
          <span className="text-[13px]" style={{ color: 'rgba(21,19,15,0.4)' }}>{s.nr}</span>
        </div>
        <h3 className="mt-auto text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 0.98, color: T.ink }}>
          {s.tittel[0]}<br />{s.tittel[1]}
        </h3>
        <p className="mt-4 text-[13px]" style={{ color: 'rgba(21,19,15,0.5)' }}>{s.meta}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-medium" style={{ color: T.ink }}>Se hvordan <Pil className="h-4 w-4" /></span>
      </div>

      {/* Det åpne panelet: hvem · tittel · setning · scenen stort til venstre, det du får og handlingen til høyre */}
      <div className="absolute inset-y-0 left-0 flex flex-col p-7" style={{ width: aktivW, opacity: er ? 1 : 0, transition: `opacity 460ms ${EASE} ${er ? 300 : 0}ms`, pointerEvents: er ? 'auto' : 'none' }} aria-hidden={!er}>
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2.5">
            <span className="inline-flex h-[26px] items-center rounded-full px-2.5 text-[12.5px] font-medium" style={{ background: 'rgba(21,19,15,0.07)', color: T.ink }} data-testid={`v4-spor-merke-${s.id}`}>{s.merke}</span>
            <span className="text-[13px]" style={{ color: 'rgba(21,19,15,0.5)' }}>{s.meta}</span>
          </span>
          <span className="text-[13px]" style={{ color: 'rgba(21,19,15,0.4)' }}>{s.nr}</span>
        </div>
        <div className="mt-7 grid grid-cols-12 items-end gap-x-10">
          <h3 className="col-span-7 text-[clamp(40px,3.2vw,56px)]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.96, color: T.ink }}>
            {s.tittel[0]}<br />{s.tittel[1]}
          </h3>
          <p className="col-span-5 max-w-[34ch] pb-1 text-[16px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.64)' }}>{s.tekst}</p>
        </div>
        <div className="mt-auto grid grid-cols-12 items-end gap-x-10">
          <div className="col-span-7"><Scene synlig={synlig && er} takt={takt} /></div>
          <div className="col-span-5">
            <ul data-testid={`v4-spor-punkter-${s.id}`}>
              {s.punkter.map((t, k) => (
                <li key={t} className="py-2.5 text-[14.5px] leading-[1.4]" style={{ borderTop: k === 0 ? 'none' : '1px solid rgba(21,19,15,0.09)', color: 'rgba(21,19,15,0.78)', opacity: er ? 1 : 0, transform: er ? 'none' : 'translateY(6px)', transition: `opacity 500ms ${EASE} ${er ? 420 + k * 90 : 0}ms, transform 600ms ${EASE} ${er ? 420 + k * 90 : 0}ms` }}>
                  {t}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              <Link href={s.href} className={`group/l inline-flex h-11 items-center gap-2 text-[15px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 ${s.tjeneste ? 'rounded-[12px] px-5 transition-[background-color,transform] duration-300 hover:bg-[#2A2620] active:scale-[0.98]' : 'hover:opacity-80'}`} style={s.tjeneste ? { background: T.charcoal, color: T.offwhite } : { color: T.ink }} tabIndex={er ? 0 : -1} aria-label={`${s.tittel.join(' ')} — ${s.handling}`}>
                {s.handling}
                <Pil className="h-[18px] w-[18px] transition-transform duration-500 ease-out group-hover/l:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

export default function SporSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.18);
  /* Scenene våkner når panelene er i bildet — og slår i takt bare mens de sees */
  const sceneRef = useRef(null);
  const sceneSynlig = useSynlig(sceneRef, 0.25);
  const takt = useTakt(sceneSynlig);
  /* Bredden på raden avgjør formen: stage (ett åpent panel) fra 1100 px, ellers tre stablede kolonner */
  const [W, setW] = useState(0);
  useEffect(() => {
    const el = sceneRef.current; if (!el) return undefined;
    const f = () => setW(el.offsetWidth);
    f();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(f) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);
  const bred = W >= 1100;
  const aktivW = Math.max(0, W - 2 * KOLLAPS - 2 * GAP);
  /* Hvilket panel som er åpent. Bytter av seg selv mens stagen er i bildet; et valg holder i 14 s. */
  const [aktiv, setAktiv] = useState('selv');
  const [auto, setAuto] = useState(true);
  const pause = useRef(0);
  useEffect(() => {
    if (!bred || !sceneSynlig) return undefined;
    const id = window.setInterval(() => {
      if (Date.now() < pause.current) return;
      setAuto(true);
      setAktiv((a) => SPOR[(SPOR.findIndex((s) => s.id === a) + 1) % SPOR.length].id);
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [bred, sceneSynlig]);
  const velg = (id) => { pause.current = Date.now() + 14000; setAuto(false); setAktiv(id); };
  /* Mens pekeren hviler på stagen skifter ingenting av seg selv — folk leser. Når den går ut, tar autoskiftet over igjen. */
  const paaStagen = () => { pause.current = Number.MAX_SAFE_INTEGER; setAuto(false); };
  const avStagen = () => { pause.current = Date.now() + 3000; };
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });

  return (
    <section id="spor" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-spor">
      {/* Container: editorial (1360) — seksjonen skal ha ro, ikke bredde. */}
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-12 pt-24 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-16 lg:pt-32">
        {/* Tittel + én linje */}
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
          <h2 className="text-[clamp(40px,4.4vw,76px)] lg:col-span-8" style={{ ...display, color: T.ink }} data-testid="v4-spor-tittel">
            Autopilot, tilpasset<br />måten du leier ut på.
          </h2>
          <p className="max-w-[34ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-4 lg:pb-2" style={{ color: 'rgba(21,19,15,0.62)' }}>
            Boligeier, eiendomsselskap — eller la oss ta jobben. Samme motor, tre måter å bruke den.
          </p>
        </div>

        <div ref={sceneRef} className="mt-12 lg:mt-16" data-testid="v4-spor-liste" data-takt={takt} data-form={bred ? 'stage' : 'kolonner'} data-aktiv={aktiv}>
          {bred ? (
            <ul className="flex items-stretch" style={{ gap: GAP, opacity: sceneSynlig || synlig ? 1 : 0, transform: sceneSynlig || synlig ? 'none' : 'translateY(22px)', transition: `opacity 800ms ${EASE} 160ms, transform 900ms ${EASE} 160ms` }} onMouseEnter={paaStagen} onMouseLeave={avStagen}>
              {SPOR.map((s) => <Panel key={s.id} s={s} er={aktiv === s.id} aktivW={aktivW} onVelg={velg} synlig={sceneSynlig || synlig} takt={takt} auto={auto} />)}
            </ul>
          ) : (
            <ul className="grid gap-y-14 md:grid-cols-2 md:gap-x-10">
              {SPOR.map((s, i) => <Kolonne key={s.id} s={s} i={i} synlig={sceneSynlig || synlig} takt={takt} />)}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
