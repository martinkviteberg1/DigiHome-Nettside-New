'use client';

/* ─────────────────────────────────────────────────────────────────────────────
   PartnerKort — performance-partner i forutsetningsrailen (felles for Digihome
   AS og Tech). Et markedsføringsbyrå betalt på resultat:
     · fast månedshonorar
     · % av kundens løpende inntekt (honorar / abonnement) i kundens første
       N måneder — kohortbasert, følger churn
     · andel av nye kunder som tilskrives partneren, oppstartsmåned
     · (Tech) hvilke kundegrupper honoraret gjelder for
   Kortet regner ikke selv — det viser motorens tall (per kunde / i perioden).
   ───────────────────────────────────────────────────────────────────────────── */

import React from 'react';
import { Megaphone } from 'lucide-react';

const kma = (s) => String(s ?? '').replace('.', ',');
const visTall = (v) => {
  const s = String(v ?? '').trim();
  if (s === '') return '';
  const n = Number(s.replace(/[\s\u00a0]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n).toLocaleString('nb-NO') : s;
};
const kr0 = (n) => Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00A0/g, ' ');

const Rad = ({ label, children, hint }) => (
  <div className="py-[5px]">
    <div className="flex items-center justify-between gap-3">
      <span className="min-w-0 text-[12.5px] leading-tight text-[#57534e]">{label}</span>
      <span className="flex shrink-0 items-center gap-1.5">{children}</span>
    </div>
    {hint && <p className="mt-0.5 text-[10.5px] leading-snug text-[#a6a19a]">{hint}</p>}
  </div>
);

const Inp = ({ verdi, onEndre, bred, heltall, readOnly, testid }) => (
  readOnly
    ? <span className="text-[13px] font-semibold text-[#1c1917]">{heltall ? visTall(verdi) : kma(verdi)}</span>
    : <input value={heltall ? visTall(verdi) : (verdi ?? '')} inputMode={heltall ? 'numeric' : 'decimal'} data-testid={testid}
        onChange={(e) => onEndre(heltall ? e.target.value.replace(/[^\d]/g, '') : e.target.value)}
        className={`h-7 ${bred ? 'w-[96px]' : 'w-[64px]'} rounded-[7px] bg-white px-2 text-right text-[13px] font-semibold text-[#1c1917] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] outline-none transition-all focus:shadow-[inset_0_0_0_1px_rgba(109,40,217,0.45)]`} />
);

export default function PartnerKort({ verdi, onEndre, readOnly = false, grupper = null, perKunde = null, iPerioden = null, andelPct = null, enhetsnavn = 'kunde', testid = 'partner' }) {
  const p = verdi || {};
  const paa = p.paa === true;
  const set = (patch) => !readOnly && onEndre({ ...p, ...patch });
  const varigheter = [[6, '6'], [12, '12'], [24, '24'], [0, 'Livstid']];
  const egen = !varigheter.some(([n]) => n === Number(p.varighetMnd));
  return (
    <div className={`mt-1 rounded-[12px] px-3 py-2.5 transition-colors ${paa ? 'bg-[#f6f2fd] shadow-[inset_0_0_0_1px_rgba(109,40,217,0.14)]' : 'bg-[#f5f4f1]'}`} data-testid={testid}>
      <div className="flex items-start justify-between gap-2">
        <span className="flex min-w-0 items-start gap-2">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] ${paa ? 'bg-[#6d28d9] text-white' : 'bg-white text-[#a6a19a]'}`}><Megaphone className="h-3.5 w-3.5" /></span>
          <span className="min-w-0">
            <span className="block text-[12.5px] font-bold text-[#1c1917]">Performance-partner</span>
            <span className="block text-[10.5px] leading-snug text-[#8f8a82]">Byrå på resultat — fast honorar + andel av {enhetsnavn === 'enhet' ? 'honoraret' : 'abonnementet'} de første månedene</span>
          </span>
        </span>
        <button type="button" onClick={() => set({ paa: !paa })} disabled={readOnly} aria-pressed={paa} data-testid={`${testid}-toggle`}
          className={`relative mt-0.5 h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${paa ? 'bg-[#6d28d9]' : 'bg-[#d6d3cd]'} ${readOnly ? 'opacity-60' : ''}`}>
          <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white shadow transition-all ${paa ? 'left-[18px]' : 'left-[3px]'}`} />
        </button>
      </div>

      {paa && (
        <div className="mt-2 border-t border-[#6d28d9]/10 pt-1">
          <Rad label="Fast honorar">
            <Inp verdi={p.fastPerMnd} onEndre={(v) => set({ fastPerMnd: v })} bred heltall readOnly={readOnly} testid={`${testid}-fast`} />
            <span className="w-11 text-[10.5px] text-[#a6a19a]">kr/mnd</span>
          </Rad>
          <Rad label={`Honorar av ${enhetsnavn === 'enhet' ? 'honoraret' : 'abonnementet'}`}>
            <Inp verdi={p.honorarPct} onEndre={(v) => set({ honorarPct: v })} readOnly={readOnly} testid={`${testid}-pct`} />
            <span className="w-11 text-[10.5px] text-[#a6a19a]">%</span>
          </Rad>
          <Rad label={`Varighet per ny ${enhetsnavn}`} hint={egen ? `Egendefinert: ${p.varighetMnd} mnd` : null}>
            <span className="flex items-center gap-0.5 rounded-[7px] bg-white p-0.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
              {varigheter.map(([n, l]) => (
                <button key={n} type="button" disabled={readOnly} onClick={() => set({ varighetMnd: n })} data-testid={`${testid}-varighet-${n}`}
                  className={`h-6 rounded-[5px] px-1.5 text-[11px] font-bold transition-all ${Number(p.varighetMnd) === n ? 'bg-[#1c1917] text-white' : 'text-[#8f8a82] hover:text-[#1c1917]'}`}>{l}</button>
              ))}
            </span>
            <span className="w-11 text-[10.5px] text-[#a6a19a]">mnd</span>
          </Rad>
          <Rad label="Tilskrives partneren" hint="andel av nye kunder partneren får honorar for">
            <Inp verdi={p.andelNyePct} onEndre={(v) => set({ andelNyePct: v })} readOnly={readOnly} testid={`${testid}-andel`} />
            <span className="w-11 text-[10.5px] text-[#a6a19a]">% av nye</span>
          </Rad>
          <Rad label="Starter i måned">
            <Inp verdi={p.fraMnd} onEndre={(v) => set({ fraMnd: v })} readOnly={readOnly} testid={`${testid}-fra`} />
            <span className="w-11 text-[10.5px] text-[#a6a19a]">nr</span>
          </Rad>
          {grupper && (
            <div className="py-[5px]">
              <span className="block text-[12.5px] text-[#57534e]">Gjelder</span>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {grupper.map((g) => {
                  const aktiv = p.gjelder?.[g.id] !== false;
                  return (
                    <button key={g.id} type="button" disabled={readOnly} aria-pressed={aktiv} data-testid={`${testid}-gjelder-${g.id}`}
                      onClick={() => set({ gjelder: { ...(p.gjelder || {}), [g.id]: !aktiv } })}
                      className={`h-6 rounded-full px-2.5 text-[11px] font-bold transition-all ${aktiv ? 'bg-[#1c1917] text-white' : 'bg-white text-[#8f8a82] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] hover:text-[#1c1917]'}`}>{g.label}</button>
                  );
                })}
              </div>
            </div>
          )}
          {(perKunde != null || iPerioden != null) && (
            <p className="mt-1.5 border-t border-[#6d28d9]/10 pt-2 text-[10.5px] leading-snug text-[#6d28d9]">
              {perKunde != null && <>≈ <b>{kr0(perKunde)} kr</b> per ny {enhetsnavn} i honorar</>}
              {perKunde != null && iPerioden != null && ' · '}
              {iPerioden != null && <><b>{kr0(iPerioden)} kr</b> i perioden{andelPct != null ? ` (${andelPct} % av inntekten)` : ''}</>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
