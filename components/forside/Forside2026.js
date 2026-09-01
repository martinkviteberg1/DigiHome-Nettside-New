'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, Check, CheckCircle2, Megaphone, UserCheck, FileSignature, ShieldCheck,
  Banknote, MessageSquare, Home, User, Building2, Bell, Play, Lock, Sparkles, ChevronRight,
  Users, Clock, CalendarDays, LayoutGrid, Menu, Plus, FileText, ClipboardList, FolderOpen,
  BarChart3, Settings, HelpCircle, ChevronDown, Wallet, Inbox, Search, Wrench,
} from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';
import VinduRamme from '@/components/forside/HeroVindu';
import StegDemo from '@/components/forside/StegDemo';
import Avsloer from '@/components/forside/Avsloer';

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


/* ── Telefonrammen: leietaker-appen i appens LYSE tema (fra portal-/appkoden:
      lys flate #F7F5F1, hvite kort m/ #eee9e0-hairline, INK-mørkt husleiekort
      m/ lavendel-glød, grønn #0f9d6e, lilla #7c3aed) — «Min bolig» m/ boligbilde. ── */
function TelefonRamme() {
  return (
    <div className="relative w-[196px] rounded-[30px] bg-[#0a0a0a] p-[5px] shadow-[0_50px_110px_-32px_rgba(23,18,12,0.5),0_0_0_1px_rgba(0,0,0,0.1)]" aria-hidden="true">
      {/* Sideknapper — fysisk detalj */}
      <span className="absolute -left-[2px] top-[92px] h-[22px] w-[2.5px] rounded-full bg-[#2a2a2a]" />
      <span className="absolute -left-[2px] top-[122px] h-[22px] w-[2.5px] rounded-full bg-[#2a2a2a]" />
      <span className="absolute -right-[2px] top-[108px] h-[38px] w-[2.5px] rounded-full bg-[#2a2a2a]" />
      <div className="relative overflow-hidden rounded-[25px] bg-[#F7F5F1]">
        {/* Dynamic island */}
        <div className="absolute left-1/2 top-[7px] z-[2] h-[13px] w-[52px] -translate-x-1/2 rounded-full bg-black" />
        {/* Statuslinje */}
        <div className="flex items-center justify-between px-4 pt-2">
          <span className="text-[8px] font-bold text-[#0a0a0a] tabular-nums">9:41</span>
          <span className="flex items-center gap-[2px]">
            {[3, 4.5, 6].map((h) => <span key={h} className="w-[2px] rounded-full bg-[#0a0a0a]" style={{ height: h }} />)}
            <span className="ml-[3px] h-[6px] w-[11px] rounded-[2.5px] border border-[#0a0a0a]/50"><span className="block h-full w-[70%] rounded-[1.5px] bg-[#0a0a0a]" /></span>
          </span>
        </div>
        <div className="px-3 pb-2.5 pt-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#0a0a0a]" style={heading}>God dag, Sofie 👋</p>
              <p className="mt-[1px] text-[7px] text-[#8d877d]">Leietaker · Olaf Ryes vei 11C</p>
            </div>
            <span className="flex h-[20px] w-[20px] items-center justify-center rounded-full bg-[#F1E9FB] text-[7.5px] font-bold text-[#7c3aed]">SL</span>
          </div>

          {/* Min bolig — nydelig boligbilde */}
          <p className="mt-2.5 text-[7px] font-bold uppercase tracking-[0.14em] text-[#b3aa9e]">Min bolig</p>
          <div className="mt-1.5 overflow-hidden rounded-[13px] border border-[#eee9e0] bg-white shadow-[0_1px_3px_rgba(23,18,12,0.05)]">
            <div className="relative h-[86px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/interior-openplan-hero.webp" alt="" loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-[2.5px] text-[6px] font-bold text-[#0f9d6e] backdrop-blur-sm">
                <span className="h-[4px] w-[4px] rounded-full bg-[#0f9d6e]" /> Aktiv leieavtale
              </span>
            </div>
            <div className="flex items-center justify-between p-2">
              <div className="min-w-0">
                <p className="truncate text-[9px] font-bold text-[#0a0a0a]" style={heading}>Olaf Ryes vei 11C</p>
                <p className="text-[6.5px] text-[#8d877d]">5007 Bergen · 2-roms · 49 m²</p>
              </div>
              <ChevronRight className="h-[9px] w-[9px] shrink-0 text-[#c8c3ba]" />
            </div>
          </div>

          {/* Husleie — INK-mørkt kort m/ lavendel-glød, som i appen */}
          <div className="relative mt-2 overflow-hidden rounded-[13px] bg-[#0f0d0b] p-2.5">
            <div className="pointer-events-none absolute -right-5 -top-8 h-20 w-20 rounded-full blur-2xl" style={{ background: 'radial-gradient(circle,rgba(207,151,252,0.38),transparent 70%)' }} />
            <div className="flex items-center justify-between">
              <p className="text-[6.5px] font-bold uppercase tracking-[0.14em] text-[#D9B4FF]/85">Neste husleie</p>
              <span className="flex items-center gap-[3px] rounded-full bg-white/[0.1] px-1.5 py-[2px] text-[6px] font-semibold text-[#7fe0b2]">
                <Check className="h-[6px] w-[6px]" strokeWidth={3} /> Februar betalt
              </span>
            </div>
            <p className="mt-1 text-[16px] font-bold leading-none tracking-[-0.02em] text-white tabular-nums" style={heading}>18 500 <span className="text-[8px] font-medium text-white/40">kr</span></p>
            <p className="mt-1.5 text-[6.5px] text-white/55">Trekkes automatisk 1. mars · KID</p>
          </div>

          {/* Hurtigvalg */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[[Wrench, 'Meld inn sak', null], [MessageSquare, 'Meldinger', 1]].map(([Ikon, l, badge]) => (
              <div key={l} className="flex items-center gap-1.5 rounded-[11px] border border-[#eee9e0] bg-white px-2 py-[7px] shadow-[0_1px_3px_rgba(23,18,12,0.04)]">
                <span className="relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] bg-[#F1E9FB]">
                  <Ikon className="h-[8.5px] w-[8.5px] text-[#7c3aed]" />
                  {badge ? <span className="absolute -right-[3px] -top-[3px] flex h-[8px] w-[8px] items-center justify-center rounded-full bg-[#7c3aed] text-[5px] font-bold text-white">{badge}</span> : null}
                </span>
                <span className="truncate text-[7.5px] font-semibold text-[#0a0a0a]">{l}</span>
              </div>
            ))}
          </div>

          {/* Tab-bar */}
          <div className="mt-3 flex items-center justify-around rounded-full border border-[#eee9e0] bg-white px-2 py-[6px] shadow-[0_1px_3px_rgba(23,18,12,0.04)]">
            {[[Home, 'Hjem', true], [Building2, 'Min bolig', false], [Wallet, 'Betaling', false], [MessageSquare, 'Meldinger', false]].map(([Ikon, l, aktiv]) => (
              <span key={l} className="flex flex-col items-center gap-[1px]">
                <Ikon className={`h-[10px] w-[10px] ${aktiv ? 'text-[#7c3aed]' : 'text-[#c8c3ba]'}`} />
                <span className={`text-[4.5px] font-bold ${aktiv ? 'text-[#7c3aed]' : 'text-[#c8c3ba]'}`}>{l}</span>
              </span>
            ))}
          </div>
          {/* Home-indikator */}
          <div className="mx-auto mt-1.5 h-[3px] w-[46px] rounded-full bg-[#0a0a0a]/70" />
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
    <div className="min-h-screen overflow-x-clip bg-[#FDFCFB]" data-testid="forside-2026">
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
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('nav')} data-testid="forside-nav-cta" className="e-btn e-btn-dark !h-[40px] !rounded-full !px-4 !text-[13.5px] shadow-[0_4px_14px_rgba(17,17,17,0.18)]">
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
          <div className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-14 px-6 pb-24 pt-10 sm:px-10 sm:pt-14 lg:grid-cols-[0.58fr_1.42fr] lg:gap-12 lg:pb-28 xl:gap-14">
            <div>
              <p className="e-label dh-cover-inn !text-[#7c7466]">Ny generasjon utleie</p>
              <h1 className="e-display dh-cover-inn mt-4 text-[46px] sm:text-[58px] lg:text-[60px] xl:text-[70px]" style={{ animationDelay: '.06s' }}>
                Utleie på<br />autopilot<span className="text-[#cf97fc]">.</span>
              </h1>
              <p className="dh-cover-inn mt-6 max-w-[34ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[17px]" style={{ animationDelay: '.14s' }}>
                DigiHome samler hele utleieprosessen — fra annonse til betaling
                og oppfølging.
              </p>
              <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '.2s' }}>
                <Link href="/bli-utleier/start" prefetch onClick={() => klikk('hero')} data-testid="forside-hero-cta"
                  className="e-btn e-btn-dark group !rounded-full shadow-[0_16px_34px_-14px_rgba(17,17,17,0.4)]">
                  Kom i gang
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <Link href="/tour" prefetch className="e-btn e-btn-ghost !rounded-full !bg-white" data-testid="forside-hero-tour">
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
            <div className="dh-cover-inn relative min-w-0 pb-14 lg:pb-16" style={{ animationDelay: '.24s' }}>
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
          <Avsloer className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-10">
            <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#a49e93]">Snakker med det dere allerede bruker</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-10">
              {INTEGRASJONER.map((n) => (
                <li key={n} className="text-[15px] font-bold tracking-[-0.02em] text-[#8d877d] sm:text-[16.5px]" style={heading}>{n}</li>
              ))}
            </ul>
          </Avsloer>
        </section>

        {/* ── Målgruppene ── */}
        <section className="mx-auto w-full max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
            {/* Privat */}
            <Avsloer>
            <div className="grid h-full overflow-hidden rounded-[22px] bg-white ring-1 ring-black/[0.06] shadow-[0_2px_5px_rgba(23,18,12,0.04)] sm:grid-cols-[1.15fr_1fr]" data-testid="forside-kort-privat">
              <div className="flex flex-col justify-between gap-8 p-7 sm:p-9">
                <div>
                  <p className="e-label !text-[#7c7466]">For private huseiere</p>
                  <h3 className="e-display mt-3 text-[24px] sm:text-[28px]">Én bolig. Nesten null administrasjon.</h3>
                  <p className="mt-3 text-[14px] leading-[1.65] text-[#6F6A60]">
                    Selvbetjent utleie med kontrakt, BankID, depositum, betaling og
                    oppfølging — i hele Norge.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <Link href="/privat" className="group inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#1a1a1a]">
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
            </Avsloer>
            {/* Pro */}
            <Avsloer delay={140}>
            <div className="relative grid h-full overflow-hidden rounded-[22px] bg-[#0B0A09] text-white ring-1 ring-black/[0.2] sm:grid-cols-[1.15fr_1fr]" data-testid="forside-kort-pro">
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
            </Avsloer>
          </div>
        </section>


        {/* ── Mørk ROI-seksjon ── */}
        <section className="relative overflow-hidden bg-[#0B0A09] text-white">
          <div aria-hidden="true" className="pointer-events-none absolute -top-44 left-[8%] h-[560px] w-[560px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.16) 0%, transparent 62%)' }} />
          <div className="relative mx-auto w-full max-w-[1320px] px-6 py-18 sm:px-10 sm:py-24">
            <Avsloer>
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
            </Avsloer>
          </div>
        </section>

        {/* ── Hvordan vil du bruke DigiHome? ── */}
        <section className="mx-auto w-full max-w-[1320px] px-6 py-16 sm:px-10 sm:py-24">
          <Avsloer>
            <h2 className="e-display mx-auto max-w-[20ch] text-center text-[28px] sm:text-[38px]">Hvordan vil du bruke DigiHome?</h2>
          </Avsloer>
          <Avsloer delay={140}>
          <div className="mx-auto mt-10 grid max-w-[1060px] gap-4 sm:grid-cols-3 sm:gap-6 sm:mt-14">
            {[
              { ikon: Home, href: '/forvaltning', t: 'Full forvaltning', b: 'Vi gjør jobben for deg — visning, kontrakt, innkreving og oppfølging. Bergen og omegn.' },
              { ikon: User, href: '/selvforvaltning', t: 'Selvbetjent', b: 'Du bruker DigiHome selv — annonse, BankID-kontrakt og betalingsoversikt. Hele Norge.' },
              { ikon: Building2, href: '/bedrift', t: 'DigiHome Pro', b: 'For profesjonelle porteføljer fra 5 til 1000+ enheter. Kraftig, skalerbart, effektivt.' },
            ].map((k) => (
              <Link key={k.href} href={k.href} data-testid={`forside-vei-${k.t.toLowerCase().replace(/\s/g, '-')}`}
                className="group rounded-[18px] bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_1px_3px_rgba(23,18,12,0.04)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_18px_44px_-20px_rgba(23,18,12,0.22)] sm:p-7">
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#f5f0fc] text-[#6d28d9]">
                  <k.ikon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>
                <p className="mt-4 text-[16.5px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{k.t}</p>
                <p className="mt-2 text-[13px] leading-[1.6] text-[#6F6A60]">{k.b}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1a1a1a]">
                  Les mer <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
          </Avsloer>
        </section>

        {/* ── Slutt-CTA ── */}
        <section className="border-t border-[#E6E1D9]">
          <Avsloer className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-6 px-6 py-12 sm:px-10 sm:py-16">
            <div>
              <h2 className="e-display text-[24px] sm:text-[30px]">Klar for å gjøre utleie enklere?</h2>
              <p className="mt-2 text-[14px] text-[#8d877d]">Kom i gang på minuttet — eller book en prat med oss.</p>
            </div>
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('bunn')} data-testid="forside-bunn-cta" className="e-btn e-btn-dark group !rounded-full shadow-[0_14px_30px_-12px_rgba(17,17,17,0.4)]">
              Kom i gang
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </Avsloer>
        </section>
      </main>
    </div>
  );
}
