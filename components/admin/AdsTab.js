'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2, Upload, Megaphone, TrendingUp, AlertCircle, Trash2,
  Coins, MousePointerClick, Target, Wallet, CheckCircle2, Info, RefreshCw, Layers, Link2 as LinkIcon,
  SlidersHorizontal, X, Check, Image as ImageIcon, ExternalLink,
  Plus, Play, Pause, Save, MapPin, Sparkles,
  Search, ArrowUpDown, Lightbulb, Zap, FileText, Settings2, Wand2, TrendingDown, ListChecks, Crosshair,
  ShieldCheck, BellRing, Gauge, Pencil, Globe,
} from 'lucide-react';
import CompetitorCampaign from '@/components/admin/CompetitorCampaign';
import TrendsSection from '@/components/admin/TrendsSection';

const nf = new Intl.NumberFormat('nb-NO');
const fmtNum = (n) => (n == null ? '–' : nf.format(Math.round(n)));
const fmtKr = (n) => (n == null ? '–' : `${nf.format(Math.round(n))} kr`);
const fmtKr2 = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)} kr`);
const fmtPct = (n) => (n == null ? '–' : `${nf.format(Math.round(n * 10) / 10)} %`);
const fmtX = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(n)}×`);
const roasColor = (r) => (r == null ? 'text-[#999]' : r >= 3 ? 'text-emerald-600' : r >= 1 ? 'text-amber-600' : 'text-rose-600');

const PRESETS = [
  { v: 'last_7d', l: 'Siste 7 dager' },
  { v: 'last_30d', l: 'Siste 30 dager' },
  { v: 'last_90d', l: 'Siste 90 dager' },
];

// Google har i tillegg «I år» og «Hele tiden» (live-spørring via Composio/GAQL).
const GOOGLE_PERIODS = [
  { v: 'last_7d', l: 'Siste 7 dager' },
  { v: 'last_30d', l: 'Siste 30 dager' },
  { v: 'last_90d', l: 'Siste 90 dager' },
  { v: 'this_year', l: 'I år' },
  { v: 'all', l: 'Hele tiden' },
];

function minsAgo(iso) {
  if (!iso) return null;
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m <= 0) return 'nå nettopp';
  if (m === 1) return '1 min siden';
  if (m < 60) return `${m} min siden`;
  const h = Math.round(m / 60);
  return h === 1 ? '1 time siden' : `${h} timer siden`;
}

export default function AdsTab({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  // Felles periode-filter (styrer BÅDE Google og Meta — nær-sanntid, auto-hentet)
  const [period, setPeriod] = useState('last_30d');
  const [refreshing, setRefreshing] = useState(false);
  const periodRef = useRef('last_30d');
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const fileRef = useRef(null);
  // Verdensklasse filter (kanal + periode) i modal
  const [showFilter, setShowFilter] = useState(false);
  const [filterMounted, setFilterMounted] = useState(false);
  const [channel, setChannel] = useState('both'); // 'both' | 'google' | 'meta'
  const [draftChannel, setDraftChannel] = useState('both');
  const [draftPeriod, setDraftPeriod] = useState('last_30d');
  const [chartMetric, setChartMetric] = useState('cost'); // 'cost' | 'clicks' | 'leads'
  // Visning: statistikk (tall) eller faktiske annonser/kreativer
  const [view, setView] = useState('stats'); // 'stats' | 'creatives'
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [compOpen, setCompOpen] = useState(false); // konkurrent-kampanje modal
  const [creatives, setCreatives] = useState(null);
  const [loadingCre, setLoadingCre] = useState(false);
  const [creErr, setCreErr] = useState('');

  const loadCreatives = useCallback(async (force = false) => {
    setLoadingCre(true); setCreErr('');
    try {
      const params = new URLSearchParams({ key: apiKey });
      if (force) params.set('refresh', '1');
      const res = await fetch(`/api/admin/ads/creatives?${params.toString()}`);
      if (!res.ok) { setCreErr('Kunne ikke laste annonser'); setLoadingCre(false); return; }
      setCreatives(await res.json());
    } catch (e) { setCreErr('Nettverksfeil'); }
    finally { setLoadingCre(false); }
  }, [apiKey]);

  useEffect(() => {
    if (view === 'creatives' && !creatives && !loadingCre) loadCreatives();
  }, [view, creatives, loadingCre, loadCreatives]);

  useEffect(() => {
    if (!showFilter) { setFilterMounted(false); return; }
    const t = setTimeout(() => setFilterMounted(true), 10);
    const onKey = (e) => { if (e.key === 'Escape') setShowFilter(false); };
    window.addEventListener('keydown', onKey);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); if (typeof document !== 'undefined') document.body.style.overflow = ''; };
  }, [showFilter]);

  const load = useCallback(async (opts = {}) => {
    const { importId } = opts;
    const p = opts.period || periodRef.current;
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({ key: apiKey });
      if (importId) params.set('importId', importId);
      params.set('googlePeriod', p);
      params.set('metaPeriod', p);
      if (opts.refresh) { params.set('googleRefresh', '1'); params.set('metaRefresh', '1'); }
      const res = await fetch(`/api/admin/ads/overview?${params.toString()}`);
      if (!res.ok) { setErr('Kunne ikke laste annonsedata'); setLoading(false); return; }
      const j = await res.json();
      setData(j);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { load(); }, [load]);

  // Etter OAuth-retur (?googleads=connected / ?status=success): hent live data + rydd URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('googleads') === 'connected' || sp.get('status') === 'success') {
      setImportMsg('Google Ads tilkoblet ✓ — henter live data …');
      load({ refresh: true });
      sp.delete('googleads'); sp.delete('status'); sp.delete('connected_account_id');
      const url = window.location.pathname + (sp.toString() ? `?${sp}` : '');
      window.history.replaceState({}, '', url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doGoogleConnect = async () => {
    setGoogleConnecting(true); setErr(''); setImportMsg('');
    try {
      const res = await fetch(`/api/admin/ads/google-connect?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callbackUrl: `${window.location.origin}/admin?googleads=connected` }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok || !j.redirectUrl) { setErr(j.error || 'Kunne ikke starte Google-tilkobling'); setGoogleConnecting(false); return; }
      window.location.href = j.redirectUrl;
    } catch (e) { setErr('Kunne ikke starte Google-tilkobling'); setGoogleConnecting(false); }
  };

  const changePeriod = (v) => { setPeriod(v); periodRef.current = v; load({ period: v }); };
  const refreshAll = async () => { setRefreshing(true); setImportMsg(''); await load({ refresh: true }); setRefreshing(false); };

  const openFilter = () => { setDraftChannel(channel); setDraftPeriod(period); setShowFilter(true); };
  const resetFilter = () => { setDraftChannel('both'); setDraftPeriod('last_30d'); };
  const applyFilter = () => { setChannel(draftChannel); if (draftPeriod !== period) changePeriod(draftPeriod); setShowFilter(false); };
  const periodLabel = (GOOGLE_PERIODS.find((p) => p.v === period) || {}).l || period;
  const channelLabel = channel === 'google' ? 'Kun Google' : channel === 'meta' ? 'Kun Meta' : 'Begge kanaler';
  const filterIsDefault = channel === 'both' && period === 'last_30d';

  const doImport = async (csv) => {
    if (!csv || !csv.trim()) return;
    setImporting(true); setImportMsg(''); setErr('');
    try {
      const res = await fetch(`/api/admin/ads/import?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Importen feilet'); }
      else { setImportMsg(`Google: importert ${j.parsedCampaigns} kampanjer`); await load(); }
    } catch (e) { setErr('Kunne ikke importere'); }
    finally { setImporting(false); }
  };

  const onFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => doImport(String(reader.result || ''));
    reader.readAsText(f);
    e.target.value = '';
  };

  const doDelete = async (id) => {
    if (!window.confirm('Slette denne Google-importen?')) return;
    try {
      await fetch(`/api/admin/ads/import?key=${encodeURIComponent(apiKey)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (e) {}
  };

  const google = data && data.economics;
  const meta = data && data.meta;
  const combined = data && data.combined;
  const bothSources = !!(google && meta);

  return (
    <div>
      <CompetitorCampaign apiKey={apiKey} open={compOpen} onClose={() => setCompOpen(false)} />
      <TrackingVerifyModal apiKey={apiKey} open={verifyOpen} onClose={() => setVerifyOpen(false)} />
      {/* Verktøylinje — verdensklasse */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center shadow-[0_8px_20px_rgba(10,10,10,0.18)]"><Megaphone className="w-5 h-5 text-white" /></div>
            <h2 className="text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Annonser</h2>
            <button onClick={() => setShowHelp((s) => !s)} className="text-[#bbb] hover:text-[#8b5cf6] transition-colors" aria-label="Hjelp"><Info className="w-4 h-4" /></button>
          </div>
          <p className="text-[12.5px] text-[#999] mt-1.5 sm:ml-[46px]">Multi-kanal annonseøkonomi · CPL, CAC og ROAS koblet mot ekte leads</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {importMsg && <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {importMsg}</span>}
          {/* Koble til Google Ads (kun når ikke tilkoblet) */}
          {data && data.googleConfigured && !data.googleConnected && (
            <button onClick={doGoogleConnect} disabled={googleConnecting} className="h-10 px-4 rounded-full text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform shadow-[0_6px_18px_rgba(66,133,244,0.3)]" style={{ background: '#4285F4' }}>
              {googleConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />} Koble til Google Ads
            </button>
          )}
          {/* Konkurrent-kampanje (competitor conquesting) */}
          <button onClick={() => setCompOpen(true)} title="Opprett Google-søkekampanje mot konkurrenter (opprettes på pause)" className="group h-10 pl-3.5 pr-4 rounded-full bg-white text-[12.5px] font-semibold text-[#0a0a0a] flex items-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#e0d5f2] hover:shadow-[0_6px_20px_rgba(139,92,246,0.14)] active:scale-[0.97] transition-all">
            <Crosshair className="w-4 h-4 text-[#8b5cf6] group-hover:rotate-12 transition-transform" />
            <span className="hidden sm:inline">Konkurrent</span>
          </button>
          {/* Verifiser sporing (Meta CAPI + Google offline + GA4) */}
          <button onClick={() => setVerifyOpen(true)} title="Verifiser at closed-loop-sporingen fungerer (Meta CAPI, Google offline-konvertering, GA4)" className="group h-10 pl-3.5 pr-4 rounded-full bg-white text-[12.5px] font-semibold text-[#0a0a0a] flex items-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#c9ead6] hover:shadow-[0_6px_20px_rgba(16,185,129,0.14)] active:scale-[0.97] transition-all">
            <ShieldCheck className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Sporing</span>
          </button>
          {/* Verdensklasse filter-knapp → modal (kanal + periode + import) */}
          <button onClick={openFilter} className="group h-10 pl-3.5 pr-4 rounded-full bg-white text-[12.5px] font-semibold text-[#444] flex items-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#dcdcdc] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] active:scale-[0.97] transition-all">
            <SlidersHorizontal className="w-4 h-4 text-[#0a0a0a] group-hover:rotate-6 transition-transform" />
            <span className="hidden sm:inline text-[#777]">{channelLabel}</span>
            <span className="text-[#ddd] hidden sm:inline">·</span>
            <span className="text-[#0a0a0a]">{periodLabel}</span>
            {!filterIsDefault && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-[#0a0a0a]" />}
          </button>
          <button onClick={() => (view === 'creatives' ? loadCreatives(true) : refreshAll())} disabled={refreshing || loading || loadingCre} title="Oppdater nå" className="h-10 w-10 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#dcdcdc] disabled:opacity-40 active:scale-[0.95] transition-all">
            <RefreshCw className={`w-4 h-4 ${refreshing || loadingCre ? 'animate-spin' : ''}`} />
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </div>
      </div>

      {/* Visningsbryter: Statistikk vs faktiske annonser/kampanjer */}
      <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1 mb-5 w-fit">
        {[['stats', 'Statistikk'], ['table', 'Annonse-tabell'], ['trend', 'Utvikling'], ['creatives', 'Annonser & kampanjer'], ['campaigns', 'Kampanjestyring'], ['optimize', 'AI & optimalisering']].map(([v, l]) => (
          <button key={v} onClick={() => setView(v)} className={`px-4 h-9 rounded-full text-[12.5px] font-semibold transition-all ${view === v ? 'bg-white text-[#0a0a0a] shadow-[0_2px_8px_rgba(0,0,0,0.08)]' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
        ))}
      </div>

      {showHelp && (
        <div className="mb-4 bg-[#f4f0fb] rounded-2xl p-4 text-[13px] text-[#444] leading-relaxed">
          <p className="font-semibold text-[#0a0a0a] mb-1">Multi-kanal annonseøkonomi</p>
          <p><b>Google (live):</b> trykk «Koble til Google Ads» én gang og logg inn med Google-kontoen. Deretter hentes kostnad/klikk/visninger <b>automatisk</b> (nær-sanntid, hentes på nytt hvert ~10. minutt). <b>Meta:</b> hentes også <b>automatisk</b> live fra Facebook/Instagram. For begge: velg periode i nedtrekksmenyen (inkl. «Hele tiden») eller trykk oppdater-ikonet ↻ for ferske tall nå. Vi kobler kostnaden mot leads og vunne kontrakter for å regne ut CPL, CPA og ROAS — per kanal og <b>blandet (Google + Meta)</b>.</p>
          <p className="mt-1.5 text-[12px] text-[#777]">ROAS/CPA bruker «Vunnet»-verdien fra closed-loop. Meta-leads gjenkjennes på <code>fbclid</code> / kilde (facebook/instagram). «Google Ads-CSV» finnes fortsatt som manuelt alternativ.</p>
        </div>
      )}

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {view === 'campaigns' ? (
        <CampaignManager apiKey={apiKey} />
      ) : view === 'table' ? (
        <AdsTable apiKey={apiKey} period={period} channel={channel} periodLabel={periodLabel} onOpenFilter={openFilter} />
      ) : view === 'trend' ? (
        <AdsTrendView apiKey={apiKey} period={period} channel={channel} periodLabel={periodLabel} onOpenFilter={openFilter} />
      ) : view === 'optimize' ? (
        <OptimizePanel apiKey={apiKey} />
      ) : view === 'creatives' ? (
        <CreativesGallery data={creatives} loading={loadingCre} err={creErr} channel={channel} apiKey={apiKey} onRetry={() => loadCreatives(true)} />
      ) : loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>
      ) : (data && data.empty) ? (
        <EmptyState onPick={() => fileRef.current && fileRef.current.click()} onMeta={data.metaConfigured ? refreshAll : null} metaSyncing={refreshing} />
      ) : (
        <>
          {/* Tom-tilstand for valgt enkeltkanal */}
          {channel === 'google' && !google && (
            <div className="mb-6 bg-white rounded-2xl p-8 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Ingen Google Ads-data i denne perioden.</div>
          )}
          {channel === 'meta' && !meta && (
            <div className="mb-6 bg-white rounded-2xl p-8 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Ingen Meta-data i denne perioden.</div>
          )}

          {/* Blandet total (Google + Meta) — verdensklasse «command center»-kort */}
          {channel === 'both' && bothSources && combined && (
            <div className="mb-6 rounded-3xl p-5 sm:p-6 bg-white ring-1 ring-[#ececec] shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-[#f6f4f1] flex items-center justify-center"><Layers className="w-4 h-4 text-[#0a0a0a]" /></span>
                  <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#555]">Totalt · Google + Meta</h3>
                </div>
                <span className="text-[11.5px] text-[#aaa] font-medium">{periodLabel}</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi icon={Wallet} label="Total markedskost" value={fmtKr(combined.cost)} accent="text-[#0a0a0a]" highlight
                  sub={`Google ${fmtKr(combined.sources.google.cost)} · Meta ${fmtKr(combined.sources.meta.cost)}`} />
                <Kpi icon={Target} label="Leads totalt" value={fmtNum(combined.leads)} sub={combined.cpl != null ? `${fmtKr(combined.cpl)} CPL (blandet)` : 'CPL –'} />
                <Kpi icon={CheckCircle2} label="Vunne kunder" value={fmtNum(combined.won)} sub={combined.cpa != null ? `${fmtKr(combined.cpa)} CAC (blandet)` : 'CAC –'} accent="text-emerald-600" />
                <Kpi icon={TrendingUp} label="ROAS (blandet)" value={fmtX(combined.roas)} accent={roasColor(combined.roas)} highlight
                  sub={`Dekningsbidrag ${fmtKr(combined.profit)}`} />
              </div>
              <SplitBar google={combined.sources.google.cost} meta={combined.sources.meta.cost} />
            </div>
          )}

          {/* Budsjett-pacing + varsler (anomali-motoren) */}
          <PacingAlertsRow apiKey={apiKey} />

          {/* Utvikling over tid — daglig tidsserie */}
          {Array.isArray(data.series) && data.series.length > 0 && (
            <TrendChart series={data.series} channel={channel} metric={chartMetric} onMetric={setChartMetric} periodLabel={periodLabel} />
          )}

          {/* Kostnadseffektivitet over tid: CPL/CAC/ROAS per uke per kanal
              (varig historikk via daily_metrics — vokser forbi API-vinduene) */}
          <TrendsSection apiKey={apiKey} />

          {/* Google-seksjon */}
          {channel !== 'meta' && google && (
            <SourceBlock
              title="Google Ads" brand="#4285F4" eco={google}
              period={`${(google.period.from || '').slice(0, 10)} – ${(google.period.to || '').slice(0, 10)}`}
              right={(
                <div className="flex items-center gap-2 text-[12px] text-[#888]">
                  {data.googleLive ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full ${data.googleStale ? 'bg-amber-400' : 'bg-emerald-400'} opacity-60 animate-ping`}></span>
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${data.googleStale ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      </span>
                      <span className="font-semibold text-[#4285F4]">Live</span>
                      <span>· oppdatert {minsAgo(data.googleFetchedAt) || 'nylig'}</span>
                    </span>
                  ) : (
                    <>
                      {data.imports && data.imports.length > 1 && (
                        <select onChange={(e) => load({ importId: e.target.value })} value={google.importId}
                          className="text-[12px] rounded-lg border border-[#e6e3df] bg-white px-2 py-1 outline-none focus:border-[#cf97fc]">
                          {data.imports.map((im) => <option key={im.id} value={im.id}>{im.label}</option>)}
                        </select>
                      )}
                      <button onClick={() => doDelete(google.importId)} className="text-[#bbb] hover:text-rose-500 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Slett import</button>
                    </>
                  )}
                </div>
              )}
            />
          )}

          {/* Meta-seksjon */}
          {channel !== 'google' && (meta ? (
            <SourceBlock
              title="Meta · Facebook & Instagram" brand="#1877F2" eco={meta}
              period={`${(meta.period.from || '').slice(0, 10)} – ${(meta.period.to || '').slice(0, 10)}`}
              right={(
                <div className="flex items-center gap-2 text-[12px] text-[#888]">
                  {meta.accountStatus === 3 && <span className="inline-flex items-center gap-1 text-amber-600 font-semibold" title="Annonsekontoen har uoppgjort saldo"><AlertCircle className="w-3.5 h-3.5" /> Uoppgjort saldo</span>}
                  {data.metaLive && (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className={`absolute inline-flex h-full w-full rounded-full ${data.metaStale ? 'bg-amber-400' : 'bg-emerald-400'} opacity-60 animate-ping`}></span>
                        <span className={`relative inline-flex h-2 w-2 rounded-full ${data.metaStale ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                      </span>
                      <span className="font-semibold text-[#1877F2]">Live</span>
                      <span>· oppdatert {minsAgo(data.metaFetchedAt) || 'nylig'}</span>
                    </span>
                  )}
                </div>
              )}
            />
          ) : (data.metaConfigured && (
            <div className="mt-6 bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: '#1877F2' }}>f</div>
                <div>
                  <p className="text-[14px] font-bold text-[#0a0a0a]">Kunne ikke hente Meta-forbruk</p>
                  <p className="text-[12.5px] text-[#777]">Prøv igjen, eller sjekk at Meta-tokenet er gyldig.</p>
                </div>
              </div>
              <button onClick={refreshAll} disabled={refreshing} className="h-10 px-5 rounded-full text-white text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform" style={{ background: '#1877F2' }}>
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Prøv igjen
              </button>
            </div>
          )))}

          <p className="mt-4 text-[12px] text-[#999] leading-relaxed">
            CPL/CPA/ROAS kobler kostnad mot leads i kanalen <b>Betalt</b> (per kampanje via <code>utm_campaign</code>). Sett kontraktsverdi på vunne leads i Leads-fanen for presis ROAS. Auto-tagging (gclid/fbclid) gir ofte tom <code>utm_campaign</code> → bruk konto-totalene som fasit.
          </p>
        </>
      )}

      {/* === Verdensklasse Filter-modal === */}
      {showFilter && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div onClick={() => setShowFilter(false)} className={`absolute inset-0 bg-[#0a0a0a]/45 backdrop-blur-[3px] transition-opacity duration-300 ${filterMounted ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto overscroll-contain bg-white rounded-t-[28px] sm:rounded-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.28)] p-6 sm:p-7 transition-all duration-300 ${filterMounted ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-8 sm:translate-y-2 sm:scale-95'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0a0a0a] flex items-center justify-center shadow-[0_8px_20px_rgba(10,10,10,0.18)]"><SlidersHorizontal className="w-4 h-4 text-white" /></div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#0a0a0a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Filter</h3>
                  <p className="text-[11.5px] text-[#999]">Velg kanal og tidsperiode</p>
                </div>
              </div>
              <button onClick={() => setShowFilter(false)} className="w-8 h-8 rounded-full hover:bg-[#f4f0fb] text-[#999] hover:text-[#8b5cf6] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#b3b3b3] font-bold mb-2.5">Kanal</p>
            <div className="grid grid-cols-1 gap-2 mb-6">
              <ChannelCard active={draftChannel === 'both'} onClick={() => setDraftChannel('both')} icon={Layers} iconBg="#0a0a0a" title="Begge kanaler" desc="Google + Meta samlet, inkl. blandet ROAS" />
              <ChannelCard active={draftChannel === 'google'} onClick={() => setDraftChannel('google')} badge="G" iconBg="#4285F4" title="Kun Google Ads" desc="Søkekampanjer · live via Composio" />
              <ChannelCard active={draftChannel === 'meta'} onClick={() => setDraftChannel('meta')} badge="f" iconBg="#1877F2" title="Kun Meta" desc="Facebook & Instagram · live" />
            </div>

            <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#b3b3b3] font-bold mb-2.5">Tidsperiode</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
              {GOOGLE_PERIODS.map((p) => (
                <button key={p.v} onClick={() => setDraftPeriod(p.v)} className={`h-11 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.97] ${draftPeriod === p.v ? 'bg-[#0a0a0a] text-white shadow-[0_8px_22px_rgba(0,0,0,0.18)]' : 'bg-[#f6f4f1] text-[#555] hover:bg-[#efeae3]'}`}>{p.l}</button>
              ))}
            </div>

            <div className="border-t border-[#f0ece6] pt-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[12.5px] font-semibold text-[#444]">Importer Google Ads-CSV</p>
                <p className="text-[11px] text-[#aaa]">Manuelt alternativ om live ikke er tilkoblet</p>
              </div>
              <button onClick={() => { setShowFilter(false); fileRef.current && fileRef.current.click(); }} disabled={importing} className="h-9 px-4 rounded-full bg-[#f4f0fb] text-[#8b5cf6] text-[12px] font-semibold inline-flex items-center gap-1.5 hover:bg-[#ece3fb] disabled:opacity-40 transition-colors whitespace-nowrap">
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Last opp
              </button>
            </div>

            <div className="flex items-center gap-2 mt-6">
              <button onClick={resetFilter} className="h-12 px-5 rounded-full bg-white ring-1 ring-[#ececec] text-[#777] text-[13px] font-semibold hover:ring-[#dcdcdc] hover:text-[#555] transition-all">Nullstill</button>
              <button onClick={applyFilter} className="flex-1 h-12 rounded-full bg-[#0a0a0a] text-white text-[14px] font-bold shadow-[0_12px_30px_rgba(10,10,10,0.22)] active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Bruk filter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SplitBar({ google = 0, meta = 0 }) {
  const tot = (google || 0) + (meta || 0);
  if (tot <= 0) return null;
  const g = Math.round((google / tot) * 100);
  const m = 100 - g;
  return (
    <div className="mt-5">
      <div className="h-2.5 rounded-full overflow-hidden bg-[#eee] flex">
        <div style={{ width: `${g}%`, background: '#1f1f1f' }} className="transition-all duration-500" />
        <div style={{ width: `${m}%`, background: '#b9a8d6' }} className="transition-all duration-500" />
      </div>
      <div className="flex justify-between mt-2 text-[11.5px] text-[#888]">
        <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full" style={{ background: '#1f1f1f' }} /> Google {g}%</span>
        <span className="inline-flex items-center gap-1.5 font-medium">Meta {m}% <span className="w-2 h-2 rounded-full" style={{ background: '#b9a8d6' }} /></span>
      </div>
    </div>
  );
}

// --- Daglig tidsserie-graf (ren SVG, raffinert/dempet, hover-tooltip) ---
const MONTHS_NO = ['jan', 'feb', 'mar', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'des'];
function fmtDayLabel(iso) {
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${d.getDate()}. ${MONTHS_NO[d.getMonth()]}`;
}

function TrendChart({ series = [], channel = 'both', metric = 'cost', onMetric, periodLabel }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(760);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    if (!wrapRef.current) return;
    const ro = new ResizeObserver((entries) => { for (const e of entries) setW(Math.max(280, Math.floor(e.contentRect.width))); });
    ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  const COLORS = { google: '#1f1f1f', meta: '#b9a8d6' };
  const fmtVal = (v) => (metric === 'cost' ? fmtKr(v) : fmtNum(v));
  const metricLabel = metric === 'cost' ? 'forbruk' : metric === 'clicks' ? 'klikk' : 'leads';
  const showGoogle = channel !== 'meta';
  const showMeta = channel !== 'google';

  const pick = (d, ch) => {
    if (metric === 'clicks') return (ch === 'google' ? d.googleClicks : d.metaClicks) || 0;
    if (metric === 'leads') return (ch === 'google' ? d.googleLeads : d.metaLeads) || 0;
    return (ch === 'google' ? d.googleCost : d.metaCost) || 0;
  };
  const pts = (series || []).filter((d) => d && d.date);
  const gVals = pts.map((d) => (channel === 'meta' ? 0 : pick(d, 'google')));
  const mVals = pts.map((d) => (channel === 'google' ? 0 : pick(d, 'meta')));
  const avgPerDay = pts.length ? (gVals.reduce((a, b) => a + b, 0) + mVals.reduce((a, b) => a + b, 0)) / pts.length : 0;

  const H = 210, padT = 14, padB = 28;
  const N = pts.length;
  const innerW = Math.max(10, w - 8);
  const maxV = Math.max(1, ...gVals, ...mVals);
  const X = (i) => (N <= 1 ? innerW / 2 : (i / (N - 1)) * innerW) + 4;
  const Y = (v) => padT + (1 - v / maxV) * (H - padT - padB);
  const baseY = H - padB;

  const line = (vals) => {
    const p = vals.map((v, i) => ({ x: X(i), y: Y(v) }));
    if (!p.length) return '';
    if (p.length < 3) return 'M ' + p.map((q) => `${q.x},${q.y}`).join(' L ');
    let d = `M ${p[0].x},${p[0].y}`;
    for (let i = 0; i < p.length - 1; i++) {
      const p0 = p[i - 1] || p[i], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
    }
    return d;
  };
  const area = (vals) => {
    const l = line(vals);
    if (!l) return '';
    return `${l} L ${X(vals.length - 1)},${baseY} L ${X(0)},${baseY} Z`;
  };

  const tickIdx = N <= 1 ? [0] : [0, Math.round((N - 1) / 3), Math.round((2 * (N - 1)) / 3), N - 1].filter((v, i, a) => a.indexOf(v) === i);
  const onMove = (e) => {
    if (!N) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = e.clientX - rect.left - 4;
    let i = Math.round((rx / innerW) * (N - 1));
    setHover(Math.max(0, Math.min(N - 1, i)));
  };
  const totalG = gVals.reduce((a, b) => a + b, 0);
  const totalM = mVals.reduce((a, b) => a + b, 0);

  return (
    <div className="mb-6 bg-white rounded-2xl p-5 sm:p-6 ring-1 ring-[#ececec] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Utvikling over tid</h3>
          <p className="text-[11.5px] text-[#aaa] mt-0.5">{periodLabel} · daglig {metricLabel} · snitt {fmtVal(avgPerDay)}/dag</p>
        </div>
        <div className="flex items-center gap-1 bg-[#f6f4f1] rounded-full p-1">
          {[['cost', 'Forbruk'], ['clicks', 'Klikk'], ['leads', 'Leads']].map(([v, l]) => (
            <button key={v} onClick={() => onMetric && onMetric(v)} className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${metric === v ? 'bg-white text-[#0a0a0a] shadow-[0_1px_4px_rgba(0,0,0,0.08)]' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div ref={wrapRef} className="relative w-full" style={{ height: H }}>
        <svg width={w} height={H} className="block" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id="dhGoogle" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.google} stopOpacity="0.10" /><stop offset="100%" stopColor={COLORS.google} stopOpacity="0" /></linearGradient>
            <linearGradient id="dhMeta" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.meta} stopOpacity="0.28" /><stop offset="100%" stopColor={COLORS.meta} stopOpacity="0" /></linearGradient>
          </defs>
          {[0, 0.5, 1].map((f, i) => (<line key={i} x1="0" x2={w} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="#f1f1f1" strokeWidth="1" />))}
          {showMeta && <path d={area(mVals)} fill="url(#dhMeta)" />}
          {showGoogle && <path d={area(gVals)} fill="url(#dhGoogle)" />}
          {showMeta && <path d={line(mVals)} fill="none" stroke={COLORS.meta} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
          {showGoogle && <path d={line(gVals)} fill="none" stroke={COLORS.google} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
          {hover != null && N > 0 && (
            <g>
              <line x1={X(hover)} x2={X(hover)} y1={padT} y2={baseY} stroke="#ddd" strokeWidth="1" strokeDasharray="3 3" />
              {showMeta && <circle cx={X(hover)} cy={Y(mVals[hover])} r="3.5" fill="#fff" stroke={COLORS.meta} strokeWidth="2" />}
              {showGoogle && <circle cx={X(hover)} cy={Y(gVals[hover])} r="3.5" fill="#fff" stroke={COLORS.google} strokeWidth="2" />}
            </g>
          )}
          {tickIdx.map((i) => (<text key={i} x={Math.max(16, Math.min(w - 16, X(i)))} y={H - 8} textAnchor="middle" fontSize="10.5" fill="#bbb">{fmtDayLabel(pts[i].date)}</text>))}
        </svg>
        {hover != null && N > 0 && (
          <div className="pointer-events-none absolute -translate-x-1/2 bg-[#0a0a0a] text-white rounded-xl px-3 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.25)] text-[11.5px] whitespace-nowrap" style={{ left: Math.max(62, Math.min(w - 62, X(hover))), top: 2 }}>
            <div className="font-semibold mb-1">{fmtDayLabel(pts[hover].date)}</div>
            {showGoogle && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.google }} /> Google {fmtVal(gVals[hover])}</div>}
            {showMeta && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: COLORS.meta }} /> Meta {fmtVal(mVals[hover])}</div>}
          </div>
        )}
      </div>

      {channel === 'both' && (
        <div className="flex items-center gap-5 mt-3 text-[11.5px] text-[#888]">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.google }} /> Google <b className="text-[#444] font-semibold ml-0.5">{fmtVal(totalG)}</b></span>
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS.meta }} /> Meta <b className="text-[#444] font-semibold ml-0.5">{fmtVal(totalM)}</b></span>
        </div>
      )}
    </div>
  );
}

function ChannelCard({ active, onClick, icon: Icon, badge, iconBg, title, desc }) {
  return (
    <button onClick={onClick} className={`relative w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.99] ${active ? 'bg-[#fafafa] ring-2 ring-[#0a0a0a] shadow-[0_8px_24px_rgba(0,0,0,0.10)]' : 'bg-white ring-1 ring-[#ececec] hover:ring-[#dcdcdc]'}`}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[15px] shrink-0" style={{ background: iconBg }}>
        {Icon ? <Icon className="w-5 h-5" /> : badge}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-[#0a0a0a]">{title}</span>
        <span className="block text-[11.5px] text-[#999] truncate">{desc}</span>
      </span>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#0a0a0a] scale-100' : 'bg-[#f0f0f0] scale-90'}`}>
        {active && <Check className="w-3 h-3 text-white" />}
      </span>
    </button>
  );
}

function SourceBlock({ title, brand, eco, period, right }) {
  const t = eco.totals;
  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: brand }} />
          <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#444]">{title}</h3>
          <span className="text-[12px] text-[#aaa]">· {period}</span>
        </div>
        {right}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <Kpi icon={Wallet} label="Forbruk" value={fmtKr(t.cost)} accent="text-[#0a0a0a]" />
        <Kpi icon={MousePointerClick} label="Klikk" value={fmtNum(t.clicks)} sub={`${fmtPct(t.ctr)} CTR`} />
        <Kpi icon={Coins} label="Gj.snitt CPC" value={fmtKr2(t.avgCpc)} />
        <Kpi icon={Target} label="Leads" value={fmtNum(t.leads)} sub={t.cpl != null ? `${fmtKr(t.cpl)} CPL` : 'CPL –'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Kpi icon={CheckCircle2} label="Vunne kunder" value={fmtNum(t.won)} sub={t.cpa != null ? `${fmtKr(t.cpa)} CAC` : 'CAC –'} accent="text-emerald-600" />
        <Kpi icon={TrendingUp} label="Vunnet verdi" value={fmtKr(t.wonValue)} accent="text-emerald-600" />
        <Kpi icon={TrendingUp} label="ROAS" value={fmtX(t.roas)} accent={roasColor(t.roas)} highlight />
        <Kpi icon={Wallet} label="Dekningsbidrag" value={fmtKr(t.profit)} accent={t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
      </div>

      <CampaignTable eco={eco} />
    </div>
  );
}

function CampaignTable({ eco }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[13px]">
          <thead><tr className="border-b border-[#f0f0f0] text-[11px] uppercase tracking-[0.05em] text-[#aaa]">
            <th className="py-3 px-4 font-semibold">Kampanje</th>
            <th className="py-3 px-3 font-semibold text-right">Kostnad</th>
            <th className="py-3 px-3 font-semibold text-right">Klikk</th>
            <th className="py-3 px-3 font-semibold text-right">CPC</th>
            <th className="py-3 px-3 font-semibold text-right">CTR</th>
            <th className="py-3 px-3 font-semibold text-right">Leads</th>
            <th className="py-3 px-3 font-semibold text-right">CPL</th>
            <th className="py-3 px-3 font-semibold text-right">Vunnet</th>
            <th className="py-3 px-3 font-semibold text-right">ROAS</th>
          </tr></thead>
          <tbody>
            {eco.campaigns.length === 0 && (<tr><td colSpan={9} className="py-10 text-center text-[#aaa]">Ingen kampanjer i perioden</td></tr>)}
            {eco.campaigns.map((c, i) => (
              <tr key={i} className="border-b border-[#f6f6f6] hover:bg-[#fafafa] transition-colors">
                <td className="py-3 px-4 font-medium text-[#222] max-w-[260px] truncate" title={c.name}>
                  {c.name}
                  {c.maturity && c.maturity.phase === 'LÆRING' && (
                    <span className="ml-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-[10px] font-semibold align-middle" title={c.maturity.note}>
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" /> Læringsfase · dag {(c.maturity.daysLive ?? 0) + 1}
                    </span>
                  )}
                  {c.maturity && c.maturity.phase === 'KALIBRERING' && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-[#f4f1ea] text-[#8a7a55] text-[10px] font-semibold align-middle" title={c.maturity.note}>
                      Kalibrering · {c.maturity.daysLive} d
                    </span>
                  )}
                  {!c.matched && <span className="ml-2 text-[10px] text-[#bbb]" title="Ingen leads matchet på utm_campaign">ingen match</span>}
                </td>
                <td className="py-3 px-3 text-right text-[#444]">{fmtKr(c.cost)}</td>
                <td className="py-3 px-3 text-right text-[#666]">{fmtNum(c.clicks)}</td>
                <td className="py-3 px-3 text-right text-[#666]">{fmtKr2(c.cpc)}</td>
                <td className="py-3 px-3 text-right text-[#666]">{fmtPct(c.ctr)}</td>
                <td className="py-3 px-3 text-right font-semibold text-[#222]">{fmtNum(c.leads)}</td>
                <td className="py-3 px-3 text-right text-[#666]">{c.cpl != null ? fmtKr(c.cpl) : '–'}</td>
                <td className="py-3 px-3 text-right text-emerald-600 font-semibold">{c.won > 0 ? `${c.won} · ${fmtKr(c.wonValue)}` : '–'}</td>
                <td className={`py-3 px-3 text-right font-bold ${roasColor(c.roas)}`}>{fmtX(c.roas)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, accent = 'text-[#1f1f1f]', highlight }) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-200 ${highlight ? 'ring-1 ring-[#e6e6e6]' : ''}`}>
      <p className="text-[11px] uppercase tracking-[0.06em] text-[#aaa] font-semibold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-[#9b93ad]" /> {label}</p>
      <p className={`text-[22px] font-bold mt-1 ${accent}`} style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub && <p className="text-[11.5px] text-[#999] mt-0.5">{sub}</p>}
    </div>
  );
}

function adStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  const active = s.includes('ACTIVE') || s === 'ENABLED';
  const paused = s.includes('PAUSED');
  const label = active ? 'Aktiv' : paused ? 'Pauset' : (s ? s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ') : '–');
  const cls = active ? 'bg-emerald-50 text-emerald-700' : paused ? 'bg-amber-50 text-amber-700' : 'bg-[#f1f1f1] text-[#888]';
  const dot = active ? 'bg-emerald-500' : paused ? 'bg-amber-500' : 'bg-[#bbb]';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />{label}
    </span>
  );
}

function ctaLabel(c) {
  const map = {
    LEARN_MORE: 'Lær mer', SIGN_UP: 'Registrer deg', CONTACT_US: 'Kontakt oss', GET_QUOTE: 'Få tilbud',
    SUBSCRIBE: 'Abonner', APPLY_NOW: 'Søk nå', GET_OFFER: 'Få tilbud', MESSAGE_PAGE: 'Send melding',
    BOOK_TRAVEL: 'Bestill', DOWNLOAD: 'Last ned', SHOP_NOW: 'Kjøp nå', SEE_MORE: 'Se mer',
  };
  return map[c] || (c ? c.replace(/_/g, ' ').toLowerCase() : '');
}

function proxiedImg(url) {
  if (!url) return '';
  return `/api/admin/ads/img?u=${encodeURIComponent(url)}`;
}

// Native render-dimensjoner fra Metas preview-iframe (px) per format.
// Liten høyde-buffer for å unngå interne scrollbarer.
const META_PREVIEW_DIMS = {
  MOBILE_FEED_STANDARD: { w: 335, h: 478 },
  INSTAGRAM_STANDARD: { w: 320, h: 540 },
  INSTAGRAM_STORY: { w: 320, h: 580 },
};

// Pixel-perfekt, responsiv forhåndsvisning av en faktisk Meta-annonse.
// iframen rendres i native bredde og skaleres for å fylle kortet (crisp, ingen upscale).
function MetaAdPreview({ ad, apiKey, format, index = 0 }) {
  const wrapRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const dims = META_PREVIEW_DIMS[format] || META_PREVIEW_DIMS.MOBILE_FEED_STANDARD;

  useEffect(() => { setLoaded(false); }, [format]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => { const w = el.clientWidth; if (w > 0) setScale(Math.min(w / dims.w, 1)); };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dims.w]);

  const src = `/api/admin/ads/preview?id=${encodeURIComponent(ad.id)}&format=${format}&key=${encodeURIComponent(apiKey || '')}`;
  const scaledH = Math.round(dims.h * scale);

  return (
    <div
      className="dh-fade-up group bg-white rounded-2xl ring-1 ring-[#ececec] shadow-[0_2px_14px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_20px_48px_rgba(0,0,0,0.11)] hover:-translate-y-1 transition-all duration-300 flex flex-col"
      style={{ animationDelay: `${Math.min(index * 55, 440)}ms` }}
    >
      <div className="relative bg-gradient-to-b from-[#f7f6f4] to-[#eeedef] px-4 pt-4 pb-5 sm:px-5 sm:pt-5">
        <div className="absolute top-3 left-3 z-20">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[12px] font-bold shadow-sm" style={{ background: '#1877F2' }}>f</span>
        </div>
        <div className="absolute top-3 right-3 z-20">{adStatusBadge(ad.status)}</div>
        <div
          ref={wrapRef}
          className="relative mx-auto w-full overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)] ring-1 ring-black/[0.04]"
          style={{ maxWidth: dims.w, height: scaledH || dims.h }}
        >
          {!loaded && <div className="absolute inset-0 z-10 shimmer" aria-hidden="true" />}
          <iframe
            key={`${ad.id}-${format}`}
            src={src}
            title={ad.name || 'Meta-annonse'}
            loading="lazy"
            referrerPolicy="no-referrer"
            scrolling="no"
            onLoad={() => setLoaded(true)}
            className={`absolute top-0 left-0 border-0 transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ width: dims.w, height: dims.h, transform: `scale(${scale})`, transformOrigin: 'top left' }}
          />
        </div>
      </div>
      <div className="p-4 border-t border-[#f3f3f3] flex flex-col flex-1">
        <p className="text-[10.5px] text-[#aaa] truncate mb-0.5">{ad.campaign}{ad.adset ? ` · ${ad.adset}` : ''}</p>
        <p className="text-[13px] font-bold text-[#0a0a0a] leading-snug line-clamp-1">{ad.title || ad.name || 'Annonse'}</p>
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          {ad.cta ? <span className="text-[11px] font-semibold text-[#0a0a0a] bg-[#f4f0fb] px-2.5 py-1 rounded-full">{ctaLabel(ad.cta)}</span> : <span />}
          {ad.link && <a href={ad.link} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-semibold text-[#8b5cf6] hover:underline inline-flex items-center gap-1 whitespace-nowrap">Åpne <ExternalLink className="w-3 h-3" /></a>}
        </div>
      </div>
    </div>
  );
}

function MetaAdCard({ ad }) {
  const [imgErr, setImgErr] = useState(false);
  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#ececec] shadow-[0_2px_14px_rgba(0,0,0,0.04)] overflow-hidden hover:shadow-[0_12px_32px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col">
      <div className="relative aspect-[4/3] bg-[#f3f1ee] overflow-hidden">
        {ad.image && !imgErr ? (
          <img src={proxiedImg(ad.image)} alt={ad.name} className="w-full h-full object-cover" onError={() => setImgErr(true)} loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#cfc6dd]"><ImageIcon className="w-8 h-8" /></div>
        )}
        <div className="absolute top-2.5 left-2.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[12px] font-bold shadow-sm" style={{ background: '#1877F2' }}>f</span>
        </div>
        <div className="absolute top-2.5 right-2.5">{adStatusBadge(ad.status)}</div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <p className="text-[10.5px] text-[#aaa] truncate mb-1">{ad.campaign}{ad.adset ? ` · ${ad.adset}` : ''}</p>
        {ad.title
          ? <p className="text-[13.5px] font-bold text-[#0a0a0a] leading-snug line-clamp-2">{ad.title}</p>
          : <p className="text-[13px] font-semibold text-[#444] leading-snug line-clamp-2">{ad.name}</p>}
        {ad.body && <p className="text-[12px] text-[#777] leading-relaxed mt-1.5 line-clamp-3">{ad.body}</p>}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          {ad.cta ? <span className="text-[11px] font-semibold text-[#0a0a0a] bg-[#f4f0fb] px-2.5 py-1 rounded-full">{ctaLabel(ad.cta)}</span> : <span />}
          {ad.link && <a href={ad.link} target="_blank" rel="noopener noreferrer" className="text-[11.5px] font-semibold text-[#8b5cf6] hover:underline inline-flex items-center gap-1 whitespace-nowrap">Se annonse <ExternalLink className="w-3 h-3" /></a>}
        </div>
      </div>
    </div>
  );
}

function GoogleAdCard({ ad }) {
  let host = ad.finalUrl, path = '';
  try { const u = new URL(ad.finalUrl); host = u.host.replace('www.', ''); path = u.pathname === '/' ? '' : u.pathname.replace(/^\//, ''); } catch (e) {}
  const heads = (ad.headlines || []).slice(0, 3);
  const descs = (ad.descriptions || []).slice(0, 2);
  return (
    <div className="bg-white rounded-2xl ring-1 ring-[#ececec] shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-5 hover:shadow-[0_12px_32px_rgba(0,0,0,0.09)] hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10.5px] text-[#aaa] truncate">{ad.campaign}{ad.adGroup ? ` · ${ad.adGroup}` : ''}</p>
        {adStatusBadge(ad.status)}
      </div>
      <div className="rounded-xl bg-[#fbfaf8] ring-1 ring-[#f0ece6] p-4">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[10px] font-bold text-[#0a0a0a] border border-[#0a0a0a] rounded px-1 leading-tight">Annonse</span>
          <span className="text-[12px] text-[#3c4043] truncate">{host}{path && <span className="text-[#5f6368]"> › {path}</span>}</span>
        </div>
        <p className="text-[16px] text-[#1a0dab] leading-snug font-medium">{heads.join('  |  ')}</p>
        {descs.length > 0 && <p className="text-[12.5px] text-[#4d5156] leading-relaxed mt-1">{descs.join(' ')}</p>}
      </div>
      {(ad.headlines || []).length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] uppercase tracking-[0.06em] text-[#bbb] font-bold mb-1.5">Alle overskrifter ({ad.headlines.length})</p>
          <div className="flex flex-wrap gap-1.5">
            {ad.headlines.map((h, i) => <span key={i} className="text-[11px] text-[#555] bg-[#f4f2ef] rounded-full px-2 py-0.5">{h}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

const META_FORMAT_TABS = [
  { v: 'MOBILE_FEED_STANDARD', l: 'Feed' },
  { v: 'INSTAGRAM_STANDARD', l: 'Instagram' },
  { v: 'INSTAGRAM_STORY', l: 'Story' },
];

function GallerySkeleton() {
  return (
    <div>
      <div className="h-5 w-44 rounded-md shimmer mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl ring-1 ring-[#ececec] overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.04)]">
            <div className="p-5 bg-gradient-to-b from-[#f7f6f4] to-[#eeedef]"><div className="mx-auto rounded-xl shimmer" style={{ maxWidth: 320, height: 360 }} /></div>
            <div className="p-4 space-y-2.5"><div className="h-2.5 w-2/3 rounded shimmer" /><div className="h-3.5 w-1/2 rounded shimmer" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CreativesGallery({ data, loading, err, channel, apiKey, onRetry }) {
  const [fmt, setFmt] = useState('MOBILE_FEED_STANDARD');

  if (loading) return <GallerySkeleton />;
  if (err) return (
    <div className="py-16 text-center">
      <p className="text-[13px] text-rose-600 mb-3">{err}</p>
      <button onClick={onRetry} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Prøv igjen</button>
    </div>
  );
  if (!data) return null;
  const g = data.google || {}; const m = data.meta || {};
  const showGoogle = channel !== 'meta';
  const showMeta = channel !== 'google';
  const gAds = showGoogle ? (g.ads || []) : [];
  const mAds = showMeta ? (m.ads || []) : [];

  return (
    <div>
      {gAds.length === 0 && mAds.length === 0 && (
        <div className="py-16 bg-white rounded-2xl text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {(showGoogle && g.error) || (showMeta && m.error) ? `Kunne ikke hente annonser: ${g.error || m.error}` : 'Ingen annonser å vise i valgt kanal.'}
        </div>
      )}

      {showMeta && mAds.length > 0 && (
        <section className="mb-9">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[12px] font-bold" style={{ background: '#1877F2' }}>f</span>
              <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Meta-annonser</h3>
              <span className="text-[11.5px] text-[#aaa]">{mAds.length} stk · Facebook &amp; Instagram</span>
            </div>
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[#f2f1ef] ring-1 ring-[#e8e6e2]">
              {META_FORMAT_TABS.map((t) => (
                <button
                  key={t.v}
                  onClick={() => setFmt(t.v)}
                  className={`h-7 px-3 rounded-full text-[11.5px] font-semibold transition-all ${fmt === t.v ? 'bg-[#0a0a0a] text-white shadow-[0_2px_8px_rgba(0,0,0,0.18)]' : 'text-[#777] hover:text-[#0a0a0a]'}`}
                >{t.l}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {mAds.map((ad, i) => <MetaAdPreview key={ad.id} ad={ad} apiKey={apiKey} format={fmt} index={i} />)}
          </div>
        </section>
      )}

      {showGoogle && gAds.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white ring-1 ring-[#e6e6e6] text-[13px] font-bold" style={{ color: '#4285F4' }}>G</span>
            <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Google-søkeannonser</h3>
            <span className="text-[11.5px] text-[#aaa]">{gAds.length} stk · Søkenettverk</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {gAds.map((ad, i) => (
              <div key={ad.id} className="dh-fade-up" style={{ animationDelay: `${Math.min(i * 55, 440)}ms` }}>
                <GoogleAdCard ad={ad} />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function EmptyState({ onPick, onMeta, metaSyncing }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-4"><Megaphone className="w-7 h-7 text-[#cf97fc]" /></div>
      <h3 className="text-[18px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Ingen annonsedata ennå</h3>
      <p className="text-[14px] text-[#666] mt-2 max-w-md mx-auto">Last opp Google Ads-CSV eller synk Meta-forbruk, så regner vi ut CPC, CPL, CAC og ROAS — koblet mot dine ekte leads og vunne kontrakter.</p>
      <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
        <button onClick={onPick} className="h-11 px-6 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold inline-flex items-center gap-2 active:scale-[0.97] transition-transform"><Upload className="w-4 h-4" /> Importer Google-CSV</button>
        {onMeta && <button onClick={onMeta} disabled={metaSyncing} className="h-11 px-6 rounded-full text-white text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform" style={{ background: '#1877F2' }}>{metaSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Hent Meta-forbruk</button>}
      </div>
    </div>
  );
}


// ===========================================================================
// FASE 3 — Kampanjestyring (native Google Ads API)
// Opprett/pause/aktiver kampanjer + rediger dagsbudsjett, direkte fra dashbordet.
// ===========================================================================

function campaignStatusBadge(status) {
  const s = String(status || '').toUpperCase();
  const map = {
    ENABLED: { l: 'Aktiv', c: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    PAUSED: { l: 'Pauset', c: 'bg-amber-50 text-amber-700 ring-amber-100' },
    REMOVED: { l: 'Fjernet', c: 'bg-[#f3f3f3] text-[#999] ring-[#eee]' },
  };
  const m = map[s] || { l: s || '–', c: 'bg-[#f3f3f3] text-[#777] ring-[#eee]' };
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold ring-1 ${m.c}`}>{m.l}</span>;
}

function CampaignManager({ apiKey }) {
  const [campaigns, setCampaigns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [ca, setCa] = useState(null); // konverteringshandling-status
  const [busyId, setBusyId] = useState('');
  const [editId, setEditId] = useState('');
  const [editVal, setEditVal] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const [rc, ra] = await Promise.all([
        fetch(`/api/admin/ads/campaigns?key=${apiKey}`).then((r) => r.json()),
        fetch(`/api/admin/ads/conversion-actions?key=${apiKey}`).then((r) => r.json()),
      ]);
      if (!rc.ok) setErr(rc.error || 'Kunne ikke hente kampanjer');
      setCampaigns(rc.campaigns || []);
      setCa(ra.ok ? (ra.offlineAction || { resourceName: null }) : { resourceName: null, error: ra.error });
    } catch (e) { setErr('Nettverksfeil ved henting av kampanjer'); }
    setLoading(false);
  }, [apiKey]);

  useEffect(() => { load(); }, [load]);

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3500); };

  const toggleStatus = async (c) => {
    const next = c.status === 'ENABLED' ? 'PAUSED' : 'ENABLED';
    setBusyId(c.id);
    try {
      const r = await fetch(`/api/admin/ads/campaign/status?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campaignId: c.id, status: next }) }).then((x) => x.json());
      if (r.ok) { flash(next === 'ENABLED' ? 'Kampanje aktivert' : 'Kampanje pauset'); await load(); }
      else flash('Feil: ' + (r.error || 'kunne ikke endre status'));
    } catch (e) { flash('Nettverksfeil'); }
    setBusyId('');
  };

  const saveBudget = async (c) => {
    const v = Number(editVal);
    if (!(v > 0)) { flash('Ugyldig budsjett'); return; }
    setBusyId(c.id);
    try {
      const r = await fetch(`/api/admin/ads/campaign/budget?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ budgetResourceName: c.budgetResourceName, dailyBudget: v }) }).then((x) => x.json());
      if (r.ok) { flash('Budsjett oppdatert'); setEditId(''); await load(); }
      else flash('Feil: ' + (r.error || 'kunne ikke endre budsjett'));
    } catch (e) { flash('Nettverksfeil'); }
    setBusyId('');
  };

  if (loading) {
    return (
      <div>
        <div className="h-10 w-56 rounded-xl shimmer mb-5" />
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-2xl shimmer" />)}</div>
      </div>
    );
  }

  return (
    <div className="dh-fade-up">
      {/* Toast */}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-[#0a0a0a] text-white text-[12.5px] font-semibold px-5 py-3 rounded-full shadow-2xl">{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white ring-1 ring-[#e6e6e6] text-[13px] font-bold" style={{ color: '#4285F4' }}>G</span>
          <h3 className="text-[15px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Kampanjestyring</h3>
          <span className="text-[11.5px] text-[#aaa]">{(campaigns || []).length} kampanjer · native API</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="h-10 w-10 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#dcdcdc] active:scale-95 transition-all"><RefreshCw className="w-4 h-4" /></button>
          <button onClick={() => setShowCreate(true)} className="h-10 pl-3.5 pr-4 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold inline-flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.18)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.24)] active:scale-[0.97] transition-all"><Plus className="w-4 h-4" /> Opprett kampanje</button>
        </div>
      </div>

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {/* Lukket sløyfe-status (konverteringshandling) */}
      <div className="mb-5 bg-white rounded-2xl p-4 ring-1 ring-[#ececec] shadow-[0_2px_14px_rgba(0,0,0,0.04)] flex items-start gap-3">
        <span className={`mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-xl ${ca && ca.resourceName ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {ca && ca.resourceName ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Info className="w-4.5 h-4.5" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[12.5px] font-bold text-[#0a0a0a]">Lukket sløyfe · automatisk offline-konvertering</p>
          {ca && ca.resourceName ? (
            <p className="text-[12px] text-[#666] mt-0.5">Konverteringshandlingen <b>«{ca.name}»</b> er aktiv. Når en lead settes til <b>«vunnet»</b> med gclid, lastes verdien automatisk opp til Google Ads.</p>
          ) : (
            <p className="text-[12px] text-[#666] mt-0.5">Ingen UPLOAD_CLICKS-handling funnet. {ca && ca.error ? `(${ca.error})` : ''}</p>
          )}
          <p className="text-[11px] text-[#999] mt-1 inline-flex items-center gap-1"><Sparkles className="w-3 h-3 text-[#8b5cf6]" /> Drevet av Googles nye Data Manager API (events:ingest) — den påkrevde veien etter at den klassiske opplastings-API-en ble utfaset.</p>
        </div>
      </div>

      {/* Kampanjeliste */}
      {(campaigns || []).length === 0 ? (
        <div className="py-16 bg-white rounded-2xl text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          Ingen kampanjer ennå. Klikk «Opprett kampanje» for å lage din første.
        </div>
      ) : (
        <div className="space-y-3">
          {(campaigns || []).map((c, i) => (
            <div key={c.id} className="dh-fade-up bg-white rounded-2xl ring-1 ring-[#ececec] shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-4 sm:p-5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.07)] transition-all" style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[14px] font-bold text-[#0a0a0a] truncate">{c.name}</p>
                    {campaignStatusBadge(c.status)}
                    <span className="text-[10.5px] text-[#bbb] font-medium">{c.channelType || 'SEARCH'}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 flex-wrap">
                    {/* Budsjett (redigerbar) */}
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5 text-[#aaa]" />
                      {editId === c.id ? (
                        <span className="inline-flex items-center gap-1">
                          <input autoFocus type="number" value={editVal} onChange={(e) => setEditVal(e.target.value)} className="w-20 h-7 px-2 rounded-md ring-1 ring-[#ddd] text-[12px] focus:outline-none focus:ring-[#0a0a0a]" />
                          <span className="text-[11px] text-[#999]">kr/d</span>
                          <button disabled={busyId === c.id} onClick={() => saveBudget(c)} className="h-7 w-7 rounded-md bg-[#0a0a0a] text-white flex items-center justify-center disabled:opacity-40">{busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}</button>
                          <button onClick={() => setEditId('')} className="h-7 w-7 rounded-md bg-[#f1f1f1] text-[#666] flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
                        </span>
                      ) : (
                        <button onClick={() => { setEditId(c.id); setEditVal(String(c.dailyBudget || '')); }} className="text-[12.5px] font-semibold text-[#0a0a0a] hover:underline">{fmtKr(c.dailyBudget)}/dag</button>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#666]"><Coins className="w-3.5 h-3.5 text-[#aaa]" /> {fmtKr2(c.cost)} <span className="text-[#bbb]">(30d)</span></span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#666]"><MousePointerClick className="w-3.5 h-3.5 text-[#aaa]" /> {fmtNum(c.clicks)} klikk</span>
                    <span className="inline-flex items-center gap-1.5 text-[12px] text-[#666]"><Target className="w-3.5 h-3.5 text-[#aaa]" /> {fmtNum(c.conversions)} konv.</span>
                  </div>
                </div>
                {/* Pause/Aktiver */}
                {c.status !== 'REMOVED' && (
                  <button disabled={busyId === c.id} onClick={() => toggleStatus(c)} className={`h-9 px-4 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-40 ${c.status === 'ENABLED' ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    {busyId === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (c.status === 'ENABLED' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />)}
                    {c.status === 'ENABLED' ? 'Pause' : 'Aktiver'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <CreateCampaignModal apiKey={apiKey} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); flash('Kampanje opprettet (PAUSED)'); load(); }} />}
    </div>
  );
}

function FormField({ label, hint, children }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#0a0a0a] mb-1.5">{label} {hint && <span className="font-normal text-[#aaa]">· {hint}</span>}</label>
      {children}
    </div>
  );
}

function CreateCampaignModal({ apiKey, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [dailyBudget, setDailyBudget] = useState('100');
  const [finalUrl, setFinalUrl] = useState('https://digihome.no/bli-utleier');
  const [bidding, setBidding] = useState('MAXIMIZE_CONVERSIONS');
  const [headlines, setHeadlines] = useState(['', '', '']);
  const [descriptions, setDescriptions] = useState(['', '']);
  const [keywords, setKeywords] = useState('');
  const [geos, setGeos] = useState([{ id: '2578', name: 'Norge' }]);
  const [geoQuery, setGeoQuery] = useState('');
  const [geoSug, setGeoSug] = useState([]);
  const [geoSearching, setGeoSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  const setArr = (setter, arr, idx, val) => { const a = [...arr]; a[idx] = val; setter(a); };
  const addItem = (setter, arr, max) => { if (arr.length < max) setter([...arr, '']); };
  const delItem = (setter, arr, idx, min) => { if (arr.length > min) setter(arr.filter((_, i) => i !== idx)); };

  const searchGeo = async () => {
    if (!geoQuery.trim()) return;
    setGeoSearching(true); setGeoSug([]);
    try {
      const r = await fetch(`/api/admin/ads/geo-suggest?q=${encodeURIComponent(geoQuery)}&key=${apiKey}`).then((x) => x.json());
      setGeoSug((r.suggestions || []).slice(0, 8));
    } catch (e) { /* ignore */ }
    setGeoSearching(false);
  };
  const addGeo = (g) => { if (!geos.find((x) => x.id === g.id)) setGeos([...geos, { id: g.id, name: g.name }]); setGeoSug([]); setGeoQuery(''); };
  const delGeo = (id) => setGeos(geos.filter((g) => g.id !== id));

  const payload = () => ({
    name: name.trim(), dailyBudget: Number(dailyBudget), finalUrl: finalUrl.trim(),
    biddingStrategy: bidding,
    headlines: headlines.map((h) => h.trim()).filter(Boolean),
    descriptions: descriptions.map((d) => d.trim()).filter(Boolean),
    keywords: keywords.split(/[\n,]/).map((k) => k.trim()).filter(Boolean),
    geoTargetConstantIds: geos.map((g) => g.id),
  });

  const submit = async (validateOnly) => {
    setBusy(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/ads/campaign/create?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload(), validateOnly }) }).then((x) => x.json());
      if (r.ok) {
        if (validateOnly) setMsg({ type: 'ok', text: 'Validering OK — alt ser riktig ut. Klar til å opprette.' });
        else { onCreated(); return; }
      } else setMsg({ type: 'err', text: r.error || 'Kunne ikke opprette kampanjen' });
    } catch (e) { setMsg({ type: 'err', text: 'Nettverksfeil' }); }
    setBusy(false);
  };

  const Field = FormField;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#fafafa] w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl max-h-[92vh] overflow-y-auto dh-fade-up">
        <div className="sticky top-0 z-10 bg-[#fafafa]/95 backdrop-blur px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#eee]">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#0a0a0a] text-white"><Megaphone className="w-4 h-4" /></span>
            <h3 className="text-[15px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Ny søkekampanje</h3>
          </div>
          <button onClick={onClose} className="h-9 w-9 rounded-full bg-white ring-1 ring-[#eee] flex items-center justify-center text-[#666] hover:text-[#0a0a0a]"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Kampanjenavn"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="DH | Utleie | Oslo | Search" className="w-full h-10 px-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a]" /></Field>
            <Field label="Dagsbudsjett" hint="kr/dag"><input type="number" value={dailyBudget} onChange={(e) => setDailyBudget(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a]" /></Field>
          </div>

          <Field label="Landingsside-URL"><input value={finalUrl} onChange={(e) => setFinalUrl(e.target.value)} className="w-full h-10 px-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a]" /></Field>

          <Field label="Budstrategi">
            <div className="inline-flex items-center gap-0.5 p-1 rounded-full bg-[#f1efeb] ring-1 ring-[#e8e6e2]">
              {[['MAXIMIZE_CONVERSIONS', 'Maks. konverteringer'], ['MANUAL_CPC', 'Manuell CPC']].map(([v, l]) => (
                <button key={v} onClick={() => setBidding(v)} className={`h-8 px-3.5 rounded-full text-[11.5px] font-semibold transition-all ${bidding === v ? 'bg-[#0a0a0a] text-white' : 'text-[#777] hover:text-[#0a0a0a]'}`}>{l}</button>
              ))}
            </div>
          </Field>

          {/* Geo */}
          <Field label="Geografisk målretting" hint="legg til steder">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {geos.map((g) => (
                <span key={g.id} className="inline-flex items-center gap-1 bg-white ring-1 ring-[#e6e6e6] rounded-full pl-2.5 pr-1.5 py-1 text-[11.5px] font-semibold text-[#0a0a0a]"><MapPin className="w-3 h-3 text-[#8b5cf6]" /> {g.name} <button onClick={() => delGeo(g.id)} className="text-[#bbb] hover:text-rose-500"><X className="w-3 h-3" /></button></span>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input value={geoQuery} onChange={(e) => setGeoQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchGeo())} placeholder="Søk sted (f.eks. Bergen)…" className="flex-1 h-10 px-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a]" />
              <button onClick={searchGeo} disabled={geoSearching} className="h-10 px-4 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[12.5px] font-semibold text-[#0a0a0a] disabled:opacity-40">{geoSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Søk'}</button>
            </div>
            {geoSug.length > 0 && (
              <div className="mt-2 bg-white ring-1 ring-[#e6e6e6] rounded-xl overflow-hidden">
                {geoSug.map((g) => (
                  <button key={g.id} onClick={() => addGeo(g)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#f7f6f4] transition-colors">
                    <span className="text-[12.5px] text-[#0a0a0a]">{g.name} <span className="text-[#bbb]">· {g.targetType}</span></span>
                    <Plus className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  </button>
                ))}
              </div>
            )}
          </Field>

          {/* Titler */}
          <Field label="Annonsetitler" hint="min. 3 · maks 30 tegn">
            <div className="space-y-2">
              {headlines.map((h, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={h} maxLength={30} onChange={(e) => setArr(setHeadlines, headlines, i, e.target.value)} placeholder={`Tittel ${i + 1}`} className="flex-1 h-10 px-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a]" />
                  <span className="text-[10px] text-[#bbb] w-9 text-right">{h.length}/30</span>
                  {headlines.length > 3 && <button onClick={() => delItem(setHeadlines, headlines, i, 3)} className="text-[#ccc] hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
            </div>
            {headlines.length < 15 && <button onClick={() => addItem(setHeadlines, headlines, 15)} className="mt-2 text-[12px] font-semibold text-[#8b5cf6] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Legg til tittel</button>}
          </Field>

          {/* Beskrivelser */}
          <Field label="Beskrivelser" hint="min. 2 · maks 90 tegn">
            <div className="space-y-2">
              {descriptions.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={d} maxLength={90} onChange={(e) => setArr(setDescriptions, descriptions, i, e.target.value)} placeholder={`Beskrivelse ${i + 1}`} className="flex-1 h-10 px-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a]" />
                  <span className="text-[10px] text-[#bbb] w-11 text-right">{d.length}/90</span>
                  {descriptions.length > 2 && <button onClick={() => delItem(setDescriptions, descriptions, i, 2)} className="text-[#ccc] hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>}
                </div>
              ))}
            </div>
            {descriptions.length < 4 && <button onClick={() => addItem(setDescriptions, descriptions, 4)} className="mt-2 text-[12px] font-semibold text-[#8b5cf6] inline-flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Legg til beskrivelse</button>}
          </Field>

          {/* Søkeord */}
          <Field label="Søkeord" hint="ett per linje eller kommaseparert (phrase match)">
            <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)} rows={3} placeholder={'utleie bergen\nleie ut leilighet\nboligforvaltning'} className="w-full p-3 rounded-xl bg-white ring-1 ring-[#e6e6e6] text-[13px] focus:outline-none focus:ring-[#0a0a0a] resize-y" />
          </Field>

          {msg && (
            <div className={`rounded-xl px-4 py-3 text-[12.5px] flex items-center gap-2 ${msg.type === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'}`}>
              {msg.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />} {msg.text}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-[#fafafa]/95 backdrop-blur px-6 py-4 border-t border-[#eee] flex items-center justify-between gap-3">
          <p className="text-[11px] text-[#999] flex items-center gap-1.5"><Info className="w-3.5 h-3.5" /> Opprettes alltid som <b className="text-[#666]">Pauset</b> — ingen pengebruk før du aktiverer.</p>
          <div className="flex items-center gap-2">
            <button disabled={busy} onClick={() => submit(true)} className="h-10 px-4 rounded-full bg-white ring-1 ring-[#e6e6e6] text-[12.5px] font-semibold text-[#0a0a0a] disabled:opacity-40 inline-flex items-center gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Valider</button>
            <button disabled={busy} onClick={() => submit(false)} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Opprett kampanje</button>
          </div>
        </div>
      </div>
    </div>
  );
}


// ===========================================================================
// Fase A: Samlet annonse-tabell (Google + Meta) m/ filtre + sortering.
// ===========================================================================
const STATUS_ACTIVE = (s) => ['ENABLED', 'ACTIVE'].includes(String(s || '').toUpperCase());
function statusPill(s) {
  const up = String(s || '').toUpperCase();
  if (STATUS_ACTIVE(up)) return <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Aktiv</span>;
  if (up.includes('PAUSED')) return <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Pauset</span>;
  return <span className="text-[11px] font-semibold text-[#888] bg-[#f1efeb] px-2 py-0.5 rounded-full">{s || '–'}</span>;
}
function channelPill(ch) {
  return ch === 'meta'
    ? <span className="text-[10.5px] font-bold text-[#1877F2] bg-[#eaf2fe] px-1.5 py-0.5 rounded">Meta</span>
    : <span className="text-[10.5px] font-bold text-[#0F9D58] bg-[#eafaf0] px-1.5 py-0.5 rounded">Google</span>;
}
function scopeBadge(scope) {
  if (scope !== 'lifetime') return null;
  return <span title="Ingen aktivitet i valgt periode — viser samlede livstidstall (teller ikke i period-summen)" className="text-[10px] font-bold text-[#8b5cf6] bg-[#f4f0fb] px-1.5 py-0.5 rounded-full whitespace-nowrap">Livstid</span>;
}
function adLinks(r, apiKey) {
  const lp = r.channel === 'google' ? r.finalUrl : r.link;
  const adUrl = r.channel === 'google'
    ? (r.campaignId && r.adGroupId ? `https://ads.google.com/aw/ads?campaignId=${r.campaignId}&adGroupId=${r.adGroupId}` : 'https://ads.google.com/aw/ads')
    : `/api/admin/ads/preview?id=${encodeURIComponent(r.id)}&format=MOBILE_FEED_STANDARD&key=${encodeURIComponent(apiKey || '')}`;
  return { lp, adUrl };
}
// Kompakt kortvisning per annonse — mobil (<640px)
function MobileAdCard({ r, apiKey, onOpen }) {
  const { lp, adUrl } = adLinks(r, apiKey);
  return (
    <div className="px-4 py-3.5 active:bg-[#fafafa] cursor-pointer" onClick={() => onOpen && onOpen(r)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">{channelPill(r.channel)}{statusPill(r.status)}{scopeBadge(r.statsScope)}</div>
          <p className="mt-1.5 text-[13px] font-semibold text-[#0a0a0a] leading-snug line-clamp-2" title={r.name}>{r.name || '–'}</p>
          <p className="text-[11px] text-[#aaa] truncate" title={`${r.campaign}${r.adGroup ? ` · ${r.adGroup}` : ''}`}>{r.campaign}{r.adGroup ? ` · ${r.adGroup}` : ''}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[14.5px] font-bold text-[#0a0a0a]">{fmtKr(r.cost)}</p>
          {r.roas != null && <p className={`text-[11px] font-semibold ${roasColor(r.roas)}`}>ROAS {fmtX(r.roas)}</p>}
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-1.5">
        {[['Visn.', fmtNum(r.impressions)], ['Klikk', fmtNum(r.clicks)], ['CTR', fmtPct(r.ctr)], ['Konv.', r.conversions ? fmtNum(r.conversions) : '–']].map(([l, v]) => (
          <div key={l} className="bg-[#faf9f7] rounded-lg px-1.5 py-1.5 text-center">
            <p className="text-[9.5px] uppercase tracking-wide text-[#b3b3b3] font-bold">{l}</p>
            <p className="text-[12px] font-semibold text-[#333]">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        {lp && (
          <a href={lp} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#faf6fe] text-[#8b5cf6] text-[11.5px] font-semibold">
            <Globe className="w-3.5 h-3.5" /> Landingsside
          </a>
        )}
        <a href={adUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-[#f6f4f1] text-[#555] text-[11.5px] font-semibold">
          <ExternalLink className="w-3.5 h-3.5" /> {r.channel === 'google' ? 'Google Ads' : 'Forhåndsvis'}
        </a>
        {r.cpc != null && <span className="ml-auto text-[11px] text-[#999]">CPC {fmtKr2(r.cpc)}</span>}
      </div>
    </div>
  );
}

// === Utvikling: flerlinje-graf som sammenligner annonsers ytelse over tid ===
const TREND_COLORS = ['#0a0a0a', '#8b5cf6', '#0F9D58', '#1877F2', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899'];
const TREND_METRICS = [
  ['cost', 'Kostnad', (v) => fmtKr2(v), true],
  ['clicks', 'Klikk', (v) => fmtNum(v), true],
  ['impressions', 'Visn.', (v) => fmtNum(v), true],
  ['ctr', 'CTR', (v) => fmtPct(v), false],
  ['cpc', 'CPC', (v) => fmtKr2(v), false],
  ['conversions', 'Konv.', (v) => fmtNum(v), true],
];

function AdsTrendView({ apiKey, period, channel, periodLabel, onOpenFilter }) {
  const [allAds, setAllAds] = useState(null);    // alle annonser med forbruk (fra tabellen)
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState([]);  // nøkler `${channel}-${id}`
  const [colorMap, setColorMap] = useState({});  // nøkkel -> farge (stabil selv ved filtrering)
  const [seriesMap, setSeriesMap] = useState({}); // nøkkel -> {loading, series}
  const [metric, setMetric] = useState('cost');
  const [hover, setHover] = useState(null);      // indeks på dato-aksen
  // Lokale filtre for annonse-listen under grafen
  const [q, setQ] = useState('');
  const [localChan, setLocalChan] = useState('all');  // 'all' | 'google' | 'meta'
  const [statusF, setStatusF] = useState('all');      // 'all' | 'active' | 'paused'
  const [campF, setCampF] = useState('all');          // 'all' | kampanjenavn
  const [showAll, setShowAll] = useState(false);

  const chan = channel === 'both' ? 'all' : channel;
  const effPeriod = period === 'all' ? 'last_90d' : period; // daglig akse trenger avgrensning

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr(''); setSelected([]); setColorMap({}); setSeriesMap({}); setHover(null);
      setQ(''); setLocalChan('all'); setStatusF('all'); setCampF('all'); setShowAll(false);
      try {
        const params = new URLSearchParams({ key: apiKey, googlePeriod: effPeriod, metaPeriod: effPeriod });
        const res = await fetch(`/api/admin/ads/table?${params.toString()}`);
        const j = await res.json();
        if (!alive) return;
        if (!j.ok) { setErr(j.error || 'Kunne ikke hente annonser'); return; }
        let list = (j.ads || []).filter((a) => chan === 'all' || a.channel === chan);
        list = list
          .filter((a) => (a.cost || 0) > 0 && a.statsScope !== 'lifetime')
          .sort((a, b) => (b.cost || 0) - (a.cost || 0));
        setAllAds(list);
        const init = list.slice(0, 4).map((a) => `${a.channel}-${a.id}`);
        setSelected(init);
        setColorMap(Object.fromEntries(init.map((k, i) => [k, TREND_COLORS[i]])));
      } catch (e) { if (alive) setErr('Nettverksfeil'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [apiKey, effPeriod, chan]);

  // Hent daglig serie for valgte annonser (server-cachet 10 min)
  useEffect(() => {
    for (const key of selected) {
      if (seriesMap[key]) continue;
      const [ch, ...rest] = key.split('-');
      const id = rest.join('-');
      setSeriesMap((m) => ({ ...m, [key]: { loading: true, series: [] } }));
      (async () => {
        try {
          const params = new URLSearchParams({ key: apiKey, channel: ch, id, period: effPeriod });
          const res = await fetch(`/api/admin/ads/detail?${params.toString()}`);
          const j = await res.json();
          setSeriesMap((m) => ({ ...m, [key]: { loading: false, series: (j.ok && j.series) || [] } }));
        } catch (e) {
          setSeriesMap((m) => ({ ...m, [key]: { loading: false, series: [] } }));
        }
      })();
    }
  }, [selected, apiKey, effPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorOf = (key) => colorMap[key] || '#d5d5d5';
  const adOf = (key) => (allAds || []).find((a) => `${a.channel}-${a.id}` === key);

  // Unike kampanjenavn (for kampanje-filter)
  const campaigns = useMemo(() => {
    const set = new Set((allAds || []).map((a) => a.campaign).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b, 'nb'));
  }, [allAds]);

  // Filtrert annonse-liste (søk + kanal + status + kampanje)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (allAds || []).filter((a) => {
      if (localChan !== 'all' && a.channel !== localChan) return false;
      if (statusF === 'active' && !STATUS_ACTIVE(a.status)) return false;
      if (statusF === 'paused' && !String(a.status || '').toUpperCase().includes('PAUSED')) return false;
      if (campF !== 'all' && a.campaign !== campF) return false;
      if (needle && !`${a.name || ''} ${a.campaign || ''} ${a.adGroup || ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [allAds, q, localChan, statusF, campF]);

  const visibleAds = showAll ? filtered : filtered.slice(0, 12);
  const filterActive = q.trim() !== '' || localChan !== 'all' || statusF !== 'all' || campF !== 'all';
  const resetFilters = () => { setQ(''); setLocalChan('all'); setStatusF('all'); setCampF('all'); setShowAll(false); };

  const mDef = TREND_METRICS.find(([k]) => k === metric) || TREND_METRICS[0];
  const [, mLabel, mFmt, mAdditive] = mDef;

  // Felles dato-akse = union av lastede serier (maks 90 punkter)
  const dates = useMemo(() => {
    const set = new Set();
    for (const key of selected) for (const d of (seriesMap[key]?.series || [])) set.add(d.date);
    return [...set].sort().slice(-90);
  }, [selected, seriesMap]);

  const lines = useMemo(() => selected.map((key) => {
    const byDate = new Map((seriesMap[key]?.series || []).map((d) => [d.date, d]));
    const vals = dates.map((dt) => {
      const row = byDate.get(dt);
      if (!row) return mAdditive ? 0 : null;
      return row[metric] ?? (mAdditive ? 0 : null);
    });
    return { key, vals };
  }), [selected, seriesMap, dates, metric, mAdditive]);

  const maxVal = Math.max(1e-9, ...lines.flatMap((l) => l.vals.filter((v) => v != null)));
  const anyLoading = selected.some((key) => seriesMap[key]?.loading);

  const pathOf = (vals) => {
    let d = ''; let pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      const x = dates.length > 1 ? (i / (dates.length - 1)) * 100 : 50;
      const y = 98 - (v / maxVal) * 92;
      d += `${pen ? ' L' : ' M'}${x.toFixed(2)} ${y.toFixed(2)}`;
      pen = true;
    });
    return d;
  };

  const toggle = (key) => {
    setSelected((s) => {
      if (s.includes(key)) {
        setColorMap((m) => { const n = { ...m }; delete n[key]; return n; });
        return s.filter((k) => k !== key);
      }
      if (s.length >= TREND_COLORS.length) return s;
      setColorMap((m) => {
        const used = new Set(Object.values(m));
        const free = TREND_COLORS.find((c) => !used.has(c)) || TREND_COLORS[0];
        return { ...m, [key]: free };
      });
      return [...s, key];
    });
  };
  const clearAll = () => { setSelected([]); setColorMap({}); };
  const selectTop = () => {
    const top = filtered.slice(0, 4).map((a) => `${a.channel}-${a.id}`);
    setSelected(top);
    setColorMap(Object.fromEntries(top.map((k, i) => [k, TREND_COLORS[i]])));
  };

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>;
  if (err) return <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>;
  if (!allAds || allAds.length === 0) return <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Ingen annonser med forbruk i valgt periode.</div>;

  return (
    <div>
      {/* Verktøylinje: periode-chip + metric-bryter */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-4">
        <button onClick={onOpenFilter} className="h-10 pl-3.5 pr-4 rounded-full bg-white text-[12.5px] font-semibold text-[#444] inline-flex items-center gap-2 shadow-sm ring-1 ring-[#eee] hover:ring-[#dcdcdc] active:scale-[0.97] transition-all w-fit">
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#0a0a0a]" />
          <span className="text-[#777]">{channel === 'google' ? 'Google' : channel === 'meta' ? 'Meta' : 'Alle kanaler'}</span>
          <span className="text-[#ddd]">·</span>
          <span className="text-[#0a0a0a]">{period === 'all' ? 'Siste 90 dager' : periodLabel}</span>
        </button>
        <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1 w-fit overflow-x-auto max-w-full">
          {TREND_METRICS.map(([k, l]) => (
            <button key={k} onClick={() => setMetric(k)} className={`px-3 h-8 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${metric === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
          ))}
        </div>
        {anyLoading && <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#999]"><Loader2 className="w-3.5 h-3.5 animate-spin" /> henter daglig data…</span>}
      </div>

      {/* Graf */}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-start justify-between gap-3 mb-3 min-h-[38px]">
          <div>
            <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{mLabel} per dag — annonse for annonse</h3>
            <p className="text-[11.5px] text-[#999]">Klikk på annonsene under for å vise/skjule linjer (maks {TREND_COLORS.length}).</p>
          </div>
          {hover != null && dates[hover] && (
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-[#0a0a0a]">{fmtDayLabel(dates[hover])}</p>
              {lines.map((l) => (l.vals[hover] != null && (
                <p key={l.key} className="text-[11px] text-[#666] flex items-center gap-1.5 justify-end">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorOf(l.key) }} />
                  <span className="truncate max-w-[180px]">{(adOf(l.key)?.name || '').slice(0, 26)}</span>
                  <span className="font-semibold text-[#0a0a0a] tabular-nums">{mFmt(l.vals[hover])}</span>
                </p>
              )))}
            </div>
          )}
        </div>

        <div
          className="relative h-64 sm:h-72 lg:h-80 cursor-crosshair"
          onMouseMove={(e) => {
            if (dates.length < 2) return;
            const r = e.currentTarget.getBoundingClientRect();
            const idx = Math.round(((e.clientX - r.left) / r.width) * (dates.length - 1));
            setHover(Math.max(0, Math.min(dates.length - 1, idx)));
          }}
          onMouseLeave={() => setHover(null)}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            {[25, 50, 75].map((y) => <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#f2f0ec" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
            <line x1="0" y1="98" x2="100" y2="98" stroke="#e8e5df" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            {hover != null && dates.length > 1 && (
              <line x1={(hover / (dates.length - 1)) * 100} y1="0" x2={(hover / (dates.length - 1)) * 100} y2="100" stroke="#d9d4ca" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            )}
            {lines.map((l) => (
              <path key={l.key} d={pathOf(l.vals)} fill="none" stroke={colorOf(l.key)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" opacity={seriesMap[l.key]?.loading ? 0.25 : 0.95} />
            ))}
            {hover != null && dates.length > 1 && lines.map((l) => (l.vals[hover] != null && (
              <circle key={`pt-${l.key}`} cx={(hover / (dates.length - 1)) * 100} cy={98 - (l.vals[hover] / maxVal) * 92} r="3" fill={colorOf(l.key)} vectorEffect="non-scaling-stroke" />
            )))}
          </svg>
          {/* Y-maks-etikett */}
          <span className="absolute top-0 left-0 text-[10px] text-[#b3b3b3] bg-white/80 px-1 rounded">{mFmt(maxVal)}</span>
        </div>
        <div className="flex justify-between text-[10.5px] text-[#b3b3b3] mt-1.5">
          <span>{dates[0] ? fmtDayLabel(dates[0]) : ''}</span>
          <span>{dates.length > 2 ? fmtDayLabel(dates[Math.floor((dates.length - 1) / 2)]) : ''}</span>
          <span>{dates.length > 1 ? fmtDayLabel(dates[dates.length - 1]) : ''}</span>
        </div>
      </div>

      {/* Filter-verktøylinje for annonse-listen */}
      <div className="mt-4 flex flex-col lg:flex-row lg:items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#aaa] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk i annonser, kampanjer, annonsegrupper …"
            className="w-full h-10 pl-9 pr-9 rounded-full bg-white text-[12.5px] text-[#0a0a0a] placeholder:text-[#b3b3b3] outline-none shadow-sm ring-1 ring-[#eee] focus:ring-[#dcd6ca] transition-all"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] hover:text-[#0a0a0a] transition-colors" title="Tøm søk">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {chan === 'all' && (
            <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1">
              {[['all', 'Alle kanaler'], ['google', 'Google'], ['meta', 'Meta']].map(([v, l]) => (
                <button key={v} onClick={() => setLocalChan(v)} className={`px-3 h-8 rounded-full text-[11.5px] font-semibold transition-all whitespace-nowrap ${localChan === v ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1">
            {[['all', 'Alle statuser'], ['active', 'Aktive'], ['paused', 'Pauset']].map(([v, l]) => (
              <button key={v} onClick={() => setStatusF(v)} className={`px-3 h-8 rounded-full text-[11.5px] font-semibold transition-all whitespace-nowrap ${statusF === v ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
            ))}
          </div>
          {campaigns.length > 1 && (
            <select
              value={campF} onChange={(e) => setCampF(e.target.value)}
              className={`h-10 px-3.5 rounded-full bg-white text-[12px] font-semibold shadow-sm ring-1 outline-none max-w-[230px] cursor-pointer transition-all ${campF !== 'all' ? 'text-[#0a0a0a] ring-[#dcd6ca]' : 'text-[#666] ring-[#eee] hover:ring-[#dcdcdc]'}`}
            >
              <option value="all">Alle kampanjer</option>
              {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Tellelinje + hurtigvalg */}
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[11.5px] text-[#999]">
          <span className="font-semibold text-[#0a0a0a]">{selected.length}</span> av {TREND_COLORS.length} mulige linjer valgt
          <span className="text-[#ddd] mx-1.5">·</span>
          {filtered.length} {filtered.length === 1 ? 'annonse' : 'annonser'}{filterActive ? ' etter filter' : ' totalt'}
        </p>
        <div className="flex items-center gap-1.5">
          {filtered.length > 0 && (
            <button onClick={selectTop} className="h-8 px-3 rounded-full bg-white text-[11.5px] font-semibold text-[#444] shadow-sm ring-1 ring-[#eee] hover:ring-[#dcdcdc] active:scale-[0.97] transition-all">Velg topp 4</button>
          )}
          {selected.length > 0 && (
            <button onClick={clearAll} className="h-8 px-3 rounded-full bg-white text-[11.5px] font-semibold text-rose-500 shadow-sm ring-1 ring-[#eee] hover:ring-rose-200 active:scale-[0.97] transition-all">Fjern alle</button>
          )}
          {filterActive && (
            <button onClick={resetFilters} className="h-8 px-3 rounded-full bg-[#0a0a0a] text-[11.5px] font-semibold text-white active:scale-[0.97] transition-all inline-flex items-center gap-1.5"><X className="w-3 h-3" /> Nullstill filter</button>
          )}
        </div>
      </div>

      {/* Annonse-velger / legende m/ sum for perioden */}
      {filtered.length === 0 ? (
        <div className="mt-2 bg-white rounded-2xl p-8 text-center shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[13px] text-[#999]">Ingen annonser matcher filteret.</p>
          <button onClick={resetFilters} className="mt-3 h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold active:scale-[0.97] transition-all">Nullstill filter</button>
        </div>
      ) : (
        <div className="mt-2 grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
          {visibleAds.map((a) => {
            const key = `${a.channel}-${a.id}`;
            const on = selected.includes(key);
            const line = lines.find((l) => l.key === key);
            const vals = (line?.vals || []).filter((v) => v != null);
            const agg = vals.length ? (mAdditive ? vals.reduce((t, v) => t + v, 0) : vals.reduce((t, v) => t + v, 0) / vals.length) : null;
            const paused = String(a.status || '').toUpperCase().includes('PAUSED');
            return (
              <button key={key} onClick={() => toggle(key)} className={`text-left bg-white rounded-xl px-3.5 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] ring-1 transition-all ${on ? 'ring-[#dcd6ca]' : 'ring-transparent opacity-55 hover:opacity-90'}`}>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: on ? colorOf(key) : '#d5d5d5' }} />
                  {channelPill(a.channel)}
                  <span className="text-[12px] font-semibold text-[#0a0a0a] truncate flex-1" title={a.name}>{a.name || '–'}</span>
                  {paused && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full shrink-0">Pauset</span>}
                  {on && agg != null && <span className="text-[11.5px] font-bold text-[#0a0a0a] tabular-nums shrink-0">{mAdditive ? mFmt(agg) : `Ø ${mFmt(agg)}`}</span>}
                </div>
                <p className="text-[10.5px] text-[#aaa] truncate mt-0.5 pl-[18px]">{a.campaign}{a.adGroup ? ` · ${a.adGroup}` : ''}</p>
              </button>
            );
          })}
        </div>
      )}
      {!showAll && filtered.length > 12 && (
        <button onClick={() => setShowAll(true)} className="mt-2 w-full h-9 rounded-xl bg-white text-[12px] font-semibold text-[#444] shadow-[0_2px_10px_rgba(0,0,0,0.03)] ring-1 ring-[#eee] hover:ring-[#dcdcdc] active:scale-[0.99] transition-all">
          Vis alle {filtered.length} annonser
        </button>
      )}
      <p className="mt-2.5 text-[11.5px] text-[#999]">Sortert etter forbruk i perioden. Klikk et kort for å vise/skjule linjen i grafen. Ø = snitt per dag for forholdstall (CTR/CPC); ellers sum for perioden.</p>
    </div>
  );
}

// === Detalj-modal: daglig forbruk/klikk/visninger for ÉN annonse ===
const DETAIL_METRICS = [
  ['cost', 'Kostnad', (v) => fmtKr(v)],
  ['clicks', 'Klikk', (v) => fmtNum(v)],
  ['impressions', 'Visn.', (v) => fmtNum(v)],
  ['conversions', 'Konv.', (v) => fmtNum(v)],
];
function AdDetailModal({ ad, apiKey, period, periodLabel, onClose }) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [metric, setMetric] = useState('cost');
  const lifetime = ad.statsScope === 'lifetime';
  const effPeriod = lifetime ? 'all' : period;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    if (typeof document !== 'undefined') document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); if (typeof document !== 'undefined') document.body.style.overflow = ''; };
  }, [onClose]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setErr('');
      try {
        const params = new URLSearchParams({ key: apiKey, channel: ad.channel, id: String(ad.id), period: effPeriod });
        const res = await fetch(`/api/admin/ads/detail?${params.toString()}`);
        const j = await res.json();
        if (!alive) return;
        if (!j.ok) { setErr(j.error || 'Kunne ikke hente daglig data'); setData(null); }
        else setData(j);
      } catch (e) { if (alive) setErr('Nettverksfeil'); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [apiKey, ad.channel, ad.id, effPeriod]);

  const series = (data && data.series) || [];
  const totals = (data && data.totals) || {};
  const chart = series.slice(-90); // maks 90 søyler i grafen; tabellen viser alt
  const maxVal = Math.max(1, ...chart.map((d) => d[metric] || 0));
  const fmtMetric = (DETAIL_METRICS.find(([k]) => k === metric) || DETAIL_METRICS[0])[2];
  const desc = [...series].reverse();
  const { lp, adUrl } = adLinks(ad, apiKey);

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
      <div onClick={onClose} className={`absolute inset-0 bg-[#0a0a0a]/45 backdrop-blur-[3px] transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`} />
      <div className={`relative w-full sm:max-w-2xl lg:max-w-4xl xl:max-w-5xl max-h-[92dvh] overflow-y-auto overscroll-contain bg-white rounded-t-[28px] sm:rounded-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.28)] p-5 sm:p-7 transition-all duration-300 ${mounted ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-8 sm:translate-y-2 sm:scale-95'}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">{channelPill(ad.channel)}{statusPill(ad.status)}{scopeBadge(ad.statsScope)}</div>
            <h3 className="mt-1.5 text-[16px] font-bold text-[#0a0a0a] leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>{ad.name || '–'}</h3>
            <p className="text-[11.5px] text-[#aaa] truncate">{ad.campaign}{ad.adGroup ? ` · ${ad.adGroup}` : ''}</p>
          </div>
          <button onClick={onClose} className="shrink-0 w-8 h-8 rounded-full hover:bg-[#f4f0fb] text-[#999] hover:text-[#8b5cf6] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-[11.5px] text-[#999] mb-4">
          {lifetime
            ? 'Ingen aktivitet i valgt periode — viser daglig historikk for hele annonsens levetid.'
            : `Daglig utvikling · ${periodLabel}`}
          {data && data.fetchedAt ? ` · oppdatert ${minsAgo(data.fetchedAt) || 'nylig'}` : ''}
        </p>

        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>
        ) : err ? (
          <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>
        ) : series.length === 0 ? (
          <div className="bg-[#faf9f7] rounded-2xl p-8 text-center text-[#999] text-[13px]">Ingen daglig data i denne perioden.</div>
        ) : (
          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
            {/* Venstre kolonne (desktop): KPI + graf + handlinger */}
            <div>
              {/* KPI-rad (sum for perioden) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 mb-5">
                {[['Kostnad', fmtKr(totals.cost)], ['Klikk', fmtNum(totals.clicks)], ['Visninger', fmtNum(totals.impressions)], ['Konvert.', totals.conversions ? fmtNum(totals.conversions) : '–']].map(([l, v]) => (
                  <div key={l} className="bg-[#faf9f7] rounded-xl px-3 py-2.5 lg:py-3.5">
                    <p className="text-[10px] uppercase tracking-[0.06em] text-[#b3b3b3] font-bold">{l}</p>
                    <p className="text-[15px] lg:text-[17px] font-bold text-[#0a0a0a]">{v}</p>
                  </div>
                ))}
              </div>

              {/* Metric-bryter + søylegraf */}
              <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1 w-fit mb-3">
                {DETAIL_METRICS.map(([k, l]) => (
                  <button key={k} onClick={() => setMetric(k)} className={`px-3 h-7.5 py-1 rounded-full text-[11.5px] font-semibold transition-all ${metric === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
                ))}
              </div>
              <div className="flex items-end gap-px h-28 sm:h-32 lg:h-44 mb-1.5 rounded-xl bg-[#faf9f7] px-2 pt-2">
                {chart.map((d) => (
                  <div key={d.date} className="flex-1 min-w-0 group relative flex items-end h-full" title={`${fmtDayLabel(d.date)} · ${fmtMetric(d[metric])}`}>
                    <div className="w-full rounded-t-[3px] bg-[#0a0a0a] group-hover:bg-[#8b5cf6] transition-colors" style={{ height: `${Math.max(2, ((d[metric] || 0) / maxVal) * 100)}%`, opacity: (d[metric] || 0) > 0 ? 1 : 0.12 }} />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[10.5px] text-[#b3b3b3] mb-5">
                <span>{chart[0] ? fmtDayLabel(chart[0].date) : ''}</span>
                {series.length > 90 && <span>viser siste 90 dager i grafen</span>}
                <span>{chart[chart.length - 1] ? fmtDayLabel(chart[chart.length - 1].date) : ''}</span>
              </div>

              {/* Handlinger — synlige uten scroll på desktop */}
              <div className="hidden lg:flex items-center gap-2">
                {lp && (
                  <a href={lp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#faf6fe] text-[#8b5cf6] text-[12px] font-semibold hover:bg-[#f0e6fc] transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Landingsside
                  </a>
                )}
                <a href={adUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#f6f4f1] text-[#555] text-[12px] font-semibold hover:bg-[#efeae3] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> {ad.channel === 'google' ? 'Åpne i Google Ads' : 'Forhåndsvis annonsen'}
                </a>
              </div>
            </div>

            {/* Høyre kolonne (desktop): daglig tabell */}
            <div>
              <div className="rounded-2xl ring-1 ring-[#f0f0f0] overflow-hidden">
                <div className="overflow-x-auto max-h-[300px] lg:max-h-[440px] overflow-y-auto">
                  <table className="w-full text-[12px]">
                    <thead className="text-[#999] text-[10.5px] uppercase tracking-wide bg-[#fafafa] sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Dato</th>
                        <th className="px-3 py-2 text-right">Kostnad</th>
                        <th className="px-3 py-2 text-right">Visn.</th>
                        <th className="px-3 py-2 text-right">Klikk</th>
                        <th className="px-3 py-2 text-right">CTR</th>
                        <th className="px-3 py-2 text-right">CPC</th>
                        <th className="px-3 py-2 text-right">Konv.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {desc.map((d) => (
                        <tr key={d.date} className="border-t border-[#f6f6f6] hover:bg-[#fafafa]">
                          <td className="px-3 py-2 font-semibold text-[#0a0a0a] whitespace-nowrap">{fmtDayLabel(d.date)}</td>
                          <td className="px-3 py-2 text-right font-semibold text-[#0a0a0a]">{fmtKr2(d.cost)}</td>
                          <td className="px-3 py-2 text-right text-[#666]">{fmtNum(d.impressions)}</td>
                          <td className="px-3 py-2 text-right text-[#666]">{fmtNum(d.clicks)}</td>
                          <td className="px-3 py-2 text-right text-[#666]">{fmtPct(d.ctr)}</td>
                          <td className="px-3 py-2 text-right text-[#666]">{fmtKr2(d.cpc)}</td>
                          <td className="px-3 py-2 text-right text-[#666]">{d.conversions ? fmtNum(d.conversions) : '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-[#f0f0f0] bg-[#fafafa] font-semibold text-[#0a0a0a]">
                      <tr>
                        <td className="px-3 py-2">{series.length} dager</td>
                        <td className="px-3 py-2 text-right">{fmtKr(totals.cost)}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(totals.impressions)}</td>
                        <td className="px-3 py-2 text-right">{fmtNum(totals.clicks)}</td>
                        <td className="px-3 py-2 text-right text-[#bbb]">{fmtPct(totals.ctr)}</td>
                        <td className="px-3 py-2 text-right text-[#bbb]">{fmtKr2(totals.cpc)}</td>
                        <td className="px-3 py-2 text-right">{totals.conversions ? fmtNum(totals.conversions) : '–'}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Handlinger — mobil/nettbrett (under tabellen) */}
              <div className="flex lg:hidden items-center gap-2 mt-4">
                {lp && (
                  <a href={lp} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#faf6fe] text-[#8b5cf6] text-[12px] font-semibold hover:bg-[#f0e6fc] transition-colors">
                    <Globe className="w-3.5 h-3.5" /> Landingsside
                  </a>
                )}
                <a href={adUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-[#f6f4f1] text-[#555] text-[12px] font-semibold hover:bg-[#efeae3] transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" /> {ad.channel === 'google' ? 'Åpne i Google Ads' : 'Forhåndsvis annonsen'}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdsTable({ apiKey, period, channel, periodLabel, onOpenFilter }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [meta, setMeta] = useState({});
  const [sortKey, setSortKey] = useState('cost');
  const [sortDir, setSortDir] = useState('desc');
  const [statusF, setStatusF] = useState('all');
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState(null); // annonse valgt for daglig detalj-modal
  // Kanal styres av det globale filteret (én kilde til sannhet — ikke egne chips her)
  const chan = channel === 'both' ? 'all' : channel;

  const load = useCallback(async (force) => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({ key: apiKey, googlePeriod: period, metaPeriod: period });
      if (force) params.set('refresh', '1');
      const res = await fetch(`/api/admin/ads/table?${params.toString()}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke hente annonser');
      setRows(j.ads || []);
      setMeta({ google: j.google, meta: j.meta });
    } catch (e) { setErr(e.message); setRows([]); }
    setLoading(false);
  }, [apiKey, period]);
  useEffect(() => { load(); }, [load]);

  const base = (rows || []).filter((r) => {
    if (chan !== 'all' && r.channel !== chan) return false;
    if (q && !(`${r.name} ${r.campaign} ${r.adGroup}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  });
  const counts = {
    all: base.length,
    active: base.filter((r) => STATUS_ACTIVE(r.status)).length,
  };
  counts.paused = counts.all - counts.active;
  const filtered = base.filter((r) => {
    if (statusF === 'active' && !STATUS_ACTIVE(r.status)) return false;
    if (statusF === 'paused' && STATUS_ACTIVE(r.status)) return false;
    return true;
  });
  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'string' || typeof bv === 'string') return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    const an = av == null ? -Infinity : av, bn = bv == null ? -Infinity : bv;
    return sortDir === 'asc' ? (an - bn) : (bn - an);
  });
  // Livstidsrader holdes UTENFOR summene — ellers blandes historikk inn i perioden.
  const periodRows = filtered.filter((r) => r.statsScope !== 'lifetime');
  const totals = periodRows.reduce((t, r) => ({ cost: t.cost + (r.cost || 0), clicks: t.clicks + (r.clicks || 0), impressions: t.impressions + (r.impressions || 0), conversions: t.conversions + (r.conversions || 0) }), { cost: 0, clicks: 0, impressions: 0, conversions: 0 });

  const sortBtn = (key, label) => (
    <th className="px-3 py-2.5 text-right cursor-pointer select-none hover:text-[#0a0a0a] whitespace-nowrap" onClick={() => { if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc'); } }}>
      <span className="inline-flex items-center gap-1">{label}{sortKey === key && <ArrowUpDown className="w-3 h-3 text-[#0a0a0a]" />}</span>
    </th>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 mb-4">
        <div className="flex items-center gap-2">
          {/* Kanal + periode styres av det globale filteret — én kilde til sannhet */}
          <button onClick={onOpenFilter} className="h-10 pl-3.5 pr-4 rounded-full bg-white text-[12.5px] font-semibold text-[#444] inline-flex items-center gap-2 shadow-sm ring-1 ring-[#eee] hover:ring-[#dcdcdc] active:scale-[0.97] transition-all">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#0a0a0a]" />
            <span className="text-[#777]">{channel === 'google' ? 'Google' : channel === 'meta' ? 'Meta' : 'Alle kanaler'}</span>
            <span className="text-[#ddd]">·</span>
            <span className="text-[#0a0a0a]">{periodLabel}</span>
          </button>
          <button onClick={() => load(true)} disabled={loading} title="Oppdater nå" className="sm:hidden h-10 w-10 rounded-full bg-white flex items-center justify-center shadow-sm ring-1 ring-[#eee] hover:ring-[#dcdcdc] disabled:opacity-40 ml-auto"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1 w-fit">
          {[['all', `Alle (${counts.all})`], ['active', `Aktive (${counts.active})`], ['paused', `Pauset (${counts.paused})`]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusF(v)} className={`px-3 h-8 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap ${statusF === v ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{l}</button>
          ))}
        </div>
        <div className="relative flex-1 sm:flex-none">
          <Search className="w-4 h-4 text-[#bbb] absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk annonse/kampanje…" className="h-10 pl-9 pr-3 rounded-full bg-white ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none focus:ring-[#dcdcdc] w-full sm:w-[220px]" />
        </div>
        {/* Sortering på mobil (desktop sorterer via kolonneoverskrifter) */}
        <select value={`${sortKey}:${sortDir}`} onChange={(e) => { const [k, d] = e.target.value.split(':'); setSortKey(k); setSortDir(d); }} className="sm:hidden h-10 px-3 rounded-full bg-white ring-1 ring-[#eee] text-[12.5px] font-semibold text-[#444] outline-none focus:ring-[#dcdcdc] appearance-none">
          <option value="cost:desc">Høyest kostnad</option>
          <option value="clicks:desc">Flest klikk</option>
          <option value="impressions:desc">Flest visninger</option>
          <option value="conversions:desc">Flest konverteringer</option>
          <option value="ctr:desc">Høyest CTR</option>
          <option value="roas:desc">Høyest ROAS</option>
          <option value="name:asc">Navn A–Å</option>
        </select>
        <button onClick={() => load(true)} disabled={loading} title="Oppdater nå" className="hidden sm:flex h-10 w-10 rounded-full bg-white items-center justify-center shadow-sm ring-1 ring-transparent hover:ring-[#dcdcdc] disabled:opacity-40 ml-auto"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Ingen annonser matcher filteret i denne perioden.</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
          {/* Mobil: kompakte kort */}
          <div className="sm:hidden divide-y divide-[#f4f4f4]">
            {sorted.map((r) => <MobileAdCard key={`m-${r.channel}-${r.id}`} r={r} apiKey={apiKey} onOpen={setDetail} />)}
            <div className="px-4 py-3 bg-[#fafafa] flex items-center justify-between text-[12px] font-semibold text-[#0a0a0a]">
              <span>{filtered.length} annonser</span>
              <span>{fmtKr(totals.cost)} · {fmtNum(totals.clicks)} klikk</span>
            </div>
          </div>
          {/* Desktop: full tabell */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead className="text-[#999] text-[11px] uppercase tracking-wide border-b border-[#f0f0f0]">
                <tr>
                  <th className="px-3 py-2.5 text-left">Annonse</th>
                  <th className="px-3 py-2.5 text-left">Status</th>
                  {sortBtn('cost', 'Kostnad')}
                  {sortBtn('impressions', 'Visn.')}
                  {sortBtn('clicks', 'Klikk')}
                  {sortBtn('ctr', 'CTR')}
                  {sortBtn('cpc', 'CPC')}
                  {sortBtn('conversions', 'Konv.')}
                  {sortBtn('cpa', 'CPA')}
                  {sortBtn('roas', 'ROAS')}
                  <th className="px-3 py-2.5 text-right">Åpne</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={`${r.channel}-${r.id}`} onClick={() => setDetail(r)} className="border-b border-[#f6f6f6] hover:bg-[#fafafa] cursor-pointer" title="Klikk for daglig utvikling">
                    <td className="px-3 py-2.5 max-w-[280px]">
                      <div className="flex items-center gap-2">{channelPill(r.channel)}<span className="font-semibold text-[#0a0a0a] truncate" title={r.name}>{r.name || '–'}</span></div>
                      <div className="text-[11px] text-[#aaa] truncate" title={`${r.campaign} · ${r.adGroup}`}>{r.campaign}{r.adGroup ? ` · ${r.adGroup}` : ''}</div>
                    </td>
                    <td className="px-3 py-2.5"><span className="inline-flex items-center gap-1.5 flex-wrap">{statusPill(r.status)}{scopeBadge(r.statsScope)}</span></td>
                    <td className="px-3 py-2.5 text-right font-semibold text-[#0a0a0a]">{fmtKr(r.cost)}</td>
                    <td className="px-3 py-2.5 text-right text-[#666]">{fmtNum(r.impressions)}</td>
                    <td className="px-3 py-2.5 text-right text-[#666]">{fmtNum(r.clicks)}</td>
                    <td className="px-3 py-2.5 text-right text-[#666]">{fmtPct(r.ctr)}</td>
                    <td className="px-3 py-2.5 text-right text-[#666]">{fmtKr2(r.cpc)}</td>
                    <td className="px-3 py-2.5 text-right text-[#666]">{r.conversions ? fmtNum(r.conversions) : '–'}</td>
                    <td className="px-3 py-2.5 text-right text-[#666]">{r.cpa != null ? fmtKr(r.cpa) : '–'}</td>
                    <td className={`px-3 py-2.5 text-right font-semibold ${roasColor(r.roas)}`}>{r.roas != null ? fmtX(r.roas) : '–'}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {(() => {
                        const { lp, adUrl } = adLinks(r, apiKey);
                        return (
                          <span className="inline-flex items-center gap-1">
                            {lp ? (
                              <a href={lp} target="_blank" rel="noopener noreferrer" title={`Åpne landingssiden: ${lp}`}
                                 className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#eee] text-[#8b5cf6] hover:border-[#c99df0] hover:bg-[#faf6fe]" onClick={(e) => e.stopPropagation()}>
                                <Globe className="w-3.5 h-3.5" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#f4f4f4] text-[#ddd]" title="Ingen landingsside-URL tilgjengelig"><Globe className="w-3.5 h-3.5" /></span>
                            )}
                            <a href={adUrl} target="_blank" rel="noopener noreferrer"
                               title={r.channel === 'google' ? 'Åpne annonsen i Google Ads' : 'Se annonsen (Meta-forhåndsvisning)'}
                               className="inline-flex items-center justify-center w-7 h-7 rounded-lg border border-[#eee] text-[#666] hover:border-[#0a0a0a] hover:text-[#0a0a0a]" onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          </span>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-[#f0f0f0] bg-[#fafafa] font-semibold text-[#0a0a0a]">
                <tr>
                  <td className="px-3 py-2.5" colSpan={2}>{filtered.length} annonser · sum for perioden</td>
                  <td className="px-3 py-2.5 text-right">{fmtKr(totals.cost)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(totals.impressions)}</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(totals.clicks)}</td>
                  <td className="px-3 py-2.5 text-right text-[#bbb]">–</td>
                  <td className="px-3 py-2.5 text-right text-[#bbb]">–</td>
                  <td className="px-3 py-2.5 text-right">{fmtNum(totals.conversions)}</td>
                  <td className="px-3 py-2.5 text-right text-[#bbb]">–</td>
                  <td className="px-3 py-2.5 text-right text-[#bbb]">–</td>
                  <td className="px-3 py-2.5 text-right text-[#bbb]">–</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      {!loading && sorted.some((r) => r.statsScope === 'lifetime') && (
        <p className="mt-2.5 text-[11.5px] text-[#999] leading-relaxed">Rader merket <span className="font-bold text-[#8b5cf6]">Livstid</span> hadde ingen aktivitet i valgt periode og viser i stedet samlede tall for hele annonsens levetid. Disse telles ikke med i period-summen nederst.</p>
      )}
      {detail && <AdDetailModal ad={detail} apiKey={apiKey} period={period} periodLabel={periodLabel} onClose={() => setDetail(null)} />}
      {meta.google && meta.google.error && <p className="mt-2 text-[11px] text-amber-600">Google: {meta.google.error}</p>}
      {meta.meta && meta.meta.error && <p className="mt-2 text-[11px] text-amber-600">Meta: {meta.meta.error}</p>}
    </div>
  );
}

// ===========================================================================
// Fase B–D: AI & optimalisering.
// ===========================================================================
const SEV = { high: { l: 'Høy', c: 'bg-rose-50 text-rose-700' }, medium: { l: 'Middels', c: 'bg-amber-50 text-amber-700' }, low: { l: 'Lav', c: 'bg-[#eef] text-[#5b5bd6]' } };
const REC_ICON = { add_negative: TrendingDown, pause_keyword: Pause, pause_ad: Pause, scale_budget: TrendingUp, ai_refresh: Wand2 };

function OptimizePanel({ apiKey }) {
  const [tab, setTab] = useState('recs');
  return (
    <div>
      <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1 mb-5 w-fit flex-wrap">
        {[['recs', 'Anbefalinger', ListChecks], ['keywords', 'Søkeord-research', Search], ['ai', 'AI-tekster', Wand2], ['report', 'Rapport & innstillinger', FileText]].map(([v, l, Icon]) => (
          <button key={v} onClick={() => setTab(v)} className={`px-3.5 h-9 rounded-full text-[12px] font-semibold inline-flex items-center gap-1.5 transition-all ${tab === v ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}><Icon className="w-3.5 h-3.5" />{l}</button>
        ))}
      </div>
      {tab === 'recs' && <RecommendationsPanel apiKey={apiKey} />}
      {tab === 'keywords' && <KeywordResearchPanel apiKey={apiKey} />}
      {tab === 'ai' && <AiCopyPanel apiKey={apiKey} />}
      {tab === 'report' && <ReportSettingsPanel apiKey={apiKey} />}
    </div>
  );
}

function RecommendationsPanel({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [applying, setApplying] = useState({});
  const [applied, setApplied] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/ads/recommendations?key=${encodeURIComponent(apiKey)}&period=last_30d`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke hente anbefalinger');
      setData(j);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  }, [apiKey]);
  useEffect(() => { load(); }, [load]);

  const apply = async (rec) => {
    setApplying((s) => ({ ...s, [rec.id]: true }));
    try {
      const res = await fetch(`/api/admin/ads/recommendations/apply?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recommendation: rec }) });
      const j = await res.json();
      setApplied((s) => ({ ...s, [rec.id]: j.ok ? 'ok' : (j.error || 'feil') }));
    } catch (e) { setApplied((s) => ({ ...s, [rec.id]: e.message })); }
    setApplying((s) => ({ ...s, [rec.id]: false }));
  };

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>;
  if (err) return <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err} <button onClick={load} className="ml-2 underline">Prøv igjen</button></div>;
  const recs = (data && data.recommendations) || [];
  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="text-[13px] text-[#666]"><b className="text-[#0a0a0a]">{recs.length}</b> anbefalinger · potensiell besparelse <b className="text-[#0a0a0a]">{fmtKr(data && data.estimatedSavings)}</b></div>
        <button onClick={load} className="h-9 px-3 rounded-full bg-white ring-1 ring-[#eee] text-[12px] font-semibold inline-flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5" /> Oppdater</button>
      </div>
      {recs.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />Ingen sløsing oppdaget — kontoen ser sunn ut.</div>
      ) : (
        <div className="space-y-2.5">
          {recs.map((r) => {
            const Icon = REC_ICON[r.type] || Lightbulb;
            const sev = SEV[r.severity] || SEV.low;
            const st = applied[r.id];
            const isAi = r.type === 'ai_refresh';
            return (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)] flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f4f0fb] flex items-center justify-center flex-shrink-0"><Icon className="w-4 h-4 text-[#7c5cff]" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[#0a0a0a] text-[13.5px]">{r.title}</span>
                    <span className={`text-[10.5px] font-bold px-1.5 py-0.5 rounded ${sev.c}`}>{sev.l}</span>
                    {channelPill(r.channel)}
                  </div>
                  <p className="text-[12.5px] text-[#777] mt-1 leading-relaxed">{r.rationale}</p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {r.type === 'info' ? (
                    <span className="text-[11px] text-sky-600 font-semibold inline-flex items-center gap-1"><Info className="w-3.5 h-3.5" /> Kontekst</span>
                  ) : st === 'ok' ? (
                    <span className="text-[12px] font-semibold text-emerald-600 inline-flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> Utført</span>
                  ) : isAi ? (
                    <span className="text-[11px] text-[#aaa]">Se «AI-tekster»</span>
                  ) : (
                    <button onClick={() => apply(r)} disabled={applying[r.id]} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform">{applying[r.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Bruk</button>
                  )}
                  {st && st !== 'ok' && <p className="text-[10.5px] text-rose-500 mt-1 max-w-[140px]">{st}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KeywordResearchPanel({ apiKey }) {
  const [seeds, setSeeds] = useState('leie ut bolig bergen, utleie bergen');
  const [ideas, setIdeas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const run = async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/ads/keyword-research?key=${encodeURIComponent(apiKey)}&seeds=${encodeURIComponent(seeds)}`);
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke hente søkeord');
      setIdeas(j.ideas || []);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  const COMP = { LOW: 'text-emerald-600', MEDIUM: 'text-amber-600', HIGH: 'text-rose-600' };
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input value={seeds} onChange={(e) => setSeeds(e.target.value)} placeholder="Frø-søkeord, kommaseparert…" className="h-10 px-4 rounded-full bg-white ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none focus:ring-[#dcdcdc] flex-1 min-w-[260px]" />
        <button onClick={run} disabled={loading} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Finn søkeord</button>
      </div>
      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px]">{err}</div>}
      {loading && <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>}
      {ideas && !loading && (
        ideas.length === 0 ? <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Ingen forslag.</div> : (
          <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead className="text-[#999] text-[11px] uppercase tracking-wide border-b border-[#f0f0f0]"><tr><th className="px-3 py-2.5 text-left">Søkeord</th><th className="px-3 py-2.5 text-right">Søk/mnd</th><th className="px-3 py-2.5 text-center">Konkurranse</th><th className="px-3 py-2.5 text-right">Budestimat (topp)</th></tr></thead>
                <tbody>{ideas.slice(0, 80).map((k, i) => (
                  <tr key={i} className="border-b border-[#f6f6f6] hover:bg-[#fafafa]"><td className="px-3 py-2.5 font-semibold text-[#0a0a0a]">{k.text}</td><td className="px-3 py-2.5 text-right text-[#666]">{fmtNum(k.avgMonthlySearches)}</td><td className={`px-3 py-2.5 text-center font-semibold ${COMP[k.competition] || 'text-[#999]'}`}>{k.competition === 'HIGH' ? 'Høy' : k.competition === 'MEDIUM' ? 'Middels' : k.competition === 'LOW' ? 'Lav' : '–'}</td><td className="px-3 py-2.5 text-right text-[#666]">{k.lowBid != null ? `${fmtKr2(k.lowBid)} – ${fmtKr2(k.highBid)}` : '–'}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        )
      )}
      {!ideas && !loading && <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Skriv inn frø-søkeord og finn nye muligheter i Bergen-markedet.</div>}
    </div>
  );
}

function AiCopyPanel({ apiKey }) {
  const [kind, setKind] = useState('rsa');
  const [theme, setTheme] = useState('Utleie i Bergen');
  const [out, setOut] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');
  const run = async () => {
    setLoading(true); setErr(''); setOut(null);
    try {
      const res = await fetch(`/api/admin/ads/ai/generate?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, theme }) });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || 'AI-generering feilet');
      setOut(j);
    } catch (e) { setErr(e.message); }
    setLoading(false);
  };
  const copy = (txt, id) => { try { navigator.clipboard.writeText(txt); setCopied(id); setTimeout(() => setCopied(''), 1200); } catch (_) {} };
  const Chip = ({ text, id }) => (
    <button onClick={() => copy(text, id)} className="text-left bg-[#f7f5f1] hover:bg-[#f1efeb] rounded-lg px-3 py-2 text-[12.5px] text-[#333] transition-colors inline-flex items-center justify-between gap-2 w-full">{text}<span className="text-[10px] text-[#aaa] flex-shrink-0">{copied === id ? 'Kopiert!' : 'Kopier'}</span></button>
  );
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1 bg-[#f1efeb] rounded-full p-1">
          {[['rsa', 'Google RSA'], ['meta', 'Meta']].map(([v, l]) => (<button key={v} onClick={() => setKind(v)} className={`px-3 h-8 rounded-full text-[12px] font-semibold ${kind === v ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888]'}`}>{l}</button>))}
        </div>
        <input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Tema / vinkling…" className="h-10 px-4 rounded-full bg-white ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none focus:ring-[#dcdcdc] flex-1 min-w-[220px]" />
        <button onClick={run} disabled={loading} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />} Generer</button>
      </div>
      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px]">{err}</div>}
      {loading && <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>}
      {out && kind === 'rsa' && !loading && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><p className="font-semibold text-[#0a0a0a] text-[13px] mb-2">Titler ({(out.headlines || []).length})</p><div className="space-y-1.5">{(out.headlines || []).map((h, i) => <Chip key={i} text={h} id={`h${i}`} />)}</div></div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><p className="font-semibold text-[#0a0a0a] text-[13px] mb-2">Beskrivelser ({(out.descriptions || []).length})</p><div className="space-y-1.5">{(out.descriptions || []).map((d, i) => <Chip key={i} text={d} id={`d${i}`} />)}</div></div>
        </div>
      )}
      {out && kind === 'meta' && !loading && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><p className="font-semibold text-[#0a0a0a] text-[13px] mb-2">Primærtekster</p><div className="space-y-1.5">{(out.primaryTexts || []).map((d, i) => <Chip key={i} text={d} id={`p${i}`} />)}</div></div>
          <div className="bg-white rounded-2xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]"><p className="font-semibold text-[#0a0a0a] text-[13px] mb-2">Overskrifter</p><div className="space-y-1.5">{(out.headlines || []).map((h, i) => <Chip key={i} text={h} id={`mh${i}`} />)}</div></div>
        </div>
      )}
      {!out && !loading && <div className="bg-white rounded-2xl p-10 text-center text-[#999] text-[13px] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">Generer ferske annonsetekster i DigiHome-stemmen. Klikk en tekst for å kopiere.</div>}
    </div>
  );
}

function OptField({ label, value, onSave }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <div>
      <label className="text-[11px] text-[#999]">{label}</label>
      <div className="flex items-center gap-1.5 mt-1">
        <input type="number" value={v} onChange={(e) => setV(e.target.value)} className="h-9 px-3 rounded-lg bg-[#faf9f7] ring-1 ring-[#eee] text-[12.5px] text-[#0a0a0a] outline-none focus:ring-[#dcdcdc] w-full" />
        <button onClick={() => onSave(Number(v))} className="h-9 w-9 rounded-lg bg-[#0a0a0a] text-white flex items-center justify-center flex-shrink-0"><Save className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

function ReportSettingsPanel({ apiKey }) {
  const [last, setLast] = useState(null);
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [savingCfg, setSavingCfg] = useState(false);
  const [err, setErr] = useState('');
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMsg, setReportMsg] = useState(null);

  const sendReport = async () => {
    setSendingReport(true); setReportMsg(null);
    try {
      const res = await fetch(`/api/admin/ads/report/send?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const j = await res.json();
      setReportMsg(j.ok ? { ok: true, text: `Sendt til ${(j.recipients || []).join(', ')}` } : { ok: false, text: j.error || 'Sending feilet' });
    } catch (e) { setReportMsg({ ok: false, text: e.message }); }
    setSendingReport(false);
  };
  const previewReport = () => { window.open(`/api/admin/ads/report/preview?key=${encodeURIComponent(apiKey)}`, '_blank'); };

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await fetch(`/api/admin/ads/optimize/last?key=${encodeURIComponent(apiKey)}`); const j = await res.json(); if (j.ok) { setLast(j.run); setCfg(j.config); } }
    catch (e) { setErr(e.message); }
    setLoading(false);
  }, [apiKey]);
  useEffect(() => { load(); }, [load]);

  const runNow = async () => {
    setRunning(true); setErr('');
    try { const res = await fetch(`/api/admin/ads/optimize/run?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'weekly', dryRun: true }) }); const j = await res.json(); if (!j.ok) throw new Error(j.error || 'Kjøring feilet'); setLast(j.run); }
    catch (e) { setErr(e.message); }
    setRunning(false);
  };
  const saveCfg = async (patch) => {
    setSavingCfg(true);
    try { const res = await fetch(`/api/admin/ads/optimize/config?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: patch }) }); const j = await res.json(); if (j.ok) setCfg(j.config); }
    catch (e) { setErr(e.message); }
    setSavingCfg(false);
  };

  if (loading) return <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>;
  return (
    <div className="space-y-5">
      {err && <div className="bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px]">{err}</div>}
      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-[#0a0a0a] text-[14px]">Ukentlig optimaliserings-kjøring</p>
            <p className="text-[12px] text-[#999] mt-0.5">Henter data, bygger anbefalinger, keyword research + AI-rapport. {last && last.at ? `Sist kjørt ${minsAgo(last.at)}.` : 'Aldri kjørt ennå.'}</p>
          </div>
          <button onClick={runNow} disabled={running} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform">{running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />} Kjør nå</button>
        </div>
        {last && last.summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
            {[['Anbefalinger', last.summary.totalRecommendations], ['Est. besparelse', fmtKr(last.summary.estimatedSavings)], ['Søkeordideer', last.summary.keywordIdeas], ['Auto-utført', last.summary.autoApplied]].map(([l, v], i) => (
              <div key={i} className="bg-[#faf9f7] rounded-xl p-3"><p className="text-[11px] text-[#999]">{l}</p><p className="text-[16px] font-bold text-[#0a0a0a]">{v}</p></div>
            ))}
          </div>
        )}
      </div>
      {last && Array.isArray(last.alerts) && last.alerts.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="font-semibold text-[#0a0a0a] text-[14px] mb-3 inline-flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> Varsler ({last.alerts.length})</p>
          <div className="space-y-2">
            {last.alerts.map((al) => (
              <div key={al.id} className="rounded-xl px-4 py-3 bg-[#fafafa]" style={{ borderLeft: `3px solid ${al.severity === 'high' ? '#dc2626' : al.severity === 'medium' ? '#d97706' : '#7c5cff'}` }}>
                <p className="text-[13px] font-semibold text-[#0a0a0a]">{al.title}</p>
                <p className="text-[12px] text-[#777] mt-0.5 leading-relaxed">{al.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="font-semibold text-[#0a0a0a] text-[14px] inline-flex items-center gap-2"><FileText className="w-4 h-4" /> Ukentlig management-rapport (e-post)</p>
            <p className="text-[12px] text-[#999] mt-0.5">Sendes automatisk ukentlig via cron. KPI-er, varsler, topp/bunn-annonser og anbefalinger.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={previewReport} className="h-10 px-4 rounded-full bg-white ring-1 ring-[#eee] text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:ring-[#dcdcdc]"><ExternalLink className="w-4 h-4" /> Forhåndsvis</button>
            <button onClick={sendReport} disabled={sendingReport} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1.5 active:scale-[0.97] transition-transform">{sendingReport ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />} Send testrapport</button>
          </div>
        </div>
        {reportMsg && <p className={`text-[12px] mt-3 ${reportMsg.ok ? 'text-emerald-600' : 'text-rose-500'}`}>{reportMsg.ok ? '✓ ' : ''}{reportMsg.text}</p>}
      </div>

      {last && last.report && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="font-semibold text-[#0a0a0a] text-[14px] mb-3 inline-flex items-center gap-2"><FileText className="w-4 h-4" /> AI-ukerapport</p>
          <div className="text-[13px] text-[#444] whitespace-pre-wrap leading-relaxed">{last.report}</div>
        </div>
      )}
      {cfg && (
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="font-semibold text-[#0a0a0a] text-[14px] mb-1 inline-flex items-center gap-2"><Settings2 className="w-4 h-4" /> Auto-optimalisering (vakter)</p>
          <p className="text-[12px] text-[#999] mb-4">Som standard <b>av</b> — anbefalinger krever manuell godkjenning. Skru på for å la systemet utføre trygge handlinger automatisk ved cron-kjøring.</p>
          <label className="flex items-center justify-between py-2 border-b border-[#f3f3f3]">
            <span className="text-[13px] text-[#333]">Auto-utfør anbefalinger</span>
            <button onClick={() => saveCfg({ autoApply: !cfg.autoApply })} disabled={savingCfg} className={`relative w-11 h-6 rounded-full transition-colors ${cfg.autoApply ? 'bg-emerald-500' : 'bg-[#ddd]'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${cfg.autoApply ? 'left-[22px]' : 'left-0.5'}`} /></button>
          </label>
          <div className="grid grid-cols-2 gap-3 mt-3">
            <OptField label="Sløsing-grense annonse (kr)" value={cfg.wasteAdCost} onSave={(v) => saveCfg({ wasteAdCost: v })} />
            <OptField label="Negativ-grense søketerm (kr)" value={cfg.negativeTermCost} onSave={(v) => saveCfg({ negativeTermCost: v })} />
            <OptField label="Skaler ved ROAS ≥" value={cfg.scaleRoas} onSave={(v) => saveCfg({ scaleRoas: v })} />
            <OptField label="Maks auto-handlinger" value={cfg.maxAutoActions} onSave={(v) => saveCfg({ maxAutoActions: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Budsjett-pacing + varsler — «kontrollrom»-rad øverst i statistikkvisningen.
   ========================================================================== */
function PacingAlertsRow({ apiKey }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4 mb-6">
      <PacingCard apiKey={apiKey} />
      <AlertsCard apiKey={apiKey} />
    </div>
  );
}

function paceTone(pct) {
  if (pct == null) return { bar: 'bg-[#d8d2e8]', text: 'text-[#999]' };
  if (pct <= 95) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
  if (pct <= 110) return { bar: 'bg-amber-500', text: 'text-amber-600' };
  return { bar: 'bg-rose-500', text: 'text-rose-600' };
}

function PacingCard({ apiKey }) {
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [gBudget, setGBudget] = useState('');
  const [mBudget, setMBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/ads/pacing?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (j.ok) {
        setData(j);
        setGBudget(String(j.channels.google.budget || ''));
        setMBudget(String(j.channels.meta.budget || ''));
      }
    } catch (e) {}
  }, [apiKey]);
  useEffect(() => { if (apiKey) load(); }, [apiKey, load]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/ads/pacing?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ monthlyBudgetGoogle: Number(gBudget) || 0, monthlyBudgetMeta: Number(mBudget) || 0 }),
      });
      setEditing(false);
      await load();
    } finally { setSaving(false); }
  };

  const monthName = data ? new Date(`${data.month}-01T12:00:00Z`).toLocaleString('nb-NO', { month: 'long', year: 'numeric' }) : '';
  const hasBudget = data && (data.channels.google.budget > 0 || data.channels.meta.budget > 0);

  return (
    <div className="rounded-3xl p-5 bg-white ring-1 ring-[#ececec] shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#f6f4f1] flex items-center justify-center"><Gauge className="w-4 h-4 text-[#0a0a0a]" /></span>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#555]">Budsjett-pacing</h3>
          {data && <span className="text-[11.5px] text-[#aaa] font-medium capitalize">{monthName} · dag {data.dayOfMonth}/{data.daysInMonth}</span>}
        </div>
        <button onClick={() => setEditing((e) => !e)} title="Sett månedsbudsjett" className="h-8 w-8 rounded-lg flex items-center justify-center text-[#aaa] hover:text-[#0a0a0a] hover:bg-[#f5f4f2] transition-colors">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {!data ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#ccc]" /></div>
      ) : editing ? (
        <div className="space-y-3">
          <p className="text-[12px] text-[#888]">Sett månedsbudsjett per kanal (kr) — prognosen beregnes fra forbruket så langt + snitt siste 7 dager.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#999]">Google / mnd</span>
              <input value={gBudget} onChange={(e) => setGBudget(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="f.eks. 5000"
                className="mt-1 w-full h-10 px-3 rounded-lg border border-[#e5e5ea] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[#999]">Meta / mnd</span>
              <input value={mBudget} onChange={(e) => setMBudget(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" placeholder="f.eks. 8000"
                className="mt-1 w-full h-10 px-3 rounded-lg border border-[#e5e5ea] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50" />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={saving} className="h-9 px-4 rounded-lg bg-[#0a0a0a] text-white text-[12.5px] font-semibold disabled:opacity-50 flex items-center gap-1.5">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />} Lagre
            </button>
            <button onClick={() => setEditing(false)} className="h-9 px-3 rounded-lg text-[12.5px] font-medium text-[#888] hover:bg-[#f5f4f2]">Avbryt</button>
          </div>
        </div>
      ) : !hasBudget ? (
        <div className="py-4 text-center">
          <p className="text-[13px] text-[#999]">Ingen månedsbudsjett satt ennå.</p>
          <button onClick={() => setEditing(true)} className="mt-2 h-9 px-4 rounded-lg bg-[#0a0a0a] text-white text-[12.5px] font-semibold inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Sett budsjett
          </button>
          {data.channels.total.mtd > 0 && <p className="text-[11.5px] text-[#bbb] mt-2.5">Forbruk denne måneden så langt: <b className="text-[#555]">{fmtKr(data.channels.total.mtd)}</b></p>}
        </div>
      ) : (
        <div className="space-y-3.5">
          {[['Google', data.channels.google, '#4285F4'], ['Meta', data.channels.meta, '#0866FF'], ['Totalt', data.channels.total, '#0a0a0a']].map(([label, ch, color]) => {
            if (label !== 'Totalt' && !(ch.budget > 0) && !(ch.mtd > 0)) return null;
            const tone = paceTone(ch.pacePct);
            const spentW = ch.budget > 0 ? Math.min(100, Math.round((ch.mtd / ch.budget) * 100)) : 0;
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-[12px] mb-1">
                  <span className="font-semibold" style={{ color }}>{label}</span>
                  <span className="text-[#888]">
                    {fmtKr(ch.mtd)}{ch.budget > 0 ? <> / {fmtKr(ch.budget)}</> : null}
                    {ch.pacePct != null && <b className={`ml-2 ${tone.text}`}>→ {fmtKr(ch.projected)} ({ch.pacePct}%)</b>}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#f1efeb] overflow-hidden relative">
                  <div className={`h-full rounded-full ${tone.bar} transition-all`} style={{ width: `${spentW}%` }} />
                  {/* «Der du burde vært»-markør (lineær pace) */}
                  {ch.budget > 0 && <div className="absolute top-[-2px] bottom-[-2px] w-[2px] bg-[#0a0a0a]/30" style={{ left: `${Math.min(100, Math.round((data.dayOfMonth / data.daysInMonth) * 100))}%` }} title="Lineær pace i dag" />}
                </div>
              </div>
            );
          })}
          <p className="text-[11px] text-[#b5b5b5] pt-0.5">→ = prognose ved månedsslutt (forbruk + snitt siste 7 dager × gjenstående dager). Markøren viser lineær pace i dag.</p>
        </div>
      )}
    </div>
  );
}

const SEV_STYLE = {
  high: 'bg-rose-50 text-rose-600 ring-rose-100',
  medium: 'bg-amber-50 text-amber-600 ring-amber-100',
  low: 'bg-[#f2f2f4] text-[#888] ring-[#e8e8ec]',
};
const SEV_LABEL = { high: 'Kritisk', medium: 'Middels', low: 'Lav' };

function AlertsCard({ apiKey }) {
  const [data, setData] = useState(null);
  const [loadingA, setLoadingA] = useState(true);

  useEffect(() => {
    if (!apiKey) return;
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`/api/admin/ads/alerts?key=${encodeURIComponent(apiKey)}`);
        const j = await r.json();
        if (alive) setData(j);
      } catch (e) { if (alive) setData({ ok: false }); }
      finally { if (alive) setLoadingA(false); }
    })();
    return () => { alive = false; };
  }, [apiKey]);

  const alerts = (data && data.alerts) || [];

  return (
    <div className="rounded-3xl p-5 bg-white ring-1 ring-[#ececec] shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#f6f4f1] flex items-center justify-center"><BellRing className="w-4 h-4 text-[#0a0a0a]" /></span>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#555]">Varsler</h3>
        </div>
        {data && data.window && <span className="text-[11.5px] text-[#aaa] font-medium">{data.window.current.from} – {data.window.current.to} vs. uken før</span>}
      </div>
      {loadingA ? (
        <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-[#ccc]" /></div>
      ) : alerts.length === 0 ? (
        <div className="py-6 text-center">
          <span className="inline-flex w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mb-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /></span>
          <p className="text-[13px] font-semibold text-[#333]">Ingen varsler — alt ser bra ut</p>
          <p className="text-[11.5px] text-[#aaa] mt-1">Overvåker annonsetretthet (Meta-frekvens), CPA-hopp og CTR-fall uke-mot-uke.</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
          {alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-xl bg-[#fafafa] p-3">
              <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold ring-1 ${SEV_STYLE[a.severity] || SEV_STYLE.low}`}>{SEV_LABEL[a.severity] || a.severity}</span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#111] leading-snug">{a.title}</p>
                <p className="text-[12px] text-[#888] mt-0.5 leading-relaxed">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-[11px] text-[#b5b5b5] mt-3 flex items-center gap-1.5"><Info className="w-3 h-3" /> Kritiske varsler e-postes automatisk (maks 1 gang per varsel per døgn) via cron-jobben.</p>
    </div>
  );
}

/* ==========================================================================
   «Verifiser sporing» — én-klikks helsesjekk av closed-loop (CAPI/Google/GA4).
   ========================================================================== */
function VerifyRow({ ok, warn, label, detail }) {
  const Icon = ok ? CheckCircle2 : warn ? AlertCircle : X;
  const tone = ok ? 'text-emerald-600' : warn ? 'text-amber-600' : 'text-rose-500';
  return (
    <div className="flex items-start gap-3 rounded-xl bg-[#fafafa] p-3.5">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${tone}`} />
      <div className="min-w-0">
        <p className="text-[13.5px] font-semibold text-[#111]">{label}</p>
        {detail && <p className="text-[12px] text-[#888] mt-0.5 leading-relaxed break-words">{detail}</p>}
      </div>
    </div>
  );
}

function TrackingVerifyModal({ apiKey, open, onClose }) {
  const [res, setRes] = useState(null);
  const [running, setRunning] = useState(false);
  const [tec, setTec] = useState('');

  const run = useCallback(async (testEventCode) => {
    setRunning(true);
    try {
      const qp = testEventCode ? `&testEventCode=${encodeURIComponent(testEventCode)}` : '';
      const r = await fetch(`/api/admin/tracking/verify?key=${encodeURIComponent(apiKey)}${qp}`);
      setRes(await r.json());
    } catch (e) { setRes({ ok: false, error: e.message }); }
    finally { setRunning(false); }
  }, [apiKey]);

  useEffect(() => { if (open && !res && !running) run(''); }, [open]); // eslint-disable-line

  if (!open) return null;
  const s = (res && res.summary) || {};
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative w-full max-w-[520px] max-h-[85vh] overflow-y-auto rounded-3xl bg-white shadow-2xl p-6">
        <button onClick={onClose} aria-label="Lukk" className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#f5f4f2] flex items-center justify-center text-[#666] hover:bg-[#eceae6]"><X className="w-4 h-4" /></button>
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center"><ShieldCheck className="w-5 h-5 text-emerald-600" /></span>
          <div>
            <h3 className="text-[16px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Verifiser sporing</h3>
            <p className="text-[12px] text-[#999]">Closed-loop: Meta CAPI · Google offline-konvertering · GA4</p>
          </div>
        </div>

        {running && !res ? (
          <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>
        ) : res ? (
          <div className="mt-5 space-y-2.5">
            <VerifyRow
              ok={!!(res.meta && res.meta.verified)}
              warn={!!(res.meta && res.meta.configured && !res.meta.verified)}
              label={`Meta CAPI ${res.meta && res.meta.pixelId ? `· pixel ${res.meta.pixelId}` : ''}`}
              detail={res.meta && res.meta.verified
                ? 'Test-Lead + test-Purchase sendt og godkjent (synlig i Test events-fanen).'
                : (res.meta && res.meta.error) || (res.meta && res.meta.configured ? 'Konfigurert. Kjør full test med testEventCode for å sende trygge test-hendelser.' : 'Ikke konfigurert (META_CAPI_ACCESS_TOKEN mangler).')}
            />
            <VerifyRow
              ok={!!(res.google && res.google.verified)}
              warn={!!(res.google && res.google.configured && !res.google.verified)}
              label="Google offline-konvertering (dry-run)"
              detail={res.google && res.google.verified
                ? 'OAuth + konverteringshandling + format validert (validateOnly — ingenting registrert).'
                : (res.google && res.google.error) || (res.google && res.google.configured ? 'Konfigurert, men dry-run feilet.' : 'Ikke konfigurert.')}
            />
            <VerifyRow
              ok={!!(res.ga4 && res.ga4.configured)}
              warn={!!(res.ga4 && res.ga4.measurementId && !res.ga4.apiSecret)}
              label={`GA4 Measurement Protocol ${res.ga4 && res.ga4.measurementId ? `· ${res.ga4.measurementId}` : ''}`}
              detail={(res.ga4 && res.ga4.note) || (res.ga4 && res.ga4.configured ? 'Klar for server-side purchase-events ved «vunnet».' : 'Ikke konfigurert.')}
            />

            <div className={`rounded-xl p-3.5 text-[12.5px] font-semibold flex items-center gap-2 ${s.allGreen ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {s.allGreen ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {s.allGreen ? 'Hele sporingskjeden er verifisert — closed-loop fungerer.' : 'Delvis verifisert — se punktene over.'}
            </div>

            {/* Full Meta-test med testEventCode */}
            {res.meta && res.meta.configured && !res.meta.verified && (
              <div className="rounded-xl border border-[#eee] p-3.5">
                <p className="text-[12px] text-[#888] leading-relaxed">Full Meta-test: lim inn <b>testEventCode</b> fra Meta Events Manager → Test events (f.eks. TEST1234). Hendelsene vises kun i test-fanen — påvirker ikke ekte data.</p>
                <div className="flex items-center gap-2 mt-2">
                  <input value={tec} onChange={(e) => setTec(e.target.value.trim())} placeholder="TEST1234"
                    className="flex-1 h-9 px-3 rounded-lg border border-[#e5e5ea] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50" />
                  <button onClick={() => tec && run(tec)} disabled={running || !tec} className="h-9 px-3.5 rounded-lg bg-[#0a0a0a] text-white text-[12px] font-semibold disabled:opacity-40 flex items-center gap-1.5">
                    {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />} Kjør full test
                  </button>
                </div>
              </div>
            )}

            <button onClick={() => run(tec)} disabled={running} className="w-full h-10 rounded-xl border border-[#e5e5ea] text-[12.5px] font-semibold text-[#333] hover:bg-[#f7f7f8] flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} /> Kjør på nytt
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
