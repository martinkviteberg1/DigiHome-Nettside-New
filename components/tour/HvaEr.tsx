'use client';

import React, { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// HvaEr — elevator pitch med kinetisk typografi. Oppgavene en forvalter gjør
// avsløres ord for ord i dempet beige, før punchlinen lander i sort:
// «DigiHome gjør det automatisk.» Deretter én rolig, presis forklaring for
// investorer. Ingen bokser, ingen kanter — bare rytme, kontrast og luft.
// ---------------------------------------------------------------------------

const ORD = ['Annonse.', 'Visning.', 'Kontrakt.', 'Depositum.', 'Husleie.'];
const TAKT_MS = 130; // avstand mellom hvert ord i avsløringen

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

  const trinn = (delayMs: number) =>
    `inline-block transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${
      synlig ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'
    }`;

  const punchlineDelay = ORD.length * TAKT_MS + 300;
  const leadDelay = punchlineDelay + 500;

  return (
    <section
      ref={ref}
      data-testid="tour-hvaer"
      data-slide="Hva er DigiHome"
      className="flex min-h-[100dvh] items-center justify-center px-5 py-24 sm:px-8 lg:h-[100dvh] lg:py-0 lg:snap-start"
    >
      <div className="mx-auto w-full max-w-[1000px] text-center">
        <p className={`e-label ${trinn(0)}`} style={{ transitionDelay: '0ms' }}>
          Hva er DigiHome
        </p>

        {/* Oppgavelisten — det en forvalter bruker dagene på. */}
        <div
          className="e-display mt-9 flex flex-wrap justify-center gap-x-[0.32em] text-[38px] sm:mt-11 sm:text-[54px] lg:text-[62px]"
          style={{ color: '#c8c0b3' }}
          aria-label={ORD.join(' ')}
        >
          {ORD.map((ord, i) => (
            <span
              key={ord}
              className={trinn(0)}
              style={{ transitionDelay: `${200 + i * TAKT_MS}ms` }}
            >
              {ord}
            </span>
          ))}
        </div>

        {/* Punchline — lander etter at listen er komplett. */}
        <div
          className={`e-display mt-2 text-[38px] sm:mt-3 sm:text-[54px] lg:text-[62px] ${trinn(0)}`}
          style={{ transitionDelay: `${punchlineDelay}ms` }}
        >
          DigiHome gjør det automatisk<span className="text-[#9B5BD6]">.</span>
        </div>

        {/* Én presis forklaring for investorer. */}
        <p
          className={`e-lead mx-auto mt-9 max-w-[56ch] sm:mt-12 ${trinn(0)}`}
          style={{ transitionDelay: `${leadDelay}ms` }}
        >
          En AI-drevet plattform for boligutleie. Utleier administrerer selv —
          programvaren gjør jobben som før krevde en forvalter, til en brøkdel av
          kostnaden. Fra én bolig til hele porteføljer.
        </p>
      </div>
    </section>
  );
}
