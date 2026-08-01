'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Loader2, TrendingUp, TrendingDown, Sliders, Maximize2, Minimize2,
  RefreshCw, Zap, X, Check, Info, Gauge, Activity, Users, Clock, Wallet, BookOpen,
} from 'lucide-react';

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

function CountNumber({ value, format = fmtNum, className }) {
  const v = useCountUp(value);
  if (value == null || value === '—') return <span className={className}>—</span>;
  return <span className={className}>{format(v)}</span>;
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
function PipelineCard({ pipeline = [], pv }) {
  const total = pipeline.reduce((s, p) => s + p.count, 0) || 1;
  return (
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6">
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
        <div className="mt-4 pt-4 border-t border-black/[0.05]">
          <p className="text-[11px] text-[#a5a3af] uppercase tracking-[0.08em] font-semibold">Potensial i åpne leads</p>
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
    <div className="relative mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] px-4 py-2.5 text-[12.5px]">
      <span className="inline-flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-[0.12em]" style={{ color: EMER_TEXT }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: EMER, animation: 'kpiPulse 1.6s ease-in-out infinite' }} /> Live
      </span>
      {momentum && (
        <>
          <span className="text-[#8b8894]">I dag: <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.sessionsToday)}</b> økter · <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.leadsToday)}</b> leads</span>
          <span className="text-[#8b8894]">Siste 7 d: <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.sessions7d)}</b> økter · <b className="text-[#16141d] tabular-nums">{fmtNum(momentum.leads7d)}</b> leads</span>
        </>
      )}
      {platform && (
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-semibold px-2.5 py-1 text-[11.5px]" style={{ color: EMER_TEXT }}
          title={platform.mrrBasis || undefined}>
          <Zap className="w-3 h-3" /> MRR live: {fmtKrFull(platform.mrr)} kr · {fmtNum(platform.customers)} aktive kunder
          {platform.customersWithLease != null && <span className="opacity-80">({fmtNum(platform.customersWithLease)} m/ leiekontrakt)</span>}
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

// --- KPI-kort ---
function KpiCard({ label, value, format = fmtNum, suffix, delta, inverse, spark, sparkColor, sub, icon: Icon, fn, testid }) {
  return (
    <div data-testid={testid} className="group relative rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] hover:shadow-[0_10px_30px_-14px_rgba(22,20,29,0.16)] hover:-translate-y-0.5 transition-all duration-300 p-5 sm:p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-[#c4c2cc]" />}{label}{fn != null && <Fn n={fn} />}
        </p>
        {delta != null && <Delta value={delta} inverse={inverse} />}
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <CountNumber value={value} format={format} className="font-bold tracking-[-0.03em] text-[#16141d] tabular-nums text-[30px] sm:text-[36px] leading-none" />
        {suffix && <span className="font-semibold text-[#a5a3af] text-[15px] mb-0.5">{suffix}</span>}
      </div>
      {sub && <p className="mt-1.5 text-[12.5px] text-[#a5a3af]">{sub}</p>}
      {delta != null && <p className="mt-1 text-[11px] text-[#b8b6c0]">vs forrige periode</p>}
      {spark && spark.length > 0 && <div className="mt-4 -mx-1"><Sparkline data={spark} color={sparkColor || VIOLET} height={34} /></div>}
    </div>
  );
}

function MiniStat({ label, value, suffix, sub, fn }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#a5a3af]">{label}{fn != null && <Fn n={fn} />}</p>
      <p className="mt-1.5 text-[#16141d] font-bold text-[24px] leading-none tracking-[-0.02em] tabular-nums">{value}{suffix && <span className="text-[#a5a3af] text-[14px] font-semibold ml-1">{suffix}</span>}</p>
      {sub && <p className="mt-1 text-[11.5px] text-[#b0aeb8]">{sub}</p>}
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
  { n: 1, term: 'LTV', text: 'Livstidsverdi per kunde. Kontraktmodus: snitt av faktiske kontraktsverdier. Løpende modus: månedshonorar × forventet levetid (settes under innstillinger).' },
  { n: 2, term: 'CAC', text: 'Kundeanskaffelseskost. Annonseforbruk (Google + Meta) delt på nye kunder i perioden.' },
  { n: 3, term: 'CPL', text: 'Kost per lead. Annonseforbruk delt på nye leads i perioden.' },
  { n: 4, term: 'ROAS', text: 'Annonseavkastning. Tilskrevet omsetning delt på annonseforbruk. «Ekte» = kun omsetning som kan spores til betalt trafikk.' },
  { n: 5, term: 'Payback', text: 'Antall måneder før månedshonoraret fra en ny kunde har dekket anskaffelseskostnaden (CAC ÷ månedshonorar).' },
];

function Definitions({ generatedAt }) {
  return (
    <div className="mt-5 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6" data-testid="kpi-definitions">
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5 mb-3"><BookOpen className="w-3.5 h-3.5 text-[#c4c2cc]" /> Definisjoner & datagrunnlag</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5">
        {DEFINITIONS.map((d) => (
          <p key={d.n} className="text-[12px] leading-relaxed text-[#8b8894]">
            <sup className="font-semibold mr-0.5" style={{ color: VIOLET }}>{d.n}</sup>
            <b className="text-[#514e5a]">{d.term}</b> — {d.text}
          </p>
        ))}
        <p className="text-[12px] leading-relaxed text-[#8b8894]">
          <Info className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-[#c4c2cc]" />
          Totaler og snittverdi viser helhetsbildet (sporet + historisk import). CPL, CAC og ROAS beregnes kun av sporet, betalt trafikk.
        </p>
      </div>
      <p className="mt-3 pt-3 border-t border-black/[0.05] text-[11px] text-[#b8b6c0] tabular-nums">
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
      <div className="rounded-3xl bg-white border border-black/[0.06] p-8">
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

  const northStarView = useMemo(() => {
    switch (northStar) {
      case 'new_customers': return { label: 'Nye kunder', value: m.newCustomers?.value, format: fmtNum, suffix: '', sub: data?.period?.label || '', delta: m.newCustomers?.delta };
      case 'revenue': return { label: 'Omsetning', value: m.revenue?.value, format: fmtKrFull, suffix: 'kr', sub: 'Tilskrevet i perioden', delta: m.revenue?.delta };
      case 'cac': return { label: 'Kundeanskaffelseskost', value: hero.cac?.value, format: fmtKrFull, suffix: 'kr', sub: 'Annonseforbruk per ny kunde', inverse: true };
      case 'avg_value': return { label: 'Snitt kundeverdi', value: hero.avgCustomerValue?.value, format: fmtKrFull, suffix: 'kr', sub: 'Snitt av alle kunder' };
      default: return {
        label: 'LTV : CAC', value: hero.ltvCac?.value, format: fmtRatio, suffix: ': 1',
        sub: `LTV ${fmtKrFull(hero.ltvCac?.ltv)} kr · CAC ${fmtKrFull(hero.ltvCac?.cac)} kr${hero.ltvCac?.ltvBasis === 'recurring' ? ' · løpende' : ''}`,
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

      {/* Topplinje */}
      <div className="relative flex flex-wrap items-center gap-3 pb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[#16141d] text-[20px] sm:text-[22px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Nøkkeltall</h2>
          <span className="text-[#a5a3af] text-[13px] hidden sm:inline">· {data?.period?.label || ''}</span>
          {data?.configured && !data.configured.ads && <span className="text-[10.5px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">annonsedata utilgjengelig</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`kpi-period-${p.k}`}
                className={`px-2.5 sm:px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${period === p.k ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894] hover:text-[#16141d]'}`}>{p.l}</button>
            ))}
          </div>
          <button onClick={() => setSettingsOpen(true)} title="LTV-modell" data-testid="kpi-settings-btn" className="h-8 w-8 rounded-full bg-white border border-black/[0.07] text-[#8b8894] hover:text-[#16141d] hover:border-black/[0.14] grid place-items-center transition-colors"><Sliders className="w-4 h-4" /></button>
          <button onClick={load} title="Oppdater" className="h-8 w-8 rounded-full bg-white border border-black/[0.07] text-[#8b8894] hover:text-[#16141d] hover:border-black/[0.14] grid place-items-center transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setPresent(true)} data-testid="kpi-present-btn" className="h-8 pl-3 pr-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 text-white bg-[#16141d] hover:bg-[#2a2733] transition-colors"><Maximize2 className="w-3.5 h-3.5" /> Presentasjon</button>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-[460px] grid place-items-center rounded-3xl bg-white border border-black/[0.06]"><Loader2 className="w-6 h-6 animate-spin" style={{ color: VIOLET }} /></div>
      ) : (
        <div className="relative">
          <MomentumStrip momentum={data?.momentum} platform={data?.platform} />

          {/* NORTH STAR + Enhetsøkonomi */}
          <Reveal delay={40}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
              <div className="lg:col-span-3 relative rounded-3xl overflow-hidden border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] px-6 sm:px-9 py-8 sm:py-9" style={{ background: 'linear-gradient(135deg, #f7f2ff 0%, #ffffff 58%)' }}>
                <div aria-hidden className="pointer-events-none absolute -top-24 -right-10 h-64 w-64 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${VIOLET_SOFT}33 0%, transparent 70%)` }} />
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: VIOLET }}>{northStarView.label}{northStar === 'ltv_cac' && <><Fn n={1} /><Fn n={2} /></>}</p>
                  {northStarView.rating && <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ color: rating.color, background: `${rating.color}14` }}>{rating.label}</span>}
                </div>
                <div className="mt-2 flex items-end gap-3">
                  <CountNumber value={northStarView.value} format={northStarView.format} className="text-[#16141d] font-bold tracking-[-0.04em] tabular-nums text-[62px] sm:text-[86px] leading-[0.88]" />
                  {northStarView.suffix && <span className="text-[#c4c2cc] font-bold text-[24px] sm:text-[32px] mb-2 sm:mb-3">{northStarView.suffix}</span>}
                  {northStarView.delta != null && <span className="mb-3 sm:mb-4"><Delta value={northStarView.delta} inverse={northStarView.inverse} size="lg" label /></span>}
                </div>
                {northStarView.sub && <p className="mt-2 text-[14px] text-[#8b8894] tabular-nums">{northStarView.sub}</p>}
                {northStarView.rating && (
                  <div className="mt-6 max-w-md">
                    <div className="relative h-1.5 rounded-full bg-black/[0.06]">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000" style={{ width: `${rating.pct}%`, background: rating.color }} />
                      {[['1:1', 16], ['3:1', 42], ['5:1', 72]].map(([mk, left]) => (
                        <span key={mk} className="absolute -top-4 text-[9.5px] text-[#b0aeb8] tabular-nums" style={{ left: `${left}%` }}>{mk}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-[#b0aeb8]">Benchmark: Sunn &gt; 3:1 · Verdensklasse &gt; 5:1</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 rounded-3xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-6 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5 mb-4"><Gauge className="w-3.5 h-3.5 text-[#c4c2cc]" /> Enhetsøkonomi</p>
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                  <MiniStat label="LTV" fn={1} value={fmtKr(hero.ltv?.value)} suffix="kr" sub={hero.ltv?.basis === 'recurring' ? 'løpende' : 'kontrakt'} />
                  <MiniStat label="CAC" fn={2} value={fmtKr(hero.cac?.value)} suffix="kr" />
                  <MiniStat label="Payback" fn={5} value={m.paybackMonths?.value != null ? fmtNum(m.paybackMonths.value) : '—'} suffix="mnd" />
                  <MiniStat label="ROAS (ekte)" fn={4} value={fmtRatio(m.roasTrue?.value)} suffix="x" />
                </div>
              </div>
            </div>
          </Reveal>

          {err && <div className="mb-4 text-[13px] text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-2.5 flex items-center gap-2"><Info className="w-4 h-4" />{err}</div>}

          {/* Hero-grid */}
          <Reveal delay={140}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard testid="kpi-cpl" icon={Wallet} label="Kost per lead" fn={3} value={hero.cpl?.value} format={fmtKrFull} suffix="kr" inverse sub="Annonseforbruk ÷ nye leads" />
              <KpiCard testid="kpi-cac" icon={Wallet} label="Kost per kunde" fn={2} value={hero.cac?.value} format={fmtKrFull} suffix="kr" inverse sub="Annonseforbruk ÷ nye kunder" />
              <KpiCard testid="kpi-avgvalue" icon={Users} label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKrFull} suffix="kr" sub={hero.avgCustomerValue?.missingValue > 0
                ? `${fmtNum(hero.avgCustomerValue?.basedOn)} av ${fmtNum(m.totalCustomers?.value)} kunder har registrert verdi`
                : `${fmtNum(m.totalCustomers?.value)} kunder totalt`} />
              <KpiCard testid="kpi-ttw" icon={Clock} label="Tid til kunde" value={hero.timeToWin?.value} format={fmtNum} suffix="dager" inverse sub="Snitt fra lead til signert" />
              <KpiCard testid="kpi-conv" icon={Activity} label="Konverteringsrate" value={hero.conversionRate?.value} format={fmtNum} suffix="%" delta={hero.conversionRate?.delta} sub="Leads → kunder" />
              <KpiCard testid="kpi-newcust" icon={TrendingUp} label="Nye kunder" value={m.newCustomers?.value} format={fmtNum} delta={m.newCustomers?.delta} sub={`av ${fmtNum(m.newLeads?.value)} nye leads`} spark={data?.series?.revenue} sparkColor={EMER} />
            </div>
          </Reveal>

          {/* Vekstgraf + trakt */}
          <Reveal delay={240}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div className="lg:col-span-2 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894]">{chartMode === 'revenue' ? 'Omsetning (kumulativ)' : chartMode === 'monthly' ? 'Vekst måned for måned (12 mnd)' : 'Nye leads (daglig)'}</p>
                    <p className="mt-1 text-[#16141d] font-bold text-[26px] leading-none tracking-[-0.02em] tabular-nums">
                      {chartMode === 'revenue' ? `${fmtKrFull(m.revenue?.value)} kr` : chartMode === 'monthly' ? `${fmtNum((data?.series?.monthly || []).reduce((s, x) => s + (x.leads || 0), 0))} leads · ${fmtNum((data?.series?.monthly || []).reduce((s, x) => s + (x.customers || 0), 0))} kunder` : `${fmtNum(m.newLeads?.value)}`}
                      {chartMode === 'revenue' && m.revenue?.delta != null && <span className="ml-2 align-middle"><Delta value={m.revenue.delta} /></span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5">
                    <button onClick={() => setChartMode('monthly')} data-testid="kpi-chart-monthly" className={`px-3 h-7 rounded-full text-[11.5px] font-semibold transition-all ${chartMode === 'monthly' ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894]'}`}>12 mnd</button>
                    <button onClick={() => setChartMode('revenue')} className={`px-3 h-7 rounded-full text-[11.5px] font-semibold transition-all ${chartMode === 'revenue' ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894]'}`}>Omsetning</button>
                    <button onClick={() => setChartMode('leads')} className={`px-3 h-7 rounded-full text-[11.5px] font-semibold transition-all ${chartMode === 'leads' ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894]'}`}>Leads</button>
                  </div>
                </div>
                <div className="mt-4">
                  {chartMode === 'monthly' ? (
                    <MonthlyBars data={data?.series?.monthly || []} height={200} />
                  ) : (
                    <>
                      <AreaChart data={chartData} color={chartMode === 'revenue' ? EMER : VIOLET} height={200} />
                      <div className="flex justify-between text-[10.5px] text-[#b8b6c0] mt-2 tabular-nums">
                        <span>{chartData[0]?.day || ''}</span>
                        <span>{chartData[chartData.length - 1]?.day || ''}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-4">Konverteringstrakt</p>
                <Funnel funnel={data?.funnel || []} />
              </div>
            </div>
          </Reveal>

          {/* Run-rate (kun løpende LTV) + sekundær-strip */}
          <Reveal delay={320}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              {data?.platform ? (
                <div data-testid="kpi-platform-mrr" className="rounded-2xl p-5 sm:p-6 relative overflow-hidden border border-emerald-100 shadow-[0_1px_2px_rgba(22,20,29,0.04)]" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 62%)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] flex items-center gap-1.5" style={{ color: EMER_TEXT }}><Zap className="w-3.5 h-3.5" /> MRR — live fra plattformen</p>
                  <p className="mt-3 text-[#16141d] font-bold text-[40px] leading-none tracking-[-0.03em] tabular-nums"><CountNumber value={data.platform.mrr} format={fmtKrFull} /> <span className="text-[#a5a3af] text-[18px] font-semibold">kr/mnd</span></p>
                  <p className="mt-2 text-[12.5px] text-[#8b8894] tabular-nums">ARR-run-rate {fmtKrFull(data.platform.arr)} kr · {fmtNum(data.platform.customers)} aktive kunder · {data.platform.source === 'platform' ? 'synket fra driftsplattformen' : 'beregnet fra kontrakter'}</p>
                </div>
              ) : data?.runRate ? (
                <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden border border-emerald-100 shadow-[0_1px_2px_rgba(22,20,29,0.04)]" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 62%)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] flex items-center gap-1.5" style={{ color: EMER_TEXT }}><Zap className="w-3.5 h-3.5" /> Run-rate (ARR)</p>
                  <p className="mt-3 text-[#16141d] font-bold text-[40px] leading-none tracking-[-0.03em] tabular-nums"><CountNumber value={data.runRate.arr} format={fmtKrFull} /> <span className="text-[#a5a3af] text-[18px] font-semibold">kr</span></p>
                  <p className="mt-2 text-[12.5px] text-[#8b8894] tabular-nums">MRR {fmtKrFull(data.runRate.mrr)} kr · {fmtNum(data.runRate.activeCustomers)} kunder × {fmtKrFull(data.runRate.monthlyFee)} kr/mnd</p>
                </div>
              ) : (
                <KpiCard testid="kpi-totalrev" icon={Wallet} label="Total omsetning" value={m.totalRevenueAllTime?.value} format={fmtKrFull} suffix="kr" sub="all tid · sporet + historisk" />
              )}
              <KpiCard testid="kpi-spend" icon={Wallet} label="Annonseforbruk" value={m.spend?.total} format={fmtKrFull} suffix="kr" inverse sub={`Google ${fmtKr(m.spend?.google)} · Meta ${fmtKr(m.spend?.meta)}`} />
              <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6 grid grid-cols-2 gap-4">
                <MiniStat label="Nye leads" value={fmtNum(m.newLeads?.value)} sub={m.newLeads?.delta != null ? `${m.newLeads.delta > 0 ? '+' : ''}${m.newLeads.delta} % vs forrige periode` : ''} />
                <MiniStat label="Total kunder" value={fmtNum(m.totalCustomers?.value)} sub={m.totalCustomers?.historical ? `+${fmtNum(m.totalCustomers.historical)} hist.` : 'sporet'} />
                <MiniStat label="Responstid" value={m.responseHours?.value != null ? fmtNum(m.responseHours.value) : '—'} suffix="t" sub={m.responseHours?.sla24hPct != null ? `${m.responseHours.sla24hPct} % <24 t` : ''} />
                <MiniStat label="ROAS" fn={4} value={fmtRatio(m.roasTrue?.value)} suffix="x" sub="omsetn. ÷ forbruk" />
              </div>
            </div>
          </Reveal>

          {/* Pipeline + kanaler + etterspørsel */}
          <Reveal delay={380}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <PipelineCard pipeline={m.pipeline || []} pv={data?.pipelineValue} />
              <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6" data-testid="kpi-channels">
                <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] mb-4">Leads per kanal <span className="normal-case tracking-normal text-[#c4c2cc]">· {data?.period?.label || ''}</span></p>
                <ChannelBars channels={data?.channels || []} />
              </div>
              <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] p-5 sm:p-6 flex flex-col justify-between" data-testid="kpi-demand">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8b8894] flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-[#c4c2cc]" /> Etterspørsel · leietakere</p>
                  <div className="mt-3 flex items-end gap-1.5">
                    <CountNumber value={m.newTenantLeads?.value} format={fmtNum} className="font-bold tracking-[-0.03em] text-[#16141d] tabular-nums text-[38px] leading-none" />
                    {m.newTenantLeads?.delta != null && <span className="mb-1"><Delta value={m.newTenantLeads.delta} /></span>}
                  </div>
                  <p className="mt-1.5 text-[12.5px] text-[#a5a3af]">boligsøkere i perioden</p>
                </div>
                <p className="mt-4 pt-4 border-t border-black/[0.05] text-[11.5px] text-[#a5a3af] leading-relaxed">Etterspørselssiden av markedsplassen — leietakerkø gjør boligene raskere utleid, men telles ikke i CAC/LTV.</p>
              </div>
            </div>
          </Reveal>

          {/* Definisjoner / fotnoter */}
          <Reveal delay={440}>
            <Definitions generatedAt={data?.generatedAt} />
          </Reveal>
        </div>
      )}

      {settingsOpen && <LtvSettingsModal apiKey={apiKey} current={data?.ltvModel} onClose={() => setSettingsOpen(false)} onSaved={() => { setSettingsOpen(false); load(); }} />}
    </div>
  );
}

function LtvSettingsModal({ apiKey, current, onClose, onSaved }) {
  const [mode, setMode] = useState(current?.ltvMode || 'contract');
  const [monthlyFee, setMonthlyFee] = useState(current?.monthlyFee ?? '');
  const [lifetimeMonths, setLifetimeMonths] = useState(current?.lifetimeMonths ?? '');
  const [northStar, setNorthStar] = useState(current?.northStar || 'ltv_cac');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`/api/admin/kpi/settings?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ltvMode: mode, monthlyFee: monthlyFee === '' ? null : Number(monthlyFee), lifetimeMonths: lifetimeMonths === '' ? null : Number(lifetimeMonths), northStar }),
      });
      onSaved();
    } catch (e) { setSaving(false); }
  };
  const preview = mode === 'recurring' && Number(monthlyFee) > 0 && Number(lifetimeMonths) > 0 ? Number(monthlyFee) * Number(lifetimeMonths) : null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white border border-black/[0.07] p-6 shadow-[0_24px_80px_rgba(22,20,29,0.25)]">
        <div className="flex items-center justify-between">
          <h3 className="text-[#16141d] text-[17px] font-bold tracking-[-0.01em]">LTV-modell & North Star</h3>
          <button onClick={onClose} className="text-[#a5a3af] hover:text-[#16141d]"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-[#8b8894] text-[12.5px] mt-1.5">Ingen tall fabrikkeres — løpende LTV krever dine tall.</p>
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('contract')} className={`rounded-xl px-3 py-3 text-left border transition-colors ${mode === 'contract' ? 'border-[#7c5cf0] bg-[#7c5cf0]/[0.06]' : 'border-black/[0.08] hover:border-black/[0.18]'}`}>
              <p className="text-[#16141d] text-[13px] font-semibold flex items-center gap-1.5">{mode === 'contract' && <Check className="w-3.5 h-3.5" style={{ color: VIOLET }} />}Kontraktsverdi</p>
              <p className="text-[#8b8894] text-[11.5px] mt-0.5">Faktisk verdi fra data</p>
            </button>
            <button onClick={() => setMode('recurring')} className={`rounded-xl px-3 py-3 text-left border transition-colors ${mode === 'recurring' ? 'border-[#7c5cf0] bg-[#7c5cf0]/[0.06]' : 'border-black/[0.08] hover:border-black/[0.18]'}`}>
              <p className="text-[#16141d] text-[13px] font-semibold flex items-center gap-1.5">{mode === 'recurring' && <Check className="w-3.5 h-3.5" style={{ color: VIOLET }} />}Løpende LTV</p>
              <p className="text-[#8b8894] text-[11.5px] mt-0.5">Honorar × levetid</p>
            </button>
          </div>
          {mode === 'recurring' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">Månedshonorar (kr)</label>
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="f.eks. 1500" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] placeholder:text-[#c4c2cc] outline-none focus:border-[#7c5cf0] text-[14px] tabular-nums" />
              </div>
              <div>
                <label className="text-[#67646f] text-[11px] font-semibold uppercase tracking-[0.08em]">Levetid (mnd)</label>
                <input type="number" value={lifetimeMonths} onChange={(e) => setLifetimeMonths(e.target.value)} placeholder="f.eks. 36" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white border border-black/[0.12] text-[#16141d] placeholder:text-[#c4c2cc] outline-none focus:border-[#7c5cf0] text-[14px] tabular-nums" />
              </div>
              {preview != null && <p className="col-span-2 text-[12.5px] rounded-lg px-3 py-2 flex items-center gap-2 bg-emerald-50" style={{ color: EMER_TEXT }}><Zap className="w-3.5 h-3.5" /> Beregnet LTV: <b>{fmtKrFull(preview)} kr</b> · ARR-run-rate aktiveres</p>}
            </div>
          )}
          <div className="pt-2">
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
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl font-semibold text-[14px] text-white grid place-items-center disabled:opacity-60 bg-[#16141d] hover:bg-[#2a2733] transition-colors">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lagre'}</button>
        </div>
      </div>
    </div>
  );
}

function PresentationMode({ data, northStarView, hero, m, rating, chartData, period, setPeriod, periods, onExit }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: 'linear-gradient(160deg, #fbfaff 0%, #f7f6f4 55%, #f3f0fa 100%)' }}>
      <style>{`@keyframes kpiPulseP { 0%,100%{opacity:.45} 50%{opacity:1} }`}</style>
      <div className="min-h-screen flex flex-col px-6 sm:px-16 py-9">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: VIOLET, animation: 'kpiPulseP 2.4s ease-in-out infinite' }} />
          <span className="text-[#16141d] text-[18px] font-bold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome</span>
          <span className="text-[#8b8894] text-[13px]">· Nøkkeltall · {data?.period?.label}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full bg-black/[0.04] p-0.5">
              {periods.map((p) => (
                <button key={p.k} onClick={() => setPeriod(p.k)} className={`px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${period === p.k ? 'bg-white text-[#16141d] shadow-[0_1px_4px_rgba(22,20,29,0.12)]' : 'text-[#8b8894] hover:text-[#16141d]'}`}>{p.l}</button>
              ))}
            </div>
            <button onClick={onExit} className="h-9 pl-3 pr-3.5 rounded-full bg-[#16141d] text-white hover:bg-[#2a2733] text-[13px] font-semibold flex items-center gap-1.5 transition-colors"><Minimize2 className="w-4 h-4" /> Lukk</button>
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
          <div className="lg:col-span-2 rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] px-6 py-6">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8b8894]">Vekst · siste 12 måneder</p>
              {data?.platform && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 font-semibold px-2.5 py-1 text-[12px]" style={{ color: EMER_TEXT }}><Zap className="w-3 h-3" /> MRR live: {fmtKrFull(data.platform.mrr)} kr</span>}
            </div>
            <div className="mt-4"><MonthlyBars data={data?.series?.monthly || []} height={150} /></div>
          </div>
          <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] px-6 py-6">
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
    <div className="rounded-2xl bg-white border border-black/[0.06] shadow-[0_1px_2px_rgba(22,20,29,0.04)] px-6 py-7 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#8b8894]">{label}</p>
      <div className="mt-3 flex items-end justify-center gap-1.5">
        <CountNumber value={value} format={format} className="text-[#16141d] font-bold tracking-[-0.03em] tabular-nums text-[42px] sm:text-[56px] leading-none" />
        {suffix && <span className="text-[#a5a3af] font-semibold text-[18px] sm:text-[22px] mb-1.5">{suffix}</span>}
      </div>
      {delta != null && <div className="mt-2 flex justify-center"><Delta value={delta} /></div>}
    </div>
  );
}
