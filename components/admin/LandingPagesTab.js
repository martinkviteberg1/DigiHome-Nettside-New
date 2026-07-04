'use client';

/*
 * LandingPagesTab — egen modul for alle landingssider (flyttet ut av Innsikt).
 * Grupperer: Kampanjesider (nyhetsbrev/sesong) · Annonse-landingssider (/lp/*)
 * · Hovedsider (permanente konverteringssider). Live ytelse fra
 * GET /api/admin/landing-pages (økter, visninger, skjematrakt, leads, CVR).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink, Copy, Check, Loader2, Megaphone, Sun, Home,
  Users, MousePointerClick, Target, TrendingUp,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const GROUPS = [
  { key: 'kampanje', label: 'Kampanjesider', desc: 'Tidsbegrensede kampanjer — koblet til nyhetsbrev og annonser', icon: Sun },
  { key: 'annonse', label: 'Annonse-landingssider', desc: 'Dedikerte sider for Google- og Meta-annonser (/lp/*)', icon: Megaphone },
  { key: 'hoved', label: 'Hovedsider', desc: 'Permanente konverteringssider på nettstedet', icon: Home },
];

export default function LandingPagesTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState('');

  const load = useCallback(async (d) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/landing-pages?days=${d}&${q}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {}
    setLoading(false);
  }, [q]);
  useEffect(() => { load(days); }, [load, days]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const copyUrl = (path) => {
    try {
      navigator.clipboard.writeText(`${origin}${path}`);
      setCopied(path);
      setTimeout(() => setCopied(''), 1600);
    } catch (e) {}
  };

  const grouped = useMemo(() => {
    const pages = data?.pages || [];
    const by = { kampanje: [], annonse: [], hoved: [] };
    for (const p of pages) (by[p.group] || by.annonse).push(p);
    return by;
  }, [data]);

  const t = data?.totals || {};

  return (
    <div data-testid="lp-tab">
      {/* Topp: periode + totaler */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5">
          {[[7, '7 dager'], [30, '30 dager'], [90, '90 dager']].map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)}
              className={`h-[32px] rounded-full text-[12px] font-semibold px-3.5 ${days === d ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777] hover:bg-[#ece9e4]'}`}>{l}</button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { l: 'Økter', v: t.sessions != null ? nf.format(t.sessions) : '—', icon: Users },
            { l: 'Skjema startet', v: t.formStart != null ? nf.format(t.formStart) : '—', icon: MousePointerClick },
            { l: 'Leads', v: t.leads != null ? nf.format(t.leads) : '—', icon: Target },
            { l: 'CVR', v: t.conversionRate != null ? `${t.conversionRate} %` : '—', icon: TrendingUp },
          ].map((k) => (
            <div key={k.l} className="rounded-xl border border-[#f0f0f0] bg-white px-3.5 py-2 flex items-center gap-2.5">
              {React.createElement(k.icon, { size: 14, className: 'text-[#c9b3e0]' })}
              <div>
                <p className="text-[15px] font-bold tabular-nums leading-none text-[#111]">{k.v}</p>
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa] mt-0.5">{k.l}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="py-20 text-center"><Loader2 size={22} className="animate-spin inline text-[#a052e0]" /></div>
      ) : (
        GROUPS.map((g) => {
          const pages = grouped[g.key] || [];
          if (!pages.length) return null;
          return (
            <div key={g.key} className="mt-8" data-testid={`lp-group-${g.key}`}>
              <div className="flex items-center gap-2.5 flex-wrap">
                {React.createElement(g.icon, { size: 16, className: 'text-[#a052e0]' })}
                <h3 className="text-[15px] font-bold tracking-[-0.01em] text-[#111]">{g.label}</h3>
                <span className="text-[11px] text-[#bbb]">· {g.desc}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-3">
                {pages.map((p) => {
                  const isKampanje = g.key === 'kampanje';
                  return (
                    <div key={p.slug}
                      className={`rounded-2xl border bg-white p-5 transition-all hover:shadow-[0_10px_30px_-18px_rgba(160,82,224,0.25)] ${isKampanje ? 'border-[#d8c3ec] bg-gradient-to-b from-[#fdfbff] to-white' : 'border-[#f0f0f0] hover:border-[#e0d5ec]'}`}
                      data-testid={`lp-card-${p.slug}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {p.eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#a052e0] truncate">{p.eyebrow}</p> : null}
                          <p className="text-[14.5px] font-bold tracking-[-0.01em] text-[#111] mt-1 truncate" title={p.h1}>{p.h1 || p.slug}</p>
                          <p className="text-[11.5px] text-[#999] mt-0.5 font-mono">{p.path}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => copyUrl(p.path)} title="Kopier URL"
                            className="w-8 h-8 rounded-lg border border-[#eee] flex items-center justify-center text-[#999] hover:border-[#c99df0] hover:text-[#a052e0]">
                            {copied === p.path ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
                          </button>
                          <a href={p.path} target="_blank" rel="noopener noreferrer" title="Åpne siden"
                            className="w-8 h-8 rounded-lg bg-[#0a0a0a] flex items-center justify-center text-white hover:opacity-80"
                            data-testid={`lp-open-${p.slug}`}>
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>

                      {/* Ytelse */}
                      <div className="grid grid-cols-4 gap-2 mt-4 pt-3.5 border-t border-[#f6f6f6]">
                        {[
                          ['Økter', nf.format(p.sessions || 0)],
                          ['Skjema', nf.format(p.form?.start || 0)],
                          ['Leads', nf.format(p.leads || p.form?.submit || 0)],
                          ['CVR', p.sessions ? `${p.conversionRate} %` : '—'],
                        ].map(([l, v]) => (
                          <div key={l}>
                            <p className="text-[14px] font-bold tabular-nums text-[#111]">{v}</p>
                            <p className="text-[9.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa]">{l}</p>
                          </div>
                        ))}
                      </div>

                      {/* Skjematrakt-bar */}
                      {p.form?.start > 0 ? (
                        <div className="mt-3">
                          <div className="h-[5px] rounded-full bg-[#f4f2ef] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(100, p.form.submitRate || 0)}%`, background: '#d298ff' }} />
                          </div>
                          <p className="text-[10px] text-[#bbb] mt-1">{p.form.submitRate} % fullfører skjemaet ({p.form.submit} av {p.form.start})</p>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#ccc] mt-3">Ingen skjema-aktivitet i perioden</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
