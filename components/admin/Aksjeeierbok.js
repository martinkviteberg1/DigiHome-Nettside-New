'use client';

// ─────────────────────────────────────────────────────────────────────────────
// AKSJEEIERBOK — full digital aksjeeierbok (aksjeloven § 4-5) for begge
// DigiHome-selskapene. Transaksjonsbasert: cap table beregnes server-side ved
// å spille av historikken (stiftelse → emisjoner → overdragelser → splitt …),
// med aksjenummer-intervaller, aksjeklasser, tidsreise og utskrift.
// Investorer ser alt read-only — skriving håndheves server-side (admin).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookMarked, Plus, X, Loader2, Trash2, AlertTriangle, Check, Users, Settings2,
  Printer, CalendarClock, Sparkles, ArrowRight, Landmark, User, Coins, PieChart,
  SplitSquareHorizontal, Merge, FileMinus, PenLine,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading, inherit)' };
const AVATAR_FARGER = ['#6d28d9', '#0e7490', '#b45309', '#be185d', '#15803d', '#4338ca', '#a21caf', '#0f766e'];
const avatarFarge = (navn) => {
  let h = 0;
  for (const c of String(navn || '')) h = (h * 31 + c.charCodeAt(0)) % 997;
  return AVATAR_FARGER[h % AVATAR_FARGER.length];
};
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).slice(0, 2).map((d) => d[0]).join('').toUpperCase();
const fmtTall = (n) => new Intl.NumberFormat('nb-NO').format(Number(n) || 0);
const fmtKr = (n) => `${new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 }).format(Number(n) || 0)} kr`;
const fmtPct = (a) => `${(a * 100).toLocaleString('nb-NO', { maximumFractionDigits: 2 })} %`;
const fmtDato = (iso) => { try { return new Date(iso).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return iso; } };
const fmtIntervaller = (ivs) => (ivs || []).map((iv) => (iv.fra === iv.til ? `${fmtTall(iv.fra)}` : `${fmtTall(iv.fra)}–${fmtTall(iv.til)}`)).join(', ');

const TYPE_META = {
  stiftelse: { l: 'Stiftelse', icon: Sparkles, farge: '#6d28d9', bg: '#f0ebfa' },
  emisjon: { l: 'Nyemisjon', icon: Plus, farge: '#15803d', bg: '#eef6f1' },
  overdragelse: { l: 'Overdragelse', icon: ArrowRight, farge: '#1d4ed8', bg: '#eef3fb' },
  splitt: { l: 'Aksjesplitt', icon: SplitSquareHorizontal, farge: '#b45309', bg: '#fdf3e7' },
  spleis: { l: 'Spleis', icon: Merge, farge: '#b45309', bg: '#fdf3e7' },
  sletting: { l: 'Sletting', icon: FileMinus, farge: '#c2413b', bg: '#fdf1f0' },
};

// «1-500, 601-700» → [{fra,til}] (godtar både bindestrek og tankestrek)
function parseIntervaller(tekst) {
  const deler = String(tekst || '').split(',').map((s) => s.trim()).filter(Boolean);
  const ut = [];
  for (const d of deler) {
    const m = d.replace(/\s/g, '').match(/^(\d+)(?:[–-](\d+))?$/);
    if (!m) return null;
    const fra = Number(m[1]); const til = Number(m[2] || m[1]);
    if (!fra || !til || til < fra) return null;
    ut.push({ fra, til });
  }
  return ut.length ? ut : null;
}

// FIFO-plukk: velg de laveste aksjenumrene selgeren eier
function plukkFifo(intervaller, antall) {
  const ut = []; let rest = antall;
  for (const iv of [...(intervaller || [])].sort((a, b) => a.fra - b.fra)) {
    if (rest <= 0) break;
    const ta = Math.min(rest, iv.til - iv.fra + 1);
    ut.push({ fra: iv.fra, til: iv.fra + ta - 1 });
    rest -= ta;
  }
  return rest > 0 ? null : ut;
}

// ═════════════════════════════════════════════════════════════════════════════

export default function Aksjeeierbok({ apiKey, erAdmin }) {
  const [data, setData] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [selskapId, setSelskapId] = useState('');
  const [dato, setDato] = useState('');
  const [visNyTrans, setVisNyTrans] = useState(false);
  const [visEiere, setVisEiere] = useState(false);
  const [visInnstillinger, setVisInnstillinger] = useState(false);
  const [visPrint, setVisPrint] = useState(false);
  const [sletterTrans, setSletterTrans] = useState('');
  const [transFeil, setTransFeil] = useState('');

  const hent = useCallback(async (sid = selskapId, d = dato) => {
    try {
      const params = new URLSearchParams({ key: apiKey });
      if (sid) params.set('selskapId', sid);
      if (d) params.set('dato', d);
      const r = await fetch(`/api/admin/selskap/eierbok?${params}`);
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Kunne ikke hente eierboken');
      setData(j); setFeil('');
      if (!sid && j.selskap) setSelskapId(j.selskap.id);
      return j;
    } catch (e) { setFeil(e.message); return null; }
    finally { setLaster(false); }
  }, [apiKey, selskapId, dato]);

  useEffect(() => { hent(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const byttSelskap = (sid) => { setSelskapId(sid); setLaster(true); hent(sid, dato); };
  const byttDato = (d) => { setDato(d); hent(selskapId, d); };

  const slettTrans = async (t) => {
    if (!window.confirm(`Slette ${TYPE_META[t.type]?.l?.toLowerCase() || 'transaksjonen'} ${fmtDato(t.dato)}? Cap table beregnes på nytt.`)) return;
    setSletterTrans(t.id); setTransFeil('');
    try {
      const r = await fetch(`/api/admin/selskap/transaksjon?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(t.id)}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.ok) { setTransFeil(j.error || 'Kunne ikke slette'); setTimeout(() => setTransFeil(''), 8000); }
      else await hent();
    } finally { setSletterTrans(''); }
  };

  if (laster && !data) return <div className="flex items-center justify-center py-32 text-[#a6a19a]"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (feil && !data) return <div className="mx-auto mt-10 max-w-md rounded-2xl bg-white p-8 text-center shadow-sm"><AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#d97706]" /><p className="text-[14px] text-[#57534e]">{feil}</p></div>;

  const { selskaper = [], selskap, klasser = [], eiere = [], transaksjoner = [], capTable } = data || {};
  const eierAv = Object.fromEntries(eiere.map((e) => [e.id, e]));
  const harTidsreise = !!dato;
  const totRader = capTable?.rader || [];

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* Verktøylinje */}
      <div className="mb-5 flex flex-wrap items-center gap-2.5">
        <div className="max-w-full overflow-x-auto">
          <div className="flex w-max items-center gap-0.5 rounded-full p-[3px]" style={{ background: 'rgba(0,0,0,0.045)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
            {selskaper.map((s) => (
              <button key={s.id} onClick={() => byttSelskap(s.id)} data-testid={`eb-selskap-${s.id}`}
                className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all ${selskapId === s.id ? 'text-white' : 'text-[#8a857d] hover:text-[#57534e]'}`}
                style={selskapId === s.id ? { background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.25)' } : {}}>
                {s.navn}
              </button>
            ))}
          </div>
        </div>
        <span className="flex-1" />
        <label className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11.5px] font-semibold text-[#8a857d] shadow-[0_1px_4px_rgba(0,0,0,0.06),inset_0_0_0_1px_rgba(0,0,0,0.05)]">
          <CalendarClock className="h-3.5 w-3.5" />
          <input type="date" value={dato} onChange={(e) => byttDato(e.target.value)} data-testid="eb-tidsreise"
            className="bg-transparent text-[11.5px] font-semibold text-[#44403c] outline-none" style={{ colorScheme: 'light' }} />
          {dato && <button onClick={() => byttDato('')} className="text-[#a6a19a] hover:text-[#c2413b]"><X className="h-3 w-3" /></button>}
        </label>
        <button onClick={() => setVisPrint(true)} title="Skriv ut eierboken" data-testid="eb-print-btn"
          className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#44403c] shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-95">
          <Printer className="h-3.5 w-3.5" /> Skriv ut
        </button>
        {erAdmin && (
          <>
            <button onClick={() => setVisEiere(true)} data-testid="eb-eiere-btn"
              className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[12px] font-bold text-[#44403c] shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-95">
              <Users className="h-3.5 w-3.5" /> Aksjonærer
            </button>
            <button onClick={() => setVisInnstillinger(true)} title="Pålydende og aksjeklasser" data-testid="eb-innstillinger-btn"
              className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12px] font-bold text-[#44403c] shadow-[0_1px_4px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.05)] transition-all hover:shadow-md active:scale-95">
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setVisNyTrans(true)} data-testid="eb-ny-trans-btn"
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold text-white transition-all hover:opacity-95 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 3px 10px rgba(59,35,115,0.3)' }}>
              <Plus className="h-3.5 w-3.5" /> Ny transaksjon
            </button>
          </>
        )}
      </div>

      {/* Tidsreise-banner */}
      {harTidsreise && (
        <div className="mb-4 flex items-center gap-2.5 rounded-[14px] bg-[#f0ebfa] px-4 py-2.5" data-testid="eb-tidsreise-banner">
          <CalendarClock className="h-4 w-4 text-[#6d28d9]" />
          <p className="text-[12.5px] font-semibold text-[#4c2a94]">Du ser eierboken slik den var {fmtDato(dato)} — transaksjoner etter denne datoen er holdt utenfor.</p>
        </div>
      )}

      {/* Ugyldig kjede */}
      {data?.feil && (
        <div className="mb-4 flex items-start gap-2.5 rounded-[14px] bg-[#fdf3e7] px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#b45309]" />
          <p className="text-[12.5px] leading-relaxed text-[#7c4a12]"><b>Historikken går ikke opp:</b> {data.feil.melding} ({fmtDato(data.feil.dato)}). Rett eller slett transaksjonen det gjelder.</p>
        </div>
      )}
      {transFeil && (
        <div className="mb-4 rounded-[14px] bg-[#fdf1f0] px-4 py-3 text-[12.5px] font-medium text-[#c2413b]">{transFeil}</div>
      )}

      {/* Tom tilstand */}
      {!transaksjoner.length && (
        <div className="mx-auto max-w-md rounded-[22px] bg-white p-10 text-center shadow-[0_2px_16px_rgba(0,0,0,0.05)]">
          <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: 'linear-gradient(135deg, #f0ebfa, #e5d9fb)' }}>
            <BookMarked className="h-6 w-6 text-[#6d28d9]" />
          </span>
          <p className="text-[17px] font-bold text-[#1c1917]" style={heading}>Start aksjeeierboken</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-[#a6a19a]">
            {erAdmin
              ? `Registrer stiftelsen av ${selskap?.navn || 'selskapet'} med aksjonærene og fordelingen — så bygges cap table og historikk automatisk derfra.`
              : 'Administratoren har ikke ført inn aksjonærene ennå.'}
          </p>
          {erAdmin && (
            <button onClick={() => setVisNyTrans(true)} data-testid="eb-start-btn"
              className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-95 active:scale-95"
              style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)', boxShadow: '0 4px 14px rgba(59,35,115,0.3)' }}>
              <Sparkles className="h-4 w-4" /> Registrer stiftelsen
            </button>
          )}
        </div>
      )}

      {capTable && transaksjoner.length > 0 && (
        <>
          <style>{`
            @keyframes dhEbInn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            @keyframes dhEbDonut { from { stroke-dashoffset: 620; } }
          `}</style>
          {/* KPI-rad */}
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: 'Aksjekapital', v: fmtKr(capTable.aksjekapital), sub: 'registrert kapital', icon: Landmark, tone: '#6d28d9', bg: '#f0ebfa' },
              { l: 'Antall aksjer', v: fmtTall(capTable.totalAksjer), sub: `à ${fmtKr(capTable.palydende)} pålydende`, icon: Coins, tone: '#b45309', bg: '#fdf3e7' },
              { l: 'Aksjonærer', v: fmtTall(totRader.length), sub: klasser.length === 1 ? '1 aksjeklasse' : `${klasser.length} aksjeklasser`, icon: Users, tone: '#0e7490', bg: '#e8f4f6' },
              { l: 'Største eier', v: totRader[0] ? fmtPct(totRader[0].andel) : '—', sub: totRader[0]?.navn || '', icon: PieChart, tone: '#15803d', bg: '#eef6f1' },
            ].map((k, i) => (
              <div key={k.l}
                className="rounded-[20px] bg-white px-5 py-4 shadow-[0_1px_8px_rgba(20,16,40,0.05),inset_0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(20,16,40,0.09)]"
                style={{ animation: `dhEbInn 420ms cubic-bezier(0.22,1,0.36,1) ${i * 60}ms both` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.13em] text-[#b3ada3]">{k.l}</p>
                    <p className="mt-1.5 truncate text-[17px] font-bold tabular-nums tracking-tight text-[#1c1917] sm:text-[21px]" style={heading}>{k.v}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-[#a6a19a]">{k.sub}</p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px]" style={{ background: k.bg }}>
                    <k.icon className="h-4 w-4" style={{ color: k.tone }} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Eierfordeling — donut + elegant legende */}
          <div className="mb-4 rounded-[22px] bg-white px-6 py-5 shadow-[0_1px_8px_rgba(20,16,40,0.05),inset_0_0_0_1px_rgba(0,0,0,0.04)]" style={{ animation: 'dhEbInn 420ms cubic-bezier(0.22,1,0.36,1) 240ms both' }}>
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b3ada3]">Eierfordeling{harTidsreise ? ` · per ${fmtDato(dato)}` : ''}</p>
            <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center" data-testid="eb-eierbar">
              <EierDonut rader={totRader} totalAksjer={capTable.totalAksjer} />
              <div className="w-full min-w-0 flex-1 space-y-2">
                {totRader.map((r, i) => (
                  <div key={r.eierId} className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: avatarFarge(r.navn) }} />
                    <span className="w-5 shrink-0 text-[10px] font-bold tabular-nums text-[#c2beb8]">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-[#44403c]">{r.navn}</span>
                    <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-[#f1efe9] sm:block">
                      <span className="block h-full rounded-full transition-all" style={{ width: `${r.andel * 100}%`, background: avatarFarge(r.navn) }} />
                    </span>
                    <span className="w-16 shrink-0 text-right text-[12px] font-bold tabular-nums text-[#1c1917]">{fmtPct(r.andel)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Cap table */}
          <div className="mb-5 overflow-hidden rounded-[22px] bg-white shadow-[0_1px_8px_rgba(20,16,40,0.05),inset_0_0_0_1px_rgba(0,0,0,0.04)]" data-testid="eb-captable" style={{ animation: 'dhEbInn 420ms cubic-bezier(0.22,1,0.36,1) 320ms both' }}>
            <div className="flex items-center justify-between border-b border-black/[0.05] px-6 py-3.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#b3ada3]">Aksjeeierbok · cap table</p>
              <p className="text-[10.5px] tabular-nums text-[#c2beb8]">{fmtTall(capTable.totalAksjer)} aksjer · {fmtTall(totRader.length)} eiere</p>
            </div>
            <div className="hidden grid-cols-[36px_minmax(180px,1.6fr)_1fr_1fr_minmax(140px,1.4fr)_0.9fr_0.9fr] gap-3 border-b border-black/[0.05] px-6 py-3 sm:grid">
              {['#', 'Aksjonær', 'Klasse', 'Antall aksjer', 'Aksjenr.', 'Eierandel', 'Stemmer'].map((h) => (
                <p key={h} className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-[#b3ada3]">{h}</p>
              ))}
            </div>
            {totRader.map((r, i) => (
              <div key={r.eierId} className={`grid grid-cols-2 gap-3 px-6 py-3.5 transition-colors hover:bg-[#faf9f7] sm:grid-cols-[36px_minmax(180px,1.6fr)_1fr_1fr_minmax(140px,1.4fr)_0.9fr_0.9fr] ${i ? 'border-t border-black/[0.04]' : ''}`}>
                <p className="hidden items-center text-[11px] font-bold tabular-nums text-[#c2beb8] sm:flex">{i + 1}</p>
                <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${avatarFarge(r.navn)}, ${avatarFarge(r.navn)}bb)`, boxShadow: '0 2px 8px rgba(20,16,40,0.12)' }}>
                    {r.type === 'selskap' ? <Landmark className="h-4 w-4" /> : initialer(r.navn)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-[#1c1917]">{r.navn}</p>
                    <p className="text-[10px] text-[#b3ada3]">{r.type === 'selskap' ? `Selskap${r.orgnr ? ` · ${r.orgnr}` : ''}` : 'Privatperson'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {Object.entries(r.klasser).map(([kn, ant]) => (
                    <span key={kn} className="rounded-full bg-[#f4f1ec] px-2 py-[2px] text-[9.5px] font-bold text-[#8a857d]" title={`${fmtTall(ant)} aksjer`}>{kn}</span>
                  ))}
                </div>
                <p className="flex items-center text-[13px] font-bold tabular-nums text-[#1c1917]">{fmtTall(r.antall)}</p>
                <p className="hidden items-center text-[11px] tabular-nums leading-relaxed text-[#8a857d] sm:flex">{fmtIntervaller(r.intervaller)}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[12.5px] font-bold tabular-nums text-[#1c1917]">{fmtPct(r.andel)}</span>
                  <span className="hidden h-1.5 flex-1 overflow-hidden rounded-full bg-[#f1efe9] sm:block">
                    <span className="block h-full rounded-full" style={{ width: `${r.andel * 100}%`, background: avatarFarge(r.navn) }} />
                  </span>
                </div>
                <p className="hidden items-center text-[12px] font-semibold tabular-nums text-[#8a857d] sm:flex">{fmtPct(r.stemmeAndel)}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Transaksjonshistorikk — tidslinje */}
      {transaksjoner.length > 0 && (
        <div className="mb-8" style={{ animation: 'dhEbInn 420ms cubic-bezier(0.22,1,0.36,1) 380ms both' }}>
          <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[#b3ada3]">Transaksjonshistorikk · {transaksjoner.length}</p>
          <div className="relative" data-testid="eb-transaksjoner">
            {/* Tidslinje-skinnen */}
            <span className="pointer-events-none absolute bottom-5 left-[21px] top-5 w-px" style={{ background: 'linear-gradient(180deg, rgba(109,40,217,0.25), rgba(28,25,23,0.08))' }} />
            <div className="space-y-2.5">
              {[...transaksjoner].sort((a, b) => (b.dato === a.dato ? String(b.createdAt).localeCompare(String(a.createdAt)) : String(b.dato).localeCompare(String(a.dato)))).map((t) => {
                const meta = TYPE_META[t.type] || TYPE_META.emisjon;
                const Ikon = meta.icon;
                const utenfor = harTidsreise && String(t.dato) > dato;
                return (
                  <div key={t.id} className={`relative flex items-start gap-3.5 pl-11 ${utenfor ? 'opacity-45' : ''}`}>
                    {/* Node på skinnen */}
                    <span className="absolute left-[9px] top-4 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white"
                      style={{ boxShadow: `0 2px 8px rgba(20,16,40,0.10), inset 0 0 0 1.5px ${meta.farge}33` }}>
                      <Ikon className="h-3 w-3" style={{ color: meta.farge }} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-[16px] bg-white px-5 py-4 shadow-[0_1px_6px_rgba(20,16,40,0.04),inset_0_0_0_1px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_6px_18px_rgba(20,16,40,0.08)]">
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2.5">
                            <p className="text-[13px] font-bold text-[#1c1917]">{meta.l}</p>
                            <p className="text-[11px] font-medium tabular-nums text-[#a6a19a]">{fmtDato(t.dato)}</p>
                            {utenfor && <span className="rounded-full bg-[#f1efe9] px-1.5 py-[1px] text-[8.5px] font-bold text-[#8a857d]">Etter valgt dato</span>}
                          </div>
                          <TransBeskrivelse t={t} eierAv={eierAv} klasser={klasser} />
                          {t.notat && <p className="mt-1 text-[11px] italic text-[#a6a19a]">«{t.notat}»</p>}
                          {t.registrertAv && <p className="mt-1 text-[9.5px] text-[#c2beb8]">Ført av {t.registrertAv}</p>}
                        </div>
                        {erAdmin && (
                          <button onClick={() => slettTrans(t)} disabled={sletterTrans === t.id} title="Slett transaksjonen" data-testid={`eb-slett-trans-${t.id}`}
                            className="rounded-[9px] p-1.5 text-[#c2beb8] transition-colors hover:bg-[#fdf1f0] hover:text-[#c2413b]">
                            {sletterTrans === t.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modaler */}
      {visNyTrans && (
        <NyTransaksjonModal
          apiKey={apiKey} selskap={selskap} klasser={klasser} eiere={eiere} capTable={capTable}
          harStiftelse={transaksjoner.some((t) => t.type === 'stiftelse')}
          onLukk={() => setVisNyTrans(false)}
          onLagret={() => { setVisNyTrans(false); hent(); }}
        />
      )}
      {visEiere && (
        <EiereModal apiKey={apiKey} eiere={eiere} onLukk={() => setVisEiere(false)} onEndret={() => hent()} />
      )}
      {visInnstillinger && (
        <InnstillingerModal apiKey={apiKey} selskap={selskap} klasser={klasser} harTransaksjoner={transaksjoner.length > 0}
          onLukk={() => setVisInnstillinger(false)} onEndret={() => hent()} />
      )}
      {visPrint && (
        <PrintVisning data={data} onLukk={() => setVisPrint(false)} />
      )}
    </div>
  );
}

// Donut-diagram over eierandeler — ren SVG, ingen bibliotek
function EierDonut({ rader, totalAksjer }) {
  const R = 62; const OMKRETS = 2 * Math.PI * R;
  const GAP = rader.length > 1 ? 2.5 : 0; // luft mellom segmentene (px langs buen)
  let akk = 0;
  const segmenter = rader.map((r) => {
    const len = Math.max(r.andel * OMKRETS - GAP, 0.5);
    const seg = { navn: r.navn, len, offset: akk + GAP / 2 };
    akk += r.andel * OMKRETS;
    return seg;
  });
  return (
    <div className="relative h-[168px] w-[168px] shrink-0">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={R} fill="none" stroke="#f1efe9" strokeWidth="15" />
        {segmenter.map((s, i) => (
          <circle key={i} cx="80" cy="80" r={R} fill="none" stroke={avatarFarge(s.navn)} strokeWidth="15"
            strokeDasharray={`${s.len} ${OMKRETS - s.len}`} strokeDashoffset={-s.offset} strokeLinecap={rader.length > 1 ? 'butt' : 'round'}
            style={{ animation: `dhEbDonut 900ms cubic-bezier(0.22,1,0.36,1) ${i * 90}ms both`, transition: 'stroke-dashoffset 400ms' }} />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[19px] font-bold tabular-nums leading-tight text-[#1c1917]" style={heading}>{fmtTall(totalAksjer)}</p>
        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#b3ada3]">aksjer</p>
      </div>
    </div>
  );
}

function TransBeskrivelse({ t, eierAv, klasser }) {
  const navn = (id) => eierAv[id]?.navn || 'Ukjent';
  const klasseNavn = (id) => klasser.find((k) => k.id === id)?.navn || 'Ordinære';
  if (t.type === 'stiftelse' || t.type === 'emisjon') {
    const total = (t.poster || []).reduce((a, p) => a + p.antall, 0);
    return (
      <div className="mt-0.5 text-[12px] leading-relaxed text-[#57534e]">
        <span className="font-semibold">{fmtTall(total)} aksjer</span> {t.type === 'stiftelse' ? 'utstedt ved stiftelsen' : 'utstedt'}
        {(t.poster || []).map((p) => (
          <span key={`${p.eierId}-${p.fraNr}`} className="block text-[11.5px] text-[#8a857d]">
            → {navn(p.eierId)}: {fmtTall(p.antall)} aksjer (nr. {fmtTall(p.fraNr)}–{fmtTall(p.tilNr)}{klasseNavn(p.klasseId) !== 'Ordinære' ? ` · ${klasseNavn(p.klasseId)}` : ''}{p.kurs != null ? ` · kurs ${fmtKr(p.kurs)}` : ''})
          </span>
        ))}
      </div>
    );
  }
  if (t.type === 'overdragelse') {
    const ant = (t.intervaller || []).reduce((a, iv) => a + iv.til - iv.fra + 1, 0);
    return (
      <p className="mt-0.5 text-[12px] leading-relaxed text-[#57534e]">
        <span className="font-semibold">{navn(t.fraEierId)}</span> overdro <span className="font-semibold">{fmtTall(ant)} aksjer</span> (nr. {fmtIntervaller(t.intervaller)}) til <span className="font-semibold">{navn(t.tilEierId)}</span>
        {t.vederlag != null ? <span className="text-[#8a857d]"> · vederlag {fmtKr(t.vederlag)}</span> : ''}
      </p>
    );
  }
  if (t.type === 'splitt') return <p className="mt-0.5 text-[12px] text-[#57534e]">Hver aksje ble til <span className="font-semibold">{t.faktor}</span> — pålydende delt på {t.faktor}</p>;
  if (t.type === 'spleis') return <p className="mt-0.5 text-[12px] text-[#57534e]"><span className="font-semibold">{t.faktor}</span> aksjer slått sammen til én — pålydende ganget med {t.faktor}</p>;
  if (t.type === 'sletting') {
    const ant = (t.intervaller || []).reduce((a, iv) => a + iv.til - iv.fra + 1, 0);
    return <p className="mt-0.5 text-[12px] text-[#57534e]"><span className="font-semibold">{fmtTall(ant)} aksjer</span> slettet (nr. {fmtIntervaller(t.intervaller)})</p>;
  }
  return null;
}

// ── Modal: ny transaksjon ────────────────────────────────────────────────────

const inp = 'w-full rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5 text-[13px] text-[#1c1917] outline-none transition-all placeholder:text-[#c2beb8] focus:bg-white';
const inpStil = { boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' };
const lbl = 'mb-1.5 block text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#b3ada3]';

function NyTransaksjonModal({ apiKey, selskap, klasser, eiere, capTable, harStiftelse, onLukk, onLagret }) {
  const typer = harStiftelse ? ['emisjon', 'overdragelse', 'splitt', 'spleis', 'sletting'] : ['stiftelse'];
  const [type, setType] = useState(typer[0]);
  const [dato, setDato] = useState(new Date().toISOString().slice(0, 10));
  const [notat, setNotat] = useState('');
  const [lagrer, setLagrer] = useState(false);
  const [feilM, setFeilM] = useState('');
  const [lokaleEiere, setLokaleEiere] = useState(eiere);
  const [visNyEier, setVisNyEier] = useState(false);
  const [nyEierNavn, setNyEierNavn] = useState('');
  const [nyEierType, setNyEierType] = useState('person');

  // Stiftelse/emisjon: poster
  const startNr = capTable?.nesteNr || 1;
  const [palydende, setPalydende] = useState(String(selskap?.palydende ?? 1));
  const [poster, setPoster] = useState([{ eierId: '', klasseId: klasser[0]?.id || '', antall: '', kurs: '' }]);
  // Overdragelse
  const [fraEierId, setFraEierId] = useState('');
  const [tilEierId, setTilEierId] = useState('');
  const [antallOv, setAntallOv] = useState('');
  const [manIntervaller, setManIntervaller] = useState('');
  const [brukManuell, setBrukManuell] = useState(false);
  const [vederlag, setVederlag] = useState('');
  // Splitt/spleis/sletting
  const [faktor, setFaktor] = useState('');
  const [slettIntervaller, setSlettIntervaller] = useState('');

  // Løpende aksjenummer for postene (auto)
  const posterMedNr = useMemo(() => {
    let neste = type === 'stiftelse' ? 1 : startNr;
    return poster.map((p) => {
      const antall = Number(p.antall) || 0;
      const rad = { ...p, fraNr: neste, tilNr: antall > 0 ? neste + antall - 1 : neste };
      if (antall > 0) neste += antall;
      return rad;
    });
  }, [poster, startNr, type]);

  const selgersIntervaller = useMemo(() => {
    const rad = (capTable?.rader || []).find((r) => r.eierId === fraEierId);
    return rad ? rad.intervaller : [];
  }, [capTable, fraEierId]);
  const autoIntervaller = useMemo(() => {
    const ant = Number(antallOv) || 0;
    if (!ant || !selgersIntervaller.length) return null;
    return plukkFifo(selgersIntervaller, ant);
  }, [antallOv, selgersIntervaller]);

  const opprettEier = async () => {
    if (!nyEierNavn.trim()) return;
    const r = await fetch(`/api/admin/selskap/eier?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ navn: nyEierNavn.trim(), type: nyEierType }),
    });
    const j = await r.json();
    if (j.ok) { setLokaleEiere((l) => [...l, j.eier].sort((a, b) => a.navn.localeCompare(b.navn))); setNyEierNavn(''); setVisNyEier(false); }
    else setFeilM(j.error || 'Kunne ikke opprette aksjonæren');
  };

  const lagre = async () => {
    setFeilM('');
    const body = { selskapId: selskap.id, type, dato, notat };
    if (type === 'stiftelse' || type === 'emisjon') {
      if (posterMedNr.some((p) => !p.eierId || !Number(p.antall))) { setFeilM('Alle postene trenger aksjonær og antall'); return; }
      body.poster = posterMedNr.map((p) => ({ eierId: p.eierId, klasseId: p.klasseId, antall: Number(p.antall), fraNr: p.fraNr, tilNr: p.tilNr, kurs: p.kurs === '' ? null : Number(p.kurs) }));
      if (type === 'stiftelse') body.palydende = Number(palydende) || 1;
    } else if (type === 'overdragelse') {
      const ivs = brukManuell ? parseIntervaller(manIntervaller) : autoIntervaller;
      if (!fraEierId || !tilEierId) { setFeilM('Velg både selger og kjøper'); return; }
      if (!ivs) { setFeilM(brukManuell ? 'Skriv intervaller som «1–500, 601–700»' : 'Selgeren eier ikke så mange aksjer'); return; }
      body.fraEierId = fraEierId; body.tilEierId = tilEierId; body.intervaller = ivs;
      if (vederlag !== '') body.vederlag = Number(vederlag);
    } else if (type === 'splitt' || type === 'spleis') {
      body.faktor = Number(faktor);
    } else if (type === 'sletting') {
      const ivs = parseIntervaller(slettIntervaller);
      if (!ivs) { setFeilM('Skriv intervaller som «1–500, 601–700»'); return; }
      body.intervaller = ivs;
    }
    setLagrer(true);
    try {
      const r = await fetch(`/api/admin/selskap/transaksjon?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke lagre transaksjonen');
      onLagret();
    } catch (e) { setFeilM(e.message); }
    finally { setLagrer(false); }
  };

  const eierValg = (verdi, sett, testid, kunEksisterende = false) => (
    <select value={verdi} onChange={(e) => sett(e.target.value)} className={inp} style={inpStil} data-testid={testid}>
      <option value="">Velg aksjonær …</option>
      {(kunEksisterende ? lokaleEiere.filter((e) => (capTable?.rader || []).some((r) => r.eierId === e.id)) : lokaleEiere).map((e) => (
        <option key={e.id} value={e.id}>{e.navn}{e.type === 'selskap' ? ' (selskap)' : ''}</option>
      ))}
    </select>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="eb-trans-modal">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#1c1917]" style={heading}>{harStiftelse ? 'Ny transaksjon' : 'Registrer stiftelsen'}</h3>
          <button onClick={onLukk} className="rounded-full p-1.5 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>

        {harStiftelse && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {typer.map((ty) => {
              const meta = TYPE_META[ty];
              return (
                <button key={ty} onClick={() => { setType(ty); setFeilM(''); }} data-testid={`eb-type-${ty}`}
                  className={`rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all ${type === ty ? 'text-white' : 'text-[#8a857d] hover:text-[#44403c]'}`}
                  style={type === ty ? { background: meta.farge } : { background: '#faf9f7', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
                  {meta.l}
                </button>
              );
            })}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Dato</label>
              <input type="date" value={dato} onChange={(e) => setDato(e.target.value)} className={inp} style={{ ...inpStil, colorScheme: 'light' }} data-testid="eb-trans-dato" />
            </div>
            {type === 'stiftelse' && (
              <div>
                <label className={lbl}>Pålydende per aksje</label>
                <input type="number" step="0.01" value={palydende} onChange={(e) => setPalydende(e.target.value)} className={inp} style={inpStil} data-testid="eb-trans-palydende" />
              </div>
            )}
            {(type === 'splitt' || type === 'spleis') && (
              <div>
                <label className={lbl}>{type === 'splitt' ? 'Splitt 1 : N' : 'Spleis N : 1'}</label>
                <input type="number" min="2" value={faktor} onChange={(e) => setFaktor(e.target.value)} placeholder="F.eks. 10" className={inp} style={inpStil} data-testid="eb-trans-faktor" />
              </div>
            )}
          </div>

          {(type === 'stiftelse' || type === 'emisjon') && (
            <div>
              <label className={lbl}>Fordeling {type === 'emisjon' ? `— nye aksjer fra nr. ${fmtTall(startNr)}` : ''}</label>
              <div className="space-y-2">
                {posterMedNr.map((p, i) => (
                  <div key={i} className="rounded-[14px] bg-[#faf9f7] p-3" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.045)' }}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <select value={p.eierId} onChange={(e) => setPoster((ps) => ps.map((x, j) => (j === i ? { ...x, eierId: e.target.value } : x)))}
                          className="w-full rounded-[10px] bg-white px-3 py-2 text-[12.5px] outline-none" style={inpStil} data-testid={`eb-post-eier-${i}`}>
                          <option value="">Velg aksjonær …</option>
                          {lokaleEiere.map((e) => <option key={e.id} value={e.id}>{e.navn}{e.type === 'selskap' ? ' (selskap)' : ''}</option>)}
                        </select>
                      </div>
                      {poster.length > 1 && (
                        <button onClick={() => setPoster((ps) => ps.filter((_, j) => j !== i))} className="rounded-[8px] p-1.5 text-[#c2beb8] hover:text-[#c2413b]"><X className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      <input type="number" min="1" value={p.antall} placeholder="Antall"
                        onChange={(e) => setPoster((ps) => ps.map((x, j) => (j === i ? { ...x, antall: e.target.value } : x)))}
                        className="rounded-[10px] bg-white px-3 py-2 text-[12.5px] outline-none" style={inpStil} data-testid={`eb-post-antall-${i}`} />
                      <input type="number" step="0.01" min="0" value={p.kurs} placeholder="Kurs (valgfri)"
                        onChange={(e) => setPoster((ps) => ps.map((x, j) => (j === i ? { ...x, kurs: e.target.value } : x)))}
                        className="rounded-[10px] bg-white px-3 py-2 text-[12.5px] outline-none" style={inpStil} />
                      {klasser.length > 1 ? (
                        <select value={p.klasseId} onChange={(e) => setPoster((ps) => ps.map((x, j) => (j === i ? { ...x, klasseId: e.target.value } : x)))}
                          className="rounded-[10px] bg-white px-3 py-2 text-[12.5px] outline-none" style={inpStil}>
                          {klasser.map((k) => <option key={k.id} value={k.id}>{k.navn}</option>)}
                        </select>
                      ) : (
                        <span className="flex items-center justify-center rounded-[10px] bg-white/60 px-2 text-[10.5px] tabular-nums text-[#a6a19a]" style={inpStil}>
                          {Number(p.antall) > 0 ? `Nr. ${fmtTall(p.fraNr)}–${fmtTall(p.tilNr)}` : 'Nr. —'}
                        </span>
                      )}
                    </div>
                    {klasser.length > 1 && Number(p.antall) > 0 && (
                      <p className="mt-1.5 text-[10px] tabular-nums text-[#a6a19a]">Aksjenr. {fmtTall(p.fraNr)}–{fmtTall(p.tilNr)}</p>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <button onClick={() => setPoster((ps) => [...ps, { eierId: '', klasseId: klasser[0]?.id || '', antall: '', kurs: '' }])}
                  className="flex items-center gap-1 rounded-full bg-[#faf9f7] px-3 py-1.5 text-[11px] font-bold text-[#57534e] transition-colors hover:bg-[#f1efe9]" style={inpStil} data-testid="eb-post-leggtil">
                  <Plus className="h-3 w-3" /> Flere aksjonærer
                </button>
                <button onClick={() => setVisNyEier((v) => !v)} className="flex items-center gap-1 rounded-full bg-[#faf9f7] px-3 py-1.5 text-[11px] font-bold text-[#6d28d9] transition-colors hover:bg-[#f0ebfa]" style={inpStil} data-testid="eb-ny-eier-toggle">
                  <User className="h-3 w-3" /> Ny aksjonær
                </button>
              </div>
            </div>
          )}

          {type === 'overdragelse' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Fra (selger)</label>
                  {eierValg(fraEierId, setFraEierId, 'eb-ov-fra', true)}
                </div>
                <div>
                  <label className={lbl}>Til (kjøper)</label>
                  {eierValg(tilEierId, setTilEierId, 'eb-ov-til')}
                </div>
              </div>
              <button onClick={() => setVisNyEier((v) => !v)} className="flex items-center gap-1 rounded-full bg-[#faf9f7] px-3 py-1.5 text-[11px] font-bold text-[#6d28d9] transition-colors hover:bg-[#f0ebfa]" style={inpStil}>
                <User className="h-3 w-3" /> Ny aksjonær
              </button>
              {fraEierId && (
                <p className="text-[11px] text-[#a6a19a]">Selgeren eier: <span className="tabular-nums">{fmtIntervaller(selgersIntervaller)}</span></p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Antall aksjer</label>
                  <input type="number" min="1" value={antallOv} onChange={(e) => setAntallOv(e.target.value)} className={inp} style={inpStil} data-testid="eb-ov-antall" />
                </div>
                <div>
                  <label className={lbl}>Vederlag (valgfri)</label>
                  <input type="number" step="0.01" min="0" value={vederlag} onChange={(e) => setVederlag(e.target.value)} placeholder="Sum i kr" className={inp} style={inpStil} />
                </div>
              </div>
              {!brukManuell && autoIntervaller && (
                <p className="rounded-[12px] bg-[#f0ebfa] px-3.5 py-2.5 text-[11.5px] text-[#4c2a94]">
                  Overdras (laveste numre først): <b className="tabular-nums">{fmtIntervaller(autoIntervaller)}</b>
                  <button onClick={() => { setBrukManuell(true); setManIntervaller(fmtIntervaller(autoIntervaller).replace(/\s/g, '')); }} className="ml-2 font-bold underline">Velg selv</button>
                </p>
              )}
              {brukManuell && (
                <div>
                  <label className={lbl}>Aksjenumre som overdras</label>
                  <input value={manIntervaller} onChange={(e) => setManIntervaller(e.target.value)} placeholder="F.eks. 1–500, 601–700" className={inp} style={inpStil} data-testid="eb-ov-intervaller" />
                </div>
              )}
            </>
          )}

          {type === 'sletting' && (
            <div>
              <label className={lbl}>Aksjenumre som slettes</label>
              <input value={slettIntervaller} onChange={(e) => setSlettIntervaller(e.target.value)} placeholder="F.eks. 901–1000" className={inp} style={inpStil} data-testid="eb-slett-intervaller" />
              <p className="mt-1.5 text-[10.5px] text-[#a6a19a]">Ved kapitalnedsettelse/innløsning — numrene pensjoneres, øvrige beholder sine.</p>
            </div>
          )}

          {visNyEier && (
            <div className="rounded-[14px] bg-[#f0ebfa]/60 p-3.5" data-testid="eb-ny-eier-panel">
              <label className={lbl}>Ny aksjonær</label>
              <div className="flex gap-2">
                <input value={nyEierNavn} onChange={(e) => setNyEierNavn(e.target.value)} placeholder="Navn (person eller selskap)" className={inp} style={inpStil} data-testid="eb-ny-eier-navn" />
                <select value={nyEierType} onChange={(e) => setNyEierType(e.target.value)} className="rounded-[12px] bg-[#faf9f7] px-2.5 text-[12px] outline-none" style={inpStil}>
                  <option value="person">Person</option>
                  <option value="selskap">Selskap</option>
                </select>
                <button onClick={opprettEier} className="rounded-[12px] bg-[#1c1917] px-3.5 text-[12px] font-bold text-white active:scale-95" data-testid="eb-ny-eier-lagre">Legg til</button>
              </div>
            </div>
          )}

          <div>
            <label className={lbl}>Notat (valgfri)</label>
            <input value={notat} onChange={(e) => setNotat(e.target.value)} placeholder="F.eks. generalforsamlingsvedtak, emisjonsrunde …" className={inp} style={inpStil} />
          </div>

          {feilM && <p className="rounded-[12px] bg-[#fdf1f0] px-3.5 py-2.5 text-[12px] font-medium text-[#c2413b]" data-testid="eb-trans-feil">{feilM}</p>}

          <button onClick={lagre} disabled={lagrer} data-testid="eb-trans-lagre"
            className="flex w-full items-center justify-center gap-2 rounded-[13px] py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-95 active:scale-[0.99]"
            style={{ background: 'linear-gradient(135deg, #1c1917 10%, #4c2a94 140%)' }}>
            {lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Før inn i eierboken
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: aksjonærer ────────────────────────────────────────────────────────

function EiereModal({ apiKey, eiere, onLukk, onEndret }) {
  const [liste, setListe] = useState(eiere);
  const [rediger, setRediger] = useState(null); // {id?, navn, type, orgnr, epost}
  const [feilM, setFeilM] = useState('');
  const [lagrer, setLagrer] = useState(false);

  const lagre = async () => {
    setFeilM(''); setLagrer(true);
    try {
      const metode = rediger.id ? 'PUT' : 'POST';
      const r = await fetch(`/api/admin/selskap/eier?key=${encodeURIComponent(apiKey)}`, {
        method: metode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rediger),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke lagre');
      setListe((l) => (rediger.id ? l.map((e) => (e.id === rediger.id ? j.eier : e)) : [...l, j.eier]).sort((a, b) => a.navn.localeCompare(b.navn)));
      setRediger(null);
      onEndret();
    } catch (e) { setFeilM(e.message); }
    finally { setLagrer(false); }
  };

  const slett = async (e) => {
    if (!window.confirm(`Slette «${e.navn}»?`)) return;
    const r = await fetch(`/api/admin/selskap/eier?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(e.id)}`, { method: 'DELETE' });
    const j = await r.json();
    if (!j.ok) { setFeilM(j.error || 'Kunne ikke slette'); return; }
    setListe((l) => l.filter((x) => x.id !== e.id));
    onEndret();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-[22px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="eb-eiere-modal">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#1c1917]" style={heading}>Aksjonærer</h3>
          <button onClick={onLukk} className="rounded-full p-1.5 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-4 text-[11.5px] leading-relaxed text-[#a6a19a]">Registeret er felles for begge selskapene — samme aksjonær kan eie i begge. Aksjonærer i bruk kan ikke slettes.</p>
        <div className="space-y-1.5">
          {liste.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5 rounded-[13px] bg-[#faf9f7] px-3.5 py-2.5" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: avatarFarge(e.navn) }}>
                {e.type === 'selskap' ? <Landmark className="h-3.5 w-3.5" /> : initialer(e.navn)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-[#1c1917]">{e.navn}</p>
                <p className="text-[10px] text-[#b3ada3]">{e.type === 'selskap' ? `Selskap${e.orgnr ? ` · ${e.orgnr}` : ''}` : 'Privatperson'}{e.epost ? ` · ${e.epost}` : ''}</p>
              </div>
              <button onClick={() => setRediger({ id: e.id, navn: e.navn, type: e.type, orgnr: e.orgnr || '', epost: e.epost || '' })} className="rounded-[8px] p-1.5 text-[#a6a19a] hover:bg-white hover:text-[#1c1917]"><PenLine className="h-3.5 w-3.5" /></button>
              <button onClick={() => slett(e)} className="rounded-[8px] p-1.5 text-[#c2beb8] hover:bg-white hover:text-[#c2413b]"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          ))}
          {!liste.length && <p className="py-4 text-center text-[12px] text-[#b3ada3]">Ingen aksjonærer registrert ennå</p>}
        </div>
        {!rediger && (
          <button onClick={() => setRediger({ navn: '', type: 'person', orgnr: '', epost: '' })} data-testid="eb-eier-ny-btn"
            className="mt-3 flex items-center gap-1.5 rounded-full bg-[#faf9f7] px-3.5 py-2 text-[12px] font-bold text-[#57534e] hover:bg-[#f1efe9]" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)' }}>
            <Plus className="h-3.5 w-3.5" /> Ny aksjonær
          </button>
        )}
        {rediger && (
          <div className="mt-4 space-y-3 rounded-[16px] bg-[#f0ebfa]/50 p-4">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input value={rediger.navn} onChange={(e) => setRediger((r) => ({ ...r, navn: e.target.value }))} placeholder="Navn" className={inp} style={inpStil} data-testid="eb-eier-navn" />
              <select value={rediger.type} onChange={(e) => setRediger((r) => ({ ...r, type: e.target.value }))} className="rounded-[12px] bg-[#faf9f7] px-2.5 text-[12px] outline-none" style={inpStil}>
                <option value="person">Person</option>
                <option value="selskap">Selskap</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={rediger.orgnr} onChange={(e) => setRediger((r) => ({ ...r, orgnr: e.target.value }))} placeholder={rediger.type === 'selskap' ? 'Org.nr' : 'Fødselsdato (valgfri)'} className={inp} style={inpStil} />
              <input value={rediger.epost} onChange={(e) => setRediger((r) => ({ ...r, epost: e.target.value }))} placeholder="E-post (valgfri)" className={inp} style={inpStil} />
            </div>
            {feilM && <p className="text-[12px] font-medium text-[#c2413b]">{feilM}</p>}
            <div className="flex gap-2">
              <button onClick={lagre} disabled={lagrer} className="flex-1 rounded-[12px] bg-[#1c1917] py-2 text-[12.5px] font-bold text-white active:scale-[0.99]" data-testid="eb-eier-lagre">
                {lagrer ? 'Lagrer …' : 'Lagre'}
              </button>
              <button onClick={() => { setRediger(null); setFeilM(''); }} className="rounded-[12px] bg-white px-4 py-2 text-[12.5px] font-bold text-[#8a857d]" style={inpStil}>Avbryt</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal: innstillinger (pålydende + klasser) ──────────────────────────────

function InnstillingerModal({ apiKey, selskap, klasser, harTransaksjoner, onLukk, onEndret }) {
  const [palydende, setPalydende] = useState(String(selskap?.palydende ?? 1));
  const [liste, setListe] = useState(klasser);
  const [nyKlasse, setNyKlasse] = useState('');
  const [nyStemmer, setNyStemmer] = useState('1');
  const [feilM, setFeilM] = useState('');
  const [lagrer, setLagrer] = useState(false);

  const lagrePalydende = async () => {
    setLagrer(true); setFeilM('');
    try {
      const r = await fetch(`/api/admin/selskap/innstillinger?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selskap.id, palydende: Number(palydende) }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Kunne ikke lagre');
      onEndret();
    } catch (e) { setFeilM(e.message); }
    finally { setLagrer(false); }
  };

  const leggTilKlasse = async () => {
    if (!nyKlasse.trim()) return;
    const r = await fetch(`/api/admin/selskap/klasse?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selskapId: selskap.id, navn: nyKlasse.trim(), stemmerPerAksje: Number(nyStemmer) || 1 }),
    });
    const j = await r.json();
    if (j.ok) { setListe((l) => [...l, j.klasse]); setNyKlasse(''); setNyStemmer('1'); onEndret(); }
    else setFeilM(j.error || 'Kunne ikke opprette klassen');
  };

  const slettKlasse = async (k) => {
    const r = await fetch(`/api/admin/selskap/klasse?key=${encodeURIComponent(apiKey)}&id=${encodeURIComponent(k.id)}`, { method: 'DELETE' });
    const j = await r.json();
    if (j.ok) { setListe((l) => l.filter((x) => x.id !== k.id)); onEndret(); }
    else setFeilM(j.error || 'Klassen er i bruk');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[3px]" onClick={onLukk}>
      <div className="w-full max-w-md rounded-[22px] bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="eb-innstillinger-modal">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[#1c1917]" style={heading}>Innstillinger — {selskap?.navn}</h3>
          <button onClick={onLukk} className="rounded-full p-1.5 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-5">
          <div>
            <label className={lbl}>Pålydende per aksje (ved stiftelsen)</label>
            <div className="flex gap-2">
              <input type="number" step="0.01" value={palydende} onChange={(e) => setPalydende(e.target.value)} className={inp} style={inpStil} data-testid="eb-palydende" />
              <button onClick={lagrePalydende} disabled={lagrer} className="rounded-[12px] bg-[#1c1917] px-4 text-[12px] font-bold text-white active:scale-95">Lagre</button>
            </div>
            {harTransaksjoner && <p className="mt-1.5 text-[10.5px] text-[#a6a19a]">Splitt/spleis justerer pålydende automatisk i beregningen.</p>}
          </div>
          <div>
            <label className={lbl}>Aksjeklasser</label>
            <div className="space-y-1.5">
              {liste.map((k) => (
                <div key={k.id} className="flex items-center gap-2.5 rounded-[12px] bg-[#faf9f7] px-3.5 py-2.5" style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.04)' }}>
                  <p className="flex-1 text-[12.5px] font-bold text-[#1c1917]">{k.navn}</p>
                  <p className="text-[10.5px] text-[#a6a19a]">{k.stemmerPerAksje} {k.stemmerPerAksje === 1 ? 'stemme' : 'stemmer'}/aksje</p>
                  {liste.length > 1 && (
                    <button onClick={() => slettKlasse(k)} className="rounded-[8px] p-1 text-[#c2beb8] hover:text-[#c2413b]"><Trash2 className="h-3.5 w-3.5" /></button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input value={nyKlasse} onChange={(e) => setNyKlasse(e.target.value)} placeholder="F.eks. B-aksjer" className={inp} style={inpStil} data-testid="eb-klasse-navn" />
              <input type="number" min="0" value={nyStemmer} onChange={(e) => setNyStemmer(e.target.value)} title="Stemmer per aksje" className="w-20 rounded-[12px] bg-[#faf9f7] px-3 text-[12.5px] outline-none" style={inpStil} />
              <button onClick={leggTilKlasse} className="rounded-[12px] bg-[#1c1917] px-3.5 text-[12px] font-bold text-white active:scale-95" data-testid="eb-klasse-leggtil"><Plus className="h-3.5 w-3.5" /></button>
            </div>
          </div>
          {feilM && <p className="text-[12px] font-medium text-[#c2413b]">{feilM}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Utskriftsvisning (→ PDF via nettleseren) ─────────────────────────────────

function PrintVisning({ data, onLukk }) {
  const { selskap, capTable, transaksjoner = [], eiere = [], klasser = [] } = data || {};
  const eierAv = Object.fromEntries(eiere.map((e) => [e.id, e]));
  useEffect(() => {
    const paaEsc = (e) => { if (e.key === 'Escape') onLukk(); };
    window.addEventListener('keydown', paaEsc);
    return () => window.removeEventListener('keydown', paaEsc);
  }, [onLukk]);

  return (
    <div className="fixed inset-0 z-[80] overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:p-10" onClick={onLukk}>
      <style>{`@media print {
        body * { visibility: hidden !important; }
        .dh-eierbok-print, .dh-eierbok-print * { visibility: visible !important; }
        .dh-eierbok-print { position: absolute !important; inset: 0 !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
        .dh-print-skjul { display: none !important; }
      }`}</style>
      <div className="dh-eierbok-print mx-auto max-w-3xl rounded-[16px] bg-white p-10 shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="eb-print-visning">
        <div className="dh-print-skjul mb-6 flex items-center justify-between">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-full bg-[#1c1917] px-4 py-2 text-[12.5px] font-bold text-white active:scale-95">
            <Printer className="h-3.5 w-3.5" /> Skriv ut / lagre som PDF
          </button>
          <button onClick={onLukk} className="rounded-full p-2 text-[#a6a19a] hover:bg-black/[0.05]"><X className="h-4.5 w-4.5" /></button>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#8a857d]">Aksjeeierbok · ført etter aksjeloven § 4-5</p>
        <h1 className="mt-1 text-[26px] font-bold text-[#1c1917]" style={heading}>{selskap?.navn}</h1>
        <p className="mt-1 text-[12px] text-[#8a857d]">
          Org.nr {String(selskap?.orgnr || '').replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3')}
          {capTable?.perDato ? ` · per ${fmtDato(capTable.perDato)}` : ` · per ${fmtDato(new Date().toISOString())}`}
        </p>
        {capTable && (
          <>
            <div className="mt-5 grid grid-cols-3 gap-4 border-y border-black/10 py-4">
              <div><p className="text-[10px] uppercase tracking-wide text-[#8a857d]">Aksjekapital</p><p className="text-[16px] font-bold tabular-nums">{fmtKr(capTable.aksjekapital)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-[#8a857d]">Antall aksjer</p><p className="text-[16px] font-bold tabular-nums">{fmtTall(capTable.totalAksjer)}</p></div>
              <div><p className="text-[10px] uppercase tracking-wide text-[#8a857d]">Pålydende</p><p className="text-[16px] font-bold tabular-nums">{fmtKr(capTable.palydende)}</p></div>
            </div>
            <table className="mt-5 w-full text-[12px]">
              <thead>
                <tr className="border-b border-black/15 text-left">
                  {['Aksjonær', 'Antall', 'Aksjenr.', 'Eierandel', 'Stemmer'].map((h) => <th key={h} className="pb-2 pr-3 text-[10px] font-bold uppercase tracking-wide text-[#8a857d]">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {(capTable.rader || []).map((r) => (
                  <tr key={r.eierId} className="border-b border-black/[0.06]">
                    <td className="py-2.5 pr-3">
                      <p className="font-bold text-[#1c1917]">{r.navn}</p>
                      <p className="text-[10px] text-[#8a857d]">{r.type === 'selskap' ? `Selskap${r.orgnr ? ` · org.nr ${r.orgnr}` : ''}` : 'Privatperson'}</p>
                    </td>
                    <td className="py-2.5 pr-3 tabular-nums font-semibold">{fmtTall(r.antall)}</td>
                    <td className="py-2.5 pr-3 tabular-nums text-[11px]">{fmtIntervaller(r.intervaller)}</td>
                    <td className="py-2.5 pr-3 tabular-nums">{fmtPct(r.andel)}</td>
                    <td className="py-2.5 tabular-nums">{fmtPct(r.stemmeAndel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <p className="mt-8 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8a857d]">Transaksjonshistorikk</p>
        <div className="mt-2 space-y-2">
          {[...transaksjoner].sort((a, b) => String(a.dato).localeCompare(String(b.dato))).map((t) => (
            <div key={t.id} className="border-b border-black/[0.06] pb-2 text-[11.5px]">
              <p className="font-bold text-[#1c1917]">{TYPE_META[t.type]?.l} · {fmtDato(t.dato)}</p>
              <TransBeskrivelse t={t} eierAv={eierAv} klasser={klasser} />
            </div>
          ))}
        </div>
        <p className="mt-8 text-[10px] text-[#b3ada3]">Generert av DigiHome-portalen {fmtDato(new Date().toISOString())} — transaksjonsbasert eierbok med aksjenummer-intervaller.</p>
      </div>
    </div>
  );
}
