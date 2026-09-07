'use client';

// ---------------------------------------------------------------------------
// Ringesporing (august 2026).
//
// Bakgrunn: telefon var vår best konverterende kanal (3 av 5 vunne kunder siste
// 90 dager) og samtidig helt usporet. tel:-lenker finnes i header, footer,
// landingssider og skjema — men ingen hendelse ble logget noe sted. Resultatet
// var at Google og Meta ikke fikk kreditt for samtaler de faktisk skapte.
//
// Én global lytter i capture-fasen dekker ALLE tel:-lenker på hele nettstedet,
// også de som legges til senere. Da slipper vi å røre 12 komponenter, og nye
// telefonlenker blir sporet automatisk.
//
// Førstepartshendelsen krever IKKE samtykke (ingen markedsføringskapsel, kun
// vår egen øktmåling) — derfor er den fasit. De eksterne taggene (GA4/Ads/Meta)
// self-gater på om taggen i det hele tatt er lastet.
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import { trackCall } from '@/lib/gtag';

// Hvor på siden ble nummeret trykket? Brukes til å se hvilke plasseringer som
// faktisk skaper samtaler, slik at vi kan prioritere dem.
function placementOf(el) {
  try {
    const explicit = el.closest('[data-call-placement]');
    if (explicit) return explicit.getAttribute('data-call-placement');
    if (el.closest('header')) return 'header';
    if (el.closest('footer')) return 'footer';
    if (el.closest('[data-testid="mobile-cta"]')) return 'mobil-sticky';
    if (el.closest('form')) return 'skjema';
    const path = window.location.pathname || '/';
    if (path.startsWith('/lp/')) return `lp:${path.replace('/lp/', '')}`;
    if (path.startsWith('/bli-utleier')) return 'bli-utleier';
    return path === '/' ? 'forside' : path.slice(0, 60);
  } catch (e) {
    return 'ukjent';
  }
}

export default function CallTracking() {
  useEffect(() => {
    // Dobbelttrykk på mobil er vanlig — samme nummer innen 3 sekunder er ett klikk.
    let lastKey = '';
    let lastAt = 0;

    const onClick = (ev) => {
      try {
        const target = ev.target;
        if (!target || typeof target.closest !== 'function') return;
        const a = target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (!/^tel:/i.test(href)) return;

        // Admin og investorrom skal ikke forurense statistikken.
        const path = window.location.pathname || '';
        if (path.startsWith('/admin') || path.startsWith('/investor') || path.startsWith('/deck')) return;
        if (window.self !== window.top) return; // iframe-forhåndsvisning

        const now = Date.now();
        const key = href.toLowerCase();
        if (key === lastKey && now - lastAt < 3000) return;
        lastKey = key; lastAt = now;

        const placement = placementOf(a);
        // Førsteparts (fasit) — må aldri blokkere at samtalen faktisk starter.
        try { track('call_click', { placement, href: href.slice(0, 40) }); } catch (e) {}
        // GA4 + Google Ads + Meta.
        try { trackCall({ placement, href: href.slice(0, 40) }); } catch (e) {}
      } catch (e) {
        /* sporing skal aldri stoppe en telefonsamtale */
      }
    };

    // Capture: vi vil rekke å måle før noen stopper hendelsen.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return null;
}
