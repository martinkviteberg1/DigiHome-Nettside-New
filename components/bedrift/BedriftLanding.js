'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight, ArrowUpRight, FileSignature, ClipboardList, FolderOpen,
  BarChart3, Users, Home, Check, Phone,
} from 'lucide-react';
import { site } from '@/lib/site';
import { track } from '@/lib/analytics';

/* ---------------------------------------------------------------------------
   DigiHome for bedrifter — one-pager med ankermeny.

   Posisjonering: «Systemet bak DigiHome» — bygget av forvaltere, brukt hver
   dag på egen portefølje. Dramaturgi: løftet → produktet → beviset →
   modulene → den norske standarden → sikkerhet → FAQ → mørk CTA.
   Demo-drevet (ingen priser i v1) — primær-CTA er /book-mote.
--------------------------------------------------------------------------- */

const heading = { fontFamily: 'var(--font-heading), sans-serif' };

const ANKRE = [
  { href: '#moduler', label: 'Moduler' },
  { href: '#norsk', label: 'Norsk standard' },
  { href: '#sikkerhet', label: 'Sikkerhet' },
  { href: '#faq', label: 'FAQ' },
];

const MODULER = [
  { ikon: Home, tittel: 'Leieforhold', tekst: 'Kontrakter, depositum og innbetalinger — full status på hvert leieforhold, med varsel når noe krever deg.' },
  { ikon: FileSignature, tittel: 'Signering med BankID', tekst: 'Leiekontrakter signeres digitalt via Posten signering. Juridisk trygt, arkivert automatisk på riktig enhet.' },
  { ikon: ClipboardList, tittel: 'Saker og frister', tekst: 'Oppgaver med ansvarlig, frist og automatiske påminnelser. Ingenting glipper mellom e-posttråder.' },
  { ikon: FolderOpen, tittel: 'Dokumenter og datarom', tekst: 'Alt samlet per enhet og selskap — delbart med revisor, styre og investorer når de trenger det.' },
  { ikon: BarChart3, tittel: 'Økonomi og rapportering', tekst: 'Nøkkeltall, budsjett og enhetsøkonomi i sanntid. Tallene er klare før styremøtet, ikke etter.' },
  { ikon: Users, tittel: 'Roller og innsyn', tekst: 'Hver person ser akkurat det de skal — forvaltere, eiere og investorer i samme system, med hver sin tilgang.' },
];

const NORSK = [
  ['Husleieloven innebygd', 'Kontrakter, depositum og frister følger norsk lov — ikke en oversatt mal.'],
  ['Depositum riktig fra start', 'Depositumskonto etter husleielovens krav, dokumentert på leieforholdet.'],
  ['BankID i alle signeringer', 'Norsk eID gjennom Posten — ingen printede kontrakter, ingen tvil om identitet.'],
  ['Bygget i Bergen', 'Norsk team, norsk support — og et produkt som snakker språket til norsk eiendomsdrift.'],
];

const SIKKERHET = [
  ['Rollebasert tilgang', 'Eier, administrator, forvalter og innsynsroller — tilgang styres per modul og person.'],
  ['Sikker pålogging', 'Personlige kontoer med invitasjonsflyt, engangslenker og passordkrav.'],
  ['Sporbar aktivitet', 'Endringer og hendelser logges på sak og leieforhold — historikken er alltid hel.'],
  ['Investorinnsyn uten risiko', 'Gi styret og investorer lesetilgang til tall og dokumenter — aldri til driften.'],
];

const FAQ = [
  ['Hva koster det?', 'Prisen tilpasses porteføljens størrelse og hvilke moduler dere trenger. Book en demo, så får dere et konkret forslag samme uke.'],
  ['Hvor raskt kan vi komme i gang?', 'Oppsett tar dager, ikke måneder. Vi hjelper dere med å legge inn enheter, leieforhold og brukere.'],
  ['Kan vi bytte fra dagens system?', 'Ja. Vi bistår i overgangen og legger inn porteføljen sammen med dere, slik at ingenting faller mellom to stoler.'],
  ['Fungerer det for både 5 og 500 enheter?', 'Ja — samme flate. Roller, saker og rapportering er bygget for å skalere med porteføljen.'],
];

/* Abstrakt produktglimt — en rolig, monokrom skisse av driftsflaten.
   Ingen ekte data, ingen skjermbilder av kunder. */
function ProduktRamme() {
  return (
    <div className="overflow-hidden rounded-[16px] bg-white shadow-[0_44px_110px_-44px_rgba(23,18,12,0.42)] ring-1 ring-black/[0.07] sm:rounded-[20px]" aria-hidden="true">
      {/* Nettleserlinje */}
      <div className="flex items-center gap-2 border-b border-[#EDE9E2] bg-[#FAF8F4] px-4 py-2.5">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => <span key={i} className="h-[9px] w-[9px] rounded-full bg-[#E2DCD2]" />)}
        </span>
        <span className="mx-auto rounded-[6px] bg-white px-6 py-[3px] text-[10.5px] text-[#a49e93] ring-1 ring-black/[0.04]">app.digihome.no</span>
      </div>
      <div className="flex">
        {/* Sidemeny */}
        <div className="hidden w-[168px] shrink-0 border-r border-[#EDE9E2] bg-[#FCFBF9] p-3.5 sm:block">
          <div className="mb-3 h-[14px] w-[86px] rounded-[4px] bg-[#0A0A0A]" />
          {['Leieforhold', 'Saker', 'Dokumenter', 'Økonomi', 'Brukere'].map((m, i) => (
            <div key={m} className={`mb-0.5 rounded-[7px] px-2.5 py-[7px] text-[11.5px] font-medium ${i === 0 ? 'bg-[#0A0A0A] text-white' : 'text-[#6F6A60]'}`}>{m}</div>
          ))}
        </div>
        {/* Innhold: leieforhold-tabell */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-[14px] font-bold text-[#0A0A0A]" style={heading}>Leieforhold</span>
            <span className="text-[10.5px] text-[#a49e93]">142 aktive · 97 % utleid</span>
          </div>
          <div className="mt-3 overflow-hidden rounded-[10px] ring-1 ring-black/[0.05]">
            {[
              ['Kong Oscars gate 12 · H0301', 'Betalt', '#1f7a45'],
              ['Strandgaten 8 · H0202', 'Betalt', '#1f7a45'],
              ['Nygårdsgaten 44 · H0501', 'Forfall i dag', '#9a6b1c'],
              ['Marken 3 · H0102', 'Venter på signering', '#7c3aed'],
            ].map(([adr, status, farge], i) => (
              <div key={adr} className={`flex items-center justify-between gap-3 px-3.5 py-[9px] text-[11.5px] ${i % 2 ? 'bg-[#FCFBF9]' : 'bg-white'}`}>
                <span className="truncate font-medium text-[#3A3733]">{adr}</span>
                <span className="flex shrink-0 items-center gap-1.5 font-semibold" style={{ color: farge }}>
                  <span className="h-[5px] w-[5px] rounded-full" style={{ background: farge }} />{status}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[['Leieinntekt / mnd', '2,41 mkr'], ['Åpne saker', '7'], ['Signeringer i kø', '2']].map(([l, v]) => (
              <div key={l} className="rounded-[10px] bg-[#FAF8F4] px-3 py-2.5 ring-1 ring-black/[0.04]">
                <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[#a49e93]">{l}</p>
                <p className="mt-0.5 text-[13.5px] font-bold text-[#0A0A0A] tabular-nums" style={heading}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BedriftLanding() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 8);
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  const demoKlikk = (hvor) => { try { track('bedrift_demo_klikk', { hvor }); } catch (e) { /* ok */ } };

  return (
    <div className="min-h-screen bg-[#FDFCFB]" data-testid="bedrift-side">
      {/* ── Egen slank header: logo + ankre + demo-CTA ── */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'border-b border-[#E6E1D9] bg-[#FDFCFB]/90 backdrop-blur-md' : 'bg-transparent'}`}>
        <div className="mx-auto flex h-[64px] w-full max-w-[1200px] items-center justify-between px-6 sm:px-10">
          <Link href="/" className="flex shrink-0 items-center" data-testid="bedrift-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[22px] w-auto" />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {ANKRE.map((a) => (
              <a key={a.href} href={a.href} className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#1f1f1f]/70 transition-colors hover:bg-[#0a0a0a]/[0.045] hover:text-[#0a0a0a]">
                {a.label}
              </a>
            ))}
          </nav>
          <Link href="/book-mote" prefetch onClick={() => demoKlikk('header')} data-testid="bedrift-header-demo"
            className="e-btn e-btn-dark !h-[40px] !px-4 !text-[13.5px]">
            Book demo
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="mx-auto w-full max-w-[1200px] px-6 pb-14 pt-12 sm:px-10 sm:pb-20 sm:pt-16">
          <p className="e-label dh-cover-inn">DigiHome for bedrifter</p>
          <h1 className="e-display dh-cover-inn mt-4 max-w-[15ch] text-[40px] sm:text-[58px] lg:text-[68px]" style={{ animationDelay: '.06s' }}>
            Hele driften.<br />Én flate<span className="text-[#9B5BD6]">.</span>
          </h1>
          <p className="dh-cover-inn mt-6 max-w-[52ch] text-[16px] leading-[1.65] text-[#6F6A60] sm:text-[17.5px]" style={{ animationDelay: '.14s' }}>
            Driftssystemet bak DigiHome — leieforhold, BankID-signering, saker, dokumenter
            og økonomi i ett rolig arbeidsrom. For selskaper med 5 til 1000 enheter.
          </p>
          <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: '.2s' }}>
            <Link href="/book-mote" prefetch onClick={() => demoKlikk('hero')} data-testid="bedrift-hero-demo" className="e-btn e-btn-dark group">
              Book en demo
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <a href="#moduler" className="e-btn e-btn-ghost">Se modulene</a>
          </div>
          <div className="dh-cover-inn mt-12 sm:mt-16" style={{ animationDelay: '.28s' }}>
            <ProduktRamme />
          </div>
        </section>

        {/* ── Beviset: vi bruker det selv ── */}
        <section className="border-y border-[#E6E1D9] bg-[#F6F3EE]">
          <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-6 py-12 sm:px-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
            <div>
              <p className="e-label">Bygget av forvaltere</p>
              <h2 className="e-display mt-3 max-w-[20ch] text-[26px] sm:text-[34px]">Vi driver vår egen portefølje på systemet. Hver dag.</h2>
            </div>
            <p className="self-end text-[15px] leading-[1.7] text-[#6F6A60] sm:text-[16px]">
              DigiHome Forvaltning drifter hele sin portefølje i Bergen på nøyaktig samme
              system som du får. Hver funksjon er født av et reelt behov i drift — ikke
              i et møterom. Det betyr færre, bedre funksjoner, og et produkt som blir
              skarpere for hver måned vi selv bruker det.
            </p>
          </div>
        </section>

        {/* ── Modulene ── */}
        <section id="moduler" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 py-16 sm:px-10 sm:py-24">
          <p className="e-label">Modulene</p>
          <h2 className="e-display mt-3 max-w-[22ch] text-[28px] sm:text-[38px]">Alt driften trenger. Ingenting den ikke trenger.</h2>
          <div className="mt-10 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
            {MODULER.map((m) => (
              <div key={m.tittel} className="rounded-[18px] bg-white p-6 ring-1 ring-black/[0.05] shadow-[0_1px_3px_rgba(23,18,12,0.04)] sm:p-7" data-testid={`bedrift-modul-${m.tittel.toLowerCase().replace(/[^a-zæøå]+/g, '-')}`}>
                <span className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-[#0A0A0A] text-white">
                  <m.ikon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </span>
                <h3 className="mt-4 text-[17px] font-bold tracking-[-0.015em] text-[#0A0A0A]" style={heading}>{m.tittel}</h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[#6F6A60]">{m.tekst}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Den norske standarden ── */}
        <section id="norsk" className="scroll-mt-20 border-t border-[#E6E1D9]">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-16 sm:px-10 sm:py-24">
            <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
              <div>
                <p className="e-label">Norsk standard</p>
                <h2 className="e-display mt-3 max-w-[16ch] text-[28px] sm:text-[38px]">Utenlandske systemer kan ikke norsk utleie.</h2>
                <p className="mt-5 max-w-[44ch] text-[15px] leading-[1.7] text-[#6F6A60] sm:text-[16px]">
                  Husleieloven, depositumskonto og BankID er ikke tillegg i DigiHome —
                  det er grunnmuren. Dere slipper å oversette norsk drift til et
                  system bygget for et annet marked.
                </p>
              </div>
              <ul className="grid content-center gap-3 sm:grid-cols-2 sm:gap-4">
                {NORSK.map(([t, b]) => (
                  <li key={t} className="rounded-[16px] bg-white p-5 ring-1 ring-black/[0.05]">
                    <p className="flex items-center gap-2 text-[14.5px] font-bold tracking-[-0.01em] text-[#0A0A0A]" style={heading}>
                      <Check className="h-4 w-4 shrink-0 text-[#1f7a45]" strokeWidth={2.5} />{t}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-[1.6] text-[#6F6A60]">{b}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ── Sikkerhet og roller ── */}
        <section id="sikkerhet" className="scroll-mt-20 border-t border-[#E6E1D9] bg-[#F6F3EE]">
          <div className="mx-auto w-full max-w-[1200px] px-6 py-16 sm:px-10 sm:py-24">
            <p className="e-label">Sikkerhet og roller</p>
            <h2 className="e-display mt-3 max-w-[24ch] text-[28px] sm:text-[38px]">Riktig innsyn til riktig person.</h2>
            <div className="mt-10 grid gap-x-12 gap-y-7 sm:grid-cols-2 sm:mt-12">
              {SIKKERHET.map(([t, b]) => (
                <div key={t} className="border-t border-[#DED8CD] pt-5">
                  <p className="text-[15.5px] font-bold tracking-[-0.01em] text-[#0A0A0A]" style={heading}>{t}</p>
                  <p className="mt-1.5 max-w-[52ch] text-[13.5px] leading-[1.65] text-[#6F6A60]">{b}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" className="mx-auto w-full max-w-[1200px] scroll-mt-20 px-6 py-16 sm:px-10 sm:py-24">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-20">
            <div>
              <p className="e-label">Spørsmål og svar</p>
              <h2 className="e-display mt-3 max-w-[14ch] text-[28px] sm:text-[36px]">Det folk lurer på.</h2>
              <p className="mt-4 max-w-[38ch] text-[14.5px] leading-[1.65] text-[#6F6A60]">
                Fant du ikke svaret? Ta det i demoen — eller send en e-post til{' '}
                <a href={`mailto:${site.email}`} className="font-semibold text-[#7c3aed] hover:underline">{site.email}</a>.
              </p>
            </div>
            <div>
              {FAQ.map(([sp, sv]) => (
                <details key={sp} className="group border-b border-[#E6E1D9] py-5 first:pt-0">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15.5px] font-semibold tracking-[-0.01em] text-[#0A0A0A] [&::-webkit-details-marker]:hidden" style={heading}>
                    {sp}
                    <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full ring-1 ring-black/[0.1] transition-transform duration-300 group-open:rotate-45">
                      <span className="text-[15px] leading-none text-[#6F6A60]">+</span>
                    </span>
                  </summary>
                  <p className="mt-3 max-w-[62ch] text-[14px] leading-[1.7] text-[#6F6A60]">{sv}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Mørk avslutning ── */}
        <section className="relative overflow-hidden bg-[#0B0A09] text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-40 right-[-8%] h-[620px] w-[620px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(155,91,214,0.15) 0%, transparent 62%)' }}
          />
          <div className="relative mx-auto w-full max-w-[1200px] px-6 py-20 sm:px-10 sm:py-28">
            <h2 className="e-display max-w-[16ch] text-[34px] !text-white sm:text-[52px]">Se systemet på din portefølje.</h2>
            <p className="mt-6 max-w-[46ch] text-[16px] leading-[1.65] text-white/65 sm:text-[17.5px]">
              30 minutter. Vi viser dere flaten på ekte drift — og setter opp et
              konkret forslag for deres portefølje samme uke.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/book-mote" prefetch onClick={() => demoKlikk('bunn')} data-testid="bedrift-bunn-demo" className="e-btn e-btn-light group">
                Book en demo
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <a href={`tel:${site.phoneHref}`} className="e-btn e-btn-ghost !border-white/25 !text-white hover:!border-white/60 hover:!bg-white/[0.06]">
                <Phone className="h-4 w-4" /> {site.phone}
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ── Slank egen footer ── */}
      <footer className="bg-[#0B0A09] text-white">
        <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] px-6 py-7 sm:px-10">
          <p className="text-[12.5px] text-white/40">© {new Date().getFullYear()} DigiHome</p>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
            <Link href="/privat" className="group flex items-center gap-1 text-white/60 transition-colors hover:text-white">
              DigiHome Forvaltning — for boligeiere <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />
            </Link>
            <a href={`mailto:${site.email}`} className="text-white/60 transition-colors hover:text-white">Kontakt</a>
            <a href={site.loginUrl} className="text-white/60 transition-colors hover:text-white">Logg inn</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
