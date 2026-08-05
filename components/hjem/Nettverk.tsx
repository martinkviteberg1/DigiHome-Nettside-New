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

      <div className="mt-12 grid sm:mt-14 md:grid-cols-2 md:gap-x-16">
        {network.map((n: any) => (
          <div key={n.name} className="e-reveal grid grid-cols-[112px_1fr] items-baseline gap-x-6 border-b border-[#efeae1] py-5 sm:grid-cols-[132px_1fr]">
            <p className="text-[15px] font-semibold text-[#0a0a0a]">{n.name}</p>
            <p className="e-meta max-w-[40ch]">{n.body}</p>
          </div>
        ))}
      </div>
    </Seksjon>
  );
}
