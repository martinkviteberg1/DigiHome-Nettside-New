'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Play, X, TrendingUp, CalendarClock } from 'lucide-react';

const chapters = [
  { no: '01', label: 'Visning' },
  { no: '02', label: 'Kontrakt' },
  { no: '03', label: 'Innflytting' },
  { no: '04', label: 'Utbetaling' },
];

function GlassCard({ className, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function CinematicVideo({ poster, src }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="relative">
      <div className="relative rounded-[28px] overflow-hidden border border-white/10 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.65)] aspect-[16/11] sm:aspect-[16/8]">
        {/* Ken Burns poster */}
        <div className="absolute inset-0 animate-kenburns">
          <Image src={poster} alt="DigiHome eiendomsforvaltning i Bergen" fill priority className="object-cover" sizes="100vw" />
        </div>

        {/* Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/45" />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 28% 18%, rgba(207,151,252,0.20), transparent 55%)' }} />
        <div className="absolute inset-0 dot-grid opacity-[0.12]" />

        {/* Floating glass cards */}
        <GlassCard delay={0.15} className="hidden sm:flex absolute left-5 top-5 items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">Belegg</p>
            <p className="text-white font-bold text-sm">96% i sesong</p>
          </div>
        </GlassCard>

        <GlassCard delay={0.3} className="absolute left-5 bottom-5 animate-floaty rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-full bg-emerald-400/20 inline-flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">Utbetalt i mai</p>
              <p className="text-white font-bold text-base">+24 800 kr</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard delay={0.45} className="hidden md:flex absolute right-5 top-5 items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-4 py-3">
          <CalendarClock className="h-4 w-4 text-lavender-soft" />
          <div className="leading-tight">
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/60 font-semibold">Neste visning</p>
            <p className="text-white font-bold text-sm">I dag 14:00</p>
          </div>
        </GlassCard>

        {/* Play button with ripple */}
        <button onClick={() => setOpen(true)} className="group absolute inset-0 flex items-center justify-center" aria-label="Spill av video">
          <span className="relative flex items-center justify-center">
            {!reduce && (
              <>
                <span className="absolute h-24 w-24 rounded-full bg-white/15 animate-ping" />
                <span className="absolute h-32 w-32 rounded-full border border-white/15" />
                <span className="absolute h-44 w-44 rounded-full border border-white/10" />
              </>
            )}
            <span className="relative h-20 w-20 rounded-full bg-white flex items-center justify-center shadow-2xl group-hover:scale-105 transition">
              <Play className="h-7 w-7 text-ink translate-x-[2px]" fill="currentColor" />
            </span>
          </span>
        </button>

        {/* Sound hint + equalizer */}
        <div className="absolute right-5 bottom-5 flex items-center gap-2 text-white/85 text-xs font-medium">
          <span className="flex items-end gap-[3px] h-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="eq-bar w-[3px] h-full bg-white/80 rounded-full" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          Klikk for lyd
        </div>
      </div>

      {/* Chapters */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {chapters.map((c) => (
          <div key={c.no} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 hover:bg-white/[0.08] transition">
            <span className="text-xs font-bold text-lavender-soft tracking-[0.1em]">{c.no}</span>
            <p className="text-sm font-semibold text-white mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <button className="absolute top-5 right-5 h-11 w-11 rounded-full bg-white/10 border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition" onClick={() => setOpen(false)} aria-label="Lukk">
            <X className="h-5 w-5" />
          </button>
          <div className="w-full max-w-5xl aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {failed ? (
              <div className="relative w-full h-full">
                <Image src={poster} alt="" fill className="object-cover opacity-60" />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
                  <span className="h-14 w-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                    <Play className="h-6 w-6 text-white translate-x-[1px]" fill="currentColor" />
                  </span>
                  <p className="text-white text-lg font-semibold">Videoen kommer snart</p>
                  <p className="text-white/60 text-sm mt-1 max-w-sm">Last opp den endelige hero-videoen, så spilles den av her i fullskjerm.</p>
                </div>
              </div>
            ) : (
              <video src={src} poster={poster} controls autoPlay playsInline className="w-full h-full object-cover" onError={() => setFailed(true)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
