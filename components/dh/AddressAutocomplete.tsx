'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';
import { track } from '@/lib/analytics';

/**
 * AddressAutocomplete — bruker vår egen /api/address (Geonorge, gratis, ingen nøkkel)
 * Beholder samme prop-API som plattform-versjonen (value/onChange/onSelect/...).
 */
export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Skriv inn adresse...',
  className = '',
  inputClassName = '',
  showIcon = true,
  dataTestId = 'address-autocomplete',
  requireSelection = false,
  onVerifiedChange,
}: any) {
  const wrapperRef = useRef<any>(null);
  const inputRef = useRef<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // «Bekreftet» = valgt fra listen (med husnummer). Manuell skriving nullstiller.
  const [verified, setVerified] = useState(false);
  const [needNumber, setNeedNumber] = useState(false);
  const skipRef = useRef(false);
  const cacheRef = useRef<Map<string, any[]>>(new Map());
  const abortRef = useRef<any>(null);
  const reqIdRef = useRef(0);

  const setVerifiedBoth = useCallback((v: boolean) => {
    setVerified(v);
    try { onVerifiedChange?.(v); } catch (e) {}
  }, [onVerifiedChange]);

  // Debounced Geonorge-oppslag med klient-cache + request-guard (rask, ingen blink)
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    const q = (value || '').trim();
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    // Smart felt (14/7): URL-aktig input (limt lenke) skal aldri fyre adressesøk
    // — Finn-deteksjonen i felteieren tar over, og lenker gir uansett null treff.
    if (/^(https?:\/\/|www\.)/i.test(q) || /finn\.no\//i.test(q)) { setSuggestions([]); setOpen(false); return; }

    // Instant fra cache (føles umiddelbart ved backspace / gjentatte søk)
    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) { setSuggestions(cached); setOpen(cached.length > 0); setActive(-1); return; }

    const t = setTimeout(async () => {
      const myId = ++reqIdRef.current;
      if (abortRef.current) abortRef.current.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const r = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await r.json();
        const list = data.suggestions || [];
        // Cache KUN ikke-tomme lister: et forbigående tomt svar (nettglipp/kvote)
        // skal ikke gjøre adressen «usøkbar» resten av økten.
        if (list.length) {
          cacheRef.current.set(q.toLowerCase(), list);
          if (cacheRef.current.size > 300) cacheRef.current.delete(cacheRef.current.keys().next().value);
        }
        if (myId === reqIdRef.current) { setSuggestions(list); setOpen(list.length > 0); setActive(-1); }
      } catch (e) { /* abort/ignorer — eldre svar overskriver ikke nyere */ }
    }, 150);
    return () => { clearTimeout(t); };
  }, [value]);

  // Lukk ved klikk utenfor
  useEffect(() => {
    const onDoc = (e: any) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = useCallback(async (s: any) => {
    // Gate-forslag UTEN husnummer («Sverres gate, Bergen»): ikke godta valget —
    // legg gatenavnet i feltet og be om husnummer (nytt søk gir nummer-forslag).
    if (!/\d/.test(String(s.text || ''))) {
      onChange(String(s.text || '') + ' ');
      setNeedNumber(true);
      setVerifiedBoth(false);
      setOpen(false);
      setSuggestions([]);
      try { inputRef.current?.focus(); } catch (e) {}
      try { track('address_search', { selected: true, need_number: true }); } catch (e) {}
      return;
    }
    setNeedNumber(false);
    skipRef.current = true;
    onChange(s.text);
    setOpen(false);
    setSuggestions([]);
    try { track('address_search', { selected: true }); } catch (e) {}
    setVerifiedBoth(true);
    if (!onSelect) return;
    // Google-forslag mangler postnummer → hent fra Place Details (server-proxy).
    if (s.place_id) {
      try {
        const r = await fetch(`/api/address?place_id=${encodeURIComponent(s.place_id)}`);
        const d = await r.json();
        if (d && d.ok && (d.postalCode || d.address)) {
          skipRef.current = true; // parent setter full label → ikke trigg nytt søk
          onSelect({ address: d.label || d.address || s.label || s.text, postalCode: d.postalCode || '', city: d.city || '', raw: s });
          return;
        }
      } catch (e) { /* faller tilbake til forslags-teksten under */ }
      skipRef.current = true;
      onSelect({ address: s.label || s.text, postalCode: '', city: '', raw: s });
      return;
    }
    // Geonorge-format: postnummer ligger i sub («5005 BERGEN»).
    const m = (s.sub || '').match(/(\d{4})\s+(.+)/);
    onSelect({ address: s.label || s.text, postalCode: m ? m[1] : '', city: m ? m[2] : '', raw: s });
  }, [onChange, onSelect, setVerifiedBoth]);

  // Blur: matcher teksten et forslag eksakt → auto-velg (brukeren skrev alt selv).
  const onBlurField = useCallback(() => {
    if (verified) return;
    const t = String(value || '').trim().toLowerCase();
    if (!t) { setNeedNumber(false); return; }
    const hit = suggestions.find((s: any) =>
      String(s.text || '').trim().toLowerCase() === t || String(s.label || '').trim().toLowerCase() === t);
    if (hit && /\d/.test(String(hit.text || ''))) choose(hit);
  }, [verified, value, suggestions, choose]);

  // Mobil-UX: sticky bunn-bar + cookiebanner spiser ~300px — scroll feltet opp
  // ved fokus slik at forslagslisten får plass under input.
  const onFocusField = useCallback((e: any) => {
    if (suggestions.length) setOpen(true);
    try {
      if (window.innerWidth < 768 && wrapperRef.current) {
        const top = wrapperRef.current.getBoundingClientRect().top;
        if (top > 140) window.scrollTo({ top: top + window.scrollY - 110, behavior: 'smooth' });
      }
    } catch (err) { /* ignore */ }
  }, [suggestions.length]);

  const onKey = (e: any) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { if (active >= 0) { e.preventDefault(); choose(suggestions[active]); } }
    else if (e.key === 'Escape') { setOpen(false); }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {showIcon && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-4 pointer-events-none">
          <MapPin className="w-[16px] h-[16px] text-[#737373]" />
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); if (verified) setVerifiedBoth(false); }}
        onFocus={onFocusField}
        onBlur={onBlurField}
        onKeyDown={onKey}
        placeholder={placeholder}
        className={inputClassName}
        data-testid={dataTestId}
        autoComplete="off"
      />
      {/* Veiledningshint: be om husnummer / valg fra listen (myk, ikke-blokkerende her —
          selve blokkeringen skjer i skjemaets submit-validering) */}
      {needNumber && (
        <p className="text-[12px] text-amber-700 mt-1.5" data-testid={`${dataTestId}-hint`}>
          Legg til husnummer (f.eks. 12) og velg adressen fra listen.
        </p>
      )}
      {!needNumber && requireSelection && !verified && String(value || '').trim().length >= 3 && (
        <p className="text-[12px] text-amber-700 mt-1.5" data-testid={`${dataTestId}-hint`}>
          Velg adressen fra forslagslisten — da får vi med postnummer og husnummer.
        </p>
      )}
      {open && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[10000] bg-white rounded-xl border border-[#e5e5e5] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1 overflow-hidden max-h-[min(300px,42vh)] overflow-y-auto"
          style={{ fontFamily: 'var(--font-body), sans-serif' }}
        >
          {suggestions.map((s: any, i: number) => (
            <button
              type="button"
              key={(s.label || s.text) + i}
              onMouseDown={(e) => { e.preventDefault(); choose(s); }}
              onMouseEnter={() => setActive(i)}
              className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors ${active === i ? 'bg-[#f5edfc]' : 'hover:bg-[#f8f7f5]'}`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#cf97fc] mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-[14px] text-[#222] font-medium leading-tight truncate">{s.text}</span>
                {s.sub && <span className="block text-[12px] text-[#716b63] mt-0.5 truncate">{s.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
