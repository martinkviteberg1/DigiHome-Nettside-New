'use client';
/* Passordgaten. Server-side sjekk mot /api/samarbeid/auth (httpOnly-cookie i 30 dager). Papir og blekk – som forslaget. Stiler i brev/brev.css (.brev-gate). */
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
    <div className="brev-gate" data-testid="samarbeid-gate">
      <form onSubmit={send} style={{ opacity: state === 'sjekker' ? 0 : 1, transition: 'opacity 500ms' }}>
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[15px] w-auto" />
        <h1>Privat invitasjon.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: '#77777d' }}>Delt med navngitte mottakere. Skriv inn passordet du har fått.</p>
        <label className="block mt-7">
          <span className="sr-only">Passord</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" placeholder="Passord" data-testid="samarbeid-gate-input" />
        </label>
        {feil && <p className="mt-3 text-[13px]" style={{ color: '#B3261E' }} data-testid="samarbeid-gate-error">{feil}</p>}
        <button type="submit" disabled={!pw || sender} data-testid="samarbeid-gate-submit">{sender ? 'Åpner …' : 'Åpne brevet'}</button>
      </form>
    </div>
  );
}
