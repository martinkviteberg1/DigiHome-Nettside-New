'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Loader2, TrendingUp, TrendingDown, Sliders, Maximize2, Minimize2,
  RefreshCw, Zap, X, Check, Info,
} from 'lucide-react';

const PERIODS = [
  { k: '7', l: '7 dager', days: 7 },
  { k: '30', l: '30 dager', days: 30 },
  { k: '90', l: '90 dager', days: 90 },
  { k: '365', l: 'I år', days: 365 },
  { k: 'all', l: 'Alle', days: 3650 },
];

const ACCENT = '#cf97fc';

// --- Formattering (norsk) ---
const nf0 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
function fmtKr(v) {
  if (v == null || !isFinite(v)) return '—';
  if (Math.abs(v) >= 1000000) return `${nf1.format(v / 1000000)} mill`;
  return nf0.format(Math.round(v));
}
function fmtNum(v) { return v == null || !isFinite(v) ? '—' : nf0.format(v); }
function fmtRatio(v) { return v == null || !isFinite(v) ? '—' : `${nf1.format(v)}`; }

// --- Animert opptelling ---
function useCountUp(target, { duration = 950, decimals = 0 } = {}) {
  const [val, setVal] = useState(0);
  const ref = useRef({ raf: 0, from: 0 });
  useEffect(() => {
    const t = Number(target);
    if (!isFinite(t)) { setVal(target); return; }
    const from = ref.current.from || 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = from + (t - from) * eased;
      setVal(cur);
      if (p < 1) ref.current.raf = requestAnimationFrame(tick);
      else ref.current.from = t;
    };
    cancelAnimationFrame(ref.current.raf);
    ref.current.raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current.raf);
  }, [target, duration]);
  return typeof target === 'number' ? val : target;
}

function CountNumber({ value, format = fmtNum, className, decimals = 0 }) {
  const v = useCountUp(value, { decimals });
  if (value == null || value === '—') return <span className={className}>—</span>;
  return <span className={className}>{format(v)}</span>;
}

// --- Delta-chip (grønn opp / rød ned; respekterer inverse) ---
function Delta({ value, inverse = false }) {
  if (value == null) return null;
  const positive = inverse ? value < 0 : value > 0;
  const negative = inverse ? value > 0 : value < 0;
  const color = value === 0 ? 'text-white/40 bg-white/[0.06]' : positive ? 'text-emerald-300 bg-emerald-400/10' : 'text-rose-300 bg-rose-400/10';
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : null;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${color}`}>
      {Icon && <Icon className="w-3 h-3" />}{Math.abs(value)}%
    </span>
  );
}

// --- Sparkline (SVG) ---
function Sparkline({ data = [], color = ACCENT, height = 40, fill = true }) {
  const gid = useMemo(() => `spk-${Math.random().toString(36).slice(2, 8)}`, []);
  const vals = data.map((d) => Number(d.value) || 0);
  const max = Math.max(1, ...vals);
  const w = 100, h = height;
  if (!vals.length) return <div style={{ height }} />;
  const step = vals.length > 1 ? w / (vals.length - 1) : w;
  const pts = vals.map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * (h - 4) - 2).toFixed(2)}`);
  const line = `M ${pts.join(' L ')}`;
  const area = `${line} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${gid})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

// --- KPI-kort ---
function KpiCard({ label, value, format = fmtNum, suffix, delta, inverse, spark, sparkColor, sub, big = false, testid }) {
  return (
    <div data-testid={testid} className="relative rounded-2xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors p-5 sm:p-6 overflow-hidden">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/40">{label}</p>
        {delta != null && <Delta value={delta} inverse={inverse} />}
      </div>
      <div className="mt-3 flex items-end gap-1.5">
        <CountNumber value={value} format={format}
          className={`font-bold tracking-[-0.03em] text-white tabular-nums ${big ? 'text-[44px] sm:text-[56px] leading-[0.95]' : 'text-[30px] sm:text-[36px] leading-none'}`} />
        {suffix && <span className={`font-semibold text-white/45 ${big ? 'text-[20px] mb-1.5' : 'text-[15px] mb-1'}`}>{suffix}</span>}
      </div>
      {sub && <p className="mt-1.5 text-[12.5px] text-white/40">{sub}</p>}
      {spark && spark.length > 0 && <div className="mt-4 -mx-1"><Sparkline data={spark} color={sparkColor || ACCENT} height={big ? 48 : 36} /></div>}
    </div>
  );
}

class KpiErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { try { console.error('KPI render error:', error, info); } catch (_) {} }
  render() {
    if (this.state.error) {
      return (
        <div className="rounded-3xl bg-[#0e0d13] p-8 text-white">
          <p className="text-rose-300 font-bold text-lg">Nøkkeltall-feil (render)</p>
          <pre className="mt-3 text-[12px] text-white/70 whitespace-pre-wrap break-words">{String(this.state.error?.message || this.state.error)}</pre>
          <pre className="mt-2 text-[11px] text-white/40 whitespace-pre-wrap break-words">{String(this.state.error?.stack || '').slice(0, 800)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function KpiDashboard(props) {
  return (
    <KpiErrorBoundary>
      <KpiDashboardInner {...props} />
    </KpiErrorBoundary>
  );
}

function KpiDashboardInner({ apiKey }) {
  const [period, setPeriod] = useState('90');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [present, setPresent] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    const days = (PERIODS.find((p) => p.k === period) || PERIODS[2]).days;
    try {
      const res = await fetch(`/api/admin/kpi?key=${encodeURIComponent(apiKey)}&days=${days}`);
      const j = await res.json();
      if (!j.ok) { setErr(j.error || 'Kunne ikke hente nøkkeltall'); }
      setData(j);
    } catch (e) { setErr('Nettverksfeil'); }
    finally { setLoading(false); }
  }, [apiKey, period]);

  useEffect(() => { load(); }, [load]);

  // ESC lukker presentasjonsmodus
  useEffect(() => {
    if (!present) return;
    const onKey = (e) => { if (e.key === 'Escape') setPresent(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [present]);

  const hero = data?.hero || {};
  const m = data?.metrics || {};
  const northStar = data?.northStar || 'ltv_cac';

  // North Star-oppsett
  const northStarView = useMemo(() => {
    switch (northStar) {
      case 'new_customers': return { label: 'Nye kunder', value: m.newCustomers?.value, format: fmtNum, suffix: '', sub: `Siste periode · ${data?.period?.label || ''}`, delta: m.newCustomers?.delta };
      case 'revenue': return { label: 'Omsetning', value: m.revenue?.value, format: fmtKr, suffix: 'kr', sub: `Tilskrevet i perioden`, delta: m.revenue?.delta };
      case 'cac': return { label: 'Kundeanskaffelseskost', value: hero.cac?.value, format: fmtKr, suffix: 'kr', sub: 'Annonseforbruk per ny kunde', inverse: true };
      case 'avg_value': return { label: 'Snitt kundeverdi', value: hero.avgCustomerValue?.value, format: fmtKr, suffix: 'kr', sub: 'Snitt av alle kunder' };
      default: return {
        label: 'LTV : CAC', value: hero.ltvCac?.value, format: fmtRatio, suffix: ': 1',
        sub: `LTV ${fmtKr(hero.ltvCac?.ltv)} kr · CAC ${fmtKr(hero.ltvCac?.cac)} kr${hero.ltvCac?.ltvBasis === 'recurring' ? ' · løpende' : ''}`,
      };
    }
  }, [northStar, hero, m, data]);

  // ---- Presentasjonsmodus ----
  if (present) {
    return (
      <PresentationMode
        data={data} northStarView={northStarView} hero={hero} m={m}
        period={period} setPeriod={setPeriod} periods={PERIODS}
        onExit={() => setPresent(false)}
      />
    );
  }

  return (
    <div className="rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(10,10,15,0.4)]" style={{ background: 'radial-gradient(120% 120% at 15% 0%, #16131c 0%, #0b0a0f 55%, #08070b 100%)' }}>
      {/* Topplinje */}
      <div className="flex flex-wrap items-center gap-3 px-5 sm:px-8 pt-6 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: ACCENT }} />
          <h2 className="text-white text-[19px] sm:text-[21px] font-bold tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Nøkkeltall</h2>
          {data?.configured && !data.configured.ads && <span className="text-[10.5px] text-amber-300/80 bg-amber-400/10 rounded-full px-2 py-0.5">annonsedata utilgjengelig</span>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-full bg-white/[0.05] p-0.5">
            {PERIODS.map((p) => (
              <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`kpi-period-${p.k}`}
                className={`px-2.5 sm:px-3 h-8 rounded-full text-[12px] font-semibold transition-all ${period === p.k ? 'bg-white text-[#0a0a0a]' : 'text-white/55 hover:text-white'}`}>
                {p.l}
              </button>
            ))}
          </div>
          <button onClick={() => setSettingsOpen(true)} title="LTV-modell" data-testid="kpi-settings-btn"
            className="h-8 w-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white flex items-center justify-center transition-colors"><Sliders className="w-4 h-4" /></button>
          <button onClick={load} title="Oppdater" className="h-8 w-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white flex items-center justify-center transition-colors"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => setPresent(true)} data-testid="kpi-present-btn"
            className="h-8 pl-3 pr-3.5 rounded-full text-[12px] font-semibold flex items-center gap-1.5 transition-all text-[#0a0a0a]" style={{ background: ACCENT }}>
            <Maximize2 className="w-3.5 h-3.5" /> Presentasjon
          </button>
        </div>
      </div>

      {loading && !data ? (
        <div className="h-[420px] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: ACCENT }} /></div>
      ) : (
        <div className="px-5 sm:px-8 pb-8">
          {/* North Star */}
          <div className="relative mt-2 mb-6 rounded-3xl overflow-hidden px-6 sm:px-10 py-8 sm:py-10" style={{ background: 'linear-gradient(135deg, rgba(207,151,252,0.14) 0%, rgba(207,151,252,0.02) 60%)' }}>
            <div aria-hidden className="pointer-events-none absolute -top-24 -right-10 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${ACCENT}33 0%, transparent 70%)` }} />
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em]" style={{ color: ACCENT }}>{northStarView.label}</p>
            <div className="mt-2 flex items-end gap-3">
              <CountNumber value={northStarView.value} format={northStarView.format}
                className="text-white font-bold tracking-[-0.04em] tabular-nums text-[64px] sm:text-[92px] leading-[0.9]" />
              {northStarView.suffix && <span className="text-white/45 font-bold text-[26px] sm:text-[34px] mb-2 sm:mb-3">{northStarView.suffix}</span>}
              {northStarView.delta != null && <span className="mb-3 sm:mb-4"><Delta value={northStarView.delta} inverse={northStarView.inverse} /></span>}
            </div>
            {northStarView.sub && <p className="mt-2 text-[14px] text-white/50">{northStarView.sub}</p>}
          </div>

          {err && <div className="mb-4 text-[13px] text-rose-300 bg-rose-400/10 rounded-xl px-4 py-2.5 flex items-center gap-2"><Info className="w-4 h-4" />{err}</div>}

          {/* Hero-grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <KpiCard testid="kpi-cpl" label="Kost per lead" value={hero.cpl?.value} format={fmtKr} suffix="kr" inverse sub="Annonseforbruk ÷ nye leads" />
            <KpiCard testid="kpi-cac" label="Kost per kunde" value={hero.cac?.value} format={fmtKr} suffix="kr" inverse sub="Annonseforbruk ÷ nye kunder" />
            <KpiCard testid="kpi-avgvalue" label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKr} suffix="kr" sub={`${fmtNum(m.totalCustomers?.value)} kunder totalt`} />
            <KpiCard testid="kpi-ttw" label="Tid til kunde" value={hero.timeToWin?.value} format={fmtNum} suffix="dager" inverse sub="Snitt fra lead til signert" />
            <KpiCard testid="kpi-conv" label="Konverteringsrate" value={hero.conversionRate?.value} format={fmtNum} suffix="%" delta={hero.conversionRate?.delta} sub="Leads → kunder" />
            <KpiCard testid="kpi-newcust" label="Nye kunder" value={m.newCustomers?.value} format={fmtNum} delta={m.newCustomers?.delta} sub={`av ${fmtNum(m.newLeads?.value)} nye leads`} spark={data?.series?.revenue} sparkColor="#34d399" />
          </div>

          {/* Sekundær-strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <KpiCard testid="kpi-leads" label="Nye leads" value={m.newLeads?.value} format={fmtNum} delta={m.newLeads?.delta} spark={data?.series?.leads} />
            <KpiCard testid="kpi-revenue" label="Omsetning (periode)" value={m.revenue?.value} format={fmtKr} suffix="kr" delta={m.revenue?.delta} />
            <KpiCard testid="kpi-spend" label="Annonseforbruk" value={m.spend?.total} format={fmtKr} suffix="kr" inverse sub={`Google ${fmtKr(m.spend?.google)} · Meta ${fmtKr(m.spend?.meta)}`} />
            <KpiCard testid="kpi-roas" label="ROAS (ekte)" value={m.roasTrue?.value} format={fmtRatio} suffix="x" sub="Omsetning ÷ forbruk" />
          </div>

          {/* Pipeline + support */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mt-3 sm:mt-4">
            <div className="lg:col-span-2 rounded-2xl bg-white/[0.03] p-5 sm:p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-white/40 mb-4">Pipeline</p>
              <PipelineBar pipeline={m.pipeline || []} />
            </div>
            <div className="rounded-2xl bg-white/[0.03] p-5 sm:p-6 grid grid-cols-2 gap-4">
              <MiniStat label="Total kunder" value={fmtNum(m.totalCustomers?.value)} sub={m.totalCustomers?.historical ? `+${fmtNum(m.totalCustomers.historical)} historisk` : 'sporet'} />
              <MiniStat label="Total omsetning" value={fmtKr(m.totalRevenueAllTime?.value)} suffix="kr" sub="all tid" />
              <MiniStat label="Responstid" value={m.responseHours?.value != null ? fmtNum(m.responseHours.value) : '—'} suffix="t" sub={m.responseHours?.sla24hPct != null ? `${m.responseHours.sla24hPct}% <24t` : ''} />
              <MiniStat label="Payback" value={m.paybackMonths?.value != null ? fmtNum(m.paybackMonths.value) : '—'} suffix="mnd" sub="tjene inn CAC" />
            </div>
          </div>

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

function MiniStat({ label, value, suffix, sub }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/35">{label}</p>
      <p className="mt-1.5 text-white font-bold text-[24px] leading-none tracking-[-0.02em] tabular-nums">{value}{suffix && <span className="text-white/40 text-[14px] font-semibold ml-1">{suffix}</span>}</p>
      {sub && <p className="mt-1 text-[11.5px] text-white/35">{sub}</p>}
    </div>
  );
}

function PipelineBar({ pipeline }) {
  const total = pipeline.reduce((s, p) => s + (p.count || 0), 0) || 1;
  const colors = { new: '#94a3b8', contacted: '#60a5fa', qualified: '#a78bfa', won: '#34d399', lost: '#f87171' };
  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden bg-white/[0.05]">
        {pipeline.map((p) => (
          <div key={p.stage} title={`${p.label}: ${p.count}`} style={{ width: `${(p.count / total) * 100}%`, background: colors[p.stage] || '#666' }} />
        ))}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {pipeline.map((p) => (
          <div key={p.stage}>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: colors[p.stage] || '#666' }} />
              <span className="text-[11px] text-white/45">{p.label}</span>
            </div>
            <p className="mt-1 text-white font-bold text-[20px] tabular-nums leading-none">{fmtNum(p.count)}</p>
          </div>
        ))}
      </div>
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
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-[#0e0d13] border border-white/[0.08] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between">
          <h3 className="text-white text-[17px] font-bold tracking-[-0.01em]">LTV-modell & North Star</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-white/40 text-[12.5px] mt-1.5">Velg hvordan kundeverdi (LTV) skal beregnes. Ingen tall fabrikkeres — løpende LTV krever dine tall.</p>

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
                <input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} placeholder="f.eks. 1500"
                  className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white/[0.05] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] text-[14px]" />
              </div>
              <div>
                <label className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em]">Levetid (mnd)</label>
                <input type="number" value={lifetimeMonths} onChange={(e) => setLifetimeMonths(e.target.value)} placeholder="f.eks. 36"
                  className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white/[0.05] border border-white/12 text-white placeholder:text-white/25 outline-none focus:border-[#cf97fc] text-[14px]" />
              </div>
              {preview != null && (
                <p className="col-span-2 text-[12.5px] text-emerald-300 bg-emerald-400/10 rounded-lg px-3 py-2 flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Beregnet LTV: <b>{fmtKr(preview)} kr</b> per kunde</p>
              )}
            </div>
          )}

          <div className="pt-2">
            <label className="text-white/50 text-[11px] font-semibold uppercase tracking-[0.08em]">North Star (størst øverst)</label>
            <select value={northStar} onChange={(e) => setNorthStar(e.target.value)}
              className="mt-1.5 w-full h-11 px-3 rounded-lg bg-white/[0.05] border border-white/12 text-white outline-none focus:border-[#cf97fc] text-[14px]">
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
          <button onClick={save} disabled={saving} className="flex-1 h-11 rounded-xl font-semibold text-[14px] text-[#0a0a0a] flex items-center justify-center gap-2 disabled:opacity-60" style={{ background: ACCENT }}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Lagre</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Presentasjonsmodus (fullskjerm, kun de store tallene) ---
function PresentationMode({ data, northStarView, hero, m, period, setPeriod, periods, onExit }) {
  return (
    <div className="fixed inset-0 z-[95] overflow-y-auto" style={{ background: 'radial-gradient(120% 100% at 50% 0%, #17131e 0%, #0a090e 60%, #060509 100%)' }}>
      <div className="min-h-screen flex flex-col px-6 sm:px-16 py-10">
        <div className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ACCENT }} />
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

        {/* North Star gigant */}
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <p className="text-[14px] sm:text-[16px] font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>{northStarView.label}</p>
          <div className="mt-4 flex items-end justify-center gap-4">
            <CountNumber value={northStarView.value} format={northStarView.format} className="text-white font-bold tracking-[-0.05em] tabular-nums text-[120px] sm:text-[200px] leading-[0.82]" />
            {northStarView.suffix && <span className="text-white/40 font-bold text-[40px] sm:text-[64px] mb-3 sm:mb-6">{northStarView.suffix}</span>}
          </div>
          {northStarView.sub && <p className="mt-4 text-[16px] sm:text-[20px] text-white/50">{northStarView.sub}</p>}
        </div>

        {/* Fire store under */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pb-6">
          <BigPresent label="Kost per kunde" value={hero.cac?.value} format={fmtKr} suffix="kr" />
          <BigPresent label="Snitt kundeverdi" value={hero.avgCustomerValue?.value} format={fmtKr} suffix="kr" />
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
