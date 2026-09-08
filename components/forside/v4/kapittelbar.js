'use client';

import { useSyncExternalStore } from 'react';

/* ---------------------------------------------------------------------------
   Kapittelbaren i hovednavbaren.

   Når produktseksjonens kapittelbar ellers ville festet seg under navbaren
   («meny på meny»), publiserer ProduktSeksjon kapitlene hit — og NavV4 bytter
   ut menylenkene sine med dem: én linje, lokal navigasjon når det er relevant.
   Utenfor seksjonen: null → vanlig nav. Liten ekstern kilde (ingen context,
   ingen re-render av treet i mellom).
--------------------------------------------------------------------------- */

let tilstand = null;
const lyttere = new Set();

export function settKapittelbar(neste) {
  tilstand = neste;
  lyttere.forEach((f) => f());
}

function abonner(f) { lyttere.add(f); return () => lyttere.delete(f); }
const les = () => tilstand;
const lesServer = () => null;

export function useKapittelbar() {
  return useSyncExternalStore(abonner, les, lesServer);
}
