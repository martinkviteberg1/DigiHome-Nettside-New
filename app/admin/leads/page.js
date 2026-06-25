'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw, Send, CheckCircle2, AlertCircle, Lock } from 'lucide-react';

export default function AdminLeadsPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [data, setData] = useState({ leads: [], tenants: [] });
  const [loading, setLoading] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('leads');

  useEffect(() => {
    try { const k = localStorage.getItem('dh_admin_key'); if (k) { setKey(k); } } catch (e) {}
  }, []);

  const load = useCallback(async (k) => {
    setLoading(true); setErr('');
    try {
      const res = await fetch(`/api/admin/leads?key=${encodeURIComponent(k)}`);
      if (res.status === 401) { setErr('Feil nøkkel'); setAuthed(false); setLoading(false); return; }
      const json = await res.json();
      setData({ leads: json.leads || [], tenants: json.tenants || [] });
      setAuthed(true);
      try { localStorage.setItem('dh_admin_key', k); } catch (e) {}
    } catch (e) { setErr('Kunne ikke laste data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (key && !authed) load(key); /* auto-load if key cached */ }, [key]); // eslint-disable-line

  const doForward = async () => {
    setForwarding(true);
    try {
      const res = await fetch(`/api/admin/forward?key=${encodeURIComponent(key)}`, { method: 'POST' });
      const json = await res.json();
      if (json.success) await load(key);
    } catch (e) {} finally { setForwarding(false); }
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6"><Lock className="w-5 h-5 text-[#cf97fc]" /><h1 className="text-[22px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Lead-admin</h1></div>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(key); }} placeholder="Admin-nøkkel" className="w-full h-12 px-4 rounded-xl border border-[#e0e0e0] bg-white outline-none focus:border-[#cf97fc] text-[15px]" />
          {err && <p className="text-[13px] text-red-500 mt-2">{err}</p>}
          <button onClick={() => load(key)} disabled={loading} className="mt-4 w-full h-12 rounded-xl bg-[#0a0a0a] text-white font-semibold text-[14px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Logg inn'}</button>
        </div>
      </div>
    );
  }

  const rows = tab === 'leads' ? data.leads : data.tenants;
  const pendingCount = [...data.leads, ...data.tenants].filter((r) => r.forwarded !== true).length;

  return (
    <div className="min-h-screen bg-[#fdfcfb] px-5 sm:px-10 py-10">
      <div className="max-w-[1200px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-[28px] font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Lead-oversikt</h1>
            <p className="text-[13px] text-[#888] mt-1">Lokalt lagret · status for videresending til DigiHome AS</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => load(key)} disabled={loading} className="h-10 px-4 rounded-full border border-[#e0e0e0] bg-white text-[13px] font-medium flex items-center gap-2 hover:bg-[#f7f7f5] transition-colors">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Oppdater</button>
            <button onClick={doForward} disabled={forwarding || pendingCount === 0} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-40 active:scale-[0.97] transition-transform">{forwarding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Re-send {pendingCount > 0 ? `(${pendingCount})` : ''}</button>
          </div>
        </div>

        <div className="flex gap-2 mb-5">
          {[{ k: 'leads', l: `Utleiere (${data.leads.length})` }, { k: 'tenants', l: `Leietakere (${data.tenants.length})` }].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={`px-4 py-2 rounded-full text-[13px] font-semibold transition-colors ${tab === t.k ? 'bg-[#0a0a0a] text-white' : 'bg-white border border-[#e5e5e5] text-[#666]'}`}>{t.l}</button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-[#eee] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead><tr className="border-b border-[#f0f0f0] text-[11px] uppercase tracking-[0.06em] text-[#aaa]">
                <th className="py-3 px-4 font-semibold">Navn</th>
                <th className="py-3 px-4 font-semibold">Kontakt</th>
                <th className="py-3 px-4 font-semibold">{tab === 'leads' ? 'Eiendom' : 'Ønsker'}</th>
                <th className="py-3 px-4 font-semibold">Mottatt</th>
                <th className="py-3 px-4 font-semibold">Videresendt</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 && (<tr><td colSpan={5} className="py-10 text-center text-[14px] text-[#aaa]">Ingen registreringer ennå</td></tr>)}
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#f6f6f6] hover:bg-[#fafafa] transition-colors">
                    <td className="py-3 px-4 text-[14px] font-medium text-[#222]">{r.name || '—'}</td>
                    <td className="py-3 px-4 text-[13px] text-[#666]"><div>{r.email}</div><div className="text-[#aaa]">{r.phone}</div></td>
                    <td className="py-3 px-4 text-[13px] text-[#666] max-w-[280px]">
                      {tab === 'leads'
                        ? <span>{r.address || '—'}{r.property_type ? ` · ${r.property_type}` : ''}{r.sqm ? ` · ${r.sqm} m²` : ''}{r.num_properties > 1 ? ` · ${r.num_properties} enheter` : ''}</span>
                        : <span>{r.preferred_area || '—'}{r.budget_max ? ` · inntil ${r.budget_max} kr` : ''}{r.bedrooms ? ` · ${r.bedrooms} sov` : ''}</span>}
                    </td>
                    <td className="py-3 px-4 text-[12px] text-[#999] whitespace-nowrap">{r.createdAt ? new Date(r.createdAt).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="py-3 px-4">
                      {r.forwarded === true
                        ? <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Sendt</span>
                        : <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber-600" title={r.forward_error || ''}><AlertCircle className="w-3.5 h-3.5" /> Venter{r.forward_error ? '' : ''}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
