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
      <nav aria-label="Innhold i artikkelen" className="sticky top-[104px]">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#6f6a64] mb-4">
          <List className="w-3.5 h-3.5" /> Innhold
        </p>
        <ol className="space-y-0.5 border-l border-black/[0.08]">
          {headings.map((h) => {
            const on = active === h.id;
            return (
              <li key={h.id}>
                <a
                  href={`#${h.id}`}
                  aria-current={on ? 'true' : undefined}
                  className={`block pl-4 -ml-px border-l-2 py-1.5 text-[13.5px] leading-snug transition-colors ${
                    on
                      ? 'border-[#7c3aed] text-[#1f1f1f] font-semibold'
                      : 'border-transparent text-[#6b665f] hover:text-[#4a4a4a]'
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
    <details className="group mb-9 rounded-2xl border border-black/[0.07] bg-white overflow-hidden xl:hidden">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none select-none [&::-webkit-details-marker]:hidden min-h-[44px]">
        <span className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.14em] text-[#716b63]">
          <List className="w-3.5 h-3.5" /> Innhold
        </span>
        <ChevronDown className="w-4 h-4 text-[#8a837a] transition-transform group-open:rotate-180" />
      </summary>
      <ol className="px-5 pb-5 space-y-1 border-t border-black/[0.05] pt-3">
        {headings.map((h, i) => (
          <li key={h.id} className="flex gap-2.5 text-[14.5px] leading-snug">
            <span className="text-[#7c7568] tabular-nums shrink-0 py-1.5">{i + 1}.</span>
            <a href={`#${h.id}`} className="py-1.5 text-[#4a4a4a] hover:text-[#7c3aed] transition-colors">{h.text}</a>
          </li>
        ))}
      </ol>
    </details>
  );
}
