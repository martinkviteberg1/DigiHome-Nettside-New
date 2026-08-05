import React from 'react';
import Image from 'next/image';
import { Seksjon, SeksjonHode } from './Seksjon';
import { qualities, qualityGallery } from '@/lib/site';

// Bildene får plass til å være bilder. Fire motiver i et rutenett med ulike
// høyde-/breddeforhold gir rytme uten at noe må animeres, og erstatter både
// den gamle ken-burns-stripen og kvalitetsseksjonen med tre ikonkort.
const oppsett = [
  'lg:col-span-7 aspect-[4/3]',
  'lg:col-span-5 aspect-[4/3]',
  'lg:col-span-5 aspect-[1/1]',
  'lg:col-span-7 aspect-[16/10]',
];

export default function Boligene() {
  return (
    <Seksjon testId="quality-section" tone="hvit">
      <SeksjonHode
        indeks="05"
        label="Standarden"
        tittel="Standarden er en del av avkastningen."
        ingress="En bolig som er godt presentert og godt vedlikeholdt får flere søkere — og gjør det enklere å velge riktig leietaker."
      />

      {/* Fast radhøyde fra lg: uten den får bilder med ulik bredde ulik høyde,
          og rutenettet blir stående med hull under de smaleste. */}
      <div className="mt-12 sm:mt-16 grid grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 lg:auto-rows-[clamp(300px,26vw,430px)]">
        {qualityGallery.slice(0, 4).map((src: string, i: number) => (
          <div key={src} className={`e-frame e-reveal relative aspect-[4/5] lg:aspect-auto lg:h-full ${oppsett[i]}`}>
            <Image
              src={src}
              alt="Interiør fra en utleiebolig DigiHome forvalter i Bergen"
              fill
              sizes="(max-width: 1023px) 50vw, 45vw"
              className="object-cover"
            />
          </div>
        ))}
      </div>

    </Seksjon>
  );
}
