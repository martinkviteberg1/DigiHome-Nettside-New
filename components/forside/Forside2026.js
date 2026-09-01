'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Check, Megaphone, UserCheck, FileSignature, ShieldCheck,
  Banknote, MessageSquare, Home, User, Building2, Bell,
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

const PROSESS = [
  { ikon: Megaphone, t: 'Annonse', b: 'Publiser og nå leietakerne der de leter.' },
  { ikon: UserCheck, t: 'Screening', b: 'Følg interessenter og finn riktig leietaker.' },
  { ikon: FileSignature, t: 'Kontrakt', b: 'Signeres digitalt med BankID.' },
  { ikon: ShieldCheck, t: 'Depositum', b: 'Trygt og etter husleieloven.' },
  { ikon: Banknote, t: 'Husleie', b: 'Betaling og full oversikt, hver måned.' },
  { ikon: MessageSquare, t: 'Oppfølging', b: 'Saker, frister og kommunikasjon.' },
];

const FUNKSJONER = [
  { nr: '01', t: 'Finn leietaker', b: 'Publiser annonsen og følg interessenter gjennom hele utleieprosessen — fra første henvendelse til signert kontrakt.' },
  { nr: '02', t: 'Signer digitalt', b: 'Leiekontrakt og vedlegg signeres trygt med BankID — juridisk holdbart og arkivert automatisk.' },
  { nr: '03', t: 'Få betalt', b: 'Husleie, depositum og full betalingsoversikt — med automatiske påminnelser når noe forfaller.' },
  { nr: '04', t: 'La DigiHome følge opp', b: 'Saker, frister og kommunikasjon samlet på ett sted — med varsel når noe faktisk krever deg.' },
];

const BILDE_PRIVAT = 'https://images.pexels.com/photos/19866421/pexels-photo-19866421.jpeg?auto=compress&cs=tinysrgb&w=1200';
const BILDE_PRO = 'https://images.unsplash.com/photo-1725785218870-b41365703511?q=80&w=1200&auto=format&fit=crop';

/* ── Dashboardrammen: produktet som helt. Ren JSX — ingen skjermbilder. ── */
function DashboardRamme() {
  return (
    <div className="relative" aria-hidden="true">
      <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_50px_120px_-42px_rgba(23,18,12,0.45)] ring-1 ring-black/[0.07] sm:rounded-[20px]">
        <div className="flex items-center gap-2 border-b border-[#EDE9E2] bg-[#FAF8F4] px-4 py-2.5">
          <span className="flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-[8px] w-[8px] rounded-full bg-[#E2DCD2]" />)}</span>
          <span className="mx-auto rounded-[6px] bg-white px-5 py-[3px] text-[10px] text-[#a49e93] ring-1 ring-black/[0.04]">app.digihome.no</span>
        </div>
        <div className="flex">
          <div className="hidden w-[132px] shrink-0 border-r border-[#EDE9E2] bg-[#FCFBF9] p-3 lg:block">
            <div className="mb-3 h-[12px] w-[74px] rounded-[4px] bg-[#0A0A0A]" />
            {['Oversikt', 'Leieforhold', 'Saker', 'Dokumenter', 'Økonomi'].map((m, i) => (
              <div key={m} className={`mb-0.5 rounded-[6px] px-2 py-[6px] text-[10.5px] font-medium ${i === 0 ? 'bg-[#0A0A0A] text-white' : 'text-[#6F6A60]'}`}>{m}</div>
            ))}
          </div>
          <div className="min-w-0 flex-1 p-4">
            <p className="text-[13px] font-bold text-[#0A0A0A]" style={heading}>Oversikt</p>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {[['98 %', 'Utleiegrad'], ['142', 'Leieforhold'], ['3', 'Åpne saker'], ['99,2 %', 'Innbetalt']].map(([v, l]) => (
                <div key={l} className="rounded-[9px] bg-[#FAF8F4] px-2 py-2 ring-1 ring-black/[0.04]">
                  <p className="text-[13px] font-bold text-[#0A0A0A] tabular-nums" style={heading}>{v}</p>
                  <p className="mt-[1px] truncate text-[8.5px] font-semibold uppercase tracking-[0.06em] text-[#a49e93]">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-2.5 grid grid-cols-[1.5fr_1fr] gap-2">
              <div className="rounded-[10px] p-3 ring-1 ring-black/[0.05]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#a49e93]">Husleie siste 6 måneder</p>
                <svg viewBox="0 0 220 64" className="mt-2 w-full">
                  <polyline points="0,50 40,44 80,46 120,32 160,26 200,14 220,10" fill="none" stroke="#9B5BD6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {[[0, 50], [40, 44], [80, 46], [120, 32], [160, 26], [200, 14]].map(([x, y]) => (
                    <circle key={x} cx={x} cy={y} r="2.6" fill="#fff" stroke="#9B5BD6" strokeWidth="1.8" />
                  ))}
                </svg>
              </div>
              <div className="rounded-[10px] bg-[#FCFBF9] p-3 ring-1 ring-black/[0.05]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-[#a49e93]">Aktiviteter</p>
                {[['Kontrakt signert', '#1f7a45'], ['Husleie mottatt', '#1f7a45'], ['Ny sak opprettet', '#9a6b1c']].map(([t, c]) => (
                  <p key={t} className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium text-[#3A3733]">
                    <span className="h-[5px] w-[5px] shrink-0 rounded-full" style={{ background: c }} />{t}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Flytende hendelser — produktet i arbeid */}
      <div className="absolute -right-3 -top-4 flex items-center gap-2 rounded-[12px] bg-white px-3.5 py-2.5 shadow-[0_18px_44px_-16px_rgba(23,18,12,0.3)] ring-1 ring-black/[0.06] sm:-right-6">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E7F3EC]"><Check className="h-3 w-3 text-[#1f7a45]" strokeWidth={3} /></span>
        <span className="text-[11.5px] font-semibold text-[#0A0A0A]">Kontrakt signert <span className="font-medium text-[#8d877d]">med BankID</span></span>
      </div>
      <div className="absolute -bottom-4 -left-3 flex items-center gap-2 rounded-[12px] bg-white px-3.5 py-2.5 shadow-[0_18px_44px_-16px_rgba(23,18,12,0.3)] ring-1 ring-black/[0.06] sm:-left-6">
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-[#E7F3EC]"><Check className="h-3 w-3 text-[#1f7a45]" strokeWidth={3} /></span>
        <span className="text-[11.5px] font-semibold text-[#0A0A0A]">Husleie mottatt</span>
      </div>
      <div className="absolute -bottom-3 right-6 hidden items-center gap-2 rounded-[12px] bg-[#0B0A09] px-3.5 py-2.5 shadow-[0_18px_44px_-16px_rgba(23,18,12,0.4)] sm:flex">
        <Bell className="h-3.5 w-3.5 text-[#C9A6F0]" />
        <span className="text-[11.5px] font-semibold text-white">Påminnelse sendt <span className="font-medium text-white/50">automatisk</span></span>
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
        <div className="mx-auto flex h-[66px] w-full max-w-[1280px] items-center justify-between gap-4 px-6 sm:px-10">
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
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('nav')} data-testid="forside-nav-cta" className="e-btn e-btn-dark !h-[40px] !px-4 !text-[13.5px]">
              Kom i gang
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero: løftet + produktet ── */}
        <section className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 pb-16 pt-10 sm:px-10 sm:pt-14 lg:grid-cols-[0.95fr_1.05fr] lg:gap-16 lg:pb-24">
          <div>
            <p className="e-label dh-cover-inn">Ny generasjon utleie</p>
            <h1 className="e-display dh-cover-inn mt-4 text-[44px] sm:text-[58px] lg:text-[64px] xl:text-[72px]" style={{ animationDelay: '.06s' }}>
              Utleie på<br />autopilot<span className="text-[#9B5BD6]">.</span>
            </h1>
            <p className="dh-cover-inn mt-6 max-w-[44ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[17px]" style={{ animationDelay: '.14s' }}>
              Hele utleieprosessen i ett system — fra annonse og BankID-signering
              til husleie, saker og oppfølging.
            </p>
            <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '.2s' }}>
              <Link href="/bli-utleier/start" prefetch onClick={() => klikk('hero')} data-testid="forside-hero-cta" className="e-btn e-btn-dark group">
                Kom i gang
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <Link href="/tour" prefetch className="e-btn e-btn-ghost" data-testid="forside-hero-tour">Se hvordan DigiHome fungerer</Link>
            </div>
            <ul className="dh-cover-inn mt-7 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] text-[#8d877d]" style={{ animationDelay: '.26s' }}>
              {['Signering med BankID', 'Depositum etter husleieloven', 'Norsk support'].map((t, i) => (
                <li key={t} className="flex items-center gap-3">
                  {i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-[#D6CFC4]" />}
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="dh-cover-inn px-3 sm:px-6 lg:px-0" style={{ animationDelay: '.24s' }}>
            <DashboardRamme />
          </div>
        </section>

        {/* ── Integrasjoner ── */}
        <section className="border-y border-[#E6E1D9] bg-[#FCFBF8]">
          <div className="mx-auto w-full max-w-[1280px] px-6 py-8 sm:px-10">
            <p className="text-center text-[10.5px] font-bold uppercase tracking-[0.16em] text-[#a49e93]">Snakker med det dere allerede bruker</p>
            <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 sm:gap-x-10">
              {INTEGRASJONER.map((n) => (
                <li key={n} className="text-[15px] font-bold tracking-[-0.02em] text-[#8d877d] sm:text-[16.5px]" style={heading}>{n}</li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Historien: én plattform, hele prosessen ── */}
        <section id="produkt" className="mx-auto w-full max-w-[1280px] scroll-mt-20 px-6 py-16 sm:px-10 sm:py-24">
          <p className="e-label text-center !text-[#9B5BD6]">Fra manuelt arbeid til automatisert drift</p>
          <h2 className="e-display mx-auto mt-3 max-w-[22ch] text-center text-[30px] sm:text-[42px]">Én plattform. Hele leieprosessen.</h2>
          <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:flex lg:items-start lg:gap-2">
            {PROSESS.map((s, i) => (
              <React.Fragment key={s.t}>
                <div className="flex flex-col items-center text-center lg:flex-1">
                  <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[14px] bg-white ring-1 ring-black/[0.07] shadow-[0_1px_3px_rgba(23,18,12,0.05)]">
                    <s.ikon className="h-[19px] w-[19px] text-[#0A0A0A]" strokeWidth={1.7} />
                  </span>
                  <p className="mt-3 text-[14.5px] font-bold tracking-[-0.01em] text-[#0A0A0A]" style={heading}>{s.t}</p>
                  <p className="mt-1 max-w-[20ch] text-[12px] leading-[1.55] text-[#8d877d]">{s.b}</p>
                </div>
                {i < PROSESS.length - 1 && <ArrowRight className="mt-[15px] hidden h-4 w-4 shrink-0 text-[#D6CFC4] lg:block" />}
              </React.Fragment>
            ))}
          </div>
          <p className="mt-10 text-center text-[13.5px] text-[#8d877d]">DigiHome sørger for at ingenting faller mellom stegene.</p>
        </section>

        {/* ── Målgruppene ── */}
        <section className="mx-auto w-full max-w-[1280px] px-6 pb-16 sm:px-10 sm:pb-24">
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
          <div className="mx-auto grid w-full max-w-[1280px] items-center gap-12 px-6 py-16 sm:px-10 sm:py-24 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
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
          <div className="relative mx-auto w-full max-w-[1280px] px-6 py-18 sm:px-10 sm:py-24">
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
        <section className="mx-auto w-full max-w-[1280px] px-6 py-16 sm:px-10 sm:py-24">
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
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-6 px-6 py-12 sm:px-10 sm:py-16">
            <div>
              <h2 className="e-display text-[24px] sm:text-[30px]">Klar for å gjøre utleie enklere?</h2>
              <p className="mt-2 text-[14px] text-[#8d877d]">Kom i gang på minuttet — eller book en prat med oss.</p>
            </div>
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('bunn')} data-testid="forside-bunn-cta" className="e-btn e-btn-dark group">
              Kom i gang
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
