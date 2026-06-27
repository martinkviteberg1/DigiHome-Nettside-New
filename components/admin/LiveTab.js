'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Users, Eye, MousePointerClick, FileText, Send, ArrowUpRight, Loader2 } from 'lucide-react';

const ACTION_ICON = {
  'so på side': Eye, 'søkte adresse': MousePointerClick, 'startet skjema': FileText,
  'fylte skjema': FileText, 'sendte lead': Send, 'klikket CTA': MousePointerClick, 'gikk ut': ArrowUpRight,
};

function timeAgo(ts) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 1000));
  if (s < 60) return `${s}s siden`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m siden`;
  return `${Math.floor(m / 60)}t siden`;
}

export default function LiveTab({ apiKey }) {
  const [live, setLive] = useState(null);
  const [err, setErr] = useState('');
  const timer = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/live?key=${encodeURIComponent(apiKey)}`, { cache: 'no-store' });
      if (res.ok) { setLive(await res.json()); setErr(''); }
      else setErr('Kunne ikke hente live-data');
    } catch (e) { setErr('Nettverksfeil'); }
  }, [apiKey]);

  useEffect(() => {
    poll();
    timer.current = setInterval(poll, 12000);
    return () => clearInterval(timer.current);
  }, [poll]);

  if (!live) {
    return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-[#0a0a0a] to-[#1a1430] text-white rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span></span>
            <span className="text-[11px] uppercase tracking-[0.12em] text-white/60 font-semibold">Aktive nå</span>
          </div>
          <p className="text-[56px] font-bold leading-none" style={{ fontFamily: 'var(--font-heading)' }}>{live.activeNow}</p>
          <p className="text-[13px] text-white/55 mt-2">besøkende siste 5 min</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3"><Users className="w-4 h-4 text-[#a463e8]" /><span className="text-[11px] uppercase tracking-[0.1em] text-[#aaa] font-semibold">Siste 30 min</span></div>
          <p className="text-[44px] font-bold leading-none text-[#1f1f1f]" style={{ fontFamily: 'var(--font-heading)' }}>{live.sessions30m}</p>
          <p className="text-[13px] text-[#999] mt-2">unike økter</p>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center gap-2 mb-3"><Eye className="w-4 h-4 text-[#a463e8]" /><span className="text-[11px] uppercase tracking-[0.1em] text-[#aaa] font-semibold">Aktive sider</span></div>
          <div className="space-y-1.5 mt-1">
            {live.topPages.length === 0 && <p className="text-[13px] text-[#bbb]">Ingen aktivitet</p>}
            {live.topPages.slice(0, 4).map((p) => (
              <div key={p.path} className="flex items-center justify-between text-[12.5px]"><span className="text-[#444] truncate max-w-[160px]">{p.path}</span><span className="font-bold text-[#a463e8]">{p.count}</span></div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#999] flex items-center gap-1.5"><Radio className="w-3.5 h-3.5" /> Sanntids aktivitetsfeed</h3>
          <span className="text-[11px] text-[#bbb]">oppdateres hvert 12. sek</span>
        </div>
        {err && <p className="text-[12.5px] text-rose-500 mb-2">{err}</p>}
        <div className="space-y-1">
          {live.feed.length === 0 && <p className="text-[13.5px] text-[#bbb] py-6 text-center">Ingen aktivitet de siste 30 minuttene</p>}
          {live.feed.map((f, i) => {
            const Icon = ACTION_ICON[f.action] || Eye;
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-[#f6f6f6] last:border-0">
                <div className="w-7 h-7 rounded-lg bg-[#f4f0fb] flex items-center justify-center shrink-0"><Icon className="w-3.5 h-3.5 text-[#a463e8]" /></div>
                <span className="text-[13.5px] text-[#333] font-medium">{f.action}</span>
                <span className="text-[13px] text-[#888] truncate flex-1">{f.path}</span>
                {f.channel && <span className="text-[11px] bg-[#f4f0fb] text-[#8b5cf6] rounded-full px-2 py-0.5 font-semibold hidden sm:inline">{f.channel}</span>}
                {f.device && <span className="text-[11px] text-[#bbb] hidden sm:inline">{f.device}</span>}
                <span className="text-[11.5px] text-[#bbb] whitespace-nowrap">{timeAgo(f.ts)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
