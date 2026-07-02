'use client';

// Nyhetsbrev v2 — Mailchimp-klasse.
// Visninger: liste (kampanjer + stats) → editor (palett + canvas + panel) → stats.
// Autosave av utkast, mal-velger, tema, målgruppe-redigering på e-postnivå,
// forhåndsvisning (desktop/mobil), test-utsending og åpnings-/klikksporing.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Loader2, Mail, Send, Plus, Trash2, ChevronUp, ChevronDown, Type, AlignLeft,
  MousePointerClick, Image as ImageIcon, Minus, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, Eye, Users, ArrowLeft, Copy, List, Quote as QuoteIcon,
  MoveVertical, PenLine, Sparkles, Monitor, Smartphone, X, Search, RotateCcw,
  MousePointer2, MailOpen, BarChart3, Palette, Settings2, UserMinus,
} from 'lucide-react';

const uid = () => Math.random().toString(36).slice(2, 9);
const inputCls = 'w-full h-10 px-3.5 rounded-xl border border-[#e5e5e5] bg-white text-[14px] text-[#0a0a0a] placeholder:text-[#999] outline-none focus:border-[#cf97fc]/60 focus:shadow-[0_0_0_3px_rgba(207,151,252,0.14)] transition-all';
const THEME_SWATCHES = [
  { key: 'lavendel', label: 'Lavendel', accent: '#d298ff' },
  { key: 'skifer', label: 'Skifer', accent: '#0a0a0a' },
  { key: 'salvie', label: 'Salvie', accent: '#7fc79e' },
  { key: 'rav', label: 'Rav', accent: '#f0c86b' },
];
const TPL_ICONS = { tom: PenLine, signatur: Sparkles, tilbud: Mail, kunngjoring: Send, digest: List, reengasjement: RotateCcw };
const SEG_LABEL = { kunder: 'Kunder', leads: 'Utleier-leads', leietakere: 'Leietakere' };

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

// Auto-voksende tekstfelt for canvas
function AutoArea({ value, onChange, placeholder, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [value]);
  return (
    <textarea ref={ref} value={value} onChange={onChange} placeholder={placeholder} rows={1}
      className={`w-full resize-none bg-transparent outline-none overflow-hidden ${className || ''}`} style={style} />
  );
}

export default function NewsletterTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [view, setView] = useState('list'); // list | editor | stats
  const [listData, setListData] = useState(null);
  const [audiences, setAudiences] = useState(null);
  const [filter, setFilter] = useState('alle');
  const [tplOpen, setTplOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Aktiv kampanje (editor/stats)
  const [camp, setCamp] = useState(null);
  const [stats, setStats] = useState(null);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved
  const [panelTab, setPanelTab] = useState('oppsett'); // oppsett | tema | malgruppe
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState('desktop');
  const [previewHtml, setPreviewHtml] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testState, setTestState] = useState({ s: 'idle', msg: '' });
  const [confirming, setConfirming] = useState(false);
  const [sendState, setSendState] = useState('idle');
  const [sendErr, setSendErr] = useState('');
  const [recips, setRecips] = useState(null); // {recipients, total}
  const [recipSearch, setRecipSearch] = useState('');
  const saveTimer = useRef(null);
  const firstLoad = useRef(true);

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
          excludedEmails: c.excludedEmails,
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
    saveTimer.current = setTimeout(() => persist(camp), 800);
    return () => clearTimeout(saveTimer.current);
  }, [camp, view, persist]);

  const patch = (p) => setCamp((c) => ({ ...c, ...p }));
  const patchBlock = (id, p) => setCamp((c) => ({ ...c, blocks: c.blocks.map((b) => (b.id === id ? { ...b, ...p } : b)) }));
  const removeBlock = (id) => setCamp((c) => ({ ...c, blocks: c.blocks.filter((b) => b.id !== id) }));
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
  const addBlock = (type) => {
    const nb = { id: uid(), type };
    if (type === 'bullets') nb.items = ['Første punkt'];
    if (type === 'button') { nb.label = 'Les mer'; nb.url = 'https://digihome.no'; }
    if (type === 'cta-card') { nb.title = 'Er du interessert?'; nb.text = ''; nb.label = 'Ja, jeg er interessert'; nb.url = 'https://digihome.no/bli-utleier'; }
    if (type === 'signature') { nb.name = 'Martin Kviteberg'; nb.title = 'DigiHome — lokalt team i Bergen'; }
    if (type === 'spacer') nb.size = 'm';
    setCamp((c) => ({ ...c, blocks: [...c.blocks, nb] }));
    setSelectedBlock(nb.id);
  };

  /* ------------------------------ Målgruppe -------------------------------- */
  const loadRecipients = useCallback(async (segments) => {
    if (!segments?.length) { setRecips({ recipients: [], total: 0 }); return; }
    try {
      const r = await fetch(`/api/admin/newsletter/recipients?segments=${segments.join(',')}&${q}`);
      const j = await r.json();
      if (j.ok) setRecips(j);
    } catch (e) {}
  }, [q]);
  useEffect(() => {
    if (view === 'editor' && panelTab === 'malgruppe' && camp) loadRecipients(camp.segments);
  }, [view, panelTab, camp?.segments?.join(','), loadRecipients]); // eslint-disable-line react-hooks/exhaustive-deps

  const excluded = useMemo(() => new Set((camp?.excludedEmails || [])), [camp?.excludedEmails]);
  const netCount = recips ? recips.recipients.filter((r) => !excluded.has(r.email)).length : null;
  const toggleExclude = (email) => setCamp((c) => {
    const set = new Set(c.excludedEmails || []);
    if (set.has(email)) set.delete(email); else set.add(email);
    return { ...c, excludedEmails: [...set] };
  });

  /* --------------------------- Forhåndsvisning ----------------------------- */
  const fetchPreview = useCallback(async () => {
    if (!camp) return;
    try {
      const r = await fetch(`/api/admin/newsletter/preview?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: camp.subject, preheader: camp.preheader, theme: camp.theme, blocks: camp.blocks.map(({ id, ...rest }) => rest) }),
      });
      const j = await r.json();
      if (j.ok) setPreviewHtml(j.html);
    } catch (e) {}
  }, [camp, q]);
  useEffect(() => { if (previewOpen) fetchPreview(); }, [previewOpen, fetchPreview]);

  const sendTest = async () => {
    setTestState({ s: 'sending', msg: '' });
    try {
      const r = await fetch(`/api/admin/newsletter/test?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testTo, subject: camp.subject || camp.title, preheader: camp.preheader, theme: camp.theme, fromName: camp.fromName, blocks: camp.blocks.map(({ id, ...rest }) => rest) }),
      });
      const j = await r.json();
      setTestState(j.ok ? { s: 'ok', msg: `Test sendt til ${j.sentTo}` } : { s: 'err', msg: j.error || 'Ukjent feil' });
    } catch (e) { setTestState({ s: 'err', msg: 'Nettverksfeil' }); }
  };

  const doSend = async () => {
    setSendState('sending'); setSendErr('');
    try {
      await persist(camp);
      const r = await fetch(`/api/admin/newsletter/send?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: camp.id }),
      });
      const j = await r.json();
      if (j.ok) {
        setSendState('ok'); setConfirming(false);
        await loadList();
        await openCampaign(camp.id); // → statsvisning
      } else { setSendState('err'); setSendErr(j.error || 'Ukjent feil'); }
    } catch (e) { setSendState('err'); setSendErr('Nettverksfeil'); }
  };

  const createDraft = async (template) => {
    setBusy(true); setTplOpen(false);
    try {
      const r = await fetch(`/api/admin/newsletter/draft?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      });
      const j = await r.json();
      if (j.ok) { await loadList(); await openCampaign(j.campaign.id); }
    } catch (e) {}
    setBusy(false);
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Slette denne kampanjen?')) return;
    await fetch(`/api/admin/newsletter/campaign?id=${encodeURIComponent(id)}&${q}`, { method: 'DELETE' });
    loadList();
  };
  const duplicateCampaign = async (id) => {
    const r = await fetch(`/api/admin/newsletter/duplicate?${q}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    const j = await r.json();
    if (j.ok) { await loadList(); await openCampaign(j.campaign.id); }
  };

  const accent = THEME_SWATCHES.find((t) => t.key === (camp?.theme || 'lavendel'))?.accent || '#d298ff';

  /* ============================== LISTEVISNING ============================== */
  if (view === 'list') {
    const campaigns = (listData?.campaigns || []).filter((c) => filter === 'alle' || c.status === (filter === 'utkast' ? 'draft' : 'sent'));
    const totalAvail = (audiences?.segments || []).reduce((a, s) => a + s.count, 0);
    return (
      <div className="space-y-6" data-testid="newsletter-tab">
        {/* Mottaker-oversikt */}
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#999] mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Tilgjengelige mottakere · {totalAvail}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(audiences?.segments || []).map((s) => (
              <div key={s.key} className="rounded-2xl bg-white border border-[#eee] px-5 py-4">
                <p className="font-heading font-bold text-[26px] text-[#0a0a0a] leading-none">{s.count}</p>
                <p className="text-[12.5px] text-[#888] mt-1.5">{s.label.replace(' (vunnede utleiere)', '')}</p>
                <span className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] font-medium ${s.consent === 'safe' ? 'text-[#18794E]' : 'text-amber-600'}`}>
                  {s.consent === 'safe' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  {s.consent === 'safe' ? 'Kundeforhold' : 'Grå sone'}
                </span>
              </div>
            ))}
            <div className="rounded-2xl bg-white border border-[#eee] px-5 py-4">
              <p className="font-heading font-bold text-[26px] text-[#0a0a0a] leading-none">{audiences?.optouts ?? '—'}</p>
              <p className="text-[12.5px] text-[#888] mt-1.5">Avmeldte</p>
              <span className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-[#999]"><UserMinus className="w-3 h-3" /> Ekskluderes alltid</span>
            </div>
          </div>
        </div>

        {/* Filterlinje + ny kampanje */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex rounded-full bg-[#f5f3f0] p-1">
            {[['alle', 'Alle'], ['utkast', 'Utkast'], ['sendt', 'Sendt']].map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`h-8 px-4 rounded-full text-[13px] font-medium transition-all ${filter === k ? 'bg-white text-[#0a0a0a] shadow-sm' : 'text-[#888] hover:text-[#0a0a0a]'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setTplOpen(true)} data-testid="nl-new-campaign"
            className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all">
            <Plus className="w-4 h-4" /> Ny kampanje
          </button>
        </div>

        {/* Kampanjeliste */}
        <div className="rounded-3xl bg-white border border-[#eee] overflow-hidden">
          {!listData ? (
            <div className="h-40 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[#9B5BD6]" /></div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center">
              <Mail className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
              <p className="text-[14px] text-[#999]">Ingen kampanjer {filter !== 'alle' ? 'i dette filteret' : 'ennå'} — trykk «Ny kampanje» for å komme i gang.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#f3f3f3]">
              {/* Kolonneoverskrifter */}
              <div className="hidden sm:grid grid-cols-[1fr_110px_110px_110px_90px] gap-3 px-6 py-3 text-[10.5px] uppercase tracking-[0.1em] font-semibold text-[#aaa]">
                <span>Kampanje</span><span className="text-right">Mottakere</span>
                <span className="text-right inline-flex items-center justify-end gap-1"><MailOpen className="w-3 h-3" /> Åpnet</span>
                <span className="text-right inline-flex items-center justify-end gap-1"><MousePointer2 className="w-3 h-3" /> Klikket</span>
                <span />
              </div>
              {campaigns.map((c) => (
                <div key={c.id} className="grid sm:grid-cols-[1fr_110px_110px_110px_90px] gap-3 items-center px-6 py-4 hover:bg-[#fafafa] transition-colors cursor-pointer group" onClick={() => openCampaign(c.id)}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${c.status === 'sent' ? 'bg-[#E8F4EE] text-[#18794E]' : 'bg-amber-50 text-amber-600'}`}>
                        {c.status === 'sent' ? 'Sendt' : 'Utkast'}
                      </span>
                      <p className="font-semibold text-[14.5px] text-[#0a0a0a] truncate">{c.title || 'Uten tittel'}</p>
                    </div>
                    <p className="text-[12.5px] text-[#999] mt-0.5 truncate">{c.subject || 'Uten emne'} · {c.status === 'sent' ? fmtDate(c.sentAt) : `endret ${fmtDate(c.updatedAt)}`}</p>
                  </div>
                  <div className="text-right text-[13.5px] text-[#555] font-medium">{c.status === 'sent' ? c.recipients : '—'}</div>
                  <div className="text-right">
                    {c.status === 'sent' ? (
                      <><span className="text-[13.5px] font-semibold text-[#0a0a0a]">{c.opensUnique}</span><span className="text-[11.5px] text-[#999] ml-1">{c.openRate != null ? `${String(c.openRate).replace('.', ',')} %` : ''}</span></>
                    ) : <span className="text-[#ccc]">—</span>}
                  </div>
                  <div className="text-right">
                    {c.status === 'sent' ? (
                      <><span className="text-[13.5px] font-semibold text-[#0a0a0a]">{c.clicksUnique}</span><span className="text-[11.5px] text-[#999] ml-1">{c.clickRate != null ? `${String(c.clickRate).replace('.', ',')} %` : ''}</span></>
                    ) : <span className="text-[#ccc]">—</span>}
                  </div>
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                    <button title="Dupliser" onClick={() => duplicateCampaign(c.id)} className="h-8 w-8 rounded-lg grid place-items-center text-[#999] hover:bg-[#f0f0f0] hover:text-[#0a0a0a]"><Copy className="w-3.5 h-3.5" /></button>
                    <button title="Slett" onClick={() => deleteCampaign(c.id)} className="h-8 w-8 rounded-lg grid place-items-center text-[#999] hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mal-velger */}
        {tplOpen ? (
          <div className="fixed inset-0 z-[130] flex items-center justify-center p-5">
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => setTplOpen(false)} />
            <div className="relative w-full max-w-[620px] rounded-3xl bg-white shadow-[0_60px_140px_-40px_rgba(0,0,0,0.5)] p-8">
              <h3 className="font-heading font-bold text-[20px] text-[#0a0a0a]">Velg et startpunkt</h3>
              <p className="text-[13.5px] text-[#888] mt-1">Begynn med en mal eller helt blankt. Du kan endre alt etterpå.</p>
              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                {(listData?.templates || []).map((t) => {
                  const Icon = TPL_ICONS[t.key] || Mail;
                  return (
                    <button key={t.key} onClick={() => createDraft(t.key)} disabled={busy} data-testid={`nl-tpl-${t.key}`}
                      className="text-left rounded-2xl border border-[#eee] hover:border-[#9B5BD6]/50 hover:bg-[#faf7ff] p-4 transition-all group">
                      <span className="inline-flex h-9 w-9 rounded-xl bg-[#f3ebff] items-center justify-center mb-2.5"><Icon className="w-4 h-4 text-[#9B5BD6]" /></span>
                      <p className="font-semibold text-[14px] text-[#0a0a0a]">{t.label}</p>
                      <p className="text-[12px] text-[#999] mt-0.5 leading-relaxed">{t.desc}</p>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setTplOpen(false)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-[#f5f3f0] grid place-items-center text-[#555] hover:bg-[#eee]"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ) : null}
        {busy ? <div className="fixed bottom-6 right-6 z-[140] rounded-full bg-[#0a0a0a] text-white px-4 py-2 text-[12.5px] inline-flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Åpner…</div> : null}
      </div>
    );
  }

  if (!camp) return <div className="h-60 grid place-items-center rounded-3xl bg-white border border-[#eee]"><Loader2 className="w-6 h-6 animate-spin text-[#9B5BD6]" /></div>;

  /* ============================== STATSVISNING ============================== */
  if (view === 'stats') {
    const s = stats || {};
    const cards = [
      { l: 'Mottakere', v: s.recipients ?? 0, icon: Users },
      { l: 'Levert', v: s.sent ?? 0, sub: s.failedCount ? `${s.failedCount} feilet` : null, icon: Send },
      { l: 'Åpnet (unike)', v: s.opensUnique ?? 0, sub: s.openRate != null ? `${String(s.openRate).replace('.', ',')} % åpningsrate` : null, icon: MailOpen },
      { l: 'Klikket (unike)', v: s.clicksUnique ?? 0, sub: s.clickRate != null ? `${String(s.clickRate).replace('.', ',')} % klikkrate` : null, icon: MousePointer2 },
    ];
    return (
      <div className="space-y-5" data-testid="newsletter-stats">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => { setView('list'); loadList(); }} className="h-9 w-9 rounded-xl bg-white border border-[#eee] grid place-items-center text-[#555] hover:bg-[#fafafa]"><ArrowLeft className="w-4 h-4" /></button>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h3 className="font-heading font-bold text-[18px] text-[#0a0a0a] truncate">{camp.title}</h3>
                <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase bg-[#E8F4EE] text-[#18794E]">Sendt</span>
              </div>
              <p className="text-[12.5px] text-[#999] mt-0.5">{camp.subject} · {fmtDate(camp.sentAt)}</p>
            </div>
          </div>
          <button onClick={() => duplicateCampaign(camp.id)} className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-white border border-[#ddd] text-[13px] font-medium text-[#555] hover:bg-[#fafafa]">
            <Copy className="w-3.5 h-3.5" /> Bruk som utgangspunkt
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((c, i) => (
            <div key={i} className="rounded-2xl bg-white border border-[#eee] px-5 py-4">
              <span className="inline-flex h-8 w-8 rounded-lg bg-[#f3ebff] items-center justify-center mb-2"><c.icon className="w-4 h-4 text-[#9B5BD6]" /></span>
              <p className="font-heading font-bold text-[26px] text-[#0a0a0a] leading-none">{c.v}</p>
              <p className="text-[12px] text-[#888] mt-1.5">{c.l}{c.sub ? <span className="text-[#18794E] font-medium"> · {c.sub}</span> : null}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <div className="rounded-3xl bg-white border border-[#eee] p-6">
            <h4 className="text-[15px] font-bold text-[#0a0a0a] mb-4 inline-flex items-center gap-2"><BarChart3 className="w-4 h-4 text-[#9B5BD6]" /> Klikk per lenke</h4>
            {(s.clicksByUrl || []).length === 0 ? (
              <p className="text-[13px] text-[#999]">Ingen klikk registrert ennå. Klikk dukker opp her i sanntid.</p>
            ) : (
              <div className="space-y-2.5">
                {s.clicksByUrl.map((u, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-[#fafafa] px-3.5 py-2.5">
                    <span className="text-[12.5px] text-[#555] truncate">{u.url.replace(/^https?:\/\//, '').split('?')[0]}</span>
                    <span className="shrink-0 text-[12.5px] font-semibold text-[#0a0a0a]">{u.unique} <span className="text-[#999] font-normal">unike · {u.total} totalt</span></span>
                  </div>
                ))}
              </div>
            )}
            {(camp.failed || []).length > 0 ? (
              <div className="mt-5 pt-4 border-t border-[#eee]">
                <p className="text-[12.5px] font-semibold text-amber-600 mb-2">Feilet ({camp.failedCount})</p>
                {(camp.failed || []).slice(0, 5).map((f, i) => <p key={i} className="text-[12px] text-[#999] truncate">{f.email} — {f.error}</p>)}
              </div>
            ) : null}
          </div>
          <div className="rounded-3xl bg-white border border-[#eee] overflow-hidden">
            <div className="px-5 py-3 border-b border-[#eee] text-[13px] font-semibold text-[#0a0a0a] inline-flex items-center gap-2 w-full"><Eye className="w-4 h-4 text-[#9B5BD6]" /> Innholdet som ble sendt</div>
            <StatsPreview camp={camp} q={q} />
          </div>
        </div>
      </div>
    );
  }

  /* ================================ EDITOR ================================= */
  const segCounts = Object.fromEntries((audiences?.segments || []).map((s) => [s.key, s.count]));
  const approxCount = netCount != null ? netCount : (camp.segments || []).reduce((a, k) => a + (segCounts[k] || 0), 0) - (camp.excludedEmails || []).length;

  return (
    <div className="space-y-4" data-testid="newsletter-editor">
      {/* Topplinje */}
      <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl bg-white border border-[#eee] px-4 py-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button onClick={() => { setView('list'); loadList(); }} data-testid="nl-back"
            className="h-9 w-9 shrink-0 rounded-xl bg-[#fafafa] border border-[#eee] grid place-items-center text-[#555] hover:bg-[#f0f0f0]"><ArrowLeft className="w-4 h-4" /></button>
          <div className="min-w-0 flex-1">
            <input value={camp.title || ''} onChange={(e) => patch({ title: e.target.value })} placeholder="Kampanjenavn"
              className="w-full max-w-[340px] bg-transparent outline-none font-heading font-bold text-[16.5px] text-[#0a0a0a] placeholder:text-[#bbb]" />
            <p className="text-[11px] text-[#aaa] leading-none mt-0.5">
              <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-600 px-1.5 py-px text-[9.5px] font-bold uppercase mr-1.5">Utkast</span>
              {saveState === 'saving' ? 'Lagrer…' : saveState === 'saved' ? 'Alle endringer lagret' : ' '}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreviewOpen(true)} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white border border-[#ddd] text-[13px] font-medium text-[#555] hover:bg-[#fafafa]">
            <Eye className="w-3.5 h-3.5" /> Forhåndsvis
          </button>
          <button onClick={() => setConfirming(true)} disabled={sendState === 'sending'} data-testid="nl-send"
            className="inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-[#0a0a0a] text-white text-[13px] font-semibold hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)] active:scale-[0.98] transition-all disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>
      {sendErr ? (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-center gap-2.5">
          <XCircle className="w-4 h-4 text-rose-500 shrink-0" /><p className="text-[13px] text-rose-700">{sendErr}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[170px_1fr_300px] gap-4 items-start">
        {/* -------- Palett -------- */}
        <div className="rounded-2xl bg-white border border-[#eee] p-3 lg:sticky lg:top-4">
          {[
            ['Innhold', [['heading', 'Overskrift', Type], ['text', 'Tekst', AlignLeft], ['bullets', 'Punktliste', List], ['image', 'Bilde', ImageIcon], ['button', 'Knapp', MousePointerClick]]],
            ['Layout', [['quote', 'Sitat', QuoteIcon], ['divider', 'Skillelinje', Minus], ['spacer', 'Luft', MoveVertical]]],
            ['Spesial', [['cta-card', 'Interesse-kort', Sparkles], ['signature', 'Signatur', PenLine]]],
          ].map(([group, items]) => (
            <div key={group} className="mb-3 last:mb-0">
              <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-[#bbb] px-2 mb-1.5">{group}</p>
              <div className="space-y-1">
                {items.map(([type, label, Icon]) => (
                  <button key={type} onClick={() => addBlock(type)} data-testid={`nl-add-${type}`}
                    className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-[#faf7ff] transition-colors group">
                    <span className="h-7 w-7 shrink-0 rounded-lg bg-[#f5f3f0] group-hover:bg-[#f3ebff] grid place-items-center transition-colors"><Icon className="w-3.5 h-3.5 text-[#888] group-hover:text-[#9B5BD6]" /></span>
                    <span className="text-[12.5px] font-medium text-[#555] group-hover:text-[#0a0a0a]">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* -------- Canvas -------- */}
        <div className="rounded-2xl bg-[#f5f3f0] border border-[#eee] p-4 sm:p-7 min-h-[560px]">
          <div className="max-w-[600px] mx-auto">
            <p className="text-[16px] font-extrabold text-[#0a0a0a] tracking-[-0.02em] mb-3 px-1">DigiHome<span style={{ color: accent === '#0a0a0a' ? '#d298ff' : accent }}>.</span></p>
            <div className="rounded-[18px] bg-white overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
              <div style={{ height: 5, background: accent }} />
              <div className="py-5">
                {camp.blocks.length === 0 ? (
                  <div className="py-14 text-center px-8">
                    <Sparkles className="w-6 h-6 text-[#ddd] mx-auto mb-2" />
                    <p className="text-[13.5px] text-[#aaa]">Tomt nyhetsbrev — legg til blokker fra paletten til venstre.</p>
                  </div>
                ) : camp.blocks.map((b, i) => (
                  <CanvasBlock key={b.id} b={b} i={i} total={camp.blocks.length} accent={accent}
                    selected={selectedBlock === b.id} onSelect={() => setSelectedBlock(b.id)}
                    onPatch={(p) => patchBlock(b.id, p)} onMove={(d) => moveBlock(b.id, d)}
                    onDup={() => duplicateBlock(b.id)} onDel={() => removeBlock(b.id)} />
                ))}
              </div>
            </div>
            <p className="text-center text-[10.5px] text-[#bbb] mt-3 leading-relaxed">DigiHome AS · Bergen · Meld deg av her<br />Avmeldingslenken settes inn automatisk for hver mottaker</p>
          </div>
        </div>

        {/* -------- Innstillingspanel -------- */}
        <div className="rounded-2xl bg-white border border-[#eee] lg:sticky lg:top-4 overflow-hidden">
          <div className="flex border-b border-[#eee]">
            {[['oppsett', 'Oppsett', Settings2], ['tema', 'Tema', Palette], ['malgruppe', 'Målgruppe', Users]].map(([k, l, Icon]) => (
              <button key={k} onClick={() => setPanelTab(k)} data-testid={`nl-panel-${k}`}
                className={`flex-1 h-11 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-semibold transition-colors ${panelTab === k ? 'text-[#0a0a0a] border-b-2 border-[#9B5BD6] -mb-px' : 'text-[#999] hover:text-[#555]'}`}>
                <Icon className="w-3.5 h-3.5" /> {l}
              </button>
            ))}
          </div>
          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            {panelTab === 'oppsett' ? (
              <>
                <div>
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#999] block mb-1.5">Emne</label>
                  <input value={camp.subject || ''} onChange={(e) => patch({ subject: e.target.value })} placeholder={'Hei {{first_name}}, …'} className={inputCls} data-testid="nl-subject" />
                </div>
                <div>
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#999] block mb-1.5">Forhåndstekst</label>
                  <input value={camp.preheader || ''} onChange={(e) => patch({ preheader: e.target.value })} placeholder="Vises som forhåndsvisning i innboksen" className={inputCls} />
                </div>
                <div>
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#999] block mb-1.5">Avsendernavn</label>
                  <input value={camp.fromName || ''} onChange={(e) => patch({ fromName: e.target.value })} placeholder="DigiHome" className={inputCls} />
                </div>
                <div className="rounded-xl bg-[#faf7ff] border border-[#eee] px-3.5 py-3">
                  <p className="text-[11.5px] text-[#8b6aad] leading-relaxed"><b>Flettefelt:</b> Skriv <code className="bg-white rounded px-1">{'{{first_name}}'}</code> hvor som helst — byttes automatisk med mottakerens fornavn.</p>
                </div>
                <div className="pt-1 border-t border-[#eee]">
                  <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#999] block mb-1.5 pt-3">Send test</label>
                  <div className="flex gap-2">
                    <input value={testTo} onChange={(e) => { setTestTo(e.target.value); setTestState({ s: 'idle', msg: '' }); }} placeholder="din@epost.no" className={inputCls} data-testid="nl-test-email" />
                    <button onClick={sendTest} disabled={testState.s === 'sending' || !testTo.trim()} data-testid="nl-test-send"
                      className="shrink-0 h-10 px-3.5 rounded-xl bg-[#f5f3f0] hover:bg-[#edeae6] text-[12.5px] font-semibold text-[#0a0a0a] disabled:opacity-50 inline-flex items-center gap-1.5">
                      {testState.s === 'sending' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {testState.msg ? <p className={`text-[11.5px] mt-1.5 ${testState.s === 'ok' ? 'text-[#18794E]' : 'text-rose-500'}`}>{testState.msg}</p> : null}
                </div>
              </>
            ) : null}

            {panelTab === 'tema' ? (
              <div>
                <label className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#999] block mb-2.5">Aksentfarge</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {THEME_SWATCHES.map((t) => (
                    <button key={t.key} onClick={() => patch({ theme: t.key })}
                      className={`rounded-xl border px-3 py-3 text-left transition-all ${camp.theme === t.key ? 'border-[#9B5BD6]/60 bg-[#faf7ff]' : 'border-[#eee] hover:bg-[#fafafa]'}`}>
                      <span className="block h-6 w-full rounded-lg mb-2" style={{ background: t.accent }} />
                      <span className="text-[12.5px] font-medium text-[#555]">{t.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11.5px] text-[#999] mt-3 leading-relaxed">Aksenten brukes på topplinjen, punktlister, sitater og interesse-kortet.</p>
              </div>
            ) : null}

            {panelTab === 'malgruppe' ? (
              <>
                <div className="space-y-2">
                  {(audiences?.segments || []).map((s) => {
                    const on = (camp.segments || []).includes(s.key);
                    return (
                      <button key={s.key} data-testid={`nl-seg-${s.key}`}
                        onClick={() => patch({ segments: on ? camp.segments.filter((k) => k !== s.key) : [...(camp.segments || []), s.key] })}
                        className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left transition-all ${on ? 'border-[#9B5BD6]/50 bg-[#faf7ff]' : 'border-[#eee] hover:bg-[#fafafa]'}`}>
                        <span className="flex items-center gap-2.5 min-w-0">
                          <span className={`h-4.5 w-4.5 shrink-0 rounded grid place-items-center border ${on ? 'bg-[#9B5BD6] border-[#9B5BD6]' : 'border-[#ccc]'}`} style={{ width: 18, height: 18 }}>
                            {on ? <CheckCircle2 className="w-3 h-3 text-white" /> : null}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[12.5px] font-semibold text-[#0a0a0a] truncate">{s.label.replace(' (vunnede utleiere)', '')} · {s.count}</span>
                            <span className={`text-[10px] font-medium ${s.consent === 'safe' ? 'text-[#18794E]' : 'text-amber-600'}`}>{s.consent === 'safe' ? 'Kundeforhold — trygt' : 'Grå sone'}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Mottakerliste med ekskludering */}
                <div className="pt-3 border-t border-[#eee]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-[#999]">Mottakere</p>
                    {recips ? <span className="text-[11.5px] font-semibold text-[#0a0a0a]">{netCount} av {recips.total}</span> : null}
                  </div>
                  {(camp.segments || []).length === 0 ? (
                    <p className="text-[12px] text-[#999]">Velg minst én målgruppe over for å se mottakerne.</p>
                  ) : !recips ? (
                    <div className="h-16 grid place-items-center"><Loader2 className="w-4 h-4 animate-spin text-[#9B5BD6]" /></div>
                  ) : (
                    <>
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-[#aaa] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input value={recipSearch} onChange={(e) => setRecipSearch(e.target.value)} placeholder="Søk e-post eller navn…"
                          className="w-full h-9 pl-8.5 pr-3 rounded-xl border border-[#e5e5e5] bg-white text-[12.5px] outline-none focus:border-[#cf97fc]/60" style={{ paddingLeft: 34 }} data-testid="nl-recip-search" />
                      </div>
                      <div className="max-h-[260px] overflow-y-auto space-y-1 pr-0.5" data-testid="nl-recip-list">
                        {recips.recipients
                          .filter((r) => !recipSearch || r.email.includes(recipSearch.toLowerCase()) || (r.name || '').toLowerCase().includes(recipSearch.toLowerCase()))
                          .map((r) => {
                            const off = excluded.has(r.email);
                            return (
                              <div key={r.email} className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 ${off ? 'bg-[#fafafa] opacity-55' : 'hover:bg-[#fafafa]'}`}>
                                <div className="min-w-0">
                                  <p className={`text-[12px] font-medium truncate ${off ? 'line-through text-[#999]' : 'text-[#0a0a0a]'}`}>{r.email}</p>
                                  <p className="text-[10.5px] text-[#999] truncate">{r.name || '—'} · {SEG_LABEL[r.segment] || r.segment}</p>
                                </div>
                                <button onClick={() => toggleExclude(r.email)} title={off ? 'Ta med igjen' : 'Ikke send til denne'}
                                  className={`shrink-0 h-7 w-7 rounded-lg grid place-items-center transition-colors ${off ? 'text-[#18794E] hover:bg-[#E8F4EE]' : 'text-[#bbb] hover:bg-rose-50 hover:text-rose-500'}`}>
                                  {off ? <RotateCcw className="w-3.5 h-3.5" /> : <UserMinus className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                      <p className="text-[10.5px] text-[#aaa] mt-2">Avmeldte og duplikater fjernes alltid automatisk i tillegg.</p>
                    </>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Forhåndsvisning-modal */}
      {previewOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={() => setPreviewOpen(false)} />
          <div className="relative w-full max-w-[860px] h-[86vh] rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#eee]">
              <p className="text-[14px] font-bold text-[#0a0a0a]">Forhåndsvisning</p>
              <div className="flex items-center gap-2">
                <div className="inline-flex rounded-full bg-[#f5f3f0] p-1">
                  <button onClick={() => setPreviewMode('desktop')} className={`h-8 w-9 rounded-full grid place-items-center ${previewMode === 'desktop' ? 'bg-white shadow-sm text-[#0a0a0a]' : 'text-[#999]'}`}><Monitor className="w-4 h-4" /></button>
                  <button onClick={() => setPreviewMode('mobile')} className={`h-8 w-9 rounded-full grid place-items-center ${previewMode === 'mobile' ? 'bg-white shadow-sm text-[#0a0a0a]' : 'text-[#999]'}`}><Smartphone className="w-4 h-4" /></button>
                </div>
                <button onClick={() => setPreviewOpen(false)} className="h-8 w-8 rounded-full bg-[#f5f3f0] grid place-items-center text-[#555] hover:bg-[#eee]"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 bg-[#eae7e2] grid place-items-center overflow-auto p-4">
              {previewHtml ? (
                <iframe title="Forhåndsvisning" srcDoc={previewHtml} className="bg-white rounded-xl shadow-lg h-full transition-all" style={{ width: previewMode === 'mobile' ? 375 : '100%', maxWidth: 760 }} />
              ) : <Loader2 className="w-6 h-6 animate-spin text-[#9B5BD6]" />}
            </div>
          </div>
        </div>
      ) : null}

      {/* Send-bekreftelse */}
      {confirming ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-5">
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={() => sendState !== 'sending' && setConfirming(false)} />
          <div className="relative w-full max-w-[420px] rounded-3xl bg-white shadow-2xl p-7 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3ebff]"><Send className="w-5 h-5 text-[#9B5BD6]" /></span>
            <h3 className="font-heading font-bold text-[20px] text-[#0a0a0a] mt-4">Send «{camp.title || 'kampanjen'}»?</h3>
            <p className="text-[13.5px] text-[#888] mt-2 leading-relaxed">
              Sendes til <b className="text-[#0a0a0a]">~{Math.max(approxCount, 0)} mottakere</b>
              {(camp.excludedEmails || []).length ? ` (${camp.excludedEmails.length} manuelt ekskludert)` : ''}. Kan ikke angres.
            </p>
            {!camp.subject?.trim() ? <p className="mt-2 text-[12.5px] text-amber-600 inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Emnefeltet er tomt — fyll inn under Oppsett.</p> : null}
            <div className="mt-5 flex gap-2.5">
              <button onClick={doSend} disabled={sendState === 'sending'} data-testid="nl-send-confirm"
                className="flex-1 h-11 rounded-full bg-[#0a0a0a] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {sendState === 'sending' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Ja, send nå
              </button>
              <button onClick={() => setConfirming(false)} disabled={sendState === 'sending'} className="h-11 px-5 rounded-full bg-white border border-[#ddd] text-[13.5px] font-medium text-[#555]">Avbryt</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------- Canvas-blokk (WYSIWYG) ------------------------- */
function CanvasBlock({ b, i, total, accent, selected, onSelect, onPatch, onMove, onDup, onDel }) {
  const soft = accent === '#0a0a0a' ? '#f0f0f0' : `${accent}22`;
  return (
    <div onClick={onSelect}
      className={`relative group px-10 py-1.5 transition-shadow ${selected ? 'ring-2 ring-[#9B5BD6]/40 ring-inset rounded-lg' : 'hover:ring-1 hover:ring-[#e5d5f5] hover:ring-inset rounded-lg'}`}>
      {/* Kontroller */}
      <div className={`absolute right-2 top-1 z-10 flex items-center gap-0.5 rounded-lg bg-white border border-[#eee] shadow-sm px-0.5 py-0.5 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} disabled={i === 0} className="h-6 w-6 rounded grid place-items-center text-[#999] hover:bg-[#f5f3f0] disabled:opacity-25"><ChevronUp className="w-3 h-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onMove(1); }} disabled={i === total - 1} className="h-6 w-6 rounded grid place-items-center text-[#999] hover:bg-[#f5f3f0] disabled:opacity-25"><ChevronDown className="w-3 h-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDup(); }} className="h-6 w-6 rounded grid place-items-center text-[#999] hover:bg-[#f5f3f0]"><Copy className="w-3 h-3" /></button>
        <button onClick={(e) => { e.stopPropagation(); onDel(); }} className="h-6 w-6 rounded grid place-items-center text-[#999] hover:bg-rose-50 hover:text-rose-500"><Trash2 className="w-3 h-3" /></button>
      </div>

      {b.type === 'heading' ? (
        <AutoArea value={b.text || ''} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Overskrift…"
          className="font-bold text-[22px] leading-[1.3] text-[#0a0a0a] tracking-[-0.02em] placeholder:text-[#ccc]" />
      ) : null}

      {b.type === 'text' ? (
        <AutoArea value={b.text || ''} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Skriv tekst her… (tom linje = nytt avsnitt)"
          className="text-[15px] leading-[1.75] text-[#555] placeholder:text-[#ccc]" />
      ) : null}

      {b.type === 'bullets' ? (
        <div className="space-y-1.5 py-1">
          {(b.items || []).map((it, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <span className="mt-[9px] h-[7px] w-[7px] shrink-0 rounded-full" style={{ background: accent }} />
              <AutoArea value={it} onChange={(e) => { const items = [...b.items]; items[idx] = e.target.value; onPatch({ items }); }} placeholder="Punkt…"
                className="text-[15px] leading-[1.6] text-[#444] placeholder:text-[#ccc]" />
              <button onClick={(e) => { e.stopPropagation(); onPatch({ items: b.items.filter((_, x) => x !== idx) }); }} className="mt-1 shrink-0 text-[#ccc] hover:text-rose-400"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={(e) => { e.stopPropagation(); onPatch({ items: [...(b.items || []), ''] }); }} className="text-[12px] text-[#9B5BD6] font-medium hover:underline ml-5">+ Legg til punkt</button>
        </div>
      ) : null}

      {b.type === 'button' ? (
        <div className="py-2 text-center">
          <span className="inline-flex items-center rounded-full bg-[#0a0a0a] px-2 py-1">
            <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} placeholder="Knappetekst"
              className="bg-transparent outline-none text-white text-[14px] font-semibold text-center placeholder:text-white/40" style={{ width: `${Math.max((b.label || 'Knappetekst').length, 8) + 2}ch`, padding: '8px 12px' }} />
          </span>
          {selected ? <input value={b.url || ''} onChange={(e) => onPatch({ url: e.target.value })} placeholder="https://…" className="mt-2 mx-auto block w-4/5 h-8 px-3 rounded-lg border border-[#e5e5e5] text-[12px] text-[#555] outline-none focus:border-[#cf97fc]/60" onClick={(e) => e.stopPropagation()} /> : null}
        </div>
      ) : null}

      {b.type === 'image' ? (
        <div className="py-1.5">
          {b.url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={b.url} alt={b.alt || ''} className="w-full rounded-xl" />
          ) : (
            <div className="h-28 rounded-xl bg-[#fafafa] border border-dashed border-[#ddd] grid place-items-center"><span className="text-[12px] text-[#aaa] inline-flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Lim inn bilde-URL under</span></div>
          )}
          {selected ? (
            <div className="grid grid-cols-2 gap-2 mt-2" onClick={(e) => e.stopPropagation()}>
              <input value={b.url || ''} onChange={(e) => onPatch({ url: e.target.value })} placeholder="https://… (bilde-URL)" className="h-8 px-3 rounded-lg border border-[#e5e5e5] text-[12px] outline-none focus:border-[#cf97fc]/60" />
              <input value={b.alt || ''} onChange={(e) => onPatch({ alt: e.target.value })} placeholder="Alt-tekst" className="h-8 px-3 rounded-lg border border-[#e5e5e5] text-[12px] outline-none focus:border-[#cf97fc]/60" />
            </div>
          ) : null}
        </div>
      ) : null}

      {b.type === 'quote' ? (
        <div className="rounded-xl overflow-hidden flex my-1" style={{ background: soft }}>
          <span className="w-1 shrink-0" style={{ background: accent }} />
          <div className="p-4 flex-1">
            <AutoArea value={b.text || ''} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Sitat…"
              className="text-[15px] leading-[1.7] text-[#333] italic placeholder:text-[#bbb]" />
            <input value={b.author || ''} onChange={(e) => onPatch({ author: e.target.value })} placeholder="— Hvem sa det?"
              className="w-full bg-transparent outline-none text-[12.5px] text-[#888] mt-1 placeholder:text-[#bbb]" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      ) : null}

      {b.type === 'divider' ? <div className="py-3"><div className="h-px bg-[#eee]" /></div> : null}

      {b.type === 'spacer' ? (
        <div className="grid place-items-center rounded-lg bg-[#fafafa]/60 border border-dashed border-[#eee]" style={{ height: b.size === 'l' ? 40 : b.size === 's' ? 12 : 24 }}>
          {selected ? (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              {['s', 'm', 'l'].map((s) => (
                <button key={s} onClick={() => onPatch({ size: s })} className={`h-5 px-2 rounded text-[10px] font-bold uppercase ${b.size === s ? 'bg-[#9B5BD6] text-white' : 'bg-white border border-[#ddd] text-[#999]'}`}>{s}</button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {b.type === 'cta-card' ? (
        <div className="rounded-2xl text-center px-6 py-6 my-1" style={{ background: soft }}>
          <input value={b.title || ''} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Tittel på kortet"
            className="w-full bg-transparent outline-none text-center text-[18px] font-bold text-[#0a0a0a] placeholder:text-[#bbb]" onClick={(e) => e.stopPropagation()} />
          <AutoArea value={b.text || ''} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Kort forklaring…"
            className="text-center text-[14px] leading-[1.65] text-[#555] mt-1 placeholder:text-[#bbb]" />
          <span className="inline-flex items-center rounded-full px-2 py-1 mt-3" style={{ background: accent }}>
            <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} placeholder="Knappetekst"
              className="bg-transparent outline-none text-[#1f1f1f] text-[14px] font-bold text-center placeholder:text-[#1f1f1f]/40" style={{ width: `${Math.max((b.label || 'Knappetekst').length, 8) + 2}ch`, padding: '7px 10px' }} onClick={(e) => e.stopPropagation()} />
          </span>
          {selected ? (
            <div className="grid gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
              <input value={b.url || ''} onChange={(e) => onPatch({ url: e.target.value })} placeholder="https://… (lenke)" className="h-8 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[12px] outline-none focus:border-[#cf97fc]/60" />
              <input value={b.footnote || ''} onChange={(e) => onPatch({ footnote: e.target.value })} placeholder="Liten tekst under knappen (valgfritt)" className="h-8 px-3 rounded-lg border border-[#e5e5e5] bg-white text-[12px] outline-none focus:border-[#cf97fc]/60" />
            </div>
          ) : b.footnote ? <p className="text-[12px] text-[#999] mt-2.5">{b.footnote}</p> : null}
        </div>
      ) : null}

      {b.type === 'signature' ? (
        <div className="flex items-center gap-3 py-2">
          <span className="h-[42px] w-[42px] shrink-0 rounded-full grid place-items-center text-[14px] font-bold text-[#8b6aad]" style={{ background: soft }}>
            {(b.name || 'D').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
          </span>
          <div className="flex-1">
            <input value={b.name || ''} onChange={(e) => onPatch({ name: e.target.value })} placeholder="Navn" className="w-full bg-transparent outline-none text-[14.5px] font-bold text-[#0a0a0a] placeholder:text-[#ccc]" onClick={(e) => e.stopPropagation()} />
            <input value={b.title || ''} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Tittel / rolle" className="w-full bg-transparent outline-none text-[12.5px] text-[#999] placeholder:text-[#ccc]" onClick={(e) => e.stopPropagation()} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* --------------------- Forhåndsvisning i statsvisning --------------------- */
function StatsPreview({ camp, q }) {
  const [html, setHtml] = useState('');
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/newsletter/preview?${q}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: camp.subject, preheader: camp.preheader, theme: camp.theme, blocks: camp.blocks || [] }),
        });
        const j = await r.json();
        if (j.ok) setHtml(j.html);
      } catch (e) {}
    })();
  }, [camp, q]);
  if (!html) return <div className="h-[420px] grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-[#9B5BD6]" /></div>;
  return <iframe title="Sendt innhold" srcDoc={html} className="w-full h-[420px] bg-[#f5f3f0]" />;
}
