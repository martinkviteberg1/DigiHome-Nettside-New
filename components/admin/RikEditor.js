'use client';

// ─────────────────────────────────────────────────────────────────────────────
// RIK SEKSJON · EDITOR — Tiptap (ProseMirror) WYSIWYG med redaksjonell verktøylinje,
// flytende boble-meny ved markering, callouts (Vedtak/Risiko/Merk), pull-quote,
// lister, lenker og highlight. Lagrer som JSON via onChange (lett debounce).
// Lastes dynamisk (ssr:false) kun i redigeringsmodus, så delingslenken forblir lett.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { NodeSelection } from '@tiptap/pm/state';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Link2, Minus, Undo2, Redo2, CheckSquare, AlertTriangle,
  Info, Lightbulb, PartyPopper, RemoveFormatting, ImagePlus, Table as TableIcon, Sparkles,
  WandSparkles, Loader2, Plus, Trash2, X, GripVertical, AlignLeft, AlignCenter, AlignRight,
  Maximize2,
} from 'lucide-react';
import { TOM_DOC } from './RikRenderer';
import { byggRikExtensions, byggSlashItems, filTilDataUrl } from './rik/RikKit';
import { lagSlashRender } from './rik/SlashMeny';

const C = { ink: '#15130F', ink3: '#6F6A60', line: '#E4DFD6', line2: '#D6CFC4', accent: '#7C3AED', neg: '#C0362C' };

function Knapp({ aktiv, onClick, title, children, disabled, tone }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={aktiv || undefined}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-[7px] px-1.5 text-[12px] font-semibold transition-colors disabled:opacity-30"
      style={{ background: aktiv ? C.ink : 'transparent', color: aktiv ? '#fff' : (tone || C.ink3) }}
      onMouseEnter={(e) => { if (!aktiv) e.currentTarget.style.background = 'rgba(21,19,15,0.06)'; }}
      onMouseLeave={(e) => { if (!aktiv) e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
const Skille = () => <span className="mx-1 h-5 w-px" style={{ background: C.line }} aria-hidden />;

function settLenke(editor) {
  const gjeldende = editor.getAttributes('link').href || '';
  const url = window.prompt('Lenke (https://…)', gjeldende || 'https://');
  if (url === null) return;
  const u = url.trim();
  if (!u || u === 'https://') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
  const href = /^(https?:\/\/|mailto:)/i.test(u) ? u : `https://${u}`;
  editor.chain().focus().extendMarkRange('link').setLink({ href, target: '_blank', rel: 'noopener noreferrer nofollow' }).run();
}

function toggleCallout(editor, variant) {
  if (editor.isActive('callout', { variant })) return editor.chain().focus().unsetCallout().run();
  if (editor.isActive('callout')) return editor.chain().focus().updateAttributes('callout', { variant }).run();
  return editor.chain().focus().setCallout({ variant }).run();
}

export default function RikEditor({ doc, onChange, apiKey = '', kontekst = '', placeholder = 'Skriv «/» for kommandoer, eller bare begynn å skrive …' }) {
  const timer = useRef(0);
  const filInput = useRef(null);
  const [laster, setLaster] = useState('');      // '', 'bilde', 'ai'
  const [feil, setFeil] = useState('');
  const [aiAapen, setAiAapen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiModus, setAiModus] = useState('seksjon');
  const holder = useRef(null);   // ytre boks (relativ) for drahåndtak-overlay
  const dragRef = useRef(null);  // selve drahåndtaket
  const blokkEl = useRef(null);  // top-nivå blokk-DOM under musen
  const slashItems = useRef(byggSlashItems({
    onBilde: () => { if (filInput.current) filInput.current.click(); },
    onAi: () => { setAiAapen(true); setFeil(''); },
  }));
  const editor = useEditor({
    immediatelyRender: false,
    extensions: byggRikExtensions({
      placeholder,
      slash: {
        char: '/',
        items: slashItems.current,
        render: lagSlashRender,
        command: ({ editor: ed, range, props }) => props.kommando({ editor: ed, range }),
      },
    }),
    content: doc && doc.type === 'doc' ? doc : TOM_DOC,
    editorProps: { attributes: { class: 'rik rik--standard', spellcheck: 'true' } },
    onUpdate: ({ editor: ed }) => {
      if (!onChange) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => onChange(ed.getJSON()), 160);
    },
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Bilde-opplasting → lagres server-side, doc peker på det interne bilde-API-et
  // (aldri base64 i dokumentet), så delingslenken forblir lett og trygg.
  async function lastOppBilde(file) {
    if (!file || !editor) return;
    if (!/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) { setFeil('Bruk PNG, JPG, GIF eller WEBP.'); return; }
    setFeil(''); setLaster('bilde');
    try {
      const dataUrl = await filTilDataUrl(file);
      const r = await fetch(`/api/admin/styrerapport/bilde?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataUrl, alt: (file.name || '').replace(/\.[a-z0-9]+$/i, '').slice(0, 120) }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.feil || 'Opplasting feilet');
      editor.chain().focus().setImage({ src: `/api/styrerapport/bilde/${j.id}`, alt: '' }).run();
    } catch (e) { setFeil((e && e.message) || 'Opplasting feilet'); }
    finally { setLaster(''); if (filInput.current) filInput.current.value = ''; }
  }

  // AI-innhold → server returnerer trygg semantisk HTML, Tiptap parser den til
  // doc-noder på klienten (samme sanering på lagring som all annen rik-tekst).
  async function kjorAi() {
    const p = aiPrompt.trim();
    if (!p || !editor) return;
    setFeil(''); setLaster('ai');
    try {
      const r = await fetch(`/api/admin/styrerapport/ai?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p, modus: aiModus, kontekst }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.feil || 'AI utilgjengelig');
      editor.chain().focus().insertContent(j.html).run();
      setAiPrompt(''); setAiAapen(false);
    } catch (e) { setFeil((e && e.message) || 'AI utilgjengelig'); }
    finally { setLaster(''); }
  }

  // ── Drahåndtak: grep til venstre for blokken under musen; dra flytter blokken ──
  useEffect(() => {
    if (!editor) return undefined;
    const dom = editor.view.dom;
    const onMove = (e) => {
      const h = dragRef.current; if (!h) return;
      let el = e.target;
      while (el && el.parentElement !== dom) el = el.parentElement;
      if (!el || el === dom) { h.style.opacity = '0'; h.style.pointerEvents = 'none'; blokkEl.current = null; return; }
      blokkEl.current = el;
      const boks = holder.current; if (!boks) return;
      const r = el.getBoundingClientRect(); const br = boks.getBoundingClientRect();
      h.style.top = `${(r.top - br.top) + 2}px`;
      h.style.opacity = '1'; h.style.pointerEvents = 'auto';
    };
    const onLeave = () => { const h = dragRef.current; if (h) { h.style.opacity = '0'; h.style.pointerEvents = 'none'; } };
    dom.addEventListener('mousemove', onMove);
    dom.addEventListener('mouseleave', onLeave);
    return () => { dom.removeEventListener('mousemove', onMove); dom.removeEventListener('mouseleave', onLeave); };
  }, [editor]);

  const blokkPos = useCallback((el) => {
    const pos = editor.view.posAtDOM(el, 0);
    return editor.state.doc.resolve(pos);
  }, [editor]);

  const startDrag = (e) => {
    const el = blokkEl.current; if (!el || !editor) return;
    try {
      const $pos = blokkPos(el);
      const sel = NodeSelection.create(editor.state.doc, $pos.before(1));
      editor.view.dispatch(editor.state.tr.setSelection(sel));
      const slice = editor.state.selection.content();
      editor.view.dragging = { slice, move: true };
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/html', el.outerHTML); } catch (_) { /* ok */ }
      e.dataTransfer.setDragImage(el, 0, 0);
    } catch (err) { /* ok */ }
  };
  const nyLinjeUnder = () => {
    if (!editor) return;
    const el = blokkEl.current;
    if (!el) { editor.chain().focus().run(); return; }
    try {
      const after = blokkPos(el).after(1);
      editor.chain().focus().insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).insertContent('/').run();
    } catch (e) { editor.chain().focus().run(); }
  };

  if (!editor) return <div className="e-meta py-6">Laster editor …</div>;

  const er = (n, a) => editor.isActive(n, a);
  const kj = () => editor.chain().focus();
  const iTabell = editor.isActive('table');
  const iBilde = editor.isActive('image');
  const settPanel = (variant) => {
    if (editor.isActive('callout', { variant })) return kj().unsetCallout().run();
    if (editor.isActive('callout')) return kj().updateCallout({ variant }).run();
    return kj().setCallout({ variant }).run();
  };
  const settJust = (align) => kj().setTextAlign(align).run();
  const bildeJust = (align) => kj().updateAttributes('image', { align }).run();

  return (
    <div className="rik-editor">
      {/* Verktøylinje — klistrer seg rett under rapport-navbaren mens du skriver */}
      <div className="sticky top-[68px] z-30 -mx-1 mb-4 flex flex-wrap items-center gap-0.5 rounded-[12px] border px-1.5 py-1" style={{ borderColor: C.line, background: 'rgba(253,252,251,0.92)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}>
        <Knapp title="Overskrift" aktiv={er('heading', { level: 2 })} onClick={() => kj().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Knapp>
        <Knapp title="Mellomtittel" aktiv={er('heading', { level: 3 })} onClick={() => kj().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Knapp>
        <Skille />
        <Knapp title="Fet (⌘B)" aktiv={er('bold')} onClick={() => kj().toggleBold().run()}><Bold className="h-4 w-4" /></Knapp>
        <Knapp title="Kursiv (⌘I)" aktiv={er('italic')} onClick={() => kj().toggleItalic().run()}><Italic className="h-4 w-4" /></Knapp>
        <Knapp title="Understrek (⌘U)" aktiv={er('underline')} onClick={() => kj().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Knapp>
        <Knapp title="Gjennomstrek" aktiv={er('strike')} onClick={() => kj().toggleStrike().run()}><Strikethrough className="h-4 w-4" /></Knapp>
        <Knapp title="Uthev" aktiv={er('highlight')} onClick={() => kj().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></Knapp>
        <Knapp title="Lenke" aktiv={er('link')} onClick={() => settLenke(editor)}><Link2 className="h-4 w-4" /></Knapp>
        <Skille />
        <Knapp title="Punktliste" aktiv={er('bulletList')} onClick={() => kj().toggleBulletList().run()}><List className="h-4 w-4" /></Knapp>
        <Knapp title="Nummerert liste" aktiv={er('orderedList')} onClick={() => kj().toggleOrderedList().run()}><ListOrdered className="h-4 w-4" /></Knapp>
        <Knapp title="Avkryssingsliste" aktiv={er('taskList')} onClick={() => kj().toggleTaskList().run()}><ListChecks className="h-4 w-4" /></Knapp>
        <Knapp title="Sitat / pull-quote" aktiv={er('blockquote')} onClick={() => kj().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Knapp>
        <Knapp title="Skillelinje" onClick={() => kj().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Knapp>
        <Skille />
        <Knapp title="Panel: Merk" aktiv={er('callout', { variant: 'info' })} onClick={() => settPanel('info')} tone={C.accent}><Info className="h-4 w-4" /></Knapp>
        <Knapp title="Panel: Vedtak" aktiv={er('callout', { variant: 'vedtak' })} onClick={() => settPanel('vedtak')} tone={C.ink}><CheckSquare className="h-4 w-4" /></Knapp>
        <Knapp title="Panel: Risiko" aktiv={er('callout', { variant: 'risiko' })} onClick={() => settPanel('risiko')} tone={C.neg}><AlertTriangle className="h-4 w-4" /></Knapp>
        <Knapp title="Panel: Tips" aktiv={er('callout', { variant: 'tips' })} onClick={() => settPanel('tips')} tone={C.accent}><Lightbulb className="h-4 w-4" /></Knapp>
        <Knapp title="Panel: Suksess" aktiv={er('callout', { variant: 'suksess' })} onClick={() => settPanel('suksess')} tone={C.accent}><PartyPopper className="h-4 w-4" /></Knapp>
        <Skille />
        <Knapp title="Venstrejuster" aktiv={er({ textAlign: 'left' })} onClick={() => settJust('left')}><AlignLeft className="h-4 w-4" /></Knapp>
        <Knapp title="Midtstill" aktiv={er({ textAlign: 'center' })} onClick={() => settJust('center')}><AlignCenter className="h-4 w-4" /></Knapp>
        <Knapp title="Høyrejuster" aktiv={er({ textAlign: 'right' })} onClick={() => settJust('right')}><AlignRight className="h-4 w-4" /></Knapp>
        <Skille />
        <Knapp title="Sett inn bilde" disabled={laster === 'bilde'} onClick={() => filInput.current && filInput.current.click()}>{laster === 'bilde' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}</Knapp>
        <Knapp title="Sett inn tabell (3×3)" aktiv={iTabell} onClick={() => kj().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="h-4 w-4" /></Knapp>
        <Knapp title="Skriv med AI" aktiv={aiAapen} onClick={() => { setAiAapen((v) => !v); setFeil(''); }} tone={C.accent}><Sparkles className="h-4 w-4" /><span className="hidden lg:inline">AI</span></Knapp>
        <span className="ml-auto flex items-center gap-0.5">
          <Knapp title="Fjern formatering" onClick={() => kj().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></Knapp>
          <Skille />
          <Knapp title="Angre (⌘Z)" disabled={!editor.can().undo()} onClick={() => kj().undo().run()}><Undo2 className="h-4 w-4" /></Knapp>
          <Knapp title="Gjør om (⇧⌘Z)" disabled={!editor.can().redo()} onClick={() => kj().redo().run()}><Redo2 className="h-4 w-4" /></Knapp>
        </span>
      </div>

      {/* Kontekstuell tabell-verktøylinje — vises kun når markøren står i en tabell */}
      {iTabell && (
        <div className="-mx-1 mb-4 flex flex-wrap items-center gap-0.5 rounded-[12px] border px-1.5 py-1" style={{ borderColor: C.line, background: '#fff' }}>
          <span className="px-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.ink3 }}>Tabell</span>
          <Skille />
          <Knapp title="Kolonne til venstre" onClick={() => kj().addColumnBefore().run()}><Plus className="h-3.5 w-3.5" /> kol</Knapp>
          <Knapp title="Kolonne til høyre" onClick={() => kj().addColumnAfter().run()}>kol <Plus className="h-3.5 w-3.5" /></Knapp>
          <Knapp title="Slett kolonne" onClick={() => kj().deleteColumn().run()} tone={C.neg}><Trash2 className="h-3.5 w-3.5" /> kol</Knapp>
          <Skille />
          <Knapp title="Rad over" onClick={() => kj().addRowBefore().run()}><Plus className="h-3.5 w-3.5" /> rad</Knapp>
          <Knapp title="Rad under" onClick={() => kj().addRowAfter().run()}>rad <Plus className="h-3.5 w-3.5" /></Knapp>
          <Knapp title="Slett rad" onClick={() => kj().deleteRow().run()} tone={C.neg}><Trash2 className="h-3.5 w-3.5" /> rad</Knapp>
          <Skille />
          <Knapp title="Tittelrad av/på" onClick={() => kj().toggleHeaderRow().run()}>Tittelrad</Knapp>
          <span className="ml-auto"><Knapp title="Slett hele tabellen" onClick={() => kj().deleteTable().run()} tone={C.neg}><Trash2 className="h-4 w-4" /><span className="hidden sm:inline"> Slett tabell</span></Knapp></span>
        </div>
      )}

      {/* Kontekstuell bilde-verktøylinje — vises når et bilde er valgt */}
      {iBilde && (
        <div className="-mx-1 mb-4 flex flex-wrap items-center gap-0.5 rounded-[12px] border px-1.5 py-1" style={{ borderColor: C.line, background: '#fff' }}>
          <span className="px-1.5 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: C.ink3 }}>Bilde</span>
          <Skille />
          <Knapp title="Venstre" aktiv={er('image', { align: 'left' })} onClick={() => bildeJust('left')}><AlignLeft className="h-4 w-4" /></Knapp>
          <Knapp title="Midtstill" aktiv={er('image', { align: 'center' })} onClick={() => bildeJust('center')}><AlignCenter className="h-4 w-4" /></Knapp>
          <Knapp title="Høyre" aktiv={er('image', { align: 'right' })} onClick={() => bildeJust('right')}><AlignRight className="h-4 w-4" /></Knapp>
          <Knapp title="Full bredde" aktiv={er('image', { align: 'full' })} onClick={() => bildeJust('full')}><Maximize2 className="h-4 w-4" /></Knapp>
          <span className="ml-auto"><Knapp title="Fjern bilde" onClick={() => kj().deleteSelection().run()} tone={C.neg}><Trash2 className="h-4 w-4" /><span className="hidden sm:inline"> Fjern</span></Knapp></span>
        </div>
      )}

      {/* AI-panel — verdensklasse «skriv med AI» med ekte tallkontekst */}
      {aiAapen && (
        <div className="-mx-1 mb-4 rounded-[14px] border p-3" style={{ borderColor: 'rgba(124,58,237,0.35)', background: 'rgba(124,58,237,0.045)' }}>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: C.accent }} />
            <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: C.accent }}>Skriv med AI</span>
            <button type="button" className="ml-auto rounded-md p-1 hover:bg-black/[0.05]" onClick={() => setAiAapen(false)} aria-label="Lukk"><X className="h-4 w-4" style={{ color: C.ink3 }} /></button>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {[['seksjon', 'Skriv seksjon'], ['forbedre', 'Forbedre'], ['oppsummer', 'Oppsummer'], ['tabell', 'Lag tabell']].map(([id, label]) => (
              <button key={id} type="button" onClick={() => setAiModus(id)} className="rounded-full px-3 py-1 text-[12px] font-semibold transition-colors" style={{ background: aiModus === id ? C.accent : '#fff', color: aiModus === id ? '#fff' : C.ink3, border: `1px solid ${aiModus === id ? C.accent : C.line}` }}>{label}</button>
            ))}
          </div>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') kjorAi(); }}
            rows={3}
            placeholder={aiModus === 'forbedre' ? 'Lim inn eller beskriv teksten som skal strammes opp …' : aiModus === 'tabell' ? 'Beskriv tabellen — f.eks. «kvartalsvis inntekt og resultat 2024 vs 2025»' : aiModus === 'oppsummer' ? 'Lim inn teksten som skal oppsummeres styremodent …' : 'Beskriv hva AI-en skal skrive — f.eks. «status på salg, pipeline og churn denne perioden»'}
            className="w-full resize-y rounded-[10px] border bg-white px-3 py-2 text-[14.5px] leading-relaxed outline-none transition focus:border-[#7C3AED] focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)]"
            style={{ borderColor: C.line2, color: C.ink }}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={laster === 'ai' || !aiPrompt.trim()} onClick={kjorAi} className="inline-flex h-9 items-center gap-1.5 rounded-[8px] px-3.5 text-[13px] font-semibold text-white transition-colors disabled:opacity-40" style={{ background: C.accent }}>
              {laster === 'ai' ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />} Generer
            </button>
            <span className="text-[11.5px]" style={{ color: C.ink3 }}>Settes inn der markøren står. Ekte tall fra rapporten sendes med — AI dikter ikke opp tall.</span>
          </div>
        </div>
      )}

      {feil && <div className="-mx-1 mb-3 rounded-[10px] border px-3 py-2 text-[13px]" style={{ borderColor: 'rgba(192,54,44,0.3)', background: 'rgba(192,54,44,0.06)', color: C.neg }}>{feil}</div>}

      <input ref={filInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={(e) => { const f = e.target.files && e.target.files[0]; if (f) lastOppBilde(f); }} />

      {/* Boble-meny ved tekstmarkering */}
      <BubbleMenu
        editor={editor}
        options={{ placement: 'top', offset: 10 }}
        shouldShow={({ editor: ed, state }) => !state.selection.empty && ed.isEditable && !ed.isActive('horizontalRule')}
      >
        <div className="flex items-center gap-0.5 rounded-[12px] border px-1.5 py-1 shadow-[0_12px_40px_-16px_rgba(21,19,15,0.45)]" style={{ borderColor: C.line, background: '#fff' }}>
          <Knapp title="Fet" aktiv={er('bold')} onClick={() => kj().toggleBold().run()}><Bold className="h-4 w-4" /></Knapp>
          <Knapp title="Kursiv" aktiv={er('italic')} onClick={() => kj().toggleItalic().run()}><Italic className="h-4 w-4" /></Knapp>
          <Knapp title="Understrek" aktiv={er('underline')} onClick={() => kj().toggleUnderline().run()}><UnderlineIcon className="h-4 w-4" /></Knapp>
          <Knapp title="Uthev" aktiv={er('highlight')} onClick={() => kj().toggleHighlight().run()}><Highlighter className="h-4 w-4" /></Knapp>
          <Knapp title="Lenke" aktiv={er('link')} onClick={() => settLenke(editor)}><Link2 className="h-4 w-4" /></Knapp>
          <Skille />
          <Knapp title="Overskrift" aktiv={er('heading', { level: 2 })} onClick={() => kj().toggleHeading({ level: 2 }).run()}><Heading2 className="h-4 w-4" /></Knapp>
          <Knapp title="Mellomtittel" aktiv={er('heading', { level: 3 })} onClick={() => kj().toggleHeading({ level: 3 }).run()}><Heading3 className="h-4 w-4" /></Knapp>
          <Knapp title="Sitat" aktiv={er('blockquote')} onClick={() => kj().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Knapp>
        </div>
      </BubbleMenu>

      <div ref={holder} className="relative">
        {/* Drahåndtak + «legg til»-knapp (Confluence/Notion-stil) i venstre marg */}
        <div ref={dragRef} className="absolute -left-9 z-20 hidden items-center gap-0.5 sm:flex" style={{ top: 0, opacity: 0, transition: 'opacity 0.12s' }}>
          <button type="button" title="Legg til under" onMouseDown={(e) => e.preventDefault()} onClick={nyLinjeUnder} className="grid h-6 w-5 place-items-center rounded-[6px] text-[#6F6A60] hover:bg-black/[0.06]"><Plus className="h-4 w-4" /></button>
          <button type="button" title="Dra for å flytte blokken" draggable onDragStart={startDrag} className="grid h-6 w-5 cursor-grab place-items-center rounded-[6px] text-[#6F6A60] hover:bg-black/[0.06] active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
