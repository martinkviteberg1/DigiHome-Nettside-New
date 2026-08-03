'use client';

// ---------------------------------------------------------------------------
// KPI-DETALJMODAL — responsiv: bunn-ark på mobil, dialog på desktop.
// Tre faner slik at man ikke må rulle gjennom alt: Utregning · Kunder & enheter
// · Definisjon. Esc lukker, ←/→ blar mellom nøkkeltall.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, ChevronLeft, ChevronRight, Copy, Check, Calculator, Database,
  AlertTriangle, ListTree, Link2, Info, Clock, Building2, BookOpen,
} from 'lucide-react';
import {
  FMT, QUALITY, DRILLABLE, num, num1, kr, VIOLET, VIOLET_DEEP, EMER_TEXT,
} from './format';
import { Section, FormulaBlock, InputRows, IncludeExclude, Caveats, PreviewTable, TabBar } from './ui';
import { CustomerDrill } from './Drill';

function toPlainText(e, valueText) {
  const L = [`${e.title} — ${valueText}`];
  if (e.windowLabel) L.push(`Periode: ${e.windowLabel}`);
  if (e.formula) {
    L.push('', `Formel: ${e.formula.text}`);
    L.push(`${(e.formula.terms || []).map((t) => `${t.op ? `${t.op} ` : ''}${t.label} ${t.value}`).join('  ')} = ${e.formula.result}`);
  }
  if ((e.inputs || []).length) {
    L.push('', 'Tallene bak:');
    e.inputs.forEach((r) => L.push(`  · ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ''}`));
  }
  if ((e.caveats || []).length) {
    L.push('', 'Forbehold:');
    e.caveats.forEach((c) => L.push(`  · ${c}`));
  }
  if ((e.sources || []).length) L.push('', `Kilder: ${e.sources.join(' · ')}`);
  return L.join('\n');
}

export function KpiDetailModal({ explainers = [], activeId, apiKey, days, onClose, onNavigate }) {
  const idx = Math.max(0, explainers.findIndex((x) => x.id === activeId));
  const e = explainers[idx];
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('calc');
  const [drillCount, setDrillCount] = useState(null);
  const bodyRef = useRef(null);
  const sheetRef = useRef(null);

  const go = useCallback((d) => {
    const n = explainers.length;
    if (!n) return;
    onNavigate(explainers[(idx + d + n) % n].id);
  }, [explainers, idx, onNavigate]);

  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'Escape') { ev.preventDefault(); onClose(); return; }
      const inField = ['INPUT', 'TEXTAREA'].includes(ev.target?.tagName);
      if (inField) return;
      if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose, go]);

  useEffect(() => {
    setCopied(false); setTab('calc'); setDrillCount(null);
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
    if (sheetRef.current) sheetRef.current.focus({ preventScroll: true });
  }, [activeId]);

  const valueText = useMemo(() => {
    if (!e) return '—';
    if (e.value == null) return '—';
    if (e.format === 'kr') return `${num(e.value)}${e.suffix ? ` ${e.suffix}` : ' kr'}`;
    if (e.format === 'ratio') return FMT.ratio(e.value);
    const f = FMT[e.format] || FMT.text;
    return `${f(e.value)}${e.suffix ? ` ${e.suffix}` : ''}`;
  }, [e]);

  if (!e) return null;
  const q = QUALITY[e.quality] || QUALITY.activity;
  const hasDrill = DRILLABLE.has(e.id) || !!(e.drill && (e.drill.rows || []).length);
  const tabs = [
    { id: 'calc', label: 'Utregning', icon: Calculator },
    ...(hasDrill ? [{ id: 'drill', label: 'Kunder & enheter', icon: Building2, count: drillCount }] : []),
    { id: 'def', label: 'Definisjon', icon: BookOpen },
  ];

  const copy = async () => {
    try { await navigator.clipboard.writeText(toPlainText(e, valueText)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch (_) { /* utenfor sikker kontekst */ }
  };

  const prevE = explainers[(idx - 1 + explainers.length) % explainers.length];
  const nextE = explainers[(idx + 1) % explainers.length];
  const deltaGood = e.delta == null ? null : (e.inverse ? e.delta < 0 : e.delta > 0);

  const node = (
    <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-6"
      data-testid="kpi-detail-modal" role="dialog" aria-modal="true" aria-label={e.title}>
      <style>{`
        @keyframes kpiSheetIn { from { opacity:0; transform: translateY(28px) } to { opacity:1; transform:none } }
        @keyframes kpiDialogIn { from { opacity:0; transform: translateY(14px) scale(.985) } to { opacity:1; transform:none } }
        @keyframes kpiFadeIn { from { opacity:0 } to { opacity:1 } }
        .kpi-sheet { animation: kpiSheetIn .34s cubic-bezier(0.16,1,0.3,1) }
        @media (min-width: 640px) { .kpi-sheet { animation: kpiDialogIn .28s cubic-bezier(0.16,1,0.3,1) } }
        @media (prefers-reduced-motion: reduce) { .kpi-sheet, .kpi-veil { animation: none } }
      `}</style>

      <div className="kpi-veil absolute inset-0 bg-[#16141D]/50 backdrop-blur-[5px]" style={{ animation: 'kpiFadeIn .2s ease-out' }} onClick={onClose} />

      <div ref={sheetRef} tabIndex={-1}
        className="kpi-sheet relative w-full sm:max-w-[760px] flex flex-col overflow-hidden bg-white outline-none rounded-t-[26px] sm:rounded-[26px] border border-black/[0.07] shadow-[0_40px_120px_-24px_rgba(16,14,24,0.45)]"
        style={{ maxHeight: 'min(94dvh, 900px)' }}>

        {/* Grabber — kun mobil */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0" onClick={onClose}>
          <span className="h-1 w-10 rounded-full bg-black/15" />
        </div>

        {/* ---------------- HEADER ---------------- */}
        <header className="relative shrink-0 px-4 sm:px-7 pt-3 sm:pt-6 pb-4 border-b border-black/[0.06]"
          style={{ background: `linear-gradient(150deg, ${q.tint} 0%, rgba(255,255,255,0) 58%), #fff` }}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.1em] border"
                  style={{ color: q.text, background: q.bg, borderColor: q.border }} title={q.help} data-testid="kpi-detail-quality">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: q.dot }} />{q.label}
                </span>
                <span className="text-[9.5px] font-bold uppercase tracking-[0.14em] text-[#B0AEB8]">{e.group}</span>
                {e.badge && <span className="rounded-full px-2 py-0.5 text-[9.5px] font-bold" style={{ color: e.badge.color, background: `${e.badge.color}16` }}>{e.badge.label}</span>}
              </div>
              <h3 data-testid="kpi-detail-title"
                className="mt-2 text-[#16141D] font-bold tracking-[-0.025em] leading-[1.12] text-balance text-[18px] sm:text-[22px]"
                style={{ fontFamily: 'var(--font-heading)' }}>{e.title}</h3>
              {e.question && <p className="mt-1 text-[12px] sm:text-[13px] text-[#8B8894] leading-snug text-pretty">{e.question}</p>}
            </div>
            <button onClick={onClose} aria-label="Lukk" data-testid="kpi-detail-close"
              className="shrink-0 h-9 w-9 rounded-full bg-white/80 border border-black/[0.08] text-[#8B8894] hover:text-[#16141D] hover:border-black/[0.2] grid place-items-center transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="mt-3.5 flex flex-wrap items-end gap-x-3 gap-y-1.5">
            <p data-testid="kpi-detail-value" className="text-[#16141D] font-bold tabular-nums tracking-[-0.04em] leading-none"
              style={{ fontSize: 'clamp(2rem, 8.5vw, 3rem)' }}>{valueText}</p>
            {e.delta != null && (
              <span className={`mb-1 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${e.delta === 0 ? 'text-[#8B8894] bg-black/[0.05]' : deltaGood ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                {e.delta > 0 ? '+' : e.delta < 0 ? '−' : ''}{Math.abs(e.delta)} % vs forrige
              </span>
            )}
          </div>

          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] sm:text-[11px] text-[#A5A3AF] leading-snug text-pretty">
            <Clock className="w-3.5 h-3.5 mt-[1px] shrink-0 text-[#C9C7D1]" />
            <span><b className="font-semibold text-[#8B8894]">{e.windowLabel}</b>{e.windowNote ? ` — ${e.windowNote}` : ''}</span>
          </p>
        </header>

        {/* ---------------- FANER ---------------- */}
        <div className="shrink-0 px-4 sm:px-7 py-2.5 border-b border-black/[0.05] bg-white/95 backdrop-blur-sm">
          <TabBar tabs={tabs} active={tab} onChange={setTab} testid="kpi-detail-tabs" />
        </div>

        {/* ---------------- INNHOLD ---------------- */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-7 py-5 space-y-6">
          {tab === 'calc' && (
            <>
              <Section icon={Calculator} title="Slik regnes det"
                action={(
                  <button onClick={copy} data-testid="kpi-detail-copy"
                    className="inline-flex items-center gap-1 rounded-full bg-black/[0.04] hover:bg-black/[0.08] px-2.5 py-1 text-[10.5px] font-semibold text-[#514E5A] transition-colors">
                    {copied ? <><Check className="w-3 h-3" style={{ color: EMER_TEXT }} /> Kopiert</> : <><Copy className="w-3 h-3" /> Kopier</>}
                  </button>
                )}>
                <FormulaBlock formula={e.formula} />
              </Section>

              <div className={`grid gap-5 ${(e.caveats || []).length ? 'lg:grid-cols-[1.35fr_1fr]' : ''}`}>
                {(e.inputs || []).length > 0 && (
                  <Section icon={Database} title="Tallene bak"><InputRows inputs={e.inputs} /></Section>
                )}
                {(e.caveats || []).length > 0 && (
                  <Section icon={AlertTriangle} title="Forbehold"><Caveats items={e.caveats} /></Section>
                )}
              </div>
            </>
          )}

          {tab === 'drill' && (
            <>
              {e.drill && (e.drill.rows || []).length > 0 && (
                <Section icon={ListTree} title={e.drill.title || 'Radene bak tallet'}>
                  <PreviewTable drill={e.drill} />
                </Section>
              )}
              {DRILLABLE.has(e.id) && (
                <Section icon={Building2} title="Kunde for kunde">
                  <CustomerDrill metric={e.id} apiKey={apiKey} days={days}
                    onLoaded={(d) => setDrillCount(d?.totals?.groups ?? null)} />
                </Section>
              )}
            </>
          )}

          {tab === 'def' && (
            <>
              <Section icon={ListTree} title="Hva er med — og hva er ikke">
                <IncludeExclude includes={e.includes} excludes={e.excludes} />
              </Section>
              <Section icon={Info} title="Datakilder">
                <div className="flex flex-wrap gap-1.5">
                  {(e.sources || []).map((s, i) => (
                    <span key={i} className="rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px] text-[#67646F]">{s}</span>
                  ))}
                </div>
                {(e.links || []).length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] text-[#A5A3AF]"><Link2 className="w-3.5 h-3.5" /> Se også:</span>
                    {e.links.filter((l) => explainers.some((x) => x.id === l.id)).map((l) => (
                      <button key={l.id} onClick={() => onNavigate(l.id)}
                        className="rounded-full border border-[#7C5CF0]/25 bg-[#7C5CF0]/[0.06] hover:bg-[#7C5CF0]/[0.13] px-2.5 py-1 text-[11px] font-semibold transition-colors"
                        style={{ color: VIOLET_DEEP }}>{l.label}</button>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}
        </div>

        {/* ---------------- FOTNAVIGASJON ---------------- */}
        <nav className="shrink-0 flex items-center gap-1 px-2 sm:px-4 py-2 border-t border-black/[0.06] bg-white"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <button onClick={() => go(-1)} data-testid="kpi-detail-prev" aria-label={`Forrige: ${prevE?.title}`}
            className="group min-w-0 flex-1 flex items-center gap-2 rounded-xl px-2.5 py-2 text-left hover:bg-black/[0.03] transition-colors">
            <ChevronLeft className="w-4 h-4 shrink-0 text-[#A5A3AF] group-hover:-translate-x-0.5 transition-transform" />
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.11em] text-[#C9C7D1]">Forrige</span>
              <span className="block text-[11.5px] font-semibold text-[#514E5A] truncate">{prevE?.title}</span>
            </span>
          </button>
          <span className="shrink-0 px-1.5 text-[10.5px] text-[#C9C7D1] tabular-nums">{idx + 1}/{explainers.length}</span>
          <button onClick={() => go(1)} data-testid="kpi-detail-next" aria-label={`Neste: ${nextE?.title}`}
            className="group min-w-0 flex-1 flex items-center justify-end gap-2 rounded-xl px-2.5 py-2 text-right hover:bg-black/[0.03] transition-colors">
            <span className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.11em] text-[#C9C7D1]">Neste</span>
              <span className="block text-[11.5px] font-semibold text-[#514E5A] truncate">{nextE?.title}</span>
            </span>
            <ChevronRight className="w-4 h-4 shrink-0 text-[#A5A3AF] group-hover:translate-x-0.5 transition-transform" />
          </button>
        </nav>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(node, document.body) : node;
}

export default KpiDetailModal;
