'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Upload, Megaphone, TrendingUp, AlertCircle, Trash2,
  Coins, MousePointerClick, Target, Wallet, CheckCircle2, Info, RefreshCw, Layers, Link2 as LinkIcon,
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
  // Meta (nær-sanntid, auto)
  const [metaPeriod, setMetaPeriod] = useState('last_30d');
  const [metaRefreshing, setMetaRefreshing] = useState(false);
  const metaPeriodRef = useRef('last_30d');
  // Google Ads via Composio (nær-sanntid, auto)
  const [googleConnecting, setGoogleConnecting] = useState(false);
  const [googlePeriod, setGooglePeriod] = useState('last_30d');
  const [googleRefreshing, setGoogleRefreshing] = useState(false);
  const googlePeriodRef = useRef('last_30d');
  const fileRef = useRef(null);

  const load = useCallback(async (opts = {}) => {
    const { importId } = opts;
    const gp = opts.googlePeriod || googlePeriodRef.current;
    const mp = opts.metaPeriod || metaPeriodRef.current;
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams({ key: apiKey });
      if (importId) params.set('importId', importId);
      params.set('googlePeriod', gp);
      params.set('metaPeriod', mp);
      if (opts.googleRefresh) params.set('googleRefresh', '1');
      if (opts.metaRefresh) params.set('metaRefresh', '1');
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
      load({ googleRefresh: true });
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

  const changeGooglePeriod = (v) => { setGooglePeriod(v); googlePeriodRef.current = v; load({ googlePeriod: v }); };
  const refreshGoogle = async () => { setGoogleRefreshing(true); setImportMsg(''); await load({ googleRefresh: true }); setGoogleRefreshing(false); };
  const changeMetaPeriod = (v) => { setMetaPeriod(v); metaPeriodRef.current = v; load({ metaPeriod: v }); };
  const refreshMeta = async () => { setMetaRefreshing(true); setImportMsg(''); await load({ metaRefresh: true }); setMetaRefreshing(false); };

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
      {/* Verktøylinje */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#cf97fc]" />
          <h2 className="text-[18px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Annonser</h2>
          <button onClick={() => setShowHelp((s) => !s)} className="ml-1 text-[#aaa] hover:text-[#8b5cf6]" aria-label="Hjelp"><Info className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {importMsg && <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {importMsg}</span>}
          {/* Google Ads (Composio) — auto live: periode-filter + oppdater, eller koble til */}
          {data && data.googleConfigured && (
            data.googleConnected ? (
              <div className="flex items-center gap-1.5">
                <select value={googlePeriod} onChange={(e) => changeGooglePeriod(e.target.value)} className="h-9 rounded-full bg-white text-[12px] font-semibold text-[#555] px-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] outline-none focus:ring-2 focus:ring-[#4285F4]/30 cursor-pointer">
                  {GOOGLE_PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
                <button onClick={refreshGoogle} disabled={googleRefreshing || loading} title="Oppdater Google-data nå" className="h-9 w-9 rounded-full bg-white text-[#4285F4] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] disabled:opacity-40 active:scale-[0.95] transition-transform">
                  <RefreshCw className={`w-4 h-4 ${googleRefreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              <button onClick={doGoogleConnect} disabled={googleConnecting} className="h-9 px-4 rounded-full text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform" style={{ background: '#4285F4' }}>
                {googleConnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />} Koble til Google Ads
              </button>
            )
          )}
          {/* Meta-synk */}
          {data && data.metaConfigured && (
            <div className="flex items-center gap-1.5">
              <select value={metaPeriod} onChange={(e) => changeMetaPeriod(e.target.value)} className="h-9 rounded-full bg-white text-[12px] font-semibold text-[#555] px-3 shadow-[0_2px_10px_rgba(0,0,0,0.03)] outline-none focus:ring-2 focus:ring-[#1877F2]/30 cursor-pointer">
                {GOOGLE_PERIODS.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
              </select>
              <button onClick={refreshMeta} disabled={metaRefreshing || loading} title="Oppdater Meta-data nå" className="h-9 w-9 rounded-full bg-white text-[#1877F2] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.03)] disabled:opacity-40 active:scale-[0.95] transition-transform">
                <RefreshCw className={`w-4 h-4 ${metaRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current && fileRef.current.click()} disabled={importing} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Google Ads-CSV
          </button>
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
        <EmptyState onPick={() => fileRef.current && fileRef.current.click()} onMeta={data.metaConfigured ? refreshMeta : null} metaSyncing={metaRefreshing} />
      ) : (
        <>
          {/* Blandet total (Google + Meta) */}
          {bothSources && combined && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2.5">
                <Layers className="w-4 h-4 text-[#8b5cf6]" />
                <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-[#666]">Totalt · Google + Meta</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Kpi icon={Wallet} label="Total markedskost" value={fmtKr(combined.cost)} accent="text-[#0a0a0a]" highlight
                  sub={`Google ${fmtKr(combined.sources.google.cost)} · Meta ${fmtKr(combined.sources.meta.cost)}`} />
                <Kpi icon={Target} label="Leads totalt" value={fmtNum(combined.leads)} sub={combined.cpl != null ? `${fmtKr(combined.cpl)} CPL (blandet)` : 'CPL –'} />
                <Kpi icon={CheckCircle2} label="Vunne kunder" value={fmtNum(combined.won)} sub={combined.cpa != null ? `${fmtKr(combined.cpa)} CAC (blandet)` : 'CAC –'} accent="text-emerald-600" />
                <Kpi icon={TrendingUp} label="ROAS (blandet)" value={fmtX(combined.roas)} accent={roasColor(combined.roas)} highlight
                  sub={`Dekningsbidrag ${fmtKr(combined.profit)}`} />
              </div>
            </div>
          )}

          {/* Google-seksjon */}
          {google && (
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
          {meta ? (
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
              <button onClick={refreshMeta} disabled={metaRefreshing} className="h-10 px-5 rounded-full text-white text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform" style={{ background: '#1877F2' }}>
                {metaRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Prøv igjen
              </button>
            </div>
          ))}

          <p className="mt-4 text-[12px] text-[#999] leading-relaxed">
            CPL/CPA/ROAS kobler kostnad mot leads i kanalen <b>Betalt</b> (per kampanje via <code>utm_campaign</code>). Sett kontraktsverdi på vunne leads i Leads-fanen for presis ROAS. Auto-tagging (gclid/fbclid) gir ofte tom <code>utm_campaign</code> → bruk konto-totalene som fasit.
          </p>
        </>
      )}
    </div>
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
    <div className={`bg-white rounded-xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${highlight ? 'ring-1 ring-[#e8d9fb]' : ''}`}>
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
