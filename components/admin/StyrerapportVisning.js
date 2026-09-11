'use client';

// ─────────────────────────────────────────────────────────────────────────────
// STYRERAPPORT · VISNING — verdensklasse redaksjonell rapport bygget på DigiHome-
// forsidens designspråk (full-bredde nav, segmentert kapittelpille som TOC,
// mørk «ink»-forside, hårfine 1px-linjer, e-display/e-h2-typografi, lilla #7C3AED
// kun som detalj, tabulære tall). Fullt responsivt. Én felles visning brukes både
// i admin (med valgfri redigering) og på den eksterne delingslenken.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight, ArrowDownRight, ShieldCheck, Type, Hash, List,
  ChevronUp, ChevronDown, Trash2, Loader2, Plus, PenLine,
} from 'lucide-react';
import { RikInnhold, RikStil, TOM_DOC, RIK_LAYOUTS, RIK_ANKERE, tekstTilDoc } from './RikRenderer';

// Tiptap-editoren lastes kun i redigeringsmodus (holder delingslenken lett, ingen SSR).
const RikEditor = dynamic(() => import('./RikEditor'), { ssr: false, loading: () => <div className="e-meta py-6">Laster editor …</div> });

// Redaksjonell palett — nå på nettsidens varme «stein»-canvas (#F3F1EC) som forsiden
const C = { ink: '#15130F', ink2: '#3A3733', ink3: '#6F6A60', line: '#E4DFD6', line2: '#D6CFC4', canvas: '#F3F1EC', paper: '#FDFCFB', paper2: '#EFEBE3', flate: '#EAE6DE', accent: '#7C3AED', pos: '#1B7A46', neg: '#C0362C' };
const H = { fontFamily: 'var(--font-heading), sans-serif' };

// ── Format ──────────────────────────────────────────────────────────────────
// Tusenskille: nb-NO gir U+00A0/U+202F som i display-fonten (PP Right Grotesk)
// rendres altfor vidt. Vi normaliserer til U+202F (smalt, ikke-brytende) og
// setter samme smale mellomrom foran enheten, så «36 362 kr» leser tett og riktig.
const NBSP_SMAL = '\u202F';
const grp = (s) => String(s).replace(/[\u00A0\u202F\u2009 ]/g, NBSP_SMAL);
export const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
export const kr = (n) => (n == null || isNaN(n) ? '—' : `${grp(nf0.format(Math.round(Number(n))))}${NBSP_SMAL}kr`);
export const krKort = (n) => {
  if (n == null || isNaN(n)) return '—';
  const v = Number(n); const a = Math.abs(v);
  if (a >= 1e6) return `${grp(nf1.format(v / 1e6))}${NBSP_SMAL}mill`;
  if (a >= 1e4) return `${grp(nf0.format(Math.round(v / 1000)))}k`;
  return grp(nf0.format(Math.round(v)));
};
export const mndTxt = (n) => (n == null || isNaN(n) ? '—' : `${grp(nf1.format(Number(n)))}${NBSP_SMAL}mnd`);
export const pct = (n) => (n == null || isNaN(n) ? '—' : `${grp(nf1.format(Number(n)))}${NBSP_SMAL}%`);
export const antall = (n) => (n == null || isNaN(n) ? '—' : grp(nf0.format(Math.round(Number(n)))));
const firstNum = (...xs) => { for (const x of xs) { const n = Number(x); if (x != null && Number.isFinite(n)) return n; } return null; };
const CHANNEL_NO = { marketing: 'Markedsføring', organisk: 'Organisk', ukjent: 'Ukjent', direct: 'Direkte', finn: 'FINN', google: 'Google', meta: 'Meta', referral: 'Anbefaling', manual: 'Manuelt' };

export const PRINT_CSS = `
@media print {
  .dh-sr-noprint { display: none !important; }
  body * { visibility: hidden !important; }
  .dh-sr-print, .dh-sr-print * { visibility: visible !important; }
  .dh-sr-print { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; }
  .dh-sr-anim { opacity: 1 !important; transform: none !important; }
  .dh-sr-dark { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body { background: #fff !important; }
  section { break-inside: avoid; }
}
`;

// ── Blokk-konvertering (redigerbar «raw» ⇄ lagret struktur) ────────────────
// Typer: rik (Tiptap-doc, eget kapittel m/ plassering + layout), tall, liste, tekst (legacy).
const RIK_ANKER_IDS = RIK_ANKERE.map((a) => a.id);
const RIK_LAYOUT_IDS = RIK_LAYOUTS.map((l) => l.id);
export function blokkTilRaw(b) {
  if (!b) return '';
  if (b.type === 'rik') return '';
  if (b.type === 'liste') return (b.punkter || []).join('\n');
  if (b.type === 'tall') return (b.tall || []).map((t) => [t.etikett, t.verdi, t.notat].filter(Boolean).join(' | ')).join('\n');
  return b.tekst || '';
}
export function rawTilBlokk(b) {
  const grunn = { id: b.id, type: b.type, tittel: (b.tittel || '').trim() };
  const raw = b.raw || '';
  if (b.type === 'rik') return { ...grunn, kicker: (b.kicker || '').trim(), layout: RIK_LAYOUT_IDS.includes(b.layout) ? b.layout : 'standard', etter: RIK_ANKER_IDS.includes(b.etter) ? b.etter : 'slutt', doc: b.doc && b.doc.type === 'doc' ? b.doc : TOM_DOC };
  if (b.type === 'liste') return { ...grunn, punkter: raw.split('\n').map((s) => s.trim()).filter(Boolean) };
  if (b.type === 'tall') return { ...grunn, tall: raw.split('\n').map((line) => { const [etikett, verdi, notat] = line.split('|').map((s) => (s || '').trim()); return { etikett: etikett || '', verdi: verdi || '', notat: notat || '' }; }).filter((t) => t.etikett || t.verdi) };
  return { ...grunn, tekst: raw };
}
export const nyBlokkRaw = (type, extra = {}) => ({
  id: `b_${Math.random().toString(36).slice(2, 10)}`, type, tittel: '', raw: '',
  ...(type === 'rik' ? { kicker: '', layout: 'standard', etter: 'slutt', doc: TOM_DOC } : {}),
  ...extra,
});
// Gamle «tekst»-blokker løftes til rike seksjoner (ingenting går tapt).
export const migrerBlokk = (b) => (b && b.type === 'tekst' ? { ...b, type: 'rik', kicker: '', layout: 'standard', etter: 'slutt', doc: tekstTilDoc(b.tekst || b.raw || '') } : b);

// ── Bevegelse (rolig, respekterer reduced-motion) ───────────────────────────
function Reveal({ children, delay = 0, className = '' }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={`dh-sr-anim ${className}`} initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}
function useCountUp(target, duration = 900) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(target);
  useEffect(() => {
    const to = Number(target);
    if (target == null || !Number.isFinite(to) || reduce) { setV(target); return undefined; }
    const start = performance.now(); let raf = 0;
    const tick = (now) => { const p = Math.min(1, (now - start) / duration); const e = 1 - Math.pow(1 - p, 3); setV(to * e); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, reduce]);
  return v;
}
function Num({ value, fmt }) { const v = useCountUp(value); return <>{value == null ? '—' : fmt(v)}</>; }

// ── Byggeklosser (hårfine paneler, ingen tunge skygger) ─────────────────────
function Panel({ className = '', dark = false, children, style }) {
  return <div className={`rounded-[14px] border ${dark ? 'dh-sr-dark' : 'bg-white'} ${className}`} style={{ borderColor: dark ? 'rgba(255,255,255,0.14)' : C.line, background: dark ? C.ink : undefined, ...style }}>{children}</div>;
}
function Big({ children, tone, size = 'md', dark = false, className = '' }) {
  const s = { xl: 'text-[clamp(30px,4.4vw,42px)]', lg: 'text-[clamp(28px,3.6vw,38px)]', md: 'text-[clamp(24px,2.4vw,30px)]', sm: 'text-[22px]' }[size] || '';
  const color = tone === 'pos' ? C.pos : tone === 'neg' ? C.neg : (dark ? '#fff' : C.ink);
  return <p className={`${s} leading-[1] font-bold tracking-[-0.035em] tabular-nums ${className}`} style={{ ...H, color }}>{children}</p>;
}
function Delta({ now, prev, suffix = 'vs forrige mnd', dark = false, invert = false }) {
  if (now == null || prev == null || !prev) return null;
  const d = ((now - prev) / Math.abs(prev)) * 100;
  if (!Number.isFinite(d)) return null;
  const up = d >= 0; const good = invert ? !up : up;
  const col = good ? C.pos : C.neg;
  return (
    <span className="inline-flex items-center gap-1 rounded-[6px] border px-2 py-[3px] text-[11px] font-semibold tabular-nums" style={{ borderColor: dark ? 'rgba(255,255,255,0.18)' : 'var(--e-line)', color: dark ? (good ? '#8ff0b0' : '#ffb0b0') : col }}>
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{nf1.format(Math.abs(d))} %<span className="font-medium opacity-70">{suffix}</span>
    </span>
  );
}
function Kpi({ label, value, fmt = (v) => v, sub, delta, tone, size = 'md', className = '' }) {
  return (
    <Panel className={`p-5 sm:p-6 flex flex-col justify-between gap-5 ${className}`}>
      <p className="e-label">{label}</p>
      <div>
        <Big size={size} tone={tone}>{typeof value === 'number' ? <Num value={value} fmt={fmt} /> : (value ?? '—')}</Big>
        {(sub || delta) && <div className="mt-2.5 flex flex-wrap items-center gap-2">{delta}{sub && <span className="e-meta">{sub}</span>}</div>}
      </div>
    </Panel>
  );
}
// «+ Ny seksjon her» — vises mellom kapitler i redigeringsmodus
function InsertRad({ onClick }) {
  return (
    <div className="dh-sr-noprint mt-12 flex items-center gap-4">
      <span className="h-px flex-1" style={{ background: C.line }} aria-hidden />
      <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-full border border-dashed px-4 text-[12.5px] font-semibold transition-colors hover:border-[#15130F] hover:text-[#15130F]" style={{ borderColor: C.line2, color: C.ink3 }}><Plus className="h-4 w-4" /> Ny seksjon her</button>
      <span className="h-px flex-1" style={{ background: C.line }} aria-hidden />
    </div>
  );
}

function SectionHead({ index, overline, title, lead, right }) {
  return (
    <div className="mb-8 sm:mb-12 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-[820px]">
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[13px] font-bold tabular-nums" style={{ ...H, color: C.accent }}>{index}</span>
          <span className="h-px w-9" style={{ background: C.line2 }} aria-hidden />
          <span className="e-label">{overline}</span>
        </div>
        <h2 className="e-h2">{title}</h2>
        {lead && <p className="e-lead mt-4 max-w-[700px]">{lead}</p>}
      </div>
      {right && <div className="dh-sr-noprint shrink-0">{right}</div>}
    </div>
  );
}

function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]; const p1 = pts[i]; const p2 = pts[i + 1]; const p3 = pts[i + 2] || p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}
function AreaChart({ data = [], height = 168, id = 'a' }) {
  const n = data.length; if (n < 2) return null;
  const W = 600; const padX = 6; const padT = 14; const padB = 6;
  const vals = data.map((d) => Number(d.v) || 0);
  const max = Math.max(1, ...vals); const min = Math.min(0, ...vals);
  const x = (i) => padX + (i / (n - 1)) * (W - 2 * padX);
  const y = (v) => padT + (1 - (v - min) / ((max - min) || 1)) * (height - padT - padB);
  const pts = vals.map((v, i) => [x(i), y(v)]);
  const path = smoothPath(pts);
  const area = `${path} L ${x(n - 1)} ${height - padB} L ${x(0)} ${height - padB} Z`;
  const gid = `dh-sr-grad-${id}`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="block h-auto w-full" role="img" aria-label="Utvikling">
        <defs><linearGradient id={gid} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity="0.16" /><stop offset="100%" stopColor={C.accent} stopOpacity="0" /></linearGradient></defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke={C.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <circle cx={x(n - 1)} cy={y(vals[n - 1])} r="4" fill={C.accent} stroke={C.paper} strokeWidth="2" />
      </svg>
      <div className="mt-2.5 flex justify-between text-[11px] font-medium tabular-nums" style={{ color: C.ink3 }}>
        <span>{data[0].label}</span><span className="hidden sm:inline">{data[Math.floor((n - 1) / 2)].label}</span><span>{data[n - 1].label}</span>
      </div>
    </div>
  );
}
function PosNegBars({ data = [], height = 140, fmt = (v) => v }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(Number(d.v) || 0)));
  return (
    <div>
      <div className="relative flex gap-[5px]" style={{ height }}>
        <div className="absolute left-0 right-0 top-1/2" style={{ height: 1, background: C.line }} />
        {data.map((d, i) => {
          const v = Number(d.v) || 0; const h = (Math.abs(v) / max) * 48;
          return (
            <div key={i} className="relative h-full flex-1" title={`${d.label}: ${fmt(v)}`}>
              <div className="absolute left-0 right-0 rounded-[3px]" style={{ background: v >= 0 ? C.accent : C.neg, opacity: 0.92, height: `${Math.max(1.5, h)}%`, ...(v >= 0 ? { bottom: '50%' } : { top: '50%' }) }} />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[5px]">{data.map((d, i) => <span key={i} className="flex-1 text-center text-[9.5px] uppercase tracking-wide" style={{ color: C.ink3 }}>{d.label}</span>)}</div>
    </div>
  );
}
function BarListe({ items = [], verdiKey = 'belop', navnKey, tom = 'Ingen poster', maks = 6, total }) {
  const rows = items.slice(0, maks);
  const sum = total ?? items.reduce((a, i) => a + Math.abs(Number(i[verdiKey]) || 0), 0);
  const max = Math.max(1, ...rows.map((i) => Math.abs(Number(i[verdiKey]) || 0)));
  if (!rows.length) return <p className="e-meta">{tom}</p>;
  return (
    <div className="space-y-3.5">
      {rows.map((it, i) => {
        const v = Number(it[verdiKey]) || 0; const navn = it[navnKey || 'navn'] || it.category || `Konto ${it.kontonr || ''}`;
        return (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
              <span className="truncate" style={{ color: C.ink2 }}>{navn}</span>
              <span className="shrink-0 tabular-nums"><span className="font-semibold" style={{ color: C.ink }}>{kr(v)}</span>{sum > 0 && <span className="ml-2 text-[11.5px]" style={{ color: C.ink3 }}>{nf0.format((Math.abs(v) / sum) * 100)} %</span>}</span>
            </div>
            <div className="mt-1.5 h-[5px] overflow-hidden rounded-full" style={{ background: C.paper2 }}><div className="h-full rounded-full" style={{ width: `${(Math.abs(v) / max) * 100}%`, background: C.accent }} /></div>
          </div>
        );
      })}
    </div>
  );
}
function Tabell({ kolonner, rader, tom = 'Ingen rader.' }) {
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full text-[13.5px]">
        <thead><tr className="text-left">{kolonner.map((k, i) => <th key={i} className={`e-label pb-3 ${k.align === 'right' ? 'text-right' : ''}`}>{k.t}</th>)}</tr></thead>
        <tbody>
          {rader.length === 0 && <tr><td colSpan={kolonner.length} className="e-meta py-4">{tom}</td></tr>}
          {rader.map((r, ri) => (
            <tr key={ri} className={r.sterk ? 'font-semibold' : ''} style={{ borderTop: `1px solid ${C.line}` }}>
              {r.c.map((c, ci) => <td key={ci} className={`py-3 ${kolonner[ci].align === 'right' ? 'text-right tabular-nums' : ''}`} style={{ color: (c && c.color) || C.ink2 }}>{c && c.v !== undefined ? c.v : c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const StatusChip = ({ s }) => {
  const map = { aktiv: [C.pos, 'rgba(27,122,70,0.10)'], pauset: ['#9a5b00', 'rgba(154,91,0,0.10)'], venter: ['#9a5b00', 'rgba(154,91,0,0.10)'] };
  const [fg, bg] = map[s] || [C.ink3, 'rgba(10,10,10,0.05)'];
  return <span className="inline-block rounded-[6px] px-2 py-0.5 text-[11px] font-semibold" style={{ color: fg, background: bg }}>{s}</span>;
};

// ── Kapittelskinne (scroll-spy) ─────────────────────────────────────────────
function useAktivtKapittel(ids) {
  const [aktiv, setAktiv] = useState(ids[0]);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const els = ids.map((id) => document.getElementById(`sr-${id}`)).filter(Boolean);
    const io = new IntersectionObserver((entries) => { entries.forEach((e) => { if (e.isIntersecting) setAktiv(e.target.id.replace('sr-', '')); }); }, { rootMargin: '-24% 0px -64% 0px', threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [ids.join('|')]); // eslint-disable-line react-hooks/exhaustive-deps
  return aktiv;
}
const gaaTil = (id) => { const el = document.getElementById(`sr-${id}`); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

// ── Innholdslinje (moderne TOC) — animert glidende pille (framer layoutId) ──
function ContentsBar({ kapitler, aktiv }) {
  return (
    <div role="tablist" aria-label="Innhold" className="flex items-center gap-0.5">
      {kapitler.map((k, i) => {
        const er = aktiv === k.id;
        return (
          <button
            key={k.id}
            type="button"
            role="tab"
            aria-selected={er}
            onClick={() => gaaTil(k.id)}
            className="relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/30"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => { if (!er) e.currentTarget.style.background = 'rgba(21,19,15,0.05)'; }}
            onMouseLeave={(e) => { if (!er) e.currentTarget.style.background = 'transparent'; }}
          >
            {er && (
              <motion.span
                layoutId="sr-toc-pille"
                className="absolute inset-0 rounded-full"
                style={{ background: C.ink }}
                transition={{ type: 'spring', stiffness: 520, damping: 44 }}
              />
            )}
            <span className="relative z-[1] text-[10px] font-bold tabular-nums transition-colors" style={{ ...H, color: er ? '#c9a9ff' : C.line2 }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="relative z-[1] text-[13px] transition-colors" style={{ color: er ? '#fff' : C.ink3, fontWeight: er ? 600 : 500, letterSpacing: '-0.005em' }}>{k.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Full-bredde rapport-nav (som root) — masthead · handlinger · editorial TOC
function RapportNav({ kapitler, aktiv, handlinger }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let raf = 0;
    const f = () => { raf = 0; setScrolled((typeof window !== 'undefined' ? window.scrollY : 0) > 6); };
    const on = () => { if (!raf) raf = requestAnimationFrame(f); };
    f();
    window.addEventListener('scroll', on, { passive: true });
    return () => { window.removeEventListener('scroll', on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  const inner = 'mx-auto w-full max-w-[1600px] px-5 sm:px-8 lg:w-[calc(100%-64px)] lg:px-0';
  return (
    <header
      className="dh-sr-noprint sticky top-0 z-40 w-full transition-[border-color] duration-300"
      style={{ borderBottom: `1px solid ${scrolled ? C.line : 'transparent'}`, background: 'rgba(243,241,236,0.80)', backdropFilter: 'saturate(180%) blur(14px)', WebkitBackdropFilter: 'saturate(180%) blur(14px)' }}
    >
      {/* Én linje: merke · tabs (sentrert) · handlinger — som forsidens NavV4 */}
      <div className={`${inner} flex h-[60px] items-center gap-3 sm:gap-4`}>
        <div className="flex shrink-0 items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-hero-logo.svg" alt="DigiHome" className="h-5 w-auto" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          <span className="hidden h-4 w-px lg:block" style={{ background: C.line2 }} aria-hidden />
          <span className="hidden text-[11px] font-semibold uppercase tracking-[0.2em] lg:inline" style={{ color: C.ink3 }}>Styrerapport</span>
        </div>
        {/* Tabs midt i linja — sentrert når det er plass, scroller ellers */}
        <div className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto w-max">
            <ContentsBar kapitler={kapitler} aktiv={aktiv} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">{handlinger}</div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function StyrerapportVisning({
  innhold, edit = null, data, regnskap = null, regnskapKontroller = null, regnskapStatus = null,
  visRegnskap = true, visning = 'admin', lenke = null, handlinger = null,
}) {
  const inn = innhold || {};
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
  const tidslinje = Array.isArray(sel?.tidslinje) ? sel.tidslinje : [];

  const mrr = firstNum(selKons?.inntekt, cs?.totalMrr, inv?.mrrNow);
  const arr = mrr != null ? mrr * 12 : firstNum(cs?.arr, inv?.arrNow);
  const enheter = firstNum(selKons?.enheter, cs?.totalProperties, inv?.activeUnits);
  const aktiveKunder = firstNum(cs?.activeCustomers);
  const betalende = firstNum(cs?.payingCustomers);
  const arpa = firstNum(cs?.arpa, inv?.arpa);
  const perEnhet = mrr != null && enheter ? mrr / enheter : null;

  const okono = selKons ? {
    inntekt: selKons.inntekt, kost: selKons.kost, resultat: selKons.resultat,
    margin: selKons.inntekt > 0 ? Math.round((selKons.resultat / selKons.inntekt) * 1000) / 10 : null,
    costBreakdown: selKons.costBreakdown || [], kontant: selKons.kontant, runway: selKons.runwayMnd,
    burn: (selKons.resultat != null && selKons.resultat < 0) ? -selKons.resultat : 0,
    beEnheter: perEnhet ? Math.ceil((selKons.kost || 0) / perEnhet) : null, kilde: 'leieforhold',
  } : (res ? {
    inntekt: res.incomeForventet, kost: res.opexTotal, resultat: res.resultatForventet, margin: res.marginForventet,
    costBreakdown: kostnadsdeling, kontant: liq?.opening, runway: liq?.summary?.forventet?.runwayMonths,
    burn: liq?.summary?.forventet?.burnRate, beEnheter: res.breakEvenContracts, kilde: 'modell',
  } : null);
  const runway = firstNum(selKons?.runwayMnd, liq?.summary?.forventet?.runwayMonths);
  const runwaySet = (selKons?.kontant != null) || !!liq?.openingSet;
  const kontanter = firstNum(selKons?.kontant, liq?.opening);
  const beNaa = okono?.kilde === 'leieforhold' ? enheter : firstNum(res?.activeContracts);

  const mrrTrend = tidslinje.length > 1 ? tidslinje.map((t) => ({ label: String(t.ym || '').slice(2).replace('-', '/'), v: (t.konsern && t.konsern.inntekt) || 0 })) : mrrHist.map((m) => ({ label: m.label, v: m.mrrForventet }));
  const resTrend = tidslinje.length > 1 ? tidslinje.map((t) => ({ label: String(t.ym || '').slice(5), v: (t.konsern && t.konsern.resultat) || 0 })) : [];
  const forrigeMrr = mrrTrend.length > 1 ? mrrTrend[mrrTrend.length - 2].v : null;
  const aarSidenMrr = mrrTrend.length >= 13 ? mrrTrend[mrrTrend.length - 13].v : null;

  const nrr = inv?.retention?.nrr ?? null; const grr = inv?.retention?.grr ?? null;
  const cac = inv?.payback?.cac ?? null; const ltv = inv?.payback?.ltv ?? null;
  const ltvCac = inv?.payback?.ltvCac ?? null; const payback = inv?.payback?.paybackMonths ?? null;

  const kanalListe = useMemo(() => Object.entries(cust?.byChannel || {}).map(([k, v]) => ({ navn: CHANNEL_NO[k] || k, count: v.count, mrr: v.mrr })).sort((a, b) => (b.mrr - a.mrr) || (b.count - a.count)), [cust]);
  const toppKunder = useMemo(() => (cust?.customers || []).filter((c) => c.status !== 'churnet').slice(0, 8), [cust]);
  const sammendragAvsnitt = (inn.sammendrag || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const askPunkter = (inn.askRaw || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const blokker = inn.blokker || [];
  const genDato = data?.generatedAt ? new Date(data.generatedAt) : null;
  // I delt (offentlig) visning skjules tomme seksjoner helt, så rapporten alltid
  // ser ferdig ut. I admin vises plassholdere som en oppfordring til å fylle inn.
  const visSammendrag = !!edit || visning === 'admin' || sammendragAvsnitt.length > 0;
  const visAsk = !!edit || visning === 'admin' || askPunkter.length > 0;

  // Rike seksjoner (Tiptap) blir egne kapitler, plassert etter valgt anker.
  // Enkle blokker (tall/liste) samles fortsatt under «Egne seksjoner».
  const rike = blokker.filter((b) => b.type === 'rik');
  const enkle = blokker.filter((b) => b.type !== 'rik');
  const synligAnker = { start: true, sammendrag: visSammendrag, nokkeltall: true, resultat: true, regnskap: visRegnskap, kunder: true, prognose: !!fc?.scenarios, slutt: true };
  // Rike seksjoner som peker på et skjult anker flyttes til nærmeste synlige anker foran.
  const etterMap = useMemo(() => {
    const m = {}; let sist = 'start';
    RIK_ANKER_IDS.forEach((a) => { if (synligAnker[a]) { sist = a; m[a] = m[a] || []; } m[sist] = m[sist] || []; m[sist].push(...rike.filter((b) => (RIK_ANKER_IDS.includes(b.etter) ? b.etter : 'slutt') === a)); });
    return m;
  }, [rike, visSammendrag, visRegnskap, fc]); // eslint-disable-line react-hooks/exhaustive-deps
  const rikKap = (b) => ({ id: `rik-${b.id}`, label: (b.tittel || '').trim() || 'Ny seksjon' });

  const kapitler = useMemo(() => {
    const k = [];
    const rikePaa = (a) => (etterMap[a] || []).forEach((b) => k.push(rikKap(b)));
    rikePaa('start');
    if (visSammendrag) { k.push({ id: 'sammendrag', label: 'Sammendrag' }); rikePaa('sammendrag'); }
    k.push({ id: 'nokkeltall', label: 'Nøkkeltall' }); rikePaa('nokkeltall');
    k.push({ id: 'resultat', label: 'Resultat' }); rikePaa('resultat');
    if (visRegnskap) { k.push({ id: 'regnskap', label: 'Regnskap' }); rikePaa('regnskap'); }
    k.push({ id: 'kunder', label: 'Kunder' }); rikePaa('kunder');
    if (fc?.scenarios) { k.push({ id: 'prognose', label: 'Prognose' }); rikePaa('prognose'); }
    rikePaa('slutt');
    if (enkle.length || edit) k.push({ id: 'egne', label: 'Egne' });
    if (visAsk) k.push({ id: 'ask', label: 'Beslutning' });
    return k;
  }, [visRegnskap, fc, enkle.length, edit, visSammendrag, visAsk, etterMap]);
  const aktiv = useAktivtKapittel(kapitler.map((k) => k.id));
  // Folio brukes både i TOC og i seksjonshodene, så nummereringen alltid stemmer
  // (også når tomme kapitler skjules i delt visning).
  const folio = (id) => { const i = kapitler.findIndex((k) => k.id === id); return i >= 0 ? String(i + 1).padStart(2, '0') : ''; };

  const felt = 'w-full rounded-[10px] border bg-white px-4 py-3 text-[15px] outline-none transition focus:border-[#0A0A0A] focus:shadow-[0_0_0_3px_rgba(10,10,10,0.06)]';
  const feltStyle = { borderColor: C.line2, color: C.ink };
  const btnEd = 'inline-flex items-center gap-2 h-11 px-4 rounded-[8px] border text-[13.5px] font-semibold transition-colors';
  const secBase = '';
  const secStyle = { scrollMarginTop: 116, paddingTop: 'clamp(60px,7.4vw,124px)' };

  // ── Rik seksjon: eget kapittel med folio, plassering og layout ────────────
  const rikSeksjon = (b) => {
    const bs = rawTilBlokk(b);
    const id = `sr-rik-${b.id}`;
    const f = folio(`rik-${b.id}`);
    const idx = blokker.findIndex((x) => x.id === b.id);
    if (edit) {
      const sel = 'h-9 rounded-[8px] border bg-white px-2.5 text-[12.5px] font-medium outline-none focus:border-[#15130F]';
      return (
        <section key={b.id} id={id} style={secStyle}>
          <div className="rounded-[18px] border bg-white p-5 sm:p-7" style={{ borderColor: C.line2 }}>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: C.paper2, color: C.ink3 }}><PenLine className="h-3 w-3" /> Rik seksjon · {f}</span>
              <select className={sel} style={{ borderColor: C.line2, color: C.ink2 }} value={bs.etter} onChange={(e) => edit.oppdaterBlokk(b.id, { etter: e.target.value })} title="Plassering i rapporten">
                {RIK_ANKERE.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
              <select className={sel} style={{ borderColor: C.line2, color: C.ink2 }} value={bs.layout} onChange={(e) => edit.oppdaterBlokk(b.id, { layout: e.target.value })} title="Layout">
                {RIK_LAYOUTS.map((l) => <option key={l.id} value={l.id}>{l.label} — {l.hint}</option>)}
              </select>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04] disabled:opacity-30" onClick={() => edit.flyttBlokk(b.id, -1)} disabled={idx <= 0} title="Flytt opp"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04] disabled:opacity-30" onClick={() => edit.flyttBlokk(b.id, 1)} disabled={idx >= blokker.length - 1} title="Flytt ned"><ChevronDown className="h-4 w-4" /></button>
                <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04]" style={{ color: C.neg }} onClick={() => { if (window.confirm('Slette denne seksjonen?')) edit.slettBlokk(b.id); }} title="Slett"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <input className="mb-2 w-full bg-transparent text-[11.5px] font-bold uppercase tracking-[0.16em] outline-none placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-[#B5AFA4]" style={{ color: C.accent }} value={b.kicker || ''} onChange={(e) => edit.oppdaterBlokk(b.id, { kicker: e.target.value })} placeholder="Kicker / overlinje — f.eks. Marked, Produkt, Organisasjon" />
            <input className="mb-6 w-full bg-transparent font-bold outline-none placeholder:font-semibold placeholder:text-[#C9C3B8]" style={{ ...H, color: C.ink, fontSize: 'clamp(26px,3vw,38px)', lineHeight: 1.1, letterSpacing: '-0.03em' }} value={b.tittel || ''} onChange={(e) => edit.oppdaterBlokk(b.id, { tittel: e.target.value })} placeholder="Overskrift på seksjonen" />
            <RikEditor doc={b.doc} onChange={(doc) => edit.oppdaterBlokk(b.id, { doc })} />
          </div>
        </section>
      );
    }
    const hode = (
      <>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-[13px] font-bold tabular-nums" style={{ ...H, color: C.accent }}>{f}</span>
          <span className="h-px w-9" style={{ background: C.line2 }} aria-hidden />
          <span className="e-label">{bs.kicker || 'Egen seksjon'}</span>
        </div>
        <h2 className="e-h2">{bs.tittel || 'Ny seksjon'}</h2>
      </>
    );
    return (
      <section key={b.id} id={id} style={secStyle}>
        <Reveal>
          {bs.layout === 'sidestilt' ? (
            <div className="grid gap-8 lg:grid-cols-12 lg:gap-14">
              <div className="lg:col-span-4"><div className="lg:sticky lg:top-24">{hode}</div></div>
              <div className="lg:col-span-8"><RikInnhold doc={bs.doc} layout="standard" /></div>
            </div>
          ) : (
            <>
              <div className="mb-8 sm:mb-10">{hode}</div>
              <RikInnhold doc={bs.doc} layout={bs.layout} />
            </>
          )}
        </Reveal>
      </section>
    );
  };
  const rikGruppe = (anker) => (
    <React.Fragment key={`gruppe-${anker}`}>
      {(etterMap[anker] || []).map((b) => rikSeksjon(b))}
      {edit && synligAnker[anker] && <InsertRad onClick={() => edit.leggTilBlokk('rik', { etter: anker })} />}
    </React.Fragment>
  );

  const coverKpis = [
    { l: 'Honorar · MRR', v: mrr, f: kr, s: 'per måned', d: <Delta now={mrr} prev={forrigeMrr} suffix="" /> },
    { l: 'ARR', v: arr, f: kr, s: 'årlig recurring', d: aarSidenMrr ? <Delta now={mrr} prev={aarSidenMrr} suffix="" /> : null },
    { l: 'Enheter u/forvaltning', v: enheter, f: antall, s: aktiveKunder != null ? `${antall(aktiveKunder)} aktive kunder` : '' },
    { l: 'Resultat / mnd', v: okono?.resultat ?? null, f: kr, s: okono?.margin != null ? `margin ${pct(okono.margin)}` : '', tone: (okono?.resultat || 0) >= 0 ? 'pos' : 'neg' },
  ];

  return (
    <div className="dh-sr-print" style={{ background: C.canvas }}>
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <RikStil />

      {/* ── FULL-BREDDE NAV + TOC ─────────────────────────────────────────── */}
      <RapportNav kapitler={kapitler} aktiv={aktiv} handlinger={handlinger} />

      {/* ── INNHOLD (sentrert redaksjonell spalte — IKKE full bredde) ─────── */}
      <div className="mx-auto w-full max-w-[1320px] px-5 pb-28 sm:px-8 lg:px-12">
        {/* ── COVER (lys, super-editorial masthead — ingen boks) ──────────── */}
        <section id="sr-cover" className="pt-9 sm:pt-14" style={{ scrollMarginTop: 116 }}>
          <Reveal>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-[6px] border px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ borderColor: C.line2, color: C.ink3 }}><ShieldCheck className="h-3.5 w-3.5" style={{ color: C.accent }} /> Konfidensiell · Intern</span>
                {lenke?.label && <span className="rounded-[6px] border px-2.5 py-1 text-[10.5px] font-semibold" style={{ borderColor: C.line2, color: C.ink3 }}>{lenke.label}</span>}
              </div>

              {edit ? (
                <input className={`${felt} mt-7 font-bold`} style={{ ...feltStyle, ...H, fontSize: 40 }} value={inn.tittel} onChange={(e) => edit.setTittel(e.target.value)} placeholder="Tittel" />
              ) : (
                <h1 className="e-display mt-7" style={{ fontSize: 'clamp(52px,9.5vw,116px)', letterSpacing: '-0.05em', lineHeight: 0.92 }}>{inn.tittel || 'Styrerapport'}</h1>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2">
                {edit ? (
                  <>
                    <input className={`${felt} h-11 w-full sm:w-56`} style={feltStyle} value={inn.motedato} onChange={(e) => edit.setMotedato(e.target.value)} placeholder="Møtedato (f.eks. 26. juni 2025)" />
                    <input className={`${felt} h-11 w-full sm:w-48`} style={feltStyle} value={inn.periodeLabel} onChange={(e) => edit.setPeriodeLabel(e.target.value)} placeholder="Periode (f.eks. Q2 2025)" />
                  </>
                ) : (
                  <>
                    {inn.motedato && <span className="text-[14px] font-medium" style={{ color: C.ink2 }}>{inn.motedato}</span>}
                    {inn.motedato && (inn.periodeLabel || genDato) && <span style={{ color: C.line2 }}>·</span>}
                    {inn.periodeLabel && <span className="text-[14px] font-medium" style={{ color: C.ink2 }}>{inn.periodeLabel}</span>}
                    {inn.periodeLabel && genDato && <span style={{ color: C.line2 }}>·</span>}
                    <span className="text-[14px]" style={{ color: C.ink3 }}>Tall per {genDato ? genDato.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                  </>
                )}
              </div>

              <div className="e-line mt-9 sm:mt-11" />

              <div className="grid grid-cols-2 gap-x-6 gap-y-9 pt-8 sm:grid-cols-4 sm:gap-x-0 sm:pt-10">
                {coverKpis.map((x, i) => (
                  <div key={i} className={`sm:px-8 ${i > 0 ? 'sm:border-l' : ''} ${i === 0 ? 'sm:pl-0' : ''} ${i === coverKpis.length - 1 ? 'sm:pr-0' : ''}`} style={{ borderColor: C.line }}>
                    <p className="e-label">{x.l}</p>
                    <p className="mt-3.5 font-bold tabular-nums" style={{ ...H, fontSize: 'clamp(28px,3.8vw,46px)', lineHeight: 1, letterSpacing: '-0.045em', color: x.tone === 'pos' ? C.pos : x.tone === 'neg' ? C.neg : C.ink }}>{x.v == null ? '—' : <Num value={x.v} fmt={x.f} />}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">{x.d}{x.s && <span className="e-meta">{x.s}</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        {rikGruppe('start')}

        {/* ── 01 SAMMENDRAG ─────────────────────────────────────────────── */}
        {visSammendrag && (
        <section id="sr-sammendrag" className={secBase} style={secStyle}>
          <Reveal>
            <SectionHead index={folio('sammendrag')} overline="Til styret" title="Sammendrag" lead="Situasjonen kort — høydepunkter, det som bekymrer, og hva vi ber styret ta stilling til." />
            {edit ? (
              <textarea className={`${felt} min-h-[220px] leading-relaxed`} style={feltStyle} value={inn.sammendrag} onChange={(e) => edit.setSammendrag(e.target.value)} placeholder="Skriv sammendraget her. Del i avsnitt med blank linje — første avsnitt fremheves." />
            ) : sammendragAvsnitt.length ? (
              <div className="max-w-[820px]">
                {sammendragAvsnitt.map((p, i) => (i === 0
                  ? <p key={i} className="e-h3" style={{ fontSize: 'clamp(20px,2vw,26px)', lineHeight: 1.4, fontWeight: 600 }}>{p}</p>
                  : <p key={i} className="e-body mt-5" style={{ fontSize: 16.5 }}>{p}</p>))}
              </div>
            ) : (
              <Panel className="border-dashed p-8"><p className="e-meta">Ingen sammendrag ennå{visning === 'admin' ? ' — trykk Rediger for å skrive.' : '.'}</p></Panel>
            )}
          </Reveal>
        </section>
        )}

        {rikGruppe('sammendrag')}

        {/* ── 02 NØKKELTALL ─────────────────────────────────────────────── */}
        <section id="sr-nokkeltall" className={secBase} style={secStyle}>
          <Reveal><SectionHead index={folio('nokkeltall')} overline="Traksjon" title="Nøkkeltall" lead="Levende tall fra plattformen og økonomimotoren — recurring honorar, portefølje, retensjon og enhetsøkonomi." /></Reveal>
          {!bp && !cs && !selKons ? (
            <Panel className="border-dashed p-8"><p className="e-meta">Nøkkeltall er midlertidig utilgjengelig.</p></Panel>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <Reveal className="md:col-span-7 md:row-span-2">
                <Panel className="flex h-full flex-col p-6 sm:p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="e-label">Honorarinntekt · MRR</p><Big size="lg" className="mt-3">{mrr == null ? '—' : <Num value={mrr} fmt={kr} />}</Big></div>
                    <div className="flex flex-col items-end gap-2"><Delta now={mrr} prev={forrigeMrr} />{aarSidenMrr ? <Delta now={mrr} prev={aarSidenMrr} suffix="vs 12 mnd" /> : null}</div>
                  </div>
                  <div className="mt-6 flex-1">{mrrTrend.length > 1 ? <AreaChart data={mrrTrend} id="mrr" /> : <p className="e-meta">Ingen historikk ennå.</p>}</div>
                </Panel>
              </Reveal>
              <Reveal className="md:col-span-5" delay={0.05}><Kpi label="ARR" value={arr} fmt={kr} sub="årlig recurring" className="h-full" /></Reveal>
              <Reveal className="md:col-span-5" delay={0.1}><Kpi label="Enheter under forvaltning" value={enheter} fmt={antall} sub={betalende != null ? `${antall(betalende)} betalende kunder` : (aktiveKunder != null ? `${antall(aktiveKunder)} aktive kunder` : '')} className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.05}><Kpi label="ARPA" value={arpa} fmt={kr} sub="per kunde / mnd" size="sm" className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.1}><Kpi label="NRR" value={nrr} fmt={pct} sub="net retention" size="sm" tone={nrr != null && nrr < 100 ? 'neg' : undefined} className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.15}><Kpi label="CAC" value={cac} fmt={kr} sub="kost per ny kunde" size="sm" className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.2}><Kpi label="LTV : CAC" value={ltvCac != null ? `${nf1.format(ltvCac)}×` : '—'} sub={payback != null ? `payback ${mndTxt(payback)}` : (ltv != null ? `LTV ${krKort(ltv)}` : (grr != null ? `GRR ${pct(grr)}` : ''))} size="sm" tone={ltvCac != null && ltvCac >= 3 ? 'pos' : undefined} className="h-full" /></Reveal>
            </div>
          )}
        </section>

        {rikGruppe('nokkeltall')}

        {/* ── 03 RESULTAT & LIKVIDITET ──────────────────────────────────── */}
        <section id="sr-resultat" className={secBase} style={secStyle}>
          <Reveal><SectionHead index={folio('resultat')} overline={okono?.kilde === 'leieforhold' ? 'Live drift' : 'Modelltall'} title="Resultat & likviditet" lead={okono?.kilde === 'leieforhold' ? 'Sikret honorar fra porteføljen mot faste kostnader — samme kilde som Leieforhold og budsjettet. Bokførte tall følger i Regnskap.' : 'Driftsmodellen basert på kontrakter og faste kostnader. Bokførte tall følger i Regnskap.'} /></Reveal>
          {!okono ? (
            <Panel className="border-dashed p-8"><p className="e-meta">Resultattall er midlertidig utilgjengelig.</p></Panel>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <Reveal className="md:col-span-7">
                <Panel className="h-full p-6 sm:p-7">
                  <div className="grid grid-cols-3 gap-4">
                    <div><p className="e-label">Inntekt</p><Big size="sm" className="mt-2.5">{kr(okono.inntekt)}</Big></div>
                    <div><p className="e-label">Kostnad</p><Big size="sm" className="mt-2.5">{kr(okono.kost)}</Big></div>
                    <div><p className="e-label">Resultat</p><Big size="sm" className="mt-2.5" tone={(okono.resultat || 0) >= 0 ? 'pos' : 'neg'}>{kr(okono.resultat)}</Big></div>
                  </div>
                  {okono.inntekt > 0 && (
                    <div className="mt-6">
                      <div className="flex h-3 w-full overflow-hidden rounded-full" style={{ background: C.paper2 }}>
                        <div className="h-full" style={{ width: `${Math.min(100, (Math.max(0, okono.kost) / okono.inntekt) * 100)}%`, background: C.ink }} />
                        {okono.resultat > 0 && <div className="h-full" style={{ width: `${Math.min(100, (okono.resultat / okono.inntekt) * 100)}%`, background: C.accent }} />}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 e-meta">
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: C.ink }} /> Kostnad {nf0.format((okono.kost / okono.inntekt) * 100)} %</span>
                        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: C.accent }} /> Margin {okono.margin != null ? pct(okono.margin) : '—'}</span>
                      </div>
                    </div>
                  )}
                  {resTrend.length > 1 && (
                    <div className="mt-8"><p className="e-label mb-3">Månedsresultat, siste {resTrend.length} mnd</p><PosNegBars data={resTrend} height={116} fmt={kr} /></div>
                  )}
                </Panel>
              </Reveal>
              <Reveal className="md:col-span-5" delay={0.05}>
                <Panel className="flex h-full flex-col justify-between gap-6 p-6 sm:p-7" style={{ background: C.paper2 }}>
                  <div>
                    <p className="e-label">Break-even</p>
                    <Big size="lg" className="mt-3">{okono.beEnheter != null ? antall(okono.beEnheter) : '—'}</Big>
                    <p className="mt-2 text-[13px]" style={{ color: C.ink3 }}>{okono.kilde === 'leieforhold' ? 'enheter for å dekke faste kostnader' : 'avtaler for å dekke faste kostnader'}</p>
                  </div>
                  {okono.beEnheter != null && beNaa != null && (
                    <div>
                      <div className="flex items-baseline justify-between text-[12.5px]" style={{ color: C.ink3 }}><span>Nå: <span className="font-semibold" style={{ color: C.ink }}>{antall(beNaa)}</span></span><span className="font-semibold" style={{ color: beNaa >= okono.beEnheter ? C.pos : C.neg }}>{beNaa >= okono.beEnheter ? `+${antall(beNaa - okono.beEnheter)} over` : `${antall(okono.beEnheter - beNaa)} igjen`}</span></div>
                      <div className="mt-2 h-2 w-full overflow-hidden rounded-full" style={{ background: C.line }}><div className="h-full rounded-full" style={{ width: `${Math.min(100, (beNaa / okono.beEnheter) * 100)}%`, background: C.accent }} /></div>
                    </div>
                  )}
                </Panel>
              </Reveal>
              <Reveal className="md:col-span-6" delay={0.05}>
                <Panel className="h-full p-6 sm:p-7"><div className="mb-5 flex items-center justify-between"><p className="text-[14px] font-semibold" style={{ color: C.ink }}>Kostnader per kategori</p><span className="e-meta">per måned</span></div><BarListe items={okono.costBreakdown} verdiKey="amount" navnKey="category" tom="Ingen kostnader registrert" total={okono.kost} /></Panel>
              </Reveal>
              <Reveal className="md:col-span-6" delay={0.1}>
                <Panel className="h-full p-6 sm:p-7">
                  <p className="mb-5 text-[14px] font-semibold" style={{ color: C.ink }}>Likviditet</p>
                  <div className="grid grid-cols-2 gap-5">
                    <div><p className="e-label">Kontanter</p><Big size="sm" className="mt-2.5">{runwaySet ? kr(kontanter) : '—'}</Big></div>
                    <div><p className="e-label">Burn / mnd</p><Big size="sm" className="mt-2.5" tone={okono.burn ? 'neg' : 'pos'}>{okono.burn ? kr(okono.burn) : 'Positiv drift'}</Big></div>
                    <div><p className="e-label">Runway</p><Big size="sm" className="mt-2.5" tone={runway != null && runway < 6 ? 'neg' : undefined}>{runwaySet ? (runway == null ? '∞' : mndTxt(runway)) : '—'}</Big></div>
                    <div><p className="e-label">{perEnhet ? 'Honorar / enhet' : 'Margin'}</p><Big size="sm" className="mt-2.5">{perEnhet ? kr(perEnhet) : pct(okono.margin)}</Big></div>
                  </div>
                  {!runwaySet && <p className="mt-5 rounded-[8px] px-3.5 py-2.5 text-[12.5px]" style={{ background: 'rgba(154,91,0,0.08)', color: '#8a5200' }}>Sett inngående kontantbeholdning i Økonomi-modulen for å beregne runway.</p>}
                </Panel>
              </Reveal>
              {selNaa && (
                <Reveal className="md:col-span-12" delay={0.1}>
                  <Panel className="p-6 sm:p-7"><p className="mb-4 text-[14px] font-semibold" style={{ color: C.ink }}>Per selskap · inneværende måned</p>
                    <Tabell kolonner={[{ t: 'Selskap' }, { t: 'Inntekt', align: 'right' }, { t: 'Kostnad', align: 'right' }, { t: 'Resultat', align: 'right' }, { t: 'Enheter', align: 'right' }]} rader={[['DigiHome AS', selNaa.digihome], ['DigiHome Tech AS', selNaa.tech], ['Sammenstilt', selNaa.konsern]].filter(([, s]) => s).map(([navn, s], i) => ({ sterk: i === 2, c: [navn, kr(s.inntekt), kr(s.kost), { v: kr(s.resultat), color: (s.resultat || 0) >= 0 ? C.pos : C.neg }, s.enheter != null ? antall(s.enheter) : '—'] }))} />
                  </Panel>
                </Reveal>
              )}
            </div>
          )}
        </section>

        {rikGruppe('resultat')}

        {/* ── 04 REGNSKAP ───────────────────────────────────────────────── */}
        {visRegnskap && (
          <section id="sr-regnskap" className={secBase} style={secStyle}>
            <Reveal><SectionHead index={folio('regnskap')} overline="Bokførte tall" title="Regnskap · PowerOffice" lead="Faktiske regnskapstall fra PowerOffice Go, sammenstilt for alle selskaper. «Sammenstilt» er summen av selskapene — ikke en formell konsolidering med elimineringer." right={regnskapKontroller} /></Reveal>
            {regnskapStatus?.feil && <Panel className="border-dashed p-7"><p className="text-[14px]" style={{ color: C.neg }}>{regnskapStatus.feil}</p></Panel>}
            {regnskapStatus?.laster && <Panel className="p-7"><p className="inline-flex items-center gap-2 text-[14px]" style={{ color: C.ink2 }}><Loader2 className="h-4 w-4 animate-spin" /> Henter fra PowerOffice …</p></Panel>}
            {!regnskap && !regnskapStatus?.feil && !regnskapStatus?.laster && <Panel className="border-dashed p-8"><p className="e-body">{visning === 'admin' ? 'Velg år og trykk Hent for å laste bokførte tall. Kan ta noen sekunder.' : 'Bokførte tall er ikke tilgjengelig akkurat nå.'}</p></Panel>}
            {regnskap && (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
                <Reveal className="md:col-span-3"><Kpi label={`Inntekt ${regnskap.ar}`} value={regnskap.resultat?.sum?.inntekt ?? null} fmt={kr} size="sm" className="h-full" /></Reveal>
                <Reveal className="md:col-span-3" delay={0.05}><Kpi label={`Kostnad ${regnskap.ar}`} value={regnskap.resultat?.sum?.kostnad ?? null} fmt={kr} size="sm" className="h-full" /></Reveal>
                <Reveal className="md:col-span-3" delay={0.1}><Kpi label={`Resultat ${regnskap.ar}`} value={regnskap.resultat?.sum?.resultat ?? null} fmt={kr} size="sm" tone={(regnskap.resultat?.sum?.resultat || 0) >= 0 ? 'pos' : 'neg'} className="h-full" /></Reveal>
                <Reveal className="md:col-span-3" delay={0.15}><Kpi label="Egenkapital" value={regnskap.balanse?.grupper?.egenkapital?.sum ?? null} fmt={kr} size="sm" sub={regnskap.balanse ? `eiendeler ${krKort(regnskap.balanse.grupper.eiendeler.sum)}` : ''} className="h-full" /></Reveal>
                {regnskap.resultat?.maaneder && <Reveal className="md:col-span-12" delay={0.05}><Panel className="p-6 sm:p-7"><p className="e-label mb-5">Resultat per måned · {regnskap.ar}</p><PosNegBars data={regnskap.resultat.maaneder.map((m) => ({ label: m.navn, v: m.resultat }))} height={150} fmt={kr} /></Panel></Reveal>}
                <Reveal className="md:col-span-6" delay={0.05}><Panel className="h-full p-6 sm:p-7"><p className="mb-5 text-[14px] font-semibold" style={{ color: C.ink }}>Største inntektskontoer</p><BarListe items={regnskap.resultat?.inntektKontoer || []} verdiKey="belop" /></Panel></Reveal>
                <Reveal className="md:col-span-6" delay={0.1}><Panel className="h-full p-6 sm:p-7"><p className="mb-5 text-[14px] font-semibold" style={{ color: C.ink }}>Største kostnadskontoer</p><BarListe items={regnskap.resultat?.kostnadKontoer || []} verdiKey="belop" /></Panel></Reveal>
                {regnskap.selskaper?.length > 1 && <Reveal className="md:col-span-12" delay={0.05}><Panel className="p-6 sm:p-7"><p className="mb-4 text-[14px] font-semibold" style={{ color: C.ink }}>Per selskap</p><Tabell kolonner={[{ t: 'Selskap' }, { t: 'Inntekt', align: 'right' }, { t: 'Kostnad', align: 'right' }, { t: 'Resultat', align: 'right' }]} rader={regnskap.selskaper.map((s) => ({ c: [<span key="n">{s.navn}{!s.resultatOk && <span className="ml-2 text-[11px]" style={{ color: '#8a5200' }}>ikke hentet</span>}</span>, kr(s.inntekt), kr(s.kostnad), { v: kr(s.resultat), color: s.resultat >= 0 ? C.pos : C.neg }] }))} /></Panel></Reveal>}
              </div>
            )}
          </section>
        )}

        {rikGruppe('regnskap')}

        {/* ── 05 KUNDER ─────────────────────────────────────────────────── */}
        <section id="sr-kunder" className={secBase} style={secStyle}>
          <Reveal><SectionHead index={folio('kunder')} overline="Portefølje" title="Kunder" lead="Utleiere under forvaltning — betalende kunder. Leietakere er ikke kunder og inngår ikke her." /></Reveal>
          {!cs ? (
            <Panel className="border-dashed p-8"><p className="e-meta">Kundedata er midlertidig utilgjengelig.</p></Panel>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <Reveal className="md:col-span-3"><Kpi label="Kunder totalt" value={cs.totalCustomers ?? null} fmt={antall} sub={cs.churnedCustomers != null ? `${antall(cs.churnedCustomers)} churnet` : ''} size="sm" className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.05}><Kpi label="Aktive kunder" value={cs.activeCustomers ?? null} fmt={antall} size="sm" className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.1}><Kpi label="Enheter" value={enheter ?? cs.totalProperties ?? null} fmt={antall} sub={selKons ? 'under forvaltning · live' : ''} size="sm" className="h-full" /></Reveal>
              <Reveal className="md:col-span-3" delay={0.15}><Kpi label="Churn" value={cs.churnRatePct ?? null} fmt={pct} sub={cs.lifetimeFees ? `livstidshonorar ${krKort(cs.lifetimeFees)}` : ''} size="sm" tone={cs.churnRatePct != null && cs.churnRatePct > 10 ? 'neg' : undefined} className="h-full" /></Reveal>
              <Reveal className="md:col-span-8" delay={0.05}>
                <Panel className="h-full p-6 sm:p-7"><p className="mb-4 text-[14px] font-semibold" style={{ color: C.ink }}>Største kunder</p><Tabell kolonner={[{ t: 'Kunde' }, { t: 'Enheter', align: 'right' }, { t: 'MRR', align: 'right' }, { t: 'Status' }]} rader={toppKunder.map((c) => ({ c: [<span key="n" className="font-medium" style={{ color: C.ink }}>{c.name || 'Ukjent eier'}</span>, antall(c.unitsCount ?? c.properties), <span key="m" className="font-semibold">{kr(c.mrr)}</span>, <StatusChip key="s" s={c.status} />] }))} tom="Ingen kunder ennå." /></Panel>
              </Reveal>
              <Reveal className="md:col-span-4" delay={0.1}>
                <Panel className="h-full p-6 sm:p-7"><p className="mb-5 text-[14px] font-semibold" style={{ color: C.ink }}>Kunder per kanal</p>{kanalListe.length === 0 ? <p className="e-meta">Ingen kanaldata.</p> : <BarListe items={kanalListe.map((k) => ({ navn: k.navn, mrr: k.mrr }))} verdiKey="mrr" />}</Panel>
              </Reveal>
            </div>
          )}
        </section>

        {rikGruppe('kunder')}

        {/* ── 06 PROGNOSE ───────────────────────────────────────────────── */}
        {fc?.scenarios && (
          <section id="sr-prognose" className={secBase} style={secStyle}>
            <Reveal><SectionHead index={folio('prognose')} overline="Fremover" title="Prognose" lead={`Driverbasert prognose ${fc.months} måneder frem — konservativt, base og aggressivt scenario.`} /></Reveal>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {[['Konservativt', fc.scenarios.konservativ, false], ['Base', fc.scenarios.base, true], ['Aggressivt', fc.scenarios.aggressiv, false]].map(([navn, sc, hoved], i) => sc?.summary && (
                <Reveal key={i} delay={i * 0.06}>
                  <Panel className="h-full p-6 sm:p-7" style={hoved ? { background: C.paper2, borderColor: C.accent, boxShadow: `inset 0 0 0 1px ${C.accent}` } : undefined}>
                    <div className="flex items-center justify-between"><p className="e-label">{navn}</p>{hoved && <span className="rounded-[6px] px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide" style={{ background: 'rgba(124,58,237,0.12)', color: C.accent }}>Basecase</span>}</div>
                    <Big size="lg" className="mt-4">{kr(sc.summary.endMrr)}</Big>
                    <p className="mt-1.5 text-[12.5px]" style={{ color: C.ink3 }}>MRR ved periodeslutt</p>
                    <div className="mt-6 space-y-2.5 text-[13.5px]" style={{ color: C.ink2 }}>
                      <div className="flex justify-between"><span style={{ color: C.ink3 }}>ARR</span><span className="font-semibold tabular-nums">{kr(sc.summary.endArr)}</span></div>
                      <div className="flex justify-between"><span style={{ color: C.ink3 }}>Avtaler</span><span className="font-semibold tabular-nums">{antall(sc.summary.endActiveContracts)}</span></div>
                      <div className="flex justify-between"><span style={{ color: C.ink3 }}>Break-even</span><span className="font-semibold tabular-nums">{sc.summary.breakevenMonth != null ? `mnd ${sc.summary.breakevenMonth}` : '—'}</span></div>
                    </div>
                  </Panel>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {rikGruppe('prognose')}
        {rikGruppe('slutt')}

        {/* ── 07 EGNE SEKSJONER ─────────────────────────────────────────── */}
        {(enkle.length > 0 || edit) && (
          <section id="sr-egne" className={secBase} style={secStyle}>
            <Reveal><SectionHead index={folio('egne')} overline="Hurtigblokker" title="Egne seksjoner" lead="Raske nøkkeltall-rader og punktlister. For fri tekst med overskrifter, sitater og vedtaksbokser — bruk «Rik seksjon», som blir et eget kapittel i rapporten." right={edit ? (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={btnEd} style={{ borderColor: C.ink, background: C.ink, color: '#fff' }} onClick={() => edit.leggTilBlokk('rik', { etter: 'slutt' })}><PenLine className="h-4 w-4" /> Rik seksjon</button>
                <button type="button" className={btnEd} style={{ borderColor: C.line2, background: '#fff', color: C.ink2 }} onClick={() => edit.leggTilBlokk('tall')}><Hash className="h-4 w-4" /> Tall</button>
                <button type="button" className={btnEd} style={{ borderColor: C.line2, background: '#fff', color: C.ink2 }} onClick={() => edit.leggTilBlokk('liste')}><List className="h-4 w-4" /> Liste</button>
              </div>
            ) : null} /></Reveal>
            {enkle.length === 0 && edit && <Panel className="border-dashed p-8"><p className="e-meta">Ingen hurtigblokker ennå — legg til Tall eller Liste over, eller trykk «Rik seksjon» / «Ny seksjon her» for fritekst.</p></Panel>}
            <div className="space-y-3">
              {enkle.map((b, idx) => {
                if (edit) {
                  return (
                    <Panel key={b.id} className="p-5 sm:p-6">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-[6px] px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide" style={{ background: C.paper2, color: C.ink3 }}>{b.type === 'tall' ? <Hash className="h-3 w-3" /> : b.type === 'liste' ? <List className="h-3 w-3" /> : <Type className="h-3 w-3" />}{b.type === 'tall' ? 'Tall' : b.type === 'liste' ? 'Liste' : 'Tekst'}</span>
                        <div className="ml-auto flex items-center gap-1">
                          <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04] disabled:opacity-30" onClick={() => edit.flyttBlokk(b.id, -1)} disabled={idx === 0}><ChevronUp className="h-4 w-4" /></button>
                          <button type="button" className="rounded-[8px] p-2 hover:bg-black/[0.04] disabled:opacity-30" onClick={() => edit.flyttBlokk(b.id, 1)} disabled={idx === enkle.length - 1}><ChevronDown className="h-4 w-4" /></button>
                          <button type="button" className="rounded-[8px] p-2" style={{ color: C.neg }} onClick={() => edit.slettBlokk(b.id)}><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                      <input className={`${felt} mb-2.5 font-semibold`} style={feltStyle} value={b.tittel} onChange={(e) => edit.oppdaterBlokk(b.id, { tittel: e.target.value })} placeholder="Overskrift" />
                      <textarea className={`${felt} min-h-[120px] leading-relaxed`} style={feltStyle} value={b.raw} onChange={(e) => edit.oppdaterBlokk(b.id, { raw: e.target.value })} placeholder={b.type === 'tall' ? 'Én per linje: Etikett | Verdi | Notat\nEks: Aktive leietakere | 42 | +5 siden sist' : b.type === 'liste' ? 'Ett punkt per linje …' : 'Skriv teksten her …'} />
                    </Panel>
                  );
                }
                const bs = rawTilBlokk(b);
                return (
                  <Reveal key={b.id}>
                    <Panel className="p-7 sm:p-8">
                      {bs.tittel && <h3 className="e-h3 mb-5" style={{ fontSize: 'clamp(19px,1.9vw,24px)' }}>{bs.tittel}</h3>}
                      {bs.type === 'tekst' && <div className="e-body max-w-[780px] whitespace-pre-wrap" style={{ fontSize: 16 }}>{bs.tekst}</div>}
                      {bs.type === 'liste' && <ul className="space-y-3">{bs.punkter.map((p, i) => <li key={i} className="e-body flex items-start gap-3.5" style={{ fontSize: 16 }}><span className="mt-[10px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: C.accent }} />{p}</li>)}</ul>}
                      {bs.type === 'tall' && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{bs.tall.map((t, i) => <div key={i} className="rounded-[12px] border p-5" style={{ borderColor: C.line, background: C.paper2 }}><p className="e-label">{t.etikett}</p><Big size="sm" className="mt-2.5">{t.verdi}</Big>{t.notat && <p className="e-meta mt-1.5">{t.notat}</p>}</div>)}</div>}
                    </Panel>
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        {/* ── TIL BESLUTNING (lys, editorial finale) ────────────────────── */}
        <section id="sr-ask" className={`${visAsk ? secBase : ''}`} style={visAsk ? secStyle : { scrollMarginTop: 116, paddingTop: 'clamp(44px,5.6vw,92px)' }}>
          {visAsk && (
          <Reveal>
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="text-[13px] font-bold tabular-nums" style={{ ...H, color: C.accent }}>{folio('ask')}</span>
                <span className="h-px w-9" style={{ background: C.line2 }} aria-hidden />
                <span className="e-label">Til beslutning</span>
              </div>
              <h2 className="e-h2">Ask til styret</h2>
              <p className="e-lead mt-4 max-w-[640px]">Konkrete punkter styret bes ta stilling til eller vedta i møtet.</p>
              {edit ? (
                <textarea className={`${felt} mt-8 min-h-[150px] leading-relaxed`} style={feltStyle} value={inn.askRaw} onChange={(e) => edit.setAskRaw(e.target.value)} placeholder={'Ett punkt per linje …\nEks: Godkjenne budsjett for H2\nEks: Beslutte kapitalinnhenting'} />
              ) : askPunkter.length ? (
                <ol className="mt-9 grid gap-3 md:grid-cols-2">
                  {askPunkter.map((p, i) => (
                    <li key={i} className="flex items-start gap-4 rounded-[14px] border bg-white p-5 text-[16px] leading-[1.5]" style={{ borderColor: C.line, color: C.ink2 }}>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold tabular-nums" style={{ ...H, background: C.ink, color: '#fff' }}>{i + 1}</span>{p}
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-8 e-meta">Ingen punkter ennå{visning === 'admin' ? ' — trykk Rediger for å legge til.' : '.'}</p>
              )}
            </div>
          </Reveal>
          )}
          <footer className="e-meta mt-14 flex flex-wrap items-center gap-x-5 gap-y-1.5 border-t pt-6" style={{ borderColor: C.line }}>
            <span className="font-semibold" style={{ color: C.ink2 }}>DigiHome · Styrerapport</span>
            <span>Tall per {genDato ? genDato.toLocaleString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
            <span>Kilder: plattform · økonomimotor · PowerOffice Go</span>
            <span className="font-semibold" style={{ color: C.accent }}>Konfidensiell — kun til intern bruk</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
