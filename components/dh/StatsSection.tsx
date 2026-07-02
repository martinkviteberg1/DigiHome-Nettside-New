'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from '@/lib/motion-lite';

const stats = [
  { end: 30, suffix: '%', label: 'Høyere inntekt', sub: 'sammenlignet med tradisjonell utleie', prefix: '+' },
  { end: 150, suffix: '+', label: 'Boliger', sub: 'under aktiv forvaltning i Bergen', prefix: '' },
  { end: 98, suffix: '%', label: 'Tilfredshet', sub: 'blant våre eiendomseiere', prefix: '' },
];

function Counter({ end, prefix = '', suffix = '' }: any) {
  const [count, setCount] = useState(0);
  const ref = useRef<any>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true;
        const duration = 1200;
        const startTime = performance.now();
        const animate = (now: any) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.round(eased * end));
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return <span ref={ref}>{prefix}{count}{suffix}</span>;
}

export default function StatsSection() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
          className="flex items-center justify-between border-b border-[#eee] pb-6 mb-12">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#9b6cc4]">DigiHome i tall</p>
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
                <span className="w-5 h-[2px] rounded-full bg-[#cf97fc]" />
                <p className="text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{s.label}</p>
              </div>
              <p className="text-[13px] text-[#999] mt-1.5 leading-relaxed">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
