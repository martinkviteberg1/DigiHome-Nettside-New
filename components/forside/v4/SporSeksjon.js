'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   SporSeksjon — «Samme motor, tre måter å bruke den.»

   Svarer på «ok — autopilot for hvem?» rett etter produktet. Tre kolonner,
   og det første du ser i hver er HVEM den er for — i display-type, med samme
   ord som i menyen: For boligeiere · For eiendomsselskaper · Full forvaltning.

   Form: ro. Fem ting per kolonne, ikke flere: hvem · løftet · ett tegn ·
   én setning · handlingen. Tegnet er det som skiller sporene, og det er ETT
   bilde per kolonne, i samme språk — flisen (en bolig) — bare i ulik skala
   og med ulik hånd på:
     01 Én flis. Et lilla punkt (saken) blir en hake — du godkjente.
     02 42 fliser i tre rekker. De fylles etter hvert som husleien kommer.
     03 Én flis med DigiHome-merket. Haken kommer av seg selv — vi gjorde det.
   Ingen tekst inni tegnene, ingen bokser rundt dem — de står rett på canvas.
   Bevegelsen er ett slag hvert ~3,6 s, forskjøvet per kolonne, bare mens
   seksjonen er i bildet. Kun transform/opacity/background-color.
   Hele kolonnen er lenken; hårlinjen øverst blir lilla på hover. Tredje spor
   er en tjeneste — handlingen er den ene mørke pillen, ikke en tekstlenke.
--------------------------------------------------------------------------- */

const SPOR = [
  {
    id: 'selv',
    hvem: 'For boligeiere',
    lovnad: 'Lei ut selv.',
    legende: '1–5 boliger · du godkjenner det som koster',
    tekst: 'Du eier én eller noen få boliger og vil ha det ryddig — uten å bruke kveldene på det.',
    handling: 'Start med adressen din',
    href: '/boligeiere',
  },
  {
    id: 'skaler',
    hvem: 'For eiendomsselskaper',
    lovnad: 'Skaler forvaltningen.',
    legende: 'Flere bygg · én oversikt, roller og kontroll',
    tekst: 'Dere drifter mange enheter på tvers av bygg og trenger én oversikt — med roller og kontroll.',
    handling: 'Se løsningen for selskaper',
    href: '/bedrift',
  },
  {
    id: 'forvaltning',
    hvem: 'Full forvaltning',
    lovnad: 'Overlat jobben til oss.',
    legende: 'Bergen og omegn · vi gjør jobben, du har siste ord',
    tekst: 'Du vil slippe det praktiske helt. DigiHome forvalter boligen — du beholder oversikten og siste ord.',
    handling: 'Se full forvaltning',
    href: '/forvaltning',
    tjeneste: true,
  },
];

const HAIR = 'rgba(21,19,15,0.14)';
const TOM = 'rgba(21,19,15,0.08)';
const GRONN = '#1F9D55';
const TAKT = 3600;       // ms mellom slagene
const BAND = 150;        // tegnets høyde — lik i alle tre kolonner

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

/* Slaget: teller som går mens seksjonen er i bildet. Tegnene leser sin tilstand av det — én kilde, tre utsnitt. */
function useTakt(aktiv, ms = TAKT) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!aktiv) return undefined;
    const id = window.setInterval(() => setN((k) => k + 1), ms);
    return () => window.clearInterval(id);
  }, [aktiv, ms]);
  return n;
}

/* Merket i hjørnet av en flis: lilla punkt (noe venter på deg) eller grønn hake (gjort). Bytter med et lite sprett. */
function Hjornemerke({ hake, vis = true, delay = 0 }) {
  return (
    <span className="absolute -right-2 -top-2 inline-flex h-7 w-7 items-center justify-center" aria-hidden="true">
      <span className="absolute inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: '#FFFFFF', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 6px 14px -8px rgba(21,19,15,0.4)', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'scale(0.6)', transition: `opacity 320ms ${EASE} ${delay}ms, transform 480ms cubic-bezier(0.34, 1.4, 0.64, 1) ${delay}ms` }}>
        <span className="absolute h-2.5 w-2.5 rounded-full" style={{ background: T.lilla, opacity: hake ? 0 : 1, transform: hake ? 'scale(0.4)' : 'none', transition: `opacity 220ms ${EASE}, transform 300ms ${EASE}` }} />
        <span className="absolute inline-flex" style={{ color: GRONN, opacity: hake ? 1 : 0, transform: hake ? 'none' : 'scale(0.4)', transition: `opacity 260ms ${EASE} 120ms, transform 420ms cubic-bezier(0.34, 1.4, 0.64, 1) 120ms` }}><Hake size={13} /></span>
      </span>
    </span>
  );
}

/* Én flis — boligen. 64 px, ink. */
function Flis({ children, vis, delay = 0 }) {
  return (
    <span className="relative block h-16 w-16 rounded-[14px]" style={{ background: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px) scale(0.94)', transition: `opacity 600ms ${EASE} ${delay}ms, transform 800ms ${EASE} ${delay}ms` }}>
      {children}
    </span>
  );
}

/* ── 01 Én flis. Saken (lilla punkt) kommer, du godkjenner (hake), neste sak kommer. ── */
function TegnSelv({ synlig, takt }) {
  const hake = synlig && takt % 2 === 1;
  return (
    <div className="relative" style={{ height: BAND }} aria-hidden="true" data-testid="v4-spor-tegn-selv" data-hake={hake ? '1' : '0'}>
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Flis vis={synlig} delay={200}><Hjornemerke hake={hake} vis={synlig} delay={700} /></Flis>
      </div>
    </div>
  );
}

/* ── 02 42 fliser i tre rekker — fylles etter hvert som husleien kommer (12 → 24 → 34 → 40 av 42), hviler, begynner på nytt. ── */
const ENHETER = 42;
const KOL = 14;
const REKKE = Array.from({ length: ENHETER }, (_, i) => (i * 17 + 5) % ENHETER);   // fast, men ikke fra venstre mot høyre
function TegnSkaler({ synlig, takt }) {
  const steg = synlig ? takt % 5 : 0;
  const betalt = [12, 24, 34, 40, 40][steg];
  return (
    <div className="relative" style={{ height: BAND }} aria-hidden="true" data-testid="v4-spor-tegn-skaler" data-betalt={betalt}>
      <div className="absolute left-0 top-1/2 grid -translate-y-1/2 gap-1.5" style={{ gridTemplateColumns: `repeat(${KOL}, 18px)` }}>
        {Array.from({ length: ENHETER }, (_, i) => {
          const plass = REKKE.indexOf(i);
          const fylt = plass < betalt;
          return (
            <span key={i} className="block h-[18px] w-[18px] rounded-[5px]" style={{ background: fylt ? T.ink : TOM, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'scale(0.5)', transition: `background-color 520ms ${EASE} ${fylt ? (plass % 12) * 45 : 0}ms, opacity 500ms ${EASE} ${200 + i * 14}ms, transform 600ms ${EASE} ${200 + i * 14}ms` }} />
          );
        })}
      </div>
    </div>
  );
}

/* ── 03 Én flis med DigiHome-merket. Haken kommer av seg selv — ingen sak venter på deg. ── */
function TegnForvaltning({ synlig, takt }) {
  const hake = synlig && takt % 3 !== 0;   // gjort, gjort, ny sak (som vi tar) …
  return (
    <div className="relative" style={{ height: BAND }} aria-hidden="true" data-testid="v4-spor-tegn-forvaltning" data-hake={hake ? '1' : '0'}>
      <div className="absolute left-0 top-1/2 -translate-y-1/2">
        <Flis vis={synlig} delay={200}>
          <span className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/digihome-icon-purple.svg" alt="" width={26} height={26} loading="lazy" decoding="async" className="h-[26px] w-[26px]" draggable={false} />
          </span>
          <Hjornemerke hake={hake} vis={synlig} delay={900} />
        </Flis>
      </div>
    </div>
  );
}

const TEGN = { selv: TegnSelv, skaler: TegnSkaler, forvaltning: TegnForvaltning };

/* Én kolonne. Hele kolonnen er lenken. Hårlinje → hvem → løftet → tegnet (med legende) → én setning → handlingen.
   Subgrid på lg: de seks radene deles på tvers, så tegn, setninger og handlinger står på linje. */
function Kolonne({ s, i, synlig, takt }) {
  const delay = 160 + i * 120;
  const Tegn = TEGN[s.id];
  return (
    <li className="min-w-0 lg:grid lg:row-span-6 lg:grid-rows-subgrid" data-testid={`v4-spor-${s.id}`}>
      <Link
        href={s.href}
        className="group relative flex flex-col pt-7 focus-visible:outline-none lg:grid lg:row-span-6 lg:grid-rows-subgrid lg:pt-8"
        style={{ color: T.ink, opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(22px)', transition: `opacity 800ms ${EASE} ${delay}ms, transform 900ms ${EASE} ${delay}ms` }}
        aria-label={`${s.hvem} — ${s.lovnad} ${s.handling}`}
      >
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px" style={{ background: HAIR }} />
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 transition-transform duration-700 group-hover:scale-x-100 group-focus-visible:scale-x-100" style={{ background: T.lilla, transitionTimingFunction: EASE }} />

        {/* Hvem — det første du ser. Samme ord som i menyen. */}
        <h3 className="text-[clamp(34px,2.7vw,46px)]" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 0.97, color: T.ink }} data-testid={`v4-spor-hvem-${s.id}`}>
          {s.hvem}
        </h3>
        <p className="mt-3 text-[20px] font-medium leading-[1.25] tracking-[-0.01em] sm:text-[21px]" style={{ color: 'rgba(21,19,15,0.72)' }}>{s.lovnad}</p>

        {/* Tegnet — ett bilde, rett på canvas */}
        <div className="mt-8">
          <Tegn synlig={synlig} takt={takt + i} />
        </div>
        <p className="mt-1 text-[13px]" style={{ color: 'rgba(21,19,15,0.45)' }}>{s.legende}</p>

        <p className="mt-8 max-w-[32ch] text-[16px] leading-[1.5] sm:text-[16.5px]" style={{ color: 'rgba(21,19,15,0.66)' }}>
          {s.tekst}
        </p>

        <div className="mt-8 lg:mt-0 lg:self-end lg:pt-10">
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
  const listeRef = useRef(null);
  const listeSynlig = useSynlig(listeRef, 0.3);
  const takt = useTakt(listeSynlig);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });

  return (
    <section id="spor" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-spor">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-12 pt-24 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-16 lg:pt-32">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10" style={inn(0)}>
          <h2 className="text-[clamp(40px,4.4vw,76px)] lg:col-span-8" style={{ ...display, color: T.ink }} data-testid="v4-spor-tittel">
            Autopilot, tilpasset<br />måten du leier ut på.
          </h2>
          <p className="max-w-[34ch] text-[17px] leading-[1.5] sm:text-[18px] lg:col-span-4 lg:pb-2" style={{ color: 'rgba(21,19,15,0.62)' }}>
            Boligeier, eiendomsselskap — eller la oss ta jobben. Samme motor, tre måter å bruke den.
          </p>
        </div>

        <ul ref={listeRef} className="mt-14 grid gap-y-14 md:grid-cols-2 md:gap-x-10 lg:mt-20 lg:grid-cols-3 lg:gap-y-0 xl:gap-x-14" data-testid="v4-spor-liste" data-takt={takt}>
          {SPOR.map((s, i) => <Kolonne key={s.id} s={s} i={i} synlig={listeSynlig || synlig} takt={takt} />)}
        </ul>
      </div>
    </section>
  );
}
