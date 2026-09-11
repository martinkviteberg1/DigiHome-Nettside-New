'use client';

// ─────────────────────────────────────────────────────────────────────────────
// STYRERAPPORT — en intern, «nydelig scrollbar nettside» klar for styremøtet.
// Samler LIVE nøkkeltall fra økonomimotoren (board-pack + kunder + selskap) og
// faktiske regnskapstall fra PowerOffice, sammen med REDIGERBART innhold
// (sammendrag, egne blokker, ask til styret). Presentasjonsmodus (fullskjerm) +
// «Skriv ut / PDF». Ingen tall fabrikkeres — mangler en kilde vises «utilgjengelig».
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Pencil, Check, Printer, Maximize2, X, Plus, Trash2,
  ChevronUp, ChevronDown, TrendingUp, TrendingDown, Wallet, Users, Building2,
  Receipt, Target, AlertTriangle, Sparkles, Type, Hash, List, Landmark,
  CalendarDays, Gauge, PiggyBank, Activity, ArrowRight,
} from 'lucide-react';

const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
const kr = (n) => (n == null || isNaN(n) ? '—' : `${nf0.format(Math.round(Number(n)))} kr`);
const krKort = (n) => {
  if (n == null || isNaN(n)) return '—';
  const v = Number(n); const a = Math.abs(v);
  if (a >= 1e6) return `${nf1.format(v / 1e6)} mill`;
  if (a >= 1e4) return `${nf0.format(Math.round(v / 1000))}k`;
  return nf0.format(Math.round(v));
};
const mndTxt = (n) => (n == null || isNaN(n) ? '—' : `${nf1.format(Number(n))} mnd`);
const pct = (n) => (n == null || isNaN(n) ? '—' : `${nf1.format(Number(n))} %`);
const antall = (n) => (n == null || isNaN(n) ? '—' : nf0.format(Math.round(Number(n))));

const PRINT_CSS = `
@media print {
  .dh-sr-noprint { display: none !important; }
  body * { visibility: hidden !important; }
  .dh-sr-print, .dh-sr-print * { visibility: visible !important; }
  .dh-sr-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; padding: 0 !important; }
  html, body { background: #ffffff !important; }
  .dh-sr-chapter { break-inside: avoid; }
}
`;

const CHANNEL_NO = {
  marketing: 'Markedsføring', organisk: 'Organisk', ukjent: 'Ukjent', direct: 'Direkte',
  finn: 'FINN', google: 'Google', meta: 'Meta', referral: 'Anbefaling', manual: 'Manuelt',
};

// ── Små byggeklosser ────────────────────────────────────────────────────────
function Panel({ className = '', children }) {
  return (
    <div className={`rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_24px_rgba(0,0,0,0.035)] ${className}`}>{children}</div>
  );
}

function Stat({ label, value, sub, tone }) {
  const c = tone === 'pos' ? '#16a34a' : tone === 'neg' ? '#dc2626' : tone === 'brand' ? '#a855f7' : '#9b9b97';
  return (
    <Panel className="p-5">
      <p className="text-[11px] uppercase tracking-[0.09em] text-[#9b9b97] font-semibold">{label}</p>
      <p className="mt-2 text-[25px] leading-none font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub != null && sub !== '' && <p className="mt-1.5 text-[12px] font-medium" style={{ color: c }}>{sub}</p>}
    </Panel>
  );
}

function Chapter({ n, kicker, title, desc, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6 flex-wrap dh-sr-chapter">
      <div className="flex items-start gap-4">
        <span className="text-[13px] font-bold text-[#cf97fc] mt-1 tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{n}</span>
        <div>
          {kicker && <p className="text-[11px] uppercase tracking-[0.12em] text-[#9b9b97] font-semibold">{kicker}</p>}
          <h2 className="text-[23px] sm:text-[27px] font-bold text-[#0a0a0a] tracking-[-0.02em] leading-[1.12]" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h2>
          {desc && <p className="mt-1.5 text-[13.5px] text-[#6b6b67] max-w-[600px] leading-relaxed">{desc}</p>}
        </div>
      </div>
      {right && <div className="dh-sr-noprint shrink-0">{right}</div>}
    </div>
  );
}

function TrendBars({ data = [], valueKey, labelKey = 'label', color = '#0a0a0a', height = 120, fmt }) {
  const vals = data.map((d) => Math.abs(Number(d[valueKey]) || 0));
  const max = Math.max(1, ...vals);
  return (
    <div className="w-full">
      <div className="flex items-end gap-[5px]" style={{ height }}>
        {data.map((d, i) => {
          const v = Number(d[valueKey]) || 0;
          const h = Math.max(3, (Math.abs(v) / max) * 100);
          const last = i === data.length - 1;
          return (
            <div key={i} className="group relative flex-1 flex flex-col items-center justify-end h-full" title={`${d[labelKey]}: ${fmt ? fmt(v) : nf0.format(v)}`}>
              <div className="w-full rounded-t-[3px] transition-all" style={{ height: `${h}%`, background: color, opacity: last ? 1 : 0.24 }} />
            </div>
          );
        })}
      </div>
      {data.length > 1 && (
        <div className="mt-1.5 flex justify-between text-[10.5px] text-[#a9a9a5] font-medium">
          <span>{data[0][labelKey]}</span>
          <span>{data[data.length - 1][labelKey]}</span>
        </div>
      )}
    </div>
  );
}

function KontoListe({ items = [], verdiKey = 'belop', tittel, tomTekst = 'Ingen poster' }) {
  const max = Math.max(1, ...items.map((i) => Math.abs(Number(i[verdiKey]) || 0)));
  return (
    <div>
      {tittel && <p className="text-[12px] font-semibold text-[#6b6b67] mb-3">{tittel}</p>}
      {items.length === 0 && <p className="text-[13px] text-[#a9a9a5]">{tomTekst}</p>}
      <div className="space-y-2.5">
        {items.slice(0, 6).map((it, i) => {
          const v = Number(it[verdiKey]) || 0;
          return (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className="text-[#3a3a38] truncate">{it.navn || it.category || `Konto ${it.kontonr || ''}`}</span>
                <span className="font-semibold text-[#0a0a0a] tabular-nums shrink-0">{kr(v)}</span>
              </div>
              <div className="mt-1 h-[5px] rounded-full bg-black/[0.05] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: '#cf97fc' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Konverter en lagret blokk → «raw» redigerbar streng
function blokkTilRaw(b) {
  if (!b) return '';
  if (b.type === 'liste') return (b.punkter || []).join('\n');
  if (b.type === 'tall') return (b.tall || []).map((t) => [t.etikett, t.verdi, t.notat].filter(Boolean).join(' | ')).join('\n');
  return b.tekst || '';
}
// «raw» redigerbar streng → strukturert blokk for lagring/visning
function rawTilBlokk(b) {
  const grunn = { id: b.id, type: b.type, tittel: (b.tittel || '').trim() };
  const raw = b.raw || '';
  if (b.type === 'liste') return { ...grunn, punkter: raw.split('\n').map((s) => s.trim()).filter(Boolean) };
  if (b.type === 'tall') {
    return {
      ...grunn,
      tall: raw.split('\n').map((line) => {
        const [etikett, verdi, notat] = line.split('|').map((s) => (s || '').trim());
        return { etikett: etikett || '', verdi: verdi || '', notat: notat || '' };
      }).filter((t) => t.etikett || t.verdi),
    };
  }
  return { ...grunn, tekst: raw };
}

const nyBlokkRaw = (type) => ({ id: `b_${Math.random().toString(36).slice(2, 10)}`, type, tittel: '', raw: '' });

export default function Styrerapport({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feil, setFeil] = useState(null);

  const [rediger, setRediger] = useState(false);
  const [presentasjon, setPresentasjon] = useState(false);
  const [lagrer, setLagrer] = useState(false);
  const [lagretAt, setLagretAt] = useState(null);

  // Redigerbart innhold
  const [tittel, setTittel] = useState('Styrerapport');
  const [motedato, setMotedato] = useState('');
  const [periodeLabel, setPeriodeLabel] = useState('');
  const [sammendrag, setSammendrag] = useState('');
  const [askRaw, setAskRaw] = useState('');
  const [blokker, setBlokker] = useState([]);

  // Regnskap (PowerOffice, lastes på forespørsel)
  const [regnAar, setRegnAar] = useState(new Date().getFullYear());
  const [regn, setRegn] = useState(null);
  const [regnLaster, setRegnLaster] = useState(false);
  const [regnFeil, setRegnFeil] = useState(null);

  const q = `key=${encodeURIComponent(apiKey || '')}`;

  const settRedigerbart = useCallback((r) => {
    setTittel(r?.tittel || 'Styrerapport');
    setMotedato(r?.motedato || '');
    setPeriodeLabel(r?.periodeLabel || '');
    setSammendrag(r?.sammendrag || '');
    setAskRaw((r?.ask || []).join('\n'));
    setBlokker((r?.blokker || []).map((b) => ({ id: b.id, type: b.type, tittel: b.tittel || '', raw: blokkTilRaw(b) })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setFeil(null);
    try {
      const r = await fetch(`/api/admin/styrerapport?${q}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setFeil(j.error || 'Kunne ikke laste'); setData(null); }
      else { setData(j); settRedigerbart(j.rapport); }
    } catch (e) { setFeil('Kunne ikke laste styrerapport'); }
    finally { setLoading(false); }
  }, [q, settRedigerbart]);

  useEffect(() => { if (apiKey) load(); }, [apiKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const lagre = useCallback(async () => {
    setLagrer(true);
    try {
      const body = {
        tittel, motedato, periodeLabel, sammendrag,
        ask: askRaw.split('\n').map((s) => s.trim()).filter(Boolean),
        blokker: blokker.map(rawTilBlokk),
      };
      const r = await fetch(`/api/admin/styrerapport?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.ok) {
        setLagretAt(new Date());
        setData((d) => (d ? { ...d, rapport: j.rapport } : d));
      }
    } finally { setLagrer(false); }
  }, [q, tittel, motedato, periodeLabel, sammendrag, askRaw, blokker]);

  const ferdigRediger = useCallback(async () => { await lagre(); setRediger(false); }, [lagre]);

  const lastRegnskap = useCallback(async (aar) => {
    setRegnLaster(true); setRegnFeil(null);
    try {
      const r = await fetch(`/api/admin/regnskap/konsern?${q}&ar=${aar}`, { cache: 'no-store' });
      const j = await r.json();
      if (!j.ok) { setRegnFeil(j.feil || 'Regnskap utilgjengelig'); setRegn(null); }
      else setRegn(j);
    } catch (e) { setRegnFeil('Regnskap utilgjengelig'); setRegn(null); }
    finally { setRegnLaster(false); }
  }, [q]);

  // Blokk-operasjoner
  const oppdaterBlokk = (id, patch) => setBlokker((bs) => bs.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const flyttBlokk = (id, retning) => setBlokker((bs) => {
    const i = bs.findIndex((b) => b.id === id); if (i < 0) return bs;
    const j = i + retning; if (j < 0 || j >= bs.length) return bs;
    const kopi = [...bs]; const [x] = kopi.splice(i, 1); kopi.splice(j, 0, x); return kopi;
  });
  const slettBlokk = (id) => setBlokker((bs) => bs.filter((b) => b.id !== id));
  const leggTilBlokk = (type) => setBlokker((bs) => [...bs, nyBlokkRaw(type)]);

  // ── Avledede tall ─────────────────────────────────────────────────────────
  const bp = data?.boardPack || null;
  const inv = bp?.investor || null;
  const res = bp?.resultat?.monthly || null;
  const kostnadsdeling = bp?.resultat?.costBreakdown || [];
  const liq = bp?.likviditet || null;
  const fc = bp?.forecast || null;
  const mrrHist = bp?.mrrHistory || [];
  const cust = data?.customers || null;
  const cs = cust?.summary || null;
  const sel = data?.selskap || null;
  const selNaa = sel?.naa || null;
  const selKons = selNaa?.konsern || null;

  const firstNum = (...xs) => { for (const x of xs) { const n = Number(x); if (x != null && Number.isFinite(n)) return n; } return null; };

  // Live leieforhold (computeSelskap) er ÉN SANNHET for portefølje/honorar i denne
  // kodebasen (samme kilde som Leieforhold, budsjett og decket) → foretrekkes for
  // topplinjen. Faller tilbake til kunde-/kontraktsavledning når leieforhold mangler.
  const mrr = firstNum(selKons?.inntekt, cs?.totalMrr, inv?.mrrNow);
  const arr = mrr != null ? mrr * 12 : firstNum(cs?.arr, inv?.arrNow);
  const enheter = firstNum(selKons?.enheter, cs?.totalProperties, inv?.activeUnits);
  const aktiveKunder = firstNum(cs?.activeCustomers);
  const betalende = firstNum(cs?.payingCustomers);
  const arpa = firstNum(cs?.arpa, inv?.arpa, (mrr != null && aktiveKunder ? Math.round(mrr / aktiveKunder) : null));

  // Økonomi-topplinje: foretrekk selskap (live, internt konsistent) → ellers modell (board-pack).
  const okono = selKons ? {
    inntekt: selKons.inntekt, kost: selKons.kost, resultat: selKons.resultat,
    margin: selKons.inntekt > 0 ? Math.round((selKons.resultat / selKons.inntekt) * 1000) / 10 : null,
    costBreakdown: selKons.costBreakdown || [],
    kontant: selKons.kontant, runway: selKons.runwayMnd,
    burn: (selKons.resultat != null && selKons.resultat < 0) ? -selKons.resultat : 0,
    kilde: 'leieforhold',
  } : (res ? {
    inntekt: res.incomeForventet, kost: res.opexTotal, resultat: res.resultatForventet,
    margin: res.marginForventet, costBreakdown: kostnadsdeling,
    kontant: liq?.opening, runway: liq?.summary?.forventet?.runwayMonths,
    burn: liq?.summary?.forventet?.burnRate, kilde: 'modell',
  } : null);
  const runway = firstNum(selKons?.runwayMnd, liq?.summary?.forventet?.runwayMonths);
  const runwaySet = (selKons?.kontant != null) || !!liq?.openingSet;
  const burn = okono?.burn ?? null;
  const kontanter = firstNum(selKons?.kontant, liq?.opening);

  // MRR-trend: 13-mnd tidslinje fra selskap (live) → ellers mrrHistory (board-pack).
  const mrrTrend = (Array.isArray(sel?.tidslinje) && sel.tidslinje.length > 1)
    ? sel.tidslinje.map((t) => ({ label: String(t.ym || '').slice(2), v: (t.konsern && t.konsern.inntekt) || 0 }))
    : mrrHist.map((m) => ({ label: m.label, v: m.mrrForventet }));

  const nrr = inv?.retention?.nrr ?? null;
  const grr = inv?.retention?.grr ?? null;
  const cac = inv?.payback?.cac ?? null;
  const ltv = inv?.payback?.ltv ?? null;
  const ltvCac = inv?.payback?.ltvCac ?? null;
  const payback = inv?.payback?.paybackMonths ?? null;

  const kanalListe = useMemo(() => {
    const bc = cust?.byChannel || {};
    return Object.entries(bc).map(([k, v]) => ({ navn: CHANNEL_NO[k] || k, count: v.count, mrr: v.mrr }))
      .sort((a, b) => (b.mrr - a.mrr) || (b.count - a.count));
  }, [cust]);

  const toppKunder = useMemo(() => (cust?.customers || []).filter((c) => c.status !== 'churnet').slice(0, 8), [cust]);

  const iAar = new Date().getFullYear();
  const aarValg = [iAar, iAar - 1, iAar - 2];

  // ── Toolbar (skjules i print) ───────────────────────────────────────────────
  const btnGhost = 'inline-flex items-center gap-2 h-9 px-3.5 rounded-full border border-black/10 bg-white text-[13px] font-semibold text-[#333] hover:bg-black/[0.03] transition-colors disabled:opacity-40';
  const btnDark = 'inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold hover:bg-[#222] transition-colors disabled:opacity-40';

  const toolbar = (
    <div className="dh-sr-noprint sticky top-0 z-40 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 mb-2 bg-[#f7f6f4]/85 backdrop-blur-md border-b border-black/[0.05] flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2 mr-auto">
        <span className="text-[13px] font-semibold text-[#0a0a0a]">Styrerapport</span>
        {lagretAt && <span className="text-[11.5px] text-[#16a34a] font-medium inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Lagret {lagretAt.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>}
      </div>
      <button className={btnGhost} onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Oppdater</button>
      {rediger ? (
        <button className={btnDark} onClick={ferdigRediger} disabled={lagrer}>{lagrer ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Ferdig</button>
      ) : (
        <button className={btnGhost} onClick={() => setRediger(true)}><Pencil className="h-4 w-4" /> Rediger</button>
      )}
      <button className={btnGhost} onClick={() => setPresentasjon((p) => !p)}>{presentasjon ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} {presentasjon ? 'Lukk' : 'Presentasjon'}</button>
      <button className={btnGhost} onClick={() => window.print()}><Printer className="h-4 w-4" /> Skriv ut / PDF</button>
    </div>
  );

  // Redigerbart tekstfelt (kun i redigeringsmodus)
  const felt = 'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-[14px] text-[#0a0a0a] outline-none focus:border-[#cf97fc] focus:ring-2 focus:ring-[#cf97fc]/20 transition';

  // ── Selve rapporten ─────────────────────────────────────────────────────────
  const rapportInnhold = (
    <div className="dh-sr-print mx-auto max-w-[1120px] px-1 sm:px-4 pb-24">

      {/* 01 · COVER */}
      <section className="pt-6 pb-14">
        <div className="relative overflow-hidden rounded-[28px] border border-black/[0.06] bg-gradient-to-br from-[#faf5ff] via-white to-[#f4f7ff] p-8 sm:p-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-[#cf97fc]/15 blur-3xl" aria-hidden />
          <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-[#a5c8ff]/20 blur-3xl" aria-hidden />
          <div className="relative">
            <div className="flex items-center gap-2.5">
              <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-6 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              <span className="text-[12px] uppercase tracking-[0.14em] text-[#9b7fb8] font-bold">Konfidensiell · intern</span>
            </div>
            {rediger ? (
              <input className={`${felt} mt-5 text-[28px] font-bold`} value={tittel} onChange={(e) => setTittel(e.target.value)} placeholder="Tittel" style={{ fontFamily: 'var(--font-heading)' }} />
            ) : (
              <h1 className="mt-5 text-[38px] sm:text-[52px] leading-[1.02] font-bold text-[#0a0a0a] tracking-[-0.03em]" style={{ fontFamily: 'var(--font-heading)' }}>{tittel}</h1>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[14px] text-[#5a5a56]">
              {rediger ? (
                <>
                  <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#9b7fb8]" /><input className={`${felt} h-9 w-48`} value={motedato} onChange={(e) => setMotedato(e.target.value)} placeholder="Møtedato (f.eks. 26. juni 2025)" /></span>
                  <span className="inline-flex items-center gap-2"><Activity className="h-4 w-4 text-[#9b7fb8]" /><input className={`${felt} h-9 w-44`} value={periodeLabel} onChange={(e) => setPeriodeLabel(e.target.value)} placeholder="Periode (f.eks. Q2 2025)" /></span>
                </>
              ) : (
                <>
                  {motedato && <span className="inline-flex items-center gap-2 font-medium"><CalendarDays className="h-4 w-4 text-[#9b7fb8]" /> {motedato}</span>}
                  {periodeLabel && <span className="inline-flex items-center gap-2 font-medium"><Activity className="h-4 w-4 text-[#9b7fb8]" /> {periodeLabel}</span>}
                  <span className="inline-flex items-center gap-2 text-[#a9a9a5]">Generert {data?.generatedAt ? new Date(data.generatedAt).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                </>
              )}
            </div>

            {/* Nøkkeltall stort */}
            <div className="mt-9 grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { l: 'MRR', v: krKort(mrr), s: mrr != null ? 'kr / mnd' : 'utilgjengelig', t: 'brand' },
                { l: 'ARR', v: krKort(arr), s: arr != null ? 'kr / år' : 'utilgjengelig' },
                { l: 'Enheter u/forvaltning', v: antall(enheter), s: aktiveKunder != null ? `${antall(aktiveKunder)} aktive kunder` : '' },
                { l: 'Runway', v: runwaySet ? mndTxt(runway) : '—', s: runwaySet ? 'ved dagens burn' : 'sett inngående kontanter', t: runway != null && runway < 6 ? 'neg' : 'pos' },
              ].map((x, i) => (
                <div key={i} className="rounded-2xl bg-white/80 backdrop-blur border border-white/60 shadow-[0_2px_18px_rgba(0,0,0,0.05)] p-4">
                  <p className="text-[11px] uppercase tracking-[0.09em] text-[#9b9b97] font-semibold">{x.l}</p>
                  <p className="mt-1.5 text-[26px] leading-none font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>{x.v}</p>
                  {x.s && <p className="mt-1.5 text-[11.5px] font-medium" style={{ color: x.t === 'brand' ? '#a855f7' : x.t === 'neg' ? '#dc2626' : x.t === 'pos' ? '#16a34a' : '#9b9b97' }}>{x.s}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 02 · SAMMENDRAG */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter n="01" kicker="Til styret" title="Sammendrag" desc="Situasjonen kort — høydepunkter, det som bekymrer, og hva vi ber styret ta stilling til." />
        {rediger ? (
          <textarea className={`${felt} min-h-[180px] leading-relaxed`} value={sammendrag} onChange={(e) => setSammendrag(e.target.value)} placeholder="Skriv sammendraget her. Del gjerne i avsnitt med blank linje…" />
        ) : sammendrag ? (
          <Panel className="p-7">
            <div className="text-[16px] leading-[1.75] text-[#2a2a28] whitespace-pre-wrap max-w-[760px]">{sammendrag}</div>
          </Panel>
        ) : (
          <Panel className="p-7 border-dashed">
            <p className="text-[14px] text-[#a9a9a5]">Ingen sammendrag ennå. Trykk <span className="font-semibold text-[#6b6b67]">Rediger</span> for å skrive.</p>
          </Panel>
        )}
      </section>

      {/* 03 · NØKKELTALL */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter n="02" kicker="Traksjon" title="Nøkkeltall" desc="Levende tall fra plattformen og økonomimotoren — recurring inntekt, kunder, retensjon og enhetsøkonomi." />
        {!bp && !cs && !selKons ? (
          <Panel className="p-7 border-dashed"><p className="text-[14px] text-[#a9a9a5]">Nøkkeltall er midlertidig utilgjengelig.</p></Panel>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="MRR" value={kr(mrr)} sub="Månedlig recurring" tone="brand" />
              <Stat label="ARR" value={kr(arr)} sub="Årlig recurring" />
              <Stat label="ARPA" value={kr(arpa)} sub="Snitt per kunde/mnd" />
              <Stat label="Enheter u/forvaltning" value={antall(enheter)} sub={betalende != null ? `${antall(betalende)} betalende kunder` : ''} />
              <Stat label="NRR" value={pct(nrr)} sub="Net revenue retention" tone={nrr != null && nrr >= 100 ? 'pos' : 'neg'} />
              <Stat label="GRR" value={pct(grr)} sub="Gross retention" />
              <Stat label="CAC" value={kr(cac)} sub="Kost per ny kunde" />
              <Stat label="LTV : CAC" value={ltvCac != null ? `${nf1.format(ltvCac)}×` : '—'} sub={payback != null ? `Payback ${mndTxt(payback)}` : (ltv != null ? `LTV ${krKort(ltv)}` : '')} tone={ltvCac != null && ltvCac >= 3 ? 'pos' : undefined} />
            </div>
            {mrrTrend.length > 1 && (
              <Panel className="p-6 mt-3">
                <div className="flex items-baseline justify-between mb-4">
                  <p className="text-[13px] font-semibold text-[#0a0a0a]">Honorarinntekt per måned ({mrrTrend.length} mnd)</p>
                  <p className="text-[12px] text-[#9b9b97]">Nå: <span className="font-semibold text-[#0a0a0a]">{kr(mrrTrend[mrrTrend.length - 1]?.v)}</span></p>
                </div>
                <TrendBars data={mrrTrend} valueKey="v" color="#cf97fc" fmt={(v) => kr(v)} />
              </Panel>
            )}
          </>
        )}
      </section>

      {/* 04 · ØKONOMI */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter n="03" kicker={okono?.kilde === 'leieforhold' ? 'Live drift' : 'Modelltall'} title="Resultat & likviditet" desc={okono?.kilde === 'leieforhold' ? 'Sikret honorar fra porteføljen (leieforhold) mot faste kostnader — samme kilde som Leieforhold og budsjettet. Bokførte regnskapstall følger i kapittel 04.' : 'Driftsmodellen basert på kontrakter og faste kostnader. Bokførte regnskapstall følger i kapittel 04.'} />
        {!okono ? (
          <Panel className="p-7 border-dashed"><p className="text-[14px] text-[#a9a9a5]">Resultattall er midlertidig utilgjengelig.</p></Panel>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Honorar / inntekt (mnd)" value={kr(okono.inntekt)} sub={okono.kilde === 'leieforhold' ? 'Sikret fra porteføljen' : 'Forventet'} tone="brand" />
              <Stat label="Driftskostnad (mnd)" value={kr(okono.kost)} />
              <Stat label="Resultat (mnd)" value={kr(okono.resultat)} sub={okono.margin != null ? `Margin ${pct(okono.margin)}` : ''} tone={(okono.resultat || 0) >= 0 ? 'pos' : 'neg'} />
              <Stat label="Break-even" value={res && res.breakEvenContracts != null ? `${antall(res.breakEvenContracts)} avtaler` : '—'} sub={res && res.activeContracts != null ? `Nå: ${antall(res.activeContracts)}` : ''} />
            </div>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <Panel className="p-6">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Kostnader per kategori (mnd)</p>
                <KontoListe items={okono.costBreakdown} verdiKey="amount" tomTekst="Ingen kostnader registrert" />
              </Panel>
              <Panel className="p-6">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Likviditet</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-[11px] uppercase tracking-[0.08em] text-[#9b9b97] font-semibold">Inngående kontanter</p><p className="mt-1.5 text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{runwaySet ? kr(kontanter) : '—'}</p></div>
                  <div><p className="text-[11px] uppercase tracking-[0.08em] text-[#9b9b97] font-semibold">Burn (mnd)</p><p className="mt-1.5 text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{burn ? kr(burn) : (burn === 0 ? 'Positiv drift' : '—')}</p></div>
                  <div><p className="text-[11px] uppercase tracking-[0.08em] text-[#9b9b97] font-semibold">Runway</p><p className="mt-1.5 text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)', color: runway != null && runway < 6 ? '#dc2626' : '#0a0a0a' }}>{runwaySet ? mndTxt(runway) : '—'}</p></div>
                  <div><p className="text-[11px] uppercase tracking-[0.08em] text-[#9b9b97] font-semibold">{res ? 'Bidragsmargin' : 'Enheter'}</p><p className="mt-1.5 text-[20px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{res ? kr(res.contributionMargin) : antall(enheter)}</p></div>
                </div>
                {!runwaySet && <p className="mt-4 text-[12px] text-[#b76e00] bg-[#fff7e8] rounded-lg px-3 py-2">Sett inngående kontantbeholdning i Økonomi-modulen for å beregne runway.</p>}
              </Panel>
            </div>
            {sel?.naa && (
              <Panel className="p-6 mt-3 overflow-x-auto">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Per selskap (inneværende måned)</p>
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[#9b9b97]">
                      <th className="pb-2 font-semibold">Selskap</th>
                      <th className="pb-2 font-semibold text-right">Inntekt</th>
                      <th className="pb-2 font-semibold text-right">Kostnad</th>
                      <th className="pb-2 font-semibold text-right">Resultat</th>
                      <th className="pb-2 font-semibold text-right">Kontanter</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[['DigiHome AS', sel.naa.digihome], ['DigiHome Tech AS', sel.naa.tech], ['Sammenstilt', sel.naa.konsern]].map(([navn, s], i) => s && (
                      <tr key={i} className={`border-t border-black/[0.05] ${i === 2 ? 'font-semibold' : ''}`}>
                        <td className="py-2.5 text-[#2a2a28]">{navn}</td>
                        <td className="py-2.5 text-right tabular-nums">{kr(s.inntekt)}</td>
                        <td className="py-2.5 text-right tabular-nums">{kr(s.kost)}</td>
                        <td className="py-2.5 text-right tabular-nums" style={{ color: (s.resultat || 0) >= 0 ? '#16a34a' : '#dc2626' }}>{kr(s.resultat)}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#6b6b67]">{s.kontant != null ? kr(s.kontant) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
          </>
        )}
      </section>

      {/* 05 · REGNSKAP (PowerOffice) */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter
          n="04"
          kicker="Faktiske tall"
          title="Regnskap · PowerOffice"
          desc="Bokførte tall hentet direkte fra PowerOffice Go, sammenstilt for alle selskaper. Sammenstilt = sum av selskapene (ikke en formell konsolidering med elimineringer)."
          right={(
            <div className="flex items-center gap-2">
              <select className="h-9 rounded-full border border-black/10 bg-white px-3 text-[13px] font-semibold" value={regnAar} onChange={(e) => setRegnAar(Number(e.target.value))}>
                {aarValg.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              <button className={btnDark} onClick={() => lastRegnskap(regnAar)} disabled={regnLaster}>{regnLaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Hent</button>
            </div>
          )}
        />
        {regnFeil && <Panel className="p-6 border-dashed"><p className="text-[14px] text-[#b3261e]">{regnFeil}</p><p className="text-[12.5px] text-[#a9a9a5] mt-1">Sjekk at PowerOffice er koblet til under Økonomi → Regnskap.</p></Panel>}
        {!regn && !regnFeil && !regnLaster && (
          <Panel className="p-7 border-dashed"><p className="text-[14px] text-[#6b6b67]">Trykk <span className="font-semibold">Hent</span> for å laste de faktiske regnskapstallene for {regnAar}. (Kan ta noen sekunder.)</p></Panel>
        )}
        {regn && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label={`Inntekt ${regn.ar}`} value={kr(regn.resultat?.sum?.inntekt)} />
              <Stat label={`Kostnad ${regn.ar}`} value={kr(regn.resultat?.sum?.kostnad)} />
              <Stat label={`Resultat ${regn.ar}`} value={kr(regn.resultat?.sum?.resultat)} tone={(regn.resultat?.sum?.resultat || 0) >= 0 ? 'pos' : 'neg'} />
              <Stat label="Egenkapital" value={kr(regn.balanse?.grupper?.egenkapital?.sum)} sub={regn.balanse ? `Eiendeler ${krKort(regn.balanse.grupper.eiendeler.sum)}` : ''} />
            </div>
            {regn.resultat?.maaneder && (
              <Panel className="p-6 mt-3">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Resultat per måned ({regn.ar})</p>
                <TrendBars data={regn.resultat.maaneder.map((m) => ({ label: m.navn, resultat: m.resultat }))} valueKey="resultat" labelKey="label" color="#0a0a0a" fmt={(v) => kr(v)} />
              </Panel>
            )}
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              <Panel className="p-6"><KontoListe tittel="Største inntektskontoer" items={regn.resultat?.inntektKontoer || []} verdiKey="belop" /></Panel>
              <Panel className="p-6"><KontoListe tittel="Største kostnadskontoer" items={regn.resultat?.kostnadKontoer || []} verdiKey="belop" /></Panel>
            </div>
            {regn.selskaper?.length > 1 && (
              <Panel className="p-6 mt-3 overflow-x-auto">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Per selskap</p>
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[#9b9b97]"><th className="pb-2 font-semibold">Selskap</th><th className="pb-2 font-semibold text-right">Inntekt</th><th className="pb-2 font-semibold text-right">Kostnad</th><th className="pb-2 font-semibold text-right">Resultat</th></tr></thead>
                  <tbody>
                    {regn.selskaper.map((s) => (
                      <tr key={s.id} className="border-t border-black/[0.05]">
                        <td className="py-2.5 text-[#2a2a28]">{s.navn}{!s.resultatOk && <span className="ml-2 text-[11px] text-[#b76e00]">ikke hentet</span>}</td>
                        <td className="py-2.5 text-right tabular-nums">{kr(s.inntekt)}</td>
                        <td className="py-2.5 text-right tabular-nums">{kr(s.kostnad)}</td>
                        <td className="py-2.5 text-right tabular-nums" style={{ color: s.resultat >= 0 ? '#16a34a' : '#dc2626' }}>{kr(s.resultat)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Panel>
            )}
          </>
        )}
      </section>

      {/* 06 · KUNDER */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter n="05" kicker="Portefølje" title="Kunder" desc="Utleiere under forvaltning (betalende kunder). Leietakere er ikke kunder og inngår ikke her." />
        {!cs ? (
          <Panel className="p-7 border-dashed"><p className="text-[14px] text-[#a9a9a5]">Kundedata er midlertidig utilgjengelig.</p></Panel>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Totalt kunder" value={antall(cs.totalCustomers)} sub={cs.churnedCustomers != null ? `${antall(cs.churnedCustomers)} churnet` : ''} />
              <Stat label="Aktive kunder" value={antall(cs.activeCustomers)} tone="pos" />
              <Stat label="Enheter" value={antall(enheter ?? cs.totalProperties)} sub={selKons ? 'under forvaltning (live)' : ''} />
              <Stat label="Churn-rate" value={cs.churnRatePct != null ? pct(cs.churnRatePct) : '—'} sub={cs.lifetimeFees ? `Livstidshonorar ${krKort(cs.lifetimeFees)}` : ''} tone={cs.churnRatePct != null && cs.churnRatePct > 10 ? 'neg' : undefined} />
            </div>
            <div className="grid lg:grid-cols-3 gap-3 mt-3">
              <Panel className="p-6 lg:col-span-2 overflow-x-auto">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Største kunder</p>
                <table className="w-full text-[13px]">
                  <thead><tr className="text-left text-[11px] uppercase tracking-[0.06em] text-[#9b9b97]"><th className="pb-2 font-semibold">Kunde</th><th className="pb-2 font-semibold text-right">Enheter</th><th className="pb-2 font-semibold text-right">MRR</th><th className="pb-2 font-semibold">Status</th></tr></thead>
                  <tbody>
                    {toppKunder.map((c, i) => (
                      <tr key={c.key || i} className="border-t border-black/[0.05]">
                        <td className="py-2.5 text-[#2a2a28] font-medium truncate max-w-[220px]">{c.name || 'Ukjent eier'}</td>
                        <td className="py-2.5 text-right tabular-nums text-[#6b6b67]">{antall(c.unitsCount ?? c.properties)}</td>
                        <td className="py-2.5 text-right tabular-nums font-semibold">{kr(c.mrr)}</td>
                        <td className="py-2.5"><span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.status === 'aktiv' ? 'bg-[#e7f6ee] text-[#1a7f45]' : c.status === 'pauset' || c.status === 'venter' ? 'bg-[#fff4e0] text-[#b76e00]' : 'bg-[#f2f2f4] text-[#888]'}`}>{c.status}</span></td>
                      </tr>
                    ))}
                    {toppKunder.length === 0 && <tr><td colSpan={4} className="py-4 text-[13px] text-[#a9a9a5]">Ingen kunder ennå.</td></tr>}
                  </tbody>
                </table>
              </Panel>
              <Panel className="p-6">
                <p className="text-[13px] font-semibold text-[#0a0a0a] mb-4">Kunder per kanal</p>
                {kanalListe.length === 0 ? <p className="text-[13px] text-[#a9a9a5]">Ingen kanaldata.</p> : (
                  <div className="space-y-3">
                    {kanalListe.map((k, i) => (
                      <div key={i} className="flex items-center justify-between text-[13px]">
                        <span className="text-[#3a3a38]">{k.navn}</span>
                        <span className="text-[#6b6b67]"><span className="font-semibold text-[#0a0a0a]">{antall(k.count)}</span> · {krKort(k.mrr)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </section>

      {/* 07 · PROGNOSE */}
      {fc?.scenarios && (
        <section className="py-8 border-t border-black/[0.06]">
          <Chapter n="06" kicker="Fremover" title="Prognose" desc={`Driverbasert prognose ${fc.months} måneder frem — konservativt, base og aggressivt scenario.`} />
          <div className="grid md:grid-cols-3 gap-3">
            {[['Konservativt', fc.scenarios.konservativ, '#9b9b97'], ['Base', fc.scenarios.base, '#cf97fc'], ['Aggressivt', fc.scenarios.aggressiv, '#16a34a']].map(([navn, sc, farge], i) => sc?.summary && (
              <Panel key={i} className="p-6" >
                <div className="flex items-center gap-2 mb-4"><span className="h-2.5 w-2.5 rounded-full" style={{ background: farge }} /><p className="text-[13px] font-semibold text-[#0a0a0a]">{navn}</p></div>
                <div className="space-y-3">
                  <div className="flex justify-between text-[13px]"><span className="text-[#6b6b67]">MRR (slutt)</span><span className="font-bold text-[#0a0a0a]">{kr(sc.summary.endMrr)}</span></div>
                  <div className="flex justify-between text-[13px]"><span className="text-[#6b6b67]">ARR (slutt)</span><span className="font-semibold text-[#0a0a0a]">{kr(sc.summary.endArr)}</span></div>
                  <div className="flex justify-between text-[13px]"><span className="text-[#6b6b67]">Avtaler (slutt)</span><span className="font-semibold text-[#0a0a0a]">{antall(sc.summary.endActiveContracts)}</span></div>
                  <div className="flex justify-between text-[13px]"><span className="text-[#6b6b67]">Break-even</span><span className="font-semibold text-[#0a0a0a]">{sc.summary.breakevenMonth != null ? `mnd ${sc.summary.breakevenMonth}` : '—'}</span></div>
                </div>
              </Panel>
            ))}
          </div>
        </section>
      )}

      {/* 08 · EGNE BLOKKER */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter
          n="07"
          kicker="Fritt innhold"
          title="Egne seksjoner"
          desc="Legg til hva som helst — tekst, egne tall/KPI eller punktlister. Alt lagres og gjenbrukes til neste møte."
          right={rediger ? (
            <div className="flex items-center gap-2">
              <button className={btnGhost} onClick={() => leggTilBlokk('tekst')}><Type className="h-4 w-4" /> Tekst</button>
              <button className={btnGhost} onClick={() => leggTilBlokk('tall')}><Hash className="h-4 w-4" /> Tall</button>
              <button className={btnGhost} onClick={() => leggTilBlokk('liste')}><List className="h-4 w-4" /> Liste</button>
            </div>
          ) : null}
        />
        {blokker.length === 0 && !rediger && (
          <Panel className="p-7 border-dashed"><p className="text-[14px] text-[#a9a9a5]">Ingen egne seksjoner ennå. Trykk <span className="font-semibold text-[#6b6b67]">Rediger</span> for å legge til.</p></Panel>
        )}
        <div className="space-y-3">
          {blokker.map((b, idx) => {
            if (rediger) {
              return (
                <Panel key={b.id} className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/[0.05] text-[11px] font-semibold text-[#6b6b67]">
                      {b.type === 'tall' ? <Hash className="h-3 w-3" /> : b.type === 'liste' ? <List className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                      {b.type === 'tall' ? 'Tall / KPI' : b.type === 'liste' ? 'Liste' : 'Tekst'}
                    </span>
                    <div className="ml-auto flex items-center gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-black/[0.05] disabled:opacity-30" onClick={() => flyttBlokk(b.id, -1)} disabled={idx === 0}><ChevronUp className="h-4 w-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-black/[0.05] disabled:opacity-30" onClick={() => flyttBlokk(b.id, 1)} disabled={idx === blokker.length - 1}><ChevronDown className="h-4 w-4" /></button>
                      <button className="p-1.5 rounded-lg hover:bg-[#fdeaea] text-[#b3261e]" onClick={() => slettBlokk(b.id)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  <input className={`${felt} mb-2.5 font-semibold`} value={b.tittel} onChange={(e) => oppdaterBlokk(b.id, { tittel: e.target.value })} placeholder="Overskrift" />
                  <textarea
                    className={`${felt} min-h-[110px] leading-relaxed`}
                    value={b.raw}
                    onChange={(e) => oppdaterBlokk(b.id, { raw: e.target.value })}
                    placeholder={b.type === 'tall' ? 'Én per linje: Etikett | Verdi | Notat\nEks: Aktive leietakere | 42 | +5 siden sist' : b.type === 'liste' ? 'Ett punkt per linje…' : 'Skriv teksten her…'}
                  />
                </Panel>
              );
            }
            const bs = rawTilBlokk(b);
            return (
              <Panel key={b.id} className="p-7">
                {bs.tittel && <h3 className="text-[19px] font-bold text-[#0a0a0a] tracking-[-0.01em] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{bs.tittel}</h3>}
                {bs.type === 'tekst' && <div className="text-[15px] leading-[1.75] text-[#2a2a28] whitespace-pre-wrap max-w-[760px]">{bs.tekst}</div>}
                {bs.type === 'liste' && (
                  <ul className="space-y-2.5">
                    {bs.punkter.map((p, i) => (
                      <li key={i} className="flex items-start gap-3 text-[15px] text-[#2a2a28] leading-relaxed">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#cf97fc] shrink-0" />{p}
                      </li>
                    ))}
                  </ul>
                )}
                {bs.type === 'tall' && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {bs.tall.map((t, i) => (
                      <div key={i} className="rounded-xl bg-black/[0.02] border border-black/[0.05] p-4">
                        <p className="text-[11px] uppercase tracking-[0.08em] text-[#9b9b97] font-semibold">{t.etikett}</p>
                        <p className="mt-1.5 text-[23px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{t.verdi}</p>
                        {t.notat && <p className="mt-1 text-[12px] text-[#6b6b67]">{t.notat}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            );
          })}
        </div>
      </section>

      {/* 09 · ASK TIL STYRET */}
      <section className="py-8 border-t border-black/[0.06]">
        <Chapter n="08" kicker="Beslutning" title="Ask til styret" desc="Konkrete punkter styret bes ta stilling til eller vedta." />
        {rediger ? (
          <Panel className="p-6">
            <textarea className={`${felt} min-h-[130px] leading-relaxed`} value={askRaw} onChange={(e) => setAskRaw(e.target.value)} placeholder={'Ett punkt per linje…\nEks: Godkjenne budsjett for H2 2025\nEks: Beslutte kapitalinnhenting'} />
          </Panel>
        ) : (
          (() => {
            const punkter = askRaw.split('\n').map((s) => s.trim()).filter(Boolean);
            if (!punkter.length) return <Panel className="p-7 border-dashed"><p className="text-[14px] text-[#a9a9a5]">Ingen punkter ennå.</p></Panel>;
            return (
              <Panel className="p-7 bg-gradient-to-br from-[#faf5ff] to-white">
                <ol className="space-y-3.5">
                  {punkter.map((p, i) => (
                    <li key={i} className="flex items-start gap-3.5 text-[16px] text-[#1f1f1d] leading-relaxed">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-white text-[12px] font-bold">{i + 1}</span>
                      {p}
                    </li>
                  ))}
                </ol>
              </Panel>
            );
          })()
        )}
      </section>

      {/* Footer */}
      <footer className="pt-8 mt-4 border-t border-black/[0.06] text-[12px] text-[#a9a9a5] flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-semibold text-[#6b6b67]">DigiHome · Styrerapport</span>
        <span>Generert {data?.generatedAt ? new Date(data.generatedAt).toLocaleString('nb-NO') : '—'}</span>
        <span>Kilder: plattform · økonomimotor · PowerOffice Go</span>
        <span className="text-[#cf97fc] font-semibold">Konfidensiell — kun til intern bruk</span>
      </footer>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex items-center gap-3 py-24 justify-center text-[14px] text-black/50">
        <Loader2 className="h-5 w-5 animate-spin" /> Laster styrerapport …
      </div>
    );
  }

  if (presentasjon) {
    return (
      <div className="dh-sr-overlay fixed inset-0 z-[60] overflow-auto bg-[#f7f6f4]">
        <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
        <div className="px-4 sm:px-6">{toolbar}</div>
        {rapportInnhold}
      </div>
    );
  }

  return (
    <div>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {toolbar}
      {feil && <Panel className="p-6 mb-4"><p className="text-[14px] text-[#b3261e]">{feil}</p></Panel>}
      {rapportInnhold}
    </div>
  );
}
