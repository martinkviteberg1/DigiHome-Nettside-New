'use client';

/*
 * StatsView — fullstendig analyse for en sendt kampanje:
 * nøkkeltall, klikk per lenke, aktivitet per dag og mottaker-nivå (hvem
 * åpnet/klikket). Data fra GET /admin/newsletter/campaign.
 */

import React, { useMemo, useState } from 'react';
import {
  ArrowLeft, Copy, Search, MousePointerClick, MailOpen, Send as SendIcon,
  AlertTriangle, Eye, X, Loader2, UserMinus, Timer, Monitor, Smartphone, UserPlus,
} from 'lucide-react';

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null);
const fmtMins = (m) => (m == null ? '—' : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} t` : `${Math.round(m / 1440)} d`);
const DEVICE_LABEL = { mobil: 'Mobil', desktop: 'Desktop', nettbrett: 'Nettbrett', proxy: 'Skjult (proxy)', ukjent: 'Ukjent' };
const CLIENT_LABEL = { gmail: 'Gmail', apple: 'Apple Mail', outlook: 'Outlook', thunderbird: 'Thunderbird', nettleser: 'Nettleser', annet: 'Annet' };
const SEG_LABEL = { kunder: 'Kunder', abonnenter: 'Abonnenter', leads: 'Utleier-leads', leietakere: 'Leietakere', manuell: 'Manuelt lagt til', ukjent: 'Ukjent' };
const LEAD_STATUS = {
  new: { l: 'Ny', cls: 'text-[#555] bg-[#f3f3f3]' },
  contacted: { l: 'Kontaktet', cls: 'text-sky-700 bg-sky-50' },
  qualified: { l: 'Kvalifisert', cls: 'text-violet-700 bg-violet-50' },
  viewing: { l: 'Befaring', cls: 'text-blue-700 bg-blue-50' },
  offer: { l: 'Tilbud sendt', cls: 'text-indigo-700 bg-indigo-50' },
  won: { l: 'Vunnet', cls: 'text-emerald-700 bg-emerald-50' },
  lost: { l: 'Tapt', cls: 'text-red-700 bg-red-50' },
  disqualified: { l: 'Ikke relevant', cls: 'text-[#888] bg-[#f4f2ef]' },
};

export default function StatsView({ camp, stats, q, onBack, onDuplicate }) {
  const [search, setSearch] = useState('');
  const [onlyEngaged, setOnlyEngaged] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const s = stats || {};

  // Slik så nyhetsbrevet ut — rendres fra kampanjens lagrede blokker
  const openPreview = async () => {
    setPreviewOpen(true);
    if (previewHtml) return;
    try {
      const r = await fetch(`/api/admin/newsletter/preview?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: (camp?.blocks || []).map(({ id, ...rest }) => rest),
          theme: camp?.theme, subject: camp?.subject, preheader: camp?.preheader,
        }),
      });
      const j = await r.json();
      if (j.ok) setPreviewHtml(j.html);
    } catch (e) {}
  };

  const KPIS = [
    { l: 'Sendt', v: s.sent ?? 0, sub: s.failedCount ? `${s.failedCount} feilet` : 'alle levert til SendGrid', icon: SendIcon, warn: !!s.failedCount },
    { l: 'Åpningsrate', v: s.openRate != null ? `${s.openRate} %` : '—', sub: `${s.opensUnique ?? 0} unike · ${s.opens ?? 0} totalt`, icon: MailOpen },
    { l: 'Klikkrate', v: s.clickRate != null ? `${s.clickRate} %` : '—', sub: `${s.clicksUnique ?? 0} unike · ${s.clicks ?? 0} totalt`, icon: MousePointerClick },
    { l: 'Klikk av åpnet', v: s.ctor != null ? `${s.ctor} %` : '—', sub: 'CTOR — innholdets treffsikkerhet', icon: MousePointerClick },
    { l: 'Leads', v: s.leadsCount ?? 0, sub: s.leadsWon ? `${s.leadsWon} vunnet` : 'skjema-innsendinger', icon: UserPlus, hot: (s.leadsCount || 0) > 0 },
    { l: 'Boliginteresser', v: s.propertyInterests ?? 0, sub: 'bekreftet på leietakerkort', icon: MousePointerClick, hot: (s.propertyInterests || 0) > 0 },
    { l: 'Avmeldt', v: s.unsubs ?? 0, sub: s.sent ? `${Math.round(((s.unsubs || 0) / s.sent) * 1000) / 10} % av sendte` : '—', icon: UserMinus, warn: (s.unsubs || 0) > 0 && s.sent && (s.unsubs / s.sent) > 0.02 },
  ];

  const rows = useMemo(() => {
    let list = s.recipientDetails || [];
    if (onlyEngaged) list = list.filter((r) => r.opened || r.clicked);
    const t = search.trim().toLowerCase();
    if (t) list = list.filter((r) => (r.email + ' ' + (r.name || '')).toLowerCase().includes(t));
    return list;
  }, [s.recipientDetails, search, onlyEngaged]);

  const tl = s.timeline || [];
  const tlMax = Math.max(1, ...tl.map((d) => Math.max(d.opens, d.clicks)));

  return (
    <div data-testid="nl-stats-view">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12.5px] font-medium text-[#888] hover:text-[#111]">
        <ArrowLeft size={14} /> Tilbake
      </button>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
        <div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-bold uppercase tracking-[0.08em] px-2.5 py-1">Sendt {fmtDate(camp?.sentAt)}</span>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111] mt-2">{camp?.subject || camp?.title}</h2>
          <p className="text-[13px] text-[#999] mt-0.5">Fra {camp?.fromName || 'DigiHome'} · {s.recipients ?? 0} mottakere</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openPreview} data-testid="nl-stats-view-newsletter"
            className="h-[38px] rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold px-4 flex items-center gap-1.5">
            <Eye size={13} /> Se nyhetsbrevet
          </button>
          <button onClick={onDuplicate} className="h-[38px] rounded-full border border-[#e5e5e5] bg-white text-[12.5px] font-semibold px-4 flex items-center gap-1.5 hover:border-[#c99df0]">
            <Copy size={13} /> Dupliser som ny
          </button>
        </div>
      </div>

      {/* KPI-er */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
        {KPIS.map((k) => (
          <div key={k.l} className={`rounded-2xl border bg-white p-4 ${k.hot ? 'border-[#e3d7f8] bg-[#fdfbff]' : 'border-[#f0f0f0]'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#aaa]">{k.l}</span>
              {React.createElement(k.icon, { size: 14, className: k.warn ? 'text-amber-500' : k.hot ? 'text-[#a052e0]' : 'text-[#c9b3e0]' })}
            </div>
            <p className="text-[26px] font-bold tabular-nums tracking-[-0.02em] text-[#111] mt-1.5">{k.v}</p>
            <p className={`text-[11px] mt-0.5 ${k.warn ? 'text-amber-600 font-medium' : k.hot ? 'text-[#a052e0] font-medium' : 'text-[#999]'}`}>{k.warn ? <AlertTriangle size={10} className="inline mr-1" /> : null}{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Innsikt: tid til åpning + beste time */}
      {(s.medianMinutesToOpen != null || s.bestHour) ? (
        <div className="flex flex-wrap gap-2 mt-3">
          {s.medianMinutesToOpen != null ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf6fe] border border-[#eee0f8] text-[12px] font-medium text-[#7A3EC8] px-3.5 py-1.5">
              <Timer size={12} /> Median tid til åpning: <b>{fmtMins(s.medianMinutesToOpen)}</b>
            </span>
          ) : null}
          {s.bestHour ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#faf6fe] border border-[#eee0f8] text-[12px] font-medium text-[#7A3EC8] px-3.5 py-1.5">
              <MailOpen size={12} /> Flest åpninger: <b>{new Date(s.bestHour + ':00:00').toLocaleString('nb-NO', { day: '2-digit', month: 'short' })} kl. {s.bestHour.slice(11, 13)}</b>
            </span>
          ) : null}
        </div>
      ) : null}

      {/* Engasjement time for time (første 48 t) */}
      {(s.hourly || []).length > 0 ? (
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5 mt-3">
          <p className="text-[13px] font-bold text-[#111]">Engasjement time for time</p>
          <div className="flex items-end gap-[3px] mt-4 h-[110px]">
            {s.hourly.slice(0, 48).map((h) => {
              const hMax = Math.max(1, ...s.hourly.slice(0, 48).map((x) => x.opens + x.clicks));
              return (
                <div key={h.hour} className="flex-1 min-w-[4px] flex flex-col justify-end h-full group relative" title={`${h.hour.slice(11, 13)}:00 — ${h.opens} åpn. · ${h.clicks} klikk`}>
                  <div className="rounded-t-[3px]" style={{ height: `${(h.clicks / hMax) * 100}%`, background: '#d298ff', minHeight: h.clicks ? 3 : 0 }} />
                  <div className="rounded-t-[3px]" style={{ height: `${(h.opens / hMax) * 100}%`, background: '#0a0a0a', minHeight: h.opens ? 3 : 0 }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] text-[#bbb]">{s.hourly[0] ? `${new Date(s.hourly[0].hour + ':00:00').toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' })} kl. ${s.hourly[0].hour.slice(11, 13)}` : ''}</span>
            <span className="text-[10.5px] text-[#bbb]"><span className="inline-block w-2 h-2 rounded-full bg-[#0a0a0a] mr-1" />Åpninger <span className="inline-block w-2 h-2 rounded-full ml-3 mr-1" style={{ background: '#d298ff' }} />Klikk</span>
            <span className="text-[10px] text-[#bbb]">{s.hourly.length > 1 ? `kl. ${s.hourly[Math.min(47, s.hourly.length - 1)].hour.slice(11, 13)}` : ''}</span>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        {/* Klikk per lenke */}
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
          <p className="text-[13px] font-bold text-[#111]">Klikk per lenke</p>
          {(s.clicksByUrl || []).length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] mt-3">Ingen klikk registrert ennå.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {s.clicksByUrl.map((u, i) => {
                const max = Math.max(1, ...s.clicksByUrl.map((x) => x.total));
                return (
                  <div key={i}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[12px] text-[#555] truncate flex-1">{u.url.replace(/^https?:\/\//, '')}</span>
                      <span className="text-[12px] font-bold tabular-nums text-[#111] shrink-0">{u.total} <span className="font-normal text-[#aaa]">({u.unique} unike)</span></span>
                    </div>
                    <div className="h-[5px] rounded-full bg-[#f4f2ef] mt-1"><div className="h-full rounded-full" style={{ width: `${(u.total / max) * 100}%`, background: '#d298ff' }} /></div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Aktivitet per dag */}
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
          <p className="text-[13px] font-bold text-[#111]">Aktivitet per dag</p>
          {tl.length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] mt-3">Ingen aktivitet ennå.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {tl.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="text-[11px] tabular-nums text-[#999] w-[64px] shrink-0">{new Date(d.day).toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' })}</span>
                  <div className="flex-1 space-y-1">
                    <div className="h-[5px] rounded-full bg-[#f4f2ef]"><div className="h-full rounded-full bg-[#0a0a0a]" style={{ width: `${(d.opens / tlMax) * 100}%` }} /></div>
                    <div className="h-[5px] rounded-full bg-[#f4f2ef]"><div className="h-full rounded-full" style={{ width: `${(d.clicks / tlMax) * 100}%`, background: '#d298ff' }} /></div>
                  </div>
                  <span className="text-[11px] tabular-nums text-[#777] w-[110px] text-right shrink-0">{d.opens} åpn. · {d.clicks} klikk</span>
                </div>
              ))}
              <p className="text-[10.5px] text-[#bbb] pt-1"><span className="inline-block w-2 h-2 rounded-full bg-[#0a0a0a] mr-1" />Åpninger <span className="inline-block w-2 h-2 rounded-full ml-3 mr-1" style={{ background: '#d298ff' }} />Klikk</p>
            </div>
          )}
        </div>
      </div>

      {/* Leads fra dette nyhetsbrevet — lukker løkken sendt → åpnet → klikket → lead */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5 mt-3" data-testid="nl-stats-leads">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[13px] font-bold text-[#111] flex items-center gap-1.5"><UserPlus size={13} className="text-[#a052e0]" /> Leads fra dette nyhetsbrevet</p>
          {(s.leadsGenerated || []).length > 0 && (
            <span className="text-[11.5px] font-bold text-[#a052e0] tabular-nums">{s.leadsCount}{s.leadsWon ? ` · ${s.leadsWon} vunnet` : ''}</span>
          )}
        </div>
        {(s.leadsGenerated || []).length === 0 ? (
          <p className="text-[12.5px] text-[#aaa] mt-3">Ingen skjema-innsendinger sporet til denne kampanjen ennå. Leads fanges både via kampanje-lenkene og ved at mottakerens e-post gjenkjennes i skjemaet senere.</p>
        ) : (
          <div className="divide-y divide-[#f7f6f4] mt-2">
            {s.leadsGenerated.map((l) => {
              const st = LEAD_STATUS[l.status] || LEAD_STATUS.new;
              return (
                <div key={l.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-[13px] font-medium text-[#1c1c1c] truncate">{l.name || l.email || '(uten navn)'}</span>
                    {l.name && l.email ? <span className="block text-[11px] text-[#aaa] truncate">{l.email}</span> : null}
                  </span>
                  <span className="text-[10.5px] text-[#b3aea7] shrink-0 hidden sm:block" title={l.via === 'landing' ? 'Kom via kampanje-lenke i nyhetsbrevet' : 'E-postadressen gjenkjent fra mottakerlisten'}>
                    {l.via === 'landing' ? 'via lenke' : 'e-post-match'}
                  </span>
                  {l.selfService && <span className="text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-1.5 py-0.5 shrink-0">Selvbetjent</span>}
                  {l.wonValue ? <span className="text-[10.5px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 shrink-0">{Math.round(l.wonValue).toLocaleString('nb-NO')} kr</span> : null}
                  <span className={`text-[10.5px] font-semibold rounded-full px-2 py-0.5 shrink-0 ${st.cls}`}>{st.l}</span>
                  <span className="text-[11px] tabular-nums text-[#999] shrink-0 w-[92px] text-right">{fmtDate(l.createdAt)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Enheter/klienter + segmenter */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
          <p className="text-[13px] font-bold text-[#111]">Enheter og e-postklienter <span className="font-normal text-[11px] text-[#aaa]">(unike åpnere)</span></p>
          {(s.devices || []).length === 0 && (s.clients || []).length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] mt-3">Ingen åpninger registrert ennå.</p>
          ) : (
            <div className="grid grid-cols-2 gap-5 mt-3">
              {[['Enhet', s.devices || [], DEVICE_LABEL, Smartphone], ['Klient', s.clients || [], CLIENT_LABEL, Monitor]].map(([title, list, labels, Icon]) => {
                const max = Math.max(1, ...list.map((x) => x.n));
                return (
                  <div key={title}>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#bbb] flex items-center gap-1"><Icon size={11} /> {title}</p>
                    <div className="mt-2 space-y-2">
                      {list.slice(0, 5).map((d) => (
                        <div key={d.key}>
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="text-[11.5px] text-[#555]">{labels[d.key] || d.key}</span>
                            <span className="text-[11.5px] font-bold tabular-nums text-[#111]">{d.n}</span>
                          </div>
                          <div className="h-[4px] rounded-full bg-[#f4f2ef] mt-0.5"><div className="h-full rounded-full bg-[#0a0a0a]" style={{ width: `${(d.n / max) * 100}%` }} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-[10px] text-[#bbb] mt-3">Gmail/Apple henter bilder via proxy — «Skjult (proxy)» betyr at reell enhet ikke kan avleses.</p>
        </div>
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-5">
          <p className="text-[13px] font-bold text-[#111]">Engasjement per målgruppe</p>
          {(s.segments || []).length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] mt-3">Ingen segmentdata.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-[1.4fr_0.6fr_1fr_1fr] gap-2 text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#bbb]">
                <span>Segment</span><span className="text-right">Sendt</span><span className="text-right">Åpnet</span><span className="text-right">Klikket</span>
              </div>
              {s.segments.map((g) => (
                <div key={g.segment} className="grid grid-cols-[1.4fr_0.6fr_1fr_1fr] gap-2 items-center">
                  <span className="text-[12px] font-semibold text-[#111] truncate">{SEG_LABEL[g.segment] || g.segment}</span>
                  <span className="text-[12px] tabular-nums text-[#777] text-right">{g.sent}</span>
                  <span className="text-[12px] tabular-nums text-right font-semibold text-emerald-600">{g.opened} <span className="font-normal text-[#bbb]">({g.sent ? Math.round((g.opened / g.sent) * 100) : 0} %)</span></span>
                  <span className="text-[12px] tabular-nums text-right font-semibold text-[#a052e0]">{g.clicked} <span className="font-normal text-[#bbb]">({g.sent ? Math.round((g.clicked / g.sent) * 100) : 0} %)</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mottakere */}
      <div className="rounded-2xl border border-[#f0f0f0] bg-white mt-3 overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#f4f4f4]">
          <p className="text-[13px] font-bold text-[#111]">Mottakere <span className="font-normal text-[#aaa]">({rows.length})</span></p>
          <div className="flex items-center gap-2">
            <button onClick={() => setOnlyEngaged((v) => !v)}
              className={`h-[32px] rounded-full text-[11.5px] font-semibold px-3.5 ${onlyEngaged ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>
              Kun engasjerte
            </button>
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbb]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Søk e-post…"
                className="h-[32px] w-[180px] rounded-lg border border-[#e8e8e8] pl-7 pr-3 text-[12px] outline-none focus:border-[#c99df0]" />
            </div>
          </div>
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-[12.5px] text-[#aaa] text-center py-10">Ingen mottakere matcher.</p>
          ) : rows.map((r) => (
            <div key={r.email} className="grid grid-cols-[1.6fr_1fr_1fr_0.7fr_0.6fr] gap-3 px-5 py-2.5 border-b border-[#fafafa] items-center">
              <span className="text-[12.5px] font-medium text-[#111] truncate">{r.email}</span>
              <span className="text-[11.5px] text-[#999] truncate">{r.name || '—'} · {SEG_LABEL[r.segment] || r.segment}</span>
              <span className={`text-[11px] font-semibold ${r.opened ? 'text-emerald-600' : 'text-[#ccc]'}`}>
                {r.opened ? `✓ ${fmtTime(r.openedAt) || 'Åpnet'}` : '— Ikke åpnet'}
              </span>
              <span className={`text-[11px] font-semibold ${r.clicked ? 'text-[#a052e0]' : 'text-[#ccc]'}`}>{r.clicked ? `✓ ${r.clicksN || 1} klikk` : '— Klikk'}</span>
              <span className={`text-[11px] font-semibold ${r.failed ? 'text-red-500' : 'text-[#ccc]'}`}>{r.failed ? 'Feilet' : 'Levert'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Slik så nyhetsbrevet ut */}
      {previewOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setPreviewOpen(false)}>
          <div className="bg-[#f0ede9] rounded-2xl overflow-hidden max-h-[90vh] w-full" style={{ maxWidth: previewDevice === 'mobile' ? 420 : 700 }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between bg-white px-4 py-2.5 border-b border-[#eee]">
              <p className="text-[12.5px] font-bold">Slik så nyhetsbrevet ut</p>
              <div className="flex items-center gap-2">
                <div className="flex rounded-full bg-[#f4f2ef] p-0.5">
                  {[['desktop', Monitor], ['mobile', Smartphone]].map(([k, Icon]) => (
                    <button key={k} onClick={() => setPreviewDevice(k)}
                      className={`w-[30px] h-[24px] rounded-full flex items-center justify-center ${previewDevice === k ? 'bg-white shadow-sm text-[#111]' : 'text-[#999]'}`}>
                      <Icon size={12} />
                    </button>
                  ))}
                </div>
                <button onClick={() => setPreviewOpen(false)}><X size={16} className="text-[#999] hover:text-[#111]" /></button>
              </div>
            </div>
            {previewHtml
              ? <iframe title="sent-preview" srcDoc={previewHtml} className="w-full" style={{ height: '78vh', border: 0 }} />
              : <div className="h-[300px] flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[#a052e0]" /></div>}
          </div>
        </div>
      ) : null}
    </div>
  );
}
