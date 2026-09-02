'use client';

import React, { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import Nav from './Nav';
import HeroPortal from './HeroPortal';
import Reisen, { NIVAAER } from './Reisen';
import Bento from './Bento';
import { Statement, Bilde, Nivaa, Trygghet, SluttCTA } from './Seksjoner';
import { EASE, display, Knapp, Lenke } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV3 — «Utleie på autopilot», 2026. Mørk og kinematisk.

   Nær svart canvas, medium vekt, én setning, én aksent. Produktet vises
   alltid ferdig — aldri halvbygd — og forsvinner inn i siden (maske, ikke
   overlegg). Én tilstand (grad av autopilot) styrer heroens vindu, reisens
   «hvem gjør det», nivåkortene og CTAene.

   Hero → Reisen → Statement → Bilde → Bento → Nivå → Trygghet → CTA.
--------------------------------------------------------------------------- */

function MobilCTA({ nivaa, onKlikk }) {
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
  const n = NIVAAER[nivaa];
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#0A0A0B]/92 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden"
      style={{ transform: vis ? 'none' : 'translateY(110%)', transition: `transform 380ms ${EASE}` }}
      aria-hidden={!vis}
      data-testid="v3-mobil-cta"
    >
      <div className="flex gap-2">
        <Knapp href={n.href} className="flex-1" onClick={() => onKlikk('mobil-sticky')}>{n.cta}</Knapp>
        <Knapp href="/book-mote" variant="sekundar" className="flex-1">Book en prat</Knapp>
      </div>
    </div>
  );
}

export default function ForsideV3() {
  const [nivaa, setNivaa] = useState(0);
  const klikk = (hvor) => { try { track('forside_cta', { hvor, versjon: 'v3', nivaa: NIVAAER[nivaa].id }); } catch (e) { /* ok */ } };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#0A0A0B] text-white antialiased" data-testid="forside-v3">
      <Nav onCta={klikk} />

      <main>
        {/* ── Hero ── */}
        <section className="relative" data-testid="v3-hero">
          {/* Kinematisk lys — ett svakt, varmt lys ovenfra. Ikke glow på elementer. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[900px]" style={{ background: 'radial-gradient(60% 45% at 50% -8%, rgba(207,151,252,0.13) 0%, rgba(207,151,252,0.04) 45%, transparent 75%)' }} />
          <div className="relative mx-auto w-full max-w-[1280px] px-6 pt-24 sm:px-8 sm:pt-32 lg:pt-40">
            <h1 className="dh-cover-inn max-w-[12ch] text-[44px] text-white sm:text-[60px] lg:text-[76px]" style={display}>
              Utleie på autopilot<span className="text-[#CF97FC]">.</span>
            </h1>
            <p className="dh-cover-inn mt-6 max-w-[54ch] text-[18px] leading-[1.5] text-white/60 sm:text-[20px]" style={{ animationDelay: '.08s' }}>
              Alt fra annonse til innbetaling går av seg selv.<br className="hidden sm:block" /> Du bestemmer hvor mye du vil være med.
            </p>
            <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-5" style={{ animationDelay: '.14s' }}>
              <Knapp href="/bli-utleier/start" onClick={() => klikk('hero')} data-testid="v3-hero-cta">Kom i gang</Knapp>
              <Lenke href="#reisen" data-testid="v3-hero-sekundaer">Se hvordan det virker</Lenke>
            </div>
          </div>

          {/* Produktet — komplett skjermbilde i skala, maskert inn i siden */}
          <div className="dh-cover-inn relative mx-auto mt-16 w-full max-w-[1280px] px-6 sm:mt-20 sm:px-8" style={{ animationDelay: '.22s' }}>
            <div
              className="relative max-h-[560px] overflow-hidden sm:max-h-[640px] lg:max-h-[700px]"
              style={{ WebkitMaskImage: 'linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)', maskImage: 'linear-gradient(180deg, #000 0%, #000 62%, transparent 100%)' }}
            >
              <HeroPortal nivaa={nivaa} setNivaa={setNivaa} />
            </div>
          </div>
        </section>

        <Reisen nivaa={nivaa} setNivaa={setNivaa} />
        <Statement />
        <Bilde />
        <Bento />
        <Nivaa nivaa={nivaa} setNivaa={setNivaa} />
        <Trygghet />
        <SluttCTA nivaa={nivaa} onKlikk={klikk} />
      </main>

      <MobilCTA nivaa={nivaa} onKlikk={klikk} />
    </div>
  );
}
