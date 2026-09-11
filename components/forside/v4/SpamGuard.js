'use client';

import { useRef } from 'react';

/*
  Klientside-forsterkning av spamvernet (Lag 1). Ingen friksjon for ekte brukere:
   • Honeypot: et visuelt skjult input som bots fyller ut, men mennesker aldri ser.
     Bruker «visually hidden»-teknikken (ikke display:none, som noen bots hopper over).
   • Tidtaking: elapsed_ms = tid fra skjemaet ble montert til innsending. Under ~1,5s
     er praktisk talt umulig for et menneske som fyller ut flere felter.

  Bruk:
    const { honeypot, getSpamFields } = useSpamGuard();
    ...
    <form>{honeypot} ...</form>
    // ved innsending:
    body: JSON.stringify({ ...data, ...getSpamFields() })
*/
export function useSpamGuard() {
  const startRef = useRef(typeof Date !== 'undefined' ? Date.now() : 0);
  const hpRef = useRef(null);

  const honeypot = (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', left: 0, top: 0, width: 1, height: 1, padding: 0, margin: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', clipPath: 'inset(50%)', whiteSpace: 'nowrap', border: 0 }}
    >
      <input
        ref={hpRef}
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-label="La dette feltet stå tomt"
        defaultValue=""
        style={{ width: '100%', height: '100%', opacity: 0, margin: 0, padding: 0, border: 0 }}
      />
    </div>
  );

  const getSpamFields = () => ({
    website: (hpRef.current && hpRef.current.value) || '',
    elapsed_ms: startRef.current ? Date.now() - startRef.current : undefined,
  });

  return { honeypot, getSpamFields };
}

export default useSpamGuard;
