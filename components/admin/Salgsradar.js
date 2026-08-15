'use client';

/* ═══════════ SALGSRADAR — FINN-annonse → tilbud til huseier ═══════════
   Linear-inspirert master-detail:
   · Desktop: valgt lead → splittvisning (kompakt liste venstre, detaljpanel høyre)
   · Mobil: detaljpanel fullskjerm med tilbake-pil
   · To visninger: LISTE (arbeidsflate) og TABELL (analyse — alle AI-delscorer
     som sorterbare kolonner)
   · Søk, statusfilter, sortering, multivalg + bulk-sletting
   · AI-analyse (hybrid-score), galleri m/ lightbox, AI-styling, FINN-melding,
     redigerbar tilbudstekst. Utsendelse skjer MANUELT (mfl. §15). */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, Radar, ExternalLink, Sparkles, Trash2, X, Copy, Check, Eye, Phone,
  BedDouble, Ruler, Home, Wand2, MessageSquare, ChevronLeft, ChevronRight,
  RefreshCw, Square, CheckSquare, Search, List, Table2, ArrowLeft, ArrowUp, ArrowDown,
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
      className={`flex shrink-0 items-center justify-center rounded-lg font-bold tabular-nums ${stor ? 'h-9 w-14 text-[15px]' : 'h-7 w-11 text-[12px]'}`}
      style={{ color: f.c, background: f.bg, ...heading }}
    >
      {p.forelopig ? `~${p.score}` : p.score}
    </span>
  );
}

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

  const splitt = Boolean(valgt) && bred && visning === 'liste';
  const sorter = (key) => setSort((p) => (p.key === key ? { key, dir: p.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  const SortPil = ({ k }) => (sort.key !== k ? null : sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />);

  /* ────────── Detaljpanel (delt mellom splitt / fullskjerm / overlay) ────────── */
  const panel = valgt && (() => {
    const rs = regnestykke(valgt);
    const ai = valgt.ai || null;
    const pf = scoreFarge(valgt.potensial?.score || 0);
    const st = statusStil(valgt.status);
    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="radar-skuff">
        {/* Panelhode */}
        <div className="border-b border-black/[0.05] px-5 py-4 sm:px-6">
          <div className="flex items-start gap-3">
            <button onClick={() => setValgtId(null)} data-testid="radar-skuff-lukk" aria-label="Lukk"
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-[#a8a29a] transition-colors hover:bg-[#f3f2f0] hover:text-[#333]">
              {bred && visning === 'liste' ? <X className="h-[18px] w-[18px]" /> : <ArrowLeft className="h-[18px] w-[18px]" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[19px] font-bold leading-tight tracking-[-0.01em]" style={heading}>{valgt.adresse || valgt.tittel}</h2>
                {valgt.kilde === 'agent' && <span className="rounded bg-[#f1ebfc] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6d28d9]" title="Matet inn av overvåkningsagenten">Agent</span>}
              </div>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#a8a29a]">
                <span className="tabular-nums font-semibold text-[#57534e]">{kr(valgt.pris)}/mnd</span>
                {valgt.m2 ? <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{valgt.m2} m²</span> : null}
                {valgt.soverom ? <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{valgt.soverom} sov</span> : null}
                {valgt.boligtype ? <span>{valgt.boligtype}</span> : null}
                {valgt.kontaktTlf ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{valgt.kontaktTlf}</span> : null}
                <a href={valgt.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3 w-3" /></a>
              </p>
            </div>
            <PotensialBadge p={valgt.potensial} stor />
          </div>
          {/* Statuspipeline */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STATUSER.map((s) => (
              <button key={s.k} onClick={() => oppdater(valgt.id, { status: s.k })} data-testid={`radar-status-${s.k}`}
                className="rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all"
                style={valgt.status === s.k ? { color: '#fff', background: s.farge } : { color: s.farge, background: s.bg }}>
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Panelinnhold */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Galleri-hero (Airbnb-stil): stort bilde + thumbs */}
          {galleri.length > 0 && (
            <div className="px-5 pt-4 sm:px-6">
              <div className="grid grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl" style={{ maxHeight: 300 }}>
                <div className="group relative col-span-4 row-span-2 cursor-pointer sm:col-span-2" onClick={() => setLightbox({ idx: 0 })} data-testid="radar-galleri-bilde" role="button" tabIndex={0}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={galleri[0].url} alt="" className="h-full max-h-[300px] w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  {galleri[0].ai && <span className="absolute left-2 top-2 rounded bg-[#8b5cf6]/90 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">AI-stylet</span>}
                </div>
                {galleri.slice(1, 5).map((b, i) => (
                  <div key={b.url} className="group relative hidden cursor-pointer sm:block" onClick={() => setLightbox({ idx: i + 1 })} data-testid="radar-galleri-bilde" role="button" tabIndex={0}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={b.url} alt="" className="h-full w-full object-cover transition-transform group-hover:scale-[1.03]" style={{ minHeight: 70 }} />
                    {b.ai && <span className="absolute left-1.5 top-1.5 rounded bg-[#8b5cf6]/90 px-1 py-0.5 text-[8px] font-bold uppercase text-white">AI</span>}
                    {i === 3 && galleri.length > 5 && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-[13px] font-bold text-white" style={heading}>+{galleri.length - 5}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button onClick={() => setLightbox({ idx: 0 })} className="text-[11.5px] font-semibold text-[#6d28d9] hover:underline">Se alle {galleri.length} bilder</button>
                <span className="ml-auto flex items-center gap-1.5">
                  <select value={stil} onChange={(e) => setStil(e.target.value)} data-testid="radar-stil-velger" className="h-7 rounded-lg border border-black/[0.08] bg-white px-2 text-[11px] outline-none focus:border-[#8b5cf6]/40">
                    {STIL_VALG.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
                  </select>
                  {(valgt.bilder || [])[0] && (
                    <button onClick={() => stylBilde(valgt, valgt.bilder[0])} disabled={!!styler} data-testid="radar-styl-bilde" title="Styl hovedbildet med AI (~30-60 sek)"
                      className="flex h-7 items-center gap-1 rounded-lg bg-[#f4f0fb] px-2.5 text-[11px] font-bold text-[#6d28d9] transition-colors hover:bg-[#ece4f9] disabled:opacity-50">
                      {styler ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />} Styl hovedbilde
                    </button>
                  )}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4 px-5 py-4 sm:px-6">
            {/* AI-analyse */}
            <section className="rounded-xl border border-black/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><Sparkles className="h-3.5 w-3.5 text-[#8b5cf6]" /> AI-analyse</p>
                {ai && (
                  <>
                    <span className="text-[10.5px] text-[#c9c4bd]">{naarSist(ai.at)}</span>
                    <button onClick={() => analyser(valgt.id)} disabled={analyserer} data-testid="radar-analyser-btn" title="Kjør analysen på nytt"
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9] disabled:opacity-50">
                      {analyserer ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} På nytt
                    </button>
                  </>
                )}
              </div>
              {!ai ? (
                analyserer ? (
                  <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-[#f4f0fb] px-3.5 py-3 text-[12.5px] text-[#6d28d9]">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> Analyserer bilder, piksler og tekst — tar 15–40 sekunder…
                  </div>
                ) : (
                  <div className="mt-3">
                    <p className="text-[12px] leading-relaxed text-[#a8a29a]">Full hybrid-score: AI vurderer lys, skarphet, ryddighet og styling — koden måler piksler, bildeformat og datahygiene. Gir også funn, salgsvinkel, FINN-melding og personlig tilbudstekst.</p>
                    <button onClick={() => analyser(valgt.id)} data-testid="radar-analyser-btn"
                      className="mt-3 flex h-9 items-center gap-1.5 rounded-lg bg-[#8b5cf6] px-4 text-[12.5px] font-bold text-white transition-all hover:bg-[#7c4ce6] active:scale-[0.98]">
                      <Sparkles className="h-3.5 w-3.5" /> Kjør AI-analyse
                    </button>
                  </div>
                )
              ) : (
                <div className="mt-3" data-testid="radar-analyse-resultat">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg px-3.5 py-3" style={{ background: pf.bg }}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: pf.c }}>Potensial</p>
                      <p className="mt-0.5 text-[24px] font-bold tabular-nums" style={{ ...heading, color: pf.c }}>{ai.potensialScore}<span className="text-[13px] font-semibold opacity-60">/100</span></p>
                    </div>
                    <div className="rounded-lg bg-[#fafaf8] px-3.5 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Annonsekvalitet i dag</p>
                      <p className="mt-0.5 text-[24px] font-bold tabular-nums text-[#44403c]" style={heading}>{ai.annonseScore}<span className="text-[13px] font-semibold text-[#b8b2a9]">/100</span></p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
                    {DEL_ETIKETTER.map(([k, etikett]) => (
                      <div key={k}>
                        <div className="flex items-baseline justify-between">
                          <span className="text-[10.5px] font-semibold text-[#a8a29a]">{etikett}</span>
                          <span className="text-[10.5px] font-bold tabular-nums" style={{ ...heading, color: delFarge(ai.deler?.[k]) }}>{ai.deler?.[k] ?? '–'}</span>
                        </div>
                        <div className="mt-1 h-[4px] overflow-hidden rounded-full bg-[#f1efeb]">
                          <div className="h-full rounded-full bg-[#8b5cf6]" style={{ width: `${Math.min(100, (ai.deler?.[k] || 0) * 10)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  {ai.teknisk && (
                    <p className="mt-2.5 text-[10.5px] tabular-nums text-[#b8b2a9]">
                      {ai.teknisk.maltBilder} av {ai.teknisk.antallBilder} bilder målt
                      {ai.teknisk.snittMp != null ? ` · snitt ${ai.teknisk.snittMp} MP` : ''}
                      {ai.teknisk.andelPortrett != null ? ` · ${Math.round(ai.teknisk.andelPortrett * 100)} % portrett${ai.teknisk.andelPortrett >= 0.8 ? ' (tyder på mobilbilder)' : ''}` : ''}
                    </p>
                  )}
                  {(ai.funn || []).length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {ai.funn.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-[11.5px] leading-snug text-[#57534e]">
                          <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#8b5cf6]" />{f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {ai.salgsvinkel && (
                    <div className="mt-3 rounded-lg bg-[#f4f0fb] px-3.5 py-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#8b5cf6]">Anbefalt salgsvinkel · stylingpotensial {ai.stylingPotensial}</p>
                      <p className="mt-1 text-[12px] leading-relaxed text-[#44403c]">{ai.salgsvinkel}</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Økonomi og tilbud */}
            <section className="rounded-xl border border-black/[0.06] p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Økonomi og tilbud</p>
              {valgt.analyse?.grunnlag?.snittLeie ? (
                <p className="mt-1.5 text-[11.5px] text-[#a8a29a]">
                  Porteføljen vår: snittleie {kr(valgt.analyse.grunnlag.snittLeie)} ({valgt.analyse.grunnlag.antallILeide} utleide)
                  {valgt.analyse.grunnlag.snittSone ? ` · sone ${valgt.analyse.grunnlag.sone}: ${kr(valgt.analyse.grunnlag.snittSone)}` : ''}
                </p>
              ) : null}
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Anbefalt leie (kr/mnd)</span>
                  <input type="number" value={valgt.analyse?.anbefaltLeie ?? ''} data-testid="radar-anbefalt-input"
                    onChange={(e) => settLead(valgt.id, (x) => ({ ...x, analyse: { ...x.analyse, anbefaltLeie: Number(e.target.value) } }))}
                    onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: Number(e.target.value), honorarPct: valgt.analyse?.honorarPct } })}
                    className="h-9 w-full rounded-lg border border-black/[0.08] px-2.5 text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/50" />
                </label>
                <label className="block">
                  <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Honorar (% eks. mva)</span>
                  <input type="number" min="4" max="15" step="0.5" value={valgt.analyse?.honorarPct ?? 8} data-testid="radar-honorar-input"
                    onChange={(e) => settLead(valgt.id, (x) => ({ ...x, analyse: { ...x.analyse, honorarPct: Number(e.target.value) } }))}
                    onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: valgt.analyse?.anbefaltLeie, honorarPct: Number(e.target.value) } })}
                    className="h-9 w-full rounded-lg border border-black/[0.08] px-2.5 text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/50" />
                </label>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-[#fafaf8] px-3.5 py-2.5 text-[11.5px] tabular-nums">
                <span className="text-[#78716c]">Honorar: <b className="text-[#6d28d9]">{kr(rs.honorar)}/mnd</b></span>
                <span className="text-[#78716c]">Netto til eier: <b className="text-[#1f7a45]">{kr(rs.netto)}/mnd</b></span>
                {rs.gevinst != null && (
                  <span className="text-[#78716c]">vs. i dag: <b style={{ color: rs.gevinst >= 0 ? '#1f7a45' : '#c2413b' }}>{rs.gevinst >= 0 ? '+' : '−'}{kr(Math.abs(rs.gevinst))}/mnd</b></span>
                )}
              </div>
            </section>

            {/* FINN-melding */}
            {ai && (
              <section className="rounded-xl border border-black/[0.06] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="mr-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><MessageSquare className="h-3.5 w-3.5" /> FINN-melding (utkast)</p>
                  <button onClick={() => kopierMelding(valgt)} data-testid="radar-kopier-melding"
                    className="flex items-center gap-1 rounded-lg bg-[#f4f0fb] px-2.5 py-1.5 text-[11px] font-bold text-[#6d28d9] transition-colors hover:bg-[#ece4f9]">
                    {meldingKopiert ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {meldingKopiert ? 'Kopiert!' : 'Kopier med lenke'}
                  </button>
                </div>
                <textarea value={ai.finnMelding || ''} rows={4} data-testid="radar-finnmelding"
                  onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, finnMelding: e.target.value } }))}
                  onBlur={(e) => oppdater(valgt.id, { finnMelding: e.target.value }, true)}
                  className="mt-2.5 w-full resize-none rounded-lg border border-black/[0.08] px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#8b5cf6]/50" />
                <p className="mt-1 text-[10.5px] text-[#b8b2a9]">{'{LENKE}'} byttes automatisk med tilbudslenken når du kopierer.</p>
              </section>
            )}

            {/* Tilbudsside */}
            <section className="rounded-xl border border-black/[0.06] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="mr-auto text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Tilbudsside til huseier</p>
                {(valgt.aapninger || 0) > 0 && <span className="flex items-center gap-1 text-[11px] tabular-nums text-[#0e7490]"><Eye className="h-3.5 w-3.5" /> Åpnet {valgt.aapninger}×{valgt.sistAapnet ? ` · ${naarSist(valgt.sistAapnet)}` : ''}</span>}
              </div>
              <div className="mt-2.5 flex gap-2">
                <button onClick={() => kopierLenke(valgt)} data-testid="radar-kopier-lenke" className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3 text-[12.5px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.98]">
                  {kopiert ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {kopiert ? 'Kopiert!' : 'Kopier tilbudslenke'}
                </button>
                <a href={`/tilbud/${valgt.tilbudSlug}`} target="_blank" rel="noreferrer" data-testid="radar-aapne-tilbud" className="flex h-9 items-center gap-1.5 rounded-lg bg-[#f4f0fb] px-3 text-[12.5px] font-semibold text-[#6d28d9] transition-all hover:bg-[#ece4f9]">
                  Åpne <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {ai && (
                <div className="mt-3 space-y-2.5">
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Personlig intro (vises øverst på tilbudet)</span>
                    <textarea value={ai.tilbudTekst?.heroIntro || ''} rows={2} data-testid="radar-hero-intro"
                      onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, tilbudTekst: { ...x.ai.tilbudTekst, heroIntro: e.target.value } } }))}
                      onBlur={(e) => oppdater(valgt.id, { tilbudTekst: { heroIntro: e.target.value } }, true)}
                      className="w-full resize-none rounded-lg border border-black/[0.08] px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#8b5cf6]/50" />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">«Potensialet vi ser» (vises før regnestykket)</span>
                    <textarea value={ai.tilbudTekst?.potensialTekst || ''} rows={3} data-testid="radar-potensial-tekst"
                      onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, tilbudTekst: { ...x.ai.tilbudTekst, potensialTekst: e.target.value } } }))}
                      onBlur={(e) => oppdater(valgt.id, { tilbudTekst: { potensialTekst: e.target.value } }, true)}
                      className="w-full resize-none rounded-lg border border-black/[0.08] px-3 py-2 text-[12.5px] leading-relaxed outline-none focus:border-[#8b5cf6]/50" />
                  </label>
                  <p className="text-[10.5px] text-[#b8b2a9]">Tomme felter → tilbudssiden bruker standardteksten.</p>
                </div>
              )}
              <p className="mt-2 text-[10.5px] text-[#b8b2a9]">Send lenken via FINN-meldingen på annonsen{valgt.kontaktTlf ? ` — eller ring ${valgt.kontaktTlf}` : ''}. Ikke uanmodet e-post/SMS (mfl. §15).</p>
              {(valgt.kontaktLogg || []).length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {valgt.kontaktLogg.map((kx, i) => (
                    <p key={i} className="flex items-start gap-1.5 rounded-lg bg-[#e9f6f9] px-3 py-2 text-[11.5px] text-[#0e7490]">
                      <MessageSquare className="mt-[1px] h-3.5 w-3.5 shrink-0" />
                      <span><b>{kx.navn}</b> ({kx.telefon}) — {kx.melding || 'ba om å bli ringt'} · {naarSist(kx.at)}</span>
                    </p>
                  ))}
                </div>
              )}
            </section>

            {/* Alle bilder + styling */}
            {galleri.length > 0 && (
              <section className="rounded-xl border border-black/[0.06] p-4">
                <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><Wand2 className="h-3.5 w-3.5" /> Alle bilder ({galleri.length})</p>
                <p className="mt-1.5 text-[10.5px] text-[#b8b2a9]">Klikk for fullskjerm · tryllestaven AI-styler originalbilder (~30–60 sek, maks 6).</p>
                <div className="mt-2.5 grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                  {galleri.map((b, i) => (
                    <div key={b.url} className="group relative cursor-pointer overflow-hidden rounded-lg" onClick={() => setLightbox({ idx: i })} data-testid="radar-galleri-bilde" role="button" tabIndex={0}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={b.url} alt="" className="block aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.04]" />
                      {b.ai ? (
                        <span className="absolute left-1 top-1 rounded bg-[#8b5cf6]/90 px-1.5 py-0.5 text-[8.5px] font-bold uppercase tracking-wide text-white">AI</span>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); stylBilde(valgt, b.kilde); }} disabled={!!styler} data-testid="radar-styl-bilde" title="Styl dette bildet med AI"
                          className="absolute bottom-1 right-1 rounded-md bg-black/55 p-1.5 text-white opacity-0 transition-opacity hover:bg-[#8b5cf6] group-hover:opacity-100 disabled:opacity-40">
                          {styler === b.kilde ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {styler === b.kilde && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></span>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Notat */}
            <section>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Notat</p>
              <textarea value={valgt.notat || ''} rows={2} data-testid="radar-notat"
                onChange={(e) => settLead(valgt.id, (x) => ({ ...x, notat: e.target.value }))}
                onBlur={(e) => oppdater(valgt.id, { notat: e.target.value })}
                placeholder="Ringt 14/2, svarte ikke — prøver igjen torsdag…"
                className="w-full resize-none rounded-lg border border-black/[0.08] px-3 py-2 text-[12.5px] outline-none placeholder:text-[#ccc] focus:border-[#8b5cf6]/50" />
            </section>
          </div>
        </div>

        {/* Panelfot */}
        <div className="flex items-center gap-2 border-t border-black/[0.05] bg-[#fcfcfb] px-5 py-3 sm:px-6">
          {!sletteBekreft ? (
            <button onClick={() => setSletteBekreft(true)} data-testid="radar-slett" className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-semibold text-[#c9c4bd] transition-colors hover:bg-[#fdf0ef] hover:text-[#c2413b]">
            <Trash2 className="h-3.5 w-3.5" /> Slett lead
            </button>
          ) : (
            <span className="flex items-center gap-1.5">
              <button onClick={() => slett(valgt.id)} data-testid="radar-slett-bekreft" className="rounded-lg bg-[#fdf0ef] px-3 py-2 text-[12px] font-bold text-[#c2413b]">Ja, slett</button>
              <button onClick={() => setSletteBekreft(false)} className="rounded-lg px-2 py-2 text-[12px] font-semibold text-[#999]">Avbryt</button>
            </span>
          )}
          <p className="ml-auto text-[10.5px] text-[#b8b2a9]">Hentet {naarSist(valgt.createdAt)}</p>
        </div>
      </div>
    );
  })();

  /* ────────── Render ────────── */
  return (
    <div className="mx-auto max-w-[1500px]" data-testid="salgsradar-modul">
      {/* Innliming */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><Radar className="h-4 w-4 text-[#8b5cf6]" /></span>
            <input value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') hentAnnonse(); }}
              placeholder="Lim inn FINN-leieannonse — f.eks. https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
              data-testid="radar-url-input"
              className="h-10 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-3 text-[13px] outline-none transition-all placeholder:text-[#c9c4bd] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15" />
          </div>
          <button onClick={hentAnnonse} disabled={henter || !url.trim()} data-testid="radar-hent-btn"
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40">
            {henter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Hent og analyser
          </button>
        </div>
      </div>

      {feil && <p className="mt-3 rounded-lg bg-[#fdf0ef] px-3.5 py-2.5 text-[12.5px] text-[#c2413b]" data-testid="radar-feil">{feil}</p>}

      {/* Verktøylinje / bulk-linje */}
      {utvalg.size === 0 ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c9c4bd]" />
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk adresse…" data-testid="radar-sok"
              className="h-8 w-[150px] rounded-full border border-black/[0.06] bg-white pl-8 pr-3 text-[12px] outline-none transition-all placeholder:text-[#c9c4bd] focus:w-[190px] focus:border-[#8b5cf6]/40 sm:w-[170px]" />
          </span>
          {[{ k: 'alle', l: 'Alle' }, ...STATUSER].map((s) => (
            <button key={s.k} onClick={() => setFilter(s.k)} data-testid={`radar-filter-${s.k}`}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all ${filter === s.k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#78716c] shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:text-[#333]'}`}>
              {s.l} <span className={`tabular-nums ${filter === s.k ? 'text-white/60' : 'text-[#c9c4bd]'}`}>{antall[s.k] || 0}</span>
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5">
            <span className="flex overflow-hidden rounded-lg border border-black/[0.07] bg-white">
              <button onClick={() => setVisning('liste')} data-testid="radar-visning-liste" title="Listevisning"
                className={`flex h-8 w-9 items-center justify-center transition-colors ${visning === 'liste' ? 'bg-[#0a0a0a] text-white' : 'text-[#a8a29a] hover:text-[#333]'}`}>
                <List className="h-4 w-4" />
              </button>
              <button onClick={() => setVisning('tabell')} data-testid="radar-visning-tabell" title="Tabellvisning — alle AI-delscorer"
                className={`flex h-8 w-9 items-center justify-center transition-colors ${visning === 'tabell' ? 'bg-[#0a0a0a] text-white' : 'text-[#a8a29a] hover:text-[#333]'}`}>
                <Table2 className="h-4 w-4" />
              </button>
            </span>
            <select value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'desc' })} data-testid="radar-sort"
              className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] font-semibold text-[#57534e] outline-none focus:border-[#8b5cf6]/40">
              <option value="potensial">Høyest potensial</option>
              <option value="kvalitet">Annonsekvalitet</option>
              <option value="nyeste">Nyeste først</option>
              <option value="pris">Høyest leie</option>
            </select>
          </span>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-[#0a0a0a] px-4 py-2.5 text-white">
          <span className="text-[12.5px] font-bold tabular-nums" style={heading}>{utvalg.size} valgt</span>
          <button onClick={() => setUtvalg(new Set(sortert.map((l) => l.id)))} data-testid="radar-velg-alle"
            className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            Velg alle ({sortert.length})
          </button>
          <span className="ml-auto flex items-center gap-1.5">
            {!bulkBekreft ? (
              <button onClick={() => setBulkBekreft(true)} data-testid="radar-bulk-slett"
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-[12px] font-bold text-[#ff9d95] transition-colors hover:bg-white/15">
                <Trash2 className="h-3.5 w-3.5" /> Slett valgte
              </button>
            ) : (
              <button onClick={bulkSlett} disabled={bulkSletter} data-testid="radar-bulk-slett-bekreft"
                className="flex items-center gap-1.5 rounded-lg bg-[#c2413b] px-3 py-1.5 text-[12px] font-bold text-white transition-all hover:bg-[#a93833] disabled:opacity-60">
                {bulkSletter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Ja, slett {utvalg.size} leads
              </button>
            )}
            <button onClick={() => { setUtvalg(new Set()); setBulkBekreft(false); }} data-testid="radar-velg-avbryt"
              className="rounded-lg px-2.5 py-1.5 text-[12px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              Avbryt
            </button>
          </span>
        </div>
      )}

      {/* Innhold: liste/tabell + ev. splitt-detalj */}
      {laster ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>
      ) : sortert.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white px-5 py-8 text-center text-[13px] text-[#b3ada3] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {leads.length === 0 ? 'Lim inn din første FINN-annonse over — analysen tar noen sekunder.' : 'Ingen leads matcher søket/filteret.'}
        </p>
      ) : (
        <div className="mt-3 flex items-start gap-3">
          {/* Venstre kolonne: liste eller tabell */}
          <div className={`min-w-0 ${splitt ? 'w-[320px] shrink-0 xl:w-[360px]' : 'flex-1'}`}>
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
                      className={`relative flex w-full cursor-pointer items-center gap-2.5 border-b border-black/[0.04] px-3 py-3 text-left transition-colors last:border-0 sm:gap-3 sm:px-4 ${aktiv ? 'bg-[#f4f0fb]/70' : erValgt ? 'bg-[#f4f0fb]/40' : 'hover:bg-[#fcfcfb]'}`}>
                      {aktiv && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#8b5cf6]" />}
                      <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label={erValgt ? 'Fjern markering' : 'Marker lead'}
                        className={`shrink-0 rounded-md p-1 transition-colors ${erValgt ? 'text-[#8b5cf6]' : 'text-[#ddd8d0] hover:text-[#a8a29a]'}`}>
                        {erValgt ? <CheckSquare className="h-[17px] w-[17px]" /> : <Square className="h-[17px] w-[17px]" />}
                      </button>
                      {(l.bilder || [])[0]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={l.bilder[0]} alt="" className={`shrink-0 rounded-lg object-cover ${splitt ? 'h-10 w-14' : 'h-12 w-[68px]'}`} />
                        : <span className={`flex shrink-0 items-center justify-center rounded-lg bg-[#f4f2ee] ${splitt ? 'h-10 w-14' : 'h-12 w-[68px]'}`}><Home className="h-4 w-4 text-[#c9c4bd]" /></span>}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-semibold text-[#1c1917]">{l.adresse || l.tittel}</span>
                          {l.kilde === 'agent' && !splitt && (
                            <span className="shrink-0 rounded bg-[#f1ebfc] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#6d28d9]" title="Matet inn av overvåkningsagenten">Agent</span>
                          )}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] tabular-nums text-[#a8a29a]">
                          {kr(l.pris)}/mnd{!splitt && l.m2 ? ` · ${l.m2} m²` : ''}{!splitt && l.soverom ? ` · ${l.soverom} sov` : ''}
                          {!splitt ? ` · honorar ${kr(rs.honorar)}/mnd` : ''}
                        </span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.farge }} title={st.l} />
                          <span className="text-[10px] font-semibold text-[#a8a29a]">{st.l}</span>
                          {(l.stylet || []).length > 0 && <Wand2 className="h-3 w-3 text-[#8b5cf6]" title={`${l.stylet.length} AI-stylede bilder`} />}
                          {(l.aapninger || 0) > 0 && <span className="flex items-center gap-0.5 text-[10px] tabular-nums text-[#0e7490]" title={`Tilbudssiden åpnet ${l.aapninger} ganger`}><Eye className="h-3 w-3" />{l.aapninger}</span>}
                          {l.kilde === 'agent' && splitt && <span className="rounded bg-[#f1ebfc] px-1 py-0.5 text-[8px] font-bold uppercase text-[#6d28d9]">Agent</span>}
                        </span>
                      </span>
                      <PotensialBadge p={l.potensial} id={l.id} />
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Tabellvisning — alle AI-delscorer som kolonner */
              <div className="overflow-x-auto rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]" data-testid="radar-tabell">
                <table className="w-full min-w-[1080px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-black/[0.06]">
                      <th className="w-9 px-3 py-2.5" />
                      <th className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Bolig</th>
                      <th className="px-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Status</th>
                      <th className="cursor-pointer px-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('potensial')} data-testid="radar-tabell-sort-potensial">
                        <span className="flex items-center gap-0.5">Potensial <SortPil k="potensial" /></span>
                      </th>
                      <th className="cursor-pointer px-2 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('kvalitet')}>
                        <span className="flex items-center gap-0.5">Kvalitet <SortPil k="kvalitet" /></span>
                      </th>
                      {DEL_ETIKETTER.map(([k, , kort]) => (
                        <th key={k} className="px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]" title={DEL_ETIKETTER.find((d) => d[0] === k)?.[1]}>{kort}</th>
                      ))}
                      <th className="cursor-pointer px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('pris')}>
                        <span className="flex items-center justify-end gap-0.5">Leie <SortPil k="pris" /></span>
                      </th>
                      <th className="px-2 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Anbefalt</th>
                      <th className="cursor-pointer px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-[#57534e]" onClick={() => sorter('aapnet')}>
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
                          <td className="px-3 py-2">
                            <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label="Marker"
                              className={`rounded-md p-0.5 transition-colors ${erValgt ? 'text-[#8b5cf6]' : 'text-[#ddd8d0] hover:text-[#a8a29a]'}`}>
                              {erValgt ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                            </button>
                          </td>
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-2">
                              {(l.bilder || [])[0]
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={l.bilder[0]} alt="" className="h-8 w-11 shrink-0 rounded-md object-cover" />
                                : <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-md bg-[#f4f2ee]"><Home className="h-3.5 w-3.5 text-[#c9c4bd]" /></span>}
                              <span className="min-w-0">
                                <span className="block max-w-[190px] truncate text-[12.5px] font-semibold text-[#1c1917]">{l.adresse || l.tittel}</span>
                                <span className="flex items-center gap-1 text-[10px] text-[#b8b2a9]">
                                  {l.m2 ? `${l.m2} m²` : ''}{l.soverom ? ` · ${l.soverom} sov` : ''}
                                  {l.kilde === 'agent' && <span className="rounded bg-[#f1ebfc] px-1 py-px text-[8px] font-bold uppercase text-[#6d28d9]">Agent</span>}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: st.farge, background: st.bg }}>{st.l}</span></td>
                          <td className="px-2 py-2"><PotensialBadge p={l.potensial} id={l.id} /></td>
                          <td className="px-2 py-2 text-[12px] font-bold tabular-nums" style={{ ...heading, color: l.potensial?.forelopig ? '#b8b2a9' : '#44403c' }}>
                            {l.potensial?.forelopig ? `~${l.potensial.annonseScore}` : l.potensial?.annonseScore}
                          </td>
                          {DEL_ETIKETTER.map(([k]) => (
                            <td key={k} className="px-2 py-2 text-center text-[11.5px] font-semibold tabular-nums" style={{ ...heading, color: delFarge(d?.[k]) }}>
                              {d?.[k] ?? '–'}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-right text-[12px] font-semibold tabular-nums text-[#44403c]" style={heading}>{tall(l.pris)}</td>
                          <td className="px-2 py-2 text-right text-[12px] tabular-nums text-[#78716c]" style={heading}>{l.analyse?.anbefaltLeie ? tall(l.analyse.anbefaltLeie) : '–'}</td>
                          <td className="px-3 py-2 text-right text-[12px] tabular-nums text-[#0e7490]">{l.aapninger || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Høyre kolonne: detaljpanel (splittvisning — desktop, listemodus) */}
          {splitt && (
            <div className="sticky top-4 min-w-0 flex-1 overflow-hidden rounded-2xl bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)]" style={{ height: 'calc(100vh - 120px)', minHeight: 480 }}>
              {panel}
            </div>
          )}
        </div>
      )}

      {/* Detaljpanel som fullskjerm (mobil) eller høyre-overlay (tabellmodus desktop) */}
      {valgt && !splitt && (
        <div className="fixed inset-0 z-[125] flex justify-end">
          <div className="absolute inset-0 bg-[#0a0a0a]/40" onClick={() => setValgtId(null)} />
          <div className="dh-pop relative h-full w-full overflow-hidden bg-white shadow-2xl lg:w-[620px]">
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
