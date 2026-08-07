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
    <section className="bg-[#fdfcfb] pt-[64px] lg:pt-[88px]" data-testid="nyest-hero">
      <div className="grid lg:grid-cols-2">
        <div className="flex items-center lg:min-h-[calc(100vh-88px)]">
          <div className="w-full max-w-[640px] px-5 py-16 sm:px-10 sm:py-24 lg:ml-auto lg:py-20 lg:pr-14 xl:pr-20">
            <h1 className="e-display text-[46px] sm:text-[62px] xl:text-[76px]">
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

        <div className="relative min-h-[380px] sm:min-h-[480px] lg:min-h-0">
          <img
            src="/interior-openplan-hero.webp"
            alt="Lys, åpen stue i en norsk utleiebolig"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
