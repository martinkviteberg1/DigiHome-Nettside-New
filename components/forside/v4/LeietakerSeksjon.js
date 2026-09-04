'use client';

import React, { useRef } from 'react';
import { EASE, Knapp, T, display, useSekvens, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   LeietakerSeksjon — Sana-splitt: 1:1-scene til venstre, register til høyre.

   Venstre  Kvadratisk scene (video/foto av leietakeren hjemme). Nederst i
            scenen lever en KOMPAKT tråd: maks tre meldinger synlige, eldre
            glir ut i toppen når nye kommer nederst. Personen forsvinner aldri.
   Høyre    Ikke forklaring — et register i stor skrift, som Sana: ett steg
            aktivt (ink + pil), resten dempet. Registeret drives av tråden.
            Under: én setning om at systemet forstår boligen, og én CTA.

   Sekvensen spiller én gang når seksjonen er i view, holder på «Venter på
   eierens godkjenning» (det er poenget) og hviler i sluttbildet.
   Scenen er bygget for eget opptak: SCENE.video (muted, loop, playsInline,
   poster = SCENE.bilde). Til det finnes: stillbilde med sakte bevegelse.
   Redusert bevegelse → rett til sluttbildet.
--------------------------------------------------------------------------- */

const SCENE = {
  video: null,                           // f.eks. '/v4/leietaker-kveld.mp4' — eget opptak (1:1 eller beskjæres), ikke stock
  bilde: '/v4/jonas-kveld-bred.webp',    // PLASSHOLDER til eget opptak finnes
  pos: '58% 45%',
};

/* Tempo: raskt der systemet svarer, sakte der mennesker er involvert. */
const FASER = [
  { navn: 'start', ms: 900 },
  { navn: 'foto', ms: 650 },
  { navn: 'meldt', ms: 800 },
  { navn: 'registrert', ms: 1600 },
  { navn: 'leverandor', ms: 500 },
  { navn: 'venter', ms: 2400 },        // det menneskelige leddet — holdes
  { navn: 'godkjent', ms: 1700 },
  { navn: 'lost', ms: 1200 },
  { navn: 'takk', ms: 0 },
];

/* Registeret til høyre. `fase` = når steget blir aktivt. `venter` = fasen der steget venter på deg. */
const STEG = [
  { fase: 'foto', t: 'Meldt inn med bilde' },
  { fase: 'registrert', t: 'Forstått som VVS, haster' },
  { fase: 'leverandor', t: 'Riktig rørlegger foreslått' },
  { fase: 'godkjent', venter: 'venter', t: 'Godkjent av deg', tVenter: 'Venter på deg' },
  { fase: 'lost', t: 'Løst og dokumentert' },
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
const VINDU = 3;   // maks synlige meldinger — resten glir ut i toppen

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

/* Rad som vokser inn (grid-rows 0fr → 1fr) og fader — og ut igjen når den faller ut av vinduet. */
function Inn({ vis, children }) {
  return (
    <div className="grid" style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: `grid-template-rows 560ms ${EASE}` }} aria-hidden={!vis}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 420ms ${EASE} ${vis ? 120 : 0}ms, transform 420ms ${EASE} ${vis ? 120 : 0}ms` }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* ── Kompakt tråd — maks tre synlige, eldre glir ut ── */
function Trad({ er }) {
  const godkjent = er('godkjent');
  const venter = er('venter');
  const synlige = TRAD.map((m, i) => (er(m.fase) ? i : -1)).filter((i) => i >= 0);
  const vindu = new Set(synlige.slice(-VINDU));
  return (
    <ol className="flex flex-col justify-end text-[#15130F]" data-testid="v4-trad">
      {TRAD.map((m, i) => {
        const vis = vindu.has(i);
        if (m.type === 'bilde') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="flex justify-end pb-1.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.src} alt={m.alt} width={720} height={540} draggable={false} className="block w-[168px] rounded-[16px] object-cover sm:w-[196px]" style={{ aspectRatio: '4 / 3', boxShadow: SKYGGE }} data-testid="v4-trad-bilde" />
                </div>
              </Inn>
            </li>
          );
        }
        if (m.type === 'jonas') {
          return (
            <li key={i}>
              <Inn vis={vis}>
                <div className="flex justify-end pb-3">
                  <div className="max-w-[86%]">
                    <p className="rounded-[16px] rounded-br-[5px] px-4 py-2.5 text-[14.5px] leading-[1.42]" style={{ background: 'rgba(255,255,255,0.14)', color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>{m.t}</p>
                    <p className="mt-1.5 text-right text-[11.5px]" style={{ color: 'rgba(244,241,234,0.62)' }}>Jonas · {m.tid}</p>
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
                <div className="pb-3">
                  <div className="max-w-[92%] rounded-[16px] rounded-bl-[5px] px-4 pb-3 pt-3" style={{ background: '#fff', boxShadow: SKYGGE }} data-testid="v4-trad-kort">
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
              <div className="pb-3">
                <div className="max-w-[92%] rounded-[16px] rounded-bl-[5px] px-4 py-2.5" style={{ background: '#fff', boxShadow: SKYGGE }}>
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

/* ── Registeret — Sana-liste: ett aktivt steg (ink + pil), resten dempet ── */
function Register({ er }) {
  let aktivIdx = -1;
  STEG.forEach((s, i) => { if (er(s.fase) || (s.venter && er(s.venter))) aktivIdx = i; });
  return (
    <ol className="mt-5 lg:mt-6" data-testid="v4-register">
      {STEG.map((s, i) => {
        const aktiv = i === aktivIdx;
        const ferdig = er(s.fase);
        const venter = s.venter ? er(s.venter) && !ferdig : false;
        return (
          <li key={i} className="flex items-baseline gap-3 py-[3px] text-[clamp(28px,2.5vw,42px)] lg:gap-4" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.12, color: aktiv ? T.ink : 'rgba(21,19,15,0.26)', transition: `color 380ms ${EASE}` }} data-testid={`v4-register-${i}`} aria-current={aktiv ? 'step' : undefined}>
            <span aria-hidden="true" className="inline-block w-[0.9em] shrink-0" style={{ opacity: aktiv ? 1 : 0, transform: aktiv ? 'none' : 'translateX(-6px)', transition: `opacity 300ms ${EASE}, transform 380ms ${EASE}`, color: venter ? T.lilla : T.ink }}>→</span>
            <span>{venter && s.tVenter ? s.tVenter : s.t}</span>
          </li>
        );
      })}
    </ol>
  );
}

export default function LeietakerSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.4);
  const { er, ferdig, replay } = useSekvens(FASER, synlig);
  const lost = er('lost');
  const venterNa = er('venter') && !er('godkjent');

  return (
    <section id="leietaker" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-leietaker">
      <div className="mx-auto max-w-[1760px] px-5 pb-24 pt-16 sm:px-8 lg:px-10 lg:pb-32 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-10 2xl:gap-16">
          {/* ── Venstre: 1:1-scene med kompakt tråd nederst ── */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] sm:aspect-square lg:rounded-[28px]" style={{ background: MORK }} data-testid="v4-leietaker-scene">
              <div className="absolute inset-0" style={{ transform: synlig ? 'scale(1)' : 'scale(1.07)', transition: 'transform 16000ms cubic-bezier(0.2,0.6,0.2,1)' }}>
                {SCENE.video ? (
                  <video className="h-full w-full object-cover" style={{ objectPosition: SCENE.pos }} src={SCENE.video} poster={SCENE.bilde} autoPlay muted loop playsInline aria-hidden="true" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={SCENE.bilde} alt="" aria-hidden="true" draggable={false} className="h-full w-full object-cover" style={{ objectPosition: SCENE.pos }} />
                )}
              </div>
              {/* Tone: lesbar bunn, ellers urørt */}
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0.10) 0%, rgba(21,18,15,0.08) 40%, rgba(21,18,15,0.62) 78%, rgba(21,18,15,0.82) 100%)' }} />

              {/* Kontekst øverst — små mørke glasspiller, lesbare på alt opptak */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 pt-5 text-[12.5px] sm:px-7 sm:pt-7" style={{ color: 'rgba(244,241,234,0.86)' }}>
                <span className="inline-flex h-7 items-center rounded-full px-3" style={{ background: 'rgba(21,18,15,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}><span className="hidden sm:inline">Nygårdsgaten 5 · </span>Leilighet 2</span>
                <span className="inline-grid shrink-0">
                  <span className="col-start-1 row-start-1 inline-flex h-7 items-center gap-2 rounded-full px-3" style={{ background: 'rgba(21,18,15,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', opacity: lost ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: venterNa ? T.lilla : 'rgba(244,241,234,0.7)', transition: `background-color 300ms ${EASE}` }} />{er('registrert') ? 'Under behandling' : 'tirsdag 22:41'}
                  </span>
                  <span className="col-start-1 row-start-1 inline-flex h-7 items-center gap-1.5 rounded-full px-3 font-medium" style={{ background: 'rgba(31,157,85,0.85)', color: '#fff', opacity: lost ? 1 : 0, transition: `opacity 300ms ${EASE} 250ms` }}>
                    <Hake />Løst
                  </span>
                </span>
              </div>

              {/* Tråden — nederst til venstre, som Sanas UI-fragment */}
              <div className="absolute inset-x-0 bottom-0 px-5 pb-5 sm:px-8 sm:pb-8">
                <div className="w-full max-w-[420px]">
                  <Trad er={er} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Høyre: register, én setning, én CTA ── */}
          <div className="lg:col-span-5 lg:col-start-8">
            <p className="flex items-center gap-2.5 text-[15px] font-medium" style={{ color: 'rgba(21,19,15,0.7)' }}>
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Slik oppleves DigiHome for leietakeren
            </p>
            <Register er={er} />
            <p className="mt-10 max-w-[42ch] text-[17px] leading-[1.5] sm:text-[18px] lg:mt-14" style={{ color: 'rgba(21,19,15,0.66)' }}>
              Når Jonas skriver at varmtvannet er borte, vet DigiHome hvilken leilighet, hvilken bereder og hvem som er fast rørlegger — og at det haster. Du får ett spørsmål.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-5">
              <Knapp href="/bli-utleier/start" variant="ink" data-testid="v4-leietaker-cta">Start med din adresse</Knapp>
              <button type="button" onClick={replay} tabIndex={ferdig ? 0 : -1} className="text-[13.5px] underline underline-offset-4 decoration-[#15130F]/30" style={{ color: 'rgba(21,19,15,0.6)', opacity: ferdig ? 1 : 0, transition: `opacity 500ms ${EASE} 600ms`, pointerEvents: ferdig ? 'auto' : 'none' }} aria-hidden={!ferdig} data-testid="v4-leietaker-replay">Se igjen</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
