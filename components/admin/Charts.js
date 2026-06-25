'use client';

// Gjenbrukbare, premium dashbord-komponenter for DigiHome admin.
// Recharts for tidsserie/donut + lette CSS-barer for lister/trakt (full kontroll,
// ingen synlige rammer — i tråd med DigiHome sin rene, borderless estetikk).

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';

export const PALETTE = ['#cf97fc', '#0a0a0a', '#22c55e', '#f59e0b', '#3b82f6', '#ec4899', '#14b8a6', '#a78bfa'];

export function fmtDay(d) {
  if (!d) return '';
  const [, m, day] = d.split('-');
  return `${day}.${m}`;
}

function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('nb-NO').format(n);
}

// --- KPI-kort --------------------------------------------------------------
export function KPI({ label, value, sub, accent }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <p className="text-[12px] text-[#999] font-medium tracking-[0.01em]">{label}</p>
      <p className="text-[30px] leading-[1.1] font-bold text-[#0a0a0a] mt-1.5 tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>
        {value}
      </p>
      {sub && (
        <p className="text-[12px] mt-1.5 font-medium" style={{ color: accent || '#aaa' }}>{sub}</p>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] px-3.5 py-2.5 text-[12px]">
      <p className="font-semibold text-[#0a0a0a] mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-[#555]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-[#0a0a0a]">{fmtNum(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

// --- Tidsserie (areal) -----------------------------------------------------
export function SeriesArea({ data = [], series = [], height = 260 }) {
  const chartData = data.map((d) => ({ ...d, label: fmtDay(d.day) }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`g-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
          <YAxis tick={{ fontSize: 11, fill: '#aaa' }} axisLine={false} tickLine={false} allowDecimals={false} width={42} />
          <Tooltip content={<CustomTooltip />} />
          {series.map((s) => (
            <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} fill={`url(#g-${s.key})`} dot={false} activeDot={{ r: 4 }} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Horisontal bar-liste (kanaler/kilder/sider/områder) -------------------
export function BarList({ title, items = [], nameKey, valueKey = 'count', color = '#cf97fc', suffix = '', emptyText = 'Ingen data ennå' }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey] || 0));
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      {title && <h3 className="text-[14px] font-bold text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>}
      {items.length === 0 ? (
        <p className="text-[13px] text-[#bbb] py-6 text-center">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((it, i) => (
            <div key={(it[nameKey] || i) + ''}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-[#444] font-medium truncate pr-2">{it[nameKey] || '(ukjent)'}</span>
                <span className="text-[#0a0a0a] font-semibold tabular-nums whitespace-nowrap">
                  {fmtNum(it[valueKey])}{suffix}
                  {typeof it.leads === 'number' && it.leads > 0 && (
                    <span className="ml-1.5 text-[11px] text-[#cf97fc] font-semibold">· {it.leads} leads</span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-[#f2f2f2] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, ((it[valueKey] || 0) / max) * 100)}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Donut (enheter/status) ------------------------------------------------
export function Donut({ title, data = [], nameKey, valueKey = 'sessions', height = 230 }) {
  const total = data.reduce((s, d) => s + (d[valueKey] || 0), 0);
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      {title && <h3 className="text-[14px] font-bold text-[#0a0a0a] mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>}
      {total === 0 ? (
        <p className="text-[13px] text-[#bbb] py-10 text-center">Ingen data ennå</p>
      ) : (
        <div className="flex items-center gap-4">
          <div style={{ width: 130, height }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={data} dataKey={valueKey} nameKey={nameKey} cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none">
                  {data.map((entry, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2">
            {data.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-[#555]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                  {d[nameKey] || '(ukjent)'}
                </span>
                <span className="font-semibold text-[#0a0a0a] tabular-nums">{total ? Math.round((d[valueKey] / total) * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Trakt -----------------------------------------------------------------
export function Funnel({ steps = [] }) {
  const top = steps.length ? steps[0].count || 1 : 1;
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <h3 className="text-[14px] font-bold text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Konverteringstrakt</h3>
      <div className="space-y-2.5">
        {steps.map((s, i) => {
          const pct = top ? Math.round((s.count / top) * 100) : 0;
          const prev = i > 0 ? steps[i - 1].count : s.count;
          const stepDrop = prev ? Math.round((1 - s.count / prev) * 100) : 0;
          return (
            <div key={s.step}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-[#444] font-medium">{s.step}</span>
                <span className="text-[#0a0a0a] font-semibold tabular-nums">
                  {fmtNum(s.count)} <span className="text-[#bbb] font-normal">· {pct}%</span>
                  {i > 0 && stepDrop > 0 && <span className="ml-2 text-[11px] text-red-400">−{stepDrop}%</span>}
                </span>
              </div>
              <div className="h-7 rounded-lg bg-[#f4f0fb] overflow-hidden">
                <div className="h-full rounded-lg flex items-center transition-all" style={{ width: `${Math.max(4, pct)}%`, background: `linear-gradient(90deg, #cf97fc, #a78bfa)` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- Skjema-steg drop-off --------------------------------------------------
export function FormStepBars({ steps = [], title = 'Skjema-flyt (drop-off)' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
      <h3 className="text-[14px] font-bold text-[#0a0a0a] mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
      {steps.length === 0 ? (
        <p className="text-[13px] text-[#bbb] py-6 text-center">Ingen skjema-data ennå</p>
      ) : (
        <div className="space-y-2.5">
          {steps.map((s, i) => (
            <div key={s.label + i}>
              <div className="flex items-center justify-between text-[13px] mb-1">
                <span className="text-[#444] font-medium">{i + 1}. {s.label}</span>
                <span className="text-[#0a0a0a] font-semibold tabular-nums">
                  {fmtNum(s.count)} <span className="text-[#bbb] font-normal">· {s.rate}%</span>
                  {s.dropoff > 0 && i > 0 && <span className="ml-2 text-[11px] text-red-400">−{fmtNum(s.dropoff)}</span>}
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-[#f2f2f2] overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(3, s.rate)}%`, background: '#0a0a0a' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
