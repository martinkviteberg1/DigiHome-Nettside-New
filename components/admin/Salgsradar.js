'use client';

/* ═══════════ SALGSRADAR — FINN-annonse → tilbud til huseier ═══════════
   Linear-inspirert master-detail:
   · Desktop (listemodus): valgt lead → splittvisning — kompakt liste venstre,
     detaljpanel høyre. Tabellmodus/mobil: panel som høyre-ark / fullskjerm.
   · EXPAND-knapp i panelet → stor sentrert tokolonnevisning (maks 1280px)
   · Flat Linear-typografi: seksjoner med hårfine skiller, ikke boks-i-boks
   · To visninger: LISTE (arbeidsflate) og TABELL (alle AI-delscorer)
   · Søk, statusfilter, sortering, multivalg + bulk-sletting, lightbox
   Utsendelse skjer MANUELT (FINN-melding/telefon) — mfl. §15. */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, Radar, ExternalLink, Sparkles, Trash2, X, Copy, Check, Eye, Phone,
  BedDouble, Ruler, Home, Wand2, MessageSquare, ChevronLeft, ChevronRight,
  RefreshCw, Square, CheckSquare, Search, List, Table2, ArrowLeft, ArrowUp, ArrowDown,
  Maximize2, Minimize2, Images, Banknote, Globe, StickyNote,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const kr = (v) => `${tall(v)}\u202Fkr`;

const STATUSER = [
  { k: 'ny', l: 'Ny', farge: '#78716c', bg: '#f4f2ee' },
  { k: 'analysert', l: 'Analysert', farge: '#6d28d9', bg: '#f4f0fb' },
  { k: 'kontaktet', l: 'Kontaktet', farge: '#9a6b1c', bg: '#fdf3e0' },
  { k: 'dialog', l: 'Dialog', farge: '#0e7490', bg: '#e9f6f9' },
  { k: 'vunnet', l: 'Vunnet', farge: '#1f7a45', bg: '#eef6f0' },
  { k: 'tapt', l: 'Tapt', farge: '#c2413b', bg: '#fdf0ef' },
];
const STIL_VALG = [
  { k: 'nordisk', l: 'Nordisk lys' },
  { k: 'moderne', l: 'Moderne eksklusiv' },
  { k: 'varm', l: 'Varm og innbydende' },
];
const DEL_ETIKETTER = [
  ['visuell', 'Visuelt inntrykk', 'Visuell'],
  ['opplosning', 'Oppløsning', 'Oppl.'],
  ['orientering', 'Bildeformat', 'Format'],
  ['antall', 'Bildeantall', 'Antall'],
  ['tekst', 'Tekstkvalitet', 'Tekst'],
  ['hygiene', 'Datahygiene', 'Data'],
];

const naarSist = (iso) => {
  if (!iso) return '';
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${Math.max(1, d)} min siden`;
  if (d < 1440) return `${Math.round(d / 60)} t siden`;
  return `${Math.round(d / 1440)} d siden`;
};
const statusStil = (s) => STATUSER.find((x) => x.k === s) || STATUSER[0];
const scoreFarge = (s) => (s >= 70 ? { c: '#1f7a45', bg: '#eef6f0' } : s >= 40 ? { c: '#9a6b1c', bg: '#fdf3e0' } : { c: '#78716c', bg: '#f4f2ee' });
const delFarge = (v) => (v == null ? '#c9c4bd' : v >= 7 ? '#1f7a45' : v >= 4 ? '#57534e' : '#c2413b');

function PotensialBadge({ p, id, stor = false }) {
  if (!p) return null;
  const f = scoreFarge(p.score);
  return (
    <span
      data-testid={id ? `radar-potensial-${id}` : undefined}
      title={p.forelopig ? `Foreløpig potensial ${p.score}/100 — kjør AI-analyse for full score` : `Potensial ${p.score}/100 · annonsekvalitet ${p.annonseScore}/100`}
      className={`flex shrink-0 items-center justify-center rounded-lg font-bold tabular-nums ${stor ? 'h-10 w-16 text-[16px]' : 'h-8 w-12 text-[13px]'}`}
      style={{ color: f.c, background: f.bg, ...heading }}
    >
      {p.forelopig ? `~${p.score}` : p.score}
    </span>
  );
}

/* Flat Linear-seksjonshode */
const SekHode = ({ ikon: Ikon, tittel, hoyre }) => (
  <div className="flex flex-wrap items-center gap-2">
    {Ikon && <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4f0fb]"><Ikon className="h-[15px] w-[15px] text-[#8b5cf6]" /></span>}
    <h3 className="text-[14px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{tittel}</h3>
    <span className="ml-auto flex items-center gap-2">{hoyre}</span>
  </div>
);

function Lightbox({ liste, idx, setIdx, onClose }) {
  useEffect(() => {
    const tast = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % liste.length);
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + liste.length) % liste.length);
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [liste.length, setIdx, onClose]);
  const b = liste[idx];
  if (!b) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-[#0a0a0a]/95" data-testid="radar-lightbox" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <span className="text-[12px] font-semibold tabular-nums text-white/60" style={heading}>{idx + 1} / {liste.length}</span>
        <span className={`rounded-md px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide ${b.ai ? 'bg-[#8b5cf6]/25 text-[#cfb3f7]' : 'bg-white/10 text-white/60'}`}>{b.etikett}</span>
        <button onClick={onClose} data-testid="radar-lightbox-lukk" className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"><X style={{ width: 20, height: 20 }} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-12 sm:px-16" onClick={(e) => e.stopPropagation()}>
        {liste.length > 1 && (
          <button onClick={() => setIdx((i) => (i - 1 + liste.length) % liste.length)} data-testid="radar-lightbox-forrige" aria-label="Forrige bilde"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-all hover:bg-white/20 sm:left-4">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={b.url} alt="" className="max-h-[76vh] max-w-full rounded-lg object-contain shadow-2xl" />
        {liste.length > 1 && (
          <button onClick={() => setIdx((i) => (i + 1) % liste.length)} data-testid="radar-lightbox-neste" aria-label="Neste bilde"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-all hover:bg-white/20 sm:right-4">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
      <div className="flex justify-center gap-1.5 overflow-x-auto px-4 py-3" onClick={(e) => e.stopPropagation()}>
        {liste.map((t, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={t.url} alt="" onClick={() => setIdx(i)}
            className={`h-12 w-[68px] shrink-0 cursor-pointer rounded-md object-cover transition-all ${i === idx ? 'ring-2 ring-white' : 'opacity-40 hover:opacity-80'}`} />
        ))}
      </div>
    </div>
  );
}

export default function Salgsradar({ apiKey }) {
  const api = useCallback(async (path, opts = {}) => {
    const url = `/api/admin/salgsradar/${path}${path.includes('?') ? '&' : '?'}key=${encodeURIComponent(apiKey)}`;
    const r = await fetch(url, {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(j.error || `Feil (${r.status})`);
    return j;
  }, [apiKey]);

  const [leads, setLeads] = useState([]);
  const [laster, setLaster] = useState(true);
  const [url, setUrl] = useState('');
  const [henter, setHenter] = useState(false);
  const [feil, setFeil] = useState('');
  const [filter, setFilter] = useState('alle');
  const [sok, setSok] = useState('');
  const [sort, setSort] = useState({ key: 'potensial', dir: 'desc' });
  const [visning, setVisning] = useState('liste');
  const [valgtId, setValgtId] = useState(null);
  const [utvidet, setUtvidet] = useState(false);
  const [bred, setBred] = useState(true);
  const [styler, setStyler] = useState(null);
  const [stil, setStil] = useState('nordisk');
  const [kopiert, setKopiert] = useState(false);
  const [meldingKopiert, setMeldingKopiert] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);
  const [analyserer, setAnalyserer] = useState(false);
  const [utvalg, setUtvalg] = useState(() => new Set());
  const [bulkBekreft, setBulkBekreft] = useState(false);
  const [bulkSletter, setBulkSletter] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)');
    const oppd = () => setBred(m.matches);
    oppd();
    m.addEventListener('change', oppd);
    return () => m.removeEventListener('change', oppd);
  }, []);

  const hentLeads = useCallback(async () => {
    try { const j = await api('leads'); setLeads(j.leads || []); } catch (e) { setFeil(e.message); }
    setLaster(false);
  }, [api]);
  useEffect(() => { hentLeads(); }, [hentLeads]);

  const hentAnnonse = async () => {
    if (henter || !url.trim()) return;
    setHenter(true); setFeil('');
    try {
      const j = await api('hent', { method: 'POST', body: { url: url.trim() } });
      setUrl('');
      await hentLeads();
      setValgtId(j.lead.id);
    } catch (e) { setFeil(e.message); }
    setHenter(false);
  };

  const oppdater = async (id, patch, behold) => {
    try {
      await api('lead', { method: 'PUT', body: { id, ...patch } });
      if (!behold) setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, analyse: patch.analyse ? { ...l.analyse, ...patch.analyse } : l.analyse } : l)));
    } catch (e) { setFeil(e.message); }
  };

  const slett = async (id) => {
    try {
      await api(`lead?id=${id}`, { method: 'DELETE' });
      setValgtId(null); setSletteBekreft(false);
      setLeads((prev) => prev.filter((l) => l.id !== id));
      setUtvalg((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch (e) { setFeil(e.message); }
  };

  const bulkSlett = async () => {
    if (bulkSletter || utvalg.size === 0) return;
    setBulkSletter(true); setFeil('');
    try {
      await api('slett-mange', { method: 'POST', body: { ids: Array.from(utvalg) } });
      setLeads((prev) => prev.filter((l) => !utvalg.has(l.id)));
      if (valgtId && utvalg.has(valgtId)) setValgtId(null);
      setUtvalg(new Set()); setBulkBekreft(false);
    } catch (e) { setFeil(e.message); }
    setBulkSletter(false);
  };

  const analyser = async (id) => {
    if (analyserer) return;
    setAnalyserer(true); setFeil('');
    try {
      const j = await api('analyser', { method: 'POST', body: { leadId: id } });
      setLeads((prev) => prev.map((l) => (l.id === id
        ? { ...l, ...j.lead, potensial: { score: j.lead.ai.potensialScore, annonseScore: j.lead.ai.annonseScore, forelopig: false } }
        : l)));
    } catch (e) { setFeil(e.message); }
    setAnalyserer(false);
  };

  const stylBilde = async (lead, bildeUrl) => {
    if (styler) return;
    setStyler(bildeUrl); setFeil('');
    try {
      await api('stil', { method: 'POST', body: { leadId: lead.id, bildeUrl, stil } });
      await hentLeads();
    } catch (e) { setFeil(e.message); }
    setStyler(null);
  };

  const veksleValg = (id) => setUtvalg((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const settLead = (id, fn) => setLeads((prev) => prev.map((x) => (x.id === id ? fn(x) : x)));

  const valgt = useMemo(() => leads.find((l) => l.id === valgtId) || null, [leads, valgtId]);
  const filtrert = useMemo(() => {
    let arr = filter === 'alle' ? leads : leads.filter((l) => l.status === filter);
    const q = sok.trim().toLowerCase();
    if (q) arr = arr.filter((l) => `${l.adresse || ''} ${l.tittel || ''} ${l.postnr || ''}`.toLowerCase().includes(q));
    return arr;
  }, [leads, filter, sok]);
  const sortert = useMemo(() => {
    const arr = [...filtrert];
    const v = (l) => {
      if (sort.key === 'potensial') return l.potensial?.score || 0;
      if (sort.key === 'kvalitet') return l.potensial?.annonseScore || 0;
      if (sort.key === 'pris') return l.pris || 0;
      if (sort.key === 'aapnet') return l.aapninger || 0;
      return new Date(l.createdAt || 0).getTime();
    };
    arr.sort((a, b) => (v(b) - v(a)) * (sort.dir === 'desc' ? 1 : -1));
    return arr;
  }, [filtrert, sort]);
  const antall = useMemo(() => {
    const a = { alle: leads.length };
    for (const s of STATUSER) a[s.k] = leads.filter((l) => l.status === s.k).length;
    return a;
  }, [leads]);

  const regnestykke = (l) => {
    const anbefalt = Number(l.analyse?.anbefaltLeie) || 0;
    const pct = Number(l.analyse?.honorarPct) || 8;
    const honorar = Math.round((anbefalt * pct) / 100);
    const netto = anbefalt - honorar;
    return { anbefalt, pct, honorar, netto, gevinst: l.pris ? netto - l.pris : null };
  };

  const tilbudLenke = (l) => `${typeof window !== 'undefined' ? window.location.origin : ''}/tilbud/${l.tilbudSlug}`;
  const kopierLenke = (l) => navigator.clipboard?.writeText(tilbudLenke(l)).then(() => { setKopiert(true); setTimeout(() => setKopiert(false), 1600); });
  const kopierMelding = (l) => {
    const tekst = String(l.ai?.finnMelding || '').replace(/\{LENKE\}/g, tilbudLenke(l));
    navigator.clipboard?.writeText(tekst).then(() => { setMeldingKopiert(true); setTimeout(() => setMeldingKopiert(false), 1600); });
  };

  const galleri = useMemo(() => {
    if (!valgt) return [];
    return [
      ...(valgt.stylet || []).map((s) => ({ url: `/api/tilbud/bilde?id=${s.id}`, etikett: `AI · ${STIL_VALG.find((x) => x.k === s.stil)?.l || s.stil}`, ai: true })),
      ...(valgt.bilder || []).slice(0, 14).map((b) => ({ url: b, etikett: 'Original', ai: false, kilde: b })),
    ];
  }, [valgt]);

  const splitt = Boolean(valgt) && bred && visning === 'liste' && !utvidet;
  const sorter = (key) => setSort((p) => (p.key === key ? { key, dir: p.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  const SortPil = ({ k }) => (sort.key !== k ? null : sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />);

  /* ────────── Detaljpanel-seksjoner (flat Linear-stil) ────────── */
  const panel = valgt && (() => {
    const rs = regnestykke(valgt);
    const ai = valgt.ai || null;
    const pf = scoreFarge(valgt.potensial?.score || 0);

    const sekBilder = galleri.length > 0 && (
      <section className="py-6">
        <SekHode ikon={Images} tittel={`Bilder (${galleri.length})`} hoyre={(
          <>
            <select value={stil} onChange={(e) => setStil(e.target.value)} data-testid="radar-stil-velger" className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] outline-none focus:border-[#8b5cf6]/40">
              {STIL_VALG.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
            </select>
            {(valgt.bilder || [])[0] && (
              <button onClick={() => stylBilde(valgt, valgt.bilder[0])} disabled={!!styler} data-testid="radar-styl-bilde" title="Styl hovedbildet med AI (~30-60 sek)"
                className="flex h-8 items-center gap-1.5 rounded-lg bg-[#f4f0fb] px-3 text-[12px] font-bold text-[#6d28d9] transition-colors hover:bg-[#ece4f9] disabled:opacity-50">
                {styler ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Styl
              </button>
            )}
          </>
        )} />
        <div className="mt-3 grid grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl" style={{ maxHeight: utvidet ? 360 : 300 }}>
          <div className="group relative col-span-4 row-span-2 cursor-pointer sm:col-span-2" onClick={() => setLightbox({ idx: 0 })} data-testid="radar-galleri-bilde" role="button" tabIndex={0}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={galleri[0].url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" style={{ maxHeight: utvidet ? 360 : 300 }} />
            {galleri[0].ai && <span className="absolute left-2 top-2 rounded bg-[#8b5cf6]/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI-stylet</span>}
          </div>
          {galleri.slice(1, 5).map((b, i) => (
            <div key={b.url} className="group relative hidden cursor-pointer sm:block" onClick={() => setLightbox({ idx: i + 1 })} data-testid="radar-galleri-bilde" role="button" tabIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" style={{ minHeight: 70 }} />
              {b.ai && <span className="absolute left-1.5 top-1.5 rounded bg-[#8b5cf6]/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">AI</span>}
              {i === 3 && galleri.length > 5 && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[14px] font-bold text-white" style={heading}>+{galleri.length - 5}</span>
              )}
            </div>
          ))}
        </div>
        {/* Thumb-stripe med AI-styling på hover */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {galleri.map((b, i) => (
            <div key={b.url} className="group relative shrink-0 cursor-pointer" onClick={() => setLightbox({ idx: i })} role="button" tabIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" className="h-14 w-20 rounded-lg object-cover transition-opacity group-hover:opacity-90" />
              {b.ai ? (
                <span className="absolute left-1 top-1 rounded bg-[#8b5cf6]/90 px-1 py-px text-[7.5px] font-bold uppercase text-white">AI</span>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); stylBilde(valgt, b.kilde); }} disabled={!!styler} data-testid="radar-styl-bilde" title="Styl dette bildet med AI"
                  className="absolute bottom-1 right-1 rounded bg-black/55 p-1 text-white opacity-0 transition-opacity hover:bg-[#8b5cf6] group-hover:opacity-100 disabled:opacity-40">
                  {styler === b.kilde ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                </button>
              )}
              {styler === b.kilde && <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40"><Loader2 className="h-4 w-4 animate-spin text-white" /></span>}
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[#b8b2a9]">Klikk for fullskjerm · tryllestaven AI-styler originalbilder (~30–60 sek, maks 6).</p>
      </section>
    );

    const sekAnalyse = (
      <section className="py-6">
        <SekHode ikon={Sparkles} tittel="AI-analyse" hoyre={ai ? (
          <>
            <span className="text-[11px] text-[#c9c4bd]">{naarSist(ai.at)}</span>
            <button onClick={() => analyser(valgt.id)} disabled={analyserer} data-testid="radar-analyser-btn" title="Kjør analysen på nytt"
              className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9] disabled:opacity-50">
              {analyserer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} På nytt
            </button>
          </>
        ) : null} />
        {!ai ? (
          analyserer ? (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-[#f4f0fb] px-4 py-4 text-[13px] text-[#6d28d9]">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> Analyserer bilder, piksler og tekst — tar 15–40 sekunder…
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-[#8b5cf6]/30 bg-[#faf8fd] px-5 py-5">
              <p className="text-[13px] leading-relaxed text-[#78716c]">AI vurderer lys, skarphet, ryddighet og styling — koden måler piksler, bildeformat og datahygiene. Du får score, funn, salgsvinkel, FINN-melding og personlig tilbudstekst.</p>
              <button onClick={() => analyser(valgt.id)} data-testid="radar-analyser-btn"
                className="mt-4 flex h-10 items-center gap-2 rounded-lg bg-[#8b5cf6] px-5 text-[13px] font-bold text-white transition-all hover:bg-[#7c4ce6] active:scale-[0.98]">
                <Sparkles className="h-4 w-4" /> Kjør AI-analyse
              </button>
            </div>
          )
        ) : (
          <div className="mt-4" data-testid="radar-analyse-resultat">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl px-4 py-4" style={{ background: pf.bg }}>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: pf.c }}>Potensial</p>
                <p className="mt-1 text-[30px] font-bold leading-none tabular-nums" style={{ ...heading, color: pf.c }}>{ai.potensialScore}<span className="text-[14px] font-semibold opacity-60">/100</span></p>
              </div>
              <div className="rounded-xl bg-[#fafaf8] px-4 py-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Annonsekvalitet i dag</p>
                <p className="mt-1 text-[30px] font-bold leading-none tabular-nums text-[#44403c]" style={heading}>{ai.annonseScore}<span className="text-[14px] font-semibold text-[#b8b2a9]">/100</span></p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {DEL_ETIKETTER.map(([k, etikett]) => (
                <div key={k}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11.5px] font-medium text-[#78716c]">{etikett}</span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ ...heading, color: delFarge(ai.deler?.[k]) }}>{ai.deler?.[k] ?? '–'}</span>
                  </div>
                  <div className="mt-1.5 h-[5px] overflow-hidden rounded-full bg-[#f1efeb]">
                    <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${Math.min(100, (ai.deler?.[k] || 0) * 10)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {ai.teknisk && (
              <p className="mt-3 text-[11.5px] tabular-nums text-[#a8a29a]">
                {ai.teknisk.maltBilder} av {ai.teknisk.antallBilder} bilder målt
                {ai.teknisk.snittMp != null ? ` · snitt ${ai.teknisk.snittMp} MP` : ''}
                {ai.teknisk.andelPortrett != null ? ` · ${Math.round(ai.teknisk.andelPortrett * 100)} % portrett${ai.teknisk.andelPortrett >= 0.8 ? ' (tyder på mobilbilder)' : ''}` : ''}
              </p>
            )}
            {(ai.funn || []).length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {ai.funn.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#57534e]">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#8b5cf6]" />{f}
                  </li>
                ))}
              </ul>
            )}
            {ai.salgsvinkel && (
              <div className="mt-4 rounded-xl bg-[#f4f0fb] px-4 py-3.5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#8b5cf6]">Anbefalt salgsvinkel · stylingpotensial {ai.stylingPotensial}</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-[#44403c]">{ai.salgsvinkel}</p>
              </div>
            )}
          </div>
        )}
      </section>
    );

    const sekOkonomi = (
      <section className="py-6">
        <SekHode ikon={Banknote} tittel="Økonomi og tilbud" />
        {valgt.analyse?.grunnlag?.snittLeie ? (
          <p className="mt-2 text-[12px] text-[#a8a29a]">
            Porteføljen vår: snittleie {kr(valgt.analyse.grunnlag.snittLeie)} ({valgt.analyse.grunnlag.antallILeide} utleide)
            {valgt.analyse.grunnlag.snittSone ? ` · sone ${valgt.analyse.grunnlag.sone}: ${kr(valgt.analyse.grunnlag.snittSone)}` : ''}
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Anbefalt leie (kr/mnd)</span>
            <input type="number" value={valgt.analyse?.anbefaltLeie ?? ''} data-testid="radar-anbefalt-input"
              onChange={(e) => settLead(valgt.id, (x) => ({ ...x, analyse: { ...x.analyse, anbefaltLeie: Number(e.target.value) } }))}
              onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: Number(e.target.value), honorarPct: valgt.analyse?.honorarPct } })}
              className="h-10 w-full rounded-lg border border-black/[0.08] px-3 text-[13.5px] tabular-nums outline-none transition-colors focus:border-[#8b5cf6]/50" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Honorar (% eks. mva)</span>
            <input type="number" min="4" max="15" step="0.5" value={valgt.analyse?.honorarPct ?? 8} data-testid="radar-honorar-input"
              onChange={(e) => settLead(valgt.id, (x) => ({ ...x, analyse: { ...x.analyse, honorarPct: Number(e.target.value) } }))}
              onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: valgt.analyse?.anbefaltLeie, honorarPct: Number(e.target.value) } })}
              className="h-10 w-full rounded-lg border border-black/[0.08] px-3 text-[13.5px] tabular-nums outline-none transition-colors focus:border-[#8b5cf6]/50" />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.06]">
          {[['Vårt honorar', kr(rs.honorar), '#6d28d9'], ['Netto til eier', kr(rs.netto), '#1f7a45'],
            ['vs. i dag', rs.gevinst == null ? '–' : `${rs.gevinst >= 0 ? '+' : '−'}${kr(Math.abs(rs.gevinst))}`, rs.gevinst != null && rs.gevinst < 0 ? '#c2413b' : '#1f7a45']].map(([l, v, c]) => (
            <div key={l} className="bg-white px-3.5 py-3">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#a8a29a]">{l}</p>
              <p className="mt-0.5 text-[15px] font-bold tabular-nums" style={{ ...heading, color: c }}>{v}<span className="text-[10.5px] font-medium text-[#b8b2a9]">/mnd</span></p>
            </div>
          ))}
        </div>
      </section>
    );

    const sekMelding = ai && (
      <section className="py-6">
        <SekHode ikon={MessageSquare} tittel="FINN-melding" hoyre={(
          <button onClick={() => kopierMelding(valgt)} data-testid="radar-kopier-melding"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-[#f4f0fb] px-3 text-[12px] font-bold text-[#6d28d9] transition-colors hover:bg-[#ece4f9]">
            {meldingKopiert ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {meldingKopiert ? 'Kopiert!' : 'Kopier med lenke'}
          </button>
        )} />
        <textarea value={ai.finnMelding || ''} rows={4} data-testid="radar-finnmelding"
          onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, finnMelding: e.target.value } }))}
          onBlur={(e) => oppdater(valgt.id, { finnMelding: e.target.value }, true)}
          className="mt-3 w-full resize-none rounded-xl border border-black/[0.08] px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors focus:border-[#8b5cf6]/50" />
        <p className="mt-1.5 text-[11px] text-[#b8b2a9]">{'{LENKE}'} byttes automatisk med tilbudslenken når du kopierer. Redigeres fritt — lagres når du klikker ut.</p>
      </section>
    );

    const sekTilbud = (
      <section className="py-6">
        <SekHode ikon={Globe} tittel="Tilbudsside til huseier" hoyre={(valgt.aapninger || 0) > 0 ? (
          <span className="flex items-center gap-1 text-[12px] tabular-nums text-[#0e7490]"><Eye className="h-3.5 w-3.5" /> Åpnet {valgt.aapninger}×{valgt.sistAapnet ? ` · ${naarSist(valgt.sistAapnet)}` : ''}</span>
        ) : null} />
        <div className="mt-3 flex gap-2">
          <button onClick={() => kopierLenke(valgt)} data-testid="radar-kopier-lenke" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[#0a0a0a] px-4 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.98]">
            {kopiert ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {kopiert ? 'Kopiert!' : 'Kopier tilbudslenke'}
          </button>
          <a href={`/tilbud/${valgt.tilbudSlug}`} target="_blank" rel="noreferrer" data-testid="radar-aapne-tilbud" className="flex h-10 items-center gap-1.5 rounded-lg bg-[#f4f0fb] px-4 text-[13px] font-semibold text-[#6d28d9] transition-all hover:bg-[#ece4f9]">
            Åpne <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        {ai && (
          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Personlig intro — vises øverst på tilbudet</span>
              <textarea value={ai.tilbudTekst?.heroIntro || ''} rows={2} data-testid="radar-hero-intro"
                onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, tilbudTekst: { ...x.ai.tilbudTekst, heroIntro: e.target.value } } }))}
                onBlur={(e) => oppdater(valgt.id, { tilbudTekst: { heroIntro: e.target.value } }, true)}
                className="w-full resize-none rounded-xl border border-black/[0.08] px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors focus:border-[#8b5cf6]/50" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">«Potensialet vi ser» — vises før regnestykket</span>
              <textarea value={ai.tilbudTekst?.potensialTekst || ''} rows={3} data-testid="radar-potensial-tekst"
                onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, tilbudTekst: { ...x.ai.tilbudTekst, potensialTekst: e.target.value } } }))}
                onBlur={(e) => oppdater(valgt.id, { tilbudTekst: { potensialTekst: e.target.value } }, true)}
                className="w-full resize-none rounded-xl border border-black/[0.08] px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors focus:border-[#8b5cf6]/50" />
            </label>
            <p className="text-[11px] text-[#b8b2a9]">Tomme felter → tilbudssiden bruker standardteksten.</p>
          </div>
        )}
        <p className="mt-2 text-[11px] text-[#b8b2a9]">Send lenken via FINN-meldingen på annonsen{valgt.kontaktTlf ? ` — eller ring ${valgt.kontaktTlf}` : ''}. Ikke uanmodet e-post/SMS (mfl. §15).</p>
        {(valgt.kontaktLogg || []).length > 0 && (
          <div className="mt-3 space-y-2">
            {valgt.kontaktLogg.map((kx, i) => (
              <p key={i} className="flex items-start gap-2 rounded-xl bg-[#e9f6f9] px-3.5 py-2.5 text-[12.5px] text-[#0e7490]">
                <MessageSquare className="mt-[2px] h-3.5 w-3.5 shrink-0" />
                <span><b>{kx.navn}</b> ({kx.telefon}) — {kx.melding || 'ba om å bli ringt'} · {naarSist(kx.at)}</span>
              </p>
            ))}
          </div>
        )}
      </section>
    );

    const sekNotat = (
      <section className="py-6">
        <SekHode ikon={StickyNote} tittel="Notat" />
        <textarea value={valgt.notat || ''} rows={2} data-testid="radar-notat"
          onChange={(e) => settLead(valgt.id, (x) => ({ ...x, notat: e.target.value }))}
          onBlur={(e) => oppdater(valgt.id, { notat: e.target.value })}
          placeholder="Ringt 14/2, svarte ikke — prøver igjen torsdag…"
          className="mt-3 w-full resize-none rounded-xl border border-black/[0.08] px-3.5 py-3 text-[13px] outline-none transition-colors placeholder:text-[#ccc] focus:border-[#8b5cf6]/50" />
      </section>
    );

    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="radar-skuff">
        {/* Panelhode */}
        <div className="border-b border-black/[0.05] px-5 pb-4 pt-4 sm:px-7">
          <div className="flex items-start gap-3">
            <button onClick={() => { setValgtId(null); setUtvidet(false); }} data-testid="radar-skuff-lukk" aria-label="Lukk"
              className="mt-1 shrink-0 rounded-lg p-1.5 text-[#a8a29a] transition-colors hover:bg-[#f3f2f0] hover:text-[#333]">
              {splitt || utvidet ? <X className="h-[19px] w-[19px]" /> : <ArrowLeft className="h-[19px] w-[19px]" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[21px] font-bold leading-tight tracking-[-0.015em] sm:text-[23px]" style={heading}>{valgt.adresse || valgt.tittel}</h2>
                {valgt.kilde === 'agent' && <span className="rounded-md bg-[#f1ebfc] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#6d28d9]" title="Matet inn av overvåkningsagenten">Agent</span>}
              </div>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[13px] text-[#a8a29a]">
                <span className="font-bold tabular-nums text-[#1c1917]" style={heading}>{kr(valgt.pris)}<span className="font-medium text-[#a8a29a]">/mnd</span></span>
                {valgt.m2 ? <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{valgt.m2} m²</span> : null}
                {valgt.soverom ? <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{valgt.soverom} sov</span> : null}
                {valgt.boligtype ? <span>{valgt.boligtype}</span> : null}
                {valgt.kontaktTlf ? <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{valgt.kontaktTlf}</span> : null}
                <a href={valgt.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3.5 w-3.5" /></a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={() => setUtvidet((u) => !u)} data-testid="radar-utvid" title={utvidet ? 'Minimer visningen' : 'Utvid til stor visning'}
                className="rounded-lg p-2 text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9]">
                {utvidet ? <Minimize2 className="h-[17px] w-[17px]" /> : <Maximize2 className="h-[17px] w-[17px]" />}
              </button>
              <PotensialBadge p={valgt.potensial} stor />
            </div>
          </div>
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {STATUSER.map((s) => (
              <button key={s.k} onClick={() => oppdater(valgt.id, { status: s.k })} data-testid={`radar-status-${s.k}`}
                className="rounded-full px-3 py-1.5 text-[11.5px] font-bold transition-all"
                style={valgt.status === s.k ? { color: '#fff', background: s.farge } : { color: s.farge, background: s.bg }}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Panelinnhold — tokolonne når utvidet */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {utvidet ? (
            <div className="grid grid-cols-1 gap-x-12 px-5 sm:px-7 lg:grid-cols-2">
              <div className="divide-y divide-black/[0.05]">{sekBilder}{sekAnalyse}</div>
              <div className="divide-y divide-black/[0.05]">{sekOkonomi}{sekMelding}{sekTilbud}{sekNotat}</div>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.05] px-5 sm:px-7">
              {sekBilder}{sekAnalyse}{sekOkonomi}{sekMelding}{sekTilbud}{sekNotat}
            </div>
          )}
        </div>

        {/* Panelfot */}
        <div className="flex items-center gap-2 border-t border-black/[0.05] bg-[#fcfcfb] px-5 py-3 sm:px-7">
          {!sletteBekreft ? (
            <button onClick={() => setSletteBekreft(true)} data-testid="radar-slett" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12.5px] font-semibold text-[#c9c4bd] transition-colors hover:bg-[#fdf0ef] hover:text-[#c2413b]">
              <Trash2 className="h-4 w-4" /> Slett lead
            </button>
          ) : (
            <span className="flex items-center gap-1.5">
              <button onClick={() => slett(valgt.id)} data-testid="radar-slett-bekreft" className="rounded-lg bg-[#fdf0ef] px-3.5 py-2 text-[12.5px] font-bold text-[#c2413b]">Ja, slett</button>
              <button onClick={() => setSletteBekreft(false)} className="rounded-lg px-2.5 py-2 text-[12.5px] font-semibold text-[#999]">Avbryt</button>
            </span>
          )}
          <p className="ml-auto text-[11px] text-[#b8b2a9]">Hentet {naarSist(valgt.createdAt)}</p>
        </div>
      </div>
    );
  })();

  /* ────────── Render ────────── */
  return (
    <div className="w-full" data-testid="salgsradar-modul">
      {/* Innliming */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><Radar className="h-[18px] w-[18px] text-[#8b5cf6]" /></span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') hentAnnonse(); }}
              placeholder="Lim inn FINN-leieannonse — f.eks. https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
              data-testid="radar-url-input"
              className="h-10 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-3.5 text-[13.5px] outline-none transition-all placeholder:text-[#c9c4bd] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15" />
          </div>
          <button onClick={hentAnnonse} disabled={henter || !url.trim()} data-testid="radar-hent-btn"
            className="flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#0a0a0a] px-5 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40">
            {henter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Hent og analyser
          </button>
        </div>
      </div>

      {feil && <p className="mt-3 rounded-lg bg-[#fdf0ef] px-4 py-3 text-[13px] text-[#c2413b]" data-testid="radar-feil">{feil}</p>}

      {/* Verktøylinje / bulk-linje */}
      {utvalg.size === 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c9c4bd]" />
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk adresse…" data-testid="radar-sok"
              className="h-9 w-[160px] rounded-full border border-black/[0.06] bg-white pl-9 pr-3 text-[12.5px] outline-none transition-all placeholder:text-[#c9c4bd] focus:w-[210px] focus:border-[#8b5cf6]/40 sm:w-[180px]" />
          </span>
          {[{ k: 'alle', l: 'Alle' }, ...STATUSER].map((s) => (
            <button key={s.k} onClick={() => setFilter(s.k)} data-testid={`radar-filter-${s.k}`}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-semibold transition-all ${filter === s.k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#78716c] shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:text-[#333]'}`}>
              {s.l} <span className={`tabular-nums ${filter === s.k ? 'text-white/60' : 'text-[#c9c4bd]'}`}>{antall[s.k] || 0}</span>
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="flex overflow-hidden rounded-lg border border-black/[0.07] bg-white">
              <button onClick={() => setVisning('liste')} data-testid="radar-visning-liste" title="Listevisning"
                className={`flex h-9 w-10 items-center justify-center transition-colors ${visning === 'liste' ? 'bg-[#0a0a0a] text-white' : 'text-[#a8a29a] hover:text-[#333]'}`}>
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => setVisning('tabell')} data-testid="radar-visning-tabell" title="Tabellvisning — alle AI-delscorer"
                className={`flex h-9 w-10 items-center justify-center transition-colors ${visning === 'tabell' ? 'bg-[#0a0a0a] text-white' : 'text-[#a8a29a] hover:text-[#333]'}`}>
                <Table2 className="h-4 w-4" />
              </button>
            </span>
            <select value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'desc' })} data-testid="radar-sort"
              className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 text-[12.5px] font-semibold text-[#57534e] outline-none focus:border-[#8b5cf6]/40">
              <option value="potensial">Høyest potensial</option>
              <option value="kvalitet">Annonsekvalitet</option>
              <option value="nyeste">Nyeste først</option>
              <option value="pris">Høyest leie</option>
            </select>
          </span>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-3 text-white">
          <span className="text-[13px] font-bold tabular-nums" style={heading}>{utvalg.size} valgt</span>
          <button onClick={() => setUtvalg(new Set(sortert.map((l) => l.id)))} data-testid="radar-velg-alle"
            className="rounded-lg px-3 py-1.5 text-[12.5px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            Velg alle ({sortert.length})
          </button>
          <span className="ml-auto flex items-center gap-1.5">
            {!bulkBekreft ? (
              <button onClick={() => setBulkBekreft(true)} data-testid="radar-bulk-slett"
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3.5 py-2 text-[12.5px] font-bold text-[#ff9d95] transition-colors hover:bg-white/15">
                <Trash2 className="h-4 w-4" /> Slett valgte
              </button>
            ) : (
              <button onClick={bulkSlett} disabled={bulkSletter} data-testid="radar-bulk-slett-bekreft"
                className="flex items-center gap-1.5 rounded-lg bg-[#c2413b] px-3.5 py-2 text-[12.5px] font-bold text-white transition-all hover:bg-[#a93833] disabled:opacity-60">
                {bulkSletter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Ja, slett {utvalg.size} leads
              </button>
            )}
            <button onClick={() => { setUtvalg(new Set()); setBulkBekreft(false); }} data-testid="radar-velg-avbryt"
              className="rounded-lg px-3 py-2 text-[12.5px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              Avbryt
            </button>
          </span>
        </div>
      )}

      {/* Innhold */}
      {laster ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>
      ) : sortert.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white px-5 py-10 text-center text-[13.5px] text-[#b3ada3] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {leads.length === 0 ? 'Lim inn din første FINN-annonse over — analysen tar noen sekunder.' : 'Ingen leads matcher søket/filteret.'}
        </p>
      ) : (
        <div className="mt-3 flex items-start gap-4">
          {/* Venstre: liste eller tabell */}
          <div className={`min-w-0 ${splitt ? 'w-[330px] shrink-0 xl:w-[380px]' : 'flex-1'}`}>
            {visning === 'liste' ? (
              <div className="overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
                {sortert.map((l) => {
                  const rs = regnestykke(l);
                  const st = statusStil(l.status);
                  const erValgt = utvalg.has(l.id);
                  const aktiv = l.id === valgtId;
                  return (
                    <div key={l.id} role="button" tabIndex={0}
                      onClick={() => { setValgtId(l.id); setSletteBekreft(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setValgtId(l.id); setSletteBekreft(false); } }}
                      data-testid={`radar-lead-${l.id}`}
                      className={`relative flex w-full cursor-pointer items-center gap-3 border-b border-black/[0.04] px-3.5 py-3.5 text-left transition-colors last:border-0 sm:px-5 ${aktiv ? 'bg-[#f4f0fb]/70' : erValgt ? 'bg-[#f4f0fb]/40' : 'hover:bg-[#fcfcfb]'}`}>
                      {aktiv && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#8b5cf6]" />}
                      <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label={erValgt ? 'Fjern markering' : 'Marker lead'}
                        className={`shrink-0 rounded-md p-1 transition-colors ${erValgt ? 'text-[#8b5cf6]' : 'text-[#ddd8d0] hover:text-[#a8a29a]'}`}>
                        {erValgt ? <CheckSquare className="h-[18px] w-[18px]" /> : <Square className="h-[18px] w-[18px]" />}
                      </button>
                      {(l.bilder || [])[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={l.bilder[0]} alt="" className={`shrink-0 rounded-xl object-cover ${splitt ? 'h-11 w-16' : 'h-14 w-20'}`} />
                        : <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#f4f2ee] ${splitt ? 'h-11 w-16' : 'h-14 w-20'}`}><Home className="h-4 w-4 text-[#c9c4bd]" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-[14px] font-bold text-[#1c1917]" style={heading}>{l.adresse || l.tittel}</span>
                          {l.kilde === 'agent' && !splitt && (
                            <span className="shrink-0 rounded-md bg-[#f1ebfc] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6d28d9]" title="Matet inn av overvåkningsagenten">Agent</span>
                          )}
                        </span>
                        <span className="mt-1 block truncate text-[12px] tabular-nums text-[#78716c]">
                          <b className="font-semibold text-[#44403c]">{kr(l.pris)}/mnd</b>
                          {!splitt && l.m2 ? <span className="text-[#a8a29a]"> · {l.m2} m²</span> : null}
                          {!splitt && l.soverom ? <span className="text-[#a8a29a]"> · {l.soverom} sov</span> : null}
                          {!splitt ? <span className="text-[#a8a29a]"> · honorar {kr(rs.honorar)}/mnd</span> : null}
                        </span>
                        <span className="mt-1.5 flex items-center gap-2">
                          <span className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: st.farge, background: st.bg }}>{st.l}</span>
                          {(l.stylet || []).length > 0 && <Wand2 className="h-3.5 w-3.5 text-[#8b5cf6]" title={`${l.stylet.length} AI-stylede bilder`} />}
                          {(l.aapninger || 0) > 0 && <span className="flex items-center gap-0.5 text-[10.5px] tabular-nums text-[#0e7490]" title={`Tilbudssiden åpnet ${l.aapninger} ganger`}><Eye className="h-3.5 w-3.5" />{l.aapninger}</span>}
                          {l.kilde === 'agent' && splitt && <span className="rounded bg-[#f1ebfc] px-1 py-0.5 text-[8px] font-bold uppercase text-[#6d28d9]">Agent</span>}
                        </span>
                      </span>
                      <PotensialBadge p={l.potensial} id={l.id} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="radar-tabell">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      <th className="w-10 px-3.5 py-3" />
                      <th className="px-2 py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Bolig</th>
                      <th className="px-2 py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Status</th>
                      <th className="cursor-pointer px-2 py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('potensial')} data-testid="radar-tabell-sort-potensial">
                        <span className="flex items-center gap-0.5">Potensial <SortPil k="potensial" /></span>
                      </th>
                      <th className="cursor-pointer px-2 py-3 text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('kvalitet')}>
                        <span className="flex items-center gap-0.5">Kvalitet <SortPil k="kvalitet" /></span>
                      </th>
                      {DEL_ETIKETTER.map(([k, lang, kort]) => (
                        <th key={k} className="px-2 py-3 text-center text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]" title={lang}>{kort}</th>
                      ))}
                      <th className="cursor-pointer px-2 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('pris')}>
                        <span className="flex items-center justify-end gap-0.5">Leie <SortPil k="pris" /></span>
                      </th>
                      <th className="px-2 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Anbefalt</th>
                      <th className="cursor-pointer px-3.5 py-3 text-right text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('aapnet')}>
                        <span className="flex items-center justify-end gap-0.5">Åpnet <SortPil k="aapnet" /></span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortert.map((l) => {
                      const erValgt = utvalg.has(l.id);
                      const st = statusStil(l.status);
                      const d = l.ai?.deler || null;
                      return (
                        <tr key={l.id} onClick={() => { setValgtId(l.id); setSletteBekreft(false); }} data-testid={`radar-lead-${l.id}`}
                          className={`cursor-pointer border-b border-black/[0.04] transition-colors last:border-0 ${erValgt ? 'bg-[#f4f0fb]/40' : 'hover:bg-[#fcfcfb]'}`}>
                          <td className="px-3.5 py-2.5">
                            <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label="Marker"
                              className={`rounded-md p-0.5 transition-colors ${erValgt ? 'text-[#8b5cf6]' : 'text-[#ddd8d0] hover:text-[#a8a29a]'}`}>
                              {erValgt ? <CheckSquare className="h-[17px] w-[17px]" /> : <Square className="h-[17px] w-[17px]" />}
                            </button>
                          </td>
                          <td className="px-2 py-2.5">
                            <span className="flex items-center gap-2.5">
                              {(l.bilder || [])[0]
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={l.bilder[0]} alt="" className="h-9 w-13 shrink-0 rounded-lg object-cover" style={{ width: 52 }} />
                                : <span className="flex h-9 shrink-0 items-center justify-center rounded-lg bg-[#f4f2ee]" style={{ width: 52 }}><Home className="h-3.5 w-3.5 text-[#c9c4bd]" /></span>}
                              <span className="min-w-0">
                                <span className="block max-w-[210px] truncate text-[13px] font-bold text-[#1c1917]" style={heading}>{l.adresse || l.tittel}</span>
                                <span className="flex items-center gap-1.5 text-[10.5px] text-[#b8b2a9]">
                                  {l.m2 ? `${l.m2} m²` : ''}{l.soverom ? ` · ${l.soverom} sov` : ''}
                                  {l.kilde === 'agent' && <span className="rounded bg-[#f1ebfc] px-1 py-px text-[8px] font-bold uppercase text-[#6d28d9]">Agent</span>}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2.5"><span className="rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ color: st.farge, background: st.bg }}>{st.l}</span></td>
                          <td className="px-2 py-2.5"><PotensialBadge p={l.potensial} id={l.id} /></td>
                          <td className="px-2 py-2.5 text-[13px] font-bold tabular-nums" style={{ ...heading, color: l.potensial?.forelopig ? '#b8b2a9' : '#44403c' }}>
                            {l.potensial?.forelopig ? `~${l.potensial.annonseScore}` : l.potensial?.annonseScore}
                          </td>
                          {DEL_ETIKETTER.map(([k]) => (
                            <td key={k} className="px-2 py-2.5 text-center text-[12px] font-semibold tabular-nums" style={{ ...heading, color: delFarge(d?.[k]) }}>
                              {d?.[k] ?? '–'}
                            </td>
                          ))}
                          <td className="px-2 py-2.5 text-right text-[12.5px] font-semibold tabular-nums text-[#44403c]" style={heading}>{tall(l.pris)}</td>
                          <td className="px-2 py-2.5 text-right text-[12.5px] tabular-nums text-[#78716c]" style={heading}>{l.analyse?.anbefaltLeie ? tall(l.analyse.anbefaltLeie) : '–'}</td>
                          <td className="px-3.5 py-2.5 text-right text-[12.5px] tabular-nums text-[#0e7490]">{l.aapninger || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Høyre: detaljpanel i splittvisning */}
          {splitt && (
            <div className="sticky top-4 min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)]" style={{ height: 'calc(100vh - 120px)', minHeight: 520 }}>
              {panel}
            </div>
          )}
        </div>
      )}

      {/* Utvidet: stor sentrert visning (fra alle moduser) */}
      {valgt && utvidet && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-5">
          <div className="absolute inset-0 bg-[#0a0a0a]/50" onClick={() => { setUtvidet(false); }} />
          <div className="dh-scale-in relative h-full w-full max-w-[1320px] overflow-hidden rounded-2xl bg-white shadow-[0_32px_120px_rgba(0,0,0,0.35)]">
            {panel}
          </div>
        </div>
      )}

      {/* Ikke-utvidet: høyre-ark (tabellmodus desktop) / fullskjerm (mobil) */}
      {valgt && !splitt && !utvidet && (
        <div className="fixed inset-0 z-[125] flex justify-end">
          <div className="absolute inset-0 bg-[#0a0a0a]/40" onClick={() => setValgtId(null)} />
          <div className="dh-pop relative h-full w-full overflow-hidden bg-white shadow-2xl lg:w-[660px]">
            {panel}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {valgt && lightbox && galleri.length > 0 && (
        <Lightbox
          liste={galleri}
          idx={Math.min(lightbox.idx, galleri.length - 1)}
          setIdx={(fn) => setLightbox((prev) => ({ idx: typeof fn === 'function' ? fn(prev?.idx || 0) : fn }))}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
