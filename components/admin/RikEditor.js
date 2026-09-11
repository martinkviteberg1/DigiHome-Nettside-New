'use client';

// ─────────────────────────────────────────────────────────────────────────────
// RIK SEKSJON · EDITOR — Tiptap (ProseMirror) WYSIWYG med redaksjonell verktøylinje,
// flytende boble-meny ved markering, callouts (Vedtak/Risiko/Merk), pull-quote,
// lister, lenker og highlight. Lagrer som JSON via onChange (lett debounce).
// Lastes dynamisk (ssr:false) kun i redigeringsmodus, så delingslenken forblir lett.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Highlighter, Heading2, Heading3,
  List, ListOrdered, Quote, Link2, Minus, Undo2, Redo2, CheckSquare, AlertTriangle, Info, RemoveFormatting,
} from 'lucide-react';
import { TOM_DOC } from './RikRenderer';

const C = { ink: '#15130F', ink3: '#6F6A60', line: '#E4DFD6', line2: '#D6CFC4', accent: '#7C3AED', neg: '#C0362C' };

// ── Callout-node: <div data-callout data-variant="vedtak|risiko|info">…</div> ─
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-variant') || 'info',
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant }),
      },
    };
  },
  parseHTML() { return [{ tag: 'div[data-callout]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'rik-callout' }), 0]; },
  addCommands() {
    return {
      setCallout: (attrs) => ({ commands }) => commands.wrapIn(this.name, attrs),
      unsetCallout: () => ({ commands }) => commands.lift(this.name),
    };
  },
});

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

export default function RikEditor({ doc, onChange, placeholder = 'Skriv her … Marker tekst for formatering, eller bruk verktøylinjen.' }) {
  const timer = useRef(0);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
      }),
      Placeholder.configure({ placeholder }),
      Highlight.configure({ multicolor: false }),
      Callout,
    ],
    content: doc && doc.type === 'doc' ? doc : TOM_DOC,
    editorProps: { attributes: { class: 'rik rik--standard', spellcheck: 'true' } },
    onUpdate: ({ editor: ed }) => {
      if (!onChange) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => onChange(ed.getJSON()), 160);
    },
  });
  useEffect(() => () => window.clearTimeout(timer.current), []);

  if (!editor) return <div className="e-meta py-6">Laster editor …</div>;

  const er = (n, a) => editor.isActive(n, a);
  const kj = () => editor.chain().focus();

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
        <Knapp title="Sitat / pull-quote" aktiv={er('blockquote')} onClick={() => kj().toggleBlockquote().run()}><Quote className="h-4 w-4" /></Knapp>
        <Knapp title="Skillelinje" onClick={() => kj().setHorizontalRule().run()}><Minus className="h-4 w-4" /></Knapp>
        <Skille />
        <Knapp title="Vedtak-boks" aktiv={er('callout', { variant: 'vedtak' })} onClick={() => toggleCallout(editor, 'vedtak')} tone={C.ink}><CheckSquare className="h-4 w-4" /><span className="hidden lg:inline">Vedtak</span></Knapp>
        <Knapp title="Risiko-boks" aktiv={er('callout', { variant: 'risiko' })} onClick={() => toggleCallout(editor, 'risiko')} tone={C.neg}><AlertTriangle className="h-4 w-4" /><span className="hidden lg:inline">Risiko</span></Knapp>
        <Knapp title="Merk-boks" aktiv={er('callout', { variant: 'info' })} onClick={() => toggleCallout(editor, 'info')} tone={C.accent}><Info className="h-4 w-4" /><span className="hidden lg:inline">Merk</span></Knapp>
        <span className="ml-auto flex items-center gap-0.5">
          <Knapp title="Fjern formatering" onClick={() => kj().unsetAllMarks().clearNodes().run()}><RemoveFormatting className="h-4 w-4" /></Knapp>
          <Skille />
          <Knapp title="Angre (⌘Z)" disabled={!editor.can().undo()} onClick={() => kj().undo().run()}><Undo2 className="h-4 w-4" /></Knapp>
          <Knapp title="Gjør om (⇧⌘Z)" disabled={!editor.can().redo()} onClick={() => kj().redo().run()}><Redo2 className="h-4 w-4" /></Knapp>
        </span>
      </div>

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

      <EditorContent editor={editor} />
    </div>
  );
}
