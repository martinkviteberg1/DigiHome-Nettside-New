'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { formatOrgNr, isValidOrgNr, normalizeOrgNr } from '@/lib/brreg';
import { EASE, T } from '../motion';
import { Avkryssing, Label, Feilmelding } from './Felt';

/* ---------------------------------------------------------------------------
   SelskapSok — Enhetsregisteret i V4-språket. Samme objekt som adressefeltet:
   én pill, forslag som hårlinje-liste. Navn eller org.nr i samme felt.

   Tre ting vi tar på alvor (arvet fra CompanyPicker):
   1. Konkurs / under avvikling / slettet → tydelig, og krever bekreftelse.
   2. Registeret kan være nede → manuell utfylling, aldri blokkering.
   3. Tastatur: ↑ ↓ Enter Esc.

   Valgt selskap vises som én rolig rad: navn · org.nr · form · sted · «Endre».
--------------------------------------------------------------------------- */

const adresselinje = (c) => {
  const a = c?.address;
  if (!a) return '';
  return [a.street, [a.postalCode, a.city].filter(Boolean).join(' ')].filter(Boolean).join(', ');
};

export default function SelskapSok({ verdi, onVelg, onNullstill, feil, statusAck, onStatusAck, autoFokus }) {
  const [q, setQ] = useState('');
  const [liste, setListe] = useState([]);
  const [laster, setLaster] = useState(false);
  const [notat, setNotat] = useState('');
  const [manuell, setManuell] = useState(false);
  const [mNavn, setMNavn] = useState('');
  const [mOrg, setMOrg] = useState('');
  const [aktiv, setAktiv] = useState(-1);
  const [apen, setApen] = useState(false);
  const [fokus, setFokus] = useState(false);
  const boksRef = useRef(null);
  const inputRef = useRef(null);
  const listeId = useId();

  useEffect(() => {
    if (autoFokus && !verdi) { try { inputRef.current?.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
  }, [autoFokus, verdi]);

  useEffect(() => {
    const s = q.trim();
    if (verdi) return undefined;
    if (s.length < 2) { setListe([]); setNotat(''); setLaster(false); setApen(false); return undefined; }
    const ctrl = new AbortController();
    const t = window.setTimeout(async () => {
      setLaster(true);
      try {
        const r = await fetch(`/api/brreg?q=${encodeURIComponent(s)}`, { signal: ctrl.signal });
        const d = await r.json().catch(() => ({}));
        const funnet = Array.isArray(d?.items) ? d.items.slice(0, 6) : [];
        setListe(funnet);
        setAktiv(funnet.length ? 0 : -1);
        setApen(funnet.length > 0);
        if (d?.unavailable) { setNotat('Enhetsregisteret svarer ikke akkurat nå — fyll inn manuelt.'); setManuell(true); }
        else if (d?.message) setNotat(d.message);
        else if (!funnet.length) setNotat(/^[\d\s.-]+$/.test(s) ? 'Fant ikke dette organisasjonsnummeret.' : 'Ingen treff. Prøv en annen skrivemåte, eller skriv organisasjonsnummeret.');
        else setNotat('');
      } catch (e) {
        if (e?.name !== 'AbortError') { setNotat('Fikk ikke kontakt med Enhetsregisteret — fyll inn manuelt.'); setManuell(true); }
      } finally { setLaster(false); }
    }, 300);
    return () => { window.clearTimeout(t); ctrl.abort(); };
  }, [q, verdi]);

  useEffect(() => {
    const f = (e) => { if (boksRef.current && !boksRef.current.contains(e.target)) setApen(false); };
    document.addEventListener('pointerdown', f);
    return () => document.removeEventListener('pointerdown', f);
  }, []);

  const velg = (c) => { onVelg({ ...c, verified: true }); setApen(false); setQ(''); setListe([]); setNotat(''); };
  const tast = (e) => {
    if (e.key === 'Escape') { setApen(false); return; }
    if (!liste.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setApen(true); setAktiv((i) => (i + 1) % liste.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setApen(true); setAktiv((i) => (i <= 0 ? liste.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && apen && aktiv >= 0) { e.preventDefault(); velg(liste[aktiv]); }
  };
  const manuellOk = mNavn.trim().length > 1 && isValidOrgNr(mOrg);

  const ring = feil
    ? '0 0 0 1px rgba(180,60,40,0.7), 0 0 0 4px rgba(180,60,40,0.10)'
    : fokus ? '0 0 0 1px rgba(21,19,15,0.55), 0 0 0 4px rgba(21,19,15,0.10)' : 'inset 0 0 0 1px rgba(21,19,15,0.12)';

  /* ── Valgt selskap: én rolig rad ── */
  if (verdi) {
    const advarsel = verdi.warning || (verdi.status && verdi.status !== 'aktiv' ? `Selskapet er ${verdi.status} i Enhetsregisteret.` : '');
    const adr = adresselinje(verdi);
    return (
      <div data-testid="company-selected">
        <Label>Selskap</Label>
        <div className="flex items-start justify-between gap-4 rounded-[14px] px-5 py-4" style={{ background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${advarsel ? 'rgba(180,60,40,0.45)' : 'rgba(21,19,15,0.12)'}` }}>
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[16px] font-medium text-[#15130F]">
              <span className="truncate">{verdi.name}</span>
              {!advarsel && verdi.verified !== false ? <Check className="h-4 w-4 shrink-0 text-[#1F9D55]" strokeWidth={2.2} aria-label="Bekreftet i Enhetsregisteret" /> : null}
            </p>
            <p className="mt-0.5 truncate text-[13px] text-[#15130F]/55">
              org.nr {formatOrgNr(verdi.orgNo)}{verdi.formLabel ? ` · ${verdi.formLabel}` : ''}{adr ? ` · ${adr}` : ''}{verdi.verified === false ? ' · ikke bekreftet' : ''}
            </p>
          </div>
          <button type="button" onClick={onNullstill} className="shrink-0 text-[13.5px] text-[#15130F]/60 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30" data-testid="company-clear">Endre</button>
        </div>
        {advarsel ? (
          <div className="mt-3">
            <Avkryssing id="company-status-ack" checked={!!statusAck} onChange={(v) => onStatusAck?.(v)}>
              <span className="text-[#8E2E1F]">{advarsel}</span> Jeg bekrefter at vi likevel skal registrere dette selskapet.
            </Avkryssing>
          </div>
        ) : null}
        <Feilmelding id="company-feil">{feil}</Feilmelding>
      </div>
    );
  }

  /* ── Søk ── */
  return (
    <div ref={boksRef} data-no-enter-advance>
      <Label htmlFor="company-search-input" hint="Navn eller org.nr">Selskap</Label>
      <div className="relative">
        <div className="flex h-14 items-center rounded-[14px] px-5" style={{ background: '#FBFAF8', boxShadow: ring, transition: `box-shadow 200ms ${EASE}` }}>
          <input
            ref={inputRef}
            id="company-search-input"
            data-testid="company-search-input"
            value={q}
            onChange={(e) => { setQ(e.target.value); setApen(true); }}
            onKeyDown={tast}
            onFocus={() => { setFokus(true); if (liste.length) setApen(true); }}
            onBlur={() => setFokus(false)}
            autoComplete="off"
            role="combobox"
            aria-expanded={apen && liste.length > 0}
            aria-controls={listeId}
            aria-autocomplete="list"
            aria-invalid={!!feil}
            placeholder="Selskapsnavn eller organisasjonsnummer"
            className="h-full w-full min-w-0 appearance-none border-0 bg-transparent text-[16px] text-[#15130F] outline-none ring-0 placeholder:text-[#15130F]/40 focus:outline-none focus:ring-0"
            style={{ outline: 'none', boxShadow: 'none' }}
          />
          {laster ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#15130F]/45" /> : null}
        </div>
        <ul
          id={listeId}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[14px] py-1"
          style={{ background: '#FBFAF8', boxShadow: '0 24px 48px -24px rgba(21,19,15,0.35), inset 0 0 0 1px rgba(21,19,15,0.08)', opacity: apen && liste.length ? 1 : 0, transform: apen && liste.length ? 'none' : 'translateY(-4px)', pointerEvents: apen && liste.length ? 'auto' : 'none', transition: `opacity 160ms ${EASE}, transform 160ms ${EASE}` }}
          data-testid="company-results"
        >
          {liste.map((c, i) => {
            const inaktiv = c.status && c.status !== 'aktiv';
            return (
              <li
                key={c.orgNo}
                role="option"
                aria-selected={i === aktiv}
                onPointerDown={(e) => { e.preventDefault(); velg(c); }}
                onMouseEnter={() => setAktiv(i)}
                className={`cursor-pointer px-5 py-3 ${i > 0 ? 'border-t border-[#15130F]/[0.06]' : ''}`}
                style={{ background: i === aktiv ? 'rgba(21,19,15,0.045)' : 'transparent', transition: 'background 120ms' }}
                data-testid={`company-option-${c.orgNo}`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="truncate text-[15px] text-[#15130F]">{c.name}</span>
                  {inaktiv ? <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: 'rgba(180,60,40,0.10)', color: '#8E2E1F' }}>{c.status}</span> : null}
                </span>
                <span className="mt-0.5 block truncate text-[13px] text-[#15130F]/50">{formatOrgNr(c.orgNo)}{c.formLabel ? ` · ${c.formLabel}` : ''}{c.address?.city ? ` · ${c.address.city}` : ''}</span>
              </li>
            );
          })}
        </ul>
      </div>
      {laster && !liste.length ? <p className="mt-2 text-[13px] text-[#15130F]/55" data-testid="company-loading">Søker i Enhetsregisteret …</p>
        : notat ? <p className="mt-2 text-[13px] text-[#15130F]/55" data-testid="company-note">{notat}</p> : null}
      <Feilmelding id="company-feil">{feil}</Feilmelding>

      {!manuell ? (
        <button type="button" onClick={() => setManuell(true)} className="mt-2.5 text-[13px] text-[#15130F]/55 underline decoration-[#15130F]/25 underline-offset-4 transition-colors hover:text-[#15130F]" data-testid="company-manual-toggle">Finner du ikke selskapet? Fyll inn manuelt</button>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]" data-testid="company-manual">
          <input value={mNavn} onChange={(e) => setMNavn(e.target.value)} placeholder="Selskapets navn" data-testid="company-manual-name" className="h-14 w-full appearance-none rounded-[14px] border-0 px-5 text-[16px] text-[#15130F] outline-none placeholder:text-[#15130F]/40" style={{ background: '#FBFAF8', boxShadow: 'inset 0 0 0 1px rgba(21,19,15,0.12)' }} />
          <input value={mOrg} onChange={(e) => setMOrg(e.target.value)} inputMode="numeric" placeholder="Org.nr (9 siffer)" data-testid="company-manual-orgnr" className="h-14 w-full appearance-none rounded-[14px] border-0 px-5 text-[16px] text-[#15130F] outline-none placeholder:text-[#15130F]/40" style={{ background: '#FBFAF8', boxShadow: `inset 0 0 0 1px ${mOrg.trim() && !manuellOk && normalizeOrgNr(mOrg).length >= 9 ? 'rgba(180,60,40,0.6)' : 'rgba(21,19,15,0.12)'}` }} />
          <div className="sm:col-span-2 flex flex-wrap items-center gap-4">
            <button type="button" disabled={!manuellOk} onClick={() => { onVelg({ orgNo: normalizeOrgNr(mOrg), name: mNavn.trim(), verified: false }); setManuell(false); }} className="inline-flex h-11 items-center justify-center rounded-[10px] px-5 text-[14.5px] font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-40" style={{ background: T.ink, color: '#F4F1EA' }} data-testid="company-manual-save">Bruk dette selskapet</button>
            <p className="text-[12.5px] text-[#15130F]/50">Vi bekrefter mot Enhetsregisteret når vi behandler registreringen.</p>
          </div>
        </div>
      )}
    </div>
  );
}
