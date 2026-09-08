'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { EASE, T } from './motion';

/* ---------------------------------------------------------------------------
   AdresseFelt — heroens handling. Ett objekt, ikke et skjema.

   · Én pill: bare feltet. Ingen label, ingen knapp, ingen pil — Enter eller valg i listen går videre.
   · Ekte forslag fra /api/address (Google Places m/Bergen-bias, Geonorge-fallback).
   · Valg → Place Details (postnr/poststed/lat/lng). Med `onValgt` personaliseres heroen
     først (din adresse → din bolig) og knappen blir «Fortsett». Uten `onValgt` går valget
     rett til /bli-utleier/start?address&postal&city — onboardingen verifiserer, plasserer
     kartet og hopper forbi adressesteget.
   · Fritekst / tomt → onboardingen som før, med teksten forhåndsutfylt. Aldri feil i heroen.
   · Tastatur: ↑ ↓ Enter Esc. ARIA combobox/listbox.
--------------------------------------------------------------------------- */

const MAKS = 4;
const START = '/bli-utleier/start';

/* Geonorge-forslag har «postnr poststed» i sub; Google har bare poststed. */
function postFraSub(sub = '') {
  const m = /^(\d{4})\s+(.+)$/.exec(String(sub).trim());
  return m ? { postal: m[1], city: m[2] } : { postal: '', city: '' };
}

/* variant: 'lilla' (standard) eller 'ink' — mørk knapp, så lilla kan reserveres for «Godkjenn». */
export default function AdresseFelt({ className = '', onValgt, variant = 'lilla', gjennomsiktig = false }) {
  const ink = variant === 'ink';
  const router = useRouter();
  const [verdi, setVerdi] = useState('');
  const [valgt, setValgt] = useState(null);       // { address, postal, city } etter valg (kun med onValgt)
  const [forslag, setForslag] = useState([]);
  const [apen, setApen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);
  const [fokus, setFokus] = useState(false);
  const [sender, setSender] = useState(false);
  const boksRef = useRef(null);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const hoppOverSok = useRef(false);               // etter valg: ikke søk på den innsatte teksten
  const listeId = useId();

  /* Debounced søk. Avbryter forrige kall. */
  useEffect(() => {
    if (hoppOverSok.current) { hoppOverSok.current = false; return undefined; }
    const q = verdi.trim();
    if (q.length < 3) { setForslag([]); setApen(false); setAktiv(-1); return undefined; }
    const t = window.setTimeout(async () => {
      try {
        if (abortRef.current) abortRef.current.abort();
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const r = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const j = await r.json().catch(() => ({}));
        const alle = Array.isArray(j?.suggestions) ? j.suggestions : [];
        /* Onboardingen krever husnummer — vis helst forslag som har det. */
        const medNr = alle.filter((s) => /\d/.test(String(s.text || '')));
        const liste = (medNr.length ? medNr : alle).slice(0, MAKS);
        setForslag(liste);
        setApen(liste.length > 0);
        setAktiv(-1);
      } catch (e) { /* avbrutt eller nettverk — stille */ }
    }, 220);
    return () => window.clearTimeout(t);
  }, [verdi]);

  /* Lukk ved klikk utenfor */
  useEffect(() => {
    const f = (e) => { if (boksRef.current && !boksRef.current.contains(e.target)) setApen(false); };
    document.addEventListener('pointerdown', f);
    return () => document.removeEventListener('pointerdown', f);
  }, []);

  const gaTil = (params) => {
    const sp = new URLSearchParams();
    Object.entries(params || {}).forEach(([k, v]) => { if (v) sp.set(k, v); });
    const qs = sp.toString();
    router.push(qs ? `${START}?${qs}` : START);
  };

  /* Ferdig valgt adresse: rett videre til onboardingen — ingen ekstra knapp å trykke. `onValgt` varsles først (heroen
     kan rekke å personalisere seg mens siden bytter). */
  const fullfor = (v) => {
    setValgt(v);
    setForslag([]);
    if (inputRef.current) inputRef.current.blur();
    if (onValgt) onValgt(v);
    gaTil({ address: v.address, postal: v.postal, city: v.city });
  };

  const velg = async (s) => {
    if (!s) return;
    hoppOverSok.current = true;
    setVerdi(s.label || s.text || '');
    setApen(false);
    setSender(true);
    try {
      if (s.place_id) {
        const r = await fetch(`/api/address?place_id=${encodeURIComponent(s.place_id)}`);
        const d = await r.json().catch(() => ({}));
        if (d && d.ok) { fullfor({ address: d.address || s.text, postal: d.postalCode || '', city: d.city || '', lat: d.lat, lng: d.lng }); return; }
      }
      const { postal, city } = postFraSub(s.sub);
      fullfor({ address: s.text, postal, city });
    } catch (e) {
      fullfor({ address: s.label || s.text, postal: '', city: '' });
    }
  };

  const send = (e) => {
    e.preventDefault();
    if (sender) return;
    if (valgt && (valgt.label || valgt.address) && verdi.trim()) { setSender(true); gaTil({ address: valgt.address, postal: valgt.postal, city: valgt.city }); return; }
    if (aktiv >= 0 && forslag[aktiv]) { velg(forslag[aktiv]); return; }
    if (forslag.length) { velg(forslag[0]); return; }   // Enter uten valg = første treff
    const q = verdi.trim();
    setSender(true);
    gaTil(q ? { address: q } : {});
  };

  const tast = (e) => {
    if (e.key === 'Escape') { setApen(false); return; }
    if (!forslag.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setApen(true); setAktiv((i) => (i + 1) % forslag.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setApen(true); setAktiv((i) => (i <= 0 ? forslag.length - 1 : i - 1)); }
  };

  const ring = fokus
    ? (ink ? '0 0 0 1px rgba(21,19,15,0.55), 0 0 0 4px rgba(21,19,15,0.10)' : `0 0 0 1px ${T.lilla}, 0 0 0 4px rgba(212,150,255,0.22)`)
    : gjennomsiktig ? 'inset 0 0 0 1px rgba(255,255,255,0.55), 0 0 0 1px rgba(21,19,15,0.08), 0 20px 40px -24px rgba(21,19,15,0.35)' : 'inset 0 0 0 1px rgba(21,19,15,0.12)';
  /* Gjennomsiktig: feltet ligger på et fotografi — lys, frostet flate som lar bildet skinne gjennom. */
  const flate = gjennomsiktig
    ? { background: fokus ? 'rgba(251,250,248,0.82)' : 'rgba(251,250,248,0.58)', backdropFilter: 'blur(18px) saturate(1.15)', WebkitBackdropFilter: 'blur(18px) saturate(1.15)' }
    : { background: '#FBFAF8' };

  return (
    <div ref={boksRef} className={`relative ${className}`} data-testid="v4-adressefelt">
      <form onSubmit={send} role="search" aria-label="Start med din adresse" className="relative">
        <div
          className="flex h-14 items-center rounded-[14px] px-5"
          style={{ ...flate, boxShadow: ring, transition: `box-shadow 200ms ${EASE}, background-color 200ms ${EASE}` }}
        >
          <input
            ref={inputRef}
            type="text"
            value={verdi}
            onChange={(e) => { setVerdi(e.target.value); if (valgt) setValgt(null); }}
            onFocus={() => { setFokus(true); if (forslag.length) setApen(true); }}
            onBlur={() => setFokus(false)}
            onKeyDown={tast}
            placeholder="Skriv inn adressen din"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            role="combobox"
            aria-expanded={apen}
            aria-controls={listeId}
            aria-autocomplete="list"
            aria-activedescendant={aktiv >= 0 ? `${listeId}-${aktiv}` : undefined}
            readOnly={sender}
            className="h-full min-w-0 flex-1 appearance-none border-0 bg-transparent text-[16px] text-[#15130F] shadow-none outline-none ring-0 placeholder:text-[#15130F]/45 focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none"
            style={{ outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', opacity: sender ? 0.45 : 1, transition: `opacity 260ms ${EASE}` }}
            data-testid="v4-adresse-input"
          />
          {/* Ingen knapp, ingen pil: du velger adressen i listen (eller trykker Enter) og er videre. Feltet er ett rent
              objekt — mens siden bytter, dempes teksten stille. */}
        </div>

        {/* Forslag — samme språk som dagsloggen: hårlinjer, ingen kort, ingen ikoner */}
        <ul
          id={listeId}
          role="listbox"
          aria-label="Adresseforslag"
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-[14px] py-1"
          style={{
            background: '#FBFAF8',
            boxShadow: '0 24px 48px -24px rgba(21,19,15,0.35), inset 0 0 0 1px rgba(21,19,15,0.08)',
            opacity: apen ? 1 : 0,
            transform: apen ? 'none' : 'translateY(-4px)',
            pointerEvents: apen ? 'auto' : 'none',
            transition: `opacity 160ms ${EASE}, transform 160ms ${EASE}`,
          }}
          data-testid="v4-adresse-forslag"
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
    </div>
  );
}
