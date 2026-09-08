'use client';

import React, { useEffect, useRef, useState } from 'react';
import { EASE, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   SammenligningSeksjon — «Samme leieår. Hvem gjør hva?»

   Ikke en SaaS-tabell med haker. Ett leieår, sju hendelser, to stoler.
   En rolig bryter øverst veksler mellom selvforvaltning og full forvaltning
   — og radene skriver seg om. Også kolonneoverskriften skifter, for den
   andre stolen er ikke den samme i de to modellene:

     Selvforvaltning  «Du» + «Systemet» — du er utleieren i hver rad; det som
                      står under Systemet, skjer automatisk, uten at noen hos
                      DigiHome løfter en finger.
     Full forvaltning «Du» + «Forvalteren» — mennesket hos DigiHome tar
                      radene; i din kolonne står det nesten bare «—».

   Innholdet holder seg til det avtalen og siden faktisk lover.
--------------------------------------------------------------------------- */

const HENDELSER = [
  { t: 'Annonse og visning', selv: ['Legger ut annonsen og holder visning', 'Annonsen lages fra boligen; interessenter og visninger samles på ett sted'], full: [null, 'Fotograferer, annonserer og holder visning'] },
  { t: 'Valg av leietaker', selv: ['Velger leietaker', null], full: ['Siste ord — om du vil', 'Screener og anbefaler leietaker'] },
  { t: 'Leiekontrakten', selv: ['Setter vilkårene og sender til signering', 'Setter opp kontrakten fra boligen, begge signerer med BankID, arkiverer'], full: [null, 'Setter opp, signerer med BankID, håndterer depositum'] },
  { t: 'Husleie, hver måned', selv: ['Ser at den er inne', 'Registrerer betaling, sender varsel og purring'], full: ['Leser rapporten', 'Innkreving, varsler og purring'] },
  { t: 'Leietaker har et spørsmål', selv: ['Svarer på det som trenger deg', 'Svarer på det som står i kontrakten, løfter resten til deg'], full: [null, 'Fast forvalter svarer og følger opp'] },
  { t: 'Noe går i stykker', selv: ['Vurderer saken, godkjenner leverandør og pris', 'Oppretter saken fra meldingen, foreslår leverandør og pris, holder leietakeren oppdatert'], full: ['Godkjenner når det koster', 'Sak, leverandør og oppfølging — til det er løst'] },
  { t: 'Årsslutt', selv: ['Henter tallene', 'Historikk og dokumenter samlet på boligen'], full: ['Leser årsoppgjøret', 'Månedsrapporter og årsoppgjør'] },
];

const SUM = {
  selv: 'Du er utleieren og driver boligen selv. Rutinen — kontrakt, purring, saker og dokumenter — gjør systemet automatisk. Ingen andre er involvert.',
  full: 'Du godkjenner når noe koster, og leser rapporten. Alt annet gjør den faste forvalteren din hos DigiHome.',
};

const VALG = [['selv', 'Selvforvaltning'], ['full', 'Full forvaltning']];

/* Kolonnene per modell: den andre stolen heter ikke det samme. */
const KOLONNER = {
  selv: ['Hendelse', 'Du', 'Systemet'],
  full: ['Hendelse', 'Du', 'Forvalteren'],
};

function Bryter({ verdi, onChange, valg = VALG, testid = 'v4b' }) {
  const i = valg.findIndex(([v]) => v === verdi);
  const n = valg.length;
  return (
    <div role="tablist" aria-label="Velg" className="relative grid h-11 rounded-full p-1" style={{ background: 'rgba(21,19,15,0.07)', gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} data-testid={`${testid}-bryter`}>
      <span aria-hidden="true" className="absolute bottom-1 top-1 rounded-full" style={{ left: 4, width: `calc(${100 / n}% - ${8 / n}px)`, background: T.ink, transform: `translateX(${i * 100}%)`, transition: `transform 420ms ${EASE}` }} />
      {valg.map(([v, l]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={verdi === v}
          onClick={() => onChange(v)}
          className="relative z-10 truncate rounded-full px-3 text-[13.5px] font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 sm:px-5 sm:text-[14px]"
          style={{ color: verdi === v ? T.offwhite : 'rgba(21,19,15,0.7)' }}
          data-testid={`${testid}-bryter-${v}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export default function SammenligningSeksjon({
  tittel = ['Samme leieår.', 'Hvem gjør hva?'],
  under = 'Sju ting som skjer i et leieår. Hvem som gjør dem, er hele forskjellen.',
  valg = VALG,
  hendelser = HENDELSER,
  sum = SUM,
  kolonner = KOLONNER,   // array (samme for alle) eller objekt per modell
  testid = 'v4b',
}) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.12);
  const [modell, setModell] = useState(valg[0][0]);
  const [vist, setVist] = useState(valg[0][0]);   // det som faktisk står i radene
  const [inne, setInne] = useState(true);
  const kol = Array.isArray(kolonner) ? kolonner : (kolonner[vist] || Object.values(kolonner)[0]);

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
    <section id="sammenlign" ref={ref} className="relative scroll-mt-16" style={{ background: T.canvas, color: T.ink }} data-testid={`${testid}-sammenlign`}>
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-16 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-32 lg:pt-24">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between" style={inn(0)}>
          <div>
            <h2 className="text-[clamp(38px,3.8vw,64px)]" style={{ ...display, color: T.ink }} data-testid={`${testid}-sammenlign-tittel`}>
              {tittel[0]}<br />{tittel[1]}
            </h2>
            <p className="mt-5 max-w-[40ch] text-[17px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.62)' }}>
              {under}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 lg:items-end">
            <Bryter verdi={modell} onChange={setModell} valg={valg} testid={testid} />
            <p className="hidden items-center gap-4 text-[12.5px] sm:flex" style={{ color: 'rgba(21,19,15,0.5)' }}>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.lilla }} />Din beslutning</span>
              <span className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Skjer uten deg</span>
            </p>
          </div>
        </div>

        {/* Registeret */}
        <div className="mt-12 lg:mt-16" style={inn(1)}>
          <div className="hidden grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-10 pb-3 text-[13px] sm:grid" style={{ color: 'rgba(21,19,15,0.5)' }} data-testid={`${testid}-kolonner`}>
            <span>{kol[0]}</span>
            <span style={celle}>{kol[1]}</span>
            <span style={celle}>{kol[2]}</span>
          </div>
          <ul className="border-t" style={{ borderColor: HAIR }} data-testid={`${testid}-rader`}>
            {hendelser.map((h, i) => {
              const [du, dh] = h[vist];
              return (
                /* Fargespråket er sidens: lilla = det som er DITT (en beslutning), grønn = det som går av seg selv / gjøres for deg */
                <li key={h.t} className="grid gap-x-10 gap-y-2 border-b py-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1fr)] sm:py-6" style={{ borderColor: HAIR }} data-testid={`${testid}-rad-${i}`}>
                  <p className="flex items-baseline gap-3 text-[18px] font-medium leading-[1.3] sm:text-[19px]" style={{ letterSpacing: '-0.01em' }}>
                    <span className="text-[12.5px] font-normal tabular-nums" style={{ color: 'rgba(21,19,15,0.4)' }}>0{i + 1}</span>{h.t}
                  </p>
                  <p className="flex items-baseline gap-2.5 text-[15.5px] leading-[1.45]" style={{ ...celle, color: du ? 'rgba(21,19,15,0.82)' : 'rgba(21,19,15,0.3)' }}>
                    <span className="text-[12.5px] sm:hidden" style={{ color: 'rgba(21,19,15,0.45)' }}>{kol[1]}</span>
                    {du ? <span aria-hidden="true" className="hidden h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full sm:block" style={{ background: T.lilla, boxShadow: '0 0 0 3px rgba(212,150,255,0.22)' }} /> : null}
                    <span>{du || '—'}</span>
                  </p>
                  <p className="flex items-baseline gap-2.5 text-[15.5px] leading-[1.45]" style={{ ...celle, color: dh ? 'rgba(21,19,15,0.82)' : 'rgba(21,19,15,0.3)' }}>
                    <span className="text-[12.5px] sm:hidden" style={{ color: 'rgba(21,19,15,0.45)' }}>{kol[2]}</span>
                    {dh ? <span aria-hidden="true" className="hidden h-1.5 w-1.5 shrink-0 translate-y-[-1px] rounded-full sm:block" style={{ background: T.gronn }} /> : null}
                    <span>{dh || '—'}</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 max-w-[64ch] text-[16px] leading-[1.5] sm:text-[17px]" style={{ ...celle, color: 'rgba(21,19,15,0.7)' }} data-testid={`${testid}-sum`}>{sum[vist]}</p>
        </div>
      </div>
    </section>
  );
}
