'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   HvemSeksjon — «Hva DigiHome er.»

   Svarer på det en profesjonell kjøper lurer på før noe annet: er dette et
   programvarehus, en konkurrent, eller et byrå som selger sitt eget system?
   Tre påstander i display-skrift, én linje under hver. Ingen «AI», ingen
   «A til Å»; det viser resten av siden. Under: ett sitat fra produktsjefen,
   med bilde og navn. Det er det eneste stedet på siden et menneske snakker
   i første person.

   `tredje` kan overstyres per side (megler: «Nå er det deres», bedrift:
   «Nå driver det eiendomsselskaper»).
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.09)';
const DIM = 'rgba(21,19,15,0.62)';
const SVAK = 'rgba(21,19,15,0.46)';

const STANDARD = [
  { t: 'Vi er forvaltere', d: 'DigiHome forvalter boliger for egne kunder i Bergen – hver dag, med systemet dere ser på denne siden.' },
  { t: 'Vi bygde det selv', d: 'Fordi ingen leverte ett system som tok hele løpet fra henvendelse til årsoppgave: salg, kontrakt, husleie, saker, klientkonto og oppgjør.' },
  { t: 'Nå er det deres', d: 'Utleiemeglere og forvaltere får systemet, assistenten og rutinene. Dere beholder eierne, merkevaren og avgjørelsene.' },
];

const SITAT = {
  tekst: 'Vi lette etter ett system som tok hele løpet, fra første henvendelse til oppgjøret hos eieren. Det fantes ikke. Så vi bygde det selv – på egne boliger, med egne feil. Alt på denne siden er noe vi selv har trengt.',
  navn: 'Martin C. Kviteberg',
  tittel: 'Produktsjef, DigiHome',
  foto: '/v4/martin.webp',
  fotoLiten: '/v4/martin-320.webp',
};

export default function HvemSeksjon({ tredje = null, sitat = SITAT }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, 0.2);
  const inn = (i, y = 14) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 700ms ${EASE} ${i * 90}ms, transform 800ms ${EASE} ${i * 90}ms` });
  const punkter = tredje ? [STANDARD[0], STANDARD[1], tredje] : STANDARD;
  return (
    <section id="hvem" ref={ref} className="relative border-t" style={{ background: T.canvas, color: T.ink, borderColor: HAIR }} data-testid="v4m-hvem">
      <div className="mx-auto w-full max-w-[1360px] px-5 pb-20 pt-16 sm:px-8 lg:w-[calc(100%-128px)] lg:px-0 lg:pb-28 lg:pt-24">
        <p className="text-[14px] font-medium" style={{ color: SVAK, ...inn(0) }}>Hva DigiHome er</p>

        {/* Tre påstander */}
        <ol className="mt-8 grid gap-10 lg:grid-cols-3 lg:gap-12" data-testid="v4m-hvem-punkter">
          {punkter.map((p, i) => (
            <li key={p.t} className="border-t pt-6" style={{ borderColor: HAIR, ...inn(1 + i, 18) }}>
              <p className="text-[13px] tabular-nums" style={{ color: T.lilla }}>0{i + 1}</p>
              <h2 className="mt-4 text-[clamp(30px,2.6vw,42px)]" style={{ ...display, color: T.ink, lineHeight: 1.02 }}>
                {p.t}<span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>
              </h2>
              <p className="mt-4 max-w-[36ch] text-[16px] leading-[1.5]" style={{ color: DIM }}>{p.d}</p>
            </li>
          ))}
        </ol>

        {/* Sitatet */}
        <figure className="mt-16 grid gap-8 border-t pt-10 lg:mt-24 lg:grid-cols-12 lg:gap-12 lg:pt-14" style={{ borderColor: HAIR, ...inn(4, 20) }} data-testid="v4m-hvem-sitat">
          <div className="flex items-center gap-5 lg:col-span-4 lg:flex-col lg:items-start lg:gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sitat.foto}
              srcSet={`${sitat.fotoLiten} 320w, ${sitat.foto} 800w`}
              sizes="(min-width: 1024px) 168px, 88px"
              alt={sitat.navn}
              loading="lazy"
              decoding="async"
              className="h-[88px] w-[88px] shrink-0 rounded-[22px] object-cover lg:h-[168px] lg:w-[168px] lg:rounded-[28px]"
              style={{ boxShadow: '0 0 0 1px rgba(21,19,15,0.08), 0 30px 60px -40px rgba(21,19,15,0.4)' }}
            />
            <figcaption className="lg:hidden">
              <p className="text-[15px] font-medium" style={{ color: T.ink }}>{sitat.navn}</p>
              <p className="text-[13.5px]" style={{ color: SVAK }}>{sitat.tittel}</p>
            </figcaption>
          </div>
          <div className="lg:col-span-8">
            <blockquote className="relative">
              <span aria-hidden="true" className="absolute -left-1 -top-3 select-none text-[64px] leading-none lg:-left-2 lg:-top-5 lg:text-[96px]" style={{ ...display, color: T.lilla, opacity: 0.9 }}>«</span>
              <p className="pl-9 text-[clamp(22px,2.1vw,34px)] leading-[1.32] lg:pl-14" style={{ ...display, color: T.ink, letterSpacing: '-0.01em' }}>{sitat.tekst}</p>
            </blockquote>
            <figcaption className="mt-7 hidden pl-14 lg:block">
              <p className="text-[15.5px] font-medium" style={{ color: T.ink }}>{sitat.navn}</p>
              <p className="text-[14px]" style={{ color: SVAK }}>{sitat.tittel}</p>
            </figcaption>
          </div>
        </figure>
      </div>
    </section>
  );
}
