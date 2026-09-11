'use client';

// ─────────────────────────────────────────────────────────────────────────────
// RIK KIT — Confluence-nivå byggeklosser for styredokument-editoren.
// Samler alle Tiptap-noder/utvidelser ett sted: paneler (info/vedtak/risiko/
// tips/suksess), bilder m/ bredde+justering, kolonner (layout), utvid/skjul
// (details), avkryssingslister, tekstjustering, tabeller — og slash-kommandoer.
// Brukes kun av RikEditor (klient). Renderern (RikRenderer) mapper de samme
// nodene til React uten Tiptap, så delingslenken forblir lett.
// ─────────────────────────────────────────────────────────────────────────────

import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TextAlign } from '@tiptap/extension-text-align';
import { Details, DetailsSummary, DetailsContent } from '@tiptap/extension-details';
import { Suggestion } from '@tiptap/suggestion';
import { Node, Extension, mergeAttributes } from '@tiptap/core';
import {
  Type, Heading2, Heading3, List, ListOrdered, ListChecks, Quote, Table as TableIcon,
  ImagePlus, Info, CheckSquare, AlertTriangle, Lightbulb, PartyPopper, ChevronRight,
  Columns2, Columns3, Minus, Code2, Sparkles,
} from 'lucide-react';

export const PANEL_VARIANTER = ['info', 'vedtak', 'risiko', 'tips', 'suksess'];
export const BILDE_JUST = ['left', 'center', 'right', 'full'];

// ── Panel (beholder nodenavn 'callout' for bakoverkompatibilitet) ─────────────
const Panel = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (el) => el.getAttribute('data-variant') || 'info',
        renderHTML: (attrs) => ({ 'data-variant': PANEL_VARIANTER.includes(attrs.variant) ? attrs.variant : 'info' }),
      },
    };
  },
  parseHTML() { return [{ tag: 'div[data-callout]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'rik-callout' }), 0]; },
  addCommands() {
    return {
      setCallout: (attrs) => ({ commands }) => commands.wrapIn(this.name, attrs),
      updateCallout: (attrs) => ({ commands }) => commands.updateAttributes(this.name, attrs),
      unsetCallout: () => ({ commands }) => commands.lift(this.name),
    };
  },
});

// ── Bilde: Tiptap-Image + valgfri bredde og justering ─────────────────────────
const Bilde = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute('width'),
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
      align: {
        default: 'center',
        parseHTML: (el) => el.getAttribute('data-align') || 'center',
        renderHTML: (attrs) => ({ 'data-align': BILDE_JUST.includes(attrs.align) ? attrs.align : 'center' }),
      },
    };
  },
});

// ── Kolonner (Confluence-layout): container + kolonne ─────────────────────────
const Kolonne = Node.create({
  name: 'kolonne',
  content: 'block+',
  isolating: true,
  selectable: false,
  parseHTML() { return [{ tag: 'div[data-kolonne]' }]; },
  renderHTML() { return ['div', { 'data-kolonne': '', class: 'rik-kolonne' }, 0]; },
});

const Kolonner = Node.create({
  name: 'kolonner',
  group: 'block',
  content: 'kolonne{2,3}',
  isolating: true,
  addAttributes() {
    return {
      kolonner: {
        default: 2,
        parseHTML: (el) => Number(el.getAttribute('data-kolonner')) || 2,
        renderHTML: (attrs) => ({ 'data-kolonner': [2, 3].includes(Number(attrs.kolonner)) ? attrs.kolonner : 2 }),
      },
    };
  },
  parseHTML() { return [{ tag: 'div[data-kolonner]' }]; },
  renderHTML({ HTMLAttributes }) { return ['div', mergeAttributes(HTMLAttributes, { class: 'rik-kolonner' }), 0]; },
  addCommands() {
    return {
      setKolonner: (antall = 2) => ({ chain }) => {
        const n = [2, 3].includes(Number(antall)) ? Number(antall) : 2;
        const kolonner = Array.from({ length: n }, () => ({ type: 'kolonne', content: [{ type: 'paragraph' }] }));
        return chain().focus().insertContent({ type: 'kolonner', attrs: { kolonner: n }, content: kolonner })
          .command(({ tr, dispatch }) => { if (dispatch) tr.insert(tr.selection.$to.after(), tr.doc.type.schema.nodes.paragraph.create()); return true; })
          .run();
      },
    };
  },
});

// ── Slash-kommandoer ("/") via Suggestion ─────────────────────────────────────
export const SlashKommando = Extension.create({
  name: 'slashKommando',
  addOptions() { return { suggestion: {} }; },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});

const kj = (editor, range) => editor.chain().focus().deleteRange(range);

// Bygger listen med slash-valg. onBilde/onAi er UI-callbacks fra RikEditor.
export function byggSlashItems({ onBilde, onAi } = {}) {
  const alle = [
    { id: 'tekst', tittel: 'Tekst', hint: 'Vanlig avsnitt', gruppe: 'Grunnleggende', ikon: Type, sok: ['paragraph', 'avsnitt', 'p'], kommando: ({ editor, range }) => kj(editor, range).setParagraph().run() },
    { id: 'h2', tittel: 'Overskrift', hint: 'Stor seksjonstittel', gruppe: 'Grunnleggende', ikon: Heading2, sok: ['heading', 'tittel', 'h2'], kommando: ({ editor, range }) => kj(editor, range).setNode('heading', { level: 2 }).run() },
    { id: 'h3', tittel: 'Underoverskrift', hint: 'Mindre mellomtittel', gruppe: 'Grunnleggende', ikon: Heading3, sok: ['heading', 'mellomtittel', 'h3'], kommando: ({ editor, range }) => kj(editor, range).setNode('heading', { level: 3 }).run() },
    { id: 'ul', tittel: 'Punktliste', hint: 'Kulepunkter', gruppe: 'Lister', ikon: List, sok: ['bullet', 'liste', 'ul'], kommando: ({ editor, range }) => kj(editor, range).toggleBulletList().run() },
    { id: 'ol', tittel: 'Nummerert liste', hint: '1, 2, 3 …', gruppe: 'Lister', ikon: ListOrdered, sok: ['ordered', 'nummerert', 'ol'], kommando: ({ editor, range }) => kj(editor, range).toggleOrderedList().run() },
    { id: 'task', tittel: 'Avkryssingsliste', hint: 'Oppgaver med avkrysning', gruppe: 'Lister', ikon: ListChecks, sok: ['task', 'todo', 'oppgave', 'sjekk'], kommando: ({ editor, range }) => kj(editor, range).toggleTaskList().run() },
    { id: 'quote', tittel: 'Sitat', hint: 'Fremhevet sitat', gruppe: 'Blokker', ikon: Quote, sok: ['quote', 'sitat', 'blockquote'], kommando: ({ editor, range }) => kj(editor, range).toggleBlockquote().run() },
    { id: 'table', tittel: 'Tabell', hint: '3×3 med tittelrad', gruppe: 'Blokker', ikon: TableIcon, sok: ['table', 'tabell'], kommando: ({ editor, range }) => kj(editor, range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { id: 'bilde', tittel: 'Bilde', hint: 'Last opp et bilde', gruppe: 'Blokker', ikon: ImagePlus, sok: ['image', 'bilde', 'foto'], kommando: ({ editor, range }) => { kj(editor, range).run(); if (onBilde) onBilde(); } },
    { id: 'kode', tittel: 'Kodeblokk', hint: 'Monospace-kode', gruppe: 'Blokker', ikon: Code2, sok: ['code', 'kode'], kommando: ({ editor, range }) => kj(editor, range).toggleCodeBlock().run() },
    { id: 'hr', tittel: 'Skillelinje', hint: 'Horisontal strek', gruppe: 'Blokker', ikon: Minus, sok: ['divider', 'skille', 'linje', 'hr'], kommando: ({ editor, range }) => kj(editor, range).setHorizontalRule().run() },
    { id: 'details', tittel: 'Utvid / skjul', hint: 'Sammenleggbar seksjon', gruppe: 'Blokker', ikon: ChevronRight, sok: ['expand', 'utvid', 'details', 'accordion'], kommando: ({ editor, range }) => kj(editor, range).setDetails().run() },
    { id: 'kol2', tittel: '2 kolonner', hint: 'To spalter side om side', gruppe: 'Layout', ikon: Columns2, sok: ['column', 'kolonne', 'layout', '2'], kommando: ({ editor, range }) => kj(editor, range).setKolonner(2).run() },
    { id: 'kol3', tittel: '3 kolonner', hint: 'Tre spalter side om side', gruppe: 'Layout', ikon: Columns3, sok: ['column', 'kolonne', 'layout', '3'], kommando: ({ editor, range }) => kj(editor, range).setKolonner(3).run() },
    { id: 'p-info', tittel: 'Panel: Merk', hint: 'Nøytralt informasjonspanel', gruppe: 'Paneler', ikon: Info, sok: ['panel', 'info', 'merk', 'note'], kommando: ({ editor, range }) => kj(editor, range).setCallout({ variant: 'info' }).run() },
    { id: 'p-vedtak', tittel: 'Panel: Vedtak', hint: 'Styrets beslutning', gruppe: 'Paneler', ikon: CheckSquare, sok: ['panel', 'vedtak', 'beslutning'], kommando: ({ editor, range }) => kj(editor, range).setCallout({ variant: 'vedtak' }).run() },
    { id: 'p-risiko', tittel: 'Panel: Risiko', hint: 'Advarsel / risiko', gruppe: 'Paneler', ikon: AlertTriangle, sok: ['panel', 'risiko', 'advarsel', 'warning'], kommando: ({ editor, range }) => kj(editor, range).setCallout({ variant: 'risiko' }).run() },
    { id: 'p-tips', tittel: 'Panel: Tips', hint: 'Tips / anbefaling', gruppe: 'Paneler', ikon: Lightbulb, sok: ['panel', 'tips', 'ide'], kommando: ({ editor, range }) => kj(editor, range).setCallout({ variant: 'tips' }).run() },
    { id: 'p-suksess', tittel: 'Panel: Suksess', hint: 'Positiv fremgang', gruppe: 'Paneler', ikon: PartyPopper, sok: ['panel', 'suksess', 'success', 'bra'], kommando: ({ editor, range }) => kj(editor, range).setCallout({ variant: 'suksess' }).run() },
    { id: 'ai', tittel: 'Skriv med AI', hint: 'La AI lage innhold', gruppe: 'AI', ikon: Sparkles, sok: ['ai', 'gpt', 'skriv', 'generer'], kommando: ({ editor, range }) => { kj(editor, range).run(); if (onAi) onAi(); } },
  ];
  return ({ query }) => {
    const q = String(query || '').toLowerCase().trim();
    if (!q) return alle;
    return alle.filter((i) => i.tittel.toLowerCase().includes(q) || (i.sok || []).some((s) => s.includes(q)));
  };
}

// ── Klientside-nedskalering av bilder før opplasting (maks 1600px) ────────────
export function filTilDataUrl(file, maksBredde = 1600, kvalitet = 0.85) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Kunne ikke lese filen'));
    fr.onload = () => {
      const src = fr.result;
      const img = new window.Image();
      img.onerror = () => resolve(src);
      img.onload = () => {
        try {
          const skala = Math.min(1, maksBredde / (img.width || maksBredde));
          if (skala >= 1 && String(src).length < 1500000) return resolve(src);
          const w = Math.max(1, Math.round(img.width * skala));
          const h = Math.max(1, Math.round(img.height * skala));
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const ctx = cv.getContext('2d'); ctx.drawImage(img, 0, 0, w, h);
          const mime = /png/i.test(file.type) ? 'image/png' : 'image/jpeg';
          resolve(cv.toDataURL(mime, kvalitet));
        } catch (e) { resolve(src); }
      };
      img.src = src;
    };
    fr.readAsDataURL(file);
  });
}

// ── Bygger hele extension-arrayen for editoren ────────────────────────────────
export function byggRikExtensions({ placeholder, slash } = {}) {
  const teksten = placeholder || 'Skriv «/» for kommandoer, eller bare begynn å skrive …';
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
    }),
    Placeholder.configure({
      includeChildren: true,
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return 'Overskrift';
        if (node.type.name === 'detailsSummary') return 'Sammendrag …';
        return teksten;
      },
    }),
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    TaskList,
    TaskItem.configure({ nested: true }),
    Details.configure({ persist: true, HTMLAttributes: { class: 'rik-details' } }),
    DetailsSummary,
    DetailsContent,
    Panel,
    Kolonner,
    Kolonne,
    Bilde.configure({ inline: false, allowBase64: false, HTMLAttributes: { class: 'rik-bilde' } }),
    Table.configure({ resizable: true, HTMLAttributes: { class: 'rik-tabell' } }),
    TableRow,
    TableHeader,
    TableCell,
    ...(slash ? [SlashKommando.configure({ suggestion: slash })] : []),
  ];
}
