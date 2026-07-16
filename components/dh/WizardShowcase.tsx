'use client';

// ---------------------------------------------------------------------------
// WizardShowcase — editorial premium-panel (2026) i samme stil som /ny2.
// Høyrestilt (lg:order-2), avrundet bildeslider med mørk gradient, glass-
// morphism sitatkort, pil-navigasjon og 8s autoplay. Følger veiviserens fase
// automatisk, men kan også blas manuelt. Vises kun på lg+ (mobil = ren form).
// Merkefarge: DigiHome-lilla #d298ff.
// ---------------------------------------------------------------------------
import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Star, TrendingUp, Home, Clock3, Sparkles, ShieldCheck } from 'lucide-react';
import { testimonials } from '@/lib/site';

const BRAND = '#d298ff';

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
  const clamp = (n: number) => Math.min(Math.max(n, 0), list.length - 1);
  const [idx, setIdx] = useState(clamp(phase));

  // Veiviser-fasen styrer panelet: går brukeren videre, følger slideren etter.
  useEffect(() => { setIdx(clamp(phase)); }, [phase, list.length]); // eslint-disable-line

  // Autoplay hvert 8. sekund — nullstilles ved fase-bytte og manuell blaing.
  useEffect(() => {
    if (list.length < 2) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 8000);
    return () => clearInterval(t);
  }, [idx, list.length]);

  const go = (n: number) => setIdx(((n % list.length) + list.length) % list.length);
  const p = list[idx];

  return (
    <aside
      className={`hidden lg:block lg:order-2 p-3 xl:p-4 ${embedded ? 'lg:sticky lg:top-[76px] lg:h-[calc(100vh-76px)]' : 'lg:sticky lg:top-0 lg:h-screen'}`}
      data-testid="wizard-showcase"
    >
      <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-[#17101f] shadow-[0_24px_70px_-30px_rgba(20,10,40,0.35)]">
        {/* Bildestabel — myk crossfade mellom fasene */}
        {list.map((s: any, i: number) => (
          <img
            key={`${s.image}-${i}`}
            src={s.image}
            alt={i === idx ? (s.imageAlt || '') : ''}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1100ms] ease-out ${i === idx ? 'opacity-100' : 'opacity-0'}`}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}
        {/* Mørk gradient nederst for lesbar tekst (som /ny2-hero) */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-black/25" />

        {/* Kicker-chip øverst */}
        <div className="absolute top-5 left-5 xl:top-6 xl:left-6 z-10">
          <span key={`k-${idx}`} className="dhShowFade inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-xl ring-1 ring-white/20 px-4 py-2 text-[10.5px] font-bold uppercase tracking-[0.15em] text-white">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BRAND }} /> {p.kicker}
          </span>
        </div>

        {/* Bunninnhold: tittel, stat-chips og glass-sitatkort */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-5 xl:p-7">
          <div key={`t-${idx}`} className="dhShowUp">
            <h2 className="text-white text-[25px] xl:text-[29px] font-bold tracking-[-0.02em] leading-[1.12]" style={{ fontFamily: 'var(--font-heading)' }}>{p.title}</h2>
            <p className="text-white/70 text-[13px] xl:text-[13.5px] leading-relaxed mt-1.5 max-w-[46ch]">{p.sub}</p>
          </div>

          {Array.isArray(p.chips) && p.chips.length ? (
            <div key={`c-${idx}`} className="dhShowUp flex flex-wrap gap-2.5 mt-4" style={{ animationDelay: '90ms' }}>
              {p.chips.map((c: any) => (
                <span key={c.label} className="inline-flex items-center gap-2.5 rounded-2xl px-3.5 py-2.5 backdrop-blur-xl bg-white/10 ring-1 ring-white/15">
                  <span className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'rgba(210,152,255,0.25)' }}>
                    <c.icon className="w-4 h-4" style={{ color: BRAND }} strokeWidth={2.4} />
                  </span>
                  <span>
                    <span className="block text-white text-[14px] font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{c.value}</span>
                    <span className="block text-white/60 text-[10.5px] mt-1 leading-tight max-w-[150px]">{c.label}</span>
                  </span>
                </span>
              ))}
            </div>
          ) : null}

          {/* Glassmorphism-kort: sitat + slider-navigasjon */}
          <div className="mt-4 rounded-3xl bg-white/10 backdrop-blur-xl ring-1 ring-white/20 p-5 xl:p-6" data-testid="showcase-glass-card">
            <div key={`q-${idx}`} className="dhShowUp" style={{ animationDelay: '140ms' }}>
              {p.testimonial ? (
                <figure>
                  <div className="flex items-center gap-1 mb-2">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5" fill={BRAND} strokeWidth={0} style={{ color: BRAND }} />)}
                  </div>
                  <blockquote className="text-white/90 text-[13px] xl:text-[13.5px] leading-relaxed">«{p.testimonial.quote}»</blockquote>
                  <figcaption className="mt-2.5 text-[11.5px] text-white/55 font-medium">{p.testimonial.name} · {p.testimonial.role}</figcaption>
                </figure>
              ) : (
                <p className="text-white/85 text-[13px] xl:text-[13.5px] leading-relaxed">Gratis og uforpliktende — en lokal rådgiver følger deg hele veien.</p>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-white/15 flex items-center justify-between">
              <div className="flex gap-1.5" role="tablist" aria-label="Velg lysbilde">
                {list.map((_: any, i: number) => (
                  <button key={i} type="button" onClick={() => go(i)} aria-label={`Gå til lysbilde ${i + 1}`}
                    className={`h-1 rounded-full transition-all duration-500 ${i === idx ? 'w-7 bg-white' : 'w-4 bg-white/30 hover:bg-white/55'}`} />
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => go(idx - 1)} aria-label="Forrige lysbilde" data-testid="showcase-prev"
                  className="w-9 h-9 rounded-full bg-white/12 ring-1 ring-white/25 hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95">
                  <ArrowLeft className="w-4 h-4 text-white" />
                </button>
                <button type="button" onClick={() => go(idx + 1)} aria-label="Neste lysbilde" data-testid="showcase-next"
                  className="w-9 h-9 rounded-full bg-white/12 ring-1 ring-white/25 hover:bg-white/25 flex items-center justify-center transition-colors active:scale-95">
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes dhShowUpK { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
          @keyframes dhShowFadeK { from { opacity: 0 } to { opacity: 1 } }
          .dhShowUp { animation: dhShowUpK .65s cubic-bezier(0.16,1,0.3,1) both }
          .dhShowFade { animation: dhShowFadeK .8s ease both }
          @media (prefers-reduced-motion: reduce) { .dhShowUp, .dhShowFade { animation: none } }
        `}</style>
      </div>
    </aside>
  );
}
