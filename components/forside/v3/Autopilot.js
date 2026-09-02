'use client';

import React, { useRef } from 'react';
import { MessageSquare, UserPlus, Banknote, Wrench, Sun, Check } from 'lucide-react';
import { heading, EASE, display, Avsloer, Etikett, Lenke, useSynlig, Inn, tall, T } from './motion';

/* ---------------------------------------------------------------------------
   Autopilot — «Mens du sover.»  (mørk)
   Den ene seksjonen som viser selve autopiloten: en natts hendelseslogg fra
   systemet. Ingen mockup-chrome — bare tid, hendelse, kvittering. Alle
   hendelser er ting produktet faktisk gjør (svar på annonse, kandidatliste,
   KID-matching, leverandørbooking, rapport). Radene lander én og én.
--------------------------------------------------------------------------- */

const HENDELSER = [
  { t: '22:41', Ikon: MessageSquare, h: 'Interessent fikk svar', s: '«Er det parkering?» · svart fra annonsen · visning foreslått torsdag' },
  { t: '23:05', Ikon: UserPlus, h: 'Ny kandidat i listen', s: 'Maria Johansen · referanser innhentet · klar for din vurdering' },
  { t: '06:00', Ikon: Banknote, h: 'Husleie matchet', s: `${tall(18500)} kr · KID · kvittering sendt til Jonas` },
  { t: '07:15', Ikon: Wrench, h: 'Rørlegger bekreftet', s: 'Torsdag kl. 09:00 · leietaker varslet · godkjent av deg i går' },
  { t: '07:30', Ikon: Sun, h: 'Morgenrapport sendt', s: 'Alt i orden. Ingenting krever deg i dag.' },
];

function Logg() {
  const ref = useRef(null);
  const inne = useSynlig(ref, 0.3);
  return (
    <div ref={ref} className="overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#141118] shadow-[0_60px_120px_-60px_rgba(0,0,0,0.9)]" data-testid="v3-autopilot-logg" aria-hidden="true">
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] px-6 py-4">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/v3/hjem-kjokken-thumb.webp" alt="" className="h-9 w-9 rounded-[9px] object-cover ring-1 ring-white/10" />
          <span>
            <span className="block text-[14px] font-medium text-white">I natt · Marken 8</span>
            <span className="block text-[12px] text-white/45">Tirsdag 22:00 → onsdag 07:30</span>
          </span>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] px-3 py-1.5 text-[12px] text-white/70">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#7fe0b2] opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#7fe0b2]" />
          </span>
          5 hendelser · 0 krevde deg
        </span>
      </div>
      <ol className="px-2 py-2">
        {HENDELSER.map((h, i) => (
          <Inn key={h.t} vis={inne} delay={200 + i * 260} dy={8}>
            <li className={`grid grid-cols-[56px_40px_minmax(0,1fr)] items-center gap-3 rounded-[10px] px-4 py-3.5 ${i > 0 ? 'border-t border-white/[0.05]' : ''}`}>
              <span className="text-[13px] tabular-nums text-white/40">{h.t}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]"><h.Ikon className="h-4 w-4 text-white" strokeWidth={1.7} /></span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] font-medium text-white">{h.h}</span>
                <span className="block truncate text-[12.5px] text-white/45">{h.s}</span>
              </span>
            </li>
          </Inn>
        ))}
      </ol>
      <div className="flex items-center gap-2.5 border-t border-white/[0.08] px-6 py-3.5 text-[12.5px] text-white/45">
        <Check className="h-3.5 w-3.5 text-[#7fe0b2]" strokeWidth={2.4} /> Alt som koster penger eller binder deg, stoppet og ventet på deg. Ingenting gjorde det i natt.
      </div>
    </div>
  );
}

export default function Autopilot() {
  return (
    <section className="relative overflow-hidden bg-[#0D0B0F] text-white" data-testid="v3-autopilot">
      {/* Nattlys — svakt, kaldt, ovenfra høyre. Scenelys, ikke glow. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(50% 40% at 78% 0%, rgba(212,150,255,0.10) 0%, rgba(212,150,255,0.03) 45%, transparent 75%)' }} />
      <div className="relative mx-auto w-full max-w-[1280px] px-6 py-28 sm:px-8 sm:py-36">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-20">
          <Avsloer>
            <Etikett mork>Autopilot</Etikett>
            <h2 className="mt-3 max-w-[10ch] text-[40px] text-white sm:text-[52px] lg:text-[64px]" style={display}>Mens du sover.</h2>
            <p className="mt-6 max-w-[42ch] text-[17px] leading-[1.55] text-white/60 sm:text-[19px]">
              Det meste av utleie er små ting som skjer til feil tid. Systemet tar dem
              — og legger igjen en kvittering du kan lese over kaffen.
            </p>
            <p className="mt-4 max-w-[42ch] text-[15.5px] leading-[1.6] text-white/45">
              Alt som koster penger eller binder deg, stopper og venter på ett trykk fra deg.
              Resten går.
            </p>
            <div className="mt-8"><Lenke mork href="#reisen">Se hele reisen</Lenke></div>
          </Avsloer>
          <Avsloer delay={120}><Logg /></Avsloer>
        </div>
      </div>
    </section>
  );
}
