'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   SammenligningSeksjon — «Samme leieår. Hvem gjør hva?»

   Ikke en SaaS-tabell med haker. Ett leieår, sju hendelser, to stoler:
   «Du» og «DigiHome». En rolig bryter øverst veksler mellom selvforvaltning
   og full forvaltning — og radene skriver seg om. Det er her folk forstår
   forskjellen: i full forvaltning står det nesten bare «—» i din kolonne.

   Innholdet holder seg til det avtalen og siden faktisk lover.
--------------------------------------------------------------------------- */

const HENDELSER = [
  { t: 'Annonse og visning', selv: ['Legger ut annonsen og holder visning', null], full: [null, 'Fotograferer, annonserer og holder visning'] },
  { t: 'Valg av leietaker', selv: ['Velger leietaker', null], full: ['Siste ord — om du vil', 'Screener og anbefaler leietaker'] },
  { t: 'Leiekontrakten', selv: ['Godkjenner vilkårene', 'Setter opp kontrakten, begge signerer med BankID, arkiverer'], full: [null, 'Setter opp, signerer med BankID, håndterer depositum'] },
  { t: 'Husleie, hver måned', selv: ['Ser at den er inne', 'Registrerer betaling, varsler og purrer'], full: ['Leser rapporten', 'Innkreving, varsler og purring'] },
  { t: 'Leietaker har et spørsmål', selv: [null, 'Svarer ut fra kontrakten, løfter det som trenger deg'], full: [null, 'Fast forvalter svarer og følger opp'] },
  { t: 'Noe går i stykker', selv: ['Godkjenner leverandør og pris', 'Oppretter sak, finner leverandør og pris, følger opp til det er løst'], full: ['Godkjenner når det koster', 'Sak, leverandør og oppfølging — til det er løst'] },
  { t: 'Årsslutt', selv: ['Henter tallene', 'Historikk og dokumenter samlet på boligen'], full: ['Leser årsoppgjøret', 'Månedsrapporter og årsoppgjør'] },
];

const SUM = {
  selv: 'Du gjør: annonse, visning, valg av leietaker — og godkjenner det som koster. Resten går av seg selv.',
  full: 'Du gjør: godkjenner når noe koster, og leser rapporten. Resten gjør DigiHome.',
};

function Bryter({ verdi, onChange }) {
  const valg = [['selv', 'Selvforvaltning'], ['full', 'Full forvaltning']];
  const i = valg.findIndex(([v]) => v === verdi);
  return (
    <div role="tablist" aria-label="Modell" className="relative grid h-11 grid-cols-2 rounded-full p-1" style={{ background: 'rgba(21,19,15,0.07)' }} data-testid="v4b-bryter">
      <span aria-hidden="true" className="absolute bottom-1 top-1 w-[calc(50%-4px)] rounded-full" style={{ left: 4, background: T.ink, transform: `translateX(${i * 100}%)`, transition: `transform 420ms ${EASE}` }} />
      {valg.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={verdi === v}
          onClick={() => onChange(v)}
          className="relative z-10 rounded-full px-4 text-[14px] font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 sm:px-5"
          style={{ color: verdi === v ? T.offwhite : 'rgba(21,19,15,0.7)' }}
          data-testid={`v4b-bryter-${v}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function SammenligningSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.12);
  const [modell, setModell] = useState('selv');
  const [vist, setVist] = useState('selv');   // det som faktisk står i radene
  const [inne, setInne] = useState(true);

  /* Sekvensert bytte: radene tones ut, skrives om, tones inn. Aldri to tekster oppå hverandre. */
  useEffect(() => {
    if (modell === vist) return undefined;
    setInne(false);
    const t = window.setTimeout(() => { setVist(modell); setInne(true); }, 180);
    return () => window.clearTimeout(t);
  }, [modell, vist]);

  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(18px)', transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  const celle = { opacity: inne ? 1 : 0, transform: inne ? 'none' : 'translateY(4px)', transition: `opacity 220ms ${EASE}, transform 220ms ${EASE}` };
  const HAIR = 'rgba(21,19,15,0.10)';

  return (
    <section id="sammenlign" ref={ref} className="relative scroll-mt-16" style={{ background: T.canvas, color: T.ink }} data-testid="v4b-sammenlign">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-24 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-32 lg:pt-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between" style={inn(0)}>
          <div>
            <h2 className="text-[clamp(38px,3.8vw,64px)]" style={{ ...display, color: T.ink }} data-testid="v4b-sammenlign-tittel">
              Samme leieår.<br />Hvem gjør hva?
            </h2>
            <p className="mt-5 max-w-[40ch] text-[17px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.62)' }}>
              Sju ting som skjer i et leieår — og hvem som tar dem i hver modell.
            </p>
          </div>
          <Bryter verdi={modell} onChange={setModell} />
        </div>

        {/* Registeret */}
        <div className="mt-12 lg:mt-16" style={inn(1)}>
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-10 pb-3 text-[13px] sm:grid" style={{ color: 'rgba(21,19,15,0.5)' }}>
            <span>Hendelse</span>
            <span>Du</span>
            <span>DigiHome</span>
          </div>
          <ul className="border-t" style={{ borderColor: HAIR }} data-testid="v4b-rader">
            {HENDELSER.map((h, i) => {
              const [du, dh] = h[vist];
              return (
                <li key={h.t} className="grid gap-x-10 gap-y-2 border-b py-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:py-6" style={{ borderColor: HAIR }} data-testid={`v4b-rad-${i}`}>
                  <p className="text-[18px] font-medium leading-[1.3] sm:text-[19px]" style={{ letterSpacing: '-0.01em' }}>{h.t}</p>
                  <p className="text-[15.5px] leading-[1.45]" style={{ ...celle, color: du ? 'rgba(21,19,15,0.82)' : 'rgba(21,19,15,0.3)' }}>
                    <span className="mr-2 text-[12.5px] sm:hidden" style={{ color: 'rgba(21,19,15,0.45)' }}>Du</span>{du || '—'}
                  </p>
                  <p className="flex items-baseline gap-2.5 text-[15.5px] leading-[1.45]" style={{ ...celle, color: dh ? 'rgba(21,19,15,0.82)' : 'rgba(21,19,15,0.3)' }}>
                    <span className="text-[12.5px] sm:hidden" style={{ color: 'rgba(21,19,15,0.45)' }}>DigiHome</span>
                    {dh ? <span aria-hidden="true" className="hidden h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full sm:block" style={{ background: T.lilla }} /> : null}
                    <span>{dh || '—'}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 max-w-[64ch] text-[16px] leading-[1.5] sm:text-[17px]" style={{ ...celle, color: 'rgba(21,19,15,0.7)' }} data-testid="v4b-sum">{SUM[vist]}</p>
        </div>
      </div>
    </section>
  );
}
