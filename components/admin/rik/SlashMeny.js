'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SLASH-MENY — Confluence/Notion-stil «/»-kommandomeny. Rendres flytende via
// Tiptap ReactRenderer, posisjoneres på markørens clientRect, tastaturnavigerbar
// (piltaster + Enter + Esc). Selvstendig stylet (inline) så den ikke avhenger av
// global CSS. Grupperer valgene (Grunnleggende, Lister, Blokker, Layout, Paneler, AI).
// ─────────────────────────────────────────────────────────────────────────────

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ReactRenderer } from '@tiptap/react';

const C = { ink: '#15130F', ink3: '#6F6A60', line: '#E4DFD6', accent: '#7C3AED', paper: '#FDFCFB' };

const SlashMeny = forwardRef(function SlashMeny({ items = [], command }, ref) {
  const [valgt, setValgt] = useState(0);
  const boxRef = useRef(null);
  useEffect(() => setValgt(0), [items]);
  const velg = (i) => { const it = items[i]; if (it && command) command(it); };

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items.length) return false;
      if (event.key === 'ArrowDown') { setValgt((v) => (v + 1) % items.length); return true; }
      if (event.key === 'ArrowUp') { setValgt((v) => (v - 1 + items.length) % items.length); return true; }
      if (event.key === 'Enter') { velg(valgt); return true; }
      return false;
    },
  }));

  useEffect(() => {
    const el = boxRef.current && boxRef.current.querySelector('[data-valgt="true"]');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [valgt]);

  const boks = {
    width: 300, maxHeight: 340, overflowY: 'auto', background: C.paper, border: `1px solid ${C.line}`,
    borderRadius: 14, boxShadow: '0 20px 60px -20px rgba(21,19,15,0.45)', padding: 6,
    fontFamily: 'var(--font-body, ui-sans-serif), system-ui, sans-serif',
  };

  if (!items.length) {
    return <div style={boks} ref={boxRef}><div style={{ padding: '10px 12px', fontSize: 13, color: C.ink3 }}>Ingen treff</div></div>;
  }

  let forrigeGruppe = null;
  return (
    <div style={boks} ref={boxRef}>
      {items.map((it, i) => {
        const nyGruppe = it.gruppe !== forrigeGruppe;
        forrigeGruppe = it.gruppe;
        const aktiv = i === valgt;
        const Ikon = it.ikon;
        return (
          <React.Fragment key={it.id}>
            {nyGruppe && (
              <div style={{ padding: '8px 10px 4px', fontSize: 10.5, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.ink3 }}>{it.gruppe}</div>
            )}
            <button
              type="button"
              data-valgt={aktiv ? 'true' : 'false'}
              onMouseEnter={() => setValgt(i)}
              onMouseDown={(e) => { e.preventDefault(); velg(i); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
                padding: '8px 10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: aktiv ? 'rgba(124,58,237,0.10)' : 'transparent', transition: 'background 0.12s',
              }}
            >
              <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, flex: '0 0 auto', background: aktiv ? '#fff' : '#F3F1EC', border: `1px solid ${C.line}`, color: aktiv ? C.accent : C.ink }}>
                {Ikon ? <Ikon size={15} strokeWidth={2} /> : null}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: C.ink, lineHeight: 1.2 }}>{it.tittel}</span>
                {it.hint ? <span style={{ display: 'block', fontSize: 11.5, color: C.ink3, lineHeight: 1.3, marginTop: 1 }}>{it.hint}</span> : null}
              </span>
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );
});

export default SlashMeny;

// Flytende renderer for Tiptap Suggestion (posisjonerer menyen på markøren).
export function lagSlashRender() {
  let component = null;
  let popup = null;

  const plasser = (clientRect) => {
    if (!popup || typeof clientRect !== 'function') return;
    const r = clientRect();
    if (!r) return;
    const h = popup.offsetHeight || 340;
    const w = popup.offsetWidth || 300;
    const plassUnder = window.innerHeight - r.bottom;
    const top = (plassUnder < h + 16 && r.top > h) ? (r.top - h - 6 + window.scrollY) : (r.bottom + 6 + window.scrollY);
    const left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - w - 8));
    popup.style.top = `${Math.max(8 + window.scrollY, top)}px`;
    popup.style.left = `${left}px`;
  };

  return {
    onStart: (props) => {
      component = new ReactRenderer(SlashMeny, { props, editor: props.editor });
      popup = document.createElement('div');
      popup.style.position = 'absolute';
      popup.style.zIndex = '10000';
      document.body.appendChild(popup);
      popup.appendChild(component.element);
      plasser(props.clientRect);
    },
    onUpdate: (props) => {
      if (component) component.updateProps(props);
      plasser(props.clientRect);
    },
    onKeyDown: (props) => {
      if (props.event.key === 'Escape') { if (popup) popup.remove(); return true; }
      return (component && component.ref && component.ref.onKeyDown(props)) || false;
    },
    onExit: () => {
      try { if (popup) popup.remove(); } catch (e) { /* ok */ }
      if (component) component.destroy();
      popup = null; component = null;
    },
  };
}
