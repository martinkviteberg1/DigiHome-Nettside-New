'use client';

import React, { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import Nav from './Nav';
import HeroPortal from './HeroPortal';
import Reisen from './Reisen';
import Bento from './Bento';
import Autopilot from './Autopilot';
import { Statement, Bilde, ForHvem, Trygghet, SluttCTA } from './Seksjoner';
import { EASE, display, Knapp, Lenke, T } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV3 — «Utleie på autopilot», 2026.

   Light-first brand, mørk som kinematisk virkemiddel. Rytme:
     Nav + Hero (mørk) → hard kant → Produktintro, Reisen, Bento (lys)
     → Bergen-bånd (mørk, full bredde) → For hvem, Trygghet (lys)
     → CTA + footer (mørk).

   Overgangen mørk→lys er ren — ingen gradient som skjuler kanten. Produkt-
   vinduet står over kanten, så den lyse portalen kommer «ut av mørket».
   Én aksent (lilla) — kun punktum i H1 og «?» i CTA.
   Ingen segmentvalg på root — målgruppene lever i nav + undersider.
--------------------------------------------------------------------------- */

function MobilCTA({ onKlikk }) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const f = () => {
      const y = window.scrollY;
      const rest = document.documentElement.scrollHeight - y - window.innerHeight;
      setVis(y > 900 && rest > 720);
    };
    f();
    window.addEventListener('scroll', f, { passive: true });
    return () => window.removeEventListener('scroll', f);
  }, []);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0D0B0F]/92 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden"
      style={{ transform: vis ? 'none' : 'translateY(110%)', transition: `transform 380ms ${EASE}` }}
      aria-hidden={!vis}
      data-testid="v3-mobil-cta"
    >
      <div className="flex gap-2">
        <Knapp href="/bli-utleier/start" className="flex-1" onClick={() => onKlikk('mobil-sticky')}>Kom i gang</Knapp>
        <Knapp href="/book-mote" variant="sekundar" className="flex-1">Book en prat</Knapp>
      </div>
    </div>
  );
}

export default function ForsideV3() {
  const klikk = (hvor) => { try { track('forside_cta', { hvor, versjon: 'v3' }); } catch (e) { /* ok */ } };

  /* Myk scroll til ankere (#reisen, #produkt, #for-hvem) — kun på denne siden,
     og kun når brukeren ikke har bedt om redusert bevegelse. */
  useEffect(() => {
    let redusert = false;
    try { redusert = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ok */ }
    if (redusert) return undefined;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'smooth';
    return () => { html.style.scrollBehavior = prev; };
  }, []);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FAF8F4] text-[#0F0E10] antialiased" data-testid="forside-v3">
      <Nav onCta={klikk} />

      <main>
        {/* ── Hero — mørk, med varm undertone ── */}
        <section className="relative bg-[#0D0B0F] text-white" data-tone="mork" data-testid="v3-hero">
          {/* Ett svakt, varmt scenelys ovenfra. Ikke glow på elementer. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[720px]" style={{ background: 'radial-gradient(60% 46% at 50% -8%, rgba(212,150,255,0.13) 0%, rgba(212,150,255,0.04) 45%, transparent 74%)' }} />

          <div className="relative mx-auto w-full max-w-[1280px] px-6 pt-24 sm:px-8 sm:pt-32 lg:pt-40">
            {/* Editorial to-kolonne på lg: overskrift venstre, budskap + handling høyre,
                bunnjustert mot overskriften. Fyller bredden uten å røre overskriften. */}
            <div className="lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end lg:gap-16">
              <h1 className="dh-cover-inn max-w-[12ch] text-[46px] text-white sm:text-[62px] lg:text-[84px]" style={display} data-testid="v3-h1">
                Utleie på autopilot<span style={{ color: T.lilla }}>.</span>
              </h1>
              <div className="mt-6 lg:mt-0 lg:pb-3">
                <p className="dh-cover-inn max-w-[54ch] text-[18px] leading-[1.5] text-white/60 sm:text-[20px] lg:max-w-[38ch]" style={{ animationDelay: '.08s' }}>
                  Alt fra annonse til innbetaling går av seg selv. Du bestemmer hvor mye du vil være med.
                </p>
                <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-5 lg:mt-7" style={{ animationDelay: '.14s' }}>
                  <Knapp href="/bli-utleier/start" onClick={() => klikk('hero')} data-testid="v3-hero-cta">Kom i gang</Knapp>
                  <Lenke mork href="#reisen" data-testid="v3-hero-sekundaer">Se hvordan det virker</Lenke>
                </div>
                {/* Én sann tillitslinje. Ingen tall vi ikke kan dokumentere. */}
                <p className="dh-cover-inn mt-7 text-[13.5px] text-white/40 lg:mt-6" style={{ animationDelay: '.2s' }} data-testid="v3-hero-tillit">
                  Bygget og brukt daglig av DigiHome Forvaltning på egen portefølje i Bergen.
                </p>
              </div>
            </div>
          </div>

          {/* Produktet — står over kanten mellom mørkt og lyst (negativ bunnmarg).
              Ingen maske: innholdet er alltid fullt lesbart. */}
          <div className="dh-cover-inn relative z-10 mx-auto -mb-[88px] mt-16 w-full max-w-[1280px] px-4 sm:-mb-[140px] sm:mt-20 sm:px-8 lg:-mb-[180px]" style={{ animationDelay: '.22s' }} data-testid="v3-hero-produkt">
            <HeroPortal />
          </div>
        </section>

        {/* ── Lys del 1 — hard kant fra mørkt. pt = overlapp fra produktvinduet. ── */}
        <div className="bg-[#FAF8F4] pt-[88px] sm:pt-[140px] lg:pt-[180px]" data-tone="lys" data-testid="v3-lys-1">
          <Statement />
          <Reisen />
          <Bento />
        </div>

        {/* ── Mørkt kapittel — autopiloten + Bergen-bånd. Rytmebrudd. ── */}
        <div data-tone="mork">
          <Autopilot />
          <Bilde />
        </div>

        {/* ── Lys del 2 ── */}
        <div className="bg-[#FAF8F4]" data-tone="lys" data-testid="v3-lys-2">
          <ForHvem />
          <Trygghet />
        </div>

        {/* ── CTA — mørk, går rett i footer ── */}
        <div data-tone="mork">
          <SluttCTA onKlikk={klikk} />
        </div>
      </main>

      <MobilCTA onKlikk={klikk} />
    </div>
  );
}
