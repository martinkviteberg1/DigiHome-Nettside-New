'use client';

import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// RoterendOrd — én subtil hvisken under den store H1. Ordene bytter seg med
// rolig fade + minimal y-shift; usynlig bredeste ord holder layout stabil.
// Meget dempet farge, aldri gimmicky, aldri distraherende.
// ---------------------------------------------------------------------------

const ORD = ['huseiere', 'forvaltere', 'porteføljer'];
const LENGSTE = ORD.reduce((a, b) => (a.length > b.length ? a : b));

export default function RoterendOrd() {
  const [i, setI] = useState(0);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const listener = () => setPrefersReduced(mq.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    if (prefersReduced) return;
    const t = setInterval(() => setI((x) => (x + 1) % ORD.length), 3200);
    return () => clearInterval(t);
  }, [prefersReduced]);

  return (
    <span className="relative inline-block align-baseline" data-testid="nyest3-rotating">
      {/* Usynlig lengste ord holder plassen stabil. */}
      <span className="invisible whitespace-nowrap">{LENGSTE}</span>
      {ORD.map((ord, idx) => (
        <span
          key={ord}
          aria-hidden={i !== idx}
          className="absolute left-0 top-0 whitespace-nowrap transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{
            opacity: i === idx ? 1 : 0,
            transform: i === idx ? 'translateY(0)' : 'translateY(0.14em)',
          }}
        >
          {ord}
        </span>
      ))}
    </span>
  );
}
