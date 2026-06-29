'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Send, CheckCircle2, AlertCircle, Trash2,
  LayoutDashboard, Activity, BarChart3, Users, Sparkles, Database,
  Radio, Gauge, TrendingUp, TrendingDown, Download, Megaphone,
  Search, X, ArrowUp, ArrowDown, FileSpreadsheet, ChevronRight,
} from 'lucide-react';
import LeadDrawer from '@/components/admin/LeadDrawer';
import OverviewTab from '@/components/admin/OverviewTab';
import TrafficTab from '@/components/admin/TrafficTab';
import IntelTab from '@/components/admin/IntelTab';
import InsightTab from '@/components/admin/InsightTab';
import RentMarketTab from '@/components/admin/RentMarketTab';
import LiveTab from '@/components/admin/LiveTab';
import WebVitalsTab from '@/components/admin/WebVitalsTab';
import AdsTab from '@/components/admin/AdsTab';

const TABS = [
  { k: 'oversikt', l: 'Oversikt', icon: LayoutDashboard },
  { k: 'live', l: 'Live', icon: Radio },
  { k: 'trafikk', l: 'Trafikk', icon: Activity },
  { k: 'ytelse', l: 'Ytelse', icon: Gauge },
  { k: 'innsikt', l: 'Lead-innsikt', icon: BarChart3 },
  { k: 'annonser', l: 'Annonser', icon: Megaphone },
  { k: 'leiemarked', l: 'Leiemarked', icon: Database },
  { k: 'ai', l: 'AI-assistent', icon: Sparkles },
  { k: 'leads', l: 'Leads', icon: Users },
];

const STATUS_OPTS = [
  { v: 'new', l: 'Ny' }, { v: 'contacted', l: 'Kontaktet' }, { v: 'qualified', l: 'Kvalifisert' },
  { v: 'won', l: 'Vunnet' }, { v: 'lost', l: 'Tapt' },
];
const RANGES = [{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }];

export default function InnsiktDashboard({ apiKey }) {
  const [data, setData] = useState({ leads: [], tenants: [] });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('oversikt');
  const [leadSub, setLeadSub] = useState('leads');
  const [days, setDays] = useState(30);
  const [scores, setScores] = useState({});
  const [scoringId, setScoringId] = useState('');
  const [statusBusy, setStatusBusy] = useState('');
  const [drawerLead, setDrawerLead] = useState(null);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [exporting, setExporting] = useState(false);
  const [leadAdsSyncing, setLeadAdsSyncing] = useState(false);
  const [leadAdsMsg, setLeadAdsMsg] = useState('');

  const load = useCallback(async (d) => {
    const dd = d || days;
    setLoading(true); setErr('');
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/leads?key=${encodeURIComponent(apiKey)}`),
        fetch(`/api/admin/analytics?key=${encodeURIComponent(apiKey)}&days=${dd}`),
      ]);
      if (r1.status === 401) { setErr('Sesjonen er utløpt — logg inn på nytt.'); setLoading(false); return; }
      const j1 = await r1.json();
      setData({ leads: j1.leads || [], tenants: j1.tenants || [] });
      if (r2.ok) { const j2 = await r2.json(); setAnalytics(j2); }
    } catch (e) { setErr('Kunne ikke laste data'); }
    finally { setLoading(false); }
  }, [days, apiKey]);

  useEffect(() => { if (apiKey) load(); }, [apiKey]); // eslint-disable-line

  const changeDays = (d) => { setDays(d); load(d); };

  const doForward = async () => {
    setForwarding(true);
    try {
      const res = await fetch(`/api/admin/forward?key=${encodeURIComponent(apiKey)}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) await load();
    } catch (e) {} finally { setForwarding(false); }
  };

  const doDelete = async (payload, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setDeleting(true);
    try {
      const type = payload.type || (leadSub === 'tenants' ? 'tenant' : 'lead');
      const res = await fetch(`/api/admin/delete?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      const json = await res.json();
      if (json.success) await load();
    } catch (e) {} finally { setDeleting(false); }
  };

  const doSetStatus = async (id, status, type) => {
    let value;
    if (status === 'won') {
      const input = window.prompt('Kontraktsverdi for Google Ads (NOK, valgfritt). La stå tom for å bruke standardverdi:', '');
      if (input === null) return; // avbrutt
      const n = Number((input || '').replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isFinite(n) && n > 0) value = n;
    }
    setStatusBusy(id);
    try {
      await fetch(`/api/admin/lead-status?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, type: type || 'lead', value }),
      });
      await load();
      // Trigg ny henting i drawer (ny objekt-referanse → useEffect kjører på nytt)
      setDrawerLead((dl) => (dl && dl.id === id ? { ...dl } : dl));
    } catch (e) {} finally { setStatusBusy(''); }
  };

  const downloadAdsFeed = () => {
    const url = `/api/admin/ads/offline-conversions?key=${encodeURIComponent(apiKey)}`;
    const a = document.createElement('a');
    a.href = url; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
  };

  const exportCsv = () => {
    setExporting(true);
    const type = leadSub === 'tenants' ? 'tenant' : 'lead';
    const url = `/api/admin/leads/export?type=${type}&key=${encodeURIComponent(apiKey)}`;
    const a = document.createElement('a');
    a.href = url; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => setExporting(false), 1200);
  };

  const doLeadAdsSync = async () => {
    setLeadAdsSyncing(true); setLeadAdsMsg('');
    try {
      const res = await fetch(`/api/admin/leads/meta-sync?key=${encodeURIComponent(apiKey)}`, { method: 'POST' });
      const j = await res.json();
      if (!res.ok || !j.ok) { setLeadAdsMsg(j.error || 'Lead Ads-synk feilet'); }
      else {
        const formsCount = (j.forms || []).length;
        setLeadAdsMsg(
          j.imported > 0
            ? `Hentet ${j.imported} nye Lead Ads-leads`
            : (formsCount === 0 ? 'Ingen Lead Ad-skjemaer funnet ennå' : `Ingen nye leads (${formsCount} skjema sjekket)`)
        );
        if (j.imported > 0) await load();
      }
    } catch (e) { setLeadAdsMsg('Kunne ikke synke Lead Ads'); }
    finally { setLeadAdsSyncing(false); setTimeout(() => setLeadAdsMsg(''), 7000); }
  };

  const doScore = async (id, type) => {
    setScoringId(id);
    try {
      const res = await fetch(`/api/admin/lead-score?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type: type || 'lead' }),
      });
      const j = await res.json();
      setScores((s) => ({ ...s, [id]: j.ok ? j.aiScore : { error: j.error || 'Feil' } }));
    } catch (e) { setScores((s) => ({ ...s, [id]: { error: 'Nettverksfeil' } })); }
    finally { setScoringId(''); }
  };

  const rows = leadSub === 'leads' ? data.leads : data.tenants;
  const pendingCount = [...data.leads, ...data.tenants].filter((r) => r.forwarded !== true).length;
  const tabPending = rows.filter((r) => r.forwarded !== true).length;

  const channelOf = (r) => (r.attribution && r.attribution.channel) || r.source || '—';

  const channelOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => set.add(channelOf(r)));
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let r = [...rows];
    const q = query.trim().toLowerCase();
    if (q) {
      r = r.filter((x) => [x.name, x.email, x.phone, x.address, x.preferred_area, x.source, x.matrikkel_number, x.registry_owner_name]
        .filter(Boolean).join(' ').toLowerCase().includes(q));
    }
    if (statusFilter !== 'all') r = r.filter((x) => (x.status || 'new') === statusFilter);
    if (channelFilter !== 'all') r = r.filter((x) => channelOf(x) === channelFilter);
    r.sort((a, b) => {
      let av, bv;
      if (sortBy === 'name') { av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); }
      else if (sortBy === 'status') { av = a.status || 'new'; bv = b.status || 'new'; }
      else { av = a.createdAt || ''; bv = b.createdAt || ''; }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return r;
  }, [rows, query, statusFilter, channelFilter, sortBy, sortDir]);

  const toggleSort = (key) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };
  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <ArrowUp className="w-3 h-3 text-[#ddd]" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#0a0a0a]" /> : <ArrowDown className="w-3 h-3 text-[#0a0a0a]" />;
  };
  const filtersActive = query.trim() || statusFilter !== 'all' || channelFilter !== 'all';

  return (
    <div>
      {/* Toolbar: periode + oppdater */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.k} onClick={() => setTab(t.k)} className={`px-3.5 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${tab === t.k ? 'bg-[#0a0a0a] text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)]' : 'bg-white text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:text-[#0a0a0a]'}`}>
                <Icon className="w-4 h-4" /> {t.l}
                {t.k === 'leads' && pendingCount > 0 && <span className="ml-0.5 text-[10px] bg-amber-400 text-white rounded-full px-1.5 py-0.5 leading-none">{pendingCount}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {tab !== 'annonser' && (
            <>
              <div className="flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                {RANGES.map((r) => (
                  <button key={r.d} onClick={() => changeDays(r.d)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${days === r.d ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{r.l}</button>
                ))}
              </div>
              <button onClick={() => load()} disabled={loading} className="h-9 w-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#666] hover:text-[#0a0a0a] transition-colors">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button>
            </>
          )}
        </div>
      </div>

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {/* Content */}
      {tab === 'oversikt' && (
        <>
          {analytics && analytics.anomalies && analytics.anomalies.length > 0 && (
            <div className="mb-5 bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border-l-4 border-amber-400">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-amber-600 mb-2.5 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Avvik oppdaget</p>
              <div className="space-y-1.5">
                {analytics.anomalies.slice(0, 4).map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13.5px] text-[#444]">
                    {a.direction === 'up' ? <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" /> : <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />}
                    <b className="text-[#1f1f1f]">{a.metric}</b> {a.direction === 'up' ? 'uvanlig høyt' : 'uvanlig lavt'} {a.day}: <b>{a.value}</b> mot forventet ~{a.expected}
                    <span className={`ml-1 text-[10.5px] px-1.5 py-0.5 rounded-full ${a.severity === 'høy' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>{a.severity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <OverviewTab traffic={analytics && analytics.traffic} leads={analytics && analytics.leads} />
        </>
      )}
      {tab === 'live' && <LiveTab apiKey={apiKey} />}
      {tab === 'trafikk' && <TrafficTab traffic={analytics && analytics.traffic} />}
      {tab === 'ytelse' && <WebVitalsTab webVitals={analytics && analytics.webVitals} />}
      {tab === 'innsikt' && <IntelTab leads={analytics && analytics.leads} />}
      {tab === 'annonser' && <AdsTab apiKey={apiKey} />}
      {tab === 'leiemarked' && <RentMarketTab apiKey={apiKey} />}
      {tab === 'ai' && <InsightTab apiKey={apiKey} days={days} />}

      {tab === 'leads' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex gap-2">
              {[{ k: 'leads', l: `Utleiere (${data.leads.length})` }, { k: 'tenants', l: `Leietakere (${data.tenants.length})` }].map((t) => (
                <button key={t.k} onClick={() => setLeadSub(t.k)} className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${leadSub === t.k ? 'bg-[#cf97fc] text-white' : 'bg-white text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.03)]'}`}>{t.l}</button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {leadAdsMsg && <span className="text-[12px] text-[#1877F2] font-semibold">{leadAdsMsg}</span>}
              <button onClick={doLeadAdsSync} disabled={leadAdsSyncing} title="Hent Facebook/Instagram Lead Ads-leads direkte inn i systemet" className="h-9 px-4 rounded-full text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform" style={{ background: '#1877F2' }}>
                {leadAdsSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Synk Lead Ads
              </button>
              <button onClick={exportCsv} disabled={exporting || rows.length === 0} title="Eksporter alle leads til CSV (Excel, æøå)" className="h-9 px-4 rounded-full bg-white text-[#0a0a0a] text-[12px] font-semibold flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] disabled:opacity-40 hover:bg-[#f5f5f5] active:scale-[0.97] transition-all">{exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} CSV</button>
              {leadSub === 'leads' && (
                <button onClick={downloadAdsFeed} title="Last ned Google Ads offline-konverteringsfeed (vunne leads med gclid)" className="h-9 px-4 rounded-full bg-white text-[#8b5cf6] text-[12px] font-semibold flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-[#f4f0fb] active:scale-[0.97] transition-all"><Download className="w-3.5 h-3.5" /> Google Ads-feed</button>
              )}
              <button onClick={doForward} disabled={forwarding || pendingCount === 0} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">{forwarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Re-send {pendingCount > 0 ? `(${pendingCount})` : ''}</button>
              <button onClick={() => doDelete({ scope: 'pending' }, `Slette ${tabPending} ventende ${leadSub === 'leads' ? 'utleier' : 'leietaker'}-leads? Kan ikke angres.`)} disabled={deleting || tabPending === 0} className="h-9 px-4 rounded-full bg-white text-red-600 text-[12px] font-semibold flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] disabled:opacity-40 hover:bg-red-50 active:scale-[0.97] transition-all">{deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Slett ventende {tabPending > 0 ? `(${tabPending})` : ''}</button>
            </div>
          </div>

          {/* Søk + filtre */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-[380px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbb]" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk navn, e-post, telefon, adresse …" className="w-full h-9 pl-9 pr-8 rounded-full bg-white text-[13px] text-[#222] shadow-[0_2px_10px_rgba(0,0,0,0.03)] outline-none focus:ring-2 focus:ring-[#cf97fc]/40 placeholder:text-[#bbb]" />
              {query && <button onClick={() => setQuery('')} aria-label="Tøm søk" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#666]"><X className="w-4 h-4" /></button>}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 rounded-full bg-white text-[12.5px] font-semibold text-[#555] px-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] outline-none focus:ring-2 focus:ring-[#cf97fc]/40 cursor-pointer">
              <option value="all">Alle statuser</option>
              {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="h-9 rounded-full bg-white text-[12.5px] font-semibold text-[#555] px-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] outline-none focus:ring-2 focus:ring-[#cf97fc]/40 cursor-pointer">
              <option value="all">Alle kilder</option>
              {channelOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {filtersActive && <button onClick={() => { setQuery(''); setStatusFilter('all'); setChannelFilter('all'); }} className="h-9 px-3 rounded-full text-[12px] font-semibold text-[#888] hover:text-[#0a0a0a] hover:bg-white transition-colors">Nullstill</button>}
            <span className="text-[12px] text-[#aaa] ml-auto whitespace-nowrap">{filteredRows.length} av {rows.length}</span>
          </div>

          {leadSub === 'leads' && analytics && analytics.leads && analytics.leads.totals && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              {[
                { l: 'Vunnet', v: analytics.leads.totals.won ?? 0, c: 'text-emerald-600' },
                { l: 'Tapt', v: analytics.leads.totals.lost ?? 0, c: 'text-rose-600' },
                { l: 'Vinnrate', v: `${analytics.leads.totals.winRate ?? 0}%`, c: 'text-[#1f1f1f]' },
                { l: 'Snitt responstid', v: analytics.leads.totals.avgResponseHours != null ? `${analytics.leads.totals.avgResponseHours} t` : '–', c: 'text-[#1f1f1f]' },
                { l: 'SLA innen 24t', v: analytics.leads.totals.slaPct != null ? `${analytics.leads.totals.slaPct}%` : '–', c: 'text-[#1f1f1f]' },
              ].map((k) => (
                <div key={k.l} className="bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
                  <p className="text-[11px] uppercase tracking-[0.06em] text-[#aaa] font-semibold">{k.l}</p>
                  <p className={`text-[22px] font-bold mt-1 ${k.c}`} style={{ fontFamily: 'var(--font-heading)' }}>{k.v}</p>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead><tr className="border-b border-[#f0f0f0] text-[11px] uppercase tracking-[0.06em] text-[#aaa]">
                  <th className="py-3 px-4 font-semibold"><button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-[#0a0a0a] transition-colors">Navn <SortIcon col="name" /></button></th>
                  <th className="py-3 px-4 font-semibold">Kontakt</th>
                  <th className="py-3 px-4 font-semibold">{leadSub === 'leads' ? 'Eiendom' : 'Ønsker'}</th>
                  <th className="py-3 px-4 font-semibold">Kilde</th>
                  <th className="py-3 px-4 font-semibold"><button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-[#0a0a0a] transition-colors">Status <SortIcon col="status" /></button></th>
                  <th className="py-3 px-4 font-semibold"><button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-[#0a0a0a] transition-colors">Mottatt <SortIcon col="createdAt" /></button></th>
                  <th className="py-3 px-4 font-semibold">Sendt</th>
                  <th className="py-3 px-4 font-semibold text-right">Handling</th>
                </tr></thead>
                <tbody>
                  {filteredRows.length === 0 && (<tr><td colSpan={8} className="py-10 text-center text-[14px] text-[#aaa]">{rows.length === 0 ? 'Ingen registreringer ennå' : 'Ingen treff på filteret'}</td></tr>)}
                  {filteredRows.map((r) => {
                    const rType = leadSub === 'tenants' ? 'tenant' : 'lead';
                    const sc = scores[r.id];
                    return (
                    <tr key={r.id} onClick={() => setDrawerLead(r)} className="border-b border-[#f6f6f6] hover:bg-[#faf8fe] transition-colors cursor-pointer group">
                      <td className="py-3 px-4 text-[14px] font-medium text-[#222]">
                        <span className="inline-flex items-center gap-1.5">{r.name || '—'}<ChevronRight className="w-3.5 h-3.5 text-[#cf97fc] opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#666]"><div>{r.email}</div><div className="text-[#aaa]">{r.phone}</div></td>
                      <td className="py-3 px-4 text-[13px] text-[#666] max-w-[260px]">
                        {leadSub === 'leads'
                          ? <span>{r.address || '—'}{r.property_type ? ` · ${r.property_type}` : ''}{r.sqm ? ` · ${r.sqm} m²` : ''}{r.num_properties > 1 ? ` · ${r.num_properties} enheter` : ''}</span>
                          : <span>{r.preferred_area || '—'}{r.budget_max ? ` · inntil ${r.budget_max} kr` : ''}{r.bedrooms ? ` · ${r.bedrooms} sov` : ''}</span>}
                      </td>
                      <td className="py-3 px-4 text-[12px]">
                        {(r.attribution && r.attribution.channel)
                          ? <span className="inline-flex items-center rounded-full bg-[#f4f0fb] text-[#8b5cf6] px-2 py-0.5 font-semibold">{r.attribution.channel}</span>
                          : <span className="text-[#bbb]">{r.source || '—'}</span>}
                      </td>
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <select
                            value={r.status || 'new'} disabled={statusBusy === r.id}
                            onChange={(e) => doSetStatus(r.id, e.target.value, rType)}
                            className={`text-[12px] font-semibold rounded-lg border border-[#e6e3df] bg-white px-2 py-1.5 outline-none focus:border-[#cf97fc] disabled:opacity-50 cursor-pointer ${r.status === 'won' ? 'text-emerald-600' : r.status === 'lost' ? 'text-rose-600' : 'text-[#555]'}`}
                          >
                            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                          {statusBusy === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#bbb]" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[12px] text-[#999] whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-3 px-4">
                        {r.forwarded === true
                          ? <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Sendt</span>
                          : <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600" title={r.forward_error || ''}><AlertCircle className="w-3.5 h-3.5" /> Venter</span>}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => doScore(r.id, rType)} disabled={scoringId === r.id} title="AI-vurder dette leadet" className="inline-flex items-center gap-1 mr-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-[#8b5cf6] hover:bg-[#f4f0fb] transition-colors disabled:opacity-40">
                          {scoringId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          {sc && !sc.error ? sc.score : 'AI'}
                        </button>
                        <button onClick={() => doDelete({ id: r.id }, `Slette lead fra ${r.name || r.email || 'denne kontakten'}?`)} disabled={deleting} aria-label="Slett" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {drawerLead && (
        <LeadDrawer
          apiKey={apiKey}
          lead={drawerLead}
          type={leadSub === 'tenants' ? 'tenant' : 'lead'}
          onClose={() => setDrawerLead(null)}
          onStatusChange={doSetStatus}
          statusBusy={statusBusy}
          scoreData={scores[drawerLead.id]}
          onScore={doScore}
          scoring={scoringId}
        />
      )}
    </div>
  );
}
