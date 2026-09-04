'use client';

import React, { useRef } from 'react';
import { EASE, Lenke, T, display, useSynlig } from './motion';

/* ---------------------------------------------------------------------------
   AltSamletSeksjon — «Hele utleien. Ett sted.»

   Produktseksjonen viste ETT område (Drift) i dybden. Denne svarer på
   «og resten?» — de fem områdene i livssyklusen, i rekkefølge, én linje hver.
   Contained editorial: tekstkolonne til venstre, et register på hårlinjer til
   høyre. Ingen ikoner, ingen kort. Påstandene er de samme som forsiden allerede
   gjør (annonse, BankID-kontrakt, depositum, husleie, saker, svar fra kontrakten).
--------------------------------------------------------------------------- */

const OMRADER = [
  { nr: '01', navn: 'Annonse', t: 'Lag annonsen én gang. Interessenter og visninger samlet på boligen.' },
  { nr: '02', navn: 'Kontrakt', t: 'Leiekontrakten signeres med BankID. Depositum og innflytting følger.' },
  { nr: '03', navn: 'Økonomi', t: 'Husleien registreres, følges opp og purres. Du ser hva som er inne — per bolig.' },
  { nr: '04', navn: 'Leietaker', t: 'Spørsmål besvares fra kontrakten. Meldinger som trenger noe, blir saker.' },
  { nr: '05', navn: 'Drift', t: 'Fra melding til løst: sak, leverandør og pris — du godkjenner med ett trykk.' },
];

const HAIR = 'rgba(21,19,15,0.10)';

export default function AltSamletSeksjon() {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : 'translateY(16px)', transition: `opacity 700ms ${EASE} ${i * 80}ms, transform 800ms ${EASE} ${i * 80}ms` });

  return (
    <section id="alt" ref={ref} className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-alt">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-20 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
          {/* Venstre: påstand + én setning + lenke */}
          <div className="lg:col-span-4" style={inn(0)}>
            <h2 className="text-[clamp(38px,3.6vw,64px)]" style={{ ...display, color: T.ink }} data-testid="v4-alt-tittel">
              Hele utleien.<br />Ett sted.
            </h2>
            <p className="mt-6 max-w-[34ch] text-[17px] leading-[1.5] sm:text-[18px]" style={{ color: 'rgba(21,19,15,0.64)' }}>
              Fem områder som henger sammen. Det som skjer i ett, oppdaterer de andre — og det meste skjer uten deg.
            </p>
            <div className="mt-8">
              <Lenke href="/omvisning" data-testid="v4-alt-lenke">Se DigiHome</Lenke>
            </div>
          </div>

          {/* Høyre: register — fem rader på hårlinjer */}
          <ol className="lg:col-span-8 lg:col-start-5" data-testid="v4-alt-liste">
            {OMRADER.map((o, i) => (
              <li
                key={o.nr}
                className="grid grid-cols-[40px_minmax(0,1fr)] gap-x-4 gap-y-2 py-6 sm:grid-cols-[48px_200px_minmax(0,1fr)] sm:items-baseline sm:gap-x-6 lg:py-7"
                style={{ borderTop: `1px solid ${HAIR}`, borderBottom: i === OMRADER.length - 1 ? `1px solid ${HAIR}` : 'none', ...inn(i + 1) }}
                data-testid={`v4-alt-${o.navn.toLowerCase()}`}
              >
                <span className="pt-1 text-[13px] tabular-nums" style={{ color: 'rgba(21,19,15,0.45)' }}>{o.nr}</span>
                <h3 className="text-[clamp(28px,2.1vw,36px)]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1, color: T.ink }}>{o.navn}</h3>
                <p className="col-start-2 max-w-[46ch] text-[16px] leading-[1.5] sm:col-start-3 sm:text-[16.5px]" style={{ color: 'rgba(21,19,15,0.64)' }}>{o.t}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
