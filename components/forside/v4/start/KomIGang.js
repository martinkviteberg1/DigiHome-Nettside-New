'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { site } from '@/lib/site';
import { EASE, T, display } from '../motion';
import { VALG, Dor, DIM, SVAK, HAIR } from './velg';

/* ---------------------------------------------------------------------------
   KomIGang — /kom-i-gang. Veiskillet før onboardingen.

   Én beslutning, to dører: Huseier eller Eiendomsselskap. Teksten er valget
   (store typografiske rader — ikke kort), bildet til høyre svarer på hva du
   peker på. Klikk sender deg rett inn i riktig start:
     · Huseier         → /bli-utleier/start
     · Eiendomsselskap → /bli-utleier/start?kind=business

   Samme canvas, typografi og topplinje som /bli-utleier/start — siden føles
   som første steg i flyten, ikke som en ny nettside. Kun opacity/transform.

   Nav-knappen «Kom i gang» åpner det samme valget som overlay
   (KomIGangVelger); denne siden er lenkbar fallback (annonser, e-post,
   cmd-klikk, uten JS). Data og rader deles via ./velg.
--------------------------------------------------------------------------- */

/* ── Topplinje: wordmark · telefon · logg inn · lukk (samme som /bli-utleier/start) ── */
function Topplinje() {
  return (
    <header className="sticky top-0 z-40" style={{ background: 'rgba(243,241,236,0.92)', backdropFilter: 'saturate(1.2) blur(8px)' }} data-testid="kig-topp">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0">
        <Link href="/" aria-label="DigiHome — til forsiden" className="inline-flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" data-testid="kig-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[18px] w-auto" />
        </Link>
        <div className="flex items-center gap-5 text-[13.5px]">
          <a href={`tel:${site.phoneHref}`} className="hidden text-[#15130F]/60 transition-colors hover:text-[#15130F] lg:inline">{site.phone}</a>
          <a href={site.loginUrl} className="hidden text-[#15130F]/70 transition-colors hover:text-[#15130F] sm:inline" data-testid="kig-logginn">Logg inn</a>
          <Link href="/" className="text-[#15130F]/70 transition-colors hover:text-[#15130F]" data-testid="kig-lukk">Lukk</Link>
        </div>
      </div>
      <div className="h-px" style={{ background: HAIR }} aria-hidden="true" />
    </header>
  );
}

export default function KomIGang() {
  const [aktiv, setAktiv] = useState(VALG[0].id);

  return (
    <div className="min-h-screen overflow-x-clip antialiased" style={{ background: T.canvas, color: T.ink }} data-testid="kom-i-gang">
      <Topplinje />
      <main>
        <section className="mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:grid lg:min-h-[calc(100svh-65px)] lg:w-[calc(100%-64px)] lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)] lg:gap-14 lg:px-0 xl:gap-20" aria-labelledby="kig-h1">
          {/* Venstre: valget som tekst */}
          <div className="flex flex-col justify-center pb-16 pt-12 sm:pt-16 lg:py-16">
            <p className="dh-cover-inn text-[14px] font-medium" style={{ color: SVAK }} data-testid="kig-label">Kom i gang</p>
            <h1 id="kig-h1" className="dh-cover-inn mt-3 text-[46px] sm:text-[64px] lg:text-[clamp(56px,5.2vw,92px)]" style={{ ...display, color: T.ink, animationDelay: '.04s' }} data-testid="kig-h1">
              Hvem leier ut<span style={{ color: T.lilla, marginLeft: '0.03em' }}>?</span>
            </h1>
            <p className="dh-cover-inn mt-5 max-w-[44ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, animationDelay: '.08s' }} data-testid="kig-ingress">
              Velg det som passer, så tar vi deg rett til riktig start. Det tar et par minutter — og du binder deg ikke til noe.
            </p>

            <ol className="mt-10 flex flex-col gap-1 sm:mt-12" data-testid="kig-valg">
              {VALG.map((v, i) => (
                <Dor key={v.id} v={v} aktiv={aktiv === v.id} onAktiv={() => setAktiv(v.id)} delay={0.12 + i * 0.07} />
              ))}
            </ol>

            <p className="dh-cover-inn mt-10 text-[14px] leading-[1.6]" style={{ color: SVAK, animationDelay: '.3s' }} data-testid="kig-fot">
              Usikker på hva som passer?{' '}
              <Link href="/book-mote" className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] hover:decoration-[#15130F]" style={{ color: T.ink }} data-testid="kig-samtale">Book en samtale</Link>
              <span className="mx-2" aria-hidden="true">·</span>
              Allerede kunde?{' '}
              <a href={site.loginUrl} className="underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] hover:decoration-[#15130F]" style={{ color: T.ink }}>Logg inn</a>
            </p>
          </div>

          {/* Høyre: bildet svarer på valget (kun desktop) */}
          <div className="dh-cover-inn relative hidden lg:block lg:py-6" style={{ animationDelay: '.14s' }} aria-hidden="true">
            <div className="relative h-full min-h-[560px] overflow-hidden rounded-[24px]" style={{ background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }} data-testid="kig-scene">
              {VALG.map((v) => {
                const er = aktiv === v.id;
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={v.id}
                    src={v.bilde.src}
                    srcSet={v.bilde.srcSet}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    alt=""
                    className="absolute inset-0 h-full w-full select-none object-cover"
                    style={{ objectPosition: v.bilde.pos, opacity: er ? 1 : 0, transform: er ? 'scale(1)' : 'scale(1.05)', transition: `opacity 700ms ${EASE}, transform 1500ms ${EASE}`, willChange: 'opacity, transform' }}
                    draggable={false}
                    data-testid={`kig-bilde-${v.id}`}
                    data-aktiv={er ? 'true' : 'false'}
                  />
                );
              })}
              {/* Skygge nederst så teksten ligger rolig på bildet */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%]" style={{ background: 'linear-gradient(180deg, rgba(21,18,15,0) 0%, rgba(21,18,15,0.58) 100%)' }} />
              <div className="absolute inset-x-0 bottom-0 grid p-8">
                {VALG.map((v) => {
                  const er = aktiv === v.id;
                  return (
                    <div key={v.id} style={{ gridArea: '1 / 1', opacity: er ? 1 : 0, transform: er ? 'none' : 'translateY(10px)', transition: `opacity 600ms ${EASE} ${er ? 120 : 0}ms, transform 800ms ${EASE} ${er ? 120 : 0}ms` }}>
                      <p className="text-[13px] font-medium" style={{ color: 'rgba(244,241,234,0.62)' }}>{v.tittel}</p>
                      <p className="mt-1.5 text-[15.5px] leading-[1.45]" style={{ color: T.offwhite }}>
                        {v.stikkord.map((s, i) => (
                          <React.Fragment key={s}>
                            {i > 0 ? <span className="mx-2" style={{ color: 'rgba(244,241,234,0.4)' }} aria-hidden="true">·</span> : null}
                            {s}
                          </React.Fragment>
                        ))}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
