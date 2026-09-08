'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, Knapp, T, display, useRedusert, useSekvens, useSmal, useSynlig } from './motion';

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
  /* Brukerens eget opptak: lys skandinavisk stue, leietakeren i sofaen med telefonen. 1:1-kilde (2880²) →
     sømløs loop på ~8,8 s (siste 1,2 s krysstonet inn i det første), uten lyd. Desktop 1920² (VP9 ~1,4 MB / H.264 ~3 MB),
     smal skjerm 960² (~0,5 MB). Poster = loopens første frame. Redusert bevegelse / data-sparing → bare poster. */
  video: { webm: '/v4/video/stue-1920.webm', mp4: '/v4/video/stue-1920.mp4', mp4Smal: '/v4/video/stue-960.mp4' },
  bilde: '/v4/video/stue-poster.webp',         // 1920×1920 — poster/stillbilde
  bildeMobil: '/v4/video/stue-poster-960.webp', // 960×960
  pos: '50% 50%',
};

/* ── Scenevideo — poster først, video tones inn når den kan spille. Laster først når scenen nærmer seg (900 px),
      spiller bare mens seksjonen er i view, og respekterer prefers-reduced-motion (da kun poster). ── */
function SceneVideo({ aktiv }) {
  const redusert = useRedusert();
  const smal = useSmal();
  const ref = useRef(null);
  const holder = useRef(null);
  const [naer, setNaer] = useState(false);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    const el = holder.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setNaer(true); return undefined; }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setNaer(true); obs.disconnect(); } }, { rootMargin: '900px 0px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (aktiv) { const p = el.play(); if (p && p.catch) p.catch(() => {}); } else el.pause();
  }, [aktiv, klar]);

  const poster = smal ? SCENE.bildeMobil : SCENE.bilde;
  return (
    <div ref={holder} className="absolute inset-0">
      {/* Posteren: nettleseren velger 960² på smal skjerm allerede i første forespørsel (ikke via JS etter hydrering),
          og laster den først når seksjonen nærmer seg. */}
      <picture>
        <source media="(max-width: 639px)" srcSet={SCENE.bildeMobil} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={SCENE.bilde} alt="" aria-hidden="true" draggable={false} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: SCENE.pos }} />
      </picture>
      {!redusert && naer && (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: SCENE.pos, opacity: klar ? 1 : 0, transition: `opacity 1000ms ${EASE}` }}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          poster={poster}
          disablePictureInPicture
          disableRemotePlayback
          onCanPlay={() => setKlar(true)}
          aria-hidden="true"
          data-testid="v4-leietaker-video"
        >
          {smal ? (
            <source src={SCENE.video.mp4Smal} type="video/mp4" />
          ) : (
            <>
              <source src={SCENE.video.webm} type="video/webm" />
              <source src={SCENE.video.mp4} type="video/mp4" />
            </>
          )}
        </video>
      )}
    </div>
  );
}

/* Tempo: raskt der systemet svarer, sakte der mennesker er involvert. */
const FASER = [
  { navn: 'start', ms: 700 },
  { navn: 'foto', ms: 600 },
  { navn: 'meldt', ms: 1400 },
  { navn: 'registrert', ms: 1700 },
  { navn: 'leverandor', ms: 700 },
  { navn: 'venter', ms: 2400 },        // det menneskelige leddet — holdes
  { navn: 'godkjent', ms: 1900 },
  { navn: 'lost', ms: 1500 },
  { navn: 'takk', ms: 0 },
];

/* Høyre side: ikke prosess-steg, men det DigiHome FORSTO fra én melding — boligen, utstyret, saken,
   leverandøren, og hva som er igjen til deg. Hver rad kommer når tråden har kommet dit. */
const FORSTATT = [
  { fase: 'meldt', k: 'Bolig', v: 'Nygårdsgaten 5 · Leilighet 2' },
  { fase: 'registrert', k: 'Utstyr', v: 'Varmtvannsbereder på badet' },
  { fase: 'registrert', k: 'Sak', v: 'VVS · haster · mangel' },
  { fase: 'leverandor', k: 'Leverandør', v: 'Rørlegger AS · bygårdens faste' },
  { fase: 'venter', k: 'Deg', v: 'Én godkjenning', vFerdig: 'Godkjent · torsdag 09:00', ferdig: 'godkjent' },
];

/* Tråden slik leietakeren (Ida) ser den. To stemmer, to bobler:
   leietaker = mørk glassboble til høyre (som i meldingsapper), DigiHome = papirboble til venstre med merket.
   'status' er det DigiHome faktisk sender leietakeren. 'kort' = rørleggeravtalen, som oppdateres på stedet
   (venter → godkjent). Leietakeren ser aldri pris. */
const TRAD = [
  { fase: 'foto', fra: 'leietaker', type: 'bilde', src: '/v4/bereder-3x4.webp', alt: 'Varmtvannsbereder på badet, rød lampe lyser' },
  { fase: 'meldt', fra: 'leietaker', t: 'Varmtvannet er borte i hele leiligheten. Lampen på berederen blinker rødt.', tid: 'tir. 22:41' },
  { fase: 'registrert', fra: 'digihome', t: 'Saken er registrert · haster', d: 'Eier er varslet.', tid: '22:41' },
  { fase: 'leverandor', fra: 'digihome', type: 'kort', t: 'Rørlegger AS · torsdag 09:00', d: 'Bygårdens faste rørlegger', tid: '22:43' },
  { fase: 'lost', fra: 'digihome', t: 'Saken er løst', d: 'Berederen er reparert.', tid: 'tor. 10:14', lost: true },
  { fase: 'takk', fra: 'leietaker', t: 'Fungerer igjen. Takk!', tid: '10:20' },
];

const HAIR = 'rgba(21,19,15,0.08)';
const SKYGGE = '0 14px 36px -18px rgba(0,0,0,0.5), 0 1px 0 rgba(21,19,15,0.04)';
const MORK = '#15120F';
const GLASS = { background: 'rgba(21,18,15,0.80)', color: T.offwhite, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.14), 0 10px 30px -16px rgba(0,0,0,0.55)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' };

function Hake({ className = '', style }) {
  return (
    <svg aria-hidden="true" width="12" height="12" viewBox="0 0 14 14" fill="none" className={className} style={style}>
      <path d="M2.5 7.5l3 3 6-6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Melding som vokser inn (grid-rows 0fr → 1fr) — tråden over glir opp som én bevegelse.
   Innholdet kommer 10 px opp + 3 % skala → hvile, med expo-out. Ingen «utglidning»: eldre meldinger
   skyves opp under masken i toppen av vinduet, slik en ekte tråd gjør. */
function Inn({ vis, fra, gammel = false, children }) {
  const o = !vis ? 0 : gammel ? 0 : 1;
  return (
    <div className="grid" style={{ gridTemplateRows: vis ? '1fr' : '0fr', transition: `grid-template-rows ${vis ? 560 : 360}ms ${EASE}` }} aria-hidden={!vis || gammel}>
      <div className="min-h-0 overflow-hidden">
        <div style={{ opacity: o, transform: vis ? 'none' : 'translateY(10px) scale(0.97)', transformOrigin: fra === 'leietaker' ? '100% 100%' : '0% 100%', transition: vis ? `opacity ${gammel ? 700 : 420}ms ${EASE} ${gammel ? 0 : 60}ms, transform 640ms ${EASE} 40ms` : `opacity 200ms ease-out, transform 260ms ease-in`, willChange: 'opacity, transform' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/* DigiHome-merket ved boblene — papirsirkel med ikonet, nederst ved boblen (som i meldingsapper). */
function Merke() {
  return (
    <span aria-hidden="true" className="mb-[2px] inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: '#FBFAF8', boxShadow: `0 0 0 1px ${HAIR}, 0 6px 14px -8px rgba(0,0,0,0.4)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img loading="lazy" decoding="async" src="/brand/digihome-icon-purple.svg" alt="" width={11} height={11} className="h-[11px] w-[11px]" />
    </span>
  );
}

/* ── Tråden — fast vindu nederst i scenen, bunnforankret, maskert i toppen. Nye meldinger skyver eldre opp. ── */
function Trad({ er }) {
  const godkjent = er('godkjent');
  const venter = er('venter');
  const antallVis = TRAD.filter((m) => er(m.fase)).length;
  const VINDU = 4; // så mange meldinger står skarpt; eldre tones ut oppover
  return (
    <div
      className="relative h-[330px] sm:h-[410px]"
      style={{ WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 14%, #000 100%)', maskImage: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, #000 14%, #000 100%)' }}
      data-testid="v4-trad"
    >
      <ol className="absolute inset-x-0 bottom-0 flex flex-col text-[#15130F]">
        {TRAD.map((m, i) => {
          const vis = er(m.fase);
          const gammel = vis && antallVis - i > VINDU;
          const forrige = TRAD[i - 1];
          const neste = TRAD[i + 1];
          const nyGruppe = !forrige || forrige.fra !== m.fra;
          const sisteIGruppe = !neste || neste.fra !== m.fra;
          const gap = i === 0 ? '' : nyGruppe ? 'pt-3.5' : 'pt-1.5';

          if (m.fra === 'leietaker') {
            return (
              <li key={i}>
                <Inn vis={vis} fra="leietaker" gammel={gammel}>
                  <div className={`flex flex-col items-end ${gap}`}>
                    {m.type === 'bilde' ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img loading="lazy" decoding="async" src={m.src} alt={m.alt} width={600} height={800} draggable={false} className="block w-[124px] rounded-[16px] rounded-br-[6px] object-cover sm:w-[136px]" style={{ aspectRatio: '3 / 4', boxShadow: '0 12px 30px -16px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.10)' }} data-testid="v4-trad-bilde" />
                    ) : (
                      <p className="max-w-[80%] rounded-[18px] rounded-br-[6px] px-4 py-2.5 text-[14.5px] leading-[1.42]" style={GLASS}>{m.t}</p>
                    )}
                    {sisteIGruppe && m.tid && (
                      <span className="mt-1.5 inline-flex h-[18px] items-center rounded-full px-2 text-[11px]" style={{ background: 'rgba(21,18,15,0.42)', color: 'rgba(244,241,234,0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>Ida · {m.tid}</span>
                    )}
                  </div>
                </Inn>
              </li>
            );
          }

          /* DigiHome — papirboble, merket nederst til venstre på første i gruppen */
          return (
            <li key={i}>
              <Inn vis={vis} fra="digihome" gammel={gammel}>
                <div className={`flex items-end gap-2 ${gap}`}>
                  {nyGruppe ? <Merke /> : <span aria-hidden="true" className="w-[22px] shrink-0" />}
                  <div className="max-w-[84%] rounded-[18px] rounded-bl-[6px] px-4 pb-3 pt-2.5" style={{ background: '#FBFAF8', boxShadow: SKYGGE }} data-testid={m.type === 'kort' ? 'v4-trad-kort' : undefined}>
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="flex items-center gap-2 text-[14px] font-medium">
                        {m.lost && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.gronn }} />}
                        {m.t}
                      </p>
                      <p className="shrink-0 text-[11.5px] tabular-nums text-[#15130F]/42">{m.tid}</p>
                    </div>
                    {m.d && <p className="mt-0.5 text-[13px] leading-[1.42] text-[#15130F]/58">{m.d}</p>}
                    {m.type === 'kort' && (
                      <div className="grid" style={{ gridTemplateRows: venter ? '1fr' : '0fr', transition: `grid-template-rows 480ms ${EASE}` }} aria-hidden={!venter}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="mt-2.5 flex items-center justify-between gap-3 border-t pt-2.5 text-[12.5px]" style={{ borderColor: HAIR, opacity: venter ? 1 : 0, transition: `opacity 380ms ${EASE} 120ms` }}>
                            <span className="inline-grid">
                              <span className="col-start-1 row-start-1 inline-flex items-center gap-2" style={{ color: 'rgba(21,19,15,0.72)', opacity: godkjent ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>
                                <span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på eiers godkjenning
                              </span>
                              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5 font-medium" style={{ color: '#166B3C', opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>
                                <Hake />Godkjent · besøket er bekreftet
                              </span>
                            </span>
                            <span className="tabular-nums text-[#15130F]/42" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>ons. 08:02</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Inn>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Forståelsen — det DigiHome leste ut av én melding. Åpne rader på hårlinjer, kommer inn i takt med tråden. ── */
function Forstaelse({ er }) {
  return (
    <dl className="mt-3" data-testid="v4-forstaelse">
      {FORSTATT.map((r, i) => {
        const vis = er(r.fase);
        const ferdig = r.ferdig ? er(r.ferdig) : false;
        const venter = vis && r.ferdig && !ferdig;
        return (
          <div key={r.k} className="grid grid-cols-[104px_minmax(0,1fr)] items-baseline gap-4 py-3 text-[15px]" style={{ borderTop: `1px solid ${HAIR}`, opacity: vis ? 1 : 0.28, transition: `opacity 520ms ${EASE}` }} data-testid={`v4-forstaelse-${i}`}>
            <dt className="text-[13.5px]" style={{ color: 'rgba(21,19,15,0.5)' }}>{r.k}</dt>
            <dd className="inline-grid">
              <span className="col-start-1 row-start-1 flex items-center gap-2" style={{ color: T.ink, opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(6px)', transition: `opacity 480ms ${EASE}, transform 620ms ${EASE}` }}>
                {venter && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: T.lilla }} />}
                <span style={{ opacity: ferdig ? 0 : 1, transition: `opacity 200ms ${EASE}` }} className="col-start-1 row-start-1">{r.v}</span>
              </span>
              {r.vFerdig && (
                <span className="col-start-1 row-start-1 flex items-center gap-2 font-medium" style={{ color: '#166B3C', opacity: ferdig ? 1 : 0, transition: `opacity 300ms ${EASE} 260ms` }}>
                  <Hake />{r.vFerdig}
                </span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
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
      {/* Container: editorial (1360) — 58/42, 80 px gap. Én komposisjon, ikke to ting som fyller hver sin halvdel av skjermen. */}
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-24 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-32 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-[58fr_42fr] lg:items-center lg:gap-16 xl:gap-20">
          {/* ── Venstre: 1:1-scene med kompakt tråd nederst ── */}
          <div>
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] sm:aspect-square lg:rounded-[28px]" style={{ background: MORK }} data-testid="v4-leietaker-scene">
              <div className="absolute inset-0" style={{ transform: synlig ? 'scale(1)' : 'scale(1.04)', transition: 'transform 18000ms cubic-bezier(0.2,0.6,0.2,1)', willChange: 'transform' }}>
                <SceneVideo aktiv={synlig} />
              </div>
              {/* Tone: lyst bilde — bare et pust av dybde nederst, ingen mørk plate */}
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 75% 60% at 25% 100%, rgba(21,18,15,0.34) 0%, rgba(21,18,15,0) 72%), linear-gradient(180deg, rgba(21,18,15,0) 28%, rgba(21,18,15,0.14) 50%, rgba(21,18,15,0.42) 76%, rgba(21,18,15,0.66) 100%)' }} />

              {/* Kontekst øverst — små mørke glasspiller, lesbare på alt opptak */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-5 pt-5 text-[12.5px] sm:px-7 sm:pt-7" style={{ color: 'rgba(244,241,234,0.86)' }}>
                <span className="inline-flex h-7 items-center rounded-full px-3" style={{ background: 'rgba(21,18,15,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}><span className="hidden sm:inline">Nygårdsgaten 5 · </span>Leilighet 2</span>
                {/* Status — én og samme glasspille hele veien; bare prikken og teksten skifter (ingen grønn plate) */}
                <span className="inline-flex h-7 shrink-0 items-center gap-2 rounded-full px-3" style={{ background: 'rgba(21,18,15,0.42)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }} data-testid="v4-scene-status">
                  <span className="inline-grid h-3 w-3 place-items-center">
                    <span className="col-start-1 row-start-1 h-1.5 w-1.5 rounded-full" style={{ background: venterNa ? T.lilla : 'rgba(244,241,234,0.7)', opacity: lost ? 0 : 1, transition: `background-color 300ms ${EASE}, opacity 200ms ${EASE}` }} />
                    <Hake className="col-start-1 row-start-1" style={{ color: '#5FCB8A', opacity: lost ? 1 : 0, transition: `opacity 300ms ${EASE} 200ms` }} />
                  </span>
                  <span className="inline-grid">
                    <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: lost ? 0 : 1, transition: `opacity 200ms ${EASE}` }}>{er('registrert') ? 'Under behandling' : 'tirsdag 22:41'}</span>
                    <span className="col-start-1 row-start-1 whitespace-nowrap" style={{ opacity: lost ? 1 : 0, transition: `opacity 300ms ${EASE} 200ms` }}>Løst · torsdag 10:14</span>
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

          {/* ── Høyre: én påstand (AI som forstår boligen), én setning, det systemet forsto, én CTA ── */}
          <div>
            <h2 className="text-[clamp(36px,3vw,54px)]" style={{ ...display, color: T.ink }} data-testid="v4-leietaker-tittel">
              Forstår boligen.<br />Ikke bare meldingen.
            </h2>
            <p className="mt-6 max-w-[40ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: 'rgba(21,19,15,0.66)' }}>
              Én melding fra leietakeren. DigiHome vet hvilken leilighet, hvilken bereder og hvem som er fast rørlegger — og at det haster. Du får ett spørsmål.
            </p>
            <p className="mt-9 text-[13.5px] lg:mt-11" style={{ color: 'rgba(21,19,15,0.5)' }}>Forstått fra én melding</p>
            <Forstaelse er={er} />
            <div className="mt-9 flex flex-wrap items-center gap-5 lg:mt-10">
              <Knapp href="/bli-utleier/start" variant="ink" data-testid="v4-leietaker-cta">Start med din adresse</Knapp>
              <button type="button" onClick={replay} tabIndex={ferdig ? 0 : -1} className="text-[13.5px] underline underline-offset-4 decoration-[#15130F]/30" style={{ color: 'rgba(21,19,15,0.6)', opacity: ferdig ? 1 : 0, transition: `opacity 500ms ${EASE} 600ms`, pointerEvents: ferdig ? 'auto' : 'none' }} aria-hidden={!ferdig} data-testid="v4-leietaker-replay">Se igjen</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
