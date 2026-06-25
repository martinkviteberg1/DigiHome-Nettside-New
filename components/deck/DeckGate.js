'use client';

import React, { useEffect, useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

// Enkel passord-gate for pitch-decken. Passordet sjekkes server-side (/api/deck/auth),
// og en httpOnly-cookie holder økten i 30 dager. Selve passordet lagres aldri i klienten.
export default function DeckGate({ children }) {
  const [status, setStatus] = useState('checking'); // checking | locked | open
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch('/api/deck/auth', { credentials: 'same-origin' })
      .then((r) => r.json())
      .then((d) => { if (alive) setStatus(d && d.authed ? 'open' : 'locked'); })
      .catch(() => { if (alive) setStatus('locked'); });
    return () => { alive = false; };
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!pw || submitting) return;
    setSubmitting(true);
    setErr('');
    try {
      const r = await fetch('/api/deck/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password: pw }),
      });
      if (r.ok) {
        setStatus('open');
      } else {
        setErr('Feil passord. Prøv igjen.');
        setPw('');
      }
    } catch (e2) {
      setErr('Noe gikk galt. Prøv igjen.');
    }
    setSubmitting(false);
  };

  if (status === 'open') return children;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-6 overflow-hidden"
      style={{ background: '#0a0a0c', fontFamily: 'var(--font-body), system-ui, sans-serif' }}
    >
      {/* ambient glød */}
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(58% 60% at 50% 38%, rgba(210,152,255,0.16), transparent 70%)' }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(210,152,255,0.10) 1px, transparent 1px)', backgroundSize: '30px 30px', WebkitMaskImage: 'radial-gradient(70% 60% at 50% 42%, #000 20%, transparent 80%)', maskImage: 'radial-gradient(70% 60% at 50% 42%, #000 20%, transparent 80%)', opacity: 0.5 }} />

      {status === 'checking' ? (
        <div className="relative flex flex-col items-center gap-4 text-white/55">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#d298ff' }} strokeWidth={2} />
          <span className="text-[12px] tracking-[0.2em] uppercase">Laster …</span>
        </div>
      ) : (
        <div
          className="relative w-full max-w-[440px] rounded-[26px] px-8 py-10 sm:px-10 sm:py-12"
          style={{
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 40px 120px -30px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.06)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            animation: 'dgIn 0.7s cubic-bezier(0.16,1,0.3,1) both',
          }}
        >
          <style>{`@keyframes dgIn{from{opacity:0;transform:translateY(18px) scale(0.98);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}`}</style>

          <div className="flex flex-col items-center text-center">
            <img src="/deck-logo-light.svg" alt="DigiHome" className="h-7 w-auto mb-8" draggable={false} />

            <div
              className="flex items-center justify-center w-12 h-12 rounded-2xl mb-6"
              style={{ background: 'rgba(210,152,255,0.12)', border: '1px solid rgba(210,152,255,0.22)' }}
            >
              <Lock className="w-5 h-5" style={{ color: '#d298ff' }} strokeWidth={2} />
            </div>

            <span className="text-[11px] font-bold uppercase tracking-[0.34em] mb-3" style={{ color: '#d298ff' }}>
              Konfidensielt
            </span>
            <h1
              className="leading-[1.06] tracking-[-0.02em] mb-3"
              style={{ fontFamily: 'var(--font-heading), var(--font-body), sans-serif', fontWeight: 700, fontSize: 'clamp(26px,5vw,34px)', color: '#fff' }}
            >
              Investorpresentasjon
            </h1>
            <p className="text-[13.5px] leading-[1.55] mb-8" style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 320 }}>
              Skriv inn passordet for å åpne DigiHome sin investorpresentasjon.
            </p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={pw}
                onChange={(e) => { setPw(e.target.value); setErr(''); }}
                placeholder="Passord"
                autoFocus
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3.5 pr-11 text-[14.5px] outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${err ? 'rgba(255,120,120,0.5)' : 'rgba(255,255,255,0.13)'}`,
                  color: '#fff',
                }}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? 'Skjul passord' : 'Vis passord'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                {show ? <EyeOff className="w-[18px] h-[18px]" strokeWidth={1.9} /> : <Eye className="w-[18px] h-[18px]" strokeWidth={1.9} />}
              </button>
            </div>

            {err ? (
              <p className="text-[12.5px] font-medium" style={{ color: '#ff8a8a' }}>{err}</p>
            ) : null}

            <button
              type="submit"
              disabled={!pw || submitting}
              className="group mt-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-semibold transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(180deg, #d298ff, #b56eed)',
                color: '#1a0a2e',
                boxShadow: '0 14px 34px -12px rgba(181,110,237,0.7)',
              }}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.2} /> : <>Lås opp <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.4} /></>}
            </button>
          </form>

          <p className="text-center text-[11px] mt-7" style={{ color: 'rgba(255,255,255,0.32)' }}>
            DigiHome · SHD Forvaltning AS
          </p>
        </div>
      )}
    </div>
  );
}
