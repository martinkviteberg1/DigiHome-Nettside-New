'use client';
// ---------------------------------------------------------------------------
// INVESTORDECK (admin-modul) — scenen over budsjettet.
// Budsjett er verkstedet (drivere, skatt, konsern). Decket er scenen: hvilken
// plan som står bak, én knapp for å presentere, alle eksterne lenker på tvers
// av planer med hvem-så-hva, og aktiviteten. Tallene i decket ER planen — her
// styres bare visning og deling. Snarveien fra Budsjett («Åpne investordeck»)
// beholdes; denne modulen er inngangen for den som skal presentere eller dele.
// API: GET /api/admin/deck/oversikt · POST /api/admin/deck/aktiv ·
//      /api/investor/deck/deling (GET/POST/PUT/DELETE) — eksisterende.
// ---------------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Loader2, Presentation, Link2, Copy, Check, Ban, Trash2, Plus, ExternalLink, Eye, Layers, Download,
  Lock, Unlock, Clock, RefreshCw, Activity, ShieldCheck, ChevronDown, KeyRound, Sparkles, Undo2,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const fmtTid = (iso) => { if (!iso) return '—'; try { return new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } };
const fmtDato = (iso) => { if (!iso) return null; try { return new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return null; } };
const siden = (iso) => {
  if (!iso) return 'aldri';
  const d = (Date.now() - new Date(iso).getTime()) / 60000;
  if (d < 1) return 'nå'; if (d < 60) return `${Math.round(d)} min siden`; if (d < 1440) return `${Math.round(d / 60)} t siden`; if (d < 43200) return `${Math.round(d / 1440)} d siden`;
  return fmtDato(iso);
};
const HENDELSE = { deck_aapnet: 'Åpnet decket', deck_side: 'Så side', deck_hvaom: 'Prøvde «hva om»', deck_nedlasting: 'Lastet ned', deck_driver: 'Justerte driver', deck_pin_feil: 'Feil passord', deck_delt: 'Lenke opprettet' };
const STATUS = { active: { l: 'Aktiv', c: 'bg-[#e9f7ef] text-[#1f7a4d]' }, expired: { l: 'Utløpt', c: 'bg-[#f3f0e9] text-[#8a7a5a]' }, revoked: { l: 'Trukket', c: 'bg-[#fdecec] text-[#c0392b]' } };

function Tall({ v, l, hint }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <p className="text-[11.5px] font-medium uppercase tracking-[0.06em] text-[#999]">{l}</p>
      <p className="mt-1.5 text-[30px] font-semibold tracking-[-0.03em] leading-none text-[#0a0a0a] tabular-nums">{nf.format(v || 0)}</p>
      {hint && <p className="mt-1.5 text-[12px] text-[#999]">{hint}</p>}
    </div>
  );
}

function Velger({ verdi, onChange, valg, tom = '— velg —', testid }) {
  return (
    <span className="relative inline-flex w-full">
      <select value={verdi || ''} onChange={(e) => onChange(e.target.value || null)} className="h-11 w-full appearance-none rounded-xl border border-[#e8e6e1] bg-white pl-3.5 pr-9 text-[14px] text-[#0a0a0a] outline-none focus:border-[#0a0a0a]" data-testid={testid}>
        <option value="">{tom}</option>
        {valg.map((p) => <option key={p.id} value={p.id}>{p.navn}{p.status ? ` · ${p.status}` : ''}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
    </span>
  );
}

export default function DeckModul({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [msg, setMsg] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [techPlanId, setTechPlanId] = useState(null);
  const [lagrer, setLagrer] = useState(false);
  const [filter, setFilter] = useState('alle');
  const [nyOpen, setNyOpen] = useState(false);
  const [ny, setNy] = useState({ label: '', pin: '', expiresDays: 30, note: '' });
  const [nyLenke, setNyLenke] = useState(null);
  const [kopiert, setKopiert] = useState(null);
  const [travel, setTravel] = useState(null);

  const last = useCallback(async () => {
    setLaster(true);
    try {
      const r = await fetch(`/api/admin/deck/oversikt?${q}`, { cache: 'no-store' });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'Kunne ikke laste');
      setData(d);
      setPlanId((v) => v || d.aktiv?.planId || d.planer[0]?.id || null);
      setTechPlanId((v) => v || d.aktiv?.techPlanId || null);
    } catch (e) { setMsg({ ok: false, t: e.message }); }
    setLaster(false);
  }, [q]);
  useEffect(() => { last(); }, [last]);

  const plan = useMemo(() => data?.planer.find((p) => p.id === planId) || null, [data, planId]);
  /* Tech-plan: den som er koblet til valgt plan foreslås automatisk */
  useEffect(() => {
    if (!data || !plan) return;
    const koblet = data.techPlaner.find((t) => t.kobletPlanId === plan.id);
    if (koblet && !techPlanId) setTechPlanId(koblet.id);
  }, [data, plan, techPlanId]);

  const lagreAktiv = async (pId, tId) => {
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/deck/aktiv?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: pId, techPlanId: tId }) });
      const d = await r.json(); if (!d.ok) throw new Error(d.error || 'Kunne ikke lagre');
      setData((x) => (x ? { ...x, aktiv: d.aktiv } : x));
    } catch (e) { setMsg({ ok: false, t: e.message }); }
    setLagrer(false);
  };
  const velgPlan = (id) => { setPlanId(id); const koblet = data?.techPlaner.find((t) => t.kobletPlanId === id); const tId = koblet ? koblet.id : null; setTechPlanId(tId); if (id) lagreAktiv(id, tId); };
  const velgTech = (id) => { setTechPlanId(id); if (planId) lagreAktiv(planId, id); };

  const presenterUrl = planId ? `/investor/deck?plan=${encodeURIComponent(planId)}${techPlanId ? `&tech=${encodeURIComponent(techPlanId)}` : ''}` : null;
  const lenkeUrl = (l) => `${typeof window !== 'undefined' ? window.location.origin : ''}/deck/${l.token}`;

  const kopier = async (tekst, id) => { try { await navigator.clipboard.writeText(tekst); setKopiert(id); window.setTimeout(() => setKopiert(null), 1600); } catch (e) { /* ok */ } };

  const opprett = async (e) => {
    e.preventDefault();
    if (!planId) return;
    setTravel('ny');
    try {
      const r = await fetch(`/api/investor/deck/deling?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId, techPlanId, label: ny.label || (plan ? `${plan.navn}` : 'Investordeck'), pin: ny.pin || undefined, expiresDays: Number(ny.expiresDays) || undefined, note: ny.note || undefined }) });
      const d = await r.json(); if (!d.ok) throw new Error(d.error || 'Kunne ikke opprette');
      setNyLenke(d.link); setNy({ label: '', pin: '', expiresDays: 30, note: '' });
      await last();
    } catch (er) { setMsg({ ok: false, t: er.message }); }
    setTravel(null);
  };
  const oppdater = async (l, patch) => {
    setTravel(l.id);
    try {
      const r = await fetch(`/api/investor/deck/deling?${q}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, patch }) });
      const d = await r.json(); if (!d.ok) throw new Error(d.error || 'Kunne ikke oppdatere');
      await last();
    } catch (e) { setMsg({ ok: false, t: e.message }); }
    setTravel(null);
  };
  const slett = async (l) => {
    if (!window.confirm(`Slette lenken «${l.label}»? Historikken beholdes i loggen.`)) return;
    setTravel(l.id);
    try {
      const r = await fetch(`/api/investor/deck/deling?id=${encodeURIComponent(l.id)}&${q}`, { method: 'DELETE' });
      const d = await r.json(); if (!d.ok) throw new Error(d.error || 'Kunne ikke slette');
      await last();
    } catch (e) { setMsg({ ok: false, t: e.message }); }
    setTravel(null);
  };

  if (laster && !data) return <div className="flex items-center justify-center gap-2 py-16 text-[14px] text-[#999]"><Loader2 className="h-4 w-4 animate-spin" /> Laster investordecket …</div>;
  if (!data) return <div className="rounded-xl bg-[#fdecec] px-4 py-3 text-[13px] text-[#c0392b]">{msg?.t || 'Kunne ikke laste'}</div>;

  const lenker = data.lenker.filter((l) => filter === 'alle' || (filter === 'aktive' ? l.status === 'active' : l.status !== 'active'));
  const s = data.sammendrag;

  return (
    <div className="space-y-6" data-testid="deck-modul">
      {msg && (
        <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-[13px] ${msg.ok ? 'bg-[#e9f7ef] text-[#1f7a4d]' : 'bg-[#fdecec] text-[#c0392b]'}`} data-testid="deck-msg">
          {msg.t}<button onClick={() => setMsg(null)} className="ml-auto text-[12px] underline">Lukk</button>
        </div>
      )}

      {/* ── Scenen ── */}
      <section className="overflow-hidden rounded-3xl bg-[#0a0a0a] text-white shadow-[0_20px_60px_-30px_rgba(0,0,0,0.5)]" data-testid="deck-scene">
        <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-white/50"><Presentation className="h-3.5 w-3.5" />Scenen</p>
            <h2 className="mt-3 text-[30px] font-semibold tracking-[-0.03em] leading-[1.05] sm:text-[36px]">
              {plan ? plan.navn : 'Velg planen decket skal vise'}<span className="text-[#D496FF]">.</span>
            </h2>
            <p className="mt-3 max-w-[56ch] text-[14px] leading-relaxed text-white/60">
              Decket viser alltid planen som står her — tall, drivere og prognose hentes live fra budsjettet. Endrer du planen, endres decket og alle lenker som er låst til den. Tech-planen legger Digihome Tech AS ved siden av.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">Digihome AS · plan</span>
                <span className="block rounded-xl bg-white p-0"><Velger verdi={planId} onChange={velgPlan} valg={data.planer} tom="— velg plan —" testid="deck-plan" /></span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">Digihome Tech AS · plan (valgfri)</span>
                <span className="block rounded-xl bg-white p-0"><Velger verdi={techPlanId} onChange={velgTech} valg={data.techPlaner} tom="— uten Tech —" testid="deck-tech" /></span>
              </label>
            </div>
            <p className="mt-3 flex items-center gap-2 text-[12px] text-white/45">
              {lagrer ? <><Loader2 className="h-3 w-3 animate-spin" />Lagrer valget …</> : data.aktiv?.planId === planId ? <><Check className="h-3 w-3 text-[#5FD39A]" />Husket som aktiv plan for decket</> : 'Valget huskes for alle i teamet'}
              {plan?.updatedAt && <span className="ml-auto">Planen sist endret {siden(plan.updatedAt)}{plan.updatedBy ? ` av ${plan.updatedBy}` : ''}</span>}
            </p>
          </div>
          <div className="flex flex-col justify-between gap-4 lg:col-span-5">
            <div className="grid grid-cols-2 gap-3">
              {[['Aktive lenker', s.aktive, null], ['Åpninger · 30 d', s.aapninger30, `${s.unikeLenker30} lenker i bruk`], ['Sider vist · 30 d', s.sider30, null], ['Nedlastinger · 30 d', s.nedlastinger30, null]].map(([l, v, h]) => (
                <div key={l} className="rounded-2xl bg-white/[0.06] px-4 py-3.5">
                  <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-white/45">{l}</p>
                  <p className="mt-1 text-[26px] font-semibold tracking-[-0.03em] leading-none tabular-nums">{nf.format(v || 0)}</p>
                  {h && <p className="mt-1 text-[11.5px] text-white/40">{h}</p>}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={presenterUrl || '#'} target="_blank" rel="noreferrer" aria-disabled={!presenterUrl} className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-semibold transition ${presenterUrl ? 'bg-[#D496FF] text-[#0a0a0a] hover:bg-[#dfaaff]' : 'pointer-events-none bg-white/10 text-white/40'}`} data-testid="deck-presenter">
                <Presentation className="h-4 w-4" />Presenter
              </a>
              <button type="button" onClick={() => { setNyOpen((v) => !v); setNyLenke(null); }} disabled={!planId} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white/10 px-5 text-[14px] font-semibold text-white transition hover:bg-white/15 disabled:opacity-40" data-testid="deck-ny-lenke">
                <Plus className="h-4 w-4" />Ny lenke
              </button>
            </div>
          </div>
        </div>

        {/* Ny lenke — inline, låst til valgt plan */}
        {nyOpen && (
          <form onSubmit={opprett} className="border-t border-white/10 bg-white/[0.04] p-6 sm:p-8" data-testid="deck-ny-form">
            {nyLenke ? (
              <div className="grid gap-4 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <p className="flex items-center gap-2 text-[13px] font-medium text-[#5FD39A]"><Check className="h-4 w-4" />Lenken er klar — låst til {plan?.navn}</p>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white/10 px-4 py-3 font-mono text-[13px] text-white/90">
                    <Link2 className="h-4 w-4 shrink-0 text-white/50" /><span className="truncate">{lenkeUrl(nyLenke)}</span>
                    <button type="button" onClick={() => kopier(lenkeUrl(nyLenke), 'ny')} className="ml-auto inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 text-[12.5px] font-semibold text-[#0a0a0a]" data-testid="deck-kopier-ny">{kopiert === 'ny' ? <><Check className="h-3.5 w-3.5" />Kopiert</> : <><Copy className="h-3.5 w-3.5" />Kopier</>}</button>
                  </div>
                  {nyLenke.pin || ny.pin ? null : null}
                </div>
                <div className="flex gap-2 lg:col-span-5 lg:justify-end">
                  <a href={lenkeUrl(nyLenke)} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/15"><ExternalLink className="h-4 w-4" />Se som investor</a>
                  <button type="button" onClick={() => { setNyLenke(null); }} className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-[13px] font-semibold text-white hover:bg-white/15"><Plus className="h-4 w-4" />Én til</button>
                  <button type="button" onClick={() => { setNyOpen(false); setNyLenke(null); }} className="inline-flex h-10 items-center rounded-xl px-4 text-[13px] font-semibold text-white/70 hover:text-white">Ferdig</button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
                <label className="block lg:col-span-4">
                  <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">Til hvem</span>
                  <input value={ny.label} onChange={(e) => setNy({ ...ny, label: e.target.value })} placeholder="f.eks. Investinor · Ola Nordmann" className="h-11 w-full rounded-xl bg-white px-3.5 text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#aaa]" data-testid="deck-ny-label" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">Passord (valgfritt)</span>
                  <input value={ny.pin} onChange={(e) => setNy({ ...ny, pin: e.target.value })} placeholder="4–8 tegn" className="h-11 w-full rounded-xl bg-white px-3.5 text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#aaa]" data-testid="deck-ny-pin" />
                </label>
                <label className="block lg:col-span-2">
                  <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">Gyldig</span>
                  <span className="relative block">
                    <select value={ny.expiresDays} onChange={(e) => setNy({ ...ny, expiresDays: e.target.value })} className="h-11 w-full appearance-none rounded-xl bg-white pl-3.5 pr-9 text-[14px] text-[#0a0a0a] outline-none" data-testid="deck-ny-utlop">
                      <option value={7}>7 dager</option><option value={30}>30 dager</option><option value={90}>90 dager</option><option value={0}>Til den trekkes</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
                  </span>
                </label>
                <label className="block lg:col-span-3">
                  <span className="mb-1.5 block text-[11.5px] font-medium uppercase tracking-[0.06em] text-white/45">Notat (internt)</span>
                  <input value={ny.note} onChange={(e) => setNy({ ...ny, note: e.target.value })} placeholder="Møte 12. juni, oppfølging …" className="h-11 w-full rounded-xl bg-white px-3.5 text-[14px] text-[#0a0a0a] outline-none placeholder:text-[#aaa]" data-testid="deck-ny-notat" />
                </label>
                <div className="flex gap-2 lg:col-span-1 lg:justify-end">
                  <button type="submit" disabled={travel === 'ny'} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#D496FF] px-4 text-[14px] font-semibold text-[#0a0a0a] hover:bg-[#dfaaff] disabled:opacity-60 lg:w-auto" data-testid="deck-ny-opprett">{travel === 'ny' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Lag</button>
                </div>
              </div>
            )}
          </form>
        )}
      </section>

      {/* ── Lenkene ── */}
      <section className="rounded-3xl bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]" data-testid="deck-lenker">
        <div className="flex flex-wrap items-center gap-3 px-5 pt-5 sm:px-6">
          <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#0a0a0a]"><Link2 className="h-4 w-4 text-[#9a6ee8]" />Lenker ute</h3>
          <div className="inline-flex items-center rounded-full bg-[#f5f4f0] p-1 text-[12.5px] font-semibold">
            {[['alle', `Alle · ${data.lenker.length}`], ['aktive', `Aktive · ${data.lenker.filter((l) => l.status === 'active').length}`], ['andre', `Utløpt/trukket · ${data.lenker.filter((l) => l.status !== 'active').length}`]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={`rounded-full px-3 py-1 transition ${filter === k ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:text-[#0a0a0a]'}`} data-testid={`deck-filter-${k}`}>{l}</button>
            ))}
          </div>
          <button onClick={last} title="Oppdater" className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f4f0] text-[#666] hover:text-[#0a0a0a]"><RefreshCw className={`h-4 w-4 ${laster ? 'animate-spin' : ''}`} /></button>
        </div>
        {lenker.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13.5px] text-[#999] sm:px-6">{data.lenker.length === 0 ? 'Ingen lenker ennå. Velg plan over og trykk «Ny lenke».' : 'Ingen lenker i dette filteret.'}</p>
        ) : (
          <ul className="mt-4 divide-y divide-[#f0eee9]">
            {lenker.map((l) => {
              const st = STATUS[l.status] || STATUS.active;
              const url = lenkeUrl(l);
              return (
                <li key={l.id} className="grid gap-3 px-5 py-4 sm:px-6 lg:grid-cols-12 lg:items-center" data-testid={`deck-lenke-${l.id}`}>
                  <div className="min-w-0 lg:col-span-4">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-[14.5px] font-semibold text-[#0a0a0a]">{l.label || 'Investordeck'}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${st.c}`}>{st.l}</span>
                      {l.harPassord && <Lock className="h-3.5 w-3.5 shrink-0 text-[#999]" title="Passordbeskyttet" />}
                    </div>
                    <p className="mt-0.5 truncate text-[12.5px] text-[#888]">{l.planNavn || 'Plan slettet'}{l.techPlanNavn ? ` + ${l.techPlanNavn}` : ''}{l.note ? ` · ${l.note}` : ''}</p>
                    <p className="mt-0.5 text-[11.5px] text-[#aaa]">Opprettet {fmtDato(l.createdAt)}{l.expiresAt ? ` · utløper ${fmtDato(l.expiresAt)}` : ' · ingen utløpsdato'}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2 lg:col-span-4">
                    {[[Eye, l.stats.aapninger, 'åpninger'], [Layers, l.stats.sider, 'sider'], [Download, l.stats.nedlastinger, 'nedlastet'], [Clock, siden(l.stats.sistAktiv), 'sist']].map(([Ik, v, t]) => (
                      <div key={t} className="rounded-xl bg-[#f8f7f4] px-3 py-2">
                        <p className="flex items-center gap-1 text-[10.5px] uppercase tracking-[0.05em] text-[#999]"><Ik className="h-3 w-3" />{t}</p>
                        <p className="mt-0.5 truncate text-[14px] font-semibold tabular-nums text-[#0a0a0a]">{typeof v === 'number' ? nf.format(v) : v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 lg:col-span-4 lg:justify-end">
                    <button type="button" onClick={() => kopier(url, l.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f5f4f0] px-3 text-[12.5px] font-semibold text-[#0a0a0a] hover:bg-[#ecebe6]" data-testid={`deck-kopier-${l.id}`}>{kopiert === l.id ? <><Check className="h-3.5 w-3.5" />Kopiert</> : <><Copy className="h-3.5 w-3.5" />Kopier</>}</button>
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#f5f4f0] px-3 text-[12.5px] font-semibold text-[#0a0a0a] hover:bg-[#ecebe6]"><ExternalLink className="h-3.5 w-3.5" />Åpne</a>
                    {l.status === 'revoked' ? (
                      <button type="button" disabled={travel === l.id} onClick={() => oppdater(l, { revoked: false })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#e9f7ef] px-3 text-[12.5px] font-semibold text-[#1f7a4d] hover:bg-[#dcf2e5]" data-testid={`deck-gjenaapne-${l.id}`}><Undo2 className="h-3.5 w-3.5" />Gjenåpne</button>
                    ) : (
                      <button type="button" disabled={travel === l.id} onClick={() => oppdater(l, { revoked: true })} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#fdecec] px-3 text-[12.5px] font-semibold text-[#c0392b] hover:bg-[#fbdede]" data-testid={`deck-trekk-${l.id}`}><Ban className="h-3.5 w-3.5" />Trekk tilbake</button>
                    )}
                    <button type="button" disabled={travel === l.id} onClick={() => slett(l)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#999] hover:bg-[#f5f4f0] hover:text-[#c0392b]" title="Slett" data-testid={`deck-slett-${l.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── Aktivitet ── */}
      <section className="rounded-3xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.04)] sm:p-6" data-testid="deck-aktivitet">
        <h3 className="flex items-center gap-2 text-[15px] font-semibold text-[#0a0a0a]"><Activity className="h-4 w-4 text-[#9a6ee8]" />Aktivitet</h3>
        {data.aktivitet.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-[#999]">Ingen har åpnet decket ennå.</p>
        ) : (
          <ol className="mt-4 divide-y divide-[#f0eee9]">
            {data.aktivitet.slice(0, 40).map((a, i) => (
              <li key={`${a.linkId}-${a.at}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-2.5 text-[13px]">
                <span className="w-[112px] shrink-0 tabular-nums text-[#999]">{fmtTid(a.at)}</span>
                <span className="font-medium text-[#0a0a0a]">{HENDELSE[a.event] || a.event}</span>
                {a.meta?.side && <span className="text-[#666]">· {a.meta.side}</span>}
                {a.meta?.valg && <span className="text-[#666]">· {a.meta.valg}</span>}
                <span className="ml-auto truncate text-[12.5px] text-[#888]">{a.lenkeLabel || '—'}</span>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-[#999]"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9a6ee8]" />Loggen er uten IP-adresser. Investor-rollen ser decket som før — via dataromet.</p>
      </section>
    </div>
  );
}
