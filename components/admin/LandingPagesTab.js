'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, ExternalLink, Copy, Check, TrendingUp, Users, MousePointerClick,
  Trophy, Target, AlertCircle, Home, KeyRound, Megaphone,
} from 'lucide-react';

const kr = (n) => (n || n === 0) ? `${Math.round(n).toLocaleString('nb-NO')} kr` : '–';

export default function LandingPagesTab({ apiKey, days = 30 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/landing-pages?key=${encodeURIComponent(apiKey)}&days=${days}`);
      if (res.status === 401) { setErr('Sesjonen er utløpt — logg inn på nytt.'); setLoading(false); return; }
      const j = await res.json();
      if (!res.ok || !j.ok) { setErr(j.error || 'Kunne ikke laste landingssider'); }
      else setData(j);
    } catch (e) { setErr('Kunne ikke laste landingssider'); }
    finally { setLoading(false); }
  }, [apiKey, days]);

  useEffect(() => { if (apiKey) load(); }, [apiKey, days]); // eslint-disable-line

  const base = (typeof window !== 'undefined') ? window.location.origin : '';
  const copyLink = (path) => {
    try { navigator.clipboard.writeText(`${base}${path}`); setCopied(path); setTimeout(() => setCopied(''), 1800); } catch (e) {}
  };

  const pages = (data && data.pages) || [];
  const totals = (data && data.totals) || null;

  return (
    <div>
      {err && <div className="mb-4 bg-rose-50 text-rose-600 rounded-xl px-4 py-3 text-[13px] flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</div>}

      {/* Sammendrag */}
      {totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <SummaryStat label="Sider" value={pages.length} icon={Megaphone} tone="violet" />
          <SummaryStat label="Økter (alle sider)" value={(totals.sessions || 0).toLocaleString('nb-NO')} icon={MousePointerClick} tone="slate" />
          <SummaryStat label="Leads" value={totals.leads || 0} sub={`${totals.conversionRate || 0}% konvertering`} icon={Users} tone="slate" />
          <SummaryStat label="Vunnet verdi" value={kr(totals.wonValue)} sub={`${totals.won || 0} vunne`} icon={Trophy} tone="emerald" />
        </div>
      )}

      {/* Grid */}
      {loading && !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="shimmer h-44 w-full" />
              <div className="p-4 space-y-3">
                <div className="shimmer h-3 rounded w-24" />
                <div className="shimmer h-4 rounded w-3/4" />
                <div className="grid grid-cols-4 gap-2 pt-2">{[0, 1, 2, 3].map((k) => <div key={k} className="shimmer h-10 rounded-lg" />)}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-4 dh-tab-in">
          {pages.map((p) => (
            <LandingCard key={p.slug} page={p} base={base} copied={copied === p.path} onCopy={() => copyLink(p.path)} />
          ))}
          {pages.length === 0 && !loading && (
            <div className="col-span-full py-14 text-center text-[14px] text-[#aaa]">Ingen landingssider funnet</div>
          )}
        </div>
      )}

      <p className="mt-5 text-[12px] text-[#b0b0b0] flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" /> Live-forhåndsvisning lastes direkte fra sidene — den påvirker ikke besøksstatistikken.
      </p>
    </div>
  );
}

function LandingCard({ page: p, base, copied, onCopy }) {
  const isTenant = p.audience === 'leietaker';
  const conv = p.conversionRate || 0;
  const convTone = conv >= 5 ? 'text-emerald-600' : conv >= 2 ? 'text-[#1f1f1f]' : 'text-[#999]';
  return (
    <div className="group bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.09)] transition-shadow overflow-hidden flex flex-col">
      {/* Live-forhåndsvisning */}
      <div className="relative h-44 bg-[#0a0a0a] overflow-hidden">
        <iframe
          src={`${p.path}?preview=1`}
          title={p.h1 || p.slug}
          loading="lazy"
          scrolling="no"
          aria-hidden="true"
          tabIndex={-1}
          style={{ width: '1280px', height: '800px', transform: 'scale(0.5)', transformOrigin: 'top left', border: 0, pointerEvents: 'none' }}
          className="absolute top-0 left-0"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
        <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-[10.5px] font-semibold rounded-full px-2 py-1 leading-none ${isTenant ? 'bg-[#0a0a0a]/70 text-white' : 'bg-white/85 text-[#0a0a0a]'} backdrop-blur-sm`}>
          {isTenant ? <KeyRound className="w-3 h-3" /> : <Home className="w-3 h-3" />} {isTenant ? 'Leietaker' : 'Utleier'}
        </span>
        <a
          href={p.path} target="_blank" rel="noopener noreferrer"
          className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a]/0 group-hover:bg-[#0a0a0a]/35 transition-colors"
        >
          <span className="opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white text-[#0a0a0a] text-[12.5px] font-semibold shadow-lg">
            <ExternalLink className="w-3.5 h-3.5" /> Åpne live
          </span>
        </a>
      </div>

      {/* Innhold */}
      <div className="p-4 flex-1 flex flex-col">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#8b5cf6]">{p.eyebrow || 'Kampanjeside'}</p>
        <h3 className="text-[15px] font-bold text-[#1a1a1a] leading-snug mt-1 line-clamp-2" style={{ fontFamily: 'var(--font-heading)' }}>{p.h1 || p.slug}</h3>
        <p className="text-[11.5px] text-[#b0b0b0] mt-1 font-mono truncate">{p.path}</p>

        {/* Nøkkeltall */}
        <div className="grid grid-cols-4 gap-1.5 mt-3.5">
          <Metric label="Økter" value={(p.sessions || 0).toLocaleString('nb-NO')} />
          <Metric label="Leads" value={p.leads || 0} />
          <Metric label="Konv." value={`${conv}%`} valueClass={convTone} highlight />
          <Metric label="Vunnet" value={p.won || 0} />
        </div>

        {/* Skjematrakt (2-stegs skjema): start → steg 2 → innsendt */}
        {p.form && p.form.start > 0 ? (
          <div className="mt-3 rounded-lg bg-[#faf9fc] border border-[#f0edf7] px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-[0.06em] text-[#a3a3a3] font-semibold mb-1.5">Skjematrakt</p>
            <div className="flex items-center gap-1.5">
              <FunnelStep label="Start" value={p.form.start} pct={100} />
              <span className="text-[#d8d2e8] text-[11px]">→</span>
              <FunnelStep label="Steg 2" value={p.form.step2} pct={p.form.step2Rate} />
              <span className="text-[#d8d2e8] text-[11px]">→</span>
              <FunnelStep label="Innsendt" value={p.form.submit} pct={p.form.submitRate} final />
            </div>
          </div>
        ) : null}

        {/* Bunn */}
        <div className="mt-4 pt-3 border-t border-black/[0.05] flex items-center justify-between">
          <span className="text-[11.5px] text-[#999] flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#c9b8e4]" />
            {p.wonValue ? kr(p.wonValue) : (p.paidShare ? `${p.paidShare}% betalt` : 'Ingen konv. ennå')}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={onCopy} title="Kopier lenke" className="h-8 w-8 rounded-lg flex items-center justify-center text-[#aaa] hover:text-[#0a0a0a] hover:bg-[#f5f4f2] transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
            <a href={p.path} target="_blank" rel="noopener noreferrer" title="Åpne i ny fane" className="h-8 w-8 rounded-lg flex items-center justify-center text-[#aaa] hover:text-[#0a0a0a] hover:bg-[#f5f4f2] transition-colors">
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, valueClass = 'text-[#1f1f1f]', highlight }) {
  return (
    <div className={`rounded-lg px-2 py-2 text-center ${highlight ? 'bg-[#f4f0fb]' : 'bg-[#f8f7f5]'}`}>
      <p className={`text-[15px] font-bold leading-none ${valueClass}`} style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      <p className="text-[10px] uppercase tracking-[0.05em] text-[#a3a3a3] font-semibold mt-1">{label}</p>
    </div>
  );
}

function FunnelStep({ label, value, pct, final }) {
  const tone = final
    ? (pct >= 50 ? 'text-emerald-600' : pct >= 25 ? 'text-[#b76e00]' : 'text-[#b3261e]')
    : 'text-[#1f1f1f]';
  return (
    <div className="flex-1 text-center">
      <p className={`text-[13px] font-bold leading-none ${tone}`} style={{ fontFamily: 'var(--font-heading)' }}>
        {value}{pct !== 100 ? <span className="text-[10px] font-semibold text-[#a3a3a3] ml-1">({pct}%)</span> : null}
      </p>
      <p className="text-[9.5px] uppercase tracking-[0.05em] text-[#a3a3a3] font-semibold mt-0.5">{label}</p>
    </div>
  );
}

function SummaryStat({ label, value, sub, icon: Icon, tone = 'slate' }) {
  const TONES = {
    violet: 'bg-[#f4f0fb] text-[#8b5cf6]',
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-[#f3f3f2] text-[#666]',
  };
  return (
    <div className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
      <div className="flex items-start justify-between">
        <p className="text-[11px] uppercase tracking-[0.06em] text-[#a3a3a3] font-semibold">{label}</p>
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${TONES[tone] || TONES.slate}`}><Icon className="w-4 h-4" /></span>
      </div>
      <p className="text-[24px] font-bold mt-2 leading-none text-[#1f1f1f]" style={{ fontFamily: 'var(--font-heading)' }}>{value}</p>
      {sub && <p className="text-[12px] text-[#a3a3a3] mt-1.5">{sub}</p>}
    </div>
  );
}
