import React from 'react';
import { testimonials } from '@/lib/site';

// ---------------------------------------------------------------------------
// Én stemme. Sitatet er hentet fra de dokumenterte kundesitatene i lib/site —
// Thomas' formulering treffer sidens konsept ordrett («autopilot»).
// Ett sitat er tillit; tre er støy.
// ---------------------------------------------------------------------------

export default function Sitat() {
  const t = testimonials.find((x: any) => x.name?.startsWith('Thomas')) || testimonials[0];

  return (
    <section className="bg-[#fdfcfb]" data-testid="nyest-sitat">
      <div className="mx-auto w-full max-w-[1400px] px-6 pb-24 sm:px-10 sm:pb-32 lg:px-16">
        <blockquote className="e-reveal border-t border-[#e5dfd4] pt-10 sm:pt-12">
          <p className="e-quote max-w-[26ch] text-[26px] sm:text-[36px] lg:text-[42px]">«{t.quote}»</p>
          <footer className="mt-7 flex flex-wrap items-baseline gap-x-3">
            <span className="text-[14.5px] font-semibold text-[#0a0a0a]">{t.name}</span>
            <span className="e-meta">{t.role}</span>
          </footer>
        </blockquote>
      </div>
    </section>
  );
}
