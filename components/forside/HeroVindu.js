'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutGrid, Home, Users, MessageSquare, FileText, ClipboardList, Building2,
  CalendarDays, Clock, Inbox, Sparkles, Search, ChevronRight, ChevronDown,
  ArrowUpRight, Wallet, TrendingUp, BookOpen, Landmark, ShieldCheck,
  PanelLeftClose, Wrench, DollarSign, CircleCheck, Send, Calendar, Lock, Filter,
  ChevronLeft, ArrowLeft, Camera, Mail, Phone, BedDouble, KeyRound,
} from 'lucide-react';

/* ---------------------------------------------------------------------------
   Hero-vinduet — levende produktvindu. Alle flater er replikaer av appen:
   · Oversikt: appens ekte dashboard (fasit: /public/deck-desktop.webp)
   · Kalender: AdminCalendar multi-tidslinje (fasit: ForvalterFullskjerm.tsx,
     1:1-replika fra repo-koden — Airbnb-aktig tidslinje, KT #FF385C,
     LT #6366f1, sperret #484848, vedlikehold beige, lilla i dag-pille)
   · Enheter: AdminUnitDetail/StedetTab (fasit: EnhetDetalj-replika)
   · Økonomi: Eieroppgjør/OwnerFinance (fasit: OkonomiDemo.tsx-replika)
   Koreografi: 2.4s sidebar glir ut → modulbytte hver 5.2s. Kun opacity/
   transform. Pause ved hover. prefers-reduced-motion → statisk.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const MODULER = ['oversikt', 'kalender', 'enheter', 'okonomi'];

/* Flat nav-liste — nøyaktig som i appen */
const NAV = [
  [LayoutGrid, 'Oversikt', 'oversikt'],
  [Inbox, 'Innboks', null],
  [CalendarDays, 'Kalender', 'kalender'],
  [Clock, 'Operasjonssentral', null],
  [Building2, 'Eiendommer', 'enheter'],
  [TrendingUp, 'Salg', null],
  [ClipboardList, 'Saker', null],
  [BookOpen, 'Driftshåndbok', null],
  [FileText, 'Kontrakter', null],
  [Wallet, 'Økonomi', 'okonomi'],
  [Wrench, 'Leverandører', null],
  [Users, 'Brukere', null],
];

const BUNN = [
  [Landmark, 'Organisasjon'],
  [ShieldCheck, 'Superadmin'],
];

function Kurve({ farge = '#1f7a45', ned = false, flat = false }) {
  const pts = flat
    ? '0,10 12,10 24,10 36,10 48,10 60,10'
    : ned ? '0,5 12,8 24,6 36,12 48,14 60,17' : '0,17 12,13 24,14 36,9 48,6 60,2';
  return (
    <svg viewBox="0 0 60 20" className="h-[18px] w-[60px]" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={farge} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Label som fader inn når sidebaren åpnes */
function Lbl({ apen, delay = 0, className = '', children }) {
  return (
    <span
      className={`whitespace-nowrap ${className}`}
      style={{
        opacity: apen ? 1 : 0,
        transform: apen ? 'none' : 'translateX(-6px)',
        transition: `opacity 480ms ${EASE} ${delay}ms, transform 480ms ${EASE} ${delay}ms`,
      }}
    >{children}</span>
  );
}

/* Modul-lag — crossfade med opacity + liten løft. Oversikt ligger i flyt og gir høyden. */
function Lag({ aktiv, iFlyt = false, children }) {
  return (
    <div
      className={iFlyt ? 'bg-[#FAFAF8]' : 'absolute inset-0 overflow-hidden bg-[#FAFAF8]'}
      style={{
        opacity: aktiv ? 1 : 0,
        transform: aktiv ? 'none' : 'translateY(12px)',
        transition: `opacity 640ms ${EASE}, transform 640ms ${EASE}`,
      }}
    >{children}</div>
  );
}

/* ── Modul: Oversikt — replika av appens dashboard ── */
function FlateOversikt() {
  return (
    <div className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
      {/* Header — fotoavatar + God morgen, som i appen */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://randomuser.me/api/portraits/men/85.jpg" alt="" loading="lazy" className="h-[38px] w-[38px] rounded-full object-cover ring-2 ring-white" />
          <div>
            <p className="whitespace-nowrap text-[19px] font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]" style={heading}>God morgen, Martin</p>
            <p className="mt-[2px] whitespace-nowrap text-[10px] text-[#a49e93]">Tirsdag 1. September 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-[7px] text-[10.5px] font-semibold text-[#0A0A0A] shadow-[0_1px_2px_rgba(23,18,12,0.06)] ring-1 ring-black/[0.06] sm:flex">
            Saker <span className="rounded-full bg-[#d13438] px-[6px] py-[1px] text-[8px] font-bold text-white">71</span>
          </span>
          <span className="hidden rounded-full bg-[#141216] px-3.5 py-[8px] text-[10.5px] font-semibold text-white sm:block">Eiendommer</span>
        </div>
      </div>

      {/* Ett varslingskort — som i appen */}
      <div className="mt-4 flex max-w-[300px] items-center gap-2.5 rounded-[11px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
        <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] bg-[#FBEFE4] text-[10px] font-bold text-[#c2410c]">71</span>
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#3A3733]">71 åpne saker</span>
        <ChevronRight className="h-[11px] w-[11px] shrink-0 text-[#c8c3ba]" />
      </div>

      {/* KPI-bånd — som i appen */}
      <div className="mt-3 grid grid-cols-4 divide-x divide-black/[0.05] rounded-[12px] bg-white shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
        <div className="p-3">
          <div className="flex items-center justify-between gap-1">
            <p className="truncate text-[9px] font-medium text-[#a49e93]">Månedlig inntekt</p>
            <span className="shrink-0 rounded-full bg-[#E7F3EC] px-1.5 py-[2px] text-[7.5px] font-bold text-[#1f7a45]">+8.2%</span>
          </div>
          <p className="mt-1.5 text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>894 500<span className="ml-[2px] text-[9px] font-semibold text-[#a49e93]">kr</span></p>
          <div className="mt-2.5"><Kurve farge="#1f7a45" /></div>
        </div>
        <div className="p-3">
          <p className="truncate text-[9px] font-medium text-[#a49e93]">Årsestimat</p>
          <p className="mt-1.5 text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>10.7M<span className="ml-[2px] text-[9px] font-semibold text-[#a49e93]">kr</span></p>
          <div className="mt-2.5"><Kurve farge="#d68fc0" /></div>
        </div>
        <div className="p-3">
          <p className="truncate text-[9px] font-medium text-[#a49e93]">DigiHome honorar</p>
          <p className="mt-1.5 text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>126 987<span className="ml-[2px] text-[9px] font-semibold text-[#a49e93]">kr</span></p>
          <div className="mt-2.5"><Kurve farge="#c8c3ba" flat /></div>
        </div>
        <div className="p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-[9px] font-medium text-[#a49e93]">Belegg</p>
            <p className="text-[8px] font-semibold text-[#a49e93]">41/84</p>
          </div>
          <p className="mt-1.5 text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>48.8<span className="ml-[2px] text-[9px] font-semibold text-[#a49e93]">%</span></p>
          <div className="mt-[12px] h-[5px] overflow-hidden rounded-full bg-[#EFEBE4]">
            <div className="h-full w-[49%] rounded-full bg-gradient-to-r from-[#7c3aed] to-[#9B5BD6]" />
          </div>
          <p className="mt-[8px] truncate text-[8px] text-[#a49e93]">41 enheter utleid</p>
        </div>
      </div>

      {/* Statskort — som i appen */}
      <div className="mt-2.5 grid grid-cols-4 gap-2.5">
        {[
          [Building2, '59', 'Eiendommer', null, null, true, '#1f7a45', false, '#F4F1EB', '#57534e'],
          [Home, '84', 'Enheter', '41 utleid', '#1f7a45', false, '#2563eb', false, '#F4F1EB', '#57534e'],
          [Users, '43', 'Leietakere', null, null, false, '#c8c3ba', false, '#F4F1EB', '#57534e'],
          [Clock, '71', 'Åpne saker', 'Trenger oppfølging', '#d13438', false, '#d13438', true, '#FBEFE4', '#c2410c'],
        ].map(([Ikon, v, l, sub, subFarge, live, kurveFarge, ned, ikonBg, ikonFarge]) => (
          <div key={l} className="rounded-[12px] bg-white p-3 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
            <div className="flex items-center justify-between">
              <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px]" style={{ background: ikonBg }}><Ikon className="h-[12px] w-[12px]" style={{ color: ikonFarge }} /></span>
              <span className="flex items-center gap-1.5">
                {live ? <span className="flex items-center gap-1 text-[8px] font-bold text-[#1f7a45]"><span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#1f7a45]" />LIVE</span> : null}
                <Kurve farge={kurveFarge} ned={ned} />
              </span>
            </div>
            <p className="mt-2.5 text-[19px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}</p>
            <p className="mt-[4px] truncate text-[9px] font-medium text-[#8d877d]">{l}</p>
            {sub ? <p className="truncate text-[8px] font-semibold" style={{ color: subFarge }}>{sub}</p> : <p className="text-[8px]">&nbsp;</p>}
          </div>
        ))}
      </div>

      {/* Mørk innsiktsbanner — som i appen */}
      <div className="mt-2.5 flex items-center justify-between gap-3 overflow-hidden rounded-[14px] bg-[#0f0d0e] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] bg-[#7c3aed]/[0.35]"><Sparkles className="h-[12px] w-[12px] text-[#D9B4FF]" /></span>
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-bold text-white" style={heading}>Porteføljen presterer over gjennomsnittet</p>
            <p className="truncate text-[9px] text-white/50">Leieinntektene har økt 8.2% siste 30 dager.</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#B583F0] px-3.5 py-[7px] text-[10px] font-bold text-white">Se detaljer <ArrowUpRight className="h-[10px] w-[10px]" /></span>
      </div>

      {/* Aktive saker / Portefølje — som i appen, kuttet av bunnkanten */}
      <div className="mt-3.5 grid h-[104px] grid-cols-2 gap-3 overflow-hidden">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-bold text-[#0A0A0A]" style={heading}>Aktive saker</p>
            <span className="text-[9px] font-semibold text-[#8d877d]">Se alle</span>
          </div>
          <div className="mt-2 rounded-t-[10px] bg-white ring-1 ring-black/[0.05]">
            {[
              ['Oppvaskmaskin stopper midt i program', 'Annet · 2d', 'Åpen', '#0e7490', '#7c3aed'],
              ['Varmtvannsbereder lekker', 'Annet · 3d', 'Pågår', '#9a6b1c', '#9a6b1c'],
              ['Behov for hageklipp', 'Annet · 5d', 'Åpen', '#0e7490', '#c2410c'],
            ].map(([t, s, status, c, dot], i) => (
              <div key={t} className={`flex items-center gap-2 px-2.5 py-[7px] ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] bg-[#F1E9FB]"><Sparkles className="h-[8px] w-[8px] text-[#7c3aed]" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8.5px] font-bold leading-tight text-[#0A0A0A]">{t}</p>
                  <p className="truncate text-[7px] text-[#a49e93]">{s}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1 rounded-full px-2 py-[2.5px] text-[7px] font-bold ring-1" style={{ color: c, borderColor: c, '--tw-ring-color': `${c}55` }}>
                  <Clock className="h-[7px] w-[7px]" /> {status}
                </span>
                <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: dot }} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-[13px] font-bold text-[#0A0A0A]" style={heading}>Portefølje</p>
            <span className="text-[9px] font-semibold text-[#8d877d]">Se alle</span>
          </div>
          <div className="mt-2 rounded-t-[10px] bg-white px-3 py-1 ring-1 ring-black/[0.05]">
            {[
              ['Aktive eiendommer', '59', '#1f7a45'],
              ['Aktive kontrakter', '41', '#2563eb'],
              ['Leverandører', '12', '#0e7490'],
              ['Leads', '2', '#c2410c'],
              ['Onboarding', '3', '#7c3aed'],
            ].map(([l, n, c], i) => (
              <div key={l} className={`flex items-center gap-2 py-[5.5px] ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: c }} />
                <span className="min-w-0 flex-1 truncate text-[8.5px] font-medium text-[#57534e]">{l}</span>
                <span className="shrink-0 text-[9px] font-bold text-[#0A0A0A] tabular-nums" style={heading}>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modul: Kalender — 1:1 fra AdminCalendar (multi-tidslinje) ── */
const KCOL = 58;
const KSIDE = 148;
const KROW = 52;
const KUKEDAG = ['Ti', 'On', 'To', 'Fr', 'Lø', 'Sø', 'Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø', 'Ma'];
const KDATO = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
const K_IDAG = 0;
const kHelg = (i) => KUKEDAG[i] === 'Lø' || KUKEDAG[i] === 'Sø';
const kMandag = (i) => KUKEDAG[i] === 'Ma';

const KILDE = {
  A: { farge: '#FF5A5F', bokstav: 'A' },
  B: { farge: '#003580', bokstav: 'B' },
  D: { farge: '#7c3aed', bokstav: 'D' },
};

const KBAR_STIL = {
  booking: { backgroundColor: '#FF385C', color: '#ffffff' },
  lease: { backgroundColor: '#6366f1', color: '#ffffff' },
  block: {
    backgroundColor: '#484848', color: '#ffffff',
    backgroundImage: 'repeating-linear-gradient(135deg, transparent 0 5px, rgba(255,255,255,0.08) 5px 6px)',
  },
  maint: { backgroundColor: '#f7f3e8', color: '#6b4a1a' },
};

const KENHETER = [
  { navn: 'Marken 8 · Leilighet 2', omraade: 'Bergenhus', modell: 'KT', pris: '1 850', barer: [
    { type: 'booking', fra: 0, len: 3, tittel: 'Emma Berger', kilde: 'A', netter: 3 },
    { type: 'booking', fra: 4, len: 4, tittel: 'Jonas Müller', kilde: 'B', netter: 4 },
    { type: 'booking', fra: 9, len: 3, tittel: 'Nina Holm', kilde: 'A', netter: 3 },
    { type: 'booking', fra: 13, len: 2, tittel: 'Lea Voss', kilde: 'D', netter: 2 },
  ] },
  { navn: 'Nygård 12 · H0301', omraade: 'Årstad', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 14, tittel: 'Sofie Hansen', pris: '18 500 kr/m' },
  ] },
  { navn: 'Skuteviken 5 · Sjøbod', omraade: 'Bergenhus', modell: 'KT', pris: '2 400', barer: [
    { type: 'booking', fra: 1, len: 3, tittel: 'Liam Carter', kilde: 'A', netter: 3 },
    { type: 'maint', fra: 5, len: 2, tittel: 'Rørlegger · bad' },
    { type: 'booking', fra: 8, len: 3, tittel: 'Nora Vik', kilde: 'B', netter: 3 },
    { type: 'booking', fra: 12, len: 2, tittel: 'Tom Berg', kilde: 'A', netter: 2 },
  ] },
  { navn: 'Kong Oscars gt. 21', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 14, tittel: 'Martin Solheim', pris: '16 900 kr/m' },
  ] },
  { navn: 'Møhlenpris 3 · Studio', omraade: 'Årstad', modell: 'KT', pris: '1 450', barer: [
    { type: 'booking', fra: 2, len: 3, tittel: 'Yuki Tanaka', kilde: 'B', netter: 3 },
    { type: 'block', fra: 6, len: 3, tittel: 'Eier · privat bruk' },
    { type: 'booking', fra: 10, len: 3, tittel: 'Ida Strøm', kilde: 'A', netter: 3 },
  ] },
  { navn: 'Sandviken 44 · H0102', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 14, tittel: 'Anna Ruud', pris: '21 000 kr/m' },
  ] },
  { navn: 'Løvstakkveien 7', omraade: 'Årstad', modell: 'KT', pris: '1 650', barer: [
    { type: 'booking', fra: 0, len: 3, tittel: 'Piotr Nowak', kilde: 'A', netter: 3 },
    { type: 'booking', fra: 5, len: 4, tittel: 'Sara Lie', kilde: 'A', netter: 4 },
    { type: 'booking', fra: 10, len: 4, tittel: 'María García', kilde: 'B', netter: 4 },
  ] },
  { navn: 'Strandgaten 19 · Loft', omraade: 'Bergenhus', modell: 'KT', pris: '2 100', barer: [
    { type: 'booking', fra: 3, len: 5, tittel: 'Ben Fischer', kilde: 'B', netter: 5 },
    { type: 'booking', fra: 9, len: 4, tittel: 'Oda Lien', kilde: 'A', netter: 4 },
  ] },
  { navn: 'Fjellsiden 2 · H0401', omraade: 'Bergenhus', modell: 'LT', barer: [
    { type: 'lease', fra: 0, len: 14, tittel: 'Kristoffer Aase', pris: '19 800 kr/m' },
  ] },
];

function FlateKalender() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-white">
      {/* Header — segmentkontroll · enhetsvelger · nav · søk · filter, som i appen */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[#f2f2f2] bg-white px-4" style={{ height: 44 }}>
        <div className="flex shrink-0 items-center rounded-full border border-[#ebebeb] bg-[#fafafa] p-0.5">
          <span className="flex h-[22px] items-center rounded-full bg-white px-2.5 text-[9.5px] font-semibold text-[#222222] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">Kalender</span>
          <span className="flex h-[22px] items-center rounded-full px-2.5 text-[9.5px] font-semibold text-[#717171]">Perioder</span>
        </div>
        <span className="flex h-[26px] shrink-0 items-center gap-1.5 rounded-full border border-[#ebebeb] bg-white pl-1 pr-2">
          <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)' }}>
            <LayoutGrid className="h-[8px] w-[8px] text-white" />
          </span>
          <span className="text-[9.5px] font-semibold text-[#222222]">Alle boliger</span>
          <ChevronDown className="h-[8px] w-[8px] text-[#717171]" strokeWidth={2.4} />
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <ChevronLeft className="h-[10px] w-[10px] text-[#717171]" strokeWidth={2.2} />
          <span className="flex h-[22px] items-center rounded-full border border-[#ebebeb] bg-white px-2.5 text-[9px] font-semibold text-[#222222]">I dag</span>
          <ChevronRight className="h-[10px] w-[10px] text-[#717171]" strokeWidth={2.2} />
        </div>
        <div className="flex-1" />
        <Search className="h-[10px] w-[10px] shrink-0 text-[#717171]" strokeWidth={2.2} />
        <span className="flex shrink-0 items-center gap-1 text-[9px] font-semibold text-[#717171]"><Filter className="h-[10px] w-[10px]" strokeWidth={2.2} /> Filter</span>
      </div>

      {/* Grid-header — månedslabel + dagstripe */}
      <div className="flex shrink-0">
        <div className="flex shrink-0 items-center border-b border-r border-[#f2f2f2] bg-white" style={{ width: KSIDE, height: 42 }}>
          <div className="px-3.5">
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-[12.5px] font-bold capitalize leading-none tracking-[-0.02em] text-[#222222]" style={heading}>september</h2>
              <span className="text-[8.5px] font-semibold tabular-nums text-[#9b9b9b]">2026</span>
            </div>
            <div className="mt-[3px] flex items-center gap-1">
              <span className="h-[4px] w-[4px] rounded-full bg-[#10b981]" />
              <p className="text-[7.5px] font-medium tabular-nums text-[#9b9b9b]">84 enheter</p>
            </div>
          </div>
        </div>
        <div className="relative min-w-0 flex-1 overflow-hidden border-b border-[#f2f2f2] bg-white" style={{ height: 42 }}>
          <div className="absolute bottom-0 left-0 flex" style={{ height: 30 }}>
            {KDATO.map((dato, i) => (
              <div key={i} className="flex shrink-0 flex-col items-center justify-center" style={{ width: KCOL, boxShadow: kMandag(i) ? 'inset 1px 0 0 #f2f2f2' : undefined }}>
                {i === K_IDAG ? (
                  <span className="flex items-baseline gap-1 rounded-full px-1.5 py-[3px]" style={{ backgroundColor: '#7c3aed', boxShadow: '0 1px 3px rgba(124,58,237,0.22)' }}>
                    <span className="text-[7.5px] font-semibold leading-none text-white">{KUKEDAG[i]}</span>
                    <span className="text-[10px] font-bold leading-none tabular-nums text-white">{dato}</span>
                  </span>
                ) : (
                  <>
                    <span className="text-[7.5px] font-medium leading-none text-[#9b9b9b]">{KUKEDAG[i]}</span>
                    <span className="mt-[2px] text-[10.5px] font-semibold leading-tight tabular-nums" style={{ color: kHelg(i) ? '#717171' : '#222222' }}>{dato}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Radene — enheter + dagsceller + event-pills */}
      <div className="relative flex-1 overflow-hidden">
        {KENHETER.map((u) => (
          <div key={u.navn} className="flex" style={{ height: KROW, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="flex shrink-0 items-center gap-1.5 border-r border-black/[0.05] bg-white pl-1.5 pr-2" style={{ width: KSIDE }}>
              <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[5px] text-[8.5px] font-bold text-[#717171]" style={{ background: 'linear-gradient(135deg, #f5f4f7, #ecebef)', boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }}>
                {u.navn.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[8.5px] font-semibold leading-[1.3] text-[#222222]">{u.navn}</p>
                <div className="mt-[1px] flex items-center gap-1">
                  <p className="truncate text-[7.5px] leading-tight text-[#717171]">{u.omraade}</p>
                  <span className="flex h-[10px] shrink-0 items-center rounded-[2px] px-[3px] text-[6px] font-bold leading-none tracking-[0.03em] text-white" style={{ backgroundColor: u.modell === 'KT' ? '#FF385C' : '#3B82F6' }}>{u.modell}</span>
                </div>
              </div>
            </div>
            <div className="relative min-w-0 flex-1 overflow-hidden">
              <div className="absolute inset-0 flex">
                {KDATO.map((_, i) => (
                  <div key={i} className="relative shrink-0" style={{ width: KCOL, backgroundColor: i < K_IDAG ? '#fafafa' : kHelg(i) ? '#faf7f5' : 'transparent', boxShadow: kMandag(i) ? 'inset 1px 0 0 #f2f2f2' : undefined }}>
                    {u.pris && (
                      <div className="absolute bottom-[3px] left-0 right-0 flex justify-center opacity-[0.55]">
                        <span className="text-[6.5px] font-medium leading-none tabular-nums text-[#9b9b9b]">{u.pris}<span className="ml-[1px] text-[6px]">kr</span></span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {u.barer.map((b, bi) => {
                const bred = b.len >= 3;
                const rund = (b.type === 'booking' || b.type === 'lease') ? 999 : 5;
                const kilde = b.kilde ? KILDE[b.kilde] : null;
                return (
                  <div key={bi} className="absolute" style={{ left: b.fra * KCOL + 2, width: b.len * KCOL - 4, top: 11, height: 30, borderRadius: rund, zIndex: 2, ...KBAR_STIL[b.type] }}>
                    {(b.type === 'block' || b.type === 'maint') ? (
                      <div className="flex h-full w-full items-center gap-1 overflow-hidden px-2" style={{ borderRadius: 'inherit' }}>
                        {b.type === 'maint' ? <Wrench className="h-[8px] w-[8px] shrink-0 opacity-90" strokeWidth={2.2} /> : <Lock className="h-[8px] w-[8px] shrink-0 opacity-90" strokeWidth={2.2} />}
                        <span className="truncate text-[7.5px] font-semibold">{b.tittel}</span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full min-w-0 items-center gap-1.5 overflow-hidden px-1.5" style={{ borderRadius: 'inherit' }}>
                        {kilde ? (
                          <span className="flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full text-[6.5px] font-bold leading-none text-white" style={{ backgroundColor: kilde.farge, boxShadow: '0 0 0 1px rgba(255,255,255,0.9)' }}>{kilde.bokstav}</span>
                        ) : (
                          <span className="h-[4px] w-[4px] shrink-0 rounded-full bg-current opacity-70" />
                        )}
                        <span className="flex-1 truncate text-[8px] font-semibold leading-none">{b.tittel}</span>
                        {bred && b.netter !== undefined ? (
                          <span className="flex shrink-0 items-center gap-[2px] text-[7px] font-semibold tabular-nums opacity-80"><span aria-hidden="true" className="opacity-70">◐</span>{b.netter}</span>
                        ) : null}
                        {bred && b.pris ? (
                          <span className="shrink-0 text-[7px] font-semibold tabular-nums opacity-80">{b.pris}</span>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {/* «I dag»-kolonnen — tynn lilla ring gjennom rutenettet */}
        <div className="pointer-events-none absolute bottom-0 top-0" style={{ left: KSIDE + K_IDAG * KCOL, width: KCOL, zIndex: 1, boxShadow: 'inset 1px 0 0 rgba(124,58,237,0.18), inset -1px 0 0 rgba(124,58,237,0.18)' }} />
      </div>
    </div>
  );
}

/* ── Modul: Enheter — 1:1 fra AdminUnitDetail/StedetTab ── */
const ENHET_FANER = [
  ['Stedet', Home, true],
  ['Utleie', KeyRound, false],
  ['Saker', Wrench, false],
  ['Meldinger', MessageSquare, false],
  ['Kalender', CalendarDays, false],
  ['Økonomi', Wallet, false],
  ['Dokumenter', FileText, false],
];

function FlateEnheter() {
  return (
    <div className="flex h-full w-full overflow-hidden bg-[#fdfcfb]">
      {/* Kontekstuell venstre-rail (UnitContextSidebar) */}
      <aside className="flex w-[128px] shrink-0 flex-col border-r border-[#ece8e1]/60 bg-[#fdfcfb]">
        <div className="px-3 pb-2.5 pt-4">
          <div className="flex items-center gap-1 text-[8px] font-medium text-[#8d867b]">
            <ArrowLeft className="h-[9px] w-[9px]" strokeWidth={1.8} /> Marken 8
          </div>
          <p className="mt-3 text-[6.5px] font-bold uppercase tracking-[0.16em] text-[#6e6357]">Enhet</p>
          <h2 className="mt-[2px] text-[10.5px] font-bold leading-tight tracking-tight text-[#1a1a1a]" style={heading}>Leilighet 2</h2>
          <p className="mt-[1px] text-[7.5px] text-[#8d867b]">Marken 8, 5017 Bergen</p>
        </div>
        <nav className="flex flex-col gap-[2px] px-2">
          {ENHET_FANER.map(([navn, Ikon, aktiv]) => (
            <span key={navn} className="flex items-center gap-1.5 rounded-[8px] px-2 py-[5px] text-[8.5px] font-semibold" style={aktiv ? { backgroundColor: '#1a1a1a', color: '#ffffff', boxShadow: '0 3px 10px rgba(17,17,17,0.18)' } : { color: '#6e6357' }}>
              <Ikon className="h-[9.5px] w-[9.5px]" strokeWidth={1.7} style={{ color: aktiv ? '#ffffff' : '#a8a092' }} />
              {navn}
            </span>
          ))}
        </nav>
        <div className="mt-auto px-3 pb-3">
          <p className="mb-1 text-[6.5px] font-bold uppercase tracking-[0.14em] text-[#a8a092]">Andre enheter</p>
          {['Leilighet 1', 'Leilighet 3'].map((navn) => (
            <p key={navn} className="flex items-center gap-1 py-[2px] text-[8px] font-medium text-[#6e6357]"><span className="text-[8.5px] text-[#c4baa8]">↳</span> {navn}</p>
          ))}
        </div>
      </aside>

      {/* Hovedinnhold (StedetTab) */}
      <div className="min-w-0 flex-1 overflow-hidden px-4 pt-3.5 sm:px-5">
        <div className="flex items-center justify-between">
          <p className="text-[8.5px] text-[#8d867b]">
            Eiendommer <span className="mx-1 text-[#c4baa8]">›</span> Marken 8 <span className="mx-1 text-[#c4baa8]">›</span>
            <span className="font-semibold text-[#1a1a1a]">Leilighet 2</span>
          </p>
          <span className="flex items-center gap-1 rounded-full border border-[#e6d9f7] bg-[#f5f0fc] px-2 py-[3.5px] text-[7.5px] font-semibold text-[#6d28d9]">
            <span className="h-[4px] w-[4px] rounded-full bg-[#7c3aed]" /> Live · FINN + 2 kanaler
          </span>
        </div>

        {/* Foto-mosaikk — 1 stor + 2×2, som appen */}
        <div className="relative mt-2.5 grid h-[150px] grid-cols-4 grid-rows-2 gap-1 overflow-hidden rounded-[12px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/interior-openplan-hero.webp" alt="" loading="lazy" className="col-span-2 row-span-2 h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/interior-living.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/deck-img-2.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/deck-img-3.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/deck-img-4.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute bottom-1.5 right-1.5 flex items-center gap-1 rounded-[6px] bg-white px-2 py-[4px] text-[7.5px] font-semibold text-[#1a1a1a] shadow-[0_3px_10px_rgba(17,17,17,0.14)]">
            <Camera className="h-[8.5px] w-[8.5px]" strokeWidth={1.8} /> Vis alle 14 bilder
          </span>
        </div>

        {/* Tittel + innhold */}
        <div className="mt-3 grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-4">
          <div>
            <h1 className="text-[16px] font-bold leading-[1.1] tracking-[-0.02em] text-[#1a1a1a]" style={heading}>Leilighet 2 · 2. etasje</h1>
            <p className="mt-[3px] text-[8.5px] text-[#6e6357]">Leilighet · 64 m² · 2 soverom · 3 senger · 1 bad</p>
            <div className="mt-3 border-t border-[#f1ede7] pt-2.5">
              <h3 className="text-[10.5px] font-bold tracking-tight text-[#1a1a1a]" style={heading}>Om boligen</h3>
              <p className="mt-1 text-[8px] leading-[1.65] text-[#4a453d]">
                Lys og gjennomgående toroms midt i Marken — Bergens mest sjarmerende smau.
                Originale tregulv, høye vinduer og nyoppusset kjøkken. Driftes på korttid
                med automatisk kanalsynk, prising og gjestekommunikasjon.
              </p>
            </div>
            <div className="mt-3 border-t border-[#f1ede7] pt-2.5">
              <h3 className="text-[10.5px] font-bold tracking-tight text-[#1a1a1a]" style={heading}>Hvor du sover</h3>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                {[['Soverom 1', '1 dobbeltseng'], ['Soverom 2', '2 enkeltsenger']].map(([navn, seng]) => (
                  <div key={navn} className="rounded-[9px] border border-[#ebebeb] bg-white p-2">
                    <BedDouble className="h-[11px] w-[11px] text-[#1a1a1a]" strokeWidth={1.6} />
                    <p className="mt-1 text-[8.5px] font-semibold text-[#1a1a1a]">{navn}</p>
                    <p className="text-[7.5px] text-[#8a8276]">{seng}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Høyre rail — Personer */}
          <div>
            <p className="text-[6.5px] font-bold uppercase tracking-[0.16em] text-[#a8a092]">Personer</p>
            <div className="mt-1.5 rounded-[12px] border border-[#e8e4dd] bg-white p-2.5 shadow-[0_3px_12px_rgba(17,17,17,0.035)]">
              <div className="flex items-start gap-2">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full text-[8.5px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #b8a88f, #96866d)' }}>KN</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[6.5px] font-bold uppercase tracking-[0.14em] text-[#a8a092]">Eier</p>
                  <p className="text-[9.5px] font-bold leading-[1.15] tracking-tight text-[#1a1a1a]" style={heading}>Kari Nordvik</p>
                  <div className="mt-[2px] flex items-center gap-1">
                    <span className="h-[4px] w-[4px] rounded-full bg-[#18794E]" style={{ boxShadow: '0 0 0 1.5px rgba(24,121,78,0.15)' }} />
                    <span className="text-[7px] font-medium text-[#3d6b54]">Aktiv forvaltningsavtale</span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-col gap-[3px] border-t border-[#f1ede7] pt-1.5">
                <p className="flex items-center gap-1.5 text-[7.5px] text-[#4a453d]"><Mail className="h-[8.5px] w-[8.5px] shrink-0 text-[#c0b7a6]" strokeWidth={1.6} /> kari@nordvikeiendom.no</p>
                <p className="flex items-center gap-1.5 text-[7.5px] tabular-nums text-[#4a453d]"><Phone className="h-[8.5px] w-[8.5px] shrink-0 text-[#c0b7a6]" strokeWidth={1.6} /> +47 934 12 880</p>
              </div>
            </div>
            <div className="mt-1.5 rounded-[12px] border border-[#e8e4dd] bg-white p-2.5 shadow-[0_3px_12px_rgba(17,17,17,0.035)]">
              <div className="flex items-start gap-2">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[#f5f0fc] text-[8.5px] font-bold text-[#6d28d9]">NH</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[6.5px] font-bold uppercase tracking-[0.14em] text-[#a8a092]">Neste gjest</p>
                  <p className="text-[9.5px] font-bold leading-[1.15] tracking-tight text-[#1a1a1a]" style={heading}>Nina Holm</p>
                  <p className="mt-[1px] text-[7.5px] text-[#8a8276]">10.–12. sep · 2 netter · Airbnb</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Modul: Økonomi — 1:1 fra Eieroppgjør/OwnerFinance ── */
function OppgjorPill({ type }) {
  return type === 'utbetalt' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfdf5] px-1.5 py-[2.5px] text-[6.5px] font-bold text-[#15803d]">
      <CircleCheck className="h-[7px] w-[7px]" strokeWidth={2.4} /> Utbetalt
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#ecfeff] px-1.5 py-[2.5px] text-[6.5px] font-bold text-[#0891b2]">
      <Send className="h-[7px] w-[7px]" strokeWidth={2.4} /> Sendt
    </span>
  );
}

function FlateOkonomi() {
  const rader = [
    ['November 2026', '18 500', '925', '17 575', 'sendt'],
    ['Oktober 2026', '18 500', '925', '17 575', 'utbetalt'],
    ['September 2026', '18 500', '925', '17 575', 'utbetalt'],
    ['August 2026', '18 500', '925', '17 575', 'utbetalt'],
    ['Juli 2026', '18 500', '925', '17 575', 'utbetalt'],
  ];
  return (
    <div className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
      {/* Mini-hero — som i portalen */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-[#7c7466]">Økonomi · Kari Nordvik · Marken 8</p>
          <p className="mt-1 text-[19px] font-bold leading-none tracking-[-0.02em] text-[#1a1a1a]" style={heading}>Eieroppgjør</p>
        </div>
        <span className="flex items-center gap-1 rounded-full bg-[#141216] px-3.5 py-[8px] text-[10px] font-bold text-white">Eksporter <ArrowUpRight className="h-[10px] w-[10px]" /></span>
      </div>

      {/* KPI-stripen — portalens kort */}
      <div className="mt-3.5 grid grid-cols-3 gap-2.5">
        <div className="rounded-[13px] bg-[#1a1a1a] p-3">
          <div className="mb-2 flex items-center justify-between gap-1">
            <span className="truncate text-[7px] font-bold uppercase tracking-[0.08em] text-white/50">Netto i år</span>
            <Wallet className="h-[11px] w-[11px] shrink-0 text-[#16a34a]" />
          </div>
          <p className="text-[15px] font-bold tabular-nums tracking-tight text-white" style={heading}>70 300 <span className="text-[8px] font-normal text-white/50">kr</span></p>
        </div>
        <div className="rounded-[13px] border border-[#ebe6df] bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-1">
            <span className="truncate text-[7px] font-bold uppercase tracking-[0.08em] text-[#6e6357]">Siste utbetaling</span>
            <DollarSign className="h-[11px] w-[11px] shrink-0 text-[#cf97fc]" />
          </div>
          <p className="text-[15px] font-bold tabular-nums tracking-tight text-[#1a1a1a]" style={heading}>17 575 <span className="text-[8px] font-normal text-[#7c7466]">kr</span></p>
        </div>
        <div className="rounded-[13px] border border-[#ebe6df] bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-1">
            <span className="truncate text-[7px] font-bold uppercase tracking-[0.08em] text-[#6e6357]">Antall oppgjør</span>
            <FileText className="h-[11px] w-[11px] shrink-0 text-[#0891b2]" />
          </div>
          <p className="text-[15px] font-bold tabular-nums tracking-tight text-[#1a1a1a]" style={heading}>4</p>
        </div>
      </div>

      {/* Oppgjørstabellen — portalens design */}
      <div className="mt-2.5 overflow-hidden rounded-[13px] border border-[#ebe6df] bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_58px_52px_74px_14px] items-center gap-2 border-b border-[#f0ebe4] bg-[#fafaf7] px-3 py-[7px]">
          <span className="text-[6.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Periode</span>
          <span className="text-right text-[6.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Brutto</span>
          <span className="text-right text-[6.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Honorar</span>
          <span className="text-right text-[6.5px] font-bold uppercase tracking-[0.1em] text-[#6e6357]">Netto til deg</span>
          <span />
        </div>
        {rader.map(([periode, brutto, honorar, netto, status], i) => (
          <div key={periode} className={`grid grid-cols-[minmax(0,1fr)_58px_52px_74px_14px] items-center gap-2 px-3 py-[7px] ${i > 0 ? 'border-t border-[#f4efe7]' : ''}`}>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] border border-[#ebe6df] bg-[#faf8f5]">
                <Calendar className="h-[10px] w-[10px] text-[#6b6050]" strokeWidth={1.6} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[8.5px] font-bold tracking-[-0.005em] text-[#1a1a1a]" style={heading}>{periode}</p>
                <div className="mt-[2px]"><OppgjorPill type={status} /></div>
              </div>
            </div>
            <p className="text-right text-[8px] font-semibold tabular-nums text-[#1a1a1a]">{brutto} kr</p>
            <p className="text-right text-[8px] font-semibold tabular-nums text-[#cf97fc]">{honorar} kr</p>
            <p className="text-right text-[9px] font-bold tabular-nums text-[#1a1a1a]" style={heading}>{netto} kr</p>
            <ChevronRight className="h-[10px] w-[10px] justify-self-end text-[#7c7466]" />
          </div>
        ))}
      </div>

      {/* Sluttlinjen — hele poenget */}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[8.5px] font-medium text-[#1a1a1a]">
        <span className="h-[5px] w-[5px] rounded-full bg-[#22c55e]" />
        Innkreving, purring og utbetaling — helt automatisk
      </p>
    </div>
  );
}

/* ── Selve vinduet ── */
export default function VinduRamme() {
  const [apen, setApen] = useState(false);
  const [idx, setIdx] = useState(0);
  const pausedRef = useRef(false);

  useEffect(() => {
    let redusert = false;
    try { redusert = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ok */ }
    if (redusert) { setApen(true); return undefined; }
    const t1 = setTimeout(() => setApen(true), 2400);
    const iv = setInterval(() => {
      if (pausedRef.current) return;
      setIdx((v) => (v + 1) % MODULER.length);
    }, 5200);
    return () => { clearTimeout(t1); clearInterval(iv); };
  }, []);

  const modul = MODULER[idx];

  return (
    <div
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
    >
      <div className="overflow-hidden rounded-[18px] bg-[#FAFAF8] shadow-[0_56px_120px_-44px_rgba(84,50,160,0.3),0_20px_48px_-28px_rgba(23,18,12,0.14),0_0_0_1px_rgba(0,0,0,0.05)] sm:rounded-[24px]" aria-hidden="true">
        <div className="flex items-stretch">

          {/* Mørk sidemeny — flat liste som i appen, glir fra kollapset til åpen */}
          <div
            className="hidden shrink-0 flex-col overflow-hidden bg-[#0C0C0E] px-[10px] py-3.5 md:flex"
            style={{ width: apen ? 172 : 58, transition: `width 800ms ${EASE}` }}
          >
            <div className="relative flex h-[24px] items-center">
              <span className="flex w-[38px] shrink-0 justify-center" style={{ opacity: apen ? 0 : 1, transition: `opacity 350ms ${EASE}` }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/digihome-mark.svg" alt="" className="h-[22px] w-[22px] rounded-[6px]" />
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digihome-logo-white.svg" alt="" className="absolute left-[8px] h-[16px] w-auto" style={{ opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateX(-6px)', transition: `opacity 480ms ${EASE} 160ms, transform 480ms ${EASE} 160ms` }} />
              <span className="ml-auto" style={{ opacity: apen ? 1 : 0, transition: `opacity 480ms ${EASE} 240ms` }}>
                <PanelLeftClose className="mr-1 h-[11px] w-[11px] text-white/35" strokeWidth={1.5} />
              </span>
            </div>
            <div className="mt-3 space-y-[2px]">
              {NAV.map(([Ikon, l, nokkel], i) => {
                const aktiv = nokkel === modul;
                return (
                  <div key={l} className={`flex h-[25px] w-full items-center rounded-[7px] transition-colors duration-500 ${aktiv ? 'bg-white/[0.1] text-white' : 'text-white/45'}`}>
                    <span className="flex w-[38px] shrink-0 justify-center"><Ikon className="h-[11px] w-[11px]" strokeWidth={aktiv ? 2.1 : 1.7} /></span>
                    <Lbl apen={apen} delay={160 + i * 22} className="text-[9px] font-semibold">{l}</Lbl>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto space-y-[2px] border-t border-white/[0.07] pt-2">
              {BUNN.map(([Ikon, l], i) => (
                <div key={l} className="flex h-[24px] w-full items-center rounded-[7px] text-white/40">
                  <span className="flex w-[38px] shrink-0 justify-center"><Ikon className="h-[10.5px] w-[10.5px]" strokeWidth={1.7} /></span>
                  <Lbl apen={apen} delay={440 + i * 24} className="text-[9px] font-semibold">{l}</Lbl>
                </div>
              ))}
              <div className="flex items-center pt-1.5">
                <span className="flex w-[38px] shrink-0 justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://randomuser.me/api/portraits/men/85.jpg" alt="" loading="lazy" className="h-[21px] w-[21px] rounded-full object-cover" />
                </span>
                <Lbl apen={apen} delay={500} className="min-w-0 flex-1">
                  <span className="block truncate text-[8.5px] font-bold leading-tight text-white/85">Martin Kviteberg</span>
                  <span className="block truncate text-[7.5px] text-white/40">martin@digihome.no</span>
                </Lbl>
                <Lbl apen={apen} delay={540}><ChevronDown className="mr-1 h-[9px] w-[9px] text-white/35" /></Lbl>
              </div>
            </div>
          </div>

          {/* Innhold — moduler crossfader */}
          <div className="relative min-w-0 flex-1">
            <Lag aktiv={modul === 'oversikt'} iFlyt><FlateOversikt /></Lag>
            <Lag aktiv={modul === 'kalender'}><FlateKalender /></Lag>
            <Lag aktiv={modul === 'enheter'}><FlateEnheter /></Lag>
            <Lag aktiv={modul === 'okonomi'}><FlateOkonomi /></Lag>
          </div>
        </div>
      </div>

      {/* Diskret modulindikator */}
      <div className="mt-4 flex items-center justify-center gap-[6px]" aria-hidden="true">
        {MODULER.map((m, i) => (
          <span
            key={m}
            className="h-[5px] rounded-full"
            style={{
              width: i === idx ? 18 : 5,
              background: i === idx ? '#1a1a1a' : 'rgba(10,10,10,0.14)',
              transition: `width 500ms ${EASE}, background 500ms ${EASE}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
