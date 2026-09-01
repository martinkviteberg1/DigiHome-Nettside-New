import React from 'react';
import {
  LayoutGrid, Home, Users, MessageSquare, FileText, ShieldCheck, Wallet, Settings,
  Bell, HelpCircle, ClipboardList, Building2, CalendarDays, Clock,
} from 'lucide-react';

/* ---------------------------------------------------------------------------
   Hero-vinduet — rammeløst, flytende app-panel (ingen maskinvare).
   Moderne SaaS-formspråk: glassflate, myk lilla skygge, ikon-rail.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };

function Kurve({ farge = '#1f7a45', ned = false }) {
  return (
    <svg viewBox="0 0 60 20" className="h-[18px] w-[58px]" aria-hidden="true">
      <polyline points={ned ? '0,5 12,8 24,6 36,12 48,14 60,17' : '0,17 12,13 24,14 36,9 48,6 60,2'} fill="none" stroke={farge} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const RAIL = [
  [LayoutGrid, false],
  [Home, true],
  [Users, false],
  [MessageSquare, false],
  [FileText, false],
  [ShieldCheck, false],
  [Wallet, false],
  [Settings, false],
];

export default function VinduRamme() {
  return (
    <div className="overflow-hidden rounded-[18px] bg-white shadow-[0_70px_150px_-42px_rgba(84,50,160,0.4),0_24px_60px_-30px_rgba(23,18,12,0.18),0_0_0_1px_rgba(0,0,0,0.05)] sm:rounded-[24px]" aria-hidden="true">
      <div className="flex">
        {/* Ikon-rail */}
        <div className="hidden w-[54px] shrink-0 flex-col items-center gap-2 border-r border-black/[0.05] bg-white py-5 md:flex">
          {RAIL.map(([Ikon, aktiv], i) => (
            <span key={i} className={`flex h-[30px] w-[30px] items-center justify-center rounded-[10px] ${aktiv ? 'bg-[#7c3aed] text-white shadow-[0_6px_14px_-4px_rgba(124,58,237,0.55)]' : 'text-[#b3aca1]'}`}>
              <Ikon className="h-[13px] w-[13px]" strokeWidth={aktiv ? 2.1 : 1.8} />
            </span>
          ))}
        </div>

        {/* Innhold */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9B5BD6] text-[13px] font-bold text-white">M</span>
              <div>
                <p className="text-[14px] font-bold leading-tight text-[#0A0A0A]" style={heading}>God dag, Martin 👋</p>
                <p className="mt-[1px] text-[9px] text-[#a49e93]">Tirsdag 1. september 2026</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-[5px] text-[9px] font-semibold text-[#3A3733] ring-1 ring-black/[0.07]">
                <HelpCircle className="h-[9px] w-[9px] text-[#8d877d]" /> Hjelp
              </span>
              <span className="relative flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white ring-1 ring-black/[0.07]">
                <Bell className="h-[10px] w-[10px] text-[#0A0A0A]" />
                <span className="absolute -right-[2px] -top-[2px] flex h-[10px] w-[10px] items-center justify-center rounded-full bg-[#f97316] text-[6px] font-bold text-white">4</span>
              </span>
            </div>
          </div>

          {/* Varslingskort */}
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              [Users, '2', 'Nye leads', 'venter svar', '#2563eb', '#EAF0FD'],
              [MessageSquare, '13', 'Uleste', 'meldinger', '#7c3aed', '#F1E9FB'],
              [ClipboardList, '71', 'Åpne', 'saker', '#c2410c', '#FBEFE4'],
              [Building2, '59', 'Eiendommer', 'totalt', '#1f7a45', '#E7F3EC'],
            ].map(([Ikon, n, l1, l2, c, bg]) => (
              <div key={l1 + l2} className="rounded-[12px] bg-white p-2.5 shadow-[0_2px_8px_-2px_rgba(23,18,12,0.07)] ring-1 ring-black/[0.05]">
                <div className="flex items-center gap-2">
                  <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px]" style={{ background: bg }}><Ikon className="h-[10px] w-[10px]" style={{ color: c }} /></span>
                  <span className="text-[16px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{n}</span>
                </div>
                <p className="mt-1.5 text-[8px] font-medium leading-tight text-[#8d877d]">{l1} {l2}</p>
              </div>
            ))}
          </div>

          {/* Økonomi */}
          <p className="mt-4 text-[10px] font-bold text-[#0A0A0A]" style={heading}>Økonomi denne måneden</p>
          <div className="mt-1.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ['Leieinntekt', '894 500', '+499 300 fra forrige måned', '#1f7a45'],
              ['Honorar', '126 987', '+42 695 fra forrige måned', '#7c3aed'],
              ['Netto til huseiere', '767 512', '+456 605 fra forrige måned', '#8d877d'],
            ].map(([l, v, sub, farge]) => (
              <div key={l} className="rounded-[12px] bg-white p-2.5 shadow-[0_2px_8px_-2px_rgba(23,18,12,0.07)] ring-1 ring-black/[0.05]">
                <p className="truncate text-[8px] font-medium text-[#a49e93]">{l}</p>
                <p className="mt-1 text-[15px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}<span className="ml-[2px] text-[8px] font-semibold text-[#a49e93]">kr</span></p>
                <p className="mt-1 truncate text-[7px] font-semibold" style={{ color: farge === '#8d877d' ? '#78716c' : farge }}>{sub}</p>
                <div className="mt-1.5"><Kurve farge={farge} /></div>
              </div>
            ))}
            <div className="rounded-[12px] bg-white p-2.5 shadow-[0_2px_8px_-2px_rgba(23,18,12,0.07)] ring-1 ring-black/[0.05]">
              <p className="text-[8px] font-medium text-[#a49e93]">Belegg</p>
              <p className="mt-1 text-[15px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>48,8<span className="ml-[2px] text-[8px] font-semibold text-[#a49e93]">%</span></p>
              <div className="mt-[11px] h-[5px] overflow-hidden rounded-full bg-[#EFEBE4]">
                <div className="h-full w-[49%] rounded-full bg-gradient-to-r from-[#7c3aed] to-[#9B5BD6]" />
              </div>
              <p className="mt-[8px] truncate text-[7px] text-[#a49e93]">41 enheter utleid</p>
            </div>
          </div>

          {/* Aktiviteter */}
          <p className="mt-4 text-[10px] font-bold text-[#0A0A0A]" style={heading}>Aktiviteter</p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {[
              [CalendarDays, 'Visning i morgen', 'Leilighet 2B', '10:00'],
              [Clock, 'Kontrakt utløper', 'Leilighet 1A', '2 dager'],
              [MessageSquare, 'Ny melding fra Emma', 'Leilighet 3C', '1 time'],
            ].map(([Ikon, t, s, når]) => (
              <div key={t} className="flex items-center gap-2 rounded-[11px] bg-white px-2.5 py-2 shadow-[0_2px_8px_-2px_rgba(23,18,12,0.07)] ring-1 ring-black/[0.05]">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#F4F1EB]"><Ikon className="h-[9px] w-[9px] text-[#57534e]" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8.5px] font-bold leading-tight text-[#0A0A0A]">{t}</p>
                  <p className="truncate text-[7px] text-[#a49e93]">{s}</p>
                </div>
                <span className="hidden shrink-0 text-[7px] font-semibold text-[#a49e93] lg:block">{når}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
