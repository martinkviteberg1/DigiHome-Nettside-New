'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Search, X } from 'lucide-react';
import { formatNoDate, matchesQuery } from '@/lib/listings';
import { EASE, T, display, tall, useSynlig } from '../motion';

/* ---------------------------------------------------------------------------
   LedigeGrid — de ledige boligene, i sidens eget språk.

   Ingen hvite kort, ingen merkelapper klistret på bildene. Hvert kort er som i
   «Boliger på autopilot» på forsiden: fotografiet (rundt, 4:3), og under det —
   adressen i display, én linje fakta, én stille statuslinje (lilla prikk =
   ledig, grå = utleid), prisen til høyre i display. Tittelen fra annonsen står
   som én dempet linje under adressen.

   Søk og filtre er tekst på hårlinjer, ikke UI-piller i bokser: ett søkefelt,
   en rad med valg (område · soverom · utleieform · enhet · maks leie), og
   tallet «N av M». Lista er server-rendret — filtrene jobber på den i
   nettleseren, umiddelbart.

   Ingen ledige boliger er ikke en feil: da står det, og du kan legge inn
   e-posten din så vi sier fra før neste bolig annonseres. Samme felt nederst.
--------------------------------------------------------------------------- */

const HAIR = 'rgba(21,19,15,0.12)';
const DIM = 'rgba(21,19,15,0.6)';
const SVAK = 'rgba(21,19,15,0.45)';

/* Display-fonten har et bredt mellomrom — tusenskillet tegnes som en smal luft */
export function Siffer({ v }) {
  const grupper = String(v ?? '').trim().split(/[\s\u00a0]+/);
  return <>{grupper.map((g, i) => <React.Fragment key={i}>{i > 0 && <span aria-hidden="true" className="inline-block" style={{ width: '0.2em' }} />}{g}</React.Fragment>)}</>;
}

function Valg({ aktiv, onClick, children, testId }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={aktiv}
      data-testid={testId}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] transition-[background-color,color,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/25"
      style={aktiv ? { background: T.ink, color: T.offwhite } : { color: 'rgba(21,19,15,0.7)', boxShadow: `inset 0 0 0 1px ${HAIR}` }}
    >
      {children}
    </button>
  );
}

/* Ett kort: fotografi, adresse, fakta, status, pris. Lenke til boligens egen side. */
function Kort({ c, preview, i, vist }) {
  const utleid = c.status !== 'active';
  const sted = c.streetAddress || c.area || c.title;
  const under = [c.district, c.city].filter(Boolean).filter((v, k, a) => a.indexOf(v) === k).join(', ');
  const ledigFra = c.availableFrom ? (formatNoDate(c.availableFrom) || c.availableFrom) : null;
  const fakta = [c.typeLabel, c.sqm ? `${c.sqm} m²` : null, c.bedrooms ? `${c.bedrooms} sov` : null, c.roomsLabel].filter(Boolean).join(' · ');
  const status = utleid
    ? 'Utleid'
    : ledigFra
      ? (/^\d{4}-/.test(String(c.availableFrom)) ? `Ledig fra ${ledigFra}` : ledigFra)
      : 'Ledig nå';
  const leie = c.rentText ? c.rentText.replace(/\s*kr\/mnd\s*$/i, '') : null;
  return (
    <li
      className="group min-w-0"
      style={{ opacity: vist ? 1 : 0, transform: vist ? 'none' : 'translateY(22px)', transition: `opacity 900ms ${EASE} ${Math.min(i, 8) * 70}ms, transform 1000ms ${EASE} ${Math.min(i, 8) * 70}ms` }}
      data-testid={`listing-card-${c.slug}`}
    >
      <Link href={`/ledige-boliger/${c.slug}${preview ? '?forhandsvis=1' : ''}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/25 rounded-[20px]">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[18px] sm:rounded-[20px]" style={{ background: T.flate, boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.06)' }}>
          {c.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={c.images[0]} alt={`${c.typeLabel} — ${sted}`} loading={i < 3 ? 'eager' : 'lazy'} decoding="async" className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.03]" style={{ transitionTimingFunction: EASE, filter: utleid ? 'saturate(0.6)' : 'saturate(0.96)' }} />
          ) : (
            <div className="absolute inset-0 grid place-items-center text-[13px]" style={{ color: SVAK }}>Bilder kommer</div>
          )}
          {/* Én stille invitasjon nederst i bildet når du peker */}
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 flex items-end justify-between px-5 pb-4 pt-16 text-[13px] font-medium opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: 'linear-gradient(180deg, rgba(21,19,15,0) 0%, rgba(21,19,15,0.45) 100%)', color: T.offwhite }}>
            <span>Se boligen</span><ArrowRight className="h-4 w-4" strokeWidth={1.7} />
          </span>
          {preview && <span className="absolute left-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: T.lilla, color: T.ink }}>Ikke publisert</span>}
          {c.scope && c.scope !== 'hele' && <span className="absolute right-4 top-4 rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: 'rgba(21,19,15,0.72)', color: T.offwhite, backdropFilter: 'blur(8px)' }} data-testid={`listing-scope-${c.scope}`}>{c.scopeShort}</span>}
        </div>
        <div className="mt-4 flex items-start justify-between gap-4 px-0.5">
          <div className="min-w-0">
            <h3 className="truncate text-[19px] sm:text-[21px]" style={{ ...display, letterSpacing: '-0.03em', lineHeight: 1.1, color: T.ink }}>{sted}</h3>
            <p className="mt-1 truncate text-[13.5px]" style={{ color: DIM }}>{[under, fakta].filter(Boolean).join(' · ')}</p>
            {c.title && c.title !== sted ? <p className="mt-1 line-clamp-1 text-[13px]" style={{ color: SVAK }}>{c.title}</p> : null}
            <p className="mt-2 flex items-center gap-2 text-[13.5px]" style={{ color: utleid ? SVAK : 'rgba(21,19,15,0.75)' }} data-testid="listing-status">
              <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: utleid ? 'rgba(21,19,15,0.3)' : T.lilla, boxShadow: utleid ? 'none' : '0 0 0 3px rgba(212,150,255,0.22)' }} />
              <span className="truncate">{status}{!utleid && c.modelLabel ? ` · ${c.modelLabel}` : ''}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            {leie ? (
              <>
                <p className="text-[18px] tabular-nums sm:text-[20px]" style={{ ...display, letterSpacing: '-0.025em', lineHeight: 1.1, color: T.ink }}><Siffer v={leie} /></p>
                <p className="mt-0.5 text-[12px]" style={{ color: SVAK }}>kr/mnd{c.rentScopeNote ? ` · ${c.rentScopeNote}` : ''}</p>
              </>
            ) : <p className="text-[12.5px]" style={{ color: SVAK }}>Pris på forespørsel</p>}
          </div>
        </div>
      </Link>
    </li>
  );
}

/* E-post → varsel før neste bolig annonseres. Ett felt på en hårlinje. */
function Varsel({ kilde = 'ledige-boliger', kompakt = false }) {
  const [epost, setEpost] = useState('');
  const [st, setSt] = useState('idle');
  const send = async (e) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(epost.trim())) { setSt('ugyldig'); return; }
    setSt('sender');
    try {
      const r = await fetch('/api/housing-alerts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: epost.trim(), source: kilde }) });
      const j = await r.json().catch(() => ({}));
      setSt(r.ok && j.ok !== false ? 'ok' : 'feil');
    } catch (err) { setSt('feil'); }
  };
  if (st === 'ok') {
    return <p className="flex items-center gap-2 text-[15px]" style={{ color: T.ink }} data-testid="housing-alert-done"><span className="h-1.5 w-1.5 rounded-full" style={{ background: T.gronn }} />Du står på lista. Vi sier fra før neste bolig annonseres.</p>;
  }
  return (
    <form onSubmit={send} className={`flex w-full ${kompakt ? 'max-w-[440px]' : 'max-w-[520px]'} items-end gap-4`} data-testid="housing-alert-form">
      <label className="min-w-0 flex-1">
        <span className="sr-only">E-post</span>
        <input
          type="email" value={epost} onChange={(e) => { setEpost(e.target.value); if (st !== 'idle') setSt('idle'); }} placeholder="din@epost.no" autoComplete="email" required
          className="h-11 w-full bg-transparent text-[16px] outline-none placeholder:text-[#15130F]/35"
          style={{ borderBottom: `1px solid ${st === 'ugyldig' || st === 'feil' ? '#B4462F' : 'rgba(21,19,15,0.35)'}`, color: T.ink }}
          data-testid="housing-alert-email"
        />
      </label>
      <button type="submit" disabled={st === 'sender'} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full px-5 text-[14.5px] font-medium transition-[transform,background-color] duration-200 active:scale-[0.98] disabled:opacity-60" style={{ background: T.ink, color: T.offwhite }} data-testid="housing-alert-submit">
        {st === 'sender' ? 'Sender …' : 'Varsle meg'}<ArrowRight className="h-4 w-4" strokeWidth={1.7} />
      </button>
      {st === 'ugyldig' && <span className="sr-only">Skriv inn en gyldig e-postadresse</span>}
    </form>
  );
}

/* «Andre ledige boliger» på boligsiden — samme kort, uten verktøy */
export function RelaterteKort({ listings = [] }) {
  return (
    <ol className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-8" data-testid="listing-related-list">
      {listings.map((c, i) => <Kort key={c.id} c={c} i={i} vist />)}
    </ol>
  );
}

export default function LedigeGrid({ listings = [], dbOk = true }) {
  const [q, setQ] = useState('');
  const [omrade, setOmrade] = useState('');
  const [sov, setSov] = useState('');
  const [modell, setModell] = useState('');
  const [enhet, setEnhet] = useState('');
  const [maks, setMaks] = useState(0);
  const [mer, setMer] = useState(false);
  const ref = useRef(null);
  const vist = useSynlig(ref, 0.05);

  /* Forhåndsvisning for innlogget admin (?forhandsvis=1): upubliserte kandidater hentes med nøkkelen fra localStorage —
     aldri fra URL-en, aldri i server-HTML. */
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('forhandsvis')) return;
        const key = localStorage.getItem('dh_admin_session') || localStorage.getItem('dh_admin_key') || '';
        if (!key) { setPreview({ error: 'Logg inn i adminportalen for å forhåndsvise upubliserte boliger.' }); return; }
        const r = await fetch(`/api/public/listings?preview=1&key=${encodeURIComponent(key)}`);
        const j = await r.json();
        if (!alive) return;
        if (j.ok) setPreview({ candidates: j.candidates || [], readiness: j.readiness || null });
        else setPreview({ error: j.error || 'Kunne ikke hente forhåndsvisning' });
      } catch (e) { if (alive) setPreview({ error: 'Kunne ikke hente forhåndsvisning' }); }
    })();
    return () => { alive = false; };
  }, []);

  const alle = useMemo(() => [...listings, ...(preview?.candidates || []).map((c) => ({ ...c, _preview: true }))], [listings, preview]);

  const fasetter = useMemo(() => {
    const tell = (key) => alle.reduce((a, x) => { const v = x[key]; if (v) a[v] = (a[v] || 0) + 1; return a; }, {});
    const belop = alle.map((x) => Number(x.rentAmount) || 0).filter(Boolean);
    const enhetTall = (v) => alle.filter((x) => x.scope === v || x.scope === 'begge').length;
    const harRom = alle.some((x) => x.scope && x.scope !== 'hele');
    return {
      omrader: Object.entries(tell('district')).map(([k, n]) => ({ key: k, label: k, n })).sort((a, b) => b.n - a.n),
      modeller: Object.entries(tell('model')).map(([k, n]) => ({ key: k, label: alle.find((x) => x.model === k)?.modelLabel || k, n })),
      sov: [...new Set(alle.map((x) => x.bedrooms).filter(Boolean))].sort((a, b) => a - b),
      enheter: harRom ? [{ key: 'hele', label: 'Hele enheten', n: enhetTall('hele') }, { key: 'rom', label: 'Rom i bofellesskap', n: enhetTall('rom') }].filter((s) => s.n > 0) : [],
      maks: belop.length ? Math.max(...belop) : 0,
      min: belop.length ? Math.min(...belop) : 0,
    };
  }, [alle]);

  const filtrert = useMemo(() => alle.filter((c) => {
    if (!matchesQuery(c, q)) return false;
    if (omrade && c.district !== omrade) return false;
    if (sov) { const n = Number(sov); if (n >= 4 ? !(c.bedrooms >= 4) : c.bedrooms !== n) return false; }
    if (modell && c.model !== modell) return false;
    if (enhet && !(c.scope === enhet || c.scope === 'begge')) return false;
    if (maks && Number(c.rentAmount) > 0 && Number(c.rentAmount) > maks) return false;
    return true;
  }), [alle, q, omrade, sov, modell, enhet, maks]);

  const aktive = [omrade, sov, modell, enhet, maks ? '1' : ''].filter(Boolean).length;
  const noeAktivt = aktive > 0 || !!q.trim();
  const nullstill = () => { setQ(''); setOmrade(''); setSov(''); setModell(''); setEnhet(''); setMaks(0); };

  return (
    <div ref={ref} data-testid="listings-grid">
      {preview?.error && <p className="mb-6 text-[14px]" style={{ color: '#8A4B2F' }}>{preview.error}</p>}
      {preview?.readiness && (
        <p className="mb-6 text-[14px]" style={{ color: DIM }} data-testid="listings-preview-banner">
          <span className="font-medium" style={{ color: T.ink }}>Forhåndsvisning</span> — {preview.candidates.length} bolig{preview.candidates.length === 1 ? '' : 'er'} som ikke er publisert ennå, merket lilla.
          {preview.readiness.almost?.length ? ` ${preview.readiness.almost.length} ledige mangler innhold før de kan publiseres.` : ''}
        </p>
      )}

      {alle.length > 0 && (
        <div className="border-t pt-6" style={{ borderColor: HAIR }} data-testid="listings-verktoy">
          {/* Søk: ett felt på en hårlinje. Folk skriver «gatenavn 2 soverom» — alle ord må treffe, æ/ø/å normaliseres. */}
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <label className="relative flex w-full max-w-[520px] items-center">
              <Search className="pointer-events-none absolute left-0 h-[18px] w-[18px]" strokeWidth={1.6} style={{ color: SVAK }} />
              <input
                value={q} onChange={(e) => setQ(e.target.value)} type="search" aria-label="Søk i ledige boliger" placeholder="Søk på adresse, område eller boligtype"
                className="h-11 w-full bg-transparent pl-7 pr-8 text-[16px] outline-none placeholder:text-[#15130F]/35"
                style={{ borderBottom: `1px solid rgba(21,19,15,0.35)`, color: T.ink }}
                data-testid="listings-search"
              />
              {q ? <button type="button" onClick={() => setQ('')} aria-label="Tøm søket" className="absolute right-0 grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-[#15130F]/[0.06]" data-testid="listings-search-clear"><X className="h-4 w-4" strokeWidth={1.6} /></button> : null}
            </label>
            <p className="text-[13.5px] tabular-nums" style={{ color: SVAK }} data-testid="listings-count">
              {filtrert.length} av {alle.length} {alle.length === 1 ? 'bolig' : 'boliger'}
            </p>
          </div>

          {/* Valgene: område og enhet alltid; resten bak «Flere valg» */}
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {fasetter.omrader.slice(0, 6).map((d) => (
              <Valg key={d.key} aktiv={omrade === d.key} onClick={() => setOmrade(omrade === d.key ? '' : d.key)} testId={`listings-district-${d.key}`}>{d.label}<span style={{ opacity: 0.5 }}>{d.n}</span></Valg>
            ))}
            {fasetter.enheter.map((s) => (
              <Valg key={s.key} aktiv={enhet === s.key} onClick={() => setEnhet(enhet === s.key ? '' : s.key)} testId={`listings-scope-pill-${s.key}`}>{s.label}<span style={{ opacity: 0.5 }}>{s.n}</span></Valg>
            ))}
            <button type="button" onClick={() => setMer((v) => !v)} aria-expanded={mer} className="inline-flex h-9 items-center gap-1.5 px-2 text-[13.5px] underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:decoration-[#15130F]" style={{ color: 'rgba(21,19,15,0.7)' }} data-testid="listings-filter-toggle">
              {mer ? 'Færre valg' : `Flere valg${aktive ? ` (${aktive})` : ''}`}
            </button>
            {noeAktivt ? <button type="button" onClick={nullstill} className="inline-flex h-9 items-center gap-1 px-2 text-[13.5px]" style={{ color: SVAK }} data-testid="listings-reset"><X className="h-3.5 w-3.5" />Nullstill</button> : null}
          </div>

          {mer && (
            <div className="mt-6 grid gap-6 border-t pt-6 sm:grid-cols-2 lg:grid-cols-4" style={{ borderColor: HAIR }}>
              <div>
                <p className="text-[12.5px]" style={{ color: SVAK }}>Soverom</p>
                <div className="mt-2.5 flex flex-wrap gap-2">{fasetter.sov.map((n) => <Valg key={n} aktiv={sov === String(n)} onClick={() => setSov(sov === String(n) ? '' : String(n))}>{n}{n >= 4 ? '+' : ''}</Valg>)}</div>
              </div>
              <div>
                <p className="text-[12.5px]" style={{ color: SVAK }}>Utleieform</p>
                <div className="mt-2.5 flex flex-wrap gap-2">{fasetter.modeller.map((m) => <Valg key={m.key} aktiv={modell === m.key} onClick={() => setModell(modell === m.key ? '' : m.key)}>{m.label}</Valg>)}</div>
              </div>
              {fasetter.omrader.length > 6 && (
                <div>
                  <p className="text-[12.5px]" style={{ color: SVAK }}>Flere områder</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">{fasetter.omrader.slice(6).map((d) => <Valg key={d.key} aktiv={omrade === d.key} onClick={() => setOmrade(omrade === d.key ? '' : d.key)}>{d.label}</Valg>)}</div>
                </div>
              )}
              <div>
                <p className="text-[12.5px]" style={{ color: SVAK }}>Maks leie{maks ? `: ${tall(maks)} kr` : ''}</p>
                <div className="relative mt-4 h-8">
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2" style={{ background: 'rgba(21,19,15,0.16)' }} />
                  <div className="absolute left-0 top-1/2 h-px -translate-y-1/2" style={{ width: `${fasetter.maks > fasetter.min ? (((maks || fasetter.maks) - fasetter.min) / (fasetter.maks - fasetter.min)) * 100 : 100}%`, background: T.ink }} />
                  <input type="range" min={fasetter.min || 0} max={fasetter.maks || 0} step={500} value={maks || fasetter.maks || 0}
                    onChange={(e) => setMaks(Number(e.target.value) >= (fasetter.maks || 0) ? 0 : Number(e.target.value))}
                    className="v4-glider absolute inset-0 h-8 w-full cursor-pointer appearance-none bg-transparent" aria-label="Maks månedsleie" />
                </div>
                <p className="mt-1 text-[12px] tabular-nums" style={{ color: SVAK }}>{fasetter.min ? `${tall(fasetter.min)}–${tall(fasetter.maks)} kr/mnd i utvalget` : 'Ingen priser i utvalget'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {filtrert.length > 0 ? (
        <ol className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-12 lg:grid-cols-3 lg:gap-x-8" data-testid="listings-list">
          {filtrert.map((c, i) => <Kort key={c.id} c={c} preview={c._preview} i={i} vist={vist} />)}
        </ol>
      ) : alle.length > 0 ? (
        <div className="mt-12 border-t pt-10" style={{ borderColor: HAIR }} data-testid="listings-no-match">
          <p className="text-[clamp(28px,3vw,44px)]" style={{ ...display, color: T.ink }}>{q.trim() ? `Ingen boliger matcher «${q.trim()}»` : 'Ingen boliger matcher valgene'}<span style={{ color: T.lilla }}>.</span></p>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.5]" style={{ color: DIM }}>Prøv et bredere søk — eller legg inn e-posten din, så sier vi fra når en bolig som passer blir ledig.</p>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <button type="button" onClick={nullstill} className="text-[15px] underline decoration-[#15130F]/25 underline-offset-4 hover:decoration-[#15130F]" style={{ color: T.ink }}>Nullstill søk og valg</button>
          </div>
          <div className="mt-8"><Varsel kompakt /></div>
        </div>
      ) : (
        <div className="border-t pt-10" style={{ borderColor: HAIR }} data-testid="listings-empty">
          <p className="text-[14px] font-medium" style={{ color: SVAK }}>{dbOk ? 'Akkurat nå' : 'Et lite øyeblikk'}</p>
          <h2 className="mt-4 max-w-[18ch] text-[clamp(36px,4vw,64px)]" style={{ ...display, color: T.ink }}>{dbOk ? 'Alt er utleid' : 'Boligene lastet ikke'}<span style={{ color: T.lilla }}>.</span></h2>
          <p className="mt-5 max-w-[52ch] text-[17px] leading-[1.5]" style={{ color: DIM }}>
            {dbOk
              ? 'Boligene går ofte til noen på lista før annonsen rekker ut. Legg inn e-posten din, så sier vi fra før neste bolig annonseres — og bare når den passer.'
              : 'Vi fikk ikke kontakt med boligoversikten i dette sekundet. Last siden på nytt — eller legg inn e-posten din, så sier vi fra når noe blir ledig.'}
          </p>
          <div className="mt-8"><Varsel /></div>
        </div>
      )}

      {alle.length > 0 && (
        <div className="mt-20 grid gap-8 border-t pt-10 lg:grid-cols-12 lg:gap-10" style={{ borderColor: HAIR }} data-testid="listings-varsel">
          <div className="lg:col-span-6">
            <h2 className="text-[clamp(30px,3.2vw,48px)]" style={{ ...display, color: T.ink }}>Fant du ikke din<span style={{ color: T.lilla }}>?</span></h2>
            <p className="mt-4 max-w-[44ch] text-[16.5px] leading-[1.5]" style={{ color: DIM }}>Nye boliger kommer fortløpende. Legg inn e-posten din, så sier vi fra før de annonseres.</p>
          </div>
          <div className="lg:col-span-5 lg:col-start-8 lg:self-end"><Varsel /></div>
        </div>
      )}
    </div>
  );
}
