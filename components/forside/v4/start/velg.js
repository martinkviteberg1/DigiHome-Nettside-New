'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EASE, T, display } from '../motion';

/* ---------------------------------------------------------------------------
   velg — én kilde for veiskillet «Hvem leier ut?».

   Brukes både av overlayet (KomIGangVelger: modal på desktop, drawer på
   mobil) og av fallback-siden /kom-i-gang (KomIGang). Dørene:
     · Huseier         → /bli-utleier/start
     · Eiendomsselskap → /bli-utleier/start?kind=business
--------------------------------------------------------------------------- */

export const DIM = 'rgba(21,19,15,0.64)';
export const SVAK = 'rgba(21,19,15,0.5)';
export const HAIR = 'rgba(21,19,15,0.12)';

export const VALG = [
  {
    id: 'huseier',
    nr: '01',
    tittel: 'Huseier',
    kort: 'Én bolig eller noen få. Lei ut selv — eller la oss ta alt.',
    under: 'Én bolig eller noen få. Lei ut selv med systemet i ryggen — eller la en fast forvalter hos oss ta alt.',
    href: '/bli-utleier/start',
    bilde: { src: '/v4/stue-2000.webp', srcSet: '/v4/stue-1200.webp 1200w, /v4/stue-2000.webp 2000w', pos: '28% 55%' },
    stikkord: ['Selvforvaltning 5 %', 'Full forvaltning i Bergen', 'Ingen bindingstid'],
  },
  {
    id: 'eiendomsselskap',
    nr: '02',
    tittel: 'Eiendomsselskap',
    kort: 'Portefølje, team og roller. Alle bygg i ett system.',
    under: 'Portefølje, team og roller. Saker, husleie og leietakere på tvers av alle bygg — med godkjenning og full historikk.',
    href: '/bli-utleier/start?kind=business',
    bilde: { src: '/v4/drift/fasade-morgen-1920.webp', srcSet: '/v4/drift/fasade-morgen-1200.webp 1200w, /v4/drift/fasade-morgen-1920.webp 1920w', pos: '50% 50%' },
    stikkord: ['Alle bygg i ett system', 'Roller og godkjenning', 'Registrer med org.nr.'],
  },
];

/* Pilen i sirkel — fylles med ink når døren er aktiv */
export function Pil({ aktiv, size = 44 }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full"
      style={{ width: size, height: size, background: aktiv ? T.ink : 'transparent', color: aktiv ? '#FFFFFF' : T.ink, boxShadow: aktiv ? 'none' : `inset 0 0 0 1px ${HAIR}`, transition: `background-color 420ms ${EASE}, color 420ms ${EASE}, box-shadow 420ms ${EASE}` }}
      aria-hidden="true"
    >
      <ArrowRight className="h-[18px] w-[18px] transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.7} />
    </span>
  );
}

/* ── Rad-dør: nummer (desktop) / miniatyr (mobil), tittel, én setning, pil.
   `kompakt` = tettere versjon for drawer på mobil. ── */
export function Dor({ v, aktiv, onAktiv, onClick, delay = 0, kompakt = false, testid }) {
  return (
    <li className="dh-cover-inn" style={{ animationDelay: `${delay}s` }}>
      <Link
        href={v.href}
        prefetch
        onMouseEnter={onAktiv}
        onFocus={onAktiv}
        onClick={onClick}
        className={`group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 ${kompakt ? '-mx-3 gap-x-4 px-3 py-4' : '-mx-4 gap-x-4 px-4 py-5 sm:-mx-6 sm:gap-x-6 sm:px-6 sm:py-7'}`}
        style={{ background: aktiv ? T.tint : 'transparent', transition: `background-color 420ms ${EASE}` }}
        data-testid={testid || `kig-valg-${v.id}`}
      >
        {/* Nummer på desktop, miniatyr på mobil */}
        {kompakt ? null : <span className="hidden w-8 text-[13px] tabular-nums lg:block" style={{ color: aktiv ? T.ink : SVAK, transition: `color 420ms ${EASE}` }}>{v.nr}</span>}
        <span className={`block shrink-0 overflow-hidden rounded-[12px] ${kompakt ? 'h-[60px] w-[60px]' : 'h-[64px] w-[64px] lg:hidden'}`} style={{ background: T.flate }} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={v.bilde.src} srcSet={v.bilde.srcSet} sizes="64px" alt="" className="h-full w-full select-none object-cover" style={{ objectPosition: v.bilde.pos }} draggable={false} />
        </span>

        <span className="min-w-0">
          <span className={`block ${kompakt ? 'text-[30px]' : 'text-[34px] sm:text-[44px] lg:text-[clamp(40px,3.4vw,58px)]'}`} style={{ ...display, color: T.ink }}>
            {v.tittel}
            <span aria-hidden="true" style={{ color: T.lilla, marginLeft: '0.03em', opacity: aktiv ? 1 : 0, transition: `opacity 420ms ${EASE}` }}>.</span>
          </span>
          <span className={`mt-1.5 block max-w-[42ch] leading-[1.5] ${kompakt ? 'text-[14.5px]' : 'text-[15px] sm:text-[16px]'}`} style={{ color: DIM }}>{kompakt ? v.kort : v.under}</span>
        </span>

        <Pil aktiv={aktiv} size={kompakt ? 40 : 44} />
      </Link>
    </li>
  );
}

/* ── Stor dør (modal på desktop): bilde øverst, tittel + én setning + stikkord under ── */
export function DorStor({ v, aktiv, onAktiv, onClick, delay = 0 }) {
  return (
    <Link
      href={v.href}
      prefetch
      onMouseEnter={onAktiv}
      onFocus={onAktiv}
      onClick={onClick}
      className="dh-cover-inn group block rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30"
      style={{ animationDelay: `${delay}s` }}
      data-testid={`kig-velger-${v.id}`}
    >
      <span className="block overflow-hidden rounded-[18px]" style={{ aspectRatio: '16 / 9', background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={v.bilde.src}
          srcSet={v.bilde.srcSet}
          sizes="(min-width: 640px) 460px, 100vw"
          alt=""
          className="h-full w-full select-none object-cover"
          style={{ objectPosition: v.bilde.pos, transform: aktiv ? 'scale(1.04)' : 'scale(1)', transition: `transform 1100ms ${EASE}`, willChange: 'transform' }}
          draggable={false}
        />
      </span>
      <span className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 px-1">
        <span className="min-w-0">
          <span className="block text-[28px] lg:text-[32px]" style={{ ...display, color: T.ink }}>
            {v.tittel}
            <span aria-hidden="true" style={{ color: T.lilla, marginLeft: '0.03em', opacity: aktiv ? 1 : 0, transition: `opacity 420ms ${EASE}` }}>.</span>
          </span>
          <span className="mt-1.5 block text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{v.kort}</span>
          <span className="mt-2 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[12.5px] leading-[1.5]" style={{ color: SVAK }}>
            {v.stikkord.map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 ? <span aria-hidden="true">·</span> : null}
                <span className="whitespace-nowrap">{s}</span>
              </React.Fragment>
            ))}
          </span>
        </span>
        <Pil aktiv={aktiv} size={40} />
      </span>
    </Link>
  );
}
