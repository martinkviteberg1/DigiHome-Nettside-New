'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2, Plus, Trash2, Pencil, X, TrendingUp, TrendingDown, Activity,
  Building2, Receipt, Settings2, Zap, Megaphone, Wallet, AlertTriangle, Check,
  BarChart3, RefreshCw, Landmark, Download, FileText, Target, Rocket, PieChart,
  Percent, ArrowUpRight, ArrowDownRight, Repeat,
} from 'lucide-react';

import ApiUsageTab from '@/components/admin/ApiUsageTab';

// ── Formattering (NOK, nb-NO) ───────────────────────────────────────────────
const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const kr = (n) => `${nf0.format(Math.round(Number(n) || 0))} kr`;
const krSigned = (n) => `${(Number(n) || 0) >= 0 ? '' : '−'}${nf0.format(Math.abs(Math.round(Number(n) || 0)))} kr`;
const pctFmt = (n) => (n == null ? '—' : `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(n)} %`);

const TABS = [
  { k: 'resultat', l: 'Resultat', icon: TrendingUp },
  { k: 'likviditet', l: 'Likviditet', icon: Activity },
  { k: 'trender', l: 'Trender', icon: BarChart3 },
  { k: 'investor', l: 'Investor', icon: Landmark },
  { k: 'kontrakter', l: 'Kontrakter', icon: Building2 },
  { k: 'kostnader', l: 'Kostnader', icon: Receipt },
  { k: 'api', l: 'API-forbruk', icon: Zap },
  { k: 'innstillinger', l: 'Innstillinger', icon: Settings2 },
];

const COST_CATEGORIES = ['Lønn', 'Husleie', 'Programvare/SaaS', 'Regnskap', 'API/LLM', 'Markedsføring', 'Annet'];
const FREQ_LABEL = { monthly: 'Månedlig', quarterly: 'Kvartalsvis', yearly: 'Årlig' };

const inputCls = 'w-full h-10 px-3 rounded-lg border border-[#e5e5ea] bg-white text-[14px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50 focus:border-[#cf97fc]';
const labelCls = 'block text-[12px] font-semibold text-[#666] mb-1.5';
const btnDark = 'inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0a0a0a] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#e5e5ea] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f7f7f8] transition-colors';

export default function FinanceDashboard({ apiKey }) {
  const [tab, setTab] = useState('resultat');
  const [loading, setLoading] = useState(true);
  const [resultat, setResultat] = useState(null);
  const [likviditet, setLikviditet] = useState(null);
  const [costs, setCosts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [scenario, setScenario] = useState('forventet');
  const [saving, setSaving] = useState(false);
  const [trends, setTrends] = useState(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [investor, setInvestor] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [investorLoading, setInvestorLoading] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(false);

  const api = useCallback(async (path, opts = {}) => {
    const sep = path.includes('?') ? '&' : '?';
    const r = await fetch(`/api/admin/finance${path}${sep}key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/json' }, ...opts,
    });
    return r.json();
  }, [apiKey]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [r, l, c, ct, ev, s] = await Promise.all([
        api('/resultat'), api('/likviditet?months=12'), api('/costs'), api('/contracts'), api('/events'), api('/settings'),
      ]);
      setResultat(r); setLikviditet(l);
      setCosts(c.costs || []); setContracts(ct.contracts || []); setEvents(ev.events || []);
      setSettings(s.settings || null);
    } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { if (apiKey) loadAll(); }, [apiKey, loadAll]);

  const refresh = useCallback(async () => {
    const [r, l] = await Promise.all([api('/resultat'), api('/likviditet?months=12')]);
    setResultat(r); setLikviditet(l);
  }, [api]);

  const loadTrends = useCallback(async () => {
    setTrendsLoading(true);
    try { const t = await api('/trends?months=12'); setTrends(t); } finally { setTrendsLoading(false); }
  }, [api]);
  useEffect(() => { if (apiKey && tab === 'trender' && !trends && !trendsLoading) loadTrends(); }, [apiKey, tab, trends, trendsLoading, loadTrends]);

  const loadInvestor = useCallback(async () => {
    setInvestorLoading(true);
    try {
      const [inv, fc] = await Promise.all([api('/investor?horizon=12'), api('/forecast?months=18')]);
      setInvestor(inv); setForecast(fc);
    } finally { setInvestorLoading(false); }
  }, [api]);
  useEffect(() => { if (apiKey && tab === 'investor' && !investor && !investorLoading) loadInvestor(); }, [apiKey, tab, investor, investorLoading, loadInvestor]);

  const recomputeForecast = useCallback(async (assumptions) => {
    setForecastLoading(true);
    try {
      const qs = new URLSearchParams({ months: '18' });
      Object.entries(assumptions || {}).forEach(([k, v]) => { if (v !== '' && v != null) qs.set(k, String(v)); });
      const fc = await api(`/forecast?${qs.toString()}`);
      setForecast(fc);
      return fc;
    } finally { setForecastLoading(false); }
  }, [api]);
  const saveForecastAssumptions = useCallback(async (assumptions) => {
    await api('/settings', { method: 'POST', body: JSON.stringify({ forecast: assumptions }) });
    const s = await api('/settings'); setSettings(s.settings || null);
  }, [api]);

  const syncContracts = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await api('/sync-contracts', { method: 'POST', body: JSON.stringify({}) });
      const ct = await api('/contracts'); setContracts(ct.contracts || []);
      await refresh(); setTrends(null);
      return res;
    } finally { setSyncing(false); }
  }, [api, refresh]);

  const saveEntity = async (kind, item) => {
    setSaving(true);
    try {
      await api(`/${kind}`, { method: 'POST', body: JSON.stringify(item) });
      const res = await api(`/${kind}`);
      if (kind === 'costs') setCosts(res.costs || []);
      if (kind === 'contracts') setContracts(res.contracts || []);
      if (kind === 'events') setEvents(res.events || []);
      await refresh();
    } finally { setSaving(false); }
  };
  const deleteEntity = async (kind, id) => {
    await api(`/${kind}`, { method: 'DELETE', body: JSON.stringify({ id }) });
    const res = await api(`/${kind}`);
    if (kind === 'costs') setCosts(res.costs || []);
    if (kind === 'contracts') setContracts(res.contracts || []);
    if (kind === 'events') setEvents(res.events || []);
    await refresh();
  };
  const saveSettings = async (patch) => {
    setSaving(true);
    try {
      const s = await api('/settings', { method: 'POST', body: JSON.stringify(patch) });
      setSettings(s.settings || null);
      await refresh();
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-[#999]">
        <Loader2 className="w-6 h-6 animate-spin mr-3" /> Laster økonomi…
      </div>
    );
  }

  return (
    <div className="max-w-[1200px]" data-testid="finance-dashboard">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#eee] mb-8 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon; const active = tab === t.k;
          return (
            <button key={t.k} onClick={() => setTab(t.k)} data-testid={`fin-tab-${t.k}`}
              className={`inline-flex items-center gap-2 px-4 py-3 text-[14px] font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${active ? 'border-[#0a0a0a] text-[#0a0a0a]' : 'border-transparent text-[#999] hover:text-[#555]'}`}>
              <Icon className="w-4 h-4" /> {t.l}
            </button>
          );
        })}
      </div>

      {tab === 'resultat' && <ResultatTab data={resultat} />}
      {tab === 'likviditet' && (
        <LikviditetTab data={likviditet} scenario={scenario} setScenario={setScenario}
          events={events} onSaveEvent={(e) => saveEntity('events', e)} onDeleteEvent={(id) => deleteEntity('events', id)}
          settings={settings} onSaveSettings={saveSettings} contracts={contracts} saving={saving} />
      )}
      {tab === 'trender' && <TrenderTab data={trends} loading={trendsLoading} />}
      {tab === 'investor' && (
        <InvestorTab data={investor} forecast={forecast} loading={investorLoading} forecastLoading={forecastLoading}
          onRecompute={recomputeForecast} onSaveAssumptions={saveForecastAssumptions} apiKey={apiKey} />
      )}
      {tab === 'kontrakter' && (
        <KontrakterTab items={contracts} onSave={(c) => saveEntity('contracts', c)} onDelete={(id) => deleteEntity('contracts', id)} onSync={syncContracts} syncing={syncing} saving={saving} />
      )}
      {tab === 'kostnader' && (
        <KostnaderTab items={costs} auto={resultat?.configured} onSave={(c) => saveEntity('costs', c)} onDelete={(id) => deleteEntity('costs', id)} saving={saving} />
      )}
      {tab === 'api' && <ApiUsageTab apiKey={apiKey} />}
      {tab === 'innstillinger' && <InnstillingerTab settings={settings} onSave={saveSettings} saving={saving} />}
    </div>
  );
}

// ═══════════════════════════ RESULTAT (P&L) ═══════════════════════════
function ResultatTab({ data }) {
  if (!data || !data.ok) return <Empty msg="Kunne ikke laste resultat." />;
  const m = data.monthly;
  const maxCost = Math.max(1, ...(data.costBreakdown || []).map((c) => c.amount));
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigStat label="Månedlig resultat (forventet)" value={krSigned(m.resultatForventet)}
          sub={m.marginForventet != null ? `${pctFmt(m.marginForventet)} margin` : '—'}
          tone={m.resultatForventet >= 0 ? 'pos' : 'neg'} big />
        <BigStat label="Honorarinntekt / mnd" value={kr(m.incomeForventet)}
          sub={`Faktisk ${kr(m.incomeActual)} · forventet +${kr(m.incomeExpected)}`} />
        <BigStat label="Kostnader / mnd (OPEX)" value={kr(m.opexTotal)}
          sub={`${m.activeContracts} aktive avtaler`} tone="neg" />
      </div>

      {/* Nøkkeltall-rad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Resultat (faktisk)" value={krSigned(m.resultatActual)} sub={m.marginActual != null ? `${pctFmt(m.marginActual)} margin` : '—'} tone={m.resultatActual >= 0 ? 'pos' : 'neg'} />
        <MiniStat label="Dekningsbidrag / mnd" value={kr(m.contributionMargin)} sub="Honorar − annonse" />
        <MiniStat label="Break-even" value={m.breakEvenContracts != null ? `${m.breakEvenContracts} avtaler` : '—'} sub="For å dekke OPEX" />
        <MiniStat label="Snitt honorar / avtale" value={kr(m.avgFeePerContract)} sub="Per mnd" />
      </div>

      {/* Kostnadsfordeling */}
      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111] mb-4">Kostnadsfordeling / mnd</h3>
        {(data.costBreakdown || []).length === 0 ? (
          <p className="text-[13px] text-[#999]">Ingen kostnader registrert ennå. Legg inn faste kostnader under «Kostnader».</p>
        ) : (
          <div className="space-y-3">
            {data.costBreakdown.map((c) => (
              <div key={c.category}>
                <div className="flex items-center justify-between text-[13px] mb-1">
                  <span className="font-medium text-[#333]">{c.category}</span>
                  <span className="text-[#666]">{kr(c.amount)}</span>
                </div>
                <div className="h-2 rounded-full bg-[#f2f2f4] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#cf97fc] to-[#7c3aed]" style={{ width: `${(c.amount / maxCost) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-[#f0f0f0] flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#888]">
          <span className="inline-flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Annonse auto: {kr(m.adSpendMonthly)}/mnd</span>
          <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> LLM auto: {kr(m.llmMonthly)}/mnd</span>
          {m.extMonthly > 0 && <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> API-tjenester auto: {kr(m.extMonthly)}/mnd</span>}
          {m.platformMonthly > 0 && <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Plattform-CRM auto: {kr(m.platformMonthly)}/mnd</span>}
        </div>
      </div>

      {/* Årlig projeksjon */}
      <div className="rounded-2xl bg-[#0a0a0a] text-white p-6">
        <p className="text-[12px] uppercase tracking-[0.12em] text-white/50 mb-4">Årlig projeksjon (run-rate)</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div><p className="text-[12px] text-white/60">Honorar (forventet)</p><p className="text-[24px] font-bold mt-1">{kr(data.annual.incomeForventet)}</p></div>
          <div><p className="text-[12px] text-white/60">Kostnader</p><p className="text-[24px] font-bold mt-1">{kr(data.annual.opexTotal)}</p></div>
          <div><p className="text-[12px] text-white/60">Resultat (forventet)</p><p className={`text-[24px] font-bold mt-1 ${data.annual.resultatForventet >= 0 ? 'text-[#7CFFB2]' : 'text-[#FF9B9B]'}`}>{krSigned(data.annual.resultatForventet)}</p></div>
        </div>
      </div>
      <p className="text-[11px] text-[#aaa]">Alle beløp i NOK eks. mva. Annonse- og LLM-kostnad hentes automatisk (siste 30 dager) og projiseres flatt.</p>
    </div>
  );
}

// ═══════════════════════════ LIKVIDITET ═══════════════════════════
function LikviditetTab({ data, scenario, setScenario, events, onSaveEvent, onDeleteEvent, settings, onSaveSettings, contracts, saving }) {
  const [showEvent, setShowEvent] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  if (!data || !data.ok) return <Empty msg="Kunne ikke laste likviditet." />;
  const series = (data.scenarios && data.scenarios[scenario]) || [];
  const sum = (data.summary && data.summary[scenario]) || {};
  const openingSet = data.openingSet;

  // For kurve: bruk saldo hvis satt, ellers akkumulert netto fra 0
  let running = openingSet ? data.opening : 0;
  const curve = series.map((p) => { running = openingSet ? p.cash : running + p.net; return { label: p.label, v: running, net: p.net }; });
  const vals = curve.map((c) => c.v);
  const minV = Math.min(0, ...vals), maxV = Math.max(0, ...vals);
  const range = maxV - minV || 1;
  const W = 720, H = 160, pad = 8;
  const pts = curve.map((c, i) => {
    const x = pad + (i / Math.max(1, curve.length - 1)) * (W - pad * 2);
    const y = H - pad - ((c.v - minV) / range) * (H - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const zeroY = H - pad - ((0 - minV) / range) * (H - pad * 2);

  return (
    <div className="space-y-8">
      {/* Scenario + KPI */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-lg border border-[#e5e5ea] p-1 bg-[#f7f7f8]">
          {[['faktisk', 'Faktisk'], ['forventet', 'Forventet']].map(([k, l]) => (
            <button key={k} onClick={() => setScenario(k)} data-testid={`fin-scenario-${k}`}
              className={`px-4 py-1.5 rounded-md text-[13px] font-semibold transition-colors ${scenario === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888]'}`}>{l}</button>
          ))}
        </div>
        <button className={btnGhost} onClick={() => { setEditEvent(null); setShowEvent(true); }}><Plus className="w-4 h-4" /> Engangspost / utlegg</button>
      </div>

      {!openingSet && (
        <div className="flex items-start gap-3 rounded-xl bg-[#fff8ec] border border-[#f4e3c0] px-4 py-3 text-[13px] text-[#8a6d2f]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Ingen inngående kontantsaldo satt ennå. Kurven viser <strong>akkumulert netto</strong>. Legg inn banksaldo under «Innstillinger» for å få reell runway.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigStat label="Burn rate (snitt/mnd)" value={sum.burnRate > 0 ? `${kr(sum.burnRate)}` : 'Positiv drift'} tone={sum.burnRate > 0 ? 'neg' : 'pos'} big />
        <BigStat label="Runway" value={openingSet ? (sum.runwayMonths == null ? '12+ mnd' : `${sum.runwayMonths} mnd`) : '— (mangler saldo)'} sub={openingSet ? `Fra saldo ${kr(data.opening)}` : 'Sett banksaldo'} />
        <BigStat label="Netto 12 mnd (snitt)" value={krSigned(sum.avgNet)} tone={sum.avgNet >= 0 ? 'pos' : 'neg'} />
      </div>

      {/* Kurve */}
      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111] mb-4">{openingSet ? 'Kontantsaldo' : 'Akkumulert netto'} — 12 måneder ({scenario === 'faktisk' ? 'kun faktisk' : 'faktisk + forventet'})</h3>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 180 }} preserveAspectRatio="none">
          <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#e5e5ea" strokeWidth="1" strokeDasharray="4 4" />
          <polyline points={pts} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {curve.map((c, i) => {
            const x = pad + (i / Math.max(1, curve.length - 1)) * (W - pad * 2);
            const y = H - pad - ((c.v - minV) / range) * (H - pad * 2);
            return <circle key={i} cx={x} cy={y} r="3" fill={c.v < 0 ? '#e5484d' : '#7c3aed'} />;
          })}
        </svg>
        <div className="flex justify-between mt-2 text-[10px] text-[#bbb]">
          {curve.map((c, i) => <span key={i}>{c.label}</span>)}
        </div>
      </div>

      {/* Månedstabell */}
      <div className="rounded-2xl border border-[#eee] bg-white overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#fafafa] text-[#888] text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left font-semibold px-4 py-3">Måned</th>
              <th className="text-right font-semibold px-4 py-3">Inntekt</th>
              <th className="text-right font-semibold px-4 py-3">Kostnad</th>
              <th className="text-right font-semibold px-4 py-3">Engang</th>
              <th className="text-right font-semibold px-4 py-3">Netto</th>
              <th className="text-right font-semibold px-4 py-3">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {series.map((p) => (
              <tr key={p.ym} className="border-t border-[#f2f2f2]">
                <td className="px-4 py-2.5 font-medium text-[#333]">{p.label}</td>
                <td className="px-4 py-2.5 text-right text-[#1a7f45]">{kr(p.income)}</td>
                <td className="px-4 py-2.5 text-right text-[#999]">−{kr(p.costs)}</td>
                <td className="px-4 py-2.5 text-right text-[#999]">{p.events ? krSigned(p.events) : '—'}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${p.net >= 0 ? 'text-[#1a7f45]' : 'text-[#e5484d]'}`}>{krSigned(p.net)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${p.cash == null ? 'text-[#ccc]' : p.cash < 0 ? 'text-[#e5484d]' : 'text-[#111]'}`}>{p.cash == null ? '—' : kr(p.cash)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Engangsposter */}
      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-[#111]">Engangsposter / utlegg</h3>
        </div>
        {events.length === 0 ? (
          <p className="text-[13px] text-[#999]">Ingen engangsposter. F.eks. et planlagt utlegg om 3 måneder (styling/møblering) legges inn her og treffer likviditeten den måneden.</p>
        ) : (
          <div className="divide-y divide-[#f2f2f2]">
            {events.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-[#222]">{e.label || e.category || 'Engangspost'}</p>
                  <p className="text-[11px] text-[#999]">{e.date} · {e.confidence === 'faktisk' ? 'Faktisk' : 'Forventet'}{e.category ? ` · ${e.category}` : ''}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[13px] font-semibold ${e.direction === 'in' ? 'text-[#1a7f45]' : 'text-[#e5484d]'}`}>{e.direction === 'in' ? '+' : '−'}{kr(e.amount)}</span>
                  <button onClick={() => { setEditEvent(e); setShowEvent(true); }} className="p-1.5 text-[#999] hover:text-[#333]"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => onDeleteEvent(e.id)} className="p-1.5 text-[#999] hover:text-[#e5484d]"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showEvent && (
        <EventModal item={editEvent} contracts={contracts} saving={saving}
          onClose={() => setShowEvent(false)}
          onSave={async (e) => { await onSaveEvent(e); setShowEvent(false); }} />
      )}
    </div>
  );
}

// ═══════════════════════════ KONTRAKTER ═══════════════════════════
function KontrakterTab({ items, onSave, onDelete, onSync, syncing, saving }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  const [syncMsg, setSyncMsg] = useState('');
  const doSync = async () => {
    const r = await onSync();
    if (r) setSyncMsg(r.ok ? `Synket ${r.upserted} kontrakter fra plattformen` : `Synk feilet: ${r.error || r.status || ''}`);
    setTimeout(() => setSyncMsg(''), 4000);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[13px] text-[#888]">{items.length} kontrakter/avtaler · honorar = prosent av leie</p>
        <div className="flex items-center gap-2">
          {syncMsg && <span className="text-[12px] text-[#1a7f45]">{syncMsg}</span>}
          <button className={btnGhost} onClick={doSync} disabled={syncing} data-testid="fin-sync-contracts">{syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Synk fra plattform</button>
          <button className={btnDark} onClick={() => { setEdit(null); setShow(true); }} data-testid="fin-add-contract"><Plus className="w-4 h-4" /> Ny kontrakt</button>
        </div>
      </div>
      {items.length === 0 ? (
        <Empty msg="Ingen kontrakter ennå. Legg inn leiekontrakter (faktisk leie) og forvaltningsavtaler (antatt leie)." />
      ) : (
        <div className="rounded-2xl border border-[#eee] bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#fafafa] text-[#888] text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Type / referanse</th>
                <th className="text-right font-semibold px-4 py-3">Leie/mnd</th>
                <th className="text-right font-semibold px-4 py-3">Honorar</th>
                <th className="text-right font-semibold px-4 py-3">Honorar/mnd</th>
                <th className="text-left font-semibold px-4 py-3">Start</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => {
                const rent = c.type === 'leiekontrakt' ? c.monthlyRent : c.estimatedMonthlyRent;
                const fee = Math.round(((rent || 0) * (c.feePercent || 0)) / 100);
                return (
                  <tr key={c.id} className="border-t border-[#f2f2f2]">
                    <td className="px-4 py-3">
                      <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded mr-2 ${c.type === 'leiekontrakt' ? 'bg-[#e8f5ee] text-[#1a7f45]' : 'bg-[#f0e9fb] text-[#7c3aed]'}`}>{c.type === 'leiekontrakt' ? 'Leie' : 'Forvaltning'}</span>
                      <span className="font-medium text-[#222]">{c.label || c.propertyAddress || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-[#333]">{rent ? kr(rent) : '—'}{c.type === 'forvaltningsavtale' && <span className="text-[10px] text-[#bbb] ml-1">(antatt)</span>}</td>
                    <td className="px-4 py-3 text-right text-[#666]">{c.feePercent != null ? `${c.feePercent} %` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[#111]">{kr(fee)}</td>
                    <td className="px-4 py-3 text-[#999]">{c.type === 'forvaltningsavtale' ? (c.expectedRentStart || c.startDate || '—') : (c.startDate || '—')}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => { setEdit(c); setShow(true); }} className="p-1.5 text-[#999] hover:text-[#333]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(c.id)} className="p-1.5 text-[#999] hover:text-[#e5484d]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {show && <ContractModal item={edit} saving={saving} onClose={() => setShow(false)} onSave={async (c) => { await onSave(c); setShow(false); }} />}
    </div>
  );
}

// ═══════════════════════════ KOSTNADER ═══════════════════════════
function KostnaderTab({ items, auto, onSave, onDelete, saving }) {
  const [show, setShow] = useState(false);
  const [edit, setEdit] = useState(null);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-[#888]">{items.length} faste kostnader</p>
        <button className={btnDark} onClick={() => { setEdit(null); setShow(true); }} data-testid="fin-add-cost"><Plus className="w-4 h-4" /> Ny kostnad</button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-[#888] rounded-xl bg-[#f7f7f8] px-4 py-3">
        <span className="inline-flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Annonseforbruk hentes automatisk: <strong className="text-[#555]">{kr(auto?.adSpendMonthly || 0)}/mnd</strong></span>
        <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> LLM-kostnad hentes automatisk: <strong className="text-[#555]">{kr(auto?.llmMonthly || 0)}/mnd</strong></span>
        <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> API-tjenester (SendGrid/SerpAPI/Maps): <strong className="text-[#555]">{kr(auto?.extMonthly || 0)}/mnd</strong></span>
        <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Plattform-CRM (Twilio, e-sign, AI): <strong className="text-[#555]">{kr(auto?.platformMonthly || 0)}/mnd</strong>{auto?.platform === false && <em className="text-[#bbb] not-italic">(venter på tilkobling)</em>}</span>
      </div>
      {items.length === 0 ? (
        <Empty msg="Ingen faste kostnader ennå. Legg inn lønn, husleie, programvare, regnskap m.m." />
      ) : (
        <div className="rounded-2xl border border-[#eee] bg-white overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#fafafa] text-[#888] text-[11px] uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Navn</th>
                <th className="text-left font-semibold px-4 py-3">Kategori</th>
                <th className="text-left font-semibold px-4 py-3">Frekvens</th>
                <th className="text-right font-semibold px-4 py-3">Beløp</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-[#f2f2f2]">
                  <td className="px-4 py-3 font-medium text-[#222]">{c.name || '—'}{c.vendor ? <span className="text-[11px] text-[#aaa] ml-2">{c.vendor}</span> : null}</td>
                  <td className="px-4 py-3 text-[#666]">{c.category}</td>
                  <td className="px-4 py-3 text-[#999]">{FREQ_LABEL[c.frequency] || c.frequency}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[#111]">{kr(c.amount)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => { setEdit(c); setShow(true); }} className="p-1.5 text-[#999] hover:text-[#333]"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(c.id)} className="p-1.5 text-[#999] hover:text-[#e5484d]"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {show && <CostModal item={edit} saving={saving} onClose={() => setShow(false)} onSave={async (c) => { await onSave(c); setShow(false); }} />}
    </div>
  );
}

// ═══════════════════════════ INNSTILLINGER ═══════════════════════════
function InnstillingerTab({ settings, onSave, saving }) {
  const [bal, setBal] = useState(settings?.openingCashBalance ?? '');
  const [date, setDate] = useState(settings?.openingCashDate || '');
  const [ads, setAds] = useState(settings?.includeAdSpend !== false);
  const [llm, setLlm] = useState(settings?.includeLlm !== false);
  const [ext, setExt] = useState(settings?.includeExt !== false);
  const [plat, setPlat] = useState(settings?.includePlatform !== false);
  const [ok, setOk] = useState(false);
  useEffect(() => { setBal(settings?.openingCashBalance ?? ''); setDate(settings?.openingCashDate || ''); setAds(settings?.includeAdSpend !== false); setLlm(settings?.includeLlm !== false); setExt(settings?.includeExt !== false); setPlat(settings?.includePlatform !== false); }, [settings]);
  const save = async () => { await onSave({ openingCashBalance: bal === '' ? null : bal, openingCashDate: date, includeAdSpend: ads, includeLlm: llm, includeExt: ext, includePlatform: plat }); setOk(true); setTimeout(() => setOk(false), 2000); };
  return (
    <div className="max-w-[560px] space-y-6">
      <div className="rounded-2xl border border-[#eee] bg-white p-6 space-y-4">
        <h3 className="text-[15px] font-bold text-[#111]">Likviditet</h3>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Inngående kontantsaldo (bank)</label><input type="number" value={bal} onChange={(e) => setBal(e.target.value)} className={inputCls} placeholder="f.eks. 500000" /></div>
          <div><label className={labelCls}>Per dato</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
        </div>
        <p className="text-[12px] text-[#999]">Brukes som startpunkt for runway-kurven. La stå tomt om du ikke har tallet ennå.</p>
      </div>
      <div className="rounded-2xl border border-[#eee] bg-white p-6 space-y-4">
        <h3 className="text-[15px] font-bold text-[#111]">Automatiske kostnader</h3>
        <Toggle label="Inkluder annonseforbruk (Google/Meta) som kostnad" checked={ads} onChange={setAds} />
        <Toggle label="Inkluder LLM-kostnad (self-metered) som kostnad" checked={llm} onChange={setLlm} />
        <Toggle label="Inkluder eksterne API-tjenester (SendGrid/SerpAPI/Maps) som kostnad" checked={ext} onChange={setExt} />
        <Toggle label="Inkluder plattform-CRM-kostnader (Twilio, e-sign, deres AI) som kostnad" checked={plat} onChange={setPlat} />
      </div>
      <div className="flex items-center gap-3">
        <button className={btnDark} onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lagre innstillinger</button>
        {ok && <span className="text-[13px] text-[#1a7f45] font-medium">Lagret</span>}
      </div>
      <p className="text-[11px] text-[#aaa]">Valuta: NOK · Beløp føres eks. mva.</p>
    </div>
  );
}

// ═══════════════════════════ MODALER ═══════════════════════════
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div className="w-full max-w-[560px] max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eee] sticky top-0 bg-white">
          <h3 className="text-[16px] font-bold text-[#111]">{title}</h3>
          <button onClick={onClose} className="p-1.5 text-[#999] hover:text-[#333]"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function ContractModal({ item, onClose, onSave, saving }) {
  const [f, setF] = useState({
    id: item?.id || null, type: item?.type || 'leiekontrakt', label: item?.label || '', propertyAddress: item?.propertyAddress || '',
    ownerName: item?.ownerName || '', tenantName: item?.tenantName || '', monthlyRent: item?.monthlyRent ?? '', estimatedMonthlyRent: item?.estimatedMonthlyRent ?? '',
    feePercent: item?.feePercent ?? '', status: item?.status || 'active', startDate: item?.startDate || '', endDate: item?.endDate || '', expectedRentStart: item?.expectedRentStart || '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const isLease = f.type === 'leiekontrakt';
  return (
    <Modal title={item ? 'Rediger kontrakt' : 'Ny kontrakt'} onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Type</label>
          <select value={f.type} onChange={(e) => set('type', e.target.value)} className={inputCls} data-testid="fin-contract-type">
            <option value="leiekontrakt">Leiekontrakt (faktisk leie)</option>
            <option value="forvaltningsavtale">Forvaltningsavtale (antatt leie)</option>
          </select>
        </div>
        <div><label className={labelCls}>Navn / referanse</label><input value={f.label} onChange={(e) => set('label', e.target.value)} className={inputCls} placeholder="f.eks. Nordnesgaten 12" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Adresse</label><input value={f.propertyAddress} onChange={(e) => set('propertyAddress', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>{isLease ? 'Leietaker' : 'Eier'}</label><input value={isLease ? f.tenantName : f.ownerName} onChange={(e) => set(isLease ? 'tenantName' : 'ownerName', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {isLease ? (
            <div><label className={labelCls}>Faktisk månedsleie (kr)</label><input type="number" value={f.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} className={inputCls} data-testid="fin-contract-rent" /></div>
          ) : (
            <div><label className={labelCls}>Antatt månedsleie (kr)</label><input type="number" value={f.estimatedMonthlyRent} onChange={(e) => set('estimatedMonthlyRent', e.target.value)} className={inputCls} data-testid="fin-contract-rent" /></div>
          )}
          <div><label className={labelCls}>Honorar (% av leie)</label><input type="number" step="0.5" value={f.feePercent} onChange={(e) => set('feePercent', e.target.value)} className={inputCls} placeholder="f.eks. 12" data-testid="fin-contract-fee" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>{isLease ? 'Startdato (leie)' : 'Avtale signert'}</label><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></div>
          {isLease ? (
            <div><label className={labelCls}>Sluttdato (valgfri)</label><input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></div>
          ) : (
            <div><label className={labelCls}>Forventet leiestart</label><input type="date" value={f.expectedRentStart} onChange={(e) => set('expectedRentStart', e.target.value)} className={inputCls} data-testid="fin-contract-expected" /></div>
          )}
        </div>
        <div><label className={labelCls}>Status</label>
          <select value={f.status} onChange={(e) => set('status', e.target.value)} className={inputCls}>
            <option value="active">Aktiv</option><option value="pending">Venter</option><option value="terminated">Avsluttet</option>
          </select>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button className={btnGhost} onClick={onClose}>Avbryt</button>
          <button className={btnDark} onClick={() => onSave(f)} disabled={saving} data-testid="fin-contract-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lagre</button>
        </div>
      </div>
    </Modal>
  );
}

function CostModal({ item, onClose, onSave, saving }) {
  const [f, setF] = useState({
    id: item?.id || null, name: item?.name || '', category: item?.category || 'Lønn', amount: item?.amount ?? '',
    frequency: item?.frequency || 'monthly', vendor: item?.vendor || '', startDate: item?.startDate || '', endDate: item?.endDate || '', note: item?.note || '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={item ? 'Rediger kostnad' : 'Ny kostnad'} onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Navn</label><input value={f.name} onChange={(e) => set('name', e.target.value)} className={inputCls} placeholder="f.eks. Lønn Sarah" data-testid="fin-cost-name" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Kategori</label>
            <select value={f.category} onChange={(e) => set('category', e.target.value)} className={inputCls}>
              {COST_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={labelCls}>Frekvens</label>
            <select value={f.frequency} onChange={(e) => set('frequency', e.target.value)} className={inputCls}>
              <option value="monthly">Månedlig</option><option value="quarterly">Kvartalsvis</option><option value="yearly">Årlig</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Beløp (kr)</label><input type="number" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} data-testid="fin-cost-amount" /></div>
          <div><label className={labelCls}>Leverandør (valgfri)</label><input value={f.vendor} onChange={(e) => set('vendor', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Startdato (valgfri)</label><input type="date" value={f.startDate} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Sluttdato (valgfri)</label><input type="date" value={f.endDate} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button className={btnGhost} onClick={onClose}>Avbryt</button>
          <button className={btnDark} onClick={() => onSave(f)} disabled={saving} data-testid="fin-cost-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lagre</button>
        </div>
      </div>
    </Modal>
  );
}

function EventModal({ item, contracts, onClose, onSave, saving }) {
  const [f, setF] = useState({
    id: item?.id || null, label: item?.label || '', direction: item?.direction || 'out', amount: item?.amount ?? '',
    date: item?.date || '', category: item?.category || '', confidence: item?.confidence || 'forventet', linkedContractId: item?.linkedContractId || '',
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={item ? 'Rediger engangspost' : 'Ny engangspost / utlegg'} onClose={onClose}>
      <div className="space-y-4">
        <div><label className={labelCls}>Beskrivelse</label><input value={f.label} onChange={(e) => set('label', e.target.value)} className={inputCls} placeholder="f.eks. Styling ny enhet" data-testid="fin-event-label" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Retning</label>
            <select value={f.direction} onChange={(e) => set('direction', e.target.value)} className={inputCls}>
              <option value="out">Utgift / utlegg</option><option value="in">Inntekt</option>
            </select>
          </div>
          <div><label className={labelCls}>Beløp (kr)</label><input type="number" value={f.amount} onChange={(e) => set('amount', e.target.value)} className={inputCls} data-testid="fin-event-amount" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelCls}>Dato</label><input type="date" value={f.date} onChange={(e) => set('date', e.target.value)} className={inputCls} data-testid="fin-event-date" /></div>
          <div><label className={labelCls}>Sikkerhet</label>
            <select value={f.confidence} onChange={(e) => set('confidence', e.target.value)} className={inputCls}>
              <option value="forventet">Forventet</option><option value="faktisk">Faktisk</option>
            </select>
          </div>
        </div>
        <div><label className={labelCls}>Kategori (valgfri)</label><input value={f.category} onChange={(e) => set('category', e.target.value)} className={inputCls} placeholder="f.eks. Møblering" /></div>
        <div className="flex justify-end gap-3 pt-2">
          <button className={btnGhost} onClick={onClose}>Avbryt</button>
          <button className={btnDark} onClick={() => onSave(f)} disabled={saving} data-testid="fin-event-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lagre</button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════ SMÅ BYGGEKLOSSER ═══════════════════════════
function BigStat({ label, value, sub, tone, big }) {
  const color = tone === 'pos' ? 'text-[#1a7f45]' : tone === 'neg' ? 'text-[#0a0a0a]' : 'text-[#0a0a0a]';
  return (
    <div className="rounded-2xl border border-[#eee] bg-white p-6">
      <p className="text-[12px] font-semibold text-[#999] uppercase tracking-[0.08em]">{label}</p>
      <p className={`${big ? 'text-[32px]' : 'text-[26px]'} font-bold mt-2 tracking-[-0.02em] ${color}`}>{value}</p>
      {sub && <p className="text-[12px] text-[#aaa] mt-1">{sub}</p>}
    </div>
  );
}
function MiniStat({ label, value, sub, tone }) {
  const color = tone === 'pos' ? 'text-[#1a7f45]' : tone === 'neg' ? 'text-[#e5484d]' : 'text-[#111]';
  return (
    <div className="rounded-xl border border-[#eee] bg-white p-4">
      <p className="text-[11px] font-semibold text-[#999] uppercase tracking-[0.06em]">{label}</p>
      <p className={`text-[19px] font-bold mt-1.5 ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#bbb] mt-0.5">{sub}</p>}
    </div>
  );
}
function Toggle({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center justify-between w-full text-left">
      <span className="text-[13px] text-[#333]">{label}</span>
      <span className={`w-10 h-6 rounded-full p-0.5 transition-colors ${checked ? 'bg-[#7c3aed]' : 'bg-[#ddd]'}`}>
        <span className={`block w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
    </button>
  );
}
function Empty({ msg }) {
  return <div className="rounded-2xl border border-dashed border-[#e5e5ea] bg-[#fafafa] p-10 text-center text-[13px] text-[#999]">{msg}</div>;
}

// ═══════════════════════════ TRENDER ═══════════════════════════
function MultiLineChart({ data, lines, height = 180 }) {
  if (!data || data.length === 0) return <Empty msg="Ingen data ennå." />;
  const W = 720, H = height, pad = 10, padB = 20;
  const allVals = [];
  data.forEach((d) => lines.forEach((l) => { const v = Number(d[l.key]); if (isFinite(v)) allVals.push(v); }));
  const minV = Math.min(0, ...allVals), maxV = Math.max(1, ...allVals);
  const range = (maxV - minV) || 1;
  const xAt = (i) => pad + (i / Math.max(1, data.length - 1)) * (W - pad * 2);
  const yAt = (v) => (H - padB) - ((v - minV) / range) * (H - padB - pad);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {lines.map((l) => {
          const pts = data.map((d, i) => `${xAt(i).toFixed(1)},${yAt(Number(d[l.key]) || 0).toFixed(1)}`).join(' ');
          return <polyline key={l.key} points={pts} fill="none" stroke={l.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />;
        })}
        {lines.map((l) => data.map((d, i) => <circle key={l.key + i} cx={xAt(i)} cy={yAt(Number(d[l.key]) || 0)} r="2.5" fill={l.color} />))}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] text-[#bbb]">{data.map((d, i) => <span key={i}>{d.label}</span>)}</div>
      {lines.length > 1 && (
        <div className="flex items-center gap-4 mt-3">
          {lines.map((l) => <span key={l.key} className="inline-flex items-center gap-1.5 text-[12px] text-[#666]"><span className="w-3 h-3 rounded-full" style={{ background: l.color }} /> {l.label}</span>)}
        </div>
      )}
    </div>
  );
}

function TrenderTab({ data, loading }) {
  if (loading) return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster trender…</div>;
  if (!data || !data.ok) return <Empty msg="Kunne ikke laste trender." />;
  const mrr = data.mrrHistory || [];
  const snaps = (data.snapshots || []).map((s) => ({ ...s, label: (s.ym || '').slice(2) }));
  const cur = mrr[mrr.length - 1] || {};
  const first = mrr[0] || {};
  const growth = first.mrrActual > 0 ? Math.round(((cur.mrrActual - first.mrrActual) / first.mrrActual) * 100) : null;
  const enoughSnaps = snaps.length >= 2;
  const lastSnap = snaps[snaps.length - 1] || {};
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <BigStat label="MRR nå (faktisk)" value={kr(cur.mrrActual || 0)} sub={growth != null ? `${growth >= 0 ? '+' : ''}${growth}% siste ${mrr.length} mnd` : '—'} tone="pos" big />
        <BigStat label="Aktive avtaler" value={`${cur.activeContracts || 0}`} sub="Inntektsgivende nå" />
        <BigStat label="LTV : CAC" value={lastSnap.ltvCac != null ? `${lastSnap.ltvCac}×` : '—'} sub={lastSnap.cac != null ? `CAC ${kr(lastSnap.cac)} · LTV ${kr(lastSnap.ltv || 0)}` : 'Fra snapshots'} />
      </div>

      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111] mb-1">MRR-utvikling</h3>
        <p className="text-[12px] text-[#999] mb-5">Rekonstruert fra kontraktenes start-/leiestartdatoer (honorar = leie × %).</p>
        <MultiLineChart data={mrr} lines={[{ key: 'mrrForventet', color: '#cf97fc', label: 'Forventet' }, { key: 'mrrActual', color: '#1a7f45', label: 'Faktisk' }]} />
      </div>

      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111] mb-5">Aktive avtaler over tid</h3>
        <MultiLineChart data={mrr} lines={[{ key: 'activeContracts', color: '#7c3aed', label: 'Aktive avtaler' }]} height={140} />
      </div>

      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111] mb-1">Avledede nøkkeltall (månedlige snapshots)</h3>
        <p className="text-[12px] text-[#999] mb-5">LTV:CAC, margin, burn og MRR fryses hver måned. {enoughSnaps ? '' : 'Historikken bygges opp fra nå — ett datapunkt per måned.'}</p>
        {enoughSnaps ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div><p className="text-[12px] font-semibold text-[#666] mb-3">LTV : CAC</p><MultiLineChart data={snaps} lines={[{ key: 'ltvCac', color: '#7c3aed', label: 'LTV:CAC' }]} height={140} /></div>
            <div><p className="text-[12px] font-semibold text-[#666] mb-3">Margin (%)</p><MultiLineChart data={snaps} lines={[{ key: 'margin', color: '#1a7f45', label: 'Margin %' }]} height={140} /></div>
            <div><p className="text-[12px] font-semibold text-[#666] mb-3">Burn rate (kr/mnd)</p><MultiLineChart data={snaps} lines={[{ key: 'burnRate', color: '#e5484d', label: 'Burn' }]} height={140} /></div>
            <div><p className="text-[12px] font-semibold text-[#666] mb-3">MRR forventet (kr)</p><MultiLineChart data={snaps} lines={[{ key: 'mrrForventet', color: '#cf97fc', label: 'MRR' }]} height={140} /></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MiniStat label="LTV:CAC" value={lastSnap.ltvCac != null ? `${lastSnap.ltvCac}×` : '—'} />
            <MiniStat label="Margin" value={lastSnap.margin != null ? `${lastSnap.margin}%` : '—'} tone={lastSnap.margin >= 0 ? 'pos' : 'neg'} />
            <MiniStat label="Burn/mnd" value={lastSnap.burnRate ? kr(lastSnap.burnRate) : 'Positiv'} />
            <MiniStat label="Runway" value={lastSnap.runwayMonths == null ? '12+ mnd' : `${lastSnap.runwayMonths} mnd`} />
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════ INVESTOR ═══════════════════════════
const pctSign = (n) => (n == null ? '—' : `${n >= 0 ? '' : '−'}${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(Math.abs(n))} %`);
const monthsLabel = (n) => (n == null ? '—' : `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(n)} mnd`);

function downloadBlob(text, filename, mime) {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
const csvCell = (v) => {
  if (v == null) return '';
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// Waterfall/bridge-diagram: Start → +Ny +Ekspansjon −Reduksjon −Churn → Nå
function WaterfallChart({ w }) {
  if (!w) return <Empty msg="Ikke nok data for MRR-bevegelse." />;
  const steps = [
    { label: 'Start', value: w.start, type: 'total' },
    { label: 'Ny', value: w.neu, type: 'pos' },
    { label: 'Ekspansjon', value: w.expansion, type: 'pos' },
    { label: 'Reduksjon', value: -w.contraction, type: 'neg' },
    { label: 'Churn', value: -w.churn, type: 'neg' },
    { label: 'Nå', value: w.end, type: 'total' },
  ];
  let running = 0;
  const bars = steps.map((s) => {
    if (s.type === 'total') { running = s.value; return { ...s, base: 0, top: s.value, delta: s.value }; }
    const start = running; const end = running + s.value; running = end;
    return { ...s, base: Math.min(start, end), top: Math.max(start, end), delta: s.value };
  });
  const maxV = Math.max(...bars.map((b) => b.top), 1);
  const H = 200;
  return (
    <div>
      <div className="flex items-end gap-3" style={{ height: H + 24 }}>
        {bars.map((b, i) => {
          const barH = Math.max(2, ((b.top - b.base) / maxV) * H);
          const bottom = (b.base / maxV) * H;
          const color = b.type === 'total' ? '#0a0a0a' : b.type === 'pos' ? '#1a7f45' : '#e5484d';
          const showLabel = b.type === 'total' || Math.abs(b.delta) > 0;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: H + 24 }}>
              <span className="text-[10px] font-semibold mb-1" style={{ color }}>
                {showLabel ? (b.type === 'total' ? kr(b.delta) : `${b.delta >= 0 ? '+' : '−'}${nf0.format(Math.abs(Math.round(b.delta)))}`) : ''}
              </span>
              <div className="w-full flex justify-center" style={{ height: H, alignItems: 'flex-end' }}>
                <div style={{ height: barH, marginBottom: bottom, background: color, borderRadius: 6, width: '64%' }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 mt-2">
        {bars.map((b, i) => <span key={i} className="flex-1 text-center text-[10px] text-[#999] font-medium">{b.label}</span>)}
      </div>
    </div>
  );
}

const FORECAST_FIELDS = [
  { k: 'newContractsPerMonth', l: 'Nye avtaler / mnd', step: '0.5', suffix: 'stk' },
  { k: 'avgRentPerNewContract', l: 'Snittleie ny avtale', step: '500', suffix: 'kr' },
  { k: 'avgFeePercent', l: 'Honorar', step: '0.5', suffix: '%' },
  { k: 'monthlyChurnPct', l: 'Churn / mnd', step: '0.5', suffix: '%' },
  { k: 'cacPerContract', l: 'CAC per avtale', step: '250', suffix: 'kr' },
  { k: 'opexGrowthPct', l: 'OPEX-vekst / mnd', step: '0.5', suffix: '%' },
  { k: 'rampMonths', l: 'Ramp (forsinkelse)', step: '1', suffix: 'mnd' },
  { k: 'grossMarginPct', l: 'Bruttomargin', step: '0.05', suffix: '' },
];

function ForecastPanel({ forecast, loading, onRecompute, onSaveAssumptions }) {
  const A = forecast?.assumptions || {};
  const [form, setForm] = useState({});
  const [scenario, setScenario] = useState('base');
  const [savedOk, setSavedOk] = useState(false);
  useEffect(() => {
    if (forecast?.assumptions) {
      const f = {}; FORECAST_FIELDS.forEach(({ k }) => { f[k] = forecast.assumptions[k] ?? ''; });
      setForm(f);
    }
  }, [forecast]);
  if (!forecast || !forecast.ok) return <Empty msg="Kunne ikke laste prognose." />;
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const sc = (forecast.scenarios && forecast.scenarios[scenario]) || {};
  const series = sc.series || [];
  const sum = sc.summary || {};
  const openingSet = forecast.openingSet;

  return (
    <div className="rounded-2xl border border-[#eee] bg-white p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h3 className="text-[15px] font-bold text-[#111] flex items-center gap-2"><Rocket className="w-4 h-4 text-[#7c3aed]" /> Driver-basert prognose</h3>
          <p className="text-[12px] text-[#999] mt-1">Juster driverne og se effekt på MRR, resultat og kontantbeholdning.</p>
        </div>
        <div className="inline-flex rounded-lg border border-[#e5e5ea] p-1 bg-[#f7f7f8]">
          {[['konservativ', 'Konservativ'], ['base', 'Base'], ['aggressiv', 'Aggressiv']].map(([k, l]) => (
            <button key={k} onClick={() => setScenario(k)} data-testid={`fc-scenario-${k}`}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors ${scenario === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888]'}`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Antakelser */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {FORECAST_FIELDS.map(({ k, l, step, suffix }) => (
          <div key={k}>
            <label className="block text-[11px] font-semibold text-[#888] mb-1">{l}{suffix ? ` (${suffix})` : ''}</label>
            <input type="number" step={step} value={form[k] ?? ''} onChange={(e) => set(k, e.target.value)}
              data-testid={`fc-input-${k}`}
              className="w-full h-9 px-2.5 rounded-lg border border-[#e5e5ea] bg-white text-[13px] text-[#111] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button className={btnDark} disabled={loading} onClick={() => onRecompute(form)} data-testid="fc-recompute">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Oppdater prognose
        </button>
        <button className={btnGhost} onClick={async () => { await onSaveAssumptions(form); setSavedOk(true); setTimeout(() => setSavedOk(false), 2000); }} data-testid="fc-save">
          <Check className="w-4 h-4" /> Lagre som standard
        </button>
        {savedOk && <span className="text-[12px] text-[#1a7f45] font-medium">Lagret ✓</span>}
        <span className="text-[11px] text-[#bbb] ml-auto">Standard-CAC: {kr(forecast.defaults?.cacDefault || 0)} · Start-MRR: {kr(forecast.defaults?.startMrr || 0)}</span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label={`MRR om ${forecast.months} mnd`} value={kr(sum.endMrr)} sub={`ARR ${kr(sum.endArr)}`} tone="pos" />
        <MiniStat label="Break-even (drift)" value={sum.breakevenMonth == null ? 'Ikke i horisont' : `Mnd ${sum.breakevenMonth + 1}`} sub="Første måned med positivt resultat" />
        <MiniStat label="Runway" value={!openingSet ? '— (mangler saldo)' : (sum.cashoutMonth == null ? `${forecast.months}+ mnd` : `${sum.cashoutMonth} mnd`)} sub={openingSet ? `Slutt-saldo ${kr(sum.endCash)}` : 'Sett banksaldo'} tone={sum.cashoutMonth != null ? 'neg' : undefined} />
        <MiniStat label="Aktive avtaler (slutt)" value={`${sum.endActiveContracts || 0}`} sub={`Fra ${forecast.defaults?.startCount || 0} i dag`} />
      </div>

      {/* Chart */}
      <div>
        <p className="text-[12px] font-semibold text-[#666] mb-3">MRR{openingSet ? ' + kontantbeholdning' : ''} — {forecast.months} måneder ({scenario})</p>
        <MultiLineChart data={series} lines={openingSet
          ? [{ key: 'mrr', color: '#7c3aed', label: 'MRR' }, { key: 'cash', color: '#1a7f45', label: 'Kontantbeholdning' }]
          : [{ key: 'mrr', color: '#7c3aed', label: 'MRR' }]} height={190} />
      </div>
      <p className="text-[11px] text-[#aaa]">Modell: MRR<sub>t</sub> = (MRR<sub>t−1</sub> + nye avtaler × honorar) × (1 − churn). Markedsføringskostnad = nye avtaler × CAC. OPEX (eks. annonse) vokser med angitt månedsrate. Konservativ = halv vekst + 1 %-poeng churn; Aggressiv = dobbel vekst.</p>
    </div>
  );
}

function AttributionCard({ attribution }) {
  if (!attribution || !attribution.hasData) {
    return (
      <div className="rounded-2xl border border-[#eee] bg-white p-6">
        <h3 className="text-[15px] font-bold text-[#111] mb-1 flex items-center gap-2"><PieChart className="w-4 h-4 text-[#7c3aed]" /> Attribusjon: markedsføring vs. organisk</h3>
        <p className="text-[13px] text-[#999] mt-3">Ikke nok attribusjonsdata fra plattformen ennå. Når kontrakter synkes med kildeinformasjon (google/meta/organisk), vises MRR-fordelingen her.</p>
      </div>
    );
  }
  const b = attribution.buckets;
  const rows = [
    { key: 'marketing', label: 'Markedsføring (betalt)', color: '#7c3aed', ...b.marketing },
    { key: 'organisk', label: 'Organisk / henvist', color: '#1a7f45', ...b.organisk },
    { key: 'ukjent', label: 'Ukjent kilde', color: '#c9c9d0', ...b.ukjent },
  ];
  const total = attribution.total || 1;
  return (
    <div className="rounded-2xl border border-[#eee] bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[15px] font-bold text-[#111] flex items-center gap-2"><PieChart className="w-4 h-4 text-[#7c3aed]" /> Attribusjon: markedsføring vs. organisk</h3>
        {attribution.marketingSharePct != null && <span className="text-[12px] text-[#666]">{pctFmt(attribution.marketingSharePct)} fra betalt</span>}
      </div>
      <div className="space-y-4">
        {rows.map((r) => (
          <div key={r.key}>
            <div className="flex items-center justify-between text-[13px] mb-1">
              <span className="font-medium text-[#333] flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: r.color }} /> {r.label} <span className="text-[#bbb]">· {r.count} avtaler</span></span>
              <span className="text-[#666]">{kr(r.mrr)}/mnd</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#f2f2f4] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(r.mrr / total) * 100}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InvestorTab({ data, forecast, loading, forecastLoading, onRecompute, onSaveAssumptions, apiKey }) {
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

  const periodTag = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const exportCsv = useCallback(async () => {
    setCsvLoading(true);
    try {
      const bp = await fetch(`/api/admin/finance/board-pack?key=${encodeURIComponent(apiKey)}`).then((r) => r.json());
      const lines = [];
      lines.push(['DigiHome — Styrepakke', bp.generatedAt || '']);
      lines.push([]);
      lines.push(['NØKKELTALL (nå)']);
      const m = bp.resultat?.monthly || {};
      lines.push(['MRR (forventet)', m.incomeForventet]);
      lines.push(['MRR (faktisk)', m.incomeActual]);
      lines.push(['ARR (forventet)', bp.investor?.arrNow]);
      lines.push(['OPEX / mnd', m.opexTotal]);
      lines.push(['Resultat / mnd (forventet)', m.resultatForventet]);
      lines.push(['Aktive avtaler', m.activeContracts]);
      lines.push(['NRR (%)', bp.investor?.retention?.nrr]);
      lines.push(['GRR (%)', bp.investor?.retention?.grr]);
      lines.push(['LTV:CAC', bp.investor?.payback?.ltvCac]);
      lines.push(['CAC payback (mnd)', bp.investor?.payback?.paybackMonths]);
      lines.push(['Burn rate / mnd', bp.likviditet?.summary?.forventet?.burnRate]);
      lines.push(['Runway (mnd)', bp.likviditet?.summary?.forventet?.runwayMonths]);
      lines.push([]);
      lines.push(['PROGNOSE (base-scenario)']);
      lines.push(['Måned', 'MRR', 'Ny MRR', 'Churn', 'OPEX', 'Markedsføring', 'Netto', 'Kontantbeholdning', 'Aktive avtaler']);
      (bp.forecast?.scenarios?.base?.series || []).forEach((p) => lines.push([p.label, p.mrr, p.newMrr, p.churn, p.opex, p.marketing, p.net, p.cash, p.activeContracts]));
      const csv = '\uFEFF' + lines.map((row) => row.map(csvCell).join(';')).join('\n');
      downloadBlob(csv, `DigiHome-styrepakke-${periodTag}.csv`, 'text/csv');
    } finally { setCsvLoading(false); }
  }, [apiKey, periodTag]);

  const exportPdf = useCallback(async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const [{ jsPDF }, html2canvasMod] = await Promise.all([import('jspdf'), import('html2canvas')]);
      const html2canvas = html2canvasMod.default || html2canvasMod;
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, windowWidth: reportRef.current.scrollWidth });
      const img = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const imgW = pw; const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH; let position = 0;
      pdf.addImage(img, 'PNG', 0, position, imgW, imgH); heightLeft -= ph;
      while (heightLeft > 0) { position -= ph; pdf.addPage(); pdf.addImage(img, 'PNG', 0, position, imgW, imgH); heightLeft -= ph; }
      pdf.save(`DigiHome-styrepakke-${periodTag}.pdf`);
    } catch (e) {
      alert('Kunne ikke lage PDF: ' + (e?.message || e));
    } finally { setExporting(false); }
  }, [periodTag]);

  if (loading) return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster investordata…</div>;
  if (!data || !data.ok) return <Empty msg="Kunne ikke laste investordata." />;

  const ret = data.retention || {};
  const pb = data.payback || {};
  const nrrTone = ret.nrr == null ? undefined : ret.nrr >= 100 ? 'pos' : 'neg';

  return (
    <div className="space-y-8">
      {/* Eksport-topplinje */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[18px] font-bold text-[#0a0a0a] flex items-center gap-2"><Landmark className="w-5 h-5" /> Investor & styrepakke</h2>
          <p className="text-[12px] text-[#999] mt-0.5">Series A/B due diligence-oversikt · NOK eks. mva · generert {new Date(data.generatedAt).toLocaleString('nb-NO')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className={btnGhost} onClick={exportCsv} disabled={csvLoading} data-testid="export-csv">
            {csvLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />} CSV
          </button>
          <button className={btnDark} onClick={exportPdf} disabled={exporting} data-testid="export-pdf">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Last ned styrepakke (PDF)
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-8 bg-white">
        {/* Retensjon-hero */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <BigStat label="Net Revenue Retention" value={ret.nrr == null ? '—' : pctFmt(ret.nrr)}
            sub={ret.nrr == null ? 'Trenger ≥ 1 mnd historikk' : `Over ${ret.windowMonths} mnd · fra ${ret.startMonth || '—'}`} tone={nrrTone} big />
          <BigStat label="Gross Revenue Retention" value={ret.grr == null ? '—' : pctFmt(ret.grr)}
            sub={ret.grr == null ? '—' : `Churn ${kr(ret.churn)} · reduksjon ${kr(ret.contraction)}`} tone={ret.grr == null ? undefined : (ret.grr >= 90 ? 'pos' : 'neg')} />
          <BigStat label="CAC payback" value={pb.paybackMonths == null ? '—' : monthsLabel(pb.paybackMonths)}
            sub={pb.cac != null ? `CAC ${kr(pb.cac)} · brutto ${pctFmt((pb.grossMarginPct || 0) * 100)}` : 'Mangler CAC'} tone={pb.paybackMonths == null ? undefined : (pb.paybackMonths <= 12 ? 'pos' : 'neg')} />
          <BigStat label="LTV : CAC" value={pb.ltvCac != null ? `${pb.ltvCac}×` : '—'}
            sub={pb.ltv != null ? `LTV ${kr(pb.ltv)}` : 'Fra KPI-motor'} tone={pb.ltvCac != null && pb.ltvCac >= 3 ? 'pos' : undefined} />
        </div>

        {/* MRR + ARR nå */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MiniStat label="MRR nå" value={kr(data.mrrNow)} sub="Månedlig honorarinntekt" tone="pos" />
          <MiniStat label="ARR (run-rate)" value={kr(data.arrNow)} sub="MRR × 12" />
          <MiniStat label="Aktive enheter" value={`${data.activeUnits || 0}`} sub="Inntektsgivende nå" />
          <MiniStat label="ARPA" value={kr(data.arpa)} sub="Snitt honorar / enhet" />
        </div>

        {/* MRR-waterfall */}
        <div className="rounded-2xl border border-[#eee] bg-white p-6">
          <h3 className="text-[15px] font-bold text-[#111] mb-1 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#7c3aed]" /> MRR-bevegelse (waterfall)</h3>
          <p className="text-[12px] text-[#999] mb-6">Fra {data.waterfall?.start ? (ret.startMonth || 'start') : 'start'} til i dag: ny, ekspansjon, reduksjon og churn.</p>
          <WaterfallChart w={data.waterfall} />
        </div>

        {/* Måned-for-måned netto ny MRR */}
        {(data.movement || []).length > 0 && (
          <div className="rounded-2xl border border-[#eee] bg-white p-6">
            <h3 className="text-[15px] font-bold text-[#111] mb-5">Netto ny MRR per måned</h3>
            <MultiLineChart data={data.movement} lines={[{ key: 'netNew', color: '#7c3aed', label: 'Netto ny MRR' }]} height={140} />
          </div>
        )}

        {/* Attribusjon */}
        <AttributionCard attribution={data.attribution} />

        {/* Prognose */}
        <ForecastPanel forecast={forecast} loading={forecastLoading} onRecompute={onRecompute} onSaveAssumptions={onSaveAssumptions} />
      </div>
    </div>
  );
}

