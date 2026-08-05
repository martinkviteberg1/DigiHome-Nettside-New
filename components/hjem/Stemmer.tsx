import React from 'react';
import { testimonials } from '@/lib/site';

// Étt sitat satt stort, to som fotnoter. Tre like testimonial-kort ved siden av
// hverandre veier likt og leses derfor som utfylling; én stemme som får plass
// leses som et menneske.
export default function Stemmer() {
  const [forste, ...resten] = testimonials;
  if (!forste) return null;

  return (
    <section className="e-section bg-white" data-testid="testimonials-section">
      <div className="e-shell">
        <div className="relative flex items-baseline gap-4">
          <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">07</span>
          <span className="e-label">Eiere vi jobber for</span>
        </div>

        <div className="e-line e-line-in mt-4" />
        <blockquote className="e-reveal pt-10 sm:pt-14">
          <p className="e-quote text-[26px] sm:text-[38px] lg:text-[46px] max-w-[24ch]">
            «{forste.quote}»
          </p>
          <footer className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[14.5px] font-semibold text-[#0a0a0a]">{forste.name}</span>
            <span className="w-4 h-px bg-[#d6cfc4]" aria-hidden="true" />
            <span className="e-meta">{forste.role}</span>
          </footer>
        </blockquote>

        <div className="mt-14 grid md:grid-cols-2 gap-x-14 gap-y-10">
          {resten.map((t: any) => (
            <blockquote key={t.name} className="e-reveal e-rule pt-6">
              <p className="e-body max-w-[46ch]">«{t.quote}»</p>
              <footer className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-[13.5px] font-semibold text-[#0a0a0a]">{t.name}</span>
                <span className="e-meta">{t.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
