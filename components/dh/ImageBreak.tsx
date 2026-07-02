
import React from 'react';
import Reveal from '@/components/dh/Reveal';

export default function ImageBreak() {
  return (
    <section className="pb-24 sm:pb-28" style={{ backgroundColor: '#fdfcfb' }}>
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <Reveal as="div"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className="rounded-[28px] overflow-hidden relative"
        >
          <div className="overflow-hidden h-[300px] sm:h-[400px] lg:h-[460px]">
            <img
              src="/bergen-harbor.webp"
              alt="Bergen ved solnedgang"
              width={1400}
              height={460}
              className="w-full h-full object-cover object-center animate-kenburns"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/15 to-transparent" />
          <div className="absolute bottom-7 left-7 sm:bottom-12 sm:left-12 right-7 sm:right-12">
            <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">DigiHome · Bergen</p>
            <p className="text-white text-[26px] sm:text-[38px] lg:text-[46px] font-bold tracking-[-0.03em] leading-[1.08]" style={{ fontFamily: 'var(--font-heading)' }}>
              Mer enn forvaltning.<br/>En partner for eiendommen din.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
