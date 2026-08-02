'use client';

/*
 * EditorBlocks — byggeklossene i nyhetsbrev-editoren.
 * WYSIWYG-canvas (ser ut som e-posten) + kontekst-inspektør + bildeopplasting.
 */

import React, { useEffect, useRef, useState } from 'react';
import { sortDistrictGroups } from '@/lib/geo-bergen';
import {
  Type, AlignLeft, Image as ImageIcon, MousePointerClick, LayoutPanelTop,
  List, Quote, UserRound, PenLine, Minus, MoveVertical, BadgePercent,
  ArrowUp, ArrowDown, Copy, Trash2, UploadCloud, Loader2, GripVertical, Sparkles,
  Home, Check, RefreshCw, TrendingUp, Search, X,
} from 'lucide-react';

/* --------------------------- Deploy-sikre bilder -------------------------- */
// /public-filer følger ikke alltid prod-bygget — rot-relative stier serveres
// derfor via /api/media/<sti> (objektlagring). ?v=2 buster en tidligere
// CDN-cachet 404 (nyhetsbrev-hero-hendelsen 5. juli).
export function mediaSrc(u) {
  const s = String(u || '').trim();
  if (!s || /^(https?:|data:|blob:)/i.test(s)) return s;
  if (s.startsWith('/api/')) return s;
  const p = s.startsWith('/') ? s : `/${s}`;
  return `/api/media${p}${p.includes('?') ? '&' : '?'}v=2`;
}

/* ------------------------------- Palett ---------------------------------- */
export const PALETTE = [
  { type: 'heading',   label: 'Overskrift',   icon: Type },
  { type: 'text',      label: 'Tekst',        icon: AlignLeft },
  { type: 'hero',      label: 'Hero-bilde',   icon: LayoutPanelTop },
  { type: 'image',     label: 'Bilde',        icon: ImageIcon },
  { type: 'properties', label: 'Boliger',     icon: Home },
  { type: 'offer',     label: 'Tilbudskort',  icon: BadgePercent },
  { type: 'stat',      label: 'Markedsinnsikt', icon: TrendingUp },
  { type: 'button',    label: 'Knapp',        icon: MousePointerClick },
  { type: 'cta-card',  label: 'CTA-kort',     icon: Sparkles },
  { type: 'bullets',   label: 'Punktliste',   icon: List },
  { type: 'quote',     label: 'Sitat',        icon: Quote },
  { type: 'sender',    label: 'Avsenderkort', icon: UserRound },
  { type: 'signature', label: 'Signatur',     icon: PenLine },
  { type: 'divider',   label: 'Skillelinje',  icon: Minus },
  { type: 'spacer',    label: 'Luft',         icon: MoveVertical },
];

export function defaultsFor(type) {
  switch (type) {
    case 'heading':  return { text: 'En overskrift som fanger' };
    case 'text':     return { text: 'Skriv innholdet ditt her. Bruk {{first_name}} for å flette inn fornavn.' };
    case 'bullets':  return { items: ['Første punkt'] };
    case 'button':   return { label: 'Les mer', url: 'https://digihome.no' };
    case 'cta-card': return { title: 'Er du interessert?', text: '', label: 'Ja, jeg er interessert', url: 'https://digihome.no/bli-utleier', footnote: '' };
    case 'offer':    return { eyebrow: 'Sommerkampanje · Begrenset periode', big: '10 %', was: 'Normalt 15 %', bigLabel: 'forvaltningshonorar — alt inkludert', second: '', items: [
      { title: 'Oppstartskostnad', was: '', now: '0 kr' },
      { title: 'Første visning', was: '625 kr', now: 'Gratis' },
      { title: 'Markedspakke', was: '2 490 kr', now: '1 245 kr (−50 %)' },
    ], deadline: 'Gjelder alle som registrerer seg innen 10. juli', label: 'Ja, jeg vil vite mer', url: 'https://digihome.no/sommer', footnote: 'Normalpriser inkl. mva. Uforpliktende — vi tar kontakt.' };
    case 'sender':   return { name: 'Sarah Sleeman', title: 'Daglig leder, DigiHome', note: '', photoUrl: '/sarah-sleeman.jpg' };
    case 'stat':     return {
      eyebrow: 'Markedsinnsikt',
      title: 'Leieprisene fortsetter å stige',
      stats: [
        { value: '+5,1 %', label: 'Norge — siste 12 mnd' },
        { value: '2×', label: 'Bergen vokser dobbelt så raskt' },
      ],
      text: 'Husleiebarometeret for 2. kvartal 2026 viser at leieprisene steg 5,1 prosent nasjonalt det siste året — i Bergen er veksten mer enn dobbelt så høy. For deg som utleier betyr det at riktig prissetting aldri har vært viktigere.',
      source: 'Kilde: Husleiebarometeret Q2 2026 — Hybel AS / Menon Economics',
      sourceUrl: '',
      imageUrl: '',
      height: null, fit: 'cover', focalX: 50, focalY: 50,
    };
    case 'signature': return { name: 'Sarah Sleeman', title: 'Daglig leder — DigiHome, Bergen' };
    case 'spacer':   return { size: 'm' };
    case 'hero':     return { url: '', alt: '', height: null, fit: 'cover', focalX: 50, focalY: 50 };
    case 'image':    return { url: '', alt: '', height: null, fit: 'cover', focalX: 50, focalY: 50 };
    case 'properties': return { title: 'Ledige boliger i Bergen', items: [], cta: '', url: '', grouping: 'auto', groupingThreshold: 6, groupOrder: 'auto' };
    default:         return {};
  }
}

/* --------------------------- Små hjelpere --------------------------------- */
export function AutoArea({ value, onChange, placeholder, className, style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }
  }, [value]);
  return (
    <textarea ref={ref} value={value || ''} onChange={onChange} placeholder={placeholder} rows={1}
      className={`w-full resize-none bg-transparent outline-none overflow-hidden ${className || ''}`} style={style} />
  );
}

const inputCls = 'w-full h-[36px] rounded-lg border border-[#e8e8e8] bg-white px-3 text-[13px] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]';
const labelCls = 'text-[11px] font-semibold text-[#777] block mb-1.5 mt-4 first:mt-0';

/* --------------------- Bildeopplasting (drag & drop) ---------------------- */
export function DropImage({ onUpload, uploading, compact = false, label = 'Slipp et bilde her — eller klikk for å laste opp' }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  const handleFiles = (files) => {
    const f = files && files[0];
    if (f && f.type.startsWith('image/')) onUpload(f);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); handleFiles(e.dataTransfer.files); }}
      onClick={() => fileRef.current?.click()}
      data-testid="nl-drop-image"
      className={`cursor-pointer rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all ${compact ? 'py-5 px-4' : 'py-10 px-6'} ${over ? 'border-[#a052e0] bg-[#faf5ff]' : 'border-[#e2dcea] bg-[#fbfaf9] hover:border-[#c99df0]'}`}
    >
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
      {uploading ? (
        <><Loader2 size={22} className="animate-spin text-[#a052e0]" /><p className="text-[12px] text-[#888] mt-2">Laster opp…</p></>
      ) : (
        <><UploadCloud size={22} className={over ? 'text-[#a052e0]' : 'text-[#b7a8c9]'} />
        <p className="text-[12.5px] font-medium text-[#666] mt-2">{label}</p>
        <p className="text-[11px] text-[#aaa] mt-1">JPG, PNG eller WebP · optimaliseres automatisk for e-post</p></>
      )}
    </div>
  );
}

/* ------------------- AI-bildegenerering (Nano Banana Pro) ----------------- */
function AIImagePanel({ b, onPatch, blocks, apiQ }) {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('foto');
  const [genState, setGenState] = useState('idle');       // idle | suggesting | generating
  const [err, setErr] = useState('');

  const suggest = async () => {
    setGenState('suggesting'); setErr('');
    try {
      const r = await fetch(`/api/admin/newsletter/genimage?${apiQ}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true, suggestOnly: true, blocks: (blocks || []).map(({ id, ...rest }) => rest) }),
      });
      const j = await r.json();
      if (j.ok && j.prompt) setPrompt(j.prompt);
      else setErr(j.error || 'Kunne ikke foreslå prompt');
    } catch (e) { setErr('Kunne ikke foreslå prompt — prøv igjen'); }
    setGenState('idle');
  };

  const generate = async () => {
    if (!prompt.trim() || genState !== 'idle') return;
    setGenState('generating'); setErr('');
    try {
      const r = await fetch(`/api/admin/newsletter/genimage?${apiQ}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), style }),
      });
      const j = await r.json();
      if (j.ok && j.url) {
        onPatch({ url: j.url, ...(b.alt ? {} : { alt: prompt.trim().slice(0, 120) }) });
      } else setErr(j.error || 'Bildegenerering feilet — prøv igjen');
    } catch (e) { setErr('Bildegenerering feilet — prøv igjen'); }
    setGenState('idle');
  };

  const busy = genState !== 'idle';
  return (
    <div className="mt-4 rounded-2xl border border-[#e9dcf7] bg-gradient-to-b from-[#faf5ff] to-white p-3.5" data-testid="nl-ai-image-panel">
      <div className="flex items-center justify-between">
        <p className="text-[12px] font-bold text-[#111] flex items-center gap-1.5">
          <Sparkles size={13} className="text-[#a052e0]" /> Lag bilde med AI
        </p>
        <span className="text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#a052e0] bg-[#f0e4fb] rounded-full px-2 py-0.5">Nano Banana Pro</span>
      </div>
      <textarea
        value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} data-testid="nl-ai-image-prompt"
        placeholder="Beskriv bildet… f.eks. «Moderne stue i bergensleilighet med utsikt mot Bryggen, kveldslys»"
        className="mt-2.5 w-full resize-none rounded-lg border border-[#e8e8e8] bg-white px-3 py-2 text-[12.5px] leading-[1.5] outline-none focus:border-[#c99df0] focus:ring-2 focus:ring-[#f0e4fb]" />
      <button onClick={suggest} disabled={busy} data-testid="nl-ai-image-suggest"
        className="flex items-center gap-1 text-[11px] font-bold text-[#a052e0] hover:text-[#7A3EC8] disabled:opacity-50 mt-1">
        {genState === 'suggesting' ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
        {genState === 'suggesting' ? 'AI leser nyhetsbrevet…' : 'Foreslå prompt fra innholdet'}
      </button>
      <label className={labelCls}>Stil</label>
      <div className="flex gap-1.5" data-testid="nl-ai-image-style">
        {[['foto', 'Foto'], ['illustrasjon', 'Illustrasjon'], ['minimal', 'Minimal']].map(([k, l]) => (
          <button key={k} onClick={() => setStyle(k)} disabled={busy}
            className={`flex-1 h-[30px] rounded-lg text-[11.5px] font-semibold transition-colors ${style === k ? 'bg-[#0a0a0a] text-white' : 'bg-white border border-[#e8e8e8] text-[#777] hover:border-[#c99df0]'}`}>{l}</button>
        ))}
      </div>
      <button onClick={generate} disabled={busy || !prompt.trim()} data-testid="nl-ai-image-generate"
        className="mt-3 w-full h-[38px] rounded-xl bg-[#0a0a0a] text-white text-[12.5px] font-bold flex items-center justify-center gap-2 hover:bg-[#222] disabled:opacity-40 transition-colors">
        {genState === 'generating' ? <><Loader2 size={13} className="animate-spin" /> Genererer bilde…</> : <><ImageIcon size={13} /> Generer bilde</>}
      </button>
      {genState === 'generating' ? (
        <p className="text-[10.5px] text-[#a052e0] mt-1.5 text-center">Kan ta 30–60 sekunder — bildet settes inn automatisk</p>
      ) : null}
      {err ? <p className="text-[11px] text-red-500 mt-1.5">{err}</p> : null}
      <p className="text-[10.5px] text-[#aaa] mt-1.5">Bildet optimaliseres automatisk for e-post (JPEG, 1200 px bredt).</p>
    </div>
  );
}

/* -------- Bilde med «bytt»-overlay + dra-håndtak for høyde + fokuspunkt --- */
function ImageWithSwap({ src, alt, onUpload, uploading, rounded = 'rounded-xl', height, fit, onResize, focalX, focalY, onFocal }) {
  const [over, setOver] = useState(false);
  const [dragH, setDragH] = useState(null); // live-høyde under draing
  const [dragF, setDragF] = useState(null); // live-fokuspunkt under draing
  const fileRef = useRef(null);
  const imgRef = useRef(null);
  const boxRef = useRef(null);

  const startResize = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startH = Number(height) > 0 ? Number(height) : (imgRef.current ? imgRef.current.clientHeight : 300);
    const startY = e.clientY;
    setDragH(startH);
    const move = (ev) => {
      const h = Math.max(60, Math.min(900, Math.round(startH + (ev.clientY - startY))));
      setDragH(h);
    };
    const up = (ev) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const h = Math.max(60, Math.min(900, Math.round(startH + (ev.clientY - startY))));
      setDragH(null);
      onResize && onResize(h);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  // Fokuspunkt: dra den lilla prikken dit motivet skal ankres (object-position)
  const startFocal = (e) => {
    e.preventDefault(); e.stopPropagation();
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const calc = (ev) => ({
      x: Math.max(0, Math.min(100, Math.round(((ev.clientX - rect.left) / rect.width) * 100))),
      y: Math.max(0, Math.min(100, Math.round(((ev.clientY - rect.top) / rect.height) * 100))),
    });
    setDragF(calc(e));
    const move = (ev) => setDragF(calc(ev));
    const up = (ev) => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      const p = calc(ev);
      setDragF(null);
      onFocal && onFocal(p.x, p.y);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const h = dragH != null ? dragH : (Number(height) > 0 ? Number(height) : null);
  const fx = dragF ? dragF.x : (Number.isFinite(Number(focalX)) ? Number(focalX) : 50);
  const fy = dragF ? dragF.y : (Number.isFinite(Number(focalY)) ? Number(focalY) : 50);
  return (
    <div ref={boxRef} className={`relative group/img overflow-hidden ${rounded}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) onUpload(f); }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      <img ref={imgRef} src={mediaSrc(src)} alt={alt || ''} className="w-full block"
        style={{ opacity: uploading ? 0.5 : 1, height: h ? `${h}px` : 'auto', objectFit: h ? (fit || 'cover') : undefined, objectPosition: h ? `${fx}% ${fy}%` : undefined }} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[12.5px] font-semibold gap-2 transition-opacity ${over ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'}`}>
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={15} />} Bytt bilde
      </button>
      {onResize ? (
        <div onMouseDown={startResize} data-testid="nl-img-resize"
          className={`absolute bottom-0 inset-x-0 h-[16px] z-10 cursor-ns-resize flex items-end justify-center transition-opacity ${dragH != null ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'}`}
          title="Dra for å endre høyde">
          <div className="mb-[4px] w-12 h-[5px] rounded-full bg-white shadow-md border border-black/10" />
        </div>
      ) : null}
      {onFocal && h ? (
        <div onMouseDown={startFocal} data-testid="nl-img-focal"
          className={`absolute z-10 w-[24px] h-[24px] -ml-[12px] -mt-[12px] rounded-full border-2 border-white shadow-lg cursor-move transition-opacity ${dragF ? 'opacity-100 scale-110' : 'opacity-0 group-hover/img:opacity-100'}`}
          style={{ left: `${fx}%`, top: `${fy}%`, background: 'rgba(160,82,224,0.9)' }}
          title="Fokuspunkt — dra prikken dit motivet skal være i fokus">
          <span className="absolute inset-[7px] rounded-full bg-white pointer-events-none" />
        </div>
      ) : null}
      {dragH != null ? (
        <span className="absolute top-2 left-2 z-10 rounded-md bg-black/75 text-white text-[11px] font-semibold px-2 py-0.5">{dragH}px · {fit || 'cover'}</span>
      ) : dragF != null ? (
        <span className="absolute top-2 left-2 z-10 rounded-md bg-black/75 text-white text-[11px] font-semibold px-2 py-0.5">Fokus {dragF.x} % / {dragF.y} %</span>
      ) : null}
    </div>
  );
}

/* --------------------------- Canvas-blokk --------------------------------- */
export function CanvasBlock({ b, i, total, accent, selected, onSelect, onPatch, onMove, onDup, onDel, onUploadImage, uploadingId, onDragStartBlock, onDragOverBlock, onDropBlock }) {
  const uploading = uploadingId === b.id;
  const upload = (file) => onUploadImage(b.id, file);
  const stop = (e) => e.stopPropagation();

  const inner = () => {
    switch (b.type) {
      case 'heading':
        return <AutoArea value={b.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Overskrift…"
          className="text-[24px] font-bold tracking-[-0.02em] leading-[1.25] text-[#111]" />;
      case 'text':
        return <AutoArea value={b.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Skriv tekst… ({{first_name}} fletter inn fornavn)"
          className="text-[14.5px] leading-[1.7] text-[#444]" />;
      case 'bullets':
        return (
          <div className="space-y-1.5">
            {(b.items || []).map((it, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className="mt-[5px] w-[19px] h-[19px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-extrabold" style={{ background: 'var(--nl-soft, #f5edfc)', color: 'var(--nl-deep, #7A3EC8)' }}>✓</span>
                <AutoArea value={it} onChange={(e) => { const items = [...b.items]; items[idx] = e.target.value; onPatch({ items }); }}
                  placeholder="Punkt…" className="text-[14px] leading-[1.7] text-[#444]" />
                <button onClick={(e) => { stop(e); onPatch({ items: b.items.filter((_, k) => k !== idx) }); }}
                  className="text-[#ccc] hover:text-red-500 mt-1"><Trash2 size={13} /></button>
              </div>
            ))}
            <button onClick={(e) => { stop(e); onPatch({ items: [...(b.items || []), ''] }); }}
              className="text-[12px] font-medium text-[#a052e0] hover:underline mt-1">+ Legg til punkt</button>
          </div>
        );
      case 'image':
        return b.url
          ? <ImageWithSwap src={b.url} alt={b.alt} onUpload={upload} uploading={uploading}
              height={b.height} fit={b.fit} onResize={(h) => onPatch({ height: h })}
              focalX={b.focalX} focalY={b.focalY} onFocal={(x, y) => onPatch({ focalX: x, focalY: y })} />
          : <DropImage onUpload={upload} uploading={uploading} compact />;
      case 'hero':
        return b.url
          ? <ImageWithSwap src={b.url} alt={b.alt} onUpload={upload} uploading={uploading} rounded="rounded-none"
              height={b.height} fit={b.fit} onResize={(h) => onPatch({ height: h })}
              focalX={b.focalX} focalY={b.focalY} onFocal={(x, y) => onPatch({ focalX: x, focalY: y })} />
          : <DropImage onUpload={upload} uploading={uploading} label="Slipp hero-bildet her — vises i full bredde øverst" />;
      case 'properties': {
        const items = b.items || [];
        const threshold = Math.max(2, Number(b.groupingThreshold) || 6);
        const shouldGroup = b.grouping === 'always' || (b.grouping !== 'off' && items.length >= threshold);
        const groups = shouldGroup
          ? sortDistrictGroups(Object.entries(items.reduce((acc, item) => { const key = item.district || 'Andre områder'; (acc[key] ||= []).push(item); return acc; }, {})))
          : [['', items]];
        return (
          <div>
            <AutoArea value={b.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Tittel (f.eks. Ledige boliger i Bergen)…"
              className="text-[19px] font-bold tracking-[-0.01em] leading-[1.3] text-[#111]" />
            {items.length ? (
              <div className="space-y-5 mt-3">
                {groups.map(([district, groupItems]) => (
                  <div key={district || 'all'}>
                    {district ? (
                      <div className="mb-2.5 flex items-center justify-between border-b border-[#eee9f3] pb-2">
                        <p className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-[#7A3EC8]">{district}</p>
                        <span className="rounded-full bg-[#f5edfc] px-2.5 py-1 text-[10.5px] font-bold text-[#8b5cf6]">{groupItems.length} {groupItems.length === 1 ? 'bolig' : 'boliger'}</span>
                      </div>
                    ) : null}
                    <div className="space-y-3">
                      {groupItems.map((p, idx) => (
                        <div key={p.pid || idx} className="rounded-[18px] border border-[#ece8e2] bg-white overflow-hidden sm:flex">
                          {p.image
                            ? <img src={mediaSrc(p.image)} alt="" className="w-full sm:w-[190px] h-[150px] object-cover block shrink-0" />
                            : <div className="w-full sm:w-[190px] h-[150px] bg-[#f4f2ef] flex items-center justify-center shrink-0"><Home size={20} className="text-[#cbc4ba]" /></div>}
                          <div className="px-4 py-4 flex-1 min-w-0">
                            <p className="text-[14.5px] font-bold text-[#111] leading-[1.35]">{p.title}</p>
                            {p.meta ? <p className="text-[11.5px] text-[#888] mt-1.5">{p.meta}</p> : null}
                            {p.band ? <p className="text-[13px] font-bold text-[#111] mt-2">{p.band}</p> : null}
                            <span className="inline-flex mt-3 rounded-full px-4 py-2 text-[11.5px] font-bold" style={{ background: 'var(--nl-soft, #f5edfc)', color: 'var(--nl-deep, #7A3EC8)' }}>Se bolig og meld interesse →</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-[#e2dcea] bg-[#fbfaf9] py-8 text-center mt-2" data-testid="nl-properties-empty">
                <Home size={20} className="mx-auto text-[#b7a8c9]" />
                <p className="text-[12.5px] font-medium text-[#666] mt-2">Ingen boliger valgt ennå</p>
                <p className="text-[11px] text-[#aaa] mt-1">Velg boliger i panelet til høyre →</p>
              </div>
            )}
            {b.cta ? <p className="text-center text-[12.5px] font-bold mt-3" style={{ color: '#7A3EC8' }}>{b.cta} →</p> : null}
          </div>
        );
      }
      case 'button':
        return (
          <div className="text-center py-1">
            <span className="inline-block max-w-[94%] rounded-full px-7 py-3" style={{ background: '#0a0a0a' }}>
              <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} onClick={stop}
                className="bg-transparent text-white text-[14px] font-semibold text-center outline-none max-w-full"
                style={{ width: `${Math.min(36, Math.max(14, (b.label || '').length + 3))}ch` }} placeholder="Knappetekst…" />
            </span>
          </div>
        );
      case 'cta-card':
        return (
          <div className="rounded-2xl px-6 py-6 text-center" style={{ background: `${accent}14`, border: `1px solid ${accent}33` }}>
            <AutoArea value={b.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Tittel…"
              className="text-[19px] font-bold tracking-[-0.01em] text-[#111] text-center" />
            <AutoArea value={b.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Kort tekst (valgfritt)…"
              className="text-[13.5px] leading-[1.6] text-[#555] text-center mt-1" />
            <span className="inline-block max-w-[94%] rounded-full px-6 py-2.5 mt-3" style={{ background: '#0a0a0a' }}>
              <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} onClick={stop}
                className="bg-transparent text-white text-[13px] font-semibold text-center outline-none max-w-full"
                style={{ width: `${Math.min(38, Math.max(14, (b.label || '').length + 3))}ch` }} placeholder="Knappetekst…" />
            </span>
            {b.footnote !== undefined ? (
              <AutoArea value={b.footnote} onChange={(e) => onPatch({ footnote: e.target.value })} placeholder="Fotnote (valgfritt)…"
                className="text-[11px] text-[#999] text-center mt-2" />
            ) : null}
          </div>
        );
      case 'offer': {
        const items = Array.isArray(b.items) ? b.items : [];
        const patchItem = (i, key, val) => {
          const next = items.map((x, j) => (j === i ? { ...x, [key]: val } : x));
          onPatch({ items: next });
        };
        const removeItem = (i) => onPatch({ items: items.filter((_, j) => j !== i) });
        const addItem = () => onPatch({ items: [...items, { title: '', was: '', now: '' }] });
        return (
          <div className="rounded-[22px] px-7 py-8 text-center" style={{ background: 'linear-gradient(150deg,#17111f 0%,#0a0a0a 52%,#1b1226 100%)' }}>
            <div className="inline-block max-w-full rounded-full border border-white/20 px-4 py-1.5">
              <input value={b.eyebrow || ''} onChange={(e) => onPatch({ eyebrow: e.target.value })} onClick={stop}
                className="bg-transparent text-center text-[10.5px] font-bold uppercase tracking-[0.16em] outline-none max-w-full"
                style={{ color: accent, width: `${Math.min(52, Math.max(18, ((b.eyebrow || '').length * 1.45) + 3))}ch` }} placeholder="EYEBROW-TEKST" />
            </div>
            <input value={b.big || ''} onChange={(e) => onPatch({ big: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[52px] font-extrabold tracking-[-0.03em] text-white outline-none mt-3" placeholder="10 %" />
            <input value={b.was || ''} onChange={(e) => onPatch({ was: e.target.value })} onClick={stop}
              className={`bg-transparent w-full text-center text-[13.5px] text-[#8d8d8d] outline-none mt-1 ${b.was ? 'line-through' : ''}`} placeholder="Normalpris (gjennomstrekes)…" />
            <input value={b.bigLabel || ''} onChange={(e) => onPatch({ bigLabel: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[14px] text-[#ccc] outline-none mt-1" placeholder="forklarende tekst…" />
            {b.second ? (
              <div className="inline-block max-w-[94%] rounded-full border border-white/15 bg-white/10 px-4 py-1.5 mt-3">
                <input value={b.second || ''} onChange={(e) => onPatch({ second: e.target.value })} onClick={stop}
                  className="bg-transparent text-center text-[12.5px] font-semibold text-white outline-none max-w-full"
                  style={{ width: `${Math.min(44, Math.max(18, (b.second || '').length + 3))}ch` }} placeholder="+ sekundært tilbud…" />
              </div>
            ) : null}
            {/* Tilbudslinjer — gjennomstreket normalpris → nå-pris */}
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-1.5 text-left">
              {items.map((x, i) => (
                <div key={i} className={`flex items-center gap-2 py-2.5 group/oline ${i > 0 ? 'border-t border-white/10' : ''}`}>
                  <input value={x.title || ''} onChange={(e) => patchItem(i, 'title', e.target.value)} onClick={stop}
                    className="flex-1 min-w-0 bg-transparent text-[13px] font-semibold text-[#f2f2f2] outline-none" placeholder="Hva gjelder tilbudet?" />
                  <input value={x.was || ''} onChange={(e) => patchItem(i, 'was', e.target.value)} onClick={stop}
                    className={`w-[92px] bg-transparent text-right text-[12px] text-[#8d8d8d] outline-none ${x.was ? 'line-through' : ''}`} placeholder="Normalt…" />
                  <input value={x.now || ''} onChange={(e) => patchItem(i, 'now', e.target.value)} onClick={stop}
                    className="w-[120px] bg-transparent text-right text-[13.5px] font-extrabold outline-none" style={{ color: accent }} placeholder="Nå…" />
                  <button type="button" onClick={(e) => { stop(e); removeItem(i); }} title="Fjern linje"
                    className="opacity-0 group-hover/oline:opacity-100 text-white/35 hover:text-rose-400 transition-all shrink-0" data-testid={`nl-offer-line-remove-${i}`}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {items.length < 4 && (
                <button type="button" onClick={(e) => { stop(e); addItem(); }} data-testid="nl-offer-line-add"
                  className={`w-full text-center text-[11.5px] font-semibold text-white/40 hover:text-white/80 py-2.5 transition-colors ${items.length ? 'border-t border-white/10' : ''}`}>
                  + Legg til tilbudslinje
                </button>
              )}
            </div>
            <input value={b.deadline || ''} onChange={(e) => onPatch({ deadline: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[12px] font-bold outline-none mt-4" style={{ color: accent }} placeholder="Frist…" />
            <span className="inline-block max-w-[94%] rounded-full px-8 py-3 mt-4" style={{ background: accent }}>
              <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} onClick={stop}
                className="bg-transparent text-[#1f1f1f] text-[14px] font-bold text-center outline-none max-w-full"
                style={{ width: `${Math.min(36, Math.max(14, (b.label || '').length + 3))}ch` }} placeholder="CTA-tekst…" />
            </span>
            <input value={b.footnote || ''} onChange={(e) => onPatch({ footnote: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[11px] text-[#8d8d8d] outline-none mt-3" placeholder="Fotnote (valgfritt)…" />
          </div>
        );
      }
      case 'stat': {
        // Markedsinnsikt — nøkkeltall fra ekstern kilde med kildehenvisning
        const stats = Array.isArray(b.stats) ? b.stats : [];
        const patchStat = (i, key, val) => {
          const next = stats.map((x, j) => (j === i ? { ...x, [key]: val } : x));
          onPatch({ stats: next });
        };
        return (
          <div className="rounded-[18px] overflow-hidden" style={{ background: 'var(--nl-soft, #f5edfc)' }}>
            {b.imageUrl ? (
              <div className="relative group/statimg">
                <ImageWithSwap src={b.imageUrl} alt="" onUpload={upload} uploading={uploading} rounded="rounded-none"
                  height={b.height || 240} fit={b.fit} onResize={(h) => onPatch({ height: h })}
                  focalX={b.focalX} focalY={b.focalY} onFocal={(x, y) => onPatch({ focalX: x, focalY: y })} />
                <button type="button" onClick={(e) => { stop(e); onPatch({ imageUrl: '' }); }} title="Fjern bilde" data-testid="nl-stat-img-remove"
                  className="absolute top-2 right-2 z-20 rounded-full bg-black/60 hover:bg-black/85 text-white text-[11px] font-semibold px-2.5 py-1 opacity-0 group-hover/statimg:opacity-100 transition-opacity flex items-center gap-1">
                  <Trash2 size={11} /> Fjern bilde
                </button>
              </div>
            ) : null}
            <div className="px-6 py-6">
            <input value={b.eyebrow || ''} onChange={(e) => onPatch({ eyebrow: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-[10.5px] font-extrabold uppercase tracking-[0.14em] outline-none" style={{ color: 'var(--nl-deep, #7A3EC8)' }} placeholder="MARKEDSINNSIKT" />
            <AutoArea value={b.title} onChange={(e) => onPatch({ title: e.target.value })} placeholder="Tittel — f.eks. Leieprisene fortsetter å stige…"
              className="text-[19px] font-bold tracking-[-0.01em] leading-[1.35] text-[#111] mt-1" />
            <div className="flex items-stretch justify-center gap-2 mt-3">
              {stats.map((x, idx) => (
                <div key={idx} className="flex-1 min-w-0 text-center rounded-xl bg-white/55 px-2 py-3 relative group/stat">
                  <input value={x.value || ''} onChange={(e) => patchStat(idx, 'value', e.target.value)} onClick={stop}
                    className="bg-transparent w-full text-center text-[26px] font-extrabold tracking-[-0.02em] outline-none" style={{ color: 'var(--nl-deep, #7A3EC8)' }} placeholder="+5,1 %" />
                  <input value={x.label || ''} onChange={(e) => patchStat(idx, 'label', e.target.value)} onClick={stop}
                    className="bg-transparent w-full text-center text-[10px] font-bold uppercase tracking-[0.05em] text-[#8a8a8a] outline-none mt-1" placeholder="forklaring…" />
                  <button type="button" onClick={(e) => { stop(e); onPatch({ stats: stats.filter((_, k) => k !== idx) }); }} title="Fjern nøkkeltall"
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white shadow border border-black/5 items-center justify-center text-[#bbb] hover:text-rose-500 hidden group-hover/stat:flex" data-testid={`nl-stat-remove-${idx}`}>
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
              {stats.length < 3 && (
                <button type="button" onClick={(e) => { stop(e); onPatch({ stats: [...stats, { value: '', label: '' }] }); }} data-testid="nl-stat-add"
                  className={`${stats.length ? 'w-9 shrink-0' : 'flex-1 py-3'} rounded-xl border-2 border-dashed border-[#d8cfe6] text-[#a08cc0] hover:border-[#a052e0] hover:text-[#a052e0] flex items-center justify-center text-[16px] font-bold transition-colors`}
                  title="Legg til nøkkeltall">+</button>
              )}
            </div>
            <AutoArea value={b.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Tekst — hva betyr tallene, og hvorfor er det relevant for mottakeren?"
              className="text-[13.5px] leading-[1.7] text-[#4a4a4a] mt-3" />
            <div className="border-t border-black/10 mt-3 pt-2.5">
              <input value={b.source || ''} onChange={(e) => onPatch({ source: e.target.value })} onClick={stop}
                className="bg-transparent w-full text-[11.5px] text-[#8a8a8a] outline-none" placeholder="Kilde: f.eks. Husleiebarometeret Q2 2026 — Hybel AS / Menon Economics" data-testid="nl-stat-source" />
              <input value={b.sourceUrl || ''} onChange={(e) => onPatch({ sourceUrl: e.target.value })} onClick={stop}
                className="bg-transparent w-full text-[11px] text-[#b3a8c4] outline-none mt-1" placeholder="Lenke til kilden (valgfritt — viser «Les mer →»)" data-testid="nl-stat-source-url" />
            </div>
            </div>
          </div>
        );
      }
      case 'quote':
        return (
          <div className="rounded-[18px] px-6 py-5" style={{ background: 'var(--nl-soft, #f5edfc)' }}>
            <div className="text-[38px] leading-[0.6] font-serif" style={{ color: accent }}>“</div>
            <AutoArea value={b.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Sitat…"
              className="text-[15px] italic leading-[1.7] text-[#333] mt-2" />
            <div className="flex items-center gap-2.5 mt-2">
              <span className="w-6 h-[2px] rounded-full shrink-0" style={{ background: 'var(--nl-deep, #7A3EC8)' }} />
              <input value={b.author || ''} onChange={(e) => onPatch({ author: e.target.value })} onClick={stop}
                className="bg-transparent text-[12px] font-bold text-[#7a7a7a] outline-none w-full" placeholder="Hvem sa det?" />
            </div>
          </div>
        );
      case 'sender': {
        const photo = b.photoUrl || '/sarah-sleeman.jpg';
        return (
          <div className="rounded-2xl border border-[#f0ede8] bg-[#fafaf8] p-4 flex gap-4 items-center">
            <div className="w-[64px] shrink-0">
              <ImageWithSwap src={photo} alt={b.name} onUpload={upload} uploading={uploading} rounded="rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <AutoArea value={b.note} onChange={(e) => onPatch({ note: e.target.value })} placeholder="Personlig hilsen (valgfritt)…"
                className="text-[13px] italic leading-[1.55] text-[#555]" />
              <input value={b.name || ''} onChange={(e) => onPatch({ name: e.target.value })} onClick={stop}
                className="bg-transparent text-[14px] font-bold text-[#111] outline-none w-full" placeholder="Navn…" />
              <input value={b.title || ''} onChange={(e) => onPatch({ title: e.target.value })} onClick={stop}
                className="bg-transparent text-[12px] text-[#999] outline-none w-full" placeholder="Tittel…" />
            </div>
          </div>
        );
      }
      case 'signature':
        return (
          <div className="pt-2">
            <p className="text-[13px] text-[#666]">Vennlig hilsen</p>
            <input value={b.name || ''} onChange={(e) => onPatch({ name: e.target.value })} onClick={stop}
              className="bg-transparent text-[14.5px] font-bold text-[#111] outline-none w-full mt-1" placeholder="Navn…" />
            <input value={b.title || ''} onChange={(e) => onPatch({ title: e.target.value })} onClick={stop}
              className="bg-transparent text-[12.5px] text-[#999] outline-none w-full" placeholder="Tittel…" />
          </div>
        );
      case 'divider':
        return <hr className="border-t border-[#e8e4de] my-2" />;
      case 'spacer': {
        const h = b.size === 's' ? 14 : b.size === 'l' ? 48 : 28;
        return (
          <div className="relative flex items-center justify-center" style={{ height: h }}>
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#eee]" />
            <div className="relative flex gap-1 bg-white px-2">
              {['s', 'm', 'l'].map((s) => (
                <button key={s} onClick={(e) => { stop(e); onPatch({ size: s }); }}
                  className={`text-[10px] font-bold w-5 h-5 rounded-full ${b.size === s ? 'bg-[#0a0a0a] text-white' : 'bg-[#f2f0ed] text-[#999]'}`}>{s.toUpperCase()}</button>
              ))}
            </div>
          </div>
        );
      }
      default: return null;
    }
  };

  const fullBleed = b.type === 'hero';
  return (
    <div
      onClick={() => onSelect(b.id)}
      onDragOver={(e) => onDragOverBlock(e, i)}
      onDrop={(e) => onDropBlock(e, i)}
      data-testid={`nl-block-${b.type}`}
      className={`relative group transition-shadow ${fullBleed ? '' : 'px-10'} ${fullBleed && i === 0 ? 'pt-0 pb-2' : 'py-2'} ${selected ? 'ring-2 ring-[#c99df0] ring-inset rounded-lg' : 'hover:ring-1 hover:ring-[#eadff5] hover:ring-inset rounded-lg'}`}
    >
      {/* verktøylinje — legges INNENFOR blokken på første/hero (unngår klipping av overflow-hidden) */}
      <div className={`absolute ${(fullBleed || i === 0) ? 'top-2' : '-top-3'} right-3 z-10 flex items-center gap-0.5 rounded-full border border-[#eee] bg-white shadow-sm px-1 py-0.5 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <span draggable onDragStart={(e) => onDragStartBlock(e, b.id)} className="cursor-grab active:cursor-grabbing p-1 text-[#bbb] hover:text-[#555]" title="Dra for å flytte"><GripVertical size={13} /></span>
        <button onClick={(e) => { stop(e); onMove(b.id, -1); }} disabled={i === 0} className="p-1 text-[#999] hover:text-[#111] disabled:opacity-30"><ArrowUp size={13} /></button>
        <button onClick={(e) => { stop(e); onMove(b.id, 1); }} disabled={i === total - 1} className="p-1 text-[#999] hover:text-[#111] disabled:opacity-30"><ArrowDown size={13} /></button>
        <button onClick={(e) => { stop(e); onDup(b.id); }} className="p-1 text-[#999] hover:text-[#111]"><Copy size={12} /></button>
        <button onClick={(e) => { stop(e); onDel(b.id); }} className="p-1 text-[#999] hover:text-red-500"><Trash2 size={13} /></button>
      </div>
      {inner()}
    </div>
  );
}

/* --------------------- Boligvelger (for Boliger-blokken) ------------------ */
// Sperreregel for utsending — samme som forsiden. Ett kilde-sted, brukt både
// til å deaktivere rader og til «Kun valgbare»-filteret.
//   • ikke ledig (utleid/pauset)  • tomt skall  • duplikat  • ingen bilder
// Et boligkort uten bilde ser ødelagt ut i e-post, derfor er bilde et krav.
export function newsletterBlock(p) {
  const noImages = !(Array.isArray(p?.images) && p.images.length);
  const notActive = p?.status !== 'active';
  const blocked = notActive || !!p?.incomplete || !!p?.duplicate || noImages;
  // Vis HVA som mangler, ikke bare «mangler data» — da vet man hva eieren
  // må fylle inn i plattformappen for at boligen skal bli sendbar.
  const missing = (Array.isArray(p?.missingFields) ? p.missingFields : []).filter((f) => f !== 'gateadresse');
  const reason = notActive
    ? (p?.status === 'paused' ? 'Pauset' : 'Utleid')
    : (p?.duplicate ? 'Duplikat'
      : (p?.incomplete ? `Mangler ${missing.length ? missing.join(', ') : 'data'}`
        : (noImages ? 'Ingen bilder' : '')));
  return { blocked, reason };
}

function PropertyPicker({ b, onPatch, apiQ }) {
  const [list, setList] = useState(null); // null = laster
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [onlyOk, setOnlyOk] = useState(false);
  const load = async () => {
    setList(null); setErr('');
    try {
      // Admin-lista viser alle synkede boliger; fall tilbake til offentlig liste
      let props = [];
      if (apiQ) {
        try {
          const r = await fetch(`/api/admin/properties?${apiQ}`);
          const j = await r.json();
          if (j.ok) props = j.properties || [];
        } catch (e) {}
      }
      if (!props.length) {
        const r = await fetch('/api/public/properties?limit=24');
        const j = await r.json();
        if (j.ok) props = j.properties || [];
      }
      setList(props);
    } catch (e) { setErr('Kunne ikke hente boliger'); setList([]); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  // AUTO-HEAL: utkast laget før bydelsutledningen har tom bydel (eller gatenavn)
  // lagret på boligkortene, så alt havnet under «Andre områder». Når lista er
  // hentet, oppdaterer vi bydelen på boliger som alt er valgt — uten at
  // redaktøren må plukke dem på nytt.
  useEffect(() => {
    if (!Array.isArray(list) || !list.length) return;
    const cur = b.items || [];
    if (!cur.length) return;
    const byPid = new Map();
    list.forEach((p) => { byPid.set(p.externalId || p.id, p); if (p.id) byPid.set(p.id, p); });
    let changed = false;
    const next = cur.map((it) => {
      const live = byPid.get(it.pid);
      if (!live) return it;
      const d = live.district || 'Andre områder';
      if (it.district !== d) { changed = true; return { ...it, district: d }; }
      return it;
    });
    if (changed) onPatch({ items: next });
  }, [list]); // eslint-disable-line

  const selected = new Set((b.items || []).map((x) => x.pid));
  const toItem = (p) => ({
    pid: p.externalId || p.id,
    localId: p.id || '',
    title: p.title || 'Bolig',
    image: (Array.isArray(p.images) && p.images[0]) || '',
    meta: [p.area || p.city, p.bedrooms ? `${p.bedrooms} soverom` : null, p.sqm ? `${p.sqm} m²` : null, p.availableFrom ? `Ledig ${p.availableFrom}` : null].filter(Boolean).join(' · '),
    band: p.monthlyRentBand || '',
    status: p.status || 'active',
    // Bydel fra API-et (utledet fra postnummer/poststed). ALDRI gatenavn —
    // «Sandslimarka» er ikke et byområde og gir en ubrukelig gruppering.
    district: p.district || 'Andre områder',
  });
  const toggle = (p) => {
    const cur = b.items || [];
    const pid = p.externalId || p.id;
    if (selected.has(pid)) onPatch({ items: cur.filter((x) => x.pid !== pid) });
    else onPatch({ items: [...cur, toItem(p)] });
  };

  // SØK: plattformens boligtitler er generiske («Møblert leilighet · 1 soverom
  // · 52 m²»), så gatenavnet er det eneste redaktøren kjenner boligen igjen på.
  // Vi matcher derfor på gate, bydel, poststed, størrelse, soverom, leiemodell
  // og prisintervall — alle ord må treffe (AND), slik at «werner 52» fungerer.
  const all = Array.isArray(list) ? list : [];
  const tokens = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const okCount = all.filter((p) => !newsletterBlock(p).blocked).length;
  const shown = all.filter((p) => {
    const pid = p.externalId || p.id;
    // Allerede valgte boliger skjules aldri — ellers «forsvinner» de fra lista.
    if (onlyOk && newsletterBlock(p).blocked && !selected.has(pid)) return false;
    if (!tokens.length) return true;
    const hay = [
      p.title, p.area, p.district, p.city,
      p.sqm ? `${p.sqm} m2 m²` : '', p.bedrooms ? `${p.bedrooms} soverom` : '',
      p.model, p.monthlyRentBand,
    ].filter(Boolean).join(' ').toLowerCase();
    return tokens.every((t) => hay.includes(t));
  });

  return (
    <div className="mt-1">
      <div className="flex items-center justify-between">
        <label className={labelCls} style={{ marginTop: 0 }}>Velg boliger ({(b.items || []).length} valgt)</label>
        <button onClick={load} className="text-[#aaa] hover:text-[#555] mt-1" title="Oppdater lista"><RefreshCw size={12} /></button>
      </div>
      {list === null ? (
        <div className="flex items-center gap-2 text-[12px] text-[#999] py-3"><Loader2 size={13} className="animate-spin" /> Henter boliger…</div>
      ) : err ? (
        <p className="text-[12px] text-red-500 py-2">{err}</p>
      ) : !list.length ? (
        <p className="text-[12px] text-[#999] py-2">Ingen boliger funnet. Synk boliger under «Boliger»-fanen først.</p>
      ) : (
        <>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search size={12} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#b8b2aa]" />
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Søk gate, bydel eller størrelse…"
                data-testid="nl-property-search"
                className="h-[30px] w-full rounded-lg border border-[#e8e4de] bg-white pl-7 pr-6 text-[11.5px] text-[#111] outline-none placeholder:text-[#b8b2aa] focus:border-[#c9b6e8]"
              />
              {q ? (
                <button onClick={() => setQ('')} title="Tøm søk" className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#b8b2aa] hover:text-[#555]"><X size={12} /></button>
              ) : null}
            </div>
            <button
              onClick={() => setOnlyOk((v) => !v)} data-testid="nl-property-only-ok"
              title="Vis kun boliger som kan sendes (ledige, med bilder)"
              className={`h-[30px] shrink-0 rounded-lg border px-2 text-[10.5px] font-semibold transition ${onlyOk ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-[#e8e4de] bg-white text-[#777] hover:text-[#333]'}`}
            >
              Kun valgbare · {okCount}
            </button>
          </div>
          <p className="mt-1 text-[10px] text-[#a8a29a]" data-testid="nl-property-count">
            Viser {shown.length} av {all.length} boliger · {okCount} kan sendes
          </p>
          {!shown.length ? (
            <p className="py-3 text-[12px] text-[#999]">Ingen treff{q ? ` på «${q}»` : ''}.{onlyOk ? ' Slå av «Kun valgbare» for å se alle.' : ''}</p>
          ) : (
        <div className="mt-1 max-h-[260px] overflow-y-auto rounded-xl border border-[#f0ede8] divide-y divide-[#f5f2ee]" data-testid="nl-property-picker">
          {shown.map((p) => {
            const pid = p.externalId || p.id;
            const on = selected.has(pid);
            const { blocked, reason } = newsletterBlock(p);
            return (
              <button key={pid} onClick={() => toggle(p)} disabled={!on && blocked} data-testid={`nl-prop-${pid}`}
                title={blocked ? `Kan ikke sendes: ${reason.toLowerCase()}` : ''}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-left transition-colors ${on ? 'bg-[#faf5ff]' : 'hover:bg-[#fbfaf9]'} ${!on && blocked ? 'opacity-45 cursor-not-allowed' : ''}`}>
                {(Array.isArray(p.images) && p.images[0])
                  ? <img src={mediaSrc(p.images[0])} alt="" className="w-[42px] h-[32px] rounded-md object-cover shrink-0" />
                  : <div className="w-[42px] h-[32px] rounded-md bg-[#f4f2ef] flex items-center justify-center shrink-0"><Home size={13} className="text-[#cbc4ba]" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#111] truncate">{p.title || 'Bolig'}</p>
                  <p className="text-[10.5px] text-[#999] truncate">
                    {[p.area || p.city, p.district, p.sqm ? `${p.sqm} m²` : null, reason || 'Ledig'].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className={`w-[18px] h-[18px] rounded-md border flex items-center justify-center shrink-0 ${on ? 'bg-[#0a0a0a] border-[#0a0a0a] text-white' : 'border-[#ddd] text-transparent'}`}>
                  <Check size={11} />
                </span>
              </button>
            );
          })}
        </div>
          )}
        </>
      )}
      {(b.items || []).length > 10 ? (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-[10.5px] leading-relaxed text-amber-700">Mange boligkort kan gjøre e-posten svært lang. Gmail kan klippe meldinger over ca. 102 KB — vurder flere utsendinger hvis du velger svært mange.</p>
      ) : null}
    </div>
  );
}

/* ------- Rekkefølge på valgte boliger (styrer visningen i e-posten) ------- */
// Plattformens boligtitler er generiske, så nummer + gate + bydel er det som
// gjør lista lesbar. Rekkefølgen her er den samme som e-posten bruker: med
// bydelsgruppering slått på styrer den plasseringen INNE i hver bydel.
function PropertyOrderList({ b, onPatch }) {
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length) return null;
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onPatch({ items: next });
  };
  const remove = (i) => onPatch({ items: items.filter((_, k) => k !== i) });
  const grouped = (b.grouping || 'auto') !== 'off'
    && (b.grouping === 'always' || items.length >= Math.max(2, Number(b.groupingThreshold) || 6));

  return (
    <div className="mt-3">
      <label className={labelCls} style={{ marginTop: 0 }}>Rekkefølge i e-posten</label>
      <div className="rounded-xl border border-[#f0ede8] divide-y divide-[#f5f2ee]" data-testid="nl-property-order">
        {items.map((it, i) => (
          <div key={`${it.pid}-${i}`} className="flex items-center gap-1.5 px-2 py-1.5">
            <span className="w-[14px] shrink-0 text-[10px] font-bold tabular-nums text-[#b8b2aa]">{i + 1}</span>
            {it.image
              ? <img src={mediaSrc(it.image)} alt="" className="h-[26px] w-[34px] shrink-0 rounded object-cover" />
              : <div className="flex h-[26px] w-[34px] shrink-0 items-center justify-center rounded bg-[#f4f2ef]"><Home size={11} className="text-[#cbc4ba]" /></div>}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11.5px] font-semibold text-[#111]">{it.title || 'Bolig'}</p>
              <p className="truncate text-[10px] text-[#a8a29a]">{[it.meta, it.district].filter(Boolean).join(' · ')}</p>
            </div>
            <button onClick={() => move(i, -1)} disabled={i === 0} title="Flytt opp" data-testid={`nl-order-up-${i}`}
              className="p-0.5 text-[#b8b2aa] hover:text-[#111] disabled:opacity-25"><ArrowUp size={12} /></button>
            <button onClick={() => move(i, 1)} disabled={i === items.length - 1} title="Flytt ned" data-testid={`nl-order-down-${i}`}
              className="p-0.5 text-[#b8b2aa] hover:text-[#111] disabled:opacity-25"><ArrowDown size={12} /></button>
            <button onClick={() => remove(i)} title="Fjern fra brevet" data-testid={`nl-order-del-${i}`}
              className="p-0.5 text-[#b8b2aa] hover:text-red-500"><X size={12} /></button>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#aaa]">
        {grouped
          ? 'Bydelsgruppering er på, så denne rekkefølgen styrer plasseringen inne i hver bydel. Sett «Bydelsrekkefølge» til «Som valgt» for å bestemme hvilken bydel som kommer først.'
          : 'Boligene vises i denne rekkefølgen i e-posten.'}
      </p>
    </div>
  );
}

/* ------------------------ Inspektør for valgt blokk ----------------------- */
/* --------- Markedsinnsikt: forhåndsvisningsbilde fra ekstern kilde --------- */
function StatImagePanel({ b, onPatch, apiQ, onUploadImage, uploading }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const fetchPreview = async () => {
    setErr(''); setOkMsg('');
    const src = (b.sourceUrl || '').trim();
    if (!src) { setErr('Lim inn kilde-lenken i blokken først (feltet nederst i kortet)'); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/admin/link-preview?${apiQ}&url=${encodeURIComponent(src)}`);
      const j = await r.json();
      if (j.ok && j.image) { onPatch({ imageUrl: j.image }); setOkMsg(j.site ? `Hentet fra ${j.site}` : 'Bilde hentet'); }
      else setErr(j.error || 'Fant ikke noe bilde på siden');
    } catch (e) { setErr('Nettverksfeil — prøv igjen'); }
    setBusy(false);
  };
  return (
    <>
      <label className={labelCls}>Bilde i kortet (valgfritt)</label>
      {b.imageUrl ? (
        <div className="relative rounded-xl overflow-hidden border border-[#e8e8e8] mb-2">
          <img src={b.imageUrl} alt="" className="w-full h-[110px] object-cover block" />
          <button type="button" onClick={() => onPatch({ imageUrl: '' })} data-testid="nl-insp-stat-img-remove"
            className="absolute top-1.5 right-1.5 rounded-full bg-black/60 hover:bg-black/85 text-white text-[10.5px] font-semibold px-2 py-0.5">Fjern</button>
        </div>
      ) : null}
      {/* 1) Last opp eget bilde (lagres hos oss, serverside-beskjæres for e-post) */}
      <DropImage compact onUpload={(f) => onUploadImage(b.id, f)} uploading={uploading} label={b.imageUrl ? 'Slipp nytt bilde her' : 'Last opp eget bilde'} />
      {/* 2) …eller hent artikkelens delingsbilde fra kilde-lenken */}
      <button type="button" onClick={fetchPreview} disabled={busy} data-testid="nl-insp-stat-img-fetch"
        className="w-full h-[36px] mt-2 rounded-lg bg-[#0a0a0a] text-white text-[12.5px] font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
        {busy ? 'Henter…' : (b.imageUrl ? 'Hent på nytt fra kilde-lenken' : 'Hent bilde fra kilde-lenken')}
      </button>
      {okMsg ? <p className="text-[11px] text-emerald-600 mt-1.5">{okMsg}</p> : null}
      {err ? <p className="text-[11px] text-rose-500 mt-1.5">{err}</p> : null}
      <label className={labelCls}>… eller lim inn bilde-URL manuelt</label>
      <input value={b.imageUrl || ''} onChange={(e) => onPatch({ imageUrl: e.target.value })} className={inputCls}
        placeholder="https://…/bilde.jpg" data-testid="nl-insp-stat-img-url" />
      <p className="text-[10.5px] text-[#aaa] mt-1.5">Bildet vises øverst i kortet. Last opp eget bilde (beskjæres automatisk til bannerformat i e-posten), hent artikkelens delingsbilde fra kilde-lenken, eller lim inn en bilde-URL.</p>
      {b.imageUrl ? (<>
        <label className={labelCls}>Høyde</label>
        <div className="flex gap-1.5">
          <input type="number" min={60} max={900} value={b.height || ''} data-testid="nl-insp-stat-height"
            onChange={(e) => onPatch({ height: e.target.value ? Math.max(60, Math.min(900, Math.round(Number(e.target.value)))) : null })}
            className={`${inputCls} flex-1`} placeholder="Auto (240 px banner)" />
          <button onClick={() => onPatch({ height: null })} data-testid="nl-insp-stat-height-auto"
            className={`h-[36px] px-3 rounded-lg text-[12px] font-semibold ${!b.height ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777] hover:bg-[#ece9e4]'}`}>Auto</button>
        </div>
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Tips: dra i håndtaket nederst på bildet i brevet for å justere høyden visuelt. «Auto» = bannerformat (240 px).</p>
        <label className={labelCls}>Tilpasning</label>
        <div className="flex gap-1.5" data-testid="nl-insp-stat-fit">
          {[['cover', 'Fyll'], ['contain', 'Tilpass'], ['fill', 'Strekk']].map(([k, l]) => (
            <button key={k} onClick={() => onPatch({ fit: k })}
              className={`flex-1 h-[32px] rounded-lg text-[12px] font-semibold ${(b.fit || 'cover') === k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>{l}</button>
          ))}
        </div>
        <label className={labelCls}>Fokuspunkt</label>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#777] tabular-nums flex-1" data-testid="nl-insp-stat-focal">
            {(b.focalX ?? 50)} % fra venstre · {(b.focalY ?? 50)} % fra toppen
          </span>
          <button onClick={() => onPatch({ focalX: 50, focalY: 50 })} data-testid="nl-insp-stat-focal-reset"
            className="h-[28px] px-3 rounded-lg bg-[#f4f2ef] text-[12px] font-semibold text-[#777] hover:bg-[#ece9e4]">Midtstill</button>
        </div>
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Hold musen over bildet i brevet og dra den lilla prikken dit motivet skal være i fokus — styrer hva som beholdes ved beskjæring («Fyll»).</p>
      </>) : null}
    </>
  );
}

export function BlockInspector({ b, onPatch, onDel, onUploadImage, uploadingId, apiQ, blocks }) {
  if (!b) return null;
  const meta = PALETTE.find((p) => p.type === b.type);
  const uploading = uploadingId === b.id;
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#111] flex items-center gap-2">
          {meta?.icon ? React.createElement(meta.icon, { size: 14, className: 'text-[#a052e0]' }) : null}
          {meta?.label || b.type}
        </p>
        <button onClick={() => onDel(b.id)} className="text-[11.5px] font-medium text-red-500 hover:underline">Slett</button>
      </div>

      {(b.type === 'button' || b.type === 'cta-card' || b.type === 'offer') ? (<>
        <label className={labelCls}>Lenke (URL)</label>
        <input value={b.url || ''} onChange={(e) => onPatch({ url: e.target.value })} className={inputCls} placeholder="https://digihome.no/sommer" data-testid="nl-insp-url" />
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Klikk spores automatisk og registreres på leaden.</p>
      </>) : null}

      {b.type === 'stat' ? <StatImagePanel b={b} onPatch={onPatch} apiQ={apiQ} onUploadImage={onUploadImage} uploading={uploading} /> : null}

      {(b.type === 'image' || b.type === 'hero') ? (<>
        <label className={labelCls}>Bilde</label>
        <DropImage compact onUpload={(f) => onUploadImage(b.id, f)} uploading={uploading} label="Slipp nytt bilde her" />
        <AIImagePanel b={b} onPatch={onPatch} blocks={blocks} apiQ={apiQ} />
        <label className={labelCls}>Alt-tekst</label>
        <input value={b.alt || ''} onChange={(e) => onPatch({ alt: e.target.value })} className={inputCls} placeholder="Beskrivelse av bildet" />
        <label className={labelCls}>Høyde</label>
        <div className="flex gap-1.5">
          <input type="number" min={60} max={900} value={b.height || ''} data-testid="nl-insp-height"
            onChange={(e) => onPatch({ height: e.target.value ? Math.max(60, Math.min(900, Math.round(Number(e.target.value)))) : null })}
            className={`${inputCls} flex-1`} placeholder="Auto" />
          <button onClick={() => onPatch({ height: null })} data-testid="nl-insp-height-auto"
            className={`h-[36px] px-3 rounded-lg text-[12px] font-semibold ${!b.height ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777] hover:bg-[#ece9e4]'}`}>Auto</button>
        </div>
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Tips: dra i håndtaket nederst på bildet for å justere høyden visuelt.</p>
        <label className={labelCls}>Tilpasning</label>
        <div className="flex gap-1.5" data-testid="nl-insp-fit">
          {[['cover', 'Fyll'], ['contain', 'Tilpass'], ['fill', 'Strekk']].map(([k, l]) => (
            <button key={k} onClick={() => onPatch({ fit: k })}
              className={`flex-1 h-[32px] rounded-lg text-[12px] font-semibold ${(b.fit || 'cover') === k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>{l}</button>
          ))}
        </div>
        <p className="text-[10.5px] text-[#aaa] mt-1.5">«Fyll» beskjærer, «Tilpass» viser hele bildet, «Strekk» fyller uten beskjæring. Gjelder når høyden er satt.</p>
        <label className={labelCls}>Fokuspunkt</label>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#777] tabular-nums flex-1" data-testid="nl-insp-focal">
            {b.height ? `${b.focalX ?? 50} % fra venstre · ${b.focalY ?? 50} % fra toppen` : 'Sett en høyde først'}
          </span>
          <button onClick={() => onPatch({ focalX: 50, focalY: 50 })} disabled={!b.height} data-testid="nl-insp-focal-reset"
            className="h-[28px] px-3 rounded-lg bg-[#f4f2ef] text-[12px] font-semibold text-[#777] hover:bg-[#ece9e4] disabled:opacity-40">Midtstill</button>
        </div>
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Hold musen over bildet og dra den lilla prikken dit motivet skal være i fokus — styrer hva som beholdes ved beskjæring («Fyll»).</p>
      </>) : null}

      {b.type === 'properties' ? (<>
        <PropertyPicker b={b} onPatch={onPatch} apiQ={apiQ} />
        <PropertyOrderList b={b} onPatch={onPatch} />
        <label className={labelCls}>Gruppering etter bydel/område</label>
        <div className="grid grid-cols-3 gap-1.5" data-testid="nl-properties-grouping">
          {[['off', 'Ingen'], ['auto', 'Auto 6+'], ['always', 'Alltid']].map(([key, label]) => (
            <button key={key} type="button" onClick={() => onPatch({ grouping: key })}
              className={`h-8 rounded-lg text-[11.5px] font-semibold ${(b.grouping || 'auto') === key ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>{label}</button>
          ))}
        </div>
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Auto grupperer ved 6 eller flere boliger. Bydel utledes fra postnummer/poststed (Åsane, Fana, Ytrebygda, Bergen sentrum …). Boliger vi ikke kan plassere sikkert havner under «Andre områder» — aldri i feil bydel.</p>
        {(b.grouping || 'auto') !== 'off' ? (<>
          <label className={labelCls}>Bydelsrekkefølge</label>
          <div className="grid grid-cols-2 gap-1.5" data-testid="nl-properties-grouporder">
            {[['auto', 'Automatisk'], ['manual', 'Som valgt']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => onPatch({ groupOrder: key })}
                className={`h-8 rounded-lg text-[11.5px] font-semibold ${(b.groupOrder || 'auto') === key ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>{label}</button>
            ))}
          </div>
          <p className="text-[10.5px] text-[#aaa] mt-1.5">Automatisk: bydelen med flest boliger først, «Andre områder» sist. Som valgt: bydelene kommer i samme rekkefølge som den første boligen du har lagt inn fra hver bydel.</p>
        </>) : null}
        <label className={labelCls}>Lenketekst nederst</label>
        <input value={b.cta || ''} onChange={(e) => onPatch({ cta: e.target.value })} className={inputCls} placeholder="Se alle ledige boliger" />
        <label className={labelCls}>Lenke (URL)</label>
        <input value={b.url || ''} onChange={(e) => onPatch({ url: e.target.value })} className={inputCls} placeholder="https://digihome.no/bli-leietaker" />
        <p className="text-[10.5px] text-[#aaa] mt-1.5">Alle boligkort og lenken peker hit. Klikk spores automatisk.</p>
      </>) : null}

      {b.type === 'sender' ? (<>
        <label className={labelCls}>Portrettfoto</label>
        <DropImage compact onUpload={(f) => onUploadImage(b.id, f)} uploading={uploading} label="Slipp nytt portrett her" />
      </>) : null}

      {b.type === 'spacer' ? (<>
        <label className={labelCls}>Størrelse</label>
        <div className="flex gap-1.5">
          {[['s', 'Liten'], ['m', 'Medium'], ['l', 'Stor']].map(([k, l]) => (
            <button key={k} onClick={() => onPatch({ size: k })}
              className={`flex-1 h-[32px] rounded-lg text-[12px] font-semibold ${b.size === k ? 'bg-[#0a0a0a] text-white' : 'bg-[#f4f2ef] text-[#777]'}`}>{l}</button>
          ))}
        </div>
      </>) : null}

      <p className="text-[10.5px] text-[#bbb] leading-[1.5] mt-5">Tips: rediger tekst direkte i brevet. Bruk <code className="bg-[#f4f2ef] px-1 rounded">{'{{first_name}}'}</code> for fletting.</p>
    </div>
  );
}
