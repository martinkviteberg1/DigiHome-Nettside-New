'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, Check, Home, Info, Search, User, ShieldCheck, Building2 } from 'lucide-react';

type Owner = { navn: string; type: string; orgnr?: string };
export type RegistryResolved = {
  matrikkel_number?: string;
  bygningstype?: string;
  seksjonsnr?: string;
  andelsnr?: string;
  registry_owner_name?: string;
  registry_owner_type?: string;
  registry_orgnr?: string;
};

function matrikkelStr(m: any, snr?: string) {
  if (!m) return '';
  const base = `${m.kommunenr}-${m.gaardsnr}/${m.bruksnr}`;
  return snr && String(snr) !== '0' ? `${base}/${snr}` : base;
}

async function postJson(path: string, body: any) {
  const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, json: j };
}

// H-nummer (bolignr) → etasje. F.eks. "H0201" = Hovedetasje, 2. etasje, enhet 01.
function floorMeta(bolignr?: string): { order: number; label: string } | null {
  if (!bolignr) return null;
  const m = /^([HULK])?(\d{2})(\d{2})$/.exec(String(bolignr).trim().toUpperCase());
  if (!m) return null;
  const letter = m[1] || 'H';
  const fl = parseInt(m[2], 10);
  if (letter === 'K') return { order: -200 + fl, label: 'Kjeller' };
  if (letter === 'U') return { order: -100 + fl, label: 'Underetasje' };
  if (letter === 'L') return { order: 900 + fl, label: 'Loft' };
  return { order: fl, label: `${fl}. etasje` };
}

type Item = {
  key: string;            // verdi for valg (snr eller andelsnr)
  title: string;          // hovedtittel (Leilighet H0201 / Seksjon 10)
  badge?: string;         // liten merkelapp
  owner?: Owner | null;
  floor?: { order: number; label: string } | null;
};

/**
 * Verdensklasse eiendomsregister-velger (Infotorg EDR). Slår opp adressen,
 * viser en premium kort-liste over seksjoner/andeler med hjemmelshaver, og
 * lar eieren velge sin enhet. Ikke-blokkerende — skjemaet kan sendes uansett.
 */
export function PropertyRegistryPicker({
  query,
  matrikkel: matrikkelIn,
  addressLabel,
  onResolved,
  onState,
  renderSingle = true,
  preselectSeksjonsnr,
  preselectAndelsnr,
}: {
  query?: string;
  matrikkel?: { kommunenr: string; gaardsnr: string; bruksnr: string } | null;
  addressLabel?: string;
  onResolved: (d: RegistryResolved) => void;
  /** Rapporterer intern tilstand til forelder (for Finn-kort-integrasjon). */
  onState?: (s: string) => void;
  /** Når false skjules «laster»- og «enkelt-eiendom»-kortet (forelder viser det selv). */
  renderSingle?: boolean;
  /** Seksjonsnr hentet fra Finn-annonsen → auto-velg riktig seksjon. */
  preselectSeksjonsnr?: string;
  /** Andelsnr hentet fra Finn-annonsen → auto-velg riktig andel. */
  preselectAndelsnr?: string;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'sameie' | 'borettslag' | 'single' | 'notfound' | 'error' | 'disabled'>('idle');
  const [lookup, setLookup] = useState<any>(null);
  const [owners, setOwners] = useState<Record<string, Owner>>({});
  const [selected, setSelected] = useState<string>('');
  const [singleOwner, setSingleOwner] = useState<Owner | null>(null);
  const [search, setSearch] = useState('');
  const [autoMatched, setAutoMatched] = useState(false);   // auto-valgt fra Finn-seksjonsnr
  const [overrideOpen, setOverrideOpen] = useState(false);  // bruker vil velge manuelt likevel
  const autoPreRef = useRef(false);
  const reqId = useRef(0);

  const matKey = matrikkelIn && matrikkelIn.kommunenr && matrikkelIn.gaardsnr && matrikkelIn.bruksnr
    ? `${matrikkelIn.kommunenr}-${matrikkelIn.gaardsnr}-${matrikkelIn.bruksnr}` : '';
  const q = (query || '').trim();

  useEffect(() => {
    setSelected(''); setOwners({}); setLookup(null); setSingleOwner(null); setSearch('');
    setAutoMatched(false); setOverrideOpen(false); autoPreRef.current = false;
    onResolved({});
    if (!matKey && !q) { setState('idle'); return; }
    const my = ++reqId.current;
    setState('loading');
    (async () => {
      try {
        const lookupBody: any = matKey ? { matrikkel: matrikkelIn } : { address: q };
        const { status, json: j } = await postJson('/api/infotorg/lookup', lookupBody);
        if (my !== reqId.current) return;
        if (status === 503 || j.status === 'disabled') { setState('disabled'); return; }
        if (status === 429) { setState('error'); return; }
        if (status === 404 || j.status === 'not_found') { setState('notfound'); return; }
        if (j.status !== 'ok') { setState('error'); return; }
        setLookup(j);
        const base = matrikkelStr(j.matrikkel);

        if (j.borettslag && (j.borettslag.andeler || []).length) {
          setState('borettslag');
          onResolved({ matrikkel_number: base, bygningstype: j.building_type, registry_orgnr: j.borettslag.orgnr });
          const ans = j.borettslag.andeler.map((a: any) => String(a.andelsnr));
          const { json } = await postJson('/api/infotorg/andel-owners', { orgnr: j.borettslag.orgnr, andelsnr_list: ans });
          if (my === reqId.current && json.owners) setOwners(json.owners);
        } else if (j.edr?.seksjonert) {
          setState('sameie');
          onResolved({ matrikkel_number: base, bygningstype: j.building_type });
          const bolig = (j.edr.seksjoner || []).filter((s: any) => s.formaal_kode === 'B');
          const snrs = bolig.map((s: any) => String(s.snr));
          const { json } = await postJson('/api/infotorg/section-owners', {
            kommunenr: j.matrikkel.kommunenr, gaardsnr: j.matrikkel.gaardsnr, bruksnr: j.matrikkel.bruksnr, seksjonsnr_list: snrs,
          });
          if (my === reqId.current && json.owners) setOwners(json.owners);
        } else {
          setState('single');
          const { json } = await postJson('/api/infotorg/owner', {
            kommunenr: j.matrikkel.kommunenr, gaardsnr: j.matrikkel.gaardsnr, bruksnr: j.matrikkel.bruksnr, seksjonsnr: '0',
          });
          const ow = json && json.owner ? json.owner : null;
          if (my !== reqId.current) return;
          setSingleOwner(ow);
          onResolved({ matrikkel_number: base, bygningstype: j.building_type, registry_owner_name: ow?.navn, registry_owner_type: ow?.type });
        }
      } catch (e) {
        if (my === reqId.current) setState('error');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matKey, q]);

  // Rapporter tilstand oppover (for Finn-kort-integrasjon).
  useEffect(() => { try { onState?.(state); } catch (e) {} }, [state]); // eslint-disable-line react-hooks/exhaustive-deps


  const handleSelect = (val: string) => {
    setSelected(val);
  };

  // Hold onResolved i sync med valgt enhet + (sen) innlasting av hjemmelshaver.
  useEffect(() => {
    if (!selected || !lookup) return;
    const ow = owners[selected] || null;
    if (state === 'sameie') {
      onResolved({ matrikkel_number: matrikkelStr(lookup.matrikkel, selected), bygningstype: lookup.building_type, seksjonsnr: selected, registry_owner_name: ow?.navn, registry_owner_type: ow?.type });
    } else if (state === 'borettslag') {
      onResolved({ matrikkel_number: matrikkelStr(lookup.matrikkel), bygningstype: lookup.building_type, andelsnr: selected, registry_orgnr: lookup.borettslag?.orgnr, registry_owner_name: ow?.navn, registry_owner_type: ow?.type });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, owners, lookup, state]);

  // Bygg en enhetlig liste for seksjoner/andeler.
  const items = useMemo<Item[]>(() => {
    if (!lookup) return [];
    if (state === 'sameie') {
      return (lookup.edr?.seksjoner || [])
        .filter((s: any) => s.formaal_kode === 'B')
        .map((s: any) => ({
          key: String(s.snr),
          title: `Seksjon ${s.snr}`,
          badge: s.sameiebroek_teller && s.sameiebroek_nevner ? `Brøk ${s.sameiebroek_teller}/${s.sameiebroek_nevner}` : undefined,
          owner: owners[String(s.snr)] || null,
          floor: null,
        }));
    }
    if (state === 'borettslag') {
      return (lookup.borettslag?.andeler || []).map((a: any) => {
        const fm = floorMeta(a.bolignr);
        return {
          key: String(a.andelsnr),
          title: a.bolignr ? `Bolig ${a.bolignr}` : `Andel ${a.andelsnr}`,
          badge: `Andel ${a.andelsnr}`,
          owner: owners[String(a.andelsnr)] || null,
          floor: fm,
        } as Item;
      });
    }
    return [];
  }, [lookup, state, owners]);

  // Auto-velg seksjon/andel når den er hentet direkte fra Finn-annonsen.
  useEffect(() => {
    if (autoPreRef.current || overrideOpen) return;
    let key = '';
    if (state === 'sameie' && preselectSeksjonsnr) key = String(preselectSeksjonsnr);
    else if (state === 'borettslag' && preselectAndelsnr) key = String(preselectAndelsnr);
    if (!key) return;
    if (items.some((it) => it.key === key)) {
      autoPreRef.current = true;
      setAutoMatched(true);
      setSelected(key);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, items, preselectSeksjonsnr, preselectAndelsnr]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.title.toLowerCase().includes(q) ||
      (it.badge || '').toLowerCase().includes(q) ||
      (it.owner?.navn || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // Gruppér på etasje når data finnes (borettslag), ellers én flat gruppe.
  const groups = useMemo(() => {
    const hasFloors = filtered.some((it) => it.floor);
    if (!hasFloors) return [{ label: '', items: filtered }];
    const map = new Map<number, { label: string; items: Item[] }>();
    for (const it of filtered) {
      const ord = it.floor ? it.floor.order : 9999;
      const label = it.floor ? it.floor.label : 'Annet';
      if (!map.has(ord)) map.set(ord, { label, items: [] });
      map.get(ord)!.items.push(it);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]).map(([, g]) => g);
  }, [filtered]);

  if (state === 'idle' || state === 'disabled') return null;

  // ---- Laster: premium "søker i registeret" ----
  if (state === 'loading') {
    if (!renderSingle) return null;
    return (
      <div className="mt-5 rounded-[24px] border border-[#efe6fb] bg-white p-8 sm:p-10 text-center shadow-[0_8px_40px_-24px_rgba(210,152,255,0.35)]" data-testid="registry-loading">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-[#faf5ff] flex items-center justify-center mb-5">
          <Loader2 className="w-6 h-6 text-[#7e22ce] animate-spin" />
        </div>
        <h3 className="text-[19px] font-bold text-[#0a0a0a] tracking-[-0.01em]" style={{ fontFamily: 'var(--font-heading)' }}>Søker i Eiendomsregisteret</h3>
        <p className="text-[14px] text-[#6b6b6b] mt-2 max-w-[34ch] mx-auto leading-relaxed">Vi henter informasjon om eiendommen fra offentlige registre …</p>
        {addressLabel && (
          <div className="mt-5 inline-flex items-center gap-2 text-[13px] text-[#5b6370] bg-[#f8f6fc] rounded-full px-3.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#d298ff]" /> {addressLabel}
          </div>
        )}
      </div>
    );
  }

  // ---- Auto-valgt fra Finn-annonse: kompakt bekreftelse (kortets footer viser hjemmelshaver) ----
  if ((state === 'sameie' || state === 'borettslag') && autoMatched && !overrideOpen) {
    const kindLabel = state === 'borettslag' ? 'andel' : 'seksjon';
    if (renderSingle) {
      // Adresse-flyt (sjelden): vis en liten bekreftelses-stripe.
      const ow = selected ? owners[selected] : null;
      return (
        <div className="mt-5 rounded-2xl bg-[#f7fcf9] border border-[#e7f3ec] px-4 py-3.5 flex items-center gap-3" data-testid="registry-auto-selected">
          <span className="w-7 h-7 rounded-full bg-[#e7f7ee] flex items-center justify-center shrink-0"><Check className="w-4 h-4 text-[#16a34a]" strokeWidth={3} /></span>
          <div className="flex-1 min-w-0 text-[13.5px] leading-snug">
            <span className="font-semibold text-[#0a0a0a]">{kindLabel === 'andel' ? 'Andel' : 'Seksjon'} {selected}</span>
            <span className="text-[#5b6370]"> — hentet fra annonsen{ow ? ` · ${ow.navn}` : ''}</span>
          </div>
          <button type="button" onClick={() => setOverrideOpen(true)} className="shrink-0 text-[12.5px] font-semibold text-[#7e22ce] hover:text-[#8a45d6]">Endre</button>
        </div>
      );
    }
    // Finn-flyt: kortets footer viser «Verifisert … hjemmelshaver» — her trengs bare en diskré overstyring.
    return (
      <div className="mt-3 text-center" data-testid="registry-auto-selected">
        <button type="button" onClick={() => setOverrideOpen(true)}
          className="text-[12.5px] text-[#716b63] hover:text-[#7e22ce] transition-colors underline underline-offset-2 decoration-[#e0d8ee]">
          Feil {kindLabel}? Velg en annen
        </button>
      </div>
    );
  }

  // ---- Sameie / Borettslag: kort-velger ----
  if ((state === 'sameie' || state === 'borettslag') && lookup) {
    const kindLabel = state === 'borettslag' ? 'andel' : 'seksjon';
    const selectedOwner = selected ? owners[selected] : null;
    return (
      <div className="mt-5 rounded-[24px] border border-[#efe6fb] bg-white overflow-hidden shadow-[0_8px_40px_-24px_rgba(210,152,255,0.35)]" data-testid={`registry-${state}`}>
        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#f3eefb]">
          <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#16a34a] mb-2.5">
            <span className="w-5 h-5 rounded-full bg-[#e7f7ee] flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>
            Verifisert i Eiendomsregisteret
          </div>
          <h3 className="text-[22px] sm:text-[24px] font-bold text-[#0a0a0a] tracking-[-0.02em]" style={{ fontFamily: 'var(--font-heading)' }}>
            {state === 'borettslag' ? 'Hvilken bolig?' : 'Hvilken seksjon?'}
          </h3>
          {addressLabel && <p className="text-[14px] text-[#6b6b6b] mt-1">{addressLabel}</p>}
        </div>

        {/* Søk */}
        {items.length > 4 && (
          <div className="px-5 sm:px-6 pt-4">
            <div className="flex items-center gap-2.5 rounded-2xl border border-[#e9e4f2] bg-[#fbfaff] px-4 h-12 focus-within:border-[#d298ff] transition-colors">
              <Search className="w-4 h-4 text-[#78726a] shrink-0" />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`Søk ${kindLabel} eller hjemmelshaver …`}
                className="flex-1 bg-transparent outline-none text-[14.5px] text-[#0a0a0a] placeholder:text-[#78726a]"
                data-testid="registry-search"
              />
            </div>
          </div>
        )}

        {/* Liste */}
        <div className="px-5 sm:px-6 py-4 max-h-[420px] overflow-y-auto space-y-5">
          {filtered.length === 0 && (
            <p className="text-center text-[13.5px] text-[#716b63] py-8">Ingen treff på «{search}».</p>
          )}
          {groups.map((g, gi) => (
            <div key={gi}>
              {g.label && <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#78726a] mb-2 px-1">{g.label}</p>}
              <div className="space-y-2">
                {g.items.map((it) => {
                  const active = selected === it.key;
                  return (
                    <button
                      key={it.key} type="button" onClick={() => handleSelect(it.key)}
                      data-testid={`registry-unit-${it.key}`}
                      className={`w-full flex items-center gap-3.5 p-3.5 rounded-2xl border text-left transition-all duration-150 ${active ? 'border-[#d298ff] bg-[#faf5ff] shadow-[0_2px_14px_-6px_rgba(210,152,255,0.5)]' : 'border-[#eee] bg-white hover:border-[#e0d4f0] hover:bg-[#fcfbfe]'}`}
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${active ? 'bg-[#d298ff]' : 'bg-[#f5f2fb]'}`}>
                        <Home className={`w-[18px] h-[18px] ${active ? 'text-white' : 'text-[#b794e8]'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[15px] font-semibold text-[#0a0a0a]">{it.title}</span>
                          {it.badge && <span className="text-[10.5px] font-medium text-[#8b5cf6] bg-[#f1e9fc] rounded-full px-2 py-0.5">{it.badge}</span>}
                        </div>
                        {it.owner ? (
                          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#737373]"><User className="w-3.5 h-3.5 text-[#bbb]" /> {it.owner.navn}</span>
                        ) : (
                          <span className="mt-0.5 block text-[12.5px] text-[#bbb]">Hjemmelshaver ikke tilgjengelig</span>
                        )}
                      </div>
                      <span className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? 'border-[#d298ff] bg-[#d298ff]' : 'border-[#dcdce0]'}`}>
                        {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bekreftelse */}
        {selectedOwner && (
          <div className="px-5 sm:px-6 py-3.5 bg-[#f7fcf9] border-t border-[#e7f3ec] flex items-center gap-2 text-[13.5px]" data-testid="registry-confirmed">
            <ShieldCheck className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span className="text-[#0a0a0a]"><span className="font-semibold">{selectedOwner.navn}</span> <span className="text-[#5b6370]">— bekreftet hjemmelshaver</span></span>
          </div>
        )}
      </div>
    );
  }

  // ---- Enkelt-eiendom (enebolig o.l.) ----
  if (state === 'single' && lookup) {
    if (!renderSingle) return null;
    return (
      <div className="mt-5 rounded-[24px] border border-[#efe6fb] bg-white p-5 sm:p-6 shadow-[0_8px_40px_-24px_rgba(210,152,255,0.35)]" data-testid="registry-single">
        <div className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#16a34a] mb-3">
          <span className="w-5 h-5 rounded-full bg-[#e7f7ee] flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3} /></span>
          Verifisert i Eiendomsregisteret
        </div>
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#f5f2fb] flex items-center justify-center shrink-0"><Home className="w-[18px] h-[18px] text-[#b794e8]" /></div>
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-[#0a0a0a]">{addressLabel || 'Eiendom funnet'}</p>
            {singleOwner ? (
              <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[#737373]"><User className="w-3.5 h-3.5 text-[#bbb]" /> {singleOwner.navn} <span className="text-[#bbb]">· hjemmelshaver</span></span>
            ) : (
              <p className="text-[12.5px] text-[#716b63] mt-0.5">Matrikkel {matrikkelStr(lookup.matrikkel)}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- Ikke funnet / feil (mykt, ikke-blokkerende) ----
  if (state === 'notfound' || state === 'error') {
    return (
      <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-[#f8f8f7] border border-[#eee] px-4 py-3.5" data-testid={`registry-${state}`}>
        <Info className="w-[16px] h-[16px] text-[#5b6370] mt-0.5 shrink-0" />
        <span className="text-[13px] text-[#5b6370] leading-relaxed">
          {state === 'notfound'
            ? 'Vi fant ikke eiendommen automatisk — det er helt i orden. Du kan fortsette, så finner vi den manuelt.'
            : 'Kunne ikke hente eiendomsdata akkurat nå. Du kan fortsette uansett.'}
        </span>
      </div>
    );
  }

  return null;
}

export default PropertyRegistryPicker;
