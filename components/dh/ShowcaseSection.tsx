
import React from 'react';
import Reveal from '@/components/dh/Reveal';
import { MapPin } from 'lucide-react';

const properties = [
  { image: '/showcase-1.webp', location: 'Nordnes, Bergen', type: '3 sov · 68 m²', income: '22 500', tag: 'Hybridutleie' },
  { image: '/interior-kitchen2.webp', location: 'Sandviken, Bergen', type: '2 sov · 52 m²', income: '18 000', tag: 'Korttidsutleie' },
  { image: '/showcase-apartment.webp', location: 'Sentrum, Bergen', type: '3 sov · 95 m²', income: '26 500', tag: 'Hybridutleie' },
];

export default function ShowcaseSection() {
  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal as="div" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-14">
          <h2 className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Noen av våre eiendommer</h2>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {properties.map((p: any, i: number) => (
            <Reveal as="div" key={p.location} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.1 }}
              className="group cursor-pointer">
              <div className="rounded-2xl overflow-hidden mb-4 relative">
                <img src={p.image} alt={p.location} className="w-full aspect-[5/4] object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out" loading="lazy" />
                <div className="absolute top-3 left-3"><span className="bg-white/90 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[11px] font-medium text-[#555]">{p.tag}</span></div>
              </div>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#ccc]" /><h3 className="text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{p.location}</h3></div>
                  <p className="text-[12px] text-[#aaa] mt-1 ml-5">{p.type}</p>
                </div>
                <div className="text-right shrink-0 ml-4"><p className="text-[16px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{p.income}</p><p className="text-[11px] text-[#737373]">kr/mnd</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
