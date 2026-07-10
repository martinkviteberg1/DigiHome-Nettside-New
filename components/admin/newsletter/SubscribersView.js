'use client';

/*
 * SubscribersView — full oversikt over nyhetsbrev-abonnenter.
 * Viser også hvem som KUN er abonnent (ikke lead), avmeldte og engasjement.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Search, Trash2, Loader2, MailX, BadgeCheck, UserPlus, X } from 'lucide-react';

const STATUS_LABEL = { new: 'Ny', contacted: 'Kontaktet', qualified: 'Kvalifisert', viewing: 'Befaring', offer: 'Tilbud', won: 'Kunde', lost: 'Tapt', disqualified: 'Diskv.' };

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

  // ── «Legg til fra leads»-modal ──────────────────────────────────────────
  const [importOpen, setImportOpen] = useState(false);
  const [cands, setCands] = useState(null); // null = laster
  const [sel, setSel] = useState(() => new Set());
  const [candFilter, setCandFilter] = useState('alle');
  const [candSearch, setCandSearch] = useState('');
  const [importBusy, setImportBusy] = useState(false);
  const [importMsg, setImportMsg] = useState(null);

  const openImport = async () => {
    setImportOpen(true); setCands(null); setSel(new Set()); setCandFilter('alle'); setCandSearch(''); setImportMsg(null);
    try {
      const r = await fetch(`/api/admin/newsletter/subscriber-candidates?${q}`);
      const j = await r.json();
      setCands(j.ok ? j.candidates : []);
    } catch (e) { setCands([]); }
  };

  const filteredCands = useMemo(() => {
    let list = cands || [];
    if (candFilter === 'kunder') list = list.filter((c) => c.type === 'lead' && c.status === 'won');
    else if (candFilter === 'leads') list = list.filter((c) => c.type === 'lead' && c.status !== 'won');
    else if (candFilter === 'leietakere') list = list.filter((c) => c.type === 'tenant');
    const s = candSearch.trim().toLowerCase();
    if (s) list = list.filter((c) => (c.email + ' ' + (c.name || '')).toLowerCase().includes(s));
    return list;
  }, [cands, candFilter, candSearch]);

  const selectable = useMemo(() => filteredCands.filter((c) => !c.alreadySubscriber && !c.unsubscribed), [filteredCands]);
  const allSelected = selectable.length > 0 && selectable.every((c) => sel.has(c.email));

  const toggleOne = (email) => setSel((prev) => {
    const n = new Set(prev);
    if (n.has(email)) n.delete(email); else n.add(email);
    return n;
  });
  const toggleAll = () => setSel((prev) => {
    const n = new Set(prev);
    if (allSelected) selectable.forEach((c) => n.delete(c.email));
    else selectable.forEach((c) => n.add(c.email));
    return n;
  });

  const doImport = async () => {
    const items = (cands || []).filter((c) => sel.has(c.email)).map((c) => ({ email: c.email, name: c.name }));
    if (!items.length) return;
    setImportBusy(true); setImportMsg(null);
    try {
      const r = await fetch(`/api/admin/newsletter/subscribers/import?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Import feilet');
      setImportMsg(j);
      setSel(new Set());
      await load();
      // Oppdater kandidatlisten så nye abonnenter vises som «Abonnent»
      try {
        const r2 = await fetch(`/api/admin/newsletter/subscriber-candidates?${q}`);
        const j2 = await r2.json();
        if (j2.ok) setCands(j2.candidates);
      } catch (e) {}
    } catch (e) { setImportMsg({ ok: false, error: e.message }); }
    setImportBusy(false);
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
        <button onClick={openImport} data-testid="nl-import-open"
          className="h-[38px] rounded-full bg-white border border-[#e3d7f8] text-[#7b3fb0] text-[12.5px] font-semibold px-4 flex items-center gap-1.5 hover:bg-[#faf7fe]">
          <UserPlus size={13} /> Legg til fra leads
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

      {/* «Legg til fra leads»-modal */}
      {importOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => !importBusy && setImportOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 flex flex-col max-h-[85vh]" data-testid="nl-import-modal">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[17px] font-bold text-[#111]">Legg til abonnenter fra leads</h3>
                <p className="text-[12.5px] text-[#888] mt-0.5 leading-relaxed">
                  Velg hvem fra CRM-et som skal inn i abonnentlisten. Avmeldte kan aldri legges til
                  (avmeldingsønsket respekteres alltid), og eksisterende abonnenter hoppes over.
                </p>
              </div>
              <button onClick={() => !importBusy && setImportOpen(false)} className="text-[#bbb] hover:text-[#111] shrink-0 mt-0.5"><X size={18} /></button>
            </div>

            {/* Filtre + søk */}
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {[['alle', 'Alle'], ['kunder', 'Kunder'], ['leads', 'Utleier-leads'], ['leietakere', 'Leietakere']].map(([k, l]) => (
                <button key={k} onClick={() => setCandFilter(k)}
                  className={`h-8 px-3.5 rounded-full text-[12px] font-semibold transition-colors ${candFilter === k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#666] hover:bg-[#ece9e4]'}`}>
                  {l}
                </button>
              ))}
              <div className="ml-auto relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
                <input value={candSearch} onChange={(e) => setCandSearch(e.target.value)} placeholder="Søk navn/e-post …"
                  className="h-8 w-[190px] rounded-lg border border-[#e8e8e8] pl-8 pr-3 text-[12.5px] outline-none focus:border-[#c99df0]" />
              </div>
            </div>

            {/* Velg alle + teller */}
            <div className="flex items-center justify-between mt-3 px-1">
              <label className="flex items-center gap-2 text-[12.5px] font-semibold text-[#555] cursor-pointer select-none">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectable.length === 0} className="accent-[#8b5cf6]" data-testid="nl-import-select-all" />
                Velg alle valgbare ({selectable.length})
              </label>
              <span className="text-[12px] text-[#aaa]">{sel.size} valgt · {filteredCands.length} treff</span>
            </div>

            {/* Kandidatliste */}
            <div className="mt-2 rounded-xl border border-[#eee] divide-y divide-[#f6f6f6] overflow-y-auto flex-1 min-h-[180px]">
              {cands === null ? (
                <div className="py-14 text-center text-[#aaa]"><Loader2 size={18} className="animate-spin inline" /> <span className="text-[12.5px] ml-1">Henter leads …</span></div>
              ) : filteredCands.length === 0 ? (
                <div className="py-14 text-center text-[12.5px] text-[#aaa]">Ingen treff</div>
              ) : filteredCands.map((c) => {
                const disabled = c.alreadySubscriber || c.unsubscribed;
                return (
                  <label key={c.email} data-testid={`nl-import-row-${c.email}`}
                    className={`flex items-center gap-3 px-3.5 py-2.5 ${disabled ? 'opacity-55 cursor-not-allowed bg-[#fafafa]' : 'cursor-pointer hover:bg-[#fcfbfa]'}`}>
                    <input type="checkbox" disabled={disabled} checked={sel.has(c.email)} onChange={() => toggleOne(c.email)} className="accent-[#8b5cf6] shrink-0" />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium text-[#111] truncate">{c.name || c.email}</span>
                      {c.name ? <span className="block text-[11.5px] text-[#999] truncate">{c.email}</span> : null}
                    </span>
                    <span className={`text-[10.5px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${c.status === 'won' ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4f0fb] text-[#8b5cf6]'}`}>
                      {c.type === 'tenant' ? 'Leietaker' : (STATUS_LABEL[c.status] || c.status)}
                    </span>
                    {c.alreadySubscriber && <span className="text-[10.5px] font-semibold text-[#999] bg-[#f0f0ef] rounded-full px-2 py-0.5 shrink-0">Abonnent</span>}
                    {c.unsubscribed && <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-red-500 bg-red-50 rounded-full px-2 py-0.5 shrink-0"><MailX size={10} /> Avmeldt</span>}
                  </label>
                );
              })}
            </div>

            {/* Resultat + handlinger */}
            <div className="flex items-center justify-between gap-3 mt-4">
              <span className="text-[12px] min-w-0 truncate" data-testid="nl-import-result">
                {importMsg ? (importMsg.ok
                  ? <span className="text-emerald-600 font-semibold">La til {importMsg.added} ny{importMsg.added === 1 ? '' : 'e'}{importMsg.already ? ` · ${importMsg.already} fantes fra før` : ''}{importMsg.skippedOptout ? ` · ${importMsg.skippedOptout} avmeldt (hoppet over)` : ''}</span>
                  : <span className="text-red-500 font-semibold">{importMsg.error}</span>) : null}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setImportOpen(false)} disabled={importBusy}
                  className="h-10 px-4 rounded-full text-[13px] font-semibold text-[#666] hover:bg-[#f4f4f2] transition-colors">Lukk</button>
                <button onClick={doImport} disabled={importBusy || sel.size === 0} data-testid="nl-import-submit"
                  className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold disabled:opacity-40 flex items-center gap-2 active:scale-[0.97] transition-transform">
                  {importBusy ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Legg til {sel.size > 0 ? `(${sel.size})` : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
