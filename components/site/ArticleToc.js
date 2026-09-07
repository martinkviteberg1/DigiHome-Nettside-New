'use client';

import { useEffect, useState } from 'react';
import { List, ChevronDown } from 'lucide-react';

// ---------------------------------------------------------------------------
// Innholdsfortegnelse for artikler.
//
// Samme data, to visninger — styrt av `variant`:
//   • variant="inline"  → sammenleggbar <details> over brødteksten (mobil/tablet)
//   • variant="rail"    → sticky sidestolpe med scroll-spy (xl og opp)
//
// Grunnen til at det er én komponent med variant, og ikke én komponent som
// rendrer begge: de skal plasseres på to helt ulike steder i grid-en, og
// scroll-spy-observeren skal bare kjøre for den som faktisk er synlig.
//
// Aktiv-markeringen bruker en rootMargin som legger «treffsonen» øverst i
// viewporten — ellers hopper markeringen når to overskrifter er synlige.
// ---------------------------------------------------------------------------
export default function ArticleToc({ headings = [], variant = 'inline', minHeadings = 3 }) {
  const [active, setActive] = useState(headings[0]?.id || '');
  const isRail = variant === 'rail';

  useEffect(() => {
    if (!isRail || !headings.length) return undefined;
    const nodes = headings.map((h) => document.getElementById(h.id)).filter(Boolean);
    if (!nodes.length) return undefined;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-88px 0px -70% 0px', threshold: 0 },
    );
    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [headings, isRail]);

  if (headings.length < minHeadings) return null;

  if (isRail) {
    return (
      <nav aria-label="Innhold i artikkelen" className="sticky top-[96px]">
        <p className="mb-4 text-[13px] font-medium" style={{ color: 'rgba(21,19,15,0.5)' }}>Innhold</p>
        <ol className="space-y-0.5 border-l" style={{ borderColor: 'rgba(21,19,15,0.12)' }}>
          {headings.map((h) => {
            const on = active === h.id;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  aria-current={on ? 'true' : undefined}
                  className={`-ml-px block border-l-2 py-1.5 pl-4 text-[13.5px] leading-snug transition-colors ${
                    on
                      ? 'border-[#D496FF] text-[#15130F]'
                      : 'border-transparent text-[#15130F]/55 hover:text-[#15130F]'
                  }`}
                >
                  {h.text}
                </a>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  return (
    <details className="group mb-9 overflow-hidden rounded-[16px] xl:hidden" style={{ background: '#EDEAE3' }}>
      <summary className="flex min-h-[44px] cursor-pointer select-none list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: '#15130F' }}>
          <List className="h-3.5 w-3.5" strokeWidth={1.8} /> Innhold
        </span>
        <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" style={{ color: 'rgba(21,19,15,0.5)' }} />
      </summary>
      <ol className="space-y-1 border-t px-5 pb-5 pt-3" style={{ borderColor: 'rgba(21,19,15,0.1)' }}>
        {headings.map((h, i) => (
          <li key={h.id} className="flex gap-2.5 text-[14.5px] leading-snug">
            <span className="shrink-0 py-1.5 tabular-nums" style={{ color: 'rgba(21,19,15,0.45)' }}>{String(i + 1).padStart(2, '0')}</span>
            <a href={`#${h.id}`} className="py-1.5 transition-colors hover:text-[#15130F]" style={{ color: 'rgba(21,19,15,0.75)' }}>{h.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}
