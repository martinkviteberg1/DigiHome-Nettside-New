'use client';

import React, { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// Prikker — diskret fremdriftsindikator i høyre kant. Én prikk per slide;
// aktiv prikk strekkes til en liten strek. Klikk ruller til sliden. Kun
// synlig på desktop, der scroll-snappingen er aktiv.
// ---------------------------------------------------------------------------

export default function Prikker() {
  const [slides, setSlides] = useState<{ el: HTMLElement; navn: string }[]>([]);
  const [aktiv, setAktiv] = useState(0);

  useEffect(() => {
    const funnet = Array.from(document.querySelectorAll<HTMLElement>('[data-slide]')).map((el) => ({
      el,
      navn: el.dataset.slide || '',
    }));
    setSlides(funnet);

    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const i = funnet.findIndex((s) => s.el === entry.target);
            if (i !== -1) setAktiv(i);
          }
        });
      },
      { threshold: 0.55 }
    );
    funnet.forEach((s) => obs.observe(s.el));
    return () => obs.disconnect();
  }, []);

  if (slides.length === 0) return null;

  return (
    <nav
      aria-label="Fremdrift i omvisningen"
      data-testid="tour-prikker"
      className="fixed right-6 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-3 lg:flex xl:right-8"
    >
      {slides.map((s, i) => (
        <button
          key={i}
          type="button"
          aria-label={s.navn}
          aria-current={i === aktiv ? 'true' : undefined}
          onClick={() => s.el.scrollIntoView({ behavior: 'smooth' })}
          className="group flex h-4 w-4 items-center justify-center"
        >
          <span
            className={`block w-[6px] rounded-full transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              i === aktiv
                ? 'h-[18px] bg-[#0a0a0a]'
                : 'h-[6px] bg-[#0a0a0a]/[0.16] group-hover:bg-[#0a0a0a]/[0.38]'
            }`}
          />
        </button>
      ))}
    </nav>
  );
}
