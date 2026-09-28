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

/* variant: 'lilla' (standard) eller 'ink' — mørk knapp, så lilla kan reserveres for «Godkjenn».
   stil: 'boks' (pill med ramme) eller 'linje' — én typografisk setning med hårlinje under (heroen).
   Linje-stilen: i ro bare tekst + hårlinje + en tynn sirkel; linjen «tegnes» i ink ved fokus, sirkelen
   fylles når adressen kan sjekkes. Lilla lever kun i careten (punktumet i tittelen). Forslagene
   kommer i et lett, svevende panel i feltets bredde. Ingen flater, ingen piller. */
export default function AdresseFelt({ className = '', onValgt, variant = 'lilla', gjennomsiktig = false, stil = 'boks' }) {
  const ink = variant === 'ink';
  const linje = stil === 'linje';
  const router = useRouter();
  const [verdi, setVerdi] = useState('');
  const [valgt, setValgt] = useState(null);       // { address, postal, city } etter valg (kun med onValgt)
  const [forslag, setForslag] = useState([]);
  const [apen, setApen] = useState(false);
  const [aktiv, setAktiv] = useState(-1);
  const [fokus, setFokus] = useState(false);
  const [hover, setHover] = useState(false);
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

  /* ── Linje-stil: én setning i heroens skala, hårlinje under, en sirkel i enden ──
     Ett system, ingen flater: i ro er det tekst + linje + en tynn sirkel. Linjen «tegnes» i ink når du
     går inn i feltet; sirkelen fylles når adressen kan sjekkes. Lilla lever kun i careten — som
     punktumet i tittelen. Forslagene kommer i et lett, svevende panel i nøyaktig samme bredde. */
  if (linje) {
    const harTekst = verdi.trim().length >= 3;
    const inputEgenskaper = {
      ref: inputRef,
      type: 'text',
      value: verdi,
      onChange: (e) => { setVerdi(e.target.value); if (valgt) setValgt(null); },
      onFocus: () => { setFokus(true); if (forslag.length) setApen(true); },
      onBlur: () => setFokus(false),
      onKeyDown: tast,
      placeholder: 'Skriv inn adressen din',
      autoComplete: 'off',
      autoCorrect: 'off',
      spellCheck: false,
      enterKeyHint: 'go',
      role: 'combobox',
      'aria-expanded': apen,
      'aria-controls': listeId,
      'aria-autocomplete': 'list',
      'aria-activedescendant': aktiv >= 0 ? `${listeId}-${aktiv}` : undefined,
      readOnly: sender,
    };
    const q = verdi.trim().toLowerCase();
    // Uthev den delen av forslaget som matcher det du har skrevet — stille, med vekt, ikke farge.
    const uthev = (tekst) => {
      const t = String(tekst || '');
      const i = q ? t.toLowerCase().indexOf(q) : -1;
      if (i < 0) return t;
      return (<>{t.slice(0, i)}<span className="font-medium text-[#15130F]">{t.slice(i, i + q.length)}</span>{t.slice(i + q.length)}</>);
    };
    return (
      <div ref={boksRef} className={`relative ${className}`} data-testid="v4-adressefelt" data-stil="linje">
        <form onSubmit={send} role="search" aria-label="Start med din adresse" className="relative">
          <div
            className="relative flex items-center gap-4"
            onPointerEnter={() => setHover(true)}
            onPointerLeave={() => setHover(false)}
          >
            <input
              {...inputEgenskaper}
              className="relative h-14 min-w-0 flex-1 appearance-none border-0 bg-transparent px-0 text-[22px] font-normal tracking-[-0.014em] text-[#15130F] shadow-none outline-none ring-0 placeholder:text-[#15130F]/[0.38] focus:shadow-none focus:outline-none focus:ring-0 focus-visible:outline-none sm:h-[68px] sm:text-[30px]"
              style={{ outline: 'none', boxShadow: 'none', WebkitAppearance: 'none', caretColor: T.lilla, opacity: sender ? 0.45 : 1, transition: `opacity 260ms ${EASE}` }}
              data-testid="v4-adresse-input"
            />
            {/* Sirkelen: tynn kontur i ro → fylles i ink når adressen kan sjekkes. 44 px, alltid. */}
            <button
              type="submit"
              aria-label={harTekst ? 'Sjekk adressen' : 'Skriv inn adressen først'}
              title={harTekst ? 'Sjekk adressen' : undefined}
              disabled={sender}
              className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full disabled:opacity-60"
              style={{
                background: harTekst ? '#15130F' : 'transparent',
                color: harTekst ? '#FFFFFF' : 'rgba(21,19,15,0.62)',
                boxShadow: harTekst ? 'none' : `inset 0 0 0 1px rgba(21,19,15,${fokus || hover ? 0.42 : 0.22})`,
                transform: harTekst && (fokus || hover) ? 'scale(1.04)' : 'scale(1)',
                transition: `background-color 260ms ${EASE}, color 260ms ${EASE}, box-shadow 260ms ${EASE}, transform 260ms ${EASE}`,
              }}
              data-testid="v4-adresse-knapp"
            >
              {sender ? (
                <span className="h-4 w-4 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
              )}
            </button>
          </div>
          {/* Linjen: hårfin i ro, mørkere ved hover — og «tegnes» i ink fra venstre når du går inn i feltet. */}
          <span aria-hidden className="relative block h-px w-full" style={{ background: `rgba(21,19,15,${hover && !fokus ? 0.38 : 0.2})`, transition: `background-color 220ms ${EASE}` }}>
            <span
              className="absolute inset-y-0 left-0 w-full"
              style={{
                background: '#15130F',
                transform: fokus ? 'scaleX(1)' : 'scaleX(0)',
                transformOrigin: 'left',
                transition: `transform 380ms ${EASE}`,
              }}
            />
          </span>

          {/* Forslag: et lett panel i nøyaktig feltets bredde — hårlinje, myk skygge, luft. */}
          <ul
            id={listeId}
            role="listbox"
            aria-label="Adresseforslag"
            className="absolute inset-x-0 z-30 rounded-[18px] p-2"
            style={{
              top: 'calc(100% + 12px)',
              background: '#FDFCFA',
              boxShadow: '0 0 0 1px rgba(21,19,15,0.07), 0 1px 2px rgba(21,19,15,0.04), 0 28px 56px -20px rgba(21,19,15,0.22)',
              opacity: apen ? 1 : 0,
              transform: apen ? 'translateY(0) scale(1)' : 'translateY(-6px) scale(0.985)',
              transformOrigin: 'top center',
              pointerEvents: apen ? 'auto' : 'none',
              transition: `opacity 180ms ${EASE}, transform 220ms ${EASE}`,
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
                className="flex cursor-pointer items-baseline justify-between gap-4 rounded-[12px] px-3.5 py-3 text-left text-[16.5px] sm:px-4 sm:text-[17px]"
                style={{ background: i === aktiv ? 'rgba(21,19,15,0.045)' : 'transparent', transition: `background-color 140ms ${EASE}` }}
              >
                <span className="truncate text-[#15130F]/[0.78]">{uthev(s.text)}</span>
                <span className="shrink-0 text-[13.5px] tabular-nums text-[#15130F]/45">{s.sub}</span>
              </li>
            ))}
          </ul>
        </form>
      </div>
    );
  }

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
