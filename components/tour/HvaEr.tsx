'use client';

import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// HvaEr — mørk interlude-slide. Hele omvisningen er papirhvit; denne ene
// sliden er nesten sort og bærer definisjonen av produktet i hvit typografi.
// Kun én setning og én støttelinje — premium keynote-grep, ingen støy.
// ---------------------------------------------------------------------------

export default function HvaEr() {
  const ref = useRef<HTMLElement | null>(null);
  const [synlig, setSynlig] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setSynlig(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSynlig(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const trinn = (delayMs: number) => ({
    className: `transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
      synlig ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
    }`,
    style: { transitionDelay: `${delayMs}ms` } as React.CSSProperties,
  });

  return (
    <section
      ref={ref}
      data-testid="tour-hvaer"
      data-slide="Hva er DigiHome"
      data-moerk="true"
      className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-5 py-24 sm:px-8 lg:h-[100dvh] lg:py-0 lg:snap-start"
      style={{ background: 'radial-gradient(120% 130% at 10% 0%, #1c1814 0%, #0e0d0b 52%, #0a0a0a 100%)' }}
    >
      {/* Svak lilla glød øverst — gir dybde uten å lage støy. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[440px]"
        style={{ background: 'radial-gradient(55% 70% at 50% 0%, rgba(210,152,255,0.09) 0%, rgba(210,152,255,0) 70%)' }}
      />

      <div className="relative mx-auto w-full max-w-[980px] text-center">
        <p
          {...trinn(0)}
          data-testid="tour-hvaer-label"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
            Hva er DigiHome
          </span>
        </p>

        <h2
          className={`mx-auto mt-8 max-w-[22ch] text-[32px] font-bold leading-[1.13] tracking-[-0.032em] text-white sm:mt-10 sm:text-[44px] lg:text-[52px] ${trinn(140).className}`}
          style={{ ...trinn(140).style, fontFamily: 'var(--font-heading), sans-serif', textWrap: 'balance' }}
        >
          DigiHome er et AI-drevet system for boligforvaltning som håndterer hele
          leieforholdet — <span className="text-[#D298FF]">automatisk</span>.
        </h2>

        <p
          className={`mx-auto mt-8 max-w-[52ch] text-[15.5px] leading-[1.7] text-white/50 sm:mt-10 sm:text-[17px] ${trinn(320).className}`}
          style={trinn(320).style}
        >
          Annonse, visning, kontrakt, depositum og husleie — uten forvalter, til en
          brøkdel av kostnaden. Fra én bolig til hele porteføljer.
        </p>
      </div>
    </section>
  );
}
