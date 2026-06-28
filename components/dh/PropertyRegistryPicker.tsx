'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Check, Building2, Home, Info } from 'lucide-react';

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

/**
 * Slår opp en valgt adresse i Eiendomsregisteret (Infotorg EDR) og lar eier
 * velge sin seksjon (sameie) eller andel (borettslag). Ikke-blokkerende:
 * skjemaet kan sendes uansett. Rapporterer beriket matrikkel/eier via onResolved.
 */
export function PropertyRegistryPicker({ query, onResolved }: { query: string; onResolved: (d: RegistryResolved) => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'sameie' | 'borettslag' | 'single' | 'notfound' | 'error' | 'disabled'>('idle');
  const [lookup, setLookup] = useState<any>(null);
  const [owners, setOwners] = useState<Record<string, Owner>>({});
  const [selected, setSelected] = useState<string>('');
  const [singleOwner, setSingleOwner] = useState<Owner | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const q = (query || '').trim();
    setSelected('');
    setOwners({});
    setLookup(null);
    setSingleOwner(null);
    onResolved({});
    if (!q) { setState('idle'); return; }
    const my = ++reqId.current;
    setState('loading');
    (async () => {
      try {
        const { status, json: j } = await postJson('/api/infotorg/lookup', { address: q });
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
  }, [query]);

  const handleSelect = (val: string) => {
    setSelected(val);
    if (!lookup) return;
    const base = matrikkelStr(lookup.matrikkel);
    const ow = owners[val] || null;
    if (state === 'borettslag') {
      onResolved({ matrikkel_number: base, bygningstype: lookup.building_type, andelsnr: val, registry_orgnr: lookup.borettslag?.orgnr, registry_owner_name: ow?.navn, registry_owner_type: ow?.type });
    } else if (state === 'sameie') {
      onResolved({ matrikkel_number: matrikkelStr(lookup.matrikkel, val), bygningstype: lookup.building_type, seksjonsnr: val, registry_owner_name: ow?.navn, registry_owner_type: ow?.type });
    }
  };

  if (state === 'idle' || state === 'disabled') return null;

  const selectClass = 'w-full h-[52px] rounded-2xl border border-[#e5e5e5] bg-white px-4 text-[15px] text-[#0a0a0a] focus:outline-none focus:border-[#cf97fc] focus:ring-2 focus:ring-[#f0e2fc] transition-colors appearance-none';

  return (
    <div className="mt-4" data-testid="registry-picker">
      {state === 'loading' && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-[#faf7ff] border border-[#efe6fb] px-4 py-3.5" data-testid="registry-loading">
          <Loader2 className="w-4 h-4 text-[#7c3aed] animate-spin" />
          <span className="text-[13.5px] text-[#5b6370]">Slår opp eiendommen i Eiendomsregisteret…</span>
        </div>
      )}

      {(state === 'sameie' || state === 'borettslag') && lookup && (
        <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#f4eefb] border border-[#efe6fb] p-5" data-testid={`registry-${state}`}>
          <div className="flex items-center gap-2 mb-1.5">
            <Building2 className="w-[15px] h-[15px] text-[#7c3aed]" />
            <span className="text-[13px] font-semibold text-[#333]">
              {state === 'borettslag' ? 'Borettslag funnet' : 'Seksjonert eiendom funnet'}
            </span>
          </div>
          <p className="text-[12.5px] text-[#5b6370] mb-3 leading-relaxed">
            Velg {state === 'borettslag' ? 'din andel' : 'din seksjon'} i listen.{' '}
            <span className="text-[#5b6370]">Vi viser hjemmelshaver for å hjelpe deg å kjenne den igjen.</span>
          </p>
          <div className="relative">
            <select
              value={selected}
              onChange={(e) => handleSelect(e.target.value)}
              className={selectClass}
              data-testid="registry-select"
              aria-label={state === 'borettslag' ? 'Velg andel' : 'Velg seksjon'}
            >
              <option value="">{state === 'borettslag' ? 'Velg andel…' : 'Velg seksjon…'}</option>
              {state === 'sameie'
                ? (lookup.edr.seksjoner || [])
                    .filter((s: any) => s.formaal_kode === 'B')
                    .map((s: any) => {
                      const ow = owners[String(s.snr)];
                      return (
                        <option key={s.snr} value={String(s.snr)}>
                          Seksjon {s.snr}{ow ? ` · ${ow.navn}` : ''}
                        </option>
                      );
                    })
                : (lookup.borettslag.andeler || []).map((a: any) => {
                    const ow = owners[String(a.andelsnr)];
                    const bolig = a.bolignr ? ` · ${a.bolignr}` : '';
                    return (
                      <option key={a.andelsnr} value={String(a.andelsnr)}>
                        Andel {a.andelsnr}{bolig}{ow ? ` · ${ow.navn}` : ''}
                      </option>
                    );
                  })}
            </select>
            <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#888]" viewBox="0 0 20 20" fill="none"><path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          {selected && owners[selected] && (
            <div className="flex items-center gap-2 mt-3 text-[13px] text-[#0a0a0a]" data-testid="registry-confirmed">
              <Check className="w-4 h-4 text-[#16a34a]" />
              <span><span className="font-semibold">{owners[selected].navn}</span> <span className="text-[#5b6370]">— bekreftet hjemmelshaver</span></span>
            </div>
          )}
        </div>
      )}

      {state === 'single' && lookup && (
        <div className="rounded-2xl bg-gradient-to-br from-[#faf5ff] to-[#f4eefb] border border-[#efe6fb] p-5" data-testid="registry-single">
          <div className="flex items-center gap-2 mb-1">
            <Home className="w-[15px] h-[15px] text-[#7c3aed]" />
            <span className="text-[13px] font-semibold text-[#333]">Eiendom funnet i registeret</span>
          </div>
          {singleOwner ? (
            <div className="flex items-center gap-2 mt-1 text-[13.5px] text-[#0a0a0a]">
              <Check className="w-4 h-4 text-[#16a34a]" />
              <span><span className="font-semibold">{singleOwner.navn}</span> <span className="text-[#5b6370]">— hjemmelshaver</span></span>
            </div>
          ) : (
            <p className="text-[12.5px] text-[#5b6370]">Matrikkel {matrikkelStr(lookup.matrikkel)} registrert.</p>
          )}
        </div>
      )}

      {state === 'notfound' && (
        <div className="flex items-start gap-2 rounded-2xl bg-[#f8f8f7] border border-[#eee] px-4 py-3" data-testid="registry-notfound">
          <Info className="w-[15px] h-[15px] text-[#5b6370] mt-0.5 shrink-0" />
          <span className="text-[12.5px] text-[#5b6370] leading-relaxed">Vi fant ikke eiendommen i Eiendomsregisteret automatisk. Det er helt i orden — du kan fortsette, så finner vi den manuelt.</span>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-start gap-2 rounded-2xl bg-[#f8f8f7] border border-[#eee] px-4 py-3" data-testid="registry-error">
          <Info className="w-[15px] h-[15px] text-[#5b6370] mt-0.5 shrink-0" />
          <span className="text-[12.5px] text-[#5b6370] leading-relaxed">Kunne ikke hente eiendomsdata akkurat nå. Du kan fortsette uansett.</span>
        </div>
      )}
    </div>
  );
}

export default PropertyRegistryPicker;
