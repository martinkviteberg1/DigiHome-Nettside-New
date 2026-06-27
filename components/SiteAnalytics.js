'use client';

// Mountes én gang i root layout. Sporer sidevisninger ved hver rute-endring,
// og rapporterer Core Web Vitals (ekte brukerdata → RUM) én gang per sidelast.
// Hopper over admin-ruter (skal ikke forurense besøksstatistikken).

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@/lib/analytics';
import { trackPageview } from '@/lib/gtag';

let vitalsBound = false;

export default function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin')) return;
    track('pageview');
    // GA4 SPA-sidevisning (kun ved markedsføringssamtykke; no-op uten GA4/samtykke).
    trackPageview(pathname);
  }, [pathname]);

  // Core Web Vitals — registreres kun én gang, og ikke på admin-ruter.
  useEffect(() => {
    if (vitalsBound) return;
    if (typeof window === 'undefined') return;
    if (window.location.pathname.startsWith('/admin')) return;
    vitalsBound = true;
    let cancelled = false;
    import('web-vitals')
      .then(({ onLCP, onCLS, onINP, onFCP, onTTFB }) => {
        if (cancelled) return;
        const report = (m) => {
          try {
            track('web_vital', {
              name: m.name,
              value: m.name === 'CLS' ? +m.value.toFixed(4) : Math.round(m.value),
              rating: m.rating,
              id: m.id,
            });
          } catch (e) {}
        };
        onLCP(report); onCLS(report); onINP(report); onFCP(report); onTTFB(report);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return null;
}
