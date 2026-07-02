
import React from 'react';
import Reveal from '@/components/dh/Reveal';
import { Zap, BarChart3, Shield, Smartphone } from 'lucide-react';

const steps = [
  {
    num: '01',
    title: 'Dynamisk utleie',
    desc: 'Korttids- og langtidsutleie i én hybridmodell. Tilpasses automatisk etter sesong og etterspørsel.',
    icon: Zap,
  },
  {
    num: '02',
    title: 'Intelligent prising',
    desc: 'Prisalgoritmer overvåker markedet døgnet rundt og justerer for optimal avkastning.',
    icon: BarChart3,
  },
  {
    num: '03',
    title: 'Helhetlig drift',
    desc: 'Nøkler, rengjøring, gjestekommunikasjon og vedlikehold — alt håndtert av vårt team.',
    icon: Shield,
  },
  {
    num: '04',
    title: 'Leietakerportal',
    desc: 'Betaling, kommunikasjon og henvendelser samlet på én plattform.',
    icon: Smartphone,
  },
];

export default function HowItWorksSection() {
  return (
    <section className="py-24 sm:py-32" style={{ backgroundColor: '#fdfcfb' }} data-testid="how-it-works-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">

        {/* Header */}
        <div className="text-center mb-16">
          <Reveal as="div"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-2 px-3.5 py-[7px] rounded-full bg-[#f5edfc] border border-[#e9d9fa]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#a765e0]" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#8b5fc0]">Slik fungerer det</span>
            </span>
          </Reveal>
          <Reveal as="h2"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-[36px] sm:text-[46px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a] mb-5"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Fra henvendelse til utbetaling
          </Reveal>
          <Reveal as="p"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[16px] text-[#777] max-w-[440px] mx-auto leading-[1.75]"
          >
            Fire steg. Null stress. Vi håndterer alt — du nyter inntekten.
          </Reveal>
        </div>

        {/* Steps — premium cards with ghost numerals */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step: any, i: number) => {
            const Icon = step.icon;
            return (
              <Reveal as="div"
                key={step.num}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45, delay: i * 0.09 }}
                className="group relative bg-white rounded-[20px] border border-[#eeeae3] p-8 transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_50px_-24px_rgba(20,10,40,0.18)] hover:border-[#e5d6f6] overflow-hidden"
                data-testid={`how-step-${step.num}`}
              >
                {/* Ghost numeral */}
                <span
                  aria-hidden
                  className="absolute -top-3 right-5 text-[76px] font-bold leading-none select-none pointer-events-none text-[#f4eefb] group-hover:text-[#ecdff9] transition-colors duration-500"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {step.num}
                </span>

                {/* Icon */}
                <div className="relative w-12 h-12 rounded-2xl bg-[#f5edfc] group-hover:bg-[#0a0a0a] flex items-center justify-center mb-6 transition-colors duration-400">
                  <Icon className="w-5 h-5 text-[#a765e0] group-hover:text-[#cf97fc] transition-colors duration-400" strokeWidth={1.7} />
                </div>

                {/* Text */}
                <span className="text-[11px] font-semibold tracking-[0.18em] text-[#b98fe0]">
                  STEG {step.num}
                </span>
                <h3 className="text-[18px] font-bold text-[#0a0a0a] mt-2.5 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  {step.title}
                </h3>
                <p className="text-[14px] text-[#888] leading-[1.7]">
                  {step.desc}
                </p>

                {/* Accent underline on hover */}
                <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#cf97fc] to-[#9b6cc4] scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-500" />
              </Reveal>
            );
          })}
        </div>

      </div>
    </section>
  );
}
