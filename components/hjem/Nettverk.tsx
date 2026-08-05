import React from 'react';
import { Seksjon, SeksjonHode } from './Seksjon';
import { network } from '@/lib/site';

// Partnernettverket som en hårfin indeks i to spalter. Seks ikonkort med
// pastellbakgrunn sa ingenting mer enn navnet og setningen gjør her.
export default function Nettverk() {
  return (
    <Seksjon testId="network-section" tone="hvit">
      <SeksjonHode
        indeks="08"
        label="Partnernettverk"
        tittel="Fagfolkene vi ringer når noe må gjøres."
        ingress="Renhold, vedlikehold, juridisk og forsikring er satt ut til folk vi bruker fast. Du trenger ikke finne dem, følge dem opp eller forhandle med dem."
      />

      <div className="mt-11 grid gap-4 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
        {network.map((n: any) => (
          <div key={n.name} className="e-reveal rounded-[24px] border border-[#ece7de] bg-[#f7f4ef] p-6 transition-colors duration-300 hover:bg-[#f3efe7]">
            <p className="text-[15.5px] font-semibold text-[#0a0a0a]">{n.name}</p>
            <p className="e-meta mt-2.5 max-w-[40ch]">{n.body}</p>
          </div>
        ))}
      </div>
    </Seksjon>
  );
}
