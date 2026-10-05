'use client';
/* Passordgaten til /samarbeid. Selve tilgangssjekken skjer server-side (app/samarbeid/page.js) – denne komponenten bare tar imot passordet,
 *  poster det til /api/samarbeid/auth (httpOnly-cookie, 7 dager) og ber serveren rendre på nytt. Papir og blekk – stiler i brev/brev.css (.brev-gate). */
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Gate({ configured = true }) {
  const router = useRouter();
  const [pw, setPw] = useState('');
  const [feil, setFeil] = useState('');
  const [sender, setSender] = useState(false);
  const send = async (e) => {
    e.preventDefault();
    if (!pw || sender) return;
    setSender(true); setFeil('');
    try {
      const r = await fetch('/api/samarbeid/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }), cache: 'no-store' });
      if (r.ok) { router.refresh(); return; }
      if (r.status === 429) setFeil('For mange forsøk. Vent noen minutter og prøv igjen.');
      else setFeil('Feil passord.');
    } catch (err) { setFeil('Noe gikk galt. Prøv igjen.'); }
    setSender(false);
  };
  return (
    <div className="brev-gate" data-testid="samarbeid-gate">
      <form onSubmit={send}>
        <img src="/digihome-wordmark-ink.svg" alt="DigiHome" className="h-[24px] w-auto" />
        <h1>Privat invitasjon.</h1>
        <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: '#77777d' }}>
          {configured ? 'Delt med navngitte mottakere. Skriv inn passordet du har fått.' : 'Tilgangen er ikke konfigurert ennå.'}
        </p>
        <label className="block mt-7">
          <span className="sr-only">Passord</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus autoComplete="current-password" placeholder="Passord" disabled={!configured} data-testid="samarbeid-gate-input" />
        </label>
        {feil && <p className="mt-3 text-[13px]" style={{ color: '#B3261E' }} data-testid="samarbeid-gate-error">{feil}</p>}
        <button type="submit" disabled={!pw || sender || !configured} data-testid="samarbeid-gate-submit">{sender ? 'Åpner …' : 'Åpne invitasjonen'}</button>
      </form>
    </div>
  );
}
