'use client';

/*
 * SubscribersView — full oversikt over nyhetsbrev-abonnenter.
 * Viser også hvem som KUN er abonnent (ikke lead), avmeldte og engasjement.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Loader2, MailX, BadgeCheck } from 'lucide-react';

export default function SubscribersView({ q, onBack }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const r = await fetch(`/api/admin/newsletter/subscribers?${q}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {}
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async () => {
    if (!/\S+@\S+\.\S+/.test(newEmail)) { setErr('Ugyldig e-postadresse'); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/newsletter/subscribers?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, name: newName }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Feil');
      setNewEmail(''); setNewName('');
      await load();
    } catch (e) { setErr(e.message); }
    setBusy(false);
  };

  const remove = async (email) => {
    if (!confirm(`Fjerne ${email} fra abonnentlisten?`)) return;
    await fetch(`/api/admin/newsletter/subscribers?email=${encodeURIComponent(email)}&${q}`, { method: 'DELETE' });
    await load();
  };

  const rows = useMemo(() => {
    const list = data?.subscribers || [];
    const s = search.trim().toLowerCase();
    return s ? list.filter((r) => (r.email + ' ' + (r.name || '')).toLowerCase().includes(s)) : list;
  }, [data, search]);

  const c = data?.counts || {};

  return (
    <div data-testid="nl-subs-view">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#888] hover:text-[#111]">
        <ArrowLeft size={14} /> Tilbake til nyhetsbrev
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111]">Abonnenter</h2>
          <p className="text-[13px] text-[#999] mt-0.5">Alle som har meldt seg på nyhetsbrevet — uavhengig av om de er leads.</p>
        </div>
        <div className="flex gap-2">
          {[['Totalt', c.total], ['Aktive', c.active], ['Kun abonnent', c.pureSubscribers], ['Avmeldt', c.unsubscribed]].map(([l, v]) => (
            <div key={l} className="rounded-xl border border-[#f0f0f0] bg-white px-3.5 py-2 text-center">
              <p className="text-[17px] font-bold tabular-nums text-[#111]">{v ?? '—'}</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#aaa]">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Legg til manuelt */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-4 mt-6 flex flex-wrap items-center gap-2.5">
        <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="epost@eksempel.no" data-testid="nl-subs-add-email"
          className="h-[38px] w-[240px] rounded-lg border border-[#e8e8e8] px-3 text-[13px] outline-none focus:border-[#c99df0]" />
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Navn (valgfritt)"
          className="h-[38px] w-[190px] rounded-lg border border-[#e8e8e8] px-3 text-[13px] outline-none focus:border-[#c99df0]" />
        <button onClick={add} disabled={busy} data-testid="nl-subs-add-btn"
          className="h-[38px] rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold px-5 flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Legg til abonnent
        </button>
        {err ? <span className="text-[12px] text-red-500">{err}</span> : null}
        <div className="ml-auto relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk…"
            className="h-[38px] w-[200px] rounded-lg border border-[#e8e8e8] pl-8 pr-3 text-[13px] outline-none focus:border-[#c99df0]" />
        </div>
      </div>

      {/* Tabell */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white mt-4 overflow-hidden">
        <div className="grid grid-cols-[1.6fr_1fr_0.8fr_0.9fr_1fr_44px] gap-3 px-5 py-2.5 border-b border-[#f4f4f4] text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#aaa]">
          <span>E-post</span><span>Navn</span><span>Kilde</span><span>Status</span><span>Siste kampanje</span><span />
        </div>
        {!data ? (
          <div className="py-14 text-center text-[#aaa]"><Loader2 size={18} className="animate-spin inline" /></div>
        ) : rows.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-[14px] font-semibold text-[#666]">Ingen abonnenter ennå</p>
            <p className="text-[12.5px] text-[#aaa] mt-1">Påmeldinger fra nettsiden dukker opp her — eller legg til manuelt over.</p>
          </div>
        ) : rows.map((r) => (
          <div key={r.email} className="grid grid-cols-[1.6fr_1fr_0.8fr_0.9fr_1fr_44px] gap-3 px-5 py-3 border-b border-[#fafafa] items-center hover:bg-[#fcfbfa]">
            <span className="text-[13px] font-medium text-[#111] truncate">{r.email}</span>
            <span className="text-[12.5px] text-[#777] truncate">{r.name || '—'}</span>
            <span className="text-[11.5px] text-[#999]">{r.source === 'admin' ? 'Manuelt' : r.source === 'footer' ? 'Nettside' : (r.source || 'Nettside')}</span>
            <span className="flex flex-wrap gap-1">
              {r.unsubscribed
                ? <span className="inline-flex items-center gap-1 rounded-full bg-red-50 text-red-600 text-[10.5px] font-semibold px-2 py-0.5"><MailX size={10} /> Avmeldt</span>
                : <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-semibold px-2 py-0.5">Aktiv</span>}
              {r.isLead ? <span className="inline-flex items-center gap-1 rounded-full bg-[#f5edfc] text-[#7b3fb0] text-[10.5px] font-semibold px-2 py-0.5"><BadgeCheck size={10} /> Lead</span> : null}
            </span>
            <span className="text-[11.5px] text-[#999] truncate">{r.last_campaign || '—'}{r.clicks ? ` · ${r.clicks} klikk` : ''}</span>
            <button onClick={() => remove(r.email)} className="text-[#ccc] hover:text-red-500 justify-self-end" title="Fjern"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
