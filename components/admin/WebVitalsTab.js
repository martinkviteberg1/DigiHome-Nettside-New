'use client';

import React from 'react';
import { Gauge, Smartphone, Monitor, Info } from 'lucide-react';

const RATING = {
  god: { label: 'God', color: '#16a34a', bg: 'bg-[#e9f7ee]', text: 'text-[#166534]' },
  middels: { label: 'Middels', color: '#d97706', bg: 'bg-[#fef3e2]', text: 'text-[#92400e]' },
  dårlig: { label: 'Dårlig', color: '#dc2626', bg: 'bg-[#fdecec]', text: 'text-[#991b1b]' },
  ukjent: { label: '–', color: '#9ca3af', bg: 'bg-[#f1f0ee]', text: 'text-[#666]' },
};

const META = {
  LCP: { full: 'Largest Contentful Paint', desc: 'Hvor raskt hovedinnholdet vises' },
  INP: { full: 'Interaction to Next Paint', desc: 'Responstid på interaksjon' },
  CLS: { full: 'Cumulative Layout Shift', desc: 'Visuell stabilitet (layout-hopp)' },
  FCP: { full: 'First Contentful Paint', desc: 'Første innhold males' },
  TTFB: { full: 'Time to First Byte', desc: 'Serverens responstid' },
};

const fmt = (v, unit) => (v == null ? '–' : (unit === 'ms' ? `${Number(v).toLocaleString('nb-NO')}\u202fms` : Number(v).toLocaleString('nb-NO')));

export default function WebVitalsTab({ webVitals }) {
  const metrics = (webVitals && webVitals.metrics) || [];
  if (!metrics.length) {
    return (
      <div className="bg-white rounded-2xl p-10 text-center shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <Gauge className="w-7 h-7 text-[#ccc] mx-auto mb-3" />
        <p className="text-[14px] text-[#666] font-medium">Ingen Core Web Vitals registrert ennå</p>
        <p className="text-[13px] text-[#aaa] mt-1 max-w-[44ch] mx-auto">Ekte brukerdata (RUM) samles automatisk når besøkende laster sidene. Tallene fylles inn etter hvert som trafikken kommer.</p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] flex items-center gap-1.5"><Gauge className="w-3.5 h-3.5" /> Core Web Vitals · ekte brukerdata (p75)</h3>
        <span className="text-[12px] text-[#bbb]">{(webVitals.totalSamples || 0).toLocaleString('nb-NO')} målinger</span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => {
          const r = RATING[m.rating] || RATING.ukjent;
          const meta = META[m.name] || {};
          // posisjon på skala (0..poor*1.5)
          const max = m.poor * 1.6;
          const pct = Math.min(100, (Number(m.p75) / max) * 100);
          const goodPct = Math.min(100, (m.good / max) * 100);
          const poorPct = Math.min(100, (m.poor / max) * 100);
          return (
            <div key={m.name} className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-start justify-between mb-1">
                <div>
                  <p className="text-[15px] font-bold text-[#1f1f1f]" style={{ fontFamily: 'var(--font-heading)' }}>{m.name}</p>
                  <p className="text-[11px] text-[#aaa]">{meta.full}</p>
                </div>
                <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${r.bg} ${r.text}`}>{r.label}</span>
              </div>
              <p className="text-[32px] font-bold leading-none mt-3 mb-3" style={{ fontFamily: 'var(--font-heading)', color: r.color }}>{fmt(m.p75, m.unit)}</p>
              {/* skala */}
              <div className="relative h-2 rounded-full bg-gradient-to-r from-[#e9f7ee] via-[#fef3e2] to-[#fdecec] mb-1">
                <span className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-[#cbd5d0]" style={{ left: `${goodPct}%` }} />
                <span className="absolute top-1/2 -translate-y-1/2 w-px h-3 bg-[#e7c9a0]" style={{ left: `${poorPct}%` }} />
                <span className="absolute -top-1 w-3 h-3 rounded-full border-2 border-white shadow" style={{ left: `calc(${pct}% - 6px)`, background: r.color }} />
              </div>
              <div className="flex justify-between text-[10px] text-[#bbb] mb-4"><span>0</span><span>god ≤ {fmt(m.good, m.unit)}</span></div>
              <div className="flex items-center gap-4 pt-3 border-t border-[#f3f1ef]">
                <div className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5 text-[#bbb]" /><span className="text-[12.5px] text-[#666]">{fmt(m.p75Mobile, m.unit)}</span></div>
                <div className="flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5 text-[#bbb]" /><span className="text-[12.5px] text-[#666]">{fmt(m.p75Desktop, m.unit)}</span></div>
                <span className="ml-auto text-[11px] text-[#ccc]">n={m.samples}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-start gap-2 text-[12.5px] text-[#999] bg-white rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#bbb]" />
        <p>p75 = 75. persentil av ekte besøk (Googles standard for Core Web Vitals). Måles direkte i nettleseren til besøkende via <code className="text-[#a463e8]">web-vitals</code> — ingen eksterne verktøy eller cookies.</p>
      </div>
    </div>
  );
}
