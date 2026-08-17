'use client';

/* ═══════════ OFFENTLIG TILBUDSSIDE — /tilbud/[slug] ═══════════
   «Et personlig, digitalt utleieprospekt — ikke en landingsside.»
   Dramaturgi: 1) Konklusjonen (anbefalt leie + netto + boligbildet høyt)
   2) Beviset (markedsintervall, faktiske leieforhold, FINN-sammenligning)
   3) Økonomien 4) Annonsen er klar 5) Arbeidsfordelingen (mørk seksjon)
   6) Tryggheten 7) Neste steg 8) CTA (mørk).

   Designsystem (alt må føles proporsjonalt):
   · Typescala: kicker 11px/0.18em · H1 clamp(48→84) · H2 clamp(27→36)
     · body 15.5–16.5 · meta 13–13.5 · alle tall tabular-nums
   · Rytme: seksjonsavstand clamp(84→124px), heading→innhold 12/32px
   · Flater: varm off-white #f8f8f6 · tonal #f5f5f2 · kort #fff rounded-[16–20px]
   · Farger: blekk #141414 · grønn #1f7a45 (KUN økonomi) · DigiHome-lilla
     #6d28d9/#8b5cf6 (kontrollert: kickers, markører, anbefaling)
   · Knapper: pill (rounded-full) · Navbar: transparent → blur+kant ved scroll
   Åpninger spores (spor=1) i Salgsradar. */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
// FINN-adresser kommer ofte i små bokstaver — vis dem pent kapitalisert
const pent = (s) => String(s || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());
const fmtDato = (iso) => {
  try { return new Date(iso || Date.now()).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; }
};
const reduserMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

const LILLA = '#6d28d9';
const LILLA_LYS = '#8b5cf6';
const GRONN = '#1f7a45';

/* Delt rytme og skala — én kilde til sannhet for proporsjonene */
const SEKSJON = 'mt-[clamp(84px,9vw,124px)]';
const H2 = 'text-[clamp(27px,3.4vw,36px)] font-semibold leading-[1.08] tracking-[-0.025em] [text-wrap:balance]';
const BAND_PY = 'py-[clamp(60px,7vw,104px)]';

const KNAPP_MORK = 'inline-flex h-12 items-center justify-center rounded-full bg-[#141414] px-7 text-[14.5px] font-semibold text-white transition-all hover:bg-black/80 hover:shadow-[0_10px_28px_rgba(20,20,20,0.22)] active:scale-[0.98] disabled:opacity-40';
const KNAPP_GHOST = 'inline-flex h-12 items-center justify-center rounded-full border border-black/[0.13] bg-white/40 px-7 text-[14.5px] font-semibold text-[#141414] transition-all hover:border-black/30 active:scale-[0.98]';

/* ── Scroll-reveal (én gang, respekterer reduced motion) ── */
function useReveal() {
  const ref = useRef(null);
  const [vist, setVist] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined' || reduserMotion()) { setVist(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVist(true); io.disconnect(); } }, { threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, vist];
}

function Avsnitt({ id, className = '', children }) {
  const [ref, vist] = useReveal();
  return (
    <section id={id} ref={ref} className={`${className} transition-all duration-700 ease-out ${vist ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}>
      {children}
    </section>
  );
}

/* ── Seksjonshode — samme proporsjoner overalt ── */
function SeksjonHode({ kicker, tittel, intro, lys = false, midt = false }) {
  return (
    <div className={midt ? 'text-center' : ''}>
      <p
        className={`text-[11px] font-bold uppercase tracking-[0.18em] ${midt ? 'inline-flex rounded-full px-3.5 py-1.5' : ''} ${lys ? (midt ? 'bg-white/10 text-[#c4b0f2]' : 'text-[#c4b0f2]') : midt ? 'bg-[#f0eafc]' : ''}`}
        style={lys ? undefined : { color: LILLA }}
      >
        {kicker}
      </p>
      <h2 className={`${midt ? 'mx-auto mt-4 max-w-[720px]' : 'mt-3'} ${H2}`} style={heading}>{tittel}</h2>
      {intro && <p className={`mt-4 max-w-[600px] text-[15.5px] leading-[1.65] [text-wrap:pretty] ${midt ? 'mx-auto' : ''} ${lys ? 'text-white/60' : 'text-[#525252]'}`}>{intro}</p>}
    </div>
  );
}

/* ── Teller-animasjon for nøkkeltall ── */
function TellOpp({ verdi, ms = 1000 }) {
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
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { start(); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [m, ms]);
  return <span ref={ref}>{tall(vis)}</span>;
}

/* ── Interaktiv før/etter-slider — demonstrerer DigiHome-produktet.
     Pointer-basert: fungerer med mus, touch-swipe og piltaster. ── */
function ForEtter({ forUrl, etterUrl, nokkel, etterEtikett = 'AI-stylet \u00b7 illustrasjon', ratio = 'aspect-[16/10]' }) {
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
      className={`relative ${ratio} cursor-ew-resize select-none overflow-hidden rounded-[18px] bg-[#e9e7e2] ring-1 ring-black/[0.05] shadow-[0_28px_72px_-36px_rgba(20,20,20,0.38)]`}
      style={{ touchAction: 'pan-y' }}
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
          } else if (dy > 10 && dy > dx) {
            d.laast = 'scroll';
          }
          return;
        }
        if (d.laast === 'slider') flytt(e.clientX);
      }}
      onPointerUp={(e) => {
        const d = drar.current;
        drar.current = null;
        if (d && !d.laast && Math.abs(e.clientX - d.x0) < 6 && Math.abs(e.clientY - d.y0) < 6) {
          brukerHarDratt.current = true;
          flytt(e.clientX);
        }
      }}
      onPointerCancel={() => { drar.current = null; }}
      role="slider"
      aria-label="Sammenlign original og klargjort bilde"
      aria-valuenow={Math.round(pos)}
      tabIndex={0}
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
        <div className="absolute inset-y-0 -ml-px w-[2px] bg-white shadow-[0_0_14px_rgba(0,0,0,0.35)]" />
        <span className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/92 shadow-[0_4px_16px_rgba(0,0,0,0.28)] ring-1 ring-black/[0.06] backdrop-blur-sm">
          <svg width="16" height="11" viewBox="0 0 18 12" fill="none" aria-hidden="true">
            <path d="M5.5 1 1 6l4.5 5M12.5 1 17 6l-4.5 5" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <span className={`pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm transition-opacity duration-200 ${pos > 24 ? 'opacity-100' : 'opacity-0'}`}>
        Original
      </span>
      <span className={`pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-3 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-sm transition-opacity duration-200 ${pos < 84 ? 'opacity-100' : 'opacity-0'}`} title="AI-generert forslag basert på annonsens eget foto">
        {etterEtikett} {'\u24D8'}
      </span>
    </div>
  );
}

/* ── Markedsintervall som visuell prislinjal — anbefalingen plassert i
     intervallet, med dagens annonsepris som referansepunkt når den finnes ── */
function IntervallBar({ lo, hi, anbefalt, dagens }) {
  const span = Math.max(1, hi - lo);
  const pos = (v) => Math.min(96, Math.max(4, ((v - lo) / span) * 100));
  const pAnb = pos(anbefalt);
  const pDag = dagens > 0 ? pos(dagens) : null;
  const samme = pDag != null && Math.abs(pDag - pAnb) < 8;
  const labelJust = (p) => (p < 16 ? 'translate-x-0 text-left' : p > 84 ? '-translate-x-full text-right' : '-translate-x-1/2 text-center');
  return (
    <div className="mx-auto w-full max-w-[660px]" data-testid="tilbud-intervall">
      <div className={`relative ${pDag != null && !samme ? 'pb-14' : 'pb-1'} pt-[52px]`}>
        {/* Anbefalingen — over linjen */}
        <div className={`absolute top-0 ${labelJust(pAnb)}`} style={{ left: `${pAnb}%` }}>
          <p className="whitespace-nowrap text-[10.5px] font-bold uppercase tracking-[0.14em]" style={{ color: LILLA }}>
            {samme ? 'Dagens pris · vår anbefaling' : 'Vår anbefaling'}
          </p>
          <p className="mt-0.5 whitespace-nowrap text-[17px] font-bold tabular-nums tracking-[-0.01em]" style={heading}>{tall(anbefalt)} kr</p>
        </div>
        {/* Linjalen */}
        <div className="h-[6px] rounded-full bg-gradient-to-r from-[#efe9fb] via-[#e0d3f8] to-[#efe9fb]" />
        <span className="absolute h-[15px] w-[15px] rounded-full border-[3px] border-white shadow-[0_1px_6px_rgba(109,40,217,0.4)]" style={{ left: `${pAnb}%`, top: 'calc(52px + 2.5px)', transform: 'translate(-50%, -50%)', background: LILLA }} />
        {/* Dagens annonsepris — under linjen, kun når den avviker */}
        {pDag != null && !samme && (
          <>
            <span className="absolute block h-[16px] w-[2px] -translate-x-1/2 rounded bg-[#141414]/50" style={{ left: `${pDag}%`, top: 'calc(52px + 9px)' }} />
            <div className={`absolute ${labelJust(pDag)}`} style={{ left: `${pDag}%`, top: 'calc(52px + 30px)' }}>
              <p className="whitespace-nowrap text-[11px] font-semibold text-[#8f8f8f]">Annonsert i dag</p>
              <p className="whitespace-nowrap text-[14px] font-bold tabular-nums text-[#404040]" style={heading}>{tall(dagens)} kr</p>
            </div>
          </>
        )}
      </div>
      <div className="mt-2.5 flex items-baseline justify-between gap-3 text-[12px] tabular-nums text-[#a3a3a3]">
        <span>{tall(lo)} kr</span>
        <span className="hidden text-[11.5px] font-medium sm:inline">Estimert markedsintervall for boligen</span>
        <span>{tall(hi)} kr</span>
      </div>
      <p className="mt-1 text-[11.5px] font-medium text-[#a3a3a3] sm:hidden">Estimert markedsintervall for boligen</p>
    </div>
  );
}

/* ── Mini-annonsekort til «i dag → slik ville vi gjort det» ── */
function MiniAnnonse({ variant, bilde, aiBilde, tittel, adresse, pris, netto }) {
  const dh = variant === 'dh';
  return (
    <div className={`flex flex-col overflow-hidden rounded-[16px] bg-white transition-all duration-300 hover:-translate-y-1 ${dh ? 'ring-[1.5px] ring-[#8b5cf6]/40 shadow-[0_8px_32px_rgba(109,40,217,0.08)] hover:shadow-[0_16px_44px_rgba(109,40,217,0.13)]' : 'ring-1 ring-black/[0.07] hover:shadow-[0_14px_40px_rgba(20,20,20,0.08)]'}`}>
      <div className={`flex items-center justify-between px-4 py-2.5 ${dh ? 'bg-[#f4f0fb]' : 'border-b border-black/[0.05] bg-[#fafaf8]'}`}>
        <span className={`text-[10.5px] font-bold uppercase tracking-[0.12em] ${dh ? '' : 'text-[#a3a3a3]'}`} style={dh ? { color: LILLA } : undefined}>
          {dh ? 'DigiHome anbefaler' : 'Annonsen din i dag'}
        </span>
        {dh && aiBilde && <span className="text-[10px] font-semibold text-[#a78bfa]" title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>}
      </div>
      {bilde ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={bilde} alt={dh ? 'Klargjort hovedbilde' : 'Dagens hovedbilde'} className={`block aspect-[16/9] w-full object-cover ${dh ? '' : 'saturate-[0.88]'}`} loading="lazy" draggable={false} />
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center bg-[#f1f0ee] text-[12px] text-[#a3a3a3]">Uten klargjort bilde</div>
      )}
      <div className="flex flex-1 flex-col px-4 pb-4 pt-3 sm:px-5">
        <p className={`text-[14.5px] font-bold leading-snug ${dh ? 'text-[#141414]' : 'text-[#525252]'}`} style={heading}>{tittel}</p>
        <p className="mt-0.5 text-[12px] text-[#a3a3a3]">{adresse}</p>
        <div className="mt-auto pt-3">
          <p className={`text-[18px] font-bold tabular-nums tracking-[-0.01em] ${dh ? '' : 'text-[#525252]'}`} style={heading}>{tall(pris)} kr <span className="text-[12px] font-semibold text-[#a3a3a3]">/mnd</span></p>
          {dh && netto > 0 && <p className="mt-0.5 text-[12px] font-semibold tabular-nums" style={{ color: GRONN }}>≈ {tall(netto)} kr til deg etter honorar</p>}
        </div>
      </div>
    </div>
  );
}

/* ── Full annonse-preview (åpnes fra det kompakte kortet) ── */
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
      <div
        className="overflow-hidden rounded-[16px] bg-white ring-1 ring-black/[0.07]"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') bytt(-1); if (e.key === 'ArrowRight') bytt(1); }}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fafaf8] px-4 py-2.5 sm:px-6">
          <span className="rounded-full bg-[#141414] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">Til leie</span>
          <span className="text-[11px] font-medium text-[#737373]">Forhåndsvisning av annonsen din</span>
        </div>

        {akt && (
          <div className="group relative bg-[#141414]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={akt.url} alt="Bilde fra annonsen" className="block aspect-[2/1] w-full object-cover" draggable={false} loading="lazy"
              data-testid="tilbud-annonse-bilde"
              onError={() => setDode((d) => (d.includes(akt.url) ? d : [...d, akt.url]))} />
            {akt.ai && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm" title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>
            )}
            {bilder.length > 1 && (
              <>
                {[['\u2039', -1, 'left-2', 'Forrige bilde'], ['\u203A', 1, 'right-2', 'Neste bilde']].map(([tegn, retn, pos, label]) => (
                  <button key={label} type="button" aria-label={label} onClick={() => bytt(retn)}
                    className={`absolute ${pos} top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-[18px] leading-none text-white backdrop-blur-sm transition-all hover:bg-black/55 sm:opacity-0 sm:group-hover:opacity-100`}>
                    {tegn}
                  </button>
                ))}
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                  {Math.min(idx, bilder.length - 1) + 1} / {bilder.length}
                </span>
              </>
            )}
          </div>
        )}

        <div className="px-4 pb-2 pt-5 sm:px-6">
          <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] sm:text-[22px]" style={heading} data-testid="tilbud-annonse-tittel">{a.tittel}</h3>
          <p className="mt-1 text-[13.5px] text-[#737373]">{pent(tilbud.adresse)}{tilbud.postnr ? `, ${tilbud.postnr} Bergen` : ', Bergen'}</p>
          {leie > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[24px] font-bold tabular-nums tracking-[-0.01em]" style={heading}>{tall(leie)} kr <span className="text-[14px] font-semibold text-[#737373]">/mnd</span></span>
              <span className="text-[12.5px] tabular-nums text-[#a3a3a3]">Depositum: {tall(leie * 3)} kr</span>
            </div>
          )}
        </div>

        {fakta.length > 0 && (
          <div className={`mx-4 mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[12px] border border-black/[0.06] bg-black/[0.06] sm:mx-6 ${fakta.length >= 5 ? 'sm:grid-cols-5' : fakta.length === 4 ? 'sm:grid-cols-4' : fakta.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {fakta.map(([l, v]) => (
              <div key={l} className="bg-[#fafaf8] px-3.5 py-2.5">
                <p className="text-[10.5px] font-medium text-[#a3a3a3]">{l}</p>
                <p className="mt-0.5 text-[13.5px] font-bold" style={heading}>{v}</p>
              </div>
            ))}
            {fakta.length % 2 === 1 && <div className="bg-[#fafaf8] sm:hidden" />}
          </div>
        )}

        <div className="px-4 pt-4 sm:px-6">
          {(a.hoydepunkter || []).length > 0 && (
            <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {a.hoydepunkter.map((h) => (
                <li key={h} className="flex items-start gap-2 text-[13.5px] font-medium text-[#404040]">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="mt-[3px] shrink-0" aria-hidden="true">
                    <path d="m3.6 9.4 3.4 3.4 7.4-7.6" stroke="#1f7a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {h}
                </li>
              ))}
            </ul>
          )}
          {(a.fasiliteter || []).length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5" data-testid="tilbud-annonse-fasiliteter">
              {a.fasiliteter.map((f) => (
                <span key={f} className="rounded-full border border-black/[0.08] bg-[#fafaf8] px-3 py-1 text-[12px] font-medium text-[#525252]">{f}</span>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 pb-5 pt-4 sm:px-6">
          <p className="text-[12px] font-semibold text-[#a3a3a3]">Om boligen</p>
          <div className="mt-2 max-w-[640px] space-y-3">
            {String(a.beskrivelse).split(/\n{2,}/).map((avsn, i) => (
              <p key={i} className="text-[14px] leading-relaxed text-[#404040]">{avsn}</p>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-black/[0.06] bg-[#fafaf8] px-4 py-3.5 sm:px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[15px] w-auto" />
          <span className="text-[12px] text-[#737373]">Utleiemegler · håndterer visninger, kontrakt og oppfølging</span>
        </div>
      </div>
      <p className="mt-3 text-[12px] leading-relaxed text-[#a3a3a3]">
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
  const [scrollet, setScrollet] = useState(false);   // heroen ute av syne → kontekst i navbar
  const [harScrollet, setHarScrollet] = useState(false); // navbar får kant + blur
  const [klar, setKlar] = useState(false);           // staggered hero-entrance
  const [aapen, setAapen] = useState(-1);            // åpen rad i spørsmål-seksjonen

  useEffect(() => {
    const t = setTimeout(() => setKlar(true), 40);
    return () => clearTimeout(t);
  }, []);

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

  // Navbar-tilstand + sticky bunn-CTA på mobil
  useEffect(() => {
    const sjekk = () => {
      const kontakt = document.getElementById('kontakt');
      const kontaktSynlig = kontakt ? kontakt.getBoundingClientRect().top < window.innerHeight - 80 : false;
      setVisBunn(window.scrollY > 560 && !kontaktSynlig);
      setScrollet(window.scrollY > 420);
      setHarScrollet(window.scrollY > 10);
    };
    window.addEventListener('scroll', sjekk, { passive: true });
    sjekk();
    return () => window.removeEventListener('scroll', sjekk);
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

  const tilKontakt = () => {
    if (typeof document !== 'undefined') document.getElementById('kontakt')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const tilHvorfor = () => {
    if (typeof document !== 'undefined') document.getElementById('hvorfor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
  const harHeroBilde = Boolean(valgtStylet || originalBilde);

  // Markedsintervall rundt anbefalt leie (±3 %, rundet til nærmeste 100)
  const intervall = useMemo(() => {
    if (!anbefalt) return null;
    const rund = (x) => Math.round(x / 100) * 100;
    return [rund(anbefalt * 0.97), rund(anbefalt * 1.03)];
  }, [anbefalt]);

  const fakta = useMemo(() => [
    tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null, tilbud?.boligtype ? pent(tilbud.boligtype) : null,
  ].filter(Boolean), [tilbud]);

  // «Dagens annonse → slik ville vi gjort det» — kun faglige, etterprøvbare punkter
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

  // Forsidebilde til det kompakte annonse-kortet + sammenligningskortene
  const dhBilde = stylet.length ? `/api/tilbud/bilde?id=${stylet[0].id}` : originalBilde;

  // Staggered entrance for hero-blokkene — rolig, ett åndedrag
  const innKl = (delay) => `transition-all duration-700 ease-out motion-reduce:transition-none motion-reduce:translate-y-0 motion-reduce:opacity-100 ${klar ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'} ${delay}`;

  if (laster) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f8f8f6]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-6 w-auto opacity-90" />
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-black/15 border-t-black/60" />
      </div>
    );
  }
  if (!tilbud) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#f8f8f6] px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-6 w-auto opacity-90" />
        <p className="text-center text-[14px] text-[#737373]">{feil || 'Fant ikke tilbudet.'}</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f8f8f6] text-[#141414] selection:bg-[#e9defc]" data-testid="tilbud-side">

      {/* Ambient glød bak heroen — knapt synlig, gir dybde uten støy */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(1000px_380px_at_72%_-90px,rgba(139,92,246,0.08),transparent_70%)]" />

      {/* ── Navbar: fullbredde og usynlig på topp → flytende glasskapsel ved scroll ── */}
      <header className="sticky top-0 z-40 px-4 sm:px-8">
        <div className={`mx-auto flex items-center justify-between gap-4 transition-all duration-500 ease-out ${harScrollet
          ? 'mt-3 h-[54px] max-w-[860px] rounded-full bg-[#fdfdfc]/85 py-0 pl-5 pr-2 shadow-[0_10px_36px_rgba(20,20,20,0.10)] ring-1 ring-black/[0.06] backdrop-blur-xl'
          : 'h-16 max-w-[1200px] bg-transparent px-1 sm:px-0'}`}>
          <div className="relative flex min-w-0 flex-1 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className={`h-[20px] w-auto transition-opacity duration-300 ${scrollet ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute inset-x-0 flex min-w-0 items-baseline gap-3 transition-opacity duration-300 ${scrollet ? 'opacity-100' : 'pointer-events-none opacity-0'}`} data-testid="tilbud-header-kontekst">
              <span className="truncate text-[13.5px] font-bold tracking-[-0.01em]" style={heading}>{pent(tilbud.adresse)}</span>
              {anbefalt > 0 && <span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-[#737373]">{tall(anbefalt)} kr/mnd</span>}
              {netto > 0 && <span className="hidden shrink-0 text-[12.5px] font-semibold tabular-nums sm:inline" style={{ color: GRONN }}>{tall(netto)} kr til deg</span>}
            </span>
          </div>
          <button onClick={tilKontakt} data-testid="tilbud-topp-cta"
            className={`shrink-0 rounded-full bg-[#141414] text-[13px] font-semibold text-white transition-all duration-300 hover:bg-black/80 active:scale-[0.98] ${harScrollet ? 'h-10 px-5' : 'h-10 px-5 sm:h-11 sm:px-6'}`}>
            Snakk med Sarah
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 sm:px-8">

        {/* ══ 1 · KONKLUSJONEN — anbefalt leie som hovedbudskap, boligbildet høyt ══ */}
        <section className="pt-6 sm:pt-10">
          <div className={`grid grid-cols-1 gap-x-[clamp(48px,5vw,88px)] gap-y-8 ${harHeroBilde ? 'lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:grid-rows-[auto_1fr]' : ''}`}>

            {/* A — konklusjonen */}
            <div className={innKl(`delay-75 ${harHeroBilde ? 'lg:col-start-1 lg:row-start-1' : ''}`)}>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: LILLA }}>
                Personlig utleievurdering{vurdertDato ? <span className="hidden sm:inline"> · {vurdertDato}</span> : null}
              </p>
              <p className="mt-4 text-[16px] font-bold tracking-[-0.01em] sm:text-[18px]" style={heading} data-testid="tilbud-hero-adresse">
                {pent(tilbud.adresse)}{fakta.length > 0 && <span className="font-medium text-[#a3a3a3]"> · {fakta.join(' · ')}</span>}
              </p>
              {anbefalt > 0 ? (
                <>
                  <h1 className="mt-3 font-bold leading-[0.98] tracking-[-0.035em]" style={{ ...heading, fontSize: 'clamp(48px, 7.5vw, 84px)' }}>
                    <TellOpp verdi={anbefalt} ms={900} />{'\u2009'}kr<span className="text-[0.34em] font-semibold tracking-[-0.01em] text-[#a3a3a3]"> /mnd</span>
                  </h1>
                  <p className="mt-2.5 text-[15px] font-medium text-[#737373] sm:text-[16px]">anbefalt månedsleie for boligen din</p>
                  {netto > 0 && (
                    <p className="mt-5 inline-flex max-w-full flex-wrap items-baseline gap-x-1.5 rounded-[14px] bg-[#e9f2ea] px-4 py-3 text-[14.5px] leading-snug text-[#2d4a36]" data-testid="tilbud-hero-netto">
                      <span className="font-bold tabular-nums tracking-[-0.01em]" style={{ ...heading, color: GRONN, fontSize: '17px' }}>≈ {tall(netto)} kr til deg</span>
                      <span>hver måned etter DigiHome-honorar ({r.honorarPct} % eks. mva)</span>
                    </p>
                  )}
                  {grunnlag && (
                    <p className="mt-4 flex items-start gap-2 text-[13.5px] leading-relaxed text-[#737373]">
                      <svg width="14" height="14" viewBox="0 0 18 18" fill="none" className="mt-[3px] shrink-0" aria-hidden="true">
                        <path d="m3.6 9.4 3.4 3.4 7.4-7.6" stroke={LILLA_LYS} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Vurdert mot <b className="font-semibold text-[#404040]">{grunnlag.antallILeide} faktiske leieforhold</b> i DigiHome-porteføljen{grunnlag.antallISone > 0 ? `, ${grunnlag.antallISone} i samme postsone` : ''}.</span>
                    </p>
                  )}
                </>
              ) : (
                <h1 className="mt-3 font-bold leading-[1.04] tracking-[-0.025em]" style={{ ...heading, fontSize: 'clamp(36px, 6vw, 56px)' }}>
                  {pent(tilbud.adresse)}
                </h1>
              )}
            </div>

            {/* B — boligbildet, høyt i første viewport (interaktiv før/etter når den finnes) */}
            {harHeroBilde && (
              <div className={innKl('delay-200 lg:col-start-2 lg:row-start-1 lg:row-span-2')}>
                {valgtStylet ? (
                  <>
                    <ForEtter
                      forUrl={valgtStylet.kildeUrl || originalBilde}
                      etterUrl={`/api/tilbud/bilde?id=${valgtStylet.id}`}
                      nokkel={valgtStylet.id}
                      ratio="aspect-[4/3]"
                      etterEtikett={['optimal', 'lysloft'].includes(valgtStylet.stil) ? 'Klargjort av DigiHome' : 'AI-møblert · illustrasjon'}
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-[12.5px] text-[#a3a3a3]">Dra i linjen — original til venstre, klargjort av oss til høyre.</p>
                      {stylet.length > 1 && <p className="shrink-0 text-[12px] tabular-nums text-[#c4c0ba]">{aktivStylet + 1} av {stylet.length}</p>}
                    </div>
                    {stylet.length > 1 && (
                      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                        {stylet.map((s, i) => (
                          <button key={s.id} type="button" onClick={() => setAktivStylet(i)} className="relative shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={`/api/tilbud/bilde?id=${s.id}`} alt={s.stil ? `Stil: ${s.stil}` : ''} loading="lazy"
                              className={`h-14 w-[84px] rounded-[10px] object-cover transition-all ${i === aktivStylet ? 'ring-2 ring-[#141414] ring-offset-2 ring-offset-[#f8f8f6]' : 'opacity-55 hover:opacity-100'}`} />
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="overflow-hidden rounded-[18px] ring-1 ring-black/[0.07]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={originalBilde} alt="Boligen fra annonsen" className="block aspect-[4/3] w-full object-cover" fetchPriority="high" data-testid="tilbud-hovedbilde" />
                  </div>
                )}
              </div>
            )}

            {/* C — neste steg + Sarah */}
            <div className={innKl(`delay-300 ${harHeroBilde ? 'lg:col-start-1 lg:row-start-2 lg:self-end' : 'mt-1'}`)}>
              <p className="max-w-[500px] text-[15px] leading-[1.65] text-[#525252]" data-testid="tilbud-hero-intro">
                {tilbud.tekst?.heroIntro || 'Annonsen er allerede produsert — bilder, tekst og pris. Vi håndterer annonsering, visninger, kontrakt og oppfølging.'}
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button onClick={tilKontakt} data-testid="tilbud-hero-cta" className={KNAPP_MORK}>Snakk med Sarah</button>
                <button onClick={tilHvorfor} data-testid="tilbud-hero-regnestykke" className={KNAPP_GHOST}>Hvorfor denne prisen?</button>
              </div>
              <div className="mt-7 flex items-center gap-3" data-testid="tilbud-hero-sarah">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman" className="h-10 w-10 rounded-full object-cover ring-2 ring-white" />
                <p className="text-[13px] leading-snug text-[#737373]">
                  <span className="block font-semibold text-[#141414]">Sarah Sleeman</span>
                  din kontaktperson i DigiHome
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══ 2 · BEVISET — intervall, faktisk grunnlag og dagens annonse → vår versjon ══ */}
        <Avsnitt id="hvorfor" className={`${SEKSJON} scroll-mt-24`}>
          <SeksjonHode
            midt
            kicker="Beviset"
            tittel={anbefalt > 0 ? `Hvorfor ${tall(anbefalt)} kr er riktig pris.` : 'Vår vurdering.'}
            intro={tilbud.tekst?.potensialTekst || 'Vurderingen bygger på hva sammenlignbare boliger faktisk leies ut for i DigiHomes egen portefølje i Bergen — ikke på annonsepriser eller synsing.'}
          />

          {/* Prislinjal + faktisk grunnlag — samlet i ett kort */}
          {(intervall || grunnlag) && (
            <div className="mx-auto mt-11 max-w-[880px] overflow-hidden rounded-[20px] bg-white shadow-[0_2px_20px_rgba(20,20,20,0.045)] ring-1 ring-black/[0.06]">
              {intervall && (
                <div className="px-6 pb-6 pt-7 sm:px-10 sm:pb-7 sm:pt-8">
                  <IntervallBar lo={intervall[0]} hi={intervall[1]} anbefalt={anbefalt} dagens={dagens} />
                </div>
              )}
              {grunnlag && (
                <div className={`flex flex-wrap items-baseline justify-center gap-x-12 gap-y-4 px-6 py-5 text-center sm:px-10 ${intervall ? 'border-t border-black/[0.06] bg-[#fafaf8]' : ''}`} data-testid="tilbud-grunnlag">
                  <div>
                    <p className="text-[20px] font-bold tabular-nums tracking-[-0.015em]" style={heading}>{grunnlag.antallILeide}</p>
                    <p className="mt-0.5 text-[12.5px] text-[#737373]">faktiske leieforhold i grunnlaget</p>
                  </div>
                  {grunnlag.antallISone > 0 && (
                    <div>
                      <p className="text-[20px] font-bold tabular-nums tracking-[-0.015em]" style={heading}>{grunnlag.antallISone}</p>
                      <p className="mt-0.5 text-[12.5px] text-[#737373]">utleid i samme postsone{grunnlag.sone ? ` (${grunnlag.sone})` : ''}</p>
                    </div>
                  )}
                  {grunnlag.snittSone > 0 && (
                    <div>
                      <p className="text-[20px] font-bold tabular-nums tracking-[-0.015em]" style={heading}>{tall(grunnlag.snittSone)} kr</p>
                      <p className="mt-0.5 text-[12.5px] text-[#737373]">snitt oppnådd leie i sonen</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {vurdertDato && (
            <p className="mt-4 text-center text-[12.5px] text-[#a3a3a3]">Vurdert {vurdertDato} · oppdateres ved endringer i markedet.</p>
          )}

          {/* Dagens annonse → slik ville vi gjort det */}
          {visSammenligning && (
            <div className="mt-[clamp(56px,6vw,84px)]">
              <div className="text-center">
                <h3 className="text-[clamp(19px,2vw,22px)] font-semibold tracking-[-0.015em]" style={heading}>Annonsen din i dag — og slik ville vi gjort det.</h3>
                <p className="mx-auto mt-2.5 max-w-[600px] text-[14.5px] leading-[1.65] text-[#737373]">
                  Dette handler ikke om at dagens annonse er dårlig — men om detaljene som avgjør hvem som tar kontakt, og til hvilken pris.
                </p>
              </div>

              <div className="mx-auto mt-9 grid max-w-[1040px] grid-cols-1 items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr] sm:gap-5" data-testid="tilbud-sammenligning">
                <MiniAnnonse
                  variant="idag"
                  bilde={originalBilde}
                  tittel={tilbud.tittel || 'Dagens annonse'}
                  adresse={pent(tilbud.adresse)}
                  pris={dagens}
                />
                <div className="flex items-center justify-center" aria-hidden="true">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0eafc] text-[15px] font-semibold" style={{ color: LILLA }}>
                    <span className="hidden sm:inline">→</span>
                    <span className="sm:hidden">↓</span>
                  </span>
                </div>
                <MiniAnnonse
                  variant="dh"
                  bilde={dhBilde}
                  aiBilde={stylet.length > 0}
                  tittel={harAnnonse ? tilbud.annonse.tittel : (tilbud.tittel || '')}
                  adresse={pent(tilbud.adresse)}
                  pris={anbefalt}
                  netto={netto}
                />
              </div>

              <div className="mx-auto mt-10 grid max-w-[920px] grid-cols-1 gap-x-12 gap-y-7 sm:grid-cols-2" data-testid="tilbud-sammenligning-punkter">
                {sammenligningsPunkter.map(([t, d]) => (
                  <div key={t} className="border-t border-black/[0.09] pt-4">
                    <p className="text-[15px] font-bold tracking-[-0.01em]" style={heading}>{t}</p>
                    <p className="mt-1.5 text-[14px] leading-[1.65] text-[#737373]">{d}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="mx-auto mt-12 max-w-[560px] text-center text-[12.5px] leading-relaxed text-[#a3a3a3]">
            Vurderingen er gjort mot faktiske leieinntekter i DigiHomes egen portefølje i Bergen. Endelig leie settes alltid sammen med deg.
          </p>
        </Avsnitt>

        {/* ══ 3 · ØKONOMIEN — én presis blokk, ikke pyntet ══ */}
        <Avsnitt id="regnestykke" className={`${SEKSJON} scroll-mt-24`}>
          <SeksjonHode midt kicker="Økonomien" tittel="Regnestykket." intro="Ett tall inn, to tall ut — hva boligen gir, hva vi tar, og hva som er igjen til deg." />

          <div className="mx-auto mt-10 max-w-[1000px] overflow-hidden rounded-[20px] bg-white shadow-[0_2px_20px_rgba(20,20,20,0.045)] ring-1 ring-black/[0.06]">
            <div className="grid grid-cols-1 divide-y divide-black/[0.06] sm:grid-cols-3 sm:divide-x sm:divide-y-0" data-testid="tilbud-kpi">
              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <p className="text-[12.5px] font-medium text-[#737373]">Anbefalt leie</p>
                <p className="mt-2 text-[clamp(26px,2.6vw,32px)] font-bold tabular-nums tracking-[-0.02em]" style={heading}><TellOpp verdi={anbefalt} />{'\u2009'}kr</p>
                <p className="mt-1 text-[12.5px] text-[#a3a3a3]">per måned</p>
              </div>
              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <p className="text-[12.5px] font-medium text-[#737373]">− DigiHome-honorar</p>
                <p className="mt-2 text-[clamp(26px,2.6vw,32px)] font-bold tabular-nums tracking-[-0.02em] text-[#737373]" style={heading}><TellOpp verdi={r.honorarMnd} />{'\u2009'}kr</p>
                <p className="mt-1 text-[12.5px] text-[#a3a3a3]">{r.honorarPct} % eks. mva — alt arbeid inkludert</p>
              </div>
              <div className="bg-[#f4faf5] px-6 py-6 sm:px-8 sm:py-8">
                <p className="text-[12.5px] font-semibold" style={{ color: GRONN }}>= Til deg hver måned</p>
                <p className="mt-2 text-[clamp(28px,2.9vw,36px)] font-bold tabular-nums tracking-[-0.02em]" style={{ ...heading, color: GRONN }}><TellOpp verdi={netto} />{'\u2009'}kr</p>
                <p className="mt-1 text-[12.5px] text-[#5b7a63]">estimert, før eierkostnader og skatt</p>
              </div>
            </div>
            {netto > 0 && (
              <div className="flex flex-wrap items-baseline justify-center gap-x-10 gap-y-2 border-t border-black/[0.06] bg-[#fafaf8] px-6 py-4 sm:px-8" data-testid="tilbud-regnestykke">
                <p className="text-[13px] text-[#737373]">Over 12 måneder: <span className="font-bold tabular-nums text-[#141414]" style={heading}>{tall(netto * 12)} kr</span> til deg</p>
                <p className="text-[13px] text-[#737373]">Årlig honorar: <span className="font-bold tabular-nums text-[#141414]" style={heading}>{tall((r.honorarMnd || 0) * 12)} kr</span></p>
                {gevinst != null && gevinst > 0 && (
                  <p className="text-[13px] font-medium" style={{ color: GRONN }}>+ {tall(gevinst)} kr/mnd mer enn annonsert pris i dag</p>
                )}
              </div>
            )}
          </div>

          <p className="mx-auto mt-4 max-w-[620px] text-center text-[12.5px] leading-relaxed text-[#a3a3a3]">
            Honoraret er oppgitt eks. mva. Estimatet er før eierkostnader, eventuell ledighet og skatt — det gir deg sammenligningsgrunnlaget, ikke et regnskap.
          </p>
        </Avsnitt>

        {/* ══ 4 · ANNONSEN ER KLAR — tonal seksjon med ekte preview ══ */}
        {harAnnonse && (
          <div className={`relative left-1/2 ${SEKSJON} w-[min(100vw-16px,1360px)] -translate-x-1/2 overflow-hidden rounded-[28px] bg-[#f3f1ec] sm:rounded-[36px]`}>
            <Avsnitt className={`mx-auto max-w-[1200px] px-5 sm:px-8 ${BAND_PY}`}>
              <SeksjonHode
                midt
                kicker="Jobben er allerede gjort"
                tittel="Annonsen er klar."
                intro="Bildene er valgt. Teksten er skrevet. Prisen er satt. Sier du ja, kan den være live innen 24 timer."
              />

              {/* Kompakt preview — jobben er synlig, ikke bare påstått */}
              {!visAnnonse && (
                <button onClick={() => setVisAnnonse(true)} data-testid="tilbud-vis-annonse"
                  className="group mx-auto mt-10 block w-full max-w-[720px] overflow-hidden rounded-[16px] bg-white text-left ring-1 ring-black/[0.07] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_36px_rgba(20,20,20,0.09)]">
                  {dhBilde && (
                    <span className="relative block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={dhBilde} alt="Hovedbilde i annonsen" className="block aspect-[2/1] w-full object-cover" loading="lazy" data-testid="tilbud-annonse-kort-bilde" />
                      {stylet.length > 0 && (
                        <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/45 px-2.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm" title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>
                      )}
                    </span>
                  )}
                  <span className="block px-5 py-4 sm:px-6">
                    <span className="block text-[16.5px] font-bold leading-snug tracking-[-0.01em]" style={heading}>{tilbud.annonse.tittel}</span>
                    <span className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-[13.5px] text-[#737373]">{pent(tilbud.adresse)}</span>
                      <span className="text-[15px] font-bold tabular-nums" style={heading}>{tall(anbefalt)} kr / mnd</span>
                    </span>
                    <span className="mt-3.5 flex items-center gap-1.5 text-[13.5px] font-semibold" style={{ color: LILLA }}>
                      Se hele annonsen <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </span>
                </button>
              )}

              {visAnnonse && (
                <div className="mx-auto mt-10 max-w-[860px]">
                  <AnnonsePreview tilbud={tilbud} r={r} />
                  <button onClick={() => setVisAnnonse(false)} data-testid="tilbud-skjul-annonse"
                    className="mt-4 text-[13.5px] font-semibold text-[#737373] transition-colors hover:text-[#141414]">
                    Skjul annonseutkastet ↑
                  </button>
                </div>
              )}
            </Avsnitt>
          </div>
        )}

        {/* ══ 5 · ARBEIDSFORDELINGEN — mørk seksjon: du gjør to ting, vi tar resten ══ */}
        <div className={`relative left-1/2 ${SEKSJON} w-[min(100vw-16px,1360px)] -translate-x-1/2 overflow-hidden rounded-[28px] bg-[#141414] text-white sm:rounded-[36px]`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[300px] bg-[radial-gradient(760px_260px_at_28%_-60px,rgba(196,176,242,0.10),transparent_70%)]" />
          <Avsnitt className={`mx-auto max-w-[1200px] px-5 sm:px-8 ${BAND_PY}`}>
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-24" data-testid="tilbud-manifest">
              <div>
                <SeksjonHode
                  lys
                  kicker="Arbeidsfordelingen"
                  tittel={<>Du gjør to ting.<br />Vi tar resten.</>}
                  intro="Vi er eiendomsmeglere med utleie som spesialfelt. Å leie ut trenger ikke bli en ny jobb for deg."
                />
              </div>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:pt-1">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">Du gjør</p>
                  <ul className="mt-4">
                    {['Gir oss nøklene', 'Godkjenner leietaker'].map((t, i) => (
                      <li key={t} className="flex items-baseline gap-3.5 border-t border-white/10 py-4">
                        <span className="text-[13px] font-bold tabular-nums text-[#c4b0f2]" style={heading}>0{i + 1}</span>
                        <span className="text-[16.5px] font-semibold tracking-[-0.01em]" style={heading}>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/40">DigiHome gjør</p>
                  <ul className="mt-4">
                    {['Annonse og bilder', 'Markedsføring', 'Visninger', 'Screening og referansesjekk', 'Kontrakt og depositum', 'Innflytting og protokoll', 'Oppfølging gjennom leieforholdet'].map((t) => (
                      <li key={t} className="flex items-center gap-2.5 border-t border-white/10 py-3 text-[14px] text-white/75">
                        <svg width="13" height="13" viewBox="0 0 18 18" fill="none" className="shrink-0" aria-hidden="true">
                          <path d="m3.6 9.4 3.4 3.4 7.4-7.6" stroke="#7ed9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Trust-strip — kun verifiserbare fakta */}
            <div className="mt-14 flex flex-wrap items-baseline gap-x-12 gap-y-3 border-t border-white/10 pt-7" data-testid="tilbud-trust">
              <p className="text-[13.5px] text-white/55"><span className="font-bold text-white" style={heading}>Eiendomsmeglere</span> med utleie som spesialfelt</p>
              {grunnlag && <p className="text-[13.5px] tabular-nums text-white/55"><span className="font-bold text-white" style={heading}>{grunnlag.antallILeide}</span> aktive leieforhold i Bergen</p>}
              {grunnlag?.antallISone > 0 && <p className="text-[13.5px] tabular-nums text-white/55"><span className="font-bold text-white" style={heading}>{grunnlag.antallISone}</span> utleid i samme postsone</p>}
            </div>
          </Avsnitt>
        </div>

        {/* ══ 6 · TRYGGHETEN — innvendinger, ikke repetisjon ══ */}
        <Avsnitt className={SEKSJON}>
          <SeksjonHode midt kicker="Tryggheten" tittel="Spørsmål?" />
          <div className="mx-auto mt-8 max-w-[760px] border-b border-black/[0.07]">
            {[
              ['Er leien garantert?', `Nei — ${tall(anbefalt)} kr er vår faglige anbefaling basert på faktiske leieinntekter i porteføljen vår. Endelig leie settes sammen med deg, og markedet gir fasiten. Vi anbefaler aldri en pris vi ikke tror vi oppnår.`],
              ['Hvem bestemmer hvilken leietaker jeg får?', 'Du. Vi screener interessenter, sjekker referanser og kredittverdighet, og legger frem de beste kandidatene — men du godkjenner alltid leietakeren selv.'],
              ['Hva inngår faktisk i honoraret?', `Alt i «DigiHome gjør»-listen over: annonse, markedsføring, visninger, screening, kontrakt, depositum, innflytting og løpende oppfølging. ${r.honorarPct} % av månedsleien, eks. mva — ingen etableringsgebyr, ingen skjulte kostnader.`],
              ['Hva skjer hvis det oppstår problemer i leieforholdet?', 'Da er det oss leietakeren kontakter — ikke deg. Vi håndterer oppfølging, purringer og praktiske spørsmål, og involverer deg kun når en beslutning faktisk er din.'],
              ['Hva om jeg vil avslutte samarbeidet?', 'Ingen bindingstid på forvaltningen. Fungerer det ikke, avslutter vi ryddig — leiekontrakten med leietaker består uansett på dine vilkår.'],
            ].map(([q, a], i) => (
              <div key={q} className="border-t border-black/[0.07]">
                <button type="button" onClick={() => setAapen(aapen === i ? -1 : i)} aria-expanded={aapen === i}
                  className="flex w-full items-center justify-between gap-5 py-5 text-left">
                  <span className="text-[15.5px] font-semibold tracking-[-0.01em]" style={heading}>{q}</span>
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[15px] font-medium leading-none transition-all duration-300 ${aapen === i ? 'rotate-45 border-transparent bg-[#141414] text-white' : 'border-black/[0.12] text-[#737373]'}`} aria-hidden="true">+</span>
                </button>
                <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${aapen === i ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                  <div className="overflow-hidden">
                    <p className="max-w-[660px] pb-6 text-[14.5px] leading-[1.7] [text-wrap:pretty] text-[#737373]">{a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Avsnitt>

        {/* ══ 7 · NESTE STEG — tidspunktet er hovedinformasjonen ══ */}
        <Avsnitt className={SEKSJON}>
          <SeksjonHode midt kicker="Neste steg" tittel="Slik kommer vi i gang." />
          <div className="mx-auto mt-10 grid max-w-[1060px] grid-cols-1 gap-7 sm:grid-cols-4 sm:gap-8">
            {[
              ['I dag', 'Vi tar en prat', 'Uforpliktende — vi går gjennom tallene sammen.', false],
              ['Dag 1–2', 'Vi ser boligen', 'Befaring, og du leverer nøklene.', false],
              ['Innen 24 timer', 'Annonsen går live', 'Den er allerede produsert — vi trykker publiser.', true],
              ['Deretter', 'Vi finner leietaker', 'Visninger, kontrakt og forvaltning — vi håndterer resten.', false],
            ].map(([tid, t, d, uthev]) => (
              <div key={tid} className={`relative border-t-2 pt-5 ${uthev ? 'border-[#8b5cf6]' : 'border-black/[0.08]'}`}>
                <span aria-hidden="true" className={`absolute -top-[5px] left-0 h-2 w-2 rounded-full ${uthev ? 'bg-[#8b5cf6]' : 'bg-[#d6d2ca]'}`} />
                <span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-bold ${uthev ? 'bg-[#f0eafc]' : 'bg-black/[0.05] text-[#525252]'}`} style={uthev ? { color: LILLA } : undefined}>{tid}</span>
                <p className="mt-3 text-[16px] font-semibold tracking-[-0.01em]" style={heading}>{t}</p>
                <p className="mt-1.5 text-[13.5px] leading-[1.65] text-[#737373]">{d}</p>
              </div>
            ))}
          </div>
        </Avsnitt>
      </main>

      {/* ══ 8 · FINAL CTA — neste steg i en dialog, ikke et skjema ══ */}
      <div id="kontakt" className={`relative ${SEKSJON} mx-auto w-[min(100vw-16px,1360px)] scroll-mt-16 overflow-hidden rounded-[28px] bg-[#141414] text-white sm:rounded-[36px]`}>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[320px] bg-[radial-gradient(820px_280px_at_50%_-80px,rgba(196,176,242,0.12),transparent_70%)]" />
        <Avsnitt className={`mx-auto max-w-[1200px] px-5 sm:px-8 ${BAND_PY}`}>
          {sendt ? (
            <div className="py-4 text-center" data-testid="tilbud-kontakt">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="m6 11.5 3.2 3.2L16.5 7.5" stroke="#7ed9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-4 text-[22px] font-bold tracking-[-0.01em]" style={heading}>Takk! Sarah ringer deg i dag eller i morgen.</p>
              <p className="mt-2 text-[14px] text-white/55">Helt uforpliktende — en kort prat om boligen og hva vi kan få til.</p>
            </div>
          ) : (
            <div className="mx-auto max-w-[640px] text-center" data-testid="tilbud-kontakt">
              <div className="mx-auto flex w-fit items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/15" />
                <p className="text-left text-[13px] leading-snug text-white/60">
                  <span className="block font-semibold text-white">Sarah Sleeman</span>
                  din kontaktperson
                </p>
              </div>
              <h2 className="mt-6 text-[clamp(28px,3.6vw,40px)] font-bold leading-[1.08] tracking-[-0.025em]" style={heading}>Vil du at Sarah tar neste steg?</h2>
              <p className="mx-auto mt-4 max-w-[440px] text-[15px] leading-[1.65] text-white/60">
                Neste steg er bare en uforpliktende prat. Ingenting signeres her.
              </p>
              <div className="mx-auto mt-9 flex max-w-[520px] flex-col gap-2.5 sm:flex-row">
                <input value={skjema.telefon} onChange={(e) => setSkjema((s) => ({ ...s, telefon: e.target.value }))}
                  placeholder="Telefonnummeret ditt" inputMode="tel" autoComplete="tel" aria-label="Telefonnummeret ditt" data-testid="tilbud-telefon"
                  className="h-[52px] flex-1 rounded-full border border-white/15 bg-white/[0.07] px-6 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45" />
                <button onClick={send} disabled={sender || !skjema.telefon.trim()} data-testid="tilbud-send"
                  className="h-[52px] shrink-0 rounded-full bg-white px-8 text-[15px] font-semibold text-[#141414] transition-all hover:bg-white/90 active:scale-[0.98] disabled:opacity-40">
                  {sender ? 'Sender…' : 'Be Sarah ringe meg'}
                </button>
              </div>
              <textarea value={skjema.melding} onChange={(e) => setSkjema((s) => ({ ...s, melding: e.target.value }))}
                placeholder="Noe vi bør vite før vi ringer? (valgfritt)" rows={2} aria-label="Melding (valgfritt)"
                className="mx-auto mt-3 block w-full max-w-[520px] resize-none rounded-[18px] border border-white/15 bg-white/[0.07] px-6 py-3.5 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45" />
              {feil && <p className="mt-2 text-[13px] text-rose-300">{feil}</p>}
              <p className="mt-4 text-[12px] text-white/35">Vi bruker kun nummeret til å kontakte deg om dette tilbudet.</p>
              {netto > 0 && (
                <p className="mx-auto mt-9 max-w-[440px] border-t border-white/10 pt-5 text-[13.5px] text-white/50">
                  Estimert etter DigiHome-honorar: <span className="font-bold tabular-nums text-[#7ed9a7]">{tall(netto)} kr / mnd</span>
                </p>
              )}
            </div>
          )}
        </Avsnitt>
      </div>

      {/* ── Kolofon ── */}
      <footer className="mx-auto max-w-[1200px] px-5 pb-28 pt-12 sm:px-8 sm:pb-16">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[20px] w-auto opacity-90" />
            <p className="mt-2.5 text-[12px] text-[#a3a3a3]">Personlig utleievurdering for {pent(tilbud.adresse)} · Bergen</p>
          </div>
          <p className="max-w-[460px] text-[11.5px] leading-relaxed text-[#a3a3a3] sm:text-right">
            Forbedrede og møblerte bilder er AI-genererte, basert på annonsens egne foto — møblering og dekor er veiledende.
            Honorar oppgis eks. mva. DigiHome AS · digihome.no
          </p>
        </div>
      </footer>

      {/* ── Flytende bunn-CTA (kun mobil) ── */}
      {!sendt && (
        <div className={`fixed inset-x-0 bottom-0 z-40 px-3 pb-3 transition-transform duration-300 sm:hidden ${visBunn ? 'translate-y-0' : 'translate-y-[120%]'}`}>
          <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white/95 px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.06] backdrop-blur-md">
            <div className="min-w-0">
              <p className="truncate text-[11px] font-medium text-[#a3a3a3]">Anbefalt leie {tall(anbefalt)} kr/mnd</p>
              <p className="text-[16px] font-bold tabular-nums tracking-[-0.01em]" style={{ ...heading, color: GRONN }}>{tall(netto)} kr til deg</p>
            </div>
            <button onClick={tilKontakt} data-testid="tilbud-bunn-cta"
              className="h-11 shrink-0 rounded-full bg-[#141414] px-5 text-[13.5px] font-semibold text-white transition-transform active:scale-[0.97]">
              Snakk med Sarah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
