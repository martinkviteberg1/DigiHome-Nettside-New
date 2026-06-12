'use client';

/*
  HeroAutopilot — «Utleie. På autopilot.»
  Kinematisk intro (kun første besøk, sessionStorage):
    1. Mørkt teppe, «Utleie.» toner inn sentrert i fullskjerm
    2. «På autopilot.» (platina-gradient) toner inn under
    3. Overskriften morpher sømløst (FLIP) til sin plass i hero-layouten
       mens teppet løses opp og resten av innholdet stiger inn forskjøvet.
  Ved gjenbesøk hopper vi rett til ferdig layout med en rask, myk inntoning.
*/

import { useEffect, useRef, useState } from 'react';
import { HeroLoop } from './HeroLoop';
import { HeroLeadForm } from './HeroLeadForm';

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const H1_CLASSES = 'font-heading font-bold tracking-[-0.035em] leading-[1.0] text-[clamp(46px,7vw,86px)] w-fit';

/* Modul-nivå: én intro-beslutning per sidelast.
   Overlever StrictMode-dobbelkjøring av effekter i dev,
   og hindrer replay ved klient-navigasjon tilbake til forsiden. */
let introDecision = null;

function HeadingLines({ intro = false }) {
  return (
    <>
      <span className={`block text-[#FDFCFB] ${intro ? 'dh-intro-line dh-l1' : ''}`}>Utleie.</span>
      <span className={`block dh-platinum ${intro ? 'dh-intro-line dh-l2' : ''}`}>På autopilot.</span>
    </>
  );
}

export function HeroAutopilot() {
  const [stage, setStage] = useState('init'); // init → intro → morph → done
  const [flip, setFlip] = useState(null);
  const playedIntro = useRef(false);
  const h1Ref = useRef(null);

  useEffect(() => {
    let t1, t2;
    let cancelled = false;

    if (introDecision === null) {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let seen = true;
      try {
        seen = sessionStorage.getItem('dh-intro-sett') === '1';
      } catch (e) { /* private mode o.l. */ }
      introDecision = seen || reduce ? 'skip' : 'play';
      if (introDecision === 'play') {
        try { sessionStorage.setItem('dh-intro-sett', '1'); } catch (e) { /* ok */ }
      }
    }

    if (introDecision === 'skip') {
      setStage('done');
      return;
    }
    playedIntro.current = true;

    const start = () => {
      if (cancelled) return;
      if (!h1Ref.current) { setStage('done'); return; }
      const r = h1Ref.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(1.5, Math.max(1.05, (vw * 0.74) / Math.max(1, r.width)));
      setFlip({
        left: r.left, top: r.top, width: r.width,
        dx: vw / 2 - (r.left + r.width / 2),
        dy: vh * 0.47 - (r.top + r.height / 2),
        scale,
      });
      setStage('intro');
      t1 = setTimeout(() => setStage('morph'), 3100);
      t2 = setTimeout(() => {
        introDecision = 'skip'; // ikke replay ved senere klient-navigasjon
        setStage('done');
      }, 4450);
    };

    Promise.race([
      (typeof document !== 'undefined' && document.fonts && document.fonts.ready) || Promise.resolve(),
      new Promise((r) => setTimeout(r, 400)),
    ]).then(() => requestAnimationFrame(start));

    return () => {
      cancelled = true;
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  /* lås skrolling til introen er ferdig */
  useEffect(() => {
    document.body.style.overflow = stage === 'done' ? '' : 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [stage]);

  const shown = stage === 'morph' || stage === 'done';
  const rv = (d, extra = '') => ({
    className: `transition-all ${extra} ${shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`,
    style: { transitionDuration: '950ms', transitionTimingFunction: EASE, transitionDelay: `${d}ms` },
  });

  return (
    <section className="relative overflow-hidden bg-[#050507] text-white -mt-[72px]">
      {/* bakteppe — rolig studiolys, ikke romstøv */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 56% 46% at 76% 16%, rgba(170,160,200,0.08), transparent 62%), radial-gradient(ellipse 46% 38% at 14% 90%, rgba(140,135,170,0.06), transparent 62%)',
        }}
      />

      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-[1.02fr_0.98fr] gap-14 lg:gap-10 items-center min-h-[100svh] pt-[104px] pb-16 lg:pt-[72px] lg:pb-10">
          {/* venstre kolonne */}
          <div className="max-w-2xl">
            <h1
              ref={h1Ref}
              className={H1_CLASSES}
              style={{
                opacity: stage === 'done' ? 1 : 0,
                ...(playedIntro.current
                  ? {}
                  : {
                      transition: `opacity 0.95s ${EASE} 0.05s, transform 0.95s ${EASE} 0.05s`,
                      transform: stage === 'done' ? 'none' : 'translateY(24px)',
                    }),
              }}
            >
              <HeadingLines />
            </h1>

            <div {...rv(320)}>
              <p className="mt-7 text-lg sm:text-xl text-white/60 leading-relaxed max-w-lg">
                DigiHome håndterer annonsering, prising, visninger og leietakere —
                helt automatisk. Du ser bare leien tikke inn.
              </p>
            </div>

            <div {...rv(440)}>
              <div className="mt-9">
                <HeroLeadForm />
              </div>
            </div>

            <div {...rv(560)}>
              <dl className="mt-10 flex flex-wrap items-center gap-y-4">
                {[
                  ['30+', 'Eiendommer i Bergen'],
                  ['+30 %', 'Høyere leieinntekt'],
                  ['98 %', 'Eier-tilfredshet'],
                ].map(([v, l], i) => (
                  <div key={l} className={`flex flex-col ${i ? 'pl-7 ml-7 border-l border-white/10' : ''}`}>
                    <dt className="font-heading text-[26px] font-bold text-white tracking-[-0.02em] leading-none">{v}</dt>
                    <dd className="mt-1.5 text-[11px] uppercase tracking-[0.16em] text-white/35 font-semibold">{l}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* høyre kolonne — levende produktloop */}
          <div {...rv(380, 'lg:pl-4')}>
            <div className="mx-auto w-full max-w-[560px]">
              <HeroLoop playing={shown} />
            </div>
          </div>
        </div>
      </div>

      {/* ============ INTRO-TEPPE (kun første besøk) ============ */}
      {stage !== 'done' && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            style={{
              background: '#050507',
              opacity: stage === 'morph' ? 0 : 1,
              transition: stage === 'morph' ? 'opacity 1.05s ease 0.12s' : 'none',
              pointerEvents: stage === 'morph' ? 'none' : 'auto',
            }}
          >
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(ellipse 55% 45% at 50% 42%, rgba(155,91,214,0.10), transparent 65%)' }}
            />
          </div>
          {flip && (
            <div
              aria-hidden="true"
              className="fixed z-[95]"
              style={{
                left: flip.left,
                top: flip.top,
                width: flip.width,
                transform:
                  stage === 'intro'
                    ? `translate(${flip.dx.toFixed(1)}px, ${flip.dy.toFixed(1)}px) scale(${flip.scale.toFixed(3)})`
                    : 'none',
                transition: stage === 'morph' ? `transform 1.3s ${EASE}` : 'none',
                transformOrigin: '50% 50%',
                willChange: 'transform',
              }}
            >
              <div className={H1_CLASSES}>
                <HeadingLines intro />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
