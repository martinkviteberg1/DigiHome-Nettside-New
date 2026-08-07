import React from 'react';
import AdresseFelt from './AdresseFelt';

// ---------------------------------------------------------------------------
// Hero — tre elementer. Påstanden, én setning, adressefeltet.
//
// Venstre: tekst. Høyre: ett bilde i en innrammet flate. Subtil dot-grid i
// bakgrunnen for dybde uten støy — samme lette prikkemønster som resten av
// merkevaren. Ingen badges, ingen tall, ingen sekundærlenker.
// ---------------------------------------------------------------------------

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#fdfcfb]" data-testid="nyest-hero">
      {/* Subtil dot-grid — signaturmønsteret vårt. Tegner luft, ikke støy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.32]"
        style={{
          backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(120% 80% at 50% 30%, black 40%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(120% 80% at 50% 30%, black 40%, transparent 85%)',
        }}
      />
      {/* Ett svakt lys øverst til venstre — dybde, ikke flate. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: 'radial-gradient(70% 80% at 10% 0%, #f6f2ea 0%, rgba(246,242,234,0) 60%)' }}
      />

      {/* Tekst og bilde i samme container som navbar og footer. Bildet er en
          innrammet, hel flate — aldri klippet av skjermkanten. */}
      <div className="relative mx-auto grid w-full max-w-[1400px] items-start gap-8 px-5 pb-16 pt-[84px] sm:gap-10 sm:px-8 sm:pb-20 sm:pt-[100px] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:px-16 lg:pb-24 lg:pt-[112px]">
        <div className="lg:pt-6">
          <h1 className="e-display text-[42px] leading-[1.02] sm:text-[62px] xl:text-[74px]">
            <span className="e-mask"><span>Utleie på</span></span>
            <span className="e-mask"><span>autopilot<span className="text-[#9B5BD6]">.</span></span></span>
          </h1>

          <p className="dh-fade-up e-lead mt-6 max-w-[42ch] sm:mt-7" style={{ animationDelay: '0.18s' }}>
            DigiHome automatiserer utleien — annonse, kontrakt, depositum og husleie,
            samlet på ett sted. Administrer selv, eller få hjelp med forvaltning.
          </p>

          <div className="dh-fade-up mt-8 max-w-[520px] sm:mt-10" style={{ animationDelay: '0.26s' }}>
            <AdresseFelt source="nyest_hero" testId="nyest-hero-address" />
          </div>
        </div>

        <div className="dh-fade-up overflow-hidden rounded-[24px] sm:rounded-[28px]" style={{ animationDelay: '0.1s' }}>
          <img
            src="/nyest-hero-portrett.webp"
            alt="Lys stue med beige sofa i en norsk utleiebolig"
            fetchPriority="high"
            className="aspect-[4/5] w-full object-cover md:aspect-[16/11] lg:aspect-[3/4]"
          />
        </div>
      </div>
    </section>
  );
}
