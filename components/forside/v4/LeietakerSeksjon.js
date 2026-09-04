'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSekvens, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   LeietakerSeksjon — to akter, ett spor. Filmatisk, ikke forklarende.

   Akt 1  Én stor scene (video/foto av leietakeren hjemme) med én editorial
          tittel over: «Leietakeren får svar. Du får bare beslutningen.»
   Morph  Scenen mørkner og trekker seg tilbake, tittelen glir ut, tråden
          kommer inn og tar flaten. Virkelig situasjon → DigiHome-opplevelse.
   Akt 2  Tråden lever videre som et rolig produktøyeblikk: bilde, melding,
          registrert, rørlegger, venter på deg, godkjent, løst, «takk».
   Under  Tre korte proof points. Ingen kolonne, ingen bullets, ingen kort.

   Scenen er bygget for eget opptak: sett SCENE.video til en mp4/webm
   (muted, loop, playsInline, poster = SCENE.bilde). Til det finnes brukes
   et stillbilde med svak, sakte bevegelse (kun transform — ingen filter).
   Sekvensen spiller én gang når seksjonen er i view; «Se igjen» nederst.
   Redusert bevegelse → rett til sluttbildet.
--------------------------------------------------------------------------- */

const SCENE = {
  video: null,                              // f.eks. '/v4/leietaker-kveld.mp4' — eget opptak, ikke stock
  bilde: '/v4/jonas-kveld-bred.webp',       // PLASSHOLDER (desktop, liggende) til eget opptak/foto finnes
  bildeMobil: '/v4/jonas-kveld.webp',       // PLASSHOLDER (mobil, stående)
  pos: '50% 42%',
};

/* Tempo: Akt 1 får stå. Raskt der systemet svarer, sakte der mennesker er involvert. */
const FASER = [
  { navn: 'akt1', ms: 3400 },
  { navn: 'morph', ms: 900 },
  { navn: 'foto', ms: 600 },
  { navn: 'meldt', ms: 750 },
  { navn: 'registrert', ms: 1500 },
  { navn: 'leverandor', ms: 450 },
  { navn: 'venter', ms: 2400 },       // det menneskelige leddet — holdes
  { navn: 'godkjent', ms: 1600 },
  { navn: 'lost', ms: 1100 },
  { navn: 'takk', ms: 0 },
];

/* Tråden fra Jonas' side. 'status' = det DigiHome faktisk sender leietakeren. 'kort' = rørleggeravtalen,
   som oppdateres på stedet (venter → godkjent). Leietakeren ser ikke pris. */
const TRAD = [
  { fase: 'foto', type: 'bilde', src: '/v4/bereder.webp', alt: 'Varmtvannsbereder på badet' },
  { fase: 'meldt', type: 'jonas', tid: 'tir. 22:41', t: 'Varmtvannet er borte i hele leiligheten. Lampen på berederen blinker rødt.' },
  { fase: 'registrert', type: 'status', tid: '22:41', t: 'Saken er registrert · haster', d: 'Manglende varmtvann er en mangel. Eier er varslet.' },
  { fase: 'leverandor', type: 'kort', tid: '22:43' },
  { fase: 'lost', type: 'status', tid: 'tor. 10:14', t: 'Saken er løst', d: 'Berederen er reparert. Si fra her om noe ikke stemmer.', lost: true },
  { fase: 'takk', type: 'jonas', tid: '10:20', t: 'Fungerer igjen. Takk!' },
];

const PROOF = ['Registrert automatisk', 'Godkjent av deg', 'Oppdatert helt til løst'];

const HAIR = 'rgba(21,19,15,0.08)';
const SKYGGE = '0 18px 44px -20px rgba(0,0,0,0.55), 0 1px 0 rgba(21,19,15,0.04)';
const MORK = '#15120F';

function Hake({ className = '' }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" className={className}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Rad som vokser inn (grid-rows 0fr → 1fr) og fader. Sluttstate er stabil layout. */
function Inn({ vis, children }) {
  return (
    <div className="grid" style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: `grid-template-rows 520ms ${EASE}` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 420ms ${EASE} 120ms, transform 420ms ${EASE} 120ms` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Tråden — Jonas i mørk glass-boble, DigiHome i hvite flater ── */
function Trad({ er }) {
  const godkjent = er('godkjent');
  const venter = er('venter');
  return (
    <ol className="flex flex-col justify-end text-[#15130F]" data-testid="v4-trad">
      {TRAD.map((m, i) => {
        const vis = er(m.fase);
        if (m.type === 'bilde') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="flex justify-end pb-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.alt} width={720} height={540} draggable={false} className="block w-[172px] rounded-[16px] object-cover sm:w-[212px]" style={{ aspectRatio: '4 / 3', boxShadow: SKYGGE }} data-testid="v4-trad-bilde" />
                </div>
              </Inn>
            </li>
          );
        }
        if (m.type === 'jonas') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="flex justify-end pb-3.5">
                  <div className="max-w-[84%]">
                    <p className="rounded-[16px] rounded-br-[5px] px-4 py-2.5 text-[14.5px] leading-[1.42]" style={{ background: 'rgba(255,255,255,0.14)', color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)' }}>{m.t}</p>
                    <p className="mt-1.5 text-right text-[11.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Jonas · {m.tid}</p>
                  </div>
                </div>
              </Inn>
            </li>
          );
        }
        if (m.type === 'kort') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="pb-3.5">
                  <div className="max-w-[90%] rounded-[16px] rounded-bl-[5px] px-4 pb-3 pt-3" style={{ background: '#fff', boxShadow: SKYGGE }} data-testid="v4-trad-kort">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="text-[14.5px] font-medium">Rørlegger AS <span className="font-normal text-[#15130F]/55">· torsdag 09:00</span></p>
                      <p className="text-[11.5px] text-[#15130F]/42">{m.tid}</p>
                    </div>
                    <p className="mt-0.5 text-[13px] leading-[1.42] text-[#15130F]/58">Bygårdens faste rørlegger · feilsøking av bereder</p>
                    <div className="grid" style={{ gridTemplateRows: venter ? '1fr' : '0fr', transition: `grid-template-rows 480ms ${EASE}` }} aria-hidden={!venter}>
                      <div className="min-h-0 overflow-hidden">
                        <div className="mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5 text-[12.5px]" style={{ borderColor: HAIR, opacity: venter ? 1 : 0, transition: `opacity 380ms ${EASE} 120ms` }}>
                          <span className="inline-grid">
                            <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ color: 'rgba(21,19,15,0.72)', opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på eierens godkjenning
                            </span>
                            <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 font-medium" style={{ color: '#166B3C', opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>
                              <Hake />Godkjent · besøket er bekreftet
                            </span>
                          </span>
                          <span className="text-[#15130F]/42" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>ons. 08:02</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Inn>
            </li>
          );
        }
        return (
          <li key={i}>
            <Inn vis={vis}>
              <div className="pb-3.5">
                <div className="max-w-[90%] rounded-[16px] rounded-bl-[5px] px-4 py-2.5" style={{ background: '#fff', boxShadow: SKYGGE }}>
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="flex items-center gap-2 text-[14.5px] font-medium">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: m.lost ? T.gronn : 'rgba(21,19,15,0.5)' }} />
                      {m.t}
                    </p>
                    <p className="text-[11.5px] text-[#15130F]/42">{m.tid}</p>
                  </div>
                  <p className="mt-0.5 text-[13px] leading-[1.42] text-[#15130F]/58">{m.d}</p>
                </div>
              </div>
            </Inn>
          </li>
        );
      })}
    </ol>
  );
}

export default function LeietakerSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.45);
  const { er, ferdig, replay } = useSekvens(FASER, synlig);
  const akt2 = er('morph');
  const lost = er('lost');
  const venterNa = er('venter') && !er('godkjent');

  return (
    <section id="leietaker" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-leietaker">
      <div className="mx-auto max-w-[1760px] px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-32 lg:pt-6">
        {/* ── Scenen ── */}
        <div className="relative h-[92svh] min-h-[760px] overflow-hidden rounded-[24px] lg:h-[clamp(680px,86vh,900px)] lg:rounded-[28px]" style={{ background: MORK }} data-testid="v4-leietaker-scene">
          {/* Lag 0: video eller stillbilde med svak, sakte bevegelse */}
          <div className="absolute inset-0" style={{ transform: synlig ? 'scale(1)' : 'scale(1.07)', transition: `transform 16000ms cubic-bezier(0.2,0.6,0.2,1)` }}>
            {SCENE.video ? (
              <video className="h-full w-full object-cover" style={{ objectPosition: SCENE.pos }} src={SCENE.video} poster={SCENE.bilde} autoPlay muted loop playsInline aria-hidden="true" />
            ) : (
              <picture>
                <source media="(min-width: 1024px)" srcSet={SCENE.bilde} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={SCENE.bildeMobil} alt="" aria-hidden="true" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: SCENE.pos }} />
              </picture>
            )}
          </div>
          {/* Lag 1: tone. Akt 1 — lesbar bunn. Akt 2 — hele scenen trekker seg tilbake. */}
          <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.12) 0%, rgba(21,18,15,0.22) 45%, rgba(21,18,15,0.80) 100%)' }} />
          <div aria-hidden="true" className="absolute inset-0" style={{ background: MORK, opacity: akt2 ? 0.66 : 0, transition: `opacity 1100ms ${EASE}` }} />

          {/* Kontekst — én linje øverst */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-4 px-6 pt-6 text-[13px] sm:px-9 sm:pt-7 lg:px-12 lg:pt-9" style={{ color: 'rgba(244,241,234,0.66)' }}>
            <span>Nygårdsgaten 5 · leilighet 2 · tirsdag 22:41</span>
            <span className="inline-grid shrink-0" style={{ opacity: akt2 ? 1 : 0, transition: `opacity 500ms ${EASE} 400ms` }}>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ opacity: lost ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: venterNa ? T.lilla : 'rgba(244,241,234,0.6)', transition: `background-color 300ms ${EASE}` }} />Under behandling
              </span>
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 font-medium" style={{ color: T.offwhite, opacity: lost ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>
                <Hake />Løst
              </span>
            </span>
          </div>

          {/* Akt 1: tittelen — én editorial linje over scenen */}
          <div className="absolute inset-x-0 bottom-0 px-6 pb-8 sm:px-9 sm:pb-10 lg:px-12 lg:pb-12" style={{ opacity: akt2 ? 0 : 1, transform: akt2 ? 'translateY(22px)' : 'none', transition: `opacity 600ms ${EASE}, transform 700ms ${EASE}`, pointerEvents: akt2 ? 'none' : 'auto' }} aria-hidden={akt2}>
            <h2 className="max-w-[16ch] text-[clamp(40px,5.2vw,84px)]" style={{ ...display, color: T.offwhite }} data-testid="v4-leietaker-tittel">
              Leietakeren får svar.<br />Du får bare beslutningen.
            </h2>
            <p className="mt-5 max-w-[46ch] text-[16px] leading-[1.5] sm:text-[18px] lg:mt-6" style={{ color: 'rgba(244,241,234,0.72)' }}>
              Jonas melder fra i portalen. DigiHome oppretter saken, finner riktig rørlegger og holder ham oppdatert — helt til det er løst.
            </p>
          </div>

          {/* Akt 2: tråden tar flaten */}
          <div className="absolute inset-x-0 bottom-0 flex justify-center px-5 pb-7 sm:px-9 sm:pb-9 lg:pb-11" style={{ opacity: akt2 ? 1 : 0, transform: akt2 ? 'none' : 'translateY(36px) scale(0.97)', transition: `opacity 700ms ${EASE} 250ms, transform 900ms ${EASE} 250ms`, pointerEvents: akt2 ? 'auto' : 'none' }} aria-hidden={!akt2}>
            <div className="w-full max-w-[440px]">
              <Trad er={er} />
            </div>
          </div>

          {/* Se igjen — stille, nederst til høyre, kun når ferdig */}
          <button type="button" onClick={replay} tabIndex={ferdig ? 0 : -1} className="absolute bottom-6 left-6 text-[12.5px] underline underline-offset-4 decoration-[#F4F1EA]/30 sm:bottom-8 sm:left-9 lg:bottom-10 lg:left-12" style={{ color: 'rgba(244,241,234,0.6)', opacity: ferdig ? 1 : 0, transition: `opacity 500ms ${EASE} 800ms`, pointerEvents: ferdig ? 'auto' : 'none' }} aria-hidden={!ferdig} data-testid="v4-leietaker-replay">Se igjen</button>
        </div>

        {/* ── Under: tre proof points, nesten usynlig ── */}
        <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[14.5px] sm:text-[15px] lg:mt-9" style={{ color: 'rgba(21,19,15,0.6)' }} data-testid="v4-leietaker-proof">
          {PROOF.map((p, i) => (
            <li key={p} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true" className="h-[3px] w-[3px] rounded-full" style={{ background: 'rgba(21,19,15,0.35)' }} />}
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
