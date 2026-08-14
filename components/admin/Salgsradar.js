'use client';

/* ═══════════ SALGSRADAR — FINN-annonse → tilbud til huseier ═══════════
   Fase 1 (semi-automatisk og lovlig):
   1. Lim inn FINN-leieannonse → systemet parser alt (pris, m², bilder, tlf)
   2. Prisanalyse mot DigiHomes egen portefølje — juster anbefalt leie/honorar
   3. AI-styl annonsebilder (Nano Banana) — «slik kan annonsen se ut hos oss»
   4. Del den genererte tilbudssiden (/tilbud/<slug>) via FINN-melding/telefon
   5. Pipeline: ny → analysert → kontaktet → dialog → vunnet/tapt
   Åpninger av tilbudssiden og svar fra huseier spores automatisk. */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Loader2, Radar, ExternalLink, Sparkles, Trash2, X, Copy, Check, Eye, Phone,
  BedDouble, Ruler, Home, Wand2, MessageSquare,
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

const naarSist = (iso) => {
  if (!iso) return '';
  const d = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (d < 60) return `${Math.max(1, d)} min siden`;
  if (d < 1440) return `${Math.round(d / 60)} t siden`;
  return `${Math.round(d / 1440)} d siden`;
};

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
  const [valgtId, setValgtId] = useState(null);
  const [styler, setStyler] = useState(null); // bildeUrl under styling
  const [stil, setStil] = useState('nordisk');
  const [kopiert, setKopiert] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);

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

  const oppdater = async (id, patch) => {
    try {
      await api('lead', { method: 'PUT', body: { id, ...patch } });
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, analyse: patch.analyse ? { ...l.analyse, ...patch.analyse } : l.analyse } : l)));
    } catch (e) { setFeil(e.message); }
  };

  const slett = async (id) => {
    try {
      await api(`lead?id=${id}`, { method: 'DELETE' });
      setValgtId(null); setSletteBekreft(false);
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (e) { setFeil(e.message); }
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

  const valgt = useMemo(() => leads.find((l) => l.id === valgtId) || null, [leads, valgtId]);
  const filtrert = useMemo(() => (filter === 'alle' ? leads : leads.filter((l) => l.status === filter)), [leads, filter]);
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

  const kopierLenke = (l) => {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    navigator.clipboard?.writeText(`${base}/tilbud/${l.tilbudSlug}`).then(() => {
      setKopiert(true); setTimeout(() => setKopiert(false), 1600);
    });
  };

  const statusStil = (s) => STATUSER.find((x) => x.k === s) || STATUSER[0];

  return (
    <div className="mx-auto max-w-[1280px]" data-testid="salgsradar-modul">
      {/* Innliming */}
      <div className="rounded-2xl bg-white p-4 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f4f0fb]"><Radar className="h-4 w-4 text-[#8b5cf6]" /></span>
            <input
              value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') hentAnnonse(); }}
              placeholder="Lim inn FINN-leieannonse — f.eks. https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
              data-testid="radar-url-input"
              className="h-10 min-w-0 flex-1 rounded-lg border border-black/[0.08] bg-white px-3 text-[13px] outline-none transition-all placeholder:text-[#c9c4bd] focus:border-[#8b5cf6]/50 focus:ring-2 focus:ring-[#8b5cf6]/15"
            />
          </div>
          <button
            onClick={hentAnnonse} disabled={henter || !url.trim()} data-testid="radar-hent-btn"
            className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-4 text-[13px] font-semibold text-white transition-all hover:bg-black/85 active:scale-[0.97] disabled:opacity-40"
          >
            {henter ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Hent og analyser
          </button>
        </div>
        <p className="mt-2 pl-[46px] text-[11px] text-[#b8b2a9]">Annonsen parses automatisk: pris, størrelse, bilder og kontakt. Utsendelse skjer manuelt via FINN-melding eller telefon (markedsføringsloven §15).</p>
      </div>

      {feil && <p className="mt-3 rounded-lg bg-[#fdf0ef] px-3.5 py-2.5 text-[12.5px] text-[#c2413b]" data-testid="radar-feil">{feil}</p>}

      {/* Statusfilter */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {[{ k: 'alle', l: 'Alle', farge: '#57534e', bg: '#fff' }, ...STATUSER].map((s) => (
          <button
            key={s.k} onClick={() => setFilter(s.k)} data-testid={`radar-filter-${s.k}`}
            className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-all ${filter === s.k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#78716c] shadow-[0_1px_6px_rgba(0,0,0,0.04)] hover:text-[#333]'}`}
          >
            {s.l} <span className={`tabular-nums ${filter === s.k ? 'text-white/60' : 'text-[#c9c4bd]'}`}>{antall[s.k] || 0}</span>
          </button>
        ))}
      </div>

      {/* Lead-liste */}
      {laster ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-5 w-5 animate-spin text-[#cf97fc]" /></div>
      ) : filtrert.length === 0 ? (
        <p className="mt-6 rounded-2xl bg-white px-5 py-8 text-center text-[13px] text-[#b3ada3] shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {leads.length === 0 ? 'Lim inn din første FINN-annonse over — analysen tar noen sekunder.' : 'Ingen leads i denne statusen.'}
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
          {filtrert.map((l) => {
            const rs = regnestykke(l);
            const st = statusStil(l.status);
            return (
              <button
                key={l.id} onClick={() => { setValgtId(l.id); setSletteBekreft(false); }}
                data-testid={`radar-lead-${l.id}`}
                className="flex w-full items-center gap-3 border-b border-black/[0.04] px-3.5 py-3 text-left transition-colors last:border-0 hover:bg-[#fcfcfb] sm:px-4"
              >
                {(l.bilder || [])[0]
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={l.bilder[0]} alt="" className="h-11 w-16 shrink-0 rounded-lg object-cover" />
                  : <span className="flex h-11 w-16 shrink-0 items-center justify-center rounded-lg bg-[#f4f2ee]"><Home className="h-4 w-4 text-[#c9c4bd]" /></span>}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[#1c1917]">{l.adresse || l.tittel}</span>
                  <span className="mt-0.5 block truncate text-[11px] tabular-nums text-[#a8a29a]">
                    {kr(l.pris)}/mnd{l.m2 ? ` · ${l.m2} m²` : ''}{l.soverom ? ` · ${l.soverom} sov` : ''} · honorar {kr(rs.honorar)}/mnd
                  </span>
                </span>
                {(l.stylet || []).length > 0 && <span title={`${l.stylet.length} AI-stylede bilder`}><Wand2 className="h-3.5 w-3.5 shrink-0 text-[#8b5cf6]" /></span>}
                {(l.aapninger || 0) > 0 && (
                  <span className="hidden shrink-0 items-center gap-1 text-[11px] tabular-nums text-[#0e7490] sm:flex" title={`Tilbudssiden åpnet ${l.aapninger} ganger`}>
                    <Eye className="h-3.5 w-3.5" /> {l.aapninger}
                  </span>
                )}
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold" style={{ color: st.farge, background: st.bg }}>{st.l}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Skuff */}
      {valgt && (() => {
        const rs = regnestykke(valgt);
        return (
          <div className="fixed inset-0 z-[125] flex justify-end" data-testid="radar-skuff">
            <div className="absolute inset-0 bg-[#0a0a0a]/40 backdrop-blur-[2px]" onClick={() => setValgtId(null)} />
            <div className="dh-pop relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:w-[560px]">
              {/* Hode */}
              <div className="flex items-center gap-3 border-b border-black/[0.05] px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold" style={heading}>{valgt.adresse || valgt.tittel}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2.5 text-[11.5px] text-[#a8a29a]">
                    <span className="tabular-nums">{kr(valgt.pris)}/mnd</span>
                    {valgt.m2 ? <span className="flex items-center gap-1"><Ruler className="h-3 w-3" />{valgt.m2} m²</span> : null}
                    {valgt.soverom ? <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" />{valgt.soverom} sov</span> : null}
                    {valgt.kontaktTlf ? <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{valgt.kontaktTlf}</span> : null}
                    <a href={valgt.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3 w-3" /></a>
                  </p>
                </div>
                <button onClick={() => setValgtId(null)} data-testid="radar-skuff-lukk" className="shrink-0 rounded-lg p-2 text-[#bbb] transition-colors hover:bg-[#f3f2f0] hover:text-[#555]"><X style={{ width: 18, height: 18 }} /></button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {/* Status-pipeline */}
                <div className="flex flex-wrap gap-1.5">
                  {STATUSER.map((s) => (
                    <button
                      key={s.k} onClick={() => oppdater(valgt.id, { status: s.k })} data-testid={`radar-status-${s.k}`}
                      className="rounded-full px-2.5 py-1 text-[10.5px] font-bold transition-all"
                      style={valgt.status === s.k ? { color: '#fff', background: s.farge } : { color: s.farge, background: s.bg }}
                    >
                      {s.l}
                    </button>
                  ))}
                </div>

                {/* Analyse + regnestykke */}
                <div className="mt-4 rounded-xl border border-black/[0.06] p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Analyse og tilbud</p>
                  {valgt.analyse?.grunnlag?.snittLeie ? (
                    <p className="mt-1.5 text-[11.5px] text-[#a8a29a]">
                      Porteføljen vår: snittleie {kr(valgt.analyse.grunnlag.snittLeie)} ({valgt.analyse.grunnlag.antallILeide} utleide)
                      {valgt.analyse.grunnlag.snittSone ? ` · sone ${valgt.analyse.grunnlag.sone}: ${kr(valgt.analyse.grunnlag.snittSone)}` : ''}
                    </p>
                  ) : null}
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Anbefalt leie (kr/mnd)</span>
                      <input
                        type="number" value={valgt.analyse?.anbefaltLeie ?? ''} data-testid="radar-anbefalt-input"
                        onChange={(e) => setLeads((prev) => prev.map((x) => (x.id === valgt.id ? { ...x, analyse: { ...x.analyse, anbefaltLeie: Number(e.target.value) } } : x)))}
                        onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: Number(e.target.value), honorarPct: valgt.analyse?.honorarPct } })}
                        className="h-9 w-full rounded-lg border border-black/[0.08] px-2.5 text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/50"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Honorar (% eks. mva)</span>
                      <input
                        type="number" min="4" max="15" step="0.5" value={valgt.analyse?.honorarPct ?? 8} data-testid="radar-honorar-input"
                        onChange={(e) => setLeads((prev) => prev.map((x) => (x.id === valgt.id ? { ...x, analyse: { ...x.analyse, honorarPct: Number(e.target.value) } } : x)))}
                        onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: valgt.analyse?.anbefaltLeie, honorarPct: Number(e.target.value) } })}
                        className="h-9 w-full rounded-lg border border-black/[0.08] px-2.5 text-[13px] tabular-nums outline-none focus:border-[#8b5cf6]/50"
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-lg bg-[#fafaf8] px-3.5 py-2.5 text-[11.5px] tabular-nums">
                    <span className="text-[#78716c]">Honorar: <b className="text-[#6d28d9]">{kr(rs.honorar)}/mnd</b></span>
                    <span className="text-[#78716c]">Netto til eier: <b className="text-[#1f7a45]">{kr(rs.netto)}/mnd</b></span>
                    {rs.gevinst != null && (
                      <span className="text-[#78716c]">vs. i dag: <b style={{ color: rs.gevinst >= 0 ? '#1f7a45' : '#c2413b' }}>{rs.gevinst >= 0 ? '+' : '−'}{kr(Math.abs(rs.gevinst))}/mnd</b></span>
                    )}
                  </div>
                </div>

                {/* Tilbudsside */}
                <div className="mt-4 rounded-xl border border-black/[0.06] p-4">
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
                </div>

                {/* AI-styling */}
                <div className="mt-4 rounded-xl border border-black/[0.06] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="mr-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]"><Wand2 className="h-3.5 w-3.5" /> AI-styling av bilder</p>
                    <select value={stil} onChange={(e) => setStil(e.target.value)} data-testid="radar-stil-velger" className="h-8 rounded-lg border border-black/[0.08] bg-white px-2 text-[12px] outline-none focus:border-[#8b5cf6]/40">
                      {STIL_VALG.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
                    </select>
                  </div>
                  {(valgt.stylet || []).length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {valgt.stylet.map((s) => (
                        <div key={s.id} className="overflow-hidden rounded-lg border border-black/[0.05]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/api/tilbud/bilde?id=${s.id}`} alt="" className="block aspect-[4/3] w-full object-cover" />
                          <p className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wide text-[#8b5cf6]">AI · {STIL_VALG.find((x) => x.k === s.stil)?.l || s.stil}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 mb-1.5 text-[10.5px] text-[#b8b2a9]">Klikk et annonsebilde for å style det (~30–60 sek). Maks 6.</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(valgt.bilder || []).slice(0, 9).map((b) => (
                      <button key={b} onClick={() => stylBilde(valgt, b)} disabled={!!styler} data-testid="radar-styl-bilde" className="group relative overflow-hidden rounded-lg" title="Styl dette bildet">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={b} alt="" className="block aspect-[4/3] w-full object-cover transition-transform group-hover:scale-[1.03]" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/35">
                          {styler === b
                            ? <Loader2 className="h-5 w-5 animate-spin text-white" />
                            : <Wand2 className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notat */}
                <div className="mt-4">
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Notat</p>
                  <textarea
                    value={valgt.notat || ''} rows={2} data-testid="radar-notat"
                    onChange={(e) => setLeads((prev) => prev.map((x) => (x.id === valgt.id ? { ...x, notat: e.target.value } : x)))}
                    onBlur={(e) => oppdater(valgt.id, { notat: e.target.value })}
                    placeholder="Ringt 14/2, svarte ikke — prøver igjen torsdag…"
                    className="w-full resize-none rounded-lg border border-black/[0.08] px-3 py-2 text-[12.5px] outline-none placeholder:text-[#ccc] focus:border-[#8b5cf6]/50"
                  />
                </div>
              </div>

              {/* Fot */}
              <div className="flex items-center gap-2 border-t border-black/[0.05] bg-[#fcfcfb] px-5 py-3">
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
          </div>
        );
      })()}
    </div>
  );
}
