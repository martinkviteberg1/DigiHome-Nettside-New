'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, LineChart as LineChartIcon, TrendingDown, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const nf = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
const fmtKr = (n) => (n == null ? '–' : `${new Intl.NumberFormat('nb-NO').format(Math.round(n))} kr`);

const METRICS = [
  { k: 'cpl', l: 'Kost per lead', fmt: fmtKr, lowerIsBetter: true },
  { k: 'cac', l: 'Kost per kunde (CAC)', fmt: fmtKr, lowerIsBetter: true },
  { k: 'spend', l: 'Forbruk', fmt: fmtKr },
  { k: 'leads', l: 'Leads', fmt: (n) => (n == null ? '–' : nf.format(n)) },
  { k: 'roas', l: 'ROAS', fmt: (n) => (n == null ? '–' : `${nf.format(n)}×`) },
];
const CHANNELS = [
  { k: 'paid', l: 'Betalt totalt', color: '#0a0a0a' },
  { k: 'google', l: 'Google', color: '#4285F4' },
  { k: 'meta', l: 'Meta', color: '#a855f7' },
  { k: 'finn', l: 'FINN.no', color: '#06b6d4' },
];

const fmtPeriod = (key, group) => {
  try {
    const d = new Date(key + 'T12:00:00Z');
    const s = d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
    return group === 'week' ? `u. ${s}` : s;
  } catch (e) { return key; }
};

export default function TrendsSection({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState('cpl');
  const [chans, setChans] = useState(() => new Set(['paid', 'google', 'meta']));
  const [days, setDays] = useState(84);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/analytics/trends?days=${d}&key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {} finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { load(days); }, [load, days]);

  const chartData = useMemo(() => {
    if (!data) return [];
    return (data.periods || []).map((p) => {
      const row = { label: fmtPeriod(p.key, p.group), partial: p.partial };
      for (const ch of CHANNELS) {
        const src = ch.k === 'paid' ? p.paid : p[ch.k];
        row[ch.k] = metric === 'leads' && ch.k === 'paid' ? p.totalLeads : (src ? src[metric] : null);
      }
      return row;
    });
  }, [data, metric]);

  const m = METRICS.find((x) => x.k === metric);
  const hasAny = chartData.some((r) => CHANNELS.some((c) => r[c.k] != null && r[c.k] !== 0));
  const sum = data?.summary;

  const toggleChan = (k) => setChans((prev) => {
    const n = new Set(prev);
    if (n.has(k)) { if (n.size > 1) n.delete(k); } else n.add(k);
    return n;
  });

  return (
    <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]" data-testid="trends-section">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
        <div>
          <p className="text-[13px] font-bold text-[#0a0a0a] flex items-center gap-1.5" style={{ fontFamily: 'var(--font-heading)' }}>
            <LineChartIcon className="w-4 h-4 text-[#8b5cf6]" /> Utvikling over tid
          </p>
          <p className="text-[11.5px] text-[#999] mt-0.5">Kostnadseffektivitet {data?.group === 'week' ? 'uke for uke' : 'dag for dag'} — forbruk lagres daglig og historikken bygger seg opp automatisk.</p>
        </div>
        <div className="flex items-center gap-2">
          {sum && sum.cplChangePct != null && metric === 'cpl' && (
            <span className={`inline-flex items-center gap-1 text-[11.5px] font-bold rounded-full px-2.5 py-1 ${sum.cplChangePct <= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
              {sum.cplChangePct <= 0 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
              CPL {sum.cplChangePct > 0 ? '+' : ''}{nf.format(sum.cplChangePct)} % siste halvdel
            </span>
          )}
          <div className="inline-flex items-center bg-[#f6f4f1] rounded-full p-0.5">
            {[42, 84, 180].map((d) => (
              <button key={d} onClick={() => setDays(d)}
                className={`px-2.5 py-1 rounded-full text-[11.5px] font-semibold ${days === d ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#999]'}`}>
                {d === 42 ? '6 uker' : d === 84 ? '12 uker' : '6 mnd'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrikk-velger */}
      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        {METRICS.map((x) => (
          <button key={x.k} onClick={() => setMetric(x.k)} data-testid={`trend-metric-${x.k}`}
            className={`h-7 px-3 rounded-full text-[11.5px] font-semibold transition-colors ${metric === x.k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777] hover:bg-[#ece9e4]'}`}>
            {x.l}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-[#eee]" />
        {CHANNELS.map((c) => (
          <button key={c.k} onClick={() => toggleChan(c.k)}
            className={`h-7 px-2.5 rounded-full text-[11.5px] font-semibold flex items-center gap-1.5 transition-all ${chans.has(c.k) ? 'bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] text-[#333]' : 'bg-transparent text-[#bbb]'}`}>
            <span className="w-2 h-2 rounded-full" style={{ background: c.color, opacity: chans.has(c.k) ? 1 : 0.3 }} />{c.l}
          </button>
        ))}
      </div>

      <div className="h-[260px] mt-4">
        {loading && !data ? (
          <div className="h-full flex items-center justify-center text-[#aaa] text-[13px]"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Henter utvikling …</div>
        ) : !hasAny ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <p className="text-[13px] text-[#888] font-medium">Ingen forbruksdata i perioden ennå</p>
            <p className="text-[12px] text-[#b5b0a9] mt-1 max-w-[420px]">Historikken bygges automatisk: hver gang annonsedata hentes, lagres dagens forbruk per kanal — grafen fylles ut av seg selv fremover.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1efec" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#b3aea7' }} tickLine={false} axisLine={{ stroke: '#eee' }} />
              <YAxis tick={{ fontSize: 11, fill: '#b3aea7' }} tickLine={false} axisLine={false} width={54}
                tickFormatter={(v) => (metric === 'roas' ? `${v}×` : metric === 'leads' ? v : new Intl.NumberFormat('nb-NO', { notation: 'compact' }).format(v))} />
              <Tooltip
                formatter={(v, name) => [m.fmt(v), CHANNELS.find((c) => c.k === name)?.l || name]}
                labelFormatter={(l, pl) => `${l}${pl?.[0]?.payload?.partial ? ' (pågående)' : ''}`}
                contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }} />
              {CHANNELS.filter((c) => chans.has(c.k)).map((c) => (
                <Line key={c.k} type="monotone" dataKey={c.k} stroke={c.color} strokeWidth={c.k === 'paid' ? 2.5 : 1.8}
                  dot={{ r: 2.5, strokeWidth: 0, fill: c.color }} activeDot={{ r: 4 }} connectNulls
                  strokeDasharray={c.k === 'finn' ? '5 3' : undefined} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      {data?.note && <p className="text-[10.5px] text-[#c4c0ba] mt-3 leading-relaxed">{data.note}</p>}
    </div>
  );
}
