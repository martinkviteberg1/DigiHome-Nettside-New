'use client';

/* ═══════════════ Leieforhold & inntekter — 1:1-speil av plattformen ═══════════════
   Spec fra plattform-agenten (agentbro-tråd «leieforhold-view»):
   · 4 KPI-kort: Faktisk leie · Forventet (signert) · Under signering · Ledig (estimat)
   · Porteføljestripe: Utleigrad · Honorar/mnd · Netto til huseiere/mnd
   · Tabell m/ statuschips i plattformens eksakte farger, sortert gruppe → beløp
   · Excel-eksport (.xlsx, levende formler, 2 ark) + CSV — generert server-side
   · Miljøvelger (prod/test) — samme mønster som Økonomi (financeSyncTarget)
   Datakilde: /api/admin/leieforhold (lease-income/export 1:1, ellers kontrakt-avledet) */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  KeyRound, Search, Download, FileSpreadsheet, Loader2, RefreshCw, ChevronDown,
  Check, Wallet, TrendingUp, Clock, CircleDashed, AlertTriangle,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };

// Statuschip-farger — eksakt fra plattformens spec.
const STATUS_STIL = {
  leased: { bg: '#e7f4ec', tekst: '#1f7a45' },
  future: { bg: '#e8eefc', tekst: '#3757c4' },
  signing: { bg: '#fdf3e0', tekst: '#9a6b1c' },
  vacant: { bg: '#f1ece4', tekst: '#8a8278' },
};
const GRUPPE_LABEL = { leased: 'Utleid', future: 'Fremtidig', signing: 'Under signering', vacant: 'Ledig' };

// Tusenskiller: nb-NO gir hardt mellomrom (U+00A0) som ser for bredt ut i
// display-fonter — smalt no-break space (U+202F) gir tettere, riktigere tall.
const medTynnSkiller = (s) => String(s).replace(/[\s\u00A0]/g, '\u202F');
const kr = (v) => `${medTynnSkiller(Math.round(v || 0).toLocaleString('nb-NO'))}\u202Fkr`;
const dato = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const SORTERINGER = [
  { k: 'standard', l: 'Standard (status → beløp)' },
  { k: 'belop', l: 'Beløp — høyest først' },
  { k: 'honorar', l: 'Honorar — høyest først' },
  { k: 'adresse', l: 'Adresse A–Å' },
];

function StatusChip({ row }) {
  const s = STATUS_STIL[row.group] || STATUS_STIL.vacant;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: s.bg, color: s.tekst }}>
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: s.tekst }} />
      {row.status_label}
    </span>
  );
}

export default function Leieforhold({ apiKey }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [env, setEnv] = useState(''); // '' = miljøets standard, ellers 'prod'/'test'
  const [sok, setSok] = useState('');
  const [gruppe, setGruppe] = useState('alle');
  const [sortering, setSortering] = useState('standard');
  const [sortOpen, setSortOpen] = useState(false);

  const hent = useCallback(async (valgtEnv, fresh = false) => {
    setLaster(true); setFeil('');
    try {
      const q = `${valgtEnv ? `&env=${valgtEnv}` : ''}${fresh ? '&fresh=1' : ''}`;
      const r = await fetch(`/api/admin/leieforhold?key=${encodeURIComponent(apiKey)}${q}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke hente leieforhold');
      setData(j);
    } catch (e) { setFeil(e.message); setData(null); }
    setLaster(false);
  }, [apiKey]);

  useEffect(() => { hent(env); }, [hent, env]);

  useEffect(() => {
    if (!sortOpen) return;
    const lukk = () => setSortOpen(false);
    window.addEventListener('click', lukk);
    return () => window.removeEventListener('click', lukk);
  }, [sortOpen]);

  const rows = data?.rows || [];
  const totals = data?.totals || {};

  const filtrert = useMemo(() => {
    let ut = rows;
    if (gruppe !== 'alle') ut = ut.filter((r) => r.group === gruppe);
    const s = sok.trim().toLowerCase();
    if (s) ut = ut.filter((r) => `${r.unit_room} ${r.address} ${r.owner_name} ${r.tenant_name}`.toLowerCase().includes(s));
    if (sortering === 'belop') ut = [...ut].sort((a, b) => (b.monthly_rent || 0) - (a.monthly_rent || 0));
    else if (sortering === 'honorar') ut = [...ut].sort((a, b) => (b.fee_amount || 0) - (a.fee_amount || 0));
    else if (sortering === 'adresse') ut = [...ut].sort((a, b) => (a.address || '').localeCompare(b.address || '', 'nb'));
    return ut;
  }, [rows, gruppe, sok, sortering]);

  const grupper = useMemo(() => {
    const t = { alle: rows.length, leased: 0, future: 0, signing: 0, vacant: 0 };
    rows.forEach((r) => { t[r.group] = (t[r.group] || 0) + 1; });
    return t;
  }, [rows]);

  const exportQs = `key=${encodeURIComponent(apiKey)}${env ? `&env=${env}` : ''}`;

  const KPI = [
    { l: 'Faktisk leie / mnd', v: totals.actual_rent, antall: totals.leased, icon: Wallet, farge: '#1f7a45', bg: '#e7f4ec' },
    { l: 'Forventet · signert / mnd', v: totals.expected_rent, antall: totals.future, icon: TrendingUp, farge: '#3757c4', bg: '#e8eefc' },
    { l: 'Under signering / mnd', v: totals.pending_rent, antall: totals.signing, icon: Clock, farge: '#9a6b1c', bg: '#fdf3e0' },
    { l: 'Ledig · estimat / mnd', v: totals.estimate_rent, antall: totals.vacant, icon: CircleDashed, farge: '#8a8278', bg: '#f1ece4' },
  ];

  return (
    <div className="mx-auto max-w-[1180px]" data-testid="leieforhold-modul">
      {/* Topplinje: kilde + miljø + eksport */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-[#999]">
          <span className={`inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${data?.source === 'lease-income' ? 'bg-[#e7f4ec] text-[#1f7a45]' : 'bg-amber-50 text-amber-700'}`} data-testid="leieforhold-kilde">
            <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${data?.source === 'lease-income' ? 'bg-[#1f7a45]' : 'bg-amber-500'}`} />
            <span className="truncate">{data?.source === 'lease-income' ? 'Plattform-data (1:1)' : 'Avledet fra kontrakter — venter på plattform-endepunkt'}</span>
          </span>
          {data?.env && <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#999] ring-1 ring-black/[0.07]">{data.env}</span>}
          {data?.fetchedAt && (
            <span className="hidden sm:inline text-[11px] text-[#b5b5b5]" title={data.cached ? 'Hurtiglagret svar — trykk oppdater for ferske tall' : 'Hentet direkte fra plattformen'}>
              Oppdatert {new Date(data.fetchedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
          {/* Miljøvelger — samme logikk som Økonomi */}
          <div className="flex h-9 items-center rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            {[{ k: '', l: 'Auto' }, { k: 'prod', l: 'Prod' }, { k: 'test', l: 'Test' }].map((o) => (
              <button
                key={o.k || 'auto'}
                onClick={() => setEnv(o.k)}
                data-testid={`leieforhold-env-${o.k || 'auto'}`}
                className={`h-7 rounded-full px-3 text-[12px] font-semibold transition-all ${env === o.k ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`}
              >
                {o.l}
              </button>
            ))}
          </div>
          <button onClick={() => hent(env, true)} title="Hent ferske tall fra plattformen" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#999] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#555]">
            <RefreshCw className={`h-4 w-4 ${laster ? 'animate-spin' : ''}`} />
          </button>
          <a
            href={`/api/admin/leieforhold/csv?${exportQs}`}
            data-testid="leieforhold-csv"
            className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#111]"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </a>
          <a
            href={`/api/admin/leieforhold/xlsx?${exportQs}`}
            data-testid="leieforhold-xlsx"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
          >
            <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">Excel-eksport</span><span className="sm:hidden">Excel</span>
          </a>
        </div>
      </div>

      {feil && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {feil}
        </div>
      )}
      {data?.stale && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700" data-testid="leieforhold-stale">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Viser sist lagrede tall ({new Date(data.fetchedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}) — {data.warning || 'plattformen svarte ikke.'}
        </div>
      )}

      {/* KPI-kort */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {KPI.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.l} className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid={`leieforhold-kpi-${s.l.split(' ')[0].toLowerCase()}`}>
              <div className="flex items-center justify-between">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: s.bg }}>
                  <Icon className="h-4 w-4" style={{ color: s.farge }} />
                </span>
                <span className="text-[11px] font-bold text-[#b5b5b5]">{s.antall ?? 0} stk</span>
              </div>
              <p className="mt-3 text-[20px] font-bold tabular-nums tracking-tight text-[#0a0a0a] sm:text-[22px]" style={heading}>
                {laster ? '…' : kr(s.v)}
              </p>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">{s.l}</p>
            </div>
          );
        })}
      </div>

      {/* Porteføljestripe */}
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="flex items-baseline justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Utleigrad</p>
            <p className="text-[18px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{totals.occupancy_pct ?? 0} %</p>
          </div>
          <div className="mt-2.5 h-[8px] overflow-hidden rounded-full bg-[#f1ece4]">
            <div className="h-full rounded-full bg-[#1f7a45] transition-all duration-700" style={{ width: `${totals.occupancy_pct || 0}%` }} />
          </div>
          <p className="mt-2 text-[11px] text-[#b5b5b5]">{totals.leased ?? 0} av {totals.count ?? 0} enheter utleid</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Honorar / mnd</p>
          <p className="mt-2 text-[20px] font-bold tabular-nums" style={{ ...heading, color: '#7c3aed' }} data-testid="leieforhold-honorar">
            {laster ? '…' : kr(totals.fee)}
          </p>
          <p className="mt-1 text-[11px] text-[#b5b5b5]">eks. mva · kun realisert leie</p>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Netto til huseiere / mnd</p>
          <p className="mt-2 text-[20px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>
            {laster ? '…' : kr(totals.net)}
          </p>
          <p className="mt-1 text-[11px] text-[#b5b5b5]">etter honorar inkl. mva</p>
        </div>
      </div>

      {/* Verktøylinje: søk + statusfilter + sortering */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#bbb]" />
          <input
            value={sok} onChange={(e) => setSok(e.target.value)}
            placeholder="Søk adresse, eier eller leietaker …"
            data-testid="leieforhold-sok"
            className="h-9 w-full rounded-full border border-black/[0.06] bg-white pl-9 pr-3 text-[13px] outline-none shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all placeholder:text-[#bbb] focus:border-[#8b5cf6]/40 focus:ring-2 focus:ring-[#8b5cf6]/12"
          />
        </div>
        <div className="flex w-full items-center gap-1 overflow-x-auto no-scrollbar sm:w-auto sm:flex-wrap">
          {[['alle', 'Alle'], ['leased', GRUPPE_LABEL.leased], ['future', GRUPPE_LABEL.future], ['signing', GRUPPE_LABEL.signing], ['vacant', GRUPPE_LABEL.vacant]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setGruppe(k)}
              data-testid={`leieforhold-filter-${k}`}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all active:scale-[0.97] ${gruppe === k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#999] shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:text-[#555]'}`}
            >
              {l}
              <span className={`tabular-nums text-[10.5px] ${gruppe === k ? 'text-white/60' : 'text-[#c2beb8]'}`}>{grupper[k] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <button
            onClick={(e) => { e.stopPropagation(); setSortOpen((o) => !o); }}
            className="flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-[12px] font-semibold text-[#777] shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:text-[#333]"
          >
            {SORTERINGER.find((s) => s.k === sortering)?.l.split(' (')[0]}
            <ChevronDown className={`h-3.5 w-3.5 text-[#bbb] transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-full z-30 mt-1 w-[240px] rounded-xl border border-black/[0.07] bg-white p-1 shadow-[0_16px_48px_rgba(0,0,0,0.16)]">
              {SORTERINGER.map((s) => (
                <button
                  key={s.k}
                  onClick={() => { setSortering(s.k); setSortOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${s.k === sortering ? 'bg-[#f4f0fb] font-semibold text-[#6d28d9]' : 'text-[#555] hover:bg-[#f8f7f5]'}`}
                >
                  {s.l}
                  {s.k === sortering && <Check className="h-3.5 w-3.5" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabell */}
      <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        {laster && (
          <div className="space-y-1.5 p-4" data-testid="leieforhold-skeleton">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-lg bg-[#f3f2f0]" style={{ opacity: Math.max(0.25, 1 - i * 0.11), animationDelay: `${i * 70}ms` }} />
            ))}
          </div>
        )}
        {!laster && !filtrert.length && (
          <div className="py-14 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0fb]"><KeyRound className="h-5 w-5 text-[#8b5cf6]" /></span>
            <p className="mt-3 text-[13px] text-[#999]">{sok || gruppe !== 'alle' ? 'Ingen treff — juster søk eller filter.' : 'Ingen leieforhold funnet.'}</p>
          </div>
        )}
        {!laster && filtrert.length > 0 && (
          <>
            {/* Desktop-tabell */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] text-left" data-testid="leieforhold-tabell">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {['Bolig / enhet', 'Huseier', 'Leietaker', 'Status', 'Innflytting', 'Beløp / mnd', 'Sats', 'Honorar', 'Netto', 'Depositum'].map((h, i) => (
                    <th key={h} className={`px-4 py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i >= 5 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrert.map((r, i) => (
                  <tr key={`${r.address}-${r.unit_room}-${i}`} className="border-b border-black/[0.035] transition-colors last:border-b-0 hover:bg-[#fafaf8]" data-testid={`leieforhold-rad-${i}`}>
                    <td className="px-4 py-3">
                      <p className="text-[13px] font-semibold leading-tight text-[#1a1a1a]">
                        {r.unit_room}
                        {r.unit_type === 'Rom i bofellesskap' && (
                          <span className="ml-1.5 rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8b5cf6]">Rom</span>
                        )}
                      </p>
                      <p className="mt-0.5 max-w-[240px] truncate text-[11.5px] text-[#a3a3a3]">{r.address}</p>
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-[12.5px] text-[#555]">{r.owner_name || '—'}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-[12.5px] text-[#555]">{r.tenant_name || '—'}</td>
                    <td className="px-4 py-3"><StatusChip row={r} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-[12.5px] text-[#777]">{(r.group === 'future' || r.group === 'signing') ? dato(r.move_in_date) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[13px] font-semibold tabular-nums text-[#0a0a0a]">
                      {r.group === 'vacant' && !r.monthly_rent
                        ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">Ikke satt</span>
                        : kr(r.monthly_rent)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12.5px] tabular-nums text-[#777]">{r.fee_percent ? `${r.fee_percent.toLocaleString('nb-NO')} %` : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12.5px] font-semibold tabular-nums" style={{ color: r.group === 'leased' ? '#7c3aed' : '#c2beb8' }}>
                      {r.group === 'leased' ? kr(r.fee_amount) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12.5px] tabular-nums text-[#555]">{r.group === 'leased' ? kr(r.net_to_owner) : '—'}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-[12.5px] tabular-nums text-[#777]">{r.deposit != null ? kr(r.deposit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/[0.06] bg-[#fafaf8]">
                  <td className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Sum ({filtrert.length})</td>
                  <td colSpan={4} />
                  <td className="px-4 py-3 text-right text-[13px] font-bold tabular-nums text-[#0a0a0a]">{kr(filtrert.reduce((s, r) => s + (r.monthly_rent || 0), 0))}</td>
                  <td />
                  <td className="px-4 py-3 text-right text-[12.5px] font-bold tabular-nums" style={{ color: '#7c3aed' }}>{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0))}</td>
                  <td className="px-4 py-3 text-right text-[12.5px] font-bold tabular-nums text-[#555]">{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.net_to_owner || 0), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>

            {/* Mobil kortliste — Linear-følelse på små skjermer */}
            <div className="divide-y divide-black/[0.04] md:hidden" data-testid="leieforhold-kortliste">
              {filtrert.map((r, i) => (
                <div key={`${r.address}-${r.unit_room}-${i}`} className="px-4 py-3.5 transition-colors active:bg-[#fafaf8]" data-testid={`leieforhold-kort-${i}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-semibold leading-tight text-[#1a1a1a]">
                        {r.unit_room}
                        {r.unit_type === 'Rom i bofellesskap' && (
                          <span className="ml-1.5 rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8b5cf6]">Rom</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-[11.5px] text-[#a3a3a3]">{r.address}</p>
                    </div>
                    <span className="shrink-0"><StatusChip row={r} /></span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="min-w-0 space-y-0.5 text-[11.5px] text-[#8a8278]">
                      {r.owner_name && <p className="truncate">Eier · {r.owner_name}</p>}
                      {r.tenant_name && <p className="truncate">Leietaker · {r.tenant_name}</p>}
                      {(r.group === 'future' || r.group === 'signing') && r.move_in_date && <p>Innflytting {dato(r.move_in_date)}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[15px] font-bold tabular-nums text-[#0a0a0a]">
                        {r.group === 'vacant' && !r.monthly_rent
                          ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">Ikke satt</span>
                          : kr(r.monthly_rent)}
                      </p>
                      {r.group === 'leased' && (
                        <p className="mt-0.5 text-[11px] font-semibold tabular-nums" style={{ color: '#7c3aed' }}>honorar {kr(r.fee_amount)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between bg-[#fafaf8] px-4 py-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Sum ({filtrert.length})</span>
                <div className="text-right">
                  <p className="text-[14px] font-bold tabular-nums text-[#0a0a0a]">{kr(filtrert.reduce((s, r) => s + (r.monthly_rent || 0), 0))}</p>
                  <p className="text-[11px] font-semibold tabular-nums" style={{ color: '#7c3aed' }}>honorar {kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0))}</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="mt-4 text-[11.5px] text-[#b5b5b5]">
        Honorar vises eks. mva (privat: sats inkl. mva ÷ 1,25 · næring: sats eks. mva). Netto = leie − honorar inkl. mva. Excel-eksporten har levende formler, nedtrekk og eget «Per huseier»-ark.
      </p>
    </div>
  );
}
