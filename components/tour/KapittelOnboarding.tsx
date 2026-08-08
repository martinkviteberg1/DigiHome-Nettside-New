'use client';

import React, { useEffect, useRef, useState } from 'react';
import Avslor from './Avslor';
import { MockAdresse, MockBolig, MockKlar } from './mockups/OnboardingMockups';

// ---------------------------------------------------------------------------
// KapittelOnboarding — kapittel 01 i omvisningen. Venstre kolonne forteller,
// høyre kolonne viser: en sticky produktmockup som bytter tilstand i takt med
// scrollingen. På mobil legges mockupen inline under hvert steg i stedet.
// ---------------------------------------------------------------------------

const STEG = [
  {
    id: '01',
    tittel: 'Adressen',
    tekst:
      'Utleier skriver inn adressen. DigiHome henter bruksareal, byggeår og eierforhold automatisk fra Kartverket og Matrikkelen — ingenting fylles ut to ganger.',
    etikett: 'Adresseoppslag · Kartverket',
  },
  {
    id: '02',
    tittel: 'Boligen',
    tekst:
      'Bilder lastes opp, og detaljene bekreftes. Det som finnes i offentlige registre, er allerede fylt ut — utleier justerer bare det som mangler.',
    etikett: 'Boligdetaljer',
  },
  {
    id: '03',
    tittel: 'Klar til utleie',
    tekst:
      'AI-en skriver annonseutkastet og foreslår leiepris basert på markedsdata. Identiteten bekreftes med BankID — og boligen er klar for publisering.',
    etikett: 'Utleieklar',
  },
];

const MOCKUPS = [MockAdresse, MockBolig, MockKlar];

// Mockup med flytende etikett-pille nederst — samme grep som appens egen
// walkthrough bruker for å navngi skjermbildet.
function MedEtikett({ Mock, etikett }: { Mock: React.ComponentType; etikett: string }) {
  return (
    <div className="relative pb-4">
      <Mock />
      <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 rounded-full border border-[#e8e4df] bg-white px-4 py-1.5 shadow-[0_10px_28px_-12px_rgba(10,10,10,0.25)]">
        <span className="whitespace-nowrap text-[11px] font-semibold text-[#6b6050]">{etikett}</span>
      </div>
    </div>
  );
}

export default function KapittelOnboarding() {
  const [aktiv, setAktiv] = useState(0);
  const refs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setAktiv(Number((entry.target as HTMLElement).dataset.steg || 0));
          }
        });
      },
      // Et smalt bånd rundt midten av viewporten avgjør hvilket steg som er aktivt.
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section data-testid="tour-kap1" className="relative pb-[8vh]">
      {/* Kapittel-divider — egen fullskjerm-slide */}
      <div
        data-slide="Kapittel 01"
        className="flex min-h-[72vh] flex-col items-center justify-center px-5 py-16 sm:px-8 lg:h-[100dvh] lg:snap-start lg:py-0"
      >
        <div className="mx-auto max-w-[820px] text-center">
        <Avslor>
          <p className="e-label">Kapittel 01 · Onboarding</p>
        </Avslor>
        <Avslor delay={90}>
          <h2 className="e-display mt-6 text-[34px] sm:text-[46px] lg:text-[52px]">
            Alt starter med én adresse<span className="text-[#9B5BD6]">.</span>
          </h2>
        </Avslor>
        <Avslor delay={180}>
          <p className="e-lead mx-auto mt-7 max-w-[52ch]">
            Onboarding er selvbetjent. Utleier registrerer boligen én gang — plattformen
            henter offentlige data, foreslår leiepris og gjør boligen klar for utleie.
          </p>
        </Avslor>
        </div>
      </div>

      {/* Sticky-region */}
      <div className="mx-auto max-w-[1220px] px-5 sm:px-8">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] lg:gap-x-16 xl:gap-x-24">
          {/* Venstre — stegtekstene */}
          <div>
            {STEG.map((s, i) => {
              const Mock = MOCKUPS[i];
              return (
                <div
                  key={s.id}
                  ref={(el) => {
                    refs.current[i] = el;
                  }}
                  data-steg={i}
                  data-slide={s.tittel}
                  className="flex flex-col justify-center py-14 sm:py-16 lg:h-[100dvh] lg:snap-start lg:py-0"
                >
                  <Avslor>
                    <p className="e-index">{s.id}</p>
                    <h3
                      className="mt-4 text-[26px] font-bold leading-[1.06] tracking-[-0.032em] text-[#0a0a0a] sm:text-[30px]"
                      style={{ fontFamily: 'var(--font-heading), sans-serif' }}
                    >
                      {s.tittel}
                    </h3>
                    <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.7] text-[#6F6A60] sm:text-[16.5px]">
                      {s.tekst}
                    </p>
                  </Avslor>

                  {/* Mobil — mockupen ligger inline under teksten */}
                  <div className="mt-10 lg:hidden" data-testid={`tour-mockup-mobil-${i + 1}`}>
                    <Avslor delay={100}>
                      <MedEtikett Mock={Mock} etikett={s.etikett} />
                    </Avslor>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Høyre — sticky mockup som bytter i takt med scroll */}
          <div className="hidden lg:block">
            <div className="sticky top-0 flex h-[100dvh] items-center">
              <div className="relative w-full max-w-[600px]" data-testid="tour-mockup-sticky">
                {MOCKUPS.map((Mock, i) => (
                  <div
                    key={i}
                    className={`transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      i === 0 ? 'relative' : 'absolute inset-0'
                    } ${
                      i === aktiv
                        ? 'z-10 translate-y-0 scale-100 opacity-100'
                        : 'pointer-events-none z-0 translate-y-3 scale-[0.99] opacity-0'
                    }`}
                  >
                    <MedEtikett Mock={Mock} etikett={STEG[i].etikett} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
