import React from 'react';
import AdresseFelt from './AdresseFelt';

// ---------------------------------------------------------------------------
// Hero — tre elementer. Påstanden, én setning, adressefeltet.
//
// Venstre: tekst. Høyre: ett bilde, kant i kant mot skjermkanten. Ingen
// badges, ingen tall, ingen sekundærlenker. Feltet er handlingen.
// ---------------------------------------------------------------------------

export default function Hero() {
  return (
    <section className="relative bg-[#fdfcfb]" data-testid="nyest-hero">
      {/* Bildet eier høyre halvdel av skjermen — helt til toppen, under glassheaderen. */}
      <div className="absolute inset-y-0 right-0 hidden w-1/2 overflow-hidden lg:block">
        <img
          src="/interior-openplan-hero.webp"
          alt="Lys, åpen stue i en norsk utleiebolig"
          className="animate-kenburns absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Ett svakt lys øverst til venstre — dybde, ikke flate. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-full lg:w-1/2"
        style={{ background: 'radial-gradient(90% 58% at 8% 0%, #f6f2ea 0%, rgba(246,242,234,0) 62%)' }}
      />

      {/* Teksten ligger i samme container som navbar og footer — én optisk linje. */}
      <div className="relative mx-auto w-full max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <div className="flex flex-col justify-center pb-14 pt-[112px] sm:pb-20 sm:pt-[136px] lg:min-h-[100svh] lg:w-1/2 lg:py-[88px] lg:pr-14 xl:pr-24">
          <h1 className="e-display text-[46px] sm:text-[64px] lg:text-[clamp(56px,4.8vw,88px)]">
            <span className="e-mask"><span>Utleie på</span></span>
            <span className="e-mask"><span>autopilot<span className="text-[#9B5BD6]">.</span></span></span>
          </h1>

          <p className="dh-fade-up e-lead mt-7 max-w-[42ch]" style={{ animationDelay: '0.18s' }}>
            DigiHome automatiserer utleien — annonse, kontrakt, depositum og husleie,
            samlet på ett sted. Administrer selv, eller få hjelp med forvaltning.
          </p>

          <div className="dh-fade-up mt-10 max-w-[520px]" style={{ animationDelay: '0.26s' }}>
            <AdresseFelt source="nyest_hero" testId="nyest-hero-address" />
          </div>
        </div>
      </div>

      {/* Mobil: bildet som egen, rolig flate under innholdet. */}
      <div aria-hidden="true" className="relative min-h-[400px] overflow-hidden sm:min-h-[500px] lg:hidden">
        <img
          src="/interior-openplan-hero.webp"
          alt=""
          className="animate-kenburns absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </section>
  );
}
