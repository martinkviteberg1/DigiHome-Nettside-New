'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Reveal from '@/components/dh/Reveal';

// Fallback — vises til ekte boliger er synket & gjort synlige i adminportalen.
const FALLBACK = [
  { id: 'fb-1', image: '/showcase-1.webp', location: 'Nordnes, Bergen', type: '3 sov · 68 m²', income: '22 500', tag: 'Hybridutleie', rented: false },
  { id: 'fb-2', image: '/interior-kitchen2.webp', location: 'Sandviken, Bergen', type: '2 sov · 52 m²', income: '18 000', tag: 'Korttidsutleie', rented: false },
  { id: 'fb-3', image: '/showcase-apartment.webp', location: 'Sentrum, Bergen', type: '3 sov · 95 m²', income: '26 500', tag: 'Hybridutleie', rented: false },
];

const MODEL_LABEL: Record<string, string> = { langtid: 'Langtidsutleie', korttid: 'Korttidsutleie', hybrid: 'Hybridutleie' };

// Plattform-bolig → kortformat (personvern-trygge felt, ingen adresser)
function toCard(p: any) {
  const parts = [] as string[];
  if (Number(p.bedrooms) > 0) parts.push(`${p.bedrooms} sov`);
  if (Number(p.sqm) > 0) parts.push(`${p.sqm} m²`);
  return {
    id: p.id,
    image: (p.images && p.images[0]) || null,
    location: [p.area, p.city].filter(Boolean).join(', ') || 'Norge',
    type: parts.join(' · '),
    income: p.monthlyRentBand ? String(p.monthlyRentBand).replace(/\s*kr\/mnd\s*$/i, '') : null,
    tag: (p.model && MODEL_LABEL[p.model]) || 'Utleie',
    rented: p.status === 'rented',
  };
}

export default function ShowcaseSection() {
  const [cards, setCards] = useState<any[]>(FALLBACK);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/public/properties?limit=6');
        const j = await r.json();
        if (!alive || !j?.ok) return;
        const live = (j.properties || []).map(toCard).filter((c: any) => c.image); // kun boliger med bilder
        if (live.length >= 1) setCards(live.slice(0, 6));
      } catch (e) { /* behold fallback */ }
    })();
    return () => { alive = false; };
  }, []);

  return (
    <section id="boliger" className="e-section bg-white" data-testid="showcase-section">
      <div className="e-shell">
        <div className="relative flex items-baseline gap-4">
          <span className="e-index xl:absolute xl:-left-[52px] xl:top-[2px]">06</span>
          <span className="e-label">Porteføljen</span>
        </div>
        <div className="e-rule mt-4 pt-8 sm:pt-10 grid lg:grid-cols-12 gap-x-10 gap-y-5 items-end">
          <h2 className="e-h2 lg:col-span-7 max-w-[18ch]">Boliger vi drifter nå.</h2>
          <div className="lg:col-span-5 lg:pb-2">
            <Link href="/ledige-boliger" className="e-link text-[14.5px] font-semibold">Se alle ledige boliger</Link>
          </div>
        </div>

        {/* Bildet står for seg, og opplysningene står under en hårfin linje — ikke
            som pilleformede merker oppe i hjørnet av fotografiet. */}
        <div className="mt-12 sm:mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-10">
          {cards.map((p: any, i: number) => (
            <Reveal as="div" key={p.id || p.location} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
              className="group">
              <div className="e-frame">
                <img src={p.image} alt={p.location} loading="lazy" className="w-full aspect-[5/4] object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]" />
              </div>
              <div className="e-rule mt-4 pt-3.5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-[15.5px] font-semibold text-[#0a0a0a] truncate" style={{ fontFamily: 'var(--font-heading)' }}>{p.location}</h3>
                  <p className="e-meta mt-1">
                    {[p.type, p.tag].filter(Boolean).join(' · ')}{p.rented ? ' · Utleid' : ''}
                  </p>
                </div>
                {p.income && (
                  <div className="text-right shrink-0">
                    <p className="e-display e-num text-[17px]">{p.income}</p>
                    <p className="e-meta mt-0.5">kr/mnd</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
