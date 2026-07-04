
import React from 'react';
import Reveal from '@/components/dh/Reveal';

// Redaksjonelt, minimalistisk prosess-grid — ingen kort, chips eller dekor.
// Hairline-linjer + små numeraler i ink. Lilla brukes ikke her (kun logo/CTA).
const steps = [
  {
    num: '01',
    title: 'Dynamisk utleie',
    desc: 'Korttids- og langtidsutleie i én hybridmodell. Tilpasses automatisk etter sesong og etterspørsel.',
  },
  {
    num: '02',
    title: 'Intelligent prising',
    desc: 'Prisalgoritmer overvåker markedet døgnet rundt og justerer for optimal avkastning.',
  },
  {
    num: '03',
    title: 'Helhetlig drift',
    desc: 'Nøkler, rengjøring, gjestekommunikasjon og vedlikehold — alt håndtert av vårt team.',
  },
  {
    num: '04',
    title: 'Leietakerportal',
    desc: 'Betaling, kommunikasjon og henvendelser samlet på én plattform.',
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: '#fdfcfb' }} data-testid="how-it-works-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">

        {/* Header — venstrestilt, redaksjonelt */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-16 sm:mb-20">
          <div>
            <Reveal as="div"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="mb-5"
            >
              <span className="inline-flex items-center gap-3">
                <span className="w-7 h-[2px] rounded-full bg-[#d298ff]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">Slik fungerer det</span>
              </span>
            </Reveal>
            <Reveal as="h2"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.5 }}
              className="text-[36px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Fra henvendelse<br className="hidden sm:block" /> til utbetaling
            </Reveal>
          </div>
          <Reveal as="p"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[15.5px] text-[#8a857c] max-w-[300px] leading-[1.75] sm:text-right sm:pb-1.5"
          >
            Fire steg. Null stress. Vi håndterer alt — du nyter inntekten.
          </Reveal>
        </div>

        {/* Steg — hairline-kolonner, stille hover */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-12">
          {steps.map((step, i) => (
            <Reveal as="div"
              key={step.num}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="group border-t border-[#e3dfd6] pt-7 transition-colors duration-500 hover:border-[#d298ff]"
              data-testid={`how-step-${step.num}`}
            >
              <span className="block text-[13px] font-semibold text-[#b3ada1] tabular-nums transition-colors duration-500 group-hover:text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                {step.num}
              </span>
              <h3 className="text-[19px] font-bold text-[#0a0a0a] mt-5 mb-2.5 tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>
                {step.title}
              </h3>
              <p className="text-[14.5px] text-[#8a857c] leading-[1.75]">
                {step.desc}
              </p>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
