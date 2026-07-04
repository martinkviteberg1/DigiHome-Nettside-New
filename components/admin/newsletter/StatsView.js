'use client';

/*
 * StatsView — fullstendig analyse for en sendt kampanje:
 * nøkkeltall, klikk per lenke, aktivitet per dag og mottaker-nivå (hvem
 * åpnet/klikket). Data fra GET /admin/newsletter/campaign.
 */

import React, { useMemo, useState } from 'react';
import { ArrowLeft, Copy, Search, MousePointerClick, MailOpen, Send as SendIcon, AlertTriangle } from 'lucide-react';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function StatsView({ camp, stats, onBack, onDuplicate }) {
  const [search, setSearch] = useState('');
  const [onlyEngaged, setOnlyEngaged] = useState(false);
  const s = stats || {};

  const KPIS = [
    { l: 'Sendt', v: s.sent ?? 0, sub: s.failedCount ? `${s.failedCount} feilet` : 'alle levert til SendGrid', icon: SendIcon, warn: !!s.failedCount },
    { l: 'Åpningsrate', v: s.openRate != null ? `${s.openRate} %` : '—', sub: `${s.opensUnique ?? 0} unike · ${s.opens ?? 0} totalt`, icon: MailOpen },
    { l: 'Klikkrate', v: s.clickRate != null ? `${s.clickRate} %` : '—', sub: `${s.clicksUnique ?? 0} unike · ${s.clicks ?? 0} totalt`, icon: MousePointerClick },
  ];

  const rows = useMemo(() => {
    let list = s.recipientDetails || [];
    if (onlyEngaged) list = list.filter((r) => r.opened || r.clicked);
    const t = search.trim().toLowerCase();
    if (t) list = list.filter((r) => (r.email + ' ' + (r.name || '')).toLowerCase().includes(t));
    return list;
  }, [s.recipientDetails, search, onlyEngaged]);

  const tl = s.timeline || [];
  const tlMax = Math.max(1, ...tl.map((d) => Math.max(d.opens, d.clicks)));

  return (
    <div data-testid="nl-stats-view">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#888] hover:text-[#111]">
        <ArrowLeft size={14} /> Tilbake
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-bold uppercase tracking-[0.08em] px-2.5 py-1">Sendt {fmtDate(camp?.sentAt)}</span>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111] mt-2">{camp?.subject || camp?.title}</h2>
          <p className="text-[13px] text-[#999] mt-0.5">Fra {camp?.fromName || 'DigiHome'} · {s.recipients ?? 0} mottakere</p>
        </div>
        <button onClick={onDuplicate} className="h-[38px] rounded-full border border-[#e5e5e5] bg-white text-[12.5px] font-semibold px-4 flex items-center gap-1.5 hover:border-[#c99df0]">
          <Copy size={13} /> Dupliser som ny
        </button>
      </div>

      {/* KPI-er */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
        {KPIS.map((k) => (
          <div key={k.l} className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#aaa]">{k.l}</span>
              {React.createElement(k.icon, { size: 15, className: k.warn ? 'text-amber-500' : 'text-[#c9b3e0]' })}
            </div>
            <p className="text-[30px] font-bold tabular-nums tracking-[-0.02em] text-[#111] mt-2">{k.v}</p>
            <p className={`text-[11.5px] mt-0.5 ${k.warn ? 'text-amber-600 font-medium' : 'text-[#999]'}`}>{k.warn ? <AlertTriangle size={11} className="inline mr-1" /> : null}{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        {/* Klikk per lenke */}
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
          <p className="text-[13px] font-bold text-[#111]">Klikk per lenke</p>
          {(s.clicksByUrl || []).length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] mt-3">Ingen klikk registrert ennå.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {s.clicksByUrl.map((u, i) => {
                const max = Math.max(1, ...s.clicksByUrl.map((x) => x.total));
                return (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] text-[#555] truncate flex-1">{u.url.replace(/^https?:\/\//, '')}</span>
                      <span className="text-[12px] font-bold tabular-nums text-[#111] shrink-0">{u.total} <span className="font-normal text-[#aaa]">({u.unique} unike)</span></span>
                    </div>
                    <div className="h-[5px] rounded-full bg-[#f4f2ef] mt-1"><div className="h-full rounded-full" style={{ width: `${(u.total / max) * 100}%`, background: '#d298ff' }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aktivitet per dag */}
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
          <p className="text-[13px] font-bold text-[#111]">Aktivitet per dag</p>
          {tl.length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] mt-3">Ingen aktivitet ennå.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {tl.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="text-[11px] tabular-nums text-[#999] w-[64px] shrink-0">{new Date(d.day).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' })}</span>
                  <div className="flex-1 space-y-1">
                    <div className="h-[5px] rounded-full bg-[#f4f2ef]"><div className="h-full rounded-full bg-[#0a0a0a]" style={{ width: `${(d.opens / tlMax) * 100}%` }} /></div>
                    <div className="h-[5px] rounded-full bg-[#f4f2ef]"><div className="h-full rounded-full" style={{ width: `${(d.clicks / tlMax) * 100}%`, background: '#d298ff' }} /></div>
                  </div>
                  <span className="text-[11px] tabular-nums text-[#777] w-[110px] text-right shrink-0">{d.opens} åpn. · {d.clicks} klikk</span>
                </div>
              ))}
              <p className="text-[10.5px] text-[#bbb] pt-1"><span className="inline-block w-2 h-2 rounded-full bg-[#0a0a0a] mr-1" />Åpninger <span className="inline-block w-2 h-2 rounded-full ml-3 mr-1" style={{ background: '#d298ff' }} />Klikk</p>
            </div>
          )}
        </div>
      </div>

      {/* Mottakere */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#f4f4f4]">
          <p className="text-[13px] font-bold text-[#111]">Mottakere <span className="font-normal text-[#aaa]">({rows.length})</span></p>
          <div className="flex items-center gap-2">
            <button onClick={() => setOnlyEngaged((v) => !v)}
              className={`h-[32px] rounded-full text-[11.5px] font-semibold px-3.5 ${onlyEngaged ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>
              Kun engasjerte
            </button>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbb]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk e-post…"
                className="h-[32px] w-[180px] rounded-lg border border-[#e8e8e8] pl-7 pr-3 text-[12px] outline-none focus:border-[#c99df0]" />
            </div>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] text-center py-10">Ingen mottakere matcher.</p>
          ) : rows.map((r) => (
            <div key={r.email} className="grid grid-cols-[1.7fr_1fr_0.7fr_0.7fr_0.7fr] gap-3 px-5 py-2.5 border-b border-[#fafafa] items-center">
              <span className="text-[12.5px] font-medium text-[#111] truncate">{r.email}</span>
              <span className="text-[11.5px] text-[#999] truncate">{r.name || '—'} · {r.segment}</span>
              <span className={`text-[11px] font-semibold ${r.opened ? 'text-emerald-600' : 'text-[#ccc]'}`}>{r.opened ? '✓ Åpnet' : '— Åpnet'}</span>
              <span className={`text-[11px] font-semibold ${r.clicked ? 'text-[#a052e0]' : 'text-[#ccc]'}`}>{r.clicked ? '✓ Klikket' : '— Klikk'}</span>
              <span className={`text-[11px] font-semibold ${r.failed ? 'text-red-500' : 'text-[#ccc]'}`}>{r.failed ? 'Feilet' : 'Levert'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
