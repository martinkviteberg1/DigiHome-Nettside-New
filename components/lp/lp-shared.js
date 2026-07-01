'use client';

// Delte byggeklosser for Google Ads-landingssidene (/lp/*).
// Fokus: maksimal konvertering — tillit, lav friksjon, mobil-først.

import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Phone, X, Clock, ShieldCheck } from 'lucide-react';
import { site } from '@/lib/site';

/* ------------------------------- Reveal ------------------------------- */
// Avslører innhold med en myk fade-up når det kommer i viewport.
export function Reveal({ children, delay = 0, className = '', as: Tag = 'div' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'none' : 'translateY(22px)',
        transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
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
const AVATAR_STYLES = [
  { bg: 'linear-gradient(135deg,#9B5BD6,#CF97FC)', color: '#fff' },
  { bg: 'linear-gradient(135deg,#0A0A0A,#3d3d3d)', color: '#fff' },
  { bg: 'linear-gradient(135deg,#18794E,#3fae7c)', color: '#fff' },
  { bg: 'linear-gradient(135deg,#B98A2E,#dfae55)', color: '#fff' },
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
        <span key={i} className="rounded-full border-2 border-canvas inline-flex">
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
export function StickyMobileCta({ label = 'Få gratis vurdering', onClick }) {
  const [hidden, setHidden] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const form = document.getElementById('lp-form');
    let io;
    if (form && typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => setHidden(e.isIntersecting));
      }, { threshold: 0.2 });
      io.observe(form);
    }
    const onDone = () => setDone(true);
    window.addEventListener('lp:done', onDone);
    return () => { if (io) io.disconnect(); window.removeEventListener('lp:done', onDone); };
  }, []);
  if (done) return null;
  return (
    <div
      className="lg:hidden fixed inset-x-0 bottom-0 z-[90] p-3 bg-gradient-to-t from-canvas via-canvas/95 to-transparent transition-all duration-300"
      style={{ transform: hidden ? 'translateY(110%)' : 'none', opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}
    >
      <div className="flex items-center gap-2.5">
        <button onClick={onClick} className="flex-1 h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 shadow-[0_16px_36px_-10px_rgba(10,10,10,0.6)]">
          {label} <ArrowRight className="w-4 h-4" />
        </button>
        <a href={`tel:${site.phoneHref}`} aria-label="Ring oss"
          className="h-[52px] w-[52px] shrink-0 rounded-full bg-surface border border-hairline shadow-[0_12px_28px_-12px_rgba(10,10,10,0.35)] flex items-center justify-center">
          <Phone className="w-5 h-5 text-ink" />
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
      } catch (err) {}
      setOpen(true);
    };
    document.addEventListener('mouseleave', onLeave);
    return () => { document.removeEventListener('mouseleave', onLeave); window.removeEventListener('lp:done', onDone); };
  }, []);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-5" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-[440px] rounded-[26px] bg-surface shadow-[0_60px_140px_-40px_rgba(10,10,10,0.6)] p-8 text-center">
        <button onClick={() => setOpen(false)} aria-label="Lukk"
          className="absolute top-4 right-4 h-8 w-8 rounded-full bg-fill flex items-center justify-center text-ink hover:bg-hairline transition-colors">
          <X className="w-4 h-4" />
        </button>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-lavender/10">
          <Clock className="w-5 h-5 text-lavender" />
        </span>
        <p className="font-heading font-bold text-[24px] leading-tight text-ink mt-4">{headline}</p>
        <p className="text-quiet text-[14.5px] mt-2.5 leading-relaxed">{body}</p>
        <button
          onClick={() => { setOpen(false); if (onCta) onCta(); }}
          className="group mt-6 w-full h-[52px] rounded-full bg-ink text-canvas font-semibold text-[15px] flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-transform"
        >
          {cta} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </button>
        <a href={`tel:${site.phoneHref}`} className="mt-3 inline-flex items-center gap-2 text-[14px] font-medium text-ink hover:text-lavender transition-colors">
          <Phone className="w-4 h-4" /> …eller ring oss: {site.phone}
        </a>
        <p className="mt-4 text-[12px] text-taupe inline-flex items-center gap-1.5 justify-center">
          <ShieldCheck className="w-3.5 h-3.5 text-success" /> Uforpliktende · 0 kr oppstart · Svar innen 24 timer
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
  useEffect(() => {
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
  return { query, setQuery, suggestions, open, setOpen };
}
