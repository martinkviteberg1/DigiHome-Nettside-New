'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { EASE, T } from '../motion';

/* ---------------------------------------------------------------------------
   AdresseSok — onboardingens adressefelt. Samme objekt som heroens felt:
   én pill, forslag som hårlinje-liste, ink-knapp inne i feltet.

   · Ekte forslag fra /api/address (Google Places m/ Bergen-bias, Geonorge-fallback).
   · Valg → Place Details (postnr/poststed/lat/lng). Optimistisk: `onVelg` fyres
     straks med det vi har (pending), og igjen når detaljene kommer.
   · Gateforslag uten husnummer godtas ikke — vi legger gatenavnet i feltet og
     ber om nummer.
   · FINN-lenke/-kode fyrer aldri adressesøk (eieren av feltet tar over).
   · Tastatur: ↑ ↓ Enter Esc. ARIA combobox/listbox.
--------------------------------------------------------------------------- */

const MAKS = 5;
const erFinnAktig = (q) => /^(https?:\/\/|www\.)/i.test(q) || /finn\.no\//i.test(q) || /^\d{8,10}$/.test(q);

function postFraSub(sub = '') {
  const m = /^(\d{4})\s+(.+)$/.exec(String(sub).trim());
  return m ? { postal: m[1], city: m[2] } : { postal: '', city: '' };
}

export default function AdresseSok({ verdi, onEndre, onVelg, onForslag, onFortsett, klar, laster, feil, bekreftet, knapp = 'Fortsett', autoFokus = false }) {
  const [forslag, setForslag] = useState([]);
  const [apen, setApen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);
  const [fokus, setFokus] = useState(false);
  const [trengerNr, setTrengerNr] = useState(false);
  const boksRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const hoppOverSok = useRef(false);
  const listeId = useId();

  useEffect(() => {
    if (autoFokus) { try { inputRef.current?.focus({ preventScroll: true }); } catch (e) { /* ok */ } }
  }, [autoFokus]);

  /* Kartet følger forslaget: det aktive (pil/hover) — ellers det øverste. Lett debounce mot piltasting. */
  useEffect(() => {
    if (!onForslag || !forslag.length) return undefined;
    const s = aktiv >= 0 ? forslag[aktiv] : forslag[0];
    const t = window.setTimeout(() => onForslag(s || null), aktiv >= 0 ? 140 : 220);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forslag, aktiv]);

  /* Debounced søk. Avbryter forrige kall. */
  useEffect(() => {
    if (hoppOverSok.current) { hoppOverSok.current = false; return undefined; }
    const q = String(verdi || '').trim();
    if (q.length < 3 || erFinnAktig(q)) { setForslag([]); setApen(false); setAktiv(-1); return undefined; }
    const t = window.setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const r = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        const alle = Array.isArray(j?.suggestions) ? j.suggestions : [];
        const medNr = alle.filter((s) => /\d/.test(String(s.text || '')));
        const liste = (medNr.length ? medNr : alle).slice(0, MAKS);
        setForslag(liste);
        setApen(liste.length > 0);
        setAktiv(-1);
      } catch (e) { /* avbrutt eller nettverk — stille */ }
    }, 180);
    return () => window.clearTimeout(t);
  }, [verdi]);

  useEffect(() => {
    const f = (e) => { if (boksRef.current && !boksRef.current.contains(e.target)) setApen(false); };
    document.addEventListener('pointerdown', f);
    return () => document.removeEventListener('pointerdown', f);
  }, []);

  const velg = async (s) => {
    if (!s) return;
    /* Gate uten husnummer: legg gatenavnet i feltet, be om nummer. */
    if (!/\d/.test(String(s.text || ''))) {
      onEndre(`${String(s.text || '')} `);
      setTrengerNr(true);
      setApen(false);
      setForslag([]);
      try { inputRef.current?.focus(); } catch (e) { /* ok */ }
      return;
    }
    setTrengerNr(false);
    hoppOverSok.current = true;
    onEndre(s.label || s.text || '');
    setApen(false);
    setForslag([]);
    try {
      if (s.place_id) {
        const { postal: subPostal, city: subCity0 } = postFraSub(s.sub);
        const subCity = subCity0 || String(s.sub || '').replace(/\b\d{4}\b/, '').replace(/,\s*(Norge|Norway)\s*$/i, '').trim();
        onVelg({ address: s.text, postal: subPostal, city: subCity, pending: true });
        const r = await fetch(`/api/address?place_id=${encodeURIComponent(s.place_id)}`);
        const d = await r.json().catch(() => ({}));
        if (d && d.ok) {
          hoppOverSok.current = true;
          const adr = String(d.address || d.label || s.text).replace(/,\s*(Norway|Norge)$/i, '');
          onEndre(adr);
          onVelg({ address: adr, postal: d.postalCode || subPostal, city: d.city || subCity, lat: typeof d.lat === 'number' ? d.lat : null, lng: typeof d.lng === 'number' ? d.lng : null });
        }
        return;
      }
      const { postal, city } = postFraSub(s.sub);
      onVelg({ address: s.text, postal, city });
    } catch (e) {
      onVelg({ address: s.label || s.text, postal: '', city: '' });
    }
  };

  const send = (e) => {
    e.preventDefault();
    if (laster) return;
    if (apen && aktiv >= 0 && forslag[aktiv]) { velg(forslag[aktiv]); return; }
    if (apen && forslag.length && !bekreftet) { velg(forslag[0]); return; }
    onFortsett();
  };

  const tast = (e) => {
    if (e.key === 'Escape') { setApen(false); return; }
    /* Enter velger forslaget også når knappen er deaktivert (nettleseren dropper implisitt submit da). */
    if (e.key === 'Enter' && apen && forslag.length && !bekreftet) { e.preventDefault(); velg(aktiv >= 0 ? forslag[aktiv] : forslag[0]); return; }
    if (!forslag.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setApen(true); setAktiv((i) => (i + 1) % forslag.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setApen(true); setAktiv((i) => (i <= 0 ? forslag.length - 1 : i - 1)); }
  };

  const ring = feil
    ? '0 0 0 1px rgba(180,60,40,0.7), 0 0 0 4px rgba(180,60,40,0.10)'
    : fokus
      ? '0 0 0 1px rgba(21,19,15,0.55), 0 0 0 4px rgba(21,19,15,0.10)'
      : 'inset 0 0 0 1px rgba(21,19,15,0.12)';

  return (
    <div ref={boksRef} className="relative" data-testid="start-adressesok">
      <form onSubmit={send} className="relative">
        <div className="flex h-14 items-center rounded-[14px] pl-5 pr-1.5" style={{ background: '#FBFAF8', boxShadow: ring, transition: `box-shadow 200ms ${EASE}` }}>
          {bekreftet && <Check className="mr-2.5 h-4 w-4 shrink-0 text-[#1F9D55]" strokeWidth={2.2} aria-hidden="true" />}
          <input
            ref={inputRef}
            type="text"
            value={verdi}
            onChange={(e) => { setTrengerNr(false); onEndre(e.target.value); }}
            onFocus={() => { setFokus(true); if (forslag.length) setApen(true); }}
            onBlur={() => setFokus(false)}
            onKeyDown={tast}
            placeholder="Gateadresse — eller FINN-lenke"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            role="combobox"
            aria-label="Adresse"
            aria-expanded={apen}
            aria-controls={listeId}
            aria-autocomplete="list"
            aria-invalid={!!feil}
            aria-describedby={feil ? 'start-adresse-feil' : undefined}
            aria-activedescendant={aktiv >= 0 ? `${listeId}-${aktiv}` : undefined}
            className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent text-[16px] text-[#15130F] shadow-none outline-none ring-0 placeholder:text-[#15130F]/45 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none"
            style={{ outline: 'none', boxShadow: 'none', WebkitAppearance: 'none' }}
            data-testid="start-adresse-input"
          />
          <button
            type="submit"
            disabled={laster || !klar}
            className="ml-2 inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-medium transition-[background-color,transform,opacity] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#15130F]/30 disabled:cursor-not-allowed"
            style={{ background: klar ? T.ink : 'rgba(21,19,15,0.08)', color: klar ? '#F4F1EA' : 'rgba(21,19,15,0.4)', opacity: laster ? 0.85 : 1 }}
            data-testid="start-adresse-fortsett"
          >
            {laster ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{knapp}</span>
            {!laster && <ArrowRight className="h-4 w-4" strokeWidth={1.8} />}
          </button>
        </div>

        <ul
          id={listeId}
          role="listbox"
          aria-label="Adresseforslag"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[14px] py-1"
          style={{ background: '#FBFAF8', boxShadow: '0 24px 48px -24px rgba(21,19,15,0.35), inset 0 0 0 1px rgba(21,19,15,0.08)', opacity: apen ? 1 : 0, transform: apen ? 'none' : 'translateY(-4px)', pointerEvents: apen ? 'auto' : 'none', transition: `opacity 160ms ${EASE}, transform 160ms ${EASE}` }}
          data-testid="start-adresse-forslag"
        >
          {forslag.map((s, i) => (
            <li
              key={`${s.label || s.text}-${i}`}
              id={`${listeId}-${i}`}
              role="option"
              aria-selected={i === aktiv}
              onPointerDown={(e) => { e.preventDefault(); velg(s); }}
              onMouseEnter={() => setAktiv(i)}
              className={`flex cursor-pointer items-baseline justify-between gap-4 px-5 py-3 text-[15px] ${i > 0 ? 'border-t border-[#15130F]/[0.06]' : ''}`}
              style={{ background: i === aktiv ? 'rgba(21,19,15,0.045)' : 'transparent', transition: 'background 120ms' }}
            >
              <span className="truncate text-[#15130F]">{s.text}</span>
              <span className="shrink-0 text-[13px] text-[#15130F]/50">{s.sub}</span>
            </li>
          ))}
        </ul>
      </form>
      {feil ? <p id="start-adresse-feil" className="mt-2 text-[13px] text-[#B43C28]" data-testid="start-adresse-feil">{feil}</p>
        : trengerNr ? <p className="mt-2 text-[13px] text-[#15130F]/60">Legg til husnummer, så finner vi boligen.</p>
          : null}
    </div>
  );
}
