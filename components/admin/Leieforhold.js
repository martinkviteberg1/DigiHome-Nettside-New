'use client';

/* ═══════════════ Leieforhold & inntekter — 1:1-speil av plattformen ═══════════════
   TO MODUS (én side, én sannhet — Enhetsøkonomi-siden i datarommet er slått sammen hit):
   · «Utleie»  — porteføljen slik plattformen viser den: leie, status, innflytting,
     sats, honorar, netto, depositum
   · «Økonomi» — DigiHomes enhetsøkonomi: honorar − fordelte felleskostnader = margin
     per enhet, CAC/payback, break-even. DigiHome er asset-light (huseier bærer alle
     boligkostnader), så kostnadsbildet er kun felleskostnader (lønn m.m.) + CAC.
   · Investor: Økonomi-modus som default, alt read-only (full åpenhet)
   · Admin: redigerer felleskostnader og CAC direkte her
   Datakilder: /api/admin/leieforhold (live plattform) + /api/admin/leieforhold/okonomi */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  KeyRound, Search, Download, FileSpreadsheet, RefreshCw, ChevronDown,
  Check, AlertTriangle, Megaphone, Coins, Plus, Pencil, Trash2, X,
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
const FORDELING_LABEL = { alle: 'likt per enhet', utleide: 'kun utleide', honorar: 'etter honorar' };
const KATEGORI_LABEL = { lonn: 'Lønn', markedsforing: 'Markedsføring', programvare: 'Programvare', annet: 'Annet' };

// Tusenskiller: smalt no-break space (U+202F) gir tettere, riktigere tall.
const medTynnSkiller = (s) => String(s).replace(/[\s\u00A0]/g, '\u202F');
const kr = (v) => `${medTynnSkiller(Math.round(v || 0).toLocaleString('nb-NO'))}\u202Fkr`;
const dato = (s) => (s ? new Date(`${s}T12:00:00`).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

const SORTERINGER = [
  { k: 'standard', l: 'Standard (status → beløp)' },
  { k: 'belop', l: 'Beløp — høyest først' },
  { k: 'honorar', l: 'Honorar — høyest først' },
  { k: 'adresse', l: 'Adresse A–Å' },
];

const radNokkel = (r) => r.enhet_id || `${r.address}|${r.unit_room}`;

function StatusChip({ row }) {
  const s = STATUS_STIL[row.group] || STATUS_STIL.vacant;
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: s.bg, color: s.tekst }}>
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: s.tekst }} />
      {row.status_label}
      {row.advertised && <Megaphone className="h-3 w-3 opacity-70" />}
    </span>
  );
}

function AdresseCelle({ r }) {
  const erRom = r.unit_type === 'Rom i bofellesskap';
  const [gate, ...resten] = String(r.address || '').split(',');
  const omraade = resten.join(',').replace(/,?\s*Norge\s*$/i, '').trim();
  return (
    <>
      <p className="max-w-[240px] truncate text-[13px] font-semibold text-[#1a1a1a]" title={r.address}>
        {(gate || '').trim() || '—'}
        {erRom && (
          <span className="ml-1.5 rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8b5cf6]">{r.enhet_detalj || 'Rom'}</span>
        )}
      </p>
      {omraade && <p className="mt-0.5 max-w-[240px] truncate text-[11px] text-[#a3a3a3]">{omraade}</p>}
    </>
  );
}

export default function Leieforhold({ apiKey, readOnly = false, erInvestor = false }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [sok, setSok] = useState('');
  const [gruppe, setGruppe] = useState('alle');
  const [sortering, setSortering] = useState('standard');
  const [sortOpen, setSortOpen] = useState(false);
  const [modus, setModus] = useState(erInvestor ? 'okonomi' : 'utleie');

  // Enhetsøkonomi-data (felleskostnader + CAC per enhet)
  const [okonomi, setOkonomi] = useState({ felles: [], enheter: {} });
  const [inklFelles, setInklFelles] = useState(true);
  const [fellesSkjema, setFellesSkjema] = useState(null); // {id?, navn, belop, fordeling, kategori}
  const [cacSkjema, setCacSkjema] = useState(null); // {enhetId, adresse, cac, notat}
  const [lagrer, setLagrer] = useState(false);

  const kanRedigere = !readOnly;

  const hent = useCallback(async (fresh = false) => {
    setLaster(true); setFeil('');
    try {
      const r = await fetch(`/api/admin/leieforhold?key=${encodeURIComponent(apiKey)}${fresh ? '&fresh=1' : ''}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke hente leieforhold');
      setData(j);
    } catch (e) { setFeil(e.message); setData(null); }
    setLaster(false);
  }, [apiKey]);

  const hentOkonomi = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/leieforhold/okonomi?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (r.ok && j.ok) setOkonomi({ felles: j.felles || [], enheter: j.enheter || {} });
    } catch (e) { /* økonomidata er valgfritt tillegg */ }
  }, [apiKey]);

  useEffect(() => { hent(); hentOkonomi(); }, [hent, hentOkonomi]);

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
    if (s) ut = ut.filter((r) => `${r.unit_room} ${r.address} ${r.owner_name} ${r.tenant_name} ${r.bolig_type || ''}`.toLowerCase().includes(s));
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

  // Linear-stil: grupper radene i statusseksjoner når standardsortering + «Alle».
  const seksjoner = useMemo(() => {
    if (gruppe !== 'alle' || sortering !== 'standard' || sok.trim()) return [{ key: null, rader: filtrert }];
    return ['leased', 'future', 'signing', 'vacant']
      .map((g) => ({ key: g, rader: filtrert.filter((r) => r.group === g) }))
      .filter((s) => s.rader.length);
  }, [filtrert, gruppe, sortering, sok]);

  /* ── Enhetsøkonomi-beregninger ────────────────────────────────────────── */
  const fellesTotal = useMemo(() => okonomi.felles.reduce((s, p) => s + (p.belop || 0), 0), [okonomi.felles]);

  // Fordel hver felleskostnad per enhet etter postens nøkkel.
  const andelKart = useMemo(() => {
    const kart = new Map();
    if (!rows.length) return kart;
    const utleide = rows.filter((r) => r.group === 'leased');
    const feeAlle = rows.reduce((s, r) => s + (r.fee_amount || 0), 0);
    const leggTil = (r, v) => kart.set(radNokkel(r), (kart.get(radNokkel(r)) || 0) + v);
    for (const post of okonomi.felles) {
      const b = post.belop || 0;
      if (post.fordeling === 'utleide' && utleide.length) utleide.forEach((r) => leggTil(r, b / utleide.length));
      else if (post.fordeling === 'honorar' && feeAlle > 0) rows.forEach((r) => leggTil(r, b * ((r.fee_amount || 0) / feeAlle)));
      else rows.forEach((r) => leggTil(r, b / rows.length));
    }
    return kart;
  }, [rows, okonomi.felles]);

  const cacFor = (r) => okonomi.enheter[radNokkel(r)]?.cac || 0;
  const cacTotal = useMemo(() => rows.reduce((s, r) => s + cacFor(r), 0), [rows, okonomi.enheter]); // eslint-disable-line react-hooks/exhaustive-deps

  const marginMnd = (totals.fee || 0) - (inklFelles ? fellesTotal : 0);
  const dekningPct = fellesTotal > 0 ? Math.round(((totals.fee || 0) / fellesTotal) * 100) : null;
  const snittHonorar = totals.leased ? (totals.fee || 0) / totals.leased : 0;
  const enheterTilBreakEven = fellesTotal > (totals.fee || 0) && snittHonorar > 0
    ? Math.ceil((fellesTotal - (totals.fee || 0)) / snittHonorar) : 0;
  const paybackSnitt = cacTotal > 0 && (totals.fee || 0) > 0 ? cacTotal / totals.fee : null;

  /* ── Lagring (admin) ──────────────────────────────────────────────────── */
  const lagreFelles = async () => {
    if (!fellesSkjema?.navn?.trim() || !Number(fellesSkjema?.belop)) return;
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/leieforhold/okonomi/felles?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fellesSkjema),
      });
      if (r.ok) { setFellesSkjema(null); await hentOkonomi(); }
    } catch (e) { /* behold skjema åpent */ }
    setLagrer(false);
  };
  const slettFelles = async (id) => {
    setLagrer(true);
    try {
      await fetch(`/api/admin/leieforhold/okonomi/felles?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      await hentOkonomi();
    } catch (e) { /* ignorer */ }
    setLagrer(false);
  };
  const lagreCac = async () => {
    if (!cacSkjema) return;
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/leieforhold/okonomi/enhet?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enhetId: cacSkjema.enhetId, cac: Number(cacSkjema.cac) || 0, notat: cacSkjema.notat || '' }),
      });
      if (r.ok) { setCacSkjema(null); await hentOkonomi(); }
    } catch (e) { /* behold skjema åpent */ }
    setLagrer(false);
  };

  const kildeLive = data?.source === 'lease-income' || data?.source === 'units-contracts';
  const kildeTekst = !data && laster ? 'Henter fra plattformen …'
    : data?.source === 'lease-income' ? 'Plattform-data (1:1)'
    : data?.source === 'units-contracts' ? 'Live fra plattformen'
    : 'Avledet fra kontrakter';

  const KPI = [
    { id: 'faktisk', l: 'Faktisk leie / mnd', v: totals.actual_rent, antall: totals.leased, farge: '#1f7a45' },
    { id: 'forventet', l: 'Forventet · signert', v: totals.expected_rent, antall: totals.future, farge: '#3757c4' },
    { id: 'under', l: 'Under signering', v: totals.pending_rent, antall: totals.signing, farge: '#9a6b1c' },
    { id: 'ledig', l: 'Ledig · estimat', v: totals.estimate_rent, antall: totals.vacant, farge: '#8a8278' },
  ];

  return (
    <div className="w-full" data-testid="leieforhold-modul">
      {/* Verktøylinje øverst: modus + kilde · handlinger */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full bg-white p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {[['utleie', 'Utleie'], ['okonomi', 'Økonomi']].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setModus(k)}
              data-testid={`leieforhold-modus-${k}`}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-all ${modus === k ? 'bg-[#0a0a0a] text-white' : 'text-[#999] hover:text-[#555]'}`}
            >
              {k === 'okonomi' && <Coins className="h-3.5 w-3.5" />}{l}
            </button>
          ))}
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${!data && laster ? 'bg-[#f1efec] text-[#8a8278]' : kildeLive ? 'bg-[#e7f4ec] text-[#1f7a45]' : 'bg-amber-50 text-amber-700'}`} data-testid="leieforhold-kilde">
          <span className={`h-[5px] w-[5px] shrink-0 rounded-full ${!data && laster ? 'animate-pulse bg-[#8a8278]' : kildeLive ? 'bg-[#1f7a45]' : 'bg-amber-500'}`} />
          {kildeTekst}
        </span>
        {data?.fetchedAt && (
          <span className="text-[11px] text-[#b5b5b5]" title={data.cached ? 'Hurtiglagret svar — trykk oppdater for ferske tall' : 'Hentet direkte fra plattformen'}>
            Oppdatert {new Date(data.fetchedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          <button onClick={() => hent(true)} title="Hent ferske tall fra plattformen" data-testid="leieforhold-oppdater" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#999] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#555]">
            <RefreshCw className={`h-4 w-4 ${laster ? 'animate-spin' : ''}`} />
          </button>
          {!readOnly && (
            <a
              href={`/api/admin/leieforhold/csv?key=${encodeURIComponent(apiKey)}`}
              data-testid="leieforhold-csv"
              className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3.5 text-[12.5px] font-semibold text-[#555] shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all hover:text-[#111]"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </a>
          )}
          <a
            href={`/api/admin/leieforhold/xlsx?key=${encodeURIComponent(apiKey)}`}
            data-testid="leieforhold-xlsx"
            className="flex h-9 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
          >
            <FileSpreadsheet className="h-4 w-4" /> <span className="hidden sm:inline">Excel-eksport</span><span className="sm:hidden">Excel</span>
          </a>
        </div>
      </div>

      {feil && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {feil}
        </div>
      )}
      {data?.stale && (
        <div className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-[13px] text-amber-700" data-testid="leieforhold-stale">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Viser sist lagrede tall ({new Date(data.fetchedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}) — {data.warning || 'plattformen svarte ikke.'}
        </div>
      )}

      {/* ═══ KPI-stripe ═══ */}
      {modus === 'utleie' ? (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-2 divide-black/[0.05] sm:grid-cols-3 xl:grid-cols-6 xl:divide-x [&>div]:border-black/[0.05]">
            {KPI.map((s) => (
              <div key={s.id} className="border-b px-4 py-3 xl:border-b-0" data-testid={`leieforhold-kpi-${s.id}`}>
                <div className="flex items-center gap-1.5">
                  <span className="h-[6px] w-[6px] rounded-full" style={{ background: s.farge }} />
                  <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">{s.l}</p>
                </div>
                <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-tight text-[#0a0a0a]" style={heading}>
                  {laster ? '…' : kr(s.v)}
                </p>
                <p className="mt-0.5 text-[10.5px] text-[#c2beb8]">{s.antall ?? 0} {s.antall === 1 ? 'enhet' : 'enheter'}</p>
              </div>
            ))}
            <div className="border-b px-4 py-3 sm:border-b-0" data-testid="leieforhold-kpi-honorar">
              <div className="flex items-center gap-1.5">
                <span className="h-[6px] w-[6px] rounded-full bg-[#7c3aed]" />
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Honorar / mnd · eks. mva</p>
              </div>
              <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-tight" style={{ ...heading, color: '#7c3aed' }} data-testid="leieforhold-honorar">
                {laster ? '…' : kr(totals.fee)}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#c2beb8]">
                garantert {kr(totals.fee_garantert ?? totals.fee)} · estimert {kr(totals.fee_estimert ?? 0)}
              </p>
            </div>
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Utleigrad</p>
                <p className="text-[15px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{totals.occupancy_pct ?? 0} %</p>
              </div>
              <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#f1ece4]">
                <div className="h-full rounded-full bg-[#1f7a45] transition-all duration-700" style={{ width: `${totals.occupancy_pct || 0}%` }} />
              </div>
              <p className="mt-1.5 truncate text-[10.5px] text-[#c2beb8]">
                {totals.leased ?? 0} av {totals.count ?? 0} utleid · netto eiere {kr(totals.net)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          <div className="grid grid-cols-2 divide-black/[0.05] sm:grid-cols-3 xl:grid-cols-6 xl:divide-x [&>div]:border-black/[0.05]">
            <div className="border-b px-4 py-3 xl:border-b-0" data-testid="leieforhold-kpi-honorar-ok">
              <div className="flex items-center gap-1.5">
                <span className="h-[6px] w-[6px] rounded-full bg-[#7c3aed]" />
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Honorar / mnd</p>
              </div>
              <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-tight" style={{ ...heading, color: '#7c3aed' }}>{laster ? '…' : kr(totals.fee)}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#c2beb8]">realisert · garantert {kr(totals.fee_garantert ?? totals.fee)}</p>
            </div>
            <div className="border-b px-4 py-3 xl:border-b-0" data-testid="leieforhold-kpi-felles">
              <div className="flex items-center gap-1.5">
                <span className="h-[6px] w-[6px] rounded-full bg-[#9a6b1c]" />
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Felleskostnader / mnd</p>
              </div>
              <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-tight text-[#0a0a0a]" style={heading}>{kr(fellesTotal)}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#c2beb8]">{okonomi.felles.length} {okonomi.felles.length === 1 ? 'post' : 'poster'} · huseier tar boligkostnadene</p>
            </div>
            <div className="border-b px-4 py-3 xl:border-b-0" data-testid="leieforhold-kpi-margin">
              <div className="flex items-center gap-1.5">
                <span className={`h-[6px] w-[6px] rounded-full ${marginMnd >= 0 ? 'bg-[#1f7a45]' : 'bg-rose-500'}`} />
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">{inklFelles ? 'Margin / mnd' : 'Dekningsbidrag / mnd'}</p>
              </div>
              <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-tight" style={{ ...heading, color: marginMnd >= 0 ? '#1f7a45' : '#e11d48' }}>
                {laster ? '…' : kr(marginMnd)}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#c2beb8]">
                {inklFelles ? 'etter fordelt felleskost' : '≈ 100 % av honoraret — før felleskost'}
              </p>
            </div>
            <div className="border-b px-4 py-3 sm:border-b-0" data-testid="leieforhold-kpi-cac">
              <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">CAC totalt · engangs</p>
              <p className="mt-1.5 text-[18px] font-bold tabular-nums tracking-tight text-[#0a0a0a]" style={heading}>{kr(cacTotal)}</p>
              <p className="mt-0.5 truncate text-[10.5px] text-[#c2beb8]">
                {paybackSnitt ? `payback ~${paybackSnitt.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd samlet` : 'anskaffelseskost per enhet'}
              </p>
            </div>
            <div className="border-b px-4 py-3 sm:border-b-0" data-testid="leieforhold-kpi-breakeven">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Break-even</p>
                {dekningPct != null && <p className="text-[15px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{Math.min(dekningPct, 999)} %</p>}
              </div>
              {dekningPct != null ? (
                <>
                  <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#f1ece4]">
                    <div className={`h-full rounded-full transition-all duration-700 ${dekningPct >= 100 ? 'bg-[#1f7a45]' : 'bg-[#7c3aed]'}`} style={{ width: `${Math.min(dekningPct, 100)}%` }} />
                  </div>
                  <p className="mt-1.5 truncate text-[10.5px] text-[#c2beb8]">
                    {dekningPct >= 100 ? 'nådd — hver ny enhet er ~ren margin' : `honoraret dekker ${dekningPct} % · ~${enheterTilBreakEven} enheter igjen`}
                  </p>
                </>
              ) : (
                <p className="mt-1.5 text-[11px] text-[#c2beb8]">Legg inn felleskostnader for å se dekningsgrad</p>
              )}
            </div>
            <div className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#a3a3a3]">Utleigrad</p>
                <p className="text-[15px] font-bold tabular-nums text-[#0a0a0a]" style={heading}>{totals.occupancy_pct ?? 0} %</p>
              </div>
              <div className="mt-2 h-[7px] overflow-hidden rounded-full bg-[#f1ece4]">
                <div className="h-full rounded-full bg-[#1f7a45] transition-all duration-700" style={{ width: `${totals.occupancy_pct || 0}%` }} />
              </div>
              <p className="mt-1.5 truncate text-[10.5px] text-[#c2beb8]">{totals.leased ?? 0} av {totals.count ?? 0} utleid · snitt honorar {kr(snittHonorar)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Felleskostnader — kompakt lesestripe for investor, panel for admin ═══ */}
      {modus === 'okonomi' && !kanRedigere && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl bg-white px-4 py-2.5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="leieforhold-felles-strip">
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold text-[#1a1a1a]" style={heading}>
            <Coins className="h-3.5 w-3.5 text-[#9a6b1c]" /> Felleskostnader {kr(fellesTotal)}<span className="font-medium text-[#b5b5b5]">/mnd</span>
          </span>
          {okonomi.felles.length > 0 && (
            <span className="truncate text-[11.5px] text-[#a3a3a3]">
              {okonomi.felles.map((p) => `${p.navn} (${FORDELING_LABEL[p.fordeling] || 'likt per enhet'})`).join(' · ')}
            </span>
          )}
          <button
            onClick={() => setInklFelles((v) => !v)}
            data-testid="leieforhold-felles-toggle"
            className="ml-auto flex items-center gap-2 rounded-full bg-[#f8f7f5] px-3 py-1.5 text-[11.5px] font-semibold text-[#555] transition-colors hover:bg-[#f1efec]"
            title="Slå av for å se rent dekningsbidrag (før felleskostnader)"
          >
            <span className={`relative h-4 w-7 rounded-full transition-colors ${inklFelles ? 'bg-[#1f7a45]' : 'bg-[#d8d4cd]'}`}>
              <span className={`absolute top-[2px] h-3 w-3 rounded-full bg-white transition-all ${inklFelles ? 'left-[14px]' : 'left-[2px]'}`} />
            </span>
            Inkluder i margin
          </button>
        </div>
      )}
      {modus === 'okonomi' && kanRedigere && (
        <div className="mt-3 rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="leieforhold-felles-panel">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12.5px] font-bold text-[#1a1a1a]" style={heading}>Felleskostnader</p>
            <span className="text-[11px] text-[#b5b5b5]">fordeles automatisk per enhet</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setInklFelles((v) => !v)}
                data-testid="leieforhold-felles-toggle"
                className="flex items-center gap-2 rounded-full bg-[#f8f7f5] px-3 py-1.5 text-[11.5px] font-semibold text-[#555] transition-colors hover:bg-[#f1efec]"
                title="Slå av for å se rent dekningsbidrag (før felleskostnader)"
              >
                <span className={`relative h-4 w-7 rounded-full transition-colors ${inklFelles ? 'bg-[#1f7a45]' : 'bg-[#d8d4cd]'}`}>
                  <span className={`absolute top-[2px] h-3 w-3 rounded-full bg-white transition-all ${inklFelles ? 'left-[14px]' : 'left-[2px]'}`} />
                </span>
                Inkluder i margin
              </button>
              {kanRedigere && !fellesSkjema && (
                <button
                  onClick={() => setFellesSkjema({ navn: '', belop: '', fordeling: 'alle', kategori: 'lonn' })}
                  data-testid="leieforhold-felles-ny"
                  className="flex h-8 items-center gap-1 rounded-full bg-[#0a0a0a] px-3 text-[11.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97]"
                >
                  <Plus className="h-3.5 w-3.5" /> Legg til
                </button>
              )}
            </div>
          </div>

          {okonomi.felles.length === 0 && !fellesSkjema && (
            <p className="mt-3 text-[12px] text-[#a3a3a3]">Ingen felleskostnader registrert — legg inn f.eks. «Lønn — 1 ansatt · 60 000/mnd», så fordeles den automatisk per enhet.</p>
          )}

          {okonomi.felles.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {okonomi.felles.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fafaf8] px-3 py-2">
                  <span className="rounded-md bg-[#f4f0fb] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#8b5cf6]">{KATEGORI_LABEL[p.kategori] || 'Annet'}</span>
                  <span className="text-[12.5px] font-semibold text-[#1a1a1a]">{p.navn}</span>
                  <span className="text-[11px] text-[#a3a3a3]">· {FORDELING_LABEL[p.fordeling] || 'likt per enhet'}</span>
                  <span className="ml-auto text-[13px] font-bold tabular-nums text-[#0a0a0a]">{kr(p.belop)}<span className="text-[10.5px] font-medium text-[#b5b5b5]">/mnd</span></span>
                  {kanRedigere && (
                    <span className="flex items-center gap-0.5">
                      <button onClick={() => setFellesSkjema({ ...p })} className="flex h-7 w-7 items-center justify-center rounded-full text-[#b5b5b5] transition-colors hover:bg-white hover:text-[#555]" title="Rediger"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => slettFelles(p.id)} disabled={lagrer} className="flex h-7 w-7 items-center justify-center rounded-full text-[#b5b5b5] transition-colors hover:bg-rose-50 hover:text-rose-500" title="Slett"><Trash2 className="h-3.5 w-3.5" /></button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {kanRedigere && fellesSkjema && (
            <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-[#8b5cf6]/20 bg-[#faf8ff] px-3 py-3">
              <label className="flex-1 min-w-[160px]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">Navn</span>
                <input value={fellesSkjema.navn} onChange={(e) => setFellesSkjema((f) => ({ ...f, navn: e.target.value }))} placeholder="F.eks. Lønn — 1 ansatt" autoFocus className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] outline-none focus:border-[#8b5cf6]/50" />
              </label>
              <label className="w-[120px]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">Kr / mnd</span>
                <input type="number" min="0" value={fellesSkjema.belop} onChange={(e) => setFellesSkjema((f) => ({ ...f, belop: e.target.value }))} placeholder="60000" className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2.5 text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/50" />
              </label>
              <label className="w-[150px]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">Fordeling</span>
                <select value={fellesSkjema.fordeling} onChange={(e) => setFellesSkjema((f) => ({ ...f, fordeling: e.target.value }))} className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2 text-[12.5px] outline-none focus:border-[#8b5cf6]/50">
                  <option value="alle">Likt per enhet</option>
                  <option value="utleide">Kun utleide</option>
                  <option value="honorar">Etter honorar</option>
                </select>
              </label>
              <label className="w-[140px]">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">Kategori</span>
                <select value={fellesSkjema.kategori} onChange={(e) => setFellesSkjema((f) => ({ ...f, kategori: e.target.value }))} className="h-9 w-full rounded-lg border border-black/[0.08] bg-white px-2 text-[12.5px] outline-none focus:border-[#8b5cf6]/50">
                  <option value="lonn">Lønn</option>
                  <option value="markedsforing">Markedsføring</option>
                  <option value="programvare">Programvare</option>
                  <option value="annet">Annet</option>
                </select>
              </label>
              <div className="flex items-center gap-1.5">
                <button onClick={lagreFelles} disabled={lagrer || !fellesSkjema.navn?.trim() || !Number(fellesSkjema.belop)} data-testid="leieforhold-felles-lagre" className="flex h-9 items-center gap-1 rounded-full bg-[#0a0a0a] px-4 text-[12px] font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-40">
                  <Check className="h-3.5 w-3.5" /> Lagre
                </button>
                <button onClick={() => setFellesSkjema(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#999] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#555]"><X className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Verktøylinje: søk + statusfilter + sortering ═══ */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[260px]">
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

      {/* ═══ Tabell — fullbredde arbeidsflate ═══ */}
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

        {/* ── UTLEIE-modus ── */}
        {!laster && filtrert.length > 0 && modus === 'utleie' && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px] text-left" data-testid="leieforhold-tabell">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {['Adresse', 'Type', 'Huseier', 'Leietaker', 'Status', 'Innflytting', 'Beløp / mnd', 'Sats', 'Honorar', 'Netto', 'Depositum'].map((h, i) => (
                    <th key={h} className={`px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i >= 6 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => { let idx = -1; return seksjoner.map((sek) => (
                  <React.Fragment key={sek.key || 'alle'}>
                    {sek.key && (
                      <tr className="bg-[#fbfaf9]">
                        <td colSpan={11} className="border-y border-black/[0.04] px-3.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUS_STIL[sek.key].tekst }} />
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a8278]">{sek.key === 'vacant' ? 'Ledig' : sek.rader[0].status_label.replace(' (Annonsert)', '')}</span>
                            <span className="text-[10.5px] tabular-nums text-[#c2beb8]">{sek.rader.length}</span>
                            <span className="ml-auto text-[10.5px] font-semibold tabular-nums text-[#a3a3a3]">{kr(sek.rader.reduce((s, r) => s + (r.monthly_rent || 0), 0))}/mnd</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {sek.rader.map((r) => {
                  idx += 1; const i = idx;
                  const erRom = r.unit_type === 'Rom i bofellesskap';
                  return (
                  <tr key={`${radNokkel(r)}-${i}`} className="border-b border-black/[0.035] transition-colors last:border-b-0 hover:bg-[#fafaf8]" data-testid={`leieforhold-rad-${i}`}>
                    <td className="px-3.5 py-2.5"><AdresseCelle r={r} /></td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[12.5px] text-[#555]">{r.bolig_type || (erRom ? 'Rom' : '—')}</td>
                    <td className="max-w-[150px] truncate px-3.5 py-2.5 text-[12.5px] text-[#555]" title={r.owner_name}>{r.owner_name || '—'}</td>
                    <td className="max-w-[150px] truncate px-3.5 py-2.5 text-[12.5px] text-[#555]" title={r.tenant_name}>{r.tenant_name || '—'}</td>
                    <td className="px-3.5 py-2.5"><StatusChip row={r} /></td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[12.5px] text-[#777]">{r.move_in_date ? dato(r.move_in_date) : '—'}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums text-[#0a0a0a]">
                      {r.group === 'vacant' && !r.monthly_rent
                        ? <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-600">Ikke satt</span>
                        : kr(r.monthly_rent)}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-[#777]">{r.fee_percent ? `${r.fee_percent.toLocaleString('nb-NO')} %` : '—'}</td>
                    <td className={`whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums ${r.group === 'leased' ? 'font-semibold' : ''}`} style={{ color: r.group === 'leased' ? '#7c3aed' : '#c2beb8' }} title={r.group === 'leased' ? 'Realisert honorar' : 'Potensielt honorar — ikke realisert ennå'}>
                      {r.fee_amount ? kr(r.fee_amount) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums" style={{ color: r.group === 'leased' ? '#555' : '#c2beb8' }}>
                      {r.net_to_owner ? kr(r.net_to_owner) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-[#777]">{r.deposit != null ? kr(r.deposit) : '—'}</td>
                  </tr>
                  );
                })}
                  </React.Fragment>
                )); })()}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/[0.06] bg-[#fafaf8]">
                  <td className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Sum ({filtrert.length})</td>
                  <td colSpan={5} />
                  <td className="px-3.5 py-2.5 text-right text-[13px] font-bold tabular-nums text-[#0a0a0a]">{kr(filtrert.reduce((s, r) => s + (r.monthly_rent || 0), 0))}</td>
                  <td />
                  <td className="px-3.5 py-2.5 text-right text-[12.5px] font-bold tabular-nums" style={{ color: '#7c3aed' }} title="Realisert honorar (kun utleide)">{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0))}</td>
                  <td className="px-3.5 py-2.5 text-right text-[12.5px] font-bold tabular-nums text-[#555]">{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.net_to_owner || 0), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>

            {/* Mobil kortliste — utleie */}
            <div className="divide-y divide-black/[0.04] md:hidden" data-testid="leieforhold-kortliste">
              {(() => { let mIdx = -1; return seksjoner.map((sek) => (
                <React.Fragment key={`m-${sek.key || 'alle'}`}>
                  {sek.key && (
                    <div className="flex items-center gap-2 bg-[#fbfaf9] px-4 py-1.5">
                      <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUS_STIL[sek.key].tekst }} />
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a8278]">{sek.key === 'vacant' ? 'Ledig' : sek.rader[0].status_label.replace(' (Annonsert)', '')}</span>
                      <span className="text-[10.5px] tabular-nums text-[#c2beb8]">{sek.rader.length}</span>
                      <span className="ml-auto text-[10.5px] font-semibold tabular-nums text-[#a3a3a3]">{kr(sek.rader.reduce((s, r) => s + (r.monthly_rent || 0), 0))}/mnd</span>
                    </div>
                  )}
                  {sek.rader.map((r) => { mIdx += 1; const i = mIdx; return (
                <div key={`${radNokkel(r)}-${i}`} className="px-4 py-3.5 transition-colors active:bg-[#fafaf8]" data-testid={`leieforhold-kort-${i}`}>
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
                      {r.bolig_type && <p className="truncate">Type · {r.bolig_type}</p>}
                      {r.owner_name && <p className="truncate">Eier · {r.owner_name}</p>}
                      {r.tenant_name && <p className="truncate">Leietaker · {r.tenant_name}</p>}
                      {r.move_in_date && <p>{r.group === 'leased' ? 'Innflyttet' : 'Innflytting'} {dato(r.move_in_date)}</p>}
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
                  ); })}
                </React.Fragment>
              )); })()}
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

        {/* ── ØKONOMI-modus ── */}
        {!laster && filtrert.length > 0 && modus === 'okonomi' && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1050px] text-left" data-testid="leieforhold-okonomi-tabell">
              <thead>
                <tr className="border-b border-black/[0.05]">
                  {[...['Adresse', 'Type', 'Status', 'Honorar / mnd', 'Andel felles', 'Margin / mnd', 'Margin', 'CAC · engangs', 'Payback'], ...(kanRedigere ? [''] : [])].map((h, i) => (
                    <th key={`${h}-${i}`} className={`px-3.5 py-2.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#b5b5b5] ${i >= 3 && i <= 8 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(() => { let idx = -1; return seksjoner.map((sek) => (
                  <React.Fragment key={sek.key || 'alle'}>
                    {sek.key && (
                      <tr className="bg-[#fbfaf9]">
                        <td colSpan={kanRedigere ? 10 : 9} className="border-y border-black/[0.04] px-3.5 py-1.5">
                          <div className="flex items-center gap-2">
                            <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUS_STIL[sek.key].tekst }} />
                            <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a8278]">{sek.key === 'vacant' ? 'Ledig' : sek.rader[0].status_label.replace(' (Annonsert)', '')}</span>
                            <span className="text-[10.5px] tabular-nums text-[#c2beb8]">{sek.rader.length}</span>
                            <span className="ml-auto text-[10.5px] font-semibold tabular-nums text-[#a3a3a3]">honorar {kr(sek.rader.reduce((s, r) => s + (r.fee_amount || 0), 0))}/mnd</span>
                          </div>
                        </td>
                      </tr>
                    )}
                    {sek.rader.map((r) => {
                  idx += 1; const i = idx;
                  const erRom = r.unit_type === 'Rom i bofellesskap';
                  const andel = inklFelles ? (andelKart.get(radNokkel(r)) || 0) : 0;
                  const margin = (r.fee_amount || 0) - andel;
                  const marginPct = r.fee_amount ? Math.round((margin / r.fee_amount) * 100) : null;
                  const cac = cacFor(r);
                  const payback = cac > 0 && r.fee_amount > 0 ? cac / r.fee_amount : null;
                  const notat = okonomi.enheter[radNokkel(r)]?.notat || '';
                  return (
                  <tr key={`${radNokkel(r)}-${i}`} className="group border-b border-black/[0.035] transition-colors last:border-b-0 hover:bg-[#fafaf8]" data-testid={`leieforhold-okonomi-rad-${i}`}>
                    <td className="px-3.5 py-2.5"><AdresseCelle r={r} /></td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-[12.5px] text-[#555]">{r.bolig_type || (erRom ? 'Rom' : '—')}</td>
                    <td className="px-3.5 py-2.5"><StatusChip row={r} /></td>
                    <td className={`whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums ${r.group === 'leased' ? 'font-semibold' : ''}`} style={{ color: r.group === 'leased' ? '#7c3aed' : '#c2beb8' }} title={r.group === 'leased' ? 'Realisert honorar' : 'Potensielt honorar — ikke realisert ennå'}>
                      {r.fee_amount ? kr(r.fee_amount) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-[#9a6b1c]">{andel ? `−${kr(andel)}` : '—'}</td>
                    <td className={`whitespace-nowrap px-3.5 py-2.5 text-right text-[13px] font-semibold tabular-nums`} style={{ color: r.group !== 'leased' ? '#c2beb8' : margin >= 0 ? '#1f7a45' : '#e11d48' }}>
                      {r.fee_amount || andel ? kr(margin) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12px] tabular-nums text-[#a3a3a3]">{marginPct != null ? `${marginPct} %` : '—'}</td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-[#555]" title={notat}>
                      {cac ? kr(cac) : '—'}{notat && <span className="ml-1 text-[10px] text-[#c2beb8]">✎</span>}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-[#777]">
                      {payback ? `${payback.toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd` : '—'}
                    </td>
                    {kanRedigere && (
                      <td className="w-10 px-2 py-2.5 text-right">
                        <button
                          onClick={() => setCacSkjema({ enhetId: radNokkel(r), adresse: r.address, cac: cac || '', notat })}
                          data-testid={`leieforhold-cac-rediger-${i}`}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#c9c5be] opacity-0 transition-all hover:bg-[#f4f0fb] hover:text-[#8b5cf6] group-hover:opacity-100"
                          title="Rediger CAC / notat"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                  );
                })}
                  </React.Fragment>
                )); })()}
              </tbody>
              <tfoot>
                <tr className="border-t border-black/[0.06] bg-[#fafaf8]">
                  <td className="px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Sum ({filtrert.length})</td>
                  <td colSpan={2} />
                  <td className="px-3.5 py-2.5 text-right text-[12.5px] font-bold tabular-nums" style={{ color: '#7c3aed' }} title="Realisert honorar (kun utleide)">{kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0))}</td>
                  <td className="px-3.5 py-2.5 text-right text-[12.5px] font-bold tabular-nums text-[#9a6b1c]">{inklFelles && fellesTotal ? `−${kr(filtrert.reduce((s, r) => s + (andelKart.get(radNokkel(r)) || 0), 0))}` : '—'}</td>
                  <td className="px-3.5 py-2.5 text-right text-[13px] font-bold tabular-nums" style={{ color: marginMnd >= 0 ? '#1f7a45' : '#e11d48' }}>
                    {kr(filtrert.filter((r) => r.group === 'leased').reduce((s, r) => s + (r.fee_amount || 0), 0) - (inklFelles ? filtrert.reduce((s, r) => s + (andelKart.get(radNokkel(r)) || 0), 0) : 0))}
                  </td>
                  <td />
                  <td className="px-3.5 py-2.5 text-right text-[12.5px] font-bold tabular-nums text-[#555]">{kr(filtrert.reduce((s, r) => s + cacFor(r), 0))}</td>
                  <td colSpan={kanRedigere ? 2 : 1} />
                </tr>
              </tfoot>
            </table>
            </div>

            {/* Mobil kortliste — økonomi */}
            <div className="divide-y divide-black/[0.04] md:hidden" data-testid="leieforhold-okonomi-kortliste">
              {(() => { let oIdx = -1; return seksjoner.map((sek) => (
                <React.Fragment key={`o-${sek.key || 'alle'}`}>
                  {sek.key && (
                    <div className="flex items-center gap-2 bg-[#fbfaf9] px-4 py-1.5">
                      <span className="h-[6px] w-[6px] rounded-full" style={{ background: STATUS_STIL[sek.key].tekst }} />
                      <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a8278]">{sek.key === 'vacant' ? 'Ledig' : sek.rader[0].status_label.replace(' (Annonsert)', '')}</span>
                      <span className="text-[10.5px] tabular-nums text-[#c2beb8]">{sek.rader.length}</span>
                      <span className="ml-auto text-[10.5px] font-semibold tabular-nums text-[#a3a3a3]">honorar {kr(sek.rader.reduce((s, r) => s + (r.fee_amount || 0), 0))}/mnd</span>
                    </div>
                  )}
                  {sek.rader.map((r) => {
                oIdx += 1; const i = oIdx;
                const andel = inklFelles ? (andelKart.get(radNokkel(r)) || 0) : 0;
                const margin = (r.fee_amount || 0) - andel;
                const cac = cacFor(r);
                return (
                <div key={`${radNokkel(r)}-${i}`} className="px-4 py-3.5" onClick={() => kanRedigere && setCacSkjema({ enhetId: radNokkel(r), adresse: r.address, cac: cac || '', notat: okonomi.enheter[radNokkel(r)]?.notat || '' })}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] font-semibold leading-tight text-[#1a1a1a]">{String(r.address || '').split(',')[0]}</p>
                      <p className="mt-0.5 truncate text-[11.5px] text-[#a3a3a3]">{r.bolig_type || r.unit_room}{r.unit_type === 'Rom i bofellesskap' ? ` · ${r.enhet_detalj}` : ''}</p>
                    </div>
                    <span className="shrink-0"><StatusChip row={r} /></span>
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div className="space-y-0.5 text-[11.5px] text-[#8a8278]">
                      <p>Honorar {r.fee_amount ? kr(r.fee_amount) : '—'}{andel ? ` · felles −${kr(andel)}` : ''}</p>
                      {cac > 0 && <p>CAC {kr(cac)}{r.fee_amount ? ` · payback ${(cac / r.fee_amount).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd` : ''}</p>}
                    </div>
                    <p className="shrink-0 text-[15px] font-bold tabular-nums" style={{ color: r.group !== 'leased' ? '#c2beb8' : margin >= 0 ? '#1f7a45' : '#e11d48' }}>{kr(margin)}</p>
                  </div>
                </div>
                );
              })}
                </React.Fragment>
              )); })()}
            </div>
          </>
        )}
      </div>

      {/* ═══ CAC-editor (admin) ═══ */}
      {kanRedigere && cacSkjema && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center" onClick={() => setCacSkjema(null)}>
          <div className="w-full max-w-[420px] rounded-2xl bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)]" onClick={(e) => e.stopPropagation()} data-testid="leieforhold-cac-modal">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[14px] font-bold text-[#0a0a0a]" style={heading}>Anskaffelseskostnad (CAC)</p>
                <p className="mt-0.5 text-[12px] text-[#a3a3a3]">{cacSkjema.adresse}</p>
              </div>
              <button onClick={() => setCacSkjema(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-[#b5b5b5] hover:bg-[#f8f7f5] hover:text-[#555]"><X className="h-4 w-4" /></button>
            </div>
            <label className="mt-4 block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">Engangskostnad (kr) — markedsføring/salg for å vinne enheten</span>
              <input type="number" min="0" value={cacSkjema.cac} onChange={(e) => setCacSkjema((f) => ({ ...f, cac: e.target.value }))} placeholder="F.eks. 4500" autoFocus className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[14px] tabular-nums outline-none focus:border-[#8b5cf6]/50" data-testid="leieforhold-cac-input" />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#a3a3a3]">Notat (valgfritt)</span>
              <input value={cacSkjema.notat} onChange={(e) => setCacSkjema((f) => ({ ...f, notat: e.target.value }))} placeholder="F.eks. Meta-annonser juli" className="h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 text-[13px] outline-none focus:border-[#8b5cf6]/50" />
            </label>
            {Number(cacSkjema.cac) > 0 && (() => {
              const rad = rows.find((r) => radNokkel(r) === cacSkjema.enhetId);
              return rad?.fee_amount ? (
                <p className="mt-2 text-[11.5px] text-[#8a8278]">→ Payback: {(Number(cacSkjema.cac) / rad.fee_amount).toLocaleString('nb-NO', { maximumFractionDigits: 1 })} mnd med honorar {kr(rad.fee_amount)}/mnd</p>
              ) : null;
            })()}
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setCacSkjema(null)} className="h-9 rounded-full px-4 text-[12.5px] font-semibold text-[#999] hover:text-[#555]">Avbryt</button>
              <button onClick={lagreCac} disabled={lagrer} data-testid="leieforhold-cac-lagre" className="flex h-9 items-center gap-1 rounded-full bg-[#0a0a0a] px-4 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 disabled:opacity-40">
                <Check className="h-3.5 w-3.5" /> Lagre
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11.5px] text-[#b5b5b5]">
        {modus === 'utleie'
          ? 'Honorar vises eks. mva (leie × sats). Netto = leie − honorar inkl. mva. Grå honorartall er potensial (signert/estimat) — kun utleide telles som realisert. Excel-eksporten har levende formler, nedtrekk og eget «Per huseier»-ark.'
          : 'DigiHome er asset-light: huseier bærer alle boligkostnader. Margin = honorar − fordelte felleskostnader. CAC er engangs anskaffelseskost og blandes ikke inn i månedsmarginen — payback viser hvor raskt honoraret tilbakebetaler den. Grå tall er potensial (ikke-utleide enheter).'}
      </p>
    </div>
  );
}
