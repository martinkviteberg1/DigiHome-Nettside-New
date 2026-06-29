'use client';

// Meta Pixel (fbq) — lastes KUN etter markedsføringssamtykke (GDPR).
// PageView ved sidelast + ved SPA-navigasjon. Lead-hendelsen fyres fra
// lib/gtag.js trackLead() med eventID = lead.id (deduplikeres mot CAPI server-side).
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { hasMarketingConsent } from '@/lib/gtag';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

function loadPixel() {
  if (typeof window === 'undefined' || !PIXEL_ID) return;
  if (window.__dhMetaLoaded) return;
  if (!hasMarketingConsent()) return;
  window.__dhMetaLoaded = true;
  /* Meta Pixel base-kode */
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  try {
    window.fbq('init', PIXEL_ID);
    window.fbq('track', 'PageView');
  } catch (e) {}
}

export default function MetaPixel() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (!PIXEL_ID) return;
    loadPixel();
    const onConsent = () => loadPixel();
    window.addEventListener('dh-consent-granted', onConsent);
    return () => window.removeEventListener('dh-consent-granted', onConsent);
  }, []);

  // SPA-navigasjon → PageView (hopper over første render; den dekkes av loadPixel).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (typeof window !== 'undefined' && window.fbq && window.__dhMetaLoaded) {
      try { window.fbq('track', 'PageView'); } catch (e) {}
    }
  }, [pathname]);

  return null;
}
