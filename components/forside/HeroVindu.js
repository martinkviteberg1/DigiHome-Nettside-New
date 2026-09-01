'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutGrid, Home, Users, MessageSquare, FileText, Bell, ClipboardList, Building2,
  CalendarDays, Clock, Inbox, Sparkles, Megaphone, FolderOpen, Search, ChevronRight,
  ArrowUpRight, Wallet, Plus,
} from 'lucide-react';

/* ---------------------------------------------------------------------------
   Hero-vinduet — levende produktvindu med rolig koreografi:
   0s   Oversikt (kollapset sidebar)
   2.4s Sidebaren glir ut — labels fader inn
   5.2s → Kalender → Enheter → Økonomi → Oversikt (loop, 5.2s per modul)
   Kun opacity/transform — ingen filter/layout per frame. Pause ved hover.
   prefers-reduced-motion → statisk Oversikt m/ åpen sidebar.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };
const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const MODULER = ['oversikt', 'kalender', 'enheter', 'okonomi'];

const ARBEID = [
  [LayoutGrid, 'Oversikt', 'oversikt', null],
  [Clock, 'Operasjonssentral', null, null],
  [Inbox, 'Innboks', null, 13],
  [CalendarDays, 'Reservasjoner', null, null],
  [CalendarDays, 'Kalender', 'kalender', null],
  [MessageSquare, 'Kanaler', null, null],
  [ClipboardList, 'Oppgaver', null, null],
  [Sparkles, 'Driftsassistent', null, null],
];

const DRIFT = [
  [Building2, 'Eiendommer', 'enheter'],
  [Megaphone, 'Utleieprosesser', null],
  [FileText, 'Leieforhold', null],
  [FolderOpen, 'Dokumenter', null],
  [ClipboardList, 'Saker', null],
  [Wallet, 'Økonomi', 'okonomi'],
];

function Kurve({ farge = '#1f7a45', ned = false }) {
  return (
    <svg viewBox="0 0 60 20" className="h-[18px] w-[60px]" aria-hidden="true">
      <polyline points={ned ? '0,5 12,8 24,6 36,12 48,14 60,17' : '0,17 12,13 24,14 36,9 48,6 60,2'} fill="none" stroke={farge} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

/* Seksjonsoverskrift: hairline når kollapset ↔ tekst når åpen */
function SeksjonLbl({ apen, tekst }) {
  return (
    <div className="relative mb-1 mt-3 h-[13px] w-full">
      <span className="absolute left-[12px] top-1/2 h-px w-[24px] -translate-y-1/2 bg-white/[0.12]" style={{ opacity: apen ? 0 : 1, transition: `opacity 400ms ${EASE}` }} />
      <span className="absolute left-[10px] top-0 text-[7px] font-bold uppercase tracking-[0.14em] text-white/35" style={{ opacity: apen ? 1 : 0, transition: `opacity 480ms ${EASE} 180ms` }}>{tekst}</span>
    </div>
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

/* ── Modul: Oversikt ── */
function FlateOversikt() {
  return (
    <div className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9B5BD6] text-[14px] font-bold text-white ring-2 ring-white">M</span>
          <div>
            <p className="whitespace-nowrap text-[19px] font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]" style={heading}>God dag, Martin</p>
            <p className="mt-[2px] whitespace-nowrap text-[10px] text-[#a49e93]">Tirsdag 1. September 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-[7px] text-[10.5px] font-semibold text-[#0A0A0A] shadow-[0_1px_2px_rgba(23,18,12,0.06)] ring-1 ring-black/[0.06] sm:flex">
            Saker <span className="rounded-full bg-[#7c3aed] px-[6px] py-[1px] text-[8px] font-bold text-white">71</span>
          </span>
          <span className="hidden rounded-full bg-[#141216] px-3.5 py-[8px] text-[10.5px] font-semibold text-white sm:block">Eiendommer</span>
          <span className="relative flex h-[28px] w-[28px] items-center justify-center rounded-full bg-white ring-1 ring-black/[0.06]">
            <Bell className="h-[11px] w-[11px] text-[#0A0A0A]" />
            <span className="absolute -right-[2px] -top-[2px] flex h-[11px] w-[11px] items-center justify-center rounded-full bg-[#d13438] text-[7px] font-bold text-white">4</span>
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          ['2', '2 nye leads venter svar', '#2563eb', '#EAF0FD'],
          ['13', '13 uleste meldinger', '#7c3aed', '#F1E9FB'],
          ['71', '71 åpne saker', '#c2410c', '#FBEFE4'],
        ].map(([n, t, c, bg]) => (
          <div key={t} className="flex items-center gap-2.5 rounded-[11px] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] text-[10px] font-bold" style={{ color: c, background: bg }}>{n}</span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#3A3733]">{t}</span>
            <ChevronRight className="h-[11px] w-[11px] shrink-0 text-[#c8c3ba]" />
          </div>
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-4 divide-x divide-black/[0.05] rounded-[12px] bg-white shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
        {[
          ['Leieinntekt / mnd', '894 500', 'Potensiale: 1 393 800 kr/mnd', '+499 300 fra 27 ledige', '#1f7a45'],
          ['Honorar / mnd', '126 987,5', 'Potensiale: 169 682,5 kr/mnd', '+42 695 fra 15 ledige', '#7c3aed'],
          ['Netto til huseiere / mnd', '767 512,5', 'Potensiale: 1 224 117,5 kr/mnd', '+456 605 fra 27 ledige', '#1f7a45'],
        ].map(([l, v, pot, sub, farge]) => (
          <div key={l} className="p-3">
            <p className="truncate text-[9px] font-medium text-[#a49e93]">{l}</p>
            <p className="mt-1.5 text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}<span className="ml-[2px] text-[9px] font-semibold text-[#a49e93]">kr</span></p>
            <div className="mt-2"><Kurve farge={farge} /></div>
            <p className="mt-1.5 truncate text-[8px] font-semibold text-[#7c3aed]">{pot}</p>
            <p className="truncate text-[7.5px] text-[#a49e93]">{sub}</p>
          </div>
        ))}
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

      <div className="mt-2.5 grid grid-cols-4 gap-2.5">
        {[
          [Building2, '59', 'Eiendommer', null, null, 'LIVE', '#1f7a45', false],
          [Home, '84', 'Enheter', '41 utleid', '#1f7a45', null, '#1f7a45', false],
          [Users, '43', 'Leietakere', null, null, null, '#2563eb', false],
          [Clock, '71', 'Åpne saker', 'Trenger oppfølging', '#c2410c', null, '#d13438', true],
        ].map(([Ikon, v, l, sub, subFarge, live, kurveFarge, ned]) => (
          <div key={l} className="rounded-[12px] bg-white p-3 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
            <div className="flex items-center justify-between">
              <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px] bg-[#F4F1EB]"><Ikon className="h-[12px] w-[12px] text-[#57534e]" /></span>
              {live
                ? <span className="flex items-center gap-1 text-[8px] font-bold text-[#1f7a45]"><span className="h-[5px] w-[5px] animate-pulse rounded-full bg-[#1f7a45]" />LIVE</span>
                : <Kurve farge={kurveFarge} ned={ned} />}
            </div>
            <p className="mt-2.5 text-[19px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}</p>
            <p className="mt-[4px] truncate text-[9px] font-medium text-[#8d877d]">{l}</p>
            {sub ? <p className="truncate text-[8px] font-semibold" style={{ color: subFarge }}>{sub}</p> : <p className="text-[8px]">&nbsp;</p>}
          </div>
        ))}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 overflow-hidden rounded-[13px] bg-[#141216] px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[9px] bg-white/[0.09]"><Sparkles className="h-[12px] w-[12px] text-[#C9A6F0]" /></span>
          <div className="min-w-0">
            <p className="truncate text-[11.5px] font-bold text-white" style={heading}>Potensial for høyere belegg</p>
            <p className="truncate text-[9px] text-white/50">41 av 84 enheter utleid. 49% belegg.</p>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#7c3aed] px-3.5 py-[7px] text-[10px] font-bold text-white">Se detaljer <ArrowUpRight className="h-[10px] w-[10px]" /></span>
      </div>

      <div className="mt-3.5 grid h-[104px] grid-cols-2 gap-3 overflow-hidden">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-bold text-[#0A0A0A]" style={heading}>Aktive saker</p>
            <span className="text-[9px] font-semibold text-[#8d877d]">Se alle</span>
          </div>
          <div className="mt-2 rounded-t-[10px] bg-white ring-1 ring-black/[0.05]">
            {[
              ['Oppvaskmaskin stopper midt i program', 'Annet · 2d', 'Åpen', '#0e7490', '#ecfeff'],
              ['Varmtvannsbereder lekker', 'Annet · 3d', 'Pågår', '#9a6b1c', '#fef9ec'],
              ['Behov for hageklipp', 'Annet · 5d', 'Åpen', '#0e7490', '#ecfeff'],
            ].map(([t, s, status, c, bg], i) => (
              <div key={t} className={`flex items-center gap-2 px-2.5 py-[7px] ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] bg-[#F1E9FB]"><Sparkles className="h-[8px] w-[8px] text-[#7c3aed]" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8.5px] font-bold leading-tight text-[#0A0A0A]">{t}</p>
                  <p className="truncate text-[7px] text-[#a49e93]">{s}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-[2.5px] text-[7px] font-bold" style={{ color: c, background: bg }}>{status}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-[12px] font-bold text-[#0A0A0A]" style={heading}>Portefølje</p>
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

/* ── Modul: Kalender ── */
function FlateKalender() {
  const dager = [
    ['Man', '31', []],
    ['Tir', '1', [['Visning 17:00', 'Møllendalsveien 4A', '#7c3aed', '#F1E9FB']]],
    ['Ons', '2', [['Innflytting', 'Sandviksveien 18', '#1f7a45', '#E7F3EC']]],
    ['Tor', '3', [['Vaktmester 09:00', 'Olaf Ryes vei 11C', '#9a6b1c', '#fef9ec']]],
    ['Fre', '4', [['Visning 16:30', 'Kong Oscars gt 2B', '#7c3aed', '#F1E9FB']]],
    ['Lør', '5', []],
    ['Søn', '6', []],
  ];
  return (
    <div className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[19px] font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]" style={heading}>Kalender</p>
          <p className="mt-[2px] text-[10px] text-[#a49e93]">September 2026 · Uke 36</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center rounded-full bg-white p-[3px] ring-1 ring-black/[0.06]">
            <span className="rounded-full bg-[#141216] px-3 py-[5px] text-[9.5px] font-semibold text-white">Uke</span>
            <span className="px-3 py-[5px] text-[9.5px] font-semibold text-[#8d877d]">Måned</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#7c3aed] px-3.5 py-[8px] text-[10px] font-bold text-white"><Plus className="h-[10px] w-[10px]" strokeWidth={2.6} /> Ny hendelse</span>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
        <div className="grid grid-cols-7 divide-x divide-black/[0.04] border-b border-black/[0.05]">
          {dager.map(([d, n]) => (
            <div key={d} className="flex items-center justify-center gap-1.5 py-2">
              <span className="text-[8px] font-semibold uppercase tracking-[0.08em] text-[#a49e93]">{d}</span>
              <span className={`flex h-[16px] w-[16px] items-center justify-center rounded-full text-[8.5px] font-bold tabular-nums ${n === '1' ? 'bg-[#7c3aed] text-white' : 'text-[#0A0A0A]'}`}>{n}</span>
            </div>
          ))}
        </div>
        <div className="grid h-[148px] grid-cols-7 divide-x divide-black/[0.04]">
          {dager.map(([d, n, hendelser]) => (
            <div key={d} className="space-y-1 p-1">
              {hendelser.map(([t, sted, c, bg]) => (
                <div key={t} className="rounded-[6px] border-l-2 px-1.5 py-1" style={{ background: bg, borderColor: c }}>
                  <p className="truncate text-[6.5px] font-bold leading-tight" style={{ color: c }}>{t}</p>
                  <p className="truncate text-[6px] text-[#78716c]">{sted}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3.5 text-[12px] font-bold text-[#0A0A0A]" style={heading}>I dag</p>
      <div className="mt-2 space-y-2">
        {[
          ['17:00', 'Visning · Møllendalsveien 4A', '3 påmeldte · automatisk oppfølging', '#7c3aed'],
          ['09:00', 'Overtakelse · Nygårdsgaten 30', 'Protokoll klar til signering', '#1f7a45'],
          ['13:30', 'Befaring · Kong Oscars gt 2B', 'Klargjøring før utleie', '#9a6b1c'],
          ['15:00', 'Nøkkelutlevering · Sandviksveien 18', 'Ingrid Moe · bekreftet', '#2563eb'],
          ['19:00', 'Visningsoppfølging · sendes automatisk', '5 interessenter får svarskjema', '#7c3aed'],
        ].map(([kl, t, s, c]) => (
          <div key={t} className="flex items-center gap-3 rounded-[11px] bg-white px-3 py-2 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
            <span className="shrink-0 rounded-[7px] px-2 py-[4px] text-[8.5px] font-bold tabular-nums" style={{ color: c, background: `${c}14` }}>{kl}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[9.5px] font-bold leading-tight text-[#0A0A0A]">{t}</p>
              <p className="truncate text-[8px] text-[#a49e93]">{s}</p>
            </div>
            <ChevronRight className="h-[11px] w-[11px] shrink-0 text-[#c8c3ba]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Modul: Enheter/Eiendommer ── */
function FlateEnheter() {
  const rader = [
    ['/interior-openplan-hero.webp', 'Olaf Ryes vei 11C', '2-roms · 49 m²', 'Sofie Larsen', '18 500', 'Utleid', '#1f7a45', '#E7F3EC'],
    ['/interior-living.webp', 'Møllendalsveien 4A', '3-roms · 72 m²', 'Jonas Berg', '24 900', 'Utleid', '#1f7a45', '#E7F3EC'],
    ['/deck-img-2.webp', 'Kong Oscars gate 2B', '1-roms · 38 m²', '—', '14 200', 'Ledig', '#9a6b1c', '#fef9ec'],
    ['/deck-img-3.webp', 'Sandviksveien 18', '2-roms · 55 m²', 'Ingrid Moe', '19 800', 'Utleid', '#1f7a45', '#E7F3EC'],
    ['/deck-img-4.webp', 'Nygårdsgaten 30', '3-roms · 68 m²', '—', '23 500', 'Klargjøring', '#7c3aed', '#F1E9FB'],
    ['/deck-img-1.webp', 'Marken 7B', '2-roms · 51 m²', 'Emma Vik', '17 900', 'Utleid', '#1f7a45', '#E7F3EC'],
    ['/interior-living.webp', 'Strandgaten 12', '4-roms · 96 m²', 'Familien Haug', '31 000', 'Utleid', '#1f7a45', '#E7F3EC'],
    ['/deck-img-3.webp', 'Skostredet 5A', '1-roms · 34 m²', '—', '13 500', 'Ledig', '#9a6b1c', '#fef9ec'],
    ['/deck-img-2.webp', 'Vetrlidsallmenningen 3', '2-roms · 47 m²', 'Nora Fjell', '18 200', 'Utleid', '#1f7a45', '#E7F3EC'],
  ];
  return (
    <div className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[19px] font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]" style={heading}>Eiendommer</p>
          <p className="mt-[2px] text-[10px] text-[#a49e93]">84 enheter · 41 utleid · 48,8 % belegg</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 rounded-full bg-white px-3 py-[7px] ring-1 ring-black/[0.06]">
            <Search className="h-[10px] w-[10px] text-[#a49e93]" />
            <span className="text-[9.5px] text-[#a49e93]">Søk i porteføljen…</span>
          </span>
          <span className="flex items-center gap-1 rounded-full bg-[#7c3aed] px-3.5 py-[8px] text-[10px] font-bold text-white"><Plus className="h-[10px] w-[10px]" strokeWidth={2.6} /> Ny eiendom</span>
        </div>
      </div>

      <div className="mt-3.5 flex items-center gap-1.5">
        {[['Alle', '84', true], ['Utleid', '41', false], ['Ledig', '27', false], ['Klargjøring', '16', false]].map(([l, n, aktiv]) => (
          <span key={l} className={`flex items-center gap-1.5 rounded-full px-3 py-[6px] text-[9.5px] font-semibold ${aktiv ? 'bg-[#141216] text-white' : 'bg-white text-[#57534e] ring-1 ring-black/[0.06]'}`}>
            {l} <span className={aktiv ? 'text-white/60' : 'text-[#a49e93]'}>{n}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 overflow-hidden rounded-t-[12px] bg-white shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
        <div className="grid grid-cols-[2fr_1.1fr_1.2fr_0.9fr_0.8fr] gap-2 border-b border-black/[0.05] px-3 py-2">
          {['Eiendom', 'Type', 'Leietaker', 'Leie/mnd', 'Status'].map((h) => (
            <span key={h} className="text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#a49e93]">{h}</span>
          ))}
        </div>
        {rader.map(([img, adr, type, leietaker, leie, status, c, bg], i) => (
          <div key={adr} className={`grid grid-cols-[2fr_1.1fr_1.2fr_0.9fr_0.8fr] items-center gap-2 px-3 py-[7px] ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
            <div className="flex min-w-0 items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img} alt="" loading="lazy" className="h-[26px] w-[36px] shrink-0 rounded-[6px] object-cover" />
              <span className="truncate text-[9px] font-bold text-[#0A0A0A]">{adr}</span>
            </div>
            <span className="truncate text-[8.5px] text-[#78716c]">{type}</span>
            <span className="truncate text-[8.5px] font-medium text-[#3A3733]">{leietaker}</span>
            <span className="truncate text-[9px] font-bold text-[#0A0A0A] tabular-nums" style={heading}>{leie} <span className="text-[7px] font-semibold text-[#a49e93]">kr</span></span>
            <span className="justify-self-start rounded-full px-2 py-[2.5px] text-[7px] font-bold" style={{ color: c, background: bg }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Modul: Økonomi ── */
function FlateOkonomi() {
  return (
    <div className="px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[19px] font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]" style={heading}>Økonomi</p>
          <p className="mt-[2px] text-[10px] text-[#a49e93]">Februar 2026 · alle konti avstemt</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-[7px] text-[9.5px] font-semibold text-[#57534e] ring-1 ring-black/[0.06]">Februar 2026</span>
          <span className="flex items-center gap-1 rounded-full bg-[#141216] px-3.5 py-[8px] text-[10px] font-bold text-white">Eksporter <ArrowUpRight className="h-[10px] w-[10px]" /></span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {[
          ['Innbetalt husleie', '894 500', '99,2 % betalt til forfall', '#1f7a45'],
          ['Utestående', '12 400', '2 purringer sendt automatisk', '#9a6b1c'],
          ['Honorar', '126 987', 'Faktureres 1. mars', '#7c3aed'],
        ].map(([l, v, sub, farge]) => (
          <div key={l} className="rounded-[12px] bg-white p-3 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
            <p className="truncate text-[9px] font-medium text-[#a49e93]">{l}</p>
            <p className="mt-1.5 text-[17px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}<span className="ml-[2px] text-[9px] font-semibold text-[#a49e93]">kr</span></p>
            <p className="mt-1.5 truncate text-[8px] font-semibold" style={{ color: farge }}>{sub}</p>
          </div>
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-[1.25fr_1fr] gap-2.5">
        <div className="rounded-[12px] bg-white p-3.5 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
          <div className="flex items-center justify-between">
            <p className="text-[11.5px] font-bold text-[#0A0A0A]" style={heading}>Leieinntekt</p>
            <span className="rounded-full bg-[#F4F1EB] px-2 py-[3px] text-[8px] font-semibold text-[#78716c]">Siste 6 mnd</span>
          </div>
          <svg viewBox="0 0 300 96" className="mt-2 w-full" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="hv-graf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#7c3aed" stopOpacity="0.22" />
                <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,72 C28,66 46,70 70,58 C94,47 116,53 145,42 C172,33 196,38 222,26 C248,17 272,21 300,10 L300,96 L0,96 Z" fill="url(#hv-graf)" />
            <path d="M0,72 C28,66 46,70 70,58 C94,47 116,53 145,42 C172,33 196,38 222,26 C248,17 272,21 300,10" fill="none" stroke="#7c3aed" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="300" cy="10" r="3.4" fill="#7c3aed" stroke="#fff" strokeWidth="1.6" />
          </svg>
          <div className="mt-1.5 flex justify-between text-[8px] font-medium text-[#b3aca1]">
            {['sep', 'okt', 'nov', 'des', 'jan', 'feb'].map((m) => <span key={m}>{m}</span>)}
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-[10px] bg-[#E7F3EC] px-3 py-2">
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#1f7a45]"><ArrowUpRight className="h-[9px] w-[9px] text-white" /></span>
            <p className="min-w-0 flex-1 truncate text-[8.5px] font-semibold text-[#1f7a45]">894 500 kr avstemt automatisk mot kontoutskrift</p>
          </div>
        </div>
        <div>
          <div className="rounded-[12px] bg-[#141216] p-3">
            <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-[#C9A6F0]/85">Neste utbetaling</p>
            <p className="mt-1.5 text-[16px] font-bold leading-none text-white tabular-nums" style={heading}>767 512 <span className="text-[8px] font-medium text-white/40">kr</span></p>
            <p className="mt-1.5 text-[8px] text-white/55">Til 32 huseiere · 15. mars · automatisk</p>
          </div>
          <p className="mt-2.5 text-[11.5px] font-bold text-[#0A0A0A]" style={heading}>Siste transaksjoner</p>
          <div className="mt-1.5 overflow-hidden rounded-t-[10px] bg-white ring-1 ring-black/[0.05]">
            {[
              ['Husleie · Olaf Ryes vei 11C', '+18 500', '#1f7a45'],
              ['Husleie · Møllendalsveien 4A', '+24 900', '#1f7a45'],
              ['Honorar · februar', '−2 220', '#78716c'],
              ['Husleie · Sandviksveien 18', '+19 800', '#1f7a45'],
              ['Husleie · Marken 7B', '+17 900', '#1f7a45'],
            ].map(([t, b, c], i) => (
              <div key={t} className={`flex items-center gap-2 px-2.5 py-[6px] ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
                <span className="min-w-0 flex-1 truncate text-[8.5px] font-medium text-[#3A3733]">{t}</span>
                <span className="shrink-0 text-[9px] font-bold tabular-nums" style={{ color: c, ...heading }}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-t-[12px] bg-white shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
        <div className="grid grid-cols-[1.3fr_1.3fr_0.8fr_0.7fr] gap-2 border-b border-black/[0.05] px-3 py-2">
          {['Huseier', 'Eiendom', 'Beløp', 'Utbetales'].map((h) => (
            <span key={h} className="text-[7.5px] font-bold uppercase tracking-[0.1em] text-[#a49e93]">{h}</span>
          ))}
        </div>
        {[
          ['Anna Storm', 'Møllendalsveien 4A', '22 680', '15. mars'],
          ['Per Haugen', 'Sandviksveien 18', '18 020', '15. mars'],
          ['Kari Nes', 'Marken 7B', '16 290', '15. mars'],
        ].map(([navn, eiendom, belop, dato], i) => (
          <div key={navn} className={`grid grid-cols-[1.3fr_1.3fr_0.8fr_0.7fr] items-center gap-2 px-3 py-[7px] ${i > 0 ? 'border-t border-black/[0.04]' : ''}`}>
            <span className="truncate text-[9px] font-bold text-[#0A0A0A]">{navn}</span>
            <span className="truncate text-[8.5px] text-[#78716c]">{eiendom}</span>
            <span className="truncate text-[9px] font-bold text-[#0A0A0A] tabular-nums" style={heading}>{belop} <span className="text-[7px] font-semibold text-[#a49e93]">kr</span></span>
            <span className="truncate text-[8.5px] font-medium text-[#57534e]">{dato}</span>
          </div>
        ))}
      </div>
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
      <div className="overflow-hidden rounded-[18px] bg-[#FAFAF8] shadow-[0_70px_150px_-42px_rgba(84,50,160,0.4),0_24px_60px_-30px_rgba(23,18,12,0.18),0_0_0_1px_rgba(0,0,0,0.05)] sm:rounded-[24px]" aria-hidden="true">
        <div className="flex items-stretch">

          {/* Mørk sidemeny — glir fra kollapset til åpen */}
          <div
            className="hidden shrink-0 flex-col overflow-hidden bg-[#0C0C0E] px-[10px] py-4 md:flex"
            style={{ width: apen ? 172 : 58, transition: `width 800ms ${EASE}` }}
          >
            <div className="flex items-center">
              <span className="flex w-[38px] shrink-0 justify-center">
                <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[7px] bg-[#7c3aed] text-[12px] font-black italic text-white" style={heading}>H</span>
              </span>
              <Lbl apen={apen} delay={140} className="text-[12px] font-bold text-white">digihome</Lbl>
            </div>
            <div className="mt-3 flex h-[28px] w-full items-center rounded-[8px] bg-white/[0.07]">
              <span className="flex w-[38px] shrink-0 justify-center"><Search className="h-[11px] w-[11px] text-white/45" /></span>
              <Lbl apen={apen} delay={180} className="flex-1 text-[9px] text-white/40">Søk</Lbl>
              <Lbl apen={apen} delay={220} className="mr-2 rounded-[4px] bg-white/[0.1] px-[4px] py-[1px] text-[7px] font-semibold text-white/50">⌘K</Lbl>
            </div>
            <SeksjonLbl apen={apen} tekst="Arbeid" />
            <div className="space-y-[3px]">
              {ARBEID.map(([Ikon, l, nokkel, badge], i) => {
                const aktiv = nokkel === modul;
                return (
                  <div key={l} className={`flex h-[27px] w-full items-center rounded-[8px] transition-colors duration-500 ${aktiv ? 'bg-[#7c3aed]/[0.24] text-[#C9A6F0]' : 'text-white/50'}`}>
                    <span className="relative flex w-[38px] shrink-0 justify-center">
                      <Ikon className="h-[11.5px] w-[11.5px]" strokeWidth={aktiv ? 2.1 : 1.8} />
                      {badge ? <span className="absolute -right-[1px] -top-[4px] flex h-[10px] min-w-[10px] items-center justify-center rounded-full bg-[#7c3aed] px-[2.5px] text-[6px] font-bold text-white">{badge}</span> : null}
                    </span>
                    <Lbl apen={apen} delay={200 + i * 24} className="text-[9.5px] font-semibold">{l}</Lbl>
                  </div>
                );
              })}
            </div>
            <SeksjonLbl apen={apen} tekst="Drift" />
            <div className="space-y-[3px]">
              {DRIFT.map(([Ikon, l, nokkel], i) => {
                const aktiv = nokkel === modul;
                return (
                  <div key={l} className={`flex h-[27px] w-full items-center rounded-[8px] transition-colors duration-500 ${aktiv ? 'bg-[#7c3aed]/[0.24] text-[#C9A6F0]' : 'text-white/50'}`}>
                    <span className="flex w-[38px] shrink-0 justify-center"><Ikon className="h-[11.5px] w-[11.5px]" strokeWidth={aktiv ? 2.1 : 1.8} /></span>
                    <Lbl apen={apen} delay={300 + i * 24} className="text-[9.5px] font-semibold">{l}</Lbl>
                  </div>
                );
              })}
            </div>
            <div className="mt-auto flex items-center pt-3">
              <span className="flex w-[38px] shrink-0 justify-center">
                <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9B5BD6] text-[8.5px] font-bold text-white">M</span>
              </span>
              <Lbl apen={apen} delay={360}>
                <span className="block truncate text-[8.5px] font-bold leading-tight text-white/85">Martin Kviteberg</span>
                <span className="block truncate text-[7.5px] text-white/40">martin@digihome.no</span>
              </Lbl>
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
              background: i === idx ? '#7c3aed' : 'rgba(10,10,10,0.14)',
              transition: `width 500ms ${EASE}, background 500ms ${EASE}`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
