'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Upload, Megaphone, TrendingUp, AlertCircle, Trash2,
  Coins, MousePointerClick, Target, Wallet, CheckCircle2, Info,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const fmtNum = (n) => (n == null ? '–' : nf.format(Math.round(n)));
const fmtKr = (n) => (n == null ? '–' : `${nf.format(Math.round(n))} kr`);
const fmtKr2 = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n)} kr`);
const fmtPct = (n) => (n == null ? '–' : `${nf.format(Math.round(n * 10) / 10)} %`);
const fmtX = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 }).format(n)}×`);

const roasColor = (r) => (r == null ? 'text-[#999]' : r >= 3 ? 'text-emerald-600' : r >= 1 ? 'text-amber-600' : 'text-rose-600');

export default function AdsTab({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef(null);

  const load = useCallback(async (importId) => {
    setLoading(true); setErr('');
    try {
      const q = importId ? `&importId=${encodeURIComponent(importId)}` : '';
      const res = await fetch(`/api/admin/ads/overview?key=${encodeURIComponent(apiKey)}${q}`);
      if (!res.ok) { setErr('Kunne ikke laste annonsedata'); setLoading(false); return; }
      const j = await res.json();
      setData(j);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { load(); }, [load]);

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
      else { setImportMsg(`Importert: ${j.parsedCampaigns} kampanjer`); await load(); }
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
    if (!window.confirm('Slette denne importen?')) return;
    try {
      await fetch(`/api/admin/ads/import?key=${encodeURIComponent(apiKey)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch (e) {}
  };

  const eco = data && data.economics;
  const t = eco && eco.totals;

  return (
    <div>
      {/* Verktøylinje */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#cf97fc]" />
          <h2 className="text-[18px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Annonser</h2>
          <button onClick={() => setShowHelp((s) => !s)} className="ml-1 text-[#aaa] hover:text-[#8b5cf6]" aria-label="Hjelp"><Info className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-2">
          {importMsg && <span className="text-[12px] text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {importMsg}</span>}
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
          <button onClick={() => fileRef.current && fileRef.current.click()} disabled={importing} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">
            {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Importer Google Ads-CSV
          </button>
        </div>
      </div>

      {showHelp && (
        <div className="mb-4 bg-[#f4f0fb] rounded-2xl p-4 text-[13px] text-[#444] leading-relaxed">
          <p className="font-semibold text-[#0a0a0a] mb-1">Slik importerer du kostnadsdata</p>
          <p>I Google Ads: <b>Kampanjer</b> → velg periode → <b>Last ned</b> (last ned-ikonet) → <b>.csv</b>. Last opp filen her. Vi kobler kostnaden mot leads og vunne kontrakter for å regne ut CPL, CPA og ROAS.</p>
          <p className="mt-1.5 text-[12px] text-[#777]">Live-synk (sanntids CPC/søkeord) kommer i Fase B når Google Ads API-tokenet er godkjent. ROAS/CPA bruker «Vunnet»-verdien du setter på leads.</p>
        </div>
      )}

      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#cf97fc]" /></div>
      ) : !eco ? (
        <EmptyState onPick={() => fileRef.current && fileRef.current.click()} />
      ) : (
        <>
          {/* Periode + import-velger */}
          <div className="flex flex-wrap items-center gap-2 mb-4 text-[12px] text-[#888]">
            <span>Periode: <b className="text-[#444]">{(eco.period.from || '').slice(0, 10)} – {(eco.period.to || '').slice(0, 10)}</b></span>
            {data.imports && data.imports.length > 1 && (
              <select onChange={(e) => load(e.target.value)} value={eco.importId}
                className="text-[12px] rounded-lg border border-[#e6e3df] bg-white px-2 py-1 outline-none focus:border-[#cf97fc]">
                {data.imports.map((im) => <option key={im.id} value={im.id}>{im.label}</option>)}
              </select>
            )}
            <button onClick={() => doDelete(eco.importId)} className="text-[#bbb] hover:text-rose-500 inline-flex items-center gap-1"><Trash2 className="w-3.5 h-3.5" /> Slett import</button>
          </div>

          {/* KPI-kort */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Kpi icon={Wallet} label="Forbruk" value={fmtKr(t.cost)} accent="text-[#0a0a0a]" />
            <Kpi icon={MousePointerClick} label="Klikk" value={fmtNum(t.clicks)} sub={`${fmtPct(t.ctr)} CTR`} />
            <Kpi icon={Coins} label="Gj.snitt CPC" value={fmtKr2(t.avgCpc)} />
            <Kpi icon={Target} label="Leads (betalt)" value={fmtNum(t.leads)} sub={t.cpl != null ? `${fmtKr(t.cpl)} CPL` : 'CPL –'} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <Kpi icon={CheckCircle2} label="Vunne kunder" value={fmtNum(t.won)} sub={t.cpa != null ? `${fmtKr(t.cpa)} CPA` : 'CPA –'} accent="text-emerald-600" />
            <Kpi icon={TrendingUp} label="Vunnet verdi" value={fmtKr(t.wonValue)} accent="text-emerald-600" />
            <Kpi icon={TrendingUp} label="ROAS" value={fmtX(t.roas)} accent={roasColor(t.roas)} highlight />
            <Kpi icon={Wallet} label="Dekningsbidrag" value={fmtKr(t.profit)} accent={t.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
          </div>

          {/* Kampanjetabell */}
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
                  {eco.campaigns.length === 0 && (<tr><td colSpan={9} className="py-10 text-center text-[#aaa]">Ingen kampanjer i importen</td></tr>)}
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
          <p className="mt-3 text-[12px] text-[#999] leading-relaxed">
            CPL/CPA/ROAS kobler kostnad mot leads i kanalen <b>Betalt</b> (per kampanje via <code>utm_campaign</code>). Sett kontraktsverdi på vunne leads i Leads-fanen for å få presis ROAS. Auto-tagging (gclid) gir ofte tom <code>utm_campaign</code> → bruk konto-totalene øverst som fasit til Fase B (live API) er på plass.
          </p>
        </>
      )}
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

function EmptyState({ onPick }) {
  return (
    <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-[#f4f0fb] flex items-center justify-center mb-4"><Megaphone className="w-7 h-7 text-[#cf97fc]" /></div>
      <h3 className="text-[18px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Ingen annonsedata ennå</h3>
      <p className="text-[14px] text-[#666] mt-2 max-w-md mx-auto">Last opp en kostnadsrapport fra Google Ads (Kampanjer → Last ned → CSV), så regner vi ut CPC, CPL, CPA og ROAS — koblet mot dine ekte leads og vunne kontrakter.</p>
      <button onClick={onPick} className="mt-5 h-11 px-6 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold inline-flex items-center gap-2 active:scale-[0.97] transition-transform"><Upload className="w-4 h-4" /> Importer CSV</button>
    </div>
  );
}
