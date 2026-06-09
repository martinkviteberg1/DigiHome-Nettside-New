'use client';

import { useEffect, useRef, useState } from 'react';

export function CountUp({ value, className, duration = 1500 }) {
  const ref = useRef(null);
  const started = useRef(false);
  const [display, setDisplay] = useState(value);

  const match = String(value).match(/^(\D*)(\d+(?:[.,]\d+)?)(.*)$/);
  const prefix = match ? match[1] : '';
  const target = match ? parseFloat(match[2].replace(',', '.')) : 0;
  const suffix = match ? match[3] : '';

  useEffect(() => {
    const el = ref.current;
    if (!el || !match) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            const start = performance.now();
            setDisplay(`${prefix}0${suffix}`);
            const tick = (now) => {
              const p = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - p, 3);
              const current = Math.round(target * eased);
              setDisplay(`${prefix}${current}${suffix}`);
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, prefix, target, suffix, duration, match]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
