'use client';

// ---------------------------------------------------------------------------
// Annonsestudio v3 — lag Meta-annonser (Facebook/Instagram) direkte fra admin.
// Veiviser: Plassering → Brief & media → Tekst → Forhåndsvisning → Publiser.
//
// 2026-grensesnitt:
//  · Progress-stepper med fremdriftslinje + steg-animasjoner (dh-fade-up)
//  · Kontekstlinje som følger deg (valgt kampanje/annonsesett, bytt når som helst)
//  · Facebook/Instagram-veksler i den levende mockupen
//  · Annonsekvalitet-score med animert ring og «slik fikser du»-hint
//  · Fullt mobiltilpasset (mockup + kvalitet under veiviseren på små skjermer)
//  · AI: bildeprompt fra brief, AI-syn (vision), tekstpakke, A/B-varianter
//  · Utkast overlever refresh. Alt opprettes ALLTID pauset.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2, Upload, Sparkles, Wand2, Check, ChevronRight, ChevronLeft,
  Image as ImageIcon, Megaphone, Play, Pause, RefreshCw, ExternalLink,
  AlertCircle, CheckCircle2, Globe, ThumbsUp, MessageCircle, Share2,
  MousePointerClick, Coins, Eye, LayoutList, PlusCircle, ShieldCheck, Info,
  ScanEye, FlaskConical, Gauge, RotateCcw, Trash2, MapPin, Bookmark, Heart,
  Send, MoreHorizontal, Pencil, Smartphone, Crop, ListChecks,
} from 'lucide-react';

const nf = new Intl.NumberFormat('nb-NO');
const CTAS = [
  { v: 'LEARN_MORE', l: 'Finn ut mer' },
  { v: 'GET_QUOTE', l: 'Få pristilbud' },
  { v: 'SIGN_UP', l: 'Registrer deg' },
  { v: 'CONTACT_US', l: 'Kontakt oss' },
  { v: 'APPLY_NOW', l: 'Søk nå' },
];
const ctaLabel = (v) => (CTAS.find((c) => c.v === v) || CTAS[0]).l;
const LINKS = [
  { v: 'https://digihome.no/bli-utleier', l: '/bli-utleier — hovedflyt (leievurdering)' },
  { v: 'https://digihome.no/lp/inntekt', l: '/lp/inntekt — inntektsvinkel' },
  { v: 'https://digihome.no/lp/forvaltning', l: '/lp/forvaltning — forvaltningsvinkel' },
  { v: 'https://digihome.no/lp/10pluss2', l: '/lp/10pluss2 — 10+2-modellen' },
  { v: 'https://digihome.no/lp/leietaker', l: '/lp/leietaker — leietakere' },
];
const STEPS = [
  { l: 'Plassering', d: 'Kampanje & annonsesett' },
  { l: 'Brief & media', d: 'Én brief driver alt' },
  { l: 'Tekst', d: 'AI-tekstverksted' },
  { l: 'Forhåndsvisning', d: 'Ekte Meta-visning' },
  { l: 'Publiser', d: 'Trygt og pauset' },
];
const DRAFT_KEY = 'dh_adstudio_draft_v1';

const card = 'rounded-2xl border border-[#ececec] bg-white shadow-[0_1px_3px_rgba(16,10,40,0.05)]';
const label = 'block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999] mt-4 mb-1.5';
const input = 'w-full rounded-xl border border-[#e8e8e8] bg-white px-3.5 py-2.5 text-[13px] outline-none transition-shadow focus:border-[#c99df0] focus:ring-4 focus:ring-[#f0e4fb]/60';
const btnPrimary = 'inline-flex items-center justify-center gap-2 h-10 px-5 rounded-xl bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0a] text-white text-[13px] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.18)] hover:shadow-[0_4px_14px_rgba(0,0,0,0.24)] hover:-translate-y-px active:translate-y-0 disabled:opacity-40 disabled:shadow-none disabled:translate-y-0 transition-all focus-visible:ring-4 focus-visible:ring-[#0a0a0a]/20 outline-none';
const btnGhost = 'inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl border border-[#e5e5e5] bg-white text-[13px] font-semibold text-[#555] hover:border-[#bbb] hover:text-[#222] transition-colors focus-visible:ring-4 focus-visible:ring-[#0a0a0a]/10 outline-none';

const counterCls = (len, max) => len === 0 ? 'text-[#bbb]' : len <= max ? 'text-emerald-600' : len <= max * 1.25 ? 'text-amber-600' : 'text-rose-500';

export default function AdStudioTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey || '')}`;
  const [view, setView] = useState('ny');
  const [ctx, setCtx] = useState(null);
  const [ctxErr, setCtxErr] = useState('');
  const [step, setStep] = useState(0);

  const [adset, setAdset] = useState(null);
  const [brief, setBrief] = useState('');
  const [media, setMedia] = useState(null);
  const [mediaBusy, setMediaBusy] = useState('');
  const [formats, setFormats] = useState(null); // { story:{hash,url,method}, landscape:{...} }
  const [formatsBusy, setFormatsBusy] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('foto');
  const [promptBusy, setPromptBusy] = useState(false);
  const [imageNote, setImageNote] = useState('');
  const [noteBusy, setNoteBusy] = useState(false);

  const [copyBusy, setCopyBusy] = useState(false);
  const [pkg, setPkg] = useState(null);
  const [message, setMessage] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('LEARN_MORE');
  const [link, setLink] = useState(LINKS[0].v);
  const [abTexts, setAbTexts] = useState([]);

  const [previews, setPreviews] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewTab, setPreviewTab] = useState(0);
  const [adName, setAdName] = useState('');
  const [valState, setValState] = useState('');
  const [pubBusy, setPubBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const [err, setErr] = useState('');
  const [draftFound, setDraftFound] = useState(null);
  const [platform, setPlatform] = useState('facebook'); // mockup-veksler

  const [myAds, setMyAds] = useState(null);
  const [adsBusy, setAdsBusy] = useState(false);
  const [briefIdeas, setBriefIdeas] = useState(null); // AI-genererte brief-forslag
  const [briefBusy, setBriefBusy] = useState(false);
  const [lpDraft, setLpDraft] = useState(null);   // AI-generert kampanjeside (utkast)
  const [lpBusy, setLpBusy] = useState('');       // '' | 'gen' | 'save'
  const [lpCreated, setLpCreated] = useState(null); // { slug, url, path }
  const [customLinks, setCustomLinks] = useState([]); // egne kampanjesider i destinasjonsvelgeren
  const fileRef = useRef(null);

  /* ------------------------------ Data inn -------------------------------- */
  const loadCtx = useCallback(async (refresh = false) => {
    try {
      const r = await fetch(`/api/admin/adstudio/context?${q}${refresh ? '&refresh=1' : ''}`);
      const j = await r.json();
      if (j.ok) { setCtx(j); setCtxErr(''); } else setCtxErr(j.error || 'Kunne ikke hente Meta-kontekst');
    } catch (e) { setCtxErr('Kunne ikke hente Meta-kontekst'); }
  }, [q]);

  const loadMyAds = useCallback(async () => {
    setAdsBusy(true);
    try {
      const r = await fetch(`/api/admin/adstudio/ads?${q}`);
      const j = await r.json();
      if (j.ok) setMyAds(j.ads || []);
    } catch (e) {}
    setAdsBusy(false);
  }, [q]);

  useEffect(() => { loadCtx(); loadMyAds(); }, [loadCtx, loadMyAds]);

  /* -------------- Ny kampanje opprettet → hent fersk kontekst ------------- */
  const handleCampaignCreated = useCallback(async (adsetId) => {
    try {
      const r = await fetch(`/api/admin/adstudio/context?${q}&refresh=1`);
      const j = await r.json();
      if (j.ok) {
        setCtx(j);
        for (const c of j.campaigns || []) {
          const s = (c.adsets || []).find((x) => x.id === adsetId);
          if (s) { setAdset({ ...s, campaignName: c.name, campaignId: c.id }); break; }
        }
      }
    } catch (e) {}
  }, [q]);

  /* ------------------- AI-brief: sesongbaserte forslag -------------------- */
  const suggestBriefs = async () => {
    setBriefBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/aibrief?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landing: link, goal: brief.trim() || undefined }),
      });
      const j = await r.json();
      if (j.ok && j.briefs?.length) setBriefIdeas(j.briefs); else setErr(j.error || 'AI-briefen feilet');
    } catch (e) { setErr('AI-briefen feilet'); }
    setBriefBusy(false);
  };

  /* ---------- Kampanjeside (message match): generer + publiser ------------ */
  const generateLp = async () => {
    setLpBusy('gen'); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/lp/generate?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, message, headline, description, cta }),
      });
      const j = await r.json();
      if (j.ok) setLpDraft(j.lp); else setErr(j.error || 'Kunne ikke generere siden');
    } catch (e) { setErr('Kunne ikke generere siden'); }
    setLpBusy('');
  };

  const publishLp = async () => {
    if (!lpDraft) return;
    setLpBusy('save'); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/lp?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lp: lpDraft, imageUrl: media?.url || undefined, adName: adName || autoName() }),
      });
      const j = await r.json();
      if (j.ok) {
        const opt = { v: j.url, l: `/lp/${j.slug} — din kampanjeside (message match)` };
        setCustomLinks((p) => [opt, ...p.filter((x) => x.v !== j.url)]);
        setLink(j.url); setLpCreated(j); setLpDraft(null);
      } else setErr(j.error || 'Publisering feilet');
    } catch (e) { setErr('Publisering feilet'); }
    setLpBusy('');
  };

  /* ----------------------- Utkast: lagre + gjenopprett -------------------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && (d.brief || d.media || d.message)) setDraftFound(d);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (created) { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} return; }
    const hasContent = brief || media || message || headline;
    if (!hasContent) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          savedAt: Date.now(), step, adsetId: adset?.id || null, brief, media, formats, aiPrompt, aiStyle,
          imageNote, message, headline, description, cta, link, adName, abTexts, pkg, lpCreated, customLinks,
        }));
      } catch (e) {}
    }, 600);
    return () => clearTimeout(t);
  }, [step, adset, brief, media, formats, aiPrompt, aiStyle, imageNote, message, headline, description, cta, link, adName, abTexts, pkg, lpCreated, customLinks, created]);

  const restoreDraft = () => {
    const d = draftFound; if (!d) return;
    setBrief(d.brief || ''); setMedia(d.media || null); setFormats(d.formats || null); setAiPrompt(d.aiPrompt || '');
    setAiStyle(d.aiStyle || 'foto'); setImageNote(d.imageNote || ''); setMessage(d.message || '');
    setHeadline(d.headline || ''); setDescription(d.description || ''); setCta(d.cta || 'LEARN_MORE');
    setLink(d.link || LINKS[0].v); setAdName(d.adName || ''); setAbTexts(d.abTexts || []); setPkg(d.pkg || null);
    setLpCreated(d.lpCreated || null); setCustomLinks(d.customLinks || []);
    if (d.adsetId && ctx) {
      for (const c of ctx.campaigns || []) {
        const s = (c.adsets || []).find((x) => x.id === d.adsetId);
        if (s) { setAdset({ ...s, campaignName: c.name, campaignId: c.id }); break; }
      }
    }
    setStep(Math.min(d.step || 0, 4));
    setDraftFound(null);
  };
  const discardDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch (e) {} setDraftFound(null); };

  /* ------------------------------ Media ----------------------------------- */
  const afterMedia = async (m) => {
    setMedia(m);
    setFormats(null); // nytt hovedbilde → gamle formatvarianter gjelder ikke lenger
    const assetId = m?.url?.match(/id=([a-f0-9-]+)/)?.[1];
    if (!assetId) return;
    setNoteBusy(true); setImageNote('');
    try {
      const r = await fetch(`/api/admin/adstudio/imagenote?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const j = await r.json();
      if (j.ok && j.note) setImageNote(j.note);
    } catch (e) {}
    setNoteBusy(false);
  };

  const uploadFile = async (file) => {
    if (!file) return;
    setMediaBusy('upload'); setErr('');
    try {
      const b64 = await new Promise((res, rej) => {
        const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file);
      });
      const r = await fetch(`/api/admin/adstudio/media?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageB64: b64, filename: file.name }),
      });
      const j = await r.json();
      if (j.ok) afterMedia(j); else setErr(j.error || 'Opplasting feilet');
    } catch (e) { setErr('Opplasting feilet'); }
    setMediaBusy('');
  };

  const suggestImagePrompt = async () => {
    if (!brief.trim()) return;
    setPromptBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/imageprompt?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), landing: link }),
      });
      const j = await r.json();
      if (j.ok && j.prompt) setAiPrompt(j.prompt); else setErr(j.error || 'Forslaget feilet');
    } catch (e) { setErr('Forslaget feilet'); }
    setPromptBusy(false);
  };

  const generateAiImage = async () => {
    if (!aiPrompt.trim()) return;
    setMediaBusy('ai'); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/media?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiPrompt: aiPrompt.trim(), style: aiStyle }),
      });
      const j = await r.json();
      if (j.ok) afterMedia(j); else setErr(j.error || 'AI-bildet feilet');
    } catch (e) { setErr('AI-bildet feilet'); }
    setMediaBusy('');
  };

  /* -------------- Plasseringsformater: 9:16 + 1.91:1 automatisk ----------- */
  const generateFormats = async () => {
    const assetId = media?.url?.match(/id=([a-f0-9-]+)/)?.[1];
    if (!assetId) return;
    setFormatsBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/formats?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assetId }),
      });
      const j = await r.json();
      if (j.ok) { setFormats({ story: j.story, landscape: j.landscape }); setPreviews(null); }
      else setErr(j.error || 'Formatgenereringen feilet');
    } catch (e) { setErr('Formatgenereringen feilet'); }
    setFormatsBusy(false);
  };

  /* ------------------------------ Tekst ------------------------------------ */
  const generateCopy = async () => {
    if (!brief.trim()) return;
    setCopyBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/copy?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), landing: link, imageNote: imageNote || undefined }),
      });
      const j = await r.json();
      if (j.ok && j.package) {
        setPkg(j.package);
        const p = j.package;
        if (p.primaryTexts?.[0]) setMessage(p.primaryTexts[0].text || '');
        if (p.headlines?.[0]) setHeadline(p.headlines[0]);
        if (p.descriptions?.[0]) setDescription(p.descriptions[0]);
        if (p.cta && CTAS.some((c) => c.v === p.cta)) setCta(p.cta);
        setAbTexts([]);
      } else setErr(j.error || 'AI-teksten feilet');
    } catch (e) { setErr('AI-teksten feilet'); }
    setCopyBusy(false);
  };

  const toggleAb = (t) => {
    setAbTexts((prev) => {
      const has = prev.some((x) => x.text === t.text);
      if (has) return prev.filter((x) => x.text !== t.text);
      if (prev.length >= 3) return prev;
      return [...prev, { angle: t.angle, text: t.text }];
    });
  };

  /* --------------------------- Forhåndsvisning ----------------------------- */
  const loadPreviews = async () => {
    if (!ctx?.page?.id || !media?.hash) return;
    setPreviewBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/preview?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: ctx.page.id, link, message, headline, description, imageHash: media.hash, cta,
          storyHash: formats?.story?.hash || undefined, landscapeHash: formats?.landscape?.hash || undefined,
        }),
      });
      const j = await r.json();
      if (j.ok) setPreviews(j.previews || []); else setErr(j.error || 'Forhåndsvisning feilet');
    } catch (e) { setErr('Forhåndsvisning feilet'); }
    setPreviewBusy(false);
  };
  useEffect(() => { if (step === 3 && !previews) loadPreviews(); /* eslint-disable-next-line */ }, [step]);

  /* ------------------------------ Publiser --------------------------------- */
  const isAb = abTexts.length >= 2;
  const autoName = () => {
    const d = new Date().toISOString().slice(0, 10);
    const angle = pkg?.primaryTexts?.find((t) => t.text === message)?.angle || 'studio';
    return `Studio | ${isAb ? 'A/B' : angle} | ${d}`;
  };

  const buildPayload = (validateOnly) => ({
    validateOnly, adsetId: adset.id, adName: adName || autoName(), pageId: ctx.page.id,
    link, message, headline, description, imageHash: media.hash, cta, imageUrl: media.url,
    storyHash: formats?.story?.hash || undefined, landscapeHash: formats?.landscape?.hash || undefined,
    ...(isAb ? { variants: abTexts.map((t) => ({ angle: t.angle, message: t.text })) } : {}),
  });

  const validate = async () => {
    setValState('busy');
    try {
      const r = await fetch(`/api/admin/adstudio/create?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(true)),
      });
      const j = await r.json();
      setValState(j.ok ? 'ok' : `feil:${j.error || 'Validering feilet'}`);
    } catch (e) { setValState('feil:Validering feilet'); }
  };

  const publish = async () => {
    setPubBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/create?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(false)),
      });
      const j = await r.json();
      if (j.ok) { setCreated(j); loadMyAds(); } else setErr(j.error || 'Publisering feilet');
    } catch (e) { setErr('Publisering feilet'); }
    setPubBusy(false);
  };

  const toggleAdState = async (metaAdId, current) => {
    const next = current === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const r = await fetch(`/api/admin/adstudio/adstate?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: metaAdId, status: next }),
      });
      const j = await r.json();
      if (j.ok) loadMyAds(); else setErr(j.error || 'Statusendring feilet');
    } catch (e) { setErr('Statusendring feilet'); }
  };

  const resetWizard = () => {
    setStep(0); setAdset(null); setBrief(''); setMedia(null); setFormats(null); setAiPrompt(''); setImageNote('');
    setPkg(null); setMessage(''); setHeadline(''); setDescription(''); setCta('LEARN_MORE');
    setAbTexts([]); setPreviews(null); setAdName(''); setValState(''); setCreated(null); setErr(''); setBriefIdeas(null);
    setLpDraft(null); setLpCreated(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
  };

  /* -------------------------- Kvalitetsscore ------------------------------- */
  const quality = useMemo(() => {
    const firstPara = (message || '').split(/\n/)[0] || '';
    const ratio = media?.width && media?.height ? media.width / media.height : null;
    const checks = [
      { ok: !!media && (media.width || 0) >= 1080, l: 'Bilde ≥ 1080 px bredt', fix: 'Last opp større bilde eller generer med AI' },
      { ok: ratio != null && ratio >= 0.8 && ratio <= 1.3, l: 'Nær kvadratisk (1:1) — best i Feed', fix: 'Kvadratiske bilder får mer plass i feeden' },
      { ok: !!(formats?.story && formats?.landscape), l: 'Alle plasseringer dekket (9:16 + 1.91:1)', fix: 'Generer formatvarianter i «Brief & media» — gir lavere CPM' },
      { ok: !!imageNote, l: 'AI har synkronisert bilde og tekst', fix: 'Skjer automatisk når bilde er valgt' },
      { ok: firstPara.length > 0 && firstPara.length <= 150, l: 'Frontlastet primærtekst (~125 tegn)', fix: 'Sett hovedbudskapet i første setning' },
      { ok: headline.length > 0 && headline.length <= 40, l: 'Overskrift ≤ 40 tegn', fix: 'Kortere overskrifter kuttes ikke' },
      { ok: !description || description.length <= 30, l: 'Beskrivelse ≤ 30 tegn', fix: 'Kort eller tom — begge er fint' },
    ];
    return { checks, score: checks.filter((c) => c.ok).length, total: checks.length };
  }, [media, formats, imageNote, message, headline, description]);

  const canNext = [!!adset, !!media, !!(message && headline), true, false][step];
  const appModeError = String(err || (valState.startsWith('feil:') ? valState.slice(5) : '')).includes('utviklingsmodus');
  const actId = String(ctx?.account?.id || '').replace('act_', '');

  /* ================================ RENDER ================================= */
  if (ctxErr) {
    return (
      <div className={`${card} p-8 text-center`} data-testid="adstudio-error">
        <AlertCircle className="mx-auto text-rose-500" size={28} />
        <p className="mt-3 text-[14px] font-bold text-[#111]">Får ikke kontakt med Meta</p>
        <p className="mt-1 text-[12.5px] text-[#888]">{ctxErr}</p>
        <button onClick={() => loadCtx(true)} className={`${btnGhost} mt-4`}><RefreshCw size={14} /> Prøv igjen</button>
      </div>
    );
  }
  if (!ctx) {
    return (
      <div className="space-y-3" data-testid="adstudio-skeleton">
        <div className="h-14 rounded-2xl bg-[#f3f3f3] animate-pulse" />
        <div className="grid xl:grid-cols-[1fr_360px] gap-5">
          <div className="h-[420px] rounded-2xl bg-[#f3f3f3] animate-pulse" />
          <div className="h-[420px] rounded-2xl bg-[#f3f3f3] animate-pulse hidden xl:block" />
        </div>
      </div>
    );
  }

  return (
    <div data-testid="adstudio-root">
      {/* Topplinje */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1c1c1e] via-[#0a0a0a] to-[#3b1a63] text-white shadow-[0_4px_14px_rgba(59,26,99,0.35)]"><Wand2 size={18} /></span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[18px] font-black tracking-tight text-[#111]">Annonsestudio</h2>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#a052e0] bg-[#f0e4fb] rounded-full px-2 py-0.5">Meta</span>
            </div>
            <p className="text-[12px] text-[#999] mt-0.5 flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {ctx.account?.name}</span>
              <span className="text-[#ddd]">·</span> Side: {ctx.page?.name || '—'}
              <span className="text-[#ddd]">·</span> <ShieldCheck size={11} className="text-emerald-600" /> Alt opprettes pauset
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button data-testid="adstudio-view-ny" onClick={() => setView('ny')} className={view === 'ny' ? btnPrimary : btnGhost}><PlusCircle size={14} /> Ny annonse</button>
          <button data-testid="adstudio-view-mine" onClick={() => { setView('mine'); loadMyAds(); }} className={view === 'mine' ? btnPrimary : btnGhost}><LayoutList size={14} /> Mine annonser {myAds ? `(${myAds.length})` : ''}</button>
        </div>
      </div>

      {/* Gjenopprett utkast */}
      {draftFound && view === 'ny' && !created ? (
        <div className="mb-4 rounded-2xl border border-[#e9dcf7] bg-[#faf5ff] p-4 flex flex-wrap items-center gap-3 dh-fade-up" data-testid="adstudio-draft-banner">
          <RotateCcw size={15} className="text-[#a052e0]" />
          <p className="text-[12.5px] text-[#333] flex-1">Du har et uferdig utkast fra {new Date(draftFound.savedAt).toLocaleString('nb-NO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — vil du fortsette der du slapp?</p>
          <button onClick={restoreDraft} className={`${btnPrimary} h-8 px-3 text-[12px]`} data-testid="adstudio-draft-restore">Gjenopprett</button>
          <button onClick={discardDraft} className={`${btnGhost} h-8 px-3 text-[12px]`}><Trash2 size={12} /> Forkast</button>
        </div>
      ) : null}

      {appModeError ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3" data-testid="adstudio-appmode-warn">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-amber-900 leading-relaxed">
            <b>Meta-appen står i utviklingsmodus.</b> Publisering krever Live-modus:
            gå til <a className="underline font-semibold" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a> → velg appen → bytt «App Mode» fra <i>Development</i> til <i>Live</i> (krever personvern-URL, f.eks. https://digihome.no/personvern). Forhåndsvisning og AI fungerer uansett.
          </div>
        </div>
      ) : null}

      {view === 'mine' ? (
        <MyAds ads={myAds} busy={adsBusy} onRefresh={loadMyAds} onToggle={toggleAdState} actId={actId} />
      ) : created ? (
        <motion.div className={`${card} p-10 text-center`} data-testid="adstudio-success"
          initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <motion.span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50"
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.15 }}>
            <CheckCircle2 size={32} className="text-emerald-500" />
          </motion.span>
          <h3 className="mt-4 text-[19px] font-black tracking-tight text-[#111]">{created.ads?.length > 1 ? `${created.ads.length} annonser opprettet som A/B-test` : 'Annonsen er opprettet'}</h3>
          <p className="mt-1.5 text-[13px] text-[#777] max-w-md mx-auto">Alt ligger trygt <b>pauset</b> i Meta. Den automatiske gjennomgangen tar minutter til få timer — aktiver når du er klar.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f7f7f7] px-3 py-1.5 text-[11.5px] font-semibold text-[#555]"><MapPin size={11} /> {adset?.campaignName} → {adset?.name}</span>
            {formats?.story ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11.5px] font-bold text-emerald-700"><Smartphone size={11} /> Tilpasset alle plasseringer</span> : null}
            {created.ads?.length > 1 ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f0e4fb] px-3 py-1.5 text-[11.5px] font-bold text-[#7A3EC8]"><FlaskConical size={11} /> {created.ads.length} varianter</span> : null}
          </div>
          <div className="mt-6 flex justify-center gap-2">
            <button onClick={() => { setView('mine'); loadMyAds(); }} className={btnPrimary}><LayoutList size={14} /> Mine annonser</button>
            <button onClick={resetWizard} className={btnGhost}><PlusCircle size={14} /> Lag en til</button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5 items-start">
          {/* Venstre: veiviseren */}
          <div>
            <Stepper step={step} onJump={(i) => i < step && setStep(i)} />

            {/* Kontekstlinje: valgt plassering følger deg */}
            {adset && step > 0 ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-[#f0f0f0] bg-[#fafafa] px-3.5 py-2" data-testid="adstudio-contextbar">
                <MapPin size={12} className="text-[#a052e0]" />
                <p className="text-[11.5px] text-[#555] flex-1 min-w-0 truncate"><b className="text-[#222]">{adset.campaignName}</b> → {adset.name}{adset.dailyBudget ? ` · ${nf.format(adset.dailyBudget)} kr/dag` : ''}</p>
                <button onClick={() => setStep(0)} className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a052e0] hover:text-[#7A3EC8]"><Pencil size={10} /> Bytt</button>
              </div>
            ) : null}

            <AnimatePresence mode="wait">
            <motion.div className={`${card} p-5`} key={`step-${step}`}
              initial={{ opacity: 0, x: 26, filter: 'blur(2px)' }} animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -26, filter: 'blur(2px)' }} transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
              {step === 0 ? (
                <StepPlacement ctx={ctx} adset={adset} setAdset={setAdset} onRefresh={() => loadCtx(true)} q={q} onCreated={handleCampaignCreated} />
              ) : step === 1 ? (
                <div data-testid="adstudio-step-media">
                  <h3 className="text-[14px] font-black text-[#111]">Brief & media</h3>
                  <p className="text-[12px] text-[#999] mt-0.5">Én brief driver alt: AI-en bruker den til både bildeforslag og tekstpakke.</p>

                  <div className="flex items-center justify-between mt-4 mb-1.5">
                    <label className={`${label} mt-0 mb-0`}>Brief — hva skal annonsen si, og til hvem?</label>
                    <button onClick={suggestBriefs} disabled={briefBusy} data-testid="adstudio-ai-brief"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#a052e0] hover:text-[#7A3EC8] disabled:opacity-50 transition-colors">
                      {briefBusy ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                      {briefBusy ? 'AI tenker sesong & vinkler …' : 'La AI foreslå brief'}
                    </button>
                  </div>
                  <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} autoFocus
                    placeholder="F.eks. «Nå boligeiere i Bergen som er lei av leietaker-mas. Fremhev gratis leievurdering på 60 sekunder.»"
                    className={`${input} resize-none`} data-testid="adstudio-brief" />

                  {briefIdeas?.length ? (
                    <div className="mt-2.5 rounded-xl border border-[#e9dcf7] bg-[#faf5ff] p-3 dh-fade-up" data-testid="adstudio-brief-ideas">
                      <div className="flex items-center justify-between">
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a052e0] flex items-center gap-1"><Sparkles size={10} /> AI-forslag — klikk for å bruke</p>
                        <button onClick={() => setBriefIdeas(null)} className="text-[#bba5d6] hover:text-[#7A3EC8]" aria-label="Lukk forslag"><Trash2 size={11} /></button>
                      </div>
                      <div className="mt-2 grid gap-1.5">
                        {briefIdeas.map((b, i) => (
                          <button key={i} onClick={() => { setBrief(b.text); setBriefIdeas(null); }}
                            data-testid={`adstudio-brief-idea-${i}`}
                            className={`text-left rounded-lg border px-3 py-2 transition-all hover:-translate-y-px ${brief === b.text ? 'border-[#a052e0] bg-white' : 'border-[#eee0fb] bg-white/70 hover:border-[#c99df0]'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#a052e0]">{b.label}</span>
                            <p className="text-[12px] text-[#333] mt-0.5 leading-snug">{b.text}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    <div className="rounded-2xl border-2 border-dashed border-[#e5e5e5] p-5 text-center hover:border-[#c99df0] hover:bg-[#fdfbff] transition-colors cursor-pointer group"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); uploadFile(e.dataTransfer.files?.[0]); }}
                      data-testid="adstudio-upload-zone" role="button" aria-label="Last opp bilde">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
                      {mediaBusy === 'upload' ? <Loader2 size={22} className="mx-auto animate-spin text-[#a052e0]" /> : <Upload size={22} className="mx-auto text-[#bbb] group-hover:text-[#a052e0] group-hover:-translate-y-0.5 transition-all" />}
                      <p className="mt-2 text-[12.5px] font-bold text-[#333]">Last opp bilde</p>
                      <p className="text-[11px] text-[#aaa]">Dra hit eller klikk · JPG/PNG · 1:1 anbefalt</p>
                    </div>
                    <div className="rounded-2xl border border-[#e9dcf7] bg-gradient-to-b from-[#faf5ff] to-white p-4" data-testid="adstudio-ai-panel">
                      <p className="text-[12px] font-bold text-[#111] flex items-center gap-1.5"><Sparkles size={12} className="text-[#a052e0]" /> Generer med AI <span className="ml-auto text-[9px] font-bold uppercase text-[#a052e0] bg-[#f0e4fb] rounded-full px-1.5 py-0.5">Nano Banana Pro</span></p>
                      <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2} placeholder="Beskriv bildet — eller la AI foreslå fra briefen" className={`${input} mt-2 resize-none text-[12px]`} />
                      <button onClick={suggestImagePrompt} disabled={promptBusy || !brief.trim()} className="flex items-center gap-1 text-[11px] font-bold text-[#a052e0] hover:text-[#7A3EC8] disabled:opacity-50 mt-1" data-testid="adstudio-suggest-prompt">
                        {promptBusy ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {promptBusy ? 'AI leser briefen …' : 'Foreslå bildeprompt fra briefen'}
                      </button>
                      <div className="flex gap-1.5 mt-2">
                        {[['foto', 'Foto'], ['illustrasjon', 'Illustrasjon'], ['minimal', 'Minimal']].map(([k, l]) => (
                          <button key={k} onClick={() => setAiStyle(k)} className={`flex-1 h-[26px] rounded-lg text-[11px] font-semibold transition-colors ${aiStyle === k ? 'bg-[#0a0a0a] text-white' : 'bg-white border border-[#e8e8e8] text-[#888] hover:border-[#c99df0]'}`}>{l}</button>
                        ))}
                      </div>
                      <button onClick={generateAiImage} disabled={mediaBusy !== '' || !aiPrompt.trim()} className={`${btnPrimary} w-full mt-2.5 h-9`} data-testid="adstudio-ai-generate">
                        {mediaBusy === 'ai' ? <><Loader2 size={13} className="animate-spin" /> Genererer … (30–60 s)</> : <><ImageIcon size={13} /> Generer bilde</>}
                      </button>
                    </div>
                  </div>

                  {media ? (
                    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dh-fade-up" data-testid="adstudio-media-ok">
                      <div className="flex items-center gap-3">
                        <img src={media.url} alt="Valgt annonsebilde" className="h-16 w-16 rounded-lg object-cover" />
                        <div className="text-[12px] flex-1">
                          <p className="font-bold text-emerald-800 flex items-center gap-1"><CheckCircle2 size={13} /> Lastet opp til Metas bildebibliotek</p>
                          <p className="text-emerald-700/70">{media.width}×{media.height} px{media.width && media.width < 1080 ? ' · ⚠ under 1080 px' : ''}</p>
                        </div>
                      </div>
                      <div className="mt-2 flex items-start gap-1.5 text-[11.5px] text-[#555]" data-testid="adstudio-imagenote">
                        <ScanEye size={13} className="text-[#a052e0] shrink-0 mt-0.5" />
                        {noteBusy ? <span className="text-[#999] inline-flex items-center gap-1"><Loader2 size={10} className="animate-spin" /> AI ser på bildet …</span> : imageNote ? <span><b className="text-[#a052e0]">AI ser:</b> {imageNote}</span> : <span className="text-[#bbb]">Ingen bildeanalyse</span>}
                      </div>
                    </div>
                  ) : null}

                  {media?.hash ? (
                    <div className="mt-3 rounded-2xl border border-[#e9dcf7] bg-gradient-to-b from-[#faf5ff] to-white p-4 dh-fade-up" data-testid="adstudio-formats">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12px] font-bold text-[#111] flex items-center gap-1.5"><Crop size={13} className="text-[#a052e0]" /> Formater for alle plasseringer</p>
                        <span className="text-[9px] font-bold uppercase text-[#a052e0] bg-[#f0e4fb] rounded-full px-1.5 py-0.5">Senker CPM</span>
                        {formats ? <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle2 size={12} /> Klart</span> : null}
                      </div>
                      <p className="text-[11px] text-[#999] mt-1">AI utvider bildet til 9:16 (Stories/Reels) og 1.91:1 (bred) — Meta viser riktig format per plassering automatisk.</p>
                      {formats ? (
                        <div className="mt-3 flex items-end gap-3" data-testid="adstudio-formats-done">
                          <figure className="text-center">
                            <img src={media.url} alt="1:1" className="h-20 w-20 rounded-lg object-cover border border-[#eee]" />
                            <figcaption className="text-[9.5px] font-bold text-[#999] mt-1">1:1 Feed</figcaption>
                          </figure>
                          <figure className="text-center">
                            <img src={formats.story?.url} alt="9:16" className="h-24 w-[54px] rounded-lg object-cover border border-[#eee]" />
                            <figcaption className="text-[9.5px] font-bold text-[#999] mt-1">9:16 Story {formats.story?.method === 'ai' ? '· AI' : '· smart'}</figcaption>
                          </figure>
                          <figure className="text-center">
                            <img src={formats.landscape?.url} alt="1.91:1" className="h-12 w-[92px] rounded-lg object-cover border border-[#eee]" />
                            <figcaption className="text-[9.5px] font-bold text-[#999] mt-1">1.91:1 Bred {formats.landscape?.method === 'ai' ? '· AI' : '· smart'}</figcaption>
                          </figure>
                          <button onClick={generateFormats} disabled={formatsBusy} className="ml-auto text-[11px] font-bold text-[#a052e0] hover:text-[#7A3EC8] inline-flex items-center gap-1 disabled:opacity-50">
                            {formatsBusy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} På nytt
                          </button>
                        </div>
                      ) : (
                        <button onClick={generateFormats} disabled={formatsBusy} className={`${btnPrimary} w-full mt-3 h-9`} data-testid="adstudio-formats-generate">
                          {formatsBusy ? <><Loader2 size={13} className="animate-spin" /> AI utvider scenen … (30–90 s)</> : <><Smartphone size={13} /> Generer 9:16 + 1.91:1 automatisk</>}
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : step === 2 ? (
                <div data-testid="adstudio-step-copy">
                  <h3 className="text-[14px] font-black text-[#111]">Tekst — med AI-tekstverksted</h3>
                  {imageNote ? <p className="text-[11.5px] text-[#a052e0] mt-1 flex items-center gap-1"><ScanEye size={12} /> Tekstpakken tilpasses bildet: «{imageNote.slice(0, 80)}…»</p> : null}
                  <label className={label}>Destinasjon</label>
                  <select value={link} onChange={(e) => setLink(e.target.value)} className={input} data-testid="adstudio-link">
                    {[...customLinks, ...LINKS].map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                  </select>

                  {/* Egen kampanjeside — perfekt message match mellom annonse og side */}
                  <div className="mt-3 rounded-2xl border border-[#e9dcf7] bg-gradient-to-b from-[#faf5ff] to-white p-4" data-testid="adstudio-lp">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[12px] font-bold text-[#111] flex items-center gap-1.5"><Globe size={13} className="text-[#a052e0]" /> Egen kampanjeside — message match</p>
                      <span className="text-[9px] font-bold uppercase text-[#a052e0] bg-[#f0e4fb] rounded-full px-1.5 py-0.5">Konverterer best</span>
                    </div>
                    {lpCreated ? (
                      <div className="mt-2.5 dh-fade-up" data-testid="adstudio-lp-created">
                        <p className="text-[12px] font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 size={13} /> Siden er live og satt som destinasjon</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <code className="text-[11.5px] bg-white border border-[#eee] rounded-lg px-2.5 py-1.5 text-[#555]">digihome.no{lpCreated.path}</code>
                          <a href={lpCreated.path} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#a052e0] hover:text-[#7A3EC8]"><ExternalLink size={11} /> Åpne siden</a>
                          <button onClick={() => setLpCreated(null)} className="text-[11px] font-bold text-[#999] hover:text-[#555]">Lag en ny</button>
                        </div>
                      </div>
                    ) : lpDraft ? (
                      <div className="mt-2.5 dh-fade-up" data-testid="adstudio-lp-draft">
                        <div className="rounded-xl border border-[#eee] bg-white p-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-[#999] shrink-0">digihome.no/lp/</span>
                            <input value={lpDraft.slug} onChange={(e) => setLpDraft({ ...lpDraft, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') })}
                              className="flex-1 h-7 rounded-lg border border-[#e5e5e5] px-2 text-[11.5px] font-semibold text-[#333] focus:border-[#a052e0] focus:outline-none" data-testid="adstudio-lp-slug" />
                          </div>
                          <p className="mt-2.5 text-[9.5px] font-bold uppercase tracking-wide text-[#a052e0]">{lpDraft.eyebrow}</p>
                          <p className="text-[14px] font-black text-[#111] leading-tight">{lpDraft.h1}{lpDraft.h1B ? <span className="block text-[#777]">{lpDraft.h1B}</span> : null}</p>
                          <p className="mt-1 text-[11.5px] text-[#666] leading-snug">{lpDraft.sub}</p>
                          <ul className="mt-2 space-y-1">
                            {(lpDraft.bullets || []).map((b, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[11.5px] text-[#333]"><Check size={11} className="text-emerald-500 shrink-0 mt-0.5" /> {b}</li>
                            ))}
                          </ul>
                          <p className="mt-2 text-[10.5px] text-[#999]">Hero-tall: <b className="text-[#333]">{lpDraft.heroStat?.value}</b> {lpDraft.heroStat?.label} · Skjema: «{lpDraft.formTitle}» · Knapp: «{lpDraft.cta}»{media ? ' · bruker annonsebildet i hero' : ''}</p>
                        </div>
                        <div className="mt-2.5 flex flex-wrap gap-2">
                          <button onClick={publishLp} disabled={lpBusy === 'save' || (lpDraft.slug || '').length < 3} className={`${btnPrimary} h-9`} data-testid="adstudio-lp-publish">
                            {lpBusy === 'save' ? <><Loader2 size={12} className="animate-spin" /> Publiserer …</> : <><Globe size={12} /> Publiser siden (live)</>}
                          </button>
                          <button onClick={generateLp} disabled={lpBusy === 'gen'} className={`${btnGhost} h-9`}>
                            {lpBusy === 'gen' ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Ny versjon
                          </button>
                          <button onClick={() => setLpDraft(null)} className={`${btnGhost} h-9`}><Trash2 size={12} /> Forkast</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] text-[#999] mt-1">AI skriver en egen landingsside som speiler annonsens budskap 1:1 (samme overskrift-vinkel, bullets og CTA) — den som klikker kjenner seg igjen umiddelbart. Går live på /lp/… og settes som destinasjon.</p>
                        <button onClick={generateLp} disabled={lpBusy === 'gen' || !message || !headline} className={`${btnPrimary} w-full mt-2.5 h-9`} data-testid="adstudio-lp-generate">
                          {lpBusy === 'gen' ? <><Loader2 size={13} className="animate-spin" /> Skriver siden fra annonsen …</> : <><Wand2 size={13} /> Generer kampanjeside fra annonsen</>}
                        </button>
                        {!message || !headline ? <p className="text-[10.5px] text-amber-600 mt-1.5">Velg primærtekst og overskrift først — siden bygges fra dem.</p> : null}
                      </>
                    )}
                  </div>
                  <button onClick={generateCopy} disabled={copyBusy || !brief.trim()} className={`${btnPrimary} mt-4`} data-testid="adstudio-gen-copy">
                    {copyBusy ? <><Loader2 size={13} className="animate-spin" /> Skriver 4 vinkler …</> : <><Sparkles size={13} /> {pkg ? 'Generer på nytt' : 'Generer tekstpakke'}</>}
                  </button>
                  {!brief.trim() ? <p className="text-[11px] text-amber-600 mt-1.5">Briefen mangler — gå tilbake til «Brief & media»</p> : null}

                  {pkg ? (
                    <div className="mt-4 dh-fade-up" data-testid="adstudio-pkg">
                      <div className="flex items-center justify-between">
                        <label className={`${label} mt-0`}>Primærtekst — klikk for å velge · <FlaskConical size={11} className="inline -mt-0.5 text-[#a052e0]" /> = ta med i A/B-test</label>
                        {abTexts.length ? <span className="text-[10.5px] font-bold text-[#a052e0]">{abTexts.length}/3 i A/B</span> : null}
                      </div>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {(pkg.primaryTexts || []).map((t, i) => {
                          const inAb = abTexts.some((x) => x.text === t.text);
                          return (
                            <div key={i} className={`relative rounded-xl border p-3 transition-all cursor-pointer hover:-translate-y-px ${message === t.text ? 'border-[#a052e0] bg-[#faf5ff] shadow-[0_2px_8px_rgba(160,82,224,0.12)]' : 'border-[#eee] hover:border-[#ccc]'}`} onClick={() => setMessage(t.text)}>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-[#a052e0]">{t.angle}</span>
                                <button onClick={(e) => { e.stopPropagation(); toggleAb(t); }} title="Ta med i A/B-test"
                                  className={`inline-flex items-center gap-1 rounded-full px-2 h-6 text-[10px] font-bold border transition-colors ${inAb ? 'bg-[#a052e0] text-white border-[#a052e0]' : 'border-[#e5e5e5] text-[#999] hover:border-[#c99df0]'}`}
                                  data-testid={`adstudio-ab-${i}`}>
                                  <FlaskConical size={10} /> A/B
                                </button>
                              </div>
                              <p className="text-[12px] text-[#333] mt-1 line-clamp-3 whitespace-pre-line">{t.text}</p>
                            </div>
                          );
                        })}
                      </div>
                      {abTexts.length >= 2 ? (
                        <p className="mt-2 text-[11.5px] font-semibold text-[#a052e0] flex items-center gap-1" data-testid="adstudio-ab-note"><FlaskConical size={12} /> A/B-test: {abTexts.length} annonser opprettes (samme bilde og overskrift, ulik primærtekst)</p>
                      ) : null}
                      <label className={label}>Overskrift — klikk for å velge</label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {(pkg.headlines || []).map((h, i) => (
                          <button key={i} onClick={() => setHeadline(h)} className={`rounded-full px-2.5 h-7 text-[11.5px] font-semibold border transition-colors ${headline === h ? 'border-[#a052e0] bg-[#faf5ff] text-[#7A3EC8]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}>{h}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label className={label}>Primærtekst (redigerbar)</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={`${input} resize-none`} data-testid="adstudio-message" />
                  <p className={`text-[10.5px] mt-1 ${counterCls((message.split('\n')[0] || '').length, 125)}`}>{(message.split('\n')[0] || '').length} tegn i første avsnitt — de første ~125 vises alltid</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Overskrift</label>
                      <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={60} className={input} data-testid="adstudio-headline" />
                      <p className={`text-[10.5px] mt-1 ${counterCls(headline.length, 40)}`}>{headline.length}/40 tegn</p>
                    </div>
                    <div>
                      <label className={label}>Beskrivelse (valgfri)</label>
                      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={60} className={input} />
                      <p className={`text-[10.5px] mt-1 ${counterCls(description.length, 30)}`}>{description.length}/30 tegn</p>
                    </div>
                  </div>
                  <label className={label}>Knapp (CTA)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CTAS.map((c) => (
                      <button key={c.v} onClick={() => setCta(c.v)} className={`rounded-full px-3 h-8 text-[12px] font-bold border transition-colors ${cta === c.v ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}>{c.l}</button>
                    ))}
                  </div>
                </div>
              ) : step === 3 ? (
                <div data-testid="adstudio-step-preview">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14px] font-black text-[#111]">Slik ser den ut — ekte Meta-forhåndsvisning</h3>
                    <button onClick={loadPreviews} className={btnGhost} disabled={previewBusy}><RefreshCw size={13} className={previewBusy ? 'animate-spin' : ''} /> Oppdater</button>
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {(formats ? ['Desktop Feed', 'Mobil Feed', 'Instagram', 'Story'] : ['Desktop Feed', 'Mobil Feed', 'Instagram']).map((t, i) => (
                      <button key={t} onClick={() => setPreviewTab(i)} className={`rounded-full px-3 h-8 text-[12px] font-bold transition-colors ${previewTab === i ? 'bg-[#0a0a0a] text-white' : 'bg-[#f3f3f3] text-[#888] hover:bg-[#eaeaea]'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-[#eee] bg-[repeating-conic-gradient(#fafafa_0%_25%,#f4f4f4_0%_50%)] bg-[length:24px_24px] p-3 min-h-[420px] flex items-center justify-center overflow-auto">
                    {previewBusy ? (
                      <div className="w-[320px] space-y-2">
                        <div className="h-10 rounded-lg bg-[#ececec] animate-pulse" />
                        <div className="h-64 rounded-lg bg-[#ececec] animate-pulse" />
                        <div className="h-10 rounded-lg bg-[#ececec] animate-pulse" />
                      </div>
                    ) : previews && previews[previewTab] && previews[previewTab].html ? (
                      <div className="[&_iframe]:mx-auto dh-fade-up" dangerouslySetInnerHTML={{ __html: previews[previewTab].html }} />
                    ) : <p className="text-[12px] text-[#999]">{previews && previews[previewTab] && previews[previewTab].error ? previews[previewTab].error : 'Ingen forhåndsvisning ennå'}</p>}
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2 flex items-center gap-1"><ShieldCheck size={12} /> UTM-sporing legges på automatisk: utm_source=facebook · utm_campaign=kampanjenavn · utm_content=annonsenavn</p>
                </div>
              ) : (
                <div data-testid="adstudio-step-publish">
                  <h3 className="text-[14px] font-black text-[#111]">Publiser — trygt og pauset</h3>
                  <label className={label}>Annonsenavn (internt i Meta)</label>
                  <input value={adName} onChange={(e) => setAdName(e.target.value)} placeholder={autoName()} className={input} data-testid="adstudio-adname" />

                  {/* Pre-flight: alt du bør vite før du trykker på knappen */}
                  <div className="mt-4 rounded-xl border border-[#eee] overflow-hidden" data-testid="adstudio-preflight">
                    <div className="flex items-center gap-2 bg-[#fafafa] px-4 py-2.5 border-b border-[#f0f0f0]">
                      <ListChecks size={14} className="text-[#a052e0]" />
                      <p className="text-[12px] font-black text-[#111]">Pre-flight sjekkliste</p>
                      <span className="ml-auto text-[10.5px] font-bold text-[#999]">{[
                        !!adset, (media?.width || 0) >= 1080, !!(formats?.story && formats?.landscape),
                        headline.length > 0 && headline.length <= 40, message.length > 0, valState === 'ok',
                      ].filter(Boolean).length}/6</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {[
                        { ok: !!adset, l: <>Plassering: <b>{adset?.campaignName}</b> → {adset?.name}</> },
                        { ok: (media?.width || 0) >= 1080, l: <>Bildekvalitet ≥ 1080 px ({media?.width}×{media?.height})</> },
                        { ok: !!(formats?.story && formats?.landscape), soft: true, l: formats?.story ? <>Plasseringstilpasset: 1:1 + 9:16 + 1.91:1</> : <>Kun 1:1 — Story/bred plassering gjenbruker kvadratet (høyere CPM)</> },
                        { ok: headline.length > 0 && headline.length <= 40, l: <>Overskrift: «{headline || '—'}» · CTA: {ctaLabel(cta)}</> },
                        { ok: message.length > 0, l: <>Destinasjon: {link.replace('https://', '')}{isAb ? <span className="text-[#a052e0] font-bold"> · A/B med {abTexts.length} varianter</span> : null}</> },
                        { ok: valState === 'ok', soft: true, l: valState === 'ok' ? <>Godkjent av Metas validering</> : <>Metas validering ikke kjørt — anbefales før publisering</> },
                        { ok: true, l: <>Opprettes <b>PAUSET</b> · UTM-sporing legges på automatisk</> },
                      ].map((c, i) => (
                        <p key={i} className={`flex items-start gap-2 text-[12px] leading-snug ${c.ok ? 'text-[#333]' : c.soft ? 'text-amber-700' : 'text-rose-600'}`}>
                          {c.ok ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" /> : c.soft ? <AlertCircle size={13} className="text-amber-500 shrink-0 mt-0.5" /> : <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />}
                          <span>{c.l}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={validate} disabled={valState === 'busy'} className={btnGhost} data-testid="adstudio-validate">
                      {valState === 'busy' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />} Kjør Metas validering
                    </button>
                    {valState === 'ok' ? <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600"><CheckCircle2 size={13} /> Godkjent av Metas validering</span> : null}
                    {valState.startsWith('feil:') && !appModeError ? <span className="text-[12px] font-semibold text-rose-500">{valState.slice(5)}</span> : null}
                  </div>
                  <button onClick={publish} disabled={pubBusy} className={`${btnPrimary} w-full mt-4 h-11`} data-testid="adstudio-publish">
                    {pubBusy ? <><Loader2 size={14} className="animate-spin" /> Oppretter …</> : <><Megaphone size={14} /> {isAb ? `Opprett ${abTexts.length} annonser (pauset A/B)` : 'Opprett annonse (pauset)'}</>}
                  </button>
                  <p className="text-[11px] text-[#aaa] mt-2 text-center">Ingenting går live før du selv aktiverer.</p>
                </div>
              )}

              {err && !appModeError ? <p className="mt-3 text-[12px] font-semibold text-rose-500" data-testid="adstudio-err">{err}</p> : null}

              {step < 4 ? (
                <div className="flex justify-between mt-6 pt-4 border-t border-[#f0f0f0]">
                  <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0} className={btnGhost}><ChevronLeft size={14} /> Tilbake</button>
                  <button onClick={() => setStep(step + 1)} disabled={!canNext} className={btnPrimary} data-testid="adstudio-next">Neste <ChevronRight size={14} /></button>
                </div>
              ) : (
                <div className="flex justify-start mt-6 pt-4 border-t border-[#f0f0f0]">
                  <button onClick={() => setStep(3)} className={btnGhost}><ChevronLeft size={14} /> Tilbake</button>
                </div>
              )}
            </motion.div>
            </AnimatePresence>
          </div>

          {/* Høyre (desktop) / under (mobil): mockup + kvalitetsscore */}
          <div className="xl:sticky xl:top-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999]">Live utkast</p>
                <div className="flex rounded-full bg-[#f3f3f3] p-0.5" role="tablist" aria-label="Plattform">
                  {[['facebook', 'Facebook'], ['instagram', 'Instagram'], ['story', 'Story']].map(([k, l]) => (
                    <button key={k} onClick={() => setPlatform(k)} role="tab" aria-selected={platform === k}
                      className={`rounded-full px-2.5 h-6 text-[10.5px] font-bold transition-colors ${platform === k ? 'bg-white text-[#111] shadow-sm' : 'text-[#999]'}`} data-testid={`adstudio-platform-${k}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div className="flex justify-center xl:justify-start">
                <AnimatePresence mode="wait">
                  <motion.div key={platform} initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -8 }} transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}>
                    {platform === 'facebook' ? (
                      <FeedMockup pageName={ctx.page?.name || 'DigiHome'} message={message} headline={headline} description={description} cta={ctaLabel(cta)} imageUrl={media?.url} link={link} />
                    ) : platform === 'instagram' ? (
                      <InstaMockup pageName={ctx.page?.name || 'DigiHome'} message={message} cta={ctaLabel(cta)} imageUrl={media?.url} />
                    ) : (
                      <StoryMockup pageName={ctx.page?.name || 'DigiHome'} message={message} cta={ctaLabel(cta)} imageUrl={formats?.story?.url || media?.url} hasStoryFormat={!!formats?.story} />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            <QualityPanel quality={quality} />
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------- Progress-stepper ------------------------------ */
function Stepper({ step, onJump }) {
  const pct = (step / (STEPS.length - 1)) * 100;
  return (
    <div className="mb-4" data-testid="adstudio-steps">
      <div className="relative">
        {/* Fremdriftslinje */}
        <div className="absolute left-4 right-4 top-[15px] h-[2px] bg-[#eee] rounded-full" aria-hidden />
        <div className="absolute left-4 top-[15px] h-[2px] bg-[#0a0a0a] rounded-full transition-all duration-500" style={{ width: `calc(${pct}% * (100% - 32px) / 100%)`, maxWidth: 'calc(100% - 32px)' }} aria-hidden />
        <div className="relative flex justify-between">
          {STEPS.map((s, i) => {
            const done = i < step; const active = i === step;
            return (
              <button key={s.l} onClick={() => onJump(i)} disabled={i >= step} aria-current={active ? 'step' : undefined}
                className={`flex flex-col items-center gap-1.5 group ${i < step ? 'cursor-pointer' : 'cursor-default'}`} style={{ width: `${100 / STEPS.length}%` }}>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 text-[11px] font-black transition-all duration-300 ${active ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white scale-110 shadow-[0_2px_8px_rgba(0,0,0,0.25)]' : done ? 'border-[#0a0a0a] bg-white text-[#0a0a0a] group-hover:bg-[#f5f5f5]' : 'border-[#e5e5e5] bg-white text-[#ccc]'}`}>
                  {done ? <Check size={13} /> : i + 1}
                </span>
                <span className={`text-[10.5px] font-bold leading-tight text-center hidden sm:block ${active ? 'text-[#111]' : done ? 'text-[#555]' : 'text-[#bbb]'}`}>{s.l}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Steg 1: kampanje + annonsesett --------------------- */
function StepPlacement({ ctx, adset, setAdset, onRefresh, q, onCreated }) {
  const [mode, setMode] = useState('eksisterende'); // 'eksisterende' | 'ny'
  return (
    <div data-testid="adstudio-step-placement">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-black text-[#111]">Hvor skal annonsen bo?</h3>
          <p className="text-[12px] text-[#999] mt-0.5">{mode === 'ny' ? 'Lag en helt ny kampanje med eget budsjett og målgruppe — alt opprettes pauset.' : 'Velg annonsesett — annonsen arver targeting og budsjett derfra. Aktive leads-kampanjer anbefales.'}</p>
        </div>
        <button onClick={onRefresh} className="text-[#999] hover:text-[#555] transition-colors" aria-label="Oppdater kampanjer"><RefreshCw size={14} /></button>
      </div>

      <div className="mt-3 flex rounded-xl bg-[#f5f5f5] p-1" role="tablist" aria-label="Plasseringsmodus">
        {[['eksisterende', 'Eksisterende annonsesett'], ['ny', '+ Ny kampanje']].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} role="tab" aria-selected={mode === k}
            data-testid={`adstudio-placement-mode-${k}`}
            className={`flex-1 h-8 rounded-lg text-[12px] font-bold transition-all ${mode === k ? 'bg-white text-[#111] shadow-sm' : 'text-[#999] hover:text-[#666]'}`}>{l}</button>
        ))}
      </div>

      {mode === 'ny' ? (
        <NewCampaignPanel q={q} onCreated={onCreated} onDone={() => setMode('eksisterende')} />
      ) : (
        <div className="mt-4 space-y-3 max-h-[480px] overflow-auto pr-1">
          {(ctx.campaigns || []).map((c) => (
            <div key={c.id} className="rounded-xl border border-[#eee] p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`h-2 w-2 rounded-full ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-[#ccc]'}`} />
                <p className="text-[12.5px] font-bold text-[#222]">{c.name}</p>
                {String(c.objective).includes('LEAD') ? <span className="text-[9.5px] font-bold uppercase text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">Leads ✓ anbefalt</span> : <span className="text-[9.5px] font-bold uppercase text-[#999] bg-[#f3f3f3] rounded-full px-2 py-0.5">{String(c.objective || '').replace('OUTCOME_', '')}</span>}
              </div>
              <div className="mt-2 grid gap-1.5">
                {(c.adsets || []).map((s) => (
                  <button key={s.id} onClick={() => setAdset({ ...s, campaignName: c.name, campaignId: c.id })}
                    data-testid={`adstudio-adset-${s.id}`}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-all ${adset?.id === s.id ? 'border-[#a052e0] bg-[#faf5ff] shadow-[0_2px_8px_rgba(160,82,224,0.12)]' : 'border-[#f0f0f0] hover:border-[#ddd] hover:-translate-y-px'}`}>
                    <div>
                      <p className="text-[12px] font-semibold text-[#333]">{s.name}</p>
                      <p className="text-[10.5px] text-[#999]">{s.status} {s.dailyBudget ? `· ${nf.format(s.dailyBudget)} kr/dag` : ''} {s.geo ? `· ${s.geo}` : ''} {s.age ? `· ${s.age} år` : ''}</p>
                    </div>
                    {adset?.id === s.id ? <CheckCircle2 size={16} className="text-[#a052e0]" /> : <span className="h-4 w-4 rounded-full border border-[#e0e0e0]" />}
                  </button>
                ))}
                {!c.adsets?.length ? <p className="text-[11px] text-[#bbb] italic">Ingen annonsesett</p> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Ny kampanje: skjema + geo-søk ------------------------ */
function NewCampaignPanel({ q, onCreated, onDone }) {
  const monthLabel = new Date().toLocaleDateString('nb-NO', { month: 'long', year: 'numeric' });
  const [name, setName] = useState(`DigiHome Leads — ${monthLabel}`);
  const [objective, setObjective] = useState('leads');
  const [budget, setBudget] = useState(150);
  const [geoMode, setGeoMode] = useState('norge'); // 'norge' | 'by'
  const [geoQuery, setGeoQuery] = useState('');
  const [geoResults, setGeoResults] = useState([]);
  const [geoPick, setGeoPick] = useState(null);
  const [ageMin, setAgeMin] = useState(28);
  const [ageMax, setAgeMax] = useState(65);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');

  // Geo-søk med liten debounce
  useEffect(() => {
    if (geoMode !== 'by' || geoQuery.trim().length < 2 || geoPick) { setGeoResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/adstudio/geosearch?${q}&q=${encodeURIComponent(geoQuery.trim())}`);
        const j = await r.json();
        if (j.ok) setGeoResults(j.results || []);
      } catch (e) {}
    }, 350);
    return () => clearTimeout(t);
  }, [geoQuery, geoMode, geoPick, q]);

  const create = async () => {
    setBusy(true); setError(''); setOkMsg('');
    try {
      const r = await fetch(`/api/admin/adstudio/campaign?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), objective, dailyBudget: Number(budget) || 150,
          geo: geoMode === 'by' && geoPick ? { type: 'city', key: geoPick.key, name: geoPick.name, radius: 25 } : { type: 'country' },
          ageMin: Number(ageMin) || 28, ageMax: Number(ageMax) || 65,
        }),
      });
      const j = await r.json();
      if (j.ok) {
        setOkMsg(`Kampanjen «${name.trim()}» og annonsesettet «${j.adsetName}» er opprettet — pauset og klart.`);
        await onCreated(j.adsetId);
        setTimeout(() => onDone(), 1400);
      } else setError(j.error || 'Opprettelsen feilet');
    } catch (e) { setError('Opprettelsen feilet — prøv igjen'); }
    setBusy(false);
  };

  const geoLabel = geoMode === 'by' && geoPick ? `${geoPick.name} (+25 km)` : 'Hele Norge';

  return (
    <div className="mt-4 dh-fade-up" data-testid="adstudio-newcampaign">
      <label className={label}>Kampanjenavn</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className={input} maxLength={120} data-testid="adstudio-camp-name" />

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className={label}>Mål</label>
          <div className="flex gap-1.5">
            {[['leads', 'Leads (anbefalt)'], ['traffic', 'Trafikk']].map(([k, l]) => (
              <button key={k} onClick={() => setObjective(k)}
                className={`flex-1 h-9 rounded-xl text-[12px] font-bold border transition-colors ${objective === k ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}
                data-testid={`adstudio-camp-obj-${k}`}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Dagsbudsjett (kr)</label>
          <input type="number" min={50} max={10000} value={budget} onChange={(e) => setBudget(e.target.value)} className={input} data-testid="adstudio-camp-budget" />
        </div>
      </div>

      <label className={label}>Geografi</label>
      <div className="flex gap-1.5">
        <button onClick={() => { setGeoMode('norge'); setGeoPick(null); }}
          className={`h-9 px-4 rounded-xl text-[12px] font-bold border transition-colors ${geoMode === 'norge' ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}
          data-testid="adstudio-camp-geo-norge">Hele Norge</button>
        <button onClick={() => setGeoMode('by')}
          className={`h-9 px-4 rounded-xl text-[12px] font-bold border transition-colors ${geoMode === 'by' ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}
          data-testid="adstudio-camp-geo-by">By/område</button>
      </div>
      {geoMode === 'by' ? (
        <div className="mt-2 relative">
          {geoPick ? (
            <div className="flex items-center gap-2 rounded-xl border border-[#a052e0] bg-[#faf5ff] px-3.5 py-2.5">
              <MapPin size={13} className="text-[#a052e0]" />
              <span className="text-[12.5px] font-semibold text-[#333] flex-1">{geoPick.name}{geoPick.region ? `, ${geoPick.region}` : ''} · radius 25 km</span>
              <button onClick={() => { setGeoPick(null); setGeoQuery(''); }} className="text-[11px] font-bold text-[#a052e0]">Endre</button>
            </div>
          ) : (
            <>
              <input value={geoQuery} onChange={(e) => setGeoQuery(e.target.value)} placeholder="Søk by — f.eks. Bergen" className={input} data-testid="adstudio-camp-geosearch" />
              {geoResults.length ? (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-[#eee] bg-white shadow-lg overflow-hidden">
                  {geoResults.map((g) => (
                    <button key={g.key} onClick={() => { setGeoPick(g); setGeoResults([]); }}
                      className="w-full text-left px-3.5 py-2 text-[12.5px] hover:bg-[#faf5ff] transition-colors flex items-center gap-2">
                      <MapPin size={12} className="text-[#a052e0]" /> {g.name}{g.region ? `, ${g.region}` : ''} <span className="text-[10px] text-[#bbb] uppercase ml-auto">{g.type}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Alder fra</label>
          <input type="number" min={18} max={65} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Alder til</label>
          <input type="number" min={18} max={65} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} className={input} />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#f0e4fb] bg-[#faf5ff] p-3 text-[11.5px] text-[#555] flex items-start gap-2">
        <ShieldCheck size={13} className="text-[#a052e0] shrink-0 mt-0.5" />
        <span>Oppsummert: <b>{objective === 'leads' ? 'Leads' : 'Trafikk'}</b> · {nf.format(Number(budget) || 150)} kr/dag · {geoLabel} · {ageMin}–{ageMax} år. Kampanje og annonsesett opprettes <b>pauset</b> — ingenting bruker penger før du aktiverer.</span>
      </div>

      {error ? <p className="mt-2 text-[12px] font-semibold text-rose-500" data-testid="adstudio-camp-err">{error}</p> : null}
      {okMsg ? <p className="mt-2 text-[12px] font-bold text-emerald-600 flex items-center gap-1.5" data-testid="adstudio-camp-ok"><CheckCircle2 size={13} /> {okMsg}</p> : null}

      <button onClick={create} disabled={busy || !name.trim() || (geoMode === 'by' && !geoPick)} className={`${btnPrimary} w-full mt-3`} data-testid="adstudio-camp-create">
        {busy ? <><Loader2 size={13} className="animate-spin" /> Oppretter i Meta …</> : <><PlusCircle size={14} /> Opprett kampanje + annonsesett (pauset)</>}
      </button>
    </div>
  );
}

/* ------------------------- Facebook Feed-mockup ---------------------------- */
function FeedMockup({ pageName, message, headline, description, cta, imageUrl, link }) {
  let host = 'digihome.no';
  try { host = new URL(link).hostname; } catch (e) {}
  return (
    <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_4px_20px_rgba(16,10,40,0.08)] overflow-hidden" data-testid="adstudio-mockup" style={{ width: 340 }}>
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <div className="h-9 w-9 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center text-[13px] font-black">D</div>
        <div className="flex-1">
          <p className="text-[12.5px] font-bold text-[#111] leading-tight">{pageName}</p>
          <p className="text-[10px] text-[#999]">Sponset · <Globe size={9} className="inline -mt-0.5" /></p>
        </div>
        <MoreHorizontal size={16} className="text-[#bbb]" />
      </div>
      <p className="px-3.5 py-2.5 text-[12.5px] text-[#222] leading-snug whitespace-pre-line">{message || 'Primærteksten din vises her …'}</p>
      <div className="bg-[#f2f2f2] aspect-square w-full overflow-hidden">
        {imageUrl ? <img src={imageUrl} alt="Annonsebilde" className="h-full w-full object-cover" /> : (
          <div className="h-full w-full flex items-center justify-center text-[#ccc]"><ImageIcon size={30} /></div>
        )}
      </div>
      <div className="flex items-center justify-between bg-[#f7f7f7] px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="text-[9.5px] uppercase text-[#999]">{host}</p>
          <p className="text-[12.5px] font-bold text-[#111] truncate">{headline || 'Overskrift …'}</p>
          {description ? <p className="text-[10.5px] text-[#888] truncate">{description}</p> : null}
        </div>
        <span className="ml-3 shrink-0 rounded-lg bg-[#e4e6eb] px-3 py-1.5 text-[11.5px] font-bold text-[#111]">{cta}</span>
      </div>
      <div className="flex items-center justify-around border-t border-[#f0f0f0] px-2 py-1.5 text-[#8a8d91]">
        <span className="flex items-center gap-1 text-[11px] font-semibold"><ThumbsUp size={13} /> Liker</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold"><MessageCircle size={13} /> Kommenter</span>
        <span className="flex items-center gap-1 text-[11px] font-semibold"><Share2 size={13} /> Del</span>
      </div>
    </div>
  );
}

/* --------------------------- Instagram-mockup ------------------------------ */
function InstaMockup({ pageName, message, cta, imageUrl }) {
  return (
    <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_4px_20px_rgba(16,10,40,0.08)] overflow-hidden" data-testid="adstudio-mockup-ig" style={{ width: 340 }}>
      <div className="flex items-center gap-2.5 px-3.5 py-2.5">
        <span className="rounded-full p-[2px] bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]">
          <span className="block h-8 w-8 rounded-full bg-[#0a0a0a] text-white text-[12px] font-black leading-8 text-center border-2 border-white">D</span>
        </span>
        <div className="flex-1">
          <p className="text-[12.5px] font-bold text-[#111] leading-tight">{pageName.toLowerCase().replace(/\s/g, '')}</p>
          <p className="text-[10px] text-[#999]">Sponset</p>
        </div>
        <MoreHorizontal size={16} className="text-[#bbb]" />
      </div>
      <div className="bg-[#f2f2f2] aspect-square w-full overflow-hidden">
        {imageUrl ? <img src={imageUrl} alt="Annonsebilde" className="h-full w-full object-cover" /> : (
          <div className="h-full w-full flex items-center justify-center text-[#ccc]"><ImageIcon size={30} /></div>
        )}
      </div>
      <div className="flex items-center justify-between bg-[#3797f0] px-3.5 py-2.5 text-white">
        <p className="text-[12px] font-bold">{cta}</p>
        <ChevronRight size={15} />
      </div>
      <div className="flex items-center gap-3.5 px-3.5 pt-2.5 text-[#262626]">
        <Heart size={18} /> <MessageCircle size={18} /> <Send size={18} />
        <Bookmark size={18} className="ml-auto" />
      </div>
      <p className="px-3.5 py-2.5 text-[12px] text-[#222] leading-snug line-clamp-2">
        <b>{pageName.toLowerCase().replace(/\s/g, '')}</b> {message || 'Primærteksten din vises her …'}
      </p>
    </div>
  );
}

/* --------------------------- Story-mockup (9:16) --------------------------- */
function StoryMockup({ pageName, message, cta, imageUrl, hasStoryFormat }) {
  const firstLine = (message || '').split('\n')[0] || 'Primærteksten din vises her …';
  return (
    <div className="relative rounded-[26px] border border-[#e5e5e5] bg-[#111] shadow-[0_6px_24px_rgba(16,10,40,0.18)] overflow-hidden" data-testid="adstudio-mockup-story" style={{ width: 250, height: 444 }}>
      {imageUrl ? (
        <img src={imageUrl} alt="Story-annonse" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[#444]"><ImageIcon size={34} /></div>
      )}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="absolute inset-x-0 top-0 p-3">
        <div className="flex gap-1">
          <span className="h-[3px] flex-1 rounded-full bg-white/90" />
          <span className="h-[3px] flex-1 rounded-full bg-white/30" />
          <span className="h-[3px] flex-1 rounded-full bg-white/30" />
        </div>
        <div className="mt-2.5 flex items-center gap-2">
          <span className="h-8 w-8 rounded-full bg-white text-[#0a0a0a] flex items-center justify-center text-[12px] font-black">D</span>
          <div>
            <p className="text-[11.5px] font-bold text-white leading-tight">{pageName}</p>
            <p className="text-[9.5px] text-white/70">Sponset</p>
          </div>
          <MoreHorizontal size={15} className="text-white/80 ml-auto" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3.5 text-center">
        <p className="text-[11px] text-white/90 leading-snug line-clamp-2 mb-2.5">{firstLine}</p>
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[11.5px] font-bold text-[#111] shadow-lg">
          <ChevronRight size={12} className="-rotate-90" /> {cta}
        </div>
        {!hasStoryFormat ? <p className="mt-2 text-[8.5px] text-white/60">1:1-bildet beskjæres i Story — generer 9:16 for full flate</p> : null}
      </div>
    </div>
  );
}

/* --------------------------- Kvalitetsscore -------------------------------- */
function QualityPanel({ quality }) {
  const pct = Math.round((quality.score / quality.total) * 100);
  const color = pct >= 84 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#d1d5db';
  return (
    <div className="rounded-2xl border border-[#ececec] bg-white shadow-[0_1px_3px_rgba(16,10,40,0.05)] p-4" data-testid="adstudio-quality">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12">
          <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f0f0f0" strokeWidth="4" />
            <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * 97.4} 97.4`} style={{ transition: 'stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1), stroke 0.4s' }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black text-[#111]">{quality.score}/{quality.total}</span>
        </div>
        <div>
          <p className="text-[12.5px] font-black text-[#111] flex items-center gap-1"><Gauge size={13} className="text-[#a052e0]" /> Annonsekvalitet</p>
          <p className="text-[11px] text-[#999]">{pct >= 84 ? 'Klar til publisering 🎯' : pct >= 50 ? 'Nesten der — se sjekklisten' : 'Fyll ut veiviseren'}</p>
        </div>
      </div>
      <div className="mt-3 space-y-1.5">
        {quality.checks.map((c, i) => (
          <div key={i}>
            <p className={`flex items-center gap-1.5 text-[11.5px] ${c.ok ? 'text-emerald-700' : 'text-[#999]'}`}>
              {c.ok ? <CheckCircle2 size={12} /> : <span className="inline-block h-3 w-3 rounded-full border border-[#ddd] shrink-0" />} {c.l}
            </p>
            {!c.ok && c.fix ? <p className="ml-[18px] text-[10px] text-[#bbb]">{c.fix}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Mine annonser ------------------------------ */
function MyAds({ ads, busy, onRefresh, onToggle, actId }) {
  if (!ads) return <div className="flex justify-center py-16 text-[#999]"><Loader2 className="animate-spin" size={18} /></div>;
  return (
    <div className="rounded-2xl border border-[#ececec] bg-white shadow-[0_1px_3px_rgba(16,10,40,0.05)] overflow-hidden dh-fade-up" data-testid="adstudio-myads">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
        <p className="text-[13px] font-black text-[#111]">Annonser laget i studioet</p>
        <div className="flex items-center gap-3">
          {actId ? <a href={`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${actId}`} target="_blank" rel="noreferrer" className="text-[11.5px] font-semibold text-[#999] hover:text-[#555] inline-flex items-center gap-1 transition-colors">Ads Manager <ExternalLink size={11} /></a> : null}
          <button onClick={onRefresh} className="text-[#999] hover:text-[#555] transition-colors" aria-label="Oppdater"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /></button>
        </div>
      </div>
      {!ads.length ? (
        <div className="px-5 py-12 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f7f7f7] text-[#ccc]"><Megaphone size={20} /></span>
          <p className="mt-3 text-[12.5px] font-bold text-[#555]">Ingen annonser ennå</p>
          <p className="text-[11.5px] text-[#999]">Lag din første med «Ny annonse» — det tar under to minutter</p>
        </div>
      ) : (
        <div className="divide-y divide-[#f5f5f5]">
          {ads.map((a) => {
            const live = a.live || {};
            const active = live.status === 'ACTIVE';
            const cpl = live.leads > 0 ? live.spend / live.leads : null;
            const cpc = live.clicks > 0 ? live.spend / live.clicks : null;
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-[#fcfcfc] transition-colors">
                {a.imageUrl ? <img src={a.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className="h-11 w-11 rounded-lg bg-[#f3f3f3] flex items-center justify-center text-[#ccc]"><ImageIcon size={16} /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-[#222] truncate">{a.adName} {a.abGroup ? <span className="ml-1 text-[9.5px] font-bold uppercase text-[#a052e0] bg-[#f0e4fb] rounded-full px-1.5 py-0.5"><FlaskConical size={9} className="inline -mt-0.5" /> A/B {a.abIndex}/{a.abTotal}</span> : null} {a.placementCustomized ? <span className="ml-1 text-[9.5px] font-bold uppercase text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5"><Smartphone size={9} className="inline -mt-0.5" /> Alle formater</span> : null}</p>
                  <p className="text-[10.5px] text-[#999]">{a.headline} · {new Date(a.createdAt).toLocaleDateString('nb-NO')}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${active ? 'bg-emerald-50 text-emerald-700' : String(live.status || a.status).includes('PAUSED') ? 'bg-amber-50 text-amber-700' : 'bg-[#f3f3f3] text-[#999]'}`}>{live.status || a.status}</span>
                <div className="flex items-center gap-4 text-[11px] text-[#777]">
                  <span className="flex items-center gap-1" title="Forbruk siste 30 d"><Coins size={12} /> {nf.format(Math.round(live.spend || 0))} kr</span>
                  <span className="flex items-center gap-1" title="Visninger"><Eye size={12} /> {nf.format(live.impressions || 0)}</span>
                  <span className="flex items-center gap-1" title={cpc ? `CPC ${cpc.toFixed(1)} kr` : 'Klikk'}><MousePointerClick size={12} /> {nf.format(live.clicks || 0)}</span>
                  <span className="flex items-center gap-1 font-bold text-[#111]" title={cpl ? `CPL ${Math.round(cpl)} kr` : 'Leads'}>{nf.format(live.leads || 0)} leads{cpl ? ` · ${Math.round(cpl)} kr/lead` : ''}</span>
                </div>
                <button onClick={() => onToggle(a.metaAdId, live.status)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-[11.5px] font-bold border transition-colors ${active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} data-testid={`adstudio-toggle-${a.metaAdId}`}>
                  {active ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Aktiver</>}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
