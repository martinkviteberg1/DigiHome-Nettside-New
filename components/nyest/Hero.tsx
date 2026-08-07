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
      {/* Ett svakt lys øverst til venstre — dybde, ikke flate. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: 'radial-gradient(70% 80% at 10% 0%, #f6f2ea 0%, rgba(246,242,234,0) 60%)' }}
      />

      {/* Tekst og bilde i samme container som navbar og footer. Bildet er en
          innrammet, hel flate — aldri klippet av skjermkanten. */}
      <div className="relative mx-auto grid w-full max-w-[1400px] items-center gap-12 px-6 pb-16 pt-[116px] sm:px-10 sm:pb-20 sm:pt-[136px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-16 lg:pb-28 lg:pt-[168px]">
        <div>
          <h1 className="e-display text-[46px] sm:text-[62px] xl:text-[74px]">
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

        <div className="dh-fade-up overflow-hidden rounded-[28px]" style={{ animationDelay: '0.1s' }}>
          <img
            src="/nyest-hero-portrett.webp"
            alt="Lys stue med beige sofa i en norsk utleiebolig"
            fetchPriority="high"
            className="aspect-[4/5] w-full object-cover lg:aspect-[3/4]"
          />
        </div>
      </div>
    </section>
  );
}
