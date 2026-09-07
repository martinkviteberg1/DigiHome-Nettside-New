'use client';

// Delte byggeklosser for Google Ads-landingssidene (/lp/*).
// Fokus: maksimal konvertering — tillit, lav friksjon, mobil-først.

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Phone, X, Clock, ShieldCheck } from 'lucide-react';
import { site } from '@/lib/site';

/* ------------------------------- Reveal ------------------------------- */
// Avslører innhold med en myk fade-up når det kommer i viewport.
//
// Tre robusthetskrav, fordi disse sidene tar imot BETALT trafikk og et skjult
// hero betyr at vi betaler for et klikk til en tom side:
//
//  1. SIKKERHETSVENTIL. SSR-HTML-en inneholder opacity:0 for at animasjonen
//     skal ha noe å animere fra. Hvis IntersectionObserver aldri trigger —
//     feil i tredjepartsskript, uvanlig nettleser, aggressiv strømsparing —
//     ville innholdet blitt usynlig for alltid. Etter 1200 ms vises det
//     uansett.
//  2. prefers-reduced-motion. Da hopper vi over bevegelsen helt og viser
//     innholdet umiddelbart, uten transition.
//  3. Elementer som allerede er i viewporten ved første måling vises med én
//     gang, uten å vente på et scroll-event.
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const reduce = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setInstant(true); setShown(true); return undefined; }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return undefined; }

    // Sikkerhetsventil — aldri la innhold bli permanent usynlig.
    const safety = setTimeout(() => setShown(true), 1200);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { setShown(true); clearTimeout(safety); io.disconnect(); }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);

    return () => { clearTimeout(safety); io.disconnect(); };
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(22px)',
        transition: instant
          ? 'none'
          : `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------- CountUp ------------------------------- */
// Teller opp tallverdien når den vises (beholder suffiks som "kr", "%").
export function CountUp({ value, className = '' }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const m = String(value).match(/^[\d\s.,]+/);
    if (!m || typeof IntersectionObserver === 'undefined') { setDisplay(value); return; }
    const raw = m[0];
    const suffix = String(value).slice(raw.length);
    const clean = raw.replace(/\s/g, '').replace(',', '.');
    const target = parseFloat(clean);
    if (!isFinite(target)) { setDisplay(value); return; }
    const decimals = (clean.split('.')[1] || '').length;
    const fmt = (n) => n.toLocaleString('nb-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    let started = false;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting && !started) {
          started = true;
          const dur = 1400; const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / dur);
            const eased = 1 - Math.pow(1 - p, 3);
            setDisplay(fmt(target * eased) + suffix);
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.disconnect();
        }
      });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref} className={className}>{display}</span>;
}

/* --------------------------- Initial-avatarer --------------------------- */
// Ekte-følelse uten falske stockbilder: fargede initial-sirkler i merkevarepaletten.
// Tekstfargene er mørknet — de opprinnelige (#8b6aad, #b3702a, #4a6da7) lå på
// 3,5–4,4:1 mot sine egne lyse bakgrunner, altså under WCAG AA for 10–14 px.
const AVATAR_STYLES = [
  { bg: '#f0ebf5', color: '#6d4a91' },
  { bg: '#e8f4ee', color: '#18794E' },
  { bg: '#fdf0e2', color: '#8a4f14' },
  { bg: '#e9eef7', color: '#3a5687' },
];

export function InitialsAvatar({ name = '', index = 0, size = 40, className = '' }) {
  const initials = String(name)
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '·';
  const s = AVATAR_STYLES[index % AVATAR_STYLES.length];
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-semibold select-none ${className}`}
      style={{ width: size, height: size, background: s.bg, color: s.color, fontSize: Math.round(size * 0.34) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

export function AvatarStack({ names = ['Anette H.', 'Stian M.', 'Marianne L.', 'Jon K.'], size = 32 }) {
  return (
    <div className="flex -space-x-2">
      {names.map((n, i) => (
        <span key={i} className="rounded-full border-2 border-white inline-flex">
          <InitialsAvatar name={n} index={i} size={size} />
        </span>
      ))}
    </div>
  );
}

/* ----------------------------- Tillitslogoer ----------------------------- */
export function TrustLogos({ className = '' }) {
  const logos = [
    { src: '/bankid-logo.png', alt: 'BankID', h: 18 },
    { src: '/creditsafe-logo.png', alt: 'Creditsafe', h: 16 },
    { src: '/kartverket-logo.png', alt: 'Kartverket', h: 18 },
  ];
  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {logos.map((l, i) => (
        <img key={i} src={l.src} alt={l.alt} style={{ height: l.h }} loading="lazy"
          className="w-auto object-contain opacity-50 grayscale" />
      ))}
    </div>
  );
}

/* --------------------------- Sticky mobil-CTA --------------------------- */
// Skjules automatisk når skjemaet (#lp-form) er synlig, og etter innsending.
// Starter SKJULT med vilje: på mobil ligger skjemaet over folden, så uten
// dette blinket knappen inn i ~100 ms før IntersectionObserver rakk å måle.
// Bunnpadding bruker safe-area, ellers havner knappen under hjemme-indikatoren
// på iPhone.
export function StickyMobileCta({ label = 'Få gratis vurdering', onClick }) {
  const [hidden, setHidden] = useState(true);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const form = document.getElementById('lp-form');
    let io;
    if (form && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => setHidden(e.isIntersecting));
      }, { threshold: 0.2 });
      io.observe(form);
    } else {
      setHidden(false);
    }
    const onDone = () => setDone(true);
    window.addEventListener('lp:done', onDone);
    return () => { if (io) io.disconnect(); window.removeEventListener('lp:done', onDone); };
  }, []);
  if (done) return null;
  return (
    <div
      aria-hidden={hidden}
      className="lg:hidden fixed inset-x-0 bottom-0 z-[90] px-3 pt-3 bg-gradient-to-t from-[#F3F1EC] via-[#F3F1EC]/95 to-transparent transition-all duration-300"
      style={{
        transform: hidden ? 'translateY(110%)' : 'none',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
        // Løft CTA-en over samtykkebanneret. Uten dette lå hovedknappen bak
        // banneret på førstegangsbesøk — altså nøyaktig det besøket vi betaler
        // for i Google og Meta.
        bottom: 'var(--dh-consent-h, 0px)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <button onClick={onClick} tabIndex={hidden ? -1 : 0} className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#15130F] text-[15px] font-medium text-[#F4F1EA] shadow-[0_12px_28px_-12px_rgba(21,19,15,0.5)] transition-transform active:scale-[0.98]" data-testid="lp-sticky-cta">
          {label} <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
        <a href={`tel:${site.phoneHref}`} aria-label={`Ring oss på ${site.phone}`} tabIndex={hidden ? -1 : 0}
          className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[12px] bg-[#FBFAF8]" style={{ boxShadow: '0 0 0 1px rgba(21,19,15,0.14)' }}>
          <Phone className="h-5 w-5 text-[#15130F]" strokeWidth={1.8} />
        </a>
      </div>
    </div>
  );
}

/* ------------------------------ Exit-intent ------------------------------ */
// Vises maks én gang per økt, kun desktop, aldri etter innsendt skjema.
export function ExitIntent({ headline = 'Vent — vil du vite hva boligen din kan tjene?', body = 'Det tar under ett minutt. Gratis, uforpliktende — og du får svar innen 24 timer.', cta = 'Se hva boligen kan tjene', onCta }) {
  const [open, setOpen] = useState(false);
  const doneRef = useRef(false);
  const ctaRef = useRef(null);

  useEffect(() => {
    const onDone = () => { doneRef.current = true; };
    window.addEventListener('lp:done', onDone);
    const onLeave = (e) => {
      if (doneRef.current) return;
      if (window.innerWidth < 1024) return;
      if (e.clientY > 10) return;
      try {
        if (sessionStorage.getItem('lp_exit_shown')) return;
        sessionStorage.setItem('lp_exit_shown', '1');
      } catch (err) { /* sessionStorage er valgfritt */ }
      setOpen(true);
    };
    document.addEventListener('mouseleave', onLeave);
    return () => { document.removeEventListener('mouseleave', onLeave); window.removeEventListener('lp:done', onDone); };
  }, []);

  // Modal-hygiene: Escape lukker, bakgrunnen låses mot scroll, og fokus
  // flyttes inn i dialogen. Uten dette kunne tastaturbrukere «scrolle»
  // en side de ikke ser, og skjermlesere fikk aldri beskjed om dialogen.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => { try { ctaRef.current?.focus(); } catch (e) { /* fokus er best-effort */ } }, 40);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-5" role="dialog" aria-modal="true" aria-labelledby="lp-exit-title">
      <div className="absolute inset-0" style={{ background: 'rgba(21,19,15,0.56)' }} onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-[460px] rounded-[24px] p-8 sm:p-10" style={{ background: '#F3F1EC', color: '#15130F', boxShadow: '0 40px 100px -30px rgba(21,19,15,0.5)' }}>
        <button onClick={() => setOpen(false)} aria-label="Lukk"
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[#15130F]/[0.06]" style={{ color: 'rgba(21,19,15,0.7)' }}>
          <X className="h-5 w-5" strokeWidth={1.6} />
        </button>
        <p className="text-[13.5px] font-medium" style={{ color: 'rgba(21,19,15,0.5)' }}>Før du går</p>
        <p id="lp-exit-title" className="mt-3 text-[30px] sm:text-[34px]" style={{ fontFamily: 'var(--font-heading), sans-serif', fontWeight: 400, letterSpacing: '-0.03em', lineHeight: 1.04 }}>{headline}</p>
        <p className="mt-4 text-[15.5px] leading-[1.5]" style={{ color: 'rgba(21,19,15,0.64)' }}>{body}</p>
        <button
          ref={ctaRef}
          onClick={() => { setOpen(false); if (onCta) onCta(); }}
          className="group mt-7 flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] text-[15px] font-medium transition-transform active:scale-[0.98]" style={{ background: '#15130F', color: '#F4F1EA' }}
        >
          {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={1.8} />
        </button>
        <a href={`tel:${site.phoneHref}`} className="mt-4 inline-flex items-center gap-2 text-[14px] font-medium transition-colors hover:text-[#15130F]/70" style={{ color: '#15130F' }}>
          <Phone className="h-4 w-4" strokeWidth={1.8} /> …eller ring oss: {site.phone}
        </a>
        <p className="mt-5 inline-flex items-center gap-1.5 text-[12.5px]" style={{ color: 'rgba(21,19,15,0.5)' }}>
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: '#1F9D55' }} strokeWidth={1.8} /> Uforpliktende · 0 kr oppstart · Svar innen 24 t
        </p>
      </div>
    </div>
  );
}

/* ---------------------------- Adresse-søk hook ---------------------------- */
export function useAddressAutocomplete() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);
  const skipRef = useRef(false); // settes ved programmatisk setQuery (valg) → ikke nytt søk
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    const q = query.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: abortRef.current.signal });
        const data = await res.json();
        setSuggestions(Array.isArray(data?.suggestions) ? data.suggestions.slice(0, 6) : []);
        setOpen(true);
      } catch (e) { /* abort/feil = ignore */ }
    }, 220);
    return () => clearTimeout(t);
  }, [query]);
  return { query, setQuery, suggestions, open, setOpen, skipRef };
}
