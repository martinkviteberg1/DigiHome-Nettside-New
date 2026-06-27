'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, ArrowRight, Check, Loader2, Phone } from 'lucide-react';
import { getLeadAttribution } from '@/lib/analytics';
import { trackLead, trackLeadStart, getClickIds } from '@/lib/gtag';

/*
  Lys variant av to-stegs lead-skjemaet (forside /2).
  Steg 1: adresse (med Kartverket/Geonorge autocomplete) → Steg 2: telefon/e-post
  → POST /api/leads → kvittering. Hvitt kort, blekk-tekst, ink-knapp, nøytral fokus.
*/
export function HeroLeadFormLight() {
  const [step, setStep] = useState('address'); // address | contact | sent
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // adresse-autofullføring
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [loadingSug, setLoadingSug] = useState(false);
  const boxRef = useRef(null);
  const debounceRef = useRef(null);
  const skipFetch = useRef(false);
  const cacheRef = useRef(new Map());
  const abortRef = useRef(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (step !== 'address') { setShowSug(false); return; }
    if (skipFetch.current) { skipFetch.current = false; return; }
    const q = address.trim();
    if (q.length < 3) { setSuggestions([]); setShowSug(false); setLoadingSug(false); return; }

    // umiddelbart fra cache (føles instant ved backspace / gjentatte søk)
    const cached = cacheRef.current.get(q.toLowerCase());
    if (cached) {
      setSuggestions(cached);
      setShowSug(true);
      setActiveIdx(-1);
      setLoadingSug(false);
      return;
    }

    setLoadingSug(true);
    setShowSug(true); // behold panelet åpent med forrige treff mens vi henter (ingen blink)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const myId = ++reqIdRef.current;
      if (abortRef.current) abortRef.current.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      try {
        const res = await fetch(`/api/address?q=${encodeURIComponent(q)}`, { signal: ac.signal });
        const data = await res.json();
        const sug = data.suggestions || [];
        cacheRef.current.set(q.toLowerCase(), sug);
        if (myId === reqIdRef.current) { setSuggestions(sug); setActiveIdx(-1); }
      } catch (e) {
        // avbrutt eller nettverksfeil — ignorer (eldre svar overskriver ikke nyere)
      } finally {
        if (myId === reqIdRef.current) setLoadingSug(false);
      }
    }, 140);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [address, step]);

  useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setShowSug(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selectSuggestion = (s) => {
    skipFetch.current = true;
    setAddress(s.label);
    setSuggestions([]);
    setShowSug(false);
    setActiveIdx(-1);
    setError('');
  };

  const onAddrKeyDown = (e) => {
    if (!showSug || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIdx]); }
    else if (e.key === 'Escape') { setShowSug(false); }
  };

  const submitAddress = (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Skriv inn adressen din først.');
      return;
    }
    setError('');
    try { trackLeadStart('hero-light'); } catch (e) {}
    setStep('contact');
  };

  const submitContact = async (e) => {
    e.preventDefault();
    const c = contact.trim();
    if (!c) {
      setError('Legg inn telefon eller e-post, så når vi deg.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const isEmail = c.includes('@');
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.trim(),
          email: isEmail ? c : '',
          phone: isEmail ? '' : c,
          source: 'hero-autopilot-light',
          attribution: { ...getLeadAttribution(), ...getClickIds() },
        }),
      });
      if (!res.ok) throw new Error('api');
      let data = {};
      try { data = await res.json(); } catch (e) {}
      try { trackLead({ formId: 'hero-light', source: 'hero-autopilot-light', leadId: data?.data?.id }); } catch (e) {}
      setStep('sent');
    } catch (err) {
      setError('Noe gikk galt. Prøv igjen — eller ring oss på 909 58 313.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-success/25 bg-success-bg px-5 py-4 flex items-start gap-3">
        <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-white border border-success/30 flex items-center justify-center">
          <Check className="h-4 w-4 text-success" />
        </span>
        <div>
          <p className="text-ink font-semibold">Takk! Vurderingen er på vei.</p>
          <p className="text-quiet text-sm mt-0.5">
            Vi tar kontakt innen 24 timer med en gratis verdivurdering av {address}.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-xl">
      {step === 'contact' && (
        <button
          type="button"
          onClick={() => setStep('address')}
          className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-white border border-hairline px-3.5 py-1.5 text-xs text-quiet hover:bg-fill transition"
        >
          <Check className="h-3.5 w-3.5 text-success" />
          {address}
          <span className="text-taupe underline underline-offset-2">endre</span>
        </button>
      )}

      <div className="relative" ref={boxRef}>
        <form onSubmit={step === 'address' ? submitAddress : submitContact}>
          <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2 rounded-2xl bg-white border border-hairline shadow-[0_14px_44px_rgba(26,23,38,0.08)] transition-shadow duration-300 focus-within:shadow-[0_18px_52px_rgba(26,23,38,0.13)]">
            <div className="flex items-center gap-2.5 flex-1 px-3">
              {step === 'address' ? (
                <MapPin className="h-5 w-5 text-taupe shrink-0" />
              ) : (
                <Phone className="h-5 w-5 text-taupe shrink-0" />
              )}
              {step === 'address' ? (
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => { if (suggestions.length) setShowSug(true); }}
                  onKeyDown={onAddrKeyDown}
                  placeholder="Hva er adressen din?"
                  aria-label="Adresse"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 text-ink placeholder:text-taupe/70 h-12 text-base"
                />
              ) : (
                <input
                  autoFocus
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Telefon eller e-post"
                  aria-label="Telefon eller e-post"
                  className="w-full bg-transparent outline-none focus:outline-none focus-visible:outline-none focus:ring-0 border-0 text-ink placeholder:text-taupe/70 h-12 text-base"
                />
              )}
            </div>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-ink text-white h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-[#222] active:scale-[0.98] transition whitespace-nowrap disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : step === 'address' ? (
                <>Få vurdering <ArrowRight className="h-4 w-4" /></>
              ) : (
                <>Send <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </div>
        </form>

        {step === 'address' && showSug && (suggestions.length > 0 || loadingSug) && (
          <div className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl bg-white border border-hairline shadow-[0_24px_64px_rgba(26,23,38,0.18)] overflow-hidden animate-in fade-in-0 slide-in-from-top-1 duration-200">
            {loadingSug && suggestions.length === 0 ? (
              <div className="px-4 py-3.5 text-sm text-taupe flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Søker…
              </div>
            ) : (
              <ul className="max-h-[19rem] overflow-auto p-1.5">
                {suggestions.map((s, i) => (
                  <li key={s.label + i}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${i === activeIdx ? 'bg-fill' : ''}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${i === activeIdx ? 'bg-white shadow-sm' : 'bg-fill'}`}>
                        <MapPin className={`h-4 w-4 transition-colors ${i === activeIdx ? 'text-lavender' : 'text-taupe'}`} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-medium text-ink truncate">{s.text}</span>
                        {s.sub && <span className="block text-xs text-taupe truncate">{s.sub}</span>}
                      </span>
                      <ArrowRight className={`h-4 w-4 shrink-0 text-taupe transition-all duration-200 ${i === activeIdx ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'}`} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-sm text-taupe">
        {error ? (
          <span className="text-rose-600">{error}</span>
        ) : step === 'address' ? (
          'Gratis og uforpliktende · Svar innen 24 timer'
        ) : (
          'Hvor når vi deg? Kun for å sende vurderingen.'
        )}
      </p>
    </div>
  );
}
