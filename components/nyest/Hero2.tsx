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
            <h1 className="e-display text-[44px] leading-[1.04] tracking-[-0.03em] sm:text-[62px] xl:text-[70px] xl:leading-[1.02] 2xl:text-[76px]">
              <span className="e-mask">
                <span>Utleie på autopilot<span className="text-[#9B5BD6]">.</span></span>
              </span>
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

        {/* Høyre — innrammet bildepanel som starter under navbar og har
            strammere ramme rundt. Aldri overlapp med knappene i toppen.
            Overlay nederst — tittel, sub og pill-chips, samme språk som login. */}
        <div className="dh-fade-up relative px-5 pt-4 pb-8 sm:px-8 sm:pt-6 sm:pb-10 lg:h-auto lg:pt-[92px] lg:pb-5 lg:pl-0 lg:pr-5 xl:pt-[100px] xl:pb-6 xl:pr-6" style={{ animationDelay: '0.1s' }}>
          <div className="relative h-[70vh] w-full overflow-hidden rounded-[20px] sm:h-[80vh] sm:rounded-[24px] lg:h-[calc(100dvh-112px)] lg:rounded-[24px] xl:h-[calc(100dvh-124px)] xl:rounded-[28px]">
            <img
              src="/nyest-hero-portrett.webp"
              alt="Lys stue med beige sofa i en norsk utleiebolig"
              fetchPriority="high"
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* Gradient som løfter tekstlesbarheten uten å dekke bildet. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[52%]"
              style={{ background: 'linear-gradient(to top, rgba(10,10,10,0.62) 0%, rgba(10,10,10,0.28) 45%, rgba(10,10,10,0) 100%)' }}
            />
            {/* Overlay-innhold — nederst-venstre inne i bildeflaten. */}
            <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-8 lg:p-10 xl:p-12" data-testid="nyest2-hero-overlay">
              <h2 className="text-[26px] font-semibold leading-[1.08] tracking-[-0.028em] sm:text-[32px] lg:text-[36px] xl:text-[40px]" style={{ fontFamily: 'var(--font-heading), sans-serif' }}>
                Automatisert utleie.<br />
                <span className="text-white/70">Ett sted.</span>
              </h2>
              <p className="mt-3 max-w-[46ch] text-[13.5px] leading-[1.55] text-white/80 sm:mt-4 sm:text-[14.5px]">
                Annonse, kontrakt med BankID, depositum og husleie — samlet i én plattform for utleiere.
              </p>
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
                {['Annonse', 'Kontrakt', 'Depositum', 'Husleie'].map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[12px] font-medium tracking-[-0.005em] text-white backdrop-blur-md sm:text-[12.5px]"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
