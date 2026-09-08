'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, tall, useSekvens, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   MeglerScene — «morgenen hos en forvalter med 86 eiere».

   Heroscenen på /utleiemeglere. Én rolig produktflate (samme språk som
   filmene på forsiden): kontoret i toppen, fire tall, så dagen som en
   typografisk ledger — rad for rad, slik den faktisk kommer inn. Til slutt
   ett charcoal-kort med det som venter på MENNESKENE: to ting. Poenget er
   forholdet: 214 leieforhold, 86 eiere, seks hendelser før ni — to av dem
   trenger noen.

   Alt i scenen finnes i produktet: oppgjør per eier, tilbudsutkast på nye
   lead, lesesporing på tilbud, saker med eiergodkjenning, BankID-signert
   oppdragsavtale → enhet + onboarding, automatisk purring.
   Bevegelse: kun opacity/transform.
--------------------------------------------------------------------------- */

const PAPIR = '#FBFAF8';
const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

/* Porteføljen på kartet: 72 punkter i Bergen sentrum (deterministisk «tilfeldig», så server og klient tegner det samme).
   Tettest i sentrum, spredt utover — som en ekte utleieportefølje. */
const PUNKTER = (() => {
  let seed = 11;
  const r = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  const p = [];
  for (let i = 0; i < 72; i++) {
    const a = r() * Math.PI * 2; const d = Math.pow(r(), 0.55) * 0.47;
    /* Avrundet: server og klient må gi identiske strenger (Math.cos/pow kan avvike i siste desimal) */
    p.push({ x: Math.round((50 + Math.cos(a) * d * 100) * 10) / 10, y: Math.round((52 + Math.sin(a) * d * 88) * 10) / 10, s: Math.round((0.75 + r() * 0.5) * 20) / 20, puls: r() < 0.12 });
  }
  return p;
})();

const TALL = [
  { k: 'Eiere', v: 86 },
  { k: 'Leieforhold', v: 214 },
  { k: 'Utbetalinger i dag', v: 86 },
];

const RADER = [
  { kl: '06:00', hva: 'Oppgjør mai', d: `214 husleier avstemt · honorar trukket · 86 eiere får utbetaling i dag`, s: 'ok' },
  { kl: '07:15', hva: 'Ny henvendelse', d: 'Fjellveien 12 · «Ønsker hjelp til utleie» · tilbudsutkast ligger klart', s: 'ny' },
  { kl: '08:02', hva: 'Tilbud lest', d: 'Kari Moen åpnet tilbudet · 2. gang · 4 min', s: 'ok' },
  { kl: '08:30', hva: 'Sak · varmtvann', d: `Strandgaten 12 · rørlegger bestilt · eier godkjente ${tall(6200)} kr i appen`, s: 'ok' },
  { kl: '09:10', hva: 'Signert', d: 'Oppdragsavtale Fjellveien 12 · BankID · enhet opprettet · onboarding sendt', s: 'ok' },
  { kl: '09:40', hva: 'Purring', d: '3 av 214 husleier ikke betalt · påminnelse sendt automatisk', s: 'auto' },
];

const FASER = [
  { navn: 'inn', ms: 400 },
  { navn: 'kart', ms: 1500 },
  { navn: 'rad0', ms: 620 }, { navn: 'rad1', ms: 620 }, { navn: 'rad2', ms: 620 }, { navn: 'rad3', ms: 620 }, { navn: 'rad4', ms: 620 }, { navn: 'rad5', ms: 900 },
  { navn: 'kort', ms: 600 },
  { navn: 'ferdig', ms: null },
];

function Teller({ vis, til }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!vis) { setV(0); return undefined; }
    let raf; const t0 = performance.now(); const dur = 900;
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); setV(Math.round(til * e)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vis, til]);
  return <>{tall(v)}</>;
}

function Prikk({ s }) {
  const farge = s === 'ny' ? T.lilla : s === 'auto' ? 'rgba(21,19,15,0.3)' : T.gronn;
  return <span className="mt-[7px] block h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: farge }} />;
}

export default function MeglerScene() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.3);
  const { er } = useSekvens(FASER, synlig);
  const inne = er('inn');
  return (
    <figure ref={ref} className="relative m-0" data-testid="v4m-scene">
      <div className="relative overflow-hidden rounded-[22px]" style={{ background: PAPIR, boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 48px 100px -56px rgba(21,19,15,0.4)', opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(12px)', transition: `opacity 700ms ${EASE}, transform 900ms ${EASE}` }}>
        {/* Porteføljen på kartet: Bergen som hårlinjer, 214 leieforhold lyser opp én og én. Tallene teller seg opp i hjørnet. */}
        <div className="relative h-[200px] overflow-hidden sm:h-[230px]" data-testid="v4m-kart">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v4/annonse/bergen-kart-m.svg" alt="" aria-hidden="true" draggable={false} className="absolute left-1/2 top-1/2 h-[190%] w-auto max-w-none select-none" style={{ transform: `translate(-50%, -50%) scale(${er('kart') ? 1 : 1.06})`, opacity: er('kart') ? 0.9 : 0, transition: `opacity 1200ms ${EASE}, transform 4000ms cubic-bezier(0.25, 0.1, 0.25, 1)` }} />
          <div aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 55%, rgba(251,250,248,0) 38%, rgba(251,250,248,0.6) 72%, ${PAPIR} 100%)` }} />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-16" style={{ background: `linear-gradient(180deg, rgba(251,250,248,0) 0%, ${PAPIR} 100%)` }} />
          {PUNKTER.map((pt, i) => (
            <span key={i} aria-hidden="true" className="absolute rounded-full" style={{ left: `${pt.x}%`, top: `${pt.y}%`, width: Math.round(7 * pt.s * 10) / 10, height: Math.round(7 * pt.s * 10) / 10, marginLeft: -Math.round(3.5 * pt.s * 10) / 10, marginTop: -Math.round(3.5 * pt.s * 10) / 10, background: T.lilla, boxShadow: '0 0 0 2px rgba(251,250,248,0.95)', opacity: er('kart') ? 1 : 0, transform: er('kart') ? 'scale(1)' : 'scale(0.2)', transition: `opacity 400ms ${EASE} ${200 + i * 16}ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${200 + i * 16}ms`, animation: pt.puls && er('kart') ? `v4-puls-dot 2800ms ease-in-out ${1800 + i * 90}ms infinite` : 'none' }} />
          ))}
          <div className="absolute left-5 top-5 sm:left-7 sm:top-6" style={{ opacity: er('inn') ? 1 : 0, transition: `opacity 600ms ${EASE} 200ms` }}>
            <p className="text-[12.5px] font-medium" style={{ color: SVAK }}>Vest Utleie AS · mandag 3. juni</p>
            <p className="mt-0.5 text-[20px] sm:text-[22px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>I dag</p>
          </div>
          <dl className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2 sm:bottom-5 sm:left-7 sm:right-7" data-testid="v4m-tall">
            {TALL.map((t) => (
              <div key={t.k} className="min-w-0" style={{ opacity: er('kart') ? 1 : 0, transition: `opacity 600ms ${EASE} 500ms` }}>
                <dt className="text-[11.5px] sm:text-[12px]" style={{ color: SVAK }}>{t.k}</dt>
                <dd className="mt-0.5 text-[24px] tabular-nums sm:text-[28px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}><Teller vis={er('kart')} til={t.v} /></dd>
              </div>
            ))}
            <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[12.5px] font-medium" style={{ background: 'rgba(31,157,85,0.12)', color: '#166B3C', opacity: er('kart') ? 1 : 0, transition: `opacity 600ms ${EASE} 900ms` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Oppgjør kjørt 06:00</p>
          </dl>
        </div>
        {/* Dagen som ledger */}
        <ul className="px-5 pb-5 pt-1 sm:px-7 sm:pb-6" aria-label="Hendelser i dag" style={{ boxShadow: `inset 0 1px 0 ${HAIR}` }}>
          {RADER.map((r, i) => {
            const vis = er(`rad${i}`);
            return (
              <li key={r.kl} className="grid grid-cols-[7px_minmax(0,1fr)] items-start gap-x-3 py-[11px] sm:grid-cols-[46px_7px_minmax(0,1fr)]" style={{ boxShadow: i < RADER.length - 1 ? `inset 0 -1px 0 ${HAIR}` : 'none', opacity: vis ? 1 : 0, transform: vis ? 'none' : 'translateY(8px)', transition: `opacity 480ms ${EASE}, transform 600ms ${EASE}` }} data-testid={`v4m-rad-${i}`}>
                <span className="hidden pt-[3px] text-[12px] tabular-nums sm:block" style={{ color: SVAK }}>{r.kl}</span>
                <Prikk s={r.s} />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium sm:text-[15.5px]" style={{ color: T.ink }}>{r.hva} <span className="font-normal sm:hidden" style={{ color: SVAK }}>· {r.kl}</span></span>
                  <span className="mt-0.5 block text-[13px] leading-[1.45] sm:text-[13.5px]" style={{ color: DIM }}>{r.d}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {/* Det som venter på menneskene */}
        <div className="mx-5 mb-5 rounded-[16px] p-4 sm:mx-7 sm:mb-7 sm:p-5" style={{ background: T.charcoal, color: T.offwhite, opacity: er('kort') ? 1 : 0, transform: er('kort') ? 'none' : 'translateY(10px)', transition: `opacity 600ms ${EASE}, transform 700ms ${EASE}` }} data-testid="v4m-kort">
          <div className="flex items-baseline justify-between gap-3 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>
            <p className="font-medium">Venter på dere</p>
            <p className="tabular-nums"><span style={{ color: T.offwhite }}>2</span> av 6</p>
          </div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            <li className="rounded-[10px] px-3.5 py-3" style={{ background: 'rgba(244,241,234,0.06)' }}>
              <p className="text-[14.5px] font-medium">Godkjenn tilbud · Løkkeveien 14</p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Porteføljetilbud · 6 enheter · utkast klart</p>
            </li>
            <li className="rounded-[10px] px-3.5 py-3" style={{ background: 'rgba(244,241,234,0.06)' }}>
              <p className="text-[14.5px] font-medium">Befaring 14:00 · Fjellveien 12</p>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Kari Moen · nøkler og bilder til annonsen</p>
            </li>
          </ul>
        </div>
      </div>
      <figcaption className="sr-only">Dagen hos en forvalter med 86 eiere og 214 leieforhold: oppgjør kjørt automatisk, ny henvendelse med tilbudsutkast, tilbud lest, sak løst med eiergodkjenning, oppdragsavtale signert og enhet opprettet, purring sendt. To ting venter på teamet.</figcaption>
    </figure>
  );
}
