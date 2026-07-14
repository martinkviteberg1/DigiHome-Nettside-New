'use client';

// SEO & AEO — synlighetsmodul (lys Stripe/Carta-stil, samme språk som resten
// av admin). Tre måleløp + innstillinger:
//  · Posisjoner  — ekte Google-posisjoner per nøkkelord (SerpApi, kvote-bevisst)
//  · AI-synlighet — nevnes/siteres DigiHome i AI-svar? (modell + web-søk)
//  · Teknisk helse — sitemap-revisjon av prod med score og funn per side
import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, ChevronDown, ChevronRight, Search, Sparkles, Wrench,
  Settings2, TrendingUp, TrendingDown, Minus, ExternalLink, AlertTriangle,
  CheckCircle2, Info, Bot, Globe, Save, Play,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

const VIOLET = '#7c5cf0';

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; }
};

function PosBadge({ position }) {
  if (position == null) return <span className="inline-flex items-center justify-center min-w-[44px] h-7 rounded-full bg-[#f1f0ee] text-[#999] text-[12.5px] font-semibold">&gt; 30</span>;
  const tone = position <= 3 ? 'bg-emerald-100 text-emerald-700' : position <= 10 ? 'bg-lime-100 text-lime-700' : 'bg-amber-100 text-amber-700';
  return <span className={`inline-flex items-center justify-center min-w-[44px] h-7 rounded-full text-[13px] font-bold ${tone}`}>#{position}</span>;
}

function Delta({ delta }) {
  if (delta == null || delta === 0) return <span className="inline-flex items-center gap-0.5 text-[12px] text-[#bbb]"><Minus className="w-3 h-3" /></span>;
  if (delta > 0) return <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-600"><TrendingUp className="w-3.5 h-3.5" />+{delta}</span>;
  return <span className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-red-500"><TrendingDown className="w-3.5 h-3.5" />{delta}</span>;
}

function Chip({ tone = 'gray', children }) {
  const tones = {
    gray: 'bg-[#f1f0ee] text-[#666]',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-600',
    amber: 'bg-amber-100 text-amber-700',
    violet: 'bg-[#7c5cf0]/10 text-[#7c5cf0]',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11.5px] font-semibold ${tones[tone] || tones.gray}`}>{children}</span>;
}

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] ${className}`}>{children}</div>
);

function RunButton({ label, running, onClick, sub }) {
  return (
    <button
      onClick={onClick}
      disabled={running}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold hover:bg-[#2a2a2a] disabled:opacity-60 transition-colors"
    >
      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
      {running ? 'Kjører …' : label}
      {sub && !running ? <span className="text-white/50 font-normal">{sub}</span> : null}
    </button>
  );
}

export default function SeoAeoTab({ apiKey }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('posisjoner');
  const [running, setRunning] = useState(null); // 'rank' | 'aeo' | 'tech'
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/seo/overview?key=${encodeURIComponent(apiKey)}`);
      const j = await r.json();
      if (j.ok) { setData(j); setError(null); } else setError(j.error || 'Ukjent feil');
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [apiKey]);

  useEffect(() => { load(); }, [load]);

  const run = async (type) => {
    setRunning(type);
    setError(null);
    try {
      const r = await fetch(`/api/admin/seo/run?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }),
      });
      const j = await r.json();
      if (!j.ok) setError(j.error || `Kjøring (${type}) feilet`);
      await load();
    } catch (e) { setError(e.message); }
    setRunning(null);
  };

  if (loading) return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Laster SEO-data …</div>;

  const rank = data?.rank || { keywords: [], history: {} };
  const aeo = data?.aeo || { results: [], history: [] };
  const tech = data?.tech || null;
  const quota = data?.quota || {};

  const top10 = rank.keywords.filter((k) => k.position != null && k.position <= 10).length;
  const top30 = rank.keywords.filter((k) => k.position != null).length;

  const TABS = [
    { k: 'posisjoner', l: 'Posisjoner', icon: Search },
    { k: 'ai', l: 'AI-synlighet', icon: Sparkles },
    { k: 'teknisk', l: 'Teknisk helse', icon: Wrench },
    { k: 'innstillinger', l: 'Innstillinger', icon: Settings2 },
  ];

  return (
    <div className="space-y-5">
      {/* Fanerad + kvote */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => { setTab(t.k); setExpanded(null); }}
            className={`inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold transition-colors ${tab === t.k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#0a0a0a]'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <Chip tone={quota.serpUsed30d > 80 ? 'red' : quota.serpUsed30d > 60 ? 'amber' : 'gray'}>
            SerpApi: {quota.serpUsed30d ?? 0}/{quota.serpMonthlyLimit ?? 100} søk siste 30 d
          </Chip>
          <button onClick={load} title="Oppdater" className="h-9 w-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#999] hover:text-[#0a0a0a]"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-600 text-[13px] rounded-xl px-4 py-3"><AlertTriangle className="w-4 h-4 shrink-0" /> {error}</div>
      )}

      {/* ---------------- POSISJONER ---------------- */}
      {tab === 'posisjoner' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">I topp 10</div><div className="text-[30px] font-bold tracking-tight mt-1" style={{ color: top10 > 0 ? '#059669' : '#0a0a0a' }}>{top10}<span className="text-[15px] text-[#bbb] font-medium"> / {rank.keywords.length}</span></div></Card>
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">I topp 30</div><div className="text-[30px] font-bold tracking-tight mt-1">{top30}<span className="text-[15px] text-[#bbb] font-medium"> / {rank.keywords.length}</span></div></Card>
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">AI Overview aktiv</div><div className="text-[30px] font-bold tracking-tight mt-1">{rank.keywords.filter((k) => k.aiPresent).length}</div></Card>
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">Siste sjekk</div><div className="text-[15px] font-semibold mt-2">{fmtDate(rank.checkedAt)}</div><div className="text-[11.5px] text-[#bbb] mt-0.5">{rank.runCount || 0} kjøringer totalt</div></Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
              <div>
                <div className="text-[15px] font-bold">Google-posisjoner (Bergen)</div>
                <div className="text-[12px] text-[#999]">Ekte søk via SerpApi fra Bergen · topp 30 sjekkes per nøkkelord</div>
              </div>
              <div className="ml-auto"><RunButton label="Kjør posisjonssjekk" sub={`· ${quota.nextRankCost ?? '?'} søk`} running={running === 'rank'} onClick={() => run('rank')} /></div>
            </div>
            {rank.keywords.length === 0 ? (
              <div className="px-5 py-10 text-center text-[#999] text-[14px]">Ingen kjøringer ennå — trykk «Kjør posisjonssjekk» for første måling.</div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {rank.keywords.map((k) => {
                  const open = expanded === `kw:${k.keyword}`;
                  const hist = (rank.history[k.keyword] || []).map((h) => ({ at: fmtDate(h.at), pos: h.position == null ? 31 : h.position }));
                  return (
                    <div key={k.keyword}>
                      <button onClick={() => setExpanded(open ? null : `kw:${k.keyword}`)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#fafaf9] text-left">
                        {open ? <ChevronDown className="w-4 h-4 text-[#bbb] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#bbb] shrink-0" />}
                        <PosBadge position={k.position} />
                        <Delta delta={k.delta} />
                        <span className="text-[14px] font-semibold text-[#0a0a0a] min-w-0 truncate">{k.keyword}</span>
                        {k.aiPresent && <Chip tone={k.aiCited ? 'green' : 'amber'}>{k.aiCited ? 'AI Overview: sitert' : 'AI Overview: ikke sitert'}</Chip>}
                        {k.error && <Chip tone="red">Feil</Chip>}
                        <span className="ml-auto hidden md:block text-[12px] text-[#999] truncate max-w-[280px]">
                          {k.position != null ? k.url : `Vinner: ${k.top && k.top[0] ? k.top[0].domain : '—'}`}
                        </span>
                      </button>
                      {open && (
                        <div className="px-5 pb-5 pt-1 grid lg:grid-cols-2 gap-5">
                          <div>
                            <div className="text-[12px] font-semibold text-[#999] uppercase tracking-wide mb-2">Topp 10 i Google</div>
                            <div className="space-y-1">
                              {(k.top || []).map((t) => (
                                <div key={t.position} className={`flex items-center gap-2 text-[13px] rounded-lg px-2.5 py-1.5 ${t.domain === 'digihome.no' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-[#555]'}`}>
                                  <span className="w-6 text-[#bbb] font-semibold">#{t.position}</span>
                                  <span className="font-medium">{t.domain}</span>
                                  <span className="text-[#aaa] truncate hidden sm:block">· {t.title}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-[12px] font-semibold text-[#999] uppercase tracking-wide mb-2">Posisjonshistorikk (31 = utenfor topp 30)</div>
                            {hist.length < 2 ? (
                              <div className="text-[13px] text-[#bbb] py-6">Trend vises etter minst to kjøringer.</div>
                            ) : (
                              <div className="h-[160px]">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={hist} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" />
                                    <XAxis dataKey="at" tick={{ fontSize: 10, fill: '#bbb' }} />
                                    <YAxis reversed domain={[1, 31]} tick={{ fontSize: 10, fill: '#bbb' }} />
                                    <Tooltip formatter={(v) => (v === 31 ? '> 30' : `#${v}`)} labelStyle={{ fontSize: 12 }} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
                                    <Line type="monotone" dataKey="pos" stroke={VIOLET} strokeWidth={2} dot={{ r: 3 }} />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ---------------- AI-SYNLIGHET ---------------- */}
      {tab === 'ai' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-1.5 text-[12px] text-[#999] font-medium"><Bot className="w-3.5 h-3.5" /> Modellkunnskap</div>
              <div className="text-[30px] font-bold tracking-tight mt-1">{aeo.history.length ? `${aeo.history[aeo.history.length - 1].modelRate}%` : '—'}</div>
              <div className="text-[11.5px] text-[#bbb]">av spørsmål der AI nevner DigiHome uten å søke</div>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-1.5 text-[12px] text-[#999] font-medium"><Globe className="w-3.5 h-3.5" /> Web-søk-sitering</div>
              <div className="text-[30px] font-bold tracking-tight mt-1" style={{ color: '#059669' }}>{aeo.history.length && aeo.history[aeo.history.length - 1].webRate != null ? `${aeo.history[aeo.history.length - 1].webRate}%` : '—'}</div>
              <div className="text-[11.5px] text-[#bbb]">av AI-svar med web-søk som siterer/nevner oss</div>
            </Card>
            <Card className="p-5 col-span-2 sm:col-span-1"><div className="text-[12px] text-[#999] font-medium">Siste sjekk</div><div className="text-[15px] font-semibold mt-2">{fmtDate(aeo.checkedAt)}</div><div className="text-[11.5px] text-[#bbb] mt-0.5">{aeo.history.length} kjøringer</div></Card>
          </div>

          {aeo.history.length >= 2 && (
            <Card className="p-5">
              <div className="text-[13px] font-bold mb-3">Utvikling — andel AI-svar som nevner DigiHome</div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={aeo.history.map((h) => ({ at: fmtDate(h.at), Modell: h.modelRate, 'Web-søk': h.webRate }))} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0efed" />
                    <XAxis dataKey="at" tick={{ fontSize: 10, fill: '#bbb' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#bbb' }} />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
                    <Line type="monotone" dataKey="Modell" stroke="#999" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Web-søk" stroke={VIOLET} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
              <div>
                <div className="text-[15px] font-bold">Hva svarer AI-motorene?</div>
                <div className="text-[12px] text-[#999]">Ekte kundespørsmål mot modellkunnskap (gpt-4o-mini) og web-søk (gpt-4o-search-preview)</div>
              </div>
              <div className="ml-auto"><RunButton label="Kjør AI-sjekk" running={running === 'aeo'} onClick={() => run('aeo')} /></div>
            </div>
            {aeo.results.length === 0 ? (
              <div className="px-5 py-10 text-center text-[#999] text-[14px]">Ingen kjøringer ennå — trykk «Kjør AI-sjekk».</div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {aeo.results.map((r) => {
                  const open = expanded === `q:${r.id}`;
                  const m = r.model || {};
                  const w = r.web || {};
                  return (
                    <div key={r.id}>
                      <button onClick={() => setExpanded(open ? null : `q:${r.id}`)} className="w-full flex flex-wrap items-center gap-2 px-5 py-3.5 hover:bg-[#fafaf9] text-left">
                        {open ? <ChevronDown className="w-4 h-4 text-[#bbb] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#bbb] shrink-0" />}
                        <span className="text-[14px] font-semibold text-[#0a0a0a] min-w-0 flex-1">{r.question}</span>
                        <Chip tone={m.mentions ? 'green' : 'gray'}><Bot className="w-3 h-3" /> {m.mentions ? 'Nevnt' : 'Ikke nevnt'}</Chip>
                        {w.available === false ? <Chip tone="amber"><Globe className="w-3 h-3" /> Web utilgjengelig</Chip>
                          : <Chip tone={w.cited ? 'green' : 'red'}><Globe className="w-3 h-3" /> {w.cited ? 'Sitert i web-svar' : 'Ikke sitert'}</Chip>}
                      </button>
                      {open && (
                        <div className="px-5 pb-5 pt-1 grid lg:grid-cols-2 gap-5">
                          <div className="bg-[#fafaf9] rounded-xl p-4">
                            <div className="text-[12px] font-semibold text-[#999] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> Modellsvar (uten søk)</div>
                            <p className="text-[13px] text-[#555] leading-relaxed whitespace-pre-wrap">{m.snippet || m.error || '—'}</p>
                            {m.competitors && m.competitors.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{m.competitors.map((c) => <Chip key={c} tone="amber">{c}</Chip>)}</div>}
                          </div>
                          <div className="bg-[#fafaf9] rounded-xl p-4">
                            <div className="text-[12px] font-semibold text-[#999] uppercase tracking-wide mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Web-søk-svar</div>
                            <p className="text-[13px] text-[#555] leading-relaxed whitespace-pre-wrap">{w.snippet || w.error || '—'}</p>
                            {w.citations && w.citations.length > 0 && (
                              <div className="mt-3 space-y-1">
                                <div className="text-[11px] font-semibold text-[#999] uppercase tracking-wide">Kilder sitert</div>
                                {w.citations.map((c, i) => (
                                  <a key={i} href={c.url} target="_blank" rel="noreferrer" className={`flex items-center gap-1.5 text-[12.5px] hover:underline ${(c.url || '').includes('digihome.no') ? 'text-emerald-600 font-semibold' : 'text-[#7c5cf0]'}`}>
                                    <ExternalLink className="w-3 h-3 shrink-0" /> <span className="truncate">{c.title || c.url}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                            {w.competitors && w.competitors.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{w.competitors.map((c) => <Chip key={c} tone="amber">{c}</Chip>)}</div>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ---------------- TEKNISK HELSE ---------------- */}
      {tab === 'teknisk' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-5">
              <div className="text-[12px] text-[#999] font-medium">Snittscore</div>
              <div className="text-[30px] font-bold tracking-tight mt-1" style={{ color: (tech?.avgScore ?? 0) >= 90 ? '#059669' : (tech?.avgScore ?? 0) >= 70 ? '#d97706' : '#dc2626' }}>{tech ? tech.avgScore : '—'}<span className="text-[15px] text-[#bbb] font-medium">/100</span></div>
            </Card>
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">Sider revidert</div><div className="text-[30px] font-bold tracking-tight mt-1">{tech ? tech.pageCount : '—'}</div></Card>
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">Kritiske funn</div><div className="text-[30px] font-bold tracking-tight mt-1" style={{ color: tech?.totals?.error ? '#dc2626' : '#059669' }}>{tech ? tech.totals?.error ?? 0 : '—'}</div></Card>
            <Card className="p-5"><div className="text-[12px] text-[#999] font-medium">Advarsler</div><div className="text-[30px] font-bold tracking-tight mt-1">{tech ? tech.totals?.warn ?? 0 : '—'}</div></Card>
          </div>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-black/[0.05]">
              <div>
                <div className="text-[15px] font-bold">Side-for-side-revisjon</div>
                <div className="text-[12px] text-[#999]">Reviderer {tech?.base || 'prod'} (det Google faktisk ser) · {fmtDate(tech?.runAt)}</div>
              </div>
              <div className="ml-auto"><RunButton label="Kjør revisjon" running={running === 'tech'} onClick={() => run('tech')} /></div>
            </div>
            {!tech ? (
              <div className="px-5 py-10 text-center text-[#999] text-[14px]">Ingen revisjon ennå — trykk «Kjør revisjon».</div>
            ) : (
              <div className="divide-y divide-black/[0.04]">
                {[...(tech.pages || [])].sort((a, b) => a.score - b.score).map((p) => {
                  const open = expanded === `pg:${p.url}`;
                  const path = p.url.replace(/^https?:\/\/[^/]+/, '') || '/';
                  return (
                    <div key={p.url}>
                      <button onClick={() => setExpanded(open ? null : `pg:${p.url}`)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#fafaf9] text-left">
                        {open ? <ChevronDown className="w-4 h-4 text-[#bbb] shrink-0" /> : <ChevronRight className="w-4 h-4 text-[#bbb] shrink-0" />}
                        <span className={`inline-flex items-center justify-center min-w-[44px] h-7 rounded-full text-[13px] font-bold ${p.score >= 90 ? 'bg-emerald-100 text-emerald-700' : p.score >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{p.score}</span>
                        <span className="text-[13.5px] font-semibold text-[#0a0a0a] truncate">{path}</span>
                        <span className="ml-auto flex items-center gap-1.5">
                          {p.issues.filter((i) => i.sev === 'error').length > 0 && <Chip tone="red">{p.issues.filter((i) => i.sev === 'error').length} feil</Chip>}
                          {p.issues.filter((i) => i.sev === 'warn').length > 0 && <Chip tone="amber">{p.issues.filter((i) => i.sev === 'warn').length} adv.</Chip>}
                          {p.issues.length === 0 && <Chip tone="green"><CheckCircle2 className="w-3 h-3" /> Perfekt</Chip>}
                        </span>
                      </button>
                      {open && (
                        <div className="px-5 pb-5 pt-1">
                          {p.issues.length > 0 && (
                            <div className="space-y-1.5 mb-3">
                              {p.issues.map((i, idx) => (
                                <div key={idx} className="flex items-center gap-2 text-[13px]">
                                  {i.sev === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" /> : i.sev === 'warn' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Info className="w-3.5 h-3.5 text-[#bbb] shrink-0" />}
                                  <span className="text-[#555]">{i.msg}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          {p.metrics && p.metrics.title != null && (
                            <div className="flex flex-wrap gap-2 text-[11.5px] text-[#999]">
                              <Chip>Tittel: {p.metrics.titleLength} tegn</Chip>
                              <Chip>Meta: {p.metrics.metaDescLength} tegn</Chip>
                              <Chip>H1: {p.metrics.h1Count}</Chip>
                              <Chip>~{p.metrics.wordCount} ord</Chip>
                              <Chip>{p.metrics.internalLinks} interne lenker</Chip>
                              {(p.metrics.jsonLdTypes || []).length > 0 && <Chip tone="violet">Schema: {(p.metrics.jsonLdTypes || []).slice(0, 4).join(', ')}</Chip>}
                            </div>
                          )}
                          <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-3 text-[12.5px] text-[#7c5cf0] font-semibold hover:underline"><ExternalLink className="w-3 h-3" /> Åpne siden</a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {/* ---------------- INNSTILLINGER ---------------- */}
      {tab === 'innstillinger' && <SeoSettings apiKey={apiKey} config={data?.config} onSaved={load} />}
    </div>
  );
}

function SeoSettings({ apiKey, config, onSaved }) {
  const [keywords, setKeywords] = useState((config?.keywords || []).join('\n'));
  const [questions, setQuestions] = useState((config?.aeoQuestions || []).join('\n'));
  const [competitors, setCompetitors] = useState((config?.competitors || []).join('\n'));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/seo/config?key=${encodeURIComponent(apiKey)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.split('\n').map((x) => x.trim()).filter(Boolean),
          aeoQuestions: questions.split('\n').map((x) => x.trim()).filter(Boolean),
          competitors: competitors.split('\n').map((x) => x.trim()).filter(Boolean),
        }),
      });
      const j = await r.json();
      if (j.ok) { setSaved(true); setTimeout(() => setSaved(false), 2500); onSaved && onSaved(); }
    } catch (e) { /* vis stille */ }
    setSaving(false);
  };

  const Field = ({ label, sub, value, onChange, rows = 8 }) => (
    <div>
      <div className="text-[13.5px] font-bold">{label}</div>
      <div className="text-[12px] text-[#999] mb-2">{sub}</div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 text-[13.5px] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#7c5cf0]/30 font-mono" />
    </div>
  );

  return (
    <Card className="p-6 space-y-5 max-w-3xl">
      <div className="text-[12.5px] text-[#999] bg-[#fafaf9] rounded-xl px-4 py-3 flex items-start gap-2">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-[#7c5cf0]" />
        <span>Ett element per linje. Posisjonssjekken bruker <b>ett SerpApi-søk per nøkkelord</b> (kvote ~100/mnd, deles med konkurrentgalleriet) — maks 15 nøkkelord. AI-sjekken bruker OpenAI (liten kostnad per kjøring).</span>
      </div>
      <Field label="Nøkkelord (Google-posisjoner)" sub="Kommersielle søk kundene dine faktisk bruker — maks 15" value={keywords} onChange={setKeywords} rows={10} />
      <Field label="AEO-spørsmål (AI-synlighet)" sub="Spørsmål slik ekte boligeiere stiller dem til en AI-assistent — maks 10" value={questions} onChange={setQuestions} rows={7} />
      <Field label="Konkurrenter (navnegjenkjenning i AI-svar)" sub="Små bokstaver, ett navn per linje" value={competitors} onChange={setCompetitors} rows={6} />
      <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold hover:bg-[#2a2a2a] disabled:opacity-60">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
        {saved ? 'Lagret!' : 'Lagre innstillinger'}
      </button>
    </Card>
  );
}
