'use client';

import React from 'react';
import NavV4 from '../NavV4';
import FooterV4 from '../FooterV4';
import TillitStripe from '../TillitStripe';
import AvslutningSeksjon from '../AvslutningSeksjon';
import { T, display } from '../motion';
import { Avsloring, DIM, HAIR, Innledning, Punkt, SVAK } from './deler';
import { SARAH } from '../forvaltning/ForvaltningDeler';

/* ---------------------------------------------------------------------------
   OmOssV4 — /om-oss. Historien, tallene, verdiene og menneskene — i V4-stemmen.
   Ingen gamle løfter (10+2, «30 % høyere inntekt»). Sarah som daglig leder og
   én av forvalterne — ikke «den eneste».
--------------------------------------------------------------------------- */

const HISTORIE = [
  'Det begynte med en enkel observasjon: utleie i Bergen var unødvendig komplisert. Annonse, visning, kontrakt, husleie, renhold, vedlikehold — alt lå spredt, og ingen hadde tid til å gjøre det ordentlig.',
  'Så vi bygde ett system som tar rutinen: annonsen skrives, kontrakten signeres med BankID, husleien følges opp, og sakene lander hos riktig person. Boligeiere kan bruke det selv — eller la forvalterne våre ta jobben, med samme system i ryggen.',
  'I dag bruker både private boligeiere og eiendomsselskaper DigiHome, og i Bergen og omegn tilbyr vi full forvaltning med én fast forvalter. Målet er det samme som dag én: utleie skal være sorgløst — og gjort riktig.',
];

const TALL = [
  ['150+', 'boliger håndtert'],
  ['24 t', 'svartid på henvendelser'],
  ['2023', 'grunnlagt i Bergen'],
];

const VERDIER = [
  ['01', 'Menneskelig', 'Ett navn og ett nummer. Du snakker med en forvalter som kjenner boligen din — ikke et kundesenter.'],
  ['02', 'Åpent', 'Du ser det samme som vi ser: kontrakt, husleie, saker og rapport, når du vil. Ingen overraskelser.'],
  ['03', 'Lokalt', 'Vi kjenner Bergen — bydelene, leiemarkedet og håndverkerne. Og vi kommer når det trengs.'],
];

export default function OmOssV4() {
  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="om-oss-v4">
      <NavV4 />
      <main>
        {/* Innledning + bilde */}
        <section className="relative" data-testid="v4o-hero">
          <div className="mx-auto w-full max-w-[1360px] px-5 pt-12 sm:px-8 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pt-20">
            <Innledning label="Om DigiHome" tittel={<>Utleie, slik det burde være<Punkt /></>} ingress="DigiHome ble startet i Bergen for å fjerne styret med utleie — for boligeiere som vil gjøre det riktig, og for leietakere som vil bo trygt." maks="13ch" testid="v4o" />
            <figure className="dh-cover-inn mt-12 lg:mt-16" style={{ animationDelay: '.14s' }}>
              <div className="relative aspect-[16/10] overflow-hidden rounded-[20px] sm:aspect-[16/7] lg:aspect-[21/8]" style={{ background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/v4/annonse/fasade-kveld-1920.webp" srcSet="/v4/annonse/fasade-kveld-1200.webp 1200w, /v4/annonse/fasade-kveld-1920.webp 1920w, /v4/annonse/fasade-kveld-3840.webp 3840w" sizes="(min-width: 1024px) 1360px, 100vw" alt="Bygård i Bergen om kvelden med lys i vinduene" className="absolute inset-0 h-full w-full select-none object-cover" style={{ objectPosition: '50% 45%' }} draggable={false} />
              </div>
              <figcaption className="mt-3 text-[12.5px]" style={{ color: SVAK }}>Bergen · siden 2023</figcaption>
            </figure>
          </div>
        </section>

        {/* Historien + tallene */}
        <Avsloring testid="v4o-historie">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-4">
                  <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Historien</p>
                  <h2 className="mt-4 text-[clamp(36px,3.6vw,60px)]" style={{ ...display, color: T.ink, ...inn(1) }}>Fra frustrasjon til ett system<Punkt /></h2>
                  <dl className="mt-10 grid grid-cols-3 gap-6 border-t pt-6 lg:mt-14" style={{ borderColor: HAIR, ...inn(3) }} data-testid="v4o-tall">
                    {TALL.map(([v, l]) => (
                      <div key={l}>
                        <dt className="text-[30px] tabular-nums sm:text-[36px]" style={{ ...display, letterSpacing: '-0.03em', color: T.ink }}>{v}</dt>
                        <dd className="mt-1 text-[13px] leading-[1.4]" style={{ color: SVAK }}>{l}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="space-y-6 text-[18px] leading-[1.55] sm:text-[20px] lg:col-span-7 lg:col-start-6" style={{ color: 'rgba(21,19,15,0.8)' }}>
                  {HISTORIE.map((p, i) => <p key={i} style={inn(2 + i)}>{p}</p>)}
                </div>
              </div>
            </div>
          )}
        </Avsloring>

        {/* Verdiene */}
        <Avsloring style={{ background: T.flate }} testid="v4o-verdier">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Slik jobber vi</p>
              <h2 className="mt-4 max-w-[16ch] text-[clamp(38px,4vw,68px)]" style={{ ...display, color: T.ink, ...inn(1) }}>Vi behandler hver bolig som om den var vår egen<Punkt /></h2>
              <ol className="mt-14 grid gap-10 border-t pt-10 md:grid-cols-3 md:gap-8" style={{ borderColor: HAIR }}>
                {VERDIER.map(([nr, t, d], i) => (
                  <li key={nr} style={inn(2 + i, 16)}>
                    <span className="text-[13px] tabular-nums" style={{ color: i === 0 ? T.lilla : SVAK }}>{nr}</span>
                    <p className="mt-3 text-[26px] sm:text-[30px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>{t}</p>
                    <p className="mt-3 max-w-[36ch] text-[15.5px] leading-[1.55]" style={{ color: DIM }}>{d}</p>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Avsloring>

        {/* Menneskene */}
        <Avsloring testid="v4o-mennesker">
          {(inn) => (
            <div className="mx-auto w-full max-w-[1360px] px-5 py-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:py-28">
              <div className="grid gap-12 lg:grid-cols-12 lg:gap-12">
                <figure className="lg:col-span-4" style={inn(0, 24)}>
                  <div className="overflow-hidden rounded-[20px]" style={{ aspectRatio: '4 / 5', maxWidth: 420, background: '#8B7460', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={SARAH.bilde.src} srcSet={SARAH.bilde.srcSet} sizes="(min-width: 1024px) 30vw, 100vw" alt={SARAH.navn} className="h-full w-full select-none object-cover" style={{ objectPosition: '50% 20%', transform: 'scale(1.2)', transformOrigin: '52% 26%' }} draggable={false} loading="lazy" />
                  </div>
                  <figcaption className="mt-3 text-[11.5px]" style={{ color: 'rgba(21,19,15,0.38)' }}>{SARAH.foto}</figcaption>
                </figure>
                <div className="lg:col-span-7 lg:col-start-6">
                  <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(1) }}>Menneskene</p>
                  <h2 className="mt-4 text-[clamp(36px,3.6vw,60px)]" style={{ ...display, color: T.ink, ...inn(2) }}>Et lite team i Bergen — med systemet i ryggen<Punkt /></h2>
                  <div className="mt-8 max-w-[56ch] space-y-5 text-[18px] leading-[1.55] sm:text-[20px]" style={{ color: 'rgba(21,19,15,0.8)' }}>
                    <p style={inn(3)}>Forvaltning er mennesker: forvaltere som holder visning og kjenner leietakerne, vaktmester og renhold som er i boligen, og faste håndverkere som kommer når det trengs. Systemet tar rutinen — så menneskene kan bruke tiden på det som krever skjønn.</p>
                    <p style={inn(4)}>«Vi bygger DigiHome slik vi selv ville hatt det som boligeiere: én å ringe, full oversikt, og aldri en overraskelse.»</p>
                  </div>
                  <div className="mt-8 border-t pt-6" style={{ borderColor: HAIR, ...inn(5) }}>
                    <p className="text-[22px]" style={{ ...display, letterSpacing: '-0.03em', color: T.ink }}>{SARAH.navn}</p>
                    <p className="mt-1 text-[14.5px]" style={{ color: DIM }}>Daglig leder — og en av forvalterne · Bergen</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Avsloring>

        <TillitStripe />
        <AvslutningSeksjon
          tittel="Vil du bli en del av reisen"
          under="Én bolig eller mange — vi vil gjerne høre fra deg."
          handling={{ knapp: { href: '/kom-i-gang', tekst: 'Kom i gang' }, lenke: { href: '/kontakt', tekst: 'Kontakt oss' } }}
        />
      </main>
      <FooterV4 />
    </div>
  );
}
