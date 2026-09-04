'use client';

import React from 'react';
import { T } from './motion';

/* ---------------------------------------------------------------------------
   TillitStripe — lav «trust bridge» mellom heroen og produktseksjonen.

   Rytme: Hero («Utleie på autopilot.») → denne («henger sammen med tjenestene
   du kjenner») → Produkt («se selve produktet»). Egen svak tonal flate (ett hakk
   mot heroens stein), sentrert setning over logoene, ingen harde linjer, og
   64 px luft før seksjon 2 — et bevisst trust-moment, ikke en footer-linje.

   Ekstremt tilbakeholdt: én setning, én rad logoer i dempet ink (78 %). Ingen
   kort, ingen captions, ingen badges, ingen marquee. Ikke ordet «partnere».

   Logoene er offisielle vektorfiler (tett viewBox) og tegnes monokromt via
   CSS mask-image + currentColor — uavhengig av merkevarefargen i filen, og
   uten runtime-filter. Høyde settes per logo så x-/versalhøyde oppleves lik.
--------------------------------------------------------------------------- */

/* Seks navn, ikke sju–åtte: FINN · BankID · Vipps · PowerOffice · Keyhole + Airbnb.
   Booking.com ligger klar i /v4/logo/booking.svg (ratio 5.767) om utvalget skal byttes. */
const LOGOER = [
  { id: 'finn', navn: 'FINN', src: '/v4/logo/finn.svg', ratio: 2.91, h: 18 },
  { id: 'bankid', navn: 'BankID', src: '/v4/logo/bankid.svg', ratio: 6.392, h: 22 },
  { id: 'vipps', navn: 'Vipps', src: '/v4/logo/vipps.svg', ratio: 3.835, h: 22, dy: 3 },
  { id: 'poweroffice', navn: 'PowerOffice', src: '/v4/logo/poweroffice.svg', ratio: 6.456, h: 20 },
  { id: 'keyhole', navn: 'Keyhole', src: '/v4/logo/keyhole.svg', ratio: 3.187, h: 29 },
  { id: 'airbnb', navn: 'Airbnb', src: '/v4/logo/airbnb.svg', ratio: 3.183, h: 27 },
];

/* Egen svak tonal flate — ett hakk mot heroens stein (#F3F1EC), ingen harde linjer. */
const FLATE = '#EEEBE4';

function Logo({ navn, src, ratio, h, dy = 0 }) {
  const mask = `url(${src})`;
  return (
    <span
      role="img"
      aria-label={navn}
      className="block shrink-0"
      style={{
        height: h,
        width: Math.round(h * ratio),
        transform: dy ? `translateY(${dy}px)` : undefined,   // optisk justering (descendere o.l.)
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
      {/* Trust-momentet: sentrert setning over logoene, på egen tonal flate. */}
      <div style={{ background: FLATE }}>
        <div className="mx-auto flex max-w-[1760px] flex-col items-center px-5 py-14 text-center sm:px-8 lg:px-10 lg:py-16">
          <p className="text-[15px] leading-none text-[#15130F]/64 sm:text-[16px]" data-testid="v4-tillit-tekst">Koblet til tjenestene du allerede bruker.</p>
          <ul className="mt-9 flex max-w-[1100px] flex-wrap items-center justify-center gap-x-9 gap-y-6 sm:gap-x-12 lg:mt-10 lg:gap-x-14 xl:gap-x-16" style={{ color: 'rgba(21,19,15,0.78)' }} data-testid="v4-tillit-logoer">
            {LOGOER.map((l) => (
              <li key={l.id} className="flex items-center" data-testid={`v4-logo-${l.id}`}>
                <Logo {...l} />
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Luft før seksjon 2 — stripen får bli ferdig før neste dramaturgi begynner. */}
      <div aria-hidden="true" className="h-12 lg:h-16" style={{ background: T.canvas }} />
    </section>
  );
}
