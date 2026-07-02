'use client';

// Interaktiv leiekalkulator — mikroforpliktelse som øker engasjement og
// sender brukeren videre til skjemaet med et konkret tall i hodet.
// Estimatet legges ved leadet (via 'lp:calc'-event) for bedre kvalifisering.
// Stylet i root-sidens designspråk.

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
    <div className="rounded-2xl bg-white border border-[#eee] shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 sm:p-8">
      <div className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.15em]" style={{ color: '#9333EA' }}>
        <TrendingUp className="w-4 h-4" style={{ color: '#AE68E4' }} /> Prøv leiekalkulatoren
      </div>

      {/* Område */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold text-[#222] mb-2 inline-flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-[#999]" /> Hvor ligger boligen?</p>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a.name} type="button" onClick={() => setArea(a.name)}
              className={`h-9 px-3.5 rounded-full text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${area === a.name ? 'bg-[#0a0a0a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]' : 'bg-[#f5f3f0] text-[#555] hover:bg-[#edeae6]'}`}>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Soverom */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold text-[#222] mb-2 inline-flex items-center gap-1.5"><BedDouble className="w-3.5 h-3.5 text-[#999]" /> Antall soverom</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setBedrooms(n)}
              className={`h-10 rounded-xl text-[14px] font-semibold transition-all duration-200 active:scale-[0.97] ${bedrooms === n ? 'bg-[#0a0a0a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]' : 'bg-[#f5f3f0] text-[#555] hover:bg-[#edeae6]'}`}>
              {n === 4 ? '4+' : n}
            </button>
          ))}
        </div>
      </div>

      {/* Resultat */}
      <div className="mt-6 rounded-xl bg-[#fafafa] border border-[#eee] p-5">
        <div className="flex items-center justify-between text-[13px] text-[#888]">
          <span>Vanlig utleie</span>
          <span className="font-semibold text-[#0a0a0a]">≈ {nok(est.traditional)} kr/mnd</span>
        </div>
        <div className="mt-3 pt-3 border-t border-[#eee] flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[#999] font-semibold">Med DigiHome</p>
            <p className="font-heading font-bold text-[26px] sm:text-[30px] text-[#0a0a0a] leading-none mt-1.5">
              {nok(est.low)}–{nok(est.high)} <span className="text-[15px] font-semibold text-[#888]">kr/mnd</span>
            </p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#E8F4EE] text-[#18794E] text-[12px] font-bold px-2.5 py-1">
            <TrendingUp className="w-3.5 h-3.5" /> opptil +30 %
          </span>
        </div>
      </div>

      <button type="button" onClick={onCta}
        className="group mt-5 w-full h-[52px] rounded-full bg-[#0a0a0a] text-white font-semibold text-[15px] flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] active:scale-[0.98]">
        Få nøyaktig vurdering — gratis <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
      <p className="mt-3 text-[12px] text-[#aaa] text-center leading-relaxed">Estimat basert på markedsdata for Bergen. Du får en konkret vurdering av nettopp din bolig — umiddelbart.</p>
    </div>
  );
}
