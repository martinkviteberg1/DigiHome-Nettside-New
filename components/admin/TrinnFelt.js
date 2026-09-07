'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   TrinnFelt — trinn på et beløp gjennom perioden: [{fraMnd, <felt>}].
   Brukes for faste kostnader (AI-native utvikling 30 → 35 → 40 → 45 k), grunnlegger-
   lønn (brutto per måned i trinn) og Techs «kunder»-plan (nye kunder per måned).
   Kompakt: én linje per trinn (måned-velger + beløp), «+ trinn» legger til neste
   år. Kortet regner ikke — motoren (rensTrinn/trinnVerdi) er sannheten.
   ───────────────────────────────────────────────────────────────────────────── */

import React from 'react';
import { Plus, X } from 'lucide-react';

const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y: y || 0, m0: (m || 1) - 1 }; };
export const mndEtikett = (startYm, fraMnd) => {
  if (!startYm) return `mnd ${fraMnd}`;
  const { y, m0 } = ymDeler(startYm); const t = y * 12 + m0 + (fraMnd - 1);
  return `${MND[t % 12]} ${String(Math.floor(t / 12)).slice(2)}`;
};
const visTall = (v) => {
  const s = String(v ?? '').trim(); if (s === '') return '';
  const n = Number(s.replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n.toLocaleString('nb-NO', { maximumFractionDigits: 1 }).replace(/\u00A0/g, ' ') : s;
};

export default function TrinnFelt({ verdi, onEndre, felt = 'belop', enhet = 'kr/mnd', startYm, antallMnd = 36, readOnly = false, testid = 'trinn', tom = 'Ingen trinn — grunnverdien gjelder hele perioden', heltall = true, minFra = 1 }) {
  const trinn = Array.isArray(verdi) ? verdi : [];
  const set = (liste) => !readOnly && onEndre(liste);
  const endre = (i, patch) => set(trinn.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const fjern = (i) => set(trinn.filter((_, j) => j !== i));
  const leggTil = () => {
    const siste = trinn.length ? trinn[trinn.length - 1] : null;
    // Neste trinn: 12 måneder etter forrige (årlig justering), ellers første januar / måned minFra
    let fra = siste ? Math.min(antallMnd, Number(siste.fraMnd) + 12) : minFra;
    if (trinn.some((t) => Number(t.fraMnd) === fra)) fra = Math.min(antallMnd, fra + 1);
    set([...trinn, { fraMnd: fra, [felt]: siste ? siste[felt] : '' }]);
  };
  const maaneder = Array.from({ length: Math.max(1, antallMnd) }, (_, i) => i + 1).filter((n) => n >= minFra);
  return (
    <div className="mt-1 rounded-[10px] bg-[#f5f4f1] px-2.5 py-2" data-testid={testid}>
      {!trinn.length && <p className="text-[10.5px] leading-snug text-[#a6a19a]">{tom}</p>}
      {trinn.map((t, i) => (
        <div key={i} className="flex items-center gap-1.5 py-[3px]" data-testid={`${testid}-rad-${i}`}>
          <span className="w-6 shrink-0 text-[10.5px] text-[#a6a19a]">fra</span>
          {readOnly ? <span className="w-[74px] text-[12px] font-semibold text-[#1c1917]">{mndEtikett(startYm, t.fraMnd)}</span> : (
            <select value={t.fraMnd} onChange={(e) => endre(i, { fraMnd: Number(e.target.value) })} data-testid={`${testid}-fra-${i}`}
              className="h-7 w-[84px] rounded-[7px] bg-white px-1.5 text-[12px] font-semibold text-[#1c1917] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(109,40,217,0.45)]">
              {maaneder.map((n) => <option key={n} value={n}>{mndEtikett(startYm, n)}</option>)}
            </select>
          )}
          {readOnly ? <span className="ml-auto text-[12.5px] font-semibold text-[#1c1917]">{visTall(t[felt])}</span> : (
            <input value={visTall(t[felt])} inputMode={heltall ? 'numeric' : 'decimal'} data-testid={`${testid}-belop-${i}`}
              onChange={(e) => endre(i, { [felt]: heltall ? e.target.value.replace(/[^\d]/g, '') : e.target.value.replace(/[^\d,.]/g, '') })}
              className="ml-auto h-7 w-[84px] rounded-[7px] bg-white px-2 text-right text-[12.5px] font-semibold text-[#1c1917] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(109,40,217,0.45)]" />
          )}
          <span className="w-12 shrink-0 text-[10.5px] text-[#a6a19a]">{enhet}</span>
          {!readOnly && <button type="button" onClick={() => fjern(i)} aria-label="Fjern trinn" data-testid={`${testid}-fjern-${i}`} className="rounded-full p-0.5 text-[#a6a19a] hover:bg-white hover:text-[#1c1917]"><X className="h-3 w-3" /></button>}
        </div>
      ))}
      {!readOnly && (
        <button type="button" onClick={leggTil} data-testid={`${testid}-legg-til`} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-[#6d28d9] hover:underline">
          <Plus className="h-3 w-3" /> {trinn.length ? 'Nytt trinn (+12 mnd)' : 'Legg til trinn'}
        </button>
      )}
    </div>
  );
}
