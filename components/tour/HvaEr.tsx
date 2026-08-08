'use client';

import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// HvaEr — lys, presis definisjonsslide. Kun én setning i sort med «automatisk»
// i lilla, og én rolig støttelinje. Ren typografi på papirbakgrunn — ingen
// bokser, ingen støy.
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
      className="flex min-h-[100dvh] items-center justify-center px-5 py-24 sm:px-8 lg:h-[100dvh] lg:py-0 lg:snap-start"
    >
      <div className="mx-auto w-full max-w-[980px] text-center">
        <p {...trinn(0)}>
          <span className="e-label">Hva er DigiHome</span>
        </p>

        <h2
          className={`e-display mx-auto mt-8 max-w-[22ch] text-[32px] leading-[1.1] sm:mt-10 sm:text-[44px] lg:text-[52px] ${trinn(140).className}`}
          style={{ ...trinn(140).style, textWrap: 'balance' }}
        >
          DigiHome er et AI-drevet system for boligforvaltning som håndterer hele
          leieforholdet — <span className="text-[#9B5BD6]">automatisk</span>.
        </h2>

        <p
          className={`e-lead mx-auto mt-8 max-w-[52ch] sm:mt-10 ${trinn(320).className}`}
          style={trinn(320).style}
        >
          Annonse, visning, kontrakt, depositum og husleie — uten forvalter, til en
          brøkdel av kostnaden. Fra én bolig til hele porteføljer.
        </p>
      </div>
    </section>
  );
}
