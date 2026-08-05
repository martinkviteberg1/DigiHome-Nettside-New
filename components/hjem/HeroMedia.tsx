import React from 'react';
import Image from 'next/image';
import { Check } from 'lucide-react';

// ---------------------------------------------------------------------------
// Herobilder — mykt avrundet bento, ikke firkantet fullbredde-plakat.
//
// Retningen er DigiHomes egen: varme boligflater med romslige radier, tydelig
// dybde og én liten produktflate som ligger delvis oppå bildet. Kortet viser
// hva som faktisk skjer i systemet — annonse, kontrakt, husleie — og aldri en
// pris eller et løfte vi ikke kjenner. LCP-bildet er det samme filen bruker på
// mobil og desktop, slik at det bare lastes én gang.
// ---------------------------------------------------------------------------

const HOVED = '/interior-openplan-hero.webp';
const SIDE_TOPP = '/bergen-houses.webp';
const SIDE_BUNN = '/interior-living.webp';

const steg = [
  'Annonse publisert på FINN',
  'Kontrakt signert med BankID',
  'Depositum og husleie i drift',
];

function Produktkort({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[22px] border border-white/70 bg-white/95 p-4 backdrop-blur-xl shadow-[0_22px_54px_-22px_rgba(28,22,14,0.38)] ${className}`}
      data-testid="hero-produktkort"
    >
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.15em] text-[#8d877d]">Automatisk i plattformen</p>
      <ul className="mt-2.5 space-y-[9px]">
        {steg.map((s) => (
          <li key={s} className="flex items-center gap-2.5">
            <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full bg-[#eaf3ed]">
              <Check className="h-[11px] w-[11px] text-[#2f7d54]" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="text-[12.5px] font-medium leading-snug text-[#25221e]">{s}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HeroMedia() {
  return (
    <div className="dh-fade-up" style={{ animationDelay: '0.3s' }} data-testid="hero-media">
      {/* Mobil: ett helt motiv, mykt avrundet, med produktflaten liggende oppå
          nedre kant slik at komposisjonen får dybde uten å bli trang. */}
      <div className="relative sm:hidden">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[24px] bg-[#f0ece6] ring-1 ring-[rgba(10,10,10,0.06)] shadow-[0_26px_60px_-32px_rgba(28,22,14,0.45)]">
          <Image
            src={HOVED}
            alt="Utleiebolig i Bergen klargjort av DigiHome"
            fill
            priority
            unoptimized
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" aria-hidden="true" />
        </div>
        <Produktkort className="relative -mt-9 mx-3" />
      </div>

      {/* Fra sm: bento med ett stort motiv og to mindre. Radiene er romslige,
          skyggene varme, og bevegelsen begrenset til en rolig hover-zoom. */}
      <div className="relative hidden sm:block">
        <div className="grid h-[440px] grid-cols-5 grid-rows-2 gap-3.5 lg:h-[532px] xl:h-[580px]">
          <div className="group relative col-span-3 row-span-2 overflow-hidden rounded-[28px] bg-[#f0ece6] ring-1 ring-[rgba(10,10,10,0.06)] shadow-[0_34px_74px_-38px_rgba(28,22,14,0.46)]">
            <Image
              src={HOVED}
              alt="Utleiebolig i Bergen klargjort av DigiHome"
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 32vw, 52vw"
              className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.035]"
            />
          </div>
          <div className="group relative col-span-2 overflow-hidden rounded-[24px] bg-[#f0ece6] ring-1 ring-[rgba(10,10,10,0.06)] shadow-[0_24px_54px_-30px_rgba(28,22,14,0.38)]">
            <Image
              src={SIDE_TOPP}
              alt="Bolighus i Bergen"
              fill
              sizes="(min-width: 1024px) 22vw, 35vw"
              className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.035]"
            />
          </div>
          <div className="group relative col-span-2 overflow-hidden rounded-[24px] bg-[#f0ece6] ring-1 ring-[rgba(10,10,10,0.06)] shadow-[0_24px_54px_-30px_rgba(28,22,14,0.38)]">
            <Image
              src={SIDE_BUNN}
              alt="Stue i utleiebolig"
              fill
              sizes="(min-width: 1024px) 22vw, 35vw"
              className="object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.035]"
            />
          </div>
        </div>
        <Produktkort className="absolute bottom-5 left-5 w-[236px] lg:w-[262px]" />
      </div>

      <p className="e-meta mt-3.5 text-right">Fra porteføljen i Bergen</p>
    </div>
  );
}
