'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const stats = [
  { end: 30, suffix: '%', label: 'Høyere inntekt', sub: 'sammenlignet med tradisjonell utleie', prefix: '+' },
  { end: 30, suffix: '+', label: 'Eiendommer', sub: 'under aktiv forvaltning i Bergen', prefix: '' },
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
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <div className="grid sm:grid-cols-3 gap-10 lg:gap-6 text-center">
          {stats.map((s: any, i: number) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }} transition={{ duration: 0.5, delay: i * 0.12 }}
              className={`${i < stats.length - 1 ? 'sm:border-r sm:border-[#eee]' : ''}`}>
              <p className="text-[48px] sm:text-[56px] font-bold text-[#0a0a0a] leading-none tracking-[-0.04em]" style={{ fontFamily: 'var(--font-heading)' }}>
                <Counter end={s.end} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="text-[15px] font-semibold text-[#0a0a0a] mt-3" style={{ fontFamily: 'var(--font-heading)' }}>{s.label}</p>
              <p className="text-[13px] text-[#aaa] mt-1 leading-relaxed">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
