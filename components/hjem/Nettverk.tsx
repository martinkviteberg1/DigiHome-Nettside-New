import React from 'react';
import { Seksjon, SeksjonHode } from './Seksjon';
import { network } from '@/lib/site';

// Partnernettverket som en hårfin indeks i to spalter. Seks ikonkort med
// pastellbakgrunn sa ingenting mer enn navnet og setningen gjør her.
export default function Nettverk() {
  return (
    <Seksjon testId="network-section">
      <SeksjonHode
        indeks="08"
        label="Partnernettverk"
        tittel="Fagfolkene vi ringer når noe må gjøres."
        ingress="Renhold, vedlikehold, juridisk og forsikring er satt ut til folk vi bruker fast. Du trenger ikke finne dem, følge dem opp eller forhandle med dem."
      />

      <div className="mt-12 sm:mt-16 grid md:grid-cols-2 gap-x-14">
        {network.map((n: any) => (
          <div key={n.name} className="e-reveal e-rule py-5 grid grid-cols-[104px_1fr] sm:grid-cols-[132px_1fr] gap-x-5 items-baseline">
            <p className="text-[15px] font-semibold text-[#0a0a0a]">{n.name}</p>
            <p className="e-meta max-w-[42ch]">{n.body}</p>
          </div>
        ))}
      </div>
    </Seksjon>
  );
}
