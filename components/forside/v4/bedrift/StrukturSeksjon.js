'use client';

import React, { useRef } from 'react';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   StrukturSeksjon — «Hele strukturen. Ett system.»

   Det et eiendomsselskap spør om først: passer systemet strukturen vår?
   Svaret som et objekt, ikke et argument: konsernet → selskapene → byggene →
   enhetene, som en typografisk ledger med rail. Rapport og roller på hvert
   nivå. Ingen kort, ingen ikoner — hårlinjer, tall i tabular, én aksent.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.10)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.45)';
const SPRETT = 'cubic-bezier(0.22, 1, 0.36, 1)';
const inn = (vis, i, y = 10) => ({ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: `opacity 600ms ${EASE} ${i}ms, transform 700ms ${SPRETT} ${i}ms` });

const KONSERN = { navn: 'Nordvest Eiendom', bygg: 31, enheter: 640, husleie: '8,3 mill.' };
const SELSKAPER = [
  { navn: 'Nordvest Bolig AS', bygg: 14, enheter: 312, husleie: '4,1 mill.', rolle: 'Kari Nilsen · driftssjef', status: 'ok', apen: true,
    byggListe: [['Strandgaten 12', 24, '24 av 24'], ['Nygårdsgaten 5', 8, '8 av 8'], ['Damsgårdsveien 41', 40, '39 av 40 · 1 purret']], flere: 11 },
  { navn: 'Sandviken Eiendom AS', bygg: 9, enheter: 186, husleie: '2,4 mill.', rolle: 'Ola Berg · driftssjef', status: 'sak' },
  { navn: 'Stavanger Bolig AS', bygg: 8, enheter: 142, husleie: '1,8 mill.', rolle: 'Nora Haug · driftssjef', status: 'ok' },
];

function Prikk({ status }) {
  return <span aria-hidden="true" className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: status === 'sak' ? T.lilla : T.gronn }} />;
}

function Ledger({ vis }) {
  let i = 0;
  const neste = (steg = 110) => { const d = 120 + i * steg; i += 1; return d; };
  return (
    <div className="relative text-[14.5px]" data-testid="v4e-struktur-ledger">
      {/* Konsernet */}
      <div className="flex items-baseline justify-between gap-4 border-b pb-3" style={{ borderColor: 'rgba(21,19,15,0.18)', ...inn(vis, neste()) }}>
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: SVAK }}>Konsern</p>
          <p className="mt-1 truncate text-[22px] sm:text-[24px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.05, color: T.ink }}>{KONSERN.navn}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[12px] uppercase tracking-[0.08em]" style={{ color: SVAK }}>Denne måneden</p>
          <p className="mt-1 text-[15px]" style={{ color: T.ink }}><span className="font-medium">{KONSERN.bygg} bygg · {KONSERN.enheter} enheter</span><span className="hidden sm:inline" style={{ color: DIM }}> · {KONSERN.husleie}</span></p>
        </div>
      </div>

      {/* Selskapene — med rail */}
      <ol className="relative mt-1">
        <span aria-hidden="true" className="absolute bottom-4 left-[5px] top-3 w-px" style={{ background: 'rgba(21,19,15,0.16)', transformOrigin: 'top', transform: vis ? 'scaleY(1)' : 'scaleY(0)', transition: `transform 1100ms ${EASE} 250ms` }} />
        {SELSKAPER.map((s) => (
          <li key={s.navn} className="relative">
            <div className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-x-4 py-3 sm:grid-cols-[12px_minmax(0,1fr)_auto_auto]" style={{ borderBottom: s.apen ? 'none' : `1px solid ${HAIR}`, ...inn(vis, neste()) }}>
              <span className="flex justify-center"><span className="block h-[7px] w-[7px] rounded-full" style={{ background: T.ink }} /></span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-medium" style={{ color: T.ink }}>{s.navn}</span>
                <span className="block truncate text-[13px]" style={{ color: DIM }}>{s.rolle}</span>
              </span>
              <span className="hidden text-right text-[13.5px] sm:block" style={{ color: DIM }}>{s.husleie}</span>
              <span className="flex items-center justify-end gap-2 text-right text-[13.5px]" style={{ color: T.ink }}>
                <Prikk status={s.status} />
                <span>{s.bygg} bygg · {s.enheter} enh.</span>
              </span>
            </div>
            {s.apen && (
              <ul className="ml-[26px] border-b pb-3" style={{ borderColor: HAIR }} data-testid="v4e-struktur-bygg">
                {s.byggListe.map(([navn, enh, st]) => (
                  <li key={navn} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 py-[7px] text-[13.5px]" style={{ borderTop: `1px solid ${HAIR}`, ...inn(vis, neste(90), 6) }}>
                    <span className="truncate" style={{ color: 'rgba(21,19,15,0.82)' }}>{navn}<span style={{ color: SVAK }}> · {enh} enheter</span></span>
                    <span style={{ color: st.includes('purret') ? T.ink : DIM }}>{st}</span>
                  </li>
                ))}
                <li className="pt-2 text-[13px]" style={{ color: SVAK, borderTop: `1px solid ${HAIR}`, ...inn(vis, neste(90), 6) }}>+ {s.flere} bygg til · alt i orden</li>
              </ul>
            )}
          </li>
        ))}
      </ol>

      {/* Nivåene */}
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-[13px]" style={{ color: SVAK, ...inn(vis, neste()) }} data-testid="v4e-struktur-fot">
        <span>Rapport per bygg, per selskap og samlet</span>
        <span>Roller per selskap</span>
        <span>Historikk på hver enhet</span>
      </div>
    </div>
  );
}

export default function StrukturSeksjon() {
  const ref = useRef(null);
  const vis = useSynlig(ref, 0.2);
  return (
    <section id="struktur" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4e-struktur">
      <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:w-[calc(100%-128px)] lg:grid-cols-12 lg:gap-12 lg:px-0 lg:pb-24 lg:pt-28">
        <div className="lg:col-span-5">
          <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(vis, 0) }}>Strukturen</p>
          <h2 className="mt-4 max-w-[12ch] text-[clamp(38px,4.2vw,72px)]" style={{ ...display, color: T.ink, ...inn(vis, 80) }} data-testid="v4e-struktur-tittel">
            Hele strukturen<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span> Ett system<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
          </h2>
          <p className="mt-6 max-w-[44ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: DIM, ...inn(vis, 160) }}>
            Konsern, selskaper, bygg og enheter — organisert slik dere allerede har det. Hvert selskap med sine bygg, sine roller og sin rapport. Konsernet ser alt samlet.
          </p>
          <p className="mt-4 max-w-[44ch] text-[15px] leading-[1.5]" style={{ color: SVAK, ...inn(vis, 220) }}>
            Ingen omorganisering for å passe et system. Eksisterende leieforhold, kontrakter og historikk tas med som de er.
          </p>
        </div>
        <div className="lg:col-span-7">
          <Ledger vis={vis} />
        </div>
      </div>
    </section>
  );
}
