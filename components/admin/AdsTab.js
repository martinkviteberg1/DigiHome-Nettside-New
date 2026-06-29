'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Upload, Megaphone, TrendingUp, AlertCircle, Trash2,
  Coins, MousePointerClick, Target, Wallet, CheckCircle2, Info, RefreshCw, Layers, Link2 as LinkIcon,
  SlidersHorizontal, X, Check, Image as ImageIcon, ExternalLink,
} from 'lucide-react';

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
        {[['stats', 'Statistikk'], ['creatives', 'Annonser & kampanjer']].map(([v, l]) => (
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

      {view === 'creatives' ? (
        <CreativesGallery data={creatives} loading={loadingCre} err={creErr} channel={channel} onRetry={() => loadCreatives(true)} />
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

          {/* Utvikling over tid — daglig tidsserie */}
          {Array.isArray(data.series) && data.series.length > 0 && (
            <TrendChart series={data.series} channel={channel} metric={chartMetric} onMetric={setChartMetric} periodLabel={periodLabel} />
          )}

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
          <div className={`relative w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-[0_30px_90px_rgba(0,0,0,0.28)] p-6 sm:p-7 transition-all duration-300 ${filterMounted ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-8 sm:translate-y-2 sm:scale-95'}`}>
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

function CreativesGallery({ data, loading, err, channel, onRetry }) {
  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#0a0a0a]" /></div>;
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
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md text-white text-[12px] font-bold" style={{ background: '#1877F2' }}>f</span>
            <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Meta-annonser</h3>
            <span className="text-[11.5px] text-[#aaa]">{mAds.length} stk · Facebook &amp; Instagram</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mAds.map((ad) => <MetaAdCard key={ad.id} ad={ad} />)}
          </div>
        </section>
      )}

      {showGoogle && gAds.length > 0 && (
        <section className="mb-4">
          <div className="flex items-center gap-2 mb-3.5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-white ring-1 ring-[#e6e6e6] text-[13px] font-bold" style={{ color: '#4285F4' }}>G</span>
            <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Google-søkeannonser</h3>
            <span className="text-[11.5px] text-[#aaa]">{gAds.length} stk · Søkenettverk</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {gAds.map((ad) => <GoogleAdCard key={ad.id} ad={ad} />)}
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
