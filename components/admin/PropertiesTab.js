'use client';

// Boliger på forsiden — synk fra plattformen + synlighetsstyring per bolig.
// Personvern: eier, leietaker og kontraktsleie vises bare her, bak innlogging.
// Alle boliger er SKJULT som standard — markedsansvarlig velger hva som vises.
//
// LAYOUT: denne fanen hadde tre stablede forklaringspaneler og et boligkort som
// gjorde fem jobber. Nå er statusen samlet i PropertiesStatus (tall som er
// filtre, forklaring bak et spørsmålstegn) og kortet ligger i PropertyCard med
// detaljene kollapset. Ingen funksjon er fjernet — den er flyttet ett klikk unna.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, RefreshCw, Eye, EyeOff, Home, CheckCircle2, AlertTriangle,
  ExternalLink, X, Search, Tag,
} from 'lucide-react';
import { publishReadiness } from '@/lib/listings';
import DemandPanel from './DemandPanel';
import PropertyEditor from './PropertyEditor';
import PropertiesStatus from './properties/PropertiesStatus';
import PropertyCard from './properties/PropertyCard';

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
  // FINN-kobling per bolig: hvem som henter nå, og siste svar. Selve
  // inntastingen bor i PropertyCard.
  const [editing, setEditing] = useState(null);
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
        await load();
      } else {
        setFinnMsg({ ok: false, id: p.id, text: j.error || 'Kunne ikke hente annonsen' });
      }
    } catch (e) { setFinnMsg({ ok: false, id: p.id, text: 'Nettverksfeil — prøv igjen' }); }
    setFinnBusy(null);
  };

  // -------------------------------------------------------------------------
  // ANNONSETITTEL
  // Plattformen sender en personvern-trygg og derfor GENERISK tittel («Møblert
  // leilighet · 1 soverom · 52 m²»). Ti slike kort i et nyhetsbrev er uleselige.
  // Rekkefølgen er: redigert → FINN-annonse → plattform → avledet fra gate/rom.
  // Her kan tittelen redigeres, og annonsedata hentes fra en koblet FINN-annonse.
  //
  // LEIE følger et annet prinsipp: utleiemodulen er eneste autoritative kilde.
  // FINN-prisen lagres kun som kontrollsignal og vises som avvik.
  // -------------------------------------------------------------------------
  const [titleBusy, setTitleBusy] = useState(null);
  const [snapBusy, setSnapBusy] = useState(null); // bolig-id, eller '*' for alle
  const [snapMsg, setSnapMsg] = useState(null);   // {ok, text}

  const saveTitle = async (p, title) => {
    setTitleBusy(p.id);
    try {
      const r = await fetch(`/api/admin/properties/title?${q}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id, title }),
      });
      const j = await r.json();
      if (j.ok) await load();
    } catch (e) {}
    setTitleBusy(null);
  };

  const fetchSnapshot = async (p) => {
    setSnapBusy(p.id); setSnapMsg(null);
    try {
      const r = await fetch(`/api/admin/properties/finn-snapshot?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: p.id }),
      });
      const j = await r.json();
      const res = (j.results || [])[0] || {};
      if (j.ok && res.ok) {
        setSnapMsg({ ok: true, text: `Hentet annonsedata for ${res.area || 'boligen'}${res.title ? `: «${res.title}»` : ''}${res.deviates ? ` — NB: FINN-prisen avviker ${res.deviationPct > 0 ? '+' : ''}${res.deviationPct} % fra plattformen` : ''}` });
      } else {
        setSnapMsg({ ok: false, text: j.error || 'Annonsen svarte ikke — den kan være utgått' });
      }
      await load();
    } catch (e) { setSnapMsg({ ok: false, text: 'Nettverksfeil — prøv igjen' }); }
    setSnapBusy(null);
  };

  const fetchAllSnapshots = async () => {
    setSnapBusy('*'); setSnapMsg(null);
    try {
      const r = await fetch(`/api/admin/properties/finn-snapshot?${q}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true, limit: 24 }),
      });
      const j = await r.json();
      if (j.ok) {
        setSnapMsg({
          ok: true,
          text: `Hentet annonsedata for ${j.fetched} bolig${j.fetched === 1 ? '' : 'er'} — ${j.withTitle} med annonsetittel${j.expired ? `, ${j.expired} annonse${j.expired === 1 ? '' : 'r'} svarte ikke` : ''}${j.deviations ? `, ${j.deviations} med prisavvik mot plattformen` : ''}.`,
        });
      } else setSnapMsg({ ok: false, text: j.error || 'Kunne ikke hente annonsedata' });
      await load();
    } catch (e) { setSnapMsg({ ok: false, text: 'Nettverksfeil — prøv igjen' }); }
    setSnapBusy(null);
  };

  const props = data?.properties || [];
  // Publiseringsklarhet for /ledige-boliger. Strengere port enn forsiden:
  // bilder må komme fra utleiemodulen og prisen fra plattformen.
  const pub = useMemo(() => publishReadiness(props), [props]);
  // Statusflisene i PropertiesStatus er filtre. Da må filteret kunne slå opp
  // hvilken bøtte en bolig havnet i, uten å regne porten to ganger.
  const pubSets = useMemo(() => ({
    publisert: new Set((pub.published || []).map((r) => r.id)),
    klar: new Set((pub.ready || []).map((r) => r.id)),
    manglerpub: new Set((pub.almost || []).map((r) => r.id)),
  }), [pub]);

  const tokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const filtered = useMemo(() => props.filter((p) => {
    if (tokens.length) {
      const hay = [p.listingTitle, p.finnTitle, p.title, p.area, p.district, p.city, p.fullAddress, p.sqm ? `${p.sqm} m2 m²` : '', p.bedrooms ? `${p.bedrooms} soverom` : '', p.model, p.monthlyRentBand]
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
    if (pubSets[filter]) return pubSets[filter].has(p.id);
    return true;
  }), [props, filter, search, pubSets]);

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
    ...(incomplete.length ? [{ k: 'mangler', l: `Mangler data (${incomplete.length})` }] : []),
  ];
  // Flisene i statuspanelet kan sette et filter som ikke finnes som chip. Da
  // trenger brukeren en synlig måte å komme tilbake.
  const TILE_FILTER_LABEL = {
    publisert: 'Publisert', klar: 'Klar, ikke publisert', manglerpub: 'Mangler innhold',
    utenbilder: 'Uten bilder', duplikat: 'Duplikater',
  };

  if (loading) return <div className="flex items-center gap-2 text-[#999] text-[14px] py-16 justify-center"><Loader2 className="w-4 h-4 animate-spin" /> Laster boliger …</div>;

  return (
    <div className="space-y-5">
      {/* TOPPLINJE — kilde og synk. Tre flytende piller ble én rolig rad. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-white px-4 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <span className="inline-flex items-baseline gap-1.5 text-[13px] text-[#8a8580]">
          <Home className="h-4 w-4 self-center text-[#b98cf7]" />
          <b className="text-[14.5px] font-bold text-[#0a0a0a] tabular-nums">{props.length}</b> enheter fra plattformen
        </span>
        <span className="hidden h-4 w-px bg-[#f1f0ee] sm:block" />
        <span className="inline-flex items-baseline gap-1.5 text-[13px] text-[#8a8580]">
          <b className="text-[14.5px] font-bold text-[#0a0a0a] tabular-nums">{data?.visibleCount || 0}</b> satt synlige
        </span>
        <span className="ml-auto hidden text-[12px] text-[#b8b2aa] md:block">Sist synket {fmtTime(data?.meta?.lastSyncAt)}</span>
        <div className="flex items-center gap-2">
          <a href="/#boliger" target="_blank" rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-[#8a8580] transition-colors hover:bg-[#f5f4f2] hover:text-[#0a0a0a]">
            <ExternalLink className="h-3.5 w-3.5" /> Forsiden
          </a>
          <button type="button" onClick={runSync} disabled={syncing}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0a0a0a] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-60">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? 'Synker …' : 'Synk'}
          </button>
        </div>
      </div>

      {syncMsg && (
        <div className={`flex items-center gap-2 text-[13px] rounded-xl px-4 py-3 ${syncMsg.ok ? 'bg-[#e9f7ef] text-[#1f7a4d]' : 'bg-[#fdecec] text-[#c0392b]'}`}>
          {syncMsg.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {syncMsg.text}
        </div>
      )}

      {snapMsg && (
        <div className={`flex items-start gap-2 text-[13px] rounded-xl px-4 py-3 ${snapMsg.ok ? 'bg-[#e8f1ff] text-[#1d5bbf]' : 'bg-[#fdecec] text-[#c0392b]'}`} data-testid="props-snapshot-msg">
          {snapMsg.ok ? <Tag className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <span className="leading-relaxed">{snapMsg.text}</span>
        </div>
      )}

      {/* STATUS FOR NETTSIDEN
          Tidligere tre stablede paneler: personvern-forklaring, publiseringsstatus
          og datakvalitetsvarsel — til sammen elleve setninger før første bolig.
          Nå ett panel der tallene er filtre og forklaringen ligger bak «?». */}
      <PropertiesStatus
        pub={pub}
        noImages={noImages}
        duplicates={duplicates}
        finnLinked={finnLinked}
        total={props.length}
        activeFilter={filter}
        onFilter={setFilter}
      />

      {/* ETTERSPØRSEL — svarer på «hvilken bolig skal jeg fikse først?».
          Svaret er den boligen flest boligsøkere venter på. */}
      <DemandPanel apiKey={apiKey} />

      {/* VERKTØYLINJE — søk, filtre, og handlinger som gjelder flere boliger.
          Handlingene er skilt fra filtrene med en tynn strek, slik at «Skjul
          alle» ikke ser ut som nok et filter. */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#c4bdb4] pointer-events-none" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Søk gate, bydel, størrelse…"
            data-testid="props-search"
            className="h-9 w-[190px] rounded-full border border-[#eeece8] bg-white pl-8 pr-7 text-[12.5px] text-[#111] outline-none placeholder:text-[#b8b2aa] focus:border-[#c9b6e8]"
          />
          {search ? (
            <button type="button" onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#c4bdb4] hover:text-[#555]"><X className="w-3.5 h-3.5" /></button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {chips.map((c) => (
            <button key={c.k} type="button" onClick={() => setFilter(c.k)}
              className={`h-9 px-3 rounded-full text-[12.5px] font-medium transition-colors ${filter === c.k ? 'bg-[#0a0a0a] text-white' : 'text-[#8a8580] hover:bg-[#f5f4f2] hover:text-[#0a0a0a]'}`}>
              {c.l}
            </button>
          ))}
          {/* Kom-tilbake-knapp når filteret ble satt fra en statusflis */}
          {TILE_FILTER_LABEL[filter] && (
            <button type="button" onClick={() => setFilter('alle')} data-testid="props-clear-tilefilter"
              className="h-9 inline-flex items-center gap-1.5 rounded-full bg-[#0a0a0a] px-3 text-[12.5px] font-medium text-white">
              {TILE_FILTER_LABEL[filter]} <X className="w-3.5 h-3.5 opacity-70" />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1 border-l border-[#f1f0ee] pl-2">
          {finnLinked.length > 0 && (
            <button type="button" onClick={fetchAllSnapshots} disabled={!!snapBusy}
              data-testid="props-snapshot-all"
              title="Henter annonsetittel og annonsert leie fra FINN for boliger som har en koblet annonse. Overstyrer aldri plattformens leie."
              className="h-9 px-3 rounded-full text-[12.5px] font-medium text-[#1d5bbf] hover:bg-[#e8f1ff] transition-colors flex items-center gap-1.5 disabled:opacity-50">
              {snapBusy === '*' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Tag className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{snapBusy === '*' ? 'Henter annonsedata …' : `Annonsedata (${finnLinked.length})`}</span>
            </button>
          )}
          <button type="button" onClick={() => bulk(withImages.map((p) => p.id), true)} disabled={bulkBusy || !withImages.length}
            title={`Slår på synlighet for alle ${withImages.length} boliger som har bilder`}
            className="h-9 px-3 rounded-full text-[12.5px] font-medium text-[#1f7a4d] hover:bg-[#e9f7ef] transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <Eye className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Vis alle med bilder ({withImages.length})</span>
          </button>
          <button type="button" onClick={() => bulk(props.map((p) => p.id), false)} disabled={bulkBusy || !props.length}
            title="Skjuler alle boliger fra nettsiden"
            className="h-9 px-3 rounded-full text-[12.5px] font-medium text-[#a8a29a] hover:bg-[#fdecec] hover:text-[#c0392b] transition-colors flex items-center gap-1.5 disabled:opacity-50">
            <EyeOff className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Skjul alle</span>
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

      {/* RUTENETT
          Kortet ligger i PropertyCard: identitet → fakta → pris → handling, med
          FINN-detaljer og enhetsdata kollapset. Panelet åpner seg av seg selv
          når noe avviker, så et rolig kort betyr faktisk «alt i orden». */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((p) => (
          <PropertyCard
            key={p.id}
            p={p}
            onToggleVisible={toggle}
            toggling={togglingId}
            onSaveTitle={saveTitle}
            titleBusy={titleBusy}
            onSaveFinn={saveFinn}
            finnBusy={finnBusy}
            finnMsg={finnMsg}
            onFetchSnapshot={fetchSnapshot}
            snapBusy={snapBusy}
            onEdit={() => setEditing(p)}
          />
        ))}
      </div>

      {props.length > 0 && !filtered.length && (
        <p className="text-center text-[13px] text-[#999] py-10">Ingen boliger i dette filteret.</p>
      )}

      {editing && (
        <PropertyEditor
          property={editing}
          apiKey={apiKey}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await load(); }}
        />
      )}
    </div>
  );
}
