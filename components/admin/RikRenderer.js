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
  const gaa = (n) => { if (!n) return; if (n.type === 'text') tekst += n.text || ''; if (['horizontalRule', 'callout', 'image', 'table'].includes(n.type)) tekst += 'x'; (n.content || []).forEach(gaa); };
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

// Bilder på delingslenken: kun internt bilde-API eller https (aldri data:/http:).
const trygtBildeSrc = (src) => {
  const s = String(src || '').trim();
  return /^(https:\/\/|\/api\/styrerapport\/bilde\/)/i.test(s) ? s : null;
};

const justStyle = (node) => {
  const a = node && node.attrs && node.attrs.textAlign;
  return ['center', 'right', 'justify'].includes(a) ? { textAlign: a } : undefined;
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
      return <p style={justStyle(node)}>{node.content && node.content.length ? <Inline content={node.content} /> : <br />}</p>;
    case 'heading': {
      const lvl = Number(node.attrs && node.attrs.level) === 3 ? 3 : 2;
      const s = justStyle(node);
      return lvl === 3 ? <h3 style={s}><Inline content={node.content} /></h3> : <h2 style={s}><Inline content={node.content} /></h2>;
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
      const v = ['vedtak', 'risiko', 'info', 'tips', 'suksess'].includes(node.attrs && node.attrs.variant) ? node.attrs.variant : 'info';
      return <div className="rik-callout" data-variant={v}><Blokker content={node.content} /></div>;
    }
    case 'image': {
      const src = trygtBildeSrc(node.attrs && node.attrs.src);
      if (!src) return null;
      const w = Number(node.attrs && node.attrs.width);
      const alt = String((node.attrs && node.attrs.alt) || '');
      const align = ['left', 'center', 'right', 'full'].includes(node.attrs && node.attrs.align) ? node.attrs.align : 'center';
      return (
        <figure className="rik-figur" data-align={align}>
          <img src={src} alt={alt} loading="lazy" style={Number.isFinite(w) && w > 0 && align !== 'full' ? { width: `${w}px` } : undefined} />
          {alt ? <figcaption>{alt}</figcaption> : null}
        </figure>
      );
    }
    case 'table':
      return <div className="rik-tabell-wrap"><table className="rik-tabell"><tbody>{(node.content || []).map((r, i) => <Blokk key={i} node={r} />)}</tbody></table></div>;
    case 'tableRow':
      return <tr>{(node.content || []).map((c, i) => <Blokk key={i} node={c} />)}</tr>;
    case 'tableHeader': {
      const a = node.attrs || {};
      return <th colSpan={a.colspan > 1 ? a.colspan : undefined} rowSpan={a.rowspan > 1 ? a.rowspan : undefined}><Blokker content={node.content} /></th>;
    }
    case 'tableCell': {
      const a = node.attrs || {};
      return <td colSpan={a.colspan > 1 ? a.colspan : undefined} rowSpan={a.rowspan > 1 ? a.rowspan : undefined}><Blokker content={node.content} /></td>;
    }
    case 'taskList':
      return <ul className="rik-task">{(node.content || []).map((li, i) => <Blokk key={i} node={li} />)}</ul>;
    case 'taskItem': {
      const sjekket = !!(node.attrs && node.attrs.checked);
      return (
        <li className="rik-task-item" data-checked={sjekket ? 'true' : 'false'}>
          <span className="rik-task-boks" aria-hidden>{sjekket ? '✓' : ''}</span>
          <div className="rik-task-innhold"><Blokker content={node.content} /></div>
        </li>
      );
    }
    case 'details':
      return <details className="rik-details" open={!!(node.attrs && node.attrs.open)}>{(node.content || []).map((c, i) => <Blokk key={i} node={c} />)}</details>;
    case 'detailsSummary':
      return <summary className="rik-details-sum"><Inline content={node.content} /></summary>;
    case 'detailsContent':
      return <div className="rik-details-innhold"><Blokker content={node.content} /></div>;
    case 'kolonner': {
      const n = [2, 3].includes(Number(node.attrs && node.attrs.kolonner)) ? Number(node.attrs.kolonner) : 2;
      return <div className="rik-kolonner" data-kolonner={n}>{(node.content || []).map((c, i) => <Blokk key={i} node={c} />)}</div>;
    }
    case 'kolonne':
      return <div className="rik-kolonne"><Blokker content={node.content} /></div>;
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
.rik .rik-callout[data-variant="tips"] { border-left-color: #9A5B00; background: #FBF7EF; }
.rik .rik-callout[data-variant="tips"]::before { content: 'Tips'; color: #9A5B00; }
.rik .rik-callout[data-variant="suksess"] { border-left-color: #1B7A46; background: #F0F7F2; }
.rik .rik-callout[data-variant="suksess"]::before { content: 'Suksess'; color: #1B7A46; }
.rik .rik-callout > :last-child { margin-bottom: 0; }
.rik .rik-callout p { font-size: 15.5px; }
/* Bilder */
.rik-figur { margin: 1.9em 0; }
.rik-figur img { display: block; width: 100%; height: auto; border-radius: 14px; border: 1px solid #E4DFD6; }
.rik-figur figcaption { margin-top: 0.7em; font-size: 13px; line-height: 1.5; color: #6F6A60; font-style: italic; }
.rik-figur[data-align="center"] { text-align: center; }
.rik-figur[data-align="center"] img { margin-left: auto; margin-right: auto; }
.rik-figur[data-align="left"] { text-align: left; }
.rik-figur[data-align="left"] img { margin-right: auto; }
.rik-figur[data-align="right"] { text-align: right; }
.rik-figur[data-align="right"] img { margin-left: auto; }
.rik-figur[data-align="full"] img { width: 100%; }
/* Tabeller */
.rik-tabell-wrap { margin: 1.9em 0; overflow-x: auto; -webkit-overflow-scrolling: touch; border: 1px solid #E4DFD6; border-radius: 14px; }
.rik table.rik-tabell { border-collapse: collapse; width: 100%; font-size: 14.5px; line-height: 1.5; }
.rik table.rik-tabell td, .rik table.rik-tabell th { border-bottom: 1px solid #E4DFD6; border-right: 1px solid #E4DFD6; padding: 0.62em 0.9em; text-align: left; vertical-align: top; font-variant-numeric: tabular-nums; }
.rik table.rik-tabell tr > :last-child { border-right: 0; }
.rik table.rik-tabell tr:last-child td { border-bottom: 0; }
.rik table.rik-tabell th { background: #EFEBE3; font-family: var(--font-heading), sans-serif; font-weight: 650; font-size: 12px; letter-spacing: 0.04em; text-transform: uppercase; color: #15130F; }
.rik table.rik-tabell td p, .rik table.rik-tabell th p { margin: 0; }
@media (min-width: 1024px) {
  .rik--magasin { columns: 2; column-gap: 3.25rem; }
  .rik--magasin > * { break-inside: avoid; }
  .rik--magasin > h2 { column-span: all; }
  .rik--magasin > hr { column-span: all; }
  .rik--magasin > .rik-figur, .rik--magasin > .rik-tabell-wrap { column-span: all; }
}
/* Editor-spesifikt (Tiptap) */
.rik.ProseMirror { min-height: 220px; outline: none; }
.rik.ProseMirror p.is-editor-empty:first-child::before { content: attr(data-placeholder); color: #B5AFA4; pointer-events: none; float: left; height: 0; }
.rik.ProseMirror .rik-callout.ProseMirror-selectednode { box-shadow: 0 0 0 2px rgba(124,58,237,0.35); }
.rik.ProseMirror ::selection { background: rgba(124,58,237,0.18); }
.rik.ProseMirror img { max-width: 100%; height: auto; border-radius: 14px; border: 1px solid #E4DFD6; display: block; }
.rik.ProseMirror img.ProseMirror-selectednode { outline: 2px solid #7C3AED; outline-offset: 3px; }
.rik.ProseMirror .tableWrapper { margin: 1.6em 0; overflow-x: auto; }
.rik.ProseMirror table { border-collapse: collapse; width: 100%; table-layout: fixed; overflow: hidden; }
.rik.ProseMirror td, .rik.ProseMirror th { border: 1px solid #E4DFD6; padding: 0.55em 0.8em; position: relative; min-width: 3em; vertical-align: top; box-sizing: border-box; }
.rik.ProseMirror th { background: #EFEBE3; font-weight: 650; text-align: left; }
.rik.ProseMirror td p, .rik.ProseMirror th p { margin: 0; }
.rik.ProseMirror .selectedCell:after { content: ''; position: absolute; inset: 0; background: rgba(124,58,237,0.12); pointer-events: none; z-index: 2; }
.rik.ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: -2px; width: 4px; background: #7C3AED; pointer-events: none; z-index: 3; }
.rik.ProseMirror.resize-cursor { cursor: col-resize; }
/* Avkryssingsliste (render + editor) */
.rik ul.rik-task { list-style: none; margin: 0 0 1.15em; padding: 0; }
.rik ul.rik-task li.rik-task-item { display: flex; align-items: flex-start; gap: 0.6em; padding-left: 0; margin: 0.35em 0; }
.rik ul.rik-task li.rik-task-item::before { display: none; }
.rik .rik-task-boks { flex: 0 0 auto; width: 18px; height: 18px; margin-top: 0.15em; border-radius: 5px; border: 1.5px solid #C9C3B8; display: grid; place-items: center; font-size: 12px; line-height: 1; color: #fff; background: #fff; }
.rik .rik-task-item[data-checked="true"] .rik-task-boks { background: #7C3AED; border-color: #7C3AED; }
.rik .rik-task-item[data-checked="true"] .rik-task-innhold { color: #9A948A; text-decoration: line-through; }
.rik .rik-task-innhold { min-width: 0; }
.rik .rik-task-innhold p { margin: 0; }
.rik.ProseMirror ul[data-type="taskList"] { list-style: none; padding: 0; margin: 0 0 1.15em; }
.rik.ProseMirror ul[data-type="taskList"] li { display: flex; align-items: flex-start; gap: 0.6em; margin: 0.35em 0; padding-left: 0; }
.rik.ProseMirror ul[data-type="taskList"] li::before { display: none; }
.rik.ProseMirror ul[data-type="taskList"] li > label { flex: 0 0 auto; margin-top: 0.18em; user-select: none; }
.rik.ProseMirror ul[data-type="taskList"] li > div { min-width: 0; flex: 1 1 auto; }
.rik.ProseMirror ul[data-type="taskList"] li > div p { margin: 0; }
.rik.ProseMirror ul[data-type="taskList"] input[type="checkbox"] { width: 16px; height: 16px; accent-color: #7C3AED; cursor: pointer; }
/* Utvid / skjul (render + editor) */
.rik .rik-details { margin: 1.6em 0; border: 1px solid #E4DFD6; border-radius: 14px; background: #fff; padding: 0.3em 1.1em 0.4em; }
.rik .rik-details > summary, .rik .rik-details .rik-details-sum { cursor: pointer; list-style: none; font-family: var(--font-heading), sans-serif; font-weight: 650; color: #15130F; padding: 0.55em 0; outline: none; display: flex; align-items: center; gap: 0.5em; }
.rik .rik-details > summary::-webkit-details-marker { display: none; }
.rik .rik-details > summary::before, .rik .rik-details .rik-details-sum::before { content: '▸'; color: #7C3AED; font-size: 0.85em; transition: transform 0.15s; }
.rik .rik-details[open] > summary::before { transform: rotate(90deg); }
.rik .rik-details-innhold { padding: 0.1em 0 0.6em 1.1em; }
.rik .rik-details-innhold > :last-child { margin-bottom: 0; }
.rik.ProseMirror .rik-details { display: flex; align-items: flex-start; gap: 0.35em; }
.rik.ProseMirror .rik-details > button { flex: 0 0 auto; margin-top: 0.55em; background: transparent; border: 0; cursor: pointer; color: #7C3AED; font-size: 12px; }
.rik.ProseMirror .rik-details > div { flex: 1 1 auto; min-width: 0; }
.rik.ProseMirror .rik-details summary { font-family: var(--font-heading), sans-serif; font-weight: 650; color: #15130F; list-style: none; }
/* Kolonner (render + editor) */
.rik .rik-kolonner { display: grid; grid-template-columns: 1fr; gap: 1.6rem; margin: 1.7em 0; }
.rik .rik-kolonne > :first-child { margin-top: 0; }
.rik .rik-kolonne > :last-child { margin-bottom: 0; }
@media (min-width: 720px) {
  .rik .rik-kolonner[data-kolonner="2"] { grid-template-columns: 1fr 1fr; }
  .rik .rik-kolonner[data-kolonner="3"] { grid-template-columns: 1fr 1fr 1fr; }
}
.rik.ProseMirror .rik-kolonner { display: grid; grid-template-columns: 1fr 1fr; gap: 1.2rem; margin: 1.4em 0; }
.rik.ProseMirror .rik-kolonner[data-kolonner="3"] { grid-template-columns: 1fr 1fr 1fr; }
.rik.ProseMirror .rik-kolonne { border: 1px dashed #E4DFD6; border-radius: 10px; padding: 0.6em 0.8em; min-height: 2.2em; }
.rik.ProseMirror img[data-align="left"] { margin-right: auto; }
.rik.ProseMirror img[data-align="right"] { margin-left: auto; }
.rik.ProseMirror img[data-align="center"] { margin-left: auto; margin-right: auto; }
`;

export function RikStil() {
  return <style dangerouslySetInnerHTML={{ __html: RIK_CSS }} />;
}
