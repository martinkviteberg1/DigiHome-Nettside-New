'use client';

// Pipeline-visning (kanban) for leads — speiler salgspipelinen i CRM-plattformen.
// Dra et kort til en ny kolonne → status oppdateres via samme mekanisme som
// listevisningen (doSetStatus): toveis CRM-synk via utboksen, «Vunnet» spør om
// kontraktsverdi, historiske leads rutes til imported-leads-endepunktet.
// Bevisst HTML5 drag & drop (null nye avhengigheter) — på mobil/touch endres
// status via kortet (drawer) eller listevisningen.

import React, { useMemo, useRef, useState } from 'react';
import { Loader2, History, CheckCircle2, AlertCircle, Home, MapPin, FileSpreadsheet } from 'lucide-react';

const COLUMNS = [
  { k: 'new', l: 'Ny', dot: '#64748b' },
  { k: 'contacted', l: 'Kontaktet', dot: '#0ea5e9' },
  { k: 'qualified', l: 'Kvalifisert', dot: '#8b5cf6' },
  { k: 'viewing', l: 'Befaring', dot: '#3b82f6' },
  { k: 'offer', l: 'Tilbud sendt', dot: '#6366f1' },
  { k: 'won', l: 'Vunnet', dot: '#10b981' },
  { k: 'lost', l: 'Tapt', dot: '#f43f5e', muted: true },
  { k: 'disqualified', l: 'Diskvalifisert', dot: '#a3a3a3', muted: true },
];

const fmtKr = (n) => {
  try { return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(n) + ' kr'; } catch (e) { return `${n} kr`; }
};

const daysAgo = (iso) => {
  if (!iso) return null;
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!isFinite(d) || d < 0) return null;
  return d === 0 ? 'i dag' : d === 1 ? '1 d' : `${d} d`;
};

const initials = (name) => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '–';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};

export default function LeadsPipeline({ rows, type, loading, busyId, onOpen, onSetStatus, onExport, exporting, filtered }) {
  const [dragId, setDragId] = useState('');
  const [overCol, setOverCol] = useState('');
  // Klikk-vakt: ikke åpne drawer rett etter et drag
  const draggedAt = useRef(0);

  const byStatus = useMemo(() => {
    const map = {};
    COLUMNS.forEach((c) => { map[c.k] = []; });
    (rows || []).forEach((r) => {
      const s = r.status || 'new';
      (map[s] || map.new).push(r);
    });
    return map;
  }, [rows]);

  const wonSum = useMemo(
    () => (byStatus.won || []).reduce((acc, r) => acc + (Number(r.wonValue || r.won_value) || 0), 0),
    [byStatus]
  );

  const handleDrop = (e, colKey) => {
    e.preventDefault();
    setOverCol('');
    const id = e.dataTransfer.getData('text/plain') || dragId;
    setDragId('');
    if (!id) return;
    const row = (rows || []).find((r) => r.id === id);
    if (!row || (row.status || 'new') === colKey) return;
    draggedAt.current = Date.now();
    onSetStatus(id, colKey, type);
  };

  if (loading && (!rows || rows.length === 0)) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.slice(0, 5).map((c) => (
          <div key={c.k} className="w-[268px] shrink-0 bg-[#f1efec] rounded-2xl p-3">
            <div className="shimmer h-4 rounded w-24 mb-3" />
            {[0, 1].map((i) => <div key={i} className="shimmer h-[88px] rounded-xl mb-2.5" />)}
          </div>
        ))}
      </div>
    );
  }

  const total = (rows || []).length;

  return (
    <div data-testid="leads-pipeline">
      {/* Verktøylinje for tavlen — eksport av det som faktisk vises (filtre respekteres) */}
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <span className="text-[11.5px] text-[#b3aea7] font-medium">
          {total} {type === 'tenant' ? 'leietaker' : 'utleier'}-lead{total === 1 ? '' : 's'}
          {filtered ? ' (filtrert)' : ''} · dra kort for å endre status
        </span>
        {onExport && (
          <button
            data-testid="pipeline-export-btn"
            onClick={onExport}
            disabled={exporting || total === 0}
            title={filtered ? 'Eksporterer kun de filtrerte leadsene på tavlen' : 'Eksporter alle leads på tavlen — åpnes i Excel (æøå støttes)'}
            className="h-8 pl-3 pr-3.5 rounded-full bg-white border border-[#e8e4de] text-[12px] font-semibold text-[#3a3a3a] flex items-center gap-1.5 hover:border-[#cf97fc] hover:text-[#8b5cf6] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] transition-all shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            {exporting ? 'Eksporterer …' : `Eksporter til Excel${filtered ? ` (${total})` : ''}`}
          </button>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3 items-start">
      {COLUMNS.map((col) => {
        const cards = byStatus[col.k] || [];
        const isOver = overCol === col.k;
        return (
          <div
            key={col.k}
            data-testid={`pipeline-col-${col.k}`}
            onDragOver={(e) => { e.preventDefault(); if (overCol !== col.k) setOverCol(col.k); }}
            onDragLeave={(e) => { if (e.currentTarget.contains(e.relatedTarget)) return; setOverCol((c) => (c === col.k ? '' : c)); }}
            onDrop={(e) => handleDrop(e, col.k)}
            className={`w-[268px] shrink-0 rounded-2xl p-2.5 transition-all duration-150 ${col.muted && cards.length === 0 ? 'opacity-70' : ''} ${isOver ? 'bg-[#f0e9fb] ring-2 ring-[#cf97fc]' : 'bg-[#f1efec]'}`}
          >
            {/* Kolonneheader */}
            <div className="flex items-center gap-2 px-1.5 pt-1 pb-2.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col.dot }} />
              <span className="text-[12.5px] font-bold text-[#3a3a3a] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>{col.l}</span>
              <span className="text-[11px] font-bold text-[#999] bg-white rounded-full px-1.5 py-0.5 leading-none">{cards.length}</span>
              {col.k === 'won' && wonSum > 0 && (
                <span className="ml-auto text-[10.5px] font-bold text-emerald-600 whitespace-nowrap">{fmtKr(wonSum)}/mnd</span>
              )}
            </div>

            {/* Kort — intern rulling per kolonne (som ekte kanban) så slipp
                alltid treffer synlig område selv med mange kort */}
            <div className="space-y-2 min-h-[64px] max-h-[calc(100vh-380px)] overflow-y-auto pr-0.5 -mr-0.5">
              {cards.length === 0 && (
                <div className={`rounded-xl border-2 border-dashed py-5 text-center text-[11.5px] font-medium transition-colors ${isOver ? 'border-[#cf97fc] text-[#8b5cf6]' : 'border-[#e2ded8] text-[#b8b3ac]'}`}>
                  {isOver ? 'Slipp her' : 'Ingen leads'}
                </div>
              )}
              {cards.map((r) => {
                const isImp = r.pre_tracking === true;
                const chan = (r.attribution && r.attribution.channel) || r.channel || r.source || '';
                const reEng = Array.isArray(r.re_engaged) && r.re_engaged.length > 0;
                const busy = busyId === r.id;
                const inStage = daysAgo(r.statusUpdatedAt || r.createdAt);
                const won = col.k === 'won' && Number(r.wonValue || r.won_value) > 0;
                return (
                  <div
                    key={r.id}
                    draggable
                    data-testid={`pipeline-card-${r.id}`}
                    onDragStart={(e) => { setDragId(r.id); try { e.dataTransfer.setData('text/plain', r.id); e.dataTransfer.effectAllowed = 'move'; } catch (err) {} }}
                    onDragEnd={() => { setDragId(''); setOverCol(''); draggedAt.current = Date.now(); }}
                    onClick={() => { if (Date.now() - draggedAt.current < 250) return; onOpen(r); }}
                    className={`bg-white rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.05)] border border-black/[0.03] cursor-grab active:cursor-grabbing hover:shadow-[0_6px_18px_rgba(0,0,0,0.08)] hover:-translate-y-[1px] transition-all select-none ${dragId === r.id ? 'opacity-40 rotate-[1.5deg]' : ''} ${busy ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className="w-7 h-7 rounded-full bg-[#f4f0fb] text-[#8b5cf6] text-[10.5px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                        {initials(r.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-[#1f1f1f] truncate leading-tight">{r.name || r.email || '—'}</p>
                        <p className="text-[11.5px] text-[#999] truncate mt-0.5 flex items-center gap-1">
                          {type === 'tenant'
                            ? (<><MapPin className="w-3 h-3 shrink-0" /> {r.preferred_area || '—'}</>)
                            : (<><Home className="w-3 h-3 shrink-0" /> {r.address || '—'}</>)}
                        </p>
                      </div>
                      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#bbb] shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      {won && <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">{fmtKr(Number(r.wonValue || r.won_value))}/mnd</span>}
                      {chan && <span className="text-[10px] font-semibold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-1.5 py-0.5 truncate max-w-[110px]">{chan}</span>}
                      {r.self_service && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5" title="Selvforvaltning — avtale akseptert digitalt i skjemaet, hoppet rett til Kunde">Selvbetjent</span>}
                      {isImp && <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#8b5cf6]" title="Historisk lead — endringer synkes til CRM-et"><History className="w-3 h-3" /> Historisk</span>}
                      {reEng && <span className="text-[10px] font-bold text-orange-700 bg-orange-50 rounded-full px-1.5 py-0.5" title="Bekreftet interesse på nytt">Interesse igjen{r.re_engaged.length > 1 ? ` ×${r.re_engaged.length}` : ''}</span>}
                      <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] text-[#b3aea7]" title={r.statusUpdatedAt ? 'Tid i dette steget' : 'Tid siden mottatt'}>
                        {inStage}
                        {!isImp && (r.self_service
                          ? <CheckCircle2 className="w-3 h-3 text-emerald-500" title="Selvforvaltning provisjonert via kontobroen" />
                          : r.forwarded === true && r.platform_id
                            ? <CheckCircle2 className="w-3 h-3 text-emerald-500" title="CRM-levering verifisert med platform_id" />
                            : r.forwarded === true
                              ? <AlertCircle className="w-3 h-3 text-amber-500" title="Ubekreftet levering — mangler platform_id; send på nytt" />
                              : <AlertCircle className="w-3 h-3 text-amber-500" title="Venter på CRM-sending" />)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
