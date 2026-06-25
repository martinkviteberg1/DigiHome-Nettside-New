'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin } from 'lucide-react';

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
}: any) {
  const wrapperRef = useRef<any>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipRef = useRef(false);

  // Debounced Geonorge-oppslag
  useEffect(() => {
    if (skipRef.current) { skipRef.current = false; return; }
    const q = (value || '').trim();
    if (q.length < 3) { setSuggestions([]); setOpen(false); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = await r.json();
        const list = data.suggestions || [];
        setSuggestions(list);
        setOpen(list.length > 0);
        setActive(-1);
      } catch (e) { /* abort/ignorer */ }
    }, 220);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  // Lukk ved klikk utenfor
  useEffect(() => {
    const onDoc = (e: any) => { if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const choose = useCallback((s: any) => {
    skipRef.current = true;
    onChange(s.text);
    setOpen(false);
    setSuggestions([]);
    if (onSelect) {
      const m = (s.sub || '').match(/(\d{4})\s+(.+)/);
      onSelect({ address: s.label || s.text, postalCode: m ? m[1] : '', city: m ? m[2] : '', raw: s });
    }
  }, [onChange, onSelect]);

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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onKeyDown={onKey}
        placeholder={placeholder}
        className={inputClassName}
        data-testid={dataTestId}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[10000] bg-white rounded-xl border border-[#e5e5e5] shadow-[0_8px_30px_rgba(0,0,0,0.08)] py-1 overflow-hidden"
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
                {s.sub && <span className="block text-[12px] text-[#999] mt-0.5 truncate">{s.sub}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
