'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   OppgjorSeksjon — «Pengene går riktig vei.»

   Det som skiller forvaltning for andre fra forvaltning av eget: pengene er
   ikke deres. Husleien går inn på klientkonto, honoraret trekkes etter
   avtalen med hver eier, resten utbetales — og hver eier får sin
   oppgjørsrapport. Fire stasjoner i én flate, i rekkefølge, med tallene for
   en portefølje på 214 leieforhold. Honorar-beløp vises ikke (avtale per
   eier). Alt finnes: klientkonto/klientmiddelkonto med utbetaling via
   PowerOffice, motregning av honorar, oppgjørsrapport per bolig per måned
   (PDF), purreløp, eksport til regnskap.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* 86 eiere som 86 streker — høyden er «tilfeldig» (deterministisk), så det leser som en portefølje, ikke et diagram */
const EIERE = (() => { let seed = 5; const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }; return Array.from({ length: 86 }, () => 10 + Math.round(r() * 22)); })();

function Teller({ vis, til, suffix = '' }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!vis) { setV(0); return undefined; }
    let raf; const t0 = performance.now(); const dur = 1400;
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); setV(Math.round(til * e)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vis, til]);
  return <>{tall(v)}{suffix}</>;
}

const STASJONER = [
  { k: 'Husleie inn', v: `${tall(3142000)} kr`, tell: 3142000, suffix: ' kr', d: '214 leieforhold · KID · avstemt automatisk · 3 purringer sendt', dato: '1.–3. juni' },
  { k: 'Klientkonto', v: 'Adskilt', d: 'Eiernes penger holdes på klientmiddelkonto — aldri blandet med deres egne', dato: 'løpende' },
  { k: 'Honorar', v: 'Etter avtale', d: 'Trekkes per eier etter hver oppdragsavtale — fast eller prosent · bokført på dere', dato: '3. juni' },
  { k: 'Til eierne', v: '86 utbetalinger', d: 'Én utbetaling per eier · oppgjørsrapport per bolig (PDF) · årsoppgave i januar', dato: '3. juni' },
];

const PUNKTER = [
  ['Ett oppgjør per eier, per måned', 'Rapporten viser husleie inn, kostnader, honorar og utbetalt — per bolig. Korrigeringer havner i neste periode, sporbart.'],
  ['Regnskapet får det ferdig', 'Bilag og utbetalinger går til PowerOffice, Tripletex eller Fiken. Leverandørfakturaer bokføres på riktig eier.'],
  ['Purring uten å tenke på det', 'Påminnelse, purring og varsel om utkastelse etter husleieloven — automatisk, med stopp der dere vil.'],
];

export default function OppgjorSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 16) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  return (
    <section id="oppgjor" ref={ref} className="relative" style={{ background: T.flate, color: T.ink }} data-testid="v4m-oppgjor">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="max-w-[820px]">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Oppgjør</p>
          <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-oppgjor-tittel">
            Pengene går riktig vei<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[50ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
            Å forvalte for andre er å ha ansvar for andres penger. Husleien går inn på klientkonto, honoraret trekkes etter avtalen med hver eier, og resten utbetales — med en rapport eieren forstår.
          </p>
        </div>

        {/* Fire stasjoner */}
        <div className="mt-12 overflow-hidden rounded-[22px] lg:mt-16" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.35)', ...inn(3, 20) }} data-testid="v4m-oppgjor-flate">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-7" style={{ boxShadow: `inset 0 -1px 0 ${HAIR}` }}>
            <p className="text-[12.5px] font-medium" style={{ color: SVAK }}>Oppgjør · mai · Vest Utleie AS</p>
            <p className="inline-flex items-center gap-2 text-[12.5px] font-medium" style={{ color: '#166B3C' }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Utbetalt 3. juni</p>
          </div>
          <ol className="grid gap-px sm:grid-cols-2 lg:grid-cols-4" style={{ background: HAIR }}>
            {STASJONER.map((s, i) => (
              <li key={s.k} className="relative px-5 py-6 sm:px-7" style={{ background: PAPIR, ...inn(4 + i, 10) }} data-testid={`v4m-oppgjor-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-[12.5px] font-medium" style={{ color: SVAK }}><span style={{ color: T.lilla }}>0{i + 1}</span> · {s.k}</p>
                  <p className="text-[12px] tabular-nums" style={{ color: 'rgba(21,19,15,0.4)' }}>{s.dato}</p>
                </div>
                <p className="mt-4 text-[26px] tabular-nums sm:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{s.tell ? <Teller vis={synlig} til={s.tell} suffix={s.suffix} /> : s.v}</p>
                <p className="mt-3 max-w-[30ch] text-[13.5px] leading-[1.5]" style={{ color: DIM }}>{s.d}</p>
                {i < STASJONER.length - 1 && (
                  <span aria-hidden="true" className="absolute right-[-7px] top-1/2 hidden h-[13px] w-[13px] -translate-y-1/2 rotate-45 lg:block" style={{ background: PAPIR, boxShadow: `1px -1px 0 ${HAIR}` }} />
                )}
              </li>
            ))}
          </ol>
          {/* Pengene går fra venstre til høyre: én linje tegnes gjennom stasjonene når flaten er i bildet */}
          <div aria-hidden="true" className="relative mx-5 h-px sm:mx-7" style={{ background: HAIR }}>
            <span className="absolute inset-y-0 left-0 w-full" style={{ background: T.lilla, transformOrigin: '0 50%', transform: synlig ? 'scaleX(1)' : 'scaleX(0)', transition: `transform 2200ms cubic-bezier(0.22, 1, 0.36, 1) 600ms` }} />
          </div>
          {/* 86 eiere · én utbetaling hver — strekene lyser opp én og én, som utbetalingene går */}
          <div className="px-5 py-5 sm:px-7" data-testid="v4m-oppgjor-eiere">
            <div className="flex items-baseline justify-between gap-4 text-[12.5px]" style={{ color: SVAK }}>
              <p className="font-medium">86 eiere · én utbetaling hver</p>
              <p className="tabular-nums">3. juni · 06:00</p>
            </div>
            <div className="mt-3 flex h-8 items-end gap-[3px] sm:gap-1" aria-hidden="true">
              {EIERE.map((h, i) => (
                <span key={i} className="block w-full rounded-[1px]" style={{ height: h, background: T.lilla, opacity: synlig ? 0.9 : 0, transform: synlig ? 'scaleY(1)' : 'scaleY(0.2)', transformOrigin: '50% 100%', transition: `opacity 300ms ${EASE} ${900 + i * 18}ms, transform 500ms cubic-bezier(0.22, 1, 0.36, 1) ${900 + i * 18}ms` }} />
              ))}
            </div>
          </div>
        </div>

        <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-3 lg:mt-14">
          {PUNKTER.map(([t, d], i) => (
            <li key={t} className="border-t pt-5" style={{ borderColor: HAIR, ...inn(8 + i, 12) }}>
              <p className="text-[16.5px] font-medium" style={{ color: T.ink }}>{t}</p>
              <p className="mt-2 max-w-[38ch] text-[14.5px] leading-[1.5]" style={{ color: DIM }}>{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
