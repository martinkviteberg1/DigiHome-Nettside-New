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
import VinduRamme from '@/components/forside/HeroVindu';
import StegDemo from '@/components/forside/StegDemo';

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
        {/* ── Hero: løftet + flytende produktvindu ── */}
        <section className="relative overflow-x-clip">
          {/* Lavendel-atmosfære i DigiHome-lilla — subtil så teksten forblir skarp */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(124,58,237,0) 0%, rgba(124,58,237,0.055) 34%, rgba(155,91,214,0.075) 62%, rgba(124,58,237,0) 100%)' }} />
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-8 h-[520px] w-[640px] rounded-full bg-[#9B5BD6]/[0.09] blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-44 bottom-[-80px] h-[440px] w-[560px] rounded-full bg-[#7c3aed]/[0.06] blur-3xl" />
          <div className="relative mx-auto grid w-full max-w-[1320px] items-center gap-14 px-6 pb-28 pt-10 sm:px-10 sm:pt-16 lg:grid-cols-[0.58fr_1.42fr] lg:gap-12 lg:pb-36 xl:gap-14">
            <div>
              <p className="e-label dh-cover-inn !text-[#7c3aed]">Ny generasjon utleie</p>
              <h1 className="e-display dh-cover-inn mt-4 text-[46px] sm:text-[58px] lg:text-[60px] xl:text-[70px]" style={{ animationDelay: '.06s' }}>
                Utleie på<br />autopilot<span className="text-[#9B5BD6]">.</span>
              </h1>
              <p className="dh-cover-inn mt-6 max-w-[34ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[17px]" style={{ animationDelay: '.14s' }}>
                DigiHome samler hele utleieprosessen — fra annonse til betaling
                og oppfølging.
              </p>
              <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '.2s' }}>
                <Link href="/bli-utleier/start" prefetch onClick={() => klikk('hero')} data-testid="forside-hero-cta"
                  className="e-btn e-btn-dark group !bg-[#7c3aed] shadow-[0_16px_34px_-12px_rgba(124,58,237,0.55)] hover:!bg-[#6d28d9]">
                  Kom i gang
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/tour" prefetch className="e-btn e-btn-ghost !bg-white" data-testid="forside-hero-tour">
                  <Play className="h-3.5 w-3.5 fill-current" /> Se systemet
                </Link>
              </div>
              <ul className="dh-cover-inn mt-9 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] font-medium text-[#a49e93]" style={{ animationDelay: '.26s' }}>
                {['BankID', 'FINN', 'Husleie', 'Saker', 'AI'].map((t, i) => (
                  <li key={t} className="flex items-center gap-3">
                    {i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-[#D6CFC4]" />}
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            {/* Produktkomposisjonen: flytende vindu + telefon, lett tilt */}
            <div className="dh-cover-inn relative pb-14 lg:pb-16" style={{ animationDelay: '.24s' }}>
              <div className="md:pr-14 lg:pr-16" style={{ transform: 'rotate(1.1deg)' }}>
                <VinduRamme />
              </div>
              <div className="absolute -bottom-8 right-0 hidden md:block lg:-right-1" style={{ transform: 'rotate(3.2deg)' }}>
                <TelefonRamme />
              </div>
              {/* Gulvskygge i lilla toner */}
              <div aria-hidden="true" className="absolute -bottom-6 left-1/2 h-[46px] w-[86%] -translate-x-1/2 rounded-[100%] bg-[#5b3aa5]/[0.13] blur-2xl" />
            </div>
          </div>
        </section>

        <StegDemo />


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
