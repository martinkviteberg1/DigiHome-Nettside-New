'use client';

/* Fakturaer — historikk over alle frosne måneder og PowerOffice-utkast. */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, CheckCircle2, ArrowUpRight, ChevronRight, FileText, Loader2 } from 'lucide-react';
import { LILLA, fmt, fmtV, kr, mndLabel, datoNb, Kort, Pille, MiljøPille, Tomt, th, thR, td, tdR } from './felles';
import { FakturaSkuff } from './FakturaPanel';

export default function Fakturaer({ q, data, tick, onEndret }) {
  const [liste, setListe] = useState(null);
  const [aar, setAar] = useState('');
  const [laster, setLaster] = useState(true);
  const [valgt, setValgt] = useState(null); // { kundeId, maaned }
  const [kundeFilter, setKundeFilter] = useState('');

  const last = useCallback(async () => {
    setLaster(true);
    try { const r = await fetch(`/api/admin/fakturering/fakturaer?${q}${aar ? `&aar=${aar}` : ''}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) setListe(d); } catch (e) {}
    setLaster(false);
  }, [q, aar]);
  useEffect(() => { last(); }, [last, tick]);

  const rader = useMemo(() => (liste?.fakturaer || []).filter((f) => !kundeFilter || f.kundeId === kundeFilter), [liste, kundeFilter]);
  const sum = rader.reduce((a, r) => ({ eks: a.eks + r.sumEksMva, ink: a.ink + r.sumInkMva }), { eks: 0, ink: 0 });
  const planFor = (id) => (data?.planer || []).find((p) => p.id === id) || (data?.planer || []).find((p) => p.standard) || (data?.planer || [])[0];
  const valgtKunde = valgt ? (data?.kunder || []).find((k) => k.id === valgt.kundeId) : null;

  // Grupper per måned for rolig lesing
  const grupper = useMemo(() => { const m = new Map(); for (const r of rader) { if (!m.has(r.maaned)) m.set(r.maaned, []); m.get(r.maaned).push(r); } return [...m.entries()]; }, [rader]);

  return (
    <div className="mt-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-xl bg-black/[0.04] p-1">
          {[{ v: '', l: 'Alle år' }, ...((liste?.aarListe || []).map((a) => ({ v: a, l: a })))].map((o) => (
            <button key={o.v} onClick={() => setAar(o.v)} className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${aar === o.v ? 'bg-white text-black/90 shadow-sm' : 'text-black/50 hover:text-black/80'}`}>{o.l}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={kundeFilter} onChange={(e) => setKundeFilter(e.target.value)} className="rounded-lg border border-black/[0.1] bg-white py-1.5 pl-3 pr-8 text-[12.5px] font-medium outline-none">
            <option value="">Alle kunder</option>
            {(data?.kunder || []).map((k) => <option key={k.id} value={k.id}>{k.navn}</option>)}
          </select>
          {laster ? <Loader2 className="h-4 w-4 animate-spin text-black/35" /> : null}
        </div>
      </div>

      {!laster && !rader.length ? (
        <Tomt ikon={FileText} tittel="Ingen fakturaer ennå" tekst="Når du fryser et grunnlag eller oppretter et PowerOffice-utkast i Månedskjøring, dukker det opp her." />
      ) : (
        <Kort className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px]">
              <thead className="bg-black/[0.02]">
                <tr className="border-b border-black/[0.06]">
                  <th className={th}>Måned</th>
                  <th className={th}>Kunde</th>
                  <th className={thR}>Enheter</th>
                  <th className={thR}>Eks. mva</th>
                  <th className={thR}>Inkl. mva</th>
                  <th className={th}>Grunnlag</th>
                  <th className={th}>PowerOffice</th>
                  <th className={`${th} text-right`}></th>
                </tr>
              </thead>
              <tbody>
                {grupper.map(([mnd, rows]) => rows.map((r, i) => (
                  <tr key={`${r.kundeId}|${r.maaned}`} onClick={() => setValgt({ kundeId: r.kundeId, maaned: r.maaned })} className="cursor-pointer border-b border-black/[0.04] last:border-0 hover:bg-black/[0.015]">
                    <td className={`${td} whitespace-nowrap font-medium text-black/80`}>{i === 0 ? mndLabel(mnd) : ''}</td>
                    <td className={`${td} font-medium text-black/85`}>{r.kundeNavn}{r.planNavn ? <span className="block text-[11.5px] font-normal text-black/40">{r.planNavn}</span> : null}</td>
                    <td className={tdR}>{r.antallEnheter ? <>{fmt(r.antallEnheter)}{r.vektet != null && r.vektet !== r.antallEnheter ? <span className="block text-[11px] text-black/40">vektet {fmtV(r.vektet)}</span> : null}</> : <span className="text-black/35" title="Utkast fra før enhetsantall ble lagret">—</span>}</td>
                    <td className={`${tdR} font-semibold text-black/85`}>{kr(r.sumEksMva)}</td>
                    <td className={`${tdR} text-black/55`}>{kr(r.sumInkMva)}</td>
                    <td className={td}>{r.laast ? <Pille farge="#065f46" bg="rgba(5,150,105,0.12)"><Lock className="h-3 w-3" /> Låst {datoNb(r.laast.tid)}</Pille> : <Pille>ikke frosset</Pille>}</td>
                    <td className={td}>{r.utkast ? <span className="flex items-center gap-1.5"><Pille farge="#065f46" bg="rgba(5,150,105,0.12)"><CheckCircle2 className="h-3 w-3" /> Utkast{r.utkast.poOrderNo ? ` #${r.utkast.poOrderNo}` : ''}</Pille><MiljøPille env={r.utkast.env} />{r.utkast.gui ? <a href={r.utkast.gui} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-black/40 hover:text-black/70"><ArrowUpRight className="h-3.5 w-3.5" /></a> : null}</span> : <span className="text-[12px] text-black/40">—</span>}</td>
                    <td className={`${td} text-right`}><span className="inline-flex items-center gap-1 text-[12.5px] font-medium" style={{ color: LILLA }}>Åpne <ChevronRight className="h-3.5 w-3.5" /></span></td>
                  </tr>
                )))}
              </tbody>
              {rader.length > 1 ? (
                <tfoot><tr className="border-t border-black/[0.08] bg-black/[0.015]"><td className={`${td} font-semibold text-black/70`} colSpan={3}>Sum ({rader.length} faktura{rader.length === 1 ? '' : 'er'})</td><td className={`${tdR} font-semibold text-black/85`}>{kr(sum.eks)}</td><td className={`${tdR} text-black/55`}>{kr(sum.ink)}</td><td colSpan={3} /></tr></tfoot>
              ) : null}
            </table>
          </div>
        </Kort>
      )}

      {valgtKunde ? <FakturaSkuff q={q} kunde={valgtKunde} plan={planFor(valgtKunde.planId)} maaned={valgt.maaned} onLukk={() => setValgt(null)} onEndret={() => { last(); if (onEndret) onEndret(); }} /> : null}
    </div>
  );
}
