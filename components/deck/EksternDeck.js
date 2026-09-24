'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EASE, T, display } from '../forside/v4/motion';

/* ---------------------------------------------------------------------------
   EksternDeck — the outward-facing DigiHome deck (/pitch), English first.

   · Short: 12 pages, readable without a presenter.
   · Static numbers with a date stamp (see TALL in EksternSider.js) — not the
     live budget model. Market figures carry their sources on the page.
   · Same visual language as digihome.no v4: paper, ink, one accent (lilla),
     the display grotesk for headlines. Motion = opacity/transform only.
   · Engine: vertical scroll-snap, one page per gesture, rail on the right,
     arrow keys, progress at the top. Print → one page per sheet (A4 landscape).
   · Gate: the same server-side password as the old deck (/api/deck/auth,
     httpOnly cookie, 30 days). The password is shared with the link.
--------------------------------------------------------------------------- */

export const HAIR = 'rgba(21,19,15,0.10)';
export const DIM = 'rgba(21,19,15,0.62)';
export const SVAK = 'rgba(21,19,15,0.46)';
export const LYS_DIM = 'rgba(244,241,234,0.66)';
export const LYS_SVAK = 'rgba(244,241,234,0.42)';
export const LYS_HAIR = 'rgba(244,241,234,0.12)';

/* Is this page in view? Drives the reveal of its content. */
export function useAktiv(ref) {
  const [aktiv, setAktiv] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setAktiv(true); return undefined; }
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setAktiv(true); }), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return aktiv;
}

/* Reveal helper: staggered rise. */
export const inn = (aktiv, i = 0, y = 18) => ({ opacity: aktiv ? 1 : 0, transform: aktiv ? 'none' : `translateY(${y}px)`, transition: `opacity 800ms ${EASE} ${i * 90}ms, transform 900ms ${EASE} ${i * 90}ms` });

/* Counting number */
export function Tall({ aktiv, til, fmt = (n) => Math.round(n).toLocaleString('en-GB'), dur = 1300 }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!aktiv) return undefined;
    let raf; const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / dur); setV(til * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [aktiv, til, dur]);
  return <>{fmt(v)}</>;
}

/* One page. `morkt` = dark paper. Children get { aktiv }. */
export function Side({ id, nr, navn, morkt, children, bred, testid }) {
  const ref = useRef(null);
  const aktiv = useAktiv(ref);
  const fg = morkt ? T.offwhite : T.ink;
  return (
    <section ref={ref} id={`p-${id}`} className="xd-side relative flex min-h-[100svh] w-full flex-col justify-center" style={{ background: morkt ? T.charcoal : T.canvas, color: fg, scrollSnapAlign: 'start' }} data-testid={testid || `xd-${id}`} data-aktiv={aktiv ? '1' : '0'}>
      <div className={`mx-auto w-full ${bred ? 'max-w-[1440px]' : 'max-w-[1280px]'} px-6 py-20 sm:px-10 lg:px-16 lg:py-20`}>
        {typeof children === 'function' ? children({ aktiv }) : children}
      </div>
      {/* Page furniture: number left, chapter right */}
      <div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-between text-[11.5px] tracking-[0.02em] sm:inset-x-10 lg:inset-x-16" style={{ color: morkt ? LYS_SVAK : SVAK }}>
        <span className="tabular-nums">{String(nr).padStart(2, '0')}</span>
        <span className="hidden sm:inline">DigiHome · {navn}</span>
      </div>
    </section>
  );
}

export function Etikett({ children, morkt, aktiv, i = 0 }) {
  return <p className="text-[13px] font-medium tracking-[0.01em]" style={{ color: morkt ? T.lilla : SVAK, ...inn(aktiv, i, 10) }}>{children}</p>;
}

export function Tittel({ children, morkt, aktiv, i = 1, className = '', maks = '18ch' }) {
  return <h2 className={`mt-4 text-[clamp(38px,5.2vw,76px)] ${className}`} style={{ ...display, color: morkt ? T.offwhite : T.ink, maxWidth: maks, ...inn(aktiv, i) }}>{children}</h2>;
}

export function Punktum({ morkt }) { return <span style={{ color: T.lilla }}>.</span>; }

export function Kilde({ children, morkt, aktiv, i = 6 }) {
  return <p className="mt-8 max-w-[90ch] text-[12px] leading-[1.5]" style={{ color: morkt ? LYS_SVAK : SVAK, ...inn(aktiv, i, 8) }}>{children}</p>;
}

/* The city as dots — a nod to the product's map. Deterministic. */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function Prikkby({ aktiv, n = 320, morkt = true, className = '' }) {
  const pts = useMemo(() => {
    const r = rng(4242); const S = [[520, 300], [700, 420], [860, 260], [980, 440], [640, 560], [820, 600], [1100, 320], [430, 460], [1180, 540], [760, 180]];
    const ut = [];
    for (let i = 0; i < n; i++) { const c = S[Math.floor(r() * S.length)]; const v = r() * Math.PI * 2; const d = 12 + Math.pow(r(), 0.7) * 120; ut.push([c[0] + Math.cos(v) * d, c[1] + Math.sin(v) * d * 0.8, r()]); }
    return ut;
  }, [n]);
  return (
    <svg aria-hidden="true" viewBox="0 0 1600 800" className={className} preserveAspectRatio="xMidYMid slice">
      {pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={1.6 + r * 1.8} fill={r > 0.86 ? T.gronn : morkt ? 'rgba(244,241,234,0.55)' : 'rgba(21,19,15,0.4)'} style={{ transformBox: 'fill-box', transformOrigin: 'center', opacity: aktiv ? (r > 0.86 ? 0.9 : 0.55) : 0, transform: aktiv ? 'scale(1)' : 'scale(0.2)', transition: `opacity 700ms ${EASE} ${200 + (Math.hypot(x - 800, y - 420) * 1.4)}ms, transform 900ms cubic-bezier(0.22,1.2,0.36,1) ${200 + (Math.hypot(x - 800, y - 420) * 1.4)}ms` }} />
      ))}
    </svg>
  );
}

/* ── Gate: same endpoint and cookie as the old deck, new clothes ─────────── */
function Gate({ children }) {
  const [status, setStatus] = useState('checking');
  const [pw, setPw] = useState('');
  const [feil, setFeil] = useState('');
  const [sender, setSender] = useState(false);
  useEffect(() => {
    let ok = true;
    fetch('/api/deck/auth', { credentials: 'same-origin' }).then((r) => r.json()).then((d) => { if (ok) setStatus(d && d.authed ? 'open' : 'locked'); }).catch(() => { if (ok) setStatus('locked'); });
    return () => { ok = false; };
  }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!pw || sender) return;
    setSender(true); setFeil('');
    try {
      const r = await fetch('/api/deck/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ password: pw }) });
      if (r.ok) setStatus('open'); else { setFeil('Wrong password. Please try again.'); setPw(''); }
    } catch (e2) { setFeil('Something went wrong. Please try again.'); }
    setSender(false);
  };
  if (status === 'open') return children;
  return (
    <div className="flex min-h-[100svh] items-center justify-center px-6" style={{ background: T.canvas, color: T.ink }} data-testid="xd-gate">
      {status === 'checking' ? <p className="text-[13px]" style={{ color: SVAK }}>Loading …</p> : (
        <form onSubmit={send} className="w-full max-w-[420px]" style={{ animation: `v4-panel-inn 600ms ${EASE} both` }}>
          <p className="text-[13px] font-medium" style={{ color: T.lilla }}>DigiHome · Investor & partner deck</p>
          <h1 className="mt-3 text-[40px]" style={{ ...display, color: T.ink }}>This deck is shared by invitation<Punktum /></h1>
          <p className="mt-3 text-[15px] leading-[1.55]" style={{ color: DIM }}>Enter the password you received with the link.</p>
          <label className="mt-6 block">
            <span className="sr-only">Password</span>
            <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setFeil(''); }} autoFocus autoComplete="current-password" placeholder="Password" className="h-12 w-full rounded-full px-5 text-[15px] outline-none transition-shadow focus:shadow-[0_0_0_2px_rgba(212,150,255,0.7)]" style={{ background: '#FFFFFF', color: T.ink, boxShadow: `inset 0 0 0 1px ${HAIR}` }} data-testid="xd-gate-pw" />
          </label>
          {feil ? <p className="mt-2 text-[13px]" role="alert" style={{ color: '#B42318' }}>{feil}</p> : null}
          <button type="submit" disabled={!pw || sender} className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-full text-[15px] font-medium transition-[transform,opacity] duration-200 active:scale-[0.98] disabled:opacity-50" style={{ background: T.ink, color: T.offwhite }} data-testid="xd-gate-send">{sender ? 'Opening …' : 'Open the deck'}</button>
          <p className="mt-6 text-[12px]" style={{ color: SVAK }}>Confidential. Please don't forward without asking us first. hei@digihome.no</p>
        </form>
      )}
    </div>
  );
}

/* ── The engine ───────────────────────────────────────────────────────────── */
export default function EksternDeck({ sider, variant = 'investor' }) {
  return <Gate><Motor sider={sider} variant={variant} /></Gate>;
}

/* Mounted only once the gate is open — so the scroll root and observers see the real pages. */
function Motor({ sider, variant }) {
  const rotRef = useRef(null);
  const [aktiv, setAktiv] = useState(0);
  const [redusert, setRedusert] = useState(false);
  useEffect(() => { try { setRedusert(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* ok */ } }, []);

  /* Which page is in view → rail + progress */
  useEffect(() => {
    const rot = rotRef.current; if (!rot) return undefined;
    const els = Array.from(rot.querySelectorAll('.xd-side'));
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) setAktiv(els.indexOf(e.target)); }); }, { root: rot, threshold: 0.55 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sider]);

  const gaaTil = useCallback((i) => {
    const rot = rotRef.current; if (!rot) return;
    const els = rot.querySelectorAll('.xd-side'); const el = els[Math.max(0, Math.min(els.length - 1, i))];
    el?.scrollIntoView({ behavior: redusert ? 'auto' : 'smooth', block: 'start' });
  }, [redusert]);

  useEffect(() => {
    const tast = (e) => {
      if (e.target && /input|textarea/i.test(e.target.tagName)) return;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ' || e.key === 'ArrowRight') { e.preventDefault(); gaaTil(aktiv + 1); }
      if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); gaaTil(aktiv - 1); }
      if (e.key === 'Home') { e.preventDefault(); gaaTil(0); }
      if (e.key === 'End') { e.preventDefault(); gaaTil(sider.length - 1); }
    };
    window.addEventListener('keydown', tast);
    return () => window.removeEventListener('keydown', tast);
  }, [aktiv, gaaTil, sider.length]);

  const morkt = !!sider[aktiv]?.morkt;

  return (
    <>
      <style>{`
        .xd-rot { height: 100svh; overflow-y: auto; scroll-snap-type: y mandatory; scroll-behavior: smooth; scrollbar-width: none; }
        .xd-rot::-webkit-scrollbar { display: none; }
        @media (prefers-reduced-motion: reduce) { .xd-rot { scroll-behavior: auto; } }
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: #fff !important; }
          .xd-rot { height: auto !important; overflow: visible !important; scroll-snap-type: none !important; }
          .xd-side { min-height: 0 !important; height: 210mm !important; page-break-after: always; break-after: page; overflow: hidden; }
          .xd-side:last-child { page-break-after: auto; break-after: auto; }
          .xd-side * { opacity: 1 !important; transform: none !important; transition: none !important; animation: none !important; }
          .xd-skjul { display: none !important; }
        }
      `}</style>

      {/* Progress at the top */}
      <div aria-hidden="true" className="xd-skjul fixed inset-x-0 top-0 z-50 h-[2px]" style={{ background: morkt ? LYS_HAIR : HAIR }}>
        <div className="h-full origin-left" style={{ background: T.lilla, transform: `scaleX(${(aktiv + 1) / sider.length})`, transition: `transform 600ms ${EASE}` }} />
      </div>

      {/* Top bar: brand · counter · PDF */}
      <div className="xd-skjul pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 text-[12.5px] sm:px-10 lg:px-16" style={{ color: morkt ? LYS_DIM : DIM, transition: `color 500ms ${EASE}` }}>
        <span className="pointer-events-auto font-medium" style={{ color: morkt ? T.offwhite : T.ink }}>DigiHome</span>
        <span className="tabular-nums">{String(aktiv + 1).padStart(2, '0')} / {String(sider.length).padStart(2, '0')}</span>
        <button type="button" onClick={() => window.print()} className="pointer-events-auto rounded-full px-3 py-1.5 transition-colors" style={{ boxShadow: `inset 0 0 0 1px ${morkt ? LYS_HAIR : HAIR}`, color: morkt ? T.offwhite : T.ink }} data-testid="xd-pdf">Download PDF</button>
      </div>

      {/* Rail on the right */}
      <nav aria-label="Pages" className="xd-skjul fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-2.5 lg:flex xl:right-6">
        {sider.map((s, i) => (
          <button key={s.id} type="button" onClick={() => gaaTil(i)} aria-label={`${i + 1}. ${s.navn}`} aria-current={i === aktiv ? 'true' : undefined} className="group relative flex items-center justify-end">
            <span className="pointer-events-none absolute right-5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" style={{ background: morkt ? 'rgba(244,241,234,0.1)' : 'rgba(21,19,15,0.06)', color: morkt ? T.offwhite : T.ink }}>{s.navn}</span>
            <span className="block h-1.5 rounded-full transition-all duration-400" style={{ width: i === aktiv ? 22 : 6, background: i === aktiv ? T.lilla : morkt ? 'rgba(244,241,234,0.3)' : 'rgba(21,19,15,0.25)', transition: `width 400ms ${EASE}, background 300ms ${EASE}` }} />
          </button>
        ))}
      </nav>

      <div ref={rotRef} className="xd-rot" data-testid="xd-rot" data-aktiv={aktiv} data-variant={variant}>
        {sider.map((s, i) => {
          const C = s.C;
          return (
            <Side key={s.id} id={s.id} nr={i + 1} navn={s.navn} morkt={s.morkt} bred={s.bred}>
              {({ aktiv: a }) => <C aktiv={a} morkt={s.morkt} variant={variant} gaaTil={gaaTil} />}
            </Side>
          );
        })}
      </div>
    </>
  );
}
