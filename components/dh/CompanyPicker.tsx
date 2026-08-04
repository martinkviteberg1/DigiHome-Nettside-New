'use client';

// ── SELSKAPSVELGER (ENHETSREGISTERET) ───────────────────────────────────────
// Søker på NAVN eller ORGANISASJONSNUMMER i samme felt — brukeren skal ikke
// måtte velge søkemodus. Et fritt skrevet selskapsnavn er en gjetning; org.nr
// fra registeret er en identitet, og det er den som havner på leiekontrakten,
// honoraravtalen og fakturaen.
//
// Tre ting denne komponenten tar på alvor:
//   1. Vi advarer hvis selskapet er konkurs, under avvikling eller slettet —
//      og krever en bekreftelse før man går videre. En huseieravtale med et
//      selskap under avvikling er ikke en avtale.
//   2. Registeret kan være nede. Da faller vi tilbake til manuell utfylling i
//      stedet for å stoppe registreringen. Ubekreftet, men aldri blokkerende.
//   3. Tastaturet virker: piltaster, Enter og Escape. Skjemaet skal kunne
//      fylles ut uten mus.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Building2, Check, Loader2, Search, X } from 'lucide-react';
import { formatOrgNr, isValidOrgNr, normalizeOrgNr } from '@/lib/brreg';

export type Company = {
  orgNo: string;
  name: string;
  formCode?: string;
  formLabel?: string;
  address?: { street?: string; postalCode?: string; city?: string } | null;
  status?: string;
  warning?: string | null;
  verified?: boolean;
};

const addressLine = (c?: Company | null) => {
  const a = c?.address;
  if (!a) return '';
  return [a.street, [a.postalCode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
};

export default function CompanyPicker({
  value,
  onSelect,
  onClear,
  error,
  statusAck = false,
  onStatusAckChange,
}: {
  value?: Company | null;
  onSelect: (company: Company) => void;
  onClear: () => void;
  error?: string;
  statusAck?: boolean;
  onStatusAckChange?: (next: boolean) => void;
}) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState('');
  const [manual, setManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualOrg, setManualOrg] = useState('');
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Debounce + abort. Uten dette sender et offentlig skjema én forespørsel per
  // tastetrykk mot et fellesgode-register.
  useEffect(() => {
    const q = query.trim();
    if (value) return undefined;
    if (q.length < 2) { setItems([]); setNote(''); setLoading(false); return undefined; }
    const ctrl = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/brreg?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await r.json().catch(() => ({}));
        const found: Company[] = Array.isArray(data?.items) ? data.items : [];
        setItems(found);
        setActive(found.length ? 0 : -1);
        setOpen(true);
        if (data?.unavailable) {
          setNote('Enhetsregisteret svarer ikke akkurat nå.');
          setManual(true);
        } else if (data?.message) {
          setNote(data.message);
        } else if (!found.length) {
          setNote(/^[\d\s.-]+$/.test(q) ? 'Fant ikke dette organisasjonsnummeret.' : 'Ingen treff. Prøv en annen skrivemåte, eller skriv organisasjonsnummeret.');
        } else {
          setNote('');
        }
      } catch (e: any) {
        if (e?.name !== 'AbortError') { setNote('Fikk ikke kontakt med Enhetsregisteret.'); setManual(true); }
      } finally {
        setLoading(false);
      }
    }, 320);
    return () => { window.clearTimeout(timer); ctrl.abort(); };
  }, [query, value]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const choose = (c: Company) => {
    onSelect({ ...c, verified: true });
    setOpen(false);
    setQuery('');
    setItems([]);
    setNote('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!items.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive((i) => Math.min(items.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(0, i - 1)); }
    else if (e.key === 'Enter' && open && active >= 0) { e.preventDefault(); choose(items[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  const manualValid = manualName.trim().length > 1 && isValidOrgNr(manualOrg);

  // ── Valgt selskap ────────────────────────────────────────────────────────
  if (value) {
    const warn = value.warning || (value.status && value.status !== 'aktiv' ? `Selskapet er ${value.status} i Enhetsregisteret.` : '');
    const addr = addressLine(value);
    return (
      <div data-testid="company-selected">
        <div className={`rounded-[14px] border bg-white p-4 ${warn ? 'border-[#e8b4a0]' : 'border-[#8e8680]'}`}>
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f1e4fb]">
              {warn ? <AlertTriangle className="h-4 w-4 text-[#b4531f]" /> : <Check className="h-4 w-4 text-[#7e22ce]" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-[#151310]">{value.name}</p>
              <p className="mt-0.5 text-[12.5px] text-[#6d6760]">
                org.nr {formatOrgNr(value.orgNo)}{value.formLabel ? ` · ${value.formLabel}` : ''}
                {value.verified === false ? ' · ikke bekreftet' : ''}
              </p>
              {addr ? <p className="mt-0.5 truncate text-[12.5px] text-[#8b847d]">{addr}</p> : null}
            </div>
            <button type="button" onClick={onClear} data-testid="company-clear"
              className="ml-1 shrink-0 rounded-full p-1.5 text-[#8b847d] transition hover:bg-[#f3efe9] hover:text-[#292621]" aria-label="Velg et annet selskap">
              <X className="h-4 w-4" />
            </button>
          </div>

          {warn ? (
            <button type="button" onClick={() => onStatusAckChange?.(!statusAck)} data-testid="company-status-ack"
              className="mt-3 flex w-full items-start gap-2.5 rounded-xl bg-[#fdf6f1] p-3 text-left">
              <span className={`mt-0.5 flex h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 ${statusAck ? 'border-[#b4531f] bg-[#b4531f]' : 'border-[#d9b9a5] bg-white'}`}>
                {statusAck ? <Check className="h-3 w-3 text-white" strokeWidth={3.5} /> : null}
              </span>
              <span className="text-[12.5px] leading-relaxed text-[#7a4526]">{warn} Jeg bekrefter at vi likevel skal registrere dette selskapet.</span>
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-2 text-[12px] font-medium text-red-600">{error}</p> : null}
      </div>
    );
  }

  // ── Søk ──────────────────────────────────────────────────────────────────
  return (
    <div ref={boxRef} data-no-enter-advance>
      <label htmlFor="company-search-input" className="mb-2 block text-[13px] font-semibold text-[#292621]">Selskap</label>
      <div className={`relative rounded-[14px] border bg-white transition-all focus-within:border-[#292621] focus-within:shadow-[0_0_0_3px_rgba(32,29,26,0.06)] ${error ? 'border-red-400' : 'border-[#dcd6cf]'}`}>
        <span className="pointer-events-none absolute left-4 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f5f2ef]">
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-[#7e22ce]" /> : <Search className="h-4 w-4 text-[#7e22ce]" />}
        </span>
        <input
          id="company-search-input"
          data-testid="company-search-input"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={onKeyDown}
          onFocus={() => setOpen(true)}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && items.length > 0}
          aria-controls="company-results"
          placeholder="Søk på selskapsnavn eller org.nr"
          className="h-14 w-full rounded-[14px] bg-transparent pl-[52px] pr-4 text-[15px] font-medium text-[#191714] outline-none placeholder:font-normal placeholder:text-[#a8a29b]"
        />
      </div>

      {open && items.length > 0 ? (
        <ul id="company-results" role="listbox" data-testid="company-results"
          className="mt-1.5 max-h-[290px] overflow-y-auto rounded-[14px] border border-[#e2ddd6] bg-white py-1 shadow-[0_18px_40px_-24px_rgba(0,0,0,.35)]">
          {items.map((c, i) => {
            const addr = addressLine(c);
            const inactive = c.status && c.status !== 'aktiv';
            return (
              <li key={c.orgNo} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => choose(c)}
                  data-testid={`company-option-${c.orgNo}`}
                  className={`block w-full px-3.5 py-2.5 text-left transition ${i === active ? 'bg-[#f6f3ef]' : 'bg-white'}`}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 shrink-0 text-[#a8a29b]" />
                    <span className="truncate text-[14px] font-semibold text-[#191714]">{c.name}</span>
                    {inactive ? <span className="shrink-0 rounded-full bg-[#fdf0e8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-[#b4531f]">{c.status}</span> : null}
                  </span>
                  <span className="mt-0.5 block truncate pl-[22px] text-[12px] text-[#7d766f]">
                    {formatOrgNr(c.orgNo)}{c.formLabel ? ` · ${c.formLabel}` : ''}{addr ? ` · ${addr}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {note ? <p className="mt-2 text-[12px] leading-relaxed text-[#8b847d]" data-testid="company-note">{note}</p> : null}
      {error ? <p className="mt-2 text-[12px] font-medium text-red-600">{error}</p> : null}

      {!manual ? (
        <button type="button" onClick={() => setManual(true)} data-testid="company-manual-toggle"
          className="mt-2 text-[12px] font-semibold text-[#5f5a54] underline decoration-[#bbb3aa] underline-offset-4">
          Finner du ikke selskapet? Fyll inn manuelt
        </button>
      ) : (
        <div className="mt-3 rounded-[14px] border border-[#e2ddd6] bg-[#fbfaf8] p-3.5" data-testid="company-manual">
          <p className="text-[12px] leading-relaxed text-[#6d6760]">Fyll inn manuelt. Vi bekrefter opplysningene mot Enhetsregisteret når vi behandler registreringen.</p>
          <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Selskapets navn" data-testid="company-manual-name"
            className="mt-2.5 h-12 w-full rounded-xl border border-[#dcd6cf] bg-white px-3.5 text-[14.5px] font-medium text-[#191714] outline-none focus:border-[#292621]" />
          <input value={manualOrg} onChange={(e) => setManualOrg(e.target.value)} inputMode="numeric" placeholder="Organisasjonsnummer (9 siffer)" data-testid="company-manual-orgnr"
            className="mt-2 h-12 w-full rounded-xl border border-[#dcd6cf] bg-white px-3.5 text-[14.5px] font-medium text-[#191714] outline-none focus:border-[#292621]" />
          {manualOrg.trim() && !manualValid && normalizeOrgNr(manualOrg).length >= 9
            ? <p className="mt-1.5 text-[12px] font-medium text-red-600">Organisasjonsnummeret er ikke gyldig — sjekk sifrene.</p> : null}
          <button type="button" disabled={!manualValid} data-testid="company-manual-save"
            onClick={() => { onSelect({ orgNo: normalizeOrgNr(manualOrg), name: manualName.trim(), verified: false }); setManual(false); }}
            className="mt-2.5 inline-flex h-11 items-center justify-center rounded-full bg-[#171513] px-5 text-[13.5px] font-bold text-white transition hover:bg-[#2b2824] disabled:opacity-40">
            Bruk dette selskapet
          </button>
        </div>
      )}
    </div>
  );
}
