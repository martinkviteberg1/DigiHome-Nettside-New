'use client';

// Meta Pixel (fbq) — lastes KUN etter markedsføringssamtykke (GDPR).
// PageView ved sidelast + ved SPA-navigasjon. Lead-hendelsen fyres fra
// lib/gtag.js trackLead() med eventID = lead.id (deduplikeres mot CAPI server-side).
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { hasMarketingConsent, trackViewContent } from '@/lib/gtag';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || '';

// Hoey-intensjons-ruter → ViewContent (bygger retargeting-publikum). null = ingen.
function contentNameFor(pathname) {
  const p = (pathname || '/').toLowerCase();
  if (p === '/') return 'Forside';
  if (p.startsWith('/bli-utleier')) return 'Bli utleier';
  if (p.startsWith('/bli-leietaker')) return 'Bli leietaker';
  if (p.startsWith('/forvaltning')) return 'Forvaltning';
  if (p.startsWith('/lp/')) return `Kampanje: ${p.replace('/lp/', '')}`;
  if (p.startsWith('/utleie/')) return `Utleie: ${p.replace('/utleie/', '')}`;
  if (p.startsWith('/blogg/')) return 'Blogg-artikkel';
  if (p.startsWith('/om-oss')) return 'Om oss';
  if (p.startsWith('/kontakt')) return 'Kontakt';
  return null;
}

function fireViewContent(pathname) {
  const name = contentNameFor(pathname);
  if (name) trackViewContent(name, { page_path: pathname });
}

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
    fireViewContent(window.location.pathname);
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

  // SPA-navigasjon → PageView + ViewContent (hopper over første render; den dekkes av loadPixel).
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (typeof window !== 'undefined' && window.fbq && window.__dhMetaLoaded) {
      try { window.fbq('track', 'PageView'); } catch (e) {}
      try { fireViewContent(pathname); } catch (e) {}
    }
  }, [pathname]);

  return null;
}
