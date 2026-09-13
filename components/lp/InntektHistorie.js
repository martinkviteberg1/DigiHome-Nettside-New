'use client';

/* ---------------------------------------------------------------------------
   InntektHistorie — inntekt-spesifikk «proof»-seksjon for /lp/inntekt.

   Gjør løftet «opptil 30 % høyere leieinntekt» konkret og troverdig gjennom
   tre lag som bygger på hverandre:

     1) Inntektstrappen  — hvordan inntekten bygges opp lag på lag
                           (vanlig → dynamisk prising → hybrid 10+2).
     2) Årsgraf          — hvordan et helt år ser ut (10 mnd langtid + 2 mnd
                           korttid i høysesong), med snittlinje.
     3) Regnestykke      — ett ekte eksempel i kroner, per måned og per år.

   Rendres KUN når cfg.inntektModell finnes (styres fra lib/landing.js), så de
   øvrige kampanjesidene er uberørt. V4-drakt: hårlinjer, redaksjonell
   typografi, kun opacity/transform-bevegelse, avsløres når den kommer i syne.
--------------------------------------------------------------------------- */

import React, { useRef } from 'react';
import { ArrowRight, TrendingUp, CalendarRange, Sparkles } from 'lucide-react';
import { T, display, EASE, useSynlig } from '@/components/forside/v4/motion';
import { DIM, SVAK, HAIR, Punkt, innFor } from '@/components/forside/v4/sider/deler';

const nok = (n) => Math.round(n).toLocaleString('nb-NO').replace(/\u00a0/g, ' ');
const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

/* ── 1) Inntektstrappen — stigende hårlinje-søyler ── */
function Trappen({ modell, synlig }) {
  const rows = [modell.base, ...modell.trinn];
  const maxVal = modell.trinn[modell.trinn.length - 1].verdi;
  return (
    <div className="space-y-5 sm:space-y-6" data-testid="lp-inntektstrapp">
      {rows.map((r, i) => {
        const pct = Math.max(8, (r.verdi / maxVal) * 100);
        const sist = i === rows.length - 1;
        return (
          <div key={r.navn}>
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <span className="text-[14.5px] font-medium sm:text-[15.5px]" style={{ color: sist ? T.ink : 'rgba(21,19,15,0.78)' }}>{r.navn}</span>
              <span className="flex items-baseline gap-2.5">
                {r.delta ? (
                  <span className="rounded-full px-2 py-0.5 text-[11.5px] font-medium tabular-nums" style={{ background: 'rgba(31,157,85,0.12)', color: '#1B7A45' }}>+{nok(r.delta)}</span>
                ) : null}
                <span className="tabular-nums text-[16px] sm:text-[18px]" style={{ ...display, letterSpacing: '-0.02em', color: T.ink }}>
                  {nok(r.verdi)}<span className="ml-1 text-[12.5px]" style={{ color: SVAK, letterSpacing: 0 }}>kr</span>
                </span>
              </span>
            </div>
            <div className="h-3.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(21,19,15,0.06)' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  borderRadius: 9999,
                  transformOrigin: 'left',
                  transform: synlig ? 'scaleX(1)' : 'scaleX(0)',
                  transition: `transform 900ms ${EASE} ${i * 160}ms`,
                  background: sist ? `linear-gradient(90deg, ${T.ink} 0%, ${T.lilla} 145%)` : `rgba(21,19,15,${0.22 + i * 0.2})`,
                }}
              />
            </div>
            {r.note ? <p className="mt-2 text-[12.5px] leading-[1.4]" style={{ color: SVAK }}>{r.note}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

/* ── 2) Årsgraf — 12 måneder, langtid + korttid høysesong ── */
function AarsGraf({ modell, synlig }) {
  const { langtid, korttid, hoysesong, snittMnd, snittAar } = modell.aar;
  const maxVal = korttid;
  const data = MND.map((m, i) => ({ m, v: hoysesong.includes(i) ? korttid : langtid, hoy: hoysesong.includes(i) }));
  const snittPct = (snittMnd / maxVal) * 100;
  return (
    <div>
      <p className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: SVAK }}>
        <CalendarRange className="h-4 w-4" strokeWidth={1.8} /> Inntekten gjennom året
      </p>
      <p className="mt-2 max-w-[40ch] text-[14.5px] leading-[1.45]" style={{ color: DIM }}>
        10 måneder trygg langtidsleie, toppet med 2 høysesongmåneder på korttid.
      </p>

      <div className="relative mt-8" style={{ height: 190 }}>
        {/* snittlinje */}
        <div className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${snittPct}%` }}>
          <div className="h-px flex-1" style={{ borderTop: '1px dashed rgba(21,19,15,0.3)' }} />
          <span className="shrink-0 text-[11px] tabular-nums" style={{ color: SVAK }}>snitt {nok(snittMnd)}</span>
        </div>
        {/* søyler */}
        <div className="absolute inset-0 flex items-end gap-1.5 sm:gap-2">
          {data.map((d, i) => (
            <div
              key={d.m}
              className="flex-1 rounded-t-[4px]"
              title={`${d.m}: ${nok(d.v)} kr`}
              style={{
                height: `${(d.v / maxVal) * 100}%`,
                transformOrigin: 'bottom',
                transform: synlig ? 'scaleY(1)' : 'scaleY(0)',
                transition: `transform 750ms ${EASE} ${i * 45}ms`,
                background: d.hoy ? T.lilla : 'rgba(21,19,15,0.82)',
              }}
            />
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2">
        {data.map((d) => (
          <span key={d.m} className="flex-1 text-center text-[10.5px] capitalize" style={{ color: d.hoy ? T.ink : SVAK }}>{d.m[0]}</span>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-t pt-4" style={{ borderColor: HAIR }}>
        <div className="flex items-center gap-4 text-[12.5px]" style={{ color: DIM }}>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: 'rgba(21,19,15,0.82)' }} /> Langtid</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: T.lilla }} /> Korttid høysesong</span>
        </div>
        <p className="text-[13px] tabular-nums" style={{ color: T.ink }}><span style={{ color: SVAK }}>≈</span> {nok(snittAar)} kr i året</p>
      </div>
    </div>
  );
}

/* ── 3) Regnestykke — ett konkret eksempel i kroner ── */
function Regnestykke({ modell, synlig, onCta }) {
  const r = modell.regnestykke;
  const inn = innFor(synlig);
  return (
    <div className="flex h-full flex-col">
      <p className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: SVAK, ...inn(0) }}>
        <Sparkles className="h-4 w-4" strokeWidth={1.8} /> Et konkret eksempel
      </p>
      <p className="mt-2 text-[14.5px] leading-[1.45]" style={{ color: DIM, ...inn(0) }}>{r.bolig}</p>

      <div className="mt-6 space-y-3" style={inn(1)}>
        <div className="flex items-baseline justify-between border-t pt-3" style={{ borderColor: HAIR }}>
          <span className="text-[14px]" style={{ color: DIM }}>Vanlig utleie</span>
          <span className="tabular-nums text-[15px]" style={{ color: DIM }}>{nok(r.forMnd)} kr/mnd</span>
        </div>
        <div className="flex items-baseline justify-between border-t pt-3" style={{ borderColor: HAIR }}>
          <span className="text-[14px] font-medium" style={{ color: T.ink }}>Med DigiHome</span>
          <span className="tabular-nums text-[18px]" style={{ ...display, color: T.ink }}>{nok(r.etterMnd)} kr/mnd</span>
        </div>
      </div>

      <div className="mt-6 rounded-[14px] p-5" style={{ background: 'rgba(31,157,85,0.10)', ...inn(2) }}>
        <p className="flex items-center gap-1.5 text-[13px] font-medium" style={{ color: '#1B7A45' }}>
          <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} /> Det betyr
        </p>
        <p className="mt-1.5 text-[36px] tabular-nums sm:text-[42px]" style={{ ...display, color: T.ink }}>+{nok(r.merAar)} kr</p>
        <p className="mt-0.5 text-[13.5px]" style={{ color: DIM }}>mer i lommeboka — hvert år</p>
      </div>

      <div className="mt-auto pt-6" style={inn(3)}>
        <button type="button" onClick={onCta} className="group flex h-12 w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition-transform active:scale-[0.98]" style={{ background: T.ink, color: T.offwhite }} data-testid="lp-inntekt-regnestykke-cta">
          Hva kan din bolig tjene? <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </button>
        <p className="mt-3 text-[11.5px] leading-[1.4]" style={{ color: SVAK }}>{modell.note}</p>
      </div>
    </div>
  );
}

export default function InntektHistorie({ modell, onCta }) {
  const headRef = useRef(null);
  const headV = useSynlig(headRef, 0.2);
  const inn = innFor(headV);

  const trappRef = useRef(null);
  const trappV = useSynlig(trappRef, 0.25);

  const grafRef = useRef(null);
  const grafV = useSynlig(grafRef, 0.2);

  const regnRef = useRef(null);
  const regnV = useSynlig(regnRef, 0.25);

  return (
    <section style={{ background: T.canvas }} data-testid="lp-inntektsmodell">
      <div className="mx-auto w-full max-w-[1400px] px-5 py-20 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0 lg:py-28">
        {/* Rad 1: fortelling + inntektstrappen */}
        <div className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div ref={headRef} className="lg:col-span-5">
            <p className="flex items-center gap-2 text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>
              <TrendingUp className="h-4 w-4" strokeWidth={1.8} /> {modell.eyebrow}
            </p>
            <h2 className="mt-4 max-w-[15ch] text-[clamp(34px,4vw,60px)]" style={{ ...display, color: T.ink, ...inn(1) }}>{modell.tittel}<Punkt /></h2>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-[1.5]" style={{ color: DIM, ...inn(2) }}>{modell.intro}</p>
            <div className="mt-8 flex items-end gap-4" style={inn(3)}>
              <span className="leading-none text-[64px] sm:text-[80px]" style={{ ...display, color: T.ink }}>{modell.pct}</span>
              <span className="mb-2.5 max-w-[15ch] text-[13.5px] leading-[1.35]" style={{ color: SVAK }}>{modell.pctNote}</span>
            </div>
          </div>
          <div ref={trappRef} className="lg:col-span-6 lg:col-start-7">
            <Trappen modell={modell} synlig={trappV} />
          </div>
        </div>

        {/* Rad 2: årsgraf + regnestykke */}
        <div className="mt-14 grid gap-5 sm:mt-16 lg:mt-24 lg:grid-cols-12 lg:gap-6">
          <div ref={grafRef} className="rounded-[20px] p-6 sm:p-8 lg:col-span-7" style={{ background: T.flate, boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
            <AarsGraf modell={modell} synlig={grafV} />
          </div>
          <div ref={regnRef} className="rounded-[20px] p-6 sm:p-8 lg:col-span-5" style={{ background: '#FBFAF8', boxShadow: '0 0 0 1px rgba(21,19,15,0.06)' }}>
            <Regnestykke modell={modell} synlig={regnV} onCta={onCta} />
          </div>
        </div>
      </div>
    </section>
  );
}
