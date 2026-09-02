'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, Menu, X, Megaphone, FileSignature, Banknote, Wrench,
  MessageSquare, Smartphone, User, ShieldCheck, Building2, Newspaper, BookOpen,
  BarChart3, Calculator, Compass, Mail, KeyRound, Home,
} from 'lucide-react';
import { site } from '@/lib/site';
import { EASE, Knapp } from './motion';

/* ---------------------------------------------------------------------------
   Nav — full bredde, rolig verktøylinje. Følger tonen under seg:
   mørk over mørke seksjoner (hero, Autopilot, Bergen, CTA), lys glass over
   lyse. Seksjoner merkes med data-tone="mork|lys". Logo + lenker venstre,
   handlinger høyre. Fullbredde-nedtrekk (hover + trykk, Escape lukker).
   Mobil: fullskjerm-ark i samme tone.
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
  { Ikon: User, t: 'Privat huseier', b: 'Én eller noen få boliger. Full kontroll, null papir.', href: '/privat' },
  { Ikon: ShieldCheck, t: 'Full forvaltning', b: 'Vi tar jobben. Du ser alt. Bergen og omegn.', href: '/forvaltning' },
  { Ikon: Building2, t: 'Bedrift og portefølje', b: 'Hele eiendomsmassen på én flate. Team, saker, økonomi.', href: '/bedrift' },
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

/* Tone-avledede klasser. Alt som skifter farge ligger her. */
function tema(mork) {
  return {
    header: mork ? 'bg-[#0D0B0F]/90 text-white' : 'bg-[#FAF8F4]/88 text-[#0F0E10]',
    kant: mork ? 'border-white/[0.08]' : 'border-[#0F0E10]/[0.08]',
    lenke: mork ? 'text-white/65 hover:bg-white/[0.06] hover:text-white' : 'text-[#0F0E10]/65 hover:bg-[#0F0E10]/[0.05] hover:text-[#0F0E10]',
    aktiv: mork ? 'bg-white/[0.08] text-white' : 'bg-[#0F0E10]/[0.06] text-[#0F0E10]',
    ikonKnapp: mork ? 'text-white hover:bg-white/[0.06]' : 'text-[#0F0E10] hover:bg-[#0F0E10]/[0.05]',
    panel: mork ? 'border-white/[0.08] bg-[#121016] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]' : 'border-[#0F0E10]/[0.08] bg-white shadow-[0_40px_80px_-50px_rgba(30,20,40,0.35)]',
    tekst: mork ? 'text-white' : 'text-[#0F0E10]',
    sub: mork ? 'text-white/50' : 'text-[#0F0E10]/55',
    etikett: mork ? 'text-white/40' : 'text-[#8A867F]',
    ikon: mork ? 'bg-white/[0.06] text-white group-hover:bg-white group-hover:text-[#0D0B0F]' : 'bg-[#0F0E10]/[0.05] text-[#0F0E10] group-hover:bg-[#0F0E10] group-hover:text-white',
    hover: mork ? 'hover:bg-white/[0.05]' : 'hover:bg-[#0F0E10]/[0.04]',
    promo: mork ? 'bg-white text-[#0D0B0F]' : 'bg-[#0F0E10] text-white',
    promoSub: mork ? 'text-[#8A867F]' : 'text-white/50',
    ark: mork ? 'bg-[#0D0B0F] text-white' : 'bg-[#FAF8F4] text-[#0F0E10]',
    arkKort: mork ? 'border-white/[0.08] bg-[#16131B]' : 'border-[#0F0E10]/[0.08] bg-white',
    fokus: mork ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60' : 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F0E10]/40',
    logo: mork ? '/digihome-logo-white.svg' : '/digihome-hero-logo.svg',
    cta: mork ? 'primar' : 'lys',
    ctaSek: mork ? 'sekundar' : 'lysSekundar',
  };
}

/* Hvilken tone ligger under navlinjen akkurat nå? Siste [data-tone] med topp
   over navens midtpunkt vinner. rAF-throttlet. */
function useTone() {
  const [mork, setMork] = useState(true);
  useEffect(() => {
    let raf = 0;
    const mal = () => {
      raf = 0;
      const y = 32;
      let t = 'mork';
      document.querySelectorAll('[data-tone]').forEach((el) => {
        if (el.getBoundingClientRect().top <= y) t = el.dataset.tone;
      });
      setMork(t !== 'lys');
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(mal); };
    mal();
    window.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    return () => {
      window.removeEventListener('scroll', on);
      window.removeEventListener('resize', on);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return mork;
}

function Flis({ Ikon, t, b, href, onClick, tm }) {
  const inner = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] transition-colors duration-300 ${tm.ikon}`}><Ikon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
      <span className="min-w-0">
        <span className={`block text-[14.5px] font-medium tracking-[-0.01em] ${tm.tekst}`}>{t}</span>
        {b && <span className={`mt-0.5 block text-[13px] leading-[1.5] ${tm.sub}`}>{b}</span>}
      </span>
    </>
  );
  const cls = `group flex items-start gap-3.5 rounded-[12px] p-3 transition-colors duration-200 ${tm.hover} ${tm.fokus}`;
  return href.startsWith('#')
    ? <a href={href} className={cls} onClick={onClick}>{inner}</a>
    : <Link href={href} className={cls} onClick={onClick}>{inner}</Link>;
}

function Panel({ id, apen, tm, children }) {
  return (
    <div
      className={`absolute inset-x-0 top-full border-b transition-colors duration-300 ${tm.panel}`}
      style={{ opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateY(-6px)', transition: `opacity 260ms ${EASE}, transform 260ms ${EASE}, background-color 300ms, border-color 300ms`, pointerEvents: apen ? 'auto' : 'none', visibility: apen ? 'visible' : 'hidden' }}
      role="region"
      aria-label={id}
      data-testid={`v3-panel-${id}`}
    >
      <div className="mx-auto w-full max-w-[1280px] px-6 py-8 sm:px-8">{children}</div>
    </div>
  );
}

export default function Nav({ onCta }) {
  const [scrolled, setScrolled] = useState(false);
  const [apen, setApen] = useState(null);
  const [mobil, setMobil] = useState(false);
  const timer = useRef(null);
  const mork = useTone();
  const tm = tema(mork);

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

  const lenke = `${tm.fokus} inline-flex h-8 items-center rounded-[8px] px-2.5 text-[14.5px] font-normal transition-colors duration-200`;

  return (
    <>
    <header
      className={`sticky top-0 z-50 border-b backdrop-blur-md transition-colors duration-300 ${tm.header} ${scrolled || apen || mobil ? tm.kant : 'border-transparent'}`}
      onMouseLeave={lukk}
      data-testid="v3-nav"
      data-tone-nav={mork ? 'mork' : 'lys'}
    >
      <div className="relative flex h-[64px] w-full items-center justify-between gap-6 px-5 sm:px-6 lg:px-8">
        {/* Venstreklynge: logo + lenker */}
        <div className="flex min-w-0 items-center gap-2 lg:gap-5">
          <Link href="/" className={`flex shrink-0 items-center rounded-md ${tm.fokus}`} data-testid="v3-logo" onClick={lukkAlt}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tm.logo} alt="DigiHome" className="h-[20px] w-auto" />
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
                className={`${lenke} ${apen === m.id ? tm.aktiv : tm.lenke}`}
              >
                {m.label}
              </button>
            ) : (
              <Link key={m.id} href={m.href} onMouseEnter={lukk} data-testid={`v3-nav-${m.id}`} className={`${lenke} ${tm.lenke}`}>{m.label}</Link>
            ))}
          </nav>
        </div>

        {/* Høyreklynge */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2" onMouseEnter={lukk}>
          <a href={site.loginUrl} className={`${lenke} hidden sm:inline-flex ${tm.lenke}`}>Logg inn</a>
          <Knapp href="/bli-utleier/start" variant={tm.cta} size="sm" onClick={() => { onCta && onCta('nav'); lukkAlt(); }} data-testid="v3-nav-cta">Kom i gang</Knapp>
          <button type="button" onClick={() => setMobil((v) => !v)} aria-expanded={mobil} aria-label={mobil ? 'Lukk meny' : 'Åpne meny'} data-testid="v3-meny-knapp"
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors lg:hidden ${tm.ikonKnapp} ${tm.fokus}`}>
            {mobil ? <X className="h-5 w-5" strokeWidth={1.8} /> : <Menu className="h-5 w-5" strokeWidth={1.8} />}
          </button>
        </div>

        {/* ── Fullbredde-nedtrekk ── */}
        <div className="absolute inset-x-0 top-full hidden lg:block" onMouseEnter={hold}>
          <Panel id="produkt" apen={apen === 'produkt'} tm={tm}>
            <div className="grid gap-10 lg:grid-cols-[1fr_300px]">
              <div>
                <p className={`mb-3 text-[13px] font-medium ${tm.etikett}`}>Produktet</p>
                <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
                  {PRODUKT.map((p) => <Flis key={p.t} {...p} onClick={lukkAlt} tm={tm} />)}
                </div>
              </div>
              <a href="#reisen" onClick={lukkAlt} className={`group relative flex flex-col justify-between overflow-hidden rounded-[12px] p-6 transition-colors duration-300 ${tm.promo} ${tm.fokus}`}>
                <p className={`relative text-[13px] font-medium ${tm.promoSub}`}>Slik virker det</p>
                <div className="relative mt-10">
                  <p className="text-[22px] font-medium leading-[1.15] tracking-[-0.02em]">Fra annonse til innbetaling — på fem steg.</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold">Se reisen <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>
                </div>
              </a>
            </div>
          </Panel>

          <Panel id="losninger" apen={apen === 'losninger'} tm={tm}>
            <div className="grid gap-10 lg:grid-cols-[1fr_260px]">
              <div>
                <p className={`mb-3 text-[13px] font-medium ${tm.etikett}`}>Løsninger</p>
                <div className="grid gap-1 sm:grid-cols-3">
                  {LOSNINGER.map((l) => (
                    <Link key={l.t} href={l.href} onClick={lukkAlt} className={`group rounded-[12px] p-4 transition-colors duration-200 ${tm.hover} ${tm.fokus}`}>
                      <span className={`flex h-10 w-10 items-center justify-center rounded-[10px] transition-colors duration-300 ${tm.ikon}`}><l.Ikon className="h-[18px] w-[18px]" strokeWidth={1.7} /></span>
                      <span className={`mt-4 block text-[16px] font-medium tracking-[-0.015em] ${tm.tekst}`}>{l.t}</span>
                      <span className={`mt-1 block text-[13px] leading-[1.5] ${tm.sub}`}>{l.b}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <div className={`border-l pl-8 ${tm.kant}`}>
                <p className={`mb-3 text-[13px] font-medium ${tm.etikett}`}>Også for</p>
                <div className="grid gap-1">
                  {LOSNINGER_EKSTRA.map((e) => <Flis key={e.t} {...e} onClick={lukkAlt} tm={tm} />)}
                </div>
              </div>
            </div>
          </Panel>

          <Panel id="ressurser" apen={apen === 'ressurser'} tm={tm}>
            <p className={`mb-3 text-[13px] font-medium ${tm.etikett}`}>Ressurser</p>
            <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-3">
              {RESSURSER.map((r) => <Flis key={r.t} {...r} onClick={lukkAlt} tm={tm} />)}
            </div>
          </Panel>
        </div>
      </div>
    </header>

      {/* ── Mobil: fullskjerm-ark. Ligger UTENFOR header: backdrop-filter på
          headeren ville gjort den til containing block for fixed → høyde 0. ── */}
      <div
        className={`fixed inset-x-0 bottom-0 top-[64px] z-40 overflow-y-auto transition-colors duration-300 lg:hidden ${tm.ark}`}
        style={{ opacity: mobil ? 1 : 0, transform: mobil ? 'none' : 'translateY(-8px)', transition: `opacity 280ms ${EASE}, transform 280ms ${EASE}, background-color 300ms`, pointerEvents: mobil ? 'auto' : 'none', visibility: mobil ? 'visible' : 'hidden' }}
        aria-hidden={!mobil}
        data-testid="v3-mobilmeny"
      >
        <div className="flex min-h-full flex-col px-5 pb-8 pt-4 sm:px-7">
          <nav className="flex flex-col" aria-label="Mobilmeny">
            {[['Produkt', '#produkt'], ['Slik virker det', '#reisen'], ['Løsninger', '#for-hvem'], ['Priser', '/priser'], ['Om oss', '/om-oss'], ['Kontakt', '/kontakt']].map(([l, h]) => (
              h.startsWith('#')
                ? <a key={l} href={h} onClick={lukkAlt} className={`border-b py-4 text-[26px] font-medium tracking-[-0.02em] ${tm.kant} ${tm.tekst}`}>{l}</a>
                : <Link key={l} href={h} onClick={lukkAlt} className={`border-b py-4 text-[26px] font-medium tracking-[-0.02em] ${tm.kant} ${tm.tekst}`}>{l}</Link>
            ))}
          </nav>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {LOSNINGER.map((l) => (
              <Link key={l.t} href={l.href} onClick={lukkAlt} className={`flex items-center gap-3 rounded-[12px] border p-3.5 ${tm.arkKort}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${tm.ikon}`}><l.Ikon className="h-4 w-4" strokeWidth={1.7} /></span>
                <span className={`text-[14.5px] font-semibold ${tm.tekst}`}>{l.t}</span>
              </Link>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pt-8">
            <Knapp href="/bli-utleier/start" variant={tm.cta} onClick={() => { onCta && onCta('mobilmeny'); lukkAlt(); }}>Kom i gang</Knapp>
            <Knapp href={site.loginUrl} variant={tm.ctaSek}>Logg inn</Knapp>
          </div>
        </div>
      </div>
    </>
  );
}
