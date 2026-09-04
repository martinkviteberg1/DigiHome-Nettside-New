'use client';

import React from 'react';
import { T } from './motion';

/* ---------------------------------------------------------------------------
   TillitStripe — lav «trust bridge» mellom heroen og produktseksjonen.

   Rytme: Hero («Utleie på autopilot.») → denne («henger sammen med tjenestene
   du kjenner») → Produkt («se selve produktet»). Samme stein-bakgrunn som heroen,
   så den leses som heroens fot — ikke en ny seksjon.

   Ekstremt tilbakeholdt: én setning, én rad logoer i dempet ink. Ingen kort,
   ingen captions, ingen badges, ingen marquee. Ikke ordet «partnere».

   Logoene er offisielle vektorfiler (tett viewBox) og tegnes monokromt via
   CSS mask-image + currentColor — uavhengig av merkevarefargen i filen, og
   uten runtime-filter. Høyde settes per logo så x-/versalhøyde oppleves lik.
--------------------------------------------------------------------------- */

const LOGOER = [
  { id: 'finn', navn: 'FINN', src: '/v4/logo/finn.svg', ratio: 2.91, h: 15 },
  { id: 'bankid', navn: 'BankID', src: '/v4/logo/bankid.svg', ratio: 6.392, h: 19 },
  { id: 'vipps', navn: 'Vipps', src: '/v4/logo/vipps.svg', ratio: 3.835, h: 19 },
  { id: 'poweroffice', navn: 'PowerOffice', src: '/v4/logo/poweroffice.svg', ratio: 6.456, h: 17 },
  { id: 'keyhole', navn: 'Keyhole', src: '/v4/logo/keyhole.svg', ratio: 3.187, h: 25 },
  { id: 'airbnb', navn: 'Airbnb', src: '/v4/logo/airbnb.svg', ratio: 3.183, h: 23 },
  { id: 'booking', navn: 'Booking.com', src: '/v4/logo/booking.svg', ratio: 5.767, h: 18 },
];

function Logo({ navn, src, ratio, h }) {
  const mask = `url(${src})`;
  return (
    <span
      role="img"
      aria-label={navn}
      className="block shrink-0"
      style={{
        height: h,
        width: Math.round(h * ratio),
        background: 'currentColor',
        WebkitMaskImage: mask, maskImage: mask,
        WebkitMaskSize: 'contain', maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center', maskPosition: 'center',
      }}
    />
  );
}

export default function TillitStripe() {
  return (
    <section aria-label="Tjenester DigiHome er koblet til" className="relative" style={{ background: T.canvas, color: T.ink }} data-testid="v4-tillit">
      <div className="mx-auto max-w-[1760px] px-5 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-6 border-t py-9 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-10" style={{ borderColor: 'rgba(21,19,15,0.08)' }}>
          <p className="shrink-0 text-[15px] leading-none text-[#15130F]/60" data-testid="v4-tillit-tekst">Koblet til tjenestene du allerede bruker.</p>
          <ul className="flex flex-wrap items-center gap-x-8 gap-y-5 sm:gap-x-10 lg:gap-x-12 xl:gap-x-14" style={{ color: 'rgba(21,19,15,0.62)' }} data-testid="v4-tillit-logoer">
            {LOGOER.map((l) => (
              <li key={l.id} className="flex items-center" data-testid={`v4-logo-${l.id}`}>
                <Logo {...l} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
