'use client';

import React, { useRef } from 'react';
import { EASE, T, display, tall, useSekvens, useSmal, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   HeroScene — «boligen, og dagen DigiHome tok seg av». Frameless.

   Frame 1  Boligen. Fotografisk, nesten ingen metadata. Adresse + by.
   Frame 2  Boligen komprimeres til en property header. Systemet våkner under.
   Frame 3  Eiendommens dag — ikke agentens logg. Tid · hendelse · detalj.
            Mennesker vises kun der mennesker faktisk er (Jonas, Kari).
            Én ting krevde eieren: én godkjenning. Resten var gjort.

   Faser spilles én gang når i view, hviler i sluttbildet:
     foto → stig → rad1–4 → godkjenn → godkjent → ferdig
--------------------------------------------------------------------------- */

const FASER = [
  { navn: 'foto', ms: 2200 },
  { navn: 'stig', ms: 1000 },
  { navn: 'rad1', ms: 540 },
  { navn: 'rad2', ms: 540 },
  { navn: 'rad3', ms: 540 },
  { navn: 'rad4', ms: 1300 },
  { navn: 'godkjenn', ms: 1700 },
  { navn: 'godkjent', ms: 1100 },
  { navn: 'ferdig', ms: 0 },
];

const RADER = [
  { fase: 'rad1', tid: '08:14', t: 'Husleie registrert', s: `${tall(64500)} kr · 8 av 8` },
  { fase: 'rad2', tid: '10:32', t: 'Leiekontrakt signert', s: 'Emma Sørensen · Nygårdsgaten 5A', skjulMobil: true },
  { fase: 'rad3', tid: '17:46', t: 'Spørsmål fra Jonas løst', s: 'Besvart fra leiekontrakten', avatar: { src: '/v4/jonas.webp', alt: 'Jonas' }, skjulMobil: true },
  { fase: 'rad4', tid: '22:41', t: 'Varmtvann', s: `Rørlegger foreslått · torsdag 09:00 · ${tall(3450)} kr`, s2: 'Rørlegger bestilt · torsdag 09:00', sak: true },
];

const CAPTION = 128;          // px — adressefeltet som ligger over fotoet
const SCENE_H = 'clamp(600px, 72vh, 720px)';
const SCENE_H_SMAL = 'clamp(500px, 64vh, 580px)';
const STRIPE = 0.38;          // andel foto synlig etter morph
const FOKUS_Y = 0.68;         // fokuspunkt i bildet (fasade/balkong), andel av høyden

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

export default function HeroScene() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.35);
  const { er, ferdig, replay, kjorer } = useSekvens(FASER, synlig);
  const smal = useSmal();
  const sceneH = smal ? SCENE_H_SMAL : SCENE_H;
  /* Mobil: portrett-utsnitt av et kvadratisk foto viser mye lauv øverst.
     Gjør bildet høyere enn scenen og vis nedre del (fasaden). */
  const imgH = smal ? 1.35 : 1;                       // bildehøyde relativt til scenen
  const hvileTy = smal ? -30 : 0;                     // % av bildets høyde i foto-tilstand
  const stigTy = ((STRIPE / 2) / imgH - FOKUS_Y) * 100; // fokuspunktet lander midt i stripen
  const zoomStripe = smal ? 1.15 : 1.06;
  const stig = er('stig');
  const venter = er('rad4') && !er('godkjent');
  const godkjent = er('godkjent');

  return (
    <figure className="relative m-0" data-testid="v4-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: sceneH }}
        role="img"
        aria-label="Animert eksempel: en dag i Nygårdsgaten 5 med DigiHome — husleie registrert, kontrakt signert, et spørsmål fra leietaker besvart fra kontrakten, og et varmtvannsproblem løst med én godkjenning fra eier."
        data-testid="v4-scene"
      >
        {/* ── Foto. Tre tilstander, én kontinuerlig bevegelse (kun transform):
              hvile → scale(1) · foto → sakte innpust til 1.045 · stig → glir opp
              til fokuspunktet (fasaden) og legger seg i stripen. ── */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: stig ? `${STRIPE * 100}%` : '100%', transition: `height 1000ms ${EASE}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/v4/bolig-hero.webp"
            alt=""
            className="w-full object-cover will-change-transform"
            style={{
              height: imgH === 1 ? sceneH : `calc(${sceneH} * ${imgH})`,
              objectPosition: smal ? '62% 50%' : '50% 50%',
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

        {/* ── Arket: [adresse over foto][eiendommens dag på canvas] — stiger ── */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col"
          style={{ height: `calc(${(1 - STRIPE) * 100}% + ${CAPTION}px)`, transform: stig ? 'translateY(0)' : `translateY(calc(100% - ${CAPTION}px))`, transition: `transform 1000ms ${EASE}` }}
        >
          {/* Adresse — stor og rendyrket i foto-tilstand, mindre som property header */}
          <div className="relative shrink-0 px-6 pb-5 text-white sm:px-7" style={{ height: CAPTION, background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.55) 100%)' }}>
            <div className="flex h-full flex-col justify-end">
              <div className="grid">
                <p className="col-start-1 row-start-1 self-end text-[38px] sm:text-[46px]" style={{ ...display, letterSpacing: '-0.03em', opacity: stig ? 0 : 1, transform: stig ? 'translateY(-6px)' : 'none', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>Nygårdsgaten 5</p>
                <p className="col-start-1 row-start-1 self-end text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.025em', opacity: stig ? 1 : 0, transition: `opacity 600ms ${EASE} 350ms` }}>Nygårdsgaten 5</p>
              </div>
              <p className="mt-1.5 text-[14px] text-white/80">Bergen · 8 leiligheter</p>
            </div>
          </div>

          {/* Eiendommens dag — rett på canvas. Typografisk ledger. Footer i bunn. */}
          <div className="flex flex-1 flex-col px-6 pb-5 pt-5 sm:px-7" style={{ background: T.canvas, opacity: stig ? 1 : 0, transition: `opacity 500ms ${EASE} 500ms` }} aria-hidden={!stig}>
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <p className="text-[#15130F]">I dag</p>
              <p className="flex items-center gap-2 text-[#15130F]/60">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: venter ? T.lilla : T.gronn, transition: 'background 400ms' }} />
                <span className="inline-grid">
                  <span className="col-start-1 row-start-1" style={{ opacity: venter ? 0 : 1, transition: `opacity 300ms ${EASE}` }}>Alt i orden</span>
                  <span className="col-start-1 row-start-1" style={{ opacity: venter ? 1 : 0, transition: `opacity 300ms ${EASE}` }}>Én ting venter på deg</span>
                </span>
              </p>
            </div>

            <ul className="mt-3 border-t border-[#15130F]/[0.08]">
              {RADER.map((r) => {
                const vis = er(r.fase);
                const aktiv = r.sak && er('godkjenn') && !godkjent;
                return (
                  <li
                    key={r.tid}
                    className={`relative border-b border-[#15130F]/[0.08] ${r.skjulMobil ? 'hidden sm:block' : ''}`}
                    style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(10px)', transition: `opacity 560ms ${EASE}, transform 560ms ${EASE}` }}
                  >
                    {/* Svak tone for den aktive saken — stikker 12 px utenfor hårlinjene */}
                    <span aria-hidden="true" className="absolute -inset-x-3 inset-y-1 rounded-[12px]" style={{ background: T.tint, opacity: aktiv ? 1 : 0, transition: `opacity 500ms ${EASE}` }} />
                    <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 sm:grid-cols-[52px_minmax(0,1fr)_auto]">
                      <span className="hidden text-[13px] tabular-nums text-[#15130F]/45 sm:block">{r.tid}</span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-[#15130F]">{r.t}</span>
                        <span className="inline-grid max-w-full">
                          <span className="col-start-1 row-start-1 block truncate text-[13.5px] text-[#15130F]/55" style={r.sak ? { opacity: godkjent ? 0 : 1, transition: `opacity 300ms ${EASE}` } : undefined}>{r.s}</span>
                          {r.sak && <span className="col-start-1 row-start-1 block truncate text-[13.5px] text-[#15130F]/55" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 200ms` }}>{r.s2}</span>}
                        </span>
                      </span>

                      {/* Høyre: et menneske der det er et menneske. Ellers bare den åpne saken. */}
                      {r.avatar && <Avatar src={r.avatar.src} alt={r.avatar.alt} size={28} />}
                      {r.sak && (
                        <span className="inline-grid justify-items-end">
                          <span className="col-start-1 row-start-1 text-[12.5px] text-[#15130F]/60" style={{ opacity: venter && !er('godkjenn') ? 1 : 0, transition: `opacity 250ms ${EASE}` }}>Venter på deg</span>
                          <span className="col-start-1 row-start-1 inline-flex h-9 items-center rounded-[8px] px-3.5 text-[13px] font-medium" style={{ background: T.lilla, color: T.ink, opacity: aktiv ? 1 : 0, transform: aktiv ? 'none' : 'translateY(4px)', transition: `opacity 350ms ${EASE}, transform 350ms ${EASE}` }} aria-hidden={!aktiv} data-testid="v4-godkjenn">Godkjenn<span className="hidden sm:inline"> {tall(3450)} kr</span></span>
                          <span className="col-start-1 row-start-1 inline-flex items-center gap-2 text-[12.5px] text-[#15130F]/60" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 150ms` }} data-testid="v4-godkjent">
                            <Avatar src="/v4/kari.webp" alt="Kari" size={22} />
                            <span>Godkjent<span className="hidden sm:inline"> · 08:02</span></span>
                          </span>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Footer i bunnen av arket — ingen løs bildetekst under scenen */}
            <div className="mt-auto flex items-center justify-between gap-4 pt-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
              <span data-testid="v4-scene-tekst">Én godkjenning fra Kari. Resten var gjort.</span>
              <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} data-testid="v4-replay">Spill igjen</button>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
