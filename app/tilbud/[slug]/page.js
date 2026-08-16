'use client';

/* ═══════════ OFFENTLIG TILBUDSSIDE — /tilbud/[slug] ═══════════
   «Personlig utleievurdering som føles som et digitalt rådgivningsprodukt.»
   Hver seksjon gjør én av fire jobber: vise hva boligen kan gi, bevise
   hvorfor, demonstrere at jobben allerede er gjort, eller gjøre neste steg
   ekstremt enkelt. Designspråk: lys og varm, blekk-tekst, hårfine delere,
   sentence case, tabular-nums på alle tall, én mørk seksjon (final CTA),
   én tonal seksjon (annonsen). Ingen gradients, ingen scroll-progress.
   Åpninger spores (spor=1) og vises i Salgsradar-pipelinen. */

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

/* Palett: flate #F8F8F6 · tonal #F5F5F2 · overflate #FFF · blekk #141414
   sekundær #737373 · grønn #1F7A45 · mørk seksjon #141414 (kun final CTA) */

const KNAPP_MORK = 'inline-flex h-11 items-center justify-center rounded-[10px] bg-[#141414] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-black/80 disabled:opacity-40';
const KNAPP_GHOST = 'inline-flex h-11 items-center justify-center rounded-[10px] border border-black/[0.14] px-6 text-[14px] font-semibold text-[#141414] transition-colors hover:border-black/30';

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

/* ── Interaktiv før/etter-slider — demonstrerer DigiHome-produktet ── */
function ForEtter({ forUrl, etterUrl, nokkel, etterEtikett = 'AI-stylet \u00b7 illustrasjon' }) {
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
      className="relative aspect-[16/10] cursor-ew-resize select-none overflow-hidden rounded-[12px] bg-[#e9e7e2]"
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
        <span className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-[0_2px_10px_rgba(0,0,0,0.22)]">
          <svg width="16" height="11" viewBox="0 0 18 12" fill="none" aria-hidden="true">
            <path d="M5.5 1 1 6l4.5 5M12.5 1 17 6l-4.5 5" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <span className={`pointer-events-none absolute left-3 top-3 rounded-[7px] bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white transition-opacity duration-200 ${pos > 24 ? 'opacity-100' : 'opacity-0'}`}>
        Original
      </span>
      <span className={`pointer-events-none absolute right-3 top-3 rounded-[7px] bg-black/50 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white transition-opacity duration-200 ${pos < 84 ? 'opacity-100' : 'opacity-0'}`} title="AI-generert forslag basert på annonsens eget foto">
        {etterEtikett} {'\u24D8'}
      </span>
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
        className="overflow-hidden rounded-[12px] bg-white ring-1 ring-black/[0.08]"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowLeft') bytt(-1); if (e.key === 'ArrowRight') bytt(1); }}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fafaf8] px-4 py-2.5 sm:px-6">
          <span className="rounded-[6px] bg-[#141414] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">Til leie</span>
          <span className="text-[11px] font-medium text-[#737373]">Forhåndsvisning av annonsen din</span>
        </div>

        {akt && (
          <div className="group relative bg-[#141414]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={akt.url} alt="Bilde fra annonsen" className="block aspect-[2/1] w-full object-cover" draggable={false} loading="lazy"
              data-testid="tilbud-annonse-bilde"
              onError={() => setDode((d) => (d.includes(akt.url) ? d : [...d, akt.url]))} />
            {akt.ai && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-[7px] bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white" title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>
            )}
            {bilder.length > 1 && (
              <>
                {[['\u2039', -1, 'left-2', 'Forrige bilde'], ['\u203A', 1, 'right-2', 'Neste bilde']].map(([tegn, retn, pos, label]) => (
                  <button key={label} type="button" aria-label={label} onClick={() => bytt(retn)}
                    className={`absolute ${pos} top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-[18px] leading-none text-white backdrop-blur-sm transition-all hover:bg-black/55 sm:opacity-0 sm:group-hover:opacity-100`}>
                    {tegn}
                  </button>
                ))}
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-[7px] bg-black/45 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
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
          <div className={`mx-4 mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-black/[0.06] bg-black/[0.06] sm:mx-6 ${fakta.length >= 5 ? 'sm:grid-cols-5' : fakta.length === 4 ? 'sm:grid-cols-4' : fakta.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
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
                <span key={f} className="rounded-[8px] border border-black/[0.08] bg-[#fafaf8] px-2.5 py-1 text-[12px] font-medium text-[#525252]">{f}</span>
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
  const [scrollet, setScrollet] = useState(false);

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

  // Kontekst-header + sticky bunn-CTA på mobil
  useEffect(() => {
    const sjekk = () => {
      const kontakt = document.getElementById('kontakt');
      const kontaktSynlig = kontakt ? kontakt.getBoundingClientRect().top < window.innerHeight - 80 : false;
      setVisBunn(window.scrollY > 560 && !kontaktSynlig);
      setScrollet(window.scrollY > 420);
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
  const tilRegnestykke = () => {
    if (typeof document !== 'undefined') document.getElementById('regnestykke')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const r = tilbud?.regnestykke || {};
  const gevinst = r.gevinstMnd;
  const stylet = tilbud?.stylet || [];
  const valgtStylet = stylet[aktivStylet] || null;
  const originalBilde = (tilbud?.bilder || [])[0] || null;
  const harAnnonse = Boolean(tilbud?.annonse);
  const grunnlag = tilbud?.grunnlag || null;
  const vurdertDato = fmtDato(tilbud?.vurdert);

  // Markedsintervall rundt anbefalt leie (±3 %, rundet til nærmeste 100)
  const intervall = useMemo(() => {
    const a = Number(r.anbefaltLeie) || 0;
    if (!a) return null;
    const rund = (x) => Math.round(x / 100) * 100;
    return [rund(a * 0.97), rund(a * 1.03)];
  }, [r.anbefaltLeie]);

  const fakta = useMemo(() => [
    tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null, tilbud?.boligtype ? pent(tilbud.boligtype) : null,
  ].filter(Boolean), [tilbud]);

  // «Hvorfor vi tror på leien» — konkrete punkter fra annonsens egne høydepunkter
  const leiePunkter = useMemo(() => {
    const ut = [];
    for (const h of (tilbud?.annonse?.hoydepunkter || []).slice(0, 2)) ut.push([h, 'Et tydelig salgsargument i annonsen.']);
    if (tilbud?.m2 || tilbud?.soverom) {
      ut.push([[tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null].filter(Boolean).join(' · '), 'Et format med bred leietakermålgruppe.']);
    }
    return ut.slice(0, 3);
  }, [tilbud]);

  // Forsidebilde til det kompakte annonse-kortet
  const annonseKortBilde = useMemo(() => {
    if (stylet.length) return `/api/tilbud/bilde?id=${stylet[0].id}`;
    return originalBilde;
  }, [stylet, originalBilde]);

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
    <div className="min-h-screen bg-[#f8f8f6] text-[#141414]" data-testid="tilbud-side">

      {/* ── Kontekst-header: logo → adresse + pris når heroen er ute av syne ── */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#f8f8f6]/92 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between gap-4 px-5 sm:px-8">
          <div className="relative flex min-w-0 flex-1 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className={`h-[21px] w-auto transition-opacity duration-300 ${scrollet ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute inset-x-0 flex min-w-0 items-baseline gap-2.5 transition-opacity duration-300 ${scrollet ? 'opacity-100' : 'pointer-events-none opacity-0'}`} data-testid="tilbud-header-kontekst">
              <span className="truncate text-[14px] font-bold" style={heading}>{pent(tilbud.adresse)}</span>
              {r?.nettoTilEier > 0 && <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#737373]">{tall(r.nettoTilEier)} kr/mnd</span>}
            </span>
          </div>
          <button onClick={tilKontakt} data-testid="tilbud-topp-cta"
            className="h-9 shrink-0 rounded-[10px] bg-[#141414] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-black/80">
            Snakk med Sarah
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] px-5 sm:px-8">

        {/* ── Hero: 7/5 — budskap venstre, tilbudsfakta høyre ── */}
        <section className="pt-12 sm:pt-16">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_340px] lg:gap-24">
            <div>
              <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
                Personlig utleievurdering{vurdertDato ? ` · ${vurdertDato}` : ''}
              </p>
              {r?.nettoTilEier > 0 ? (
                <>
                  <h1 className="mt-6 text-[54px] font-bold leading-none tracking-[-0.03em] sm:text-[80px]" style={heading}>
                    {tall(r.nettoTilEier)}{'\u2009'}kr<span className="text-[24px] font-semibold text-[#737373] sm:text-[32px]"> / mnd</span>
                  </h1>
                  <p className="mt-3 text-[19px] font-semibold tracking-[-0.01em] text-[#262626] sm:text-[22px]" style={heading}>
                    estimert til deg etter DigiHome-honorar
                  </p>
                </>
              ) : (
                <h1 className="mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[64px]" style={heading}>
                  {pent(tilbud.adresse)}
                </h1>
              )}
              <p className="mt-6 max-w-[540px] text-[16.5px] leading-relaxed text-[#404040]" data-testid="tilbud-hero-intro">
                Vi anbefaler en månedlig leie på <span className="font-semibold tabular-nums text-[#141414]">{tall(r.anbefaltLeie)} kr</span>.
                Vi håndterer annonsering, visninger, kontrakt og oppfølging.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button onClick={tilKontakt} data-testid="tilbud-hero-cta" className={KNAPP_MORK}>Snakk med Sarah</button>
                <button onClick={tilRegnestykke} data-testid="tilbud-hero-regnestykke" className={KNAPP_GHOST}>Se regnestykket ↓</button>
              </div>

              <div className="mt-7 flex items-center gap-2.5" data-testid="tilbud-hero-sarah">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman" className="h-9 w-9 rounded-full object-cover" />
                <p className="text-[13.5px] text-[#737373]">
                  <span className="font-semibold text-[#141414]">Sarah Sleeman</span> — din kontaktperson i DigiHome
                </p>
              </div>
            </div>

            {/* Tilbudsfakta — «investment memo», uten kort */}
            <aside className="lg:pt-10" data-testid="tilbud-hero-fakta">
              <p className="text-[17px] font-bold leading-snug" style={heading}>{pent(tilbud.adresse)}</p>
              {fakta.length > 0 && <p className="mt-1 text-[13.5px] text-[#737373]">{fakta.join(' · ')}</p>}
              <dl className="mt-5">
                {[
                  ['Anbefalt leie', `${tall(r.anbefaltLeie)} kr / mnd`],
                  ['DigiHome-honorar', `${r.honorarPct} % eks. mva`],
                  vurdertDato ? ['Vurdert', vurdertDato] : null,
                  grunnlag ? ['Grunnlag', `${grunnlag.antallILeide} leieforhold i porteføljen`] : null,
                ].filter(Boolean).map(([l, v]) => (
                  <div key={l} className="flex items-baseline justify-between gap-4 border-t border-black/[0.08] py-3">
                    <dt className="text-[13px] text-[#737373]">{l}</dt>
                    <dd className="text-right text-[13.5px] font-semibold tabular-nums" style={heading}>{v}</dd>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </section>

        {/* ── Boligbildet — demonstrasjon av DigiHome-produktet ── */}
        {valgtStylet ? (
          <section className="mt-12 sm:mt-16">
            <ForEtter
              forUrl={valgtStylet.kildeUrl || originalBilde}
              etterUrl={`/api/tilbud/bilde?id=${valgtStylet.id}`}
              nokkel={valgtStylet.id}
              etterEtikett={['optimal', 'lysloft'].includes(valgtStylet.stil) ? 'Klargjort av DigiHome' : 'AI-møblert · illustrasjon'}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#a3a3a3]">Dra i linjen — original til venstre, klargjort av DigiHome til høyre.</p>
              {stylet.length > 1 && <p className="hidden shrink-0 text-[12px] tabular-nums text-[#c4c0ba] sm:block">{aktivStylet + 1} av {stylet.length}</p>}
            </div>
            {stylet.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {stylet.map((s, i) => (
                  <button key={s.id} type="button" onClick={() => setAktivStylet(i)} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/tilbud/bilde?id=${s.id}`} alt={s.stil ? `Stil: ${s.stil}` : ''} loading="lazy"
                      className={`h-16 w-24 rounded-[8px] object-cover transition-all ${i === aktivStylet ? 'ring-2 ring-[#141414] ring-offset-2 ring-offset-[#f8f8f6]' : 'opacity-55 hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : originalBilde ? (
          <section className="mt-12 sm:mt-16">
            <div className="overflow-hidden rounded-[12px] ring-1 ring-black/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalBilde} alt="Boligen fra annonsen" className="block h-auto max-h-[640px] w-full object-cover" fetchPriority="high" data-testid="tilbud-hovedbilde" />
            </div>
          </section>
        ) : null}

        {/* ── Regnestykket — presist, ikke pyntet ── */}
        <Avsnitt id="regnestykke" className="mt-24 scroll-mt-24 sm:mt-28">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]" style={heading}>Regnestykket.</h2>

          <div className="mt-8 grid grid-cols-1 gap-y-6 sm:flex sm:flex-wrap sm:items-baseline sm:gap-x-7" data-testid="tilbud-kpi">
            <div>
              <p className="text-[28px] font-bold tabular-nums tracking-[-0.02em] sm:text-[34px]" style={heading}><TellOpp verdi={r.anbefaltLeie} />{'\u2009'}kr</p>
              <p className="mt-1 text-[13.5px] text-[#737373]">Anbefalt leie</p>
            </div>
            <span className="hidden text-[24px] font-light text-[#c4c0ba] sm:block" aria-hidden="true">−</span>
            <div>
              <p className="text-[28px] font-bold tabular-nums tracking-[-0.02em] text-[#737373] sm:text-[34px]" style={heading}><TellOpp verdi={r.honorarMnd} />{'\u2009'}kr</p>
              <p className="mt-1 text-[13.5px] text-[#737373]">DigiHome · {r.honorarPct} % eks. mva</p>
            </div>
            <span className="hidden text-[24px] font-light text-[#c4c0ba] sm:block" aria-hidden="true">=</span>
            <div>
              <p className="text-[34px] font-bold tabular-nums tracking-[-0.02em] text-[#1f7a45] sm:text-[42px]" style={heading}><TellOpp verdi={r.nettoTilEier} />{'\u2009'}kr</p>
              <p className="mt-1 text-[13.5px] text-[#737373]">estimert etter DigiHome-honorar</p>
            </div>
          </div>

          {gevinst != null && (
            <p className={`mt-7 max-w-[640px] border-t border-black/[0.07] pt-5 text-[15px] leading-relaxed ${gevinst > 0 ? 'text-[#1f7a45]' : 'text-[#737373]'}`}>
              {gevinst > 0
                ? <>Det er <b className="tabular-nums">{tall(gevinst)} kr mer i måneden</b> ({tall(r.gevinstAar)} kr i året) enn annonsert pris i dag — og vi tar hele jobben.</>
                : <>Annonsert pris i dag er {tall(r.dagensPris)} kr/mnd. Med oss slipper du annonsering, visninger, kontrakter og oppfølging.</>}
            </p>
          )}
          {r?.nettoTilEier > 0 && (
            <p className="mt-3 text-[14px] tabular-nums text-[#737373]" data-testid="tilbud-regnestykke">
              Over ett år: <span className="font-semibold text-[#141414]">{tall(r.nettoTilEier * 12)} kr</span> estimert til deg.
            </p>
          )}
          <p className="mt-3 max-w-[620px] text-[12.5px] leading-relaxed text-[#a3a3a3]">
            Honoraret er oppgitt eks. mva. Estimatet er før eierkostnader, eventuell ledighet og skatt.
          </p>
        </Avsnitt>

        {/* ── Hvorfor vi anbefaler leien — vis grunnlaget, ikke bare påstanden ── */}
        {r?.anbefaltLeie > 0 && (
          <Avsnitt className="mt-24 sm:mt-28">
            <h2 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]" style={heading}>Hvorfor vi anbefaler {tall(r.anbefaltLeie)} kr.</h2>

            <div className="mt-8 flex flex-wrap items-baseline gap-x-10 gap-y-5" data-testid="tilbud-grunnlag">
              {intervall && (
                <div>
                  <p className="text-[22px] font-bold tabular-nums tracking-[-0.01em]" style={heading}>{tall(intervall[0])}–{tall(intervall[1])} kr</p>
                  <p className="mt-1 text-[13px] text-[#737373]">Estimert markedsintervall</p>
                </div>
              )}
              <div>
                <p className="text-[22px] font-bold tabular-nums tracking-[-0.01em]" style={heading}>{tall(r.anbefaltLeie)} kr</p>
                <p className="mt-1 text-[13px] text-[#737373]">Vår anbefaling</p>
              </div>
              {grunnlag && (
                <div>
                  <p className="text-[22px] font-bold tabular-nums tracking-[-0.01em]" style={heading}>{grunnlag.antallILeide}</p>
                  <p className="mt-1 text-[13px] text-[#737373]">leieforhold i vurderingsgrunnlaget{grunnlag.antallISone > 0 ? ` · ${grunnlag.antallISone} i samme postsone` : ''}</p>
                </div>
              )}
            </div>

            {leiePunkter.length > 0 && (
              <div className="mt-9 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
                {leiePunkter.map(([t, d]) => (
                  <div key={t} className="border-t border-black/[0.1] pt-4">
                    <p className="text-[15.5px] font-bold" style={heading}>{t}</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#737373]">{d}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-7 text-[13.5px] text-[#a3a3a3]">Vurderingen er gjort mot faktiske leieinntekter i DigiHomes egen portefølje i Bergen — ikke synsing.</p>
          </Avsnitt>
        )}

        {/* ── Annonsen er klar — tonal seksjon med ekte preview ── */}
        {harAnnonse && (
          <div className="relative left-1/2 mt-24 w-screen -translate-x-1/2 bg-[#f5f5f2] sm:mt-28">
            <Avsnitt className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
              <h2 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]" style={heading}>Annonsen er klar.</h2>
              <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-[#404040]">
                Bildene er valgt. Teksten er skrevet. Prisen er satt. Sier du ja, kan den være live innen 24 timer.
              </p>

              {/* Kompakt preview — jobben er synlig, ikke bare påstått */}
              {!visAnnonse && (
                <button onClick={() => setVisAnnonse(true)} data-testid="tilbud-vis-annonse"
                  className="group mt-8 block w-full max-w-[720px] overflow-hidden rounded-[12px] bg-white text-left ring-1 ring-black/[0.08] transition-shadow hover:shadow-[0_4px_20px_rgba(20,20,20,0.07)]">
                  {annonseKortBilde && (
                    <span className="relative block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={annonseKortBilde} alt="Hovedbilde i annonsen" className="block aspect-[2/1] w-full object-cover" loading="lazy" data-testid="tilbud-annonse-kort-bilde" />
                      {stylet.length > 0 && (
                        <span className="pointer-events-none absolute left-3 top-3 rounded-[7px] bg-black/50 px-2 py-0.5 text-[10px] font-semibold text-white" title="AI-generert forslag basert på annonsens eget foto">AI-forbedret foto {'\u24D8'}</span>
                      )}
                    </span>
                  )}
                  <span className="block px-5 py-4 sm:px-6">
                    <span className="block text-[17px] font-bold leading-snug" style={heading}>{tilbud.annonse.tittel}</span>
                    <span className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-[13.5px] text-[#737373]">{pent(tilbud.adresse)}</span>
                      <span className="text-[15px] font-bold tabular-nums" style={heading}>{tall(r.anbefaltLeie)} kr / mnd</span>
                    </span>
                    <span className="mt-3 flex items-center gap-1.5 text-[13.5px] font-semibold text-[#141414]">
                      Se hele annonsen <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </span>
                </button>
              )}

              {visAnnonse && (
                <div className="mt-8">
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

        {/* ── Du gjør / DigiHome gjør — verdiforslaget på to sekunder ── */}
        <Avsnitt className="mt-24 sm:mt-28">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-20" data-testid="tilbud-manifest">
            <div>
              <h2 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.02em] sm:text-[30px]" style={heading}>
                Å leie ut trenger ikke bli en ny jobb.
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-[#404040]">
                Vi er eiendomsmeglere med utleie som spesialfelt. Du gjør to ting — vi gjør resten.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold text-[#a3a3a3]">Du gjør</p>
                <ul className="mt-3">
                  {['Gir oss nøklene', 'Godkjenner leietaker'].map((t) => (
                    <li key={t} className="border-t border-black/[0.08] py-3 text-[15px] font-semibold" style={heading}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[12px] font-semibold text-[#a3a3a3]">DigiHome gjør</p>
                <ul className="mt-3">
                  {['Annonse og bilder', 'Markedsføring', 'Visninger', 'Screening og referansesjekk', 'Kontrakt og depositum', 'Innflytting og protokoll', 'Oppfølging gjennom leieforholdet'].map((t) => (
                    <li key={t} className="border-t border-black/[0.08] py-3 text-[14.5px] text-[#404040]">{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Trust-strip — kun verifiserbare fakta */}
          <div className="mt-12 flex flex-wrap items-baseline gap-x-10 gap-y-3 border-t border-black/[0.07] pt-6" data-testid="tilbud-trust">
            <p className="text-[13.5px] text-[#404040]"><span className="font-bold" style={heading}>Eiendomsmeglere</span> med utleie som spesialfelt</p>
            {grunnlag && <p className="text-[13.5px] tabular-nums text-[#404040]"><span className="font-bold" style={heading}>{grunnlag.antallILeide}</span> aktive leieforhold i Bergen</p>}
            {grunnlag?.antallISone > 0 && <p className="text-[13.5px] tabular-nums text-[#404040]"><span className="font-bold" style={heading}>{grunnlag.antallISone}</span> utleid i samme postsone</p>}
          </div>
        </Avsnitt>

        {/* ── Slik kommer vi i gang — tidspunktet er hovedinformasjonen ── */}
        <Avsnitt className="mt-24 sm:mt-28">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]" style={heading}>Slik kommer vi i gang.</h2>
          <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-4 sm:gap-8">
            {[
              ['I dag', 'Vi tar en prat', 'Uforpliktende — vi går gjennom tallene sammen.'],
              ['Dag 1–2', 'Vi ser boligen', 'Befaring, og du leverer nøklene.'],
              ['Innen 24 timer', 'Annonsen går live', 'Den er allerede produsert — vi trykker publiser.'],
              ['Deretter', 'Vi finner leietaker', 'Visninger, kontrakt og forvaltning — vi håndterer resten.'],
            ].map(([tid, t, d]) => (
              <div key={tid} className="border-t border-black/[0.1] pt-4">
                <p className="text-[13px] font-bold text-[#141414]" style={heading}>{tid}</p>
                <p className="mt-1.5 text-[16px] font-semibold" style={heading}>{t}</p>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#737373]">{d}</p>
              </div>
            ))}
          </div>
        </Avsnitt>

        {/* ── Spørsmål — innvendinger, ikke repetisjon ── */}
        <Avsnitt className="mt-24 sm:mt-28">
          <h2 className="text-[26px] font-semibold tracking-[-0.02em] sm:text-[30px]" style={heading}>Spørsmål?</h2>
          <div className="mt-4 max-w-[760px]">
            {[
              ['Er leien garantert?', `Nei — ${tall(r.anbefaltLeie)} kr er vår faglige anbefaling basert på faktiske leieinntekter i porteføljen vår. Endelig leie settes sammen med deg, og markedet gir fasiten. Vi anbefaler aldri en pris vi ikke tror vi oppnår.`],
              ['Hvem bestemmer hvilken leietaker jeg får?', 'Du. Vi screener interessenter, sjekker referanser og kredittverdighet, og legger frem de beste kandidatene — men du godkjenner alltid leietakeren selv.'],
              ['Hva inngår faktisk i honoraret?', `Alt i «DigiHome gjør»-listen over: annonse, markedsføring, visninger, screening, kontrakt, depositum, innflytting og løpende oppfølging. ${r.honorarPct} % av månedsleien, eks. mva — ingen etableringsgebyr, ingen skjulte kostnader.`],
              ['Hva skjer hvis det oppstår problemer i leieforholdet?', 'Da er det oss leietakeren kontakter — ikke deg. Vi håndterer oppfølging, purringer og praktiske spørsmål, og involverer deg kun når en beslutning faktisk er din.'],
              ['Hva om jeg vil avslutte samarbeidet?', 'Ingen bindingstid på forvaltningen. Fungerer det ikke, avslutter vi ryddig — leiekontrakten med leietaker består uansett på dine vilkår.'],
            ].map(([q, a]) => (
              <div key={q} className="border-t border-black/[0.07] py-5">
                <p className="text-[16px] font-semibold" style={heading}>{q}</p>
                <p className="mt-1.5 max-w-[680px] text-[14.5px] leading-relaxed text-[#737373]">{a}</p>
              </div>
            ))}
          </div>
        </Avsnitt>
      </main>

      {/* ── Final CTA — sidens eneste mørke område: neste steg i en dialog ── */}
      <div id="kontakt" className="mt-24 scroll-mt-16 bg-[#141414] text-white sm:mt-28">
        <Avsnitt className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
          {sendt ? (
            <div className="py-4 text-center" data-testid="tilbud-kontakt">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                  <path d="m6 11.5 3.2 3.2L16.5 7.5" stroke="#7ed9a7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p className="mt-4 text-[22px] font-bold" style={heading}>Takk! Sarah ringer deg i dag eller i morgen.</p>
              <p className="mt-2 text-[14px] text-white/55">Helt uforpliktende — en kort prat om boligen og hva vi kan få til.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,440px)_1fr] lg:gap-20" data-testid="tilbud-kontakt">
              <div>
                <h2 className="text-[28px] font-bold leading-[1.12] tracking-[-0.02em] sm:text-[34px]" style={heading}>Vil du at Sarah tar neste steg?</h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/60">
                  Neste steg er bare en uforpliktende prat. Ingenting signeres her.
                </p>
                <div className="mt-6 flex items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/15" />
                  <p className="text-[13.5px] text-white/60"><span className="font-semibold text-white">Sarah Sleeman</span> — din kontaktperson</p>
                </div>
                {r?.nettoTilEier > 0 && (
                  <p className="mt-7 border-t border-white/10 pt-5 text-[13.5px] text-white/50">
                    Estimert etter DigiHome-honorar: <span className="font-bold tabular-nums text-[#7ed9a7]">{tall(r.nettoTilEier)} kr / mnd</span>
                  </p>
                )}
              </div>
              <div className="lg:pt-2">
                <label htmlFor="tilbud-tlf" className="block text-[13px] font-semibold text-white/70">Telefonnummeret ditt</label>
                <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
                  <input id="tilbud-tlf" value={skjema.telefon} onChange={(e) => setSkjema((s) => ({ ...s, telefon: e.target.value }))}
                    placeholder="f.eks. 950 00 000" inputMode="tel" autoComplete="tel" data-testid="tilbud-telefon"
                    className="h-12 flex-1 rounded-[10px] border border-white/15 bg-white/[0.07] px-4 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45" />
                  <button onClick={send} disabled={sender || !skjema.telefon.trim()} data-testid="tilbud-send"
                    className="h-12 shrink-0 rounded-[10px] bg-white px-7 text-[15px] font-semibold text-[#141414] transition-colors hover:bg-white/90 disabled:opacity-40">
                    {sender ? 'Sender…' : 'Be Sarah ringe meg'}
                  </button>
                </div>
                <label htmlFor="tilbud-melding" className="mt-5 block text-[13px] font-semibold text-white/70">Melding <span className="font-normal text-white/40">(valgfritt)</span></label>
                <textarea id="tilbud-melding" value={skjema.melding} onChange={(e) => setSkjema((s) => ({ ...s, melding: e.target.value }))}
                  placeholder="Noe vi bør vite før vi ringer?" rows={2}
                  className="mt-2 w-full resize-none rounded-[10px] border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/45" />
                {feil && <p className="mt-2 text-[13px] text-rose-300">{feil}</p>}
                <p className="mt-3 text-[12px] text-white/35">Vi bruker kun nummeret til å kontakte deg om dette tilbudet.</p>
              </div>
            </div>
          )}
        </Avsnitt>
      </div>

      {/* ── Kolofon ── */}
      <footer className="mx-auto max-w-[1200px] px-5 pb-24 pt-10 sm:px-8 sm:pb-14">
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

      {/* ── Sticky bunn-CTA (kun mobil) ── */}
      {!sendt && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${visBunn ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-[#a3a3a3]">Estimert til deg</p>
              <p className="text-[16px] font-bold tabular-nums text-[#1f7a45]" style={heading}>{tall(r.nettoTilEier)} kr/mnd</p>
            </div>
            <button onClick={tilKontakt} data-testid="tilbud-bunn-cta"
              className="h-11 shrink-0 rounded-[10px] bg-[#141414] px-5 text-[13.5px] font-semibold text-white transition-transform active:scale-[0.98]">
              Snakk med Sarah
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
