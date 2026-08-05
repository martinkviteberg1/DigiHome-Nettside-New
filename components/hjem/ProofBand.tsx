import React from 'react';
import { partners } from '@/lib/site';

// ---------------------------------------------------------------------------
// Lånt autoritet — satt med klasse.
//
// Før sto alt på én linje: gråtonede logoer i 65 % opasitet blandet med løs
// tekst, uten å fortelle hva forholdet faktisk er. Nå er det to grupper med
// hver sin forklaring — kanalene boligen annonseres i, og fagfolkene som
// gjør jobben — logoene i hvite avrundede flater med hårfin kant og full
// farge, navnene som rolige merker. Ingen bevegelse, ingen marquee.
// ---------------------------------------------------------------------------

const KANALER = ['Finn.no', 'Airbnb', 'Booking.com'];

export default function ProofBand() {
  const kanaler = partners.filter((p: any) => KANALER.includes(p.name) && p.logo);
  const fagfolk = partners.filter((p: any) => !KANALER.includes(p.name));

  return (
    <section className="e-tone-mist e-grain border-y border-[#e6e1d9]" data-testid="partners-bar">
      <div className="e-shell relative py-9 sm:py-11">
        <div className="grid gap-9 lg:grid-cols-12 lg:gap-12">
          {/* Kanalene: der boligen faktisk blir synlig. */}
          <div className="lg:col-span-6">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#8d877d]">
              Boligen annonseres på
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              {kanaler.map((p: any) => (
                <span
                  key={p.name}
                  className="e-soft-sm inline-flex h-[48px] items-center rounded-[18px] border border-[#e6e1d9] bg-white px-4 transition-transform duration-300 hover:-translate-y-[2px]"
                >
                  <img src={p.logo} alt={p.name} loading="lazy" className="h-[20px] w-auto object-contain" />
                </span>
              ))}
              <span className="inline-flex h-[48px] items-center rounded-[18px] border border-[#e0dad0] bg-white/60 px-4 text-[13px] font-medium text-[#4a4640]">
                Hybel.no
              </span>
            </div>
          </div>

          {/* Fagfolkene: de vi ringer når noe må gjøres. */}
          <div className="lg:col-span-6 lg:border-l lg:border-[#e0dad0] lg:pl-12">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#8d877d]">
              Fagfolk og partnere vi bruker fast
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {fagfolk.map((p: any) => (
                <span
                  key={p.name}
                  className="inline-flex items-center rounded-full border border-[#e0dad0] bg-white/75 px-3.5 py-[8px] text-[13px] font-medium text-[#3a3733] backdrop-blur-sm transition-colors duration-300 hover:bg-white"
                >
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
