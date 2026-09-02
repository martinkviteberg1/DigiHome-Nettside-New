'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';
import HeroPortal from './HeroPortal';
import Reisen from './Reisen';
import Bento from './Bento';
import { Statement, Nivaa, Trygghet, SluttCTA } from './Seksjoner';

/* ---------------------------------------------------------------------------
   ForsideV3 — «Utleie på autopilot», 2026.

   Én ryggrad: fra annonse til innbetaling. Heroen snakker til følelsen alle
   tre kjøpere deler (arbeidet forsvinner, oversikten blir), kroppen beviser
   med ekte produkt, og valget (Selvbetjent · Forvaltning · Portefølje) skjer
   én gang — sent og tydelig.

   Sju bevegelser: Hero → Reisen → Statement → Bento → Nivå → Trygghet → CTA.
   Ingen priser. Ingen påstander vi ikke kan stå inne for.
--------------------------------------------------------------------------- */

const NAV = [
  { href: '#produkt', label: 'Produkt' },
  { href: '#reisen', label: 'Slik virker det' },
  { href: '/bedrift', label: 'For bedrifter' },
  { href: '/priser', label: 'Priser' },
  { href: '/om-oss', label: 'Om oss' },
];

function NavLenke({ n, className, onClick }) {
  const cls = `rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a] ${className || ''}`;
  return n.href.startsWith('#')
    ? <a href={n.href} className={cls} onClick={onClick}>{n.label}</a>
    : <Link href={n.href} className={cls} onClick={onClick}>{n.label}</Link>;
}

export default function ForsideV3() {
  const [scrolled, setScrolled] = useState(false);
  const [meny, setMeny] = useState(false);
  const [nivaa, setNivaa] = useState(0);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => {
    if (!meny) return undefined;
    const f = (e) => { if (e.key === 'Escape') setMeny(false); };
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [meny]);

  const klikk = (hvor) => { try { track('forside_cta', { hvor, versjon: 'v3' }); } catch (e) { /* ok */ } };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FBFAF7] text-[#0A0A0A]" data-testid="forside-v3">
      {/* ── Navbar ── */}
      <header className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ${scrolled || meny ? 'border-b border-[#ECE8E0] bg-[#FBFAF7]/92 backdrop-blur-md' : 'border-b border-transparent bg-transparent'}`}>
        <div className="mx-auto flex h-[68px] w-full max-w-[1320px] items-center justify-between gap-4 px-6 sm:px-10">
          <Link href="/" className="flex shrink-0 items-center" data-testid="v3-logo" onClick={() => setMeny(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[22px] w-auto" />
          </Link>
          <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Hovedmeny">
            {NAV.map((n) => <NavLenke key={n.href} n={n} />)}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a href={site.loginUrl} className="hidden rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:text-[#0a0a0a] sm:block">Logg inn</a>
            <Link href="/bli-utleier/start" prefetch onClick={() => klikk('nav')} data-testid="v3-nav-cta" className="e-btn e-btn-dark !h-[40px] !rounded-full !px-4 !text-[13.5px] shadow-[0_4px_12px_rgba(17,17,17,0.14)]">
              Kom i gang <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <button type="button" onClick={() => setMeny((v) => !v)} aria-expanded={meny} aria-label={meny ? 'Lukk meny' : 'Åpne meny'} data-testid="v3-meny-knapp"
              className="flex h-[40px] w-[40px] items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-[#0a0a0a]/[0.045] lg:hidden">
              {meny ? <X className="h-5 w-5" strokeWidth={1.8} /> : <Menu className="h-5 w-5" strokeWidth={1.8} />}
            </button>
          </div>
        </div>
        {/* Mobilmeny */}
        <div className={`overflow-hidden lg:hidden ${meny ? 'max-h-[420px]' : 'max-h-0'}`} style={{ transition: 'max-height 380ms cubic-bezier(0.22,1,0.36,1)' }} data-testid="v3-mobilmeny">
          <nav className="mx-auto flex w-full max-w-[1320px] flex-col gap-1 px-4 pb-5 pt-1 sm:px-8" aria-label="Mobilmeny">
            {NAV.map((n) => <NavLenke key={n.href} n={n} onClick={() => setMeny(false)} className="!px-4 !py-3 !text-[16px] !text-[#0a0a0a]" />)}
            <a href={site.loginUrl} className="rounded-full px-4 py-3 text-[16px] font-medium text-[#1f1f1f]/70 sm:hidden">Logg inn</a>
          </nav>
        </div>
      </header>

      <main>
        {/* ── Hero — løftet + produktet i full bredde ── */}
        <section className="relative" data-testid="v3-hero">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[300px] h-[720px] w-[1400px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(155,91,214,0.11) 0%, rgba(155,91,214,0.05) 38%, transparent 66%)' }} />
          <div className="relative mx-auto w-full max-w-[1320px] px-6 pt-16 sm:px-10 sm:pt-24 lg:pt-28">
            <div className="mx-auto max-w-[1000px] text-center">
              <p className="e-label dh-cover-inn !text-[#7c7466]">Norsk plattform for utleie og forvaltning</p>
              <h1 className="e-display dh-cover-inn mt-6 text-[54px] sm:text-[80px] lg:text-[108px] xl:text-[120px]" style={{ animationDelay: '.06s' }}>
                Utleie på<br />autopilot<span className="text-[#cf97fc]">.</span>
              </h1>
              <p className="dh-cover-inn mx-auto mt-7 max-w-[44ch] text-[17px] leading-[1.6] text-[#6F6A60] sm:text-[20px]" style={{ animationDelay: '.14s' }}>
                Alt fra annonse til innbetaling går av seg selv. Du bestemmer hvor
                mye du vil være med.
              </p>
              <div className="dh-cover-inn mt-9 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: '.2s' }}>
                <Link href="/bli-utleier/start" prefetch onClick={() => klikk('hero')} data-testid="v3-hero-cta" className="e-btn e-btn-dark group !rounded-full shadow-[0_14px_30px_-14px_rgba(17,17,17,0.32)]">
                  Kom i gang <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
                <a href="#reisen" data-testid="v3-hero-sekundaer" className="e-btn e-btn-ghost !rounded-full !bg-white">Se hvordan det virker</a>
              </div>
              <ul className="dh-cover-inn mt-9 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[#b3aca1]" style={{ animationDelay: '.26s' }}>
                {['BankID-signering', 'Publisering til FINN', 'Husleie med KID', 'Saker og leverandører'].map((t, i) => (
                  <li key={t} className="flex items-center gap-3">{i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-[#D6CFC4]" />}{t}</li>
                ))}
              </ul>
            </div>
            <div className="dh-cover-inn mt-14 sm:mt-20" style={{ animationDelay: '.3s' }}>
              <HeroPortal />
            </div>
          </div>
        </section>

        <Reisen nivaa={nivaa} setNivaa={setNivaa} />
        <Statement />
        <Bento />
        <Nivaa nivaa={nivaa} setNivaa={setNivaa} />
        <Trygghet />
        <SluttCTA onKlikk={klikk} />
      </main>
    </div>
  );
}
