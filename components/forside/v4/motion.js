'use client';

import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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

/* Tokens bor i ./tokens (uten 'use client') slik at server-komponenter
   (artikkelmaler, SEO-sider) kan bruke dem. Re-eksportert her for kompatibilitet. */
import { EASE, T, heading, display, displayFor, tall } from './tokens';
export { EASE, T, heading, display, displayFor, tall };

/* Media query som ekstern kilde (useSyncExternalStore): på serveren og under hydrering = `server`-verdien, på
   klienten den faktiske — React re-rendrer synkront rett etter hydrering hvis de er ulike (ingen mismatch-feil,
   ingen synlig blink). Komponenter som monteres først på klienten (utsatte seksjoner) får riktig verdi fra første
   render — ingen «desktop først, så mobil»-hopp. */
const INGEN = () => () => {};
function useMedia(query, server = false) {
  const subscribe = useCallback((cb) => {
    if (typeof window === 'undefined' || !window.matchMedia) return INGEN();
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  }, [query]);
  const snapshot = useCallback(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : server), [query, server]);
  const serverSnapshot = useCallback(() => server, [server]);
  return useSyncExternalStore(subscribe, snapshot, serverSnapshot);
}

export function useRedusert() {
  return useMedia('(prefers-reduced-motion: reduce)');
}

/* Smal skjerm (< 640 px). SSR-default: false. */
export function useSmal() {
  return useMedia('(max-width: 639px)');
}

/* Én gang sann når elementet er innenfor `rootMargin` av viewporten (og forblir sann). Til utsatt montering
   av tunge seksjoner: koden hentes og monteres først når brukeren nærmer seg. Observasjonen starter først etter
   `load` (i ledig tid) — eller ved brukerens første scroll, hva som kommer først — så monteringen av seksjoner rett
   under folden aldri konkurrerer med hero, fonter og hydrering om hovedtråden. */
export function useNaer(ref, rootMargin = '800px 0px') {
  const [naer, setNaer] = useState(false);
  useEffect(() => {
    if (naer) return undefined;
    let obs = null; let idle = 0; let t = 0; let avbrutt = false; let startet = false;
    const start = () => {
      if (avbrutt || startet) return; startet = true;
      window.removeEventListener('scroll', start); window.removeEventListener('load', etterLoad);
      const el = ref.current;
      if (!el || typeof IntersectionObserver === 'undefined') { setNaer(true); return; }
      /* startTransition: monteringen (stor DOM) rendres avbrytbart i småbiter — ingen lang oppgave som blokkerer
         scroll/trykk, og plassholderen står til seksjonen (og chunken) er klar. */
      obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { startTransition(() => setNaer(true)); obs.disconnect(); } }, { rootMargin });
      obs.observe(el);
    };
    const etterLoad = () => {
      if (typeof window.requestIdleCallback === 'function') idle = window.requestIdleCallback(start, { timeout: 1200 });
      else t = window.setTimeout(start, 150);
    };
    window.addEventListener('scroll', start, { passive: true });
    if (document.readyState === 'complete') etterLoad(); else window.addEventListener('load', etterLoad, { once: true });
    return () => {
      avbrutt = true;
      window.removeEventListener('scroll', start); window.removeEventListener('load', etterLoad);
      obs?.disconnect(); if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle); window.clearTimeout(t);
    };
  }, [ref, naer, rootMargin]);
  return naer;
}

/* Utsatt seksjon: en tom flate med seksjonens omtrentlige høyde (så siden ikke hopper) til den nærmer seg
   viewporten — da monteres barnet (typisk en dynamic()-import med ssr:false → egen chunk). Står `id` i URL-ens
   hash, monteres den straks så ankerlenker treffer. */
export function Utsatt({ children, id, minHeight, rootMargin = '900px 0px', className = '' }) {
  const ref = useRef(null);
  const [straks, setStraks] = useState(false);
  useEffect(() => {
    try { if (id && window.location.hash === `#${id}`) setStraks(true); } catch (e) { /* ok */ }
  }, [id]);
  const naer = useNaer(ref, rootMargin);
  if (naer || straks) return children;
  return <div ref={ref} id={id} className={className} style={{ minHeight }} aria-hidden="true" data-testid={id ? `utsatt-${id}` : undefined} />;
}

/* «I bildet»: sann når minst `threshold` av elementet er synlig — ELLER når elementet fyller minst 22 % av
   viewporten (eller alt av et lite element). Det siste er mobilregelen: en seksjon på 1 600 px på en 844 px høy
   skjerm kan aldri bli 18 % synlig før du har scrollet langt inn i den — uten denne regelen sto overskriftene
   usynlige (opacity 0) mens brukeren scrollet forbi. */
const TRINN = [0, 0.05, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
export function useSynlig(ref, threshold = 0.4) {
  const [synlig, setSynlig] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSynlig(true); return undefined; }
    const obs = new IntersectionObserver(([e]) => {
      const vh = (e.rootBounds && e.rootBounds.height) || window.innerHeight || 1;
      const h = e.boundingClientRect.height || 1;
      const nok = e.intersectionRatio >= threshold || e.intersectionRect.height >= Math.min(vh * 0.22, h * 0.98);
      setSynlig(e.isIntersecting && nok);
    }, { threshold: TRINN });
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return synlig;
}

/* Sekvens: spiller faser ÉN gang når `start` blir sann, hviler i sluttfasen.
   `replay()` starter på nytt. Redusert bevegelse → rett til slutt.
   En fase med `ms: null` er en HOLD: sekvensen stopper der til `videre()` kalles. */
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
    const ms = faser[i].ms;
    if (ms == null) return undefined;                      // hold — venter på videre()
    const t = window.setTimeout(() => setI((v) => v + 1), ms);
    return () => window.clearTimeout(t);
  }, [kjorer, i, faser, siste]);

  const replay = () => { setI(0); setKjorer(true); };
  const videre = () => setI((v) => Math.min(v + 1, siste));
  return { fase: faser[i].navn, er: (n) => i >= idx[n], ferdig: i >= siste, replay, videre, kjorer, holder: kjorer && faser[i].ms == null };
}

/* Knapp — 44 px / 36 px. Radius 12 / 8. Primær = DigiHome-lilla med mørk tekst. */
const KNAPP = {
  lilla: 'bg-[#D496FF] text-[#15130F] hover:bg-[#C98BF7]',
  ink: 'bg-[#15130F] text-white hover:bg-[#2A2620]',
  lys: 'bg-white text-[#15130F] hover:bg-[#F1EDE4] shadow-[0_0_0_1px_rgba(21,19,15,0.08)]',
  ghost: 'text-[#15130F] hover:bg-[#15130F]/[0.05]',
};
export function Knapp({ href, variant = 'lilla', size = 'md', className = '', children, ...rest }) {
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
