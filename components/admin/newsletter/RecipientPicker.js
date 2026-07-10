'use client';

import React, { useMemo, useState } from 'react';
import { X, Search, Loader2, CheckCircle2, MinusCircle, History, Users } from 'lucide-react';

const SEG_LABEL = { kunder: 'Kunde', abonnenter: 'Abonnent', leads: 'Utleier-lead', leietakere: 'Leietaker', manuell: 'Manuell' };
const STATUS_META = {
  new: { l: 'Ny', cls: 'text-[#555] bg-[#f3f3f3]' },
  contacted: { l: 'Kontaktet', cls: 'text-sky-700 bg-sky-50' },
  qualified: { l: 'Kvalifisert', cls: 'text-violet-700 bg-violet-50' },
  viewing: { l: 'Befaring', cls: 'text-blue-700 bg-blue-50' },
  offer: { l: 'Tilbud sendt', cls: 'text-indigo-700 bg-indigo-50' },
  won: { l: 'Kunde', cls: 'text-emerald-700 bg-emerald-50' },
};

export default function RecipientPicker({ open, onClose, recips, loading, excludedSet, onToggle, onBulk, netCount }) {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('alle');
  const [segFilter, setSegFilter] = useState('alle');
  const [showExcluded, setShowExcluded] = useState(true);

  const all = recips?.recipients || [];

  // Dynamiske filter-chips basert på hva som faktisk finnes i utvalget
  const statusesPresent = useMemo(() => {
    const s = new Set(all.map((r) => r.status).filter((x) => STATUS_META[x]));
    return ['new', 'contacted', 'qualified', 'viewing', 'offer', 'won'].filter((x) => s.has(x));
  }, [all]);
  const segsPresent = useMemo(() => {
    const s = new Set(all.map((r) => r.segment));
    return Object.keys(SEG_LABEL).filter((x) => s.has(x));
  }, [all]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return all.filter((r) => {
      if (statusFilter !== 'alle' && r.status !== statusFilter) return false;
      if (segFilter !== 'alle' && r.segment !== segFilter) return false;
      if (!showExcluded && excludedSet.has(r.email)) return false;
      if (needle && !(r.email + ' ' + (r.name || '')).toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [all, q, statusFilter, segFilter, showExcluded, excludedSet]);

  const includedTotal = all.filter((r) => !excludedSet.has(r.email)).length;
  const shownIncluded = filtered.filter((r) => !excludedSet.has(r.email)).length;
  const allShownIncluded = filtered.length > 0 && shownIncluded === filtered.length;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[88vh]" data-testid="nl-recipient-picker">
        {/* Topp */}
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[#f2f0ed]">
          <div>
            <h3 className="text-[17px] font-bold text-[#111] flex items-center gap-2"><Users size={16} className="text-[#8b5cf6]" /> Velg mottakere</h3>
            <p className="text-[12px] text-[#999] mt-0.5">Klikk på en rad for å inkludere/ekskludere. Statusen viser hvor leaden står i pipelinen akkurat nå.</p>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#111] shrink-0 mt-1" data-testid="nl-picker-close"><X size={18} /></button>
        </div>

        {/* Verktøylinje */}
        <div className="px-6 pt-3 space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={() => setStatusFilter('alle')}
              className={`h-7 px-3 rounded-full text-[11.5px] font-semibold ${statusFilter === 'alle' ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>
              Alle statuser
            </button>
            {statusesPresent.map((s) => (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'alle' : s)}
                className={`h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors ${statusFilter === s ? 'bg-[#0a0a0a] text-white' : STATUS_META[s].cls}`}>
                {STATUS_META[s].l} <span className="opacity-60">({all.filter((r) => r.status === s).length})</span>
              </button>
            ))}
            {segsPresent.length > 1 && <span className="mx-1 h-4 w-px bg-[#eee]" />}
            {segsPresent.length > 1 && segsPresent.map((s) => (
              <button key={s} onClick={() => setSegFilter(segFilter === s ? 'alle' : s)}
                className={`h-7 px-3 rounded-full text-[11.5px] font-semibold ${segFilter === s ? 'bg-[#8b5cf6] text-white' : 'bg-[#f4f0fb] text-[#8b5cf6]'}`}>
                {SEG_LABEL[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#bbb]" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk navn eller e-post …" data-testid="nl-picker-search"
                className="w-full h-9 rounded-lg border border-[#e8e8e8] pl-8 pr-3 text-[12.5px] outline-none focus:border-[#c99df0]" />
            </div>
            <label className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#777] cursor-pointer select-none shrink-0">
              <input type="checkbox" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} className="accent-[#8b5cf6]" />
              Vis ekskluderte
            </label>
            <button onClick={() => onBulk(filtered.map((r) => r.email), allShownIncluded)} disabled={filtered.length === 0} data-testid="nl-picker-bulk"
              className="h-9 px-3.5 rounded-full bg-[#f4f2ef] hover:bg-[#ece9e4] text-[12px] font-semibold text-[#555] shrink-0 disabled:opacity-40">
              {allShownIncluded ? `Ekskluder viste (${filtered.length})` : `Inkluder viste (${filtered.length})`}
            </button>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[240px]">
          {loading || !recips ? (
            <div className="py-16 text-center text-[#aaa] text-[13px]"><Loader2 size={16} className="animate-spin inline mr-1.5" /> Henter mottakere …</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-[12.5px] text-[#aaa]">{all.length === 0 ? 'Velg minst én målgruppe i panelet først.' : 'Ingen treff med gjeldende filtre.'}</div>
          ) : (
            <div className="divide-y divide-[#f7f6f4]">
              {filtered.slice(0, 600).map((r) => {
                const off = excludedSet.has(r.email);
                const sm = STATUS_META[r.status];
                return (
                  <button key={r.email} onClick={() => onToggle(r.email)} data-testid={`nl-picker-row-${r.email}`}
                    className={`w-full flex items-center gap-3 py-2.5 px-1.5 text-left rounded-lg transition-colors ${off ? 'opacity-50 hover:opacity-70' : 'hover:bg-[#fcfbfa]'}`}>
                    {off
                      ? <MinusCircle size={16} className="text-red-400 shrink-0" />
                      : <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[13px] font-medium truncate ${off ? 'line-through text-[#999]' : 'text-[#1c1c1c]'}`}>{r.name || r.email}</span>
                      {r.name ? <span className="block text-[11px] text-[#aaa] truncate">{r.email}</span> : null}
                    </span>
                    {r.channel && !['unknown', ''].includes(r.channel) && (
                      <span className="text-[10.5px] text-[#b3aea7] shrink-0 hidden sm:block">{r.channel}</span>
                    )}
                    {r.historic && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-2 py-0.5 shrink-0" title="Historisk lead (Historikk-synken)"><History size={9} /> historisk</span>
                    )}
                    {sm
                      ? <span className={`text-[10.5px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${sm.cls}`}>{sm.l}</span>
                      : <span className="text-[10.5px] font-semibold rounded-full px-2 py-0.5 shrink-0 text-[#888] bg-[#f4f2ef]">{SEG_LABEL[r.segment] || r.segment}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bunn */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#f2f0ed]">
          <p className="text-[12.5px] text-[#777]" data-testid="nl-picker-count">
            <span className="font-bold text-[#0a0a0a]">{netCount != null ? netCount : includedTotal}</span> mottakere netto
            {excludedSet.size > 0 ? <span className="text-[#bbb]"> · {excludedSet.size} ekskludert manuelt</span> : null}
          </p>
          <button onClick={onClose} data-testid="nl-picker-done"
            className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold active:scale-[0.97] transition-transform">Ferdig</button>
        </div>
      </div>
    </div>
  );
}
