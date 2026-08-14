'use client';

/* ═══════════ OFFENTLIG TILBUDSSIDE — /tilbud/[slug] ═══════════
   Den personlige siden en huseier får tilsendt (via FINN-melding/telefon).
   Verdensklasse 2026-design: mørk DigiHome-hero, interaktiv før/etter-slider,
   dokumentstil-regnestykke (mnd/år), prosesstidslinje og nøktern typografi.
   · ærlig regnestykke: anbefalt leie, honorar (eks. mva), netto til eier
   · AI-stylede bilder er alltid tydelig merket som illustrasjoner
   Åpninger spores (spor=1) og vises i Salgsradar-pipelinen. */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';

const heading = { fontFamily: 'var(--font-heading)' };
const tall = (v) => new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(Math.round(Number(v) || 0)).replace(/\u00A0/g, '\u202F');

/* ── Interaktiv før/etter-slider (pointer events, mus + touch) ── */
function ForEtter({ forUrl, etterUrl, nokkel }) {
  const [pos, setPos] = useState(58);
  const boks = useRef(null);
  const drar = useRef(false);

  useEffect(() => { setPos(58); }, [nokkel]);

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
      className="relative cursor-ew-resize select-none overflow-hidden rounded-2xl bg-[#e8e6e1]"
      style={{ touchAction: 'none', minHeight: 220 }}
      onPointerDown={(e) => { drar.current = true; try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {} flytt(e.clientX); }}
      onPointerMove={(e) => { if (drar.current) flytt(e.clientX); }}
      onPointerUp={() => { drar.current = false; }}
      onPointerCancel={() => { drar.current = false; }}
    >
      {/* Etter (AI-stylet) — basen som gir høyden */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={etterUrl} alt="AI-stylet illustrasjon av boligen" className="block h-auto max-h-[620px] w-full object-cover" draggable={false} data-testid="tilbud-hovedbilde" />

      {/* Før (original) — klippes til venstre for delelinjen */}
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={forUrl} alt="Original fra annonsen" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      </div>

      {/* Delelinje + håndtak */}
      <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
        <div className="absolute inset-y-0 -ml-px w-[2px] bg-white shadow-[0_0_14px_rgba(0,0,0,0.4)]" />
        <button
          type="button"
          data-testid="tilbud-for-etter"
          aria-label="Dra for å sammenligne før og etter"
          className="absolute top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-[0_3px_16px_rgba(0,0,0,0.3)]"
        >
          <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden="true">
            <path d="M5.5 1 1 6l4.5 5M12.5 1 17 6l-4.5 5" stroke="#1c1917" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Etiketter */}
      <span className={`pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-white transition-opacity duration-200 ${pos > 24 ? 'opacity-100' : 'opacity-0'}`}>
        Annonsen i dag
      </span>
      <span className={`pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2.5 py-1 text-[10.5px] font-semibold tracking-wide text-white transition-opacity duration-200 ${pos < 84 ? 'opacity-100' : 'opacity-0'}`}>
        AI-stylet · illustrasjon
      </span>
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

  const r = tilbud?.regnestykke || {};
  const gevinst = r.gevinstMnd;
  const stylet = tilbud?.stylet || [];
  const valgtStylet = stylet[aktivStylet] || null;
  const originalBilde = (tilbud?.bilder || [])[0] || null;

  const fakta = useMemo(() => [
    tilbud?.boligtype, tilbud?.m2 ? `${tilbud.m2} m²` : null, tilbud?.soverom ? `${tilbud.soverom} soverom` : null,
  ].filter(Boolean), [tilbud]);

  const maksBar = Math.max(Number(r.dagensPris) || 0, Number(r.nettoTilEier) || 0, 1);

  if (laster) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#131114]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-6 w-auto opacity-90" />
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
      </div>
    );
  }
  if (!tilbud) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-[#131114] px-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-6 w-auto opacity-90" />
        <p className="text-center text-[14px] text-white/50">{feil || 'Fant ikke tilbudet.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#faf9f7] text-[#1c1917]" data-testid="tilbud-side">

      {/* ── Sticky toppbar ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#131114]">
        <div className="mx-auto flex h-14 max-w-[920px] items-center justify-between px-5 sm:px-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/digihome-logo-white.svg" alt="DigiHome" className="h-[19px] w-auto" />
          <div className="flex items-center gap-4">
            <span className="hidden text-[11px] font-medium uppercase tracking-[0.14em] text-white/40 sm:block">Personlig tilbud</span>
            <button onClick={tilKontakt} data-testid="tilbud-topp-cta"
              className="h-9 rounded-full bg-white px-4 text-[12.5px] font-bold text-[#131114] transition-all hover:bg-white/90 active:scale-[0.98]">
              Ta en prat
            </button>
          </div>
        </div>
      </header>

      {/* ── Mørk hero ── */}
      <section className="bg-[#131114] text-white">
        <div className="mx-auto max-w-[920px] px-5 pb-12 pt-12 sm:px-8 sm:pb-16 sm:pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9a5f5]">Vi så boligen din på FINN</p>
          <h1 className="mt-4 max-w-[640px] text-[30px] font-bold leading-[1.08] tracking-[-0.02em] sm:text-[42px]" style={heading}>
            {tilbud.adresse}
            <span className="block text-white/45">— her er hva vi kan gjøre for den.</span>
          </h1>
          <p className="mt-4 text-[13.5px] text-white/50">
            {tilbud.postnr ? `${tilbud.postnr} Bergen` : 'Bergen'}
            {fakta.length ? <span className="text-white/30"> · {fakta.join(' · ')}</span> : null}
          </p>

          {/* Nøkkeltall */}
          <div className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.08] sm:grid-cols-3">
            {[
              ['Leie vi anbefaler', `${tall(r.anbefaltLeie)} kr`, 'per måned', false],
              [`Vårt honorar · ${r.honorarPct} % eks. mva`, `${tall(r.honorarMnd)} kr`, 'per måned', false],
              ['Netto til deg', `${tall(r.nettoTilEier)} kr`, 'per måned — uten å løfte en finger', true],
            ].map(([l, v, u, sterk]) => (
              <div key={l} className="bg-[#131114] px-5 py-5">
                <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-white/40">{l}</p>
                <p className={`mt-2 text-[26px] font-bold tabular-nums tracking-[-0.01em] ${sterk ? 'text-[#7fd4a1]' : 'text-white'}`} style={heading}>{v}</p>
                <p className="mt-1 text-[11.5px] text-white/35">{u}</p>
              </div>
            ))}
          </div>

          {gevinst != null && gevinst > 0 && (
            <p className="mt-4 text-[12.5px] text-white/45">
              Det er <span className="font-semibold text-[#7fd4a1]">{tall(gevinst)} kr mer i måneden</span> enn annonsert pris i dag — {tall(r.gevinstAar)} kr i året.
            </p>
          )}
        </div>
      </section>

      <main className="mx-auto max-w-[920px] px-5 sm:px-8">

        {/* ── Bilder: interaktiv før/etter ── */}
        {valgtStylet ? (
          <section className="mt-10 sm:mt-14">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8a29e]">Presentasjonen</p>
                <h2 className="mt-1.5 text-[20px] font-bold tracking-[-0.01em] sm:text-[24px]" style={heading}>Slik kan annonsen din se ut</h2>
              </div>
              <p className="hidden shrink-0 text-[11.5px] text-[#a8a29e] sm:block">Dra i linjen for å sammenligne →</p>
            </div>
            <ForEtter
              forUrl={valgtStylet.kildeUrl || originalBilde}
              etterUrl={`/api/tilbud/bilde?id=${valgtStylet.id}`}
              nokkel={valgtStylet.id}
            />
            <p className="mt-2.5 text-center text-[11px] text-[#a8a29e] sm:hidden">← Dra i linjen for å sammenligne før og etter →</p>
            {stylet.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {stylet.map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={s.id} src={`/api/tilbud/bilde?id=${s.id}`} alt="" onClick={() => setAktivStylet(i)}
                    className={`h-16 w-24 shrink-0 cursor-pointer rounded-lg object-cover transition-all ${i === aktivStylet ? 'ring-2 ring-[#8b5cf6] ring-offset-2 ring-offset-[#faf9f7]' : 'opacity-55 hover:opacity-100'}`} />
                ))}
              </div>
            )}
          </section>
        ) : originalBilde ? (
          <section className="mt-10 sm:mt-14">
            <div className="overflow-hidden rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={originalBilde} alt="Boligen fra annonsen" className="block h-auto w-full" data-testid="tilbud-hovedbilde" />
            </div>
          </section>
        ) : null}

        {/* ── Regnestykket ── */}
        <section className="mt-12 sm:mt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8a29e]">Økonomien</p>
          <h2 className="mt-1.5 text-[20px] font-bold tracking-[-0.01em] sm:text-[24px]" style={heading}>Regnestykket — helt konkret</h2>

          <div className="mt-5 overflow-hidden rounded-2xl border border-black/[0.06] bg-white" data-testid="tilbud-regnestykke">
            <div className="grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 border-b border-black/[0.06] px-5 py-3 sm:gap-x-8 sm:px-7">
              <span />
              <span className="w-[86px] text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#a8a29e] sm:w-[110px]">Per måned</span>
              <span className="w-[86px] text-right text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#a8a29e] sm:w-[110px]">Per år</span>
            </div>
            {[
              ['Leie vi anbefaler å legge oss på', r.anbefaltLeie, false, false],
              [`Vårt honorar (${r.honorarPct} % eks. mva)`, r.honorarMnd, true, false],
              ['Netto til deg — uten å løfte en finger', r.nettoTilEier, false, true],
            ].map(([l, v, minus, sterk]) => (
              <div key={l} className={`grid grid-cols-[1fr_auto_auto] items-baseline gap-x-4 px-5 py-3.5 sm:gap-x-8 sm:px-7 ${sterk ? 'bg-[#fbfaf8]' : 'border-b border-black/[0.05]'}`}>
                <span className={`text-[13px] leading-snug ${sterk ? 'font-bold text-[#1c1917]' : 'text-[#57534e]'}`}>{l}</span>
                <span className={`w-[86px] text-right tabular-nums sm:w-[110px] ${sterk ? 'text-[16px] font-bold text-[#1f7a45]' : 'text-[13.5px] font-semibold text-[#44403c]'}`} style={heading}>
                  {minus ? '−\u2009' : ''}{tall(v)}
                </span>
                <span className={`w-[86px] text-right tabular-nums sm:w-[110px] ${sterk ? 'text-[16px] font-bold text-[#1f7a45]' : 'text-[13.5px] font-semibold text-[#78716c]'}`} style={heading}>
                  {minus ? '−\u2009' : ''}{tall(v * 12)}
                </span>
              </div>
            ))}
            {gevinst != null && (
              <div className={`border-t border-black/[0.05] px-5 py-3.5 text-[12.5px] font-medium sm:px-7 ${gevinst > 0 ? 'bg-[#eef6f0] text-[#1f7a45]' : 'bg-[#fafaf8] text-[#78716c]'}`}>
                {gevinst > 0
                  ? <>Det er <b>{tall(gevinst)} kr mer i måneden</b> ({tall(r.gevinstAar)} kr/år) enn annonsert pris i dag — og vi tar hele jobben.</>
                  : <>Annonsert pris i dag er {tall(r.dagensPris)} kr/mnd. Med oss slipper du annonsering, visninger, kontrakter og oppfølging — og boligen presenteres som bildene over.</>}
              </div>
            )}
          </div>

          {/* Sammenligning: i dag vs. med DigiHome */}
          {Number(r.dagensPris) > 0 && Number(r.nettoTilEier) > 0 && (
            <div className="mt-4 rounded-2xl border border-black/[0.06] bg-white px-5 py-5 sm:px-7">
              {[
                ['Annonsert pris i dag', r.dagensPris, '#d6d3ce', '#78716c'],
                ['Netto til deg med DigiHome', r.nettoTilEier, '#1f7a45', '#1c1917'],
              ].map(([l, v, farge, tekst]) => (
                <div key={l} className="py-2">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="text-[12px] font-medium" style={{ color: tekst }}>{l}</span>
                    <span className="shrink-0 text-[13px] font-bold tabular-nums" style={{ ...heading, color: tekst }}>{tall(v)} kr/mnd</span>
                  </div>
                  <div className="mt-1.5 h-[6px] overflow-hidden rounded-full bg-[#f1efeb]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(4, (Number(v) / maksBar) * 100)}%`, background: farge }} />
                  </div>
                </div>
              ))}
              <p className="mt-2 text-[11px] leading-relaxed text-[#a8a29e]">
                «Netto til deg» er etter vårt honorar — annonsering, visninger, kontrakt og oppfølging er inkludert.
              </p>
            </div>
          )}
        </section>

        {/* ── Slik jobber vi ── */}
        <section className="mt-12 sm:mt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8a29e]">Prosessen</p>
          <h2 className="mt-1.5 text-[20px] font-bold tracking-[-0.01em] sm:text-[24px]" style={heading}>Fra prat til utleid — slik jobber vi</h2>
          <div className="mt-6">
            {[
              ['Uforpliktende prat', 'Vi ringer deg, går gjennom tallene og svarer på alt du lurer på.'],
              ['Befaring og prisvurdering', 'Vi ser boligen og bekrefter leien vi anbefaler — basert på porteføljen vår i Bergen.'],
              ['Annonse, foto og styling', 'Boligen presenteres profesjonelt — slik bildene over viser.'],
              ['Visninger og utvelgelse', 'Vi møter interessentene, sjekker referanser og finner riktig leietaker.'],
              ['Kontrakt og løpende forvaltning', 'Trygg leiekontrakt, depositumskonto og én fast kontakt gjennom hele leieforholdet.'],
            ].map(([t, d], i, arr) => (
              <div key={t} className="relative flex gap-4 sm:gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.1] bg-white text-[11.5px] font-bold text-[#1c1917]" style={heading}>
                    {i + 1}
                  </div>
                  {i < arr.length - 1 && <div className="w-px flex-1 bg-black/[0.08]" />}
                </div>
                <div className={i < arr.length - 1 ? 'pb-6' : ''}>
                  <p className="pt-1 text-[14px] font-bold" style={heading}>{t}</p>
                  <p className="mt-1 max-w-[560px] text-[12.5px] leading-relaxed text-[#78716c]">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Dette er inkludert ── */}
        <section className="mt-12 sm:mt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8a29e]">Alt inkludert i honoraret</p>
          <h2 className="mt-1.5 text-[20px] font-bold tracking-[-0.01em] sm:text-[24px]" style={heading}>Dette tar vi oss av</h2>
          <div className="mt-5 grid grid-cols-1 overflow-hidden rounded-2xl border border-black/[0.06] bg-white sm:grid-cols-2">
            {[
              ['Annonsering som treffer', 'Profesjonell annonse med styling — og prisen markedet faktisk betaler.'],
              ['Visninger og utvelgelse', 'Vi møter interessentene, sjekker referanser og finner riktig leietaker.'],
              ['Kontrakt og depositum', 'Trygg leiekontrakt, depositumskonto og innflytting — alt dokumentert.'],
              ['Oppfølging hele leieforholdet', 'Én kontakt for leietaker, purringer og småting — du får bare rapporten.'],
            ].map(([t, d], i) => (
              <div key={t} className={`flex gap-3.5 px-5 py-5 sm:px-6 ${i < 2 ? 'border-b border-black/[0.05]' : ''} ${i % 2 === 0 ? 'sm:border-r sm:border-black/[0.05]' : ''} ${i === 2 ? 'border-b border-black/[0.05] sm:border-b-0' : ''}`}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
                  <circle cx="9" cy="9" r="8.25" stroke="#1f7a45" strokeWidth="1.2" />
                  <path d="m5.6 9.2 2.2 2.2 4.6-4.8" stroke="#1f7a45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div>
                  <p className="text-[13.5px] font-bold" style={heading}>{t}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[#78716c]">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Spørsmål og svar ── */}
        <section className="mt-12 sm:mt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#a8a29e]">Godt å vite</p>
          <h2 className="mt-1.5 text-[20px] font-bold tracking-[-0.01em] sm:text-[24px]" style={heading}>Spørsmål og svar</h2>
          <div className="mt-5 divide-y divide-black/[0.05] rounded-2xl border border-black/[0.06] bg-white">
            {[
              ['Er dette bindende?', 'Nei. Dette er et uforpliktende tilbud basert på annonsen din. Du bestemmer alt — vi tar bare en prat først.'],
              ['Hva koster det?', `Honoraret er ${r.honorarPct} % av månedsleien, eks. mva. Regnestykket over viser nøyaktig hva du sitter igjen med — ingen skjulte kostnader.`],
              ['Hvordan kommer vi i gang?', 'Legg igjen navn og nummer under, så ringer vi deg for en kort prat og avtaler befaring om du vil gå videre.'],
            ].map(([q, a]) => (
              <div key={q} className="px-5 py-4 sm:px-7 sm:py-5">
                <p className="text-[13.5px] font-bold" style={heading}>{q}</p>
                <p className="mt-1.5 max-w-[620px] text-[12.5px] leading-relaxed text-[#78716c]">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Kontakt ── */}
        <section id="kontakt" className="mt-12 scroll-mt-20 sm:mt-16">
          <div className="overflow-hidden rounded-2xl bg-[#131114] text-white shadow-[0_12px_48px_rgba(0,0,0,0.18)]" data-testid="tilbud-kontakt">
            <div className="px-6 py-8 sm:px-10 sm:py-10">
              {sendt ? (
                <div className="py-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1f7a45]/20">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                      <path d="m6 11.5 3.2 3.2L16.5 7.5" stroke="#7fd4a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="mt-4 text-[19px] font-bold" style={heading}>Takk! Vi ringer deg i dag eller i morgen.</p>
                  <p className="mt-2 text-[13px] text-white/55">Helt uforpliktende — vi tar en kort prat om boligen og hva vi kan få til.</p>
                </div>
              ) : (
                <>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c9a5f5]">Neste steg</p>
                  <h2 className="mt-2 text-[22px] font-bold tracking-[-0.01em] sm:text-[26px]" style={heading}>Nysgjerrig? Ta en uforpliktende prat</h2>
                  <p className="mt-2 max-w-[480px] text-[13px] leading-relaxed text-white/50">
                    Legg igjen navn og nummer, så ringer vi deg — ingen bindinger, ingen mas.
                  </p>
                  <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <input value={skjema.navn} onChange={(e) => setSkjema((s) => ({ ...s, navn: e.target.value }))} placeholder="Navn" data-testid="tilbud-navn"
                      className="h-12 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[14px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/35" />
                    <input value={skjema.telefon} onChange={(e) => setSkjema((s) => ({ ...s, telefon: e.target.value }))} placeholder="Telefon" inputMode="tel" data-testid="tilbud-telefon"
                      className="h-12 rounded-xl border border-white/10 bg-white/[0.06] px-4 text-[14px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/35" />
                  </div>
                  <textarea value={skjema.melding} onChange={(e) => setSkjema((s) => ({ ...s, melding: e.target.value }))} placeholder="Melding (valgfritt)" rows={2}
                    className="mt-2.5 w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-[14px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-white/35" />
                  {feil && <p className="mt-2 text-[12px] text-rose-300">{feil}</p>}
                  <button onClick={send} disabled={sender || !skjema.navn.trim() || !skjema.telefon.trim()} data-testid="tilbud-send"
                    className="mt-4 h-12 w-full rounded-xl bg-white text-[14px] font-bold text-[#131114] transition-all hover:bg-white/90 active:scale-[0.99] disabled:opacity-35 sm:w-auto sm:px-10">
                    {sender ? 'Sender…' : 'Ring meg opp'}
                  </button>
                  <p className="mt-3 text-[11px] text-white/35">Vi bruker kun opplysningene til å kontakte deg om dette tilbudet.</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="mb-10 mt-12 border-t border-black/[0.07] pt-7 sm:mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[26px] w-auto opacity-90" />
            <p className="max-w-[520px] text-[10.5px] leading-relaxed text-[#b8b2a9] sm:text-right">
              Stylede bilder er AI-genererte illustrasjoner basert på annonsens egne foto — møblering og dekor er veiledende.
              Honorar oppgis eks. mva. DigiHome AS · digihome.no
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
