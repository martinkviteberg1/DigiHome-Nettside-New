'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { site } from '@/lib/site';
import { Knapp } from './motion';
import { useKapittelbar } from './kapittelbar';
import { EASE, T } from './tokens';
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

/* Kapitlene i linja: navn + 2 px spor som fylles i takt med filmen (som i seksjonens egen bar). Desktop: sentrert,
   absolutt, så merke og knapper står stille. Mobil: i midtfeltet mellom merke og hamburger, uten numre. */
function NavKapitler({ kap }) {
  const { tabs, aktiv, frem, kapitler, velg } = kap;
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = window.requestAnimationFrame(() => setVis(true)); return () => window.cancelAnimationFrame(t); }, []);
  return (
    <div
      role="tablist"
      aria-label="Kapitler"
      className="flex min-w-0 flex-1 items-stretch justify-center gap-0.5 sm:gap-1 lg:absolute lg:left-1/2 lg:top-0 lg:h-full lg:w-auto lg:flex-none lg:-translate-x-1/2 lg:gap-2"
      style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 260ms ${EASE} 60ms, transform 320ms ${EASE} 60ms` }}
      data-testid="v4-nav-kapitler"
    >
      {tabs.map((t, i) => {
        const er = t.id === aktiv;
        const idx = kapitler.indexOf(t.id);
        const ferdig = t.klar && idx > -1 && idx < kapitler.indexOf(aktiv);
        const andel = er ? Math.round((frem?.andel || 0) * 1000) / 10 : ferdig ? 100 : 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={er}
            aria-disabled={!t.klar}
            onClick={() => velg(t.id)}
            className={`group flex min-w-0 flex-col justify-center gap-[7px] rounded-[9px] px-1.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 sm:px-2 lg:min-w-[112px] lg:px-2.5 ${t.klar ? '' : 'cursor-default'}`}
            style={{ color: er ? T.ink : t.klar ? 'rgba(21,19,15,0.62)' : 'rgba(21,19,15,0.32)' }}
            data-testid={`v4-nav-kap-${t.id}`}
          >
            <span className={`flex items-baseline gap-1.5 whitespace-nowrap text-[12.5px] leading-none tracking-[-0.005em] transition-colors duration-300 sm:text-[13.5px] lg:text-[14px] ${er ? 'font-medium' : t.klar ? 'group-hover:text-[#15130F]' : ''}`}>
              <span className="hidden text-[10.5px] font-medium tabular-nums lg:inline" style={{ color: er ? T.lilla : 'rgba(21,19,15,0.42)', transition: `color 300ms ${EASE}` }}>0{i + 1}</span>
              <span className="truncate">{t.navn}</span>
            </span>
            <span aria-hidden="true" className="relative block h-[2px] w-full overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.12)' }}>
              <span className="absolute inset-y-0 left-0 rounded-full" style={{ background: er ? T.lilla : 'rgba(21,19,15,0.38)', width: `${andel}%`, transition: er && frem?.ms ? `width ${frem.ms}ms linear, background-color 300ms ${EASE}` : `width 320ms ${EASE}, background-color 300ms ${EASE}` }} data-testid={er ? 'v4-nav-kap-fremdrift' : undefined} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* `bg` — bakgrunn for linja (gamle sider har varm hvit flate, V4-sidene canvas). `bgTett` — samme flate uten
   gjennomsiktighet, brukt under lg: en sticky linje med backdrop-blur over video og animasjoner tegnes om for hver
   scroll-frame på mobil. Fra lg beholdes den frostede flaten. */
export default function NavV4({ bg = 'rgba(243,241,236,0.85)', bgTett = '#F3F1EC' } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [apen, setApen] = useState(false);
  const [velger, setVelger] = useState(false);
  /* Kapitlene fra produktseksjonen når dens bar ellers ville festet seg under oss: da bytter linja innhold —
     merke · kapitler · hamburger — i stedet for to linjer oppå hverandre. */
  const kap = useKapittelbar();
  const medKap = !!kap;

  /* Åpne veiskillet i stedet for å navigere — men la modifikator-klikk gå til /kom-i-gang */
  const apneVelger = (e) => {
    if (e && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1)) return;
    e?.preventDefault?.();
    setApen(false);
    setVelger(true);
  };
  const lukkVelger = useCallback(() => setVelger(false), []);

  useEffect(() => {
    /* rAF-throttlet: én lesing av scrollY per frame (aldri flere tvungne layout-flushes per frame) */
    let raf = 0;
    const f = () => { raf = 0; setScrolled(window.scrollY > 8); };
    const on = () => { if (!raf) raf = window.requestAnimationFrame(f); };
    f();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); if (raf) window.cancelAnimationFrame(raf); };
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
      <header className={`sticky top-0 z-50 border-b bg-[var(--dh-nav-tett)] transition-colors duration-300 lg:bg-[var(--dh-nav-bg)] lg:backdrop-blur-md ${scrolled || apen ? 'border-[#15130F]/[0.08]' : 'border-transparent'}`} style={{ '--dh-nav-bg': bg, '--dh-nav-tett': bgTett }} data-testid="v4-nav">
        {/* Samme kanter som scenen på forsiden: 1600 maks, 32 px marg på desktop. */}
        <div className="relative mx-auto flex h-[72px] w-full max-w-[1600px] items-center justify-between gap-4 px-5 sm:gap-6 sm:px-8 lg:h-[64px] lg:w-[calc(100%-64px)] lg:px-0" data-kapitler={medKap ? '1' : '0'}>
          <div className="flex min-w-0 items-center gap-6">
            <Link href="/" className="flex shrink-0 items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" onClick={() => setApen(false)} data-testid="v4-logo">
              {/* Med kapitler på smal skjerm: bare merket (ordet trenger plassen) */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digihome-hero-logo.svg" alt="DigiHome" className={`h-[23px] w-auto lg:h-[20px] ${medKap ? 'hidden min-[420px]:block' : ''}`} />
              {medKap && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src="/brand/digihome-icon-purple.svg" alt="DigiHome" className="h-[22px] w-[22px] min-[420px]:hidden" />
              )}
            </Link>
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Hovedmeny" style={{ opacity: medKap ? 0 : 1, transform: medKap ? 'translateY(-6px)' : 'none', pointerEvents: medKap ? 'none' : 'auto', transition: `opacity 220ms ${EASE}, transform 300ms ${EASE}` }} aria-hidden={medKap}>
              {LENKER.map(([l, h]) => (h.startsWith('#')
                ? <a key={l} href={h} className={lenke} tabIndex={medKap ? -1 : undefined}>{l}</a>
                : <Link key={l} prefetch={false} href={h} className={lenke} tabIndex={medKap ? -1 : undefined}>{l}</Link>))}
            </nav>
          </div>
          {/* Kapitlene — midt i linja på desktop, i midtfeltet på mobil */}
          {medKap && <NavKapitler kap={kap} />}
          <div className="flex shrink-0 items-center gap-2">
            <a href={site.loginUrl} className={`${lenke} hidden ${medKap ? 'lg:hidden' : 'sm:inline-flex'}`}>Logg inn</a>
            <Knapp href="/kom-i-gang" size="sm" className={`hidden ${medKap ? 'lg:inline-flex' : 'sm:inline-flex'}`} onClick={apneVelger} aria-haspopup="dialog" aria-expanded={velger} data-testid="v4-nav-cta">Kom i gang</Knapp>
            <button type="button" onClick={() => setApen((v) => !v)} aria-expanded={apen} aria-label={apen ? 'Lukk meny' : 'Åpne meny'} className={`relative -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-[#15130F] transition-colors hover:bg-[#15130F]/[0.05] ${medKap ? '' : 'lg:hidden'}`} data-testid="v4-meny-knapp">
              {/* To streker, 22 px. Blir et kryss når menyen er åpen. */}
              <span aria-hidden="true" className="absolute block h-[1.5px] w-[22px] rounded-full bg-current transition-transform duration-300" style={{ transform: apen ? 'rotate(45deg)' : 'translateY(-4px)', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
              <span aria-hidden="true" className="absolute block h-[1.5px] w-[22px] rounded-full bg-current transition-transform duration-300" style={{ transform: apen ? 'rotate(-45deg)' : 'translateY(4px)', transitionTimingFunction: 'cubic-bezier(0.22,1,0.36,1)' }} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobilark — utenfor header (backdrop-filter ville gjort fixed-høyden 0) */}
      <div
        className={`fixed inset-x-0 bottom-0 top-[72px] z-40 overflow-y-auto bg-[#F3F1EC] ${medKap ? 'lg:top-[64px]' : 'lg:hidden'}`}
        style={{ opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateY(-8px)', transition: 'opacity 260ms cubic-bezier(0.22,1,0.36,1), transform 260ms cubic-bezier(0.22,1,0.36,1)', pointerEvents: apen ? 'auto' : 'none', visibility: apen ? 'visible' : 'hidden' }}
        aria-hidden={!apen}
        data-testid="v4-mobilmeny"
      >
        <div className="mx-auto flex min-h-full w-full max-w-[720px] flex-col px-6 pb-8 pt-4 lg:pt-10">
          <nav className="flex flex-col" aria-label="Mobilmeny">
            {[...LENKER, ['Om oss', '/om-oss']].map(([l, h]) => (h.startsWith('#')
              ? <a key={l} href={h} onClick={() => setApen(false)} className="border-b border-[#15130F]/[0.08] py-4 text-[26px] text-[#15130F]" style={{ fontFamily: 'var(--font-heading)' }}>{l}</a>
              : <Link key={l} prefetch={false} href={h} onClick={() => setApen(false)} className="border-b border-[#15130F]/[0.08] py-4 text-[26px] text-[#15130F]" style={{ fontFamily: 'var(--font-heading)' }}>{l}</Link>))}
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
