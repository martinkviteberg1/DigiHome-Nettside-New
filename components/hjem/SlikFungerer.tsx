import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Seksjon, SeksjonHode } from './Seksjon';

// ---------------------------------------------------------------------------
// Fire steg — nå som myke kort, og med tekst som er sann for begge veier.
//
// Den gamle utgaven lovet at «vi finner leietakerne» og at «du får utbetalt».
// Det stemmer for full forvaltning, men ikke for selvforvaltning — der holder
// utleier visningene selv. Stegene beskriver derfor nå hva plattformen gjør
// automatisk, og hvor valget mellom forvalter og egeninnsats ligger.
// ---------------------------------------------------------------------------

const steg = [
  {
    num: '01',
    tittel: 'Legg inn adressen',
    body: 'Vi bekrefter boligen og henter bolig- og markedsdata for området.',
  },
  {
    num: '02',
    tittel: 'Få vurdering og velg vei',
    body: 'Innen 24 timer får du leievurdering og anbefalt utleiemodell — og du velger full forvaltning eller å gjøre jobben selv.',
  },
  {
    num: '03',
    tittel: 'Boligen ut i markedet',
    body: 'Annonse, visninger og screening. Kontrakten signeres digitalt med BankID. Med forvaltning holder vi visningene — velger du selv, styrer du dem.',
  },
  {
    num: '04',
    tittel: 'Husleien går av seg selv',
    body: 'Depositumskonto, husleieinnkreving, påminnelser og full oversikt skjer i plattformen. Med forvaltning følger vi også opp vedlikeholdet.',
  },
];

export default function SlikFungerer() {
  return (
    <Seksjon testId="how-it-works-section" tone="hvit">
      <SeksjonHode
        label="Slik fungerer det"
        tittel="Fra adresse til automatisert utleie."
        ingress="Du gjør én ting: legger inn adressen. Deretter velger du om en forvalter skal ta jobben, eller om du vil styre alt selv i plattformen."
        lenke="/bli-utleier/start"
        lenkeTekst="Registrer boligen"
      />

      <div className="mt-11 grid gap-4 sm:mt-14 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
        {steg.map((s) => (
          <div
            key={s.num}
            className="e-reveal flex flex-col rounded-[26px] border border-[#ece7de] bg-[#f7f4ef] p-6 transition-colors duration-300 hover:bg-[#f3efe7] sm:p-7"
          >
            <span className="e-display e-num text-[30px] text-[#cfc6b9]">{s.num}</span>
            <h3 className="e-h3 mt-5">{s.tittel}</h3>
            <p className="e-body mt-3">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <Link href="/bli-utleier/start" className="e-btn e-btn-dark group" data-testid="how-it-works-cta">
          Legg inn adressen
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </Seksjon>
  );
}
