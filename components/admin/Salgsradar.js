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
  Home, Wand2, MessageSquare, ChevronLeft, ChevronRight,
  RefreshCw, Square, CheckSquare, Search, List, Table2, ArrowLeft, ArrowUp, ArrowDown,
  Maximize2, Minimize2, Banknote, Globe, StickyNote, Plus, ChevronDown,
  Columns3, BarChart3, SlidersHorizontal,
} from 'lucide-react';
import { PipelineTavle, SalgSeksjon, ArsakModal, VunnetModal, RapportModal, SelgerBadge, AnnonsorBadge } from './SalgPipeline';
import SalgsSkuffEnkel from './SalgsSkuffEnkel';
import { bydelFraPostnr } from '@/lib/bydeler';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const kr = (v) => `${tall(v)}\u202Fkr`;
// FINN-adresser kommer ofte i små bokstaver — vis dem pent kapitalisert
const pent = (x) => String(x || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());

/* ── DigiHome-designspråk (samme tokens som Leieforhold/Datarom) ─────────────
   Varm blekk #1c1917, gradient-primærknapp, ghost-knapp med hårfin ramme,
   små radier (6-12px), status-prikker i stedet for fargede piller. */
const KNAPP_GHOST = 'flex h-9 items-center gap-1.5 rounded-[9px] border border-black/[0.08] bg-white px-3 text-[13px] font-medium text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917] disabled:opacity-50';
const KNAPP_PRIMAER = 'flex h-9 items-center gap-1.5 rounded-[9px] bg-[#141414] px-4 text-[13px] font-medium text-white transition-colors hover:bg-black/80 active:scale-[0.98] disabled:opacity-40';
const KORT = 'rounded-[12px] border border-[#e7e7e4] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.03)]';

const STATUSER = [
  // Rolig palett: nøytral fremdrift — kun vunnet/tapt får ekte farge
  { k: 'ny', l: 'Ny', farge: '#a3a3a3', bg: '#f4f2ee' },
  { k: 'analysert', l: 'Analysert', farge: '#737373', bg: '#f0efec' },
  { k: 'kontaktet', l: 'Kontaktet', farge: '#525252', bg: '#eceae6' },
  { k: 'dialog', l: 'Dialog', farge: '#171717', bg: '#e7e5e0' },
  { k: 'tilbud', l: 'Tilbud sendt', farge: '#6d28d9', bg: '#f3eefc' },
  { k: 'vunnet', l: 'Vunnet', farge: '#1f7a45', bg: '#eef6f0' },
  { k: 'tapt', l: 'Tapt', farge: '#c2413b', bg: '#fdf0ef' },
  { k: 'ikke_relevant', l: 'Ikke relevant', farge: '#8a8578', bg: '#f2f0eb' },
];
const STIL_VALG = [
  { k: 'optimal', l: 'FINN-optimalisering' },
  { k: 'lysloft', l: 'Lysløft (tomt rom)' },
  { k: 'nordisk', l: 'Møblering — nordisk' },
  { k: 'moderne', l: 'Møblering — moderne' },
  { k: 'varm', l: 'Møblering — varm' },
];
// Ærlig merking + beskrivelse per modus (styling er en bevisst, manuell handling)
const MODUS_INFO = {
  optimal: { l: 'FINN-optimalisering', d: 'Fotoløft + varsom styling av møblerte rom: sengetøy, puter, pledd, rydding. Tomme rom får kun lysløft — aldri møbler.', merk: 'AI-forbedret foto' },
  lysloft: { l: 'Lysløft', d: 'Kun fototeknisk løft — lys, eksponering, hvitbalanse. Ingenting tilføres. Riktig for tomme/umøblerte rom.', merk: 'AI-forbedret foto' },
  nordisk: { l: 'Møblering — nordisk', d: 'Virtuelt møbleringsforslag (lyst, eik, planter). Kun for bevisst bruk — merkes tydelig som illustrasjon.', merk: 'AI-møblert · illustrasjon' },
  moderne: { l: 'Møblering — moderne', d: 'Virtuelt møbleringsforslag (rene linjer, designmøbler). Kun for bevisst bruk — merkes tydelig som illustrasjon.', merk: 'AI-møblert · illustrasjon' },
  varm: { l: 'Møblering — varm', d: 'Virtuelt møbleringsforslag (naturmaterialer, jordtoner). Kun for bevisst bruk — merkes tydelig som illustrasjon.', merk: 'AI-møblert · illustrasjon' },
};
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
      <span className="absolute font-bold leading-none" style={{ ...heading, fontSize: fontPx, color: forelopig ? '#a8a29a' : '#1c1917' }}>
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
    {Ikon && <Ikon className="h-[15px] w-[15px] text-[#a8a29a]" />}
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
        <span className="text-[12px] font-semibold text-white/60" style={heading}>{idx + 1} / {liste.length}</span>
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
          {par.length > 1 && <span className="text-[11.5px] text-white/40">{idx + 1} / {par.length}</span>}
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
  // Standard: nyest lagt til øverst — nye annonser skal alltid være synlige med én gang
  const [sort, setSort] = useState({ key: 'nyeste', dir: 'desc' });
  const [visning, setVisning] = useState('liste');
  const [valgtId, setValgtId] = useState(null);
  const [utvidet, setUtvidet] = useState(false);
  const [fane, setFane] = useState('oversikt'); // record-faner: oversikt · bilder · ai · tilbud · aktivitet
  const [bred, setBred] = useState(true);
  const [ultra, setUltra] = useState(false);
  const [kopiert, setKopiert] = useState(false);
  const [meldingKopiert, setMeldingKopiert] = useState(false);
  const [sletteBekreft, setSletteBekreft] = useState(false);
  const [analyserer, setAnalyserer] = useState(false);
  const [utvalg, setUtvalg] = useState(() => new Set());
  const [bulkBekreft, setBulkBekreft] = useState(false);
  const [bulkSletter, setBulkSletter] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [visNy, setVisNy] = useState(false);
  // ── Salgspipeline: aktør (meg), selgere, eierfilter og dialoger ──
  const [aktor, setAktor] = useState(null); // {id, navn, erLeder}
  const [arsaker, setArsaker] = useState({}); // årsakskatalog for tapt/ikke_relevant
  const [selgere, setSelgere] = useState([]);
  const [eierFilter, setEierFilter] = useState('alle'); // 'alle' | 'mine' | 'pool'
  const [annonsorFilter, setAnnonsorFilter] = useState('alle'); // 'alle' | 'privat' | 'megler'
  const [bydelFilter, setBydelFilter] = useState('alle'); // 'alle' | bydelsnavn
  const [filterMeny, setFilterMeny] = useState(false); // samlet filter-popover
  const [arsakDialog, setArsakDialog] = useState(null); // {lead, status}
  const [vunnetDialog, setVunnetDialog] = useState(null); // {lead}
  const [visRapport, setVisRapport] = useState(false);
  const [retryStarter, setRetryStarter] = useState(false);
  const [statusMeny, setStatusMeny] = useState(false); // kompakt statuscontrol i panelhodet
  const [loggType, setLoggType] = useState('notat'); // composer i Aktivitet-fanen
  const [loggTekst, setLoggTekst] = useState('');
  const [loggSender, setLoggSender] = useState(false);
  const [previewNokkel, setPreviewNokkel] = useState(0); // tvinger reload av tilbuds-previewen
  // Bildestyling — integrert i Bilder-fanen (canvas + inspector, ingen egen seksjon)
  const [styJobber, setStyJobber] = useState([]);
  const [styModus, setStyModus] = useState('optimal'); // 'optimal' | 'lysloft' | 'mobler'
  const [styVariant, setStyVariant] = useState('nordisk');
  const [styIntensitet, setStyIntensitet] = useState('full');
  const [styInstruks, setStyInstruks] = useState('');
  const [styStarter, setStyStarter] = useState(false);
  const [styBusy, setStyBusy] = useState(null);
  const [styFeil, setStyFeil] = useState('');
  const [styValgte, setStyValgte] = useState(() => new Set()); // multivalg i filmstripen
  const [smlPar, setSmlPar] = useState(null); // {ai, original, stil} → fullskjerm før/etter
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPos, setHeroPos] = useState(55); // skillelinje for inline før/etter på hero
  const heroDrag = useRef(null); // {x0, y0, laast: 'slider'|'scroll'|null, flyttet}
  const [heroDrar, setHeroDrar] = useState(false); // styrer om linjen animerer
  // Airbnb-håndtering av portrettbilder: mål aspektforholdet ved innlasting —
  // portrett vises med object-contain over en uskarp cover-bakgrunn i stedet
  // for å croppes brutalt inn i den horisontale rammen.
  const [heroAr, setHeroAr] = useState(null);
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
  // Tilbuds-previewen laster på nytt når en endring lagres — «live» uten å telle åpninger
  useEffect(() => { if (lagret) setPreviewNokkel((k) => k + 1); }, [lagret]);
  useEffect(() => { setHeroIdx(0); setSmlPar(null); setFane('oversikt'); setStatusMeny(false); setLoggTekst(''); }, [valgtId]);
  // Bildestyling-jobber hentes per lead (definert før effektene som bruker den)
  const hentStyJobber = useCallback(async (leadId) => {
    if (!leadId) return;
    try { const j = await api(`styling-jobber?leadId=${leadId}`); setStyJobber(j.jobber || []); } catch (e) { /* stille — prøver igjen */ }
  }, [api]);
  // Bildestyling: nullstill + hent jobber når leaden byttes
  useEffect(() => {
    setStyJobber([]); setStyValgte(new Set()); setStyInstruks(''); setStyFeil(''); setSmlPar(null); setStyIntensitet('full');
    const lSty = leads.find((x) => x.id === valgtId);
    setStyModus(lSty?.foreslattStil === 'lysloft' ? 'lysloft' : 'optimal');
    if (valgtId) hentStyJobber(valgtId);
  }, [valgtId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Poll hvert 4. sekund så lenge stylingjobber kjører
  const styAktive = useMemo(() => styJobber.filter((j) => ['venter', 'kjorer'].includes(j.status)), [styJobber]);
  useEffect(() => {
    if (!styAktive.length || !valgtId) return undefined;
    const t = setInterval(() => hentStyJobber(valgtId), 4000);
    return () => clearInterval(t);
  }, [styAktive.length, valgtId, hentStyJobber]);
  useEffect(() => { setHeroPos(55); setHeroAr(null); }, [heroIdx, valgtId]);
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

  // Salgspipeline-kontekst: hvem er jeg (leder/selger) + selgerlisten
  useEffect(() => {
    (async () => {
      try { const j = await api('meg'); setAktor(j.aktor || null); setArsaker(j.arsaker || {}); } catch (e) { /* stille — pipeline-UI skjules */ }
      try { const j = await api('selgere'); setSelgere(j.selgere || []); } catch (e) { /* stille */ }
    })();
  }, [api]);

  // Annonsør-berikelse: leads uten annonsor-felt (eldre/agent-ingest) fylles
  // i bakgrunnen — én gang per økt, deretter refetch så badges dukker opp
  const berikStartet = useRef(false);
  useEffect(() => {
    if (laster || berikStartet.current) return;
    // Mangler annonsor ELLER beriket m/ eldre parser (v1 fanget ikke privat-telefon)
    if (!leads.some((l) => (!l.annonsor || l.annonsor.v == null) && l.annonseAktiv !== false && l.finnkode)) return;
    berikStartet.current = true;
    (async () => {
      try {
        const j = await api('berik-annonsor', { method: 'POST', body: {} });
        if (j.oppdatert > 0) await hentLeads();
      } catch (e) { /* stille — badges kommer ved neste besøk */ }
    })();
  }, [laster, leads, api, hentLeads]);

  // Diskret «Lagret»-kvittering (gjenbrukes av alle salgsflytt)
  const kvitterLagret = useCallback(() => {
    setLagret(true);
    clearTimeout(lagretTimer.current);
    lagretTimer.current = setTimeout(() => setLagret(false), 1400);
  }, []);

  // Server-svaret er alltid hele leaden — bytt den lokalt uten refetch
  const byttLead = useCallback((j) => {
    if (j?.lead) setLeads((prev) => prev.map((l) => (l.id === j.lead.id ? j.lead : l)));
  }, []);

  const tildel = async (id, brukerId) => {
    setFeil('');
    try { byttLead(await api('tildel', { method: 'POST', body: { id, brukerId } })); kvitterLagret(); } catch (e) { setFeil(e.message); }
  };

  const sendSalgsstatus = async (id, status, ekstra = {}) => {
    setFeil('');
    try {
      byttLead(await api('salgsstatus', { method: 'POST', body: { id, status, ...ekstra } }));
      kvitterLagret();
    } catch (e) { setFeil(e.message); }
    setArsakDialog(null); setVunnetDialog(null); setStatusMeny(false);
  };

  // Sentral statusgate: terminale utfall krever dialog (årsak / verdigrunnlag),
  // alle andre flytt går rett gjennom med salgslogg på kjøpet.
  const onsketStatus = (lead, status) => {
    if (!lead || lead.status === status) return;
    if (status === 'vunnet') { setVunnetDialog({ lead }); setStatusMeny(false); return; }
    if (status === 'tapt' || status === 'ikke_relevant') { setArsakDialog({ lead, status }); setStatusMeny(false); return; }
    sendSalgsstatus(lead.id, status);
  };

  const settOppfolging = async (id, dato) => {
    setFeil('');
    try { byttLead(await api('oppfolging', { method: 'POST', body: { id, dato } })); kvitterLagret(); } catch (e) { setFeil(e.message); }
  };

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

  const veksleValg = (id) => setUtvalg((prev) => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const settLead = (id, fn) => setLeads((prev) => prev.map((x) => (x.id === id ? fn(x) : x)));

  // Aktivitetslogg — legg til / oppdater manuelle innslag (kontakt/notat/oppgave)
  const leggTilLogg = async (leadId) => {
    if (loggSender || !loggTekst.trim()) return;
    setLoggSender(true); setFeil('');
    try {
      const j = await api('lead', { method: 'PUT', body: { id: leadId, loggInnslag: { type: loggType, tekst: loggTekst.trim() } } });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, logg: j.lead?.logg || l.logg } : l)));
      setLoggTekst('');
    } catch (e) { setFeil(e.message); }
    setLoggSender(false);
  };
  const veksleOppgave = async (leadId, innslagId, gjort) => {
    try {
      const j = await api('lead', { method: 'PUT', body: { id: leadId, loggOppdater: { id: innslagId, gjort } } });
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, logg: j.lead?.logg || l.logg } : l)));
    } catch (e) { setFeil(e.message); }
  };

  // ── Bildestyling: manuell, kuratert flyt — velg bilde(r) → generer →
  //    godkjenn/forkast. Kun godkjente bilder brukes i tilbud og annonse. ──
  const styGenerer = async (leadId, kilder) => {
    if (styStarter || !kilder.length) return;
    setStyStarter(true); setStyFeil('');
    const stil = styModus === 'mobler' ? styVariant : styModus;
    try {
      await api('styling-jobber', {
        method: 'POST',
        body: { leadId, bilder: kilder.map((kildeUrl) => ({ kildeUrl, stil, intensitet: styIntensitet, instruks: styInstruks })) },
      });
      setStyValgte(new Set());
      await hentStyJobber(leadId);
    } catch (e) { setStyFeil(e.message); }
    setStyStarter(false);
  };
  const styReview = async (leadId, jobbId, handling) => {
    if (styBusy) return;
    setStyBusy(jobbId); setStyFeil('');
    try {
      await api('styling-review', { method: 'POST', body: { jobbId, handling } });
      await hentStyJobber(leadId);
      if (handling === 'godkjenn') await hentLeads();
    } catch (e) { setStyFeil(e.message); }
    setStyBusy(null);
  };

  const valgt = useMemo(() => leads.find((l) => l.id === valgtId) || null, [leads, valgtId]);
  const filtrert = useMemo(() => {
    let arr = filter === 'alle' ? leads : leads.filter((l) => l.status === filter);
    if (eierFilter === 'mine' && aktor) arr = arr.filter((l) => l.salg?.tildeltTil?.id === aktor.id);
    if (eierFilter === 'pool') arr = arr.filter((l) => !l.salg?.tildeltTil);
    // Privat = huseier uten forvalter (inkl. Husleie.no og uavklarte) — målgruppen.
    // Megler = proff aktør har oppdraget (Utleiemegleren m.fl.) — konkurrent.
    if (annonsorFilter === 'privat') arr = arr.filter((l) => !l.annonsor || ['privat', 'husleie', 'ukjent'].includes(l.annonsor.type));
    if (annonsorFilter === 'megler') arr = arr.filter((l) => ['megler', 'utleiemegleren'].includes(l.annonsor?.type));
    if (bydelFilter !== 'alle') arr = arr.filter((l) => bydelFraPostnr(l.postnr) === bydelFilter);
    const q = sok.trim().toLowerCase();
    if (q) arr = arr.filter((l) => `${l.adresse || ''} ${l.tittel || ''} ${l.postnr || ''} ${bydelFraPostnr(l.postnr)} ${l.annonsor?.orgNavn || ''} ${l.kontaktNavn || ''}`.toLowerCase().includes(q));
    return arr;
  }, [leads, filter, sok, eierFilter, aktor, annonsorFilter, bydelFilter]);

  // Naturlige bydeler blant leadsene (fra postnr) — driver bydelsfilteret
  const bydeler = useMemo(() => {
    const telling = new Map();
    for (const l of leads) {
      const b = bydelFraPostnr(l.postnr);
      if (b) telling.set(b, (telling.get(b) || 0) + 1);
    }
    return [...telling.entries()].sort((a, b) => b[1] - a[1]).map(([navn, antallB]) => ({ navn, antall: antallB }));
  }, [leads]);

  const aktiveFiltre = (filter !== 'alle' ? 1 : 0) + (eierFilter !== 'alle' ? 1 : 0) + (annonsorFilter !== 'alle' ? 1 : 0) + (bydelFilter !== 'alle' ? 1 : 0);
  const nullstillFiltre = () => { setFilter('alle'); setEierFilter('alle'); setAnnonsorFilter('alle'); setBydelFilter('alle'); };
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
    const pipeline = leads.filter((l) => ['analysert', 'kontaktet', 'dialog', 'tilbud'].includes(l.status));
    const honorarPipeline = pipeline.reduce((s, l) => s + (regnestykke(l).honorar || 0), 0);
    const aKontakte = leads.filter((l) => l.status === 'analysert').length;
    const harApnet = leads.filter((l) => (l.aapninger || 0) > 0 && !['vunnet', 'tapt', 'ikke_relevant'].includes(l.status)).length;
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

  // Ett medium per originalfoto — godkjent AI-versjon, ventende kandidat og
  // kjørende jobb kobles på samme motiv (aldri dobbeltoppføringer i galleriet)
  const media = useMemo(() => {
    if (!valgt) return [];
    const stylet = valgt.stylet || [];
    const aiAvKilde = new Map(stylet.map((s) => [s.kildeUrl, s]));
    const jobbAvKilde = new Map();
    for (const j of styJobber) {
      if (['venter', 'kjorer'].includes(j.status)) jobbAvKilde.set(j.kildeUrl, { type: 'kjorer', jobb: j });
      else if (j.status === 'ferdig' && j.review === 'venter' && !jobbAvKilde.has(j.kildeUrl)) jobbAvKilde.set(j.kildeUrl, { type: 'kandidat', jobb: j });
      else if (j.status === 'feilet' && j.review !== 'forkastet' && !jobbAvKilde.has(j.kildeUrl)) jobbAvKilde.set(j.kildeUrl, { type: 'feilet', jobb: j });
    }
    const ut = (valgt.bilder || []).filter((b) => !dodeBilder.has(b)).slice(0, 14).map((b) => {
      const s = aiAvKilde.get(b);
      const jb = jobbAvKilde.get(b);
      return {
        kilde: b,
        kildeOk: true,
        ai: s ? { url: `/api/tilbud/bilde?id=${s.id}`, stil: s.stil } : null,
        kandidat: jb?.type === 'kandidat' ? { url: `/api/tilbud/bilde?id=${jb.jobb.resultatBildeId}`, jobb: jb.jobb } : null,
        kjorer: jb?.type === 'kjorer' ? jb.jobb : null,
        feilet: jb?.type === 'feilet' ? jb.jobb : null,
      };
    });
    const dekket = new Set(ut.map((m) => m.kilde));
    for (const s of stylet) {
      if (!dekket.has(s.kildeUrl)) ut.push({ kilde: s.kildeUrl, kildeOk: false, ai: { url: `/api/tilbud/bilde?id=${s.id}`, stil: s.stil }, kandidat: null, kjorer: null, feilet: null });
    }
    return ut;
  }, [valgt, dodeBilder, styJobber]);
  // Lightbox-liste: beste tilgjengelige versjon per motiv, med ærlig etikett
  const lysbilder = useMemo(() => media.map((m) => ({
    url: m.kandidat?.url || m.ai?.url || m.kilde,
    ai: Boolean(m.kandidat || m.ai),
    etikett: m.kandidat ? 'AI-forslag' : m.ai ? (MODUS_INFO[m.ai.stil]?.merk || 'AI-forbedret') : 'Original',
  })), [media]);

  const splitt = Boolean(valgt) && bred && visning === 'liste' && !utvidet;

  // Den minimalistiske salgs-skuffen (splitt + høyre-ark). Fullvisningen (⤢)
  // beholder hele arbeidsflaten med faner, bildestyling og tilbudsredigering.
  const skuffEnkel = valgt && (
    <SalgsSkuffEnkel
      lead={valgt} aktor={aktor} selgere={selgere} statuser={STATUSER} media={media}
      analyserer={analyserer} styStarter={styStarter} styBusy={styBusy} kopiert={kopiert} meldingKopiert={meldingKopiert}
      onLukk={() => { setValgtId(null); setSletteBekreft(false); }}
      onUtvid={() => setUtvidet(true)}
      onUtvidTilbud={() => { setFane('tilbud'); setUtvidet(true); }}
      onAnalyser={() => analyser(valgt.id)}
      onKopierMelding={() => kopierMelding(valgt)}
      onKopierLenke={() => kopierLenke(valgt)}
      onsketStatus={onsketStatus}
      sendSalgsstatus={sendSalgsstatus}
      onTildel={tildel}
      onOppfolging={settOppfolging}
      onOppdaterFelt={(patch) => oppdater(valgt.id, patch)}
      onStyle={styGenerer}
      onReview={styReview}
    />
  );
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
    const nB = media.length;
    const autoAktiv = Boolean(valgt.auto && ['analyserer', 'styler'].includes(valgt.auto.status));
    const steg = autoAktiv ? null : nesteSteg(valgt);

    // Én primær handling i panelhodet — statusstyrt (én tydelig CTA, ikke mange)
    const primaer = (() => {
      if (autoAktiv || ['vunnet', 'tapt', 'ikke_relevant'].includes(valgt.status)) return null;
      if (valgt.status === 'ny') return { l: 'Kjør AI-analyse', ikon: Sparkles, gjor: () => analyser(valgt.id), spinner: analyserer };
      if (valgt.status === 'analysert') {
        return valgt.kontaktTlf
          ? { l: 'Kontakt huseier', ikon: Phone, href: `tel:${valgt.kontaktTlf}` }
          : { l: meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding', ikon: meldingKopiert ? Check : Copy, gjor: () => kopierMelding(valgt) };
      }
      if (valgt.status === 'kontaktet') return { l: kopiert ? 'Lenke kopiert!' : 'Send tilbud', ikon: kopiert ? Check : Copy, gjor: () => kopierLenke(valgt) };
      if (valgt.status === 'dialog') return { l: 'Marker som vunnet', ikon: Check, gjor: () => onsketStatus(valgt, 'vunnet') };
      return null;
    })();

    // Ekte hendelser til tidslinjen — kun det som faktisk finnes i data.
    // Tilbudsåpninger grupperes til én oppsummert hendelse (ikke 20 rader).
    const hendelser = (() => {
      const evs = [];
      for (const e of (valgt.logg || [])) evs.push({ at: e.at, type: e.type, tekst: e.tekst, id: e.id, gjort: e.gjort });
      for (const kx of (valgt.kontaktLogg || [])) evs.push({ at: kx.at, type: 'svar', tekst: `${kx.navn} (${kx.telefon}) — ${kx.melding || 'ba om å bli ringt'}` });
      if ((valgt.aapninger || 0) > 0 && valgt.sistAapnet) evs.push({ at: valgt.sistAapnet, type: 'aapning', tekst: `Tilbudet åpnet ${valgt.aapninger}×` });
      for (const h of (valgt.prisHistorikk || [])) if (h.at) evs.push({ at: h.at, type: 'pris', tekst: `Prisendring på FINN: ${tall(h.fra)} → ${kr(h.til)}` });
      if (valgt.ai?.at) evs.push({ at: valgt.ai.at, type: 'analyse', tekst: 'AI-analyse kjørt' });
      if (valgt.createdAt) evs.push({ at: valgt.createdAt, type: 'hentet', tekst: 'Lead hentet inn' });
      return evs.sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));
    })();

    // Flat seksjonsstil — hårfin skillelinje i stedet for kort-i-kort
    const FLAT = 'border-t border-black/[0.07] pt-5 first:border-t-0 first:pt-0';
    // Delt formspråk: myk flate + rolig etikett (brukes i Oversikt og Bilder)
    const FLATE = 'rounded-[12px] bg-[#f7f6f4] p-4 sm:p-5';
    const ETIKETT = 'text-[13px] font-medium text-[#8f8a82]';
    const HENDELSE_IKON = { notat: StickyNote, kontakt: Phone, oppgave: CheckSquare, svar: MessageSquare, aapning: Eye, pris: Banknote, analyse: Sparkles, hentet: Radar };

    const hIdx = Math.min(heroIdx, Math.max(0, nB - 1));
    const mAkt = media[hIdx];
    // Slider vises når det finnes en AI-versjon/kandidat OG originalen fortsatt lever.
    // Kandidat (venter på godkjenning) prioriteres over godkjent AI-versjon.
    const sliderTopp = mAkt ? (mAkt.kandidat?.url || mAkt.ai?.url || null) : null;
    const heroSml = Boolean(mAkt && sliderTopp && mAkt.kildeOk);
    const heroVis = mAkt ? (mAkt.kildeOk ? mAkt.kilde : (mAkt.ai?.url || mAkt.kilde)) : null;
    const erPortrett = heroAr != null && heroAr < 0.85;
    const heroFit = erPortrett ? 'object-contain' : 'object-cover';
    const heroH = 'h-[260px] min-[440px]:h-[320px] sm:h-[430px]';
    const settAr = (e) => { const w = e.target.naturalWidth; const h = e.target.naturalHeight; if (w && h) setHeroAr(w / h); };
    const blurBak = erPortrett && (heroVis || heroSml) ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={heroSml ? sliderTopp : heroVis} alt="" aria-hidden="true" draggable={false}
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-2xl saturate-[1.1]" />
    ) : null;
    const kandidatAntall = media.filter((m) => m.kandidat).length;
    const mVurd = mAkt ? (ai?.bildeVurdering || []).find((x) => x.url === mAkt.kilde) : null;
    const bulkValg = [...styValgte].filter((k) => media.some((m) => m.kilde === k && m.kildeOk));

    /* Stylingkontroller — gjenbrukes for ett bilde og for flervalg */
    const stylingKontroller = (kjorLabel, kilder) => (
      <div className="mt-3 space-y-2.5" data-testid="radar-styling-kontroller">
        <div className="flex flex-wrap items-center gap-1.5">
          {[['optimal', 'FINN-klar'], ['lysloft', 'Lysløft'], ['mobler', 'Møblering']].map(([k, l]) => (
            <button key={k} onClick={() => setStyModus(k)} data-testid={`radar-modus-${k}`}
              className={`h-8 rounded-[8px] px-2.5 text-[12.5px] font-medium transition-all ${styModus === k ? 'bg-[#1c1917] text-white' : 'bg-white text-[#78716c] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.07)] hover:text-[#1c1917]'}`}>
              {l}
            </button>
          ))}
        </div>
        {styModus === 'mobler' && (
          <select value={styVariant} onChange={(e) => setStyVariant(e.target.value)} data-testid="radar-staging-variant"
            className="h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-2 text-[13px] outline-none focus:border-[#1c1917]/25">
            <option value="nordisk">Nordisk stil</option>
            <option value="moderne">Moderne stil</option>
            <option value="varm">Varm stil</option>
          </select>
        )}
        {(MODUS_INFO[styModus === 'mobler' ? styVariant : styModus] || {}).d && (
          <p className="text-[12px] leading-relaxed text-[#8f8a82]">{MODUS_INFO[styModus === 'mobler' ? styVariant : styModus].d}</p>
        )}
        <div className="flex items-center gap-1.5">
          {[['varsom', 'Varsom'], ['full', 'Full effekt']].map(([k, l]) => (
            <button key={k} onClick={() => setStyIntensitet(k)} data-testid={`radar-intensitet-${k}`}
              className={`h-7 rounded-[7px] px-2 text-[12px] font-medium transition-colors ${styIntensitet === k ? 'bg-[#ece9e4] text-[#1c1917]' : 'text-[#a6a19a] hover:text-[#57534e]'}`}>
              {l}
            </button>
          ))}
        </div>
        <input value={styInstruks} onChange={(e) => setStyInstruks(e.target.value)} maxLength={500} data-testid="radar-styling-instruks"
          placeholder="Egen instruks (valgfritt)…"
          className="h-9 w-full rounded-[8px] border border-black/[0.08] bg-white px-3 text-[13px] outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#1c1917]/25" />
        <button onClick={() => styGenerer(valgt.id, kilder)} disabled={styStarter || !kilder.length} data-testid="radar-styling-generer" className={`${KNAPP_PRIMAER} w-full justify-center`}>
          {styStarter ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} {kjorLabel}
        </button>
        <p className="text-[11.5px] leading-relaxed text-[#a6a19a]">~30–60 sek per bilde. Ingenting brukes før du har godkjent resultatet.</p>
      </div>
    );

    /* Inspector — kontekst og handlinger for valgt bilde (eller flervalget) */
    const bildeInspektor = (
      <aside className={FLATE} data-testid="radar-bilde-inspektor">
        {bulkValg.length > 0 ? (
          <>
            <div className="flex items-baseline justify-between">
              <p className={ETIKETT}>{bulkValg.length} bilder valgt</p>
              <button onClick={() => setStyValgte(new Set())} data-testid="radar-bulk-avbryt" className="text-[12.5px] font-medium text-[#8f8a82] transition-colors hover:text-[#1c1917]">Avbryt</button>
            </div>
            {stylingKontroller(`Forbedre ${bulkValg.length} bilder`, bulkValg)}
            {styFeil && <p className="mt-2.5 text-[12.5px] text-[#b3261e]" data-testid="radar-styling-feil">{styFeil}</p>}
          </>
        ) : !mAkt ? null : (
          <>
            <p className={ETIKETT}>{mVurd?.rom ? mVurd.rom.charAt(0).toUpperCase() + mVurd.rom.slice(1) : `Bilde ${hIdx + 1} av ${nB}`}</p>
            {mVurd && (
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6f6a63]">
                <span className="font-semibold" style={{ color: delFarge(mVurd.score) }}>{mVurd.score}/10</span>{mVurd.funn ? ` — ${mVurd.funn}` : ''}
              </p>
            )}
            {mAkt.kjorer ? (
              <div className="mt-3 flex items-center gap-2.5 text-[13px] text-[#57534e]" data-testid="radar-inspektor-kjorer">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8b5cf6]" /> Forbedres med AI — tar 30–60 sek…
              </div>
            ) : mAkt.kandidat ? (
              <>
                <p className="mt-3 text-[13px] leading-relaxed text-[#57534e]">AI-forslaget ligger på bildet — dra i linjen for å sammenligne med originalen.</p>
                <div className="mt-3 space-y-2">
                  <button onClick={() => styReview(valgt.id, mAkt.kandidat.jobb.id, 'godkjenn')} disabled={Boolean(styBusy)} data-testid="radar-review-godkjenn" className={`${KNAPP_PRIMAER} w-full justify-center`}>
                    {styBusy === mAkt.kandidat.jobb.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Bruk bildet
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => styReview(valgt.id, mAkt.kandidat.jobb.id, 'provIgjen')} disabled={Boolean(styBusy)} data-testid="radar-review-provigjen" className={`${KNAPP_GHOST} flex-1 justify-center`}>
                      <RefreshCw className="h-3.5 w-3.5" /> Prøv igjen
                    </button>
                    <button onClick={() => styReview(valgt.id, mAkt.kandidat.jobb.id, 'forkast')} disabled={Boolean(styBusy)} data-testid="radar-review-forkast"
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-[9px] px-3 text-[13px] font-medium text-[#b3261e] transition-colors hover:bg-[#fdf0ef] disabled:opacity-50">
                      Forkast
                    </button>
                  </div>
                  <button onClick={() => setSmlPar({ ai: mAkt.kandidat.url, original: mAkt.kilde, stil: mAkt.kandidat.jobb.stil })} data-testid="radar-kandidat-fullskjerm"
                    className="w-full text-center text-[12.5px] font-medium text-[#6d28d9] hover:underline">
                    Sammenlign i fullskjerm
                  </button>
                </div>
              </>
            ) : (
              <>
                {mAkt.feilet && (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#b3261e]" data-testid="radar-styling-feilet">Forrige forsøk feilet{mAkt.feilet.feil ? ` — ${mAkt.feilet.feil}` : ''}. Prøv gjerne igjen.</p>
                )}
                {mAkt.ai && (
                  <div className="mt-2.5 flex items-center justify-between gap-2 text-[13px]">
                    <span className="flex items-center gap-1.5 font-medium text-[#6d28d9]"><Sparkles className="h-3.5 w-3.5" /> AI-versjonen brukes i tilbudet</span>
                    <button onClick={() => setSmlPar({ ai: mAkt.ai.url, original: mAkt.kilde, stil: mAkt.ai.stil })} data-testid="radar-ai-fullskjerm" className="shrink-0 text-[12.5px] font-medium text-[#6d28d9] hover:underline">Fullskjerm</button>
                  </div>
                )}
                {mAkt.kildeOk ? (
                  stylingKontroller(mAkt.ai ? 'Lag ny versjon' : 'Forbedre dette bildet', [mAkt.kilde])
                ) : (
                  <p className="mt-2 text-[12.5px] leading-relaxed text-[#a6a19a]">Originalen er fjernet fra FINN — den godkjente AI-versjonen beholdes i tilbudet.</p>
                )}
              </>
            )}
            {styFeil && <p className="mt-2.5 text-[12.5px] text-[#b3261e]" data-testid="radar-styling-feil">{styFeil}</p>}
            <p className="mt-4 border-t border-black/[0.06] pt-3 text-[12px] leading-relaxed text-[#a6a19a]">Huk av flere bilder i filmstripen for å forbedre dem samlet.</p>
          </>
        )}
      </aside>
    );

    /* ── Bilder-fanen: én integrert media-arbeidsflate — canvas + filmstrip +
       inspector. Styling og godkjenning skjer PÅ det valgte bildet, ikke i en
       egen seksjon. ── */
    const sekBilder = nB > 0 ? (
      <div data-testid="radar-bilder-flate" className={toKol ? 'mx-auto grid w-full max-w-[1160px] grid-cols-[minmax(0,1fr)_300px] items-start gap-8' : 'mx-auto max-w-[860px]'}>
        <div className="min-w-0">
          {kandidatAntall > 0 && !mAkt?.kandidat && (
            <button onClick={() => setHeroIdx(Math.max(0, media.findIndex((m) => m.kandidat)))} data-testid="radar-kandidat-varsel"
              className="mb-2.5 flex items-center gap-1.5 rounded-[8px] bg-[#fdf6ec] px-3 py-2 text-[13px] font-medium text-[#9a6b1c] transition-colors hover:bg-[#fbeed9]">
              <Sparkles className="h-3.5 w-3.5" /> {kandidatAntall} AI-forslag venter på godkjenning — trykk for å se
            </button>
          )}
          {/* Canvas — AI-versjoner viser før/etter-slider DIREKTE på bildet.
              Mobil: retningslås — vertikal bevegelse scroller siden, horisontal
              drar slideren, trykk flytter linjen dit med animasjon. */}
          <div className={`group relative overflow-hidden rounded-[12px] bg-[#f4f2ee] ${heroSml ? 'cursor-ew-resize' : ''}`} data-testid="radar-galleri-hero"
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
                {blurBak}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mAkt.kilde} alt="Original" draggable={false} data-testid="radar-galleri-bilde"
                  onError={() => merkDodBilde(mAkt.kilde)} onLoad={settAr}
                  className={`relative w-full select-none ${heroFit} ${heroH}`} />
                <span className="pointer-events-none absolute inset-0" style={{ clipPath: `inset(0 ${100 - heroPos}% 0 0)`, transition: heroDrar ? 'none' : 'clip-path .22s ease' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sliderTopp} alt="AI-versjon" draggable={false} className={`h-full w-full select-none ${heroFit}`} />
                </span>
                <span className="pointer-events-none absolute inset-y-0 z-10" style={{ left: `${heroPos}%`, transition: heroDrar ? 'none' : 'left .22s ease' }} data-testid="radar-hero-slider">
                  <span className="absolute inset-y-0 -ml-px w-[2px] bg-white/95 shadow-[0_0_8px_rgba(0,0,0,0.45)]" />
                  <span className="absolute top-1/2 -ml-[17px] -mt-[17px] flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.3)] sm:-ml-[15px] sm:-mt-[15px] sm:h-[30px] sm:w-[30px]">
                    <ChevronLeft className="-mr-0.5 h-3 w-3 text-[#1c1917]" /><ChevronRight className="-ml-0.5 h-3 w-3 text-[#1c1917]" />
                  </span>
                </span>
                <span className={`pointer-events-none absolute left-3 top-3 rounded-[5px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white ${mAkt.kandidat ? 'bg-[#b45309]/90' : 'bg-[#8b5cf6]/90'}`} style={{ opacity: heroPos > 14 ? 1 : 0, transition: 'opacity .2s' }}>
                  {mAkt.kandidat ? 'AI-forslag' : (MODUS_INFO[mAkt.ai?.stil]?.merk || 'AI-forbedret')}
                </span>
                <span className="pointer-events-none absolute right-3 top-3 rounded-[5px] bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ opacity: heroPos < 86 ? 1 : 0, transition: 'opacity .2s' }}>Original</span>
                <button onClick={(e) => { e.stopPropagation(); setSmlPar({ ai: sliderTopp, original: mAkt.kilde, stil: mAkt.kandidat?.jobb?.stil || mAkt.ai?.stil }); }} onPointerDown={(e) => e.stopPropagation()} data-testid="radar-se-foretter" title="Åpne før/etter i fullskjerm"
                  className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-[8px] bg-white/95 px-2.5 py-1.5 text-[12px] font-medium text-[#1c1917] shadow-[0_2px_8px_rgba(0,0,0,0.18)] transition-all hover:bg-white">
                  <Maximize2 className="h-3 w-3" /> Fullskjerm
                </button>
              </>
            ) : (
              <>
                {blurBak}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={heroVis} alt="" draggable={false}
                  onClick={() => setLightbox({ idx: hIdx })}
                  onError={mAkt && mAkt.kildeOk && !mAkt.ai ? () => merkDodBilde(mAkt.kilde) : undefined}
                  onLoad={settAr}
                  data-testid="radar-galleri-bilde" role="button" tabIndex={0}
                  className={`relative w-full cursor-pointer transition-transform duration-500 ${heroFit} ${heroH}`} />
                <span className="pointer-events-none absolute left-3 top-3 rounded-[5px] bg-black/45 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  {mAkt && !mAkt.kildeOk && mAkt.ai ? (MODUS_INFO[mAkt.ai.stil]?.merk || 'AI-forbedret') : 'Original'}
                </span>
              </>
            )}
            {mAkt?.kjorer && (
              <span className="pointer-events-none absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-[8px] bg-black/60 px-2.5 py-1.5 text-[12px] font-medium text-white">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Forbedres med AI…
              </span>
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
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-[5px] bg-black/55 px-2 py-0.5 text-[11px] font-medium text-white">{hIdx + 1} / {nB}</span>
          </div>
          {/* Filmstrip — status på hvert motiv + avhuking for samlet forbedring */}
          <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
            {media.map((m, i) => {
              const visUrl = m.kandidat?.url || m.ai?.url || m.kilde;
              const valgtThumb = styValgte.has(m.kilde);
              return (
                <div key={m.kilde} className="group/t relative shrink-0">
                  <button type="button" onClick={() => setHeroIdx(i)} data-testid={`radar-thumb-${i}`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={visUrl} alt="" draggable={false}
                      onError={m.kildeOk && !m.ai && !m.kandidat ? () => merkDodBilde(m.kilde) : undefined}
                      className={`h-[56px] w-[80px] rounded-[9px] object-cover transition-all ${i === hIdx ? 'ring-2 ring-[#1c1917] ring-offset-1' : valgtThumb ? 'ring-2 ring-[#8b5cf6] ring-offset-1' : 'opacity-85 hover:opacity-100'}`} />
                  </button>
                  {m.kandidat ? (
                    <span className="pointer-events-none absolute left-1 top-1 rounded-[4px] bg-[#b45309]/95 px-1 py-px text-[8px] font-bold uppercase text-white">Se over</span>
                  ) : m.ai ? (
                    <span className="pointer-events-none absolute left-1 top-1 rounded-[4px] bg-[#8b5cf6]/90 px-1 py-px text-[8px] font-bold uppercase text-white">AI</span>
                  ) : null}
                  {m.kjorer && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[9px] bg-black/35">
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    </span>
                  )}
                  {m.kildeOk && !m.kjorer && !m.kandidat && (
                    <button type="button" data-testid={`radar-thumb-velg-${i}`} aria-label="Velg for AI-forbedring" title="Velg for AI-forbedring"
                      onClick={(e) => { e.stopPropagation(); setStyValgte((prev) => { const n = new Set(prev); if (n.has(m.kilde)) n.delete(m.kilde); else n.add(m.kilde); return n; }); }}
                      className={`absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-[5px] transition-all ${valgtThumb ? 'bg-[#8b5cf6] text-white' : `bg-white/90 text-transparent shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:text-[#b5b0a8] ${styValgte.size > 0 ? '' : 'lg:opacity-0 lg:group-hover/t:opacity-100'}`}`}>
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div className={toKol ? '' : 'mt-3'}>{bildeInspektor}</div>
      </div>
    ) : (
      <p className="text-[13.5px] text-[#a6a19a]">Ingen bilder på denne annonsen.</p>
    );

    /* ── AI-fanen: én samlet vurdering + konkrete anbefalinger — tekst, ikke donuts ── */
    // Tillit: analysen kan ha kjørt uten tilgang til bildene (0 målt, men recorden HAR bilder).
    // Da viser vi aldri nullstatistikk eller «ingen bilder» — vi sier ærlig at bildeanalysen mangler.
    const bildeanalyseMangler = Boolean(ai && (ai.teknisk?.maltBilder || 0) === 0 && (valgt.bilder || []).length > 0);
    const funnListe = (ai?.funn || []).filter((f) => !((valgt.bilder || []).length > 0 && /ingen bilder|uten bilder|mangler bilder|bilder (er )?ikke tilgjengelig/i.test(String(f))));
    const anbefalinger = !ai ? [] : (() => {
      const ut = [];
      const antStylet = (valgt.stylet || []).length;
      const kuttA = sisteKutt(valgt);
      if ((valgt.aapninger || 0) > 0 && !['dialog', 'vunnet', 'tapt'].includes(valgt.status)) {
        ut.push({ t: `Huseier har åpnet tilbudet ${valgt.aapninger}× — følg opp mens interessen er varm`, k: valgt.kontaktTlf ? 'Ring huseier' : 'Kopier melding', href: valgt.kontaktTlf ? `tel:${valgt.kontaktTlf}` : null, gjor: valgt.kontaktTlf ? null : () => kopierMelding(valgt) });
      }
      if (kuttA?.fersk && !['vunnet', 'tapt'].includes(valgt.status)) {
        ut.push({ t: `Utleier kuttet prisen −${kuttA.pct} % nylig — motivert utleier, ta kontakt nå`, k: valgt.kontaktTlf ? 'Ring huseier' : 'Kopier melding', href: valgt.kontaktTlf ? `tel:${valgt.kontaktTlf}` : null, gjor: valgt.kontaktTlf ? null : () => kopierMelding(valgt) });
      }
      if ((ai.stylingPotensial === 'høy' || ai.stylingPotensial === 'middels' || (ai.annonseScore || 0) < 60) && antStylet === 0 && (valgt.bilder || []).length > 0) {
        ut.push({ t: `Bildene har ${ai.stylingPotensial === 'høy' ? 'høyt' : 'reelt'} forbedringspotensial — kjør AI-styling før tilbudet sendes`, k: 'Åpne Bilder', gjor: () => setFane('bilder') });
      }
      if (valgt.pris && rs.anbefalt > valgt.pris) {
        ut.push({ t: `Vi anbefaler ${kr(rs.anbefalt)}/mnd — ${kr(rs.anbefalt - valgt.pris)} over dagens leie. Bruk gevinsten som hovedargument`, k: 'Åpne Tilbud', gjor: () => setFane('tilbud') });
      }
      if (valgt.status === 'analysert' && ai.finnMelding) {
        ut.push({ t: 'Leaden er analysert og klar — send FINN-meldingen til huseier', k: 'Kopier melding', gjor: () => kopierMelding(valgt) });
      }
      return ut.slice(0, 3);
    })();

    const sekAnalyse = (
      <div className="mx-auto max-w-[860px]" data-testid="radar-analyse">
        {!ai ? (
          analyserer ? (
            <div className="flex items-center gap-3 text-[13px] text-[#57534e]">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#8b5cf6]" /> Analyserer bilder, piksler og tekst — tar 15–40 sekunder…
            </div>
          ) : (
            <div>
              <p className="max-w-[620px] text-[13px] leading-relaxed text-[#78716c]">AI-en vurderer bildene enkeltvis, hvor selgende annonsen er som helhet, pluss lys, skarphet, ryddighet og tekst. Du får en samlet vurdering, konkrete anbefalinger, FINN-melding og personlig tilbudstekst.</p>
              <button onClick={() => analyser(valgt.id)} data-testid="radar-analyser-btn" className={`${KNAPP_PRIMAER} mt-4`}>
                <Sparkles className="h-3.5 w-3.5" /> Kjør AI-analyse
              </button>
            </div>
          )
        ) : (
          <div data-testid="radar-analyse-resultat">
            {/* Scorelinje — tall som tekst, ikke ringer */}
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              {[
                ['Potensial', ai.potensialScore, 'Hvor vinnbar leaden er for oss'],
                ...(ai.salgskraft ? [['Salgskraft', bildeanalyseMangler && !ai.salgskraft.score ? null : ai.salgskraft.score, 'Hvor selgende annonsen er']] : []),
                ['Kvalitet i dag', ai.annonseScore, 'Hvor god annonsen er nå'],
              ].map(([l, v, hint]) => (
                <span key={l} className="flex items-baseline gap-1.5" title={hint}>
                  <span className="text-[17px] font-bold text-[#171717]" style={heading}>{v ?? '–'}</span>
                  <span className="text-[12px] text-[#737373]">{l}</span>
                </span>
              ))}
              <span className="ml-auto flex items-center gap-2 text-[11px] text-[#b5b0a8]">
                {ai.tekstModell ? <span title={`Bildeanalyse: Gemini · Tekster skrevet av ${ai.tekstModell}`}>tekster: {ai.tekstModell} · </span> : null}{naarSist(ai.at)}
                <button onClick={() => analyser(valgt.id)} disabled={analyserer} data-testid="radar-analyser-btn" title="Kjør analysen på nytt"
                  className="flex h-7 items-center gap-1.5 rounded-[7px] px-2 text-[11.5px] font-medium text-[#a8a29a] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917] disabled:opacity-50">
                  {analyserer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} På nytt
                </button>
              </span>
            </div>

            {/* Ærlig varsel når analysen ikke fikk målt bildene */}
            {bildeanalyseMangler && (
              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12.5px] font-medium text-[#9a6b1c]" data-testid="radar-ai-bildevarsel">
                <span>Bildeanalysen er ikke kjørt ennå — analysen fikk ikke målt de {(valgt.bilder || []).length} bildene.</span>
                <button onClick={() => analyser(valgt.id)} disabled={analyserer} className="font-semibold underline-offset-2 hover:underline disabled:opacity-50">Kjør på nytt</button>
              </div>
            )}

            {/* Vurderingen — det AI-en faktisk mener */}
            {ai.salgsvinkel && (
              <div className="mt-6 border-t border-black/[0.07] pt-5">
                <p className="text-[12.5px] font-medium text-[#8f8a82]">Vurdering · stylingpotensial {ai.stylingPotensial}</p>
                <p className="mt-2 max-w-[640px] text-[14px] leading-relaxed text-[#292524]">{ai.salgsvinkel}</p>
              </div>
            )}

            {/* Anbefalinger — konkrete, hver knyttet til en handling */}
            {anbefalinger.length > 0 && (
              <div className="mt-6 border-t border-black/[0.07] pt-5" data-testid="radar-anbefalinger">
                <p className="text-[12.5px] font-medium text-[#8f8a82]">Anbefalinger</p>
                <div className="mt-3 space-y-3">
                  {anbefalinger.map((a, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#f4f0fb] text-[10.5px] font-bold text-[#6d28d9]">{i + 1}</span>
                      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[#404040]">{a.t}</p>
                      {a.href ? (
                        <a href={a.href} className={`${KNAPP_GHOST} h-7 shrink-0 px-2.5 text-[11.5px]`}>{a.k}</a>
                      ) : (
                        <button onClick={a.gjor} className={`${KNAPP_GHOST} h-7 shrink-0 px-2.5 text-[11.5px]`}>{a.k}</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Funn — filtrert for utsagn som motsier recorden (f.eks. «ingen bilder» når bilder finnes) */}
            {funnListe.length > 0 && (
              <div className="mt-6 border-t border-black/[0.07] pt-5">
                <p className="text-[12.5px] font-medium text-[#8f8a82]">Funn fra annonsen</p>
                <ul className="mt-3 space-y-1.5">
                  {funnListe.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-[#404040]">
                      <span className="mt-[8px] h-1 w-1 shrink-0 rounded-full bg-[#8b5cf6]" />{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Delscorer — kompakt tekstgrid uten progressbarer */}
            <div className="mt-6 border-t border-black/[0.07] pt-5">
              <p className="text-[12.5px] font-medium text-[#8f8a82]">Delscorer</p>
              <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-3">
                {DEL_ETIKETTER.map(([k, etikett]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] text-[#78716c]">{etikett}</span>
                    <span className="shrink-0 text-[12.5px] font-bold" style={{ ...heading, color: delFarge(ai.deler?.[k]) }}>{ai.deler?.[k] ?? '–'}</span>
                  </div>
                ))}
                {ai.salgskraft?.deler && [
                  ['forsteinntrykk', 'Førsteinntrykk'],
                  ['appell', 'Appell'],
                  ['dekning', 'Romdekning'],
                  ['tekstSalg', 'Tekst som selger'],
                ].map(([k, etikett]) => (
                  <div key={k} className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[12.5px] text-[#78716c]">{etikett}</span>
                    <span className="shrink-0 text-[12.5px] font-bold" style={{ ...heading, color: delFarge(ai.salgskraft.deler?.[k]) }}>{ai.salgskraft.deler?.[k] ?? '–'}</span>
                  </div>
                ))}
              </div>
              {/* Tillit: aldri «0 av 0» — mangler målingen, si det ærlig */}
              {ai.teknisk && (ai.teknisk.maltBilder || 0) > 0 ? (
                <p className="mt-3 text-[11px] text-[#a8a29a]">
                  {ai.teknisk.maltBilder} av {ai.teknisk.antallBilder} bilder målt
                  {ai.teknisk.snittMp != null ? ` · snitt ${ai.teknisk.snittMp} MP` : ''}
                  {ai.teknisk.andelPortrett != null ? ` · ${Math.round(ai.teknisk.andelPortrett * 100)} % portrett${ai.teknisk.andelPortrett >= 0.8 ? ' (tyder på mobilbilder)' : ''}` : ''}
                </p>
              ) : (valgt.bilder || []).length > 0 ? (
                <p className="mt-3 text-[11px] text-[#a8a29a]" data-testid="radar-bildeanalyse-mangler">Bildeanalysen er ikke kjørt ennå — kjør analysen på nytt for å måle bildene.</p>
              ) : null}
            </div>

            {/* Bilde for bilde — kun når faktiske vurderinger finnes */}
            {(ai.bildeVurdering || []).length > 0 && (
              <div className="mt-6 border-t border-black/[0.07] pt-5" data-testid="radar-bildevurdering">
                <p className="text-[12.5px] font-medium text-[#8f8a82]">Bilde for bilde</p>
                <div className="mt-3 space-y-1">
                  {ai.bildeVurdering.map((bv, i) => (
                    <div key={i} className="flex items-center gap-2.5 border-b border-black/[0.04] py-1.5 last:border-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={bv.url} alt="" className="h-9 w-12 shrink-0 rounded-[6px] object-cover" />
                      <span className="w-[74px] shrink-0 text-[12px] font-semibold capitalize text-[#57534e]" style={heading}>{bv.rom}</span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#78716c]" title={bv.funn}>{bv.funn || '—'}</span>
                      <span className="shrink-0 text-[12.5px] font-bold" style={{ ...heading, color: delFarge(bv.score) }}>{bv.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );

    const sekOkonomi = (
      <section className={FLAT}>
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
              className="h-9 w-full rounded-[8px] border border-black/[0.08] px-3 text-[13px] outline-none transition-colors focus:border-[#1c1917]/30" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11.5px] font-medium text-[#78716c]">Honorar (% eks. mva)</span>
            <input type="number" min="4" max="15" step="0.5" value={valgt.analyse?.honorarPct ?? 8} data-testid="radar-honorar-input"
              onChange={(e) => settLead(valgt.id, (x) => ({ ...x, analyse: { ...x.analyse, honorarPct: Number(e.target.value) } }))}
              onBlur={(e) => oppdater(valgt.id, { analyse: { anbefaltLeie: valgt.analyse?.anbefaltLeie, honorarPct: Number(e.target.value) } })}
              className="h-9 w-full rounded-[8px] border border-black/[0.08] px-3 text-[13px] outline-none transition-colors focus:border-[#1c1917]/30" />
          </label>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-black/[0.06] bg-black/[0.06]">
          {[['Vårt honorar', kr(rs.honorar), '#6d28d9'], ['Netto til eier', kr(rs.netto), '#1f7a45'],
            ['vs. i dag', rs.gevinst == null ? '–' : `${rs.gevinst >= 0 ? '+' : '−'}${kr(Math.abs(rs.gevinst))}`, rs.gevinst != null && rs.gevinst < 0 ? '#c2413b' : '#1f7a45']].map(([l, v, c]) => (
            <div key={l} className="bg-[#fbfaf9] px-2.5 py-3 sm:px-3.5">
              <p className="text-[9.5px] font-medium uppercase tracking-[0.05em] text-[#a8a29a] sm:text-[10px] sm:tracking-[0.06em]">{l}</p>
              <p className="mt-0.5 text-[13px] font-bold min-[420px]:text-[14px] sm:text-[15px]" style={{ ...heading, color: c }}>{v}<span className="text-[10px] font-medium text-[#b8b2a9] sm:text-[10.5px]">/mnd</span></p>
            </div>
          ))}
        </div>
        {(valgt.prisHistorikk || []).length > 0 && (
          <div className="mt-3.5" data-testid="radar-prishistorikk">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a8a29a]">Prishistorikk (FINN)</p>
            <ul className="mt-1.5 space-y-1">
              {[...valgt.prisHistorikk].reverse().slice(0, 5).map((h, i) => (
                <li key={i} className="flex items-center gap-1.5 text-[12px] text-[#57534e]">
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
      <section className={FLAT}>
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
      <section className={FLAT}>
        <SekHode ikon={Globe} tittel="Tilbudsside til huseier" hoyre={(valgt.aapninger || 0) > 0 ? (
          <span className="flex items-center gap-1 text-[11.5px] text-[#0e7490]"><Eye className="h-3.5 w-3.5" /> Åpnet {valgt.aapninger}×{valgt.sistAapnet ? ` · ${naarSist(valgt.sistAapnet)}` : ''}</span>
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
      <section className={FLAT}>
        <SekHode ikon={MessageSquare} tittel="Annonsetekst fra FINN" hoyre={<span className="text-[11px] text-[#c2beb8]">{valgt.beskrivelse.length} tegn</span>} />
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

    /* ── Aktivitet-fanen: composer + ekte kronologisk tidslinje ── */
    const sekAktivitet = (
      <div className="mx-auto max-w-[860px]" data-testid="radar-aktivitet">
        {/* Composer — logg kontakt, notat eller oppgave */}
        <div>
          <div className="flex rounded-[8px] border border-black/[0.08] bg-[#f7f6f3] p-0.5" style={{ width: 'fit-content' }}>
            {[['notat', 'Notat'], ['kontakt', 'Kontakt'], ['oppgave', 'Oppgave']].map(([k, l]) => (
              <button key={k} onClick={() => setLoggType(k)} data-testid={`radar-logg-type-${k}`}
                className={`rounded-[6.5px] px-2.5 py-1 text-[11.5px] font-medium transition-all ${loggType === k ? 'bg-white text-[#1c1917] shadow-[0_1px_2px_rgba(28,25,23,0.08)]' : 'text-[#78716c] hover:text-[#1c1917]'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="mt-2 flex items-start gap-2">
            <textarea value={loggTekst} onChange={(e) => setLoggTekst(e.target.value)} rows={2} data-testid="radar-logg-tekst"
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) leggTilLogg(valgt.id); }}
              placeholder={loggType === 'kontakt' ? 'Ringte huseier — opptatt, prøver igjen i morgen…' : loggType === 'oppgave' ? 'Følg opp fredag hvis ikke svar…' : 'Notat om leaden…'}
              className="min-h-[38px] w-full flex-1 resize-none rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] leading-relaxed outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#1c1917]/30" />
            <button onClick={() => leggTilLogg(valgt.id)} disabled={loggSender || !loggTekst.trim()} data-testid="radar-logg-legg-til" className={`${KNAPP_PRIMAER} shrink-0`}>
              {loggSender ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Legg til
            </button>
          </div>
        </div>

        {/* Festet notat — alltid synlig, vises også i Oversikt */}
        <div className="mt-6 border-t border-black/[0.07] pt-5">
          <p className="text-[12.5px] font-medium text-[#8f8a82]">Festet notat</p>
          <textarea value={valgt.notat || ''} rows={2} data-testid="radar-notat"
            onChange={(e) => settLead(valgt.id, (x) => ({ ...x, notat: e.target.value }))}
            onBlur={(e) => oppdater(valgt.id, { notat: e.target.value })}
            placeholder="Ringt 14/2, svarte ikke — prøver igjen torsdag…"
            className="mt-2 w-full resize-none rounded-[8px] border border-black/[0.08] bg-white px-3 py-2 text-[13px] outline-none transition-colors placeholder:text-[#c2beb8] focus:border-[#1c1917]/30" />
        </div>

        {/* Tidslinje — kun ekte hendelser, tilbudsåpninger gruppert til én rad */}
        <div className="mt-6 border-t border-black/[0.07] pt-5" data-testid="radar-tidslinje">
          <p className="text-[12.5px] font-medium text-[#8f8a82]">Tidslinje</p>
          {hendelser.length === 0 ? (
            <p className="mt-3 text-[13px] text-[#a3a3a3]">Ingen aktivitet ennå.</p>
          ) : (
            <ol className="mt-4">
              {hendelser.map((h, i) => {
                const Ik = HENDELSE_IKON[h.type] || StickyNote;
                const erOppgave = h.type === 'oppgave' && h.id;
                return (
                  <li key={h.id || `${h.type}-${i}`} className="relative flex items-start gap-3 pb-4 last:pb-0">
                    {i < hendelser.length - 1 && <span className="absolute bottom-0 left-[11px] top-6 w-px bg-black/[0.06]" />}
                    {erOppgave ? (
                      <button onClick={() => veksleOppgave(valgt.id, h.id, !h.gjort)} data-testid={`radar-oppgave-${h.id}`} title={h.gjort ? 'Merk som ikke gjort' : 'Merk som gjort'}
                        className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors ${h.gjort ? 'border-[#1f7a45] bg-[#eef6f0] text-[#1f7a45]' : 'border-black/[0.12] bg-white text-transparent hover:border-black/[0.3] hover:text-[#c9c4bd]'}`}>
                        <Check className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-[#f4f2ee]">
                        <Ik className="h-3 w-3 text-[#78716c]" />
                      </span>
                    )}
                    <span className={`min-w-0 flex-1 pt-0.5 text-[13px] leading-relaxed ${h.gjort ? 'text-[#a8a29a] line-through decoration-[#d6d2cb]' : 'text-[#404040]'}`}>{h.tekst}</span>
                    <span className="shrink-0 pt-1 text-[11.5px] text-[#a3a3a3]">{naarSist(h.at)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    );

    /* ── Oversikt-fanen: moderne 2026 — rolige, myke flater (ingen borders eller
       skygger), normal-case etiketter, jevn typoskala 12.5–14.5px og tall i
       UI-fonten. Hovedkolonne: pipeline → neste handling → regnestykke →
       aktivitet. Rail: foto + fakta + tilbudshandlinger. ── */
    const stegKontekst = !steg ? null
      : steg.varm && (valgt.aapninger || 0) > 0 && valgt.sistAapnet ? `Sist åpnet ${naarSist(valgt.sistAapnet)}. Huseiere som nettopp har lest tilbudet er mest mottakelige.`
      : valgt.status === 'ny' ? 'Analysen gir score, funn, ferdig FINN-melding og personlig tilbudstekst — på under ett minutt.'
      : valgt.status === 'analysert' ? 'Meldingen og tilbudslenken ligger klare — ett klikk å kopiere.'
      : valgt.status === 'kontaktet' ? 'Tilbudssiden er personlig og klar til å sendes når huseier svarer.'
      : valgt.status === 'dialog' ? 'Alt materiale ligger klart i Tilbud-fanen om huseier trenger en ny gjennomgang.'
      : null;
    const StegIkon = !steg ? null
      : valgt.status === 'ny' ? Sparkles
      : valgt.status === 'analysert' ? (valgt.kontaktTlf ? Phone : MessageSquare)
      : valgt.status === 'kontaktet' ? Copy
      : Check;

    const forsteBilde = (valgt.bilder || []).find((b) => !dodeBilder.has(b));

    const railDetaljer = (
      <aside className={toKol ? 'min-w-0' : `mt-3 ${FLATE}`} data-testid="radar-oversikt-detaljer">
        {toKol && (
          forsteBilde ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={forsteBilde} alt="" role="button" tabIndex={0} onClick={() => setFane('bilder')} onError={() => merkDodBilde(forsteBilde)}
              className="mb-5 h-[150px] w-full cursor-pointer rounded-[12px] object-cover transition-opacity hover:opacity-95" title="Åpne Bilder" />
          ) : (
            <span className="mb-5 flex h-[150px] w-full items-center justify-center rounded-[12px] bg-[#f4f2ee]"><Home className="h-5 w-5 text-[#c9c4bd]" /></span>
          )
        )}
        <p className={ETIKETT}>Detaljer</p>
        <dl className={toKol ? 'mt-3.5 space-y-3.5' : 'mt-3.5 grid grid-cols-2 gap-x-8 gap-y-3.5 sm:grid-cols-3'}>
          {[
            ['Potensial', valgt.potensial?.score != null ? `${valgt.potensial.forelopig ? '~' : ''}${valgt.potensial.score} av 100` : null],
            ['Annonsør', valgt.annonsor && valgt.annonsor.type !== 'ukjent'
              ? (valgt.annonsor.orgNavn
                ? (valgt.annonsor.hjemmeside
                  ? <a key="anr" href={valgt.annonsor.hjemmeside} target="_blank" rel="noreferrer" className="hover:underline">{valgt.annonsor.orgNavn}</a>
                  : valgt.annonsor.orgNavn)
                : 'Privat utleier')
              : null],
            ['Utleier', valgt.kontaktNavn ? `${valgt.kontaktNavn}${valgt.kontaktTittel ? ` — ${valgt.kontaktTittel}` : ''}` : null],
            ['Telefon', valgt.kontaktTlf ? <a key="tlf" href={`tel:${valgt.kontaktTlf}`} className="hover:underline">{fmtTlf(valgt.kontaktTlf)}</a> : null],
            ['E-post', valgt.kontaktEpost ? <a key="ep" href={`mailto:${valgt.kontaktEpost}`} className="hover:underline">{valgt.kontaktEpost}</a> : null],
            ['Boligtype', valgt.boligtype || null],
            ['Størrelse', valgt.m2 || valgt.soverom ? `${valgt.m2 ? `${valgt.m2} m²` : ''}${valgt.m2 && valgt.soverom ? ' · ' : ''}${valgt.soverom ? `${valgt.soverom} soverom` : ''}` : null],
            ['Dagens leie', `${kr(valgt.pris)}/mnd`],
            ['Kilde', <a key="kilde" href={valgt.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium text-[#6d28d9] hover:underline">FINN-annonse <ExternalLink className="h-3 w-3" /></a>],
            ['Hentet', `${naarSist(valgt.createdAt)}${valgt.kilde === 'agent' ? ' · av agenten' : ''}`],
            ['Tilbudet', (valgt.aapninger || 0) > 0
              ? <button key="tb" type="button" onClick={() => setFane('aktivitet')} className="text-left decoration-black/20 underline-offset-2 hover:underline" title="Se hele tidslinjen i Aktivitet">{`Åpnet ${valgt.aapninger}×${valgt.sistAapnet ? ` · sist ${naarSist(valgt.sistAapnet)}` : ''}`}</button>
              : 'Ikke åpnet ennå'],
          ].filter(([, v]) => v != null && v !== '').map(([l, v]) => (
            <div key={l} className="min-w-0">
              <dt className="text-[12px] text-[#a6a19a]">{l}</dt>
              <dd className="mt-0.5 truncate text-[14px] text-[#26241f]">{v}</dd>
            </div>
          ))}
        </dl>
        <div className={`flex gap-2 ${toKol ? 'mt-6 flex-col' : 'mt-5 flex-wrap'}`}>
          <button onClick={() => kopierLenke(valgt)} data-testid="radar-detaljer-kopier-lenke" className={`${KNAPP_GHOST} justify-center bg-white`}>
            {kopiert ? <Check className="h-3.5 w-3.5 text-[#1f7a45]" /> : <Copy className="h-3.5 w-3.5" />} {kopiert ? 'Kopiert!' : 'Kopier tilbudslenke'}
          </button>
          <a href={`/tilbud/${valgt.tilbudSlug}`} target="_blank" rel="noreferrer" data-testid="radar-detaljer-aapne-tilbud" className={`${KNAPP_GHOST} justify-center bg-white`}>
            Se tilbudssiden <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </aside>
    );

    const sekOversikt = (
      <div data-testid="radar-oversikt" className={toKol ? 'mx-auto grid w-full max-w-[1160px] grid-cols-[minmax(0,1fr)_300px] items-start gap-10' : 'mx-auto max-w-[860px]'}>
        <div className="min-w-0">
          {/* Pipeline — hvor i løpet leaden er; klikk på et steg for å flytte den */}
          {['tapt', 'ikke_relevant'].includes(valgt.status) ? (
            <div className="mb-5 flex items-center gap-3" data-testid="radar-pipeline">
              <span className="text-[13px] font-semibold text-[#b3261e]">{valgt.status === 'tapt' ? 'Markert som tapt' : 'Markert som ikke relevant'}</span>
              {valgt.salg?.arsak?.valg && <span className="text-[12.5px] text-[#8f8a82]">{valgt.salg.arsak.valg}</span>}
            </div>
          ) : (
            <div className="mb-5 flex gap-1.5" data-testid="radar-pipeline">
              {STATUSER.filter((s) => !['tapt', 'ikke_relevant'].includes(s.k)).map((s, i, arr) => {
                const aktIdx = arr.findIndex((x) => x.k === valgt.status);
                return (
                  <button key={s.k} onClick={() => onsketStatus(valgt, s.k)} disabled={autoAktiv} title={`Sett status: ${s.l}`} data-testid={`radar-pipeline-${s.k}`}
                    className="group/st min-w-0 flex-1 disabled:cursor-not-allowed">
                    <span className={`block h-[4px] rounded-full transition-colors ${i <= aktIdx ? (valgt.status === 'vunnet' ? 'bg-[#1f7a45]' : 'bg-[#1c1917]') : 'bg-black/[0.07] group-hover/st:bg-black/[0.18]'}`} />
                    <span className={`mt-2 block truncate text-left text-[12.5px] transition-colors ${i === aktIdx ? 'font-semibold text-[#1c1917]' : 'text-[#a6a19a] group-hover/st:text-[#57534e]'}`}>{s.l}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="space-y-3">
            {/* Salg — tildeling, pipeline-handlinger, oppfølging og salgslogg */}
            {aktor && (
              <SalgSeksjon lead={valgt} aktor={aktor} selgere={selgere} statuser={STATUSER}
                onTildel={tildel} onsketStatus={onsketStatus} onOppfolging={settOppfolging} />
            )}
            {/* Neste handling — kompakt handlingsblokk, ikke editorial */}
            {steg ? (
              <section className={FLATE} data-testid="radar-neste-steg">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                  {StegIkon && (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-[#1c1917] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                      <StegIkon className="h-[18px] w-[18px]" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-semibold leading-snug text-[#1c1917]">{steg.t}</p>
                    {stegKontekst && <p className="mt-1 max-w-[520px] text-[13px] leading-relaxed text-[#8f8a82]">{stegKontekst}</p>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {valgt.status === 'ny' && (
                      <button onClick={() => analyser(valgt.id)} disabled={analyserer} data-testid="radar-steg-analyser" className={KNAPP_PRIMAER}>
                        {analyserer ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Kjør AI-analyse
                      </button>
                    )}
                    {valgt.status === 'analysert' && (
                      <>
                        {valgt.kontaktTlf ? (
                          <a href={`tel:${valgt.kontaktTlf}`} data-testid="radar-steg-ring" className={KNAPP_PRIMAER}>
                            <Phone className="h-3.5 w-3.5" /> Kontakt huseier
                          </a>
                        ) : (
                          <button onClick={() => kopierMelding(valgt)} data-testid="radar-steg-kopier" className={KNAPP_PRIMAER}>
                            {meldingKopiert ? <Check className="h-3.5 w-3.5 text-[#7ee2a8]" /> : <Copy className="h-3.5 w-3.5" />} {meldingKopiert ? 'Kopiert!' : 'Kopier FINN-melding'}
                          </button>
                        )}
                        <button onClick={() => onsketStatus(valgt, 'kontaktet')} data-testid="radar-steg-kontaktet" className={`${KNAPP_GHOST} bg-white`}>
                          Merk som kontaktet
                        </button>
                      </>
                    )}
                    {valgt.status === 'kontaktet' && (
                      <>
                        <button onClick={() => { kopierLenke(valgt); onsketStatus(valgt, 'dialog'); }} data-testid="radar-steg-send-tilbud" className={KNAPP_PRIMAER}>
                          {kopiert ? <Check className="h-3.5 w-3.5 text-[#7ee2a8]" /> : <Copy className="h-3.5 w-3.5" />} Send tilbud
                        </button>
                        <button onClick={() => onsketStatus(valgt, 'dialog')} data-testid="radar-steg-dialog" className={`${KNAPP_GHOST} bg-white`}>
                          Huseier svarte
                        </button>
                        <button onClick={() => onsketStatus(valgt, 'tapt')} data-testid="radar-steg-ikke-aktuelt"
                          className="flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-medium text-[#b3261e] transition-colors hover:bg-[#fdf0ef]">
                          Ikke aktuelt
                        </button>
                      </>
                    )}
                    {valgt.status === 'dialog' && (
                      <>
                        <button onClick={() => onsketStatus(valgt, 'vunnet')} data-testid="radar-steg-vunnet"
                          className="flex h-8 items-center gap-1.5 rounded-[8px] bg-[#1f7a45] px-3.5 text-[12.5px] font-medium text-white transition-all hover:bg-[#196a3b] active:scale-[0.98]">
                          <Check className="h-3.5 w-3.5" /> Marker som vunnet
                        </button>
                        <button onClick={() => onsketStatus(valgt, 'tapt')} data-testid="radar-steg-ikke-aktuelt-dialog"
                          className="flex h-8 items-center gap-1 rounded-[8px] px-2.5 text-[12.5px] font-medium text-[#b3261e] transition-colors hover:bg-[#fdf0ef]">
                          Ikke aktuelt
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {/* Regnestykket — svaret først, stort; breakdown under */}
            <section className={FLATE} data-testid="radar-oversikt-regnestykke">
              <div className="flex items-baseline justify-between">
                <p className={ETIKETT}>Regnestykket for huseier</p>
                <button onClick={() => setFane('tilbud')} data-testid="radar-juster-tilbud" className="text-[13px] font-medium text-[#6d28d9] hover:underline">Juster i Tilbud</button>
              </div>
              <p className="mt-3 text-[27px] font-bold leading-none tracking-[-0.01em] text-[#1c1917]" style={heading}>
                {kr(rs.netto)}<span className="ml-1.5 text-[14px] font-medium tracking-normal text-[#a6a19a]" style={{ fontFamily: 'var(--font-body)' }}>/mnd til huseier</span>
              </p>
              <dl className="mt-4 max-w-[480px] space-y-2 border-t border-black/[0.06] pt-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[13.5px] text-[#6f6a63]">Anbefalt leie</dt>
                  <dd className="text-[13.5px] font-semibold text-[#1c1917]">{kr(rs.anbefalt)}<span className="font-normal text-[#a6a19a]">/mnd</span></dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[13.5px] text-[#6f6a63]">DigiHome-honorar ({rs.pct} % eks. mva)</dt>
                  <dd className="text-[13.5px] text-[#6f6a63]">−{kr(rs.honorar)}</dd>
                </div>
                {rs.gevinst != null && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[13px] text-[#a6a19a]">vs. dagens annonse ({kr(valgt.pris)})</dt>
                    <dd className={`text-[13px] font-semibold ${rs.gevinst >= 0 ? 'text-[#1f7a45]' : 'text-[#c2413b]'}`}>{rs.gevinst >= 0 ? '+' : '−'}{kr(Math.abs(rs.gevinst))}</dd>
                  </div>
                )}
              </dl>
            </section>

            {/* Siste aktivitet — ekte hendelser, gruppert */}
            <section className={FLATE} data-testid="radar-oversikt-aktivitet">
              <div className="flex items-baseline justify-between">
                <p className={ETIKETT}>Siste aktivitet</p>
                <button onClick={() => setFane('aktivitet')} data-testid="radar-se-aktivitet" className="text-[13px] font-medium text-[#6d28d9] hover:underline">Se alt</button>
              </div>
              <div className="mt-3.5 space-y-3">
                {hendelser.slice(0, 4).map((h, i) => {
                  const Ik = HENDELSE_IKON[h.type] || StickyNote;
                  return (
                    <p key={h.id || `${h.type}-${i}`} className="flex items-start gap-2.5 text-[14px] text-[#3f3b35]">
                      <Ik className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#aca79f]" />
                      <span className="min-w-0 flex-1 truncate">{h.tekst}</span>
                      <span className="shrink-0 text-[12px] text-[#aca79f]">{naarSist(h.at)}</span>
                    </p>
                  );
                })}
                {hendelser.length === 0 && <p className="text-[14px] text-[#aca79f]">Ingen aktivitet ennå.</p>}
                {valgt.notat ? (
                  <p className="flex items-start gap-2.5 text-[14px] text-[#3f3b35]" title="Festet notat"><StickyNote className="mt-[3px] h-3.5 w-3.5 shrink-0 text-[#aca79f]" /><span className="line-clamp-2">{valgt.notat}</span></p>
                ) : null}
              </div>
            </section>
          </div>

          {!toKol && railDetaljer}
        </div>

        {toKol && railDetaljer}
      </div>
    );

    /* ── Live forhåndsvisning av tilbudssiden — sticky, teller ikke som åpning ── */
    const sekPreview = (
      <div className="sticky top-0" data-testid="radar-tilbud-preview">
        <div className="flex items-baseline justify-between pb-2">
          <p className="text-[12.5px] font-medium text-[#8f8a82]">Slik ser huseier det</p>
          <span className="flex items-center gap-3">
            <button onClick={() => setPreviewNokkel((k) => k + 1)} data-testid="radar-preview-oppdater" className="flex items-center gap-1 text-[11.5px] font-medium text-[#78716c] transition-colors hover:text-[#1c1917]">
              <RefreshCw className="h-3 w-3" /> Oppdater
            </button>
            <a href={`/tilbud/${valgt.tilbudSlug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11.5px] font-semibold text-[#6d28d9] hover:underline">Åpne <ExternalLink className="h-3 w-3" /></a>
          </span>
        </div>
        <div className="overflow-hidden rounded-[10px] border border-black/[0.08] bg-[#f4f2ee]">
          <iframe key={previewNokkel} src={`/tilbud/${valgt.tilbudSlug}?preview=1`} title="Forhåndsvisning av tilbudet"
            className="w-full" style={{ height: 'min(72vh, 760px)', minHeight: 460 }} />
        </div>
        <p className="mt-1.5 text-[11px] text-[#a8a29a]">Forhåndsvisningen teller ikke som åpning hos huseier. Lagrede endringer vises automatisk.</p>
      </div>
    );

    return (
      <div className="flex h-full min-h-0 flex-col bg-white" data-testid="radar-skuff">
        {/* Panelhode — komprimert: tittel + meta, én statuscontrol og én primær handling */}
        <div className="border-b border-black/[0.06] px-4 pt-3 sm:px-7">
          <div className="flex items-start gap-2.5">
            <button onClick={() => { setValgtId(null); setUtvidet(false); }} data-testid="radar-skuff-lukk" aria-label="Lukk"
              className="mt-0.5 shrink-0 rounded-lg p-1.5 text-[#a8a29a] transition-colors hover:bg-[#f3f2f0] hover:text-[#333]">
              {splitt || utvidet ? <X className="h-[18px] w-[18px]" /> : <ArrowLeft className="h-[18px] w-[18px]" />}
            </button>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[20px] font-bold leading-tight tracking-[-0.015em] sm:text-[23px]" style={heading}>{pent(valgt.adresse || valgt.tittel)}</h2>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-[#8a857c]">
                <span className="flex items-center gap-1.5">
                  <span className="font-semibold text-[#1c1917]">{kr(valgt.pris)}/mnd</span>
                  {(() => {
                    const kutt = sisteKutt(valgt);
                    return kutt ? (
                      <span className="font-semibold text-[#0e7490]" title={`${tall(kutt.fra)} → ${tall(kutt.til)} · ${naarSist(kutt.at)}`} data-testid="radar-panel-kutt">↓ −{kutt.pct} %</span>
                    ) : null;
                  })()}
                </span>
                {valgt.m2 ? <span>{valgt.m2} m²</span> : null}
                {valgt.soverom ? <span>{valgt.soverom} sov</span> : null}
                {(valgt.kontaktNavn || valgt.kontaktTlf) ? (
                  <span className="flex items-center gap-1" data-testid="radar-panel-kontakt">
                    {valgt.kontaktNavn ? <span className="text-[#57534e]">{valgt.kontaktNavn}</span> : null}
                    {valgt.kontaktTlf ? (
                      <a href={`tel:${valgt.kontaktTlf}`} className="text-[#57534e] hover:text-[#1c1917] hover:underline" onClick={(e) => e.stopPropagation()}>{fmtTlf(valgt.kontaktTlf)}</a>
                    ) : null}
                  </span>
                ) : null}
                <AnnonsorBadge annonsor={valgt.annonsor} />
                <a href={valgt.kildeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-[#6d28d9] hover:underline">FINN <ExternalLink className="h-3 w-3" /></a>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {/* Én kompakt statuscontrol — erstatter raden med status-piller */}
              <div className="relative">
                <button onClick={() => setStatusMeny((v) => !v)} disabled={autoAktiv} data-testid="radar-status-knapp"
                  className="flex h-8 items-center gap-1.5 rounded-[8px] border border-black/[0.08] bg-white px-2.5 text-[12px] font-medium text-[#404040] transition-colors hover:bg-[#f7f6f3] disabled:opacity-45">
                  <span className="h-[6px] w-[6px] rounded-full" style={{ background: statusStil(valgt.status).farge }} />
                  <span className="hidden sm:inline">{statusStil(valgt.status).l}</span>
                  <ChevronDown className="h-3 w-3 text-[#a8a29a]" />
                </button>
                {statusMeny && (
                  <>
                    <div className="fixed inset-0 z-[140]" onClick={() => setStatusMeny(false)} />
                    <div className="absolute right-0 z-[141] mt-1 w-[168px] rounded-[10px] border border-black/[0.08] bg-white py-1 shadow-[0_10px_32px_rgba(0,0,0,0.10)]" data-testid="radar-status-meny">
                      {STATUSER.map((s) => (
                        <button key={s.k} onClick={() => onsketStatus(valgt, s.k)} data-testid={`radar-status-${s.k}`}
                          className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] transition-colors ${valgt.status === s.k ? 'font-semibold text-[#141414]' : 'text-[#57534e] hover:bg-[#f7f6f3]'}`}>
                          <span className="h-[6px] w-[6px] rounded-full" style={{ background: s.farge }} />
                          {s.l}
                          {valgt.status === s.k && <Check className="ml-auto h-3.5 w-3.5" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {/* Én primær handling — statusstyrt */}
              {primaer && (primaer.href ? (
                <a href={primaer.href} data-testid="radar-hode-primaer" className={`${KNAPP_PRIMAER} hidden sm:flex`}>
                  <primaer.ikon className="h-3.5 w-3.5" /> {primaer.l}
                </a>
              ) : (
                <button onClick={primaer.gjor} disabled={primaer.spinner} data-testid="radar-hode-primaer" className={`${KNAPP_PRIMAER} hidden sm:flex`}>
                  {primaer.spinner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <primaer.ikon className="h-3.5 w-3.5" />} {primaer.l}
                </button>
              ))}
              <button onClick={() => setUtvidet((u) => !u)} data-testid="radar-utvid" title={utvidet ? 'Minimer visningen' : 'Utvid til stor visning'}
                className="hidden rounded-lg p-2 text-[#a8a29a] transition-colors hover:bg-[#f4f0fb] hover:text-[#6d28d9] lg:block">
                {utvidet ? <Minimize2 className="h-[16px] w-[16px]" /> : <Maximize2 className="h-[16px] w-[16px]" />}
              </button>
            </div>
          </div>
          {/* Record-faner — listen er navigasjon, recorden er arbeidsflaten */}
          <div className="mt-2.5 flex items-center gap-4 overflow-x-auto" data-testid="radar-faner">
            {[['oversikt', 'Oversikt'], ['bilder', `Bilder${nB ? ` ${nB}` : ''}`], ['ai', 'AI'], ['tilbud', 'Tilbud'], ['aktivitet', 'Aktivitet']].map(([k, l]) => (
              <button key={k} onClick={() => setFane(k)} data-testid={`radar-fane-${k}`}
                className={`shrink-0 whitespace-nowrap border-b-2 pb-2 text-[13.5px] font-semibold transition-colors ${fane === k ? 'border-[#141414] text-[#141414]' : 'border-transparent text-[#8a857c] hover:text-[#404040]'}`}>
                {l}
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
            {!['vunnet', 'tapt', 'ikke_relevant'].includes(valgt.status) && (
              <button onClick={() => onsketStatus(valgt, 'tapt')} data-testid="radar-deaktivert-tapt" className={`${KNAPP_GHOST} ml-auto h-7 px-2.5 text-[11.5px]`}>
                Merk som tapt
              </button>
            )}
          </div>
        )}
        {valgt.status === 'vunnet' && !autoAktiv && (
          <div className="flex flex-wrap items-center gap-2 border-b border-black/[0.05] bg-[#eef6f0] px-4 py-2.5 sm:px-7" data-testid="radar-vunnet-linje">
            <Check className="h-4 w-4 shrink-0 text-[#1f7a45]" />
            <p className="text-[12px] font-medium text-[#1f7a45]">
              {valgt.salg?.vunnet
                ? `Vunnet av ${valgt.salg.vunnet.selger?.navn || 'selger'} — provisjon ${kr(valgt.salg.vunnet.provisjon)}. Neste: opprett forvaltningsavtale i DigiHome-plattformen.`
                : `Vunnet — ca. ${kr(rs.honorar)}/mnd i honorar. Neste: opprett forvaltningsavtale i DigiHome-plattformen.`}
            </p>
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

        {/* Panelinnhold — fanestyrt: Bilder er én integrert media-arbeidsflate */}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <div className={`min-h-0 flex-1 overflow-y-auto bg-white ${autoAktiv ? 'pointer-events-none select-none' : ''}`}>
            <div className="px-4 py-5 sm:px-7">
              {fane === 'oversikt' && sekOversikt}
              {fane === 'bilder' && sekBilder}
              {fane === 'ai' && sekAnalyse}
              {fane === 'tilbud' && (toKol ? (
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(340px,420px)] items-start gap-8">
                  <div className="min-w-0 space-y-7">{sekOkonomi}{sekMelding}{sekTilbud}{sekBeskrivelse}</div>
                  {sekPreview}
                </div>
              ) : (
                <div className="mx-auto max-w-[860px] space-y-7">{sekOkonomi}{sekMelding}{sekTilbud}{sekBeskrivelse}</div>
              ))}
              {fane === 'aktivitet' && sekAktivitet}
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
        <div className={`${KORT} mb-4 p-4 ${!splitt && visning === 'liste' ? 'mx-auto w-full max-w-[1040px]' : ''}`} data-testid="radar-ny-panel">
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

      {/* Innsikten bor nå i verktøylinjen («I spill») — egen KPI-rad er fjernet for en lav, supermoderne topp */}

      {/* Verktøylinje / bulk-linje — mobil: søk+kontroller øverst, filtre som scrollerad */}
      {utvalg.size === 0 ? (
        <div className={`flex flex-wrap items-center gap-2 py-1 ${!splitt && visning === 'liste' ? 'mx-auto w-full max-w-[1040px]' : ''}`}>
          {/* Søk — rolig, avrundet felt */}
          <span className="relative order-1 min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#c2beb8]" />
            <input value={sok} onChange={(e) => setSok(e.target.value)} placeholder="Søk adresse eller bydel…" data-testid="radar-sok"
              className="h-[30px] w-full rounded-full border border-black/[0.07] bg-white pl-9 pr-3 text-[12px] outline-none transition-all placeholder:text-[#c2beb8] focus:border-[#1c1917]/25 sm:w-[190px] sm:focus:w-[230px]" />
          </span>

          {/* Samlet filter: status · eier · annonsør · bydel i én popover */}
          <span className="relative order-2">
            <button onClick={() => setFilterMeny((v) => !v)} data-testid="radar-filter-btn"
              className={`flex h-[30px] items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-all ${aktiveFiltre > 0 ? 'border-transparent bg-[#1c1917] text-white shadow-[0_2px_8px_rgba(28,25,23,0.25)]' : 'border-black/[0.07] bg-white text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] hover:text-[#1c1917]'}`}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filter
              {aktiveFiltre > 0 && <span className="flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-white/25 px-1 text-[10px] font-bold">{aktiveFiltre}</span>}
            </button>
            {filterMeny && (
              <>
                <div className="fixed inset-0 z-[140]" onClick={() => setFilterMeny(false)} />
                <div className="dh-scale-in absolute left-0 z-[141] mt-1.5 max-h-[72vh] w-[min(90vw,360px)] overflow-y-auto rounded-[16px] border border-black/[0.07] bg-white p-4 shadow-[0_22px_64px_rgba(23,20,18,0.18)]" data-testid="radar-filter-meny">
                  <p className="pb-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#b3aea6]">Status</p>
                  <div className="flex flex-wrap gap-1">
                    {[{ k: 'alle', l: 'Alle' }, ...STATUSER].map((s) => (
                      <button key={s.k} onClick={() => setFilter(s.k)} data-testid={`radar-filter-${s.k}`}
                        className={`flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[12px] font-medium transition-all ${filter === s.k ? 'bg-[#1c1917] text-white' : 'bg-[#f4f2ee] text-[#6f6a61] hover:text-[#1c1917]'}`}>
                        {s.farge && <span className="h-[5px] w-[5px] rounded-full" style={{ background: filter === s.k ? '#fff' : s.farge }} />}
                        {s.l} <span className={filter === s.k ? 'text-white/50' : 'text-[#b3aea6]'}>{antall[s.k] || 0}</span>
                      </button>
                    ))}
                  </div>
                  {aktor && (
                    <>
                      <p className="pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#b3aea6]">Selger</p>
                      <div className="flex flex-wrap gap-1">
                        {[{ k: 'alle', l: 'Alle' }, { k: 'mine', l: 'Mine' }, { k: 'pool', l: 'Pool' }].map((f) => (
                          <button key={f.k} onClick={() => setEierFilter(f.k)} data-testid={`radar-eier-${f.k}`}
                            className={`flex h-[26px] items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-all ${eierFilter === f.k ? 'bg-[#1c1917] text-white' : 'bg-[#f4f2ee] text-[#6f6a61] hover:text-[#1c1917]'}`}>
                            {f.l}
                            {f.k === 'pool' && <span className={eierFilter === f.k ? 'text-white/50' : 'text-[#b3aea6]'}>{leads.filter((l) => !l.salg?.tildeltTil).length}</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <p className="pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#b3aea6]">Annonsør</p>
                  <div className="flex flex-wrap gap-1">
                    {[{ k: 'alle', l: 'Alle' }, { k: 'privat', l: 'Privat', c: '#1f7a45' }, { k: 'megler', l: 'Megler', c: '#c2413b' }].map((f) => (
                      <button key={f.k} onClick={() => setAnnonsorFilter(f.k)} data-testid={`radar-annonsor-${f.k}`}
                        title={f.k === 'privat' ? 'Huseiere uten forvalter (inkl. Husleie.no) — målgruppen' : f.k === 'megler' ? 'Megler/Utleiemegleren har oppdraget — konkurrent' : undefined}
                        className={`flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium transition-all ${annonsorFilter === f.k ? 'bg-[#1c1917] text-white' : 'bg-[#f4f2ee] text-[#6f6a61] hover:text-[#1c1917]'}`}>
                        {f.c && <span className="h-[5px] w-[5px] rounded-full" style={{ background: annonsorFilter === f.k ? '#fff' : f.c }} />}
                        {f.l}
                      </button>
                    ))}
                  </div>
                  {bydeler.length > 0 && (
                    <>
                      <p className="pb-1.5 pt-3.5 text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#b3aea6]">Bydel</p>
                      <div className="flex flex-wrap gap-1">
                        <button onClick={() => setBydelFilter('alle')} data-testid="radar-bydel-alle"
                          className={`h-[26px] rounded-full px-2.5 text-[12px] font-medium transition-all ${bydelFilter === 'alle' ? 'bg-[#1c1917] text-white' : 'bg-[#f4f2ee] text-[#6f6a61] hover:text-[#1c1917]'}`}>Alle</button>
                        {bydeler.map((b) => (
                          <button key={b.navn} onClick={() => setBydelFilter((v) => (v === b.navn ? 'alle' : b.navn))} data-testid={`radar-bydel-${b.navn}`}
                            className={`flex h-[26px] items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-all ${bydelFilter === b.navn ? 'bg-[#1c1917] text-white' : 'bg-[#f4f2ee] text-[#6f6a61] hover:text-[#1c1917]'}`}>
                            {b.navn} <span className={bydelFilter === b.navn ? 'text-white/50' : 'text-[#b3aea6]'}>{b.antall}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="mt-4 flex items-center justify-between border-t border-black/[0.05] pt-3">
                    <button onClick={nullstillFiltre} disabled={!aktiveFiltre} data-testid="radar-filter-nullstill"
                      className="text-[12px] font-medium text-[#8a857c] transition-colors hover:text-[#c2413b] disabled:opacity-40">Nullstill</button>
                    <button onClick={() => setFilterMeny(false)}
                      className="h-[28px] rounded-full bg-[#1c1917] px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-black">Ferdig</button>
                  </div>
                </div>
              </>
            )}
          </span>

          {/* Aktive filtre som fjernbare chips — alltid synlig hva som er på */}
          {aktiveFiltre > 0 && (
            <div className="no-scrollbar order-4 flex min-w-0 items-center gap-1 overflow-x-auto sm:order-3">
              {[
                filter !== 'alle' && { l: (STATUSER.find((s) => s.k === filter) || {}).l, x: () => setFilter('alle'), tid: 'chip-status' },
                eierFilter !== 'alle' && { l: eierFilter === 'mine' ? 'Mine' : 'Pool', x: () => setEierFilter('alle'), tid: 'chip-eier' },
                annonsorFilter !== 'alle' && { l: annonsorFilter === 'privat' ? 'Privat' : 'Megler', x: () => setAnnonsorFilter('alle'), tid: 'chip-annonsor' },
                bydelFilter !== 'alle' && { l: bydelFilter, x: () => setBydelFilter('alle'), tid: 'chip-bydel' },
              ].filter(Boolean).map((c) => (
                <span key={c.tid} data-testid={`radar-${c.tid}`} className="flex h-[26px] shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-[#e9e6e0] pl-2.5 pr-1 text-[12px] font-medium text-[#44403c]">
                  {c.l}
                  <button onClick={c.x} aria-label={`Fjern filter ${c.l}`} className="rounded-full p-0.5 text-[#8a857c] transition-colors hover:bg-black/[0.07] hover:text-[#1c1917]"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
          <span className="order-2 ml-auto flex shrink-0 items-center gap-1.5 sm:order-5">
            {innsikt.honorarPipeline > 0 && (
              <button onClick={() => setFilter('alle')} data-testid="radar-innsikt-pipeline"
                title="Samlet månedshonorar hvis alle aktive leads vinnes (analysert + kontaktet + dialog + tilbud)"
                className="mr-1 hidden items-baseline gap-1.5 whitespace-nowrap rounded-full px-2 py-1 transition-colors hover:bg-[#f7f6f3] xl:flex">
                <span className="text-[11.5px] text-[#8a857c]">I spill</span>
                <span className="text-[12.5px] font-bold text-[#171717]" style={heading}>{kr(innsikt.honorarPipeline)}<span className="font-medium text-[#a8a29a]">/mnd</span></span>
              </button>
            )}
            <span className="flex overflow-hidden rounded-full border border-black/[0.07] bg-white shadow-[0_1px_2px_rgba(28,25,23,0.04)]">
              <button onClick={() => setVisning('liste')} data-testid="radar-visning-liste" title="Listevisning"
                className={`flex h-[30px] w-9 items-center justify-center transition-colors ${visning === 'liste' ? 'bg-[#1c1917] text-white' : 'text-[#a8a29a] hover:text-[#1c1917]'}`}>
                <List className="h-[15px] w-[15px]" />
              </button>
              <button onClick={() => setVisning('tavle')} data-testid="radar-visning-tavle" title="Pipeline-tavle — dra leads mellom stegene"
                className={`flex h-[30px] w-9 items-center justify-center transition-colors ${visning === 'tavle' ? 'bg-[#1c1917] text-white' : 'text-[#a8a29a] hover:text-[#1c1917]'}`}>
                <Columns3 className="h-[15px] w-[15px]" />
              </button>
              <button onClick={() => setVisning('tabell')} data-testid="radar-visning-tabell" title="Tabellvisning — alle AI-delscorer"
                className={`flex h-[30px] w-9 items-center justify-center transition-colors ${visning === 'tabell' ? 'bg-[#1c1917] text-white' : 'text-[#a8a29a] hover:text-[#1c1917]'}`}>
                <Table2 className="h-[15px] w-[15px]" />
              </button>
            </span>
            {aktor && (
              <button onClick={() => setVisRapport(true)} data-testid="radar-rapport-btn" title="Selgerrapport — vunnet, provisjon og win-rate per selger"
                className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-black/[0.07] bg-white text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-colors hover:bg-[#f7f6f3] hover:text-[#1c1917]">
                <BarChart3 className="h-[14px] w-[14px]" />
              </button>
            )}
            <select value={sort.key} onChange={(e) => setSort({ key: e.target.value, dir: 'desc' })} data-testid="radar-sort" aria-label="Sortering"
              className="hidden h-[30px] rounded-full border border-black/[0.07] bg-white px-2.5 text-[12px] font-medium text-[#57534e] shadow-[0_1px_2px_rgba(28,25,23,0.04)] outline-none focus:border-[#1c1917]/25 sm:block">
              <option value="potensial">Høyest potensial</option>
              <option value="kvalitet">Annonsekvalitet</option>
              <option value="nyeste">Nyeste først</option>
              <option value="aapnet">Flest åpninger</option>
              <option value="pris">Høyest leie</option>
            </select>
            <button onClick={() => setVisNy((v) => !v)} data-testid="radar-ny-btn" title="Legg til ny FINN-annonse"
              className="flex h-[30px] items-center gap-1 rounded-full bg-[#141414] px-2.5 text-[12px] font-semibold text-white shadow-[0_2px_8px_rgba(20,20,20,0.25)] transition-all hover:bg-black active:scale-[0.98] sm:pr-3.5">
              <Plus className="h-[14px] w-[14px]" /> <span className="hidden sm:inline">Ny annonse</span>
            </button>
          </span>
        </div>
      ) : (
        <div className={`flex flex-wrap items-center gap-2 rounded-[10px] bg-[#1c1917] px-4 py-2.5 text-white ${!splitt && visning === 'liste' ? 'mx-auto w-full max-w-[1040px]' : ''}`}>
          <span className="text-[13px] font-bold" style={heading}>{utvalg.size} valgt</span>
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
      ) : visning === 'tavle' ? (
        /* Pipeline-tavle: én kolonne per steg, dra-og-slipp mellom stegene */
        <div className="mt-3" data-testid="radar-tavle-visning">
          <PipelineTavle leads={sortert} statuser={STATUSER} valgtId={valgtId}
            onAapne={(id) => { setValgtId(id); setSletteBekreft(false); }} onsketStatus={onsketStatus} />
        </div>
      ) : (
        <div className="mt-3 flex items-start gap-4">
          {/* Venstre: liste eller tabell — i full visning sentreres arbeidskøen
              (Linear-stil) med større typografi; i splitt er den kompakt rail */}
          <div className={`min-w-0 ${splitt ? 'w-[330px] shrink-0 xl:w-[380px]' : visning === 'liste' ? 'mx-auto w-full max-w-[1040px]' : 'flex-1'}`}>
            {visning === 'liste' ? (
              <div className="border-t border-black/[0.06]" data-testid="radar-leadliste">
                {sortert.map((l) => {
                  const st = statusStil(l.status);
                  const erValgt = utvalg.has(l.id);
                  const aktiv = l.id === valgtId;
                  const stg = (l.auto && ['analyserer', 'styler'].includes(l.auto.status)) ? null : nesteSteg(l);
                  return (
                    <div key={l.id} role="button" tabIndex={0}
                      onClick={() => { setValgtId(l.id); setSletteBekreft(false); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setValgtId(l.id); setSletteBekreft(false); } }}
                      data-testid={`radar-lead-${l.id}`}
                      className={`group relative flex w-full cursor-pointer items-center border-b border-black/[0.05] pl-2 pr-3 text-left transition-colors ${splitt ? 'gap-2.5 py-2.5' : 'gap-3.5 py-3.5'} ${aktiv ? 'bg-[#f4f3f0]' : erValgt ? 'bg-[#faf9f7]' : 'hover:bg-[#fafaf8]'}`}>
                      {aktiv && <span className="absolute inset-y-0 left-0 w-[2px] bg-[#141414]" />}
                      <button onClick={(e) => { e.stopPropagation(); veksleValg(l.id); }} data-testid={`radar-velg-${l.id}`} aria-label={erValgt ? 'Fjern markering' : 'Marker lead'}
                        className={`shrink-0 rounded-md p-0.5 transition-all ${erValgt ? 'text-[#1c1917]' : 'text-[#d6d2cb] hover:text-[#a8a29a]'} ${erValgt || utvalg.size > 0 ? '' : 'lg:opacity-0 lg:group-hover:opacity-100 lg:focus:opacity-100'}`}>
                        {erValgt ? <CheckSquare className="h-[15px] w-[15px]" /> : <Square className="h-[15px] w-[15px]" />}
                      </button>
                      {(() => {
                        const thumbL = (l.bilder || []).find((b) => !dodeBilder.has(b));
                        return thumbL
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={thumbL} alt="" onError={() => merkDodBilde(thumbL)} className={`shrink-0 rounded-[8px] object-cover ${splitt ? 'h-10 w-14' : 'h-16 w-24'}`} />
                          : <span className={`flex shrink-0 items-center justify-center rounded-[8px] bg-[#f4f2ee] ${splitt ? 'h-10 w-14' : 'h-16 w-24'}`}><Home className="h-4 w-4 text-[#c9c4bd]" /></span>;
                      })()}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`truncate font-semibold tracking-[-0.01em] ${splitt ? 'text-[13px]' : 'text-[15px]'} ${l.annonseAktiv === false ? 'text-[#a8a29a] line-through decoration-[#d6d2cb]' : 'text-[#1c1917]'}`} style={heading}>{pent(l.adresse || l.tittel)}</span>
                          {l.annonseAktiv === false && (
                            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-[#a8a29a]" title="Agenten meldte at annonsen er fjernet fra FINN">Tatt av FINN</span>
                          )}
                        </span>
                        {/* Intent først: hva bør gjøres med denne leaden nå */}
                        {l.auto && ['analyserer', 'styler'].includes(l.auto.status) ? (
                          <span className={`flex items-center gap-1.5 truncate font-medium text-[#6f6a61] ${splitt ? 'mt-0.5 text-[12px]' : 'mt-1 text-[13px]'}`} data-testid={`radar-auto-status-${l.id}`}>
                            <Loader2 className="h-3 w-3 shrink-0 animate-spin text-[#8b5cf6]" />
                            {l.auto.status === 'analyserer' ? 'Analyserer…' : `Forbedrer bilder ${l.auto.bilderFerdig || 0}/${l.auto.bilderTotalt || 0}`}
                          </span>
                        ) : stg ? (
                          <span className={`block truncate font-medium ${splitt ? 'mt-0.5 text-[12px]' : 'mt-1 text-[13px]'}`} style={{ color: stg.c }} data-testid={`radar-steg-${l.id}`}>{stg.t}</span>
                        ) : (
                          <span className={`block truncate text-[#a8a29a] ${splitt ? 'mt-0.5 text-[12px]' : 'mt-1 text-[13px]'}`}>{st.l}</span>
                        )}
                        <span className={`flex items-center gap-1.5 truncate text-[#8a857c] ${splitt ? 'mt-0.5 text-[11.5px]' : 'mt-1 text-[12.5px]'}`}>
                          {kr(l.pris)}/mnd
                          {(() => {
                            const kutt = sisteKutt(l);
                            return kutt ? (
                              <span className="shrink-0 font-semibold text-[#0e7490]" title={`Priskutt: ${kr(kutt.fra)} → ${kr(kutt.til)} (${naarSist(kutt.at)})`} data-testid={`radar-kutt-${l.id}`}>↓ −{kutt.pct} %</span>
                            ) : null;
                          })()}
                          {!splitt && l.m2 ? <span>· {l.m2} m²</span> : null}
                          {!splitt && l.soverom ? <span>· {l.soverom} sov</span> : null}
                          {(() => { const byd = bydelFraPostnr(l.postnr); return byd ? <span className="shrink-0 text-[#a8a29a]">· {byd}</span> : null; })()}
                          <AnnonsorBadge annonsor={l.annonsor} liten={splitt} />
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {l.salg?.tildeltTil && <SelgerBadge selger={l.salg.tildeltTil} størrelse={18} />}
                        {(l.aapninger || 0) > 0 ? (
                          <span className={`flex items-center gap-1 font-semibold text-[#0e7490] ${splitt ? 'text-[11.5px]' : 'text-[13px]'}`} title={`Tilbudssiden åpnet ${l.aapninger} ganger`}><Eye className={splitt ? 'h-3.5 w-3.5' : 'h-4 w-4'} />{l.aapninger}</span>
                        ) : l.potensial?.score != null ? (
                          <span className={`font-semibold text-[#b5b0a8] ${splitt ? 'text-[12px]' : 'text-[13.5px]'}`} title={l.potensial.forelopig ? 'Foreløpig potensial — kjør AI-analyse' : 'AI-potensial'} data-testid={`radar-score-${l.id}`}>{l.potensial.forelopig ? '~' : ''}{l.potensial.score}</span>
                        ) : null}
                      </span>
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
                      <th className="sticky top-0 z-10 bg-white/90 px-2 py-3 text-[10px] font-bold uppercase tracking-[0.09em] text-[#a8a29a] shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)] backdrop-blur-md">Bydel</th>
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
                                <span className="block max-w-[210px] truncate text-[13px] font-bold tracking-[-0.01em] text-[#1c1917]" style={heading}>{pent(l.adresse || l.tittel)}</span>
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
                            {(() => {
                              const byd = bydelFraPostnr(l.postnr);
                              return (byd || l.postnr) ? (
                                <span className="block min-w-0" data-testid={`radar-tabell-bydel-${l.id}`}>
                                  {byd ? <span className="block whitespace-nowrap text-[12px] font-medium text-[#44403c]">{byd}</span> : null}
                                  {l.postnr ? <span className="block text-[10.5px] text-[#a8a29a]">{l.postnr}</span> : null}
                                </span>
                              ) : <span className="text-[12px] text-[#ddd8d0]">–</span>;
                            })()}
                          </td>
                          <td className="px-2 py-2">
                            <span className="block min-w-0" data-testid={`radar-tabell-kontakt-${l.id}`}>
                              <AnnonsorBadge annonsor={l.annonsor} liten />
                              {l.kontaktNavn ? <span className="block max-w-[150px] truncate text-[12px] font-medium text-[#44403c]" title={l.kontaktTittel ? `${l.kontaktNavn} — ${l.kontaktTittel}` : l.kontaktNavn}>{l.kontaktNavn}</span> : null}
                              {l.kontaktTlf ? (
                                <a href={`tel:${l.kontaktTlf}`} onClick={(e) => e.stopPropagation()} className="block text-[11.5px] text-[#78716c] hover:text-[#1c1917] hover:underline">
                                  {fmtTlf(l.kontaktTlf)}
                                </a>
                              ) : null}
                              {!l.annonsor && !l.kontaktNavn && !l.kontaktTlf ? <span className="text-[12px] text-[#ddd8d0]">–</span> : null}
                            </span>
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
                              <span className="flex items-center gap-1.5">
                                <StatusPrikk s={st} />
                                {l.salg?.tildeltTil && <SelgerBadge selger={l.salg.tildeltTil} størrelse={18} />}
                              </span>
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
                          <td className="px-2 py-2 text-right text-[12.5px] font-semibold text-[#44403c]" style={heading}>{tall(l.pris)}</td>
                          <td className="px-2 py-2 text-right text-[12.5px] text-[#78716c]" style={heading}>{l.analyse?.anbefaltLeie ? tall(l.analyse.anbefaltLeie) : '–'}</td>
                          <td className="px-3.5 py-2 text-right text-[12.5px] text-[#0e7490]">{l.aapninger || 0}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Høyre: minimal salgs-skuff i splittvisning */}
          {splitt && (
            <div className="sticky top-3 min-w-0 flex-1 overflow-hidden rounded-[10px] border border-black/[0.07] bg-white" style={{ height: 'calc(100vh - 148px)', minHeight: 520 }}>
              {skuffEnkel}
            </div>
          )}
        </div>
      )}

      {/* Utvidet: stor sentrert visning (fra alle moduser) */}
      {valgt && utvidet && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-5">
          <div className="absolute inset-0 bg-[#0a0a0a]/50" onClick={() => { setUtvidet(false); }} />
          <div className="dh-scale-in relative h-full w-full max-w-[1320px] overflow-hidden rounded-[12px] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
            {panel}
          </div>
        </div>
      )}

      {/* Ikke-utvidet: minimal salgs-skuff som høyre-ark / fullskjerm (mobil) */}
      {valgt && !splitt && !utvidet && (
        <div className="fixed inset-0 z-[125] flex justify-end">
          <div className="absolute inset-0 bg-[#0a0a0a]/40" onClick={() => setValgtId(null)} />
          <div className="dh-pop relative h-full w-full overflow-hidden bg-white shadow-2xl lg:w-[560px]">
            {skuffEnkel}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {valgt && lightbox && lysbilder.length > 0 && (
        <Lightbox
          liste={lysbilder}
          idx={Math.min(lightbox.idx, lysbilder.length - 1)}
          setIdx={(fn) => setLightbox((prev) => ({ idx: typeof fn === 'function' ? fn(prev?.idx || 0) : fn }))}
          onClose={() => setLightbox(null)}
        />
      )}

      {/* Før/etter-sammenligning i fullskjerm — åpnes fra bildearbeidsflaten */}
      {valgt && smlPar && (
        <SammenlignModal par={[smlPar]} idx={0} setIdx={() => {}} onClose={() => setSmlPar(null)} />
      )}

      {/* Salgspipeline-dialoger: årsak (tapt/ikke relevant), vunnet og rapport */}
      {arsakDialog && (
        <ArsakModal lead={arsakDialog.lead} status={arsakDialog.status} arsaker={arsaker}
          onBekreft={(arsak) => sendSalgsstatus(arsakDialog.lead.id, arsakDialog.status, { arsak })}
          onLukk={() => setArsakDialog(null)} />
      )}
      {vunnetDialog && aktor && (
        <VunnetModal lead={vunnetDialog.lead} aktor={aktor} selgere={selgere}
          onBekreft={(vunnet) => sendSalgsstatus(vunnetDialog.lead.id, 'vunnet', { vunnet })}
          onLukk={() => setVunnetDialog(null)} />
      )}
      {visRapport && aktor && <RapportModal api={api} aktor={aktor} onLukk={() => setVisRapport(false)} />}

      {/* Diskret lagret-kvittering */}
      {lagret && (
        <div className="dh-scale-in pointer-events-none fixed bottom-5 left-1/2 z-[230] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#1c1917] px-3.5 py-2 text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(28,25,23,0.35)]" data-testid="radar-lagret">
          <Check className="h-3.5 w-3.5 text-[#7ee2a8]" /> Lagret
        </div>
      )}
    </div>
  );
}
