'use client';

import { useEffect, useRef } from 'react';

// ---------------------------------------------------------------------------
// Lesefremdrift for artikkelsider.
//
// Skriver direkte til style.transform via ref i stedet for å gå gjennom
// useState: en scroll-handler som setter state kjører en full React-render
// på hver piksel, som gir hakking på mobil. transform: scaleX() animeres
// dessuten på compositor-tråden, ulikt width.
//
// Respekterer prefers-reduced-motion ved å hoppe over hele elementet.
// ---------------------------------------------------------------------------
export default function ReadingProgress() {
  const barRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let frame = 0;
    const update = () => {
      frame = 0;
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      const p = max > 0 ? Math.min(Math.max(el.scrollTop / max, 0), 1) : 0;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="dh-read-bar" aria-hidden="true">
      <span ref={barRef} style={{ transform: 'scaleX(0)' }} />
    </div>
  );
}
