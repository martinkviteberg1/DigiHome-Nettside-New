'use client';

/*
 * NewsletterTab — DigiHome Nyhetsbrev-studio (2026-utgave).
 * Views: list (studio-hjem) · editor (WYSIWYG) · stats (analyse) · subs (abonnenter).
 * Backend: /api/admin/newsletter/* — se route.js.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Plus, ArrowLeft, Send, Eye, FlaskConical, Loader2, Check, Trash2, Copy,
  Monitor, Smartphone, Users, Settings2, ChevronRight, X, Mail, MailOpen,
  MousePointerClick, PenLine, Search, UsersRound, Sparkles, RefreshCw,
} from 'lucide-react';
import { PALETTE, defaultsFor, CanvasBlock, BlockInspector } from './newsletter/EditorBlocks';
import SubscribersView from './newsletter/SubscribersView';
import StatsView from './newsletter/StatsView';

const uid = () => Math.random().toString(36).slice(2, 10);
const SEG_LABEL = { kunder: 'Kunder', abonnenter: 'Abonnenter', leads: 'Utleier-leads', leietakere: 'Leietakere', manuell: 'Manuelt lagt til' };
const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const normEmail = (e) => (e || '').toString().trim().toLowerCase();

export default function NewsletterTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [view, setView] = useState('list'); // list | editor | stats | subs
  const [listData, setListData] = useState(null);
  const [audiences, setAudiences] = useState(null);
  const [filter, setFilter] = useState('alle');
  const [tplOpen, setTplOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [camp, setCamp] = useState(null);
  const [stats, setStats] = useState(null);
  const [saveState, setSaveState] = useState('idle');
  const [panelTab, setPanelTab] = useState('oppsett'); // oppsett | mottakere (når ingen blokk er valgt)
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [device, setDevice] = useState('desktop');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [testOpen, setTestOpen] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testMsg, setTestMsg] = useState('');
  const [testState, setTestState] = useState({ s: 'idle', msg: '' });
  const [confirming, setConfirming] = useState(false);
  const [sendState, setSendState] = useState('idle');
  const [sendErr, setSendErr] = useState('');
  const [recips, setRecips] = useState(null);
  const [recipSearch, setRecipSearch] = useState('');
  const [extraInput, setExtraInput] = useState('');
  const [uploadingId, setUploadingId] = useState(null);
  const [aiState, setAiState] = useState('idle'); // idle | loading | error
  const [aiAlts, setAiAlts] = useState([]);       // alternative AI-forslag
  const [aiErr, setAiErr] = useState('');
  const aiAutoTried = useRef({});                  // per kampanje-id: auto-forslag kjørt?
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);
  const dragId = useRef(null);

  useEffect(() => { try { setTestTo(localStorage.getItem('nl_test_to') || ''); } catch (e) {} }, []);

  /* ------------------------------ Datalasting ------------------------------ */
  const loadList = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        fetch(`/api/admin/newsletter?${q}`).then((r) => r.json()),
        fetch(`/api/admin/newsletter/audiences?${q}`).then((r) => r.json()),
      ]);
      if (a.ok) setListData(a);
      if (b.ok) setAudiences(b);
    } catch (e) {}
  }, [q]);
  useEffect(() => { loadList(); }, [loadList]);

  const openCampaign = async (id) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`);
      const j = await r.json();
      if (j.ok) {
        const c = { ...j.campaign, blocks: (j.campaign.blocks || []).map((b) => ({ ...b, id: uid() })) };
        setCamp(c); setStats(j.stats);
        setView(c.status === 'sent' ? 'stats' : 'editor');
        setPanelTab('oppsett'); setSelectedBlock(null); setConfirming(false); setSendErr(''); setSendState('idle');
        firstLoad.current = true;
        setRecips(null); setRecipSearch('');
      }
    } catch (e) {}
    setBusy(false);
  };

  /* ------------------------------- Autosave -------------------------------- */
  const persist = useCallback(async (c) => {
    setSaveState('saving');
    try {
      await fetch(`/api/admin/newsletter/draft?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id, title: c.title, subject: c.subject, preheader: c.preheader,
          fromName: c.fromName, theme: c.theme, segments: c.segments,
          excludedEmails: c.excludedEmails, extraEmails: c.extraEmails,
          blocks: c.blocks.map(({ id, ...rest }) => rest),
        }),
      });
      setSaveState('saved');
    } catch (e) { setSaveState('idle'); }
  }, [q]);

  useEffect(() => {
    if (!camp || view !== 'editor') return;
    if (firstLoad.current) { firstLoad.current = false; return; }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(camp), 700);
    return () => clearTimeout(saveTimer.current);
  }, [camp, view, persist]);

  /* ------------------------------ Blokk-API -------------------------------- */
  const patch = (p) => setCamp((c) => ({ ...c, ...p }));
  const patchBlock = (id, p) => setCamp((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  const removeBlock = (id) => { setCamp((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) })); setSelectedBlock((s) => (s === id ? null : s)); };
  const moveBlock = (id, dir) => setCamp((c) => {
    const i = c.blocks.findIndex((b) => b.id === id); const j = i + dir;
    if (i < 0 || j < 0 || j >= c.blocks.length) return c;
    const next = [...c.blocks]; [next[i], next[j]] = [next[j], next[i]];
    return { ...c, blocks: next };
  });
  const duplicateBlock = (id) => setCamp((c) => {
    const i = c.blocks.findIndex((b) => b.id === id);
    if (i < 0) return c;
    const copy = { ...c.blocks[i], id: uid() };
    const next = [...c.blocks]; next.splice(i + 1, 0, copy);
    return { ...c, blocks: next };
  });
  const addBlock = (type, atIndex = null) => {
    const nb = { id: uid(), type, ...defaultsFor(type) };
    setCamp((c) => {
      const next = [...c.blocks];
      if (atIndex === null) next.push(nb); else next.splice(atIndex, 0, nb);
      return { ...c, blocks: next };
    });
    setSelectedBlock(nb.id);
  };

  /* --------------------------- Drag-reorder --------------------------------- */
  const onDragStartBlock = (e, id) => { dragId.current = id; e.dataTransfer.effectAllowed = 'move'; };
  const onDragOverBlock = (e) => { if (dragId.current) e.preventDefault(); };
  const onDropBlock = (e, targetIndex) => {
    e.preventDefault();
    const id = dragId.current; dragId.current = null;
    if (!id) return;
    setCamp((c) => {
      const i = c.blocks.findIndex((b) => b.id === id);
      if (i < 0 || i === targetIndex) return c;
      const next = [...c.blocks];
      const [item] = next.splice(i, 1);
      next.splice(targetIndex > i ? targetIndex - 1 : targetIndex, 0, item);
      return { ...c, blocks: next };
    });
  };

  /* --------------------------- Bildeopplasting ------------------------------ */
  const uploadImage = async (blockId, file) => {
    setUploadingId(blockId);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch(`/api/admin/newsletter/upload?${q}`, { method: 'POST', body: fd });
      const j = await r.json();
      if (j.ok && j.url) {
        const b = camp?.blocks.find((x) => x.id === blockId);
        patchBlock(blockId, b?.type === 'sender' ? { photoUrl: j.url } : { url: j.url });
      } else { alert(j.error || 'Opplasting feilet'); }
    } catch (e) { alert('Opplasting feilet'); }
    setUploadingId(null);
  };

  /* ------------------------------ Målgruppe --------------------------------- */
  const loadRecipients = useCallback(async (segments) => {
    if (!(segments || []).length) { setRecips({ recipients: [], total: 0 }); return; }
    try {
      const r = await fetch(`/api/admin/newsletter/recipients?segments=${segments.join(',')}&${q}`);
      const j = await r.json();
      if (j.ok) setRecips(j);
    } catch (e) {}
  }, [q]);
  useEffect(() => {
    if (view === 'editor' && panelTab === 'mottakere' && !selectedBlock && camp) loadRecipients(camp.segments);
  }, [view, panelTab, selectedBlock, camp?.segments?.join(','), loadRecipients]); // eslint-disable-line

  const excludedSet = useMemo(() => new Set((camp?.excludedEmails || [])), [camp?.excludedEmails]);
  const toggleExclude = (email) => setCamp((c) => {
    const set = new Set(c.excludedEmails || []);
    set.has(email) ? set.delete(email) : set.add(email);
    return { ...c, excludedEmails: [...set] };
  });
  const addExtra = () => {
    const email = normEmail(extraInput);
    if (!/^\S+@\S+\.\S+$/.test(email)) return;
    setCamp((c) => {
      const cur = c.extraEmails || [];
      if (cur.some((x) => x.email === email)) return c;
      return { ...c, extraEmails: [...cur, { email, name: '' }] };
    });
    setExtraInput('');
  };
  const removeExtra = (email) => setCamp((c) => ({ ...c, extraEmails: (c.extraEmails || []).filter((x) => x.email !== email) }));

  const netCount = useMemo(() => {
    if (!camp) return null;
    const extras = camp.extraEmails || [];
    if (!recips) return null;
    const segEmails = new Set(recips.recipients.map((r) => r.email));
    const fromSegs = recips.recipients.filter((r) => !excludedSet.has(r.email)).length;
    const fromExtras = extras.filter((x) => !segEmails.has(x.email) && !excludedSet.has(x.email)).length;
    return fromSegs + fromExtras;
  }, [camp, recips, excludedSet]);

  /* ------------------------------ Handlinger -------------------------------- */
  const createDraft = async (template) => {
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/newsletter/draft?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const j = await r.json();
      if (j.ok) { setTplOpen(false); await openCampaign(j.campaign.id); await loadList(); }
    } catch (e) {}
    setBusy(false);
  };

  const deleteCampaign = async (id) => {
    if (!confirm('Slette denne kampanjen? Kan ikke angres.')) return;
    await fetch(`/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`, { method: 'DELETE' });
    await loadList();
    if (camp?.id === id) { setCamp(null); setView('list'); }
  };

  const duplicateCampaign = async (id) => {
    const r = await fetch(`/api/admin/newsletter/duplicate?${q}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    const j = await r.json();
    if (j.ok) { await loadList(); await openCampaign(j.campaign.id); }
  };

  const openPreview = async () => {
    setPreviewOpen(true); setPreviewHtml('');
    try {
      const r = await fetch(`/api/admin/newsletter/preview?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: camp.blocks.map(({ id, ...rest }) => rest), theme: camp.theme, subject: camp.subject, preheader: camp.preheader }),
      });
      const j = await r.json();
      if (j.ok) setPreviewHtml(j.html);
    } catch (e) {}
  };

  const sendTest = async () => {
    setTestState({ s: 'sending', msg: '' });
    try {
      try { localStorage.setItem('nl_test_to', testTo); } catch (e) {}
      const r = await fetch(`/api/admin/newsletter/test?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testTo, message: testMsg, blocks: camp.blocks.map(({ id, ...rest }) => rest),
          subject: camp.subject, preheader: camp.preheader, theme: camp.theme, fromName: camp.fromName,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Test feilet');
      const n = j.sentCount || (Array.isArray(j.sentTo) ? j.sentTo.length : 1);
      const failedN = (j.failed || []).length;
      setTestState({ s: 'sent', msg: `Test sendt til ${n} mottaker${n === 1 ? '' : 'e'}${failedN ? ` · ${failedN} feilet` : ''}` });
      setTimeout(() => { setTestState({ s: 'idle', msg: '' }); setTestOpen(false); }, 2500);
    } catch (e) { setTestState({ s: 'error', msg: e.message }); }
  };

  /* -------------------------- AI: emne + forhåndstekst ---------------------- */
  const suggestAI = async (mode = 'ny') => {
    if (!camp) return;
    setAiState('loading'); setAiErr('');
    try {
      const r = await fetch(`/api/admin/newsletter/suggest?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: camp.blocks.map(({ id, ...rest }) => rest),
          title: camp.title, mode,
          currentSubject: camp.subject || '', currentPreheader: camp.preheader || '',
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'AI-forslag feilet');
      const first = j.suggestions[0];
      patch({ subject: first.subject, preheader: first.preheader || '' });
      setAiAlts(j.suggestions);
      setAiState('idle');
    } catch (e) { setAiState('error'); setAiErr(e.message); }
  };

  // Auto-forslag: fyll inn emne/forhåndstekst med AI når begge er tomme og
  // brevet har reelt innhold (kjøres maks én gang per kampanje per økt).
  useEffect(() => {
    if (view !== 'editor' || !camp || camp.status === 'sent') return;
    if ((camp.subject || '').trim() || (camp.preheader || '').trim()) return;
    if (aiAutoTried.current[camp.id]) return;
    const hasText = (camp.blocks || []).some((b) =>
      (b.type === 'text' && (b.text || '').trim().length > 40) || b.type === 'offer' || (b.type === 'heading' && (b.text || '').trim().length > 10));
    if (!hasText) return;
    aiAutoTried.current[camp.id] = true;
    suggestAI('ny');
  }, [view, camp?.id]); // eslint-disable-line

  const doSend = async () => {
    setSendState('sending'); setSendErr('');
    try {
      await persist(camp); // sikre at siste endringer er lagret før sending
      const r = await fetch(`/api/admin/newsletter/send?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: camp.id }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'Sending feilet');
      setSendState('sent'); setConfirming(false);
      await loadList();
      await openCampaign(camp.id); // → stats-view
    } catch (e) { setSendState('idle'); setSendErr(e.message); }
  };

  /* ------------------------------ Tema/accent ------------------------------- */
  const themes = listData?.themes || [{ key: 'lavendel', accent: '#d298ff' }];
  const accent = themes.find((t) => t.key === camp?.theme)?.accent || '#d298ff';

  /* ========================== VIEW: ABONNENTER ============================== */
  if (view === 'subs') return <SubscribersView q={q} onBack={() => setView('list')} />;

  /* ============================ VIEW: STATS ================================= */
  if (view === 'stats' && camp) {
    return <StatsView camp={camp} stats={stats} q={q} onBack={() => { setCamp(null); setView('list'); loadList(); }} onDuplicate={() => duplicateCampaign(camp.id)} />;
  }

  /* ============================ VIEW: EDITOR ================================ */
  if (view === 'editor' && camp) {
    const selected = camp.blocks.find((b) => b.id === selectedBlock) || null;
    return (
      <div className="-m-1" data-testid="nl-editor">
        {/* Toppbar (under admin-headeren, h-16 = 64px) */}
        <div className="sticky top-16 z-20 flex items-center gap-3 rounded-2xl border border-[#f0f0f0] bg-white/95 backdrop-blur px-4 py-2.5 shadow-[0_6px_24px_-16px_rgba(0,0,0,0.15)]">
          <button onClick={() => { setCamp(null); setView('list'); loadList(); }} className="flex items-center gap-1 text-[12.5px] font-medium text-[#888] hover:text-[#111]" data-testid="nl-back">
            <ArrowLeft size={14} /> Oversikt
          </button>
          <div className="w-px h-5 bg-[#eee]" />
          <input value={camp.title || ''} onChange={(e) => patch({ title: e.target.value })} placeholder="Navn på kampanjen…"
            className="flex-1 min-w-0 bg-transparent text-[14px] font-semibold text-[#111] outline-none" data-testid="nl-title-input" />
          <span className={`text-[11px] font-medium shrink-0 ${saveState === 'saving' ? 'text-amber-500' : 'text-[#b5b5b5]'}`}>
            {saveState === 'saving' ? 'Lagrer…' : saveState === 'saved' ? <span className="inline-flex items-center gap-1"><Check size={11} /> Lagret</span> : ''}
          </span>
          <div className="flex items-center rounded-full bg-[#f4f2ef] p-0.5">
            {[['desktop', Monitor], ['mobile', Smartphone]].map(([k, Icon]) => (
              <button key={k} onClick={() => setDevice(k)} className={`w-8 h-7 rounded-full flex items-center justify-center ${device === k ? 'bg-white shadow-sm text-[#111]' : 'text-[#999]'}`}>
                <Icon size={13} />
              </button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => setTestOpen((v) => !v)} className="h-[34px] rounded-full border border-[#e5e5e5] text-[12px] font-semibold px-3.5 flex items-center gap-1.5 hover:border-[#c99df0]" data-testid="nl-test-open">
              <FlaskConical size={13} /> Test
            </button>
            {testOpen ? (
              <div className="absolute right-0 top-[42px] w-[320px] rounded-2xl border border-[#eee] bg-white shadow-xl p-4 z-30">
                <p className="text-[12px] font-bold text-[#111]">Send test-nyhetsbrev</p>
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="epost1@…, epost2@…, epost3@…" data-testid="nl-test-to"
                  className="w-full h-[36px] rounded-lg border border-[#e8e8e8] px-3 text-[13px] outline-none focus:border-[#c99df0] mt-2" />
                <p className="text-[10.5px] text-[#aaa] mt-1">Skill flere mottakere med komma (maks 10).</p>
                <textarea value={testMsg} onChange={(e) => setTestMsg(e.target.value)} rows={3} data-testid="nl-test-message"
                  placeholder="Melding til mottakerne (valgfritt) — f.eks. «Hva synes dere om utkastet?»"
                  className="w-full rounded-lg border border-[#e8e8e8] px-3 py-2 text-[12.5px] outline-none focus:border-[#c99df0] mt-2 resize-none" />
                <p className="text-[10.5px] text-[#aaa] mt-0.5">Vises i et gult banner øverst — kun i testen.</p>
                <button onClick={sendTest} disabled={testState.s === 'sending' || !testTo.trim()} data-testid="nl-test-send"
                  className="w-full h-[36px] rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-semibold mt-2 disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {testState.s === 'sending' ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />} Send test
                </button>
                {testState.msg ? <p className={`text-[11.5px] mt-2 ${testState.s === 'error' ? 'text-red-500' : 'text-emerald-600'}`}>{testState.msg}</p> : null}
              </div>
            ) : null}
          </div>
          <button onClick={openPreview} className="h-[34px] rounded-full border border-[#e5e5e5] text-[12px] font-semibold px-3.5 flex items-center gap-1.5 hover:border-[#c99df0]" data-testid="nl-preview">
            <Eye size={13} /> Forhåndsvis
          </button>
          <button onClick={() => { setConfirming(true); if (!recips) loadRecipients(camp.segments); }} data-testid="nl-send-button"
            className="h-[34px] rounded-full bg-[#0a0a0a] text-white text-[12px] font-bold px-4 flex items-center gap-1.5">
            <Send size={12} /> Send{netCount != null ? ` (${netCount})` : ''}
          </button>
        </div>

        {/* 3 kolonner (desktop) → stables på smalere skjermer */}
        <div className="grid grid-cols-1 lg:grid-cols-[190px_minmax(0,1fr)_280px] xl:grid-cols-[210px_minmax(0,1fr)_300px] gap-4 mt-4 items-start">
          {/* Palett */}
          <div className="rounded-2xl border border-[#f0f0f0] bg-white p-3 lg:sticky lg:top-[132px]">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#aaa] px-1">Blokker</p>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {PALETTE.map((p) => (
                <button key={p.type} onClick={() => addBlock(p.type)} data-testid={`nl-add-${p.type}`}
                  className="rounded-xl border border-[#f2f0ed] bg-[#fbfaf9] hover:border-[#d8c3ec] hover:bg-[#faf6fe] px-2 py-2.5 flex flex-col items-center gap-1.5 transition-colors">
                  {React.createElement(p.icon, { size: 15, className: 'text-[#a07cc4]' })}
                  <span className="text-[10px] font-semibold text-[#666] leading-tight text-center">{p.label}</span>
                </button>
              ))}
            </div>
            <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#aaa] px-1 mt-4">Tema</p>
            <div className="flex flex-wrap gap-1.5 mt-2 px-1">
              {themes.map((t) => (
                <button key={t.key} onClick={() => patch({ theme: t.key })} title={t.key}
                  className={`w-7 h-7 rounded-full border-2 ${camp.theme === t.key ? 'border-[#0a0a0a]' : 'border-transparent'}`}
                  style={{ background: t.accent }} />
              ))}
            </div>
          </div>

          {/* Canvas */}
          <div className="min-w-0">
            <div className="mx-auto transition-all" style={{ maxWidth: device === 'mobile' ? 400 : 660 }}>
              <div className="rounded-[22px] p-4 sm:p-6" style={{ background: '#f0ede9' }} onClick={() => setSelectedBlock(null)}>
                {/* logo-header som i e-posten */}
                <div className="px-2 pb-3"><img src="/email-logo.png" alt="DigiHome" style={{ height: 22 }} /></div>
                <div className={`rounded-2xl bg-white overflow-hidden pb-5 ${camp.blocks[0]?.type === 'hero' ? '' : 'pt-5'}`} onClick={(e) => e.stopPropagation()} data-testid="nl-canvas">
                  {camp.blocks.length === 0 ? (
                    <div className="px-10 py-14 text-center">
                      <p className="text-[15px] font-semibold text-[#555]">Bygg nyhetsbrevet ditt</p>
                      <p className="text-[12.5px] text-[#aaa] mt-1.5">Velg blokker fra venstre — eller start med hero-bilde og tilbudskort.</p>
                    </div>
                  ) : camp.blocks.map((b, i) => (
                    <CanvasBlock key={b.id} b={b} i={i} total={camp.blocks.length} accent={accent}
                      selected={selectedBlock === b.id} onSelect={setSelectedBlock}
                      onPatch={(p) => patchBlock(b.id, p)} onMove={moveBlock} onDup={duplicateBlock} onDel={removeBlock}
                      onUploadImage={uploadImage} uploadingId={uploadingId}
                      onDragStartBlock={onDragStartBlock} onDragOverBlock={onDragOverBlock} onDropBlock={onDropBlock} />
                  ))}
                </div>
                <p className="text-center text-[10.5px] text-[#b3a89b] pt-3">Avmeldingslenke og bunntekst legges til automatisk</p>
              </div>
            </div>
          </div>

          {/* Inspektør */}
          <div className="rounded-2xl border border-[#f0f0f0] bg-white p-4 lg:sticky lg:top-[132px] lg:max-h-[calc(100vh-160px)] overflow-y-auto">
            {selected ? (
              <BlockInspector b={selected} onPatch={(p) => patchBlock(selected.id, p)} onDel={removeBlock}
                onUploadImage={uploadImage} uploadingId={uploadingId} apiQ={q} blocks={camp.blocks} />
            ) : (
              <>
                <div className="flex rounded-full bg-[#f4f2ef] p-0.5">
                  {[['oppsett', 'Oppsett', Settings2], ['mottakere', 'Mottakere', Users]].map(([k, l, Icon]) => (
                    <button key={k} onClick={() => setPanelTab(k)}
                      className={`flex-1 h-[30px] rounded-full text-[11.5px] font-semibold flex items-center justify-center gap-1.5 ${panelTab === k ? 'bg-white shadow-sm text-[#111]' : 'text-[#999]'}`}>
                      <Icon size={12} /> {l}
                    </button>
                  ))}
                </div>

                {panelTab === 'oppsett' ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-semibold text-[#777]">Emnefelt *</label>
                      <button onClick={() => suggestAI(camp.subject ? 'forbedre' : 'ny')} disabled={aiState === 'loading'} data-testid="nl-ai-suggest"
                        className="flex items-center gap-1 text-[11px] font-bold text-[#a052e0] hover:text-[#7A3EC8] disabled:opacity-50">
                        {aiState === 'loading' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {aiState === 'loading' ? 'AI skriver…' : camp.subject ? 'Forbedre med AI' : 'Foreslå med AI'}
                      </button>
                    </div>
                    <input value={camp.subject || ''} onChange={(e) => patch({ subject: e.target.value })} data-testid="nl-subject-input"
                      placeholder="F.eks. {{first_name}}, sommertilbud på forvaltning"
                      className="w-full h-[38px] rounded-lg border border-[#e8e8e8] px-3 text-[13px] outline-none focus:border-[#c99df0]" />
                    <label className="text-[11px] font-semibold text-[#777] block mb-1.5 mt-4">Forhåndstekst</label>
                    <input value={camp.preheader || ''} onChange={(e) => patch({ preheader: e.target.value })}
                      placeholder="Vises etter emnet i innboksen"
                      className="w-full h-[38px] rounded-lg border border-[#e8e8e8] px-3 text-[13px] outline-none focus:border-[#c99df0]" />
                    {aiState === 'error' && aiErr ? <p className="text-[11px] text-red-500 mt-2">{aiErr}</p> : null}
                    {aiAlts.length > 1 ? (
                      <div className="mt-3 rounded-xl bg-[#faf7fe] border border-[#efe6f9] p-2.5" data-testid="nl-ai-alts">
                        <div className="flex items-center justify-between px-0.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#a98cc9] flex items-center gap-1"><Sparkles size={10} /> AI-forslag — klikk for å bruke</p>
                          <button onClick={() => suggestAI('ny')} disabled={aiState === 'loading'} title="Lag helt nye forslag"
                            className="text-[#a98cc9] hover:text-[#7A3EC8] disabled:opacity-50"><RefreshCw size={11} className={aiState === 'loading' ? 'animate-spin' : ''} /></button>
                        </div>
                        {aiAlts.map((a, i) => (
                          <button key={i} onClick={() => patch({ subject: a.subject, preheader: a.preheader })}
                            className={`w-full text-left rounded-lg border px-2.5 py-2 mt-1.5 transition-colors ${camp.subject === a.subject ? 'border-[#c99df0] bg-white' : 'border-transparent bg-white/60 hover:bg-white hover:border-[#e5d8f2]'}`}>
                            <span className="text-[11.5px] font-semibold text-[#111] block leading-snug">{a.subject}</span>
                            {a.preheader ? <span className="text-[10px] text-[#999] block mt-0.5 leading-snug">{a.preheader}</span> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <label className="text-[11px] font-semibold text-[#777] block mb-1.5 mt-4">Avsendernavn</label>
                    <input value={camp.fromName || ''} onChange={(e) => patch({ fromName: e.target.value })}
                      placeholder="DigiHome"
                      className="w-full h-[38px] rounded-lg border border-[#e8e8e8] px-3 text-[13px] outline-none focus:border-[#c99df0]" />
                    <p className="text-[10.5px] text-[#bbb] leading-[1.5] mt-4">Flettekoder: <code className="bg-[#f4f2ef] px-1 rounded">{'{{name}}'}</code> <code className="bg-[#f4f2ef] px-1 rounded">{'{{first_name}}'}</code> — fungerer i emnefelt og tekstblokker.</p>
                  </div>
                ) : (
                  <div className="mt-4" data-testid="nl-audience-panel">
                    {/* Segmenter */}
                    {(audiences?.segments || []).map((s) => {
                      const on = (camp.segments || []).includes(s.key);
                      return (
                        <button key={s.key} data-testid={`nl-audience-${s.key}`}
                          onClick={() => patch({ segments: on ? camp.segments.filter((x) => x !== s.key) : [...(camp.segments || []), s.key] })}
                          className={`w-full flex items-center justify-between rounded-xl border px-3 py-2.5 mb-1.5 text-left transition-colors ${on ? 'border-[#c99df0] bg-[#faf6fe]' : 'border-[#f0f0f0] bg-white hover:border-[#e0d5ec]'}`}>
                          <span>
                            <span className="text-[12.5px] font-semibold text-[#111] block">{s.label}</span>
                            <span className="text-[10.5px] text-[#999]">{s.desc}</span>
                          </span>
                          <span className={`text-[12px] font-bold tabular-nums ${on ? 'text-[#a052e0]' : 'text-[#bbb]'}`}>{s.count}</span>
                        </button>
                      );
                    })}

                    {/* Manuelle mottakere */}
                    <p className="text-[11px] font-semibold text-[#777] mt-4 mb-1.5">Legg til mottakere manuelt</p>
                    <div className="flex gap-1.5">
                      <input value={extraInput} onChange={(e) => setExtraInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtra(); } }}
                        placeholder="epost@eksempel.no" data-testid="nl-extra-input"
                        className="flex-1 h-[34px] rounded-lg border border-[#e8e8e8] px-3 text-[12.5px] outline-none focus:border-[#c99df0]" />
                      <button onClick={addExtra} data-testid="nl-extra-add" className="w-[34px] h-[34px] rounded-lg bg-[#0a0a0a] text-white flex items-center justify-center"><Plus size={14} /></button>
                    </div>
                    {(camp.extraEmails || []).length ? (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {camp.extraEmails.map((x) => (
                          <span key={x.email} className="inline-flex items-center gap-1 rounded-full bg-[#f5edfc] text-[#7b3fb0] text-[11px] font-medium pl-2.5 pr-1 py-1">
                            {x.email}
                            <button onClick={() => removeExtra(x.email)} className="hover:text-red-500"><X size={11} /></button>
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {/* Mottakerliste med ekskludering */}
                    <div className="flex items-center justify-between mt-4 mb-1.5">
                      <p className="text-[11px] font-semibold text-[#777]">Mottakere fra målgrupper</p>
                      <span className="text-[11px] font-bold text-[#a052e0] tabular-nums">{netCount != null ? `${netCount} netto` : ''}</span>
                    </div>
                    <div className="relative">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#bbb]" />
                      <input value={recipSearch} onChange={(e) => setRecipSearch(e.target.value)} placeholder="Søk…"
                        className="w-full h-[32px] rounded-lg border border-[#e8e8e8] pl-7 pr-3 text-[12px] outline-none focus:border-[#c99df0]" />
                    </div>
                    <div className="max-h-[260px] overflow-y-auto mt-1.5 -mx-1 px-1">
                      {!recips ? (
                        <p className="text-[11.5px] text-[#aaa] py-3 text-center"><Loader2 size={13} className="animate-spin inline" /></p>
                      ) : recips.recipients.length === 0 ? (
                        <p className="text-[11.5px] text-[#aaa] py-3 text-center">Velg minst én målgruppe over.</p>
                      ) : recips.recipients
                        .filter((r) => !recipSearch || (r.email + ' ' + (r.name || '')).toLowerCase().includes(recipSearch.toLowerCase()))
                        .slice(0, 400)
                        .map((r) => {
                          const off = excludedSet.has(r.email);
                          return (
                            <button key={r.email} onClick={() => toggleExclude(r.email)}
                              className={`w-full flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-[#faf8f5] ${off ? 'opacity-45' : ''}`}>
                              <span className="min-w-0">
                                <span className={`text-[12px] font-medium block truncate ${off ? 'line-through text-[#999]' : 'text-[#222]'}`}>{r.email}</span>
                                <span className="text-[10px] text-[#aaa] truncate block">{r.name || '—'} · {SEG_LABEL[r.segment] || r.segment}</span>
                              </span>
                              <span className={`text-[10px] font-bold shrink-0 ${off ? 'text-red-400' : 'text-emerald-500'}`}>{off ? 'Ekskludert' : 'Med'}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Forhåndsvisning */}
        {previewOpen ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setPreviewOpen(false)}>
            <div className="bg-[#f0ede9] rounded-2xl overflow-hidden max-h-[90vh] w-full" style={{ maxWidth: device === 'mobile' ? 420 : 700 }} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between bg-white px-4 py-2.5 border-b border-[#eee]">
                <p className="text-[12.5px] font-bold">Forhåndsvisning</p>
                <button onClick={() => setPreviewOpen(false)}><X size={16} className="text-[#999] hover:text-[#111]" /></button>
              </div>
              {previewHtml
                ? <iframe title="preview" srcDoc={previewHtml} className="w-full" style={{ height: '78vh', border: 0 }} />
                : <div className="h-[300px] flex items-center justify-center"><Loader2 size={20} className="animate-spin text-[#a052e0]" /></div>}
            </div>
          </div>
        ) : null}

        {/* Send-bekreftelse */}
        {confirming ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setConfirming(false)}>
            <div className="bg-white rounded-3xl p-7 w-full max-w-[440px]" onClick={(e) => e.stopPropagation()}>
              <p className="text-[18px] font-bold tracking-[-0.01em]">Klar til å sende?</p>
              <div className="rounded-2xl bg-[#faf8f5] border border-[#f0ede8] p-4 mt-4 space-y-2">
                <div className="flex justify-between text-[13px]"><span className="text-[#888]">Emne</span><span className="font-semibold text-right max-w-[260px] truncate">{camp.subject || <em className="text-red-500 not-italic">mangler</em>}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-[#888]">Målgrupper</span><span className="font-semibold">{(camp.segments || []).map((s) => SEG_LABEL[s]).join(', ') || '—'}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-[#888]">Manuelt lagt til</span><span className="font-semibold">{(camp.extraEmails || []).length}</span></div>
                <div className="flex justify-between text-[13px]"><span className="text-[#888]">Ekskludert</span><span className="font-semibold">{(camp.excludedEmails || []).length}</span></div>
                <div className="flex justify-between text-[14px] pt-1 border-t border-[#eee]"><span className="text-[#888]">Netto mottakere</span><span className="font-bold text-[#a052e0]">{netCount != null ? netCount : '…'}</span></div>
              </div>
              {sendErr ? <p className="text-[12.5px] text-red-500 mt-3">{sendErr}</p> : null}
              <div className="flex gap-2 mt-5">
                <button onClick={() => setConfirming(false)} className="flex-1 h-[42px] rounded-full border border-[#e5e5e5] text-[13px] font-semibold">Avbryt</button>
                <button onClick={doSend} disabled={sendState === 'sending' || !camp.subject} data-testid="nl-confirm-send"
                  className="flex-1 h-[42px] rounded-full bg-[#0a0a0a] text-white text-[13px] font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {sendState === 'sending' ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />} Send nå
                </button>
              </div>
              <p className="text-[10.5px] text-[#bbb] text-center mt-3">Avmeldte og ugyldige adresser filtreres automatisk. Kan ikke angres.</p>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  /* ============================= VIEW: LIST ================================= */
  const campaigns = (listData?.campaigns || []).filter((c) =>
    filter === 'alle' ? true : filter === 'utkast' ? c.status !== 'sent' : c.status === 'sent');
  const sentC = (listData?.campaigns || []).filter((c) => c.status === 'sent');
  const avg = (arr) => (arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null);
  const avgOpen = avg(sentC.map((c) => c.openRate).filter((x) => x != null));
  const avgClick = avg(sentC.map((c) => c.clickRate).filter((x) => x != null));
  const subsCount = (audiences?.segments || []).find((s) => s.key === 'abonnenter')?.count;

  return (
    <div data-testid="nl-list">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[#111]">Nyhetsbrev-studio</h2>
          <p className="text-[13px] text-[#999] mt-0.5">Design, send og analyser — alt på ett sted.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView('subs')} data-testid="nl-open-subs"
            className="h-[38px] rounded-full border border-[#e5e5e5] bg-white text-[12.5px] font-semibold px-4 flex items-center gap-1.5 hover:border-[#c99df0]">
            <UsersRound size={14} /> Abonnenter{subsCount != null ? ` (${subsCount})` : ''}
          </button>
          <button onClick={() => setTplOpen(true)} data-testid="nl-new-button"
            className="h-[38px] rounded-full bg-[#0a0a0a] text-white text-[12.5px] font-bold px-5 flex items-center gap-1.5">
            <Plus size={14} /> Nytt nyhetsbrev
          </button>
        </div>
      </div>

      {/* KPI-stripe */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
        {[
          { l: 'Sendte kampanjer', v: sentC.length, icon: Mail },
          { l: 'Snitt åpningsrate', v: avgOpen != null ? `${avgOpen} %` : '—', icon: MailOpen },
          { l: 'Snitt klikkrate', v: avgClick != null ? `${avgClick} %` : '—', icon: MousePointerClick },
          { l: 'Utkast', v: (listData?.campaigns || []).filter((c) => c.status !== 'sent').length, icon: PenLine },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl border border-[#f0f0f0] bg-white px-4 py-3.5 flex items-center gap-3">
            {React.createElement(k.icon, { size: 16, className: 'text-[#c9b3e0] shrink-0' })}
            <div>
              <p className="text-[18px] font-bold tabular-nums leading-none text-[#111]">{k.v}</p>
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-[#aaa] mt-1">{k.l}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1.5 mt-6">
        {[['alle', 'Alle'], ['utkast', 'Utkast'], ['sendt', 'Sendt']].map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`h-[30px] rounded-full text-[12px] font-semibold px-3.5 ${filter === k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777] hover:bg-[#ece9e4]'}`}>{l}</button>
        ))}
      </div>

      {/* Kampanjekort */}
      {campaigns.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[#e2dcea] bg-[#fdfcfb] py-16 text-center mt-4">
          <Mail size={22} className="text-[#cbb8de] inline" />
          <p className="text-[14.5px] font-semibold text-[#555] mt-3">Ingen kampanjer her ennå</p>
          <p className="text-[12.5px] text-[#aaa] mt-1">Trykk «Nytt nyhetsbrev» — sommermalen ligger klar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-4">
          {campaigns.map((c) => (
            <div key={c.id} onClick={() => openCampaign(c.id)} data-testid="nl-campaign-card"
              className="group rounded-2xl border border-[#f0f0f0] bg-white p-5 cursor-pointer hover:border-[#d8c3ec] hover:shadow-[0_10px_30px_-18px_rgba(160,82,224,0.25)] transition-all">
              <div className="flex items-center justify-between">
                {c.status === 'sent'
                  ? <span className="rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5">Sendt</span>
                  : <span className="rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-[0.08em] px-2 py-0.5">Utkast</span>}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); duplicateCampaign(c.id); }} title="Dupliser" className="p-1.5 text-[#bbb] hover:text-[#111]"><Copy size={13} /></button>
                  <button onClick={(e) => { e.stopPropagation(); deleteCampaign(c.id); }} title="Slett" className="p-1.5 text-[#bbb] hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="text-[15px] font-bold tracking-[-0.01em] text-[#111] mt-3 truncate">{c.title || 'Uten navn'}</p>
              <p className="text-[12.5px] text-[#999] mt-0.5 truncate">{c.subject || 'Emnefelt mangler'}</p>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#f6f6f6]">
                {c.status === 'sent' ? (
                  <div className="flex gap-4">
                    <span className="text-[11.5px] text-[#777]"><strong className="text-[#111] tabular-nums">{c.sent}</strong> sendt</span>
                    <span className="text-[11.5px] text-[#777]"><strong className="text-[#111] tabular-nums">{c.openRate ?? '—'}%</strong> åpnet</span>
                    <span className="text-[11.5px] text-[#777]"><strong className="text-[#111] tabular-nums">{c.clickRate ?? '—'}%</strong> klikk</span>
                  </div>
                ) : (
                  <span className="text-[11.5px] text-[#aaa]">Endret {fmtDate(c.updatedAt)}</span>
                )}
                <ChevronRight size={14} className="text-[#ccc] group-hover:text-[#a052e0] transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mal-galleri */}
      {tplOpen ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-6" onClick={() => setTplOpen(false)}>
          <div className="bg-white rounded-3xl p-7 w-full max-w-[620px]" onClick={(e) => e.stopPropagation()}>
            <p className="text-[18px] font-bold tracking-[-0.01em]">Velg et startpunkt</p>
            <p className="text-[12.5px] text-[#999] mt-1">Alle maler kan tilpasses fritt etterpå.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5">
              {(listData?.templates || []).map((t) => {
                const hot = t.key === 'sommer';
                return (
                  <button key={t.key} onClick={() => createDraft(t.key)} disabled={busy} data-testid={`nl-template-${t.key}`}
                    className={`rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${hot ? 'border-[#c99df0] bg-[#faf6fe]' : 'border-[#eee] bg-white hover:border-[#d8c3ec]'}`}>
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-bold text-[#111]">{t.label}</p>
                      {hot ? <span className="rounded-full bg-[#a052e0] text-white text-[9.5px] font-bold uppercase tracking-[0.08em] px-2 py-0.5">Anbefalt nå</span> : null}
                    </div>
                    <p className="text-[11.5px] text-[#999] leading-[1.5] mt-1">{t.desc}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setTplOpen(false)} className="w-full h-[40px] rounded-full border border-[#e5e5e5] text-[13px] font-semibold mt-4">Avbryt</button>
          </div>
        </div>
      ) : null}

      {busy ? <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"><Loader2 size={22} className="animate-spin text-[#a052e0]" /></div> : null}
    </div>
  );
}
