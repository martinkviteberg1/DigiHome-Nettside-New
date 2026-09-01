'use client';

import React, { useEffect, useRef, useState } from 'react';

/* ---------------------------------------------------------------------------
   Avsloer — myk inntoning når elementet ruller inn i viewport.
   Kun opacity/transform (GPU-vennlig), kjører én gang per element.
   prefers-reduced-motion → vises umiddelbart uten animasjon.
--------------------------------------------------------------------------- */

export default function Avsloer({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [inne, setInne] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let redusert = false;
    try { redusert = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ok */ }
    if (redusert || typeof IntersectionObserver === 'undefined') { setInne(true); return undefined; }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setInne(true); io.disconnect(); }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inne ? 1 : 0,
        transform: inne ? 'none' : 'translateY(22px)',
        transition: `opacity 800ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform 800ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
