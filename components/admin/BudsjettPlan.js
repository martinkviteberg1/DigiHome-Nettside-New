'use client';

/* ═══════════ FRITTSTÅENDE BUDSJETT (plan) — fokusert editor ═══════════
   Et budsjett med navn, FRI periode (startmåned + 3–24 mnd) og status
   (utkast/vedtatt). Perfekt for «neste 12 mnd» fra hvilken som helst måned
   og for scenarioer (konservativt/moderat/aggressivt) side om side med
   kalenderårsbudsjettet. Kun én plan kan være vedtatt per identiske periode.
   · Opprettelse: navn + periode + valgfritt porteføljeforslag (modell B
     skåret til vinduet — sikret honorar fases inn/ut på faktiske datoer)
   · Editor: redigerbart rutenett per kategori/måned + «Mot faktisk»
   API: GET/PUT/DELETE /api/admin/budsjett/plan, GET .../plan/forslag */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Loader2, ArrowLeft, Check, Trash2, Sparkles, CalendarRange, BadgeCheck, FileEdit, X,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const INNTEKT_KATEGORIER = ['Honorar (forvaltning)', 'Oppstartshonorar', 'Annen inntekt'];
const KOSTNAD_KATEGORIER = ['Lønn', 'Husleie', 'Programvare/SaaS', 'Regnskap', 'API/LLM', 'Markedsføring', 'Annet'];
const MND_KORT = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];

const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const ymLabel = (ym) => {
  const [y, m] = String(ym || '').split('-').map(Number);
  return y && m ? `${MND_KORT[m - 1]} ${String(y).slice(2)}` : ym;
};
const ymPluss = (ym, i) => {
  const [y, m] = String(ym).split('-').map(Number);
  const t = y * 12 + (m - 1) + i;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const nesteYm = () => {
  const d = new Date();
  return ymPluss(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 1);
};
const sumAv = (obj) => Object.values(obj || {}).reduce((s, arr) => s + (arr || []).reduce((a, x) => a + (Number(x) || 0), 0), 0);

export default function BudsjettPlan({ apiKey, planId, onLukk, onEndret }) {
  const erNy = !planId;
  const api = useCallback(async (path, opts = {}) => {
    const url = `/api/admin/budsjett/${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || `Feil (${r.status})`);
    return j;
  }, [apiKey]);

  // ── Opprettelses-skjema ──
  const [oppsett, setOppsett] = useState({ navn: '', startYm: nesteYm(), antallMnd: 12, fyll: true });
  const [oppretter, setOppretter] = useState(false);

  // ── Editor-tilstand ──
  const [plan, setPlan] = useState(null);
  const [faktisk, setFaktisk] = useState(null);
  const [inntekter, setInntekter] = useState({});
  const [kostnader, setKostnader] = useState({});
  const [dirty, setDirty] = useState(false);
  const [laster, setLaster] = useState(!erNy);
  const [lagrer, setLagrer] = useState(false);
  const [feil, setFeil] = useState('');
  const [mode, setMode] = useState('budsjett'); // 'budsjett' | 'avvik'
  const [seeder, setSeeder] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);
  const navnRef = useRef(null);

  const hentPlan = useCallback(async (id) => {
    setLaster(true);
    try {
      const j = await api(`plan?id=${encodeURIComponent(id)}`);
      setPlan(j.plan);
      setFaktisk(j.faktisk);
      setInntekter(j.plan.inntekter);
      setKostnader(j.plan.kostnader);
      setDirty(false);
      setFeil('');
    } catch (e) { setFeil(e.message); }
    setLaster(false);
  }, [api]);
  useEffect(() => { if (planId) hentPlan(planId); }, [planId, hentPlan]);

  const opprett = async () => {
    if (oppretter || !oppsett.navn.trim()) return;
    setOppretter(true);
    setFeil('');
    try {
      let inn; let kost;
      if (oppsett.fyll) {
        const f = await api(`plan/forslag?startYm=${oppsett.startYm}&antallMnd=${oppsett.antallMnd}`);
        inn = f.inntekter; kost = f.kostnader;
      }
      const r = await api('plan', { method: 'PUT', body: { navn: oppsett.navn.trim(), startYm: oppsett.startYm, antallMnd: oppsett.antallMnd, inntekter: inn, kostnader: kost } });
      onEndret?.();
      await hentPlan(r.id);
      setPlan((p) => p); // editor viser nå planen (planId-prop styres av forelder via onOpprettet)
      onLukk?.(r.id); // forelderen bytter valgtPlanId → denne komponenten remountes i editor-modus
    } catch (e) { setFeil(e.message); }
    setOppretter(false);
  };

  const lagre = async (ekstra = {}) => {
    if (!plan || lagrer) return;
    setLagrer(true);
    try {
      await api('plan', {
        method: 'PUT',
        body: { id: plan.id, navn: plan.navn, startYm: plan.startYm, antallMnd: plan.antallMnd, status: ekstra.status || plan.status, inntekter, kostnader, notat: plan.notat },
      });
      setDirty(false);
      if (ekstra.status) setPlan((p) => ({ ...p, status: ekstra.status }));
      onEndret?.();
    } catch (e) { setFeil(e.message); }
    setLagrer(false);
  };

  const slett = async () => {
    try {
      await api(`plan?id=${encodeURIComponent(plan.id)}`, { method: 'DELETE' });
      onEndret?.();
      onLukk?.(null);
    } catch (e) { setFeil(e.message); }
  };

  const seedPaaNytt = async () => {
    if (!plan || seeder) return;
    setSeeder(true);
    try {
      const f = await api(`plan/forslag?startYm=${plan.startYm}&antallMnd=${plan.antallMnd}`);
      setInntekter(f.inntekter);
      setKostnader(f.kostnader);
      setDirty(true);
    } catch (e) { setFeil(e.message); }
    setSeeder(false);
  };

  const settCelle = (side, kat, i, v) => {
    const n = Math.max(0, Math.round(Number(String(v).replace(/[^\d]/g, '')) || 0));
    const set = side === 'inn' ? setInntekter : setKostnader;
    set((prev) => {
      const arr = [...(prev[kat] || Array(plan.antallMnd).fill(0))];
      arr[i] = n;
      return { ...prev, [kat]: arr };
    });
    setDirty(true);
  };

  const N = plan?.antallMnd || 12;
  const mndListe = useMemo(() => Array.from({ length: N }, (_, i) => ymLabel(ymPluss(plan?.startYm || nesteYm(), i))), [plan, N]);
  const sumInn = useMemo(() => sumAv(inntekter), [inntekter]);
  const sumKost = useMemo(() => sumAv(kostnader), [kostnader]);
  const hittil = useMemo(() => {
    if (!faktisk) return null;
    let fInn = 0; let fKost = 0; let bInn = 0; let bKost = 0; let ant = 0;
    for (let i = 0; i < N; i++) {
      if (faktisk.honorar?.[i] == null) continue;
      ant += 1;
      fInn += faktisk.honorar[i];
      fKost += faktisk.kostnaderSum?.[i] || 0;
      for (const k of INNTEKT_KATEGORIER) bInn += Number(inntekter[k]?.[i]) || 0;
      for (const k of KOSTNAD_KATEGORIER) bKost += Number(kostnader[k]?.[i]) || 0;
    }
    return ant ? { ant, fInn, fKost, bInn, bKost } : null;
  }, [faktisk, inntekter, kostnader, N]);

  /* ── Opprettelses-visning ── */
  if (erNy) {
    const maksMnd = 24; // modellen dekker jan startår → +24 mnd; 3–24 tillatt
    return (
      <div className="mx-auto max-w-[560px]" data-testid="budsjett-plan-ny">
        <button onClick={() => onLukk?.(undefined)} className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#999] transition-colors hover:text-[#333]" data-testid="plan-ny-tilbake">
          <ArrowLeft className="h-3.5 w-3.5" /> Tilbake til budsjettet
        </button>
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="flex items-center gap-2 text-[15px] font-bold text-[#0a0a0a]" style={heading}><CalendarRange className="h-4 w-4 text-[#8b5cf6]" /> Nytt frittstående budsjett</p>
          <p className="mt-1 text-[12px] text-[#a3a3a3]">Fri periode — f.eks. neste 12 måneder fra en valgfri startmåned, eller et scenario ved siden av kalenderåret.</p>
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Navn</span>
              <input
                value={oppsett.navn} onChange={(e) => setOppsett((o) => ({ ...o, navn: e.target.value }))}
                placeholder={`f.eks. Neste 12 mnd (${ymLabel(oppsett.startYm)}–${ymLabel(ymPluss(oppsett.startYm, oppsett.antallMnd - 1))}) eller Konservativt`}
                data-testid="plan-navn-input"
                className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none transition-all placeholder:text-[#ccc] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Startmåned</span>
                <input
                  type="month" value={oppsett.startYm} onChange={(e) => setOppsett((o) => ({ ...o, startYm: e.target.value }))}
                  data-testid="plan-start-input"
                  className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[13.5px] tabular-nums outline-none focus:border-[#8b5cf6]/50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Lengde</span>
                <select
                  value={oppsett.antallMnd} onChange={(e) => setOppsett((o) => ({ ...o, antallMnd: Number(e.target.value) }))}
                  data-testid="plan-lengde-input"
                  className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[13.5px] outline-none focus:border-[#8b5cf6]/50"
                >
                  {[6, 12, 18, 24].filter((x) => x <= maksMnd).map((x) => <option key={x} value={x}>{x} måneder</option>)}
                </select>
              </label>
            </div>
            <p className="text-[11.5px] tabular-nums text-[#a3a3a3]">Periode: <b className="text-[#555]">{ymLabel(oppsett.startYm)} → {ymLabel(ymPluss(oppsett.startYm, oppsett.antallMnd - 1))}</b></p>
            <label className="flex cursor-pointer items-center gap-2 select-none">
              <input type="checkbox" checked={oppsett.fyll} onChange={(e) => setOppsett((o) => ({ ...o, fyll: e.target.checked }))} className="h-3.5 w-3.5 accent-[#8b5cf6]" data-testid="plan-fyll-toggle" />
              <span className="text-[12.5px] text-[#666]">Fyll fra porteføljen — kontraktsfestet honorar fases inn/ut på faktiske datoer, kostnader fra registeret</span>
            </label>
          </div>
          {feil && <p className="mt-3 rounded-lg bg-[#fdf0ef] px-3 py-2 text-[12px] text-[#c2413b]">{feil}</p>}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button onClick={() => onLukk?.(undefined)} className="h-10 rounded-lg px-3.5 text-[13px] font-semibold text-[#777] transition-colors hover:bg-[#f3f2f0]">Avbryt</button>
            <button
              onClick={opprett} disabled={!oppsett.navn.trim() || oppretter} data-testid="plan-opprett-btn"
              className="flex h-10 items-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
            >
              {oppretter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Opprett budsjett
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (laster) return <div className="flex items-center justify-center py-24"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>;
  if (!plan) return (
    <div className="mx-auto max-w-[560px]">
      <button onClick={() => onLukk?.(undefined)} className="mb-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-[#999]"><ArrowLeft className="h-3.5 w-3.5" /> Tilbake</button>
      <p className="rounded-2xl bg-white p-6 text-[13px] text-[#999] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">{feil || 'Fant ikke planen.'}</p>
    </div>
  );

  const erVedtatt = plan.status === 'vedtatt';
  const celleKls = 'h-8 w-full min-w-0 rounded-[6px] border border-transparent bg-transparent px-1 text-right text-[12px] tabular-nums outline-none transition-all hover:border-black/[0.08] focus:border-[#8b5cf6]/50 focus:bg-white';

  /* ── Editor ── */
  return (
    <div data-testid="budsjett-plan-editor">
      {/* Topplinje */}
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => onLukk?.(undefined)} data-testid="plan-tilbake" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#777] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#111]">
          <ArrowLeft className="h-3.5 w-3.5" /> Budsjett
        </button>
        <div className="flex h-9 min-w-0 items-center gap-2 rounded-full bg-white px-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <input
            ref={navnRef} value={plan.navn}
            onChange={(e) => { setPlan((p) => ({ ...p, navn: e.target.value })); setDirty(true); }}
            data-testid="plan-navn-editor"
            className="w-[190px] min-w-0 bg-transparent text-[13px] font-bold text-[#0a0a0a] outline-none"
            style={heading}
          />
          <span className="hidden text-[11.5px] tabular-nums text-[#b5b5b5] sm:inline">{ymLabel(plan.startYm)} → {ymLabel(plan.sluttYm)}</span>
        </div>
        <button
          onClick={() => lagre({ status: erVedtatt ? 'utkast' : 'vedtatt' })}
          data-testid="plan-status-toggle"
          title={erVedtatt ? 'Gjør om til utkast' : 'Vedta — blir gjeldende plan for perioden (andre vedtatte for samme periode blir utkast)'}
          className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12px] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all active:scale-[0.97] ${erVedtatt ? 'bg-[#eef6f0] text-[#1f7a45]' : 'bg-white text-[#999] hover:text-[#555]'}`}
        >
          {erVedtatt ? <BadgeCheck className="h-4 w-4" /> : <FileEdit className="h-4 w-4" />} {erVedtatt ? 'Vedtatt' : 'Utkast'}
        </button>
        <div className="flex h-9 items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {[{ k: 'budsjett', l: 'Budsjett' }, { k: 'avvik', l: 'Mot faktisk' }].map((o) => (
            <button key={o.k} onClick={() => setMode(o.k)} data-testid={`plan-mode-${o.k}`} className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-all ${mode === o.k ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`}>{o.l}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={seedPaaNytt} disabled={seeder} data-testid="plan-seed-btn" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#6d28d9] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:bg-[#f4f0fb] active:scale-[0.97]">
            {seeder ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} <span className="hidden sm:inline">Fyll fra porteføljen</span>
          </button>
          {!sletteBekreft ? (
            <button onClick={() => setSletteBekreft(true)} data-testid="plan-slett-btn" title="Slett planen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#c9c4bd] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#c2413b]">
              <Trash2 className="h-4 w-4" />
            </button>
          ) : (
            <span className="flex h-9 items-center gap-1 rounded-full bg-[#fdf0ef] px-2 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              <button onClick={slett} data-testid="plan-slett-bekreft" className="rounded-full px-2 py-1 text-[11.5px] font-bold text-[#c2413b] hover:bg-white/70">Slett planen</button>
              <button onClick={() => setSletteBekreft(false)} className="flex h-6 w-6 items-center justify-center rounded-full text-[#999] hover:bg-white/70"><X className="h-3.5 w-3.5" /></button>
            </span>
          )}
          <button
            onClick={() => lagre()} disabled={!dirty || lagrer} data-testid="plan-lagre-btn"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-35"
          >
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre
          </button>
        </div>
      </div>

      {feil && <p className="mt-3 rounded-lg bg-[#fdf0ef] px-3 py-2 text-[12px] text-[#c2413b]">{feil}</p>}

      {/* KPI-rad */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { l: 'Inntekter (perioden)', v: sumInn, testid: 'plan-kpi-inn' },
          { l: 'Kostnader (perioden)', v: sumKost, testid: 'plan-kpi-kost' },
          { l: 'Resultat', v: sumInn - sumKost, farge: true, testid: 'plan-kpi-resultat' },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid={k.testid}>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a8a29a]">{k.l}</p>
            <p className="mt-1 text-[20px] font-bold tabular-nums leading-none" style={{ ...heading, color: k.farge ? (k.v >= 0 ? '#1f7a45' : '#c2413b') : '#0a0a0a' }}>
              {k.v < 0 ? '−' : ''}{tall(Math.abs(k.v))} kr
            </p>
          </div>
        ))}
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="plan-kpi-hittil">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a8a29a]">Faktisk hittil i perioden</p>
          {hittil ? (
            <>
              <p className="mt-1 text-[20px] font-bold tabular-nums leading-none" style={{ ...heading, color: (hittil.fInn - hittil.fKost) >= 0 ? '#1f7a45' : '#c2413b' }}>
                {(hittil.fInn - hittil.fKost) < 0 ? '−' : ''}{tall(Math.abs(hittil.fInn - hittil.fKost))} kr
              </p>
              <p className="mt-1 text-[10.5px] tabular-nums text-[#a8a29a]">{hittil.ant} mnd · budsjettert {tall(hittil.bInn - hittil.bKost)} kr</p>
            </>
          ) : (
            <p className="mt-1 text-[13px] font-semibold text-[#c9c4bd]">Perioden har ikke startet</p>
          )}
        </div>
      </div>

      {/* Rutenett */}
      <div className="mt-3 overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <table className="w-full min-w-[860px] text-[12px]" data-testid="plan-rutenett">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-[0.07em] text-[#a8a29a]">
              <th className="sticky left-0 z-10 bg-white py-2.5 pl-4 pr-3 text-left font-bold">Kategori</th>
              {mndListe.map((m, i) => (
                <th key={i} className={`px-1.5 py-2.5 text-right font-bold ${faktisk?.honorar?.[i] != null ? 'text-[#8b5cf6]' : ''}`}>{m}</th>
              ))}
              <th className="py-2.5 pl-2 pr-4 text-right font-bold">Sum</th>
            </tr>
          </thead>
          <tbody>
            {[['inn', 'Inntekter', INNTEKT_KATEGORIER, inntekter], ['kost', 'Kostnader', KOSTNAD_KATEGORIER, kostnader]].map(([side, tittel, kategorier, verdier]) => (
              <React.Fragment key={side}>
                <tr>
                  <td colSpan={N + 2} className={`sticky left-0 px-4 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.08em] ${side === 'inn' ? 'text-[#1f7a45]' : 'text-[#9a6b1c]'}`}>{tittel}</td>
                </tr>
                {kategorier.map((kat) => {
                  const arr = verdier[kat] || Array(N).fill(0);
                  const radSum = arr.reduce((a, x) => a + (Number(x) || 0), 0);
                  return (
                    <tr key={kat} className="border-t border-black/[0.03]">
                      <td className="sticky left-0 z-10 bg-white py-1 pl-4 pr-3 font-medium text-[#44403c]">{kat}</td>
                      {arr.map((v, i) => {
                        const fakt = side === 'inn'
                          ? (kat === 'Honorar (forvaltning)' ? faktisk?.honorar?.[i] : null)
                          : faktisk?.kostnaderPerKategori?.[kat]?.[i];
                        const avvik = fakt != null ? (side === 'inn' ? fakt - v : v - fakt) : null;
                        return (
                          <td key={i} className="px-0.5 py-0.5">
                            {mode === 'budsjett' ? (
                              <input
                                value={v ? tall(v) : ''}
                                placeholder="0"
                                onChange={(e) => settCelle(side, kat, i, e.target.value)}
                                data-testid={`plan-celle-${side}-${kat}-${i}`}
                                className={celleKls}
                                inputMode="numeric"
                              />
                            ) : (
                              <div className="px-1 py-0.5 text-right tabular-nums">
                                <span className="block text-[11.5px] text-[#44403c]">{fakt != null ? tall(fakt) : v ? tall(v) : '·'}</span>
                                {avvik != null && (v > 0 || fakt > 0) && (
                                  <span className={`block text-[9.5px] font-semibold ${avvik >= 0 ? 'text-[#1f7a45]' : 'text-[#c2413b]'}`}>{avvik >= 0 ? '+' : '−'}{tall(Math.abs(avvik))}</span>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="py-1 pl-2 pr-4 text-right font-semibold tabular-nums text-[#1c1917]">{tall(radSum)}</td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
            <tr className="border-t border-black/[0.06]">
              <td className="sticky left-0 z-10 bg-white py-2.5 pl-4 pr-3 text-[11px] font-bold uppercase tracking-[0.06em] text-[#57534e]">Resultat</td>
              {Array.from({ length: N }, (_, i) => {
                const inn = INNTEKT_KATEGORIER.reduce((a, k) => a + (Number(inntekter[k]?.[i]) || 0), 0);
                const kost = KOSTNAD_KATEGORIER.reduce((a, k) => a + (Number(kostnader[k]?.[i]) || 0), 0);
                const res = inn - kost;
                return <td key={i} className={`px-1.5 py-2.5 text-right text-[11.5px] font-bold tabular-nums ${res >= 0 ? 'text-[#1f7a45]' : 'text-[#c2413b]'}`}>{res < 0 ? '−' : ''}{tall(Math.abs(res))}</td>;
              })}
              <td className={`py-2.5 pl-2 pr-4 text-right font-bold tabular-nums ${sumInn - sumKost >= 0 ? 'text-[#1f7a45]' : 'text-[#c2413b]'}`}>{sumInn - sumKost < 0 ? '−' : ''}{tall(Math.abs(sumInn - sumKost))}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2.5 text-[10.5px] leading-snug text-[#b8b2a9]">
        Frittstående budsjett — påvirker ikke kalenderårsbudsjettet, avviksrapporten eller investorvisningen. Måneder markert i lilla har faktiske tall («Mot faktisk»). {erVedtatt ? 'Planen er vedtatt for sin periode.' : 'Utkast — vedta planen når den er klar.'}
      </p>
    </div>
  );
}
