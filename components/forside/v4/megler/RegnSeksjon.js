'use client';

import React, { useMemo, useRef, useState } from 'react';
import { EASE, T, display, tall, useSynlig, Knapp } from '../motion';

/* ---------------------------------------------------------------------------
   RegnSeksjon — «Hva koster rutinen dere i dag?»

   En ROI-kalkulator som IKKE lover noe: den regner på meglerens egne anslag
   (leieforhold, minutter per leieforhold, andel rutine, timekost). Vi
   publiserer ikke enhetspris — /priser sier bevisst «tilpasset · demo
   først». Kalkulatoren sender i stedet antall leieforhold rett inn i
   demo-skjemaet (#demo) via sendTilDemo, så prisforslaget blir konkret.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* Deles med PartnerSeksjon og DemoSkjema: tall/valg → skjemaet. Event når siden er åpen,
   sessionStorage om skjemaet monteres etterpå. */
export function sendTilDemo(detail = {}) {
  try {
    if (detail.leieforhold) window.sessionStorage.setItem('dh_megler_leieforhold', String(detail.leieforhold));
    if (detail.partner) window.sessionStorage.setItem('dh_megler_partner', '1');
    window.dispatchEvent(new CustomEvent('dh-megler-demo', { detail }));
  } catch (e) { /* stille */ }
}

/* Én glider på en hårlinje — samme språk som «Maks leie» på boligsiden */
function Glider({ label, verdi, vis, min, max, step, onChange, hjelp, testid }) {
  const p = ((verdi - min) / (max - min)) * 100;
  return (
    <div data-testid={testid}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-[14px] font-medium" style={{ color: T.ink }}>{label}</p>
        <p className="shrink-0 text-[17px] tabular-nums" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1, color: T.ink }} data-testid={testid ? `${testid}-vis` : undefined}>{vis}</p>
      </div>
      <div className="relative mt-3 h-8">
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgba(21,19,15,0.16)' }} />
        <div className="absolute left-0 top-1/2 h-px -translate-y-1/2" style={{ width: `${p}%`, background: T.ink }} />
        <input type="range" min={min} max={max} step={step} value={verdi} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="v4-glider absolute inset-0 h-8 w-full cursor-pointer appearance-none bg-transparent" />
      </div>
      {hjelp ? <p className="mt-1 text-[12.5px] leading-[1.45]" style={{ color: SVAK }}>{hjelp}</p> : null}
    </div>
  );
}

export default function RegnSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.15);
  const [n, setN] = useState(120);
  const [min, setMin] = useState(45);
  const [andel, setAndel] = useState(70);
  const [time, setTime] = useState(650);
  const r = useMemo(() => {
    const timer = (n * min) / 60;
    const auto = timer * (andel / 100);
    return { timer, kr: timer * time, auto, dager: auto / 7.5, aar: auto * time * 12, arsverk: (auto * 12) / 1695 };
  }, [n, min, andel, time]);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });
  const en = (x, d = 0) => tall(Number(x.toFixed(d))).replace('.', ',');
  const MORK = 'rgba(244,241,234,0.6)';
  return (
    <section id="regn" ref={ref} className="relative scroll-mt-[72px] lg:scroll-mt-[64px]" style={{ background: T.canvas, color: T.ink }} data-testid="v4m-regn">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <div className="max-w-[820px]">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Regn på det</p>
          <h2 className="mt-4 text-[clamp(38px,4vw,64px)]" style={{ ...display, color: T.ink, ...inn(1) }} data-testid="v4m-regn-tittel">
            Hva koster rutinen dere i dag<span style={{ color: T.lilla, marginLeft: '0.04em' }}>?</span>
          </h2>
          <p className="mt-6 max-w-[52ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(2) }}>
            Sett inn deres egne tall. Kalkulatoren lover ingenting — den regner bare på det dere selv anslår at innkreving, purring, avstemming, eierrapporter og bilag koster i dag.
          </p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[22px] lg:mt-16 lg:grid-cols-12" style={{ background: HAIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.35)', ...inn(3, 20) }} data-testid="v4m-regn-flate">
          <div className="grid gap-8 px-6 py-7 sm:px-8 sm:py-9 lg:col-span-6" style={{ background: PAPIR }}>
            <Glider label="Leieforhold under forvaltning" verdi={n} vis={tall(n)} min={10} max={1000} step={10} onChange={setN} testid="v4m-regn-n" />
            <Glider label="Minutter admin per leieforhold, per måned" verdi={min} vis={`${min} min`} min={10} max={120} step={5} onChange={setMin} hjelp="Innkreving, purring, avstemming, eierrapport, bilag, spørsmål fra eier" testid="v4m-regn-min" />
            <Glider label="Andel av dette som er rutine" verdi={andel} vis={`${andel} %`} min={30} max={90} step={5} onChange={setAndel} hjelp="Det som kan gå automatisk — ikke valgene som trenger et menneske" testid="v4m-regn-andel" />
            <Glider label="Kostnad per time" verdi={time} vis={`${tall(time)} kr`} min={400} max={1200} step={50} onChange={setTime} hjelp="Lønn, arbeidsgiveravgift og kontor — det en time faktisk koster dere" testid="v4m-regn-time" />
          </div>
          <div className="flex flex-col justify-between px-6 py-7 sm:px-8 sm:py-9 lg:col-span-6" style={{ background: T.charcoal, color: T.offwhite }} data-testid="v4m-regn-resultat">
            <div>
              <p className="text-[12.5px] font-medium" style={{ color: MORK }}>Rutinen i dag</p>
              <p className="mt-2 text-[clamp(34px,3.4vw,52px)] tabular-nums" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.offwhite }} data-testid="v4m-regn-timer">
                {en(r.timer)} t<span className="text-[0.5em]" style={{ color: 'rgba(244,241,234,0.55)' }}> / mnd</span>
              </p>
              <p className="mt-2 text-[14px] tabular-nums" style={{ color: MORK }}>≈ {en(r.kr)} kr i måneden</p>
              <div className="mt-8 border-t pt-6" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
                <p className="text-[12.5px] font-medium" style={{ color: MORK }}>Kan gå automatisk — etter deres anslag</p>
                <p className="mt-2 text-[clamp(40px,4.2vw,64px)] tabular-nums" style={{ ...display, letterSpacing: '-0.035em', lineHeight: 1, color: T.lilla }} data-testid="v4m-regn-auto">
                  {en(r.auto)} t<span className="text-[0.5em]" style={{ color: 'rgba(244,241,234,0.55)' }}> / mnd</span>
                </p>
                <dl className="mt-5 grid grid-cols-3 gap-4">
                  {[['Arbeidsdager', `${en(r.dager, 1)} / mnd`], ['Verdi per år', `${en(r.aar)} kr`], ['Årsverk', en(r.arsverk, 1)]].map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-[12px]" style={{ color: 'rgba(244,241,234,0.55)' }}>{k}</dt>
                      <dd className="mt-1 text-[16px] tabular-nums sm:text-[17px]" style={{ ...display, letterSpacing: '-0.02em', lineHeight: 1.1, color: T.offwhite }}>{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
            <div className="mt-8 border-t pt-6" style={{ borderColor: 'rgba(244,241,234,0.12)' }}>
              <p className="max-w-[40ch] text-[14px] leading-[1.5]" style={{ color: 'rgba(244,241,234,0.7)' }}>
                DigiHome prises per leieforhold under forvaltning. Med {tall(n)} leieforhold får dere et konkret forslag samme uke — med deres portefølje som eksempel.
              </p>
              <div className="mt-5"><Knapp href="#demo" onClick={() => sendTilDemo({ leieforhold: n })} data-testid="v4m-regn-cta">Få pris for {tall(n)} leieforhold</Knapp></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
