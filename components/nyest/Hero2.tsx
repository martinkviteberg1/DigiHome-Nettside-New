import React from 'react';
import AdresseFelt from './AdresseFelt';

// ---------------------------------------------------------------------------
// Hero2 — split-screen. Tekst venstre, bilde helt til viewport-kanten høyre.
//
// Ingen container-max på seksjonen; venstre halvpart har padding, høyre er
// et fullbleed bildepanel som strekker seg fra topp til bunn — samme grep
// som Airbnb/Anthropics login. Dot-grid ligger bare bak tekst-siden.
// ---------------------------------------------------------------------------

export default function Hero2() {
  return (
    <section className="relative overflow-hidden bg-[#fdfcfb]" data-testid="nyest2-hero">
      <div className="grid min-h-[100dvh] w-full lg:grid-cols-2">
        {/* Venstre — tekst og adressefelt, vertikalt sentrert i sin halvdel. */}
        <div className="relative flex items-center px-5 pb-16 pt-[104px] sm:px-8 sm:pb-24 sm:pt-[128px] lg:px-16 lg:py-24 xl:px-24">
          {/* Subtil dot-grid — kun bak tekst-siden, myk fade mot bilde-siden. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.32]"
            style={{
              backgroundImage: 'radial-gradient(circle, #c8c8c8 0.8px, transparent 0.8px)',
              backgroundSize: '24px 24px',
              maskImage: 'radial-gradient(120% 90% at 30% 40%, black 30%, transparent 85%)',
              WebkitMaskImage: 'radial-gradient(120% 90% at 30% 40%, black 30%, transparent 85%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
            style={{ background: 'radial-gradient(70% 80% at 15% 0%, #f6f2ea 0%, rgba(246,242,234,0) 60%)' }}
          />

          <div className="relative w-full max-w-[560px]">
            <h1 className="e-display text-[44px] leading-[1.02] sm:text-[62px] xl:text-[74px]">
              <span className="e-mask"><span>Utleie på</span></span>
              <span className="e-mask"><span>autopilot<span className="text-[#9B5BD6]">.</span></span></span>
            </h1>

            <p className="dh-fade-up e-lead mt-6 max-w-[42ch] sm:mt-7" style={{ animationDelay: '0.18s' }}>
              DigiHome automatiserer utleien — annonse, kontrakt, depositum og husleie,
              samlet på ett sted. Administrer selv, eller få hjelp med forvaltning.
            </p>

            <div className="dh-fade-up mt-8 max-w-[520px] sm:mt-10" style={{ animationDelay: '0.26s' }}>
              <AdresseFelt source="nyest2_hero" testId="nyest2-hero-address" />
            </div>
          </div>
        </div>

        {/* Høyre — fullbleed bilde-panel. På mobil vises det under teksten. */}
        <div className="dh-fade-up relative h-[70vh] w-full sm:h-[80vh] lg:h-auto lg:min-h-[100dvh]" style={{ animationDelay: '0.1s' }}>
          <img
            src="/nyest-hero-portrett.webp"
            alt="Lys stue med beige sofa i en norsk utleiebolig"
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
