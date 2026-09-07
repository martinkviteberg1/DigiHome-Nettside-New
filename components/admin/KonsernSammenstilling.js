'use client';
/* ─────────────────────────────────────────────────────────────────────────────
   KonsernSammenstilling — Konsern-visningen i Budsjett.

   Ikke et eget budsjett, men en SAMMENSTILLING: ett Digihome AS-budsjett + ett
   Digihome Tech AS-budsjett (helst samme periode). Plattformlisensen elimineres
   på begge sider; avvik mellom Techs pris og det Digihome AS budsjetterer i
   systemkost vises som styringssignal. Alt regnes live i nettleseren.
   ───────────────────────────────────────────────────────────────────────────── */
import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Info, ArrowRight } from 'lucide-react';
import { beregnInvestorModell, beregnTech, beregnKonsernSammenstilling } from '@/lib/budsjett-modell';
import { SelskapMerke } from '@/components/admin/SelskapOkonomi';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const MND = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
const MND_LANG = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const ymDeler = (ym) => { const [y, m] = String(ym || '').split('-').map(Number); return { y, m }; };
const ymPluss = (ym, i) => { const { y, m } = ymDeler(ym); const t = y * 12 + (m - 1) + i; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const mndKort = (ym) => { const { y, m } = ymDeler(ym); return `${MND[m - 1]}. ${String(y).slice(2)}`; };
const mndLang = (ym) => { const { y, m } = ymDeler(ym); return `${MND_LANG[m - 1]} ${y}`; };
const stor = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const kr = (n) => `${Math.round(Number(n) || 0).toLocaleString('nb-NO').replace(/\u00A0/g, ' ')} kr`;
const krS = (n) => `${(Number(n) || 0) < 0 ? '−' : ''}${Math.abs(Math.round(Number(n) || 0)).toLocaleString('nb-NO').replace(/\u00A0/g, ' ')} kr`;
const tall = (n, d = 0) => (Number(n) || 0).toLocaleString('nb-NO', { maximumFractionDigits: d }).replace(/\u00A0/g, ' ');
const LAGER = 'dh_konsern_valg';

const Kpi = ({ label, verdi, under, tone, testid }) => (
  <div className="rounded-[16px] bg-white p-4 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid={testid}>
    <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">{label}</p>
    <p className={`mt-1.5 text-[21px] font-bold tracking-[-0.02em] whitespace-nowrap ${tone === 'pos' ? 'text-[#0a7d55]' : tone === 'neg' ? 'text-[#b3261e]' : tone === 'lilla' ? 'text-[#6d28d9]' : 'text-[#1c1917]'}`} style={heading}>{verdi}</p>
    {under && <p className="mt-1 text-[11.5px] text-[#a6a19a]">{under}</p>}
  </div>
);

function KonsernGraf({ k, startYm }) {
  const N = k.N; const W = 920; const H = 280; const padL = 48; const padR = 12; const padT = 18; const padB = 30;
  const maks = Math.max(1, ...k.inntekt, ...k.kost) * 1.08;
  const x = (i) => padL + ((W - padL - padR) * (i + 0.5)) / N;
  const y = (v) => padT + (H - padT - padB) * (1 - v / maks);
  const bw = ((W - padL - padR) / N) * 0.62;
  const be = k.sammendrag.breakEvenIdx;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Konsernets inntekt per selskap og kostnader" data-testid="konsern-graf">
      {[0.25, 0.5, 0.75, 1].map((f) => <g key={f}><line x1={padL} x2={W - padR} y1={y(maks * f)} y2={y(maks * f)} stroke="rgba(0,0,0,0.06)" /><text x={padL - 6} y={y(maks * f) + 4} textAnchor="end" fontSize="10" fill="#b5b0a8">{maks * f >= 1e6 ? `${(maks * f / 1e6).toFixed(1)} M` : `${Math.round(maks * f / 1000)} k`}</text></g>)}
      {Array.from({ length: N }, (_, i) => {
        const dh = k.digihome.inntekt[i]; const te = Math.max(0, k.tech.inntekt[i] - k.lisens[i]);
        return <g key={i}><rect x={x(i) - bw / 2} y={y(dh)} width={bw} height={Math.max(0, y(0) - y(dh))} fill="#1c1917" opacity="0.85" /><rect x={x(i) - bw / 2} y={y(dh + te)} width={bw} height={Math.max(0, y(dh) - y(dh + te))} fill="#8b5cf6" opacity="0.85" /></g>;
      })}
      <polyline fill="none" stroke="#B3261E" strokeWidth="1.8" strokeDasharray="4 3" strokeLinejoin="round" points={k.kost.map((v, i) => `${x(i)},${y(v)}`).join(' ')} />
      {be != null && <g><line x1={x(be)} x2={x(be)} y1={padT} y2={H - padB} stroke="#0a7d55" strokeWidth="1" strokeDasharray="3 3" /><text x={x(be)} y={padT - 4} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0a7d55">Break-even konsern</text></g>}
      {Array.from({ length: N }, (_, i) => i).filter((i) => i % (N > 24 ? 6 : N > 12 ? 3 : 2) === 0 || i === N - 1).map((i) => <text key={`t${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="#b5b0a8">{mndKort(ymPluss(startYm, i))}</text>)}
    </svg>
  );
}

export default function KonsernSammenstilling({ planer, api, onAapne }) {
  const dhListe = useMemo(() => (planer || []).filter((p) => p.selskap !== 'tech' && p.type === 'modell'), [planer]);
  const techListe = useMemo(() => (planer || []).filter((p) => p.selskap === 'tech'), [planer]);
  const [dhId, setDhId] = useState(''); const [techId, setTechId] = useState('');
  const [dhPlan, setDhPlan] = useState(null); const [techPlan, setTechPlan] = useState(null);
  const [laster, setLaster] = useState(false); const [feil, setFeil] = useState('');

  // Startvalg: lagret valg → ellers Tech-budsjettets koblede Digihome AS-budsjett → ellers vedtatt/nyeste.
  useEffect(() => {
    let lagret = {}; try { lagret = JSON.parse(localStorage.getItem(LAGER) || '{}') || {}; } catch (e) { lagret = {}; }
    const t = techListe.find((p) => p.id === lagret.techId) || techListe.find((p) => p.status === 'vedtatt') || techListe[0] || null;
    const d = dhListe.find((p) => p.id === lagret.dhId) || (t?.kobletPlanId ? dhListe.find((p) => p.id === t.kobletPlanId) : null) || dhListe.find((p) => p.status === 'vedtatt') || dhListe[0] || null;
    setTechId(t?.id || ''); setDhId(d?.id || '');
  }, [dhListe, techListe]);
  useEffect(() => { try { if (dhId || techId) localStorage.setItem(LAGER, JSON.stringify({ dhId, techId })); } catch (e) { /* ok */ } }, [dhId, techId]);

  useEffect(() => {
    let avbrutt = false;
    (async () => {
      setLaster(true); setFeil('');
      try {
        const [a, b] = await Promise.all([dhId ? api(`plan?id=${encodeURIComponent(dhId)}`) : null, techId ? api(`plan?id=${encodeURIComponent(techId)}`) : null]);
        if (avbrutt) return;
        setDhPlan(a?.plan || null); setTechPlan(b?.plan || null);
      } catch (e) { if (!avbrutt) setFeil(e.message); }
      if (!avbrutt) setLaster(false);
    })();
    return () => { avbrutt = true; };
  }, [dhId, techId, api]);

  const k = useMemo(() => {
    if (!dhPlan || !techPlan) return null;
    const N = Math.min(dhPlan.antallMnd, techPlan.antallMnd);
    // Periodene må starte likt for at måned t skal være samme måned — ellers forskyver vi Tech.
    const { y: dy, m: dm } = ymDeler(dhPlan.startYm); const { y: ty, m: tm } = ymDeler(techPlan.startYm);
    const offset = (ty * 12 + tm) - (dy * 12 + dm);
    const mF = beregnInvestorModell({ antallMnd: dhPlan.antallMnd, fakta: dhPlan.fakta, drivere: dhPlan.drivere, startYm: dhPlan.startYm });
    const mT = beregnTech({ antallMnd: techPlan.antallMnd, drivere: techPlan.tech, fakta: techPlan.fakta || {} });
    const skyv = (arr) => (offset === 0 ? arr : Array.from({ length: arr.length }, (_, i) => { const j = i - offset; return j >= 0 && j < arr.length ? arr[j] : 0; }));
    const mT2 = offset === 0 ? mT : { ...mT, inntekt: { total: skyv(mT.inntekt.total), forvaltning: skyv(mT.inntekt.forvaltning) }, kostSum: skyv(mT.kostSum) };
    return { k: beregnKonsernSammenstilling({ forvaltning: mF, tech: mT2, antallMnd: N }), N, offset, startYm: dhPlan.startYm, mF, mT };
  }, [dhPlan, techPlan]);

  const Velger = ({ label, verdi, onChange, liste, selskap, testid }) => (
    <label className="block min-w-0 flex-1">
      <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.07em] text-[#a6a19a]"><SelskapMerke id={selskap} storrelse={16} /> {label}</span>
      <select value={verdi} onChange={(e) => onChange(e.target.value)} data-testid={testid} className="mt-1 h-9 w-full rounded-[9px] border border-black/[0.08] bg-white px-2.5 text-[13.5px] font-medium text-[#1c1917] outline-none focus:border-[#1c1917]/25">
        {liste.length === 0 && <option value="">Ingen budsjetter ennå</option>}
        {liste.map((p) => <option key={p.id} value={p.id}>{p.navn} · {mndKort(p.startYm)} · {p.antallMnd} mnd{p.status === 'vedtatt' ? ' · vedtatt' : ''}</option>)}
      </select>
    </label>
  );

  return (
    <div className="mt-5 space-y-3" data-testid="konsern-sammenstilling">
      <div className="rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
        <p className="text-[14px] font-bold text-[#1c1917]" style={heading}>Sammenstilling</p>
        <p className="mt-0.5 text-[12.5px] text-[#8f8a82]">Konsernet er ikke et eget budsjett — det er Digihome AS + Digihome Tech AS med plattformlisensen eliminert. Velg ett budsjett fra hvert selskap.</p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Velger label="Digihome AS" verdi={dhId} onChange={setDhId} liste={dhListe} selskap="digihome" testid="konsern-velg-dh" />
          <Velger label="Digihome Tech AS" verdi={techId} onChange={setTechId} liste={techListe} selskap="tech" testid="konsern-velg-tech" />
        </div>
        {techListe.length === 0 && <p className="mt-3 text-[12.5px] text-[#8f8a82]">Lag et Tech-budsjett under <span className="font-semibold text-[#6d28d9]">Digihome Tech AS</span> for å se konsernbildet.</p>}
        {k && k.offset !== 0 && <p className="mt-3 text-[12px] text-[#b3261e]">Budsjettene starter i ulike måneder ({mndKort(dhPlan.startYm)} vs {mndKort(techPlan.startYm)}) — Tech er forskjøvet så månedene stemmer; månedene uten Tech-tall vises som 0.</p>}
        {feil && <p className="mt-3 text-[12.5px] text-[#b3261e]">{feil}</p>}
      </div>

      {laster && !k ? <p className="flex items-center gap-2 px-1 text-[13px] text-[#8f8a82]"><Loader2 className="h-4 w-4 animate-spin" /> Regner konsernet…</p> : null}

      {k && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Kpi label="Konsernresultat" verdi={krS(k.k.sammendrag.resultat)} tone={k.k.sammendrag.resultat >= 0 ? 'pos' : 'neg'} under={`${k.N} mnd fra ${mndKort(k.startYm)}`} testid="konsern-kpi-resultat" />
            <Kpi label="Break-even konsern" verdi={k.k.sammendrag.breakEvenIdx != null ? stor(mndLang(ymPluss(k.startYm, k.k.sammendrag.breakEvenIdx))) : 'Utenfor perioden'} under={`Digihome AS ${k.k.digihome.breakEvenIdx != null ? mndKort(ymPluss(k.startYm, k.k.digihome.breakEvenIdx)) : '—'} · Tech ${k.k.tech.breakEvenIdx != null ? mndKort(ymPluss(k.startYm, k.k.tech.breakEvenIdx)) : '—'}`} testid="konsern-kpi-be" />
            <Kpi label="Kapitalbehov konsern" verdi={kr(k.k.sammendrag.kapitalbehov)} under={`Digihome AS ${kr(k.k.digihome.kapitalbehov)} · Tech ${kr(k.k.tech.kapitalbehov)}`} testid="konsern-kpi-kapital" />
            <Kpi label="Eliminert lisens" verdi={kr(k.k.sammendrag.eliminert)} under={k.k.sammendrag.avvikSum ? `Avvik mot Digihome AS-budsjettets systemkost: ${krS(k.k.sammendrag.avvikSum)}` : 'Stemmer med Digihome AS-budsjettets systemkost'} testid="konsern-kpi-elim" />
            <Kpi label="ARR ved slutt" verdi={kr(k.k.sammendrag.arrExit)} tone="lilla" under={`${k.k.sammendrag.andelTechEksternPct ?? 0} % fra eksterne Tech-kunder`} testid="konsern-kpi-arr" />
          </div>

          <div className="rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Konsernets inntekt <span className="font-medium normal-case tracking-normal">· eksterne kunder per selskap — lisensen er tatt ut</span></p>
              <p className="flex gap-4 text-[11.5px] text-[#8f8a82]"><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#1c1917]" /> Digihome AS</span><span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-[3px] bg-[#8b5cf6]" /> Tech · eksterne</span><span className="inline-flex items-center gap-1.5"><span className="inline-block h-[2px] w-4 border-t-2 border-dashed border-[#B3261E]" /> Kostnader</span></p>
            </div>
            <KonsernGraf k={k.k} startYm={k.startYm} />
          </div>

          <div className="overflow-x-auto rounded-[18px] bg-white p-5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]" data-testid="konsern-aar">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#a6a19a]">Per selskap og planår</p>
            <table className="w-full text-[13px]">
              <thead><tr className="text-[10.5px] uppercase tracking-wide text-[#a6a19a]"><th className="pb-2 text-left font-bold">År</th><th className="pb-2 text-right font-bold">Digihome AS</th><th className="pb-2 text-right font-bold">Tech</th><th className="pb-2 text-right font-bold">Eliminert</th><th className="pb-2 text-right font-bold">Konsern inntekt</th><th className="pb-2 text-right font-bold">Konsern kost</th><th className="pb-2 text-right font-bold">Resultat</th></tr></thead>
              <tbody>
                {k.k.aar.map((a) => (
                  <tr key={a.nr} className="border-t border-black/[0.05]">
                    <td className="py-2 font-semibold text-[#1c1917]">År {a.nr}</td>
                    <td className="py-2 text-right"><span className="text-[#57534e]">{kr(a.digihome.inntekt)}</span><span className={`ml-1.5 text-[11px] ${a.digihome.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{krS(a.digihome.resultat)}</span></td>
                    <td className="py-2 text-right"><span className="text-[#57534e]">{kr(a.tech.inntekt)}</span><span className={`ml-1.5 text-[11px] ${a.tech.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{krS(a.tech.resultat)}</span></td>
                    <td className="py-2 text-right text-[#a6a19a]">−{kr(a.eliminert)}</td>
                    <td className="py-2 text-right font-semibold text-[#1c1917]">{kr(a.inntekt)}</td>
                    <td className="py-2 text-right text-[#57534e]">{kr(a.kost)}</td>
                    <td className={`py-2 text-right font-semibold ${a.resultat >= 0 ? 'text-[#0a7d55]' : 'text-[#b3261e]'}`}>{krS(a.resultat)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-[11px] text-[#a6a19a]">Per selskap: inntekt · <span className="text-[#0a7d55]">resultat</span>. Lisensen er inntekt i Tech og kostnad i Digihome AS — i konsernet nuller den seg ut.</p>
          </div>

          <div className="flex flex-wrap gap-2 px-1">
            <button onClick={() => onAapne?.(dhId, 'digihome')} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#57534e] hover:text-[#1c1917]" data-testid="konsern-aapne-dh">Åpne Digihome AS-budsjettet <ArrowRight className="h-3.5 w-3.5" /></button>
            <span className="text-[#d6d1c9]">·</span>
            <button onClick={() => onAapne?.(techId, 'tech')} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#6d28d9] hover:text-[#4c1d95]" data-testid="konsern-aapne-tech">Åpne Tech-budsjettet <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </>
      )}
      <p className="flex items-start gap-1.5 px-1 text-[11.5px] text-[#a6a19a]"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Ingen felleskostnader er lagt inn i konsernet i dag. Når de kommer, fordeles de synlig per selskap her.</p>
    </div>
  );
}
