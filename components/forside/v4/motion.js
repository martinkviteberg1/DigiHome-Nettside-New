'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

/* ---------------------------------------------------------------------------
   V4 — designtokens og bevegelsesverktøy. Selvstendig (ingen import fra v3).

   Prinsipper:
   · Én levende flate, få elementer, presis timing, mye ro.
   · Typografi lager hierarkiet — ikke ikoner, ikke bokser.
   · Én radius-skala: 20 / 12 / 8.  Hårlinjer 6–8 % ink.  8 px-rytme.
   · Kun opacity/transform. Expo-ease. prefers-reduced-motion → sluttbildet.
--------------------------------------------------------------------------- */

export const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)'; // expo-out

export const T = {
  canvas: '#F4F1EA',   // varm, nøytral — ikke hvit, ikke svart
  tint: '#ECE7DD',     // svak ivory-tone for én aktiv rad
  ink: '#15130F',
  lilla: '#D496FF',    // én aksent: punktumet
  gronn: '#1F9D55',
  amber: '#B45309',
};

/* Appens fonter — brukes i alt som er produkt-UI (rader, knapper, tall). */
export const heading = { fontFamily: 'var(--font-heading), sans-serif' };

/* Nettsidens display-stemme. To kandidater — velges live i preview. */
export const displaySerif = { fontFamily: 'var(--font-serif), Georgia, serif', fontWeight: 400, letterSpacing: '-0.012em', lineHeight: 0.96, textWrap: 'balance' };
export const displayGrotesk = { fontFamily: 'var(--font-heading), sans-serif', fontWeight: 400, letterSpacing: '-0.025em', lineHeight: 0.98, textWrap: 'balance' };
export const displayFor = (font) => (font === 'grotesk' ? displayGrotesk : displaySerif);

/* Tusenskille med ubrytelig mellomrom (U+00A0 — finnes i alle fontene). */
export const tall = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

export function useRedusert() {
  const [r, setR] = useState(false);
  useEffect(() => { try { setR(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* ok */ } }, []);
  return r;
}

export function useSynlig(ref, threshold = 0.4) {
  const [synlig, setSynlig] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSynlig(true); return undefined; }
    const obs = new IntersectionObserver(([e]) => setSynlig(e.isIntersecting), { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return synlig;
}

/* Sekvens: spiller faser ÉN gang når `start` blir sann, hviler i sluttfasen.
   `replay()` starter på nytt. Redusert bevegelse → rett til slutt. */
export function useSekvens(faser, start) {
  const [i, setI] = useState(0);
  const [kjorer, setKjorer] = useState(false);
  const startet = useRef(false);
  const redusert = useRedusert();
  const idx = useMemo(() => { const m = {}; faser.forEach((f, k) => { m[f.navn] = k; }); return m; }, [faser]);
  const siste = faser.length - 1;

  useEffect(() => {
    if (!start || startet.current) return;
    startet.current = true;
    if (redusert) { setI(siste); return; }
    setKjorer(true);
  }, [start, redusert, siste]);

  useEffect(() => {
    if (!kjorer) return undefined;
    if (i >= siste) { setKjorer(false); return undefined; }
    const t = window.setTimeout(() => setI((v) => v + 1), faser[i].ms);
    return () => window.clearTimeout(t);
  }, [kjorer, i, faser, siste]);

  const replay = () => { setI(0); setKjorer(true); };
  return { fase: faser[i].navn, er: (n) => i >= idx[n], ferdig: i >= siste, replay, kjorer };
}

/* Knapp — 44 px / 36 px. Radius 12 / 8. */
const KNAPP = {
  ink: 'bg-[#15130F] text-white hover:bg-[#2A2620]',
  lys: 'bg-white text-[#15130F] hover:bg-[#F1EDE4] shadow-[0_0_0_1px_rgba(21,19,15,0.08)]',
  ghost: 'text-[#15130F] hover:bg-[#15130F]/[0.05]',
};
export function Knapp({ href, variant = 'ink', size = 'md', className = '', children, ...rest }) {
  const h = size === 'sm' ? 'h-9 px-3.5 text-[13.5px] rounded-[8px]' : 'h-11 px-5 text-[15px] rounded-[12px]';
  const cls = `inline-flex items-center justify-center gap-2 font-medium transition-[color,background-color,transform] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 ${h} ${KNAPP[variant]} ${className}`;
  if (href && href.startsWith('#')) return <a href={href} className={cls} {...rest}>{children}</a>;
  if (href) return <Link href={href} prefetch className={cls} {...rest}>{children}</Link>;
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function Lenke({ href, className = '', children, ...rest }) {
  const cls = `group inline-flex items-center gap-1.5 text-[15px] font-medium text-[#15130F] transition-colors hover:text-[#15130F]/60 ${className}`;
  const pil = <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={1.6} />;
  if (href.startsWith('#')) return <a href={href} className={cls} {...rest}>{children}{pil}</a>;
  return <Link href={href} className={cls} {...rest}>{children}{pil}</Link>;
}
