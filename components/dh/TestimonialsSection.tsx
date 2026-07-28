
import React from 'react';
import Reveal from '@/components/dh/Reveal';
import Link from 'next/link';

const testimonials = [
  { quote: 'DigiHome har økt inntekten vår med over 35% sammenlignet med vår forrige langtidsleie. Profesjonelt, enkelt og lønnsomt.', name: 'Maria S.', role: 'Eiendomseier, Nordnes, Bergen', initials: 'MS' },
  { quote: 'Jeg merker knapt at jeg eier en utleieeiendom lenger. Alt går på autopilot, og inntekten tikker inn hver måned.', name: 'Thomas K.', role: 'Eiendomseier, Sandviken, Bergen', initials: 'TK' },
  { quote: 'Transparensen er det som imponerer mest. Jeg ser nøyaktig hva som skjer, og teamet er alltid tilgjengelige når jeg trenger dem.', name: 'Ingrid L.', role: 'Eiendomseier, Møhlenpris, Bergen', initials: 'IL' },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #faf7fe 0%, #f6f1fc 100%)' }}>
      {/* Menneske-kapitlet: sidens ene lavendel-tonede sone — sosialt bevis med egen kapittelfarge */}
      <div aria-hidden className="pointer-events-none absolute -top-40 left-[12%] w-[680px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(207,151,252,0.12) 0%, transparent 65%)' }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 right-[6%] w-[560px] h-[480px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, transparent 60%)' }} />
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 relative">
        <Reveal as="div" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5 mb-14">
          <div>
            <span className="inline-flex items-center gap-3 mb-5">
              <span className="w-7 h-[2px] rounded-full bg-[#d298ff]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">Kundehistorier</span>
            </span>
            <h2 className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
              Hva våre eiere sier
            </h2>
          </div>
          <div className="sm:pb-1.5"><Link href="/metode" className="text-[12.5px] font-semibold text-[#625d57] underline decoration-[#c9c1b8] underline-offset-4 hover:text-[#7c3aed]">Metode og dokumentasjon</Link></div>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-7">
          {testimonials.map((t: any, i: number) => (
            <Reveal as="div" key={t.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.1 }}
              className="group bg-white rounded-[20px] p-7 sm:p-8 border border-[#e9e1f4] shadow-[0_6px_24px_-16px_rgba(90,50,150,0.12)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-26px_rgba(90,50,150,0.28)] hover:border-[#d8c7ee] relative flex flex-col">
              <div className="mb-6 h-px w-10 bg-[#d298ff]" aria-hidden />
              <blockquote className="text-[16px] text-[#333] leading-[1.75] flex-1">
                &laquo;{t.quote}&raquo;
              </blockquote>
              <div className="flex items-center gap-3 mt-7 pt-6 border-t border-[#f0ece6]">
                <div className="w-10 h-10 rounded-full bg-[#f2f0eb] flex items-center justify-center text-[12px] font-bold text-[#5a564d]" style={{ fontFamily: 'var(--font-heading)' }}>{t.initials}</div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{t.name}</p>
                  <p className="text-[12px] text-[#78726a] mt-0.5">{t.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
