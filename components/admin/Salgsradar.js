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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Loader2, Radar, ExternalLink, Sparkles, Trash2, X, Copy, Check, Eye, Phone,
  BedDouble, Ruler, Home, Wand2, MessageSquare, ChevronLeft, ChevronRight,
  RefreshCw, Square, CheckSquare, Search, List, Table2, ArrowLeft, ArrowUp, ArrowDown,
  Maximize2, Minimize2, Images, Banknote, Globe, StickyNote, Plus,
} from 'lucide-react';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const kr = (v) => `${tall(v)}\u202Fkr`;

/* ── DigiHome-designspråk (samme tokens som Leieforhold/Datarom) ─────────────
   Varm blekk #1c1917, gradient-primærknapp, ghost-knapp med hårfin ramme,
   små radier (6-12px), status-prikker i stedet for fargede piller. */
const KNAPP_GHOST = 'flex h-8 items-center gap-1.5 rounded-[7px] border border-black/[0.08] bg-white px-2.5 text-[12px] font-medium text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917] disabled:opacity-50';
const KNAPP_PRIMAER = 'flex h-8 items-center gap-1.5 rounded-[7px] bg-gradient-to-b from-[#2b2825] to-[#131110] px-3.5 text-[12.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(28,25,23,0.2)] transition-all hover:from-[#211f1c] hover:to-[#0a0908] active:scale-[0.98] disabled:opacity-40';
const KORT = 'rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_12px_32px_-16px_rgba(28,25,23,0.10)]';

const STATUSER = [
  { k: 'ny', l: 'Ny', farge: '#78716c', bg: '#f4f2ee' },
  { k: 'analysert', l: 'Analysert', farge: '#6d28d9', bg: '#f4f0fb' },
  { k: 'kontaktet', l: 'Kontaktet', farge: '#9a6b1c', bg: '#fdf3e0' },
  { k: 'dialog', l: 'Dialog', farge: '#0e7490', bg: '#e9f6f9' },
  { k: 'vunnet', l: 'Vunnet', farge: '#1f7a45', bg: '#eef6f0' },
  { k: 'tapt', l: 'Tapt', farge: '#c2413b', bg: '#fdf0ef' },
];
const STIL_VALG = [
  { k: 'optimal', l: 'FINN-optimalisering' },
  { k: 'lysloft', l: 'Lysløft (tomt rom)' },
  { k: 'nordisk', l: 'Møblering — nordisk' },
  { k: 'moderne', l: 'Møblering — moderne' },
  { k: 'varm', l: 'Møblering — varm' },
];
const DEL_ETIKETTER = [
  ['visuell', 'Visuelt inntrykk', 'Visuell'],
  ['opplosning', 'Oppløsning', 'Oppl.'],
  ['orientering', 'Bildeformat', 'Format'],
  ['antall', 'Bildeantall', 'Antall'],
  ['tekst', 'Tekstkvalitet', 'Tekst'],
  ['hygiene', 'Datahygiene', 'Data'],
];

// Norsk telefonformat: 8 siffer → «XXX XX XXX», ellers uendret
const fmtTlf = (t) => {
  const s = String(t || '').replace(/\s/g, '');
  const n = s.replace(/^\+47/, '');
  if (/^\d{8}$/.test(n)) return `${n.slice(0, 3)} ${n.slice(3, 5)} ${n.slice(5)}`;
  return s;
};

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

/* ── ScoreRing: sirkulær 0-100-indikator (Airbnb-aktig ring med tall i midten).
   Brukes for potensial/kvalitet i liste, tabell og detaljpanel. ───────────── */
function ScoreRing({ verdi, maks = 100, forelopig = false, storrelse = 40, strek = 3.5, farge, id, tittel }) {
  const v = Math.max(0, Math.min(maks, Number(verdi) || 0));
  const pct = maks > 0 ? v / maks : 0;
  const r = (storrelse - strek) / 2;
  const omkrets = 2 * Math.PI * r;
  const c = farge || scoreFarge(pct * 100).c;
  const fontPx = storrelse >= 56 ? 17 : storrelse >= 40 ? 12.5 : 10.5;
  return (
    <span data-testid={id} title={tittel}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: storrelse, height: storrelse }}>
      <svg width={storrelse} height={storrelse} viewBox={`0 0 ${storrelse} ${storrelse}`} className="-rotate-90">
        <circle cx={storrelse / 2} cy={storrelse / 2} r={r} fill="none" stroke="#eeece7" strokeWidth={strek} />
        <circle cx={storrelse / 2} cy={storrelse / 2} r={r} fill="none" stroke={c} strokeWidth={strek} strokeLinecap="round"
          strokeDasharray={omkrets} strokeDashoffset={omkrets * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
      </svg>
      <span className="absolute font-bold tabular-nums leading-none" style={{ ...heading, fontSize: fontPx, color: forelopig ? '#a8a29a' : '#1c1917' }}>
        {forelopig ? `~${v}` : v}
      </span>
    </span>
  );
}

function PotensialBadge({ p, id, stor = false }) {
  if (!p) return null;
  return (
    <ScoreRing
      verdi={p.score}
      forelopig={p.forelopig}
      storrelse={stor ? 56 : 40}
      strek={stor ? 4.5 : 3.5}
      id={id ? `radar-potensial-${id}` : undefined}
      tittel={p.forelopig ? `Foreløpig potensial ${p.score}/100 — kjør AI-analyse for full score` : `Potensial ${p.score}/100 · annonsekvalitet ${p.annonseScore}/100`}
    />
  );
}

/* Statusprikk — DigiHome-språket bruker prikker, ikke fargede piller */
const StatusPrikk = ({ s, tekst = true }) => (
  <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6f6a61]">
    <span className="h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: s.farge, boxShadow: `0 0 0 3px ${s.bg}` }} />
    {tekst && s.l}
  </span>
);

/* Siste priskutt på leaden (agenten re-sender ved prisendring) */
const sisteKutt = (l) => {
  const k = (l.prisHistorikk || []).filter((h) => Number(h.til) < Number(h.fra)).slice(-1)[0];
  if (!k) return null;
  return { ...k, pct: Math.round(((k.fra - k.til) / k.fra) * 100), fersk: Date.now() - new Date(k.at).getTime() < 14 * 86400000 };
};

/* Neste steg-veiviser — Airbnb-prinsipp: vis alltid brukeren hva som er den
   naturlige neste handlingen, med ett-klikks CTA-er i detaljpanelet. */
const nesteSteg = (l) => {
  if (l.auto && ['analyserer', 'styler'].includes(l.auto.status)) return null;
  if (l.annonseAktiv === false && !['vunnet', 'tapt'].includes(l.status)) {
    return { t: 'Annonsen er tatt av FINN — utleid eller trukket? Avklar og lukk leaden', c: '#8a857c' };
  }
  if (['analysert', 'kontaktet', 'dialog'].includes(l.status) && (l.aapninger || 0) > 0 && l.status !== 'dialog') {
    return { t: `Huseier har åpnet tilbudet${(l.aapninger || 0) > 1 ? ` ${l.aapninger}×` : ''} — følg opp nå`, c: '#0e7490', varm: true };
  }
  const kutt = sisteKutt(l);
  if (kutt?.fersk && ['ny', 'analysert', 'kontaktet'].includes(l.status)) {
    return { t: `Priskutt −${kutt.pct} % — motivert utleier, ta kontakt nå`, c: '#0e7490', varm: true };
  }
  if (l.status === 'ny') return { t: 'Kjør AI-analyse for score og tilbudstekst', c: '#6d28d9' };
  if (l.status === 'analysert') return { t: 'Klar til kontakt — send FINN-melding', c: '#6d28d9' };
  if (l.status === 'kontaktet') return { t: 'Kontaktet — send tilbudet, eller merk som ikke aktuelt', c: '#8a857c' };
  if (l.status === 'dialog') return { t: 'I dialog — avklar detaljene og vinn avtalen', c: '#1f7a45' };
  return null;
};

/* Flatt DigiHome-seksjonshode: liten stille etikett, ikke ikon-chips */
const SekHode = ({ ikon: Ikon, tittel, hoyre }) => (
  <div className="flex flex-wrap items-center gap-2">
    {Ikon && <Ikon className="h-[14px] w-[14px] text-[#a8a29a]" />}
    <h3 className="text-[13px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{tittel}</h3>
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

/* ── SammenlignModal: før/etter-slider for AI-stylede bilder (Airbnb-nivå).
   Dra eller trykk i bildet for å flytte linjen — piltaster bytter bilde.
   Boksen låses til originalbildets aspektforhold slik at original og AI
   alltid ligger i register (ingen letterbox-hopp). ── */
function SammenlignModal({ par, idx, setIdx, onClose }) {
  const [pos, setPos] = useState(55);
  const [drar, setDrar] = useState(false);
  const [ar, setAr] = useState(1.5); // originalbildets bredde/høyde
  const boksRef = useRef(null);
  const nedPkt = useRef(null);
  useEffect(() => { setPos(55); }, [idx]);
  useEffect(() => {
    const tast = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => (i + 1) % par.length);
      if (e.key === 'ArrowLeft') setIdx((i) => (i - 1 + par.length) % par.length);
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [par.length, setIdx, onClose]);
  const p = par[idx];
  if (!p) return null;
  const dra = (clientX) => {
    const r = boksRef.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100)));
  };
  const myk = drar ? 'none' : 'clip-path .22s ease, left .22s ease';
  return (
    <div className="fixed inset-0 z-[210] flex flex-col bg-[#131110]/95" data-testid="radar-sammenlign" onClick={onClose}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5">
          <span className="text-[13px] font-bold text-white" style={heading}>Original vs AI</span>
          <span className="rounded-[5px] bg-white/10 px-2 py-0.5 text-[10.5px] font-medium text-white/70">{STIL_VALG.find((s) => s.k === p.stil)?.l || p.stil}</span>
          {par.length > 1 && <span className="text-[11.5px] tabular-nums text-white/40">{idx + 1} / {par.length}</span>}
        </div>
        <button onClick={onClose} data-testid="radar-sammenlign-lukk" className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"><X style={{ width: 20, height: 20 }} /></button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-16" onClick={(e) => e.stopPropagation()}>
        {par.length > 1 && (
          <button onClick={() => setIdx((i) => (i - 1 + par.length) % par.length)} data-testid="radar-sammenlign-forrige" aria-label="Forrige"
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-all hover:bg-white/20 sm:left-4 sm:bg-white/10 sm:p-2.5">
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        <div ref={boksRef}
          className="relative w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-xl shadow-2xl"
          style={{ aspectRatio: String(ar), maxWidth: `min(1060px, calc((100dvh - 210px) * ${ar}))` }}
          onPointerDown={(e) => { nedPkt.current = { x: e.clientX, y: e.clientY }; setDrar(true); try { e.currentTarget.setPointerCapture(e.pointerId); } catch (e2) { /* ok */ } }}
          onPointerMove={(e) => { if (drar && nedPkt.current && (Math.abs(e.clientX - nedPkt.current.x) > 4 || nedPkt.current.flyttet)) { nedPkt.current.flyttet = true; dra(e.clientX); } }}
          onPointerUp={(e) => {
            setDrar(false);
            try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (e2) { /* ok */ }
            // Trykk uten drag → flytt linjen dit med animasjon
            if (nedPkt.current && !nedPkt.current.flyttet) dra(e.clientX);
            nedPkt.current = null;
          }}
          onPointerCancel={() => { setDrar(false); nedPkt.current = null; }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.original} alt="Original" draggable={false}
            onLoad={(e) => { const w = e.target.naturalWidth; const h = e.target.naturalHeight; if (w && h) setAr(Math.max(0.6, Math.min(2.4, w / h))); }}
            className="absolute inset-0 h-full w-full object-cover object-center" />
          <span className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)`, transition: myk }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.ai} alt="AI-forbedret" draggable={false} className="absolute inset-0 h-full w-full object-cover object-center" />
          </span>
          {/* Håndtak — stor, tydelig treffindikasjon */}
          <span className="pointer-events-none absolute inset-y-0" style={{ left: `${pos}%`, transition: myk }}>
            <span className="absolute inset-y-0 -ml-px w-[2px] bg-white/95 shadow-[0_0_10px_rgba(0,0,0,0.55)]" />
            <span className="absolute top-1/2 -ml-[21px] -mt-[21px] flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white shadow-[0_3px_14px_rgba(0,0,0,0.4)]">
              <ChevronLeft className="-mr-1 h-4 w-4 text-[#1c1917]" /><ChevronRight className="-ml-1 h-4 w-4 text-[#1c1917]" />
            </span>
          </span>
          <span className="pointer-events-none absolute left-3 top-3 rounded-[5px] bg-[#8b5cf6]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ opacity: pos > 12 ? 1 : 0, transition: 'opacity .2s' }}>AI-forbedret</span>
          <span className="pointer-events-none absolute right-3 top-3 rounded-[5px] bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ opacity: pos < 88 ? 1 : 0, transition: 'opacity .2s' }}>Original</span>
        </div>
        {par.length > 1 && (
          <button onClick={() => setIdx((i) => (i + 1) % par.length)} data-testid="radar-sammenlign-neste" aria-label="Neste"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white transition-all hover:bg-white/20 sm:right-4 sm:bg-white/10 sm:p-2.5">
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
      <p className="px-4 pb-2 text-center text-[10.5px] text-white/40 sm:text-[11.5px]">
        Dra eller trykk i bildet for å sammenligne<span className="hidden sm:inline"> — piltastene bytter bilde</span>
      </p>
      {par.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-4" onClick={(e) => e.stopPropagation()}>
          <div className="mx-auto flex w-max gap-1.5">
            {par.map((t, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={t.ai} alt="" onClick={() => setIdx(i)}
                className={`h-14 w-[78px] shrink-0 cursor-pointer rounded-md object-cover transition-all sm:h-12 sm:w-[68px] ${i === idx ? 'ring-2 ring-white' : 'opacity-40 hover:opacity-80'}`} />
            ))}
          </div>
        </div>
      )}
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
  const [ultra, setUltra] = useState(false);
  const [styler, setStyler] = useState(null);
  const [stil, setStil] = useState('optimal');
  const [kopiert, setKopiert] = useState(false);
  const [meldingKopiert, setMeldingKopiert] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);
  const [analyserer, setAnalyserer] = useState(false);
  const [utvalg, setUtvalg] = useState(() => new Set());
  const [bulkBekreft, setBulkBekreft] = useState(false);
  const [bulkSletter, setBulkSletter] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [visNy, setVisNy] = useState(false);
  const [retryStarter, setRetryStarter] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPos, setHeroPos] = useState(55); // skillelinje for inline før/etter på hero
  const heroDrag = useRef(null); // {x0, y0, laast: 'slider'|'scroll'|null, flyttet}
  const [heroDrar, setHeroDrar] = useState(false); // styrer om linjen animerer
  const [sammenlign, setSammenlign] = useState(null); // {idx} — fullskjerm før/etter-modal
  const swipeX = useRef(null); // touch-swipe i hero-galleriet
  const [lagret, setLagret] = useState(false);
  const lagretTimer = useRef(null);
  // Døde bilde-URL-er (404 fra finncdn) fanges via onError og filtreres bort
  const [dodeBilder, setDodeBilder] = useState(() => new Set());
  const merkDodBilde = useCallback((u) => {
    if (!u || String(u).startsWith('data:')) return;
    setDodeBilder((prev) => {
      if (prev.has(u)) return prev;
      const n = new Set(prev); n.add(u); return n;
    });
  }, []);
  useEffect(() => () => clearTimeout(lagretTimer.current), []);
  useEffect(() => { setHeroIdx(0); setSammenlign(null); }, [valgtId]);
  useEffect(() => { setHeroPos(55); }, [heroIdx, valgtId]);
  const settHeroPos = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    if (!r.width) return;
    setHeroPos(Math.max(3, Math.min(97, ((e.clientX - r.left) / r.width) * 100)));
  };

  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px)');
    const u = window.matchMedia('(min-width: 1680px)');
    const oppd = () => { setBred(m.matches); setUltra(u.matches); };
    oppd();
    m.addEventListener('change', oppd);
    u.addEventListener('change', oppd);
    return () => { m.removeEventListener('change', oppd); u.removeEventListener('change', oppd); };
  }, []);

  const hentLeads = useCallback(async () => {
    try { const j = await api('leads'); setLeads(j.leads || []); } catch (e) { setFeil(e.message); }
    setLaster(false);
  }, [api]);
  useEffect(() => { hentLeads(); }, [hentLeads]);

  // ── Live-polling mens automatikken kjører (analyse + bildeforbedring) ──
  // Lokale redigeringer på åpen lead bevares (notat, FINN-melding, tekster).
  const aktivAuto = useMemo(() => leads.some((l) => l.auto && ['analyserer', 'styler'].includes(l.auto.status)), [leads]);
  const valgtIdRef = useRef(null);
  useEffect(() => { valgtIdRef.current = valgtId; }, [valgtId]);
  useEffect(() => {
    if (!aktivAuto) return undefined;
    const t = setInterval(async () => {
      try {
        const j = await api('leads');
        setLeads((prev) => {
          const map = new Map(prev.map((l) => [l.id, l]));
          return (j.leads || []).map((nl) => {
            const lok = map.get(nl.id);
            if (lok && nl.id === valgtIdRef.current) {
              return {
                ...nl,
                notat: lok.notat,
                analyse: lok.analyse || nl.analyse,
                ai: nl.ai && lok.ai
                  ? { ...nl.ai, finnMelding: lok.ai.finnMelding, tilbudTekst: lok.ai.tilbudTekst }
                  : (nl.ai || lok.ai),
              };
            }
            return nl;
          });
        });
      } catch (e) { /* stille — prøver igjen */ }
    }, 5000);
    return () => clearInterval(t);
  }, [aktivAuto, api]);

  const hentAnnonse = async () => {
    if (henter || !url.trim()) return;
    setHenter(true); setFeil('');
    try {
      const j = await api('hent', { method: 'POST', body: { url: url.trim() } });
      setUrl(''); setVisNy(false);
      await hentLeads();
      setValgtId(j.lead.id);
    } catch (e) { setFeil(e.message); }
    setHenter(false);
  };

  // Prøver KUN de feilede auto-bildene på nytt — kjører i bakgrunnen på
  // serveren; polling (aktivAuto) plukker opp fremdriften.
  const autoRetry = async (id) => {
    if (retryStarter) return;
    setRetryStarter(true); setFeil('');
    try {
      await api('auto-retry', { method: 'POST', body: { leadId: id } });
      settLead(id, (l) => ({ ...l, auto: { ...(l.auto || {}), status: 'styler' } }));
    } catch (e) { setFeil(e.message); }
    setRetryStarter(false);
  };

  const oppdater = async (id, patch, behold) => {
    try {
      await api('lead', { method: 'PUT', body: { id, ...patch } });
      if (!behold) setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch, analyse: patch.analyse ? { ...l.analyse, ...patch.analyse } : l.analyse } : l)));
      // Diskret «Lagret»-kvittering (Airbnb-prinsipp: bekreft alltid handlingen)
      setLagret(true);
      clearTimeout(lagretTimer.current);
      lagretTimer.current = setTimeout(() => setLagret(false), 1400);
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
      if (sort.key === 'salgskraft') return l.ai?.salgskraft?.score || 0;
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

  // Innsiktslinje — gjør modulen målrettet: hva er i spill, hvem venter på deg
  const innsikt = useMemo(() => {
    const pipeline = leads.filter((l) => ['analysert', 'kontaktet', 'dialog'].includes(l.status));
    const honorarPipeline = pipeline.reduce((s, l) => s + (regnestykke(l).honorar || 0), 0);
    const aKontakte = leads.filter((l) => l.status === 'analysert').length;
    const harApnet = leads.filter((l) => (l.aapninger || 0) > 0 && !['vunnet', 'tapt'].includes(l.status)).length;
    const vunnetLeads = leads.filter((l) => l.status === 'vunnet');
    const honorarVunnet = vunnetLeads.reduce((s, l) => s + (regnestykke(l).honorar || 0), 0);
    return { honorarPipeline, pipeline: pipeline.length, aKontakte, harApnet, vunnet: vunnetLeads.length, honorarVunnet };
  }, [leads]); // eslint-disable-line react-hooks/exhaustive-deps

  const tilbudLenke = (l) => `${typeof window !== 'undefined' ? window.location.origin : ''}/tilbud/${l.tilbudSlug}`;
  const kopierLenke = (l) => navigator.clipboard?.writeText(tilbudLenke(l)).then(() => { setKopiert(true); setTimeout(() => setKopiert(false), 1600); });
  const kopierMelding = (l) => {
    const tekst = String(l.ai?.finnMelding || '').replace(/\{LENKE\}/g, tilbudLenke(l));
    navigator.clipboard?.writeText(tekst).then(() => { setMeldingKopiert(true); setTimeout(() => setMeldingKopiert(false), 1600); });
  };

  const galleri = useMemo(() => {
    if (!valgt) return [];
    return [
      ...(valgt.stylet || []).map((s) => ({ url: `/api/tilbud/bilde?id=${s.id}`, etikett: `AI · ${STIL_VALG.find((x) => x.k === s.stil)?.l || s.stil}`, ai: true, kilde: s.kildeUrl, stil: s.stil })),
      ...(valgt.bilder || []).filter((b) => !dodeBilder.has(b)).slice(0, 14).map((b) => ({ url: b, etikett: 'Original', ai: false, kilde: b })),
    ];
  }, [valgt, dodeBilder]);
  // AI-par til før/etter-sammenligning: AI-bilde + originalen det bygger på
  const aiPar = useMemo(() => galleri.filter((g) => g.ai && g.kilde).map((g) => ({ ai: g.url, original: g.kilde, stil: g.stil })), [galleri]);

  const splitt = Boolean(valgt) && bred && visning === 'liste' && !utvidet;
  const sorter = (key) => setSort((p) => (p.key === key ? { key, dir: p.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  const SortPil = ({ k }) => (sort.key !== k ? null : sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />);

  /* ────────── Detaljpanel-seksjoner (flat Linear-stil) ────────── */
  const panel = valgt && (() => {
    const rs = regnestykke(valgt);
    const ai = valgt.ai || null;
    // Tokolonne: alltid i utvidet visning, og automatisk i splittvisning på
    // ultrabrede skjermer (>=1680px) — ekstra plass gir flere kolonner,
    // aldri bredere elementer.
    const toKol = utvidet || (splitt && ultra);
    const nB = galleri.length;
    const autoAktiv = Boolean(valgt.auto && ['analyserer', 'styler'].includes(valgt.auto.status));
    const steg = autoAktiv ? null : nesteSteg(valgt);

    const BENTO = 'rounded-[14px] border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]';
    const hIdx = Math.min(heroIdx, Math.max(0, nB - 1));
    const hero = galleri[hIdx];
    // Inline før/etter krever at originalen (kilde) fortsatt finnes på finncdn
    const heroSml = Boolean(hero && hero.ai && hero.kilde && !dodeBilder.has(hero.kilde));

    const sekBilder = nB > 0 && (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={Images} tittel={`Bilder (${nB})`} hoyre={(
          <>
            <select value={stil} onChange={(e) => setStil(e.target.value)} data-testid="radar-stil-velger" className="h-7 rounded-[7px] border border-black/[0.08] bg-white px-2 text-[11.5px] outline-none focus:border-[#1c1917]/25">
              {STIL_VALG.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
            </select>
            {(valgt.bilder || [])[0] && (
              <button onClick={() => stylBilde(valgt, hero?.ai ? valgt.bilder[0] : (hero?.kilde || valgt.bilder[0]))} disabled={!!styler} data-testid="radar-styl-bilde" title="Styl dette bildet med AI (~30-60 sek)"
                className="flex h-7 items-center gap-1.5 rounded-[7px] border border-black/[0.08] bg-white px-2.5 text-[11.5px] font-medium text-[#6d28d9] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-[#f7f5fc] disabled:opacity-50">
                {styler ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Styl
              </button>
            )}
          </>
        )} />
        {/* Hero — AI-bilder viser før/etter-slider DIREKTE på bildet.
            Mobil: retningslås — vertikal bevegelse scroller siden som normalt,
            tydelig horisontal bevegelse drar slideren, og et trykk flytter
            linjen dit med animasjon. Originaler har swipe/klikk som før. */}
        <div className={`group relative mt-3 overflow-hidden rounded-[12px] bg-[#f4f2ee] ${heroSml ? 'cursor-ew-resize' : ''}`} data-testid="radar-galleri-hero"
          style={heroSml ? { touchAction: 'pan-y' } : undefined}
          onPointerDown={heroSml ? (e) => { heroDrag.current = { x0: e.clientX, y0: e.clientY, laast: null, flyttet: false }; } : undefined}
          onPointerMove={heroSml ? (e) => {
            const d = heroDrag.current;
            if (!d) return;
            if (!d.laast) {
              const dx = Math.abs(e.clientX - d.x0);
              const dy = Math.abs(e.clientY - d.y0);
              if (dx > 7 && dx > dy * 1.2) {
                d.laast = 'slider';
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch (e2) { /* ok */ }
                setHeroDrar(true);
                settHeroPos(e);
              } else if (dy > 10 && dy > dx) {
                d.laast = 'scroll'; // la siden scrolle i fred
              }
              return;
            }
            if (d.laast === 'slider') settHeroPos(e);
          } : undefined}
          onPointerUp={heroSml ? (e) => {
            const d = heroDrag.current;
            heroDrag.current = null;
            setHeroDrar(false);
            // Trykk uten bevegelse → flytt linjen dit (transition er aktiv når vi ikke drar)
            if (d && !d.laast && Math.abs(e.clientX - d.x0) < 6 && Math.abs(e.clientY - d.y0) < 6) settHeroPos(e);
          } : undefined}
          onPointerCancel={heroSml ? () => { heroDrag.current = null; setHeroDrar(false); } : undefined}
          onTouchStart={!heroSml ? (e) => { swipeX.current = e.touches[0].clientX; } : undefined}
          onTouchEnd={!heroSml ? (e) => {
            if (swipeX.current == null || nB < 2) return;
            const dx = e.changedTouches[0].clientX - swipeX.current;
            swipeX.current = null;
            if (dx > 45) setHeroIdx((hIdx - 1 + nB) % nB);
            else if (dx < -45) setHeroIdx((hIdx + 1) % nB);
          } : undefined}>
          {heroSml ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.kilde} alt="Original" draggable={false} data-testid="radar-galleri-bilde"
                onError={() => merkDodBilde(hero.kilde)}
                className="h-[220px] w-full select-none object-cover min-[440px]:h-[260px] sm:h-[340px]" />
              <span className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - heroPos}% 0 0)`, transition: heroDrar ? 'none' : 'clip-path .22s ease' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={hero.url} alt="AI-forbedret" draggable={false} className="h-full w-full select-none object-cover" />
              </span>
              <span className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${heroPos}%`, transition: heroDrar ? 'none' : 'left .22s ease' }} data-testid="radar-hero-slider">
                <span className="absolute inset-y-0 -ml-px w-[2px] bg-white/95 shadow-[0_0_8px_rgba(0,0,0,0.45)]" />
                <span className="absolute top-1/2 -ml-[17px] -mt-[17px] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] sm:-ml-[15px] sm:-mt-[15px] sm:h-[30px] sm:w-[30px]">
                  <ChevronLeft className="-mr-0.5 h-3 w-3 text-[#1c1917]" /><ChevronRight className="-ml-0.5 h-3 w-3 text-[#1c1917]" />
                </span>
              </span>
              <span className="pointer-events-none absolute left-3 top-3 rounded-[5px] bg-[#8b5cf6]/90 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white" style={{ opacity: heroPos > 14 ? 1 : 0, transition: 'opacity .2s' }}>AI-forbedret</span>
              <span className="pointer-events-none absolute right-3 top-3 rounded-[5px] bg-black/45 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white" style={{ opacity: heroPos < 86 ? 1 : 0, transition: 'opacity .2s' }}>Original</span>
              <button onClick={(e) => { e.stopPropagation(); setSammenlign({ idx: Math.min(hIdx, Math.max(0, aiPar.length - 1)) }); }} onPointerDown={(e) => e.stopPropagation()} data-testid="radar-se-foretter" title="Åpne før/etter i fullskjerm"
                className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-[7px] bg-white/95 px-2.5 py-1.5 text-[11.5px] font-medium text-[#1c1917] shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all hover:bg-white">
                <Maximize2 className="h-3 w-3" /> Fullskjerm
              </button>
            </>
          ) : (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={hero.url} alt="" draggable={false}
                onClick={() => setLightbox({ idx: hIdx })}
                onError={hero.ai ? undefined : () => merkDodBilde(hero.url)}
                data-testid="radar-galleri-bilde" role="button" tabIndex={0}
                className="h-[220px] w-full cursor-pointer object-cover transition-transform duration-500 min-[440px]:h-[260px] sm:h-[340px]" />
              <span className="pointer-events-none absolute left-3 top-3 rounded-[5px] bg-black/45 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-white">Original</span>
            </>
          )}
          {nB > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); setHeroIdx((hIdx - 1 + nB) % nB); }} onPointerDown={(e) => e.stopPropagation()} aria-label="Forrige bilde" data-testid="radar-hero-forrige"
                className="absolute left-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1c1917] shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all hover:scale-105 sm:left-3 lg:opacity-0 lg:group-hover:opacity-100">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); setHeroIdx((hIdx + 1) % nB); }} onPointerDown={(e) => e.stopPropagation()} aria-label="Neste bilde" data-testid="radar-hero-neste"
                className="absolute right-2.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-[#1c1917] shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all hover:scale-105 sm:right-3 lg:opacity-0 lg:group-hover:opacity-100">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-[5px] bg-black/55 px-2 py-0.5 text-[10.5px] font-medium tabular-nums text-white">{hIdx + 1} / {nB}</span>
        </div>
        {/* Thumbnails — aktivt bilde markeres, AI-bilder åpner før/etter */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
          {galleri.map((b, i) => (
            <div key={b.url} className="group/t relative shrink-0 cursor-pointer" onClick={() => setHeroIdx(i)} role="button" tabIndex={0} data-testid={`radar-thumb-${i}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.url} alt="" draggable={false}
                onError={b.ai ? undefined : () => merkDodBilde(b.url)}
                className={`h-[52px] w-[74px] rounded-[8px] object-cover transition-all ${i === hIdx ? 'ring-2 ring-[#1c1917] ring-offset-1' : 'opacity-80 hover:opacity-100'}`} />
              {b.ai ? (
                <span className="absolute left-1 top-1 rounded-[3px] bg-[#8b5cf6]/90 px-1 py-px text-[7.5px] font-bold uppercase text-white">AI</span>
              ) : (
                <button onClick={(e) => { e.stopPropagation(); stylBilde(valgt, b.kilde); }} disabled={!!styler} data-testid="radar-styl-bilde" title="Styl dette bildet med AI"
                  className="absolute bottom-1 right-1 rounded-[5px] bg-black/55 p-1 text-white transition-opacity hover:bg-[#8b5cf6] disabled:opacity-40 lg:opacity-0 lg:group-hover/t:opacity-100">
                  {styler === b.kilde ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                </button>
              )}
              {styler === b.kilde && <span className="absolute inset-0 flex items-center justify-center rounded-[8px] bg-black/40"><Loader2 className="h-4 w-4 animate-spin text-white" /></span>}
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-[#a8a29a]">AI-bilder viser før/etter direkte — dra i skillelinjen · pilene blar · tryllestaven AI-styler originalbilder (~30–60 sek).</p>
      </section>
    );

    const sekAnalyse = (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={Sparkles} tittel="AI-analyse" hoyre={ai ? (
          <>
            <span className="text-[11px] text-[#c2beb8]">{naarSist(ai.at)}</span>
            <button onClick={() => analyser(valgt.id)} disabled={analyserer} data-testid="radar-analyser-btn" title="Kjør analysen på nytt"
              className="flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[11.5px] font-medium text-[#a8a29a] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917] disabled:opacity-50">
              {analyserer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} På nytt
            </button>
          </>
        ) : null} />
        {!ai ? (
          analyserer ? (
            <div className="mt-4 flex items-center gap-3 rounded-[10px] bg-[#f7f6f3] px-4 py-4 text-[12.5px] text-[#57534e]">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8b5cf6]" /> Analyserer bilder, piksler og tekst — tar 15–40 sekunder…
            </div>
          ) : (
            <div className="mt-4 rounded-[10px] border border-dashed border-black/[0.10] bg-[#fbfaf9] px-4 py-4">
              <p className="text-[12.5px] leading-relaxed text-[#78716c]">AI-en ser på selve bildene: vurderer hvert enkelt bilde (rom, funn, score), hvor selgende annonsen er som helhet, pluss lys, skarphet, ryddighet og tekst — koden måler piksler, bildeformat og datahygiene. Du får salgskraft-score, funn, salgsvinkel, FINN-melding og personlig tilbudstekst.</p>
              <button onClick={() => analyser(valgt.id)} data-testid="radar-analyser-btn" className={`${KNAPP_PRIMAER} mt-3.5`}>
                <Sparkles className="h-3.5 w-3.5" /> Kjør AI-analyse
              </button>
            </div>
          )
        ) : (
          <div className="mt-4" data-testid="radar-analyse-resultat">
            {/* Store ringer — potensial + salgskraft + kvalitet (0-100) */}
            <div className={`grid gap-2.5 ${ai.salgskraft ? 'grid-cols-1 min-[420px]:grid-cols-3' : 'grid-cols-2'}`}>
              {[
                ['Potensial', ai.potensialScore, 'Hvor vinnbar leaden er for oss'],
                ...(ai.salgskraft ? [['Salgskraft', ai.salgskraft.score, 'Hvor selgende annonsen er']] : []),
                ['Kvalitet i dag', ai.annonseScore, 'Hvor god annonsen er nå'],
              ].map(([l, v, hint]) => (
                <div key={l} className="flex items-center gap-3 rounded-[10px] bg-[#fbfaf9] px-3.5 py-3.5" title={hint}>
                  <ScoreRing verdi={v} storrelse={52} strek={4.5} />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">{l}</span>
                    <span className="block text-[11px] leading-snug text-[#8a857c]">{hint}</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {DEL_ETIKETTER.map(([k, etikett]) => (
                <div key={k}>
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11.5px] font-medium text-[#78716c]">{etikett}</span>
                    <span className="text-[12px] font-bold tabular-nums" style={{ ...heading, color: delFarge(ai.deler?.[k]) }}>{ai.deler?.[k] ?? '–'}</span>
                  </div>
                  <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[#f1efeb]">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (ai.deler?.[k] || 0) * 10)}%`, background: delFarge(ai.deler?.[k]) }} />
                  </div>
                </div>
              ))}
            </div>
            {ai.teknisk && (
              <p className="mt-3 text-[11px] tabular-nums text-[#a8a29a]">
                {ai.teknisk.maltBilder} av {ai.teknisk.antallBilder} bilder målt
                {ai.teknisk.snittMp != null ? ` · snitt ${ai.teknisk.snittMp} MP` : ''}
                {ai.teknisk.andelPortrett != null ? ` · ${Math.round(ai.teknisk.andelPortrett * 100)} % portrett${ai.teknisk.andelPortrett >= 0.8 ? ' (tyder på mobilbilder)' : ''}` : ''}
              </p>
            )}
            {ai.salgskraft?.deler && (
              <div className="mt-4 rounded-[10px] border border-black/[0.05] bg-[#fbfaf9] px-4 py-3.5" data-testid="radar-salgskraft-deler">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Salgskraft — hva trekker opp og ned</p>
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                  {[
                    ['forsteinntrykk', 'Førsteinntrykk (hovedbilde)'],
                    ['appell', 'Appell — lyst til å bo her'],
                    ['dekning', 'Dekker viktigste rom'],
                    ['tekstSalg', 'Tekst som selger'],
                  ].map(([k, etikett]) => (
                    <div key={k}>
                      <div className="flex items-baseline justify-between">
                        <span className="text-[11.5px] font-medium text-[#78716c]">{etikett}</span>
                        <span className="text-[12px] font-bold tabular-nums" style={{ ...heading, color: delFarge(ai.salgskraft.deler?.[k]) }}>{ai.salgskraft.deler?.[k] ?? '–'}</span>
                      </div>
                      <div className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[#f1efeb]">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (ai.salgskraft.deler?.[k] || 0) * 10)}%`, background: delFarge(ai.salgskraft.deler?.[k]) }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(ai.bildeVurdering || []).length > 0 && (
              <div className="mt-4" data-testid="radar-bildevurdering">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Bilde for bilde</p>
                <div className="mt-2.5 space-y-1.5">
                  {ai.bildeVurdering.map((bv, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-[9px] border border-black/[0.04] bg-white px-2.5 py-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bv.url} alt="" className="h-9 w-12 shrink-0 rounded-[6px] object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]" />
                      <span className="w-[74px] shrink-0 text-[11px] font-bold capitalize text-[#57534e]" style={heading}>{bv.rom}</span>
                      <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#78716c]" title={bv.funn}>{bv.funn || '—'}</span>
                      <span className="shrink-0 rounded-[5px] px-1.5 py-0.5 text-[11px] font-bold tabular-nums" style={{ ...heading, color: delFarge(bv.score), background: `${delFarge(bv.score)}14` }}>{bv.score}</span>
                    </div>
                  ))}
                </div>
              </div>
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
              <div className="mt-4 rounded-[10px] border border-black/[0.05] bg-[#fbfaf9] px-4 py-3.5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8b5cf6]">Anbefalt salgsvinkel · stylingpotensial {ai.stylingPotensial}</p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#44403c]">{ai.salgsvinkel}</p>
              </div>
            )}
          </div>
        )}
      </section>
    );

    const sekOkonomi = (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={Banknote} tittel="Økonomi og tilbud" />
        {valgt.analyse?.grunnlag?.snittLeie ? (
          <p className="mt-2 text-[11.5px] text-[#a8a29a]">
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
              className="h-9 w-full rounded-[8px] border border-black/[0.08] px-3 text-[13px] tabular-nums outline-none transition-colors focus:border-[#1c1917]/30" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Honorar (% eks. mva)</span>
            <input type="number" min="4" max="15" step="0.5" value={valgt.analyse?.honorarPct ?? 8} data-testid="radar-honorar-input"
              onChange={(e) => settLead(valgt.id, (x) => ({ ...x, analyse: { ...x.analyse, honorarPct: Number(e.target.value) } }))}
              onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: valgt.analyse?.anbefaltLeie, honorarPct: Number(e.target.value) } })}
              className="h-9 w-full rounded-[8px] border border-black/[0.08] px-3 text-[13px] tabular-nums outline-none transition-colors focus:border-[#1c1917]/30" />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-black/[0.06] bg-black/[0.06]">
          {[['Vårt honorar', kr(rs.honorar), '#6d28d9'], ['Netto til eier', kr(rs.netto), '#1f7a45'],
            ['vs. i dag', rs.gevinst == null ? '–' : `${rs.gevinst >= 0 ? '+' : '−'}${kr(Math.abs(rs.gevinst))}`, rs.gevinst != null && rs.gevinst < 0 ? '#c2413b' : '#1f7a45']].map(([l, v, c]) => (
            <div key={l} className="bg-[#fbfaf9] px-2.5 py-3 sm:px-3.5">
              <p className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-[#a8a29a] sm:text-[10px] sm:tracking-[0.06em]">{l}</p>
              <p className="mt-0.5 text-[13px] font-bold tabular-nums min-[420px]:text-[14px] sm:text-[15px]" style={{ ...heading, color: c }}>{v}<span className="text-[10px] font-medium text-[#b8b2a9] sm:text-[10.5px]">/mnd</span></p>
            </div>
          ))}
        </div>
        {(valgt.prisHistorikk || []).length > 0 && (
          <div className="mt-3.5" data-testid="radar-prishistorikk">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Prishistorikk (FINN)</p>
            <ul className="mt-1.5 space-y-1">
              {[...valgt.prisHistorikk].reverse().slice(0, 5).map((h, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[12px] tabular-nums text-[#57534e]">
                  <span className={Number(h.til) < Number(h.fra) ? 'font-bold text-[#0e7490]' : 'font-bold text-[#c2413b]'}>{Number(h.til) < Number(h.fra) ? '↓' : '↑'}</span>
                  <span className="text-[#a8a29a] line-through">{tall(h.fra)}</span>
                  <span className="text-[#c2beb8]">→</span>
                  <b className="text-[#1c1917]">{kr(h.til)}</b>
                  <span className="ml-auto text-[11px] text-[#a8a29a]">{naarSist(h.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );

    const sekMelding = ai && (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={MessageSquare} tittel="FINN-melding" hoyre={(
          <button onClick={() => kopierMelding(valgt)} data-testid="radar-kopier-melding" className={`${KNAPP_GHOST} h-7 text-[11.5px]`}>
            {meldingKopiert ? <Check className="h-3.5 w-3.5 text-[#1f7a45]" /> : <Copy className="h-3.5 w-3.5" />} {meldingKopiert ? 'Kopiert!' : 'Kopier med lenke'}
          </button>
        )} />
        <textarea value={ai.finnMelding || ''} rows={4} data-testid="radar-finnmelding"
          onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, finnMelding: e.target.value } }))}
          onBlur={(e) => oppdater(valgt.id, { finnMelding: e.target.value }, true)}
          className="mt-3 w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
        <p className="mt-1.5 text-[11px] text-[#a8a29a]">{'{LENKE}'} byttes automatisk med tilbudslenken når du kopierer. Redigeres fritt — lagres når du klikker ut.</p>
      </section>
    );

    const sekTilbud = (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={Globe} tittel="Tilbudsside til huseier" hoyre={(valgt.aapninger || 0) > 0 ? (
          <span className="flex items-center gap-1 text-[11.5px] tabular-nums text-[#0e7490]"><Eye className="h-3.5 w-3.5" /> Åpnet {valgt.aapninger}×{valgt.sistAapnet ? ` · ${naarSist(valgt.sistAapnet)}` : ''}</span>
        ) : null} />
        <div className="mt-3 flex gap-2">
          <button onClick={() => kopierLenke(valgt)} data-testid="radar-kopier-lenke" className={`${KNAPP_PRIMAER} h-9 flex-1 justify-center`}>
            {kopiert ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {kopiert ? 'Kopiert!' : 'Kopier tilbudslenke'}
          </button>
          <a href={`/tilbud/${valgt.tilbudSlug}`} target="_blank" rel="noreferrer" data-testid="radar-aapne-tilbud" className={`${KNAPP_GHOST} h-9`}>
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
                className="w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">«Potensialet vi ser» — vises før regnestykket</span>
              <textarea value={ai.tilbudTekst?.potensialTekst || ''} rows={3} data-testid="radar-potensial-tekst"
                onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, tilbudTekst: { ...x.ai.tilbudTekst, potensialTekst: e.target.value } } }))}
                onBlur={(e) => oppdater(valgt.id, { tilbudTekst: { potensialTekst: e.target.value } }, true)}
                className="w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
            </label>
            <p className="text-[11px] text-[#a8a29a]">Tomme felter → tilbudssiden bruker standardteksten.</p>
            {ai.annonseUtkast ? (
              <div className="space-y-3 border-t border-black/[0.05] pt-3" data-testid="radar-annonseutkast">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Annonseutkast — vises i annonse-previewen{ai.annonseUtkast.redigert ? ' · redigert' : ''}</p>
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Annonsetittel</span>
                  <input value={ai.annonseUtkast.tittel || ''} maxLength={80} data-testid="radar-annonse-tittel"
                    onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, annonseUtkast: { ...x.ai.annonseUtkast, tittel: e.target.value } } }))}
                    onBlur={(e) => oppdater(valgt.id, { annonseUtkast: { tittel: e.target.value } }, true)}
                    className="h-9 w-full rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 text-[12.5px] outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Annonsetekst (avsnitt skilles med blank linje)</span>
                  <textarea value={ai.annonseUtkast.beskrivelse || ''} rows={5} data-testid="radar-annonse-beskrivelse"
                    onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, annonseUtkast: { ...x.ai.annonseUtkast, beskrivelse: e.target.value } } }))}
                    onBlur={(e) => oppdater(valgt.id, { annonseUtkast: { beskrivelse: e.target.value } }, true)}
                    className="w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Høydepunkter (én per linje)</span>
                    <textarea value={(ai.annonseUtkast.hoydepunkter || []).join('\n')} rows={4} data-testid="radar-annonse-hoydepunkter"
                      onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, annonseUtkast: { ...x.ai.annonseUtkast, hoydepunkter: e.target.value.split('\n') } } }))}
                      onBlur={(e) => oppdater(valgt.id, { annonseUtkast: { hoydepunkter: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) } }, true)}
                      className="w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Fasiliteter (komma mellom)</span>
                    <textarea value={(ai.annonseUtkast.fasiliteter || []).join(', ')} rows={4} data-testid="radar-annonse-fasiliteter"
                      onChange={(e) => settLead(valgt.id, (x) => ({ ...x, ai: { ...x.ai, annonseUtkast: { ...x.ai.annonseUtkast, fasiliteter: e.target.value.split(',') } } }))}
                      onBlur={(e) => oppdater(valgt.id, { annonseUtkast: { fasiliteter: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } }, true)}
                      className="w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] leading-relaxed outline-none transition-colors focus:border-[#1c1917]/30 focus:bg-white" />
                  </label>
                </div>
              </div>
            ) : (
              <p className="border-t border-black/[0.05] pt-3 text-[11px] text-[#a8a29a]">Annonseutkast mangler — kjør AI-analysen på nytt for å generere annonse-previewen.</p>
            )}
          </div>
        )}
        <p className="mt-2 text-[11px] text-[#a8a29a]">Send lenken via FINN-meldingen på annonsen{valgt.kontaktTlf ? ` — eller ring ${valgt.kontaktTlf}` : ''}. Ikke uanmodet e-post/SMS (mfl. §15).</p>
        {(valgt.kontaktLogg || []).length > 0 && (
          <div className="mt-3 space-y-2">
            {valgt.kontaktLogg.map((kx, i) => (
              <p key={i} className="flex items-start gap-2 rounded-[10px] bg-[#e9f6f9] px-3.5 py-2.5 text-[12px] text-[#0e7490]">
                <MessageSquare className="mt-[2px] h-3.5 w-3.5 shrink-0" />
                <span><b>{kx.navn}</b> ({kx.telefon}) — {kx.melding || 'ba om å bli ringt'} · {naarSist(kx.at)}</span>
              </p>
            ))}
          </div>
        )}
      </section>
    );

    const sekBeskrivelse = Boolean(valgt.beskrivelse) && (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={MessageSquare} tittel="Annonsetekst fra FINN" hoyre={<span className="text-[11px] tabular-nums text-[#c2beb8]">{valgt.beskrivelse.length} tegn</span>} />
        <details className="group/besk mt-3">
          <summary className="cursor-pointer list-none">
            <span className="block whitespace-pre-line text-[12.5px] leading-relaxed text-[#57534e] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:5] group-open/besk:[display:block]">
              {valgt.beskrivelse}
            </span>
            <span className="mt-2 inline-block text-[11.5px] font-semibold text-[#6d28d9] group-open/besk:hidden">Vis hele teksten</span>
            <span className="mt-2 hidden text-[11.5px] font-semibold text-[#6d28d9] group-open/besk:inline-block">Vis mindre</span>
          </summary>
        </details>
      </section>
    );

    const sekNotat = (
      <section className={`${BENTO} p-4 sm:p-5`}>
        <SekHode ikon={StickyNote} tittel="Notat" />
        <textarea value={valgt.notat || ''} rows={2} data-testid="radar-notat"
          onChange={(e) => settLead(valgt.id, (x) => ({ ...x, notat: e.target.value }))}
          onBlur={(e) => oppdater(valgt.id, { notat: e.target.value })}
          placeholder="Ringt 14/2, svarte ikke — prøver igjen torsdag…"
          className="mt-3 w-full resize-none rounded-[10px] border border-black/[0.08] bg-[#fbfaf9] px-3.5 py-3 text-[12.5px] outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#1c1917]/30 focus:bg-white" />
      </section>
    );

    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="radar-skuff">
        {/* Panelhode */}
        <div className="border-b border-black/[0.05] px-4 pb-3.5 pt-3.5 sm:px-7 sm:pb-4 sm:pt-4">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <button onClick={() => { setValgtId(null); setUtvidet(false); }} data-testid="radar-skuff-lukk" aria-label="Lukk"
              className="mt-1 shrink-0 rounded-lg p-1.5 text-[#a8a29a] transition-colors hover:bg-[#f3f2f0] hover:text-[#333]">
              {splitt || utvidet ? <X className="h-[19px] w-[19px]" /> : <ArrowLeft className="h-[19px] w-[19px]" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[19px] font-bold leading-tight tracking-[-0.015em] sm:text-[23px]" style={heading}>{valgt.adresse || valgt.tittel}</h2>
                {valgt.kilde === 'agent' && <span className="rounded-md bg-[#f1ebfc] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-[#6d28d9]" title="Matet inn av overvåkningsagenten">Agent</span>}
              </div>
              {valgt.tittel && valgt.tittel.trim() !== (valgt.adresse || '').trim() ? (
                <p className="mt-0.5 truncate text-[12.5px] text-[#8a857c]" data-testid="radar-panel-tittel">{valgt.tittel}</p>
              ) : null}
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#a8a29a] sm:gap-x-3.5 sm:text-[13px]">
                <span className="flex items-center gap-1.5">
                  <span className="font-bold tabular-nums text-[#1c1917]" style={heading}>{kr(valgt.pris)}<span className="font-medium text-[#a8a29a]">/mnd</span></span>
                  {(() => {
                    const kutt = sisteKutt(valgt);
                    return kutt ? (
                      <span className="flex items-center gap-1 rounded-[4px] bg-[#e9f6f9] px-1.5 py-px text-[10px] font-bold text-[#0e7490]" title={naarSist(kutt.at)} data-testid="radar-panel-kutt">
                        <span className="tabular-nums line-through opacity-60">{tall(kutt.fra)}</span> ↓ −{kutt.pct} %
                      </span>
                    ) : null;
                  })()}
                </span>
                {valgt.m2 ? <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{valgt.m2} m²</span> : null}
                {valgt.soverom ? <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{valgt.soverom} sov</span> : null}
                {valgt.boligtype ? <span className="hidden sm:inline">{valgt.boligtype}</span> : null}
                {(valgt.kontaktNavn || valgt.kontaktTlf) ? (
                  <span className="flex items-center gap-1" data-testid="radar-panel-kontakt">
                    <Phone className="h-3.5 w-3.5" />
                    {valgt.kontaktNavn ? <span className="font-medium text-[#57534e]">{valgt.kontaktNavn}</span> : null}
                    {valgt.kontaktTlf ? (
                      <a href={`tel:${valgt.kontaktTlf}`} className="tabular-nums text-[#57534e] hover:text-[#1c1917] hover:underline" onClick={(e) => e.stopPropagation()}>
                        {fmtTlf(valgt.kontaktTlf)}
                      </a>
                    ) : null}
                  </span>
                ) : null}
                <a href={valgt.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3.5 w-3.5" /></a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button onClick={() => setUtvidet((u) => !u)} data-testid="radar-utvid" title={utvidet ? 'Minimer visningen' : 'Utvid til stor visning'}
                className="hidden rounded-lg p-2 text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9] lg:block">
                {utvidet ? <Minimize2 className="h-[17px] w-[17px]" /> : <Maximize2 className="h-[17px] w-[17px]" />}
              </button>
              <PotensialBadge p={valgt.potensial} stor />
            </div>
          </div>
          <div className="no-scrollbar mt-3 flex w-full items-center gap-0.5 overflow-x-auto rounded-[9px] border border-black/[0.06] bg-[#f7f6f3] p-0.5 sm:mt-3.5 sm:inline-flex sm:w-auto sm:flex-wrap sm:overflow-visible">
            {STATUSER.map((s) => (
              <button key={s.k} onClick={() => oppdater(valgt.id, { status: s.k })} disabled={autoAktiv} data-testid={`radar-status-${s.k}`}
                className={`flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[7px] px-2.5 text-[11.5px] font-medium transition-all disabled:opacity-45 ${valgt.status === s.k ? 'bg-white text-[#1c1917] shadow-[0_1px_3px_rgba(28,25,23,0.10),inset_0_0_0_1px_rgba(0,0,0,0.04)]' : 'text-[#8a857c] hover:text-[#1c1917]'}`}>
                <span className="h-[6px] w-[6px] rounded-full" style={{ background: s.farge, opacity: valgt.status === s.k ? 1 : 0.45 }} />
                {s.l}
              </button>
            ))}
          </div>
        </div>

        {/* Annonsen fjernet fra FINN — agenten meldte deaktivering */}
        {valgt.annonseAktiv === false && !autoAktiv && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/[0.05] bg-[#f4f2ee] px-4 py-2.5 sm:px-7" data-testid="radar-deaktivert">
            <p className="text-[12px] font-medium text-[#57534e]">
              Annonsen er tatt av FINN{valgt.deaktivertAt ? ` ${naarSist(valgt.deaktivertAt)}` : ''} — trolig utleid eller trukket.
            </p>
            {!['vunnet', 'tapt'].includes(valgt.status) && (
              <button onClick={() => oppdater(valgt.id, { status: 'tapt' })} data-testid="radar-deaktivert-tapt" className={`${KNAPP_GHOST} ml-auto h-7 px-2.5 text-[11.5px]`}>
                Merk som tapt
              </button>
            )}
          </div>
        )}
        {/* Neste steg-linje — kontekstuelle ett-klikks handlinger per status */}
        {steg && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-black/[0.05] bg-[#fbfaf9] px-4 py-2.5 sm:px-7" data-testid="radar-neste-steg">
            <p className="flex min-w-0 items-center gap-2 text-[12px] font-medium text-[#57534e]">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full" style={{ background: `${steg.c}14` }}>
                <span className="h-[6px] w-[6px] rounded-full" style={{ background: steg.c }} />
              </span>
              <span className="shrink-0 text-[#a8a29a]">Neste steg:</span>
              <span className="min-w-0">{steg.t}</span>
            </p>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              {valgt.status === 'ny' && (
                <button onClick={() => analyser(valgt.id)} disabled={analyserer} data-testid="radar-steg-analyser" className={`${KNAPP_PRIMAER} h-7 px-2.5 text-[11.5px]`}>
                  {analyserer ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Kjør AI-analyse
                </button>
              )}
              {valgt.status === 'analysert' && (
                <>
                  {valgt.kontaktTlf && (
                    <a href={`tel:${valgt.kontaktTlf}`} data-testid="radar-steg-ring" className={`${KNAPP_GHOST} h-7 px-2.5 text-[11.5px]`}>
                      <Phone className="h-3 w-3" /> Ring {fmtTlf(valgt.kontaktTlf)}
                    </a>
                  )}
                  <button onClick={() => kopierMelding(valgt)} data-testid="radar-steg-kopier" className={`${KNAPP_PRIMAER} h-7 px-2.5 text-[11.5px]`}>
                    {meldingKopiert ? <Check className="h-3 w-3 text-[#7ee2a8]" /> : <Copy className="h-3 w-3" />} {meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding'}
                  </button>
                  <button onClick={() => oppdater(valgt.id, { status: 'kontaktet' })} data-testid="radar-steg-kontaktet" className={`${KNAPP_GHOST} h-7 px-2.5 text-[11.5px]`}>
                    Merk som kontaktet
                  </button>
                </>
              )}
              {valgt.status === 'kontaktet' && (
                <>
                  <button onClick={() => { kopierLenke(valgt); oppdater(valgt.id, { status: 'dialog' }); }} data-testid="radar-steg-send-tilbud" className={`${KNAPP_PRIMAER} h-7 px-2.5 text-[11.5px]`}>
                    {kopiert ? <Check className="h-3 w-3 text-[#7ee2a8]" /> : <Copy className="h-3 w-3" />} Send tilbud — kopier lenken
                  </button>
                  <button onClick={() => oppdater(valgt.id, { status: 'dialog' })} data-testid="radar-steg-dialog" className={`${KNAPP_GHOST} h-7 px-2.5 text-[11.5px]`}>
                    Huseier svarte
                  </button>
                  <button onClick={() => oppdater(valgt.id, { status: 'tapt' })} data-testid="radar-steg-ikke-aktuelt"
                    className="flex h-7 items-center gap-1 rounded-[7px] px-2.5 text-[11.5px] font-medium text-[#b3261e] transition-colors hover:bg-[#fdf0ef]">
                    Ikke aktuelt
                  </button>
                </>
              )}
              {valgt.status === 'dialog' && (
                <>
                  <button onClick={() => oppdater(valgt.id, { status: 'vunnet' })} data-testid="radar-steg-vunnet"
                    className="flex h-7 items-center gap-1.5 rounded-[7px] bg-[#1f7a45] px-2.5 text-[11.5px] font-medium text-white transition-all hover:bg-[#196a3b] active:scale-[0.98]">
                    <Check className="h-3 w-3" /> Marker som vunnet
                  </button>
                  <button onClick={() => oppdater(valgt.id, { status: 'tapt' })} data-testid="radar-steg-ikke-aktuelt-dialog"
                    className="flex h-7 items-center gap-1 rounded-[7px] px-2.5 text-[11.5px] font-medium text-[#b3261e] transition-colors hover:bg-[#fdf0ef]">
                    Ikke aktuelt
                  </button>
                </>
              )}
            </span>
          </div>
        )}
        {valgt.status === 'vunnet' && !autoAktiv && (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.05] bg-[#eef6f0] px-4 py-2.5 sm:px-7" data-testid="radar-vunnet-linje">
            <Check className="h-4 w-4 shrink-0 text-[#1f7a45]" />
            <p className="text-[12px] font-medium text-[#1f7a45]">Vunnet — ca. {kr(rs.honorar)}/mnd i honorar. Neste: opprett forvaltningsavtale i DigiHome-plattformen.</p>
          </div>
        )}

        {/* Automatikk-progresjonen vises i låse-overlayet under — her kun avvik */}
        {valgt.auto?.status === 'feilet' && (
          <div className="border-b border-black/[0.05] bg-[#fdf0ef] px-5 py-2.5 text-[12px] font-medium text-[#c2413b] sm:px-7" data-testid="radar-auto-feil">
            Automatikken stoppet: {valgt.auto.feil || 'ukjent feil'} — du kan kjøre AI-analysen manuelt under.
          </div>
        )}
        {(valgt.auto?.status === 'ferdig_med_feil' || (valgt.auto?.status === 'ferdig' && (valgt.auto?.bilderFeilet || 0) > 0)) && (
          <div className="flex flex-wrap items-center gap-2.5 border-b border-black/[0.05] bg-[#fdf3e0] px-5 py-2.5 sm:px-7" data-testid="radar-auto-delvis">
            <p className="text-[12px] font-medium text-[#9a6b1c]">
              Automatikk ferdig: {valgt.auto.bilderFerdig || 0} av {valgt.auto.bilderTotalt || 0} bilder forbedret — {valgt.auto.bilderFeilet || 0} feilet.
            </p>
            <button onClick={() => autoRetry(valgt.id)} disabled={retryStarter} data-testid="radar-auto-retry"
              className="flex items-center gap-1.5 rounded-lg border border-[#e8cf96] bg-white px-2.5 py-1 text-[11.5px] font-bold text-[#9a6b1c] transition-colors hover:bg-[#fdf8ec] disabled:opacity-50">
              {retryStarter ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Prøv feilede på nytt
            </button>
          </div>
        )}
        {valgt.auto?.status === 'hoppet' && (
          <div className="border-b border-black/[0.05] bg-[#fdf3e0] px-5 py-2.5 text-[12px] font-medium text-[#9a6b1c] sm:px-7">
            Automatikk hoppet over: {valgt.auto.feil || 'dagstak nådd'} — kjør analysen manuelt under om ønskelig.
          </div>
        )}

        {/* Panelinnhold — galleri øverst, bento-grid under (Airbnb-stil) */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className={`min-h-0 flex-1 overflow-y-auto bg-[#f7f6f3] ${autoAktiv ? 'pointer-events-none select-none' : ''}`}>
            <div className="px-3.5 py-3.5 sm:px-5">
              {sekBilder}
              {toKol ? (
                <div className="mt-3 grid grid-cols-2 items-start gap-3">
                  <div className="grid gap-3">{sekAnalyse}{sekMelding}{sekNotat}</div>
                  <div className="grid gap-3">{sekOkonomi}{sekTilbud}{sekBeskrivelse}</div>
                </div>
              ) : (
                <div className="mt-3 grid gap-3">{sekAnalyse}{sekOkonomi}{sekMelding}{sekTilbud}{sekBeskrivelse}{sekNotat}</div>
              )}
            </div>
          </div>

          {/* Panelfot */}
          <div className="flex items-center gap-2 border-t border-black/[0.05] bg-white px-4 py-2.5 sm:px-7">
            {!sletteBekreft ? (
              <button onClick={() => setSletteBekreft(true)} data-testid="radar-slett" className="flex items-center gap-1.5 rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium text-[#c2beb8] transition-colors hover:bg-[#fdf0ef] hover:text-[#c2413b]">
                <Trash2 className="h-3.5 w-3.5" /> Slett lead
              </button>
            ) : (
              <span className="flex items-center gap-1.5">
                <button onClick={() => slett(valgt.id)} data-testid="radar-slett-bekreft" className="rounded-[7px] bg-[#fdf0ef] px-3 py-1.5 text-[12px] font-bold text-[#c2413b]">Ja, slett</button>
                <button onClick={() => setSletteBekreft(false)} className="rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium text-[#a8a29a]">Avbryt</button>
              </span>
            )}
            <p className="ml-auto text-[11px] text-[#b8b2a9]">Hentet {naarSist(valgt.createdAt)}</p>
          </div>

          {/* Låst mens automatikken jobber — elegant overlay med live fremdrift */}
          {autoAktiv && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#f7f6f3]/60 backdrop-blur-[3px]" data-testid="radar-auto-laas">
              <div className="dh-scale-in mx-4 w-full max-w-[420px] rounded-2xl border border-black/[0.06] bg-white p-6 text-center shadow-[0_20px_60px_rgba(28,25,23,0.18)]">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f4f0fb]"><Loader2 className="h-5 w-5 animate-spin text-[#8b5cf6]" /></span>
                <p className="mt-3 text-[15px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>
                  {valgt.auto.status === 'analyserer' ? 'AI-en analyserer annonsen' : 'AI-en forbedrer bildene'}
                </p>
                <p className="mt-1 text-[12.5px] text-[#78716c]" data-testid="radar-auto-banner">
                  {valgt.auto.status === 'analyserer'
                    ? 'Vurderer bilder, tekst og prisgrunnlag — tar 15–40 sekunder.'
                    : `${valgt.auto.bilderFerdig || 0} av ${valgt.auto.bilderTotalt || 0} bilder ferdig${valgt.auto.bilderFeilet ? ` · ${valgt.auto.bilderFeilet} feilet` : ''}${valgt.auto.modus ? ` · ${STIL_VALG.find((s) => s.k === valgt.auto.modus)?.l || valgt.auto.modus}` : ''}`}
                </p>
                <div className="mx-auto mt-3.5 h-[5px] max-w-[280px] overflow-hidden rounded-full bg-[#f1efeb]">
                  <div className="h-full rounded-full bg-[#8b5cf6] transition-all duration-700" style={{ width: valgt.auto.status === 'analyserer' ? '14%' : `${14 + 86 * ((valgt.auto.bilderFerdig || 0) / Math.max(1, valgt.auto.bilderTotalt || 1))}%` }} />
                </div>
                <p className="mt-3 text-[11px] text-[#a8a29a]">Annonsen er låst mens automatikken jobber — du kan trygt lukke og komme tilbake.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  })();

  /* ────────── Render ────────── */
  return (
    <div className="mx-auto w-full max-w-[1840px]" data-testid="salgsradar-modul">
      {/* Innliming — skjult til man trykker «Ny annonse» (plussknappen) */}
      {visNy && (
        <div className={`${KORT} mb-4 p-4`} data-testid="radar-ny-panel">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-black/[0.06] bg-[#f7f6f3]"><Radar className="h-4 w-4 text-[#57534e]" /></span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') hentAnnonse(); if (e.key === 'Escape') { setVisNy(false); setUrl(''); } }}
                placeholder="Lim inn FINN-leieannonse — f.eks. https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
                data-testid="radar-url-input"
                className="h-9 min-w-0 flex-1 rounded-[8px] border border-black/[0.08] bg-white px-3 text-[13px] outline-none transition-all placeholder:text-[#c2beb8] focus:border-[#1c1917]/30 focus:ring-2 focus:ring-[#1c1917]/[0.06]" />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button onClick={hentAnnonse} disabled={henter || !url.trim()} data-testid="radar-hent-btn"
                className={`${KNAPP_PRIMAER} h-9 flex-1 justify-center sm:flex-initial`}>
                {henter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Hent og analyser
              </button>
              <button onClick={() => { setVisNy(false); setUrl(''); }} data-testid="radar-ny-lukk" title="Lukk"
                className="flex h-9 w-9 items-center justify-center rounded-[8px] text-[#a8a29a] transition-colors hover:bg-black/[0.04] hover:text-[#1c1917]">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-[11.5px] text-[#a8a29a] sm:pl-[46px]">Analyse og AI-bildeforbedring starter automatisk når annonsen er hentet.</p>
        </div>
      )}

      {feil && <p className="mb-3 rounded-lg bg-[#fdf0ef] px-4 py-3 text-[13px] text-[#c2413b]" data-testid="radar-feil">{feil}</p>}

      {/* Innsiktslinje — hva er i spill og hvem venter på deg. Klikk filtrerer. */}
      {!laster && leads.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/[0.06] bg-black/[0.05] shadow-[0_1px_2px_rgba(28,25,23,0.04)] sm:grid-cols-4" data-testid="radar-innsikt">
          <button onClick={() => setFilter('alle')} className="bg-white px-4 py-3 text-left transition-colors hover:bg-[#fbfaf9]" data-testid="radar-innsikt-pipeline">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Honorar i spill</p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#1c1917] sm:text-[17px]" style={heading}>{kr(innsikt.honorarPipeline)}<span className="text-[10.5px] font-medium text-[#b8b2a9]">/mnd</span></p>
            <p className="mt-0.5 text-[11px] text-[#a8a29a]">{innsikt.pipeline} aktive leads</p>
          </button>
          <button onClick={() => setFilter('analysert')} className="bg-white px-4 py-3 text-left transition-colors hover:bg-[#fbfaf9]" data-testid="radar-innsikt-kontakte">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Å kontakte</p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#6d28d9] sm:text-[17px]" style={heading}>{innsikt.aKontakte}</p>
            <p className="mt-0.5 text-[11px] text-[#a8a29a]">analysert og klare</p>
          </button>
          <button onClick={() => { setFilter('alle'); setSort({ key: 'aapnet', dir: 'desc' }); }} className="bg-white px-4 py-3 text-left transition-colors hover:bg-[#fbfaf9]" data-testid="radar-innsikt-apnet">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Har åpnet tilbudet</p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#0e7490] sm:text-[17px]" style={heading}>{innsikt.harApnet}</p>
            <p className="mt-0.5 text-[11px] text-[#a8a29a]">varme — følg opp</p>
          </button>
          <button onClick={() => setFilter('vunnet')} className="bg-white px-4 py-3 text-left transition-colors hover:bg-[#fbfaf9]" data-testid="radar-innsikt-vunnet">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Vunnet</p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-[#1f7a45] sm:text-[17px]" style={heading}>{innsikt.vunnet}</p>
            <p className="mt-0.5 text-[11px] text-[#a8a29a]">{innsikt.vunnet > 0 ? `${kr(innsikt.honorarVunnet)}/mnd sikret` : 'ingen ennå'}</p>
          </button>
        </div>
      )}

      {/* Verktøylinje / bulk-linje — mobil: søk+kontroller øverst, filtre som scrollerad */}
      {utvalg.size === 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-[12px] border border-black/[0.05] bg-white/85 px-2.5 py-2 shadow-[0_1px_3px_rgba(28,25,23,0.05)] backdrop-blur-md">
          <span className="relative order-1 min-w-0 flex-1 lg:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c2beb8]" />
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk adresse…" data-testid="radar-sok"
              className="h-[28px] w-full rounded-[7px] border border-black/[0.07] bg-white pl-8 pr-2.5 text-[12px] outline-none transition-all placeholder:text-[#c2beb8] focus:border-[#1c1917]/25 lg:w-[170px] lg:focus:w-[200px]" />
          </span>
          <span className="order-3 mx-1 hidden h-4 w-px bg-black/[0.07] lg:block" />
          <div className="no-scrollbar order-4 -mx-1 flex w-full items-center gap-1 overflow-x-auto px-1 lg:mx-0 lg:w-auto lg:flex-wrap lg:overflow-visible lg:px-0">
            {[{ k: 'alle', l: 'Alle' }, ...STATUSER].map((s) => (
              <button key={s.k} onClick={() => setFilter(s.k)} data-testid={`radar-filter-${s.k}`}
                className={`flex h-[26px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2.5 text-[12px] font-medium transition-all ${filter === s.k ? 'bg-[#1c1917] text-white shadow-[0_1px_3px_rgba(28,25,23,0.25)]' : 'text-[#6f6a61] hover:text-[#1c1917]'}`}>
                {s.farge && <span className="h-[5px] w-[5px] rounded-full" style={{ background: filter === s.k ? '#fff' : s.farge }} />}
                {s.l} <span className={`tabular-nums ${filter === s.k ? 'text-white/50' : 'text-[#c2beb8]'}`}>{antall[s.k] || 0}</span>
              </button>
            ))}
            <select value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'desc' })} data-testid="radar-sort-mobil" aria-label="Sortering"
              className="ml-auto h-[26px] shrink-0 rounded-[7px] border border-black/[0.08] bg-white px-1.5 text-[11.5px] font-medium text-[#57534e] outline-none lg:hidden">
              <option value="potensial">Potensial</option>
              <option value="kvalitet">Kvalitet</option>
              <option value="nyeste">Nyeste</option>
              <option value="pris">Leie</option>
            </select>
          </div>
          <span className="order-2 flex shrink-0 items-center gap-1.5 lg:order-5 lg:ml-auto">
            <span className="flex overflow-hidden rounded-[7px] border border-black/[0.08] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
              <button onClick={() => setVisning('liste')} data-testid="radar-visning-liste" title="Listevisning"
                className={`flex h-[28px] w-9 items-center justify-center transition-colors ${visning === 'liste' ? 'bg-[#1c1917] text-white' : 'text-[#a8a29a] hover:text-[#1c1917]'}`}>
                <List className="h-[15px] w-[15px]" />
              </button>
              <button onClick={() => setVisning('tabell')} data-testid="radar-visning-tabell" title="Tabellvisning — alle AI-delscorer"
                className={`flex h-[28px] w-9 items-center justify-center transition-colors ${visning === 'tabell' ? 'bg-[#1c1917] text-white' : 'text-[#a8a29a] hover:text-[#1c1917]'}`}>
                <Table2 className="h-[15px] w-[15px]" />
              </button>
            </span>
            <select value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'desc' })} data-testid="radar-sort" aria-label="Sortering"
              className="hidden h-[28px] rounded-[7px] border border-black/[0.08] bg-white px-2 text-[12px] font-medium text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] outline-none focus:border-[#1c1917]/25 lg:block">
              <option value="potensial">Høyest potensial</option>
              <option value="kvalitet">Annonsekvalitet</option>
              <option value="nyeste">Nyeste først</option>
              <option value="pris">Høyest leie</option>
            </select>
            <button onClick={() => setVisNy((v) => !v)} data-testid="radar-ny-btn" title="Legg til ny FINN-annonse"
              className="flex h-[28px] items-center gap-1 rounded-[7px] bg-gradient-to-b from-[#2b2825] to-[#131110] px-2 text-[12px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.09),0_1px_2px_rgba(28,25,23,0.2)] transition-all hover:from-[#211f1c] hover:to-[#0a0908] active:scale-[0.98] sm:pr-3">
              <Plus className="h-[14px] w-[14px]" /> <span className="hidden sm:inline">Ny annonse</span>
            </button>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-[#1c1917] px-4 py-2.5 text-white shadow-[0_1px_3px_rgba(28,25,23,0.25)]">
          <span className="text-[13px] font-bold tabular-nums" style={heading}>{utvalg.size} valgt</span>
          <button onClick={() => setUtvalg(new Set(sortert.map((l) => l.id)))} data-testid="radar-velg-alle"
            className="rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
            Velg alle ({sortert.length})
          </button>
          <span className="ml-auto flex items-center gap-1.5">
            {!bulkBekreft ? (
              <button onClick={() => setBulkBekreft(true)} data-testid="radar-bulk-slett"
                className="flex items-center gap-1.5 rounded-[7px] bg-white/10 px-3 py-1.5 text-[12px] font-medium text-[#ff9d95] transition-colors hover:bg-white/15">
                <Trash2 className="h-3.5 w-3.5" /> Slett valgte
              </button>
            ) : (
              <button onClick={bulkSlett} disabled={bulkSletter} data-testid="radar-bulk-slett-bekreft"
                className="flex items-center gap-1.5 rounded-[7px] bg-[#c2413b] px-3 py-1.5 text-[12px] font-medium text-white transition-all hover:bg-[#a93833] disabled:opacity-60">
                {bulkSletter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />} Ja, slett {utvalg.size} leads
              </button>
            )}
            <button onClick={() => { setUtvalg(new Set()); setBulkBekreft(false); }} data-testid="radar-velg-avbryt"
              className="rounded-[7px] px-2.5 py-1.5 text-[12px] font-medium text-white/60 transition-colors hover:bg-white/10 hover:text-white">
              Avbryt
            </button>
          </span>
        </div>
      )}

      {/* Innhold */}
      {laster ? (
        <div className={`${KORT} mt-3 overflow-hidden`} data-testid="radar-skeleton">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex animate-pulse items-center gap-3 border-b border-black/[0.04] px-3.5 py-3 last:border-0 sm:px-5" style={{ animationDelay: `${i * 120}ms` }}>
              <span className="h-[17px] w-[17px] shrink-0 rounded-md bg-[#f1efeb]" />
              <span className="h-14 w-20 shrink-0 rounded-[10px] bg-[#f1efeb]" />
              <span className="min-w-0 flex-1 space-y-2">
                <span className="block h-3.5 w-[38%] rounded bg-[#f1efeb]" />
                <span className="block h-3 w-[55%] rounded bg-[#f4f2ee]" />
              </span>
              <span className="h-10 w-10 shrink-0 rounded-full bg-[#f1efeb]" />
            </div>
          ))}
        </div>
      ) : sortert.length === 0 ? (
        <div className={`${KORT} mt-4 px-5 py-12 text-center`}>
          {leads.length === 0 ? (
            <>
              <p className="text-[13px] text-[#a8a29a]">Ingen annonser ennå — legg inn din første FINN-leieannonse.</p>
              <button onClick={() => setVisNy(true)} data-testid="radar-tom-ny-btn" className={`${KNAPP_PRIMAER} mx-auto mt-4 h-9`}>
                <Plus className="h-4 w-4" /> Ny annonse
              </button>
            </>
          ) : (
            <p className="text-[13px] text-[#a8a29a]">Ingen leads matcher søket/filteret.</p>
          )}
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-4">
          {/* Venstre: liste eller tabell */}
          <div className={`min-w-0 ${splitt ? 'w-[330px] shrink-0 xl:w-[380px]' : 'flex-1'}`}>
            {visning === 'liste' ? (
              <div className={`${KORT} overflow-hidden`}>
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
                      className={`relative flex w-full cursor-pointer items-center gap-3 border-b border-black/[0.04] px-3.5 py-3 text-left transition-colors last:border-0 sm:px-5 ${aktiv ? 'bg-[#f7f6f3]' : erValgt ? 'bg-[#faf9f7]' : 'hover:bg-[#fbfaf9]'}`}>
                      {aktiv && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#1c1917]" />}
                      <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label={erValgt ? 'Fjern markering' : 'Marker lead'}
                        className={`shrink-0 rounded-md p-1 transition-colors ${erValgt ? 'text-[#1c1917]' : 'text-[#ddd8d0] hover:text-[#a8a29a]'}`}>
                        {erValgt ? <CheckSquare className="h-[17px] w-[17px]" /> : <Square className="h-[17px] w-[17px]" />}
                      </button>
                      {(() => {
                        const thumbL = (l.bilder || []).find((b) => !dodeBilder.has(b));
                        return thumbL
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={thumbL} alt="" onError={() => merkDodBilde(thumbL)} className={`shrink-0 rounded-[10px] object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)] ${splitt ? 'h-11 w-16' : 'h-14 w-20'}`} />
                          : <span className={`flex shrink-0 items-center justify-center rounded-[10px] bg-[#f4f2ee] ${splitt ? 'h-11 w-16' : 'h-14 w-20'}`}><Home className="h-4 w-4 text-[#c9c4bd]" /></span>;
                      })()}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`truncate text-[13.5px] font-bold tracking-[-0.01em] ${l.annonseAktiv === false ? 'text-[#a8a29a] line-through decoration-[#d6d2cb]' : 'text-[#1c1917]'}`} style={heading}>{l.adresse || l.tittel}</span>
                          {l.annonseAktiv === false && (
                            <span className="shrink-0 rounded-[4px] bg-[#f4f2ee] px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-[#8a857c]" title="Agenten meldte at annonsen er fjernet fra FINN">Tatt av FINN</span>
                          )}
                          {l.kilde === 'agent' && !splitt && (
                            <span className="shrink-0 rounded-[4px] border border-black/[0.07] bg-[#f7f6f3] px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-[#8a857c]" title="Matet inn av overvåkningsagenten">Agent</span>
                          )}
                        </span>
                        {l.tittel && l.tittel.trim() !== (l.adresse || '').trim() ? (
                          <span className="mt-0.5 block truncate text-[11.5px] text-[#8a857c]" data-testid={`radar-tittel-${l.id}`}>{l.tittel}</span>
                        ) : null}
                        <span className="mt-0.5 flex items-center gap-1.5 truncate text-[12px] tabular-nums text-[#78716c]">
                          <b className="font-semibold text-[#44403c]">{kr(l.pris)}/mnd</b>
                          {(() => {
                            const kutt = sisteKutt(l);
                            return kutt ? (
                              <span className="shrink-0 rounded-[4px] bg-[#e9f6f9] px-1 py-px text-[9.5px] font-bold text-[#0e7490]" title={`Priskutt: ${kr(kutt.fra)} → ${kr(kutt.til)} (${naarSist(kutt.at)})`} data-testid={`radar-kutt-${l.id}`}>↓ −{kutt.pct} %</span>
                            ) : null;
                          })()}
                          {!splitt && l.m2 ? <span className="text-[#a8a29a]">· {l.m2} m²</span> : null}
                          {!splitt && l.soverom ? <span className="text-[#a8a29a]">· {l.soverom} sov</span> : null}
                          {!splitt ? <span className="truncate text-[#a8a29a]">· honorar {kr(rs.honorar)}/mnd</span> : null}
                        </span>
                        {(l.kontaktNavn || l.kontaktTlf) ? (
                          <span className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-[#8a857c]" data-testid={`radar-kontakt-${l.id}`}>
                            <Phone className="h-3 w-3 shrink-0 text-[#a8a29a]" />
                            {l.kontaktNavn ? <span className="truncate font-medium">{l.kontaktNavn}</span> : null}
                            {l.kontaktTlf ? (
                              <a href={`tel:${l.kontaktTlf}`} onClick={(e) => e.stopPropagation()} className="shrink-0 tabular-nums hover:text-[#1c1917] hover:underline">
                                {l.kontaktNavn ? '· ' : ''}{fmtTlf(l.kontaktTlf)}
                              </a>
                            ) : null}
                          </span>
                        ) : null}
                        <span className="mt-1.5 flex items-center gap-2.5">
                          {l.auto && ['analyserer', 'styler'].includes(l.auto.status) ? (
                            <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6f6a61]" data-testid={`radar-auto-status-${l.id}`}>
                              <Loader2 className="h-3 w-3 animate-spin text-[#8b5cf6]" />
                              {l.auto.status === 'analyserer' ? 'Analyserer…' : `Bilder ${l.auto.bilderFerdig || 0}/${l.auto.bilderTotalt || 0}`}
                            </span>
                          ) : (
                            <StatusPrikk s={st} />
                          )}
                          {(l.stylet || []).length > 0 && <Wand2 className="h-3.5 w-3.5 text-[#8b5cf6]" title={`${l.stylet.length} AI-stylede bilder`} />}
                          {(l.aapninger || 0) > 0 && <span className="flex items-center gap-0.5 text-[10.5px] tabular-nums text-[#0e7490]" title={`Tilbudssiden åpnet ${l.aapninger} ganger`}><Eye className="h-3.5 w-3.5" />{l.aapninger}</span>}
                          {l.kilde === 'agent' && splitt && <span className="rounded-[4px] border border-black/[0.07] bg-[#f7f6f3] px-1 py-px text-[8px] font-bold uppercase text-[#8a857c]">Agent</span>}
                          {!splitt && (() => {
                            const stg = nesteSteg(l);
                            return stg ? (
                              <span className="hidden items-center gap-1 text-[11px] font-medium sm:flex" style={{ color: stg.c }} data-testid={`radar-steg-${l.id}`}>
                                <ChevronRight className="h-3 w-3" />{stg.t}
                              </span>
                            ) : null;
                          })()}
                        </span>
                      </span>
                      <PotensialBadge p={l.potensial} id={l.id} />
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={`${KORT} overflow-x-auto`} data-testid="radar-tabell">
                <table className="w-full min-w-[1280px] border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="sticky top-0 z-10 w-10 bg-white/90 px-3.5 py-3 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" />
                      <th className="sticky top-0 z-10 bg-white/90 px-2 py-3 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a8a29a] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">Bolig</th>
                      <th className="sticky top-0 z-10 bg-white/90 px-2 py-3 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a8a29a] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">Utleier</th>
                      <th className="sticky top-0 z-10 bg-white/90 px-2 py-3 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a8a29a] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">Status</th>
                      <th className="sticky top-0 z-10 cursor-pointer bg-white/90 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.09em] text-[#57534e] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" onClick={() => sorter('potensial')} data-testid="radar-tabell-sort-potensial">
                        <span className="flex items-center justify-center gap-0.5">Potensial <SortPil k="potensial" /></span>
                      </th>
                      <th className="sticky top-0 z-10 cursor-pointer bg-white/90 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.09em] text-[#57534e] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" onClick={() => sorter('salgskraft')} data-testid="radar-tabell-sort-salgskraft" title="Hvor selgende annonsen er, sett med leietakers øyne">
                        <span className="flex items-center justify-center gap-0.5">Salgskraft <SortPil k="salgskraft" /></span>
                      </th>
                      <th className="sticky top-0 z-10 cursor-pointer bg-white/90 px-2 py-3 text-center text-[10px] font-bold uppercase tracking-[0.09em] text-[#57534e] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" onClick={() => sorter('kvalitet')}>
                        <span className="flex items-center justify-center gap-0.5">Kvalitet <SortPil k="kvalitet" /></span>
                      </th>
                      {DEL_ETIKETTER.map(([k, lang, kort]) => (
                        <th key={k} className="sticky top-0 z-10 bg-white/90 px-1.5 py-3 text-center text-[10px] font-bold uppercase tracking-[0.09em] text-[#a8a29a] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" title={lang}>{kort}</th>
                      ))}
                      <th className="sticky top-0 z-10 cursor-pointer bg-white/90 px-2 py-3 text-right text-[10px] font-bold uppercase tracking-[0.09em] text-[#57534e] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" onClick={() => sorter('pris')}>
                        <span className="flex items-center justify-end gap-0.5">Leie <SortPil k="pris" /></span>
                      </th>
                      <th className="sticky top-0 z-10 bg-white/90 px-2 py-3 text-right text-[10px] font-bold uppercase tracking-[0.09em] text-[#a8a29a] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">Anbefalt</th>
                      <th className="sticky top-0 z-10 cursor-pointer bg-white/90 px-3.5 py-3 text-right text-[10px] font-bold uppercase tracking-[0.09em] text-[#57534e] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md" onClick={() => sorter('aapnet')}>
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
                          className={`cursor-pointer border-b border-black/[0.04] transition-colors last:border-0 ${erValgt ? 'bg-[#faf9f7]' : 'hover:bg-[#fbfaf9]'}`}>
                          <td className="px-3.5 py-2">
                            <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label="Marker"
                              className={`rounded-md p-0.5 transition-colors ${erValgt ? 'text-[#1c1917]' : 'text-[#ddd8d0] hover:text-[#a8a29a]'}`}>
                              {erValgt ? <CheckSquare className="h-[16px] w-[16px]" /> : <Square className="h-[16px] w-[16px]" />}
                            </button>
                          </td>
                          <td className="px-2 py-2">
                            <span className="flex items-center gap-2.5">
                              {(l.bilder || []).find((b) => !dodeBilder.has(b))
                                // eslint-disable-next-line @next/next/no-img-element
                                ? <img src={(l.bilder || []).find((b) => !dodeBilder.has(b))} alt="" onError={() => merkDodBilde((l.bilder || []).find((b) => !dodeBilder.has(b)))} className="h-9 shrink-0 rounded-[8px] object-cover shadow-[inset_0_0_0_1px_rgba(0,0,0,0.04)]" style={{ width: 52 }} />
                                : <span className="flex h-9 shrink-0 items-center justify-center rounded-[8px] bg-[#f4f2ee]" style={{ width: 52 }}><Home className="h-3.5 w-3.5 text-[#c9c4bd]" /></span>}
                              <span className="min-w-0">
                                <span className="block max-w-[210px] truncate text-[13px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{l.adresse || l.tittel}</span>
                                {l.tittel && l.tittel.trim() !== (l.adresse || '').trim() ? (
                                  <span className="block max-w-[210px] truncate text-[10.5px] text-[#8a857c]" title={l.tittel}>{l.tittel}</span>
                                ) : null}
                                <span className="flex items-center gap-1.5 text-[10.5px] text-[#a8a29a]">
                                  {l.m2 ? `${l.m2} m²` : ''}{l.soverom ? ` · ${l.soverom} sov` : ''}
                                  {l.kilde === 'agent' && <span className="rounded-[3px] border border-black/[0.07] bg-[#f7f6f3] px-1 py-px text-[7.5px] font-bold uppercase text-[#8a857c]">Agent</span>}
                                </span>
                              </span>
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {(l.kontaktNavn || l.kontaktTlf) ? (
                              <span className="block min-w-0" data-testid={`radar-tabell-kontakt-${l.id}`}>
                                {l.kontaktNavn ? <span className="block max-w-[150px] truncate text-[12px] font-medium text-[#44403c]">{l.kontaktNavn}</span> : null}
                                {l.kontaktTlf ? (
                                  <a href={`tel:${l.kontaktTlf}`} onClick={(e) => e.stopPropagation()} className="block text-[11.5px] tabular-nums text-[#78716c] hover:text-[#1c1917] hover:underline">
                                    {fmtTlf(l.kontaktTlf)}
                                  </a>
                                ) : null}
                              </span>
                            ) : <span className="text-[12px] text-[#ddd8d0]">–</span>}
                          </td>
                          <td className="px-2 py-2">
                            {l.auto && ['analyserer', 'styler'].includes(l.auto.status) ? (
                              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#6f6a61]">
                                <Loader2 className="h-3 w-3 animate-spin text-[#8b5cf6]" />
                                {l.auto.status === 'analyserer' ? 'Analyserer' : `${l.auto.bilderFerdig || 0}/${l.auto.bilderTotalt || 0}`}
                              </span>
                            ) : l.annonseAktiv === false ? (
                              <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#a8a29a]">Tatt av FINN</span>
                            ) : (
                              <StatusPrikk s={st} />
                            )}
                          </td>
                          <td className="px-2 py-2 text-center"><span className="inline-flex justify-center"><PotensialBadge p={l.potensial} id={l.id} /></span></td>
                          <td className="px-2 py-2 text-center">
                            {l.ai?.salgskraft?.score != null ? (
                              <ScoreRing verdi={l.ai.salgskraft.score} storrelse={40} strek={3.5}
                                tittel={`Salgskraft ${l.ai.salgskraft.score}/100 — hvor selgende annonsen er`} />
                            ) : <span className="text-[12px] text-[#c9c4bd]">–</span>}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {l.potensial?.annonseScore != null ? (
                              <ScoreRing verdi={l.potensial.annonseScore} forelopig={l.potensial.forelopig} storrelse={40} strek={3.5}
                                tittel={`Annonsekvalitet ${l.potensial.annonseScore}/100`} />
                            ) : <span className="text-[12px] text-[#c9c4bd]">–</span>}
                          </td>
                          {DEL_ETIKETTER.map(([k, lang]) => (
                            <td key={k} className="px-1.5 py-2 text-center">
                              {d?.[k] != null ? (
                                <ScoreRing verdi={Math.round(d[k] * 10)} storrelse={32} strek={3} farge={delFarge(d[k])}
                                  tittel={`${lang}: ${d[k]}/10`} />
                              ) : <span className="text-[12px] text-[#ddd8d0]">–</span>}
                            </td>
                          ))}
                          <td className="px-2 py-2 text-right text-[12.5px] font-semibold tabular-nums text-[#44403c]" style={heading}>{tall(l.pris)}</td>
                          <td className="px-2 py-2 text-right text-[12.5px] tabular-nums text-[#78716c]" style={heading}>{l.analyse?.anbefaltLeie ? tall(l.analyse.anbefaltLeie) : '–'}</td>
                          <td className="px-3.5 py-2 text-right text-[12.5px] tabular-nums text-[#0e7490]">{l.aapninger || 0}</td>
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
            <div className="sticky top-4 min-w-0 flex-1 overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04),0_16px_48px_-20px_rgba(28,25,23,0.14)]" style={{ height: 'calc(100vh - 120px)', minHeight: 520 }}>
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

      {/* Før/etter-sammenligning av AI-stylede bilder */}
      {valgt && sammenlign && aiPar.length > 0 && (
        <SammenlignModal
          par={aiPar}
          idx={Math.min(sammenlign.idx, aiPar.length - 1)}
          setIdx={(fn) => setSammenlign((prev) => ({ idx: typeof fn === 'function' ? fn(prev?.idx || 0) : fn }))}
          onClose={() => setSammenlign(null)}
        />
      )}

      {/* Diskret lagret-kvittering */}
      {lagret && (
        <div className="dh-scale-in pointer-events-none fixed bottom-5 left-1/2 z-[230] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#1c1917] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(28,25,23,0.35)]" data-testid="radar-lagret">
          <Check className="h-3.5 w-3.5 text-[#7ee2a8]" /> Lagret
        </div>
      )}
    </div>
  );
}
