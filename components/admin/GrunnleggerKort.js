'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   GrunnleggerKort — lønn til gründerne i forutsetningsrailen (Digihome AS og Tech).
     · av/på, arbeidsgiverpåslag
     · per person: navn, (Tech) rolle for SaaS-klassifisering, DETTE selskapets andel
       av lønnen, brutto per måned i trinn (f.eks. 30 k fra okt 26 → 35 k fra jan 27 …)
   Kortet regner ikke selv — motoren (grunnleggerKost) er sannheten; tallene som
   vises (nå / i perioden) kommer inn som props.
   ───────────────────────────────────────────────────────────────────────────── */

import React from 'react';
import { Users, Plus, X } from 'lucide-react';
import TrinnFelt from '@/components/admin/TrinnFelt';
import { GRUNNLEGGER_ROLLER } from '@/lib/budsjett-modell';

const kr0 = (n) => Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00A0/g, ' ');
const Inp = ({ verdi, onEndre, readOnly, testid, className = 'w-[56px]' }) => (
  readOnly ? <span className="text-[13px] font-semibold text-[#1c1917]">{verdi}</span>
    : <input value={verdi ?? ''} inputMode="decimal" data-testid={testid} onChange={(e) => onEndre(e.target.value.replace(/[^\d,.]/g, ''))}
        className={`h-7 ${className} rounded-[7px] bg-white px-2 text-right text-[13px] font-semibold text-[#1c1917] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(109,40,217,0.45)]`} />
);

export default function GrunnleggerKort({ verdi, onEndre, readOnly = false, startYm, antallMnd, medRolle = false, naaPerMnd = null, iPerioden = null, selskapNavn = 'dette selskapet', testid = 'grunnleggere' }) {
  const g = verdi || {};
  const paa = g.paa === true;
  const personer = Array.isArray(g.personer) ? g.personer : [];
  const set = (patch) => !readOnly && onEndre({ ...g, ...patch });
  const setPerson = (i, patch) => set({ personer: personer.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const fjern = (i) => set({ personer: personer.filter((_, j) => j !== i) });
  const leggTil = () => set({ personer: [...personer, { navn: `Grunnlegger ${personer.length + 1}`, rolle: medRolle ? 'rd' : 'drift', andelPct: 50, trinn: [{ fraMnd: 1, brutto: 35000 }] }] });
  return (
    <div className={`mt-1 rounded-[12px] px-3 py-2.5 transition-colors ${paa ? 'bg-[#f6f2fd] shadow-[inset_0_0_0_1px_rgba(109,40,217,0.14)]' : 'bg-[#f5f4f1]'}`} data-testid={testid}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-start gap-2">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] ${paa ? 'bg-[#6d28d9] text-white' : 'bg-white text-[#a6a19a]'}`}><Users className="h-3.5 w-3.5" /></span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold text-[#1c1917]">Grunnleggere</span>
            <span className="block text-[10.5px] leading-snug text-[#8f8a82]">Lønn i trinn, fordelt mellom selskapene — {selskapNavn} bærer sin andel</span>
          </span>
        </span>
        <button type="button" onClick={() => set({ paa: !paa })} disabled={readOnly} aria-pressed={paa} data-testid={`${testid}-toggle`}
          className={`relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${paa ? 'bg-[#6d28d9]' : 'bg-[#d6d3cd]'} ${readOnly ? 'opacity-60' : ''}`}>
          <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${paa ? 'left-[18px]' : 'left-[3px]'}`} />
        </button>
      </div>

      {paa && (
        <div className="mt-2 border-t border-[#6d28d9]/10 pt-1">
          <div className="flex items-center justify-between py-[5px]">
            <span className="text-[12.5px] text-[#57534e]">Arbeidsgiverpåslag</span>
            <span className="flex items-center gap-1.5"><Inp verdi={g.paslagPct} onEndre={(v) => set({ paslagPct: v })} readOnly={readOnly} testid={`${testid}-paslag`} /><span className="w-11 text-[10.5px] text-[#a6a19a]">%</span></span>
          </div>
          {personer.map((p, i) => (
            <div key={i} className="mt-1.5 rounded-[10px] bg-white/70 px-2.5 py-2" data-testid={`${testid}-person-${i}`}>
              <div className="flex items-center gap-1.5">
                {readOnly ? <span className="text-[12.5px] font-bold text-[#1c1917]">{p.navn}</span> : (
                  <input value={p.navn ?? ''} onChange={(e) => setPerson(i, { navn: e.target.value })} data-testid={`${testid}-navn-${i}`}
                    className="h-7 min-w-0 flex-1 rounded-[7px] bg-white px-2 text-[12.5px] font-bold text-[#1c1917] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] outline-none focus:shadow-[inset_0_0_0_1px_rgba(109,40,217,0.45)]" />
                )}
                {medRolle && (readOnly ? <span className="text-[10.5px] text-[#8f8a82]">{GRUNNLEGGER_ROLLER.find(([id]) => id === p.rolle)?.[1]}</span> : (
                  <select value={p.rolle} onChange={(e) => setPerson(i, { rolle: e.target.value })} data-testid={`${testid}-rolle-${i}`}
                    className="h-7 w-[104px] rounded-[7px] bg-white px-1 text-[11px] font-semibold text-[#57534e] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] outline-none">
                    {GRUNNLEGGER_ROLLER.map(([id, l]) => <option key={id} value={id}>{l}</option>)}
                  </select>
                ))}
                {!readOnly && personer.length > 1 && <button type="button" onClick={() => fjern(i)} aria-label="Fjern person" data-testid={`${testid}-fjern-${i}`} className="rounded-full p-0.5 text-[#a6a19a] hover:bg-white hover:text-[#1c1917]"><X className="h-3 w-3" /></button>}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[12px] text-[#57534e]">Andel på {selskapNavn}</span>
                <span className="flex items-center gap-1.5"><Inp verdi={p.andelPct} onEndre={(v) => setPerson(i, { andelPct: v })} readOnly={readOnly} testid={`${testid}-andel-${i}`} /><span className="w-11 text-[10.5px] text-[#a6a19a]">%</span></span>
              </div>
              <p className="mt-1.5 text-[11px] text-[#57534e]">Brutto månedslønn (100 %)</p>
              <TrinnFelt verdi={p.trinn} onEndre={(t) => setPerson(i, { trinn: t })} felt="brutto" enhet="kr/mnd" startYm={startYm} antallMnd={antallMnd} readOnly={readOnly} testid={`${testid}-trinn-${i}`} tom="Ingen lønn lagt inn — legg til første trinn" />
            </div>
          ))}
          {!readOnly && personer.length < 6 && (
            <button type="button" onClick={leggTil} data-testid={`${testid}-legg-til`} className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#6d28d9] hover:underline"><Plus className="h-3 w-3" /> Legg til person</button>
          )}
          {(naaPerMnd != null || iPerioden != null) && (
            <p className="mt-2 border-t border-[#6d28d9]/10 pt-2 text-[10.5px] leading-snug text-[#6d28d9]">
              {naaPerMnd != null && <>Nå: <b>{kr0(naaPerMnd)} kr/mnd</b> inkl. påslag</>}
              {naaPerMnd != null && iPerioden != null && ' · '}
              {iPerioden != null && <><b>{kr0(iPerioden)} kr</b> i perioden</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
