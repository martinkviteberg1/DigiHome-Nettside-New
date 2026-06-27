'use client';

import React from 'react';
import { motion } from '@/lib/motion-lite';
import { Check } from 'lucide-react';

const benefits = [
  { title: 'Ingen oppstartskostnader', desc: 'Ingen binding, ingen risiko. Du betaler kun når du faktisk tjener penger på eiendommen din.' },
  { title: 'Høyere inntekt', desc: 'Vår hybridmodell gir opptil 30% høyere avkastning enn tradisjonell langtidsutleie.' },
  { title: 'Full transparens', desc: 'Sanntidsrapporter og inntektsoversikt. Du har alltid full innsikt i eiendommen din.' },
  { title: 'Dedikert forvaltning', desc: 'Et personlig team som kjenner eiendommen din og behandler den som sin egen.' },
];

export default function WhyChooseUsSection() {
  return (
    <section className="py-24 sm:py-32 bg-white" data-testid="why-us-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
            className="order-2 lg:order-1">
            <div className="rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <img src="/bryggen-alley.webp" alt="Bryggen smau i Bergen" className="w-full aspect-[4/3] object-cover" loading="lazy" />
            </div>
          </motion.div>
          <div className="order-1 lg:order-2">
            <motion.h2 initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.5 }}
              className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
              Hvorfor eiere velger DigiHome
            </motion.h2>
            <div className="mt-10 space-y-7">
              {benefits.map((b: any, i: number) => (
                <motion.div key={b.title} data-testid="why-us-benefit-item" initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.35, delay: i * 0.07 }}
                  className="flex gap-4">
                  <div className="w-6 h-6 rounded-full bg-[#f3eafc] flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-[#cf97fc]" strokeWidth={3} />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{b.title}</h3>
                    <p className="text-[14px] text-[#888] leading-[1.7] mt-0.5">{b.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
