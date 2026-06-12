'use client';

import { useState } from 'react';
import { MapPin, ArrowRight, Check, Loader2, Phone } from 'lucide-react';

/*
  To-stegs lead-skjema i mørk glass-stil.
  Steg 1: adresse → Steg 2: telefon/e-post → POST /api/leads → kvittering.
*/
export function HeroLeadForm() {
  const [step, setStep] = useState('address'); // address | contact | sent
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submitAddress = (e) => {
    e.preventDefault();
    if (!address.trim()) {
      setError('Skriv inn adressen din først.');
      return;
    }
    setError('');
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
          source: 'hero-autopilot',
        }),
      });
      if (!res.ok) throw new Error('api');
      setStep('sent');
    } catch (err) {
      setError('Noe gikk galt. Prøv igjen — eller ring oss på 909 58 313.');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'sent') {
    return (
      <div className="w-full max-w-xl rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] px-5 py-4 flex items-start gap-3">
        <span className="mt-0.5 h-7 w-7 shrink-0 rounded-full bg-emerald-400/15 border border-emerald-400/40 flex items-center justify-center">
          <Check className="h-4 w-4 text-emerald-300" />
        </span>
        <div>
          <p className="text-white font-semibold">Takk! Vurderingen er på vei.</p>
          <p className="text-white/55 text-sm mt-0.5">
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
          className="mb-2.5 inline-flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/10 px-3.5 py-1.5 text-xs text-white/70 hover:bg-white/10 transition"
        >
          <Check className="h-3.5 w-3.5 text-emerald-300" />
          {address}
          <span className="text-white/40 underline underline-offset-2">endre</span>
        </button>
      )}

      <form onSubmit={step === 'address' ? submitAddress : submitContact}>
        <div className="flex flex-col sm:flex-row items-stretch gap-2 p-2 rounded-2xl bg-white/[0.06] border border-white/[0.13] backdrop-blur-md shadow-[0_18px_50px_rgba(0,0,0,0.45)] transition-all duration-500 focus-within:border-white/[0.28] focus-within:bg-white/[0.075] focus-within:shadow-[0_18px_50px_rgba(0,0,0,0.45),0_0_44px_rgba(207,151,252,0.12)]">
          <div className="flex items-center gap-2.5 flex-1 px-3">
            {step === 'address' ? (
              <MapPin className="h-5 w-5 text-white/40 shrink-0" />
            ) : (
              <Phone className="h-5 w-5 text-white/40 shrink-0" />
            )}
            {step === 'address' ? (
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Hva er adressen din?"
                aria-label="Adresse"
                className="w-full bg-transparent outline-none text-white placeholder:text-white/35 h-12 text-base"
              />
            ) : (
              <input
                autoFocus
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Telefon eller e-post"
                aria-label="Telefon eller e-post"
                className="w-full bg-transparent outline-none text-white placeholder:text-white/35 h-12 text-base"
              />
            )}
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded-xl bg-white text-ink h-12 px-6 inline-flex items-center justify-center gap-2 text-sm font-semibold hover:bg-white/90 active:scale-[0.98] transition whitespace-nowrap disabled:opacity-60"
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

      <p className="mt-3 text-sm text-white/40">
        {error ? (
          <span className="text-rose-300">{error}</span>
        ) : step === 'address' ? (
          'Gratis og uforpliktende · Svar innen 24 timer'
        ) : (
          'Hvor når vi deg? Kun for å sende vurderingen.'
        )}
      </p>
    </div>
  );
}
