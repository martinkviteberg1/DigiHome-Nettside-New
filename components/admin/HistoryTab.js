'use client';

// Historikk — leads som kom inn FØR sporing (importert fra plattform-CRM-et).
// Teller i helhetsbildet/LTV, men holdes UTENFOR betalt ROAS/CAC (pre_tracking).
// Kilde/status/verdi kan redigeres manuelt (enkelt + bulk) — manuelt satte
// verdier lagres som `override` og overlever alltid ny synk fra plattformen.
import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Search, CheckCircle2, AlertTriangle, History,
  Trophy, Coins, ShieldQuestion, ChevronDown, Wallet, Calculator, Clock, Pencil, BarChart3,
} from 'lucide-react';

const CHANNELS = [
  ['unknown', 'Ukjent'], ['google', 'Google Ads'], ['meta', 'Meta'], ['finn', 'FINN'],
  ['referral', 'Anbefaling'], ['phone', 'Telefon'], ['organic', 'Organisk/Direkte'], ['email', 'E-post'],
];
const CHANNEL_LABEL = Object.fromEntries(CHANNELS);
const STATUS_LABEL = { new: 'Ny', contacted: 'Kontaktet', qualified: 'Kvalifisert', viewing: 'Befaring', offer: 'Tilbud sendt', won: 'Vunnet', lost: 'Tapt' };
const STATUS_CLS = {
  new: 'bg-[#f5f5f4] text-[#888]', contacted: 'bg-[#fdf3e2] text-[#a97615]', qualified: 'bg-[#fdf3e2] text-[#a97615]',
  viewing: 'bg-[#e8f1fd] text-[#2f6bc4]', offer: 'bg-[#f0ebff] text-[#6b4fd8]',
  won: 'bg-[#e9f7ef] text-[#1f7a4d]', lost: 'bg-[#fdecec] text-[#c0392b]',
};
const nf = new Intl.NumberFormat('nb-NO');
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function HistoryTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchDeb, setSearchDeb] = useState('');
  const [limit, setLimit] = useState(100);
  const [selected, setSelected] = useState(new Set());
  const [bulkChannel, setBulkChannel] = useState('google');
  const [savingId, setSavingId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setSearchDeb(search), 350); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    try {
      const p = new URLSearchParams({ list: '1', limit: String(limit) });
      if (statusFilter) p.set('status', statusFilter);
      if (channelFilter) p.set('channel', channelFilter);
      if (searchDeb) p.set('q', searchDeb);
      const r = await fetch(`/api/admin/imported-leads?${q}&${p}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {}
    setLoading(false);
  }, [q, statusFilter, channelFilter, searchDeb, limit]);
  useEffect(() => { load(); }, [load]);

  const runSync = async () => {
    setSyncing(true); setMsg(null);
    try {
      const r = await fetch(`/api/admin/imported-leads/sync?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const j = await r.json();
      if (j.ok) {
        const tenantPart = j.tenantSyncSupported
          ? ` · ${j.fetchedTenants || 0} leietakere via ${j.tenantEndpoint}`
          : ' · NB: plattformen ga ingen egen leietaker-eksport';
        setMsg({ ok: true, text: `Synket fra CRM: ${j.fetched} leads gjennomgått (${j.fetchedOwners || 0} eiere${tenantPart}) — ${j.inserted} nye historiske, ${j.updatedTracked || 0} av våre egne leads fikk oppdatert status. Manuelle endringer er bevart.` });
        await load();
      } else setMsg({ ok: false, text: j.error || 'Synk feilet' });
    } catch (e) { setMsg({ ok: false, text: 'Nettverksfeil under synk' }); }
    setSyncing(false);
  };

  const saveOverride = async (ids, patch) => {
    const list = Array.isArray(ids) ? ids : [ids];
    if (list.length === 1) setSavingId(list[0]); else setBulkBusy(true);
    try {
      const r = await fetch(`/api/admin/imported-leads?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: list, patch }),
      });
      const j = await r.json();
      if (j.ok) { await load(); if (list.length > 1) { setSelected(new Set()); setMsg({ ok: true, text: `Oppdaterte ${j.changed} leads` }); } }
      else setMsg({ ok: false, text: j.error || 'Lagring feilet' });
    } catch (e) { setMsg({ ok: false, text: 'Nettverksfeil ved lagring' }); }
    setSavingId(null); setBulkBusy(false);
  };

  const list = data?.list || [];
  const toggleSel = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = list.length > 0 && list.every((l) => selected.has(l.id));

  const statusChips = [['', `Alle`], ...Object.entries(STATUS_LABEL).map(([k, v]) => [k, `${v}${data?.byStatus?.[k] ? ` (${data.byStatus[k]})` : ''}`])];
  const channelCounts = Object.fromEntries((data?.byChannel || []).map((c) => [c.channel, c.leads]));

  if (loading) return <div className="flex items-center gap-2 text-[#999] text-[14px] py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Laster historikk …</div>;

  return (
    <div className="space-y-5">
      {/* Topp: statistikk + synk */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <History className="w-4 h-4 text-[#b98cf7]" />
            <span className="text-[13px] text-[#666]">Historiske leads:</span>
            <span className="text-[14px] font-bold text-[#0a0a0a]">{data?.total || 0}</span>
          </div>
          <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <Trophy className="w-4 h-4 text-[#7fc79e]" />
            <span className="text-[13px] text-[#666]">Vunnet:</span>
            <span className="text-[14px] font-bold text-[#0a0a0a]">{data?.won || 0}</span>
          </div>
          <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <Coins className="w-4 h-4 text-[#e0b64f]" />
            <span className="text-[13px] text-[#666]">Verdi:</span>
            <span className="text-[14px] font-bold text-[#0a0a0a]">{nf.format(data?.wonValue || 0)} kr</span>
          </div>
        </div>
        <div className="lg:ml-auto">
          <button onClick={runSync} disabled={syncing} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center gap-2 disabled:opacity-60">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Synker …' : 'Synk fra CRM'}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-[13px] rounded-xl px-4 py-3 ${msg.ok ? 'bg-[#e9f7ef] text-[#1f7a4d]' : 'bg-[#fdecec] text-[#c0392b]'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {/* Historisk analyse — blandet CPL/CAC på annonseforbruk før sporing */}
      {(data?.total || 0) > 0 && (
        <HistoricalAnalysis
          spend={data?.historicalSpend}
          total={data?.total || 0}
          won={data?.won || 0}
          wonValue={data?.wonValue || 0}
          q={q}
          onSaved={load}
        />
      )}

      <div className="flex items-start gap-2.5 rounded-xl bg-[#f7f3ff] px-4 py-3">
        <ShieldQuestion className="w-4 h-4 text-[#9a6ee8] shrink-0 mt-0.5" />
        <p className="text-[12.5px] leading-relaxed text-[#6b5a94]">
          Dette er leads som kom inn <strong>før sporingen startet</strong> — kilden er ukjent til du setter den manuelt.
          De teller i helhetsbildet og LTV, men holdes <strong>alltid utenfor</strong> betalt ROAS/CAC.
          <strong> Toveis-synk:</strong> status- og verdiendringer du gjør her sendes automatisk tilbake til CRM-et
          (køes trygt hvis CRM-et er utilgjengelig). Manuelt satte kilder/verdier overlever alltid ny synk.
          {data?.pushback?.pending > 0 && (
            <span className="block mt-1 font-semibold">
              {data.pushback.pending} endring{data.pushback.pending === 1 ? '' : 'er'} venter på levering til CRM-et
              {data.pushback.lastPendingInfo?.last_error ? ` (${data.pushback.lastPendingInfo.last_error})` : ''} — leveres automatisk.
            </span>
          )}
        </p>
      </div>

      {/* Filtre */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {statusChips.map(([k, l]) => (
            <button key={'s' + k} onClick={() => setStatusFilter(k)}
              className={`h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors ${statusFilter === k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#777] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#0a0a0a]'}`}>
              {l}
            </button>
          ))}
          <div className="ml-auto relative">
            <Search className="w-4 h-4 text-[#bbb] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk navn, e-post, telefon, adresse"
              className="h-9 w-[260px] pl-10 pr-3 rounded-full bg-white text-[13px] text-[#0a0a0a] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none focus:ring-2 focus:ring-[#d9c4f5] placeholder:text-[#bbb]" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setChannelFilter('')}
            className={`h-8 px-3 rounded-full text-[12px] font-medium transition-colors ${channelFilter === '' ? 'bg-[#7c3aed] text-white' : 'bg-white text-[#777] shadow-[0_2px_10px_rgba(0,0,0,0.04)]'}`}>
            Alle kilder
          </button>
          {CHANNELS.map(([k, l]) => (
            <button key={'c' + k} onClick={() => setChannelFilter(k)}
              className={`h-8 px-3 rounded-full text-[12px] font-medium transition-colors ${channelFilter === k ? 'bg-[#7c3aed] text-white' : 'bg-white text-[#777] shadow-[0_2px_10px_rgba(0,0,0,0.04)]'}`}>
              {l}{channelCounts[k] ? ` (${channelCounts[k]})` : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk-verktøylinje */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0a0a0a] text-white px-4 py-3">
          <span className="text-[13px] font-semibold">{selected.size} valgt</span>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12.5px] text-white/60">Sett kilde til</span>
            <select value={bulkChannel} onChange={(e) => setBulkChannel(e.target.value)}
              className="h-8 rounded-lg bg-white/10 text-white text-[12.5px] px-2 outline-none [&>option]:text-black">
              {CHANNELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <button onClick={() => saveOverride([...selected], { channel: bulkChannel })} disabled={bulkBusy}
              className="h-8 px-4 rounded-lg bg-white text-[#0a0a0a] text-[12.5px] font-bold disabled:opacity-60 flex items-center gap-1.5">
              {bulkBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Bruk
            </button>
            <button onClick={() => setSelected(new Set())} className="h-8 px-3 rounded-lg text-white/60 text-[12.5px] hover:text-white">Avbryt</button>
          </div>
        </div>
      )}

      {/* Liste */}
      {!list.length ? (
        <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] py-16 text-center">
          <History className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#0a0a0a]">{data?.total ? 'Ingen treff i dette filteret' : 'Ingen historiske leads ennå'}</p>
          {!data?.total && <p className="text-[13px] text-[#999] mt-1 mb-5">Hent leads fra CRM-et for å komme i gang.</p>}
          {!data?.total && (
            <button onClick={runSync} disabled={syncing} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold inline-flex items-center gap-2">
              {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Synk fra CRM
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] overflow-x-auto">
          <table className="w-full text-left min-w-[860px]">
            <thead>
              <tr className="border-b border-[#f1f0ee]">
                <th className="pl-5 py-3 w-10"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.map((l) => l.id)))} className="accent-[#7c3aed]" /></th>
                <th className="py-3 text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa]">Lead</th>
                <th className="py-3 text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa]">Adresse</th>
                <th className="py-3 text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa]">Opprettet</th>
                <th className="py-3 text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa]">Status</th>
                <th className="py-3 text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa]">Kilde</th>
                <th className="py-3 pr-5 text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa]">Verdi (kr/mnd)</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => {
                const effStatus = l.eff_status || l.status;
                const effChannel = l.eff_channel || l.channel || 'unknown';
                const effValue = l.eff_won_value ?? l.won_value;
                return (
                  <tr key={l.id} className={`border-b border-[#f7f6f4] last:border-0 ${selected.has(l.id) ? 'bg-[#faf7ff]' : ''}`}>
                    <td className="pl-5 py-3"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} className="accent-[#7c3aed]" /></td>
                    <td className="py-3 pr-4">
                      <p className="text-[13.5px] font-semibold text-[#0a0a0a]">{l.name || '(uten navn)'}</p>
                      <p className="text-[11.5px] text-[#999]">{[l.email, l.phone].filter(Boolean).join(' · ') || '—'}</p>
                    </td>
                    <td className="py-3 pr-4 text-[12.5px] text-[#666] max-w-[190px] truncate">{l.address || '—'}</td>
                    <td className="py-3 pr-4 text-[12.5px] text-[#666] whitespace-nowrap">{fmtDate(l.created_at)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-block rounded-lg px-2 py-1 text-[11px] font-semibold ${STATUS_CLS[effStatus] || STATUS_CLS.new}`}>{STATUS_LABEL[effStatus] || effStatus}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="relative inline-flex items-center">
                        <select value={effChannel} disabled={savingId === l.id}
                          onChange={(e) => saveOverride(l.id, { channel: e.target.value })}
                          className={`h-8 rounded-lg text-[12px] font-medium pl-2.5 pr-7 appearance-none outline-none cursor-pointer transition-colors ${effChannel === 'unknown' ? 'bg-[#fdf3e2] text-[#a97615]' : 'bg-[#f5f5f4] text-[#333]'} focus:ring-2 focus:ring-[#d9c4f5]`}>
                          {CHANNELS.map(([k, lab]) => <option key={k} value={k}>{lab}</option>)}
                        </select>
                        {savingId === l.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-2 pointer-events-none text-[#999]" />
                          : <ChevronDown className="w-3.5 h-3.5 absolute right-2 pointer-events-none text-[#999]" />}
                      </div>
                    </td>
                    <td className="py-3 pr-5">
                      {effStatus === 'won' ? (
                        <input type="number" min="0" defaultValue={effValue ?? ''} placeholder="0"
                          onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== (effValue ?? null)) saveOverride(l.id, { won_value: v }); }}
                          className="h-8 w-[110px] rounded-lg bg-[#f5f5f4] text-[12.5px] px-2.5 outline-none focus:ring-2 focus:ring-[#d9c4f5]" />
                      ) : <span className="text-[12px] text-[#ccc]">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data?.listTotal > list.length && (
        <div className="text-center">
          <button onClick={() => setLimit((n) => n + 100)} className="h-9 px-5 rounded-full bg-white text-[13px] font-medium text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#0a0a0a]">
            Vis flere ({list.length} av {data.listTotal})
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Historisk analyse — blandet CPL/CAC basert på annonseforbruk FØR sporing.
// Forbruket (Meta/Google/annet) kan justeres manuelt og lagres i settings.
// «Blandet» = alle kanaler samlet, siden kilden per lead ofte er ukjent.
// Tallene her blandes ALDRI inn i live ROAS/CAC på Annonser/Økonomi-fanene.
// ---------------------------------------------------------------------------
function HistoricalAnalysis({ spend, total, won, wonValue, q, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ meta: '', google: '', other: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (spend) setDraft({ meta: spend.meta ?? 0, google: spend.google ?? 0, other: spend.other ?? 0 });
  }, [spend]);

  const totalSpend = (Number(spend?.meta) || 0) + (Number(spend?.google) || 0) + (Number(spend?.other) || 0);
  const cpl = total > 0 && totalSpend > 0 ? totalSpend / total : null;
  const cac = won > 0 && totalSpend > 0 ? totalSpend / won : null;
  const avgMonthly = won > 0 && wonValue > 0 ? wonValue / won : null; // snitt kontraktsverdi (kr/mnd) per vunnet
  const paybackMonths = cac != null && avgMonthly > 0 ? cac / avgMonthly : null;

  const save = async () => {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/imported-leads/spend?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meta: Number(draft.meta) || 0,
          google: Number(draft.google) || 0,
          other: Number(draft.other) || 0,
        }),
      });
      const j = await r.json();
      if (j.ok) { setEditing(false); if (onSaved) await onSaved(); }
      else setErr(j.error || 'Lagring feilet');
    } catch (e) { setErr('Nettverksfeil ved lagring'); }
    setBusy(false);
  };

  const fmt0 = (v) => nf.format(Math.round(v));

  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-[#f4f0fb] text-[#8b5cf6] flex items-center justify-center"><BarChart3 className="w-4 h-4" /></span>
          <div>
            <h3 className="text-[15px] font-bold text-[#0a0a0a] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Historisk analyse</h3>
            <p className="text-[12px] text-[#999]">Blandet kostnad per lead/kunde for perioden før sporing — holdes utenfor live ROAS/CAC</p>
          </div>
        </div>
        <button onClick={() => { setEditing((v) => !v); setErr(''); }}
          className={`h-9 px-4 rounded-full text-[12.5px] font-semibold flex items-center gap-1.5 transition-colors ${editing ? 'bg-[#0a0a0a] text-white' : 'bg-[#f5f5f4] text-[#555] hover:bg-[#ecebe9]'}`}>
          <Pencil className="w-3.5 h-3.5" /> {editing ? 'Lukk' : 'Juster forbruk'}
        </button>
      </div>

      {editing && (
        <div className="mb-4 rounded-xl bg-[#faf9f7] p-4">
          <p className="text-[12.5px] text-[#777] mb-3">Registrer hvor mye som ble brukt på annonser <strong>før sporingen startet</strong>. Tallene brukes kun til denne analysen.</p>
          <div className="flex flex-wrap items-end gap-3">
            {[['meta', 'Meta (kr)'], ['google', 'Google Ads (kr)'], ['other', 'Annet (kr)']].map(([k, label]) => (
              <label key={k} className="block">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">{label}</span>
                <input type="number" min="0" value={draft[k]}
                  onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                  className="h-9 w-[130px] rounded-lg bg-white text-[13px] px-3 outline-none ring-1 ring-black/[0.06] focus:ring-2 focus:ring-[#d9c4f5]" />
              </label>
            ))}
            <button onClick={save} disabled={busy}
              className="h-9 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-60">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Lagre
            </button>
          </div>
          {err && <p className="text-[12.5px] text-[#c0392b] mt-2">{err}</p>}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#faf9f7] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#aaa]"><Wallet className="w-3.5 h-3.5 text-[#b98cf7]" /> Historisk forbruk</div>
          <p className="text-[24px] font-bold text-[#0a0a0a] mt-1.5 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{fmt0(totalSpend)} kr</p>
          <p className="text-[11.5px] text-[#999] mt-1.5">Meta {fmt0(Number(spend?.meta) || 0)} · Google {fmt0(Number(spend?.google) || 0)}{(Number(spend?.other) || 0) > 0 ? ` · Annet ${fmt0(Number(spend.other))}` : ''}</p>
        </div>
        <div className="rounded-xl bg-[#faf9f7] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#aaa]"><Calculator className="w-3.5 h-3.5 text-[#b98cf7]" /> Blandet CPL</div>
          <p className="text-[24px] font-bold text-[#0a0a0a] mt-1.5 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{cpl != null ? `${fmt0(cpl)} kr` : '—'}</p>
          <p className="text-[11.5px] text-[#999] mt-1.5">{fmt0(totalSpend)} kr / {total} leads</p>
        </div>
        <div className="rounded-xl bg-[#faf9f7] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#aaa]"><Trophy className="w-3.5 h-3.5 text-[#7fc79e]" /> Historisk CAC</div>
          <p className="text-[24px] font-bold text-[#0a0a0a] mt-1.5 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{cac != null ? `${fmt0(cac)} kr` : '—'}</p>
          <p className="text-[11.5px] text-[#999] mt-1.5">{won > 0 ? `${fmt0(totalSpend)} kr / ${won} vunnet` : 'Ingen vunnede ennå'}</p>
        </div>
        <div className="rounded-xl bg-[#faf9f7] p-4">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#aaa]"><Clock className="w-3.5 h-3.5 text-[#e0b64f]" /> Tilbakebetaling</div>
          <p className="text-[24px] font-bold text-[#0a0a0a] mt-1.5 leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{paybackMonths != null ? `${(Math.round(paybackMonths * 10) / 10).toLocaleString('nb-NO')} mnd` : '—'}</p>
          <p className="text-[11.5px] text-[#999] mt-1.5">{avgMonthly ? `CAC / snittverdi ${fmt0(avgMonthly)} kr/mnd` : 'Krever vunnet verdi'}</p>
        </div>
      </div>

      <p className="text-[11.5px] text-[#b3a8c9] mt-3 leading-relaxed">
        «Blandet» betyr at alle kanaler regnes samlet, siden kilden per lead fra denne perioden ofte er ukjent.
        Setter du kilder manuelt i listen under, forbedres kildefordelingen — men live-KPI-ene på Annonser/Økonomi-fanene påvirkes aldri av historiske tall.
      </p>
    </div>
  );
}
