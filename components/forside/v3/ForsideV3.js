'use client';

import React, { useEffect, useState } from 'react';
import { track } from '@/lib/analytics';
import Nav from './Nav';
import HeroPortal from './HeroPortal';
import Reisen, { NivaaVelger, NIVAAER } from './Reisen';
import Bento from './Bento';
import { Statement, Bilde, Nivaa, Trygghet, SluttCTA } from './Seksjoner';
import { EASE, display, Knapp, Lenke } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV3 — «Utleie på autopilot», 2026.

   Stille. Hvit canvas, medium vekt, én setning, ett produkt. Luften gjør
   jobben. Én tilstand (grad av autopilot) styrer heroens vindu, reisens
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E8E5DF] bg-white/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden"
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
    <div className="min-h-screen overflow-x-clip bg-white text-[#0A0A0A]" data-testid="forside-v3">
      <Nav onCta={klikk} />

      <main>
        {/* ── Hero ── */}
        <section className="relative" data-testid="v3-hero">
          <div className="mx-auto w-full max-w-[1280px] px-6 pt-20 sm:px-8 sm:pt-28 lg:pt-36">
            <h1 className="dh-cover-inn max-w-[12ch] text-[44px] sm:text-[60px] lg:text-[76px]" style={display}>
              Utleie på autopilot<span className="text-[#cf97fc]">.</span>
            </h1>
            <p className="dh-cover-inn mt-6 max-w-[54ch] text-[18px] leading-[1.5] text-[#6B6862] sm:text-[20px]" style={{ animationDelay: '.08s' }}>
              Alt fra annonse til innbetaling går av seg selv. Du bestemmer hvor mye du vil være med.
            </p>
            <div className="dh-cover-inn mt-8 flex flex-wrap items-center gap-5" style={{ animationDelay: '.14s' }}>
              <Knapp href="/bli-utleier/start" onClick={() => klikk('hero')} data-testid="v3-hero-cta">Kom i gang</Knapp>
              <Lenke href="#reisen" data-testid="v3-hero-sekundaer">Se hvordan det virker</Lenke>
            </div>
          </div>

          {/* Produktet — ekte skjermbilde i skala, fader inn i siden */}
          <div className="dh-cover-inn relative mx-auto mt-16 w-full max-w-[1280px] px-6 sm:mt-20 sm:px-8" style={{ animationDelay: '.22s' }}>
            <div className="mb-3 flex justify-end">
              <NivaaVelger nivaa={nivaa} onChange={setNivaa} size="sm" />
            </div>
            <div className="relative h-[520px] overflow-hidden sm:h-[600px] lg:h-[660px]">
              <HeroPortal nivaa={nivaa} />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[200px]" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 60%, #fff 100%)' }} />
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
