'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2, Lock, Plus, Trash2, Sparkles, ArrowLeft, Save, Eye, FileText, Pencil,
} from 'lucide-react';

const empty = { id: null, title: '', slug: '', excerpt: '', content: '', coverImage: '', tags: '', seoTitle: '', seoDescription: '', status: 'draft' };

export default function AdminArtiklerPage() {
  const [key, setKey] = useState('');
  const [authed, setAuthed] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [view, setView] = useState('list'); // list | edit
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => { try { const k = localStorage.getItem('dh_admin_key'); if (k) setKey(k); } catch (e) {} }, []);

  const load = useCallback(async (k) => {
    setLoading(true); setErr('');
    try {
      const auth = await fetch(`/api/admin/leads?key=${encodeURIComponent(k)}`);
      if (auth.status === 401) { setErr('Feil nøkkel'); setAuthed(false); setLoading(false); return; }
      const r = await fetch(`/api/posts?all=1&key=${encodeURIComponent(k)}`);
      const j = await r.json();
      setPosts(j.posts || []);
      setAuthed(true);
      try { localStorage.setItem('dh_admin_key', k); } catch (e) {}
    } catch (e) { setErr('Kunne ikke laste data'); } finally { setLoading(false); }
  }, []);

  useEffect(() => { if (key && !authed) load(key); }, [key]); // eslint-disable-line

  const openNew = () => { setForm(empty); setAiTopic(''); setMsg(''); setView('edit'); };

  const openEdit = async (p) => {
    setMsg('');
    try {
      const r = await fetch(`/api/posts?slug=${encodeURIComponent(p.slug)}&key=${encodeURIComponent(key)}`);
      const j = await r.json();
      const full = j.post || p;
      setForm({
        id: full.id, title: full.title || '', slug: full.slug || '', excerpt: full.excerpt || '',
        content: full.content || '', coverImage: full.coverImage || '', tags: (full.tags || []).join(', '),
        seoTitle: full.seoTitle || '', seoDescription: full.seoDescription || '', status: full.status || 'draft',
      });
      setView('edit');
    } catch (e) { setErr('Kunne ikke åpne artikkel'); }
  };

  const save = async (statusOverride) => {
    if (!form.title.trim()) { setMsg('Tittel mangler'); return; }
    setSaving(true); setMsg('');
    try {
      const payload = { ...form, status: statusOverride || form.status };
      const r = await fetch(`/api/admin/posts?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (j.success) { await load(key); setView('list'); }
      else setMsg(j.error || 'Kunne ikke lagre');
    } catch (e) { setMsg('Kunne ikke lagre'); } finally { setSaving(false); }
  };

  const del = async (id) => {
    if (!window.confirm('Slette denne artikkelen? Kan ikke angres.')) return;
    try {
      await fetch(`/api/admin/posts?key=${encodeURIComponent(key)}`, {
        method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      await load(key);
    } catch (e) {}
  };

  const generate = async () => {
    if (aiTopic.trim().length < 4) { setMsg('Skriv et tema (minst 4 tegn)'); return; }
    setGenerating(true); setMsg('');
    try {
      const r = await fetch(`/api/admin/generate-article?key=${encodeURIComponent(key)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: aiTopic }),
      });
      const j = await r.json();
      if (j.ok && j.draft) {
        const d = j.draft;
        setForm((f) => ({
          ...f,
          title: d.title || f.title, excerpt: d.excerpt || f.excerpt, content: d.content || f.content,
          tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || f.tags),
          seoTitle: d.seoTitle || f.seoTitle, seoDescription: d.seoDescription || f.seoDescription,
        }));
        setMsg('AI-utkast generert ✓ Se gjennom og rediger før publisering.');
      } else setMsg(j.error || 'AI utilgjengelig — prøv igjen');
    } catch (e) { setMsg('AI utilgjengelig'); } finally { setGenerating(false); }
  };

  // --- Login ---
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center px-5">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-6"><Lock className="w-5 h-5 text-[#cf97fc]" /><h1 className="text-[22px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>DigiHome Artikler</h1></div>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') load(key); }} placeholder="Admin-nøkkel" className="w-full h-12 px-4 rounded-xl border border-[#e0e0e0] bg-white outline-none focus:border-[#cf97fc] text-[15px]" />
          {err && <p className="text-[13px] text-red-500 mt-2">{err}</p>}
          <button onClick={() => load(key)} disabled={loading} className="mt-4 w-full h-12 rounded-xl bg-[#0a0a0a] text-white font-semibold text-[14px] flex items-center justify-center gap-2">{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Logg inn'}</button>
        </div>
      </div>
    );
  }

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-[#e6e6e6] bg-white outline-none focus:border-[#cf97fc] text-[15px] transition-colors';
  const labelCls = 'block text-[12px] font-semibold text-[#888] uppercase tracking-[0.06em] mb-1.5';

  // --- Editor ---
  if (view === 'edit') {
    return (
      <div className="min-h-screen bg-[#fbfaf9] px-4 sm:px-8 py-8">
        <div className="max-w-[860px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button onClick={() => setView('list')} className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#666] hover:text-[#0a0a0a]"><ArrowLeft className="w-4 h-4" /> Tilbake</button>
            <div className="flex items-center gap-2">
              <button onClick={() => save('draft')} disabled={saving} className="h-10 px-4 rounded-full bg-white text-[#444] text-[13px] font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> Lagre utkast</button>
              <button onClick={() => save('published')} disabled={saving} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 disabled:opacity-50 active:scale-[0.97] transition-transform">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Publiser</button>
            </div>
          </div>

          {/* AI generator */}
          <div className="rounded-2xl p-5 mb-5 shadow-[0_2px_16px_rgba(0,0,0,0.05)] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a1430 0%, #0a0a0a 70%)' }}>
            <div className="flex items-center gap-2 mb-3"><Sparkles className="w-4 h-4 text-[#cf97fc]" /><h3 className="text-[14px] font-bold text-white" style={{ fontFamily: 'var(--font-heading)' }}>Generer med AI</h3></div>
            <div className="flex gap-2">
              <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') generate(); }} placeholder="F.eks. «Skatt på utleieinntekt i 2026» eller «5 tips for å leie ut raskere»" className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white placeholder-white/40 outline-none focus:bg-white/15 text-[14px]" />
              <button onClick={generate} disabled={generating} className="px-5 rounded-xl bg-[#cf97fc] text-[#1f1f1f] text-[13px] font-semibold flex items-center gap-2 disabled:opacity-50">{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generer</button>
            </div>
          </div>

          {msg && <div className="mb-4 text-[13px] px-4 py-2.5 rounded-xl bg-[#f4f0fb] text-[#7c3aed] font-medium">{msg}</div>}

          <div className="bg-white rounded-2xl p-6 shadow-[0_2px_16px_rgba(0,0,0,0.04)] space-y-5">
            <div><label className={labelCls}>Tittel</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Artikkeltittel" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className={labelCls}>Slug (URL)</label><input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className={inputCls} placeholder="auto fra tittel" /></div>
              <div><label className={labelCls}>Tagger (komma)</label><input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className={inputCls} placeholder="utleie, skatt" /></div>
            </div>
            <div><label className={labelCls}>Ingress / utdrag</label><textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} rows={2} className={inputCls} placeholder="Kort sammendrag (vises i listen og som meta)" /></div>
            <div><label className={labelCls}>Forsidebilde (URL)</label><input value={form.coverImage} onChange={(e) => setForm({ ...form, coverImage: e.target.value })} className={inputCls} placeholder="https://..." /></div>
            <div><label className={labelCls}>Innhold (Markdown)</label><textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={16} className={`${inputCls} font-mono text-[13.5px] leading-relaxed`} placeholder="## Underoverskrift&#10;&#10;Skriv artikkelen i markdown..." /></div>
            <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-[#f0f0f0]">
              <div><label className={labelCls}>SEO-tittel</label><input value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className={inputCls} placeholder="≤ 60 tegn" maxLength={70} /></div>
              <div><label className={labelCls}>SEO-beskrivelse</label><input value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className={inputCls} placeholder="≤ 155 tegn" maxLength={170} /></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- List ---
  return (
    <div className="min-h-screen bg-[#fbfaf9] px-4 sm:px-8 py-8">
      <div className="max-w-[1000px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link href="/admin/leads" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#888] hover:text-[#0a0a0a] mb-2"><ArrowLeft className="w-4 h-4" /> Tilbake til innsikt</Link>
            <h1 className="text-[26px] font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>Artikler</h1>
            <p className="text-[13px] text-[#999] mt-0.5">{posts.length} artikler · blogg/nyheter</p>
          </div>
          <button onClick={openNew} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold flex items-center gap-2 active:scale-[0.97] transition-transform"><Plus className="w-4 h-4" /> Ny artikkel</button>
        </div>

        <div className="bg-white rounded-2xl shadow-[0_2px_16px_rgba(0,0,0,0.04)] overflow-hidden">
          {loading ? (
            <div className="py-16 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-[#cf97fc]" /></div>
          ) : posts.length === 0 ? (
            <div className="py-16 text-center text-[14px] text-[#aaa]"><FileText className="w-8 h-8 mx-auto mb-3 text-[#ddd]" />Ingen artikler ennå. Lag din første!</div>
          ) : posts.map((p) => (
            <div key={p.id} className="flex items-center gap-4 px-5 py-4 border-b border-[#f6f6f6] hover:bg-[#fafafa] transition-colors">
              <div className="w-14 h-14 rounded-xl bg-[#f2eefb] overflow-hidden shrink-0">
                {p.coverImage ? <img src={p.coverImage} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-[#1a1430] to-[#0a0a0a]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.06em] px-2 py-0.5 rounded-full ${p.status === 'published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{p.status === 'published' ? 'Publisert' : 'Utkast'}</span>
                  <span className="text-[12px] text-[#bbb] truncate">/nyheter/{p.slug}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-[#222] truncate mt-0.5">{p.title}</h3>
              </div>
              {p.status === 'published' && <a href={`/nyheter/${p.slug}`} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-lg flex items-center justify-center text-[#bbb] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors"><Eye className="w-4 h-4" /></a>}
              <button onClick={() => openEdit(p)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#888] hover:text-[#0a0a0a] hover:bg-[#f0f0f0] transition-colors"><Pencil className="w-4 h-4" /></button>
              <button onClick={() => del(p.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-[#bbb] hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
