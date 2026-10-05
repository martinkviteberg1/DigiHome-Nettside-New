'use client';
/* Passordgaten til /samarbeid. Selve tilgangssjekken skjer server-side (app/samarbeid/page.js) – denne komponenten bare tar imot passordet,
 *  poster det til /api/samarbeid/auth (httpOnly-cookie, 7 dager) og ber serveren rendre på nytt. Papir og blekk – stiler i brev/brev.css (.brev-gate). */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/** Legger <link rel="preload" as="image"> i <head> for hero-portrettene mens passordet skrives (srcset/sizes = de samme som i brevet,
 *  så nettleseren varmer nøyaktig den varianten den velger etterpå). Bare bilde-URL-er – ingen tekst fra invitasjonen. */
function useVarmBilder(varm) {
  useEffect(() => {
    if (!Array.isArray(varm) || !varm.length || typeof document === 'undefined') return undefined;
    const links = varm.filter((b) => b && b.src).map((b) => {
      const l = document.createElement('link');
      l.rel = 'preload'; l.as = 'image'; l.href = b.src;
      if (b.srcSet) l.setAttribute('imagesrcset', b.srcSet);
      if (b.sizes) l.setAttribute('imagesizes', b.sizes);
      document.head.appendChild(l);
      return l;
    });
    return () => links.forEach((l) => l.remove());
  }, [varm]);
}

export default function Gate({ configured = true, varm = [] }) {
  const router = useRouter();
  useVarmBilder(varm);
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
