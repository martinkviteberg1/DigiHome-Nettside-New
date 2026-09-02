'use client';

import React, { useRef } from 'react';
import {
  LayoutDashboard, Building2, Users, MessageSquare, FileText, DollarSign, Settings,
  ArrowRight, TrendingUp, Wrench, CheckCircle2,
  ChevronRight, Check, Bell, HelpCircle, ChevronDown,
} from 'lucide-react';
import { heading, EASE, useKoreografi, useSynlig, useMedia, Bytt, Stakk, tall } from './motion';

/* ---------------------------------------------------------------------------
   HeroPortal — eierportalen i én ferdig, stille tilstand.
   Rammeløst: ingen nettleser-chrome, ingen trafikklys. Appen bærer seg selv
   (sidemeny + innhold). Kuratert: færre elementer, større skala, én historie:
   sak venter → håndtert → alt i orden → husleie mottatt → ny melding.
--------------------------------------------------------------------------- */

const NAV = [
  [LayoutDashboard, 'Oversikt', true],
  [Building2, 'Boligen min', false],
  [Users, 'Leietakere', false],
  [MessageSquare, 'Meldinger', false],
  [FileText, 'Dokumenter', false],
  [DollarSign, 'Økonomi', false],
  [Settings, 'Innstillinger', false],
];

/* Alltid komplett: hver fase er et ferdig bilde. */
const TRINN = [
  { navn: 'sak', ms: 4200 },
  { navn: 'booket', ms: 3600 },
  { navn: 'orden', ms: 2800 },
  { navn: 'betalt', ms: 4000 },
  { navn: 'melding', ms: 4000 },
  { navn: 'slutt', ms: 3000 },
];

function Toast({ vis, Ikon, farge, bg, t, s }) {
  return (
    <div
      className="pointer-events-none absolute right-6 top-6 z-20 flex w-[300px] items-center gap-3 rounded-[12px] bg-white p-3.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.22),0_0_0_1px_rgba(0,0,0,0.06)] sm:right-8 sm:top-8"
      style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(-10px) scale(0.98)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}` }}
      aria-hidden={!vis}
    >
      <span className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-[11px]" style={{ background: bg }}><Ikon className="h-[17px] w-[17px]" style={{ color: farge }} strokeWidth={2} /></span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-bold text-[#111827]" style={heading}>{t}</span>
        <span className="block truncate text-[11.5px] text-[#6B7280]">{s}</span>
      </span>
    </div>
  );
}

function Flis({ className = '', children }) {
  return (
    <div className={`relative overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white p-5 ${className}`}>
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

const Under = ({ children }) => <p className="text-[11.5px] font-medium text-[#6B7280]">{children}</p>;

function Inntekt() {
  return (
    <Flis>
      <Under>Månedlig leieinntekt</Under>
      <p className="mt-2 text-[42px] font-bold leading-[0.95] tracking-[-0.035em] text-[#111827]" style={heading}>{tall(18500)} <span className="text-[16px] font-normal text-[#9CA3AF]">kr</span></p>
      <div className="mt-3"><span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F2EE] py-1 pl-2 pr-2.5 text-[11.5px] text-[#52504B]"><TrendingUp className="h-3.5 w-3.5 text-[#6D4FB0]" strokeWidth={2} /> {tall(222000)} kr estimert i år</span></div>
      {/* 12 måneder: betalt = fylt, kommende = kontur */}
      <div className="mt-4 flex h-[26px] items-end gap-[5px]">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="flex-1 rounded-[2px]" style={{ height: '100%', background: i < 3 ? '#111827' : 'transparent', boxShadow: i < 3 ? 'none' : 'inset 0 0 0 1px #DDD8CF' }} />
        ))}
      </div>
      <div className="mt-auto pt-4"><span className="inline-flex h-9 items-center gap-2 rounded-[9px] bg-[#111827] px-3.5 text-[12.5px] font-semibold text-white">Se full økonomi <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} /></span></div>
    </Flis>
  );
}

/* Boligkortet — hjemmet er hovedpersonen, ikke dashbordet. */
function Bolig({ betalt }) {
  return (
    <div className="relative hidden overflow-hidden rounded-[14px] border border-[#E5E7EB] bg-white sm:flex sm:flex-col">
      <div className="relative h-[96px] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/v3/hjem-kjokken.webp" alt="" className="h-full w-full object-cover" style={{ objectPosition: '50% 55%' }} />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-[#15803d] backdrop-blur-sm"><span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" /> Utleid</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold text-[#111827]" style={heading}>Marken 8</p>
            <p className="mt-0.5 truncate text-[11.5px] text-[#6B7280]">5017 Bergen · 3-roms · 74 m² · 2. etg.</p>
          </div>
          <p className="shrink-0 text-[14.5px] font-bold text-[#111827]" style={heading}>{tall(18500)} <span className="text-[11px] font-normal text-[#9CA3AF]">kr/mnd</span></p>
        </div>
        <div className="mt-auto flex items-center gap-2.5 border-t border-[#F3F4F6] pt-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1EAFB] text-[11px] font-bold text-[#6D4FB0]" style={heading}>JB</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12.5px] font-semibold text-[#111827]">Jonas Berg</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
              <Bytt vis={betalt} a="Leietaker siden januar 2025 · løpende" b="Mars betalt · 1. mars · KID" />
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[#9CA3AF]" strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}

/* Oppmerksomhetsrad — tone og innhold etter tilstand */
function Rad({ tone, Ikon, etikett, t, s, knapper }) {
  const c = {
    warning: { bg: '#fffbeb', ic: '#b45309', icbg: '#f59e0b1a', bd: '#f59e0b33' },
    calm: { bg: '#f0fdf4', ic: '#15803d', icbg: '#15803d14', bd: '#15803d26' },
    ink: { bg: '#ffffff', ic: '#6D4FB0', icbg: '#6D4FB014', bd: '#E5E7EB' },
  }[tone];
  return (
    <div className="flex items-center gap-4 rounded-[14px] border p-4" style={{ background: c.bg, borderColor: c.bd }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: c.icbg }}><Ikon className="h-5 w-5" style={{ color: c.ic }} strokeWidth={1.7} /></span>
      <span className="min-w-0 flex-1">
        {etikett && <span className="block text-[11px] font-semibold" style={{ color: c.ic }}>{etikett}</span>}
        <span className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold text-[#111827]">{t}</span>
        <span className="block truncate text-[12px] text-[#6B7280]">{s}</span>
      </span>
      {knapper ? (
        <span className="hidden shrink-0 gap-2 sm:flex">
          <span className="inline-flex h-9 items-center rounded-[10px] border border-[#e5e2dd] px-4 text-[13px] font-medium text-[#6B7280]">Avslå</span>
          <span className="inline-flex h-9 items-center rounded-[10px] bg-[#111827] px-5 text-[13px] font-semibold text-white">Godkjenn</span>
        </span>
      ) : <ChevronRight className="h-5 w-5 shrink-0 text-[#9CA3AF]" strokeWidth={1.8} />}
    </div>
  );
}

export default function HeroPortal() {
  const rot = useRef(null);
  const synlig = useSynlig(rot, 0.2);
  const { er, navn } = useKoreografi(TRINN, synlig);
  const desktop = useMedia('(min-width: 1024px)');
  const harSak = er('sak') && !er('orden');
  const idx = er('orden') ? 2 : er('booket') ? 1 : 0;

  return (
    <div ref={rot} className="relative" data-testid="v3-hero-portal">
      {/* Rammen må lese på både mørk (topp) og lys (bunn) bakgrunn — nøytral gråfiolett hårlinje. */}
      <div className="relative isolate overflow-hidden rounded-[16px] bg-[#F7F5F1] shadow-[0_0_0_1px_rgba(120,110,135,0.38),0_60px_140px_-50px_rgba(15,10,25,0.55)]">
        {/* Hårfin topp-highlight — gir kanten dybde mot det mørke */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-30 h-px bg-white/[0.14]" />
        <div className="relative flex items-stretch" style={{ zoom: desktop ? 0.94 : 0.9 }} aria-hidden="true">
          {/* Sidemeny — tonet til sidens svarte, så vinduet vokser ut av canvasen */}
          <aside className="hidden w-[224px] shrink-0 flex-col border-r border-white/[0.08] bg-[#121016] px-4 pb-5 pt-6 lg:flex">
            <div className="flex items-center justify-between px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digihome-logo-white.svg" alt="" className="h-[18px] w-auto" />
              <span className="h-[6px] w-[6px] rounded-full bg-[#D496FF]" />
            </div>
            <nav className="mt-9 space-y-[3px]">
              {NAV.map(([Ikon, l, aktiv]) => {
                const badge = l === 'Meldinger' && er('melding');
                return (
                  <div key={l} className={`flex h-[40px] items-center gap-3 rounded-[10px] px-3 text-[13.5px] font-medium transition-colors duration-500 ${aktiv ? 'bg-white/[0.08] text-white' : 'text-white/45'}`}>
                    <Ikon className="h-[17px] w-[17px]" strokeWidth={aktiv ? 2 : 1.7} />
                    <span className="flex-1">{l}</span>
                    <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#D496FF] px-1.5 text-[10.5px] font-bold text-[#0D0B0F]" style={{ opacity: badge ? 1 : 0, transform: badge ? 'none' : 'scale(0.6)', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>1</span>
                  </div>
                );
              })}
            </nav>
            <div className="mt-auto">
              <div className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.08] pl-3 pr-3.5 text-[12px] font-medium text-white/60">
                <HelpCircle className="h-[15px] w-[15px]" strokeWidth={2} /> Hjelp
              </div>
              <div className="flex items-center gap-3 border-t border-white/[0.08] pt-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D496FF]/20 text-[12px] font-bold text-[#E7D6FF]" style={heading}>KN</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-white">Kari Nordvik</span>
                  <span className="block truncate text-[11px] text-white/40">Huseier</span>
                </span>
                <ChevronDown className="h-4 w-4 text-white/40" />
              </div>
            </div>
          </aside>

          {/* Innhold — kuratert oversikt */}
          <div className="relative min-w-0 flex-1 px-6 pb-9 pt-7 sm:px-9 sm:pt-8 lg:px-11 lg:pt-9">
            <Toast vis={navn === 'betalt'} Ikon={Check} farge="#15803d" bg="#effaf0" t={`Husleie mottatt · ${tall(18500)} kr`} s="Fra Jonas Berg · i dag 08:02 · KID" />
            <Toast vis={navn === 'melding'} Ikon={Bell} farge="#6D4FB0" bg="#F1EAFB" t="Ny melding fra Jonas" s="«Takk for rask hjelp med varmtvannet!»" />

            <div className="flex items-center gap-4">
              <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#111827] text-[17px] font-bold text-white ring-2 ring-[#E5E7EB]" style={heading}>KN</span>
              <div>
                <p className="text-[12.5px] text-[#6B7280]">God morgen</p>
                <p className="text-[34px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] sm:text-[38px]" style={heading}>Kari <span className="inline-block">👋</span></p>
              </div>
            </div>
            <p className="mt-3 text-[14px] text-[#6B7280] sm:ml-[68px] sm:-mt-0.5">
              1 bolig · 1 leietaker · <Bytt vis={harSak} a="Alt i orden" b={<span className="text-[#b45309]">1 sak venter</span>} />
            </p>

            <div className="mt-7 grid grid-cols-1 gap-4 sm:grid-cols-2"><Inntekt /><Bolig betalt={er('betalt')} /></div>

            <div className="mt-8 flex items-center gap-2.5">
              <p className="text-[18px] font-bold tracking-[-0.025em] text-[#111827]" style={heading}>Trenger din oppmerksomhet</p>
              <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6D4FB0] px-1.5 text-[11px] font-bold text-white" style={{ opacity: harSak ? 1 : 0, transform: harSak ? 'none' : 'scale(0.6)', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>1</span>
            </div>
            <Stakk idx={idx} className="mt-4">
              <Rad tone="warning" Ikon={Wrench} etikett="Godkjenning kreves" t={`Rørlegger AS — ${tall(3450)} kr`} s="Varmtvannsbereder lekker · foreslått av DigiHome" knapper />
              <Rad tone="calm" Ikon={CheckCircle2} etikett="Godkjent · håndteres" t="Rørlegger AS booket — torsdag kl. 09:00" s="Leietaker er varslet. Du trenger ikke gjøre noe mer." />
              <Rad tone="ink" Ikon={CheckCircle2} t="Alt i orden" s="Ingenting krever handling akkurat nå." />
            </Stakk>
          </div>
        </div>
      </div>
    </div>
  );
}
