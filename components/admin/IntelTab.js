'use client';

import { KPI, SeriesArea, BarList, Donut } from './Charts';

const nf = (n) => new Intl.NumberFormat('nb-NO').format(n || 0);

export default function IntelTab({ leads }) {
  const l = leads || {};
  const tt = l.totals || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPI label="Leads totalt" value={nf(tt.leads)} sub={`${nf(tt.tenants)} leietakere`} />
        <KPI label="Varme leads" value={nf(tt.hotLeads)} sub="kvalitet ≥ 70" accent="#22c55e" />
        <KPI label="Snittkvalitet" value={`${tt.avgQuality || 0}`} sub="av 100" accent="#cf97fc" />
        <KPI label="Videresendt" value={`${tt.forwardRate || 0}%`} sub={`${nf(tt.forwarded)} til CRM`} />
        <KPI label="Venter" value={nf(tt.pending)} sub="ikke sendt" accent={tt.pending ? '#f59e0b' : '#aaa'} />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <h3 className="text-[14px] font-bold text-[#0a0a0a] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Leads over tid</h3>
        <SeriesArea data={l.timeseries || []} series={[{ key: 'leads', label: 'Leads', color: '#cf97fc' }]} height={220} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Donut title="Status" data={l.byStatus || []} nameKey="status" valueKey="count" />
        <BarList title="Kilde (closed-loop)" items={l.bySource || []} nameKey="source" valueKey="count" color="#cf97fc" />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <BarList title="Område" items={l.byArea || []} nameKey="area" valueKey="count" color="#14b8a6" />
        <BarList title="Boligtype" items={l.byType || []} nameKey="type" valueKey="count" color="#3b82f6" />
      </div>
    </div>
  );
}
