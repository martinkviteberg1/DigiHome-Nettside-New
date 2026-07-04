'use client';

/*
 * EditorBlocks — byggeklossene i nyhetsbrev-editoren.
 * WYSIWYG-canvas (ser ut som e-posten) + kontekst-inspektør + bildeopplasting.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Type, AlignLeft, Image as ImageIcon, MousePointerClick, LayoutPanelTop,
  List, Quote, UserRound, PenLine, Minus, MoveVertical, BadgePercent,
  ArrowUp, ArrowDown, Copy, Trash2, UploadCloud, Loader2, GripVertical, Sparkles,
} from 'lucide-react';

/* ------------------------------- Palett ---------------------------------- */
export const PALETTE = [
  { type: 'heading',   label: 'Overskrift',   icon: Type },
  { type: 'text',      label: 'Tekst',        icon: AlignLeft },
  { type: 'hero',      label: 'Hero-bilde',   icon: LayoutPanelTop },
  { type: 'image',     label: 'Bilde',        icon: ImageIcon },
  { type: 'offer',     label: 'Tilbudskort',  icon: BadgePercent },
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
    case 'offer':    return { eyebrow: 'Sommerkampanje · Begrenset periode', big: '10 %', bigLabel: 'forvaltningshonorar — alt inkludert', second: '+ 0 kr i oppstartskostnad', deadline: 'Gjelder til 10. juli', label: 'Ja, jeg vil vite mer', url: 'https://digihome.no/sommer', footnote: 'Uforpliktende — vi tar kontakt.' };
    case 'sender':   return { name: 'Sarah Sleeman', title: 'Daglig leder, DigiHome', note: '', photoUrl: '/sarah-sleeman.jpg' };
    case 'signature': return { name: 'Sarah Sleeman', title: 'Daglig leder — DigiHome, Bergen' };
    case 'spacer':   return { size: 'm' };
    case 'hero':     return { url: '', alt: '' };
    case 'image':    return { url: '', alt: '' };
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

/* -------- Bilde med «bytt»-overlay (for blokker som allerede har bilde) --- */
function ImageWithSwap({ src, alt, onUpload, uploading, rounded = 'rounded-xl' }) {
  const [over, setOver] = useState(false);
  const fileRef = useRef(null);
  return (
    <div className={`relative group/img overflow-hidden ${rounded}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) onUpload(f); }}>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
      <img src={src} alt={alt || ''} className="w-full block" style={{ opacity: uploading ? 0.5 : 1 }} />
      <button type="button" onClick={() => fileRef.current?.click()}
        className={`absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[12.5px] font-semibold gap-2 transition-opacity ${over ? 'opacity-100' : 'opacity-0 group-hover/img:opacity-100'}`}>
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={15} />} Bytt bilde
      </button>
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
                <span className="mt-[9px] w-[5px] h-[5px] rounded-full shrink-0" style={{ background: accent }} />
                <AutoArea value={it} onChange={(e) => { const items = [...b.items]; items[idx] = e.target.value; onPatch({ items }); }}
                  placeholder="Punkt…" className="text-[14px] leading-[1.6] text-[#444]" />
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
          ? <ImageWithSwap src={b.url} alt={b.alt} onUpload={upload} uploading={uploading} />
          : <DropImage onUpload={upload} uploading={uploading} compact />;
      case 'hero':
        return b.url
          ? <ImageWithSwap src={b.url} alt={b.alt} onUpload={upload} uploading={uploading} rounded="rounded-none" />
          : <DropImage onUpload={upload} uploading={uploading} label="Slipp hero-bildet her — vises i full bredde øverst" />;
      case 'button':
        return (
          <div className="text-center py-1">
            <span className="inline-block rounded-full px-7 py-3" style={{ background: '#0a0a0a' }}>
              <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} onClick={stop}
                className="bg-transparent text-white text-[14px] font-semibold text-center outline-none w-[180px]" placeholder="Knappetekst…" />
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
            <span className="inline-block rounded-full px-6 py-2.5 mt-3" style={{ background: '#0a0a0a' }}>
              <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} onClick={stop}
                className="bg-transparent text-white text-[13px] font-semibold text-center outline-none w-[170px]" placeholder="Knappetekst…" />
            </span>
            {b.footnote !== undefined ? (
              <AutoArea value={b.footnote} onChange={(e) => onPatch({ footnote: e.target.value })} placeholder="Fotnote (valgfritt)…"
                className="text-[11px] text-[#999] text-center mt-2" />
            ) : null}
          </div>
        );
      case 'offer':
        return (
          <div className="rounded-[20px] px-7 py-8 text-center" style={{ background: '#0a0a0a' }}>
            <input value={b.eyebrow || ''} onChange={(e) => onPatch({ eyebrow: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[11px] font-bold uppercase tracking-[0.18em] outline-none" style={{ color: accent }} placeholder="EYEBROW-TEKST" />
            <input value={b.big || ''} onChange={(e) => onPatch({ big: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[52px] font-extrabold tracking-[-0.03em] text-white outline-none mt-1" placeholder="10 %" />
            <input value={b.bigLabel || ''} onChange={(e) => onPatch({ bigLabel: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[14px] text-[#bbb] outline-none mt-1" placeholder="forklarende tekst…" />
            <div className="inline-block rounded-full border border-white/15 bg-white/10 px-4 py-1.5 mt-3">
              <input value={b.second || ''} onChange={(e) => onPatch({ second: e.target.value })} onClick={stop}
                className="bg-transparent text-center text-[12.5px] font-semibold text-white outline-none w-[220px]" placeholder="+ sekundært tilbud…" />
            </div>
            <input value={b.deadline || ''} onChange={(e) => onPatch({ deadline: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[12px] font-semibold outline-none mt-3" style={{ color: accent }} placeholder="Frist…" />
            <span className="inline-block rounded-full px-8 py-3 mt-4" style={{ background: accent }}>
              <input value={b.label || ''} onChange={(e) => onPatch({ label: e.target.value })} onClick={stop}
                className="bg-transparent text-[#1f1f1f] text-[14px] font-bold text-center outline-none w-[180px]" placeholder="CTA-tekst…" />
            </span>
            <input value={b.footnote || ''} onChange={(e) => onPatch({ footnote: e.target.value })} onClick={stop}
              className="bg-transparent w-full text-center text-[11px] text-[#888] outline-none mt-3" placeholder="Fotnote (valgfritt)…" />
          </div>
        );
      case 'quote':
        return (
          <div className="pl-4" style={{ borderLeft: `3px solid ${accent}` }}>
            <AutoArea value={b.text} onChange={(e) => onPatch({ text: e.target.value })} placeholder="Sitat…"
              className="text-[15px] italic leading-[1.65] text-[#555]" />
            <input value={b.author || ''} onChange={(e) => onPatch({ author: e.target.value })} onClick={stop}
              className="bg-transparent text-[12px] font-semibold text-[#999] outline-none w-full mt-1" placeholder="— Hvem sa det?" />
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
      className={`relative group transition-shadow ${fullBleed ? '' : 'px-10'} py-2 ${selected ? 'ring-2 ring-[#c99df0] ring-inset rounded-lg' : 'hover:ring-1 hover:ring-[#eadff5] hover:ring-inset rounded-lg'}`}
    >
      {/* verktøylinje */}
      <div className={`absolute -top-3 right-3 z-10 flex items-center gap-0.5 rounded-full border border-[#eee] bg-white shadow-sm px-1 py-0.5 transition-opacity ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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

/* ------------------------ Inspektør for valgt blokk ----------------------- */
export function BlockInspector({ b, onPatch, onDel, onUploadImage, uploadingId }) {
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

      {(b.type === 'image' || b.type === 'hero') ? (<>
        <label className={labelCls}>Bilde</label>
        <DropImage compact onUpload={(f) => onUploadImage(b.id, f)} uploading={uploading} label="Slipp nytt bilde her" />
        <label className={labelCls}>Alt-tekst</label>
        <input value={b.alt || ''} onChange={(e) => onPatch({ alt: e.target.value })} className={inputCls} placeholder="Beskrivelse av bildet" />
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
