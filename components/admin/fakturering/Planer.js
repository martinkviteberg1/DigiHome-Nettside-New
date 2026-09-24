'use client';

/* Prisplaner — priskatalog med volumtrinn og modellvalg. */

import React, { useState } from 'react';
import { Plus, Trash2, Save, CheckCircle2, Loader2, X, Layers } from 'lucide-react';
import { LILLA, BLEKK, fmt, kr, Kort, Felt, Nedtrekk, TrinnEditor, Tomt, LEDIG_VALG, ROM_VALG, romValgVerdi, romValgTilPlan, eksempelBelop, inputCls, knappPrimær } from './felles';

function Valgkort({ valg, verdi, onChange }) {
  return (
    <div className="mt-1.5 grid grid-cols-2 gap-2.5">
      {valg.map((o) => {
        const on = verdi === o.v;
        return <button key={o.v} type="button" onClick={() => onChange(o.v)} className="rounded-xl border p-3 text-left transition-all" style={{ borderColor: on ? LILLA : 'rgba(0,0,0,0.1)', background: on ? 'rgba(122,63,168,0.05)' : '#fff' }}><p className="text-[13px] font-semibold" style={{ color: on ? LILLA : BLEKK }}>{o.t}</p><p className="mt-0.5 text-[11.5px] leading-[1.45] text-black/45">{o.d}</p></button>;
      })}
    </div>
  );
}

export default function Planer({ q, data, onLagret }) {
  const [valgtId, setValgtId] = useState(null);
  const [utkast, setUtkast] = useState(null);
  const [lagrer, setLagrer] = useState(false);
  const [ok, setOk] = useState(false);
  const planer = data?.planer || [];
  const kunder = data?.kunder || [];

  const velg = (p) => { setValgtId(p.id); setUtkast({ ...p, trinn: p.trinn.map((t) => ({ ...t })) }); setOk(false); };
  const ny = () => { setValgtId('ny'); setUtkast({ navn: '', beskrivelse: '', prisModell: 'blandet', trinn: [{ fraEnheter: 0, pris: 200 }], trinnModell: 'progressiv', selvbetjentPris: 79, minstepris: 0, ledigFaktor: 100, romModell: 'rom', romFaktor: 100, aktiv: true, standard: false }); };
  const lukk = () => { setValgtId(null); setUtkast(null); };
  const lagre = async () => {
    if (!utkast?.navn) return; setLagrer(true);
    try { const r = await fetch(`/api/admin/pris/planer?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(utkast) }); const d = await r.json(); if (d.ok) { setOk(true); setTimeout(() => setOk(false), 2000); setValgtId(d.plan.id); setUtkast({ ...d.plan, trinn: d.plan.trinn.map((t) => ({ ...t })) }); onLagret(); } } catch (e) {}
    setLagrer(false);
  };
  const slett = async () => {
    if (!utkast?.id || !window.confirm(`Slette planen «${utkast.navn}»?`)) return;
    const r = await fetch(`/api/admin/pris/planer?${q}&id=${utkast.id}`, { method: 'DELETE' }); const d = await r.json();
    if (!d.ok) window.alert(d.feil || 'Kunne ikke slette'); else { lukk(); onLagret(); }
  };

  const eksempel = (() => {
    if (!utkast) return null;
    const sortert = [...(utkast.trinn || [])].map((t) => Number(t.fraEnheter) || 0).sort((a, b) => a - b);
    const grense = sortert.find((x) => x > 0);
    if (!grense) return null;
    const rad = (n) => ({ n, p: eksempelBelop(utkast.trinn, n, 'progressiv'), a: eksempelBelop(utkast.trinn, n, 'alle') });
    return [rad(grense - 1), rad(grense)];
  })();

  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.1fr]">
      <div>
        <div className="mb-3 flex items-center justify-between"><h3 className="text-[14px] font-semibold text-black/70">Priskatalog</h3><button onClick={ny} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: LILLA }}><Plus className="h-4 w-4" /> Ny plan</button></div>
        <div className="space-y-2">
          {planer.map((p) => {
            const brukt = kunder.filter((k) => k.planId === p.id).length; const on = valgtId === p.id;
            return (
              <button key={p.id} onClick={() => velg(p)} className="w-full rounded-2xl border bg-white p-4 text-left transition-all" style={{ borderColor: on ? LILLA : 'rgba(0,0,0,0.07)', boxShadow: on ? `inset 0 0 0 1px ${LILLA}` : '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-[14.5px] font-semibold text-black/85">{p.navn}{p.standard ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA }}>standard</span> : null}{!p.aktiv ? <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-medium text-black/45">inaktiv</span> : null}</p>
                  <span className="text-[11.5px] text-black/40">{brukt} kunde{brukt === 1 ? '' : 'r'}</span>
                </div>
                {p.beskrivelse ? <p className="mt-1 text-[12px] text-black/45">{p.beskrivelse}</p> : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.trinn.map((t, i) => <span key={i} className="rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] tabular-nums text-black/60">{t.fraEnheter === 0 ? '1+' : `${t.fraEnheter}+`}: {t.pris} kr</span>)}
                  <span className="rounded-md px-2 py-1 text-[11.5px] font-medium" style={{ color: LILLA }}>{p.trinnModell === 'alle' ? 'én trinnpris' : 'progressiv'}</span>
                  {p.prisModell === 'per_type' ? <span className="rounded-md px-2 py-1 text-[11.5px] font-medium" style={{ color: LILLA }}>selvbetjent {p.selvbetjentPris} kr</span> : null}
                  {(p.ledigFaktor ?? 100) !== 100 ? <span className="rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] text-black/60">ledige {p.ledigFaktor} %</span> : null}
                  {p.romModell === 'bolig' ? <span className="rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] text-black/60">bofellesskap = 1 enhet</span> : ((p.romFaktor ?? 100) !== 100 ? <span className="rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] text-black/60">rom {p.romFaktor} %</span> : null)}
                  {p.minstepris > 0 ? <span className="rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] tabular-nums text-black/60">min. {fmt(p.minstepris)} kr</span> : null}
                </div>
              </button>
            );
          })}
        </div>
        <Kort className="mt-4 p-4">
          <p className="text-[12.5px] font-semibold text-black/70">Armlengdeprinsippet</p>
          <p className="mt-1.5 text-[12px] leading-[1.55] text-black/50">Prisplanene er offentlige listepriser enhver forvalter kan kjøpe. DigiHome AS betaler nøyaktig samme pris som en ekstern kunde på samme plan — da er den konserninterne fakturaen dokumentert markedspris (sktl. § 13-1), ikke en konstruert internpris.</p>
        </Kort>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        {utkast ? (
          <Kort className="p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-[15px] font-semibold text-black/85">{valgtId === 'ny' ? 'Ny prisplan' : utkast.navn}</h3><button onClick={lukk} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/35 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button></div>
            <div className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Felt label="Plannavn"><input value={utkast.navn} onChange={(e) => setUtkast({ ...utkast, navn: e.target.value })} className={inputCls} placeholder="F.eks. Forvalter, Enterprise" /></Felt>
                <Felt label="Beskrivelse"><input value={utkast.beskrivelse} onChange={(e) => setUtkast({ ...utkast, beskrivelse: e.target.value })} className={inputCls} placeholder="Kort forklaring" /></Felt>
              </div>

              <div>
                <span className="text-[12px] font-medium text-black/55">Volumtrinn (kr / enhet / mnd, eks. mva)</span>
                <div className="mt-2"><TrinnEditor trinn={utkast.trinn} setTrinn={(t) => setUtkast({ ...utkast, trinn: t })} /></div>
              </div>

              <div>
                <span className="text-[12px] font-medium text-black/55">Hvordan trinnene virker</span>
                <Valgkort verdi={utkast.trinnModell || 'progressiv'} onChange={(v) => setUtkast({ ...utkast, trinnModell: v })} valg={[{ v: 'progressiv', t: 'Progressiv', d: 'Hvert trinn priser kun enhetene i sitt intervall. Jevn pris, ingen hopp.' }, { v: 'alle', t: 'Én trinnpris', d: 'Antallet bestemmer én pris for alle enheter. Gir hopp ved trinngrensene.' }]} />
                {eksempel ? (
                  <div className="mt-2 grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1 rounded-xl bg-black/[0.02] px-3 py-2.5 text-[11.5px] tabular-nums text-black/55">
                    <span className="text-black/40">Eksempel</span><span className="font-medium text-black/60">Progressiv</span><span className="font-medium text-black/60">Én trinnpris</span>
                    <span>{eksempel[0].n} enheter</span><span>{kr(eksempel[0].p)}</span><span>{kr(eksempel[0].a)}</span>
                    <span>{eksempel[1].n} enheter</span><span>{kr(eksempel[1].p)}</span><span className={eksempel[1].a < eksempel[0].a ? 'text-amber-700' : ''}>{kr(eksempel[1].a)}{eksempel[1].a < eksempel[0].a ? ' ↓' : ''}</span>
                  </div>
                ) : null}
              </div>

              <div>
                <span className="text-[12px] font-medium text-black/55">Enhetstyper</span>
                <Valgkort verdi={utkast.prisModell} onChange={(v) => setUtkast({ ...utkast, prisModell: v })} valg={[{ v: 'blandet', t: 'Samme sats', d: 'Én sats for forvaltede og selvbetjente enheter.' }, { v: 'per_type', t: 'Egen sats for selvbetjente', d: 'Selvbetjente enheter får en flat, lavere sats.' }]} />
                {utkast.prisModell === 'per_type' ? (
                  <div className="mt-3 max-w-[220px]"><Felt label="Sats selvbetjente (kr / enhet / mnd)"><div className="relative"><input type="number" min={0} value={utkast.selvbetjentPris} onChange={(e) => setUtkast({ ...utkast, selvbetjentPris: Number(e.target.value) })} className={`${inputCls} pr-10`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span></div></Felt></div>
                ) : null}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Felt label="Ledige enheter under forvaltning" hint="Gjelder kunder som fakturerer «alle enheter under forvaltning». Plattformen jobber også for ledige enheter (annonse, visning, signering).">
                  <Nedtrekk verdi={String(utkast.ledigFaktor ?? 100)} valg={LEDIG_VALG.map((o) => ({ v: String(o.v), l: o.l }))} onChange={(v) => setUtkast({ ...utkast, ledigFaktor: Number(v) })} />
                </Felt>
                <Felt label="Rom i bofellesskap" hint={ROM_VALG.find((o) => o.v === romValgVerdi(utkast))?.d}>
                  <Nedtrekk verdi={romValgVerdi(utkast)} valg={ROM_VALG} onChange={(v) => setUtkast({ ...utkast, ...romValgTilPlan(v) })} />
                </Felt>
                <Felt label="Minstepris per måned (eks. mva)" hint={utkast.minstepris > 0 ? 'Er summen lavere, legges en justeringslinje på fakturaen.' : '0 = ingen minstepris. Dekker onboarding og support for små kunder.'}>
                  <div className="relative"><input type="number" min={0} step={10} value={utkast.minstepris ?? 0} onChange={(e) => setUtkast({ ...utkast, minstepris: Number(e.target.value) })} className={`${inputCls} pr-10`} placeholder="0" /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span></div>
                </Felt>
              </div>

              <div className="flex items-center gap-5">
                <label className="flex items-center gap-2 text-[13px] text-black/70"><input type="checkbox" checked={!!utkast.standard} onChange={(e) => setUtkast({ ...utkast, standard: e.target.checked })} className="h-4 w-4 rounded accent-[#7a3fa8]" /> Standardplan</label>
                <label className="flex items-center gap-2 text-[13px] text-black/70"><input type="checkbox" checked={!!utkast.aktiv} onChange={(e) => setUtkast({ ...utkast, aktiv: e.target.checked })} className="h-4 w-4 rounded accent-[#7a3fa8]" /> Aktiv</label>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button onClick={slett} disabled={valgtId === 'ny'} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-red-600/80 transition-colors hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /> Slett</button>
              <button onClick={lagre} disabled={!utkast.navn || lagrer} className={knappPrimær} style={{ background: LILLA }}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{ok ? 'Lagret' : 'Lagre plan'}</button>
            </div>
          </Kort>
        ) : (
          <Tomt ikon={Layers} tittel="Velg eller lag en plan" tekst="Prisplaner er gjenbrukbare — tildel dem til kunder i Kunder-fanen. Endringer påvirker ikke måneder som allerede er frosset." />
        )}
      </div>
    </div>
  );
}
