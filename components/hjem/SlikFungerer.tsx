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

      <div className="mt-14 grid gap-x-10 gap-y-12 sm:mt-16 sm:grid-cols-2 xl:grid-cols-4">
        {steg.map((s) => (
          <div key={s.num} className="e-reveal border-t border-[#eae5dc] pt-6">
            <span className="e-num text-[11.5px] font-semibold tracking-[0.14em] text-[#a39b8e]">{s.num}</span>
            <h3 className="e-h3 mt-4">{s.tittel}</h3>
            <p className="e-body mt-3 max-w-[34ch]">{s.body}</p>
          </div>
        ))}
      </div>

    </Seksjon>
  );
}
