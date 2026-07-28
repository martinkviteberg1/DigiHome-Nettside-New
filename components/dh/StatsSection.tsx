'use client';

import Link from 'next/link';
import React from 'react';
import { motion } from '@/lib/motion-lite';

const stats = [
  { end: 30, suffix: '%', label: 'Høyere inntekt', sub: 'sammenlignet med tradisjonell utleie', prefix: '+' },
  { end: 150, suffix: '+', label: 'Boliger', sub: 'under aktiv forvaltning i Bergen', prefix: '' },
  { end: 24, suffix: ' t', label: 'Svartid', sub: 'på nye henvendelser', prefix: '' },
];

function Counter({ end, prefix = '', suffix = '' }: any) {
  // Server-render den faktiske verdien. Tidligere SSR-et vi 0 og lot klienten
  // telle opp, noe som ga Google/AI-crawlere +0 %, 0+ og 0 %.
  return <span>{prefix}{end}{suffix}</span>;
}

export default function StatsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="flex items-center justify-between border-b border-[#eee] pb-6 mb-12">
          <span className="inline-flex items-center gap-3">
            <span className="w-7 h-[2px] rounded-full bg-[#d298ff]" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f8a80]">DigiHome i tall</span>
          </span>
          <p className="text-[12px] text-[#bbb] hidden sm:block">Bergen · Oppdatert 2026</p>
        </motion.div>
        <div className="grid sm:grid-cols-3 gap-12 sm:gap-6">
          {stats.map((s: any, i: number) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`relative ${i > 0 ? 'sm:border-l sm:border-[#eee] sm:pl-10' : ''}`}>
              <p className="text-[56px] sm:text-[64px] lg:text-[72px] font-bold text-[#0a0a0a] leading-none tracking-[-0.045em]" style={{ fontFamily: 'var(--font-heading)' }}>
                <Counter end={s.end} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <div className="flex items-center gap-2.5 mt-4">
                <span className="w-5 h-[2px] rounded-full bg-[#d298ff]" />
                <p className="text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{s.label}</p>
              </div>
              <p className="text-[13px] text-[#716b63] mt-1.5 leading-relaxed">{s.sub}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-10 border-t border-[#eee] pt-5 text-center"><Link href="/metode" className="text-[12.5px] font-semibold text-[#625d57] underline decoration-[#c9c1b8] underline-offset-4 hover:text-[#7c3aed]">Slik beregner og dokumenterer vi tallene</Link></div>
      </div>
    </section>
  );
}
