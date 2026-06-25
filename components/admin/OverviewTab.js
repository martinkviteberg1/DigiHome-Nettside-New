'use client';

import { KPI, SeriesArea, Funnel, FormStepBars } from './Charts';

const nf = (n) => new Intl.NumberFormat('nb-NO').format(n || 0);

export default function OverviewTab({ traffic, leads }) {
  const t = (traffic && traffic.totals) || {};
  const li = (leads && leads.totals) || {};
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KPI label="Økter" value={nf(t.sessions)} sub={`${nf(t.pagesPerSession)} sider/økt`} />
        <KPI label="Besøkende" value={nf(t.visitors)} sub={`${nf(t.newVisitors)} nye`} accent="#cf97fc" />
        <KPI label="Sidevisninger" value={nf(t.pageviews)} />
        <KPI label="Leads" value={nf(t.leads)} sub={`${nf(li.hotLeads)} varme`} accent="#22c55e" />
        <KPI label="Konvertering" value={`${t.conversionRate || 0}%`} sub="besøk → lead" accent="#cf97fc" />
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-[0_2px_16px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[14px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Trafikk over tid</h3>
          <div className="flex items-center gap-4 text-[12px] text-[#888]">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#cf97fc' }} />Økter</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: '#0a0a0a' }} />Sidevisninger</span>
          </div>
        </div>
        <SeriesArea
          data={(traffic && traffic.timeseries) || []}
          series={[
            { key: 'sessions', label: 'Økter', color: '#cf97fc' },
            { key: 'pageviews', label: 'Sidevisninger', color: '#0a0a0a' },
          ]}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Funnel steps={(traffic && traffic.funnel) || []} />
        <FormStepBars steps={(traffic && traffic.formSteps) || []} />
      </div>
    </div>
  );
}
