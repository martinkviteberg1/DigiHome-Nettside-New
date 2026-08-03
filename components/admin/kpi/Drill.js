'use client';

// ---------------------------------------------------------------------------
// DRILL-DOWN: kunde → enhet. Henter /api/admin/kpi/drill på klikk.
// Mobil får kortliste, md+ får tabell — en 7-kolonners tabell er ubrukelig
// på telefon, og dette er data man faktisk leser på farten.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, Home, ChevronDown, ChevronRight, Search, Loader2, ExternalLink,
  Building2, LayoutList, RefreshCw,
} from 'lucide-react';
import { FMT, num, kr, krM, VIOLET, VIOLET_DEEP, EMER_TEXT, AMBER_TEXT, SLATE_TEXT } from './format';

const TIER_STYLE = {
  actual: { color: EMER_TEXT, bg: '#ECFDF5' },
  contracted: { color: AMBER_TEXT, bg: '#FFFBEB' },
  potential: { color: SLATE_TEXT, bg: '#F1F5F9' },
};

const initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';

function UnitAddress({ r, compact }) {
  return (
    <span className="flex items-start gap-1.5 min-w-0">
      <Home className="w-3 h-3 mt-[3px] shrink-0 text-[#C4C2CC]" />
      <span className="min-w-0">
        <span className={`block font-semibold text-[#16141D] leading-snug ${compact ? 'text-[12.5px]' : 'text-[11.5px]'}`}>{r.address}</span>
        {r.unitMatch === 'ingen' && <span className="block text-[10px] text-[#C4C2CC]">ikke koblet til enhetsdata</span>}
        {r.unitMatch === 'tvetydig' && <span className="block text-[10px] text-amber-600">flere enheter på samme adresse</span>}
        {r.publicUrl && (
          <a href={r.publicUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 text-[10px] font-semibold mt-0.5 hover:underline" style={{ color: VIOLET_DEEP }}>
            boligside <ExternalLink className="w-2.5 h-2.5" />
          </a>
        )}
      </span>
    </span>
  );
}

function TierChip({ r }) {
  if (!r.tierLabel) return null;
  const s = TIER_STYLE[r.tier] || TIER_STYLE.potential;
  return <span className="inline-flex rounded-full px-1.5 py-0.5 text-[9.5px] font-bold whitespace-nowrap" style={{ color: s.color, background: s.bg }}>{r.tierLabel}</span>;
}

function UnitRows({ columns = [], rows = [] }) {
  if (!rows.length) {
    return <p className="text-[11.5px] text-[#B0AEB8] px-3.5 py-3">Ingen kontrakt registrert på denne kunden ennå.</p>;
  }
  const val = (r, c) => (FMT[c.format] || FMT.text)(r[c.key]);
  const cols = columns.filter((c) => c.key !== 'address');

  return (
    <>
      {/* Mobil: ett kort per enhet */}
      <ul className="md:hidden divide-y divide-black/[0.05]">
        {rows.map((r, i) => (
          <li key={r.id || i} className="px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <UnitAddress r={r} compact />
              <span className="text-right shrink-0">
                <span className="block text-[13px] font-bold text-[#16141D] tabular-nums">{r.fee != null ? krM(r.fee) : '—'}</span>
                <TierChip r={r} />
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-[#8B8894] leading-snug">{r.unitInfo}</p>
            <dl className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {r.tenant && <div className="flex items-baseline gap-1 text-[11px]"><dt className="text-[#A5A3AF]">Leietaker</dt><dd className="font-semibold text-[#514E5A] truncate max-w-[150px]">{r.tenant}</dd></div>}
              {r.monthlyRent != null && <div className="flex items-baseline gap-1 text-[11px]"><dt className="text-[#A5A3AF]">Leie</dt><dd className="font-semibold text-[#514E5A] tabular-nums">{kr(r.monthlyRent)}{r.rentIsEstimate ? ' (est.)' : ''}</dd></div>}
              {r.feePercent != null && r.feePercent > 0 && <div className="flex items-baseline gap-1 text-[11px]"><dt className="text-[#A5A3AF]">Sats</dt><dd className="font-semibold text-[#514E5A] tabular-nums">{r.feePercent} %</dd></div>}
              {r.period && <div className="flex items-baseline gap-1 text-[11px]"><dt className="text-[#A5A3AF]">Periode</dt><dd className="font-semibold text-[#514E5A]">{r.period}</dd></div>}
            </dl>
          </li>
        ))}
      </ul>

      {/* md+: tabell */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-black/[0.025]">
              {columns.map((c) => (
                <th key={c.key} className={`px-2.5 py-1.5 font-bold text-[9.5px] uppercase tracking-[0.08em] text-[#A5A3AF] whitespace-nowrap ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {rows.map((r, i) => (
              <tr key={r.id || i} className="hover:bg-black/[0.015] transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={`px-2.5 py-2 align-top ${c.align === 'right' ? 'text-right tabular-nums' : ''} ${c.strong ? 'font-bold text-[#16141D]' : 'text-[#514E5A]'}`}>
                    {c.key === 'address' ? <UnitAddress r={r} />
                      : c.key === 'monthlyRent' ? (<span>{val(r, c)}{r.rentIsEstimate && <span className="block text-[9.5px] text-amber-600">estimat</span>}</span>)
                        : c.key === 'tierLabel' ? <TierChip r={r} />
                          : <span className={c.format === 'text' ? 'block max-w-[165px] truncate' : ''} title={c.format === 'text' ? String(r[c.key] ?? '') : undefined}>{val(r, c)}</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CustomerRow({ g, columns, defaultOpen }) {
  const [open, setOpen] = useState(!!defaultOpen);
  const amount = g.amount == null ? null
    : g.amountUnit === 'kr/mnd' ? krM(g.amount)
      : g.amountUnit === 'stk' ? `${num(g.amount)} stk` : kr(g.amount);
  return (
    <div className={`rounded-2xl border bg-white overflow-hidden transition-colors ${open ? 'border-[#7C5CF0]/30' : 'border-black/[0.07]'}`}>
      <button onClick={() => setOpen((v) => !v)} data-testid="kpi-drill-group" aria-expanded={open}
        className="w-full flex items-center gap-3 px-3 sm:px-3.5 py-2.5 text-left hover:bg-black/[0.02] transition-colors">
        <span className="h-8 w-8 shrink-0 rounded-full grid place-items-center text-[10.5px] font-bold tracking-tight"
          style={{ background: 'rgba(124,92,240,0.10)', color: VIOLET_DEEP }}>{initials(g.name)}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[12.5px] sm:text-[13px] font-bold text-[#16141D] truncate">{g.name}</span>
          <span className="block text-[10.5px] sm:text-[11px] text-[#A5A3AF] truncate">{g.subtitle}</span>
        </span>
        {amount && <span className="text-[12.5px] sm:text-[13px] font-bold text-[#16141D] tabular-nums whitespace-nowrap">{amount}</span>}
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#C4C2CC] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-black/[0.06]">
          {(g.meta || []).length > 0 && (
            <div className="px-3 sm:px-3.5 py-2.5 flex flex-wrap gap-1.5 bg-black/[0.015]">
              {g.meta.map((mt, i) => (
                <span key={i} className="inline-flex items-baseline gap-1 rounded-full bg-white border border-black/[0.06] px-2 py-0.5 text-[10px] max-w-full">
                  <span className="text-[#A5A3AF] shrink-0">{mt.l}</span>
                  <b className="text-[#16141D] truncate">{(FMT[mt.f] || FMT.text)(mt.v)}</b>
                  {mt.note && <span className="text-[#C4C2CC] shrink-0">{mt.note}</span>}
                </span>
              ))}
            </div>
          )}
          <UnitRows columns={columns} rows={g.rows || []} />
        </div>
      )}
    </div>
  );
}

function UnlinkedUnits({ units = [], total = 0 }) {
  const [open, setOpen] = useState(false);
  if (!total) return null;
  return (
    <div className="mt-3">
      <button onClick={() => setOpen((v) => !v)} data-testid="kpi-drill-unlinked"
        className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: VIOLET_DEEP }}>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        {num(total)} enheter i porteføljen uten kontraktskobling
      </button>
      {open && (
        <div className="mt-2 rounded-2xl border border-black/[0.07] overflow-hidden">
          <p className="px-3.5 py-2.5 text-[11px] text-[#8B8894] bg-black/[0.02] leading-relaxed text-pretty">
            Enheter fra plattformens enhets-eksport som ikke traff en kontraktsrad. Enten mangler de forvaltningsavtale i kontrakts-eksporten, eller adressen skrives ulikt i de to kildene.
          </p>
          <ul className="md:hidden divide-y divide-black/[0.05] max-h-[320px] overflow-y-auto">
            {units.map((u, i) => (
              <li key={i} className="px-3.5 py-2.5">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-[12px] font-bold text-[#16141D] leading-snug">{u.address}</p>
                  <span className="shrink-0 text-right">
                    <span className="block text-[12px] font-bold text-[#16141D] tabular-nums">{u.rentAmount != null ? kr(u.rentAmount) : '—'}</span>
                    <span className="block text-[10px] text-[#A5A3AF]">{u.unitStatus}{u.rentIsEstimate && u.rentAmount != null ? ' · est.' : ''}</span>
                  </span>
                </div>
                <p className="mt-1 text-[10.5px] text-[#8B8894] truncate">{u.unitInfo}</p>
                <p className="mt-0.5 text-[10.5px] text-[#A5A3AF] truncate">Eier {u.owner} · {u.tenant} · {num(u.imageCount)} bilder</p>
              </li>
            ))}
          </ul>
          <div className="hidden md:block overflow-x-auto max-h-72 overflow-y-auto">
            <table className="w-full text-[11.5px]">
              <thead className="sticky top-0 z-10">
                <tr className="bg-[#F7F6FA]">
                  {['Enhet', 'Detaljer', 'Eier', 'Leietaker', 'Leie', 'Status', 'Bilder'].map((h) => (
                    <th key={h} className="px-2.5 py-1.5 text-left font-bold text-[9.5px] uppercase tracking-[0.08em] text-[#A5A3AF] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {units.map((u, i) => (
                  <tr key={i} className="hover:bg-black/[0.015] transition-colors">
                    <td className="px-2.5 py-2 font-semibold text-[#16141D] max-w-[190px]">{u.address}</td>
                    <td className="px-2.5 py-2 text-[#8B8894] max-w-[170px] truncate" title={u.unitInfo}>{u.unitInfo}</td>
                    <td className="px-2.5 py-2 text-[#514E5A] max-w-[130px] truncate">{u.owner}</td>
                    <td className="px-2.5 py-2 text-[#514E5A] max-w-[130px] truncate">{u.tenant}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums text-[#514E5A] whitespace-nowrap">{u.rentAmount != null ? kr(u.rentAmount) : '—'}{u.rentIsEstimate && u.rentAmount != null ? ' (est.)' : ''}</td>
                    <td className="px-2.5 py-2 text-[#8B8894]">{u.unitStatus}</td>
                    <td className="px-2.5 py-2 text-right tabular-nums text-[#8B8894]">{num(u.imageCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomerDrill({ metric, apiKey, days, autoLoad = false, onLoaded }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    if (!apiKey) { setErr('Mangler admin-nøkkel'); setState('error'); return; }
    setState('loading'); setErr('');
    try {
      const res = await fetch(`/api/admin/kpi/drill?key=${encodeURIComponent(apiKey)}&metric=${encodeURIComponent(metric)}&days=${days || 90}`);
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Kunne ikke hente detaljer'); setState('error'); return; }
      setData(j); setState('done');
      if (onLoaded) onLoaded(j);
    } catch (e) { setErr('Nettverksfeil — prøv igjen'); setState('error'); }
  }, [apiKey, metric, days, onLoaded]);

  useEffect(() => { setState('idle'); setData(null); setErr(''); setQ(''); }, [metric]);
  useEffect(() => { if (autoLoad && state === 'idle') load(); /* eslint-disable-next-line */ }, [autoLoad, metric]);

  const groups = useMemo(() => {
    const all = data?.groups || [];
    if (!q.trim()) return all;
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    return all.filter((g) => {
      const hay = `${g.name} ${g.subtitle} ${(g.rows || []).map((r) => `${r.address} ${r.tenant || ''} ${r.unitInfo || ''}`).join(' ')} ${(g.meta || []).map((m) => m.v).join(' ')}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [data, q]);

  if (state === 'idle') {
    return (
      <button onClick={load} data-testid="kpi-drill-load"
        className="group w-full rounded-2xl border border-dashed border-[#7C5CF0]/35 bg-[#7C5CF0]/[0.04] hover:bg-[#7C5CF0]/[0.08] px-4 py-3.5 text-left transition-colors">
        <span className="flex items-center gap-3">
          <span className="h-9 w-9 shrink-0 rounded-full bg-white grid place-items-center border border-[#7C5CF0]/20">
            <Building2 className="w-4 h-4" style={{ color: VIOLET }} />
          </span>
          <span className="min-w-0">
            <span className="block text-[12.5px] sm:text-[13px] font-bold" style={{ color: VIOLET_DEEP }}>Vis kundene og enhetene bak tallet</span>
            <span className="block text-[11px] text-[#8B8894] leading-snug">Navn, adresse, etasje, leietaker, leie og honorar per enhet</span>
          </span>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-[#C4C2CC] group-hover:translate-x-0.5 group-hover:text-[#7C5CF0] transition-all" />
        </span>
      </button>
    );
  }

  if (state === 'loading') {
    return (
      <div className="space-y-2" aria-busy="true">
        <p className="flex items-center gap-2 text-[12px] text-[#8B8894] px-1"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Henter kunder og enheter …</p>
        {[0, 1, 2].map((i) => <div key={i} className="h-[52px] rounded-2xl bg-black/[0.04] animate-pulse" />)}
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="rounded-2xl bg-rose-50 border border-rose-100 px-4 py-3">
        <p className="text-[12px] text-rose-700">{err}</p>
        <button onClick={load} className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-rose-700 hover:underline">
          <RefreshCw className="w-3 h-3" /> Prøv igjen
        </button>
      </div>
    );
  }

  const isLeads = String(data.kind || '').startsWith('leads') || data.kind === 'tenant_leads';
  const uc = data.unitCoverage;

  return (
    <div data-testid="kpi-drill-panel">
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px]">
          <Users className="w-3.5 h-3.5 text-[#A5A3AF]" /> <b className="text-[#16141D] tabular-nums">{num(data.totals?.groups)}</b>
          <span className="text-[#8B8894]">{isLeads ? 'leads/kunder' : 'kunder'}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-[11px]">
          <Home className="w-3.5 h-3.5 text-[#A5A3AF]" /> <b className="text-[#16141D] tabular-nums">{num(data.totals?.rows)}</b>
          <span className="text-[#8B8894]">enheter</span>
        </span>
        {data.totals?.amount != null && data.totals.amount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: 'rgba(124,92,240,0.10)', color: VIOLET_DEEP }}>
            Sum {data.totals.amountUnit === 'kr/mnd' ? krM(data.totals.amount) : kr(data.totals.amount)}
          </span>
        )}
        {data.window?.label && <span className="text-[10.5px] text-[#B0AEB8] ml-auto">{data.window.label}</span>}
      </div>

      {(data.groups || []).length > 4 && (
        <div className="relative mb-2.5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C4C2CC] pointer-events-none" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søk kunde, adresse eller leietaker …"
            data-testid="kpi-drill-search" inputMode="search"
            className="w-full h-10 rounded-xl border border-black/[0.08] bg-white pl-9 pr-3 text-[12.5px] outline-none transition-colors focus:border-[#7C5CF0]/45 focus:ring-2 focus:ring-[#7C5CF0]/15" />
        </div>
      )}

      <div className="space-y-2">
        {groups.length === 0 && (
          <p className="flex items-center gap-2 text-[12px] text-[#A5A3AF] py-3">
            <LayoutList className="w-3.5 h-3.5" /> Ingen treff{q ? ` på «${q}»` : ''}.
          </p>
        )}
        {groups.slice(0, 60).map((g, i) => (
          <CustomerRow key={g.key || i} g={g} columns={data.columns || []} defaultOpen={groups.length <= 3} />
        ))}
        {groups.length > 60 && <p className="text-[11.5px] text-[#A5A3AF]">Viser 60 av {groups.length}. Bruk søket for å finne resten.</p>}
      </div>

      {uc && uc.rows > 0 && (
        <p className="mt-3 text-[10.5px] text-[#B0AEB8] leading-relaxed text-pretty">
          Enhetsdata koblet på {num(uc.matched)} av {num(uc.rows)} kontrakter{uc.ambiguous ? `, ${num(uc.ambiguous)} tvetydige` : ''}. Plattformen bruker to ulike ID-rom for kontrakter og enheter, så vi kobler på adresse — og bare ved entydig treff. Vi gjetter aldri.
        </p>
      )}

      <UnlinkedUnits units={data.unmatchedUnits || []} total={data.unmatchedUnitsTotal || 0} />

      {data.note && <p className="mt-3 text-[10.5px] text-[#B0AEB8] leading-relaxed text-pretty">{data.note}</p>}
    </div>
  );
}

export default CustomerDrill;
