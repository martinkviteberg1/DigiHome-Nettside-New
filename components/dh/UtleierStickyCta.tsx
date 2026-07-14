'use client';

import { useEffect, useState } from 'react';

// Sticky «Kom i gang»-knapp for mobil på /bli-utleier (10/7): siden har ikke
// lenger innbakt skjema nederst, så vi holder konverteringstrykket oppe med en
// diskret bunnknapp som dukker opp etter litt scrolling. Skjules når den
// avsluttende CTA-seksjonen er synlig (unngår dobbel CTA på skjermen).
export default function UtleierStickyCta() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let ctaVisible = false;
    const onScroll = () => setShow(window.scrollY > 560 && !ctaVisible);
    const el = document.querySelector('[data-testid="utleier-cta"]');
    let io: IntersectionObserver | null = null;
    if (el && 'IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        ctaVisible = entries[0]?.isIntersecting || false;
        onScroll();
      }, { threshold: 0.1 });
      io.observe(el);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener('scroll', onScroll); io?.disconnect(); };
  }, []);

  return (
    <div
      className={`sm:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 bg-gradient-to-t from-[#faf9f7] via-[#faf9f7]/90 to-transparent transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
      data-testid="utleier-sticky-cta"
    >
      <a
        href="/bli-utleier/start"
        className="flex items-center justify-center gap-2 h-[52px] w-full rounded-full bg-[#0a0a0a] text-white text-[15px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.18)] active:scale-[0.98] transition-transform"
      >
        Kom i gang — tar 2 minutter <span aria-hidden>→</span>
      </a>
    </div>
  );
}
