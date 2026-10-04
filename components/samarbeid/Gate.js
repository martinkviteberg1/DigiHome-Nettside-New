'use client';
/* Passordgaten. Server-side sjekk mot /api/samarbeid/auth (httpOnly-cookie i 30 dager). Rolig, mørk – som coveret. */
import React, { useEffect, useState } from 'react';

export default function Gate({ children }) {
  const [state, setState] = useState('sjekker'); // sjekker | laast | aapen
  const [pw, setPw] = useState('');
  const [feil, setFeil] = useState('');
  const [sender, setSender] = useState(false);
  useEffect(() => {
    let aktiv = true;
    fetch('/api/samarbeid/auth', { cache: 'no-store' }).then((r) => r.json()).then((j) => { if (aktiv) setState(j?.authed ? 'aapen' : 'laast'); }).catch(() => { if (aktiv) setState('laast'); });
    return () => { aktiv = false; };
  }, []);
  const send = async (e) => {
    e.preventDefault();
    if (!pw || sender) return;
    setSender(true); setFeil('');
    try {
      const r = await fetch('/api/samarbeid/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      if (r.ok) setState('aapen'); else setFeil('Feil passord.');
    } catch (err) { setFeil('Noe gikk galt. Prøv igjen.'); }
    setSender(false);
  };
  if (state === 'aapen') return children;
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: '#15130F', color: '#F4F1EA', fontFamily: 'var(--font-body), system-ui, sans-serif' }} data-testid="samarbeid-gate">
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(closest-side at 70% 40%, rgba(212,150,255,0.14), rgba(212,150,255,0) 70%)', pointerEvents: 'none' }} />
      <form onSubmit={send} className="relative w-[min(92vw,380px)]" style={{ opacity: state === 'sjekker' ? 0 : 1, transition: 'opacity 500ms' }}>
        <div className="flex items-center gap-2.5"><img src="/brand/digihome-icon-purple.svg" alt="" width={18} height={18} /><span className="text-[13px] font-medium tracking-[-0.01em]">DigiHome Tech</span></div>
        <h1 className="mt-8 text-[30px] leading-[1.05] tracking-[-0.035em]" style={{ fontFamily: 'var(--font-heading), system-ui, sans-serif', fontWeight: 400 }}>Konfidensiell presentasjon.</h1>
        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: 'rgba(244,241,234,0.62)' }}>Delt med navngitte mottakere. Skriv inn passordet du har fått.</p>
        <label className="block mt-7">
          <span className="sr-only">Passord</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" placeholder="Passord" data-testid="samarbeid-gate-input"
            className="w-full h-12 rounded-xl px-4 text-[15px] outline-none focus:ring-1" style={{ background: 'rgba(244,241,234,0.06)', border: '1px solid rgba(244,241,234,0.14)', color: '#F4F1EA' }} />
        </label>
        {feil && <p className="mt-3 text-[13px]" style={{ color: '#E8A3A3' }} data-testid="samarbeid-gate-error">{feil}</p>}
        <button type="submit" disabled={!pw || sender} data-testid="samarbeid-gate-submit" className="mt-4 h-12 w-full rounded-xl text-[14.5px] font-medium disabled:opacity-50" style={{ background: '#F4F1EA', color: '#15130F' }}>{sender ? 'Åpner …' : 'Åpne presentasjonen'}</button>
      </form>
    </div>
  );
}
