'use client';

// Boliger på forsiden — synk fra plattformen + synlighetsstyring per bolig.
// Personvern: plattformen leverer PII-frie felt (ingen adresse/husnr/postnr).
// Alle boliger er SKJULT som standard — markedsansvarlig velger hva som vises.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Eye, EyeOff, Home, MapPin, BedDouble, Ruler,
  CheckCircle2, AlertTriangle, ImageOff, Sparkles, Globe, ExternalLink,
} from 'lucide-react';

const MODEL_LABEL = { langtid: 'Langtidsutleie', korttid: 'Korttidsutleie', hybrid: 'Hybridutleie' };
const STATUS_LABEL = { active: 'Ledig', rented: 'Utleid', paused: 'Pauset' };
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

  const props = data?.properties || [];
  const filtered = useMemo(() => props.filter((p) => {
    if (filter === 'synlige') return p.visible;
    if (filter === 'skjulte') return !p.visible;
    if (filter === 'ledige') return p.status === 'active';
    if (filter === 'utleid') return p.status === 'rented';
    if (filter === 'mangler') return p.incomplete;
    if (filter === 'duplikat') return p.duplicate;
    return true;
  }), [props, filter]);

  const withImages = props.filter((p) => (p.images || []).length > 0 && !p.duplicate);
  const incomplete = props.filter((p) => p.incomplete);
  const duplicates = props.filter((p) => p.duplicate);
  const chips = [
    { k: 'alle', l: `Alle (${props.length})` },
    { k: 'synlige', l: `Synlige (${props.filter((p) => p.visible).length})` },
    { k: 'skjulte', l: `Skjulte (${props.filter((p) => !p.visible).length})` },
    { k: 'ledige', l: `Ledige (${props.filter((p) => p.status === 'active').length})` },
    { k: 'utleid', l: `Utleid (${props.filter((p) => p.status === 'rented').length})` },
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
          Alle felt er personvern-trygge fra plattformen (ingen adresser, husnummer eller leietaker-info — kun område og by).
          Nye boliger er <strong>skjult som standard</strong> — slå på synlighet per bolig for å vise den i «Noen av våre eiendommer» på forsiden.
          Boliger uten bilder vises ikke offentlig selv om de er markert synlige.
        </p>
      </div>

      {/* Datakvalitet — det som må ryddes i plattformen, ikke her */}
      {(incomplete.length > 0 || duplicates.length > 0) && (
        <div className="flex items-start gap-2.5 rounded-xl bg-[#fff8e6] px-4 py-3" data-testid="props-quality-banner">
          <AlertTriangle className="w-4 h-4 text-[#c98a00] shrink-0 mt-0.5" />
          <div className="text-[12.5px] leading-relaxed text-[#8a6500]">
            <p>
              <strong>{incomplete.length} boliger mangler innhold</strong> fra plattformen (ingen bilder, 0 m², 0 soverom)
              {duplicates.length > 0 && <> og <strong>{duplicates.length} ser ut som dobbeltregistrering</strong> (helt identiske felt i samme gate)</>}.
              Disse ser ut som duplikater i lista, og de sperres automatisk fra forsiden og nyhetsbrev — et boligkort uten bilde og uten info skader mer enn det hjelper.
            </p>
            <p className="mt-1.5 text-[#a67c00]">
              Flere boliger i samme gate er normalt: eksporten fjerner husnummer, så ulike leiligheter i samme bygg får samme områdenavn.
              Vi flagger derfor bare rader som er identiske på gate, type, soverom, areal, bildeantall og leiemodell. Rydd dem i DigiHome-appen — vi kan bare lese herfra.
            </p>
          </div>
        </div>
      )}

      {/* Filtre + hurtighandlinger */}
      <div className="flex flex-wrap items-center gap-2">
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
              </div>
              {(p.images || []).length > 1 && (
                <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/50 text-white text-[10.5px] px-1.5 py-0.5">{p.images.length} bilder</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="text-[14.5px] font-semibold text-[#0a0a0a] leading-snug" style={{ fontFamily: 'var(--font-heading)' }}>{p.title || 'Bolig'}</h3>
              <div className="flex items-center gap-1.5 mt-1.5 text-[12px] text-[#999]">
                <MapPin className="w-3.5 h-3.5 text-[#ccc]" />
                {[p.area, p.city || p.district].filter(Boolean).join(', ') || p.district || 'Område ukjent'}
              </div>
              <div className="flex items-center gap-3.5 mt-2 text-[12px] text-[#777]">
                {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5 text-[#bbb]" />{p.bedrooms} sov</span>}
                {p.sqm != null && <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5 text-[#bbb]" />{p.sqm} m²</span>}
              </div>
              <div className="flex items-center justify-between mt-3.5 pt-3.5 border-t border-[#f1f0ee]">
                <span className="text-[12.5px] font-semibold text-[#0a0a0a]">{p.monthlyRentBand || '—'}</span>
                <button onClick={() => toggle(p)} disabled={togglingId === p.id}
                  aria-label={p.visible ? 'Skjul fra forsiden' : 'Vis på forsiden'}
                  className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${p.visible ? 'bg-[#e9f7ef] text-[#1f7a4d] hover:bg-[#dcf0e5]' : 'bg-[#f5f5f4] text-[#888] hover:bg-[#ececea]'}`}>
                  {togglingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : p.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {p.visible ? 'Synlig' : 'Skjult'}
                </button>
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
