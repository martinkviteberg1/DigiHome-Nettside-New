
import React from 'react';
import Reveal from '@/components/dh/Reveal';
import { Star } from 'lucide-react';

const testimonials = [
  { quote: 'DigiHome har økt inntekten vår med over 35% sammenlignet med vår forrige langtidsleie. Profesjonelt, enkelt og lønnsomt.', name: 'Maria S.', role: 'Eiendomseier, Nordnes, Bergen', initials: 'MS' },
  { quote: 'Jeg merker knapt at jeg eier en utleieeiendom lenger. Alt går på autopilot, og inntekten tikker inn hver måned.', name: 'Thomas K.', role: 'Eiendomseier, Sandviken, Bergen', initials: 'TK' },
  { quote: 'Transparensen er det som imponerer mest. Jeg ser nøyaktig hva som skjer, og teamet er alltid tilgjengelige når jeg trenger dem.', name: 'Ingrid L.', role: 'Eiendomseier, Møhlenpris, Bergen', initials: 'IL' },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal as="div" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-14">
          <div>
            <span className="inline-flex items-center gap-2 px-3.5 py-[7px] rounded-full bg-[#f5edfc] border border-[#e9d9fa] mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a765e0]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8b5fc0]">Kundehistorier</span>
            </span>
            <h2 className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
              Hva våre eiere sier
            </h2>
          </div>
          <div className="flex items-center gap-3 sm:pb-1.5">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-[#cf97fc] fill-[#cf97fc]" strokeWidth={0} />)}
            </div>
            <p className="text-[13px] text-[#888]"><span className="font-semibold text-[#0a0a0a]">4,9 av 5</span> fra eiendomseiere</p>
          </div>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-7">
          {testimonials.map((t: any, i: number) => (
            <Reveal as="div" key={t.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.1 }}
              className="group bg-white rounded-[20px] p-7 sm:p-8 border border-[#eeeae3] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-26px_rgba(20,10,40,0.2)] hover:border-[#e5d6f6] relative flex flex-col">
              <div className="flex items-center gap-0.5 mb-6">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-[15px] h-[15px] text-[#cf97fc] fill-[#cf97fc]" strokeWidth={0} />)}
              </div>
              <blockquote className="text-[16px] text-[#333] leading-[1.75] flex-1">
                &laquo;{t.quote}&raquo;
              </blockquote>
              <div className="flex items-center gap-3 mt-7 pt-6 border-t border-[#f0ece6]">
                <div className="w-10 h-10 rounded-full bg-[#f5edfc] flex items-center justify-center text-[12px] font-bold text-[#8b6aad]" style={{ fontFamily: 'var(--font-heading)' }}>{t.initials}</div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{t.name}</p>
                  <p className="text-[12px] text-[#aaa] mt-0.5">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
