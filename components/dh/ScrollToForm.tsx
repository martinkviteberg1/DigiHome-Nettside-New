'use client';

import { useEffect } from 'react';

// Bevarer konverteringsflyten for betalt trafikk og hero-søket:
// kommer man til /bli-utleier med ?address= (eller #skjema) hopper vi
// rett til skjemaet i stedet for å vise info-innholdet først.
export default function ScrollToForm() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('address') || p.get('start') || window.location.hash === '#skjema') {
      setTimeout(() => {
        document.getElementById('skjema')?.scrollIntoView({ behavior: 'instant' as ScrollBehavior, block: 'start' });
      }, 80);
    }
  }, []);
  return null;
}
