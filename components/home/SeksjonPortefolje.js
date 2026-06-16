import Image from 'next/image';
import { MapPin, BedDouble, Maximize } from 'lucide-react';
import { Reveal } from '@/components/site/Reveal';

/*
  Seksjon 6 (/2) — «Boliger folk vil bo i.»
  Lyst. Rolig overskrift + tre hårfine kvalitetsmerker, deretter tre eiendomskort
  med ekte interiørfoto. Bildene bærer seksjonen — minimalt med chrome.
*/

const Eyebrow = ({ children }) => (
  <p className="font-body font-semibold uppercase text-[11px] tracking-[0.28em] text-taupe">{children}</p>
);

const CRITERIA = ['Profesjonelt innredet og fotografert', 'Nøye vedlikeholdt mellom hver leietaker', 'Strategisk beliggenhet i Bergen'];

const HOMES = [
  { area: 'Nordnes, Bergen', beds: '3 sov', size: '68 m²', price: '22 500 kr/mnd', type: 'Hybridutleie', image: '/interior-openplan.webp' },
  { area: 'Sandviken, Bergen', beds: '2 sov', size: '52 m²', price: '18 000 kr/mnd', type: 'Korttidsutleie', image: '/interior-kitchen2.webp' },
  { area: 'Sentrum, Bergen', beds: '3 sov', size: '95 m²', price: '26 500 kr/mnd', type: 'Hybridutleie', image: '/interior-living.webp' },
];

export function SeksjonPortefolje() {
  return (
    <section className="relative overflow-hidden bg-[#FEFBFA] text-ink">
      <div className="relative max-w-shell mx-auto px-6 sm:px-10 lg:px-16 py-24 sm:py-28 lg:py-32">
        <div className="max-w-2xl">
          <Reveal><Eyebrow>Porteføljen</Eyebrow></Reveal>
          <Reveal as="h2" delay={0.05} className="mt-5 font-heading font-bold tracking-[-0.035em] leading-[1.04] text-[clamp(30px,4.4vw,54px)] text-ink">
            Boliger folk <span className="dh-ink-shine">vil bo i.</span>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-[18px] leading-relaxed text-quiet max-w-xl">
              Vi er selektive. Hver bolig møter våre krav til standard, innredning og beliggenhet — det gir bedre leietakere og høyere avkastning.
            </p>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="mt-7 flex flex-wrap gap-x-7 gap-y-2.5">
              {CRITERIA.map((c) => (
                <span key={c} className="inline-flex items-center gap-2 text-[14px] text-ink/80">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#9B5BD6' }} />
                  {c}
                </span>
              ))}
            </div>
          </Reveal>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-5 lg:gap-6">
          {HOMES.map((h, i) => (
            <Reveal key={h.area} delay={i * 0.08}>
              <article className="group rounded-[20px] overflow-hidden bg-white transition-all duration-500 hover:-translate-y-1.5" style={{ border: '1px solid rgba(22,18,31,0.06)', boxShadow: '0 2px 4px rgba(22,18,31,0.03)' }}>
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image src={h.image} alt={`Bolig i ${h.area}`} fill className="object-cover transition-transform duration-1000 ease-out group-hover:scale-105" sizes="(max-width:768px) 100vw, 33vw" />
                  <span className="absolute top-4 left-4 rounded-full bg-white/92 backdrop-blur px-3 py-1 text-[11.5px] font-semibold text-ink">{h.type}</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-1.5 text-taupe">
                    <MapPin className="h-4 w-4" strokeWidth={1.8} />
                    <span className="text-[13.5px] font-medium">{h.area}</span>
                  </div>
                  <div className="mt-3.5 flex items-center gap-5 text-[13.5px] text-quiet">
                    <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4" strokeWidth={1.8} />{h.beds}</span>
                    <span className="inline-flex items-center gap-1.5"><Maximize className="h-4 w-4" strokeWidth={1.8} />{h.size}</span>
                  </div>
                  <p className="mt-5 font-heading font-bold tracking-[-0.02em] text-[22px] text-ink">{h.price}</p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
