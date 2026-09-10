'use client';

/* ───────────────────────────────────────────────────────────────────────────
   PrisModul — DigiHome Tech AS sin B2B-prising, bygget for MANGE kunder.

   To faner:
   • Kunder     — forvaltere/eiendomsselskaper. Hver kunde har plan, grunnlag og
                  enhetskilde. Live «neste faktura» per kunde + MRR på tvers.
   • Prisplaner — gjenbrukbar priskatalog (volumtrinn) + felles fakturainnstillinger.

   DigiHome AS er første kunde (konsernintern, plattform-kilde). Framtidige kunder
   legges til fritt. Ingen PowerOffice-skriving her — kun priser og grunnlag.
─────────────────────────────────────────────────────────────────────────── */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Tags, Users, Plus, Trash2, Building2, ReceiptText, Save, Layers, CheckCircle2,
  Loader2, ChevronDown, Info, Sparkles, Check, CreditCard, Server, Pencil, X,
  TrendingUp, Star, ArrowRight, Boxes,
} from 'lucide-react';

const LILLA = '#7a3fa8';
const fmt = (n) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(n) || 0));
const kr = (n) => `${fmt(n)} kr`;
const MND = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const mndLabel = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MND[(m || 1) - 1]} ${y}`; };
const forrigeMnd = () => { const d = new Date(); const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)); return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; };
const maanedValg = () => { const out = []; const d = new Date(); for (let i = 1; i <= 15; i += 1) { const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1)); const ym = `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`; out.push({ v: ym, l: mndLabel(ym) }); } return out; };

const GRUNNLAG = [
  { v: 'utleid_mnd', l: 'Utleid i måneden', d: 'Enheter som var utleid (signert) i måneden.' },
  { v: 'prorata', l: 'Prorata per dag', d: 'Utleide dager delt på dager i måneden.' },
  { v: 'alle', l: 'Alle under forvaltning', d: 'Alle aktive enheter, også ledige.' },
];
const STATUS = { aktiv: { l: 'Aktiv', c: '#1f9d55', bg: 'rgba(31,157,85,0.1)' }, prove: { l: 'Prøve', c: '#b45309', bg: 'rgba(180,83,9,0.1)' }, inaktiv: { l: 'Inaktiv', c: '#6b7280', bg: 'rgba(107,114,128,0.1)' } };

const inputCls = 'w-full rounded-xl border border-black/[0.1] bg-white px-3 py-2 text-[14px] tabular-nums outline-none transition-colors focus:border-[#7a3fa8]';

function Felt({ label, children, hint }) {
  return (
    <label className="block">
      <span className="text-[12px] font-medium text-black/55">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint ? <span className="mt-1 block text-[11.5px] text-black/40">{hint}</span> : null}
    </label>
  );
}
function Nedtrekk({ verdi, valg, onChange, disabled }) {
  return (
    <div className="relative">
      <select value={verdi} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={`${inputCls} appearance-none pr-9 disabled:bg-black/[0.03] disabled:text-black/40`}>
        {valg.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
    </div>
  );
}
function Kort({ children, className = '' }) {
  return <div className={`rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>;
}

// Volumtrinn-editor (gjenbrukt i planredigering)
function TrinnEditor({ trinn, setTrinn }) {
  const settRad = (i, felt, val) => setTrinn(trinn.map((t, j) => (j === i ? { ...t, [felt]: val === '' ? '' : Number(val) } : t)));
  const leggTil = () => { const sist = trinn[trinn.length - 1]; setTrinn([...trinn, { fraEnheter: (sist?.fraEnheter || 0) + 50, pris: Math.max(0, (sist?.pris || 0) - 50) }]); };
  const fjern = (i) => setTrinn(trinn.length > 1 ? trinn.filter((_, j) => j !== i) : trinn);
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-[1fr_1fr_auto] gap-3 px-1 text-[11px] font-medium uppercase tracking-[0.06em] text-black/40"><span>Fra enheter</span><span>Pris / enhet / mnd</span><span /></div>
      {trinn.map((t, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-3">
          <div className="relative">
            <input type="number" min={0} value={t.fraEnheter} disabled={i === 0} onChange={(e) => settRad(i, 'fraEnheter', e.target.value)} className={`${inputCls} ${i === 0 ? 'bg-black/[0.03] text-black/45' : ''}`} />
            {i === 0 ? <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-black/35">standard</span> : null}
          </div>
          <div className="relative"><input type="number" min={0} value={t.pris} onChange={(e) => settRad(i, 'pris', e.target.value)} className={`${inputCls} pr-10`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span></div>
          <button onClick={() => fjern(i)} disabled={trinn.length <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg text-black/35 transition-colors hover:bg-black/[0.04] hover:text-red-600 disabled:opacity-25"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={leggTil} className="mt-1 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors hover:bg-black/[0.03]" style={{ color: LILLA }}><Plus className="h-4 w-4" /> Legg til trinn</button>
    </div>
  );
}

// Live «neste faktura»-forhåndsvisning
function Faktura({ grunnlag, settings, kundeNavn, maaned, laster }) {
  const mva = settings?.mvaSats ?? 25;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[0.06] shadow-[0_20px_50px_-30px_rgba(0,0,0,0.28)]">
      <div className="flex items-center justify-between gap-3 px-5 py-4" style={{ background: '#151310', color: '#F4F1EA' }}>
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'rgba(244,241,234,0.1)' }}><ReceiptText className="h-4 w-4" /></span>
          <div><p className="text-[14px] font-semibold">Neste faktura</p><p className="text-[11.5px]" style={{ color: 'rgba(244,241,234,0.6)' }}>Tech → {kundeNavn || 'kunde'} · {mndLabel(maaned)}</p></div>
        </div>
        {laster ? <Loader2 className="h-4 w-4 animate-spin text-white/60" /> : null}
      </div>
      <div className="bg-white p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-medium uppercase tracking-[0.08em] text-black/40">Å fakturere</p>
            <p className="mt-1 text-[34px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-black/90">{kr(grunnlag?.sumInkMva || 0)}</p>
            <p className="mt-1.5 text-[12.5px] text-black/45">inkl. {mva}% mva</p>
          </div>
          <span className="rounded-full px-3 py-1 text-[11.5px] font-semibold" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA }}>{fmt(grunnlag?.antallEnheter || 0)} enheter</span>
        </div>
        <div className="mt-4 space-y-2.5 border-t border-black/[0.06] pt-4">
          {(grunnlag?.linjer || []).map((l) => (
            <div key={l.type} className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate text-[13.5px] font-medium text-black/80">{l.beskrivelse}</p><p className="text-[12px] text-black/45">{l.vekt !== l.antall ? `${fmt(l.vekt)} av ${fmt(l.antall)} (prorata)` : `${fmt(l.antall)} enheter`} × {kr(l.pris)}</p></div>
              <p className="shrink-0 text-[14px] font-semibold tabular-nums text-black/85">{kr(l.belop)}</p>
            </div>
          ))}
          {!(grunnlag?.linjer || []).length ? <p className="text-[13px] text-black/40">Ingen enheter i grunnlaget for {mndLabel(maaned)}.</p> : null}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-black/[0.06] pt-4 text-[13px]">
          <div className="flex justify-between text-black/55"><span>Sum eks. mva</span><span className="tabular-nums">{kr(grunnlag?.sumEksMva || 0)}</span></div>
          <div className="flex justify-between text-black/55"><span>Mva {mva}%</span><span className="tabular-nums">{kr(grunnlag?.mva || 0)}</span></div>
          <div className="flex justify-between pt-1 text-[15px] font-semibold text-black/90"><span>Totalt</span><span className="tabular-nums">{kr(grunnlag?.sumInkMva || 0)}</span></div>
        </div>
      </div>
    </div>
  );
}

export default function PrisModul({ apiKey = '' }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [tab, setTab] = useState('kunder');
  const [data, setData] = useState(null); // {settings, planer, kunder}
  const [maaned, setMaaned] = useState(forrigeMnd());
  const [mrr, setMrr] = useState(null);
  const [laster, setLaster] = useState(true);
  const [valgtKundeId, setValgtKundeId] = useState(null);
  const [kUtkast, setKUtkast] = useState(null); // kunde under redigering
  const [kGrunnlag, setKGrunnlag] = useState(null);
  const [kLaster, setKLaster] = useState(false);
  const [valgtPlanId, setValgtPlanId] = useState(null);
  const [pUtkast, setPUtkast] = useState(null);
  const [settUtkast, setSettUtkast] = useState(null);
  const [lagrer, setLagrer] = useState(false);
  const [ok, setOk] = useState('');
  const forhRef = useRef(0);

  const lastData = useCallback(async () => {
    try { const r = await fetch(`/api/admin/pris/data?${q}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) { setData(d); setSettUtkast(d.settings); } } catch (e) {}
    setLaster(false);
  }, [q]);
  const lastMrr = useCallback(async (mnd) => {
    try { const r = await fetch(`/api/admin/pris/grunnlag?${q}&maaned=${mnd}`, { cache: 'no-store' }); const d = await r.json(); if (d.ok) setMrr(d); } catch (e) {}
  }, [q]);

  useEffect(() => { lastData(); }, [lastData]);
  useEffect(() => { lastMrr(maaned); }, [maaned, lastMrr]);

  const planFor = useCallback((id) => (data?.planer || []).find((p) => p.id === id) || (data?.planer || []).find((p) => p.standard) || (data?.planer || [])[0], [data]);

  // Live per-kunde-forhåndsvisning ved redigering
  const forhaandsvis = useCallback(async (kunde) => {
    if (!kunde) return;
    const kjor = ++forhRef.current; setKLaster(true);
    try {
      const r = await fetch(`/api/admin/pris/grunnlag?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ maaned, kunde, plan: planFor(kunde.planId) }) });
      const d = await r.json(); if (kjor === forhRef.current && d.grunnlag) setKGrunnlag(d.grunnlag);
    } catch (e) {}
    if (kjor === forhRef.current) setKLaster(false);
  }, [q, maaned, planFor]);

  useEffect(() => { if (!kUtkast) { setKGrunnlag(null); return undefined; } const t = setTimeout(() => forhaandsvis(kUtkast), 260); return () => clearTimeout(t); }, [kUtkast, forhaandsvis]);

  const velgKunde = (k) => { setValgtKundeId(k.id); setKUtkast({ ...k }); };
  const nyKunde = () => { setValgtKundeId('ny'); setKUtkast({ navn: '', orgnr: '', epost: '', planId: planFor()?.id || '', enhetskilde: 'manuell', manueltAntall: 0, grunnlag: 'utleid_mnd', grunnlagSelvbetjent: 'utleid_mnd', status: 'aktiv', notat: '' }); };
  const lukkKunde = () => { setValgtKundeId(null); setKUtkast(null); };

  const lagreKunde = async () => {
    if (!kUtkast?.navn) return;
    setLagrer(true);
    try { const r = await fetch(`/api/admin/pris/kunder?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kUtkast) }); const d = await r.json(); if (d.ok) { await lastData(); await lastMrr(maaned); setOk('kunde'); setTimeout(() => setOk(''), 2000); setValgtKundeId(d.kunde.id); setKUtkast({ ...d.kunde }); } } catch (e) {}
    setLagrer(false);
  };
  const slettKunde = async () => {
    if (!kUtkast?.id || kUtkast.forste) return;
    if (!window.confirm(`Slette ${kUtkast.navn}?`)) return;
    try { await fetch(`/api/admin/pris/kunder?${q}&id=${kUtkast.id}`, { method: 'DELETE' }); await lastData(); await lastMrr(maaned); lukkKunde(); } catch (e) {}
  };

  const velgPlan = (p) => { setValgtPlanId(p.id); setPUtkast({ ...p, trinn: p.trinn.map((t) => ({ ...t })) }); };
  const nyPlan = () => { setValgtPlanId('ny'); setPUtkast({ navn: '', beskrivelse: '', prisModell: 'blandet', trinn: [{ fraEnheter: 0, pris: 200 }], selvbetjentPris: 79, aktiv: true, standard: false }); };
  const lagrePlan = async () => {
    if (!pUtkast?.navn) return; setLagrer(true);
    try { const r = await fetch(`/api/admin/pris/planer?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pUtkast) }); const d = await r.json(); if (d.ok) { await lastData(); setOk('plan'); setTimeout(() => setOk(''), 2000); setValgtPlanId(null); setPUtkast(null); } } catch (e) {}
    setLagrer(false);
  };
  const slettPlan = async (id) => { if (!window.confirm('Slette planen?')) return; const r = await fetch(`/api/admin/pris/planer?${q}&id=${id}`, { method: 'DELETE' }); const d = await r.json(); if (!d.ok) window.alert(d.feil || 'Kunne ikke slette'); else { await lastData(); setValgtPlanId(null); setPUtkast(null); } };
  const lagreSett = async () => { setLagrer(true); try { const r = await fetch(`/api/admin/pris/innstillinger?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settUtkast) }); const d = await r.json(); if (d.ok) { setData((x) => ({ ...x, settings: d.settings })); await lastMrr(maaned); setOk('sett'); setTimeout(() => setOk(''), 2000); } } catch (e) {} setLagrer(false); };

  if (laster || !data) return <div className="flex h-64 items-center justify-center text-black/40"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Laster …</div>;

  const kundeMrr = (id) => (mrr?.per || []).find((p) => p.kundeId === id);
  const snittPris = mrr?.sum?.enheter ? Math.round(mrr.sum.eks / mrr.sum.enheter) : 0;

  return (
    <div className="pb-16">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-[24px] font-semibold tracking-[-0.02em] text-black/90">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: LILLA, color: '#fff' }}><Tags className="h-5 w-5" strokeWidth={2} /></span>
            Pris
          </h1>
          <p className="mt-1.5 text-[13.5px] text-black/50">DigiHome Tech sin plattformpris til forvaltere og eiendomsselskaper. DigiHome AS er første kunde — modellen skalerer til mange.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl bg-black/[0.04] p-1">
            {[{ k: 'kunder', l: 'Kunder', icon: Users }, { k: 'planer', l: 'Prisplaner', icon: Layers }].map((t) => (
              <button key={t.k} onClick={() => setTab(t.k)} className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition-colors ${tab === t.k ? 'bg-white text-black/90 shadow-sm' : 'text-black/50 hover:text-black/80'}`}><t.icon className="h-4 w-4" /> {t.l}</button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'kunder' && (
        <>
          {/* MRR-oversikt */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { l: 'Månedlig lisensinntekt', v: kr(mrr?.sum?.eks || 0), sub: 'eks. mva', ikon: TrendingUp },
              { l: 'Enheter totalt', v: fmt(mrr?.sum?.enheter || 0), sub: `for ${mndLabel(maaned)}`, ikon: Boxes },
              { l: 'Kunder', v: `${mrr?.aktive || 0}`, sub: `av ${mrr?.antallKunder || 0} totalt aktive`, ikon: Users },
              { l: 'Snittpris / enhet', v: kr(snittPris), sub: 'blandet på tvers', ikon: CreditCard },
            ].map((s) => (
              <Kort key={s.l} className="p-4">
                <div className="flex items-center justify-between"><span className="text-[12px] font-medium text-black/50">{s.l}</span><s.ikon className="h-4 w-4" style={{ color: LILLA }} /></div>
                <p className="mt-2 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-black/90">{s.v}</p>
                <p className="text-[11.5px] text-black/40">{s.sub}</p>
              </Kort>
            ))}
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_1.05fr]">
            {/* Kundeliste */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <select value={maaned} onChange={(e) => setMaaned(e.target.value)} className="appearance-none rounded-lg border border-black/[0.1] bg-white py-1.5 pl-3 pr-8 text-[12.5px] font-medium outline-none">
                      {maanedValg().map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/35" />
                  </div>
                </div>
                <button onClick={nyKunde} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white transition-colors" style={{ background: LILLA }}><Plus className="h-4 w-4" /> Ny kunde</button>
              </div>
              <div className="space-y-2">
                {data.kunder.map((k) => {
                  const km = kundeMrr(k.id); const plan = planFor(k.planId); const on = valgtKundeId === k.id; const st = STATUS[k.status] || STATUS.aktiv;
                  return (
                    <button key={k.id} onClick={() => velgKunde(k)} className="w-full rounded-2xl border bg-white p-4 text-left transition-all" style={{ borderColor: on ? LILLA : 'rgba(0,0,0,0.07)', boxShadow: on ? `inset 0 0 0 1px ${LILLA}` : '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-[14.5px] font-semibold text-black/85">{k.navn}{k.forste ? <Star className="h-3.5 w-3.5" style={{ color: LILLA, fill: LILLA }} /> : null}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-black/45">
                            <span>{plan?.navn || '—'}</span><span>·</span>
                            <span className="inline-flex items-center gap-1">{k.enhetskilde === 'plattform' ? <Server className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}{k.enhetskilde === 'plattform' ? 'plattform' : 'manuell'}</span>
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: st.c, background: st.bg }}>{st.l}</span>
                      </div>
                      <div className="mt-3 flex items-end justify-between">
                        <span className="text-[12px] text-black/45">{fmt(km?.antallEnheter || 0)} enheter · {mndLabel(maaned)}</span>
                        <span className="text-[15px] font-semibold tabular-nums text-black/85">{kr(km?.sumEksMva || 0)}<span className="ml-1 text-[11px] font-normal text-black/40">/ mnd</span></span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kunde-editor + faktura */}
            <div className="xl:sticky xl:top-4 xl:self-start">
              {kUtkast ? (
                <div className="space-y-4">
                  <Kort className="p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[15px] font-semibold text-black/85">{valgtKundeId === 'ny' ? 'Ny kunde' : kUtkast.navn || 'Kunde'}</h3>
                      <button onClick={lukkKunde} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/35 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Felt label="Kundenavn"><input value={kUtkast.navn} onChange={(e) => setKUtkast({ ...kUtkast, navn: e.target.value })} className={inputCls} placeholder="F.eks. Bergen Eiendom AS" /></Felt>
                      <Felt label="Org.nr"><input value={kUtkast.orgnr} onChange={(e) => setKUtkast({ ...kUtkast, orgnr: e.target.value })} className={inputCls} placeholder="9 siffer" /></Felt>
                      <Felt label="Fakturaepost"><input value={kUtkast.epost} onChange={(e) => setKUtkast({ ...kUtkast, epost: e.target.value })} className={inputCls} placeholder="faktura@…" /></Felt>
                      <Felt label="Prisplan"><Nedtrekk verdi={kUtkast.planId} valg={data.planer.map((p) => ({ v: p.id, l: p.navn }))} onChange={(v) => setKUtkast({ ...kUtkast, planId: v })} /></Felt>
                      <Felt label="Status"><Nedtrekk verdi={kUtkast.status} valg={Object.entries(STATUS).map(([v, s]) => ({ v, l: s.l }))} onChange={(v) => setKUtkast({ ...kUtkast, status: v })} /></Felt>
                      <Felt label="Enhetskilde" hint={kUtkast.enhetskilde === 'plattform' ? 'Teller enheter fra plattformens leieforhold' : 'Sett antall manuelt inntil kunden er på plattformen'}>
                        <Nedtrekk verdi={kUtkast.enhetskilde} valg={[{ v: 'plattform', l: 'Plattform (leieforhold)' }, { v: 'manuell', l: 'Manuelt antall' }]} onChange={(v) => setKUtkast({ ...kUtkast, enhetskilde: v })} />
                      </Felt>
                      {kUtkast.enhetskilde === 'manuell' ? (
                        <Felt label="Antall enheter"><input type="number" min={0} value={kUtkast.manueltAntall} onChange={(e) => setKUtkast({ ...kUtkast, manueltAntall: Number(e.target.value) })} className={inputCls} /></Felt>
                      ) : (
                        <Felt label="Faktureringsgrunnlag" hint={GRUNNLAG.find((g) => g.v === kUtkast.grunnlag)?.d}><Nedtrekk verdi={kUtkast.grunnlag} valg={GRUNNLAG} onChange={(v) => setKUtkast({ ...kUtkast, grunnlag: v })} /></Felt>
                      )}
                      {kUtkast.enhetskilde === 'plattform' && planFor(kUtkast.planId)?.prisModell === 'per_type' ? (
                        <Felt label="Grunnlag selvbetjente"><Nedtrekk verdi={kUtkast.grunnlagSelvbetjent} valg={GRUNNLAG} onChange={(v) => setKUtkast({ ...kUtkast, grunnlagSelvbetjent: v })} /></Felt>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <button onClick={slettKunde} disabled={!kUtkast.id || kUtkast.forste} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-red-600/80 transition-colors hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /> Slett</button>
                      <button onClick={lagreKunde} disabled={!kUtkast.navn || lagrer} className="flex h-9 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold text-white transition-all disabled:opacity-40" style={{ background: LILLA }}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok === 'kunde' ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{ok === 'kunde' ? 'Lagret' : 'Lagre kunde'}</button>
                    </div>
                  </Kort>
                  <Faktura grunnlag={kGrunnlag} settings={data.settings} kundeNavn={kUtkast.navn} maaned={maaned} laster={kLaster} />
                </div>
              ) : (
                <Kort className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
                  <Users className="h-8 w-8 text-black/20" />
                  <p className="text-[14px] font-medium text-black/60">Velg en kunde</p>
                  <p className="max-w-[30ch] text-[12.5px] text-black/40">Klikk en kunde for å se og redigere plan, grunnlag og neste faktura — eller legg til en ny.</p>
                </Kort>
              )}
            </div>
          </div>
        </>
      )}

      {tab === 'planer' && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.05fr]">
          {/* Planliste + innstillinger */}
          <div className="space-y-5">
            <div>
              <div className="mb-3 flex items-center justify-between"><h3 className="text-[14px] font-semibold text-black/70">Priskatalog</h3><button onClick={nyPlan} className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: LILLA }}><Plus className="h-4 w-4" /> Ny plan</button></div>
              <div className="space-y-2">
                {data.planer.map((p) => {
                  const brukt = (data.kunder || []).filter((k) => k.planId === p.id).length; const on = valgtPlanId === p.id;
                  return (
                    <button key={p.id} onClick={() => velgPlan(p)} className="w-full rounded-2xl border bg-white p-4 text-left transition-all" style={{ borderColor: on ? LILLA : 'rgba(0,0,0,0.07)', boxShadow: on ? `inset 0 0 0 1px ${LILLA}` : '0 1px 2px rgba(0,0,0,0.04)' }}>
                      <div className="flex items-center justify-between">
                        <p className="flex items-center gap-2 text-[14.5px] font-semibold text-black/85">{p.navn}{p.standard ? <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'rgba(122,63,168,0.1)', color: LILLA }}>standard</span> : null}{!p.aktiv ? <span className="rounded-full bg-black/[0.06] px-2 py-0.5 text-[10px] font-medium text-black/45">inaktiv</span> : null}</p>
                        <span className="text-[11.5px] text-black/40">{brukt} kunde{brukt === 1 ? '' : 'r'}</span>
                      </div>
                      {p.beskrivelse ? <p className="mt-1 text-[12px] text-black/45">{p.beskrivelse}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {p.trinn.map((t, i) => <span key={i} className="rounded-md bg-black/[0.04] px-2 py-1 text-[11.5px] tabular-nums text-black/60">{t.fraEnheter === 0 ? '0+' : `${t.fraEnheter}+`}: {t.pris} kr</span>)}
                        <span className="rounded-md px-2 py-1 text-[11.5px] font-medium" style={{ color: LILLA }}>{p.prisModell === 'per_type' ? 'per enhetstype' : 'blandet'}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Felles fakturainnstillinger */}
            {settUtkast ? (
              <Kort className="p-5">
                <h3 className="text-[14px] font-semibold text-black/70">Fakturainnstillinger (felles)</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Felt label="Produktnavn (fakturalinje)"><input value={settUtkast.produktnavn} onChange={(e) => setSettUtkast({ ...settUtkast, produktnavn: e.target.value })} className={inputCls} /></Felt>
                  <Felt label="Leveringsmåte"><Nedtrekk verdi={settUtkast.levering} valg={[{ v: 'EHF', l: 'EHF (elektronisk)' }, { v: 'PdfByEmail', l: 'PDF på e-post' }]} onChange={(v) => setSettUtkast({ ...settUtkast, levering: v })} /></Felt>
                  <Felt label="Fakturadag"><input type="number" min={1} max={28} value={settUtkast.fakturadag} onChange={(e) => setSettUtkast({ ...settUtkast, fakturadag: Number(e.target.value) })} className={inputCls} /></Felt>
                  <Felt label="Betalingsfrist (dager)"><input type="number" min={0} max={90} value={settUtkast.betalingsfristDager} onChange={(e) => setSettUtkast({ ...settUtkast, betalingsfristDager: Number(e.target.value) })} className={inputCls} /></Felt>
                  <Felt label="Mva-sats (%)"><input type="number" min={0} max={100} value={settUtkast.mvaSats} onChange={(e) => setSettUtkast({ ...settUtkast, mvaSats: Number(e.target.value) })} className={inputCls} /></Felt>
                </div>
                <div className="mt-4 flex justify-end"><button onClick={lagreSett} disabled={lagrer} className="flex h-9 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold text-white disabled:opacity-40" style={{ background: '#151310' }}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok === 'sett' ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{ok === 'sett' ? 'Lagret' : 'Lagre'}</button></div>
              </Kort>
            ) : null}
          </div>

          {/* Plan-editor */}
          <div className="xl:sticky xl:top-4 xl:self-start">
            {pUtkast ? (
              <Kort className="p-5">
                <div className="mb-4 flex items-center justify-between"><h3 className="text-[15px] font-semibold text-black/85">{valgtPlanId === 'ny' ? 'Ny prisplan' : pUtkast.navn}</h3><button onClick={() => { setValgtPlanId(null); setPUtkast(null); }} className="flex h-7 w-7 items-center justify-center rounded-lg text-black/35 hover:bg-black/[0.05]"><X className="h-4 w-4" /></button></div>
                <div className="space-y-4">
                  <Felt label="Plannavn"><input value={pUtkast.navn} onChange={(e) => setPUtkast({ ...pUtkast, navn: e.target.value })} className={inputCls} placeholder="F.eks. Forvalter, Enterprise" /></Felt>
                  <Felt label="Beskrivelse"><input value={pUtkast.beskrivelse} onChange={(e) => setPUtkast({ ...pUtkast, beskrivelse: e.target.value })} className={inputCls} placeholder="Kort forklaring" /></Felt>
                  <div>
                    <span className="text-[12px] font-medium text-black/55">Prismodell</span>
                    <div className="mt-1.5 grid grid-cols-2 gap-2.5">
                      {[{ v: 'blandet', t: 'Blandet', d: 'Én sats for alle enheter' }, { v: 'per_type', t: 'Per enhetstype', d: 'Egen sats for selvbetjente' }].map((o) => {
                        const on = pUtkast.prisModell === o.v;
                        return <button key={o.v} onClick={() => setPUtkast({ ...pUtkast, prisModell: o.v })} className="rounded-xl border p-3 text-left transition-all" style={{ borderColor: on ? LILLA : 'rgba(0,0,0,0.1)', background: on ? 'rgba(122,63,168,0.05)' : '#fff' }}><p className="text-[13px] font-semibold" style={{ color: on ? LILLA : '#151310' }}>{o.t}</p><p className="mt-0.5 text-[11.5px] text-black/45">{o.d}</p></button>;
                      })}
                    </div>
                  </div>
                  <div><span className="mb-2 block text-[12px] font-medium text-black/55">Volumtrinn (kr / enhet / mnd, eks. mva)</span><TrinnEditor trinn={pUtkast.trinn} setTrinn={(t) => setPUtkast({ ...pUtkast, trinn: t })} /></div>
                  {pUtkast.prisModell === 'per_type' ? (
                    <Felt label="Sats selvbetjente enheter (kr/mnd)"><div className="relative max-w-[200px]"><input type="number" min={0} value={pUtkast.selvbetjentPris} onChange={(e) => setPUtkast({ ...pUtkast, selvbetjentPris: Number(e.target.value) })} className={`${inputCls} pr-10`} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-black/35">kr</span></div></Felt>
                  ) : null}
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-[13px] text-black/70"><input type="checkbox" checked={pUtkast.standard} onChange={(e) => setPUtkast({ ...pUtkast, standard: e.target.checked })} className="h-4 w-4 rounded accent-[#7a3fa8]" /> Standardplan</label>
                    <label className="flex items-center gap-2 text-[13px] text-black/70"><input type="checkbox" checked={pUtkast.aktiv} onChange={(e) => setPUtkast({ ...pUtkast, aktiv: e.target.checked })} className="h-4 w-4 rounded accent-[#7a3fa8]" /> Aktiv</label>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <button onClick={() => valgtPlanId !== 'ny' && slettPlan(pUtkast.id)} disabled={valgtPlanId === 'ny'} className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-red-600/80 transition-colors hover:bg-red-50 disabled:opacity-30"><Trash2 className="h-4 w-4" /> Slett</button>
                  <button onClick={lagrePlan} disabled={!pUtkast.navn || lagrer} className="flex h-9 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold text-white disabled:opacity-40" style={{ background: LILLA }}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : ok === 'plan' ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}{ok === 'plan' ? 'Lagret' : 'Lagre plan'}</button>
                </div>
              </Kort>
            ) : (
              <Kort className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center"><Layers className="h-8 w-8 text-black/20" /><p className="text-[14px] font-medium text-black/60">Velg eller lag en plan</p><p className="max-w-[30ch] text-[12.5px] text-black/40">Prisplaner er gjenbrukbare — tildel dem til kunder i Kunder-fanen.</p></Kort>
            )}
          </div>
        </div>
      )}

      {/* Armlengde-notat */}
      <Kort className="mt-6 p-5">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-black/80"><Sparkles className="h-4 w-4" style={{ color: LILLA }} /> Armlengdeprinsippet</p>
        <p className="mt-2 max-w-[70ch] text-[12.5px] leading-[1.55] text-black/55">Prisplanene er offentlige listepriser enhver forvalter kan kjøpe. DigiHome AS betaler nøyaktig samme pris som en ekstern kunde på samme plan — da er den konserninterne fakturaen dokumentert markedspris (sktl. § 13-1), ikke en konstruert internpris.</p>
      </Kort>
    </div>
  );
}
