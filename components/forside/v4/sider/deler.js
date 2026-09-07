'use client';

import React, { useRef } from 'react';
import { EASE, T, display, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   deler — felles smådeler for V4-undersidene (priser, kontakt, om oss, book).
--------------------------------------------------------------------------- */

export const DIM = 'rgba(21,19,15,0.64)';
export const SVAK = 'rgba(21,19,15,0.5)';
export const HAIR = 'rgba(21,19,15,0.12)';

/* «inn»-bevegelse: opacity + løft, forskjøvet per element */
export const innFor = (synlig) => (i, y = 18) => ({ opacity: synlig ? 1 : 0, transform: synlig ? 'none' : `translateY(${y}px)`, transition: `opacity 800ms ${EASE} ${i * 90}ms, transform 900ms ${EASE} ${i * 90}ms` });

/* Seksjon som avslører innholdet når den kommer i syne. children(inn) */
export function Avsloring({ id, className = '', style, threshold = 0.15, children, testid }) {
  const ref = useRef(null);
  const synlig = useSynlig(ref, threshold);
  const inn = innFor(synlig);
  return (
    <section id={id} ref={ref} className={`relative ${className}`} style={style} data-testid={testid}>
      {typeof children === 'function' ? children(inn, synlig) : children}
    </section>
  );
}

/* Innledning øverst på en side: label · H1 · ingress. Bruker cover-animasjonen (spiller ved last). */
export function Innledning({ label, tittel, ingress, maks = '14ch', testid = 'v4s' }) {
  return (
    <div>
      {label ? <p className="dh-cover-inn text-[14.5px] font-medium" style={{ color: SVAK }} data-testid={`${testid}-label`}>{label}</p> : null}
      <h1 className="dh-cover-inn mt-4 text-[46px] sm:text-[68px] lg:text-[clamp(64px,5.8vw,104px)]" style={{ ...display, color: T.ink, maxWidth: maks, animationDelay: '.04s' }} data-testid={`${testid}-h1`}>
        {tittel}
      </h1>
      {ingress ? <p className="dh-cover-inn mt-6 max-w-[54ch] text-[18px] leading-[1.45] sm:mt-7 sm:text-[20px]" style={{ color: 'rgba(21,19,15,0.72)', animationDelay: '.08s' }} data-testid={`${testid}-ingress`}>{ingress}</p> : null}
    </div>
  );
}

/* Lilla punktum — merkevaregrepet */
export function Punkt() {
  return <span style={{ color: T.lilla, marginLeft: '0.04em' }}>.</span>;
}

/* Tekstområde i samme drakt som TekstFelt */
export function TekstOmrade({ id, label, value, onChange, placeholder, rows = 4 }) {
  const [fokus, setFokus] = React.useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13.5px] font-medium text-[#15130F]/75">{label}</label>
      <div className="rounded-[14px]" style={{ background: '#FBFAF8', boxShadow: fokus ? `0 0 0 2px ${T.ink}` : '0 0 0 1px rgba(21,19,15,0.14)', transition: `box-shadow 200ms ${EASE}` }}>
        <textarea id={id} value={value} onChange={onChange} onFocus={() => setFokus(true)} onBlur={() => setFokus(false)} placeholder={placeholder} rows={rows} className="block w-full resize-none rounded-[14px] border-0 bg-transparent px-5 py-4 text-[16px] text-[#15130F] outline-none placeholder:text-[#15130F]/40 focus:outline-none focus:ring-0" style={{ outline: 'none', boxShadow: 'none' }} data-testid={id} />
      </div>
    </div>
  );
}
