'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   SporSeksjon — «Samme motor, tre måter å bruke den.»

   Svarer på «ok — autopilot for hvem?» rett etter produktet. Tre kolonner,
   og det første du ser i hver er HVEM den er for — i display-type, med samme
   ord som i menyen: For boligeiere · For eiendomsselskaper · Full forvaltning.
   Under: løftet i én setning, så DEN samme motoren i tre utsnitt — en liten
   levende flate med hendelser, som heroens telefonstrøm. Det som skiller
   sporene er skala og hvem som gjør jobben, og det er det scenene viser:
     01 Én bolig — du godkjenner det ene som koster (knappen trykkes, blir hake).
     02 42 enheter i tre bygg — rutenettet fylles etter hvert som husleien kommer,
        og godkjenningen ligger hos en rolle, ikke en person.
     03 Én bolig — DigiHome gjør jobben; hendelsene strømmer, din rad er den
        siste: du leste rapporten.
   Så: hvorfor (én setning), hva du får (tre linjer på hårlinjer), handlingen.
   Hele kolonnen er lenken; hårlinjen øverst blir lilla på hover, scenen løfter
   seg 2 px. Scenene beveger seg i rolig takt (~3,6 s), bare mens seksjonen er
   i bildet. Kun transform/opacity. Ingen bilder, ingen kort-i-kort. Tredje spor
   er en tjeneste — handlingen er den ene mørke pillen, ikke en tekstlenke.
--------------------------------------------------------------------------- */

const SPOR = [
  {
    id: 'selv',
    nr: '01',
    hvem: 'For boligeiere',
    meta: '1–5 boliger',
    lovnad: 'Lei ut selv.',
    tekst: 'Du eier én eller noen få boliger og vil ha det ryddig — uten å bruke kveldene på det.',
    punkter: ['Leiekontrakt signert med BankID', 'Husleie med oppfølging og purring', 'Saker: leverandør og pris — du godkjenner'],
    handling: 'Start med adressen din',
    href: '/boligeiere',
  },
  {
    id: 'skaler',
    nr: '02',
    hvem: 'For eiendomsselskaper',
    meta: 'Portefølje · flere bygg',
    lovnad: 'Skaler forvaltningen.',
    tekst: 'Dere drifter mange enheter på tvers av bygg og trenger én oversikt — med roller og kontroll.',
    punkter: ['Alle bygg og enheter i én oversikt', 'Roller og godkjenning på tvers', 'Saker, økonomi og dokumenter samlet'],
    handling: 'Se løsningen for selskaper',
    href: '/bedrift',
  },
  {
    id: 'forvaltning',
    nr: '03',
    hvem: 'Full forvaltning',
    meta: 'Bergen og omegn',
    lovnad: 'Overlat jobben til oss.',
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

/* Én kolonne. Hele kolonnen er lenken. Hårlinje → tall og meta → HVEM (display) → løftet → scenen → hvorfor → hva du
   får → handlingen nederst (mt-auto: handlingene står på linje i alle tre). */
function Kolonne({ s, i, synlig, takt }) {
  const delay = 160 + i * 120;
  const Scene = SCENER[s.id];
  return (
    <li className="min-w-0 lg:grid lg:row-span-7 lg:grid-rows-subgrid" data-testid={`v4-spor-${s.id}`}>
      {/* Subgrid på lg: de sju radene (tall, hvem, løfte, scene, hvorfor, punkter, handling) deles på tvers av de tre
          kolonnene — så scenene, punktene og handlingene står på linje uansett om en tittel bryter over to linjer. */}
      <Link
        href={s.href}
        className="group relative flex flex-col pt-5 focus-visible:outline-none lg:grid lg:row-span-7 lg:grid-rows-subgrid lg:pt-6"
        style={{ color: T.ink, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(22px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms` }}
        aria-label={`${s.hvem} — ${s.lovnad} ${s.handling}`}
      >
        {/* Hårlinjen øverst — ink, blir lilla på hover/fokus */}
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: HAIR }} />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-700 group-hover:scale-x-100 group-focus-visible:scale-x-100" style={{ background: T.lilla, transitionTimingFunction: EASE }} />

        {/* Tall og meta */}
        <span className="flex items-center justify-between gap-3 text-[13px]" style={{ color: 'rgba(21,19,15,0.45)' }}>
          <span>{s.nr}</span>
          <span>{s.meta}</span>
        </span>

        {/* HVEM — det første du ser. Samme ord som i menyen. Plass til to linjer på lg, så løftene står på linje. */}
        <h3 className="mt-6 text-[clamp(34px,2.7vw,46px)]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.97, color: T.ink }} data-testid={`v4-spor-hvem-${s.id}`}>
          {s.hvem}
        </h3>
        {/* Løftet — én linje, tung nok til å leses som overskrift nummer to */}
        <p className="mt-3 text-[20px] font-medium leading-[1.25] tracking-[-0.01em] sm:text-[21px]" style={{ color: T.ink }}>{s.lovnad}</p>

        {/* Scenen — samme motor, dette sporets utsnitt */}
        <div className="mt-7">
          <Scene synlig={synlig} takt={takt} />
        </div>

        <p className="mt-7 max-w-[34ch] text-[15.5px] leading-[1.5] sm:text-[16px]" style={{ color: 'rgba(21,19,15,0.64)' }}>
          {s.tekst}
        </p>

        {/* Hva du får — tre linjer på hårlinjer. Kort, konkret, sant. */}
        <ul className="mt-5" data-testid={`v4-spor-punkter-${s.id}`}>
          {s.punkter.map((t) => (
            <li key={t} className="py-2.5 text-[14.5px] leading-[1.4]" style={{ borderTop: '1px solid rgba(21,19,15,0.09)', color: 'rgba(21,19,15,0.78)' }}>
              {t}
            </li>
          ))}
        </ul>

        <div className="mt-8 lg:mt-0 lg:self-end lg:pt-9">
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

export default function SporSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.18);
  /* Scenene våkner når kolonnene er i bildet — og slår i takt bare mens de sees */
  const sceneRef = useRef(null);
  const sceneSynlig = useSynlig(sceneRef, 0.25);
  const takt = useTakt(sceneSynlig);
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

        {/* Tre åpne kolonner — hele kolonnen er lenken */}
        <ul ref={sceneRef} className="mt-14 grid gap-y-14 md:grid-cols-2 md:gap-x-10 lg:mt-20 lg:grid-cols-3 lg:gap-y-0 xl:gap-x-14" data-testid="v4-spor-liste" data-takt={takt}>
          {SPOR.map((s, i) => <Kolonne key={s.id} s={s} i={i} synlig={sceneSynlig || synlig} takt={takt} />)}
        </ul>
      </div>
    </section>
  );
}
