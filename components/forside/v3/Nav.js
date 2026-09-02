'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ChevronDown, Menu, X, Megaphone, FileSignature, Banknote, Wrench,
  MessageSquare, Smartphone, Play, User, ShieldCheck, Building2, Newspaper, BookOpen,
  BarChart3, Calculator, Compass, Mail, KeyRound, Home,
} from 'lucide-react';
import { site } from '@/lib/site';
import { heading, EASE } from './motion';

/* ---------------------------------------------------------------------------
   Nav — full bredde, rolig verktøylinje (OpenAI/ChatGPT-stil 2026).
   Logo + lenker i venstreklynge, handlinger helt til høyre. Fullbredde-
   nedtrekk under linjen (hover + trykk, Escape lukker). Ingen blur-gimmick:
   papirfarge + én hårlinje ved scroll/åpent panel. Mobil: fullskjerm-ark.
--------------------------------------------------------------------------- */

const PRODUKT = [
  { Ikon: Megaphone, t: 'Annonse & FINN', b: 'Publiser og samle interessenter på ett sted.', href: '#reisen' },
  { Ikon: FileSignature, t: 'Kontrakt & BankID', b: 'Husleieloven-kontrakt signert via Posten.', href: '#reisen' },
  { Ikon: Banknote, t: 'Husleie & økonomi', b: 'KID, purring og oppgjør — automatisk.', href: '#produkt' },
  { Ikon: Wrench, t: 'Saker & leverandører', b: 'Meldes, foreslås, bookes og følges opp.', href: '#produkt' },
  { Ikon: MessageSquare, t: 'Meldinger', b: 'Eier, leietaker og forvalter i én tråd.', href: '#produkt' },
  { Ikon: Smartphone, t: 'Leietaker-appen', b: 'Husleie, saker og dokumenter i lomma.', href: '#produkt' },
];

const LOSNINGER = [
  { Ikon: User, t: 'Selvbetjent', b: 'Du styrer. Systemet jobber. For én eller noen få boliger.', href: '/privat', hvem: 'Du + automatikk' },
  { Ikon: ShieldCheck, t: 'Full forvaltning', b: 'Vi tar jobben. Du ser alt. Bergen og omegn.', href: '/forvaltning', hvem: 'DigiHome' },
  { Ikon: Building2, t: 'Portefølje', b: 'Hele eiendomsmassen på én flate. Team, saker, økonomi.', href: '/bedrift', hvem: 'Teamet ditt' },
];

const LOSNINGER_EKSTRA = [
  { Ikon: KeyRound, t: 'For leietakere', href: '/bli-leietaker' },
  { Ikon: Home, t: 'Ledige boliger', href: '/ledige-boliger' },
];

const RESSURSER = [
  { Ikon: Newspaper, t: 'Nyheter', b: 'Marked, regelverk og produkt.', href: '/nyheter' },
  { Ikon: BookOpen, t: 'Guider for utleiere', b: 'Fra depositum til oppsigelse.', href: '/guider' },
  { Ikon: BarChart3, t: 'Leiemarkedet', b: 'Leiepriser og trender i Bergen.', href: '/leiemarkedet' },
  { Ikon: Calculator, t: 'Priskalkulator', b: 'Hva kan boligen din leies ut for?', href: '/priskalkulator' },
  { Ikon: Compass, t: 'Rådgivning', b: 'Snakk med en som kan utleie.', href: '/radgivning' },
  { Ikon: Mail, t: 'Kontakt', b: 'Vi svarer raskt.', href: '/kontakt' },
];

const MENY = [
  { id: 'produkt', label: 'Produkt', panel: true },
  { id: 'losninger', label: 'Løsninger', panel: true },
  { id: 'ressurser', label: 'Ressurser', panel: true },
  { id: 'priser', label: 'Priser', href: '/priser' },
  { id: 'om', label: 'Om oss', href: '/om-oss' },
];

const FOKUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0A0A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FBFAF7]';

function Flis({ Ikon, t, b, href, onClick, testid }) {
  const inner = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#F1EAFB] text-[#6D4FB0] transition-colors duration-300 group-hover:bg-[#0A0A0A] group-hover:text-white"><Ikon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
      <span className="min-w-0">
        <span className="block text-[14.5px] font-bold tracking-[-0.01em] text-[#0A0A0A]" style={heading}>{t}</span>
        {b && <span className="mt-0.5 block text-[13px] leading-[1.5] text-[#6F6A60]">{b}</span>}
      </span>
    </>
  );
  const cls = `group flex items-start gap-3.5 rounded-[16px] p-3 transition-colors duration-200 hover:bg-[#0A0A0A]/[0.035] ${FOKUS}`;
  return href.startsWith('#')
    ? <a href={href} className={cls} onClick={onClick} data-testid={testid}>{inner}</a>
    : <Link href={href} className={cls} onClick={onClick} data-testid={testid}>{inner}</Link>;
}

function Panel({ id, apen, children }) {
  return (
    <div
      className="absolute inset-x-0 top-full border-b border-[#ECE8E0] bg-[#FBFAF7] shadow-[0_40px_80px_-40px_rgba(23,18,12,0.18)]"
      style={{ opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateY(-6px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}`, pointerEvents: apen ? 'auto' : 'none', visibility: apen ? 'visible' : 'hidden' }}
      role="region"
      aria-label={id}
      data-testid={`v3-panel-${id}`}
    >
      <div className="mx-auto w-full max-w-[1320px] px-8 py-9 sm:px-10">{children}</div>
    </div>
  );
}

export default function Nav({ onCta }) {
  const [scrolled, setScrolled] = useState(false);
  const [apen, setApen] = useState(null);
  const [mobil, setMobil] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => {
    const f = (e) => { if (e.key === 'Escape') { setApen(null); setMobil(false); } };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, []);

  /* Lås scroll bak mobilmenyen */
  useEffect(() => {
    if (!mobil) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobil]);

  const aapne = (id) => { clearTimeout(timer.current); timer.current = setTimeout(() => setApen(id), 90); };
  const lukk = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setApen(null), 160); };
  const hold = () => clearTimeout(timer.current);
  const veksle = (id) => { clearTimeout(timer.current); setApen((v) => (v === id ? null : id)); };
  const lukkAlt = () => { setApen(null); setMobil(false); };

  const lenke = `${FOKUS} inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13.5px] font-medium transition-colors duration-200`;

  return (
    <header
      className={`sticky top-0 z-50 bg-[#FBFAF7] transition-[border-color] duration-300 ${scrolled || apen || mobil ? 'border-b border-[#ECE8E0]' : 'border-b border-transparent'}`}
      onMouseLeave={lukk}
      data-testid="v3-nav"
    >
      <div className="relative flex h-[60px] w-full items-center justify-between gap-6 px-5 sm:px-7 lg:px-8">
        {/* Venstreklynge: logo + lenker */}
        <div className="flex min-w-0 items-center gap-2 lg:gap-5">
          <Link href="/" className={`flex shrink-0 items-center rounded-md ${FOKUS}`} data-testid="v3-logo" onClick={lukkAlt}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[20px] w-auto" />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Hovedmeny" onMouseEnter={hold}>
            {MENY.map((m) => m.panel ? (
              <button
                key={m.id}
                type="button"
                onMouseEnter={() => aapne(m.id)}
                onClick={() => veksle(m.id)}
                aria-expanded={apen === m.id}
                aria-haspopup="true"
                data-testid={`v3-nav-${m.id}`}
                className={`${lenke} ${apen === m.id ? 'bg-[#0a0a0a]/[0.05] text-[#0a0a0a]' : 'text-[#1f1f1f]/75 hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a]'}`}
              >
                {m.label}
                <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform duration-300" style={{ transform: apen === m.id ? 'rotate(180deg)' : 'none' }} strokeWidth={2} />
              </button>
            ) : (
              <Link key={m.id} href={m.href} onMouseEnter={lukk} data-testid={`v3-nav-${m.id}`} className={`${lenke} text-[#1f1f1f]/75 hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a]`}>{m.label}</Link>
            ))}
          </nav>
        </div>

        {/* Høyreklynge */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" onMouseEnter={lukk}>
          <a href={site.loginUrl} className={`${lenke} hidden text-[#1f1f1f]/75 hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a] sm:inline-flex`}>Logg inn</a>
          <Link href="/bli-utleier/start" prefetch onClick={() => { onCta && onCta('nav'); lukkAlt(); }} data-testid="v3-nav-cta" className={`e-btn e-btn-dark !h-[36px] !rounded-full !px-4 !text-[13.5px] ${FOKUS}`}>
            Kom i gang <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button type="button" onClick={() => setMobil((v) => !v)} aria-expanded={mobil} aria-label={mobil ? 'Lukk meny' : 'Åpne meny'} data-testid="v3-meny-knapp"
            className={`flex h-9 w-9 items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/[0.045] lg:hidden ${FOKUS}`}>
            {mobil ? <X className="h-5 w-5" strokeWidth={1.8} /> : <Menu className="h-5 w-5" strokeWidth={1.8} />}
          </button>
        </div>

        {/* ── Fullbredde-nedtrekk ── */}
        <div className="absolute inset-x-0 top-full hidden lg:block" onMouseEnter={hold}>
          <Panel id="produkt" apen={apen === 'produkt'}>
            <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Produktet</p>
                <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {PRODUKT.map((p) => <Flis key={p.t} {...p} onClick={lukkAlt} />)}
                </div>
              </div>
              <a href="#reisen" onClick={lukkAlt} className={`group relative flex flex-col justify-between overflow-hidden rounded-[20px] bg-[#0B0A09] p-6 text-white ${FOKUS}`}>
                <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.22) 0%, transparent 62%)' }} />
                <p className="relative text-[11px] font-semibold uppercase tracking-[0.14em] text-[#C9A6F0]">Slik virker det</p>
                <div className="relative mt-10">
                  <p className="text-[22px] font-bold leading-[1.05] tracking-[-0.025em]" style={heading}>Fra annonse til innbetaling — på fem steg.</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#C9A6F0]">Se reisen <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                </div>
              </a>
            </div>
          </Panel>

          <Panel id="losninger" apen={apen === 'losninger'}>
            <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Tre grader av autopilot</p>
                <div className="grid gap-1 sm:grid-cols-3">
                  {LOSNINGER.map((l) => (
                    <Link key={l.t} href={l.href} onClick={lukkAlt} className={`group rounded-[18px] p-4 transition-colors duration-200 hover:bg-[#0A0A0A]/[0.035] ${FOKUS}`}>
                      <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#F1EAFB] text-[#6D4FB0] transition-colors duration-300 group-hover:bg-[#0A0A0A] group-hover:text-white"><l.Ikon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
                      <span className="mt-4 block text-[16px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{l.t}</span>
                      <span className="mt-1 block text-[13px] leading-[1.5] text-[#6F6A60]">{l.b}</span>
                      <span className="mt-3 inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#57534e] ring-1 ring-black/[0.08]">Hvem gjør det: {l.hvem}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="border-l border-[#ECE8E0] pl-8">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Også for</p>
                <div className="grid gap-1">
                  {LOSNINGER_EKSTRA.map((e) => <Flis key={e.t} {...e} onClick={lukkAlt} />)}
                </div>
              </div>
            </div>
          </Panel>

          <Panel id="ressurser" apen={apen === 'ressurser'}>
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Ressurser</p>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {RESSURSER.map((r) => <Flis key={r.t} {...r} onClick={lukkAlt} />)}
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Mobil: fullskjerm-ark ── */}
      <div
        className="fixed inset-x-0 bottom-0 top-[60px] z-40 overflow-y-auto bg-[#FBFAF7] lg:hidden"
        style={{ opacity: mobil ? 1 : 0, transform: mobil ? 'none' : 'translateY(-8px)', transition: `opacity 280ms ${EASE}, transform 280ms ${EASE}`, pointerEvents: mobil ? 'auto' : 'none', visibility: mobil ? 'visible' : 'hidden' }}
        aria-hidden={!mobil}
        data-testid="v3-mobilmeny"
      >
        <div className="flex min-h-full flex-col px-5 pb-8 pt-4 sm:px-7">
          <nav className="flex flex-col" aria-label="Mobilmeny">
            {[['Produkt', '#produkt'], ['Slik virker det', '#reisen'], ['Løsninger', '#nivaa'], ['Priser', '/priser'], ['Om oss', '/om-oss'], ['Kontakt', '/kontakt']].map(([l, h]) => (
              h.startsWith('#')
                ? <a key={l} href={h} onClick={lukkAlt} className="border-b border-[#ECE8E0] py-4 text-[26px] font-bold tracking-[-0.025em] text-[#0A0A0A]" style={heading}>{l}</a>
                : <Link key={l} href={h} onClick={lukkAlt} className="border-b border-[#ECE8E0] py-4 text-[26px] font-bold tracking-[-0.025em] text-[#0A0A0A]" style={heading}>{l}</Link>
            ))}
          </nav>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {LOSNINGER.map((l) => (
              <Link key={l.t} href={l.href} onClick={lukkAlt} className="flex items-center gap-3 rounded-[16px] bg-white p-3.5 ring-1 ring-black/[0.06]">
                <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#F1EAFB] text-[#6D4FB0]"><l.Ikon className="h-4 w-4" strokeWidth={1.7} /></span>
                <span className="text-[14.5px] font-semibold text-[#0A0A0A]">{l.t}</span>
              </Link>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Link href="/bli-utleier/start" prefetch onClick={() => { onCta && onCta('mobilmeny'); lukkAlt(); }} className="e-btn e-btn-dark !rounded-full">Kom i gang <ArrowRight className="h-4 w-4" /></Link>
            <a href={site.loginUrl} className="e-btn e-btn-ghost !rounded-full !bg-white">Logg inn</a>
          </div>
        </div>
      </div>
    </header>
  );
}
