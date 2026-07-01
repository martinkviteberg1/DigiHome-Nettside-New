'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Loader2, TrendingUp, TrendingDown, Sliders, Maximize2, Minimize2,
  RefreshCw, Zap, X, Check, Info, Gauge, Activity, Users, Clock, Wallet,
} from 'lucide-react';

const PERIODS = [
  { k: '7', l: '7 d', days: 7 },
  { k: '30', l: '30 d', days: 30 },
  { k: '90', l: '90 d', days: 90 },
  { k: '365', l: 'I år', days: 365 },
  { k: 'all', l: 'Alle', days: 3650 },
];

const ACCENT = '#cf97fc';
const EMER = '#34d399';

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
      transform: show ? 'none' : 'translateY(18px)',
      transition: 'opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1)',
    }}>{children}</div>
  );
}

// --- Delta-chip ---
function Delta({ value, inverse = false, size = 'sm' }) {
  if (value == null) return null;
  const positive = inverse ? value < 0 : value > 0;
  const color = value === 0 ? 'text-white/40 bg-white/[0.06]' : positive ? 'text-emerald-300 bg-emerald-400/10' : 'text-rose-300 bg-rose-400/10';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
  const pad = size === 'lg' ? 'px-2.5 py-1 text-[12.5px]' : 'px-2 py-0.5 text-[11px]';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold ${pad} ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}{Math.abs(value)}%
    </span>
  );
}

// --- Sparkline ---
function Sparkline({ data = [], color = ACCENT, height = 36 }) {
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
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
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
  if (vals.length < 2) return <div style={{ height }} className="grid place-items-center text-white/25 text-[13px]">Ikke nok data i perioden</div>;
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
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" />
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last.x} cy={last.y} r="4" fill={color} />
      <circle cx={last.x} cy={last.y} r="9" fill={color} fillOpacity="0.18" />
    </svg>
  );
}

// --- LTV:CAC helsevurdering ---
function ratingFor(ratio) {
  if (ratio == null) return { label: '—', color: '#94a3b8', pct: 0 };
  if (ratio >= 5) return { label: 'Verdensklasse', color: EMER, pct: 100 };
  if (ratio >= 3) return { label: 'Sunn', color: '#a3e635', pct: 72 };
  if (ratio >= 1) return { label: 'OK', color: '#fbbf24', pct: 42 };
  return { label: 'Under press', color: '#fb7185', pct: 16 };
}

// --- KPI-kort ---
function KpiCard({ label, value, format = fmtNum, suffix, delta, inverse, spark, sparkColor, sub, icon: Icon, testid }) {
  return (
    <div data-testid={testid} className="group relative rounded-2xl bg-white/[0.035] hover:bg-white/[0.06] transition-all duration-300 p-5 sm:p-6 overflow-hidden hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45 flex items-center gap-1.5">
          {Icon && <Icon className="w-3.5 h-3.5 text-white/30" />}{label}
        </p>
        {delta != null && <Delta value={delta} inverse={inverse} />}
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <CountNumber value={value} format={format} className="font-bold tracking-[-0.03em] text-white tabular-nums text-[30px] sm:text-[38px] leading-none" />
        {suffix && <span className="font-semibold text-white/40 text-[15px] mb-1">{suffix}</span>}
      </div>
      {sub && <p className="mt-1.5 text-[12.5px] text-white/40">{sub}</p>}
      {spark && spark.length > 0 && <div className="mt-4 -mx-1"><Sparkline data={spark} color={sparkColor || ACCENT} height={34} /></div>}
    </div>
  );
}

function MiniStat({ label, value, suffix, sub }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/35">{label}</p>
      <p className="mt-1.5 text-white font-bold text-[24px] leading-none tracking-[-0.02em] tabular-nums">{value}{suffix && <span className="text-white/40 text-[14px] font-semibold ml-1">{suffix}</span>}</p>
      {sub && <p className="mt-1 text-[11.5px] text-white/35">{sub}</p>}
    </div>
  );
}

// --- Konverteringstrakt ---
function Funnel({ funnel = [] }) {
  const top = funnel[0]?.count || 1;
  const colors = [ACCENT, '#8b5cf6', '#60a5fa', EMER];
  return (
    <div className="space-y-2.5">
      {funnel.map((f, i) => {
        const w = Math.max(6, (f.count / top) * 100);
        return (
          <div key={f.stage}>
            <div className="flex items-center justify-between text-[12px] mb-1">
              <span className="text-white/60 font-medium">{f.label}</span>
              <span className="text-white/40 tabular-nums">{fmtNum(f.count)} · {f.pctOfTop}%{i > 0 && <span className="text-white/30"> · steg {f.stepConv}%</span>}</span>
            </div>
            <div className="h-8 rounded-lg bg-white/[0.04] overflow-hidden">
              <div className="h-full rounded-lg transition-all duration-700 ease-out" style={{ width: `${w}%`, background: `linear-gradient(90deg, ${colors[i % colors.length]}cc, ${colors[i % colors.length]}66)` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

class KpiErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) return (
      <div className="rounded-3xl bg-[#0e0d13] p-8 text-white">
        <p className="text-rose-300 font-bold text-lg">Nøkkeltall-feil</p>
        <pre className="mt-3 text-[12px] text-white/70 whitespace-pre-wrap break-words">{String(this.state.error?.message || this.state.error)}</pre>
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
    return <PresentationMode data={data} northStarView={northStarView} hero={hero} m={m} rating={rating}
      chartData={data?.series?.cumulativeRevenue || []} period={period} setPeriod={setPeriod} periods={PERIODS} onExit={() => setPresent(false)} />;
  }

  return (
    <div className="relative rounded-[28px] overflow-hidden shadow-[0_30px_90px_rgba(8,8,14,0.55)]" style={{ background: 'radial-gradient(130% 130% at 12% -5%, #1a1622 0%, #0c0b11 52%, #08070b 100%)' }}>
      <style>{`
        @keyframes kpiDriftA { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(40px,30px) scale(1.12)} }
        @keyframes kpiDriftB { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-50px,20px) scale(1.08)} }
        @keyframes kpiPulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>
      {/* Ambient aurora */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 68%)`, animation: 'kpiDriftA 16s ease-in-out infinite' }} />
        <div className="absolute -bottom-40 right-0 h-[380px] w-[380px] rounded-full blur-3xl" style={{ background: `radial-gradient(circle, ${EMER}14 0%, transparent 70%)`, animation: 'kpiDriftB 20s ease-in-out infinite' }} />
      </div>

      {/* Topplinje */}
      <div className="relative flex flex-wrap items-center gap-3 px-5 sm:px-8 pt-6 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full" style={{ background: ACCENT, animation: 'kpiPulse 2.4s ease-in-out infinite' }} />
          <h2 className="text-white text-[20px] sm:text-[22px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Nøkkeltall</h2>
          <span className="text-white/30 text-[13px] hidden sm:inline">· {data?.period?.label || ''}</span>
          {data?.configured && !data.configured.ads && <span className="text-[10.5px] text-amber-300/80 bg-amber-400/10 rounded-full px-2 py-0.5">annonsedata utilgjengelig</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`kpi-period-${p.k}`}
                className={`px-2.5 sm:px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${period === p.k ? 'bg-white text-[#0a0a0a]' : 'text-white/55 hover:text-white'}`}>{p.l}</button>
            ))}
          </div>
          <button onClick={() => setSettingsOpen(true)} title="LTV-modell" data-testid="kpi-settings-btn" className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white grid place-items-center transition-colors"><Sliders className="w-4 h-4" /></button>
          <button onClick={load} title="Oppdater" className="h-8 w-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white grid place-items-center transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setPresent(true)} data-testid="kpi-present-btn" className="h-8 pl-3 pr-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 text-[#0a0a0a] hover:brightness-105 transition-all" style={{ background: ACCENT }}><Maximize2 className="w-3.5 h-3.5" /> Presentasjon</button>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-[460px] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} /></div>
      ) : (
        <div className="relative px-5 sm:px-8 pb-8">
          {/* NORTH STAR + Enhetsøkonomi */}
          <Reveal delay={40}>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-2 mb-4">
              <div className="lg:col-span-3 relative rounded-3xl overflow-hidden px-6 sm:px-9 py-8 sm:py-9" style={{ background: 'linear-gradient(135deg, rgba(207,151,252,0.16) 0%, rgba(207,151,252,0.02) 62%)' }}>
                <div aria-hidden className="pointer-events-none absolute -top-20 -right-8 h-64 w-64 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${ACCENT}30 0%, transparent 70%)` }} />
                <div className="flex items-center gap-2">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.17em]" style={{ color: ACCENT }}>{northStarView.label}</p>
                  {northStarView.rating && <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ color: rating.color, background: `${rating.color}1a` }}>{rating.label}</span>}
                </div>
                <div className="mt-2 flex items-end gap-3">
                  <CountNumber value={northStarView.value} format={northStarView.format} className="text-white font-bold tracking-[-0.04em] tabular-nums text-[62px] sm:text-[86px] leading-[0.88]" />
                  {northStarView.suffix && <span className="text-white/40 font-bold text-[24px] sm:text-[32px] mb-2 sm:mb-3">{northStarView.suffix}</span>}
                  {northStarView.delta != null && <span className="mb-3 sm:mb-4"><Delta value={northStarView.delta} inverse={northStarView.inverse} size="lg" /></span>}
                </div>
                {northStarView.sub && <p className="mt-2 text-[14px] text-white/50">{northStarView.sub}</p>}
                {northStarView.rating && (
                  <div className="mt-6 max-w-md">
                    <div className="relative h-1.5 rounded-full bg-white/[0.08]">
                      <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000" style={{ width: `${rating.pct}%`, background: rating.color }} />
                      {[['1:1', 16], ['3:1', 42], ['5:1', 72]].map(([mk, left]) => (
                        <span key={mk} className="absolute -top-4 text-[9.5px] text-white/30" style={{ left: `${left}%` }}>{mk}</span>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-white/30">Benchmark: Sunn &gt; 3:1 · Verdensklasse &gt; 5:1</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 rounded-3xl bg-white/[0.035] p-6 flex flex-col justify-center">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45 flex items-center gap-1.5 mb-4"><Gauge className="w-3.5 h-3.5" /> Enhetsøkonomi</p>
                <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                  <MiniStat label="LTV" value={fmtKr(hero.ltv?.value)} suffix="kr" sub={hero.ltv?.basis === 'recurring' ? 'løpende' : 'kontrakt'} />
                  <MiniStat label="CAC" value={fmtKr(hero.cac?.value)} suffix="kr" />
                  <MiniStat label="Payback" value={m.paybackMonths?.value != null ? fmtNum(m.paybackMonths.value) : '—'} suffix="mnd" />
                  <MiniStat label="ROAS (ekte)" value={fmtRatio(m.roasTrue?.value)} suffix="x" />
                </div>
              </div>
            </div>
          </Reveal>

          {err && <div className="mb-4 text-[13px] text-rose-300 bg-rose-400/10 rounded-xl px-4 py-2.5 flex items-center gap-2"><Info className="w-4 h-4" />{err}</div>}

          {/* Hero-grid */}
          <Reveal delay={140}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              <KpiCard testid="kpi-cpl" icon={Wallet} label="Kost per lead" value={hero.cpl?.value} format={fmtKrFull} suffix="kr" inverse sub="Annonseforbruk ÷ nye leads" />
              <KpiCard testid="kpi-cac" icon={Wallet} label="Kost per kunde" value={hero.cac?.value} format={fmtKrFull} suffix="kr" inverse sub="Annonseforbruk ÷ nye kunder" />
              <KpiCard testid="kpi-avgvalue" icon={Users} label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKrFull} suffix="kr" sub={`${fmtNum(m.totalCustomers?.value)} kunder totalt`} />
              <KpiCard testid="kpi-ttw" icon={Clock} label="Tid til kunde" value={hero.timeToWin?.value} format={fmtNum} suffix="dager" inverse sub="Snitt fra lead til signert" />
              <KpiCard testid="kpi-conv" icon={Activity} label="Konverteringsrate" value={hero.conversionRate?.value} format={fmtNum} suffix="%" delta={hero.conversionRate?.delta} sub="Leads → kunder" />
              <KpiCard testid="kpi-newcust" icon={TrendingUp} label="Nye kunder" value={m.newCustomers?.value} format={fmtNum} delta={m.newCustomers?.delta} sub={`av ${fmtNum(m.newLeads?.value)} nye leads`} spark={data?.series?.revenue} sparkColor={EMER} />
            </div>
          </Reveal>

          {/* Vekstgraf + trakt */}
          <Reveal delay={240}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              <div className="lg:col-span-2 rounded-2xl bg-white/[0.035] p-5 sm:p-6">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45">{chartMode === 'revenue' ? 'Omsetning (kumulativ)' : 'Nye leads (daglig)'}</p>
                    <p className="mt-1 text-white font-bold text-[26px] leading-none tracking-[-0.02em] tabular-nums">
                      {chartMode === 'revenue' ? `${fmtKrFull(m.revenue?.value)} kr` : `${fmtNum(m.newLeads?.value)}`}
                      {chartMode === 'revenue' && m.revenue?.delta != null && <span className="ml-2 align-middle"><Delta value={m.revenue.delta} /></span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
                    <button onClick={() => setChartMode('revenue')} className={`px-3 h-7 rounded-full text-[11.5px] font-semibold transition-all ${chartMode === 'revenue' ? 'bg-white text-[#0a0a0a]' : 'text-white/55'}`}>Omsetning</button>
                    <button onClick={() => setChartMode('leads')} className={`px-3 h-7 rounded-full text-[11.5px] font-semibold transition-all ${chartMode === 'leads' ? 'bg-white text-[#0a0a0a]' : 'text-white/55'}`}>Leads</button>
                  </div>
                </div>
                <div className="mt-4">
                  <AreaChart data={chartData} color={chartMode === 'revenue' ? EMER : ACCENT} height={200} />
                  <div className="flex justify-between text-[10.5px] text-white/25 mt-2">
                    <span>{chartData[0]?.day || ''}</span>
                    <span>{chartData[chartData.length - 1]?.day || ''}</span>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl bg-white/[0.035] p-5 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/45 mb-4">Konverteringstrakt</p>
                <Funnel funnel={data?.funnel || []} />
              </div>
            </div>
          </Reveal>

          {/* Run-rate (kun løpende LTV) + sekundær-strip */}
          <Reveal delay={320}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
              {data?.runRate ? (
                <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${EMER}22 0%, ${EMER}05 60%)` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-emerald-200/80 flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Run-rate (ARR)</p>
                  <p className="mt-3 text-white font-bold text-[40px] leading-none tracking-[-0.03em] tabular-nums"><CountNumber value={data.runRate.arr} format={fmtKrFull} /> <span className="text-white/40 text-[18px] font-semibold">kr</span></p>
                  <p className="mt-2 text-[12.5px] text-white/45">MRR {fmtKrFull(data.runRate.mrr)} kr · {fmtNum(data.runRate.activeCustomers)} kunder × {fmtKrFull(data.runRate.monthlyFee)} kr/mnd</p>
                </div>
              ) : (
                <KpiCard testid="kpi-totalrev" icon={Wallet} label="Total omsetning" value={m.totalRevenueAllTime?.value} format={fmtKrFull} suffix="kr" sub="all tid · sporet + historisk" />
              )}
              <KpiCard testid="kpi-spend" icon={Wallet} label="Annonseforbruk" value={m.spend?.total} format={fmtKrFull} suffix="kr" inverse sub={`Google ${fmtKr(m.spend?.google)} · Meta ${fmtKr(m.spend?.meta)}`} />
              <div className="rounded-2xl bg-white/[0.035] p-5 sm:p-6 grid grid-cols-2 gap-4">
                <MiniStat label="Nye leads" value={fmtNum(m.newLeads?.value)} sub={m.newLeads?.delta != null ? `${m.newLeads.delta > 0 ? '+' : ''}${m.newLeads.delta}% vs forrige` : ''} />
                <MiniStat label="Total kunder" value={fmtNum(m.totalCustomers?.value)} sub={m.totalCustomers?.historical ? `+${fmtNum(m.totalCustomers.historical)} hist.` : 'sporet'} />
                <MiniStat label="Responstid" value={m.responseHours?.value != null ? fmtNum(m.responseHours.value) : '—'} suffix="t" sub={m.responseHours?.sla24hPct != null ? `${m.responseHours.sla24hPct}% <24t` : ''} />
                <MiniStat label="ROAS" value={fmtRatio(m.roasTrue?.value)} suffix="x" sub="omsetn. ÷ forbruk" />
              </div>
            </div>
          </Reveal>

          <p className="mt-5 text-[11.5px] text-white/30 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Totaler & snittverdi = helhetsbilde (sporet + historisk). CPL/CAC/ROAS = kun sporet/betalt trafikk. Oppdatert {data?.generatedAt ? new Date(data.generatedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' }) : ''}.
          </p>
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
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e0d13] border border-white/[0.08] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-[17px] font-bold tracking-[-0.01em]">LTV-modell & North Star</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-white/40 text-[12.5px] mt-1.5">Ingen tall fabrikkeres — løpende LTV krever dine tall.</p>
        <div className="mt-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setMode('contract')} className={`rounded-xl px-3 py-3 text-left border transition-colors ${mode === 'contract' ? 'border-[#cf97fc] bg-[#cf97fc]/10' : 'border-white/10 hover:border-white/20'}`}>
              <p className="text-white text-[13px] font-semibold flex items-center gap-1.5">{mode === 'contract' && <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} />}Kontraktsverdi</p>
              <p className="text-white/40 text-[11.5px] mt-0.5">Faktisk verdi fra data</p>
            </button>
            <button onClick={() => setMode('recurring')} className={`rounded-xl px-3 py-3 text-left border transition-colors ${mode === 'recurring' ? 'border-[#cf97fc] bg-[#cf97fc]/10' : 'border-white/10 hover:border-white/20'}`}>
              <p className="text-white text-[13px] font-semibold flex items-center gap-1.5">{mode === 'recurring' && <Check className="w-3.5 h-3.5" style={{ color: ACCENT }} />}Løpende LTV</p>
              <p className="text-white/40 text-[11.5px] mt-0.5">Honorar × levetid</p>
            </button>
          </div>
          {mode === 'recurring' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em]">Månedshonorar (kr)</label>
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="f.eks. 1500" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white/[0.05] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] text-[14px]" />
              </div>
              <div>
                <label className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em]">Levetid (mnd)</label>
                <input type="number" value={lifetimeMonths} onChange={(e) => setLifetimeMonths(e.target.value)} placeholder="f.eks. 36" className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white/[0.05] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] text-[14px]" />
              </div>
              {preview != null && <p className="col-span-2 text-[12.5px] text-emerald-300 bg-emerald-400/10 rounded-lg px-3 py-2 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Beregnet LTV: <b>{fmtKrFull(preview)} kr</b> · ARR-run-rate aktiveres</p>}
            </div>
          )}
          <div className="pt-2">
            <label className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em]">North Star (størst øverst)</label>
            <select value={northStar} onChange={(e) => setNorthStar(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white/[0.05] border border-white/12 text-white outline-none focus:border-[#cf97fc] text-[14px]">
              <option value="ltv_cac">LTV : CAC (anbefalt)</option>
              <option value="new_customers">Nye kunder</option>
              <option value="revenue">Omsetning</option>
              <option value="cac">Kost per kunde</option>
              <option value="avg_value">Snitt kundeverdi</option>
            </select>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button onClick={onClose} className="flex-1 h-11 rounded-xl bg-white/[0.06] text-white/70 font-semibold text-[14px] hover:bg-white/[0.1] transition-colors">Avbryt</button>
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl font-semibold text-[14px] text-[#0a0a0a] grid place-items-center disabled:opacity-60" style={{ background: ACCENT }}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lagre'}</button>
        </div>
      </div>
    </div>
  );
}

function PresentationMode({ data, northStarView, hero, m, rating, chartData, period, setPeriod, periods, onExit }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: 'radial-gradient(120% 100% at 50% -10%, #18131f 0%, #0a090e 58%, #060509 100%)' }}>
      <style>{`@keyframes kpiPulseP { 0%,100%{opacity:.5} 50%{opacity:1} }`}</style>
      <div className="min-h-screen flex flex-col px-6 sm:px-16 py-9">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT, animation: 'kpiPulseP 2.4s ease-in-out infinite' }} />
          <span className="text-white text-[18px] font-bold tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome</span>
          <span className="text-white/40 text-[13px]">· Nøkkeltall · {data?.period?.label}</span>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-0.5 rounded-full bg-white/[0.06] p-0.5">
              {periods.map((p) => (
                <button key={p.k} onClick={() => setPeriod(p.k)} className={`px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${period === p.k ? 'bg-white text-[#0a0a0a]' : 'text-white/55 hover:text-white'}`}>{p.l}</button>
              ))}
            </div>
            <button onClick={onExit} className="h-9 pl-3 pr-3.5 rounded-full bg-white/[0.08] text-white/80 hover:text-white text-[13px] font-semibold flex items-center gap-1.5"><Minimize2 className="w-4 h-4" /> Lukk</button>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <div className="flex items-center gap-3">
            <p className="text-[14px] sm:text-[16px] font-semibold uppercase tracking-[0.22em]" style={{ color: ACCENT }}>{northStarView.label}</p>
            {northStarView.rating && <span className="text-[13px] font-bold rounded-full px-2.5 py-1" style={{ color: rating.color, background: `${rating.color}1a` }}>{rating.label}</span>}
          </div>
          <div className="mt-4 flex items-end justify-center gap-4">
            <CountNumber value={northStarView.value} format={northStarView.format} className="text-white font-bold tracking-[-0.05em] tabular-nums text-[104px] sm:text-[184px] leading-[0.82]" />
            {northStarView.suffix && <span className="text-white/40 font-bold text-[36px] sm:text-[58px] mb-3 sm:mb-6">{northStarView.suffix}</span>}
          </div>
          {northStarView.sub && <p className="mt-3 text-[15px] sm:text-[19px] text-white/50">{northStarView.sub}</p>}
          <div className="mt-8 w-full max-w-3xl opacity-80"><AreaChart data={chartData} color={EMER} height={140} /></div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-6">
          <BigPresent label="Kost per kunde" value={hero.cac?.value} format={fmtKrFull} suffix="kr" />
          <BigPresent label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKrFull} suffix="kr" />
          <BigPresent label="Nye kunder" value={m.newCustomers?.value} format={fmtNum} delta={m.newCustomers?.delta} />
          <BigPresent label="Tid til kunde" value={hero.timeToWin?.value} format={fmtNum} suffix="dager" />
        </div>
      </div>
    </div>
  );
}

function BigPresent({ label, value, format, suffix, delta }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] px-6 py-7 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/40">{label}</p>
      <div className="mt-3 flex items-end justify-center gap-1.5">
        <CountNumber value={value} format={format} className="text-white font-bold tracking-[-0.03em] tabular-nums text-[42px] sm:text-[56px] leading-none" />
        {suffix && <span className="text-white/40 font-semibold text-[18px] sm:text-[22px] mb-1.5">{suffix}</span>}
      </div>
      {delta != null && <div className="mt-2 flex justify-center"><Delta value={delta} /></div>}
    </div>
  );
}
