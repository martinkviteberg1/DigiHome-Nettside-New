import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Seksjon, SeksjonHode } from './Seksjon';

// ---------------------------------------------------------------------------
// De to tjenestenivåene, side om side.
//
// Forsiden manglet en inngang til selvforvaltning helt — den fantes bare i
// menyen. Her står de to veiene som to spalter delt av en hårfin linje, ikke
// som kort med ikoner: forskjellen mellom dem er hvem som møter opp, og det
// forstås best når de leses parallelt. Prisen nevnes én gang, i tekststørrelse.
// ---------------------------------------------------------------------------

const veier = [
  {
    navn: 'Full forvaltning',
    sted: 'Bergen og omegn',
    beskrivelse:
      'Vi tar hele jobben. En forvalter holder visningene, går befaringen, følger opp vedlikehold og håndterer leieforholdet fra dag til dag.',
    punkter: [
      'Visninger og leietakervalg',
      'Inn- og utflyttingsbefaring',
      'Vedlikehold via partnernettverket',
      'Dedikert forvalter',
    ],
    pris: 'Etter tilbud — vi vurderer boligen først',
    href: '/forvaltning',
    cta: 'Se full forvaltning',
  },
  {
    navn: 'Selvforvaltning',
    sted: 'Hele Norge',
    beskrivelse:
      'Du holder visningene og bestemmer hvem som får boligen. Resten ligger i det samme systemet vi drifter forvaltningsboligene i.',
    punkter: [
      'FINN-annonse',
      'Leiekontrakt med BankID-signering',
      'Depositumskonto',
      'Husleieinnkreving og oversikt',
    ],
    pris: '5 % av husleien — ingen minstepris',
    href: '/selvforvaltning',
    cta: 'Se selvforvaltning',
  },
];

export default function ToVeier() {
  return (
    <Seksjon testId="to-veier-section" hvit>
      <SeksjonHode
        indeks="01"
        label="Tjenestenivå"
        tittel="To måter å leie ut. Samme system i bunnen."
        ingress="Full forvaltning er en tjeneste med mennesker i Bergen. Selvforvaltning er den samme plattformen, uten forvalteren — tilgjengelig for utleiere i hele landet."
      />

      <div className="mt-12 sm:mt-16 grid lg:grid-cols-2 gap-y-12 lg:gap-y-0">
        {veier.map((v, i) => (
          <div
            key={v.navn}
            className={`${i === 1 ? 'lg:pl-14 lg:border-l lg:border-[#e6e1d9]' : 'lg:pr-14'} e-reveal flex flex-col`}
          >
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="e-h3 text-[24px] sm:text-[28px]">{v.navn}</h3>
              <span className="e-label whitespace-nowrap">{v.sted}</span>
            </div>
            <p className="e-body mt-4 max-w-[44ch]">{v.beskrivelse}</p>

            <div className="e-rule e-hair mt-7">
              {v.punkter.map((p) => (
                <p key={p} className="py-3 text-[14.5px] text-[#0a0a0a]">{p}</p>
              ))}
            </div>

            <p className="e-meta mt-5">{v.pris}</p>

            <div className="mt-6">
              <Link href={v.href} className={`e-btn ${i === 1 ? 'e-btn-ghost' : 'e-btn-dark'}`}>
                {v.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </Seksjon>
  );
}
