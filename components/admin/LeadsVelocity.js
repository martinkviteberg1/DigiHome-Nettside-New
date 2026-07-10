'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Timer, Zap, AlertTriangle, Gauge, ChevronRight, Hourglass, TrendingUp } from 'lucide-react';

const STAGE_COLOR = {
  new: 'bg-[#e8e6e2]', contacted: 'bg-sky-200', qualified: 'bg-violet-300',
  viewing: 'bg-blue-300', offer: 'bg-indigo-300',
};
const STAGE_BADGE = {
  new: 'text-[#555] bg-[#f3f3f3]', contacted: 'text-sky-600 bg-sky-50',
  qualified: 'text-violet-600 bg-violet-50', viewing: 'text-blue-600 bg-blue-50',
  offer: 'text-indigo-600 bg-indigo-50',
};
const STAGE_LABEL = { new: 'Ny', contacted: 'Kontaktet', qualified: 'Kvalifisert', viewing: 'Befaring', offer: 'Tilbud sendt' };

const nf = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 1 });
// Timer → lesbar varighet
const fmtDur = (hours) => {
  if (hours == null) return '–';
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 48) return `${nf.format(hours)} t`;
  return `${nf.format(hours / 24)} d`;
};

function Kpi({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.04)] min-w-0">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone || 'bg-[#f4f0fb] text-[#8b5cf6]'}`}><Icon className="w-3.5 h-3.5" /></span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#aaa] truncate">{label}</p>
      </div>
      <p className="text-[22px] font-bold text-[#0a0a0a] leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {hint && <p className="text-[11.5px] text-[#999] mt-1.5 leading-snug">{hint}</p>}
    </div>
  );
}

export default function LeadsVelocity({ apiKey, onOpenLead }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(90);

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/analytics/velocity?days=${d}&key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {} finally { setLoading(false); }
  }, [apiKey]);

  useEffect(() => { load(days); }, [load, days]);

  if (loading && !data) {
    return <div className="flex items-center gap-2 text-[#aaa] text-[13px] py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Beregner pipeline-hastighet …</div>;
  }
  if (!data) return <p className="text-[13px] text-[#aaa] py-10 text-center">Kunne ikke hente hastighetsdata.</p>;

  const tts = data.timeToSale || {};
  const maxMedian = Math.max(1, ...(data.stages || []).map((s) => s.medianHours || 0));

  return (
    <div className="space-y-4" data-testid="leads-velocity">
      {/* Periodevelger */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#b3aea7] font-medium">Basert på {data.sample} leads · statusendringer med tidsstempel</p>
        <div className="inline-flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {[30, 90, 180].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-all ${days === d ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:text-[#0a0a0a]'}`}>
              {d} dager
            </button>
          ))}
        </div>
      </div>

      {/* KPI-rad */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Timer} label="Median tid til salg"
          value={tts.medianDays != null ? `${nf.format(tts.medianDays)} d` : '–'}
          hint={tts.n ? `${tts.n} vunnede analysert${tts.avgDays != null ? ` · snitt ${nf.format(tts.avgDays)} d` : ''}` : 'Ingen vunnede egne leads i perioden'} />
        <Kpi icon={Zap} label="Første kontakt" tone="bg-emerald-50 text-emerald-600"
          value={data.firstResponse?.medianHours != null ? fmtDur(data.firstResponse.medianHours) : '–'}
          hint={data.firstResponse?.n ? `Median fra innsendt til første handling (${data.firstResponse.n} leads)` : 'Ingen data ennå'} />
        <Kpi icon={Hourglass} label="Flaskehals" tone="bg-amber-50 text-amber-600"
          value={data.bottleneck ? STAGE_LABEL[data.bottleneck.stage] || data.bottleneck.stage : '–'}
          hint={data.bottleneck ? `Leads blir liggende ${fmtDur(data.bottleneck.medianHours)} her (median)` : 'For lite datagrunnlag foreløpig'} />
        <Kpi icon={TrendingUp} label="Raskeste kanal" tone="bg-sky-50 text-sky-600"
          value={tts.perChannel?.length ? tts.perChannel[0].channel : '–'}
          hint={tts.perChannel?.length ? `${nf.format(tts.perChannel[0].medianDays)} d til salg (median, ${tts.perChannel[0].n} stk)` : 'Trenger flere vunnede'} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Tid i hvert steg + konvertering */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-1 flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5 text-[#b39ddb]" /> Tid i hvert steg</p>
          <p className="text-[11.5px] text-[#999] mb-4">Median oppholdstid før leaden flyttes videre — og hvor stor andel som faktisk går videre.</p>
          <div className="space-y-3.5">
            {(data.stages || []).map((s) => {
              const conv = (data.conversion || []).find((c) => c.stage === s.stage);
              const w = s.medianHours != null ? Math.max(4, (s.medianHours / maxMedian) * 100) : 0;
              return (
                <div key={s.stage}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-[12.5px] font-semibold text-[#333]">{s.label}</span>
                    <span className="text-[12px] text-[#666] font-semibold">{fmtDur(s.medianHours)}<span className="text-[#bbb] font-normal"> · {s.n} opphold</span></span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[#f4f2ef] overflow-hidden">
                    <div className={`h-full rounded-full ${STAGE_COLOR[s.stage] || 'bg-[#ddd]'}`} style={{ width: `${w}%` }} />
                  </div>
                  {conv && conv.rate != null && (
                    <p className="text-[11px] text-[#999] mt-1">{conv.rate} % går videre <span className="text-[#ccc]">({conv.advanced} av {conv.entered})</span></p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          {/* Tempo per kanal */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-3">Tid til salg per kanal</p>
            {tts.perChannel?.length ? (
              <div className="divide-y divide-[#f6f6f6]">
                {tts.perChannel.map((c) => (
                  <div key={c.channel} className="flex items-center justify-between py-2">
                    <span className="text-[13px] text-[#333] font-medium">{c.channel}</span>
                    <span className="text-[13px] font-semibold text-[#0a0a0a]">{nf.format(c.medianDays)} d <span className="text-[11px] text-[#bbb] font-normal">({c.n})</span></span>
                  </div>
                ))}
              </div>
            ) : <p className="text-[12.5px] text-[#aaa]">Trenger vunnede leads med attribusjon for å sammenligne kanaler.</p>}
          </div>

          {/* Modne leads */}
          <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#1f1f1f] mb-1 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Modne leads
            </p>
            <p className="text-[11.5px] text-[#999] mb-3">Åpne leads som har stått stille i samme steg i 7+ dager — kandidater for oppfølging i dag.</p>
            {data.stale?.length ? (
              <div className="divide-y divide-[#f6f6f6]">
                {data.stale.map((l) => (
                  <button key={l.id} onClick={() => onOpenLead?.(l.id)} data-testid={`velocity-stale-${l.id}`}
                    className="w-full flex items-center gap-2.5 py-2 text-left hover:bg-[#fcfbfa] rounded-lg px-1 transition-colors group">
                    <span className="flex-1 min-w-0 text-[13px] text-[#333] font-medium truncate">{l.name}</span>
                    <span className={`text-[10.5px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${STAGE_BADGE[l.stage] || 'text-[#555] bg-[#f3f3f3]'}`}>{STAGE_LABEL[l.stage] || l.stage}</span>
                    <span className="text-[12px] font-semibold text-amber-600 shrink-0">{l.days} d i ro</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#ddd] group-hover:text-[#8b5cf6] shrink-0" />
                  </button>
                ))}
              </div>
            ) : <p className="text-[12.5px] text-emerald-600 font-medium">Ingen — alle åpne leads er rørt de siste 7 dagene 👍</p>}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-[#c4c0ba] leading-relaxed">{data.note}</p>
    </div>
  );
}
