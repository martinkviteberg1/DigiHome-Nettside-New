'use client';

// ---------------------------------------------------------------------------
// Annonsestudio — lag Meta-annonser (Facebook/Instagram) direkte fra admin.
// Veiviser: Plassering → Media → Tekst (AI) → Forhåndsvisning → Publiser.
// Annonser opprettes ALLTID pauset; aktivering skjer eksplisitt etterpå.
// ---------------------------------------------------------------------------
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Upload, Sparkles, Wand2, Check, ChevronRight, ChevronLeft,
  Image as ImageIcon, Megaphone, Play, Pause, RefreshCw, ExternalLink,
  AlertCircle, CheckCircle2, Globe, ThumbsUp, MessageCircle, Share2,
  MousePointerClick, Coins, Eye, LayoutList, PlusCircle, ShieldCheck, Info,
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
const STEPS = ['Plassering', 'Media', 'Tekst', 'Forhåndsvisning', 'Publiser'];

const card = 'rounded-2xl border border-[#ececec] bg-white shadow-sm';
const label = 'block text-[11px] font-bold uppercase tracking-[0.08em] text-[#999] mt-4 mb-1.5';
const input = 'w-full rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]';
const btnPrimary = 'inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0a0a0a] text-white text-[13px] font-bold hover:bg-[#222] disabled:opacity-40 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-[#e5e5e5] bg-white text-[13px] font-semibold text-[#555] hover:border-[#bbb] transition-colors';

export default function AdStudioTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey || '')}`;
  const [view, setView] = useState('ny');            // ny | mine
  const [ctx, setCtx] = useState(null);
  const [ctxErr, setCtxErr] = useState('');
  const [step, setStep] = useState(0);

  // Veiviser-tilstand
  const [adset, setAdset] = useState(null);          // { id, name, campaignName, ... }
  const [media, setMedia] = useState(null);          // { hash, url, width, height }
  const [mediaBusy, setMediaBusy] = useState('');    // '' | 'upload' | 'ai'
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiStyle, setAiStyle] = useState('foto');
  const [brief, setBrief] = useState('');
  const [copyBusy, setCopyBusy] = useState(false);
  const [pkg, setPkg] = useState(null);              // AI-pakken
  const [message, setMessage] = useState('');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('LEARN_MORE');
  const [link, setLink] = useState(LINKS[0].v);
  const [previews, setPreviews] = useState(null);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewTab, setPreviewTab] = useState(0);
  const [adName, setAdName] = useState('');
  const [valState, setValState] = useState('');      // '' | busy | ok | feil:<msg>
  const [pubBusy, setPubBusy] = useState(false);
  const [created, setCreated] = useState(null);      // { adId }
  const [err, setErr] = useState('');

  // Mine annonser
  const [myAds, setMyAds] = useState(null);
  const [adsBusy, setAdsBusy] = useState(false);

  const fileRef = useRef(null);

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

  /* ------------------------------ Media ---------------------------------- */
  const uploadFile = async (file) => {
    if (!file) return;
    setMediaBusy('upload'); setErr('');
    try {
      const b64 = await new Promise((res, rej) => {
        const fr = new FileReader();
        fr.onload = () => res(fr.result);
        fr.onerror = rej;
        fr.readAsDataURL(file);
      });
      const r = await fetch(`/api/admin/adstudio/media?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageB64: b64, filename: file.name }),
      });
      const j = await r.json();
      if (j.ok) setMedia(j); else setErr(j.error || 'Opplasting feilet');
    } catch (e) { setErr('Opplasting feilet'); }
    setMediaBusy('');
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
      if (j.ok) setMedia(j); else setErr(j.error || 'AI-bildet feilet');
    } catch (e) { setErr('AI-bildet feilet'); }
    setMediaBusy('');
  };

  /* ------------------------------ Tekst ----------------------------------- */
  const generateCopy = async () => {
    if (!brief.trim()) return;
    setCopyBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/copy?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim(), landing: link }),
      });
      const j = await r.json();
      if (j.ok && j.package) {
        setPkg(j.package);
        const p = j.package;
        if (p.primaryTexts && p.primaryTexts[0]) setMessage(p.primaryTexts[0].text || '');
        if (p.headlines && p.headlines[0]) setHeadline(p.headlines[0]);
        if (p.descriptions && p.descriptions[0]) setDescription(p.descriptions[0]);
        if (p.cta && CTAS.some((c) => c.v === p.cta)) setCta(p.cta);
      } else setErr(j.error || 'AI-teksten feilet');
    } catch (e) { setErr('AI-teksten feilet'); }
    setCopyBusy(false);
  };

  /* --------------------------- Forhåndsvisning ---------------------------- */
  const loadPreviews = async () => {
    if (!ctx?.page?.id || !media?.hash) return;
    setPreviewBusy(true); setErr('');
    try {
      const r = await fetch(`/api/admin/adstudio/preview?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: ctx.page.id, link, message, headline, description, imageHash: media.hash, cta }),
      });
      const j = await r.json();
      if (j.ok) setPreviews(j.previews || []); else setErr(j.error || 'Forhåndsvisning feilet');
    } catch (e) { setErr('Forhåndsvisning feilet'); }
    setPreviewBusy(false);
  };
  useEffect(() => { if (step === 3 && !previews) loadPreviews(); /* eslint-disable-next-line */ }, [step]);

  /* ------------------------------ Publiser -------------------------------- */
  const validate = async () => {
    setValState('busy');
    try {
      const r = await fetch(`/api/admin/adstudio/create?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validateOnly: true, adsetId: adset.id, adName: adName || autoName(), pageId: ctx.page.id, link, message, headline, description, imageHash: media.hash, cta }),
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
        body: JSON.stringify({ adsetId: adset.id, adName: adName || autoName(), pageId: ctx.page.id, link, message, headline, description, imageHash: media.hash, cta, imageUrl: media.url }),
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

  const autoName = () => {
    const d = new Date();
    const angle = pkg?.primaryTexts?.find((t) => t.text === message)?.angle || 'studio';
    return `Studio | ${angle} | ${d.toISOString().slice(0, 10)}`;
  };

  const resetWizard = () => {
    setStep(0); setAdset(null); setMedia(null); setPkg(null); setMessage(''); setHeadline('');
    setDescription(''); setCta('LEARN_MORE'); setPreviews(null); setAdName(''); setValState(''); setCreated(null); setErr('');
  };

  const canNext = [!!adset, !!media, !!(message && headline), true, false][step];
  const appModeError = String(err || (valState.startsWith('feil:') ? valState.slice(5) : '')).includes('utviklingsmodus');

  /* ============================== RENDER ================================== */
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
  if (!ctx) return <div className="flex items-center justify-center py-24 text-[#999]"><Loader2 className="animate-spin mr-2" size={18} /> Henter Meta-kontoen …</div>;

  return (
    <div data-testid="adstudio-root">
      {/* Topplinje */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#0a0a0a] text-white"><Wand2 size={15} /></span>
            <h2 className="text-[17px] font-black text-[#111]">Annonsestudio</h2>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#a052e0] bg-[#f0e4fb] rounded-full px-2 py-0.5">Meta</span>
          </div>
          <p className="text-[12px] text-[#999] mt-1">{ctx.account?.name} · Side: {ctx.page?.name || '—'} · Alt opprettes pauset</p>
        </div>
        <div className="flex gap-2">
          <button data-testid="adstudio-view-ny" onClick={() => setView('ny')} className={view === 'ny' ? btnPrimary : btnGhost}><PlusCircle size={14} /> Ny annonse</button>
          <button data-testid="adstudio-view-mine" onClick={() => { setView('mine'); loadMyAds(); }} className={view === 'mine' ? btnPrimary : btnGhost}><LayoutList size={14} /> Mine annonser {myAds ? `(${myAds.length})` : ''}</button>
        </div>
      </div>

      {appModeError ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3" data-testid="adstudio-appmode-warn">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[12.5px] text-amber-900 leading-relaxed">
            <b>Meta-appen står i utviklingsmodus.</b> Publisering krever Live-modus:
            gå til <a className="underline font-semibold" href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a> → velg appen → øverst: bytt «App Mode» fra <i>Development</i> til <i>Live</i> (krever at personvern-URL er satt: https://digihome.no/personvern). Forhåndsvisning og AI fungerer uansett.
          </div>
        </div>
      ) : null}

      {view === 'mine' ? (
        <MyAds ads={myAds} busy={adsBusy} onRefresh={loadMyAds} onToggle={toggleAdState} />
      ) : created ? (
        <div className={`${card} p-10 text-center`} data-testid="adstudio-success">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
          <h3 className="mt-3 text-[18px] font-black text-[#111]">Annonsen er opprettet — pauset</h3>
          <p className="mt-1.5 text-[13px] text-[#777] max-w-md mx-auto">Meta kjører nå sin automatiske gjennomgang (minutter til få timer). Aktiver når du er klar — fra «Mine annonser» eller Ads Manager.</p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => { setView('mine'); loadMyAds(); }} className={btnPrimary}><LayoutList size={14} /> Mine annonser</button>
            <button onClick={resetWizard} className={btnGhost}><PlusCircle size={14} /> Lag en til</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
          {/* Venstre: veiviseren */}
          <div>
            {/* Stegindikator */}
            <div className="flex items-center gap-1 mb-4" data-testid="adstudio-steps">
              {STEPS.map((s, i) => (
                <React.Fragment key={s}>
                  <button onClick={() => i < step && setStep(i)}
                    className={`flex items-center gap-1.5 rounded-full px-3 h-8 text-[12px] font-bold transition-colors ${i === step ? 'bg-[#0a0a0a] text-white' : i < step ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-[#f3f3f3] text-[#aaa]'}`}>
                    {i < step ? <Check size={12} /> : <span className="text-[10px]">{i + 1}</span>} {s}
                  </button>
                  {i < STEPS.length - 1 ? <ChevronRight size={13} className="text-[#ccc]" /> : null}
                </React.Fragment>
              ))}
            </div>

            <div className={`${card} p-5`}>
              {step === 0 ? (
                <StepPlacement ctx={ctx} adset={adset} setAdset={setAdset} onRefresh={() => loadCtx(true)} />
              ) : step === 1 ? (
                <div data-testid="adstudio-step-media">
                  <h3 className="text-[14px] font-black text-[#111]">Velg bilde</h3>
                  <p className="text-[12px] text-[#999] mt-0.5">Kvadratisk (1:1) fungerer best i Feed. Vi optimaliserer automatisk.</p>
                  <div className="grid sm:grid-cols-2 gap-4 mt-4">
                    {/* Opplasting */}
                    <div className="rounded-2xl border-2 border-dashed border-[#e5e5e5] p-5 text-center hover:border-[#c99df0] transition-colors cursor-pointer"
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); uploadFile(e.dataTransfer.files?.[0]); }}
                      data-testid="adstudio-upload-zone">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => uploadFile(e.target.files?.[0])} />
                      {mediaBusy === 'upload' ? <Loader2 size={22} className="mx-auto animate-spin text-[#a052e0]" /> : <Upload size={22} className="mx-auto text-[#bbb]" />}
                      <p className="mt-2 text-[12.5px] font-bold text-[#333]">Last opp bilde</p>
                      <p className="text-[11px] text-[#aaa]">Dra hit eller klikk · JPG/PNG</p>
                    </div>
                    {/* AI-generering */}
                    <div className="rounded-2xl border border-[#e9dcf7] bg-gradient-to-b from-[#faf5ff] to-white p-4" data-testid="adstudio-ai-panel">
                      <p className="text-[12px] font-bold text-[#111] flex items-center gap-1.5"><Sparkles size={12} className="text-[#a052e0]" /> Generer med AI <span className="ml-auto text-[9px] font-bold uppercase text-[#a052e0] bg-[#f0e4fb] rounded-full px-1.5 py-0.5">Nano Banana Pro</span></p>
                      <textarea value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={2} placeholder="F.eks. «Fornøyd boligeier med kaffekopp foran vindu med utsikt over Bergen»" className={`${input} mt-2 resize-none text-[12px]`} />
                      <div className="flex gap-1.5 mt-2">
                        {[['foto', 'Foto'], ['illustrasjon', 'Illustrasjon'], ['minimal', 'Minimal']].map(([k, l]) => (
                          <button key={k} onClick={() => setAiStyle(k)} className={`flex-1 h-[26px] rounded-lg text-[11px] font-semibold ${aiStyle === k ? 'bg-[#0a0a0a] text-white' : 'bg-white border border-[#e8e8e8] text-[#888]'}`}>{l}</button>
                        ))}
                      </div>
                      <button onClick={generateAiImage} disabled={mediaBusy !== '' || !aiPrompt.trim()} className={`${btnPrimary} w-full mt-2.5 h-9`} data-testid="adstudio-ai-generate">
                        {mediaBusy === 'ai' ? <><Loader2 size={13} className="animate-spin" /> Genererer … (30–60 s)</> : <><ImageIcon size={13} /> Generer bilde</>}
                      </button>
                    </div>
                  </div>
                  {media ? (
                    <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3" data-testid="adstudio-media-ok">
                      <img src={media.url} alt="" className="h-16 w-16 rounded-lg object-cover" />
                      <div className="text-[12px]">
                        <p className="font-bold text-emerald-800 flex items-center gap-1"><CheckCircle2 size={13} /> Lastet opp til Metas bildebibliotek</p>
                        <p className="text-emerald-700/70">{media.width}×{media.height} px · hash {String(media.hash).slice(0, 12)}…</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : step === 2 ? (
                <div data-testid="adstudio-step-copy">
                  <h3 className="text-[14px] font-black text-[#111]">Tekst — med AI-tekstverksted</h3>
                  <label className={label}>Destinasjon</label>
                  <select value={link} onChange={(e) => setLink(e.target.value)} className={input} data-testid="adstudio-link">
                    {LINKS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                  </select>
                  <label className={label}>Brief til AI-en — hva skal annonsen si?</label>
                  <div className="flex gap-2">
                    <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} placeholder="F.eks. «Nå boligeiere i Bergen som er lei av leietaker-mas. Fremhev gratis leievurdering på 60 sekunder.»" className={`${input} resize-none`} data-testid="adstudio-brief" />
                  </div>
                  <button onClick={generateCopy} disabled={copyBusy || !brief.trim()} className={`${btnPrimary} mt-2.5`} data-testid="adstudio-gen-copy">
                    {copyBusy ? <><Loader2 size={13} className="animate-spin" /> Skriver 4 vinkler …</> : <><Sparkles size={13} /> Generer tekstpakke</>}
                  </button>

                  {pkg ? (
                    <div className="mt-4" data-testid="adstudio-pkg">
                      <label className={label}>Primærtekst — velg vinkel</label>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {(pkg.primaryTexts || []).map((t, i) => (
                          <button key={i} onClick={() => setMessage(t.text)} className={`rounded-xl border p-3 text-left transition-colors ${message === t.text ? 'border-[#a052e0] bg-[#faf5ff]' : 'border-[#eee] hover:border-[#ccc]'}`}>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-[#a052e0]">{t.angle}</span>
                            <p className="text-[12px] text-[#333] mt-1 line-clamp-3 whitespace-pre-line">{t.text}</p>
                          </button>
                        ))}
                      </div>
                      <label className={label}>Overskrift (maks 40 tegn)</label>
                      <div className="flex flex-wrap gap-1.5 mb-1.5">
                        {(pkg.headlines || []).map((h, i) => (
                          <button key={i} onClick={() => setHeadline(h)} className={`rounded-full px-2.5 h-7 text-[11.5px] font-semibold border ${headline === h ? 'border-[#a052e0] bg-[#faf5ff] text-[#7A3EC8]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}>{h}</button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <label className={label}>Primærtekst (redigerbar)</label>
                  <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={`${input} resize-none`} data-testid="adstudio-message" />
                  <p className="text-[10.5px] text-[#aaa] mt-1">{message.length} tegn — de første ~125 vises alltid</p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Overskrift</label>
                      <input value={headline} onChange={(e) => setHeadline(e.target.value)} maxLength={60} className={input} data-testid="adstudio-headline" />
                    </div>
                    <div>
                      <label className={label}>Beskrivelse (valgfri)</label>
                      <input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={60} className={input} />
                    </div>
                  </div>
                  <label className={label}>Knapp (CTA)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {CTAS.map((c) => (
                      <button key={c.v} onClick={() => setCta(c.v)} className={`rounded-full px-3 h-8 text-[12px] font-bold border ${cta === c.v ? 'bg-[#0a0a0a] text-white border-[#0a0a0a]' : 'border-[#e5e5e5] text-[#777] hover:border-[#bbb]'}`}>{c.l}</button>
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
                    {['Desktop Feed', 'Mobil Feed', 'Instagram'].map((t, i) => (
                      <button key={t} onClick={() => setPreviewTab(i)} className={`rounded-full px-3 h-8 text-[12px] font-bold ${previewTab === i ? 'bg-[#0a0a0a] text-white' : 'bg-[#f3f3f3] text-[#888]'}`}>{t}</button>
                    ))}
                  </div>
                  <div className="mt-3 rounded-xl border border-[#eee] bg-[#f7f7f7] p-3 min-h-[420px] flex items-center justify-center overflow-auto">
                    {previewBusy ? <Loader2 className="animate-spin text-[#a052e0]" size={22} /> :
                      previews && previews[previewTab] && previews[previewTab].html ? (
                        <div className="[&_iframe]:mx-auto" dangerouslySetInnerHTML={{ __html: previews[previewTab].html }} />
                      ) : <p className="text-[12px] text-[#999]">{previews && previews[previewTab] && previews[previewTab].error ? previews[previewTab].error : 'Ingen forhåndsvisning ennå'}</p>}
                  </div>
                  <p className="text-[11px] text-[#aaa] mt-2 flex items-center gap-1"><ShieldCheck size={12} /> UTM-sporing legges på automatisk: utm_source=facebook · utm_campaign=kampanjenavn · utm_content=annonsenavn</p>
                </div>
              ) : (
                <div data-testid="adstudio-step-publish">
                  <h3 className="text-[14px] font-black text-[#111]">Publiser — trygt og pauset</h3>
                  <label className={label}>Annonsenavn (internt i Meta)</label>
                  <input value={adName} onChange={(e) => setAdName(e.target.value)} placeholder={autoName()} className={input} data-testid="adstudio-adname" />
                  <div className="mt-4 rounded-xl border border-[#eee] p-4 text-[12.5px] text-[#555] space-y-1.5">
                    <p><b className="text-[#111]">Plassering:</b> {adset?.campaignName} → {adset?.name}</p>
                    <p><b className="text-[#111]">Destinasjon:</b> {link}</p>
                    <p><b className="text-[#111]">Overskrift:</b> {headline}</p>
                    <p><b className="text-[#111]">CTA:</b> {ctaLabel(cta)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button onClick={validate} disabled={valState === 'busy'} className={btnGhost} data-testid="adstudio-validate">
                      {valState === 'busy' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={14} />} Kjør Metas validering
                    </button>
                    {valState === 'ok' ? <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-600"><CheckCircle2 size={13} /> Godkjent av Metas validering</span> : null}
                    {valState.startsWith('feil:') ? <span className="text-[12px] font-semibold text-rose-500">{valState.slice(5)}</span> : null}
                  </div>
                  <button onClick={publish} disabled={pubBusy} className={`${btnPrimary} w-full mt-4 h-11`} data-testid="adstudio-publish">
                    {pubBusy ? <><Loader2 size={14} className="animate-spin" /> Oppretter …</> : <><Megaphone size={14} /> Opprett annonse (pauset)</>}
                  </button>
                  <p className="text-[11px] text-[#aaa] mt-2 text-center">Ingenting går live før du selv aktiverer den.</p>
                </div>
              )}

              {err && !appModeError ? <p className="mt-3 text-[12px] font-semibold text-rose-500" data-testid="adstudio-err">{err}</p> : null}

              {/* Navigasjon */}
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
            </div>
          </div>

          {/* Høyre: levende mockup */}
          <div className="hidden xl:block">
            <div className="sticky top-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#999] mb-2">Live utkast</p>
              <FeedMockup pageName={ctx.page?.name || 'DigiHome'} message={message} headline={headline} description={description} cta={ctaLabel(cta)} imageUrl={media?.url} link={link} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------- Steg 1: kampanje + annonsesett --------------------- */
function StepPlacement({ ctx, adset, setAdset, onRefresh }) {
  return (
    <div data-testid="adstudio-step-placement">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-black text-[#111]">Hvor skal annonsen bo?</h3>
          <p className="text-[12px] text-[#999] mt-0.5">Velg annonsesett — annonsen arver targeting og budsjett derfra. Aktive leads-kampanjer anbefales.</p>
        </div>
        <button onClick={onRefresh} className="text-[#999] hover:text-[#555]"><RefreshCw size={14} /></button>
      </div>
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
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${adset?.id === s.id ? 'border-[#a052e0] bg-[#faf5ff]' : 'border-[#f0f0f0] hover:border-[#ddd]'}`}>
                  <div>
                    <p className="text-[12px] font-semibold text-[#333]">{s.name}</p>
                    <p className="text-[10.5px] text-[#999]">{s.status} {s.dailyBudget ? `· ${nf.format(s.dailyBudget)} kr/dag` : ''} {s.geo ? `· ${s.geo}` : ''} {s.age ? `· ${s.age} år` : ''}</p>
                  </div>
                  {adset?.id === s.id ? <CheckCircle2 size={16} className="text-[#a052e0]" /> : null}
                </button>
              ))}
              {!c.adsets?.length ? <p className="text-[11px] text-[#bbb] italic">Ingen annonsesett</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------- Facebook Feed-mockup ---------------------------- */
function FeedMockup({ pageName, message, headline, description, cta, imageUrl, link }) {
  let host = 'digihome.no';
  try { host = new URL(link).hostname; } catch (e) {}
  return (
    <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-sm overflow-hidden" data-testid="adstudio-mockup" style={{ width: 340 }}>
      <div className="flex items-center gap-2.5 px-3.5 pt-3">
        <div className="h-9 w-9 rounded-full bg-[#0a0a0a] text-white flex items-center justify-center text-[13px] font-black">D</div>
        <div>
          <p className="text-[12.5px] font-bold text-[#111] leading-tight">{pageName}</p>
          <p className="text-[10px] text-[#999]">Sponset · <Globe size={9} className="inline -mt-0.5" /></p>
        </div>
      </div>
      <p className="px-3.5 py-2.5 text-[12.5px] text-[#222] leading-snug whitespace-pre-line">{message || 'Primærteksten din vises her …'}</p>
      <div className="bg-[#f2f2f2] aspect-square w-full overflow-hidden">
        {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : (
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

/* ------------------------------ Mine annonser ------------------------------ */
function MyAds({ ads, busy, onRefresh, onToggle }) {
  if (!ads) return <div className="flex justify-center py-16 text-[#999]"><Loader2 className="animate-spin" size={18} /></div>;
  return (
    <div className={`${card} overflow-hidden`} data-testid="adstudio-myads">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0]">
        <p className="text-[13px] font-black text-[#111]">Annonser laget i studioet</p>
        <button onClick={onRefresh} className="text-[#999] hover:text-[#555]"><RefreshCw size={14} className={busy ? 'animate-spin' : ''} /></button>
      </div>
      {!ads.length ? (
        <p className="px-5 py-10 text-center text-[12.5px] text-[#999]">Ingen ennå — lag din første med «Ny annonse»</p>
      ) : (
        <div className="divide-y divide-[#f5f5f5]">
          {ads.map((a) => {
            const live = a.live || {};
            const active = live.status === 'ACTIVE';
            return (
              <div key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                {a.imageUrl ? <img src={a.imageUrl} alt="" className="h-11 w-11 rounded-lg object-cover" /> : <div className="h-11 w-11 rounded-lg bg-[#f3f3f3] flex items-center justify-center text-[#ccc]"><ImageIcon size={16} /></div>}
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-bold text-[#222] truncate">{a.adName}</p>
                  <p className="text-[10.5px] text-[#999]">{a.headline} · {new Date(a.createdAt).toLocaleDateString('nb-NO')}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${active ? 'bg-emerald-50 text-emerald-700' : live.status === 'PAUSED' || live.status === 'ADSET_PAUSED' || live.status === 'CAMPAIGN_PAUSED' ? 'bg-amber-50 text-amber-700' : 'bg-[#f3f3f3] text-[#999]'}`}>{live.status || a.status}</span>
                <div className="flex items-center gap-4 text-[11px] text-[#777]">
                  <span className="flex items-center gap-1"><Coins size={12} /> {nf.format(Math.round(live.spend || 0))} kr</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {nf.format(live.impressions || 0)}</span>
                  <span className="flex items-center gap-1"><MousePointerClick size={12} /> {nf.format(live.clicks || 0)}</span>
                  <span className="flex items-center gap-1 font-bold text-[#111]">{nf.format(live.leads || 0)} leads</span>
                </div>
                <button onClick={() => onToggle(a.metaAdId, live.status)} className={`inline-flex items-center gap-1.5 rounded-lg px-3 h-8 text-[11.5px] font-bold border transition-colors ${active ? 'border-amber-200 text-amber-700 hover:bg-amber-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`} data-testid={`adstudio-toggle-${a.metaAdId}`}>
                  {active ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Aktiver</>}
                </button>
                <a href={`https://adsmanager.facebook.com/adsmanager/manage/ads?act=${''}`} target="_blank" rel="noreferrer" className="text-[#bbb] hover:text-[#555]"><ExternalLink size={13} /></a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
