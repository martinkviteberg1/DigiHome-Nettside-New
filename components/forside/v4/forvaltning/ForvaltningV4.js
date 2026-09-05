'use client';

import React from 'react';
import NavV4 from '../NavV4';
import Footer from '@/components/dh/Footer';
import { Knapp, Lenke, T, display } from '../motion';
import ForvaltningScene from './ForvaltningScene';

/* ---------------------------------------------------------------------------
   ForvaltningV4 — undersiden for full forvaltning. Første akt: hero.

   Privat og bedrift er programvare: systemet gjør jobben, du godkjenner.
   Forvaltning er en tjeneste: MENNESKER hos DigiHome gjør jobben, med samme
   system som ryggrad — og du ser alt som skjer. Løftet er derfor ikke
   «autopilot», men arbeidsdelingen: «Vi tar jobben. Du bestemmer.»

   Kun Bergen og omegn. Ingen pris i heroen (avtales individuelt), ingen
   løfter om avkastning. Handlingen er et uforpliktende tilbud — onboardingen
   med tjenesten forhåndsvalgt — eller en samtale.
--------------------------------------------------------------------------- */

export default function ForvaltningV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="forvaltning-v4">
      <NavV4 />
      <main>
        <section className="relative lg:flex lg:min-h-[calc(100svh-64px)] lg:flex-col lg:justify-center" data-testid="v4f-hero">
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 pb-16 pt-10 sm:px-8 sm:pt-12 lg:w-[calc(100%-128px)] lg:grid-cols-[minmax(0,6fr)_minmax(0,7fr)] lg:items-center lg:gap-14 lg:px-0 lg:py-10 2xl:gap-16">
            <div className="min-w-0 max-w-[600px]">
              <p className="dh-cover-inn text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.55)' }} data-testid="v4f-label">Full forvaltning · Bergen og omegn</p>
              <h1
                className="dh-cover-inn mt-4 max-w-[11ch] text-[52px] sm:text-[68px] lg:text-[clamp(64px,5vw,96px)]"
                style={{ ...display, color: T.ink, animationDelay: '.04s' }}
                data-testid="v4f-h1"
              >
                Vi tar jobben. Du bestemmer<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h1>
              <p className="dh-cover-inn mt-7 max-w-[38ch] text-[18px] leading-[1.45] text-[#15130F]/70 sm:mt-8 sm:text-[20px]" style={{ animationDelay: '.08s' }} data-testid="v4f-ingress">
                <span className="sm:hidden">Vi finner leietaker, tar drift og oppfølging. Du ser alt som skjer — og har siste ord.</span>
                <span className="hidden sm:inline">Overlat utleien til oss. Vi finner leietaker, tar drift og oppfølging — du ser alt som skjer, og har siste ord om det som betyr noe.</span>
              </p>

              <div className="dh-cover-inn mt-9 flex flex-wrap items-center gap-x-6 gap-y-4" style={{ animationDelay: '.16s' }}>
                <Knapp href="/bli-utleier/start?tier=full_forvaltning" data-testid="v4f-cta">Få et uforpliktende tilbud</Knapp>
                <Lenke href="/book-mote" data-testid="v4f-cta-samtale">Book en samtale</Lenke>
              </div>
              <p className="dh-cover-inn mt-4 text-[14px]" style={{ color: 'rgba(21,19,15,0.5)', animationDelay: '.22s' }} data-testid="v4f-under">
                Personlig tilbud innen 24 timer · ingen oppstartskostnad · ingen bindingstid
              </p>
            </div>

            <div className="dh-cover-inn min-w-0" style={{ animationDelay: '.12s' }}>
              <ForvaltningScene />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
