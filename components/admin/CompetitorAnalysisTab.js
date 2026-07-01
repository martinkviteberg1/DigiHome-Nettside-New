'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, Search, Crosshair, TrendingUp, Wallet, Layers, AlertCircle,
  ExternalLink, Eye, Tag, Gauge, Sparkles, Info,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const fmtVol = (n) => (n == null ? '–' : nf.format(Math.round(n)));
const fmtKr = (n) => (n == null ? '–' : `${nf.format(Math.round(n * 10) / 10)} kr`);

const COMP = {
  HIGH: { l: 'Høy', cls: 'bg-rose-50 text-rose-600' },
  MEDIUM: { l: 'Middels', cls: 'bg-amber-50 text-amber-600' },
  LOW: { l: 'Lav', cls: 'bg-emerald-50 text-emerald-600' },
  UNKNOWN: { l: '–', cls: 'bg-[#f3f2f0] text-[#999]' },
};

export default function CompetitorAnalysisTab({ apiKey }) {
  const [competitor, setCompetitor] = useState('Utleiemegleren');
  const [input, setInput] = useState('Utleiemegleren');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async (name) => {
    const c = (name || competitor || 'Utleiemegleren').trim();
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/ads/competitor-analysis?key=${encodeURIComponent(apiKey)}&competitor=${encodeURIComponent(c)}`);
      const j = await res.json();
      if (!res.ok) { setErr(j.error || 'Kunne ikke laste analyse'); }
      else setData(j);
    } catch (e) { setErr('Kunne ikke laste analyse'); }
    finally { setLoading(false); }
  }, [apiKey, competitor]);

  useEffect(() => { if (apiKey) load('Utleiemegleren'); }, [apiKey]); // eslint-disable-line

  const submit = (e) => { e.preventDefault(); const c = input.trim(); if (!c) return; setCompetitor(c); load(c); };

  const agg = data && data.aggregates;
  const brand = (data && data.keywords && data.keywords.brand) || [];
  const category = (data && data.keywords && data.keywords.category) || [];
  const transparency = data && data.transparency;
  const configured = data ? data.configured !== false : true;

  return (
    <div>
      {/* Søk etter konkurrent */}
      <form onSubmit={submit} className="flex items-center gap-2 mb-5 max-w-md">
        <div className="flex-1 flex items-center gap-2 h-11 px-3.5 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] focus-within:shadow-[0_0_0_4px_rgba(155,91,214,0.09)] transition-shadow">
          <Crosshair className="w-4 h-4 text-[#8b5cf6] shrink-0" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Konkurrentens navn …" className="flex-1 bg-transparent outline-none text-[14px] text-[#1f1f1f] placeholder:text-[#bbb]" />
        </div>
        <button type="submit" disabled={loading} className="h-11 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Analyser
        </button>
      </form>

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <div key={i} className="shimmer h-24 rounded-2xl" />)}
        </div>
      ) : data ? (
        <>
          {/* Sammendrag */}
          {agg && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
              <Stat label="Merkevaresøk / mnd" value={fmtVol(agg.brandVolume)} sub={`${agg.brandKeywordCount} søkeord`} icon={Eye} tone="violet" />
              <Stat label="Kategorisøk / mnd" value={fmtVol(agg.categoryVolume)} sub={`${agg.categoryKeywordCount} søkeord`} icon={Layers} tone="slate" />
              <Stat label="Est. toppbud" value={agg.avgHighBid != null ? `${fmtKr(agg.avgLowBid)}–${fmtKr(agg.avgHighBid)}` : '–'} sub="pris per klikk (topp)" icon={Wallet} tone="slate" small />
              <Stat label="Konkurranse" value={topComp(agg.competition)} sub={`${agg.totalKeywords} søkeord totalt`} icon={Gauge} tone="amber" />
            </div>
          )}

          {/* Live-annonser (Transparency Center) */}
          {transparency && (
            <div className="mb-6 rounded-2xl bg-[#0a0a0a] text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 shadow-[0_20px_50px_-30px_rgba(10,10,10,0.6)]">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0"><Eye className="w-6 h-6 text-[#cf97fc]" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[16px] font-bold leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Live-annonser i Google Ads Transparency Center</h3>
                <p className="text-[12.5px] text-white/60 mt-1 leading-relaxed">{transparency.note}</p>
              </div>
              <a href={transparency.searchUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 h-11 px-5 rounded-full bg-white text-[#0a0a0a] text-[13px] font-semibold flex items-center gap-2 hover:bg-[#f0f0f0] active:scale-[0.97] transition-all">
                <ExternalLink className="w-4 h-4" /> Se {data.competitor} sine annonser
              </a>
            </div>
          )}

          {!configured && (
            <div className="mb-5 bg-amber-50 text-amber-700 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Google Ads-API er ikke konfigurert — søkevolum og budestimater er utilgjengelig. Transparency Center-lenken over virker uansett.</div>
          )}

          {/* Søkeord-tabeller */}
          {(brand.length > 0 || category.length > 0) && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <KeywordPanel title={`Merkevare-søkeord`} subtitle={`Søk direkte etter «${data.competitor}»`} icon={Tag} rows={brand} accent="#8b5cf6" />
              <KeywordPanel title="Kategori-søkeord" subtitle="Generiske søk i samme marked" icon={Layers} rows={category} accent="#0a0a0a" />
            </div>
          )}

          <p className="mt-5 text-[12px] text-[#b0b0b0] flex items-start gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Søkevolum og bud er Google Keyword Planner-estimater for Norge (via din egen Google Ads-konto). Vi kan ikke se konkurrentens private konto — dette viser <b>etterspørselen</b> og <b>hva det koster</b> å by på søkene deres.
          </p>
        </>
      ) : null}
    </div>
  );
}

function topComp(c) {
  if (!c) return '–';
  const total = (c.LOW || 0) + (c.MEDIUM || 0) + (c.HIGH || 0);
  if (!total) return '–';
  if ((c.HIGH || 0) >= (c.MEDIUM || 0) && (c.HIGH || 0) >= (c.LOW || 0)) return 'Høy';
  if ((c.MEDIUM || 0) >= (c.LOW || 0)) return 'Middels';
  return 'Lav';
}

function KeywordPanel({ title, subtitle, icon: Icon, rows, accent }) {
  const max = Math.max(1, ...rows.map((r) => r.avgMonthlySearches || 0));
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
      <div className="px-5 pt-4 pb-3 flex items-center gap-2.5 border-b border-black/[0.05]">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}14`, color: accent }}><Icon className="w-4 h-4" /></span>
        <div>
          <h3 className="text-[14px] font-bold text-[#1a1a1a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
          <p className="text-[11.5px] text-[#a3a3a3]">{subtitle}</p>
        </div>
        <span className="ml-auto text-[11px] font-semibold text-[#bbb]">{rows.length}</span>
      </div>
      <div className="max-h-[420px] overflow-y-auto divide-y divide-black/[0.04]">
        {rows.length === 0 && <p className="py-10 text-center text-[13px] text-[#bbb]">Ingen søkeord funnet</p>}
        {rows.map((r, i) => {
          const comp = COMP[r.competition] || COMP.UNKNOWN;
          const pct = Math.round(((r.avgMonthlySearches || 0) / max) * 100);
          return (
            <div key={i} className="px-5 py-3 hover:bg-[#faf9f7] transition-colors">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] text-[#1f1f1f] font-medium truncate flex-1">{r.text}</span>
                <span className="text-[13px] font-bold text-[#0a0a0a] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{fmtVol(r.avgMonthlySearches)}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex-1 h-1.5 rounded-full bg-[#f0eef4] overflow-hidden">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: accent }} />
                </div>
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 leading-none ${comp.cls}`}>{comp.l}</span>
                <span className="text-[11px] text-[#999] tabular-nums w-[92px] text-right">{r.highBid != null ? `${fmtKr(r.lowBid)}–${fmtKr(r.highBid)}` : '–'}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, sub, icon: Icon, tone = 'slate', small }) {
  const TONES = {
    violet: 'bg-[#f4f0fb] text-[#8b5cf6]',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-[#f3f3f2] text-[#666]',
  };
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.06em] text-[#a3a3a3] font-semibold">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone] || TONES.slate}`}><Icon className="w-4 h-4" /></span>
      </div>
      <p className={`font-bold mt-2 leading-none text-[#1f1f1f] ${small ? 'text-[17px]' : 'text-[24px]'}`} style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub && <p className="text-[12px] text-[#a3a3a3] mt-1.5">{sub}</p>}
    </div>
  );
}
