import React from 'react';
import { partners } from '@/lib/site';

// ---------------------------------------------------------------------------
// Lånt autoritet, uten pynt.
//
// Logoene sto først gråtonet på én linje, deretter i hvite pille-kort. Begge
// var feil: det første gjemte dem, det andre gjorde dem til knapper. Her står
// de i full farge på papiret, i én rolig rad, med to små labeler som forklarer
// hva forholdet faktisk er. Rikelig luft er hele effekten.
// ---------------------------------------------------------------------------

const KANALER = ['Finn.no', 'Airbnb', 'Booking.com'];

export default function ProofBand() {
  const kanaler = partners.filter((p: any) => KANALER.includes(p.name) && p.logo);
  const fagfolk = partners.filter((p: any) => !KANALER.includes(p.name));

  return (
    <section className="border-y border-[#eee9e0] bg-[#fdfcfb]" data-testid="partners-bar">
      <div className="e-shell py-11 sm:py-14">
        <div className="grid gap-11 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <p className="e-eyebrow">Boligen annonseres på</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-10 gap-y-6">
              {kanaler.map((p: any) => (
                <img
                  key={p.name}
                  src={p.logo}
                  alt={p.name}
                  loading="lazy"
                  className="h-[21px] w-auto object-contain sm:h-[23px]"
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="e-eyebrow">Fagfolk og partnere vi bruker fast</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
              {fagfolk.map((p: any) => (
                <span key={p.name} className="text-[14.5px] font-medium text-[#4a4640]">{p.name}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
