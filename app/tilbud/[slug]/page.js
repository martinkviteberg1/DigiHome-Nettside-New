'use client';

/* ═══════════ OFFENTLIG TILBUDSSIDE — /tilbud/[slug] ═══════════
   Designspråket er overført 1:1 fra DigiHomes forvaltningstilbud
   (ProposalView/TilbudPage i hovedprosjektet):
   · Palett C/D (ink #0A0A0A · page #FEFBFA · subtle #F0EFEB · line #E9E7E4,
     lilla #D298FF KUN som signaturprikk, grønn #2F7D52 kun for økonomi)
   · PP Right Grotesk (font-light + tight tracking) / ABC Diatype
   · Filmatisk 100vh-cover m/ Ken Burns, scrim, grain og sticky avsløring
   · Ordvis maskert tittelreise (dh-rise), Overline m/ lilla prikk + indeks
   · Dokument-avsløring: -mt, rounded-t-[44px], dyp skygge
   · Personlig brev «Hei.» + rådgiversignatur (72px foto/monogram)
   · Mørke kapitler (grain 0.05, spøkelsesnumre), prikkede linjeledere,
     shine-sweep-knapper, FAQ m/ sirkel-chevron, avsluttende svart CTA
   Innholdet er Salgsradarens: før/etter-bilder, prislinjal, regnestykke,
   annonse-preview. Åpninger spores (spor=1). Kontakt → Dialog + varsler. */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';

/* ── Palett — identisk med hovedtilbudet ── */
const C = {
  ink: '#0A0A0A', inkDeep: '#1F1F1F', black: '#0A0A0A', sub: '#5E5D5A', faint: '#9A968F',
  bg: '#FFFFFF', page: '#FEFBFA', subtle: '#F0EFEB', warm: '#FAF9F7', line: '#E9E7E4', hairline: '#F0EFEC',
  purple: '#D298FF', purpleDeep: '#7C3FD6',
  success: '#2F7D52',
};
const D = { chip: 'rgba(255,255,255,0.07)', chipLine: 'rgba(255,255,255,0.10)', icon: 'rgba(255,255,255,0.92)', soft: 'rgba(255,255,255,0.62)', faint: 'rgba(255,255,255,0.42)' };
const head = { fontFamily: 'var(--font-heading)' };
const body = { fontFamily: 'var(--font-body)' };

const LOGO_WHITE = '/digihome-logo-hvit.svg';
const LOGO_INK = '/digihome-wordmark-ink.svg';

const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
const pent = (s) => String(s || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());
const fmtDato = (iso) => { try { return new Date(iso || Date.now()).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
const reduserMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
const initialer = (navn) => String(navn || '?').trim().split(/\s+/).map((d) => d[0]).slice(0, 2).join('').toUpperCase();

/* ── Atmosfærisk filmkorn (identisk data-URL) ── */
const GRAIN_URL = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E\")";

/* ── Tynn leseprogresjon øverst ── */
function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    const oppdater = () => {
      const el = ref.current;
      if (!el) return;
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      el.style.transform = `scaleX(${total > 0 ? Math.min(1, window.scrollY / total) : 0})`;
    };
    const paScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(oppdater); };
    window.addEventListener('scroll', paScroll, { passive: true });
    oppdater();
    return () => { window.removeEventListener('scroll', paScroll); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="fixed left-0 right-0 top-0 z-[60] origin-left" style={{ height: 2.5, backgroundColor: C.ink, transform: 'scaleX(0)' }} aria-hidden />;
}

/* ── Ordvis maskert tittelreise (dh-rise) — som i hovedtilbudet ── */
function SplitHeadline({ lines, className, style, delay = 0.35 }) {
  let idx = -1;
  const still = reduserMotion();
  return (
    <h1 className={className} style={style}>
      <style>{`@keyframes dh-rise{from{transform:translateY(115%)}to{transform:translateY(0)}}`}</style>
      {lines.map((line, li) => {
        const words = String(line).split(' ');
        return (
          <span key={li} className="block" style={{ overflow: 'hidden', paddingBottom: '0.22em' }}>
            {words.map((w, wi) => {
              idx += 1;
              const d = delay + idx * 0.065;
              return (
                <span key={wi} className="inline-block" style={{ overflow: 'hidden', verticalAlign: 'bottom', paddingBottom: '0.22em', marginBottom: '-0.22em' }}>
                  <span className="inline-block" style={still ? undefined : { animation: `dh-rise 0.95s cubic-bezier(0.76,0,0.24,1) ${d}s both` }}>
                    {w}{wi < words.length - 1 ? '\u00A0' : ''}
                  </span>
                </span>
              );
            })}
          </span>
        );
      })}
    </h1>
  );
}

/* ── Scroll-reveal: opacity+y, samme kurve som hovedtilbudet ── */
function Reveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null);
  const [vist, setVist] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || reduserMotion()) { setVist(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVist(true); io.disconnect(); } }, { rootMargin: '-70px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={className}
      style={{ opacity: vist ? 1 : 0, transform: vist ? 'translateY(0)' : 'translateY(22px)', transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>
      {children}
    </div>
  );
}

/* ── Redaksjonell eyebrow — dempet tekst + én behersket lilla signaturprikk ── */
function Overline({ children, light, className = '', index }) {
  return (
    <p className={`flex items-center gap-2.5 font-semibold uppercase ${className}`} style={{ ...body, fontSize: 11.5, letterSpacing: '0.22em', color: light ? D.soft : C.faint }}>
      <span className="inline-block shrink-0 rounded-full" style={{ width: 5, height: 5, backgroundColor: C.purple }} aria-hidden />
      {index && <span className="tabular-nums" style={{ color: light ? D.icon : C.ink }}>{index}</span>}
      {index && <span aria-hidden style={{ opacity: 0.5 }}>—</span>}
      {children}
    </p>
  );
}

/* ── Teller-animasjon for nøkkeltall ── */
function TellOpp({ verdi, ms = 1100 }) {
  const m = Number(verdi) || 0;
  const [vis, setVis] = useState(0);
  const ref = useRef(null);
  const kjort = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = () => {
      if (kjort.current) return;
      kjort.current = true;
      const t0 = performance.now();
      const steg = (t) => {
        const p = Math.min(1, (t - t0) / ms);
        const e = 1 - Math.pow(1 - p, 3);
        setVis(Math.round(m * e));
        if (p < 1) requestAnimationFrame(steg);
      };
      requestAnimationFrame(steg);
    };
    if (typeof IntersectionObserver === 'undefined' || reduserMotion()) { setVis(m); kjort.current = true; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); io.disconnect(); } }, { rootMargin: '-60px' });
    io.observe(el);
    return () => io.disconnect();
  }, [m, ms]);
  return <span ref={ref}>{tall(vis)}</span>;
}

/* ── Prikket linjeleder-rad (label ······ verdi) — som i prisoversikten ── */
function Rad({ l, v, bold, muted, top, dark }) {
  return (
    <div className="flex items-baseline gap-3" style={top ? { paddingTop: 12, borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : C.hairline}`, fontWeight: 600, fontSize: 14 } : undefined}>
      <span className="shrink-0" style={{ color: muted ? (dark ? 'rgba(255,255,255,0.5)' : C.faint) : (dark ? 'rgba(255,255,255,0.55)' : C.sub) }}>{l}</span>
      <span aria-hidden className="mb-[3px] flex-1 self-end border-b border-dotted" style={{ borderColor: dark ? 'rgba(255,255,255,0.20)' : 'rgba(10,10,10,0.16)' }} />
      <span className={`shrink-0 tabular-nums ${bold ? 'font-semibold' : 'font-medium'}`} style={{ color: dark ? '#fff' : C.ink }}>{v}</span>
    </div>
  );
}

/* ── Avsender-avatar: foto hvis det finnes, ellers monogram på subtle ── */
function AvsenderBilde({ avsender, storrelse = 72, radius = 20 }) {
  if (avsender.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avsender.avatar} alt={avsender.navn} className="shrink-0 object-cover" style={{ width: storrelse, height: storrelse, borderRadius: radius, boxShadow: '0 10px 26px rgba(24,20,16,0.16)' }} data-testid="advisor-photo" />;
  }
  return (
    <div className="flex shrink-0 items-center justify-center font-semibold" style={{ width: storrelse, height: storrelse, borderRadius: radius, ...head, fontSize: storrelse * 0.35, backgroundColor: C.subtle, color: C.ink }} data-testid="advisor-monogram">
      {initialer(avsender.navn)}
    </div>
  );
}

/* ── Interaktiv før/etter-slider — Salgsradarens signaturelement ── */
function ForEtter({ forUrl, etterUrl, nokkel, etterEtikett = 'Klargjort av DigiHome' }) {
  const [pos, setPos] = useState(58);
  const boks = useRef(null);
  const drar = useRef(false);
  const brukerHarDratt = useRef(false);

  useEffect(() => {
    brukerHarDratt.current = false;
    if (reduserMotion()) { setPos(58); return; }
    let raf;
    const t0 = performance.now();
    const fra = 74, til = 58, varighet = 1300, forsink = 450;
    setPos(fra);
    const steg = (t) => {
      if (brukerHarDratt.current) return;
      const dt = t - t0 - forsink;
      if (dt < 0) { raf = requestAnimationFrame(steg); return; }
      const p = Math.min(1, dt / varighet);
      const e = 1 - Math.pow(1 - p, 3);
      setPos(fra + (til - fra) * e);
      if (p < 1) raf = requestAnimationFrame(steg);
    };
    raf = requestAnimationFrame(steg);
    return () => cancelAnimationFrame(raf);
  }, [nokkel]);

  const flytt = (clientX) => {
    const el = boks.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (!r.width) return;
    setPos(Math.min(97, Math.max(3, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div
      ref={boks}
      className="relative aspect-[16/10] cursor-ew-resize select-none overflow-hidden rounded-[26px]"
      style={{ backgroundColor: C.subtle, border: `1px solid ${C.line}`, boxShadow: '0 30px 70px rgba(17,24,39,0.14)', touchAction: 'pan-y' }}
      onPointerDown={(e) => { drar.current = { x0: e.clientX, y0: e.clientY, laast: null }; }}
      onPointerMove={(e) => {
        const d = drar.current;
        if (!d) return;
        if (!d.laast) {
          const dx = Math.abs(e.clientX - d.x0);
          const dy = Math.abs(e.clientY - d.y0);
          if (dx > 7 && dx > dy * 1.2) {
            d.laast = 'slider';
            brukerHarDratt.current = true;
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
            flytt(e.clientX);
          } else if (dy > 10 && dy > dx) d.laast = 'scroll';
          return;
        }
        if (d.laast === 'slider') flytt(e.clientX);
      }}
      onPointerUp={(e) => {
        const d = drar.current;
        drar.current = null;
        if (d && !d.laast && Math.abs(e.clientX - d.x0) < 6 && Math.abs(e.clientY - d.y0) < 6) { brukerHarDratt.current = true; flytt(e.clientX); }
      }}
      onPointerCancel={() => { drar.current = null; }}
      role="slider" aria-label="Sammenlign original og klargjort bilde" aria-valuenow={Math.round(pos)} tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { brukerHarDratt.current = true; setPos((p) => Math.max(3, p - 4)); }
        if (e.key === 'ArrowRight') { brukerHarDratt.current = true; setPos((p) => Math.min(97, p + 4)); }
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={etterUrl} alt="Klargjort av DigiHome — AI-stylet illustrasjon" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} fetchPriority="high" data-testid="tilbud-hovedbilde" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={forUrl} alt="Original fra annonsen" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} fetchPriority="high" />
      </div>
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-[2px] bg-white" style={{ boxShadow: '0 0 14px rgba(0,0,0,0.35)' }} />
        <span className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.94)', boxShadow: '0 4px 16px rgba(0,0,0,0.28)' }}>
          <svg width="16" height="11" viewBox="0 0 18 12" fill="none" aria-hidden="true">
            <path d="M5.5 1 1 6l4.5 5M12.5 1 17 6l-4.5 5" stroke={C.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <span className={`pointer-events-none absolute left-4 top-4 rounded-full px-3 py-1 font-semibold transition-opacity duration-200 ${pos > 24 ? 'opacity-100' : 'opacity-0'}`} style={{ fontSize: 11, color: '#fff', backgroundColor: 'rgba(8,7,6,0.5)', backdropFilter: 'blur(6px)' }}>
        Original
      </span>
      <span className={`pointer-events-none absolute right-4 top-4 rounded-full px-3 py-1 font-semibold transition-opacity duration-200 ${pos < 84 ? 'opacity-100' : 'opacity-0'}`} style={{ fontSize: 11, color: '#fff', backgroundColor: 'rgba(8,7,6,0.5)', backdropFilter: 'blur(6px)' }} title="AI-generert forslag basert på annonsens eget foto">
        {etterEtikett} {'\u24D8'}
      </span>
    </div>
  );
}

/* ── Markedsintervall som prislinjal ── */
function IntervallBar({ lo, hi, anbefalt, dagens }) {
  const span = Math.max(1, hi - lo);
  const pos = (v) => Math.min(96, Math.max(4, ((v - lo) / span) * 100));
  const pAnb = pos(anbefalt);
  const pDag = dagens > 0 ? pos(dagens) : null;
  const samme = pDag != null && Math.abs(pDag - pAnb) < 8;
  const just = (p) => (p < 16 ? 'translate-x-0 text-left' : p > 84 ? '-translate-x-full text-right' : '-translate-x-1/2 text-center');
  return (
    <div className="mx-auto w-full max-w-[660px]" data-testid="tilbud-intervall">
      <div className={`relative ${pDag != null && !samme ? 'pb-14' : 'pb-1'} pt-[52px]`}>
        <div className={`absolute top-0 ${just(pAnb)}`} style={{ left: `${pAnb}%` }}>
          <p className="whitespace-nowrap font-semibold uppercase" style={{ ...body, fontSize: 10.5, letterSpacing: '0.14em', color: C.faint }}>
            {samme ? 'Dagens pris · vår anbefaling' : 'Vår anbefaling'}
          </p>
          <p className="mt-0.5 whitespace-nowrap font-medium tabular-nums" style={{ ...head, fontSize: 18, letterSpacing: '-0.01em', color: C.ink }}>{tall(anbefalt)} kr</p>
        </div>
        <div className="h-[5px] rounded-full" style={{ background: `linear-gradient(to right, ${C.subtle}, ${C.line}, ${C.subtle})` }} />
        <span className="absolute h-[15px] w-[15px] rounded-full border-[3px] border-white" style={{ left: `${pAnb}%`, top: 'calc(52px + 2px)', transform: 'translate(-50%, -50%)', background: C.ink, boxShadow: '0 1px 6px rgba(10,10,10,0.4)' }} />
        {pDag != null && !samme && (
          <>
            <span className="absolute block h-[16px] w-[2px] -translate-x-1/2 rounded" style={{ left: `${pDag}%`, top: 'calc(52px + 8px)', backgroundColor: 'rgba(10,10,10,0.35)' }} />
            <div className={`absolute ${just(pDag)}`} style={{ left: `${pDag}%`, top: 'calc(52px + 29px)' }}>
              <p className="whitespace-nowrap font-medium" style={{ fontSize: 11.5, color: C.faint }}>Annonsert i dag</p>
              <p className="whitespace-nowrap font-medium tabular-nums" style={{ ...head, fontSize: 14.5, color: C.sub }}>{tall(dagens)} kr</p>
            </div>
          </>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 tabular-nums" style={{ fontSize: 12, color: C.faint }}>
        <span>{tall(lo)} kr</span>
        <span className="hidden font-medium sm:inline" style={{ fontSize: 11.5 }}>Estimert markedsintervall for boligen</span>
        <span>{tall(hi)} kr</span>
      </div>
      <p className="mt-1 font-medium sm:hidden" style={{ fontSize: 11.5, color: C.faint }}>Estimert markedsintervall for boligen</p>
    </div>
  );
}

/* ── Mini-annonsekort («i dag» → «slik ville vi gjort det») ── */
function MiniAnnonse({ variant, bilde, aiBilde, tittel, adresse, pris, netto }) {
  const dh = variant === 'dh';
  return (
    <div className="flex flex-col overflow-hidden rounded-[26px] transition-all duration-300 hover:-translate-y-1"
      style={{ backgroundColor: C.bg, border: dh ? `1.5px solid ${C.ink}` : `1px solid ${C.line}`, boxShadow: dh ? '0 18px 50px rgba(17,24,39,0.10)' : '0 6px 22px rgba(24,20,16,0.04)' }}>
      <div className="flex items-center justify-between px-5 py-3" style={{ backgroundColor: dh ? C.ink : C.warm, borderBottom: dh ? 'none' : `1px solid ${C.hairline}` }}>
        <span className="font-semibold uppercase" style={{ ...head, fontSize: 10.5, letterSpacing: '0.13em', color: dh ? '#fff' : C.faint }}>
          {dh ? 'DigiHome anbefaler' : 'Annonsen din i dag'}
        </span>
        {dh && aiBilde && <span className="font-semibold" style={{ fontSize: 10, color: D.soft }} title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>}
      </div>
      {bilde ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={bilde} alt={dh ? 'Klargjort hovedbilde' : 'Dagens hovedbilde'} className={`block aspect-[16/9] w-full object-cover ${dh ? '' : 'saturate-[0.88]'}`} loading="lazy" draggable={false} />
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center" style={{ backgroundColor: C.subtle, fontSize: 12, color: C.faint }}>Uten klargjort bilde</div>
      )}
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        <p className="font-medium leading-snug" style={{ ...head, fontSize: 16.5, color: dh ? C.ink : C.sub }}>{tittel}</p>
        <p className="mt-0.5" style={{ fontSize: 12.5, color: C.faint }}>{adresse}</p>
        <div className="mt-auto pt-4">
          <p className="font-medium tabular-nums" style={{ ...head, fontSize: 21, letterSpacing: '-0.01em', color: dh ? C.ink : C.sub }}>{tall(pris)} kr <span style={{ fontSize: 12.5, color: C.faint, fontWeight: 400 }}>/mnd</span></p>
          {dh && netto > 0 && <p className="mt-0.5 font-semibold tabular-nums" style={{ fontSize: 12.5, color: C.success }}>≈ {tall(netto)} kr til deg etter honorar</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Full annonse-preview ── */
function AnnonsePreview({ tilbud, r }) {
  const a = tilbud.annonse;
  const [idx, setIdx] = useState(0);
  const [dode, setDode] = useState([]);
  const bilder = useMemo(() => {
    const stylet = tilbud.stylet || [];
    const kilder = new Set(stylet.map((s) => s.kildeUrl).filter(Boolean));
    const ut = stylet.map((s) => ({ url: `/api/tilbud/bilde?id=${s.id}`, ai: true }));
    for (const b of (tilbud.bilder || [])) if (!kilder.has(b)) ut.push({ url: b, ai: false });
    return ut.filter((b) => !dode.includes(b.url));
  }, [tilbud, dode]);
  const akt = bilder.length ? bilder[Math.min(idx, bilder.length - 1)] : null;
  const bytt = (retn) => setIdx((i) => (i + retn + bilder.length) % bilder.length);
  const fakta = [
    ['Boligtype', tilbud.boligtype ? pent(tilbud.boligtype) : null],
    ['Soverom', tilbud.soverom],
    ['Areal', tilbud.m2 ? `${tilbud.m2} m\u00B2` : null],
    ['Etasje', a.etasje ? `${a.etasje}.` : null],
    ['Møblering', a.mobler ? pent(a.mobler) : null],
  ].filter(([, v]) => v);
  const leie = Number(r.anbefaltLeie) || 0;

  return (
    <div data-testid="tilbud-annonse-preview">
      <div className="overflow-hidden rounded-[26px]" style={{ backgroundColor: C.bg, border: `1px solid ${C.line}` }} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') bytt(-1); if (e.key === 'ArrowRight') bytt(1); }}>
        <div className="flex items-center justify-between px-5 py-3 sm:px-7" style={{ backgroundColor: C.warm, borderBottom: `1px solid ${C.hairline}` }}>
          <span className="rounded-full px-2.5 py-0.5 font-semibold uppercase" style={{ fontSize: 10, letterSpacing: '0.08em', color: '#fff', backgroundColor: C.ink }}>Til leie</span>
          <span className="font-medium" style={{ fontSize: 11.5, color: C.faint }}>Forhåndsvisning av annonsen din</span>
        </div>

        {akt && (
          <div className="group relative" style={{ backgroundColor: C.ink }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={akt.url} alt="Bilde fra annonsen" className="block aspect-[2/1] w-full object-cover" draggable={false} loading="lazy"
              data-testid="tilbud-annonse-bilde" onError={() => setDode((d) => (d.includes(akt.url) ? d : [...d, akt.url]))} />
            {akt.ai && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-full px-2.5 py-0.5 font-semibold" style={{ fontSize: 10, color: '#fff', backgroundColor: 'rgba(8,7,6,0.5)', backdropFilter: 'blur(6px)' }} title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>
            )}
            {bilder.length > 1 && (
              <>
                {[['\u2039', -1, 'left-2', 'Forrige bilde'], ['\u203A', 1, 'right-2', 'Neste bilde']].map(([tegn, retn, posKl, label]) => (
                  <button key={label} type="button" aria-label={label} onClick={() => bytt(retn)}
                    className={`absolute ${posKl} top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[18px] leading-none text-white transition-all sm:opacity-0 sm:group-hover:opacity-100`}
                    style={{ backgroundColor: 'rgba(8,7,6,0.4)', backdropFilter: 'blur(6px)' }}>
                    {tegn}
                  </button>
                ))}
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full px-2.5 py-0.5 font-semibold tabular-nums" style={{ fontSize: 11, color: '#fff', backgroundColor: 'rgba(8,7,6,0.5)' }}>
                  {Math.min(idx, bilder.length - 1) + 1} / {bilder.length}
                </span>
              </>
            )}
          </div>
        )}

        <div className="px-5 pb-2 pt-6 sm:px-7">
          <h3 className="font-medium leading-snug" style={{ ...head, fontSize: 22, letterSpacing: '-0.01em', color: C.ink }} data-testid="tilbud-annonse-tittel">{a.tittel}</h3>
          <p className="mt-1" style={{ fontSize: 13.5, color: C.faint }}>{pent(tilbud.adresse)}{tilbud.postnr ? `, ${tilbud.postnr} Bergen` : ', Bergen'}</p>
          {leie > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="font-medium tabular-nums" style={{ ...head, fontSize: 25, letterSpacing: '-0.01em', color: C.ink }}>{tall(leie)} kr <span style={{ fontSize: 14, color: C.faint, fontWeight: 400 }}>/mnd</span></span>
              <span className="tabular-nums" style={{ fontSize: 12.5, color: C.faint }}>Depositum: {tall(leie * 3)} kr</span>
            </div>
          )}
        </div>

        {fakta.length > 0 && (
          <div className={`mx-5 mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[16px] sm:mx-7 ${fakta.length >= 5 ? 'sm:grid-cols-5' : fakta.length === 4 ? 'sm:grid-cols-4' : fakta.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
            style={{ border: `1px solid ${C.hairline}`, backgroundColor: C.hairline }}>
            {fakta.map(([l, v]) => (
              <div key={l} className="px-3.5 py-2.5" style={{ backgroundColor: C.warm }}>
                <p className="font-medium" style={{ fontSize: 10.5, color: C.faint }}>{l}</p>
                <p className="mt-0.5 font-medium" style={{ ...head, fontSize: 14, color: C.ink }}>{v}</p>
              </div>
            ))}
            {fakta.length % 2 === 1 && <div className="sm:hidden" style={{ backgroundColor: C.warm }} />}
          </div>
        )}

        <div className="px-5 pt-4 sm:px-7">
          {(a.hoydepunkter || []).length > 0 && (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {a.hoydepunkter.map((h) => (
                <li key={h} className="flex items-start gap-2 font-medium" style={{ fontSize: 13.5, color: '#3a342c' }}>
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="mt-[3px] shrink-0" aria-hidden="true">
                    <path d="m3.6 9.4 3.4 3.4 7.4-7.6" stroke={C.success} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {h}
                </li>
              ))}
            </ul>
          )}
          {(a.fasiliteter || []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5" data-testid="tilbud-annonse-fasiliteter">
              {a.fasiliteter.map((f) => (
                <span key={f} className="rounded-full px-3 py-1 font-medium" style={{ fontSize: 12.5, color: C.sub, backgroundColor: C.subtle, border: `1px solid ${C.line}` }}>{f}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 pb-6 pt-4 sm:px-7">
          <p className="font-semibold uppercase" style={{ ...head, fontSize: 11, letterSpacing: '0.13em', color: C.faint }}>Om boligen</p>
          <div className="mt-2.5 max-w-[640px] space-y-3">
            {String(a.beskrivelse).split(/\n{2,}/).map((avsn, i) => (
              <p key={i} style={{ fontSize: 14.5, lineHeight: 1.7, color: '#3a342c' }}>{avsn}</p>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 px-5 py-4 sm:px-7" style={{ backgroundColor: C.warm, borderTop: `1px solid ${C.hairline}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_INK} alt="DigiHome" style={{ height: 15, width: 'auto' }} />
          <span style={{ fontSize: 12, color: C.faint }}>Utleiemegler · håndterer visninger, kontrakt og oppfølging</span>
        </div>
      </div>
      <p className="mt-3" style={{ fontSize: 12, lineHeight: 1.6, color: C.faint }}>
        Forhåndsvisning — endelig annonse tilpasses sammen med deg før publisering. AI-forbedrede bilder er basert på annonsens egne foto.
      </p>
    </div>
  );
}

export default function TilbudSide() {
  const params = useParams();
  const slug = String(params?.slug || '');
  const [tilbud, setTilbud] = useState(null);
  const [laster, setLaster] = useState(true);
  const [feil, setFeil] = useState('');
  const [skjema, setSkjema] = useState({ telefon: '', melding: '' });
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [aktivStylet, setAktivStylet] = useState(0);
  const [visAnnonse, setVisAnnonse] = useState(false);
  const [visBunn, setVisBunn] = useState(false);
  const [scrollet, setScrollet] = useState(false); // forbi coveret → toppbar
  const [aapen, setAapen] = useState(0);           // åpen FAQ-rad
  const coverRef = useRef(null);
  const morkRef = useRef(null);                    // scroll-drevet formørkning av coveret

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        // ?preview=1 (admin-forhåndsvisning i Salgsradar) skal ALDRI telle som åpning
        const erPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('preview');
        const r = await fetch(`/api/tilbud?slug=${encodeURIComponent(slug)}&spor=${erPreview ? '0' : '1'}`);
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || 'Fant ikke tilbudet');
        setTilbud(j.tilbud);
      } catch (e) { setFeil(e.message); }
      setLaster(false);
    })();
  }, [slug]);

  // Toppbar forbi coveret + sticky bunn-CTA (mobil) + cover-formørkning
  useEffect(() => {
    let raf = 0;
    const sjekk = () => {
      const vh = window.innerHeight || 800;
      const kontakt = document.getElementById('kontakt');
      const kontaktSynlig = kontakt ? kontakt.getBoundingClientRect().top < vh - 80 : false;
      setVisBunn(window.scrollY > vh * 0.9 && !kontaktSynlig);
      setScrollet(window.scrollY > vh * 0.72);
      // Coveret trekker seg inn i blekk etter hvert som dokumentet avdekkes over det
      if (morkRef.current) morkRef.current.style.opacity = String(Math.min(0.62, (window.scrollY / vh) * 0.62));
    };
    const paScroll = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(sjekk); };
    window.addEventListener('scroll', paScroll, { passive: true });
    sjekk();
    return () => { window.removeEventListener('scroll', paScroll); cancelAnimationFrame(raf); };
  }, []);

  const send = async () => {
    if (sender || !skjema.telefon.trim()) return;
    setSender(true);
    setFeil('');
    try {
      const r = await fetch('/api/tilbud/kontakt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, telefon: skjema.telefon, melding: skjema.melding }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || 'Noe gikk galt');
      setSendt(true);
    } catch (e) { setFeil(e.message); }
    setSender(false);
  };

  const tilKontakt = useCallback(() => {
    if (typeof document !== 'undefined') document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const r = tilbud?.regnestykke || {};
  const anbefalt = Number(r.anbefaltLeie) || 0;
  const netto = Number(r.nettoTilEier) || 0;
  const dagens = Number(r.dagensPris) || 0;
  const gevinst = r.gevinstMnd;
  const stylet = tilbud?.stylet || [];
  const valgtStylet = stylet[aktivStylet] || null;
  const originalBilde = (tilbud?.bilder || [])[0] || null;
  const harAnnonse = Boolean(tilbud?.annonse);
  const grunnlag = tilbud?.grunnlag || null;
  const vurdertDato = fmtDato(tilbud?.vurdert);

  // Avsenderen — tildelt selger, ellers DigiHomes generiske kontaktperson
  const avsender = tilbud?.selger?.navn
    ? { ...tilbud.selger, generisk: false }
    : { navn: 'Sarah Sleeman', tittel: 'din kontaktperson i DigiHome', epost: '', telefon: '', avatar: '/brand/sarah-sleeman-360.webp', generisk: true };
  const fornavn = (avsender.navn || '').split(/\s+/)[0] || 'oss';

  const coverBilde = stylet.length ? `/api/tilbud/bilde?id=${stylet[0].id}` : originalBilde;
  const dhBilde = coverBilde;

  const intervall = useMemo(() => {
    if (!anbefalt) return null;
    const rund = (x) => Math.round(x / 100) * 100;
    return [rund(anbefalt * 0.97), rund(anbefalt * 1.03)];
  }, [anbefalt]);

  const fakta = useMemo(() => [
    tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null, tilbud?.boligtype ? pent(tilbud.boligtype) : null,
  ].filter(Boolean), [tilbud]);

  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const nyTittel = harAnnonse && tilbud?.tittel && norm(tilbud.annonse.tittel) !== norm(tilbud.tittel);
  const sammenligningsPunkter = useMemo(() => {
    const ut = [];
    if (dagens && anbefalt) {
      if (anbefalt > dagens) ut.push(['Prisen', `Dagens annonse ligger ${tall(anbefalt - dagens)} kr under det vi mener boligen bærer. Vurderingen bygger på hva sammenlignbare boliger faktisk leies ut for i porteføljen vår — ikke på annonsepriser.`]);
      else if (anbefalt === dagens) ut.push(['Prisen', 'Dagens pris treffer godt — den beholder vi. Vår jobb blir å hente den raskt, med riktig leietaker fra første visning.']);
      else ut.push(['Prisen', `Vi anbefaler ${tall(dagens - anbefalt)} kr lavere enn dagens annonse. Riktig pris fra dag én gir kortere ledighet — og mer utbetalt over året totalt.`]);
    }
    if (nyTittel) ut.push(['Tittelen', 'Vi har skrevet den om, slik at den løfter frem det leietakere i denne målgruppen faktisk ser etter når de skanner annonser.']);
    if (stylet.length) ut.push(['Bildene', `${stylet.length === 1 ? 'Hovedbildet er' : `${stylet.length} av bildene er`} klargjort med riktig lys og presentasjon — det er det første leietakere sorterer på i søkeresultatet.`]);
    if (harAnnonse && (tilbud?.annonse?.hoydepunkter || []).length) ut.push(['Målgruppen', 'Annonseteksten er spisset mot leietakerne som betaler best for akkurat denne typen bolig — ikke skrevet for alle.']);
    return ut.slice(0, 4);
  }, [dagens, anbefalt, nyTittel, stylet.length, harAnnonse, tilbud]);
  const visSammenligning = dagens > 0 && (harAnnonse || stylet.length > 0) && sammenligningsPunkter.length > 0;

  const brev = tilbud?.tekst?.heroIntro
    || 'Vi har sett nærmere på boligen din og laget en konkret vurdering: hva den bør leies ut for, hvordan vi ville presentert den — og hva du sitter igjen med hvis vi gjør hele jobben for deg.';
  const potensialTekst = tilbud?.tekst?.potensialTekst || '';

  const maxW = 1120;
  const padX = 'px-5 sm:px-6 lg:px-10';
  const idag = new Date().toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });

  if (laster) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4" style={{ backgroundColor: C.page }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_INK} alt="DigiHome" className="h-6 w-auto opacity-90" />
        <div className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: 'rgba(10,10,10,0.15)', borderTopColor: 'rgba(10,10,10,0.6)' }} />
      </div>
    );
  }
  if (!tilbud) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6" style={{ backgroundColor: C.page }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_INK} alt="DigiHome" className="h-6 w-auto opacity-90" />
        <p className="text-center" style={{ fontSize: 14, color: C.faint }}>{feil || 'Fant ikke tilbudet.'}</p>
      </div>
    );
  }

  /* Shine-sweep CTA — identisk knappspråk som hovedtilbudet */
  const ShineKnapp = ({ children, onClick, disabled, testid, lys = false, className = '' }) => (
    <button onClick={onClick} disabled={disabled} data-testid={testid}
      className={`group relative inline-flex h-[54px] items-center justify-center gap-2.5 overflow-hidden rounded-full px-8 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 ${className}`}
      style={{ ...body, fontSize: 15.5, ...(lys ? { backgroundColor: '#FFFFFF', color: C.ink, boxShadow: '0 16px 44px rgba(0,0,0,0.34)' } : { backgroundColor: C.ink, color: '#fff', boxShadow: '0 14px 36px rgba(17,24,39,0.22)' }) }}>
      <span className="pointer-events-none absolute bottom-0 left-0 top-0 w-1/3 -translate-x-[220%] -skew-x-[20deg] transition-transform duration-[850ms] ease-out group-hover:translate-x-[420%]" aria-hidden
        style={{ background: `linear-gradient(90deg, transparent, ${lys ? 'rgba(17,24,39,0.06)' : 'rgba(255,255,255,0.26)'}, transparent)` }} />
      <span className="relative z-[1] inline-flex items-center gap-2.5">{children}</span>
    </button>
  );

  return (
    <div style={{ ...body, backgroundColor: C.black, color: C.ink }} className="min-h-screen" data-testid="tilbud-side">
      <ScrollProgress />
      {/* Filmkorn over hele siden */}
      <div className="pointer-events-none fixed inset-0 z-[58]" aria-hidden style={{ backgroundImage: GRAIN_URL, opacity: 0.035, mixBlendMode: 'multiply' }} />

      {/* ── Toppbar — glir inn når coveret er forbi ── */}
      <div className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${scrollet ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-4 opacity-0'}`}
        style={{ backgroundColor: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(22px)', borderBottom: `1px solid ${C.hairline}` }}>
        <div className={`${padX} mx-auto flex h-[64px] items-center justify-between gap-4`} style={{ maxWidth: maxW }}>
          <span className="flex min-w-0 items-center gap-4" data-testid="tilbud-header-kontekst">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_INK} alt="DigiHome" className="h-[18px] w-auto shrink-0" />
            <span className="hidden truncate font-medium sm:inline" style={{ ...head, fontSize: 14, color: C.ink }}>{pent(tilbud.adresse)}</span>
            {netto > 0 && <span className="hidden shrink-0 font-semibold tabular-nums md:inline" style={{ fontSize: 13, color: C.success }}>{tall(netto)} kr til deg/mnd</span>}
          </span>
          <button onClick={tilKontakt} data-testid="tilbud-topp-cta"
            className="h-10 shrink-0 rounded-full px-5 font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{ ...body, fontSize: 13.5, backgroundColor: C.ink, color: '#fff' }}>
            Snakk med {fornavn}
          </button>
        </div>
      </div>

      {/* ══ FILMATISK COVER — sticky: dokumentet avdekkes OVER coveret ══ */}
      <section ref={coverRef} className="relative flex w-full flex-col overflow-hidden lg:sticky lg:top-0" style={{ minHeight: '100svh', backgroundColor: C.black }} data-testid="hero-section">
        <style>{`@keyframes dh-kenburns{from{transform:scale(1.06)}to{transform:scale(1.13)}}@keyframes dh-cue{0%{transform:translateY(-14px)}100%{transform:translateY(44px)}}`}</style>
        {/* Lag 1 — full-bleed bilde med Ken Burns */}
        <div className="absolute inset-0 overflow-hidden" aria-hidden>
          {coverBilde && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverBilde} alt="" fetchPriority="high" className="h-full w-full object-cover"
              style={{ objectPosition: 'center 38%', animation: reduserMotion() ? 'none' : 'dh-kenburns 28s ease-in-out infinite alternate' }} />
          )}
          <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10,9,8,0.16)' }} />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(8,7,6,0.95) 0%, rgba(8,7,6,0.88) 18%, rgba(8,7,6,0.56) 42%, rgba(8,7,6,0.18) 68%, rgba(8,7,6,0.32) 100%)' }} />
          <div className="absolute inset-x-0 top-0" style={{ height: 180, background: 'linear-gradient(to bottom, rgba(8,7,6,0.52), transparent)' }} />
          <div className="absolute inset-0" style={{ backgroundImage: GRAIN_URL, opacity: 0.10, mixBlendMode: 'overlay' }} />
        </div>
        {/* Scroll-drevet formørkning — coveret trekker seg inn i blekk */}
        <div ref={morkRef} className="pointer-events-none absolute inset-0" aria-hidden style={{ backgroundColor: C.black, opacity: 0 }} />

        {/* Lag 2 — UI */}
        <div className="relative z-10 flex flex-1 flex-col">
          <div className={`${padX} mx-auto flex w-full items-center justify-between pt-8 lg:pt-10`} style={{ maxWidth: maxW }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_WHITE} alt="DigiHome" className="h-[26px] w-auto lg:h-[30px]" />
            <div className="flex items-center gap-3">
              {vurdertDato ? (
                <span className="rounded-full font-medium" style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.22)', padding: '4px 12px' }}>Vurdert {vurdertDato}</span>
              ) : (
                <span className="hidden sm:inline" style={{ ...body, fontSize: 12, color: D.soft }}>{idag}</span>
              )}
            </div>
          </div>

          <div className="flex-1" />

          <div className={`${padX} mx-auto w-full pb-[12vh] lg:pb-[14vh]`} style={{ maxWidth: maxW }}>
            <p className="mb-4 flex items-center gap-2.5 font-medium uppercase" style={{ ...body, fontSize: 'clamp(11px, 1.1vw, 12.5px)', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.92)', textShadow: '0 1px 18px rgba(0,0,0,0.55)' }}>
              <span className="inline-block rounded-full" style={{ width: 5, height: 5, backgroundColor: C.purple }} />
              Personlig utleievurdering
            </p>

            <SplitHeadline lines={[pent(tilbud.adresse)]} className="font-light tracking-[-0.05em] text-white" data-testid="tilbud-hero-adresse"
              style={{ ...head, fontSize: 'clamp(38px, 8.2vw, 108px)', lineHeight: 0.92, textShadow: '0 2px 44px rgba(0,0,0,0.5)' }} />
            <span className="sr-only" data-testid="tilbud-hero-adresse-tekst">{pent(tilbud.adresse)}</span>

            <p className="mt-6" style={{ ...body, fontSize: 'clamp(14.5px, 1.6vw, 16.5px)', color: 'rgba(255,255,255,0.82)', textShadow: '0 1px 16px rgba(0,0,0,0.5)', maxWidth: 480 }}>
              Vi har laget en konkret vurdering av utleiepotensialet — {[...fakta].slice(0, 2).join(' · ') || 'boligen din'}{tilbud.postnr ? ` · ${tilbud.postnr} Bergen` : ' · Bergen'}.
            </p>

            {/* Hero-meta: nøkkeltall skilt med hårlinjer */}
            <div className="mt-9 flex flex-wrap items-start gap-x-10 gap-y-5">
              {[
                anbefalt > 0 ? ['Anbefalt leie', `${tall(anbefalt)} kr/mnd`] : null,
                netto > 0 ? ['Til deg etter honorar', `${tall(netto)} kr/mnd`] : null,
                grunnlag ? ['Vurdert mot', `${grunnlag.antallILeide} leieforhold`] : null,
              ].filter(Boolean).map(([l, v], i) => (
                <div key={l} className={i > 0 ? 'pl-10' : ''} style={i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.18)' } : undefined}>
                  <p className="mb-1.5 font-medium uppercase" style={{ ...body, fontSize: 10.5, letterSpacing: '0.16em', color: 'rgba(255,255,255,0.74)', textShadow: '0 1px 14px rgba(0,0,0,0.55)' }}>{l}</p>
                  <p className="font-light tabular-nums tracking-[-0.02em]" style={{ ...head, fontSize: 'clamp(22px, 2.4vw, 27px)', color: '#fff', textShadow: '0 2px 22px rgba(0,0,0,0.5)' }}>{v}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2" style={{ fontSize: 12.5, color: D.soft }}>
              {['Uforpliktende', 'Ingen bindingstid', 'Du godkjenner alt'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="m3.6 9.4 3.4 3.4 7.4-7.6" stroke={D.icon} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll-cue */}
        <div className="absolute z-10 hidden flex-col items-center gap-3 sm:flex" style={{ bottom: '4.5vh', left: '50%', transform: 'translateX(-50%)' }} data-testid="scroll-cue-indicator">
          <span className="uppercase" style={{ ...body, fontSize: 9.5, letterSpacing: '0.32em', color: 'rgba(255,255,255,0.5)' }}>Bla ned</span>
          <div className="relative overflow-hidden rounded-full" style={{ width: 1.5, height: 44, backgroundColor: 'rgba(255,255,255,0.22)' }}>
            <div className="absolute left-0 right-0 rounded-full" style={{ height: 14, backgroundColor: '#fff', animation: reduserMotion() ? 'none' : 'dh-cue 1.7s ease-in-out infinite' }} />
          </div>
        </div>
      </section>

      {/* ══ DOKUMENT-AVSLØRING — varmt innhold glir opp over coveret ══ */}
      <div id="dokument" className="relative z-20 -mt-[7vh] overflow-hidden rounded-t-[28px] md:-mt-[12vh] md:rounded-t-[44px]" style={{ backgroundColor: C.page, boxShadow: '0 -34px 80px rgba(8,7,6,0.42)' }} data-testid="document-reveal">

        {/* ── PERSONLIG BREV ── */}
        <section className={`${padX} mx-auto pb-16 pt-16 lg:pb-24 lg:pt-28`} style={{ maxWidth: maxW }} data-testid="cover-letter">
          <Reveal className="mb-9 lg:mb-12">
            <Overline className="mb-6">Et personlig tilbud</Overline>
            <h2 className="font-light leading-[0.98] tracking-[-0.04em]" style={{ ...head, fontSize: 'clamp(44px, 6.8vw, 76px)', color: C.ink }}>Hei.</h2>
          </Reveal>

          <Reveal>
            <div className="flex flex-col gap-6" style={{ maxWidth: 640 }}>
              <p style={{ fontSize: 'clamp(17px, 1.75vw, 19.5px)', lineHeight: 1.78, color: C.sub }} data-testid="tilbud-hero-intro">{brev}</p>
              <p style={{ fontSize: 'clamp(17px, 1.75vw, 19.5px)', lineHeight: 1.78, color: C.sub }}>
                Alt på denne siden er laget spesifikt for boligen din. <span style={{ color: C.ink, fontWeight: 500 }}>Ta det i ditt eget tempo</span> — og ring meg gjerne når som helst.
              </p>
            </div>
          </Reveal>

          {potensialTekst && potensialTekst.length <= 220 && (
            <Reveal>
              <figure className="mt-12 lg:mt-16" style={{ maxWidth: 820 }} data-testid="cover-personal-message">
                <div className="pl-6 lg:pl-9" style={{ borderLeft: `2px solid ${C.purple}` }}>
                  <blockquote className="font-light tracking-[-0.02em]" style={{ ...head, fontSize: 'clamp(24px, 3.4vw, 38px)', lineHeight: 1.3, color: C.ink }}>{`\u201C${potensialTekst}\u201D`}</blockquote>
                </div>
              </figure>
            </Reveal>
          )}

          {/* Signatur — avsenderen foldet elegant inn i brevet */}
          <Reveal>
            <div className="mt-14 flex items-center gap-5 pt-9 lg:mt-20" style={{ borderTop: `1px solid ${C.line}`, maxWidth: 640 }} data-testid="tilbud-avsender">
              <AvsenderBilde avsender={avsender} />
              <div className="min-w-0 flex-1">
                <p className="font-medium" style={{ ...head, fontSize: 21, color: C.ink, letterSpacing: '-0.01em' }}>{avsender.navn}</p>
                <p style={{ fontSize: 13.5, color: C.sub }}>{avsender.tittel}{avsender.generisk ? '' : ' · DigiHome'}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5">
                  {avsender.epost && (
                    <a href={`mailto:${avsender.epost}`} className="flex items-center gap-2 transition-colors hover:text-[#111827]" style={{ fontSize: 13.5, color: C.sub }} data-testid="advisor-email">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" stroke={C.faint} strokeWidth="1.8" /><path d="m3.5 7 8.5 6 8.5-6" stroke={C.faint} strokeWidth="1.8" strokeLinecap="round" /></svg>
                      {avsender.epost}
                    </a>
                  )}
                  {avsender.telefon ? (
                    <a href={`tel:${avsender.telefon.replace(/\s/g, '')}`} className="flex items-center gap-2 transition-colors hover:text-[#111827]" style={{ fontSize: 13.5, color: C.sub }} data-testid="advisor-phone">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6.6 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.9 5.9l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A17.5 17.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" stroke={C.faint} strokeWidth="1.8" strokeLinejoin="round" /></svg>
                      {avsender.telefon}
                    </a>
                  ) : (
                    <button onClick={tilKontakt} className="font-semibold transition-colors hover:text-[#111827]" style={{ fontSize: 13.5, color: C.sub }}>Be om å bli oppringt →</button>
                  )}
                </div>
              </div>
            </div>
          </Reveal>
        </section>

        {/* ══ 01 · BILDENE — før/etter (Salgsradarens signaturelement) ══ */}
        {valgtStylet && (
          <section className={`${padX} mx-auto pb-16 lg:pb-28`} style={{ maxWidth: maxW }}>
            <Reveal className="mb-10 lg:mb-14">
              <Overline index="01" className="mb-5">Bildene</Overline>
              <h2 className="font-light leading-[1.0] tracking-[-0.04em]" style={{ ...head, fontSize: 'clamp(34px, 5vw, 56px)', color: C.ink }}>Vi har allerede løftet presentasjonen.</h2>
              <p className="mt-6 leading-[1.75]" style={{ fontSize: 'clamp(16.5px, 1.6vw, 18px)', color: C.sub, maxWidth: 640 }}>
                Dra i linjen — annonsens originalbilde til venstre, vår klargjorte versjon til høyre. Det er detaljene leietakere sorterer på.
              </p>
            </Reveal>
            <Reveal>
              <div className="mx-auto" style={{ maxWidth: 880 }}>
                <ForEtter
                  forUrl={valgtStylet.kildeUrl || originalBilde}
                  etterUrl={`/api/tilbud/bilde?id=${valgtStylet.id}`}
                  nokkel={valgtStylet.id}
                  etterEtikett={['optimal', 'lysloft'].includes(valgtStylet.stil) ? 'Klargjort av DigiHome' : 'AI-møblert · illustrasjon'}
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p style={{ fontSize: 12.5, color: C.faint }}>Dra i linjen — original til venstre, klargjort av oss til høyre.</p>
                  {stylet.length > 1 && <p className="shrink-0 tabular-nums" style={{ fontSize: 12, color: C.faint }}>{aktivStylet + 1} av {stylet.length}</p>}
                </div>
                {stylet.length > 1 && (
                  <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                    {stylet.map((s, i) => (
                      <button key={s.id} type="button" onClick={() => setAktivStylet(i)} className="relative shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/tilbud/bilde?id=${s.id}`} alt={s.stil ? `Stil: ${s.stil}` : ''} loading="lazy"
                          className="h-14 w-[84px] rounded-[12px] object-cover transition-all"
                          style={i === aktivStylet ? { boxShadow: `0 0 0 2px ${C.page}, 0 0 0 4px ${C.ink}` } : { opacity: 0.55 }} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          </section>
        )}

        {/* ══ 02 · VURDERINGEN — sentrert kjempe-tall + prislinjal (subtle-flate) ══ */}
        <section id="hvorfor" className="scroll-mt-20 py-16 lg:py-28" style={{ backgroundColor: C.subtle }} data-testid="income-estimate">
          <div className={`${padX} mx-auto`} style={{ maxWidth: maxW }}>
            <Reveal className="mb-12 text-center lg:mb-16">
              <div className="mb-5 flex justify-center"><Overline index="02">Vurderingen</Overline></div>
              {anbefalt > 0 ? (
                <>
                  <p className="font-light leading-[0.9] tabular-nums tracking-[-0.055em]" style={{ ...head, fontSize: 'clamp(64px, 9.5vw, 104px)', color: C.ink }}><TellOpp verdi={anbefalt} /></p>
                  <p className="mt-3 font-semibold uppercase" style={{ ...head, fontSize: 12.5, letterSpacing: '0.16em', color: C.faint }}>kr anbefalt månedsleie</p>
                  {netto > 0 && (
                    <p className="mt-5" style={{ fontSize: 15, color: C.sub }} data-testid="tilbud-hero-netto">
                      ≈ <span className="font-semibold tabular-nums" style={{ color: C.success }}>{tall(netto)} kr til deg</span> hver måned etter DigiHome-honorar ({r.honorarPct} % eks. mva)
                    </p>
                  )}
                </>
              ) : (
                <h2 className="font-light tracking-[-0.03em]" style={{ ...head, fontSize: 'clamp(30px, 4vw, 44px)', color: C.ink }}>Vår vurdering av {pent(tilbud.adresse)}</h2>
              )}
              {potensialTekst && potensialTekst.length > 220 && (
                <p className="mx-auto mt-5 leading-[1.7]" style={{ fontSize: 15.5, color: C.sub, maxWidth: 580 }}>{potensialTekst}</p>
              )}
            </Reveal>

            {(intervall || grunnlag) && (
              <Reveal>
                <div className="mx-auto overflow-hidden rounded-[26px]" style={{ maxWidth: 880, backgroundColor: C.bg, border: `1px solid ${C.line}` }}>
                  {intervall && (
                    <div className="px-6 pb-6 pt-7 sm:px-10 sm:pb-7 sm:pt-8">
                      <IntervallBar lo={intervall[0]} hi={intervall[1]} anbefalt={anbefalt} dagens={dagens} />
                    </div>
                  )}
                  {grunnlag && (
                    <div className="flex flex-wrap items-baseline justify-center gap-x-12 gap-y-4 px-6 py-5 text-center sm:px-10" style={intervall ? { borderTop: `1px solid ${C.hairline}`, backgroundColor: C.warm } : undefined} data-testid="tilbud-grunnlag">
                      <div>
                        <p className="font-medium tabular-nums tracking-[-0.015em]" style={{ ...head, fontSize: 21, color: C.ink }}>{grunnlag.antallILeide}</p>
                        <p className="mt-0.5" style={{ fontSize: 12.5, color: C.faint }}>faktiske leieforhold i grunnlaget</p>
                      </div>
                      {grunnlag.antallISone > 0 && (
                        <div>
                          <p className="font-medium tabular-nums tracking-[-0.015em]" style={{ ...head, fontSize: 21, color: C.ink }}>{grunnlag.antallISone}</p>
                          <p className="mt-0.5" style={{ fontSize: 12.5, color: C.faint }}>utleid i samme postsone{grunnlag.sone ? ` (${grunnlag.sone})` : ''}</p>
                        </div>
                      )}
                      {grunnlag.snittSone > 0 && (
                        <div>
                          <p className="font-medium tabular-nums tracking-[-0.015em]" style={{ ...head, fontSize: 21, color: C.ink }}>{tall(grunnlag.snittSone)} kr</p>
                          <p className="mt-0.5" style={{ fontSize: 12.5, color: C.faint }}>snitt oppnådd leie i sonen</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Reveal>
            )}
            <p className="mt-8 text-center" style={{ fontSize: 12, color: C.faint }}>
              Vurderingen er gjort mot faktiske leieinntekter i DigiHomes egen portefølje i Bergen. Endelig leie settes alltid sammen med deg.
            </p>
          </div>
        </section>

        {/* ══ 03 · ANNONSEN — i dag → slik ville vi gjort det ══ */}
        {visSammenligning && (
          <section className={`${padX} mx-auto py-16 lg:py-28`} style={{ maxWidth: maxW }}>
            <Reveal className="mb-10 lg:mb-14">
              <Overline index="03" className="mb-5">Annonsen</Overline>
              <h2 className="font-light leading-[1.0] tracking-[-0.04em]" style={{ ...head, fontSize: 'clamp(34px, 5vw, 56px)', color: C.ink }}>I dag — og slik ville vi gjort det.</h2>
              <p className="mt-6 leading-[1.75]" style={{ fontSize: 'clamp(16.5px, 1.6vw, 18px)', color: C.sub, maxWidth: 660 }}>
                Dette handler ikke om at dagens annonse er dårlig — men om detaljene som avgjør hvem som tar kontakt, og til hvilken pris.
              </p>
            </Reveal>

            <Reveal>
              <div className="mx-auto grid grid-cols-1 items-stretch gap-5 sm:grid-cols-[1fr_auto_1fr]" style={{ maxWidth: 1040 }} data-testid="tilbud-sammenligning">
                <MiniAnnonse variant="idag" bilde={originalBilde} tittel={tilbud.tittel || 'Dagens annonse'} adresse={pent(tilbud.adresse)} pris={dagens} />
                <div className="flex items-center justify-center" aria-hidden="true">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full font-medium" style={{ backgroundColor: C.subtle, color: C.ink, fontSize: 16 }}>
                    <span className="hidden sm:inline">→</span>
                    <span className="sm:hidden">↓</span>
                  </span>
                </div>
                <MiniAnnonse variant="dh" bilde={dhBilde} aiBilde={stylet.length > 0} tittel={harAnnonse ? tilbud.annonse.tittel : (tilbud.tittel || '')} adresse={pent(tilbud.adresse)} pris={anbefalt} netto={netto} />
              </div>
            </Reveal>

            <div className="mx-auto mt-12 grid grid-cols-1 gap-x-12 gap-y-7 sm:grid-cols-2" style={{ maxWidth: 920 }} data-testid="tilbud-sammenligning-punkter">
              {sammenligningsPunkter.map(([t, d], i) => (
                <Reveal key={t} delay={(i % 2) * 0.05}>
                  <div className="pt-5" style={{ borderTop: `1px solid ${C.line}` }}>
                    <p className="font-medium" style={{ ...head, fontSize: 16.5, color: C.ink }}>{t}</p>
                    <p className="mt-1.5 leading-[1.65]" style={{ fontSize: 14, color: C.sub }}>{d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>
        )}

        {/* ══ 04 · ØKONOMIEN — prisoversikt-mønsteret: ink-hode + prikkede ledere ══ */}
        <section id="regnestykke" className="scroll-mt-20 py-16 lg:py-28" style={{ backgroundColor: C.page }}>
          <div className={`${padX} mx-auto`} style={{ maxWidth: maxW }} data-testid="tilbud-kpi">
            <Reveal className="mb-10 lg:mb-14">
              <Overline index="04" className="mb-5">Økonomien</Overline>
              <h2 className="font-light leading-[1.0] tracking-[-0.04em]" style={{ ...head, fontSize: 'clamp(34px, 5vw, 56px)', color: C.ink }}>Regnestykket.</h2>
              <p className="mt-6 leading-[1.75]" style={{ fontSize: 'clamp(16.5px, 1.6vw, 18px)', color: C.sub, maxWidth: 660 }}>
                Ett tall inn, to tall ut — hva boligen gir, hva vi tar, og hva som er igjen til deg. Ingen etableringsgebyr, ingen skjulte kostnader.
              </p>
            </Reveal>

            <Reveal>
              <div className="mx-auto overflow-hidden rounded-[28px]" style={{ maxWidth: 880, backgroundColor: C.bg, border: `1px solid ${C.line}`, boxShadow: '0 16px 46px rgba(24,20,16,0.06)' }} data-testid="price-table">
                {/* Ink-hodet — det store tallet */}
                <div className="flex flex-col gap-8 p-8 sm:flex-row sm:items-end sm:justify-between lg:p-12" style={{ backgroundColor: C.ink, color: '#fff' }}>
                  <div>
                    <p className="mb-4 font-semibold uppercase" style={{ ...head, fontSize: 11, letterSpacing: '0.2em', color: D.faint }}>Til deg hver måned</p>
                    <p className="flex items-start font-light leading-none tracking-[-0.05em] tabular-nums" style={{ ...head, fontSize: 'clamp(56px, 8vw, 92px)' }}>
                      <TellOpp verdi={netto} /><span style={{ fontSize: 'clamp(22px, 3vw, 34px)', marginTop: 'clamp(6px, 1vw, 12px)', marginLeft: 8 }}>kr</span>
                    </p>
                    <p className="mt-4" style={{ fontSize: 15, color: D.soft, maxWidth: 340 }}>estimert utbetalt, etter DigiHome-honorar — før eierkostnader og skatt</p>
                  </div>
                  <div className="flex gap-10 sm:flex-col sm:gap-5 sm:text-right">
                    <div><p className="font-medium tabular-nums" style={{ ...head, fontSize: 'clamp(22px, 2.4vw, 26px)' }}>{r.honorarPct} %</p><p style={{ fontSize: 12.5, color: D.soft }}>honorar, eks. mva</p></div>
                    <div><p className="font-medium" style={{ ...head, fontSize: 'clamp(22px, 2.4vw, 26px)' }}>Ingen</p><p style={{ fontSize: 12.5, color: D.soft }}>bindingstid</p></div>
                  </div>
                </div>
                {/* Radene — prikkede linjeledere */}
                <div className="space-y-4 px-8 py-8 lg:px-12 lg:py-10" style={{ fontSize: 14.5 }} data-testid="tilbud-regnestykke">
                  <Rad l="Anbefalt månedsleie" v={`${tall(anbefalt)} kr`} />
                  <Rad l={`DigiHome-honorar (${r.honorarPct} % eks. mva)`} v={`−${tall(r.honorarMnd)} kr`} />
                  <Rad l="Til deg hver måned" v={`${tall(netto)} kr`} bold top />
                  <Rad l="Over 12 måneder" v={`${tall(netto * 12)} kr`} muted />
                  {gevinst != null && gevinst > 0 && <Rad l="Mer enn annonsert pris i dag" v={`+${tall(gevinst)} kr/mnd`} muted />}
                </div>
              </div>
            </Reveal>
            <p className="mt-6 text-center" style={{ fontSize: 12, color: C.faint }}>
              Alt arbeid er inkludert i honoraret: annonse, visninger, screening, kontrakt, depositum og oppfølging. Estimat — ikke et regnskap.
            </p>
          </div>
        </section>

        {/* ══ 05 · ARBEIDSFORDELINGEN — mørkt kapittel med spøkelsesnumre ══ */}
        <section className="relative overflow-hidden py-24 lg:py-44" style={{ backgroundColor: C.ink }} data-testid="tilbud-manifest">
          <div className="pointer-events-none absolute inset-0" aria-hidden style={{ backgroundImage: GRAIN_URL, opacity: 0.05, mixBlendMode: 'overlay' }} />
          <div className={`relative ${padX} mx-auto`} style={{ maxWidth: maxW }}>
            <Reveal className="mb-14 lg:mb-20">
              <Overline light index="05" className="mb-6">Arbeidsfordelingen</Overline>
              <h2 className="font-light leading-[0.98] tracking-[-0.045em] text-white" style={{ ...head, fontSize: 'clamp(38px, 6vw, 68px)', maxWidth: '16ch' }}>Du gjør to ting. Vi tar resten.</h2>
              <p className="mt-7 leading-[1.75]" style={{ fontSize: 'clamp(16.5px, 1.7vw, 18.5px)', color: D.soft, maxWidth: 660 }}>
                Vi er eiendomsmeglere med utleie som spesialfelt. Å leie ut trenger ikke bli en ny jobb for deg.
              </p>
            </Reveal>
            <div className="grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-3">
              {[
                ['Gir oss nøklene', 'Vi tar befaring, produserer annonsen ferdig og gjør boligen klar for markedet.'],
                ['Godkjenner leietaker', 'Vi screener, sjekker referanser og kredittverdighet — du tar den endelige beslutningen.'],
                ['Vi gjør alt annet', 'Annonsering, visninger, kontrakt, depositum, innflytting og oppfølging gjennom hele leieforholdet.'],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 0.08} className="h-full">
                  <div className="h-full pt-7" style={{ borderTop: `1px solid ${D.chipLine}` }}>
                    <div className="mb-7 flex items-baseline justify-between">
                      <span className="font-light tabular-nums tracking-[-0.03em]" style={{ ...head, fontSize: 42, color: 'rgba(255,255,255,0.20)' }}>{`0${i + 1}`}</span>
                      {i === 2 && (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4.8 12.4 4.5 4.5 9.9-10" stroke={D.icon} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      )}
                    </div>
                    <h3 className="mb-3 font-medium text-white" style={{ ...head, fontSize: 22, letterSpacing: '-0.01em' }}>{t}</h3>
                    <p className="leading-[1.7]" style={{ fontSize: 14.5, color: D.soft }}>{d}</p>
                  </div>
                </Reveal>
              ))}
            </div>
            {/* Trust-strip — kun verifiserbare fakta */}
            <Reveal>
              <div className="mt-16 flex flex-wrap items-baseline gap-x-12 gap-y-3 pt-7" style={{ borderTop: `1px solid ${D.chipLine}` }} data-testid="tilbud-trust">
                <p style={{ fontSize: 13.5, color: D.soft }}><span className="font-medium text-white" style={head}>Eiendomsmeglere</span> med utleie som spesialfelt</p>
                {grunnlag && <p className="tabular-nums" style={{ fontSize: 13.5, color: D.soft }}><span className="font-medium text-white" style={head}>{grunnlag.antallILeide}</span> aktive leieforhold i Bergen</p>}
                {grunnlag?.antallISone > 0 && <p className="tabular-nums" style={{ fontSize: 13.5, color: D.soft }}><span className="font-medium text-white" style={head}>{grunnlag.antallISone}</span> utleid i samme postsone</p>}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ 06 · ANNONSEN ER KLAR — ekspanderbart preview-kort ══ */}
        {harAnnonse && (
          <section className={`${padX} mx-auto py-16 lg:py-28`} style={{ maxWidth: maxW }}>
            <Reveal className="mb-10 lg:mb-12">
              <Overline index="06" className="mb-5">Jobben er allerede gjort</Overline>
              <h2 className="font-light leading-[1.0] tracking-[-0.04em]" style={{ ...head, fontSize: 'clamp(34px, 5vw, 56px)', color: C.ink }}>Annonsen er klar.</h2>
              <p className="mt-6 leading-[1.75]" style={{ fontSize: 'clamp(16.5px, 1.6vw, 18px)', color: C.sub, maxWidth: 640 }}>
                Bildene er valgt. Teksten er skrevet. Prisen er satt. Sier du ja, kan den være live innen 24 timer.
              </p>
            </Reveal>

            {!visAnnonse ? (
              <Reveal>
                <button onClick={() => setVisAnnonse(true)} data-testid="tilbud-vis-annonse"
                  className="group mx-auto block w-full overflow-hidden rounded-[26px] text-left transition-all duration-300 hover:-translate-y-1"
                  style={{ maxWidth: 760, backgroundColor: C.bg, border: `1px solid ${C.line}`, boxShadow: '0 6px 22px rgba(24,20,16,0.04)' }}>
                  {dhBilde && (
                    <span className="relative block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dhBilde} alt="Hovedbilde i annonsen" className="block aspect-[2/1] w-full object-cover" loading="lazy" data-testid="tilbud-annonse-kort-bilde" />
                      {stylet.length > 0 && (
                        <span className="pointer-events-none absolute left-4 top-4 rounded-full px-2.5 py-0.5 font-semibold" style={{ fontSize: 10, color: '#fff', backgroundColor: 'rgba(8,7,6,0.5)', backdropFilter: 'blur(6px)' }} title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>
                      )}
                    </span>
                  )}
                  <span className="block px-6 py-5 sm:px-7">
                    <span className="block font-medium leading-snug" style={{ ...head, fontSize: 18.5, letterSpacing: '-0.01em', color: C.ink }}>{tilbud.annonse.tittel}</span>
                    <span className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span style={{ fontSize: 13.5, color: C.sub }}>{pent(tilbud.adresse)}</span>
                      <span className="font-medium tabular-nums" style={{ ...head, fontSize: 16, color: C.ink }}>{tall(anbefalt)} kr / mnd</span>
                    </span>
                    <span className="mt-4 flex items-center gap-1.5 font-semibold" style={{ fontSize: 13.5, color: C.ink }}>
                      Se hele annonsen <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span>
                    </span>
                  </span>
                </button>
              </Reveal>
            ) : (
              <div className="mx-auto" style={{ maxWidth: 860 }}>
                <AnnonsePreview tilbud={tilbud} r={r} />
                <button onClick={() => setVisAnnonse(false)} data-testid="tilbud-skjul-annonse"
                  className="mt-4 font-semibold transition-colors hover:text-[#111827]" style={{ fontSize: 13.5, color: C.sub }}>
                  Skjul annonseutkastet ↑
                </button>
              </div>
            )}
          </section>
        )}

        {/* ══ FIRE STEG ══ */}
        <section className={`${padX} mx-auto py-16 lg:py-28`} style={{ maxWidth: maxW }} data-testid="four-steps">
          <Reveal className="mb-14">
            <div className="mb-3 flex justify-center"><Overline>Neste steg</Overline></div>
            <h2 className="text-center font-light tracking-[-0.03em]" style={{ ...head, fontSize: 'clamp(30px, 4vw, 40px)', color: C.ink }}>Slik kommer vi i gang.</h2>
          </Reveal>
          <div className="relative mx-auto" style={{ maxWidth: 960 }}>
            <div aria-hidden className="absolute hidden sm:block" style={{ top: 20, left: '11%', right: '11%', height: 1, backgroundColor: C.line }} />
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-4">
              {[
                ['Vi tar en prat', 'I dag — uforpliktende. Vi går gjennom tallene sammen.'],
                ['Vi ser boligen', 'Dag 1–2: befaring, og du leverer nøklene.'],
                ['Annonsen går live', 'Innen 24 timer — den er allerede produsert.'],
                ['Vi finner leietaker', 'Visninger, kontrakt og forvaltning — vi håndterer resten.'],
              ].map(([t, d], i) => (
                <Reveal key={t} delay={i * 0.08}>
                  <div className="flex items-start gap-5 sm:relative sm:block">
                    <div className="relative z-10 flex shrink-0 items-center justify-center rounded-full" style={{ width: 40, height: 40, backgroundColor: C.ink, color: '#fff', ...head, fontSize: 15.5, fontWeight: 600 }}>{i + 1}</div>
                    <div className="pt-1 sm:mt-6 sm:pt-0">
                      <h3 className="mb-2 font-semibold" style={{ ...head, fontSize: 15.5, color: C.ink }}>{t}</h3>
                      <p className="leading-[1.6]" style={{ fontSize: 13, color: C.sub }}>{d}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FAQ ══ */}
        <section className="py-16 lg:py-28" style={{ backgroundColor: C.page }} data-testid="faq-section">
          <div className={`${padX} mx-auto`} style={{ maxWidth: 760 }}>
            <Reveal className="mb-10">
              <div className="mb-3 flex justify-center"><Overline>Tryggheten</Overline></div>
              <h2 className="text-center font-light tracking-[-0.03em]" style={{ ...head, fontSize: 'clamp(30px, 4vw, 40px)', color: C.ink }}>Spørsmål?</h2>
            </Reveal>
            <div className="flex flex-col" data-testid="faq-accordion">
              {[
                ['Er leien garantert?', `Nei — ${tall(anbefalt)} kr er vår faglige anbefaling basert på faktiske leieinntekter i porteføljen vår. Endelig leie settes sammen med deg, og markedet gir fasiten. Vi anbefaler aldri en pris vi ikke tror vi oppnår.`],
                ['Hvem bestemmer hvilken leietaker jeg får?', 'Du. Vi screener interessenter, sjekker referanser og kredittverdighet, og legger frem de beste kandidatene — men du godkjenner alltid leietakeren selv.'],
                ['Hva inngår faktisk i honoraret?', `Alt: annonse, markedsføring, visninger, screening, kontrakt, depositum, innflytting og løpende oppfølging. ${r.honorarPct} % av månedsleien, eks. mva — ingen etableringsgebyr, ingen skjulte kostnader.`],
                ['Hva skjer hvis det oppstår problemer i leieforholdet?', 'Da er det oss leietakeren kontakter — ikke deg. Vi håndterer oppfølging, purringer og praktiske spørsmål, og involverer deg kun når en beslutning faktisk er din.'],
                ['Hva om jeg vil avslutte samarbeidet?', 'Ingen bindingstid på forvaltningen. Fungerer det ikke, avslutter vi ryddig — leiekontrakten med leietaker består uansett på dine vilkår.'],
              ].map(([q, a], i) => {
                const open = aapen === i;
                return (
                  <div key={q} style={{ borderTop: i === 0 ? `1px solid ${C.line}` : undefined, borderBottom: `1px solid ${C.line}` }} data-testid={`faq-${i}`}>
                    <button type="button" onClick={() => setAapen(open ? -1 : i)} aria-expanded={open} className="flex w-full items-center justify-between gap-5 py-5 text-left lg:py-6">
                      <span className="font-medium transition-colors duration-200" style={{ ...head, fontSize: 'clamp(16px, 1.6vw, 18px)', color: open ? C.ink : '#2A2926' }}>{q}</span>
                      <span className="flex shrink-0 items-center justify-center rounded-full transition-all duration-300" style={{ width: 30, height: 30, border: `1px solid ${open ? C.ink : C.line}`, backgroundColor: open ? C.ink : 'transparent' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="transition-transform duration-300" style={{ transform: open ? 'rotate(180deg)' : 'none' }} aria-hidden="true">
                          <path d="m6 9 6 6 6-6" stroke={open ? '#fff' : C.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>
                    <div className={`grid transition-[grid-template-rows] duration-[400ms] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`} style={{ transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)' }}>
                      <div className="overflow-hidden">
                        <p className="pb-6 leading-[1.75]" style={{ fontSize: 15, color: C.sub, maxWidth: 640 }}>{a}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══ AVSLUTTENDE SVART CTA — «Ja, dette høres interessant ut» ══ */}
        <section id="kontakt" className="scroll-mt-10 overflow-hidden" style={{ backgroundColor: C.black }} data-testid="final-cta">
          <div className={`${padX} relative mx-auto py-24 text-center lg:py-44`} style={{ maxWidth: maxW }}>
            <div className="pointer-events-none absolute" aria-hidden style={{ top: '-26%', left: '50%', transform: 'translateX(-50%)', width: 760, height: 520, borderRadius: '9999px', background: 'radial-gradient(circle, rgba(255,248,240,0.07) 0%, transparent 62%)' }} />
            <Reveal className="relative">
              {sendt ? (
                <div data-testid="tilbud-kontakt">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO_WHITE} alt="DigiHome" className="mx-auto mb-10" style={{ height: 30, opacity: 0.96 }} />
                  <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full" style={{ backgroundColor: D.chip, border: `1px solid ${D.chipLine}` }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5.5 12.5 4 4 9-9.5" stroke="#7ed9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <h2 className="mb-4 font-light tracking-[-0.03em] text-white" style={{ ...head, fontSize: 'clamp(28px, 4vw, 44px)' }}>Takk! {fornavn} ringer deg i dag eller i morgen.</h2>
                  <p className="mx-auto leading-relaxed" style={{ fontSize: 15.5, color: D.soft, maxWidth: 460 }}>Helt uforpliktende — en kort prat om boligen og hva vi kan få til.</p>
                </div>
              ) : (
                <div data-testid="tilbud-kontakt">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={LOGO_WHITE} alt="DigiHome" className="mx-auto mb-10" style={{ height: 30, opacity: 0.96 }} />
                  <h2 className="mb-4 font-light tracking-[-0.03em] text-white" style={{ ...head, fontSize: 'clamp(32px, 4.5vw, 48px)' }}>Høres dette interessant ut?</h2>
                  <p className="mx-auto mb-9 leading-relaxed" style={{ fontSize: 15.5, color: D.soft, maxWidth: 460 }}>
                    Legg igjen nummeret ditt, så ringer {fornavn} deg for en uforpliktende prat. Ingenting signeres her.
                  </p>
                  <div className="mx-auto mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-2" style={{ backgroundColor: D.chip, border: `1px solid ${D.chipLine}` }}>
                    <AvsenderBilde avsender={avsender} storrelse={26} radius={99} />
                    <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.88)' }}>{avsender.navn} · {avsender.tittel}</span>
                  </div>
                  <div className="mx-auto flex max-w-[600px] flex-col gap-2.5 sm:flex-row">
                    <input value={skjema.telefon} onChange={(e) => setSkjema((s) => ({ ...s, telefon: e.target.value }))}
                      placeholder="Telefonnummeret ditt" inputMode="tel" autoComplete="tel" aria-label="Telefonnummeret ditt" data-testid="tilbud-telefon"
                      className="h-[54px] flex-1 rounded-full px-6 text-white outline-none transition-colors"
                      style={{ ...body, fontSize: 15, backgroundColor: D.chip, border: `1px solid ${D.chipLine}` }}
                      onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.45)'; }}
                      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.10)'; }} />
                    <ShineKnapp onClick={send} disabled={sender || !skjema.telefon.trim()} testid="tilbud-send" lys className="shrink-0">
                      {sender ? 'Sender…' : 'Ja, dette høres interessant ut'}
                    </ShineKnapp>
                  </div>
                  <textarea value={skjema.melding} onChange={(e) => setSkjema((s) => ({ ...s, melding: e.target.value }))}
                    placeholder="Noe vi bør vite før vi ringer? (valgfritt)" rows={2} aria-label="Melding (valgfritt)"
                    className="mx-auto mt-3 block w-full max-w-[600px] resize-none rounded-[20px] px-6 py-3.5 text-white outline-none transition-colors"
                    style={{ ...body, fontSize: 15, backgroundColor: D.chip, border: `1px solid ${D.chipLine}` }} />
                  {feil && <p className="mt-3" style={{ fontSize: 13, color: '#fda4af' }}>{feil}</p>}
                  <p className="mt-6" style={{ fontSize: 12, color: D.faint }}>Uforpliktende · Vi bruker kun nummeret til å kontakte deg om dette tilbudet</p>
                  {netto > 0 && (
                    <p className="mx-auto mt-9 max-w-[440px] pt-5" style={{ borderTop: `1px solid ${D.chipLine}`, fontSize: 13.5, color: 'rgba(255,255,255,0.5)' }}>
                      Estimert etter DigiHome-honorar: <span className="font-semibold tabular-nums" style={{ color: '#7ed9a7' }}>{tall(netto)} kr / mnd</span>
                    </p>
                  )}
                </div>
              )}
            </Reveal>
          </div>
        </section>

        {/* ── Kolofon ── */}
        <footer style={{ backgroundColor: C.page }}>
          <div className={`${padX} mx-auto flex flex-col gap-5 pb-28 pt-12 sm:flex-row sm:items-start sm:justify-between sm:pb-16`} style={{ maxWidth: maxW }}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={LOGO_INK} alt="DigiHome" className="h-[20px] w-auto opacity-90" />
              <p className="mt-2.5" style={{ fontSize: 12, color: C.faint }}>Personlig utleievurdering for {pent(tilbud.adresse)} · Bergen</p>
            </div>
            <p className="max-w-[460px] leading-relaxed sm:text-right" style={{ fontSize: 11.5, color: C.faint }}>
              Forbedrede og møblerte bilder er AI-genererte, basert på annonsens egne foto — møblering og dekor er veiledende.
              Honorar oppgis eks. mva. DigiHome AS · digihome.no
            </p>
          </div>
        </footer>
      </div>

      {/* ── Flytende bunn-CTA (kun mobil) ── */}
      {!sendt && (
        <div className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 sm:hidden ${visBunn ? 'translate-y-0' : 'translate-y-[110%]'}`}
          style={{ backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(14px)', borderTop: `1px solid ${C.hairline}` }}>
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate font-medium" style={{ fontSize: 11, color: C.faint }}>Anbefalt leie {tall(anbefalt)} kr/mnd</p>
              <p className="font-medium tabular-nums tracking-[-0.01em]" style={{ ...head, fontSize: 17, color: C.success }}>{tall(netto)} kr til deg</p>
            </div>
            <button onClick={tilKontakt} data-testid="tilbud-bunn-cta"
              className="h-[46px] shrink-0 rounded-full px-6 font-semibold transition-transform active:scale-[0.97]"
              style={{ ...body, fontSize: 14, backgroundColor: C.ink, color: '#fff' }}>
              Snakk med {fornavn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
