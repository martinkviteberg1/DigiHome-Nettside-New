'use client';

// Interaktiv leiekalkulator — mikroforpliktelse som øker engasjement og
// sender brukeren videre til skjemaet med et konkret tall i hodet.
// Estimatet legges ved leadet (via 'lp:calc'-event) for bedre kvalifisering.
// UI i V4-drakt — logikk og 'lp:calc'-eventet er uendret.

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
const nok = (n) => n.toLocaleString('nb-NO').replace(/\u00a0/g, ' '); // vanlig mellomrom — display-fonten har bred hard mellomrom

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

  const INK = '#15130F';
  const DIM = 'rgba(21,19,15,0.62)';
  const SVAK = 'rgba(21,19,15,0.48)';
  const HAIR = 'rgba(21,19,15,0.12)';
  const display = { fontFamily: 'var(--font-heading), sans-serif', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.02 };
  const valg = (aktiv) => ({ background: aktiv ? INK : 'rgba(21,19,15,0.05)', color: aktiv ? '#F4F1EA' : 'rgba(21,19,15,0.75)', transition: 'background-color 220ms, color 220ms' });

  return (
    <div className="rounded-[20px] p-6 sm:p-8" style={{ background: '#EDEAE3' }} data-testid="lp-kalkulator">
      <p className="flex items-center gap-2 text-[13.5px] font-medium" style={{ color: SVAK }}>
        <TrendingUp className="h-4 w-4" strokeWidth={1.8} /> Leiekalkulator
      </p>

      {/* Område */}
      <div className="mt-6">
        <p className="mb-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}><MapPin className="h-3.5 w-3.5" strokeWidth={1.8} /> Hvor ligger boligen?</p>
        <div className="flex flex-wrap gap-2">
          {AREAS.map((a) => (
            <button key={a.name} type="button" onClick={() => setArea(a.name)} aria-pressed={area === a.name} className="h-9 rounded-full px-3.5 text-[13.5px] font-medium active:scale-[0.97]" style={valg(area === a.name)}>
              {a.name}
            </button>
          ))}
        </div>
      </div>

      {/* Soverom */}
      <div className="mt-6">
        <p className="mb-2.5 inline-flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.75)' }}><BedDouble className="h-3.5 w-3.5" strokeWidth={1.8} /> Antall soverom</p>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setBedrooms(n)} aria-pressed={bedrooms === n} aria-label={`${n === 4 ? '4 eller flere' : n} soverom`} className="h-11 rounded-[11px] text-[14.5px] font-medium active:scale-[0.97]" style={valg(bedrooms === n)}>
              {n === 4 ? '4+' : n}
            </button>
          ))}
        </div>
      </div>

      {/* Resultat — på hårlinjer */}
      <div className="mt-8 border-t" style={{ borderColor: HAIR }}>
        <div className="flex items-baseline justify-between py-3.5 text-[14px]" style={{ color: DIM }}>
          <span>Vanlig utleie</span>
          <span className="tabular-nums" style={{ color: INK }}>≈ {nok(est.traditional)} kr/mnd</span>
        </div>
        <div className="flex items-end justify-between gap-3 border-t py-4" style={{ borderColor: HAIR }}>
          <div>
            <p className="text-[13px]" style={{ color: SVAK }}>Med DigiHome</p>
            <p className="mt-1.5 text-[30px] tabular-nums sm:text-[36px]" style={{ ...display, color: INK }} data-testid="lp-kalk-estimat">
              {nok(est.low)}–{nok(est.high)} <span className="text-[15px]" style={{ color: SVAK, letterSpacing: 0 }}>kr/mnd</span>
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium" style={{ background: 'rgba(31,157,85,0.12)', color: '#1B7A45' }}>
            <TrendingUp className="h-3.5 w-3.5" strokeWidth={2} /> opptil +30 %
          </span>
        </div>
      </div>

      <button type="button" onClick={onCta} className="group mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition-transform active:scale-[0.98]" style={{ background: INK, color: '#F4F1EA' }} data-testid="lp-kalk-cta">
        Få nøyaktig vurdering — gratis <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
      </button>
      <p className="mt-3 text-center text-[12px] leading-relaxed" style={{ color: SVAK }}>
        Estimat basert på markedsdata for Bergen — et potensial, ikke en garanti. Du får en konkret vurdering av nettopp din bolig innen 24 timer.
      </p>
    </div>
  );
}
