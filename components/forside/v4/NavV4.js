'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { site } from '@/lib/site';
import { Knapp } from './motion';
import KomIGangVelger from './start/KomIGangVelger';

/* ---------------------------------------------------------------------------
   NavV4 — lys, stille verktøylinje. Logo, fem lenker, logg inn, én knapp.
   Ingen megamenyer i første versjon. Hairline når siden er scrollet.

   «Kom i gang» åpner veiskillet (Huseier / Eiendomsselskap) som overlay —
   modal på desktop, drawer på mobil. Lenken peker på /kom-i-gang, så
   cmd-klikk, høyreklikk og uten JS fortsatt gir en side.
--------------------------------------------------------------------------- */

const LENKER = [
  ['Produkt', '/#produkt'],
  ['For boligeiere', '/boligeiere'],
  ['For eiendomsselskaper', '/bedrift'],
  ['Forvaltning', '/forvaltning'],
  ['Priser', '/priser'],
];

/* `bg` — bakgrunn for linja (gamle sider har varm hvit flate, V4-sidene canvas). */
export default function NavV4({ bg = 'rgba(243,241,236,0.85)' } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [apen, setApen] = useState(false);
  const [velger, setVelger] = useState(false);

  /* Åpne veiskillet i stedet for å navigere — men la modifikator-klikk gå til /kom-i-gang */
  const apneVelger = (e) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) return;
    e?.preventDefault?.();
    setApen(false);
    setVelger(true);
  };
  const lukkVelger = useCallback(() => setVelger(false), []);

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
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${scrolled || apen ? 'border-[#15130F]/[0.08]' : 'border-transparent'}`} style={{ background: bg }} data-testid="v4-nav">
        {/* Samme kanter som scenen på forsiden: 1600 maks, 32 px marg på desktop. */}
        <div className="mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-6 px-5 sm:px-8 lg:h-[64px] lg:w-[calc(100%-64px)] lg:px-0">
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
            <Knapp href="/kom-i-gang" size="sm" className="hidden sm:inline-flex" onClick={apneVelger} aria-haspopup="dialog" aria-expanded={velger} data-testid="v4-nav-cta">Kom i gang</Knapp>
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
            <Knapp href="/kom-i-gang" onClick={apneVelger} aria-haspopup="dialog" data-testid="v4-nav-cta-mobil">Kom i gang</Knapp>
            <Knapp href={site.loginUrl} variant="lys">Logg inn</Knapp>
          </div>
        </div>
      </div>

      {/* Veiskillet: Huseier / Eiendomsselskap — modal på desktop, drawer på mobil */}
      <KomIGangVelger apen={velger} onLukk={lukkVelger} />
    </>
  );
}
