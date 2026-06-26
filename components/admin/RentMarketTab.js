'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Database, TrendingUp, TrendingDown, MapPin,
  ExternalLink, Building2, Sparkles, CheckCircle2, AlertCircle,
} from 'lucide-react';

const nf = (n) => (n == null ? '–' : Number(n).toLocaleString('nb-NO'));

export default function RentMarketTab({ apiKey }) {
  const [city, setCity] = useState('bergen');
  const [cities, setCities] = useState([{ slug: 'bergen', label: 'Bergen' }]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(async (c) => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/rentmarket?key=${encodeURIComponent(apiKey)}&city=${c}`);
      if (!res.ok) { setErr('Kunne ikke laste rapport'); setLoading(false); return; }
      const j = await res.json();
      setReport(j.report || null);
      if (Array.isArray(j.cities) && j.cities.length) setCities(j.cities);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { load(city); }, [city, load]);

  const doRefresh = async () => {
    setRefreshing(true); setMsg(''); setErr('');
    try {
      const res = await fetch(`/api/admin/rentmarket/refresh?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      });
      const j = await res.json();
      if (j.ok) { setReport(j.report); setMsg('Oppdatert fra SSB ✓'); setTimeout(() => setMsg(''), 4000); }
      else setErr(j.error || 'Oppdatering feilet');
    } catch (e) { setErr('Nettverksfeil ved oppdatering'); }
    finally { setRefreshing(false); }
  };

  if (loading && !report) {
    return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }
  if (!report) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-3" />
        <p className="text-[14px] text-[#666]">{err || 'Ingen rapport tilgjengelig.'}</p>
        <button onClick={() => load(city)} className="mt-4 h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold">Prøv igjen</button>
      </div>
    );
  }

  const r = report;
  const generated = r.generatedAt ? new Date(r.generatedAt) : null;
  const ssbUpd = r.source?.ssbUpdated ? new Date(r.source.ssbUpdated) : null;

  return (
    <div className="space-y-5">
      {/* Topp-kontroller */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {cities.map((c) => (
            <button key={c.slug} onClick={() => setCity(c.slug)} className={`px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${city === c.slug ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#888] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#0a0a0a]'}`}>{c.label}</button>
          ))}
          <a href={`/leiemarkedet/${city}`} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#a463e8] hover:underline">Se offentlig side <ExternalLink className="w-3.5 h-3.5" /></a>
        </div>
        <div className="flex items-center gap-2">
          {msg && <span className="text-[12.5px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {msg}</span>}
          {err && <span className="text-[12.5px] text-rose-600 font-semibold">{err}</span>}
          <button onClick={doRefresh} disabled={refreshing} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60">
            {refreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Oppdater fra SSB
          </button>
        </div>
      </div>

      {/* Metadata-stripe */}
      <div className="bg-white rounded-2xl px-5 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex flex-wrap items-center gap-x-8 gap-y-2 text-[12.5px] text-[#666]">
        <span className="flex items-center gap-1.5"><Database className="w-3.5 h-3.5 text-[#a463e8]" /> Kilde: {r.source?.name}</span>
        <span>År: <b className="text-[#1f1f1f]">{r.year}</b></span>
        <span>SSB oppdatert: <b className="text-[#1f1f1f]">{ssbUpd ? ssbUpd.toLocaleDateString('nb-NO') : '–'}</b></span>
        <span>Rapport generert: <b className="text-[#1f1f1f]">{generated ? generated.toLocaleString('nb-NO') : '–'}</b></span>
        <span>Tabeller: {r.source?.tables?.map((t) => t.id).join(', ')}</span>
      </div>

      {/* KPI-kort */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { k: 'Snittleie 2-roms', v: `${nf(r.headline.typical2rom)} kr`, sub: 'per måned' },
          { k: 'Endring fra i fjor', v: `${r.headline.yoy2rom >= 0 ? '+' : ''}${r.headline.yoy2rom ?? '–'} %`, up: (r.headline.yoy2rom || 0) >= 0 },
          { k: 'Prisspenn (1–4 rom)', v: `${nf(r.headline.rangeLow)}–${nf(r.headline.rangeHigh)}`, sub: 'kr/mnd' },
          { k: 'Etterspørselsindeks', v: `${r.demand.index}/100`, sub: r.demand.level },
        ].map((s) => (
          <div key={s.k} className="bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#aaa] font-semibold">{s.k}</p>
            <p className="text-[24px] font-bold text-[#1f1f1f] mt-1 flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
              {s.up === true && <TrendingUp className="w-4 h-4 text-emerald-500" />}
              {s.up === false && <TrendingDown className="w-4 h-4 text-rose-500" />}
              {s.v}
            </p>
            {s.sub && <p className="text-[12px] text-[#999] mt-0.5">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* AI-sammendrag */}
      {r.aiSummary && (
        <div className="bg-gradient-to-br from-[#1a1430] to-[#0a0a0a] text-white rounded-2xl p-6">
          <p className="text-[11px] uppercase tracking-[0.12em] text-[#d298ff] font-semibold flex items-center gap-1.5 mb-3"><Sparkles className="w-3.5 h-3.5" /> AI-markedsvurdering</p>
          <p className="text-[15px] leading-relaxed text-white/90">{r.aiSummary}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Snittleie per rom */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] mb-4 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Snittleie per romtype ({r.year})</h3>
          <table className="w-full text-[13.5px]">
            <thead><tr className="text-[#aaa] text-[12px] text-left"><th className="pb-2 font-medium">Type</th><th className="pb-2 font-medium text-right">kr/mnd</th><th className="pb-2 font-medium text-right">Endring</th></tr></thead>
            <tbody>
              {r.byRoom.filter((b) => b.current).map((b) => (
                <tr key={b.roomKey} className="border-t border-[#f3f1ef]">
                  <td className="py-2.5 font-semibold text-[#1f1f1f]">{b.label}</td>
                  <td className="py-2.5 text-right font-bold text-[#1f1f1f]">{nf(b.current)}</td>
                  <td className="py-2.5 text-right">{b.yoyPct != null ? <span className={b.yoyPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{b.yoyPct >= 0 ? '+' : ''}{b.yoyPct}%</span> : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pris etter sone */}
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] mb-4 flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> Pris etter prissone</h3>
          <div className="space-y-4">
            {r.zones.map((z) => (
              <div key={z.code}>
                <p className="text-[13.5px] font-semibold text-[#1f1f1f] mb-1.5">{z.label} <span className="text-[#bbb] font-normal">· {z.sub}</span></p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {z.sizes.filter((s) => s.rent).map((s) => (
                    <div key={s.key} className="bg-[#faf9f7] rounded-lg px-2.5 py-2">
                      <p className="text-[11px] text-[#999]">{s.label}</p>
                      <p className="text-[14px] font-bold text-[#1f1f1f]">{nf(s.rent)}</p>
                      <p className="text-[10.5px] text-[#bbb]">{nf(s.perSqm)} kr/m²</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Etterspørselsindeks per bydel */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> DigiHome Etterspørselsindeks per bydel</h3>
          <span className="text-[12px] text-[#aaa]">{r.demand.signals.leads} eier- / {r.demand.signals.tenants} leietakerforespørsler ({r.demand.signals.windowDays}d)</span>
        </div>
        <div className="space-y-2.5">
          {r.demand.byArea.map((a) => (
            <div key={a.slug} className="flex items-center gap-3">
              <span className="w-[120px] shrink-0 text-[13.5px] font-semibold text-[#1f1f1f]">{a.area}</span>
              <div className="flex-1 h-2.5 rounded-full bg-[#f0eef2] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${a.index}%`, background: a.index >= 85 ? '#a463e8' : a.index >= 70 ? '#3b82f6' : '#22c55e' }} />
              </div>
              <span className="w-10 text-right text-[13px] font-bold text-[#666]">{a.index}</span>
              <span className="w-[110px] text-right text-[12px] text-[#999]">{a.level}</span>
              <span className="w-12 text-right text-[11.5px] text-[#ccc]">+{a.signals} sig.</span>
            </div>
          ))}
        </div>
        <p className="text-[11.5px] text-[#bbb] mt-4 leading-relaxed">{r.demand.note}</p>
      </div>

      {/* Nøkkelfunn */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] mb-3">Nøkkelfunn (vises på offentlig side)</h3>
        <ul className="space-y-2">
          {r.insights.map((i, idx) => (
            <li key={idx} className="text-[13.5px] text-[#444] flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-[#a463e8] shrink-0 mt-0.5" /> {i}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
