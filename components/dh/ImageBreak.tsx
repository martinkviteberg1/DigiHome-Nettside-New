'use client';

import React from 'react';
import { motion } from 'framer-motion';

export default function ImageBreak() {
  return (
    <section className="pb-24 sm:pb-28" style={{ backgroundColor: '#fdfcfb' }}>
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6 }}
          className="rounded-[24px] overflow-hidden relative"
        >
          <img
            src="/bergen-harbor.webp"
            alt="Bergen ved solnedgang"
            width={1400}
            height={400}
            className="w-full h-[280px] sm:h-[360px] lg:h-[400px] object-cover object-center"
            loading="lazy"
            decoding="async"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />
          <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 right-6 sm:right-10">
            <p className="text-white text-[24px] sm:text-[34px] font-bold tracking-[-0.02em] leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Mer enn forvaltning.<br/>En partner for eiendommen din.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
