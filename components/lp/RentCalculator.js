'use client';

// Interaktiv leiekalkulator — mikroforpliktelse som øker engasjement og
// sender brukeren videre til skjemaet med et konkret tall i hodet.
// Estimatet legges ved leadet (via 'lp:calc'-event) for bedre kvalifisering.

import React, { useMemo, useState, useEffect } from 'react';
import { ArrowRight, BedDouble, MapPin, TrendingUp } from 'lucide-react';

const AREAS = [
  { name: 'Sentrum', f: 1.0 },
  { name: 'Nordnes', f: 1.0 },
  { name: 'Sandviken', f: 0.97 },
  { name: 'Møhlenpris', f: 0.96 },
  { name: 'Laksevåg', f: 0.88 },
  { name: 'Fyllingsdalen', f: 0.86 },
  { name: 'Fana', f: 0.88 },
  { name: 'Åsane', f: 0.85 },
];

// Typisk tradisjonell månedsleie (sentrumsnivå) per antall soverom.
const BASE = { 1: 14500, 2: 19000, 3: 24000, 4: 28500 };

const round100 = (n) => Math.round(n / 100) * 100;
const nok = (n) => n.toLocaleString('nb-NO');

export default function RentCalculator({ onCta }) {
  const [area, setArea] = useState('Sentrum');
  const [bedrooms, setBedrooms] = useState(2);

  const est = useMemo(() => {
    const f = AREAS.find((a) => a.name === area)?.f ?? 1;
    const traditional = round100(BASE[bedrooms] * f);
    const low = round100(traditional * 1.18);
    const high = round100(traditional * 1.32);
    return { traditional, low, high };
  }, [area, bedrooms]);

  // Del estimatet med lead-skjemaet (beriker notes ved innsending).
  useEffect(() => {
    try {
      window.dispatchEvent(new CustomEvent('lp:calc', { detail: { area, bedrooms, ...est } }));
    } catch (e) {}
  }, [area, bedrooms, est]);

  return (
    <div className="rounded-[24px] bg-surface shadow-[0_30px_80px_-42px_rgba(10,10,10,0.42),0_2px_10px_rgba(10,10,10,0.04)] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-taupe">
        <TrendingUp className="w-4 h-4 text-lavender" /> Prøv leiekalkulatoren
      </div>

      {/* Område */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold text-ink-soft mb-2 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-taupe" /> Hvor ligger boligen?</p>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a.name} type="button" onClick={() => setArea(a.name)}
              className={`h-9 px-3.5 rounded-full text-[13px] font-medium transition-all ${area === a.name ? 'bg-ink text-canvas shadow-[0_10px_24px_-10px_rgba(10,10,10,0.5)]' : 'bg-fill text-ink-soft hover:bg-hairline'}`}>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Soverom */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold text-ink-soft mb-2 inline-flex items-center gap-1.5"><BedDouble className="w-3.5 h-3.5 text-taupe" /> Antall soverom</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setBedrooms(n)}
              className={`h-10 rounded-[12px] text-[14px] font-semibold transition-all ${bedrooms === n ? 'bg-ink text-canvas shadow-[0_10px_24px_-10px_rgba(10,10,10,0.5)]' : 'bg-fill text-ink-soft hover:bg-hairline'}`}>
              {n === 4 ? '4+' : n}
            </button>
          ))}
        </div>
      </div>

      {/* Resultat */}
      <div className="mt-6 rounded-[18px] bg-canvas-alt border border-hairline p-5">
        <div className="flex items-center justify-between text-[13px] text-quiet">
          <span>Vanlig utleie</span>
          <span className="font-semibold text-ink">≈ {nok(est.traditional)} kr/mnd</span>
        </div>
        <div className="mt-3 pt-3 border-t border-hairline flex items-end justify-between gap-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.12em] text-taupe">Med DigiHome</p>
            <p className="font-heading font-bold text-[26px] sm:text-[30px] text-ink leading-none mt-1">
              {nok(est.low)}–{nok(est.high)} <span className="text-[15px] font-semibold text-quiet">kr/mnd</span>
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-success-bg text-success text-[12px] font-bold px-2.5 py-1">
            <TrendingUp className="w-3.5 h-3.5" /> opptil +30 %
          </span>
        </div>
      </div>

      <button type="button" onClick={onCta}
        className="group mt-5 w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-14px_rgba(10,10,10,0.6)] transition-all">
        Få nøyaktig vurdering — gratis <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
      <p className="mt-3 text-[12px] text-taupe text-center">Estimat basert på markedsdata for Bergen. Du får en konkret vurdering av nettopp din bolig — innen 24 timer.</p>
    </div>
  );
}
