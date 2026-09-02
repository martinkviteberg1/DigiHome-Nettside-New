'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { track } from '@/lib/analytics';
import Nav from './Nav';
import HeroPortal from './HeroPortal';
import Reisen, { NivaaVelger, NIVAAER } from './Reisen';
import Bento from './Bento';
import { Statement, Bilde, Nivaa, Trygghet, SluttCTA } from './Seksjoner';
import { EASE, Stakk } from './motion';

/* ---------------------------------------------------------------------------
   ForsideV3 — «Utleie på autopilot», 2026.

   Én ryggrad: fra annonse til innbetaling. Én tilstand (grad av autopilot:
   Selvbetjent · Forvaltning · Portefølje) styrer heroens produktvindu, reisens
   «hvem gjør det», nivåkortene og CTAene. Heroen snakker til følelsen alle tre
   kjøpere deler, kroppen beviser med ekte produkt, valget skjer én gang.

   Hero → Reisen → Statement → Bilde → Bento → Nivå → Trygghet → CTA.
   Ingen priser. Ingen påstander vi ikke kan stå inne for.
--------------------------------------------------------------------------- */

/* Sticky mobil-CTA — dukker opp etter heroen, forsvinner ved footer */
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
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#ECE8E0] bg-[#FBFAF7]/95 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md lg:hidden"
      style={{ transform: vis ? 'none' : 'translateY(110%)', transition: `transform 380ms ${EASE}` }}
      aria-hidden={!vis}
      data-testid="v3-mobil-cta"
    >
      <div className="flex gap-2">
        <Link href={n.href} prefetch onClick={() => onKlikk('mobil-sticky')} className="e-btn e-btn-dark e-btn-sm flex-1 !rounded-full">{n.cta} <ArrowRight className="h-4 w-4" /></Link>
        <Link href="/book-mote" prefetch className="e-btn e-btn-ghost e-btn-sm flex-1 !rounded-full !bg-white">Book en prat</Link>
      </div>
    </div>
  );
}

export default function ForsideV3() {
  const [nivaa, setNivaa] = useState(0);
  const klikk = (hvor) => { try { track('forside_cta', { hvor, versjon: 'v3', nivaa: NIVAAER[nivaa].id }); } catch (e) { /* ok */ } };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#FBFAF7] text-[#0A0A0A]" data-testid="forside-v3">
      <Nav onCta={klikk} />

      <main>
        {/* ── Hero — løftet + produktet i full bredde, i tre grader ── */}
        <section className="relative" data-testid="v3-hero">
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[340px] h-[760px] w-[1400px] -translate-x-1/2 rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(155,91,214,0.11) 0%, rgba(155,91,214,0.05) 38%, transparent 66%)' }} />
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
              <ul className="dh-cover-inn mt-9 hidden flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11.5px] font-semibold uppercase tracking-[0.12em] text-[#b3aca1] sm:flex" style={{ animationDelay: '.26s' }}>
                {['BankID-signering', 'Publisering til FINN', 'Husleie med KID', 'Saker og leverandører'].map((t, i) => (
                  <li key={t} className="flex items-center gap-3">{i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full bg-[#D6CFC4]" />}{t}</li>
                ))}
              </ul>
            </div>

            {/* Velger: samme produkt, tre grader — vinduet morfer */}
            <div className="dh-cover-inn mt-14 flex flex-col items-center gap-3 sm:mt-20" style={{ animationDelay: '.3s' }}>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#a49e93]">Se produktet som</p>
              <NivaaVelger nivaa={nivaa} onChange={setNivaa} />
              <div className="h-[22px] text-center text-[14px] text-[#6F6A60]" aria-live="polite">
                <Stakk idx={nivaa}>
                  <span className="block">Én bolig. Du godkjenner — systemet gjør resten.</span>
                  <span className="block">Samme portal. Forvalteren tar sakene, du ser alt.</span>
                  <span className="block">Forvalterens flate: hele porteføljen, alle saker, ett system.</span>
                </Stakk>
              </div>
            </div>
            <div className="dh-cover-inn mt-8" style={{ animationDelay: '.36s' }}>
              <HeroPortal nivaa={nivaa} />
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
