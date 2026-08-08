'use client';

import React, { useEffect, useRef, useState } from 'react';
import PortalMockup from './mockups/PortalMockup';
import PhoneMockup from './mockups/PhoneMockup';

// ---------------------------------------------------------------------------
// HvaEr — definisjonssliden med produktet i sentrum: én presis setning, og
// under den nøyaktige replikaer av huseierportalen (web) og mobilappen,
// komponert som et klassisk produktbilde der telefonen overlapper portalen.
// På mobil vises kun telefonen — den er tross alt mobilopplevelsen.
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
      { threshold: 0.25 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const trinn = (delayMs: number) => ({
    className: `transition-all duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
      synlig ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
    }`,
    style: { transitionDelay: `${delayMs}ms` } as React.CSSProperties,
  });

  return (
    <section
      ref={ref}
      data-testid="tour-hvaer"
      data-slide="Hva er DigiHome"
      className="relative flex min-h-[100dvh] snap-start flex-col overflow-hidden px-5 pb-16 pt-24 sm:px-8 lg:h-[100dvh] lg:pb-0 lg:pt-[8vh]"
    >
      {/* Teksten */}
      <div className="mx-auto w-full max-w-[900px] text-center">
        <p {...trinn(0)}>
          <span className="e-label">Hva er DigiHome</span>
        </p>
        <h2
          className={`e-display mx-auto mt-6 max-w-[30ch] text-[27px] leading-[1.12] sm:text-[34px] lg:text-[38px] ${trinn(120).className}`}
          style={{ ...trinn(120).style, textWrap: 'balance' }}
        >
          DigiHome er et AI-drevet system for boligforvaltning som håndterer hele
          leieforholdet — <span className="text-[#9B5BD6]">automatisk</span>.
        </h2>
        <p
          className={`mx-auto mt-4 text-[14.5px] leading-[1.6] text-[#8a827a] sm:text-[16px] ${trinn(240).className}`}
          style={trinn(240).style}
        >
          Én plattform — web og mobil. Fra én bolig til hele porteføljer.
        </p>
      </div>

      {/* Produktkomposisjonen */}
      <div className="relative mx-auto mt-10 w-full max-w-[1060px] sm:mt-12 md:h-[540px] lg:h-auto lg:flex-1">
        {/* Desktop/tablet: portal + telefon overlappende */}
        <div className="hidden md:block">
          <div className={`absolute left-0 top-0 w-[70%] max-w-[760px] lg:left-[2%] ${trinn(320).className}`} style={trinn(320).style}>
            <PortalMockup />
          </div>
          <div className={`absolute left-[60%] top-10 z-10 w-[226px] ${trinn(520).className}`} style={trinn(520).style}>
            <PhoneMockup />
          </div>
        </div>

        {/* Mobil: kun telefonen */}
        <div className="flex justify-center md:hidden">
          <div className={`w-[238px] ${trinn(320).className}`} style={trinn(320).style}>
            <PhoneMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
