'use client';

// ---------------------------------------------------------------------------
// BOLIGKORT (admin)
//
// Kortet gjorde fem jobber samtidig bak fire skillelinjer: identitet, fakta,
// eier/leietaker, pris + synlighet, redaksjonelle overstyringer og et helt
// FINN-panel med egen snapshot-boks. Resultatet var 20 linjer 10-piksels tekst
// i fem farger per kort.
//
// Nå: identitet → fakta → pris → handling. Alt annet er kollapset, og åpnes
// AUTOMATISK når noe faktisk krever oppmerksomhet (ubekreftet FINN-kilde,
// prisavvik, tittel som ikke matcher adressen, utgått annonse). Rolig når alt
// er i orden, tydelig når det ikke er.
// ---------------------------------------------------------------------------
import React, { useState } from 'react';
import {
  Loader2, Eye, EyeOff, MapPin, BedDouble, Ruler, ImageOff, ExternalLink,
  Link2, Download, PenLine, Tag, Pencil, ChevronDown, Info, AlertTriangle,
} from 'lucide-react';
import { titleCandidates, rentInfo, finnMatchHint, TITLE_SOURCE, TITLE_MAX } from '@/lib/listing-title';
import { exactRentAmount } from '@/lib/listings';
import { editorialSummary } from '@/lib/property-editorial';

const TITLE_SRC_CLS = {
  redigert: 'bg-[#f0ebff] text-[#6b4fd8]',
  finn: 'bg-[#e8f1ff] text-[#1d5bbf]',
  finn_full: 'bg-[#e8f1ff] text-[#1d5bbf]',
  plattform: 'bg-[#f5f5f4] text-[#8a8580]',
  avledet: 'bg-[#f5f4f2] text-[#a8a29a]',
};
const MODEL_LABEL = { langtid: 'Langtidsutleie', korttid: 'Korttidsutleie', hybrid: 'Hybridutleie' };
const STATUS_LABEL = { active: 'Ledig', rented: 'Utleid', paused: 'Pauset' };
const UNIT_STATUS_LABEL = { ledig: 'Ledig', utleid: 'Utleid', under_signering: 'Under signering' };
const STATUS_CLS = {
  active: 'bg-[#e9f7ef] text-[#1f7a4d]',
  rented: 'bg-[#f0ebff] text-[#6b4fd8]',
  paused: 'bg-[#f5f5f4] text-[#888]',
};

const fmtTime = (iso) => (iso ? new Date(iso).toLocaleString('nb-NO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

// ÉN kilde-chip på prisen, ikke fire. Rekkefølgen er alvorlighetsgrad:
// kan-ikke-publiseres → ubekreftet kilde → vår egen pris → annonsert leie.
function rentChipOf(p) {
  if (p.monthlyRentBand && exactRentAmount(p.monthlyRentBand) <= 0) {
    return { l: 'Bare intervall', cls: 'bg-[#fdeaea] text-[#b3261e]', t: 'Plattformen sender bare et prisintervall, ikke et beløp. Vi annonserer ikke en pris vi ikke har — skriv inn månedsleien under «Rediger boligdata».' };
  }
  if (p.rentBandSource === 'finn') {
    return { l: 'Fra FINN', cls: 'bg-[#e8f1ff] text-[#1d5bbf]', t: 'Prisen er hentet fra FINN fordi utleiemodulen ikke har noen leie — ikke bekreftet i plattformen, og sperret for publisering.' };
  }
  if (p.rentBandSource === 'redaksjonell') {
    return { l: 'DigiHome-pris', cls: 'bg-[#f0ebff] text-[#6b4fd8]', t: 'Månedsleie satt av DigiHome fordi utleiemodulen mangler beløpet. Teller aldri i nøkkeltall, og overstyres straks plattformen sender en pris.' };
  }
  if (p.rentIsEstimate && p.rentBandSource === 'plattform-estimat') {
    return { l: 'Annonsert', cls: 'bg-[#f5f5f4] text-[#8a8580]', t: 'Annonsert leie på en ledig enhet, ikke en signert kontraktsleie — teller ikke som inntekt.' };
  }
  return null;
}

export default function PropertyCard({
  p, onToggleVisible, toggling,
  onSaveTitle, titleBusy,
  onSaveFinn, finnBusy, finnMsg,
  onFetchSnapshot, snapBusy,
  onEdit,
}) {
  const rent = rentInfo(p);
  const matchHint = finnMatchHint(p);
  const finnUnverified = p.finnSource === 'plattform' && p.finnStatus !== 'aktiv';
  // ÉN linje som sier hva som er galt — ikke et helt panell som spretter opp.
  // Rekkefølgen er alvorlighetsgrad: feil kilde > død annonse > prisavvik >
  // tittel som ikke kan knyttes til adressen.
  const finnAlert = !p.finnUrl ? null
    : finnUnverified ? 'Ubekreftet kilde — kan peke på feil bolig'
      : p.finnSnapshotStatus === 'utgatt' ? 'Annonsen svarte ikke sist vi sjekket'
        : rent.deviates ? `Annonsert leie avviker ${rent.deviationPct > 0 ? '+' : ''}${rent.deviationPct} % fra plattformen`
          : (p.finnTitle && !matchHint) ? 'Annonsetittelen nevner ikke denne adressen'
            : null;

  const [titleEdit, setTitleEdit] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [finnEdit, setFinnEdit] = useState(false);
  const [finnInput, setFinnInput] = useState('');
  const [showFinn, setShowFinn] = useState(false);
  const [showUnit, setShowUnit] = useState(false);

  const imgs = p.images || [];
  const chip = rentChipOf(p);
  const edited = p.editorialFields || [];
  const hasUnitInfo = p.hasUnitData && (p.ownerName || p.tenantName || p.floor != null || p.unitStatus);

  // Én advarsel på bildet, ikke tre. Duplikat er alvorligst.
  const imgWarn = p.duplicate
    ? { l: 'Mulig duplikat', cls: 'bg-[#fdecec] text-[#c0392b]', t: `Identisk med ${(p.duplicateGroupSize || 2) - 1} annen bolig i samme gate — rydd i DigiHome-appen` }
    : p.incomplete
      ? { l: 'Mangler data', cls: 'bg-[#fff8e6] text-[#8a6500]', t: 'Mangler bilder, areal og soverom fra plattformen' }
      : p.imageSource === 'finn'
        ? { l: 'Bilder fra FINN', cls: 'bg-[#e8f1ff] text-[#1d5bbf]', t: 'Bildene er hentet fra utleierens FINN-annonse fordi plattformen ikke sendte noen' }
        : null;

  const openTitle = () => { setTitleInput(p.listingTitle || p.title || ''); setTitleEdit(true); };
  const saveTitle = (v) => { onSaveTitle(p, v); setTitleEdit(false); };

  return (
    <article className={`rounded-2xl bg-white shadow-[0_2px_14px_rgba(0,0,0,0.05)] overflow-hidden transition-shadow hover:shadow-[0_4px_20px_rgba(0,0,0,0.07)] ${p.visible ? 'ring-2 ring-[#7fc79e]/50' : ''}`}>
      {/* BILDE */}
      <div className="relative aspect-[16/10] bg-[#f5f4f2]">
        {imgs.length ? (
          <img src={imgs[0]} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#ccc]">
            <ImageOff className="w-6 h-6 mb-1.5" />
            <span className="text-[11.5px]">Ingen bilder</span>
          </div>
        )}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 pr-16">
          <span className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold ${STATUS_CLS[p.status] || STATUS_CLS.paused}`}>{STATUS_LABEL[p.status] || p.status}</span>
          {p.model && <span className="rounded-lg bg-white/90 px-2 py-1 text-[10.5px] font-semibold text-[#555] backdrop-blur-sm">{MODEL_LABEL[p.model] || p.model}</span>}
          {imgWarn && <span className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold ${imgWarn.cls}`} title={imgWarn.t}>{imgWarn.l}</span>}
        </div>
        {imgs.length > 1 && (
          <span className="absolute bottom-2.5 right-2.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10.5px] text-white">{imgs.length} bilder</span>
        )}
      </div>

      <div className="p-4">
        {/* TITTEL */}
        {titleEdit ? (
          <div className="space-y-2">
            <textarea
              autoFocus rows={2} value={titleInput}
              onChange={(e) => setTitleInput(e.target.value.replace(/\s+/g, ' ').slice(0, 160))}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveTitle(titleInput); } if (e.key === 'Escape') setTitleEdit(false); }}
              placeholder="Skriv annonsetittelen slik den skal stå i nyhetsbrevet …"
              data-testid={`props-title-input-${p.id}`}
              className="w-full resize-none rounded-lg border border-[#e8e4de] px-3 py-2 text-[13px] leading-snug outline-none focus:border-[#9a6ee8]"
            />
            <div className="flex flex-wrap gap-1">
              {titleCandidates(p).map((c) => (
                <button key={`${c.source}-${c.title}`} type="button" onClick={() => setTitleInput(c.title)}
                  data-testid={`props-title-cand-${p.id}-${c.source}`}
                  title={`${TITLE_SOURCE[c.source]?.help || ''}\n\n${c.title}`}
                  className={`rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition-colors ${c.title === titleInput ? 'border-[#0a0a0a] bg-[#0a0a0a] text-white' : 'border-[#e8e4de] text-[#888] hover:border-[#9a6ee8] hover:text-[#0a0a0a]'}`}>
                  {TITLE_SOURCE[c.source]?.short || c.source}{c.generic ? ' (generisk)' : ''}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => saveTitle(titleInput)} disabled={titleBusy === p.id}
                data-testid={`props-title-save-${p.id}`}
                className="h-8 px-3 rounded-full bg-[#0a0a0a] text-white text-[12px] font-semibold flex items-center gap-1.5 disabled:opacity-50">
                {titleBusy === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null} Lagre tittel
              </button>
              {p.editorialTitle ? (
                <button type="button" onClick={() => saveTitle('')} disabled={titleBusy === p.id}
                  title="Fjern den redigerte tittelen og la kildehierarkiet bestemme igjen"
                  className="h-8 px-3 rounded-full bg-[#f5f5f4] text-[#888] text-[12px] font-semibold">Nullstill</button>
              ) : null}
              <button type="button" onClick={() => setTitleEdit(false)}
                className="h-8 px-3 text-[12px] font-semibold text-[#aaa] hover:text-[#555]">Avbryt</button>
              <span className={`ml-auto text-[10.5px] tabular-nums ${titleInput.length > TITLE_MAX ? 'text-[#c08a2e]' : 'text-[#c4bdb4]'}`}>{titleInput.length}/{TITLE_MAX}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <h3 className="min-w-0 flex-1 text-[14.5px] font-semibold leading-snug text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }} data-testid={`props-title-${p.id}`}>
              {p.listingTitle || p.title || 'Bolig'}
            </h3>
            <button type="button" onClick={openTitle}
              data-testid={`props-title-edit-${p.id}`} title="Rediger annonsetittelen"
              className="shrink-0 rounded-full p-1.5 text-[#c4bdb4] hover:bg-[#f5f5f4] hover:text-[#0a0a0a]"><PenLine className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ADRESSE + FAKTA */}
        <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-[#8a8580]">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d6d2cc]" />
          <span className="min-w-0">
            {p.fullAddress || [p.area, p.city || p.district].filter(Boolean).join(', ') || 'Område ukjent'}
            {p.floor != null ? <span className="text-[#b8b2aa]"> · {p.floor}. etg</span> : null}
          </span>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[12px] text-[#8a8580]">
          {p.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-[#d6d2cc]" />{p.bedrooms} sov</span>}
          {p.sqm != null && <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5 text-[#d6d2cc]" />{p.sqm} m²</span>}
          {p.district && <span className="text-[#b8b2aa]">{p.district}</span>}
          <span className={`ml-auto inline-flex items-center rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${TITLE_SRC_CLS[p.listingTitleSource] || TITLE_SRC_CLS.avledet}`}
            title={`Tittelkilde: ${TITLE_SOURCE[p.listingTitleSource]?.help || 'ukjent'}`}>
            {TITLE_SOURCE[p.listingTitleSource]?.short || 'Ukjent'}
          </span>
        </div>

        {/* PRIS + SYNLIGHET */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-[#f1f0ee] pt-3.5">
          <span className="flex min-w-0 items-center gap-1.5">
            {p.monthlyRentBand || p.rentAmount != null ? (
              <span className="truncate text-[15px] font-bold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
                {p.monthlyRentBand || `${Number(p.rentAmount).toLocaleString('nb-NO')} kr/mnd`}
              </span>
            ) : (
              <span className="text-[13px] text-[#b8b2aa]" title="Verken utleiemodulen eller «Rediger boligdata» har en månedsleie. Boligen kan ikke publiseres uten pris.">Ingen pris</span>
            )}
            {chip && (
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${chip.cls}`} title={chip.t}>{chip.l}</span>
            )}
          </span>
          <button type="button" onClick={() => onToggleVisible(p)} disabled={toggling === p.id}
            aria-label={p.visible ? 'Skjul fra nettsiden' : 'Vis på nettsiden'}
            className={`flex shrink-0 items-center gap-1.5 h-8 px-3 rounded-full text-[12px] font-semibold transition-colors ${p.visible ? 'bg-[#e9f7ef] text-[#1f7a4d] hover:bg-[#dcf0e5]' : 'bg-[#f5f5f4] text-[#888] hover:bg-[#ececea]'}`}>
            {toggling === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : p.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            {p.visible ? 'Synlig' : 'Skjult'}
          </button>
        </div>

        {/* HANDLINGER */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-[#f1f0ee] pt-3">
          <button type="button" onClick={onEdit} data-testid={`props-edit-${p.id}`}
            title="Sett pris, areal, soverom, annonsetekst m.m. selv — sporbart og reverserbart"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-[#f5f5f4] px-3 text-[12px] font-semibold text-[#555] hover:bg-[#ebebe9]">
            <Pencil className="h-3.5 w-3.5" /> Rediger
          </button>

          {edited.length > 0 && (
            <span data-testid={`props-edited-${p.id}`} title={`Redigert: ${editorialSummary(edited)}`}
              className="inline-flex h-8 items-center gap-1 rounded-full bg-[#f8f5ff] px-2.5 text-[11px] font-bold uppercase tracking-wide text-[#6b4fd8]">
              Redigert <span className="tabular-nums opacity-70">{edited.length}</span>
            </span>
          )}

          {p.finnUrl ? (
            <div className="ml-auto inline-flex items-center rounded-full bg-[#f5f5f4]">
              <a href={p.finnUrl} target="_blank" rel="noreferrer" title={`Åpne annonsen på FINN${p.finnCode ? ` (${p.finnCode})` : ''}`}
                className="inline-flex h-8 items-center gap-1.5 pl-3 pr-2 text-[12px] font-semibold text-[#1d5bbf] hover:text-[#0a3f9e]">
                <Link2 className="h-3.5 w-3.5" /> FINN <ExternalLink className="h-3 w-3 opacity-60" />
              </a>
              <button type="button" onClick={() => setShowFinn((v) => !v)} data-testid={`props-finn-toggle-${p.id}`}
                title={finnAlert || 'Annonsedata og kontroll'}
                className="inline-flex h-8 items-center gap-1 border-l border-[#e6e3de] pl-2 pr-2.5 text-[#999] hover:text-[#0a0a0a]">
                {finnAlert && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#e0a200]" />}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFinn ? '' : '-rotate-90'}`} />
              </button>
            </div>
          ) : finnEdit ? null : (
            <button type="button" onClick={() => { setFinnEdit(true); setFinnInput(''); }}
              data-testid={`props-finn-open-${p.id}`}
              className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] font-medium text-[#8a8580] transition-colors hover:bg-[#e8f1ff] hover:text-[#1d5bbf]">
              <Link2 className="h-3.5 w-3.5" /> {imgs.length ? 'Koble FINN' : 'Hent fra FINN'}
            </button>
          )}

          {hasUnitInfo && (
            <button type="button" onClick={() => setShowUnit((v) => !v)} data-testid={`props-unit-toggle-${p.id}`}
              title="Eier, leietaker og enhetsdata — bare synlig bak innlogging"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors ${showUnit ? 'bg-[#f0eeea] text-[#0a0a0a]' : 'text-[#c4bdb4] hover:bg-[#f5f4f2] hover:text-[#0a0a0a]'}`}>
              <Info className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* ÉN varsellinje når FINN-koblingen har noe å si — resten ligger bak pilen */}
        {finnAlert && !showFinn && (
          <button type="button" onClick={() => setShowFinn(true)} data-testid={`props-finn-alert-${p.id}`}
            className="mt-2 flex w-full items-center gap-1.5 rounded-lg bg-[#fffaef] px-2.5 py-1.5 text-left text-[11px] leading-snug text-[#a15c00] hover:bg-[#fff5e0]">
            <AlertTriangle className="h-3 w-3 shrink-0" /> {finnAlert}
          </button>
        )}

        {/* ENHETSDATA — bak innlogging, kollapset */}
        {showUnit && hasUnitInfo && (
          <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-xl bg-[#faf9f7] px-3 py-2.5 text-[11.5px]" data-testid={`props-unit-${p.id}`}>
            {p.ownerName ? (<><dt className="text-[#b8b2aa]">Eier</dt><dd className="truncate text-[#66625c]">{p.ownerName}</dd></>) : null}
            <dt className="text-[#b8b2aa]">Leietaker</dt><dd className="truncate text-[#66625c]">{p.tenantName || 'Ingen aktiv leietaker'}</dd>
            {p.unitStatus ? (<><dt className="text-[#b8b2aa]">Enhet</dt><dd className="text-[#66625c]">{UNIT_STATUS_LABEL[p.unitStatus] || p.unitStatus}</dd></>) : null}
            {edited.length > 0 ? (<><dt className="text-[#b8b2aa]">Redigert</dt><dd className="text-[#6b4fd8]">{editorialSummary(edited)}</dd></>) : null}
          </dl>
        )}

        {/* FINN-INNTASTING */}
        {finnEdit && !p.finnUrl && (
          <div className="mt-2.5 space-y-2">
            <input
              autoFocus value={finnInput} onChange={(e) => setFinnInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && finnInput.trim()) { onSaveFinn(p, finnInput.trim()); setFinnEdit(false); } if (e.key === 'Escape') setFinnEdit(false); }}
              placeholder="https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
              data-testid={`props-finn-input-${p.id}`}
              className="h-9 w-full rounded-lg border border-[#e8e4de] px-3 text-[11.5px] outline-none focus:border-[#9a6ee8]"
            />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { onSaveFinn(p, finnInput.trim()); setFinnEdit(false); }} disabled={finnBusy === p.id || !finnInput.trim()}
                data-testid={`props-finn-fetch-${p.id}`}
                className="flex h-8 items-center gap-1.5 rounded-full bg-[#0a0a0a] px-3 text-[12px] font-semibold text-white disabled:opacity-50">
                {finnBusy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {finnBusy === p.id ? 'Henter …' : 'Hent bilder og pris'}
              </button>
              <button type="button" onClick={() => { setFinnEdit(false); setFinnInput(''); }}
                className="h-8 rounded-full bg-[#f5f5f4] px-3 text-[12px] font-semibold text-[#888]">Avbryt</button>
            </div>
          </div>
        )}

        {/* FINN-DETALJER — åpnes av seg selv når noe avviker */}
        {p.finnUrl && showFinn && (
          <div className="mt-2.5 space-y-1.5 rounded-xl bg-[#faf9f7] px-3 py-2.5" data-testid={`props-finn-detail-${p.id}`}>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {p.finnCode && <span className="text-[11px] font-semibold text-[#66625c]">Annonse {p.finnCode}</span>}
              {finnUnverified ? (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#fff4e5] text-[#a15c00]"
                  title="Lenken kommer fra plattformens enhetseksport, som i dag også returnerer FINN-koder utenfor utleiemodulen">Ubekreftet</span>
              ) : p.finnSource === 'manuell' ? (
                <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-[#e9f7ef] text-[#1f7a4d]" title="Du har limt inn denne lenken selv, og vi verifiserte den mot FINN">Verifisert</span>
              ) : null}
              <button type="button"
                onClick={() => (p.finnSource === 'plattform' ? (setFinnEdit(true), setFinnInput('')) : onSaveFinn(p, ''))}
                disabled={finnBusy === p.id}
                title={p.finnSource === 'plattform' ? 'Lim inn riktig lenke fra utleiemodulen — den overstyrer plattformens' : 'Fjern koblingen og all data hentet fra FINN'}
                className="ml-auto text-[11px] font-semibold text-[#a8a29a] hover:text-[#c0392b] disabled:opacity-50">
                {finnBusy === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : (p.finnSource === 'plattform' ? 'Overstyr' : 'Fjern kobling')}
              </button>
            </div>

            {finnUnverified && (
              <p className="text-[11px] leading-relaxed text-[#a15c00]">
                Vises ikke til leietakere. Koden kommer fra registreringen, ikke fra utleiemodulens aktive annonse — den kan peke på feil bolig eller være utgått. Lim inn riktig lenke for å bruke den.
              </p>
            )}

            {(p.enrichedFields || []).length > 0 && (
              <p className="text-[11px] text-[#1f7a4d]">Hentet fra FINN: {(p.enrichedFields || []).join(', ')}</p>
            )}

            {p.finnTitle ? (
              <>
                <p className="text-[11px] leading-relaxed text-[#66625c]"><span className="text-[#b8b2aa]">Annonsetittel:</span> «{p.finnTitle}»</p>
                {rent.finnAmount ? (
                  <p className={`text-[10.5px] leading-relaxed ${rent.deviates ? 'text-[#a15c00]' : 'text-[#8a8580]'}`} data-testid={`props-rent-dev-${p.id}`}>
                    Annonsert leie {Number(rent.finnAmount).toLocaleString('nb-NO')} kr/mnd
                    {rent.platformAmount ? ` · plattformen har ${Number(rent.platformAmount).toLocaleString('nb-NO')} kr/mnd` : ' · plattformen har ingen leie registrert'}
                    {rent.deviationPct != null ? ` (${rent.deviationPct > 0 ? '+' : ''}${rent.deviationPct} %)` : ''}
                    {rent.deviates ? ' — plattformen gjelder. Rett i utleiemodulen hvis annonsen er riktig.' : ''}
                  </p>
                ) : (
                  <p className="text-[10.5px] text-[#b8b2aa]">Ingen månedsleie oppgitt i annonsen.</p>
                )}
                {matchHint ? (
                  <p className="text-[10.5px] leading-relaxed text-[#1f7a4d]" data-testid={`props-finn-match-${p.id}`}>
                    Tittelen nevner «{matchHint.word}» — stemmer med adressen, så lenken peker sannsynligvis riktig.
                  </p>
                ) : (
                  <p className="text-[10.5px] leading-relaxed text-[#a15c00]" data-testid={`props-finn-match-${p.id}`}>
                    Tittelen nevner ikke gate, bydel eller poststed for denne boligen — kontroller at lenken peker på riktig enhet.
                  </p>
                )}
                <p className="text-[10px] text-[#c4bdb4]">Hentet {fmtTime(p.finnSnapshotAt)}{p.finnSnapshotStatus === 'utgatt' ? ' · annonsen svarte ikke' : ''}</p>
              </>
            ) : (
              <p className="text-[11px] leading-relaxed text-[#a8a29a]">Annonsedata er ikke hentet ennå. Hent tittelen for å bruke den i nyhetsbrevet i stedet for plattformens generiske tittel.</p>
            )}

            <button type="button" onClick={() => onFetchSnapshot(p)} disabled={snapBusy === p.id || snapBusy === '*'}
              data-testid={`props-snapshot-${p.id}`}
              className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#1d5bbf] hover:underline disabled:opacity-50">
              {snapBusy === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Tag className="h-3 w-3" />}
              {snapBusy === p.id ? 'Henter …' : p.finnTitle ? 'Hent på nytt' : 'Hent annonsedata'}
            </button>
          </div>
        )}

        {finnMsg && finnMsg.id === p.id && (
          <p className={`mt-2 text-[11px] leading-relaxed ${finnMsg.ok ? 'text-[#1f7a4d]' : 'text-[#c0392b]'}`}>{finnMsg.text}</p>
        )}
      </div>
    </article>
  );
}
