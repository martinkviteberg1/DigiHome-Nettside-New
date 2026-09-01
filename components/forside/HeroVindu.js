import React from 'react';
import {
  LayoutGrid, Home, Users, MessageSquare, FileText, Bell, ClipboardList, Building2,
  CalendarDays, Clock, Inbox, Sparkles, Megaphone, FolderOpen, Search, ChevronRight, ArrowUpRight,
} from 'lucide-react';

/* ---------------------------------------------------------------------------
   Hero-vinduet — rammeløst, flytende app-panel (ingen maskinvare).
   Innholdet er en replika av Oversikt-dashboardet i selve appen:
   mørk sidemeny (ARBEID/DRIFT), varslingsrad, KPI-bånd med hairlines,
   statskort med LIVE, mørk innsiktsbanner og Aktive saker/Portefølje
   kuttet av bunnkanten som ekte scroll.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };

function Kurve({ farge = '#1f7a45', ned = false }) {
  return (
    <svg viewBox="0 0 60 20" className="h-[18px] w-[60px]" aria-hidden="true">
      <polyline points={ned ? '0,5 12,8 24,6 36,12 48,14 60,17' : '0,17 12,13 24,14 36,9 48,6 60,2'} fill="none" stroke={farge} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ARBEID = [
  [LayoutGrid, 'Oversikt', true, null],
  [Clock, 'Operasjonssentral', false, null],
  [Inbox, 'Innboks', false, 13],
  [CalendarDays, 'Reservasjoner', false, null],
  [CalendarDays, 'Kalender', false, null],
  [MessageSquare, 'Kanaler', false, null],
  [ClipboardList, 'Oppgaver', false, null],
  [Sparkles, 'Driftsassistent', false, null],
];

const DRIFT = [
  [Building2, 'Eiendommer'],
  [Megaphone, 'Utleieprosesser'],
  [FileText, 'Leieforhold'],
  [FolderOpen, 'Dokumenter'],
  [ClipboardList, 'Saker'],
];

export default function VinduRamme() {
  return (
    <div className="overflow-hidden rounded-[18px] bg-[#FAFAF8] shadow-[0_70px_150px_-42px_rgba(84,50,160,0.4),0_24px_60px_-30px_rgba(23,18,12,0.18),0_0_0_1px_rgba(0,0,0,0.05)] sm:rounded-[24px]" aria-hidden="true">
      <div className="flex items-stretch">

        {/* Mørk sidemeny — kollapset (kun ikoner), som i appen */}
        <div className="hidden w-[58px] shrink-0 flex-col items-center bg-[#0C0C0E] px-2 py-4 md:flex">
          <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[7px] bg-[#7c3aed] text-[12px] font-black italic text-white" style={heading}>H</span>
          <span className="mt-3 flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-white/[0.07]">
            <Search className="h-[11px] w-[11px] text-white/45" />
          </span>
          <div className="mt-3 space-y-[4px]">
            {ARBEID.map(([Ikon, l, aktiv, badge]) => (
              <div key={l} className={`relative flex h-[28px] w-[28px] items-center justify-center rounded-[8px] ${aktiv ? 'bg-[#7c3aed]/[0.25] text-[#C9A6F0]' : 'text-white/50'}`}>
                <Ikon className="h-[12px] w-[12px]" strokeWidth={aktiv ? 2.1 : 1.8} />
                {badge ? <span className="absolute -right-[2px] -top-[2px] flex h-[11px] min-w-[11px] items-center justify-center rounded-full bg-[#7c3aed] px-[2.5px] text-[6.5px] font-bold text-white">{badge}</span> : null}
              </div>
            ))}
          </div>
          <div className="my-3 h-px w-[26px] bg-white/[0.1]" />
          <div className="space-y-[4px]">
            {DRIFT.map(([Ikon, l]) => (
              <div key={l} className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] text-white/50">
                <Ikon className="h-[12px] w-[12px]" strokeWidth={1.8} />
              </div>
            ))}
          </div>
          <span className="mt-auto flex h-[24px] w-[24px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9B5BD6] text-[9px] font-bold text-white">M</span>
        </div>

        {/* Innhold — som i appen */}
        <div className="min-w-0 flex-1 px-4 pb-0 pt-4 sm:px-5 sm:pt-5">
          {/* Header */}
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

          {/* Varslingsrad — 3 kort som i appen */}
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

          {/* KPI-bånd — ett kort, fire kolonner med hairlines, som i appen */}
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

          {/* Statskort — som i appen */}
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

          {/* Mørk innsiktsbanner — som i appen */}
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

          {/* Aktive saker / Portefølje — kuttet av vinduskanten, som ekte scroll */}
          <div className="mt-3.5 grid grid-cols-2 gap-3">
            {['Aktive saker', 'Portefølje'].map((t) => (
              <div key={t}>
                <div className="flex items-baseline justify-between">
                  <p className="text-[12px] font-bold text-[#0A0A0A]" style={heading}>{t}</p>
                  <span className="text-[9px] font-semibold text-[#8d877d]">Se alle</span>
                </div>
                <div className="mt-2 h-[26px] rounded-t-[10px] bg-white ring-1 ring-black/[0.05]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
