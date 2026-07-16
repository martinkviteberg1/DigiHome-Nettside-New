
import React from 'react';
import Reveal from '@/components/dh/Reveal';

export default function ImageBreak() {
  return (
    <section className="pb-0" style={{ backgroundColor: '#fdfcfb' }}>
      {/* Full-bleed: sidens ene bevisste brudd på 1400px-gridden — et visuelt pust.
          Teksten inne følger fortsatt site-containeren for rolig venstrekant. */}
      <Reveal as="div"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8 }}
        className="relative overflow-hidden"
      >
        <div className="overflow-hidden h-[340px] sm:h-[460px] lg:h-[560px]">
          <img
            src="/bergen-harbor.webp"
            alt="Bergen ved solnedgang"
            width={1920}
            height={560}
            className="w-full h-full object-cover object-center animate-kenburns"
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 pb-9 sm:pb-14">
            <p className="text-[11px] sm:text-[12px] font-semibold uppercase tracking-[0.2em] text-white/70 mb-3">DigiHome · Bergen</p>
            <p className="text-white text-[26px] sm:text-[40px] lg:text-[50px] font-bold tracking-[-0.03em] leading-[1.08]" style={{ fontFamily: 'var(--font-heading)' }}>
              Mer enn forvaltning.<br/>En partner for eiendommen din.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
