'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { site } from '@/lib/site';
import { Knapp } from './motion';

/* ---------------------------------------------------------------------------
   NavV4 — lys, stille verktøylinje. Logo, fem lenker, logg inn, én knapp.
   Ingen megamenyer i første versjon. Hairline når siden er scrollet.
--------------------------------------------------------------------------- */

const LENKER = [
  ['Produkt', '#produkt'],
  ['For private', '/privat'],
  ['For eiendomsselskaper', '/bedrift'],
  ['Forvaltning', '/forvaltning'],
  ['Priser', '/priser'],
];

export default function NavV4() {
  const [scrolled, setScrolled] = useState(false);
  const [apen, setApen] = useState(false);

  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);

  useEffect(() => {
    if (!apen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e) => { if (e.key === 'Escape') setApen(false); };
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [apen]);

  const lenke = 'inline-flex h-9 items-center rounded-[9px] px-3 text-[14.5px] text-[#15130F]/70 transition-colors hover:bg-[#15130F]/[0.05] hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30';

  return (
    <>
      <header className={`sticky top-0 z-50 border-b bg-[#F3F1EC]/85 backdrop-blur-md transition-colors duration-300 ${scrolled || apen ? 'border-[#15130F]/[0.08]' : 'border-transparent'}`} data-testid="v4-nav">
        <div className="flex h-[72px] w-full items-center justify-between gap-6 px-5 sm:px-8 lg:h-[64px] lg:px-10">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" onClick={() => setApen(false)} data-testid="v4-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-[23px] w-auto lg:h-[20px]" />
            </Link>
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Hovedmeny">
              {LENKER.map(([l, h]) => (h.startsWith('#')
                ? <a key={l} href={h} className={lenke}>{l}</a>
                : <Link key={l} href={h} className={lenke}>{l}</Link>))}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <a href={site.loginUrl} className={`${lenke} hidden sm:inline-flex`}>Logg inn</a>
            <Knapp href="/omvisning" size="sm" className="hidden sm:inline-flex" data-testid="v4-nav-cta">Se DigiHome</Knapp>
            <button type="button" onClick={() => setApen((v) => !v)} aria-expanded={apen} aria-label={apen ? 'Lukk meny' : 'Åpne meny'} className="relative -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-[#15130F] transition-colors hover:bg-[#15130F]/[0.05] lg:hidden" data-testid="v4-meny-knapp">
              {/* To streker, 22 px. Blir et kryss når menyen er åpen. */}
              <span aria-hidden="true" className="absolute block h-[1.5px] w-[22px] rounded-full bg-current transition-transform duration-300" style={{ transform: apen ? 'rotate(45deg)' : 'translateY(-4px)', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
              <span aria-hidden="true" className="absolute block h-[1.5px] w-[22px] rounded-full bg-current transition-transform duration-300" style={{ transform: apen ? 'rotate(-45deg)' : 'translateY(4px)', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobilark — utenfor header (backdrop-filter ville gjort fixed-høyden 0) */}
      <div
        className="fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto bg-[#F3F1EC] lg:hidden"
        style={{ opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateY(-8px)', transition: 'opacity 260ms cubic-bezier(0.22,1,0.36,1), transform 260ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: apen ? 'auto' : 'none', visibility: apen ? 'visible' : 'hidden' }}
        aria-hidden={!apen}
        data-testid="v4-mobilmeny"
      >
        <div className="flex min-h-full flex-col px-6 pb-8 pt-4">
          <nav className="flex flex-col" aria-label="Mobilmeny">
            {[...LENKER, ['Om oss', '/om-oss']].map(([l, h]) => (h.startsWith('#')
              ? <a key={l} href={h} onClick={() => setApen(false)} className="border-b border-[#15130F]/[0.08] py-4 text-[26px] text-[#15130F]" style={{ fontFamily: 'var(--font-heading)' }}>{l}</a>
              : <Link key={l} href={h} onClick={() => setApen(false)} className="border-b border-[#15130F]/[0.08] py-4 text-[26px] text-[#15130F]" style={{ fontFamily: 'var(--font-heading)' }}>{l}</Link>))}
          </nav>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Knapp href="/omvisning">Se DigiHome</Knapp>
            <Knapp href={site.loginUrl} variant="lys">Logg inn</Knapp>
          </div>
        </div>
      </div>
    </>
  );
}
