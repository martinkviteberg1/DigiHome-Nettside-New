'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   HeroScene — «boligen, og dagen DigiHome tok seg av».

   Prinsipp: alt er stille, unntatt én ting.

   Lag 0  Tonal flate (T.flate) som foto og dag deler. Panelet er ett objekt.
   Lag 1  Eiendommens dag: tider · rail · hendelser. Fullførte rader dempet.
   Lag 2  Ett godkjenningskort i varm charcoal som bryter ut av høyre kant.
          Den eneste skyggen i heroen. Dit skal øyet.

   Dramaturgi (~7,8 s, spilles én gang, hviler i sluttbildet):
     foto 2,0 → stig 1,0 (morph + rail) → rad1–3 1,3 → rad4 0,7 (aktiv sak)
     → kort 1,8 (godkjenningskort) → godkjent 1,0 (kollaps til chip) → ferdig
--------------------------------------------------------------------------- */

const FASER = [
  { navn: 'foto', ms: 2000 },
  { navn: 'stig', ms: 1000 },
  { navn: 'rad1', ms: 430 },
  { navn: 'rad2', ms: 430 },
  { navn: 'rad3', ms: 440 },
  { navn: 'rad4', ms: 700 },
  { navn: 'kort', ms: 1800 },
  { navn: 'godkjent', ms: 1000 },
  { navn: 'ferdig', ms: 0 },
];

const RADER = [
  { fase: 'rad1', tid: '08:14', t: 'Husleie registrert', s: `${tall(64500)} kr · 8 av 8` },
  { fase: 'rad2', tid: '10:32', t: 'Leiekontrakt signert', s: 'Emma Sørensen · Nygårdsgaten 5A', skjulMobil: true },
  { fase: 'rad3', tid: '17:46', t: 'Spørsmål fra Jonas løst', s: 'Besvart fra leiekontrakten', avatar: { src: '/v4/jonas.webp', alt: 'Jonas' }, skjulMobil: true },
  { fase: 'rad4', tid: '22:41', t: 'Varmtvann', s: 'Jonas meldte 22:41 · Sak opprettet automatisk', s2: 'Rørlegger AS bestilt · torsdag 09:00 · Jonas varslet', sak: true },
];

const CAPTION = 150;          // px — adressefeltet som ligger over fotoet
const SCENE_H = 'clamp(600px, 72vh, 720px)';
const SCENE_H_SMAL = 'clamp(560px, 70vh, 640px)';
const STRIPE = 0.43;          // andel foto synlig etter morph — header, ikke banner
/* Headeren viker for dagen på lave skjermer: dagen får alltid minst 400 px. */
const STRIPE_CSS = `min(${STRIPE * 100}%, calc(100% - 400px))`;
const FOKUS_Y = 0.68;         // fokuspunkt i bildet (fasade/balkong), andel av elementhøyden

function Avatar({ src, alt, size = 28, className = '', style }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size, boxShadow: '0 0 0 1px rgba(21,19,15,0.10)', ...style }}
    />
  );
}

/* Prikk på railen. Fullført = hul. Aktiv = lilla. Godkjent = grønn. */
function Prikk({ tilstand }) {
  const fylt = tilstand !== 'ferdig';
  return (
    <span
      aria-hidden="true"
      className="block h-[7px] w-[7px] rounded-full"
      style={{
        background: tilstand === 'aktiv' ? T.lilla : tilstand === 'godkjent' ? T.gronn : T.flate,
        boxShadow: fylt ? 'none' : 'inset 0 0 0 1px rgba(21,19,15,0.35)',
        transition: 'background 400ms, box-shadow 400ms',
      }}
    />
  );
}

export default function HeroScene() {
  const ref = useRef(null);
  const figRef = useRef(null);
  const radRef = useRef(null);
  const synlig = useSynlig(ref, 0.35);
  const { fase, er, ferdig, replay, kjorer } = useSekvens(FASER, synlig);
  const smal = useSmal();
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;

  /* Mobil: portrett-utsnitt av et kvadratisk foto viser mye lauv øverst.
     Gjør bildet høyere enn scenen og vis nedre del (fasaden). */
  const imgH = smal ? 1.35 : 1;
  const hvileTy = smal ? -30 : 0;
  const stigTy = ((STRIPE / 2) / imgH - FOKUS_Y) * 100;
  const zoomStripe = smal ? 1.15 : 1.06;

  const stig = er('stig');
  const godkjent = er('godkjent');
  const aktiv = er('rad4') && !godkjent;          // saken er åpen
  const visKort = er('kort') && !godkjent;        // godkjenningskortet er ute

  /* Kortets topp følger den aktive raden (måles når raden har landet). */
  const kortRef = useRef(null);
  const [kortTop, setKortTop] = useState(null);
  useEffect(() => {
    if (!er('kort')) return undefined;
    const mal = () => {
      if (!radRef.current || !figRef.current || !kortRef.current || !ref.current) return;
      const fig = figRef.current.getBoundingClientRect();
      const rad = radRef.current.getBoundingClientRect();
      const kortH = kortRef.current.offsetHeight;
      const midt = rad.top - fig.top + rad.height / 2 - kortH / 2;   // sentrert på raden
      const maks = ref.current.offsetHeight - kortH - 20;             // aldri under panelets bunn
      setKortTop(Math.round(Math.min(midt, maks)));
    };
    mal();
    window.addEventListener('resize', mal);
    return () => window.removeEventListener('resize', mal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  return (
    <figure ref={figRef} className="relative m-0" data-testid="v4-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: sceneH, background: T.flate, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.06)', '--stripe': STRIPE_CSS }}
        role="img"
        aria-label="Animert eksempel: en dag i Nygårdsgaten 5 med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier."
        data-testid="v4-scene"
      >
        {/* ── Foto. Kun transform: hvile → innpust (1.045) → glir opp til fasaden i headeren ── */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: stig ? 'var(--stripe)' : '100%', transition: `height 1000ms ${EASE}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/v4/bolig-hero.webp"
            alt=""
            className="w-full object-cover will-change-transform"
            style={{
              height: imgH === 1 ? sceneH : `calc(${sceneH} * ${imgH})`,
              objectPosition: smal ? '62% 50%' : '50% 68%',
              transformOrigin: `50% ${FOKUS_Y * 100}%`,
              transform: stig
                ? `translateY(${stigTy}%) scale(${zoomStripe})`
                : `translateY(${hvileTy}%) scale(${kjorer || ferdig ? 1.045 : 1})`,
              transition: stig
                ? `transform 1000ms ${EASE}`
                : 'transform 2400ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          />
          <div aria-hidden="true" className="absolute inset-0" style={{ background: 'rgba(214,190,150,0.08)', mixBlendMode: 'multiply' }} />
        </div>

        {/* ── Arket: [adresse over foto][eiendommens dag på flaten] — stiger ── */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col"
          style={{ height: `calc(100% - var(--stripe) + ${CAPTION}px)`, transform: stig ? 'translateY(0)' : `translateY(calc(100% - ${CAPTION}px))`, transition: `transform 1000ms ${EASE}` }}
        >
          {/* Adresse — stor og rendyrket i foto-tilstand, property header etter morph */}
          <div className="relative shrink-0 px-6 pb-5 text-white sm:px-7" style={{ height: CAPTION, background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.28) 45%, rgba(21,19,15,0.66) 100%)' }}>
            <div className="flex h-full items-end justify-between gap-4">
              <div>
                <div className="grid">
                  <p className="col-start-1 row-start-1 self-end text-[42px] sm:text-[52px]" style={{ ...display, letterSpacing: '-0.035em', opacity: stig ? 0 : 1, transform: stig ? 'translateY(-6px)' : 'none', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>Nygårdsgaten 5</p>
                  <p className="col-start-1 row-start-1 self-end text-[28px] sm:text-[34px]" style={{ ...display, letterSpacing: '-0.03em', opacity: stig ? 1 : 0, transition: `opacity 600ms ${EASE} 350ms` }}>Nygårdsgaten 5</p>
                </div>
                <p className="mt-1.5 text-[14px] text-white/80">Bergen · 8 leiligheter</p>
              </div>
            </div>
          </div>

          {/* Eiendommens dag — på flaten. Typografisk ledger med rail. Footer i bunn. */}
          <div className="flex flex-1 flex-col px-6 pb-5 pt-5 sm:px-7" style={{ background: T.flate, opacity: stig ? 1 : 0, transition: `opacity 500ms ${EASE} 450ms` }} aria-hidden={!stig}>
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <p className="text-[#15130F]">I dag</p>
              <p className="flex items-center gap-2 text-[#15130F]/60">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: aktiv ? T.lilla : T.gronn, transition: 'background 400ms' }} />
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1" style={{ opacity: aktiv ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                  <span className="col-start-1 row-start-1" style={{ opacity: aktiv ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Én ting venter på deg</span>
                </span>
              </p>
            </div>

            <ul className="relative mt-3">
              {/* Railen tegnes nedover når systemet våkner */}
              <span aria-hidden="true" className="absolute bottom-0 top-0 left-[7px] w-px sm:left-[51px]" style={{ background: 'rgba(21,19,15,0.14)', transformOrigin: 'top', transform: stig ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 700ms ${EASE} 450ms` }} />
              {RADER.map((r) => {
                const vis = er(r.fase);
                const erAktiv = r.sak && aktiv;
                const dempet = !r.sak;
                const tilstand = r.sak ? (godkjent ? 'godkjent' : 'aktiv') : 'ferdig';
                return (
                  <li
                    key={r.tid}
                    ref={r.sak ? radRef : undefined}
                    className={`relative ${r.skjulMobil ? 'hidden sm:block' : ''}`}
                    style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: `opacity 520ms ${EASE}, transform 520ms ${EASE}` }}
                  >
                    {/* Svak tonal stripe på den aktive saken */}
                    <span aria-hidden="true" className="absolute -inset-x-3 inset-y-0.5 rounded-[12px]" style={{ background: 'rgba(21,19,15,0.045)', opacity: erAktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                    <div className="relative grid grid-cols-[16px_minmax(0,1fr)_auto] items-start gap-x-3 py-3 sm:grid-cols-[44px_16px_minmax(0,1fr)_auto]">
                      <span className="hidden pt-[3px] text-[13px] tabular-nums text-[#15130F]/45 sm:block">{r.tid}</span>
                      <span className="flex justify-center pt-[7px]"><Prikk tilstand={tilstand} /></span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2 text-[15px] font-medium" style={{ color: dempet ? 'rgba(21,19,15,0.62)' : godkjent && r.sak ? 'rgba(21,19,15,0.85)' : T.ink, transition: 'color 400ms' }}>
                          {r.t}
                          {r.avatar && <Avatar src={r.avatar.src} alt={r.avatar.alt} size={20} />}
                        </span>
                        <span className="mt-0.5 block text-[13.5px] sm:truncate" style={{ color: dempet ? 'rgba(21,19,15,0.42)' : 'rgba(21,19,15,0.62)' }}>{r.s}</span>
                        {/* Saken ekspanderer med resultatet når den er godkjent */}
                        {r.sak && (
                          <span className="grid" style={{ gridTemplateRows: godkjent ? '1fr' : '0fr', transition: `grid-template-rows 500ms ${EASE}` }}>
                            <span className="block min-h-0 overflow-hidden">
                              <span className="mt-1 block text-[13.5px] text-[#15130F] sm:truncate" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 250ms` }}>{r.s2}</span>
                              {/* Mobil: chippen under resultatet */}
                              <span className="mt-2 inline-flex items-center gap-2 text-[12.5px] text-[#15130F]/60 sm:hidden" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 300ms` }}>
                                <Avatar src="/v4/kari.webp" alt="Kari" size={20} />
                                <span>Godkjent · 08:02</span>
                              </span>
                            </span>
                          </span>
                        )}
                      </span>
                      {r.sak && (
                        <span className="hidden items-center gap-2 pt-[2px] text-[12.5px] text-[#15130F]/60 sm:inline-flex" style={{ opacity: godkjent ? 1 : 0, transform: godkjent ? 'none' : 'translateY(4px)', transition: `opacity 400ms ${EASE} 200ms, transform 400ms ${EASE} 200ms` }} data-testid="v4-godkjent">
                          <Avatar src="/v4/kari.webp" alt="Kari" size={22} />
                          <span>Godkjent · 08:02</span>
                        </span>
                      )}
                    </div>
                    <span aria-hidden="true" className="block h-px" style={{ background: 'rgba(21,19,15,0.08)' }} />
                  </li>
                );
              })}
            </ul>

            {/* Footer i bunnen — ingen løs bildetekst under scenen */}
            <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
              <span data-testid="v4-scene-tekst">Én godkjenning. Resten var gjort.</span>
              <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} data-testid="v4-replay">Spill igjen</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lag 2: godkjenningskortet. Varm charcoal, én skygge, bryter ut av høyre kant. ── */}
      <div
        ref={kortRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 rounded-[18px] text-[#F4F1EA]"
        style={{
          background: T.charcoal,
          boxShadow: '0 30px 60px -28px rgba(21,19,15,0.55), 0 1px 2px rgba(21,19,15,0.18)',
          ...(smal
            ? { left: 16, right: 16, bottom: 16 }
            : { right: -24, width: 288, top: kortTop == null ? '52%' : kortTop }),
          opacity: visKort ? 1 : 0,
          transform: visKort ? 'none' : godkjent ? 'translate(-14px, -6px) scale(0.96)' : 'translateX(28px)',
          transition: visKort
            ? `opacity 520ms ${EASE}, transform 520ms ${EASE}`
            : `opacity 380ms ${EASE}, transform 380ms ${EASE}`,
        }}
        data-testid="v4-kort"
      >
        {smal ? (
          <div className="flex items-center justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[12px] text-white/60"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</p>
              <p className="mt-1 truncate text-[14px] font-medium">Rørlegger AS · torsdag 09:00</p>
              <p className="text-[13px] text-white/60">{tall(3450)} kr</p>
            </div>
            <span className="inline-flex h-10 shrink-0 items-center rounded-[10px] px-4 text-[14px] font-medium" style={{ background: T.lilla, color: T.ink }}>Godkjenn</span>
          </div>
        ) : (
          <div className="p-[18px]">
            <div className="flex items-center justify-between text-[12.5px] text-white/60">
              <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Venter på deg</span>
              <span className="tabular-nums">22:41</span>
            </div>
            <p className="mt-3.5 text-[15px] font-medium">Rørlegger AS</p>
            <p className="text-[13.5px] text-white/60">Torsdag 09:00</p>
            <p className="mt-3 text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1 }}>{tall(3450)} kr</p>
            <span className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[10px] text-[14px] font-medium" style={{ background: T.lilla, color: T.ink }}>Godkjenn</span>
            <p className="mt-2.5 text-[11.5px] text-white/45">Sak opprettet automatisk · sendt til Kari</p>
          </div>
        )}
      </div>
    </figure>
  );
}
