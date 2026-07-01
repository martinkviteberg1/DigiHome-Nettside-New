'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Users, Building2, Wallet, TrendingUp, Search,
  Landmark, AlertCircle, Radio,
} from 'lucide-react';

const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const kr = (n) => `${nf0.format(Math.round(Number(n) || 0))} kr`;
const btnDark = 'inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-[#0a0a0a] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-[#e5e5ea] bg-white text-[13px] font-medium text-[#333] hover:bg-[#f7f7f8] transition-colors disabled:opacity-50';

const STATUS_STYLE = {
  aktiv: 'bg-[#e7f6ee] text-[#1a7f45]',
  venter: 'bg-[#fff4e0] text-[#b76e00]',
  inaktiv: 'bg-[#f2f2f4] text-[#888]',
};

export default function CustomersDashboard({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);
  const [q, setQ] = useState('');

  const api = useCallback(async (path, opts = {}) => {
    const sep = path.includes('?') ? '&' : '?';
    const r = await fetch(`/api/admin/finance${path}${sep}key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/json' }, ...opts,
    });
    return r.json();
  }, [apiKey]);

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api('/customers')); } finally { setLoading(false); }
  }, [api]);

  useEffect(() => { if (apiKey) load(); }, [apiKey, load]);

  const sync = useCallback(async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const res = await api('/sync-contracts', { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) setSyncMsg(`Synket ${res.upserted ?? res.fetched ?? 0} kontrakter fra plattform (${res.platformEnv || '—'}).`);
      else setSyncMsg(`Synk feilet: ${res.error || 'ukjent'}`);
      await load();
    } catch (e) { setSyncMsg('Synk feilet: ' + (e?.message || e)); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(null), 6000); }
  }, [api, load]);

  const customers = data?.customers || [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => (c.name || '').toLowerCase().includes(s) || (c.email || '').toLowerCase().includes(s) || (c.channel || '').toLowerCase().includes(s));
  }, [customers, q]);

  if (loading) return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Laster kunder…</div>;
  if (!data || !data.ok) return <Empty msg="Kunne ikke laste kundedata." onRetry={load} />;

  const s = data.summary || {};

  return (
    <div className="space-y-8">
      {/* Topplinje */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[18px] font-bold text-[#0a0a0a] flex items-center gap-2"><Users className="w-5 h-5" /> Kunder (utleiere)</h2>
          <p className="text-[12px] text-[#999] mt-0.5">Betalende kunder — hentet fra DigiHome-plattformens kontrakter. Leietakere er ikke kunder og vises ikke her.</p>
        </div>
        <button className={btnDark} onClick={sync} disabled={syncing} data-testid="customers-sync">
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Synk fra plattform
        </button>
      </div>

      {syncMsg && <div className="rounded-lg bg-[#f2f0ff] border border-[#e3ddff] px-4 py-2.5 text-[13px] text-[#4b3d8f]">{syncMsg}</div>}

      {/* Nøkkeltall */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users} label="Betalende kunder" value={`${s.payingCustomers || 0}`} sub={`${s.totalCustomers || 0} totalt · ${s.activeCustomers || 0} aktive`} />
        <Stat icon={Wallet} label="MRR fra kunder" value={kr(s.totalMrr)} sub={`ARR ${kr(s.arr)}`} accent />
        <Stat icon={TrendingUp} label="ARPA" value={kr(s.arpa)} sub="Snitt honorar / kunde / mnd" />
        <Stat icon={Building2} label="Eiendommer" value={`${s.totalProperties || 0}`} sub="Under forvaltning" />
      </div>

      {/* Attribusjon per kanal */}
      {data.byChannel && Object.keys(data.byChannel).length > 0 && (
        <div className="rounded-2xl border border-[#eee] bg-white p-6">
          <h3 className="text-[14px] font-bold text-[#111] mb-4">Kunder per kilde</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(data.byChannel).sort((a, b) => b[1].mrr - a[1].mrr).map(([ch, v]) => (
              <div key={ch} className="rounded-xl bg-[#fafafa] p-3">
                <p className="text-[12px] font-semibold text-[#333] capitalize truncate">{ch}</p>
                <p className="text-[15px] font-bold text-[#0a0a0a] mt-1">{v.count} <span className="text-[11px] font-medium text-[#999]">kunder</span></p>
                <p className="text-[11px] text-[#7c3aed] mt-0.5">{kr(v.mrr)}/mnd</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kundeliste */}
      <div className="rounded-2xl border border-[#eee] bg-white overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#f0f0f0]">
          <h3 className="text-[14px] font-bold text-[#111]">Kundeliste <span className="text-[#bbb] font-medium">({filtered.length})</span></h3>
          <div className="relative">
            <Search className="w-4 h-4 text-[#bbb] absolute left-3 top-1/2 -translate-y-1/2" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk navn, e-post, kilde …"
              className="h-9 w-64 max-w-[50vw] pl-9 pr-3 rounded-lg border border-[#e5e5ea] bg-white text-[13px] focus:outline-none focus:ring-2 focus:ring-[#cf97fc]/50" />
          </div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#999] text-[13px]">
            {customers.length === 0 ? 'Ingen kunder ennå. Klikk «Synk fra plattform» for å hente kontrakter.' : 'Ingen treff.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[#aaa] border-b border-[#f0f0f0]">
                  <th className="px-6 py-3 font-semibold">Kunde</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-center">Eiendommer</th>
                  <th className="px-4 py-3 font-semibold text-center">Avtaler</th>
                  <th className="px-4 py-3 font-semibold">Kilde</th>
                  <th className="px-4 py-3 font-semibold">Kunde siden</th>
                  <th className="px-6 py-3 font-semibold text-right">MRR</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.key} className="border-b border-[#f6f6f6] hover:bg-[#fafafa] transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="font-semibold text-[#111]">{c.name}</div>
                      {(c.email || c.phone) && <div className="text-[11px] text-[#999]">{c.email || c.phone}</div>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${STATUS_STYLE[c.status] || STATUS_STYLE.inaktiv}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-[#333]">{c.properties}</td>
                    <td className="px-4 py-3.5 text-center text-[#333]">
                      {c.contracts}{c.pendingContracts > 0 && <span className="text-[10px] text-[#b76e00] ml-1">({c.pendingContracts} venter)</span>}
                    </td>
                    <td className="px-4 py-3.5 text-[#666] capitalize">{c.channel || '—'}</td>
                    <td className="px-4 py-3.5 text-[#666]">{c.since || '—'}</td>
                    <td className="px-6 py-3.5 text-right font-semibold text-[#0a0a0a]">{c.mrr > 0 ? `${kr(c.mrr)}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Note om rikere data */}
      <div className="rounded-2xl border border-[#eee] bg-[#fbfbfd] p-5 flex gap-3">
        <AlertCircle className="w-5 h-5 text-[#7c3aed] shrink-0 mt-0.5" />
        <div>
          <p className="text-[13px] font-semibold text-[#333]">Kundedata avledes fra synkede kontrakter (owner-ID)</p>
          <p className="text-[12px] text-[#999] mt-1 leading-relaxed">Navn, eiendommer, honorar (MRR) og kilde hentes fra plattformens kontrakts-eksport. Rikere felter — full kontaktinfo, livssyklus (aktiv/pauset/churnet) og historikk — er forespurt fra plattform-teamet via broen (dedikert <span className="font-mono text-[11px] bg-[#f2f0ff] px-1 rounded">/api/customers/export</span>). Kobles på når det er klart.</p>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-[#e3ddff] bg-[#f7f5ff]' : 'border-[#eee] bg-white'}`}>
      <div className="flex items-center gap-2 text-[#999] mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-[12px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-[24px] font-bold text-[#0a0a0a] tracking-[-0.02em]">{value}</div>
      {sub && <div className="text-[12px] text-[#999] mt-1">{sub}</div>}
    </div>
  );
}

function Empty({ msg, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Landmark className="w-8 h-8 text-[#ddd] mb-3" />
      <p className="text-[14px] text-[#999]">{msg}</p>
      {onRetry && <button className={btnGhost + ' mt-4'} onClick={onRetry}><RefreshCw className="w-4 h-4" /> Prøv igjen</button>}
    </div>
  );
}
