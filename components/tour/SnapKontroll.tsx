'use client';

import { useEffect } from 'react';

// ---------------------------------------------------------------------------
// SnapKontroll — slår på fullskjerm scroll-snap på <html> mens omvisningen er
// montert, og rydder opp etter seg ved navigering bort. Selve regelen ligger i
// globals.css og gjelder kun ≥ 1024px — mobil beholder fri, naturlig scroll.
// ---------------------------------------------------------------------------

export default function SnapKontroll() {
  useEffect(() => {
    document.documentElement.classList.add('dh-tour-snap');
    return () => document.documentElement.classList.remove('dh-tour-snap');
  }, []);

  return null;
}
