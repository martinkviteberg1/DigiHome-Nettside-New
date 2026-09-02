'use client';

import React, { useRef } from 'react';
import {
  LayoutDashboard, Building2, Users, MessageSquare, FileText, DollarSign, Settings,
  ArrowRight, TrendingUp, FileSignature, Wallet, Wrench, CheckCircle2, Sparkles,
  ChevronRight, MapPin, ArrowUpRight, Check, Bell, HelpCircle, ChevronDown, ShieldCheck,
  Briefcase, ClipboardList, Phone, Mail, Inbox, CalendarDays, Clock, TrendingUp as Salg,
  BookOpen, Landmark, LayoutGrid,
} from 'lucide-react';
import { FlateOversikt } from '@/components/forside/HeroVindu';
import { heading, EASE, useKoreografi, useSynlig, useMedia, Bytt, Stakk } from './motion';

/* ---------------------------------------------------------------------------
   HeroPortal — produktet slik det faktisk er, i tre grader av autopilot.
   · Selvbetjent   → eierportalen (OwnerDashboard B1, isSelfService)
   · Forvaltning   → samme eier, «Forvaltet av DigiHome»: Din forvalter-flis,
                     saker «følges opp av forvalter»  (managed)
   · Portefølje    → forvalterens dashbord (AdminDashboard) m/ forvalter-sidemeny
   Fasit: portal/OwnerDashboard.tsx + OwnerLayout.tsx i produktrepoet.
   Levende: sak → håndtert → alt i orden → husleie mottatt → ny melding.
   Kun opacity/transform. Looper rolig når vinduet er synlig.
--------------------------------------------------------------------------- */

const INK_HERO = 'linear-gradient(150deg,#2E2547 0%,#1A1612 58%,#171310 100%)';

const NAV_EIER = [
  [LayoutDashboard, 'Oversikt', true],
  [Building2, 'Boligen min', false],
  [Users, 'Leietakere', false],
  [MessageSquare, 'Meldinger', false],
  [FileText, 'Dokumenter', false],
  [DollarSign, 'Økonomi', false],
  [Settings, 'Innstillinger', false],
];

const NAV_FORVALTER = [
  [LayoutGrid, 'Oversikt', true],
  [Inbox, 'Innboks', false],
  [CalendarDays, 'Kalender', false],
  [Clock, 'Operasjonssentral', false],
  [Building2, 'Eiendommer', false],
  [Salg, 'Salg', false],
  [ClipboardList, 'Saker', false],
  [BookOpen, 'Driftshåndbok', false],
  [FileText, 'Kontrakter', false],
  [Wallet, 'Økonomi', false],
  [Wrench, 'Leverandører', false],
  [Users, 'Brukere', false],
];

const TRINN = [
  { navn: 'start', ms: 1600 },
  { navn: 'sak', ms: 3400 },
  { navn: 'booket', ms: 3000 },
  { navn: 'orden', ms: 2400 },
  { navn: 'betalt', ms: 3600 },
  { navn: 'melding', ms: 3600 },
  { navn: 'slutt', ms: 2400 },
];

function Ring({ pct = 100, size = 40, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#ECE8E0" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="#15803d" strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
  );
}

function Hurtig({ Ikon, l }) {
  return (
    <span className="inline-flex h-[44px] shrink-0 items-center gap-2.5 rounded-full border border-[#E5E7EB] bg-white pl-2.5 pr-5">
      <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#F1EAFB]"><Ikon className="h-[15px] w-[15px] text-[#6D4FB0]" strokeWidth={1.7} /></span>
      <span className="whitespace-nowrap text-[13px] font-semibold text-[#111827]">{l}</span>
    </span>
  );
}

function Toast({ vis, Ikon, farge, bg, t, s }) {
  return (
    <div
      className="pointer-events-none absolute right-5 top-5 z-20 flex w-[300px] items-center gap-3 rounded-[16px] bg-white p-3.5 shadow-[0_18px_48px_-18px_rgba(23,18,12,0.28),0_0_0_1px_rgba(0,0,0,0.06)] sm:right-8 sm:top-7"
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

/* Mørk flis (INK_HERO) — delt av inntekt, leietaker og forvalter */
function Flis({ className = '', children }) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] p-6 sm:p-7 ${className}`} style={{ background: INK_HERO }}>
      <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle,#CF97FC33,transparent 70%)' }} />
      <div className="absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg,transparent,#CF97FC55,transparent)' }} />
      <div className="relative flex h-full flex-col">{children}</div>
    </div>
  );
}

function Inntekt() {
  return (
    <Flis>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Månedlig leieinntekt</p>
      <p className="mt-3 text-[44px] font-bold leading-[0.9] tracking-[-0.04em] text-white tabular-nums sm:text-[54px]" style={heading}>18 500 <span className="text-[20px] font-normal text-white/45">kr</span></p>
      <div className="mt-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] py-1 pl-2 pr-3 text-[12px] text-white/70"><TrendingUp className="h-3.5 w-3.5 text-[#CBA6F7]" strokeWidth={2} /> 222 000 kr estimert i år</span></div>
      <div className="mt-auto pt-6"><span className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-semibold text-[#111827]">Se full økonomi <ArrowRight className="h-4 w-4" strokeWidth={2} /></span></div>
    </Flis>
  );
}

function Leietaker({ betalt, managed }) {
  return (
    <Flis className="hidden sm:block">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Din leietaker</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CF97FC]/[0.18] text-[14px] font-bold text-[#E7D6FF]" style={heading}>JB</span>
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-bold text-white" style={heading}>Jonas Berg</span>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-[#CBA6F7]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            <Bytt vis={betalt} a="Aktiv leieavtale" b="Mars betalt · 1. mars" />
          </span>
        </span>
      </div>
      <div className="mt-4 flex gap-6 border-t border-white/10 pt-4">
        <div><p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/40">Utleid siden</p><p className="mt-1 text-[13px] font-semibold text-white">Januar 2025</p></div>
        <div><p className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/40">Leieperiode</p><p className="mt-1 text-[13px] font-semibold text-white">Løpende</p></div>
      </div>
      <div className="mt-auto flex gap-2 pt-5">
        {!managed && <span className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full bg-white text-[12px] font-semibold text-[#111827]"><MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} /> Send melding</span>}
        <span className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold ${managed ? 'bg-white text-[#111827]' : 'bg-white/[0.08] text-white ring-1 ring-white/15'}`}><FileSignature className="h-3.5 w-3.5" strokeWidth={1.8} /> Se kontrakt</span>
      </div>
    </Flis>
  );
}

function Forvalter() {
  return (
    <Flis className="hidden lg:block">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/50">Din forvalter</p>
      <div className="mt-4 flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#CF97FC]/[0.18] text-[14px] font-bold text-[#E7D6FF] ring-2 ring-white/10" style={heading}>IH</span>
        <span className="min-w-0">
          <span className="block truncate text-[17px] font-bold text-white" style={heading}>Ingrid Haugen</span>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-[11.5px] text-[#CBA6F7]"><ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} /> Din forvalter</span>
        </span>
      </div>
      <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
        <p className="flex items-center gap-2 text-[12px] text-white/70"><Phone className="h-3.5 w-3.5 text-[#CBA6F7]" strokeWidth={1.9} /> 55 00 00 00</p>
        <p className="flex items-center gap-2 text-[12px] text-white/70"><Mail className="h-3.5 w-3.5 text-[#CBA6F7]" strokeWidth={1.9} /> ingrid@digihome.no</p>
      </div>
      <div className="mt-auto pt-5"><span className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-white/[0.08] text-[12px] font-semibold text-white ring-1 ring-white/15"><MessageSquare className="h-3.5 w-3.5" strokeWidth={1.8} /> Send melding</span></div>
    </Flis>
  );
}

/* Oppmerksomhetsrad — tone og innhold etter modus */
function Rad({ tone, Ikon, eyebrow, t, s, knapper }) {
  const c = {
    warning: { bg: '#fffbeb', ic: '#b45309', icbg: '#f59e0b1a', bd: '#f59e0b33' },
    calm: { bg: '#f0fdf4', ic: '#15803d', icbg: '#15803d14', bd: '#15803d26' },
    ink: { bg: '#ffffff', ic: '#6D4FB0', icbg: '#6D4FB014', bd: '#E5E7EB' },
  }[tone];
  return (
    <div className="flex items-center gap-4 rounded-[18px] border p-4" style={{ background: c.bg, borderColor: c.bd }}>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: c.icbg }}><Ikon className="h-5 w-5" style={{ color: c.ic }} strokeWidth={1.7} /></span>
      <span className="min-w-0 flex-1">
        {eyebrow && <span className="block text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: c.ic }}>{eyebrow}</span>}
        <span className="flex items-center gap-1.5 truncate text-[14.5px] font-semibold text-[#111827]">{t}</span>
        <span className="block truncate text-[12px] text-[#6B7280]">{s}</span>
      </span>
      {knapper ? (
        <span className="hidden shrink-0 gap-2 sm:flex">
          <span className="inline-flex h-9 items-center rounded-[12px] border border-[#e5e2dd] px-4 text-[13px] font-medium text-[#6B7280]">Avslå</span>
          <span className="inline-flex h-9 items-center rounded-[12px] bg-[#111827] px-5 text-[13px] font-semibold text-white">Godkjenn</span>
        </span>
      ) : <ChevronRight className="h-5 w-5 shrink-0 text-[#9CA3AF]" strokeWidth={1.8} />}
    </div>
  );
}

/* ── Eierportalen (Selvbetjent / Forvaltning) ── */
function Eierportal({ managed, er, navn }) {
  const harSak = er('sak') && !er('orden');
  const idx = er('orden') ? 2 : er('booket') ? 1 : er('sak') ? 0 : 2;
  return (
    <div className="relative">
      <Toast vis={navn === 'betalt'} Ikon={Check} farge="#15803d" bg="#effaf0" t="Husleie mottatt · 18 500 kr" s="Fra Jonas Berg · i dag 08:02 · KID" />
      <Toast vis={navn === 'melding'} Ikon={Bell} farge="#6D4FB0" bg="#F1EAFB" t="Ny melding fra Jonas" s="«Takk for rask hjelp med varmtvannet!»" />

      {/* Hilsen */}
      <div className="flex items-center gap-4">
        <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#111827] text-[17px] font-bold text-white ring-2 ring-[#E5E7EB]" style={heading}>KN</span>
        <div>
          <p className="text-[12.5px] text-[#6B7280]">God morgen</p>
          <p className="text-[34px] font-bold leading-[0.95] tracking-[-0.04em] text-[#111827] sm:text-[38px]" style={heading}>Kari <span className="inline-block">👋</span></p>
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5 sm:ml-[68px] sm:-mt-0.5">
        <p className="text-[14px] text-[#6B7280]">
          Marken 8 er utleid · 18 500 kr/mnd · <Bytt vis={harSak} a="Alt i orden" b={managed ? <span>forvalter følger opp 1 sak</span> : <span className="text-[#b45309]">1 sak venter</span>} />
        </p>
        <Stakk idx={managed ? 1 : 0}>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EAFB] px-2.5 py-[3px] text-[11px] font-semibold text-[#6D4FB0]"><Briefcase className="h-3 w-3" strokeWidth={2} /> Selvforvaltning</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#effaf0] px-2.5 py-[3px] text-[11px] font-semibold text-[#157347]"><ShieldCheck className="h-3 w-3" strokeWidth={2} /> Forvaltet av DigiHome</span>
        </Stakk>
      </div>

      {/* SingleHero */}
      <Stakk idx={managed ? 1 : 0} className="mt-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr]"><Inntekt /><Leietaker betalt={er('betalt')} managed={false} /></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr] lg:grid-cols-[1.35fr_1fr_1fr]"><Inntekt /><Leietaker betalt={er('betalt')} managed /><Forvalter /></div>
      </Stakk>

      {/* Hurtigvalg */}
      <Stakk idx={managed ? 1 : 0} className="mt-4">
        <div className="flex gap-2.5 overflow-hidden">{[[MessageSquare, 'Send melding'], [FileSignature, 'Se kontrakt'], [Wallet, 'Aktiver depositum'], [Wrench, 'Meld en sak'], [DollarSign, 'Se økonomi']].map(([I, l]) => <Hurtig key={l} Ikon={I} l={l} />)}</div>
        <div className="flex gap-2.5 overflow-hidden">{[[MessageSquare, 'Send melding'], [FileSignature, 'Se kontrakt'], [DollarSign, 'Se avregning'], [Wrench, 'Meld en sak'], [ClipboardList, 'Dokumenter']].map(([I, l]) => <Hurtig key={l} Ikon={I} l={l} />)}</div>
      </Stakk>

      {/* Trenger din oppmerksomhet */}
      <div className="mt-8 flex items-center gap-2.5">
        <p className="text-[20px] font-bold tracking-[-0.025em] text-[#111827]" style={heading}>Trenger din oppmerksomhet</p>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#6D4FB0] px-1.5 text-[11px] font-bold text-white tabular-nums" style={{ opacity: harSak && !managed ? 1 : 0, transform: harSak && !managed ? 'none' : 'scale(0.6)', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>1</span>
      </div>
      <Stakk idx={idx} className="mt-4">
        {managed
          ? <Rad tone="calm" Ikon={ShieldCheck} eyebrow="Følges opp av forvalter" t="Forvalteren følger opp 1 sak for deg" s="Varmtvannsbereder lekker · du trenger ikke gjøre noe — vi holder deg oppdatert." />
          : <Rad tone="warning" Ikon={Wrench} eyebrow="Godkjenning kreves" t="Rørlegger AS — 3 450 kr" s="Varmtvannsbereder lekker · foreslått av DigiHome" knapper />}
        <Rad tone="calm" Ikon={CheckCircle2} eyebrow={managed ? 'Håndtert av forvalter' : 'Godkjent · håndteres'} t="Rørlegger AS booket — torsdag kl. 09:00" s="Leietaker er varslet. Du trenger ikke gjøre noe mer." />
        <Rad tone="ink" Ikon={CheckCircle2} t={<>Alt er i skjønneste orden <Sparkles className="h-4 w-4 text-[#6D4FB0]" /></>} s="Ingenting krever handling akkurat nå." />
      </Stakk>

      {/* Din bolig — kuttes av bunnkanten */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-[20px] font-bold tracking-[-0.025em] text-[#111827]" style={heading}>Din bolig</p>
        <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#6D4FB0]">Se detaljer <ArrowUpRight className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-4 flex overflow-hidden rounded-[20px] border border-[#E5E7EB] bg-white">
        <div className="relative h-[150px] w-[240px] shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/interior-kitchen.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10.5px] font-semibold backdrop-blur-md" style={{ color: '#157347', background: '#effaf0e6' }}>Utleid</span>
        </div>
        <div className="flex flex-1 flex-col justify-center p-6">
          <p className="flex items-center gap-1.5 text-[12px] text-[#6B7280]"><MapPin className="h-3.5 w-3.5 text-[#9CA3AF]" strokeWidth={1.6} /> Bergen</p>
          <p className="text-[21px] font-bold tracking-[-0.02em] text-[#111827]" style={heading}>Marken 8</p>
          <p className="text-[13px] text-[#6B7280]">Marken 8, 5017 Bergen · 3-roms · 74 m²</p>
          <div className="mt-4 flex items-center gap-6">
            <span className="flex items-center gap-2.5"><Ring pct={100} /><span><span className="block text-[13px] font-semibold text-[#111827]">1 av 1 enhet</span><span className="block text-[11px] text-[#9CA3AF]">utleid</span></span></span>
            <span className="border-l border-[#F3F4F6] pl-6"><span className="block text-[21px] font-bold tracking-[-0.02em] text-[#111827] tabular-nums" style={heading}>18 500</span><span className="block text-[11px] text-[#6B7280]">kr/mnd</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sidemeny — eier eller forvalter ── */
function Sidemeny({ portefolje, meldinger }) {
  const nav = portefolje ? NAV_FORVALTER : NAV_EIER;
  return (
    <aside className="hidden w-[228px] shrink-0 flex-col border-r border-[#2A2233] bg-[#1B1423] px-4 pb-5 pt-6 lg:flex">
      <div className="flex items-center justify-between px-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-logo-white.svg" alt="" className="h-[18px] w-auto" />
        <span className="h-[6px] w-[6px] rounded-full bg-[#8146C4]" />
      </div>
      <Stakk idx={portefolje ? 1 : 0} className="mt-8">
        {[NAV_EIER, NAV_FORVALTER].map((liste, li) => (
          <nav key={li} className={li === 1 ? 'space-y-[1px]' : 'space-y-[3px]'}>
            {liste.map(([Ikon, l, aktiv]) => {
              const badge = l === 'Meldinger' && meldinger && !portefolje;
              const kompakt = li === 1;
              return (
                <div key={l} className={`flex items-center gap-3 rounded-[12px] px-3 font-medium transition-colors duration-500 ${kompakt ? 'h-[33px] text-[12.5px]' : 'h-[40px] text-[13.5px]'} ${aktiv ? 'bg-white/[0.08] text-[#F3F1F7]' : 'text-[#9A94A8]'}`}>
                  <Ikon className={kompakt ? 'h-[15px] w-[15px]' : 'h-[17px] w-[17px]'} strokeWidth={aktiv ? 2 : 1.7} />
                  <span className="flex-1 truncate">{l}</span>
                  {!kompakt && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#8146C4] px-1.5 text-[10.5px] font-bold text-white" style={{ opacity: badge ? 1 : 0, transform: badge ? 'none' : 'scale(0.6)', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>1</span>}
                </div>
              );
            })}
          </nav>
        ))}
      </Stakk>
      <div className="mt-auto">
        {!portefolje && (
          <div className="mb-4 inline-flex h-9 items-center gap-2 rounded-full border border-[#2A2733] bg-[#1B1822] pl-3 pr-3.5 text-[12px] font-medium text-[#C9A6F5]">
            <HelpCircle className="h-[15px] w-[15px]" strokeWidth={2} /> Hjelp
          </div>
        )}
        {portefolje && (
          <div className="mb-3 space-y-[1px] border-t border-[#2A2233] pt-3">
            {[[Landmark, 'Organisasjon'], [ShieldCheck, 'Superadmin']].map(([I, l]) => (
              <div key={l} className="flex h-[30px] items-center gap-3 rounded-[10px] px-3 text-[12px] font-medium text-[#7C7686]"><I className="h-[14px] w-[14px]" strokeWidth={1.7} /> {l}</div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 border-t border-[#2A2233] pt-4">
          <Stakk idx={portefolje ? 1 : 0}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#D297FF]/20 text-[12px] font-bold text-[#E7D6FF]" style={heading}>KN</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://randomuser.me/api/portraits/men/85.jpg" alt="" loading="lazy" className="h-9 w-9 rounded-full object-cover" />
          </Stakk>
          <span className="min-w-0 flex-1">
            <Stakk idx={portefolje ? 1 : 0}>
              <span><span className="block truncate text-[13px] font-semibold text-[#F3F1F7]">Kari Nordvik</span><span className="block truncate text-[11px] text-[#7C7686]">Huseier</span></span>
              <span><span className="block truncate text-[13px] font-semibold text-[#F3F1F7]">Martin Kviteberg</span><span className="block truncate text-[11px] text-[#7C7686]">Forvalter</span></span>
            </Stakk>
          </span>
          <ChevronDown className="h-4 w-4 text-[#7C7686]" />
        </div>
      </div>
    </aside>
  );
}

export default function HeroPortal({ nivaa = 0 }) {
  const rot = useRef(null);
  const synlig = useSynlig(rot, 0.2);
  const { er, navn } = useKoreografi(TRINN, synlig);
  const managed = nivaa === 1;
  const portefolje = nivaa === 2;
  const desktop = useMedia('(min-width: 1024px)');

  return (
    <div ref={rot} className="relative" data-testid="v3-hero-portal" data-nivaa={nivaa}>
      <div className="relative isolate h-[600px] overflow-hidden rounded-[22px] bg-[#F7F5F1] shadow-[0_70px_140px_-56px_rgba(84,50,160,0.28),0_24px_56px_-32px_rgba(23,18,12,0.16),0_0_0_1px_rgba(0,0,0,0.06)] sm:h-[640px] sm:rounded-[28px] lg:h-[700px]" aria-hidden="true">
        <div className="flex h-full items-stretch">
          <Sidemeny portefolje={portefolje} meldinger={er('melding')} />

          {/* Innhold */}
          <div className="relative min-w-0 flex-1">
            {/* Myk avslutning mot bunnen — innholdet «titter» ut under kanten, sidemenyen står */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[120px]" style={{ background: 'linear-gradient(180deg, rgba(247,245,241,0) 0%, rgba(247,245,241,0.92) 72%, #F7F5F1 100%)' }} />

            {/* Eierportal (selv / forvaltning) */}
            <div className="absolute inset-0 px-5 pt-6 sm:px-9 sm:pt-8 lg:px-11 lg:pt-9" style={{ opacity: portefolje ? 0 : 1, transform: portefolje ? 'translateY(10px)' : 'none', transition: `opacity 560ms ${EASE}, transform 560ms ${EASE}` }}>
              <Eierportal managed={managed} er={er} navn={navn} />
            </div>

            {/* Porteføljedashbord (forvalter) — appens ekte dashbord, skalert opp til lesbar størrelse */}
            <div className="absolute inset-0 bg-[#FAFAF8]" style={{ opacity: portefolje ? 1 : 0, transform: portefolje ? 'none' : 'translateY(10px)', transition: `opacity 560ms ${EASE}, transform 560ms ${EASE}` }}>
              <div style={{ zoom: desktop ? 1.28 : 0.92 }}><FlateOversikt /></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
