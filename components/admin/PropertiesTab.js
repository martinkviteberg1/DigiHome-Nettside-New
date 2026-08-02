'use client';

// Boliger på forsiden — synk fra plattformen + synlighetsstyring per bolig.
// Personvern: plattformen leverer PII-frie felt (ingen adresse/husnr/postnr).
// Alle boliger er SKJULT som standard — markedsansvarlig velger hva som vises.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Eye, EyeOff, Home, MapPin, BedDouble, Ruler,
  CheckCircle2, AlertTriangle, ImageOff, Sparkles, Globe, ExternalLink,
  Link2, Download, X, Search,
} from 'lucide-react';

const MODEL_LABEL = { langtid: 'Langtidsutleie', korttid: 'Korttidsutleie', hybrid: 'Hybridutleie' };
const STATUS_LABEL = { active: 'Ledig', rented: 'Utleid', paused: 'Pauset' };
// Status fra plattformens enhetseksport (mer presis enn boligeksportens tre trinn)
const UNIT_STATUS_LABEL = { ledig: 'Ledig', utleid: 'Utleid', under_signering: 'Under signering' };
const STATUS_CLS = {
  active: 'bg-[#e9f7ef] text-[#1f7a4d]',
  rented: 'bg-[#f0ebff] text-[#6b4fd8]',
  paused: 'bg-[#f5f5f4] text-[#888]',
};

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function PropertiesTab({ apiKey }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null); // {ok, text}
  const [filter, setFilter] = useState('alle');
  const [togglingId, setTogglingId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [search, setSearch] = useState('');
  // FINN-kobling per bolig: hvilken bolig som er åpen, hva som er skrevet inn,
  // hvem som henter nå, og siste svar.
  const [finnOpen, setFinnOpen] = useState(null);
  const [finnInput, setFinnInput] = useState('');
  const [finnBusy, setFinnBusy] = useState(null);
  const [finnMsg, setFinnMsg] = useState(null); // {ok, id, text}

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/properties?${q}`);
      const j = await r.json();
      if (j.ok) setData(j);
    } catch (e) {}
    setLoading(false);
  }, [q]);
  useEffect(() => { load(); }, [load]);

  const runSync = async () => {
    setSyncing(true); setSyncMsg(null);
    try {
      const r = await fetch(`/api/admin/properties/sync?${q}`, { method: 'POST' });
      const j = await r.json();
      if (j.ok) {
        setSyncMsg({ ok: true, text: `Synket ${j.synced} boliger fra plattformen (${j.upserted} nye, ${j.updated} oppdatert${j.staleMarked ? `, ${j.staleMarked} fjernet` : ''})` });
        await load();
      } else {
        setSyncMsg({ ok: false, text: j.error || 'Synk feilet — prøv igjen' });
      }
    } catch (e) { setSyncMsg({ ok: false, text: 'Nettverksfeil under synk' }); }
    setSyncing(false);
  };

  const toggle = async (p) => {
    setTogglingId(p.id);
    try {
      const r = await fetch(`/api/admin/properties/visibility?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, visible: !p.visible }),
      });
      const j = await r.json();
      if (j.ok) setData((d) => ({ ...d, properties: d.properties.map((x) => (x.id === p.id ? { ...x, visible: !p.visible } : x)), visibleCount: d.visibleCount + (!p.visible ? 1 : -1) }));
    } catch (e) {}
    setTogglingId(null);
  };

  const bulk = async (ids, visible) => {
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const r = await fetch(`/api/admin/properties/visibility?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, visible }),
      });
      const j = await r.json();
      if (j.ok) await load();
    } catch (e) {}
    setBulkBusy(false);
  };

  // FINN-kobling: hent bilder/pris/areal/postnummer fra utleierens FINN-annonse.
  // Tom url fjerner koblingen. Vi skriver aldri noe tilbake til plattformen.
  const saveFinn = async (p, url) => {
    setFinnBusy(p.id); setFinnMsg(null);
    try {
      const r = await fetch(`/api/admin/properties/finn?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, url }),
      });
      const j = await r.json();
      if (j.ok) {
        const im = j.imported || {};
        const filled = (im.filled || []).join(', ');
        setFinnMsg({
          ok: true, id: p.id,
          text: url
            ? `Hentet ${im.images || 0} bilder fra FINN${filled ? ` · fylte ${filled}` : ''}${im.postalCode ? ` · postnr ${im.postalCode}` : ''}`
            : 'FINN-koblingen er fjernet',
        });
        setFinnOpen(null); setFinnInput('');
        await load();
      } else {
        setFinnMsg({ ok: false, id: p.id, text: j.error || 'Kunne ikke hente annonsen' });
      }
    } catch (e) { setFinnMsg({ ok: false, id: p.id, text: 'Nettverksfeil — prøv igjen' }); }
    setFinnBusy(null);
  };

  const props = data?.properties || [];
  const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = useMemo(() => props.filter((p) => {
    if (tokens.length) {
      const hay = [p.title, p.area, p.district, p.city, p.sqm ? `${p.sqm} m2 m²` : '', p.bedrooms ? `${p.bedrooms} soverom` : '', p.model, p.monthlyRentBand]
        .filter(Boolean).join(' ').toLowerCase();
      if (!tokens.every((t) => hay.includes(t))) return false;
    }
    if (filter === 'synlige') return p.visible;
    if (filter === 'skjulte') return !p.visible;
    if (filter === 'ledige') return p.status === 'active';
    if (filter === 'utleid') return p.status === 'rented';
    if (filter === 'mangler') return p.incomplete;
    if (filter === 'duplikat') return p.duplicate;
    if (filter === 'utenbilder') return !(p.images || []).length;
    return true;
  }), [props, filter, search]);

  const withImages = props.filter((p) => (p.images || []).length > 0 && !p.duplicate);
  const incomplete = props.filter((p) => p.incomplete);
  const duplicates = props.filter((p) => p.duplicate);
  const noImages = props.filter((p) => !(p.images || []).length);
  const finnLinked = props.filter((p) => p.finnUrl);
  const chips = [
    { k: 'alle', l: `Alle (${props.length})` },
    { k: 'synlige', l: `Synlige (${props.filter((p) => p.visible).length})` },
    { k: 'skjulte', l: `Skjulte (${props.filter((p) => !p.visible).length})` },
    { k: 'ledige', l: `Ledige (${props.filter((p) => p.status === 'active').length})` },
    { k: 'utleid', l: `Utleid (${props.filter((p) => p.status === 'rented').length})` },
    ...(noImages.length ? [{ k: 'utenbilder', l: `Uten bilder (${noImages.length})` }] : []),
    ...(incomplete.length ? [{ k: 'mangler', l: `Mangler data (${incomplete.length})` }] : []),
    ...(duplicates.length ? [{ k: 'duplikat', l: `Duplikater (${duplicates.length})` }] : []),
  ];

  if (loading) return <div className="flex items-center gap-2 text-[#999] text-[14px] py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Laster boliger …</div>;

  return (
    <div className="space-y-5">
      {/* Topp: statistikk + synk */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <Home className="w-4 h-4 text-[#b98cf7]" />
            <span className="text-[13px] text-[#666]">Synket:</span>
            <span className="text-[14px] font-bold text-[#0a0a0a]">{props.length}</span>
          </div>
          <div className="flex items-center gap-2 h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <Globe className="w-4 h-4 text-[#7fc79e]" />
            <span className="text-[13px] text-[#666]">Synlige på forsiden:</span>
            <span className="text-[14px] font-bold text-[#0a0a0a]">{data?.visibleCount || 0}</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <RefreshCw className="w-3.5 h-3.5 text-[#bbb]" />
            <span className="text-[12.5px] text-[#999]">Sist synket {fmtTime(data?.meta?.lastSyncAt)}</span>
          </div>
        </div>
        <div className="lg:ml-auto flex items-center gap-2">
          <a href="/#boliger" target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.04)] text-[13px] font-medium text-[#666] hover:text-[#0a0a0a] transition-colors flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Se forsiden
          </a>
          <button onClick={runSync} disabled={syncing} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold hover:bg-[#2a2a2a] transition-colors flex items-center gap-2 disabled:opacity-60">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Synker …' : 'Synk fra plattformen'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`flex items-center gap-2 text-[13px] rounded-xl px-4 py-3 ${syncMsg.ok ? 'bg-[#e9f7ef] text-[#1f7a4d]' : 'bg-[#fdecec] text-[#c0392b]'}`}>
          {syncMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {syncMsg.text}
        </div>
      )}

      {/* Personvern-info */}
      <div className="flex items-start gap-2.5 rounded-xl bg-[#f7f3ff] px-4 py-3">
        <Sparkles className="w-4 h-4 text-[#9a6ee8] shrink-0 mt-0.5" />
        <p className="text-[12.5px] leading-relaxed text-[#6b5a94]">
          Denne listen speiler <strong>«Enheter»</strong> i DigiHome-appen — samme enheter, med full adresse, etasje, eier, leietaker og faktisk vs. estimert leie.
          Disse feltene vises <strong>bare her, bak innlogging</strong>. Forsiden og nyhetsbrevet får kun gatenavn uten husnummer, område, størrelse og prisintervall — aldri adresse, eier eller leietaker.
          Nye boliger er <strong>skjult som standard</strong> — slå på synlighet per bolig for å vise den i «Noen av våre eiendommer» på forsiden.
          Boliger uten bilder vises ikke offentlig selv om de er markert synlige.
        </p>
      </div>

      {/* Datakvalitet — hva som mangler fra plattformen, og hva du kan gjøre nå */}
      {(incomplete.length > 0 || duplicates.length > 0 || noImages.length > 0) && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[#fff8e6] px-4 py-3" data-testid="props-quality-banner">
          <AlertTriangle className="w-4 h-4 text-[#c98a00] shrink-0 mt-0.5" />
          <div className="text-[12.5px] leading-relaxed text-[#8a6500]">
            <p>
              <strong>{noImages.length} av {props.length} boliger har ingen bilder</strong> i plattformeksporten
              {incomplete.length > 0 && <>, og <strong>{incomplete.length}</strong> mangler også areal og soverom</>}
              {duplicates.length > 0 && <>. <strong>{duplicates.length}</strong> er registrert to ganger</>}.
              Et boligkort uten bilde kan ikke sendes i nyhetsbrev, så disse er sperret.
            </p>
            <p className="mt-1.5 text-[#a67c00]">
              <strong>Løsning nå:</strong> lim inn utleierens FINN-annonse på boligkortet nedenfor — vi henter bilder, pris, areal og postnummer derfra,
              og boligen blir umiddelbart klar for forsiden og nyhetsbrev. Vi skriver aldri noe tilbake til plattformen.
              {finnLinked.length > 0 && <> {finnLinked.length} bolig{finnLinked.length === 1 ? '' : 'er'} er alt koblet.</>}
            </p>
            <p className="mt-1.5 text-[#a67c00]">
              Flere boliger i samme gate er normalt: eksporten fjerner husnummer, så ulike leiligheter i samme bygg får samme gatenavn.
              Vi flagger derfor bare rader som er identiske på gate, type, soverom, areal og bildeantall.
              Boliger uten areal og bilder er ofte reelle sameie-enheter der utleieren ikke har registrert innhold — de er ikke duplikater.
            </p>
          </div>
        </div>
      )}

      {/* Filtre + søk + hurtighandlinger */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#c4bdb4] pointer-events-none" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk gate, bydel, størrelse…"
            data-testid="props-search"
            className="h-9 w-[200px] rounded-full bg-white pl-8 pr-7 text-[12.5px] text-[#111] shadow-[0_2px_10px_rgba(0,0,0,0.04)] outline-none placeholder:text-[#c4bdb4]"
          />
          {search ? (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c4bdb4] hover:text-[#555]"><X className="w-3.5 h-3.5" /></button>
          ) : null}
        </div>
        {chips.map((c) => (
          <button key={c.k} onClick={() => setFilter(c.k)}
            className={`h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors ${filter === c.k ? 'bg-[#0a0a0a] text-white' : 'bg-white text-[#777] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#0a0a0a]'}`}>
            {c.l}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => bulk(withImages.map((p) => p.id), true)} disabled={bulkBusy || !withImages.length}
            className="h-9 px-3.5 rounded-full text-[12.5px] font-medium bg-white text-[#1f7a4d] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:bg-[#e9f7ef] transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <Eye className="w-3.5 h-3.5" /> Vis alle med bilder ({withImages.length})
          </button>
          <button onClick={() => bulk(props.map((p) => p.id), false)} disabled={bulkBusy || !props.length}
            className="h-9 px-3.5 rounded-full text-[12.5px] font-medium bg-white text-[#999] shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:text-[#c0392b] transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <EyeOff className="w-3.5 h-3.5" /> Skjul alle
          </button>
        </div>
      </div>

      {/* Tomt-tilstand */}
      {!props.length && (
        <div className="rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.04)] py-16 text-center">
          <Home className="w-8 h-8 text-[#ddd] mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-[#0a0a0a]">Ingen boliger synket ennå</p>
          <p className="text-[13px] text-[#999] mt-1 mb-5">Hent forvaltede boliger fra plattformen for å komme i gang.</p>
          <button onClick={runSync} disabled={syncing} className="h-10 px-5 rounded-full bg-[#0a0a0a] text-white text-[13.5px] font-semibold inline-flex items-center gap-2">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Synk fra plattformen
          </button>
        </div>
      )}

      {/* Rutenett */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((p) => (
          <div key={p.id} className={`rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.05)] overflow-hidden transition-all ${p.visible ? 'ring-2 ring-[#7fc79e]/50' : ''}`}>
            <div className="relative aspect-[16/10] bg-[#f5f4f2]">
              {(p.images || []).length ? (
                <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-[#ccc]">
                  <ImageOff className="w-6 h-6 mb-1.5" />
                  <span className="text-[11.5px]">Ingen bilder</span>
                </div>
              )}
              <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 pr-2.5">
                <span className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold ${STATUS_CLS[p.status] || STATUS_CLS.paused}`}>{STATUS_LABEL[p.status] || p.status}</span>
                {p.model && <span className="rounded-lg px-2 py-1 text-[10.5px] font-semibold bg-white/90 backdrop-blur-sm text-[#555]">{MODEL_LABEL[p.model] || p.model}</span>}
                {p.duplicate && <span className="rounded-lg px-2 py-1 text-[10.5px] font-semibold bg-[#fdecec] text-[#c0392b]" title={`Identisk med ${(p.duplicateGroupSize || 2) - 1} annen bolig i samme gate — rydd i DigiHome-appen`}>Mulig duplikat</span>}
                {p.incomplete && !p.duplicate && <span className="rounded-lg px-2 py-1 text-[10.5px] font-semibold bg-[#fff8e6] text-[#8a6500]" title="Mangler bilder, areal og soverom fra plattformen">Mangler data</span>}
                {p.imageSource === 'finn' && <span className="rounded-lg px-2 py-1 text-[10.5px] font-semibold bg-[#e8f1ff] text-[#1d5bbf]" title="Bildene er hentet fra utleierens FINN-annonse fordi plattformen ikke sendte noen">Bilder fra FINN</span>}
              </div>
              {(p.images || []).length > 1 && (
                <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/50 text-white text-[10.5px] px-1.5 py-0.5">{p.images.length} bilder</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-[14.5px] font-semibold text-[#0a0a0a] leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>{p.title || 'Bolig'}</h3>
              {/* Speiling av «Enheter»-visningen: full adresse med husnummer og
                  etasje kommer fra plattformens enhetseksport (kun for admin). */}
              <div className="flex items-start gap-1.5 mt-1.5 text-[12px] text-[#999]">
                <MapPin className="w-3.5 h-3.5 text-[#ccc] shrink-0 mt-0.5" />
                <span>
                  {p.fullAddress || [p.area, p.city || p.district].filter(Boolean).join(', ') || 'Område ukjent'}
                  {p.floor != null ? <span className="text-[#bbb]"> · {p.floor}. etg</span> : null}
                  {p.district ? <span className="text-[#bbb]"> · {p.district}</span> : null}
                </span>
              </div>
              <div className="flex items-center gap-3.5 mt-2 text-[12px] text-[#777]">
                {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-[#bbb]" />{p.bedrooms} sov</span>}
                {p.sqm != null && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-[#bbb]" />{p.sqm} m²</span>}
                {p.unitStatus && <span className="text-[#aaa]">{UNIT_STATUS_LABEL[p.unitStatus] || p.unitStatus}</span>}
              </div>
              {p.hasUnitData && (p.ownerName || p.tenantName) ? (
                <div className="mt-2.5 space-y-0.5 text-[11.5px] text-[#8a8580]">
                  {p.ownerName ? <p className="truncate"><span className="text-[#bbb]">Eier:</span> {p.ownerName}</p> : null}
                  <p className="truncate"><span className="text-[#bbb]">Leietaker:</span> {p.tenantName || 'Ingen aktiv leietaker'}</p>
                </div>
              ) : null}
              <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-[#f1f0ee]">
                <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#0a0a0a]">
                  {/* Faktisk leie vs. estimat kommer nå eksplisitt fra plattformen.
                      Et estimat skal ALDRI leses som inntekt. */}
                  {p.rentAmount != null
                    ? `${Number(p.rentAmount).toLocaleString('nb-NO')} kr/mnd`
                    : (p.monthlyRentBand || '—')}
                  {p.rentAmount != null && p.rentIsEstimate ? (
                    <span className="rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide bg-[#fff8e6] text-[#8a6500]" title="Estimert leie fra plattformen — teller ikke som inntekt">Estimat</span>
                  ) : null}
                </span>
                <button onClick={() => toggle(p)} disabled={togglingId === p.id}
                  aria-label={p.visible ? 'Skjul fra forsiden' : 'Vis på forsiden'}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${p.visible ? 'bg-[#e9f7ef] text-[#1f7a4d] hover:bg-[#dcf0e5]' : 'bg-[#f5f5f4] text-[#888] hover:bg-[#ececea]'}`}>
                  {togglingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {p.visible ? 'Synlig' : 'Skjult'}
                </button>
              </div>

              {/* FINN-annonse: fyller hull der plattformen mangler bilder/pris/areal */}
              <div className="mt-3 pt-3 border-t border-[#f1f0ee]">
                {p.finnUrl ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <a href={p.finnUrl} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-[12px] font-semibold text-[#1d5bbf] hover:underline">
                        <Link2 className="w-3.5 h-3.5" /> FINN-annonse{p.finnCode ? ` ${p.finnCode}` : ''}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      {p.finnSource === 'plattform' && p.finnStatus !== 'aktiv' && (
                        <span className="rounded-lg px-2 py-0.5 text-[10.5px] font-semibold bg-[#fff4e5] text-[#a15c00]"
                          title="Lenken kommer fra plattformens enhetseksport, som i dag også returnerer FINN-koder utenfor utleiemodulen">Ubekreftet kilde</span>
                      )}
                      {p.finnSource === 'manuell' && (
                        <span className="rounded-lg px-2 py-0.5 text-[10.5px] font-semibold bg-[#e9f7ef] text-[#1f7a4d]" title="Du har limt inn denne lenken selv, og vi verifiserte den mot FINN">Verifisert</span>
                      )}
                      <button onClick={() => (p.finnSource === 'plattform' ? (setFinnOpen(p.id), setFinnInput(''), setFinnMsg(null)) : saveFinn(p, ''))} disabled={finnBusy === p.id}
                        title={p.finnSource === 'plattform' ? 'Lim inn riktig lenke fra utleiemodulen — den overstyrer plattformens' : 'Fjern koblingen og all data hentet fra FINN'}
                        className="ml-auto text-[11.5px] text-[#aaa] hover:text-[#1d5bbf] disabled:opacity-50">
                        {finnBusy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (p.finnSource === 'plattform' ? 'Overstyr' : 'Fjern')}
                      </button>
                    </div>
                    {p.finnSource === 'plattform' && p.finnStatus !== 'aktiv' && (
                      <p className="text-[11px] text-[#a15c00] leading-relaxed">
                        Vises ikke til leietakere. Plattformen sender denne koden fra registreringen/manuell annonse, ikke fra utleiemodulens aktive annonse — den kan være feil bolig eller utgått. Plattformteamet er varslet. Lim inn riktig lenke for å bruke den.
                      </p>
                    )}
                    {(p.enrichedFields || []).length > 0 && (
                      <p className="text-[11px] text-[#1f7a4d]">Hentet fra FINN: {(p.enrichedFields || []).join(', ')}</p>
                    )}
                  </div>
                ) : finnOpen === p.id ? (
                  <div className="space-y-2">
                    <input
                      autoFocus value={finnInput} onChange={(e) => setFinnInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && finnInput.trim()) saveFinn(p, finnInput.trim()); }}
                      placeholder="https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
                      data-testid={`props-finn-input-${p.id}`}
                      className="w-full h-9 rounded-lg border border-[#e8e4de] px-3 text-[11.5px] outline-none focus:border-[#9a6ee8]"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveFinn(p, finnInput.trim())} disabled={finnBusy === p.id || !finnInput.trim()}
                        data-testid={`props-finn-fetch-${p.id}`}
                        className="h-8 px-3 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-50">
                        {finnBusy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        {finnBusy === p.id ? 'Henter …' : 'Hent bilder og pris'}
                      </button>
                      <button onClick={() => { setFinnOpen(null); setFinnInput(''); setFinnMsg(null); }}
                        className="h-8 px-3 rounded-full bg-[#f5f5f4] text-[#888] text-[12px] font-semibold">Avbryt</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setFinnOpen(p.id); setFinnInput(''); setFinnMsg(null); }}
                    data-testid={`props-finn-open-${p.id}`}
                    className="flex items-center gap-1.5 text-[12px] font-medium text-[#888] hover:text-[#1d5bbf] transition-colors">
                    <Link2 className="w-3.5 h-3.5" />
                    {(p.images || []).length ? 'Koble FINN-annonse' : 'Hent bilder fra FINN-annonse'}
                  </button>
                )}
                {finnMsg && finnMsg.id === p.id && (
                  <p className={`mt-1.5 text-[11px] leading-relaxed ${finnMsg.ok ? 'text-[#1f7a4d]' : 'text-[#c0392b]'}`}>{finnMsg.text}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {props.length > 0 && !filtered.length && (
        <p className="text-center text-[13px] text-[#999] py-10">Ingen boliger i dette filteret.</p>
      )}
    </div>
  );
}
