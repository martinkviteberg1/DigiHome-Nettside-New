'use client';

// ---------------------------------------------------------------------------
// INVESTOR-ROM (admin) — administrer magic links, dokumenthvelv, Q&A og audit.
// Motpart til den offentlige /investor-siden (token-gatet levende DD-rom).
// Opplasting skjer chunket (1 MB) for å omgå proxy-grenser — maks 15 MB/fil.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Loader2, Link2, Copy, Check, Ban, Trash2, Plus, Upload, FileText, Download,
  RefreshCw, Eye, MessageCircleQuestion, Activity, FolderLock, Clock, Send,
  ShieldCheck, AlertTriangle, CheckCircle2, ExternalLink, Archive, ArchiveRestore, Globe,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const fmtTime = (iso) => { try { return new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; } };
const fmtBytes = (b) => { const n = Number(b) || 0; if (n > 1048576) return `${(n / 1048576).toFixed(1)} MB`; if (n > 1024) return `${Math.round(n / 1024)} kB`; return `${n} B`; };

const SECTION_LABELS = { metrics: 'Vekst/KPI', economy: 'Økonomi', forecast: 'Prognose', docs: 'Dokumenter', qa: 'Q&A' };
const EVENT_LABELS = { view_room: 'Åpnet rommet', download_doc: 'Lastet ned dokument', ask_question: 'Stilte spørsmål' };
const EVENT_ICONS = { view_room: Eye, download_doc: Download, ask_question: MessageCircleQuestion };

const SUBTABS = [
  { k: 'lenker', l: 'Lenker', icon: Link2 },
  { k: 'dokumenter', l: 'Dokumenter', icon: FolderLock },
  { k: 'qa', l: 'Q&A', icon: MessageCircleQuestion },
  { k: 'aktivitet', l: 'Aktivitet', icon: Activity },
];

export default function InvestorRoomTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState('lenker');
  const [msg, setMsg] = useState(null);

  const flash = (ok, text) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 6000); };

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/investor-room?${q}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {}
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const unanswered = (data?.questions || []).filter((x) => !x.answer).length;

  if (loading) return <div className="flex items-center gap-2 text-[#999] text-[14px] py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Laster investor-rommet …</div>;

  return (
    <div className="space-y-5">
      {/* Intro + under-nav */}
      <div className="flex items-start gap-2.5 rounded-xl bg-[#f7f3ff] px-4 py-3">
        <ShieldCheck className="w-4 h-4 text-[#9a6ee8] shrink-0 mt-0.5" />
        <p className="text-[12.5px] leading-relaxed text-[#6b5a94]">
          <strong>Levende DD-rom:</strong> del en personlig lenke med hver investor — de ser levende nøkkeltall, prognoser og dokumenter
          (aldri persondata). Hver visning, nedlasting og hvert spørsmål logges per lenke. Tilgang kan trekkes tilbake når som helst.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center bg-white rounded-full p-1 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {SUBTABS.map((t) => (
            <button key={t.k} onClick={() => setSub(t.k)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all flex items-center gap-1.5 ${sub === t.k ? 'bg-[#0a0a0a] text-white' : 'text-[#888] hover:text-[#0a0a0a]'}`}>
              <t.icon className="w-3.5 h-3.5" /> {t.l}
              {t.k === 'qa' && unanswered > 0 && <span className="text-[10px] bg-amber-400 text-[#0a0a0a] rounded-full px-1.5 py-0.5 leading-none font-bold">{unanswered}</span>}
            </button>
          ))}
        </div>
        <button onClick={load} title="Oppdater" className="ml-auto h-9 w-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] flex items-center justify-center text-[#666] hover:text-[#0a0a0a]"><RefreshCw className="w-4 h-4" /></button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 text-[13px] rounded-xl px-4 py-3 ${msg.ok ? 'bg-[#e9f7ef] text-[#1f7a4d]' : 'bg-[#fdecec] text-[#c0392b]'}`}>
          {msg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      {sub === 'lenker' && <LinksPanel data={data} q={q} onChange={load} flash={flash} />}
      {sub === 'dokumenter' && <DocsPanel data={data} q={q} onChange={load} flash={flash} />}
      {sub === 'qa' && <QaPanel data={data} q={q} onChange={load} flash={flash} />}
      {sub === 'aktivitet' && <AuditPanel data={data} />}
    </div>
  );
}

/* ═════════════════ LENKER ═════════════════ */
function LinksPanel({ data, q, onChange, flash }) {
  const [label, setLabel] = useState('');
  const [email, setEmail] = useState('');
  const [expiresDays, setExpiresDays] = useState('90');
  const [sections, setSections] = useState(['metrics', 'economy', 'forecast', 'docs', 'qa']);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [busyId, setBusyId] = useState('');

  const toggleSection = (s) => setSections((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const create = async () => {
    if (!label.trim()) { flash(false, 'Skriv navn på mottakeren (f.eks. «Ola Investor — Fond AS»)'); return; }
    if (!sections.length) { flash(false, 'Velg minst én seksjon'); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/investor-room/links?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: label.trim(), email: email.trim(), sections, expiresDays: Number(expiresDays) || null }),
      });
      const j = await r.json();
      if (j.ok) {
        try { await navigator.clipboard.writeText(j.url); } catch (e) {}
        flash(true, `Lenke opprettet for ${label.trim()} — kopiert til utklippstavlen`);
        setLabel(''); setEmail('');
        await onChange();
      } else flash(false, j.error || 'Kunne ikke opprette lenke');
    } catch (e) { flash(false, 'Nettverksfeil'); }
    setBusy(false);
  };

  const copyUrl = async (link) => {
    const url = `${data.baseUrl || window.location.origin}/investor?t=${link.token}`;
    try { await navigator.clipboard.writeText(url); setCopied(link.id); setTimeout(() => setCopied(''), 2000); } catch (e) { flash(false, 'Kunne ikke kopiere'); }
  };

  const setRevoked = async (link, revoked) => {
    setBusyId(link.id);
    try {
      const r = await fetch(`/api/admin/investor-room/links?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: link.id, patch: { revoked } }),
      });
      const j = await r.json();
      if (j.ok) { flash(true, revoked ? `Tilgangen til ${link.label} er trukket tilbake` : `Tilgangen til ${link.label} er gjenopprettet`); await onChange(); }
      else flash(false, j.error || 'Feil');
    } catch (e) { flash(false, 'Nettverksfeil'); }
    setBusyId('');
  };

  const remove = async (link) => {
    if (!window.confirm(`Slette lenken til ${link.label}? Aktivitetsloggen beholdes. Kan ikke angres.`)) return;
    setBusyId(link.id);
    try {
      const r = await fetch(`/api/admin/investor-room/links?${q}&id=${encodeURIComponent(link.id)}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.ok) { flash(true, 'Lenken er slettet'); await onChange(); }
    } catch (e) { flash(false, 'Nettverksfeil'); }
    setBusyId('');
  };

  const links = data?.links || [];

  return (
    <div className="space-y-4">
      {/* Opprett ny */}
      <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-5">
        <p className="text-[14px] font-bold text-[#0a0a0a] mb-4 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><Plus className="w-4 h-4 text-[#8b5cf6]" /> Ny tilgangslenke</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Mottaker *</span>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ola Investor — Fond AS"
              className="w-full h-10 rounded-lg bg-[#f7f6f4] text-[13.5px] px-3 outline-none focus:ring-2 focus:ring-[#d9c4f5]" />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">E-post (valgfritt)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ola@fond.no"
              className="w-full h-10 rounded-lg bg-[#f7f6f4] text-[13.5px] px-3 outline-none focus:ring-2 focus:ring-[#d9c4f5]" />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Utløper etter</span>
            <select value={expiresDays} onChange={(e) => setExpiresDays(e.target.value)}
              className="w-full h-10 rounded-lg bg-[#f7f6f4] text-[13.5px] px-3 outline-none focus:ring-2 focus:ring-[#d9c4f5] cursor-pointer">
              <option value="30">30 dager</option>
              <option value="90">90 dager</option>
              <option value="180">180 dager</option>
              <option value="">Aldri</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mr-1">Tilgang til:</span>
          {Object.entries(SECTION_LABELS).map(([k, l]) => (
            <button key={k} onClick={() => toggleSection(k)}
              className={`h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${sections.includes(k) ? 'bg-[#7c3aed] text-white' : 'bg-[#f5f5f4] text-[#999] hover:text-[#555]'}`}>
              {l}
            </button>
          ))}
          <button onClick={create} disabled={busy}
            className="ml-auto h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold flex items-center gap-2 disabled:opacity-60 hover:bg-[#2a2a2a] transition-colors">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Opprett & kopier lenke
          </button>
        </div>
      </div>

      {/* Liste */}
      {!links.length ? (
        <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] py-14 text-center">
          <Link2 className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#0a0a0a]">Ingen tilgangslenker ennå</p>
          <p className="text-[13px] text-[#999] mt-1">Opprett en lenke over og del den med investoren.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {links.map((l) => (
            <div key={l.id} className={`rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-4 ${l.status !== 'active' ? 'opacity-70' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-bold text-[#0a0a0a] truncate">{l.label}</p>
                    <span className={`text-[10.5px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${l.status === 'active' ? 'bg-[#e9f7ef] text-[#1f7a4d]' : l.status === 'revoked' ? 'bg-[#fdecec] text-[#c0392b]' : 'bg-[#fdf3e2] text-[#a97615]'}`}>
                      {l.status === 'active' ? 'Aktiv' : l.status === 'revoked' ? 'Trukket' : 'Utløpt'}
                    </span>
                  </div>
                  <p className="text-[11.5px] text-[#999] mt-0.5">
                    {l.email ? `${l.email} · ` : ''}{(l.sections || []).map((s) => SECTION_LABELS[s]).join(' · ')}
                    {l.expiresAt ? ` · utløper ${new Date(l.expiresAt).toLocaleDateString('nb-NO')}` : ' · uten utløp'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-[12px] text-[#888]">
                  <span className="flex items-center gap-1" title="Visninger"><Eye className="w-3.5 h-3.5 text-[#b98cf7]" /> {l.stats?.views || 0}</span>
                  <span className="flex items-center gap-1" title="Nedlastinger"><Download className="w-3.5 h-3.5 text-[#b98cf7]" /> {l.stats?.downloads || 0}</span>
                  <span className="flex items-center gap-1" title="Spørsmål"><MessageCircleQuestion className="w-3.5 h-3.5 text-[#b98cf7]" /> {l.stats?.questions || 0}</span>
                  {l.lastViewedAt && <span className="hidden lg:flex items-center gap-1" title="Sist sett"><Clock className="w-3.5 h-3.5" /> {fmtTime(l.lastViewedAt)}</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => copyUrl(l)} title="Kopier lenke" className="h-8 px-3 rounded-lg bg-[#f4f0fb] text-[#8b5cf6] text-[12px] font-semibold flex items-center gap-1.5 hover:bg-[#ece2fb]">
                    {copied === l.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied === l.id ? 'Kopiert' : 'Kopier'}
                  </button>
                  <a href={`/investor?t=${l.token}`} target="_blank" rel="noopener" title="Åpne som investor" className="h-8 w-8 rounded-lg text-[#999] hover:text-[#0a0a0a] hover:bg-[#f5f5f4] flex items-center justify-center"><ExternalLink className="w-4 h-4" /></a>
                  <button onClick={() => setRevoked(l, l.status !== 'revoked')} disabled={busyId === l.id} title={l.status === 'revoked' ? 'Gjenopprett tilgang' : 'Trekk tilbake tilgang'}
                    className="h-8 w-8 rounded-lg text-[#999] hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center disabled:opacity-40">
                    {busyId === l.id ? <Loader2 className="w-4 h-4 animate-spin" /> : l.status === 'revoked' ? <RefreshCw className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </button>
                  <button onClick={() => remove(l)} disabled={busyId === l.id} title="Slett lenke" className="h-8 w-8 rounded-lg text-[#bbb] hover:text-red-500 hover:bg-red-50 flex items-center justify-center disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═════════════════ DOKUMENTER ═════════════════ */
async function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

function DocsPanel({ data, q, onChange, flash }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('selskap');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null); // null | 0..100
  const [busyId, setBusyId] = useState('');
  const fileRef = useRef(null);
  const versionRef = useRef(null);
  const [versionDocId, setVersionDocId] = useState('');

  const categories = data?.categories || [];
  const docs = data?.documents || [];
  const byCat = useMemo(() => {
    const map = {};
    for (const d of docs) { if (!map[d.category]) map[d.category] = []; map[d.category].push(d); }
    return map;
  }, [docs]);

  // Chunked opplasting — 1 MB binær per chunk (omgår proxy-grenser).
  const uploadFile = async (f, extra) => {
    const CHUNK = 1024 * 1024;
    const total = Math.ceil(f.size / CHUNK) || 1;
    const uploadId = (window.crypto?.randomUUID && window.crypto.randomUUID()) || `up-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    for (let i = 0; i < total; i++) {
      const b64 = await blobToBase64(f.slice(i * CHUNK, (i + 1) * CHUNK));
      const r = await fetch(`/api/admin/investor-room/upload-chunk?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId, index: i, data: b64 }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.error || `Chunk ${i + 1}/${total} feilet`);
      setProgress(Math.round(((i + 1) / (total + 1)) * 100));
    }
    const done = await fetch(`/api/admin/investor-room/upload-complete?${q}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId, total, filename: f.name, mime: f.type, size: f.size, ...extra }),
    });
    const dj = await done.json().catch(() => ({}));
    if (!done.ok || !dj.ok) throw new Error(dj.error || 'Fullføring feilet');
    setProgress(100);
    return dj;
  };

  const submitNew = async () => {
    if (!file) { flash(false, 'Velg en fil først'); return; }
    setProgress(0);
    try {
      await uploadFile(file, { title: title.trim() || file.name, category, description: description.trim() });
      flash(true, `«${title.trim() || file.name}» er lastet opp til hvelvet`);
      setTitle(''); setDescription(''); setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      await onChange();
    } catch (e) { flash(false, e.message); }
    setProgress(null);
  };

  const submitVersion = async (docId, f) => {
    setProgress(0); setVersionDocId(docId);
    try {
      await uploadFile(f, { docId });
      flash(true, 'Ny versjon lastet opp');
      await onChange();
    } catch (e) { flash(false, e.message); }
    setProgress(null); setVersionDocId('');
  };

  const setArchived = async (doc, archived) => {
    setBusyId(doc.id);
    try {
      const r = await fetch(`/api/admin/investor-room/docs?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: doc.id, patch: { archived } }),
      });
      const j = await r.json();
      if (j.ok) { flash(true, archived ? 'Dokumentet er arkivert (skjult for investorer)' : 'Dokumentet er synlig igjen'); await onChange(); }
    } catch (e) { flash(false, 'Nettverksfeil'); }
    setBusyId('');
  };

  const remove = async (doc) => {
    if (!window.confirm(`Slette «${doc.title}» permanent (alle ${doc.versions?.length || 1} versjoner)? Kan ikke angres.`)) return;
    setBusyId(doc.id);
    try {
      const r = await fetch(`/api/admin/investor-room/docs?${q}&id=${encodeURIComponent(doc.id)}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.ok) { flash(true, 'Dokumentet er slettet'); await onChange(); }
    } catch (e) { flash(false, 'Nettverksfeil'); }
    setBusyId('');
  };

  return (
    <div className="space-y-4">
      {/* Last opp */}
      <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-5">
        <p className="text-[14px] font-bold text-[#0a0a0a] mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-heading)' }}><Upload className="w-4 h-4 text-[#8b5cf6]" /> Last opp dokument</p>
        <p className="text-[12px] text-[#999] mb-4">PDF, Office, bilder m.m. · maks 15 MB · lagres kryptert i objektlagring — nedlastinger logges per investor</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Tittel</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Aksjonæravtale 2026"
              className="w-full h-10 rounded-lg bg-[#f7f6f4] text-[13.5px] px-3 outline-none focus:ring-2 focus:ring-[#d9c4f5]" />
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Kategori</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 rounded-lg bg-[#f7f6f4] text-[13.5px] px-3 outline-none focus:ring-2 focus:ring-[#d9c4f5] cursor-pointer">
              {categories.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-[#aaa] mb-1">Fil *</span>
            <input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full h-10 rounded-lg bg-[#f7f6f4] text-[12.5px] px-2 py-2 outline-none file:mr-2 file:rounded-md file:border-0 file:bg-[#ece2fb] file:text-[#7c3aed] file:text-[12px] file:font-semibold file:px-2.5 file:py-1 cursor-pointer" />
          </label>
        </div>
        <div className="flex items-center gap-3 mt-3">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kort beskrivelse (valgfritt)"
            className="flex-1 h-10 rounded-lg bg-[#f7f6f4] text-[13.5px] px-3 outline-none focus:ring-2 focus:ring-[#d9c4f5]" />
          <button onClick={submitNew} disabled={progress != null || !file}
            className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold flex items-center gap-2 disabled:opacity-50 hover:bg-[#2a2a2a] transition-colors">
            {progress != null && !versionDocId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {progress != null && !versionDocId ? `Laster opp … ${progress}%` : 'Last opp'}
          </button>
        </div>
        {progress != null && (
          <div className="mt-3 h-1.5 rounded-full bg-[#f0eef4] overflow-hidden">
            <div className="h-full rounded-full bg-[#8b5cf6] transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {/* Skjult fil-input for ny versjon */}
      <input ref={versionRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f && versionRef.current?.dataset.docid) submitVersion(versionRef.current.dataset.docid, f); e.target.value = ''; }} />

      {/* Liste per kategori */}
      {!docs.length ? (
        <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] py-14 text-center">
          <FolderLock className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#0a0a0a]">Hvelvet er tomt</p>
          <p className="text-[13px] text-[#999] mt-1">Start med stiftelsesdokument, cap table og siste regnskap.</p>
        </div>
      ) : (
        categories.filter((c) => byCat[c.key]?.length).map((c) => (
          <div key={c.key}>
            <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#aaa] mb-2 mt-1">{c.label}</p>
            <div className="space-y-2">
              {byCat[c.key].map((d) => (
                <div key={d.id} className={`rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-4 flex flex-wrap items-center gap-3 ${d.archived ? 'opacity-60' : ''}`}>
                  <span className="w-10 h-10 rounded-lg bg-[#f4f0fb] flex items-center justify-center shrink-0"><FileText className="w-4.5 h-4.5 text-[#8b5cf6]" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[13.5px] font-bold text-[#0a0a0a] truncate">{d.title}</p>
                      <span className="text-[10.5px] font-bold text-[#8b5cf6] bg-[#f4f0fb] rounded-full px-2 py-0.5">v{d.currentVersion}</span>
                      {d.archived && <span className="text-[10.5px] font-bold text-[#a97615] bg-[#fdf3e2] rounded-full px-2 py-0.5">Arkivert</span>}
                    </div>
                    <p className="text-[11.5px] text-[#999] mt-0.5 truncate">
                      {d.versions?.[d.versions.length - 1]?.filename} · {fmtBytes(d.versions?.[d.versions.length - 1]?.size)} · oppdatert {fmtTime(d.updatedAt)}
                      {d.description ? ` · ${d.description}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <a href={`/api/admin/investor-room/file?${q}&docId=${encodeURIComponent(d.id)}`} title="Last ned" className="h-8 w-8 rounded-lg text-[#999] hover:text-[#0a0a0a] hover:bg-[#f5f5f4] flex items-center justify-center"><Download className="w-4 h-4" /></a>
                    <button onClick={() => { if (versionRef.current) { versionRef.current.dataset.docid = d.id; versionRef.current.click(); } }} disabled={progress != null}
                      title="Last opp ny versjon" className="h-8 px-2.5 rounded-lg text-[12px] font-semibold text-[#8b5cf6] hover:bg-[#f4f0fb] flex items-center gap-1 disabled:opacity-40">
                      {versionDocId === d.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Ny versjon
                    </button>
                    <button onClick={() => setArchived(d, !d.archived)} disabled={busyId === d.id} title={d.archived ? 'Gjør synlig' : 'Arkiver (skjul for investorer)'}
                      className="h-8 w-8 rounded-lg text-[#999] hover:text-amber-600 hover:bg-amber-50 flex items-center justify-center disabled:opacity-40">
                      {d.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                    <button onClick={() => remove(d)} disabled={busyId === d.id} title="Slett permanent" className="h-8 w-8 rounded-lg text-[#bbb] hover:text-red-500 hover:bg-red-50 flex items-center justify-center disabled:opacity-40"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

/* ═════════════════ Q&A ═════════════════ */
function QaPanel({ data, q, onChange, flash }) {
  const [drafts, setDrafts] = useState({});
  const [busyId, setBusyId] = useState('');
  const questions = data?.questions || [];

  const save = async (item, extra = {}) => {
    setBusyId(item.id);
    try {
      const body = { id: item.id, ...extra };
      if (drafts[item.id] !== undefined) body.answer = drafts[item.id];
      const r = await fetch(`/api/admin/investor-room/qa?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.ok) { flash(true, 'Lagret — investoren ser svaret i rommet'); setDrafts((d) => { const n = { ...d }; delete n[item.id]; return n; }); await onChange(); }
      else flash(false, j.error || 'Feil');
    } catch (e) { flash(false, 'Nettverksfeil'); }
    setBusyId('');
  };

  const remove = async (item) => {
    if (!window.confirm('Slette dette spørsmålet?')) return;
    setBusyId(item.id);
    try {
      const r = await fetch(`/api/admin/investor-room/qa?${q}&id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      const j = await r.json();
      if (j.ok) { flash(true, 'Slettet'); await onChange(); }
    } catch (e) {}
    setBusyId('');
  };

  if (!questions.length) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] py-14 text-center">
        <MessageCircleQuestion className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
        <p className="text-[15px] font-semibold text-[#0a0a0a]">Ingen spørsmål ennå</p>
        <p className="text-[13px] text-[#999] mt-1">Spørsmål investorer stiller i rommet dukker opp her.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {questions.map((item) => (
        <div key={item.id} className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[14px] text-[#0a0a0a] leading-relaxed font-medium">{item.question}</p>
              <p className="text-[11.5px] text-[#999] mt-1">{item.label || 'Ukjent'} · {fmtTime(item.askedAt)}{item.isPublic ? ' · delt med alle' : ''}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!item.answer && <span className="text-[10.5px] font-bold text-[#a97615] bg-[#fdf3e2] rounded-full px-2 py-1">Ubesvart</span>}
              <button onClick={() => remove(item)} disabled={busyId === item.id} className="h-8 w-8 rounded-lg text-[#bbb] hover:text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="mt-3">
            <textarea rows={2} value={drafts[item.id] !== undefined ? drafts[item.id] : (item.answer || '')}
              onChange={(e) => setDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
              placeholder="Skriv svaret her …"
              className="w-full rounded-xl bg-[#f7f6f4] text-[13.5px] px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-[#d9c4f5] resize-none" />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => save(item)} disabled={busyId === item.id}
                className="h-9 px-4 rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-50">
                {busyId === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} {item.answer ? 'Oppdater svar' : 'Svar'}
              </button>
              <button onClick={() => save(item, { isPublic: !item.isPublic })} disabled={busyId === item.id}
                title="Delte svar vises for alle investor-lenker — nyttig for gjentakende spørsmål"
                className={`h-9 px-4 rounded-full text-[12.5px] font-semibold flex items-center gap-1.5 disabled:opacity-50 ${item.isPublic ? 'bg-[#ece2fb] text-[#7c3aed]' : 'bg-[#f5f5f4] text-[#888] hover:text-[#555]'}`}>
                <Globe className="w-3.5 h-3.5" /> {item.isPublic ? 'Delt med alle' : 'Del med alle'}
              </button>
              {item.answeredAt && <span className="ml-auto text-[11.5px] text-[#aaa]">Besvart {fmtTime(item.answeredAt)}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═════════════════ AKTIVITET ═════════════════ */
function AuditPanel({ data }) {
  const audit = data?.audit || [];
  if (!audit.length) {
    return (
      <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] py-14 text-center">
        <Activity className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
        <p className="text-[15px] font-semibold text-[#0a0a0a]">Ingen aktivitet ennå</p>
        <p className="text-[13px] text-[#999] mt-1">Når en investor åpner rommet, laster ned eller spør, ser du det her.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] p-5">
      <ol className="relative border-l-2 border-[#f0ecf8] ml-1.5 space-y-4">
        {audit.map((e) => {
          const Icon = EVENT_ICONS[e.event] || Activity;
          return (
            <li key={e.id} className="ml-5 relative">
              <span className="absolute -left-[31px] top-0 w-6 h-6 rounded-full bg-[#f4f0fb] text-[#8b5cf6] flex items-center justify-center"><Icon className="w-3.5 h-3.5" /></span>
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-[13px] text-[#1f1f1f]"><b>{e.label || 'Ukjent'}</b> — {EVENT_LABELS[e.event] || e.event}{e.meta?.title ? `: «${e.meta.title}»` : ''}{e.meta?.preview ? `: «${e.meta.preview}…»` : ''}</p>
                <span className="text-[11px] text-[#bbb] shrink-0 whitespace-nowrap">{fmtTime(e.at)}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
