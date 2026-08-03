'use client';

// ---------------------------------------------------------------------------
// Presentasjons-primitiver for nøkkeltall-modalen. Alt er mobil-først:
// tabeller blir kort under md, formler stables, tekst puster.
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';
import { FMT, VIOLET, VIOLET_DEEP, EMER_TEXT, INK, LABEL } from './format';

export function Section({ icon: Icon, title, action, children, className = '' }) {
  return (
    <section className={`min-w-0 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        {Icon && <Icon className="w-3.5 h-3.5 shrink-0 text-[#C4C2CC]" />}
        <h4 className={`${LABEL} truncate`}>{title}</h4>
        <span className="h-px flex-1 bg-black/[0.06]" />
        {action}
      </div>
      {children}
    </section>
  );
}

// Formelen med de faktiske tallene satt inn. Stables loddrett på mobil,
// slik at operatorene alltid står mellom leddene og ikke bryter rart.
export function FormulaBlock({ formula }) {
  if (!formula) return null;
  const terms = formula.terms || [];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#7C5CF0]/[0.18] p-4 sm:p-5"
      style={{ background: 'linear-gradient(140deg,#FAF7FF 0%,#FFFFFF 65%)' }}>
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgba(124,92,240,0.16) 0%, transparent 70%)' }} />
      <p className="relative text-[12px] sm:text-[13px] text-[#67646F] leading-relaxed text-pretty">{formula.text}</p>

      {/* Mobil: loddrett liste */}
      <div className="relative mt-4 space-y-1.5 sm:hidden">
        {terms.map((t, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-center text-[15px] font-bold text-[#A5A3AF] select-none">{t.op || ''}</span>
            <span className="flex-1 min-w-0 flex items-baseline justify-between gap-2 rounded-xl bg-white border border-black/[0.07] px-3 py-2">
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[#A5A3AF] truncate">{t.label}</span>
              <span className="text-[14px] font-bold text-[#16141D] tabular-nums whitespace-nowrap">{t.value}</span>
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="w-4 shrink-0 text-center text-[15px] font-bold text-[#A5A3AF] select-none">=</span>
          <span className="flex-1 rounded-xl px-3 py-2.5 text-[16px] font-bold text-white tabular-nums text-center" style={{ background: VIOLET }}>{formula.result}</span>
        </div>
      </div>

      {/* Desktop: vannrett ligning */}
      <div className="relative mt-4 hidden sm:flex flex-wrap items-stretch gap-2">
        {terms.map((t, i) => (
          <React.Fragment key={i}>
            {t.op && <span className="self-center px-0.5 text-[17px] font-bold text-[#A5A3AF] select-none">{t.op}</span>}
            <span className="rounded-xl bg-white border border-black/[0.07] px-3 py-2 shadow-[0_1px_2px_rgba(16,14,24,0.04)]">
              <span className="block text-[9.5px] font-bold uppercase tracking-[0.09em] text-[#A5A3AF]">{t.label}</span>
              <span className="block mt-0.5 text-[15px] font-bold text-[#16141D] tabular-nums tracking-[-0.01em]">{t.value}</span>
            </span>
          </React.Fragment>
        ))}
        <span className="self-center px-0.5 text-[17px] font-bold text-[#A5A3AF] select-none">=</span>
        <span className="flex items-center rounded-xl px-4" style={{ background: VIOLET }}>
          <span className="text-[16px] font-bold text-white tabular-nums tracking-[-0.01em]">{formula.result}</span>
        </span>
      </div>
    </div>
  );
}

export function InputRows({ inputs = [] }) {
  if (!inputs.length) return null;
  return (
    <dl className="rounded-2xl border border-black/[0.06] overflow-hidden divide-y divide-black/[0.05]">
      {inputs.map((r, i) => (
        <div key={i} className={`flex items-start gap-3 px-3.5 py-2.5 ${i % 2 ? 'bg-black/[0.014]' : 'bg-white'}`}>
          <dt className="min-w-0 flex-1">
            <span className={`block text-[12px] sm:text-[12.5px] leading-snug ${r.muted ? 'text-[#A5A3AF]' : 'text-[#514E5A]'}`}>{r.label}</span>
            {r.note && <span className="block text-[10.5px] text-[#B0AEB8] mt-0.5 leading-snug">{r.note}</span>}
          </dt>
          <dd className={`text-[12.5px] sm:text-[13px] tabular-nums whitespace-nowrap ${r.strong ? 'font-bold text-[#16141D]' : r.muted ? 'text-[#A5A3AF] font-medium' : 'font-semibold text-[#16141D]'}`}>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Bullets({ items = [], icon: Icon = CheckCircle2, color = '#10B981' }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((t, i) => (
        <li key={i} className="flex items-start gap-2 text-[12px] sm:text-[12.5px] leading-relaxed text-[#514E5A] text-pretty">
          <Icon className="w-3.5 h-3.5 mt-[3px] shrink-0" style={{ color }} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function IncludeExclude({ includes = [], excludes = [] }) {
  if (!includes.length && !excludes.length) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {includes.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5" style={{ color: EMER_TEXT }}>Inkluderer</p>
          <Bullets items={includes} icon={CheckCircle2} color="#10B981" />
        </div>
      )}
      {excludes.length > 0 && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/45 px-4 py-3.5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#B45309] mb-2.5">Ekskluderer</p>
          <Bullets items={excludes} icon={XCircle} color="#F59E0B" />
        </div>
      )}
    </div>
  );
}

export function Caveats({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-amber-50/30 px-4 py-3.5">
      <Bullets items={items} icon={AlertTriangle} color="#D97706" />
    </div>
  );
}

// Kompakt forhåndsvisning av radene bak et tall. Tabell fra md og opp,
// kortliste under — en tabell med 6 kolonner er uleselig på telefon.
export function PreviewTable({ drill, initial = 6 }) {
  const [open, setOpen] = useState(false);
  if (!drill || !(drill.rows || []).length) return null;
  const cols = drill.columns || [];
  const all = drill.rows;
  const rows = open ? all : all.slice(0, initial);
  const val = (r, c) => (FMT[c.format] || FMT.text)(r[c.key]);
  const primary = cols[0];
  const money = cols.filter((c) => c.strong);

  return (
    <div>
      {drill.note && <p className="text-[11px] text-[#A5A3AF] mb-2.5 leading-relaxed text-pretty">{drill.note}</p>}

      <div className="hidden md:block rounded-2xl border border-black/[0.07] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-black/[0.028]">
                {cols.map((c) => (
                  <th key={c.key} className={`px-3 py-2 font-bold text-[9.5px] uppercase tracking-[0.09em] text-[#8B8894] whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {rows.map((r, i) => (
                <tr key={i} className={i % 2 ? 'bg-black/[0.012]' : ''}>
                  {cols.map((c) => (
                    <td key={c.key} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.strong ? 'font-bold text-[#16141D]' : 'text-[#514E5A]'}`}>
                      <span className={c.format === 'text' ? 'block max-w-[210px] truncate' : ''} title={c.format === 'text' ? String(r[c.key] ?? '') : undefined}>{val(r, c)}</span>
                    </td>
                  ))}
                </tr>
              ))}
              {drill.totalRow && (
                <tr className="border-t-2 border-black/[0.09] bg-black/[0.022]">
                  {cols.map((c, i) => (
                    <td key={c.key} className={`px-3 py-2 font-bold text-[#16141D] ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                      {i === 0 ? 'Sum' : (drill.totalRow[c.key] != null ? (FMT[c.format] || FMT.text)(drill.totalRow[c.key]) : '')}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="md:hidden space-y-2">
        {rows.map((r, i) => (
          <li key={i} className="rounded-2xl border border-black/[0.07] bg-white px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-[12.5px] font-bold text-[#16141D] leading-snug">{primary ? val(r, primary) : '—'}</p>
              {money[0] && <p className="text-[13px] font-bold text-[#16141D] tabular-nums whitespace-nowrap">{val(r, money[0])}</p>}
            </div>
            <dl className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {cols.filter((c) => c !== primary && !c.strong).map((c) => (
                <div key={c.key} className="flex items-baseline gap-1 text-[11px]">
                  <dt className="text-[#A5A3AF]">{c.label}</dt>
                  <dd className="font-semibold text-[#514E5A] tabular-nums">{val(r, c)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
        {drill.totalRow && money[0] && (
          <li className="flex items-center justify-between rounded-2xl bg-black/[0.03] px-3.5 py-2.5">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#8B8894]">Sum</span>
            <span className="text-[14px] font-bold text-[#16141D] tabular-nums">{(FMT[money[0].format] || FMT.text)(drill.totalRow[money[0].key])}</span>
          </li>
        )}
      </ul>

      {all.length > initial && (
        <button onClick={() => setOpen((v) => !v)} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: VIOLET_DEEP }}>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {open ? 'Vis mindre' : `Vis alle ${all.length} rader`}
        </button>
      )}
    </div>
  );
}

// Segmentkontroll med glidende markør. Ruller vannrett på små skjermer.
export function TabBar({ tabs = [], active, onChange, testid }) {
  return (
    <div data-testid={testid} role="tablist"
      className="flex items-center gap-1 overflow-x-auto rounded-full bg-black/[0.045] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <button key={t.id} role="tab" aria-selected={on} onClick={() => onChange(t.id)}
            data-testid={`kpi-tab-${t.id}`}
            className={`relative shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 sm:px-3.5 h-8 text-[11.5px] sm:text-[12px] font-semibold whitespace-nowrap transition-all duration-200 ${on ? 'bg-white text-[#16141D] shadow-[0_1px_4px_rgba(16,14,24,0.12)]' : 'text-[#8B8894] hover:text-[#514E5A]'}`}>
            {t.icon && <t.icon className={`w-3.5 h-3.5 ${on ? '' : 'opacity-70'}`} style={on ? { color: VIOLET } : undefined} />}
            {t.label}
            {t.count != null && (
              <span className={`ml-0.5 rounded-full px-1.5 text-[9.5px] font-bold tabular-nums ${on ? 'text-white' : 'text-[#8B8894]'}`}
                style={on ? { background: VIOLET } : { background: 'rgba(22,20,29,0.07)' }}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
