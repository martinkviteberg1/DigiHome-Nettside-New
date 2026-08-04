'use client';

// ---------------------------------------------------------------------------
// REDIGER BOLIGDATA
//
// Plattformens utleiemodul er den autoritative kilden, men den er ufullstendig:
// bare 4 av 13 ledige enheter har pris, og ingen har annonsetekst. Denne
// modalen lar forvalteren fylle hullene selv — sporbart og reverserbart.
//
// TRE UX-VALG SOM BÆRER HELE POENGET:
//  1. Plattformens verdi står ALLTID synlig under feltet, så du ser hva du
//     overstyrer. Uten det blir en overstyring et blindt overskriv.
//  2. FINN er et FORSLAG, aldri en automatisk import. Du ser tallet fra
//     annonsen og trykker «bruk» — da er det du som har bekreftet det, og alt
//     vi publiserer er DigiHomes egen opplysning.
//  3. Porten vises live nederst. Du skal se «kan publiseres» slå om i samme
//     sekund du fyller inn det som mangler, ellers vet du ikke om du er ferdig.
// ---------------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, Loader2, RotateCcw, Check, Download, AlertTriangle, Link2, Info } from 'lucide-react';
import { EDITORIAL_FIELDS } from '@/lib/property-editorial';
import { TYPE_LABEL, MODEL_LABEL, SCOPE_LABEL, GATE, listingGate, formatNoDate, exactRentAmount } from '@/lib/listings';
import DateField from './DateField';

const KR = (n) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

const GROUPS = [
  { title: 'Publisert innhold', keys: ['title', 'description'] },
  { title: 'Fakta om boligen', keys: ['rentAmount', 'sqm', 'bedrooms', 'rooms', 'type', 'model', 'availableFrom'] },
  // Hele enheten, rom i bofellesskap, eller begge — styrer hva interessenten
  // ser og kan krysse av for. Plattformen har ikke feltet.
  { title: 'Utleieenhet', keys: ['rentalScope', 'roomsVacant', 'roomsTotal'] },
  { title: 'Sted', keys: ['area', 'district'] },
  { title: 'Rettigheter', keys: ['imageRights'] },
];

const FIELD = EDITORIAL_FIELDS.reduce((a, f) => { a[f.key] = f; return a; }, {});

const optionLabel = (key, v) => {
  if (key === 'type') return TYPE_LABEL[v] || v;
  if (key === 'model') return MODEL_LABEL[v] || v;
  if (key === 'rentalScope') return SCOPE_LABEL[v] || v;
  // Datoer vises alltid leselig norsk («1. oktober 2026»), aldri som rå ISO.
  if (key === 'availableFrom') return formatNoDate(v) || v;
  return v;
};

// Plattformens egen verdi for feltet — det du overstyrer.
function platformValue(p, key) {
  const pv = p?.platformValues || {};
  // Utleiemodulens eget beløp er det mest presise. Bare hvis det mangler viser
  // vi pristeksten fra boligeksporten — og da med en tydelig merknad, fordi et
  // intervall ikke kan annonseres som pris.
  if (key === 'rentAmount') {
    if (pv.rentAmount) return `${KR(pv.rentAmount)} kr/mnd`;
    if (!pv.monthlyRentBand) return null;
    return exactRentAmount(pv.monthlyRentBand) > 0
      ? pv.monthlyRentBand
      : `${pv.monthlyRentBand} — bare intervall, kan ikke publiseres`;
  }
  if (key === 'title') return p?.title || null;
  if (key === 'description') return null;      // plattformen sender aldri annonsetekst
  if (key === 'imageRights') return null;
  const v = pv[key];
  if (v === null || v === undefined || v === '') return null;
  return optionLabel(key, v);
}

export default function PropertyEditor({ property, apiKey, onSaved, onClose }) {
  const q = `key=${encodeURIComponent(apiKey)}`;
  const [vals, setVals] = useState({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [suggest, setSuggest] = useState(null);
  const [sugBusy, setSugBusy] = useState(false);
  const [sugErr, setSugErr] = useState(null);
  const [finnUrl, setFinnUrl] = useState('');

  useEffect(() => {
    const ev = property?.editorialValues || {};
    const next = {};
    for (const f of EDITORIAL_FIELDS) {
      next[f.key] = ev[f.key] === undefined || ev[f.key] === null ? (f.kind === 'bool' ? false : '') : ev[f.key];
    }
    setVals(next);
    setSuggest(null); setSugErr(null); setErr(null);
    setFinnUrl(property?.finnUrl || '');
  }, [property?.id, property?.editorialValues]);

  // Portstatus regnes ut live på det du har skrevet, ikke på det som er lagret.
  const preview = useMemo(() => {
    if (!property) return null;
    const p = { ...property };
    for (const f of EDITORIAL_FIELDS) {
      const v = vals[f.key];
      if (v === '' || v === null || v === undefined || v === false) continue;
      if (f.key === 'rentAmount') { p.monthlyRentBand = `${KR(v)} kr/mnd`; p.rentBandSource = 'redaksjonell'; continue; }
      if (f.key === 'imageRights') { p.imageRights = true; continue; }
      if (f.target) p[f.target] = v;
    }
    return listingGate(p);
  }, [property, vals]);

  const set = (k, v) => setVals((prev) => ({ ...prev, [k]: v }));

  const fetchSuggest = useCallback(async () => {
    setSugBusy(true); setSugErr(null);
    try {
      const r = await fetch(`/api/admin/properties/finn-suggest?${q}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: property.id, url: finnUrl || undefined }),
      });
      const j = await r.json();
      if (!j.ok) { setSugErr(j.error || 'Kunne ikke hente annonsen'); setSuggest(null); }
      else setSuggest(j);
    } catch (e) { setSugErr('Kunne ikke hente annonsen'); }
    setSugBusy(false);
  }, [q, property?.id, finnUrl]);

  const save = async (resetAll = false) => {
    setSaving(true); setErr(null);
    try {
      const r = await fetch(`/api/admin/properties/fields?${q}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetAll ? { id: property.id, resetAll: true } : { id: property.id, fields: vals }),
      });
      const j = await r.json();
      if (!j.ok) { setErr(j.error || 'Kunne ikke lagre'); setSaving(false); return; }
      if (onSaved) onSaved(j.property, j);
      setSaving(false);
      if (onClose) onClose();
    } catch (e) { setErr('Kunne ikke lagre'); setSaving(false); }
  };

  if (!property) return null;
  const overridden = EDITORIAL_FIELDS.filter((f) => {
    const v = vals[f.key];
    return !(v === '' || v === null || v === undefined || v === false);
  }).map((f) => f.key);

  // «Ikke ledig» og «skjult» hører ikke hjemme i mangellista — de fikses ikke
  // ved å redigere data, og ville bare gjort statusen forvirrende.
  const blocking = (preview?.blocking || []).filter((c) => c !== 'skjult' && c !== 'ikke_ledig');

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/45 p-3 sm:p-6" data-testid="property-editor">
      <div className="w-full max-w-[720px] rounded-2xl bg-white shadow-2xl">
        {/* Topp */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 rounded-t-2xl border-b border-black/[0.06] bg-white px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-[#0a0a0a]" style={{ fontFamily: 'var(--font-heading)' }}>
              Rediger boligdata
            </h3>
            <p className="mt-0.5 truncate text-[12px] text-[#8a8580]">
              {property.area || property.title} {property.district ? `· ${property.district}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} data-testid="editor-close"
            className="shrink-0 rounded-full p-1.5 text-[#8a8580] hover:bg-[#f5f5f4] hover:text-[#0a0a0a]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-4 sm:px-5">
          {/* FINN som forslagskilde */}
          <div className="rounded-xl bg-[#f8f7f5] p-3">
            <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">
              <Link2 className="h-3 w-3" /> Hent forslag fra FINN
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={finnUrl} onChange={(e) => setFinnUrl(e.target.value)} data-testid="editor-finn-url"
                placeholder="https://www.finn.no/realestate/lettings/ad.html?finnkode=…"
                className="h-9 flex-1 rounded-lg bg-white px-3 text-[12.5px] text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#c4bfb8] focus:ring-2 focus:ring-[#7c3aed]" />
              <button type="button" onClick={fetchSuggest} disabled={sugBusy || !finnUrl} data-testid="editor-finn-fetch"
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#0a0a0a] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#242424] disabled:opacity-50">
                {sugBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />} Hent forslag
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-[#a8a29a]">
              {sugErr ? <span className="font-semibold text-red-600">{sugErr}</span>
                : suggest ? <span className="font-semibold text-emerald-700">Forslag hentet — trykk «bruk» på feltene du vil overta. Ingenting lagres før du trykker Lagre.</span>
                : <>Lim inn lenken hvis plattformen ikke har den. Forslagene lagres ikke automatisk — du bekrefter hvert felt selv.</>}
            </p>
          </div>

          {/* Felt */}
          {GROUPS.map((g) => (
            <div key={g.title} className="mt-4">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#a8a29a]">{g.title}</p>
              <div className="space-y-3">
                {g.keys.map((key) => {
                  const f = FIELD[key];
                  if (!f) return null;
                  // Romtelling er bare meningsfull når rom leies ut enkeltvis.
                  // Leies HELE enheten ut, skjules feltene — et tall som ikke
                  // gjelder er verre enn et tomt felt, og serveren nullstiller
                  // dem likevel ved lagring.
                  const scopeNow = vals.rentalScope || property.rentalScope || 'hele';
                  if ((key === 'roomsVacant' || key === 'roomsTotal') && scopeNow === 'hele') return null;
                  const v = vals[key];
                  const isSet = !(v === '' || v === null || v === undefined || v === false);
                  const pv = platformValue(property, key);
                  const sv = suggest?.suggest ? suggest.suggest[key] : null;

                  return (
                    <div key={key} className="rounded-xl bg-white p-3 ring-1 ring-black/[0.06]">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <label htmlFor={`ed-${key}`} className="text-[12.5px] font-semibold text-[#0a0a0a]">{f.label}</label>
                        {f.unit && <span className="text-[11px] text-[#a8a29a]">{f.unit}</span>}
                        {isSet && (
                          <span className="rounded-full bg-[#f0ebff] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6b4fd8]">Redigert</span>
                        )}
                        {isSet && (
                          <button type="button" onClick={() => set(key, f.kind === 'bool' ? false : '')} data-testid={`editor-reset-${key}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8d867d] hover:text-[#0a0a0a]">
                            <RotateCcw className="h-3 w-3" /> Nullstill
                          </button>
                        )}
                      </div>

                      {f.kind === 'bool' ? (
                        <label className="flex cursor-pointer items-start gap-2">
                          <input id={`ed-${key}`} type="checkbox" checked={v === true} onChange={(e) => set(key, e.target.checked)}
                            data-testid={`editor-field-${key}`} className="mt-0.5 h-4 w-4 accent-[#7c3aed]" />
                          <span className="text-[12px] leading-relaxed text-[#66625c]">{f.hint}</span>
                        </label>
                      ) : f.kind === 'date' ? (
                        <DateField value={v} onChange={(nv) => set(key, nv)} testId={`editor-field-${key}`} />
                      ) : f.kind === 'longtext' ? (
                        <textarea id={`ed-${key}`} rows={5} value={v} onChange={(e) => set(key, e.target.value)} maxLength={f.max}
                          data-testid={`editor-field-${key}`} placeholder="Skriv annonseteksten som skal vises på boligsiden …"
                          className="w-full rounded-lg bg-white px-3 py-2 text-[13px] leading-relaxed text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#c4bfb8] focus:ring-2 focus:ring-[#7c3aed]" />
                      ) : f.kind === 'enum' ? (
                        <select id={`ed-${key}`} value={v} onChange={(e) => set(key, e.target.value)} data-testid={`editor-field-${key}`}
                          className="h-9 w-full rounded-lg bg-white px-2.5 text-[13px] text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none focus:ring-2 focus:ring-[#7c3aed]">
                          <option value="">— bruk plattformens verdi —</option>
                          {f.options.map((o) => <option key={o} value={o}>{optionLabel(key, o)}</option>)}
                        </select>
                      ) : (
                        <input id={`ed-${key}`} type={f.kind === 'int' ? 'number' : 'text'} value={v}
                          onChange={(e) => set(key, f.kind === 'int' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                          min={f.min} max={f.max} maxLength={f.max && f.kind !== 'int' ? f.max : undefined}
                          data-testid={`editor-field-${key}`}
                          placeholder={pv ? `Plattformen: ${pv}` : 'Ikke satt i plattformen'}
                          className="h-9 w-full rounded-lg bg-white px-3 text-[13px] text-[#1f1f1f] ring-1 ring-inset ring-black/[0.09] outline-none placeholder:text-[#c4bfb8] focus:ring-2 focus:ring-[#7c3aed]" />
                      )}

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        {pv && <span className="text-[#a8a29a]">Plattformen: <span className="text-[#66625c]">{pv}</span></span>}
                        {!pv && f.kind !== 'bool' && <span className="text-[#c8c2ba]">Plattformen har ingen verdi her</span>}
                        {sv !== null && sv !== undefined && sv !== '' && (
                          <button type="button" onClick={() => set(key, sv)} data-testid={`editor-use-finn-${key}`}
                            className="inline-flex items-center gap-1 rounded-full bg-[#e8f1ff] px-2 py-0.5 font-semibold text-[#1d5bbf] hover:bg-[#dbe9ff]">
                            FINN: {key === 'rentAmount' ? `${KR(sv)} kr` : String(optionLabel(key, sv)).slice(0, 46)} → bruk
                          </button>
                        )}
                      </div>
                      {f.hint && f.kind !== 'bool' && (
                        <p className="mt-1 inline-flex items-start gap-1 text-[11px] leading-relaxed text-[#b8b2aa]">
                          <Info className="mt-[1px] h-3 w-3 shrink-0" /> {f.hint}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bunn: portstatus + handlinger */}
        <div className="sticky bottom-0 rounded-b-2xl border-t border-black/[0.06] bg-white px-4 py-3 sm:px-5">
          <div className="mb-2.5 text-[12px]" data-testid="editor-gate">
            {preview?.contentReady ? (
              <p className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <Check className="h-3.5 w-3.5" /> Innholdet er komplett
                {preview.hidden && <span className="font-normal text-[#8a8580]">— slå på «Vis på nettsiden» for å publisere</span>}
              </p>
            ) : (
              <p className="inline-flex flex-wrap items-center gap-1.5 text-[#a67c00]">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="font-semibold">Mangler: {blocking.map((c) => GATE[c]?.label || c).join(' · ')}</span>
                <span className="text-[#b8b2aa]">— {GATE[blocking[0]]?.fix}</span>
              </p>
            )}
          </div>
          {err && <p className="mb-2 text-[12px] font-semibold text-red-600" data-testid="editor-error">{err}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => save(false)} disabled={saving} data-testid="editor-save"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-5 text-[13.5px] font-semibold text-white hover:bg-[#242424] disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Lagre
            </button>
            <button type="button" onClick={onClose} disabled={saving}
              className="inline-flex h-10 items-center rounded-full px-4 text-[13.5px] font-semibold text-[#66625c] hover:bg-[#f5f5f4]">
              Avbryt
            </button>
            <span className="flex-1" />
            {overridden.length > 0 && (
              <button type="button" onClick={() => save(true)} disabled={saving} data-testid="editor-reset-all"
                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold text-[#8d867d] hover:bg-[#f5f5f4] hover:text-[#0a0a0a]"
                title="Fjerner alle redaksjonelle overstyringer og slipper plattformens verdier gjennom igjen">
                <RotateCcw className="h-3.5 w-3.5" /> Nullstill alt ({overridden.length})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
