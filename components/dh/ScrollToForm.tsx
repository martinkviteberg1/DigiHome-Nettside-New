'use client';

import { useEffect } from 'react';

// Fullskjerm-flyt (10/7): /bli-utleier har ikke lenger innbakt skjema nederst.
// Gamle dype lenker fra betalt trafikk og hero-søket (?address=, ?start eller
// #skjema) sendes videre til den fokuserte fullskjerm-wizarden på
// /bli-utleier/start — med ALLE query-parametre bevart (address, tier, utm_*).
export default function ScrollToForm() {
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('address') || p.has('start') || window.location.hash === '#skjema') {
      p.delete('start');
      const qs = p.toString();
      window.location.replace(`/bli-utleier/start${qs ? `?${qs}` : ''}`);
    }
  }, []);
  return null;
}
