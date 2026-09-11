'use client';

// ─────────────────────────────────────────────────────────────────────────────
// RIK SEKSJON · RENDERER — trygg JSON (ProseMirror/Tiptap-doc) → React.
// Brukes både i admin-visning og på den offentlige delingslenken. Ingen
// dangerouslySetInnerHTML: hver node mappes eksplisitt til React-elementer med
// rapportens redaksjonelle typografi. Ukjente noder/marks ignoreres.
// Samme klassenavn (.rik …) brukes av editoren, så WYSIWYG = det som vises.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';

export const TOM_DOC = { type: 'doc', content: [{ type: 'paragraph' }] };

export const RIK_LAYOUTS = [
  { id: 'standard', label: 'Standard', hint: 'Én lesbar spalte' },
  { id: 'magasin', label: 'Magasin', hint: 'To spalter på store skjermer' },
  { id: 'sidestilt', label: 'Sidestilt', hint: 'Tittel til venstre, tekst til høyre' },
];

export const RIK_ANKERE = [
  { id: 'start', label: 'Rett etter forsiden' },
  { id: 'sammendrag', label: 'Etter Sammendrag' },
  { id: 'nokkeltall', label: 'Etter Nøkkeltall' },
  { id: 'resultat', label: 'Etter Resultat' },
  { id: 'regnskap', label: 'Etter Regnskap' },
  { id: 'kunder', label: 'Etter Kunder' },
  { id: 'prognose', label: 'Etter Prognose' },
  { id: 'slutt', label: 'Til slutt (før Beslutning)' },
];

// Ren tekst → doc (brukes ved migrering av gamle «tekst»-blokker)
export function tekstTilDoc(str) {
  const avsnitt = String(str || '').split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  if (!avsnitt.length) return TOM_DOC;
  return {
    type: 'doc',
    content: avsnitt.map((a) => {
      const linjer = a.split('\n');
      const content = [];
      linjer.forEach((l, i) => { if (i > 0) content.push({ type: 'hardBreak' }); if (l) content.push({ type: 'text', text: l }); });
      return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
    }),
  };
}

export function docErTom(doc) {
  let tekst = '';
  const gaa = (n) => { if (!n) return; if (n.type === 'text') tekst += n.text || ''; if (n.type === 'horizontalRule' || n.type === 'callout') tekst += 'x'; (n.content || []).forEach(gaa); };
  gaa(doc);
  return tekst.trim().length === 0;
}

export function docTilRenTekst(doc, maks = 200) {
  let tekst = '';
  const gaa = (n) => { if (!n || tekst.length > maks) return; if (n.type === 'text') tekst += n.text || ''; if (n.type === 'paragraph' || n.type === 'heading') tekst += ' '; (n.content || []).forEach(gaa); };
  gaa(doc);
  return tekst.replace(/\s+/g, ' ').trim().slice(0, maks);
}

const trygtHref = (href) => {
  const h = String(href || '').trim();
  return /^(https?:\/\/|mailto:)/i.test(h) ? h : null;
};

function Inline({ content }) {
  if (!Array.isArray(content)) return null;
  return content.map((n, i) => {
    if (!n) return null;
    if (n.type === 'hardBreak') return <br key={i} />;
    if (n.type !== 'text') return null;
    let el = n.text || '';
    const marks = Array.isArray(n.marks) ? n.marks : [];
    // Marks legges utenpå i fast rekkefølge, så rendering er deterministisk
    const har = (t) => marks.some((m) => m && m.type === t);
    if (har('code')) el = <code>{el}</code>;
    if (har('bold')) el = <strong>{el}</strong>;
    if (har('italic')) el = <em>{el}</em>;
    if (har('underline')) el = <u>{el}</u>;
    if (har('strike')) el = <s>{el}</s>;
    if (har('highlight')) el = <mark>{el}</mark>;
    const lenke = marks.find((m) => m && m.type === 'link');
    if (lenke) {
      const href = trygtHref(lenke.attrs && lenke.attrs.href);
      if (href) el = <a href={href} target="_blank" rel="noopener noreferrer nofollow">{el}</a>;
    }
    return <React.Fragment key={i}>{el}</React.Fragment>;
  });
}

function Blokk({ node }) {
  if (!node) return null;
  switch (node.type) {
    case 'paragraph':
      return <p>{node.content && node.content.length ? <Inline content={node.content} /> : <br />}</p>;
    case 'heading': {
      const lvl = Number(node.attrs && node.attrs.level) === 3 ? 3 : 2;
      return lvl === 3 ? <h3><Inline content={node.content} /></h3> : <h2><Inline content={node.content} /></h2>;
    }
    case 'bulletList':
      return <ul>{(node.content || []).map((li, i) => <li key={i}><Blokker content={li && li.content} /></li>)}</ul>;
    case 'orderedList': {
      const start = Number(node.attrs && node.attrs.start);
      return <ol start={Number.isFinite(start) && start > 1 ? start : undefined} style={Number.isFinite(start) && start > 1 ? { counterReset: `rik ${start - 1}` } : undefined}>{(node.content || []).map((li, i) => <li key={i}><Blokker content={li && li.content} /></li>)}</ol>;
    }
    case 'blockquote':
      return <blockquote><Blokker content={node.content} /></blockquote>;
    case 'horizontalRule':
      return <hr />;
    case 'callout': {
      const v = ['vedtak', 'risiko', 'info'].includes(node.attrs && node.attrs.variant) ? node.attrs.variant : 'info';
      return <div className="rik-callout" data-variant={v}><Blokker content={node.content} /></div>;
    }
    case 'codeBlock':
      return <pre><code>{(node.content || []).map((t) => (t && t.text) || '').join('')}</code></pre>;
    default:
      return null;
  }
}

function Blokker({ content }) {
  if (!Array.isArray(content)) return null;
  return content.map((n, i) => <Blokk key={i} node={n} />);
}

/** Hovedkomponent: rendrer et Tiptap-doc med rapportens redaksjonelle stil. */
export function RikInnhold({ doc, layout = 'standard', className = '' }) {
  const d = doc && doc.type === 'doc' ? doc : TOM_DOC;
  return (
    <div className={`rik rik--${RIK_LAYOUTS.some((l) => l.id === layout) ? layout : 'standard'} ${className}`}>
      <Blokker content={d.content} />
    </div>
  );
}

// Felles redaksjonell stil for både renderer og editor (WYSIWYG).
export const RIK_CSS = `
.rik { color: #3A3733; font-size: 16.5px; line-height: 1.68; letter-spacing: -0.003em; }
.rik--standard { max-width: 780px; }
.rik p { margin: 0 0 1.05em; }
.rik > p:last-child { margin-bottom: 0; }
.rik h2 { font-family: var(--font-heading), sans-serif; font-weight: 700; font-size: clamp(22px, 2.1vw, 28px); line-height: 1.15; letter-spacing: -0.028em; color: #15130F; margin: 2.1em 0 0.65em; }
.rik h3 { font-family: var(--font-heading), sans-serif; font-weight: 600; font-size: 18.5px; line-height: 1.3; letter-spacing: -0.012em; color: #15130F; margin: 1.7em 0 0.45em; }
.rik > h2:first-child, .rik > h3:first-child { margin-top: 0; }
.rik ul, .rik ol { margin: 0 0 1.15em; padding: 0; list-style: none; }
.rik ul li { position: relative; padding-left: 1.45em; margin: 0.38em 0; }
.rik ul li::before { content: ''; position: absolute; left: 0.2em; top: 0.72em; width: 6px; height: 6px; border-radius: 999px; background: #7C3AED; }
.rik ol { counter-reset: rik; }
.rik ol li { position: relative; padding-left: 2.2em; margin: 0.5em 0; counter-increment: rik; }
.rik ol li::before { content: counter(rik, decimal-leading-zero); position: absolute; left: 0; top: 0.32em; font-family: var(--font-heading), sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; color: #7C3AED; font-variant-numeric: tabular-nums; }
.rik li p { margin: 0; }
.rik li > ul, .rik li > ol { margin: 0.3em 0 0.2em; }
.rik blockquote { margin: 1.7em 0; padding: 0.15em 0 0.15em 1.3em; border-left: 2px solid #7C3AED; font-family: var(--font-heading), sans-serif; font-size: clamp(19px, 1.7vw, 23px); line-height: 1.4; letter-spacing: -0.018em; color: #15130F; font-weight: 500; }
.rik blockquote p { margin: 0; }
.rik blockquote p + p { margin-top: 0.6em; }
.rik hr { border: 0; height: 1px; background: #E4DFD6; margin: 2.2em 0; }
.rik a { color: #7C3AED; text-decoration: underline; text-underline-offset: 3px; text-decoration-thickness: 1px; }
.rik mark { background: rgba(124,58,237,0.14); color: inherit; padding: 0 0.15em; border-radius: 3px; }
.rik code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.86em; background: #EFEBE3; padding: 0.12em 0.42em; border-radius: 5px; }
.rik pre { background: #EFEBE3; border-radius: 10px; padding: 0.9em 1.1em; overflow-x: auto; font-size: 13.5px; margin: 0 0 1.1em; }
.rik strong { font-weight: 650; color: #15130F; }
.rik .rik-callout { margin: 1.6em 0; padding: 1.05em 1.3em 1.1em 1.35em; border-radius: 14px; background: #fff; border: 1px solid #E4DFD6; border-left: 3px solid #7C3AED; }
.rik .rik-callout::before { content: 'Merk'; display: block; font-family: var(--font-heading), sans-serif; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #7C3AED; margin-bottom: 0.55em; }
.rik .rik-callout[data-variant="vedtak"] { border-left-color: #15130F; background: #EFEBE3; }
.rik .rik-callout[data-variant="vedtak"]::before { content: 'Vedtak'; color: #15130F; }
.rik .rik-callout[data-variant="risiko"] { border-left-color: #C0362C; }
.rik .rik-callout[data-variant="risiko"]::before { content: 'Risiko'; color: #C0362C; }
.rik .rik-callout > :last-child { margin-bottom: 0; }
.rik .rik-callout p { font-size: 15.5px; }
@media (min-width: 1024px) {
  .rik--magasin { columns: 2; column-gap: 3.25rem; }
  .rik--magasin > * { break-inside: avoid; }
  .rik--magasin > h2 { column-span: all; }
  .rik--magasin > hr { column-span: all; }
}
/* Editor-spesifikt (Tiptap) */
.rik.ProseMirror { min-height: 220px; outline: none; }
.rik.ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #B5AFA4; pointer-events: none; float: left; height: 0; }
.rik.ProseMirror .rik-callout.ProseMirror-selectednode { box-shadow: 0 0 0 2px rgba(124,58,237,0.35); }
.rik.ProseMirror ::selection { background: rgba(124,58,237,0.18); }
`;

export function RikStil() {
  return <style dangerouslySetInnerHTML={{ __html: RIK_CSS }} />;
}
