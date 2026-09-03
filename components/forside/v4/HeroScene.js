'use client';

import React, { useRef } from 'react';
import { EASE, T, heading, displayFor, tall, useSekvens, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   HeroScene — «DigiHome i arbeid». Frameless.

   Fotoet er objektet og står stille. Et «ark» stiger over nedre del av bildet:
   [adresse over foto] + [dagens arbeid på canvas]. Ingen container, ingen
   skygge, ingen ikoner — tid, hendelse, detalj. Én åpen sak får ett aksentord
   og én liten knapp i raden. Etter trykk: ren tekst.

   Faser (spilles én gang når i view, hviler i sluttbildet):
     foto → stig → rad1–4 → godkjenn → godkjent → ferdig

   Alt i strømmen er live funksjonalitet i appen.
--------------------------------------------------------------------------- */

const FASER = [
  { navn: 'foto', ms: 2000 },
  { navn: 'stig', ms: 1000 },
  { navn: 'rad1', ms: 560 },
  { navn: 'rad2', ms: 560 },
  { navn: 'rad3', ms: 560 },
  { navn: 'rad4', ms: 1300 },
  { navn: 'godkjenn', ms: 1700 },
  { navn: 'godkjent', ms: 1100 },
  { navn: 'ferdig', ms: 0 },
];

const RADER = [
  { fase: 'rad1', tid: '08:14', t: 'Husleie registrert', s: `${tall(64500)} kr fra 8 leietakere · KID` },
  { fase: 'rad2', tid: '10:32', t: 'Leiekontrakt signert', s: 'Emma Sørensen · 2-roms · BankID via Posten', skjulMobil: true },
  { fase: 'rad3', tid: '17:46', t: '«Kan jeg ha katt?»', s: 'Jonas spurte · svart fra leiekontrakten', heng: true, skjulMobil: true },
  { fase: 'rad4', tid: '22:41', t: 'Varmtvannet er borte', s: `Sak opprettet · Rørlegger AS foreslått · ${tall(3450)} kr`, s2: 'Rørlegger kommer torsdag kl. 09:00 · Jonas er varslet', sak: true },
];

const CAPTION = 132;          // px — adressefeltet som ligger over fotoet
const SCENE_H = 'clamp(620px, 76vh, 760px)';
const STRIPE = '36.5%';       // synlig foto etter morph
const FOKUS_Y = 0.68;         // fokuspunkt i bildet (fasade/balkong), andel av høyden
/* Flytt bildet slik at fokuspunktet lander midt i stripen: stripe/2 − fokus. */
const FOKUS_TRANSLATE = `${((0.365 / 2) - FOKUS_Y) * 100}%`;

export default function HeroScene({ font = 'serif' }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.35);
  const { er, ferdig, replay, kjorer } = useSekvens(FASER, synlig);
  const stig = er('stig');
  const venter = er('rad4') && !er('godkjent');
  const godkjent = er('godkjent');
  const display = displayFor(font);

  return (
    <figure className="relative m-0" data-testid="v4-scene-wrap">
      <div
        ref={ref}
        className="relative overflow-hidden rounded-[20px]"
        style={{ height: SCENE_H }}
        role="img"
        aria-label="Animert eksempel: en dag med DigiHome — husleie registrert, kontrakt signert, leietaker får svar fra kontrakten, og en varmtvannssak løses med ett trykk fra eier."
        data-testid="v4-scene"
      >
        {/* ── Foto. Tre tilstander, én kontinuerlig bevegelse (kun transform):
              hvile  → scale(1)
              foto   → sakte innpust til scale(1.045) mens vi ser boligen
              stig   → glir opp til fokuspunktet (fasaden) og legger seg i stripen
            Wrapperen krymper i høyde i takt med arket, så ingenting ligger under
            arkets hjørner. Bildet selv beholder scenens høyde og flyttes med transform. ── */}
        <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: stig ? STRIPE : '100%', transition: `height 1000ms ${EASE}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/v4/bolig-hero.webp"
            alt=""
            className="w-full object-cover will-change-transform"
            style={{
              height: SCENE_H,
              objectPosition: '50% 50%',
              transformOrigin: `50% ${FOKUS_Y * 100}%`,
              transform: stig
                ? `translateY(${FOKUS_TRANSLATE}) scale(1.06)`
                : kjorer || ferdig ? 'scale(1.045)' : 'scale(1)',
              transition: stig
                ? `transform 1000ms ${EASE}`
                : 'transform 2200ms cubic-bezier(0.25, 0.1, 0.25, 1)',
            }}
          />
          {/* Varm gradering mot canvasen — kun på fotoet */}
          <div aria-hidden="true" className="absolute inset-0" style={{ background: 'rgba(214,190,150,0.10)', mixBlendMode: 'multiply' }} />
        </div>

        {/* ── Arket: [adresse over foto][dagens arbeid på canvas] — stiger ── */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col"
          style={{ height: `calc(64% + ${CAPTION}px)`, transform: stig ? 'translateY(0)' : `translateY(calc(100% - ${CAPTION}px))`, transition: `transform 1000ms ${EASE}` }}
        >
          {/* Adresse — stor i foto-tilstand, mindre når arket har steget */}
          <div className="relative shrink-0 px-6 pb-5 text-white sm:px-7" style={{ height: CAPTION, background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.5) 100%)' }}>
            <div className="flex h-full flex-col justify-end">
              <div className="grid">
                <p className="col-start-1 row-start-1 self-end text-[40px] sm:text-[48px]" style={{ ...display, opacity: stig ? 0 : 1, transform: stig ? 'translateY(-6px)' : 'none', transition: `opacity 400ms ${EASE}, transform 400ms ${EASE}` }}>Nygårdsgaten 5</p>
                <p className="col-start-1 row-start-1 self-end text-[28px] sm:text-[32px]" style={{ ...display, opacity: stig ? 1 : 0, transition: `opacity 600ms ${EASE} 350ms` }}>Nygårdsgaten 5</p>
              </div>
              <p className="mt-1.5 text-[14px] text-white/80">Bergen · 8 leiligheter · Utleid</p>
            </div>
          </div>

          {/* Dagens arbeid — rett på canvas. Typografisk ledger. */}
          <div className="flex-1 px-6 pb-6 pt-5 sm:px-7" style={{ background: T.canvas, opacity: stig ? 1 : 0, transition: `opacity 500ms ${EASE} 500ms` }} aria-hidden={!stig}>
            <div className="flex items-center justify-between gap-4 text-[14px]">
              <p className="text-[#15130F]">I dag</p>
              <p className="flex items-center gap-2 text-[#15130F]/60">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: venter ? T.amber : T.gronn, transition: 'background 400ms' }} />
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
                    <div className="relative grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-3">
                      <span className="text-[13px] tabular-nums text-[#15130F]/45">{r.tid}</span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-[#15130F]" style={r.heng ? { textIndent: '-0.42em' } : undefined}>{r.t}</span>
                        <span className="inline-grid max-w-full">
                          <span className="col-start-1 row-start-1 block truncate text-[13.5px] text-[#15130F]/55" style={r.sak ? { opacity: godkjent ? 0 : 1, transition: `opacity 300ms ${EASE}` } : undefined}>{r.s}</span>
                          {r.sak && <span className="col-start-1 row-start-1 block truncate text-[13.5px] text-[#15130F]/55" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 200ms` }}>{r.s2}</span>}
                        </span>
                      </span>
                      {/* Høyre: ingen ikoner. Bare den åpne saken sier noe. */}
                      {r.sak && (
                        <span className="inline-grid justify-items-end">
                          <span className="col-start-1 row-start-1 text-[12.5px]" style={{ color: T.amber, opacity: venter && !er('godkjenn') ? 1 : 0, transition: `opacity 250ms ${EASE}` }}>Venter på deg</span>
                          <span className="col-start-1 row-start-1 inline-flex h-9 items-center rounded-[8px] bg-[#15130F] px-3.5 text-[13px] font-medium text-white" style={{ opacity: aktiv ? 1 : 0, transform: aktiv ? 'none' : 'translateY(4px)', transition: `opacity 350ms ${EASE}, transform 350ms ${EASE}` }} aria-hidden={!aktiv}>Godkjenn {tall(3450)} kr</span>
                          <span className="col-start-1 row-start-1 text-[12.5px] text-[#15130F]/55" style={{ opacity: godkjent ? 1 : 0, transition: `opacity 400ms ${EASE} 150ms` }}>Godkjent · 08:02</span>
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Bildetekst + spill igjen — utenfor bildet, som tekst */}
      <figcaption className="mt-4 flex items-center justify-between gap-4 text-[13.5px] text-[#15130F]/50" style={{ opacity: ferdig ? 1 : 0, transition: `opacity 600ms ${EASE}` }} aria-hidden={!ferdig}>
        <span data-testid="v4-scene-tekst">DigiHome gjorde resten. Kari godkjente bare kostnaden.</span>
        <button type="button" onClick={replay} className="shrink-0 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" style={{ pointerEvents: ferdig ? 'auto' : 'none' }} data-testid="v4-replay">Spill igjen</button>
      </figcaption>
    </figure>
  );
}
