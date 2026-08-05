import React from 'react';
import Image from 'next/image';

// ---------------------------------------------------------------------------
// Herobilder — to motiver, forskjøvet.
//
// Ingen bento, ingen flytende hvite kort med avkrysningslister. Det er nettopp
// slike pålimte flater som får en side til å se maskinlaget ut. Her bærer to
// bilder komposisjonen: ett høyt hovedmotiv og ett smalere som ligger lavere,
// slik at rytmen blir redaksjonell i stedet for symmetrisk. Radiene er stramme
// (14–18 px), ingen rammer, ingen tunge skygger.
// ---------------------------------------------------------------------------

const HOVED = '/interior-openplan-hero.webp';
const SIDE = '/bergen-houses.webp';

export default function HeroMedia() {
  return (
    <div className="dh-fade-up" style={{ animationDelay: '0.3s' }} data-testid="hero-media">
      {/* Mobil: ett motiv i full bredde. To små bilder ved siden av hverandre
          blir bare frimerker på 400 px. */}
      <div className="group relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#f0ece6] sm:aspect-[4/5] sm:rounded-[20px]">
        <Image
          src={HOVED}
          alt="Utleiebolig i Bergen klargjort av DigiHome"
          fill
          priority
          unoptimized
          sizes="(min-width: 1024px) 46vw, 100vw"
          className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
        />
      </div>

      {/* Innfelt motiv som bryter kanten og legger seg i mellomrommet mellom
          spaltene. Dybde uten dekor — og bare der det faktisk er plass. */}
      <div className="absolute -left-16 bottom-16 hidden w-[196px] overflow-hidden rounded-[14px] shadow-[0_34px_72px_-36px_rgba(28,22,14,0.6)] xl:block">
        <div className="relative aspect-[3/4]">
          <Image src={SIDE} alt="Bolighus i Bergen" fill sizes="200px" className="object-cover" />
        </div>
      </div>

      <p className="e-meta mt-4 hidden">Fra porteføljen i Bergen</p>
    </div>
  );
}
