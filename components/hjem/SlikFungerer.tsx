import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Seksjon, SeksjonHode } from './Seksjon';

// Fire steg som en nummerert liste med hårfine linjer — ikke fire kort med
// ikoner i fargede firkanter. Tallene er satt i display-snittet, så de bærer
// rytmen visuelt uten at noe må dekoreres.
const steg = [
  {
    num: '01',
    tittel: 'Registrer boligen',
    body: 'Vi bekrefter adressen og bruker tilgjengelige bolig- og markedsdata i vurderingen.',
  },
  {
    num: '02',
    tittel: 'Få vurdering og pris',
    body: 'Innen 24 timer får du en datadrevet leievurdering og anbefalt utleiemodell for akkurat din bolig.',
  },
  {
    num: '03',
    tittel: 'Vi finner leietakerne',
    body: 'Profesjonell annonsering, visninger og grundig screening. Kontrakten signeres digitalt med BankID.',
  },
  {
    num: '04',
    tittel: 'Du får utbetalt',
    body: 'Husleien kommer hver måned, med full oversikt i portalen. Vi håndterer det som skjer underveis.',
  },
];

export default function SlikFungerer() {
  return (
    <Seksjon testId="how-it-works-section">
      <SeksjonHode
        indeks="02"
        label="Slik fungerer det"
        tittel="Fra adresse til utbetalt husleie."
        ingress="Du gjør én ting: legger inn adressen. Resten er vår jobb — og du ser hvert steg underveis."
        lenke="/bli-utleier/start"
        lenkeTekst="Registrer boligen"
      />

      <div className="mt-12 sm:mt-16 e-rule e-hair">
        {steg.map((s) => (
          <div key={s.num} className="e-reveal grid lg:grid-cols-12 gap-x-10 gap-y-2 py-7 sm:py-9">
            <p className="e-display e-num lg:col-span-1 text-[28px] sm:text-[34px] text-[#c2bab0]">{s.num}</p>
            <h3 className="e-h3 lg:col-span-4">{s.tittel}</h3>
            <p className="e-body lg:col-span-7 max-w-[60ch]">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link href="/bli-utleier/start" className="e-btn e-btn-dark" data-testid="how-it-works-cta">
          Legg inn adressen <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </Seksjon>
  );
}
