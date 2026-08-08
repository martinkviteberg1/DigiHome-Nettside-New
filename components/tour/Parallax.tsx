'use client';

import React, { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Parallax — subtil dybde for omvisningen. Positiv faktor = laget henger
// igjen (dybde/bakgrunn), høyere faktor = dypere. rAF-drevet, dempes på
// mindre skjermer og respekterer prefers-reduced-motion.
// ---------------------------------------------------------------------------

export default function Parallax({
  faktor = 0.1,
  className = '',
  children,
}: {
  faktor?: number;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const oppdater = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const senter = r.top + r.height / 2 - vh / 2;
      const p = Math.max(-1, Math.min(1, senter / vh));
      const skala = window.innerWidth < 1024 ? 0.55 : 1;
      el.style.transform = `translate3d(0, ${(-p * faktor * skala * vh).toFixed(1)}px, 0)`;
    };
    const vedScroll = () => {
      if (!raf) raf = requestAnimationFrame(oppdater);
    };
    oppdater();
    window.addEventListener('scroll', vedScroll, { passive: true });
    window.addEventListener('resize', vedScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', vedScroll);
      window.removeEventListener('resize', vedScroll);
      if (raf) cancelAnimationFrame(raf);
      el.style.transform = '';
    };
  }, [faktor]);

  return (
    <div ref={ref} className={className} style={{ willChange: 'transform' }}>
      {children}
    </div>
  );
}
