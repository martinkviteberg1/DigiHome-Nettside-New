'use client';

import React, { useEffect, useRef, useState } from 'react';
import PortalMockup from './mockups/PortalMockup';
import PhoneMockup from './mockups/PhoneMockup';
import Parallax from './Parallax';

// ---------------------------------------------------------------------------
// HvaEr — definisjonssliden med produktet i sentrum: én presis setning, og
// under den nøyaktige replikaer av huseierportalen (web) og mobilappen.
// Portalen tegnes i fast designbredde og skaleres proporsjonalt (fonter og
// alt) mot både tilgjengelig bredde og viewport-høyde — så den alltid er så
// stor som mulig uten å klippes. Telefonen henger av portalens høyrekant.
// På mobil vises kun telefonen — den er tross alt mobilopplevelsen.
// ---------------------------------------------------------------------------

const DESIGN_B = 880; // portalens designbredde — alt innhold er satt i px mot denne

export default function HvaEr() {
  const ref = useRef<HTMLElement | null>(null);
  const ytreRef = useRef<HTMLDivElement | null>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);
  const [synlig, setSynlig] = useState(false);
  const [dim, setDim] = useState({ skala: 1, hoyde: 540 });

  useEffect(() => {
    const maal = () => {
      const bredde = ytreRef.current?.clientWidth || 0;
      const natH = portalRef.current?.offsetHeight || 540;
      if (!bredde) return;
      const vh = window.innerHeight || 900;
      const skala = Math.min(bredde / DESIGN_B, Math.max(0.55, (vh - 330) / natH));
      setDim({ skala, hoyde: natH });
    };
    maal();
    window.addEventListener('resize', maal);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && ytreRef.current) {
      ro = new ResizeObserver(maal);
      ro.observe(ytreRef.current);
    }
    return () => {
      window.removeEventListener('resize', maal);
      ro?.disconnect();
    };
  }, []);

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

      {/* Produktkomposisjonen — ankret helt i bunnkanten av sliden. */}
      <div className="relative mx-auto mt-10 w-full max-w-[1100px] sm:mt-12 lg:mt-auto">
        {/* Desktop/tablet: portalen skaleres proporsjonalt så stor som plassen
            tillater, telefonen henger av portalens høyrekant nede. Alt ligger
            i ETT parallakselag så web og mobil alltid er justert mot hverandre. */}
        <div ref={ytreRef} className="hidden w-full md:block">
          <Parallax faktor={0.08}>
            {(() => {
              const telefonB = Math.round(Math.min(268, Math.max(200, 258 * dim.skala)));
              const overheng = Math.round(telefonB * 0.42);
              return (
                <div
                  className={`relative mx-auto ${trinn(320).className}`}
                  style={{
                    ...trinn(320).style,
                    width: Math.round(DESIGN_B * dim.skala),
                    height: Math.round(dim.hoyde * dim.skala),
                  }}
                >
                  <div
                    ref={portalRef}
                    className="origin-top-left"
                    style={{ width: DESIGN_B, transform: `scale(${dim.skala})` }}
                  >
                    <PortalMockup />
                  </div>
                  <div className="absolute bottom-0 z-10" style={{ right: -overheng, width: telefonB }}>
                    <div className={trinn(520).className} style={trinn(520).style}>
                      <PhoneMockup />
                    </div>
                  </div>
                </div>
              );
            })()}
          </Parallax>
        </div>

        {/* Mobil: kun telefonen */}
        <div className="flex justify-center md:hidden">
          <div className={`w-[238px] ${trinn(320).className}`} style={trinn(320).style}>
            <Parallax faktor={0.1}>
              <PhoneMockup />
            </Parallax>
          </div>
        </div>
      </div>
    </section>
  );
}
