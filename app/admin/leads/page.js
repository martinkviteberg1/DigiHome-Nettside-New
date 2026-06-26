'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2, RefreshCw, Send, CheckCircle2, AlertCircle, Lock, Trash2,
  LayoutDashboard, Activity, BarChart3, Users, Sparkles, FileText,
} from 'lucide-react';
import OverviewTab from '@/components/admin/OverviewTab';
import TrafficTab from '@/components/admin/TrafficTab';
import IntelTab from '@/components/admin/IntelTab';
import InsightTab from '@/components/admin/InsightTab';

const TABS = [
  { k: 'oversikt', l: 'Oversikt', icon: LayoutDashboard },
  { k: 'trafikk', l: 'Trafikk', icon: Activity },
  { k: 'innsikt', l: 'Lead-innsikt', icon: BarChart3 },
  { k: 'ai', l: 'AI-assistent', icon: Sparkles },
  { k: 'leads', l: 'Leads', icon: Users },
];
const RANGES = [{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }];

export default function AdminDashboardPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState({ leads: [], tenants: [] });
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('oversikt');
  const [leadSub, setLeadSub] = useState('leads');
  const [days, setDays] = useState(30);

  useEffect(() => { try { const k = localStorage.getItem('dh_admin_key'); if (k) setKey(k); } catch (e) {} }, []);

  const load = useCallback(async (k, d) => {
    const dd = d || days;
    setLoading(true); setErr('');
    try {
      const [r1, r2] = await Promise.all([
        fetch(`/api/admin/leads?key=${encodeURIComponent(k)}`),
        fetch(`/api/admin/analytics?key=${encodeURIComponent(k)}&days=${dd}`),
      ]);
      if (r1.status === 401) { setErr('Feil nøkkel'); setAuthed(false); setLoading(false); return; }
      const j1 = await r1.json();
      setData({ leads: j1.leads || [], tenants: j1.tenants || [] });
      if (r2.ok) { const j2 = await r2.json(); setAnalytics(j2); }
      setAuthed(true);
      try { localStorage.setItem('dh_admin_key', k); } catch (e) {}
    } catch (e) { setErr('Kunne ikke laste data'); }
    finally { setLoading(false); }
  }, [days]);

  useEffect(() => { if (key && !authed) load(key); }, [key]); // eslint-disable-line

  const changeDays = (d) => { setDays(d); if (authed) load(key, d); };

  const doForward = async () => {
    setForwarding(true);
    try {
      const res = await fetch(`/api/admin/forward?key=${encodeURIComponent(key)}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) await load(key);
    } catch (e) {} finally { setForwarding(false); }
  };

  const doDelete = async (payload, confirmMsg) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setDeleting(true);
    try {
      const type = payload.type || (leadSub === 'tenants' ? 'tenant' : 'lead');
      const res = await fetch(`/api/admin/delete?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
      });
      const json = await res.json();
      if (json.success) await load(key);
    } catch (e) {} finally { setDeleting(false); }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6"><Lock className="w-5 h-5 text-[#cf97fc]" /><h1 className="text-[22px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome Innsikt</h1></div>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(key); }} placeholder="Admin-nøkkel" className="w-full h-12 px-4 rounded-xl border border-[#e0e0e0] bg-white outline-none focus:border-[#cf97fc] text-[15px]" data-testid="admin-key-input" />
          {err && <p className="text-[13px] text-red-500 mt-2">{err}</p>}
          <button onClick={() => load(key)} disabled={loading} data-testid="admin-login-btn" className="mt-4 w-full h-12 rounded-xl bg-[#0a0a0a] text-white font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Logg inn'}</button>
        </div>
      </div>
    );
  }

  const rows = leadSub === 'leads' ? data.leads : data.tenants;
  const pendingCount = [...data.leads, ...data.tenants].filter((r) => r.forwarded !== true).length;
  const tabPending = rows.filter((r) => r.forwarded !== true).length;

  return (
    <div className="min-h-screen bg-[#fbfaf9] px-4 sm:px-8 py-8">
      <div className="max-w-[1240px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[26px] font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome Innsikt</h1>
            <p className="text-[13px] text-[#999] mt-0.5">Førsteparts analyse · cookieless · GDPR-trygt</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/admin/artikler" className="h-9 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center gap-2 text-[12px] font-semibold text-[#666] hover:text-[#0a0a0a] transition-colors"><FileText className="w-3.5 h-3.5" /> Artikler</a>
            <div className="flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
              {RANGES.map((r) => (
                <button key={r.d} onClick={() => changeDays(r.d)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${days === r.d ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:text-[#0a0a0a]'}`}>{r.l}</button>
              ))}
            </div>
            <button onClick={() => load(key)} disabled={loading} className="h-9 w-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#666] hover:text-[#0a0a0a] transition-colors">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 rounded-full text-[13px] font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${tab === t.k ? 'bg-[#0a0a0a] text-white shadow-[0_4px_14px_rgba(0,0,0,0.15)]' : 'bg-white text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:text-[#0a0a0a]'}`}>
                <Icon className="w-4 h-4" /> {t.l}
                {t.k === 'leads' && pendingCount > 0 && <span className="ml-0.5 text-[10px] bg-amber-400 text-white rounded-full px-1.5 py-0.5 leading-none">{pendingCount}</span>}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {tab === 'oversikt' && <OverviewTab traffic={analytics && analytics.traffic} leads={analytics && analytics.leads} />}
        {tab === 'trafikk' && <TrafficTab traffic={analytics && analytics.traffic} />}
        {tab === 'innsikt' && <IntelTab leads={analytics && analytics.leads} />}
        {tab === 'ai' && <InsightTab apiKey={key} days={days} />}

        {tab === 'leads' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-2">
                {[{ k: 'leads', l: `Utleiere (${data.leads.length})` }, { k: 'tenants', l: `Leietakere (${data.tenants.length})` }].map((t) => (
                  <button key={t.k} onClick={() => setLeadSub(t.k)} className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${leadSub === t.k ? 'bg-[#cf97fc] text-white' : 'bg-white text-[#666] shadow-[0_2px_10px_rgba(0,0,0,0.03)]'}`}>{t.l}</button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={doForward} disabled={forwarding || pendingCount === 0} className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">{forwarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Re-send {pendingCount > 0 ? `(${pendingCount})` : ''}</button>
                <button onClick={() => doDelete({ scope: 'pending' }, `Slette ${tabPending} ventende ${leadSub === 'leads' ? 'utleier' : 'leietaker'}-leads? Kan ikke angres.`)} disabled={deleting || tabPending === 0} className="h-9 px-4 rounded-full bg-white text-red-600 text-[12px] font-semibold flex items-center gap-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] disabled:opacity-40 hover:bg-red-50 active:scale-[0.97] transition-all">{deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Slett ventende {tabPending > 0 ? `(${tabPending})` : ''}</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead><tr className="border-b border-[#f0f0f0] text-[11px] uppercase tracking-[0.06em] text-[#aaa]">
                    <th className="py-3 px-4 font-semibold">Navn</th>
                    <th className="py-3 px-4 font-semibold">Kontakt</th>
                    <th className="py-3 px-4 font-semibold">{leadSub === 'leads' ? 'Eiendom' : 'Ønsker'}</th>
                    <th className="py-3 px-4 font-semibold">Kilde</th>
                    <th className="py-3 px-4 font-semibold">Mottatt</th>
                    <th className="py-3 px-4 font-semibold">Sendt</th>
                    <th className="py-3 px-4 font-semibold text-right">Handling</th>
                  </tr></thead>
                  <tbody>
                    {rows.length === 0 && (<tr><td colSpan={7} className="py-10 text-center text-[14px] text-[#aaa]">Ingen registreringer ennå</td></tr>)}
                    {rows.map((r) => (
                      <tr key={r.id} className="border-b border-[#f6f6f6] hover:bg-[#fafafa] transition-colors">
                        <td className="py-3 px-4 text-[14px] font-medium text-[#222]">{r.name || '—'}</td>
                        <td className="py-3 px-4 text-[13px] text-[#666]"><div>{r.email}</div><div className="text-[#aaa]">{r.phone}</div></td>
                        <td className="py-3 px-4 text-[13px] text-[#666] max-w-[260px]">
                          {leadSub === 'leads'
                            ? <span>{r.address || '—'}{r.property_type ? ` · ${r.property_type}` : ''}{r.sqm ? ` · ${r.sqm} m²` : ''}{r.num_properties > 1 ? ` · ${r.num_properties} enheter` : ''}</span>
                            : <span>{r.preferred_area || '—'}{r.budget_max ? ` · inntil ${r.budget_max} kr` : ''}{r.bedrooms ? ` · ${r.bedrooms} sov` : ''}</span>}
                        </td>
                        <td className="py-3 px-4 text-[12px]">
                          {(r.attribution && r.attribution.channel)
                            ? <span className="inline-flex items-center rounded-full bg-[#f4f0fb] text-[#8b5cf6] px-2 py-0.5 font-semibold">{r.attribution.channel}</span>
                            : <span className="text-[#bbb]">{r.source || '—'}</span>}
                        </td>
                        <td className="py-3 px-4 text-[12px] text-[#999] whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                        <td className="py-3 px-4">
                          {r.forwarded === true
                            ? <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Sendt</span>
                            : <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600" title={r.forward_error || ''}><AlertCircle className="w-3.5 h-3.5" /> Venter</span>}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button onClick={() => doDelete({ id: r.id }, `Slette lead fra ${r.name || r.email || 'denne kontakten'}?`)} disabled={deleting} aria-label="Slett" className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
