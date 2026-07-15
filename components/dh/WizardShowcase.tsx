'use client';

// ---------------------------------------------------------------------------
// WizardShowcase — den mørke, cinematiske venstre-panelen i fullskjerm-
// skjemaet (premium 2026-oppgradering). Ren presentasjon: bilde, fase-
// tilpasset budskap, flytende statistikk-chips og ekte kundesitat.
// Vises kun på lg+ (mobil får kompakt lys layout uten panel).
// ---------------------------------------------------------------------------
import React from 'react';
import { motion, AnimatePresence } from '@/lib/motion-lite';
import { TrendingUp, Home, Clock3, Sparkles, Star, ShieldCheck } from 'lucide-react';
import { testimonials } from '@/lib/site';

const PHASES = [
  {
    kicker: 'Steg 1 — Adressen',
    title: 'Utleie som faktisk lønner seg',
    sub: 'Vi analyserer området ditt og finner leiepotensialet — før du har fylt ut noe som helst.',
    image: '/bergen-rooftops.webp',
    imageAlt: 'Utleieboliger i Bergen sett ovenfra',
    chips: [
      { icon: TrendingUp, value: '+30 %', label: 'høyere årsinntekt med 10+2' },
      { icon: Home, value: '25 000 kr', label: 'snittinntekt per bolig/mnd' },
    ],
    testimonial: testimonials[0],
  },
  {
    kicker: 'Steg 2 — Tjenesten',
    title: 'Velg hvor mye du vil gjøre selv',
    sub: 'Fra smarte verktøy til full autopilot — begge uten bindingstid.',
    image: '/interior-living.webp',
    imageAlt: 'Lys stue i forvaltet utleiebolig',
    chips: [
      { icon: Sparkles, value: '5 %', label: 'selvforvaltning per utleieforhold' },
      { icon: ShieldCheck, value: '0 kr', label: 'oppstart · ingen bindingstid' },
    ],
    testimonial: testimonials[1],
  },
  {
    kicker: 'Steg 3 — Detaljene',
    title: 'Nesten i mål',
    sub: 'Et par detaljer til, så tar en lokal rådgiver kontakt med et konkret tilbud.',
    image: '/interior-bedroom.webp',
    imageAlt: 'Soverom i utleiebolig klargjort av DigiHome',
    chips: [
      { icon: Clock3, value: '< 24 t', label: 'svar fra lokal rådgiver' },
      { icon: Home, value: '150+', label: 'boliger under forvaltning' },
    ],
    testimonial: testimonials[2],
  },
];

export default function WizardShowcase({ phase = 0, phases, embedded = false }: { phase?: number; phases?: any[]; embedded?: boolean }) {
  const list = phases && phases.length ? phases : PHASES;
  const p = list[Math.min(Math.max(phase, 0), list.length - 1)];
  return (
    <aside
      className={`hidden lg:flex flex-col justify-between relative overflow-hidden p-10 xl:p-12 ${embedded ? 'lg:sticky lg:top-[76px] lg:h-[calc(100vh-76px)]' : 'lg:sticky lg:top-0 lg:h-screen'}`}
      style={{ background: 'linear-gradient(165deg, #120b22 0%, #1a1030 42%, #0b0714 100%)' }}
      aria-hidden
      data-testid="wizard-showcase"
    >
      {/* Aurora-glød + kornete dybde */}
      <div className="pointer-events-none absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full opacity-60" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 65%)', filter: 'blur(10px)', animation: 'dhFloatA 14s ease-in-out infinite' }} />
      <div className="pointer-events-none absolute -bottom-40 -right-28 w-[560px] h-[560px] rounded-full opacity-50" style={{ background: 'radial-gradient(circle, rgba(210,152,255,0.28) 0%, transparent 65%)', filter: 'blur(12px)', animation: 'dhFloatB 18s ease-in-out infinite' }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.22]" style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.35) 0.7px, transparent 0.7px)', backgroundSize: '26px 26px', maskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 35%, black 20%, transparent 75%)' }} />
      <style>{`
        @keyframes dhFloatA { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(28px,20px) } }
        @keyframes dhFloatB { 0%,100%{ transform: translate(0,0) } 50%{ transform: translate(-24px,-26px) } }
      `}</style>

      {/* Logo — skjules i embedded-modus (global Header bærer merkevaren der) */}
      {embedded ? <span aria-hidden /> : (
        <a href="/" className="relative z-10 inline-flex w-fit" aria-label="DigiHome — til forsiden">
          <img src="/brand/digihome-lockup-white.svg" alt="DigiHome" className="h-[24px] w-auto" />
        </a>
      )}

      {/* Fase-innhold — myk crossfade */}
      <div className="relative z-10 my-8 flex-1 flex flex-col justify-center max-w-[460px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#d298ff]">{p.kicker}</p>
            <h2 className="text-white text-[30px] xl:text-[34px] font-bold tracking-[-0.025em] leading-[1.12] mt-3" style={{ fontFamily: 'var(--font-heading)' }}>
              {p.title}
            </h2>
            <p className="text-white/60 text-[14.5px] leading-relaxed mt-3 max-w-[42ch]">{p.sub}</p>

            {/* Bildekort med flytende glass-chips */}
            <div className="relative mt-8 mb-10">
              <div className="rounded-[26px] overflow-hidden ring-1 ring-white/10 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]">
                <img src={p.image} alt={p.imageAlt} width={800} height={560} className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-0 rounded-[26px]" style={{ background: 'linear-gradient(180deg, transparent 55%, rgba(10,6,18,0.55) 100%)' }} />
              </div>
              {p.chips.map((c, i) => (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.15, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className={`absolute flex items-center gap-2.5 rounded-2xl px-4 py-3 backdrop-blur-xl bg-white/[0.09] ring-1 ring-white/15 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.5)] ${i === 0 ? '-top-4 -right-3 xl:-right-6' : '-bottom-5 -left-3 xl:-left-6'}`}
                >
                  <span className="w-9 h-9 rounded-xl bg-[#d298ff]/20 flex items-center justify-center shrink-0">
                    <c.icon className="w-4 h-4 text-[#d298ff]" strokeWidth={2.4} />
                  </span>
                  <span>
                    <span className="block text-white text-[16px] font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{c.value}</span>
                    <span className="block text-white/55 text-[11px] mt-1 leading-tight max-w-[150px]">{c.label}</span>
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Kundesitat — glass-kort (valgfritt per fase) */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {p.testimonial ? (
          <motion.figure
            key={`t-${phase}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 backdrop-blur-xl p-5"
          >
            <div className="flex items-center gap-1 mb-2.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-[#d298ff]" fill="#d298ff" strokeWidth={0} />)}
            </div>
            <blockquote className="text-white/85 text-[13.5px] leading-relaxed">«{p.testimonial.quote}»</blockquote>
            <figcaption className="mt-3 text-[12px] text-white/50 font-medium">{p.testimonial.name} · {p.testimonial.role}</figcaption>
          </motion.figure>
          ) : null}
        </AnimatePresence>
      </div>
    </aside>
  );
}
