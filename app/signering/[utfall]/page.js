'use client';

/* ═══════════════ Offentlig exit-side for BankID-signering ═══════════════
   Posten sender signataren hit etter signering (ferdig), avbrudd (avvist)
   eller teknisk feil (feil). Rolig, premium DigiHome-flate. Ferdig-siden
   pinger /api/signering-puls slik at statusen oppdateres i portalen med
   én gang. */

import { useEffect, useState } from 'react';
import { use } from 'react';

const INNHOLD = {
  ferdig: {
    ikon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    ),
    ring: '#d1fae5',
    tittel: 'Takk — dokumentet er signert',
    tekst: 'Signaturen din er registrert hos Posten signering. Avsenderen får beskjed automatisk, og det signerte dokumentet arkiveres trygt hos DigiHome. Du kan nå lukke dette vinduet.',
  },
  avvist: {
    ikon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
    ),
    ring: '#fef3c7',
    tittel: 'Signeringen ble avbrutt',
    tekst: 'Du valgte å ikke signere dokumentet nå. Ingen signatur er registrert. Ombestemmer du deg, kan du bruke lenken i e-posten på nytt — den virker helt til fristen går ut.',
  },
  feil: {
    ikon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8v5M12 16.5v.5" /><circle cx="12" cy="12" r="9.2" /></svg>
    ),
    ring: '#fee2e2',
    tittel: 'Noe gikk galt',
    tekst: 'Signeringen kunne ikke gjennomføres akkurat nå. Prøv lenken i e-posten på nytt om noen minutter. Vedvarer problemet, ta kontakt med avsenderen hos DigiHome.',
  },
};

export default function SigneringUtfall({ params, searchParams }) {
  const p = typeof params?.then === 'function' ? use(params) : params;
  const sp = typeof searchParams?.then === 'function' ? use(searchParams) : searchParams;
  const utfall = ['ferdig', 'avvist', 'feil'].includes(p?.utfall) ? p.utfall : 'feil';
  const [grunn, setGrunn] = useState('');
  const c = INNHOLD[utfall];

  useEffect(() => {
    if (utfall === 'ferdig') {
      // Fremskynd statushenting så portalen oppdateres umiddelbart
      fetch('/api/signering-puls', { method: 'POST' }).catch(() => {});
    }
    try {
      const g = sp?.grunn || new URLSearchParams(window.location.search).get('grunn');
      if (g) setGrunn(String(g).slice(0, 160));
    } catch (e) { /* stille */ }
  }, [utfall]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f6f5f2', padding: '24px 16px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 10px 40px -18px rgba(28,25,23,0.18)', padding: '36px 32px', textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: '-0.01em', color: '#0a0a0a' }}>DigiHome</p>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: c.ring, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '26px auto 0' }}>
          {c.ikon}
        </div>
        <h1 style={{ margin: '18px 0 0', fontSize: 20, lineHeight: 1.35, letterSpacing: '-0.01em', color: '#0a0a0a' }}>{c.tittel}</h1>
        <p style={{ margin: '10px 0 0', fontSize: 13.5, lineHeight: 1.65, color: '#78716c' }}>{c.tekst}</p>
        {grunn && utfall === 'feil' && (
          <p style={{ margin: '14px 0 0', fontSize: 12, color: '#a8a29a', background: '#faf9f7', borderRadius: 10, padding: '10px 14px' }}>{grunn}</p>
        )}
        <p style={{ margin: '26px 0 0', fontSize: 11, color: '#c2beb8' }}>Elektronisk signering levert av Posten signering · BankID</p>
      </div>
    </main>
  );
}
