'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { site } from '@/lib/site';
import { Knapp } from './motion';
import { Kapittelpille, useKapittelbar } from './kapittelbar';
import { EASE, T } from './tokens';
import KomIGangVelger from './start/KomIGangVelger';

/* ---------------------------------------------------------------------------
   NavV4 — lys, stille verktøylinje. Logo, «Produkt» (nedtrekk), tre publikum,
   priser, logg inn, én knapp. Hairline når siden er scrollet.

   «Produkt» samler produktet, husleiekontrakten og forvaltning i ett
   nedtrekk — så publikums-sidene (Boligeiere · Eiendomsselskaper ·
   Utleiemeglere) står tydelig. «Ledige boliger» vises KUN når det faktisk
   finnes publiserte, ledige boliger — med live teller. En død «Alt er utleid»-
   lenke i hovedmenyen er et dårligere førsteinntrykk enn ingen lenke.

   «Kom i gang» åpner veiskillet (Huseier / Eiendomsselskap) som overlay —
   modal på desktop, drawer på mobil. Lenken peker på /kom-i-gang, så
   cmd-klikk, høyreklikk og uten JS fortsatt gir en side.
--------------------------------------------------------------------------- */

const PRODUKT = [
  ['Produktet', '/#produkt', 'Annonse, kontrakt, husleie og drift — i én flate'],
  ['Husleiekontrakt', '/utleier/husleiekontrakt', 'Gratis kontrakt, signert med BankID'],
  ['Forvaltning', '/forvaltning', 'Vi tar hele jobben — du får rapporten'],
];

const LENKER = [
  ['Boligeiere', '/boligeiere'],
  ['Eiendomsselskaper', '/bedrift'],
  ['Utleiemeglere', '/utleiemeglere'],
  ['Priser', '/priser'],
];

/* Antall ledige, publiserte boliger — hentes én gang per fane (5 min cache). 0 eller feil → lenken skjules. */
function useLedigeTall() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    try {
      const c = JSON.parse(window.sessionStorage.getItem('dh_ledige_n') || 'null');
      if (c && typeof c.n === 'number' && Date.now() - c.t < 5 * 60 * 1000) { setN(c.n); return undefined; }
    } catch (e) { /* stille */ }
    (async () => {
      try {
        const r = await fetch('/api/public/listings', { cache: 'no-store' });
        const j = await r.json();
        const k = j && j.ok ? (j.listings || []).filter((l) => l && l.status === 'active').length : 0;
        if (alive) setN(k);
        try { window.sessionStorage.setItem('dh_ledige_n', JSON.stringify({ n: k, t: Date.now() })); } catch (e) { /* stille */ }
      } catch (e) { /* skjul lenken ved feil */ }
    })();
    return () => { alive = false; };
  }, []);
  return n;
}

/* «Produkt» — nedtrekk på hover/fokus. Escape lukker. Panelet er et lite PAPIR-kort med tre lenker og én linje hver. */
function ProduktMeny({ lenke, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const t = useRef(0);
  const vis = () => { window.clearTimeout(t.current); setOpen(true); };
  const skjul = () => { window.clearTimeout(t.current); t.current = window.setTimeout(() => setOpen(false), 140); };
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={vis}
      onMouseLeave={skjul}
      onFocus={vis}
      onBlur={(e) => { if (!ref.current || !ref.current.contains(e.relatedTarget)) skjul(); }}
      onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
      data-testid="v4-nav-produkt"
    >
      <button type="button" className={`${lenke} gap-1`} aria-haspopup="true" aria-expanded={open} tabIndex={disabled ? -1 : undefined} onClick={() => setOpen((v) => !v)} data-testid="v4-nav-produkt-knapp">
        Produkt<ChevronDown className="h-3.5 w-3.5 transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'none' }} strokeWidth={1.8} />
      </button>
      <div
        className="absolute left-0 top-full pt-2"
        style={{ opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-6px)', pointerEvents: open ? 'auto' : 'none', visibility: open ? 'visible' : 'hidden', transition: `opacity 200ms ${EASE}, transform 260ms ${EASE}, visibility 0s ${open ? '0s' : '260ms'}` }}
        data-testid="v4-nav-produkt-meny"
      >
        <div className="w-[304px] rounded-[16px] p-2" style={{ background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 24px 60px -24px rgba(21,19,15,0.35)' }}>
          {PRODUKT.map(([l, h, d]) => (
            <Link key={l} prefetch={false} href={h} onClick={() => setOpen(false)} tabIndex={disabled || !open ? -1 : undefined} className="block rounded-[10px] px-3.5 py-2.5 transition-colors hover:bg-[#15130F]/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" data-testid={`v4-nav-produkt-${h.replace(/[^a-z]/gi, '').toLowerCase()}`}>
              <span className="block text-[14.5px] text-[#15130F]">{l}</span>
              <span className="mt-0.5 block text-[12.5px] text-[#15130F]/55">{d}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Kapitlene i linja — samme segmenterte pille som i seksjonen (Kapittelpille, tema 'nav'). Desktop: sentrert,
   absolutt, så merke og knapper står stille. Mobil: i midtfeltet mellom merke og hamburger, kompakt. */
function NavKapitler({ kap }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = window.requestAnimationFrame(() => setVis(true)); return () => window.cancelAnimationFrame(t); }, []);
  const felles = { tabs: kap.tabs, aktiv: kap.aktiv, frem: kap.frem, kapitler: kap.kapitler, velg: kap.velg, tema: 'nav', testid: 'v4-nav-kap' };
  return (
    <div
      className="flex min-w-0 flex-1 items-center justify-center lg:absolute lg:left-1/2 lg:top-1/2 lg:w-auto lg:flex-none lg:-translate-x-1/2 lg:-translate-y-1/2"
      style={{ opacity: vis ? 1 : 0, transform: undefined, transition: `opacity 260ms ${EASE} 60ms` }}
      data-testid="v4-nav-kapitler"
    >
      <span className="lg:hidden"><Kapittelpille {...felles} kompakt /></span>
      <span className="hidden lg:inline-flex"><Kapittelpille {...felles} /></span>
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
  const ledige = useLedigeTall();

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
              <ProduktMeny lenke={lenke} disabled={medKap} />
              {LENKER.map(([l, h]) => <Link key={l} prefetch={false} href={h} className={lenke} tabIndex={medKap ? -1 : undefined}>{l}</Link>)}
              {ledige > 0 && (
                <Link prefetch={false} href="/ledige-boliger" className={`${lenke} gap-1.5`} tabIndex={medKap ? -1 : undefined} data-testid="v4-nav-ledige">
                  Ledige boliger
                  <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[11.5px] font-medium tabular-nums" style={{ background: T.lilla, color: T.ink }} data-testid="v4-nav-ledige-tall">{ledige}</span>
                </Link>
              )}
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
            {[
              ['Produkt', PRODUKT.map(([l, h]) => [l, h])],
              ['Hvem er du', LENKER.filter(([l]) => l !== 'Priser')],
              [null, [['Priser', '/priser'], ...(ledige > 0 ? [['Ledige boliger', '/ledige-boliger', ledige]] : []), ['Om oss', '/om-oss']]],
            ].map(([gruppe, lenker], gi) => (
              <div key={gruppe || 'rest'} className={gi > 0 ? 'mt-6' : ''}>
                {gruppe ? <p className="pb-1 text-[12.5px] font-medium" style={{ color: 'rgba(21,19,15,0.5)' }}>{gruppe}</p> : null}
                {lenker.map(([l, h, n]) => (
                  <Link key={l} prefetch={false} href={h} onClick={() => setApen(false)} className={`flex items-center justify-between border-b border-[#15130F]/[0.08] py-4 text-[#15130F] ${gruppe ? 'text-[22px]' : 'text-[26px]'}`} style={{ fontFamily: 'var(--font-heading)' }} data-testid={n ? 'v4-mobil-ledige' : undefined}>
                    {l}
                    {n ? <span className="rounded-full px-2.5 py-1 text-[13px] font-medium tabular-nums" style={{ background: T.lilla, color: T.ink, fontFamily: 'var(--font-body), sans-serif' }}>{n}</span> : null}
                  </Link>
                ))}
              </div>
            ))}
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
