'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Send, CheckCircle2, AlertCircle, Trash2,
  LayoutDashboard, Activity, BarChart3, Users, Sparkles, Database,
  Radio, Gauge, TrendingUp, TrendingDown, Download, Megaphone,
  Search, X, ArrowUp, ArrowDown, FileSpreadsheet, ChevronRight, GitBranch,
  MoreHorizontal, Trophy, Clock, Target, ShieldCheck, Flame, LayoutTemplate, Crosshair, Layers, History,
  Columns3, List, SlidersHorizontal,
} from 'lucide-react';
import LeadsPipeline from '@/components/admin/LeadsPipeline';
import LeadsVelocity from '@/components/admin/LeadsVelocity';
import LeadDrawer from '@/components/admin/LeadDrawer';
import OverviewTab from '@/components/admin/OverviewTab';
import TrafficTab from '@/components/admin/TrafficTab';
import IntelTab from '@/components/admin/IntelTab';
import InsightTab from '@/components/admin/InsightTab';
import RentMarketTab from '@/components/admin/RentMarketTab';
import LiveTab from '@/components/admin/LiveTab';
import WebVitalsTab from '@/components/admin/WebVitalsTab';
import AdsTab from '@/components/admin/AdsTab';
import AdStudioTab from '@/components/admin/AdStudioTab';
import FinnStudioTab from '@/components/admin/FinnStudioTab';
import FunnelTab from '@/components/admin/FunnelTab';
import LandingPagesTab from '@/components/admin/LandingPagesTab';
import CompetitorAnalysisTab from '@/components/admin/CompetitorAnalysisTab';

const TABS = [
  { k: 'oversikt', l: 'Oversikt', icon: LayoutDashboard, d: 'Nøkkeltall og trender på ett blikk' },
  { k: 'live', l: 'Sanntid', icon: Radio, d: 'Hvem er inne på nettstedet akkurat nå' },
  { k: 'trafikk', l: 'Trafikk', icon: Activity, d: 'Kilder, kanaler og enheter' },
  { k: 'trakt', l: 'Trakt & A/B', icon: GitBranch, d: 'Konvertering og eksperimenter' },
  { k: 'ytelse', l: 'Ytelse', icon: Gauge, d: 'Core Web Vitals og sidehastighet' },
  { k: 'innsikt', l: 'Lead-innsikt', icon: BarChart3, d: 'Kvalitet, kilder og pipeline' },
  { k: 'annonser', l: 'Annonser', icon: Megaphone, d: 'Meta & Google Ads · forbruk og ROAS' },
  { k: 'finnstudio', l: 'FINN-studio', icon: Layers, d: 'FINN.no display — bannere, UTM-lenker og kampanjemåling' },
  { k: 'landingssider', l: 'Landingssider', icon: LayoutTemplate, d: 'Kampanjesider · trafikk, konvertering og verdi' },
  { k: 'konkurrent', l: 'Konkurrentanalyse', icon: Crosshair, d: 'Søkevolum, budestimat og live-annonser for konkurrenter' },
  { k: 'leiemarked', l: 'Leiemarked', icon: Database, d: 'Priser og etterspørsel i markedet' },
  { k: 'ai', l: 'AI-assistent', icon: Sparkles, d: 'Spør om dataene dine i naturlig språk' },
  { k: 'leads', l: 'Leads', icon: Users, d: 'Alle henvendelser — utleiere og leietakere' },
];

const STATUS_OPTS = [
  { v: 'new', l: 'Ny' }, { v: 'contacted', l: 'Kontaktet' }, { v: 'qualified', l: 'Kvalifisert' },
  { v: 'viewing', l: 'Befaring' }, { v: 'offer', l: 'Tilbud sendt' },
  { v: 'won', l: 'Vunnet' }, { v: 'lost', l: 'Tapt' }, { v: 'disqualified', l: 'Diskvalifisert' },
];
// Samme fulle CRM-pipeline for alle leads (backend + toveis-synk støtter alle stegene).
const IMPORTED_STATUS_OPTS = STATUS_OPTS;
const IMPORTED_CHANNELS = [
  ['unknown', 'Ukjent'], ['google', 'Google Ads'], ['meta', 'Meta'], ['finn', 'FINN'],
  ['referral', 'Anbefaling'], ['phone', 'Telefon'], ['organic', 'Organisk'], ['email', 'E-post'],
];
const RANGES = [{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }];

export default function InnsiktDashboard({ apiKey, tab: propTab, onTabChange, onStats }) {
  const [data, setData] = useState({ leads: [], tenants: [] });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');
  const [tabState, setTabState] = useState('oversikt');
  const tab = propTab || tabState;
  const setTab = onTabChange || setTabState;
  const [actionsOpen, setActionsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  // CRM-duplikater (speilede tvillinger fra reconcile) — modal m/dryRun-plan
  const [crmDedupeOpen, setCrmDedupeOpen] = useState(false);
  const [crmDedupeBusy, setCrmDedupeBusy] = useState(false);
  const [crmDedupePlan, setCrmDedupePlan] = useState(null);
  const [crmDedupePurge, setCrmDedupePurge] = useState(false);
  const [crmDedupeResult, setCrmDedupeResult] = useState(null);
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
  const [showImported, setShowImported] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [leadAdsSyncing, setLeadAdsSyncing] = useState(false);
  const [leadAdsMsg, setLeadAdsMsg] = useState('');
  const [dedupBusy, setDedupBusy] = useState(false);
  // Pipeline (kanban) eller liste — valget huskes per nettleser.
  const [leadView, setLeadView] = useState('pipeline');
  useEffect(() => {
    try { const v = localStorage.getItem('dh_leads_view'); if (v === 'list' || v === 'pipeline' || v === 'velocity') setLeadView(v); } catch (e) {}
  }, []);
  const changeLeadView = (v) => {
    setLeadView(v);
    try { localStorage.setItem('dh_leads_view', v); } catch (e) {}
  };

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

  // Rapporter nøkkeltall opp til shell-en (badge på «Leads» i sidemenyen)
  useEffect(() => {
    if (!onStats) return;
    const pend = [...data.leads, ...data.tenants].filter((r) => r.forwarded !== true).length;
    onStats({ pending: pend, leads: data.leads.length, tenants: data.tenants.length });
  }, [data]); // eslint-disable-line

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

  const doDedupTenants = async () => {
    setDedupBusy(true); setLeadAdsMsg('');
    try {
      const prev = await fetch(`/api/admin/leads/dedup-tenants?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: true }),
      }).then((r) => r.json());
      if (!prev.ok) { setLeadAdsMsg('Kunne ikke analysere duplikater'); return; }
      if ((prev.deleted || 0) === 0) { setLeadAdsMsg('Ingen duplikater funnet'); return; }
      if (!window.confirm(`Fant ${prev.groupsWithDups} leietaker(e) med duplikater.\n\nSlå sammen og fjern ${prev.deleted} duplikat-post(er)? Rikeste info (område, budsjett, soverom, attribusjon) flettes inn i den beholdte posten. Kan ikke angres.`)) return;
      const res = await fetch(`/api/admin/leads/dedup-tenants?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun: false }),
      }).then((r) => r.json());
      if (res.ok) { setLeadAdsMsg(`Ryddet: flettet ${res.merged}, fjernet ${res.deleted} duplikat(er)`); await load(); }
      else setLeadAdsMsg('Rydding feilet');
    } catch (e) { setLeadAdsMsg('Rydding feilet'); }
    finally { setDedupBusy(false); setTimeout(() => setLeadAdsMsg(''), 8000); }
  };

  // CRM-dedupe: analyserer/merger speilede tvillinger via /admin/leads/dedupe-crm.
  // dryRun først (plan vises i modal), apply kun etter eksplisitt bekreftelse.
  const runCrmDedupe = async (apply, purge) => {
    setCrmDedupeBusy(true);
    try {
      const res = await fetch(`/api/admin/leads/dedupe-crm?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: !apply, purgeTest: !!purge }),
      });
      const j = await res.json();
      if (apply) { setCrmDedupeResult(j); await load(); } else setCrmDedupePlan(j);
    } catch (e) {
      setCrmDedupePlan({ ok: false, error: 'Analysen feilet — prøv igjen' });
    } finally { setCrmDedupeBusy(false); }
  };
  const openCrmDedupe = () => {
    setCrmDedupeOpen(true); setCrmDedupePlan(null); setCrmDedupeResult(null); setCrmDedupePurge(false);
    runCrmDedupe(false, false);
  };


  const doSetStatus = async (id, status, type) => {
    // Historiske leads (pre_tracking) oppdateres via imported-leads-endepunktet
    // → lagres som override + køes automatisk for toveis-synk tilbake til CRM-et.
    const row = [...data.leads, ...data.tenants].find((x) => x.id === id);
    const isImported = row && row.pre_tracking === true;
    let value;
    if (status === 'won') {
      const input = window.prompt(isImported
        ? 'Kontraktsverdi (NOK/mnd, valgfritt):'
        : 'Kontraktsverdi for Google Ads (NOK, valgfritt). La stå tom for å bruke standardverdi:', '');
      if (input === null) return; // avbrutt
      const n = Number((input || '').replace(/[^\d.,]/g, '').replace(',', '.'));
      if (isFinite(n) && n > 0) value = n;
    }
    setStatusBusy(id);
    try {
      if (isImported) {
        await fetch(`/api/admin/imported-leads?key=${encodeURIComponent(apiKey)}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [id], patch: { status, ...(value != null ? { won_value: value } : {}) } }),
        });
      } else {
        await fetch(`/api/admin/lead-status?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status, type: type || 'lead', value }),
        });
      }
      await load();
      // Trigg ny henting i drawer (ny objekt-referanse → useEffect kjører på nytt)
      setDrawerLead((dl) => (dl && dl.id === id ? { ...dl } : dl));
    } catch (e) {} finally { setStatusBusy(''); }
  };

  // Manuell kilde-attribusjon for historiske leads (påvirker kun kildefordeling/LTV,
  // aldri live ROAS/CAC). Synkes også tilbake til CRM-et via utboksen.
  const doSetImportedChannel = async (id, channel) => {
    setStatusBusy(id);
    try {
      await fetch(`/api/admin/imported-leads?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id], patch: { channel } }),
      });
      await load();
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

  // Eksport fra pipeline-visningen: respekterer aktive filtre (søk, status,
  // kilde, historiske) ved å sende de synlige kortenes ids til backend.
  const exportPipelineCsv = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const type = leadSub === 'tenants' ? 'tenant' : 'lead';
      const ids = filteredRows.map((r) => r.id).filter(Boolean);
      const res = await fetch(`/api/admin/leads/export?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ids }),
      });
      if (!res.ok) throw new Error('Eksport feilet');
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const m = cd.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = m ? m[1] : `digihome-${type === 'tenant' ? 'leietakere' : 'utleiere'}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {} finally { setExporting(false); }
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
  const importedInTab = rows.filter((r) => r.pre_tracking === true).length;

  const channelOf = (r) => (r.attribution && r.attribution.channel) || r.source || '—';

  const channelOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => set.add(channelOf(r)));
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    let r = [...rows];
    if (!showImported) r = r.filter((x) => x.pre_tracking !== true);
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
      else {
        // «Sist aktivitet»: re-engasjement (fornyet interesse) løfter leaden
        // øverst — varm lead skal ringes først.
        av = (a.re_engaged_at && a.re_engaged_at > (a.createdAt || '')) ? a.re_engaged_at : (a.createdAt || '');
        bv = (b.re_engaged_at && b.re_engaged_at > (b.createdAt || '')) ? b.re_engaged_at : (b.createdAt || '');
      }
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
  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (channelFilter !== 'all' ? 1 : 0) + (!showImported ? 1 : 0);
  const filtersActive = Boolean(query.trim()) || activeFilterCount > 0;

  return (
    <div>
      {/* Periode + oppdater — modulnavn/undertittel vises allerede i topplinjen
          (ingen dobbel tittel). Leads har egen samlet verktøylinje med periode. */}
      {!['annonser', 'finnstudio', 'annonsestudio', 'leads'].includes(tab) && (
        <div className="flex items-center justify-end gap-2 mb-4">
          <div className="flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            {RANGES.map((r) => (
              <button key={r.d} onClick={() => changeDays(r.d)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${days === r.d ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{r.l}</button>
            ))}
          </div>
          <button onClick={() => load()} disabled={loading} title="Oppdater" className="h-9 w-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#666] hover:text-[#0a0a0a] transition-colors">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button>
        </div>
      )}

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {/* Content */}
      <div key={tab} className="dh-tab-in">
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
      {tab === 'trakt' && <FunnelTab funnels={analytics && analytics.funnels} paid={analytics && analytics.paid} />}
      {tab === 'ytelse' && <WebVitalsTab webVitals={analytics && analytics.webVitals} />}
      {tab === 'innsikt' && <IntelTab leads={analytics && analytics.leads} />}
      {tab === 'annonser' && <AdsTab apiKey={apiKey} />}
      {tab === 'annonsestudio' && <AdStudioTab apiKey={apiKey} />}
      {tab === 'finnstudio' && <FinnStudioTab apiKey={apiKey} />}
      {tab === 'landingssider' && <LandingPagesTab apiKey={apiKey} days={days} />}
      {tab === 'konkurrent' && <CompetitorAnalysisTab apiKey={apiKey} />}
      {tab === 'leiemarked' && <RentMarketTab apiKey={apiKey} />}
      {tab === 'ai' && <InsightTab apiKey={apiKey} days={days} />}

      {tab === 'leads' && (
        <div>
          {/* Én samlet verktøylinje — segment og visning til venstre, søk/filter/handlinger til høyre */}
          <div className="flex flex-wrap items-center gap-2 mb-3.5">
              <div className="inline-flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                {[{ k: 'leads', l: 'Utleiere', n: data.leads.length }, { k: 'tenants', l: 'Leietakere', n: data.tenants.length }].map((t) => (
                  <button key={t.k} onClick={() => setLeadSub(t.k)} className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${leadSub === t.k ? 'bg-[#0a0a0a] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#888] hover:text-[#0a0a0a]'}`}>
                    {t.l}<span className={`text-[11px] font-bold ${leadSub === t.k ? 'text-white/55' : 'text-[#c4c4c4]'}`}>{t.n}</span>
                  </button>
                ))}
              </div>
              {/* Pipeline / Liste — samme veksler som i CRM-plattformen */}
              <div className="inline-flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
                {[{ k: 'pipeline', l: 'Pipeline', icon: Columns3 }, { k: 'list', l: 'Liste', icon: List }, { k: 'velocity', l: 'Hastighet', icon: Gauge }].map((v) => {
                  const VI = v.icon;
                  return (
                    <button key={v.k} onClick={() => changeLeadView(v.k)} data-testid={`leads-view-${v.k}`}
                      className={`px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold transition-all flex items-center gap-1.5 ${leadView === v.k ? 'bg-[#0a0a0a] text-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]' : 'text-[#888] hover:text-[#0a0a0a]'}`}>
                      <VI className="w-3.5 h-3.5" /> {v.l}
                    </button>
                  );
                })}
              </div>

            {/* Høyre side: søk, filter og handlinger */}
            <div className="flex flex-wrap items-center gap-2 ml-auto">
              {leadAdsMsg && <span className="text-[12px] text-[#8b5cf6] font-semibold dh-fade">{leadAdsMsg}</span>}
              {filtersActive && <span className="text-[12px] text-[#aaa] whitespace-nowrap hidden sm:inline">{filteredRows.length} av {rows.length}</span>}

              {/* Søk */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#bbb] pointer-events-none" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Søk leads …"
                  className="h-9 w-[170px] focus:w-[250px] transition-[width] duration-200 pl-9 pr-8 rounded-full bg-white text-[13px] text-[#222] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none focus:ring-2 focus:ring-[#cf97fc]/40 placeholder:text-[#bbb]" />
                {query && <button onClick={() => setQuery('')} aria-label="Tøm søk" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#bbb] hover:text-[#666]"><X className="w-4 h-4" /></button>}
              </div>

              {/* Filter — alle filtre samlet i én diskret popover */}
              <div className="relative">
                <button onClick={() => setFiltersOpen((o) => !o)} data-testid="leads-filter-btn"
                  className={`h-9 px-3.5 rounded-full text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors ${activeFilterCount > 0 ? 'bg-[#f4f0fb] text-[#8b5cf6] ring-1 ring-[#e3d7f8]' : 'bg-white text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#0a0a0a]'}`}>
                  <SlidersHorizontal className="w-3.5 h-3.5" /> Filter
                  {activeFilterCount > 0 && <span className="text-[10px] bg-[#8b5cf6] text-white rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center leading-none font-bold">{activeFilterCount}</span>}
                </button>
                {filtersOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setFiltersOpen(false)} />
                    <div className="absolute right-0 mt-2 w-72 z-50 bg-white rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.14)] border border-black/[0.04] p-4 dh-pop origin-top-right">
                      <div className="space-y-3.5">
                        <div>
                          <label className="block text-[11px] uppercase tracking-[0.06em] text-[#a3a3a3] font-semibold mb-1.5">Status</label>
                          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full h-9 rounded-xl bg-[#faf9f7] border border-[#eeece8] text-[13px] font-medium text-[#333] px-3 outline-none focus:border-[#cf97fc] cursor-pointer">
                            <option value="all">Alle statuser</option>
                            {STATUS_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase tracking-[0.06em] text-[#a3a3a3] font-semibold mb-1.5">Kilde</label>
                          <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)} className="w-full h-9 rounded-xl bg-[#faf9f7] border border-[#eeece8] text-[13px] font-medium text-[#333] px-3 outline-none focus:border-[#cf97fc] cursor-pointer">
                            <option value="all">Alle kilder</option>
                            {channelOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        {importedInTab > 0 && (
                          <button onClick={() => setShowImported((v) => !v)}
                            title="Historiske leads kom inn før sporingen — teller aldri i live ROAS/CAC"
                            className="w-full flex items-center justify-between rounded-xl bg-[#faf9f7] border border-[#eeece8] px-3 py-2.5 hover:border-[#e3d7f8] transition-colors">
                            <span className="flex items-center gap-2 text-[13px] font-medium text-[#333]"><History className="w-3.5 h-3.5 text-[#8b5cf6]" /> Historiske <span className="text-[#b3aea7]">({importedInTab})</span></span>
                            <span className={`w-8 h-[18px] rounded-full relative transition-colors ${showImported ? 'bg-[#8b5cf6]' : 'bg-[#ddd]'}`}>
                              <span className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow transition-all ${showImported ? 'left-[16px]' : 'left-[2px]'}`} />
                            </span>
                          </button>
                        )}
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[12px] text-[#aaa]">{filteredRows.length} av {rows.length} treff</span>
                          <button onClick={() => { setQuery(''); setStatusFilter('all'); setChannelFilter('all'); setShowImported(true); }} disabled={!filtersActive}
                            className="text-[12px] font-semibold text-[#8b5cf6] hover:text-[#6d28d9] disabled:text-[#ccc] disabled:cursor-not-allowed transition-colors">Nullstill alt</button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Handlinger — samlet i én diskret meny */}
              <div className="relative">
                <button onClick={() => setActionsOpen((o) => !o)} className="h-9 pl-4 pr-3 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform">
                  <MoreHorizontal className="w-4 h-4" /> Handlinger
                  {pendingCount > 0 && <span className="text-[10px] bg-amber-400 text-[#0a0a0a] rounded-full px-1.5 py-0.5 leading-none font-bold">{pendingCount}</span>}
                </button>
                {actionsOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(false)} />
                    <div className="absolute right-0 mt-2 w-64 z-50 bg-white rounded-2xl shadow-[0_16px_50px_rgba(0,0,0,0.14)] border border-black/[0.04] p-1.5 dh-pop origin-top-right">
                      <MenuItem icon={leadAdsSyncing ? Loader2 : RefreshCw} spin={leadAdsSyncing} label="Synk Lead Ads" hint="Hent fra Facebook / Instagram" onClick={() => { setActionsOpen(false); doLeadAdsSync(); }} />
                      <MenuItem icon={FileSpreadsheet} label="Eksporter CSV" hint="Åpnes i Excel · æøå" disabled={rows.length === 0} onClick={() => { setActionsOpen(false); exportCsv(); }} />
                      {leadSub === 'leads' && <MenuItem icon={Download} label="Google Ads-feed" hint="Offline-konverteringer (gclid)" onClick={() => { setActionsOpen(false); downloadAdsFeed(); }} />}
                      <MenuItem icon={forwarding ? Loader2 : Send} spin={forwarding} label={`Re-send ventende${pendingCount > 0 ? ` (${pendingCount})` : ''}`} hint="Send til CRM på nytt" disabled={pendingCount === 0} onClick={() => { setActionsOpen(false); doForward(); }} />
                      {leadSub === 'tenants' && <MenuItem icon={dedupBusy ? Loader2 : Layers} spin={dedupBusy} label="Rydd duplikater" hint="Slå sammen samme e-post/telefon" onClick={() => { setActionsOpen(false); doDedupTenants(); }} />}
                      {leadSub === 'leads' && <MenuItem icon={Layers} label="Rydd CRM-duplikater" hint="Slå sammen speilede tvillinger" onClick={() => { setActionsOpen(false); openCrmDedupe(); }} />}
                      <div className="my-1 mx-2 h-px bg-black/[0.06]" />
                      <MenuItem icon={Trash2} danger label={`Slett ventende${tabPending > 0 ? ` (${tabPending})` : ''}`} hint="Kan ikke angres" disabled={tabPending === 0} onClick={() => { setActionsOpen(false); doDelete({ scope: 'pending' }, `Slette ${tabPending} ventende ${leadSub === 'leads' ? 'utleier' : 'leietaker'}-leads? Kan ikke angres.`); }} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CRM-dedupe-modal: dryRun-plan → eksplisitt bekreftelse → apply */}
          {crmDedupeOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => !crmDedupeBusy && setCrmDedupeOpen(false)} />
              <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 dh-pop" data-testid="crm-dedupe-modal">
                <h3 className="text-[17px] font-bold text-[#111]" style={{ fontFamily: 'var(--font-heading)' }}>Rydd CRM-duplikater</h3>
                <p className="text-[12.5px] text-[#888] mt-1 leading-relaxed">Slår sammen speilede tvillinger fra CRM-synken med den opprinnelige leaden — også når originalen ligger blant historiske leads (Historikk-synken). Originalen beholder kilde og annonse-attribusjon — CRM-statusen (nyest) vinner, og tvillingen slettes. Ekte organiske CRM-leads røres ikke.</p>
                {crmDedupeResult ? (
                  <div className="mt-4">
                    <div className="rounded-xl bg-emerald-50 text-emerald-700 text-[13px] font-semibold px-4 py-3" data-testid="crm-dedupe-result">
                      Ferdig: {crmDedupeResult.merged || 0} slått sammen{crmDedupeResult.purged ? ` · ${crmDedupeResult.purged} testdata slettet` : ''}{crmDedupeResult.unmatched ? ` · ${crmDedupeResult.unmatched} beholdt` : ''}
                    </div>
                    <div className="flex justify-end mt-4">
                      <button onClick={() => setCrmDedupeOpen(false)} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold">Lukk</button>
                    </div>
                  </div>
                ) : !crmDedupePlan ? (
                  <div className="flex items-center gap-2 text-[13px] text-[#888] py-8 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Analyserer speilede leads …</div>
                ) : crmDedupePlan.ok === false ? (
                  <p className="text-[13px] text-rose-500 py-6 text-center">{crmDedupePlan.error || 'Analysen feilet'}</p>
                ) : (
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2 text-[12px] font-semibold">
                      <span className="px-2.5 py-1 rounded-full bg-[#f3f3f2] text-[#555]">{crmDedupePlan.twinsFound} speilede sjekket</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#f4f0fb] text-[#8b5cf6]" data-testid="crm-dedupe-merge-count">{crmDedupePlan.merged} slås sammen</span>
                      <span className="px-2.5 py-1 rounded-full bg-[#f3f3f2] text-[#999]">{crmDedupePlan.unmatched} beholdes</span>
                      {crmDedupePlan.purged > 0 && <span className="px-2.5 py-1 rounded-full bg-rose-50 text-rose-500">{crmDedupePlan.purged} testdata slettes</span>}
                    </div>
                    <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-[#eee] divide-y divide-[#f4f4f4]">
                      {(crmDedupePlan.report || []).map((p, i) => (
                        <div key={i} className="px-3 py-2 text-[12px] flex items-center gap-1.5 min-w-0">
                          {p.mergedInto ? (
                            <>
                              <span className="text-[#8b5cf6] font-bold shrink-0">→</span>
                              <span className="truncate text-[#555]">{p.email || p.twin}</span>
                              <span className="text-[#c4c4c4] shrink-0">inn i</span>
                              <span className="font-semibold text-[#222] truncate">«{p.origName || p.mergedInto}»</span>
                              {p.historic && <span className="shrink-0 text-[10px] font-bold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-2 py-0.5" title="Originalen ligger blant historiske leads (Historikk-synken)">historisk</span>}
                              {p.statusApplied && <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide font-bold text-[#999] bg-[#f5f5f4] rounded-full px-2 py-0.5">{p.statusApplied}</span>}
                            </>
                          ) : (
                            <span className="text-[#b3aea7] truncate">{p.email || p.twin} — {p.action}</span>
                          )}
                        </div>
                      ))}
                      {(crmDedupePlan.report || []).length === 0 && <div className="px-3 py-6 text-center text-[12.5px] text-[#aaa]">Ingen speilede leads å rydde</div>}
                    </div>
                    <label className="flex items-center gap-2 mt-3 text-[12.5px] text-[#666] cursor-pointer select-none">
                      <input type="checkbox" checked={crmDedupePurge} disabled={crmDedupeBusy} onChange={(e) => { setCrmDedupePurge(e.target.checked); runCrmDedupe(false, e.target.checked); }} className="accent-[#8b5cf6]" />
                      Slett også åpenbar testdata (@example.com / @example.no)
                    </label>
                    <div className="flex items-center justify-end gap-2 mt-4">
                      <button onClick={() => setCrmDedupeOpen(false)} disabled={crmDedupeBusy} className="h-10 px-4 rounded-full text-[13px] font-semibold text-[#666] hover:bg-[#f4f4f2] transition-colors">Avbryt</button>
                      <button data-testid="crm-dedupe-apply" disabled={crmDedupeBusy || ((crmDedupePlan.merged || 0) + (crmDedupePlan.purged || 0)) === 0}
                        onClick={() => { if (window.confirm(`Slå sammen ${crmDedupePlan.merged} duplikat(er)${crmDedupePurge && crmDedupePlan.purged ? ` og slette ${crmDedupePlan.purged} testdata-post(er)` : ''}? Kan ikke angres.`)) runCrmDedupe(true, crmDedupePurge); }}
                        className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold disabled:opacity-40 flex items-center gap-2 active:scale-[0.97] transition-transform">
                        {crmDedupeBusy && <Loader2 className="w-4 h-4 animate-spin" />} Kjør opprydding{crmDedupePlan.merged ? ` (${crmDedupePlan.merged})` : ''}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Kompakt nøkkeltallstripe — diskret, så pipelinen får plassen */}
          {leadSub === 'leads' && analytics && analytics.leads && analytics.leads.totals && (() => {
            const t = analytics.leads.totals;
            const decided = (t.won || 0) + (t.lost || 0);
            return (
              <div className="flex items-stretch bg-white rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] mb-4 overflow-x-auto divide-x divide-[#f4f2ef]">
                <MiniStat icon={Trophy} tone="emerald" value={t.won ?? 0} label="Vunnet" sub={decided > 0 ? `av ${decided} avgjorte` : null} />
                <MiniStat icon={TrendingDown} tone="rose" value={t.lost ?? 0} label="Tapt" />
                <MiniStat icon={Target} tone="violet" value={`${t.winRate ?? 0}%`} label="Vinnrate" />
                <MiniStat icon={Clock} tone="slate" value={t.avgResponseHours != null ? `${t.avgResponseHours} t` : '–'} label="Responstid" sub={t.avgResponseHours != null ? (t.avgResponseHours <= 24 ? 'innenfor mål' : 'over mål 24t') : null} />
                <MiniStat icon={ShieldCheck} tone="violet" value={t.slaPct != null ? `${t.slaPct}%` : '–'} label="SLA 24t" />
              </div>
            );
          })()}

          {leadView === 'velocity' ? (
            <LeadsVelocity
              apiKey={apiKey}
              onOpenLead={(id) => { const r = rows.find((x) => x.id === id); if (r) setDrawerLead(r); }}
            />
          ) : leadView === 'pipeline' ? (
            <LeadsPipeline
              rows={filteredRows}
              type={leadSub === 'tenants' ? 'tenant' : 'lead'}
              loading={loading}
              busyId={statusBusy}
              onOpen={setDrawerLead}
              onSetStatus={doSetStatus}
              onExport={exportPipelineCsv}
              exporting={exporting}
              filtered={filteredRows.length !== rows.length}
            />
          ) : (
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
                  {loading && rows.length === 0 && [0, 1, 2, 3, 4].map((i) => (
                    <tr key={`sk-${i}`} className="border-b border-[#f6f6f6]">
                      <td className="py-3.5 px-4"><div className="shimmer h-3.5 rounded w-28" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-3 rounded w-40 mb-1.5" /><div className="shimmer h-3 rounded w-24" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-3 rounded w-36" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-4 rounded-full w-14" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-7 rounded-lg w-20" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-3 rounded w-24" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-3 rounded w-14" /></td>
                      <td className="py-3.5 px-4"><div className="shimmer h-7 rounded-lg w-16 ml-auto" /></td>
                    </tr>
                  ))}
                  {!loading && filteredRows.length === 0 && (<tr><td colSpan={8} className="py-10 text-center text-[14px] text-[#aaa]">{rows.length === 0 ? 'Ingen registreringer ennå' : 'Ingen treff på filteret'}</td></tr>)}
                  {filteredRows.map((r) => {
                    const rType = leadSub === 'tenants' ? 'tenant' : 'lead';
                    const isImp = r.pre_tracking === true;
                    const sc = scores[r.id];
                    return (
                    <tr key={r.id} onClick={() => setDrawerLead(r)} className="border-b border-[#f6f6f6] hover:bg-[#faf8fe] transition-colors cursor-pointer group">
                      <td className="py-3 px-4 text-[14px] font-medium text-[#222]">
                        <span className="inline-flex items-center gap-1.5">{r.name || '—'}<ChevronRight className="w-3.5 h-3.5 text-[#cf97fc] opacity-0 group-hover:opacity-100 transition-opacity" /></span>
                        {Array.isArray(r.re_engaged) && r.re_engaged.length > 0 && (
                          <span className="block mt-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide" title={`Bekreftet interesse på nytt ${r.re_engaged.length > 1 ? r.re_engaged.length + ' ganger' : ''} — sist ${new Date(r.re_engaged_at || r.re_engaged[r.re_engaged.length - 1].at).toLocaleDateString('nb-NO')}`}>
                              Interesse igjen{r.re_engaged.length > 1 ? ` ×${r.re_engaged.length}` : ''}
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[13px] text-[#666]"><div>{r.email}</div><div className="text-[#aaa]">{r.phone}</div></td>
                      <td className="py-3 px-4 text-[13px] text-[#666] max-w-[260px]">
                        {leadSub === 'leads'
                          ? <span>{r.address || '—'}{r.property_type ? ` · ${r.property_type}` : ''}{r.sqm ? ` · ${r.sqm} m²` : ''}{r.num_properties > 1 ? ` · ${r.num_properties} enheter` : ''}</span>
                          : <span>{r.preferred_area || '—'}{r.budget_max ? ` · inntil ${r.budget_max} kr` : ''}{r.bedrooms ? ` · ${r.bedrooms} sov` : ''}</span>}
                      </td>
                      <td className="py-3 px-4 text-[12px]" onClick={isImp ? (e) => e.stopPropagation() : undefined}>
                        {isImp ? (
                          <select
                            value={r.channel || 'unknown'} disabled={statusBusy === r.id}
                            onChange={(e) => doSetImportedChannel(r.id, e.target.value)}
                            title="Sett kilde manuelt — påvirker kun kildefordeling, aldri live ROAS/CAC"
                            className={`text-[12px] font-semibold rounded-lg border px-2 py-1.5 outline-none focus:border-[#cf97fc] disabled:opacity-50 cursor-pointer ${(r.channel || 'unknown') === 'unknown' ? 'border-amber-200 bg-amber-50/60 text-amber-700' : 'border-[#e6e3df] bg-white text-[#555]'}`}
                          >
                            {IMPORTED_CHANNELS.map(([k, lab]) => <option key={k} value={k}>{lab}</option>)}
                          </select>
                        ) : (r.attribution && r.attribution.channel)
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
                            {(isImp ? IMPORTED_STATUS_OPTS : STATUS_OPTS).map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                          </select>
                          {statusBusy === r.id && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#bbb]" />}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[12px] text-[#999] whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                      <td className="py-3 px-4">
                        {isImp
                          ? <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8b5cf6]" title="Historisk lead — kom inn før sporingen. Teller i helhetsbildet, aldri i live ROAS/CAC. Endringer synkes til CRM-et."><History className="w-3.5 h-3.5" /> Historisk</span>
                          : r.forwarded === true
                          ? <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Sendt</span>
                          : <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600" title={r.forward_error || ''}><AlertCircle className="w-3.5 h-3.5" /> Venter</span>}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {isImp ? (
                          <span className="text-[11.5px] text-[#c4c4c4] pr-1" title="Historiske leads administreres også i Historikk-fanen">CRM</span>
                        ) : (
                          <>
                            <button onClick={() => doScore(r.id, rType)} disabled={scoringId === r.id} title="AI-vurder dette leadet" className="inline-flex items-center gap-1 mr-1 h-8 px-2.5 rounded-lg text-[12px] font-semibold text-[#8b5cf6] hover:bg-[#f4f0fb] transition-colors disabled:opacity-40">
                              {scoringId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              {sc && !sc.error ? sc.score : 'AI'}
                            </button>
                            <button onClick={() => doDelete({ id: r.id }, `Slette lead fra ${r.name || r.email || 'denne kontakten'}?`)} disabled={deleting} aria-label="Slett" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </div>
      )}
      </div>

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
          onChanged={() => load()}
        />
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, hint, onClick, disabled, danger, spin }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${danger ? 'hover:bg-rose-50' : 'hover:bg-[#f6f4fb]'}`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${danger ? 'bg-rose-50 text-rose-500' : 'bg-[#f4f0fb] text-[#8b5cf6]'}`}>
        <Icon className={`w-4 h-4 ${spin ? 'animate-spin' : ''}`} />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13px] font-semibold leading-tight ${danger ? 'text-rose-600' : 'text-[#1f1f1f]'}`}>{label}</span>
        {hint && <span className="block text-[11.5px] text-[#a3a3a3] truncate mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}

function MiniStat({ icon: Icon, label, value, tone = 'slate', sub }) {
  const TONES = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose: 'bg-rose-50 text-rose-500',
    violet: 'bg-[#f4f0fb] text-[#8b5cf6]',
    slate: 'bg-[#f3f3f2] text-[#666]',
  };
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 min-w-[128px] flex-1">
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone] || TONES.slate}`}><Icon className="w-4 h-4" /></span>
      <span className="min-w-0">
        <span className="block text-[17px] font-bold text-[#1f1f1f] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{value}</span>
        <span className="block text-[10.5px] uppercase tracking-[0.05em] text-[#a3a3a3] font-semibold mt-1 whitespace-nowrap">
          {label}{sub ? <span className="normal-case tracking-normal text-[#c4bfb8] font-medium"> · {sub}</span> : null}
        </span>
      </span>
    </div>
  );
}
