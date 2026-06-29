'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Upload, Megaphone, TrendingUp, AlertCircle, Trash2,
  Coins, MousePointerClick, Target, Wallet, CheckCircle2, Info, RefreshCw, Layers, Link2 as LinkIcon,
  SlidersHorizontal, X, Check,
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
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#cf97fc] to-[#8b5cf6] flex items-center justify-center shadow-[0_6px_18px_rgba(139,92,246,0.28)]"><Megaphone className="w-5 h-5 text-white" /></div>
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
          <button onClick={openFilter} className="group h-10 pl-3.5 pr-4 rounded-full bg-white text-[12.5px] font-semibold text-[#444] flex items-center gap-2 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#e8d9fb] hover:shadow-[0_6px_20px_rgba(139,92,246,0.14)] active:scale-[0.97] transition-all">
            <SlidersHorizontal className="w-4 h-4 text-[#8b5cf6] group-hover:rotate-6 transition-transform" />
            <span className="hidden sm:inline text-[#777]">{channelLabel}</span>
            <span className="text-[#ddd] hidden sm:inline">·</span>
            <span className="text-[#0a0a0a]">{periodLabel}</span>
            {!filterIsDefault && <span className="ml-0.5 w-1.5 h-1.5 rounded-full bg-[#8b5cf6]" />}
          </button>
          <button onClick={refreshAll} disabled={refreshing || loading} title="Oppdater alle tall nå" className="h-10 w-10 rounded-full bg-white text-[#8b5cf6] flex items-center justify-center shadow-[0_2px_12px_rgba(0,0,0,0.05)] ring-1 ring-transparent hover:ring-[#e8d9fb] disabled:opacity-40 active:scale-[0.95] transition-all">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </div>
      </div>

      {showHelp && (
        <div className="mb-4 bg-[#f4f0fb] rounded-2xl p-4 text-[13px] text-[#444] leading-relaxed">
          <p className="font-semibold text-[#0a0a0a] mb-1">Multi-kanal annonseøkonomi</p>
          <p><b>Google (live):</b> trykk «Koble til Google Ads» én gang og logg inn med Google-kontoen. Deretter hentes kostnad/klikk/visninger <b>automatisk</b> (nær-sanntid, hentes på nytt hvert ~10. minutt). <b>Meta:</b> hentes også <b>automatisk</b> live fra Facebook/Instagram. For begge: velg periode i nedtrekksmenyen (inkl. «Hele tiden») eller trykk oppdater-ikonet ↻ for ferske tall nå. Vi kobler kostnaden mot leads og vunne kontrakter for å regne ut CPL, CPA og ROAS — per kanal og <b>blandet (Google + Meta)</b>.</p>
          <p className="mt-1.5 text-[12px] text-[#777]">ROAS/CPA bruker «Vunnet»-verdien fra closed-loop. Meta-leads gjenkjennes på <code>fbclid</code> / kilde (facebook/instagram). «Google Ads-CSV» finnes fortsatt som manuelt alternativ.</p>
        </div>
      )}

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#cf97fc]" /></div>
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
            <div className="mb-6 rounded-3xl p-5 sm:p-6 bg-gradient-to-br from-[#faf7ff] via-white to-[#f6f9ff] ring-1 ring-[#efe9f9] shadow-[0_4px_28px_rgba(120,80,200,0.06)]">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center"><Layers className="w-4 h-4 text-[#8b5cf6]" /></span>
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
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#cf97fc] to-[#8b5cf6] flex items-center justify-center shadow-[0_6px_18px_rgba(139,92,246,0.28)]"><SlidersHorizontal className="w-4 h-4 text-white" /></div>
                <div>
                  <h3 className="text-[17px] font-bold text-[#0a0a0a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Filter</h3>
                  <p className="text-[11.5px] text-[#999]">Velg kanal og tidsperiode</p>
                </div>
              </div>
              <button onClick={() => setShowFilter(false)} className="w-8 h-8 rounded-full hover:bg-[#f4f0fb] text-[#999] hover:text-[#8b5cf6] flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
            </div>

            <p className="text-[10.5px] uppercase tracking-[0.08em] text-[#b3b3b3] font-bold mb-2.5">Kanal</p>
            <div className="grid grid-cols-1 gap-2 mb-6">
              <ChannelCard active={draftChannel === 'both'} onClick={() => setDraftChannel('both')} icon={Layers} iconBg="linear-gradient(135deg,#cf97fc,#8b5cf6)" title="Begge kanaler" desc="Google + Meta samlet, inkl. blandet ROAS" />
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
              <button onClick={applyFilter} className="flex-1 h-12 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#cf97fc] text-white text-[14px] font-bold shadow-[0_12px_30px_rgba(139,92,246,0.32)] active:scale-[0.98] transition-transform inline-flex items-center justify-center gap-2"><Check className="w-4 h-4" /> Bruk filter</button>
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
        <div style={{ width: `${g}%`, background: '#4285F4' }} className="transition-all duration-500" />
        <div style={{ width: `${m}%`, background: '#1877F2' }} className="transition-all duration-500" />
      </div>
      <div className="flex justify-between mt-2 text-[11.5px] text-[#888]">
        <span className="inline-flex items-center gap-1.5 font-medium"><span className="w-2 h-2 rounded-full" style={{ background: '#4285F4' }} /> Google {g}%</span>
        <span className="inline-flex items-center gap-1.5 font-medium">Meta {m}% <span className="w-2 h-2 rounded-full" style={{ background: '#1877F2' }} /></span>
      </div>
    </div>
  );
}

function ChannelCard({ active, onClick, icon: Icon, badge, iconBg, title, desc }) {
  return (
    <button onClick={onClick} className={`relative w-full text-left rounded-2xl p-3.5 flex items-center gap-3 transition-all active:scale-[0.99] ${active ? 'bg-[#faf7ff] ring-2 ring-[#8b5cf6] shadow-[0_8px_24px_rgba(139,92,246,0.13)]' : 'bg-white ring-1 ring-[#ececec] hover:ring-[#dcdcdc]'}`}>
      <span className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[15px] shrink-0" style={{ background: iconBg }}>
        {Icon ? <Icon className="w-5 h-5" /> : badge}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-[#0a0a0a]">{title}</span>
        <span className="block text-[11.5px] text-[#999] truncate">{desc}</span>
      </span>
      <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-all ${active ? 'bg-[#8b5cf6] scale-100' : 'bg-[#f0f0f0] scale-90'}`}>
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
    <div className={`bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.07)] hover:-translate-y-0.5 transition-all duration-200 ${highlight ? 'ring-1 ring-[#e8d9fb]' : ''}`}>
      <p className="text-[11px] uppercase tracking-[0.06em] text-[#aaa] font-semibold flex items-center gap-1.5"><Icon className="w-3.5 h-3.5 text-[#cf97fc]" /> {label}</p>
      <p className={`text-[22px] font-bold mt-1 ${accent}`} style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub && <p className="text-[11.5px] text-[#999] mt-0.5">{sub}</p>}
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
