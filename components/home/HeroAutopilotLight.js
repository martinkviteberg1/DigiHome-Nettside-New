'use client';

/*
  HeroAutopilotLight — lys variant av heroen for forsiden /2.
  Ingen kinematisk intro: innholdet stiger rolig inn ved montering.
  Varmt papir (#FEFBFA), blekk-tekst, lavendel-aksent og den lyse
  produkt-loopen (HeroLoopLight) i høyre kolonne.
*/

import { useEffect, useState } from 'react';
import { HeroLoopLight } from './HeroLoopLight';
import { HeroLeadFormLight } from './HeroLeadFormLight';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const H1_CLASSES = 'font-heading font-bold tracking-[-0.035em] leading-[1.0] text-[clamp(46px,7vw,86px)]';

export function HeroAutopilotLight() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const rv = (d, extra = '') => ({
    className: `transition-all ${extra} ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`,
    style: { transitionDuration: '950ms', transitionTimingFunction: EASE, transitionDelay: `${d}ms` },
  });

  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink -mt-[72px]">
      {/* bakteppe — rolig lavendel-ambient, kun i øvre del så bunnen er helt flatt papir (sømløst inn i seksjon 2) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 48% at 84% 12%, rgba(155,91,214,0.05), transparent 70%), radial-gradient(ellipse 50% 40% at 4% 30%, rgba(207,151,252,0.04), transparent 70%)',
        }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-14 lg:gap-10 items-center min-h-[100svh] pt-[104px] pb-16 lg:pt-[72px] lg:pb-10">
          {/* venstre kolonne */}
          <div className="max-w-2xl">
            <div {...rv(60)}>
              <h1 className={H1_CLASSES}>
                <span className="block text-ink">Utleie.</span>
                <span className="block dh-ink-shine">På autopilot.</span>
              </h1>
            </div>

            <div {...rv(320)}>
              <p className="mt-7 text-lg sm:text-xl text-quiet leading-relaxed max-w-lg">
                DigiHome håndterer annonsering, prising, visninger og leietakere —
                helt automatisk. Du ser bare leien tikke inn.
              </p>
            </div>

            <div {...rv(440, 'relative z-20')}>
              <div className="mt-9">
                <HeroLeadFormLight />
              </div>
            </div>

            <div {...rv(560, 'relative z-10')}>
              <dl className="mt-10 flex flex-wrap items-center gap-y-4">
                {[
                  ['30+', 'Eiendommer i Bergen'],
                  ['+30 %', 'Høyere leieinntekt'],
                  ['98 %', 'Eier-tilfredshet'],
                ].map(([v, l], i) => (
                  <div key={l} className={`flex flex-col ${i ? 'pl-7 ml-7 border-l border-hairline' : ''}`}>
                    <dt className="font-heading text-[26px] font-bold text-ink tracking-[-0.02em] leading-none">{v}</dt>
                    <dd className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-taupe font-semibold">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* høyre kolonne — levende produktloop (lys) */}
          <div {...rv(380, 'lg:pl-4')}>
            <div className="mx-auto w-full max-w-[600px]">
              <HeroLoopLight playing={shown} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
