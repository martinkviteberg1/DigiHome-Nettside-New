'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Check, CheckCircle2, Megaphone, UserCheck, FileSignature, ShieldCheck,
  Banknote, MessageSquare, Home, User, Building2, Bell, Play, Lock, Sparkles, ChevronRight,
  Users, Clock, CalendarDays, LayoutGrid, Menu, Plus, FileText, ClipboardList, FolderOpen,
  BarChart3, Settings, HelpCircle, ChevronDown, Wallet, Inbox, Search,
} from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';

/* ---------------------------------------------------------------------------
   Forsiden — digihome.no som produktledet landingsside.

   Dramaturgi: løftet («Utleie på autopilot») → produktet som helt
   (dashboardramme + flytende hendelser) → integrasjoner → historien
   («Én plattform. Hele leieprosessen.») → målgruppene (privat / pro) →
   funksjonene (editorial 01–04 med produktflate) → mørk ROI-seksjon →
   «Hvordan vil du bruke DigiHome?» → CTA. Footer rendres fra page.js.

   Ingen priser på forsiden — kun lenker til /priser. Ingen påstander vi
   ikke kan stå inne for: ingen fiktive kundelogoer, ingen oppdiktede tall.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };

const NAV = [
  { href: '#produkt', label: 'Produkt' },
  { href: '/priser', label: 'Priser' },
  { href: '/tjenester', label: 'Tjenester' },
  { href: '/bedrift', label: 'For bedrifter' },
  { href: '/om-oss', label: 'Om oss' },
];

const INTEGRASJONER = ['FINN', 'BankID', 'Vipps', 'Keyhole', 'PowerOffice', 'Fiken', 'Tripletex', 'Airbnb', 'Booking.com'];

const FUNKSJONER = [
  { nr: '01', t: 'Finn leietaker', b: 'Publiser annonsen og følg interessenter gjennom hele utleieprosessen — fra første henvendelse til signert kontrakt.' },
  { nr: '02', t: 'Signer digitalt', b: 'Leiekontrakt og vedlegg signeres trygt med BankID — juridisk holdbart og arkivert automatisk.' },
  { nr: '03', t: 'Få betalt', b: 'Husleie, depositum og full betalingsoversikt — med automatiske påminnelser når noe forfaller.' },
  { nr: '04', t: 'La DigiHome følge opp', b: 'Saker, frister og kommunikasjon samlet på ett sted — med varsel når noe faktisk krever deg.' },
];

const BILDE_PRIVAT = 'https://images.pexels.com/photos/19866421/pexels-photo-19866421.jpeg?auto=compress&cs=tinysrgb&w=1200';
const BILDE_PRO = 'https://images.unsplash.com/photo-1725785218870-b41365703511?q=80&w=1200&auto=format&fit=crop';

/* ── Sparkline: liten kurve til KPI-kortene ── */
function Kurve({ farge = '#1f7a45', punkter = '0,18 12,14 24,15 36,10 48,7 60,3', ned = false }) {
  return (
    <svg viewBox="0 0 60 20" className="h-[16px] w-[52px]" aria-hidden="true">
      <polyline points={ned ? '0,5 12,8 24,6 36,12 48,14 60,17' : punkter} fill="none" stroke={farge} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── MacBook-rammen: nøyaktig replika av forvalter-dashboardet i appen ── */
function LaptopRamme() {
  const arbeid = [
    [LayoutGrid, 'Oversikt', true, null],
    [Clock, 'Operasjonssentral', false, null],
    [Inbox, 'Innboks', false, 13],
    [CalendarDays, 'Reservasjoner', false, null],
    [CalendarDays, 'Kalender', false, null],
    [MessageSquare, 'Kanaler', false, null],
    [ClipboardList, 'Oppgaver', false, null],
    [Sparkles, 'Driftsassistent', false, null],
  ];
  const drift = [
    [Building2, 'Eiendommer'],
    [Megaphone, 'Utleieprosesser'],
    [FileText, 'Leieforhold'],
    [FolderOpen, 'Dokumenter'],
    [ClipboardList, 'Saker'],
  ];
  return (
    <div className="relative" aria-hidden="true">
      {/* Skjerm — lys aluminiumsbezel */}
      <div className="rounded-[18px] bg-gradient-to-b from-[#FDFCFB] to-[#E5E2DD] p-[8px] pb-[10px] shadow-[0_80px_160px_-48px_rgba(23,18,12,0.42),0_0_0_1px_rgba(0,0,0,0.07)] sm:rounded-[22px] sm:p-[10px] sm:pb-[12px]">
        <div className="flex overflow-hidden rounded-[10px] bg-[#FAFAF8] ring-1 ring-black/[0.06]">

          {/* Mørk sidemeny — som i appen */}
          <div className="hidden w-[128px] shrink-0 flex-col bg-[#0C0C0E] px-2 py-2.5 md:flex">
            <div className="flex items-center gap-1.5 px-1">
              <span className="flex h-[16px] w-[16px] items-center justify-center rounded-[5px] bg-[#7c3aed] text-[8.5px] font-black italic text-white" style={heading}>H</span>
              <span className="text-[9px] font-bold text-white" style={heading}>digihome</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 rounded-[6px] bg-white/[0.07] px-2 py-[4px]">
              <Search className="h-[7px] w-[7px] text-white/40" />
              <span className="flex-1 text-[7px] text-white/40">Søk</span>
              <span className="rounded-[3px] bg-white/[0.1] px-[3px] text-[5.5px] font-semibold text-white/50">⌘K</span>
            </div>
            <p className="mt-2.5 px-1 text-[5.5px] font-bold uppercase tracking-[0.14em] text-white/35">Arbeid</p>
            <div className="mt-1 space-y-[1px]">
              {arbeid.map(([Ikon, l, aktiv, badge]) => (
                <div key={l} className={`flex items-center gap-1.5 rounded-[5px] px-1.5 py-[3.5px] text-[7px] font-semibold ${aktiv ? 'bg-[#7c3aed]/[0.22] text-[#C9A6F0]' : 'text-white/55'}`}>
                  <Ikon className="h-[7.5px] w-[7.5px] shrink-0" />
                  <span className="flex-1 truncate">{l}</span>
                  {badge ? <span className="rounded-full bg-white/[0.12] px-[4px] py-[0.5px] text-[5.5px] font-bold text-white/80">{badge}</span> : null}
                </div>
              ))}
            </div>
            <p className="mt-2.5 px-1 text-[5.5px] font-bold uppercase tracking-[0.14em] text-white/35">Drift</p>
            <div className="mt-1 space-y-[1px]">
              {drift.map(([Ikon, l]) => (
                <div key={l} className="flex items-center gap-1.5 rounded-[5px] px-1.5 py-[3.5px] text-[7px] font-semibold text-white/55">
                  <Ikon className="h-[7.5px] w-[7.5px] shrink-0" />
                  <span className="truncate">{l}</span>
                </div>
              ))}
            </div>
            <div className="mt-auto flex items-center gap-1.5 border-t border-white/[0.08] px-1 pt-2">
              <span className="flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9B5BD6] text-[6px] font-bold text-white">M</span>
              <div className="min-w-0">
                <p className="truncate text-[6.5px] font-bold leading-tight text-white/85">Martin Kviteberg</p>
                <p className="truncate text-[5.5px] text-white/40">martin@digihome.no</p>
              </div>
            </div>
          </div>

          {/* Innhold — som i appen */}
          <div className="min-w-0 flex-1 px-3 pb-0 pt-3 sm:px-4 sm:pt-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#9B5BD6] text-[12px] font-bold text-white ring-2 ring-white">M</span>
                <div>
                  <p className="text-[15px] font-bold leading-tight tracking-[-0.02em] text-[#0A0A0A]" style={heading}>God dag, Martin</p>
                  <p className="mt-[1px] text-[8px] text-[#a49e93]">Tirsdag 1. September 2026</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1.5 rounded-full bg-white px-2.5 py-[5px] text-[8.5px] font-semibold text-[#0A0A0A] shadow-[0_1px_2px_rgba(23,18,12,0.06)] ring-1 ring-black/[0.06]">
                  Saker <span className="rounded-full bg-[#7c3aed] px-[5px] py-[1px] text-[6.5px] font-bold text-white">71</span>
                </span>
                <span className="rounded-full bg-[#141216] px-3 py-[6px] text-[8.5px] font-semibold text-white">Eiendommer</span>
                <span className="relative flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white ring-1 ring-black/[0.06]">
                  <Bell className="h-[9px] w-[9px] text-[#0A0A0A]" />
                  <span className="absolute -right-[2px] -top-[2px] flex h-[9px] w-[9px] items-center justify-center rounded-full bg-[#d13438] text-[5.5px] font-bold text-white">4</span>
                </span>
              </div>
            </div>

            {/* Varslingsrad — 3 kort som i appen */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['2', '2 nye leads venter svar', '#2563eb', '#EAF0FD'],
                ['13', '13 uleste meldinger', '#7c3aed', '#F1E9FB'],
                ['71', '71 åpne saker', '#c2410c', '#FBEFE4'],
              ].map(([n, t, c, bg]) => (
                <div key={t} className="flex items-center gap-2 rounded-[9px] bg-white px-2.5 py-2 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
                  <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] text-[8.5px] font-bold" style={{ color: c, background: bg }}>{n}</span>
                  <span className="min-w-0 flex-1 truncate text-[8px] font-semibold text-[#3A3733]">{t}</span>
                  <ChevronRight className="h-[9px] w-[9px] shrink-0 text-[#c8c3ba]" />
                </div>
              ))}
            </div>

            {/* KPI-bånd — ett kort, fire kolonner med hairlines, som i appen */}
            <div className="mt-2 grid grid-cols-4 divide-x divide-black/[0.05] rounded-[10px] bg-white shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
              {[
                ['Leieinntekt / mnd', '894 500', 'Potensiale: 1 393 800 kr/mnd', '+499 300 fra 27 ledige', '#1f7a45'],
                ['Honorar / mnd', '126 987,5', 'Potensiale: 169 682,5 kr/mnd', '+42 695 fra 15 ledige', '#7c3aed'],
                ['Netto til huseiere / mnd', '767 512,5', 'Potensiale: 1 224 117,5 kr/mnd', '+456 605 fra 27 ledige', '#1f7a45'],
              ].map(([l, v, pot, sub, farge]) => (
                <div key={l} className="p-2.5">
                  <p className="truncate text-[7.5px] font-medium text-[#a49e93]">{l}</p>
                  <p className="mt-1 text-[14px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}<span className="ml-[2px] text-[7.5px] font-semibold text-[#a49e93]">kr</span></p>
                  <div className="mt-1.5"><Kurve farge={farge} /></div>
                  <p className="mt-1 truncate text-[6.5px] font-semibold text-[#7c3aed]">{pot}</p>
                  <p className="truncate text-[6px] text-[#a49e93]">{sub}</p>
                </div>
              ))}
              <div className="p-2.5">
                <div className="flex items-baseline justify-between">
                  <p className="text-[7.5px] font-medium text-[#a49e93]">Belegg</p>
                  <p className="text-[6.5px] font-semibold text-[#a49e93]">41/84</p>
                </div>
                <p className="mt-1 text-[14px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>48.8<span className="ml-[2px] text-[7.5px] font-semibold text-[#a49e93]">%</span></p>
                <div className="mt-[9px] h-[4px] overflow-hidden rounded-full bg-[#EFEBE4]">
                  <div className="h-full w-[49%] rounded-full bg-gradient-to-r from-[#7c3aed] to-[#9B5BD6]" />
                </div>
                <p className="mt-[6px] truncate text-[6.5px] text-[#a49e93]">41 enheter utleid</p>
              </div>
            </div>

            {/* Statskort — som i appen */}
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[
                [Building2, '59', 'Eiendommer', null, null, 'LIVE', '#1f7a45', false],
                [Home, '84', 'Enheter', '41 utleid', '#1f7a45', null, '#1f7a45', false],
                [Users, '43', 'Leietakere', null, null, null, '#2563eb', false],
                [Clock, '71', 'Åpne saker', 'Trenger oppfølging', '#c2410c', null, '#d13438', true],
              ].map(([Ikon, v, l, sub, subFarge, live, kurveFarge, ned]) => (
                <div key={l} className="rounded-[10px] bg-white p-2.5 shadow-[0_1px_2px_rgba(23,18,12,0.05)] ring-1 ring-black/[0.05]">
                  <div className="flex items-center justify-between">
                    <span className="flex h-[20px] w-[20px] items-center justify-center rounded-[7px] bg-[#F4F1EB]"><Ikon className="h-[10px] w-[10px] text-[#57534e]" /></span>
                    {live
                      ? <span className="flex items-center gap-1 text-[6.5px] font-bold text-[#1f7a45]"><span className="h-[4px] w-[4px] animate-pulse rounded-full bg-[#1f7a45]" />LIVE</span>
                      : <Kurve farge={kurveFarge} ned={ned} />}
                  </div>
                  <p className="mt-2 text-[16px] font-bold leading-none text-[#0A0A0A] tabular-nums" style={heading}>{v}</p>
                  <p className="mt-[3px] truncate text-[7.5px] font-medium text-[#8d877d]">{l}</p>
                  {sub ? <p className="truncate text-[6.5px] font-semibold" style={{ color: subFarge }}>{sub}</p> : <p className="text-[6.5px]">&nbsp;</p>}
                </div>
              ))}
            </div>

            {/* Mørk innsiktsbanner — som i appen */}
            <div className="mt-2 flex items-center justify-between gap-3 overflow-hidden rounded-[11px] bg-[#141216] px-3 py-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[8px] bg-white/[0.09]"><Sparkles className="h-[10px] w-[10px] text-[#C9A6F0]" /></span>
                <div className="min-w-0">
                  <p className="truncate text-[9.5px] font-bold text-white" style={heading}>Potensial for høyere belegg</p>
                  <p className="truncate text-[7.5px] text-white/50">41 av 84 enheter utleid. 49% belegg.</p>
                </div>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-[#7c3aed] px-3 py-[6px] text-[8.5px] font-bold text-white">Se detaljer <ArrowUpRight className="h-[9px] w-[9px]" /></span>
            </div>

            {/* Aktive saker / Portefølje — kuttet av skjermkanten, som ekte scroll */}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {['Aktive saker', 'Portefølje'].map((t) => (
                <div key={t}>
                  <div className="flex items-baseline justify-between">
                    <p className="text-[10px] font-bold text-[#0A0A0A]" style={heading}>{t}</p>
                    <span className="text-[7px] font-semibold text-[#8d877d]">Se alle</span>
                  </div>
                  <div className="mt-1.5 h-[22px] rounded-t-[8px] bg-white ring-1 ring-black/[0.05]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* MacBook-basen — lys aluminium */}
      <div className="absolute -bottom-[11px] left-1/2 h-[13px] w-[116%] -translate-x-1/2 rounded-b-[16px] rounded-t-[3px] bg-gradient-to-b from-[#F4F2EF] via-[#E3E0DB] to-[#C7C4BF] shadow-[0_26px_54px_-18px_rgba(23,18,12,0.4)]">
        <div className="mx-auto h-[5px] w-[104px] rounded-b-[9px] bg-[#D3D0CB]" />
      </div>
    </div>
  );
}

/* ── Telefonrammen: lys premium-utgave ── */
function TelefonRamme() {
  return (
    <div className="w-[186px] rounded-[30px] bg-gradient-to-b from-[#FBFAF8] to-[#DAD7D2] p-[6px] shadow-[0_50px_110px_-32px_rgba(23,18,12,0.5),0_0_0_1px_rgba(0,0,0,0.08)]" aria-hidden="true">
      <div className="relative overflow-hidden rounded-[25px] bg-[#FBFAF9] ring-1 ring-black/[0.06]">
        {/* Statuslinje + dynamic island */}
        <div className="flex items-center justify-between px-4 pt-2">
          <span className="text-[8px] font-bold text-[#0A0A0A] tabular-nums">9:41</span>
          <span className="h-[12px] w-[50px] rounded-full bg-[#101013]" />
          <span className="flex items-center gap-[2px]">
            {[3, 4.5, 6].map((h) => <span key={h} className="w-[2px] rounded-full bg-[#0A0A0A]" style={{ height: h }} />)}
            <span className="ml-[3px] h-[6px] w-[11px] rounded-[2.5px] border border-[#0A0A0A]/70"><span className="block h-full w-[70%] rounded-[1.5px] bg-[#0A0A0A]" /></span>
          </span>
        </div>
        <div className="px-3 pb-2.5 pt-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[10.5px] font-bold text-[#0A0A0A]" style={heading}>God dag, Martin 👋</p>
            <Bell className="h-[10px] w-[10px] text-[#8d877d]" />
          </div>
          <p className="mt-2 text-[8px] font-bold text-[#0A0A0A]" style={heading}>Ditt overblikk</p>
          <div className="mt-1.5 space-y-[5px]">
            {[
              [LayoutGrid, '98 %', 'Utleid', '#F1E9FB', '#7c3aed'],
              [Users, '142', 'Aktive leieforhold', '#EAF0FD', '#2563eb'],
              [ClipboardList, '3', 'Åpne saker', '#FBEFE4', '#c2410c'],
              [Banknote, '99,2 %', 'Betalt denne måneden', '#E7F3EC', '#1f7a45'],
            ].map(([Ikon, v, l, bg, c]) => (
              <div key={l} className="flex items-center gap-2 rounded-[9px] bg-white px-2 py-[6px] ring-1 ring-black/[0.05]">
                <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px]" style={{ background: bg }}><Ikon className="h-[10px] w-[10px]" style={{ color: c }} /></span>
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold leading-tight text-[#0A0A0A] tabular-nums" style={heading}>{v}</p>
                  <p className="truncate text-[7px] text-[#a49e93]">{l}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2.5 text-[8px] font-bold text-[#0A0A0A]" style={heading}>Kommende</p>
          <div className="mt-1.5 space-y-[5px]">
            {[['Visning i morgen', 'Leilighet 2B', '10.00'], ['Kontrakt utløper', 'Leilighet 1A', '2 dager']].map(([t, s, når]) => (
              <div key={t} className="flex items-center gap-2 rounded-[9px] bg-white px-2 py-[6px] ring-1 ring-black/[0.05]">
                <span className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-[6px] bg-[#F4F1EB]"><CalendarDays className="h-[10px] w-[10px] text-[#57534e]" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[8.5px] font-bold leading-tight text-[#0A0A0A]">{t}</p>
                  <p className="truncate text-[7px] text-[#a49e93]">{s}</p>
                </div>
                <span className="shrink-0 text-[7px] font-semibold text-[#a49e93]">{når}</span>
              </div>
            ))}
          </div>
          {/* Tab-bar */}
          <div className="mt-2.5 flex items-center justify-between rounded-full bg-white px-3.5 py-[7px] ring-1 ring-black/[0.06]">
            <span className="flex flex-col items-center gap-[1px]"><LayoutGrid className="h-[11px] w-[11px] text-[#7c3aed]" /><span className="text-[4.5px] font-bold text-[#7c3aed]">Oversikt</span></span>
            <span className="flex flex-col items-center gap-[1px]"><Building2 className="h-[11px] w-[11px] text-[#c8c3ba]" /><span className="text-[4.5px] font-semibold text-[#c8c3ba]">Eiendommer</span></span>
            <span className="flex h-[24px] w-[24px] items-center justify-center rounded-full bg-[#7c3aed] shadow-[0_6px_14px_-4px_rgba(124,58,237,0.6)]"><Plus className="h-[13px] w-[13px] text-white" /></span>
            <span className="flex flex-col items-center gap-[1px]"><ClipboardList className="h-[11px] w-[11px] text-[#c8c3ba]" /><span className="text-[4.5px] font-semibold text-[#c8c3ba]">Saker</span></span>
            <span className="flex flex-col items-center gap-[1px]"><Menu className="h-[11px] w-[11px] text-[#c8c3ba]" /><span className="text-[4.5px] font-semibold text-[#c8c3ba]">Meny</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Interessent-flaten til funksjonsseksjonen ── */
function InteressentRamme() {
  const rader = [
    ['Sofie Nilsen', 'Leilighet 12B', 'Kvalifisert', '#1f7a45', '#E7F3EC'],
    ['Thomas Berg', 'Leilighet 3A', 'Visning', '#9a6b1c', '#FBF3E4'],
    ['Martine Johansen', 'Leilighet 7C', 'Ny', '#5b5650', '#F1EEE8'],
    ['Andrea Steen', 'Leilighet 1A', 'Tilbud sendt', '#7c3aed', '#F1E9FB'],
    ['Emma Solberg', 'Leilighet 5B', 'Reservert', '#0e7490', '#E6F3F6'],
  ];
  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_44px_100px_-40px_rgba(23,18,12,0.4)] ring-1 ring-black/[0.07] sm:rounded-[20px]" aria-hidden="true">
      <div className="flex items-center justify-between border-b border-[#EDE9E2] px-5 py-3.5">
        <p className="text-[14px] font-bold text-[#0A0A0A]" style={heading}>Interessenter</p>
        <span className="rounded-full bg-[#9B5BD6] px-3 py-[5px] text-[10.5px] font-semibold text-white">Ny interessent</span>
      </div>
      <div className="flex gap-1.5 overflow-hidden px-5 pt-3.5">
        {['Alle', 'Nye', 'Visning', 'Kvalifisert', 'Tilbud sendt'].map((f, i) => (
          <span key={f} className={`whitespace-nowrap rounded-full px-2.5 py-[4px] text-[10.5px] font-semibold ${i === 0 ? 'bg-[#0A0A0A] text-white' : 'text-[#8d877d] ring-1 ring-black/[0.07]'}`}>{f}</span>
        ))}
      </div>
      <div className="px-5 py-3.5">
        {rader.map(([navn, enhet, status, c, bg], i) => (
          <div key={navn} className={`flex items-center justify-between gap-3 rounded-[9px] px-3 py-[9px] text-[11.5px] ${i % 2 ? '' : 'bg-[#FCFBF9]'}`}>
            <span className="w-[34%] truncate font-semibold text-[#0A0A0A]">{navn}</span>
            <span className="w-[28%] truncate text-[#6F6A60]">{enhet}</span>
            <span className="rounded-full px-2 py-[3px] text-[10px] font-bold" style={{ color: c, background: bg }}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Forside2026() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const klikk = (hvor) => { try { track('forside_cta', { hvor }); } catch (e) { /* ok */ } };

  return (
    <div className="min-h-screen bg-[#FDFCFB]" data-testid="forside-2026">
      {/* ── Navbar ── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-[#E6E1D9] bg-[#FDFCFB]/90 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-[66px] w-full max-w-[1320px] items-center justify-between gap-4 px-6 sm:px-10">
          <Link href="/" className="flex shrink-0 items-center" data-testid="forside-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[22px] w-auto" />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              n.href.startsWith('#')
                ? <a key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a]">{n.label}</a>
                : <Link key={n.href} href={n.href} className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a]">{n.label}</Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a href={site.loginUrl} className="hidden rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:text-[#0a0a0a] sm:block">Logg inn</a>
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('nav')} data-testid="forside-nav-cta" className="e-btn e-btn-dark !h-[40px] !bg-[#7c3aed] !px-4 !text-[13.5px] hover:!bg-[#6d28d9]">
              Kom i gang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero: løftet + produktet (MacBook + telefon) ── */}
        <section className="relative overflow-x-clip">
          {/* Myk lilla vask i DigiHome-fargene */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-44 bottom-[-60px] h-[440px] w-[560px] rounded-full bg-[#7c3aed]/[0.06] blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-4 h-[400px] w-[520px] rounded-full bg-[#9B5BD6]/[0.05] blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-[1320px] items-center gap-14 px-6 pb-24 pt-10 sm:px-10 sm:pt-14 lg:grid-cols-[0.6fr_1.4fr] lg:gap-10 lg:pb-32 xl:gap-12">
            <div>
              <p className="e-label dh-cover-inn !text-[#7c3aed]">Ny generasjon utleie</p>
              <h1 className="e-display dh-cover-inn mt-4 text-[46px] sm:text-[58px] lg:text-[60px] xl:text-[70px]" style={{ animationDelay: '.06s' }}>
                Utleie på<br />autopilot<span className="text-[#9B5BD6]">.</span>
              </h1>
              <p className="dh-cover-inn mt-6 max-w-[44ch] text-[15.5px] leading-[1.65] text-[#6F6A60] sm:text-[16.5px]" style={{ animationDelay: '.14s' }}>
                DigiHome kobler sammen alle stegene i utleieprosessen — fra annonse
                til BankID-signering, husleie, saker og oppfølging.
                <span className="text-[#0A0A0A]"> Én plattform. Full kontroll. Helt automatisk.</span>
              </p>
              <ul className="dh-cover-inn mt-6 space-y-2.5" style={{ animationDelay: '.18s' }}>
                {[
                  ['Spar tid', 'vi automatiserer det repetitive'],
                  ['Full kontroll', 'alt samlet på ett sted'],
                  ['Trygt og sikkert', 'BankID og kryptert data'],
                ].map(([b, r]) => (
                  <li key={b} className="flex items-center gap-2.5 text-[14.5px] text-[#3A3733]">
                    <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-[#7c3aed]" strokeWidth={1.9} />
                    <span><b className="font-semibold text-[#0A0A0A]">{b}</b> — {r}</span>
                  </li>
                ))}
              </ul>
              <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '.22s' }}>
                <Link href="/bli-utleier/start" prefetch onClick={() => klikk('hero')} data-testid="forside-hero-cta"
                  className="e-btn e-btn-dark group !bg-[#7c3aed] hover:!bg-[#6d28d9]">
                  Kom i gang
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/tour" prefetch className="e-btn e-btn-ghost" data-testid="forside-hero-tour">
                  <Play className="h-3.5 w-3.5 fill-current" /> Se hvordan det fungerer
                </Link>
              </div>
              <ul className="dh-cover-inn mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 text-[12px] text-[#8d877d]" style={{ animationDelay: '.26s' }}>
                {[[Lock, 'Kom i gang på 2 minutter'], [Check, 'Ingen bindingstid'], [MessageSquare, 'Norsk support']].map(([Ikon, t], i) => (
                  <li key={t} className="flex items-center gap-3">
                    {i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-[#D6CFC4]" />}
                    <span className="flex items-center gap-1.5"><Ikon className="h-[12px] w-[12px] shrink-0 text-[#a49e93]" />{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Produktkomposisjonen: rett-på MacBook + telefon over høyre kant */}
            <div className="dh-cover-inn relative pb-12 lg:pb-16" style={{ animationDelay: '.24s' }}>
              <div className="md:pr-10 lg:pr-12">
                <LaptopRamme />
              </div>
              <div className="absolute -bottom-12 right-0 hidden md:block lg:-right-2">
                <TelefonRamme />
              </div>
              {/* Gulvskygge */}
              <div aria-hidden="true" className="absolute -bottom-7 left-1/2 h-[44px] w-[84%] -translate-x-1/2 rounded-[100%] bg-black/[0.09] blur-2xl" />
            </div>
          </div>
        </section>

        {/* ── Alt du trenger — på ett sted: prosessen 01–05 ── */}
        <section id="produkt" className="scroll-mt-20 border-y border-[#E6E1D9] bg-white">
          <div className="mx-auto w-full max-w-[1320px] px-6 py-14 sm:px-10 sm:py-20">
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.16em] text-[#7c3aed]">Alt du trenger — på ett sted</p>
            <h2 className="e-display mx-auto mt-3 max-w-[26ch] text-center text-[28px] sm:text-[38px]">Fra manuelt arbeid til automatisert drift<span className="text-[#9B5BD6]">.</span></h2>
            <div className="mt-12 grid grid-cols-1 gap-y-9 gap-x-8 sm:grid-cols-2 lg:flex lg:items-start lg:gap-4 sm:mt-14">
              {[
                [Megaphone, 'Finn leietaker', 'Publiser på FINN og motta interessenter — vi hjelper deg hele veien.'],
                [UserCheck, 'Screening', 'Finn og vurder de beste leietakerne.'],
                [FileSignature, 'Kontrakt', 'Digital kontrakt og BankID-signering.'],
                [Wallet, 'Husleie', 'Automatisk betaling, KID og purringer.'],
                [MessageSquare, 'Oppfølging', 'Saker, kommunikasjon og fornyelser.'],
              ].map(([Ikon, t, b], i) => (
                <React.Fragment key={t}>
                  <div className="flex gap-4 lg:flex-1">
                    <div className="shrink-0">
                      <p className="text-[16px] font-bold leading-none text-[#7c3aed] tabular-nums" style={heading}>0{i + 1}</p>
                      <Ikon className="mt-3 h-[24px] w-[24px] text-[#7c3aed]" strokeWidth={1.5} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15.5px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{t}</p>
                      <p className="mt-1.5 text-[12.5px] leading-[1.65] text-[#6F6A60]">{b}</p>
                    </div>
                  </div>
                  {i < 4 && <ArrowRight className="mt-[2px] hidden h-4 w-4 shrink-0 text-[#D6CFC4] lg:block" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* ── Integrasjoner ── */}
        <section className="border-b border-[#E6E1D9] bg-[#FCFBF8]">
          <div className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-10">
            <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#a49e93]">Snakker med det dere allerede bruker</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-10">
              {INTEGRASJONER.map((n) => (
                <li key={n} className="text-[15px] font-bold tracking-[-0.02em] text-[#8d877d] sm:text-[16.5px]" style={heading}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Målgruppene ── */}
        <section className="mx-auto w-full max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {/* Privat */}
            <div className="grid overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] shadow-[0_2px_5px_rgba(23,18,12,0.04)] sm:grid-cols-[1.15fr_1fr]" data-testid="forside-kort-privat">
              <div className="flex flex-col justify-between gap-8 p-7 sm:p-9">
                <div>
                  <p className="e-label !text-[#9B5BD6]">For private huseiere</p>
                  <h3 className="e-display mt-3 text-[24px] sm:text-[28px]">Én bolig. Nesten null administrasjon.</h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-[#6F6A60]">
                    Selvbetjent utleie med kontrakt, BankID, depositum, betaling og
                    oppfølging — i hele Norge.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link href="/privat" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#7c3aed]">
                    Les mer <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/priser" className="text-[14px] font-semibold text-[#0A0A0A]/60 transition-colors hover:text-[#0A0A0A]">Se priser</Link>
                </div>
              </div>
              <div className="relative min-h-[200px] sm:min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BILDE_PRIVAT} alt="Lys og varm stue i utleiebolig" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
              </div>
            </div>
            {/* Pro */}
            <div className="relative grid overflow-hidden rounded-[22px] bg-[#0B0A09] text-white ring-1 ring-black/[0.2] sm:grid-cols-[1.15fr_1fr]" data-testid="forside-kort-pro">
              <div className="relative z-10 flex flex-col justify-between gap-8 p-7 sm:p-9">
                <div>
                  <p className="e-label !text-[#C9A6F0]">For profesjonelle forvaltere</p>
                  <h3 className="e-display mt-3 text-[24px] !text-white sm:text-[28px]">Flere enheter. Samme kontroll.</h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-white/60">
                    DigiHome automatiserer arbeidsflyten til forvalteren og samler
                    hele porteføljen i én kraftig flate.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link href="/bedrift" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#C9A6F0]">
                    Les mer <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                  <Link href="/priser" className="text-[14px] font-semibold text-white/55 transition-colors hover:text-white">Se priser</Link>
                </div>
              </div>
              <div className="relative min-h-[200px] sm:min-h-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={BILDE_PRO} alt="Moderne bygård i kveldslys" className="absolute inset-0 h-full w-full object-cover opacity-80" loading="lazy" />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0B0A09] via-[#0B0A09]/35 to-transparent" />
              </div>
            </div>
          </div>
        </section>

        {/* ── Funksjonene: editorial 01–04 + produktflate ── */}
        <section className="border-t border-[#E6E1D9]">
          <div className="mx-auto grid w-full max-w-[1320px] items-center gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <p className="e-label">Bygget for å gjøre jobben</p>
              <h2 className="e-display mt-3 max-w-[16ch] text-[28px] sm:text-[36px]">Fra første visning til siste husleie.</h2>
              <div className="mt-9">
                {FUNKSJONER.map((f) => (
                  <div key={f.nr} className="group border-t border-[#E6E1D9] py-5 first:border-t-0 first:pt-0">
                    <p className="flex items-baseline gap-4">
                      <span className="text-[12.5px] font-bold text-[#9B5BD6] tabular-nums" style={heading}>{f.nr}</span>
                      <span className="text-[17px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{f.t}</span>
                    </p>
                    <p className="mt-1.5 pl-[34px] max-w-[52ch] text-[13.5px] leading-[1.65] text-[#6F6A60]">{f.b}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-2 sm:px-6 lg:px-0">
              <InteressentRamme />
            </div>
          </div>
        </section>

        {/* ── Mørk ROI-seksjon ── */}
        <section className="relative overflow-hidden bg-[#0B0A09] text-white">
          <div aria-hidden="true" className="pointer-events-none absolute -top-44 left-[8%] h-[560px] w-[560px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.16) 0%, transparent 62%)' }} />
          <div className="relative mx-auto w-full max-w-[1320px] px-6 py-18 sm:px-10 sm:py-24">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
              <div>
                <h2 className="e-display max-w-[16ch] text-[30px] !text-white sm:text-[42px]">Hva om én forvalter kunne håndtere dobbelt så mange boliger?</h2>
                <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.7] text-white/60 sm:text-[16px]">
                  DigiHome fjerner det manuelle — slik at dere kan bruke tiden på
                  vekst og fornøyde kunder, ikke på purringer og regneark.
                </p>
                <Link href="/bedrift" className="group mt-8 inline-flex items-center gap-2 text-[15px] font-semibold text-[#C9A6F0]">
                  DigiHome for profesjonelle
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>
              <div className="grid content-center gap-7 sm:grid-cols-3 sm:gap-6">
                {[
                  ['Mindre', 'manuelt arbeid', 'Repetitive oppgaver og påminnelser automatiseres.'],
                  ['24/7', 'full oversikt', 'Eiere og leietakere ser status når som helst.'],
                  ['1 system', 'for hele porteføljen', 'Alle enheter, leieforhold og saker — på ett sted.'],
                ].map(([v, l, b]) => (
                  <div key={l} className="border-t border-white/[0.14] pt-4">
                    <p className="text-[26px] font-bold leading-none !text-white sm:text-[30px]" style={heading}>{v}</p>
                    <p className="mt-1 text-[13px] font-semibold text-[#C9A6F0]">{l}</p>
                    <p className="mt-2 text-[12.5px] leading-[1.6] text-white/50">{b}</p>
                  </div>
                ))}
              </div>
            </div>
            <p className="relative mt-14 border-t border-white/[0.1] pt-6 text-[13px] text-white/45">
              Vi er selv forvaltere — DigiHome Forvaltning driver hele sin portefølje i Bergen på dette systemet. Hver dag.
            </p>
          </div>
        </section>

        {/* ── Hvordan vil du bruke DigiHome? ── */}
        <section className="mx-auto w-full max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
          <h2 className="e-display mx-auto max-w-[20ch] text-center text-[28px] sm:text-[38px]">Hvordan vil du bruke DigiHome?</h2>
          <div className="mx-auto mt-10 grid max-w-[1060px] gap-4 sm:grid-cols-3 sm:gap-6 sm:mt-14">
            {[
              { ikon: Home, href: '/forvaltning', t: 'Full forvaltning', b: 'Vi gjør jobben for deg — visning, kontrakt, innkreving og oppfølging. Bergen og omegn.' },
              { ikon: User, href: '/selvforvaltning', t: 'Selvbetjent', b: 'Du bruker DigiHome selv — annonse, BankID-kontrakt og betalingsoversikt. Hele Norge.' },
              { ikon: Building2, href: '/bedrift', t: 'DigiHome Pro', b: 'For profesjonelle porteføljer fra 5 til 1000+ enheter. Kraftig, skalerbart, effektivt.' },
            ].map((k) => (
              <Link key={k.href} href={k.href} data-testid={`forside-vei-${k.t.toLowerCase().replace(/\s/g, '-')}`}
                className="group rounded-[18px] bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_1px_3px_rgba(23,18,12,0.04)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_44px_-20px_rgba(23,18,12,0.22)] sm:p-7">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#F4EEFB] text-[#7c3aed]">
                  <k.ikon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>
                <p className="mt-4 text-[16.5px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{k.t}</p>
                <p className="mt-2 text-[13px] leading-[1.6] text-[#6F6A60]">{k.b}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed]">
                  Les mer <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Slutt-CTA ── */}
        <section className="border-t border-[#E6E1D9]">
          <div className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-6 px-6 py-12 sm:px-10 sm:py-16">
            <div>
              <h2 className="e-display text-[24px] sm:text-[30px]">Klar for å gjøre utleie enklere?</h2>
              <p className="mt-2 text-[14px] text-[#8d877d]">Kom i gang på minuttet — eller book en prat med oss.</p>
            </div>
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('bunn')} data-testid="forside-bunn-cta" className="e-btn e-btn-dark group !bg-[#7c3aed] hover:!bg-[#6d28d9]">
              Kom i gang
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
