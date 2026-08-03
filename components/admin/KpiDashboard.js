'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2, TrendingUp, TrendingDown, Sliders, Maximize2, Minimize2,
  RefreshCw, Zap, X, Check, Info, Gauge, Activity, Users, Clock, Wallet, BookOpen,
  ArrowUpRight, Home, ChevronRight,
} from 'lucide-react';
import RevenueReconcile from '@/components/admin/RevenueReconcile';
import { buildExplainers, KpiDetailModal } from '@/components/admin/KpiExplain';

const PERIODS = [
  { k: '7', l: '7 d', days: 7 },
  { k: '30', l: '30 d', days: 30 },
  { k: '90', l: '90 d', days: 90 },
  { k: '365', l: 'I år', days: 365 },
  { k: 'all', l: 'Alle', days: 3650 },
];

// --- Lys palett (Stripe/Carta-inspirert) ---
const INK = '#16141d';
const VIOLET = '#7c5cf0';      // linjer / aksent
const VIOLET_SOFT = '#cf97fc'; // myke fyll (merkevare)
const EMER = '#10b981';
const EMER_TEXT = '#059669';

// Hva LTV faktisk bygger på. Sto tidligere «kontrakt» også når grunnlaget var
// FAKTISK honorar fra inngåtte leiekontrakter — stikk motsatt av modellen, og
// det er nettopp forskjellen mellom estimert og faktisk leie som betyr noe.
const LTV_BASIS_LABEL = {
  actual: 'faktisk leie',
  recurring: 'løpende honorar',
  contract: 'kontraktsverdi',
  potential: 'estimert leie',
};


// --- Formattering (norsk) ---
const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
function fmtKr(v) {
  if (v == null || !isFinite(v)) return '—';
  if (Math.abs(v) >= 1000000) return `${nf1.format(v / 1000000)} mill`;
  if (Math.abs(v) >= 10000) return `${nf1.format(v / 1000)}k`;
  return nf0.format(Math.round(v));
}
function fmtKrFull(v) { return v == null || !isFinite(v) ? '—' : nf0.format(Math.round(v)); }
function fmtNum(v) { return v == null || !isFinite(v) ? '—' : nf0.format(v); }
function fmtRatio(v) { return v == null || !isFinite(v) ? '—' : nf1.format(v); }

// --- Animert opptelling ---
function useCountUp(target, { duration = 1100 } = {}) {
  const [val, setVal] = useState(0);
  const ref = useRef({ raf: 0, from: 0 });
  useEffect(() => {
    const t = Number(target);
    if (!isFinite(t)) { setVal(target); return; }
    const from = ref.current.from || 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4);
      setVal(from + (t - from) * eased);
      if (p < 1) ref.current.raf = requestAnimationFrame(tick);
      else ref.current.from = t;
    };
    cancelAnimationFrame(ref.current.raf);
    ref.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current.raf);
  }, [target, duration]);
  return typeof target === 'number' ? val : target;
}

function CountNumber({ value, format = fmtNum, className, style }) {
  const v = useCountUp(value);
  if (value == null || value === '—') return <span className={className} style={style}>—</span>;
  return <span className={className} style={style}>{format(v)}</span>;
}

// --- Entré-koreografi (stagger) ---
function Reveal({ delay = 0, children, className = '' }) {
  const [show, setShow] = useState(false);
  useEffect(() => { const t = setTimeout(() => setShow(true), delay); return () => clearTimeout(t); }, [delay]);
  return (
    <div className={className} style={{
      opacity: show ? 1 : 0,
      transform: show ? 'none' : 'translateY(14px)',
      transition: 'opacity .7s cubic-bezier(.16,1,.3,1), transform .7s cubic-bezier(.16,1,.3,1)',
    }}>{children}</div>
  );
}

// --- Delta-chip: «vs forrige periode» ---
function Delta({ value, inverse = false, size = 'sm', label = false }) {
  if (value == null) return null;
  const positive = inverse ? value < 0 : value > 0;
  const color = value === 0 ? 'text-[#8b8894] bg-black/[0.04]' : positive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
  const pad = size === 'lg' ? 'px-2.5 py-1 text-[12.5px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className="inline-flex items-center gap-1.5" title="Endring mot forrige periode av samme lengde">
      <span className={`inline-flex items-center gap-1 rounded-full font-semibold tabular-nums ${pad} ${color}`}>
        {Icon && <Icon className="w-3 h-3" />}{value > 0 ? '+' : value < 0 ? '−' : ''}{Math.abs(value)} %
      </span>
      {label && <span className="text-[11px] text-[#a5a3af]">vs forrige periode</span>}
    </span>
  );
}

// --- Fotnote-markør ---
function Fn({ n }) {
  return <sup className="ml-0.5 font-semibold" style={{ color: VIOLET, fontSize: '0.72em' }}>{n}</sup>;
}

// --- Sparkline ---
function Sparkline({ data = [], color = VIOLET, height = 36 }) {
  const gid = useMemo(() => `spk-${Math.random().toString(36).slice(2, 8)}`, []);
  const vals = data.map((d) => Number(d.value) || 0);
  if (!vals.length) return <div style={{ height }} />;
  const max = Math.max(1, ...vals), w = 100, h = height;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 4) - 2).toFixed(2)}`);
  const line = `M ${pts.join(' L ')}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L ${w},${h} L 0,${h} Z`} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// --- Stor områdegraf (smooth) ---
function smoothPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6, cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6, cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

function AreaChart({ data = [], color = EMER, height = 200 }) {
  const gid = useMemo(() => `area-${Math.random().toString(36).slice(2, 8)}`, []);
  const vals = data.map((d) => Number(d.value) || 0);
  if (vals.length < 2) return <div style={{ height }} className="grid place-items-center text-[#b8b6c0] text-[13px]">Ikke nok data i perioden</div>;
  const W = 1000, H = height, pad = 10;
  const max = Math.max(...vals, 1), min = Math.min(...vals, 0);
  const n = vals.length, step = W / (n - 1);
  const yOf = (v) => H - pad - ((v - min) / ((max - min) || 1)) * (H - pad * 2);
  const points = vals.map((v, i) => ({ x: i * step, y: yOf(v) }));
  const line = smoothPath(points);
  const area = `${line} L ${W},${H} L 0,${H} Z`;
  const last = points[points.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke={INK} strokeOpacity="0.05" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="4" fill={color} />
      <circle cx={last.x} cy={last.y} r="9" fill={color} fillOpacity="0.15" />
    </svg>
  );
}

// --- Månedlige vekstsøyler (leads + kunder, 12 mnd) ---
function MonthlyBars({ data = [], height = 190 }) {
  const max = Math.max(1, ...data.map((d) => Math.max(Number(d.leads) || 0, Number(d.customers) || 0)));
  const barH = (v) => Math.max(v > 0 ? 5 : 2, (v / max) * (height - 40));
  return (
    <div>
      <div style={{ height }} className="flex items-end gap-[5px] sm:gap-2">
        {data.map((d, i) => {
          const active = i === data.length - 1;
          return (
            <div key={d.month} className="flex-1 min-w-0 flex flex-col items-center justify-end">
              <span className={`text-[10px] tabular-nums mb-1 ${d.leads > 0 ? 'text-[#67646f]' : 'text-[#d8d6de]'}`}>{d.leads > 0 ? d.leads : ''}</span>
              <div className="w-full flex items-end justify-center gap-[3px]">
                <div className="w-[46%] rounded-t-[5px] transition-all duration-700" style={{ height: barH(d.leads), background: active ? VIOLET : `${VIOLET}4d` }} title={`${d.label}: ${d.leads} leads`} />
                <div className="w-[46%] rounded-t-[5px] transition-all duration-700" style={{ height: barH(d.customers), background: active ? EMER : `${EMER}4d` }} title={`${d.label}: ${d.customers} kunder`} />
              </div>
              <span className="mt-1.5 text-[9.5px] text-[#b0aeb8] truncate w-full text-center">{d.label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-[#8b8894]">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: VIOLET }} /> Leads</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: EMER }} /> Kunder</span>
      </div>
    </div>
  );
}

// --- Kanal-splitt (hvor leads kommer fra) ---
const CHANNEL_COLORS = { Betalt: '#7c5cf0', Organisk: '#10b981', Direkte: '#3b82f6', Henvisning: '#f59e0b', 'E-post': '#ec4899' };
function ChannelBars({ channels = [] }) {
  if (!channels.length) return <p className="text-[#b8b6c0] text-[13px]">Ingen leads i perioden</p>;
  const max = Math.max(1, ...channels.map((c) => c.leads));
  return (
    <div className="space-y-3">
      {channels.map((c) => {
        const color = CHANNEL_COLORS[c.channel] || '#94a3b8';
        return (
          <div key={c.channel}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-[#514e5a] font-medium">{c.channel}</span>
              <span className="text-[#8b8894] tabular-nums">{fmtNum(c.leads)} · {c.share} %{c.customers > 0 && <span className="ml-1.5 font-medium" style={{ color: EMER_TEXT }}>({c.customers} kunde{c.customers > 1 ? 'r' : ''})</span>}</span>
            </div>
            <div className="h-2.5 rounded-full bg-black/[0.05] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, (c.leads / max) * 100)}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Pipeline-kort (åpne leads + modellert potensial) ---
const STAGE_COLORS = { new: '#3b82f6', contacted: '#7c5cf0', qualified: '#f59e0b', won: '#10b981', lost: '#94a3b8' };
function PipelineCard({ pipeline = [], pv, onExplain }) {
  const total = pipeline.reduce((s, p) => s + p.count, 0) || 1;
  const clickable = typeof onExplain === 'function' && pv && pv.open > 0;
  return (
    <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] p-5 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-3">Pipeline (nå)</p>
      <div className="flex h-3 rounded-full overflow-hidden bg-black/[0.05]">
        {pipeline.filter((p) => p.count > 0).map((p) => (
          <div key={p.stage} style={{ width: `${(p.count / total) * 100}%`, background: STAGE_COLORS[p.stage] || '#94a3b8' }} title={`${p.label}: ${p.count}`} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {pipeline.map((p) => (
          <span key={p.stage} className="inline-flex items-center gap-1.5 text-[11.5px] text-[#8b8894]">
            <span className="h-2 w-2 rounded-full" style={{ background: STAGE_COLORS[p.stage] || '#94a3b8' }} />{p.label} <b className="text-[#16141d] tabular-nums">{p.count}</b>
          </span>
        ))}
      </div>
      {pv && pv.open > 0 && (
        <div className={`group mt-4 pt-4 border-t border-black/[0.05] ${clickable ? 'cursor-pointer' : ''}`}
          {...(clickable ? { role: 'button', tabIndex: 0, onClick: () => onExplain('pipeline_value'), onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExplain('pipeline_value'); } }, title: 'Klikk for detaljer' } : {})}>
          <p className="text-[11px] text-[#a5a3af] uppercase tracking-[0.08em] font-semibold flex items-center gap-1">Potensial i åpne leads
            {clickable && <Info className="w-3 h-3 text-[#e2e0e8] group-hover:text-[#7c5cf0] transition-colors" />}</p>
          <p className="mt-1 text-[#16141d] font-bold text-[26px] leading-none tabular-nums tracking-[-0.02em]">{fmtKrFull(pv.potential)} <span className="text-[#a5a3af] text-[14px] font-semibold">kr</span></p>
          <p className="mt-1 text-[11px] text-[#b0aeb8]">{pv.open} åpne · {pv.basis}</p>
        </div>
      )}
    </div>
  );
}

// --- Momentum-strip (live puls) ---
function MomentumStrip({ momentum, platform }) {
  if (!momentum && !platform) return null;
  return (
    <div className="relative mb-3 sm:mb-4 flex flex-wrap items-center gap-x-4 sm:gap-x-5 gap-y-1.5 rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] px-3.5 sm:px-4 py-2.5 text-[11.5px] sm:text-[12.5px]">
      <span className="inline-flex items-center gap-1.5 font-bold text-[10px] sm:text-[11px] uppercase tracking-[0.12em]" style={{ color: EMER_TEXT }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER, animation: 'kpiPulse 1.6s ease-in-out infinite' }} /> Live
      </span>
      {momentum && (
        <>
          <span className="text-[#8b8894] whitespace-nowrap">I dag: <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.sessionsToday)}</b> økter · <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.leadsToday)}</b> leads</span>
          <span className="text-[#8b8894] whitespace-nowrap">Siste 7 d: <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.sessions7d)}</b> økter · <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.leads7d)}</b> leads</span>
        </>
      )}
      {platform && (
        <span className="w-full sm:w-auto sm:ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-semibold px-2.5 py-1 text-[11px] sm:text-[11.5px]" style={{ color: EMER_TEXT }}
          title={platform.mrrBasis || undefined}>
          <Zap className="w-3 h-3 shrink-0" /> <span className="truncate">MRR live: {fmtKrFull(platform.mrr)} kr · {fmtNum(platform.customers)} aktive kunder
            {platform.customersWithLease != null && <span className="opacity-80"> ({fmtNum(platform.customersWithLease)} m/ leiekontrakt)</span>}</span>
        </span>
      )}
    </div>
  );
}

// --- LTV:CAC helsevurdering ---
function ratingFor(ratio) {
  if (ratio == null) return { label: '—', color: '#94a3b8', pct: 0 };
  if (ratio >= 5) return { label: 'Verdensklasse', color: EMER_TEXT, pct: 100 };
  if (ratio >= 3) return { label: 'Sunn', color: '#65a30d', pct: 72 };
  if (ratio >= 1) return { label: 'OK', color: '#d97706', pct: 42 };
  return { label: 'Under press', color: '#e11d48', pct: 16 };
}

// --- Delte kortstiler: holder alle flater visuelt identiske ---
const CARD = 'rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)]';
const LIFT = 'transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-[0_1px_2px_rgba(16,14,24,0.04),0_18px_44px_-22px_rgba(16,14,24,0.24)] hover:-translate-y-[3px] hover:border-[#7c5cf0]/25 active:translate-y-0';
const RING = 'outline-none focus-visible:ring-2 focus-visible:ring-[#7c5cf0]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-white';
const CARD_LABEL = 'text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8b8894]';

// Klikkbart-hint: pil som glir ut ved hover, diskret prikk p\u00e5 touch.
function OpenHint({ tone = 'violet' }) {
  const c = tone === 'emerald' ? 'text-emerald-300 group-hover:text-emerald-600' : 'text-[#dedce4] group-hover:text-[#7c5cf0]';
  return <ArrowUpRight className={`w-3.5 h-3.5 shrink-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${c}`} />;
}

// --- KPI-kort (klikkbart → åpner detaljmodal med formel, tallgrunnlag og kilder) ---
function KpiCard({ label, value, format = fmtNum, suffix, delta, inverse, spark, sparkColor, sub, icon: Icon, fn, testid, onClick }) {
  const clickable = typeof onClick === 'function';
  const act = clickable ? {
    role: 'button', tabIndex: 0, onClick,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
    title: 'Klikk for å se hvordan tallet regnes',
  } : {};
  return (
    <div data-testid={testid} {...act}
      className={`group relative flex flex-col ${CARD} p-4 sm:p-5 overflow-hidden ${clickable ? `cursor-pointer ${LIFT} ${RING}` : ''}`}>
      <div className="flex items-start justify-between gap-1.5">
        <p className={`${CARD_LABEL} flex items-start gap-1.5 min-w-0`}>
          {Icon && <Icon className="w-3.5 h-3.5 shrink-0 mt-[-1px] text-[#c9c7d1]" />}
          <span className="min-w-0 leading-[1.35]">{label}{fn != null && <Fn n={fn} />}</span>
        </p>
        {clickable && <OpenHint />}
      </div>
      <div className="mt-2.5 flex items-end gap-1.5 flex-wrap">
        <CountNumber value={value} format={format} className="font-bold tracking-[-0.035em] text-[#16141d] tabular-nums leading-[0.95]"
          style={{ fontSize: 'clamp(1.6rem, 5.6vw, 2.2rem)' }} />
        {suffix && <span className="font-semibold text-[#a5a3af] text-[13px] sm:text-[14px] mb-[3px]">{suffix}</span>}
        {delta != null && <span className="mb-[3px] ml-0.5"><Delta value={delta} inverse={inverse} /></span>}
      </div>
      {sub && <p className="mt-1.5 text-[11.5px] sm:text-[12px] text-[#a5a3af] leading-snug text-pretty">{sub}</p>}
      {spark && spark.length > 0 && <div className="mt-auto pt-3.5 -mx-1"><Sparkline data={spark} color={sparkColor || VIOLET} height={30} /></div>}
    </div>
  );
}

function MiniStat({ label, value, suffix, sub, fn, onClick, testid }) {
  const clickable = typeof onClick === 'function';
  const act = clickable ? {
    role: 'button', tabIndex: 0, onClick,
    onKeyDown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } },
    title: 'Klikk for detaljer',
  } : {};
  return (
    <div data-testid={testid} {...act}
      className={`min-w-0 ${clickable ? `group -mx-2 -my-1.5 px-2 py-1.5 rounded-xl cursor-pointer hover:bg-[#7c5cf0]/[0.05] ${RING} transition-colors` : ''}`}>
      <p className="flex items-start gap-1 text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-[#a5a3af] leading-[1.3]">
        <span className="min-w-0">{label}{fn != null && <Fn n={fn} />}</span>
        {clickable && <ArrowUpRight className="w-3 h-3 shrink-0 mt-[-1px] text-[#e2e0e8] group-hover:text-[#7c5cf0] group-hover:translate-x-0.5 transition-all" />}
      </p>
      <p className="mt-1.5 text-[#16141d] font-bold leading-none tracking-[-0.025em] tabular-nums" style={{ fontSize: 'clamp(1.2rem, 4.4vw, 1.5rem)' }}>
        {value}{suffix && <span className="text-[#a5a3af] text-[12px] sm:text-[13px] font-semibold ml-1">{suffix}</span>}
      </p>
      {sub && <p className="mt-1 text-[10.5px] sm:text-[11px] text-[#b0aeb8] leading-snug">{sub}</p>}
    </div>
  );
}

// --- Konverteringstrakt ---
function Funnel({ funnel = [] }) {
  const top = funnel[0]?.count || 1;
  const colors = [VIOLET, '#9d7bf5', '#3b82f6', EMER];
  return (
    <div className="space-y-2.5">
      {funnel.map((f, i) => {
        const w = Math.max(6, (f.count / top) * 100);
        return (
          <div key={f.stage}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-[#514e5a] font-medium">{f.label}</span>
              <span className="text-[#8b8894] tabular-nums">{fmtNum(f.count)} · {f.pctOfTop} %{i > 0 && <span className="text-[#b8b6c0]"> · steg {f.stepConv} %</span>}</span>
            </div>
            <div className="h-8 rounded-lg bg-black/[0.04] overflow-hidden">
              <div className="h-full rounded-lg transition-all duration-700 ease-out" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${colors[i % colors.length]}, ${colors[i % colors.length]}80)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// --- Definisjoner (fotnoter) ---
const DEFINITIONS = [
  { n: 1, term: 'LTV', text: 'Livstidsverdi per kunde. Standard: FAKTISK månedshonorar fra startede leiekontrakter × antatt levetid × bruttomargin. Estimert leie fra forvaltningsavtaler inngår ikke.' },
  { n: 2, term: 'CAC', text: 'Kundeanskaffelseskost. Annonseforbruk (Google + Meta) delt på nye kunder i perioden — samme kalenderdager for begge.' },
  { n: 3, term: 'CPL', text: 'Kost per lead. Annonseforbruk delt på nye huseier-leads i perioden. Leietaker-leads holdes utenfor.' },
  { n: 4, term: 'ROAS', text: 'Annonseavkastning. Registrert kundeverdi delt på annonseforbruk. Kundeverdien er et estimat satt ved signering.' },
  { n: 5, term: 'Payback', text: 'Måneder før månedshonoraret har dekket anskaffelseskosten (CAC ÷ månedlig bruttofortjeneste), pluss ventetid til første leieinntekt.' },
];

function Definitions({ generatedAt }) {
  return (
    <div className="mt-2.5 sm:mt-4 rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] p-4 sm:p-6" data-testid="kpi-definisjoner">
      <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8b8894] flex items-center gap-1.5 mb-3.5"><BookOpen className="w-3.5 h-3.5 text-[#c9c7d1]" /> Definisjoner &amp; datagrunnlag</p>
      <div className="rounded-2xl bg-[#7c5cf0]/[0.045] border border-[#7c5cf0]/15 px-3.5 py-2.5 mb-3.5">
        <p className="text-[11.5px] sm:text-[12px] leading-relaxed text-[#67646f] text-pretty">
          <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5" style={{ color: VIOLET }} />
          <b className="text-[#16141d]">Klikk på et kort</b> for full forklaring: formel med tallene satt inn, hva som er inkludert og ekskludert, forbehold, datakilder — og hvilke kunder og enheter som ligger bak. I modalen blar du med <kbd className="rounded bg-white border border-black/10 px-1 text-[10px]">←</kbd> <kbd className="rounded bg-white border border-black/10 px-1 text-[10px]">→</kbd> og lukker med <kbd className="rounded bg-white border border-black/10 px-1 text-[10px]">Esc</kbd>.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2.5">
        {DEFINITIONS.map((d) => (
          <p key={d.n} className="text-[11.5px] sm:text-[12px] leading-relaxed text-[#8b8894] text-pretty">
            <sup className="font-bold mr-0.5" style={{ color: VIOLET }}>{d.n}</sup>
            <b className="text-[#514e5a]">{d.term}</b> — {d.text}
          </p>
        ))}
      </div>
      <p className="mt-3.5 pt-3.5 border-t border-black/[0.05] text-[10.5px] text-[#b8b6c0] tabular-nums leading-relaxed">
        Oppdatert {generatedAt ? new Date(generatedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '—'} · Kilder: leads-database, Google Ads API, Meta Marketing API, driftsplattform
      </p>
    </div>
  );
}

class KpiErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div className="rounded-[24px] bg-white border border-black/[0.06] p-6 sm:p-8">
        <p className="text-rose-600 font-bold text-lg">Nøkkeltall-feil</p>
        <pre className="mt-3 text-[12px] text-[#514e5a] whitespace-pre-wrap break-words">{String(this.state.error?.message || this.state.error)}</pre>
      </div>
    );
    return this.props.children;
  }
}

export default function KpiDashboard(props) {
  return <KpiErrorBoundary><KpiDashboardInner {...props} /></KpiErrorBoundary>;
}

function KpiDashboardInner({ apiKey }) {
  const [period, setPeriod] = useState('90');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [present, setPresent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chartMode, setChartMode] = useState('revenue');
  const [explainId, setExplainId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    const days = (PERIODS.find((p) => p.k === period) || PERIODS[2]).days;
    try {
      const res = await fetch(`/api/admin/kpi?key=${encodeURIComponent(apiKey)}&days=${days}`);
      const j = await res.json();
      if (!j.ok) setErr(j.error || 'Kunne ikke hente nøkkeltall');
      setData(j);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey, period]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!present) return;
    const onKey = (e) => { if (e.key === 'Escape') setPresent(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present]);

  const hero = data?.hero || {};
  const m = data?.metrics || {};
  const northStar = data?.northStar || 'ltv_cac';
  const rating = ratingFor(hero.ltvCac?.value);

  // Forklaringer bak hvert nøkkeltall — bygges av samme payload som kortene.
  const explainers = useMemo(() => buildExplainers(data), [data]);
  const explain = useCallback((id) => setExplainId(id), []);
  const northStarExplainId = { ltv_cac: 'ltv_cac', new_customers: 'new_customers', revenue: 'revenue', cac: 'cac', avg_value: 'avg_value' }[northStar] || 'ltv_cac';

  const northStarView = useMemo(() => {
    switch (northStar) {
      case 'new_customers': return { label: 'Nye kunder', value: m.newCustomers?.value, format: fmtNum, suffix: '', sub: data?.period?.label || '', delta: m.newCustomers?.delta };
      case 'revenue': return { label: 'Omsetning', value: m.revenue?.value, format: fmtKrFull, suffix: 'kr', sub: 'Tilskrevet i perioden', delta: m.revenue?.delta };
      case 'cac': return { label: 'Kundeanskaffelseskost', value: hero.cac?.value, format: fmtKrFull, suffix: 'kr', sub: 'Annonseforbruk per ny kunde', inverse: true };
      case 'avg_value': return { label: 'Snitt kundeverdi', value: hero.avgCustomerValue?.value, format: fmtKrFull, suffix: 'kr', sub: 'Snitt av alle kunder' };
      default: return {
        label: 'LTV : CAC', value: hero.ltvCac?.value, format: fmtRatio, suffix: ': 1',
        sub: `LTV ${fmtKrFull(hero.ltvCac?.ltv)} kr · CAC ${fmtKrFull(hero.ltvCac?.cac)} kr · ${LTV_BASIS_LABEL[hero.ltvCac?.ltvBasis] || 'kontraktsverdi'}`,
        rating: true,
      };
    }
  }, [northStar, hero, m, data]);

  const chartData = chartMode === 'revenue' ? (data?.series?.cumulativeRevenue || []) : (data?.series?.leads || []);

  if (present) {
    const overlay = <PresentationMode data={data} northStarView={northStarView} hero={hero} m={m} rating={rating}
      chartData={data?.series?.cumulativeRevenue || []} period={period} setPeriod={setPeriod} periods={PERIODS} onExit={() => setPresent(false)} />;
    // Portal til body: garanterer at overlayet ligger over topbar/sidebar uansett stacking-context.
    return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
  }

  return (
    <div className="relative">
      <style>{`@keyframes kpiPulse { 0%,100%{opacity:.45} 50%{opacity:1} }`}</style>

      {/* Topplinje — kollapser til to rader på mobil */}
      <div className="pb-4 sm:pb-5">
        <div className="flex items-start sm:items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[#16141d] font-bold tracking-[-0.025em] text-[19px] sm:text-[23px] leading-tight" style={{ fontFamily: 'var(--font-heading)' }}>Nøkkeltall</h2>
              {data?.configured && !data.configured.ads && <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">annonsedata utilgjengelig</span>}
            </div>
            <p className="mt-0.5 text-[11.5px] sm:text-[12.5px] text-[#a5a3af] truncate">
              {data?.period?.label || ''}
              <span className="hidden sm:inline"> · klikk et kort for formel, tallgrunnlag og kundene bak</span>
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:flex items-center gap-0.5 rounded-full bg-black/[0.045] p-0.5">
              {PERIODS.map((p) => (
                <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`kpi-period-${p.k}`}
                  className={`px-2.5 lg:px-3 h-8 rounded-full text-[11.5px] font-semibold transition-all duration-200 ${period === p.k ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(16,14,24,0.13)]' : 'text-[#8b8894] hover:text-[#16141d]'}`}>{p.l}</button>
              ))}
            </div>
            <button onClick={() => setSettingsOpen(true)} title="LTV-modell" data-testid="kpi-settings-btn" aria-label="LTV-modell"
              className={`h-9 w-9 rounded-full bg-white border border-black/[0.07] text-[#8b8894] hover:text-[#16141d] hover:border-black/[0.16] grid place-items-center transition-colors ${RING}`}><Sliders className="w-4 h-4" /></button>
            <button onClick={load} title="Oppdater" aria-label="Oppdater"
              className={`h-9 w-9 rounded-full bg-white border border-black/[0.07] text-[#8b8894] hover:text-[#16141d] hover:border-black/[0.16] grid place-items-center transition-colors ${RING}`}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            <button onClick={() => setPresent(true)} data-testid="kpi-present-btn" aria-label="Presentasjon"
              className={`h-9 rounded-full text-[12px] font-semibold flex items-center gap-1.5 text-white bg-[#16141d] hover:bg-[#2a2733] transition-colors px-2.5 sm:pl-3 sm:pr-3.5 ${RING}`}>
              <Maximize2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Presentasjon</span>
            </button>
          </div>
        </div>
        {/* Periodevelger på mobil — ruller vannrett */}
        <div className="sm:hidden mt-3 -mx-4 px-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="inline-flex items-center gap-0.5 rounded-full bg-black/[0.045] p-0.5">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`kpi-period-m-${p.k}`}
                className={`shrink-0 px-3 h-8 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${period === p.k ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(16,14,24,0.13)]' : 'text-[#8b8894]'}`}>{p.l}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="space-y-3 sm:space-y-4" aria-busy="true">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="lg:col-span-3 h-[260px] sm:h-[320px] rounded-[24px] bg-black/[0.035] animate-pulse" />
            <div className="lg:col-span-2 h-[260px] sm:h-[320px] rounded-[24px] bg-black/[0.035] animate-pulse" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[128px] rounded-[20px] bg-black/[0.035] animate-pulse" />)}
          </div>
        </div>
      ) : (
        <div className="relative">
          <MomentumStrip momentum={data?.momentum} platform={data?.platform} />

          {/* NORTH STAR + Enhetsøkonomi */}
          <Reveal delay={40}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
              <div className="lg:col-span-3 group relative rounded-[24px] overflow-hidden border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] px-5 sm:px-8 py-6 sm:py-8 cursor-pointer hover:border-[#7c5cf0]/25 transition-colors"
                style={{ background: 'linear-gradient(140deg, #F7F2FF 0%, #FDFCFF 46%, #FFFFFF 100%)' }}
                role="button" tabIndex={0} data-testid="kpi-northstar"
                onClick={() => explain(northStarExplainId)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); explain(northStarExplainId); } }}
                title="Klikk for å se hvordan tallet regnes">
                <div aria-hidden className="pointer-events-none absolute -top-24 -right-12 h-72 w-72 rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${VIOLET_SOFT}3d 0%, transparent 70%)` }} />
                <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 h-56 w-56 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)' }} />

                <span className="absolute top-4 right-4 sm:top-5 sm:right-6 inline-flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-sm border border-black/[0.06] px-2 sm:px-2.5 py-1 text-[10.5px] font-semibold text-[#8b8894] group-hover:text-[#6d4ce0] group-hover:border-[#7c5cf0]/30 transition-colors">
                  <Info className="w-3.5 h-3.5" /><span className="hidden sm:inline">Hvordan regnes dette?</span>
                </span>

                <div className="relative flex items-center gap-2 flex-wrap pr-10 sm:pr-0">
                  <p className="text-[10.5px] sm:text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: VIOLET }}>{northStarView.label}{northStar === 'ltv_cac' && <><Fn n={1} /><Fn n={2} /></>}</p>
                  {northStarView.rating && <span className="text-[10.5px] font-bold rounded-full px-2 py-0.5" style={{ color: rating.color, background: `${rating.color}18` }}>{rating.label}</span>}
                </div>

                <div className="relative mt-1.5 flex items-end gap-2 sm:gap-3 flex-wrap">
                  <CountNumber value={northStarView.value} format={northStarView.format} className="text-[#16141d] font-bold tracking-[-0.045em] tabular-nums leading-[0.85]"
                    style={{ fontSize: 'clamp(3.1rem, 13vw, 5.4rem)' }} />
                  {northStarView.suffix && <span className="text-[#c4c2cc] font-bold mb-1.5 sm:mb-3" style={{ fontSize: 'clamp(1.25rem, 4.5vw, 2rem)' }}>{northStarView.suffix}</span>}
                  {northStarView.delta != null && <span className="mb-2 sm:mb-3.5"><Delta value={northStarView.delta} inverse={northStarView.inverse} size="lg" label /></span>}
                </div>
                {northStarView.sub && <p className="relative mt-1.5 text-[12.5px] sm:text-[14px] text-[#8b8894] tabular-nums text-pretty">{northStarView.sub}</p>}

                {northStarView.rating && (
                  <div className="relative mt-6 sm:mt-7 max-w-md">
                    <div className="relative h-1.5 rounded-full bg-black/[0.07]">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-1000 ease-out" style={{ width: `${rating.pct}%`, background: rating.color }} />
                      {[['1:1', 16], ['3:1', 42], ['5:1', 72]].map(([mk, left]) => (
                        <span key={mk} className="absolute -top-4 text-[9px] text-[#b0aeb8] tabular-nums" style={{ left: `${left}%` }}>{mk}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[10.5px] text-[#b0aeb8]">Benchmark: Sunn &gt; 3:1 · Verdensklasse &gt; 5:1</p>
                  </div>
                )}

                {data?.revenueModel?.hasData && (
                  <div className="relative mt-6 sm:mt-7 grid grid-cols-3 gap-2 sm:gap-2.5 max-w-2xl" data-testid="kpi-northstar-tiers">
                    {[
                      { id: 'mrr_actual', l: 'Realisert', v: data.revenueModel.mrr.actual, c: EMER, sub: 'løper nå' },
                      { id: 'mrr_contracted', l: 'Kontrahert', v: data.revenueModel.mrr.contracted, c: '#f59e0b', sub: 'signert, ikke startet' },
                      { id: 'mrr_potential', l: 'Potensial', v: data.revenueModel.mrr.potential, c: '#a5a3af', sub: 'estimert leie' },
                    ].map((t) => (
                      <button key={t.id} onClick={(ev) => { ev.stopPropagation(); explain(t.id); }}
                        className={`group/t text-left rounded-2xl bg-white/75 hover:bg-white border border-black/[0.05] hover:border-[#7c5cf0]/25 px-2.5 sm:px-3.5 py-2.5 transition-colors ${RING}`}
                        title={`Klikk for detaljer om ${t.l.toLowerCase()}`}>
                        <span className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.1em] text-[#8b8894]">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.c }} /><span className="truncate">{t.l}</span>
                        </span>
                        <span className="block mt-1 text-[#16141d] font-bold leading-none tabular-nums tracking-[-0.025em]" style={{ fontSize: 'clamp(0.95rem, 3.6vw, 1.2rem)' }}>{fmtKrFull(t.v)}</span>
                        <span className="block mt-0.5 text-[9.5px] font-semibold text-[#a5a3af]">kr/mnd</span>
                        <span className="block mt-1 text-[9.5px] sm:text-[10.5px] text-[#b0aeb8] leading-snug">{t.sub}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={`lg:col-span-2 ${CARD} p-5 sm:p-6 flex flex-col`} data-testid="kpi-unit-economics">
                <p className={`${CARD_LABEL} flex items-center gap-1.5 mb-4 sm:mb-5`}>
                  <Gauge className="w-3.5 h-3.5 text-[#c9c7d1]" /> Enhetsøkonomi
                </p>
                <div className="grid grid-cols-2 gap-y-5 sm:gap-y-6 gap-x-4">
                  <MiniStat testid="ue-ltv" label="LTV" fn={1} value={fmtKr(hero.ltv?.value)} suffix="kr" sub={LTV_BASIS_LABEL[hero.ltv?.basis] || 'kontraktsverdi'} onClick={() => explain('ltv')} />
                  <MiniStat testid="ue-cac" label="CAC" fn={2} value={fmtKr(hero.cac?.value)} suffix="kr" sub="forbruk ÷ nye kunder" onClick={() => explain('cac')} />
                  <MiniStat testid="ue-ltvcac" label="LTV : CAC · realisert" value={fmtRatio(hero.ltvCac?.value)} suffix=": 1" sub="faktisk startet leie" onClick={() => explain('ltv_cac')} />
                  <MiniStat testid="ue-ltvcac-contracted" label="LTV : CAC · m/ kontrahert"
                    value={hero.ltvCacContracted?.value != null ? fmtRatio(hero.ltvCacContracted.value) : '—'} suffix=": 1"
                    sub="signert, ikke startet" onClick={() => explain('ltv_cac_contracted')} />
                  <MiniStat testid="ue-payback" label="Payback" fn={5} value={m.paybackMonths?.value != null ? fmtNum(m.paybackMonths.value) : '—'} suffix="mnd" sub="inkl. ventetid til leie" onClick={() => explain('payback')} />
                  <MiniStat testid="ue-roas" label="ROAS (ekte)" fn={4} value={fmtRatio(m.roasTrue?.value)} suffix="x" sub="registrert verdi ÷ forbruk" onClick={() => explain('roas')} />
                </div>
                <p className="mt-5 sm:mt-auto sm:pt-6 pt-4 border-t border-black/[0.05] text-[10.5px] sm:text-[11px] text-[#b0aeb8] leading-relaxed text-pretty">
                  <b className="text-[#8b8894]">Realisert</b> bruker faktisk startet leiekontrakt og faktisk honorar. <b className="text-[#8b8894]">M/ kontrahert</b> tar med signert leie som ikke har startet — sikret, men ikke realisert inntekt.
                </p>
              </div>
            </div>
          </Reveal>

          {err && <div className="mb-4 text-[13px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center gap-2"><Info className="w-4 h-4" />{err}</div>}

          {/* Hero-grid */}
          <Reveal delay={140}>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-4">
              <KpiCard testid="kpi-cpl" icon={Wallet} label="Kost per lead" fn={3} value={hero.cpl?.value} format={fmtKrFull} suffix="kr" inverse sub="Annonseforbruk ÷ nye huseier-leads" onClick={() => explain('cpl')} />
              <KpiCard testid="kpi-cac" icon={Wallet} label="Kost per kunde" fn={2} value={hero.cac?.value} format={fmtKrFull} suffix="kr" inverse sub="Annonseforbruk ÷ nye kunder i perioden" onClick={() => explain('cac')} />
              <KpiCard testid="kpi-avgvalue" icon={Users} label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKrFull} suffix="kr" onClick={() => explain('avg_value')} sub={hero.avgCustomerValue?.missingValue > 0
                ? `${fmtNum(hero.avgCustomerValue?.basedOn)} av ${fmtNum(m.totalCustomers?.value)} kunder har registrert verdi · alle tider`
                : `${fmtNum(m.totalCustomers?.value)} kunder totalt · alle tider`} />
              <KpiCard testid="kpi-ttw" icon={Clock} label="Tid til kunde" value={hero.timeToWin?.value} format={fmtNum} suffix="dager" inverse sub="Snitt fra lead til signert" onClick={() => explain('ttw')} />
              <KpiCard testid="kpi-conv" icon={Activity} label="Konverteringsrate" value={hero.conversionRate?.value} format={fmtNum} suffix="%" delta={hero.conversionRate?.delta} sub="Leads → kunder" onClick={() => explain('conv')} />
              <KpiCard testid="kpi-newcust" icon={TrendingUp} label="Nye kunder" value={m.newCustomers?.value} format={fmtNum} delta={m.newCustomers?.delta} sub={`av ${fmtNum(m.newLeads?.value)} nye leads`} spark={data?.series?.revenue} sparkColor={EMER} onClick={() => explain('new_customers')} />
            </div>
          </Reveal>

          {/* Vekstgraf + trakt */}
          <Reveal delay={240}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4 mt-2.5 sm:mt-4">
              <div className={`lg:col-span-2 ${CARD} p-4 sm:p-6`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className={CARD_LABEL}>{chartMode === 'revenue' ? 'Omsetning (kumulativ)' : chartMode === 'monthly' ? 'Vekst måned for måned (12 mnd)' : 'Nye leads (daglig)'}</p>
                    <p className="mt-1.5 text-[#16141d] font-bold leading-none tracking-[-0.03em] tabular-nums" style={{ fontSize: 'clamp(1.35rem, 5vw, 1.7rem)' }}>
                      {chartMode === 'revenue' ? `${fmtKrFull(m.revenue?.value)} kr` : chartMode === 'monthly' ? `${fmtNum((data?.series?.monthly || []).reduce((s, x) => s + (x.leads || 0), 0))} leads · ${fmtNum((data?.series?.monthly || []).reduce((s, x) => s + (x.customers || 0), 0))} kunder` : `${fmtNum(m.newLeads?.value)}`}
                      {chartMode === 'revenue' && m.revenue?.delta != null && <span className="ml-2 align-middle"><Delta value={m.revenue.delta} /></span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center gap-0.5 rounded-full bg-black/[0.045] p-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      <button onClick={() => setChartMode('monthly')} data-testid="kpi-chart-monthly" className={`shrink-0 px-2.5 sm:px-3 h-7 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${chartMode === 'monthly' ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(16,14,24,0.13)]' : 'text-[#8b8894]'}`}>12 mnd</button>
                      <button onClick={() => setChartMode('revenue')} className={`shrink-0 px-2.5 sm:px-3 h-7 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${chartMode === 'revenue' ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(16,14,24,0.13)]' : 'text-[#8b8894]'}`}>Omsetning</button>
                      <button onClick={() => setChartMode('leads')} className={`shrink-0 px-2.5 sm:px-3 h-7 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all ${chartMode === 'leads' ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(16,14,24,0.13)]' : 'text-[#8b8894]'}`}>Leads</button>
                    </div>
                    <button onClick={() => explain(chartMode === 'leads' ? 'new_leads' : 'revenue')} title="Hvordan regnes dette?" data-testid="kpi-chart-info" aria-label="Hvordan regnes dette?"
                      className={`shrink-0 h-7 w-7 rounded-full bg-black/[0.045] text-[#a5a3af] hover:text-[#7c5cf0] hover:bg-[#7c5cf0]/[0.1] grid place-items-center transition-colors ${RING}`}><Info className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
                <div className="mt-4">
                  {chartMode === 'monthly' ? (
                    <MonthlyBars data={data?.series?.monthly || []} height={200} />
                  ) : (
                    <>
                      <AreaChart data={chartData} color={chartMode === 'revenue' ? EMER : VIOLET} height={200} />
                      <div className="flex justify-between text-[10px] text-[#b8b6c0] mt-2 tabular-nums">
                        <span>{chartData[0]?.day || ''}</span>
                        <span>{chartData[chartData.length - 1]?.day || ''}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className={`${CARD} p-4 sm:p-6`}>
                <p className={`${CARD_LABEL} mb-4`}>Konverteringstrakt</p>
                <Funnel funnel={data?.funnel || []} />
              </div>
            </div>
          </Reveal>

          {/* Run-rate (kun løpende LTV) + sekundær-strip */}
          <Reveal delay={320}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4 mt-2.5 sm:mt-4">
              {data?.revenueModel?.hasData && data.revenueModel.mrr?.actual > 0 ? (
                <div data-testid="kpi-platform-mrr" role="button" tabIndex={0}
                  onClick={() => explain('mrr_actual')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); explain('mrr_actual'); } }}
                  title="Klikk for å se hvilke leiekontrakter som utgjør honoraret"
                  className={`group rounded-[20px] p-4 sm:p-6 relative overflow-hidden border border-emerald-100 shadow-[0_1px_2px_rgba(16,14,24,0.04)] cursor-pointer hover:shadow-[0_1px_2px_rgba(16,14,24,0.04),0_18px_44px_-22px_rgba(16,14,24,0.24)] hover:-translate-y-[3px] transition-[transform,box-shadow] duration-300 ${RING}`}
                  style={{ background: 'linear-gradient(140deg, #ECFDF5 0%, #FFFFFF 62%)' }}>
                  <p className="text-[10px] sm:text-[10.5px] font-semibold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: EMER_TEXT }}>
                    <Zap className="w-3.5 h-3.5 shrink-0" /> <span className="min-w-0">MRR — faktisk honorar</span>
                    <span className="ml-auto"><OpenHint tone="emerald" /></span>
                  </p>
                  <p className="mt-2.5 text-[#16141d] font-bold leading-none tracking-[-0.035em] tabular-nums" style={{ fontSize: 'clamp(2.1rem, 8vw, 2.6rem)' }}>
                    <CountNumber value={data.revenueModel.mrr.actual} format={fmtKrFull} /> <span className="text-[#a5a3af] text-[14px] sm:text-[16px] font-semibold">kr/mnd</span>
                  </p>
                  <p className="mt-2 text-[11.5px] sm:text-[12.5px] text-[#8b8894] tabular-nums text-pretty">ARR {fmtKrFull(data.revenueModel.tiers.actual.arr)} kr · {fmtNum(data.revenueModel.customers.earning)} kunde{data.revenueModel.customers.earning === 1 ? '' : 'r'} med inngått leiekontrakt</p>
                  <p className="mt-1 text-[10.5px] sm:text-[11.5px] text-[#a5a3af] tabular-nums">+ {fmtKrFull(data.revenueModel.mrr.contracted)} kr kontrahert · + {fmtKrFull(data.revenueModel.mrr.potential)} kr potensial</p>
                </div>
              ) : data?.platform ? (
                <div data-testid="kpi-platform-mrr" className="rounded-[20px] p-4 sm:p-6 relative overflow-hidden border border-emerald-100 shadow-[0_1px_2px_rgba(16,14,24,0.04)]" style={{ background: 'linear-gradient(140deg, #ECFDF5 0%, #FFFFFF 62%)' }}>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: EMER_TEXT }}><Zap className="w-3.5 h-3.5" /> MRR — live fra plattformen</p>
                  <p className="mt-2.5 text-[#16141d] font-bold leading-none tracking-[-0.035em] tabular-nums" style={{ fontSize: 'clamp(2.1rem, 8vw, 2.6rem)' }}><CountNumber value={data.platform.mrr} format={fmtKrFull} /> <span className="text-[#a5a3af] text-[16px] font-semibold">kr/mnd</span></p>
                  <p className="mt-2 text-[12.5px] text-[#8b8894] tabular-nums text-pretty">ARR-run-rate {fmtKrFull(data.platform.arr)} kr · {fmtNum(data.platform.customers)} aktive kunder{data.platform.customersWithLease != null ? ` · ${fmtNum(data.platform.customersWithLease)} m/ leiekontrakt` : ''}</p>
                  <p className="mt-1 text-[11px] text-amber-600">Inkluderer estimert leie på enheter uten inngått leiekontrakt.</p>
                </div>
              ) : data?.runRate ? (
                <div className="rounded-[20px] p-4 sm:p-6 relative overflow-hidden border border-emerald-100 shadow-[0_1px_2px_rgba(16,14,24,0.04)]" style={{ background: 'linear-gradient(140deg, #ECFDF5 0%, #FFFFFF 62%)' }}>
                  <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] flex items-center gap-1.5" style={{ color: EMER_TEXT }}><Zap className="w-3.5 h-3.5" /> Run-rate (ARR)</p>
                  <p className="mt-2.5 text-[#16141d] font-bold leading-none tracking-[-0.035em] tabular-nums" style={{ fontSize: 'clamp(2.1rem, 8vw, 2.6rem)' }}><CountNumber value={data.runRate.arr} format={fmtKrFull} /> <span className="text-[#a5a3af] text-[16px] font-semibold">kr</span></p>
                  <p className="mt-2 text-[12.5px] text-[#8b8894] tabular-nums">MRR {fmtKrFull(data.runRate.mrr)} kr · {fmtNum(data.runRate.activeCustomers)} kunder × {fmtKrFull(data.runRate.monthlyFee)} kr/mnd</p>
                </div>
              ) : (
                <KpiCard testid="kpi-totalrev" icon={Wallet} label="Total omsetning" value={m.totalRevenueAllTime?.value} format={fmtKrFull} suffix="kr" sub="all tid · sporet + historisk" />
              )}
              <KpiCard testid="kpi-spend" icon={Wallet} label="Annonseforbruk" value={m.spend?.total} format={fmtKrFull} suffix="kr" inverse sub={`Google ${fmtKr(m.spend?.google)} · Meta ${fmtKr(m.spend?.meta)}`} onClick={() => explain('spend')} />
              <div className={`${CARD} p-4 sm:p-6 grid grid-cols-2 gap-x-4 gap-y-5`}>
                <MiniStat testid="ms-newleads" label="Nye leads" value={fmtNum(m.newLeads?.value)} sub={m.newLeads?.delta != null ? `${m.newLeads.delta > 0 ? '+' : ''}${m.newLeads.delta} % vs forrige` : ''} onClick={() => explain('new_leads')} />
                <MiniStat testid="ms-totalcust" label="Total kunder" value={fmtNum(m.totalCustomers?.value)} sub={m.totalCustomers?.historical ? `+${fmtNum(m.totalCustomers.historical)} hist.` : 'sporet'} onClick={() => explain('total_customers')} />
                <MiniStat testid="ms-response" label="Responstid" value={m.responseHours?.value != null ? fmtNum(m.responseHours.value) : '—'} suffix="t" sub={m.responseHours?.sla24hPct != null ? `${m.responseHours.sla24hPct} % <24 t` : ''} onClick={() => explain('response')} />
                <MiniStat testid="ms-roas" label="ROAS" fn={4} value={fmtRatio(m.roasTrue?.value)} suffix="x" sub="omsetn. ÷ forbruk" onClick={() => explain('roas')} />
              </div>
            </div>
          </Reveal>

          {/* Inntektskvalitet — faktisk vs kontrahert vs potensial honorar */}
          {data?.revenueModel?.hasData && (
            <Reveal delay={350}>
              <RevenueQualityPanel rm={data.revenueModel} ltvBasis={hero.ltv?.basis} hero={hero} onExplain={explain} onOpenSettings={() => setSettingsOpen(true)} />
            </Reveal>
          )}

          {/* Prod-fasit — er tallene over faktisk i takt med plattformen? */}
          <Reveal delay={365}>
            <RevenueReconcile apiKey={apiKey} days={(PERIODS.find((p) => p.k === period) || PERIODS[2]).days} />
          </Reveal>

          {/* Pipeline + kanaler + etterspørsel */}
          <Reveal delay={380}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 sm:gap-4 mt-2.5 sm:mt-4">
              <PipelineCard pipeline={m.pipeline || []} pv={data?.pipelineValue} onExplain={explain} />
              <div className={`${CARD} p-4 sm:p-6`} data-testid="kpi-channels">
                <p className={`${CARD_LABEL} mb-4`}>Leads per kanal <span className="normal-case tracking-normal text-[#c9c7d1] font-medium">· {data?.period?.label || ''}</span></p>
                <ChannelBars channels={data?.channels || []} />
              </div>
              <div role="button" tabIndex={0} onClick={() => explain('tenant_demand')}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); explain('tenant_demand'); } }}
                title="Klikk for detaljer"
                className={`group ${CARD} p-4 sm:p-6 flex flex-col justify-between cursor-pointer ${LIFT} ${RING}`} data-testid="kpi-demand">
                <div>
                  <p className={`${CARD_LABEL} flex items-center gap-1.5`}>
                    <Users className="w-3.5 h-3.5 shrink-0 text-[#c9c7d1]" /> <span className="min-w-0">Etterspørsel · leietakere</span>
                    <span className="ml-auto"><OpenHint /></span>
                  </p>
                  <div className="mt-2.5 flex items-end gap-1.5">
                    <CountNumber value={m.newTenantLeads?.value} format={fmtNum} className="font-bold tracking-[-0.035em] text-[#16141d] tabular-nums leading-none" style={{ fontSize: 'clamp(2rem, 7vw, 2.4rem)' }} />
                    {m.newTenantLeads?.delta != null && <span className="mb-1"><Delta value={m.newTenantLeads.delta} /></span>}
                  </div>
                  <p className="mt-1.5 text-[12px] sm:text-[12.5px] text-[#a5a3af]">boligsøkere i perioden</p>
                </div>
                <p className="mt-4 pt-4 border-t border-black/[0.05] text-[11px] sm:text-[11.5px] text-[#a5a3af] leading-relaxed text-pretty">Etterspørselssiden av markedsplassen — leietakerkø gjør boligene raskere utleid, men telles ikke i CAC/LTV.</p>
              </div>
            </div>
          </Reveal>

          {/* Definisjoner / fotnoter */}
          <Reveal delay={440}>
            <Definitions generatedAt={data?.generatedAt} />
          </Reveal>
        </div>
      )}

      {explainId && explainers.length > 0 && (
        <KpiDetailModal explainers={explainers} activeId={explainId} apiKey={apiKey} days={data?.period?.days || 90}
          onClose={() => setExplainId(null)} onNavigate={setExplainId} />
      )}
      {settingsOpen && <LtvSettingsModal apiKey={apiKey} current={data?.ltvModel} revenueModel={data?.revenueModel} onClose={() => setSettingsOpen(false)} onSaved={() => { setSettingsOpen(false); load(); }} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// INNTEKTSKVALITET — skiller faktisk honorar fra estimert.
// Honoraret utløses av en FAKTISK inngått leiekontrakt, ikke av en signert
// huseierkontrakt med estimert leie. Dette panelet gjør forskjellen synlig.
// ---------------------------------------------------------------------------
function RevenueQualityPanel({ rm, ltvBasis, hero, onExplain, onOpenSettings }) {
  const ratio = (v) => (v != null ? `${fmtRatio(v)} : 1` : '—');
  const tiers = [
    {
      k: 'actual', id: 'mrr_actual', l: 'Realisert', d: 'Signert og startet leiekontrakt',
      mrr: rm.mrr.actual, n: rm.tiers.actual.count, color: EMER, text: EMER_TEXT, bg: 'bg-emerald-50',
      rows: [
        ['ARR', `${fmtKrFull(rm.tiers.actual.arr)} kr`],
        ['Kunder med leieinntekt', fmtNum(rm.tiers.actual.customers)],
        ['LTV per kunde', rm.ltv.value != null ? `${fmtKrFull(rm.ltv.value)} kr` : '—'],
        ['LTV : CAC', ratio(hero?.ltvCac?.value)],
      ],
    },
    {
      k: 'contracted', id: 'mrr_contracted', l: 'Kontrahert', d: 'Leiekontrakt inngått, ikke startet',
      mrr: rm.mrr.contracted, n: rm.tiers.contracted.count, color: '#f59e0b', text: '#b45309', bg: 'bg-amber-50',
      rows: [
        ['ARR', `${fmtKrFull(rm.tiers.contracted.arr)} kr`],
        ['MRR om 90 d', rm.ramp?.length ? `${fmtKrFull(rm.ramp[rm.ramp.length - 1].mrr)} kr` : '—'],
        ['LTV inkl. kontrahert', rm.ltv.contractedBasis?.value != null ? `${fmtKrFull(rm.ltv.contractedBasis.value)} kr` : '—'],
        ['LTV : CAC', ratio(hero?.ltvCacContracted?.value)],
      ],
    },
    {
      k: 'potential', id: 'mrr_potential', l: 'Potensial', d: 'Forvaltningsavtale, estimert leie',
      mrr: rm.mrr.potential, n: rm.tiers.potential.count, color: '#a5a3af', text: '#67646f', bg: 'bg-black/[0.03]',
      rows: [
        ['Med prisestimat', `${fmtNum(rm.tiers.potential.withEstimate)} av ${fmtNum(rm.tiers.potential.count)}`],
        ['Aktiveringsrate', rm.customers.activationRatePct != null ? `${fmtNum(rm.customers.activationRatePct)} %` : '—'],
        ['Forventet honorar/ny', rm.ltv.expectedMonthlyFeePerNew != null ? `${fmtKrFull(rm.ltv.expectedMonthlyFeePerNew)} kr/mnd` : '—'],
        ['Risikojustert LTV', rm.ltv.riskAdjustedNewCustomer != null ? `${fmtKrFull(rm.ltv.riskAdjustedNewCustomer)} kr` : '—'],
      ],
    },
  ];
  const total = Math.max(1, rm.mrr.totalPipeline);
  return (
    <div className={`mt-2.5 sm:mt-4 ${CARD} p-4 sm:p-6`} data-testid="kpi-revenue-quality">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className={`${CARD_LABEL} flex items-center gap-1.5`}><Wallet className="w-3.5 h-3.5 text-[#c9c7d1]" /> Inntektskvalitet</p>
          <p className="mt-1.5 text-[12px] sm:text-[12.5px] text-[#8b8894] leading-snug text-pretty">Honoraret utløses av <b className="text-[#514e5a]">faktisk inngått leiekontrakt</b> — ikke av estimert leie i huseierkontrakten.</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {rm.revenueQualityPct != null && (
            <span className="rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums bg-emerald-50 border border-emerald-100" style={{ color: EMER_TEXT }} data-testid="revq-pct">
              {rm.revenueQualityPct} % realisert
            </span>
          )}
          <button onClick={onOpenSettings} className={`rounded-full px-2.5 py-1 text-[11px] font-semibold text-[#67646f] bg-black/[0.045] hover:bg-black/[0.09] transition-colors flex items-center gap-1 ${RING}`}>
            <Sliders className="w-3 h-3" /> <span className="hidden xs:inline sm:inline">Forutsetninger</span>
          </button>
        </div>
      </div>

      {/* Stablet søyle */}
      <div className="mt-4 sm:mt-5 h-2.5 w-full rounded-full overflow-hidden flex gap-px bg-black/[0.045]">
        {tiers.map((t) => (
          <div key={t.k} className="transition-[width] duration-700 ease-out" style={{ width: `${(t.mrr / total) * 100}%`, background: t.color }} title={`${t.l}: ${fmtKrFull(t.mrr)} kr/mnd`} />
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        {tiers.map((t) => (
          <div key={t.k} role="button" tabIndex={0}
            onClick={() => onExplain && onExplain(t.id)}
            onKeyDown={(e) => { if (onExplain && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onExplain(t.id); } }}
            title="Klikk for formel, forbehold og kontraktsliste"
            className={`group relative overflow-hidden rounded-2xl px-3.5 sm:px-4 pt-4 pb-3.5 ${t.bg} cursor-pointer ${RING} hover:shadow-[0_14px_34px_-18px_rgba(16,14,24,0.3)] hover:-translate-y-[3px] transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`}
            data-testid={`revq-tier-${t.k}`}>
            <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ background: t.color }} />
            <p className="text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.11em] flex items-center gap-1.5" style={{ color: t.text }}>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: t.color }} /><span className="min-w-0 truncate">{t.l}</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-auto shrink-0 opacity-25 group-hover:opacity-95 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" style={{ color: t.text }} />
            </p>
            <p className="mt-1.5 text-[#16141d] font-bold leading-none tracking-[-0.035em] tabular-nums" style={{ fontSize: 'clamp(1.5rem, 5.6vw, 1.75rem)' }}>
              {fmtKrFull(t.mrr)} <span className="text-[#a5a3af] text-[12px] font-semibold">kr/mnd</span>
            </p>
            <p className="mt-1.5 text-[11px] text-[#8b8894] tabular-nums leading-snug">{fmtNum(t.n)} kontrakt{t.n === 1 ? '' : 'er'} · {t.d}</p>
            <dl className="mt-3 pt-3 border-t border-black/[0.07] space-y-1.5">
              {t.rows.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-2">
                  <dt className="text-[10.5px] text-[#8b8894] leading-snug min-w-0">{k}</dt>
                  <dd className="text-[11px] font-bold text-[#16141d] tabular-nums whitespace-nowrap">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      <div className="mt-5 pt-5 border-t border-black/[0.05] grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-5">
        <MiniStat testid="revq-activation" label="Aktiveringsrate" value={rm.customers.activationRatePct != null ? fmtNum(rm.customers.activationRatePct) : '—'} suffix="%"
          sub={`${fmtNum(rm.customers.earning)} av ${fmtNum(rm.customers.management)} kunder har leieinntekt`} onClick={onExplain ? () => onExplain('activation') : undefined} />
        <MiniStat testid="revq-awaiting" label="Venter på leiekontrakt" value={fmtNum(rm.customers.awaitingLease)}
          sub="forvaltningsavtale uten leieinntekt" onClick={onExplain ? () => onExplain('mrr_potential') : undefined} />
        <MiniStat testid="revq-ttr" label="Tid til leieinntekt" value={rm.timing.daysToFirstLease != null ? fmtNum(rm.timing.daysToFirstLease) : '—'} suffix="d"
          sub={rm.timing.sampleSize > 0 ? `median · ${fmtNum(rm.timing.sampleSize)} kunder` : 'ikke nok data'} onClick={onExplain ? () => onExplain('time_to_rent') : undefined} />
        <MiniStat testid="revq-atrisk" label="MRR i faresonen" value={fmtKrFull(rm.mrr.atRisk90d)} suffix="kr"
          sub="leiekontrakter som utløper innen 90 d" onClick={onExplain ? () => onExplain('at_risk') : undefined} />
      </div>

      {/* Forutsetninger — samme tall som over, men vist som regnestykke.
          Tidligere var dette én lang tekstlinje som brøt over fire rader. */}
      <div className="mt-5 pt-5 border-t border-black/[0.05]">
        <p className="text-[9.5px] font-bold uppercase tracking-[0.13em] text-[#a5a3af]">Forutsetninger og sensitivitet</p>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl bg-[#faf9fc] ring-1 ring-inset ring-black/[0.045] p-3.5" data-testid="revq-ltv-formula">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a5a3af]">LTV — realisert</p>
            <p className="mt-1.5 text-[#16141d] font-bold tabular-nums leading-none tracking-[-0.03em]" style={{ fontSize: 'clamp(1.15rem, 4vw, 1.35rem)' }}>
              {rm.ltv.value != null ? `${fmtKrFull(rm.ltv.value)} kr` : '—'}
            </p>
            <p className="mt-1.5 text-[11px] leading-snug text-[#8b8894] tabular-nums">
              {rm.ltv.monthlyFee != null ? `${fmtKrFull(rm.ltv.monthlyFee)} kr/mnd` : '—'} × {rm.lifetimeMonths} mnd
              {rm.ltv.grossMarginPct < 100 ? ` × ${rm.ltv.grossMarginPct} % margin` : ' · omsetning, ikke margin'}
            </p>
            {rm.ltv.contractedBasis?.value != null && (
              <p className="mt-2 pt-2 border-t border-black/[0.06] text-[11px] leading-snug text-[#8b8894] tabular-nums" data-testid="revq-ltv-contracted">
                Med kontraherte: <b className="text-[#16141d]">{fmtKrFull(rm.ltv.contractedBasis.value)} kr</b>
                <span className="text-[#b6b4bf]"> · {fmtKrFull(rm.ltv.contractedBasis.monthlyFee)} kr/mnd · {fmtNum(rm.ltv.contractedBasis.customersWithLease)} kunder</span>
              </p>
            )}
          </div>

          {rm.ltv.sensitivity?.length > 0 && (
            <div className="rounded-2xl bg-[#faf9fc] ring-1 ring-inset ring-black/[0.045] p-3.5" data-testid="revq-sensitivity">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a5a3af]">Hvis kunden blir lenger</p>
              <div className="mt-2 space-y-1">
                {rm.ltv.sensitivity.map((s) => (
                  <div key={s.months} className="flex items-baseline justify-between gap-2 tabular-nums">
                    <span className={`text-[11px] ${s.months === rm.lifetimeMonths ? 'text-[#16141d] font-semibold' : 'text-[#8b8894]'}`}>
                      {s.months} mnd{s.months === rm.lifetimeMonths ? ' (i bruk)' : ''}
                    </span>
                    <span className={`text-[11.5px] font-bold whitespace-nowrap ${s.months === rm.lifetimeMonths ? 'text-[#16141d]' : 'text-[#6f6c7a]'}`}>{fmtKrFull(s.ltv)} kr</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {rm.ramp?.length > 0 && rm.mrr.contracted > 0 && (
            <div className="rounded-2xl bg-[#faf9fc] ring-1 ring-inset ring-black/[0.045] p-3.5" data-testid="revq-ramp">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a5a3af]">Når kontrahert leie slår inn</p>
              <div className="mt-2 space-y-1">
                {rm.ramp.map((r) => (
                  <div key={r.inDays} className="flex items-baseline justify-between gap-2 tabular-nums">
                    <span className="text-[11px] text-[#8b8894]">+{r.inDays} dager</span>
                    <span className="text-[11.5px] font-bold text-[#6f6c7a] whitespace-nowrap">{fmtKrFull(r.mrr)} kr/mnd</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[#b6b4bf]">
          <span>Regel: {rm.ruleLabel}</span>
          {ltvBasis && ltvBasis !== 'actual' && (
            <span className="text-amber-600 font-medium">LTV-modus er «{ltvBasis}» — bytt til «Faktisk honorar» for å bruke tallene over.</span>
          )}
        </div>
      </div>
    </div>
  );
}

function LtvSettingsModal({ apiKey, current, revenueModel, onClose, onSaved }) {
  const [mode, setMode] = useState(current?.ltvMode || 'actual');
  const [monthlyFee, setMonthlyFee] = useState(current?.monthlyFee ?? '');
  const [lifetimeMonths, setLifetimeMonths] = useState(current?.lifetimeMonths ?? 36);
  const [grossMarginPct, setGrossMarginPct] = useState(current?.grossMarginPct ?? '');
  const [leaseRule, setLeaseRule] = useState(current?.leaseActualRule || 'signed_started');
  const [northStar, setNorthStar] = useState(current?.northStar || 'ltv_cac');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/kpi/settings?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ltvMode: mode,
          monthlyFee: monthlyFee === '' ? null : Number(monthlyFee),
          lifetimeMonths: lifetimeMonths === '' ? null : Number(lifetimeMonths),
          grossMarginPct: grossMarginPct === '' ? null : Number(grossMarginPct),
          leaseActualRule: leaseRule,
          northStar,
        }),
      });
      onSaved();
    } catch (e) { setSaving(false); }
  };
  const marginFrac = Number(grossMarginPct) > 0 ? Math.min(100, Number(grossMarginPct)) / 100 : 1;
  const actualFee = revenueModel?.customers?.feePerEarningCustomer || 0;
  const preview = mode === 'actual'
    ? (actualFee > 0 && Number(lifetimeMonths) > 0 ? Math.round(actualFee * Number(lifetimeMonths) * marginFrac) : null)
    : (mode === 'recurring' && Number(monthlyFee) > 0 && Number(lifetimeMonths) > 0 ? Math.round(Number(monthlyFee) * Number(lifetimeMonths) * marginFrac) : null);

  const MODES = [
    { k: 'actual', l: 'Faktisk honorar', d: 'Fra inngåtte leiekontrakter' },
    { k: 'recurring', l: 'Løpende (manuelt)', d: 'Honorar × levetid' },
    { k: 'contract', l: 'Kontraktsverdi', d: 'Snitt registrert verdi' },
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:px-4 sm:py-8 overflow-y-auto">
      <div className="absolute inset-0 bg-[#16141d]/40 backdrop-blur-[3px]" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-[26px] sm:rounded-[26px] bg-white ring-1 ring-black/[0.06] p-5 sm:p-6 shadow-[0_30px_90px_rgba(22,20,29,0.28)] sm:my-auto">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[#16141d] text-[16px] sm:text-[17px] font-bold tracking-[-0.015em]">LTV-modell &amp; North Star</h3>
          <button onClick={onClose} aria-label="Lukk" className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-[#a5a3af] hover:bg-black/[0.04] hover:text-[#16141d] transition-colors"><X className="w-[18px] h-[18px]" /></button>
        </div>
        <p className="text-[#8b8894] text-[12.5px] leading-relaxed mt-1.5">Honoraret utløses av en <b>faktisk inngått leiekontrakt</b> — ikke av estimert leie i en huseierkontrakt. Ingen tall fabrikkeres.</p>
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {MODES.map((mo) => (
              <button key={mo.k} onClick={() => setMode(mo.k)} data-testid={`ltv-mode-${mo.k}`}
                className={`rounded-xl px-3 py-3 text-left border transition-colors ${mode === mo.k ? 'border-[#7c5cf0] bg-[#7c5cf0]/[0.06]' : 'border-black/[0.08] hover:border-black/[0.18]'}`}>
                <p className="text-[#16141d] text-[12.5px] font-semibold flex items-center gap-1">{mode === mo.k && <Check className="w-3.5 h-3.5 shrink-0" style={{ color: VIOLET }} />}{mo.l}</p>
                <p className="text-[#8b8894] text-[11px] mt-0.5 leading-tight">{mo.d}</p>
              </button>
            ))}
          </div>

          {mode === 'actual' && (
            <div className="rounded-xl bg-[#7c5cf0]/[0.05] px-3.5 py-3 text-[12.5px] text-[#514e5a]">
              Månedshonorar hentes automatisk fra plattformens leiekontrakter:{' '}
              <b>{actualFee > 0 ? `${fmtKrFull(actualFee)} kr/mnd` : 'ingen inngåtte leiekontrakter ennå'}</b>
              {revenueModel?.customers?.earning > 0 && <> · snitt over {fmtNum(revenueModel.customers.earning)} kunde{revenueModel.customers.earning === 1 ? '' : 'r'} med leieinntekt</>}
            </div>
          )}

          {mode === 'recurring' && (
            <div>
              <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">Månedshonorar (kr)</label>
              <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="f.eks. 1500" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] placeholder:text-[#c4c2cc] outline-none focus:border-[#7c5cf0] text-[14px] tabular-nums" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">Kundelevetid (mnd)</label>
              <input type="number" data-testid="ltv-lifetime" value={lifetimeMonths} onChange={(e) => setLifetimeMonths(e.target.value)} placeholder="36" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] placeholder:text-[#c4c2cc] outline-none focus:border-[#7c5cf0] text-[14px] tabular-nums" />
              <p className="text-[#a5a3af] text-[11px] mt-1">Anbefalt start: 36 mnd. Juster når du har churn-data.</p>
            </div>
            <div>
              <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">Bruttomargin (%)</label>
              <input type="number" data-testid="ltv-margin" value={grossMarginPct} onChange={(e) => setGrossMarginPct(e.target.value)} placeholder="tom = ren omsetning" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] placeholder:text-[#c4c2cc] outline-none focus:border-[#7c5cf0] text-[14px] tabular-nums" />
              <p className="text-[#a5a3af] text-[11px] mt-1">La stå tom for LTV som omsetning.</p>
            </div>
          </div>

          <div>
            <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">Når er en leiekontrakt faktisk inntekt?</label>
            <select value={leaseRule} onChange={(e) => setLeaseRule(e.target.value)} data-testid="ltv-lease-rule" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] outline-none focus:border-[#7c5cf0] text-[14px]">
              <option value="signed_started">Signert og startet (anbefalt)</option>
              <option value="signed">Signert, også fremtidig start</option>
              <option value="pending">Alle leiekontrakter, også ikke ferdig signerte</option>
            </select>
          </div>

          {preview != null && <p className="text-[12.5px] rounded-lg px-3 py-2 flex items-center gap-2 bg-emerald-50" style={{ color: EMER_TEXT }}><Zap className="w-3.5 h-3.5" /> Beregnet LTV: <b>{fmtKrFull(preview)} kr</b>{Number(grossMarginPct) > 0 ? ` (bruttofortjeneste, ${grossMarginPct} % margin)` : ' (omsetning)'}</p>}

          <div className="pt-1">
            <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">North Star (størst øverst)</label>
            <select value={northStar} onChange={(e) => setNorthStar(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] outline-none focus:border-[#7c5cf0] text-[14px]">
              <option value="ltv_cac">LTV : CAC (anbefalt)</option>
              <option value="new_customers">Nye kunder</option>
              <option value="revenue">Omsetning</option>
              <option value="cac">Kost per kunde</option>
              <option value="avg_value">Snitt kundeverdi</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-black/[0.05] text-[#514e5a] font-semibold text-[14px] hover:bg-black/[0.08] transition-colors">Avbryt</button>
          <button onClick={save} disabled={saving} data-testid="ltv-save" className="flex-1 h-11 rounded-xl font-semibold text-[14px] text-white grid place-items-center disabled:opacity-60 bg-[#16141d] hover:bg-[#2a2733] transition-colors">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lagre'}</button>
        </div>
      </div>
    </div>
  );
}

function PresentationMode({ data, northStarView, hero, m, rating, chartData, period, setPeriod, periods, onExit }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: 'linear-gradient(160deg, #fbfaff 0%, #f7f6f4 55%, #f3f0fa 100%)' }}>
      <style>{`@keyframes kpiPulseP { 0%,100%{opacity:.45} 50%{opacity:1} }`}</style>
      <div className="min-h-screen flex flex-col px-5 sm:px-16 py-6 sm:py-9">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: VIOLET, animation: 'kpiPulseP 2.4s ease-in-out infinite' }} />
          <span className="text-[#16141d] text-[16px] sm:text-[18px] font-bold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome</span>
          <span className="text-[#8b8894] text-[12px] sm:text-[13px]">· Nøkkeltall · {data?.period?.label}</span>
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            <div className="flex flex-1 sm:flex-none items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5">
              {periods.map((p) => (
                <button key={p.k} onClick={() => setPeriod(p.k)} className={`flex-1 sm:flex-none px-2.5 sm:px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${period === p.k ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894] hover:text-[#16141d]'}`}>{p.l}</button>
              ))}
            </div>
            <button onClick={onExit} className="h-9 pl-3 pr-3.5 shrink-0 rounded-full bg-[#16141d] text-white hover:bg-[#2a2733] text-[13px] font-semibold flex items-center gap-1.5 transition-colors"><Minimize2 className="w-4 h-4" /> <span className="hidden sm:inline">Lukk</span></button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="flex items-center gap-3">
            <p className="text-[14px] sm:text-[16px] font-semibold uppercase tracking-[0.22em]" style={{ color: VIOLET }}>{northStarView.label}</p>
            {northStarView.rating && <span className="text-[13px] font-bold rounded-full px-2.5 py-1" style={{ color: rating.color, background: `${rating.color}14` }}>{rating.label}</span>}
          </div>
          <div className="mt-4 flex items-end justify-center gap-4">
            <CountNumber value={northStarView.value} format={northStarView.format} className="text-[#16141d] font-bold tracking-[-0.05em] tabular-nums text-[104px] sm:text-[184px] leading-[0.82]" />
            {northStarView.suffix && <span className="text-[#c4c2cc] font-bold text-[36px] sm:text-[58px] mb-3 sm:mb-6">{northStarView.suffix}</span>}
          </div>
          {northStarView.sub && <p className="mt-3 text-[15px] sm:text-[19px] text-[#8b8894] tabular-nums">{northStarView.sub}</p>}
          <div className="mt-8 w-full max-w-3xl"><AreaChart data={chartData} color={EMER} height={140} /></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-5">
          <BigPresent label="Kost per kunde" value={hero.cac?.value} format={fmtKrFull} suffix="kr" />
          <BigPresent label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKrFull} suffix="kr" />
          <BigPresent label="Nye kunder" value={m.newCustomers?.value} format={fmtNum} delta={m.newCustomers?.delta} />
          <BigPresent label="Tid til kunde" value={hero.timeToWin?.value} format={fmtNum} suffix="dager" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 pb-8">
          <div className="lg:col-span-2 rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] px-6 py-6">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8b8894]">Vekst · siste 12 måneder</p>
              {data?.platform && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-semibold px-2.5 py-1 text-[12px]" style={{ color: EMER_TEXT }}><Zap className="w-3 h-3" /> MRR live: {fmtKrFull(data.platform.mrr)} kr</span>}
            </div>
            <div className="mt-4"><MonthlyBars data={data?.series?.monthly || []} height={150} /></div>
          </div>
          <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] px-6 py-6">
            <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8b8894] mb-4">Leads per kanal</p>
            <ChannelBars channels={data?.channels || []} />
            {data?.momentum && (
              <p className="mt-4 pt-4 border-t border-black/[0.05] text-[12px] text-[#8b8894]">
                Siste 7 dager: <b className="text-[#16141d]">{fmtNum(data.momentum.sessions7d)}</b> økter · <b className="text-[#16141d]">{fmtNum(data.momentum.leads7d)}</b> leads
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BigPresent({ label, value, format, suffix, delta }) {
  return (
    <div className="rounded-[20px] bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(16,14,24,0.04)] px-6 py-7 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8b8894]">{label}</p>
      <div className="mt-3 flex items-end justify-center gap-1.5">
        <CountNumber value={value} format={format} className="text-[#16141d] font-bold tracking-[-0.03em] tabular-nums text-[42px] sm:text-[56px] leading-none" />
        {suffix && <span className="text-[#a5a3af] font-semibold text-[18px] sm:text-[22px] mb-1.5">{suffix}</span>}
      </div>
      {delta != null && <div className="mt-2 flex justify-center"><Delta value={delta} /></div>}
    </div>
  );
}
