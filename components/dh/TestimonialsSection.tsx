'use client';

import React from 'react';
import { motion } from '@/lib/motion-lite';
import { Quote } from 'lucide-react';

const testimonials = [
  { quote: 'DigiHome har økt inntekten vår med over 35% sammenlignet med vår forrige langtidsleie. Profesjonelt, enkelt og lønnsomt.', name: 'Maria S.', role: 'Eiendomseier, Nordnes, Bergen', initials: 'MS' },
  { quote: 'Jeg merker knapt at jeg eier en utleieeiendom lenger. Alt går på autopilot, og inntekten tikker inn hver måned.', name: 'Thomas K.', role: 'Eiendomseier, Sandviken, Bergen', initials: 'TK' },
  { quote: 'Transparensen er det som imponerer mest. Jeg ser nøyaktig hva som skjer, og teamet er alltid tilgjengelige når jeg trenger dem.', name: 'Ingrid L.', role: 'Eiendomseier, Møhlenpris, Bergen', initials: 'IL' },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 sm:py-32 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
          className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-14" style={{ fontFamily: 'var(--font-heading)' }}>
          Hva våre eiere sier
        </motion.h2>
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t: any, i: number) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: i * 0.1 }}
              className="bg-[#fafafa] rounded-2xl p-7 sm:p-8 hover:bg-[#f5f3f0] transition-colors duration-500 relative">
              <Quote className="w-8 h-8 text-[#e8dff0] mb-5" strokeWidth={1.5} />
              <blockquote className="text-[16px] text-[#333] leading-[1.7]">
                {t.quote}
              </blockquote>
              <div className="flex items-center gap-3 mt-7 pt-6 border-t border-[#eee]">
                <div className="w-10 h-10 rounded-full bg-[#f0ebf5] flex items-center justify-center text-[12px] font-bold text-[#8b6aad]" style={{ fontFamily: 'var(--font-heading)' }}>{t.initials}</div>
                <div>
                  <p className="text-[14px] font-semibold text-[#0a0a0a]">{t.name}</p>
                  <p className="text-[12px] text-[#aaa]">{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
