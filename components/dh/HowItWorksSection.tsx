'use client';

import React from 'react';
import { motion } from 'framer-motion';
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
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="text-[13px] font-semibold uppercase tracking-[0.15em] mb-3"
            style={{ color: '#AE68E4' }}
          >
            Slik fungerer det
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
            className="text-[36px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.1] text-[#222] mb-4"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Fra henvendelse til utbetaling
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-[16px] text-[#888] max-w-[440px] mx-auto leading-relaxed"
          >
            Fire steg. Null stress. Vi håndterer alt — du nyter inntekten.
          </motion.p>
        </div>

        {/* Steps — clean cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step: any, i: number) => {
            const Icon = step.icon;
            return (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="group p-7 rounded-2xl transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)]"
                style={{ backgroundColor: '#F2F1F0' }}
                data-testid={`how-step-${step.num}`}
              >
                {/* Number */}
                <span className="text-[11px] font-bold tracking-[0.15em] transition-colors duration-300" style={{ color: '#D298FF', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  STEG {step.num}
                </span>

                {/* Icon */}
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mt-4 mb-5 transition-colors duration-300" style={{ backgroundColor: '#f3ebff' }}>
                  <Icon className="w-5 h-5 transition-colors duration-300" style={{ color: '#AE68E4' }} strokeWidth={1.5} />
                </div>

                {/* Text */}
                <h3 className="text-[17px] font-bold text-[#222] mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {step.title}
                </h3>
                <p className="text-[14px] text-[#888] leading-[1.65]">
                  {step.desc}
                </p>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
