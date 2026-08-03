'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { MapPin, Ruler, BedDouble, ArrowUpRight, SlidersHorizontal, X, EyeOff } from 'lucide-react';
import HousingAlertForm from './HousingAlertForm';

// Filtrering skjer i nettleseren på en liste som allerede er server-rendret.
// Da er boligene i HTML-en for søkemotorer og AI-crawlere, samtidig som
// filtrene er umiddelbare for mennesker.

const KR = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');

function parseBand(band) {
  const nums = String(band || '').match(/\d[\d\s\u00a0\u202f]*/g);
  if (!nums) return null;
  const vals = nums.map((n) => Number(n.replace(/[^\d]/g, ''))).filter(Boolean);
  if (!vals.length) return null;
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

function Pill({ active, children, onClick, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className={`h-9 rounded-full px-3.5 text-[13px] font-medium transition-all ${active
        ? 'bg-[#0a0a0a] text-white shadow-[0_2px_10px_rgba(0,0,0,0.14)]'
        : 'bg-white text-[#5f5a53] ring-1 ring-inset ring-black/[0.07] hover:ring-black/[0.16]'}`}>
      {children}
    </button>
  );
}

function ListingCard({ c, preview }) {
  const rented = c.status !== 'active';
  return (
    <Link href={`/ledige-boliger/${c.slug}${preview ? '?forhandsvis=1' : ''}`} data-testid={`listing-card-${c.slug}`}
      className="group flex flex-col overflow-hidden rounded-[26px] bg-white shadow-[0_10px_40px_-22px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.04] transition-shadow hover:shadow-[0_20px_60px_-24px_rgba(0,0,0,0.3)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#f3f1ee]">
        {c.images?.[0] ? (
          <img src={c.images[0]} alt={`${c.typeLabel} i ${c.area || c.city}`} loading="lazy" decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
        ) : (
          <div className="absolute inset-0 grid place-items-center text-[#c9c3ba]"><MapPin className="h-7 w-7" /></div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-lg bg-white/92 px-2.5 py-1 text-[11px] font-semibold text-[#4a453e] backdrop-blur-sm">{c.modelLabel}</span>
          {rented && <span className="rounded-lg bg-[#0a0a0a]/85 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">Utleid</span>}
          {preview && <span className="inline-flex items-center gap-1 rounded-lg bg-[#7c3aed] px-2.5 py-1 text-[11px] font-semibold text-white"><EyeOff className="h-3 w-3" /> Ikke publisert</span>}
        </div>
        {c.imageCount > 1 && (
          <span className="absolute bottom-3 right-3 rounded-lg bg-black/45 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">{c.imageCount} bilder</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[16.5px] font-semibold leading-snug text-[#0a0a0a] group-hover:text-[#7c3aed] transition-colors" style={{ fontFamily: 'var(--font-heading)' }}>{c.title}</h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-[#78726a]">
          <MapPin className="h-3.5 w-3.5 text-[#c9c3ba]" />{[c.area, c.district].filter(Boolean).join(', ') || c.city}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[#5f5a53]">
          {c.sqm ? <span className="inline-flex items-center gap-1.5"><Ruler className="h-3.5 w-3.5 text-[#c9c3ba]" />{c.sqm} m²</span> : null}
          {c.bedrooms ? <span className="inline-flex items-center gap-1.5"><BedDouble className="h-3.5 w-3.5 text-[#c9c3ba]" />{c.bedrooms} soverom</span> : null}
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 border-t border-black/[0.05] pt-4">
          <div>
            {c.rentBand ? (
              <>
                <p className="text-[15.5px] font-bold text-[#0a0a0a] tabular-nums" style={{ fontFamily: 'var(--font-heading)' }}>{c.rentBand.replace(/\s*kr\/mnd\s*$/i, '')}</p>
                <p className="text-[11.5px] text-[#8d867d]">kr/mnd{c.rentIndicative ? ' · prisantydning' : ''}</p>
              </>
            ) : <p className="text-[13px] text-[#8d867d]">Pris på forespørsel</p>}
          </div>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#7c3aed]">Se bolig <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
        </div>
      </div>
    </Link>
  );
}

// Ingen ledige boliger er ikke en feil — det er en salgsmulighet. I stedet for
// en tom side fanger vi boligsøkerens kriterier i HousingAlertForm, som både
// gir oss et lead og forteller forvalteren hvilke boliger det venter folk på.

export default function ListingsGrid({ listings = [] }) {
  const [district, setDistrict] = useState('');
  const [beds, setBeds] = useState('');
  const [model, setModel] = useState('');
  const [maxRent, setMaxRent] = useState(0);
  const [openFilters, setOpenFilters] = useState(false);

  // Forhåndsvisning for innlogget admin: boliger som ikke er publisert hentes
  // med adminnøkkelen fra localStorage. Nøkkelen havner aldri i URL-en eller i
  // server-rendret HTML.
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

  const all = useMemo(() => {
    const extra = (preview?.candidates || []).map((c) => ({ ...c, _preview: true }));
    return [...listings, ...extra];
  }, [listings, preview]);

  const facets = useMemo(() => {
    const c = (key) => all.reduce((a, x) => { const v = x[key]; if (v) a[v] = (a[v] || 0) + 1; return a; }, {});
    const bands = all.map((x) => parseBand(x.rentBand)).filter(Boolean);
    return {
      districts: Object.entries(c('district')).map(([k, n]) => ({ key: k, label: k, count: n })).sort((a, b) => b.count - a.count),
      models: Object.entries(c('model')).map(([k, n]) => ({ key: k, label: all.find((x) => x.model === k)?.modelLabel || k, count: n })),
      beds: [...new Set(all.map((x) => x.bedrooms).filter(Boolean))].sort((a, b) => a - b),
      maxPrice: bands.length ? Math.max(...bands.map((b) => b.max)) : 0,
      minPrice: bands.length ? Math.min(...bands.map((b) => b.min)) : 0,
    };
  }, [all]);

  const filtered = useMemo(() => all.filter((c) => {
    if (district && c.district !== district) return false;
    if (beds) { const n = Number(beds); if (n >= 4 ? !(c.bedrooms >= 4) : c.bedrooms !== n) return false; }
    if (model && c.model !== model) return false;
    if (maxRent) { const b = parseBand(c.rentBand); if (b && b.min > maxRent) return false; }
    return true;
  }), [all, district, beds, model, maxRent]);

  const activeFilters = [district, beds, model, maxRent ? '1' : ''].filter(Boolean).length;
  const reset = () => { setDistrict(''); setBeds(''); setModel(''); setMaxRent(0); };

  return (
    <div data-testid="listings-grid">
      {preview?.error && (
        <p className="mb-6 rounded-2xl bg-amber-50 px-4 py-3 text-[13.5px] text-amber-900">{preview.error}</p>
      )}
      {preview?.readiness && (
        <div className="mb-6 rounded-2xl bg-[#f6f1ff] px-5 py-4 text-[13.5px] leading-relaxed text-[#4c3a75]" data-testid="listings-preview-banner">
          <b>Forhåndsvisning</b> — du ser {preview.candidates.length} bolig{preview.candidates.length === 1 ? '' : 'er'} som ikke er publisert ennå, merket lilla.
          {preview.readiness.almost?.length ? ` ${preview.readiness.almost.length} ledige boliger mangler innhold før de kan publiseres (se Boliger i adminportalen).` : ''}
        </div>
      )}

      {all.length > 0 && (
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setOpenFilters((v) => !v)} data-testid="listings-filter-toggle"
            className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3.5 text-[13px] font-semibold text-[#0a0a0a] ring-1 ring-inset ring-black/[0.09]">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Filtre{activeFilters ? ` (${activeFilters})` : ''}
          </button>
          {facets.districts.slice(0, 5).map((d) => (
            <Pill key={d.key} active={district === d.key} testId={`listings-district-${d.key}`}
              onClick={() => setDistrict(district === d.key ? '' : d.key)}>{d.label} <span className="opacity-50">{d.count}</span></Pill>
          ))}
          <span className="ml-auto text-[13px] text-[#8d867d] tabular-nums" data-testid="listings-count">
            {filtered.length} av {all.length} {all.length === 1 ? 'bolig' : 'boliger'}
          </span>
        </div>
      )}

      {openFilters && all.length > 0 && (
        <div className="mb-8 rounded-[24px] bg-white p-5 ring-1 ring-black/[0.05] shadow-[0_10px_40px_-26px_rgba(0,0,0,0.25)]">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">Bydel</p>
              <div className="flex flex-wrap gap-1.5">
                {facets.districts.map((d) => <Pill key={d.key} active={district === d.key} onClick={() => setDistrict(district === d.key ? '' : d.key)}>{d.label}</Pill>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">Soverom</p>
              <div className="flex flex-wrap gap-1.5">
                {facets.beds.map((n) => <Pill key={n} active={beds === String(n)} onClick={() => setBeds(beds === String(n) ? '' : String(n))}>{n}</Pill>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">Utleieform</p>
              <div className="flex flex-wrap gap-1.5">
                {facets.models.map((m) => <Pill key={m.key} active={model === m.key} onClick={() => setModel(model === m.key ? '' : m.key)}>{m.label}</Pill>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">Maks leie{maxRent ? `: ${KR(maxRent)} kr` : ''}</p>
              <input type="range" min={facets.minPrice || 0} max={facets.maxPrice || 0} step={1000} value={maxRent || facets.maxPrice || 0}
                onChange={(e) => setMaxRent(Number(e.target.value) >= (facets.maxPrice || 0) ? 0 : Number(e.target.value))}
                className="w-full accent-[#7c3aed]" aria-label="Maks månedsleie" />
              <p className="mt-1 text-[11.5px] text-[#a8a29a]">{facets.minPrice ? `${KR(facets.minPrice)}–${KR(facets.maxPrice)} kr/mnd i utvalget` : 'Ingen priser i utvalget'}</p>
            </div>
          </div>
          {activeFilters > 0 && (
            <button type="button" onClick={reset} className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#7c3aed]"><X className="h-3.5 w-3.5" /> Nullstill filtre</button>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => <ListingCard key={c.id} c={c} preview={c._preview} />)}
        </div>
      ) : all.length > 0 ? (
        <div className="rounded-[26px] bg-white p-10 text-center ring-1 ring-black/[0.05]">
          <p className="text-[17px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Ingen boliger matcher filtrene</p>
          <button type="button" onClick={reset} className="mt-3 text-[14px] font-semibold text-[#7c3aed]">Nullstill filtre</button>
        </div>
      ) : (
        <div className="rounded-[30px] bg-white p-8 sm:p-12 ring-1 ring-black/[0.05] shadow-[0_14px_50px_-30px_rgba(0,0,0,0.3)]" data-testid="listings-empty">
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7c3aed]">Status i Bergen</p>
          <h2 className="mt-3 max-w-[24ch] text-[28px] sm:text-[36px] font-bold leading-[1.08] tracking-[-0.025em] text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
            Ingen ledige boliger akkurat nå
          </h2>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed text-[#4a4a4a]">
            Boligene vi forvalter går ofte til noen på varslingslista før annonsen rekker å bli publisert. Legg inn e-posten din — så kan du si hva du leter etter etterpå, og bare høre fra oss når boligen faktisk passer.
          </p>
          <div className="mt-6"><HousingAlertForm /></div>
          <div className="mt-8 grid gap-4 border-t border-black/[0.06] pt-8 sm:grid-cols-3">
            {[
              { t: 'Vi kvalitetssikrer leietakeren', d: 'Kredittsjekk, referanser og digital kontrakt før noen får nøkkel.' },
              { t: 'Alt digitalt', d: 'Visning, kontrakt, depositumskonto og betaling i én løsning.' },
              { t: 'Lokale i Bergen', d: 'Vi kjenner bydelene, prisnivået og hvem som faktisk leter.' },
            ].map((x) => (
              <div key={x.t}>
                <p className="text-[14.5px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>{x.t}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#78726a]">{x.d}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {all.length > 0 && (
        <div className="mt-14 rounded-[26px] bg-[#f6f1ff] p-7 sm:p-9">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[17px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>Fant du ikke boligen du lette etter?</p>
              <p className="mt-1.5 max-w-[52ch] text-[14px] leading-relaxed text-[#4c3a75]">Vi får nye boliger fortløpende. Legg inn e-posten din, så varsler vi deg før de annonseres.</p>
            </div>
            <HousingAlertForm compact />
          </div>
        </div>
      )}
    </div>
  );
}
