'use client';

/* ═══════════ OFFENTLIG TILBUDSSIDE — /tilbud/[slug] ═══════════
   Den personlige siden en huseier får tilsendt (via FINN-melding/telefon).
   Designspråk 2026: «Apple Wallet møter premium boligprospekt møter Stripe
   Checkout» — lys, varm, selvsikkert minimalistisk:
   · varm off-white flate, hvite overflater, blekk-tekst, hårfine delere
   · tallet først: netto per måned som hero, boligbildet som hero-objekt
   · Sarah som liten menneskelig detalj (ikke corporate headshot)
   · sentence case-overskrifter, uppercase kun i én metadata-linje
   · annonseutkastet bak «Se hele annonseutkastet» (kortere side)
   · ingen gradients, ingen tunge skygger, én diskret aksent
   Åpninger spores (spor=1) og vises i Salgsradar-pipelinen. */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');
// FINN-adresser kommer ofte i små bokstaver — vis dem pent kapitalisert
const pent = (s) => String(s || '').toLowerCase().replace(/(^|[\s\-\/])([a-zæøå])/g, (m, f, b) => f + b.toUpperCase());
const reduserMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

/* Palett: flate #F8F8F6 · overflate #FFF · blekk #141414 · sekundær #737373
   grønn #1F7A45 · aksent #8B5CF6 (kun fremdrift + én label) */

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

/* ── Interaktiv før/etter-slider (pointer events, mus + touch, auto-hint) ── */
function ForEtter({ forUrl, etterUrl, nokkel, etterEtikett = 'AI-stylet \u00b7 illustrasjon' }) {
  const [pos, setPos] = useState(58);
  const boks = useRef(null);
  const drar = useRef(false);
  const brukerHarDratt = useRef(false);

  // Auto-hint: delelinjen glir 74 → 58 en gang, så brukeren ser at den kan dras
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
      className="relative aspect-[16/10] cursor-ew-resize select-none overflow-hidden rounded-[14px] bg-[#e9e7e2]"
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
            d.laast = 'scroll'; // vertikal scroll får gå i fred
          }
          return;
        }
        if (d.laast === 'slider') flytt(e.clientX);
      }}
      onPointerUp={(e) => {
        const d = drar.current;
        drar.current = null;
        // Trykk uten bevegelse → flytt linjen dit
        if (d && !d.laast && Math.abs(e.clientX - d.x0) < 6 && Math.abs(e.clientY - d.y0) < 6) {
          brukerHarDratt.current = true;
          flytt(e.clientX);
        }
      }}
      onPointerCancel={() => { drar.current = null; }}
    >
      {/* Fast ramme (aspect 16/10) — BEGGE bilder croppes identisk med
          object-cover/center, slik at før og etter alltid ligger i register. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={etterUrl} alt="AI-stylet illustrasjon av boligen" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} data-testid="tilbud-hovedbilde" />

      {/* Før (original) — klippes til venstre for delelinjen */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={forUrl} alt="Original fra annonsen" className="absolute inset-0 h-full w-full object-cover object-center" draggable={false} />
      </div>

      {/* Delelinje + håndtak */}
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-[2px] bg-white shadow-[0_0_14px_rgba(0,0,0,0.35)]" />
        <button
          type="button"
          data-testid="tilbud-for-etter"
          aria-label="Dra for å sammenligne før og etter"
          className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-transform active:scale-95"
        >
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
            <path d="M5.5 1 1 6l4.5 5M12.5 1 17 6l-4.5 5" stroke="#141414" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Etiketter */}
      <span className={`pointer-events-none absolute left-3 top-3 rounded-md bg-black/55 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white transition-opacity duration-200 ${pos > 24 ? 'opacity-100' : 'opacity-0'}`}>
        Annonsen i dag
      </span>
      <span className={`pointer-events-none absolute right-3 top-3 rounded-md bg-black/55 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white transition-opacity duration-200 ${pos < 84 ? 'opacity-100' : 'opacity-0'}`}>
        {etterEtikett}
      </span>
    </div>
  );
}

/* ── Annonse-preview: den ferdigproduserte annonsen i nøytral markedsplass-stil.
   Vises først når huseieren ber om det («Se hele annonseutkastet»). ── */
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
    ['Boligtype', tilbud.boligtype],
    ['Soverom', tilbud.soverom],
    ['Areal', tilbud.m2 ? `${tilbud.m2} m\u00B2` : null],
    ['Etasje', a.etasje ? `${a.etasje}.` : null],
    ['Møblering', a.mobler],
  ].filter(([, v]) => v);
  const leie = Number(r.anbefaltLeie) || 0;

  return (
    <div data-testid="tilbud-annonse-preview">
      {/* Selve annonse-mockupen */}
      <div className="overflow-hidden rounded-[14px] bg-white ring-1 ring-black/[0.08]">
        {/* «Markedsplass»-topplinje */}
        <div className="flex items-center justify-between border-b border-black/[0.06] bg-[#fafaf8] px-4 py-2.5 sm:px-6">
          <span className="rounded-md bg-[#141414] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-white">Til leie</span>
          <span className="text-[11px] font-medium text-[#737373]">Forhåndsvisning av annonsen din</span>
        </div>

        {/* Galleri */}
        {akt && (
          <div className="relative bg-[#141414]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={akt.url} alt="Bilde fra annonsen" className="block aspect-[2/1] w-full object-cover" draggable={false}
              data-testid="tilbud-annonse-bilde"
              onError={() => setDode((d) => (d.includes(akt.url) ? d : [...d, akt.url]))} />
            {akt.ai && (
              <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">AI-forbedret foto</span>
            )}
            {bilder.length > 1 && (
              <>
                {[['\u2039', -1, 'left-2', 'Forrige bilde'], ['\u203A', 1, 'right-2', 'Neste bilde']].map(([tegn, retn, pos, label]) => (
                  <button key={label} type="button" aria-label={label} onClick={() => bytt(retn)}
                    className={`absolute ${pos} top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-[20px] leading-none text-white backdrop-blur-sm transition-colors hover:bg-black/65`}>
                    {tegn}
                  </button>
                ))}
                <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/50 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                  {Math.min(idx, bilder.length - 1) + 1} / {bilder.length}
                </span>
              </>
            )}
          </div>
        )}
        {/* Tittel, adresse, pris */}
        <div className="px-4 pb-2 pt-5 sm:px-6">
          <h3 className="text-[19px] font-bold leading-snug tracking-[-0.01em] sm:text-[22px]" style={heading} data-testid="tilbud-annonse-tittel">{a.tittel}</h3>
          <p className="mt-1 text-[13.5px] text-[#737373]">{pent(tilbud.adresse)}{tilbud.postnr ? `, ${tilbud.postnr} Bergen` : ', Bergen'}</p>
          {leie > 0 && (
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[24px] font-bold tabular-nums tracking-[-0.01em]" style={heading}>{tall(leie)} kr <span className="text-[14px] font-semibold text-[#737373]">/mnd</span></span>
              <span className="text-[12.5px] text-[#a3a3a3]">Depositum: {tall(leie * 3)} kr</span>
            </div>
          )}
        </div>

        {/* Nøkkelinfo */}
        {fakta.length > 0 && (
          <div className={`mx-4 mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-black/[0.06] bg-black/[0.06] sm:mx-6 ${fakta.length >= 5 ? 'sm:grid-cols-5' : fakta.length === 4 ? 'sm:grid-cols-4' : fakta.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {fakta.map(([l, v]) => (
              <div key={l} className="bg-[#fafaf8] px-3.5 py-2.5">
                <p className="text-[10.5px] font-medium text-[#a3a3a3]">{l}</p>
                <p className="mt-0.5 text-[13.5px] font-bold capitalize" style={heading}>{v}</p>
              </div>
            ))}
            {fakta.length % 2 === 1 && <div className="bg-[#fafaf8] sm:hidden" />}
          </div>
        )}

        {/* Høydepunkter + fasiliteter */}
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
                <span key={f} className="rounded-full border border-black/[0.08] bg-[#fafaf8] px-2.5 py-1 text-[12px] font-medium text-[#525252]">{f}</span>
              ))}
            </div>
          )}
        </div>

        {/* Beskrivelse */}
        <div className="px-4 pb-5 pt-4 sm:px-6">
          <p className="text-[12px] font-semibold text-[#a3a3a3]">Om boligen</p>
          <div className="mt-2 max-w-[640px] space-y-3">
            {String(a.beskrivelse).split(/\n{2,}/).map((avsn, i) => (
              <p key={i} className="text-[14px] leading-relaxed text-[#404040]">{avsn}</p>
            ))}
          </div>
        </div>

        {/* Utleier-linje */}
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
  const [skjema, setSkjema] = useState({ navn: '', telefon: '', melding: '' });
  const [sender, setSender] = useState(false);
  const [sendt, setSendt] = useState(false);
  const [aktivStylet, setAktivStylet] = useState(0);
  const [visAnnonse, setVisAnnonse] = useState(false);
  const [visBunn, setVisBunn] = useState(false);
  const [prog, setProg] = useState(0);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/tilbud?slug=${encodeURIComponent(slug)}&spor=1`);
        const j = await r.json();
        if (!r.ok || !j.ok) throw new Error(j.error || 'Fant ikke tilbudet');
        setTilbud(j.tilbud);
      } catch (e) { setFeil(e.message); }
      setLaster(false);
    })();
  }, [slug]);

  // Sticky bunn-CTA på mobil + scroll-fremdrift i toppbaren
  useEffect(() => {
    const sjekk = () => {
      const kontakt = document.getElementById('kontakt');
      const kontaktSynlig = kontakt ? kontakt.getBoundingClientRect().top < window.innerHeight - 80 : false;
      setVisBunn(window.scrollY > 560 && !kontaktSynlig);
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setProg(total > 0 ? Math.min(1, window.scrollY / total) : 0);
    };
    window.addEventListener('scroll', sjekk, { passive: true });
    sjekk();
    return () => window.removeEventListener('scroll', sjekk);
  }, []);

  const send = async () => {
    if (sender || !skjema.navn.trim() || !skjema.telefon.trim()) return;
    setSender(true);
    try {
      const r = await fetch('/api/tilbud/kontakt', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, ...skjema }),
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
  const harBilde = Boolean(valgtStylet || originalBilde);
  const harAnnonse = Boolean(tilbud?.annonse);

  const fakta = useMemo(() => [
    tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null, tilbud?.boligtype ? pent(tilbud.boligtype) : null, 'Bergen',
  ].filter(Boolean), [tilbud]);

  // «Hvorfor vi tror på leien» — konkrete punkter fra annonsens egne høydepunkter
  const leiePunkter = useMemo(() => {
    const ut = [];
    for (const h of (tilbud?.annonse?.hoydepunkter || []).slice(0, 2)) ut.push([h, 'Et tydelig salgsargument i annonsen.']);
    if (tilbud?.m2 || tilbud?.soverom) {
      ut.push([[tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null].filter(Boolean).join(' · '), 'Et format med bred målgruppe i leiemarkedet.']);
    }
    return ut.slice(0, 3);
  }, [tilbud]);

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

      {/* ── Lys, diskret toppbar ── */}
      <header className="sticky top-0 z-40 border-b border-black/[0.06] bg-[#f8f8f6]/90 backdrop-blur-md">
        <div className="mx-auto flex h-[60px] max-w-[1200px] items-center justify-between px-5 sm:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[21px] w-auto" />
          <button onClick={tilKontakt} data-testid="tilbud-topp-cta"
            className="h-9 rounded-full bg-[#141414] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-black/80">
            Ta en prat
          </button>
        </div>
        <div className="absolute bottom-0 left-0 h-[2px] bg-[#8b5cf6]/70 transition-[width] duration-150 ease-out" style={{ width: `${prog * 100}%` }} aria-hidden="true" />
      </header>

      <main className="mx-auto max-w-[1200px] px-5 sm:px-8">

        {/* ── Hero: tallet først — lyst, rolig, nesten brutalt enkelt ── */}
        <section className="pt-12 sm:pt-20">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-[#737373]">
            Personlig tilbud · {pent(tilbud.adresse)}{tilbud.postnr ? `, ${tilbud.postnr} Bergen` : ''}
          </p>
          {r?.nettoTilEier > 0 ? (
            <h1 className="mt-6 text-[52px] font-bold leading-[0.98] tracking-[-0.03em] sm:text-[84px]" style={heading}>
              {tall(r.nettoTilEier)}{'\u2009'}kr
              <span className="block text-[26px] font-semibold leading-[1.25] tracking-[-0.015em] text-[#737373] sm:mt-1 sm:text-[38px]">til deg. Hver måned.</span>
            </h1>
          ) : (
            <h1 className="mt-6 text-[44px] font-bold leading-[1.02] tracking-[-0.025em] sm:text-[68px]" style={heading}>
              {pent(tilbud.adresse)}
            </h1>
          )}
          <p className="mt-6 max-w-[560px] text-[16.5px] leading-relaxed text-[#404040] sm:text-[17.5px]" data-testid="tilbud-hero-intro">
            Vi tar oss av annonsering, visninger, kontrakt og oppfølging — du får bare utbetalingen.
          </p>
          {fakta.length > 0 && <p className="mt-4 text-[14px] text-[#a3a3a3]">{fakta.join(' · ')}</p>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button onClick={tilKontakt} data-testid="tilbud-hero-cta"
              className="h-11 rounded-full bg-[#141414] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-black/80">
              Ta en prat
            </button>
            <button onClick={tilRegnestykke} data-testid="tilbud-hero-regnestykke"
              className="h-11 rounded-full border border-black/[0.14] px-6 text-[14px] font-semibold text-[#141414] transition-colors hover:border-black/30">
              Se regnestykket ↓
            </button>
          </div>

          {/* Sarah — liten, trygg menneskelig detalj */}
          <div className="mt-7 flex items-center gap-2.5" data-testid="tilbud-hero-sarah">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman" className="h-9 w-9 rounded-full object-cover" />
            <p className="text-[13.5px] text-[#737373]">
              <span className="font-semibold text-[#141414]">Sarah Sleeman</span> · CEO — din kontaktperson
            </p>
          </div>
        </section>

        {/* ── Boligbildet som hero-objekt ── */}
        {valgtStylet ? (
          <section className="mt-10 sm:mt-14">
            <ForEtter
              forUrl={valgtStylet.kildeUrl || originalBilde}
              etterUrl={`/api/tilbud/bilde?id=${valgtStylet.id}`}
              nokkel={valgtStylet.id}
              etterEtikett={['optimal', 'lysloft'].includes(valgtStylet.stil) ? 'AI-forbedret foto' : 'AI-møblert · illustrasjon'}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[13px] text-[#a3a3a3]">Dra i linjen — original til venstre, vår versjon til høyre.</p>
              {stylet.length > 1 && <p className="hidden shrink-0 text-[12px] text-[#c4c0ba] sm:block">{aktivStylet + 1} av {stylet.length}</p>}
            </div>
            {stylet.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {stylet.map((s, i) => (
                  <button key={s.id} type="button" onClick={() => setAktivStylet(i)} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/tilbud/bilde?id=${s.id}`} alt={s.stil ? `Stil: ${s.stil}` : ''}
                      className={`h-16 w-24 rounded-lg object-cover transition-all ${i === aktivStylet ? 'ring-2 ring-[#141414] ring-offset-2 ring-offset-[#f8f8f6]' : 'opacity-55 hover:opacity-100'}`} />
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : originalBilde ? (
          <section className="mt-10 sm:mt-14">
            <div className="overflow-hidden rounded-[14px] ring-1 ring-black/[0.08]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalBilde} alt="Boligen fra annonsen" className="block h-auto max-h-[640px] w-full object-cover" data-testid="tilbud-hovedbilde" />
            </div>
          </section>
        ) : null}

        {/* ── Regnestykket — én tydelig ligning, detaljer under ── */}
        <Avsnitt id="regnestykke" className="mt-20 scroll-mt-24 sm:mt-28">
          <h2 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]" style={heading}>Din månedlige økonomi.</h2>

          {/* Ligningen */}
          <div className="mt-8 grid grid-cols-1 gap-y-6 sm:grid-cols-[auto_auto_auto_auto_auto] sm:items-baseline sm:gap-x-6" data-testid="tilbud-kpi">
            <div>
              <p className="text-[28px] font-bold tabular-nums tracking-[-0.02em] sm:text-[34px]" style={heading}><TellOpp verdi={r.anbefaltLeie} />{'\u2009'}kr</p>
              <p className="mt-1 text-[13.5px] text-[#737373]">Leie vi anbefaler</p>
            </div>
            <span className="hidden text-[24px] font-light text-[#c4c0ba] sm:block" aria-hidden="true">−</span>
            <div>
              <p className="text-[28px] font-bold tabular-nums tracking-[-0.02em] text-[#737373] sm:text-[34px]" style={heading}><TellOpp verdi={r.honorarMnd} />{'\u2009'}kr</p>
              <p className="mt-1 text-[13.5px] text-[#737373]">DigiHome · {r.honorarPct} % eks. mva</p>
            </div>
            <span className="hidden text-[24px] font-light text-[#c4c0ba] sm:block" aria-hidden="true">=</span>
            <div>
              <p className="text-[34px] font-bold tabular-nums tracking-[-0.02em] text-[#1f7a45] sm:text-[42px]" style={heading}><TellOpp verdi={r.nettoTilEier} />{'\u2009'}kr</p>
              <p className="mt-1 text-[13.5px] text-[#737373]">til deg — uten å løfte en finger</p>
            </div>
          </div>

          {gevinst != null && (
            <p className={`mt-6 max-w-[640px] border-t border-black/[0.07] pt-5 text-[15px] leading-relaxed ${gevinst > 0 ? 'text-[#1f7a45]' : 'text-[#737373]'}`}>
              {gevinst > 0
                ? <>Det er <b>{tall(gevinst)} kr mer i måneden</b> ({tall(r.gevinstAar)} kr i året) enn annonsert pris i dag — og vi tar hele jobben.</>
                : <>Annonsert pris i dag er {tall(r.dagensPris)} kr/mnd. Med oss slipper du annonsering, visninger, kontrakter og oppfølging.</>}
            </p>
          )}

          {/* Årsperspektivet — én stille linje */}
          {r?.nettoTilEier > 0 && (
            <p className="mt-3 text-[14px] text-[#737373]" data-testid="tilbud-regnestykke">
              Over ett år: <span className="font-semibold tabular-nums text-[#141414]">{tall(r.nettoTilEier * 12)} kr</span> netto til deg.
            </p>
          )}
        </Avsnitt>

        {/* ── Hvorfor vi tror på leien — konkret, skannbart ── */}
        {(leiePunkter.length > 0 || tilbud.tekst?.potensialTekst) && (
          <Avsnitt className="mt-20 sm:mt-28">
            <h2 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]" style={heading}>Hvorfor vi tror på {tall(r.anbefaltLeie)} kr.</h2>
            {leiePunkter.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
                {leiePunkter.map(([t, d]) => (
                  <div key={t} className="border-t border-black/[0.1] pt-4">
                    <p className="text-[16px] font-bold capitalize" style={heading}>{t}</p>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-[#737373]">{d}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 max-w-[680px] text-[16px] leading-relaxed text-[#404040]" data-testid="tilbud-potensial">{tilbud.tekst.potensialTekst}</p>
            )}
            <p className="mt-6 text-[13.5px] text-[#a3a3a3]">Prisen er satt mot faktiske leieinntekter i vår egen portefølje i Bergen — ikke synsing.</p>
          </Avsnitt>
        )}

        {/* ── Annonsen er klar — editorial, detaljene bak ett klikk ── */}
        {harAnnonse && (
          <Avsnitt className="mt-20 sm:mt-28">
            <h2 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]" style={heading}>Annonsen er klar.</h2>
            <p className="mt-3 max-w-[560px] text-[16px] leading-relaxed text-[#404040]">
              Bildene er valgt. Teksten er skrevet. Prisen er satt. Sier du ja, kan den være live innen 24 timer.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2" data-testid="tilbud-annonse-status">
              {['Bilder ferdig stylet', 'Annonsetekst skrevet', 'Pris kvalitetssikret'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 text-[13.5px] font-medium text-[#404040]">
                  <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="m3.6 9.4 3.4 3.4 7.4-7.6" stroke="#1f7a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {t}
                </span>
              ))}
            </div>
            <button onClick={() => setVisAnnonse((v) => !v)} data-testid="tilbud-vis-annonse"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full border border-black/[0.14] px-6 text-[14px] font-semibold text-[#141414] transition-colors hover:border-black/30">
              {visAnnonse ? 'Skjul annonseutkastet' : 'Se hele annonseutkastet'} <span aria-hidden="true">{visAnnonse ? '↑' : '→'}</span>
            </button>
            {visAnnonse && (
              <div className="mt-6">
                <AnnonsePreview tilbud={tilbud} r={r} />
              </div>
            )}
          </Avsnitt>
        )}

        {/* ── Dette gjør DigiHome — asymmetrisk: påstand venstre, liste høyre ── */}
        <Avsnitt className="mt-20 sm:mt-28">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-20" data-testid="tilbud-manifest">
            <div>
              <h2 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[32px]" style={heading}>
                Å leie ut trenger ikke bli en ny jobb.
              </h2>
              <p className="mt-4 text-[15.5px] leading-relaxed text-[#404040]">
                Vi er eiendomsmeglere med utleie som spesialfelt. Du leverer nøklene — vi håndterer alt det praktiske,
                og du får bare rapporten og utbetalingen.
              </p>
            </div>
            <div>
              {[
                ['Annonsering som treffer', 'Selgende annonse, profesjonelle bilder og markedsføring der leietakerne faktisk leter.'],
                ['Visninger og screening', 'Vi møter interessentene, sjekker referanser og kredittverdighet — og velger folk som betaler i tide.'],
                ['Kontrakt, depositum og innflytting', 'Trygg leiekontrakt, depositumskonto og overtakelsesprotokoll — alt dokumentert.'],
                ['Oppfølging hele leieforholdet', 'Én fast kontaktperson for deg og leietaker, fra første visning til siste rapport.'],
              ].map(([t, d], i) => (
                <div key={t} className={`py-5 ${i > 0 ? 'border-t border-black/[0.07]' : 'pt-0 lg:pt-1'}`}>
                  <p className="text-[16px] font-bold" style={heading}>{t}</p>
                  <p className="mt-1.5 max-w-[540px] text-[14px] leading-relaxed text-[#737373]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </Avsnitt>

        {/* ── Slik kommer vi i gang — horisontal stripe ── */}
        <Avsnitt className="mt-20 sm:mt-28">
          <h2 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]" style={heading}>Slik kommer vi i gang.</h2>
          <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-4 sm:gap-8">
            {[
              ['01', 'Vi tar en prat', 'I dag — uforpliktende, vi går gjennom tallene.'],
              ['02', 'Vi ser boligen', 'Dag 1–2 — befaring, og du leverer nøklene.'],
              ['03', 'Annonsen går live', 'Innen 24 timer — den er allerede produsert.'],
              ['04', 'Vi finner leietaker', 'Visninger, kontrakt og forvaltning — vi håndterer resten.'],
            ].map(([n, t, d]) => (
              <div key={n} className="border-t border-black/[0.1] pt-4">
                <p className="text-[12.5px] font-bold tabular-nums text-[#a3a3a3]" style={heading}>{n}</p>
                <p className="mt-2 text-[16.5px] font-bold" style={heading}>{t}</p>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#737373]">{d}</p>
              </div>
            ))}
          </div>
        </Avsnitt>

        {/* ── Spørsmål ── */}
        <Avsnitt className="mt-20 sm:mt-28">
          <h2 className="text-[26px] font-bold tracking-[-0.02em] sm:text-[32px]" style={heading}>Spørsmål?</h2>
          <div className="mt-4 max-w-[760px]">
            {[
              ['Er dette bindende?', 'Nei. Dette er et uforpliktende tilbud basert på annonsen din. Du bestemmer alt — vi tar bare en prat først.'],
              ['Hva må jeg gjøre selv?', 'I praksis ingenting. Du leverer nøklene — vi håndterer foto, annonse, visninger, kontrakt, innflytting og oppfølging.'],
              ['Hvor raskt kan boligen leies ut?', 'Annonsen er ferdig produsert og kan være live innen 24 timer etter avtale. Visninger starter gjerne samme uke.'],
              ['Hva koster det?', `${r.honorarPct} % av månedsleien, eks. mva. Regnestykket over viser nøyaktig hva du sitter igjen med — ingen skjulte kostnader.`],
            ].map(([q, a]) => (
              <div key={q} className="border-t border-black/[0.07] py-5">
                <p className="text-[16px] font-bold" style={heading}>{q}</p>
                <p className="mt-1.5 max-w-[680px] text-[14.5px] leading-relaxed text-[#737373]">{a}</p>
              </div>
            ))}
          </div>
        </Avsnitt>

        {/* ── Klar? — lys, tydelig kjøpshandling ── */}
        <Avsnitt id="kontakt" className="mt-20 scroll-mt-20 sm:mt-28">
          <div className="rounded-[16px] bg-white p-6 ring-1 ring-black/[0.08] sm:p-12" data-testid="tilbud-kontakt">
            {sendt ? (
              <div className="py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7a45]/10">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                    <path d="m6 11.5 3.2 3.2L16.5 7.5" stroke="#1f7a45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="mt-4 text-[20px] font-bold" style={heading}>Takk! Vi ringer deg i dag eller i morgen.</p>
                <p className="mt-2 text-[14px] text-[#737373]">Helt uforpliktende — vi tar en kort prat om boligen og hva vi kan få til.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:gap-16">
                <div>
                  <h2 className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[32px]" style={heading}>Klar til å komme i gang?</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-[#404040]">
                    Legg igjen navn og nummer, så ringer vi deg — ingen bindinger, ingen mas.
                  </p>
                  <div className="mt-5 flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/sarah-sleeman-360.webp" alt="Sarah Sleeman" className="h-9 w-9 rounded-full object-cover" />
                    <p className="text-[13px] text-[#737373]"><span className="font-semibold text-[#141414]">Sarah Sleeman</span> · din kontaktperson</p>
                  </div>
                  {r?.nettoTilEier > 0 && (
                    <p className="mt-6 border-t border-black/[0.07] pt-5 text-[14px] text-[#737373]">
                      Estimert netto til deg: <span className="font-bold tabular-nums text-[#1f7a45]">{tall(r.nettoTilEier)} kr/mnd</span>
                    </p>
                  )}
                </div>
                <div>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <input value={skjema.navn} onChange={(e) => setSkjema((s) => ({ ...s, navn: e.target.value }))} placeholder="Navn" data-testid="tilbud-navn"
                      className="h-12 rounded-xl border border-black/[0.1] bg-[#fafaf8] px-4 text-[15px] outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-black/35" />
                    <input value={skjema.telefon} onChange={(e) => setSkjema((s) => ({ ...s, telefon: e.target.value }))} placeholder="Telefon" inputMode="tel" data-testid="tilbud-telefon"
                      className="h-12 rounded-xl border border-black/[0.1] bg-[#fafaf8] px-4 text-[15px] outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-black/35" />
                  </div>
                  <textarea value={skjema.melding} onChange={(e) => setSkjema((s) => ({ ...s, melding: e.target.value }))} placeholder="Melding (valgfritt)" rows={3}
                    className="mt-2.5 w-full resize-none rounded-xl border border-black/[0.1] bg-[#fafaf8] px-4 py-3 text-[15px] outline-none transition-colors placeholder:text-[#a3a3a3] focus:border-black/35" />
                  {feil && <p className="mt-2 text-[13px] text-rose-600">{feil}</p>}
                  <button onClick={send} disabled={sender || !skjema.navn.trim() || !skjema.telefon.trim()} data-testid="tilbud-send"
                    className="mt-4 h-12 w-full rounded-xl bg-[#141414] text-[15px] font-semibold text-white transition-colors hover:bg-black/80 disabled:opacity-30 sm:w-auto sm:px-10">
                    {sender ? 'Sender…' : 'Ring meg opp'}
                  </button>
                  <p className="mt-3 text-[12px] text-[#a3a3a3]">Vi bruker kun opplysningene til å kontakte deg om dette tilbudet.</p>
                </div>
              </div>
            )}
          </div>
        </Avsnitt>

        {/* ── Kolofon ── */}
        <footer className="mb-24 mt-14 border-t border-black/[0.07] pt-8 sm:mb-14 sm:mt-20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[20px] w-auto opacity-90" />
              <p className="mt-2.5 text-[12px] text-[#a3a3a3]">Personlig tilbud utarbeidet for {pent(tilbud.adresse)} · Bergen</p>
            </div>
            <p className="max-w-[460px] text-[11.5px] leading-relaxed text-[#a3a3a3] sm:text-right">
              Forbedrede og møblerte bilder er AI-genererte, basert på annonsens egne foto — møblering og dekor er veiledende.
              Honorar oppgis eks. mva. DigiHome AS · digihome.no
            </p>
          </div>
        </footer>
      </main>

      {/* ── Sticky bunn-CTA (kun mobil) ── */}
      {!sendt && (
        <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.08] bg-white/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${visBunn ? 'translate-y-0' : 'translate-y-full'}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium text-[#a3a3a3]">Netto til deg</p>
              <p className="text-[16px] font-bold tabular-nums text-[#1f7a45]" style={heading}>{tall(r.nettoTilEier)} kr/mnd</p>
            </div>
            <button onClick={tilKontakt} data-testid="tilbud-bunn-cta"
              className="h-11 shrink-0 rounded-full bg-[#141414] px-6 text-[13.5px] font-semibold text-white transition-transform active:scale-[0.98]">
              Ring meg opp
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
