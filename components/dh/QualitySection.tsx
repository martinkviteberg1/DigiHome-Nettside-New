'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export default function QualitySection() {
  return (
    <section className="py-24 sm:py-28 bg-white" data-testid="quality-section">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Text */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-[#f5edfc] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#cf97fc]" />
              </div>
              <span className="text-[11px] font-semibold text-[#cf97fc] uppercase tracking-[0.1em]">Vår standard</span>
            </div>
            <h2 className="text-[34px] sm:text-[42px] font-bold tracking-[-0.03em] leading-[1.08] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
              Kun høykvalitets&shy;boliger
            </h2>
            <p className="text-[15px] text-[#777] leading-[1.75] mt-5 max-w-[44ch]">
              Vi er selektive. Hver eiendom i DigiHome-porteføljen møter våre strenge krav til standard, innredning og beliggenhet. Det sikrer premium leietakere og høyere avkastning.
            </p>
            <div className="mt-8 space-y-4">
              {[
                'Profesjonelt innredet og fotografert',
                'Nøye vedlikeholdt mellom hver leietaker',
                'Strategisk beliggenhet i Bergen',
              ].map((text: any, i: number) => (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.08, duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#cf97fc] shrink-0" />
                  <span className="text-[14px] text-[#555]">{text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Image bento grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="rounded-[16px] overflow-hidden">
                  <img src="/interior-openplan.webp" alt="Stue" className="w-full aspect-[4/5] object-cover" loading="lazy" />
                </div>
                <div className="rounded-[16px] overflow-hidden">
                  <img src="/interior-kitchen.webp" alt="Kjøkken" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                </div>
              </div>
              <div className="space-y-3 pt-8">
                <div className="rounded-[16px] overflow-hidden">
                  <img src="/interior-dining.webp" alt="Spisestue" className="w-full aspect-[4/3] object-cover" loading="lazy" />
                </div>
                <div className="rounded-[16px] overflow-hidden">
                  <img src="/interior-living.webp" alt="Stue" className="w-full aspect-[4/5] object-cover" loading="lazy" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

      </div>
    </section>
  );
}
